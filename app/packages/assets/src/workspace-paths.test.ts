import path from "node:path";

import { describe, expect, it } from "vitest";

import { relativize, safeResolve } from "./workspace-paths.js";

const ROOT = path.resolve("/tmp/ws");

describe("safeResolve", () => {
  it("解析普通的相对路径", () => {
    expect(safeResolve(ROOT, "images/a.png")).toBe(path.join(ROOT, "images/a.png"));
  });

  it("拒绝逃逸 —— 这些相对路径来自 agent 和 HTTP 请求，是真的会被喂进来的", () => {
    for (const bad of ["../secrets", "images/../../etc/passwd", "a/../../b", "..", "./../x", "..\\..\\x", "a\\..\\..\\b"]) {
      expect(safeResolve(ROOT, bad), bad).toBeNull();
    }
  });

  it("拒绝绝对路径", () => {
    for (const bad of ["/etc/passwd", path.join(ROOT, "images/a.png"), "C:\\Windows\\x", "\\\\server\\share"]) {
      expect(safeResolve(ROOT, bad), bad).toBeNull();
    }
  });

  it("拒绝空", () => {
    expect(safeResolve(ROOT, "")).toBeNull();
    expect(safeResolve(ROOT, "   ")).toBeNull();
    expect(safeResolve(ROOT, ".")).toBeNull();
  });

  it("开头的 ./ 无害", () => {
    expect(safeResolve(ROOT, "./images/a.png")).toBe(path.join(ROOT, "images/a.png"));
  });

  it("反斜杠也当分隔符", () => {
    expect(safeResolve(ROOT, "images\\a.png")).toBe(path.join(ROOT, "images", "a.png"));
  });
});

describe("relativize", () => {
  it("反向解析成 / 分隔 —— canvas.json 里一律存这个形式", () => {
    expect(relativize(ROOT, path.join(ROOT, "images", "a.png"))).toBe("images/a.png");
    expect(relativize(ROOT, path.resolve("/elsewhere/a.png"))).toBeNull();
    expect(relativize(ROOT, ROOT)).toBeNull();
  });
});
