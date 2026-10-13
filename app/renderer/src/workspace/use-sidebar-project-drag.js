// use-sidebar-project-drag.js
import { reactExports, useTranslation } from "../vendor.js";
import { dedupedToast } from "../infra/agent-http-client.js";
import { UNGROUPED_RECENT_GROUP_KEY } from "./tool-label-definitions.js";
import { workspaceDisplayName } from "../generation/use-model-catalog-scope-key.js";
import { projectWorkspaceKey } from "./normalize-project-entries.js";
import { isProjectPinned } from "./move-workspace-dialog.jsx";

function resolveGroupDropPlacement(clientY, headerBottom, rows) {
  if (clientY < headerBottom || rows.length === 0)
    return {
      kind: "end",
    };
  for (const row of rows) {
    if (clientY < row.top + row.height / 2) {
      return {
        kind: "relative",
        anchorPath: row.path,
        position: "before",
      };
    }
    if (clientY <= row.top + row.height) {
      return {
        kind: "relative",
        anchorPath: row.path,
        position: "after",
      };
    }
  }
  return {
    kind: "relative",
    anchorPath: rows[rows.length - 1].path,
    position: "after",
  };
}

function isUnchangedSidebarPosition(paths, sourcePath, anchorPath, position) {
  const sourceIndex = paths.indexOf(sourcePath);
  const anchorIndex = paths.indexOf(anchorPath);
  if (sourceIndex < 0 || anchorIndex < 0) return true;
  return (
    sourceIndex === anchorIndex ||
    (position === "before" && sourceIndex === anchorIndex - 1) ||
    (position === "after" && sourceIndex === anchorIndex + 1)
  );
}

