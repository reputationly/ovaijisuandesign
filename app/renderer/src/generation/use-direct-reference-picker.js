// use-direct-reference-picker.js
import {
  reasonForDisabled,
  ReferenceDisabledReason,
} from "./attachment-bar.jsx";
import reactExports from "react";
import { useTranslation } from "react-i18next";
import { dedupedToast } from "../infra/agent-http-client.js";
import { useCanvasBridge } from "../media-editing/package.jsx";
import {
  encodeCanvasReference,
  existingCanvasReferencePath,
} from "../text-editor/table-document-to-llm-content.js";
function reasonForDisabledBatch(items, constraints) {
  if (!constraints) return void 0;
  const remaining = {
    ...constraints,
    remainingByKind: {
      ...constraints.remainingByKind,
    },
  };
  for (const { kind: kind2, meta } of items) {
    const reason = reasonForDisabled(kind, meta, remaining);
    if (reason) return reason;
    const slots = remaining.remainingByKind[kind];
    if (slots !== void 0) remaining.remainingByKind[kind] = slots - 1;
    if (kind === "video" || kind === "audio") {
      if (remaining.remainingVideoAudio !== void 0) {
        remaining.remainingVideoAudio--;
        remaining.remainingByKind.video = Math.min(
          remaining.remainingByKind.video,
          remaining.remainingVideoAudio,
        );
        remaining.remainingByKind.audio = Math.min(
          remaining.remainingByKind.audio,
          remaining.remainingVideoAudio,
        );
      }
      const duration = Math.max(0, meta.durationSec ?? 0);
      if (kind === "video") remaining.remainingVideoTotalSec -= duration;
      else if (remaining.remainingAudioTotalSec !== void 0)remaining.remainingAudioTotalSec -= duration;
    }
  }
  return void 0;
}
const SEARCH_DELAY_MS = 150;
const THUMB_PX = 28;
export function useDirectReferencePicker({
  query,
  kindFilter,
  existingPaths,
  constraints,
  onSelect,
  onConstraintViolation,
}) {
  const { t: translate } = useTranslation();
  const { directReferences, resolveThumbUrl } = useCanvasBridge();
  const allowedKinds = reactExports.useMemo(
    () => new Set(kindFilter),
    [kindFilter],
  );
  const [directCandidates, setDirectCandidates] = reactExports.useState([]);
  const [directError, setDirectError] = reactExports.useState(false);
  const [directLoading, setDirectLoading] = reactExports.useState(false);
  const aliveRef = reactExports.useRef(true);
  const selectingRef = reactExports.useRef(false);
  reactExports.useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);
  reactExports.useEffect(() => {
    if (!directReferences) return;
    let cancelled = false;
    setDirectLoading(true);
    setDirectError(false);
    const timer = setTimeout(() => {
      directReferences
        .searchCandidates(query)
        .then((rows) => {
          if (!cancelled) setDirectCandidates(rows);
        })
        .catch(() => {
          if (!cancelled) {
            setDirectCandidates([]);
            setDirectError(true);
          }
        })
        .finally(() => {
          if (!cancelled) setDirectLoading(false);
        });
    }, SEARCH_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [directReferences, query]);
  const directItems = reactExports.useMemo(
    () =>
      directCandidates.map((candidate) => {
        const supportedReferences = candidate.references.filter(
          (ref) => ref.kind !== "other" && allowedKinds.has(ref.kind),
        );
        const firstSupportedReference = supportedReferences[0];
        const kind =
          firstSupportedReference && firstSupportedReference.kind !== "other"
            ? firstSupportedReference.kind
            : "text";
        const path = firstSupportedReference
          ? encodeCanvasReference(firstSupportedReference)
          : candidate.id;
        const directReferences =
          candidate.source === "subject"
            ? [
                {
                  source: "subject",
                  target: "entity",
                  id: candidate.id,
                  scope: candidate.id,
                  name: candidate.name,
                  entityType: candidate.entityType,
                  attachmentKinds: supportedReferences.map(
                    (reference) => reference.kind,
                  ),
                  kind,
                },
              ]
            : supportedReferences;
        const subjectAlreadySelected =
          candidate.source === "subject" &&
          directReferences.some((reference) =>
            existingCanvasReferencePath(reference, existingPaths),
          );
        const newReferences = supportedReferences.flatMap((reference) => {
          if (
            subjectAlreadySelected ||
            reference.kind === "other" ||
            existingCanvasReferencePath(reference, existingPaths)
          )
            return [];
          return [
            {
              kind: reference.kind,
              meta: {
                name: reference.name,
                path: encodeCanvasReference(reference),
                type: reference.kind,
                url: "",
              },
            },
          ];
        });
        const disabledReason = firstSupportedReference
          ? reasonForDisabledBatch(newReferences, constraints)
          : candidate.references.length
            ? ReferenceDisabledReason.Unsupported
            : ReferenceDisabledReason.Empty;
        return {
          assetId: candidate.id,
          meta: {
            path,
            name: candidate.name,
            type: kind,
            url: "",
          },
          kind,
          thumbUrl:
            firstSupportedReference && kind === "image"
              ? (resolveThumbUrl?.(path, THUMB_PX, "image") ?? "")
              : "",
          alreadyAdded: false,
          disabledReason,
          directReferences,
        };
      }),
    [
      directCandidates,
      allowedKinds,
      existingPaths,
      constraints,
      resolveThumbUrl,
    ],
  );
  const selectItem = reactExports.useCallback(
    async (item) => {
      if (item.disabledReason || selectingRef.current) return true;
      if (item.directReferences && directReferences) {
        selectingRef.current = true;
        try {
          const resolved = await directReferences.checkAvailability(
            item.directReferences,
            {
              include_metadata: true,
            },
          );
          if (!aliveRef.current) return true;
          if (
            resolved.length !== item.directReferences.length ||
            resolved.some((resolvedItem) => resolvedItem.status === "unavailable")
          ) {
            throw new Error("Reference check failed");
          }
          if (resolved.some((resolvedItem) => resolvedItem.status !== "available")) {
            dedupedToast.error(
              translate(
                "canvas.reference.unavailable",
                "Reference unavailable. Please select again.",
              ),
            );
            return true;
          }
          const selections = resolved.map((resolvedItem) => {
            const reference = resolvedItem.reference;
            const attachments = resolvedItem.metadata?.attachments.filter((attachment) =>
              allowedKinds.has(attachment.kind),
            );
            return {
              reference:
                reference.target === "entity" && attachments
                  ? {
                      ...reference,
                      attachmentKinds: attachments.map(
                        (attachment) => attachment.kind,
                      ),
                    }
                  : reference,
              row: resolvedItem,
              attachments,
            };
          });
          const newMedia = selections.flatMap(
            ({ reference, row: resolvedItem, attachments }) => {
              if (existingCanvasReferencePath(reference, existingPaths))
                return [];
              return (
                reference.target === "entity" && attachments
                  ? attachments.map((attachment) => ({
                      kind: attachment.kind,
                      metadata: attachment.metadata,
                    }))
                  : [
                      {
                        kind: reference.kind,
                        metadata: resolvedItem.metadata?.media,
                      },
                    ]
              ).flatMap(({ kind, metadata }) => {
                if (!allowedKinds.has(kind)) return [];
                return [
                  {
                    kind,
                    meta: {
                      path: encodeCanvasReference(reference),
                      name: reference.name,
                      type: kind,
                      url: "",
                      durationSec: metadata?.duration_sec,
                      width: metadata?.width,
                      height: metadata?.height,
                      fileSize: metadata?.file_size,
                    },
                  },
                ];
              });
            },
          );
          const invalid = selections.some(
            ({ reference }) =>
              reference.target === "entity" &&
              !reference.attachmentKinds?.length,
          )
            ? ReferenceDisabledReason.Empty
            : reasonForDisabledBatch(newMedia, constraints);
          if (invalid) {
            onConstraintViolation(invalid);
            return true;
          }
          for (const { reference, row: resolvedItem } of selections) {
            if (reference.kind === "other") continue;
            onSelect(
              {
                path:
                  existingCanvasReferencePath(reference, existingPaths) ??
                  encodeCanvasReference(reference),
                name: reference.subjectName
                  ? `${reference.subjectName} · ${reference.name}`
                  : reference.name,
                type: reference.kind,
                url: "",
                durationSec: resolvedItem.metadata?.media?.duration_sec,
                width: resolvedItem.metadata?.media?.width,
                height: resolvedItem.metadata?.media?.height,
                fileSize: resolvedItem.metadata?.media?.file_size,
              },
              reference.id,
            );
          }
        } catch {
          if (aliveRef.current)
            dedupedToast.error(
              translate(
                "canvas.reference.loadFailed",
                "Failed to load reference. Please try again.",
              ),
            );
        } finally {
          selectingRef.current = false;
        }
        return true;
      }
      return false;
    },
    [
      directReferences,
      existingPaths,
      onSelect,
      translate,
      allowedKinds,
      constraints,
      onConstraintViolation,
    ],
  );
  return {
    candidates: directCandidates,
    items: directItems,
    isLoading: directLoading,
    hasError: directError,
    // true means the direct-reference path handled (or rejected) this selection.
    selectItem,
  };
}
