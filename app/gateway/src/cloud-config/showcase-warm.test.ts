import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { WorkspacePathService } from "../common/workspace-path.service.js";

import { showcaseCovers, showcaseAssetKey } from "./home-quick-start-cloud.js";
import { cachedShowcaseMedia, showcaseCacheDir, warmShowcaseCovers } from "./showcase-warm.js";

const CONFIG_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../..",
  "assets/home-showcase/quick-start-config-v2.json",
);

/** 假 workspace：只需要 `.hilo` 那条路径拼出来能用。 */
const paths = {
  hilo: (...parts: string[]) => path.join("/fake/workspace/.hilo", ...parts),
} as unknown as WorkspacePathService;

let dir: string;
let prevEnv: string | undefined;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "ov-warm-"));
  prevEnv = process.env.HILO_HOMESHOWCASE_CACHE;
  process.env.HILO_HOMESHOWCASE_CACHE = dir;
});

afterEach(async () => {
  if (prevEnv === undefined) delete process.env.HILO_HOMESHOWCASE_CACHE;
  else process.env.HILO_HOMESHOWCASE_CACHE = prevEnv;
  await rm(dir, { recursive: true, force: true });
});

/** 只回 PNG 头，够路由判类型了。 */
const png = (tag: string) => ({
  ok: true,
  status: 200,
  arrayBuffer: async () => Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47]), Buffer.from(tag)]),
}) as unknown as Response;

