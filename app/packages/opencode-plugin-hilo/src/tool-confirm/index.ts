import { formatToolConfirmRejectReasonMarker, type ToolConfirmRejectReason } from "./ask-client.js";

/**
 * 用户没批准时抛给模型的错误。开头的 `[tool-confirm-reject:原因]` 标记界面据此把工具卡片
 * 显示成"已拒绝 / 已过期"而不是普通报错；后半句告诉模型别原样重试。
 */
export class ToolConfirmRejectError extends Error {
  readonly code = "TOOL_CONFIRM_REJECT";
  readonly tool: string;
  readonly reason: ToolConfirmRejectReason;

  constructor(tool: string, reason: ToolConfirmRejectReason) {
    const reasonMessage =
      reason === "user_rejected"
        ? `User rejected this tool call (${tool}).`
        : reason === "confirmation_expired"
          ? `Tool confirmation expired before the user responded (${tool}).`
          : `Tool confirmation could not be completed (${tool}).`;
    super(
      `${formatToolConfirmRejectReasonMarker(reason)} ${reasonMessage} Do not retry the same tool with the same parameters. Either skip this step and continue with the rest of the plan, or ask the user what they would like to do instead before trying again.`,
    );
    this.name = "ToolConfirmRejectError";
    this.tool = tool;
    this.reason = reason;
  }
}
