import { ImageResponse } from "next/og";

export const alt = "MUTUA — Shared State for Humans and Agents";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Generated at build time so the social card can never drift from the brand.
 * Restrained: graphite, soft white, one accent — same rules as the product.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#F7F7F5",
          padding: "72px 80px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <svg width="76" height="76" viewBox="0 0 100 100">
            <path d="M10 16 L52 50 L10 84 Z" fill="#5B5FEF" />
            <path d="M90 16 L48 50 L90 84 Z" fill="#17191C" />
            <circle cx="43" cy="56" r="15" fill="#1E1BC4" />
            <circle cx="52" cy="51" r="15" fill="#5B5FEF" />
          </svg>
          <div
            style={{
              fontSize: 36,
              fontWeight: 700,
              letterSpacing: "0.14em",
              color: "#17191C",
            }}
          >
            MUTUA
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 92,
              fontWeight: 700,
              lineHeight: 1.02,
              letterSpacing: "-0.03em",
              color: "#17191C",
            }}
          >
            One state.
          </div>
          <div
            style={{
              fontSize: 92,
              fontWeight: 700,
              lineHeight: 1.02,
              letterSpacing: "-0.03em",
              color: "#17191C",
            }}
          >
            Two participants.
          </div>
          <div style={{ marginTop: 28, fontSize: 30, color: "#454A53", maxWidth: 900 }}>
            A WebMCP-native decision workspace where humans and AI agents commit changes together.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "1px solid #E4E4E1",
            paddingTop: 28,
            fontSize: 24,
            color: "#6B7280",
          }}
        >
          <div style={{ display: "flex" }}>Think together. Change safely. Commit deliberately.</div>
          <div style={{ display: "flex", color: "#5B5FEF" }}>WebMCP</div>
        </div>
      </div>
    ),
    size,
  );
}
