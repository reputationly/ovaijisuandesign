import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { Bell, CircleCheck, FileText, Folder, FolderOpen, Monitor, Moon, Sun, Upload } from "lucide-react"
import { useEffect, useState, type ComponentType, type ReactNode } from "react"
import { useTranslation } from "react-i18next"

import { gatewayJson } from "../api/gateway"
import { queryKeys } from "../api/query-client"
import { hiloBridge, runtimeConfig } from "../api/runtime"
import { loadPlatformSettings, MODEL_FIELDS, readModel, savePlatformSettings, type ModelField } from "../api/settings"
import { Button } from "../components/ui/button"
import { Input, Switch } from "../components/ui/form"
import { dedupedToast } from "../components/ui/sonner"
import { syncLanguage } from "../i18n"
import { cn } from "../lib"
import { useGlobalConfig, type GlobalConfig, type Language, type ThemePref } from "../stores/global-config"
import type { SettingsSection } from "../stores/ui"
import { useTheme } from "../theme/ThemeProvider"
import { InfoCard, SettingGroup, SettingRow, SettingsSelect, UnavailableNotice } from "./parts"

// 设置页里的开关都直接写全局偏好，没有「保存」按钮
function ConfigSwitch<K extends keyof GlobalConfig>({ k, disabled }: { k: K; disabled?: boolean }) {
  const value = useGlobalConfig((s) => s.config[k])
  const update = useGlobalConfig((s) => s.update)
  return <Switch checked={Boolean(value)} disabled={disabled} onCheckedChange={(v) => update({ [k]: v } as Partial<GlobalConfig>)} />
}

function GeneralSection() {
  const { t } = useTranslation()
  const language = useGlobalConfig((s) => s.config.language)
  const update = useGlobalConfig((s) => s.update)
  const watermark = useGlobalConfig((s) => s.config.watermarkEnabled)
  const { theme, setTheme } = useTheme()
  const { i18n } = useTranslation()
  const current = (language ?? (i18n.language.startsWith("zh") ? "zh" : "en")) as Language

  return (
    <div className="space-y-2">
      <SettingGroup>
        <SettingRow label={t("settings.language")} description={t("settings.languageDesc")}>
          <SettingsSelect<Language>
            className="w-32"
            value={current}
            aria-label={t("settings.language")}
            options={[
              { value: "zh", label: "中文" },
              { value: "en", label: "English" },
            ]}
            onChange={(v) => {
              update({ language: v })
              syncLanguage(v)
            }}
          />
        </SettingRow>
        <SettingRow label={t("settings.theme")} description={t("settings.themeDesc")}>
          <SettingsSelect<ThemePref>
            className="w-32"
            value={theme}
            aria-label={t("settings.theme")}
            options={[
              { value: "light", label: t("settings.themeLight"), icon: Sun },
              { value: "dark", label: t("settings.themeDark"), icon: Moon },
              { value: "system", label: t("settings.themeSystem"), icon: Monitor },
            ]}
            onChange={setTheme}
          />
        </SettingRow>
        <SettingRow label={t("settings.islandLayout")} description={t("settings.islandLayoutDesc")}>
          <ConfigSwitch k="islandLayout" />
        </SettingRow>
        <SettingRow label={t("settings.transparentWindowExperiment")} description={t("settings.transparentWindowExperimentDesc")}>
          <ConfigSwitch k="transparentWindowExperiment" />
        </SettingRow>
        <SettingRow label={t("settings.removeWatermark")} description={t("settings.removeWatermarkDesc")}>
          <div className="flex flex-col items-end gap-1">
            {/* 开关语义是「去除」，所以和 watermarkEnabled 相反 */}
            <Switch checked={!watermark} onCheckedChange={(v) => update({ watermarkEnabled: !v })} />
          </div>
        </SettingRow>
      </SettingGroup>
      <SettingGroup title={t("settings.groupSystem")}>
        <SettingRow label={t("settings.autoStart")} description={t("settings.autoStartDesc")}>
          <ConfigSwitch k="runOnStartup" />
        </SettingRow>
        <SettingRow label={t("settings.tray")} description={t("settings.trayDesc")}>
          <ConfigSwitch k="trayEnabled" />
        </SettingRow>
        <SettingRow label={t("settings.preventSleep")} description={t("settings.preventSleepDesc")}>
          <PreventSleepSwitch />
        </SettingRow>
        <SettingRow label={t("settings.notifications")} description={t("settings.notificationsDesc")}>
          <Button variant="outline" className="h-8 gap-1.5 text-xs font-normal" disabled>
            {t("settings.openSystemPrefs")}
            <Bell />
          </Button>
        </SettingRow>
      </SettingGroup>
      <SettingGroup title={t("settings.shortcuts")}>
        <ShortcutList />
      </SettingGroup>
    </div>
  )
}

