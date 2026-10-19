/**
 * 合成体（composition）与合成指令的枚举。
 *
 * 「合成体」是一次创作里把若干素材/资源按顺序组合起来的容器。它有自己的类型体系
 * （用户可注册类型）、生命周期、成员顺序，以及一套**指令**——所有修改都表达成指令，
 * 而不是直接改字段：这样服务端可以按 `composition_revision` 判冲突、
 * 前端也能做乐观更新和重放。
 *
 * 这里全是**稳定串值**，会进请求体和历史记录，改一个字母就是「指令不认识」。
 */

/** 合成体的生命周期。`deleted` 是软删，靠 `RESTORE` 指令恢复。 */
export enum CompositionLifecycle {
  ACTIVE = "active",
  DELETED = "deleted",
}

/**
 * 排序位置的上限。
 *
 * 用「相邻两项取中值」插入新成员，位置必须是整数；反复在中点插入会很快耗尽精度，
 * 所以到上限时服务端会做一次重排。这个值要和服务端一致。
 */
export const COMPOSITION_POSITION_MAX = 1e9;

/** 合成体指令。`composition_type.*` 是指令类型本身（注册/改名），不是对某个合成体的操作。 */
export enum CompositionCommandType {
  CREATE = "composition.create",
  APPLY = "composition.apply",
  RENAME = "composition.rename",
  SET_TYPE = "composition.set_type",
  SET_ATTRIBUTES = "composition.set_attributes",
  SET_LIFECYCLE = "composition.set_lifecycle",
  RESTORE = "composition.restore",
  TYPE_REGISTER = "composition_type.register",
  TYPE_RENAME = "composition_type.rename",
  MOVE = "composition.move",
  DUPLICATE = "composition.duplicate",
}

/** 成员级操作（`APPLY` 指令里带的那部分）。 */
export enum CompositionOperationType {
  MEMBER_ADD = "member.add",
  MEMBER_REMOVE = "member.remove",
  MEMBER_UPDATE = "member.update",
  MEMBER_MOVE = "member.move",
}

/** 冲突种类。目前只有「版本对不上」一种。 */
export enum CompositionConflictKind {
  REVISION = "composition_revision",
}

/** 冲突的处置方式：自动重试，或交用户决定。 */
export enum CompositionConflictResolution {
  RETRY = "retry",
  USER_DECISION = "user_decision",
}

/** 列表排序字段。 */
export enum CompositionOrderField {
  CREATED_AT = "createdAt",
  UPDATED_AT = "updatedAt",
  POSITION = "position",
}

/** 排序方向。 */
export enum CompositionOrderDirection {
  ASC = "asc",
  DESC = "desc",
}
