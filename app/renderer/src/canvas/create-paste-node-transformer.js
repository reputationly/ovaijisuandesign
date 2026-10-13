// create-paste-node-transformer.js
import { resolveNodeAssetId } from "./remove-nodes-and-promote-group-mains.js";
import { CanvasNodeType, reactExports } from "../vendor.js";
import { useAssetMetadataApi } from "../infra/agent-http-client.js";
import { getClipboard } from "./partition-user-removal-elements.js";

function readSourcePath(sourceNode, clipboard, assetMetadataStore) {
  const assetId = resolveNodeAssetId(sourceNode);
  const clipboardPath = assetId ? clipboard?.assetPaths?.[assetId] : void 0;
  if (typeof clipboardPath === "string" && clipboardPath.length > 0)
    return clipboardPath;
  const data = sourceNode.data;
  const dataPath = data?.path;
  if (typeof dataPath === "string" && dataPath.length > 0) return dataPath;
  return assetId ? assetMetadataStore.getState().get(assetId)?.path : void 0;
}

function isCrossWorkspacePaste(sourceWorkspace, currentWorkspace) {
  if (sourceWorkspace == null && currentWorkspace == null) return false;
  return sourceWorkspace !== currentWorkspace;
}

function inferKind(nodeType) {
  if (nodeType === CanvasNodeType.Image) return "image";
  if (nodeType === CanvasNodeType.Video) return "video";
  if (nodeType === CanvasNodeType.Audio) return "audio";
  if (nodeType === CanvasNodeType.Text) return "text";
  return void 0;
}

function promoteToPrimary(node, duplicated, assetMetadataStore) {
  const { cloneOf: sourceNodeId, ...metaWithoutClone } = node.meta ?? {};
  const {
    cloneOf: _dataCloneOf,
    assetId: _dataAssetId,
    ...dataWithoutClone
  } = node.data ?? {};
  const pluginId = dataWithoutClone.pluginId;
  const pluginStorageCloneOf =
    typeof pluginId === "string" &&
    pluginId.length > 0 &&
    typeof sourceNodeId === "string"
      ? sourceNodeId
      : void 0;
  const nextMeta = {
    ...metaWithoutClone,
    ...(pluginStorageCloneOf
      ? {
          pluginStorageCloneOf,
        }
      : {}),
  };
  assetMetadataStore.getState().merge(node.id, duplicated);
  return {
    ...node,
    assetId: duplicated.assetId,
    data: {
      ...dataWithoutClone,
      assetId: duplicated.assetId,
      name: duplicated.name,
      path: duplicated.path,
    },
    meta: Object.keys(nextMeta).length > 0 ? nextMeta : void 0,
  };
}

function shouldPreserveImportedMediaClone(sourceNode, clipboard) {
  const sourceAssetId = resolveNodeAssetId(sourceNode);
  if (!sourceAssetId) return false;
  const matchingNodes =
    clipboard?.nodes.filter(
      (candidate) => resolveNodeAssetId(candidate) === sourceAssetId,
    ) ?? [];
  const primarySource =
    matchingNodes.find((candidate) => candidate.meta?.cloneOf == null) ??
    matchingNodes[0];
  return primarySource != null && primarySource.id !== sourceNode.id;
}

function retargetImportedMediaClone(node, duplicated, assetMetadataStore) {
  const cloneOf = node.meta?.cloneOf ?? node.id;
  assetMetadataStore.getState().merge(node.id, duplicated);
  return {
    ...node,
    assetId: duplicated.assetId,
    data: {
      ...(node.data ?? {}),
      assetId: duplicated.assetId,
      name: duplicated.name,
      path: duplicated.path,
      cloneOf,
    },
    meta: {
      ...node.meta,
      cloneOf,
    },
  };
}

