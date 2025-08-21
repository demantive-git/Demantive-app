"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
      // Redirect authenticated users to orgs
      if (session?.user) {
        window.location.href = "/orgs";
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) {
        window.location.href = "/orgs";
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <main className="min-h-dvh p-8 flex items-center justify-center">
        <p>Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-dvh p-8 flex items-center justify-center">
      <div className="max-w-2xl w-full text-center space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight">Demantive</h1>
        <p className="text-neutral-700">CMO visibility app — connect-and-go.</p>
        {user ? (
          <div className="space-y-2">
            <p className="text-green-600">✓ Signed in as {user.email}</p>
            <button onClick={() => supabase.auth.signOut()} className="underline text-sm">
              Sign out
            </button>
          </div>
        ) : (
          <p>
            <a href="/auth/login" className="inline-block mt-2 underline">
              Log in
            </a>
          </p>
        )}
      </div>
    </main>
  );
}