export function useSidebarProjectDrag({
  draggedPath,
  draggedProjectId,
  sourceSection,
  sourceProjectId,
  inventory,
  currentInventory,
  projects,
  pinnedProjectIds,
  sortMode,
  caseInsensitive,
  scrollRef,
  onClearDrag,
  onRowOver,
  onRowDrop,
  onProjectReorder,
  onMove,
  onReveal,
  holdPreviewOpen,
  releasePreviewHold,
}) {
  const { t: translate } = useTranslation();
  const [groupTarget, setGroupTarget] = reactExports.useState(null);
  const [rowTarget, setRowTarget] = reactExports.useState(null);
  const [projectTarget, setProjectTarget] = reactExports.useState(null);
  const [pendingMove, setPendingMove] = reactExports.useState(null);
  const [submitting, setSubmitting] = reactExports.useState(false);
  const [error, setError] = reactExports.useState(null);
  const [completedPath, setCompletedPath] = reactExports.useState(null);
  const submittingRef = reactExports.useRef(false);
  const dragActive = Boolean(draggedPath || draggedProjectId);
  const clearPreview = reactExports.useCallback(() => {
    setGroupTarget(null);
    setRowTarget(null);
    setProjectTarget(null);
  }, []);
  reactExports.useEffect(() => {
    if (!dragActive) clearPreview();
  }, [dragActive, clearPreview]);
  reactExports.useEffect(() => {
    if (!dragActive && !pendingMove) return;
    const token = "home-sidebar.project-drag";
    holdPreviewOpen?.(token);
    return () => releasePreviewHold?.(token);
  }, [dragActive, pendingMove, holdPreviewOpen, releasePreviewHold]);
  reactExports.useEffect(() => {
    if (!dragActive) return;
    let frame = 0;
    let speed = 0;
    const tick = () => {
      if (scrollRef.current && speed) scrollRef.current.scrollTop += speed;
      frame = requestAnimationFrame(tick);
    };
    const handleOver = (event) => {
      const scroll = scrollRef.current;
      const rect = scroll?.getBoundingClientRect();
      const target = event.target instanceof Element ? event.target : null;
      if (!rect || !target || !scroll?.contains(target)) {
        speed = 0;
        clearPreview();
        return;
      }
      speed =
        event.clientY < rect.top + 32
          ? -8
          : event.clientY > rect.bottom - 32
            ? 8
            : 0;
      if (!target.closest('[data-action-ui-id="home-sidebar.recent-group"]'))
        clearPreview();
    };
    document.addEventListener("dragover", handleOver, true);
    frame = requestAnimationFrame(tick);
    return () => {
      document.removeEventListener("dragover", handleOver, true);
      cancelAnimationFrame(frame);
    };
  }, [dragActive, scrollRef, clearPreview]);
  reactExports.useEffect(() => {
    if (!completedPath) return;
    const row = [
      ...(scrollRef.current?.querySelectorAll("[data-workspace-path]") ?? []),
    ].find((element) => element.dataset.workspacePath === completedPath);
    row?.scrollIntoView?.({
      block: "nearest",
      behavior: "auto",
    });
    const timeout = setTimeout(() => setCompletedPath(null), 1800);
    return () => clearTimeout(timeout);
  }, [completedPath, scrollRef]);
  const resolveOwner = reactExports.useCallback(
    (path) => {
      const key = projectWorkspaceKey(path, caseInsensitive);
      const item = currentInventory.find(
        (entry) =>
          projectWorkspaceKey(entry.workspace.path, caseInsensitive) === key,
      );
      const alias =
        item?.recentPath &&
        projectWorkspaceKey(item.recentPath, caseInsensitive);
      return (
        projects.find((project) =>
          project.workspacePaths.some((candidate) => {
            const candidateKey = projectWorkspaceKey(
              candidate,
              caseInsensitive,
            );
            return candidateKey === key || candidateKey === alias;
          }),
        )?.id ?? null
      );
    },
    [caseInsensitive, currentInventory, projects],
  );
  const handleGroupDrag = reactExports.useCallback(
    (event, targetId, drop) => {
      event.stopPropagation();
      if (pendingMove || (!draggedPath && !draggedProjectId)) return;
      const group = event.currentTarget;
      const header = group.querySelector(
        '[data-action-ui-id="home-sidebar.recent-group-header"]',
      );
      if (draggedProjectId) {
        clearPreview();
        const headerRect = header?.getBoundingClientRect();
        const sourcePinned = isProjectPinned(
          draggedProjectId,
          pinnedProjectIds,
        );
        if (
          !targetId ||
          !headerRect ||
          event.clientY > headerRect.bottom ||
          targetId === draggedProjectId ||
          isProjectPinned(targetId, pinnedProjectIds) !== sourcePinned
        ) {
          event.dataTransfer.dropEffect = "none";
          if (drop) onClearDrag();
          return;
        }
        const position =
          event.clientY < headerRect.top + headerRect.height / 2
            ? "before"
            : "after";
        const projectOrder = sourcePinned
          ? pinnedProjectIds.filter((projectId) =>
              projects.some((project) => project.id === projectId),
            )
          : projects
              .filter(
                (project) => !isProjectPinned(project.id, pinnedProjectIds),
              )
              .map((project) => project.id);
        if (
          isUnchangedSidebarPosition(
            projectOrder,
            draggedProjectId,
            targetId,
            position,
          )
        ) {
          event.dataTransfer.dropEffect = "none";
          if (drop) onClearDrag();
          return;
        }
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        setProjectTarget({
          id: targetId,
          position,
        });
        if (drop) {
          onProjectReorder(draggedProjectId, targetId, position);
          clearPreview();
          onClearDrag();
        }
        return;
      }
      if (!draggedPath) return;
      if (sourceSection !== "recent") {
        clearPreview();
        event.dataTransfer.dropEffect = "none";
        if (drop) onClearDrag();
        return;
      }
      const rows = [...group.querySelectorAll("[data-workspace-path]")].map(
        (element) => ({
          path: element.dataset.workspacePath ?? "",
          top: element.getBoundingClientRect().top,
          height: element.getBoundingClientRect().height,
        }),
      );
      const placement = resolveGroupDropPlacement(
        event.clientY,
        header?.getBoundingClientRect().bottom ?? 0,
        rows,
      );
      clearPreview();
      if (sourceProjectId === targetId) {
        if (
          placement.kind === "end" ||
          isUnchangedSidebarPosition(
            rows.map((row) => row.path),
            draggedPath,
            placement.anchorPath,
            placement.position,
          )
        ) {
          event.dataTransfer.dropEffect = "none";
          if (drop) onClearDrag();
          return;
        }
        setRowTarget({
          path: placement.anchorPath,
          position: placement.position,
        });
        if (drop)
          onRowDrop(event, placement.anchorPath, "recent", placement.position);
        else
          onRowOver(event, placement.anchorPath, "recent", placement.position);
        return;
      }
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      if (placement.kind === "end")
        setGroupTarget({
          projectId: targetId,
        });
      else
        setRowTarget({
          path: placement.anchorPath,
          position: placement.position,
        });
      if (!drop) return;
      const item = inventory.find(
        (entry) => entry.workspace.path === draggedPath,
      );
      if (!item) {
        onClearDrag();
        return;
      }
      const anchor =
        placement.kind === "relative"
          ? inventory.find(
              (entry) => entry.workspace.path === placement.anchorPath,
            )
          : void 0;
      const sourceName =
        projects.find((project) => project.id === sourceProjectId)?.name ??
        translate("project.ungrouped");
      const targetName =
        projects.find((project) => project.id === targetId)?.name ??
        translate("project.ungrouped");
      setError(null);
      setPendingMove({
        input: {
          workspacePath: draggedPath,
          expectedSourceProjectId: sourceProjectId,
          targetProjectId: targetId,
          placement,
          visibleWorkspaces: inventory.map((entry) => entry.workspace),
          caseInsensitive,
        },
        summary: {
          workspaceName: workspaceDisplayName(item.workspace),
          sourceName,
          targetName,
          anchorName: anchor ? workspaceDisplayName(anchor.workspace) : void 0,
          position: placement.kind === "relative" ? placement.position : void 0,
          switchToManual: sortMode !== "manual",
        },
      });
      clearPreview();
      onClearDrag();
    },
    [
      pendingMove,
      draggedPath,
      draggedProjectId,
      sourceSection,
      sourceProjectId,
      pinnedProjectIds,
      inventory,
      projects,
      sortMode,
      caseInsensitive,
      translate,
      clearPreview,
      onClearDrag,
      onRowOver,
      onRowDrop,
      onProjectReorder,
    ],
  );
  const handleCancel = reactExports.useCallback(() => {
    if (submittingRef.current) return;
    setPendingMove(null);
    setError(null);
  }, []);
  const handleConfirm = reactExports.useCallback(async () => {
    if (!pendingMove || submittingRef.current) return;
    const { input, summary } = pendingMove;
    const placement = input.placement;
    const hasPath = (path) =>
      currentInventory.some(
        (item) =>
          projectWorkspaceKey(item.workspace.path, caseInsensitive) ===
          projectWorkspaceKey(path, caseInsensitive),
      );
    if (
      !hasPath(input.workspacePath) ||
      resolveOwner(input.workspacePath) !== input.expectedSourceProjectId ||
      (input.targetProjectId !== null &&
        !projects.some((project) => project.id === input.targetProjectId)) ||
      (placement.kind === "relative" &&
        (!hasPath(placement.anchorPath) ||
          resolveOwner(placement.anchorPath) !== input.targetProjectId))
    ) {
      setError(translate("project.move.invalid"));
      return;
    }
    submittingRef.current = true;
    setSubmitting(true);
    setError(null);
    try {
      await onMove(input);
      onReveal(input.targetProjectId);
      setCompletedPath(input.workspacePath);
      setPendingMove(null);
      dedupedToast.success(
        translate("project.move.success", {
          target: summary.targetName,
        }),
      );
    } catch {
      setError(translate("project.move.failed"));
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [
    pendingMove,
    currentInventory,
    caseInsensitive,
    resolveOwner,
    projects,
    onMove,
    onReveal,
    translate,
  ]);
  return {
    groupTarget,
    rowTarget,
    projectTarget,
    pendingMove,
    submitting,
    error,
    completedPath,
    handleGroupDrag,
    handleCancel,
    handleConfirm,
    clearPreview,
    temporaryUngrouped:
      sourceSection === "recent" &&
      draggedPath !== null &&
      sourceProjectId !== null,
    ungroupedKey: UNGROUPED_RECENT_GROUP_KEY,
  };
}
