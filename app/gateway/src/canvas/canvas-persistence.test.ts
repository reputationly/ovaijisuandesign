import { mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import type { CanvasFile, CanvasNode } from "@ov/protocol";
import { describe, expect, it } from "vitest";

import { CanvasDestructiveSaveRejectedError, CanvasInvalidSaveRejectedError, CanvasPersistence } from "./canvas-persistence.js";

const hilo = () => {
  const d = path.join(mkdtempSync(path.join(tmpdir(), "ov-canvas-")), ".hilo");
  mkdirSync(d, { recursive: true });
  return d;
};
const node = (id: string, extra: Partial<CanvasNode> = {}): CanvasNode => ({ id, type: "image", positions: { workflow: { x: 0, y: 0 } }, ...extra });
const canvas = (nodes: CanvasNode[], edges: CanvasFile["edges"] = []): CanvasFile => ({ version: 1, mode: "workflow", nodes, edges });
const many = (n: number) => Array.from({ length: n }, (_, i) => node(`n${i}`));

describe("CanvasPersistence", () => {
  it("没有文件是空画布", async () => {
    expect(await new CanvasPersistence(hilo()).read()).toEqual({ version: 1, mode: "workflow", nodes: [], edges: [] });
  });

  it("写了读得回来，不认识的字段不丢", async () => {
    const p = new CanvasPersistence(hilo());
    const c = { ...canvas([node("a", { data: { popoverDraft: "草稿" }, peer: "x" } as any)]), viewport: { zoom: 2 } } as any;
    await p.write(c);
    const again = await new CanvasPersistence(path.dirname(p.file)).read();
    expect(again).toEqual(c);
  });

  it("只保留 workflow / freeform 的坐标", async () => {
    const p = new CanvasPersistence(hilo());
    await p.write(canvas([node("a", { positions: { workflow: { x: 1, y: 2 }, bogus: { x: 0, y: 0 }, freeform: { x: NaN, y: 0 } } })]));
    expect((await p.read()).nodes[0]!.positions).toEqual({ workflow: { x: 1, y: 2 } });
  });

  it("解析失败直接抛错，绝不回退成空画布", async () => {
    const d = hilo();
    writeFileSync(path.join(d, "canvas.json"), "{ 截断的");
    await expect(new CanvasPersistence(d).read()).rejects.toThrow(/Refusing to fall back to empty canvas/);
    // 原文件原样还在。
    expect(readFileSync(path.join(d, "canvas.json"), "utf8")).toBe("{ 截断的");
  });

  it("和上次一样就不写盘", async () => {
    const p = new CanvasPersistence(hilo());
    expect(await p.write(canvas([node("a")]))).toBe(true);
    expect(await p.write(canvas([node("a")]))).toBe(false);
  });

  it("结构不对的拒掉：重复 id、悬空边、悬空 parent、两个文本节点共用资产", async () => {
    const p = new CanvasPersistence(hilo());
    await expect(p.write(canvas([node("a"), node("a")]))).rejects.toBeInstanceOf(CanvasInvalidSaveRejectedError);
    await expect(p.write(canvas([node("a")], [{ id: "e", source: "a", target: "b", type: "x" }]))).rejects.toThrow(/missing endpoint/);
    await expect(p.write(canvas([node("a", { parentId: "g" })]))).rejects.toThrow(/missing parent/);
    await expect(
      p.write(canvas([node("t1", { type: "text", assetId: "x" }), node("t2", { type: "text", assetId: "x" })])),
    ).rejects.toThrow(/share asset/);
  });

  it("有节点消失但没有删除证据：拒绝，并把被拒的快照留一份", async () => {
    const d = hilo();
    const p = new CanvasPersistence(d);
    await p.write(canvas([node("a"), node("b")]));
    await expect(p.write(canvas([node("a")]))).rejects.toMatchObject({ reason: "missing_deletion_evidence" });
    expect(readdirSync(path.join(d, "canvas-backups/rejected"))).toHaveLength(1);
    expect((await p.read()).nodes).toHaveLength(2);
  });

  it("带证据的普通删除照常通过；删节点连带的边自动算授权", async () => {
    const p = new CanvasPersistence(hilo());
    await p.write(canvas([node("a"), node("b")], [{ id: "a->b", source: "a", target: "b", type: "derivation" }]));
    await p.write(canvas([node("a")]), { deletionIntent: { operationId: "op1", removedNodeIds: ["b"] } });
    expect((await p.read()).edges).toEqual([]);
  });

  it("清空一个只有一个节点的画布是普通删除，不需要大面积确认", async () => {
    const p = new CanvasPersistence(hilo());
    await p.write(canvas([node("a")]));
    await p.write(canvas([]), { deletionIntent: { operationId: "op", removedNodeIds: ["a"] } });
    expect((await p.read()).nodes).toEqual([]);
  });

  it("大面积删除要显式确认；确认了先备份再写", async () => {
    const d = hilo();
    const p = new CanvasPersistence(d);
    await p.write(canvas(many(12)));
    const ids = many(12).slice(2).map((n) => n.id);
    await expect(p.write(canvas(many(2)), { deletionIntent: { operationId: "op", removedNodeIds: ids } })).rejects.toBeInstanceOf(
      CanvasDestructiveSaveRejectedError,
    );
    await p.write(canvas(many(2)), { deletionIntent: { operationId: "op", removedNodeIds: ids, highBlastConfirmed: true } });
    expect((await p.read()).nodes).toHaveLength(2);
    expect(readdirSync(path.join(d, "canvas-backups")).filter((f) => f.startsWith("canvas-"))).toHaveLength(1);
  });

  it("内部大面积删除只有白名单原因可以放行", async () => {
    const p = new CanvasPersistence(hilo());
    await p.write(canvas(many(12)));
    const ids = many(12).slice(1).map((n) => n.id);
    const intent = (reason: string) => ({ operationId: "op", reason, removedNodeIds: ids, removedEdgeIds: [], allowHighBlast: true });
    await expect(p.write(canvas(many(1)), { systemMutationIntent: intent("whatever") })).rejects.toMatchObject({
      reason: "high_blast_confirmation_required",
    });
    await p.write(canvas(many(1)), { systemMutationIntent: intent("explicit-node-delete") });
    expect((await p.read()).nodes).toHaveLength(1);
  });
});
