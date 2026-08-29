"use client";

import { Button } from "@/components/ui/primitives";
import { useWorkspaceStore } from "@/store/workspace-store";
import type { Scenario } from "@/domain/types";

/**
 * Approval never leaves the interface. There is no WebMCP tool for it — that is
 * the point: the human's authority is a state transition only a human can make.
 */
export function ApprovalActions({ scenario }: { scenario: Scenario }) {
  const approveProposal = useWorkspaceStore((s) => s.approveProposal);
  const rejectApproval = useWorkspaceStore((s) => s.rejectApproval);
  const discardProposal = useWorkspaceStore((s) => s.discardProposal);
  const openComparison = useWorkspaceStore((s) => s.openComparison);
  const scenarioCount = useWorkspaceStore((s) => s.scenarios.filter((sc) => sc.status !== "discarded").length);

  const hardFailures = scenario.constraintResults.filter(
    (r) => r.severity === "hard" && r.status === "failed",
  );
  const blocked = hardFailures.length > 0;

  if (scenario.status === "approved") {
    return (
      <div className="flex items-center justify-between gap-3 rounded border border-success/30 bg-success-soft px-3 py-2.5">
        <div>
          <div className="text-sm font-medium text-graphite">Approved by you</div>
          <p className="text-meta text-graphite-600">
            The agent can now commit this proposal. Ask it to, or wait.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => rejectApproval(scenario.id)}>
          Withdraw approval
        </Button>
      </div>
    );
  }

  if (scenario.status !== "simulated") return null;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="accent" disabled={blocked} onClick={() => approveProposal(scenario.id)}>
          Approve {scenario.name}
        </Button>
        {scenarioCount > 2 && (
          <Button variant="outline" onClick={() => openComparison()}>
            Compare scenarios
          </Button>
        )}
        <Button variant="ghost" onClick={() => discardProposal(scenario.id, "human")}>
          Discard
        </Button>
      </div>
      {blocked && (
        <p className="text-meta text-danger">
          Approval unavailable — resolve {hardFailures.length} hard constraint
          {hardFailures.length > 1 ? "s" : ""} first: {hardFailures.map((f) => f.label).join(", ")}.
        </p>
      )}
    </div>
  );
}
