// get-wire-content-text.jsx
import { formatConnectorMention } from "../canvas/diagnostic-history-tools.js";
import {
  createConnectorInventory,
  Decoration$1,
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

export function connectorMentionToken(serverName, displayName2) {
  return formatConnectorMention(serverName, displayName2);
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
  const snapshot2 = reactExports.useSyncExternalStore(
    connectorInventory.subscribe,
    connectorInventory.getSnapshot,
  );
  reactExports.useEffect(() => {
    void connectorInventory.refresh().catch(() => void 0);
  }, []);
  return {
    ...snapshot2,
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

function collectExcludedRanges(text2) {
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
      let match2 = pattern.exec(text2);
      match2;
      match2 = pattern.exec(text2)
    ) {
      ranges.push({
        start: match2.index,
        end: match2.index + match2[0].length,
      });
    }
  }
  return ranges;
}

function overlapsExcludedRange(start2, end2, ranges) {
  return ranges.some((range2) => start2 < range2.end && end2 > range2.start);
}

function colorHasAlpha(value) {
  return value.length === 5 || value.length === 9;
}

export function findInlineVisualTokens(text2, { allowEnd = true } = {}) {
  const excludedRanges = collectExcludedRanges(text2);
  const tokens2 = [];
  HEX_COLOR_PATTERN.lastIndex = 0;
  for (
    let match2 = HEX_COLOR_PATTERN.exec(text2);
    match2;
    match2 = HEX_COLOR_PATTERN.exec(text2)
  ) {
    const raw2 = match2[0];
    const start2 = match2.index;
    const end2 = start2 + raw2.length;
    const previous2 = text2[start2 - 1];
    const next2 = text2[end2];
    if (previous2 && IDENTIFIER_CHAR_PATTERN.test(previous2)) continue;
    if (next2 && IDENTIFIER_CHAR_PATTERN.test(next2)) continue;
    if (!allowEnd && end2 === text2.length) continue;
    if (overlapsExcludedRange(start2, end2, excludedRanges)) continue;
    tokens2.push({
      type: "color",
      start: start2,
      end: end2,
      raw: raw2,
      value: raw2.toUpperCase(),
      hasAlpha: colorHasAlpha(raw2),
    });
  }
  return tokens2;
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

function buildColorDecorations(doc2) {
  const decorations2 = [];
  doc2.descendants((node2, position2) => {
    if (!node2.isText || !node2.text) return;
    for (const token2 of findInlineVisualTokens(node2.text)) {
      const from2 = position2 + token2.start;
      const to = position2 + token2.end;
      decorations2.push(
        Decoration$1.inline(from2, to, {
          class: "inline-color-value-label",
          "data-inline-visual": "color",
          "data-color-value": token2.value,
        }),
      );
      decorations2.push(
        Decoration$1.widget(
          to,
          () => createColorSwatch(token2.value, token2.hasAlpha),
          {
            key: `color-${position2}-${token2.start}-${token2.value}`,
            side: 1,
          },
        ),
      );
    }
  });
  return DecorationSet.create(doc2, decorations2);
}

export const ColorVisualDecoration = Extension.create({
  name: "chatColorVisual",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: colorVisualPluginKey,
        state: {
          init: (_config, state2) => buildColorDecorations(state2.doc),
          apply(tr2, previous2) {
            return tr2.docChanged ? buildColorDecorations(tr2.doc) : previous2;
          },
        },
        props: {
          decorations(state2) {
            return colorVisualPluginKey.getState(state2) ?? DecorationSet.empty;
          },
        },
      }),
    ];
  },
});

export const ghostTextPluginKey = new PluginKey("chatGhostText");

function createGhostWidget(text2) {
  const wrapper = document.createElement("span");
  wrapper.className = "ghost-text-wrapper";
  wrapper.contentEditable = "false";
  wrapper.setAttribute("data-action-ui-id", "ghost-text-overlay");
  wrapper.setAttribute("aria-hidden", "true");
  const ghost = document.createElement("span");
  ghost.className = "ghost-text";
  ghost.textContent = text2;
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
          apply(tr2, prev) {
            const meta2 = tr2.getMeta(ghostTextPluginKey);
            if (meta2 !== void 0) return meta2;
            return prev;
          },
        },
        props: {
          decorations(state2) {
            const text2 = ghostTextPluginKey.getState(state2);
            if (!text2) return DecorationSet.empty;
            const pos = Math.max(1, state2.doc.content.size - 1);
            const widget = Decoration$1.widget(
              pos,
              () => createGhostWidget(text2),
              {
                side: 1,
              },
            );
            return DecorationSet.create(state2.doc, [widget]);
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

function getWireContentText(content2) {
  let text2 = "";
  let previous2;
  for (const node2 of content2) {
    const value =
      node2.type === "text"
        ? (node2.text ?? "")
        : node2.content
          ? getWireContentText(node2.content)
          : mentionRefLeafText({
              type: {
                name: node2.type ?? "",
              },
              attrs: node2.attrs ?? {},
            });
    if (
      previous2 &&
      (previous2.type === "paragraph" || node2.type === "paragraph")
    ) {
      text2 += "\n";
    } else if (
      text2 &&
      value &&
      (previous2?.type === "mentionRef" || node2.type === "mentionRef") &&
      !/\s$/.test(text2) &&
      !/^\s/.test(value)
    ) {
      text2 += " ";
    }
    text2 += value;
    previous2 = node2;
  }
  return text2;
}

export function getDocText(doc2) {
  return doc2.textBetween(0, doc2.content.size, "\n", mentionRefLeafText);
}

export function getDocTriggerText(doc2) {
  return doc2.textBetween(0, doc2.content.size, "\n", (node2) =>
    node2.type.name === "mentionRef"
      ? " ".repeat(mentionRefLeafText(node2).length)
      : mentionRefLeafText(node2),
  );
}

export function getWireFragmentText(fragment2) {
  return getWireContentText(fragment2.toJSON() ?? []);
}

export function getDocWireText(doc2) {
  return getWireFragmentText(doc2.content);
}
