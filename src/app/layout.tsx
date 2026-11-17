import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Meridian ATS",
  description: "Applicant tracking for Meridian Technologies – client-linked hiring, pipelines and source analytics.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
