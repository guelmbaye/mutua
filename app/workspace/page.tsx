import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";

export const metadata: Metadata = {
  title: "September Launch Recovery — MUTUA",
  description:
    "The MUTUA workspace: one shared state, reversible proposals, deterministic simulation, human locks, and a WebMCP capability surface that changes with the plan.",
};

export default function WorkspacePage() {
  return <AppShell />;
}
