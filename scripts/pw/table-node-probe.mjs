/**
 * 表格节点探针：验「+ → 表格 → 双击卡片 → 表格编辑器」这一条链到底通不通。
 *
 * 用法：
 *   HILO_PROJECT_ARCHITECTURE=resource_v3 node scripts/pw/table-node-probe.mjs
 *
 * 前置：`pnpm --filter @ov/renderer build` + `pnpm --filter @ov/gateway build`
 * （开发态主进程直接加载 `app/gateway/dist/main.js`，不用打包）。
 *
 * 为什么这样取证：
 *   - 画布文档直接读工作区 sqlite，不用渲染层状态自证；
 *   - `dblclick` 只会向**上**冒泡，打在节点外层碰不到内部的 `onDoubleClick` 宿主，
 *     必须打在 `[data-action-ui-id="canvas-v3.table-preview"]` 上；
 *   - 建节点、开编辑器、界面报错分三步打印，任何一步失败都能看出是哪一段。
 */
import { execFileSync } from "node:child_process";

import { launchApp } from "./launch-app.mjs";

const port = Number(process.env.PROBE_PORT ?? 9415);
const root = "/tmp/ov-table-probe";
const app = await launchApp({ mode: "recovered", port, root });
const page = app.page;
const problems = [];

page.on("console", (message) => {
  if (message.type() === "error" || message.type() === "warning") problems.push(`console.${message.type()}: ${message.text().slice(0, 400)}`);
});
page.on("pageerror", (error) => problems.push(`pageerror: ${String(error).slice(0, 400)}`));
page.on("response", (response) => {
  if (response.status() >= 400 && response.url().includes("/api/")) problems.push(`http ${response.status()} ${response.url().replace(/^.*?(\/api[^?]*).*$/, "$1")}`);
});

/** 每个工作区的画布节点，直接读 sqlite。 */
const canvases = () => JSON.parse(execFileSync("python3", ["-c", `
import glob,json,sqlite3,sys
report={}
for file in glob.glob(sys.argv[1] + "/*/.hilo/canvas-v3/state.sqlite"):
    db=sqlite3.connect("file:"+file+"?mode=ro",uri=True)
    row=db.execute("select json from document").fetchone()
    doc=json.loads(row[0]) if row else {}
    report[file.split("/")[-4]]=[{k: node.get(k) for k in ("id","kind","size","compositionId","activeItem")} for node in (doc.get("nodes") or {}).values()]
print(json.dumps(report, ensure_ascii=False))
`, root], { encoding: "utf8" }));

const tableNode = () =>
  Object.values(canvases()).flat().find((node) => node.kind === "composition" && node.size?.height === 200 && node.activeItem);

let failed = false;
try {
  const pill = page.locator('[data-action-ui-id="home-sidebar.recent-pill"]').first();
  if (await pill.count()) await pill.click();
  else await page.locator("text=ws-a").first().click();
  await page.waitForTimeout(9000);

  // 1. 「+」→ 表格
  await page.locator('[data-action-ui-id="canvas.add-node"]').first().click();
  await page.waitForTimeout(900);
  const tableItem = page.locator('[data-action-ui-id="canvas.menu-add-table"]').first();
  if (!(await tableItem.count())) throw new Error("「+」菜单里没有表格项");
  if (await tableItem.evaluate((node) => node.getAttribute("aria-disabled") === "true" || node.getAttribute("data-disabled") !== null)) {
    throw new Error("表格菜单项不可用：父级没有提供 tableStorage");
  }
  await tableItem.click();
  await page.waitForTimeout(5000);

  const created = tableNode();
  console.log("① 建节点:", created ? `OK ${JSON.stringify(created)}` : "失败（画布上没有表格节点）");
  if (!created) failed = true;
  await page.screenshot({ path: "/tmp/table-probe-1-created.png" });

  // 适应视图，让卡片完整可见（右下角有对话面板，默认会裁掉）
  await page.keyboard.press("Shift+1");
  await page.waitForTimeout(1500);

  // 2. 双击预览 → 表格编辑器（dblclick 只向上冒泡，必须打在预览元素上）
  const preview = page.locator('[data-action-ui-id="canvas-v3.table-preview"]').first();
  if (!(await preview.count())) throw new Error("卡片上没有 table-preview");
  await preview.evaluate((element) => {
    const box = element.getBoundingClientRect();
    element.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, cancelable: true, clientX: box.x + box.width / 2, clientY: box.y + box.height / 2 }));
  });
  await page.waitForTimeout(4000);

  const editor = await page.evaluate(() => ({
    editorOpen: document.querySelectorAll('[data-action-ui-id="canvas-v3-table-editor"]').length,
    addRow: document.body.innerText.includes("添加行"),
    previewText: (document.querySelector('[data-action-ui-id="canvas-v3.table-preview"]')?.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 80),
  }));
  console.log("② 编辑器:", editor.editorOpen > 0 ? `OK ${JSON.stringify(editor)}` : `失败 ${JSON.stringify(editor)}`);
  if (editor.editorOpen === 0) failed = true;
  await page.screenshot({ path: "/tmp/table-probe-2-editor.png" });

  console.log("③ 界面问题:", problems.length ? JSON.stringify(problems, null, 1) : "无");
} finally {
  await app.close();
}

if (failed) process.exitCode = 1;
