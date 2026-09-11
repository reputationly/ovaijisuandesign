import { Download, Plus, Search, Trash2 } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import { deleteSkill, getSkill, importSkills, listSkills, saveSkill, type Skill } from "./api"
import { confirm as uiConfirm } from "./Prompt"

/**
 * Skill 页。侧栏「Skill」进来的那一页。
 *
 * 官方那个面板是：搜索框 + 一排分类标签（全部 / 我的 / 精选 / 短剧漫剧 /
 * 专业影视 / 动画）+ 列表，每条是 `名字 /slug` 加一句描述，底下「探索更多」
 * 和「创建」。分类那排是从**实际有的 skill** 里聚出来的，不是写死的一串。
 *
 * 一个 skill 就是一段预置提示词加一个斜杠短名，存成
 * `.hilo/skills/<slug>/SKILL.md` —— 见 gateway 的 `skills.rs`。
 *
 * 「探索更多」没做：那要一个 skill 市场（官方是云端的）。**不放这个按钮** ——
 * 点了没反应比没有更糟。
 */
export function Skills({ onUse }: { onUse: (slug: string, body: string) => void }) {
  const [skills, setSkills] = useState<Skill[]>([])
  const [cats, setCats] = useState<string[]>([])
  const [tab, setTab] = useState("全部")
  const [q, setQ] = useState("")
  const [editing, setEditing] = useState<Skill | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const reload = () =>
    listSkills()
      .then((r) => {
        setSkills(r.skills)
        setCats(r.categories)
      })
      .catch((e: unknown) => setErr(e instanceof Error ? e.message : String(e)))
  useEffect(() => {
    void reload()
  }, [])

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase()
    return skills.filter((s) => {
      if (tab === "我的" && s.builtin) return false
      if (tab !== "全部" && tab !== "我的" && s.category !== tab) return false
      if (!t) return true
      return (
        s.name.toLowerCase().includes(t) ||
        s.slug.includes(t) ||
        s.description.toLowerCase().includes(t)
      )
    })
  }, [skills, tab, q])

  if (editing) {
    return (
      <Editor
        initial={editing}
        onCancel={() => setEditing(null)}
        onSaved={() => {
          setEditing(null)
          void reload()
        }}
      />
    )
  }

  return (
    <div className="h-full min-w-0 flex-1 overflow-auto px-8 py-6">
      <div className="mb-4 flex items-center gap-3">
        <h1 className="text-[20px] font-semibold">Skill</h1>
        <span className="flex-1" />
        <div
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5"
          style={{ background: "var(--bg-subtle)" }}
        >
          <Search size={14} style={{ color: "var(--muted-foreground)" }} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜索 Skill"
            className="w-44 bg-transparent text-[13px] outline-none"
          />
        </div>
        {/* 从官方应用那边增量导入。官方装的 skill 在 ~/.hub/skills，
            结构和我们一样（SKILL.md + frontmatter）。同名默认跳过 ——
            用户可能改过自己那份。 */}
        <button
          onClick={() => {
            setErr(null)
            void importSkills()
              .then((r) => {
                void reload()
                setErr(
                  r.added.length
                    ? `导入了 ${r.added.length} 个（跳过已有的 ${r.skipped.length} 个）`
                    : `没有新的可导入（${r.from} 里的 ${r.skipped.length} 个都已存在）`,
                )
              })
              .catch((e: unknown) => setErr(e instanceof Error ? e.message : String(e)))
          }}
          title="从 ~/.hub/skills 导入"
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px]"
          style={{ background: "var(--bg-subtle)" }}
        >
          <Download size={15} /> 导入
        </button>
        <button
          onClick={() =>
            setEditing({ slug: "", name: "", description: "", category: "我的", builtin: false, body: "" })
          }
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px]"
          style={{ background: "var(--brand-accent)", color: "var(--brand-accent-foreground)" }}
        >
          <Plus size={15} /> 创建
        </button>
      </div>

      {/* 分类从实际有的 skill 里聚出来 —— 写死一串的话，用户新建一个
          「电商」分类的 skill，那个标签不会出现，他会以为分类没保存。 */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {["全部", "我的", ...cats].map((c) => (
          <button
            key={c}
            onClick={() => setTab(c)}
            className="rounded-full px-3 py-1 text-[12px]"
            style={
              tab === c
                ? { background: "var(--brand-accent)", color: "var(--brand-accent-foreground)" }
                : { background: "var(--bg-subtle)", color: "var(--muted-foreground)" }
            }
          >
            {c}
          </button>
        ))}
      </div>

      {err && (
        <p className="mb-3 text-[13px]" style={{ color: "var(--canvas-node-tag-red)" }}>
          {err}
        </p>
      )}

      {shown.length === 0 ? (
        <p className="text-[13px]" style={{ color: "var(--muted-foreground)" }}>
          {q.trim() ? "没有匹配的 Skill。" : "这个分类下还没有 Skill。"}
        </p>
      ) : (
        <div className="flex flex-col gap-1">
          {shown.map((s) => (
            <div
              key={s.slug}
              className="group flex items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-[var(--canvas-controls-hover)]"
            >
              <div className="min-w-0 flex-1">
                <p className="flex items-baseline gap-2 text-[13px]">
                  <span className="font-medium">{s.name}</span>
                  <span style={{ color: "var(--muted-foreground)" }}>/{s.slug}</span>
                  {s.builtin && (
                    <span
                      className="rounded px-1 text-[10px]"
                      style={{ background: "var(--bg-subtle)", color: "var(--muted-foreground)" }}
                    >
                      自带
                    </span>
                  )}
                </p>
                <p className="truncate text-[12px]" style={{ color: "var(--muted-foreground)" }}>
                  {s.description}
                </p>
              </div>
              <button
                onClick={() => {
                  // 正文列表里没有，用的时候单独取一次。
                  void getSkill(s.slug)
                    .then((r) => onUse(s.slug, r.skill.body ?? ""))
                    .catch((e: unknown) => setErr(e instanceof Error ? e.message : String(e)))
                }}
                className="shrink-0 rounded-lg px-2.5 py-1 text-[12px]"
                style={{ background: "var(--bg-subtle)" }}
              >
                使用
              </button>
              {!s.builtin && (
                <>
                  <button
                    onClick={() => {
                      void getSkill(s.slug).then((r) => setEditing(r.skill))
                    }}
                    className="shrink-0 rounded-lg px-2.5 py-1 text-[12px]"
                    style={{ background: "var(--bg-subtle)" }}
                  >
                    编辑
                  </button>
                  <button
                    onClick={async () => {
                      if (!(await uiConfirm(`删除「${s.name}」？`, { confirmLabel: "删除", danger: true })))
                        return
                      void deleteSkill(s.slug).then(reload)
                    }}
                    title="删除"
                    className="hidden shrink-0 rounded-lg px-2 py-1 group-hover:block"
                    style={{ color: "var(--canvas-node-tag-red)" }}
                  >
                    <Trash2 size={14} />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Editor({
  initial,
  onCancel,
  onSaved,
}: {
  initial: Skill
  onCancel: () => void
  onSaved: () => void
}) {
  const [slug, setSlug] = useState(initial.slug)
  const [name, setName] = useState(initial.name)
  const [description, setDescription] = useState(initial.description)
  const [category, setCategory] = useState(initial.category || "我的")
  const [body, setBody] = useState(initial.body ?? "")
  const [err, setErr] = useState<string | null>(null)
  const creating = !initial.slug

  const field = {
    background: "var(--bg-subtle)",
    color: "var(--foreground)",
    border: "1px solid var(--border)",
  }

  return (
    <div className="h-full min-w-0 flex-1 overflow-auto px-8 py-6">
      <h1 className="mb-4 text-[20px] font-semibold">{creating ? "新建 Skill" : `编辑 ${name}`}</h1>
      <div className="flex max-w-2xl flex-col gap-3">
        <label className="text-[13px]">
          斜杠短名
          <input
            value={slug}
            // 改已有的 slug 会在磁盘上留下一个孤儿目录（旧的那份还在），
            // 而用户以为是重命名。只有新建时能填。
            disabled={!creating}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
            placeholder="ecommerce-image"
            className="mt-1 w-full rounded-md px-2 py-1.5 text-[13px] outline-none disabled:opacity-50"
            style={field}
          />
          <span className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>
            只能用小写字母、数字和连字符。输入框里打 /{slug || "短名"} 唤起。
          </span>
        </label>
        <label className="text-[13px]">
          名字
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-md px-2 py-1.5 text-[13px] outline-none"
            style={field}
          />
        </label>
        <label className="text-[13px]">
          一句话描述
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 w-full rounded-md px-2 py-1.5 text-[13px] outline-none"
            style={field}
          />
        </label>
        <label className="text-[13px]">
          分类
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-1 w-full rounded-md px-2 py-1.5 text-[13px] outline-none"
            style={field}
          />
        </label>
        <label className="text-[13px]">
          提示词
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={14}
            placeholder="你在做…。告诉 agent 这个 skill 要它按什么步骤、什么约束来做。"
            className="mt-1 w-full resize-y rounded-md px-2 py-1.5 font-mono text-[12px] leading-5 outline-none"
            style={field}
          />
        </label>
        {err && (
          <p className="text-[13px]" style={{ color: "var(--canvas-node-tag-red)" }}>
            {err}
          </p>
        )}
        <div className="flex gap-2">
          <button
            onClick={() => {
              if (!slug.trim()) {
                setErr("要有斜杠短名")
                return
              }
              void saveSkill({ slug, name, description, category, body })
                .then(onSaved)
                .catch((e: unknown) => setErr(e instanceof Error ? e.message : String(e)))
            }}
            className="rounded-lg px-4 py-1.5 text-[13px]"
            style={{ background: "var(--brand-accent)", color: "var(--brand-accent-foreground)" }}
          >
            保存
          </button>
          <button
            onClick={onCancel}
            className="rounded-lg px-4 py-1.5 text-[13px]"
            style={{ background: "var(--bg-subtle)" }}
          >
            取消
          </button>
        </div>
      </div>
    </div>
  )
}