describe("首页示例图预热", () => {
  it("缓存目录来自 HILO_HOMESHOWCASE_CACHE；没给就退回工作区 .hilo（包内 resources 是只读的）", () => {
    expect(showcaseCacheDir(paths)).toBe(path.join(dir, "media"));
    delete process.env.HILO_HOMESHOWCASE_CACHE;
    expect(showcaseCacheDir(paths)).toBe(path.join("/fake/workspace/.hilo", "home-showcase", "media"));
  });

  it("预热的就是首页显示顺序的前几张，文件名就是路由查的 key", async () => {
    // 预热是 4 并发的，**请求的完成顺序不等于队列顺序** —— 所以比集合，不比顺序。
    // 「顺序」这件事在下一条用例里单独断言（那是纯计算，确定性）。
    const fetched: string[] = [];
    const r = await warmShowcaseCovers(paths, {
      limit: 3,
      fetchImpl: (async (url: string) => {
        fetched.push(url);
        return png(url.slice(-4));
      }) as unknown as typeof fetch,
    });
    expect(r.warmed).toBe(3);

    const covers = showcaseCovers();
    expect([...fetched].sort()).toEqual(covers.slice(0, 3).map((c) => c.cdnUrl).sort());
    // 落盘的文件名必须和 showcaseAssetKey(url) 一致，否则路由永远命中不了。
    for (const c of covers.slice(0, 3)) {
      expect(c.key).toBe(showcaseAssetKey(c.cdnUrl));
      expect(await cachedShowcaseMedia(path.join(dir, "media"), c.key)).toBeDefined();
    }
  });

  it("showcaseCovers 就是首页显示顺序：section → item → outputs，和配置原文逐条对齐", () => {
    // 预热取的就是这个顺序的切片。顺序错了等于替用户猜他往哪滚，所以拿原文现推一遍对账。
    const raw = JSON.parse(readFileSync(CONFIG_PATH, "utf8")) as any;
    const expected: string[] = [];
    for (const s of raw.sections ?? []) {
      for (const it of s.items ?? []) {
        for (const o of it.outputs ?? []) {
          const c = o?.cover;
          if (typeof c === "string") expected.push(c);
          else if (c && typeof c === "object") expected.push(...Object.values(c).filter((v) => typeof v === "string"));
        }
      }
    }
    const seen = new Set<string>();
    const deduped = expected.filter((u) => (seen.has(u) ? false : (seen.add(u), true)));
    expect(showcaseCovers().map((c) => c.cdnUrl)).toEqual(deduped);
    // 两条区域 URL 都收：gateway 没有"当前区域"这个概念，只挑一个就有一半用户看到 302。
    expect(deduped.length).toBeGreaterThan(0);
  });

  it("已经下过的跳过，不重复发请求", async () => {
    const first = showcaseCovers()[0]!;
    let calls = 0;
    const fetchImpl = (async () => {
      calls++;
      return png("x");
    }) as unknown as typeof fetch;
    await warmShowcaseCovers(paths, { limit: 2, fetchImpl });
    expect(calls).toBe(2);
    const second = await warmShowcaseCovers(paths, { limit: 2, fetchImpl });
    expect(second.warmed).toBe(0);
    expect(second.skipped).toBe(2);
    expect(calls).toBe(2);
    expect(await cachedShowcaseMedia(path.join(dir, "media"), first.key)).toBeDefined();
  });

  it("单张失败不拖累其余：CDN 抖一张，其余照写", async () => {
    const covers = showcaseCovers();
    const bad = covers[1]!.cdnUrl;
    const r = await warmShowcaseCovers(paths, {
      limit: 4,
      fetchImpl: (async (url: string) => {
        if (url === bad) throw new Error("ECONNRESET");
        return png("ok");
      }) as unknown as typeof fetch,
    });
    expect(r.warmed).toBe(3);
    expect(r.skipped).toBe(1);
  });

  it("HTTP 500 / 空响应都算失败，不会写出一个 0 字节文件冒充缓存", async () => {
    const covers = showcaseCovers();
    const bad = covers[0]!.cdnUrl;
    await warmShowcaseCovers(paths, {
      limit: 1,
      fetchImpl: (async (url: string) => {
        if (url === bad) return { ok: false, status: 500 } as unknown as Response;
        return png("x");
      }) as unknown as typeof fetch,
    });
    expect(await cachedShowcaseMedia(path.join(dir, "media"), covers[0]!.key)).toBeUndefined();
  });

  it("半截文件不算缓存：.part 残骸不会被当成图，目标名不存在", async () => {
    const covers = showcaseCovers();
    const key = covers[0]!.key;
    const { mkdir } = await import("node:fs/promises");
    await mkdir(path.join(dir, "media"), { recursive: true });
    // 上次预热被强杀留下的残骸：命名带 .part，目标名根本没生成。
    await writeFile(path.join(dir, "media", `${key}.part`), "半张图");
    expect(await cachedShowcaseMedia(path.join(dir, "media"), key)).toBeUndefined();
  });

  it("锁：并发第二个进程直接跳过，不会对着同一批 URL 下载两遍", async () => {
    await warmShowcaseCovers(paths, { limit: 1, fetchImpl: (async () => png("x")) as unknown as typeof fetch });
    // 手动造一个"别人正在预热"的锁
    const { mkdir, writeFile: wf } = await import("node:fs/promises");
    const media = path.join(dir, "media");
    await mkdir(media, { recursive: true });
    await wf(path.join(media, ".warm.lock"), "99999");
    let calls = 0;
    const r = await warmShowcaseCovers(paths, {
      limit: 5,
      fetchImpl: (async () => {
        calls++;
        return png("x");
      }) as unknown as typeof fetch,
    });
    expect(calls).toBe(0);
    expect(r.reason).toMatch(/正在预热/);
  });

  it("stale 锁（超过 5 分钟）当不存在，不会永久卡住预热", async () => {
    const { mkdir, writeFile: wf, utimes } = await import("node:fs/promises");
    const media = path.join(dir, "media");
    await mkdir(media, { recursive: true });
    const lock = path.join(media, ".warm.lock");
    await wf(lock, "1");
    const old = new Date(Date.now() - 10 * 60_000);
    await utimes(lock, old, old);
    const r = await warmShowcaseCovers(paths, { limit: 1, fetchImpl: (async () => png("x")) as unknown as typeof fetch });
    expect(r.warmed).toBe(1);
  });

  it("写完清掉锁，不留残骸", async () => {
    await warmShowcaseCovers(paths, { limit: 1, fetchImpl: (async () => png("x")) as unknown as typeof fetch });
    const files = await import("node:fs/promises").then((fs) => fs.readdir(path.join(dir, "media")));
    expect(files.some((f) => f.endsWith(".part") || f === ".warm.lock")).toBe(false);
    // 落的是真 PNG 头，不是错误页
    const head = await readFile(path.join(dir, "media", showcaseCovers()[0]!.key));
    expect(head.subarray(0, 4)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  });
});
