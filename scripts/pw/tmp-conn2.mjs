import { launchApp } from "./launch-app.mjs";
const app = await launchApp({ mode: "recovered", port: 9398, root: "/tmp/ov-conn", reset: false });
const page = app.page;
await page.waitForTimeout(5000);
const pill = page.locator('[data-action-ui-id="home-sidebar.recent-pill"]').first();
if (await pill.count()) await pill.click();
await page.waitForTimeout(7000);
const src = page.locator(".react-flow__handle.canvas-v3-source").first();
const tgt = page.locator(".react-flow__handle.canvas-v3-target").nth(1);
const sb = await src.boundingBox(); const tb = await tgt.boundingBox();
console.log("src", JSON.stringify(sb), "tgt", JSON.stringify(tb));
if (sb && tb) {
  await page.mouse.move(sb.x + 3, sb.y + 3);
  await page.mouse.down();
  await page.waitForTimeout(150);
  const started = await page.evaluate(() => document.querySelectorAll(".react-flow__connectionline, .react-flow__connection, svg.react-flow__connectionline").length);
  console.log("connectionline elements right after down:", started);
  await page.mouse.move(tb.x + 3, tb.y + 3, { steps: 20 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: "/tmp/conn-drag.png" });
  await page.mouse.up();
  await page.waitForTimeout(800);
}
const after = await page.evaluate(() => ({ edges: document.querySelectorAll(".react-flow__edge").length, paths: document.querySelectorAll(".react-flow__edge-path, path.react-flow__edge-path").length }));
console.log("after", JSON.stringify(after));
await page.screenshot({ path: "/tmp/conn-done.png" });
await app.close?.();
