// use-file-explorer-clipboard.js
import { API_PATHS } from "../infra/workspace-gateway.js";
import reactExports from "react";
import { useTranslation } from "react-i18next";
import { dedupedToast } from "../infra/agent-http-client.js";
import { useStableCallback } from "./use-cloud-review-nodes.js";
import {
  IClipboardService,
  instantiationService,
} from "../workspace/home-service.jsx";
import { joinFilePath } from "./use-file-explorer-canvas-integration.js";

const PASTED_IMAGE_EXTENSION = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/gif": ".gif",
  "image/webp": ".webp",
};

export function useFileExplorerClipboard({
  gatewayFetch,
  platform,
  rootPath,
  refresh,
  setSelectedPaths,
  setLastSelectedPath,
  sectionRef,
}) {
  const { t: translate } = useTranslation();
  const clipboardService = reactExports.useMemo(
    () =>
      instantiationService.invokeFunction((accessor) =>
        accessor.get(IClipboardService),
      ),
    [],
  );
  const [clipboardHasContent, setClipboardHasContent] =
    reactExports.useState(false);
  const handleNativePaste = useStableCallback(async (event) => {
    const target = event.target;
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      (target instanceof HTMLElement && target.isContentEditable)
    ) {
      return;
    }
    const cd = event.clipboardData;
    const files = Array.from(cd?.files ?? []);
    if (files.length === 0) {
      dedupedToast.info(translate("fileExplorer.pasteEmpty"));
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    try {
      const newAbsPaths = [];
      const onDiskPaths = [];
      const inMemoryFiles = [];
      for (const file of files) {
        const realPath = window.hilo?.webUtils?.getPathForFile?.(file) ?? "";
        if (realPath.length > 0) {
          onDiskPaths.push(realPath);
        } else {
          inMemoryFiles.push(file);
        }
      }
      if (onDiskPaths.length > 0) {
        const res = await gatewayFetch(API_PATHS.importExternal, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            paths: onDiskPaths,
          }),
        });
        if (!res.ok) {
          let detail = "";
          try {
            const errorBody = await res.json();
            if (
              errorBody &&
              typeof errorBody === "object" &&
              "error" in errorBody
            ) {
              detail = ` -- ${String(errorBody.error)}`;
            }
          } catch {}
          throw new Error(
            `Import failed: ${res.status} ${res.statusText}${detail}`,
          );
        }
        let data;
        try {
          data = await res.json();
        } catch (err) {
          throw new Error(
            `import-external response is not JSON: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
        if (data.imported && rootPath) {
          for (const importedItem of data.imported) {
            newAbsPaths.push(joinFilePath(rootPath, importedItem.path));
          }
        }
        if (data.errors?.length) {
          console.warn(
            "[fileExplorer] import-external partial failures:",
            data.errors,
          );
          dedupedToast.warning(
            translate("fileExplorer.importFailedCount", {
              count: data.errors.length,
            }),
          );
        }
        await refresh();
      }
      if (inMemoryFiles.length > 0 && rootPath) {
        if (!platform.fs.writeBinaryFile) {
          if (onDiskPaths.length > 0) {
            dedupedToast.warning(translate("fileExplorer.platformNotSupported"));
          } else {
            dedupedToast.error(translate("fileExplorer.platformNotSupported"));
          }
          return;
        }
        const timestamp = new Date()
          .toISOString()
          .replace(/[-:T.]/g, "")
          .slice(0, 14);
        const writeFailures = [];
        let successCount = 0;
        for (const file of inMemoryFiles) {
          const rand = Math.random().toString(36).slice(2, 6);
          const dot = file.name?.lastIndexOf(".") ?? -1;
          const ext =
            dot > 0
              ? file.name.slice(dot)
              : (PASTED_IMAGE_EXTENSION[file.type] ?? ".bin");
          const filename = `pasted_${timestamp}_${rand}${ext}`;
          const destPath = joinFilePath(rootPath, filename);
          try {
            const arrayBuffer = await file.arrayBuffer();
            await platform.fs.writeBinaryFile(destPath, arrayBuffer);
            successCount++;
            newAbsPaths.push(destPath);
          } catch (err) {
            writeFailures.push({
              name: file.name || filename,
              error: err instanceof Error ? err.message : String(err),
            });
          }
        }
        await refresh();
        if (writeFailures.length > 0) {
          console.warn(
            "[fileExplorer] in-memory write failures:",
            writeFailures,
          );
          const showFn =
            successCount > 0 ? dedupedToast.warning : dedupedToast.error;
          showFn(
            translate("fileExplorer.importFailedCount", {
              count: writeFailures.length,
            }),
          );
        }
      }
      if (newAbsPaths.length > 0) {
        setSelectedPaths(new Set(newAbsPaths));
        setLastSelectedPath(newAbsPaths[newAbsPaths.length - 1]);
      }
    } catch (err) {
      dedupedToast.error(
        translate("fileExplorer.pasteFailed") +
          (err instanceof Error && err.message ? `: ${err.message}` : ""),
      );
    }
  });
  const handlePasteFromMenu = useStableCallback(async () => {
    sectionRef.current?.focus({
      preventScroll: true,
    });
    await new Promise((resolve) => requestAnimationFrame(() => resolve()));
    const result = await clipboardService.triggerPasteOnFocusedWindow();
    if (result.ok) {
      return;
    }
    if (result.reason === "paste-threw") {
      dedupedToast.error(
        translate("fileExplorer.pasteFailed") +
          (result.message ? `: ${result.message}` : ""),
      );
    } else {
      dedupedToast.info(translate("fileExplorer.pasteEmpty"));
    }
  });
  const probeClipboard = useStableCallback(() => {
    setClipboardHasContent(false);
    clipboardService
      .hasFiles()
      .then((value) => setClipboardHasContent(value))
      .catch((err) => {
        console.warn(
          "[fileExplorer] clipboard hasFiles probe failed; fail-open to surface real error via paste",
          err,
        );
        setClipboardHasContent(true);
      });
  });
  return {
    clipboardHasContent,
    handleNativePaste,
    handlePasteFromMenu,
    probeClipboard,
  };
}
