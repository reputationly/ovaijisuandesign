// 创作者计划的数据层：投稿内容整理、上传、保存、提交记录查询与 hook。
import {
  r as reactExports,
  mP as normalizePublicSkillShowcaseUrl,
  l as gatewayFetch,
  m as API_PATHS,
  mQ as normalizeSkillDetailMetadata,
  mR as normalizeSkillContentLocale,
} from "../../main.jsx";
import { DEFAULT_SKILL_PACKAGE_VERSION } from "../review-rules.js";
export function hasSubmissionShowcase(showcase) {
  return showcase?.length === 1 && Boolean(normalizePublicSkillShowcaseUrl(showcase[0]));
}
export function normalizeSubmissionShowcase(showcase) {
  if (showcase === void 0) return void 0;
  if (showcase.length > 1) throw new Error("Showcase supports one video only");
  return showcase.map((value) => {
    const url = normalizePublicSkillShowcaseUrl(value);
    if (!url) throw new Error("Showcase requires a trusted public video URL");
    return url;
  });
}
function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}
function stringArray(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
}
function readSubmissionShowcase(value, legacyFallback) {
  if (value === void 0) return legacyFallback;
  if (typeof value === "string") return [value];
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    throw new Error("Showcase must contain video URLs");
  }
  return [...value];
}
export async function stageSkillPackage(file) {
  const formData = new FormData();
  formData.append("file", file);
  const response = await gatewayFetch(API_PATHS.skillSubmissionStage, {
    method: "POST",
    body: formData,
  });
  const raw = asRecord(await response.json());
  if (!raw.ok) throw new Error(String(raw.error ?? "Unable to read skill package"));
  const skill = asRecord(raw.skill);
  const metadata = normalizeSkillDetailMetadata({
    ...skill,
  });
  return {
    stagingPath: String(raw.stagingPath ?? ""),
    skill: {
      name: String(skill.name ?? ""),
      displayName: String(skill.displayNameZh ?? ""),
      structuredInfo: metadata.structuredInfo ?? {},
      showcase: readSubmissionShowcase(skill.showcase, metadata.showcase),
      contentLocale: skill.contentLocale
        ? normalizeSkillContentLocale(skill.contentLocale)
        : void 0,
      completeTagsEn: stringArray(skill.completeTagsEn),
      creator: String(skill.authorCn ?? skill.authorEn ?? skill.creator ?? ""),
      packageVersion: String(skill.version ?? DEFAULT_SKILL_PACKAGE_VERSION),
      packageVersionDeclared: raw.packageVersionDeclared === true,
    },
  };
}
export async function uploadCreatorPlanAsset(skillName, assetType, file) {
  const uploadResponse = await gatewayFetch(API_PATHS.skillSubmissionAssetUpload, {
    method: "POST",
    headers: {
      "Content-Type": file.type || "application/octet-stream",
      "X-Skill-Name": skillName,
      "X-Asset-Type": assetType,
      "X-Upload-Size": String(file.size),
    },
    body: file,
    timeoutMs: 30 * 60 * 1e3,
  });
  const upload = asRecord(await uploadResponse.json());
  if (assetType === "showcase") {
    const publicUrl = normalizePublicSkillShowcaseUrl(upload.public_url);
    if (!publicUrl) throw new Error("Showcase upload did not return a valid public URL");
    return publicUrl;
  }
  const objectKey = String(upload.object_key ?? "");
  if (!objectKey) throw new Error(`${assetType} upload did not return an object key`);
  return objectKey;
}
export async function saveCreatorPlan(payload, applyForReview) {
  const coverObjectKey =
    payload.coverEdited && payload.coverFile
      ? await uploadCreatorPlanAsset(payload.skillName, "cover", payload.coverFile)
      : payload.coverEdited
        ? ""
        : payload.coverObjectKey;
  const showcase =
    payload.showcaseEdited && payload.showcaseFile
      ? [await uploadCreatorPlanAsset(payload.skillName, "showcase", payload.showcaseFile)]
      : payload.showcaseEdited
        ? []
        : normalizeSubmissionShowcase(payload.showcase);
  const draft = {
    source: payload.source,
    stagingPath: payload.stagingPath,
    replaceExisting: payload.replaceExisting,
    skillName: payload.skillName,
    displayName: payload.displayName,
    structuredInfo: payload.structuredInfo,
    contentLocale: payload.contentLocale,
    showcase,
    categories: payload.categories,
    stage: payload.stage,
    creator: payload.creator,
    packageVersion: payload.packageVersion,
    coverObjectKey,
  };
  const saveResponse = await gatewayFetch(API_PATHS.skillSubmissionSave, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(draft),
  });
  const saveResult = asRecord(await saveResponse.json());
  if (!saveResult.ok) throw new Error(String(saveResult.error ?? "Unable to save skill"));
  const savedSkill = asRecord(saveResult.skill);
  const savedPackageVersion = String(savedSkill.version ?? draft.packageVersion);
  const savedMetadata = normalizeSkillDetailMetadata(savedSkill);
  if (!applyForReview) return;
  if (!coverObjectKey) throw new Error("Cover is required for review");
  const savedShowcase = normalizeSubmissionShowcase(
    readSubmissionShowcase(savedSkill.showcase, savedMetadata.showcase) ?? draft.showcase,
  );
  if (!hasSubmissionShowcase(savedShowcase))
    throw new Error("One showcase video is required for review");
  await gatewayFetch(API_PATHS.skillSubmissionSubmit, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      skill_name: draft.skillName,
      display_name: draft.displayName,
      structured_info: savedMetadata.structuredInfo ?? draft.structuredInfo,
      content_locale: savedSkill.contentLocale
        ? normalizeSkillContentLocale(savedSkill.contentLocale)
        : draft.contentLocale,
      categories: draft.categories,
      stage: draft.stage,
      creator: draft.creator,
      cover_object_key: coverObjectKey,
      showcase: savedShowcase,
      package_version: savedPackageVersion,
    }),
  });
}
async function listCreatorPlanSubmissions() {
  const response = await gatewayFetch(API_PATHS.skillSubmissionList);
  const raw = asRecord(await response.json());
  const submissions = Array.isArray(raw.submissions) ? raw.submissions : [];
  return submissions.map((value) => {
    const item = asRecord(value);
    const metadata = normalizeSkillDetailMetadata(item);
    return {
      submissionId: String(item.submission_id ?? ""),
      skillName: String(item.skill_name ?? ""),
      displayName: String(item.display_name ?? ""),
      status: String(item.status ?? ""),
      reviewNote: String(item.review_note ?? ""),
      coverObjectKey: String(item.cover_object_key ?? ""),
      coverUrl: String(item.cover_url ?? ""),
      showcase: readSubmissionShowcase(item.showcase, metadata.showcase),
      structuredInfo: metadata.structuredInfo ?? {},
      contentLocale: item.content_locale
        ? normalizeSkillContentLocale(item.content_locale)
        : void 0,
      categories: stringArray(item.categories),
      stage: String(item.stage ?? ""),
      creator: String(item.creator ?? ""),
      packageVersion: String(item.package_version ?? ""),
      version: Number(item.version ?? 0),
      updatedAt: Number(item.updated_at ?? 0),
    };
  });
}
export async function offlineCreatorPlanSubmission(skillName) {
  await gatewayFetch(API_PATHS.skillSubmissionOffline, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      skill_name: skillName,
    }),
  });
}
export function useCreatorPlanSubmissions(accountId) {
  const [snapshot, setSnapshot] = reactExports.useState({
    accountId,
    items: [],
    state: accountId ? "loading" : "signed-out",
  });
  const activeAccount = reactExports.useRef(accountId);
  activeAccount.current = accountId;
  const request = reactExports.useRef(null);
  const autoRefreshAccount = reactExports.useRef(void 0);
  const refresh = reactExports.useCallback(
    (options) => {
      if (!accountId) return Promise.resolve();
      if (!options?.force && request.current?.accountId === accountId)
        return request.current.promise;
      setSnapshot((prev) => ({
        accountId,
        items: prev.accountId === accountId ? prev.items : [],
        state: "loading",
      }));
      const promise = listCreatorPlanSubmissions()
        .then((items) => {
          if (activeAccount.current === accountId && request.current?.promise === promise)
            setSnapshot({
              accountId,
              items,
              state: "ready",
            });
        })
        .catch(() => {
          if (activeAccount.current === accountId && request.current?.promise === promise)
            setSnapshot((prev) => ({
              ...prev,
              state: "error",
            }));
        })
        .finally(() => {
          if (request.current?.promise === promise) request.current = null;
        });
      request.current = {
        accountId,
        promise,
      };
      return promise;
    },
    [accountId],
  );
  reactExports.useEffect(() => {
    activeAccount.current = accountId;
    autoRefreshAccount.current = void 0;
    void refresh();
    return () => {
      activeAccount.current = void 0;
    };
  }, [accountId, refresh]);
  const refreshCovers = reactExports.useCallback(() => {
    if (!accountId || autoRefreshAccount.current === accountId) return;
    autoRefreshAccount.current = accountId;
    void refresh();
  }, [accountId, refresh]);
  const current =
    snapshot.accountId === accountId
      ? snapshot
      : {
          items: [],
          state: accountId ? "loading" : "signed-out",
        };
  return {
    submissions: current.items,
    state: accountId ? current.state : "signed-out",
    refresh,
    refreshCovers,
  };
}
