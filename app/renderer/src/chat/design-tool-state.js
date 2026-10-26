/**
 * design 系列工具的「呈现 / 失败」判定。
 *
 * 这一段原来在 `chat/message-turn.jsx` 与 `chat/sub-agent-group.jsx` 各抄了一份，
 * 4.0.4 的时间线归并也要用（工具失败时要标成 error），抄第三份就不可维护了 ——
 * 所以集中在这里，三处都从这里导入。
 *
 * 依据：参照 4.0.4 主包 `mermaid-GHXKKRXX-DuPXfUYG.js` 里的
 * `designToolPresentation` / `hasDesignToolProblem` / `isDesignToolInterrupted`
 * （归并那段是 `toolStatus: designToolPresentation(...) && hasDesignToolProblem(...)`）。
 */
import { TOOL_ABORTED_BY_USER_TEXT } from "../canvas/diagnostic-history-tools.js";
import { connectorSkillLoadName } from "../media-editing/connector-skill-label.js";
import { readDesignJson, record, records } from "./read-design-json.js";
import { TOOLS } from "./tools.jsx";

/** 用户主动中断的工具不算"出错"。 */
export function isDesignToolInterrupted(message) {
  return Boolean(
    message?.interruption === "aborted" ||
      message?.toolResult?.includes(TOOL_ABORTED_BY_USER_TEXT) ||
      message?.toolResult?.includes("interrupted before completion"),
  );
}


/**
 * 工具结果里有没有"真出事"。
 *
 * 注意 `waiting_user` 也算：任务卡在等人，界面必须显示成可处理的问题，不能显示成成功。
 */
export function hasDesignToolProblem(message) {
  if (isDesignToolInterrupted(message)) return false;
  if (message.toolStatus === "error") return true;
  const result = readDesignJson(message.toolResult);
  const task = record(result?.task);
  const delivery = record(result?.delivery);
  return Boolean(
    result?.isError ||
      result?.error ||
      result?.placementProblem ||
      records(result?.queries ?? result?.results ?? result?.items).some((item) => item.error) ||
      ["failed", "blocked", "unknown", "waiting_user"].includes(String(task?.status ?? delivery?.status)),
  );
}

/** 这个工具在会话里该怎么呈现；不是 design 工具（或只是加载 skill）时返回 undefined。 */
export function designToolPresentation(name, message = {}) {
  if (!name || !Object.hasOwn(TOOLS, name)) return undefined;
  if (connectorSkillLoadName(name, message.toolArgs)) return undefined;
  let presentation = TOOLS[name];
  const args = readDesignJson(message.toolArgs);
  if (name === "design_memory") {
    // 4.0.4：memory 合并了 project_rules；只有写操作值得在会话里留一条
    presentation = {
      visibility:
        args?.action === "save" || args?.action === "write" || args?.action === "delete"
          ? "persistent"
          : "hidden",
      label: args?.target === "project_rules" ? "rules" : "memory",
    };
  } else if (name === "design_document_write" && (args?.mode === "replace" || args?.mode === "patch")) {
    presentation = {
      visibility: "persistent",
      label: args.disposition === "candidate" ? "documentCandidate" : "documentUpdate",
    };
  } else if (name === "design_deliver" && records(args?.sources).some((source) => typeof source.path === "string")) {
    presentation = { visibility: "persistent", label: "import" };
  } else if (name === "design_composition_edit") {
    const commands = args?.action === "batch" ? records(args.commands) : args ? [args] : [];
    if (commands.some((command) => typeof command.action === "string")) {
      presentation = { visibility: "persistent", label: "organize" };
    }
  } else if (name === "design_resource_edit") {
    const commands = args?.action === "batch" ? records(args.commands) : args ? [args] : [];
    presentation = {
      visibility: "persistent",
      label: commands.some((command) => command.action === "adopt") ? "version" : "metadata",
    };
  }
  // 出错的工具必须留在会话里（哪怕平时是 hidden），否则用户看不到失败。
  if (
    hasDesignToolProblem(message) &&
    ![
      "design_read",
      "design_composition_type_list",
      "design_capability_list",
      "design_capability_get",
      "design_select_image_recipe",
    ].includes(name)
  ) {
    return { ...presentation, visibility: "persistent" };
  }
  return presentation;
}
