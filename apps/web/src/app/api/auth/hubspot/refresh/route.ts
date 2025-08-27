import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { encrypt, decrypt } from "@/lib/crypto";

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

export async function POST(request: NextRequest) {
  try {
    const { orgId } = await request.json();

    if (!orgId) {
      return NextResponse.json({ error: "Missing orgId" }, { status: 400 });
    }

    // Get the connection
    const { data: connection, error: connError } = await supabaseAdmin
      .from("oauth_connections")
      .select("*")
      .eq("org_id", orgId)
      .eq("provider", "hubspot")
      .single();

    if (connError || !connection) {
      return NextResponse.json({ error: "No HubSpot connection found" }, { status: 404 });
    }

    // Decrypt refresh token
    const refreshToken = decrypt(connection.refresh_token_cipher);

    const clientId = process.env.HUBSPOT_CLIENT_ID;
    const clientSecret = process.env.HUBSPOT_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: "HubSpot configuration missing" }, { status: 500 });
    }

    // Exchange refresh token for new access token
    const tokenResponse = await fetch("https://api.hubapi.com/oauth/v1/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error("Token refresh failed:", errorData);

      // If refresh token is invalid, mark connection as expired
      if (errorData.message?.includes("refresh token")) {
        await supabaseAdmin
          .from("oauth_connections")
          .update({ status: "expired" })
          .eq("id", connection.id);
      }

      throw new Error(errorData.message || "Failed to refresh token");
    }

    const tokens = await tokenResponse.json();

    // Encrypt new tokens
    const encryptedAccessToken = encrypt(tokens.access_token);
    const encryptedRefreshToken = encrypt(tokens.refresh_token);

    // Calculate new expiry
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + tokens.expires_in);

    // Update connection with new tokens
    const { error: updateError } = await supabaseAdmin
      .from("oauth_connections")
      .update({
        access_token_cipher: encryptedAccessToken,
        refresh_token_cipher: encryptedRefreshToken,
        expires_at: expiresAt.toISOString(),
        status: "active",
      })
      .eq("id", connection.id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      message: "Token refreshed successfully",
    });
  } catch (error: any) {
    console.error("Token refresh error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to refresh token" },
      { status: 500 },
    );
  }
}
