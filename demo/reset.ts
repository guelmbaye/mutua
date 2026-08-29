import { useWorkspaceStore } from "@/store/workspace-store";
import { registry } from "@/webmcp/registry";
import { resetIdCounter } from "@/domain/rules";

/** One click back to the baseline: state, ids, registry, call log. */
export function resetEverything(): void {
  resetIdCounter();
  registry.reset();
  useWorkspaceStore.getState().resetDemo();
  registry.sync(useWorkspaceStore.getState().phase);
}
