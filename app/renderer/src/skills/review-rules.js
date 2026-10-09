// 技能审核的规则：分类、字段长度限制、包版本号的校验与比较，纯函数。
import { mv as isValidSkillName } from "../main.jsx";
export const HCP_CATEGORIES = [
  "design-3d",
  "design-2d",
  "video-audio",
  "cloud-storage",
  "office-docs",
  "ecommerce",
  "data-research",
  "enterprise",
  "other",
];
export const SKILL_REVIEW_LIMITS = {
  zh: {
    displayNameMin: 2,
    displayNameMax: 24,
    summaryMin: 20,
    summaryMax: 60,
    bestForMinCount: 2,
    bestForMaxCount: 3,
    bestForMinLength: 2,
    bestForMaxLength: 6,
    howToUseMin: 20,
    howToUseMax: 40,
    outputsMin: 15,
    outputsMax: 40,
    creatorMin: 2,
    creatorMax: 30,
  },
  en: {
    displayNameMin: 2,
    displayNameMax: 48,
    summaryMin: 40,
    summaryMax: 120,
    bestForMinCount: 2,
    bestForMaxCount: 3,
    bestForMinLength: 2,
    bestForMaxLength: 24,
    howToUseMin: 40,
    howToUseMax: 120,
    outputsMin: 30,
    outputsMax: 100,
    creatorMin: 2,
    creatorMax: 40,
  },
};
const SKILL_REVIEW_CATEGORY_LIMIT = 3;
const DEFAULT_LOCALE = "zh";
export const DEFAULT_SKILL_PACKAGE_VERSION = "0.1.0";
const SKILL_PACKAGE_VERSION_PATTERN = /^\d+\.\d+\.\d+$/;
function isValidSkillPackageVersion(version) {
  return SKILL_PACKAGE_VERSION_PATTERN.test(version.trim());
}
function compareSkillPackageVersions(a, b) {
  if (!isValidSkillPackageVersion(a) || !isValidSkillPackageVersion(b)) return null;
  const left = a.split(".").map(BigInt);
  const right = b.split(".").map(BigInt);
  for (let index = 0; index < 3; index += 1) {
    const leftPart = left[index] ?? 0n;
    const rightPart = right[index] ?? 0n;
    if (leftPart > rightPart) return 1;
    if (leftPart < rightPart) return -1;
  }
  return 0;
}
export function isNewerSkillPackageVersion(next, current) {
  return (compareSkillPackageVersions(next, current) ?? 0) > 0;
}
export function validateReviewMetadata(metadata, existingSkillName) {
  const errors = {};
  const required = "required";
  const locale = metadata.locale ?? DEFAULT_LOCALE;
  const limits = SKILL_REVIEW_LIMITS[locale];
  const skillName = metadata.skillName.trim();
  const nameMatchesContext =
    existingSkillName === void 0
      ? /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(skillName)
      : skillName === existingSkillName;
  if (!isValidSkillName(skillName) || !nameMatchesContext) {
    errors.skillName = "skill_name_invalid";
  }
  const displayNameLength = [...metadata.displayName.trim()].length;
  if (displayNameLength === 0) errors.displayName = required;
  else if (displayNameLength < limits.displayNameMin || displayNameLength > limits.displayNameMax) {
    errors.displayName = "display_name_length";
  }
  const summaryLength = [...metadata.summary.trim()].length;
  if (summaryLength === 0) errors.summary = required;
  else if (summaryLength < limits.summaryMin || summaryLength > limits.summaryMax) {
    errors.summary = "summary_length";
  }
  const normalizedBestFor = metadata.bestFor.map((value) => value.trim());
  if (
    normalizedBestFor.length < limits.bestForMinCount ||
    normalizedBestFor.length > limits.bestForMaxCount
  ) {
    errors.bestFor = "best_for_count";
  } else if (
    new Set(normalizedBestFor).size !== normalizedBestFor.length ||
    normalizedBestFor.some((value) => {
      const length = [...value].length;
      return (
        length < limits.bestForMinLength ||
        length > limits.bestForMaxLength ||
        (locale === "en" && value.split(/\s+/).filter(Boolean).length > 3)
      );
    })
  ) {
    errors.bestFor = "best_for_length";
  }
  const howToUseLength = [...metadata.howToUse.trim()].length;
  if (howToUseLength < limits.howToUseMin || howToUseLength > limits.howToUseMax) {
    errors.howToUse = "how_to_use_length";
  }
  const outputsLength = [...metadata.outputs.trim()].length;
  if (outputsLength < limits.outputsMin || outputsLength > limits.outputsMax) {
    errors.outputs = "outputs_length";
  }
  if (metadata.categories.length === 0) errors.categories = required;
  else if (
    metadata.categories.length > SKILL_REVIEW_CATEGORY_LIMIT ||
    new Set(metadata.categories).size !== metadata.categories.length
  ) {
    errors.categories = "categories_invalid";
  }
  if (!metadata.stage.trim()) errors.stage = required;
  const creatorLength = [...metadata.creator.trim()].length;
  if (!metadata.creator.trim()) errors.creator = required;
  else if (creatorLength < limits.creatorMin || creatorLength > limits.creatorMax) {
    errors.creator = "creator_length";
  }
  if (!metadata.packageVersion.trim()) errors.packageVersion = required;
  else if (!isValidSkillPackageVersion(metadata.packageVersion)) {
    errors.packageVersion = "package_version_invalid";
  }
  if (!metadata.hasCover) errors.hasCover = required;
  if (!metadata.hasShowcase) errors.hasShowcase = required;
  if (!metadata.hasPackage) errors.hasPackage = required;
  return errors;
}
