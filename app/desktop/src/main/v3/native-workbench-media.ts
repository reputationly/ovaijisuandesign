/**
 * v3 工作台的媒体代理。
 *
 * 页面不能直接访问 gateway：产物里的 `app://` 协议只服务产物本身，媒体要走另一条路。
 * 这里做的是「**签发 + 兑换**」两段式：
 *
 * 1. `grant()` 先对 gateway 发一个 HEAD，把 MIME、长度、编码都核一遍，
 *    通过才签一张**票据**（`app://<owner>/media/<token>`）。票据有 TTL，且绑定到
 *    签发它的那个文档（`webContentsId`）；页面最终**看不到** token 之外的任何东西。
 * 2. 页面拿票据来取时，`read()` 再逐项复核，然后才把上游的字节流转出去。
 *
 * 为什么每一步都要重核：签发和取用之间可能过了几分钟，中间工作区可能被换掉
 *（换 gateway 进程、重建绑定），账号也可能切了。`assertCurrent()` 就是那道闸 ——
 * 它把签发时记下的绑定（pid / baseUrl / claim / instanceId / generation）与当前状态逐项比，
 * 任一项变了就判定票据作废。少了这道闸，一张旧票据在换工作区之后仍能读到新工作区的文件。
 *
 * 上游是**本机 loopback 上的 gateway**：地址必须是无凭据、无路径、无查询的 `http://127.0.0.1[:port]/`。
 * 这条检查挡的是「绑定里被塞进了外部地址」——那会把本机读文件的能力变成对外发起请求的能力。
 */
import { randomUUID } from "node:crypto";
import { Disposable } from "../ipc/events.js";

/** 票据有效期（5 分钟）。 */
const TICKET_TTL_MS = 5 * 60_000;
/** 单个文档同时能持有的票据数。 */
const MAX_TICKETS = 16;
/** 单个文档同时在传的流数。 */
const MAX_STREAMS = 4;
/** 单次分块上限（256 KiB）。 */
const MAX_CHUNK_BYTES = 256 * 1024;

/** 允许代理的媒体类型白名单。不在表里的一律不签票据。 */
const MIME_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
  "audio/flac",
  "audio/x-flac",
  "audio/ogg",
  "audio/mp4",
  "audio/webm",
  "audio/aac",
]);

/** 工作区绑定的快照。变了就说明 gateway 换了一茬，旧票据必须作废。 */
export interface MediaBinding {
  baseUrl: string;
  claim: string;
  instanceId: string;
  generation: number;
  pid: number;
}

/** 媒体请求（由宿主构造，页面碰不到）。 */
export interface MediaGrantInput {
  workspaceId: string;
  resourceId: string;
  versionId: string;
  identity: { claim: string; instanceId: string; generation: number };
}

/** 票据持有者的身份。 */
export interface MediaOwner {
  id: string;
  scopeKey: string;
  webContentsId: number;
  /** 这个文档是否仍然有效（窗口还在、没被替换）。 */
  current(): boolean;
}

/** 宿主需要提供的能力。 */
export interface MediaDeps {
  /** 取工作区绑定；不存在返回 undefined。 */
  binding(key: string): MediaBinding | undefined;
  /** 账号快照；`status` 不是 ready 就不签发。 */
  snapshot(): Promise<{ status: string }>;
  onAccountChange(listener: () => void): { dispose(): void };
  /** 校验「资源图片预览」请求的形状。 */
  isRevealRequest(input: unknown): boolean;
  /** 预览接口的路径（`CANVAS_V3_ROUTES.previews`）。 */
  previewPath(resourceId: string, versionId: string): string;
  /** 访问工作区 gateway 要带的身份头。 */
  identityHeaders(binding: MediaBinding): Record<string, string>;
  /** 把这次读取算进「项目导出中」的活动窗口。 */
  withExportActivity<T>(binding: MediaBinding, workspaceId: string, log: (line: string) => void, run: () => Promise<T>): Promise<T>;
  log(line: string): void;
}

interface Ticket {
  requestId: string;
  owner: MediaOwner;
  grant: { url: string; mimeType: string; expiresAt: number };
  assertCurrent(): void;
  read(incoming: Request, abort: AbortController, ready: (response: Response) => void): Promise<void>;
}

interface Operation {
  owner: MediaOwner;
  controller: AbortController;
  ticket?: string;
}

/** 请求 id 必须是 UUID v4：它由宿主生成、不出页面，形状不对说明调用方搞错了。 */
const REQUEST_ID_RE = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
/** 票据 URL 的路径形状。 */
const TICKET_PATH_RE = /^\/media\/[a-f0-9-]{36}$/;
/** Range 头的允许形状（只认单区间）。 */
const RANGE_RE = /^bytes=(?:\d+-\d*|-\d+)$/;

