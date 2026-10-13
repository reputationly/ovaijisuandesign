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
export function restoreMentionDraft(schema, draft, text, refreshMention) {
  if (!draft) return null;
  try {
    const doc = schema.nodeFromJSON(draft);
    doc.check();
    if (doc.type !== schema.topNodeType || getDocText(doc) !== text)
      return null;
    const refresh = (node) => {
      if (node.type === "mentionRef") {
        const attrs = node.attrs;
        if (typeof attrs.path !== "string" || typeof attrs.name !== "string") {
          throw new Error("Invalid mention draft");
        }
        return {
          ...node,
          attrs: refreshMention(attrs),
        };
      }
      return node.content
        ? {
            ...node,
            content: node.content.map(refresh),
          }
        : node;
    };
    return refresh(doc.toJSON());
  } catch {
    return null;
  }
}
export const MENTION_THUMB_PX = 18;
export const MENTION_PREVIEW_PX = 180;
export function buildMentionMediaUrl(
  gatewayUrl,
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
  const base = gatewayUrl(`${prefix}${encoded}`);
  return withThumbnail(base, displayWidth);
}
export function buildMentionPlayableUrl(
  gatewayUrl,
  kind,
  workspaceRelativePath,
) {
  if (kind !== "video" && kind !== "audio") return void 0;
  const encoded = workspaceRelativePath
    .split("/")
    .map(encodeURIComponent)
    .join("/");
  return gatewayUrl(`/files/${encoded}`);
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
        MENTION_THUMB_PX,
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
  let transaction = editor.state.tr;
  editor.state.doc.descendants((node, position) => {
    if (node.type.name !== "mentionRef") return;
    const attrs = node.attrs;
    if (
      attrs.kind === "model" ||
      attrs.kind === "connector" ||
      attrs.kind === "asset"
    )
      return;
    const nextPath = pathMap.get(attrs.path);
    if (!nextPath) return;
    const kind = attrs.kind;
    transaction = transaction.setNodeMarkup(position, void 0, {
      ...attrs,
      path: nextPath,
      thumbUrl:
        buildMentionMediaUrl(
          scopedGatewayUrl,
          kind,
          nextPath,
          MENTION_THUMB_PX,
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
  if (!transaction.docChanged) return false;
  editor.view.dispatch(transaction);
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
function forceIntrinsicWidth(element) {
  element.style.flex = "0 0 auto";
  element.style.width = "max-content";
  element.style.minWidth = "max-content";
  element.style.maxWidth = "none";
  element.style.overflow = "visible";
}
function stripCloneMetadata(clone) {
  for (const element of [clone, ...clone.querySelectorAll("[id]")]) {
    element.removeAttribute("id");
  }
  for (const element of [
    clone,
    ...clone.querySelectorAll(TEST_DRIVER_SELECTOR),
  ]) {
    element.removeAttribute("data-action-ui-id");
  }
  clone.removeAttribute("data-composer-action-row");
  clone
    .querySelector(LEFT_ACTIONS_SELECTOR)
    ?.removeAttribute("data-composer-actions-left");
  clone
    .querySelector(RIGHT_ACTIONS_SELECTOR)
    ?.removeAttribute("data-composer-actions-right");
}
function createIntrinsicClone(actionsRow) {
  const clone = actionsRow.cloneNode(true);
  const left = clone.querySelector(LEFT_ACTIONS_SELECTOR);
  const right = clone.querySelector(RIGHT_ACTIONS_SELECTOR);
  const leftContent = left?.firstElementChild;
  forceIntrinsicWidth(clone);
  clone.style.display = "flex";
  clone.style.flexWrap = "nowrap";
  if (left) forceIntrinsicWidth(left);
  if (leftContent) forceIntrinsicWidth(leftContent);
  if (right) forceIntrinsicWidth(right);
  stripCloneMetadata(clone);
  return clone;
}
export function createExpandedComposerActionsMeasurer(actionsRow) {
  const ownerDocument = actionsRow.ownerDocument;
  const host = ownerDocument.createElement("div");
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
  (ownerDocument.body ?? ownerDocument.documentElement).append(host);
  const refresh = () => {
    host.replaceChildren(createIntrinsicClone(actionsRow));
  };
  const measure = () => {
    const width = Math.max(
      host.scrollWidth,
      host.getBoundingClientRect().width,
    );
    return Number.isFinite(width) && width > 0 ? Math.ceil(width) : 0;
  };
  const dispose = () => {
    host.remove();
  };
  refresh();
  return {
    element: host,
    measure,
    refresh,
    dispose,
  };
}
const ComposerActionsCompactContext = reactExports.createContext(false);
export function ComposerActionsCompactProvider({
  compact,
  children,
}) {
  return (
    <ComposerActionsCompactContext.Provider value={compact}>
      {children}
    </ComposerActionsCompactContext.Provider>
  );
}
export function useComposerActionsCompact() {
  return reactExports.useContext(ComposerActionsCompactContext);
}
