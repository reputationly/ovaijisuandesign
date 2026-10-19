/**
 * 图像类工具：擦除、重绘、多镜头等固定路由工具的入参定义。
 *
 * 这里有两条容易踩的线：
 *
 * - **擦除提示词是按框拼出来的**。模型不认识抽象的「擦掉这块」，只认 `<bbox>` 归一化坐标；
 *   而且区域外必须显式声明「保持不变」，否则模型会把整张图重画一遍。
 *   单框和多框是两套措辞 —— 多框还要额外强调「框与框之间也别动」。
 * - **画幅用对数距离取最接近的一档**。用户给的是任意宽高比，后端只接受固定档位；
 *   用 `|log(ratio)|` 而不是线性差，是因为 16:9 与 4:3 的「远近」在感知上是对数尺度。
 */
import { BACKEND_VIBE_MULTI_SHOT, BACKEND_VIBE_RELIGHT, BACKEND_VIBE_STORYBOARD } from "../../backend-ids.js";
import { reject } from "../request.js";
import { fixed, objectParams } from "./fixed.js";
import { id, media, operation } from "../../project-v3/task-mappers.js";

const EDIT_ASPECT_RATIOS = [
  { label: "1:1", value: 1 },
  { label: "16:9", value: 16 / 9 },
  { label: "9:16", value: 9 / 16 },
  { label: "4:3", value: 4 / 3 },
  { label: "3:4", value: 3 / 4 },
  { label: "3:2", value: 3 / 2 },
  { label: "2:3", value: 2 / 3 },
  { label: "5:4", value: 5 / 4 },
  { label: "4:5", value: 4 / 5 },
  { label: "21:9", value: 21 / 9 }
];
export interface SeedreamEditParams {
  resolution: string;
  aspectRatio?: number;
}

export interface BBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface EraseParams extends SeedreamEditParams {
  bboxes: BBox[];
}

