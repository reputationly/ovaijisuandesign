import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export type SsrfReason = "invalid-url" | "scheme-not-allowed" | "private-address" | "dns-lookup-failed";

export class SsrfError extends Error {
  constructor(
    readonly reason: SsrfReason,
    detail: string,
  ) {
    super(`SSRF policy rejected URL (${reason}): ${detail}`);
  }
}

/**
 * 导入 URL 前的检查：只许 http/https，且目标不能是本机或内网地址。
 *
 * 这些 URL 来自 agent（模型生成的）和聊天里贴的链接。不拦的话一句"把
 * http://127.0.0.1:xxxx/... 导进来"就能让 gateway 去读本机其他服务的接口，
 * 或者内网的管理后台。域名要先解析再判断 —— 只看字面量会被指向内网的域名绕过。
 */
export async function assertPublicUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new SsrfError("invalid-url", raw);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new SsrfError("scheme-not-allowed", url.protocol);
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const addrs: string[] = [];
  if (isIP(host)) {
    addrs.push(host);
  } else {
    try {
      for (const a of await lookup(host, { all: true })) addrs.push(a.address);
    } catch (err) {
      throw new SsrfError("dns-lookup-failed", `${host}: ${(err as Error).message}`);
    }
  }
  for (const a of addrs) if (isPrivateAddress(a)) throw new SsrfError("private-address", `${host} → ${a}`);
  return url;
}

export function isPrivateAddress(addr: string): boolean {
  const v4mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(addr);
  if (v4mapped) return isPrivateAddress(v4mapped[1]!);
  if (isIP(addr) === 4) {
    const [a, b] = addr.split(".").map(Number) as [number, number];
    return (
      a === 0 || a === 127 || a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254)
    );
  }
  const v6 = addr.toLowerCase();
  if (v6 === "::1" || v6 === "::") return true;
  if (/^f[cd]/.test(v6)) return true; // fc00::/7 唯一本地地址
  if (/^fe[89ab]/.test(v6)) return true; // fe80::/10 链路本地
  return false;
}
