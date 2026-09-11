import { useEffect, useState } from "react"

import {
  getSettings,
  platformModels,
  saveSettings,
  type PlatformModel,
  type SettingsInfo,
} from "./api"
import { Dialog } from "./Dialog"
import { KeepAwake } from "./KeepAwake"
import { THEMES, applyTheme, loadTheme, resolve, saveTheme, watchSystem, type Theme } from "./appearance"
import { checkUpdate, logInfo, openLogDir } from "./api"

/**
 * 设置。**是弹窗不是页面** —— 改配置是一次性的插曲，把它做成一个占满
 * 主区域的页面，用户改完还得自己想办法"回去"。
 *
 *
 * 官方那边设置有 51 个可交互元素（账号、积分、团队、存储迁移、文件夹白名单
 * …）。我们**只做背后真有东西的那部分**：平台接入和模型选择。没有登录、
 * 没有云端，那些设置项对应的功能整个不存在，放上去就是一排点了没反应的开关。
 *
 * 这一页解决的是一个实际问题：在此之前，改模型名和音色映射只能手编
 * `~/Library/Application Support/ovaijisuandesign/config.json`。
 */
export function Settings({ onClose }: { onClose: () => void }) {
  const [info, setInfo] = useState<SettingsInfo | null>(null)
  // 平台上真有哪些模型。拉不到就是空数组 —— 候选没了，手打还在。
  const [avail, setAvail] = useState<PlatformModel[]>([])
  const [form, setForm] = useState<Record<string, string>>({})
  const [enhance, setEnhance] = useState(true)
  const [voice, setVoice] = useState("")
  const [theme, setTheme] = useState<Theme>(() => loadTheme())
  const [sysDark, setSysDark] = useState(false)
  const [upd, setUpd] = useState<string | null>(null)
  const [updBusy, setUpdBusy] = useState(false)
  const [logDir, setLogDir] = useState<string | null>(null)
  useEffect(() => {
    void logInfo()
      .then((r) => setLogDir(r.dir ?? null))
      .catch(() => {})
  }, [])

  // **`system` 之外也订阅。** 用户从「深色」切回「跟随系统」时要立刻拿到
  // 当前系统状态；只在 system 下订阅的话，那一刻需要额外一次手动同步。
  useEffect(() => watchSystem(setSysDark), [])
  useEffect(() => applyTheme(resolve(theme, sysDark)), [theme, sysDark])
  const [msg, setMsg] = useState<{ kind: "ok" | "bad"; text: string } | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    void platformModels().then(setAvail)
  }, [])

  useEffect(() => {
    void getSettings()
      .then((s) => {
        setInfo(s)
        setForm({
          baseUrl: s.platform.baseUrl,
          chatModel: s.platform.chatModel,
          // **api_key 留空**：留空 = 不改。填成掩码的话，用户改个模型名保存，
          // 掩码就被当成新 key 写进去了。
          apiKey: "",
          port: String(s.port),
          workspace: s.workspaceConfigured ?? "",
          ...Object.fromEntries(Object.entries(s.models).map(([k, v]) => [k, (v as string) ?? ""])),
        })
        setEnhance(s.models.enhanceMusicCaption !== false)
        setVoice(
          Object.entries(s.models.voiceMap ?? {})
            .map(([k, v]) => `${k} = ${v}`)
            .join("\n"),
        )
      })
      .catch((e: unknown) =>
        setMsg({ kind: "bad", text: e instanceof Error ? e.message : String(e) }),
      )
  }, [])

  const set = (k: string) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async () => {
    setSaving(true)
    setMsg(null)
    try {
      // 「音色 = 参考音频」一行一条。用表格控件的话，加一行删一行都要做，
      // 而这本来就是个键值对文本。
      const voiceMap: Record<string, string> = {}
      for (const line of voice.split("\n")) {
        const i = line.indexOf("=")
        if (i < 0) continue
        const k = line.slice(0, i).trim()
        const v = line.slice(i + 1).trim()
        if (k && v) voiceMap[k] = v
      }
      await saveSettings({
        port: Number(form.port) || undefined,
        workspace: form.workspace,
        baseUrl: form.baseUrl,
        apiKey: form.apiKey,
        chatModel: form.chatModel,
        image: form.image,
        imageEdit: form.imageEdit,
        video: form.video,
        videoRef: form.videoRef,
        videoUpscale: form.videoUpscale,
        music: form.music,
        musicEdit: form.musicEdit,
        speech: form.speech,
        enhanceMusicCaption: enhance,
        voiceMap,
      })
      setMsg({ kind: "ok", text: "已保存。配置是启动时读的，重启应用后生效。" })
      setForm((f) => ({ ...f, apiKey: "" }))
    } catch (e) {
      setMsg({ kind: "bad", text: e instanceof Error ? e.message : String(e) })
    } finally {
      setSaving(false)
    }
  }

  const body = !info ? (
    <p className="text-[13px]" style={{ color: "var(--muted-foreground)" }}>
      {msg?.text ?? "读取中…"}
    </p>
  ) : (
    <>
      <p className="mb-5 text-[12px]" style={{ color: "var(--muted-foreground)" }}>
        {info.path}
      </p>

      <div className="flex flex-col gap-6">
        <Section title="通用">
          {/* 主题。官方 `settings.theme` / `themeDesc`。
              **`.dark` 那 179 行变量之前从没被用上** —— 写好了，但没有任何
              代码给 `<html>` 挂过这个 class。 */}
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[13px]">主题</div>
              <div className="mt-0.5 text-[11px]" style={{ color: "var(--muted-foreground)" }}>
                选择浅色、深色或跟随系统主题
              </div>
            </div>
            <div
              className="flex shrink-0 rounded-lg p-0.5"
              style={{ background: "var(--bg-subtle)" }}
            >
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={theme === t.id}
                  onClick={() => {
                    setTheme(t.id)
                    saveTheme(t.id)
                  }}
                  className="rounded-md px-2.5 py-1 text-[12px] transition-colors"
                  style={{
                    background: theme === t.id ? "var(--background)" : "transparent",
                    color: theme === t.id ? "var(--foreground)" : "var(--muted-foreground)",
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* 从 IM 面板搬过来的。**系统级的开关不该藏在一个功能面板里** ——
              不接微信/飞书的人永远不会打开那个面板。 */}
          <KeepAwake />

          {/* 检查更新。官方 `settings.checkForUpdates`。
              我们之前只有"有新版本时自动弹面板"这一条路，用户想主动查
              查不了。 */}
          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[13px]">检查更新</div>
              <div className="mt-0.5 text-[11px]" style={{ color: "var(--muted-foreground)" }}>
                {upd ?? "检查是否有新版本可用"}
              </div>
            </div>
            <button
              type="button"
              disabled={updBusy}
              onClick={() => {
                setUpdBusy(true)
                setUpd("正在检查…")
                void checkUpdate()
                  .then((r) => {
                    // **`reachable: false` 不是"已是最新"。** 断网或清单里
                    // 没这一档时也会走到这儿，说成"已是最新"是在骗人。
                    if (!r.reachable) setUpd("查不到更新源，请检查网络")
                    else if (r.needUpdate) setUpd(`有新版本 ${r.latest}，面板会引导安装`)
                    else setUpd(`已是最新（${r.current}）`)
                  })
                  .catch((e) => setUpd(e instanceof Error ? e.message : String(e)))
                  .finally(() => setUpdBusy(false))
              }}
              className="shrink-0 rounded-md px-2.5 py-1.5 text-[12px] transition-opacity enabled:hover:opacity-85 disabled:opacity-40"
              style={{ background: "var(--bg-subtle)", color: "var(--foreground)" }}
            >
              检查更新
            </button>
          </div>
          {/* 日志目录。官方 `settings.logDirectory`。
              **打包成 .app 之后 stdout 没有任何地方接** —— 在此之前
              gateway 里所有 warn 都进了虚空，用户报问题时我们只有一句
              "它不工作"。 */}
          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[13px]">日志目录</div>
              <div
                className="mt-0.5 truncate text-[11px]"
                style={{ color: "var(--muted-foreground)" }}
                title={logDir ?? undefined}
              >
                {/* 路径本身就是最有用的说明 —— 用户可以直接拷给我们。 */}
                {logDir ?? "打开应用日志存储的文件夹"}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                void openLogDir().then((r) => {
                  if (!r.ok) setMsg({ kind: "bad", text: r.error ?? "打不开日志目录" })
                })
              }}
              className="shrink-0 rounded-md px-2.5 py-1.5 text-[12px] transition-opacity hover:opacity-85"
              style={{ background: "var(--bg-subtle)", color: "var(--foreground)" }}
            >
              打开
            </button>
          </div>
        </Section>

        <Section title="平台">
          <Field label="接口地址" value={form.baseUrl} onChange={set("baseUrl")} />
          <Field
            label="API Key"
            value={form.apiKey}
            onChange={set("apiKey")}
            type="password"
            placeholder={info.platform.hasApiKey ? info.platform.apiKeyMasked : "还没有配置"}
            hint="留空表示不修改。这里只显示掩码——设置页会被截图和录屏，key 出现在图里就得换。"
          />
          <Field
            label="对话模型"
            value={form.chatModel}
            onChange={set("chatModel")}
            hint="歌词起草、音乐 caption 增强都走它。也是以后应用内 agent 的模型。"
          />
        </Section>

        <Section title="模型">
          <div className="grid grid-cols-2 gap-3">
            <ModelField label="文生图" modality="image" avail={avail} value={form.image} onChange={set("image")} />
            <ModelField label="图生图" modality="imageEdit" avail={avail} value={form.imageEdit} onChange={set("imageEdit")} />
            <ModelField label="文生视频 / 首尾帧" modality="video" avail={avail} value={form.video} onChange={set("video")} />
            <ModelField label="参考生视频" modality="videoRef" avail={avail} value={form.videoRef} onChange={set("videoRef")} />
            <ModelField label="视频超分" modality="video" avail={avail} value={form.videoUpscale} onChange={set("videoUpscale")} />
            <ModelField label="文生音乐" modality="music" avail={avail} value={form.music} onChange={set("music")} />
            <ModelField
              label="音乐编辑 / 翻唱"
              modality="musicEdit"
              avail={avail}
              value={form.musicEdit}
              onChange={set("musicEdit")}
              hint="只有 ACE-Step 支持"
            />
            <ModelField
              label="语音合成"
              modality="speech"
              avail={avail}
              value={form.speech}
              onChange={set("speech")}
              hint="平台上的 TTS 都是声音克隆：音色要给一段参考音频，不是预设名。见下面的音色映射。"
            />
          </div>
          <label className="mt-1 flex items-center gap-2 text-[13px]">
            <input type="checkbox" checked={enhance} onChange={(e) => setEnhance(e.target.checked)} />
            把一句话风格描述展开成三段式 caption（Music3 用）
          </label>
        </Section>

        <Section title="音色映射">
          <p className="mb-1.5 text-[12px]" style={{ color: "var(--muted-foreground)" }}>
            平台上没有模型吃预设音色名，只能靠零样本克隆。一行一条：
            <code>音色名 = 参考音频的 URL</code>。没配的话语音合成会在联网前就报错。
          </p>
          <textarea
            value={voice}
            onChange={(e) => setVoice(e.target.value)}
            rows={5}
            placeholder="female-tianmei = https://…/ref.wav"
            className="w-full resize-y rounded-md px-2 py-1.5 font-mono text-[12px] outline-none"
            style={FIELD}
          />
        </Section>

        <Section title="运行">
          <div className="grid grid-cols-2 gap-3">
            <Field label="端口" value={form.port} onChange={set("port")} />
            <Field
              label="工作区"
              value={form.workspace}
              onChange={set("workspace")}
              placeholder={info.workspace}
              hint={
                info.workspaceConfigured ? undefined : `当前实际用的是 ${info.workspace}`
              }
            />
          </div>
        </Section>

      </div>
    </>
  )

  return (
    <Dialog
      open
      title="设置"
      onClose={onClose}
      footer={
        <>
          {msg && (
            <span
              className="truncate text-[12px]"
              style={{
                color: msg.kind === "ok" ? "var(--muted-foreground)" : "var(--canvas-node-tag-red)",
              }}
            >
              {msg.text}
            </span>
          )}
          <span className="flex-1" />
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-[13px]"
            style={{ background: "var(--bg-subtle)" }}
          >
            关闭
          </button>
          <button
            onClick={() => void submit()}
            disabled={saving || !info}
            className="rounded-lg px-4 py-1.5 text-[13px] disabled:opacity-50"
            style={{ background: "var(--brand-accent)", color: "var(--brand-accent-foreground)" }}
          >
            {saving ? "保存中…" : "保存"}
          </button>
        </>
      }
    >
      {body}
    </Dialog>
  )
}

