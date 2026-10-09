// use-assets-ref-validate.js
import { reactExports, useTranslation, dedupedToast, useAssetMetadataApi } from "../vendor.js";
import { useCanvasBridge, useCanvasActions } from "../m15/parse-item.jsx";
import { getAssetMetaByNodeIdFromStore } from "./generating-media-area.jsx";
import { composePromptWithReferenceText } from "./prune-persisted-node-data.js";
import { resolveReferenceAudios } from "./resolve-reference-texts.js";
import {
  canvasReferenceIdentity,
  findAllMentions,
  isCanvasReferenceUri,
  isCanvasSubjectReference,
  mapCanvasReferenceResolutions,
  parseCanvasReference,
} from "./table-document-to-llm-content.js";
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
    () => resolveReferenceAudios(getIncomingSourceIds(nodeId), void 0, assetMetadataStore),
    [nodeId, incomingKey, getIncomingSourceIds, assetMetadataStore],
  );
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
    () => resolveSnapshot(nodeId, mediaType, getIncomingSourceIds, assetMetadataStore),
    [nodeId, mediaType, incomingKey, getIncomingSourceIds, assetMetadataStore],
  );
}
function resolveSnapshot(nodeId, mediaType, getIncomingSourceIds, assetMetadataStore) {
  const sources = getIncomingSourceIds(nodeId);
  for (const sourceId of sources) {
    const sourceMeta = getAssetMetaByNodeIdFromStore(assetMetadataStore, sourceId);
    if (sourceMeta?.type === mediaType && sourceMeta.model_id) {
      return {
        modelId: sourceMeta.model_id,
        params: sourceMeta.params ?? {},
      };
    }
  }
  return void 0;
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
    if (node2.type.name === "canvasFileRef" && isCanvasSubjectReference(node2.attrs.path))
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
            filename: direct.subjectName ? `${direct.subjectName} · ${direct.name}` : direct.name,
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
  const [upstreamTextContent, setUpstreamTextContent] = reactExports.useState("");
  const refreshSeqRef = reactExports.useRef(0);
  const refreshUpstreamText = reactExports.useCallback(
    (sources) => {
      if (!loadTextContent) return;
      const seq2 = ++refreshSeqRef.current;
      const textSources = sources.filter((srcId) => getNodeById(srcId)?.type === "text");
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
export async function loadReferenceTextContent(paths, loadTextContent, fallbackContent = "") {
  const uniquePaths = [
    ...new Set(paths.filter((path2) => !!path2 && !isCanvasSubjectReference(path2))),
  ];
  if (uniquePaths.length === 0) return "";
  if (!loadTextContent) {
    if (uniquePaths.some(isCanvasReferenceUri)) throw new Error("Reference resolver unavailable");
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
export function useReferenceTextContent(paths, loadTextContent, fallbackContent = "") {
  const selectionKey2 = JSON.stringify([
    ...new Set(paths.filter((path2) => !!path2 && !isCanvasSubjectReference(path2))),
  ]);
  const [resolved, setResolved] = reactExports.useState({
    selectionKey: selectionKey2,
    content: fallbackContent.trim(),
  });
  reactExports.useEffect(() => {
    let cancelled = false;
    const selectedPaths = JSON.parse(selectionKey2);
    void loadReferenceTextContent(selectedPaths, loadTextContent, fallbackContent).then(
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
  return resolved.selectionKey === selectionKey2 ? resolved.content : fallbackContent.trim();
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
    if (prompt.trimStart().startsWith(trimmedUpstream)) return countPromptCharacters(prompt);
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) return upstreamOnlyCount;
    return upstreamOnlyCount + 2 + countPromptCharacters(trimmedPrompt);
  };
}
const KIND_LABEL = {
  image: "图片",
  video: "视频",
  audio: "音频",
};
function basename$b(p3) {
  const idx = p3.lastIndexOf("/");
  return idx < 0 ? p3 : p3.slice(idx + 1);
}
function findIndex$1(paths, ref) {
  if (paths.length === 0) return -1;
  const exact = paths.indexOf(ref);
  if (exact >= 0) return exact;
  const refBase = basename$b(ref);
  for (let i2 = 0; i2 < paths.length; i2++) {
    if (basename$b(paths[i2]) === refBase) return i2;
  }
  return -1;
}
function resolveAcrossArrays(ref, inputs) {
  const order2 = [
    ["image", inputs.imagePaths],
    ["video", inputs.videoPaths],
    ["audio", inputs.audioPaths],
  ];
  for (const [kind, arr] of order2) {
    const idx = findIndex$1(arr, ref);
    if (idx >= 0)
      return {
        kind,
        index: idx,
      };
  }
  return null;
}
export function compileChipPromptForModel(rawText, inputs, options = {}) {
  if (
    !options.forCharacterCount &&
    [...inputs.imagePaths, ...inputs.videoPaths, ...inputs.audioPaths].some(
      isCanvasSubjectReference,
    )
  )
    return {
      text: rawText,
      replacedCount: 0,
      unresolved: [],
    };
  if (!rawText)
    return {
      text: rawText,
      replacedCount: 0,
      unresolved: [],
    };
  const mentions = findAllMentions(rawText);
  if (
    !options.forCharacterCount &&
    mentions.some((mention) => isCanvasSubjectReference(mention.path))
  )
    return {
      text: rawText,
      replacedCount: 0,
      unresolved: [],
    };
  if (mentions.length === 0) {
    return {
      text: rawText,
      replacedCount: 0,
      unresolved: [],
    };
  }
  let out = "";
  let cursor = 0;
  let replacedCount = 0;
  const unresolved = [];
  for (const m3 of mentions) {
    out += rawText.slice(cursor, m3.start);
    const reference = options.forCharacterCount ? parseCanvasReference(m3.path) : void 0;
    const resolved = resolveAcrossArrays(m3.path, inputs);
    if (reference?.target === "entity") {
      out += reference.name;
      replacedCount++;
    } else if (resolved) {
      out += `${KIND_LABEL[resolved.kind]}${resolved.index + 1}`;
      replacedCount++;
    } else if (reference) {
      out += reference.name;
      replacedCount++;
    } else {
      out += rawText.slice(m3.start, m3.end);
      unresolved.push({
        path: m3.path,
      });
    }
    cursor = m3.end;
  }
  out += rawText.slice(cursor);
  return {
    text: out,
    replacedCount,
    unresolved,
  };
}
export function countCompiledMediaPromptCharacters(serializedPrompt, referenceText, inputs) {
  const compiledPrompt = compileChipPromptForModel(serializedPrompt, inputs, {
    forCharacterCount: true,
  }).text;
  return countPromptCharacters(composePromptWithReferenceText(referenceText, compiledPrompt));
}
export function useAssetsRefValidate({ path: path2, anchor, submit }) {
  const { directReferences } = useCanvasBridge();
  const { t: t2 } = useTranslation();
  const reference = reactExports.useMemo(() => parseCanvasReference(path2), [path2]);
  const [result, setResult] = reactExports.useState();
  const latest2 = reactExports.useRef(submit);
  latest2.current = submit;
  const pending2 = reactExports.useRef(false);
  const mounted = reactExports.useRef(true);
  const checkReferences = reactExports.useCallback(
    async (references, options) => {
      if (!directReferences) throw new Error("Reference service unavailable");
      return mapCanvasReferenceResolutions(
        await directReferences.checkAvailability(references, options),
        references,
      );
    },
    [directReferences],
  );
  reactExports.useEffect(() => {
    mounted.current = true;
    let active2 = true;
    let revision = 0;
    const refresh = async () => {
      if (!reference || !directReferences) return;
      const current2 = ++revision;
      let resolution2;
      try {
        [resolution2] = await checkReferences([reference]);
      } catch {
        resolution2 = {
          reference,
          status: "unavailable",
        };
      }
      if (active2 && current2 === revision)
        setResult({
          bridge: directReferences,
          resolution: resolution2,
        });
    };
    if (reference) {
      void refresh();
      window.addEventListener("focus", refresh);
      anchor?.addEventListener("mouseenter", refresh);
    }
    return () => {
      active2 = false;
      mounted.current = false;
      window.removeEventListener("focus", refresh);
      anchor?.removeEventListener("mouseenter", refresh);
    };
  }, [reference, directReferences, anchor, checkReferences]);
  const validate = reactExports.useCallback(async () => {
    if (pending2.current) return false;
    const snapshot2 = latest2.current;
    if (!snapshot2) return false;
    const editor = snapshot2.editorRef.current;
    if (editor?.isDestroyed) return false;
    const prompt = editor ? extractCanvasEditorText(editor) : snapshot2.promptText;
    const attachments = snapshot2.attachmentState;
    const attachmentPaths = [
      ...attachments.imagePaths,
      ...attachments.videoPaths,
      ...attachments.audioPaths,
      ...attachments.textPaths,
    ];
    const paths = [
      ...new Set([...findAllMentions(prompt).map((mention) => mention.path), ...attachmentPaths]),
    ];
    const entries2 = paths.flatMap((path22) => {
      const reference2 = parseCanvasReference(path22);
      return reference2
        ? [
            {
              path: path22,
              reference: reference2,
            },
          ]
        : [];
    });
    if (!entries2.length) return true;
    pending2.current = true;
    try {
      const refs = entries2.map((entry) => entry.reference);
      const resolutions = await checkReferences(refs, {
        include_metadata: true,
      });
      if (!mounted.current || snapshot2.editorRef.current !== editor || editor?.isDestroyed)
        return false;
      if (
        snapshot2.attachmentState.updateReferenceMetadata !==
        latest2.current?.attachmentState.updateReferenceMetadata
      )
        return false;
      const currentPrompt = editor
        ? extractCanvasEditorText(editor)
        : (latest2.current?.promptText ?? "");
      if (currentPrompt !== prompt) return false;
      const invalid2 = entries2.filter(
        (_2, index2) =>
          resolutions[index2].status === "deleted" || resolutions[index2].status === "missing",
      );
      if (invalid2.length) {
        const removed = new Set(invalid2.map((entry) => entry.path));
        let cleaned = prompt;
        for (const mention of findAllMentions(prompt).reverse()) {
          if (removed.has(mention.path))
            cleaned = cleaned.slice(0, mention.start) + cleaned.slice(mention.end);
        }
        for (const path22 of removed) {
          editor?.commands.removeCanvasFileRefsByPath(path22);
          latest2.current?.attachmentState.removePath(path22);
        }
        latest2.current?.setPromptText(editor ? extractCanvasEditorText(editor) : cleaned);
        const subjectsOnly = invalid2.every(
          ({ reference: reference2 }) => reference2.source === "subject",
        );
        const assetsOnly = invalid2.every(
          ({ reference: reference2 }) => reference2.source === "project",
        );
        dedupedToast.error(
          subjectsOnly
            ? t2(
                "canvas.reference.invalidSubjectRemoved",
                "Invalid subject detected and automatically removed.",
              )
            : assetsOnly
              ? t2(
                  "canvas.reference.invalidAssetRemoved",
                  "Invalid asset detected and automatically removed.",
                )
              : t2(
                  "canvas.reference.invalidReferencesRemoved",
                  "Invalid references detected and automatically removed.",
                ),
        );
        return false;
      }
      if (resolutions.some((result2) => result2.status !== "available")) {
        throw new Error("Reference check unavailable");
      }
      const metadataChanged = entries2.some(
        ({ path: path22 }, index2) =>
          attachmentPaths.includes(path22) &&
          JSON.stringify(attachments.referenceResolutions.get(path22)?.metadata) !==
            JSON.stringify(resolutions[index2].metadata),
      );
      latest2.current?.attachmentState.updateReferenceMetadata(resolutions);
      if (metadataChanged) {
        dedupedToast.error(
          t2(
            "canvas.reference.contentChanged",
            "Reference content changed. Review the updated limits and estimated cost, then submit again.",
          ),
        );
        return false;
      }
      return true;
    } catch {
      if (mounted.current)
        dedupedToast.error(
          t2("canvas.reference.loadFailed", "Failed to load reference. Please try again."),
        );
      return false;
    } finally {
      pending2.current = false;
    }
  }, [checkReferences, t2]);
  const resolution =
    reference &&
    result?.bridge === directReferences &&
    result?.resolution &&
    canvasReferenceIdentity(reference) === canvasReferenceIdentity(result.resolution.reference)
      ? result.resolution
      : void 0;
  const status = reference ? (resolution?.status ?? "checking") : void 0;
  return {
    reference,
    resolution,
    status,
    unavailable: !!reference && status !== "available",
    invalid: status === "deleted" || status === "missing",
    validate,
  };
}
