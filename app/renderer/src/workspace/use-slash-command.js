// use-slash-command.js
import { findTrailingTrigger } from "../chat/find-trailing-trigger.js";
import { API_PATHS, reactExports, useTranslation } from "../vendor.js";
import { useGatewayFetch } from "../generation/use-model-catalog-scope-key.js";
import {
  trackSkillCreatorInvoke,
  trackSkillInvoke,
} from "./use-new-workspace-dialog.jsx";

function findSlashTrigger(textBeforeCaret) {
  return findTrailingTrigger(textBeforeCaret, "/", "\\s/");
}

const STORAGE_KEY = "messageInput.skillUsageCounts";

const MAX_USAGE_COUNT = Number.MAX_SAFE_INTEGER;

const listeners = new Set();

function normalizeCounts(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const counts = {};
  for (const [skillName, count] of Object.entries(value)) {
    if (
      skillName &&
      typeof count === "number" &&
      Number.isSafeInteger(count) &&
      count > 0
    ) {
      counts[skillName] = count;
    }
  }
  return counts;
}

let snapshotRaw;

let snapshot = {};

function getSkillUsageCounts() {
  let raw;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return snapshot;
  }
  if (raw === snapshotRaw) return snapshot;
  snapshotRaw = raw;
  try {
    snapshot = raw ? normalizeCounts(JSON.parse(raw)) : {};
  } catch {
    snapshot = {};
  }
  return snapshot;
}

function recordSkillUsage(skillName) {
  if (!skillName) return;
  const current = getSkillUsageCounts();
  const next = {
    ...current,
    [skillName]: Math.min((current[skillName] ?? 0) + 1, MAX_USAGE_COUNT),
  };
  const serialized = JSON.stringify(next);
  try {
    localStorage.setItem(STORAGE_KEY, serialized);
  } catch {}
  snapshotRaw = serialized;
  snapshot = next;
  for (const listener of listeners) listener();
}

function subscribeSkillUsage(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function sortSkillsByUsage(skills, counts) {
  return skills
    .map((skill, index) => ({
      skill,
      index,
    }))
    .sort(
      (leftSkill, rightSkill) =>
        (counts[rightSkill.skill.name] ?? 0) - (counts[leftSkill.skill.name] ?? 0) ||
        leftSkill.index - rightSkill.index,
    )
    .map(({ skill }) => skill);
}

function isSkillInfo(value) {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof value.name === "string" &&
    typeof value.description === "string" &&
    typeof value.enabled === "boolean" &&
    typeof value.source === "string"
  );
}

const CACHE_TTL = 3e4;

async function fetchSkills(gatewayFetch, signal) {
  const resp = await gatewayFetch(API_PATHS.skills, {
    signal,
  });
  if (!resp.ok) return [];
  const data = await resp.json();
  if (!Array.isArray(data)) return [];
  return data.filter(isSkillInfo);
}

