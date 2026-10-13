// create-paste-node-transformer.js
import { resolveNodeAssetId } from "./remove-nodes-and-promote-group-mains.js";
import { CanvasNodeType, reactExports } from "../vendor.js";
import { useAssetMetadataApi } from "../infra/agent-http-client.js";
import { getClipboard } from "./partition-user-removal-elements.js";

function readSourcePath(sourceNode, clipboard2, assetMetadataStore) {
  const assetId = resolveNodeAssetId(sourceNode);
  const clipboardPath = assetId ? clipboard2?.assetPaths?.[assetId] : void 0;
  if (typeof clipboardPath === "string" && clipboardPath.length > 0)
    return clipboardPath;
  const data2 = sourceNode.data;
  const dataPath = data2?.path;
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

function promoteToPrimary(node2, duplicated, assetMetadataStore) {
  const { cloneOf: sourceNodeId, ...metaWithoutClone } = node2.meta ?? {};
  const {
    cloneOf: _dataCloneOf,
    assetId: _dataAssetId,
    ...dataWithoutClone
  } = node2.data ?? {};
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
  assetMetadataStore.getState().merge(node2.id, duplicated);
  return {
    ...node2,
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

function shouldPreserveImportedMediaClone(sourceNode, clipboard2) {
  const sourceAssetId = resolveNodeAssetId(sourceNode);
  if (!sourceAssetId) return false;
  const matchingNodes2 =
    clipboard2?.nodes.filter(
      (candidate) => resolveNodeAssetId(candidate) === sourceAssetId,
    ) ?? [];
  const primarySource =
    matchingNodes2.find((candidate) => candidate.meta?.cloneOf == null) ??
    matchingNodes2[0];
  return primarySource != null && primarySource.id !== sourceNode.id;
}

function retargetImportedMediaClone(node2, duplicated, assetMetadataStore) {
  const cloneOf = node2.meta?.cloneOf ?? node2.id;
  assetMetadataStore.getState().merge(node2.id, duplicated);
  return {
    ...node2,
    assetId: duplicated.assetId,
    data: {
      ...(node2.data ?? {}),
      assetId: duplicated.assetId,
      name: duplicated.name,
      path: duplicated.path,
      cloneOf,
    },
    meta: {
      ...node2.meta,
      cloneOf,
    },
  };
}

function createPromiseDedupe() {
  const inFlight = new Map();
  return {
    run(key2, factory) {
      const existing = inFlight.get(key2);
      if (existing) return existing;
      const promise = factory().catch((err) => {
        inFlight.delete(key2);
        throw err;
      });
      inFlight.set(key2, promise);
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
  const dedupe2 = createPromiseDedupe();
  const cacheKey = (sourceWorkspace, sourcePath) =>
    `${sourceWorkspace ?? ""}|${sourcePath}`;
  return async (node2, sourceNode) => {
    const clipboard2 = getClipboard();
    const sourceWorkspace = clipboard2?.sourceWorkspace;
    const currentWorkspace = getCurrentWorkspace?.();
    const crossWorkspace = isCrossWorkspacePaste(
      sourceWorkspace,
      currentWorkspace,
    );
    if (
      node2.type === CanvasNodeType.Image ||
      node2.type === CanvasNodeType.Video ||
      node2.type === CanvasNodeType.Audio
    ) {
      if (!crossWorkspace) {
        const originAssetId =
          (typeof sourceNode.assetId === "string" &&
          sourceNode.assetId.length > 0
            ? sourceNode.assetId
            : void 0) ?? sourceNode.data?.assetId;
        if (originAssetId && node2.id !== originAssetId) {
          const originMeta = assetMetadataStore.getState().get(originAssetId);
          if (originMeta)
            assetMetadataStore.getState().set(node2.id, originMeta);
        }
        return node2;
      }
      if (!duplicateAssetByPath) return node2;
      const sourcePath = readSourcePath(
        sourceNode,
        clipboard2,
        assetMetadataStore,
      );
      if (!sourcePath) return node2;
      try {
        const duplicated = await dedupe2.run(
          cacheKey(sourceWorkspace, sourcePath),
          () =>
            duplicateAssetByPath({
              sourceWorkspace,
              sourceRelativePath: sourcePath,
              expectedKind: inferKind(node2.type),
            }),
        );
        assetMetadataStore.getState().merge(duplicated.assetId, duplicated);
        const rewrittenData = {
          ...node2.data,
          assetId: duplicated.assetId,
          name: duplicated.name,
          path: duplicated.path,
        };
        if (shouldPreserveImportedMediaClone(sourceNode, clipboard2)) {
          return retargetImportedMediaClone(
            node2,
            duplicated,
            assetMetadataStore,
          );
        }
        const { cloneOf: _metaCloneOf, ...metaWithoutClone } = node2.meta ?? {};
        const { cloneOf: _dataCloneOf, ...dataWithoutClone } = rewrittenData;
        assetMetadataStore.getState().merge(node2.id, duplicated);
        return {
          ...node2,
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
        return node2;
      }
    }
    if (node2.type === CanvasNodeType.File) {
      const sourcePath = readSourcePath(
        sourceNode,
        clipboard2,
        assetMetadataStore,
      );
      if (!sourcePath) return node2;
      if (crossWorkspace && duplicateAssetByPath) {
        try {
          const duplicated = await dedupe2.run(
            cacheKey(sourceWorkspace, sourcePath),
            () =>
              duplicateAssetByPath({
                sourceWorkspace,
                sourceRelativePath: sourcePath,
              }),
          );
          assetMetadataStore.getState().merge(duplicated.assetId, duplicated);
          return promoteToPrimary(node2, duplicated, assetMetadataStore);
        } catch (err) {
          console.warn(
            "[paste-transformer] cross-workspace file duplicate failed:",
            err,
          );
          return node2;
        }
      }
      if (!duplicateFileAsset) return node2;
      try {
        const duplicated = await duplicateFileAsset(sourcePath);
        assetMetadataStore.getState().merge(duplicated.assetId, duplicated);
        return promoteToPrimary(node2, duplicated, assetMetadataStore);
      } catch (err) {
        console.warn("[paste-transformer] file duplicate failed:", err);
        return node2;
      }
    }
    if (node2.type === CanvasNodeType.Text) {
      const sourcePath = readSourcePath(
        sourceNode,
        clipboard2,
        assetMetadataStore,
      );
      if (!sourcePath) return node2;
      if (crossWorkspace && duplicateAssetByPath) {
        try {
          const duplicated2 = await dedupe2.run(
            cacheKey(sourceWorkspace, sourcePath),
            () =>
              duplicateAssetByPath({
                sourceWorkspace,
                sourceRelativePath: sourcePath,
                expectedKind: "text",
              }),
          );
          assetMetadataStore.getState().merge(duplicated2.assetId, duplicated2);
          return promoteToPrimary(node2, duplicated2, assetMetadataStore);
        } catch (err) {
          console.warn(
            "[paste-transformer] cross-workspace text duplicate failed:",
            err,
          );
          return node2;
        }
      }
      if (!duplicateTextAsset) return node2;
      let duplicated;
      try {
        duplicated = await duplicateTextAsset(sourcePath);
      } catch (err) {
        console.warn("[paste-transformer] text duplicate failed:", err);
        return node2;
      }
      assetMetadataStore.getState().merge(duplicated.assetId, duplicated);
      return promoteToPrimary(node2, duplicated, assetMetadataStore);
    }
    if (node2.type === CanvasNodeType.Table && duplicateTableAsset) {
      const sourceData = sourceNode.data;
      const sourcePath = sourceData?.tablePath;
      if (!sourcePath) return node2;
      const duplicated = await duplicateTableAsset(
        sourcePath,
        sourceData?.title,
      );
      const { cloneOf: _metaCloneOf, ...metaWithoutClone } = node2.meta ?? {};
      const {
        cloneOf: _dataCloneOf,
        assetId: _dataAssetId,
        ...dataWithoutClone
      } = node2.data ?? {};
      return {
        ...node2,
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
    return node2;
  };
}

export function usePasteNodeTransformer({
  instance: instance2,
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
    instance2.setPasteNodeTransformer(transformer);
    return () => {
      instance2.setPasteNodeTransformer(void 0);
    };
  }, [
    assetMetadataStore,
    duplicateTextAsset,
    duplicateFileAsset,
    duplicateTableAsset,
    duplicateAssetByPath,
    getCurrentWorkspace,
    instance2,
  ]);
}
