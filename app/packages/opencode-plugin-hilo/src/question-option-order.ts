/**
 * question 工具：标了"（推荐）/ (recommended)"的选项挪到最前面，其余保持原顺序。
 * 界面默认高亮第一项，模型却常把推荐项写在中间。
 */
const RECOMMENDED_SUFFIX = /(?:（推荐）|\((?:推荐|recommended)\))\s*$/iu;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isRecommendedOption(value: unknown): boolean {
  return isRecord(value) && typeof value.label === "string" && RECOMMENDED_SUFFIX.test(value.label);
}

export function putRecommendedQuestionOptionsFirst(args: unknown): void {
  if (!isRecord(args) || !Array.isArray(args.questions)) return;
  for (const rawQuestion of args.questions) {
    if (!isRecord(rawQuestion) || !Array.isArray(rawQuestion.options)) continue;
    const recommended = rawQuestion.options.filter(isRecommendedOption);
    if (recommended.length === 0) continue;
    rawQuestion.options = [...recommended, ...rawQuestion.options.filter((option) => !isRecommendedOption(option))];
  }
}

/**
 * 追加到 question 工具描述末尾的格式提醒。模型常把 questions 数组 JSON.stringify 成字符串传进来，
 * 工具校验直接失败、白白浪费一轮。只改提示，不改参数 schema。
 */
export const QUESTION_FORMAT_HINT = `

---

## CRITICAL: \`questions\` parameter must be a JSON array, not a stringified JSON

The \`questions\` parameter MUST be a real JSON array of objects.
DO NOT JSON.stringify the array before passing it.

CORRECT (use this):
{"questions": [{"question": "...", "header": "...", "options": [{"label": "...", "description": "..."}]}]}

WRONG (will fail validation and waste your turn):
{"questions": "[{\\"question\\": \\"...\\"}]"}

If you are about to write \`"questions": "[\`, STOP — write \`"questions": [\` (no opening quote).`;
