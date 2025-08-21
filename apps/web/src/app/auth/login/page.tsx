"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
    });
    setLoading(false);
    setMessage(error ? `Error: ${error.message}` : "Check your email for a login link.");
  }

  return (
    <div className="min-h-dvh">
      {/* Simple Nav */}
      <nav className="border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <a href="/" className="text-xl font-semibold">
              Demantive
            </a>
          </div>
        </div>
      </nav>

      {/* Login Form */}
      <main className="flex items-center justify-center px-4 py-20">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Welcome back</h1>
            <p className="text-neutral-600">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-neutral-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white rounded-md px-4 py-2 hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Sending..." : "Send magic link"}
            </button>

            {message && (
              <div
                className={`text-sm text-center ${message.includes("Error") ? "text-red-600" : "text-green-600"}`}
              >
                {message}
              </div>
            )}
          </form>

          <p className="text-center text-sm text-neutral-600 mt-8">
            Don't have an account?{" "}
            <a href="/auth/signup" className="text-black hover:underline">
              Sign up
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
