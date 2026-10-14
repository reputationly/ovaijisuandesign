// browser-search-history.jsx
import reactExports from "react";
import { useTranslation } from "react-i18next";
import { Search, X$7 as CloseIcon } from "../media-editing/lucide-icon-wraps.js";
import { Icon } from "../vendor-inline/vscode-base/graph.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { setBuiltinBrowserChatContext } from "./resolve-retry-message-payload.jsx";
const errorMessages = {
  cancelled: (translate) => translate("workspace.browser.importError.cancelled"),
  chrome_profile_unavailable: (translate) =>
    translate("workspace.browser.importError.chrome_profile_unavailable"),
  bookmark_file_unavailable: (translate) =>
    translate("workspace.browser.importError.bookmark_file_unavailable"),
  bookmark_file_invalid: (translate) =>
    translate("workspace.browser.importError.bookmark_file_invalid"),
  bookmark_file_too_large: (translate) =>
    translate("workspace.browser.importError.bookmark_file_too_large"),
  cookie_database_unavailable: (translate) =>
    translate("workspace.browser.importError.cookie_database_unavailable"),
  cookie_database_busy: (translate) =>
    translate("workspace.browser.importError.cookie_database_busy"),
  cookie_database_access_denied: (translate) =>
    translate("workspace.browser.importError.cookie_database_access_denied"),
  cookie_database_not_found: (translate) =>
    translate("workspace.browser.importError.cookie_database_not_found"),
  cookie_database_invalid: (translate) =>
    translate("workspace.browser.importError.cookie_database_invalid"),
  decryption_failed: (translate) =>
    translate("workspace.browser.importError.decryption_failed"),
  import_in_progress: (translate) =>
    translate("workspace.browser.importError.import_in_progress"),
  invalid_current_site: (translate) =>
    translate("workspace.browser.importError.invalid_current_site"),
  invalid_request: (translate) => translate("workspace.browser.importError.invalid_request"),
  keychain_access_denied: (translate) =>
    translate("workspace.browser.importError.keychain_access_denied"),
  keychain_access_timeout: (translate) =>
    translate("workspace.browser.importError.keychain_access_timeout"),
  keychain_item_not_found: (translate) =>
    translate("workspace.browser.importError.keychain_item_not_found"),
  profile_not_found: (translate) =>
    translate("workspace.browser.importError.profile_not_found"),
  unsupported_platform: (translate) =>
    translate("workspace.browser.importError.unsupported_platform"),
  untrusted_sender: (translate) =>
    translate("workspace.browser.importError.untrusted_sender"),
  unexpected_error: (translate) =>
    translate("workspace.browser.importError.unexpected_error"),
};
export function browserProfileImportErrorMessage(translate, code) {
  const knownCode =
    code && Object.hasOwn(errorMessages, code) ? code : "unexpected_error";
  return errorMessages[knownCode](translate);
}
export function browserBookmarkImportNotice(translate, result, addedCount) {
  const count = addedCount;
  if (result.limitReached) {
    return {
      warning: true,
      message: translate("workspace.browser.syncBookmarksLimited", {
        defaultValue:
          "已导入 {{count}} 个新书签，已达到导入上限，其余书签未导入",
        count,
      }),
    };
  }
  if (result.skippedCount > 0) {
    return {
      warning: true,
      message: translate("workspace.browser.syncBookmarksSkipped", {
        defaultValue:
          "已导入 {{count}} 个新书签，部分不支持的链接或过深的文件夹已跳过",
        count,
      }),
    };
  }
  return {
    warning: false,
    message: translate("workspace.browser.syncBookmarksSuccess", {
      defaultValue: "已导入 {{count}} 个新书签",
      count,
    }),
  };
}
export function browserProfileImportFailureTrackProps(result) {
  return {
    error_code: result.errorCode ?? "unknown",
    ...(result.keychainSubreason
      ? {
          keychain_subreason: result.keychainSubreason,
        }
      : {}),
    ...(result.windowsDecryptionSubreason
      ? {
          windows_decryption_subreason: result.windowsDecryptionSubreason,
        }
      : {}),
    ...(result.cookieDatabaseFailure
      ? {
          stage: result.cookieDatabaseFailure.stage,
          reason: result.cookieDatabaseFailure.reason,
        }
      : {}),
  };
}
export function BrowserSearchHistory({
  items,
  onSelect,
  onRemove,
  actionId = "browser.search-history",
  deleteActionId = "workspace.browser.search-history-delete",
}) {
  const { t: translate } = useTranslation();
  if (items.length === 0) return null;
  return (
    <div
      data-action-ui-id={actionId}
      className="elevated-surface-border absolute -inset-x-px top-[calc(100%+4px)] z-50 overflow-hidden rounded-lg bg-popover p-1 shadow-lg"
    >
      {items.map((item) => (
        <div
          key={item}
          className="group flex h-8 items-center rounded-md transition-colors hover:bg-muted/80 focus-within:bg-muted/80"
        >
          <button
            type="button"
            data-action-ui-id={`${actionId}-item`}
            className="flex h-full min-w-0 flex-1 items-center gap-2 px-2 text-left text-xs text-foreground"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onSelect(item)}
          >
            <Icon
              icon={Search}
              size="sm"
              className="shrink-0 text-muted-foreground"
            />
            <span className="truncate">{item}</span>
          </button>
          <button
            type="button"
            data-action-ui-id={deleteActionId}
            data-search-history-item={item}
            className="mr-1 flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-[color,background-color,opacity] hover:bg-background/80 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100 group-focus-within:opacity-100"
            aria-label={translate("workspace.browser.deleteSearchHistory", {
              defaultValue: "删除这条搜索记录",
            })}
            title={translate("workspace.browser.deleteSearchHistory", {
              defaultValue: "删除这条搜索记录",
            })}
            onMouseDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            onClick={(event) => {
              event.stopPropagation();
              onRemove(item);
            }}
          >
            <Icon icon={CloseIcon} size="sm" />
          </button>
        </div>
      ))}
    </div>
  );
}
export function useBrowserChatContext(activeTab, connectorEnabled) {
  reactExports.useEffect(() => {
    setBuiltinBrowserChatContext({
      surface_open: connectorEnabled,
      ...(connectorEnabled && activeTab
        ? {
            active_tab: {
              id: activeTab.id,
              url: activeTab.url,
              ...(activeTab.title
                ? {
                    title: activeTab.title,
                  }
                : {}),
            },
          }
        : {}),
    });
  }, [activeTab, connectorEnabled]);
  reactExports.useEffect(
    () => () =>
      setBuiltinBrowserChatContext({
        surface_open: false,
      }),
    [],
  );
}
export function useBrowserTabPresence(tabs, activeTabId = null) {
  const [previous, setPrevious] = reactExports.useState({
    tabs,
    activeTabId,
  });
  const [entries, setEntries] = reactExports.useState(() =>
    tabs.map((tab) => ({
      tab,
      active: tab.id === activeTabId,
      entering: false,
      exiting: false,
    })),
  );
  if (previous.tabs !== tabs || previous.activeTabId !== activeTabId) {
    const live = new Map(tabs.map((tab) => [tab.id, tab]));
    const known = new Set(entries.map(({ tab }) => tab.id));
    const next = entries.map((entry) => ({
      ...entry,
      tab: live.get(entry.tab.id) ?? entry.tab,
      // Keep the outgoing tab's selected appearance until its shell has faded out.
      active: live.has(entry.tab.id)
        ? entry.tab.id === activeTabId
        : entry.active,
      exiting: !live.has(entry.tab.id),
    }));
    for (const tab of tabs) {
      if (!known.has(tab.id))
        next.push({
          tab,
          active: tab.id === activeTabId,
          entering: true,
          exiting: false,
        });
    }
    setPrevious({
      tabs,
      activeTabId,
    });
    setEntries(next);
  }
  const finishExit = reactExports.useCallback((id) => {
    setEntries((current) =>
      current.filter((entry) => entry.tab.id !== id || !entry.exiting),
    );
  }, []);
  return {
    entries,
    finishExit,
  };
}
