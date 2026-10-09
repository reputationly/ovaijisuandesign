// 首次进入时的示例项目：准备、恢复可见性、导入内置包。
import { h as useTranslation, a1 as useProjectStore, E as useProjectActions, lc as useProjectArchiveActions, x as useNavigateToWorkspace, v as useStorage, r as reactExports, p as projectLog, H as homeService, K as workspaceRuntimeFromOpenResult, l9 as toastWorkspaceOpenResult, a3 as dedupedToast } from "../main.jsx";
const SAMPLE_PROJECT_ID = "builtin-sample-project";
export function useSampleProject() {
  const {
    t
  } = useTranslation();
  const {
    allProjects: projects
  } = useProjectStore();
  const {
    provisionSampleProject,
    restoreProjectVisibility
  } = useProjectActions();
  const {
    runImportBundledProject
  } = useProjectArchiveActions();
  const navigateToWorkspace = useNavigateToWorkspace();
  const [,, setGlobalConfigAsync] = useStorage("global.config");
  const enableProjectGrouping = reactExports.useCallback(async () => {
    try {
      await setGlobalConfigAsync(previous => ({
        ...previous,
        recentProjectsGroupMode: "project"
      }));
    } catch (err) {
      projectLog.warn("sample-project group-mode write failed", {
        error: err instanceof Error ? err.message : String(err)
      });
    }
  }, [setGlobalConfigAsync]);
  const openExistingWorkspace = reactExports.useCallback(async folderPath => {
    try {
      const openResult = await homeService.hiloApp.openWorkspaceWithResult(folderPath);
      const runtime = workspaceRuntimeFromOpenResult(openResult);
      if (!runtime) {
        toastWorkspaceOpenResult(openResult, t);
        return false;
      }
      navigateToWorkspace(runtime);
      return true;
    } catch (err) {
      projectLog.error("sample-project reopen failed", {
        path: folderPath,
        error: err instanceof Error ? err.message : String(err)
      });
      return false;
    }
  }, [navigateToWorkspace, t]);
  const openSampleProject = reactExports.useCallback(async () => {
    const existingPath = projects.find(project => project.id === SAMPLE_PROJECT_ID)?.workspacePaths[0];
    if (existingPath) {
      projectLog.info("sample-project reuse", {
        path: existingPath
      });
      const restored = await restoreProjectVisibility(SAMPLE_PROJECT_ID);
      if (!restored) {
        dedupedToast.error(t("project.restore.failed"));
        return {
          success: false,
          mode: "reused"
        };
      }
      await enableProjectGrouping();
      const opened = await openExistingWorkspace(existingPath);
      return {
        success: opened,
        mode: "reused"
      };
    }
    const outcome = await runImportBundledProject("sample-project");
    if (!outcome.targetDir) {
      projectLog.error("sample-project import failed", {
        stage: outcome.failureStage
      });
      return {
        success: false,
        mode: "failed"
      };
    }
    const targetDir = outcome.targetDir;
    const sampleName = t("coachMark.home.sampleProjectName", "项目新手指引");
    await provisionSampleProject({
      id: SAMPLE_PROJECT_ID,
      name: sampleName,
      workspacePath: targetDir
    });
    await enableProjectGrouping();
    projectLog.info("sample-project provisioned", {
      projectId: SAMPLE_PROJECT_ID,
      path: targetDir,
      opened: outcome.success
    });
    return outcome.success ? {
      success: true,
      mode: "imported"
    } : {
      success: false,
      mode: "failed"
    };
  }, [projects, restoreProjectVisibility, enableProjectGrouping, openExistingWorkspace, runImportBundledProject, provisionSampleProject, t]);
  return {
    openSampleProject
  };
}
