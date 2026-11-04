import { launchApp } from "./launch-app.mjs";
const app = await launchApp({ mode: "recovered", port: 9400, root: "/tmp/ov-conn", reset: false });
const page = app.page;
await page.waitForTimeout(5000);
const pill = page.locator('[data-action-ui-id="home-sidebar.recent-pill"]').first();
if (await pill.count()) await pill.click();
await page.waitForTimeout(7000);
const node = page.locator(".react-flow__node").first();
const nb = await node.boundingBox();
if (nb) { await page.mouse.move(nb.x + nb.width / 2, nb.y + nb.height / 2); await page.waitForTimeout(600); }
const plus = page.locator(".node-handle-plus").first();
const pb = await plus.boundingBox();
console.log("plus box", JSON.stringify(pb));
if (pb) {
  await page.mouse.move(pb.x + pb.width / 2, pb.y + pb.height / 2);
  await page.waitForTimeout(300);
  await page.screenshot({ path: "/tmp/plus-hover.png" });
  await page.mouse.down();
  await page.waitForTimeout(150);
  const started = await page.evaluate(() => document.querySelectorAll(".react-flow__connectionline, .react-flow__connection").length);
  console.log("connection elements after down:", started);
  await page.mouse.move(pb.x + pb.width / 2 + 200, pb.y + pb.height / 2 + 220, { steps: 20 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: "/tmp/plus-drag.png" });
  const mid = await page.evaluate(() => document.querySelectorAll(".react-flow__connectionline, .react-flow__connection").length);
  console.log("during drag:", mid);
  await page.mouse.up();
  await page.waitForTimeout(600);
}
await app.close?.();
