import { describe, expect, it } from "vitest"

import {
  createVisiblePreviewTabsStore,
  dedupeReferences,
  getNextPreviewTabIdAfterHide,
  readSnapshot,
  resolveVisiblePreviewEntries,
  selectStartupVisiblePreviewWorkspace,
  VISIBLE_PREVIEW_TABS_STORAGE_KEY,
  type DurableMirror,
} from "./tabs"

function memoryStorage(initial?: unknown) {
  const map = new Map<string, string>()
  if (initial !== undefined) map.set(VISIBLE_PREVIEW_TABS_STORAGE_KEY, JSON.stringify(initial))
  return {
    map,
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
  }
}

function recordingMirror() {
  const writes: Parameters<DurableMirror["set"]>[0][] = []
  return { writes, mirror: { set: (v) => void writes.push(v) } as DurableMirror }
}

const entry = (id: string, folderPath = id) => ({ workspaceId: id, folderPath })
const ids = (store: ReturnType<typeof createVisiblePreviewTabsStore>) => store.getSnapshot().tabs.map((t) => t.workspaceId)

describe("可见标签：读盘", () => {
  it("没有、坏数据、版本不对都当没对齐过", () => {
    expect(readSnapshot(memoryStorage())).toEqual({ initialized: false, tabs: [] })
    expect(readSnapshot({ getItem: () => "{oops" })).toEqual({ initialized: false, tabs: [] })
    expect(readSnapshot(memoryStorage({ version: 2, tabs: [] }))).toEqual({ initialized: false, tabs: [] })
  })

  it("旧版的裸数组也认，重复的 id / 目录去掉", () => {
    const s = readSnapshot(memoryStorage(["/a", { workspaceId: "/b", folderPath: "/b" }, "/a", { workspaceId: "/c", folderPath: "/b" }]))
    expect(s.initialized).toBe(true)
    expect(s.tabs).toEqual([{ workspaceId: "/a" }, { workspaceId: "/b", folderPath: "/b" }])
  })

  it("空串、空白、非字符串的引用丢掉", () => {
    expect(dedupeReferences(["", "  ", 3, null, { workspaceId: "" }, ["x"], "/ok"])).toEqual([{ workspaceId: "/ok" }])
  })
})

describe("可见标签：initialize", () => {
  it("第一次对齐：主进程的标签全部种进来，排在原有引用前面；只写一次本地", () => {
    const storage = memoryStorage()
    const { writes, mirror } = recordingMirror()
    const store = createVisiblePreviewTabsStore(storage, mirror)
    store.initialize([entry("/a"), entry("/b")])
    expect(ids(store)).toEqual(["/a", "/b"])
    expect(store.getSnapshot().initialized).toBe(true)
    expect(JSON.parse(storage.map.get(VISIBLE_PREVIEW_TABS_STORAGE_KEY)!)).toEqual({ version: 1, tabs: [entry("/a"), entry("/b")] })
    expect(writes.at(-1)).toEqual({ version: 1, initialized: true, tabs: [entry("/a"), entry("/b")] })
  })

  it("对齐前被关掉的不会被种回来", () => {
    const store = createVisiblePreviewTabsStore(memoryStorage(), recordingMirror().mirror)
    store.hide("/b")
    store.initialize([entry("/a"), entry("/b")])
    expect(ids(store)).toEqual(["/a"])
  })

  it("对齐前只写主进程镜像，不写本地（免得下次启动当成用户关光了）", () => {
    const storage = memoryStorage()
    const { writes, mirror } = recordingMirror()
    const store = createVisiblePreviewTabsStore(storage, mirror)
    store.show("/a")
    expect(storage.map.has(VISIBLE_PREVIEW_TABS_STORAGE_KEY)).toBe(false)
    expect(writes.at(-1)).toEqual({ version: 1, initialized: false, tabs: [{ workspaceId: "/a" }] })
  })

  it("对齐过之后：不增不减，只把引用换成主进程当前的 id / 目录", () => {
    const store = createVisiblePreviewTabsStore(memoryStorage({ version: 1, tabs: [{ workspaceId: "/old-id", folderPath: "/dir" }, { workspaceId: "/gone" }] }), recordingMirror().mirror)
    store.initialize([entry("/new-id", "/dir"), entry("/extra")])
    expect(store.getSnapshot().tabs).toEqual([{ workspaceId: "/new-id", folderPath: "/dir" }, { workspaceId: "/gone" }])
    // 可见 id 只算主进程里还在的
    expect(store.getVisibleWorkspaceIds()).toEqual(["/new-id"])
  })
})

