import { randomUUID } from "node:crypto";
import { copyFile, mkdir, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { Injectable, Logger } from "@nestjs/common";
import type { MediaConfig } from "@ov/maas-media";

import { GatewayConfig } from "../config/gateway-config.js";

/** 本机音色表里的一条：克隆时登记的参考音频。 */
export interface LocalVoice {
  voice_id: string;
  kind: "clone";
  /** 参考音频在音色目录里的文件名。 */
  reference: string;
  /** 用户给的参考音频的文件名，列表里拿来当名字。 */
  source_name: string;
  created_at: string;
}

const META = "meta.json";
const VOICE_ID = /^hub_[0-9a-f-]{36}$/;

/**
 * 本机音色表：`<hubDir>/voices/<voice_id>/{meta.json, reference.<ext>}`。
 *
 * 放应用级而不是工作区：克隆出的 voice_id 和账号上的音色一样，换个工作区也要能用。
 * 每个音色一个目录、先在暂存目录写好再整个改名过去：几个工作区 gateway 是不同进程，
 * 共用一个 JSON 表做读改写会互相吞掉对方刚登记的音色。
 */
@Injectable()
export class VoiceLibraryService {
  private readonly log = new Logger("VoiceLibrary");

  constructor(private readonly cfg: GatewayConfig) {}

  get dir(): string {
    return path.join(this.cfg.hubDir, "voices");
  }

  newVoiceId(): string {
    return `hub_${randomUUID()}`;
  }

  /** 按登记先后排好的全部音色。读不了的条目跳过：一条坏了不该让整张表不可用。 */
  async list(): Promise<LocalVoice[]> {
    let names: string[];
    try {
      names = await readdir(this.dir);
    } catch {
      return [];
    }
    const out: LocalVoice[] = [];
    for (const name of names) {
      if (!VOICE_ID.test(name)) continue;
      try {
        const v = JSON.parse(await readFile(path.join(this.dir, name, META), "utf8")) as LocalVoice;
        if (v.voice_id === name && typeof v.reference === "string" && !v.reference.includes("/") && !v.reference.includes("\\")) out.push(v);
      } catch (err) {
        this.log.warn(`skip unreadable voice ${name}: ${(err as Error).message}`);
      }
    }
    return out.sort((a, b) => a.created_at.localeCompare(b.created_at));
  }

  referencePath(v: LocalVoice): string {
    return path.join(this.dir, v.voice_id, v.reference);
  }

  /**
   * 先把参考音频放进暂存目录，返回它的路径和提交 / 放弃两个动作。
   * 调用方要先拿它合成试听，成功了才登记：试听失败时表里不能多出一个没人知道的音色。
   */
  async stage(voiceId: string, sourceAbs: string, sourceName: string): Promise<{ referencePath: string; commit(): Promise<void>; discard(): Promise<void> }> {
    const staging = path.join(this.dir, `.staging-${randomUUID()}`);
    await mkdir(staging, { recursive: true });
    const reference = `reference${path.extname(sourceAbs).toLowerCase()}`;
    const referencePath = path.join(staging, reference);
    try {
      await copyFile(sourceAbs, referencePath);
    } catch (err) {
      await rm(staging, { recursive: true, force: true });
      throw err;
    }
    const meta: LocalVoice = { voice_id: voiceId, kind: "clone", reference, source_name: sourceName, created_at: new Date().toISOString() };
    return {
      referencePath,
      commit: async () => {
        await writeFile(path.join(staging, META), JSON.stringify(meta, null, 2));
        await rename(staging, path.join(this.dir, voiceId));
      },
      discard: () => rm(staging, { recursive: true, force: true }),
    };
  }

  /** 配置里的 voice_map 并上本机音色表。同名时配置优先：那是用户亲手写的。 */
  async withLocalVoices(cfg: MediaConfig): Promise<MediaConfig> {
    const local = await this.list();
    if (!local.length) return cfg;
    const merged: Record<string, string> = {};
    for (const v of local) merged[v.voice_id] = this.referencePath(v);
    return { ...cfg, models: { ...cfg.models, voice_map: { ...merged, ...cfg.models.voice_map } } };
  }
}
