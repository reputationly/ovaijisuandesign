// map-canvas-reference-resolutions.js
import {
  canvasReferenceIdentity,
  mapCanvasDirectReference,
} from "./table-document-to-llm-content.js";

function mapReferenceMediaMetadata(value) {
  if (!value || typeof value !== "object")
    throw new Error("Invalid reference media metadata");
  const row = value;
  const result = {};
  for (const key2 of ["duration_sec", "width", "height", "file_size"]) {
    const number2 = row[key2];
    if (number2 === void 0) continue;
    if (
      typeof number2 !== "number" ||
      !Number.isFinite(number2) ||
      (key2 === "file_size" ? number2 < 0 : number2 <= 0) ||
      (key2 !== "duration_sec" && !Number.isSafeInteger(number2))
    )
      throw new Error("Invalid reference media metadata");
    result[key2] = number2;
  }
  return result;
}

function mapCanvasReferenceMetadata(value) {
  if (!value || typeof value !== "object")
    throw new Error("Invalid reference metadata");
  const row = value;
  if (!Array.isArray(row.attachments) || row.attachments.length > 256)
    throw new Error("Invalid reference attachments");
  return {
    media: row.media === void 0 ? void 0 : mapReferenceMediaMetadata(row.media),
    attachments: row.attachments.map((raw2) => {
      if (!raw2 || typeof raw2 !== "object")
        throw new Error("Invalid reference attachment");
      const attachment = raw2;
      if (
        typeof attachment.id !== "string" ||
        !attachment.id ||
        attachment.id.length > 256 ||
        !["image", "video", "audio", "text", "other"].includes(
          String(attachment.kind),
        )
      )
        throw new Error("Invalid reference attachment");
      return {
        id: attachment.id,
        kind: String(attachment.kind),
        metadata:
          attachment.metadata === void 0
            ? void 0
            : mapReferenceMediaMetadata(attachment.metadata),
      };
    }),
  };
}

export function mapCanvasReferenceResolutions(value, expected) {
  if (!Array.isArray(value))
    throw new Error("Invalid reference resolution response");
  if (expected && value.length !== expected.length) {
    throw new Error("Reference resolution count mismatch");
  }
  return value.map((raw2, index2) => {
    if (!raw2 || typeof raw2 !== "object")
      throw new Error("Invalid reference resolution");
    const row = raw2;
    const reference = mapCanvasDirectReference(row.reference);
    if (
      !reference ||
      !["available", "deleted", "missing", "unavailable"].includes(
        String(row.status),
      )
    ) {
      throw new Error("Invalid reference resolution");
    }
    if (
      expected &&
      canvasReferenceIdentity(reference) !==
        canvasReferenceIdentity(expected[index2])
    ) {
      throw new Error("Reference resolution identity mismatch");
    }
    return {
      reference,
      status: row.status,
      ...(typeof row.name === "string"
        ? {
            name: row.name,
          }
        : {}),
      ...(row.metadata === void 0
        ? {}
        : {
            metadata: mapCanvasReferenceMetadata(row.metadata),
          }),
    };
  });
}
