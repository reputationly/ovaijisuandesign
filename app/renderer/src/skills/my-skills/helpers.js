// 「我的技能」的状态、封面、文案推导与筛选，纯函数。
import { normalizeSkillDetailMetadata, selectSkillStructuredInfo, skillCategoryCodes, skillVerticals } from "../../generation/normalize-skill-detail-metadata.js";
import { toDisplayName } from "../../generation/use-mention-models.jsx";
export const MY_SKILL_STATUSES = {
  private: ["skills.mine.status.private", "Private"],
  pending: ["skills.mine.status.pending", "Review pending"],
  approved: ["skills.mine.status.readyToPublish", "Awaiting publication"],
  published: ["skills.mine.status.published", "Published"],
  offline: ["skills.mine.status.offline", "Offline"],
  rejected: ["skills.mine.status.rejected", "Rejected"],
  loading: ["skills.mine.status.loading", "Loading submission status"],
  unknown: ["skills.mine.status.unknown", "Submission status unavailable"],
};
export const MY_SKILL_REVIEW_ACTIONS = {
  private: ["skills.mine.prepareReview", "Prepare submission"],
  rejected: ["skills.mine.reapply", "Edit and resubmit"],
  offline: ["skills.mine.reapply", "Edit and resubmit"],
};
export function mySkillStatus(submission, loadState) {
  if (submission) {
    return Object.hasOwn(MY_SKILL_STATUSES, submission.status) ? submission.status : "unknown";
  }
  return loadState === "ready" ? "private" : loadState === "loading" ? "loading" : "unknown";
}
export function mySkillCover(skill, submission, overseas) {
  return (
    submission?.coverUrl?.trim() ||
    (overseas ? skill.coverUrlEn?.trim() : "") ||
    skill.coverUrl?.trim() ||
    ""
  );
}
export function mySkillText(skill, submission, language) {
  const structured =
    submission?.structuredInfo ??
    normalizeSkillDetailMetadata({
      ...skill,
    }).structuredInfo;
  const isZh = language.startsWith("zh");
  return {
    name:
      submission?.displayName?.trim() ||
      (isZh ? skill.displayNameZh?.trim() : "") ||
      toDisplayName(skill.name),
    summary:
      (structured && selectSkillStructuredInfo(structured, language).info.summary) ||
      (isZh ? skill.summaryZh || skill.summary : skill.summary || skill.summaryZh) ||
      "",
    version: submission?.packageVersion?.trim() || skill.version?.trim() || "",
  };
}
export function filterMySkills(skills, filters, submissions, taxonomy = []) {
  const query = filters.query.trim().toLocaleLowerCase();
  return skills.filter((skill) => {
    if (skill.skillType === "plugin") return false;
    if (filters.source === "local" && skill.source !== "user") return false;
    if (filters.source === "community" && skill.source !== "installed") return false;
    const submission = skill.source === "user" ? submissions.get(skill.name) : void 0;
    const structuredInfo =
      submission?.structuredInfo ??
      normalizeSkillDetailMetadata({
        ...skill,
      }).structuredInfo;
    const categories = submission?.categories ?? skillCategoryCodes(skill);
    if (filters.category && !categories.includes(filters.category)) {
      const category = taxonomy.find((item) => item.category === filters.category);
      if (
        submission ||
        categories.length > 0 ||
        !category ||
        !skillVerticals(skill).includes(category.en_name)
      )
        return false;
    }
    return (
      !query ||
      [
        skill.name,
        skill.displayNameZh,
        submission?.displayName,
        ...(structuredInfo
          ? Object.values(structuredInfo).map((info) => info.summary)
          : [skill.summary, skill.summaryZh]),
      ].some((text) => text?.toLocaleLowerCase().includes(query))
    );
  });
}
