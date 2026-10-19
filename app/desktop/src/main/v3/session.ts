/**
 * v3 工作台的会话隔离与资源服务。
 *
 * v3 的界面代码和主界面**不是同一套信任级别**：它由另一个构建单元产出、只经产物清单校验，
 * 所以这里给它单开一个 session（`hilo-v3-workbench`），并且把口子收到最小：
 *
 * - 权限一律拒绝（不用询问，直接 false）—— 这扇窗口不该弹权限框；
 * - 请求过滤器只放行 `app:` 协议、且必须是已挂载的 owner 名下、且路径确实是产物里的文件；
 * - 协议处理器只认 GET，且资源必须命中产物或媒体路由；
 * - 响应头带上 CSP、`nosniff`、`no-store`，不让产物被缓存或被嗅探成别的类型。
 *
 * 这几条是这套东西的安全边界，任何一条放宽都等于把「经校验的产物」变成「任意本地文件读取」。
 * 所以照上游原样搬，不做「顺手简化」。
 */
import { session, type Session } from "electron";
import type { V3BundleEntry } from "./host.js";

/** 隔离会话名。改这个值等于换一套存储与 cookie 空间，别动。 */
export const V3_PARTITION = "hilo-v3-workbench";

/**
 * v3 页面的内容安全策略。
 *
 * `default-src 'none'` 起手全禁，再逐条放开界面真正需要的：
 * 本地脚本/样式、内联样式（组件库要写行内样式）、data/blob 图片、
 * 几个 CDN 的媒体与连接。**没有 `unsafe-eval`**。
 */
export const V3_CSP = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "media-src 'self' blob: https://cdn.hailuoai.com https://cdn.hailuoai.video",
  "font-src 'self'",
  "connect-src 'self' blob: data: ws://127.0.0.1:* https://cdn.hailuoai.com https://cdn.hailuoai.video https://file.cdn.minimax.io https://filecdn.minimax.chat",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join("; ");

/** 入口页允许带上的查询串，用来区分同一份产物的不同呈现方式。 */
export const V3_PRESENTATION_QUERY = "?presentation=workspace";

export interface V3SessionHost {
  /** 产物：相对路径 → 内容。 */
  assets: Map<string, V3BundleEntry>;
  /** 当前已挂载的窗口名（`app://<hostname>/...`）。 */
  ownerHosts(): Iterable<string>;
  /** 媒体路由：非空表示这条 `/media/...` 请求由它处理。 */
  readMedia(request: Request, webContentsId?: number): Response | undefined;
  allowsMedia(url: URL, webContentsId?: number): boolean;
}

/**
 * 把 `app://<host>/<path>` 里的路径解成产物键。
 *
 * `decodeURIComponent` 之后必须再挡一次越界：`%2e%2e%2f` 这类编码过的 `../`
 * 在解码前看不出来，解码后就是一个目录穿越。
 */
export function assetKeyFromPath(pathname: string): string | undefined {
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return undefined;
  }
  // 只剥掉**一个**前导斜杠，和上游的 `slice(1)` 一致。
  // 早先写成剥掉全部前导斜杠，`//assets/app.js` 会被解成 `assets/app.js` 而放行 ——
  // 上游这里剥完还剩一个斜杠、查不到、拒绝。多剥一层就是把口子开大了一点。
  if (!decoded.startsWith("/")) return undefined;
  const key = decoded.slice(1);
  if (!key) return undefined;
  // 解码后仍有 `..`、反斜杠、空段 —— 一律不认
  if (key.split("/").some((part) => !part || part === "." || part === "..") || key.includes("\\") || key.includes("\0")) return undefined;
  return key;
}

/** 一条请求该不该被放行。`false` 会被 webRequest 直接取消。 */
export function shouldAllowV3Request(rawUrl: string, host: V3SessionHost, webContentsId?: number): boolean {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return false;
  }
  if (url.protocol !== "app:") return false;
  const owners = new Set(host.ownerHosts());
  if (!owners.has(url.hostname)) return false;
  if (url.pathname.startsWith("/media/")) return host.allowsMedia(url, webContentsId);
  const key = assetKeyFromPath(url.pathname);
  return !!key && host.assets.has(key);
}

/** 组装一条产物响应的响应头。 */
export function v3AssetHeaders(contentType: string): Record<string, string> {
  return {
    "Content-Type": contentType,
    "Content-Security-Policy": V3_CSP,
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "no-store",
  };
}

/**
 * 在该隔离会话上装好权限、过滤器和协议处理器。幂等：重复调用只装配一次。
 */
