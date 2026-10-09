// 首页场景面板的选择与跳转逻辑。
import { r as reactExports, lt as findConnectorMentions, lu as OFFICIAL_CONNECTORS, lv as formatConnectorMention } from "../main.jsx";
export function useScenePanel(categories) {
  const [activeSceneId, setActiveSceneId] = reactExports.useState(null);
  const selectScene = reactExports.useCallback(id => {
    setActiveSceneId(prev => prev === id ? null : id);
  }, []);
  const closePanel = reactExports.useCallback(() => {
    setActiveSceneId(null);
  }, []);
  const activeScene = reactExports.useMemo(() => {
    const activeCategory = categories.find(category => category.kind === "scene" && category.id === activeSceneId);
    return activeCategory?.scene ?? null;
  }, [activeSceneId, categories]);
  reactExports.useEffect(() => {
    if (activeSceneId && !activeScene) setActiveSceneId(null);
  }, [activeScene, activeSceneId]);
  return {
    activeSceneId,
    activeScene,
    selectScene,
    closePanel
  };
}
export function homeSceneDisplayText(text) {
  for (const mention of findConnectorMentions(text).reverse()) {
    const label = mention.displayName ?? OFFICIAL_CONNECTORS[mention.serverName]?.displayName ?? mention.serverName;
    text = text.slice(0, mention.start) + label + text.slice(mention.end);
  }
  return text;
}
export function homeSceneTarget(query, prompt) {
  if (query.skill) {
    const prefix = `/${query.skill}`;
    return {
      text: prompt.trimStart().startsWith(`${prefix} `) || prompt.trim() === prefix ? prompt : `${prefix} ${prompt}`,
      connector: void 0
    };
  }
  const connector = query.connectorId ? OFFICIAL_CONNECTORS[query.connectorId] : void 0;
  if (query.connectorId && !connector) {
    throw new Error("connector_unavailable");
  }
  return {
    text: connector ? `${formatConnectorMention(connector.id, connector.displayName)} ${prompt}` : prompt,
    connector: connector ? {
      connectorId: connector.id,
      displayName: connector.displayName
    } : void 0
  };
}
export async function prepareHomeSceneSelection(query, {
  ensureSkillReady,
  fetchAttachments,
  signal
}) {
  const downloadableAttachments = query.attachments.filter(attachment => attachment.assetUrl);
  const [skillReady, attachmentResult] = await Promise.all([query.skill ? ensureSkillReady(query.skill) : Promise.resolve(true), downloadableAttachments.length > 0 ? fetchAttachments(downloadableAttachments, {
    signal
  }) : Promise.resolve({
    failed: [],
    files: []
  })]);
  if (!skillReady) {
    return {
      status: "skill-unavailable",
      failedAttachments: []
    };
  }
  if (attachmentResult.failed.length > 0) {
    return {
      status: "attachment-failed",
      failedAttachments: attachmentResult.failed
    };
  }
  return {
    status: "ready",
    files: attachmentResult.files
  };
}
export class HomeSceneSelectionGuard {
  abortController = null;
  generation = 0;
  begin() {
    this.abortController?.abort();
    this.abortController = new AbortController();
    this.generation += 1;
    return {
      generation: this.generation,
      signal: this.abortController.signal
    };
  }
  complete(token) {
    if (!this.isCurrent(token)) return false;
    this.abortController = null;
    return true;
  }
  invalidate() {
    this.abortController?.abort();
    this.abortController = null;
    this.generation += 1;
  }
  isCurrent(token) {
    return token.generation === this.generation && !token.signal.aborted;
  }
}
