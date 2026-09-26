import type { Hooks, Plugin } from "@opencode-ai/plugin";

import { rememberSessionAgent, sessionAgentCache } from "./_session-agent-cache.js";
import {
  type AgentRef,
  getAgentRef,
  getGrants,
  hasSkillLoaded,
  recordGrant,
  recordSkillLoaded,
  rememberAgentRef,
  resolveRootSession,
} from "./_session-skill-grants.js";
import { rememberWorkingLanguage } from "./_session-working-language.js";
import { observeAttachmentInputs, reportAttachmentObservationFailure, toolAttachmentPaths, userAttachmentPaths } from "./attachment-inputs.js";
import {
  attachmentRefsBySession,
  mergeAttachmentRefs,
  observeQuestionReplyAttachments,
  parseToolAttachmentRefs,
  rememberAttachmentRefs,
  rememberToolAttachmentRefs,
  toolAttachmentRefsForTurn,
} from "./attachment-refs.js";
import { BrowserSkillRequiredError, CONTROL_IN_APP_BROWSER_SKILL, isBrowserSkillInstalled, isBrowserSkillLoadResult } from "./browser-skill-gate.js";
import { hasPendingCompactionContinuePrompt, rewriteCompactionContinueLanguage } from "./compaction-continue-rewrite.js";
import { notifySkillUploadCheck, reportLoopGuardTrip, reportMcpToolCallObserved } from "./gateway-reports.js";
import { loadMemoryContext, shouldIncludeUserMemory } from "./load-memory-context.js";
import { askUserViaGateway } from "./loop-guard/ask-client.js";
import { createLoopGuard, LoopGuardError } from "./loop-guard/index.js";
import { fetchMediaModels } from "./media-models-cache.js";
import { assertQuestionModelOptionsMatchCatalog, questionModelSelectionCategory } from "./question-model-catalog-guard.js";
import { putRecommendedQuestionOptionsFirst, QUESTION_FORMAT_HINT } from "./question-option-order.js";
import { fetchRequestGroup, groupScopeMarker, shouldFailOpenRequestGroup } from "./request-group.js";
import { readSkillMeta } from "./skill-meta-reader.js";
import { askToolConfirmViaGateway } from "./tool-confirm/ask-client.js";
import { ToolConfirmRejectError } from "./tool-confirm/index.js";
import { formatUserVisibleModelSafetyBlock } from "./user-visible-model-safety.js";
import {
  collectMessageSessionIds,
  formatWorkingLanguage,
  getEffectiveWorkingLanguage,
  getEffectiveWorkingLanguageForSessions,
  workingLanguageFromParts,
} from "./working-language.js";

const HUB_TOOL_PREFIX = "hub_";
const HUB_MEMORY_TOOL = "hub_memory";
const HUB_BROWSER_TOOL = "hub_browser";
const HUB_PLAN_TOOL_PREFIX = "hub_plan_";
const CHAT_TURN_ID_HEADER = "X-Chat-Turn-Id";
const ATTACHMENT_REFS_HEADER = "X-Hilo-Attachment-Refs";

const isDev = process.env.NODE_ENV !== "production";

/** 用户在设置里自配的模型（provider id `user-custom-*`）：不走平台的分组、附件归属。 */
function isCustomModelProvider(id: unknown): boolean {
  return /^user-custom-[a-z0-9-]+$/.test(typeof id === "string" ? id : "");
}

/** 拼到 system 最后一个元素的末尾，而不是新加一个元素（有的 provider 只认第一条 system）。 */
function appendSystemBlock(system: string[], block: string): void {
  if (system.length > 0) system[system.length - 1] = `${system[system.length - 1]}\n\n${block}`;
  else system.push(block);
}

function pushGrants(agent: AgentRef, grants: Iterable<string>): number {
  let n = 0;
  for (const tool of grants) {
    agent.permission!.push({ permission: tool, action: "allow", pattern: "*" });
    n++;
  }
  return n;
}