/** 防休眠由 gateway 持有系统断言；接口不在时开关置灰 */
function PreventSleepSwitch() {
  const qc = useQueryClient()
  const { data, isError } = useQuery({
    queryKey: ["system", "awake"],
    queryFn: () => gatewayJson<{ enabled: boolean }>("/api/system/awake"),
  })
  return (
    <Switch
      checked={!!data?.enabled}
      disabled={isError || !data}
      onCheckedChange={async (enabled) => {
        try {
          const r = await gatewayJson<{ enabled?: boolean; ok?: boolean; error?: string }>("/api/system/awake", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ enabled }),
          })
          if (r.ok === false && r.error) dedupedToast.error(r.error)
        } finally {
          void qc.invalidateQueries({ queryKey: ["system", "awake"] })
        }
      }}
    />
  )
}

// 修饰键字形宽窄不一，单独给字号让几个键帽视觉等高
const KEY_FONT: Record<string, string> = { "⌘": "text-[16px] font-normal", "⌃": "text-[14px] font-normal", "⇧": "text-[15px] font-medium", "⌥": "text-[14px] font-normal" }

function ShortcutList() {
  const { t } = useTranslation()
  const rows: [string, string[]][] = [
    ["settings.shortcutNewChat", ["⌘", "N"]],
    ["settings.shortcutScreenshot", ["⌃", "⇧", "S"]],
    ["settings.shortcutSettings", ["⌘", ","]],
    ["settings.shortcutNewWorkspace", ["⌘", "⇧", "N"]],
    ["settings.shortcutCloseTab", ["⌘", "W"]],
  ]
  return (
    <div className="space-y-0.5 rounded-lg bg-secondary p-1.5">
      {rows.map(([key, keys]) => (
        <div key={key} className="flex min-h-9 items-center justify-between gap-4 rounded-md px-3 py-1.5">
          <span className="min-w-0 truncate text-xs text-foreground">{t(key)}</span>
          <kbd className="inline-flex items-center shrink-0 gap-1.5" data-slot="kbd-group" aria-label={keys.join("")}>
            {keys.map((k) => (
              <kbd
                key={k}
                data-slot="kbd"
                className={cn(
                  "pointer-events-none inline-flex w-fit items-center justify-center gap-1 select-none h-6 min-w-6 rounded-md border border-border bg-background px-1.5 font-sans text-foreground/70 leading-none",
                  KEY_FONT[k] ?? "text-[12px] font-medium",
                )}
              >
                {k}
              </kbd>
            ))}
          </kbd>
        </div>
      ))}
    </div>
  )
}

function AccountSection() {
  const { t } = useTranslation()
  return (
    <UnavailableNotice>
      <div className="space-y-3">
        <SettingGroup title={t("settings.account.infoTitle")}>
          <InfoCard
            rows={[
              { label: t("settings.account.nameLabel"), value: "—" },
              { label: t("settings.account.accountLabel"), value: "—" },
              { label: t("settings.account.uidLabel"), value: "—" },
            ]}
          />
        </SettingGroup>
        <SettingGroup title={t("settings.account.teamsTitle")}>
          <div className="rounded-lg bg-secondary p-1.5">
            <p className="px-2.5 py-2 text-sm text-muted-foreground">{t("settings.account.noTeams")}</p>
          </div>
        </SettingGroup>
      </div>
    </UnavailableNotice>
  )
}

function usePlatformSettings() {
  return useQuery({ queryKey: queryKeys.settings, queryFn: loadPlatformSettings })
}

function StorageSection() {
  const { t } = useTranslation()
  const { data } = usePlatformSettings()
  // 主进程给的是项目根目录；旧后端退回当前工作区目录
  const ws = useQuery({ queryKey: queryKeys.workspace, queryFn: () => gatewayJson<{ dir: string }>("/api/workspace"), enabled: !data?.workspace })
  const dir = data?.workspace || ws.data?.dir
  return (
    <div className="space-y-1.5">
      <SettingRow label={t("settings.storage.dataDirectory")} description={t("settings.storage.dataDirectoryDesc")}>
        <Button variant="outline" className="h-8 gap-1.5 text-xs font-normal" disabled>
          <FolderOpen />
          {t("settings.storage.browse")}
        </Button>
      </SettingRow>
      <div className="space-y-1.5 rounded-sm border border-border bg-muted/30 px-3 py-2">
        <div className="flex items-center gap-2">
          <Folder size={14} strokeWidth={1.5} className="shrink-0 text-muted-foreground" />
          <p className="truncate text-xs text-muted-foreground select-text" title={dir}>
            {dir ?? t("settings.storage.systemDefaultLocation")}
          </p>
        </div>
      </div>
      {data?.path ? (
        <SettingGroup title={t("ov.settings.storage.config")}>
          <InfoCard rows={[{ label: t("ov.settings.storage.config"), value: data.path, title: data.path }]} />
        </SettingGroup>
      ) : null}
    </div>
  )
}

