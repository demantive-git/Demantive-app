"use client";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AuthCallbackPage() {
  const search = useSearchParams();
  const router = useRouter();
  const [message, setMessage] = useState<string>("Signing you in...");

  useEffect(() => {
    async function run() {
      const code = search.get("code");
      if (!code) {
        setMessage("Missing code in URL.");
        return;
      }
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        setMessage(`Error: ${error.message}`);
        return;
      }
      setMessage("Signed in! Redirecting...");
      router.replace("/");
    }
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="min-h-dvh p-8 flex items-center justify-center">
      <p className="text-neutral-700">{message}</p>
    </main>
  );
}
