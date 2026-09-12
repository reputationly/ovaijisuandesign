import { ArrowUp, Box, Check, FileText, Loader2, Plus, Puzzle, Settings2, X } from "lucide-react"
import { useEffect, useRef, useState, type ReactNode, useMemo } from "react"

import {
  groupParams,
  mergeValues,
  optionLabel,
  perModality,
  toPayload,
  type ParamGroup,
  type ParamValues,
} from "./params"
import {
  agentSend,
  getCapabilities,
  getSkill,
  listSkills,
  platformModels,
  uploadFiles,
  type PlatformModel,
} from "./api"


type Phase =
  | { kind: "idle" }
  | { kind: "generating"; seconds: number }
  | { kind: "placing" }
  | { kind: "failed"; message: string }

/**
 * 生成面板。
 *
 * ```text
 * 出图 + 落盘   我们的 gateway（内部借上游的 import-url 收进工作区）
 * 建节点        /api/canvas/media-node
 * ```
 *
 * 前端只知道"提交 → 轮询 → 拿到一个工作区路径 → 建节点" —— 这正是官方
 * 契约的形状。落盘藏在 gateway 里，等自己的资产库写完，前端一行都不用改。
 */
export function Generate({
  onDone,
  autoFocus,
  initial,
  initialAttachments,
  onConsumed,
  autoSend,
  onAutoSent,
}: {
  onDone: () => void
  autoFocus?: boolean
  /**
   * 首页带过来的参考素材（工作区相对路径）。
   *
   * **非空就是图生图。** gateway 那边按 `image_paths` 非空分叉，
   * 见 `generate.rs::submit_image`。
   */
  initialAttachments?: string[]
  /** 播种完就通知父组件清掉 —— 那两个是"交接一次"的量。 */
  onConsumed?: () => void
  /** 播种并**立刻发出去**。制作计划的「继续」用它。 */
  autoSend?: string
  /** 发完通知父组件清掉 —— 不清的话重挂时会再发一遍。 */
  onAutoSent?: () => void
  /**
   * 从首页带过来的提示词。
   *
   * **必须是 prop，不能靠事件。** 之前用的是 `window.dispatchEvent`，
   * 而首页那一下是「切到画布 + 发事件」同一个 tick 完成的 —— 右栏还没渲染
   * 出来，监听器根本没挂上，事件被直接丢掉。表现就是"点了没反应"。
   */
  initial?: string
}) {
  const [prompt, setPrompt] = useState("")
  const [phase, setPhase] = useState<Phase>({ kind: "idle" })
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  // 首页带过来的内容。只在它变化时覆盖，不会把用户正在打的字冲掉。
  useEffect(() => {
    if (initial) {
      setPrompt(initial)
      inputRef.current?.focus()
    }
  }, [initial])

  /**
   * 这一条要带的参考素材。
   *
   * **必须是本地状态，不能直接用 `initialAttachments` 那个 prop。**
   * 用 prop 的话发送后没人清它 —— 于是"以此为输入生成"用过一次之后，
   * 这张画布里**之后的每一条消息都会悄悄再带上那张图**，而界面上
   * 什么都看不见。
   */
  const [attachments, setAttachments] = useState<string[]>([])
  useEffect(() => {
    if (!initialAttachments?.length && !initial) return
    if (initialAttachments?.length) setAttachments(initialAttachments)
    // 播种完立刻通知父组件清掉。留着的话输入框每次重挂都会被重新播种，
    // 上一次的提示词和参考图又回来了 —— 而界面上看不出它们是旧的。
    onConsumed?.()
  }, [initialAttachments, initial, onConsumed])

  /**
   * 「立刻发出去」的播种。制作计划面板的「继续」用它 ——
   * 那是一次确认，用户点完不该还要再按一次发送键。
   *
   * **把文字直接传给 `run`,不经过 `prompt` 状态** —— setState 是异步的，
   * 先 setPrompt 再 run 的话 `run` 读到的还是上一帧的空串，表现是
   * "点了继续什么都没发生"。
   */
  useEffect(() => {
    if (!autoSend) return
    onAutoSent?.()
    void run(autoSend)
    // 只认 autoSend 的变化。带上 run 的话每次重渲染都会再发一遍。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSend])
  const [uploading, setUploading] = useState(false)
  /**
   * Agent 模式。官方 `chat.mode.*`：
   * `auto` =「自动完成生成等操作，减少中途打断。」
   * `ask`  =「执行生成等关键操作前，先询问你。」
   */
  const [mode, setMode] = useState<"auto" | "ask">("auto")
  /** 这一轮允许 agent 用的模型。空 = 不限（官方的「全选」等价于空）。 */
  const [pickedModels, setPickedModels] = useState<string[]>([])
  const [models, setModels] = useState<PlatformModel[]>([])
  const [skills, setSkills] = useState<{ slug: string; name: string; description: string }[]>([])
  const [skillQ, setSkillQ] = useState("")
  /**
   * 生成参数。**选项由后端按模态下发**,不在这里写死 —— 写死的后果是
   * 视频用上了图片的档位（1K 在视频那边认不出，落进 768 的兜底）。
   * 见 `params.ts`。
   */
  const [groups, setGroups] = useState<ParamGroup[]>([])
  const [paramValues, setParamValues] = useState<ParamValues>({})
  /**
   * 芯片旁边的摘要。**只显示用户明确选过的** —— 把"自适应/自动"也列出来
   * 的话，一排默认值会把真正改过的那一项淹掉。
   */
  const summary = useMemo(() => {
    const picked = perModality(paramValues)
    const parts: string[] = []
    for (const g of groups) {
      const kv = picked[g.modality]
      if (!kv) continue
      const vals = g.specs
        .filter((sp) => kv[sp.name])
        .map((sp) => optionLabel(sp.name, kv[sp.name]!))
      if (vals.length > 0) parts.push(`${g.title} ${vals.join(" ")}`)
    }
    return parts.join(" · ")
  }, [groups, paramValues])

  useEffect(() => {
    void getCapabilities()
      .then((caps) => {
        const g = groupParams(caps)
        setGroups(g)
        // **保留用户已经改过的**,只给新出现的键补默认值。
        setParamValues((prev) => mergeValues(g, prev))
      })
      .catch(() => {})
  }, [])
  const shownSkills = useMemo(() => {
    const t = skillQ.trim().toLowerCase()
    if (!t) return skills
    return skills.filter(
      (k) =>
        k.name.toLowerCase().includes(t) ||
        k.slug.includes(t) ||
        k.description.toLowerCase().includes(t),
    )
  }, [skills, skillQ])
  const [panel, setPanel] = useState<"none" | "mode" | "models" | "skill" | "params">("none")

  useEffect(() => {
    // 拉不到就是空列表 —— 少一个下拉而已，输入框本身照常能用。
    void platformModels().then(setModels).catch(() => {})
    void listSkills()
      .then((r) =>
        setSkills(
          r.skills.map((k) => ({ slug: k.slug, name: k.name, description: k.description })),
        ),
      )
      .catch(() => {})
  }, [])
  const abort = useRef<AbortController | null>(null)

  const busy = phase.kind === "generating" || phase.kind === "placing"

  /**
   * 发给 agent。
   *
   * **不再直接调 submitImage。** 那条路只能出图 —— 用户说「做一支 15 秒的
   * 短片」会被当成一句出图的提示词，出来一张静态图，而且不报错。
   * 现在这里只负责把话交出去，做什么、调哪些工具由 agent 决定。
   *
   * 进度不在这里显示：右栏的对话和活动流会实时长出来，那里比一个
   * "生成中 12s" 的计数器信息量大得多。
   */
  const run = async (override?: string) => {
    const text = override ?? prompt
    if (!text.trim() || busy) return
    setPhase({ kind: "generating", seconds: 0 })
    try {
      // **这一轮的设置要跟着发出去。** 比例和分辨率之前选了从来不传 ——
      // 用户选 16:9 出来还是方图，而且不报错。
      await agentSend(text, attachments, {
        mode,
        models: pickedModels,
        ...toPayload(paramValues),
        // 按模态分开的那份 —— 后端拿它给**对应的工具**兜底：
        // 调 generate_image 用 image 那套，调 generate_video 用 video 那套。
        params: perModality(paramValues),
      })
      // 发出去就清空。**不等 agent 跑完** —— 一轮可能几分钟，
      // 输入框锁着的话用户连下一句都没法先写好。
      //
      // 附件也要清：它是"这一条"的素材，不是这张画布的常驻设置。
      setPrompt("")
      setAttachments([])
      setPhase({ kind: "idle" })
      onDone()
    } catch (err) {
      setPhase({ kind: "failed", message: err instanceof Error ? err.message : String(err) })
    } finally {
      abort.current = null
    }
  }

  // 造型按官方的 --home-input-* 那套：圆角 24、极淡边框、柔和阴影，
  // 输入区在上、工具行在下、发送键在右下角的圆形按钮里。
  return (
    <div
      // `relative`：上面那几个弹层是 `absolute bottom-full`,靠它定位。
      // 不加的话它们会往上找到画布容器，弹到屏幕别处去。
      className="relative flex flex-col"
      style={{
        borderRadius: "var(--home-input-radius)",
        background: "var(--home-input-surface)",
        border: "var(--home-input-border-width) solid var(--home-input-border)",
        boxShadow: "var(--home-input-shadow)",
      }}
    >
      {/* 附件条。**在输入框上面、能看见、能删。**
          之前 `initialAttachments` 只在发送时用、从不渲染 —— 用户不知道
          这一条带了什么，也没法去掉。

          图片直接给缩略图，其余给文件名：一律给文件名的话，传了三张参考图
          会看到三行看不出区别的 png，而参考图恰恰是靠"长什么样"来区分的。 */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 px-3 pt-3">
          {attachments.map((path) => (
            <div key={path} className="group relative">
              {/^images?\//.test(path) ? (
                <img
                  src={`/files/${path}?w=120`}
                  alt=""
                  title={path}
                  className="h-14 w-14 rounded-lg object-cover"
                  style={{ border: "1px solid var(--border)" }}
                />
              ) : (
                <div
                  className="flex h-14 max-w-[150px] items-center gap-1.5 rounded-lg px-2.5 text-[12px]"
                  style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
                  title={path}
                >
                  <FileText size={13} className="shrink-0" />
                  <span className="truncate">{path.split("/").pop()}</span>
                </div>
              )}
              <button
                type="button"
                title="移除"
                onClick={() => setAttachments((a) => a.filter((x) => x !== path))}
                className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full opacity-0 transition-opacity group-hover:opacity-100"
                style={{ background: "var(--foreground)", color: "var(--background)" }}
              >
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
      )}

      <textarea
        ref={inputRef}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={(e) => {
          // 回车发送、Shift+回车换行。`isComposing` 必须判 —— 中文输入法
          // 选词时按回车会被当成发送，把半截拼音提交上去。
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault()
            void run()
          }
        }}
        placeholder="描述你要生成的内容"
        disabled={busy}
        rows={2}
        className="resize-none bg-transparent px-4 pt-3.5 outline-none disabled:opacity-50"
        style={{
          fontSize: "var(--home-input-editor-font-size)",
          color: "var(--foreground)",
        }}
      />

      {panel !== "none" && (
        <Popover onClose={() => setPanel("none")}>
          {panel === "mode" && (
            <>
              <PopTitle>AGENT 模式</PopTitle>
              {(
                [
                  ["auto", "自动", "自动完成生成等操作，减少中途打断。"],
                  ["ask", "询问", "执行生成等关键操作前，先询问你。"],
                ] as const
              ).map(([v, label, desc]) => (
                <PopRow
                  key={v}
                  checked={mode === v}
                  onClick={() => {
                    setMode(v)
                    setPanel("none")
                  }}
                  hint={desc}
                >
                  {label}
                </PopRow>
              ))}
            </>
          )}

          {panel === "models" && (
            <>
              <PopTitle>模型</PopTitle>
              <p className="px-3 pb-1.5 text-[11px]" style={{ color: "var(--muted-foreground)" }}>
                {pickedModels.length === 0
                  ? "Agent 可调用该类别全部模型"
                  : "Agent 只能调用您选中的模型"}
              </p>
              <div className="max-h-56 overflow-auto">
                {models
                  .filter((m) => m.modality)
                  .map((m) => (
                    <PopRow
                      key={m.id}
                      checked={pickedModels.includes(m.id)}
                      onClick={() =>
                        setPickedModels((p) =>
                          p.includes(m.id) ? p.filter((x) => x !== m.id) : [...p, m.id],
                        )
                      }
                      hint={MODALITY_ZH[m.modality!] ?? m.modality!}
                    >
                      {m.id}
                    </PopRow>
                  ))}
                {models.length === 0 && (
                  <p className="px-3 py-2 text-[12px]" style={{ color: "var(--muted-foreground)" }}>
                    模型加载失败
                  </p>
                )}
              </div>
              {pickedModels.length > 0 && (
                <button
                  onClick={() => setPickedModels([])}
                  className="w-full px-3 py-2 text-left text-[12px] hover:bg-[var(--canvas-controls-hover)]"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  全不选（不限）
                </button>
              )}
            </>
          )}

          {panel === "params" && (
            <div className="max-h-72 w-[268px] overflow-auto">
              {groups.map((g) => (
                <div key={g.modality}>
                  <PopTitle>{g.title}</PopTitle>
                  {g.specs.map((sp) => (
                    <div
                      key={sp.name}
                      className="flex items-center justify-between gap-2 px-3 py-1.5"
                    >
                      <span className="text-[12px]" style={{ color: "var(--muted-foreground)" }}>
                        {sp.label}
                      </span>
                      <select
                        value={paramValues[g.modality]?.[sp.name] ?? sp.default}
                        onChange={(e) =>
                          setParamValues((prev) => ({
                            ...prev,
                            [g.modality]: { ...prev[g.modality], [sp.name]: e.target.value },
                          }))
                        }
                        className="rounded-md px-1.5 py-1 text-[12px] outline-none"
                        style={{ background: "var(--bg-subtle)", color: "var(--foreground)" }}
                      >
                        {sp.options.map((o) => (
                          <option key={o} value={o}>
                            {optionLabel(sp.name, o)}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              ))}
              <p
                className="border-t px-3 py-2 text-[11px] leading-4"
                style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
              >
                {/* 说清楚这排东西归谁管 —— 这正是它以前"无主"的地方。 */}
                Agent 生成什么就用哪一区的设置。「自适应」表示交给模型按素材定。
              </p>
            </div>
          )}
          {panel === "skill" && (
            <>
              {/* 官方 `skills.popover.heading` = Skill。 */}
              <PopTitle>SKILL</PopTitle>
              {/* 官方 `skills.popover.search` =「搜索 Skill」。
                  skill 攒到十几个之后，一屏放不下就得翻。 */}
              <div className="px-2 pb-1">
                <input
                  value={skillQ}
                  onChange={(e) => setSkillQ(e.target.value)}
                  placeholder="搜索 Skill"
                  className="w-full rounded-md px-2 py-1 text-[12px] outline-none"
                  style={{ background: "var(--bg-subtle)" }}
                />
              </div>
              <div className="max-h-56 overflow-auto">
                {shownSkills.map((k) => (
                  <PopRow
                    key={k.slug}
                    onClick={() => {
                      /*
                       * **插入 skill 的完整正文，不是它的名字。**
                       *
                       * 这里原来是 `setPrompt(v => `${v} ${k.name}`)`,注释说
                       * "我们的 skill 是靠提示词里的触发词命中的" —— 而后端
                       * `agent/` 里**没有任何 skill 匹配逻辑**（grep 零命中）。
                       * 也就是说这个按钮只往输入框塞了一个中文词，什么都不会
                       * 发生，而用户以为技能已经生效了。
                       *
                       * Skill 页的「使用」插的是 `/slug + 正文`,同一个动作
                       * 两个入口结果完全不同。统一成这一份。
                       */
                      void getSkill(k.slug)
                        .then((r) => {
                          const body = r.skill.body ?? ""
                          setPrompt((v) =>
                            // 已经打了字的话接在后面，别把用户写的覆盖掉。
                            v ? `/${k.slug}\n\n${body}\n\n---\n${v}` : `/${k.slug}\n\n${body}\n\n---\n`,
                          )
                          setPanel("none")
                          setSkillQ("")
                          inputRef.current?.focus()
                        })
                        .catch(() => setPanel("none"))
                    }}
                  >
                    <span className="flex min-w-0 flex-col">
                      <span>{k.name}</span>
                      {k.description && (
                        <span
                          className="truncate text-[11px]"
                          style={{ color: "var(--muted-foreground)" }}
                        >
                          {k.description}
                        </span>
                      )}
                    </span>
                  </PopRow>
                ))}
                {shownSkills.length === 0 && (
                  <p className="px-3 py-2 text-[12px]" style={{ color: "var(--muted-foreground)" }}>
                    {/* 官方 `skills.popover.empty` / `skills.empty.title`。
                        **"没搜到"和"一个都没有"是两件事** —— 前者该换个词，
                        后者该去建一个。 */}
                    {skills.length === 0 ? "暂无 Skill" : "未找到匹配的 Skill"}
                  </p>
                )}
              </div>
              {/* 官方 `skills.popover.selectionDescription`。
                  说清楚点下去会发生什么 —— 不说的话用户不知道它会往输入框
                  里塞一大段文字。 */}
              <p
                className="border-t px-3 py-2 text-[11px] leading-4"
                style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
              >
                选择 Skill 后会添加到当前输入，Agent 将按照 Skill 的说明完成任务。
              </p>
            </>
          )}
        </Popover>
      )}

      <div className="flex items-center gap-1 px-2.5 pt-1 pb-2.5">
        {/* 上传。画布这个输入框之前**根本没有上传入口** —— 想拿一张本地图
            当参考，只能先从首页发一次，或者拖到画布上再右键「添加到对话」。 */}
        <label
          title="添加文件"
          className="flex size-7 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-[var(--canvas-controls-hover)]"
          style={{ color: uploading ? "var(--muted-foreground)" : "var(--foreground)" }}
        >
          {uploading ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
          <input
            type="file"
            multiple
            hidden
            disabled={busy || uploading}
            onChange={async (e) => {
              const files = [...(e.target.files ?? [])]
              // **要清掉 value** —— 不清的话选同一个文件第二次不会触发
              // change，用户以为传失败了。
              e.target.value = ""
              if (files.length === 0) return
              setUploading(true)
              try {
                const paths = await uploadFiles(files)
                setAttachments((a) => [...a, ...paths.filter((p) => !a.includes(p))])
              } catch (err) {
                setPhase({
                  kind: "failed",
                  message: err instanceof Error ? err.message : String(err),
                })
              } finally {
                setUploading(false)
              }
            }}
          />
        </label>
        {/* 模型。官方 `chat.mediaModels.label` =「模型」，说明是
            「勾选后，Agent 可在任务中调用这些模型；未勾选的模型不会被使用。」
            **全不选 = 不限**（等价于官方的「全选」）。 */}
        <ToolBtn
          title="模型"
          active={pickedModels.length > 0}
          disabled={busy}
          onClick={() => setPanel((v) => (v === "models" ? "none" : "models"))}
        >
          <Box size={15} />
        </ToolBtn>
        <span className="mx-0.5 h-3 w-px" style={{ background: "var(--border-strong)" }} />
        {/* Skill。点一个就把它的触发词填进输入框 —— 我们的 skill 是靠
            提示词里的触发词命中的（见 assets/skills），不是一个开关。 */}
        <ToolBtn
          title="Skill"
          disabled={busy}
          onClick={() => setPanel((v) => (v === "skill" ? "none" : "skill"))}
        >
          <Puzzle size={15} />
        </ToolBtn>
        {/* 参数。照官方的 `ParamsChip`（`popover.params-chip`）收成一个
            齿轮，点开后**按模态分区**。
            
            以前这里是三个裸下拉（比例/分辨率/时长）—— 它们在对话框里是
            **无主的**:用户看着那排，不知道说的是图片还是视频。而且选项
            写死成一套，视频用上了图片的档位（1K 在视频那边认不出，
            落进 768 的兜底）。 */}
        {groups.length > 0 && (
          <ToolBtn
            title="参数"
            disabled={busy}
            onClick={() => setPanel((v) => (v === "params" ? "none" : "params"))}
          >
            <Settings2 size={15} />
          </ToolBtn>
        )}
        {/* 当前取值的摘要。官方的芯片上也显示摘要而不是只有图标 ——
            收进弹窗之后，不显示摘要的话用户每次都得点开才知道选的是什么。 */}
        <span
          className="truncate text-[11px]"
          style={{ color: "var(--muted-foreground)", maxWidth: 140 }}
        >
          {summary}
        </span>
        <span className="flex-1" />
        {/* Agent 模式。官方把它放在发送键左边，显示当前模式的名字。 */}
        <button
          type="button"
          disabled={busy}
          onClick={() => setPanel((v) => (v === "mode" ? "none" : "mode"))}
          className="rounded-full px-2 py-1 text-[13px] transition-colors hover:bg-[var(--canvas-controls-hover)] disabled:opacity-40"
          style={{ color: "var(--foreground)" }}
        >
          {mode === "auto" ? "自动" : "询问"}
        </button>
        {phase.kind !== "idle" && (
          <span
            className="mr-1 flex items-center gap-1 font-mono text-[11px]"
            style={{
              color:
                phase.kind === "failed"
                  ? "var(--canvas-node-tag-red)"
                  : "var(--muted-foreground)",
            }}
          >
            {busy && <Loader2 size={11} className="animate-spin" />}
            {phase.kind === "generating" && `${phase.seconds}s`}
            {phase.kind === "placing" && "放到画布上…"}
            {phase.kind === "failed" && phase.message.slice(0, 40)}
          </span>
        )}
        <button
          onClick={() => (busy ? abort.current?.abort() : void run())}
          disabled={!busy && !prompt.trim()}
          title={busy ? "取消" : "生成"}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-opacity hover:opacity-85 disabled:opacity-30"
          style={{
            background: "var(--canvas-primary-btn-bg)",
            color: "var(--canvas-primary-btn-icon)",
          }}
        >
          {busy ? <X size={15} /> : <ArrowUp size={16} />}
        </button>
      </div>
    </div>
  )
}

/** 朴素的下拉。等要做真正的参数面板时换成 Base UI。 */

/** 输入框上方的弹层。点外面或 Esc 关掉。 */
function Popover({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const down = (e: PointerEvent) => {
      // **要判在不在里面**。不判的话点弹层里的任何一项都会先把它关掉，
      // 于是多选模型时每点一个就收起来一次。
      if (!ref.current?.contains(e.target as Node)) onClose()
    }
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    // 下一帧再挂：打开它的那次点击还在冒泡，立刻挂会被它自己关掉。
    const t = setTimeout(() => document.addEventListener("pointerdown", down), 0)
    document.addEventListener("keydown", key)
    return () => {
      clearTimeout(t)
      document.removeEventListener("pointerdown", down)
      document.removeEventListener("keydown", key)
    }
  }, [onClose])
  return (
    <div
      ref={ref}
      className="absolute bottom-full left-2 z-30 mb-2 w-64 overflow-hidden rounded-xl border py-1"
      style={{
        background: "var(--canvas-controls-bg)",
        borderColor: "var(--canvas-controls-border)",
        boxShadow: "var(--canvas-shadow-menu)",
      }}
    >
      {children}
    </div>
  )
}

function PopTitle({ children }: { children: ReactNode }) {
  return (
    <div
      className="px-3 pt-1.5 pb-1 text-[11px] tracking-wide"
      style={{ color: "var(--muted-foreground)" }}
    >
      {children}
    </div>
  )
}

function PopRow({
  children,
  hint,
  checked,
  onClick,
}: {
  children: ReactNode
  hint?: string
  checked?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-[var(--canvas-controls-hover)]"
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px]">{children}</span>
        {hint && (
          <span className="block truncate text-[11px]" style={{ color: "var(--muted-foreground)" }}>
            {hint}
          </span>
        )}
      </span>
      {checked && <Check size={14} className="shrink-0" />}
    </button>
  )
}

/** 工具行上的图标按钮。 */
function ToolBtn({
  title,
  active,
  disabled,
  onClick,
  children,
}: {
  title: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className="flex size-7 items-center justify-center rounded-full transition-colors hover:bg-[var(--canvas-controls-hover)] disabled:opacity-40"
      style={{ color: active ? "var(--foreground)" : "var(--muted-foreground)" }}
    >
      {children}
    </button>
  )
}

/** 模态的中文名。和设置页那份保持一致。 */
const MODALITY_ZH: Record<string, string> = {
  image: "文生图",
  imageEdit: "图生图",
  video: "文生视频",
  videoRef: "参考生视频",
  music: "音乐",
  musicEdit: "翻唱",
  speech: "语音",
}
