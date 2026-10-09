// use-file-explorer-clipboard.js
import {
  API_PATHS,
  dedupedToast,
  reactExports,
  useTranslation,
} from "../vendor.js";
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
  gatewayFetch: gatewayFetch2,
  platform: platform2,
  rootPath,
  refresh,
  setSelectedPaths,
  setLastSelectedPath,
  sectionRef,
}) {
  const { t: t2 } = useTranslation();
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
      dedupedToast.info(t2("fileExplorer.pasteEmpty"));
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
        const res = await gatewayFetch2(API_PATHS.importExternal, {
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
        let data2;
        try {
          data2 = await res.json();
        } catch (err) {
          throw new Error(
            `import-external response is not JSON: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
        if (data2.imported && rootPath) {
          for (const it2 of data2.imported) {
            newAbsPaths.push(joinFilePath(rootPath, it2.path));
          }
        }
        if (data2.errors?.length) {
          console.warn(
            "[fileExplorer] import-external partial failures:",
            data2.errors,
          );
          dedupedToast.warning(
            t2("fileExplorer.importFailedCount", {
              count: data2.errors.length,
            }),
          );
        }
        await refresh();
      }
      if (inMemoryFiles.length > 0 && rootPath) {
        if (!platform2.fs.writeBinaryFile) {
          if (onDiskPaths.length > 0) {
            dedupedToast.warning(t2("fileExplorer.platformNotSupported"));
          } else {
            dedupedToast.error(t2("fileExplorer.platformNotSupported"));
          }
          return;
        }
        const ts2 = new Date()
          .toISOString()
          .replace(/[-:T.]/g, "")
          .slice(0, 14);
        const writeFailures = [];
        let successCount = 0;
        for (const file of inMemoryFiles) {
          const rand = Math.random().toString(36).slice(2, 6);
          const dot2 = file.name?.lastIndexOf(".") ?? -1;
          const ext =
            dot2 > 0
              ? file.name.slice(dot2)
              : (PASTED_IMAGE_EXTENSION[file.type] ?? ".bin");
          const filename = `pasted_${ts2}_${rand}${ext}`;
          const destPath = joinFilePath(rootPath, filename);
          try {
            const ab = await file.arrayBuffer();
            await platform2.fs.writeBinaryFile(destPath, ab);
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
            t2("fileExplorer.importFailedCount", {
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
        t2("fileExplorer.pasteFailed") +
          (err instanceof Error && err.message ? `: ${err.message}` : ""),
      );
    }
  });
  const handlePasteFromMenu = useStableCallback(async () => {
    sectionRef.current?.focus({
      preventScroll: true,
    });
    await new Promise((r2) => requestAnimationFrame(() => r2()));
    const result = await clipboardService.triggerPasteOnFocusedWindow();
    if (result.ok) {
      return;
    }
    if (result.reason === "paste-threw") {
      dedupedToast.error(
        t2("fileExplorer.pasteFailed") +
          (result.message ? `: ${result.message}` : ""),
      );
    } else {
      dedupedToast.info(t2("fileExplorer.pasteEmpty"));
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
