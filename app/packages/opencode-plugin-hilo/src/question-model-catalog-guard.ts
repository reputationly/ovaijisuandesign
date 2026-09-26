import type { MediaModelInfo } from "./media-models-cache.js";

/**
 * question 工具让用户"选一个模型"时，选项必须是当前目录里真实可用的模型。
 *
 * 技能、知识库是离线写的，里面推荐的模型名常常过时，或者是厂商系列名（目录里平台模型挂在
 * 厂商别名下，模型读到的多是别名）。用户点了一个不存在的模型，下一步生成必然失败。
 * 这里在 question 发出去之前拦下，把当前目录的 display_name 列表回给模型让它重问。
 *
 * 识别"选模型的问题"靠 header / question 里的关键词；明确的"自动 / 通用"非模型选项放行。
 *
 * 选项和目录的匹配只认目录本身的 id / display_name / series_id（大小写、空白、`._-` 不敏感）。
 * 目录里的 backend / model_name 是厂商别名，故意不认：那些名字不该出现在给用户看的选项里。
 */
export type ModelSelectionCategory = "image" | "video" | "audio" | "all";

interface QuestionLike {
  header?: unknown;
  question?: unknown;
  options?: unknown;
}

function parseQuestions(args: unknown): QuestionLike[] {
  let questions = (args as { questions?: unknown } | null | undefined)?.questions;
  // 模型有时把数组序列化成字符串传进来：照样解析出来检查。
  if (typeof questions === "string") {
    try {
      questions = JSON.parse(questions);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(questions)) return [];
  return questions.filter((q): q is QuestionLike => q !== null && typeof q === "object" && !Array.isArray(q));
}

function selectionCategory(question: QuestionLike): ModelSelectionCategory | undefined {
  const text = [question.header, question.question]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLocaleLowerCase();
  if (!/(?:模型|\bmodels?\b)/iu.test(text)) return undefined;
  if (
    !/(?:目标模型|模型选择|选择.*模型|(?:哪个|哪种|什么).*模型|模型.*(?:选择|使用)|target\s+model|model\s+selection|(?:choose|select|which|what).*\bmodels?\b|\bmodels?\b.*(?:choose|select|use))/iu.test(
      text,
    )
  ) {
    return undefined;
  }
  if (/(?:视频|\bvideos?\b)/iu.test(text)) return "video";
  if (/(?:图像|图片|生图|\bimages?\b)/iu.test(text)) return "image";
  if (/(?:音频|声音|语音|音乐|\baudios?\b|\bspeech\b|\bmusic\b)/iu.test(text)) return "audio";
  return "all";
}

/** 有没有"选模型"的问题；有才值得去取目录。 */
export function questionModelSelectionCategory(args: unknown): ModelSelectionCategory | undefined {
  for (const question of parseQuestions(args)) {
    const category = selectionCategory(question);
    if (category) return category;
  }
  return undefined;
}

function stripRecommendationSuffix(label: string): string {
  return label.replace(/\s*[（(](?:推荐|recommended)[）)]\s*$/iu, "").trim();
}

function isGenericNonModelChoice(label: string): boolean {
  const normalized = stripRecommendationSuffix(label);
  return /^(?:通用(?:模型|版本)?|自动(?:选择)?|不限模型|任意模型|由(?:agent|智能助手|系统).*(?:选择|决定)|general(?:\s+(?:model|version))?|auto(?:matic)?|any\s+model)$/iu.test(
    normalized,
  );
}

function visibleModels(models: readonly MediaModelInfo[], category: ModelSelectionCategory): MediaModelInfo[] {
  return models.filter(
    (model) => model.visibility !== "hidden" && (category === "all" || model.type === category) && model.display_name.trim().length > 0,
  );
}

function normalizedModelLabel(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase().replace(/[\s._-]+/g, "");
}

function matchingLiveModels(label: string, liveModels: readonly MediaModelInfo[]): MediaModelInfo[] {
  const normalizedLabel = normalizedModelLabel(label);
  const matches = new Map<string, MediaModelInfo>();
  for (const model of liveModels) {
    const aliases = [model.id, model.display_name, model.series_id].filter((value) => Boolean(value));
    if (aliases.some((alias) => normalizedModelLabel(alias) === normalizedLabel)) matches.set(model.id, model);
  }
  return [...matches.values()];
}

/**
 * 选项里有目录外的模型、或一个名字对上了多个模型，就抛错（错误文本回给模型）。
 * 目录为空（gateway 不可用、还没配模型）时放行：不能因为取不到目录把问题整个拦死。
 */
export function assertQuestionModelOptionsMatchCatalog(args: unknown, models: readonly MediaModelInfo[]): void {
  for (const question of parseQuestions(args)) {
    const category = selectionCategory(question);
    if (!category || !Array.isArray(question.options)) continue;
    const liveModels = visibleModels(models, category);
    const displayNames = Array.from(new Set(liveModels.map((model) => model.display_name.trim())));
    if (displayNames.length === 0) continue;
    const exactDisplayNames = new Set(displayNames);
    const unavailableLabels: string[] = [];
    const ambiguousLabels: { label: string; matches: string[] }[] = [];
    for (const rawOption of question.options) {
      const option = rawOption as { label?: unknown } | null;
      if (typeof option?.label !== "string") continue;
      const label = stripRecommendationSuffix(option.label);
      if (isGenericNonModelChoice(option.label) || exactDisplayNames.has(label)) continue;
      const matches = matchingLiveModels(label, liveModels);
      if (matches.length === 0) {
        unavailableLabels.push(option.label);
      } else if (matches.length > 1) {
        ambiguousLabels.push({ label: option.label, matches: Array.from(new Set(matches.map((model) => model.display_name.trim()))) });
      }
    }
    if (unavailableLabels.length === 0 && ambiguousLabels.length === 0) continue;
    const categoryLabel = category === "all" ? "media" : category;
    const issueDetails = [
      unavailableLabels.length > 0 ? `Unavailable model options: ${unavailableLabels.join(", ")}.` : "",
      ambiguousLabels.length > 0
        ? `Ambiguous model options: ${ambiguousLabels.map(({ label, matches }) => `${label} (matches ${matches.join(", ")})`).join("; ")}.`
        : "",
    ]
      .filter(Boolean)
      .join(" ");
    throw new Error(
      `The question asks the user to choose a ${categoryLabel} model, but some options cannot be shown. ${issueDetails} Retry the question tool with the current catalog. Use a concrete exact display_name from: ${displayNames.join(", ")}. Remove unavailable models and replace ambiguous family names with a concrete current model. A clearly labeled generic/Auto non-model choice is allowed.`,
    );
  }
}
