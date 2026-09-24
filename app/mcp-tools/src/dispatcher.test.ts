import { describe, expect, it } from "vitest";

import { buildNoProxy, resolveProxyConfig } from "./dispatcher.js";

describe("proxy config", () => {
  it("direct when nothing is set or mode forces direct", () => {
    expect(resolveProxyConfig({})).toEqual({ kind: "direct" });
    expect(resolveProxyConfig({ HILO_NETWORK_PROXY_MODE: "direct", HTTP_PROXY: "http://p:1" })).toEqual({ kind: "direct" });
  });

  it("reads HTTP(S)_PROXY, lowercase variants and ALL_PROXY fallback", () => {
    expect(resolveProxyConfig({ https_proxy: "p.local:8080" })).toEqual({ kind: "env-proxy", httpsProxy: "http://p.local:8080/" });
    expect(resolveProxyConfig({ ALL_PROXY: "socks5://s:1" })).toEqual({
      kind: "env-proxy",
      httpProxy: "socks5://s:1",
      httpsProxy: "socks5://s:1",
    });
  });

  it("reports unsupported proxies and falls back to direct", () => {
    expect(resolveProxyConfig({ HILO_RESOLVED_PROXY: "SOCKS4 h:1; DIRECT" })).toMatchObject({
      kind: "unsupported-proxy",
      unsupported: { source: "HILO_RESOLVED_PROXY", value: "socks4://h:1" },
    });
    expect(resolveProxyConfig({ HTTP_PROXY: "ftp://x:1" })).toMatchObject({ kind: "unsupported-proxy" });
  });

  it("forces loopback into NO_PROXY without duplicating", () => {
    expect(buildNoProxy({})).toBe("127.0.0.1,localhost,[::1]");
    expect(buildNoProxy({ NO_PROXY: "corp.local, LOCALHOST" })).toBe("corp.local,LOCALHOST,127.0.0.1,[::1]");
    expect(buildNoProxy({ no_proxy: "*" })).toBe("*");
  });
});
