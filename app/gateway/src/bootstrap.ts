import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { WsAdapter } from "@nestjs/platform-ws";

import { AppModule } from "./app.module.js";
import { workspaceIdentityMiddleware } from "./common/workspace-identity.js";
import { GatewayConfig } from "./config/gateway-config.js";

/**
 * 建应用但不监听。测试和 main.ts 共用。
 *
 * Express（platform-express），**没有全局前缀** —— 控制器
 * 自己写 `api/...`，另外还有 `files/*` 这类不带 api 的路由；`/ws` 用
 * `@nestjs/platform-ws`（底层 ws 8），不是 socket.io。
 */
export async function createApp(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true, logger: ["error", "warn", "log"] });
  app.useWebSocketAdapter(new WsAdapter(app));
  app.enableCors({
    // 没有 Origin 的请求（本机进程）、app://（渲染层）、localhost / 127.0.0.1 放行。
    origin: (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => {
      if (!origin) return cb(null, true);
      try {
        const u = new URL(origin);
        const ok = u.protocol === "app:" || u.hostname === "localhost" || u.hostname === "127.0.0.1";
        cb(null, ok);
      } catch {
        cb(null, false);
      }
    },
    credentials: true,
  });
  app.use(workspaceIdentityMiddleware(app.get(GatewayConfig).workspaceIdentity));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
  return app;
}
