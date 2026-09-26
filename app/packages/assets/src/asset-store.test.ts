import { mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { AssetStore, toAssetInfo } from "./asset-store.js";

// 一张真的 1x1 PNG，用来验尺寸读取。
const PNG = Buffer.from(
  "89504e470d0a1a0a0000000d4948445200000001000000010806000000" +
    "1f15c4890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082",
  "hex",
);

const quiet = { log: () => {} };
const opened: AssetStore[] = [];
function ws(): string {
  const d = mkdtempSync(path.join(tmpdir(), "ov-assets-"));
  mkdirSync(path.join(d, "images"), { recursive: true });
  writeFileSync(path.join(d, "images/a.png"), PNG);
  return d;
}
function open(root: string, opts = {}): AssetStore {
  const s = new AssetStore(root, { ...quiet, ...opts });
  opened.push(s);
  return s;
}
afterEach(() => {
  while (opened.length) opened.pop()!.close();
});

describe("store：外部来的字节", () => {
  it("按类型落到对应目录，并且登记进库", async () => {
    const d = ws();
    const s = open(d);
    const row = await s.store("photo.jpg", Buffer.from("xx"));
    expect(row.path).toBe("images/photo.jpg");
    // 登记进库才算数 —— 没登记的话 agent 用路径能找到文件，但资产面板和画布节点都不认识它。
    expect(s.list().some((a) => a.path === row.path)).toBe(true);
    expect((await s.store("clip.mp4", Buffer.from("xx"))).path).toBe("videos/clip.mp4");
    expect((await s.store("说明.pdf", Buffer.from("xx"))).path).toBe("files/说明.pdf");
  });

  it("恶意文件名逃不出工作区", async () => {
    // 这条路径上的字节来自任何能给机器人发消息的人。
    const d = ws();
    const row = await open(d).store("../../.ssh/config", Buffer.from("pwned"));
    expect(row.path).toBe("files/config");
    expect(readdirSync(path.dirname(d)).includes(".ssh")).toBe(false);
  });

  it("同名不覆盖 —— 覆盖会把上一张换掉，而引用它的节点看起来毫无变化", async () => {
    const d = ws();
    const s = open(d);
    expect((await s.store("shot.png", Buffer.from("first"))).path).toBe("images/shot.png");
    expect((await s.store("shot.png", Buffer.from("second"))).path).toBe("images/shot-2.png");
    expect((await s.store("shot.png", Buffer.from("third"))).path).toBe("images/shot-3.png");
    expect(readFileSync(path.join(d, "images/shot.png"), "utf8")).toBe("first");
  });

  it("只有点的文件名也能存下", async () => {
    const d = ws();
    const s = open(d);
    expect((await s.store("..", Buffer.from("x"))).path).toBe("files/attachment");
    expect((await s.store("", Buffer.from("x"))).path).toBe("files/attachment-2");
  });
});

describe("enroll：登记已有文件", () => {
  it("带上类型、大小和尺寸", async () => {
    const s = open(ws());
    const row = await s.enroll("images/a.png");
    const info = toAssetInfo(row);
    expect(info.type).toBe("image");
    expect(info.name).toBe("a.png");
    expect([info.width, info.height]).toEqual([1, 1]);
    expect(info.fileSize).toBeGreaterThan(0);
    expect(row.quick_hash).toMatch(/^[0-9a-f]{16}$/);
  });

  it("重复登记保持同一个 id —— id 变了等于把画布节点变成悬空引用", async () => {
    const s = open(ws());
    const a = await s.enroll("images/a.png");
    const b = await s.enroll("images/a.png");
    expect(b.id).toBe(a.id);
    expect(b.created_at).toBe(a.created_at);
    expect(s.list()).toHaveLength(1);
  });

  it("拒绝工作区外的路径", async () => {
    const s = open(ws());
    await expect(s.enroll("../../etc/passwd")).rejects.toThrow();
    await expect(s.enroll("/etc/passwd")).rejects.toThrow();
  });

  it("文件不存在是错误，不是一条空记录", async () => {
    const s = open(ws());
    await expect(s.enroll("images/gone.png")).rejects.toThrow();
    expect(s.list()).toHaveLength(0);
  });

  it("重启之后还在", async () => {
    const d = ws();
    const a = await open(d).enroll("images/a.png");
    opened.pop()!.close();
    const again = open(d);
    expect(again.byId(a.id)?.path).toBe("images/a.png");
    expect(again.byPath("images/a.png")?.id).toBe(a.id);
  });

  it("非图片没有尺寸", async () => {
    const d = ws();
    mkdirSync(path.join(d, "audios"));
    writeFileSync(path.join(d, "audios/a.wav"), "RIFF....");
    const row = await open(d).enroll("audios/a.wav");
    expect(toAssetInfo(row).type).toBe("audio");
    expect(row.width).toBeNull();
  });
});

describe("软删除", () => {
  it("按路径和列表都看不见，按 id 还解析得出来", async () => {
    const s = open(ws());
    const a = await s.enroll("images/a.png");
    s.softDelete([a.id]);
    expect(s.list()).toHaveLength(0);
    expect(s.byPath("images/a.png")).toBeUndefined();
    // 撤销窗口内，画布和对话里的引用还得解析得出来。
    expect(s.byId(a.id)?.path).toBe("images/a.png");
    s.restore([a.id]);
    expect(s.list()).toHaveLength(1);
    s.hardDelete([a.id]);
    expect(s.byId(a.id)).toBeUndefined();
  });

  it("重新登记一个软删除中的路径，id 不变、恢复可见", async () => {
    const s = open(ws());
    const a = await s.enroll("images/a.png");
    s.softDelete([a.id]);
    const b = await s.enroll("images/a.png");
    expect(b.id).toBe(a.id);
    expect(s.list()).toHaveLength(1);
  });
});

describe("损坏与旧索引", () => {
  it("库文件坏了：原文件先隔离，再用空库开局", () => {
    const d = ws();
    mkdirSync(path.join(d, ".hilo"), { recursive: true });
    writeFileSync(path.join(d, ".hilo/index.sqlite"), "这不是 sqlite");
    const s = open(d, { now: () => 42 });
    expect(s.degraded).toBe(true);
    const saved = readFileSync(path.join(d, ".hilo/index-recovery/index-42.sqlite"), "utf8");
    // 隔离的必须是原文，不能是空的。
    expect(saved).toBe("这不是 sqlite");
    expect(s.list()).toHaveLength(0);
  });

  it("没有库是首次运行，不算降级", () => {
    const s = open(ws());
    expect(s.degraded).toBe(false);
  });

  it("导入旧版 assets.json 时保留原 id —— 已有画布靠这些 id 引用素材", () => {
    const d = ws();
    mkdirSync(path.join(d, ".hilo"), { recursive: true });
    writeFileSync(
      path.join(d, ".hilo/assets.json"),
      JSON.stringify({
        version: 1,
        by_path: {
          "images/a.png": { id: "old-1", path: "images/a.png", type: "image", name: "a.png", width: 1, height: 1, file_size: 70, time: "1700000000" },
          "videos/gone.mp4": { id: "old-2", path: "videos/gone.mp4", type: "video", name: "gone.mp4", file_size: 9, time: "1700000001" },
        },
      }),
    );
    const s = open(d);
    expect(s.degraded).toBe(false);
    expect(s.byPath("images/a.png")?.id).toBe("old-1");
    expect(s.byId("old-1")?.created_at).toBe(1700000000 * 1000);
    // 文件已经不在了：导入成 missing，而不是丢掉 —— 画布上的节点要能显示"关联异常"。
    expect(s.byId("old-2")?.status).toBe("missing");
    // 之后再登记同一个路径，id 仍然是旧的。
    return s.enroll("images/a.png").then((r) => expect(r.id).toBe("old-1"));
  });

  it("旧索引只导一次", () => {
    const d = ws();
    mkdirSync(path.join(d, ".hilo"), { recursive: true });
    writeFileSync(path.join(d, ".hilo/assets.json"), JSON.stringify({ by_path: { "images/a.png": { id: "old-1", path: "images/a.png" } } }));
    const s = open(d);
    s.hardDelete(["old-1"]);
    opened.pop()!.close();
    expect(open(d).byId("old-1")).toBeUndefined();
  });

  it("旧索引坏了：原文隔离，降级开局", () => {
    const d = ws();
    mkdirSync(path.join(d, ".hilo"), { recursive: true });
    writeFileSync(path.join(d, ".hilo/assets.json"), "{ 这不是合法 JSON");
    const s = open(d, { now: () => 7 });
    expect(s.degraded).toBe(true);
    expect(readFileSync(path.join(d, ".hilo/quarantine/assets-broken-7.json"), "utf8")).toContain("这不是合法 JSON");
  });
});

describe("文件模块用到的操作", () => {
  it("setMetadata 整份替换、listByFolder 按前缀", async () => {
    const d = ws();
    const s = open(d);
    const a = await s.enroll("images/a.png");
    expect(s.setMetadata(a.id, { prompt: "猫" })?.metadata).toBe('{"prompt":"猫"}');
    expect(s.listByFolder("images").map((r) => r.path)).toEqual(["images/a.png"]);
    expect(s.listByFolder("image")).toHaveLength(0);
  });

  it("按路径软删除 / 恢复 / 清理", async () => {
    const d = ws();
    const s = open(d, { now: () => 1000 });
    const a = await s.enroll("images/a.png");
    expect(s.softDeleteByPath("images/a.png", 1000)).toBe(1);
    expect(s.softDeleteByPath("images/a.png", 1000)).toBe(0);
    expect(s.purgeSoftDeleted(999)).toBe(0);
    expect(s.restoreByPath("images/a.png")).toBe(1);
    s.softDeleteByPath("images/a.png", 1000);
    expect(s.purgeSoftDeleted(1000)).toBe(1);
    expect(s.byId(a.id)).toBeUndefined();
  });

  it("relocate：文件改名只动一行，文件夹整体换前缀，id 都不变", async () => {
    const d = ws();
    writeFileSync(path.join(d, "images/ab.png"), PNG);
    writeFileSync(path.join(d, "images_x.png"), PNG);
    const s = open(d);
    const a = await s.enroll("images/a.png");
    const ab = await s.enroll("images/ab.png");
    const other = await s.enroll("images_x.png");
    const one = s.relocate("images/a.png", "images/b.png");
    expect(one.map((m) => [m.oldPath, m.row.path, m.row.id])).toEqual([["images/a.png", "images/b.png", a.id]]);
    expect(s.byId(a.id)?.name).toBe("b.png");
    const dir = s.relocate("images", "pics/imgs");
    expect(dir.map((m) => m.row.path).sort()).toEqual(["pics/imgs/ab.png", "pics/imgs/b.png"]);
    expect(s.byId(ab.id)?.path).toBe("pics/imgs/ab.png");
    // 前缀要按目录边界匹配：`images_x.png` 不属于 `images/`。
    expect(s.byId(other.id)?.path).toBe("images_x.png");
    expect(s.relocate("nope", "x")).toEqual([]);
  });
});
