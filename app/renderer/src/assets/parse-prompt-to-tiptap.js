// parse-prompt-to-tiptap.js
import { reactExports } from "../vendor.js";
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
      const key2 = [...getIncomingSourceIds(nodeId)].sort().join("|");
      setIncomingKey((prev) => (prev === key2 ? prev : key2));
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
      const key2 = [...getIncomingSourceIds(nodeId)].sort().join("|");
      setIncomingKey((prev) => (prev === key2 ? prev : key2));
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

export function serializeMentionToken(path2) {
  if (!path2) return "";
  return `@[${path2}]`;
}

function serializeInline(nodes, fileRefInclusion) {
  let text2 = "";
  for (const node2 of nodes) {
    if (node2.type === "text") {
      text2 += node2.text ?? "";
    } else if (fileRefInclusion !== "none" && node2.type === "canvasFileRef") {
      const attrs = node2.attrs;
      if (
        fileRefInclusion === "media-only" &&
        attrs?.kind === "text" &&
        parseCanvasReference(attrs?.path)?.target !== "entity"
      )
        continue;
      const path2 = String(attrs?.path ?? "");
      text2 += serializeMentionToken(path2);
    } else if (node2.type === "canvasRedrawRegion") {
      const attrs = node2.attrs;
      const x1 = Number(attrs?.x1 ?? 0);
      const y1 = Number(attrs?.y1 ?? 0);
      const x2 = Number(attrs?.x2 ?? 999);
      const y22 = Number(attrs?.y2 ?? 999);
      text2 += `<bbox>${x1} ${y1} ${x2} ${y22}</bbox>`;
    }
  }
  return text2;
}

function serializeDoc(doc2, fileRefInclusion) {
  if (!doc2.content) return "";
  const parts = [];
  for (const block of doc2.content) {
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

export function countPromptCharacters(text2) {
  let count2 = 0;
  for (let index2 = 0; index2 < text2.length; index2 += 1) {
    const codeUnit = text2.charCodeAt(index2);
    if (
      codeUnit >= 55296 &&
      codeUnit <= 56319 &&
      index2 + 1 < text2.length &&
      text2.charCodeAt(index2 + 1) >= 56320 &&
      text2.charCodeAt(index2 + 1) <= 57343
    ) {
      index2 += 1;
    }
    count2 += 1;
  }
  return count2;
}

export function collectTextChipPaths(editor) {
  const paths = [];
  editor.state.doc.descendants((node2) => {
    if (node2.type.name === "canvasFileRef" && node2.attrs?.kind === "text") {
      const p3 = node2.attrs?.path;
      if (typeof p3 === "string" && p3) paths.push(p3);
    }
  });
  return paths;
}

export function removeCanvasSubjectReferences(editor) {
  const paths = new Set();
  editor.state.doc.descendants((node2) => {
    if (
      node2.type.name === "canvasFileRef" &&
      isCanvasSubjectReference(node2.attrs.path)
    )
      paths.add(node2.attrs.path);
  });
  for (const path2 of paths) editor.commands.removeCanvasFileRefsByPath(path2);
  return [...paths];
}

export function parsePromptToTiptap(text2, lookup) {
  if (!text2) {
    return {
      type: "doc",
      content: [
        {
          type: "paragraph",
        },
      ],
    };
  }
  const lines = text2.split("\n");
  const paragraphs = lines.map((line) => {
    const inline2 = [];
    const mentions = findAllMentions(line);
    let cursor = 0;
    for (const m3 of mentions) {
      if (m3.start > cursor) {
        inline2.push({
          type: "text",
          text: line.slice(cursor, m3.start),
        });
      }
      const direct = parseCanvasReference(m3.path);
      const found2 = direct
        ? {
            path: m3.path,
            filename: direct.subjectName
              ? `${direct.subjectName} · ${direct.name}`
              : direct.name,
            kind: direct.kind === "other" ? "text" : direct.kind,
          }
        : lookup(m3.path);
      if (found2) {
        inline2.push({
          type: "canvasFileRef",
          attrs: {
            path: found2.path,
            filename: found2.filename,
            kind: found2.kind,
          },
        });
      } else {
        inline2.push({
          type: "text",
          text: line.slice(m3.start, m3.end),
        });
      }
      cursor = m3.end;
    }
    if (cursor < line.length) {
      inline2.push({
        type: "text",
        text: line.slice(cursor),
      });
    }
    return inline2.length > 0
      ? {
          type: "paragraph",
          content: inline2,
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
      const seq2 = ++refreshSeqRef.current;
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
        if (seq2 !== refreshSeqRef.current) return;
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
      paths.filter((path2) => !!path2 && !isCanvasSubjectReference(path2)),
    ),
  ];
  if (uniquePaths.length === 0) return "";
  if (!loadTextContent) {
    if (uniquePaths.some(isCanvasReferenceUri))
      throw new Error("Reference resolver unavailable");
    return fallbackContent.trim();
  }
  const loaded = await Promise.all(
    uniquePaths.map(async (path2) => {
      try {
        return (await loadTextContent(path2)).trim();
      } catch (error) {
        if (isCanvasReferenceUri(path2)) throw error;
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
  const selectionKey2 = JSON.stringify([
    ...new Set(
      paths.filter((path2) => !!path2 && !isCanvasSubjectReference(path2)),
    ),
  ]);
  const [resolved, setResolved] = reactExports.useState({
    selectionKey: selectionKey2,
    content: fallbackContent.trim(),
  });
  reactExports.useEffect(() => {
    let cancelled = false;
    const selectedPaths = JSON.parse(selectionKey2);
    void loadReferenceTextContent(
      selectedPaths,
      loadTextContent,
      fallbackContent,
    ).then(
      (content2) => {
        if (!cancelled)
          setResolved({
            selectionKey: selectionKey2,
            content: content2,
          });
      },
      () => {
        if (!cancelled)
          setResolved({
            selectionKey: selectionKey2,
            content: "",
          });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [selectionKey2, loadTextContent, fallbackContent]);
  if (selectionKey2 === "[]") return "";
  return resolved.selectionKey === selectionKey2
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
