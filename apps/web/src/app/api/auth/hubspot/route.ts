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
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NEXT_PUBLIC_VERCEL_URL || "http://localhost:3000";
  const redirectUri = `${baseUrl}/api/auth/hubspot/callback`;
  const scopes = [
    "oauth",
    "crm.objects.leads.read",
    "crm.objects.leads.write",
    "crm.objects.contacts.read",
    "crm.objects.contacts.write",
    "crm.objects.companies.read",
    "crm.objects.companies.write",
    "crm.objects.deals.read",
    "crm.objects.deals.write",
  ].join(" ");

  const authUrl = new URL("https://app.hubspot.com/oauth/authorize");
  authUrl.searchParams.append("client_id", clientId);
  authUrl.searchParams.append("redirect_uri", redirectUri);
  authUrl.searchParams.append("scope", scopes);
  authUrl.searchParams.append("state", orgId); // Pass org ID in state

  return NextResponse.redirect(authUrl.toString());
}
