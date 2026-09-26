import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { type FakeGateway, startFakeGateway, status } from "./__fixtures__/fake-gateway.js";
import { fetchMediaModels, type MediaModelInfo, parseMediaModelsResponse } from "./media-models-cache.js";
import { assertQuestionModelOptionsMatchCatalog, questionModelSelectionCategory } from "./question-model-catalog-guard.js";
import { putRecommendedQuestionOptionsFirst, QUESTION_FORMAT_HINT } from "./question-option-order.js";

/** 和 gateway 目录同形：平台模型 id 就是 display_name，backend / model_name 挂在厂商别名下。 */
const catalogRow = (id: string, type: string, tool: string, extra: Record<string, unknown> = {}) => ({
  id,
  name: id,
  backend: "alias_backend",
  model_name: "alias-model",
  type,
  display_name: id,
  description: "",
  tool_names: [tool],
  visibility: "",
  icon_url: "",
  series_id: id,
  hot: false,
  ...extra,
});

const CATALOG = {
  imageModels: [catalogRow("flux-kontext-pro", "image", "hub_generate_image"), catalogRow("seedream-4.0", "image", "hub_generate_image")],
  videoModels: [catalogRow("wan2.2-t2v", "video", "hub_generate_video"), catalogRow("wan2.2-i2v", "video", "hub_generate_video", { visibility: "hidden" })],
  audioModels: [catalogRow("cosyvoice-v2", "audio", "hub_generate_audio_speech")],
  textModels: [],
  defaultTextModelId: "",
};

const models = (): MediaModelInfo[] => parseMediaModelsResponse(CATALOG).models;
const ask = (header: string, labels: string[]) => ({ questions: [{ header, question: header, options: labels.map((label) => ({ label })) }] });

describe("question：推荐项排序和格式提醒", () => {
  it("推荐项挪到最前，其余保持原顺序；questions 不是数组时不动", () => {
    const args = { questions: [{ options: [{ label: "A" }, { label: "B（推荐）" }, { label: "C (recommended)" }, { label: "D(推荐) " }] }] };
    putRecommendedQuestionOptionsFirst(args);
    expect(args.questions[0]!.options.map((o) => o.label)).toEqual(["B（推荐）", "C (recommended)", "D(推荐) ", "A"]);
    const s = { questions: "[]" };
    putRecommendedQuestionOptionsFirst(s);
    expect(s.questions).toBe("[]");
  });

  it("格式提醒逐字包含正反例", () => {
    expect(QUESTION_FORMAT_HINT).toContain('WRONG (will fail validation and waste your turn):\n{"questions": "[{\\"question\\": \\"...\\"}]"}');
    expect(QUESTION_FORMAT_HINT.startsWith("\n\n---\n\n## CRITICAL")).toBe(true);
  });
});

describe("question：模型选项必须在当前目录里", () => {
  it("识别选模型的问题及类别；不是选模型的问题不管", () => {
    expect(questionModelSelectionCategory(ask("选择视频模型", []))).toBe("video");
    expect(questionModelSelectionCategory(ask("Which image model?", []))).toBe("image");
    expect(questionModelSelectionCategory(ask("用哪个语音模型", []))).toBe("audio");
    expect(questionModelSelectionCategory(ask("选择模型", []))).toBe("all");
    expect(questionModelSelectionCategory(ask("选择画面比例", []))).toBeUndefined();
    expect(questionModelSelectionCategory(ask("这个模型效果怎么样", []))).toBeUndefined();
    expect(questionModelSelectionCategory({ questions: JSON.stringify(ask("选择视频模型", []).questions) })).toBe("video");
  });

  it("我们的平台模型名原样放行，大小写 / 分隔符不敏感；自动 / 通用选项放行", () => {
    expect(() => assertQuestionModelOptionsMatchCatalog(ask("选择图片模型", ["flux-kontext-pro（推荐）", "Seedream 4.0", "自动选择"]), models())).not.toThrow();
    expect(() => assertQuestionModelOptionsMatchCatalog(ask("选择视频模型", ["wan2.2-t2v", "Auto"]), models())).not.toThrow();
  });

  it("目录外的名字（厂商系列名、别名、隐藏模型）被拦，错误里列出当前可选的 display_name", () => {
    const err = (() => {
      try {
        assertQuestionModelOptionsMatchCatalog(ask("选择视频模型", ["Kling 2.1", "alias-model", "wan2.2-i2v", "wan2.2-t2v"]), models());
      } catch (e) {
        return e as Error;
      }
      return undefined;
    })();
    expect(err?.message).toContain("The question asks the user to choose a video model, but some options cannot be shown.");
    expect(err?.message).toContain("Unavailable model options: Kling 2.1, alias-model, wan2.2-i2v.");
    expect(err?.message).toContain("Use a concrete exact display_name from: wan2.2-t2v.");
  });

  it("一个名字对上多个模型算歧义", () => {
    const dup = [...models(), { ...models()[0]!, id: "flux-kontext-pro-2", display_name: "Flux Kontext Pro" }];
    expect(() => assertQuestionModelOptionsMatchCatalog(ask("选择图片模型", ["flux kontext pro"]), dup)).toThrow(
      /Ambiguous model options: flux kontext pro \(matches flux-kontext-pro, Flux Kontext Pro\)/,
    );
  });

  it("目录为空（gateway 不可用 / 没配模型）时放行", () => {
    expect(() => assertQuestionModelOptionsMatchCatalog(ask("选择视频模型", ["anything"]), [])).not.toThrow();
  });
});

describe("模型目录", () => {
  let gw: FakeGateway;
  beforeAll(async () => {
    gw = await startFakeGateway();
  });
  afterAll(() => gw.close());
  beforeEach(() => gw.reset());

  it("三类摊平；缺 id / type / tool_names 的行丢掉；缺字段补默认", () => {
    const parsed = parseMediaModelsResponse({ imageModels: [{ id: "a", type: "image", tool_names: ["t"] }, { id: "b", type: "image" }], videoModels: [], audioModels: [] });
    expect(parsed).toEqual({
      valid: true,
      models: [{ id: "a", type: "image", display_name: "a", description: "", tool_names: ["t"], visibility: "", icon_url: "", series_id: "", hot: false }],
    });
    expect(parseMediaModelsResponse({ imageModels: [] }).valid).toBe(false);
  });

  it("从 gateway 的 /api/models 取；出错回空列表", async () => {
    gw.routes.set("/api/models", CATALOG);
    expect((await fetchMediaModels(`${gw.url}/`)).models.map((m) => m.id)).toEqual(["flux-kontext-pro", "seedream-4.0", "wan2.2-t2v", "wan2.2-i2v", "cosyvoice-v2"]);
    gw.routes.set("/api/models", status(500));
    expect(await fetchMediaModels(gw.url)).toEqual({ models: [] });
  });
});
