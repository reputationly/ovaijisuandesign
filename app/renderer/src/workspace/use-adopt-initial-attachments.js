// use-adopt-initial-attachments.js
import { detectFileType } from "../canvas/diagnostic-history-tools.js";
import { TRACK_EVENTS } from "../infra/track-events.js";
import { trackEvent } from "../infra/sanitize-track-props.js";
import { API_PATHS, reactExports } from "../vendor.js";
import { useGatewayFetch } from "../generation/use-model-catalog-scope-key.js";
import { FILE_ADOPTION_IDEMPOTENCY_HEADER } from "../generation/to-workspace-browser-url.js";

class AdoptionFailure extends Error {
  constructor(reason, message2, httpStatusClass) {
    super(message2);
    this.reason = reason;
    this.httpStatusClass = httpStatusClass;
  }
}

function classifyHttpStatus(status) {
  if (status >= 400 && status < 500) return "4xx";
  if (status >= 500 && status < 600) return "5xx";
  return "other";
}

function reportAdoptionFailure(failure) {
  const properties2 = {
    operation: "initial_attachment_adoption",
    error_type: failure.reason === "network" ? "network" : "business",
    error_code: failure.reason,
    error_message: failure.reason,
    ...(failure.httpStatusClass
      ? {
          http_status_class: failure.httpStatusClass,
        }
      : {}),
  };
  trackEvent(TRACK_EVENTS.GATEWAY_API_FAILED, properties2);
  const breadcrumb = window.hilo?.diagnostics?.addBreadcrumb?.(
    "network",
    "initial-attachment-adoption: failed",
    properties2,
  );
  void breadcrumb?.catch(() => {});
}

function normalizeAdoptResponse(value, requestedSources) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      adopted: [],
      errors: [],
    };
  }
  const record2 = value;
  const adopted = Array.isArray(record2.adopted)
    ? record2.adopted.flatMap((mapping) => {
        if (!mapping || typeof mapping !== "object" || Array.isArray(mapping))
          return [];
        const item = mapping;
        return typeof item.source === "string" &&
          typeof item.destination === "string"
          ? [
              {
                source: item.source,
                destination: item.destination,
                ...(typeof item.attachment_id === "string" &&
                item.attachment_id.trim()
                  ? {
                      attachment_id: item.attachment_id,
                    }
                  : {}),
              },
            ]
          : [];
      })
    : [];
  const errors = Array.isArray(record2.errors)
    ? record2.errors.flatMap((error) => {
        if (!error || typeof error !== "object" || Array.isArray(error))
          return [];
        const item = error;
        return typeof item.source === "string"
          ? [
              {
                source: item.source,
                message:
                  typeof item.message === "string"
                    ? item.message
                    : "Failed to adopt attachment",
              },
            ]
          : [];
      })
    : [];
  if (adopted.length === 0 && Array.isArray(record2.paths)) {
    const paths = record2.paths.filter((path2) => typeof path2 === "string");
    if (paths.length === requestedSources.length) {
      return {
        adopted: requestedSources.map((source, index2) => ({
          source,
          destination: paths[index2],
        })),
        errors,
      };
    }
  }
  return {
    adopted,
    errors,
  };
}

function isCanvasMediaPath(path2) {
  const fileType = detectFileType(path2);
  return fileType === "image" || fileType === "video" || fileType === "audio";
}

