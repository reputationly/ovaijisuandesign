#!/usr/bin/env node
/**
 * `fetch-opencode.mjs` 的离线自检。**不联网**，用现造的 zip 走一遍真实路径
 * （解压 → 校验 → 落盘），把那些只能靠押 CI 才能撞到的坑钉在本地。
 *
 * ## 为什么需要它
 *
 * 这脚本在 CI 上连着挂了五轮，每轮 8~10 分钟：参数名编错、Windows 跨卷 rename、
 * 交叉架构自检不可诊断、体积检查拿 zip 当二进制、PE 魔数 2 字节比成 4 字节。
 * **没有一个是本地跑一次能撞出来的** —— 原来没有 `--from`，整条取件路径必须联网
 * 才能走一遍，于是每改一版就得押一轮 CI。
 *
 * 有了 `--from` 之后，校验逻辑、格式匹配、失败路径全都能本地断言。
 *
 * 用法：`node scripts/verify-fetch-opencode.mjs`
 */

import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

// 静态 import 是安全的：fetch-opencode.mjs 里 `main()` 只在它被当入口直接跑时才执行，
// 被 import 时不会碰网络。
import { cleanupDir } from "./fetch-opencode.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPT = path.join(REPO, "scripts/fetch-opencode.mjs");
const BIN_DIR = path.join(REPO, "app/packages/service/bin");

let pass = 0;
let fail = 0;
const ok = (cond, what, detail) => {
  if (cond) {
    pass++;
    console.log(`  ✅ ${what}`);
  } else {
    fail++;
    console.log(`  ❌ ${what}${detail ? ` —— ${detail}` : ""}`);
  }
};

/** 造一个 zip：内容是给定的 buffer。zip 不可用就返回 null（Windows 上常见）。 */
function makeZip(dir, name, content) {
  const src = path.join(dir, name);
  writeFileSync(src, content);
  const zip = `${src}.zip`;
  try {
    execFileSync("zip", ["-q", "-j", zip, src], { stdio: "pipe" });
    return zip;
  } catch {
    return null; // 没有 zip 命令（Windows runner）
  }
}

/**
 * 一个「像样」的 Mach-O：合法魔数 + 撑到过体积门槛。
 *
 * **填充必须用随机字节，不能用零。** 零压缩率极高，51MB 全零打出来只有 52KB 的
 * zip，会撞上脚本「zip 至少 1MB」的门槛 —— 那是测试自己造出来的假象，不是脚本的 bug。
 * （真二进制 43.9MB 的 zip 装下 136MB 的可执行文件，压缩比远没那么夸张。）
 */
function padded(magic) {
  const b = randomBytes(51 * 1024 * 1024);
  b.write(magic, 0, "hex");
  return b;
}
/** Mach-O 64 little-endian。 */
const fakeMachO = () => padded("cffaedfe");
/** PE：MZ 魔数**只有 2 字节**（后面跟什么都行）。 */
const fakePE = () => padded("4d5a");

function runFetch(args) {
  try {
    return { code: 0, out: execFileSync(process.execPath, [SCRIPT, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], cwd: REPO }) };
  } catch (e) {
    return { code: e.status ?? 1, out: `${e.stdout ?? ""}${e.stderr ?? ""}` };
  }
}

/** 每次跑之前把落点清干净，否则「已存在就跳过」的逻辑会让断言互相污染。 */
function clearBin() {
  for (const n of ["opencode", "opencode.exe", ".version"]) {
    const p = path.join(BIN_DIR, n);
    if (existsSync(p)) rmSync(p, { force: true });
  }
}

