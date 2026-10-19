import { createHash, randomUUID } from "node:crypto";
import { closeSync, existsSync, fsyncSync, lstatSync, mkdirSync, openSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";

import { BadRequestException, ConflictException, Controller, ForbiddenException, Get, Header, Inject, Injectable, NotFoundException, Param, Put, Body } from "@nestjs/common";

import { CanvasV3Service } from "./canvas-v3.controller.js";

const UNSAFE_KEYS = ["__proto__", "constructor", "prototype"];
const RESERVED_DATA_KEYS = [...UNSAFE_KEYS, "pluginStorage", "popoverDraft", "pluginEntry"];
const MAX_KEYS = 256;
const MAX_VALUE_BYTES = 256 * 1024;
const MAX_TOTAL_BYTES = 1024 * 1024;
const COMFYUI_DRAFT_KEY = "comfyui.workflow-draft.v1";
const COMFYUI_DRAFT_MAX_BYTES = 5 * 1024 * 1024;

type PluginRecord = { data: Record<string, unknown>; storage: Record<string, unknown>; revision: number; metadata?: { pluginEntry: unknown } };

function plainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function byteSize(value: unknown): number {
  try {
    const json = JSON.stringify(value ?? null);
    if (typeof json !== "string") return Number.POSITIVE_INFINITY;
    return new TextEncoder().encode(json).byteLength;
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

@Injectable()
export class CanvasV3PluginStateService {
  constructor(@Inject(CanvasV3Service) private readonly canvas: CanvasV3Service) {}

  ensure(nodeId: string) {
    return this.canvas.enqueue(() => {
      const file = this.filename(nodeId);
      const record = this.load(file);
      return existsSync(file) ? record : this.save(file, record);
    });
  }

  write(nodeId: string, input: unknown) {
    return this.canvas.enqueue(() => {
      const file = this.filename(nodeId);
      const previous = this.load(file);
      if (!plainObject(input) || !plainObject(input.data) || !plainObject(input.storage)) throw new BadRequestException("Invalid V3 plugin state");
      if (input.revision !== previous.revision) throw new ConflictException("V3 plugin state revision changed; hydrate and retry");
      for (const field of ["pluginId", "pluginVersion"] as const) {
        if (input.data[field] !== previous.data[field]) throw new ForbiddenException("Renderer cannot bind V3 plugin identity");
      }
      for (const key of Object.keys(input.data)) {
        if (RESERVED_DATA_KEYS.includes(key)) throw new BadRequestException(`Reserved node data key: ${key}`);
      }
      if (!Number.isFinite(byteSize(input.data))) throw new BadRequestException("Invalid JSON metadata");
      if (input.metadata !== undefined && JSON.stringify(input.metadata) !== JSON.stringify(previous.metadata)) {
        throw new ForbiddenException("Renderer cannot change V3 plugin entry binding");
      }
      this.validateStorage(input.storage, previous.data.pluginId);
      return this.save(file, {
        data: input.data,
        storage: input.storage,
        revision: previous.revision + 1,
        ...(previous.metadata ? { metadata: previous.metadata } : {}),
      });
    });
  }

  /** 只有网关自己在安装插件时能改身份。渲染进程传来的 pluginId 不能进这里。 */
  bindPlugin(nodeId: string, pluginId: string, pluginVersion?: string, pluginEntry?: unknown) {
    return this.canvas.enqueue(() => {
      if (!pluginId || typeof pluginId !== "string") throw new BadRequestException("Invalid plugin ID");
      const file = this.filename(nodeId);
      if (this.canvas.getDocument().nodes[nodeId]?.kind !== "composition") throw new BadRequestException("Plugin identity requires a content node");
      const previous = this.load(file);
      if (previous.data.pluginId && previous.data.pluginId !== pluginId) throw new ConflictException("V3 node already belongs to another plugin");
      const data = { ...previous.data, pluginId, ...(pluginVersion ? { pluginVersion } : {}) };
      this.validateStorage(previous.storage, pluginId);
      return this.save(file, {
        ...previous,
        data,
        revision: previous.revision + 1,
        ...(pluginEntry ? { metadata: { pluginEntry } } : {}),
      });
    });
  }

  private filename(nodeId: string): string {
    const workspace = this.canvas.admit();
    if (typeof nodeId !== "string" || !nodeId || nodeId.length > 512) throw new BadRequestException("Invalid V3 node ID");
    const nodes = this.canvas.getDocument().nodes;
    if (!Object.hasOwn(nodes, nodeId)) throw new NotFoundException("V3 node does not exist");
    const directory = path.join(workspace, ".hilo", "canvas-v3", "plugin-state");
    for (const entry of [path.join(workspace, ".hilo"), path.join(workspace, ".hilo", "canvas-v3"), directory]) {
      this.canvas.admit();
      try {
        const stat = lstatSync(entry);
        if (!stat.isDirectory() || stat.isSymbolicLink()) throw new ForbiddenException("Unsafe V3 plugin state directory");
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
        mkdirSync(entry);
      }
    }
    const file = path.join(directory, `${createHash("sha256").update(nodeId).digest("hex")}.json`);
    try {
      const stat = lstatSync(file);
      if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1) throw new ForbiddenException("Unsafe V3 plugin state file");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    return file;
  }

  private load(file: string): PluginRecord {
    try {
      const record = JSON.parse(readFileSync(file, "utf8")) as PluginRecord;
      if (!plainObject(record) || !plainObject(record.data) || !plainObject(record.storage) || !Number.isSafeInteger(record.revision) || record.revision < 0) {
        throw new Error("Corrupt V3 plugin state");
      }
      return record;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return { data: {}, storage: {}, revision: 0 };
      throw error;
    }
  }

  private save(file: string, record: PluginRecord): PluginRecord {
    this.canvas.admit();
    const temporary = `${file}.${randomUUID()}.tmp`;
    let fd: number | undefined;
    try {
      fd = openSync(temporary, "wx", 0o600);
      writeFileSync(fd, JSON.stringify(record));
      fsyncSync(fd);
      closeSync(fd);
      fd = undefined;
      this.canvas.admit();
      renameSync(temporary, file);
      return record;
    } finally {
      if (fd !== undefined) closeSync(fd);
      if (existsSync(temporary)) unlinkSync(temporary);
    }
  }

  private validateStorage(storage: Record<string, unknown>, pluginId: unknown): void {
    const keys = Object.keys(storage);
    if (keys.length > MAX_KEYS) throw new BadRequestException("Plugin storage key quota exceeded");
    for (const [key, value] of Object.entries(storage)) {
      if (!key || UNSAFE_KEYS.includes(key)) throw new BadRequestException("Invalid plugin storage key");
      const limit = pluginId === "comfyui" && key === COMFYUI_DRAFT_KEY ? COMFYUI_DRAFT_MAX_BYTES : MAX_VALUE_BYTES;
      const bytes = byteSize(value);
      if (!Number.isFinite(bytes) || bytes > limit) throw new BadRequestException("Plugin storage value exceeds quota");
    }
    const totalLimit = pluginId === "comfyui" && Object.hasOwn(storage, COMFYUI_DRAFT_KEY) ? COMFYUI_DRAFT_MAX_BYTES + MAX_TOTAL_BYTES : MAX_TOTAL_BYTES;
    const total = byteSize(storage);
    if (!Number.isFinite(total) || total > totalLimit) throw new BadRequestException("Plugin storage total quota exceeded");
  }
}

@Controller("api/v3/canvas/plugin-state")
export class CanvasV3PluginStateController {
  constructor(@Inject(CanvasV3PluginStateService) private readonly state: CanvasV3PluginStateService) {}

  @Get(":nodeId")
  @Header("Cache-Control", "no-store")
  ensure(@Param("nodeId") nodeId: string) {
    return this.state.ensure(nodeId);
  }

  @Put(":nodeId")
  @Header("Cache-Control", "no-store")
  write(@Param("nodeId") nodeId: string, @Body() body: unknown) {
    return this.state.write(nodeId, body);
  }
}
