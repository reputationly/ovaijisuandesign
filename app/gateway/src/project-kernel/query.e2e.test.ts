import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../bootstrap.js";

describe("v3 项目查询", () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;

  beforeAll(async () => {
    const ws = mkdtempSync(path.join(tmpdir(), "ov-query-"));
    writeFileSync(path.join(ws, "photo.png"), "png");
    process.env.WORKSPACE_DIR = ws;
    process.env.HILO_GATEWAY_ROLE = "workspace";
    process.env.HILO_PROJECT_ARCHITECTURE = "resource_v3";
    app = await createApp();
    await app.init();
    http = request(app.getHttpServer());
  });

  afterAll(async () => {
    await app.close();
    delete process.env.WORKSPACE_DIR;
    delete process.env.HILO_GATEWAY_ROLE;
    delete process.env.HILO_PROJECT_ARCHITECTURE;
  });

  it("按资源和组合读快照，未知查询返回不支持", async () => {
    await http.post("/api/project/resources/commands").send({
      commandId: "query-create",
      actor: "human",
      command: { type: "resource.create", resourceId: "res_query", payload: { name: "photo.png", kind: 2 } },
    });
    await http.post("/api/project/resources/commands").send({
      commandId: "query-version",
      actor: "human",
      command: {
        type: "resource.update",
        resourceId: "res_query",
        payload: { kind: "new_version", versionId: "ver_query", baseVersionId: null, relativePath: "photo.png", source: "import", disposition: "adopted", dependencies: [] },
      },
    });
    const got = await http.post("/api/v3/query/resource_get").send({ resourceId: "res_query" });
    expect(got.status).toBe(200);
    expect(got.body.resource).toMatchObject({ id: "res_query", name: "photo.png", kind: "image", lifecycle: "active", currentVersionId: "ver_query" });
    expect(got.body.version).toMatchObject({ id: "ver_query", status: "ready", relativePath: "photo.png" });
    expect(typeof got.body.resource.createdAt).toBe("number");
    const byVersion = await http.post("/api/v3/query/resource_get").send({ versionId: "ver_query" });
    expect(byVersion.body.resource.id).toBe("res_query");
    const batch = await http.post("/api/v3/query/resource_get_batch").send({ resourceIds: ["res_query", "res_missing"] });
    expect(batch.body.items[0].resource.id).toBe("res_query");
    expect(batch.body.items[1]).toMatchObject({ resourceId: "res_missing", error: { code: "NOT_FOUND" } });
    const versions = await http.post("/api/v3/query/resource_versions").send({ resourceId: "res_query" });
    expect(versions.body.items).toEqual([expect.objectContaining({ id: "ver_query", status: "ready", isCurrent: true, parentVersionId: null })]);
    expect(versions.body.nextCursor).toBeNull();
    const type = await http.post("/api/project/compositions/commands").send({
      commandId: "query-type",
      actor: "human",
      command: { type: "composition_type.register", label: "角色" },
    });
    const created = await http.post("/api/project/compositions/commands").send({
      commandId: "query-comp",
      actor: "human",
      command: { type: "composition.create", compositionType: type.body.typeId, name: "苏晚" },
    });
    const composition = await http.post("/api/v3/query/composition_get").send({ compositionId: created.body.compositionId });
    expect(composition.body).toMatchObject({ id: created.body.compositionId, name: "苏晚", type: type.body.typeId, lifecycle: "active", revision: 1, attributes: {} });
    const types = await http.post("/api/v3/query/composition_type_list").send({ text: "角色" });
    expect(types.body.items).toEqual([expect.objectContaining({ id: type.body.typeId, label: "角色" })]);
    const unknown = await http.post("/api/v3/query/not_a_query").send({});
    expect(unknown.status).toBe(422);
    expect(unknown.body.error).toMatchObject({ code: "UNSUPPORTED_QUERY", retryable: false });
    const extra = await http.post("/api/v3/query/resource_get").send({ resourceId: "res_query", extra: 1 });
    expect(extra.status).toBe(422);
    expect(extra.body.error.code).toBe("UNSUPPORTED_FIELD");
  });

  it("按名字和种类搜索资源，并用光标翻页", async () => {
    const ws = process.env.WORKSPACE_DIR ?? "";
    writeFileSync(path.join(ws, "alpha-note.png"), "a");
    writeFileSync(path.join(ws, "beta-note.txt"), "b");
    await http.post("/api/project/resources/commands").send({
      commandId: "search-a",
      actor: "human",
      command: { type: "resource.create", resourceId: "res_search_a", payload: { name: "alpha-note.png", kind: 2 } },
    });
    await http.post("/api/project/resources/commands").send({
      commandId: "search-a-version",
      actor: "human",
      command: {
        type: "resource.update",
        resourceId: "res_search_a",
        payload: { kind: "new_version", versionId: "ver_search_a", baseVersionId: null, relativePath: "alpha-note.png", source: "import", disposition: "adopted", dependencies: [] },
      },
    });
    await http.post("/api/project/resources/commands").send({
      commandId: "search-b",
      actor: "human",
      command: { type: "resource.create", resourceId: "res_search_b", payload: { name: "beta-note.txt", kind: 1 } },
    });
    await http.post("/api/project/resources/commands").send({
      commandId: "search-b-version",
      actor: "human",
      command: {
        type: "resource.update",
        resourceId: "res_search_b",
        payload: { kind: "new_version", versionId: "ver_search_b", baseVersionId: null, relativePath: "beta-note.txt", source: "import", disposition: "adopted", dependencies: [] },
      },
    });
    const images = await http.post("/api/v3/query/resource_search").send({ text: "note", kinds: ["image"] });
    expect(images.status).toBe(200);
    expect(images.body.items.map((item: { id: string }) => item.id)).toEqual(["res_search_a"]);
    const first = await http.post("/api/v3/query/resource_search").send({ text: "note", limit: 1, order: { by: "createdAt", direction: "asc" } });
    expect(first.body.items).toHaveLength(1);
    expect(first.body.nextCursor).toEqual(expect.any(String));
    const second = await http.post("/api/v3/query/resource_search").send({ text: "note", limit: 1, order: { by: "createdAt", direction: "asc" }, cursor: first.body.nextCursor });
    expect(second.body.items).toHaveLength(1);
    expect(second.body.items[0].id).not.toBe(first.body.items[0].id);
    expect(new Set([first.body.items[0].id, second.body.items[0].id])).toEqual(new Set(["res_search_a", "res_search_b"]));
    expect(second.body.nextCursor).toBeNull();
  });

  it("按名字搜索组合，并用光标翻页", async () => {
    const type = await http.post("/api/project/compositions/commands").send({
      commandId: "csearch-type",
      actor: "human",
      command: { type: "composition_type.register", label: "查询类" },
    });
    const firstId = await http.post("/api/project/compositions/commands").send({
      commandId: "csearch-a",
      actor: "human",
      command: { type: "composition.create", compositionType: type.body.typeId, name: "查询甲" },
    });
    await http.post("/api/project/compositions/commands").send({
      commandId: "csearch-b",
      actor: "human",
      command: { type: "composition.create", compositionType: type.body.typeId, name: "查询乙" },
    });
    const found = await http.post("/api/v3/query/composition_search").send({ text: "查询甲", type: type.body.typeId });
    expect(found.status).toBe(200);
    expect(found.body.items.map((item: { id: string }) => item.id)).toEqual([firstId.body.compositionId]);
    const page = await http.post("/api/v3/query/composition_search").send({ text: "查询", type: type.body.typeId, limit: 1, order: { by: "createdAt", direction: "asc" } });
    expect(page.body.items).toHaveLength(1);
    expect(page.body.nextCursor).toEqual(expect.any(String));
    const next = await http.post("/api/v3/query/composition_search").send({ text: "查询", type: type.body.typeId, limit: 1, order: { by: "createdAt", direction: "asc" }, cursor: page.body.nextCursor });
    expect(next.body.items).toHaveLength(1);
    expect(next.body.items[0].id).not.toBe(page.body.items[0].id);
    expect(next.body.nextCursor).toBeNull();
  });

  it("读出版本的上游、下游，以及资源所在的组合", async () => {
    const ws = process.env.WORKSPACE_DIR ?? "";
    writeFileSync(path.join(ws, "parent.png"), "p");
    writeFileSync(path.join(ws, "child.png"), "c");
    await http.post("/api/project/resources/commands").send({
      commandId: "rel-parent",
      actor: "human",
      command: { type: "resource.create", resourceId: "res_parent", payload: { name: "parent.png", kind: 2 } },
    });
    await http.post("/api/project/resources/commands").send({
      commandId: "rel-parent-version",
      actor: "human",
      command: {
        type: "resource.update",
        resourceId: "res_parent",
        payload: { kind: "new_version", versionId: "ver_parent", baseVersionId: null, relativePath: "parent.png", source: "import", disposition: "adopted", dependencies: [] },
      },
    });
    await http.post("/api/project/resources/commands").send({
      commandId: "rel-child",
      actor: "human",
      command: { type: "resource.create", resourceId: "res_child", payload: { name: "child.png", kind: 2 } },
    });
    await http.post("/api/project/resources/commands").send({
      commandId: "rel-child-version",
      actor: "human",
      command: {
        type: "resource.update",
        resourceId: "res_child",
        payload: {
          kind: "new_version",
          versionId: "ver_child",
          baseVersionId: null,
          relativePath: "child.png",
          source: "import",
          disposition: "adopted",
          dependencies: [{ resourceId: "res_parent", versionId: "ver_parent", role: "source", inputIndex: 0 }],
        },
      },
    });
    const inputs = await http.post("/api/v3/query/resource_relations").send({ relation: "inputs", versionId: "ver_child" });
    expect(inputs.status).toBe(200);
    expect(inputs.body.items).toEqual([{ resourceId: "res_parent", versionId: "ver_parent", role: "source", inputIndex: 0 }]);
    const derivatives = await http.post("/api/v3/query/resource_relations").send({ relation: "derivatives", versionId: "ver_parent" });
    expect(derivatives.body.items).toEqual([{ resourceId: "res_child", versionId: "ver_child", role: "source", inputIndex: 0 }]);
    const type = await http.post("/api/project/compositions/commands").send({
      commandId: "rel-type",
      actor: "human",
      command: { type: "composition_type.register", label: "关系类" },
    });
    const composition = await http.post("/api/project/compositions/commands").send({
      commandId: "rel-comp",
      actor: "human",
      command: { type: "composition.create", compositionType: type.body.typeId, name: "用了父图" },
    });
    await http.post("/api/project/compositions/commands").send({
      commandId: "rel-member",
      actor: "human",
      expectedRevision: 1,
      command: {
        type: "composition.apply",
        compositionId: composition.body.compositionId,
        operations: [{ type: "member.add", member: { memberId: "mem-parent", role: "portrait", resource: "res_parent" } }],
      },
    });
    const memberships = await http.post("/api/v3/query/resource_relations").send({ relation: "compositions", resourceId: "res_parent" });
    expect(memberships.body.items).toEqual([{ compositionId: composition.body.compositionId, revision: 2, memberId: "mem-parent", role: "portrait" }]);
    const missing = await http.post("/api/v3/query/resource_relations").send({ relation: "inputs", versionId: "ver_none" });
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe("NOT_FOUND");
  });

  it("按行读文本文档，越过末行或读图片则拒绝", async () => {
    const ws = process.env.WORKSPACE_DIR ?? "";
    writeFileSync(path.join(ws, "chapter.txt"), "第一行\n第二行\n第三行\n");
    await http.post("/api/project/resources/commands").send({
      commandId: "doc-create",
      actor: "human",
      command: { type: "resource.create", resourceId: "res_doc", payload: { name: "chapter.txt", kind: 1 } },
    });
    await http.post("/api/project/resources/commands").send({
      commandId: "doc-version",
      actor: "human",
      command: {
        type: "resource.update",
        resourceId: "res_doc",
        payload: { kind: "new_version", versionId: "ver_doc", baseVersionId: null, relativePath: "chapter.txt", source: "import", disposition: "adopted", dependencies: [] },
      },
    });
    const page = await http.post("/api/v3/query/document_read").send({ versionId: "ver_doc", startLine: 2, lineCount: 1 });
    expect(page.status).toBe(200);
    expect(page.body).toMatchObject({ versionId: "ver_doc", resourceId: "res_doc", name: "chapter.txt", text: "第二行", startLine: 2, lineCount: 1, totalLines: 3, more: true, truncated: false });
    expect(page.body.media.mimeType).toBe("text/plain");
    const stale = await http.post("/api/v3/query/document_read").send({ versionId: "ver_doc", contentRevision: 2 });
    expect(stale.status).toBe(409);
    expect(stale.body.error.code).toBe("DOCUMENT_REVISION_CONFLICT");
    const past = await http.post("/api/v3/query/document_read").send({ versionId: "ver_doc", startLine: 9 });
    expect(past.status).toBe(400);
    expect(past.body.error.message).toContain("past the end");
    writeFileSync(path.join(ws, "picture.png"), "png");
    await http.post("/api/project/resources/commands").send({
      commandId: "doc-image",
      actor: "human",
      command: { type: "resource.create", resourceId: "res_doc_image", payload: { name: "picture.png", kind: 2 } },
    });
    await http.post("/api/project/resources/commands").send({
      commandId: "doc-image-version",
      actor: "human",
      command: {
        type: "resource.update",
        resourceId: "res_doc_image",
        payload: { kind: "new_version", versionId: "ver_doc_image", baseVersionId: null, relativePath: "picture.png", source: "import", disposition: "adopted", dependencies: [] },
      },
    });
    const image = await http.post("/api/v3/query/document_read").send({ versionId: "ver_doc_image" });
    expect(image.status).toBe(422);
    expect(image.body.error.code).toBe("UNSUPPORTED_MEDIA");
  });

  it("预览文本和图片：默认给尺寸，要内容时再抽出正文或画面", async () => {
    const ws = process.env.WORKSPACE_DIR ?? "";
    writeFileSync(path.join(ws, "preview.txt"), "甲\n乙\n丙\n");
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
    writeFileSync(path.join(ws, "dot.png"), png);
    await http.post("/api/project/resources/commands").send({
      commandId: "preview-text",
      actor: "human",
      command: { type: "resource.create", resourceId: "res_preview_text", payload: { name: "preview.txt", kind: 1 } },
    });
    await http.post("/api/project/resources/commands").send({
      commandId: "preview-text-version",
      actor: "human",
      command: {
        type: "resource.update",
        resourceId: "res_preview_text",
        payload: { kind: "new_version", versionId: "ver_preview_text", baseVersionId: null, relativePath: "preview.txt", source: "import", disposition: "adopted", dependencies: [] },
      },
    });
    await http.post("/api/project/resources/commands").send({
      commandId: "preview-image",
      actor: "human",
      command: { type: "resource.create", resourceId: "res_preview_image", payload: { name: "dot.png", kind: 2 } },
    });
    await http.post("/api/project/resources/commands").send({
      commandId: "preview-image-version",
      actor: "human",
      command: {
        type: "resource.update",
        resourceId: "res_preview_image",
        payload: { kind: "new_version", versionId: "ver_preview_image", baseVersionId: null, relativePath: "dot.png", source: "import", disposition: "adopted", dependencies: [] },
      },
    });
    const meta = await http.post("/api/v3/query/resource_preview").send({ versionId: "ver_preview_text" });
    expect(meta.status).toBe(200);
    expect(meta.body).toMatchObject({ versionId: "ver_preview_text", kind: "text", media: { mimeType: "text/plain" }, range: null, truncated: false, reason: null });
    expect(meta.body.content).toBeUndefined();
    const text = await http.post("/api/v3/query/resource_preview").send({ versionId: "ver_preview_text", mode: "content", range: { startLine: 2, lineCount: 1 } });
    expect(text.body.content).toEqual([{ type: "text", text: "乙" }]);
    expect(text.body.range).toEqual({ startLine: 2, lineCount: 1 });
    const image = await http.post("/api/v3/query/resource_preview").send({ versionId: "ver_preview_image" });
    expect(image.body.media).toMatchObject({ mimeType: "image/png", width: 1, height: 1 });
    const pixels = await http.post("/api/v3/query/resource_preview").send({ versionId: "ver_preview_image", mode: "content", maxEdge: 256 });
    expect(pixels.body.content[0]).toMatchObject({ type: "image", mimeType: "image/jpeg" });
    expect(Buffer.from(pixels.body.content[0].data, "base64").subarray(0, 2).toString("hex")).toBe("ffd8");
    const rejected = await http.post("/api/v3/query/resource_preview").send({ versionId: "ver_preview_image", mode: "content", frames: 2 });
    expect(rejected.status).toBe(422);
    expect(rejected.body.error.code).toBe("UNSUPPORTED_QUERY");
    if (spawnSync("ffmpeg", ["-version"], { stdio: "ignore" }).status !== 0) return;
    const clip = path.join(ws, "preview.mp4");
    if (spawnSync("ffmpeg", ["-f", "lavfi", "-i", "color=c=blue:s=32x32:d=0.4", "-t", "0.4", "-pix_fmt", "yuv420p", "-y", clip], { stdio: "ignore" }).status !== 0) return;
    await http.post("/api/project/resources/commands").send({
      commandId: "preview-video",
      actor: "human",
      command: { type: "resource.create", resourceId: "res_preview_video", payload: { name: "preview.mp4", kind: 3 } },
    });
    await http.post("/api/project/resources/commands").send({
      commandId: "preview-video-version",
      actor: "human",
      command: {
        type: "resource.update",
        resourceId: "res_preview_video",
        payload: { kind: "new_version", versionId: "ver_preview_video", baseVersionId: null, relativePath: "preview.mp4", source: "import", disposition: "adopted", dependencies: [] },
      },
    });
    const video = await http.post("/api/v3/query/resource_preview").send({ versionId: "ver_preview_video", mode: "content", frames: 1, maxEdge: 256 });
    expect(video.status).toBe(200);
    expect(video.body.content).toHaveLength(1);
    expect(video.body.content[0]).toMatchObject({ type: "image", mimeType: "image/jpeg" });
    expect(video.body.reason).toBe("sampled_frames");
  });

  it("ensure 按类型和名字创建组合，同名再确保一次不再新建", async () => {
    const created = await http.post("/api/v3/composition/commands").set("x-tool-use-id", "ensure-1").send({ action: "ensure", label: "代理角色", name: "林晚", operations: [{ action: "add_member", clientMemberKey: "portrait", role: "portrait", resourceId: null }] });
    expect(created.status).toBe(200);
    expect(created.body.created).toBe(true);
    expect(created.body.memberIds.portrait).toEqual(expect.any(String));
    const replay = await http.post("/api/v3/composition/commands").set("x-tool-use-id", "ensure-1").send({ action: "ensure", label: "代理角色", name: "林晚", operations: [{ action: "add_member", clientMemberKey: "portrait", role: "portrait", resourceId: null }] });
    expect(replay.body).toEqual(created.body);
    const again = await http.post("/api/v3/composition/commands").set("x-tool-use-id", "ensure-2").send({ action: "ensure", label: "代理角色", name: "林晚" });
    expect(again.body.created).toBe(false);
    expect(again.body.compositionId).toBe(created.body.compositionId);
    const renamed = await http.post("/api/v3/composition/commands").set("x-tool-use-id", "rename-1").send({ action: "rename", compositionId: created.body.compositionId, expectedRevision: again.body.revision, name: "林晚晚" });
    expect(renamed.status).toBe(200);
    expect(renamed.body.revision).toBe(again.body.revision + 1);
    const stale = await http.post("/api/v3/composition/commands").set("x-tool-use-id", "rename-2").send({ action: "rename", compositionId: created.body.compositionId, expectedRevision: 1, name: "不会成功" });
    expect(stale.status).toBe(409);
    expect(stale.body.error.code).toBe("COMPOSITION_REVISION_CONFLICT");
  });
});
