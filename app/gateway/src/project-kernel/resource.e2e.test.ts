import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../bootstrap.js";

describe("项目资源", () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;

  beforeAll(async () => {
    const ws = mkdtempSync(path.join(tmpdir(), "ov-res-"));
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

  it("登记图片资源时从 missing 开始，重名加序号，同一命令可以重放", async () => {
    const created = await http.post("/api/project/resources/commands").send({
      commandId: "res-1",
      actor: "human",
      command: { type: "resource.create", resourceId: "res_photo", payload: { name: "photo.png", kind: 2 } },
    });
    expect(created.status).toBe(200);
    expect(created.body.committed).toBe(true);
    expect(created.body.result).toMatchObject({ resourceId: "res_photo", name: "photo.png", kind: 2, lifecycle: "missing", metadataRevision: 1 });
    expect(created.body.result.currentVersionId).toBeUndefined();
    const replay = await http.post("/api/project/resources/commands").send({
      commandId: "res-1",
      actor: "human",
      command: { type: "resource.create", resourceId: "res_photo", payload: { name: "photo.png", kind: 2 } },
    });
    expect(replay.body).toEqual(created.body);
    const second = await http.post("/api/project/resources/commands").send({
      commandId: "res-2",
      actor: "human",
      command: { type: "resource.create", resourceId: "res_photo_2", payload: { name: "photo.png", kind: 2 } },
    });
    expect(second.body.result.name).toBe("photo(1).png");
    const got = await http.post("/api/project/resources/get").send({ selectors: [{ resourceId: "res_photo" }] });
    expect(got.body[0].ok).toBe(true);
    expect(got.body[0].detail.version).toBeNull();
    const found = await http.post("/api/project/resources/search").send({ text: "photo" });
    expect(found.body.items.map((item: { name: string }) => item.name).sort()).toEqual(["photo(1).png", "photo.png"]);

    const ws = process.env.WORKSPACE_DIR ?? "";
    writeFileSync(path.join(ws, "photo.png"), "png");
    const version = await http.post("/api/project/resources/commands").send({
      commandId: "res-1-v",
      actor: "human",
      command: {
        type: "resource.update",
        resourceId: "res_photo",
        payload: { kind: "new_version", versionId: "ver_photo", baseVersionId: null, relativePath: "photo.png", source: "import", disposition: "adopted", dependencies: [] },
      },
    });
    expect(version.status).toBe(200);
    expect(version.body.result.resource.lifecycle).toBe("active");
    expect(version.body.result.resource.currentVersionId).toBe("ver_photo");
    expect(version.body.result.resource.metadataRevision).toBe(2);
    expect(version.body.result.version.relativePath).toBe("photo.png");
    const read = await http.post("/api/project/resources/get").send({ selectors: [{ resourceId: "res_photo" }] });
    expect(read.body[0].detail.version.status).toBe("ready");

    writeFileSync(path.join(ws, "photo-2.png"), "png2");
    const stale = await http.post("/api/project/resources/commands").send({
      commandId: "res-1-v2-stale",
      actor: "human",
      command: {
        type: "resource.update",
        resourceId: "res_photo",
        payload: { kind: "new_version", versionId: "ver_photo_stale", baseVersionId: null, relativePath: "photo-2.png", source: "import", disposition: "adopted", dependencies: [] },
      },
    });
    expect(stale.body.committed).toBe(false);
    expect(stale.body.conflict).toMatchObject({ kind: "resource_version", expectedVersionId: null, actualVersionId: "ver_photo" });
    const next = await http.post("/api/project/resources/commands").send({
      commandId: "res-1-v2",
      actor: "human",
      command: {
        type: "resource.update",
        resourceId: "res_photo",
        payload: { kind: "new_version", versionId: "ver_photo_2", baseVersionId: "ver_photo", relativePath: "photo-2.png", source: "import", disposition: "adopted", dependencies: [] },
      },
    });
    expect(next.status).toBe(200);
    expect(next.body.result.resource.currentVersionId).toBe("ver_photo_2");
    expect(next.body.result.resource.metadataRevision).toBe(2);
    expect(next.body.result.version.parentVersionId).toBe("ver_photo");

    const candidate = await http.post("/api/project/resources/commands").send({
      commandId: "res-2-candidate",
      actor: "human",
      command: {
        type: "resource.update",
        resourceId: "res_photo_2",
        payload: {
          kind: "new_version",
          versionId: "ver_photo_b",
          baseVersionId: null,
          relativePath: "photo-b.png",
          source: "import",
          disposition: "candidate",
          dependencies: [{ resourceId: "res_photo", versionId: "ver_photo_2", role: "reference", inputIndex: 0 }],
        },
      },
    });
    expect(candidate.status).toBe(400);
    writeFileSync(path.join(ws, "photo-b.png"), "b");
    const createdSecond = await http.post("/api/project/resources/commands").send({
      commandId: "res-2-v",
      actor: "human",
      command: {
        type: "resource.update",
        resourceId: "res_photo_2",
        payload: { kind: "new_version", versionId: "ver_b", baseVersionId: null, relativePath: "photo-b.png", source: "import", disposition: "adopted", dependencies: [] },
      },
    });
    expect(createdSecond.body.result.resource.currentVersionId).toBe("ver_b");
    writeFileSync(path.join(ws, "photo-c.png"), "c");
    const linked = await http.post("/api/project/resources/commands").send({
      commandId: "res-2-v2",
      actor: "human",
      command: {
        type: "resource.update",
        resourceId: "res_photo_2",
        payload: {
          kind: "new_version",
          versionId: "ver_c",
          baseVersionId: "ver_b",
          relativePath: "photo-c.png",
          source: "import",
          disposition: "candidate",
          dependencies: [{ resourceId: "res_photo", versionId: "ver_photo_2", role: "reference", inputIndex: 0 }],
        },
      },
    });
    expect(linked.status).toBe(200);
    expect(linked.body.result.resource.currentVersionId).toBe("ver_b");
    expect(linked.body.result.dependencies).toEqual([{ resourceId: "res_photo", versionId: "ver_photo_2", role: "reference", inputIndex: 0 }]);
    const readLinked = await http.post("/api/project/resources/get").send({ selectors: [{ resourceId: "res_photo_2", versionId: "ver_c" }] });
    expect(readLinked.body[0].detail.dependencies).toEqual([{ resourceId: "res_photo", versionId: "ver_photo_2", role: "reference", inputIndex: 0 }]);
  });

  it("改资料要带上一次读到的修订，文件还在时不能标成 missing", async () => {
    const ws = process.env.WORKSPACE_DIR ?? "";
    writeFileSync(path.join(ws, "note.txt"), "hello");
    const created = await http.post("/api/project/resources/commands").send({
      commandId: "res-note",
      actor: "human",
      command: { type: "resource.create", resourceId: "res_note", payload: { name: "note.txt", kind: 1 } },
    });
    expect(created.body.result.metadataRevision).toBe(1);
    const renamed = await http.post("/api/project/resources/commands").send({
      commandId: "res-note-name",
      actor: "agent",
      command: {
        type: "resource.update",
        resourceId: "res_note",
        payload: { kind: "metadata", expectedMetadataRevision: 1, changes: { name: "notes.txt", description: "草稿" } },
      },
    });
    expect(renamed.status).toBe(200);
    expect(renamed.body.result).toMatchObject({ name: "notes.txt", description: "草稿", metadataRevision: 2, lifecycle: "missing" });
    const stale = await http.post("/api/project/resources/commands").send({
      commandId: "res-note-stale",
      actor: "agent",
      command: { type: "resource.update", resourceId: "res_note", payload: { kind: "metadata", expectedMetadataRevision: 1, changes: { name: "other.txt" } } },
    });
    expect(stale.body.committed).toBe(false);
    expect(stale.body.conflict).toMatchObject({ kind: "resource_metadata_revision", expectedRevision: 1, actualRevision: 2 });
    const version = await http.post("/api/project/resources/commands").send({
      commandId: "res-note-v",
      actor: "human",
      command: {
        type: "resource.update",
        resourceId: "res_note",
        payload: { kind: "new_version", versionId: "ver_note", baseVersionId: null, relativePath: "note.txt", source: "import", disposition: "adopted", dependencies: [] },
      },
    });
    expect(version.body.result.resource.lifecycle).toBe("active");
    const blocked = await http.post("/api/project/resources/commands").send({
      commandId: "res-note-missing",
      actor: "human",
      command: { type: "resource.update", resourceId: "res_note", payload: { kind: "lifecycle", expectedMetadataRevision: version.body.result.resource.metadataRevision, lifecycle: "missing" } },
    });
    expect(blocked.status).toBe(409);
    expect(blocked.body.code).toBe("PROJECT_INVALID_LIFECYCLE");
    rmSync(path.join(ws, "note.txt"));
    const missing = await http.post("/api/project/resources/commands").send({
      commandId: "res-note-missing",
      actor: "human",
      command: { type: "resource.update", resourceId: "res_note", payload: { kind: "lifecycle", expectedMetadataRevision: version.body.result.resource.metadataRevision, lifecycle: "missing" } },
    });
    expect(missing.status).toBe(200);
    expect(missing.body.result.lifecycle).toBe("missing");
  });

  it("批量切换当前版本时，中间有冲突就整批撤销", async () => {
    const ws = process.env.WORKSPACE_DIR ?? "";
    writeFileSync(path.join(ws, "batch-a.png"), "a");
    writeFileSync(path.join(ws, "batch-b.png"), "b");
    await http.post("/api/project/resources/commands").send({
      commandId: "res-batch",
      actor: "human",
      command: { type: "resource.create", resourceId: "res_batch", payload: { name: "batch.png", kind: 2 } },
    });
    await http.post("/api/project/resources/commands").send({
      commandId: "res-batch-v1",
      actor: "human",
      command: {
        type: "resource.update",
        resourceId: "res_batch",
        payload: { kind: "new_version", versionId: "ver_batch_a", baseVersionId: null, relativePath: "batch-a.png", source: "import", disposition: "adopted", dependencies: [] },
      },
    });
    await http.post("/api/project/resources/commands").send({
      commandId: "res-batch-v2",
      actor: "human",
      command: {
        type: "resource.update",
        resourceId: "res_batch",
        payload: { kind: "new_version", versionId: "ver_batch_b", baseVersionId: "ver_batch_a", relativePath: "batch-b.png", source: "import", disposition: "candidate", dependencies: [] },
      },
    });
    const conflicted = {
      commandId: "res-batch-switch",
      actor: "agent",
      commands: [
        { type: "resource.update", resourceId: "res_batch", payload: { kind: "metadata", expectedMetadataRevision: 2, changes: { name: "renamed.png" } } },
        { type: "resource.update", resourceId: "res_batch", payload: { kind: "current_version", versionId: "ver_batch_b", expectedCurrentVersionId: "ver_missing" } },
      ],
    };
    const rejected = await http.post("/api/project/resources/commands/batch").send(conflicted);
    expect(rejected.status).toBe(200);
    expect(rejected.body.committed).toBe(false);
    expect(rejected.body.index).toBe(1);
    expect(rejected.body.conflict).toMatchObject({ kind: "resource_version", expectedVersionId: "ver_missing", actualVersionId: "ver_batch_a" });
    const replay = await http.post("/api/project/resources/commands/batch").send(conflicted);
    expect(replay.body).toEqual(rejected.body);
    const unchanged = await http.post("/api/project/resources/get").send({ selectors: [{ resourceId: "res_batch" }] });
    expect(unchanged.body[0].detail.resource).toMatchObject({ name: "batch.png", currentVersionId: "ver_batch_a" });
    const switched = await http.post("/api/project/resources/commands/batch").send({
      commandId: "res-batch-switch-ok",
      actor: "agent",
      commands: [
        { type: "resource.update", resourceId: "res_batch", payload: { kind: "metadata", expectedMetadataRevision: 2, changes: { name: "renamed.png" } } },
        { type: "resource.update", resourceId: "res_batch", payload: { kind: "current_version", versionId: "ver_batch_b", expectedCurrentVersionId: "ver_batch_a" } },
      ],
    });
    expect(switched.body.committed).toBe(true);
    expect(switched.body.results[1].resource).toMatchObject({ name: "renamed.png", currentVersionId: "ver_batch_b", metadataRevision: 3 });
    const wrongKind = await http.post("/api/project/resources/commands/batch").send({
      commandId: "res-batch-new",
      actor: "agent",
      commands: [{ type: "resource.update", resourceId: "res_batch", payload: { kind: "new_version" } }],
    });
    expect(wrongKind.status).toBe(400);
    expect(wrongKind.body.code).toBe("PROJECT_INVALID_COMMAND");
  });

  it("标签从七个预设颜色开始，写错修订或一次贴两个颜色都会被拒绝", async () => {
    const initial = await http.post("/api/project/resources/tags/get").send({});
    expect(initial.status).toBe(200);
    expect(initial.body.revision).toBe(0);
    expect(initial.body.registry.tags).toHaveLength(7);
    expect(initial.body.assignments).toEqual([]);
    const assigned = await http.post("/api/project/resources/tags/commands").send({
      commandId: "tag-1",
      expectedRevision: 0,
      assignments: [{ resourceId: "res_photo", tagIds: ["color:red"] }],
    });
    expect(assigned.status).toBe(200);
    expect(assigned.body.committed).toBe(true);
    expect(assigned.body.snapshot.revision).toBe(1);
    expect(assigned.body.snapshot.assignments).toEqual([{ resourceId: "res_photo", tagIds: ["color:red"] }]);
    const conflict = await http.post("/api/project/resources/tags/commands").send({
      commandId: "tag-2",
      expectedRevision: 0,
      assignments: [{ resourceId: "res_photo", tagIds: ["color:blue"] }],
    });
    expect(conflict.body.committed).toBe(false);
    expect(conflict.body.snapshot.revision).toBe(1);
    const twoColors = await http.post("/api/project/resources/tags/commands").send({
      commandId: "tag-3",
      expectedRevision: 1,
      assignments: [{ resourceId: "res_photo", tagIds: ["color:red", "color:blue"] }],
    });
    expect(twoColors.status).toBe(400);
    expect(twoColors.body.code).toBe("PROJECT_INVALID_COMMAND");
    const missing = await http.post("/api/project/resources/tags/commands").send({
      commandId: "tag-4",
      expectedRevision: 1,
      assignments: [{ resourceId: "res_missing", tagIds: ["color:red"] }],
    });
    expect(missing.status).toBe(404);
    expect(missing.body.code).toBe("PROJECT_RESOURCE_NOT_FOUND");
    const again = await http.post("/api/project/resources/tags/get").send({});
    expect(again.body.revision).toBe(1);
    expect(again.body.assignments).toEqual([{ resourceId: "res_photo", tagIds: ["color:red"] }]);
  });

  it("不能删当前版本或画布还在用的版本，删资源要对上修订号", async () => {
    const ws = process.env.WORKSPACE_DIR ?? "";
    writeFileSync(path.join(ws, "del-a.png"), "a");
    writeFileSync(path.join(ws, "del-b.png"), "b");
    await http.post("/api/project/resources/commands").send({
      commandId: "del-create",
      actor: "human",
      command: { type: "resource.create", resourceId: "res_del", payload: { name: "del.png", kind: 2 } },
    });
    await http.post("/api/project/resources/commands").send({
      commandId: "del-v1",
      actor: "human",
      command: {
        type: "resource.update",
        resourceId: "res_del",
        payload: { kind: "new_version", versionId: "ver_del_a", baseVersionId: null, relativePath: "del-a.png", source: "import", disposition: "adopted", dependencies: [] },
      },
    });
    await http.post("/api/project/resources/commands").send({
      commandId: "del-v2",
      actor: "human",
      command: {
        type: "resource.update",
        resourceId: "res_del",
        payload: { kind: "new_version", versionId: "ver_del_b", baseVersionId: "ver_del_a", relativePath: "del-b.png", source: "import", disposition: "adopted", dependencies: [] },
      },
    });
    const current = await http.post("/api/project/resources/commands").send({
      commandId: "del-current",
      actor: "human",
      command: { type: "resource.delete", resourceId: "res_del", payload: { target: "version", versionId: "ver_del_b" } },
    });
    expect(current.status).toBe(409);
    expect(current.body.code).toBe("PROJECT_CURRENT_VERSION_DELETE_FORBIDDEN");

    const composition = await http.post("/api/project/compositions/commands").send({
      commandId: "del-cmp",
      actor: "human",
      command: { type: "composition.create", compositionType: null, name: "删除用" },
    });
    await http.post("/api/project/compositions/commands").send({
      commandId: "del-member",
      actor: "human",
      expectedRevision: 1,
      command: { type: "composition.apply", compositionId: composition.body.compositionId, operations: [{ type: "member.add", member: { memberId: "mem-del", role: "image", resource: "res_del" } }] },
    });
    const base = { parentId: null, position: { x: 0, y: 0 }, size: { width: 200, height: 120 }, zIndex: 1, hidden: false };
    const placed = await http.post("/api/v3/canvas/commands").send({
      commandId: "del-place",
      expectedRevision: 0,
      command: {
        type: "canvas.patch",
        nodes: [{ id: "del-node", before: null, after: { ...base, id: "del-node", kind: "composition", compositionId: composition.body.compositionId, activeItem: { type: "version", resourceId: "res_del", versionId: "ver_del_a" }, draft: null } }],
        edges: [],
      },
    });
    expect(placed.status).toBe(200);
    const held = await http.post("/api/project/resources/commands").send({
      commandId: "del-held",
      actor: "human",
      command: { type: "resource.delete", resourceId: "res_del", payload: { target: "version", versionId: "ver_del_a" } },
    });
    expect(held.status).toBe(409);
    expect(held.body.code).toBe("PROJECT_INVALID_LIFECYCLE");
    await http.post("/api/v3/canvas/commands").send({
      commandId: "del-clear",
      expectedRevision: 1,
      command: {
        type: "canvas.patch",
        nodes: [{ id: "del-node", before: placed.body.document.nodes["del-node"], after: { ...placed.body.document.nodes["del-node"], activeItem: null } }],
        edges: [],
      },
    });
    const dropped = await http.post("/api/project/resources/commands").send({
      commandId: "del-old",
      actor: "human",
      command: { type: "resource.delete", resourceId: "res_del", payload: { target: "version", versionId: "ver_del_a" } },
    });
    expect(dropped.status).toBe(200);
    expect(dropped.body.committed).toBe(true);

    const stale = await http.post("/api/project/resources/commands").send({
      commandId: "del-stale",
      actor: "human",
      command: { type: "resource.delete", resourceId: "res_del", payload: { target: "resource", expectedMetadataRevision: 1, expectedCurrentVersionId: "ver_del_b" } },
    });
    expect(stale.body.committed).toBe(false);
    expect(stale.body.conflict.kind).toBe("resource_metadata_revision");
    const removed = await http.post("/api/project/resources/commands").send({
      commandId: "del-resource",
      actor: "human",
      command: { type: "resource.delete", resourceId: "res_del", payload: { target: "resource", expectedMetadataRevision: 2, expectedCurrentVersionId: "ver_del_b" } },
    });
    expect(removed.body.committed).toBe(true);
    const got = await http.post("/api/project/resources/get").send({ selectors: [{ resourceId: "res_del" }] });
    expect(got.body[0].detail.resource).toMatchObject({ lifecycle: "deleted", metadataRevision: 3, currentVersionId: "ver_del_b" });
    const found = await http.post("/api/project/resources/search").send({ text: "del.png" });
    expect(found.body.items.map((item: { resourceId: string }) => item.resourceId)).not.toContain("res_del");
  });

  it("复制资源时在旁边写新文件，并记下源版本", async () => {
    const ws = process.env.WORKSPACE_DIR ?? "";
    writeFileSync(path.join(ws, "orig.png"), "original-bytes");
    await http.post("/api/project/resources/commands").send({
      commandId: "copy-create",
      actor: "human",
      command: { type: "resource.create", resourceId: "res_orig", payload: { name: "orig.png", kind: 2 } },
    });
    await http.post("/api/project/resources/commands").send({
      commandId: "copy-version",
      actor: "human",
      command: {
        type: "resource.update",
        resourceId: "res_orig",
        payload: { kind: "new_version", versionId: "ver_orig", baseVersionId: null, relativePath: "orig.png", source: "import", disposition: "adopted", dependencies: [] },
      },
    });
    const copied = await http.post("/api/project/resources/commands").send({
      commandId: "copy-1",
      actor: "human",
      command: {
        type: "resource.copy",
        resourceId: "res_clone",
        payload: { sourceResourceId: "res_orig", sourceVersionId: "ver_orig", versionId: "ver_clone", name: "clone.png" },
      },
    });
    expect(copied.status).toBe(200);
    expect(copied.body.committed).toBe(true);
    expect(copied.body.result.resource).toMatchObject({ resourceId: "res_clone", name: "clone.png", kind: 2, lifecycle: "active", currentVersionId: "ver_clone", metadataRevision: 1 });
    expect(copied.body.result.version).toMatchObject({ relativePath: "orig_copy.png", source: "copy", status: "ready", parentVersionId: null });
    expect(copied.body.result.dependencies).toEqual([{ resourceId: "res_orig", versionId: "ver_orig", role: "source" }]);
    expect(readFileSync(path.join(ws, "orig_copy.png"), "utf8")).toBe("original-bytes");
    const replay = await http.post("/api/project/resources/commands").send({
      commandId: "copy-1",
      actor: "human",
      command: {
        type: "resource.copy",
        resourceId: "res_clone",
        payload: { sourceResourceId: "res_orig", sourceVersionId: "ver_orig", versionId: "ver_clone", name: "clone.png" },
      },
    });
    expect(replay.body).toEqual(copied.body);
  });
});
