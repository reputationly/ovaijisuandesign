import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import { copyFile, lstat, mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";

import { Injectable } from "@nestjs/common";
import archiver from "archiver";

import { CODE_PUBLISH_MAX_FILE_BYTES } from "@ov/protocol";
import { ProjectDeliveryService } from "../project-kernel/delivery.js";
import { CodeProjectService } from "./code-project.service.js";
import {
  CodeProjectError,
  isIgnoredCodePath,
  resolveCodePublishStagingPath,
} from "./common.js";

const MAX_OUTPUTS = 20;
const IDENTIFIER = /^[A-Za-z0-9._-]{1,128}$/;
const OUTPUT_KEY = /^[A-Za-z0-9_-]{1,64}$/;
const AUTO_CHECKPOINT_MESSAGE = "发布前自动保存";

interface PublishOutput {
  key: string;
  source: { path: string } | { snapshot: "source" };
}

interface PublishRequest {
  requestId: string;
  outputs: PublishOutput[];
  output: { resources: unknown[]; composition?: unknown };
}

@Injectable()
export class CodePublishService {
  constructor(
    private readonly projects: CodeProjectService,
    private readonly delivery: ProjectDeliveryService,
  ) {}

  async publish(sessionId: string, value: unknown) {
    const request = parsePublishRequest(value);
    const project = await this.projects.bound(sessionId);
    return this.projects.exclusive(project.codeProjectId, () => this.run(project, request));
  }

  private async run(project: Awaited<ReturnType<CodeProjectService["bound"]>>, request: PublishRequest) {
    const record = await this.projects.readRecord(project.workspaceDir, project.codeProjectId);
    const fingerprint = createHash("sha256").update(JSON.stringify([request.outputs, request.output])).digest("hex");
    const publishId = createHash("sha256").update(`${project.codeProjectId}\0${request.requestId}`).digest("hex").slice(0, 32);
    let pending = (record.pendingPublishes as {
      requestId: string;
      fingerprint: string;
      checkpointId: string;
      inputs: unknown[];
      staged?: { key: string; path: string; source: string }[];
    }[]).find((item) => item.requestId === request.requestId);
    if (pending && pending.fingerprint !== fingerprint) {
      throw new CodeProjectError(
        "PUBLISH_REQUEST_ID_REUSED",
        "requestId is already bound to a different publish; use a new requestId for changed outputs.",
        409,
      );
    }
    if (!pending) {
      const checkpoint = (await project.store.checkpoint(AUTO_CHECKPOINT_MESSAGE)).checkpoint;
      pending = {
        requestId: request.requestId,
        fingerprint,
        checkpointId: checkpoint.checkpointId,
        inputs: record.inputs as unknown[],
      };
      (record.pendingPublishes as unknown[]).push(pending);
      await this.projects.writeRecord(project.workspaceDir, record);
    }
    const stagingRelative = resolveCodePublishStagingPath(publishId);
    if (!pending.staged) {
      pending.staged = await this.stage(project, request, pending.checkpointId, stagingRelative);
      await this.projects.writeRecord(project.workspaceDir, record);
    }
    const staged = pending.staged;
    const delivery = this.delivery.deliver({
      requestId: `codepub-${publishId}`,
      sources: staged.map((item) => ({ key: item.key, path: item.path })),
      output: request.output,
    }) as { status?: string; resources?: { key?: string; resourceId?: string; versionId?: string }[] };
    if (delivery.status === "completed") {
      for (const resource of delivery.resources ?? []) {
        if (!resource.versionId) continue;
        const published = record.published as { versionId?: string; requestId?: string; key?: string; resourceId?: string; checkpointId?: string; source?: string }[];
        if (published.some((item) => item.versionId === resource.versionId)) continue;
        published.push({
          requestId: request.requestId,
          key: resource.key,
          resourceId: resource.resourceId,
          versionId: resource.versionId,
          checkpointId: pending.checkpointId,
          source: staged.find((item) => item.key === resource.key)?.source ?? resource.key,
        });
      }
      await this.projects.writeRecord(project.workspaceDir, record);
      await rm(path.join(project.workspaceDir, stagingRelative), { recursive: true, force: true });
    }
    return { checkpointId: pending.checkpointId, delivery };
  }

  private async stage(
    project: Awaited<ReturnType<CodeProjectService["bound"]>>,
    request: PublishRequest,
    checkpointId: string,
    stagingRelative: string,
  ) {
    const staged: { key: string; path: string; source: string }[] = [];
    for (const output of request.outputs) {
      const source = await this.resolveSource(project, output.source);
      const fileName = source.kind === "file" ? path.basename(source.absolute) : `${source.name}.zip`;
      const relative = path.posix.join(stagingRelative, output.key, fileName);
      const target = path.join(project.workspaceDir, ...relative.split("/"));
      const exists = await lstat(target).then((stat) => stat.isFile(), () => false);
      if (!exists) {
        await mkdir(path.dirname(target), { recursive: true });
        if (source.kind === "file") await copyFile(source.absolute, target);
        else if (source.kind === "directory") await zipDirectory(source.absolute, target);
        else await this.zipSnapshot(project, checkpointId, target);
        const size = (await lstat(target)).size;
        if (size < 1 || size > CODE_PUBLISH_MAX_FILE_BYTES) {
          await rm(target, { force: true });
          throw new CodeProjectError(
            "PUBLISH_FILE_TOO_LARGE",
            `Output ${output.key} must be a non-empty file of at most ${CODE_PUBLISH_MAX_FILE_BYTES / 1024 / 1024} MiB.`,
          );
        }
      }
      staged.push({ key: output.key, path: relative, source: source.label });
    }
    return staged;
  }

  private async resolveSource(
    project: Awaited<ReturnType<CodeProjectService["bound"]>>,
    source: PublishOutput["source"],
  ): Promise<{ kind: "file" | "directory" | "snapshot"; absolute: string; name: string; label: string }> {
    if ("snapshot" in source) {
      return { kind: "snapshot", absolute: "", name: "source", label: "source-snapshot" };
    }
    const raw = source.path.trim();
    const absolute = path.isAbsolute(raw) ? path.resolve(raw) : path.resolve(project.workDir, raw);
    const relative = path.relative(project.workDir, absolute);
    if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
      throw new CodeProjectError(
        "PUBLISH_PATH_OUTSIDE",
        `${raw} is outside the Code Project working tree ${project.workDir}.`,
      );
    }
    let current = project.workDir;
    for (const part of relative.split(path.sep)) {
      current = path.join(current, part);
      const stat = await lstat(current).catch(() => undefined);
      if (!stat) throw new CodeProjectError("PUBLISH_PATH_MISSING", `${raw} does not exist.`, 404);
      if (stat.isSymbolicLink()) throw new CodeProjectError("PUBLISH_PATH_SYMLINK", `${raw} must not be a symbolic link.`);
    }
    const stat = await lstat(absolute);
    const label = relative.split(path.sep).join("/");
    if (stat.isFile()) return { kind: "file", absolute, name: path.basename(absolute), label };
    if (stat.isDirectory()) return { kind: "directory", absolute, name: path.basename(absolute), label };
    throw new CodeProjectError("PUBLISH_PATH_INVALID", `${raw} is not a file or directory.`);
  }

  private async zipSnapshot(
    project: Awaited<ReturnType<CodeProjectService["bound"]>>,
    checkpointId: string,
    target: string,
  ): Promise<void> {
    const files = await project.store.tree(checkpointId);
    if (!files.length) {
      throw new CodeProjectError("PUBLISH_SNAPSHOT_EMPTY", `Checkpoint ${checkpointId} contains no source files.`);
    }
    await writeZip(target, (zip) => {
      for (const file of files) zip.file(file.object, { name: file.path });
    });
  }
}

