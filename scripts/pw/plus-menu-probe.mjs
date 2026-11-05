/**
 * 节点右侧悬浮「+」探针：干净工作区建一个节点 → 点右侧热区 → 断言添加菜单展开。
 * 回归保护：热区 click 若不 stopPropagation，会冒泡到画布被 `setMenu(null)` 关掉，
 * 表现就是「+ 点了没反应」（真机 bug，2026-11-06 修）。
 */
import { launchApp } from "./launch-app.mjs";

const app = await launchApp({ mode: "recovered", port: Number(process.env.PROBE_PORT ?? 9419), root: "/tmp/ov-plus-clean" });
const page = app.page;

try {
  const pill = page.locator('[data-action-ui-id="home-sidebar.recent-pill"]').first();
  if (await pill.count()) await pill.click();
  else await page.locator("text=ws-a").first().click();
  await page.waitForTimeout(9000);

  await page.locator('[data-action-ui-id="canvas.add-node"]').first().click();
  await page.waitForTimeout(700);
  await page.locator('[data-action-ui-id="canvas.menu-add-text"]').first().click();
  await page.waitForTimeout(4000);
  console.log("节点数:", await page.locator(".react-flow__node").count());
  console.log("节点类型:", await page.evaluate(() => [...document.querySelectorAll(".react-flow__node")].map((n) => n.getAttribute("data-id")?.slice(0, 10) + ":" + (n.textContent || "").trim().slice(0, 10))));


  const spot = await page.evaluate(() => {
    const zone = [...document.querySelectorAll("[data-canvas-plus-zone]")].find((candidate) => {
      const rect = candidate.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      if (cx < 40 || cy < 40 || cx > innerWidth - 40 || cy > innerHeight - 40) return false;
      const hit = document.elementFromPoint(cx, cy);
      return hit ? candidate.contains(hit) || hit === zone : false;
    });
    if (!zone) return null;
    const rect = zone.getBoundingClientRect();
    return { cx: rect.left + rect.width / 2, cy: rect.top + rect.height / 2 };
  });
  console.log("可点热区:", JSON.stringify(spot));
  if (spot) {
    await page.mouse.move(spot.cx, spot.cy);
    await page.waitForTimeout(700);
    await page.mouse.down();
    await page.waitForTimeout(80);
    await page.mouse.up();
    await page.waitForTimeout(1800);
    const menu = await page.evaluate(() => {
      const items = [...document.querySelectorAll('[data-action-ui-id^="canvas.menu-add-"]')].map((node) => (node.textContent || "").trim().slice(0, 8));
      const popups = [...document.querySelectorAll('[role="menu"], [data-menu], [data-slot="menu-popup"], [data-side], [data-ending-style]')]
        .map((node) => ({ tag: node.tagName, role: node.getAttribute("role"), menu: node.getAttribute("data-menu"), text: (node.textContent || "").replace(/\s+/g, " ").trim().slice(0, 30) }))
        .filter((node) => node.text);
      return { items, popups: popups.slice(0, 6) };
    });
    console.log("添加菜单:", JSON.stringify(menu));
    console.log("弹出层:", JSON.stringify(menu.popups ?? []));
    console.log((menu.items ?? []).length ? "✅「+」能打开添加菜单" : "❌ 菜单没出现");
  }
  await page.screenshot({ path: "/tmp/plus-clean.png" });
} finally {
  await app.close();
}
