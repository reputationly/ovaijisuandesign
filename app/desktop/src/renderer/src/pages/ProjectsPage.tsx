import { useNavigate, useSearch } from "@tanstack/react-router"
import { BookOpen, ChevronDown, CloudUpload, FolderOpen, Plus, Search } from "lucide-react"
import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { Button } from "../components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "../components/ui/dropdown-menu"
import { Input } from "../components/ui/form"
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs"
import { useWorkspaceList, type ProjectEntry } from "../stores/workspaces"
import { CatalogPage, PageState } from "./common"

type SortKey = "updated" | "created" | "name"

export function ProjectsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  // 路由 id 在类型层和运行时对末尾斜杠的处理不一致，这里不按 id 取
  const kind = (useSearch({ strict: false }) as { kind?: "local" | "team" }).kind ?? "local"
  const { data } = useWorkspaceList()
  const [query, setQuery] = useState("")
  const [sort, setSort] = useState<SortKey>("updated")

  const projects = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = (data?.projects ?? []).filter((p) => !q || p.name.toLowerCase().includes(q))
    if (sort === "name") return [...list].sort((a, b) => a.name.localeCompare(b.name))
    return [...list].sort((a, b) => b.createdAt - a.createdAt)
  }, [data, query, sort])

  const heroBtn = "h-9 gap-1.5 rounded-lg px-4 text-[13px] font-medium"

  return (
    <CatalogPage
      id="project-list"
      title={t("project.hubTitle")}
      subtitle={t("project.heroDescription")}
      actions={
        <>
          <Button className={heroBtn} data-action-ui-id="project-list.create-trigger" disabled>
            <Plus />
            {t("project.create.trigger")}
          </Button>
          <Button variant="outline" className={heroBtn} data-action-ui-id="project-list.tutorial-trigger" disabled>
            <BookOpen />
            <span className="max-w-48 truncate">{t("project.tutorial.trigger")}</span>
          </Button>
        </>
      }
    >
      <div className="flex min-w-0 flex-nowrap items-center gap-3 py-2">
        <Tabs
          className="shrink-0"
          value={kind}
          onValueChange={(v) => void navigate({ to: "/projects", search: { kind: v === "team" ? "team" : undefined } })}
        >
          <TabsList variant="underline" aria-label={t("project.kindTabsAria")} data-action-ui-id="project-list.kind-tabs">
            <TabsTrigger variant="underline" value="local" className="gap-1.5" data-action-ui-id="project-list.kind-tab-local">
              {t("project.kindTabs.local")}
            </TabsTrigger>
            <TabsTrigger variant="underline" value="team" className="gap-1.5" data-action-ui-id="project-list.kind-tab-team">
              {t("project.kindTabs.cloud")}
              <CloudUpload size={16} strokeWidth={1.5} />
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="scrollbar-none flex min-w-0 flex-1 flex-nowrap items-center gap-3 overflow-x-auto overscroll-x-contain [&>*:first-child]:ml-auto">
          <div className="w-60 min-w-36 max-w-60 flex-1 shrink">
            <div className="relative flex h-9 w-60 max-w-full shrink-0 items-center" data-slot="page-search-input">
              <Search size={16} strokeWidth={1.5} className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-9 pl-9 pr-9"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("project.searchPlaceholder")}
                aria-label={t("project.searchPlaceholder")}
                data-action-ui-id="project-list.search"
              />
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger
              className="flex h-9 shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg border border-border bg-transparent px-3 text-xs text-foreground transition-colors hover:border-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
              data-action-ui-id="project-list.sort-trigger"
              aria-label={t("project.sortLabel")}
            >
              {t(`project.sort.${sort}`)}
              <ChevronDown size={14} strokeWidth={1.5} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuRadioGroup value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                {(["updated", "created", "name"] as const).map((k) => (
                  <DropdownMenuRadioItem key={k} value={k}>
                    {t(`project.sort.${k}`)}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="flex flex-1 flex-col motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-200">
        {kind === "local" && projects.length > 0 ? (
          <div className="mt-2 grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
            {projects.map((p) => (
              <ProjectCard key={p.id} project={p} onOpen={() => void navigate({ to: "/projects/$projectId", params: { projectId: p.id } })} />
            ))}
          </div>
        ) : (
          <PageState />
        )}
      </div>
    </CatalogPage>
  )
}

// 文件夹造型的卡片：后层是倾斜的封面，前层是带标签页缺口的半透明夹片
const LAYER_BORDER = "border-[color:color-mix(in_srgb,var(--sidebar-foreground)_4%,transparent)] group-hover:border-[color:color-mix(in_srgb,var(--sidebar-foreground)_10%,transparent)]"
const FRONT_BG =
  "bg-[color:color-mix(in_srgb,color-mix(in_srgb,var(--sidebar-accent)_98%,var(--sidebar-foreground))_88%,transparent)] group-hover:bg-[color:color-mix(in_srgb,color-mix(in_srgb,var(--sidebar-accent)_92%,var(--brand-accent))_88%,transparent)]"

function ProjectCard({ project, onOpen }: { project: ProjectEntry; onOpen: () => void }) {
  const date = new Date(project.createdAt)
  return (
    <div className="group relative w-full aspect-[4/3] min-w-0 overflow-visible text-left">
      <span
        className={`pointer-events-none absolute inset-x-0 top-1 bottom-0 z-0 rounded-[24px] border ${LAYER_BORDER} bg-[color:color-mix(in_srgb,var(--sidebar-accent)_98%,var(--sidebar-foreground))] shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-[background-color,border-color,box-shadow] duration-200 group-hover:bg-[color:color-mix(in_srgb,var(--sidebar-accent)_92%,var(--brand-accent))] group-hover:shadow-[0_2px_6px_rgba(0,0,0,0.06)]`}
      />
      <div className="relative z-10 flex h-full w-full cursor-pointer flex-col items-stretch text-left" data-action-ui-id="project-card" role="button" tabIndex={0} onClick={onOpen}>
        <div className="pointer-events-none absolute inset-x-5 top-4 h-[64%]">
          <div className="absolute inset-x-3 top-0 h-[88%] -rotate-3 rounded-[18px] bg-muted shadow-[0_3px_8px_rgba(0,0,0,0.10)]" />
          <div className="absolute -inset-x-0.5 top-3 h-[88%] rotate-2 overflow-hidden rounded-[18px] border border-border bg-card p-1 shadow-[0_4px_10px_rgba(0,0,0,0.14)]">
            <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-[12px] bg-muted text-muted-foreground">
              <FolderOpen size={28} strokeWidth={1.25} />
            </div>
          </div>
        </div>
        <span className={`pointer-events-none absolute top-[40%] left-0 h-5 w-24 translate-y-px rounded-t-[32px] border border-b-0 ${LAYER_BORDER} ${FRONT_BG} backdrop-blur-[6px] transition-colors duration-200`} />
        <div
          className={`absolute inset-x-0 bottom-0 top-[calc(40%+20px)] flex min-h-0 flex-col justify-end overflow-hidden rounded-tr-[30px] rounded-b-[24px] border border-t-0 ${LAYER_BORDER} ${FRONT_BG} pr-12 pl-5 pt-8 pb-3 backdrop-blur-[6px] transition-colors duration-200`}
        >
          <p className="overflow-hidden text-ellipsis whitespace-nowrap text-[15px] font-medium text-[color:color-mix(in_srgb,var(--sidebar-foreground)_68%,transparent)] transition-colors group-hover:text-[color:color-mix(in_srgb,var(--sidebar-accent-foreground)_76%,transparent)] dark:text-[color:color-mix(in_srgb,var(--sidebar-foreground)_92%,transparent)] dark:group-hover:text-[color:color-mix(in_srgb,var(--sidebar-accent-foreground)_98%,transparent)]">
            {project.name}
          </p>
          <p className="text-[11px] text-sidebar-foreground/60 transition-colors group-hover:text-sidebar-accent-foreground/70 dark:text-sidebar-foreground/80 dark:group-hover:text-sidebar-accent-foreground/90">
            {`${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}`}
          </p>
        </div>
      </div>
    </div>
  )
}
