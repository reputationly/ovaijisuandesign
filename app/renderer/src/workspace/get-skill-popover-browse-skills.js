// get-skill-popover-browse-skills.js
import { skillCategoryCodes } from "../generation/normalize-skill-detail-metadata.js";
import { FEATURED_TAG } from "../generation/use-mention-models.jsx";
import { MY_SKILLS_TAG } from "./text-editor-skill-categories.jsx";

export function filterMarketSkillsByTag(skills, activeTag) {
  if (!activeTag) return skills;
  if (activeTag === FEATURED_TAG) {
    return skills.filter(
      (skill) =>
        skill.source === "official-featured" || skill.source === "community",
    );
  }
  return skills.filter((skill) =>
    skillCategoryCodes(skill).includes(activeTag),
  );
}

export function getSkillPopoverBrowseSkills(
  marketSkills,
  localSkills,
  activeTag,
) {
  if (activeTag === MY_SKILLS_TAG) return localSkills;
  return filterMarketSkillsByTag(marketSkills, activeTag).map((marketSkill) => {
    if (!marketSkill.installed) return marketSkill;
    const installedSkill = localSkills.find(
      (skill) => skill.name === marketSkill.name,
    );
    return installedSkill
      ? {
          ...installedSkill,
          installed: true,
          downloads: marketSkill.downloads,
          categoryCodes: marketSkill.categoryCodes,
        }
      : marketSkill;
  });
}
