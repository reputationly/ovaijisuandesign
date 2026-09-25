/**
 * 路由查询参数的解析。未知或不合法的值一律丢掉，页面回到默认状态，
 * 不让外部入口（深链、菜单）传进来的脏数据把页面带进奇怪的状态。
 */

export interface SkillsSearch {
  capability?: "skills" | "connectors"
  tab?: "community" | "plugins" | "mine"
  subTab?: "skills" | "plugins"
  pluginId?: string
  skillName?: string
  connectorId?: string
}

const trimmed = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined)

export function pickSkillsSearch(s: Record<string, unknown>): SkillsSearch {
  const out: SkillsSearch = {}
  if (s.capability === "skills" || s.capability === "connectors") out.capability = s.capability
  if (s.tab === "community" || s.tab === "plugins" || s.tab === "mine") out.tab = s.tab
  if (s.subTab === "skills" || s.subTab === "plugins") out.subTab = s.subTab
  const pluginId = trimmed(s.pluginId)
  if (pluginId) out.pluginId = pluginId
  const skillName = trimmed(s.skillName)
  if (skillName) out.skillName = skillName
  const connectorId = trimmed(s.connectorId)
  if (connectorId) out.connectorId = connectorId
  return out
}

export interface WorkspaceSearch {
  workspaceId?: string
  initialPayloadId?: string
  initialMessage?: string
  initialAttachments?: string[]
  initialEntityRefs?: string[]
  initialModelId?: string
  initialSelectedMediaModels?: { image?: string[]; video?: string[]; audio?: string[] }
  skillPrompt?: string
  skillName?: string
  pluginId?: string
  initialComfyUiWorkflowId?: string
  initialComfyUiWorkflowTarget?: "current" | "new"
  menuAction?: "new-chat" | "open-settings"
  assetCenterRelocation?: true
}

/** 字符串数组既可能直接给数组，也可能是 JSON 串（从 URL 回来时） */
function stringList(v: unknown): string[] | undefined {
  let raw = v
  if (typeof v === "string") {
    try {
      raw = JSON.parse(v)
    } catch {
      return undefined
    }
  }
  return Array.isArray(raw) && raw.every((x) => typeof x === "string") ? raw : undefined
}

function mediaModels(v: unknown): WorkspaceSearch["initialSelectedMediaModels"] {
  let raw = v
  if (typeof v === "string") {
    try {
      raw = JSON.parse(v)
    } catch {
      return undefined
    }
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined
  const obj = raw as Record<string, unknown>
  const out: NonNullable<WorkspaceSearch["initialSelectedMediaModels"]> = {}
  for (const k of ["image", "video", "audio"] as const) {
    const list = stringList(obj[k])
    if (list) out[k] = list
  }
  return out
}

const str = (v: unknown) => (typeof v === "string" ? v : undefined)

export function parseWorkspaceSearch(s: Record<string, unknown>): WorkspaceSearch {
  return {
    workspaceId: trimmed(s.workspaceId),
    initialPayloadId: str(s.initialPayloadId),
    initialMessage: s.initialMessage != null ? String(s.initialMessage) : undefined,
    initialAttachments: stringList(s.initialAttachments),
    initialEntityRefs: stringList(s.initialEntityRefs),
    initialModelId: str(s.initialModelId),
    initialSelectedMediaModels: mediaModels(s.initialSelectedMediaModels),
    skillPrompt: str(s.skillPrompt),
    skillName: str(s.skillName),
    pluginId: str(s.pluginId),
    initialComfyUiWorkflowId: trimmed(s.initialComfyUiWorkflowId),
    initialComfyUiWorkflowTarget: s.initialComfyUiWorkflowTarget === "current" || s.initialComfyUiWorkflowTarget === "new" ? s.initialComfyUiWorkflowTarget : undefined,
    menuAction: s.menuAction === "new-chat" || s.menuAction === "open-settings" ? s.menuAction : undefined,
    assetCenterRelocation: s.assetCenterRelocation === true || s.assetCenterRelocation === "true" ? true : undefined,
  }
}
