import { launchApp } from "./launch-app.mjs";
const root = "/tmp/ov-conn";
const app = await launchApp({ mode: "recovered", port: 9396, root, reset: false });
const page = app.page;
await page.waitForTimeout(5000);
const pill = page.locator('[data-action-ui-id="home-sidebar.recent-pill"]').first();
if (await pill.count()) await pill.click();
await page.waitForTimeout(6000);
await page.screenshot({ path: "/tmp/drag-0.png" });
const nodes = page.locator(".react-flow__node");
console.log("nodes", await nodes.count());
const box = await nodes.first().boundingBox();
const handles = page.locator(".react-flow__handle");
const hb = await handles.nth(0).boundingBox();
console.log("handle box", JSON.stringify(hb), "node box", JSON.stringify(box));
if (hb) {
  // 按下 handle 并移动，不松开 → 看连接线是否跟着光标
  await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
  await page.mouse.down();
  await page.mouse.move(hb.x + 260, hb.y + 180, { steps: 12 });
  await page.waitForTimeout(400);
  const mid = await page.evaluate(() => {
    const path = document.querySelector(".react-flow__connection-path, .react-flow__connection") ;
    return { connectionPath: path ? (path.getAttribute("d") || "").slice(0, 120) : null, html: document.querySelectorAll(".react-flow__connection").length };
  });
  console.log("mid-drag", JSON.stringify(mid));
  await page.screenshot({ path: "/tmp/drag-mid.png" });
  await page.mouse.up();
}
await page.waitForTimeout(500);
// 拖节点看吸附导线
if (box) {
  await page.mouse.move(box.x + box.width / 2, box.y + 12);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 40, box.y + 60, { steps: 15 });
  await page.waitForTimeout(300);
  const guides = await page.evaluate(() => document.querySelectorAll('[data-canvas-alignment-guide], .alignment-guide, [class*="guide"]').length);
  console.log("guides during drag:", guides);
  await page.screenshot({ path: "/tmp/drag-guides.png" });
  await page.mouse.up();
}
await app.close?.();
