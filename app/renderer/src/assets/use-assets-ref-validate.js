// use-assets-ref-validate.js
import { dedupedToast, reactExports, useTranslation } from "../vendor.js";
import { extractCanvasEditorText } from "./parse-prompt-to-tiptap.js";
import { useCanvasBridge } from "../media-editing/package.jsx";
import {
  canvasReferenceIdentity,
  findAllMentions,
  parseCanvasReference,
} from "../text-editor/table-document-to-llm-content.js";
import { mapCanvasReferenceResolutions } from "../text-editor/map-canvas-reference-resolutions.js";

export function useAssetsRefValidate({ path: path2, anchor, submit }) {
  const { directReferences } = useCanvasBridge();
  const { t: t2 } = useTranslation();
  const reference = reactExports.useMemo(
    () => parseCanvasReference(path2),
    [path2],
  );
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
    const prompt = editor
      ? extractCanvasEditorText(editor)
      : snapshot2.promptText;
    const attachments = snapshot2.attachmentState;
    const attachmentPaths = [
      ...attachments.imagePaths,
      ...attachments.videoPaths,
      ...attachments.audioPaths,
      ...attachments.textPaths,
    ];
    const paths = [
      ...new Set([
        ...findAllMentions(prompt).map((mention) => mention.path),
        ...attachmentPaths,
      ]),
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
      if (
        !mounted.current ||
        snapshot2.editorRef.current !== editor ||
        editor?.isDestroyed
      )
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
          resolutions[index2].status === "deleted" ||
          resolutions[index2].status === "missing",
      );
      if (invalid2.length) {
        const removed = new Set(invalid2.map((entry) => entry.path));
        let cleaned = prompt;
        for (const mention of findAllMentions(prompt).reverse()) {
          if (removed.has(mention.path))
            cleaned =
              cleaned.slice(0, mention.start) + cleaned.slice(mention.end);
        }
        for (const path22 of removed) {
          editor?.commands.removeCanvasFileRefsByPath(path22);
          latest2.current?.attachmentState.removePath(path22);
        }
        latest2.current?.setPromptText(
          editor ? extractCanvasEditorText(editor) : cleaned,
        );
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
          JSON.stringify(
            attachments.referenceResolutions.get(path22)?.metadata,
          ) !== JSON.stringify(resolutions[index2].metadata),
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
          t2(
            "canvas.reference.loadFailed",
            "Failed to load reference. Please try again.",
          ),
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
    canvasReferenceIdentity(reference) ===
      canvasReferenceIdentity(result.resolution.reference)
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