async function zipDirectory(directory: string, target: string): Promise<void> {
  const entries: { absolute: string; name: string }[] = [];
  let total = 0;
  const walk = async (current: string, prefix: string): Promise<void> => {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) continue;
      const name = prefix ? `${prefix}/${entry.name}` : entry.name;
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) await walk(absolute, name);
      else if (entry.isFile() && !isIgnoredCodePath(name)) {
        total += (await lstat(absolute)).size;
        if (total > CODE_PUBLISH_MAX_FILE_BYTES) {
          throw new CodeProjectError(
            "PUBLISH_FILE_TOO_LARGE",
            `Directory exceeds ${CODE_PUBLISH_MAX_FILE_BYTES / 1024 / 1024} MiB.`,
          );
        }
        entries.push({ absolute, name });
      }
    }
  };
  await walk(directory, "");
  if (!entries.length) throw new CodeProjectError("PUBLISH_DIRECTORY_EMPTY", "The directory has no files to publish.");
  await writeZip(target, (zip) => {
    for (const entry of entries) zip.file(entry.absolute, { name: entry.name });
  });
}

async function writeZip(target: string, add: (zip: archiver.Archiver) => void): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const output = createWriteStream(target);
    const zip = archiver("zip", { zlib: { level: 6 } });
    output.on("close", () => resolve());
    output.on("error", reject);
    zip.on("error", reject);
    zip.pipe(output);
    add(zip);
    void zip.finalize();
  });
}

function parsePublishRequest(value: unknown): PublishRequest {
  if (!value || typeof value !== "object") throw new CodeProjectError("INVALID_ARGUMENT", "Publish request must be an object");
  const raw = value as Record<string, unknown>;
  if (typeof raw.requestId !== "string" || !IDENTIFIER.test(raw.requestId)) {
    throw new CodeProjectError("INVALID_ARGUMENT", "requestId must be 1-128 characters of letters, digits, dot, underscore or hyphen");
  }
  if (!Array.isArray(raw.outputs) || !raw.outputs.length || raw.outputs.length > MAX_OUTPUTS) {
    throw new CodeProjectError("INVALID_ARGUMENT", `outputs must hold 1-${MAX_OUTPUTS} items`);
  }
  const outputs = raw.outputs.map((item, index) => {
    const output = (item ?? {}) as Record<string, unknown>;
    if (typeof output.key !== "string" || !OUTPUT_KEY.test(output.key)) {
      throw new CodeProjectError("INVALID_ARGUMENT", `outputs[${index}].key is invalid`);
    }
    const source = (output.source ?? {}) as Record<string, unknown>;
    const isPath = typeof source.path === "string" && !!source.path.trim();
    const isSnapshot = source.snapshot === "source";
    if (isPath === isSnapshot) {
      throw new CodeProjectError("INVALID_ARGUMENT", `outputs[${index}].source needs exactly one of path or snapshot="source"`);
    }
    return {
      key: output.key,
      source: isPath ? { path: String(source.path) } : { snapshot: "source" as const },
    };
  });
  if (new Set(outputs.map((item) => item.key)).size !== outputs.length) {
    throw new CodeProjectError("INVALID_ARGUMENT", "Output keys must be unique");
  }
  if (!raw.output || typeof raw.output !== "object") throw new CodeProjectError("INVALID_ARGUMENT", "output is required");
  return { requestId: raw.requestId, outputs, output: structuredClone(raw.output) as PublishRequest["output"] };
}
