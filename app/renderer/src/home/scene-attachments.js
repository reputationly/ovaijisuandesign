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
function attachmentToMentionAttrs(attachment, label) {
  const kind = attachment.type === "image" || attachment.type === "video" || attachment.type === "audio" ? attachment.type : "other";
  const previewUrl = attachment.type === "image" && attachment.assetUrl ? attachment.assetUrl : null;
  const mediaUrl = (attachment.type === "video" || attachment.type === "audio") && attachment.assetUrl ? attachment.assetUrl : null;
  const isFolder = attachment.type === "folder";
  return {
    path: attachment.name,
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
    folderId: isFolder ? `folder:${attachment.name}` : null,
    folderResolvedPath: null
  };
}
export function buildSceneSegments(rawText, attachments) {
  const lookup = new Map();
  for (const attachment of attachments) {
    lookup.set(attachment.name, attachment);
    if (attachment.displayNames) {
      for (const alias of attachment.displayNames) lookup.set(alias, attachment);
    }
  }
  const parts = rawText.split(/(\[[^\]]+\])/g);
  const segments = [];
  for (const part of parts) {
    if (!part) continue;
    const bracketMatch = part.match(/^\[(.+)\]$/);
    if (bracketMatch) {
      const inner = bracketMatch[1];
      const attachment = lookup.get(inner);
      if (attachment) {
        segments.push({
          type: "mentionRef",
          attrs: attachmentToMentionAttrs(attachment, inner)
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
