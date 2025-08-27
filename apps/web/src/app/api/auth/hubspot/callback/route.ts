import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { encrypt } from "@/lib/crypto";

// Create Supabase admin client for server-side operations
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

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const orgId = searchParams.get("state"); // We passed org ID in state
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      `/settings/connections?org=${orgId}&error=${encodeURIComponent(error)}`,
    );
  }

  if (!code || !orgId) {
    return NextResponse.redirect(
      `/settings/connections?org=${orgId}&error=${encodeURIComponent("Missing code or organization")}`,
    );
  }

  const clientId = process.env.HUBSPOT_CLIENT_ID;
  const clientSecret = process.env.HUBSPOT_CLIENT_SECRET;
  // Always use production URL for OAuth callback
  const redirectUri =
    process.env.NODE_ENV === "production"
      ? `https://demantive-app-web.vercel.app/api/auth/hubspot/callback`
      : `http://localhost:3000/api/auth/hubspot/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      `/settings/connections?org=${orgId}&error=${encodeURIComponent("HubSpot configuration missing")}`,
    );
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch("https://api.hubapi.com/oauth/v1/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code: code,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      throw new Error(errorData.message || "Failed to exchange code");
    }

    const tokens = await tokenResponse.json();

    // Encrypt tokens
    const encryptedAccessToken = encrypt(tokens.access_token);
    const encryptedRefreshToken = encrypt(tokens.refresh_token);

    // Calculate expiry time
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + tokens.expires_in);

    // Store connection in database
    const { error: dbError } = await supabaseAdmin.from("oauth_connections").upsert(
      {
        org_id: orgId,
        provider: "hubspot",
        access_token_cipher: encryptedAccessToken,
        refresh_token_cipher: encryptedRefreshToken,
        expires_at: expiresAt.toISOString(),
        status: "active",
        scope:
          "oauth crm.objects.leads.read crm.objects.leads.write crm.objects.contacts.read crm.objects.contacts.write crm.objects.companies.read crm.objects.companies.write crm.objects.deals.read crm.objects.deals.write",
      },
      {
        onConflict: "org_id,provider",
      },
    );

    if (dbError) {
      throw dbError;
    }

    // Redirect back to connections page
    return NextResponse.redirect(`/settings/connections?org=${orgId}&success=hubspot`);
  } catch (error) {
    console.error("HubSpot OAuth error:", error);
    return NextResponse.redirect(
      `/settings/connections?org=${orgId}&error=${encodeURIComponent("Failed to connect HubSpot")}`,
    );
  }
}
