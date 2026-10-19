/**
 * v3 媒体代理的测试。
 *
 * 这一层的价值几乎全在**拒绝**和**作废**上：票据签发前的 HEAD 预检、签发后的逐次复核、
 * 以及「工作区被换掉之后旧票据立刻失效」。所以用例以负向为主，而且刻意去踩
 * 那些「看起来能用、其实越界」的组合。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  isAcceptableHead,
  isAcceptableRead,
  isLoopbackRoot,
  NativeWorkbenchMedia,
  type MediaBinding,
  type MediaDeps,
  type MediaOwner,
} from "./native-workbench-media.js";

const BINDING: MediaBinding = {
  baseUrl: "http://127.0.0.1:51234/",
  claim: "c".repeat(64),
  instanceId: "inst-1",
  generation: 4,
  pid: 999,
};

const INPUT = {
  workspaceId: "ws-1",
  resourceId: "res-1",
  versionId: "ver-1",
  identity: { claim: BINDING.claim, instanceId: BINDING.instanceId, generation: BINDING.generation },
};

function makeDeps(over: Partial<MediaDeps> = {}): MediaDeps {
  return {
    binding: () => BINDING,
    snapshot: async () => ({ status: "ready" }),
    onAccountChange: () => ({ dispose: () => {} }),
    isRevealRequest: () => true,
    previewPath: (r, v) => `/api/canvas-v3/previews/${r}/${v}`,
    identityHeaders: () => ({ "x-claim": BINDING.claim }),
    withExportActivity: (_b, _w, _l, run) => run(),
    log: () => {},
    ...over,
  };
}

const owner = (over: Partial<MediaOwner> = {}): MediaOwner => ({
  id: "owner-1",
  scopeKey: "scope-1",
  webContentsId: 7,
  current: () => true,
  ...over,
});

/** 记下所有 fetch 调用，并按需返回 HEAD / GET 响应。 */
function stubFetch(head: () => Response | Promise<Response>) {
  const calls: { method: string; url: string; headers: Headers }[] = [];
  vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ method: init?.method ?? "GET", url: String(input), headers: new Headers(init?.headers as HeadersInit) });
    return head();
  });
  return calls;
}

const goodHead = () =>
  new Response(null, { status: 200, headers: { "content-type": "video/mp4", "content-length": "1024" } });

beforeEach(() => vi.unstubAllGlobals());
afterEach(() => vi.unstubAllGlobals());

describe("上游地址检查", () => {
  it("只接受本机 loopback 的根", () => {
    for (const url of ["http://127.0.0.1:1234/", "http://localhost:1234/", "http://[::1]:1234/"]) {
      expect(isLoopbackRoot(new URL(url)), url).toBe(true);
    }
    for (const url of [
      "https://127.0.0.1:1234/",
      "http://example.com:1234/",
      "http://127.0.0.1:1234/api",
      "http://127.0.0.1:1234/?x=1",
      "http://user:pw@127.0.0.1:1234/",
      "http://127.0.0.1:1234/#h",
    ]) {
      expect(isLoopbackRoot(new URL(url)), url).toBe(false);
    }
  });
});

describe("HEAD 预检", () => {
  const h = (o: Record<string, string>) => new Headers(o);

  it("放行标准媒体响应", () => {
    expect(isAcceptableHead(200, h({ "content-length": "10" }), "video/mp4")).toBe(true);
  });

  it("拒绝非 200、非白名单 MIME、附件响应、零长度、压缩编码", () => {
    expect(isAcceptableHead(206, h({ "content-length": "10" }), "video/mp4")).toBe(false);
    expect(isAcceptableHead(200, h({ "content-length": "10" }), "text/html")).toBe(false);
    expect(isAcceptableHead(200, h({ "content-length": "10", "content-disposition": "attachment" }), "video/mp4")).toBe(false);
    expect(isAcceptableHead(200, h({ "content-length": "0" }), "video/mp4")).toBe(false);
    expect(isAcceptableHead(200, h({ "content-length": "abc" }), "video/mp4")).toBe(false);
    expect(isAcceptableHead(200, h({ "content-length": "10", "content-encoding": "gzip" }), "video/mp4")).toBe(false);
    expect(isAcceptableHead(200, h({ "content-length": "10", "content-encoding": "identity" }), "video/mp4")).toBe(true);
  });
});

describe("读取时的复核", () => {
  const resp = (status: number, headers: Record<string, string>) => new Response(null, { status, headers });

  it("允许 200/206/416，416 不校验类型", () => {
    expect(isAcceptableRead(resp(200, { "content-type": "video/mp4" }), "video/mp4")).toBe(true);
    expect(isAcceptableRead(resp(206, { "content-type": "video/mp4" }), "video/mp4")).toBe(true);
    expect(isAcceptableRead(resp(416, {}), "video/mp4")).toBe(true);
    expect(isAcceptableRead(resp(500, { "content-type": "video/mp4" }), "video/mp4")).toBe(false);
  });

  it("类型必须与预检一致（防中途换资源）", () => {
    expect(isAcceptableRead(resp(200, { "content-type": "audio/mpeg" }), "video/mp4")).toBe(false);
  });
});

