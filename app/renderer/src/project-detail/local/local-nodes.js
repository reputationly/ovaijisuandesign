// 本地资产的路径与节点推导，纯函数。
import { hD as formatBytes } from "../../main.jsx";
function relParent(relPath) {
  const idx = relPath.lastIndexOf("/");
  return idx === -1 ? "" : relPath.slice(0, idx);
}
export function localNodeRelPath(node, currentRel) {
  if (node.kind === "file" && node.record) return node.record.relPath;
  return currentRel === "" ? node.name : `${currentRel}/${node.name}`;
}
export function localNodeParentRel(node, currentRel) {
  return relParent(localNodeRelPath(node, currentRel));
}
export function compactLocalMoveTargets(targets, currentRel) {
  const folderPaths = targets
    .filter((node) => node.kind === "folder")
    .map((node) => localNodeRelPath(node, currentRel));
  return targets.filter((node) => {
    const relPath = localNodeRelPath(node, currentRel);
    return !folderPaths.some(
      (folderPath) => folderPath !== relPath && relPath.startsWith(`${folderPath}/`),
    );
  });
}
export function deriveLocalNodes(records, folders, currentRel) {
  const prefix = currentRel === "" ? "" : `${currentRel}/`;
  const folderNodes = folders
    .filter((rel) => relParent(rel) === currentRel)
    .map((rel) => {
      const childRecords = records.filter((record) => record.relPath.startsWith(`${rel}/`));
      let folderUpdatedAt = 0;
      for (const record of childRecords) {
        const ts = record.updatedAt ?? record.createdAt ?? 0;
        if (ts > folderUpdatedAt) folderUpdatedAt = ts;
      }
      return {
        kind: "folder",
        name: rel.slice(prefix.length),
        fileCount: childRecords.length,
        folderUpdatedAt,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
  const fileNodes = records
    .filter((record) => relParent(record.relPath) === currentRel)
    .sort((a, b) => (b.updatedAt ?? b.createdAt) - (a.updatedAt ?? a.createdAt))
    .map((record) => ({
      kind: "file",
      name: record.name,
      record,
    }));
  return [...folderNodes, ...fileNodes];
}
export function deriveLocalSearchNodes(allRecords, matchingRecords, matchingFolders, currentRel) {
  const prefix = currentRel === "" ? "" : `${currentRel}/`;
  const folderNodes = matchingFolders.map((rel) => {
    const childRecords = allRecords.filter((record) => record.relPath.startsWith(`${rel}/`));
    let folderUpdatedAt = 0;
    for (const record of childRecords) {
      const ts = record.updatedAt ?? record.createdAt ?? 0;
      if (ts > folderUpdatedAt) folderUpdatedAt = ts;
    }
    return {
      kind: "folder",
      name: rel.slice(prefix.length),
      fileCount: childRecords.length,
      folderUpdatedAt,
    };
  });
  return [
    ...folderNodes,
    ...matchingRecords.map((record) => ({
      kind: "file",
      name: record.name,
      record,
    })),
  ];
}
export function nodeKey(node) {
  return node.kind === "folder" ? `folder:${node.name}` : `file:${node.record?.id ?? node.name}`;
}
export function nodeMeta(node, t) {
  return node.kind === "folder"
    ? t("localAssets.folderMeta", {
        count: node.fileCount ?? 0,
      })
    : formatBytes(node.record?.size ?? 0);
}
export function nodeUpdatedAt(node, language) {
  let ts;
  if (node.kind === "file" && node.record) {
    ts = node.record.updatedAt ?? node.record.createdAt;
  } else if (node.kind === "folder" && node.folderUpdatedAt && node.folderUpdatedAt > 0) {
    ts = node.folderUpdatedAt;
  }
  if (!ts) return void 0;
  const date = new Date(ts);
  if (language.startsWith("zh")) {
    return `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}`;
  }
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
