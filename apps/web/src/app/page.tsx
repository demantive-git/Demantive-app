export default function Home() {
  return (
    <main className="min-h-dvh p-8 flex items-center justify-center">
      <div className="max-w-2xl w-full text-center space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight">Demantive</h1>
        <p className="text-neutral-700">CMO visibility app — connect-and-go.</p>
        <p>
          <a href="/auth/login" className="inline-block mt-2 underline">
            Log in
          </a>
        </p>
      </div>
    </main>
  );
}