function createPromiseDedupe() {
  const inFlight = new Map();
  return {
    run(key, factory) {
      const existing = inFlight.get(key);
      if (existing) return existing;
      const promise = factory().catch((err) => {
        inFlight.delete(key);
        throw err;
      });
      inFlight.set(key, promise);
      return promise;
    },
    size() {
      return inFlight.size;
    },
  };
}

function createPasteNodeTransformer({
  assetMetadataStore,
  duplicateTextAsset,
  duplicateFileAsset,
  duplicateTableAsset,
  duplicateAssetByPath,
  getCurrentWorkspace,
}) {
  const noTextDup = !duplicateTextAsset;
  const noFileDup = !duplicateFileAsset;
  const noTableDup = !duplicateTableAsset;
  const noCrossWsDup = !duplicateAssetByPath;
  if (noTextDup && noFileDup && noTableDup && noCrossWsDup) {
    return void 0;
  }
  const dedupe = createPromiseDedupe();
  const cacheKey = (sourceWorkspace, sourcePath) =>
    `${sourceWorkspace ?? ""}|${sourcePath}`;
  return async (node, sourceNode) => {
    const clipboard = getClipboard();
    const sourceWorkspace = clipboard?.sourceWorkspace;
    const currentWorkspace = getCurrentWorkspace?.();
    const crossWorkspace = isCrossWorkspacePaste(
      sourceWorkspace,
      currentWorkspace,
    );
    if (
      node.type === CanvasNodeType.Image ||
      node.type === CanvasNodeType.Video ||
      node.type === CanvasNodeType.Audio
    ) {
      if (!crossWorkspace) {
        const originAssetId =
          (typeof sourceNode.assetId === "string" &&
          sourceNode.assetId.length > 0
            ? sourceNode.assetId
            : void 0) ?? sourceNode.data?.assetId;
        if (originAssetId && node.id !== originAssetId) {
          const originMeta = assetMetadataStore.getState().get(originAssetId);
          if (originMeta)
            assetMetadataStore.getState().set(node.id, originMeta);
        }
        return node;
      }
      if (!duplicateAssetByPath) return node;
      const sourcePath = readSourcePath(
        sourceNode,
        clipboard,
        assetMetadataStore,
      );
      if (!sourcePath) return node;
      try {
        const duplicated = await dedupe.run(
          cacheKey(sourceWorkspace, sourcePath),
          () =>
            duplicateAssetByPath({
              sourceWorkspace,
              sourceRelativePath: sourcePath,
              expectedKind: inferKind(node.type),
            }),
        );
        assetMetadataStore.getState().merge(duplicated.assetId, duplicated);
        const rewrittenData = {
          ...node.data,
          assetId: duplicated.assetId,
          name: duplicated.name,
          path: duplicated.path,
        };
        if (shouldPreserveImportedMediaClone(sourceNode, clipboard)) {
          return retargetImportedMediaClone(
            node,
            duplicated,
            assetMetadataStore,
          );
        }
        const { cloneOf: _metaCloneOf, ...metaWithoutClone } = node.meta ?? {};
        const { cloneOf: _dataCloneOf, ...dataWithoutClone } = rewrittenData;
        assetMetadataStore.getState().merge(node.id, duplicated);
        return {
          ...node,
          assetId: duplicated.assetId,
          data: dataWithoutClone,
          meta:
            Object.keys(metaWithoutClone).length > 0
              ? metaWithoutClone
              : void 0,
        };
      } catch (err) {
        console.warn(
          "[paste-transformer] cross-workspace media duplicate failed:",
          err,
        );
        return node;
      }
    }
    if (node.type === CanvasNodeType.File) {
      const sourcePath = readSourcePath(
        sourceNode,
        clipboard,
        assetMetadataStore,
      );
      if (!sourcePath) return node;
      if (crossWorkspace && duplicateAssetByPath) {
        try {
          const duplicated = await dedupe.run(
            cacheKey(sourceWorkspace, sourcePath),
            () =>
              duplicateAssetByPath({
                sourceWorkspace,
                sourceRelativePath: sourcePath,
              }),
          );
          assetMetadataStore.getState().merge(duplicated.assetId, duplicated);
          return promoteToPrimary(node, duplicated, assetMetadataStore);
        } catch (err) {
          console.warn(
            "[paste-transformer] cross-workspace file duplicate failed:",
            err,
          );
          return node;
        }
      }
      if (!duplicateFileAsset) return node;
      try {
        const duplicated = await duplicateFileAsset(sourcePath);
        assetMetadataStore.getState().merge(duplicated.assetId, duplicated);
        return promoteToPrimary(node, duplicated, assetMetadataStore);
      } catch (err) {
        console.warn("[paste-transformer] file duplicate failed:", err);
        return node;
      }
    }
    if (node.type === CanvasNodeType.Text) {
      const sourcePath = readSourcePath(
        sourceNode,
        clipboard,
        assetMetadataStore,
      );
      if (!sourcePath) return node;
      if (crossWorkspace && duplicateAssetByPath) {
        try {
          const duplicated = await dedupe.run(
            cacheKey(sourceWorkspace, sourcePath),
            () =>
              duplicateAssetByPath({
                sourceWorkspace,
                sourceRelativePath: sourcePath,
                expectedKind: "text",
              }),
          );
          assetMetadataStore.getState().merge(duplicated.assetId, duplicated);
          return promoteToPrimary(node, duplicated, assetMetadataStore);
        } catch (err) {
          console.warn(
            "[paste-transformer] cross-workspace text duplicate failed:",
            err,
          );
          return node;
        }
      }
      if (!duplicateTextAsset) return node;
      let duplicated;
      try {
        duplicated = await duplicateTextAsset(sourcePath);
      } catch (err) {
        console.warn("[paste-transformer] text duplicate failed:", err);
        return node;
      }
      assetMetadataStore.getState().merge(duplicated.assetId, duplicated);
      return promoteToPrimary(node, duplicated, assetMetadataStore);
    }
    if (node.type === CanvasNodeType.Table && duplicateTableAsset) {
      const sourceData = sourceNode.data;
      const sourcePath = sourceData?.tablePath;
      if (!sourcePath) return node;
      const duplicated = await duplicateTableAsset(
        sourcePath,
        sourceData?.title,
      );
      const { cloneOf: _metaCloneOf, ...metaWithoutClone } = node.meta ?? {};
      const {
        cloneOf: _dataCloneOf,
        assetId: _dataAssetId,
        ...dataWithoutClone
      } = node.data ?? {};
      return {
        ...node,
        id: crypto.randomUUID(),
        assetId: void 0,
        data: {
          ...dataWithoutClone,
          tablePath: duplicated.tablePath,
          title: duplicated.title,
          tableRevision: void 0,
        },
        meta:
          Object.keys(metaWithoutClone).length > 0 ? metaWithoutClone : void 0,
      };
    }
    return node;
  };
}

export function usePasteNodeTransformer({
  instance,
  duplicateTextAsset,
  duplicateFileAsset,
  duplicateTableAsset,
  duplicateAssetByPath,
  getCurrentWorkspace,
}) {
  const assetMetadataStore = useAssetMetadataApi();
  reactExports.useEffect(() => {
    const transformer = createPasteNodeTransformer({
      assetMetadataStore,
      duplicateTextAsset,
      duplicateFileAsset,
      duplicateTableAsset,
      duplicateAssetByPath,
      getCurrentWorkspace,
    });
    instance.setPasteNodeTransformer(transformer);
    return () => {
      instance.setPasteNodeTransformer(void 0);
    };
  }, [
    assetMetadataStore,
    duplicateTextAsset,
    duplicateFileAsset,
    duplicateTableAsset,
    duplicateAssetByPath,
    getCurrentWorkspace,
    instance,
  ]);
}
