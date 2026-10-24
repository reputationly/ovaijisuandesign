/**
 * 外部 Agent 设置分区。
 *
 * 对应的后端能力见：
 *   · 协议常量 app/packages/protocol/src/external-agent.ts
 *   · HTTP 入口 app/mcp-tools/src/external-main.ts（127.0.0.1:<port>/mcp）
 *   · 进程管理 app/desktop/src/main/external-agent/external-agent-service.ts
 *
 * 这里只读写 store 里的 externalAgent 字段；主进程订阅该键并重启服务。
 * 4.0.4 增加「项目范围」：不选=全部项目；选了就只允许这些目录。
 * 模型范围（selectedMediaModels）需要 MCP 侧过滤，当前后端未接，故不展示假开关。
 */
import reactExports from "react";
import { useTranslation } from "react-i18next";

import { useStorage } from "../infra/use-storage.js";
import { useProjects } from "../workspace/normalize-project-entries.js";

const DEFAULTS = { enabled: false, port: 18810, allowedProjectPaths: [] };

export function ExternalAgentSection() {
  const { t } = useTranslation();
  const [value, , persist] = useStorage("externalAgent");
  const current = { ...DEFAULTS, ...(value ?? {}) };
  const [portText, setPortText] = reactExports.useState(String(current.port));
  const projects = useProjects({});
  const visiblePaths = projects.map((project) => project.folderPath);
  const restricted = current.allowedProjectPaths.length > 0;
  const selectedCount = visiblePaths.filter((path) => current.allowedProjectPaths.includes(path)).length;

  const setField = (patch) => persist({ ...current, ...patch });

  reactExports.useEffect(() => {
    setPortText(String(current.port));
  }, [current.port]);

  const commitPort = () => {
    const n = Number.parseInt(portText, 10);
    if (!Number.isFinite(n) || n < 1024 || n > 65535) {
      setPortText(String(current.port));
      return;
    }
    if (n !== current.port) setField({ port: n });
  };

  const toggleProject = (folderPath, checked) => {
    const base = restricted ? current.allowedProjectPaths : visiblePaths;
    const next = checked
      ? [...new Set([...base, folderPath])]
      : base.filter((path) => path !== folderPath);
    // 至少保留一个项目：空数组在协议里表示“全部”，不能拿来表达“一个都不选”
    if (!next.length) return;
    setField({ allowedProjectPaths: next });
  };

  const toggleAll = (checked) => {
    if (checked) setField({ allowedProjectPaths: [] });
  };

  return (
    <div className="flex flex-col gap-4" data-action-ui-id="settings-external-agent">
      <label className="flex items-center justify-between gap-3 text-sm">
        <span>{t("settings.externalAgent.enable", "允许外部 Agent 接入")}</span>
        <input
          type="checkbox"
          checked={current.enabled === true}
          data-action-ui-id="settings-external-agent-enabled"
          onChange={(event) => setField({ enabled: event.target.checked })}
        />
      </label>
      <label className="flex items-center justify-between gap-3 text-sm">
        <span>{t("settings.externalAgent.port", "端口")}</span>
        <input
          type="number"
          min={1024}
          max={65535}
          value={portText}
          data-action-ui-id="settings-external-agent-port"
          onChange={(event) => setPortText(event.target.value)}
          onBlur={commitPort}
        />
      </label>
      <p className="text-xs text-muted-foreground">
        {t(
          "settings.externalAgent.hint",
          "开启后，外部 Agent 可通过 http://127.0.0.1:{{port}}/mcp 调用与内置助手相同的工具。只监听本机回环地址。",
          { port: current.port },
        )}
      </p>

      <section className="flex flex-col gap-2" data-action-ui-id="external-agent.settings">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-medium">
            {t("settings.externalAgent.projects", "项目范围")}
          </h3>
          <span className="text-xs text-muted-foreground">
            {restricted
              ? t("settings.externalAgent.selectedCount", "已选 {{count}} 个", { count: selectedCount })
              : t("settings.externalAgent.projectsScopeAll", "全部项目")}
          </span>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={!restricted && visiblePaths.length > 0}
            disabled={visiblePaths.length === 0}
            data-action-ui-id="external-agent.projects-select-all"
            onChange={(event) => toggleAll(event.target.checked)}
          />
          <span>{t("settings.externalAgent.selectAll", "全选")}</span>
        </label>
        <div className="flex max-h-48 flex-col gap-1 overflow-auto" data-action-ui-id="external-agent.projects-list">
          {visiblePaths.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              {t("settings.externalAgent.projectsEmpty", "还没有项目")}
            </p>
          ) : (
            projects.map((project) => (
              <label key={project.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!restricted || current.allowedProjectPaths.includes(project.folderPath)}
                  data-action-ui-id={`external-agent.project-${project.id}`}
                  onChange={(event) => toggleProject(project.folderPath, event.target.checked)}
                />
                <span className="min-w-0 truncate" title={project.folderPath}>
                  {project.name}
                </span>
              </label>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
