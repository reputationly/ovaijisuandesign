// workspace-events.js
import { Emitter } from "../vendor-inline/vscode-base/vs-buffer.js";

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
    const skillDisposable = this.onAddSkillToChat(
      ({ skill, workspaceId: workspaceId2 }) => {
        if (
          workspaceId2
            ? workspaceId2 !== options.workspaceId
            : !options.isActive()
        )
          return;
        const input = options.selectSkill(skill);
        if (workspaceId2 && input !== void 0) options.persistDraft(input);
      },
    );
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
    const pendingConnector =
      this._pendingConnectorsByWorkspace.get(workspaceId2);
    if (
      pendingConnector &&
      !this._deliveredConnectorWorkspaces.has(workspaceId2)
    ) {
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
