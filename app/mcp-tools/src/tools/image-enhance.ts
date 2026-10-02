import { z } from "zod";

import { errorReply, structuredReply } from "../replies.js";
import { EditResponseSchema } from "../schemas.js";
import type { RegisterTools } from "./types.js";

/**
 * image_enhance：把已有图送去超分，不重新生成。
 * 同步接口（gateway 等平台返回后才回），所以超时给足。
 */

const ENHANCE_TIMEOUT_MS = 10 * 60_000;

const SOURCE_NODE_ID_DESCRIPTION =
  "Optional source canvas nodeId (e.g. from canvas_list_nodes) when editing/regenerating a node. Links output to source via derivation edge.";

export const registerImageEnhance: RegisterTools = (registrar, gw) => {
  registrar.registerTool(
    "image_enhance",
    {
      description:
        "Enhance/upscale an existing image using the dedicated MediaKit service, preserving its content instead of regenerating it. " +
        "Use for 超清/高清/画质增强. The fixed professional tier defaults to 2x of the service-prepared input; very small/large inputs may " +
        "first be proportionally resized. For an explicit output size, pass both target dimensions instead of multiple. The service " +
        "validates supported input dimensions; report errors rather than silently switching to image generation or ffmpeg scaling. " +
        "Output is registered and sent to canvas by Gateway; do not add a duplicate canvas node.",
      inputSchema: {
        image_path: z.string().trim().min(1).describe("Local path of the source image."),
        source_node_id: z.string().optional().describe(SOURCE_NODE_ID_DESCRIPTION),
        filename: z.string().trim().min(1).describe("Output filename without extension."),
        multiple: z
          .number()
          .min(1)
          .max(8)
          .optional()
          .describe("Scale of the prepared input; defaults to 2. Omit with target dimensions."),
        target_width: z.number().int().min(64).max(10240).optional(),
        target_height: z.number().int().min(64).max(10240).optional(),
      },
      outputSchema: {
        path: z.string().describe("Enhanced image file path"),
        node_id: z.string().optional().describe("Canvas node id created by Gateway, when it was placed on canvas."),
      },
      attachmentInputPaths: (input) => [input.image_path],
      attachmentOutputPaths: (output) => [output.path],
    },
    async ({ image_path, source_node_id, filename, multiple, target_width, target_height }) => {
      if ((target_width === undefined) !== (target_height === undefined)) {
        return errorReply("Provide both target_width and target_height, or neither.");
      }
      if (target_width !== undefined && multiple !== undefined) {
        return errorReply("Choose target dimensions or multiple, not both.");
      }
      const r = await gw.post(
        "/api/edit/enhance-image",
        {
          image_path,
          source_node_id,
          filename,
          tool_version: "professional",
          ...(target_width === undefined ? { multiple: multiple ?? 2 } : { target_width, target_height }),
        },
        ENHANCE_TIMEOUT_MS,
        EditResponseSchema,
      );
      if (!r.ok) return errorReply(r.error);
      return structuredReply({ path: r.path, ...(r.node_id ? { node_id: r.node_id } : {}) });
    },
  );
};
