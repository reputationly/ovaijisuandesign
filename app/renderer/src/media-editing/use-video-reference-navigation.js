// use-video-reference-navigation.js
import { useReferenceAttachmentNavigation } from "./use-reference-attachment-navigation.js";

export function useVideoReferenceNavigation({
  defaultImagePaths,
  defaultVideoPaths,
  defaultAudioPaths,
  defaultTextPaths,
  prompt,
  modelId,
  params,
  paths,
  ...navigation2
}) {
  return useReferenceAttachmentNavigation({
    ...navigation2,
    mode: "i2v",
    defaults: {
      imagePaths: [...(defaultImagePaths ?? [])],
      videoPaths: [...(defaultVideoPaths ?? [])],
      audioPaths: [...(defaultAudioPaths ?? [])],
      textPaths: [...(defaultTextPaths ?? [])],
    },
    getDraft: () => ({
      prompt,
      modelId,
      params,
      imagePaths: [...paths.imagePaths],
      videoPaths: [...paths.videoPaths],
      audioPaths: [...paths.audioPaths],
      textPaths: [...paths.textPaths],
    }),
  });
}
