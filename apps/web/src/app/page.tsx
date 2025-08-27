export default function Home() {
  return (
    <div className="min-h-dvh">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <a href="/" className="text-xl font-semibold text-gray-900">
                Demantive
              </a>
            </div>
            <div className="flex items-center space-x-8">
              <a href="#features" className="text-sm text-gray-600 hover:text-gray-900">
                Features
              </a>
              <a href="#how-it-works" className="text-sm text-gray-600 hover:text-gray-900">
                How it works
              </a>
              <div className="flex items-center space-x-4">
                <a href="/auth/login" className="text-sm text-gray-600 hover:text-gray-900">
                  Sign in
                </a>
                <a
                  href="/auth/signup"
                  className="bg-black text-white px-4 py-2 rounded-md text-sm hover:bg-gray-800 transition-colors"
                >
                  Get started
                </a>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-20 pb-32 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl font-bold tracking-tight mb-6 text-gray-900">
            CMO visibility in minutes,
            <br />
            not months
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Connect your CRM and instantly see what programs are driving pipeline, what changed, and
            what to do next. No dashboards to build.
          </p>
          <div className="flex justify-center gap-4">
            <a
              href="/auth/signup"
              className="bg-black text-white px-6 py-3 rounded-md hover:bg-gray-800 transition-colors"
            >
              Start free trial
            </a>
            <a
              href="#how-it-works"
              className="border border-gray-300 px-6 py-3 rounded-md hover:bg-gray-50 transition-colors"
            >
              See how it works
            </a>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 bg-gray-50 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">
            Everything a CMO needs, nothing they don't
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold mb-3 text-gray-900">Programs View</h3>
              <p className="text-gray-600">
                See all your programs rolled up from CRM data. Know exactly what's driving pipeline
                without building complex reports.
              </p>
            </div>
            <div className="bg-white p-8 rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold mb-3 text-gray-900">What Changed</h3>
              <p className="text-gray-600">
                Weekly and monthly deltas with one-line explanations. No more digging through data
                to understand movements.
              </p>
            </div>
            <div className="bg-white p-8 rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold mb-3 text-gray-900">Next Actions</h3>
              <p className="text-gray-600">
                AI-powered recommendations on your next 3 moves. Stop guessing, start executing with
                confidence.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">
            Connect and go in 5 minutes
          </h2>
          <div className="max-w-3xl mx-auto">
            <div className="space-y-8">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-black text-white rounded-full flex items-center justify-center font-semibold">
                  1
                </div>
                <div>
                  <h3 className="font-semibold mb-1 text-gray-900">Connect your CRM</h3>
                  <p className="text-gray-600">
                    OAuth into HubSpot or Salesforce. We'll pull the last 90 days of data.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-black text-white rounded-full flex items-center justify-center font-semibold">
                  2
                </div>
                <div>
                  <h3 className="font-semibold mb-1 text-gray-900">Map your programs</h3>
                  <p className="text-gray-600">
                    Simple rules to group campaigns into programs. We'll suggest smart defaults.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-black text-white rounded-full flex items-center justify-center font-semibold">
                  3
                </div>
                <div>
                  <h3 className="font-semibold mb-1 text-gray-900">Get insights instantly</h3>
                  <p className="text-gray-600">
                    See your dashboard, chat with your data, and get weekly executive summaries.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto text-center text-gray-600">
          <p>&copy; 2025 Demantive. CMO visibility, simplified.</p>
        </div>
      </footer>
    </div>
  );
}
