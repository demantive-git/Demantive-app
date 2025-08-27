"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { AppNav } from "@/components/AppNav";

function ConnectionsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [connections, setConnections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const orgId = searchParams.get("org");
  const success = searchParams.get("success");
  const error = searchParams.get("error");

  useEffect(() => {
    if (!orgId) {
      router.replace("/orgs");
      return;
    }

    // Handle success/error messages
    if (success) {
      setMessage({ type: "success", text: `Successfully connected ${success}!` });
      // Clean up URL
      router.replace(`/settings/connections?org=${orgId}`);
    } else if (error) {
      setMessage({ type: "error", text: decodeURIComponent(error) });
      // Clean up URL
      router.replace(`/settings/connections?org=${orgId}`);
    }

    loadConnections();
  }, [orgId, success, error]);

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

  async function handleDisconnect(provider: "hubspot" | "salesforce") {
    if (!confirm(`Are you sure you want to disconnect ${provider}? You can reconnect anytime.`)) {
      return;
    }

    try {
      const response = await fetch("/api/auth/disconnect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ orgId, provider }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({
          type: "success",
          text: `${provider} disconnected successfully`,
        });
        loadConnections(); // Refresh the list
      } else {
        setMessage({ type: "error", text: data.error || "Failed to disconnect" });
      }
    } catch (error: any) {
      setMessage({ type: "error", text: "Failed to disconnect" });
    }
  }

  async function handleSync(provider: "hubspot" | "salesforce") {
    setSyncing(true);
    setMessage(null);
    console.log("Starting sync for", provider, "org:", orgId);

    try {
      // Add timeout to prevent infinite waiting
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

      // Use quick sync endpoint for better performance
      const endpoint = provider === "hubspot" ? `/api/sync/hubspot/quick` : `/api/sync/${provider}`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ orgId }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log("Sync response status:", response.status);

      let data;
      try {
        data = await response.json();
        console.log("Sync response data:", data);
      } catch (e) {
        console.error("Failed to parse response:", e);
        throw new Error("Invalid response from server");
      }

      if (response.ok) {
        const message =
          data.message ||
          `Successfully synced ${data.counts?.contacts || 0} contacts, ${data.counts?.companies || 0} companies, and ${data.counts?.deals || 0} deals`;
        setMessage({
          type: "success",
          text: message,
        });
        loadConnections(); // Refresh to show updated sync time
      } else {
        // Handle specific error cases
        if (response.status === 401 && data.error?.includes("expired")) {
          setMessage({
            type: "error",
            text: "HubSpot connection expired. Please disconnect and reconnect to refresh access.",
          });
        } else {
          setMessage({ type: "error", text: data.error || "Sync failed" });
        }
      }
    } catch (error: any) {
      console.error("Sync error:", error);
      if (error.name === "AbortError") {
        setMessage({
          type: "error",
          text: "Sync timed out. This might happen with large datasets. Please try again.",
        });
      } else {
        setMessage({ type: "error", text: error.message || "Failed to sync data" });
      }
    } finally {
      setSyncing(false);
    }
  }

  if (loading) {
    return <p>Loading connections...</p>;
  }

  return (
    <div>
      <AppNav />

      {/* Page Header */}
      <div className="bg-white border-b border-gray-100 px-6 sm:px-8 lg:px-12 py-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-semibold text-gray-900 tracking-tight">CRM Connections</h1>
          <p className="text-gray-500 mt-2 text-lg">Connect your CRM to import pipeline data</p>
        </div>
      </div>

      {/* Connections List */}
      <div className="px-6 sm:px-8 lg:px-12 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Success/Error Messages */}
          {message && (
            <div
              className={`mb-8 p-4 rounded-xl border animate-fade-in ${
                message.type === "success"
                  ? "bg-success/5 border-success/20 text-success"
                  : "bg-danger/5 border-danger/20 text-danger"
              }`}
            >
              <div className="flex items-start gap-3">
                {message.type === "success" ? (
                  <div className="w-5 h-5 mt-0.5">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                ) : (
                  <div className="w-5 h-5 mt-0.5">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                )}
                <span className="text-sm font-medium">{message.text}</span>
              </div>
            </div>
          )}
          <div className="grid gap-6">
            {/* HubSpot */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all p-8">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-4 mb-2">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center shadow-sm">
                      <span className="text-white font-bold text-lg">H</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-xl text-gray-900">HubSpot</h3>
                      <p className="text-gray-500">Contacts, Companies, and Deals</p>
                    </div>
                  </div>

                  {connections.find((c) => c.provider === "hubspot") ? (
                    <div className="mt-6">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex items-center gap-2 text-sm font-medium text-success bg-success/10 px-3 py-1.5 rounded-lg">
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
                          <span className="text-sm text-gray-500">
                            Last synced{" "}
                            {new Date(
                              connections.find((c) => c.provider === "hubspot").last_synced_at,
                            ).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-6">
                      <button
                        onClick={() => handleConnect("hubspot")}
                        className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-5 py-2.5 rounded-lg font-medium hover:from-orange-600 hover:to-orange-700 transition-all shadow-sm hover:shadow-md"
                      >
                        Connect HubSpot
                      </button>
                    </div>
                  )}
                </div>

                {connections.find((c) => c.provider === "hubspot") && (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleSync("hubspot")}
                      disabled={syncing}
                      className="bg-gray-900 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
                    >
                      {syncing ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                              fill="none"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                          </svg>
                          Syncing...
                        </span>
                      ) : (
                        "Sync Now"
                      )}
                    </button>
                    <button
                      onClick={() => handleDisconnect("hubspot")}
                      className="text-sm font-medium text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      Disconnect
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Salesforce */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all p-8">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-4 mb-2">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center shadow-sm">
                      <span className="text-white font-bold text-lg">S</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-xl text-gray-900">Salesforce</h3>
                      <p className="text-gray-500">Leads, Accounts, and Opportunities</p>
                    </div>
                  </div>

                  {connections.find((c) => c.provider === "salesforce") ? (
                    <div className="mt-6">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex items-center gap-2 text-sm font-medium text-success bg-success/10 px-3 py-1.5 rounded-lg">
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
                          <span className="text-sm text-gray-500">
                            Last synced{" "}
                            {new Date(
                              connections.find((c) => c.provider === "salesforce").last_synced_at,
                            ).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-6">
                      <button
                        onClick={() => handleConnect("salesforce")}
                        className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-5 py-2.5 rounded-lg font-medium hover:from-blue-600 hover:to-blue-700 transition-all shadow-sm hover:shadow-md"
                      >
                        Connect Salesforce
                      </button>
                    </div>
                  )}
                </div>

                {connections.find((c) => c.provider === "salesforce") && (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleSync("salesforce")}
                      disabled={syncing}
                      className="bg-gray-900 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
                    >
                      {syncing ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                              fill="none"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                          </svg>
                          Syncing...
                        </span>
                      ) : (
                        "Sync Now"
                      )}
                    </button>
                    <button
                      onClick={() => handleDisconnect("salesforce")}
                      className="text-sm font-medium text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      Disconnect
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="mt-8 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-8">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-5 h-5 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">About CRM connections</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <svg
                      className="w-4 h-4 text-gray-400 mt-0.5"
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
                    <span>We sync your data every 15 minutes automatically</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg
                      className="w-4 h-4 text-gray-400 mt-0.5"
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
                    <span>Only admins can connect or disconnect CRMs</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg
                      className="w-4 h-4 text-gray-400 mt-0.5"
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
                    <span>Your data is encrypted and never shared</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg
                      className="w-4 h-4 text-gray-400 mt-0.5"
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
                    <span>You can connect one CRM at a time per organization</span>
                  </li>
                </ul>
              </div>
            </div>
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
