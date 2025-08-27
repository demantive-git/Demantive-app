"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

function ConnectionsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [connections, setConnections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const orgId = searchParams.get("org");

  useEffect(() => {
    if (!orgId) {
      router.replace("/orgs");
      return;
    }
    loadConnections();
  }, [orgId]);

  async function loadConnections() {
    const { data, error } = await supabase
      .from("oauth_connections")
      .select("*")
      .eq("org_id", orgId);

    if (error) {
      console.error("Error loading connections:", error);
    } else {
      setConnections(data || []);
    }
    setLoading(false);
  }

  function handleConnect(provider: "hubspot" | "salesforce") {
    // Start OAuth flow
    const authUrl = `/api/auth/${provider}?org=${orgId}`;
    window.location.href = authUrl;
  }

  if (loading) {
    return <p>Loading connections...</p>;
  }

  return (
    <div>
      {/* Page Header */}
      <div className="bg-white border-b px-8 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-2 text-sm text-neutral-600 mb-2">
            <a href={`/dashboard?org=${orgId}`} className="hover:text-neutral-900">
              Dashboard
            </a>
            <span>/</span>
            <span>Connections</span>
          </div>
          <h1 className="text-2xl font-bold">CRM Connections</h1>
          <p className="text-neutral-600 mt-1">Connect your CRM to import pipeline data</p>
        </div>
      </div>

      {/* Connections List */}
      <div className="px-8 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid gap-6">
            {/* HubSpot */}
            <div className="bg-white rounded-lg border p-8">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                      <span className="text-orange-600 font-bold text-sm">HS</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">HubSpot</h3>
                      <p className="text-sm text-neutral-600">Contacts, Companies, and Deals</p>
                    </div>
                  </div>

                  {connections.find((c) => c.provider === "hubspot") ? (
                    <div className="mt-4">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="inline-flex items-center gap-1 text-green-600">
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
                          Connected
                        </span>
                        {connections.find((c) => c.provider === "hubspot")?.last_synced_at && (
                          <span className="text-neutral-500">
                            • Last synced{" "}
                            {new Date(
                              connections.find((c) => c.provider === "hubspot").last_synced_at,
                            ).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4">
                      <button
                        onClick={() => handleConnect("hubspot")}
                        className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700"
                      >
                        Connect HubSpot
                      </button>
                    </div>
                  )}
                </div>

                {connections.find((c) => c.provider === "hubspot") && (
                  <button className="text-sm text-neutral-600 hover:text-neutral-900">
                    Disconnect
                  </button>
                )}
              </div>
            </div>

            {/* Salesforce */}
            <div className="bg-white rounded-lg border p-8">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <span className="text-blue-600 font-bold text-sm">SF</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">Salesforce</h3>
                      <p className="text-sm text-neutral-600">Leads, Accounts, and Opportunities</p>
                    </div>
                  </div>

                  {connections.find((c) => c.provider === "salesforce") ? (
                    <div className="mt-4">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="inline-flex items-center gap-1 text-green-600">
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
                          Connected
                        </span>
                        {connections.find((c) => c.provider === "salesforce")?.last_synced_at && (
                          <span className="text-neutral-500">
                            • Last synced{" "}
                            {new Date(
                              connections.find((c) => c.provider === "salesforce").last_synced_at,
                            ).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4">
                      <button
                        onClick={() => handleConnect("salesforce")}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                      >
                        Connect Salesforce
                      </button>
                    </div>
                  )}
                </div>

                {connections.find((c) => c.provider === "salesforce") && (
                  <button className="text-sm text-neutral-600 hover:text-neutral-900">
                    Disconnect
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="mt-8 bg-neutral-50 rounded-lg p-6">
            <h3 className="font-medium mb-2">About CRM connections</h3>
            <ul className="space-y-1 text-sm text-neutral-600">
              <li>• We sync your data every 15 minutes automatically</li>
              <li>• Only admins can connect or disconnect CRMs</li>
              <li>• Your data is encrypted and never shared</li>
              <li>• You can connect one CRM at a time per organization</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ConnectionsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <p>Loading...</p>
        </div>
      }
    >
      <ConnectionsContent />
    </Suspense>
  );
}
