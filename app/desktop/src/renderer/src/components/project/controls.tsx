import { Check, Folder, Search, Users } from "lucide-react"
import { forwardRef, useEffect, useMemo, useRef, useState, type HTMLAttributes, type KeyboardEvent } from "react"
import { useTranslation } from "react-i18next"

import { cn } from "../../lib"
import type { ProjectRecord } from "../../ipc"
import { filterProjectsByKeyword, PROJECT_NAME_MAX_CHARS, sortProjects, truncateProjectName } from "../../stores/projects"
import { DropdownMenuItem, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger } from "../ui/dropdown-menu"

/** 里面还要放按钮（菜单触发器）时用它代替 button，避免按钮套按钮 */
export const ClickableArea = forwardRef<HTMLDivElement, Omit<HTMLAttributes<HTMLDivElement>, "onClick"> & { onClick?: () => void }>(
  ({ onClick, onKeyDown, children, ...props }, ref) => (
    <div
      ref={ref}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onClick?.()
        }
        onKeyDown?.(e)
      }}
      {...props}
    >
      {children}
    </div>
  ),
)
ClickableArea.displayName = "ClickableArea"

/** 原地改名：回车或失焦提交，Esc 取消；没改动当取消。输入法组字时的回车不算 */
export function InlineRenameInput({
  initialName,
  placeholder,
  maxLength = PROJECT_NAME_MAX_CHARS,
  className,
  onConfirm,
  onCancel,
}: {
  initialName: string
  placeholder?: string
  maxLength?: number
  className?: string
  onConfirm: (name: string) => void
  onCancel: () => void
}) {
  const [value, setValue] = useState(initialName)
  const inputRef = useRef<HTMLInputElement>(null)
  const composingRef = useRef(false)
  const effectiveMaxLength = Math.min(maxLength, PROJECT_NAME_MAX_CHARS)

  useEffect(() => {
    const input = inputRef.current
    if (!input) return
    input.focus()
    input.select()
    input.scrollLeft = 0
    requestAnimationFrame(() => {
      input.scrollLeft = 0
    })
  }, [])

  const submit = () => {
    const trimmed = truncateProjectName(value, effectiveMaxLength)
    if (trimmed === truncateProjectName(initialName, effectiveMaxLength)) {
      onCancel()
      return
    }
    onConfirm(trimmed)
  }

  return (
    <input
      ref={inputRef}
      data-action-ui-id="workspace-inline-rename"
      value={value}
      placeholder={placeholder}
      maxLength={effectiveMaxLength}
      onChange={(e) => setValue(e.target.value)}
      onCompositionStart={() => {
        composingRef.current = true
      }}
      onCompositionEnd={() => {
        composingRef.current = false
      }}
      onKeyDown={(e) => {
        e.stopPropagation()
        if (composingRef.current || e.nativeEvent.isComposing) return
        if (e.key === "Enter") submit()
        if (e.key === "Escape") onCancel()
      }}
      onBlur={submit}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      className={cn(
        "w-full min-w-[100px] rounded-sm border border-primary bg-transparent px-1 text-[14px] font-medium text-foreground outline-none placeholder:text-muted-foreground",
        className,
      )}
    />
  )
}

const PROJECT_PICKER_SEARCH_THRESHOLD = 6

/** 「添加到项目」子菜单；项目多了才出搜索框 */
export function AddToProjectSubMenu({
  projects,
  currentProjectId,
  onSelect,
}: {
  projects: ProjectRecord[]
  currentProjectId?: string
  onSelect: (projectId: string) => void
}) {
  const { t } = useTranslation()
  const [keyword, setKeyword] = useState("")
  const candidates = useMemo(() => sortProjects(filterProjectsByKeyword(projects, keyword), "updated"), [keyword, projects])
  const showSearch = projects.length >= PROJECT_PICKER_SEARCH_THRESHOLD
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger data-action-ui-id="workspace.add-to-project">
        <Folder size={14} strokeWidth={1.5} />
        {t("project.addToProject")}
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="flex max-h-56 min-w-44 max-w-72 flex-col overflow-hidden">
        {showSearch ? (
          <div className="flex shrink-0 items-center gap-1.5 px-2 pb-1.5">
            <Search size={12} strokeWidth={1.5} className="shrink-0 text-muted-foreground" />
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              onKeyDown={(event) => event.stopPropagation()}
              placeholder={t("project.searchPlaceholder")}
              className="h-6 w-full bg-transparent text-[12px] text-foreground outline-none placeholder:text-muted-foreground"
              data-action-ui-id="workspace.add-to-project-search"
            />
          </div>
        ) : null}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {candidates.length === 0 ? (
            <p className="px-2.5 py-1.5 text-[11px] whitespace-nowrap text-muted-foreground">{t("project.noProjects")}</p>
          ) : (
            candidates.map((project) => {
              const isCurrent = project.id === currentProjectId
              return (
                <DropdownMenuItem
                  key={project.id}
                  disabled={isCurrent}
                  onClick={(event) => {
                    event.stopPropagation()
                    if (isCurrent) return
                    onSelect(project.id)
                  }}
                >
                  {project.kind === "team" ? <Users size={14} strokeWidth={1.5} /> : <Folder size={14} strokeWidth={1.5} />}
                  <span className="min-w-0 flex-1 truncate">{project.name}</span>
                  {isCurrent ? <Check className="size-3" strokeWidth={1.75} /> : null}
                </DropdownMenuItem>
              )
            })
          )}
        </div>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  )
}
