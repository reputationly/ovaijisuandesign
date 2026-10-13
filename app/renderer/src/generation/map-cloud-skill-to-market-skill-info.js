// map-cloud-skill-to-market-skill-info.js
import {
  normalizeSkillDetailMetadata,
  skillMetadataRecord,
} from "./normalize-skill-detail-metadata.js";
const SKILL_GUIDE_PROMPT_DEFAULTS = {
  zh: "为我解释一下这个技能的最佳使用方式。",
  en: "Show me the best way to use this skill with a few examples.",
};
function normalizeToolsByAgent(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return void 0;
  const out = {};
  for (const [agentName, value] of Object.entries(raw)) {
    if (!Array.isArray(value)) continue;
    const tools = value.filter((toolName) => typeof toolName === "string" && toolName.length > 0);
    if (tools.length > 0) out[agentName] = tools;
  }
  return Object.keys(out).length > 0 ? out : void 0;
}
function toStringArray(value) {
  if (Array.isArray(value))
    return value.filter((item) => typeof item === "string" && item !== "");
  if (typeof value === "string" && value) return [value];
  return [];
}
function firstString(value) {
  if (Array.isArray(value)) {
    const first = value.find((item) => typeof item === "string" && item !== "");
    return first ?? "";
  }
  if (typeof value === "string") return value;
  return "";
}
function reconcileTag(tagRaw, completeRaw) {
  const complete = toStringArray(completeRaw);
  const single = firstString(tagRaw) || complete[0] || "";
  if (complete.length > 0) {
    return {
      single,
      list: complete,
    };
  }
  const list = toStringArray(tagRaw);
  return {
    single,
    list,
  };
}
function mapCloudSkillToMarketSkillInfo(raw) {
  const englishTagData = reconcileTag(
    raw.tagEn ?? raw.tag_en ?? raw["tag-en"],
    raw.completeTagsEn ?? raw.complete_tags_en ?? raw["complete-tags-en"],
  );
  const chineseTagData = reconcileTag(
    raw.tagCn ?? raw.tag_cn ?? raw["tag-cn"],
    raw.completeTagsCn ?? raw.complete_tags_cn ?? raw["complete-tags-cn"],
  );
  return {
    ...normalizeSkillDetailMetadata(raw),
    name: raw.name || "",
    version: raw.version || "",
    hash: raw.hash || "",
    summary: raw.summary || raw.summary_en || "",
    summaryZh: raw.summaryZh || raw.summary_zh || raw.summary_cn || "",
    description: raw.description || "",
    tags: raw.tags || [],
    tagsCn: raw.tagsCn || raw.tags_cn || raw["tags-cn"] || [],
    creator: raw.creator || "",
    triggerWords: raw.triggerWords || raw.trigger_words || [],
    guidePrompt:
      raw.guidePrompt || raw.guide_prompt || SKILL_GUIDE_PROMPT_DEFAULTS.zh,
    guidePromptEn:
      raw.guidePromptEn ||
      raw.guide_prompt_en ||
      SKILL_GUIDE_PROMPT_DEFAULTS.en,
    displayNameZh: raw.displayNameZh || raw.display_name_zh || "",
    tagEn: englishTagData.single,
    tagCn: chineseTagData.single,
    completeTagsEn: englishTagData.list,
    completeTagsCn: chineseTagData.list,
    categoryCodes: toStringArray(raw.categoryCodes ?? raw.category_codes),
    descEn: raw.descEn || raw.desc_en || raw["desc-en"] || "",
    descCn: raw.descCn || raw.desc_cn || raw["desc-cn"] || "",
    tools: raw.tools || [],
    toolsByAgent: normalizeToolsByAgent(
      raw.toolsByAgent ?? raw.tools_by_agent ?? raw["tools-by-agent"],
    ),
    skillType: raw.skillType || raw.skill_type || void 0,
    badges: Array.isArray(raw.badges)
      ? raw.badges
      : typeof raw.badges === "string"
        ? JSON.parse(raw.badges)
        : void 0,
    sortWeight:
      raw.sortWeight != null
        ? Number(raw.sortWeight)
        : raw.sort_weight != null
          ? Number(raw.sort_weight)
          : void 0,
    downloads: raw.downloads != null ? Number(raw.downloads) : void 0,
    coverUrl: raw.coverUrl || raw.cover_url || raw.cover || void 0,
    authorEn: raw.authorEn || raw.author_en || raw["author-en"] || void 0,
    authorCn: raw.authorCn || raw.author_cn || raw["author-cn"] || void 0,
    source: raw.source || void 0,
  };
}
export function mapCloudSkillDetail(raw) {
  const record = skillMetadataRecord(raw);
  if (!record) throw new Error("Invalid skill detail response");
  const skill = skillMetadataRecord(record.skill);
  return {
    skill:
      skill && typeof skill.name === "string"
        ? mapCloudSkillToMarketSkillInfo(skill)
        : void 0,
    canSubmitToCommunity:
      (record.canSubmitToCommunity ?? record.can_submit_to_community) ===
      true,
  };
}