export function configureV3Session(host: V3SessionHost): Session {
  const isolated = session.fromPartition(V3_PARTITION);
  if (configured.has(isolated)) return isolated;
  const assets = host.assets;

  // 这扇窗口不需要任何系统权限，问了也没用，直接拒
  isolated.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  isolated.setPermissionCheckHandler(() => false);

  isolated.webRequest.onBeforeRequest((details, callback) => {
    callback({ cancel: !shouldAllowV3Request(details.url, { ...host, assets }, details.webContentsId) });
  });

  isolated.protocol.handle("app", (request) => {
    try {
      const url = new URL(request.url);
      if (url.pathname.startsWith("/media/")) {
        return host.readMedia(request) ?? new Response("Not found", { status: 404 });
      }
      const key = assetKeyFromPath(url.pathname);
      const isIndex = key === "index.html" && url.search === V3_PRESENTATION_QUERY;
      const allowed = request.method === "GET" && key && (!url.search || isIndex);
      const asset = allowed ? assets.get(key) : undefined;
      if (!asset) return new Response("Not found", { status: 404 });
      return new Response(new Uint8Array(asset.body), { headers: v3AssetHeaders(asset.contentType) });
    } catch {
      return new Response("Invalid request", { status: 400 });
    }
  });

  configured.add(isolated);
  return isolated;
}

/** 已装配过的会话。装配是幂等的：重复注册同一个协议处理器会抛错。 */
const configured = new WeakSet<Session>();

/**
 * 窗口名（`app://<ownerId>/...` 里的那段）的合法形状。
 *
 * 它同时是**协议里的主机名**，所以必须是 DNS 能接受的小写字母数字加连字符；
 * 长度也限死 —— 超长的主机名会让 URL 解析和日志都变得难用。
 */
export function validV3Owner(value: unknown): value is string {
  return typeof value === "string" && /^[a-z0-9-]{1,80}$/.test(value);
}

/** v3 页面的可选呈现参数。 */
export interface V3PageOptions {
  /** 进来先落在哪个路由。 */
  initialRoute?: "/canvas" | "/assets";
  /** 只给画布，还是给完整工作台。 */
  presentation?: "canvas-only" | "workspace";
}

/**
 * 拼出 v3 页面的入口地址。
 *
 * 三个部分各有作用：`presentation=workspace` 走**查询串**（它决定服务端渲染的骨架，
 * 必须在文档加载前就确定），`initialRoute` 走**hash**（它是页面自己的导航状态，
 * 改它不该重新加载文档）。
 *
 * 参数是白名单校验的：多一个键就抛错。这个是安全边界 —— 入口地址决定了窗口能取到哪些
 * 产物，放开参数等于放开这条边界。
 */
export function nativeWorkbenchEntry(ownerId: string, page?: V3PageOptions): string {
  const base = `app://${ownerId}/index.html`;
  if (!page) return base;
  if (
    !page ||
    typeof page !== "object" ||
    Array.isArray(page) ||
    Object.keys(page).some((key) => !["initialRoute", "presentation"].includes(key)) ||
    (page.initialRoute !== undefined && !["/canvas", "/assets"].includes(page.initialRoute)) ||
    (page.presentation !== undefined && !["canvas-only", "workspace"].includes(page.presentation))
  ) {
    throw new Error("Invalid native workbench presentation");
  }
  const query = page.presentation === "workspace" ? V3_PRESENTATION_QUERY : "";
  return `${base}${query}${page.initialRoute ? `#${page.initialRoute}` : ""}`;
}

/** 账号快照里与 v3 媒体授权相关的部分。 */
export interface V3AccountSnapshot {
  identityKey?: string;
  activeContext?: { accountType: string; groupId: string; epoch: number };
}

/**
 * 从账号快照算出一个「作用域键」。
 *
 * 键里带上账号类型、组和 **epoch**：epoch 一变说明账号上下文已经换了
 *（切换、重新登录、被踢下线），此时旧帧手上的媒体授权必须立刻作废 ——
 * 只比身份键的话，同一个人换了组还会沿用旧授权。
 */
export function mediaAccountScope(snapshot: V3AccountSnapshot): string | undefined {
  if (!snapshot.identityKey || !snapshot.activeContext) return undefined;
  return JSON.stringify([
    snapshot.identityKey,
    snapshot.activeContext.accountType,
    snapshot.activeContext.groupId,
    snapshot.activeContext.epoch,
  ]);
}
