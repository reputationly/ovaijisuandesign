// use-slash-command.js
import { reactExports, useTranslation, API_PATHS } from "../vendor.js";
import { useGatewayFetch } from "../generation/use-resizable-width.js";
import { trackSkillCreatorInvoke, trackSkillInvoke } from "./use-new-workspace-dialog.jsx";
import { findSlashTrigger } from "../chat/use-mention.js";
function extractUserMessages(messages2) {
  const result = [];
  for (let i2 = messages2.length - 1; i2 >= 0; i2--) {
    const m3 = messages2[i2];
    if (m3.role === "user" && m3.type === "text") {
      result.push(m3);
    }
  }
  return result;
}
export function useMessageHistory(messages2, resetKey) {
  const userMessages = reactExports.useMemo(
    () => extractUserMessages(messages2 ?? []),
    [messages2],
  );
  const [index2, setIndex] = reactExports.useState(-1);
  const indexRef = reactExports.useRef(-1);
  const draftRef = reactExports.useRef(null);
  const resetKeyRef = reactExports.useRef(resetKey);
  const navigateUp = reactExports.useCallback(
    (currentText, currentAttachmentPaths) => {
      if (userMessages.length === 0) return null;
      const current2 = indexRef.current;
      const next2 = current2 + 1;
      if (next2 >= userMessages.length) return null;
      if (current2 === -1) {
        draftRef.current = {
          text: currentText,
          attachmentPaths: [...currentAttachmentPaths],
        };
      }
      indexRef.current = next2;
      setIndex(next2);
      return userMessages[next2];
    },
    [userMessages],
  );
  const navigateDown = reactExports.useCallback(() => {
    const current2 = indexRef.current;
    if (current2 <= -1) return null;
    const next2 = current2 - 1;
    indexRef.current = next2;
    setIndex(next2);
    if (next2 >= 0) {
      return {
        type: "history",
        message: userMessages[next2],
      };
    }
    const draft = draftRef.current;
    draftRef.current = null;
    return {
      type: "draft",
      text: draft?.text ?? "",
      attachmentPaths: draft?.attachmentPaths ?? [],
    };
  }, [userMessages]);
  const reset2 = reactExports.useCallback(() => {
    if (indexRef.current !== -1) {
      indexRef.current = -1;
      setIndex(-1);
      draftRef.current = null;
    }
  }, []);
  reactExports.useEffect(() => {
    if (Object.is(resetKeyRef.current, resetKey)) return;
    resetKeyRef.current = resetKey;
    reset2();
  }, [resetKey, reset2]);
  return {
    isActive: index2 >= 0,
    navigateUp,
    navigateDown,
    reset: reset2,
  };
}
export function filenameFromPath(path2) {
  return path2.split("/").pop() ?? path2;
}
export function attachmentsFromHistory(attachments) {
  if (!attachments?.length) return [];
  return attachments.map((att) => ({
    path: att.path,
    filename: filenameFromPath(att.path),
    ...(att.attachment_source === "asset_vault" && att.attachment_id
      ? {
          attachmentId: att.attachment_id,
        }
      : {}),
  }));
}
const STORAGE_KEY = "messageInput.skillUsageCounts";
const MAX_USAGE_COUNT = Number.MAX_SAFE_INTEGER;
let snapshotRaw;
let snapshot = {};
const listeners = new Set();
function normalizeCounts(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const counts = {};
  for (const [name2, count2] of Object.entries(value)) {
    if (name2 && typeof count2 === "number" && Number.isSafeInteger(count2) && count2 > 0) {
      counts[name2] = count2;
    }
  }
  return counts;
}
function getSkillUsageCounts() {
  let raw2;
  try {
    raw2 = localStorage.getItem(STORAGE_KEY);
  } catch {
    return snapshot;
  }
  if (raw2 === snapshotRaw) return snapshot;
  snapshotRaw = raw2;
  try {
    snapshot = raw2 ? normalizeCounts(JSON.parse(raw2)) : {};
  } catch {
    snapshot = {};
  }
  return snapshot;
}
function subscribeSkillUsage(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
function recordSkillUsage(name2) {
  if (!name2) return;
  const current2 = getSkillUsageCounts();
  const next2 = {
    ...current2,
    [name2]: Math.min((current2[name2] ?? 0) + 1, MAX_USAGE_COUNT),
  };
  const serialized = JSON.stringify(next2);
  try {
    localStorage.setItem(STORAGE_KEY, serialized);
  } catch {}
  snapshotRaw = serialized;
  snapshot = next2;
  for (const listener of listeners) listener();
}
function sortSkillsByUsage(skills, counts) {
  return skills
    .map((skill, index2) => ({
      skill,
      index: index2,
    }))
    .sort(
      (a2, b3) =>
        (counts[b3.skill.name] ?? 0) - (counts[a2.skill.name] ?? 0) || a2.index - b3.index,
    )
    .map(({ skill }) => skill);
}
function isSkillInfo(v2) {
  return (
    typeof v2 === "object" &&
    v2 !== null &&
    typeof v2.name === "string" &&
    typeof v2.description === "string" &&
    typeof v2.enabled === "boolean" &&
    typeof v2.source === "string"
  );
}
const CACHE_TTL = 3e4;
async function fetchSkills(gatewayFetch2, signal) {
  const resp = await gatewayFetch2(API_PATHS.skills, {
    signal,
  });
  if (!resp.ok) return [];
  const data2 = await resp.json();
  if (!Array.isArray(data2)) return [];
  return data2.filter(isSkillInfo);
}
export function useSlashCommand(input, setInput, pageContext = "project", guidePromptOverride) {
  const gatewayFetch2 = useGatewayFetch();
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
    const seq2 = ++fetchSeqRef.current;
    try {
      const skills = await fetchSkills(gatewayFetch2, controller.signal);
      if (seq2 !== fetchSeqRef.current) return;
      setAllSkills(skills);
    } catch {
      if (!controller.signal.aborted) {
        lastFetchRef.current = 0;
      }
    }
  }, [gatewayFetch2]);
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
  const close2 = reactExports.useCallback(() => {
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
    openedByButtonRef.current = false;
    setOpenedByButton(false);
  }, []);
  reactExports.useEffect(() => {
    if (!open || openedByButtonRef.current) return;
    if (!findSlashTrigger(input.slice(0, caretRef.current))) {
      close2();
    }
  }, [input, open, close2]);
  const enabledSkills = reactExports.useMemo(
    () => allSkills.filter((skill) => skill.enabled),
    [allSkills],
  );
  const filtered = reactExports.useMemo(() => {
    if (query) {
      const q2 = query.toLocaleLowerCase();
      return enabledSkills
        .filter(
          (s2) =>
            s2.name.toLocaleLowerCase().includes(q2) ||
            s2.displayNameZh?.toLocaleLowerCase().includes(q2),
        )
        .sort((a2, b3) => {
          const aName = a2.name.toLocaleLowerCase();
          const bName = b3.name.toLocaleLowerCase();
          const aDisplayName = a2.displayNameZh?.toLocaleLowerCase() ?? "";
          const bDisplayName = b3.displayNameZh?.toLocaleLowerCase() ?? "";
          const aPrefix = aName.startsWith(q2) || aDisplayName.startsWith(q2) ? 0 : 1;
          const bPrefix = bName.startsWith(q2) || bDisplayName.startsWith(q2) ? 0 : 1;
          if (aPrefix !== bPrefix) return aPrefix - bPrefix;
          const aNameMatch = aName.includes(q2) ? 0 : 1;
          const bNameMatch = bName.includes(q2) ? 0 : 1;
          if (aNameMatch !== bNameMatch) return aNameMatch - bNameMatch;
          return (skillUsageCounts[b3.name] ?? 0) - (skillUsageCounts[a2.name] ?? 0);
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
      close2();
    }
  }, [open, query, allSkills.length, filtered.length, close2]);
  const onInputChange = reactExports.useCallback(
    (value, caret, options) => {
      if (options?.syncInput !== false) setInput(value);
      setGhostText(null);
      const caretPos = caret ?? value.length;
      caretRef.current = caretPos;
      const match2 = findSlashTrigger(value.slice(0, caretPos));
      if (match2) {
        void ensureSkills();
        openedByButtonRef.current = false;
        setOpenedByButton(false);
        setQuery(match2.query);
        setOpen(true);
      } else if (openedByButtonRef.current) {
        setOpen(true);
      } else {
        close2();
      }
    },
    [setInput, ensureSkills, close2],
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
          invokeSource ?? (pageContext === "home" ? "home_input_slash" : "project_input_slash");
        if (skill.name === "skill-creator") {
          trackSkillCreatorInvoke(
            resolvedSource === "home_input_slash" ? "home_slash" : "project_slash",
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
          let text2 = original;
          if (selectedSkillRef.current) {
            const oldCmd = `/${selectedSkillRef.current.name}`;
            if (text2.startsWith(oldCmd)) {
              text2 = text2.slice(oldCmd.length).replace(/^\s+/, "");
              const previousPrompt = selectedSkillPromptRef.current;
              if (previousPrompt && text2.startsWith(previousPrompt)) {
                text2 = text2.slice(previousPrompt.length).replace(/^\s+/, "");
              }
            }
          }
          const command2 = `/${skill.name}`;
          nextInput = text2 ? `${command2} ${text2}` : `${command2} `;
        }
      }
      setInput(nextInput);
      setGhostText(promptText ? null : guide || null);
      setSelectedSkill(skill);
      selectedSkillRef.current = skill;
      selectedSkillPromptRef.current = promptText || null;
      pendingInputRef.current = nextInput;
      close2();
      return nextInput;
    },
    [setInput, close2, guidePromptOverride, i18n.language, pageContext],
  );
  reactExports.useEffect(() => {
    if (!selectedSkill) return;
    const effectiveInput = pendingInputRef.current ?? input;
    if (!effectiveInput.includes(`/${selectedSkill.name}`)) {
      setSelectedSkill(null);
      selectedSkillRef.current = null;
      selectedSkillPromptRef.current = null;
    }
    if (pendingInputRef.current !== null && input.includes(`/${selectedSkill.name}`)) {
      pendingInputRef.current = null;
    }
  }, [input, selectedSkill]);
  const onKeyDown = reactExports.useCallback(
    (e2) => {
      if (e2.key === "Tab" && !open && ghostText) {
        e2.preventDefault();
        const prefix = /\s$/.test(inputRef.current) ? inputRef.current : `${inputRef.current} `;
        setInput(prefix + ghostText);
        setGhostText(null);
        return true;
      }
      if (!open || filtered.length === 0) return false;
      if (openedByButtonRef.current) return false;
      switch (e2.key) {
        case "ArrowUp": {
          e2.preventDefault();
          setActiveIndex((prev) => (prev <= 0 ? filtered.length - 1 : prev - 1));
          return true;
        }
        case "ArrowDown": {
          e2.preventDefault();
          setActiveIndex((prev) => (prev >= filtered.length - 1 ? 0 : prev + 1));
          return true;
        }
        case "Tab":
        case "Enter": {
          e2.preventDefault();
          const skill = filtered[activeIndex];
          if (skill) selectSkill(skill);
          return true;
        }
        case "Escape": {
          e2.preventDefault();
          close2();
          return true;
        }
        default:
          return false;
      }
    },
    [open, filtered, activeIndex, selectSkill, close2, ghostText, setInput],
  );
  return {
    open,
    allSkills,
    activeIndex,
    setActiveIndex,
    tabFiltered: filtered,
    selectedSkill,
    close: close2,
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
