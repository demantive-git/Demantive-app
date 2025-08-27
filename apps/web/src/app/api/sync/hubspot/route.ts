import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { decrypt } from "@/lib/crypto";

// Create Supabase admin client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

// HubSpot API client
class HubSpotClient {
  private accessToken: string;
  private baseUrl = "https://api.hubapi.com";

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HubSpot API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  async getContacts(after?: string) {
    const params = new URLSearchParams({
      limit: "100",
      properties: "email,firstname,lastname,company,createdate,lastmodifieddate",
    });
    if (after) params.append("after", after);

    return this.request(`/crm/v3/objects/contacts?${params}`);
  }

  async getCompanies(after?: string) {
    const params = new URLSearchParams({
      limit: "100",
      properties: "name,domain,industry,createdate,lastmodifieddate",
    });
    if (after) params.append("after", after);

    return this.request(`/crm/v3/objects/companies?${params}`);
  }

  async getDeals(after?: string) {
    const params = new URLSearchParams({
      limit: "100",
      properties: "dealname,amount,dealstage,closedate,createdate,lastmodifieddate",
    });
    if (after) params.append("after", after);

    return this.request(`/crm/v3/objects/deals?${params}`);
  }
}

export async function POST(request: NextRequest) {
  console.log("Sync API called");

  try {
    const { orgId } = await request.json();
    console.log("Syncing for org:", orgId);

    if (!orgId) {
      return NextResponse.json({ error: "Missing orgId" }, { status: 400 });
    }

    // Get the connection details
    const { data: connection, error: connError } = await supabaseAdmin
      .from("oauth_connections")
      .select("*")
      .eq("org_id", orgId)
      .eq("provider", "hubspot")
      .eq("status", "active")
      .single();

    if (connError || !connection) {
      return NextResponse.json({ error: "No active HubSpot connection found" }, { status: 404 });
    }

    // Check if token is expired or about to expire
    const expiresAt = connection.expires_at ? new Date(connection.expires_at) : null;
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    if (expiresAt && expiresAt < fiveMinutesFromNow) {
      console.log("Token expired or expiring soon, refreshing...");

      // Refresh the token first
      const refreshResponse = await fetch(
        `${request.url.split("/api/")[0]}/api/auth/hubspot/refresh`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orgId }),
        },
      );

      if (!refreshResponse.ok) {
        const refreshError = await refreshResponse.json();
        return NextResponse.json(
          {
            error: "Token expired and refresh failed. Please reconnect HubSpot.",
            details: refreshError.error,
          },
          { status: 401 },
        );
      }

      // Get the updated connection with new token
      const { data: updatedConnection } = await supabaseAdmin
        .from("oauth_connections")
        .select("*")
        .eq("org_id", orgId)
        .eq("provider", "hubspot")
        .eq("status", "active")
        .single();

      if (!updatedConnection) {
        return NextResponse.json({ error: "Failed to get updated connection" }, { status: 500 });
      }

      connection.access_token_cipher = updatedConnection.access_token_cipher;
    }

    // Decrypt the access token
    const accessToken = decrypt(connection.access_token_cipher);

    // Create sync run record
    const { data: syncRun, error: syncError } = await supabaseAdmin
      .from("sync_runs")
      .insert({
        org_id: orgId,
        provider: "hubspot",
        status: "running",
      })
      .select()
      .single();

    if (syncError) {
      return NextResponse.json({ error: "Failed to create sync run" }, { status: 500 });
    }

    // Initialize HubSpot client
    const hubspot = new HubSpotClient(accessToken);

    try {
      // Sync contacts
      let contactsCount = 0;
      let contactsAfter: string | undefined;

      do {
        const contactsResponse = await hubspot.getContacts(contactsAfter);

        for (const contact of contactsResponse.results) {
          await supabaseAdmin.from("raw_objects").upsert(
            {
              org_id: orgId,
              provider: "hubspot",
              object_type: "contact",
              external_id: contact.id,
              payload_json: contact,
              system_modstamp: new Date(
                contact.properties.lastmodifieddate || contact.properties.createdate,
              ),
            },
            {
              onConflict: "org_id,provider,object_type,external_id",
            },
          );
          contactsCount++;
        }

        contactsAfter = contactsResponse.paging?.next?.after;
      } while (contactsAfter);

      // Sync companies
      let companiesCount = 0;
      let companiesAfter: string | undefined;

      do {
        const companiesResponse = await hubspot.getCompanies(companiesAfter);

        for (const company of companiesResponse.results) {
          await supabaseAdmin.from("raw_objects").upsert(
            {
              org_id: orgId,
              provider: "hubspot",
              object_type: "company",
              external_id: company.id,
              payload_json: company,
              system_modstamp: new Date(
                company.properties.lastmodifieddate || company.properties.createdate,
              ),
            },
            {
              onConflict: "org_id,provider,object_type,external_id",
            },
          );
          companiesCount++;
        }

        companiesAfter = companiesResponse.paging?.next?.after;
      } while (companiesAfter);

      // Sync deals
      let dealsCount = 0;
      let dealsAfter: string | undefined;

      do {
        const dealsResponse = await hubspot.getDeals(dealsAfter);

        for (const deal of dealsResponse.results) {
          await supabaseAdmin.from("raw_objects").upsert(
            {
              org_id: orgId,
              provider: "hubspot",
              object_type: "deal",
              external_id: deal.id,
              payload_json: deal,
              system_modstamp: new Date(
                deal.properties.lastmodifieddate || deal.properties.createdate,
              ),
            },
            {
              onConflict: "org_id,provider,object_type,external_id",
            },
          );
          dealsCount++;
        }

        dealsAfter = dealsResponse.paging?.next?.after;
      } while (dealsAfter);

      // Update sync run as completed
      await supabaseAdmin
        .from("sync_runs")
        .update({
          status: "completed",
          finished_at: new Date().toISOString(),
          counts_json: {
            contacts: contactsCount,
            companies: companiesCount,
            deals: dealsCount,
          },
        })
        .eq("id", syncRun.id);

      // Normalize the data
      console.log("Starting normalization...");

      // Normalize companies first
      const { data: rawCompanies } = await supabaseAdmin
        .from("raw_objects")
        .select("external_id, payload_json")
        .eq("org_id", orgId)
        .eq("provider", "hubspot")
        .eq("object_type", "company");

      for (const rawCompany of rawCompanies || []) {
        const props = rawCompany.payload_json?.properties || {};
        await supabaseAdmin.from("companies").upsert(
          {
            org_id: orgId,
            external_id: rawCompany.external_id,
            provider: "hubspot",
            name: props.name || "Unknown Company",
            domain: props.domain,
            industry: props.industry,
          },
          {
            onConflict: "org_id,provider,external_id",
          },
        );
      }

      // Normalize contacts
      const { data: rawContacts } = await supabaseAdmin
        .from("raw_objects")
        .select("external_id, payload_json")
        .eq("org_id", orgId)
        .eq("provider", "hubspot")
        .eq("object_type", "contact");

      for (const rawContact of rawContacts || []) {
        const props = rawContact.payload_json?.properties || {};
        await supabaseAdmin.from("people").upsert(
          {
            org_id: orgId,
            external_id: rawContact.external_id,
            provider: "hubspot",
            email: props.email,
            first_name: props.firstname,
            last_name: props.lastname,
          },
          {
            onConflict: "org_id,provider,external_id",
          },
        );
      }

      // Normalize deals to opportunities
      const { data: rawDeals } = await supabaseAdmin
        .from("raw_objects")
        .select("external_id, payload_json")
        .eq("org_id", orgId)
        .eq("provider", "hubspot")
        .eq("object_type", "deal");

      for (const rawDeal of rawDeals || []) {
        const props = rawDeal.payload_json?.properties || {};
        const amount = props.amount ? Math.round(parseFloat(props.amount) * 100) : null; // Convert to cents

        let status = "open";
        if (props.dealstage === "closedwon") status = "won";
        else if (props.dealstage === "closedlost") status = "lost";

        await supabaseAdmin.from("opportunities").upsert(
          {
            org_id: orgId,
            external_id: rawDeal.external_id,
            provider: "hubspot",
            name: props.dealname || "Unnamed Deal",
            amount: amount,
            stage: props.dealstage,
            status: status,
            close_date: props.closedate,
            source: props.hs_campaign || props.dealtype || props.source,
          },
          {
            onConflict: "org_id,provider,external_id",
          },
        );
      }

      // Update last synced timestamp
      await supabaseAdmin
        .from("oauth_connections")
        .update({
          last_synced_at: new Date().toISOString(),
        })
        .eq("org_id", orgId)
        .eq("provider", "hubspot");

      return NextResponse.json({
        success: true,
        counts: {
          contacts: contactsCount,
          companies: companiesCount,
          deals: dealsCount,
        },
      });
    } catch (syncError: any) {
      // Update sync run as failed
      await supabaseAdmin
        .from("sync_runs")
        .update({
          status: "failed",
          finished_at: new Date().toISOString(),
          error_text: syncError.message,
        })
        .eq("id", syncRun.id);

      throw syncError;
    }
  } catch (error: any) {
    console.error("Sync error:", error);
    return NextResponse.json({ error: error.message || "Sync failed" }, { status: 500 });
  }
}