const FIELD = {
  background: "var(--bg-subtle)",
  color: "var(--foreground)",
  border: "1px solid var(--border)",
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="text-[15px] font-semibold">{title}</h2>
      {children}
    </section>
  )
}

/**
 * 模型名输入框，带平台上真实存在的候选。
 *
 * **是 `datalist` 不是 `select`** —— 平台随时会加新模型，而 `/api/models`
 * 的分类靠的是一张我们实测过的名字表，认不出的模型会没有模态标记。
 * 用 `select` 的话，这些模型就彻底选不到了。
 */
function ModelField({
  label,
  modality,
  avail,
  value,
  onChange,
  hint,
}: {
  label: string
  modality: string
  avail: PlatformModel[]
  value: string | undefined
  onChange: (e: { target: { value: string } }) => void
  hint?: string
}) {
  const id = `models-${modality}-${label}`
  const match = avail.filter((m) => m.modality === modality)
  // 认不出模态的排在后面 —— 它们多半不是这个用途，但也不该藏起来。
  const rest = avail.filter((m) => m.modality === null)
  const options = [...match, ...rest]
  const note =
    avail.length === 0
      ? "拉不到平台模型表，手动填写"
      : match.length === 0
        ? "平台上没有识别出这个用途的模型"
        : undefined
  return (
    <label className="flex flex-col gap-1 text-[13px]">
      {label}
      <input
        list={id}
        value={value ?? ""}
        onChange={onChange}
        className="w-full rounded-md px-2 py-1.5 text-[13px] outline-none"
        style={FIELD}
      />
      <datalist id={id}>
        {options.map((m) => (
          <option key={m.id} value={m.id} />
        ))}
      </datalist>
      {(hint ?? note) && (
        <span className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>
          {hint ?? note}
        </span>
      )}
    </label>
  )
}

function Field({
  label,
  value,
  onChange,
  hint,
  type,
  placeholder,
}: {
  label: string
  value: string | undefined
  onChange: (e: { target: { value: string } }) => void
  hint?: string
  type?: string
  placeholder?: string
}) {
  return (
    <label className="flex flex-col gap-1 text-[13px]">
      {label}
      <input
        type={type ?? "text"}
        value={value ?? ""}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full rounded-md px-2 py-1.5 text-[13px] outline-none"
        style={FIELD}
      />
      {hint && (
        <span className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>
          {hint}
        </span>
      )}
    </label>
  )
}