function NetworkSection() {
  const { t } = useTranslation()
  const mode = useGlobalConfig((s) => s.config.networkProxyMode)
  const update = useGlobalConfig((s) => s.update)
  return (
    <div className="space-y-4">
      <SettingGroup title={t("settings.network.proxyGroup")}>
        <SettingRow label={t("settings.network.proxyMode")} description={t("settings.network.proxyModeDesc")}>
          <SettingsSelect
            value={mode}
            aria-label={t("settings.network.proxyMode")}
            options={[
              { value: "auto", label: t("settings.network.proxyMode.auto") },
              { value: "system", label: t("settings.network.proxyMode.system") },
              { value: "direct", label: t("settings.network.proxyMode.direct") },
            ]}
            onChange={(v) => {
              update({ networkProxyMode: v })
              dedupedToast.success(t("settings.network.proxyModeSaved"))
            }}
          />
        </SettingRow>
      </SettingGroup>
    </div>
  )
}

/**
 * 平台接入：只填接口地址和令牌（API Key）。模型由产品预设定，这里只展示正在使用的模型，不让选
 * （主进程也不收模型字段，见 `app/desktop/src/main/settings.ts`）。
 */
function ModelsSection() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { data, error, isLoading } = usePlatformSettings()
  const [form, setForm] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!data) return
    setForm({
      baseUrl: data.platform.baseUrl,
      // 留空 = 不改；填掩码会被当成新 key 写回去
      apiKey: "",
    })
  }, [data])

  const set = (k: string) => (v: string) => setForm((f) => ({ ...f, [k]: v }))
  const save = async () => {
    setSaving(true)
    try {
      await savePlatformSettings({ baseUrl: form.baseUrl, apiKey: form.apiKey })
      dedupedToast.success(t("ov.settings.platform.saved"))
      await qc.invalidateQueries({ queryKey: queryKeys.settings })
    } catch (e) {
      dedupedToast.error(e instanceof Error ? e.message : t("settings.models.saveFailed"))
    } finally {
      setSaving(false)
    }
  }

  if (error) {
    return <p className="text-xs text-destructive">{t("ov.settings.platform.loadFailed", { message: error instanceof Error ? error.message : String(error) })}</p>
  }

  // 正在使用的模型：按生效的配置列出（缺的已由主进程用产品预设补全），只展示。
  const models = data?.models ?? {}
  const usedRows: { key: string; label: string; model: string | null }[] = [
    { key: "chat", label: t("ov.settings.platform.chatModel"), model: data?.platform.chatModel || null },
    ...MODEL_FIELDS.map(([f]) => ({
      key: f,
      label: t(`ov.settings.platform.${f satisfies ModelField}`),
      model: readModel(models, f) || null,
    })),
  ]

  return (
    <div className="space-y-4">
      <p className="text-xs leading-5 text-muted-foreground">{t("ov.settings.platform.desc")}</p>
      <SettingGroup title={t("ov.settings.platform.title")}>
        <div className="space-y-3 rounded-lg bg-secondary p-3">
          <Field label={t("settings.models.baseUrl")}>
            <Input value={form.baseUrl ?? ""} placeholder={t("settings.models.baseUrlPlaceholder")} onChange={(e) => set("baseUrl")(e.target.value)} disabled={isLoading} />
          </Field>
          <Field label={t("settings.models.apiKey")} hint={t("settings.models.apiKeyHelp")}>
            <Input
              type="password"
              value={form.apiKey ?? ""}
              placeholder={data?.platform.hasApiKey ? data.platform.apiKeyMasked : t("settings.models.apiKeyPlaceholder")}
              onChange={(e) => set("apiKey")(e.target.value)}
              disabled={isLoading}
            />
          </Field>
        </div>
      </SettingGroup>
      <SettingGroup title={t("ov.settings.platform.modelsInUse")}>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 rounded-lg bg-secondary p-3">
          {usedRows.map((row) => (
            <div key={row.key} className="flex min-w-0 items-baseline justify-between gap-2 text-sm">
              <span className="shrink-0 text-muted-foreground">{row.label}</span>
              {row.model ? (
                <span className="min-w-0 truncate font-mono text-xs" title={row.model}>
                  {row.model}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">{t("ov.settings.platform.notEnabled")}</span>
              )}
            </div>
          ))}
        </div>
      </SettingGroup>
      <div className="flex justify-end">
        <Button onClick={() => void save()} loading={saving} disabled={isLoading}>
          {t("common.save")}
        </Button>
      </div>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs text-foreground/80">{label}</span>
      {children}
      {hint ? <span className="text-[11px] text-muted-foreground">{hint}</span> : null}
    </label>
  )
}

