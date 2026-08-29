import { beforeEach, describe, expect, it } from "vitest";
import { capabilityMap, unavailableReason } from "@/webmcp/capability-map";
import { registry } from "@/webmcp/registry";
import { toolDefinitions } from "@/webmcp/tools";
import { ALL_TOOLS } from "@/domain/constants";

beforeEach(() => {
  registry.reset();
});

describe("capability surface", () => {
  it("declares exactly twelve capabilities", () => {
    expect(toolDefinitions).toHaveLength(12);
    expect(new Set(toolDefinitions.map((t) => t.name))).toEqual(new Set(ALL_TOOLS));
  });

  it("gives every tool a description an agent can act on", () => {
    for (const tool of toolDefinitions) {
      expect(tool.description.length).toBeGreaterThan(60);
      expect(tool.title.length).toBeGreaterThan(3);
      expect(tool.jsonSchema).toHaveProperty("type", "object");
    }
  });

  it("marks commit as the only destructive, approval-gated capability", () => {
    const destructive = toolDefinitions.filter((t) => t.annotations.destructive);
    expect(destructive.map((t) => t.name)).toEqual(["commit_proposal"]);
    expect(destructive[0].annotations.requiresHumanApproval).toBe(true);
  });

  it("never exposes commit before approval, in any other phase", () => {
    for (const phase of ["current", "draft", "simulated", "committed"] as const) {
      expect(capabilityMap[phase]).not.toContain("commit_proposal");
    }
    expect(capabilityMap.approved).toContain("commit_proposal");
  });

  it("keeps read capabilities available while the plan is being shaped", () => {
    for (const phase of ["current", "draft", "simulated"] as const) {
      expect(capabilityMap[phase]).toContain("get_workspace_state");
      expect(capabilityMap[phase]).toContain("list_conflicts");
    }
  });

  it("gates comparison behind a simulation", () => {
    expect(capabilityMap.current).not.toContain("compare_scenarios");
    expect(capabilityMap.draft).not.toContain("compare_scenarios");
    expect(capabilityMap.simulated).toContain("compare_scenarios");
  });

  it("closes create_proposal while a proposal is open", () => {
    expect(capabilityMap.current).toContain("create_proposal");
    expect(capabilityMap.draft).not.toContain("create_proposal");
    expect(capabilityMap.simulated).not.toContain("create_proposal");
  });

  it("actually registers and unregisters, not just maps", () => {
    registry.sync("current");
    expect(registry.getRegisteredTools()).toContain("create_proposal");
    expect(registry.getRegisteredTools()).not.toContain("simulate_proposal");

    const draft = registry.sync("draft");
    expect(draft.added).toContain("simulate_proposal");
    expect(draft.removed).toContain("create_proposal");

    const approved = registry.sync("approved");
    expect(approved.added).toContain("commit_proposal");
    expect(registry.getRegisteredTools()).not.toContain("modify_proposal");
  });

  it("refuses a call to an unregistered capability", async () => {
    registry.sync("simulated");
    const result = await registry.call("commit_proposal", {});
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("TOOL_NOT_AVAILABLE");
  });

  it("explains every locked capability in plain language", () => {
    for (const tool of ALL_TOOLS) {
      expect(unavailableReason(tool, "current").length).toBeGreaterThan(8);
    }
  });
});
