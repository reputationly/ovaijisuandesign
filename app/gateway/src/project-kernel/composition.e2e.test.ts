import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../bootstrap.js";

describe("项目组合", () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;

  beforeAll(async () => {
    const ws = mkdtempSync(path.join(tmpdir(), "ov-comp-"));
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

  it("登记类型、创建组合、重放同一命令，重名返回冲突", async () => {
    const type = await http.post("/api/project/compositions/commands").send({
      commandId: "type-1",
      actor: "human",
      command: { type: "composition_type.register", label: "角色" },
    });
    expect(type.status).toBe(200);
    expect(type.body.committed).toBe(true);
    const created = await http.post("/api/project/compositions/commands").send({
      commandId: "cmp-1",
      actor: "human",
      command: { type: "composition.create", compositionType: type.body.typeId, name: "苏晚" },
    });
    expect(created.status).toBe(200);
    expect(created.body.committed).toBe(true);
    expect(created.body.revision).toBe(1);
    const replay = await http.post("/api/project/compositions/commands").send({
      commandId: "cmp-1",
      actor: "human",
      command: { type: "composition.create", compositionType: type.body.typeId, name: "苏晚" },
    });
    expect(replay.body).toEqual(created.body);
    const again = await http.post("/api/project/compositions/commands").send({
      commandId: "cmp-2",
      actor: "human",
      command: { type: "composition.create", compositionType: type.body.typeId, name: "苏晚" },
    });
    expect(again.status).toBe(409);
    expect(again.body.code).toBe("COMPOSITION_NAME_CONFLICT");
    const got = await http.post("/api/project/compositions/get").send({ compositionId: created.body.compositionId });
    expect(got.status).toBe(200);
    expect(got.body.name).toBe("苏晚");
    expect(got.body.type.label).toBe("角色");
    const listed = await http.post("/api/project/compositions/list").send({});
    expect(listed.body.items.map((item: { name: string }) => item.name)).toEqual(["苏晚"]);

    const withMember = await http.post("/api/project/compositions/commands").send({
      commandId: "cmp-1-member",
      actor: "human",
      expectedRevision: 1,
      command: {
        type: "composition.apply",
        compositionId: created.body.compositionId,
        operations: [{ type: "member.add", member: { memberId: "mem-1", role: "portrait", resource: "res-1" } }],
      },
    });
    expect(withMember.status).toBe(200);
    expect(withMember.body.revision).toBe(2);
    const members = await http.post("/api/project/compositions/get").send({ compositionId: created.body.compositionId });
    expect(members.body.members).toEqual([{ memberId: "mem-1", role: "portrait", resource: "res-1" }]);
    const moved = await http.post("/api/project/compositions/commands").send({
      commandId: "cmp-1-move",
      actor: "human",
      expectedRevision: 2,
      command: {
        type: "composition.apply",
        compositionId: created.body.compositionId,
        operations: [
          { type: "member.add", member: { memberId: "mem-2", role: "alt", resource: null } },
          { type: "member.move", memberId: "mem-2", beforeMemberId: "mem-1" },
        ],
      },
    });
    expect(moved.status).toBe(200);
    const ordered = await http.post("/api/project/compositions/get").send({ compositionId: created.body.compositionId });
    expect(ordered.body.members.map((member: { memberId: string }) => member.memberId)).toEqual(["mem-2", "mem-1"]);
  });

  it("移动组合不抬修订号，占用的位置要换安放", async () => {
    const type = await http.post("/api/project/compositions/commands").send({
      commandId: "order-type",
      actor: "human",
      command: { type: "composition_type.register", label: "排序" },
    });
    const first = await http.post("/api/project/compositions/commands").send({
      commandId: "order-a",
      actor: "human",
      command: { type: "composition.create", compositionType: type.body.typeId, name: "甲" },
    });
    const second = await http.post("/api/project/compositions/commands").send({
      commandId: "order-b",
      actor: "human",
      command: { type: "composition.create", compositionType: type.body.typeId, name: "乙" },
    });
    const moved = await http.post("/api/project/compositions/commands").send({
      commandId: "order-a-pos",
      actor: "human",
      command: { type: "composition.move", compositionId: first.body.compositionId, position: 10 },
    });
    expect(moved.status).toBe(200);
    expect(moved.body).toMatchObject({ committed: true, revision: 1, position: 10 });
    expect(moved.body.renumbered).toBeUndefined();
    const taken = await http.post("/api/project/compositions/commands").send({
      commandId: "order-b-pos",
      actor: "human",
      command: { type: "composition.move", compositionId: second.body.compositionId, position: 10 },
    });
    expect(taken.status).toBe(409);
    expect(taken.body.code).toBe("COMPOSITION_POSITION_CONFLICT");
    const placed = await http.post("/api/project/compositions/commands").send({
      commandId: "order-b-after",
      actor: "human",
      command: { type: "composition.move", compositionId: second.body.compositionId, placement: { after: first.body.compositionId } },
    });
    expect(placed.status).toBe(200);
    expect(placed.body.position).toBe(20);
    expect(placed.body.revision).toBe(1);
    const replay = await http.post("/api/project/compositions/commands").send({
      commandId: "order-b-after",
      actor: "human",
      command: { type: "composition.move", compositionId: second.body.compositionId, placement: { after: first.body.compositionId } },
    });
    expect(replay.body).toEqual(placed.body);
    const self = await http.post("/api/project/compositions/commands").send({
      commandId: "order-a-self",
      actor: "human",
      command: { type: "composition.move", compositionId: first.body.compositionId, placement: { before: first.body.compositionId } },
    });
    expect(self.status).toBe(409);
    expect(self.body.code).toBe("COMPOSITION_PLACEMENT_INVALID");
  });

  it("换类型时避开目标类型里已经占用的位置，取消分类则清空位置", async () => {
    const alpha = await http.post("/api/project/compositions/commands").send({
      commandId: "type-alpha",
      actor: "human",
      command: { type: "composition_type.register", label: "甲类" },
    });
    const beta = await http.post("/api/project/compositions/commands").send({
      commandId: "type-beta",
      actor: "human",
      command: { type: "composition_type.register", label: "乙类" },
    });
    const moving = await http.post("/api/project/compositions/commands").send({
      commandId: "type-move",
      actor: "human",
      command: { type: "composition.create", compositionType: alpha.body.typeId, name: "迁移" },
    });
    const occupant = await http.post("/api/project/compositions/commands").send({
      commandId: "type-stay",
      actor: "human",
      command: { type: "composition.create", compositionType: beta.body.typeId, name: "原位" },
    });
    await http.post("/api/project/compositions/commands").send({
      commandId: "type-move-pos",
      actor: "human",
      command: { type: "composition.move", compositionId: moving.body.compositionId, position: 10 },
    });
    await http.post("/api/project/compositions/commands").send({
      commandId: "type-stay-pos",
      actor: "human",
      command: { type: "composition.move", compositionId: occupant.body.compositionId, position: 10 },
    });
    const changed = await http.post("/api/project/compositions/commands").send({
      commandId: "type-set",
      actor: "human",
      expectedRevision: 1,
      command: { type: "composition.set_type", compositionId: moving.body.compositionId, compositionType: beta.body.typeId },
    });
    expect(changed.status).toBe(200);
    expect(changed.body.revision).toBe(2);
    const got = await http.post("/api/project/compositions/get").send({ compositionId: moving.body.compositionId });
    expect(got.body.type.typeId).toBe(beta.body.typeId);
    expect(got.body.position).toBe(11);
    const unnamed = await http.post("/api/project/compositions/commands").send({
      commandId: "type-clear",
      actor: "human",
      expectedRevision: 2,
      command: { type: "composition.set_type", compositionId: moving.body.compositionId, compositionType: null },
    });
    expect(unnamed.status).toBe(200);
    const cleared = await http.post("/api/project/compositions/get").send({ compositionId: moving.body.compositionId });
    expect(cleared.body.type).toBeNull();
    expect(cleared.body.position).toBeNull();
  });

  it("恢复时如果原位置已被占用，就改到后面的空位", async () => {
    const type = await http.post("/api/project/compositions/commands").send({
      commandId: "restore-type",
      actor: "human",
      command: { type: "composition_type.register", label: "恢复" },
    });
    const hidden = await http.post("/api/project/compositions/commands").send({
      commandId: "restore-hidden",
      actor: "human",
      command: { type: "composition.create", compositionType: type.body.typeId, name: "先占" },
    });
    const visible = await http.post("/api/project/compositions/commands").send({
      commandId: "restore-visible",
      actor: "human",
      command: { type: "composition.create", compositionType: type.body.typeId, name: "后占" },
    });
    await http.post("/api/project/compositions/commands").send({
      commandId: "restore-hidden-pos",
      actor: "human",
      command: { type: "composition.move", compositionId: hidden.body.compositionId, position: 10 },
    });
    const deleted = await http.post("/api/project/compositions/commands").send({
      commandId: "restore-hide",
      actor: "human",
      expectedRevision: 1,
      command: { type: "composition.set_lifecycle", compositionId: hidden.body.compositionId, lifecycle: "deleted" },
    });
    expect(deleted.status).toBe(200);
    await http.post("/api/project/compositions/commands").send({
      commandId: "restore-visible-pos",
      actor: "human",
      command: { type: "composition.move", compositionId: visible.body.compositionId, position: 10 },
    });
    const restored = await http.post("/api/project/compositions/commands").send({
      commandId: "restore-back",
      actor: "human",
      expectedRevision: 2,
      command: { type: "composition.restore", compositionId: hidden.body.compositionId },
    });
    expect(restored.status).toBe(200);
    expect(restored.body.revision).toBe(3);
    const got = await http.post("/api/project/compositions/get").send({ compositionId: hidden.body.compositionId });
    expect(got.body.lifecycle).toBe("active");
    expect(got.body.position).toBe(11);
  });

  it("复制组合时复制成员文件，并排在源后面", async () => {
    const ws = process.env.WORKSPACE_DIR ?? "";
    writeFileSync(path.join(ws, "portrait.png"), "portrait-bytes");
    const type = await http.post("/api/project/compositions/commands").send({
      commandId: "dup-type",
      actor: "human",
      command: { type: "composition_type.register", label: "场景" },
    });
    await http.post("/api/project/resources/commands").send({
      commandId: "dup-resource",
      actor: "human",
      command: { type: "resource.create", resourceId: "res_portrait", payload: { name: "portrait.png", kind: 2 } },
    });
    await http.post("/api/project/resources/commands").send({
      commandId: "dup-version",
      actor: "human",
      command: {
        type: "resource.update",
        resourceId: "res_portrait",
        payload: { kind: "new_version", versionId: "ver_portrait", baseVersionId: null, relativePath: "portrait.png", source: "import", disposition: "adopted", dependencies: [] },
      },
    });
    const created = await http.post("/api/project/compositions/commands").send({
      commandId: "dup-source",
      actor: "human",
      command: { type: "composition.create", compositionType: type.body.typeId, name: "夜景" },
    });
    await http.post("/api/project/compositions/commands").send({
      commandId: "dup-members",
      actor: "human",
      expectedRevision: 1,
      command: {
        type: "composition.apply",
        compositionId: created.body.compositionId,
        operations: [
          { type: "member.add", member: { memberId: "mem-portrait", role: "portrait", resource: "res_portrait" } },
          { type: "member.add", member: { memberId: "mem-empty", role: "note", resource: null } },
        ],
      },
    });
    await http.post("/api/project/compositions/commands").send({
      commandId: "dup-attr",
      actor: "human",
      expectedRevision: 2,
      command: { type: "composition.set_attributes", compositionId: created.body.compositionId, set: [{ key: "tone", value: "冷" }], unset: [] },
    });
    await http.post("/api/project/compositions/commands").send({
      commandId: "dup-place",
      actor: "human",
      command: { type: "composition.move", compositionId: created.body.compositionId, position: 10 },
    });
    const copied = await http.post("/api/project/compositions/commands").send({
      commandId: "dup-1",
      actor: "human",
      command: { type: "composition.duplicate", sourceCompositionId: created.body.compositionId },
    });
    expect(copied.status).toBe(200);
    expect(copied.body.committed).toBe(true);
    expect(copied.body.revision).toBe(1);
    expect(copied.body.position).toBe(20);
    expect(copied.body.members).toHaveLength(2);
    expect(copied.body.members[1]).toMatchObject({ sourceMemberId: "mem-empty", sourceResource: null, resource: null, version: null });
    const copiedResource = copied.body.members[0].resource as string;
    expect(copiedResource).not.toBe("res_portrait");
    const got = await http.post("/api/project/compositions/get").send({ compositionId: copied.body.compositionId });
    expect(got.body).toMatchObject({ name: "夜景_1", position: 20, attributes: [{ key: "tone", value: "冷" }] });
    expect(got.body.members.map((member: { resource: string | null }) => member.resource)).toEqual([copiedResource, null]);
    const resource = await http.post("/api/project/resources/get").send({ selectors: [{ resourceId: copiedResource }] });
    expect(resource.body[0].detail.version.relativePath).toBe("portrait_copy.png");
    expect(resource.body[0].detail.dependencies).toEqual([{ resourceId: "res_portrait", versionId: "ver_portrait", role: "source" }]);
    expect(readFileSync(path.join(ws, "portrait_copy.png"), "utf8")).toBe("portrait-bytes");
    const replay = await http.post("/api/project/compositions/commands").send({
      commandId: "dup-1",
      actor: "human",
      command: { type: "composition.duplicate", sourceCompositionId: created.body.compositionId },
    });
    expect(replay.body).toEqual(copied.body);
    const stale = await http.post("/api/project/compositions/commands").send({
      commandId: "dup-stale",
      actor: "human",
      command: { type: "composition.duplicate", sourceCompositionId: created.body.compositionId, sourceRevision: 1 },
    });
    expect(stale.status).toBe(200);
    expect(stale.body.committed).toBe(false);
    expect(stale.body.conflict).toMatchObject({ kind: "composition_revision", expectedRevision: 1, actualRevision: 3, resolution: "retry" });
    const removed = await http.post("/api/project/compositions/commands").send({
      commandId: "dup-delete",
      actor: "human",
      expectedRevision: 3,
      command: { type: "composition.set_lifecycle", compositionId: created.body.compositionId, lifecycle: "deleted" },
    });
    expect(removed.status).toBe(200);
    const blocked = await http.post("/api/project/compositions/commands").send({
      commandId: "dup-deleted",
      actor: "human",
      command: { type: "composition.duplicate", sourceCompositionId: created.body.compositionId },
    });
    expect(blocked.status).toBe(409);
    expect(blocked.body.code).toBe("PROJECT_INVALID_LIFECYCLE");
  });
});
