// get-wire-content-text.jsx
import { formatConnectorMention } from "../canvas/diagnostic-history-tools.js";
import {
  createConnectorInventory,
  Decoration$1 as Decoration,
  DecorationSet,
  Extension,
  Plugin,
  PluginKey,
  reactExports,
} from "../vendor.js";
import { homeService } from "../workspace/home-service.jsx";
import { connectorReferenceFromServer } from "../generation/use-mention-models.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { CreationGuidePlaceholder } from "./creation-guide-placeholder.jsx";
export function WorkspaceCreationGuidePlaceholder({
  triggerMention,
  triggerSlash,
}) {
  return (
    <CreationGuidePlaceholder
      guides={[]}
      source="workspace.chat"
      triggerMention={triggerMention}
      triggerSlash={triggerSlash}
    />
  );
}
export function connectorMentionToken(serverName, displayName) {
  return formatConnectorMention(serverName, displayName);
}
function isUsableConnector(server) {
  return (
    server.enabled &&
    (server.runtimeState === "connected" || server.runtimeState === "saved")
  );
}
const connectorInventory = createConnectorInventory(() =>
  homeService.customMcp.list(),
);
export function useConnectorInventory() {
  const snapshot = reactExports.useSyncExternalStore(
    connectorInventory.subscribe,
    connectorInventory.getSnapshot,
  );
  reactExports.useEffect(() => {
    void connectorInventory.refresh().catch(() => void 0);
  }, []);
  return {
    ...snapshot,
    refresh: connectorInventory.refresh,
    update: connectorInventory.update,
  };
}
export function useConnectorReferences() {
  const inventory = useConnectorInventory();
  const connectors = reactExports.useMemo(
    () =>
      inventory.servers
        .filter(isUsableConnector)
        .map(connectorReferenceFromServer)
        .sort((left, right) =>
          left.displayName.localeCompare(right.displayName),
        ),
    [inventory.servers],
  );
  const refresh = reactExports.useCallback(async () => {
    await inventory.refresh().catch(() => void 0);
  }, [inventory.refresh]);
  return {
    connectors,
    loading: !inventory.loaded && inventory.loading,
    refresh,
  };
}
const HEX_COLOR_PATTERN =
  /#(?:[\dA-Fa-f]{8}|[\dA-Fa-f]{6}|[\dA-Fa-f]{4}|[\dA-Fa-f]{3})(?![\dA-Fa-f])/g;
