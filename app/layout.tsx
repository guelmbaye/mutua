import type { Metadata, Viewport } from "next";
import "./globals.css";

/**
 * Absolute URLs for social cards. Vercel injects VERCEL_URL on every
 * deployment; set NEXT_PUBLIC_SITE_URL once a custom domain exists.
 */
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

const title = "MUTUA — Shared State for Humans and Agents";
const description =
  "A WebMCP-native decision workspace where humans and AI agents share the same application state, simulate consequences, and commit only after explicit human approval.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  icons: { icon: "/icon.png" },
  openGraph: {
    type: "website",
    siteName: "MUTUA",
    title,
    description,
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "MUTUA — One state. Two participants." }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/og.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#17191C",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
