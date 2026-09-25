import { copyFileSync, mkdirSync, mkdtempSync, renameSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { AssetStore } from "./asset-store.js";
import { reconcileWorkspace } from "./reconcile.js";

const opened: AssetStore[] = [];
function setup(files: Record<string, string>): { root: string; store: AssetStore } {
  const root = mkdtempSync(path.join(tmpdir(), "ov-reconcile-"));
  for (const [rel, body] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    writeFileSync(path.join(root, rel), body);
  }
  const store = new AssetStore(root, { log: () => {} });
  opened.push(store);
  return { root, store };
}
afterEach(() => {
  while (opened.length) opened.pop()!.close();
});

describe("reconcileWorkspace", () => {
  it("新文件登记、改过的刷新、没动的不碰；点开头的目录和不认识的扩展名跳过", async () => {
    const { root, store } = setup({ "a.md": "一", "b.md": "二", ".hidden/c.md": "藏", "notes.xyz": "?" });
    await store.enroll("a.md");
    await store.enroll("b.md");
    writeFileSync(path.join(root, "b.md"), "二改过了");
    writeFileSync(path.join(root, "new.md"), "新");
    const { result, changes } = await reconcileWorkspace(store);
    expect(result).toMatchObject({ status: "completed", walked: 3, unchanged: 1, dirty: 1, dirty_changed: 1, orphan_initial: 1, enrolled: 1, missing_initial: 0 });
    expect(changes.map((c) => [c.change, c.path]).sort()).toEqual([
      ["created", "new.md"],
      ["updated", "b.md"],
    ]);
    expect(store.byPath(".hidden/c.md")).toBeUndefined();
  });

  it("挪动 / 改名的文件保住原 id（同 inode）；挪到别的盘时按指纹认", async () => {
    const { root, store } = setup({ "shots/one.md": "镜头一", "shots/two.md": "镜头二" });
    const one = await store.enroll("shots/one.md");
    const two = await store.enroll("shots/two.md");
    mkdirSync(path.join(root, "moved"));
    renameSync(path.join(root, "shots/one.md"), path.join(root, "moved/one.md"));
    // 复制再删：inode 变了，只能靠 (size, 指纹)。
    copyFileSync(path.join(root, "shots/two.md"), path.join(root, "moved/2.md"));
    rmSync(path.join(root, "shots/two.md"));
    const { result, changes } = await reconcileWorkspace(store);
    expect(result).toMatchObject({ status: "completed", rebound: 2, enrolled: 0, marked_missing: 0 });
    expect(store.byPath("moved/one.md")?.id).toBe(one.id);
    expect(store.byPath("moved/2.md")?.id).toBe(two.id);
    expect(changes).toContainEqual({ id: one.id, change: "renamed", path: "moved/one.md", old_path: "shots/one.md" });
  });

  it("找不到又认不出的标 missing；好几个长得一样的只记候选不猜；文件回来了恢复 active", async () => {
    const { root, store } = setup({ "gone.md": "没了", "twin.md": "双胞胎" });
    const gone = await store.enroll("gone.md");
    const twin = await store.enroll("twin.md");
    rmSync(path.join(root, "gone.md"));
    copyFileSync(path.join(root, "twin.md"), path.join(root, "twin-a.md"));
    copyFileSync(path.join(root, "twin.md"), path.join(root, "twin-b.md"));
    rmSync(path.join(root, "twin.md"));
    const { result } = await reconcileWorkspace(store);
    expect(result).toMatchObject({ status: "completed", marked_missing: 2, candidates_set: 1, enrolled: 2, rebound: 0 });
    expect(store.byId(gone.id)?.status).toBe("missing");
    const t = store.byId(twin.id)!;
    expect(t.status).toBe("missing");
    expect(t.candidate_path).toBe("twin-a.md");

    // 用户确认候选：丢失的记录搬过去，候选那条并掉。
    await store.mergeCandidate(twin.id, t.candidate_asset_id!);
    expect(store.byPath("twin-a.md")?.id).toBe(twin.id);
    expect(store.byId(twin.id)?.status).toBe("active");

    writeFileSync(path.join(root, "gone.md"), "又回来了");
    const again = await reconcileWorkspace(store);
    expect(again.changes).toContainEqual({ id: gone.id, change: "status-changed", path: "gone.md", status: "active" });
    expect(store.byId(gone.id)?.status).toBe("active");
    expect(store.removeMissing(gone.id)).toBe(false);
  });

  it("超过一半同时找不到（移动硬盘没插）整轮放弃，一条都不标", async () => {
    const files = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`f${i}.md`, `内容${i}`]));
    const { root, store } = setup(files);
    for (const rel of Object.keys(files)) await store.enroll(rel);
    for (let i = 0; i < 7; i++) rmSync(path.join(root, `f${i}.md`));
    const { result, changes } = await reconcileWorkspace(store);
    expect(result).toEqual({ status: "aborted", reason: "missing-ratio-exceeded", missing_initial: 7, total: 12 });
    expect(changes).toEqual([]);
    expect(store.list().every((r) => r.status === "active")).toBe(true);
  });

  it("另一个 reconcile 在跑时跳过；锁过期了当作崩溃遗留", async () => {
    const { store } = setup({ "a.md": "a" });
    store.db.prepare("INSERT INTO reconcile_lock (gateway_id, started_at) VALUES ('other', ?)").run(Date.now());
    expect((await reconcileWorkspace(store)).result).toEqual({ status: "skipped-locked" });
    store.db.prepare("UPDATE reconcile_lock SET started_at = ?").run(Date.now() - 60 * 60_000);
    expect((await reconcileWorkspace(store)).result.status).toBe("completed");
    expect(store.db.prepare("SELECT COUNT(*) AS n FROM reconcile_lock").get()).toEqual({ n: 0 });
  });

  it("只改了修改时间：算 touched 不算 changed", async () => {
    const { root, store } = setup({ "a.md": "不变" });
    await store.enroll("a.md");
    const later = new Date(Date.now() + 60_000);
    utimesSync(path.join(root, "a.md"), later, later);
    expect((await reconcileWorkspace(store)).result).toMatchObject({ dirty: 1, dirty_touched: 1, dirty_changed: 0 });
  });
});
