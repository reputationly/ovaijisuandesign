/**
 * 项目资产面板。官方底部工具条的 `canvas.toolbar-project-assets`。
 * 逻辑在 `projectAssets.ts`,这里只管画。
 *
 * **和「主体库」不是一回事** —— 官方工具条上是两个不同的按钮，
 * 见 `projectAssets.ts` 顶上的说明。
 *
 * 文件名是 `AssetsPanel` 而不是 `ProjectAssets`：**macOS 文件系统大小写
 * 不敏感**,`ProjectAssets.tsx` 和 `projectAssets.ts` 会被当成同一个文件。
 * 见 `casing.test.ts` —— 这个错我犯过两次，现在有静态检查挡着了。
 *
 * ## 官方有、我们没做的
 *
 * - **新建文件夹 / 文件夹层级**：我们的资产索引是扁平的（路径就是
 *   `images/xxx.png`），没有用户自己建目录这回事。**不放那个按钮** ——
 *   建完之后没有任何地方能把文件放进去。
 * - **上传者列**（`columns.owner`）：单机应用，只有一个人。
 * - **批量下载打包**：我们逐个下载，不打 zip。
 */

import {
  ArrowDownAZ,
  ArrowUpAZ,
  Check,
  Download,
  FileText,
  FolderOpen,
  Image as ImageIcon,
  LayoutGrid,
  List,
  Music,
  Search,
  SlidersHorizontal,
  Trash2,
  Upload,
  Video,
  X,
} from "lucide-react"
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"

import { assetUrl, type AssetInfo as Asset } from "./api"
import { confirm as uiConfirm } from "./Prompt"
import {
  BUCKETS,
  DEFAULT_LIST,
  SORT_KEYS,
  bucketCounts,
  bucketOf,
  humanSize,
  humanTime,
  listAssets,
  timeOf,
  type Bucket,
  type ListOptions,
  type SortKey,
} from "./projectAssets"

const ICON: Record<Bucket, ReactNode> = {
  image: <ImageIcon size={14} />,
  video: <Video size={14} />,
  audio: <Music size={14} />,
  document: <FileText size={14} />,
  code: <FileText size={14} />,
  archive: <FolderOpen size={14} />,
  folder: <FolderOpen size={14} />,
  other: <FileText size={14} />,
}

