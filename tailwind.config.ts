import type { Config } from "tailwindcss";

/**
 * Brand tokens come straight from the MUTUA Naming & Branding Blueprint (§17–18).
 * Restrained neutral base, one accent (indigo) reserved for *proposal / agent capability*.
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./agent/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        graphite: {
          DEFAULT: "#17191C",
          900: "#17191C",
          800: "#22252A",
          700: "#31353C",
          600: "#454A53",
        },
        soft: "#F7F7F5",
        slate: {
          DEFAULT: "#6B7280",
          line: "#E4E4E1",
          faint: "#EFEFEC",
        },
        accent: {
          DEFAULT: "#5B5FEF",
          soft: "#ECECFF",
          line: "#C7C8FA",
        },
        success: { DEFAULT: "#17875B", soft: "#E4F3EC" },
        warning: { DEFAULT: "#B7791F", soft: "#FBF1DE" },
        danger: { DEFAULT: "#C94A4A", soft: "#FAE9E9" },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      fontSize: {
        meta: ["11px", { lineHeight: "16px", letterSpacing: "0.02em" }],
        eyebrow: ["11px", { lineHeight: "14px", letterSpacing: "0.09em" }],
      },
      keyframes: {
        "capability-in": {
          "0%": { opacity: "0", transform: "translateY(-4px)", backgroundColor: "#ECECFF" },
          "60%": { opacity: "1", backgroundColor: "#ECECFF" },
          "100%": { opacity: "1", transform: "translateY(0)", backgroundColor: "transparent" },
        },
        "row-in": {
          "0%": { opacity: "0", transform: "translateY(3px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "capability-in": "capability-in 900ms ease-out",
        "row-in": "row-in 200ms ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
