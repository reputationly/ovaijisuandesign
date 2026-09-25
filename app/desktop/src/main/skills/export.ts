/**
 * 技能导出（`skillExport` 频道）：把一个技能目录打成 `<name>.zip`，包里顶层是 `<name>/`。
 *
 * 按顺序在各技能目录里找 `<dir>/<name>/SKILL.md`，先找到的算数（用户自建的优先于自带的）。
 * 压缩用系统自带工具：macOS / Windows 10+ 的 bsdtar 能写 zip，Linux 用 zip。
 */
import { execFile } from "node:child_process";
import { existsSync, readdirSync, rmSync, statSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { BrowserWindow, dialog } from "electron";

const SKILL_NAME = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/;

export function resolveSkillDir(name: string, skillDirs: string[]): string | undefined {
  for (const dir of skillDirs) {
    const candidate = path.join(dir, name);
    if (existsSync(path.join(candidate, "SKILL.md"))) return candidate;
  }
  return undefined;
}

function countFiles(dir: string): number {
  let n = 0;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) n += countFiles(path.join(dir, e.name));
    else if (e.isFile()) n += 1;
  }
  return n;
}

/** 把 `<parent>/<name>` 打进 zip，包里顶层目录就是 name。 */
export function zipDirectory(parent: string, name: string, out: string): Promise<void> {
  const [cmd, args]: [string, string[]] =
    process.platform === "linux" ? ["zip", ["-q", "-r", out, name]] : ["tar", ["-a", "-c", "-f", out, name]];
  return new Promise((resolve, reject) => execFile(cmd, args, { cwd: parent }, (err) => (err ? reject(err) : resolve())));
}

export function createSkillExportService(skillDirs: () => string[]): { exportSkill(name: unknown): Promise<unknown> } {
  return {
    async exportSkill(name: unknown) {
      if (typeof name !== "string" || !name) throw new Error("skillName is required");
      if (!SKILL_NAME.test(name)) throw new Error("Invalid skill name");
      const source = resolveSkillDir(name, skillDirs());
      if (!source) throw new Error(`Skill "${name}" not found in any skill directory`);
      const options: Electron.SaveDialogOptions = {
        title: `导出技能：${name}`,
        defaultPath: path.join(os.homedir(), "Downloads", `${name}.zip`),
        filters: [{ name: "Zip Archive", extensions: ["zip"] }],
      };
      const win = BrowserWindow.getFocusedWindow();
      const r = win ? await dialog.showSaveDialog(win, options) : await dialog.showSaveDialog(options);
      if (r.canceled || !r.filePath) return { cancelled: true };
      // tar 遇到已存在的文件会往里追加，先删掉（保存对话框已经确认过覆盖）
      rmSync(r.filePath, { force: true });
      await zipDirectory(path.dirname(source), path.basename(source), r.filePath);
      return { cancelled: false, filePath: r.filePath, size: statSync(r.filePath).size, fileCount: countFiles(source) };
    },
  };
}
