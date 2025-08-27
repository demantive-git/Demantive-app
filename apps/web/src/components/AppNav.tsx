"use client";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function AppNav() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const orgId = searchParams.get("org");

  const navItems = [
    { href: `/dashboard?org=${orgId}`, label: "Dashboard" },
    { href: `/programs?org=${orgId}`, label: "Programs" },
    { href: `/settings/connections?org=${orgId}`, label: "Connections" },
  ];

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo/App Name */}
          <div className="flex items-center gap-8">
            <Link href={`/dashboard?org=${orgId}`} className="font-semibold text-xl text-gray-900">
              Demantive
            </Link>

            {/* Navigation Items */}
            <div className="flex items-center gap-6">
              {navItems.map((item) => {
                const isActive = pathname === item.href.split("?")[0];
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`text-sm font-medium transition-colors ${
                      isActive ? "text-black" : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4">
            <Link href="/orgs" className="text-sm text-gray-600 hover:text-gray-900">
              Switch Org
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