const URL_PATTERN = /https?:\/\/[^\s<>()]+/gi;
const FENCED_CODE_PATTERN = /```[\s\S]*?```/g;
const INLINE_CODE_PATTERN = /(`+)(?!`)[\s\S]*?\1/g;
const INLINE_MARKDOWN_LINK_PATTERN = /!?\[[^\]\n]*\]\((?:\\.|[^)\n])*\)/g;
const REFERENCE_MARKDOWN_LINK_PATTERN = /!?\[[^\]\n]*\]\[[^\]\n]*\]/g;
const IDENTIFIER_CHAR_PATTERN = /[\dA-Za-z_]/;
function collectExcludedRanges(text) {
  const ranges = [];
  for (const pattern of [
    URL_PATTERN,
    FENCED_CODE_PATTERN,
    INLINE_CODE_PATTERN,
    INLINE_MARKDOWN_LINK_PATTERN,
    REFERENCE_MARKDOWN_LINK_PATTERN,
  ]) {
    pattern.lastIndex = 0;
    for (
      let match = pattern.exec(text);
      match;
      match = pattern.exec(text)
    ) {
      ranges.push({
        start: match.index,
        end: match.index + match[0].length,
      });
    }
  }
  return ranges;
}
function overlapsExcludedRange(start, end, ranges) {
  return ranges.some((range) => start < range.end && end > range.start);
}
function colorHasAlpha(value) {
  return value.length === 5 || value.length === 9;
}
export function findInlineVisualTokens(text, { allowEnd = true } = {}) {
  const excludedRanges = collectExcludedRanges(text);
  const tokens = [];
  HEX_COLOR_PATTERN.lastIndex = 0;
  for (
    let match = HEX_COLOR_PATTERN.exec(text);
    match;
    match = HEX_COLOR_PATTERN.exec(text)
  ) {
    const raw = match[0];
    const start = match.index;
    const end = start + raw.length;
    const previous = text[start - 1];
    const next = text[end];
    if (previous && IDENTIFIER_CHAR_PATTERN.test(previous)) continue;
    if (next && IDENTIFIER_CHAR_PATTERN.test(next)) continue;
    if (!allowEnd && end === text.length) continue;
    if (overlapsExcludedRange(start, end, excludedRanges)) continue;
    tokens.push({
      type: "color",
      start,
      end,
      raw,
      value: raw.toUpperCase(),
      hasAlpha: colorHasAlpha(raw),
    });
  }
  return tokens;
}
const colorVisualPluginKey = new PluginKey("chatColorVisual");
function createColorSwatch(value, hasAlpha) {
  const swatch = document.createElement("span");
  swatch.className = "inline-color-swatch inline-color-swatch-widget";
  swatch.contentEditable = "false";
  swatch.setAttribute("aria-hidden", "true");
  swatch.dataset.colorValue = value;
  if (hasAlpha) swatch.dataset.hasAlpha = "true";
  const fill = document.createElement("span");
  fill.className = "inline-color-swatch-fill";
  fill.style.backgroundColor = value;
  swatch.append(fill);
  return swatch;
}
function buildColorDecorations(doc) {
  const decorations = [];
  doc.descendants((node, position) => {
    if (!node.isText || !node.text) return;
    for (const token of findInlineVisualTokens(node.text)) {
      const from = position + token.start;
      const to = position + token.end;
      decorations.push(
        Decoration.inline(from, to, {
          class: "inline-color-value-label",
          "data-inline-visual": "color",
          "data-color-value": token.value,
        }),
      );
      decorations.push(
        Decoration.widget(
          to,
          () => createColorSwatch(token.value, token.hasAlpha),
          {
            key: `color-${position}-${token.start}-${token.value}`,
            side: 1,
          },
        ),
      );
    }
  });
  return DecorationSet.create(doc, decorations);
}
export const ColorVisualDecoration = Extension.create({
  name: "chatColorVisual",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: colorVisualPluginKey,
        state: {
          init: (_config, state) => buildColorDecorations(state.doc),
          apply(tr, previous) {
            return tr.docChanged ? buildColorDecorations(tr.doc) : previous;
          },
        },
        props: {
          decorations(state) {
            return colorVisualPluginKey.getState(state) ?? DecorationSet.empty;
          },
        },
      }),
    ];
  },
});
export const ghostTextPluginKey = new PluginKey("chatGhostText");
function createGhostWidget(text) {
  const wrapper = document.createElement("span");
  wrapper.className = "ghost-text-wrapper";
  wrapper.contentEditable = "false";
  wrapper.setAttribute("data-action-ui-id", "ghost-text-overlay");
  wrapper.setAttribute("aria-hidden", "true");
  const ghost = document.createElement("span");
  ghost.className = "ghost-text";
  ghost.textContent = text;
  wrapper.appendChild(ghost);
  const badge = document.createElement("span");
  badge.className = "ghost-tab-badge";
  badge.textContent = "Tab";
  wrapper.appendChild(badge);
  return wrapper;
}
export const GhostTextDecoration = Extension.create({
  name: "chatGhostText",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: ghostTextPluginKey,
        state: {
          init() {
            return null;
          },
          apply(tr, prev) {
            const meta = tr.getMeta(ghostTextPluginKey);
            if (meta !== void 0) return meta;
            return prev;
          },
        },
        props: {
          decorations(state) {
            const text = ghostTextPluginKey.getState(state);
            if (!text) return DecorationSet.empty;
            const pos = Math.max(1, state.doc.content.size - 1);
            const widget = Decoration.widget(
              pos,
              () => createGhostWidget(text),
              {
                side: 1,
              },
            );
            return DecorationSet.create(state.doc, [widget]);
          },
        },
      }),
    ];
  },
});
export function mentionRefLeafText(leafNode) {
  if (leafNode.type.name === "hardBreak") return "\n";
  if (leafNode.type.name !== "mentionRef") return "";
  const attrs = leafNode.attrs;
  if (attrs.isFolder && attrs.folderResolvedPath) {
    return attrs.folderResolvedPath;
  }
  if (attrs.kind === "asset") {
    return attrs.name ? `@${attrs.name}` : "";
  }
  const marker = attrs.markerStyle ?? "at";
  if (attrs.kind === "connector") {
    return marker === "bracket"
      ? `[${attrs.name}]`
      : formatConnectorMention(attrs.path, attrs.name);
  }
  const value =
    attrs.kind === "model"
      ? `model:${attrs.mentionName || attrs.modelName || attrs.name}`
      : attrs.kind === "workflow"
        ? `workflow:${attrs.path}`
        : attrs.path;
  if (!value) return "";
  return marker === "bracket" ? `[${attrs.name}]` : `@${value}`;
}
function getWireContentText(content) {
  let text = "";
  let previous;
  for (const node of content) {
    const value =
      node.type === "text"
        ? (node.text ?? "")
        : node.content
          ? getWireContentText(node.content)
          : mentionRefLeafText({
              type: {
                name: node.type ?? "",
              },
              attrs: node.attrs ?? {},
            });
    if (
      previous &&
      (previous.type === "paragraph" || node.type === "paragraph")
    ) {
      text += "\n";
    } else if (
      text &&
      value &&
      (previous?.type === "mentionRef" || node.type === "mentionRef") &&
      !/\s$/.test(text) &&
      !/^\s/.test(value)
    ) {
      text += " ";
    }
    text += value;
    previous = node;
  }
  return text;
}
export function getDocText(doc) {
  return doc.textBetween(0, doc.content.size, "\n", mentionRefLeafText);
}
export function getDocTriggerText(doc) {
  return doc.textBetween(0, doc.content.size, "\n", (node) =>
    node.type.name === "mentionRef"
      ? " ".repeat(mentionRefLeafText(node).length)
      : mentionRefLeafText(node),
  );
}
export function getWireFragmentText(fragment) {
  return getWireContentText(fragment.toJSON() ?? []);
}
export function getDocWireText(doc) {
  return getWireFragmentText(doc.content);
}
