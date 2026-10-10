// 首页展示区的配置解析与默认值：只做校验和归一化，不依赖 React。
import { HOME_QUICK_START_MAX_SECTIONS } from "../workspace/parse-localized-text.js";
import { parseProjectArchiveSection } from "../workspace/parse-project-archive-item.js";
export const HOME_PROJECT_SHOWCASE_SCHEMA_VERSION = 1;
export const EMPTY_HOME_PROJECT_SHOWCASE_CONFIG = {
  schemaVersion: HOME_PROJECT_SHOWCASE_SCHEMA_VERSION,
  enabled: true,
  categories: []
};
function parseSections(rawSections) {
  const seen = new Set();
  const categories = [];
  for (const section of rawSections.slice(0, HOME_QUICK_START_MAX_SECTIONS)) {
    if (!isRecord(section)) continue;
    const parsed = parseProjectArchiveSection(section);
    if (!parsed || seen.has(parsed.id)) continue;
    seen.add(parsed.id);
    categories.push(parsed);
  }
  return categories;
}
export function parseHomeProjectShowcaseConfig(raw) {
  const value = unwrapApolloValue(raw);
  if (!isRecord(value)) return null;
  if (value.type === "project-archive") {
    const categories = parseSections([value]);
    if (categories.length === 0) return null;
    return {
      schemaVersion: HOME_PROJECT_SHOWCASE_SCHEMA_VERSION,
      enabled: true,
      defaultSectionId: categories[0]?.id,
      categories: categories
    };
  }
  if (value.schema_version !== HOME_PROJECT_SHOWCASE_SCHEMA_VERSION) return null;
  if (typeof value.enabled !== "boolean" || !Array.isArray(value.sections)) return null;
  if (!value.enabled) {
    return {
      schemaVersion: HOME_PROJECT_SHOWCASE_SCHEMA_VERSION,
      enabled: false,
      categories: []
    };
  }
  const categories = parseSections(value.sections);
  const configuredDefault = nonEmptyString(value.default_section_id);
  const defaultSectionId = categories.some(category => category.id === configuredDefault) ? configuredDefault : categories[0]?.id;
  return {
    schemaVersion: HOME_PROJECT_SHOWCASE_SCHEMA_VERSION,
    enabled: true,
    ...(defaultSectionId ? {
      defaultSectionId
    } : {}),
    categories
  };
}
export const HOME_SKILL_SHOWCASE_CONFIG_KEY = "home_skill_showcase_config";
export const HOME_SKILL_SHOWCASE_SCHEMA_VERSION = 1;
const HOME_SKILL_SHOWCASE_MAX_CATEGORIES = 24;
export const DEFAULT_HOME_SKILL_SHOWCASE_CONFIG = {
  schemaVersion: HOME_SKILL_SHOWCASE_SCHEMA_VERSION,
  enabled: true,
  defaultSecondaryId: "all",
  categories: [{
    id: "all",
    label: "全部",
    labelEn: "All",
    query: {
      source: "official-featured"
    }
  }]
};
function parseCategory(value) {
  if (!isRecord(value) || !isRecord(value.title) || !isRecord(value.query)) return void 0;
  const id = configId(value.id);
  const label = nonEmptyString(value.title.zh) ?? nonEmptyString(value.title.en);
  const labelEn = nonEmptyString(value.title.en) ?? nonEmptyString(value.title.zh);
  const source = configId(value.query.source);
  const tag = nonEmptyString(value.query.tag);
  if (!id || !label || !labelEn || !source) return void 0;
  return {
    id,
    label,
    labelEn,
    query: {
      source,
      ...(tag ? {
        tag
      } : {})
    }
  };
}
export function parseHomeSkillShowcaseConfig(raw) {
  const value = unwrapApolloValue(raw);
  if (!isRecord(value)) return null;
  if (value.schema_version !== HOME_SKILL_SHOWCASE_SCHEMA_VERSION) return null;
  if (typeof value.enabled !== "boolean" || !Array.isArray(value.secondary_categories)) return null;
  if (!value.enabled) {
    return {
      schemaVersion: HOME_SKILL_SHOWCASE_SCHEMA_VERSION,
      enabled: false,
      categories: []
    };
  }
  const seen = new Set();
  const categories = [];
  for (const candidate of value.secondary_categories.slice(0, HOME_SKILL_SHOWCASE_MAX_CATEGORIES)) {
    const parsed = parseCategory(candidate);
    if (!parsed || seen.has(parsed.id)) continue;
    seen.add(parsed.id);
    categories.push(parsed);
  }
  if (categories.length === 0) return null;
  const configuredDefault = configId(value.default_secondary_id);
  const defaultSecondaryId = categories.some(category => category.id === configuredDefault) ? configuredDefault : categories[0]?.id;
  return {
    schemaVersion: HOME_SKILL_SHOWCASE_SCHEMA_VERSION,
    enabled: true,
    ...(defaultSecondaryId ? {
      defaultSecondaryId
    } : {}),
    categories
  };
}
export const HOME_TABS_SHOWCASE_CONFIG_KEY = "home_tabs_showcase_config";
export const HOME_PROJECT_SHOWCASE_CONFIG_KEY = "home_project_showcase_config";
export const HOME_TABS_SHOWCASE_SCHEMA_VERSION = 1;
const HOME_TABS_SHOWCASE_MAX_PRIMARY_CATEGORIES = 12;
const HOME_TABS_SHOWCASE_MAX_SECONDARY_CATEGORIES = 24;
const CONFIG_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/;
const HOME_QUICK_START_V2_CONFIG_KEY = "home_quick_start_config_v2";
export const DEFAULT_HOME_TABS_SHOWCASE_CONFIG = {
  schemaVersion: HOME_TABS_SHOWCASE_SCHEMA_VERSION,
  enabled: true,
  defaultPrimaryId: "inspiration",
  primaryCategories: [{
    id: "inspiration",
    label: "创作灵感",
    labelEn: "Inspiration",
    provider: {
      type: "quick-start-v2",
      configKey: HOME_QUICK_START_V2_CONFIG_KEY
    }
  }, {
    id: "skill",
    label: "Skill",
    labelEn: "Skill",
    defaultSecondaryId: "all",
    provider: {
      type: "skill-market",
      configKey: HOME_SKILL_SHOWCASE_CONFIG_KEY,
      source: "official-featured",
      secondaryCategories: [{
        id: "all",
        label: "全部",
        labelEn: "All"
      }]
    }
  }, {
    id: "projects",
    label: "精选项目",
    labelEn: "Featured Projects",
    provider: {
      type: "project-showcase",
      configKey: HOME_PROJECT_SHOWCASE_CONFIG_KEY
    }
  }]
};
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function nonEmptyString(value) {
  if (typeof value !== "string") return void 0;
  const normalized = value.trim();
  return normalized || void 0;
}
function configId(value) {
  const normalized = nonEmptyString(value)?.toLowerCase();
  return normalized && CONFIG_ID_PATTERN.test(normalized) ? normalized : void 0;
}
function localizedText(value) {
  if (typeof value === "string") {
    const normalized = nonEmptyString(value);
    return normalized ? {
      zh: normalized,
      en: normalized
    } : void 0;
  }
  if (!isRecord(value)) return void 0;
  const zh = nonEmptyString(value.zh) ?? nonEmptyString(value.en);
  const en = nonEmptyString(value.en) ?? nonEmptyString(value.zh);
  return zh && en ? {
    zh,
    en
  } : void 0;
}
function unwrapApolloValue(raw) {
  let value = raw;
  for (let depth = 0; depth < 3; depth += 1) {
    if (typeof value === "string") {
      try {
        value = JSON.parse(value);
        continue;
      } catch {
        return value;
      }
    }
    if (!isRecord(value)) return value;
    if (isRecord(value.data) && "value" in value.data) {
      value = value.data.value;
      continue;
    }
    if ("value" in value && Object.keys(value).length === 1) {
      value = value.value;
      continue;
    }
    return value;
  }
  return value;
}
function parseSecondaryCategories(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  const result = [];
  for (const candidate of value.slice(0, HOME_TABS_SHOWCASE_MAX_SECONDARY_CATEGORIES)) {
    if (!isRecord(candidate)) continue;
    const id = configId(candidate.id);
    const title = localizedText(candidate.title ?? candidate.label);
    if (!id || !title || seen.has(id)) continue;
    seen.add(id);
    result.push({
      id,
      label: title.zh,
      labelEn: title.en
    });
  }
  return result;
}
function parseProvider(category) {
  const provider = isRecord(category.provider) ? category.provider : category;
  const type = nonEmptyString(provider.type);
  if (type === "quick-start-v2") {
    const key = nonEmptyString(provider.config_key) ?? HOME_QUICK_START_V2_CONFIG_KEY;
    if (key !== HOME_QUICK_START_V2_CONFIG_KEY) return void 0;
    return {
      type,
      configKey: HOME_QUICK_START_V2_CONFIG_KEY
    };
  }
  if (type === "skill-market") {
    const key = nonEmptyString(provider.config_key);
    if (key && key !== HOME_SKILL_SHOWCASE_CONFIG_KEY) return void 0;
    const source = configId(provider.source) ?? "official-featured";
    const configuredSecondary = parseSecondaryCategories(category.secondary_categories);
    return {
      type,
      ...(key ? {
        configKey: HOME_SKILL_SHOWCASE_CONFIG_KEY
      } : {}),
      source,
      secondaryCategories: configuredSecondary.length > 0 ? configuredSecondary : [{
        id: "all",
        label: "全部",
        labelEn: "All"
      }]
    };
  }
  if (type === "project-showcase") {
    const key = nonEmptyString(provider.config_key) ?? HOME_PROJECT_SHOWCASE_CONFIG_KEY;
    if (key !== HOME_PROJECT_SHOWCASE_CONFIG_KEY) return void 0;
    return {
      type,
      configKey: HOME_PROJECT_SHOWCASE_CONFIG_KEY
    };
  }
  return void 0;
}
function parsePrimaryCategory(value) {
  if (!isRecord(value)) return void 0;
  const id = configId(value.id);
  const title = localizedText(value.title ?? value.label);
  const provider = parseProvider(value);
  if (!id || !title || !provider) return void 0;
  const defaultSecondaryId = configId(value.default_secondary_id);
  return {
    id,
    label: title.zh,
    labelEn: title.en,
    ...(defaultSecondaryId ? {
      defaultSecondaryId
    } : {}),
    provider
  };
}
export function parseHomeTabsShowcaseConfig(raw) {
  const value = unwrapApolloValue(raw);
  if (!isRecord(value)) return null;
  if (value.schema_version !== HOME_TABS_SHOWCASE_SCHEMA_VERSION) return null;
  if (typeof value.enabled !== "boolean") return null;
  const rawCategories = Array.isArray(value.primary_categories) ? value.primary_categories : Array.isArray(value.tabs) ? value.tabs : null;
  if (!rawCategories) return null;
  if (!value.enabled) {
    return {
      schemaVersion: HOME_TABS_SHOWCASE_SCHEMA_VERSION,
      enabled: false,
      primaryCategories: []
    };
  }
  const seen = new Set();
  const primaryCategories = [];
  for (const candidate of rawCategories.slice(0, HOME_TABS_SHOWCASE_MAX_PRIMARY_CATEGORIES)) {
    const parsed = parsePrimaryCategory(candidate);
    if (!parsed || seen.has(parsed.id)) continue;
    seen.add(parsed.id);
    primaryCategories.push(parsed);
  }
  if (primaryCategories.length === 0) return null;
  const configuredDefault = configId(value.default_primary_id ?? value.default_tab_id);
  const defaultPrimaryId = primaryCategories.some(category => category.id === configuredDefault) ? configuredDefault : primaryCategories[0]?.id;
  return {
    schemaVersion: HOME_TABS_SHOWCASE_SCHEMA_VERSION,
    enabled: true,
    ...(defaultPrimaryId ? {
      defaultPrimaryId
    } : {}),
    primaryCategories
  };
}
