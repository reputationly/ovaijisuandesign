// h.js
import { f$3, h$5, c$4, n$1, u$3 } from "../vendor.js";
import { D$6, I$4, apply, b$5, j$4, m$6 } from "./m.js";
function N$3(t2, e2, s2) {
  let a2;
  try {
    if (D$6(t2, t2)) {
      const e3 = structuredClone(t2);
      if (D$6(t2, e3)) return e3;
    }
  } catch (t3) {
    a2 = t3;
  }
  if (void 0 === e2 || void 0 === s2)
    throw ((t3) =>
      new b$5(
        "INVALID_HISTORY",
        "Travels: persisted history semantic validation graph could not be isolated.",
        {
          cause: t3,
        },
      ))(a2);
  throw j$4(e2, s2, "state clone failed.", a2);
}
const H$4 = (t2, e2 = new WeakSet()) => {
  if (null === t2 || "object" != typeof t2) return "function" != typeof t2;
  if (e2.has(t2)) return false;
  e2.add(t2);
  const s2 = Object.getPrototypeOf(t2);
  if (
    (Array.isArray(t2) && s2 !== Array.prototype) ||
    (!Array.isArray(t2) && s2 !== Object.prototype)
  )
    return false;
  for (const s3 of Reflect.ownKeys(t2)) {
    const a2 = Object.getOwnPropertyDescriptor(t2, s3);
    if (!a2 || !("value" in a2) || !H$4(a2.value, e2)) return false;
  }
  return true;
};
const k$5 = (e2, s2, a2, i2, r2) => {
  const o2 = "forward" === i2 ? s2.patches.patches[a2] : s2.patches.inversePatches[a2],
    h2 = n$1([o2], "forward" === i2 ? "forward" : "backward");
  try {
    return apply(e2, h2, r2);
  } catch (t2) {
    throw j$4(a2, i2, "patch replay failed.", t2);
  }
};
const L$6 = (t2, e2, s2, a2) => {
  try {
    if (D$6(t2, e2)) return;
  } catch (t3) {}
  throw j$4(s2, a2, "irreversible patches");
};
const $$7 = (t2, e2) =>
  "semantic" === e2.validation
    ? ((t3, e3 = {}) => {
        const s2 = t3.patches.patches.length,
          a2 = {
            strict: e3.strict,
            mark: e3.mark,
          },
          i2 = {
            state: t3.state,
            patches: t3.patches,
            metadata: t3.metadata,
          };
        if (0 === s2) return (N$3(i2), t3);
        let r2 = N$3(i2);
        const n2 =
          void 0 === e3.mark &&
          ((t4) => {
            if (!H$4(t4.state)) return false;
            for (const e4 of [t4.patches.patches, t4.patches.inversePatches])
              for (const t5 of e4)
                for (const e5 of t5) {
                  const t6 = Object.getOwnPropertyDescriptor(e5, "value");
                  if (!(void 0 === t6 || ("value" in t6 && H$4(t6.value)))) return false;
                }
            return true;
          })(r2);
        let o2 = false;
        for (const e4 of ["inverse", "forward"]) {
          const h2 = "forward" === e4,
            c3 = h2 ? "inverse" : "forward";
          let l2 = h2 ? t3.position : t3.position - 1;
          const p3 = h2 ? s2 : -1;
          if (l2 === p3) continue;
          (o2 && !n2 && (r2 = N$3(i2)), (o2 = true));
          let u4 = r2.state;
          for (; l2 !== p3; l2 += h2 ? 1 : -1) {
            const t4 = n2 ? u4 : N$3(u4, l2, c3),
              s3 = k$5(u4, r2, l2, e4, a2),
              i3 = k$5(n2 ? s3 : N$3(s3, l2, c3), r2, l2, c3, a2);
            (L$6(t4, i3, l2, c3), (u4 = s3));
          }
        }
        return t3;
      })(t2, e2.replayOptions)
    : t2;
