// create-expanded-composer-actions-measurer.jsx
import { withThumbnail } from "../workspace/tool-label-definitions.js";
import { reactExports } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { getDocText } from "../text-editor/get-wire-content-text.jsx";

export function computeComposerActions({ agentRunning, canSend, hasCancel }) {
  const showStopButton = agentRunning && !canSend && hasCancel;
  const showSendButton = !showStopButton;
  return {
    showSendButton,
    showStopButton,
  };
}

export function restoreMentionDraft(schema2, draft, text2, refreshMention) {
  if (!draft) return null;
  try {
    const doc2 = schema2.nodeFromJSON(draft);
    doc2.check();
    if (doc2.type !== schema2.topNodeType || getDocText(doc2) !== text2)
      return null;
    const refresh = (node2) => {
      if (node2.type === "mentionRef") {
        const attrs = node2.attrs;
        if (typeof attrs.path !== "string" || typeof attrs.name !== "string") {
          throw new Error("Invalid mention draft");
        }
        return {
          ...node2,
          attrs: refreshMention(attrs),
        };
      }
      return node2.content
        ? {
            ...node2,
            content: node2.content.map(refresh),
          }
        : node2;
    };
    return refresh(doc2.toJSON());
  } catch {
    return null;
  }
}

export const MENTION_THUMB_PX$1 = 18;

export const MENTION_PREVIEW_PX = 180;

export function buildMentionMediaUrl(
  gatewayUrl2,
  kind,
  workspaceRelativePath,
  displayWidth,
) {
  if (kind === "text" || kind === "other") return void 0;
  const encoded = workspaceRelativePath
    .split("/")
    .map(encodeURIComponent)
    .join("/");
  const prefix = kind === "image" ? "/files/" : "/api/thumbnail/";
  const base2 = gatewayUrl2(`${prefix}${encoded}`);
  return withThumbnail(base2, displayWidth);
}

export function buildMentionPlayableUrl(
  gatewayUrl2,
  kind,
  workspaceRelativePath,
) {
  if (kind !== "video" && kind !== "audio") return void 0;
  const encoded = workspaceRelativePath
    .split("/")
    .map(encodeURIComponent)
    .join("/");
  return gatewayUrl2(`/files/${encoded}`);
}

export function buildFileMentionAttrs(file, scopedGatewayUrl) {
  return {
    path: file.path,
    name: file.name,
    modelName: null,
    kind: file.kind,
    mediaType: null,
    thumbUrl:
      buildMentionMediaUrl(
        scopedGatewayUrl,
        file.kind,
        file.path,
        MENTION_THUMB_PX$1,
      ) ?? null,
    previewUrl:
      buildMentionMediaUrl(
        scopedGatewayUrl,
        file.kind,
        file.path,
        MENTION_PREVIEW_PX,
      ) ?? null,
    mediaUrl:
      buildMentionPlayableUrl(scopedGatewayUrl, file.kind, file.path) ?? null,
  };
}

export function remapCommittedMentionPaths(
  editor,
  committed,
  scopedGatewayUrl,
) {
  if (!editor || !committed?.length) return false;
  const pathMap = new Map(committed.map((entry) => [entry.from, entry.to]));
  let tr2 = editor.state.tr;
  editor.state.doc.descendants((node2, pos) => {
    if (node2.type.name !== "mentionRef") return;
    const attrs = node2.attrs;
    if (
      attrs.kind === "model" ||
      attrs.kind === "connector" ||
      attrs.kind === "asset"
    )
      return;
    const nextPath = pathMap.get(attrs.path);
    if (!nextPath) return;
    const kind = attrs.kind;
    tr2 = tr2.setNodeMarkup(pos, void 0, {
      ...attrs,
      path: nextPath,
      thumbUrl:
        buildMentionMediaUrl(
          scopedGatewayUrl,
          kind,
          nextPath,
          MENTION_THUMB_PX$1,
        ) ?? null,
      previewUrl:
        buildMentionMediaUrl(
          scopedGatewayUrl,
          kind,
          nextPath,
          MENTION_PREVIEW_PX,
        ) ?? null,
      mediaUrl:
        buildMentionPlayableUrl(scopedGatewayUrl, kind, nextPath) ?? null,
    });
  });
  if (!tr2.docChanged) return false;
  editor.view.dispatch(tr2);
  return true;
}

