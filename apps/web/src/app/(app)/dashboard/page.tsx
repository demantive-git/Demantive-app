"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [org, setOrg] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const orgId = searchParams.get("org");

  useEffect(() => {
    if (!orgId) {
      router.replace("/orgs");
      return;
    }
    loadOrg();
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

  if (loading) {
    return <p>Loading dashboard...</p>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-semibold">{org?.name}</h1>
          <p className="text-neutral-600">Dashboard</p>
        </div>
        <a href="/orgs" className="text-sm underline">
          Switch org
        </a>
      </div>

      <div className="grid gap-4">
        <div className="p-6 border rounded">
          <h2 className="font-medium mb-2">Programs</h2>
          <p className="text-neutral-600">No programs configured yet.</p>
        </div>

        <div className="p-6 border rounded">
          <h2 className="font-medium mb-2">CRM Connection</h2>
          <p className="text-neutral-600">No CRM connected yet.</p>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <main className="min-h-dvh p-8">
      <div className="max-w-4xl mx-auto">
        <Suspense fallback={<p>Loading...</p>}>
          <DashboardContent />
        </Suspense>
      </div>
    </main>
  );
}