const _$4 = (t2, e2) => {
  try {
    const s2 = null == t2 ? void 0 : t2(e2);
    f$3(s2, () => {});
  } catch (t3) {}
};
export const R$5 = (t2, e2 = {}) => {
  if (void 0 !== e2.validation && "semantic" !== e2.validation && "structural" !== e2.validation)
    throw new TypeError("Travels: validation must be either 'semantic' or 'structural'.");
  try {
    const s2 = ((t3) => {
      if ("string" != typeof t3) return t3;
      try {
        return JSON.parse(t3);
      } catch (t4) {
        throw new b$5("PARSE_ERROR", "Travels: persisted history is not valid JSON.", {
          cause: t4,
        });
      }
    })(t2);
    let a2 = s2;
    if (e2.migrate) {
      let t3;
      try {
        t3 = e2.migrate(s2);
      } catch (t4) {
        throw new b$5("MIGRATION_FAILED", "Travels: persisted history migration failed.", {
          cause: t4,
        });
      }
      a2 = m$6("migrate", t3);
    }
    return $$7(I$4(a2), e2);
  } catch (t3) {
    const s2 = ((t4) =>
      t4 instanceof b$5
        ? t4
        : new b$5("INVALID_SCHEMA", "Travels: persisted history could not be deserialized.", {
            cause: t4,
          }))(t3);
    if ((_$4(e2.onError, s2), void 0 === e2.fallback)) throw s2;
    try {
      return $$7(
        I$4(
          ((t4) => {
            const e3 = "function" == typeof t4 ? t4() : t4;
            return m$6("fallback", e3);
          })(e2.fallback),
        ),
        e2,
      );
    } catch (t4) {
      const s3 =
        t4 instanceof b$5 && "FALLBACK_FAILED" === t4.code
          ? t4
          : new b$5(
              "FALLBACK_FAILED",
              "Travels: persisted history fallback could not be deserialized.",
              {
                cause: t4,
              },
            );
      throw (_$4(e2.onError, s3), s3);
    }
  }
};
const x$7 = (t2) => void 0 !== t2 && "value" in t2;
const F$5 = (t2, e2) => x$7(t2) && !!t2.enumerable && (e2 || (!!t2.writable && !!t2.configurable));
export const B$6 = (t2, e2 = {}) => {
  var s2;
  const a2 = null !== (s2 = e2.maxIssues) && void 0 !== s2 ? s2 : 20,
    i2 = new WeakSet(),
    r2 = [],
    n2 = (t3, e3, s3) => {
      var i3;
      r2.length >= a2 ||
        r2.push({
          code: t3,
          path:
            ((i3 = e3),
            0 === i3.length
              ? "$"
              : i3.reduce(
                  (t4, e4) => ("number" == typeof e4 ? `${t4}[${e4}]` : `${t4}.${e4}`),
                  "$",
                )),
          message: s3,
        });
    },
    o2 = (t3, s3) => {
      if (r2.length >= a2) return;
      if (void 0 === t3)
        return void n2("UNDEFINED", s3, "use null; undefined is not durable data.");
      if ("function" == typeof t3)
        return void n2("FUNCTION", s3, "functions are not durable data.");
      if ("symbol" == typeof t3) return void n2("SYMBOL", s3, "symbols are not durable data.");
      if ("bigint" == typeof t3)
        return void n2("BIGINT", s3, "encode bigint as a string before JSON persistence.");
      if ("number" == typeof t3 && (!Number.isFinite(t3) || Object.is(t3, -0)))
        return void n2("NON_JSON_NUMBER", s3, "JSON does not preserve NaN, Infinity, or -0.");
      if (null === t3 || "object" != typeof t3) return;
      if (i2.has(t3))
        return void n2("CIRCULAR_REFERENCE", s3, "circular references are not durable data.");
      if ((i2.add(t3), t3 instanceof Date))
        return void n2("DATE", s3, "use a timestamp or ISO string for Date.");
      if (t3 instanceof WeakMap || t3 instanceof WeakSet)
        return void n2("WEAK_COLLECTION", s3, "WeakMap and WeakSet are not durable data.");
      const h2 = u$3(t3);
      if (h2)
        return void n2(
          "MAP_SET",
          s3,
          "Map" === h2
            ? "Map is unsupported; store entries in a plain object or dense array."
            : "Set is unsupported; store values in a dense array.",
        );
      if (
        ((t4) =>
          "undefined" != typeof Node && "object" == typeof t4 && null !== t4 && t4 instanceof Node)(
          t3,
        )
      )
        return void n2("DOM_NODE", s3, "DOM nodes and refs are not durable data.");
      if (Array.isArray(t3)) {
        const a3 = Object.getOwnPropertyDescriptors(t3),
          i3 = Reflect.ownKeys(a3);
        ((t4, e3, s4, a4) => {
          const i4 = a4 && Object.isFrozen(t4);
          return (
            Object.getPrototypeOf(t4) !== Array.prototype ||
            (!i4 && !Object.isExtensible(t4)) ||
            s4.length !== t4.length + 1 ||
            (!i4 && !e3.length.writable) ||
            s4.some((s5) => !("length" === s5 || (c$4(s5, t4.length) && F$5(e3[s5], i4))))
          );
        })(t3, a3, i3, true === e2.allowFrozen) &&
          n2("ARRAY_SHAPE", s3, "use a plain dense array with standard data properties.");
        for (const e3 of i3) {
          if (!c$4(e3, t3.length)) continue;
          const i4 = a3[e3];
          x$7(i4) && o2(i4.value, s3.concat(Number(e3)));
        }
        return;
      }
      if (Object.getPrototypeOf(t3) !== Object.prototype)
        return void n2(
          "CLASS_INSTANCE",
          s3,
          "class instances and custom prototypes are not durable data.",
        );
      const l2 = Object.getOwnPropertyDescriptors(t3),
        p3 = Reflect.ownKeys(l2);
      ((t4, e3, s4, a3) => {
        const i3 = a3 && Object.isFrozen(t4);
        return (
          (!i3 && !Object.isExtensible(t4)) ||
          s4.some((t5) => "string" == typeof t5 && !F$5(e3[t5], i3))
        );
      })(t3, l2, p3, true === e2.allowFrozen) &&
        n2("OBJECT_SHAPE", s3, "use a plain object with standard data properties.");
      for (const t4 of p3) {
        if ("symbol" == typeof t4) {
          n2("SYMBOL", s3, "symbol keys are not durable data.");
          continue;
        }
        const e3 = l2[t4];
        x$7(e3) && o2(e3.value, s3.concat(t4));
      }
    };
  return (o2(t2, []), r2);
};
export let W$6 = class W extends Error {
  constructor(t2, e2, s2 = {}) {
    (super(e2), (this.name = "TravelsError"), (this.code = t2), (this.cause = s2.cause));
  }
};
export let V$5 = class V extends TypeError {
  constructor(t2, e2, s2 = {}) {
    (super(e2), (this.name = "TravelsTypeError"), (this.code = t2), (this.cause = s2.cause));
  }
};
const U$5 = new WeakSet();
export let z$6 = class z {
  constructor(t2) {
    ((this.listeners = new Set()),
      (this.publishing = false),
      (this.devtools = t2.devtools),
      (this.onObserverError = t2.onObserverError),
      (this.onWarning = t2.onWarning));
  }
  get isPublishing() {
    return this.publishing;
  }
  publish(t2) {
    const e2 = !this.publishing;
    e2 && (this.publishing = true);
    try {
      t2();
    } finally {
      e2 && (this.publishing = false);
    }
  }
  warn(t2, e2) {
    if (this.onWarning) {
      const s2 = () =>
        this.invoke("onWarning", () => {
          var s3;
          return null === (s3 = this.onWarning) || void 0 === s3
            ? void 0
            : s3.call(this, {
                code: t2,
                message: e2,
              });
        });
      return void (this.publishing ? s2() : this.publish(s2));
    }
  }
  reportError(t2, e2) {
    if (!this.onObserverError) return;
    const s2 = () => {
      var s3;
      try {
        const a2 =
          null === (s3 = this.onObserverError) || void 0 === s3
            ? void 0
            : s3.call(this, {
                source: t2,
                error: e2,
              });
        f$3(a2, () => {});
      } catch (t3) {}
    };
    this.publishing ? s2() : this.publish(s2);
  }
  invoke(t2, e2) {
    let s2;
    try {
      s2 = e2();
    } catch (e3) {
      return void this.reportError(t2, e3);
    }
    f$3(s2, (e3) => this.reportError(t2, e3));
  }
  subscribe(t2) {
    return (
      t2.length > 1 &&
        !U$5.has(t2) &&
        (U$5.add(t2),
        this.warn(
          "LEGACY_SUBSCRIBER",
          "Travels: subscribe listeners receive a single TravelsEvent object. Replace positional (state, patches, position, historyLength) parameters with event destructuring.",
        )),
      this.listeners.add(t2),
      () => {
        this.listeners.delete(t2);
      }
    );
  }
  snapshot() {
    return {
      listeners: Array.from(this.listeners),
      devtools: this.devtools,
    };
  }
};
export let J$5 = class J {
  constructor() {
    this.stateJournal = [];
  }
  get journalLength() {
    return this.stateJournal.length;
  }
  recordMutableChange(t2, e2, s2) {
    t2 > 0 &&
      s2.length > 0 &&
      this.stateJournal.push({
        state: e2,
        inversePatches: s2,
      });
  }
  rollbackTo(e2) {
    for (let s2 = this.stateJournal.length - 1; s2 >= e2; s2 -= 1) {
      const e3 = this.stateJournal[s2];
      apply(e3.state, e3.inversePatches, {
        mutable: true,
      });
    }
    this.stateJournal.length = e2;
  }
  truncateTo(t2) {
    this.stateJournal.length = t2;
  }
};
export const K$5 = (t2) => {
  if ("function" == typeof globalThis.structuredClone)
    try {
      return globalThis.structuredClone(t2);
    } catch (t3) {
      return;
    }
};
export const Y$3 = (t2, e2 = new WeakMap()) => {
  if (null === t2 || "object" != typeof t2) return t2;
  if (e2.has(t2)) return e2.get(t2);
  if (Array.isArray(t2)) {
    const s3 = new Array(t2.length);
    e2.set(t2, s3);
    for (let a3 = 0; a3 < t2.length; a3 += 1)
      Object.prototype.hasOwnProperty.call(t2, a3) && (s3[a3] = Y$3(t2[a3], e2));
    return s3;
  }
  if (t2 instanceof Date) {
    const s3 = new Date(t2.getTime());
    return (e2.set(t2, s3), s3);
  }
  const s2 = K$5(t2);
  if (void 0 !== s2) return (e2.set(t2, s2), s2);
  if (!h$5(t2) && null !== Object.getPrototypeOf(t2)) return t2;
  const a2 = {};
  e2.set(t2, a2);
  for (const s3 in t2) Object.prototype.hasOwnProperty.call(t2, s3) && (a2[s3] = Y$3(t2[s3], e2));
  return a2;
};
const G$4 = (t2, e2) =>
  new V$5(
    "UNCLONEABLE_PATCH_VALUE",
    `Travels: patch value at ${t2} cannot be safely detached. Use plain data or a value whose structured clone preserves its runtime type.`,
    {
      cause: e2,
    },
  );
