// asset-context-menu-content.jsx
import jsxRuntimeExports from "react/jsx-runtime";
import { useTranslation } from "react-i18next";
import { Copy, Crosshair, ExternalLink, FolderInput, FolderPlus, LayoutGrid, LayoutList, Plus } from "../media-editing/lucide-icon-wraps.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { PlatformFileManagerLabel } from "../settings/request-prompt-prefill.jsx";
import { Files, Sparkles, Trash2 } from "../media-editing/package.jsx";
import { LocalFolderIcon, PencilIcon } from "../workspace/home-service.jsx";
import { StrokeIcon } from "../workspace/use-prompt-icon.jsx";
import {
  ActionContextMenuContent,
  ActionContextMenuItem,
  ActionContextMenuSeparator,
  ContextMenuShortcut,
} from "../workspace/context-menu-content.jsx";
import { AddToChatIcon } from "../canvas/fullscreen-icon.jsx";
import { ShortcutHint } from "../workspace/shortcut-hint.jsx";

export function AssetContextMenuContent(props) {
  const {
    target,
    viewMode,
    onSwitchViewMode,
    onAddToCanvas,
    onAddToChat,
    onAddToLibrary,
    onSaveToProjectAssets,
    onLocateOnCanvas,
    onOpenDefault,
    onOpenWith,
    onPickAppAndOpen,
    onShowInFolder,
    onCopyPath,
    onCopyFile,
    onDuplicate,
    onRename,
    onDelete,
    onNewFolderInside,
    openWithSubOpen,
    onOpenWithSubOpenChange,
  } = props;
  const { t: translate } = useTranslation();
  const isFile = !target.isDirectory && !target.isMissing;
  const oppositeViewLabel =
    viewMode === "tree"
      ? translate("fileExplorer.gridView")
      : translate("fileExplorer.treeView");
  return (
    <ActionContextMenuContent>
      {!target.isDirectory && (
        <>
          <ActionContextMenuItem
            onClick={onAddToCanvas}
            data-action-ui-id="asset-panel.menu-add-to-canvas"
          >
            <StrokeIcon icon={Plus} size={14} />
            {translate("fileExplorer.addToCanvas")}
            <ContextMenuShortcut>
              <ShortcutHint
                accelerator="CommandOrControl+Shift+A"
                variant="plain"
              />
            </ContextMenuShortcut>
          </ActionContextMenuItem>
          <ActionContextMenuItem
            onClick={onAddToChat}
            data-action-ui-id="asset-panel.menu-add-to-chat"
          >
            <StrokeIcon icon={AddToChatIcon} size={14} viewBoxSize={20} />
            {translate("fileExplorer.addToChat")}
          </ActionContextMenuItem>
          {onAddToLibrary && (
            <ActionContextMenuItem
              onClick={onAddToLibrary}
              data-action-ui-id="asset-panel.menu-add-to-library"
            >
              <StrokeIcon icon={Sparkles} size={14} />
              {translate("fileExplorer.addToLibrary")}
            </ActionContextMenuItem>
          )}
          {onSaveToProjectAssets && (
            <ActionContextMenuItem
              onClick={onSaveToProjectAssets}
              data-action-ui-id="asset-panel.menu-save-to-project-assets"
            >
              <StrokeIcon icon={FolderInput} size={14} />
              {translate("fileExplorer.saveToProjectAssets")}
            </ActionContextMenuItem>
          )}
        </>
      )}
      {!target.isDirectory && !target.isMissing && (
        <ActionContextMenuItem
          onClick={onLocateOnCanvas}
          data-action-ui-id="asset-panel.menu-locate-on-canvas"
        >
          <StrokeIcon icon={Crosshair} size={14} />
          {translate("fileExplorer.locateOnCanvas", {
            defaultValue: "在画布中定位",
          })}
        </ActionContextMenuItem>
      )}
      {!target.isDirectory && <ActionContextMenuSeparator />}
      {isFile && (
        <>
          <ActionContextMenuItem
            onClick={onOpenDefault}
            data-action-ui-id="asset-panel.menu-open-default"
          >
            <StrokeIcon icon={ExternalLink} size={14} />
            {translate("fileExplorer.open")}
            <ContextMenuShortcut>
              <ShortcutHint accelerator="CommandOrControl+O" variant="plain" />
            </ContextMenuShortcut>
          </ActionContextMenuItem>
          <ActionContextMenuItem
            onClick={onShowInFolder}
            data-action-ui-id="asset-panel.menu-show-in-folder"
          >
            <LocalFolderIcon />
            <PlatformFileManagerLabel />
            <ContextMenuShortcut>
              <ShortcutHint
                accelerator="CommandOrControl+Shift+R"
                variant="plain"
              />
            </ContextMenuShortcut>
          </ActionContextMenuItem>
          <ActionContextMenuItem
            onClick={onCopyPath}
            data-action-ui-id="asset-panel.menu-copy-path"
          >
            <StrokeIcon icon={Copy} size={14} />
            {translate("fileExplorer.copyPath")}
          </ActionContextMenuItem>
          <ActionContextMenuItem
            onClick={onCopyFile}
            data-action-ui-id="asset-panel.menu-copy-file"
          >
            <StrokeIcon icon={Files} size={14} />
            {translate("fileExplorer.copyFile")}
            <ContextMenuShortcut>
              <ShortcutHint accelerator="CommandOrControl+C" variant="plain" />
            </ContextMenuShortcut>
          </ActionContextMenuItem>
          <ActionContextMenuItem
            onClick={onDuplicate}
            data-action-ui-id="asset-panel.menu-duplicate"
          >
            <StrokeIcon icon={Files} size={14} />
            {translate("fileExplorer.duplicate")}
            <ContextMenuShortcut>
              <ShortcutHint accelerator="CommandOrControl+D" variant="plain" />
            </ContextMenuShortcut>
          </ActionContextMenuItem>
        </>
      )}
      {!isFile && (
        <>
          {onNewFolderInside && (
            <ActionContextMenuItem
              onClick={onNewFolderInside}
              data-action-ui-id="asset-panel.menu-new-folder-inside"
            >
              <StrokeIcon icon={FolderPlus} size={14} />
              {translate("fileExplorer.newFolder")}
            </ActionContextMenuItem>
          )}
          <ActionContextMenuItem
            onClick={onShowInFolder}
            data-action-ui-id="asset-panel.menu-show-in-folder"
          >
            <LocalFolderIcon />
            <PlatformFileManagerLabel />
            <ContextMenuShortcut>
              <ShortcutHint
                accelerator="CommandOrControl+Shift+R"
                variant="plain"
              />
            </ContextMenuShortcut>
          </ActionContextMenuItem>
          <ActionContextMenuItem
            onClick={onCopyPath}
            data-action-ui-id="asset-panel.menu-copy-path"
          >
            <StrokeIcon icon={Copy} size={14} />
            {translate("fileExplorer.copyPath")}
          </ActionContextMenuItem>
        </>
      )}
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
      {onRename && (
        <ActionContextMenuItem
          onClick={onRename}
          data-action-ui-id="asset-panel.menu-rename"
        >
          <StrokeIcon icon={PencilIcon} size={14} />
          {translate("fileExplorer.rename")}
          <ContextMenuShortcut>
            <ShortcutHint accelerator="Enter" variant="plain" />
          </ContextMenuShortcut>
        </ActionContextMenuItem>
      )}
      <ActionContextMenuItem
        variant="destructive"
        onClick={onDelete}
        data-action-ui-id="asset-panel.menu-delete"
      >
        <StrokeIcon icon={Trash2} size={14} />
        {translate("common.delete")}
        <ContextMenuShortcut>
          <ShortcutHint accelerator="Backspace" variant="plain" />
        </ContextMenuShortcut>
      </ActionContextMenuItem>
    </ActionContextMenuContent>
  );
}
