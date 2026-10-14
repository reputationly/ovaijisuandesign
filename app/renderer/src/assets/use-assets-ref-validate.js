// use-assets-ref-validate.js
import reactExports from "react";
import { useTranslation } from "react-i18next";
import { dedupedToast } from "../infra/agent-http-client.js";
import { extractCanvasEditorText } from "./parse-prompt-to-tiptap.js";
import { useCanvasBridge } from "../media-editing/package.jsx";
import {
  canvasReferenceIdentity,
  findAllMentions,
  parseCanvasReference,
} from "../text-editor/table-document-to-llm-content.js";
import { mapCanvasReferenceResolutions } from "../text-editor/map-canvas-reference-resolutions.js";

export function useAssetsRefValidate({ path, anchor, submit }) {
  const { directReferences } = useCanvasBridge();
  const { t: translate } = useTranslation();
  const reference = reactExports.useMemo(
    () => parseCanvasReference(path),
    [path],
  );
  const [result, setResult] = reactExports.useState();
  const latest = reactExports.useRef(submit);
  latest.current = submit;
  const pending = reactExports.useRef(false);
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
    let active = true;
    let revision = 0;
    const refresh = async () => {
      if (!reference || !directReferences) return;
      const current = ++revision;
      let resolution;
      try {
        [resolution] = await checkReferences([reference]);
      } catch {
        resolution = {
          reference,
          status: "unavailable",
        };
      }
      if (active && current === revision)
        setResult({
          bridge: directReferences,
          resolution,
        });
    };
    if (reference) {
      void refresh();
      window.addEventListener("focus", refresh);
      anchor?.addEventListener("mouseenter", refresh);
    }
    return () => {
      active = false;
      mounted.current = false;
      window.removeEventListener("focus", refresh);
      anchor?.removeEventListener("mouseenter", refresh);
    };
  }, [reference, directReferences, anchor, checkReferences]);
  const validate = reactExports.useCallback(async () => {
    if (pending.current) return false;
    const snapshot = latest.current;
    if (!snapshot) return false;
    const editor = snapshot.editorRef.current;
    if (editor?.isDestroyed) return false;
    const prompt = editor
      ? extractCanvasEditorText(editor)
      : snapshot.promptText;
    const attachments = snapshot.attachmentState;
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
    const entries = paths.flatMap((path) => {
      const reference = parseCanvasReference(path);
      return reference
        ? [
            {
              path,
              reference,
            },
          ]
        : [];
    });
    if (!entries.length) return true;
    pending.current = true;
    try {
      const refs = entries.map((entry) => entry.reference);
      const resolutions = await checkReferences(refs, {
        include_metadata: true,
      });
      if (
        !mounted.current ||
        snapshot.editorRef.current !== editor ||
        editor?.isDestroyed
      )
        return false;
      if (
        snapshot.attachmentState.updateReferenceMetadata !==
        latest.current?.attachmentState.updateReferenceMetadata
      )
        return false;
      const currentPrompt = editor
        ? extractCanvasEditorText(editor)
        : (latest.current?.promptText ?? "");
      if (currentPrompt !== prompt) return false;
      const invalid = entries.filter(
        (_unusedValue, index) =>
          resolutions[index].status === "deleted" ||
          resolutions[index].status === "missing",
      );
      if (invalid.length) {
        const removed = new Set(invalid.map((entry) => entry.path));
        let cleaned = prompt;
        for (const mention of findAllMentions(prompt).reverse()) {
          if (removed.has(mention.path))
            cleaned =
              cleaned.slice(0, mention.start) + cleaned.slice(mention.end);
        }
        for (const path of removed) {
          editor?.commands.removeCanvasFileRefsByPath(path);
          latest.current?.attachmentState.removePath(path);
        }
        latest.current?.setPromptText(
          editor ? extractCanvasEditorText(editor) : cleaned,
        );
        const subjectsOnly = invalid.every(
          ({ reference }) => reference.source === "subject",
        );
        const assetsOnly = invalid.every(
          ({ reference }) => reference.source === "project",
        );
        dedupedToast.error(
          subjectsOnly
            ? translate(
                "canvas.reference.invalidSubjectRemoved",
                "Invalid subject detected and automatically removed.",
              )
            : assetsOnly
              ? translate(
                  "canvas.reference.invalidAssetRemoved",
                  "Invalid asset detected and automatically removed.",
                )
              : translate(
                  "canvas.reference.invalidReferencesRemoved",
                  "Invalid references detected and automatically removed.",
                ),
        );
        return false;
      }
      if (resolutions.some((result) => result.status !== "available")) {
        throw new Error("Reference check unavailable");
      }
      const metadataChanged = entries.some(
        ({ path }, index) =>
          attachmentPaths.includes(path) &&
          JSON.stringify(
            attachments.referenceResolutions.get(path)?.metadata,
          ) !== JSON.stringify(resolutions[index].metadata),
      );
      latest.current?.attachmentState.updateReferenceMetadata(resolutions);
      if (metadataChanged) {
        dedupedToast.error(
          translate(
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
          translate(
            "canvas.reference.loadFailed",
            "Failed to load reference. Please try again.",
          ),
        );
      return false;
    } finally {
      pending.current = false;
    }
  }, [checkReferences, translate]);
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
