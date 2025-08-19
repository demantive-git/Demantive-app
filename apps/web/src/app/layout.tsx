import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Demantive",
  description: "CMO visibility app",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="light">
      <body>{children}</body>
    </html>
  );
}
