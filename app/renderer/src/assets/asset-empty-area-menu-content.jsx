// asset-empty-area-menu-content.jsx
import reactExports from "react";
import { useTranslation } from "react-i18next";
import { FolderPlus, LayoutGrid, LayoutList } from "../media-editing/lucide-icon-wraps.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { PlatformFileManagerLabel } from "../settings/request-prompt-prefill.jsx";
import { ClipboardPaste, FileInput } from "../media-editing/package.jsx";
import { RetryIcon, StrokeIcon } from "../workspace/use-prompt-icon.jsx";
import { LocalFolderIcon } from "../workspace/home-service.jsx";
import {
  ActionContextMenuContent,
  ActionContextMenuItem,
  ActionContextMenuSeparator,
  ContextMenuShortcut,
} from "../workspace/context-menu-content.jsx";
import { ShortcutHint } from "../workspace/shortcut-hint.jsx";

function sortEntries(entries, fileComparator) {
  return [...entries].sort((leftEntry, rightEntry) => {
    if (leftEntry.isDirectory !== rightEntry.isDirectory) return leftEntry.isDirectory ? -1 : 1;
    if (leftEntry.isDirectory) return leftEntry.name.localeCompare(rightEntry.name);
    if (fileComparator) return fileComparator(leftEntry, rightEntry);
    return leftEntry.name.localeCompare(rightEntry.name);
  });
}

function sortTreeRecursively(tree, fileComparator) {
  const sortedTop = sortEntries(tree, fileComparator);
  return sortedTop.map((entry) =>
    entry.children
      ? {
          ...entry,
          children: sortTreeRecursively(entry.children, fileComparator),
        }
      : entry,
  );
}

export function useFlattenTree(tree, expanded, creatingEntry, fileComparator) {
  const sortedTree = reactExports.useMemo(
    () => sortTreeRecursively(tree, fileComparator),
    [tree, fileComparator],
  );
  return reactExports.useMemo(() => {
    const rows = [];
    const walk = (entries, depth) => {
      for (const entry of entries) {
        rows.push({
          entry,
          depth,
        });
        if (entry.isDirectory && expanded.has(entry.path)) {
          if (creatingEntry && creatingEntry.parentPath === entry.path) {
            rows.push({
              entry: {
                name: "",
                path: `${entry.path}/__creating__`,
                isDirectory: creatingEntry.isDirectory,
                loaded: false,
              },
              depth: depth + 1,
            });
          }
          if (entry.children) {
            walk(entry.children, depth + 1);
          }
        }
      }
    };
    walk(sortedTree, 0);
    if (
      creatingEntry &&
      !rows.some(
        (treeRow) => treeRow.entry.path === `${creatingEntry.parentPath}/__creating__`,
      )
    ) {
      const isRootLevel = !sortedTree.some(
        (directoryEntry) => directoryEntry.isDirectory && directoryEntry.path === creatingEntry.parentPath,
      );
      if (isRootLevel) {
        rows.unshift({
          entry: {
            name: "",
            path: `${creatingEntry.parentPath}/__creating__`,
            isDirectory: creatingEntry.isDirectory,
            loaded: false,
          },
          depth: 0,
        });
      }
    }
    return rows;
  }, [sortedTree, expanded, creatingEntry]);
}

export function AssetEmptyAreaMenuContent(props) {
  const {
    viewMode,
    onSwitchViewMode,
    onRefresh,
    onShowRootInFolder,
    rootInFolderDisabled,
    onNewFolder,
    onImportFiles,
    onPaste,
    clipboardHasContent,
  } = props;
  const { t: translate } = useTranslation();
  const oppositeViewLabel =
    viewMode === "tree"
      ? translate("fileExplorer.gridView")
      : translate("fileExplorer.treeView");
  return (
    <ActionContextMenuContent>
      <ActionContextMenuItem
        onClick={onNewFolder}
        data-action-ui-id="asset-panel.menu-new-folder"
      >
        <StrokeIcon icon={FolderPlus} size={14} />
        {translate("fileExplorer.newFolder", {
          defaultValue: "新建文件夹",
        })}
      </ActionContextMenuItem>
      <ActionContextMenuItem
        onClick={onImportFiles}
        data-action-ui-id="asset-panel.menu-import-files"
      >
        <StrokeIcon icon={FileInput} size={14} />
        {translate("fileExplorer.importFiles", {
          defaultValue: "导入文件…",
        })}
      </ActionContextMenuItem>
      <ActionContextMenuItem
        onClick={onPaste}
        disabled={!clipboardHasContent}
        data-action-ui-id="asset-panel.menu-paste"
      >
        <StrokeIcon icon={ClipboardPaste} size={14} />
        {translate("fileExplorer.paste", {
          defaultValue: "粘贴",
        })}
        <ContextMenuShortcut>
          <ShortcutHint accelerator="CommandOrControl+V" variant="plain" />
        </ContextMenuShortcut>
      </ActionContextMenuItem>
      <ActionContextMenuSeparator />
      <ActionContextMenuItem
        onClick={onSwitchViewMode}
        data-action-ui-id="asset-panel.menu-switch-view"
      >
        {viewMode === "tree" ? (
          <StrokeIcon icon={LayoutGrid} size={14} />
        ) : (
          <StrokeIcon icon={LayoutList} size={14} />
        )}
        {translate("fileExplorer.switchViewTo", {
          view: oppositeViewLabel,
        })}
      </ActionContextMenuItem>
      <ActionContextMenuSeparator />
      <ActionContextMenuItem
        onClick={onRefresh}
        data-action-ui-id="asset-panel.menu-refresh"
      >
        <RetryIcon size={16} />
        {translate("fileExplorer.refreshList")}
      </ActionContextMenuItem>
      <ActionContextMenuItem
        onClick={onShowRootInFolder}
        disabled={rootInFolderDisabled}
        data-action-ui-id="asset-panel.menu-show-root-in-folder"
      >
        <LocalFolderIcon />
        <PlatformFileManagerLabel />
      </ActionContextMenuItem>
    </ActionContextMenuContent>
  );
}