function snapAspectRatio(ratio: number | undefined): string | undefined {
  if (!ratio || ratio <= 0 || !Number.isFinite(ratio))
    return undefined;
  const distance = (value: number) => Math.abs(Math.log(value / ratio!));
  return EDIT_ASPECT_RATIOS.reduce((best, candidate) => distance(candidate.value) < distance(best.value) ? candidate : best).label;
}
function compileSeedreamErasePrompt(boxes: BBox[]): string {
  const serialized = boxes.map((b: BBox) => `<bbox>${b.x1} ${b.y1} ${b.x2} ${b.y2}</bbox>`).join("、");
  return boxes.length === 1 ? `请编辑图1，仅擦除 ${serialized} 区域，并用周围环境自然补全。区域外内容保持不变。` : `请编辑图1，仅擦除以下 ${boxes.length} 个区域：${serialized}，并用周围环境自然补全。这些区域外的内容全部保持不变，包括区域之间的部分。`;
}
const SEEDREAM_5 = {
  backend: "seedream",
  model: "doubao-seedream-5-0-pro-260628",
  pricing: "doubao-seedream-5-0-pro-260628",
  quote: (params: Record<string, unknown>) => ({ resolution: params.size === "1K" ? "1K" : "2K" })
};
export const resolution = {
  type: "string",
  enum: ["1k", "2k", "4k"],
  description: "Output size tier."
};
export const aspectRatio = {
  type: "number",
  exclusiveMinimum: 0,
  maximum: 100,
  description: "Width / height of the output canvas."
};
const coordinate = { type: "integer", minimum: 0, maximum: 1e3 };
const targetSide = { type: "integer", minimum: 1, maximum: 8192 };
const oneImage = { min: 1, max: 1, kinds: { image: 1 } };
const noPrompt = { use: "none" };
const canvasTool = {
  operation: "generate_image",
  surfaces: ["canvas"]
};
const sharedTool = {
  operation: "generate_image",
  surfaces: ["agent", "canvas"]
};
function seedreamEdit({ params }: { params: SeedreamEditParams }, prompt?: string) {
  return {
    ...prompt === undefined ? {} : { prompt },
    params: {
      size: params.resolution === "1k" ? "1K" : "2K",
      aspect_ratio: snapAspectRatio(params.aspectRatio) ?? "1:1"
    }
  };
}
const BBOX = /<bbox>\s*\d+\s+\d+\s+\d+\s+\d+\s*<\/bbox>/;
const redraw = {
  ...canvasTool,
  id: "generate_image:redraw",
  displayName: "Redraw",
  description: "Canvas inpainting: repaint the <bbox> region marked in the prompt of one image and keep the rest (Seedream 5.0 Pro); an optional second image guides the new content.",
  paramSchema: objectParams({ resolution, aspectRatio }),
  prompt: { use: "required" },
  references: { min: 1, max: 2, kinds: { image: 2 } },
  execution: fixed<SeedreamEditParams>(SEEDREAM_5, (request) => {
    // `RegExp.test` 本来就会把参数强制转成字符串，所以这里显式 `String(...)` —— 与上游行为一致，
    // 换成 `?? ""` 会改掉「prompt 缺失时」的判定输入。
    if (!BBOX.test(String(request.prompt)))
      reject("Redraw requires the original bbox prompt");
    return seedreamEdit(request);
  })
};
const erase = {
  ...canvasTool,
  id: "generate_image:erase",
  displayName: "Erase",
  description: "Canvas erase: remove the content inside one or more boxes of one image and fill it from the surroundings (Seedream 5.0 Pro); no prompt.",
  paramSchema: objectParams({
    resolution,
    aspectRatio,
    bboxes: {
      type: "array",
      minItems: 1,
      maxItems: 100,
      items: {
        type: "object",
        properties: { x1: coordinate, y1: coordinate, x2: coordinate, y2: coordinate },
        required: ["x1", "y1", "x2", "y2"]
      },
      description: "Normalized 0..1000 boxes, x1 < x2 and y1 < y2."
    }
  }, ["bboxes"]),
  prompt: noPrompt,
  references: oneImage,
  execution: fixed<EraseParams>(SEEDREAM_5, (request) => {
    const boxes = request.params.bboxes;
    if (boxes.some((box: BBox) => box.x1 >= box.x2 || box.y1 >= box.y2))
      reject("Invalid normalized bbox (0–1000)");
    return seedreamEdit(request, compileSeedreamErasePrompt(boxes));
  })
};
const outpaint = {
  ...canvasTool,
  id: "generate_image:outpaint",
  displayName: "Outpaint",
  description: "Canvas outpaint: fill the empty margin of an image the canvas already expanded to aspectRatio (Nano Banana 2); an optional second image is the untouched source, kept as lineage only.",
  paramSchema: objectParams({ resolution, aspectRatio }, ["aspectRatio"]),
  prompt: noPrompt,
  references: { min: 1, max: 2, kinds: { image: 2 } },
  execution: fixed({
    backend: "nano_banana",
    model: "nano_banana_2",
    pricing: "nano_banana_2"
  }, ({ params, media: media2 }) => ({
    params: {
      resolution: String(params.resolution ?? "2k").toUpperCase(),
      aspect_ratio: params.aspectRatio
    },
    // The source image is lineage only; the provider fills the composite.
    image_paths: media2.image.slice(0, 1)
  }))
};
const superResolution = {
  ...sharedTool,
  id: "generate_image:super_resolution",
  displayName: "Super resolution",
  description: "Upscale one image without repainting its content (MediaKit enhance), optionally to explicit target dimensions given together. Use it when only resolution or clarity should improve; a generation model would redraw the content.",
  paramSchema: objectParams({ targetWidth: targetSide, targetHeight: targetSide }),
  prompt: noPrompt,
  references: oneImage,
  execution: fixed({
    backend: "mediakit_enhance",
    model: "mediakit_enhance",
    pricing: "mediakit_enhance",
    // calculate-cost takes the base model plus this tier, not a composite ledger key.
    quote: () => ({ resolution: "professional" })
  }, ({ params }) => {
    if (params.targetWidth === undefined !== (params.targetHeight === undefined))
      reject("Both target dimensions are required");
    return {
      params: params.targetWidth === undefined ? {} : { target_width: params.targetWidth, target_height: params.targetHeight }
    };
  })
};
const removeBackground = {
  ...sharedTool,
  id: "generate_image:remove_background",
  displayName: "Remove background",
  description: "Cut out the salient subject of one image into a transparent-background PNG (Jimeng saliency segmentation): clean edges on hair and translucency, never repaints. Use it for stickers, logos, products and subject cutouts.",
  prompt: noPrompt,
  references: oneImage,
  paramSchema: objectParams({}),
  execution: fixed({
    backend: "jimeng_remove_bg",
    model: "jimeng_remove_background",
    pricing: "jimeng_remove_background"
  })
};
const layerDecompose = {
  ...sharedTool,
  id: "generate_image:layer_decompose",
  displayName: "Layer decompose",
  description: "Split one image into separate editable layers (Seedream layer decompose); an optional prompt steers the split. Every layer is a new Resource: the first under output key primary, the others under primary_2, primary_3, ... in the order returned, their count known only after the run. Declare primary with mode=create and a placement with a role; that placement also places every other layer with the same role. Billed per actual layer.",
  paramSchema: objectParams({}),
  prompt: { use: "optional" },
  references: oneImage,
  execution: fixed({
    backend: "seedream",
    model: "seedream-5-layer-decompose",
    pricing: "seedream-layer-decompose-small",
    variableOutputBilling: true,
    // The layer count is unknown until it runs: precheck six small images, as the cloud does.
    quote: () => ({ quantity: 6 })
  })
};
export const IMAGE_TOOLS = [
  redraw,
  erase,
  outpaint,
  superResolution,
  removeBackground,
  layerDecompose
];
const dagParam = {};
interface DagOptions {
  prompt?: { use: string };
  /** 把参考图路径重写一遍（部分模型要求特定顺序或数量）。 */
  image_paths?: (images: string[]) => string[];
}

