#!/usr/bin/env node
/**
 * 任务卡片冒烟：连接已启动的 Electron CDP（默认 9360），在消息列表 hash 夹具下截图。
 *
 * 这不是交接文档要求的完整「参照 vs 我方 + 假 provider」场景；它只验证本仓库的
 * 卡片能在真实渲染层挂载、渲染 fixture 数据。完整场景需要先有会话消息种子。
 */
import { mkdirSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";

const endpoint = process.env.PW_CDP_ENDPOINT ?? "http://127.0.0.1:9360";
const out = path.resolve(process.env.PW_OUT ?? `.probe/pw/design-execute/${new Date().toISOString().replace(/[:.]/g, "-")}`);
const workspaceId = process.env.PW_WORKSPACE ?? "/tmp/ov-cmp/ws-a";
mkdirSync(out, { recursive: true });
const browser = await chromium.connectOverCDP(endpoint);
const context = browser.contexts()[0];
const page = context.pages().find((item) => item.url().startsWith("app://"));
if (!page) throw new Error("没有找到 app:// 页面");
await page.goto(`app://./workspace?workspaceId=${encodeURIComponent(workspaceId)}#__ov-test-design-execute`);
await page.waitForSelector('[data-testid="design-execute-fixture"] [data-action-ui-id="chat-design-execute"]', { timeout: 30_000 });
const ids = await page.$$eval('[data-testid="design-execute-fixture"] [data-action-ui-id]', (nodes) => nodes.map((node) => node.getAttribute("data-action-ui-id")));
await page.screenshot({ path: path.join(out, "design-execute-card.png"), fullPage: true });
await browser.close();
console.log(JSON.stringify({ out, ids }, null, 2));
