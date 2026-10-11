import { describe, expect, it } from "vitest";

import { childProxyEnv, electronProxyMode, proxyUrlFromResolved } from "./proxy-env.js";

describe("代理环境", () => {
  it("直连清掉继承来的代理变量", () => {
    expect(childProxyEnv("direct", "PROXY 127.0.0.1:7890")).toMatchObject({
      HILO_NETWORK_PROXY_MODE: "direct",
      HTTP_PROXY: "",
      HTTPS_PROXY: "",
    });
    expect(electronProxyMode("direct")).toBe("direct");
  });

  it("系统代理解析成 Node 的代理 URL", () => {
    expect(proxyUrlFromResolved("PROXY 127.0.0.1:7890; DIRECT")).toBe("http://127.0.0.1:7890");
    expect(proxyUrlFromResolved("SOCKS5 127.0.0.1:1080")).toBe("socks5://127.0.0.1:1080");
    expect(proxyUrlFromResolved("DIRECT")).toBeUndefined();
    expect(childProxyEnv("system", "PROXY 10.0.0.1:8080; DIRECT")).toMatchObject({
      HILO_NETWORK_PROXY_MODE: "system",
      HTTP_PROXY: "http://10.0.0.1:8080",
      HTTPS_PROXY: "http://10.0.0.1:8080",
    });
    expect(electronProxyMode("auto")).toBe("system");
    expect(childProxyEnv("auto", "DIRECT").HTTP_PROXY).toBe("");
  });
});
