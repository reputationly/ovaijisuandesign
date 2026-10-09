// ct.js
import { y$6, d$3, h$5, c$4, n$1, o$4, r$5 } from "../../vendor.js";
import { isDraft } from "../../infra/deep-freeze.js";
import "../../infra/shallow-copy.js";
import {
  B$6,
  J$5,
  K$5,
  R$5,
  V$5,
  W$6,
  Y$3,
  at$2,
  ht$1,
  it$2,
  nt$3,
  ot$2,
  rt$2,
  st$2,
  tt$3,
  z$6,
} from "./h.js";
import { S$6, T$5, apply, create$1, i$2, rawReturn } from "../immer/make-creator.js";
let ct$2 = class ct {
  constructor() {
    ((this.position = 0),
      (this.allPatches = ot$2()),
      (this.allMetadata = []),
      (this.tempPatches = ot$2()));
  }
};
let lt$2 = class lt {
  constructor() {
    ((this.cache = null), (this.revision = 0));
  }
  get version() {
    return this.revision;
  }
  invalidate() {
    ((this.revision += 1), (this.cache = null));
  }
  get(t2) {
    var e2;
    if ((null === (e2 = this.cache) || void 0 === e2 ? void 0 : e2.version) === this.revision)
      return this.cache.history;
    let s2 = t2.state;
    const a2 =
        t2.manualMode && t2.patches.patches.length > t2.maxHistory
          ? t2.patches.patches.slice(t2.patches.patches.length - t2.maxHistory)
          : t2.patches.patches,
      i2 =
        t2.manualMode && t2.patches.inversePatches.length > t2.maxHistory
          ? t2.patches.inversePatches.slice(t2.patches.inversePatches.length - t2.maxHistory)
          : t2.patches.inversePatches,
      r2 = [];
    for (let e3 = t2.position; e3 < a2.length; e3 += 1) ((s2 = t2.apply(s2, a2[e3])), r2.push(s2));
    s2 = t2.state;
    const n2 = [];
    for (let e3 = t2.position - 1; e3 > -1; e3 -= 1) ((s2 = t2.apply(s2, i2[e3])), n2.push(s2));
    n2.reverse();
    const o2 = [...n2, t2.state, ...r2];
    return (
      (this.cache = {
        version: this.revision,
        history: o2,
      }),
      o2
    );
  }
  snapshot(t2) {
    const e2 = [];
    for (let s2 = 0; s2 < t2.length && e2.length < 20; s2 += 1)
      for (const a2 of B$6(t2[s2], {
        allowFrozen: true,
        maxIssues: 20 - e2.length,
      })) {
        const t3 = "$" === a2.path ? `$.history[${s2}]` : `$.history[${s2}]${a2.path.slice(1)}`;
        e2.push(`${t3}: ${a2.message}`);
      }
    if (e2.length > 0)
      throw new V$5(
        "PERSISTENCE_INCOMPATIBLE",
        `Travels: getHistorySnapshot cannot detach non-durable history:
- ${e2.join("\n- ")}`,
      );
    return t2.map((t3) => Y$3(t3));
  }
};
const pt$1 = (t2, e2) => {
  if (
    !((t3) =>
      null !== t3 &&
      ("object" == typeof t3 || "function" == typeof t3) &&
      "function" == typeof t3.then)(t2)
  )
    return t2;
  throw (
    ((t3) => {
      if (t3 instanceof Promise || "[object Promise]" === Object.prototype.toString.call(t3))
        try {
          t3.catch(() => {});
        } catch (t4) {}
    })(t2),
    new V$5("ASYNC_CALLBACK", `Travels: ${e2} callback must be synchronous.`)
  );
};
const ut$1 = (t2, e2) => {
  if (d$3(t2, new WeakSet(), e2))
    throw new V$5(
      "UNSUPPORTED_STATE",
      "Travels: Map and Set are not supported in state. Normalize collections to plain objects or dense arrays.",
    );
};
const dt$3 = (t2, e2, s2) => {
  const a2 = [t2, e2],
    i2 = [false, false],
    r2 = new WeakSet();
  for (let t3 = 0; t3 < a2.length; t3 += 1)
    for (const e3 of a2[t3]) {
      const a3 = e3.value;
      if (o$4(a3) && ((i2[t3] = true), d$3(a3, r2, s2, false)))
        throw new V$5(
          "UNSUPPORTED_STATE",
          "Travels: Map and Set are not supported in state. Normalize collections to plain objects or dense arrays.",
        );
    }
  return i2;
};
const vt$1 = (t2) => {
  create$1([t2], () => {}, {
    enableAutoFreeze: true,
  });
};
let yt$1 = class yt {
  constructor(t2) {
    ((this.mutable = t2.mutable),
      (this.mutativeOptions = t2.mutativeOptions),
      (this.controlledApply = t2.controlledApply),
      (this.collectionFreeObjects = t2.collectionFreeObjects));
  }
  get isControlled() {
    return void 0 !== this.controlledApply;
  }
  applyImmutably(e2, s2) {
    const a2 = this.mutativeOptions,
      { enablePatches: r2 } = a2,
      n2 = i$2(a2, ["enablePatches"]);
    return apply(e2, s2, n2);
  }
  applyNavigation(e2) {
    return this.controlledApply
      ? pt$1(
          this.controlledApply(
            Object.freeze({
              state: e2.state,
              patches: tt$3(e2.patches),
              inversePatches: tt$3(e2.inversePatches),
              fromPosition: e2.fromPosition,
              toPosition: e2.toPosition,
            }),
          ),
          "controlledApply",
        )
      : this.mutable && o$4(e2.state) && !e2.patches.some(r$5)
        ? (e2.journalMutableState(e2.state, e2.inversePatches),
          apply(e2.state, e2.patches, {
            mutable: true,
          }),
          e2.state)
        : this.applyImmutably(e2.state, e2.patches);
  }
};
const ft$2 = new Set(["[object AsyncFunction]", "[object AsyncGeneratorFunction]"]);
const gt$1 = (t2) => "function" == typeof t2 && ft$2.has(Object.prototype.toString.call(t2));
const bt$2 = (t2, e2) => {
  const s2 = [],
    a2 = t2.patches.patches;
  let i2 = -1;
  for (let r2 = 0; r2 <= a2.length; r2 += 1) {
    const n2 = r2 < a2.length && e2(st$2(a2[r2]));
    (n2 && i2 < 0 && (i2 = r2),
      !n2 &&
        i2 >= 0 &&
        (s2.push({
          position: t2.position + i2,
          patches: {
            patches: t2.patches.patches.slice(i2, r2),
            inversePatches: t2.patches.inversePatches.slice(i2, r2),
          },
          metadata: t2.metadata.slice(i2, r2),
        }),
        (i2 = -1)));
  }
  return s2;
};
const mt$1 = (t2) => (t2 ? Y$3(t2) : void 0);
const Pt$1 = (t2, e2) =>
  Array.from(
    {
      length: e2,
    },
    (e3, s2) => mt$1(null == t2 ? void 0 : t2[s2]),
  );
