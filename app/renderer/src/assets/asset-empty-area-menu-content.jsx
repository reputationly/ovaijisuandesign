// asset-empty-area-menu-content.jsx
import {
  FolderPlus,
  LayoutGrid,
  LayoutList,
  reactExports,
  useTranslation,
} from "../vendor.js";
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

function sortEntries(entries2, fileComparator) {
  return [...entries2].sort((a2, b3) => {
    if (a2.isDirectory !== b3.isDirectory) return a2.isDirectory ? -1 : 1;
    if (a2.isDirectory) return a2.name.localeCompare(b3.name);
    if (fileComparator) return fileComparator(a2, b3);
    return a2.name.localeCompare(b3.name);
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
    const walk = (entries2, depth2) => {
      for (const entry of entries2) {
        rows.push({
          entry,
          depth: depth2,
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
              depth: depth2 + 1,
            });
          }
          if (entry.children) {
            walk(entry.children, depth2 + 1);
          }
        }
      }
    };
    walk(sortedTree, 0);
    if (
      creatingEntry &&
      !rows.some(
        (r2) => r2.entry.path === `${creatingEntry.parentPath}/__creating__`,
      )
    ) {
      const isRootLevel = !sortedTree.some(
        (e2) => e2.isDirectory && e2.path === creatingEntry.parentPath,
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
  const { t: t2 } = useTranslation();
  const oppositeViewLabel =
    viewMode === "tree"
      ? t2("fileExplorer.gridView")
      : t2("fileExplorer.treeView");
  return (
    <ActionContextMenuContent>
      <ActionContextMenuItem
        onClick={onNewFolder}
        data-action-ui-id="asset-panel.menu-new-folder"
      >
        <StrokeIcon icon={FolderPlus} size={14} />
        {t2("fileExplorer.newFolder", {
          defaultValue: "新建文件夹",
        })}
      </ActionContextMenuItem>
      <ActionContextMenuItem
        onClick={onImportFiles}
        data-action-ui-id="asset-panel.menu-import-files"
      >
        <StrokeIcon icon={FileInput} size={14} />
        {t2("fileExplorer.importFiles", {
          defaultValue: "导入文件…",
        })}
      </ActionContextMenuItem>
      <ActionContextMenuItem
        onClick={onPaste}
        disabled={!clipboardHasContent}
        data-action-ui-id="asset-panel.menu-paste"
      >
        <StrokeIcon icon={ClipboardPaste} size={14} />
        {t2("fileExplorer.paste", {
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
        {t2("fileExplorer.switchViewTo", {
          view: oppositeViewLabel,
        })}
      </ActionContextMenuItem>
      <ActionContextMenuSeparator />
      <ActionContextMenuItem
        onClick={onRefresh}
        data-action-ui-id="asset-panel.menu-refresh"
      >
        <RetryIcon size={16} />
        {t2("fileExplorer.refreshList")}
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
