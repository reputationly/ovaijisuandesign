import { createApp } from "./bootstrap.js";

/**
 * 入口。由 Electron 主进程以 `ELECTRON_RUN_AS_NODE=1` 拉起，
 * 也能直接 `node dist/main.js` 跑。
 *
 * 环境变量：`PORT`（默认 8001）、`HILO_GATEWAY_HOST`（默认 127.0.0.1）、
 * `GATEWAY_NONCE`、`HILO_GATEWAY_ROLE`（workspace 时必须有 `WORKSPACE_DIR`）……
 */
async function main() {
  const role = process.env.HILO_GATEWAY_ROLE;
  if (role === "workspace" && !process.env.WORKSPACE_DIR) {
    // 拒绝启动：workspace gateway 没有工作区就什么都做不了，
    // 起来了只会对每个请求回莫名其妙的错。
    console.error("HILO_GATEWAY_ROLE=workspace 但没有 WORKSPACE_DIR");
    process.exit(1);
  }
  const app = await createApp();
  const port = Number(process.env.PORT ?? 8001);
  const host = process.env.HILO_GATEWAY_HOST ?? "127.0.0.1";
  await app.listen(port, host);
  // 超时放到约 310 分钟：生成任务的长请求（视频）会超过 Node 默认值。
  const server = app.getHttpServer();
  const long = 310 * 60 * 1000;
  server.requestTimeout = long;
  server.headersTimeout = long;
  server.keepAliveTimeout = long;
  console.log(`gateway listening on http://${host}:${port}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
