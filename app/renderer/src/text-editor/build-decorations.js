// build-decorations.js
import { Decoration$1, DecorationSet, PluginKey } from "../vendor.js";

export const findPluginKey = new PluginKey("canvasFindHighlight");

const FIND_MATCH_CLASS = "canvas-find-match";

export const FIND_MATCH_ACTIVE_CLASS = "canvas-find-match-active";

const MAX_FIND_DECORATIONS = 2e3;

export function buildDecorations$1(doc2, meta2) {
  if (meta2.ranges.length === 0) return DecorationSet.empty;
  const decorations2 = [];
  const push2 = ({ from: from2, to }, active2) => {
    if (from2 >= to || to > doc2.content.size) return;
    decorations2.push(
      Decoration$1.inline(from2, to, {
        class: active2
          ? `${FIND_MATCH_CLASS} ${FIND_MATCH_ACTIVE_CLASS}`
          : FIND_MATCH_CLASS,
      }),
    );
  };
  const count2 = Math.min(meta2.ranges.length, MAX_FIND_DECORATIONS);
  for (let i2 = 0; i2 < count2; i2++) {
    push2(meta2.ranges[i2], i2 === meta2.activeIndex);
  }
  if (meta2.activeIndex >= count2 && meta2.activeIndex < meta2.ranges.length) {
    push2(meta2.ranges[meta2.activeIndex], true);
  }
  return DecorationSet.create(doc2, decorations2);
}

export async function hashDiffReviewMarkdown(markdown2) {
  if (!globalThis.crypto?.subtle) return null;
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(markdown2),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export function reconstructDiffReviewBaseline(postApplyMarkdown, session) {
  if (session.hunks.every((hunk) => hunk.status === "undone"))
    return postApplyMarkdown;
  if (session.hunks.some((hunk) => hunk.status === "undone")) return null;
  let markdown2 = postApplyMarkdown;
  const hunks = session.hunks
    .map((hunk, index2) => ({
      hunk,
      index: index2,
    }))
    .sort(
      (a2, b3) => b3.hunk.newStart - a2.hunk.newStart || b3.index - a2.index,
    )
    .map(({ hunk }) => hunk);
  for (const hunk of hunks) {
    if (markdown2.slice(hunk.newStart, hunk.newEnd) !== hunk.replacement)
      return null;
    markdown2 = `${markdown2.slice(0, hunk.newStart)}${hunk.originalText}${markdown2.slice(hunk.newEnd)}`;
  }
  return markdown2;
}

export const DIFF_REVIEW_WRITE_ACK_TTL_MS = 15e3;

export const MAX_PENDING_DIFF_REVIEW_WRITE_ACKS = 32;

export function beginDiffReviewWriteAckEpoch(tracker2, epoch) {
  if (tracker2.epoch === epoch) return;
  tracker2.epoch = epoch;
  tracker2.pending = [];
}

export function pruneExpiredDiffReviewWriteAcks(tracker2, now2) {
  if (tracker2.pending.length === 0) return;
  tracker2.pending = tracker2.pending.filter((entry) => entry.expiresAt > now2);
}