export function useAdoptInitialAttachments(
  attachments,
  folderPath,
  ready,
  operationId,
) {
  const scopedGatewayFetch = useGatewayFetch();
  const [progress, setProgress] = reactExports.useState(null);
  const [retryVersion, setRetryVersion] = reactExports.useState(0);
  const inFlightKeyRef = reactExports.useRef(null);
  const adoptionKey = reactExports.useMemo(
    () =>
      attachments && attachments.length > 0 && folderPath
        ? JSON.stringify([operationId ?? null, folderPath, attachments])
        : null,
    [attachments, folderPath, operationId],
  );
  const activeAdoptionKeyRef = reactExports.useRef(adoptionKey);
  activeAdoptionKeyRef.current = adoptionKey;
  const retry = reactExports.useCallback(() => {
    if (!adoptionKey || inFlightKeyRef.current === adoptionKey) return;
    setRetryVersion((version2) => version2 + 1);
  }, [adoptionKey]);
  reactExports.useEffect(() => {
    if (!ready || !adoptionKey || !attachments) return;
    if (
      progress?.key === adoptionKey &&
      progress.error &&
      progress.attemptVersion === retryVersion
    ) {
      return;
    }
    if (progress?.key === adoptionKey && !progress.error) {
      const allMapped = attachments.every(
        (source) => progress.destinationsBySource[source] !== void 0,
      );
      const projected = new Set(progress.projectedPaths);
      const allProjected = attachments.every((source) => {
        const destination = progress.destinationsBySource[source];
        return (
          !destination ||
          !isCanvasMediaPath(destination) ||
          projected.has(destination)
        );
      });
      if (allMapped && allProjected) return;
    }
    if (inFlightKeyRef.current === adoptionKey) return;
    inFlightKeyRef.current = adoptionKey;
    void (async () => {
      const existing = progress?.key === adoptionKey ? progress : null;
      const destinationsBySource = {
        ...(existing?.destinationsBySource ?? {}),
      };
      const attachmentIdsBySource = {
        ...(existing?.attachmentIdsBySource ?? {}),
      };
      const projectedPaths2 = new Set(existing?.projectedPaths ?? []);
      try {
        const missingSources = attachments.filter(
          (source) => destinationsBySource[source] === void 0,
        );
        if (missingSources.length > 0) {
          const response = await scopedGatewayFetch(API_PATHS.adoptFiles, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(operationId
                ? {
                    [FILE_ADOPTION_IDEMPOTENCY_HEADER]: operationId,
                  }
                : {}),
            },
            body: JSON.stringify({
              paths: missingSources,
              targetDir: folderPath,
            }),
          });
          if (!response.ok) {
            throw new AdoptionFailure(
              "http_response",
              `adoptFiles failed with HTTP ${response.status}`,
              classifyHttpStatus(response.status),
            );
          }
          let payload;
          try {
            payload = await response.json();
          } catch {
            throw new AdoptionFailure(
              "invalid_response",
              "Gateway returned an invalid response",
            );
          }
          const result = normalizeAdoptResponse(payload, missingSources);
          const failedSources = new Set(
            result.errors.map((error) => error.source),
          );
          for (const mapping of result.adopted) {
            if (
              missingSources.includes(mapping.source) &&
              !failedSources.has(mapping.source)
            ) {
              destinationsBySource[mapping.source] = mapping.destination;
              if (mapping.attachment_id) {
                attachmentIdsBySource[mapping.source] = mapping.attachment_id;
              }
            }
          }
          const stillMissing = missingSources.filter(
            (source) => destinationsBySource[source] === void 0,
          );
          if (stillMissing.length > 0) {
            const messages2 = result.errors
              .filter((error) => stillMissing.includes(error.source))
              .map((error) => `${error.source}: ${error.message}`);
            throw new AdoptionFailure(
              "incomplete_response",
              messages2.length > 0
                ? messages2.join("; ")
                : `Gateway did not adopt: ${stillMissing.join(", ")}`,
            );
          }
        }
        const mediaPaths = attachments
          .map((source) => destinationsBySource[source])
          .filter((path2) => Boolean(path2) && isCanvasMediaPath(path2));
        const pendingProjectionPaths = mediaPaths.filter(
          (path2) => !projectedPaths2.has(path2),
        );
        const projectionResults = await Promise.allSettled(
          pendingProjectionPaths.map(async (assetPath) => {
            const canvasResponse = await scopedGatewayFetch(
              API_PATHS.canvasMediaNode,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  assetPath,
                }),
              },
            );
            if (!canvasResponse.ok) {
              throw new AdoptionFailure(
                "http_response",
                `create canvas media node failed with HTTP ${canvasResponse.status}`,
                classifyHttpStatus(canvasResponse.status),
              );
            }
            projectedPaths2.add(assetPath);
          }),
        );
        const projectionFailure = projectionResults.find(
          (result) => result.status === "rejected",
        );
        if (projectionFailure) throw projectionFailure.reason;
        if (activeAdoptionKeyRef.current === adoptionKey) {
          setProgress({
            key: adoptionKey,
            attemptVersion: retryVersion,
            destinationsBySource,
            attachmentIdsBySource,
            projectedPaths: [...projectedPaths2],
          });
        }
      } catch (error) {
        const failure =
          error instanceof AdoptionFailure
            ? error
            : new AdoptionFailure(
                "network",
                error instanceof Error ? error.message : String(error),
              );
        reportAdoptionFailure(failure);
        console.warn(
          "[useAdoptInitialAttachments] initial attachment preparation failed:",
          error,
        );
        if (activeAdoptionKeyRef.current === adoptionKey) {
          setProgress({
            key: adoptionKey,
            attemptVersion: retryVersion,
            destinationsBySource,
            attachmentIdsBySource,
            projectedPaths: [...projectedPaths2],
            error: failure.message,
          });
        }
      } finally {
        if (inFlightKeyRef.current === adoptionKey)
          inFlightKeyRef.current = null;
      }
    })();
  }, [
    ready,
    adoptionKey,
    attachments,
    folderPath,
    operationId,
    progress,
    retryVersion,
    scopedGatewayFetch,
  ]);
  if (!attachments || attachments.length === 0) {
    return {
      ready: true,
      attachments: void 0,
      retry,
    };
  }
  if (!folderPath) {
    return {
      ready: false,
      attachments: void 0,
      error: "Workspace path is unavailable",
      retry,
    };
  }
  if (!ready || !adoptionKey || progress?.key !== adoptionKey) {
    return {
      ready: false,
      attachments: void 0,
      retry,
    };
  }
  const destinations = attachments.map(
    (source) => progress.destinationsBySource[source],
  );
  const projectedPaths = new Set(progress.projectedPaths);
  const allReady = destinations.every(
    (destination) =>
      destination !== void 0 &&
      (!isCanvasMediaPath(destination) || projectedPaths.has(destination)),
  );
  if (!allReady || progress.error) {
    return {
      ready: false,
      attachments: void 0,
      ...(progress.error
        ? {
            error: progress.error,
          }
        : {}),
      retry,
    };
  }
  const attachmentRefs = attachments.flatMap((source, index2) => {
    const attachmentId = progress.attachmentIdsBySource[source];
    const destination = destinations[index2];
    return attachmentId && destination
      ? [
          {
            path: destination,
            attachment_source: "asset_vault",
            attachment_id: attachmentId,
          },
        ]
      : [];
  });
  return {
    ready: true,
    attachments: destinations,
    ...(attachmentRefs.length > 0
      ? {
          attachmentRefs,
        }
      : {}),
    retry,
  };
}