export function useSlashCommand(
  input,
  setInput,
  pageContext = "project",
  guidePromptOverride,
) {
  const gatewayFetch = useGatewayFetch();
  const { i18n } = useTranslation();
  const [allSkills, setAllSkills] = reactExports.useState([]);
  const [open, setOpen] = reactExports.useState(false);
  const [query, setQuery] = reactExports.useState("");
  const [activeIndex, setActiveIndex] = reactExports.useState(0);
  const [selectedSkill, setSelectedSkill] = reactExports.useState(null);
  const [ghostText, setGhostText] = reactExports.useState(null);
  const selectedSkillRef = reactExports.useRef(null);
  const selectedSkillPromptRef = reactExports.useRef(null);
  const pendingInputRef = reactExports.useRef(null);
  const lastFetchRef = reactExports.useRef(0);
  const abortRef = reactExports.useRef(null);
  const inputRef = reactExports.useRef(input);
  inputRef.current = input;
  const openedByButtonRef = reactExports.useRef(false);
  const caretRef = reactExports.useRef(0);
  const [openedByButton, setOpenedByButton] = reactExports.useState(false);
  const skillUsageCounts = reactExports.useSyncExternalStore(
    subscribeSkillUsage,
    getSkillUsageCounts,
    getSkillUsageCounts,
  );
  const fetchSeqRef = reactExports.useRef(0);
  const ensureSkills = reactExports.useCallback(async () => {
    if (Date.now() - lastFetchRef.current < CACHE_TTL) return;
    lastFetchRef.current = Date.now();
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const seq = ++fetchSeqRef.current;
    try {
      const skills = await fetchSkills(gatewayFetch, controller.signal);
      if (seq !== fetchSeqRef.current) return;
      setAllSkills(skills);
    } catch {
      if (!controller.signal.aborted) {
        lastFetchRef.current = 0;
      }
    }
  }, [gatewayFetch]);
  reactExports.useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);
  reactExports.useEffect(() => {
    if (typeof window === "undefined" || !window.hilo?.skills) return;
    return window.hilo.skills.onPermissionsChanged(() => {
      lastFetchRef.current = 0;
      void ensureSkills();
    });
  }, [ensureSkills]);
  const closeSlashCommand = reactExports.useCallback(() => {
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
    openedByButtonRef.current = false;
    setOpenedByButton(false);
  }, []);
  reactExports.useEffect(() => {
    if (!open || openedByButtonRef.current) return;
    if (!findSlashTrigger(input.slice(0, caretRef.current))) {
      closeSlashCommand();
    }
  }, [input, open, closeSlashCommand]);
  const enabledSkills = reactExports.useMemo(
    () => allSkills.filter((skill) => skill.enabled),
    [allSkills],
  );
  const filtered = reactExports.useMemo(() => {
    if (query) {
      const queryText = query.toLocaleLowerCase();
      return enabledSkills
        .filter(
          (skill) =>
            skill.name.toLocaleLowerCase().includes(queryText) ||
            skill.displayNameZh?.toLocaleLowerCase().includes(queryText),
        )
        .sort((leftSkill, rightSkill) => {
          const aName = leftSkill.name.toLocaleLowerCase();
          const bName = rightSkill.name.toLocaleLowerCase();
          const aDisplayName = leftSkill.displayNameZh?.toLocaleLowerCase() ?? "";
          const bDisplayName = rightSkill.displayNameZh?.toLocaleLowerCase() ?? "";
          const aPrefix =
            aName.startsWith(queryText) || aDisplayName.startsWith(queryText) ? 0 : 1;
          const bPrefix =
            bName.startsWith(queryText) || bDisplayName.startsWith(queryText) ? 0 : 1;
          if (aPrefix !== bPrefix) return aPrefix - bPrefix;
          const aNameMatch = aName.includes(queryText) ? 0 : 1;
          const bNameMatch = bName.includes(queryText) ? 0 : 1;
          if (aNameMatch !== bNameMatch) return aNameMatch - bNameMatch;
          return (
            (skillUsageCounts[rightSkill.name] ?? 0) - (skillUsageCounts[leftSkill.name] ?? 0)
          );
        });
    }
    return sortSkillsByUsage(enabledSkills, skillUsageCounts);
  }, [query, enabledSkills, skillUsageCounts]);
  reactExports.useEffect(() => {
    setActiveIndex(0);
  }, [filtered.length]);
  reactExports.useEffect(() => {
    if (
      open &&
      !openedByButtonRef.current &&
      query.length > 0 &&
      allSkills.length > 0 &&
      filtered.length === 0
    ) {
      closeSlashCommand();
    }
  }, [open, query, allSkills.length, filtered.length, closeSlashCommand]);
  const onInputChange = reactExports.useCallback(
    (value, caret, options) => {
      if (options?.syncInput !== false) setInput(value);
      setGhostText(null);
      const caretPos = caret ?? value.length;
      caretRef.current = caretPos;
      const match = findSlashTrigger(value.slice(0, caretPos));
      if (match) {
        void ensureSkills();
        openedByButtonRef.current = false;
        setOpenedByButton(false);
        setQuery(match.query);
        setOpen(true);
      } else if (openedByButtonRef.current) {
        setOpen(true);
      } else {
        closeSlashCommand();
      }
    },
    [setInput, ensureSkills, closeSlashCommand],
  );
  const openPopover = reactExports.useCallback(() => {
    void ensureSkills();
    openedByButtonRef.current = true;
    setOpenedByButton(true);
    setQuery("");
    setOpen(true);
  }, [ensureSkills]);
  const selectSkill = reactExports.useCallback(
    (skill, invokeSource, prompt) => {
      if (invokeSource !== "silent") {
        recordSkillUsage(skill.name);
        const resolvedSource =
          invokeSource ??
          (pageContext === "home" ? "home_input_slash" : "project_input_slash");
        if (skill.name === "skill-creator") {
          trackSkillCreatorInvoke(
            resolvedSource === "home_input_slash"
              ? "home_slash"
              : "project_slash",
          );
        } else {
          trackSkillInvoke({
            name: skill.name,
            source: resolvedSource,
          });
        }
      }
      const original = inputRef.current;
      const isZh = i18n.language.startsWith("zh");
      const promptText = prompt?.trim() ?? "";
      const guide =
        guidePromptOverride ||
        (isZh
          ? skill.guidePrompt || skill.guidePromptEn
          : skill.guidePromptEn || skill.guidePrompt);
      let nextInput;
      const caret = Math.min(caretRef.current, original.length);
      if (promptText) {
        nextInput = `/${skill.name} ${promptText} `;
      } else {
        const triggerMatch = openedByButtonRef.current
          ? null
          : findSlashTrigger(original.slice(0, caret));
        if (triggerMatch) {
          const before = original.slice(0, triggerMatch.start);
          const after = original.slice(caret);
          nextInput = `${before}/${skill.name} ${after}`;
        } else {
          let text = original;
          if (selectedSkillRef.current) {
            const oldCmd = `/${selectedSkillRef.current.name}`;
            if (text.startsWith(oldCmd)) {
              text = text.slice(oldCmd.length).replace(/^\s+/, "");
              const previousPrompt = selectedSkillPromptRef.current;
              if (previousPrompt && text.startsWith(previousPrompt)) {
                text = text.slice(previousPrompt.length).replace(/^\s+/, "");
              }
            }
          }
          const command = `/${skill.name}`;
          nextInput = text ? `${command} ${text}` : `${command} `;
        }
      }
      setInput(nextInput);
      setGhostText(promptText ? null : guide || null);
      setSelectedSkill(skill);
      selectedSkillRef.current = skill;
      selectedSkillPromptRef.current = promptText || null;
      pendingInputRef.current = nextInput;
      closeSlashCommand();
      return nextInput;
    },
    [setInput, closeSlashCommand, guidePromptOverride, i18n.language, pageContext],
  );
  reactExports.useEffect(() => {
    if (!selectedSkill) return;
    const effectiveInput = pendingInputRef.current ?? input;
    if (!effectiveInput.includes(`/${selectedSkill.name}`)) {
      setSelectedSkill(null);
      selectedSkillRef.current = null;
      selectedSkillPromptRef.current = null;
    }
    if (
      pendingInputRef.current !== null &&
      input.includes(`/${selectedSkill.name}`)
    ) {
      pendingInputRef.current = null;
    }
  }, [input, selectedSkill]);
  const onKeyDown = reactExports.useCallback(
    (keyboardEvent) => {
      if (keyboardEvent.key === "Tab" && !open && ghostText) {
        keyboardEvent.preventDefault();
        const prefix = /\s$/.test(inputRef.current)
          ? inputRef.current
          : `${inputRef.current} `;
        setInput(prefix + ghostText);
        setGhostText(null);
        return true;
      }
      if (!open || filtered.length === 0) return false;
      if (openedByButtonRef.current) return false;
      switch (keyboardEvent.key) {
        case "ArrowUp": {
          keyboardEvent.preventDefault();
          setActiveIndex((prev) =>
            prev <= 0 ? filtered.length - 1 : prev - 1,
          );
          return true;
        }
        case "ArrowDown": {
          keyboardEvent.preventDefault();
          setActiveIndex((prev) =>
            prev >= filtered.length - 1 ? 0 : prev + 1,
          );
          return true;
        }
        case "Tab":
        case "Enter": {
          keyboardEvent.preventDefault();
          const skill = filtered[activeIndex];
          if (skill) selectSkill(skill);
          return true;
        }
        case "Escape": {
          keyboardEvent.preventDefault();
          closeSlashCommand();
          return true;
        }
        default:
          return false;
      }
    },
    [open, filtered, activeIndex, selectSkill, closeSlashCommand, ghostText, setInput],
  );
  return {
    open,
    allSkills,
    activeIndex,
    setActiveIndex,
    tabFiltered: filtered,
    selectedSkill,
    close: closeSlashCommand,
    openPopover,
    onInputChange,
    onKeyDown,
    selectSkill,
    ghostText,
    setGhostText,
    /**
     * True iff the popover was opened via the Skills button (not via typing
     * `/`). Consumers can use this to render a search input — the editor is
     * the search source when typing `/`, but there's no input bound to the
     * popover when the button is the trigger.
     */
    openedByButton,
    /** Current query (skill filter). When opened via `/`, this mirrors the
     *  text after the slash; when opened via the Skills button, consumers can
     *  drive it via {@link setQuery} from the in-popover search input. */
    query,
    setQuery,
    /**
     * True iff a slash-skill command is currently staged in the input but
     * not yet accepted/cleared. Distinct from `selectedSkill` (React state)
     * which is force-cleared as soon as the input stops containing the
     * `/${name}` prefix — this ref survives that state transition long
     * enough for imperative consumers to detect "a /skill command is in
     * flight, do not stomp it".
     */
    isSelectSkillPending: () => selectedSkillRef.current !== null,
  };
}
