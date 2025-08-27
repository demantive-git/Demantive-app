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

      const response = await fetch(`/api/sync/${provider}`, {
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
        setMessage({
          type: "success",
          text: `Successfully synced ${data.counts?.contacts || 0} contacts, ${data.counts?.companies || 0} companies, and ${data.counts?.deals || 0} deals`,
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
      <div className="bg-neutral-50 px-8 py-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold">CRM Connections</h1>
          <p className="text-neutral-600 mt-1">Connect your CRM to import pipeline data</p>
        </div>
      </div>

      {/* Connections List */}
      <div className="px-8 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Success/Error Messages */}
          {message && (
            <div
              className={`mb-6 p-4 rounded-lg ${
                message.type === "success"
                  ? "bg-green-50 border border-green-200 text-green-800"
                  : "bg-red-50 border border-red-200 text-red-800"
              }`}
            >
              <div className="flex items-center gap-2">
                {message.type === "success" ? (
                  <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
                <span>{message.text}</span>
              </div>
            </div>
          )}
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
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleSync("hubspot")}
                      disabled={syncing}
                      className="bg-black text-white px-4 py-2 rounded-md text-sm hover:bg-neutral-800 disabled:opacity-50"
                    >
                      {syncing ? "Syncing..." : "Sync Now"}
                    </button>
                    <button
                      onClick={() => handleDisconnect("hubspot")}
                      className="text-sm text-neutral-600 hover:text-neutral-900"
                    >
                      Disconnect
                    </button>
                  </div>
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
