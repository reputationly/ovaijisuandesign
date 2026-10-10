// 技能详情的数据：拉取、媒体整理、合并与可提交判断。
import { reactExports } from "../../vendor.js";
import { gatewayFetch } from "../../infra/gateway-fetch.js";
import { mapCloudSkillDetail } from "../../generation/map-cloud-skill-to-market-skill-info.js";
import { isSkillShowcaseUrl } from "../../generation/normalize-skill-detail-metadata.js";
import { CDN_SKILL_SHOWCASE_FALLBACK } from "../../workspace/topbar-state-context.jsx";
export function useSkillDetail(name, accountId, language) {
  const key = JSON.stringify([name, accountId, language]);
  const [snapshot, setSnapshot] = reactExports.useState();
  reactExports.useEffect(() => {
    const abort = new AbortController();
    void gatewayFetch(
      `/api/skills/market/detail?${new URLSearchParams({
        name,
      })}`,
      {
        signal: abort.signal,
      },
    )
      .then(async (response) => {
        if (!response.ok) throw new Error("Skill detail unavailable");
        return mapCloudSkillDetail(await response.json());
      })
      .then((detail) => {
        if (!abort.signal.aborted)
          setSnapshot({
            key,
            detail,
          });
      })
      .catch(() => {
        if (!abort.signal.aborted)
          setSnapshot({
            key,
            detail: {
              canSubmitToCommunity: false,
            },
          });
      });
    return () => abort.abort();
  }, [name, key]);
  return snapshot?.key === key ? snapshot.detail : void 0;
}
export function skillDetailMedia(skill, failed = new Set()) {
  const showcase = [...new Set(skill.showcase?.filter(isSkillShowcaseUrl) ?? [])].filter(
    (url) => !failed.has(url),
  );
  if (showcase.length) return showcase;
  return [CDN_SKILL_SHOWCASE_FALLBACK];
}
export function isSkillDetailVideo(url) {
  return /\.(?:mp4|webm|mov|m4v)(?:[?#]|$)/i.test(url);
}
export function mergeSkillDetail(skill, market) {
  if (!market || market.name !== skill.name) return skill;
  if ("enabled" in skill) {
    return {
      ...market,
      ...skill,
      showcase: market.showcase ?? skill.showcase,
      structuredInfo: market.structuredInfo ?? skill.structuredInfo,
      coverUrl: market.coverUrl || skill.coverUrl,
      authorCn: market.authorCn || skill.authorCn,
      authorEn: market.authorEn || skill.authorEn,
      marketSource: market.source || skill.marketSource,
    };
  }
  return {
    ...skill,
    ...market,
  };
}
export function canSubmitSkillDetail(entry, skill, uploadedByCurrentUser) {
  return entry === "mine" && "enabled" in skill && uploadedByCurrentUser;
}
