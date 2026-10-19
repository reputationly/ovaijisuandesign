import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Inject, Module, NotFoundException, Param, Post, Put, Query, Req, Res, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Request, Response } from "express";

import { PluginSdkController } from "./plugin-sdk.controller.js";
import { PluginAgentService } from "./plugin-agent.service.js";
import { PluginPythonService } from "./plugin-python.service.js";
import { PluginFilesService, pluginRelativePath, requireConfigKey, requirePluginId } from "./plugins.service.js";

/**
 * HTML 插件的清单、包文件、数据目录和配置。安装市场还没接；
 * 已经放进数据根的插件会出现在列表里，并能放到画布上。
 */
@Controller("api/plugins")
export class PluginsController {
  constructor(
    @Inject(PluginFilesService) private readonly plugins: PluginFilesService,
    @Inject(PluginPythonService) private readonly python: PluginPythonService,
  ) {}

  @Get()
  async listPlugins() {
    return { plugins: await this.plugins.list() };
  }

  @Post("install-local")
  @HttpCode(200)
  installLocal(@Body() body: { filePath?: unknown; displayName?: unknown; width?: unknown; height?: unknown }) {
    if (typeof body?.filePath !== "string" || !body.filePath) throw new BadRequestException("filePath is required and must be a non-empty string");
    if (body.displayName !== undefined && typeof body.displayName !== "string") throw new BadRequestException("displayName must be a string when provided");
    if (body.width !== undefined && (typeof body.width !== "number" || !Number.isFinite(body.width))) throw new BadRequestException("width must be a finite number when provided");
    if (body.height !== undefined && (typeof body.height !== "number" || !Number.isFinite(body.height))) throw new BadRequestException("height must be a finite number when provided");
    return this.plugins.installLocal({ filePath: body.filePath, displayName: body.displayName, width: body.width, height: body.height });
  }

  @Post(":id/python/ensure-env")
  @HttpCode(200)
  ensureEnv(@Param("id") id: string) {
    requirePluginId(id);
    return this.python.ensureEnv(id);
  }

  @Post(":id/python/run")
  @HttpCode(200)
  run(@Param("id") id: string, @Body() body: { script?: unknown; args?: unknown; inputPaths?: unknown; stdin?: unknown; timeoutMs?: unknown }) {
    requirePluginId(id);
    if (typeof body?.script !== "string" || !body.script) throw new BadRequestException("script is required and must be a non-empty string");
    if (body.args !== undefined && !stringArray(body.args)) throw new BadRequestException("args must be a string array when provided");
    if (body.inputPaths !== undefined && !stringArray(body.inputPaths)) throw new BadRequestException("inputPaths must be a string array when provided");
    if (body.stdin !== undefined && typeof body.stdin !== "string") throw new BadRequestException("stdin must be a string when provided");
    if (body.timeoutMs !== undefined && (typeof body.timeoutMs !== "number" || !Number.isFinite(body.timeoutMs))) throw new BadRequestException("timeoutMs must be a finite number when provided");
    return this.python.run(id, { script: body.script, args: body.args as string[] | undefined, inputPaths: body.inputPaths as string[] | undefined, stdin: body.stdin as string | undefined, timeoutMs: body.timeoutMs as number | undefined });
  }

  @Post(":id/instantiate")
  async instantiate(@Param("id") id: string, @Body() body: { workspacePath?: unknown; position?: unknown; sourceNodeIds?: unknown; initialData?: unknown }) {
    requirePluginId(id);
    return { nodeId: await this.plugins.instantiate(id, body) };
  }

  @Get(":id/config")
  async listKeys(@Param("id") id: string) {
    requirePluginId(id);
    return { keys: await this.plugins.keys(id) };
  }

  @Get(":id/config/:key")
  async getKey(@Param("id") id: string, @Param("key") key: string) {
    requirePluginId(id);
    requireConfigKey(key);
    const found = await this.plugins.get(id, key);
    if (!found.found) throw new NotFoundException(`config key not found: ${key}`);
    return { value: found.value };
  }

  @Put(":id/config/:key")
  @HttpCode(204)
  async setKey(@Param("id") id: string, @Param("key") key: string, @Body() body: { value?: unknown }) {
    requirePluginId(id);
    requireConfigKey(key);
    if (!body || !("value" in body)) throw new BadRequestException("body must be { value: <json> }");
    await this.plugins.set(id, key, body.value);
  }

  @Delete(":id/config/:key")
  async deleteKey(@Param("id") id: string, @Param("key") key: string) {
    requirePluginId(id);
    requireConfigKey(key);
    await this.plugins.delete(id, key);
  }

  @Put(":id/data/{*path}")
  @UseInterceptors(FileInterceptor("file"))
  async writeData(@Param("id") id: string, @UploadedFile() file: { buffer: Buffer } | undefined, @Req() request: Request, @Res() response: Response) {
    requirePluginId(id);
    if (!file) throw new BadRequestException("Provide the file bytes as multipart `file`");
    const relative = pluginRelativePath(id, "data", request.path);
    if (!relative) throw new BadRequestException("Missing or malformed data path");
    await this.plugins.writeData(id, relative, file.buffer);
    response.json({ ok: true, path: relative });
  }

  @Get(":id/data/{*path}")
  async serveData(@Param("id") id: string, @Req() request: Request, @Res() response: Response) {
    requirePluginId(id);
    const relative = pluginRelativePath(id, "data", request.path);
    const absolute = relative ? await this.plugins.resolveData(id, relative) : null;
    if (!absolute) {
      response.status(404).end();
      return;
    }
    response.sendFile(absolute, { dotfiles: "allow" });
  }

  @Get(":id/static/{*path}")
  async serveStatic(@Param("id") id: string, @Req() request: Request, @Res() response: Response) {
    requirePluginId(id);
    const relative = pluginRelativePath(id, "static", request.path);
    const absolute = relative ? await this.plugins.resolveStatic(id, relative) : null;
    if (!absolute) {
      response.status(404).end();
      return;
    }
    response.sendFile(absolute, { dotfiles: "allow" });
  }
}

function stringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

@Controller("api/plugins/agent")
export class PluginAgentController {
  constructor(@Inject(PluginAgentService) private readonly agent: PluginAgentService) {}

  @Get("surface")
  surface(@Query("nodeId") nodeId?: string) {
    return this.agent.surface(nodeId ?? "");
  }

  @Post("invoke")
  @HttpCode(200)
  invoke(@Body() body: { nodeId?: string; method?: string; args?: unknown; timeoutMs?: number }) {
    return this.agent.invoke(body ?? {});
  }

  @Post("result")
  @HttpCode(200)
  result(@Body() body: { invokeId?: string; ok?: boolean; result?: unknown; error?: { code?: string; message?: string } }) {
    return { accepted: this.agent.acceptResult(body ?? {}) };
  }

  @Post("open-editor")
  @HttpCode(200)
  openEditor(@Body() body: { nodeId?: string; sourceNodeIds?: string[]; initialMessage?: string }) {
    return this.agent.openEditor(body?.nodeId ?? "", body?.sourceNodeIds, body?.initialMessage);
  }
}

@Module({ controllers: [PluginsController, PluginAgentController, PluginSdkController], providers: [PluginFilesService, PluginPythonService, PluginAgentService], exports: [PluginFilesService] })
export class PluginsModule {}
