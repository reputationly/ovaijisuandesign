// 新建项目目录的 hook。
import reactExports from "react";
import { usePlatform } from "../infra/platform-context.js";
import { resolveNewProjectPreferences, updateNewProjectPreferences } from "../infra/shared-runtime.js";
import { workspaceLog } from "../infra/logger.js";
import { useStorage } from "../infra/use-storage.js";

export function useNewProjectFolder() {
  const platform2 = usePlatform();
  const [config2, setConfig] = useStorage("global.config");
  const {
    folderPath
  } = resolveNewProjectPreferences(config2);
  const setFolderPath = reactExports.useCallback(next2 => {
    setConfig(previous2 => updateNewProjectPreferences(previous2, {
      folderPath: next2
    }));
  }, [setConfig]);
  reactExports.useEffect(() => {
    if (!folderPath) return;
    let cancelled = false;
    const validate = async () => {
      try {
        if (await platform2.fs.exists(folderPath)) return;
        if (cancelled) return;
        setConfig(previous2 => resolveNewProjectPreferences(previous2).folderPath === folderPath ? updateNewProjectPreferences(previous2, {
          folderPath: void 0
        }) : previous2);
      } catch (error) {
        workspaceLog.info("new-project: folder-check-failed", {
          error
        });
      }
    };
    void validate();
    window.addEventListener("focus", validate);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", validate);
    };
  }, [folderPath, platform2.fs, setConfig]);
  return [folderPath, setFolderPath];
}
