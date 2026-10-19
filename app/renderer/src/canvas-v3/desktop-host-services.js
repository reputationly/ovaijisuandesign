/**
 * 桌面端 v3 宿主能力装配 —— 从产物主包取回（第 85 轮）。
 *
 * `createDesktopCanvasV3HostServices(platform, workspaceId, binding)` 把三样东西合起来：
 *   - `DESKTOP_UI`：纯前端能力
 *   - `DESKTOP_NATIVE`：仅在 Electron 下才有的原生能力（剪贴板传输、媒体定位/复制）
 *   - `createFrameChatComposer` / `useDesktopSaveFiles`：按 workspace 绑定的两项服务
 *
 * 原生那几项通过 DI 容器 `services()` 取 `ICanvasClipboardMainService` / `IResourceMediaMainService`；
 * 这两个服务标识符目前还没还原。
 *
 * 依赖已全部接上（第 87 轮），可以被 `canvas-v3-hooks.js` 引用。
 */
import { isElectron } from "../infra/use-canvas-node-assets-store.js";
import {
  ICanvasClipboardMainService,
  IClipboardService,
  IResourceImageMainService,
  IResourceMediaMainService,
  LocalFolderIcon,
} from "../workspace/home-service.jsx";
import { PageStateBoundary } from "../assets/page-state-boundary.jsx";
import { guardAccountSubmission } from "../infra/agent-http-client.js";
import { useBrowserOverlayDialogProps } from "../infra/dialog-content.jsx";
import { useMediaActions } from "../settings/use-media-actions.js";
import { workspaceEvents } from "../workspace/topbar-state-context.jsx";
import { instantiationService as sharedInstantiationService } from "../workspace/home-service.jsx";
import { useBrowserHoverPreview } from "../infra/dialog-content.jsx";
import {
  CanvasTagAssetPreview,
  canvasV3ImageLuts,
  guardUserNameText,
  resolveAttachment,
} from "./desktop-misc.jsx";
import { usePromptFontSizePreference } from "./prompt-font-size-preference.js";
import { createProjectResourceClient } from "./project-resource-client.js";


// 产物里 `services()` 是懒加载 DI 容器的函数；我们树里 `home-service.jsx` 直接导出了实例，
// 这里包一层 async 保持调用点 `{ const { instantiationService } = await services() }` 不变。
const services = async () => ({ instantiationService: sharedInstantiationService });

function useDesktopModalGate(requested) {
  return useBrowserHoverPreview(requested);
}

const DESKTOP_TEXT_EDIT_EVENTS = {
  active: (workspaceId, session, active2, document2) => workspaceEvents.fireTextEditActive(workspaceId, session, active2, document2),
  documentChanged: (workspaceId, session, document2) => workspaceEvents.fireTextEditDocumentChanged(workspaceId, session, document2),
  annotationsChanged: (workspaceId, session, annotations2) => workspaceEvents.fireAnnotationsChanged(workspaceId, session, annotations2),
  annotationActivated: (workspaceId, session, id2) => workspaceEvents.fireAnnotationActivated(workspaceId, session, id2),
  selectionChanged: (workspaceId, session, selection2) => workspaceEvents.fireTextEditSelection(workspaceId, session, selection2),
  onAnnotationCommand: (listener) => workspaceEvents.onAnnotationCommand(listener)
};

const DESKTOP_IMAGE_TOOLS = {
  importFetch: (fetch2) => fetch2,
  luts: canvasV3ImageLuts,
  logError: (message2, source) => window.hilo?.logger?.error(message2, source)
};

const DESKTOP_UI = {
  logInfo: (message2, source) => void window.hilo?.logger?.info(message2, source),
  textEditEvents: DESKTOP_TEXT_EDIT_EVENTS,
  fileDownloads: true,
  guardGenerationSubmission: () => guardAccountSubmission("canvas").allowed,
  // Same text review as project / workspace / folder names.
  guardUserText: guardUserNameText,
  localFolderIcon: LocalFolderIcon,
  useModalGate: useDesktopModalGate,
  useDialogProps: useBrowserOverlayDialogProps,
  // Same device-wide store as the Desktop-only composers (audio, panorama, text, chat).
  usePromptFontSize: usePromptFontSizePreference,
  // Same asset hover preview as the legacy canvas tag dock.
  tagItemPreview: CanvasTagAssetPreview,
  // Editor load failures keep Desktop's own Page State (copy, artwork, Electron network state).
  PageStateBoundary,
  imageTools: DESKTOP_IMAGE_TOOLS
};

const DESKTOP_NATIVE = isElectron() ? {
  async requestPaste(isCurrent) {
    const { instantiationService: instantiationService2 } = await services();
    if (!isCurrent()) return;
    const result = await instantiationService2.invokeFunction((accessor) => accessor.get(IClipboardService)).triggerPasteOnFocusedWindow();
    if (!result.ok) throw new Error(result.reason);
  },
  async writeMarkedImage(png, html2) {
    const { instantiationService: instantiationService2 } = await services();
    await instantiationService2.invokeFunction((accessor) => accessor.get(IClipboardService)).writeImageWithHtml(new Uint8Array(png), html2);
  },
  async revealImage(request) {
    const { instantiationService: instantiationService2 } = await services();
    await instantiationService2.invokeFunction((accessor) => accessor.get(IResourceImageMainService)).revealImage(request);
  },
  async saveMedia(request) {
    const { instantiationService: instantiationService2 } = await services();
    return instantiationService2.invokeFunction((accessor) => accessor.get(IResourceMediaMainService)).saveAs(request);
  }
} : {};

