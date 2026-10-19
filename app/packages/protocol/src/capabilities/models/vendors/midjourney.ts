/**
 * midjourney（图像）的能力表。
 *
 * 模型：`midjourney-8.2`（共 1 个）。
 * `params` 描述界面能给用户看哪些可调项；`prepare` 把用户的选择翻译成
 * 后端认的请求体（参数一律是字符串字典，见 `capabilities/request` 的 `wire`）。
 *
 * 本文件由 v3 preload 产物还原（../packages/protocol/dist/capabilities/models/vendors/midjourney.js），类型是按各厂商实际用法补的，见 `shared.ts`。
 */
import { BACKEND_MIDJOURNEY } from "../../../backend-ids.js";
import { IMAGE_ASPECT_RATIO, IMAGE_RESOLUTION, VendorEntry } from "./shared.js";
import { intInRange, reject, wire } from "../../request.js";
import { resolution } from "../../tools/image.js";
import { kind, media } from "../../../project-v3/task-mappers.js";

const integerText = (description: string, defaultValue: unknown) => ({
  type: ["number", "string"],
  description,
  default: defaultValue
});
const SCOPE = "image vendor=midjourney";
const RANGES = [
  { names: ["stylize"], label: "stylize", min: 0, max: 1e3 },
  { names: ["chaos", "c"], label: "chaos", min: 0, max: 100 },
  { names: ["weird", "w"], label: "weird", min: 0, max: 3e3 }
];
function promptFlag(prompt: string, names: string[]) {
  const match = prompt.match(new RegExp(`(?:^|\\s)--(?:${names.join("|")})(?=$|[=\\s])(?:[=\\s]+(\\S+))?`, "i"));
  return match ? { value: match[1] } : undefined;
}
function checkPromptFlags(prompt: string): void {
  const ratio = promptFlag(prompt, ["ar"]);
  if (ratio && !/^\d+:\d+$/.test(ratio.value ?? ""))
    reject(`${SCOPE} prompt flag --ar ${ratio.value ?? ""} is malformed. Use W:H integers, e.g. --ar 16:9.`);
  for (const { names, label, min, max } of RANGES) {
    const flag = promptFlag(prompt, names);
    const n = Number(flag?.value);
    if (flag && (flag.value === undefined || !Number.isInteger(n) || n < min || n > max))
      reject(`${SCOPE} prompt flag --${label} ${flag.value ?? ""} is invalid. Use an integer ${min}..${max}.`);
  }
}
export const midjourney: VendorEntry = {
  vendor: "midjourney",
  modality: "image",
  backend: BACKEND_MIDJOURNEY,
  knowledgeCard: "vendors/midjourney.md",
  models: {
    "midjourney-8.2": {
      pricing: "midjourney",
      description: "Use only when explicitly requested by the user. For decorative art direction, editorial mood, art prints, patterns, painterly illustration and moodboards. Best suited to concise English prompts; less suited to precise in-image text and strict subject consistency."
    }
  },
  params: {
    aspect_ratio: IMAGE_ASPECT_RATIO([
      "1:1",
      "16:9",
      "9:16",
      "3:4",
      "4:3",
      "3:2",
      "2:3",
      "5:4",
      "4:5",
      "21:9"
    ]),
    resolution: {
      ...IMAGE_RESOLUTION(["1k", "2k"]),
      description: "Output size tier. Defaults to 2k, which selects HD rendering.",
      default: "2k"
    },
    stylize: integerText("Stylization strength, integer 0-1000 (default 100). Higher is more artistic.", 100),
    chaos: integerText("Variety across outputs, integer 0-100 (default 0). Higher is more diverse.", 0),
    weird: integerText("Unconventional aesthetics, integer 0-3000 (default 0).", 0)
  },
  native: { resolution: { kind: "enum", name: "clarity" } },
  prepare: ({ modelId, prompt, params, media: media2 }) => {
    for (const { label, min, max } of RANGES)
      intInRange(SCOPE, label, params[label], min, max);
    checkPromptFlags(prompt);
    const { resolution: resolution2 } = params;
    return {
      backend: BACKEND_MIDJOURNEY,
      model_id: modelId,
      // HD is a prompt flag upstream; the clarity parameter alone does not select it.
      prompt: resolution2 === "2k" && !/(^|\s)--hd(\s|$)/i.test(prompt) ? `${prompt} --hd` : prompt,
      params: wire(params),
      image_paths: [...media2.image]
    };
  }
};