const wt$2 = (t2, e2) => {
  if (e2 && t2 && "object" == typeof t2) {
    for (const s2 in t2) Object.prototype.hasOwnProperty.call(t2, s2) && (e2[s2] = Y$3(t2[s2]));
    return e2;
  }
  return Y$3(t2);
};
const At$2 = (t2) => {
  if (null === t2 || "object" != typeof t2) return t2;
  const e2 = K$5(t2);
  return void 0 !== e2 ? e2 : wt$2(t2);
};
const Ot$1 = (t2, e2 = new WeakSet()) => {
  if (!o$4(t2)) return false;
  if (isDraft(t2)) return true;
  const s2 = t2;
  if (e2.has(s2)) return false;
  e2.add(s2);
  for (const t3 of Reflect.ownKeys(s2)) if (Ot$1(s2[t3], e2)) return true;
  return false;
};
const Et$1 = (t2) =>
  !!Array.isArray(t2) &&
  !!Reflect.ownKeys(t2).every((e2) => "length" === e2 || c$4(e2, t2.length)) &&
  Object.keys(t2).length === t2.length;
export let Ct$2 = class Ct {
  static deserialize(t2, e2) {
    return R$5(t2, e2);
  }
  get position() {
    return this.timeline.position;
  }
  set position(t2) {
    this.timeline.position = t2;
  }
  get allPatches() {
    return this.timeline.allPatches;
  }
  set allPatches(t2) {
    this.timeline.allPatches = t2;
  }
  get allMetadata() {
    return this.timeline.allMetadata;
  }
  set allMetadata(t2) {
    this.timeline.allMetadata = t2;
  }
  get tempPatches() {
    return this.timeline.tempPatches;
  }
  set tempPatches(t2) {
    this.timeline.tempPatches = t2;
  }
  get tempMetadata() {
    return this.timeline.tempMetadata;
  }
  set tempMetadata(t2) {
    this.timeline.tempMetadata = t2;
  }
  constructor(t2, e2 = {}) {
    var s2, a2, r2, n2;
    ((this.timeline = new ct$2()),
      (this.controlsCache = null),
      (this.historyView = new lt$2()),
      (this.collectionFreeObjects = new WeakSet()),
      (this.mutableFallbackWarned = false),
      (this.mutableRootReplaceWarned = false),
      (this.compatibilityWarningKeys = new Set()),
      (this.trackingPauseDepth = 0),
      (this.transactionDepth = 0),
      (this.transactionBranchDiscards = []),
      (this.transactionHasEffects = false),
      (this.transactionNeedsCompatibilityCheck = false),
      (this.transactionCompatibilityChecks = []),
      (this.transactionEventPatches = ot$2()),
      (this.transactionCoordinator = new J$5()),
      (this.subscribe = (t3) => this.observers.subscribe(t3)),
      (this.getState = () => this.state));
    const {
        maxHistory: o2 = 10,
        history: h2,
        initialPatches: c3,
        initialPosition: l2 = 0,
        strictInitialPatches: p3 = false,
        autoArchive: u4 = true,
        mutable: d2 = false,
        warnOnUnsupportedState: v2 = false,
        onError: y4,
        onBranchDiscard: f2,
        onObserverError: g2,
        onWarning: b3,
        devtools: m3,
        controlledApply: P3,
        patchesOptions: w3,
      } = e2,
      A2 = i$2(e2, [
        "maxHistory",
        "history",
        "initialPatches",
        "initialPosition",
        "strictInitialPatches",
        "autoArchive",
        "mutable",
        "warnOnUnsupportedState",
        "onError",
        "onBranchDiscard",
        "onObserverError",
        "onWarning",
        "devtools",
        "controlledApply",
        "patchesOptions",
      ]);
    if (
      ((this.observers = new z$6({
        devtools: m3,
        onObserverError: g2,
        onWarning: b3,
      })),
      false === w3)
    )
      throw new V$5(
        "INVALID_OPTION",
        "Travels: patchesOptions cannot be false because history requires patches.",
      );
    let O2 = null !== (s2 = null == h2 ? void 0 : h2.patches) && void 0 !== s2 ? s2 : c3,
      E3 = null !== (a2 = null == h2 ? void 0 : h2.position) && void 0 !== a2 ? a2 : l2;
    if (
      (h2 &&
        (c3 || 0 !== l2) &&
        this.observers.warn(
          "HISTORY_OPTION_OVERRIDE",
          "Travels: history overrides initialPatches and initialPosition.",
        ),
      "number" != typeof o2 || !Number.isFinite(o2) || !Number.isInteger(o2))
    )
      throw new V$5(
        "INVALID_OPTION",
        `Travels: maxHistory must be a non-negative integer, but got ${o2}`,
      );
    if (o2 < 0)
      throw new V$5("INVALID_OPTION", `Travels: maxHistory must be non-negative, but got ${o2}`);
    0 === o2 &&
      this.observers.warn(
        "HISTORY_DISABLED",
        "Travels: maxHistory is 0, which disables undo/redo history. This is rarely intended.",
      );
    const C3 = O2 ? S$6(O2) : void 0,
      T2 =
        null !==
          (n2 =
            null === (r2 = null == C3 ? void 0 : C3.error) || void 0 === r2
              ? void 0
              : r2.replace(/(^|\s)patches(?=\.| must)/g, "$1initialPatches")) && void 0 !== n2
          ? n2
          : null;
    if (T2) {
      if (p3) throw new V$5("INVALID_PATCH_ENTRY", `Travels: ${T2}`);
      (this.observers.warn(
        "INVALID_INITIAL_PATCHES",
        `Travels: ${T2}. Falling back to empty history. Set strictInitialPatches: true to throw instead.`,
      ),
        (O2 = void 0),
        (E3 = 0));
    } else
      null === (null == C3 ? void 0 : C3.error) &&
        ((O2 = C3.patches),
        P3 &&
          (O2 = {
            patches: O2.patches.map((t3) => tt$3(t3)),
            inversePatches: O2.inversePatches.map((t3) => tt$3(t3)),
          }));
    (ut$1(t2, d2 || P3 ? void 0 : this.collectionFreeObjects),
      (this.state = t2),
      (this.initialState = At$2(t2)),
      (this.maxHistory = o2),
      (this.autoArchive = u4),
      (this.mutable = d2),
      (this.warnOnUnsupportedState = v2),
      (this.onError = y4),
      (this.onBranchDiscard = f2),
      (this.options = Object.assign(Object.assign({}, A2), {
        enablePatches: null == w3 || w3,
      })),
      (this.stateDriver = new yt$1({
        mutable: d2,
        mutativeOptions: this.options,
        controlledApply: P3,
        collectionFreeObjects: this.collectionFreeObjects,
      })));
    const {
      patches: M2,
      position: I2,
      metadata: D4,
    } = this.normalizeInitialHistory(O2, E3, null == h2 ? void 0 : h2.metadata);
    ((this.allPatches = M2),
      (this.allMetadata = D4),
      O2 &&
        M2.patches.forEach((t3) => {
          at$2(t3);
        }),
      (this.initialPatches = O2 ? ot$2(M2) : void 0),
      (this.initialMetadata = (null == h2 ? void 0 : h2.metadata) ? D4.slice() : void 0),
      (this.position = I2),
      (this.initialPosition = I2),
      (this.tempPatches = ot$2()),
      (this.tempMetadata = void 0),
      this.assertInvariants());
  }
  warnAboutCompatibility(t2, e2, s2 = "$") {
    this.warnOnUnsupportedState;
  }
  warnAboutPatchCompatibility(t2, e2 = 0) {
    this.warnOnUnsupportedState;
  }
  warnAboutPersistenceCompatibility() {
    this.warnOnUnsupportedState;
  }
  warnAboutStateCompatibilityAfterPatches(t2) {}
  runPersistenceCompatibilityCheck(t2) {}
  flushTransactionCompatibilityChecks() {}
  checkPersistenceCompatibilityAfterCommit(t2, e2, s2, a2 = 0, i2 = true) {
    this.warnOnUnsupportedState;
  }
  normalizeInitialHistory(t2, e2, s2) {
    const a2 = ot$2(t2),
      i2 = a2.patches.length,
      r2 = Pt$1(s2, i2),
      n2 = this.maxHistory > 0 ? this.maxHistory : 0,
      o2 = "number" != typeof e2 || !Number.isFinite(e2) || !Number.isInteger(e2);
    let h2 = o2 ? 0 : e2;
    const c3 = Math.max(0, Math.min(h2, i2));
    if (
      ((o2 || c3 !== h2) &&
        this.observers.warn(
          "INITIAL_POSITION_CLAMPED",
          `Travels: initialPosition (${e2}) is invalid for available patches (${i2}). Using ${c3} instead.`,
        ),
      (h2 = c3),
      0 === i2)
    )
      return {
        patches: a2,
        position: 0,
        metadata: [],
      };
    if (0 === n2)
      return (
        this.observers.warn(
          "HISTORY_DISCARDED",
          `Travels: maxHistory (${this.maxHistory}) discards persisted history.`,
        ),
        {
          patches: ot$2(),
          position: 0,
          metadata: [],
        }
      );
    if (n2 >= i2)
      return {
        patches: a2,
        position: h2,
        metadata: r2,
      };
    const l2 = i2 - n2,
      p3 = Math.min(h2, l2),
      u4 = p3 + n2,
      d2 = {
        patches: a2.patches.slice(p3, u4),
        inversePatches: a2.inversePatches.slice(p3, u4),
      },
      v2 = ot$2(d2),
      y4 = h2 - p3;
    return (
      this.observers.warn(
        "HISTORY_TRIMMED",
        `Travels: initialPatches length (${i2}) exceeds maxHistory (${n2}). Retained ${n2} steps from position ${p3}. Position adjusted to ${y4}.`,
      ),
      {
        patches: v2,
        position: y4,
        metadata: r2.slice(p3, u4),
      }
    );
  }
  invalidateHistoryCache() {
    this.historyView.invalidate();
  }
  isAutoArchiving() {
    return this.autoArchive && 0 === this.transactionDepth;
  }
  assertCanMutate(t2) {
    if (this.observers.isPublishing)
      throw new W$6(
        "REENTRANT_MUTATION",
        `Travels: ${t2} cannot be called while observers are being notified.`,
      );
    if (
      this.stateDriver.isControlled &&
      "recordPatches" !== t2 &&
      "go" !== t2 &&
      "back" !== t2 &&
      "forward" !== t2 &&
      "rebase" !== t2
    )
      throw new W$6(
        "CONTROLLED_OPERATION_UNAVAILABLE",
        `Travels: ${t2} is not available on a controlled journal. Record external commits with recordPatches() and navigate with back(), forward(), or go().`,
      );
  }
  createEvent(t2, e2, s2) {
    var a2, i2;
    const r2 = null !== (a2 = null == s2 ? void 0 : s2.patches) && void 0 !== a2 ? a2 : [],
      n2 = null !== (i2 = null == s2 ? void 0 : s2.inversePatches) && void 0 !== i2 ? i2 : [],
      o2 = r2.length,
      h2 = n2.length;
    let c3;
    const l2 = {
      type: t2,
      state: this.state,
      position: this.position,
      historyLength: this.getVisibleHistoryLength(),
      metadata: e2,
      get patches() {
        if (c3) return c3;
        let t3, e3;
        return (
          (c3 = {
            get patches() {
              return null != t3 ? t3 : (t3 = nt$3(r2.slice(0, o2)));
            },
            get inversePatches() {
              return null != e3 ? e3 : (e3 = nt$3(n2.slice(0, h2)));
            },
          }),
          c3
        );
      },
    };
    return Object.freeze(l2);
  }
  getVisibleHistoryLength() {
    if (0 === this.maxHistory) return 0;
    const t2 = !this.isAutoArchiving() && this.tempPatches.patches.length > 0 ? 1 : 0;
    return Math.min(this.maxHistory, this.allPatches.patches.length + t2);
  }
  getTransactionPatchDelta() {
    const t2 = n$1(this.transactionEventPatches.patches, "forward"),
      e2 = n$1(this.transactionEventPatches.inversePatches, "backward");
    return ht$1(t2, e2);
  }
  emitBranchDiscard(t2) {
    const e2 = this.onBranchDiscard;
    this.observers.invoke("onBranchDiscard", () =>
      e2({
        position: t2.position,
        discarded: this.toEntries(t2.patches, t2.metadata),
      }),
    );
  }
  getRootTransactionEntries() {
    const t2 = this.transactionRootSnapshot;
    let e2 = t2.allPatches.patches.slice(0, t2.allPatchCount),
      s2 = t2.allPatches.inversePatches.slice(0, t2.allPatchCount),
      a2 = t2.allMetadata.slice(0, t2.allMetadataCount);
    if (t2.tempPatchCount > 0) {
      const i2 = n$1(t2.tempPatches.patches.slice(0, t2.tempPatchCount), "forward");
      (at$2(i2, st$2(t2.tempPatches.patches[0])),
        (e2 = e2.concat([i2])),
        (s2 = s2.concat([
          n$1(t2.tempPatches.inversePatches.slice(0, t2.tempPatchCount), "backward"),
        ])),
        (a2 = a2.concat([t2.tempMetadata])));
    }
    if (0 === this.maxHistory) return new Map();
    if (e2.length > this.maxHistory) {
      const t3 = e2.length - this.maxHistory;
      ((e2 = e2.slice(t3)), (s2 = s2.slice(t3)), (a2 = a2.slice(t3)));
    }
    return new Map(e2.map((t3, e3) => [st$2(t3), [t3, s2[e3], a2[e3]]]));
  }
  publishBranchDiscard(t2) {
    var e2;
    if (this.onBranchDiscard)
      return this.transactionDepth > 0
        ? ((null !== (e2 = this.transactionEntries) && void 0 !== e2) ||
            (this.transactionEntries = this.getRootTransactionEntries()),
          void this.transactionBranchDiscards.push(t2))
        : void this.emitBranchDiscard(t2);
  }
  flushTransactionBranchDiscards() {
    if (!this.transactionBranchDiscards.length) return;
    const t2 = this.transactionBranchDiscards;
    this.transactionBranchDiscards = [];
    const e2 = this.transactionEntries,
      s2 = t2.flatMap((t3) =>
        bt$2(t3, (t4) => e2.has(t4)).map((t4) => {
          const s3 = t4.patches.patches.map((t5) => e2.get(st$2(t5)));
          return {
            position: t4.position,
            patches: {
              patches: s3.map((t5) => t5[0]),
              inversePatches: s3.map((t5) => t5[1]),
            },
            metadata: s3.map((t5) => t5[2]),
          };
        }),
      );
    this.observers.publish(() => {
      for (const t3 of s2) this.emitBranchDiscard(t3);
    });
  }
  assertInvariants() {}
  emitChange(t2, e2, s2, a2) {
    if ((this.assertInvariants(), this.transactionDepth > 0))
      return (
        (this.transactionHasEffects = true),
        a2 &&
          (this.transactionEventPatches.patches.push(...a2.patches),
          this.transactionEventPatches.inversePatches.push(...a2.inversePatches)),
        void (s2 && this.publishBranchDiscard(s2))
      );
    const { listeners: i2, devtools: r2 } = this.observers.snapshot(),
      n2 = i2.length > 0 || r2 ? this.createEvent(t2, e2, a2) : void 0;
    this.observers.publish(() => {
      if ((s2 && this.publishBranchDiscard(s2), n2)) {
        for (const t3 of i2) this.observers.invoke("listener", () => t3(n2));
        r2 && this.observers.invoke("devtools", () => r2(n2));
      }
    });
  }
  reportError(t2, e2) {
    var s2;
    const a2 =
      e2 instanceof W$6
        ? e2
        : new W$6(t2, `Travels: ${t2}`, {
            cause: e2,
          });
    if (this.onError)
      if (this.transactionDepth > 0)
        (null !== (s2 = this.transactionErrors) && void 0 !== s2
          ? s2
          : (this.transactionErrors = new Set())
        ).add(a2);
      else {
        const t3 = this.onError;
        this.observers.publish(() => {
          this.observers.invoke("onError", () => t3(a2));
        });
      }
    return a2;
  }
  toEntries(t2, e2 = []) {
    return t2.patches.map((s2, a2) => ({
      patches: it$2(s2),
      inversePatches: it$2(t2.inversePatches[a2]),
      metadata: mt$1(e2[a2]),
    }));
  }
  discardFutureFrom(t2) {
    if (t2 >= this.allPatches.patches.length) return;
    const e2 = {
        patches: this.allPatches.patches.slice(t2),
        inversePatches: this.allPatches.inversePatches.slice(t2),
      },
      s2 = this.allMetadata.slice(t2);
    return (
      (this.allPatches.patches = this.allPatches.patches.slice(0, t2)),
      (this.allPatches.inversePatches = this.allPatches.inversePatches.slice(0, t2)),
      (this.allMetadata = this.allMetadata.slice(0, t2)),
      {
        position: t2,
        patches: e2,
        metadata: s2,
      }
    );
  }
  trimHistoryToMax() {
    if (!(this.maxHistory >= this.allPatches.patches.length)) {
      if (0 === this.maxHistory)
        return (
          (this.allPatches.patches = []),
          (this.allPatches.inversePatches = []),
          void (this.allMetadata = [])
        );
      ((this.allPatches.patches = this.allPatches.patches.slice(-this.maxHistory)),
        (this.allPatches.inversePatches = this.allPatches.inversePatches.slice(-this.maxHistory)),
        (this.allMetadata = this.allMetadata.slice(-this.maxHistory).map(mt$1)));
    }
  }
  resetHistoryToCurrentState() {
    ((this.initialState = At$2(this.state)),
      (this.initialPosition = 0),
      (this.initialPatches = void 0),
      (this.initialMetadata = void 0),
      (this.position = 0),
      (this.allPatches = ot$2()),
      (this.allMetadata = []),
      (this.tempPatches = ot$2()),
      (this.tempMetadata = void 0));
  }
  hasRecordedHistory() {
    var t2, e2, s2;
    return (
      0 !== this.position ||
      0 !== this.initialPosition ||
      !!(null === (t2 = this.initialPatches) || void 0 === t2 ? void 0 : t2.patches.length) ||
      !!(null === (e2 = this.initialPatches) || void 0 === e2
        ? void 0
        : e2.inversePatches.length) ||
      !!(null === (s2 = this.initialMetadata) || void 0 === s2 ? void 0 : s2.length) ||
      this.allPatches.patches.length > 0 ||
      this.allPatches.inversePatches.length > 0 ||
      this.allMetadata.length > 0 ||
      this.tempPatches.patches.length > 0 ||
      this.tempPatches.inversePatches.length > 0 ||
      void 0 !== this.tempMetadata
    );
  }
  journalMutableState(t2, e2) {
    this.transactionCoordinator.recordMutableChange(this.transactionDepth, t2, e2);
  }
  captureTransactionSnapshot() {
    return {
      state: this.state,
      position: this.position,
      allPatches: {
        patches: this.allPatches.patches,
        inversePatches: this.allPatches.inversePatches,
      },
      allPatchCount: this.allPatches.patches.length,
      allMetadata: this.allMetadata,
      allMetadataCount: this.allMetadata.length,
      tempPatches: {
        patches: this.tempPatches.patches,
        inversePatches: this.tempPatches.inversePatches,
      },
      tempPatchCount: this.tempPatches.patches.length,
      tempMetadata: this.tempMetadata,
      initialState: this.initialState,
      initialPosition: this.initialPosition,
      initialPatches: this.initialPatches,
      initialMetadata: this.initialMetadata,
      trackingPauseDepth: this.trackingPauseDepth,
      branchDiscards: this.transactionBranchDiscards,
      branchDiscardCount: this.transactionBranchDiscards.length,
      hasEffects: this.transactionHasEffects,
      needsCompatibilityCheck: this.transactionNeedsCompatibilityCheck,
      compatibilityChecks: this.transactionCompatibilityChecks,
      compatibilityCheckCount: this.transactionCompatibilityChecks.length,
      eventPatches: {
        patches: this.transactionEventPatches.patches,
        inversePatches: this.transactionEventPatches.inversePatches,
      },
      eventPatchCount: this.transactionEventPatches.patches.length,
      stateJournalLength: this.transactionCoordinator.journalLength,
    };
  }
  restoreTransactionSnapshot(t2) {
    (this.transactionCoordinator.rollbackTo(t2.stateJournalLength),
      (t2.allPatches.patches.length = t2.allPatchCount),
      (t2.allPatches.inversePatches.length = t2.allPatchCount),
      (t2.allMetadata.length = t2.allMetadataCount),
      (t2.tempPatches.patches.length = t2.tempPatchCount),
      (t2.tempPatches.inversePatches.length = t2.tempPatchCount),
      (t2.branchDiscards.length = t2.branchDiscardCount),
      (t2.compatibilityChecks.length = t2.compatibilityCheckCount),
      (t2.eventPatches.patches.length = t2.eventPatchCount),
      (t2.eventPatches.inversePatches.length = t2.eventPatchCount),
      (this.state = t2.state),
      (this.position = t2.position),
      (this.allPatches = t2.allPatches),
      (this.allMetadata = t2.allMetadata),
      (this.tempPatches = t2.tempPatches),
      (this.tempMetadata = t2.tempMetadata),
      (this.initialState = t2.initialState),
      (this.initialPosition = t2.initialPosition),
      (this.initialPatches = t2.initialPatches),
      (this.initialMetadata = t2.initialMetadata),
      (this.trackingPauseDepth = t2.trackingPauseDepth),
      (this.transactionBranchDiscards = t2.branchDiscards),
      (this.transactionHasEffects = t2.hasEffects),
      (this.transactionNeedsCompatibilityCheck = t2.needsCompatibilityCheck),
      (this.transactionCompatibilityChecks = t2.compatibilityChecks),
      (this.transactionEventPatches = t2.eventPatches),
      this.invalidateHistoryCache(),
      this.assertInvariants());
  }
  commitPatchEntry(t2, e2, s2, a2, i2) {
    if (0 === t2.length && 0 === e2.length) return;
    let r2;
    if (this.trackingPauseDepth > 0)
      return (
        this.resetHistoryToCurrentState(),
        this.invalidateHistoryCache(),
        void this.emitChange("replaceStateWithoutHistory", s2, void 0, ht$1(t2, e2))
      );
    if (this.isAutoArchiving())
      (this.position < this.allPatches.patches.length &&
        (r2 = this.discardFutureFrom(this.position)),
        this.allPatches.patches.push(t2),
        this.allPatches.inversePatches.push(e2),
        this.allMetadata.push(a2),
        (this.position =
          this.maxHistory < this.allPatches.patches.length ? this.maxHistory : this.position + 1),
        this.trimHistoryToMax());
    else {
      const i3 = this.tempPatches.patches.length > 0,
        n2 = this.position < this.allPatches.patches.length;
      (n2 && (r2 = this.discardFutureFrom(this.position)),
        (i3 && !n2) ||
          ((this.position =
            this.maxHistory < this.allPatches.patches.length + 1
              ? this.maxHistory
              : this.position + 1),
          at$2(t2)),
        n2 && ((this.tempPatches = ot$2()), (this.tempMetadata = void 0)),
        this.tempPatches.patches.push(t2),
        this.tempPatches.inversePatches.push(e2),
        (void 0 === s2 && void 0 !== this.tempMetadata) || (this.tempMetadata = a2));
    }
    (this.invalidateHistoryCache(), this.emitChange(i2, s2, r2, ht$1(t2, e2)));
  }
  setState(a2, i2) {
    let n2, c3;
    this.assertCanMutate("setState");
    const l2 = mt$1(i2),
      p3 = this.mutable && o$4(this.state),
      u4 = "function" == typeof a2;
    if (u4 && gt$1(a2))
      throw new V$5("ASYNC_CALLBACK", "Travels: setState callback must be synchronous.");
    const d2 = this.options.enableAutoFreeze
        ? Object.assign(Object.assign({}, this.options), {
            enableAutoFreeze: false,
          })
        : this.options,
      v2 = Array.isArray(this.state),
      y4 = Array.isArray(a2),
      f2 = !v2 && !y4 && h$5(this.state) && h$5(a2),
      g2 = v2 && y4 && Et$1(this.state) && Et$1(a2),
      b3 = (u4 && p3) || (p3 && !u4 && (g2 || f2));
    if (
      (!this.mutable ||
        p3 ||
        this.mutableFallbackWarned ||
        ((this.mutableFallbackWarned = true),
        this.observers.warn(
          "MUTABLE_FALLBACK",
          "Travels: mutable mode requires the state root to be an object. Falling back to immutable updates.",
        )),
      b3)
    ) {
      const [s2, i3, o2] = create$1(
          this.state,
          u4
            ? (t2) => pt$1(a2(t2), "setState")
            : (t2) => {
                ((t3, e2) => {
                  const s3 = Array.isArray(t3),
                    a3 = Array.isArray(e2),
                    i4 = Reflect.ownKeys(t3);
                  for (const a4 of i4)
                    (s3 && "length" === a4) ||
                      Object.prototype.hasOwnProperty.call(e2, a4) ||
                      delete t3[a4];
                  (s3 && a3 && (t3.length = e2.length), Object.assign(t3, e2));
                })(t2, a2);
              },
          d2,
        ),
        h2 = dt$3(i3, o2, this.mutable ? void 0 : this.collectionFreeObjects);
      this.options.enableAutoFreeze && vt$1(s2);
      const l3 = i3.some(r$5);
      ((n2 = rt$2(i3, h2[0])),
        (c3 = rt$2(o2, h2[1])),
        l3
          ? (this.mutableRootReplaceWarned ||
              ((this.mutableRootReplaceWarned = true),
              this.observers.warn(
                "MUTABLE_ROOT_REPLACEMENT",
                "Travels: mutable mode cannot apply root replacements in place. Falling back to immutable update for this change.",
              )),
            (this.state = s2))
          : (this.journalMutableState(this.state, c3),
            apply(this.state, i3, {
              mutable: true,
            })));
    } else {
      const [t2, i3, r2] = create$1(
          this.state,
          "function" == typeof a2
            ? (t3) => {
                const e2 = a2(t3);
                return (
                  pt$1(e2, "setState"),
                  e2 === t3 ? e2 : o$4(e2) && !Ot$1(e2) ? rawReturn(e2) : e2
                );
              }
            : () => (o$4(a2) ? rawReturn(a2) : a2),
          d2,
        ),
        h2 = dt$3(i3, r2, this.mutable ? void 0 : this.collectionFreeObjects);
      (this.options.enableAutoFreeze && vt$1(t2),
        (n2 = i3),
        (c3 = r2),
        this.mutable && ((n2 = rt$2(n2, h2[0])), (c3 = rt$2(c3, h2[1]))),
        (this.state = t2));
    }
    this.commitPatchEntry(n2, c3, i2, l2, "setState");
  }
  recordPatches(t2, e2) {
    if ((this.assertCanMutate("recordPatches"), !this.stateDriver.isControlled))
      throw new W$6(
        "CONTROLLED_JOURNAL_REQUIRED",
        "Travels: recordPatches is only available on a controlled journal created with createTravelJournal().",
      );
    if (this.transactionDepth > 0)
      throw new W$6(
        "INVALID_OPERATION",
        "Travels: recordPatches cannot be called inside a Travels transaction because the external state owner controls rollback.",
      );
    const s2 = T$5(e2);
    if (null !== s2.error)
      throw new V$5(
        "INVALID_PATCH_ENTRY",
        `Travels: recordPatches received an invalid patch entry: ${s2.error}.`,
      );
    const a2 = tt$3(s2.entry.patches),
      i2 = tt$3(s2.entry.inversePatches);
    if (0 === a2.length && 0 === i2.length) {
      if (!Object.is(t2, this.state))
        throw new W$6(
          "EMPTY_PATCH_ENTRY",
          "Travels: recordPatches requires a non-empty patch pair when the state changes.",
        );
      return;
    }
    const r2 = e2.metadata,
      n2 = mt$1(r2);
    ((this.state = t2), this.commitPatchEntry(a2, i2, r2, n2, "recordPatches"));
  }
  archivePending(t2, e2 = true) {
    if (!this.tempPatches.patches.length) return false;
    const s2 = void 0 === t2 ? this.tempMetadata : t2,
      a2 = mt$1(s2),
      i2 = this.getPendingArchiveEntry();
    return (
      this.allPatches.patches.push(i2.patches),
      this.allPatches.inversePatches.push(i2.inversePatches),
      this.allMetadata.push(a2),
      this.trimHistoryToMax(),
      (this.tempPatches = ot$2()),
      (this.tempMetadata = void 0),
      this.invalidateHistoryCache(),
      e2 && this.emitChange("archive", s2),
      true
    );
  }
  archive(t2) {
    (this.assertCanMutate("archive"),
      this.autoArchive
        ? this.observers.warn(
            "AUTO_ARCHIVE_ENABLED",
            "Travels: auto archive is enabled; archive() has no effect.",
          )
        : this.archivePending(t2));
  }
  transaction(t2, e2) {
    this.assertCanMutate("transaction");
    const s2 = "function" == typeof t2 ? void 0 : mt$1(t2),
      a2 = "function" == typeof t2 ? t2 : e2;
    if (!a2) return;
    if (gt$1(a2))
      throw this.reportError(
        "TRANSACTION_FAILED",
        new TypeError("Travels: transaction callback must be synchronous."),
      );
    const i2 = this.transactionMeta,
      r2 = 0 === this.transactionDepth,
      n2 = this.captureTransactionSnapshot();
    let o2 = false;
    ((this.transactionDepth += 1),
      r2
        ? ((this.transactionMeta = s2),
          (this.transactionErrors = void 0),
          (this.transactionEntries = void 0),
          (this.transactionRootSnapshot = this.onBranchDiscard ? n2 : void 0),
          (this.transactionHasEffects = false),
          (this.transactionNeedsCompatibilityCheck = false),
          (this.transactionEventPatches = ot$2()))
        : !this.transactionMeta && s2 && (this.transactionMeta = s2));
    try {
      pt$1(a2(), "transaction");
    } catch (t3) {
      throw (
        (o2 = true),
        this.restoreTransactionSnapshot(n2),
        (this.transactionMeta = i2),
        this.reportError("TRANSACTION_FAILED", t3)
      );
    } finally {
      if (((this.transactionDepth -= 1), 0 === this.transactionDepth)) {
        if (!o2) {
          const t4 = this.archivePending(this.transactionMeta, false) || this.transactionHasEffects,
            e3 = this.getTransactionPatchDelta();
          (t4 && this.emitChange("transaction", this.transactionMeta, void 0, e3),
            this.flushTransactionBranchDiscards());
        }
        ((this.transactionEntries = void 0),
          (this.transactionRootSnapshot = void 0),
          (this.transactionMeta = i2),
          (this.transactionHasEffects = n2.hasEffects),
          (this.transactionNeedsCompatibilityCheck = n2.needsCompatibilityCheck),
          this.transactionCoordinator.truncateTo(n2.stateJournalLength),
          (this.transactionEventPatches.patches.length = n2.eventPatchCount),
          (this.transactionEventPatches.inversePatches.length = n2.eventPatchCount));
        const t3 = this.transactionErrors;
        if (((this.transactionErrors = void 0), t3))
          for (const e3 of t3) this.reportError("TRANSACTION_FAILED", e3);
      }
    }
  }
  batch(t2, e2) {
    (this.assertCanMutate("batch"), this.transaction(t2, e2));
  }
  pauseTracking() {
    (this.assertCanMutate("pauseTracking"), (this.trackingPauseDepth += 1));
  }
  resumeTracking() {
    (this.assertCanMutate("resumeTracking"),
      (this.trackingPauseDepth = Math.max(0, this.trackingPauseDepth - 1)));
  }
  replaceStateWithoutHistory(t2) {
    this.assertCanMutate("replaceStateWithoutHistory");
    const e2 = this.historyView.version;
    this.pauseTracking();
    try {
      this.setState(t2);
    } finally {
      this.resumeTracking();
    }
    (ut$1(this.state),
      this.historyView.version === e2 &&
        (this.hasRecordedHistory() || this.mutable) &&
        (this.resetHistoryToCurrentState(),
        this.invalidateHistoryCache(),
        this.emitChange("replaceStateWithoutHistory")));
  }
  getPendingArchiveEntry() {
    const t2 = n$1(this.tempPatches.patches, "forward");
    return (
      at$2(t2, st$2(this.tempPatches.patches[0])),
      {
        patches: t2,
        inversePatches: n$1(this.tempPatches.inversePatches, "backward"),
      }
    );
  }
  getAllPatches() {
    if (!this.isAutoArchiving() && this.tempPatches.patches.length) {
      const t2 = this.getPendingArchiveEntry(),
        e2 = {
          patches: this.allPatches.patches.concat([t2.patches]),
          inversePatches: this.allPatches.inversePatches.concat([t2.inversePatches]),
        };
      return 0 === this.maxHistory
        ? ot$2()
        : e2.patches.length > this.maxHistory
          ? {
              patches: e2.patches.slice(-this.maxHistory),
              inversePatches: e2.inversePatches.slice(-this.maxHistory),
            }
          : e2;
    }
    return this.allPatches;
  }
  getHistory() {
    return this.historyView.get({
      state: this.state,
      position: this.position,
      patches: this.getAllPatches(),
      maxHistory: this.maxHistory,
      manualMode: !this.isAutoArchiving(),
      apply: (t2, e2) => this.stateDriver.applyImmutably(t2, e2),
    });
  }
  getHistorySnapshot() {
    return this.historyView.snapshot(this.getHistory());
  }
  go(t2) {
    if ((this.assertCanMutate("go"), "number" != typeof t2 || !Number.isFinite(t2)))
      return void this.observers.warn(
        "INVALID_POSITION",
        `Travels: cannot go to invalid position ${t2}.`,
      );
    if (!Number.isInteger(t2)) {
      const e3 = Math.trunc(t2);
      (this.observers.warn(
        "POSITION_CLAMPED",
        `Travels: cannot go to non-integer position ${t2}. Using ${e3} instead.`,
      ),
        (t2 = e3));
    }
    !this.isAutoArchiving() && this.tempPatches.patches.length && this.archivePending();
    const e2 = this.getAllPatches(),
      s2 = t2 < this.position;
    if (
      (t2 > e2.patches.length &&
        (this.observers.warn(
          "POSITION_CLAMPED",
          `Travels: cannot go forward to position ${t2}; using the latest position instead.`,
        ),
        (t2 = e2.patches.length)),
      t2 < 0 &&
        (this.observers.warn(
          "POSITION_CLAMPED",
          `Travels: cannot go back to position ${t2}; using position 0 instead.`,
        ),
        (t2 = 0)),
      t2 === this.position)
    )
      return;
    const a2 = s2
        ? n$1(e2.inversePatches.slice(-this.maxHistory).slice(t2, this.position), "backward")
        : n$1(e2.patches.slice(-this.maxHistory).slice(this.position, t2), "forward"),
      i2 = s2
        ? n$1(e2.patches.slice(-this.maxHistory).slice(t2, this.position), "forward")
        : n$1(e2.inversePatches.slice(-this.maxHistory).slice(this.position, t2), "backward");
    ((this.state = this.stateDriver.applyNavigation({
      state: this.state,
      patches: a2,
      inversePatches: i2,
      fromPosition: this.position,
      toPosition: t2,
      journalMutableState: (t3, e3) => this.journalMutableState(t3, e3),
    })),
      (this.position = t2),
      this.invalidateHistoryCache(),
      this.emitChange("go", void 0, void 0, ht$1(a2, i2)));
  }
  back(t2 = 1) {
    (this.assertCanMutate("back"), this.go(this.position - t2));
  }
  forward(t2 = 1) {
    (this.assertCanMutate("forward"), this.go(this.position + t2));
  }
  reset() {
    let a2, i2;
    var r2, n2;
    if (
      (this.assertCanMutate("reset"),
      this.mutable &&
        ((r2 = this.state),
        (n2 = this.initialState),
        Array.isArray(r2) || Array.isArray(n2)
          ? Array.isArray(r2) && Array.isArray(n2)
          : h$5(r2) && h$5(n2)))
    ) {
      const [, s2, r3] = create$1(
        this.state,
        (t2) => {
          for (const e2 of Object.keys(t2)) delete t2[e2];
          (wt$2(this.initialState, t2),
            Array.isArray(t2) &&
              Array.isArray(this.initialState) &&
              (t2.length = this.initialState.length));
        },
        this.options,
      );
      ((a2 = s2),
        (i2 = r3),
        this.journalMutableState(this.state, i2),
        apply(this.state, a2, {
          mutable: true,
        }));
    } else {
      const t2 = At$2(this.initialState),
        [r3, n3, h2] = create$1(this.state, () => (o$4(t2) ? rawReturn(t2) : t2), this.options);
      ((this.state = r3), (a2 = n3), (i2 = h2));
    }
    if (
      ((this.position = this.initialPosition),
      (this.allPatches = ot$2(this.initialPatches)),
      (this.allMetadata = Pt$1(this.initialMetadata, this.allPatches.patches.length)),
      (this.tempPatches = ot$2()),
      (this.tempMetadata = void 0),
      this.transactionDepth > 0)
    ) {
      const t2 = new Set(this.allPatches.patches.map(st$2));
      this.transactionBranchDiscards = this.transactionBranchDiscards.flatMap((e2) =>
        bt$2(e2, (e3) => !t2.has(e3)),
      );
    }
    (this.invalidateHistoryCache(), this.emitChange("reset", void 0, void 0, ht$1(a2, i2)));
  }
  rebase() {
    (this.assertCanMutate("rebase"),
      ut$1(this.state),
      (this.initialState = At$2(this.state)),
      (this.initialPosition = 0),
      (this.initialPatches = void 0),
      (this.initialMetadata = void 0),
      (this.position = 0),
      (this.allPatches = ot$2()),
      (this.allMetadata = []),
      (this.tempPatches = ot$2()),
      (this.tempMetadata = void 0),
      this.invalidateHistoryCache(),
      this.emitChange("rebase"));
  }
  canBack() {
    return this.position > 0;
  }
  canForward() {
    const t2 = !this.isAutoArchiving() && !!this.tempPatches.patches.length,
      e2 = this.getAllPatches();
    return t2 ? this.position < e2.patches.length - 1 : this.position < e2.patches.length;
  }
  canArchive() {
    return !this.autoArchive && !!this.tempPatches.patches.length;
  }
  getPosition() {
    return this.position;
  }
  getPatches() {
    const t2 =
      !this.isAutoArchiving() && this.tempPatches.patches.length
        ? this.getAllPatches()
        : this.allPatches;
    return ot$2(t2);
  }
  assertPersistenceCompatible() {
    const t2 = [],
      e2 = (e3, s3) => {
        const a2 = 20 - t2.length;
        if (!(a2 <= 0))
          for (const i2 of B$6(e3, {
            allowFrozen: true,
            maxIssues: a2,
          })) {
            const e4 = "$" === i2.path ? s3 : `${s3}${i2.path.slice(1)}`;
            t2.push(`${e4}: ${i2.message}`);
          }
      };
    e2(this.state, "$.state");
    const s2 = this.getPatches();
    for (const a2 of ["patches", "inversePatches"]) {
      for (let i2 = 0; i2 < s2[a2].length; i2 += 1) {
        const r2 = s2[a2][i2];
        for (let s3 = 0; s3 < r2.length; s3 += 1) {
          const n2 = r2[s3],
            o2 = `$.patches.${a2}[${i2}][${s3}]`;
          if (
            (y$6(n2.path) || t2.push(`${o2}.path: use a durable patch path for persistence.`),
            e2(n2, o2),
            t2.length >= 20)
          )
            break;
        }
        if (t2.length >= 20) break;
      }
      if (t2.length >= 20) break;
    }
    if (
      (t2.length < 20 &&
        this.getMetadata().forEach((s3, a2) => {
          void 0 !== s3 && t2.length < 20 && e2(s3, `$.metadata[${a2}]`);
        }),
      t2.length > 0)
    )
      throw new V$5(
        "PERSISTENCE_INCOMPATIBLE",
        `Travels: persistence compatibility check failed:
- ${t2.join("\n- ")}`,
      );
  }
  serialize(t2 = {}) {
    return (
      ut$1(this.state),
      t2.strict && this.assertPersistenceCompatible(),
      {
        version: 1,
        state: At$2(this.state),
        patches: this.getPatches(),
        position: this.getPosition(),
        metadata: this.getMetadata(),
      }
    );
  }
  getMetadata() {
    const t2 = Pt$1(this.allMetadata, this.allPatches.patches.length);
    return (
      !this.isAutoArchiving() &&
        this.tempPatches.patches.length &&
        t2.push(mt$1(this.tempMetadata)),
      0 === this.maxHistory ? [] : t2.length > this.maxHistory ? t2.slice(-this.maxHistory) : t2
    );
  }
  getHistoryEntries() {
    return this.toEntries(this.getPatches(), this.getMetadata());
  }
  getControls() {
    if (this.controlsCache) return this.controlsCache;
    const t2 = this,
      e2 = {
        get position() {
          return t2.getPosition();
        },
        getHistory: () => t2.getHistory(),
        getHistorySnapshot: () => t2.getHistorySnapshot(),
        get patches() {
          return t2.getPatches();
        },
        back: (e3) => t2.back(e3),
        forward: (e3) => t2.forward(e3),
        reset: () => t2.reset(),
        go: (e3) => t2.go(e3),
        canBack: () => t2.canBack(),
        canForward: () => t2.canForward(),
        rebase: () => t2.rebase(),
      };
    return (
      this.autoArchive ||
        ((e2.archive = (e3) => t2.archive(e3)), (e2.canArchive = () => t2.canArchive())),
      (this.controlsCache = e2),
      e2
    );
  }
};
