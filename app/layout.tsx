import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MUTUA — Shared State for Humans and Agents",
  description:
    "A WebMCP-native decision workspace where humans and AI agents share the same application state, simulate consequences, and commit only after explicit human approval.",
  icons: { icon: "/icon.png" },
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
