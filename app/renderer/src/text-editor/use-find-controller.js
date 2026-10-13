// use-find-controller.js
import { reactExports } from "../vendor.js";
function pickInitialMatchIndex(matches, caretPos) {
  if (matches.length === 0) return -1;
  for (let i = 0; i < matches.length; i++) {
    if (matches[i].from >= caretPos) return i;
  }
  return 0;
}
function stepMatchIndex(current, total, dir) {
  if (total <= 0) return -1;
  if (current < 0) return dir === 1 ? 0 : total - 1;
  return (current + dir + total) % total;
}
const SEARCH_DEBOUNCE_MS = 150;
const DEFAULT_OPTIONS = {
  matchCase: false,
  wholeWord: false,
  regex: false,
};
const INITIAL_STATE = {
  isOpen: false,
  query: "",
  options: DEFAULT_OPTIONS,
  total: 0,
  limited: false,
  currentIndex: -1,
  replaceOpen: false,
  replaceValue: "",
};
export function useFindController(adapter) {
  const adapterRef = reactExports.useRef(adapter);
  adapterRef.current = adapter;
  const [state, setState] = reactExports.useState(INITIAL_STATE);
  const stateRef = reactExports.useRef(state);
  const matchesRef = reactExports.useRef([]);
  const inputRef = reactExports.useRef(null);
  const debounceRef = reactExports.useRef(null);
  const update = reactExports.useCallback((patch) => {
    stateRef.current = {
      ...stateRef.current,
      ...patch,
    };
    setState(stateRef.current);
  }, []);
  const cancelPendingSearch = reactExports.useCallback(() => {
    if (debounceRef.current != null) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  }, []);
  reactExports.useEffect(() => cancelPendingSearch, [cancelPendingSearch]);
  const runSearch = reactExports.useCallback(() => {
    const adapter = adapterRef.current;
    const { query, options } = stateRef.current;
    if (!query) {
      adapter.clear();
      matchesRef.current = [];
      update({
        total: 0,
        limited: false,
        currentIndex: -1,
      });
      return;
    }
    const { matches, limited, caretPos } = adapter.search(query, options);
    matchesRef.current = matches;
    const initialIndex = pickInitialMatchIndex(matches, caretPos);
    update({
      total: matches.length,
      limited,
      currentIndex: initialIndex,
    });
    if (matches.length === 0) {
      adapter.clear();
    } else {
      adapter.activate(matches, initialIndex);
    }
  }, [update]);
  const scheduleSearch = reactExports.useCallback(
    (immediate) => {
      cancelPendingSearch();
      if (immediate) {
        runSearch();
        return;
      }
      debounceRef.current = window.setTimeout(() => {
        debounceRef.current = null;
        runSearch();
      }, SEARCH_DEBOUNCE_MS);
    },
    [cancelPendingSearch, runSearch],
  );
  const focusInput = reactExports.useCallback(() => {
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  }, []);
  const open = reactExports.useCallback(() => {
    const selected = adapterRef.current.getSelectedText();
    const seed = selected && !selected.includes("\n") ? selected : "";
    const patch = {};
    if (seed && seed !== stateRef.current.query) patch.query = seed;
    if (!stateRef.current.isOpen) patch.isOpen = true;
    if (Object.keys(patch).length > 0) update(patch);
    if (stateRef.current.query) scheduleSearch(true);
    focusInput();
  }, [focusInput, scheduleSearch, update]);
  const closeFind = reactExports.useCallback(() => {
    if (!stateRef.current.isOpen) return;
    cancelPendingSearch();
    matchesRef.current = [];
    update({
      isOpen: false,
      total: 0,
      limited: false,
      currentIndex: -1,
    });
    adapterRef.current.clear();
    adapterRef.current.focusEditor();
  }, [cancelPendingSearch, update]);
  const setQuery = reactExports.useCallback(
    (next) => {
      update({
        query: next,
      });
      scheduleSearch(false);
    },
    [scheduleSearch, update],
  );
  const toggleOption = reactExports.useCallback(
    (key) => {
      const options = stateRef.current.options;
      update({
        options: {
          ...options,
          [key]: !options[key],
        },
      });
      scheduleSearch(true);
    },
    [scheduleSearch, update],
  );
  const step = reactExports.useCallback(
    (dir) => {
      const { currentIndex, total } = stateRef.current;
      const nextIndex = stepMatchIndex(currentIndex, total, dir);
      update({
        currentIndex: nextIndex,
      });
      if (nextIndex >= 0)
        adapterRef.current.activate(matchesRef.current, nextIndex);
    },
    [update],
  );
  const next = reactExports.useCallback(() => step(1), [step]);
  const prev = reactExports.useCallback(() => step(-1), [step]);
  const refresh = reactExports.useCallback(() => {
    if (!stateRef.current.isOpen || !stateRef.current.query) return;
    scheduleSearch(false);
  }, [scheduleSearch]);
  const toggleReplaceOpen = reactExports.useCallback(() => {
    update({
      replaceOpen: !stateRef.current.replaceOpen,
    });
  }, [update]);
  const setReplaceValue = reactExports.useCallback(
    (value) => {
      update({
        replaceValue: value,
      });
    },
    [update],
  );
  const replaceCurrent = reactExports.useCallback(() => {
    const { query, options, currentIndex, replaceValue } = stateRef.current;
    const match = matchesRef.current[currentIndex];
    if (!query || !match) return;
    adapterRef.current.replaceOne(match, query, options, replaceValue);
    scheduleSearch(true);
  }, [scheduleSearch]);
  const replaceAll = reactExports.useCallback(() => {
    const { query, options, replaceValue } = stateRef.current;
    if (!query) return;
    adapterRef.current.replaceAll(query, options, replaceValue);
    scheduleSearch(true);
  }, [scheduleSearch]);
  return {
    isOpen: state.isOpen,
    open,
    close: closeFind,
    query: state.query,
    setQuery,
    options: state.options,
    toggleOption,
    currentIndex: state.currentIndex,
    total: state.total,
    limited: state.limited,
    next,
    prev,
    refresh,
    inputRef,
    replaceOpen: state.replaceOpen,
    toggleReplaceOpen,
    replaceValue: state.replaceValue,
    setReplaceValue,
    replaceCurrent,
    replaceAll,
  };
}
