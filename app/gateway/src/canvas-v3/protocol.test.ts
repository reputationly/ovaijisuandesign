import { describe, expect, it } from "vitest";

import { applyCanvasV3Patch, createEmptyCanvasV3Document, parseCanvasV3Document, parseCanvasV3Patch } from "./protocol.js";

const base = {
  parentId: null,
  position: { x: 0, y: 0 },
  size: { width: 100, height: 80 },
  zIndex: 1,
  hidden: false,
};

describe("v3 画布文档", () => {
  it("空文档可以解析，补丁把修订号加一", () => {
    const empty = createEmptyCanvasV3Document();
    expect(parseCanvasV3Document(empty)).toEqual(empty);
    const frame = { ...base, id: "frame-1", kind: "frame", title: "一组", collapsed: false };
    const next = applyCanvasV3Patch(empty, {
      type: "canvas.patch",
      nodes: [{ id: "frame-1", before: null, after: frame }],
      edges: [],
    });
    expect(next.revision).toBe(1);
    expect(next.nodes["frame-1"]?.title).toBe("一组");
  });

  it("组合节点可以解析", () => {
    expect(() => parseCanvasV3Patch({
      type: "canvas.patch",
      nodes: [{
        id: "n1",
        before: null,
        after: {
          id: "n1",
          parentId: null,
          position: { x: 0, y: 0 },
          size: { width: 350, height: 350 },
          zIndex: 1,
          hidden: false,
          kind: "composition",
          compositionId: "cmp_abc",
          activeItem: { type: "version", resourceId: "res_node", versionId: "ver_node" },
          draft: null,
        },
      }],
      edges: [],
    })).not.toThrow();
  });

  it("旧的资源节点和不是画框的父节点都拒绝", () => {
    expect(() => parseCanvasV3Document({
      schemaVersion: 1,
      revision: 0,
      nodes: { n: { ...base, id: "n", kind: "resource", resourceId: "r" } },
      edges: {},
    })).toThrow(/CANVAS_V3_LEGACY_FORMAT/);
    expect(() => parseCanvasV3Document({
      schemaVersion: 1,
      revision: 0,
      nodes: {
        a: { ...base, id: "a", kind: "placeholder", expectedKind: "image", draft: null },
        b: { ...base, id: "b", kind: "placeholder", expectedKind: "image", draft: null, parentId: "a" },
      },
      edges: {},
    })).toThrow(/parent must be a frame/);
  });
});