function useDesktopSaveFiles() {
  return useMediaActions().saveManyAs;
}

function createFrameChatComposer(binding) {
  const resources = binding.resources ?? createProjectResourceClient(binding.request);
  const workspaceId = binding.workspaceId;
  return {
    async draft(input, options2) {
      binding.assertLive();
      const refs = input.resources ?? [];
      const [attachments, compositions] = await Promise.all([
        Promise.all(refs.map((ref) => resolveAttachment(resources, ref, options2?.signal))),
        Promise.all(
          (input.compositions ?? []).map(async ({ compositionId }) => {
            const scope = binding.compositions;
            if (!scope?.workspaceRoot) throw new Error("CHAT_COMPOSITION_UNAVAILABLE");
            const composition2 = await scope.reader.get(compositionId, { signal: options2?.signal });
            if (composition2.compositionId !== compositionId || composition2.lifecycle !== "active")
              throw new Error("CHAT_COMPOSITION_UNAVAILABLE");
            return { compositionId, name: composition2.name, workspaceRoot: scope.workspaceRoot };
          })
        )
      ]);
      binding.assertLive();
      if (options2?.signal?.aborted) throw new Error("CHAT_DRAFT_ABORTED");
      for (const attachment of attachments) {
        workspaceEvents.fireAddToChat(
          attachment.relativePath,
          attachment.filename,
          void 0,
          void 0,
          workspaceId
        );
      }
      for (const composition2 of compositions) {
        if (binding.onCompositionDraft) binding.onCompositionDraft(composition2);
        else workspaceEvents.fireAddCompositionToChat(composition2);
      }
      if (input.text?.trim()) workspaceEvents.fireChatDraftText(input.text, workspaceId);
      if (attachments.length || compositions.length || input.text?.trim())
        workspaceEvents.fireRevealChat({ workspaceId, focus: true });
    },
    async send(input, options2) {
      binding.assertLive();
      const attachments = await Promise.all(
        (input.resources ?? []).map((ref) => resolveAttachment(resources, ref, options2?.signal))
      );
      binding.assertLive();
      if (options2?.signal?.aborted) throw new Error("CHAT_SEND_ABORTED");
      const messageId = crypto.randomUUID();
      const accepted2 = await workspaceEvents.fireHostChatSend({
        workspaceId,
        text: input.text,
        attachments: attachments.map((attachment) => attachment.relativePath),
        messageId
      });
      if (!accepted2) throw new Error("CHAT_SEND_REJECTED");
      return { messageId };
    }
  };
}

function createDesktopCanvasV3HostServices(platform2, workspaceId, binding) {
  const writeImageData = platform2.clipboard.writeImageData;
  const identity2 = binding && {
    claim: binding.claim,
    instanceId: binding.instanceId,
    generation: binding.generation
  };
  return Object.freeze({
    ...DESKTOP_UI,
    ...DESKTOP_NATIVE,
    chatComposer: (binding2) => createFrameChatComposer({ ...binding2, workspaceId }),
    useSaveFiles: useDesktopSaveFiles,
    ...isElectron() && identity2 ? {
      async transferClipboard(input) {
        const { instantiationService: instantiationService2 } = await services();
        return instantiationService2.invokeFunction((accessor) => accessor.get(ICanvasClipboardMainService)).transfer({ ...input, targetWorkspaceId: workspaceId, identity: identity2 });
      },
      // Same fixed-version native file actions as the project asset tree, bound to this
      // workspace; the main service rejects a retired binding.
      async revealMedia(reference) {
        const { instantiationService: instantiationService2 } = await services();
        await instantiationService2.invokeFunction((accessor) => accessor.get(IResourceMediaMainService)).reveal({
          resourceId: reference.resourceId,
          versionId: reference.versionId,
          workspaceId,
          identity: { ...identity2 }
        });
      },
      async revealMediaFiles(references) {
        const { instantiationService: instantiationService2 } = await services();
        await instantiationService2.invokeFunction((accessor) => accessor.get(IResourceMediaMainService)).revealFiles({
          workspaceId,
          identity: { ...identity2 },
          resources: references.map(({ resourceId: resourceId2, versionId }) => ({
            resourceId: resourceId2,
            versionId
          }))
        });
      },
      async copyMediaFile(reference) {
        const { instantiationService: instantiationService2 } = await services();
        return instantiationService2.invokeFunction((accessor) => accessor.get(IResourceMediaMainService)).copyToClipboard({
          resourceId: reference.resourceId,
          versionId: reference.versionId,
          workspaceId,
          identity: { ...identity2 }
        });
      },
      async copyMediaFiles(references) {
        const { instantiationService: instantiationService2 } = await services();
        return instantiationService2.invokeFunction((accessor) => accessor.get(IResourceMediaMainService)).copyFilesToClipboard({
          workspaceId,
          identity: { ...identity2 },
          resources: references.map(({ resourceId: resourceId2, versionId, markdown: markdown2 }) => ({
            resourceId: resourceId2,
            versionId,
            ...markdown2 ? { markdown: markdown2 } : {}
          }))
        });
      }
    } : {},
    ...writeImageData ? { writeImageData: (png) => writeImageData.call(platform2.clipboard, png) } : {}
  });
}

export { services, useDesktopModalGate, DESKTOP_TEXT_EDIT_EVENTS, DESKTOP_IMAGE_TOOLS, DESKTOP_UI, DESKTOP_NATIVE, createFrameChatComposer, useDesktopSaveFiles, createDesktopCanvasV3HostServices };
