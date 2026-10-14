// build-decorations.js
import { Decoration, DecorationSet } from "prosemirror-view";
import { PluginKey } from "prosemirror-state";
export const findPluginKey = new PluginKey("canvasFindHighlight");
const FIND_MATCH_CLASS = "canvas-find-match";
export const FIND_MATCH_ACTIVE_CLASS = "canvas-find-match-active";
const MAX_FIND_DECORATIONS = 2e3;
export function buildDecorations(doc, meta) {
  if (meta.ranges.length === 0) return DecorationSet.empty;
  const decorations = [];
  const push = ({ from, to }, active) => {
    if (from >= to || to > doc.content.size) return;
    decorations.push(
      Decoration.inline(from, to, {
        class: active
          ? `${FIND_MATCH_CLASS} ${FIND_MATCH_ACTIVE_CLASS}`
          : FIND_MATCH_CLASS,
      }),
    );
  };
  const count = Math.min(meta.ranges.length, MAX_FIND_DECORATIONS);
  for (let i = 0; i < count; i++) {
    push(meta.ranges[i], i === meta.activeIndex);
  }
  if (meta.activeIndex >= count && meta.activeIndex < meta.ranges.length) {
    push(meta.ranges[meta.activeIndex], true);
  }
  return DecorationSet.create(doc, decorations);
}
export async function hashDiffReviewMarkdown(markdown) {
  if (!globalThis.crypto?.subtle) return null;
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(markdown),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
export function reconstructDiffReviewBaseline(postApplyMarkdown, session) {
  if (session.hunks.every((hunk) => hunk.status === "undone"))
    return postApplyMarkdown;
  if (session.hunks.some((hunk) => hunk.status === "undone")) return null;
  let markdown = postApplyMarkdown;
  const hunks = session.hunks
    .map((hunk, index) => ({
      hunk,
      index,
    }))
    .sort(
      (a, b) => b.hunk.newStart - a.hunk.newStart || b.index - a.index,
    )
    .map(({ hunk }) => hunk);
  for (const hunk of hunks) {
    if (markdown.slice(hunk.newStart, hunk.newEnd) !== hunk.replacement)
      return null;
    markdown = `${markdown.slice(0, hunk.newStart)}${hunk.originalText}${markdown.slice(hunk.newEnd)}`;
  }
  return markdown;
}
export const DIFF_REVIEW_WRITE_ACK_TTL_MS = 15e3;
export const MAX_PENDING_DIFF_REVIEW_WRITE_ACKS = 32;
export function beginDiffReviewWriteAckEpoch(tracker, epoch) {
  if (tracker.epoch === epoch) return;
  tracker.epoch = epoch;
  tracker.pending = [];
}
export function pruneExpiredDiffReviewWriteAcks(tracker, now) {
  if (tracker.pending.length === 0) return;
  tracker.pending = tracker.pending.filter((entry) => entry.expiresAt > now);
}