const dag = (
  name: string,
  model: string,
  backend: string,
  displayName: string,
  description: string,
  keys: string[],
  references: { min: number; max: number },
  options: DagOptions = {},
) => ({
  id: `generate_image:${name}`,
  operation: "generate_image",
  displayName,
  description,
  paramSchema: objectParams(Object.fromEntries(keys.map((key) => [key, dagParam]))),
  prompt: options.prompt ?? { use: "optional" },
  references: { ...references, kinds: { image: references.max } },
  // Canvas migrates the legacy template tools; Agent exposure is unchanged.
  surfaces: ["canvas"],
  execution: fixed({ backend, model, pricing: model }, ({ params, media: media2 }) => ({
    params,
    ...options.image_paths ? { image_paths: options.image_paths(media2.image) } : {}
  }))
});
export const IMAGE_DAGS = [
  dag("multi_shot", "multi-shot", BACKEND_VIBE_MULTI_SHOT, "Multi-shot", "Re-render one image from a new camera angle (horizontal_angle, vertical_angle, zoom) while keeping the subject and scene.", ["horizontal_angle", "vertical_angle", "zoom"], { min: 1, max: 1 }),
  dag("storyboard", "n-storyboard", BACKEND_VIBE_STORYBOARD, "Storyboard", "Lay out a storyboard grid of shots (grid_setting, cell_ratio) from the prompt and up to four reference images.", ["grid_setting", "cell_ratio"], { min: 1, max: 4 }, { prompt: { use: "required" } }),
  dag(
    "relight",
    "relight_image_v4",
    BACKEND_VIBE_RELIGHT,
    "Relight",
    "Relight one image to match a lighting reference image (second reference), with light, background and effect settings.",
    ["light1", "light2", "light3", "background", "effect", "user_intent"],
    { min: 2, max: 2 },
    // The second image is a lighting control image, not a source image.
    { image_paths: (images) => images.slice(0, 1) }
  )
];

