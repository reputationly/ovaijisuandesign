import { Injectable, Logger } from "@nestjs/common";

import { LocalSubjectService } from "../common/local-subject.service.js";
import { ProjectQueryError } from "../project-kernel/errors.js";

/**
 * 任务订阅（第 246 轮，按参照的 `TaskSubscriptions` 逐条对齐）。
 *
 * 契约（实测自参照 gateway 4.0.0 的 `TaskSubscriptions.handle`）：
 *
 *   订阅消息：
 *     { type: "task_subscribe", subscriptionId, taskIds?, includeProjectChanges? }
 *   退订消息：
 *     { type: "task_unsubscribe", subscriptionId }
 *   退订回执：
 *     { type: "task_subscription_closed", subscriptionId }
 *
 * 校验顺序与错误码：
 *   1. subscriptionId 非空字符串且 ≤128        → INVALID_ARGUMENT "Invalid subscriptionId"
 *   2. taskIds 可选；≤100 个、每个非空 ≤512    → INVALID_ARGUMENT "taskIds must contain at most 100 identifiers"
 *   3. includeProjectChanges 可选布尔           → INVALID_ARGUMENT "includeProjectChanges must be boolean"
 *   4. 同 id 但参数变了                         → SUBSCRIPTION_ID_REUSED "Subscription parameters have changed"（409）
 *   5. 每客户端 ≥20 个                          → RATE_LIMITED "Too many task subscriptions"（429）
 *
 *   与参照的**唯一有意差异**：参照第 3 步校验登录（UNAUTHENTICATED），
 *   我们移除了登录，subjectId 恒为 LocalSubjectService.getUserID()。
 */

export const MAX_SUBSCRIPTIONS_PER_CLIENT = 20;
export const MAX_TASK_IDS = 100;
export const MAX_SUBSCRIPTION_ID_LENGTH = 128;
export const MAX_TASK_ID_LENGTH = 512;

export interface TaskSubscriptionMessage {
  type: string;
  subscriptionId?: unknown;
  taskIds?: unknown;
  includeProjectChanges?: unknown;
}

export interface TaskSubscription {
  subscriptionId: string;
  subjectId: string;
  groupId?: string;
  taskIds?: Set<string>;
  includeProjectChanges: boolean;
  /** 参数指纹：同 id 换参数要报 SUBSCRIPTION_ID_REUSED */
  identity: string;
}

export type TaskSubscriptionReply =
  | { type: "task_subscription_closed"; subscriptionId: string }
  | { type: "task_subscription_ready"; subscriptionId: string; capabilities: string[] }
  | { type: "error"; error: { code: string; message: string; retryable: boolean } };

/** 每个客户端连接的订阅表 */
export class TaskSubscriptionRegistry {
  private readonly byClient = new Map<object, Map<string, TaskSubscription>>();

  size(client: object): number {
    return this.byClient.get(client)?.size ?? 0;
  }

  get(client: object, subscriptionId: string): TaskSubscription | undefined {
    return this.byClient.get(client)?.get(subscriptionId);
  }

  remove(client: object, subscriptionId: string): void {
    const subscriptions = this.byClient.get(client);
    if (!subscriptions) return;
    subscriptions.delete(subscriptionId);
    if (subscriptions.size === 0) this.byClient.delete(client);
  }

  put(client: object, subscription: TaskSubscription): void {
    let subscriptions = this.byClient.get(client);
    if (!subscriptions) {
      subscriptions = new Map();
      this.byClient.set(client, subscriptions);
    }
    subscriptions.set(subscription.subscriptionId, subscription);
  }

  dropClient(client: object): void {
    this.byClient.delete(client);
  }
}

@Injectable()
export class TaskSubscriptionsService {
  private readonly logger = new Logger(TaskSubscriptionsService.name);
  private readonly registry = new TaskSubscriptionRegistry();

  constructor(private readonly subject: LocalSubjectService) {}

  /**
   * 处理一条订阅/退订消息。
   * 返回要回给客户端的消息；抛 ProjectQueryError 时由调用方转成 error 帧。
   */
  handle(client: object, raw: TaskSubscriptionMessage): TaskSubscriptionReply {
    const subscriptionId = this.parseSubscriptionId(raw.subscriptionId);

    if (raw.type === "task_unsubscribe") {
      this.registry.remove(client, subscriptionId);
      return { type: "task_subscription_closed", subscriptionId };
    }

    const taskIds = this.parseTaskIds(raw.taskIds);
    const includeProjectChanges = this.parseIncludeProjectChanges(raw.includeProjectChanges);
    const subjectId = this.subject.getUserID();
    const groupId = this.subject.getGroupID();
    const identity = JSON.stringify({
      subjectId,
      groupId: groupId ?? null,
      ids: taskIds ? [...taskIds].sort() : null,
      includeProjectChanges,
    });

    const previous = this.registry.get(client, subscriptionId);
    if (previous && previous.identity !== identity) {
      throw new ProjectQueryError("SUBSCRIPTION_ID_REUSED", "Subscription parameters have changed", 409);
    }
    if (!previous && this.registry.size(client) >= MAX_SUBSCRIPTIONS_PER_CLIENT) {
      throw new ProjectQueryError("RATE_LIMITED", "Too many task subscriptions", 429);
    }

    this.registry.put(client, { subscriptionId, subjectId, groupId, taskIds, includeProjectChanges, identity });
    this.logger.debug(`task_subscribe ${subscriptionId} subject=${subjectId} tasks=${taskIds?.size ?? "all"}`);
    // 第 252 轮：参照的 ready 帧带 capabilities（实测 ["project_changes"]）
    return { type: "task_subscription_ready", subscriptionId, capabilities: ["project_changes"] };
  }

  dropClient(client: object): void {
    this.registry.dropClient(client);
  }

  private parseSubscriptionId(value: unknown): string {
    if (typeof value !== "string" || !value.trim() || value.length > MAX_SUBSCRIPTION_ID_LENGTH) {
      throw new ProjectQueryError("INVALID_ARGUMENT", "Invalid subscriptionId");
    }
    return value;
  }

  private parseTaskIds(value: unknown): Set<string> | undefined {
    if (value === undefined) return undefined;
    const ok =
      Array.isArray(value) &&
      value.length <= MAX_TASK_IDS &&
      value.every((id) => typeof id === "string" && id.trim().length > 0 && id.length <= MAX_TASK_ID_LENGTH);
    if (!ok) {
      throw new ProjectQueryError("INVALID_ARGUMENT", "taskIds must contain at most 100 identifiers");
    }
    return new Set(value as string[]);
  }

  private parseIncludeProjectChanges(value: unknown): boolean {
    if (value === undefined) return false;
    if (typeof value !== "boolean") {
      throw new ProjectQueryError("INVALID_ARGUMENT", "includeProjectChanges must be boolean");
    }
    return value;
  }
}
