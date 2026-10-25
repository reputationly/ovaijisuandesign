import { createHash } from "node:crypto";

import { protocol } from "electron";

import { SITE_PREVIEW_CSP, SITE_PREVIEW_ROUTES, SITE_PREVIEW_SCHEME } from "@ov/protocol";

import type { GatewayRegistry } from "./gateway/gateway-registry.js";
import { identityHeaders } from "./workspace/identity.js";

const MANIFEST_TIMEOUT_MS = 10_000;
const MAX_ORIGINS = 2_000;

export interface SitePreviewRequest {
  workspaceId?: string;
  versionId: string;
}

export type SitePreviewResolution =
  | { status: "site"; url: string }
  | { status: "not_site" };

/**
 * 站点预览：每个 Resource Version 一个 `hub-site://s-<hash>/` origin。
 *
 * 内容只从本机工作区 gateway 取；CSP 禁止外连。和参照一样，不把 gateway 地址
 * 暴露给页面，也不同意外部导航把预览页带走。
 */
export class SitePreviewService {
  private readonly targets = new Map<string, { workspaceId: string; versionId: string }>();
  private readonly issued = new Set<string>();

  constructor(
    private readonly gateways: GatewayRegistry,
    private readonly log: (line: string) => void = () => undefined,
  ) {
    protocol.handle(SITE_PREVIEW_SCHEME, (request) => this.handle(request));
  }

  dispose(): void {
    // 可能已被另一处/重复 dispose 取消；unhandle 不存在的协议会抛，退出时会弹主进程异常。
    try {
      if (protocol.isProtocolHandled(SITE_PREVIEW_SCHEME)) protocol.unhandle(SITE_PREVIEW_SCHEME);
    } catch {
      // 关停阶段的清理失败不应再抛到 process 层
    }
  }

  async resolve(request: SitePreviewRequest): Promise<SitePreviewResolution> {
    if (!request?.versionId || !/^[A-Za-z0-9_-]{1,128}$/.test(request.versionId)) {
      throw new Error("SITE_PREVIEW_INVALID_REQUEST");
    }
    const workspaceId = request.workspaceId;
    if (!workspaceId) throw new Error("SITE_PREVIEW_INVALID_REQUEST");
    const gateway = this.gateways.get(workspaceId);
    const base = gateway?.url();
    const binding = gateway?.binding?.();
    if (!base || !binding) return { status: "not_site" };
    let response: Response;
    try {
      response = await fetch(new URL(SITE_PREVIEW_ROUTES.manifest(request.versionId), base), {
        headers: identityHeaders(binding),
        redirect: "error",
        signal: AbortSignal.timeout(MANIFEST_TIMEOUT_MS),
      });
    } catch {
      return { status: "not_site" };
    }
    if (!response.ok) return { status: "not_site" };
    const manifest = (await response.json().catch(() => null)) as { site?: unknown } | null;
    if (manifest?.site !== true) return { status: "not_site" };
    const host = `s-${createHash("sha256").update(`${workspaceId}\0${request.versionId}`).digest("hex").slice(0, 32)}`;
    this.targets.set(host, { workspaceId, versionId: request.versionId });
    if (this.issued.size < MAX_ORIGINS) this.issued.add(host);
    return { status: "site", url: `${SITE_PREVIEW_SCHEME}://${host}/` };
  }

  private async handle(request: Request): Promise<Response> {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method Not Allowed", { status: 405 });
    }
    let url: URL;
    try {
      url = new URL(request.url);
    } catch {
      return new Response("Bad Request", { status: 400 });
    }
    const target = this.targets.get(url.host);
    if (!target) return new Response("Not Found", { status: 404 });
    const gateway = this.gateways.get(target.workspaceId);
    const base = gateway?.url();
    const binding = gateway?.binding?.();
    if (!base || !binding) return new Response("Service Unavailable", { status: 503 });
    const pathname = url.pathname.replace(/^\/+/, "");
    try {
      const upstream = await fetch(new URL(SITE_PREVIEW_ROUTES.file(target.versionId, pathname), base), {
        method: request.method,
        headers: {
          ...identityHeaders(binding),
          Accept: request.headers.get("accept") ?? "*/*",
        },
        redirect: "error",
        signal: request.signal,
      });
      return new Response(request.method === "HEAD" ? null : upstream.body, {
        status: upstream.status === 200 ? 200 : upstream.status === 404 ? 404 : 502,
        headers: {
          ...(upstream.ok ? { "Content-Type": upstream.headers.get("content-type") ?? "application/octet-stream" } : {}),
          "Content-Security-Policy": SITE_PREVIEW_CSP,
          "X-Content-Type-Options": "nosniff",
          "Cross-Origin-Resource-Policy": "same-origin",
          "Referrer-Policy": "no-referrer",
          "Cache-Control": "private, max-age=31536000, immutable",
        },
      });
    } catch (error) {
      if (!request.signal.aborted) {
        this.log(`[site-preview] upstream failed host=${url.host}: ${error instanceof Error ? error.message : String(error)}`);
      }
      return new Response("Bad Gateway", { status: 502 });
    }
  }
}
