import { contextBridge } from "electron";

/**
 * 暴露给 renderer 的配置（`window.__HILO_CONFIG__`）：主进程经
 * `--gateway-url=` 这类 argv（webPreferences.additionalArguments）传进来。
 * M4 补全字段。
 */
function arg(name: string): string | undefined {
  const p = `--${name}=`;
  return process.argv.find((a) => a.startsWith(p))?.slice(p.length);
}

const gatewayUrl = arg("gateway-url") ?? "";
contextBridge.exposeInMainWorld("__HILO_CONFIG__", {
  gatewayUrl,
  wsUrl: gatewayUrl ? gatewayUrl.replace(/^http/, "ws") + "/ws" : "",
  appVersion: arg("app-version") ?? "",
  platform: process.platform,
});