export function ProjectAssets({
  assets,
  onClose,
  onUpload,
  onDelete,
  onUse,
  degraded,
}: {
  assets: Asset[]
  onClose: () => void
  /** 上传文件。返回后调用方负责重新拉列表。 */
  onUpload: (files: File[]) => Promise<void>
  /** 移到废纸篓。传的是相对路径。 */
  onDelete: (paths: string[]) => Promise<void>
  /** 「加入画布」。 */
  onUse: (asset: Asset) => void
  /**
   * 索引降级开局。**必须和"这里还没有素材"区分开** —— 两者列表都是空的,
   * 而该做的事完全相反：一个是去生成点东西，一个是**千万别动工作区**。
   */
  degraded?: boolean
}) {
  const [opts, setOpts] = useState<ListOptions>(DEFAULT_LIST)
  const [view, setView] = useState<"list" | "grid">("list")
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [filterOpen, setFilterOpen] = useState(false)
  const [sortOpen, setSortOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [dropping, setDropping] = useState(false)
  const fileRef = useRef<HTMLInputElement | null>(null)

  const rows = useMemo(() => listAssets(assets, opts), [assets, opts])
  const counts = useMemo(() => bucketCounts(assets, opts), [assets, opts])

  // 筛选变了之后，选中集合里可能有已经不在列表上的项。**必须收窄** ——
  // 不收的话「删除 5 项」会删掉用户当前根本看不见的文件。
  useEffect(() => {
    setPicked((prev) => {
      if (prev.size === 0) return prev
      const visible = new Set(rows.map((r) => r.path))
      const next = new Set([...prev].filter((p) => visible.has(p)))
      return next.size === prev.size ? prev : next
    })
  }, [rows])

  const allPicked = rows.length > 0 && rows.every((r) => picked.has(r.path))
  const toggle = (path: string) =>
    setPicked((prev) => {
      const next = new Set(prev)
      if (!next.delete(path)) next.add(path)
      return next
    })

  const doDelete = async () => {
    const n = picked.size
    if (n === 0) return
    // 官方 `batchDeleteLocalBody`。**"可在废纸篓中找到"这句必须是真的** ——
    // 后端走的是移动到 .hilo/trash/，不是真删。
    if (
      !(await uiConfirm(
        `确定删除已选择的 ${n} 项？文件会移到废纸篓，画布上引用它们的卡片也会一并移除。`,
        { confirmLabel: "删除", danger: true },
      ))
    ) {
      return
    }
    setBusy(true)
    try {
      await onDelete([...picked])
      setPicked(new Set())
    } finally {
      setBusy(false)
    }
  }

  const doUpload = async (files: File[]) => {
    if (files.length === 0) return
    setBusy(true)
    try {
      await onUpload(files)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      data-action-ui-id="canvas.toolbar-project-assets-panel"
      className="nodrag nopan nowheel flex h-full w-[520px] flex-col"
      style={{ background: "var(--background)", borderLeft: "1px solid var(--border)" }}
      onDragOver={(e) => {
        e.preventDefault()
        setDropping(true)
      }}
      onDragLeave={(e) => {
        // **要判是不是离开了容器本身。** 不判的话鼠标划过里面任何一个子元素
        // 都会触发 leave，高亮一闪一闪。
        if (e.currentTarget.contains(e.relatedTarget as Node)) return
        setDropping(false)
      }}
      onDrop={(e) => {
        e.preventDefault()
        setDropping(false)
        void doUpload([...e.dataTransfer.files])
      }}
    >
      <header className="flex items-center gap-2 px-3 py-2.5" style={{ borderBottom: "1px solid var(--border)" }}>
        <span className="text-[14px]">项目资产</span>
        <span className="text-[11px] tabular-nums" style={{ color: "var(--muted-foreground)" }}>
          {rows.length === 0 ? "0 项" : `${rows.length} 个文件`}
        </span>
        <div className="flex-1" />
        <IconBtn title="关闭" onClick={onClose}>
          <X size={14} />
        </IconBtn>
      </header>

      {/* 索引降级。照官方 3.0.14 的
          `bundleError.diagnosis.workspaceIndexRecovery`:
          「无法安全恢复项目的素材关联。为保护原有内容，已停止自动重建；
          **这不代表素材文件已被删除**。」

          最怕用户看到空列表之后去"清理一下重来" —— 那才是真的不可恢复。 */}
      {degraded && (
        <div
          className="mx-3 mt-2 rounded-lg px-2.5 py-2 text-[11px] leading-4"
          style={{
            background: "color-mix(in srgb, var(--canvas-node-tag-orange) 12%, transparent)",
            color: "var(--foreground)",
          }}
        >
          <strong>项目素材信息需要恢复。</strong>
          原索引已损坏并隔离到工作区的 <code>quarantine/</code> 下。
          <br />
          <span style={{ color: "var(--muted-foreground)" }}>
            素材文件都还在盘上，没有被删除。请**保留完整的工作区文件夹**,
            不要删除素材、覆盖项目或清理应用数据。
          </span>
        </div>
      )}

      {/* 工具栏：搜索 / 筛选 / 排序 / 视图 / 上传 */}
      <div className="flex items-center gap-1 px-3 py-2">
        <div
          className="flex flex-1 items-center gap-1.5 rounded-md px-2 py-1.5"
          style={{ background: "var(--bg-subtle)" }}
        >
          <Search size={13} style={{ color: "var(--muted-foreground)" }} />
          <input
            data-action-ui-id="canvas.project-assets-search"
            value={opts.search}
            onChange={(e) => setOpts((o) => ({ ...o, search: e.target.value }))}
            placeholder="搜索文件名"
            className="w-full bg-transparent text-[12px] outline-none"
          />
          {opts.search && (
            <button title="清除搜索" onClick={() => setOpts((o) => ({ ...o, search: "" }))}>
              <X size={12} style={{ color: "var(--muted-foreground)" }} />
            </button>
          )}
        </div>

        <Popover
          open={filterOpen}
          onOpen={setFilterOpen}
          title="按类型筛选"
          icon={<SlidersHorizontal size={14} />}
          badge={opts.buckets.size || undefined}
          actionId="canvas.project-assets-filter"
        >
          {(Object.keys(BUCKETS) as Bucket[])
            // **只列真的有东西的桶**（外加已经选中的）—— 一个永远筛不出
            // 结果的选项，用户点了会以为筛坏了。
            .filter((b) => counts.get(b) || opts.buckets.has(b))
            .map((b) => (
              <MenuRow
                key={b}
                checked={opts.buckets.has(b)}
                onClick={() =>
                  setOpts((o) => {
                    const next = new Set(o.buckets)
                    if (!next.delete(b)) next.add(b)
                    return { ...o, buckets: next }
                  })
                }
              >
                {ICON[b]}
                <span className="flex-1">{BUCKETS[b]}</span>
                <span className="tabular-nums text-[11px]" style={{ color: "var(--muted-foreground)" }}>
                  {counts.get(b) ?? 0}
                </span>
              </MenuRow>
            ))}
          {opts.buckets.size > 0 && (
            <button
              onClick={() => setOpts((o) => ({ ...o, buckets: new Set() }))}
              className="mt-1 w-full rounded-md px-2.5 py-1.5 text-left text-[12px]"
              style={{ color: "var(--muted-foreground)" }}
            >
              清除筛选
            </button>
          )}
        </Popover>

        <Popover
          open={sortOpen}
          onOpen={setSortOpen}
          title="排序方式"
          icon={opts.dir === "asc" ? <ArrowUpAZ size={14} /> : <ArrowDownAZ size={14} />}
          actionId="canvas.project-assets-sort"
        >
          {(Object.keys(SORT_KEYS) as SortKey[]).map((k) => (
            <MenuRow key={k} checked={opts.sort === k} onClick={() => setOpts((o) => ({ ...o, sort: k }))}>
              <span className="flex-1">{SORT_KEYS[k]}</span>
            </MenuRow>
          ))}
          <div className="my-1 h-px" style={{ background: "var(--border)" }} />
          {(["asc", "desc"] as const).map((d) => (
            <MenuRow key={d} checked={opts.dir === d} onClick={() => setOpts((o) => ({ ...o, dir: d }))}>
              <span className="flex-1">{d === "asc" ? "升序" : "降序"}</span>
            </MenuRow>
          ))}
        </Popover>

        <IconBtn
          title={view === "list" ? "网格视图" : "列表视图"}
          onClick={() => setView((v) => (v === "list" ? "grid" : "list"))}
        >
          {view === "list" ? <LayoutGrid size={14} /> : <List size={14} />}
        </IconBtn>

        <IconBtn title="上传" onClick={() => fileRef.current?.click()}>
          <Upload size={14} />
        </IconBtn>
        <input
          ref={fileRef}
          type="file"
          multiple
          hidden
          onChange={(e) => {
            void doUpload([...(e.target.files ?? [])])
            // **要清空。** 不清的话选同一个文件第二次不会触发 change,
            // 表现是"上传第二次没反应"。
            e.target.value = ""
          }}
        />
      </div>

      {/* 批量操作条。官方 `projectAssets.selectionBar`,只在有选中时出现。 */}
      {picked.size > 0 && (
        <div
          data-action-ui-id="canvas.project-assets-selection-bar"
          className="mx-3 mb-2 flex items-center gap-2 rounded-md px-2.5 py-1.5"
          style={{ background: "var(--bg-subtle)" }}
        >
          <span className="text-[12px] tabular-nums">已选择 {picked.size} 项</span>
          <div className="flex-1" />
          <SmallBtn
            disabled={busy}
            onClick={() => {
              for (const a of rows.filter((r) => picked.has(r.path))) {
                downloadAsset(a)
              }
            }}
          >
            <Download size={12} /> 批量下载
          </SmallBtn>
          <SmallBtn disabled={busy} danger onClick={() => void doDelete()}>
            <Trash2 size={12} /> 批量删除
          </SmallBtn>
          <SmallBtn disabled={busy} onClick={() => setPicked(new Set())}>
            清除选择
          </SmallBtn>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-auto px-3 pb-3">
        {rows.length === 0 ? (
          <Empty searching={opts.search !== "" || opts.buckets.size > 0} />
        ) : view === "list" ? (
          <table className="w-full text-[12px]">
            <thead>
              <tr style={{ color: "var(--muted-foreground)" }}>
                <th className="w-7 py-1.5">
                  <input
                    type="checkbox"
                    aria-label="全选"
                    checked={allPicked}
                    onChange={() =>
                      setPicked(allPicked ? new Set() : new Set(rows.map((r) => r.path)))
                    }
                  />
                </th>
                <th className="py-1.5 text-left font-normal">名称</th>
                <th className="w-16 py-1.5 text-left font-normal">类型</th>
                <th className="w-20 py-1.5 text-right font-normal">大小</th>
                <th className="w-24 py-1.5 text-right font-normal">最近修改</th>
                <th className="w-16" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.path}
                  className="group"
                  style={{ borderTop: "1px solid var(--border)" }}
                >
                  <td className="py-1.5 text-center">
                    <input
                      type="checkbox"
                      aria-label="选中此行"
                      checked={picked.has(r.path)}
                      onChange={() => toggle(r.path)}
                    />
                  </td>
                  <td className="min-w-0 py-1.5">
                    <span className="flex items-center gap-1.5">
                      <span style={{ color: "var(--muted-foreground)" }}>{ICON[bucketOf(r)]}</span>
                      <span className="truncate" title={r.path}>
                        {r.name}
                      </span>
                    </span>
                  </td>
                  <td className="py-1.5" style={{ color: "var(--muted-foreground)" }}>
                    {BUCKETS[bucketOf(r)]}
                  </td>
                  <td className="py-1.5 text-right tabular-nums" style={{ color: "var(--muted-foreground)" }}>
                    {humanSize(r.file_size)}
                  </td>
                  <td className="py-1.5 text-right tabular-nums" style={{ color: "var(--muted-foreground)" }}>
                    {humanTime(timeOf(r))}
                  </td>
                  <td className="py-1.5">
                    {/* 行操作只在悬停时出现 —— 每行都常驻两个按钮会让列表
                        非常吵，而这两个都不是主操作。 */}
                    <span className="flex justify-end gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <IconBtn title="加入画布" onClick={() => onUse(r)}>
                        <Plus14 />
                      </IconBtn>
                      <IconBtn title="下载" onClick={() => downloadAsset(r)}>
                        <Download size={13} />
                      </IconBtn>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {rows.map((r) => (
              <button
                key={r.path}
                onClick={() => toggle(r.path)}
                onDoubleClick={() => onUse(r)}
                className="group relative overflow-hidden rounded-lg text-left"
                style={{
                  border: `1px solid ${picked.has(r.path) ? "var(--brand-accent)" : "var(--border)"}`,
                }}
              >
                <div
                  className="flex h-[92px] items-center justify-center"
                  style={{ background: "var(--bg-subtle)" }}
                >
                  {bucketOf(r) === "image" ? (
                    <img
                      src={assetUrl(r.id)}
                      alt=""
                      loading="lazy"
                      className="size-full object-cover"
                    />
                  ) : (
                    <span style={{ color: "var(--muted-foreground)" }}>{ICON[bucketOf(r)]}</span>
                  )}
                </div>
                <div className="px-1.5 py-1">
                  <div className="truncate text-[11px]" title={r.path}>
                    {r.name}
                  </div>
                  <div className="text-[10px] tabular-nums" style={{ color: "var(--muted-foreground)" }}>
                    {humanSize(r.file_size)}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {dropping && (
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center text-[13px]"
          style={{ background: "var(--modal-mask-bg)", color: "var(--foreground)" }}
        >
          拖拽文件到此处，或点击上传
        </div>
      )}
    </div>
  )
}

function Empty({ searching }: { searching: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1.5 py-16 text-center">
      <FolderOpen size={22} style={{ color: "var(--muted-foreground)" }} />
      <p className="text-[13px]">{searching ? "没有匹配的资产" : "暂无项目资产"}</p>
      <p className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>
        {/* 空态说的是**下一步做什么**,不是把"这里是空的"再说一遍。 */}
        {searching ? "换个关键词或清除筛选。" : "上传文件，或让 agent 生成一些东西。"}
      </p>
    </div>
  )
}

/**
 * 真的下载，不是在新标签页打开。
 *
 * `window.open` 对图片是"显示"、对视频是"播放" —— 只有带 `download` 的
 * `<a>` 才会走保存流程。这两件事标签上写的是「下载」。
 */
function downloadAsset(a: Asset) {
  const el = document.createElement("a")
  el.href = assetUrl(a.id)
  el.download = a.name
  document.body.appendChild(el)
  el.click()
  el.remove()
}

const Plus14 = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 5v14M5 12h14" />
  </svg>
)

function IconBtn({
  title,
  onClick,
  children,
}: {
  title: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="flex size-7 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-[var(--bg-subtle)]"
      style={{ color: "var(--muted-foreground)" }}
    >
      {children}
    </button>
  )
}

function SmallBtn({
  children,
  onClick,
  danger,
  disabled,
}: {
  children: ReactNode
  onClick: () => void
  danger?: boolean
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-1 rounded px-1.5 py-1 text-[11px] transition-opacity enabled:hover:opacity-80 disabled:opacity-40"
      style={{ color: danger ? "var(--canvas-node-tag-red)" : "var(--foreground)" }}
    >
      {children}
    </button>
  )
}

function MenuRow({
  checked,
  onClick,
  children,
}: {
  checked: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      role="menuitemcheckbox"
      aria-checked={checked}
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] transition-colors hover:bg-[var(--bg-subtle)]"
    >
      <Check size={12} style={{ opacity: checked ? 1 : 0 }} className="shrink-0" />
      {children}
    </button>
  )
}

function Popover({
  open,
  onOpen,
  title,
  icon,
  badge,
  actionId,
  children,
}: {
  open: boolean
  onOpen: (v: boolean) => void
  title: string
  icon: ReactNode
  badge?: number
  actionId: string
  children: ReactNode
}) {
  const box = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (!open) return
    const down = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) onOpen(false)
    }
    document.addEventListener("pointerdown", down)
    return () => document.removeEventListener("pointerdown", down)
  }, [open, onOpen])

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        data-action-ui-id={actionId}
        title={title}
        aria-expanded={open}
        onClick={() => onOpen(!open)}
        className="relative flex size-7 items-center justify-center rounded-md transition-colors hover:bg-[var(--bg-subtle)]"
        style={{ color: badge ? "var(--brand-accent)" : "var(--muted-foreground)" }}
      >
        {icon}
        {badge ? (
          <span
            className="absolute -right-0.5 -top-0.5 flex size-3.5 items-center justify-center rounded-full text-[9px] tabular-nums"
            style={{ background: "var(--brand-accent)", color: "var(--background)" }}
          >
            {badge}
          </span>
        ) : null}
      </button>
      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-1 min-w-[176px] rounded-lg border p-1"
          style={{
            background: "var(--popover)",
            borderColor: "var(--elevated-border-color)",
            boxShadow: "var(--canvas-shadow-menu)",
          }}
        >
          {children}
        </div>
      )}
    </div>
  )
}
