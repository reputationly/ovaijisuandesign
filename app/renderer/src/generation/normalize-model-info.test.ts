import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

// 这个模块顺带把整棵界面依赖（preload 桥、runtime-config、i18n）拖进来；这里只测查询定义，
// 把三条与用例无关的依赖换掉。
vi.mock("../infra/workspace-gateway.js", () => ({ API_PATHS: { modelsConfig: "/api/v1/models/config" } }));
vi.mock("../infra/runtime-config.js", () => ({ useGatewayScope: () => ({ gatewayReady: true, scopeKey: "ws-a", gatewayBinding: null }) }));
vi.mock("./use-model-catalog-scope-key.js", () => ({
  useGatewayFetch: () => async () => ({ ok: true, status: 200, json: async () => ({}) }),
  useModelCatalogScopeKey: () => "ws-a",
}));

const { IMAGE_UPSCALE_QUERY_KEY, imageUpscaleQueryOptions } = await import("./normalize-model-info.js");

/**
 * 图片超分开关以前是挂在模型数组上的不可枚举属性 —— React Query 的结构共享会让它丢或过期：
 * 模型列表没变时返回旧数组（旧值），变了就新建数组（属性没了）。这里用真实的 QueryClient
 * 走一遍"模型列表完全不变、只有开关变化"的场景，钉住新实现。
 */
function fakeGateway(initial: unknown) {
  let payload = initial;
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return { ok: true, status: 200, json: async () => payload } as unknown as Response;
  };
  return { fetchImpl, calls: () => calls, set: (next: unknown) => { payload = next; } };
}

describe("图片超分可用性查询", () => {
  it("模型列表两次完全相同：false → true 要跟着变，true → false 也要跟着变", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    // 模型列表始终是同一份 —— 这条查询根本不读模型列表。
    const gateway = fakeGateway({ imageModels: [{ id: "qwen-image" }], imageUpscaleAvailable: false });

    const options = () => imageUpscaleQueryOptions(gateway.fetchImpl, "ws-a", true);
    expect(await queryClient.fetchQuery(options())).toBe(false);

    // 用户在设置里配好了图片超分模型：模型列表不变，只有这个字段变 true。
    gateway.set({ imageModels: [{ id: "qwen-image" }], imageUpscaleAvailable: true });
    await queryClient.invalidateQueries({ queryKey: [IMAGE_UPSCALE_QUERY_KEY, "ws-a"] });
    expect(await queryClient.fetchQuery(options())).toBe(true);

    // 再删掉模型：又要回到不可用。
    gateway.set({ imageModels: [{ id: "qwen-image" }], imageUpscaleAvailable: false });
    await queryClient.invalidateQueries({ queryKey: [IMAGE_UPSCALE_QUERY_KEY, "ws-a"] });
    expect(await queryClient.fetchQuery(options())).toBe(false);
  });

  it("只有显式 true 才算可用；缺字段 / 非布尔都不算", async () => {
    for (const payload of [{}, { imageUpscaleAvailable: "true" }, { imageUpscaleAvailable: 1 }, { imageUpscaleAvailable: null }]) {
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      const gateway = fakeGateway(payload);
      expect(await queryClient.fetchQuery(imageUpscaleQueryOptions(gateway.fetchImpl, "ws-a", true))).toBe(false);
    }
  });

  it("查询键带 catalogScopeKey，且和模型列表的键不共用一个", () => {
    const gateway = fakeGateway({});
    expect(imageUpscaleQueryOptions(gateway.fetchImpl, "ws-b", true).queryKey).toEqual([IMAGE_UPSCALE_QUERY_KEY, "ws-b"]);
    expect(imageUpscaleQueryOptions(gateway.fetchImpl, "ws-b", true).queryKey).not.toEqual(["models", "ws-b"]);
  });
});
