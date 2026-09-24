import type { Hooks, Plugin } from "@opencode-ai/plugin";

import { gatewayJson, gatewayUrl, rootSessionOf } from "./gateway.js";
import { blockedMessage, fingerprint, LoopGuard, WINDOW } from "./loop-guard.js";
import { memoryContext } from "./memory-context.js";
import { orderOptions, QUESTION_FORMAT_HINT } from "./question.js";
import { continueLanguageHint, languageOf, recordFromParts, workingLanguageBlock } from "./working-language.js";

/** gateway 出错时，生成类工具宁可拒绝：确认服务不在的时候，花钱的操作不能默认放行。 */
const isBillable = (tool: string) => tool.includes("_generation") || tool.includes("generate_");

/** 拼到 system 最后一个元素的末尾，而不是新加一个元素（有的 provider 只认第一条 system）。 */
function appendSystem(system: string[], block: string): void {
  if (system.length === 0) system.push(block);
  else system[system.length - 1] = `${system[system.length - 1]}\n\n${block}`;
}

const plugin: Plugin = async (input) => {
  gatewayUrl(); // 缺 GATEWAY_URL 直接报错：没有它确认、防打转全失灵，宁可插件起不来被看见。
  const projectRoot = input.directory || process.cwd();
  const guard = new LoopGuard();
  const loopMode = process.env.LOOP_GUARD_MODE === "block" ? "block" : "ask";

  const hooks: Hooks = {
    "chat.message": async (inp, out) => {
      recordFromParts(inp.sessionID, out.parts as { metadata?: Record<string, unknown> }[]);
      // 新的一轮用户消息：防打转的窗口从头算。
      guard.reset(inp.sessionID);
    },

    "chat.params": async (inp, out) => {
      // 我们的平台是"自定义模型"那条 provider：按模型上限给足输出长度，否则长回复会被截断。
      if (String(inp.provider?.info?.id ?? inp.model?.providerID ?? "").startsWith("user-custom-")) {
        const limit = (inp.model as { limit?: { output?: number } })?.limit?.output;
        if (limit) out.maxOutputTokens = limit;
      }
    },

    "experimental.chat.system.transform": async (inp, out) => {
      if (inp.sessionID) {
        let wl = languageOf(inp.sessionID);
        if (!wl) wl = languageOf(await rootSessionOf(inp.sessionID));
        if (wl) appendSystem(out.system, workingLanguageBlock(wl));
      }
      const mem = memoryContext(projectRoot);
      if (mem) appendSystem(out.system, mem);
    },

    "experimental.chat.messages.transform": async (_inp, out) => {
      for (const m of out.messages) {
        for (const p of m.parts as { type: string; synthetic?: boolean; text?: string; sessionID?: string }[]) {
          if (p.type !== "text" || !p.synthetic || !p.text || p.text.includes("[language]")) continue;
          if (/Continue if you have next steps|exceeded the provider's size limit/.test(p.text)) {
            p.text = `${p.text}\n\n${continueLanguageHint(p.sessionID ? languageOf(p.sessionID)?.locale : undefined)}`;
          }
        }
      }
    },

    "tool.definition": async (inp, out) => {
      if (inp.toolID === "question" && !out.description.includes(QUESTION_FORMAT_HINT.trim())) out.description += QUESTION_FORMAT_HINT;
    },

    "tool.execute.before": async (inp, out) => {
      const { tool, sessionID } = inp;
      const args = (out.args ??= {}) as Record<string, any>;

      if (tool === "question") orderOptions(args);

      // `/xxx` 是斜杠命令，不是子 agent 的任务 —— 交给通用 agent 只会让它一本正经地瞎做。
      if (tool === "task" && typeof args.prompt === "string" && args.prompt.trim().startsWith("/") && (!args.subagent_type || args.subagent_type === "general")) {
        throw new Error(`${args.prompt.trim().split(/\s/)[0]} is not a recognized slash command or skill. Load the skill with the skill tool instead.`);
      }

      // 防打转
      const fp = fingerprint(tool, args);
      const hits = guard.check(sessionID, fp);
      if (hits) {
        if (loopMode === "block") throw new Error(blockedMessage(tool, hits));
        let decision: string = "reject";
        try {
          const r = await gatewayJson<{ decision: string }>(`/api/internal/sessions/${encodeURIComponent(sessionID)}/loop-guard/ask`, {
            body: { tool, hits, window: WINDOW, recent_tools: guard.recentTools(sessionID), fingerprint: fp, request_id: crypto.randomUUID(), timeout_ms: 30_000 },
            timeoutMs: 35_000,
          });
          decision = r.decision;
        } catch {
          decision = "reject";
        }
        if (decision === "reject") throw new Error(blockedMessage(tool, hits));
        if (decision === "allow_session") guard.allowForSession(sessionID, fp);
      }

      if (!tool.startsWith("hub_")) return;

      // MCP server 是独立进程：会话、调用 id、项目根都要靠这些参数带过去，
      // 否则它不知道结果该归到哪个会话、计划该写到哪个项目。
      args._session_id = sessionID;
      args._tool_use_id = inp.callID;
      if (tool.startsWith("hub_plan_")) args.projectRoot = projectRoot;
      if (tool === "hub_memory") args.projectRoot ??= projectRoot;

      // 执行前确认（"询问"模式下由用户拍板；其余模式 gateway 直接回 confirm）。
      let d: { decision: string; reject_reason?: string; modified_args?: Record<string, unknown> };
      try {
        d = await gatewayJson(`/api/internal/sessions/${encodeURIComponent(sessionID)}/tool-confirm/ask`, {
          body: { tool, args, timeout_ms: 300_000 },
          timeoutMs: 310_000,
        });
      } catch {
        d = isBillable(tool) ? { decision: "reject", reject_reason: "confirmation_unavailable" } : { decision: "confirm" };
      }
      if (d.decision !== "confirm") {
        throw new Error(
          `[tool-confirm-reject:${d.reject_reason ?? "user_rejected"}] The user did not approve ${tool}. Do not retry the same tool with the same parameters; ask the user what to change.`,
        );
      }
      if (d.modified_args) {
        const changes = Object.entries(d.modified_args)
          .filter(([k, v]) => !k.startsWith("_") && JSON.stringify(args[k]) !== JSON.stringify(v))
          .map(([k, v]) => `${k}: ${JSON.stringify(args[k])} -> ${JSON.stringify(v)}`);
        Object.assign(args, d.modified_args);
        if (changes.length) args._user_override_note = `User manually modified: ${changes.join("; ")}`;
      }
    },

    "tool.execute.after": async (inp) => {
      guard.record(inp.sessionID, fingerprint(inp.tool, inp.args ?? {}));
    },

    "shell.env": async (_inp, out) => {
      // Windows 的控制台默认代码页不是 UTF-8：中文路径和输出会乱码，Python 脚本直接报错。
      if (process.platform === "win32") {
        Object.assign(out.env, { LANG: "C.UTF-8", LC_ALL: "C.UTF-8", PYTHONIOENCODING: "utf-8", PYTHONUTF8: "1" });
      }
    },
  };
  return hooks;
};

export default plugin;