async function main() {
  const work = mkdtempSync(path.join(tmpdir(), "ov-fetch-test-"));
  const HOST = process.platform === "win32" ? "x86_64-pc-windows-msvc" : process.arch === "arm64" ? "aarch64-apple-darwin" : "x86_64-apple-darwin";
  const hostIsPE = HOST.includes("windows");
  const good = makeZip(work, hostIsPE ? "opencode.exe" : "opencode", hostIsPE ? fakePE() : fakeMachO());
  const errorPage = makeZip(work, "err", Buffer.from("<html>Not Found</html>".padEnd(3 * 1024 * 1024, " ")));
  const truncated = makeZip(work, "tiny", Buffer.alloc(1024, 0x41));

  if (!good) {
    console.log("⚠ 这台机器没有 zip 命令，跳过需要造 zip 的用例（Windows runner 常见）。");
  } else {
    console.log(`取件脚本离线自检（host target = ${HOST}）\n`);

    // 1. 好文件：走完全程并落盘
    console.log("好文件走全程：");
    clearBin();
    const r1 = runFetch(["--target", HOST, "--from", good]);
    ok(r1.code === 0, "退出码 0", r1.out.slice(-200));
    const land = path.join(BIN_DIR, hostIsPE ? "opencode.exe" : "opencode");
    ok(existsSync(land), "二进制落到 app/packages/service/bin/");
    ok(
      existsSync(path.join(BIN_DIR, ".version")) && readFileSync(path.join(BIN_DIR, ".version"), "utf8").trim() === "1.18.18",
      "版本戳写对了",
    );
    // 再跑一次应当走「已存在就跳过」，不重复干活
    const r1b = runFetch(["--target", HOST, "--from", good]);
    ok(r1b.code === 0 && /已经在/.test(r1b.out), "第二次跑命中「已存在，跳过」", r1b.out.slice(-120));

    // 2. 格式和 target 对不上
    console.log("\n格式必须和 --target 对上：");
    clearBin();
    const other = HOST.includes("windows") ? "x86_64-apple-darwin" : "x86_64-pc-windows-msvc";
    // **文件名必须是「目标期待的那个」**，只是内容格式错 —— 否则卡在「解压后没找到
    // opencode.exe」，测到的就不是格式检查而是解压了。
    const otherExe = other.includes("windows") ? "opencode.exe" : "opencode";
    const wrongFormat = makeZip(work, otherExe, other.includes("windows") ? fakeMachO() : fakePE());
    const r2 = runFetch(["--target", other, "--from", wrongFormat]);
    ok(r2.code !== 0, "喂错格式 → 失败", `退出码 ${r2.code}`);
    ok(/对不上/.test(r2.out), "错误信息说清是格式不匹配", r2.out.slice(-160));
    ok(!existsSync(path.join(BIN_DIR, other.includes("windows") ? "opencode.exe" : "opencode")), "失败时没有落盘");

    // 3. 错误页（zip 够大但内容不是可执行文件）
    console.log("\n错误页 / 截断：");
    clearBin();
    const r3 = runFetch(["--target", HOST, "--from", errorPage]);
    ok(r3.code !== 0, "200MB 错误页 → 失败", `退出码 ${r3.code}`);
    ok(/魔数|错误页/.test(r3.out), "错误信息指向魔数/错误页", r3.out.slice(-160));

    clearBin();
    const r4 = runFetch(["--target", HOST, "--from", truncated]);
    ok(r4.code !== 0, "1KB 残片 → 失败", `退出码 ${r4.code}`);

    // 4. --from 路径不存在
    clearBin();
    const r5 = runFetch(["--target", HOST, "--from", path.join(work, "nope.zip")]);
    ok(r5.code !== 0 && /不存在/.test(r5.out), "--from 指向不存在的文件 → 明确报错");

    // 5. 未知 target
    clearBin();
    const r6 = runFetch(["--target", "mips-unknown-linux", "--from", good]);
    ok(r6.code !== 0 && /不认识的 target/.test(r6.out), "未知 target → 明确报错并列出支持项");
  }

  // 6. **临时目录删不掉，不能让取件失败。**
  //
  // 它只写在 `finally` 里，而 finally 抛出的异常会**顶掉真正的错误信息** ——
  // 于是「删临时文件失败」会伪装成「取件失败」。真实踩过：2026-10-07 的
  // Windows CI，下载/体积/魔数全过、二进制已经落盘，却因为
  // `EBUSY: unlink …opencode.exe` 把整轮 8~10 分钟的出包验证判红。
  //
  // Windows 上跳过「造一个删不掉的目录」那两条：`chmod` 在那儿只管只读位，
  // 去掉写权限并不会让 unlink 失败，于是这个目录**是删得掉的**，测不到契约
  // （恢复权限时反而会 ENOENT）。那边真正的锁来自杀毒持句柄，本地复现不了。
  // 「正常时真的删掉了」那条两边都跑 —— 防止「吞异常」退化成「什么都不做」。
  console.log("\n临时目录清理：");
  {
    const normal = path.join(work, "normal");
    mkdirSync(normal, { recursive: true });
    writeFileSync(path.join(normal, "a.bin"), "x");
    ok((await cleanupDir(normal)) === true && !existsSync(normal), "cleanupDir 正常时真的删掉了");

    if (process.platform === "win32") {
      console.log("  – 跳过「删不掉」两条：Windows 的 chmod 只管只读位，造不出删不掉的目录");
    } else {
      const stuck = path.join(work, "stuck");
      mkdirSync(stuck, { recursive: true });
      writeFileSync(path.join(stuck, "held.bin"), "x");
      chmodSync(stuck, 0o500); // 去掉目录自己的写权限 → 里面的文件删不掉
      let threw = null;
      let result = null;
      try {
        result = await cleanupDir(stuck);
      } catch (err) {
        threw = err;
      } finally {
        // 目录可能已经被删掉了（cleanupDir 成功时就是），所以先问一句。
        if (existsSync(stuck)) chmodSync(stuck, 0o700);
        rmSync(stuck, { recursive: true, force: true });
      }
      ok(threw === null, "cleanupDir 遇到删不掉的目录不抛异常", threw ? String(threw.code ?? threw) : "");
      ok(result === false, "cleanupDir 如实返回 false（而不是假装成功）", `实际 ${result}`);
    }
  }

  clearBin();
  rmSync(work, { recursive: true, force: true });

  console.log(`\n${fail === 0 ? "✓" : "✗"} ${pass} 通过 / ${fail} 失败`);
  process.exitCode = fail === 0 ? 0 : 1;
}

await main();
