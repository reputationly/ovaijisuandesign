// use-ensure-skill-ready.js
import {
  API_PATHS,
  dedupedToast,
  reactExports,
  useTranslation,
} from "../vendor.js";
import { gatewayFetch } from "../infra/gateway-fetch.js";
import { beginSkillApplyingToast } from "../generation/settle-operation.js";
import { homeService } from "./home-service.jsx";
import { useGatewayReady } from "../infra/inline-rename-input.jsx";
import { showSkillInstallSuccessToast } from "./use-new-workspace-dialog.jsx";

function parseInstallResponse(raw2) {
  if (!raw2 || typeof raw2 !== "object")
    return {
      ok: false,
    };
  const response = raw2;
  return {
    ok: response.ok === true,
    error: typeof response.error === "string" ? response.error : void 0,
  };
}

function parseLocalSkills(raw2) {
  if (!Array.isArray(raw2)) return [];
  return raw2.flatMap((item) => {
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

export function useEnsureSkillReady({ preload: preload2 = false } = {}) {
  const { t: t2 } = useTranslation();
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
    if (!preload2 || !gatewayReady) return;
    void fetchLocalSkills();
  }, [fetchLocalSkills, gatewayReady, preload2]);
  reactExports.useEffect(() => {
    if (!window.hilo?.skills) return;
    return window.hilo.skills.onPermissionsChanged(() => {
      void fetchLocalSkills();
    });
  }, [fetchLocalSkills]);
  const markReady = reactExports.useCallback((skillName) => {
    const next2 = localSkillsRef.current.some(
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
    localSkillsRef.current = next2;
    skillsLoadedRef.current = true;
    setLocalSkills(next2);
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
          : dedupedToast.loading(t2("skills.market.installing"));
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
              t2("skills.market.installError", {
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
            t2("skills.market.installError", {
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
          : beginSkillApplyingToast(t2("skills.applying"));
        try {
          await homeService.hiloApp.toggleSkill(localSkill.name, true);
          reportProgress(0.82);
          await window.hilo.opencode.restart();
          reportProgress(1);
          markReady(localSkill.name);
          if (applyingToast) {
            applyingToast.success(t2("skills.restartSuccess"));
          } else {
            dedupedToast.success(t2("skills.restartSuccess"));
          }
        } catch {
          if (applyingToast) {
            applyingToast.error(t2("skills.toggleError"));
          } else {
            dedupedToast.error(t2("skills.toggleError"));
          }
          return false;
        }
      }
      reportProgress(1);
      return true;
    },
    [fetchLocalSkills, markReady, t2],
  );
  return {
    ensureSkillReady,
    refreshLocalSkills: fetchLocalSkills,
  };
}
