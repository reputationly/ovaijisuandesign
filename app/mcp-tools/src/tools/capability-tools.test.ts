import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createHarness, gatewayFor, resultJson, resultText, type Harness } from "../testing/harness.js";
import { startFakeGateway, type FakeGateway } from "../testing/fake-gateway.js";
import type { ManifestModality } from "./capability-manifest.js";
import { registerCapabilityTools } from "./capability-tools.js";

let gw: FakeGateway;
let h: Harness;

const CATALOG = {
  imageModels: [
    { id: "g-image-2", backend: "openai", model_name: "gpt-image-2", display_name: "Design Image 2" },
    { id: "banana-2", backend: "nano_banana", model_name: "nano_banana_2_flash", display_name: "General Image 2", visibility: "hidden" },
  ],
  videoModels: [{ id: "seedance2.0", backend: "seedance", model_name: "seedance2.0", display_name: "Seedance 2.0" }],
  audioModels: [{ id: "speech-2.8-hd", backend: "minimax_tts", display_name: "Speech 2.8 HD" }],
  textModels: [],
  defaultTextModelId: "",
};

beforeEach(async () => {
  gw = await startFakeGateway();
  h = createHarness();
  registerCapabilityTools(h.registrar, gatewayFor(gw.url), "domestic");
});
afterEach(async () => {
  await gw.close();
});

describe("list_capabilities", () => {
  it("intersects the static manifest with the live catalog", async () => {
    gw.on("GET", "/api/models", (req) => {
      expect(req.query.get("agent_version")).toBe("2");
      return { json: CATALOG };
    });
    gw.on("GET", "/api/v1/models/concurrency/limits", { json: { items: [{ model: "gpt-image-2", total_concurrency: 4 }] } });
    const r = await h.call("list_capabilities", {});
    const out = resultJson<{ ok: boolean; region: string; modalities: ManifestModality[] }>(r);
    expect(out.ok).toBe(true);
    expect(out.region).toBe("domestic");
    expect(out.modalities.map((m) => m.modality)).toEqual(["image", "video", "audio.tts", "audio.music"]);

    const image = out.modalities[0]!;
    expect(image.vendors.map((v) => v.vendor)).toEqual(["gpt-image", "banana"]);
    const gpt = image.vendors[0]!;
    expect(gpt.models).toEqual(["gpt-image-2"]);
    expect(gpt.default_model).toBe("gpt-image-2");
    expect(gpt.user_visible_models).toEqual([{ model_id: "gpt-image-2", display_name: "Design Image 2" }]);
    expect(gpt.task_concurrency?.models["gpt-image-2"]).toEqual({ limited: true, limit: 4 });
    expect(gpt.parameters?.model_id).toEqual(["gpt-image-2"]);
    // hidden 的模型可调用但不对用户展示
    expect(image.vendors[1]!.user_visible_models).toEqual([]);
    expect(image.selection_policy.user_facing_catalog_rule).toBeTypeOf("string");

    expect(out.modalities[1]!.vendors.map((v) => v.vendor)).toEqual(["seedance"]);
    expect(out.modalities[2]!.vendors.map((v) => v.vendor)).toEqual(["official"]);
    expect(out.modalities[3]!.vendors).toEqual([]);
  });

  it("filters by modality and by picker selection", async () => {
    gw.on("GET", "/api/models", { json: CATALOG });
    gw.on("GET", "/api/internal/sessions/s1/selected-models", { json: { selected: { image: ["banana-2"] } } });
    const r = await h.call("list_capabilities", { modality: "image", _session_id: "s1" });
    const out = resultJson<{ modalities: ManifestModality[] }>(r);
    expect(out.modalities).toHaveLength(1);
    expect(out.modalities[0]!.vendors.map((v) => v.vendor)).toEqual(["banana"]);
  });

  it("returns no vendors when the catalog is unavailable", async () => {
    const r = await h.call("list_capabilities", {});
    const out = resultJson<{ modalities: ManifestModality[] }>(r);
    expect(out.modalities.every((m) => m.vendors.length === 0)).toBe(true);
  });
});

describe("get_model_concurrency", () => {
  it("combines limits and usage", async () => {
    gw.on("GET", "/api/v1/models/concurrency/limits", { json: { items: [{ model: "seedance2.0", total_concurrency: 2 }] } });
    gw.on("POST", "/api/v1/models/concurrency/usage", (req) => {
      expect(req.body).toEqual({ models: ["seedance2.0", "gpt-image-2"] });
      return { json: { items: [{ model: "seedance2.0", used_concurrency: 1 }] } };
    });
    const r = await h.call("get_model_concurrency", { models: ["seedance2.0", " gpt-image-2 ", "seedance2.0"] });
    expect(resultJson(r)).toEqual({
      models: [
        { model_id: "seedance2.0", limited: true, limit: 2, used: 1, available: 1 },
        { model_id: "gpt-image-2", limited: false, limit: 0, used: 0, available: null },
      ],
    });
  });

  it("reports gateway failure as an error", async () => {
    const r = await h.call("get_model_concurrency", { models: ["x"] });
    expect(r.isError).toBe(true);
    expect(resultText(r)).toMatch(/^Error: failed to query model concurrency: /);
  });
});
