"use strict";

/**
 * macOS 出包前的签名补丁。
 *
 * 没有开发者证书时，electron-builder 直接跳过签名，并且**不调用 afterSign**
 * （日志是 skipping "afterSign" hook as no signing occurred）。
 * 所以这个脚本挂在 artifactBuildStarted：dmg / zip 开始打包之前，.app 已经过
 * electron fuses，还没被装进安装包。
 *
 * linker 的临时签名过不了 Squirrel，会报「代码不含资源，但签名指示这些资源必须存在」。
 * 这里改成 ad-hoc，并把指定要求收成应用标识本身。同一标识的两个版本才能互相升级。
 * 已经有团队证书时不动，避免把正式签名盖掉。
 *
 * 必须放在 app/desktop 里面：electron-builder 拒绝加载工作区外的 hook。
 */

const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

let signing = null;

function codesign(args) {
  const result = spawnSync("codesign", args, { encoding: "utf8" });
  const text = `${result.stdout || ""}${result.stderr || ""}`;
  if (result.status !== 0) {
    const error = new Error(text || `codesign 退出 ${result.status}`);
    error.status = result.status;
    throw error;
  }
  return text;
}

function bundleId(app) {
  const result = spawnSync(
    "plutil",
    ["-extract", "CFBundleIdentifier", "raw", "-o", "-", path.join(app, "Contents", "Info.plist")],
    { encoding: "utf8" },
  );
  const id = (result.stdout || "").trim();
  if (result.status !== 0 || !id) {
    throw new Error(result.stderr || "读不到 CFBundleIdentifier");
  }
  return id;
}

function findApp(context) {
  if (context && context.appOutDir && context.packager) {
    return path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`);
  }
  if (!context || !context.file) return null;
  const outDir = path.dirname(context.file);
  for (const name of ["mac-arm64", "mac-x64", "mac"]) {
    const dir = path.join(outDir, name);
    let entries = [];
    try {
      entries = fs.readdirSync(dir);
    } catch {
      continue;
    }
    const app = entries.find((entry) => entry.endsWith(".app"));
    if (app) return path.join(dir, app);
  }
  return null;
}

function signApp(app) {
  let described = "";
  try {
    described = codesign(["-dv", "--verbose=2", app]);
  } catch {
    described = "";
  }
  const team = /TeamIdentifier=(.*)/.exec(described);
  if (team && team[1].trim() && team[1].trim() !== "not set") {
    console.log(`已有签名团队 ${team[1].trim()}，不改指定要求`);
    return;
  }
  const id = bundleId(app);
  try {
    const existing = codesign(["-d", "-r-", app]);
    if (existing.includes(`identifier "${id}"`) && existing.includes("designated")) {
      console.log(`ad-hoc 指定要求已在：identifier "${id}"`);
      return;
    }
  } catch {
    // 还没有签名，接着写。
  }
  const requirement = `=designated => identifier "${id}"`;
  codesign(["--force", "--deep", "--sign", "-", app]);
  codesign(["--force", "--sign", "-", "--requirements", requirement, app]);
  const written = codesign(["-d", "-r-", app]);
  if (!written.includes(`identifier "${id}"`)) {
    throw new Error(`指定要求没写上：\n${written}`);
  }
  console.log(`ad-hoc 指定要求：identifier "${id}"`);
}

exports.default = async function signMacAdhoc(context) {
  if (process.platform !== "darwin") return;
  const app = findApp(context);
  if (!app) return;
  if (!signing) signing = Promise.resolve().then(() => signApp(app));
  await signing;
};
