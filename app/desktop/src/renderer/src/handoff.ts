/**
 * 首页 → 画布的交接。
 *
 * 首页发送要做两件事：**建一张新画布**，然后**把提示词和附件带过去**。
 * 第一件成功、第二件失败时，如果只是简单地报个错让用户重试，那次重试会
 * 再建一张 —— 用户看到侧边栏里多出一堆空画布，完全不知道是哪来的。
 *
 * 所以建好之后立刻记下 `{key, id}`：key 相同的重试**复用那张**，
 * 只重做没走完的部分。对应官方的 `pendingWorkspaceHandoffRef`
 * （`key` / `initialPayloadId` / `runtime` 那一组）。
 *
 * 抽成纯函数是为了能测。这个不变量只在"新建成功但后续失败"这条罕见路径上
 * 才体现出来，靠手点几乎撞不到。
 */

export type Handoff = { key: string; id: string }

/**
 * 一次提交的身份。
 *
 * **附件要参与**：同一句提示词换一批参考图是另一次创作，复用上一张画布
 * 会把两次的素材混在一起。
 */
export function handoffKey(prompt: string, attachments: readonly string[]): string {
  return JSON.stringify({ prompt, attachments })
}

export type SubmitResult =
  | { ok: true; id: string; pending: null }
  | { ok: false; pending: Handoff | null; error: unknown }

/**
 * 跑一次首页提交。
 *
 * `create` 只在没有可复用的交接时被调用 —— 这是整件事的重点。
 * `activate` 是"切过去并把提示词带上"，它失败时新建出来的那张要留在
 * `pending` 里。
 */
export async function submitHandoff(opts: {
  pending: Handoff | null
  key: string
  create: () => Promise<string>
  activate: (id: string) => Promise<void>
}): Promise<SubmitResult> {
  const { pending, key, create, activate } = opts
  const reuse = pending?.key === key ? pending : null
  let carry: Handoff | null = reuse

  try {
    let id: string
    if (reuse) {
      id = reuse.id
    } else {
      id = await create()
      // **建好就立刻记**，在 activate 之前。activate 抛出去之后这个赋值
      // 就不会执行了 —— 而那正是需要它的时刻。
      carry = { key, id }
    }
    await activate(id)
    return { ok: true, id, pending: null }
  } catch (error) {
    // `create` 自己失败时 carry 还是 null：什么都没建出来，没有可复用的东西。
    // 这时把上一次别的提交留下的 pending 传回去会张冠李戴。
    return { ok: false, pending: carry, error }
  }
}
