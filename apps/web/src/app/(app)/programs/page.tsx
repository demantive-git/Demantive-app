"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AppNav } from "@/components/AppNav";

function ProgramsContent() {
  const searchParams = useSearchParams();
  const orgId = searchParams.get("org");

  return (
    <div className="min-h-screen bg-neutral-50">
      <AppNav />

      {/* Page Header */}
      <div className="bg-white border-b px-8 py-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold">Programs</h1>
          <p className="text-neutral-600 mt-1">
            Group your marketing campaigns for better insights
          </p>
        </div>
      </div>

      {/* Coming Soon */}
      <div className="px-8 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-white rounded-lg border shadow-sm p-12">
            <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-8 h-8 text-neutral-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-2">Programs coming soon</h2>
            <p className="text-neutral-600 mb-6 max-w-md mx-auto">
              This feature will allow you to create rules to automatically group your deals by
              campaign source, giving you clear visibility into what's driving pipeline.
            </p>
            <a
              href={`/dashboard?org=${orgId}`}
              className="inline-block bg-black text-white px-6 py-3 rounded-md hover:bg-neutral-800"
            >
              Back to dashboard
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProgramsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-neutral-600">Loading...</p>
        </div>
      }
    >
      <ProgramsContent />
    </Suspense>
  );
}
