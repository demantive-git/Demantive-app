"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { AppNav } from "@/components/AppNav";

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [org, setOrg] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{
    totalDeals: number;
    totalPipeline: number;
    wonDeals: number;
    wonAmount: number;
    avgDealSize: number;
    lastSyncedAt: string | null;
  } | null>(null);
  const [recentDeals, setRecentDeals] = useState<any[]>([]);
  const orgId = searchParams.get("org");

  useEffect(() => {
    if (!orgId) {
      router.replace("/orgs");
      return;
    }
    loadOrg();
    loadDashboardData();
  }, [orgId]);

  async function loadOrg() {
    const { data, error } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", orgId)
      .single();

    if (error || !data) {
      router.replace("/orgs");
    } else {
      setOrg(data);
    }
    setLoading(false);
  }

  async function loadDashboardData() {
    try {
      // Get connection info for last sync time
      const { data: connection } = await supabase
        .from("oauth_connections")
        .select("last_synced_at")
        .eq("org_id", orgId)
        .eq("provider", "hubspot")
        .eq("status", "active")
        .single();

      // Get deal statistics from raw_objects
      const { data: deals } = await supabase
        .from("raw_objects")
        .select("payload_json")
        .eq("org_id", orgId)
        .eq("provider", "hubspot")
        .eq("object_type", "deal");

      if (deals && deals.length > 0) {
        // Calculate statistics
        let totalPipeline = 0;
        let wonAmount = 0;
        let wonCount = 0;
        const recentDealsList: any[] = [];

        deals.forEach((deal: any) => {
          const properties = deal.payload_json?.properties || {};
          const amount = parseFloat(properties.amount) || 0;
          const stage = properties.dealstage;

          // Add to pipeline total
          if (stage !== "closedlost") {
            totalPipeline += amount;
          }

          // Track won deals
          if (stage === "closedwon") {
            wonAmount += amount;
            wonCount++;
          }

          // Collect recent deals (last 5)
          if (recentDealsList.length < 5) {
            recentDealsList.push({
              name: properties.dealname || "Unnamed Deal",
              amount: amount,
              stage: stage,
              closeDate: properties.closedate,
              company: properties.associatedcompanyid,
            });
          }
        });

        const avgDeal = deals.length > 0 ? totalPipeline / deals.length : 0;

        setStats({
          totalDeals: deals.length,
          totalPipeline,
          wonDeals: wonCount,
          wonAmount,
          avgDealSize: avgDeal,
          lastSyncedAt: connection?.last_synced_at,
        });
        setRecentDeals(recentDealsList);
      } else {
        // No data yet
        setStats({
          totalDeals: 0,
          totalPipeline: 0,
          wonDeals: 0,
          wonAmount: 0,
          avgDealSize: 0,
          lastSyncedAt: connection?.last_synced_at,
        });
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    }
  }

  function formatAmount(amount: number): string {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`;
    } else {
      return `$${amount.toFixed(0)}`;
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-neutral-600">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <AppNav />

      {/* Dashboard Header */}
      <div className="bg-white border-b px-8 py-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold">{org?.name}</h1>
          <p className="text-neutral-600 mt-1">Marketing pipeline overview</p>
        </div>
      </div>

      {/* Main Dashboard Content */}
      <div className="px-8 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Sync Status */}
          {stats?.lastSyncedAt && (
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-neutral-600">
                <svg
                  className="w-4 h-4 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>Last synced {new Date(stats.lastSyncedAt).toLocaleString()}</span>
              </div>
              <a
                href={`/settings/connections?org=${orgId}`}
                className="text-sm text-black hover:underline"
              >
                Manage connections →
              </a>
            </div>
          )}

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg p-6 border shadow-sm">
              <h3 className="text-sm font-medium text-neutral-600 mb-2">Total Pipeline</h3>
              <p className="text-3xl font-bold">{formatAmount(stats?.totalPipeline || 0)}</p>
              <p className="text-sm text-neutral-500 mt-1">{stats?.totalDeals || 0} active deals</p>
            </div>

            <div className="bg-white rounded-lg p-6 border shadow-sm">
              <h3 className="text-sm font-medium text-neutral-600 mb-2">Won This Quarter</h3>
              <p className="text-3xl font-bold">{formatAmount(stats?.wonAmount || 0)}</p>
              <p className="text-sm text-neutral-500 mt-1">{stats?.wonDeals || 0} closed won</p>
            </div>

            <div className="bg-white rounded-lg p-6 border shadow-sm">
              <h3 className="text-sm font-medium text-neutral-600 mb-2">Average Deal Size</h3>
              <p className="text-3xl font-bold">{formatAmount(stats?.avgDealSize || 0)}</p>
              <p className="text-sm text-neutral-500 mt-1">Per opportunity</p>
            </div>

            <div className="bg-white rounded-lg p-6 border shadow-sm">
              <h3 className="text-sm font-medium text-neutral-600 mb-2">Win Rate</h3>
              <p className="text-3xl font-bold">
                {stats && stats.totalDeals > 0
                  ? Math.round((stats.wonDeals / stats.totalDeals) * 100)
                  : 0}
                %
              </p>
              <p className="text-sm text-neutral-500 mt-1">Conversion rate</p>
            </div>
          </div>

          {/* Recent Activity or Setup Steps */}
          {stats && stats.totalDeals > 0 ? (
            <>
              {/* Recent Deals */}
              <div className="bg-white rounded-lg border shadow-sm mb-6">
                <div className="p-6 border-b">
                  <h2 className="text-lg font-semibold">Recent Pipeline Activity</h2>
                </div>
                <div className="divide-y">
                  {recentDeals.length > 0 ? (
                    recentDeals.map((deal, index) => (
                      <div
                        key={index}
                        className="p-6 flex items-center justify-between hover:bg-neutral-50"
                      >
                        <div>
                          <h3 className="font-medium">{deal.name}</h3>
                          <p className="text-sm text-neutral-600 mt-1">
                            Stage:{" "}
                            <span className="font-medium capitalize">
                              {deal.stage?.replace("closed", "Closed ")}
                            </span>
                            {deal.closeDate &&
                              ` • Closes ${new Date(deal.closeDate).toLocaleDateString()}`}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-lg">{formatAmount(deal.amount)}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="p-6 text-neutral-600">No recent deals found</p>
                  )}
                </div>
              </div>

              {/* Programs CTA */}
              <div className="bg-gradient-to-r from-black to-neutral-800 text-white rounded-lg p-8 text-center">
                <h3 className="text-xl font-semibold mb-2">Ready to level up your insights?</h3>
                <p className="text-white/80 mb-6 max-w-2xl mx-auto">
                  Programs help you track which marketing campaigns are driving pipeline. Group your
                  deals by campaign source to see what's really working.
                </p>
                <a
                  href={`/programs?org=${orgId}`}
                  className="inline-block bg-white text-black px-6 py-3 rounded-md font-medium hover:bg-neutral-100 transition-colors"
                >
                  Create your first program →
                </a>
              </div>
            </>
          ) : (
            /* Setup Steps */
            <div className="bg-white rounded-lg border shadow-sm p-8">
              <h2 className="text-lg font-semibold mb-6">Welcome! Let's get started</h2>
              <div className="space-y-6">
                {/* Step 1: Connect CRM */}
                <div className="flex gap-4">
                  <div
                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      stats?.lastSyncedAt ? "bg-green-100 text-green-600" : "bg-neutral-100"
                    }`}
                  >
                    {stats?.lastSyncedAt ? "✓" : "1"}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium mb-1">Connect your CRM</h3>
                    <p className="text-sm text-neutral-600 mb-3">
                      Import your pipeline data from HubSpot or Salesforce
                    </p>
                    {stats?.lastSyncedAt ? (
                      <span className="inline-flex items-center text-sm text-green-600">
                        ✓ Connected to HubSpot
                      </span>
                    ) : (
                      <a
                        href={`/settings/connections?org=${orgId}`}
                        className="inline-block bg-black text-white px-4 py-2 rounded-md text-sm hover:bg-neutral-800"
                      >
                        Connect CRM →
                      </a>
                    )}
                  </div>
                </div>

                {/* Step 2: Sync Data */}
                <div className={`flex gap-4 ${!stats?.lastSyncedAt ? "opacity-50" : ""}`}>
                  <div
                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      stats?.totalDeals ? "bg-green-100 text-green-600" : "bg-neutral-100"
                    }`}
                  >
                    {stats?.totalDeals ? "✓" : "2"}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium mb-1">Sync your data</h3>
                    <p className="text-sm text-neutral-600 mb-3">
                      Pull in your contacts, companies, and deals
                    </p>
                    {stats?.lastSyncedAt && !stats.totalDeals && (
                      <a
                        href={`/settings/connections?org=${orgId}`}
                        className="text-sm text-black hover:underline"
                      >
                        Click "Sync Now" to import data →
                      </a>
                    )}
                    {stats?.totalDeals && (
                      <span className="text-sm text-green-600">
                        ✓ {stats.totalDeals} deals imported
                      </span>
                    )}
                  </div>
                </div>

                {/* Step 3: Map Programs */}
                <div className={`flex gap-4 ${!stats?.totalDeals ? "opacity-50" : ""}`}>
                  <div className="flex-shrink-0 w-8 h-8 bg-neutral-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium">3</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium mb-1">Create programs</h3>
                    <p className="text-sm text-neutral-600">
                      Group campaigns to track marketing effectiveness
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-neutral-600">Loading...</p>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
