// 按区域选技能封面。
import { getRuntimeConfig } from "../infra/runtime-config.js";

export function getSkillCoverUrl(skill) {
  if (getRuntimeConfig().region === "overseas") {
    const overseasCover = skill.coverUrlEn?.trim();
    if (overseasCover) return overseasCover;
  }
  return skill.coverUrl?.trim() || "";
}
