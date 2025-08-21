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
      <main className="min-h-dvh p-8 flex items-center justify-center">
        <p>Loading organizations...</p>
      </main>
    );
  }

  return (
    <div className="py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold mb-2">Select Organization</h1>
          <p className="text-neutral-600">Choose an organization to continue</p>
        </div>

        {orgs.length > 0 && (
          <div className="space-y-3 mb-12">
            {orgs.map((org) => (
              <a
                key={org.id}
                href={`/dashboard?org=${org.id}`}
                className="block p-6 bg-white border rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold text-lg">{org.name}</h3>
                    <p className="text-sm text-neutral-600 mt-1">Role: {org.role}</p>
                  </div>
                  <svg
                    className="w-5 h-5 text-neutral-400"
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
            ))}
          </div>
        )}

        <div className={`bg-white rounded-lg p-8 ${orgs.length > 0 ? "border" : "shadow-lg"}`}>
          <h2 className="text-xl font-semibold mb-6">Create New Organization</h2>
          <form onSubmit={createOrg} className="space-y-4">
            <div>
              <label htmlFor="org-name" className="block text-sm font-medium mb-2">
                Organization name
              </label>
              <input
                id="org-name"
                type="text"
                placeholder="Acme Inc."
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                className="w-full border border-neutral-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                required
              />
            </div>
            <button
              type="submit"
              disabled={creating}
              className="w-full bg-black text-white rounded-md px-4 py-2 hover:bg-neutral-800 disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create organization"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
