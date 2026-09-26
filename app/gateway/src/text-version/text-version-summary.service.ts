import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { chat } from "@ov/maas-media";

import { MediaConfigService } from "../generate/media-config.service.js";
import { type DiffHunk, renderDiffForSummary } from "./text-line-diff.js";
import { TEXT_VERSION_NOTE_MAX_CHARS } from "./text-version.service.js";

const LLM_TIMEOUT_MS = 30_000;
/** 推理模型的思考和正文共用 max_tokens，给小了正文会是空的。 */
const LLM_MAX_TOKENS = 4096;
const WHOLE_DOC_BUDGET_CHARS = 6000;
const SUMMARY_DIFF_BUDGET_CHARS = 8000;
const AI_TITLE_MAX_CHARS = 24;

const SYSTEM_PROMPT = [
  "You label saved versions of a document.",
  "",
  "Reply immediately with STRICT JSON and nothing else — no reasoning, markdown fence, or prose:",
  '{"title": "...", "note": "..."}',
  "",
  "Rules:",
  "- Write both fields in the SAME language as the document content.",
  "- title: a short label naming the CHANGE itself, at most 12 CJK characters",
  "  or 6 English words. Never include the file name, a version number, a date,",
  "  or trailing punctuation.",
  "- note: one short paragraph, at most 60 characters in CJK or 30 words in",
  "  English. Describe WHAT changed and WHY it matters, not diff mechanics.",
  '- Never mention line numbers, hunks, "diff", or the fact you were given a patch.',
].join("\n");

function buildDiffPrompt(diffText: string, addedLines: number, removedLines: number): string {
  return [
    `The user saved a new version of a document. ${addedLines} line(s) added, ${removedLines} line(s) removed.`,
    "Changes:",
    "",
    diffText,
    "",
    "Write the title and note.",
  ].join("\n");
}

function buildWholeDocPrompt(head: string, truncated: boolean): string {
  return [
    "The user saved the FIRST version of a document, so there is nothing to compare against.",
    truncated ? "Beginning of the document (truncated):" : "Document:",
    "",
    head,
    "",
    "Write a title and a one-sentence note describing what this document is.",
  ].join("\n");
}

export interface VersionSummary {
  title: string;
  note: string;
  wholeDocument: boolean;
}

/**
 * 版本的 AI 标题 + 备注。用平台上配置的对话模型（和画布文本生成同一个），不走任何云端服务。
 * 模型没配或调用失败回 503：界面据此提示"自动命名不可用"，手动命名不受影响。
 */
@Injectable()
export class TextVersionSummaryService {
  constructor(private readonly media: MediaConfigService) {}

  async summarizeDiff(input: { hunks: DiffHunk[]; totalHunks: number; addedLines: number; removedLines: number }): Promise<VersionSummary> {
    const diffText = renderDiffForSummary(input.hunks, input.totalHunks, SUMMARY_DIFF_BUDGET_CHARS);
    if (diffText.trim().length === 0) return { title: "", note: "", wholeDocument: false };
    return { ...(await this.call(buildDiffPrompt(diffText, input.addedLines, input.removedLines))), wholeDocument: false };
  }

  async summarizeDocument(head: string, truncated: boolean): Promise<VersionSummary> {
    if (head.trim().length === 0) return { title: "", note: "", wholeDocument: true };
    return { ...(await this.call(buildWholeDocPrompt(head.slice(0, WHOLE_DOC_BUDGET_CHARS), truncated))), wholeDocument: true };
  }

  private async call(userPrompt: string): Promise<{ title: string; note: string }> {
    let cfg;
    try {
      cfg = this.media.load();
    } catch (err) {
      throw new ServiceUnavailableException(`Platform config is unreadable: ${(err as Error).message}`);
    }
    if (!cfg.platform.chat_model.trim() || !cfg.platform.base_url.trim()) throw new ServiceUnavailableException("No chat model configured");
    let text: string;
    try {
      const turn = await chat.completeWithTools(
        this.media.client(),
        cfg,
        [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        [],
        LLM_MAX_TOKENS,
        LLM_TIMEOUT_MS,
      );
      text = turn.content;
    } catch (err) {
      throw new ServiceUnavailableException(`Summary LLM failed: ${(err as Error).message}`);
    }
    if (!text.trim()) throw new ServiceUnavailableException("Summary LLM returned empty content");
    return parseSummaryPayload(text);
  }
}

/** 模型不一定守 JSON 约定：解析不出来就整段当备注。 */
export function parseSummaryPayload(raw: string): { title: string; note: string } {
  const fenced = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  const start = fenced.indexOf("{");
  const end = fenced.lastIndexOf("}");
  if (start !== -1 && end > start) {
    try {
      const shell = JSON.parse(fenced.slice(start, end + 1)) as { note?: unknown; title?: unknown };
      const note = typeof shell.note === "string" ? sanitizeNote(shell.note) : "";
      const title = typeof shell.title === "string" ? sanitizeTitle(shell.title) : "";
      if (note || title) return { title, note };
    } catch {
      // 落到下面：整段当备注
    }
  }
  return { title: "", note: sanitizeNote(fenced) };
}

function sanitizeNote(raw: string): string {
  return stripDecorations(raw).slice(0, TEXT_VERSION_NOTE_MAX_CHARS);
}

function sanitizeTitle(raw: string): string {
  let text = stripDecorations(raw);
  for (let pass = 0; pass < 3; pass++) {
    const next = stripDecorations(text.replace(/[。．.!！?？,，;；:：]+$/u, ""));
    if (next === text) break;
    text = next;
  }
  return text.slice(0, AI_TITLE_MAX_CHARS);
}

function stripDecorations(raw: string): string {
  let text = raw.trim();
  text = text.replace(/^(note|summary|title|备注|摘要|标题)\s*[:：]\s*/i, "");
  text = text.replace(/^["'“”‘’`]+|["'“”‘’`]+$/g, "");
  text = text.replace(/^\*+|\*+$/g, "");
  return text.trim();
}