export class NativeWorkbenchMedia extends Disposable {
  private readonly grants = new Map<string, Operation>();
  private readonly tickets = new Map<string, Ticket>();
  /** 正在传输的流：controller → ownerId。 */
  private readonly active = new Map<AbortController, string>();
  private readonly subscription: { dispose(): void };

  constructor(
    private readonly deps: MediaDeps,
    private readonly log: (line: string) => void,
  ) {
    super();
    // 账号一变，所有票据立刻作废：换了账号还留着旧票据等于让新账号读到旧账号的文件
    this.subscription = deps.onAccountChange(() => this.revokeAll());
  }

  async grant(owner: MediaOwner, input: MediaGrantInput, requestId: string = randomUUID()): Promise<Ticket["grant"]> {
    if (
      typeof requestId !== "string" ||
      !REQUEST_ID_RE.test(requestId) ||
      this.grants.has(requestId) ||
      !this.deps.isRevealRequest(input) ||
      // 工作区不能是应用级的（那是"没有工作区"的占位），资源 id 也不能是路径穿越
      input.workspaceId === "__app_level_gateway__" ||
      [input.resourceId, input.versionId].some((id) => id === "." || id === "..")
    ) {
      throw new Error("MEDIA_INVALID_REQUEST");
    }
    this.prune();
    if (this.countTickets(owner.id) >= MAX_TICKETS || this.countStreams(owner.id) >= MAX_STREAMS) {
      throw new Error("MEDIA_BUSY");
    }

    const request = structuredClone(input);
    const key = request.workspaceId;
    const original = this.deps.binding(key);
    if (!original) throw new Error("MEDIA_UNAVAILABLE");
    const pid = original.pid;
    const controller = new AbortController();
    this.active.set(controller, owner.id);
    const operation: Operation = { owner, controller };
    this.grants.set(requestId, operation);

    // 每一步之前都问一遍「绑定还是原来那一个吗」。HEAD 之后到真正读之前会跨网络，
    // 期间工作区完全可能被替换掉。
    const assertCurrent = (): void => {
      const current = this.deps.binding(key);
      if (
        !owner.current() ||
        controller.signal.aborted ||
        current?.pid !== pid ||
        current === undefined ||
        current.baseUrl !== original.baseUrl ||
        current.claim !== request.identity.claim ||
        current.instanceId !== request.identity.instanceId ||
        current.generation !== request.identity.generation
      ) {
        throw new Error("MEDIA_SCOPE_RETIRED");
      }
    };

    const timeout = setTimeout(() => controller.abort(), 10_000);
    try {
      assertCurrent();
      if ((await this.deps.snapshot()).status !== "ready") throw new Error("MEDIA_UNAVAILABLE");
      assertCurrent();

      const base = new URL(original.baseUrl);
      if (!isLoopbackRoot(base)) throw new Error("MEDIA_UNAVAILABLE");
      const endpoint = new URL(this.deps.previewPath(request.resourceId, request.versionId), base);
      const headers: Record<string, string> = { ...this.deps.identityHeaders(original), "Accept-Encoding": "identity" };

      const head = await fetch(endpoint, { method: "HEAD", headers, redirect: "error", signal: controller.signal });
      let mimeType: string;
      try {
        assertCurrent();
        mimeType = (head.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() ?? "");
        if (!isAcceptableHead(head.status, head.headers, mimeType)) throw new Error("MEDIA_UNAVAILABLE");
      } finally {
        await head.body?.cancel();
      }
      assertCurrent();
      if (this.countTickets(owner.id) >= MAX_TICKETS) throw new Error("MEDIA_BUSY");

      const token = randomUUID();
      const grant = {
        url: `app://${owner.id}/media/${token}`,
        mimeType,
        expiresAt: Date.now() + TICKET_TTL_MS,
      };
      operation.ticket = token;
      this.tickets.set(token, {
        requestId,
        owner,
        grant,
        assertCurrent,
        read: (incoming, abort, ready) =>
          this.deps.withExportActivity(original, request.workspaceId, this.log, () =>
            this.streamTicket(endpoint, headers, mimeType, incoming, abort, ready, assertCurrent),
          ),
      });
      return grant;
    } finally {
      clearTimeout(timeout);
      this.active.delete(controller);
      // 没签出票据就把占位删掉，否则 requestId 会被永久占用
      if (!operation.ticket && this.grants.get(requestId) === operation) this.grants.delete(requestId);
    }
  }

