// 把展示区选中的素材与技能转换成输入框里的附件与提及。
export function snapshotSelectedMediaModels(models) {
  if (!models) return void 0;
  return {
    ...(models.image ? {
      image: [...models.image]
    } : {}),
    ...(models.video ? {
      video: [...models.video]
    } : {}),
    ...(models.audio ? {
      audio: [...models.audio]
    } : {})
  };
}
export const SCENE_ATTACHMENT_SOURCE = "scene-query";
export const HOME_SHOWCASE_FEATURED_SKILL_SOURCE = "official-featured";
function attachmentToMentionAttrs(att, label) {
  const kind = att.type === "image" || att.type === "video" || att.type === "audio" ? att.type : "other";
  const previewUrl = att.type === "image" && att.assetUrl ? att.assetUrl : null;
  const mediaUrl = (att.type === "video" || att.type === "audio") && att.assetUrl ? att.assetUrl : null;
  const isFolder = att.type === "folder";
  return {
    path: att.name,
    name: label,
    modelName: null,
    mentionName: null,
    kind,
    markerStyle: "bracket",
    mediaType: null,
    thumbUrl: previewUrl,
    previewUrl,
    mediaUrl,
    isFolder,
    folderId: isFolder ? `folder:${att.name}` : null,
    folderResolvedPath: null
  };
}
export function buildSceneSegments(rawText, attachments) {
  const lookup = new Map();
  for (const a of attachments) {
    lookup.set(a.name, a);
    if (a.displayNames) {
      for (const alias of a.displayNames) lookup.set(alias, a);
    }
  }
  const parts = rawText.split(/(\[[^\]]+\])/g);
  const segments = [];
  for (const part of parts) {
    if (!part) continue;
    const m = part.match(/^\[(.+)\]$/);
    if (m) {
      const inner = m[1];
      const att = lookup.get(inner);
      if (att) {
        segments.push({
          type: "mentionRef",
          attrs: attachmentToMentionAttrs(att, inner)
        });
        continue;
      }
    }
    segments.push({
      type: "text",
      text: part
    });
  }
  return segments;
}
export function marketSkillToReadySkill(skill) {
  return {
    ...skill,
    enabled: true,
    source: "installed"
  };
}
