// workspace-events.js
import { reactExports, usePlatform, useStorage } from "../vendor.js";
import {
  CloudProjectRequestError,
  sortRecentWorkspacesByStableOrder,
} from "./record-recent-workspace-opened.jsx";
import { isCaseInsensitiveOs } from "./run-manual-update-check.js";
import { folderNameFromPath } from "./use-resizable-width.js";
import { Emitter } from "./vs-buffer.js";
export function resolveRecentProjectsSortMode(value) {
  return value === "recent" || value === "priority" ? value : "manual";
}
export function sortRecentWorkspaces(workspaces, sortMode = "recent") {
  if (sortMode === "manual") return sortRecentWorkspacesByStableOrder(workspaces);
  return workspaces
    .map((workspace, sourceIndex) => ({
      workspace,
      sourceIndex,
    }))
    .sort((a2, b3) => {
      return b3.workspace.openedAt - a2.workspace.openedAt || a2.sourceIndex - b3.sourceIndex;
    })
    .map(({ workspace }) => workspace);
}
export function isWorkspacePathCaseInsensitivePlatform(os2) {
  return os2 === "win32";
}
export function workspaceInventoryPathKey(path2, caseInsensitive) {
  const windowsAbsolute =
    /^[a-zA-Z]:[\\/]/.test(path2) ||
    /^\\\\/.test(path2) ||
    (caseInsensitive && path2.startsWith("//"));
  const unified2 = windowsAbsolute ? path2.replace(/\\/g, "/") : path2;
  const driveMatch = /^([a-zA-Z]:)(?:\/|$)/.exec(unified2);
  const drive = driveMatch?.[1] ?? "";
  const doubleSlashRoot = !drive && unified2.startsWith("//");
  const remainder = drive
    ? unified2.slice(drive.length)
    : doubleSlashRoot
      ? unified2.slice(2)
      : unified2;
  const absolute = remainder.startsWith("/");
  const segments = [];
  for (const segment of remainder.split("/")) {
    if (!segment || segment === ".") continue;
    segments.push(segment);
  }
  const prefix = drive
    ? `${drive}${absolute ? "/" : ""}`
    : doubleSlashRoot
      ? "//"
      : absolute
        ? "/"
        : "";
  const normalized =
    `${prefix}${segments.join("/")}` || (doubleSlashRoot ? "//" : absolute ? "/" : ".");
  return caseInsensitive ? normalized.toLocaleLowerCase("en-US") : normalized;
}
function syntheticWorkspace(entry, openedAt) {
  const projectName = entry.projectName.trim();
  const folderName = folderNameFromPath(entry.folderPath);
  return {
    path: entry.folderPath,
    openedAt,
    ...(projectName && projectName !== folderName
      ? {
          displayName: projectName,
        }
      : {}),
  };
}
export function mergeWorkspaceInventory(recentWorkspaces, authoritativeEntries, options) {
  const entryByPath = new Map();
  const dedupedEntries = [];
  const seenEntryIds = new Set();
  const dismissedAtByPath = new Map();
  for (const dismissal of options.dismissals ?? []) {
    for (const path2 of dismissal.paths) {
      const key2 = workspaceInventoryPathKey(path2, options.caseInsensitive);
      dismissedAtByPath.set(
        key2,
        Math.max(dismissedAtByPath.get(key2) ?? Number.NEGATIVE_INFINITY, dismissal.recentOpenedAt),
      );
    }
  }
  const dismissedAtForPaths = (...paths) => {
    let dismissedAt;
    for (const path2 of paths) {
      if (!path2) continue;
      const value = dismissedAtByPath.get(
        workspaceInventoryPathKey(path2, options.caseInsensitive),
      );
      if (value !== void 0) dismissedAt = Math.max(dismissedAt ?? value, value);
    }
    return dismissedAt;
  };
  for (const entry of authoritativeEntries) {
    const folderKey = workspaceInventoryPathKey(entry.folderPath, options.caseInsensitive);
    const workspaceIdKey = workspaceInventoryPathKey(entry.workspaceId, options.caseInsensitive);
    if (
      seenEntryIds.has(entry.workspaceId) ||
      entryByPath.has(folderKey) ||
      entryByPath.has(workspaceIdKey)
    ) {
      continue;
    }
    seenEntryIds.add(entry.workspaceId);
    entryByPath.set(folderKey, entry);
    entryByPath.set(workspaceIdKey, entry);
    dedupedEntries.push(entry);
  }
  const consumedEntryIds = new Set();
  const seenRecentPaths = new Set();
  const inventory = [];
  for (const recent of recentWorkspaces) {
    const recentKey = workspaceInventoryPathKey(recent.path, options.caseInsensitive);
    if (seenRecentPaths.has(recentKey)) continue;
    seenRecentPaths.add(recentKey);
    const authoritativeEntry = entryByPath.get(recentKey);
    const dismissedAt = dismissedAtForPaths(
      recent.path,
      authoritativeEntry?.folderPath,
      authoritativeEntry?.workspaceId,
    );
    if (dismissedAt !== void 0 && dismissedAt >= recent.openedAt) continue;
    if (authoritativeEntry && consumedEntryIds.has(authoritativeEntry.workspaceId)) continue;
    if (authoritativeEntry) {
      consumedEntryIds.add(authoritativeEntry.workspaceId);
      inventory.push({
        workspace: {
          ...recent,
          path: authoritativeEntry.folderPath,
        },
        authoritativeEntry,
        recentPath: recent.path,
      });
      continue;
    }
    inventory.push({
      workspace: recent,
      recentPath: recent.path,
    });
  }
  for (const entry of dedupedEntries) {
    if (consumedEntryIds.has(entry.workspaceId)) continue;
    consumedEntryIds.add(entry.workspaceId);
    if (dismissedAtForPaths(entry.folderPath, entry.workspaceId) !== void 0) continue;
    const syntheticOpenedAt =
      options.syntheticOpenedAtForEntry?.(entry) ?? options.syntheticOpenedAt ?? Date.now();
    inventory.push({
      workspace: syntheticWorkspace(entry, syntheticOpenedAt),
      authoritativeEntry: entry,
    });
  }
  const sortedWorkspaces = sortRecentWorkspaces(
    inventory.map((item) => item.workspace),
    options.sortMode,
  );
  const itemByWorkspace = new Map(inventory.map((item) => [item.workspace, item]));
  return sortedWorkspaces.flatMap((workspace) => {
    const item = itemByWorkspace.get(workspace);
    return item ? [item] : [];
  });
}
export function projectWorkspaceKey(path2, caseInsensitive) {
  return workspaceInventoryPathKey(path2, caseInsensitive);
}
export function normalizeProjectName(name2) {
  return name2.trim().replace(/\s+/g, " ");
}
function isProjectRecord(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
function finiteNumberOr(value, fallback) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
function stringArray$1(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
}
function normalizeProjectKind(project2) {
  if (project2.kind === "team" || project2.kind === "local") return project2.kind;
  return typeof project2.remoteId === "string" && project2.remoteId.trim() ? "team" : "local";
}
export function normalizeProjectEntries(projects) {
  if (!Array.isArray(projects)) return [];
  const normalized = [];
  for (const candidate of projects) {
    if (!isProjectRecord(candidate)) continue;
    const id2 = typeof candidate.id === "string" ? candidate.id.trim() : "";
    const name2 = typeof candidate.name === "string" ? normalizeProjectName(candidate.name) : "";
    if (!id2 || !name2) continue;
    const createdAt = finiteNumberOr(candidate.createdAt, 0);
    const updatedAt = finiteNumberOr(candidate.updatedAt, createdAt);
    const entry = {
      id: id2,
      name: name2,
      kind: normalizeProjectKind(candidate),
      createdAt,
      updatedAt,
      workspacePaths: stringArray$1(candidate.workspacePaths),
      revision: Math.max(0, Math.trunc(finiteNumberOr(candidate.revision, 0))),
      transactionId: typeof candidate.transactionId === "string" ? candidate.transactionId : "",
    };
    if (typeof candidate.coverImage === "string") entry.coverImage = candidate.coverImage;
    if (typeof candidate.remoteId === "string" && candidate.remoteId.trim()) {
      entry.remoteId = candidate.remoteId;
    }
    if (typeof candidate.folderName === "string" && candidate.folderName.trim()) {
      entry.folderName = candidate.folderName;
    }
    if (typeof candidate.folderPath === "string" && candidate.folderPath.trim()) {
      entry.folderPath = candidate.folderPath;
    }
    normalized.push(entry);
  }
  return normalized;
}
function normalizeHiddenProjectIds(value) {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .filter((projectId) => typeof projectId === "string")
        .map((projectId) => projectId.trim())
        .filter(Boolean),
    ),
  );
}
function filterVisibleProjects(projects, hiddenProjectIds) {
  const hidden = new Set(normalizeHiddenProjectIds(hiddenProjectIds));
  return normalizeProjectEntries(projects).filter((project2) => !hidden.has(project2.id));
}
export function hideProjectId(hiddenProjectIds, projectId) {
  return normalizeHiddenProjectIds([...hiddenProjectIds, projectId]);
}
export function restoreProjectId(hiddenProjectIds, projectId) {
  return normalizeHiddenProjectIds(hiddenProjectIds).filter((id2) => id2 !== projectId);
}
export function dedupeProjectName(projects, name2) {
  const base2 = normalizeProjectName(name2);
  if (!base2) return base2;
  const taken = new Set(projects.map((project2) => project2.name.toLowerCase()));
  if (!taken.has(base2.toLowerCase())) return base2;
  let suffix = 2;
  while (taken.has(`${base2}-${suffix}`.toLowerCase())) suffix++;
  return `${base2}-${suffix}`;
}
export function hasProjectNameConflict(projects, projectId, name2) {
  const normalized = normalizeProjectName(name2);
  if (!normalized) return false;
  const candidate = normalized.toLowerCase();
  return normalizeProjectEntries(projects).some(
    (project2) => project2.id !== projectId && project2.name.toLowerCase() === candidate,
  );
}
export function buildWorkspaceProjectIndex(projects, caseInsensitive) {
  const index2 = new Map();
  for (const project2 of normalizeProjectEntries(projects)) {
    for (const path2 of project2.workspacePaths) {
      const key2 = projectWorkspaceKey(path2, caseInsensitive);
      if (!index2.has(key2)) index2.set(key2, project2);
    }
  }
  return index2;
}
function findProjectForWorkspace(projects, workspacePath, caseInsensitive) {
  return buildWorkspaceProjectIndex(projects, caseInsensitive).get(
    projectWorkspaceKey(workspacePath, caseInsensitive),
  );
}
export function sortProjects(projects, mode2) {
  const sorted = normalizeProjectEntries(projects);
  switch (mode2) {
    case "created":
      sorted.sort((a2, b3) => b3.createdAt - a2.createdAt);
      break;
    case "name":
      sorted.sort((a2, b3) =>
        a2.name.localeCompare(b3.name, void 0, {
          numeric: true,
        }),
      );
      break;
    default:
      sorted.sort((a2, b3) => b3.updatedAt - a2.updatedAt);
      break;
  }
  return sorted;
}
export function filterProjectsByKeyword(projects, keyword2) {
  const needle = keyword2.trim().toLocaleLowerCase();
  const safeProjects = normalizeProjectEntries(projects);
  if (!needle) return safeProjects;
  return safeProjects.filter((project2) => project2.name.toLocaleLowerCase().includes(needle));
}
function filterProjectsByKind(projects, kind) {
  return normalizeProjectEntries(projects).filter((project2) => project2.kind === kind);
}
export function useProjectStore(options = {}) {
  const platform2 = usePlatform();
  const caseInsensitive = isCaseInsensitiveOs(platform2.app?.os ?? "");
  const [projects, , setProjectsAsync] = useStorage("global.projects", options);
  const [hiddenProjectIds, , setHiddenProjectIdsAsync] = useStorage(
    "global.hiddenProjectIds",
    options,
  );
  const allProjects = reactExports.useMemo(() => normalizeProjectEntries(projects), [projects]);
  const normalizedHiddenProjectIds = reactExports.useMemo(
    () => normalizeHiddenProjectIds(hiddenProjectIds),
    [hiddenProjectIds],
  );
  const visibleProjects = reactExports.useMemo(
    () => filterVisibleProjects(allProjects, normalizedHiddenProjectIds),
    [allProjects, normalizedHiddenProjectIds],
  );
  return {
    projects: visibleProjects,
    allProjects,
    hiddenProjectIds: normalizedHiddenProjectIds,
    setHiddenProjectIdsAsync,
    setProjectsAsync,
    caseInsensitive,
  };
}
export function useProjects(options) {
  const { projects } = useProjectStore();
  const sortMode = options?.sortMode ?? "updated";
  const keyword2 = options?.keyword ?? "";
  const kind = options?.kind;
  return reactExports.useMemo(
    () =>
      sortProjects(
        filterProjectsByKeyword(kind ? filterProjectsByKind(projects, kind) : projects, keyword2),
        sortMode,
      ),
    [keyword2, kind, projects, sortMode],
  );
}
export function useProject(projectId) {
  const { projects } = useProjectStore();
  return reactExports.useMemo(
    () => (projectId ? projects.find((project2) => project2.id === projectId) : void 0),
    [projectId, projects],
  );
}
export function useWorkspaceProject(workspacePath) {
  const { projects, caseInsensitive } = useProjectStore();
  return reactExports.useMemo(
    () =>
      workspacePath ? findProjectForWorkspace(projects, workspacePath, caseInsensitive) : void 0,
    [caseInsensitive, projects, workspacePath],
  );
}
export function cloudStatus(err) {
  return err instanceof CloudProjectRequestError ? err.status : void 0;
}
export class WorkspaceEvents {
  _onAddToChat = new Emitter();
  _onAddSkillToChat = new Emitter();
  _onAddConnectorToChat = new Emitter();
  _onAssetRenamed = new Emitter();
  _onAddEntityToChat = new Emitter();
  _onAddPluginNodeToChat = new Emitter();
  _onAddEntityToCanvas = new Emitter();
  _onAddToCanvas = new Emitter();
  _onAddFilesToCanvas = new Emitter();
  _onCanvasFocusRequest = new Emitter();
  _onLocateCanvasFileRequest = new Emitter();
  _onCanvasFocus = new Emitter();
  _onLocateCanvasFile = new Emitter();
  _onSwitchSession = new Emitter();
  _onTextEditActive = new Emitter();
  _onPluginEditActive = new Emitter();
  _onTextNodeRemoved = new Emitter();
  _onTextEditSelection = new Emitter();
  _onAnnotationsChanged = new Emitter();
  _onAnnotationActivated = new Emitter();
  _onAnnotationCommand = new Emitter();
  _onSubscribersReady = new Emitter();
  /** Workspace IDs whose event subscribers have been wired at least once. */
  _readyWorkspaces = new Set();
  /** Workspace chat inputs that have registered their add-skill subscriber. */
  _chatInputReadyWorkspaces = new Set();
  /** Latest route-launched skill waiting for its target chat input to mount. */
  _pendingSkillsByWorkspace = new Map();
  /** Workspaces where the queued skill reached ChatPanel at least once. */
  _deliveredSkillWorkspaces = new Set();
  /** Latest connector example waiting for its newly created chat input. */
  _pendingConnectorsByWorkspace = new Map();
  /** Workspaces where the queued connector reached ChatPanel at least once. */
  _deliveredConnectorWorkspaces = new Set();
  /**
   * Agent-dispatched task descriptions waiting for their plugin editor's
   * isolated session to become ready. Keyed by canvas nodeId. Set when the
   * gateway's `plugin_editor_open` WS event carries an `initialMessage`
   * (main-agent delegation); taken (removed) exactly once by the chat panel
   * when the plugin edit session reaches 'ready'.
   */
  _pendingPluginDispatchByNode = new Map();
  /** Subscribe to add-to-chat requests (e.g. from canvas context menu) */
  onAddToChat = this._onAddToChat.event;
  /**
   * Subscribe to add-skill-to-chat requests (e.g. from global Skills,
   * skill drag-drop). Carries the full SkillInfo so the chat panel can route
   * through MessageInput.selectSkillDirect — bypassing the slashAllSkills cache
   * lookup that would otherwise be empty if the user never opened the slash
   * popover. selectSkillDirect is what produces the highlight + ghost text;
   * raw setInput skips both.
   */
  onAddSkillToChat = this._onAddSkillToChat.event;
  /** Subscribe to connector references launched from the connector detail page. */
  onAddConnectorToChat = this._onAddConnectorToChat.event;
  /**
   * Subscribe to asset-renamed notifications. The chat draft subscribes to
   * rebind any attachment whose snapshotted path matches `oldPath`, so a
   * canvas-side rename doesn't leave a 404 dead-link preview in the input box.
   */
  onAssetRenamed = this._onAssetRenamed.event;
  /**
   * Subscribe to add-asset-center-entity-to-chat requests (canvas entity-ref
   * node "Add to chat"). Carries entity id + name; the chat panel routes
   * through MessageInput.addFromEntity → `entity_refs` on the outgoing
   * message.
   */
  onAddEntityToChat = this._onAddEntityToChat.event;
  /**
   * Subscribe to add-plugin-node-reference-to-chat requests (canvas plugin
   * node "发送到对话" toolbar button). The chat subscriber attaches a
   * plugin-node reference chip — no file attachment is created because
   * plugin nodes have no workspace file.
   */
  onAddPluginNodeToChat = this._onAddPluginNodeToChat.event;
  /**
   * Subscribe to add-asset-center-entity-to-canvas requests (「已加入资产」
   * right-click menu). Carries entity id; CanvasArea drops an entity-ref node.
   */
  onAddEntityToCanvas = this._onAddEntityToCanvas.event;
  /**
   * Subscribe to public Canvas navigation requests. The workspace layout
   * coordinator is the sole intended consumer: it can reveal a hidden Canvas
   * and wait for stable bounds before forwarding the command for delivery.
   */
  onCanvasFocusRequest = this._onCanvasFocusRequest.event;
  onLocateCanvasFileRequest = this._onLocateCanvasFileRequest.event;
  /**
   * Subscribe to Canvas navigation delivery. Canvas/session consumers should
   * keep using these events; requests reach them only after layout readiness.
   */
  onCanvasFocus = this._onCanvasFocus.event;
  onLocateCanvasFile = this._onLocateCanvasFile.event;
  onSwitchSession = this._onSwitchSession.event;
  /**
   * Subscribe to canvas text-edit enter/leave. The workspace layout consumes
   * this to toggle the "editor + agent" text-edit layout.
   */
  onTextEditActive = this._onTextEditActive.event;
  /**
   * Subscribe to editor-class plugin edit enter/leave (剪辑节点). Drives the
   * same "editor + agent" split as `onTextEditActive`, with a clip-scoped
   * isolated Agent session instead of a text one.
   */
  onPluginEditActive = this._onPluginEditActive.event;
  /** Canvas → host: a text node was deleted (drop its node-scoped state). */
  onTextNodeRemoved = this._onTextNodeRemoved.event;
  /** Editor → host: live editor text selection changed (null = cleared). */
  onTextEditSelection = this._onTextEditSelection.event;
  /** Editor → host: draft annotation set changed (right-side card list). */
  onAnnotationsChanged = this._onAnnotationsChanged.event;
  /** Editor → host: an annotation mark was activated / cleared. */
  onAnnotationActivated = this._onAnnotationActivated.event;
  /** Host → editor: locate / delete / clear a draft annotation. */
  onAnnotationCommand = this._onAnnotationCommand.event;
  /** Subscribe to workspace event-subscriber readiness (fired by WorkspaceTopbarBridge). */
  onSubscribersReady = this._onSubscribersReady.event;
  /** Subscribe to add-to-canvas requests (e.g. from asset-panel right-click) */
  onAddToCanvas = this._onAddToCanvas.event;
  /** Subscribe to requests to add in-memory files (built-in browser picks) to the canvas. */
  onAddFilesToCanvas = this._onAddFilesToCanvas.event;
  /**
   * Request adding a file to the chat input as an attachment.
   * Pass `nodeId` only when the source is a canvas node — gateway uses it
   * to inject `<canvas_intent>` blocks for that specific node.
   */
  fireAddToChat(relativePath, filename, nodeId, attachmentId) {
    this._onAddToChat.fire({
      relativePath,
      filename,
      nodeId,
      attachmentId,
    });
  }
  /** Request injecting a skill command into the chat input (with highlight + ghost text). */
  fireAddSkillToChat(skill) {
    this._onAddSkillToChat.fire({
      skill,
    });
  }
  /**
   * Deliver a route-launched skill to one workspace, retaining it until that
   * workspace's ChatPanel has registered its input subscriber.
   */
  queueAddSkillToChat(workspaceId2, skill) {
    this._pendingSkillsByWorkspace.set(workspaceId2, skill);
    this._deliveredSkillWorkspaces.delete(workspaceId2);
    if (this._chatInputReadyWorkspaces.has(workspaceId2)) {
      this._deliveredSkillWorkspaces.add(workspaceId2);
      this._onAddSkillToChat.fire({
        skill,
        workspaceId: workspaceId2,
      });
    }
  }
  /** Retain a connector example until the target workspace composer is durable-ready. */
  queueAddConnectorToChat(workspaceId2, connector, prompt) {
    this._pendingConnectorsByWorkspace.set(workspaceId2, {
      connector,
      prompt,
    });
    this._deliveredConnectorWorkspaces.delete(workspaceId2);
    if (this._chatInputReadyWorkspaces.has(workspaceId2)) {
      this._deliveredConnectorWorkspaces.add(workspaceId2);
      this._onAddConnectorToChat.fire({
        connector,
        prompt,
        workspaceId: workspaceId2,
      });
    }
  }
  /** Bind route-launched Skill and connector references to one workspace composer. */
  subscribeChatReferences(options) {
    const skillDisposable = this.onAddSkillToChat(({ skill, workspaceId: workspaceId2 }) => {
      if (workspaceId2 ? workspaceId2 !== options.workspaceId : !options.isActive()) return;
      const input = options.selectSkill(skill);
      if (workspaceId2 && input !== void 0) options.persistDraft(input);
    });
    const connectorDisposable = this.onAddConnectorToChat(
      ({ connector, prompt, workspaceId: workspaceId2 }) => {
        if (workspaceId2 !== options.workspaceId) return;
        const input = options.selectConnector(connector, prompt);
        if (input !== void 0) options.persistDraft(input);
      },
    );
    return () => {
      this.clearChatInputReady(options.workspaceId);
      skillDisposable.dispose();
      connectorDisposable.dispose();
    };
  }
  /** Mark the workspace chat input ready and flush its pending route launch. */
  fireChatInputReady(workspaceId2) {
    this._chatInputReadyWorkspaces.add(workspaceId2);
    const skill = this._pendingSkillsByWorkspace.get(workspaceId2);
    if (skill && !this._deliveredSkillWorkspaces.has(workspaceId2)) {
      this._deliveredSkillWorkspaces.add(workspaceId2);
      this._onAddSkillToChat.fire({
        skill,
        workspaceId: workspaceId2,
      });
    }
    const pendingConnector = this._pendingConnectorsByWorkspace.get(workspaceId2);
    if (pendingConnector && !this._deliveredConnectorWorkspaces.has(workspaceId2)) {
      this._deliveredConnectorWorkspaces.add(workspaceId2);
      this._onAddConnectorToChat.fire({
        ...pendingConnector,
        workspaceId: workspaceId2,
      });
    }
  }
  /**
   * Keep route-launched Skill metadata while its slash command remains in the
   * durable draft, so a transient MessageInput remount can restore highlight
   * and guide text. Clear it once the user sends or removes that command.
   */
  syncQueuedSkillWithInput(workspaceId2, input) {
    const skill = this._pendingSkillsByWorkspace.get(workspaceId2);
    if (
      !skill ||
      !this._deliveredSkillWorkspaces.has(workspaceId2) ||
      input.includes(`/${skill.name}`)
    ) {
      return;
    }
    if (input.length === 0) return;
    this._pendingSkillsByWorkspace.delete(workspaceId2);
    this._deliveredSkillWorkspaces.delete(workspaceId2);
  }
  /** End route-launch restoration after the user's message was accepted. */
  clearQueuedSkill(workspaceId2) {
    this._pendingSkillsByWorkspace.delete(workspaceId2);
    this._deliveredSkillWorkspaces.delete(workspaceId2);
  }
  /** Drop route-launch metadata after the chip is removed from a non-empty draft. */
  syncQueuedConnectorWithInput(workspaceId2, input) {
    const pending2 = this._pendingConnectorsByWorkspace.get(workspaceId2);
    if (
      !pending2 ||
      !this._deliveredConnectorWorkspaces.has(workspaceId2) ||
      input.includes(
        `@connector:${pending2.connector.connectorId ?? pending2.connector.serverName}`,
      )
    ) {
      return;
    }
    if (input.length === 0) return;
    this.clearQueuedConnector(workspaceId2);
  }
  /** End route-launch restoration after the connector-backed prompt was accepted. */
  clearQueuedConnector(workspaceId2) {
    this._pendingConnectorsByWorkspace.delete(workspaceId2);
    this._deliveredConnectorWorkspaces.delete(workspaceId2);
  }
  /** Keep all route-launched references in sync with the durable composer draft. */
  syncQueuedReferencesWithInput(workspaceId2, input) {
    this.syncQueuedSkillWithInput(workspaceId2, input);
    this.syncQueuedConnectorWithInput(workspaceId2, input);
  }
  /** End restoration for every route-launched reference after a successful send. */
  clearQueuedReferences(workspaceId2) {
    this.clearQueuedSkill(workspaceId2);
    this.clearQueuedConnector(workspaceId2);
  }
  /**
   * Stash a main-agent-dispatched task description for a plugin editor node.
   * Delivered exactly once via {@link takePluginDispatchMessage} when the
   * node's isolated agent session is ready. Overwrites any undelivered
   * message for the same node (latest dispatch wins).
   */
  queuePluginDispatchMessage(nodeId, message2) {
    if (!nodeId || !message2.trim()) return;
    this._pendingPluginDispatchByNode.set(nodeId, message2.trim());
  }
  /**
   * Take (and remove) the pending dispatched task for a plugin editor node.
   * Returns null when nothing was dispatched. Take-once semantics guarantee
   * the auto-send fires a single time even if the ready-effect re-runs.
   */
  takePluginDispatchMessage(nodeId) {
    const message2 = this._pendingPluginDispatchByNode.get(nodeId);
    if (message2 === void 0) return null;
    this._pendingPluginDispatchByNode.delete(nodeId);
    return message2;
  }
  /** Drop an undelivered dispatched task (e.g. the editor failed to open). */
  clearPluginDispatchMessage(nodeId) {
    this._pendingPluginDispatchByNode.delete(nodeId);
  }
  /** Clear chat readiness when its subscriber unmounts. */
  clearChatInputReady(workspaceId2) {
    this._chatInputReadyWorkspaces.delete(workspaceId2);
    this._deliveredSkillWorkspaces.delete(workspaceId2);
    this._deliveredConnectorWorkspaces.delete(workspaceId2);
  }
  /** Notify consumers that an asset was renamed (old path → new path). */
  fireAssetRenamed(oldPath, newPath, newFilename) {
    this._onAssetRenamed.fire({
      oldPath,
      newPath,
      newFilename,
    });
  }
  /**
   * Request referencing an asset-center entity in the chat input. Fired by
   * the canvas entity-ref node. The chat subscriber calls
   * MessageInput.addFromEntity(entityId, name) → visible `@<name> ` +
   * `entity_refs` on send.
   */
  fireAddEntityToChat(entityId, name2, type2) {
    this._onAddEntityToChat.fire({
      entityId,
      name: name2,
      type: type2,
    });
  }
  /**
   * Request inserting a plugin-node reference into the chat input. Fired by
   * the canvas plugin node's "发送到对话" toolbar button.
   */
  fireAddPluginNodeToChat(args) {
    this._onAddPluginNodeToChat.fire(args);
  }
  /**
   * Request dropping an asset-center entity onto the canvas as one or more
   * editable vault asset nodes. Fired by the「已加入资产」right-click menu
   * (whole-entity drop) AND the entity popover per-attachment `+` button
   * (single-attachment drop via `opts.attachmentIds = [att.id]`).
   *
   * Passing `attachmentIds` filters the entity's attachments to that subset
   * before running the shared drop pipeline — everything downstream
   * (materialize → import → layout → group>=2 → rollback → focus) reuses
   * the same code path, so a single-attachment drop behaves identically
   * to a whole-entity drop apart from "group of N → ungrouped single".
   */
  fireAddEntityToCanvas(entityId, opts) {
    this._onAddEntityToCanvas.fire({
      entityId,
      attachmentIds: opts?.attachmentIds,
    });
  }
  /** Request adding one or more assets to the active canvas. */
  fireAddToCanvas(items, onAdded, placement) {
    this._onAddToCanvas.fire({
      items,
      onAdded,
      placement,
    });
  }
  /** Request adding in-memory files to the active canvas (uploaded on the way in). */
  fireAddFilesToCanvas(files, source) {
    this._onAddFilesToCanvas.fire({
      files,
      source,
    });
  }
  /** Request focusing canvas nodes, optionally selecting them for explicit locate actions. */
  fireCanvasFocus(workspaceId2, nodeIds, options) {
    this._onCanvasFocusRequest.fire({
      workspaceId: workspaceId2,
      nodeIds,
      ...options,
    });
  }
  /** Request resolving a workspace file path to a canvas node and focusing it. */
  fireLocateCanvasFile(workspaceId2, path2) {
    this._onLocateCanvasFileRequest.fire({
      workspaceId: workspaceId2,
      path: path2,
      preferParentGroup: false,
    });
  }
  /** Request resolving a set of stage output paths and focusing them as one canvas selection. */
  fireLocateCanvasFiles(workspaceId2, paths) {
    this._onLocateCanvasFileRequest.fire({
      workspaceId: workspaceId2,
      paths,
      preferParentGroup: true,
    });
  }
  /** Resolve known node ids and file paths into one focus request. */
  fireLocateCanvasTargets(workspaceId2, targets) {
    this._onLocateCanvasFileRequest.fire({
      workspaceId: workspaceId2,
      ...targets,
    });
  }
  /** Deliver a focus command after the target Canvas has stable geometry. */
  deliverCanvasFocus(workspaceId2, nodeIds, options) {
    this._onCanvasFocus.fire({
      workspaceId: workspaceId2,
      nodeIds,
      ...options,
    });
  }
  /** Deliver a locate command after the target Canvas has stable geometry. */
  deliverLocateCanvasFile(workspaceId2, path2, options) {
    this._onLocateCanvasFile.fire({
      workspaceId: workspaceId2,
      path: path2,
      ...options,
    });
  }
  /** Request switching the active chat session from command palette results. */
  fireSwitchSession(workspaceId2, sessionId) {
    this._onSwitchSession.fire({
      workspaceId: workspaceId2,
      sessionId,
    });
  }
  /** Notify the workspace that a canvas text node opened / closed its full-page editor. */
  fireTextEditActive(workspaceId2, session, active2) {
    this._onTextEditActive.fire({
      workspaceId: workspaceId2,
      ...session,
      active: active2,
    });
  }
  /** Notify the workspace that a plugin editor node opened / closed its editing surface. */
  firePluginEditActive(workspaceId2, session, active2, agentName, pluginId) {
    this._onPluginEditActive.fire({
      workspaceId: workspaceId2,
      ...session,
      active: active2,
      agentName,
      pluginId,
    });
  }
  /** Canvas → host: a text node was removed from the graph. */
  fireTextNodeRemoved(workspaceId2, nodeId) {
    this._onTextNodeRemoved.fire({
      workspaceId: workspaceId2,
      nodeId,
    });
  }
  /** Editor → host: push the latest editor text selection (null = cleared). */
  fireTextEditSelection(workspaceId2, session, selection2) {
    this._onTextEditSelection.fire({
      workspaceId: workspaceId2,
      ...session,
      selection: selection2,
    });
  }
  /** Editor → host: push the latest draft annotation snapshots. */
  fireAnnotationsChanged(workspaceId2, session, annotations) {
    this._onAnnotationsChanged.fire({
      workspaceId: workspaceId2,
      ...session,
      annotations,
    });
  }
  /** Editor → host: an annotation mark was activated (id) or cleared (null). */
  fireAnnotationActivated(workspaceId2, session, id2) {
    this._onAnnotationActivated.fire({
      workspaceId: workspaceId2,
      ...session,
      id: id2,
    });
  }
  /** Host → editor: locate / delete / clear a draft annotation. */
  fireAnnotationCommand(workspaceId2, session, command2) {
    this._onAnnotationCommand.fire({
      workspaceId: workspaceId2,
      ...session,
      command: command2,
    });
  }
  /** Signal that a workspace's event subscribers (canvas focus, session switch) are wired. */
  fireSubscribersReady(workspaceId2) {
    this._readyWorkspaces.add(workspaceId2);
    this._onSubscribersReady.fire({
      workspaceId: workspaceId2,
    });
  }
  /** Check if a workspace's event subscribers have been wired at least once. */
  isSubscribersReady(workspaceId2) {
    return this._readyWorkspaces.has(workspaceId2);
  }
  /** Clear ready state for a workspace (e.g. when workspace is closed). */
  clearSubscribersReady(workspaceId2) {
    this._readyWorkspaces.delete(workspaceId2);
  }
  dispose() {
    this._chatInputReadyWorkspaces.clear();
    this._pendingSkillsByWorkspace.clear();
    this._deliveredSkillWorkspaces.clear();
    this._pendingConnectorsByWorkspace.clear();
    this._deliveredConnectorWorkspaces.clear();
    this._onAddToChat.dispose();
    this._onAddSkillToChat.dispose();
    this._onAddConnectorToChat.dispose();
    this._onAssetRenamed.dispose();
    this._onAddEntityToChat.dispose();
    this._onAddPluginNodeToChat.dispose();
    this._onAddEntityToCanvas.dispose();
    this._onAddToCanvas.dispose();
    this._onAddFilesToCanvas.dispose();
    this._onCanvasFocusRequest.dispose();
    this._onLocateCanvasFileRequest.dispose();
    this._onCanvasFocus.dispose();
    this._onLocateCanvasFile.dispose();
    this._onSwitchSession.dispose();
    this._onTextEditActive.dispose();
    this._onPluginEditActive.dispose();
    this._onTextNodeRemoved.dispose();
    this._onTextEditSelection.dispose();
    this._onAnnotationsChanged.dispose();
    this._onAnnotationActivated.dispose();
    this._onAnnotationCommand.dispose();
    this._onSubscribersReady.dispose();
  }
}
