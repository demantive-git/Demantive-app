import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const orgId = searchParams.get("org");

  if (!orgId) {
    return NextResponse.json({ error: "Missing org parameter" }, { status: 400 });
  }

  const clientId = process.env.HUBSPOT_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "HubSpot not configured" }, { status: 500 });
  }

  // Build HubSpot OAuth URL
  const redirectUri = `${process.env.NEXT_PUBLIC_VERCEL_URL || "http://localhost:3000"}/api/auth/hubspot/callback`;
  const scopes = [
    "crm.objects.contacts.read",
    "crm.objects.companies.read",
    "crm.objects.deals.read",
    "oauth",
    "crm.objects.contacts.write",
    "crm.objects.companies.write",
    "crm.objects.deals.write",
  ].join(" ");

  const authUrl = new URL("https://app.hubspot.com/oauth/authorize");
  authUrl.searchParams.append("client_id", clientId);
  authUrl.searchParams.append("redirect_uri", redirectUri);
  authUrl.searchParams.append("scope", scopes);
  authUrl.searchParams.append("state", orgId); // Pass org ID in state

  return NextResponse.redirect(authUrl.toString());
}
