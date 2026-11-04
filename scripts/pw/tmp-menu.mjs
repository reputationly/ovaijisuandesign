import { launchApp } from "./launch-app.mjs";
const app = await launchApp({ mode: "recovered", port: 9401, root: "/tmp/ov-conn", reset: false });
const page = app.page;
await page.waitForTimeout(5000);
const pill = page.locator('[data-action-ui-id="home-sidebar.recent-pill"]').first();
if (await pill.count()) await pill.click();
await page.waitForTimeout(7000);
console.log("plus count:", await page.locator(".node-handle-plus").count());
const pane = page.locator(".react-flow__pane").first();
const pb = await pane.boundingBox();
if (pb) { await page.mouse.dblclick(pb.x + 120, pb.y + 400); await page.waitForTimeout(1200); }
const menu = await page.evaluate(() => ({
  items: [...document.querySelectorAll('[data-action-ui-id*="add"], [role="menu"] [role="menuitem"]')].slice(0, 8).map((e) => (e.textContent || "").trim().slice(0, 20)),
  anyMenu: document.querySelectorAll('[role="menu"]').length,
}));
console.log("dblclick menu:", JSON.stringify(menu));
await page.screenshot({ path: "/tmp/addmenu.png" });
await app.close?.();
