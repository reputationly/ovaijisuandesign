import { Agent, EnvHttpProxyAgent, setGlobalDispatcher } from "undici";

/**
 * 让 gateway 里的全局 fetch 跟上主进程传下来的代理。
 * 直连时显式装一个不走代理的 Agent，避免进程环境里残留的 HTTP_PROXY 还生效。
 */
export function installOutboundProxy(): void {
  if (process.env.HILO_NETWORK_PROXY_MODE === "direct") {
    setGlobalDispatcher(new Agent());
    return;
  }
  const httpProxy = process.env.HTTP_PROXY || process.env.http_proxy || process.env.ALL_PROXY || process.env.all_proxy || "";
  const httpsProxy = process.env.HTTPS_PROXY || process.env.https_proxy || httpProxy;
  if (!httpProxy && !httpsProxy) return;
  setGlobalDispatcher(new EnvHttpProxyAgent({ httpProxy, httpsProxy }));
}
