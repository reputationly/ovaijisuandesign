/**
 * 表格保存回写探针（回归保护）。
 *
 * 断言三件事：
 *   1. 建表（create）成功；
 *   2. 编辑器里加一行后关闭，触发 **replace 且带 baseRevision**（曾漏掉 → 网关 409
 *      DOCUMENT_REVISION_REQUIRED，表格一个字都存不下来）；
 *   3. 磁盘上的新版本 .htable 里 rows > 0。
 *
 * 注：单元格文字输入依赖编辑器内部的 input，自动化点击不稳定；这里只验证"结构回写"，
 * 文字输入用 rows 数量代表（加行即可）。
 */
import { execFileSync } from "node:child_process";

import { launchApp } from "./launch-app.mjs";

const root = process.env.PROBE_ROOT ?? "/tmp/ov-table-save";
const app = await launchApp({ mode: "recovered", port: Number(process.env.PROBE_PORT ?? 9421), root });
const page = app.page;
const writes = [];
page.on("response", async (response) => {
  if (!response.url().includes("/api/v3/document")) return;
  let body = "";
  let sent = "";
  try { body = String(await response.text()).slice(0, 200); } catch {}
  try { sent = String(response.request().postData() ?? ""); } catch {}
  writes.push({ status: response.status(), replace: sent.includes('"mode":"replace"'), baseRevision: /"baseRevision":\d+/.test(sent), rows: (sent.match(/"rows":\s*\[/) ? sent.split('"id":"row_').length - 1 : 0) });
});

const diskRows = () => {
  const out = execFileSync("python3", ["-c", `
import glob, json, os, sqlite3, sys
root = sys.argv[1]
best = None
for db in glob.glob(root + "/*/.hilo/index.sqlite"):
    ws = os.path.dirname(os.path.dirname(db))
    try:
        con = sqlite3.connect("file:" + db + "?mode=ro", uri=True)
        rows = con.execute("select r.name, v.relative_path from resources r join resource_versions v on v.resource_id=r.resource_id where v.status='ready' and r.name like '%.htable' order by v.created_at").fetchall()
    except Exception:
        rows = []
    for name, rel in rows:
        try:
            doc = json.loads(open(os.path.join(ws, rel), encoding="utf-8").read())
            if isinstance(doc, dict):
                best = {"name": name, "rows": len(doc.get("rows") or [])}
        except Exception:
            pass
print(json.dumps(best, ensure_ascii=False))
`, root], { encoding: "utf8" }).trim();
  return JSON.parse(out || "null");
};

try {
  const pill = page.locator('[data-action-ui-id="home-sidebar.recent-pill"]').first();
  if (await pill.count()) await pill.click();
  else await page.locator("text=ws-a").first().click();
  await page.waitForTimeout(9000);

  await page.locator('[data-action-ui-id="canvas.add-node"]').first().click();
  await page.waitForTimeout(700);
  await page.locator('[data-action-ui-id="canvas.menu-add-table"]').first().click();
  await page.waitForTimeout(5000);
  await page.locator('[data-action-ui-id="canvas-v3.table-preview"]').first().dblclick({ timeout: 8000 });
  await page.waitForTimeout(4000);

  await page.getByText("添加行", { exact: false }).first().click();
  await page.waitForTimeout(1200);

  // 关闭：模态框里从后往前试按钮（× 在末尾），直到触发一次 replace 写入
  for (let step = 0; step < 4; step += 1) {
    await page.evaluate((index) => {
      const modal = document.querySelector("div.rounded-xl.shadow-2xl") ?? document.querySelector("table")?.closest("div");
      const buttons = modal ? [...modal.querySelectorAll("button")] : [];
      buttons[buttons.length - 1 - index]?.click();
    }, step);
    await page.waitForTimeout(2000);
    if (writes.some((write) => write.replace)) break;
  }

  const replace = writes.find((write) => write.replace);
  const saved = diskRows();
  console.log("写入:", JSON.stringify(writes));
  console.log("磁盘:", JSON.stringify(saved));
  const ok = Boolean(replace && replace.status === 200 && replace.baseRevision && (saved?.rows ?? 0) > 0);
  console.log(ok ? "✅ 表格 关闭→保存回写 全链路 OK" : "❌ 表格保存回写不符合预期");
  process.exitCode = ok ? 0 : 1;
} finally {
  await app.close();
}