  /**
   * 取消一次签发。**只有签发它的那份文档能取消** ——
   * 否则同一窗口里的另一帧可以拿别人的 requestId 去把别人的读取掐掉。
   */
  cancelGrant(owner: Pick<MediaOwner, "id" | "scopeKey" | "webContentsId">, requestId: string): void {
    const operation = this.grants.get(requestId);
    if (
      !operation ||
      operation.owner.id !== owner.id ||
      operation.owner.scopeKey !== owner.scopeKey ||
      operation.owner.webContentsId !== owner.webContentsId
    ) {
      return;
    }
    this.grants.delete(requestId);
    operation.controller.abort();
    this.active.delete(operation.controller);
    if (operation.ticket) this.tickets.delete(operation.ticket);
  }

  /** 按 URL 找票据，顺带把「过期」和「作用域已作废」都判掉。 */
  ticket(url: URL): Ticket | undefined {
    if (
      url.protocol !== "app:" ||
      url.username ||
      url.password ||
      url.port ||
      url.search ||
      url.hash ||
      !TICKET_PATH_RE.test(url.pathname)
    ) {
      return undefined;
    }
    const ticket = this.tickets.get(url.pathname.slice("/media/".length));
    // 主机名必须和票据的持有者一致：跨文档用不了别人的票据
    if (!ticket || ticket.owner.id !== url.hostname || ticket.grant.expiresAt <= Date.now()) return undefined;
    try {
      ticket.assertCurrent();
      return ticket;
    } catch {
      return undefined;
    }
  }

  /** 请求过滤器用：只有签发它的那个 webContents 能取。 */
  allows(url: URL, webContentsId: number | undefined): boolean {
    return typeof webContentsId === "number" && this.ticket(url)?.owner.webContentsId === webContentsId;
  }

  /**
   * 兑换票据。
   *
   * 除了形状校验，这里还起了一个 250ms 的轮询：票据一旦失效（过期、绑定换了、账号切了）
   * 就把传输掐掉。不用轮询的话，一个长视频会在作用域作废之后继续传下去。
   */
  read(request: Request): Promise<Response> {
    const ticket = this.ticket(new URL(request.url));
    if (!ticket) return Promise.resolve(new Response(null, { status: 403 }));
    if (!["GET", "HEAD"].includes(request.method)) return Promise.resolve(new Response(null, { status: 405 }));

    const range = request.headers.get("range");
    if (range && (range.length > 128 || !RANGE_RE.test(range))) return Promise.resolve(new Response(null, { status: 416 }));
    if (this.countStreams(ticket.owner.id) >= MAX_STREAMS) return Promise.resolve(new Response(null, { status: 429 }));

    const controller = new AbortController();
    this.active.set(controller, ticket.owner.id);
    const cancel = () => controller.abort();
    request.signal.addEventListener("abort", cancel, { once: true });
    if (request.signal.aborted) cancel();
    const poll = setInterval(() => {
      if (!this.ticket(new URL(request.url))) controller.abort();
    }, 250);
    poll.unref?.();

    return new Promise<Response>((resolve) => {
      void ticket
        .read(request, controller, resolve)
        .catch(() => resolve(new Response(null, { status: 502 })))
        .finally(() => {
          clearInterval(poll);
          request.signal.removeEventListener("abort", cancel);
          this.active.delete(controller);
          controller.abort();
        });
    });
  }

  /** 某个文档退出时，它的票据和正在传的流都要收掉。 */
  revoke(ownerId: string): void {
    for (const [id, operation] of this.grants) if (operation.owner.id === ownerId) this.cancelGrant(operation.owner, id);
    for (const [key, ticket] of this.tickets) if (ticket.owner.id === ownerId) this.tickets.delete(key);
    for (const [controller, id] of this.active) if (id === ownerId) controller.abort();
  }

  /** 清掉过期或已作废的票据。`assertCurrent` 抛错也算作废。 */
  prune(): void {
    for (const [key, ticket] of this.tickets) {
      try {
        ticket.assertCurrent();
        if (ticket.grant.expiresAt > Date.now()) continue;
      } catch {
        // 作用域已作废，下面照删
      }
      this.tickets.delete(key);
      this.grants.delete(ticket.requestId);
    }
  }

  revokeAll(): void {
    for (const operation of this.grants.values()) operation.controller.abort();
    this.grants.clear();
    this.tickets.clear();
    for (const controller of this.active.keys()) controller.abort();
  }

  override dispose(): void {
    this.subscription.dispose();
    this.revokeAll();
    super.dispose();
  }

