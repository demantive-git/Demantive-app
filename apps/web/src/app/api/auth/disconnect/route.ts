import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
    const { orgId, provider } = await request.json();

    if (!orgId || !provider) {
      return NextResponse.json({ error: "Missing orgId or provider" }, { status: 400 });
    }

    // Delete the connection
    const { error } = await supabaseAdmin
      .from("oauth_connections")
      .delete()
      .eq("org_id", orgId)
      .eq("provider", provider);

    if (error) {
      throw error;
    }

    // Also delete any related data (optional, depends on your requirements)
    // You might want to keep historical data and just disconnect the integration

    return NextResponse.json({
      success: true,
      message: `${provider} disconnected successfully`,
    });
  } catch (error: any) {
    console.error("Disconnect error:", error);
    return NextResponse.json({ error: error.message || "Failed to disconnect" }, { status: 500 });
  }
}
