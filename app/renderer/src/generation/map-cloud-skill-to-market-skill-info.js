// map-cloud-skill-to-market-skill-info.js
import {
  normalizeSkillDetailMetadata,
  skillMetadataRecord,
} from "./normalize-skill-detail-metadata.js";

const SKILL_GUIDE_PROMPT_DEFAULTS = {
  zh: "为我解释一下这个技能的最佳使用方式。",
  en: "Show me the best way to use this skill with a few examples.",
};

function normalizeToolsByAgent(raw2) {
  if (!raw2 || typeof raw2 !== "object" || Array.isArray(raw2)) return void 0;
  const out = {};
  for (const [agentName, value] of Object.entries(raw2)) {
    if (!Array.isArray(value)) continue;
    const tools = value.filter((v2) => typeof v2 === "string" && v2.length > 0);
    if (tools.length > 0) out[agentName] = tools;
  }
  return Object.keys(out).length > 0 ? out : void 0;
}

function toStringArray(v2) {
  if (Array.isArray(v2))
    return v2.filter((x2) => typeof x2 === "string" && x2 !== "");
  if (typeof v2 === "string" && v2) return [v2];
  return [];
}

function firstString$1(v2) {
  if (Array.isArray(v2)) {
    const first2 = v2.find((x2) => typeof x2 === "string" && x2 !== "");
    return first2 ?? "";
  }
  if (typeof v2 === "string") return v2;
  return "";
}

function reconcileTag(tagRaw, completeRaw) {
  const complete = toStringArray(completeRaw);
  const single = firstString$1(tagRaw) || complete[0] || "";
  if (complete.length > 0) {
    return {
      single,
      list: complete,
    };
  }
  const list2 = toStringArray(tagRaw);
  return {
    single,
    list: list2,
  };
}

function mapCloudSkillToMarketSkillInfo(raw2) {
  const en2 = reconcileTag(
    raw2.tagEn ?? raw2.tag_en ?? raw2["tag-en"],
    raw2.completeTagsEn ?? raw2.complete_tags_en ?? raw2["complete-tags-en"],
  );
  const cn2 = reconcileTag(
    raw2.tagCn ?? raw2.tag_cn ?? raw2["tag-cn"],
    raw2.completeTagsCn ?? raw2.complete_tags_cn ?? raw2["complete-tags-cn"],
  );
  return {
    ...normalizeSkillDetailMetadata(raw2),
    name: raw2.name || "",
    version: raw2.version || "",
    hash: raw2.hash || "",
    summary: raw2.summary || raw2.summary_en || "",
    summaryZh: raw2.summaryZh || raw2.summary_zh || raw2.summary_cn || "",
    description: raw2.description || "",
    tags: raw2.tags || [],
    tagsCn: raw2.tagsCn || raw2.tags_cn || raw2["tags-cn"] || [],
    creator: raw2.creator || "",
    triggerWords: raw2.triggerWords || raw2.trigger_words || [],
    guidePrompt:
      raw2.guidePrompt || raw2.guide_prompt || SKILL_GUIDE_PROMPT_DEFAULTS.zh,
    guidePromptEn:
      raw2.guidePromptEn ||
      raw2.guide_prompt_en ||
      SKILL_GUIDE_PROMPT_DEFAULTS.en,
    displayNameZh: raw2.displayNameZh || raw2.display_name_zh || "",
    tagEn: en2.single,
    tagCn: cn2.single,
    completeTagsEn: en2.list,
    completeTagsCn: cn2.list,
    categoryCodes: toStringArray(raw2.categoryCodes ?? raw2.category_codes),
    descEn: raw2.descEn || raw2.desc_en || raw2["desc-en"] || "",
    descCn: raw2.descCn || raw2.desc_cn || raw2["desc-cn"] || "",
    tools: raw2.tools || [],
    toolsByAgent: normalizeToolsByAgent(
      raw2.toolsByAgent ?? raw2.tools_by_agent ?? raw2["tools-by-agent"],
    ),
    skillType: raw2.skillType || raw2.skill_type || void 0,
    badges: Array.isArray(raw2.badges)
      ? raw2.badges
      : typeof raw2.badges === "string"
        ? JSON.parse(raw2.badges)
        : void 0,
    sortWeight:
      raw2.sortWeight != null
        ? Number(raw2.sortWeight)
        : raw2.sort_weight != null
          ? Number(raw2.sort_weight)
          : void 0,
    downloads: raw2.downloads != null ? Number(raw2.downloads) : void 0,
    coverUrl: raw2.coverUrl || raw2.cover_url || raw2.cover || void 0,
    authorEn: raw2.authorEn || raw2.author_en || raw2["author-en"] || void 0,
    authorCn: raw2.authorCn || raw2.author_cn || raw2["author-cn"] || void 0,
    source: raw2.source || void 0,
  };
}

export function mapCloudSkillDetail(raw2) {
  const record2 = skillMetadataRecord(raw2);
  if (!record2) throw new Error("Invalid skill detail response");
  const skill = skillMetadataRecord(record2.skill);
  return {
    skill:
      skill && typeof skill.name === "string"
        ? mapCloudSkillToMarketSkillInfo(skill)
        : void 0,
    canSubmitToCommunity:
      (record2.canSubmitToCommunity ?? record2.can_submit_to_community) ===
      true,
  };
}
