import { type MiddlewareConsumer, Module, type NestModule } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";

import { ActivityService } from "./activity.service.js";
import { HealthController } from "./health.controller.js";

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

@Module({ controllers: [HealthController], providers: [ActivityService], exports: [ActivityService] })
export class HealthModule implements NestModule {
  constructor(private readonly activity: ActivityService) {}

  /**
   * 给所有写请求计数；挂起租约生效期间拒绝新的写请求。健康检查自己不算，
   * 否则主进程的探测会把自己数成"有活"。
   */
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply((req: Request, res: Response, next: NextFunction) => {
        const url = req.originalUrl ?? req.url;
        if (!MUTATING.has(req.method) || url.startsWith("/api/health")) return next();
        if (this.activity.draining) {
          res.status(503).json({ code: "WORKSPACE_SUSPENDING", message: "workspace is being suspended" });
          return;
        }
        const end = this.activity.begin(url.startsWith("/api/generate") ? "generate" : "other");
        res.once("finish", end);
        res.once("close", end);
        next();
      })
      .forRoutes("*");
  }
}
