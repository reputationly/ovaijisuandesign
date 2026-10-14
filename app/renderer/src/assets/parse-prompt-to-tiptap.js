// parse-prompt-to-tiptap.js
import reactExports from "react";
import { useAssetMetadataApi } from "../infra/agent-http-client.js";
import { useCanvasActions } from "../media-editing/use-canvas-actions.js";
import { resolveReferenceAudios } from "../generation/resolve-reference-texts.js";
import { getAssetMetaByNodeIdFromStore } from "../canvas/fullscreen-icon.jsx";
import {
  findAllMentions,
  isCanvasReferenceUri,
  isCanvasSubjectReference,
  parseCanvasReference,
} from "../text-editor/table-document-to-llm-content.js";
import { useCanvasBridge } from "../media-editing/package.jsx";
import { compileChipPromptForModel } from "./compile-chip-prompt-for-model.js";
import { composePromptWithReferenceText } from "../canvas/is-reexecutable-generation-node.js";

export function useUpstreamReferenceAudios(nodeId) {
  const assetMetadataStore = useAssetMetadataApi();
  const { getIncomingSourceIds, subscribeIncomingChange } = useCanvasActions();
  const [incomingKey, setIncomingKey] = reactExports.useState(() =>
    [...getIncomingSourceIds(nodeId)].sort().join("|"),
  );
  reactExports.useEffect(() => {
    const unsubscribe = subscribeIncomingChange(nodeId, () => {
      const key = [...getIncomingSourceIds(nodeId)].sort().join("|");
      setIncomingKey((prev) => (prev === key ? prev : key));
    });
    return unsubscribe;
  }, [nodeId, getIncomingSourceIds, subscribeIncomingChange]);
  return reactExports.useMemo(
    () =>
      resolveReferenceAudios(
        getIncomingSourceIds(nodeId),
        void 0,
        assetMetadataStore,
      ),
    [nodeId, incomingKey, getIncomingSourceIds, assetMetadataStore],
  );
}

function resolveSnapshot(
  nodeId,
  mediaType,
  getIncomingSourceIds,
  assetMetadataStore,
) {
  const sources = getIncomingSourceIds(nodeId);
  for (const sourceId of sources) {
    const sourceMeta = getAssetMetaByNodeIdFromStore(
      assetMetadataStore,
      sourceId,
    );
    if (sourceMeta?.type === mediaType && sourceMeta.model_id) {
      return {
        modelId: sourceMeta.model_id,
        params: sourceMeta.params ?? {},
      };
    }
  }
  return void 0;
}

export function useUpstreamSameTypeMeta(nodeId, mediaType) {
  const assetMetadataStore = useAssetMetadataApi();
  const { getIncomingSourceIds, subscribeIncomingChange } = useCanvasActions();
  const [incomingKey, setIncomingKey] = reactExports.useState(() =>
    [...getIncomingSourceIds(nodeId)].sort().join("|"),
  );
  reactExports.useEffect(() => {
    const unsubscribe = subscribeIncomingChange(nodeId, () => {
      const key = [...getIncomingSourceIds(nodeId)].sort().join("|");
      setIncomingKey((prev) => (prev === key ? prev : key));
    });
    return unsubscribe;
  }, [nodeId, getIncomingSourceIds, subscribeIncomingChange]);
  return reactExports.useMemo(
    () =>
      resolveSnapshot(
        nodeId,
        mediaType,
        getIncomingSourceIds,
        assetMetadataStore,
      ),
    [nodeId, mediaType, incomingKey, getIncomingSourceIds, assetMetadataStore],
  );
}

export function serializeMentionToken(path) {
  if (!path) return "";
  return `@[${path}]`;
}

function serializeInline(nodes, fileRefInclusion) {
  let text = "";
  for (const node of nodes) {
    if (node.type === "text") {
      text += node.text ?? "";
    } else if (fileRefInclusion !== "none" && node.type === "canvasFileRef") {
      const attrs = node.attrs;
      if (
        fileRefInclusion === "media-only" &&
        attrs?.kind === "text" &&
        parseCanvasReference(attrs?.path)?.target !== "entity"
      )
        continue;
      const path = String(attrs?.path ?? "");
      text += serializeMentionToken(path);
    } else if (node.type === "canvasRedrawRegion") {
      const attrs = node.attrs;
      const x1 = Number(attrs?.x1 ?? 0);
      const y1 = Number(attrs?.y1 ?? 0);
      const x2 = Number(attrs?.x2 ?? 999);
      const y2 = Number(attrs?.y2 ?? 999);
      text += `<bbox>${x1} ${y1} ${x2} ${y2}</bbox>`;
    }
  }
  return text;
}

