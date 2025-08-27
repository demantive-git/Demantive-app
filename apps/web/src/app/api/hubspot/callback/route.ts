import { NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { encryptText } from "@/lib/crypto";

function buildRedirectUri(req: NextRequest): string {
  const origin = new URL(req.url).origin;
  return `${origin}/api/hubspot/callback`;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");
  const cookiesHeader = req.headers.get("cookie") || "";
  const stateCookie = cookiesHeader
    .split(/;\s*/)
    .find((c) => c.startsWith("hubspot_oauth_state="))
    ?.split("=")[1];
  const orgCookie = cookiesHeader
    .split(/;\s*/)
    .find((c) => c.startsWith("hubspot_oauth_org="))
    ?.split("=")[1];

  if (!code || !returnedState || !stateCookie || !orgCookie || returnedState !== stateCookie) {
    return new Response("Invalid state", { status: 400 });
  }

  const clientId = process.env.HUBSPOT_CLIENT_ID;
  const clientSecret = process.env.HUBSPOT_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return new Response("Server not configured", { status: 500 });
  }

  const tokenRes = await fetch("https://api.hubapi.com/oauth/v1/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: buildRedirectUri(req),
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    return new Response(`Token exchange failed: ${text}`, { status: 400 });
  }

  const tokenJson: any = await tokenRes.json();
  const accessToken: string = tokenJson.access_token;
  const refreshToken: string | undefined = tokenJson.refresh_token;
  const scope: string | undefined = tokenJson.scope;
  const expiresIn: number | undefined = tokenJson.expires_in;

  const secret = process.env.TOKEN_ENCRYPTION_KEY;
  if (!secret) {
    return new Response("Encryption key not configured", { status: 500 });
  }

  const accessCipher = await encryptText(accessToken, secret);
  const refreshCipher = refreshToken ? await encryptText(refreshToken, secret) : null;
  const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null;

  const supabase = getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { error: upsertErr } = await supabase.from("oauth_connections").upsert(
    {
      org_id: orgCookie,
      provider: "hubspot",
      access_token_cipher: accessCipher,
      refresh_token_cipher: refreshCipher,
      scope: scope || null,
      expires_at: expiresAt,
      status: "connected",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "org_id,provider" },
  );

  if (upsertErr) {
    return new Response("Failed to save connection", { status: 500 });
  }

  const headers = new Headers();
  headers.append(
    "Set-Cookie",
    "hubspot_oauth_state=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax; Secure",
  );
  headers.append(
    "Set-Cookie",
    "hubspot_oauth_org=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax; Secure",
  );
  headers.append("Location", `/dashboard?org=${orgCookie}&connected=hubspot`);
  return new Response(null, { status: 302, headers });
}
