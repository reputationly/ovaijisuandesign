import { Injectable } from "@nestjs/common";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

/**
 * 本地主体（第 246 轮）。
 *
 * 参考的 TokenService 从 `$TMPDIR/minimax-hub-gateway-{token,user-id}` 读凭据，
 * 没有就回 null，从而让需要登录的接口回 UNAUTHENTICATED。
 *
 * 本项目**移除了登录**，所以这里不引入 token 概念：
 * - 如果临时目录里有参照格式的文件，就沿用其中的 user-id（方便与参照对照）；
 * - 否则用常量 `"local"`。**永远不会返回 null**，因为我们本来就不要求登录。
 *
 * 这样 `task_subscribe` 的 subjectId 始终有值，
 * 与 HTTP 侧 `/api/v3/tasks` 无鉴权守卫的做法保持一致。
 */
@Injectable()
export class LocalSubjectService {
  private readonly persistedUser: string | null;

  constructor() {
    this.persistedUser = LocalSubjectService.readPersisted("minimax-hub-gateway-user-id");
  }

  private static readPersisted(name: string): string | null {
    try {
      const value = readFileSync(path.join(tmpdir(), name), "utf-8").trim();
      return value || null;
    } catch {
      return null;
    }
  }

  /** 当前主体 id；登录已移除，所以恒有值。 */
  getUserID(): string {
    return this.persistedUser ?? "local";
  }

  /** 群组 id；我们没有群组概念，恒为 undefined。 */
  getGroupID(): string | undefined {
    return undefined;
  }
}
