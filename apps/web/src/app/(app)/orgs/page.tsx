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
        data?.map((m) => ({
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

    // Create org
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .insert({ name: newOrgName })
      .select()
      .single();

    if (orgError) {
      console.error("Error creating org:", orgError);
      setCreating(false);
      return;
    }

    // Add user as admin
    const { error: memberError } = await supabase.from("memberships").insert({
      org_id: org.id,
      user_id: session.user.id,
      role: "admin",
    });

    if (memberError) {
      console.error("Error adding membership:", memberError);
    } else {
      router.push(`/dashboard?org=${org.id}`);
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
    <main className="min-h-dvh p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-semibold mb-8">Select Organization</h1>

        {orgs.length > 0 && (
          <div className="space-y-2 mb-8">
            {orgs.map((org) => (
              <a
                key={org.id}
                href={`/dashboard?org=${org.id}`}
                className="block p-4 border rounded hover:bg-neutral-50"
              >
                <div className="font-medium">{org.name}</div>
                <div className="text-sm text-neutral-600">{org.role}</div>
              </a>
            ))}
          </div>
        )}

        <div className="border-t pt-8">
          <h2 className="text-lg font-medium mb-4">Create New Organization</h2>
          <form onSubmit={createOrg} className="space-y-4">
            <input
              type="text"
              placeholder="Organization name"
              value={newOrgName}
              onChange={(e) => setNewOrgName(e.target.value)}
              className="w-full border rounded px-3 py-2"
              required
            />
            <button
              type="submit"
              disabled={creating}
              className="bg-black text-white rounded px-4 py-2"
            >
              {creating ? "Creating..." : "Create organization"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
