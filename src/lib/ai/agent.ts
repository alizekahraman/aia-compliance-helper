/**
 * Backward-compat re-exports.
 *
 * The monolithic agent.ts has been replaced by the multi-agent architecture:
 *   src/lib/ai/provider.ts     — Provider interface & factory
 *   src/lib/ai/agents/*.ts     — Specialist agents
 *   src/lib/ai/orchestrator.ts — Pipeline coordinator
 *
 * This file keeps the old named exports alive so any code that still imports
 * from "@/lib/ai/agent" continues to compile without changes.
 */

export { getProvider } from "./provider";
export { orchestrate } from "./orchestrator";