function serializeDoc(doc, fileRefInclusion) {
  if (!doc.content) return "";
  const parts = [];
  for (const block of doc.content) {
    if (block.type === "paragraph") {
      parts.push(serializeInline(block.content ?? [], fileRefInclusion));
    }
  }
  return parts.join("\n");
}

export function extractCanvasEditorText(editor) {
  return serializeDoc(editor.getJSON(), "all");
}

export function extractCanvasEditorSubmitText(editor) {
  return serializeDoc(editor.getJSON(), "media-only");
}

export function extractCanvasEditorCountedText(editor) {
  return serializeDoc(editor.getJSON(), "none");
}

export function countPromptCharacters(text) {
  let count = 0;
  for (let index = 0; index < text.length; index += 1) {
    const codeUnit = text.charCodeAt(index);
    if (
      codeUnit >= 55296 &&
      codeUnit <= 56319 &&
      index + 1 < text.length &&
      text.charCodeAt(index + 1) >= 56320 &&
      text.charCodeAt(index + 1) <= 57343
    ) {
      index += 1;
    }
    count += 1;
  }
  return count;
}

export function collectTextChipPaths(editor) {
  const paths = [];
  editor.state.doc.descendants((node) => {
    if (node.type.name === "canvasFileRef" && node.attrs?.kind === "text") {
      const path = node.attrs?.path;
      if (typeof path === "string" && path) paths.push(path);
    }
  });
  return paths;
}

export function removeCanvasSubjectReferences(editor) {
  const paths = new Set();
  editor.state.doc.descendants((node) => {
    if (
      node.type.name === "canvasFileRef" &&
      isCanvasSubjectReference(node.attrs.path)
    )
      paths.add(node.attrs.path);
  });
  for (const path of paths) editor.commands.removeCanvasFileRefsByPath(path);
  return [...paths];
}

export function parsePromptToTiptap(text, lookup) {
  if (!text) {
    return {
      type: "doc",
      content: [
        {
          type: "paragraph",
        },
      ],
    };
  }
  const lines = text.split("\n");
  const paragraphs = lines.map((line) => {
    const inline = [];
    const mentions = findAllMentions(line);
    let cursor = 0;
    for (const mention of mentions) {
      if (mention.start > cursor) {
        inline.push({
          type: "text",
          text: line.slice(cursor, mention.start),
        });
      }
      const direct = parseCanvasReference(mention.path);
      const found = direct
        ? {
            path: mention.path,
            filename: direct.subjectName
              ? `${direct.subjectName} · ${direct.name}`
              : direct.name,
            kind: direct.kind === "other" ? "text" : direct.kind,
          }
        : lookup(mention.path);
      if (found) {
        inline.push({
          type: "canvasFileRef",
          attrs: {
            path: found.path,
            filename: found.filename,
            kind: found.kind,
          },
        });
      } else {
        inline.push({
          type: "text",
          text: line.slice(mention.start, mention.end),
        });
      }
      cursor = mention.end;
    }
    if (cursor < line.length) {
      inline.push({
        type: "text",
        text: line.slice(cursor),
      });
    }
    return inline.length > 0
      ? {
          type: "paragraph",
          content: inline,
        }
      : {
          type: "paragraph",
        };
  });
  return {
    type: "doc",
    content: paragraphs,
  };
}

