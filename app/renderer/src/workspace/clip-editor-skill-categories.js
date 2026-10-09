// clip-editor-skill-categories.js
import { getSkillPopoverBrowseSkills } from "./get-skill-popover-browse-skills.js";
import {
  DIRECTOR_STAGE_SKILL_CATEGORIES,
  TEXT_EDITOR_SKILL_CATEGORIES,
} from "./text-editor-skill-categories.jsx";

const CLIP_EDITOR_SKILL_CATEGORIES = [
  {
    value: "clip-editing",
    label: "剪辑",
    labelEn: "Editing",
    skills: [
      "音乐卡点",
      "剪映导出",
      "字幕修正",
      "视频转录",
      "视频拆解分析师",
      "AlphaMOV",
      "品牌字效迁移编辑器",
    ],
  },
  {
    value: "shot-design",
    label: "分镜",
    labelEn: "Storyboard",
    skills: [
      "分镜板生成",
      "影视镜头与角色卡",
      "电影场景生成",
      "电影运动语言",
      "坐标运镜分镜设计师",
      "线控轨迹运镜设计",
    ],
  },
  {
    value: "video-workflow",
    label: "成片",
    labelEn: "Production",
    skills: [
      "故事转视频",
      "纪录片",
      "宣传视频",
      "UGC 广告",
      "MV创作",
      "格莱美说唱MV速成",
      "球鞋广告",
      "GTA视频",
      "国风短剧成片生成器",
      "MG 口播动画生成器",
      "动物播客",
      "AI推广视频",
    ],
  },
  {
    value: "audio-post",
    label: "音频",
    labelEn: "Audio",
    skills: [
      "影视配乐",
      "配音导演",
      "声音设计",
      "音色克隆",
      "播客工作室",
      "播客套件",
    ],
  },
];

function normalizeSkillName(value) {
  return value.replace(/[\s\-_]/g, "").toLocaleLowerCase();
}

function matchesClipEditorSkill(skill, allowedNames) {
  const names = [skill.displayNameZh, skill.name].map(normalizeSkillName);
  return allowedNames.some((name2) =>
    names.includes(normalizeSkillName(name2)),
  );
}

function getSkillSearchText(skill) {
  return [
    skill.displayNameZh,
    skill.name,
    skill.summaryZh,
    skill.summary,
    skill.tagCn,
    skill.tagEn,
    ...(skill.completeTagsCn ?? []),
    ...(skill.completeTagsEn ?? []),
    ...(skill.tags ?? []),
    ...(skill.tagsCn ?? []),
    ...(skill.triggerWords ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase();
}

function matchesKeywordSkill(skill, keywords2) {
  const text2 = getSkillSearchText(skill);
  return keywords2.some((keyword2) => {
    const normalizedKeyword = keyword2.toLocaleLowerCase();
    if (/^[a-z]+$/i.test(normalizedKeyword)) {
      return new RegExp(`\\b${normalizedKeyword}\\b`, "i").test(text2);
    }
    return text2.includes(normalizedKeyword);
  });
}

function matchesCuratedAgentSkill(skill, category) {
  if (
    category.names.some(
      (name2) => normalizeSkillName(name2) === normalizeSkillName(skill.name),
    )
  ) {
    return true;
  }
  return matchesKeywordSkill(skill, category.keywords);
}

export function getAgentSkillBrowseSkills(
  marketSkills,
  localSkills,
  mode2,
  activeCategory,
) {
  const marketBrowseSkills = getSkillPopoverBrowseSkills(
    marketSkills,
    localSkills,
    null,
  );
  const merged = [
    ...marketBrowseSkills,
    ...localSkills.filter(
      (localSkill) =>
        !marketBrowseSkills.some((skill) => skill.name === localSkill.name),
    ),
  ];
  if (mode2 === "clip-editor") {
    const category2 = activeCategory
      ? CLIP_EDITOR_SKILL_CATEGORIES.find(
          (item) => item.value === activeCategory,
        )
      : null;
    const allowedNames = category2
      ? category2.skills
      : CLIP_EDITOR_SKILL_CATEGORIES.flatMap((item) => item.skills);
    return merged.filter((skill) =>
      matchesClipEditorSkill(skill, allowedNames),
    );
  }
  const categories =
    mode2 === "director-stage"
      ? DIRECTOR_STAGE_SKILL_CATEGORIES
      : TEXT_EDITOR_SKILL_CATEGORIES;
  const category = activeCategory
    ? categories.find((item) => item.value === activeCategory)
    : null;
  const selectedCategories = category ? [category] : categories;
  if (mode2 === "director-stage" || mode2 === "text-editor") {
    return merged.filter((skill) =>
      selectedCategories.some((item) =>
        item.names.some(
          (name2) =>
            normalizeSkillName(name2) === normalizeSkillName(skill.name),
        ),
      ),
    );
  }
  return merged.filter((skill) =>
    selectedCategories.some((item) => matchesCuratedAgentSkill(skill, item)),
  );
}
