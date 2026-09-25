import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../bootstrap.js";

// 渲染层给每个请求挂的公共参数，路由必须当它们不存在。
const COMMON = "device_platform=desktop&app_id=3001&version_code=3.0.16&biz_id=0&unix=1790348478040&os_name=macOS";

describe("云端配置类路由的本地默认值", () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;
  let root = "";

  beforeAll(async () => {
    root = mkdtempSync(path.join(tmpdir(), "ov-cloud-config-e2e-"));
    process.env.WORKSPACE_DIR = root;
    process.env.HILO_DATA_DIR = path.join(root, "hub");
    app = await createApp();
    await app.init();
    http = request(app.getHttpServer());
  });
  afterAll(async () => {
    await app.close();
    delete process.env.WORKSPACE_DIR;
    delete process.env.HILO_DATA_DIR;
    rmSync(root, { recursive: true, force: true });
  });

  it("client_config / hub client_config：空对象，渲染层每一项都走默认", async () => {
    expect((await http.get(`/api/v1/client_config?${COMMON}`)).body).toEqual({});
    expect((await http.get(`/api/v1/hub/client_config?${COMMON}`)).body).toEqual({});
  });

  it("Apollo：认识的 key 回渲染层能解析的配置，不认识的 404", async () => {
    let r = await http.get(`/api/v1/apollo/config?key=tool_call_display_config&${COMMON}`);
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ displayLabels: {}, labelIds: {} });

    r = await http.get(`/api/v1/apollo/config?key=home_tabs_showcase_config&${COMMON}`);
    expect(r.body).toMatchObject({ schema_version: 1, enabled: true, default_primary_id: "inspiration" });
    const skillTab = r.body.primary_categories.find((c: any) => c.id === "skill");
    expect(skillTab.provider).toMatchObject({ type: "skill-market", source: "official-featured" });

    r = await http.get("/api/v1/apollo/config?key=home_skill_showcase_config");
    expect(r.body.secondary_categories).toEqual([{ id: "all", title: { zh: "全部", en: "All" }, query: { source: "official-featured" } }]);
    expect((await http.get("/api/v1/apollo/config?key=home_project_showcase_config")).body).toEqual({ schema_version: 1, enabled: true, sections: [] });
    expect((await http.get("/api/v1/apollo/config?key=hub_entries")).body).toEqual({});
    expect((await http.get("/api/v1/apollo/config?key=no_such_key")).status).toBe(404);
  });

  it("首页快速开始：v2、启用、没有分区", async () => {
    const r = await http.get(`/api/v1/home/quick_start_config?config_version=2&${COMMON}`);
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ schema_version: 2, enabled: true, sections: [] });
  });

  it("弹窗 / 计费活动 / 视频试用：「不弹」「没有活动」「不可领」", async () => {
    expect((await http.get(`/api/v1/popup?${COMMON}`)).body).toEqual({
      announcements: [],
      popup_type: 0,
      id: "",
      title: "",
      description: "",
      can_close: true,
      mute_range_time: 0,
      cover_url: "",
      video_url: "",
      banner_text: "",
    });
    expect((await http.get(`/api/v1/billing/promotion?${COMMON}`)).body).toEqual({ promotion: null, models: [] });
    const empty = { claimed: false, claimable: false, freeCount: 0, remainingCount: 0, claimHint: "", activityActive: false };
    expect((await http.get(`/api/v1/promotions/hailuo03-video-trial/status?${COMMON}`)).body).toEqual(empty);
    const claim = await http.post("/api/v1/promotions/hailuo03-video-trial/claim");
    expect(claim.status).toBe(201);
    expect(claim.body).toEqual(empty);
  });

  it("积分钱包、计费价格、团队协议、团队列表：不计费、团队功能暂不可用", async () => {
    expect((await http.get(`/api/v1/credit/wallet?${COMMON}`)).body).toEqual({ wallets: [], migrate_end_time: 0 });
    expect((await http.get(`/api/v1/billing/pricing?${COMMON}`)).body).toEqual({ enabled: false });
    const contract = (await http.get(`/api/v1/team/contract?client_version=3.0.16&${COMMON}`)).body;
    // 渲染层逐字段严格校验：兼容性只认三个值，limits 三个字段都要是整数
    expect(contract.compatibility).toBe("TEMPORARILY_UNAVAILABLE");
    expect(Object.values(contract.gates).every((v) => v === false)).toBe(true);
    for (const k of ["max_groups_including_personal", "max_members_per_team", "max_member_page_size"]) expect(Number.isSafeInteger(contract.limits[k])).toBe(true);
    expect((await http.get(`/backend/group/list?biz_line=4&${COMMON}`)).body).toEqual({ groups: [], user_group_roles: {} });
  });

  it("插件、ComfyUI 工作流：空列表", async () => {
    expect((await http.get(`/api/plugins?${COMMON}`)).body).toEqual({ plugins: [] });
    expect((await http.get(`/api/comfyui/workflows?${COMMON}`)).body).toEqual({ workflows: [] });
    expect((await http.get("/api/comfyui/featured-workflows?locale=zh")).body).toEqual({ workflows: [], total: 0 });
  });

  it("资产中心：库还没建时列表为空、未初始化；参数写错 400", async () => {
    expect((await http.get(`/api/asset-center/entities?${COMMON}`)).body).toEqual({ entities: [] });
    expect((await http.get("/api/asset-center/entities?type=character&limit=5&sort=use_count")).body).toEqual({ entities: [] });
    expect((await http.get("/api/asset-center/library-status")).body).toEqual({ initialized: false });
    expect((await http.get("/api/asset-center/entities?type=monster")).status).toBe(400);
    expect((await http.get("/api/asset-center/entities?limit=0")).status).toBe(400);
    expect((await http.get("/api/asset-center/entities?sort=random")).status).toBe(400);
    expect((await http.get(`/api/asset-center/workspace-refs?workspace=${encodeURIComponent(root)}`)).body).toEqual({ refs: [] });
    expect((await http.get("/api/asset-center/workspace-refs?workspace=relative")).status).toBe(400);
  });
});
