// use-find-controller.js
import { reactExports } from "../vendor.js";
function pickInitialMatchIndex(matches2, caretPos) {
  if (matches2.length === 0) return -1;
  for (let i2 = 0; i2 < matches2.length; i2++) {
    if (matches2[i2].from >= caretPos) return i2;
  }
  return 0;
}
function stepMatchIndex(current2, total, dir) {
  if (total <= 0) return -1;
  if (current2 < 0) return dir === 1 ? 0 : total - 1;
  return (current2 + dir + total) % total;
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
  const [state2, setState] = reactExports.useState(INITIAL_STATE);
  const stateRef = reactExports.useRef(state2);
  const matchesRef = reactExports.useRef([]);
  const inputRef = reactExports.useRef(null);
  const debounceRef = reactExports.useRef(null);
  const update2 = reactExports.useCallback((patch2) => {
    stateRef.current = {
      ...stateRef.current,
      ...patch2,
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
    const a2 = adapterRef.current;
    const { query, options } = stateRef.current;
    if (!query) {
      a2.clear();
      matchesRef.current = [];
      update2({
        total: 0,
        limited: false,
        currentIndex: -1,
      });
      return;
    }
    const { matches: matches2, limited, caretPos } = a2.search(query, options);
    matchesRef.current = matches2;
    const initialIndex = pickInitialMatchIndex(matches2, caretPos);
    update2({
      total: matches2.length,
      limited,
      currentIndex: initialIndex,
    });
    if (matches2.length === 0) {
      a2.clear();
    } else {
      a2.activate(matches2, initialIndex);
    }
  }, [update2]);
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
    const selected2 = adapterRef.current.getSelectedText();
    const seed = selected2 && !selected2.includes("\n") ? selected2 : "";
    const patch2 = {};
    if (seed && seed !== stateRef.current.query) patch2.query = seed;
    if (!stateRef.current.isOpen) patch2.isOpen = true;
    if (Object.keys(patch2).length > 0) update2(patch2);
    if (stateRef.current.query) scheduleSearch(true);
    focusInput();
  }, [focusInput, scheduleSearch, update2]);
  const close2 = reactExports.useCallback(() => {
    if (!stateRef.current.isOpen) return;
    cancelPendingSearch();
    matchesRef.current = [];
    update2({
      isOpen: false,
      total: 0,
      limited: false,
      currentIndex: -1,
    });
    adapterRef.current.clear();
    adapterRef.current.focusEditor();
  }, [cancelPendingSearch, update2]);
  const setQuery = reactExports.useCallback(
    (next22) => {
      update2({
        query: next22,
      });
      scheduleSearch(false);
    },
    [scheduleSearch, update2],
  );
  const toggleOption = reactExports.useCallback(
    (key2) => {
      const options = stateRef.current.options;
      update2({
        options: {
          ...options,
          [key2]: !options[key2],
        },
      });
      scheduleSearch(true);
    },
    [scheduleSearch, update2],
  );
  const step = reactExports.useCallback(
    (dir) => {
      const { currentIndex, total } = stateRef.current;
      const nextIndex = stepMatchIndex(currentIndex, total, dir);
      update2({
        currentIndex: nextIndex,
      });
      if (nextIndex >= 0)
        adapterRef.current.activate(matchesRef.current, nextIndex);
    },
    [update2],
  );
  const next2 = reactExports.useCallback(() => step(1), [step]);
  const prev = reactExports.useCallback(() => step(-1), [step]);
  const refresh = reactExports.useCallback(() => {
    if (!stateRef.current.isOpen || !stateRef.current.query) return;
    scheduleSearch(false);
  }, [scheduleSearch]);
  const toggleReplaceOpen = reactExports.useCallback(() => {
    update2({
      replaceOpen: !stateRef.current.replaceOpen,
    });
  }, [update2]);
  const setReplaceValue = reactExports.useCallback(
    (value) => {
      update2({
        replaceValue: value,
      });
    },
    [update2],
  );
  const replaceCurrent = reactExports.useCallback(() => {
    const { query, options, currentIndex, replaceValue } = stateRef.current;
    const match2 = matchesRef.current[currentIndex];
    if (!query || !match2) return;
    adapterRef.current.replaceOne(match2, query, options, replaceValue);
    scheduleSearch(true);
  }, [scheduleSearch]);
  const replaceAll2 = reactExports.useCallback(() => {
    const { query, options, replaceValue } = stateRef.current;
    if (!query) return;
    adapterRef.current.replaceAll(query, options, replaceValue);
    scheduleSearch(true);
  }, [scheduleSearch]);
  return {
    isOpen: state2.isOpen,
    open,
    close: close2,
    query: state2.query,
    setQuery,
    options: state2.options,
    toggleOption,
    currentIndex: state2.currentIndex,
    total: state2.total,
    limited: state2.limited,
    next: next2,
    prev,
    refresh,
    inputRef,
    replaceOpen: state2.replaceOpen,
    toggleReplaceOpen,
    replaceValue: state2.replaceValue,
    setReplaceValue,
    replaceCurrent,
    replaceAll: replaceAll2,
  };
}
