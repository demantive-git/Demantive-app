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
  const [hubspotConnected, setHubspotConnected] = useState<boolean>(false);
  const orgId = searchParams.get("org");

  useEffect(() => {
    if (!orgId) {
      router.replace("/orgs");
      return;
    }
    loadOrg();
    // Also check connection status
    if (orgId) {
      checkConnection(orgId);
    }
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

  async function checkConnection(currentOrgId: string) {
    const { data, error } = await supabase
      .from("oauth_connections")
      .select("status")
      .eq("org_id", currentOrgId)
      .eq("provider", "hubspot")
      .maybeSingle();
    if (!error && data && data.status === "connected") {
      setHubspotConnected(true);
    } else {
      setHubspotConnected(false);
    }
  }

  if (loading) {
    return <p>Loading dashboard...</p>;
  }

  return (
    <div>
      <AppNav />

      {/* Dashboard Header */}
      <div className="bg-neutral-50 px-8 py-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold">{org?.name}</h1>
          <p className="text-neutral-600 mt-1">Marketing pipeline overview</p>
        </div>
      </div>

      {/* Main Dashboard Content */}
      <div className="px-8 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg p-6 border">
              <h3 className="text-sm font-medium text-neutral-600 mb-1">Total Pipeline</h3>
              <p className="text-3xl font-semibold">—</p>
              <p className="text-sm text-neutral-500 mt-1">No data yet</p>
            </div>
            <div className="bg-white rounded-lg p-6 border">
              <h3 className="text-sm font-medium text-neutral-600 mb-1">Active Programs</h3>
              <p className="text-3xl font-semibold">0</p>
              <p className="text-sm text-neutral-500 mt-1">Set up programs first</p>
            </div>
            <div className="bg-white rounded-lg p-6 border">
              <h3 className="text-sm font-medium text-neutral-600 mb-1">New Opportunities</h3>
              <p className="text-3xl font-semibold">—</p>
              <p className="text-sm text-neutral-500 mt-1">Connect your CRM</p>
            </div>
          </div>

          {/* Setup Steps */}
          <div className="bg-white rounded-lg border p-8">
            <h2 className="text-lg font-semibold mb-6">Get Started</h2>
            <div className="space-y-6">
              {/* Step 1: Connect CRM */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-neutral-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium">1</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-medium mb-1">Connect your CRM</h3>
                  <p className="text-sm text-neutral-600 mb-3">
                    Import your pipeline data from HubSpot or Salesforce
                  </p>
                  {hubspotConnected ? (
                    <span className="inline-flex items-center text-sm px-3 py-1 rounded-md bg-green-100 text-green-800 border border-green-200">
                      HubSpot connected
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

              {/* Step 2: Map Programs */}
              <div className="flex gap-4 opacity-50">
                <div className="flex-shrink-0 w-8 h-8 bg-neutral-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium">2</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-medium mb-1">Map your programs</h3>
                  <p className="text-sm text-neutral-600">
                    Group campaigns into programs for better insights
                  </p>
                </div>
              </div>

              {/* Step 3: View Insights */}
              <div className="flex gap-4 opacity-50">
                <div className="flex-shrink-0 w-8 h-8 bg-neutral-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium">3</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-medium mb-1">View insights</h3>
                  <p className="text-sm text-neutral-600">
                    See what's working and get AI-powered recommendations
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <p>Loading...</p>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
