import { NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

function buildRedirectUri(req: NextRequest): string {
  const origin = new URL(req.url).origin;
  return `${origin}/api/hubspot/callback`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const orgId = searchParams.get("org");
  if (!orgId) {
    return new Response("Missing org", { status: 400 });
  }

  const supabase = getSupabaseServer();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { data: membership, error: memErr } = await supabase
    .from("memberships")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (memErr) {
    return new Response("Membership check failed", { status: 500 });
  }
  if (!membership || membership.role !== "admin") {
    return new Response("Forbidden", { status: 403 });
  }

  const clientId = process.env.HUBSPOT_CLIENT_ID;
  if (!clientId) {
    return new Response("Server not configured", { status: 500 });
  }

  const scopes =
    process.env.HUBSPOT_SCOPES ||
    [
      "crm.objects.contacts.read",
      "crm.objects.companies.read",
      "crm.objects.deals.read",
      "crm.schemas.contacts.read",
      "crm.schemas.companies.read",
      "crm.schemas.deals.read",
    ].join(" ");

  const state = crypto
    .getRandomValues(new Uint8Array(16))
    .reduce((s, b) => s + b.toString(16).padStart(2, "0"), "");

  // Store state and org in cookies for callback validation
  const responseHeaders = new Headers();
  responseHeaders.append(
    "Set-Cookie",
    `hubspot_oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Secure`,
  );
  responseHeaders.append(
    "Set-Cookie",
    `hubspot_oauth_org=${orgId}; Path=/; HttpOnly; SameSite=Lax; Secure`,
  );

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: buildRedirectUri(req),
    scope: scopes,
    response_type: "code",
    state,
  });
  const url = `https://app.hubspot.com/oauth/authorize?${params.toString()}`;

  return new Response(null, {
    status: 302,
    headers: { ...Object.fromEntries(responseHeaders.entries()), Location: url },
  });
}
