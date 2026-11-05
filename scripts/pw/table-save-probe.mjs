/**
 * 表格保存回写探针：+ → 表格 → 双击 → 编辑器 → 单元格输入 → 关闭 → 读磁盘 .htable → 重开校验。
 * 用 fixture 工作区（隔离），每步都打印，失败即非零退出。
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

import { launchApp } from "./launch-app.mjs";

const root = process.env.PROBE_ROOT ?? "/tmp/ov-table-save";
const port = Number(process.env.PROBE_PORT ?? 9417);
const app = await launchApp({ mode: "recovered", port, root });
const page = app.page;
const problems = [];
page.on("response", async (r) => {
  if (r.url().includes("/api/v3/document")) {
    let req = "";
    try { req = String(r.request().postData() ?? "").slice(0, 260); } catch {}
    problems.push(`DOC ${r.status()} ${r.request().method()} ${r.url().replace(/^.*?(\/api[^?]*).*$/, "$1")} | ${req}`);
  }
  if (r.status() < 400 || !r.url().includes("/api/")) return;
  const path = r.url().replace(/^.*?(\/api[^?]*).*$/, "$1");
  let req = "";
  let res = "";
  try { req = String(r.request().postData() ?? "").slice(0, 700); } catch {}
  try { res = String(await r.text()).slice(0, 300); } catch {}
  problems.push(`${r.status()} ${path} | req=${req} | res=${res}`);
});

/** 某工作区里 .htable 资源的最新内容（直接读 store 文件）。 */
const latestTable = () => {
  try {
    return execFileSync("python3", ["-c", `
import glob, json, sqlite3, sys
import os
root = sys.argv[1]
out = None
for db in glob.glob(root + "/*/.hilo/index.sqlite"):
    ws = os.path.dirname(os.path.dirname(db))
    con = sqlite3.connect("file:" + db + "?mode=ro", uri=True)
    try:
        rows = con.execute("select r.name, v.relative_path from resources r join resource_versions v on v.resource_id=r.resource_id where v.status='ready' and r.name like '%.htable' order by v.created_at").fetchall()
    except Exception:
        rows = []
    for name, rel in rows:
        path = os.path.join(ws, rel)
        try:
            out = {"name": name, "path": path, "text": open(path, encoding="utf-8").read()[:4000]}
        except Exception:
            pass
print(json.dumps(out, ensure_ascii=False))
`, root], { encoding: "utf8" }).trim() || "null";
  } catch {
    return null;
  }
};

const parse = () => JSON.parse(latestTable() ?? "null");

try {
  const pill = page.locator('[data-action-ui-id="home-sidebar.recent-pill"]').first();
  if (await pill.count()) await pill.click();
  else await page.locator("text=ws-a").first().click();
  await page.waitForTimeout(9000);

  await page.locator('[data-action-ui-id="canvas.add-node"]').first().click();
  await page.waitForTimeout(800);
  await page.locator('[data-action-ui-id="canvas.menu-add-table"]').first().click();
  await page.waitForTimeout(5000);
  console.log("① 建表:", JSON.stringify(parse()?.name ?? null));

  await page.locator('[data-action-ui-id="canvas-v3.table-preview"]').first().dblclick({ timeout: 8000 });
  await page.waitForTimeout(4000);
  console.log("② 编辑器:", await page.locator('[data-action-ui-id="canvas-v3-table-editor"]').count());

  // 加一行 → 单元格可编辑
  await page.getByText("添加行", { exact: false }).first().click({ timeout: 8000 });
  await page.waitForTimeout(1500);
  const cells = page.locator('[contenteditable="true"], textarea, input[type="text"]');
  // 表格是原生 <table>，点第二个 td（第一个是勾选框）进入编辑
  const cell = page.locator("table td").nth(1);
  console.log("   td 数量:", await page.locator("table td").count());
  await cell.click({ timeout: 8000 });
  await page.waitForTimeout(600);
  await cell.dblclick({ timeout: 8000 }).catch(() => {});
  const MARK = `回写验证-${Date.now().toString(36)}`;
  await page.keyboard.insertText(MARK);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: "/tmp/table-typed.png" });
  console.log("④ 输入:", MARK);

  // 关闭：先把焦点放进表格（点一个 td），再按 Escape
  await page.locator("table td").nth(1).click({ timeout: 6000 }).catch(() => {});
  await page.waitForTimeout(500);
  await page.locator("table").first().press("Escape").catch(async () => {
    await page.keyboard.press("Escape");
  });
  await page.waitForTimeout(4000);
  const modalGone = await page.evaluate(() => !document.querySelector("table"));
  console.log("④.5 模态框已关闭:", modalGone);
  const saved = parse();
  const persisted = Boolean(saved?.text?.includes(MARK));
  console.log("⑤ 磁盘里的表:", saved?.name, "| 含标记:", persisted);
  if (!persisted) {
    console.log("   表内容片段:", (saved?.text ?? "").slice(0, 200));
    throw new Error("输入没有回写到 .htable");
  }

  // 重开确认
  await page.locator('[data-action-ui-id="canvas-v3.table-preview"]').first().dblclick({ timeout: 8000 });
  await page.waitForTimeout(3500);
  const reopened = await page.evaluate((mark) => document.body.innerText.includes(mark), MARK);
  console.log("⑥ 重开后能看到标记:", reopened);
  if (!reopened) throw new Error("重开编辑器后没有看到刚写的内容");
  console.log("✅ 表格 编辑→关闭→保存→重开 全链路 OK");
} catch (error) {
  console.log("❌ 失败:", String(error).slice(0, 300));
  console.log("   坏请求:", JSON.stringify([...new Set(problems)].slice(-4)));
  process.exitCode = 1;
} finally {
  await page.screenshot({ path: "/tmp/table-save.png" });
  await app.close();
}
