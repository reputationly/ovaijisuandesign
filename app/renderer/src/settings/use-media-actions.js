// use-media-actions.js
import { reactExports, usePlatform, useTranslation } from "../vendor.js";
import { dedupedToast } from "../infra/agent-http-client.js";
import { isAbsoluteLocalFilePath } from "./restart-banner.jsx";
import {
  getErrorMessage,
  isPathAccessError,
} from "./parse-custom-mcp-arguments.js";
const INVALID_FOLDER_CHARACTERS = /[<>:"/\\|?*]/g;
const TRAILING_DOTS_OR_SPACES = /[. ]+$/g;
const WINDOWS_RESERVED_NAME = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i;
const MAX_FOLDER_NAME_LENGTH = 120;
function replaceInvalidFolderCharacters(value) {
  return Array.from(value, (character) =>
    (character.codePointAt(0) ?? 0) <= 31 ? "_" : character,
  )
    .join("")
    .replace(INVALID_FOLDER_CHARACTERS, "_");
}
function sanitizeDownloadFolderName(folderName, fallback = "download") {
  const normalizedFallback =
    replaceInvalidFolderCharacters(fallback.normalize("NFC"))
      .replace(TRAILING_DOTS_OR_SPACES, "")
      .trim() || "download";
  let value = replaceInvalidFolderCharacters(folderName.normalize("NFC"))
    .replace(TRAILING_DOTS_OR_SPACES, "")
    .trim()
    .slice(0, MAX_FOLDER_NAME_LENGTH)
    .replace(TRAILING_DOTS_OR_SPACES, "");
  if (!value || value === "." || value === "..") value = normalizedFallback;
  if (WINDOWS_RESERVED_NAME.test(value)) value = `_${value}`;
  return value;
}
function createUniqueDownloadFolderNames(names) {
  const result = new Map();
  const reserved = new Set();
  for (const folderName of names) {
    if (result.has(folderName)) continue;
    const base = sanitizeDownloadFolderName(folderName);
    let candidate = base;
    for (let index = 1; reserved.has(candidate.toLowerCase()); index += 1) {
      candidate = `${base} (${index})`;
    }
    reserved.add(candidate.toLowerCase());
    result.set(folderName, candidate);
  }
  return result;
}
const log = window.hilo?.logger;
function getFileName(pathOrUrl) {
  const raw = pathOrUrl.split(/[/\\]/).pop() ?? "file";
  return raw.split("?")[0] ?? raw;
}
function getExtension(fileName) {
  const dot = fileName.lastIndexOf(".");
  return dot >= 0 ? fileName.slice(dot + 1).toLowerCase() : "";
}
function isImageExtension(ext) {
  return [
    "png",
    "jpg",
    "jpeg",
    "gif",
    "bmp",
    "webp",
    "svg",
    "ico",
    "tiff",
  ].includes(ext);
}
function joinTargetPath(directory, fileName) {
  const separator =
    directory.includes("\\") && !directory.includes("/") ? "\\" : "/";
  return `${directory.replace(/[\\/]+$/, "")}${separator}${fileName}`;
}
function splitFileName(fileName) {
  const dot = fileName.lastIndexOf(".");
  if (dot <= 0)
    return {
      stem: fileName,
      extension: "",
    };
  return {
    stem: fileName.slice(0, dot),
    extension: fileName.slice(dot),
  };
}
async function resolveAvailableTargetPath(
  directory,
  fileName,
  exists,
  reservedTargets,
) {
  const { stem, extension } = splitFileName(fileName || "file");
  for (let index = 0; index < 1e3; index += 1) {
    const candidateName =
      index === 0
        ? `${stem}${extension}`
        : `${stem} (${index})${extension}`;
    const candidatePath = joinTargetPath(directory, candidateName);
    const reservationKey = candidatePath.toLowerCase();
    if (reservedTargets.has(reservationKey)) continue;
    if (await exists(candidatePath)) continue;
    reservedTargets.add(reservationKey);
    return candidatePath;
  }
  return joinTargetPath(directory, `${stem}-${Date.now()}${extension}`);
}
async function resolveAvailableTargetDirectory(
  parentDirectory,
  folderName,
  exists,
) {
  const base = sanitizeDownloadFolderName(folderName);
  for (let index = 0; index < 1e3; index += 1) {
    const candidateName = index === 0 ? base : `${base} (${index})`;
    const candidatePath = joinTargetPath(parentDirectory, candidateName);
    if (!(await exists(candidatePath))) return candidatePath;
  }
  return joinTargetPath(parentDirectory, `${base}-${Date.now()}`);
}
export function useMediaActions() {
  const platform = usePlatform();
  const { t } = useTranslation();
  const copyImage = reactExports.useCallback(
    async (pathOrUrl) => {
      try {
        if (isAbsoluteLocalFilePath(pathOrUrl)) {
          await platform.clipboard.writeImage?.(pathOrUrl);
        } else {
          const response = await fetch(pathOrUrl);
          const buffer = await response.arrayBuffer();
          await platform.clipboard.writeImageData?.(buffer);
        }
        dedupedToast.success(t("common.copied"));
      } catch (err) {
        log?.error(
          `[media-actions] copyImage failed: ${getErrorMessage(err)}`,
          "media-actions",
        );
        dedupedToast.error(t("common.copyFailed"));
      }
    },
    [platform, t],
  );
  const copyFile = reactExports.useCallback(
    async (filePath) => {
      try {
        await platform.clipboard.writeFile?.(filePath);
        dedupedToast.success(t("common.copied"));
      } catch (err) {
        log?.error(
          `[media-actions] copyFile failed: ${getErrorMessage(err)}`,
          "media-actions",
        );
        dedupedToast.error(t("common.copyFailed"));
      }
    },
    [platform, t],
  );
  const copyPath = reactExports.useCallback(
    async (path) => {
      try {
        await platform.clipboard.writeText(path);
        dedupedToast.success(t("fileExplorer.pathCopied"));
      } catch (err) {
        log?.error(
          `[media-actions] copyPath failed: ${getErrorMessage(err)}`,
          "media-actions",
        );
        dedupedToast.error(t("common.copyFailed"));
      }
    },
    [platform, t],
  );
  const saveAs = reactExports.useCallback(
    async (pathOrUrl, defaultName) => {
      try {
        const fileName = defaultName ?? getFileName(pathOrUrl);
        const ext = getExtension(fileName);
        const targetPath = await platform.fs.showSaveDialog?.({
          defaultPath: fileName,
          filters: ext
            ? [
                {
                  name: ext.toUpperCase(),
                  extensions: [ext],
                },
              ]
            : void 0,
        });
        if (!targetPath) return;
        if (isAbsoluteLocalFilePath(pathOrUrl)) {
          await platform.fs.copy?.(pathOrUrl, targetPath, true);
        } else {
          const response = await fetch(pathOrUrl);
          if (!response.ok) {
            throw new Error(`Download failed: HTTP ${response.status}`);
          }
          const buffer = await response.arrayBuffer();
          await platform.fs.writeBinaryFile?.(targetPath, buffer);
        }
        dedupedToast.success(t("common.saved"));
      } catch (err) {
        const detail = getErrorMessage(err);
        log?.error(
          `[media-actions] saveAs failed: ${detail}, source=${pathOrUrl}`,
          "media-actions",
        );
        if (isPathAccessError(err)) {
          dedupedToast.error(t("common.saveFailed"), {
            description: detail,
          });
        } else {
          dedupedToast.error(t("common.saveFailed"));
        }
      }
    },
    [platform, t],
  );
  const saveManyAs = reactExports.useCallback(
    async (files, options = {}) => {
      const candidates = files.filter((file) => file.filePath);
      const totalCount = candidates.length;
      const result = (status, savedCount, failedFiles, outputDirectory) => ({
        status,
        totalCount,
        savedCount,
        failedCount: failedFiles.length,
        failedFiles,
        outputDirectory,
      });
      const failAll = (reason) =>
        candidates.map((file) => ({
          filePath: file.filePath,
          fileName: file.fileName ?? getFileName(file.filePath),
          folderName: file.folderName,
          reason,
        }));
      const failedFileDescription = (failedFiles) => {
        const visibleNames = failedFiles
          .slice(0, 3)
          .map((file) => file.fileName);
        const remainingCount = failedFiles.length - visibleNames.length;
        return remainingCount > 0
          ? `${visibleNames.join(", ")} +${remainingCount}`
          : visibleNames.join(", ");
      };
      const emitProgress = (progress) => {
        try {
          options?.onProgress?.(progress);
        } catch (err) {
          log?.error(
            `[media-actions] saveManyAs progress callback failed: ${getErrorMessage(err)}`,
            "media-actions",
          );
        }
      };
      const retryAction = (failedFiles) => {
        const retryFiles = failedFiles.map(
          ({ filePath, fileName, folderName }) => ({
            filePath,
            fileName,
            folderName,
          }),
        );
        return {
          label: t("common.retry"),
          onClick: () => {
            if (options.onRetry) {
              options.onRetry(retryFiles);
              return;
            }
            void saveManyAs(retryFiles, {
              rootFolderName: options.rootFolderName,
              dialogTitle: options.dialogTitle,
            });
          },
        };
      };
      if (totalCount === 0) return result("completed", 0, []);
      if (options?.signal?.aborted) return result("cancelled", 0, []);
      let targetDirectory;
      let createdRootDirectory = false;
      try {
        if (
          !platform.fs.showOpenDialog ||
          !platform.fs.copy ||
          !platform.fs.exists ||
          !platform.fs.mkdir
        ) {
          dedupedToast.error(t("common.saveFailed"));
          return result(
            "failed",
            0,
            failAll("Batch file saving is not supported"),
          );
        }
        const selected = await platform.fs.showOpenDialog({
          title:
            options?.dialogTitle ?? t("canvas.lightbox.selectDownloadFolder"),
          directory: true,
        });
        const selectedDirectory = selected[0];
        if (!selectedDirectory) return result("cancelled", 0, []);
        if (options.signal?.aborted) return result("cancelled", 0, []);
        targetDirectory = options.rootFolderName
          ? await resolveAvailableTargetDirectory(
              selectedDirectory,
              options.rootFolderName,
              platform.fs.exists,
            )
          : selectedDirectory;
        if (options.signal?.aborted) return result("cancelled", 0, []);
        if (options.rootFolderName) {
          await platform.fs.mkdir(targetDirectory);
          createdRootDirectory = true;
        }
        const reservedTargets = new Set();
        const folderNames = createUniqueDownloadFolderNames(
          candidates.flatMap((file) =>
            file.folderName ? [file.folderName] : [],
          ),
        );
        const createdFolders = new Map();
        const successfulFolders = new Set();
        const failedFiles = [];
        let savedCount = 0;
        let processedCount = 0;
        emitProgress({
          failedCount: 0,
          processedCount: 0,
          savedCount: 0,
          totalCount,
        });
        for (const file of candidates) {
          if (options.signal?.aborted) break;
          const fileName = file.fileName ?? getFileName(file.filePath);
          let safeFolderName;
          let attemptedTargetPath;
          try {
            safeFolderName = file.folderName
              ? folderNames.get(file.folderName)
              : void 0;
            const fileTargetDirectory = safeFolderName
              ? joinTargetPath(targetDirectory, safeFolderName)
              : targetDirectory;
            if (safeFolderName && !createdFolders.has(safeFolderName)) {
              await platform.fs.mkdir(fileTargetDirectory);
              createdFolders.set(safeFolderName, fileTargetDirectory);
            }
            if (options.signal?.aborted) break;
            attemptedTargetPath = await resolveAvailableTargetPath(
              fileTargetDirectory,
              fileName,
              platform.fs.exists,
              reservedTargets,
            );
            if (options.signal?.aborted) break;
            if (isAbsoluteLocalFilePath(file.filePath)) {
              await platform.fs.copy(
                file.filePath,
                attemptedTargetPath,
                false,
              );
            } else {
              if (!platform.fs.writeBinaryFile) {
                throw new Error("Binary file writing is not supported");
              }
              const response = await fetch(file.filePath, {
                signal: options.signal,
              });
              if (!response.ok) {
                throw new Error(`Download failed: HTTP ${response.status}`);
              }
              const buffer = await response.arrayBuffer();
              if (options.signal?.aborted) break;
              await platform.fs.writeBinaryFile(attemptedTargetPath, buffer);
            }
            savedCount += 1;
            if (safeFolderName) successfulFolders.add(safeFolderName);
          } catch (err) {
            if (options.signal?.aborted) {
              if (attemptedTargetPath && platform.fs.delete) {
                try {
                  if (await platform.fs.exists(attemptedTargetPath)) {
                    await platform.fs.delete(attemptedTargetPath);
                  }
                } catch (cleanupError) {
                  log?.error(
                    `[media-actions] saveManyAs cancelled target cleanup failed: ${getErrorMessage(cleanupError)}`,
                    "media-actions",
                  );
                }
              }
              break;
            }
            const failure = {
              filePath: file.filePath,
              fileName,
              folderName: file.folderName,
              reason: getErrorMessage(err),
            };
            failedFiles.push(failure);
            log?.error(
              `[media-actions] saveManyAs item failed: ${failure.reason}, source=${file.filePath}`,
              "media-actions",
            );
            if (attemptedTargetPath && platform.fs.delete) {
              try {
                if (await platform.fs.exists(attemptedTargetPath)) {
                  await platform.fs.delete(attemptedTargetPath);
                }
              } catch (cleanupError) {
                log?.error(
                  `[media-actions] saveManyAs failed target cleanup failed: ${getErrorMessage(cleanupError)}`,
                  "media-actions",
                );
              }
            }
          }
          processedCount += 1;
          emitProgress({
            currentFileName: fileName,
            failedCount: failedFiles.length,
            processedCount,
            savedCount,
            totalCount,
          });
        }
        if (createdRootDirectory && platform.fs.delete) {
          try {
            if (savedCount === 0) {
              await platform.fs.delete(targetDirectory);
              createdRootDirectory = false;
            } else {
              for (const [folderName, folderPath] of createdFolders) {
                if (!successfulFolders.has(folderName))
                  await platform.fs.delete(folderPath);
              }
            }
          } catch (cleanupError) {
            log?.error(
              `[media-actions] saveManyAs empty directory cleanup failed: ${getErrorMessage(cleanupError)}`,
              "media-actions",
            );
          }
        }
        const cancelled = Boolean(
          options.signal?.aborted && processedCount < totalCount,
        );
        if (cancelled) {
          dedupedToast.info(
            t("canvas.lightbox.batchSaveCancelled", {
              count: savedCount,
            }),
          );
          return result(
            "cancelled",
            savedCount,
            failedFiles,
            createdRootDirectory ? targetDirectory : void 0,
          );
        }
        if (savedCount > 0 && failedFiles.length === 0) {
          dedupedToast.success(
            t("canvas.lightbox.batchSaveSuccess", {
              count: savedCount,
            }),
          );
          return result("completed", savedCount, [], targetDirectory);
        } else if (savedCount > 0) {
          dedupedToast.error(
            t("canvas.lightbox.batchSavePartial", {
              saved: savedCount,
              failed: failedFiles.length,
            }),
            {
              description: failedFileDescription(failedFiles),
              action: retryAction(failedFiles),
            },
          );
          return result("partial", savedCount, failedFiles, targetDirectory);
        } else {
          dedupedToast.error(t("common.saveFailed"), {
            description: failedFileDescription(failedFiles),
            action: retryAction(failedFiles),
          });
          return result("failed", 0, failedFiles);
        }
      } catch (err) {
        const detail = getErrorMessage(err);
        log?.error(
          `[media-actions] saveManyAs failed: ${detail}`,
          "media-actions",
        );
        const failedFiles = failAll(detail);
        dedupedToast.error(t("common.saveFailed"), {
          action: retryAction(failedFiles),
        });
        if (createdRootDirectory && targetDirectory && platform.fs.delete) {
          try {
            await platform.fs.delete(targetDirectory);
          } catch (cleanupError) {
            log?.error(
              `[media-actions] saveManyAs root cleanup failed: ${getErrorMessage(cleanupError)}`,
              "media-actions",
            );
          }
        }
        return result("failed", 0, failedFiles);
      }
    },
    [platform, t],
  );
  const showInFolder = reactExports.useCallback(
    async (path) => {
      try {
        await platform.shell.showItemInFolder?.(path);
      } catch (err) {
        log?.error(
          `[media-actions] showInFolder failed: ${getErrorMessage(err)}`,
          "media-actions",
        );
        dedupedToast.error(t("fileExplorer.cannotOpenFolder"));
      }
    },
    [platform, t],
  );
  const openWithDefault = reactExports.useCallback(
    async (path) => {
      try {
        if (platform.shell.openPath) {
          await platform.shell.openPath(path);
          return;
        }
        dedupedToast.error(t("fileExplorer.platformNotSupported"));
      } catch (err) {
        log?.error(
          `[media-actions] openWithDefault failed: ${getErrorMessage(err)}`,
          "media-actions",
        );
        dedupedToast.error(t("fileExplorer.openFailed"));
      }
    },
    [platform, t],
  );
  const openWith = reactExports.useCallback(async (_path, _appPath) => {}, []);
  const pickAppAndOpen = reactExports.useCallback(async (_path) => {}, []);
  return {
    copyImage,
    copyFile,
    copyPath,
    saveAs,
    saveManyAs,
    showInFolder,
    openWithDefault,
    openWith,
    pickAppAndOpen,
    isLocalPath: isAbsoluteLocalFilePath,
    isImageExtension,
    getFileName,
  };
}
