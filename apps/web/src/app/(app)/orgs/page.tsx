"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Org = {
  id: string;
  name: string;
  role: string;
};

export default function OrgsPage() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadOrgs();
  }, []);

  async function loadOrgs() {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    const { data, error } = await supabase
      .from("memberships")
      .select("org_id, role, organizations(id, name)")
      .eq("user_id", session.user.id);

    if (error) {
      console.error("Error loading orgs:", error);
    } else {
      const orgList =
        data?.map((m: any) => ({
          id: m.organizations.id,
          name: m.organizations.name,
          role: m.role,
        })) || [];
      setOrgs(orgList);

      // If user has exactly one org, redirect to dashboard
      if (orgList.length === 1) {
        router.replace(`/dashboard?org=${orgList[0].id}`);
      }
    }
    setLoading(false);
  }

  async function createOrg(e: React.FormEvent) {
    e.preventDefault();
    if (!newOrgName.trim()) return;

    setCreating(true);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    // Create org via RPC (atomic: create org + admin membership)
    const { data, error } = await supabase.rpc("create_org_with_admin", {
      p_name: newOrgName,
    });

    if (error) {
      console.error("Error creating org:", error);
      setCreating(false);
      return;
    }

    const created = Array.isArray(data) ? data[0] : data;
    if (created?.id) {
      router.push(`/dashboard?org=${created.id}`);
    }
    setCreating(false);
  }

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <svg
              className="w-8 h-8 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
          </div>
          <p className="text-gray-500">Loading organizations...</p>
        </div>
      </div>
    );
  }

  const getOrgIcon = (name: string) => {
    const firstLetter = name.charAt(0).toUpperCase();
    const colors = [
      "bg-primary text-white",
      "bg-success text-white",
      "bg-warning text-white",
      "bg-indigo-500 text-white",
      "bg-purple-500 text-white",
      "bg-pink-500 text-white",
    ];
    const colorIndex = name.charCodeAt(0) % colors.length;
    return { letter: firstLetter, colorClass: colors[colorIndex] };
  };

  return (
    <div className="min-h-dvh bg-gray-50">
      <div className="py-16 px-6 animate-fade-in">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-semibold tracking-tight text-gray-900 mb-3">
              Select Organization
            </h1>
            <p className="text-gray-500 text-lg">
              Choose an organization to continue or create a new one
            </p>
          </div>

          {orgs.length > 0 && (
            <div className="space-y-4 mb-12">
              {orgs.map((org) => {
                const icon = getOrgIcon(org.name);
                return (
                  <a
                    key={org.id}
                    href={`/dashboard?org=${org.id}`}
                    className="block bg-white rounded-xl p-6 hover:shadow-lg transition-all group border border-gray-100"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-semibold ${icon.colorClass} group-hover:scale-110 transition-transform`}
                        >
                          {icon.letter}
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg text-gray-900 group-hover:text-primary transition-colors">
                            {org.name}
                          </h3>
                          <p className="text-sm text-gray-500 capitalize">{org.role} access</p>
                        </div>
                      </div>
                      <svg
                        className="w-5 h-5 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-1 transition-all"
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
                    </div>
                  </a>
                );
              })}
            </div>
          )}

          <div className="text-center">
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 transition-all shadow-sm hover:shadow-md"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Create New Organization
            </button>
          </div>
        </div>
      </div>

      {/* Create Organization Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-6 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md animate-slide-in">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Create Organization</h2>

            <form onSubmit={createOrg} className="space-y-6">
              <div>
                <label htmlFor="org-name" className="block text-sm font-medium text-gray-700 mb-2">
                  Organization name
                </label>
                <input
                  id="org-name"
                  type="text"
                  placeholder="Acme Inc."
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-gray-900 placeholder-gray-400"
                  required
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-2">
                  This will be the name of your workspace
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={creating || !newOrgName.trim()}
                  className="flex-1 bg-primary text-white px-5 py-3 rounded-lg font-medium hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
                >
                  {creating ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
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
                      Creating...
                    </span>
                  ) : (
                    "Create organization"
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewOrgName("");
                  }}
                  className="flex-1 bg-white border border-gray-200 px-5 py-3 rounded-lg font-medium hover:bg-gray-50 hover:border-gray-300 transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