describe("签发", () => {
  it("预检通过后签出票据，URL 指向票据路径", async () => {
    stubFetch(goodHead);
    const media = new NativeWorkbenchMedia(makeDeps(), () => {});
    const grant = await media.grant(owner(), INPUT);
    expect(grant.url).toMatch(/^app:\/\/owner-1\/media\/[a-f0-9-]{36}$/);
    expect(grant.mimeType).toBe("video/mp4");
    expect(grant.expiresAt).toBeGreaterThan(Date.now());
    expect(media.allows(new URL(grant.url), 7)).toBe(true);
    // 另一个 webContents 取不到
    expect(media.allows(new URL(grant.url), 8)).toBe(false);
  });

  it("HEAD 不合格就不签", async () => {
    stubFetch(() => new Response(null, { status: 404 }));
    const media = new NativeWorkbenchMedia(makeDeps(), () => {});
    await expect(media.grant(owner(), INPUT)).rejects.toThrow(/MEDIA_UNAVAILABLE/);
  });

  it("请求形状不对时拒绝", async () => {
    stubFetch(goodHead);
    const media = new NativeWorkbenchMedia(makeDeps(), () => {});
    await expect(media.grant(owner(), INPUT, "not-a-uuid")).rejects.toThrow(/MEDIA_INVALID_REQUEST/);
    await expect(media.grant(owner(), { ...INPUT, resourceId: ".." })).rejects.toThrow(/MEDIA_INVALID_REQUEST/);
    const rejectAll = new NativeWorkbenchMedia(makeDeps({ isRevealRequest: () => false }), () => {});
    await expect(rejectAll.grant(owner(), INPUT)).rejects.toThrow(/MEDIA_INVALID_REQUEST/);
  });

  it("同一个 requestId 不能签两次", async () => {
    stubFetch(goodHead);
    const media = new NativeWorkbenchMedia(makeDeps(), () => {});
    const id = "11111111-1111-4111-8111-111111111111";
    await media.grant(owner(), INPUT, id);
    await expect(media.grant(owner(), INPUT, id)).rejects.toThrow(/MEDIA_INVALID_REQUEST/);
  });

  it("账号没就绪时拒绝", async () => {
    stubFetch(goodHead);
    const media = new NativeWorkbenchMedia(makeDeps({ snapshot: async () => ({ status: "loading" }) }), () => {});
    await expect(media.grant(owner(), INPUT)).rejects.toThrow(/MEDIA_UNAVAILABLE/);
  });

  it("绑定在这期间被换掉就作废（比到 pid 与 generation）", async () => {
    stubFetch(goodHead);
    let calls = 0;
    const media = new NativeWorkbenchMedia(
      makeDeps({ binding: () => (calls++ === 0 ? BINDING : { ...BINDING, generation: 5 }) }),
      () => {},
    );
    await expect(media.grant(owner(), INPUT)).rejects.toThrow(/MEDIA_SCOPE_RETIRED/);
  });

  it("文档已失效时拒绝", async () => {
    stubFetch(goodHead);
    const media = new NativeWorkbenchMedia(makeDeps(), () => {});
    await expect(media.grant(owner({ current: () => false }), INPUT)).rejects.toThrow(/MEDIA_SCOPE_RETIRED/);
  });

  it("上游地址不是 loopback 根时拒绝", async () => {
    stubFetch(goodHead);
    const media = new NativeWorkbenchMedia(makeDeps({ binding: () => ({ ...BINDING, baseUrl: "http://evil.example.com/" }) }), () => {});
    await expect(media.grant(owner(), INPUT)).rejects.toThrow(/MEDIA_UNAVAILABLE/);
  });
});

describe("兑换与作废", () => {
  it("票据被取消后取不到", async () => {
    stubFetch(goodHead);
    const media = new NativeWorkbenchMedia(makeDeps(), () => {});
    const id = "22222222-2222-4222-9222-222222222222";
    const grant = await media.grant(owner(), INPUT, id);
    media.cancelGrant(owner(), id);
    expect(media.allows(new URL(grant.url), 7)).toBe(false);
  });

  it("别人取消不了我的票据（要比 scopeKey 与 webContentsId）", async () => {
    stubFetch(goodHead);
    const media = new NativeWorkbenchMedia(makeDeps(), () => {});
    const id = "33333333-3333-4333-9333-333333333333";
    const grant = await media.grant(owner(), INPUT, id);
    media.cancelGrant(owner({ webContentsId: 8 }), id);
    expect(media.allows(new URL(grant.url), 7)).toBe(true);
  });

  it("revoke 只清掉该文档的票据", async () => {
    stubFetch(goodHead);
    const media = new NativeWorkbenchMedia(makeDeps(), () => {});
    const a = await media.grant(owner(), INPUT);
    const b = await media.grant(owner({ id: "owner-2" }), INPUT);
    media.revoke("owner-1");
    expect(media.allows(new URL(a.url), 7)).toBe(false);
    expect(media.allows(new URL(b.url), 7)).toBe(true);
  });

  it("账号变化会作废全部票据", async () => {
    stubFetch(goodHead);
    let fire: () => void = () => {};
    const media = new NativeWorkbenchMedia(makeDeps({ onAccountChange: (l) => { fire = l; return { dispose: () => {} }; } }), () => {});
    const grant = await media.grant(owner(), INPUT);
    fire();
    expect(media.allows(new URL(grant.url), 7)).toBe(false);
  });

  it("非票据 URL 一律不认", async () => {
    const media = new NativeWorkbenchMedia(makeDeps(), () => {});
    for (const url of ["app://owner-1/media/not-a-uuid", "https://owner-1/media/22222222-2222-4222-9222-222222222222", "app://other/media/22222222-2222-4222-9222-222222222222"]) {
      expect(media.allows(new URL(url), 7), url).toBe(false);
    }
  });
});
