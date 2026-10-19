/**
 * v3 会话隔离的测试。
 *
 * 这一层的价值全在**拒绝**上：产物校验保证了「内容是验过的」，这里的过滤器保证
 * 「只有验过的内容能被取到」。所以用例几乎都是负向的 —— 越界路径、未知 owner、
 * 外部协议、非 GET，任何一个漏掉都等于开了任意本地文件读取。
 */
import { describe, expect, it } from "vitest";
import { assetKeyFromPath, mediaAccountScope, nativeWorkbenchEntry, shouldAllowV3Request, validV3Owner, v3AssetHeaders, V3_CSP, V3_PARTITION, V3_PRESENTATION_QUERY } from "./session.js";
import type { V3BundleEntry } from "./host.js";

const entry = (body = "x"): V3BundleEntry => ({ body: Buffer.from(body), contentType: "application/javascript; charset=utf-8" });

function host(assets: Record<string, V3BundleEntry> = { "index.html": entry(), "assets/app.js": entry() }) {
  return {
    assets: new Map(Object.entries(assets)),
    ownerHosts: () => ["workbench-1"],
    readMedia: () => undefined,
    allowsMedia: () => false,
  };
}

describe("常量", () => {
  it("分区名和查询串照搬上游", () => {
    expect(V3_PARTITION).toBe("hilo-v3-workbench");
    expect(V3_PRESENTATION_QUERY).toBe("?presentation=workspace");
  });

  it("CSP 起手全禁，且不含 unsafe-eval", () => {
    expect(V3_CSP.startsWith("default-src 'none'")).toBe(true);
    expect(V3_CSP).not.toContain("unsafe-eval");
    for (const directive of ["frame-src 'none'", "object-src 'none'", "base-uri 'none'", "form-action 'none'"]) {
      expect(V3_CSP).toContain(directive);
    }
  });
});

describe("assetKeyFromPath", () => {
  it("普通路径解成产物键", () => {
    expect(assetKeyFromPath("/assets/app.js")).toBe("assets/app.js");
    expect(assetKeyFromPath("/index.html")).toBe("index.html");
  });

  it("拒绝越界与畸形路径", () => {
    for (const bad of ["/../secret", "/a/../../b", "/%2e%2e%2fsecret", "/a//b", "/a/./b", "/a\\b", "/", "/%ZZ", "//assets/app.js", "assets/app.js"]) {
      expect(assetKeyFromPath(bad), bad).toBeUndefined();
    }
  });
});

describe("shouldAllowV3Request", () => {
  it("放行已挂载 owner 名下的已知产物", () => {
    expect(shouldAllowV3Request("app://workbench-1/assets/app.js", host())).toBe(true);
    expect(shouldAllowV3Request("app://workbench-1/index.html", host())).toBe(true);
  });

  it("拒绝非 app 协议", () => {
    for (const url of ["https://workbench-1/assets/app.js", "file:///etc/passwd", "app-other://workbench-1/x"]) {
      expect(shouldAllowV3Request(url, host()), url).toBe(false);
    }
  });

  it("拒绝未挂载的 owner", () => {
    expect(shouldAllowV3Request("app://other-host/assets/app.js", host())).toBe(false);
  });

  it("拒绝产物里没有的路径", () => {
    expect(shouldAllowV3Request("app://workbench-1/assets/missing.js", host())).toBe(false);
    expect(shouldAllowV3Request("app://workbench-1/../etc/passwd", host())).toBe(false);
  });

  it("媒体路由交给媒体层判定", () => {
    const h = host();
    expect(shouldAllowV3Request("app://workbench-1/media/x.png", h)).toBe(false);
    const allowing = { ...host(), allowsMedia: () => true };
    expect(shouldAllowV3Request("app://workbench-1/media/x.png", allowing)).toBe(true);
  });

  it("解析不了的 URL 一律拒绝", () => {
    expect(shouldAllowV3Request("not a url", host())).toBe(false);
  });
});

describe("v3AssetHeaders", () => {
  it("带上 CSP、nosniff、no-store", () => {
    const headers = v3AssetHeaders("text/html; charset=utf-8");
    expect(headers["Content-Type"]).toBe("text/html; charset=utf-8");
    expect(headers["Content-Security-Policy"]).toBe(V3_CSP);
    // 少了 nosniff，产物可能被浏览器按内容嗅探成脚本
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    // 产物不该被缓存：换版本后缓存命中会让新旧代码混跑
    expect(headers["Cache-Control"]).toBe("no-store");
  });
});

describe("nativeWorkbenchEntry", () => {
  it("不给页面参数时就是入口页", () => {
    expect(nativeWorkbenchEntry("owner-1")).toBe("app://owner-1/index.html");
  });
  it("呈现方式走查询串，初始路由走 hash", () => {
    expect(nativeWorkbenchEntry("o", { presentation: "workspace" })).toBe(`app://o/index.html${V3_PRESENTATION_QUERY}`);
    expect(nativeWorkbenchEntry("o", { presentation: "canvas-only" })).toBe("app://o/index.html");
    // 路由是页面自己的导航状态，不该触发文档重载
    expect(nativeWorkbenchEntry("o", { initialRoute: "/canvas" })).toBe("app://o/index.html#/canvas");
    expect(nativeWorkbenchEntry("o", { presentation: "workspace", initialRoute: "/assets" })).toBe(`app://o/index.html${V3_PRESENTATION_QUERY}#/assets`);
  });
  it("越界参数抛错", () => {
    expect(() => nativeWorkbenchEntry("o", { initialRoute: "/nope" } as never)).toThrow(/Invalid/);
    expect(() => nativeWorkbenchEntry("o", { presentation: "nope" } as never)).toThrow(/Invalid/);
    expect(() => nativeWorkbenchEntry("o", { extra: 1 } as never)).toThrow(/Invalid/);
  });
});

describe("validV3Owner", () => {
  it("只接受小写字母数字和连字符，且限长", () => {
    expect(validV3Owner("owner-1")).toBe(true);
    expect(validV3Owner("a".repeat(80))).toBe(true);
    // 上游的正则允许连字符出现在开头（`-x` 合法）—— 照上游保留，不擅自收紧
    expect(validV3Owner("-x")).toBe(true);
    for (const bad of ["", "a".repeat(81), "Owner", "a_b", "a.b", 1, null, undefined]) expect(validV3Owner(bad), JSON.stringify(bad)).toBe(false);
  });
});

describe("mediaAccountScope", () => {
  const ctx = { accountType: "personal", groupId: "g1", epoch: 1 };
  it("缺身份或上下文时没有作用域", () => {
    expect(mediaAccountScope({})).toBeUndefined();
    expect(mediaAccountScope({ identityKey: "k" })).toBeUndefined();
    expect(mediaAccountScope({ identityKey: "", activeContext: ctx })).toBeUndefined();
  });
  it("epoch 变了作用域就变 —— 换账号上下文要立刻作废旧授权", () => {
    const a = mediaAccountScope({ identityKey: "k", activeContext: ctx });
    expect(a).toBeDefined();
    expect(a).not.toBe(mediaAccountScope({ identityKey: "k", activeContext: { ...ctx, epoch: 2 } }));
    expect(mediaAccountScope({ identityKey: "k", activeContext: { ...ctx, groupId: "g2" } })).not.toBe(a);
  });
});
