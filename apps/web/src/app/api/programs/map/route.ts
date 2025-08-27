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
    const { orgId } = await request.json();

    if (!orgId) {
      return NextResponse.json({ error: "Missing orgId" }, { status: 400 });
    }

    // Get all active programs with their rules
    const { data: programs } = await supabaseAdmin
      .from("programs")
      .select(
        `
        id,
        name,
        program_rules!inner (
          id,
          rule_type,
          field,
          pattern,
          priority,
          enabled
        )
      `,
      )
      .eq("org_id", orgId)
      .eq("active", true)
      .eq("program_rules.enabled", true);

    if (!programs || programs.length === 0) {
      return NextResponse.json({
        message: "No active programs with rules found",
        mapped: 0,
      });
    }

    // Get all opportunities to map
    const { data: opportunities } = await supabaseAdmin
      .from("opportunities")
      .select("id, name, source, stage")
      .eq("org_id", orgId);

    if (!opportunities || opportunities.length === 0) {
      return NextResponse.json({
        message: "No opportunities found",
        mapped: 0,
      });
    }

    // Clear existing mappings first
    await supabaseAdmin
      .from("record_programs")
      .delete()
      .eq("org_id", orgId)
      .eq("record_type", "opportunity");

    let mappedCount = 0;

    // Process each opportunity
    for (const opp of opportunities) {
      let bestMatch: { programId: string; priority: number } | null = null;

      // Check each program's rules
      for (const program of programs) {
        for (const rule of program.program_rules) {
          const fieldValue = (opp[rule.field as keyof typeof opp] as string) || "";
          let matches = false;

          // Apply rule based on type
          switch (rule.rule_type) {
            case "equals":
              matches = fieldValue.toLowerCase() === rule.pattern.toLowerCase();
              break;
            case "contains":
              matches = fieldValue.toLowerCase().includes(rule.pattern.toLowerCase());
              break;
            case "starts_with":
              matches = fieldValue.toLowerCase().startsWith(rule.pattern.toLowerCase());
              break;
            case "ends_with":
              matches = fieldValue.toLowerCase().endsWith(rule.pattern.toLowerCase());
              break;
            case "regex":
              try {
                const regex = new RegExp(rule.pattern, "i");
                matches = regex.test(fieldValue);
              } catch (e) {
                console.error("Invalid regex pattern:", rule.pattern);
              }
              break;
          }

          // If rule matches and has higher priority, update best match
          if (matches && (!bestMatch || rule.priority > bestMatch.priority)) {
            bestMatch = {
              programId: program.id,
              priority: rule.priority,
            };
          }
        }
      }

      // Assign to best matching program
      if (bestMatch) {
        await supabaseAdmin.from("record_programs").insert({
          org_id: orgId,
          record_type: "opportunity",
          record_id: opp.id,
          program_id: bestMatch.programId,
          confidence: 100,
        });
        mappedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Mapped ${mappedCount} of ${opportunities.length} opportunities`,
      mapped: mappedCount,
      total: opportunities.length,
    });
  } catch (error: any) {
    console.error("Program mapping error:", error);
    return NextResponse.json({ error: error.message || "Mapping failed" }, { status: 500 });
  }
}