const q$4 = (t2, e2, s2, a2, i2 = new Set()) => {
  let r2;
  try {
    r2 = Reflect.ownKeys(t2);
  } catch (t3) {
    throw G$4(a2, t3);
  }
  for (const n2 of r2) {
    if (i2.has(n2)) continue;
    let r3;
    try {
      r3 = Object.getOwnPropertyDescriptor(t2, n2);
    } catch (t3) {
      throw G$4(`${a2}.${String(n2)}`, t3);
    }
    if (!r3 || !("value" in r3)) throw G$4(`${a2}.${String(n2)}`);
    try {
      Object.defineProperty(
        e2,
        n2,
        Object.assign(Object.assign({}, r3), {
          value: Z$3(r3.value, s2, `${a2}.${String(n2)}`),
        }),
      );
    } catch (t3) {
      if (t3 instanceof V$5) throw t3;
      throw G$4(`${a2}.${String(n2)}`, t3);
    }
  }
};
const Q$5 = (t2, e2) => {
  try {
    return Object.getPrototypeOf(t2);
  } catch (t3) {
    throw G$4(e2, t3);
  }
};
const X$5 = (t2, e2, s2) => {
  try {
    if (Object.isExtensible(t2)) return;
    Object.isFrozen(t2)
      ? Object.freeze(e2)
      : Object.isSealed(t2)
        ? Object.seal(e2)
        : Object.preventExtensions(e2);
  } catch (t3) {
    throw G$4(s2, t3);
  }
};
const Z$3 = (t2, e2, s2) => {
  if ("function" == typeof t2) throw G$4(s2);
  if (null === t2 || "object" != typeof t2) return t2;
  if (e2.has(t2)) return e2.get(t2);
  if (Array.isArray(t2)) {
    if (Q$5(t2, s2) !== Array.prototype) throw G$4(s2);
    const a3 = new Array(t2.length);
    (e2.set(t2, a3), q$4(t2, a3, e2, s2, new Set(["length"])));
    const i2 = Object.getOwnPropertyDescriptor(t2, "length");
    return (
      i2 &&
        "value" in i2 &&
        Object.defineProperty(
          a3,
          "length",
          Object.assign(Object.assign({}, i2), {
            value: t2.length,
          }),
        ),
      X$5(t2, a3, s2),
      a3
    );
  }
  if (t2 instanceof Date) {
    if (Q$5(t2, s2) !== Date.prototype) throw G$4(s2);
    const a3 = new Date(t2.getTime());
    return (e2.set(t2, a3), q$4(t2, a3, e2, s2), X$5(t2, a3, s2), a3);
  }
  const a2 = Q$5(t2, s2);
  if (h$5(t2) || null === a2) {
    const i2 = Object.create(a2);
    return (e2.set(t2, i2), q$4(t2, i2, e2, s2), X$5(t2, i2, s2), i2);
  }
  throw G$4(s2);
};
export const tt$3 = (t2) => {
  const e2 = new Array(t2.length),
    s2 = new WeakMap();
  for (let a3 = 0; a3 < t2.length; a3 += 1) {
    const i2 = t2[a3],
      r2 = {
        op: i2.op,
        path: Array.isArray(i2.path) ? [...i2.path] : i2.path,
      };
    (Object.prototype.hasOwnProperty.call(i2, "value") &&
      (r2.value = Z$3(i2.value, s2, `operation[${a3}].value`)),
      (e2[a3] = r2));
  }
  const a2 = et$3.get(t2);
  return (a2 && et$3.set(e2, a2), e2);
};
const et$3 = new WeakMap();
export const st$2 = (t2) => {
  let e2 = et$3.get(t2);
  return (e2 || ((e2 = {}), et$3.set(t2, e2)), e2);
};
export const at$2 = (t2, e2 = {}) => {
  et$3.set(t2, e2);
};
export const it$2 = (t2) => {
  const e2 = new Array(t2.length);
  for (let s3 = 0; s3 < t2.length; s3 += 1) {
    const a2 = t2[s3],
      i2 = {
        op: a2.op,
        path: Array.isArray(a2.path) ? [...a2.path] : a2.path,
      };
    (Object.prototype.hasOwnProperty.call(a2, "value") && (i2.value = Y$3(a2.value)),
      (e2[s3] = i2));
  }
  const s2 = et$3.get(t2);
  return (s2 && et$3.set(e2, s2), e2);
};
export const rt$2 = (t2, e2) => (e2 ? it$2(t2) : t2);
export const nt$3 = (t2) => {
  const e2 = new Array(t2.length);
  for (let s2 = 0; s2 < t2.length; s2 += 1) e2[s2] = it$2(t2[s2]);
  return e2;
};
export const ot$2 = (t2) => ({
  patches: t2 ? nt$3(t2.patches) : [],
  inversePatches: t2 ? nt$3(t2.inversePatches) : [],
});
export const ht$1 = (t2, e2) =>
  0 === t2.length && 0 === e2.length
    ? ot$2()
    : {
        patches: [t2],
        inversePatches: [e2],
      };
