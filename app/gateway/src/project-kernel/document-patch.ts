const MAX_BYTES = 2 * 1024 * 1024;
const MAX_EDITS = 100;
const MAX_EXACT = 100_000;
const LINE_CAP = 240;
const HINT_CANDIDATES = 3;
const HINT_AMBIGUOUS = 5;

export type DocumentEdit = { exact: string; occurrence?: number; replacement: string };
type Resolved = DocumentEdit & { annotationId: string; from: number; to: number };
type Conflict = { editIndex: number; reason: string; nearest?: { line: number; occurrence?: number; sourceExact?: string; snippet: string }[] };

export function applyDocumentPatch(content: string, edits: DocumentEdit[]): { ok: true; content: string } | { ok: false; conflicts: Conflict[] } {
  const anchored = edits.map((edit, index) => ({ annotationId: String(index), exact: edit.exact, ...(edit.occurrence === undefined ? {} : { occurrence: edit.occurrence }), replacement: edit.replacement }));
  const applied = applyAnchored(content, anchored);
  if (applied.ok) return { ok: true, content: applied.content };
  return { ok: false, conflicts: hints(content, anchored, applied.results).filter((result) => result.status === "conflict").map((result) => ({
    editIndex: Number(result.annotationId),
    reason: result.reason ?? "not_found",
    ...(result.nearest ? { nearest: result.nearest } : {}),
  })) };
}

type EditResult = { annotationId: string; status: "applied" | "conflict"; reason?: string; nearest?: Conflict["nearest"] };

function applyAnchored(content: string, edits: { annotationId: string; exact: string; occurrence?: number; replacement: string }[]): { ok: true; content: string } | { ok: false; results: EditResult[] } {
  const resolved: Resolved[] = [];
  const results: EditResult[] = [];
  for (const edit of edits) {
    const match = resolve(content, edit);
    if (typeof match === "string") {
      results.push({ annotationId: edit.annotationId, status: "conflict", reason: match });
      continue;
    }
    resolved.push(match);
    results.push({ annotationId: edit.annotationId, status: "applied" });
  }
  const ordered = [...resolved].sort((left, right) => left.from - right.from || left.to - right.to);
  let active = ordered[0];
  for (let index = 1; index < ordered.length; index += 1) {
    const current = ordered[index];
    if (active && current && active.to > current.from) {
      for (const edit of [active, current]) {
        const result = results.find((item) => item.annotationId === edit.annotationId);
        if (result) {
          result.status = "conflict";
          result.reason = "overlap";
        }
      }
    }
    if (active && current && current.to > active.to) active = current;
  }
  if (results.some((result) => result.status === "conflict")) return { ok: false, results };
  const parts: string[] = [];
  let cursor = 0;
  for (const edit of ordered) {
    parts.push(content.slice(cursor, edit.from), edit.replacement);
    cursor = edit.to;
  }
  parts.push(content.slice(cursor));
  return { ok: true, content: parts.join("") };
}

function resolve(content: string, edit: { annotationId: string; exact: string; occurrence?: number; replacement: string }): Resolved | string {
  let cursor = 0;
  const positions: number[] = [];
  while (cursor <= content.length - edit.exact.length) {
    const index = content.indexOf(edit.exact, cursor);
    if (index < 0) break;
    cursor = index + 1;
    positions.push(index);
    if (edit.occurrence === undefined && positions.length > 1) break;
    if (edit.occurrence !== undefined && positions.length > edit.occurrence + 1) break;
  }
  if (!positions.length) return "not_found";
  const from = select(positions, edit.occurrence);
  if (from === "not_found" || from === "ambiguous") return from;
  return { ...edit, from, to: from + edit.exact.length };
}

function select(positions: number[], occurrence: number | undefined): number | "not_found" | "ambiguous" {
  if (occurrence === undefined) return positions.length > 1 ? "ambiguous" : positions[0] ?? "not_found";
  const at = positions[occurrence];
  if (at !== undefined) return at;
  if (positions.length === 1) return positions[0] ?? "not_found";
  return "not_found";
}

function hints(content: string, edits: { annotationId: string; exact: string }[], results: EditResult[]): EditResult[] {
  return results.map((result) => {
    if (result.status !== "conflict" || (result.reason !== "not_found" && result.reason !== "ambiguous")) return result;
    const edit = edits.find((candidate) => candidate.annotationId === result.annotationId);
    if (!edit?.exact) return result;
    const nearest: NonNullable<Conflict["nearest"]> = [];
    if (result.reason === "ambiguous") {
      occurrences(content, edit.exact, HINT_AMBIGUOUS).forEach((offset, index) => {
        nearest.push({ line: lineOf(content, offset), occurrence: index, sourceExact: edit.exact, snippet: snippet(content, offset) });
      });
    } else {
      const trimmed = edit.exact.trim();
      if (trimmed && trimmed !== edit.exact) {
        for (const offset of occurrences(content, trimmed, 1)) nearest.push({ line: lineOf(content, offset), occurrence: countBefore(content, trimmed, offset), sourceExact: trimmed, snippet: snippet(content, offset) });
      }
      if (!nearest.length && edit.exact.length > 24) {
        for (const probe of [edit.exact.slice(0, 20), edit.exact.slice(-20)]) {
          const needle = probe.trim();
          if (!needle) continue;
          for (const offset of occurrences(content, needle, 1)) {
            nearest.push({ line: lineOf(content, offset), snippet: snippet(content, offset) });
            if (nearest.length >= HINT_CANDIDATES) break;
          }
          if (nearest.length >= HINT_CANDIDATES) break;
        }
      }
    }
    return nearest.length ? { ...result, nearest: nearest.slice(0, HINT_CANDIDATES + 2) } : result;
  });
}

function occurrences(content: string, needle: string, max: number): number[] {
  const found: number[] = [];
  let cursor = 0;
  while (found.length < max) {
    const index = content.indexOf(needle, cursor);
    if (index < 0) break;
    found.push(index);
    cursor = index + 1;
  }
  return found;
}

function countBefore(content: string, needle: string, before: number): number {
  let count = 0;
  let cursor = 0;
  while (cursor < before) {
    const index = content.indexOf(needle, cursor);
    if (index < 0 || index >= before) break;
    count += 1;
    cursor = index + 1;
  }
  return count;
}

function lineOf(content: string, offset: number): number {
  let line = 1;
  const end = Math.min(offset, content.length);
  for (let index = 0; index < end; index += 1) if (content.charCodeAt(index) === 10) line += 1;
  return line;
}

function snippet(content: string, offset: number): string {
  const lines = content.split("\n");
  const line = lineOf(content, offset);
  const from = Math.max(0, line - 2);
  const to = Math.min(lines.length, line + 1);
  return lines.slice(from, to).map((item, index) => `${from + index + 1}: ${item.length > LINE_CAP ? `${item.slice(0, LINE_CAP)}…` : item}`).join("\n");
}

export const DOCUMENT_LIMITS = { maxBytes: MAX_BYTES, maxEdits: MAX_EDITS, maxExact: MAX_EXACT };