  /** 把上游响应转成下游流，并在传输过程中持续复核作用域。 */
  private async streamTicket(
    endpoint: URL,
    headers: Record<string, string>,
    mimeType: string,
    incoming: Request,
    abort: AbortController,
    ready: (response: Response) => void,
    assertCurrent: () => void,
  ): Promise<void> {
    assertCurrent();
    abort.signal.throwIfAborted();
    const forwarded = new Headers(headers);
    const range = incoming.headers.get("range");
    if (range) forwarded.set("Range", range);
    const upstream = await fetch(endpoint, { method: incoming.method, headers: forwarded, redirect: "error", signal: abort.signal });
    try {
      assertCurrent();
      abort.signal.throwIfAborted();
      if (!isAcceptableRead(upstream, mimeType)) throw new Error("MEDIA_UNAVAILABLE");

      const responseHeaders = new Headers({
        "Content-Type": mimeType,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      });
      for (const name of ["content-length", "content-range", "accept-ranges"]) {
        const value = upstream.headers.get(name);
        if (value !== null) responseHeaders.set(name, value);
      }
      // 416 是没有正文的，HEAD 也是 —— 直接把头转回去
      if (incoming.method === "HEAD" || upstream.status === 416) {
        ready(new Response(null, { status: upstream.status, headers: responseHeaders }));
        return;
      }
      if (!upstream.body) throw new Error("MEDIA_UNAVAILABLE");

      const reader = upstream.body.getReader();
      let finish: () => void = () => {};
      const finished = new Promise<void>((resolve) => {
        finish = resolve;
      });
      let closed = false;
      const close = () => {
        if (!closed) {
          closed = true;
          finish();
        }
      };
      const onAbort = () => {
        void reader.cancel().catch(() => undefined);
        close();
      };
      abort.signal.addEventListener("abort", onAbort, { once: true });

      const stream = new ReadableStream<Uint8Array>(
        {
          async pull(output) {
            try {
              assertCurrent();
              abort.signal.throwIfAborted();
              const chunk = await reader.read();
              assertCurrent();
              abort.signal.throwIfAborted();
              if (chunk.done) {
                output.close();
                close();
              } else {
                // 单块超限就断开：上游不该一次吐出一个几百兆的块
                if (chunk.value.byteLength > MAX_CHUNK_BYTES) throw new Error("MEDIA_BUFFER_LIMIT");
                output.enqueue(chunk.value);
              }
            } catch {
              output.error(new Error("MEDIA_STREAM_CLOSED"));
              abort.abort();
              close();
            }
          },
          cancel() {
            abort.abort();
            close();
          },
        },
        { highWaterMark: 0 },
      );
      ready(new Response(stream, { status: upstream.status, headers: responseHeaders }));
      await finished;
      abort.signal.removeEventListener("abort", onAbort);
      await reader.cancel().catch(() => undefined);
    } finally {
      if (upstream.body && !upstream.body.locked) await upstream.body.cancel().catch(() => undefined);
    }
  }

  private countTickets(ownerId: string): number {
    return [...this.tickets.values()].filter((item) => item.owner.id === ownerId).length;
  }

  private countStreams(ownerId: string): number {
    return [...this.active.values()].filter((id) => id === ownerId).length;
  }
}

/**
 * 上游地址必须是**本机 loopback 的根**：无凭据、无路径、无查询、无 hash。
 *
 * 路径/查询非空意味着拼接预览路径之后可能指到别的接口；凭据意味着绑定被写脏了。
 */
export function isLoopbackRoot(url: URL): boolean {
  return (
    url.protocol === "http:" &&
    ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) &&
    !url.username &&
    !url.password &&
    url.pathname === "/" &&
    !url.search &&
    !url.hash
  );
}

/**
 * HEAD 预检的判定。
 *
 * 逐条都有理由：
 * - 必须 200（HEAD 不该是 206/416，那说明上游行为不对）；
 * - MIME 在白名单里（否则可能把 HTML 当媒体塞进页面）；
 * - **不能有 `content-disposition`**：有它说明这是个「下载」响应，不是可内联的媒体；
 * - `content-length` 必须是非零正整数；
 * - `content-encoding` 只能是 identity（压缩过的媒体没法做 Range，也会浪费 CPU 解压）。
 */
export function isAcceptableHead(status: number, headers: Headers, mimeType: string): boolean {
  return (
    status === 200 &&
    MIME_TYPES.has(mimeType) &&
    !headers.has("content-disposition") &&
    /^\d+$/.test(headers.get("content-length") ?? "") &&
    Number(headers.get("content-length")) > 0 &&
    (!headers.has("content-encoding") || headers.get("content-encoding") === "identity")
  );
}

/** 实际读取时的判定：允许 206/416，其余同 HEAD。 */
export function isAcceptableRead(upstream: Response, mimeType: string): boolean {
  return (
    [200, 206, 416].includes(upstream.status) &&
    (upstream.status === 416 || upstream.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() === mimeType) &&
    (!upstream.headers.has("content-encoding") || upstream.headers.get("content-encoding") === "identity")
  );
}
