// use-ensure-skill-ready.js
import { API_PATHS, reactExports, useTranslation } from "../vendor.js";
import { dedupedToast } from "../infra/agent-http-client.js";
import { gatewayFetch } from "../infra/gateway-fetch.js";
import { beginSkillApplyingToast } from "../generation/settle-operation.js";
import { homeService } from "./home-service.jsx";
import { useGatewayReady } from "../infra/inline-rename-input.jsx";
import { showSkillInstallSuccessToast } from "./use-new-workspace-dialog.jsx";

function parseInstallResponse(raw) {
  if (!raw || typeof raw !== "object")
    return {
      ok: false,
    };
  const response = raw;
  return {
    ok: response.ok === true,
    error: typeof response.error === "string" ? response.error : void 0,
  };
}

function parseLocalSkills(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const skill = item;
    if (typeof skill.name !== "string" || typeof skill.enabled !== "boolean")
      return [];
    return [
      {
        name: skill.name,
        enabled: skill.enabled,
      },
    ];
  });
}

export function useEnsureSkillReady({ preload = false } = {}) {
  const { t: translate } = useTranslation();
  const gatewayReady = useGatewayReady();
  const [localSkills, setLocalSkills] = reactExports.useState([]);
  const localSkillsRef = reactExports.useRef([]);
  const skillsLoadedRef = reactExports.useRef(false);
  const fetchSequenceRef = reactExports.useRef(0);
  reactExports.useEffect(() => {
    localSkillsRef.current = localSkills;
  }, [localSkills]);
  const fetchLocalSkills = reactExports.useCallback(async () => {
    const sequence = ++fetchSequenceRef.current;
    try {
      const response = await gatewayFetch("/api/skills");
      const skills = response.ok ? parseLocalSkills(await response.json()) : [];
      if (sequence !== fetchSequenceRef.current) return;
      skillsLoadedRef.current = true;
      localSkillsRef.current = skills;
      setLocalSkills(skills);
    } catch {}
  }, []);
  reactExports.useEffect(() => {
    if (!preload || !gatewayReady) return;
    void fetchLocalSkills();
  }, [fetchLocalSkills, gatewayReady, preload]);
  reactExports.useEffect(() => {
    if (!window.hilo?.skills) return;
    return window.hilo.skills.onPermissionsChanged(() => {
      void fetchLocalSkills();
    });
  }, [fetchLocalSkills]);
  const markReady = reactExports.useCallback((skillName) => {
    const next = localSkillsRef.current.some(
      (skill) => skill.name === skillName,
    )
      ? localSkillsRef.current.map((skill) =>
          skill.name === skillName
            ? {
                ...skill,
                enabled: true,
              }
            : skill,
        )
      : [
          ...localSkillsRef.current,
          {
            name: skillName,
            enabled: true,
          },
        ];
    localSkillsRef.current = next;
    skillsLoadedRef.current = true;
    setLocalSkills(next);
  }, []);
  const ensureSkillReady = reactExports.useCallback(
    async (skillName, onProgress) => {
      const reportProgress = (progress) => {
        onProgress?.(Math.min(1, Math.max(0, progress)));
      };
      if (!skillsLoadedRef.current) await fetchLocalSkills();
      const localSkill = localSkillsRef.current.find(
        (skill) => skill.name === skillName,
      );
      if (!localSkill) {
        reportProgress(0.12);
        const toastId = onProgress
          ? void 0
          : dedupedToast.loading(translate("skills.market.installing"));
        try {
          const response = await gatewayFetch(API_PATHS.marketInstall, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              name: skillName,
            }),
          });
          const installResult = parseInstallResponse(await response.json());
          if (!installResult.ok) {
            dedupedToast.error(
              translate("skills.market.installError", {
                name: skillName,
              }),
              toastId !== void 0
                ? {
                    id: toastId,
                  }
                : void 0,
            );
            return false;
          }
          reportProgress(0.72);
          await homeService.hiloApp.toggleSkill(skillName, true);
          reportProgress(0.84);
          await window.hilo.opencode.restart();
          reportProgress(1);
          markReady(skillName);
          showSkillInstallSuccessToast(
            skillName,
            toastId !== void 0
              ? {
                  id: toastId,
                }
              : void 0,
          );
          return true;
        } catch {
          dedupedToast.error(
            translate("skills.market.installError", {
              name: skillName,
            }),
            toastId !== void 0
              ? {
                  id: toastId,
                }
              : void 0,
          );
          return false;
        }
      }
      if (!localSkill.enabled) {
        reportProgress(0.28);
        const applyingToast = onProgress
          ? void 0
          : beginSkillApplyingToast(translate("skills.applying"));
        try {
          await homeService.hiloApp.toggleSkill(localSkill.name, true);
          reportProgress(0.82);
          await window.hilo.opencode.restart();
          reportProgress(1);
          markReady(localSkill.name);
          if (applyingToast) {
            applyingToast.success(translate("skills.restartSuccess"));
          } else {
            dedupedToast.success(translate("skills.restartSuccess"));
          }
        } catch {
          if (applyingToast) {
            applyingToast.error(translate("skills.toggleError"));
          } else {
            dedupedToast.error(translate("skills.toggleError"));
          }
          return false;
        }
      }
      reportProgress(1);
      return true;
    },
    [fetchLocalSkills, markReady, translate],
  );
  return {
    ensureSkillReady,
    refreshLocalSkills: fetchLocalSkills,
  };
}
