import { describe, expect, it } from "bun:test"

import {
  allDone,
  currentStage,
  nextAction,
  progressOf,
  stateLabel,
  type Plan,
  type Stage,
  type StageState,
} from "./plan"

const stage = (
  id: string,
  order: number,
  state: StageState,
  items: [string, boolean][] = [],
): Stage => ({
  id,
  name: id,
  order,
  state,
  work_items: items.map(([t, done], i) => ({ id: `${id}-${i}`, title: t, done })),
})

const plan = (...stages: Stage[]): Plan => ({
  id: "p",
  goal: "做个短片",
  revision: 1,
  stages,
})

describe("当前阶段", () => {
  it("按 order 排序后第一个没结束的", () => {
    // 和后端 `Plan::next_stage` 同一个判据 —— 两边不一致的话，面板上
    // 高亮的阶段和 agent 正在做的不是同一个。
    const p = plan(
      stage("c", 3, "pending"),
      stage("a", 1, "completed"),
      stage("b", 2, "in_progress"),
    )
    expect(currentStage(p)?.id).toBe("b")
  })

  it("skipped / failed 也算结束", () => {
    expect(currentStage(plan(stage("a", 1, "skipped"), stage("b", 2, "pending")))?.id).toBe("b")
    expect(currentStage(plan(stage("a", 1, "failed"), stage("b", 2, "pending")))?.id).toBe("b")
  })

  it("全部结束时没有当前阶段", () => {
    const p = plan(stage("a", 1, "completed"), stage("b", 2, "skipped"))
    expect(currentStage(p)).toBeUndefined()
    expect(allDone(p)).toBe(true)
  })

  it("空计划不算做完——那是还没规划", () => {
    expect(allDone(plan())).toBe(false)
  })
})

describe("下一步动作", () => {
  it("还没开工 → 确认执行计划", () => {
    const a = nextAction(plan(stage("分镜", 1, "pending")))
    expect(a?.label).toBe("继续")
    expect(a?.message).toBe('确认"分镜"的执行计划，请开始执行。')
  })

  it("做完了且后面还有 → 确认产物、进下一阶段", () => {
    const a = nextAction(
      plan(
        stage("分镜", 1, "in_progress", [["画 A", true], ["画 B", true]]),
        stage("成片", 2, "pending"),
      ),
    )
    expect(a?.message).toBe('确认"分镜"的产物，请继续下一阶段。')
  })

  it("最后一个阶段做完 → 完成制作", () => {
    const a = nextAction(plan(stage("成片", 1, "in_progress", [["渲染", true]])))
    expect(a?.label).toBe("完成制作")
    expect(a?.message).toBe('确认"成片"的最终产物，请完成制作。')
  })

  it("做到一半不给「继续」", () => {
    // **给了的话用户点下去等于在说"这一步我确认了"**,而它还没做完 ——
    // agent 会带着半成品进入下一阶段。
    expect(
      nextAction(plan(stage("分镜", 1, "in_progress", [["画 A", true], ["画 B", false]]))),
    ).toBeNull()
  })

  it("受阻时不给「继续」", () => {
    expect(nextAction(plan(stage("分镜", 1, "blocked", [["画 A", true]])))).toBeNull()
  })

  it("没有 work item 的进行中阶段也不给 —— 判断不出做没做完", () => {
    expect(nextAction(plan(stage("分镜", 1, "in_progress")))).toBeNull()
  })

  it("全部做完时没有动作", () => {
    expect(nextAction(plan(stage("a", 1, "completed")))).toBeNull()
  })
})

describe("状态文案", () => {
  it("照官方 productionPlan.status.*", () => {
    expect(stateLabel("pending")).toBe("待规划")
    expect(stateLabel("in_progress")).toBe("进行中")
    expect(stateLabel("completed")).toBe("已完成")
    expect(stateLabel("blocked")).toBe("受阻")
  })

  it("官方没有的两个状态各给各的，不硬塞", () => {
    // 把失败显示成「受阻」的话，用户以为是"在等什么东西"——
    // 而实际是"这一步没做成"。
    expect(stateLabel("failed")).toBe("失败")
    expect(stateLabel("skipped")).toBe("已跳过")
  })
})

describe("进度", () => {
  it("数打钩的", () => {
    expect(progressOf(stage("a", 1, "in_progress", [["x", true], ["y", false]]))).toEqual({
      done: 1,
      total: 2,
    })
  })
  it("没有 work item 时不显示", () => {
    expect(progressOf(stage("a", 1, "in_progress"))).toBeNull()
  })
})
