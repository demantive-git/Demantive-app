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

      // Get opportunity statistics from normalized table
      const { data: opportunities } = await supabase
        .from("opportunities")
        .select("*")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false });

      if (opportunities && opportunities.length > 0) {
        // Calculate statistics
        let totalPipeline = 0;
        let wonAmount = 0;
        let wonCount = 0;
        const recentDealsList: any[] = [];

        opportunities.forEach((opp: any) => {
          const amount = (opp.amount || 0) / 100; // Convert from cents to dollars

          // Add to pipeline total
          if (opp.status !== "lost") {
            totalPipeline += amount;
          }

          // Track won deals
          if (opp.status === "won") {
            wonAmount += amount;
            wonCount++;
          }

          // Collect recent deals (last 5)
          if (recentDealsList.length < 5) {
            recentDealsList.push({
              name: opp.name,
              amount: amount,
              stage: opp.stage,
              status: opp.status,
              closeDate: opp.close_date,
              source: opp.source,
            });
          }
        });

        const avgDeal = opportunities.length > 0 ? totalPipeline / opportunities.length : 0;

        setStats({
          totalDeals: opportunities.length,
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
    <div className="min-h-screen bg-gray-50">
      <AppNav />

      {/* Dashboard Header */}
      <div className="bg-white border-b border-gray-100 px-6 sm:px-8 lg:px-12 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-gray-900 tracking-tight">{org?.name}</h1>
              <p className="text-gray-500 mt-2 text-lg">Marketing pipeline overview</p>
            </div>
            <button className="bg-gray-900 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800 transition-all shadow-sm hover:shadow-md">
              Export Report
            </button>
          </div>
        </div>
      </div>

      {/* Main Dashboard Content */}
      <div className="px-6 sm:px-8 lg:px-12 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Sync Status */}
          {stats?.lastSyncedAt && (
            <div className="mb-8 bg-white rounded-xl border border-gray-100 p-4 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-success"
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
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Data is up to date</p>
                  <p className="text-xs text-gray-500">
                    Last synced {new Date(stats.lastSyncedAt).toLocaleString()}
                  </p>
                </div>
              </div>
              <a
                href={`/settings/connections?org=${orgId}`}
                className="text-sm font-medium text-primary hover:text-primary-hover transition-colors"
              >
                Manage connections →
              </a>
            </div>
          )}

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all group">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-500">Total Pipeline</h3>
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg
                    className="w-4 h-4 text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>
              <p className="text-3xl font-semibold text-gray-900">
                {formatAmount(stats?.totalPipeline || 0)}
              </p>
              <p className="text-sm text-gray-500 mt-2">{stats?.totalDeals || 0} active deals</p>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all group">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-500">Won This Quarter</h3>
                <div className="w-8 h-8 bg-success/10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg
                    className="w-4 h-4 text-success"
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
                </div>
              </div>
              <p className="text-3xl font-semibold text-gray-900">
                {formatAmount(stats?.wonAmount || 0)}
              </p>
              <p className="text-sm text-gray-500 mt-2">{stats?.wonDeals || 0} closed won</p>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all group">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-500">Average Deal Size</h3>
                <div className="w-8 h-8 bg-warning/10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg
                    className="w-4 h-4 text-warning"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
                    />
                  </svg>
                </div>
              </div>
              <p className="text-3xl font-semibold text-gray-900">
                {formatAmount(stats?.avgDealSize || 0)}
              </p>
              <p className="text-sm text-gray-500 mt-2">Per opportunity</p>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all group">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-500">Win Rate</h3>
                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg
                    className="w-4 h-4 text-indigo-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                    />
                  </svg>
                </div>
              </div>
              <p className="text-3xl font-semibold text-gray-900">
                {stats && stats.totalDeals > 0
                  ? Math.round((stats.wonDeals / stats.totalDeals) * 100)
                  : 0}
                %
              </p>
              <p className="text-sm text-gray-500 mt-2">Conversion rate</p>
            </div>
          </div>

          {/* Recent Activity or Setup Steps */}
          {stats && stats.totalDeals > 0 ? (
            <>
              {/* Recent Deals */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm mb-8">
                <div className="p-6 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900">
                      Recent Pipeline Activity
                    </h2>
                    <a
                      href={`/programs?org=${orgId}`}
                      className="text-sm font-medium text-primary hover:text-primary-hover transition-colors"
                    >
                      View all →
                    </a>
                  </div>
                </div>
                <div className="divide-y">
                  {recentDeals.length > 0 ? (
                    recentDeals.map((deal, index) => (
                      <div
                        key={index}
                        className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors group"
                      >
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900 group-hover:text-primary transition-colors">
                            {deal.name}
                          </h3>
                          <div className="flex items-center gap-3 mt-2">
                            {deal.status === "won" ? (
                              <span className="inline-flex items-center gap-1 text-sm text-success">
                                <svg
                                  className="w-4 h-4"
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
                                Won
                              </span>
                            ) : deal.status === "lost" ? (
                              <span className="inline-flex items-center gap-1 text-sm text-danger">
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                                  />
                                </svg>
                                Lost
                              </span>
                            ) : (
                              <>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-700">
                                  {deal.stage}
                                </span>
                                {deal.closeDate && (
                                  <span className="text-sm text-gray-500">
                                    Closes {new Date(deal.closeDate).toLocaleDateString()}
                                  </span>
                                )}
                              </>
                            )}
                            {deal.source && (
                              <span className="text-sm text-gray-400">• {deal.source}</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right ml-6">
                          <p className="font-semibold text-xl text-gray-900">
                            {formatAmount(deal.amount)}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-12 text-center">
                      <svg
                        className="w-12 h-12 text-gray-300 mx-auto mb-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                        />
                      </svg>
                      <p className="text-gray-500">No recent deals found</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Programs CTA */}
              <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white rounded-xl p-10 text-center shadow-lg">
                <div className="max-w-2xl mx-auto">
                  <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <svg
                      className="w-8 h-8 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-semibold mb-3">Ready to level up your insights?</h3>
                  <p className="text-gray-300 mb-8 text-lg leading-relaxed">
                    Programs help you track which marketing campaigns are driving pipeline. Group
                    your deals by campaign source to see what's really working.
                  </p>
                  <a
                    href={`/programs?org=${orgId}`}
                    className="inline-flex items-center gap-2 bg-white text-gray-900 px-6 py-3 rounded-lg font-medium hover:bg-gray-100 transition-all shadow-md hover:shadow-xl"
                  >
                    Create your first program
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </a>
                </div>
              </div>
            </>
          ) : (
            /* Setup Steps */
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-8">
                Welcome! Let's get started
              </h2>
              <div className="space-y-8">
                {/* Step 1: Connect CRM */}
                <div className="flex gap-6">
                  <div
                    className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center font-medium transition-all ${
                      stats?.lastSyncedAt
                        ? "bg-success/10 text-success"
                        : "bg-gray-100 text-gray-400 border border-gray-200"
                    }`}
                  >
                    {stats?.lastSyncedAt ? (
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    ) : (
                      "1"
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-2">Connect your CRM</h3>
                    <p className="text-gray-600 mb-4">
                      Import your pipeline data from HubSpot or Salesforce
                    </p>
                    {stats?.lastSyncedAt ? (
                      <div className="inline-flex items-center gap-2 text-sm text-success bg-success/10 px-3 py-1.5 rounded-lg">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        Connected to HubSpot
                      </div>
                    ) : (
                      <a
                        href={`/settings/connections?org=${orgId}`}
                        className="inline-flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800 transition-all shadow-sm hover:shadow-md"
                      >
                        Connect CRM
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </a>
                    )}
                  </div>
                </div>

                {/* Step 2: Sync Data */}
                <div className={`flex gap-6 ${!stats?.lastSyncedAt ? "opacity-50" : ""}`}>
                  <div
                    className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center font-medium transition-all ${
                      stats?.totalDeals
                        ? "bg-success/10 text-success"
                        : "bg-gray-100 text-gray-400 border border-gray-200"
                    }`}
                  >
                    {stats?.totalDeals ? (
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    ) : (
                      "2"
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-2">Sync your data</h3>
                    <p className="text-gray-600 mb-4">
                      Pull in your contacts, companies, and deals
                    </p>
                    {stats?.lastSyncedAt && !stats.totalDeals && (
                      <a
                        href={`/settings/connections?org=${orgId}`}
                        className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary-hover transition-colors"
                      >
                        Click "Sync Now" to import data
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </a>
                    )}
                    {stats?.totalDeals && (
                      <div className="inline-flex items-center gap-2 text-sm text-success bg-success/10 px-3 py-1.5 rounded-lg">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        {stats.totalDeals} deals imported
                      </div>
                    )}
                  </div>
                </div>

                {/* Step 3: Map Programs */}
                <div className={`flex gap-6 ${!stats?.totalDeals ? "opacity-50" : ""}`}>
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gray-100 text-gray-400 border border-gray-200 flex items-center justify-center font-medium">
                    3
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-2">Create programs</h3>
                    <p className="text-gray-600 mb-4">
                      Group campaigns to track marketing effectiveness
                    </p>
                    {stats?.totalDeals && (
                      <a
                        href={`/programs?org=${orgId}`}
                        className="inline-flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-hover transition-all shadow-sm hover:shadow-md"
                      >
                        Create programs
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </a>
                    )}
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
