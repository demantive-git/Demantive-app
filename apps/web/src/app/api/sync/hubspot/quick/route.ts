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

  async fetchPage<T>(
    endpoint: string,
    limit: number = 10,
    after?: string,
  ): Promise<{
    results: T[];
    hasMore: boolean;
    after?: string;
  }> {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    url.searchParams.append("limit", limit.toString());
    if (after) {
      url.searchParams.append("after", after);
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`HubSpot API error: ${response.status} - ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    return {
      results: data.results || [],
      hasMore: data.paging?.next?.after ? true : false,
      after: data.paging?.next?.after,
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const { orgId } = await request.json();
    console.log(`Starting quick sync for org: ${orgId}`);

    if (!orgId) {
      return NextResponse.json({ error: "Missing orgId" }, { status: 400 });
    }

    // Get the OAuth connection
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
        started_at: new Date().toISOString(),
        status: "running",
      })
      .select()
      .single();

    if (syncError) {
      throw syncError;
    }

    try {
      const client = new HubSpotClient(accessToken);
      const counts = { contacts: 0, companies: 0, deals: 0 };

      // Quick sync: fetch only the first page of each object type
      console.log("Fetching initial data...");

      // Fetch companies (first 10)
      const companiesPage = await client.fetchPage<any>("/crm/v3/objects/companies", 10);
      counts.companies = companiesPage.results.length;
      console.log(`Fetched ${counts.companies} companies`);

      // Process companies immediately
      for (const company of companiesPage.results) {
        await supabaseAdmin.from("companies").upsert(
          {
            org_id: orgId,
            external_id: company.id,
            provider: "hubspot",
            name: company.properties.name || "Unknown Company",
            domain: company.properties.domain || null,
            created_at: company.properties.createdate || new Date().toISOString(),
          },
          {
            onConflict: "org_id,provider,external_id",
          },
        );
      }

      // Fetch contacts (first 10)
      const contactsPage = await client.fetchPage<any>("/crm/v3/objects/contacts", 10);
      counts.contacts = contactsPage.results.length;
      console.log(`Fetched ${counts.contacts} contacts`);

      // Process contacts immediately
      for (const contact of contactsPage.results) {
        await supabaseAdmin.from("people").upsert(
          {
            org_id: orgId,
            external_id: contact.id,
            provider: "hubspot",
            email: contact.properties.email || null,
            name:
              `${contact.properties.firstname || ""} ${contact.properties.lastname || ""}`.trim() ||
              "Unknown Contact",
            created_at: contact.properties.createdate || new Date().toISOString(),
          },
          {
            onConflict: "org_id,provider,external_id",
          },
        );
      }

      // Fetch deals (first 10)
      const dealsPage = await client.fetchPage<any>("/crm/v3/objects/deals", 10);
      counts.deals = dealsPage.results.length;
      console.log(`Fetched ${counts.deals} deals`);

      // Process deals immediately
      for (const deal of dealsPage.results) {
        const stage = deal.properties.dealstage || "";
        let status = "open";
        if (stage.toLowerCase().includes("closed won")) {
          status = "won";
        } else if (stage.toLowerCase().includes("closed lost")) {
          status = "lost";
        }

        await supabaseAdmin.from("opportunities").upsert(
          {
            org_id: orgId,
            external_id: deal.id,
            provider: "hubspot",
            name: deal.properties.dealname || "Untitled Deal",
            amount: Math.round((parseFloat(deal.properties.amount) || 0) * 100), // Convert to cents
            stage: stage,
            status: status,
            close_date: deal.properties.closedate || null,
            created_at: deal.properties.createdate || new Date().toISOString(),
            source: deal.properties.source || null,
          },
          {
            onConflict: "org_id,provider,external_id",
          },
        );
      }

      // Update sync run as successful
      await supabaseAdmin
        .from("sync_runs")
        .update({
          status: "completed",
          finished_at: new Date().toISOString(),
          counts_json: counts,
        })
        .eq("id", syncRun.id);

      // Update last synced timestamp
      await supabaseAdmin
        .from("oauth_connections")
        .update({
          last_synced_at: new Date().toISOString(),
        })
        .eq("org_id", orgId)
        .eq("provider", "hubspot");

      console.log("Quick sync completed successfully");
      return NextResponse.json({
        success: true,
        counts,
        message: "Quick sync completed. Showing first 10 records of each type.",
      });
    } catch (syncError: any) {
      console.error("Sync processing error:", syncError);

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
    console.error("Quick sync error:", error);
    return NextResponse.json({ error: error.message || "Quick sync failed" }, { status: 500 });
  }
}
