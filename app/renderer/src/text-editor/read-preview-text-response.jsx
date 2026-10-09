// read-preview-text-response.jsx
import {
  API_PATHS,
  canvasLog,
  dedupedToast,
  observeClientMediaUpload,
  reactExports,
  useTranslation,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { workspaceEvents } from "../workspace/topbar-state-context.jsx";
import { Button$1 } from "../infra/dialog-content.jsx";
import { useGatewayFetch } from "../generation/use-model-catalog-scope-key.js";
import {
  CANVAS_REFERENCE_API,
  isCanvasReferenceUri,
} from "./table-document-to-llm-content.js";

const MAX_PREVIEW_TEXT_BYTES = 512 * 1024;

function tooLarge() {
  return Object.assign(new Error("Text exceeds the preview size limit"), {
    code: "FILE_TOO_LARGE",
  });
}

async function readPreviewTextResponse(response, signal) {
  signal?.throwIfAborted();
  if (response.status === 413) throw tooLarge();
  if (!response.ok)
    throw Object.assign(new Error("Text preview request failed"), {
      status: response.status,
    });
  const length2 = Number(response.headers.get("content-length"));
  if (Number.isFinite(length2) && length2 > MAX_PREVIEW_TEXT_BYTES) {
    await response.body?.cancel();
    throw tooLarge();
  }
  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const chunks = [];
  let total = 0;
  const handleAbort = () => {
    void reader.cancel().catch(() => {});
  };
  signal?.addEventListener("abort", handleAbort, {
    once: true,
  });
  try {
    while (true) {
      signal?.throwIfAborted();
      const { done, value } = await reader.read();
      signal?.throwIfAborted();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_PREVIEW_TEXT_BYTES) {
        await reader.cancel();
        throw tooLarge();
      }
      chunks.push(
        decoder.decode(value, {
          stream: true,
        }),
      );
    }
    chunks.push(decoder.decode());
    return chunks.join("");
  } finally {
    signal?.removeEventListener("abort", handleAbort);
    reader.releaseLock();
  }
}

export function usePreviewTextLoader() {
  const gatewayFetch2 = useGatewayFetch();
  return reactExports.useCallback(
    async (path2, signal) => {
      signal?.throwIfAborted();
      const endpoint = isCanvasReferenceUri(path2)
        ? `${CANVAS_REFERENCE_API.content}?ref=${encodeURIComponent(path2)}`
        : API_PATHS.serveFile(path2);
      return readPreviewTextResponse(
        await gatewayFetch2(endpoint, {
          signal,
        }),
        signal,
      );
    },
    [gatewayFetch2],
  );
}

export async function uploadCanvasReferenceFile(file, fetch2) {
  const data2 = await observeClientMediaUpload(
    file,
    file.name,
    "attachment",
    async (headers) => {
      const form = new FormData();
      form.append("file", file, file.name);
      const response = await fetch2(API_PATHS.upload, {
        method: "POST",
        body: form,
        ...(headers
          ? {
              headers,
            }
          : {}),
      });
      return await response.json();
    },
  );
  if (!data2?.ok || !data2.relative)
    throw new Error("Upload failed: missing relative path in response");
  return data2.relative;
}

export async function uploadCanvasFileToCdn(file, fetch2) {
  const form = new FormData();
  form.append("file", file, file.name);
  const response = await fetch2(API_PATHS.filesUploadCdn, {
    method: "POST",
    body: form,
  });
  const data2 = await response.json();
  if (!data2.ok || !data2.url)
    throw new Error(data2.error || "CDN upload failed");
  return data2.url;
}

const AssetSourcePickerContext = reactExports.createContext(null);

const AttachmentLocatorContext = reactExports.createContext(null);

export function useAttachmentLocator() {
  return reactExports.useContext(AttachmentLocatorContext);
}

export function AssetSourcePickerProvider({ children: children2 }) {
  const picker = reactExports.useRef(null);
  const locator = reactExports.useRef(null);
  return (
    <AssetSourcePickerContext.Provider value={picker}>
      <AttachmentLocatorContext.Provider value={locator}>
        {children2}
      </AttachmentLocatorContext.Provider>
    </AssetSourcePickerContext.Provider>
  );
}

export function useAssetSourcePicker() {
  return reactExports.useContext(AssetSourcePickerContext);
}

async function notifyBrowserCanvasImport(workspaceId2, addFiles, t2) {
  try {
    const nodeIds = await addFiles();
    if (nodeIds.length === 0) {
      dedupedToast.error(
        t2("workspace.browser.pluginCanvasError", "添加到画布失败，请重试"),
      );
      return;
    }
    const toastId = dedupedToast.success(
      t2("workspace.browser.pluginAddedToCanvas", "已添加到画布"),
      {
        duration: 8e3,
        action: (
          <Button$1
            variant="default"
            size="default"
            className="ml-auto min-w-14 shrink-0 px-3"
            data-action-ui-id="browser-toast-view-on-canvas"
            onClick={() => {
              dedupedToast.dismiss(toastId);
              workspaceEvents.fireCanvasFocus(workspaceId2, nodeIds, {
                select: true,
                preferParentGroup: false,
              });
            }}
          >
            {t2("workspace.browser.viewOnCanvas", "查看")}
          </Button$1>
        ),
      },
    );
  } catch (error) {
    canvasLog.error("Browser file import to canvas failed", {
      error,
    });
    dedupedToast.error(
      t2("workspace.browser.pluginCanvasError", "添加到画布失败，请重试"),
    );
  }
}

export function useBrowserCanvasImport(
  currentWorkspace,
  isActive2,
  handleSystemPasteToCanvas,
) {
  const { t: t2 } = useTranslation();
  reactExports.useEffect(() => {
    if (isActive2 === false || !currentWorkspace) return;
    const subscription = workspaceEvents.onAddFilesToCanvas(
      ({ files, source }) => {
        if (files.length === 0) return;
        void notifyBrowserCanvasImport(
          currentWorkspace,
          () => handleSystemPasteToCanvas(files, void 0, source),
          t2,
        );
      },
    );
    return () => subscription.dispose();
  }, [currentWorkspace, handleSystemPasteToCanvas, isActive2, t2]);
}

const ANIMATED_IMAGE_EXTENSIONS = new Set(["gif"]);

export function filenameExtension(filename) {
  const dot2 = filename.lastIndexOf(".");
  return dot2 > -1 ? filename.slice(dot2 + 1).toLocaleLowerCase() : "";
}

export function isAnnotatableImage(attachment) {
  return (
    (attachment.kind ?? "file") === "file" &&
    attachment.fileType === "image" &&
    attachment.status === "done" &&
    Boolean(attachment.previewUrl) &&
    !ANIMATED_IMAGE_EXTENSIONS.has(filenameExtension(attachment.filename))
  );
}

export function isSameImageAnnotationTarget(current2, snapshot2) {
  return (
    current2.id === snapshot2.id &&
    current2.filename === snapshot2.filename &&
    current2.previewUrl === snapshot2.previewUrl &&
    current2.relativePath === snapshot2.relativePath
  );
}
