import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../bootstrap.js";
import { HOME_SHOWCASE_ASSET_FILES } from "./home-showcase.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");

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
    // 已装技能直接指到仓库自带的那批：首页示例绑定的技能必须在里面。
    process.env.HUB_SKILLS_DIR = path.join(REPO, "assets/skills");
    app = await createApp();
    await app.init();
    http = request(app.getHttpServer());
  });
  afterAll(async () => {
    await app.close();
    delete process.env.WORKSPACE_DIR;
    delete process.env.HILO_DATA_DIR;
    delete process.env.HUB_SKILLS_DIR;
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

  it("首页快速开始：按渲染层解析规则逐条校验，四个场景和精选技能分区都能解析出来", async () => {
    const r = await http.get(`/api/v1/home/quick_start_config?config_version=2&${COMMON}`);
    expect(r.status).toBe(200);
    const cfg = r.body;
    // 整份配置：版本号、开关、分区数、序列化后的大小（渲染层超过 1MB 整份丢弃）。
    expect(cfg.schema_version).toBe(2);
    expect(cfg.enabled).toBe(true);
    expect(cfg.sections.length).toBeLessThanOrEqual(16);
    expect(Buffer.byteLength(JSON.stringify(cfg))).toBeLessThan(1_000_000);

    const scenes = cfg.sections.filter((s: any) => s.type === "prompt");
    expect(scenes.map((s: any) => s.id)).toEqual(["film", "short-drama", "ecommerce", "graphic-design"]);
    expect(scenes.map((s: any) => s.title)).toEqual([
      { zh: "影视", en: "Film" },
      { zh: "短剧", en: "Short Drama" },
      { zh: "电商带货", en: "E-commerce" },
      { zh: "平面设计", en: "Graphic Design" },
    ]);
    expect(scenes[0].items.map((i: any) => i.id)).toEqual(["character-storyboard", "episode-script", "character-cards"]);
    expect(scenes[2].items.map((i: any) => i.id)).toEqual(["product-listing", "batch-recolor", "promo-video"]);
    expect(scenes[3].items.map((i: any) => i.id)).toEqual(["image-remix", "anime-style", "nine-panel-comic"]);

    let total = 0;
    for (const s of scenes) {
      expectIdentifier(s.id);
      expectLocalized(s.title);
      expect(["film", "palette", "shopping-bag"]).toContain(s.icon);
      expect(s.min_client_version).toBeUndefined();
      // 一个示例都解析不出来的分区会被整个丢掉；分区内 id 重复的只留第一条。
      expect(s.items.length).toBeGreaterThan(0);
      expect(s.items.length).toBeLessThanOrEqual(64);
      expect(new Set(s.items.map((i: any) => i.id)).size).toBe(s.items.length);
      total += s.items.length;
      for (const it of s.items) {
        expectIdentifier(it.id);
        expectLocalized(it.title);
        expectLocalized(it.prompt);
        expectLocalized(it.description);
        if (it.skill !== undefined) expectIdentifier(it.skill);
        if (it.media !== undefined) expect(["image", "video", "audio", "document"]).toContain(it.media);
        expect(it.attachments.length).toBeLessThanOrEqual(14);
        for (const a of it.attachments) {
          expect(["image", "video", "audio", "pdf", "folder", "file"]).toContain(a.type);
          expect(a.name.trim()).toBe(a.name);
          expect(a.aliases.every((x: unknown) => typeof x === "string" && x.trim().length > 0)).toBe(true);
        }
        // 提示词里不再带 `/技能名` 前缀，也不再叫 agent「按技能流程」——绑定的技能已经去掉了。
        for (const text of [it.prompt.zh, it.prompt.en]) {
          expect(text.startsWith("/")).toBe(false);
          expect(text).not.toMatch(/skill/i);
        }
      }
    }
    expect(total).toBeLessThanOrEqual(256);

    const featured = cfg.sections.filter((s: any) => s.type === "skill");
    expect(featured).toHaveLength(1);
    expect(featured[0]).toMatchObject({ id: "official-featured", source: "official-featured" });
    expect(featured[0].items.length).toBeGreaterThan(0);
    for (const it of featured[0].items) {
      expectIdentifier(it.skill);
      expectLocalized(it.prompt);
      expectLocalized(it.tag);
    }
  });

  it("首页示例素材：配置里的每个地址都能从静态路由取到，内容和仓库里的文件一致", async () => {
    const cfg = (await http.get("/api/v1/home/quick_start_config?config_version=2")).body;
    const urls = new Set<string>();
    for (const s of cfg.sections.filter((x: any) => x.type === "prompt")) {
      for (const it of s.items) {
        if (it.cover) urls.add(it.cover);
        for (const a of it.attachments) urls.add(a.url);
      }
    }
    expect(urls.size).toBeGreaterThan(0);
    for (const url of urls) {
      // 相对路径、只走示例素材路由：渲染层只按这个前缀、以当前 gateway 为基准补全。
      expect(url).toMatch(/^\/api\/v1\/home\/showcase-assets\/[^/]+$/);
      const name = decodeURIComponent(url.split("/").pop()!);
      const r = await http.get(url).buffer(true);
      expect(r.status, url).toBe(200);
      expect(r.headers["content-type"]).toBe("image/png");
      expect(Buffer.compare(r.body, readFileSync(path.join(REPO, "assets/home-showcase", name)))).toBe(0);
    }
    // 登记过的文件都在，包括没有示例引用的使用教程 PDF。
    for (const name of HOME_SHOWCASE_ASSET_FILES) {
      const r = await http.get(`/api/v1/home/showcase-assets/${encodeURIComponent(name)}`);
      expect(r.status, name).toBe(200);
    }
    expect((await http.get("/api/v1/home/showcase-assets/nope.png")).status).toBe(404);
    expect((await http.get(`/api/v1/home/showcase-assets/${encodeURIComponent("../../package.json")}`)).status).toBe(404);
    expect((await http.get(`/api/v1/home/showcase-assets/..%2Fskills`)).status).toBe(404);
  });

  it("首页示例绑定的技能都是自带的：渲染层找不到技能会去云端市场装，装不上整个示例就填不进去", async () => {
    const cfg = (await http.get("/api/v1/home/quick_start_config?config_version=2")).body;
    const wanted = new Set<string>();
    for (const s of cfg.sections) {
      for (const it of s.items) if (it.skill) wanted.add(it.skill);
    }
    expect(wanted.size).toBeGreaterThan(0);
    const local = await http.get("/api/skills");
    const names = new Set((local.body.skills ?? local.body).map((x: any) => x.name));
    for (const name of wanted) expect(names.has(name), name).toBe(true);
    // 精选技能分区的预置提示词只对精选来源里的技能生效。
    const featured = (await http.get("/api/skills/market?source=official-featured&page_size=100")).body.skills.map((x: any) => x.name);
    for (const it of cfg.sections.find((s: any) => s.type === "skill").items) expect(featured).toContain(it.skill);
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

// 渲染层配置里的 id / 技能名规则：小写字母数字开头，只含小写字母数字和 . _ -，最长 128。
function expectIdentifier(v: unknown) {
  expect(v).toMatch(/^[a-z0-9][a-z0-9._-]{0,127}$/);
}

// 中英文都要有、去掉首尾空白后不能为空（缺一边时渲染层拿另一边顶上，这里要求两边都写全）。
function expectLocalized(v: any) {
  expect(typeof v?.zh === "string" && v.zh.trim().length > 0).toBe(true);
  expect(typeof v?.en === "string" && v.en.trim().length > 0).toBe(true);
}
