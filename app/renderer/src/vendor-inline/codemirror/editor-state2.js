// editor-state2.js
import { CompartmentInstance, ensureAddr, getAddr, resolveTransaction, StateEffect, asArray$1, allowMultipleSelections, EditorSelection, ChangeSet, Text, DefaultSplit, StateField, checkSelection, readOnly, languageData, makeCategorizer, findClusterBreak, CharCategory, Facet, lineSeparator, changeFilter, transactionFilter, transactionExtender } from "../../vendor.js";
import { Configuration2, types } from "../../text-editor/annotation-highlight.js";
export class Compartment {
  /**
  Create an instance of this compartment to add to your [state
  configuration](https://codemirror.net/6/docs/ref/#state.EditorStateConfig.extensions).
  */
  of(ext) {
    return new CompartmentInstance(this, ext);
  }
  /**
  Create an [effect](https://codemirror.net/6/docs/ref/#state.TransactionSpec.effects) that
  reconfigures this compartment.
  */
  reconfigure(content2) {
    return Compartment.reconfigure.of({
      compartment: this,
      extension: content2,
    });
  }
  /**
  Get the current content of the compartment in the state, or
  `undefined` if it isn't present.
  */
  get(state2) {
    return state2.config.compartments.get(this);
  }
}
export class EditorState2 {
  constructor(config2, doc2, selection2, values3, computeSlot, tr2) {
    this.config = config2;
    this.doc = doc2;
    this.selection = selection2;
    this.values = values3;
    this.status = config2.statusTemplate.slice();
    this.computeSlot = computeSlot;
    if (tr2) tr2._state = this;
    for (let i2 = 0; i2 < this.config.dynamicSlots.length; i2++) ensureAddr(this, i2 << 1);
    this.computeSlot = null;
  }
  field(field, require2 = true) {
    let addr = this.config.address[field.id];
    if (addr == null) {
      if (require2) throw new RangeError("Field is not present in this state");
      return void 0;
    }
    ensureAddr(this, addr);
    return getAddr(this, addr);
  }
  /**
  Create a [transaction](https://codemirror.net/6/docs/ref/#state.Transaction) that updates this
  state. Any number of [transaction specs](https://codemirror.net/6/docs/ref/#state.TransactionSpec)
  can be passed. Unless
  [`sequential`](https://codemirror.net/6/docs/ref/#state.TransactionSpec.sequential) is set, the
  [changes](https://codemirror.net/6/docs/ref/#state.TransactionSpec.changes) (if any) of each spec
  are assumed to start in the _current_ document (not the document
  produced by previous specs), and its
  [selection](https://codemirror.net/6/docs/ref/#state.TransactionSpec.selection) and
  [effects](https://codemirror.net/6/docs/ref/#state.TransactionSpec.effects) are assumed to refer
  to the document created by its _own_ changes. The resulting
  transaction contains the combined effect of all the different
  specs. For [selection](https://codemirror.net/6/docs/ref/#state.TransactionSpec.selection), later
  specs take precedence over earlier ones.
  */
  update(...specs) {
    return resolveTransaction(this, specs, true);
  }
  /**
  @internal
  */
  applyTransaction(tr2) {
    let conf = this.config,
      { base: base2, compartments } = conf;
    for (let effect2 of tr2.effects) {
      if (effect2.is(Compartment.reconfigure)) {
        if (conf) {
          compartments = new Map();
          conf.compartments.forEach((val, key2) => compartments.set(key2, val));
          conf = null;
        }
        compartments.set(effect2.value.compartment, effect2.value.extension);
      } else if (effect2.is(StateEffect.reconfigure)) {
        conf = null;
        base2 = effect2.value;
      } else if (effect2.is(StateEffect.appendConfig)) {
        conf = null;
        base2 = asArray$1(base2).concat(effect2.value);
      }
    }
    let startValues;
    if (!conf) {
      conf = Configuration2.resolve(base2, compartments, this);
      let intermediateState = new EditorState2(
        conf,
        this.doc,
        this.selection,
        conf.dynamicSlots.map(() => null),
        (state2, slot) => slot.reconfigure(state2, this),
        null,
      );
      startValues = intermediateState.values;
    } else {
      startValues = tr2.startState.values.slice();
    }
    let selection2 = tr2.startState.facet(allowMultipleSelections)
      ? tr2.newSelection
      : tr2.newSelection.asSingle();
    new EditorState2(
      conf,
      tr2.newDoc,
      selection2,
      startValues,
      (state2, slot) => slot.update(state2, tr2),
      tr2,
    );
  }
  /**
  Create a [transaction spec](https://codemirror.net/6/docs/ref/#state.TransactionSpec) that
  replaces every selection range with the given content.
  */
  replaceSelection(text2) {
    if (typeof text2 == "string") text2 = this.toText(text2);
    return this.changeByRange((range2) => ({
      changes: {
        from: range2.from,
        to: range2.to,
        insert: text2,
      },
      range: EditorSelection.cursor(range2.from + text2.length),
    }));
  }
  /**
  Create a set of changes and a new selection by running the given
  function for each range in the active selection. The function
  can return an optional set of changes (in the coordinate space
  of the start document), plus an updated range (in the coordinate
  space of the document produced by the call's own changes). This
  method will merge all the changes and ranges into a single
  changeset and selection, and return it as a [transaction
  spec](https://codemirror.net/6/docs/ref/#state.TransactionSpec), which can be passed to
  [`update`](https://codemirror.net/6/docs/ref/#state.EditorState.update).
  */
  changeByRange(f2) {
    let sel = this.selection;
    let result1 = f2(sel.ranges[0]);
    let changes = this.changes(result1.changes),
      ranges = [result1.range];
    let effects = asArray$1(result1.effects);
    for (let i2 = 1; i2 < sel.ranges.length; i2++) {
      let result = f2(sel.ranges[i2]);
      let newChanges = this.changes(result.changes),
        newMapped = newChanges.map(changes);
      for (let j2 = 0; j2 < i2; j2++) ranges[j2] = ranges[j2].map(newMapped);
      let mapBy = changes.mapDesc(newChanges, true);
      ranges.push(result.range.map(mapBy));
      changes = changes.compose(newMapped);
      effects = StateEffect.mapEffects(effects, newMapped).concat(
        StateEffect.mapEffects(asArray$1(result.effects), mapBy),
      );
    }
    return {
      changes,
      selection: EditorSelection.create(ranges, sel.mainIndex),
      effects,
    };
  }
  /**
  Create a [change set](https://codemirror.net/6/docs/ref/#state.ChangeSet) from the given change
  description, taking the state's document length and line
  separator into account.
  */
  changes(spec = []) {
    if (spec instanceof ChangeSet) return spec;
    return ChangeSet.of(spec, this.doc.length, this.facet(EditorState2.lineSeparator));
  }
  /**
  Using the state's [line
  separator](https://codemirror.net/6/docs/ref/#state.EditorState^lineSeparator), create a
  [`Text`](https://codemirror.net/6/docs/ref/#state.Text) instance from the given string.
  */
  toText(string2) {
    return Text.of(string2.split(this.facet(EditorState2.lineSeparator) || DefaultSplit));
  }
  /**
  Return the given range of the document as a string.
  */
  sliceDoc(from2 = 0, to = this.doc.length) {
    return this.doc.sliceString(from2, to, this.lineBreak);
  }
  /**
  Get the value of a state [facet](https://codemirror.net/6/docs/ref/#state.Facet).
  */
  facet(facet) {
    let addr = this.config.address[facet.id];
    if (addr == null) return facet.default;
    ensureAddr(this, addr);
    return getAddr(this, addr);
  }
  /**
  Convert this state to a JSON-serializable object. When custom
  fields should be serialized, you can pass them in as an object
  mapping property names (in the resulting object, which should
  not use `doc` or `selection`) to fields.
  */
  toJSON(fields) {
    let result = {
      doc: this.sliceDoc(),
      selection: this.selection.toJSON(),
    };
    if (fields)
      for (let prop in fields) {
        let value = fields[prop];
        if (value instanceof StateField && this.config.address[value.id] != null)
          result[prop] = value.spec.toJSON(this.field(fields[prop]), this);
      }
    return result;
  }
  /**
  Deserialize a state from its JSON representation. When custom
  fields should be deserialized, pass the same object you passed
  to [`toJSON`](https://codemirror.net/6/docs/ref/#state.EditorState.toJSON) when serializing as
  third argument.
  */
  static fromJSON(json2, config2 = {}, fields) {
    if (!json2 || typeof json2.doc != "string")
      throw new RangeError("Invalid JSON representation for EditorState");
    let fieldInit = [];
    if (fields)
      for (let prop in fields) {
        if (Object.prototype.hasOwnProperty.call(json2, prop)) {
          let field = fields[prop],
            value = json2[prop];
          fieldInit.push(field.init((state2) => field.spec.fromJSON(value, state2)));
        }
      }
    return EditorState2.create({
      doc: json2.doc,
      selection: EditorSelection.fromJSON(json2.selection),
      extensions: config2.extensions ? fieldInit.concat([config2.extensions]) : fieldInit,
    });
  }
  /**
  Create a new state. You'll usually only need this when
  initializing an editor—updated states are created by applying
  transactions.
  */
  static create(config2 = {}) {
    let configuration = Configuration2.resolve(config2.extensions || [], new Map());
    let doc2 =
      config2.doc instanceof Text
        ? config2.doc
        : Text.of(
            (config2.doc || "").split(
              configuration.staticFacet(EditorState2.lineSeparator) || DefaultSplit,
            ),
          );
    let selection2 = !config2.selection
      ? EditorSelection.single(0)
      : config2.selection instanceof EditorSelection
        ? config2.selection
        : EditorSelection.single(config2.selection.anchor, config2.selection.head);
    checkSelection(selection2, doc2.length);
    if (!configuration.staticFacet(allowMultipleSelections)) selection2 = selection2.asSingle();
    return new EditorState2(
      configuration,
      doc2,
      selection2,
      configuration.dynamicSlots.map(() => null),
      (state2, slot) => slot.create(state2),
      null,
    );
  }
  /**
  The size (in columns) of a tab in the document, determined by
  the [`tabSize`](https://codemirror.net/6/docs/ref/#state.EditorState^tabSize) facet.
  */
  get tabSize() {
    return this.facet(EditorState2.tabSize);
  }
  /**
  Get the proper [line-break](https://codemirror.net/6/docs/ref/#state.EditorState^lineSeparator)
  string for this state.
  */
  get lineBreak() {
    return this.facet(EditorState2.lineSeparator) || "\n";
  }
  /**
  Returns true when the editor is
  [configured](https://codemirror.net/6/docs/ref/#state.EditorState^readOnly) to be read-only.
  */
  get readOnly() {
    return this.facet(readOnly);
  }
  /**
  Look up a translation for the given phrase (via the
  [`phrases`](https://codemirror.net/6/docs/ref/#state.EditorState^phrases) facet), or return the
  original string if no translation is found.
  
  If additional arguments are passed, they will be inserted in
  place of markers like `$1` (for the first value) and `$2`, etc.
  A single `$` is equivalent to `$1`, and `$$` will produce a
  literal dollar sign.
  */
  phrase(phrase2, ...insert2) {
    for (let map3 of this.facet(EditorState2.phrases))
      if (Object.prototype.hasOwnProperty.call(map3, phrase2)) {
        phrase2 = map3[phrase2];
        break;
      }
    if (insert2.length)
      phrase2 = phrase2.replace(/\$(\$|\d*)/g, (m3, i2) => {
        if (i2 == "$") return "$";
        let n2 = +(i2 || 1);
        return !n2 || n2 > insert2.length ? m3 : insert2[n2 - 1];
      });
    return phrase2;
  }
  /**
  Find the values for a given language data field, provided by the
  the [`languageData`](https://codemirror.net/6/docs/ref/#state.EditorState^languageData) facet.
  
  Examples of language data fields are...
  
  - [`"commentTokens"`](https://codemirror.net/6/docs/ref/#commands.CommentTokens) for specifying
    comment syntax.
  - [`"autocomplete"`](https://codemirror.net/6/docs/ref/#autocomplete.autocompletion^config.override)
    for providing language-specific completion sources.
  - [`"wordChars"`](https://codemirror.net/6/docs/ref/#state.EditorState.charCategorizer) for adding
    characters that should be considered part of words in this
    language.
  - [`"closeBrackets"`](https://codemirror.net/6/docs/ref/#autocomplete.CloseBracketConfig) controls
    bracket closing behavior.
  */
  languageDataAt(name2, pos, side = -1) {
    let values3 = [];
    for (let provider of this.facet(languageData)) {
      for (let result of provider(this, pos, side)) {
        if (Object.prototype.hasOwnProperty.call(result, name2)) values3.push(result[name2]);
      }
    }
    return values3;
  }
  /**
  Return a function that can categorize strings (expected to
  represent a single [grapheme cluster](https://codemirror.net/6/docs/ref/#state.findClusterBreak))
  into one of:
  
   - Word (contains an alphanumeric character or a character
     explicitly listed in the local language's `"wordChars"`
     language data, which should be a string)
   - Space (contains only whitespace)
   - Other (anything else)
  */
  charCategorizer(at2) {
    let chars2 = this.languageDataAt("wordChars", at2);
    return makeCategorizer(chars2.length ? chars2[0] : "");
  }
  /**
  Find the word at the given position, meaning the range
  containing all [word](https://codemirror.net/6/docs/ref/#state.CharCategory.Word) characters
  around it. If no word characters are adjacent to the position,
  this returns null.
  */
  wordAt(pos) {
    let { text: text2, from: from2, length: length2 } = this.doc.lineAt(pos);
    let cat = this.charCategorizer(pos);
    let start2 = pos - from2,
      end2 = pos - from2;
    while (start2 > 0) {
      let prev = findClusterBreak(text2, start2, false);
      if (cat(text2.slice(prev, start2)) != CharCategory.Word) break;
      start2 = prev;
    }
    while (end2 < length2) {
      let next2 = findClusterBreak(text2, end2);
      if (cat(text2.slice(end2, next2)) != CharCategory.Word) break;
      end2 = next2;
    }
    return start2 == end2 ? null : EditorSelection.range(start2 + from2, end2 + from2);
  }
}
EditorState2.allowMultipleSelections = allowMultipleSelections;
EditorState2.tabSize = Facet.define({
  combine: (values3) => (values3.length ? values3[0] : 4),
});
EditorState2.lineSeparator = lineSeparator;
EditorState2.readOnly = readOnly;
EditorState2.phrases = Facet.define({
  compare(a2, b3) {
    let kA = Object.keys(a2),
      kB = Object.keys(b3);
    return kA.length == kB.length && kA.every((k2) => a2[k2] == b3[k2]);
  },
});
EditorState2.languageData = languageData;
EditorState2.changeFilter = changeFilter;
EditorState2.transactionFilter = transactionFilter;
EditorState2.transactionExtender = transactionExtender;
Compartment.reconfigure = StateEffect.define();
const Brackets = Object.create(null);
const BracketStack = [];
for (let p3 of ["()", "[]", "{}"]) {
  let l2 = p3.charCodeAt(0),
    r2 = p3.charCodeAt(1);
  Brackets[l2] = r2;
  Brackets[r2] = -l2;
}
export function processBracketPairs(line, rFrom, rTo, isolates, outerType) {
  let oppositeType = outerType == 1 ? 2 : 1;
  for (let iI = 0, sI = 0, context = 0; iI <= isolates.length; iI++) {
    let from2 = iI ? isolates[iI - 1].to : rFrom,
      to = iI < isolates.length ? isolates[iI].from : rTo;
    for (let i2 = from2, ch, br, type2; i2 < to; i2++) {
      if ((br = Brackets[(ch = line.charCodeAt(i2))])) {
        if (br < 0) {
          for (let sJ = sI - 3; sJ >= 0; sJ -= 3) {
            if (BracketStack[sJ + 1] == -br) {
              let flags = BracketStack[sJ + 2];
              let type3 =
                flags & 2 ? outerType : !(flags & 4) ? 0 : flags & 1 ? oppositeType : outerType;
              if (type3) types[i2] = types[BracketStack[sJ]] = type3;
              sI = sJ;
              break;
            }
          }
        } else if (BracketStack.length == 189) {
          break;
        } else {
          BracketStack[sI++] = i2;
          BracketStack[sI++] = ch;
          BracketStack[sI++] = context;
        }
      } else if ((type2 = types[i2]) == 2 || type2 == 1) {
        let embed = type2 == outerType;
        context = embed ? 0 : 1;
        for (let sJ = sI - 3; sJ >= 0; sJ -= 3) {
          let cur = BracketStack[sJ + 2];
          if (cur & 2) break;
          if (embed) {
            BracketStack[sJ + 2] |= 2;
          } else {
            if (cur & 4) break;
            BracketStack[sJ + 2] |= 4;
          }
        }
      }
    }
  }
}
