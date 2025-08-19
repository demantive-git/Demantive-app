import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    // simple db connectivity check
    await db.execute("select 1");
    return NextResponse.json({
      status: "ok",
      db: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json({ status: "degraded", error: "db_connect_failed" }, { status: 500 });
  }
}