function AdvancedSection() {
  const { t } = useTranslation()
  // 日志目录归主进程管（main.log 等）；没有主进程时不可用
  const diagnostics = hiloBridge().diagnostics
  const logs = useQuery({ queryKey: ["system", "logs"], queryFn: async () => ({ dir: diagnostics ? String(await diagnostics.getLogPath()) : undefined }), enabled: !!diagnostics })
  const openLogs = async () => {
    try {
      await diagnostics?.openLogDir()
    } catch (e) {
      dedupedToast.error(e instanceof Error ? e.message : String(e))
    }
  }
  return (
    <div className="space-y-4">
      <SettingGroup>
        <SettingRow label={t("settings.disableGpu")} description={t("settings.disableGpuDesc")}>
          <Switch checked={false} disabled />
        </SettingRow>
      </SettingGroup>
      <SettingGroup title={t("settings.groupDiagnostics")}>
        <SettingRow label={t("settings.logDirectory")} description={logs.data?.dir ?? t("settings.logDirectoryDesc")}>
          <Button variant="outline" className="h-8 gap-1.5 text-xs font-normal" disabled={!diagnostics} onClick={() => void openLogs()}>
            <FolderOpen />
            {t("fileExplorer.open")}
          </Button>
        </SettingRow>
        <SettingRow label={t("settings.uploadLogs")} description={t("settings.uploadLogsDesc")}>
          <Button variant="outline" className="h-8 gap-1.5 text-xs font-normal" disabled>
            <Upload />
            {t("settings.uploadLogs")}
          </Button>
        </SettingRow>
      </SettingGroup>
      <SettingGroup title={t("settings.folderWhitelist.title")}>
        <SettingRow label={t("settings.folderWhitelist.listGroup")} description={t("settings.folderWhitelist.description")}>
          <Button variant="outline" className="h-8 text-xs font-normal" disabled>
            {t("settings.folderWhitelist.manage")}
          </Button>
        </SettingRow>
      </SettingGroup>
    </div>
  )
}

function SoftwareUpdateSection() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-secondary/60 p-2" data-action-ui-id="settings.software-update.status-card">
        <div className="flex items-center gap-2 rounded-md px-2 py-2">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-card text-muted-foreground">
            <CircleCheck className="size-7 text-success" strokeWidth={1.5} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-normal text-foreground">{t("settings.softwareUpdate.statusLatest")}</p>
          </div>
          <span className="whitespace-nowrap text-[11px] text-muted-foreground">
            {t("settings.softwareUpdate.currentVersion", { version: `v${runtimeConfig().appVersion}` })}
          </span>
        </div>
        <div className="border-t border-border/70 px-2 pt-3 pb-2 pl-14">
          <p className="text-xs text-muted-foreground">{t("ov.settings.update.manual")}</p>
        </div>
      </div>
      <div className="space-y-1">
        <button
          type="button"
          className="flex w-full cursor-pointer items-center gap-3 rounded-sm px-3 py-2 text-left transition-colors hover:bg-foreground/[0.03]"
          onClick={() => void navigate({ to: "/changelog" })}
        >
          <FileText size={16} strokeWidth={1.5} className="shrink-0 text-foreground" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-normal text-foreground">{t("settings.softwareUpdate.releaseNotes")}</p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{t("settings.softwareUpdate.releaseNotesEmpty")}</p>
          </div>
        </button>
      </div>
    </div>
  )
}

function Unavailable() {
  return <UnavailableNotice />
}

export const SECTION_COMPONENTS: Record<SettingsSection, ComponentType> = {
  general: GeneralSection,
  account: AccountSection,
  storage: StorageSection,
  network: NetworkSection,
  models: ModelsSection,
  memory: Unavailable,
  imBridge: Unavailable,
  assetCenter: Unavailable,
  comfyui: Unavailable,
  advanced: AdvancedSection,
  softwareUpdate: SoftwareUpdateSection,
}