const plugin: Plugin = async (input) => {
  const envGatewayUrl = process.env.GATEWAY_URL;
  // 缺 GATEWAY_URL 直接报错：没有它确认、防打转全失灵，宁可插件起不来被看见。
  if (!envGatewayUrl) throw new Error("[hilo-plugin] GATEWAY_URL must be set; the gateway must inject it when launching opencode");
  const gatewayUrl: string = envGatewayUrl;
  console.log(`[hilo-plugin] initialized; gatewayUrl=${gatewayUrl}`);
  const projectRoot = () => input?.directory || process.cwd();

  const loopGuardMode = process.env.LOOP_GUARD_MODE === "block" ? "block" : "ask";
  console.log(`[hilo-plugin] [loop-guard] mode=${loopGuardMode}`);
  const loopGuard = createLoopGuard({
    window: 5,
    threshold: 3,
    onAsk: async (ask) => {
      console.warn(`[hilo-plugin] [loop-guard] TRIP session=${ask.sessionID} tool=${ask.tool} hits=${ask.hits}/${ask.window} mode=${loopGuardMode}`);
      void reportLoopGuardTrip(gatewayUrl, ask.sessionID, ask.tool).catch(() => {});
      if (loopGuardMode === "block") return "reject";
      const decision = await askUserViaGateway(gatewayUrl, {
        sessionID: ask.sessionID,
        tool: ask.tool,
        hits: ask.hits,
        window: ask.window,
        recentTools: ask.recent.map((r) => r.tool),
        fingerprint: ask.fingerprint,
      });
      console.log(`[hilo-plugin] [loop-guard] DECISION session=${ask.sessionID} tool=${ask.tool} decision=${decision}`);
      return decision;
    },
  });

  const hooks: Hooks = {
    /**
     * 模型请求头：本轮的计费分组、chat turn id、输入附件引用。
     * 拿不到分组（gateway 出错、超时）时拒发 —— 不发一个归不到任何一轮的请求；legacy（没有计费体系）照常发。
     */
    "chat.headers": async (inp, out) => {
      const model = inp.model as { providerID?: unknown; modelID?: unknown; id?: unknown } | undefined;
      const providerId = typeof model?.providerID === "string" ? model.providerID : "unknown";
      if (isCustomModelProvider(providerId)) return;
      const modelId = typeof model?.modelID === "string" ? model.modelID : typeof model?.id === "string" ? model.id : "unknown";
      const resolution = await fetchRequestGroup(gatewayUrl, inp.sessionID, "chat.headers", ` provider_id=${providerId} model_id=${modelId}`);
      const toolRefs = resolution.chatTurnId ? toolAttachmentRefsForTurn(inp.sessionID, resolution.chatTurnId) : [];
      const attachmentRefs = mergeAttachmentRefs(attachmentRefsBySession.get(inp.sessionID) ?? [], toolRefs);
      if (attachmentRefs.length > 0) out.headers[ATTACHMENT_REFS_HEADER] = JSON.stringify(attachmentRefs);
      if (resolution.chatTurnId) out.headers[CHAT_TURN_ID_HEADER] = resolution.chatTurnId;
      if (resolution.ok) {
        out.headers["X-Group-Id"] = resolution.groupId;
        return;
      }
      if (resolution.reason === "legacy_null" || resolution.reason === "no_session") return;
      if (shouldFailOpenRequestGroup()) {
        console.warn(`[hilo-plugin] [request-group] NON-PRODUCTION FAIL-OPEN override active — sending unscoped model request session=${inp.sessionID}`);
        return;
      }
      throw new Error(
        `REQUEST_GROUP_UNAVAILABLE: refusing to send an unscoped model request (session=${inp.sessionID}, reason=${resolution.reason}). The local gateway could not resolve this turn's request/billing Group; retry the message.`,
      );
    },

    /**
     * 每次请求前：记下会话用的是哪个 agent（技能授权要往它的 permission 里追加），
     * 再把根会话上已加载技能授权的工具补到这个 agent 上 —— 子 agent 的会话也拿得到。
     */
    "chat.params": async (inp, out) => {
      const model = inp.model as { providerID?: string; limit?: { output?: number } } | undefined;
      const limit = model?.limit?.output;
      // 自配模型按模型上限给足输出长度，否则长回复会被截断。
      if (isCustomModelProvider(model?.providerID) && typeof limit === "number" && Number.isSafeInteger(limit) && limit > 0) {
        out.maxOutputTokens = limit;
      }
      const agent = typeof inp.agent === "object" && inp.agent !== null ? (inp.agent as AgentRef) : undefined;
      if (agent?.name && inp.sessionID) rememberSessionAgent(inp.sessionID, agent.name);
      if (agent && inp.sessionID) rememberAgentRef(inp.sessionID, agent);
      if (!agent?.permission) {
        if (isDev) console.log(`[hilo-plugin] chat.params session=${inp.sessionID}: skipped (no agent.permission)`);
        return;
      }
      let grantsApplied = 0;
      try {
        const rootId = await resolveRootSession(inp.sessionID, gatewayUrl);
        const myGrants = agent.name ? getGrants(rootId)?.get(agent.name) : undefined;
        if (myGrants && myGrants.size > 0) grantsApplied = pushGrants(agent, myGrants);
      } catch (err) {
        console.warn(`[hilo-plugin] grant application failed session=${inp.sessionID}: ${err instanceof Error ? err.message : String(err)}`);
      }
      if (isDev && grantsApplied > 0) {
        console.log(
          `[hilo-plugin] permission.grants session=${inp.sessionID} agent=${agent.name ?? "unknown"} grants=${grantsApplied} permission_len=${agent.permission.length}`,
        );
      }
    },

    /** system 末尾依次拼：记忆目录、用户可见模型名规则、工作语言。 */
    "experimental.chat.system.transform": async (inp, out) => {
      let memoryEntries = 0;
      let memoryTruncated = 0;
      try {
        const root = projectRoot();
        const memory = await loadMemoryContext({ projectRoot: root, includeUserMemory: shouldIncludeUserMemory(root) });
        if (memory.prompt) appendSystemBlock(out.system, memory.prompt);
        memoryEntries = memory.totalEntries;
        memoryTruncated = memory.truncated;
      } catch (err) {
        console.warn(`[hilo-plugin] memory injection failed session=${inp.sessionID}: ${(err as Error).message}`);
      }
      appendSystemBlock(out.system, formatUserVisibleModelSafetyBlock());
      if (isDev && memoryEntries > 0) {
        console.log(`[hilo-plugin] system.transform session=${inp.sessionID} memory_entries=${memoryEntries} memory_truncated=${memoryTruncated}`);
      }
      const workingLanguage = await getEffectiveWorkingLanguage(inp.sessionID, gatewayUrl);
      if (workingLanguage) appendSystemBlock(out.system, formatWorkingLanguage(workingLanguage));
    },

    /** 压缩后的合成"继续"消息补一句语言要求。只有真有待补的消息才去查工作语言。 */
    "experimental.chat.messages.transform": async (_inp, out) => {
      const sessionIDs = collectMessageSessionIds(out.messages);
      const workingLanguage = hasPendingCompactionContinuePrompt(out.messages)
        ? await getEffectiveWorkingLanguageForSessions(sessionIDs, gatewayUrl)
        : undefined;
      rewriteCompactionContinueLanguage(out.messages, workingLanguage?.locale);
    },

    /**
     * 新的一轮用户消息：防打转的窗口从头算（用户说"再来一张"是正当的重试），
     * 记下工作语言，登记消息里的附件。
     */
    "chat.message": async (inp, out) => {
      loopGuard.resetSession(inp.sessionID);
      const parts = (out.parts ?? []) as unknown[];
      const workingLanguage = workingLanguageFromParts(parts);
      if (workingLanguage) rememberWorkingLanguage(inp.sessionID, workingLanguage);
      // 登记期间又来了新消息：以新消息为准，旧的结果丢掉。
      const observation = {};
      userAttachmentObservations.set(inp.sessionID, observation);
      try {
        rememberAttachmentRefs(inp.sessionID, parts);
        const observed = await observeAttachmentInputs(gatewayUrl, inp.sessionID, userAttachmentPaths(parts));
        if (userAttachmentObservations.get(inp.sessionID) !== observation) return;
        const userRefs = mergeAttachmentRefs(
          attachmentRefsBySession.get(inp.sessionID) ?? [],
          observed.map((ref) => ({ ...ref, direction: "input" as const })),
        );
        if (userRefs.length > 0) attachmentRefsBySession.set(inp.sessionID, userRefs);
      } catch (error) {
        reportAttachmentObservationFailure(inp.sessionID, error);
      } finally {
        if (userAttachmentObservations.get(inp.sessionID) === observation) userAttachmentObservations.delete(inp.sessionID);
      }
    },

    /**
     * 工具执行前。顺序有讲究：
     * 1. task 的斜杠命令、question 的选项整理和模型校验；
     * 2. 防打转（拦下的调用不会走到后面，也不会真的执行；ask 模式下可能等用户最多 30 秒）；
     * 3. skill：记授权，到此为止；
     * 4. hub 工具：内置浏览器的技能门、执行前确认、注入会话参数（MCP server 是独立进程，
     *    会话、调用 id、项目根、计费分组都要靠参数带过去，否则结果归不到发起的会话上）。
     */
    "tool.execute.before": async (inp, out) => {
      if (!inp.sessionID) console.warn(`[hilo-plugin] tool.execute.before: sessionID is undefined for tool=${inp.tool}`);

      // `/xxx` 是斜杠命令，不是子 agent 的任务 —— 交给通用 agent 只会让它一本正经地瞎做。
      if (inp.tool === "task") {
        const a = out.args as { prompt?: unknown; subagent_type?: unknown } | undefined;
        const prompt = typeof a?.prompt === "string" ? a.prompt.trim() : "";
        if (prompt.startsWith("/")) {
          const sub = typeof a?.subagent_type === "string" ? a.subagent_type : "";
          if (sub === "general" || sub === "") {
            throw new LoopGuardError(
              `"${prompt}" is not a recognized slash command or skill. Do NOT retry with the task tool. Tell the user this skill was not found and suggest they check available skills.`,
              { tool: "task", sessionID: inp.sessionID, hits: 1, window: 1 },
            );
          }
        }
      }

      if (inp.tool === "question") {
        putRecommendedQuestionOptionsFirst(out.args);
        if (questionModelSelectionCategory(out.args)) {
          const snapshot = await fetchMediaModels(gatewayUrl);
          assertQuestionModelOptionsMatchCatalog(out.args, snapshot.models);
        }
      }

      await loopGuard.check({ sessionID: inp.sessionID, tool: inp.tool, args: out.args });

      if (inp.tool === "skill") {
        const skillName = (out.args as { name?: unknown } | undefined)?.name;
        if (typeof skillName === "string" && skillName.length > 0 && inp.sessionID) await applySkillGrants(inp.sessionID, skillName);
        if (typeof skillName === "string" && skillName.length > 0) notifySkillUploadCheck(skillName, gatewayUrl);
        return;
      }

      if (inp.tool.startsWith(HUB_TOOL_PREFIX) && inp.sessionID) {
        if (inp.tool === HUB_BROWSER_TOOL) {
          const rootId = await resolveRootSession(inp.sessionID, gatewayUrl);
          if (
            isBrowserSkillInstalled() &&
            !hasSkillLoaded(rootId, CONTROL_IN_APP_BROWSER_SKILL) &&
            !hasSkillLoaded(inp.sessionID, CONTROL_IN_APP_BROWSER_SKILL)
          ) {
            throw new BrowserSkillRequiredError();
          }
        }
        const confirmResult = await askToolConfirmViaGateway(gatewayUrl, { sessionID: inp.sessionID, tool: inp.tool, args: out.args ?? {} });
        if (confirmResult.decision === "reject") {
          throw new ToolConfirmRejectError(inp.tool, confirmResult.reject_reason ?? "confirmation_unavailable");
        }
        if (confirmResult.modified_args) {
          // 用户在确认卡片上改了参数：照改，并告诉模型是用户改的，别再按原参数重试。
          const originalArgs = { ...(out.args as Record<string, unknown>) };
          for (const [k, v] of Object.entries(confirmResult.modified_args)) out.args[k] = v;
          const changes = Object.entries(confirmResult.modified_args)
            .filter(([k]) => !k.startsWith("_"))
            .filter(([k, v]) => JSON.stringify(originalArgs[k]) !== JSON.stringify(v))
            .map(([k, v]) => `${k}: ${JSON.stringify(originalArgs[k])} -> ${JSON.stringify(v)}`);
          if (changes.length > 0) {
            out.args._user_override_note = `User manually modified: ${changes.join("; ")}. Accept result as-is, do not retry with original parameters.`;
          }
        }
      }

      if (!inp.tool.startsWith(HUB_TOOL_PREFIX)) return;
      if (!out.args || typeof out.args !== "object") out.args = {};
      const args = out.args as Record<string, unknown>;
      // 计划永远写在当前工作区；记忆允许模型显式指到别的项目。
      if (inp.tool.startsWith(HUB_PLAN_TOOL_PREFIX)) {
        args.projectRoot = projectRoot();
      } else if (inp.tool === HUB_MEMORY_TOOL) {
        if (args.projectRoot == null || args.projectRoot === "") args.projectRoot = projectRoot();
      }
      if (!inp.sessionID) return;
      args._session_id = inp.sessionID;
      // 这几个只能由这里给：模型自己编的一律清掉。
      delete args._group_id;
      delete args._group_scope;
      delete args._chat_turn_id;
      const resolution = await fetchRequestGroup(gatewayUrl, inp.sessionID, "tool.execute");
      if (resolution.chatTurnId) args._chat_turn_id = resolution.chatTurnId;
      if (resolution.ok) args._group_id = resolution.groupId;
      else args._group_scope = groupScopeMarker(resolution);
      if (inp.callID) args._tool_use_id = inp.callID;
      if (inp.callID && resolution.chatTurnId) {
        try {
          const refs = await observeAttachmentInputs(gatewayUrl, inp.sessionID, toolAttachmentPaths(args), {
            callId: inp.callID,
            chatTurnId: resolution.chatTurnId,
          });
          rememberToolAttachmentRefs(inp.sessionID, {
            _meta: {
              chat_turn_id: resolution.chatTurnId,
              attachment_refs: refs.map((ref) => ({ ...ref, tool_call_id: inp.callID, direction: "input" })),
            },
          });
        } catch (error) {
          reportAttachmentObservationFailure(inp.sessionID, error);
        }
      }
    },

    /**
     * 工具真的跑完之后才记进防打转历史：在 before 里记的话，被拦下的调用也进了历史，
     * 模型换了模型想脱困也会被一直拦。
     */
    "tool.execute.after": async (inp, out) => {
      if (inp.tool === "skill" && inp.sessionID && isBrowserSkillLoadResult(inp.args, out.output)) {
        const rootId = await resolveRootSession(inp.sessionID, gatewayUrl);
        recordSkillLoaded(rootId, CONTROL_IN_APP_BROWSER_SKILL);
      }
      if (inp.tool === "question") {
        try {
          const refs = await observeQuestionReplyAttachments(gatewayUrl, inp.sessionID, inp.callID, out);
          if (refs.length > 0) {
            const metadata: Record<string, unknown> =
              out.metadata && typeof out.metadata === "object" && !Array.isArray(out.metadata) ? out.metadata : {};
            const merged = mergeAttachmentRefs(parseToolAttachmentRefs(metadata.attachment_refs), refs);
            metadata.attachment_refs = merged;
            out.metadata = metadata;
            attachmentRefsBySession.set(inp.sessionID, mergeAttachmentRefs(attachmentRefsBySession.get(inp.sessionID) ?? [], merged));
          }
        } catch {
          // 登记失败不影响 question 的结果
        }
      }
      rememberToolAttachmentRefs(inp.sessionID, out);
      loopGuard.record({ sessionID: inp.sessionID, tool: inp.tool, args: inp.args });
      void reportMcpToolCallObserved(gatewayUrl, inp.sessionID, inp.tool).catch(() => {});
    },

    /**
     * Windows 的控制台默认代码页不是 UTF-8：中文路径和输出会乱码，技能里的 Python 脚本直接报错。
     * 用 `C.UTF-8` 而不是 `zh_CN.UTF-8`：git-bash 默认只带 C 和 en_US。已经设了的不覆盖。
     */
    "shell.env": async (_inp, out) => {
      if (process.platform !== "win32") return;
      out.env.LANG ??= "C.UTF-8";
      out.env.LC_ALL ??= "C.UTF-8";
      out.env.PYTHONIOENCODING ??= "utf-8";
      out.env.PYTHONUTF8 ??= "1";
    },

    "tool.definition": async (inp, out) => {
      if (inp.toolID === "question") out.description = out.description + QUESTION_FORMAT_HINT;
    },
  };

  /**
   * 技能被加载：把它声明的工具授权记到根会话上，并立刻追加到当前 agent 的 permission ——
   * 同一轮里下一次工具调用就要用到，等不到下一次 chat.params。
   */
  async function applySkillGrants(sessionID: string, skillName: string): Promise<void> {
    const meta = readSkillMeta(skillName);
    if (!meta) return;
    try {
      const rootId = await resolveRootSession(sessionID, gatewayUrl);
      if (meta.tools) recordGrant(rootId, "media-agent", meta.tools);
      if (meta.toolsByAgent) {
        for (const [agentName, tools] of Object.entries(meta.toolsByAgent)) recordGrant(rootId, agentName, tools);
      }
      const myAgentName = sessionAgentCache.get(sessionID);
      const agentRef = getAgentRef(sessionID);
      if (myAgentName && agentRef?.permission) {
        const myGrants = getGrants(rootId)?.get(myAgentName);
        if (myGrants && myGrants.size > 0) {
          pushGrants(agentRef, myGrants);
          if (isDev) {
            console.log(`[hilo-plugin] skill-grant in-turn session=${sessionID} skill=${skillName} agent=${myAgentName} granted=${[...myGrants].join(",")}`);
          }
        }
      }
      if (isDev) {
        const summary: string[] = [];
        if (meta.tools) summary.push(`media-agent:${meta.tools.length}`);
        if (meta.toolsByAgent) for (const [a, t] of Object.entries(meta.toolsByAgent)) summary.push(`${a}:${t.length}`);
        console.log(`[hilo-plugin] skill load grant root=${rootId.slice(0, 12)} skill=${skillName} ${summary.join(" ")}`);
      }
    } catch (err) {
      console.warn(
        `[hilo-plugin] skill grant recording failed session=${sessionID} skill=${skillName}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  return hooks;
};

/** 每个会话正在进行的用户消息附件登记（用来识别"登记期间又来了新消息"）。 */
const userAttachmentObservations = new Map<string, object>();

export default plugin;
