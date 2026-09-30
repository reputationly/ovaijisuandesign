import { type ToolConfirmRejectReason } from '@hilo/protocol';
/**
 * Thrown from `tool.execute.before` when a single tool confirmation is
 * rejected. The OpenCode plugin runtime catches this throw and
 * surfaces it as an `is_error: true` tool_use result to the LLM. The session
 * is NOT aborted (gateway used to do that — removed in the inline-card
 * refactor) so the LLM can keep working on the same turn: it might skip
 * this step, try a different tool, or ask the user for clarification.
 *
 * Message wording targets the LLM: concrete, anti-retry, and steers toward
 * either asking the user or proceeding without this tool. Other cards in
 * the same turn are independent — settling this one does not affect them.
 */
export declare class ToolConfirmRejectError extends Error {
    readonly code = "TOOL_CONFIRM_REJECT";
    readonly tool: string;
    readonly reason: ToolConfirmRejectReason;
    constructor(tool: string, reason: ToolConfirmRejectReason);
}
//# sourceMappingURL=index.d.ts.map