const COMPOSER_ACTIONS_RELEASE_BUFFER_PX = 8;

export function resolveComposerActionsCompact({
  availableWidth,
  expandedRequiredWidth,
  compact,
}) {
  if (availableWidth <= 0 || expandedRequiredWidth <= 0) return compact;
  const requiredWidth = compact
    ? expandedRequiredWidth + COMPOSER_ACTIONS_RELEASE_BUFFER_PX
    : expandedRequiredWidth;
  return availableWidth < requiredWidth;
}

const LEFT_ACTIONS_SELECTOR = '[data-composer-actions-left="true"]';

const RIGHT_ACTIONS_SELECTOR = '[data-composer-actions-right="true"]';

const TEST_DRIVER_SELECTOR = "[data-action-ui-id]";

function forceIntrinsicWidth(element2) {
  element2.style.flex = "0 0 auto";
  element2.style.width = "max-content";
  element2.style.minWidth = "max-content";
  element2.style.maxWidth = "none";
  element2.style.overflow = "visible";
}

function stripCloneMetadata(clone2) {
  for (const element2 of [clone2, ...clone2.querySelectorAll("[id]")]) {
    element2.removeAttribute("id");
  }
  for (const element2 of [
    clone2,
    ...clone2.querySelectorAll(TEST_DRIVER_SELECTOR),
  ]) {
    element2.removeAttribute("data-action-ui-id");
  }
  clone2.removeAttribute("data-composer-action-row");
  clone2
    .querySelector(LEFT_ACTIONS_SELECTOR)
    ?.removeAttribute("data-composer-actions-left");
  clone2
    .querySelector(RIGHT_ACTIONS_SELECTOR)
    ?.removeAttribute("data-composer-actions-right");
}

function createIntrinsicClone(row) {
  const clone2 = row.cloneNode(true);
  const left = clone2.querySelector(LEFT_ACTIONS_SELECTOR);
  const right = clone2.querySelector(RIGHT_ACTIONS_SELECTOR);
  const leftContent = left?.firstElementChild;
  forceIntrinsicWidth(clone2);
  clone2.style.display = "flex";
  clone2.style.flexWrap = "nowrap";
  if (left) forceIntrinsicWidth(left);
  if (leftContent) forceIntrinsicWidth(leftContent);
  if (right) forceIntrinsicWidth(right);
  stripCloneMetadata(clone2);
  return clone2;
}

export function createExpandedComposerActionsMeasurer(row) {
  const ownerDocument2 = row.ownerDocument;
  const host = ownerDocument2.createElement("div");
  host.dataset.composerExpandedMeasurement = "true";
  host.setAttribute("aria-hidden", "true");
  host.setAttribute("inert", "");
  host.style.position = "fixed";
  host.style.left = "0";
  host.style.top = "0";
  host.style.width = "max-content";
  host.style.minWidth = "max-content";
  host.style.maxWidth = "none";
  host.style.visibility = "hidden";
  host.style.pointerEvents = "none";
  host.style.contain = "layout style paint";
  host.style.zIndex = "-1";
  (ownerDocument2.body ?? ownerDocument2.documentElement).append(host);
  const refresh = () => {
    host.replaceChildren(createIntrinsicClone(row));
  };
  const measure = () => {
    const width = Math.max(
      host.scrollWidth,
      host.getBoundingClientRect().width,
    );
    return Number.isFinite(width) && width > 0 ? Math.ceil(width) : 0;
  };
  const dispose2 = () => {
    host.remove();
  };
  refresh();
  return {
    element: host,
    measure,
    refresh,
    dispose: dispose2,
  };
}

const ComposerActionsCompactContext = reactExports.createContext(false);

export function ComposerActionsCompactProvider({
  compact,
  children: children2,
}) {
  return (
    <ComposerActionsCompactContext.Provider value={compact}>
      {children2}
    </ComposerActionsCompactContext.Provider>
  );
}

export function useComposerActionsCompact() {
  return reactExports.useContext(ComposerActionsCompactContext);
}