describe("可见标签：show / hide / replace / reorder", () => {
  const initialized = () => {
    const store = createVisiblePreviewTabsStore(memoryStorage({ version: 1, tabs: [] }), recordingMirror().mirror)
    store.initialize([])
    return store
  }

  it("show 追加到末尾；已在的不动顺序，只补上目录", () => {
    const store = initialized()
    store.show("/a")
    store.show(entry("/b"))
    store.show(entry("/a"))
    expect(store.getSnapshot().tabs).toEqual([entry("/a"), entry("/b")])
  })

  it("show 同一目录换了 id：原位替换", () => {
    const store = initialized()
    store.show(entry("/a", "/dir"))
    store.show(entry("/a2", "/dir"))
    expect(store.getSnapshot().tabs).toEqual([entry("/a2", "/dir")])
  })

  it("hide 支持单个和多个，通知订阅者；没变化不通知", () => {
    const store = initialized()
    store.show("/a")
    store.show("/b")
    store.show("/c")
    let calls = 0
    store.subscribe(() => calls++)
    store.hide(["/a", "/c"])
    expect(ids(store)).toEqual(["/b"])
    expect(calls).toBe(1)
    store.hide("/zzz")
    expect(calls).toBe(1)
  })

  it("replace 原位换 id；找不到就追加", () => {
    const store = initialized()
    store.show("/a")
    store.show("/b")
    store.replace("/a", entry("/a2"))
    store.replace("/nope", entry("/c"))
    expect(ids(store)).toEqual(["/a2", "/b", "/c"])
  })

  it("reorder 把拖动的挪到目标位置", () => {
    const store = initialized()
    for (const id of ["/a", "/b", "/c", "/d"]) store.show(id)
    store.reorder("/a", "/c")
    expect(ids(store)).toEqual(["/b", "/c", "/a", "/d"])
    store.reorder("/d", "/b")
    expect(ids(store)).toEqual(["/d", "/b", "/c", "/a"])
    store.reorder("/d", "/missing")
    expect(ids(store)).toEqual(["/d", "/b", "/c", "/a"])
  })
})

describe("resolveVisiblePreviewEntries", () => {
  it("按引用顺序；id 对不上按目录找；重复和不在的丢掉", () => {
    const entries = [entry("/x", "/dir-x"), entry("/y", "/dir-y"), entry("/z", "/dir-z")]
    const refs = [{ workspaceId: "/z" }, { workspaceId: "/stale", folderPath: "/dir-x" }, { workspaceId: "/gone" }, { workspaceId: "/z" }]
    expect(resolveVisiblePreviewEntries(entries, refs).map((e) => e.workspaceId)).toEqual(["/z", "/x"])
  })
})

describe("关标签后去哪", () => {
  it("取右边顶上来的；关最右边的取新的最右边；只剩它一个返回 null", () => {
    expect(getNextPreviewTabIdAfterHide(["a", "b", "c"], "a")).toBe("b")
    expect(getNextPreviewTabIdAfterHide(["a", "b", "c"], "b")).toBe("c")
    expect(getNextPreviewTabIdAfterHide(["a", "b", "c"], "c")).toBe("b")
    expect(getNextPreviewTabIdAfterHide(["a"], "a")).toBeNull()
    expect(getNextPreviewTabIdAfterHide(["a", "b"], "zzz")).toBeNull()
  })
})

describe("启动恢复挑哪个", () => {
  it("没对齐过：信主进程的偏好，否则第一个恢复的", () => {
    const snap = { initialized: false, tabs: [] }
    expect(selectStartupVisiblePreviewWorkspace(snap, ["/a", "/b"], "/b")).toBe("/b")
    expect(selectStartupVisiblePreviewWorkspace(snap, ["/a", "/b"], "/zzz")).toBe("/a")
    expect(selectStartupVisiblePreviewWorkspace(snap, [], "/a")).toBeNull()
  })

  it("对齐过：只在用户上次可见的里面挑，偏好不可见就取第一个可见的", () => {
    const snap = { initialized: true, tabs: [{ workspaceId: "/c" }, { workspaceId: "/old", folderPath: "/b" }] }
    expect(selectStartupVisiblePreviewWorkspace(snap, ["/a", "/b", "/c"], "/a")).toBe("/c")
    expect(selectStartupVisiblePreviewWorkspace(snap, ["/a", "/b", "/c"], "/b")).toBe("/b")
    expect(selectStartupVisiblePreviewWorkspace({ initialized: true, tabs: [] }, ["/a"], "/a")).toBeNull()
  })
})
