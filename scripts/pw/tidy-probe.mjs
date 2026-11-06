/** 真机验「整理」：选多个节点 → 点整理 → 比对 sqlite 里的坐标。 */
import { execFileSync } from "node:child_process";
import { chromium } from "playwright-core";

const WS = process.env.PROBE_WORKSPACE ?? "/Users/reputationly/Movies/蒜狸小助手/Projects/Opening Title｜60秒、2-8";
const browser = await chromium.connectOverCDP("http://127.0.0.1:9435");
const page = browser.contexts().flatMap((c) => c.pages()).find((p) => p.url().startsWith("app://"));
const positions = () => JSON.parse(execFileSync("python3", ["-c", `
import sqlite3, json, sys
d = json.loads(sqlite3.connect("file:" + sys.argv[1] + "/.hilo/canvas-v3/state.sqlite?mode=ro", uri=True).execute("select json from document").fetchone()[0])
print(json.dumps({k: [round(v["position"]["x"], 1), round(v["position"]["y"], 1)] for k, v in (d.get("nodes") or {}).items()}))
`, WS], { encoding: "utf8" }));

try {
  if (!decodeURIComponent(page.url()).includes("2-8")) {
    console.log("导航到项目…");
    await page.goto(`app://./workspace?workspaceId=${encodeURIComponent(WS)}`, { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForTimeout(12000);
  }
  console.log("URL:", decodeURIComponent(page.url()).slice(0, 80));
  console.log("节点数:", await page.locator(".react-flow__node").count());

  // 直接点两个在视口内的节点（第一个正常点，第二个按住 Shift）
  const targets = await page.evaluate(() => [...document.querySelectorAll(".react-flow__node")]
    .map((node) => { const rect = node.getBoundingClientRect(); return { rect, id: node.getAttribute("data-id") }; })
    .filter(({ rect }) => rect.left > 20 && rect.top > 20 && rect.right < innerWidth - 20 && rect.bottom < innerHeight - 20)
    .map(({ rect, id }) => ({ id, x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 })));
  console.log("视口内节点:", targets.length);
  if (targets[0]) await page.mouse.click(targets[0].x, targets[0].y);
  await page.waitForTimeout(500);
  if (targets[1]) {
    await page.keyboard.down("Meta");
    await page.mouse.click(targets[1].x, targets[1].y);
    await page.keyboard.up("Meta");
  }
  await page.waitForTimeout(900);
  const selected = await page.locator(".react-flow__node.selected").count();
  console.log("选中:", selected, "| 明细:", await page.evaluate(() => [...document.querySelectorAll(".react-flow__node.selected")].map((n) => n.getAttribute("data-id")?.slice(0, 8))));

  const before = positions();
  const tidy = page.locator('[data-action-ui-id="canvas.toolbar-tidy"]').first();
  console.log("整理控件:", await tidy.count());
  await tidy.click({ timeout: 8000 });
  await page.waitForTimeout(1200);
  const menu = await page.evaluate(() => [...document.querySelectorAll('[role="menuitem"], [data-action-ui-id]')]
    .filter((n) => /整理|排列|tidy|网格|水平|垂直/.test((n.textContent || "") + (n.getAttribute("data-action-ui-id") || "")))
    .map((n) => ({ id: n.getAttribute("data-action-ui-id"), text: (n.textContent || "").trim().slice(0, 12) }))
    .slice(0, 10));
  console.log("菜单:", JSON.stringify(menu));

  // 单节点也能整理：打开「含依赖」让目标变成整条依赖链
  const includeDeps = page.locator('[data-action-ui-id="canvas.toolbar-tidy-include-deps"]').first();
  if (await includeDeps.count()) {
    const pressed = await includeDeps.getAttribute("aria-checked").catch(() => null);
    console.log("含依赖控件 aria-checked:", pressed);
    if (pressed !== "true") await includeDeps.click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(600);
  }
  const pick = menu.find((item) => /grid|网格|水平/.test(`${item.id} ${item.text}`)) ?? menu[0];
  if (pick?.id) {
    await page.locator(`[data-action-ui-id="${pick.id}"]`).first().click({ timeout: 6000 }).catch((e) => console.log("点选项失败:", String(e).slice(0, 60)));
    await page.waitForTimeout(4000);
  }
  const after = positions();
  const moved = Object.keys(before).filter((id) => before[id] && after[id] && (before[id][0] !== after[id][0] || before[id][1] !== after[id][1]));
  console.log("位移节点数:", moved.length, "| 示例:", moved.slice(0, 3).map((id) => `${id.slice(0, 6)} ${JSON.stringify(before[id])}→${JSON.stringify(after[id])}`));
  console.log(moved.length ? "✅ 整理真的重排了" : "❌ 没有位移");
  await page.screenshot({ path: "/tmp/tidy-after.png" });
} catch (error) {
  console.log("❌ 探针失败:", String(error).slice(0, 200));
} finally {
  await browser.close();
}
