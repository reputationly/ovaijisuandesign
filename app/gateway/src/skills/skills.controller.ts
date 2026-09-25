import path from "node:path";

import { BadRequestException, Body, Controller, Get, HttpCode, Param, Post, Query, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";

import { GatewayEventBus } from "../common/gateway-event-bus.js";
import { SkillImportService } from "./skill-import.service.js";
import { isValidSkillName } from "./skill-meta.js";
import { SkillsService } from "./skills.service.js";

interface NameBody {
  name?: string;
  skillType?: string;
}

// 技能包上传：只收技能包（.zip / .md）和打包里常见的媒体；别的扩展名 multer 直接丢掉，路由按「没收到文件」处理。
const SKILL_UPLOAD_EXTENSIONS = new Set([".zip", ".gz", ".md", ".png", ".jpg", ".jpeg", ".webp", ".gif", ".mp4", ".mov", ".webm"]);
const SKILL_UPLOAD_OPTIONS = {
  storage: memoryStorage(),
  limits: { fieldNestingDepth: 8, fieldArrayIndexLimit: 1000, fields: 64, files: 1, parts: 65, fieldNameSize: 256, fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req: unknown, file: { originalname: string }, cb: (err: Error | null, accept: boolean) => void) =>
    cb(null, SKILL_UPLOAD_EXTENSIONS.has(path.extname(file.originalname).toLowerCase())),
};

/**
 * 本地技能路由。技能市场、创作者计划（上传 / 投稿 / 审核）都要云端账号，不做，见 docs/parity-gaps.md。
 */
@Controller()
export class SkillsController {
  constructor(
    private readonly skills: SkillsService,
    private readonly imports: SkillImportService,
    private readonly bus: GatewayEventBus,
  ) {}

  @Get("api/skills")
  listSkills() {
    return this.skills.listSkills();
  }

  @Get("api/skills/runtime")
  listRuntimeSkills() {
    return this.skills.listRuntimeSkills();
  }

  @Post("api/skills/:name/toggle")
  @HttpCode(200)
  async toggleSkill(@Param("name") name: string, @Body() body: { enabled?: boolean }) {
    const skill = await this.skills.toggleSkill(name, !!body?.enabled);
    return { ok: true, skill, userOverrides: this.skills.getUserOverrides() };
  }

  /** 主进程在某个工作区改了开关后广播过来。 */
  @Post("api/skills/permissions")
  @HttpCode(200)
  setPermissions(@Body() body: { overrides?: Record<string, string> }) {
    const o = body?.overrides;
    this.skills.setUserOverrides(o && typeof o === "object" && !Array.isArray(o) ? o : {});
    return { ok: true };
  }

  @Get("api/skills/:name/files")
  getSkillFiles(@Param("name") name: string) {
    if (!isValidSkillName(name)) throw new BadRequestException("Invalid skill name");
    return this.skills.getSkillFiles(name);
  }

  @Get("api/skills/:name/file-content")
  getSkillFileContent(@Param("name") name: string, @Query("path") filePath?: string) {
    if (!isValidSkillName(name)) throw new BadRequestException("Invalid skill name");
    if (!filePath) throw new BadRequestException("path query parameter is required");
    return this.skills.getSkillFileContent(name, filePath);
  }

  /** 通知渲染层技能有变（主进程发现有技能没被 opencode 加载时调）。 */
  @Post("api/skills/reload")
  @HttpCode(200)
  reloadSkills(@Body() body: { skills?: string[]; autoUpdate?: boolean }) {
    this.bus.emit("skills:reload", {
      type: "skills_reload",
      ...(body?.skills?.length ? { unloadedSkills: body.skills } : {}),
      ...(body?.autoUpdate ? { autoUpdate: true } : {}),
    });
    return { ok: true };
  }

  /**
   * 插件在技能被调用后请求「有改动就上传到云端」。没有云端，校验名字后什么也不做 ——
   * 原本也是发了就不管结果，回 ok 插件照常往下走。
   */
  @Post("api/skills/upload-check")
  @HttpCode(200)
  uploadCheck(@Body() body: { name?: string }) {
    if (!body?.name || !isValidSkillName(body.name)) throw new BadRequestException("Invalid skill name");
    return { ok: true };
  }

  @Post("api/skills/user/trash")
  @HttpCode(200)
  trashUserSkill(@Body() body: NameBody) {
    if (!body?.name) return { ok: false, error: "name is required" };
    if (body.skillType === "plugin") return { ok: false, error: "Plugins are not available" };
    if (!isValidSkillName(body.name)) return { ok: false, error: "invalid skill name" };
    return this.imports.resolveUserSkillPath(body.name);
  }

  @Post("api/skills/fork")
  @HttpCode(200)
  forkSkill(@Body() body: NameBody) {
    if (!body?.name) return { ok: false, error: "name is required" };
    if (!isValidSkillName(body.name)) return { ok: false, error: "invalid skill name" };
    return this.imports.forkSkill(body.name);
  }

  @Post("api/skills/import")
  @HttpCode(200)
  @UseInterceptors(FileInterceptor("file", SKILL_UPLOAD_OPTIONS))
  importSkill(@UploadedFile() file?: { buffer: Buffer; originalname: string }) {
    if (!file) throw new BadRequestException("file is required");
    return this.imports.importLocalSkill(file.buffer, file.originalname);
  }

  @Post("api/skills/import/confirm-staging")
  @HttpCode(200)
  confirmStagingInstall(@Body() body: { name?: string; stagingPath?: string }) {
    if (!body?.name || !body.stagingPath) throw new BadRequestException("name and stagingPath are required");
    if (!isValidSkillName(body.name)) throw new BadRequestException("Invalid skill name");
    return this.imports.confirmStagingInstall(body.stagingPath, body.name);
  }
}