export function useUpstreamTextContent() {
  const { loadTextContent } = useCanvasBridge();
  const { getNodeById } = useCanvasActions();
  const assetMetadataStore = useAssetMetadataApi();
  const [upstreamTextContent, setUpstreamTextContent] =
    reactExports.useState("");
  const refreshSeqRef = reactExports.useRef(0);
  const refreshUpstreamText = reactExports.useCallback(
    (sources) => {
      if (!loadTextContent) return;
      const seq = ++refreshSeqRef.current;
      const textSources = sources.filter(
        (srcId) => getNodeById(srcId)?.type === "text",
      );
      if (textSources.length === 0) {
        setUpstreamTextContent("");
        return;
      }
      Promise.all(
        textSources.map(async (srcId) => {
          const srcMeta = assetMetadataStore
            .getState()
            .assets.get(getNodeById(srcId)?.assetId ?? "");
          const srcPath = srcMeta?.path ?? getNodeById(srcId)?.data?.path;
          if (!srcPath) return "";
          try {
            return await loadTextContent(srcPath);
          } catch {
            return "";
          }
        }),
      ).then((texts) => {
        if (seq !== refreshSeqRef.current) return;
        setUpstreamTextContent(texts.filter(Boolean).join("\n\n"));
      });
    },
    [loadTextContent, getNodeById, assetMetadataStore],
  );
  return {
    upstreamTextContent,
    refreshUpstreamText,
  };
}

export async function loadReferenceTextContent(
  paths,
  loadTextContent,
  fallbackContent = "",
) {
  const uniquePaths = [
    ...new Set(
      paths.filter((path) => !!path && !isCanvasSubjectReference(path)),
    ),
  ];
  if (uniquePaths.length === 0) return "";
  if (!loadTextContent) {
    if (uniquePaths.some(isCanvasReferenceUri))
      throw new Error("Reference resolver unavailable");
    return fallbackContent.trim();
  }
  const loaded = await Promise.all(
    uniquePaths.map(async (path) => {
      try {
        return (await loadTextContent(path)).trim();
      } catch (error) {
        if (isCanvasReferenceUri(path)) throw error;
        return "";
      }
    }),
  );
  return loaded.filter(Boolean).join("\n\n");
}

export function useReferenceTextContent(
  paths,
  loadTextContent,
  fallbackContent = "",
) {
  const selectionKey = JSON.stringify([
    ...new Set(
      paths.filter((path) => !!path && !isCanvasSubjectReference(path)),
    ),
  ]);
  const [resolved, setResolved] = reactExports.useState({
    selectionKey,
    content: fallbackContent.trim(),
  });
  reactExports.useEffect(() => {
    let cancelled = false;
    const selectedPaths = JSON.parse(selectionKey);
    void loadReferenceTextContent(
      selectedPaths,
      loadTextContent,
      fallbackContent,
    ).then(
      (content) => {
        if (!cancelled)
          setResolved({
            selectionKey,
            content,
          });
      },
      () => {
        if (!cancelled)
          setResolved({
            selectionKey,
            content: "",
          });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [selectionKey, loadTextContent, fallbackContent]);
  if (selectionKey === "[]") return "";
  return resolved.selectionKey === selectionKey
    ? resolved.content
    : fallbackContent.trim();
}

export function composePromptWithUpstreamText(upstreamTextContent, prompt) {
  const trimmedUpstream = upstreamTextContent.trim();
  if (!trimmedUpstream) return prompt;
  if (prompt.trimStart().startsWith(trimmedUpstream)) return prompt;
  const trimmedPrompt = prompt.trim();
  return trimmedPrompt
    ? `${trimmedUpstream}

${trimmedPrompt}`
    : trimmedUpstream;
}

export function createComposedPromptCharacterCounter(upstreamTextContent) {
  const trimmedUpstream = upstreamTextContent.trim();
  if (!trimmedUpstream) return countPromptCharacters;
  const upstreamOnlyCount = countPromptCharacters(trimmedUpstream);
  return (prompt) => {
    if (prompt.trimStart().startsWith(trimmedUpstream))
      return countPromptCharacters(prompt);
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) return upstreamOnlyCount;
    return upstreamOnlyCount + 2 + countPromptCharacters(trimmedPrompt);
  };
}

export function countCompiledMediaPromptCharacters(
  serializedPrompt,
  referenceText,
  inputs,
) {
  const compiledPrompt = compileChipPromptForModel(serializedPrompt, inputs, {
    forCharacterCount: true,
  }).text;
  return countPromptCharacters(
    composePromptWithReferenceText(referenceText, compiledPrompt),
  );
}
