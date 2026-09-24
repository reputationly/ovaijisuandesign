/** 给 question 工具描述追加的格式提醒：模型常把 questions 序列化成字符串传进来，工具直接校验失败。 */
export const QUESTION_FORMAT_HINT =
  "\n\nIMPORTANT: `questions` must be a real JSON array of question objects — never a JSON-encoded string.";

const RECOMMENDED = /[（(](推荐|recommended)[)）]\s*$/i;

/** 标了"（推荐）"的选项挪到最前面，其余保持原顺序。 */
export function orderOptions(args: { questions?: { options?: { label?: string }[] }[] }): void {
  for (const q of args.questions ?? []) {
    if (!Array.isArray(q.options)) continue;
    const rec = q.options.filter((o) => RECOMMENDED.test(o.label ?? ""));
    if (!rec.length) continue;
    q.options = [...rec, ...q.options.filter((o) => !RECOMMENDED.test(o.label ?? ""))];
  }
}
