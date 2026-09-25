var ConsoleApiName = {
  log: "log",
  debug: "debug",
  info: "info",
  warn: "warn",
  error: "error"
};
var globalConsole = console;
var originalConsoleMethods = {};
Object.keys(ConsoleApiName).forEach(function(name) {
  originalConsoleMethods[name] = globalConsole[name] || noop;
});
var PREFIX = "GUANCE Browser SDK:";
var display = {
  debug: originalConsoleMethods.debug.bind(globalConsole, PREFIX),
  log: originalConsoleMethods.log.bind(globalConsole, PREFIX),
  info: originalConsoleMethods.info.bind(globalConsole, PREFIX),
  warn: originalConsoleMethods.warn.bind(globalConsole, PREFIX),
  error: originalConsoleMethods.error.bind(globalConsole, PREFIX)
};
var onMonitorErrorCollected;
var debugMode = false;
function startMonitorErrorCollection(newOnMonitorErrorCollected) {
  onMonitorErrorCollected = newOnMonitorErrorCollected;
}
function setDebugMode(newDebugMode) {
  debugMode = newDebugMode;
}
function monitor(fn) {
  return function() {
    return callMonitored(fn, this, arguments);
  };
}
function callMonitored(fn, context, args) {
  try {
    return fn.apply(context, args);
  } catch (e) {
    monitorError(e);
  }
}
function monitorError(e) {
  displayIfDebugEnabled(e);
  if (onMonitorErrorCollected) {
    try {
      onMonitorErrorCollected(e);
    } catch (e2) {
      displayIfDebugEnabled(e2);
    }
  }
}
function displayIfDebugEnabled() {
  var args = [].slice.call(arguments);
  if (debugMode) {
    display.error.apply(null, ["[MONITOR]"].concat(args));
  }
}
function catchUserErrors(fn, errorMsg) {
  return function() {
    var args = [].slice.call(arguments);
    try {
      return fn.apply(this, args);
    } catch (err) {
      display.error(errorMsg, err);
    }
  };
}
function _typeof$g(o) {
  "@babel/helpers - typeof";
  return _typeof$g = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(o2) {
    return typeof o2;
  } : function(o2) {
    return o2 && "function" == typeof Symbol && o2.constructor === Symbol && o2 !== Symbol.prototype ? "symbol" : typeof o2;
  }, _typeof$g(o);
}
function makePublicApi(stub) {
  var publicApi = assign({
    onReady: function onReady(callback) {
      callback();
    }
  }, stub);
  Object.defineProperty(publicApi, "_setDebug", {
    get: function get() {
      return setDebugMode;
    },
    enumerable: false
  });
  return publicApi;
}
function defineGlobal(global, name, api) {
  var existingGlobalVariable = global[name];
  global[name] = api;
  if (existingGlobalVariable && existingGlobalVariable.q) {
    each(existingGlobalVariable.q, function(fn) {
      catchUserErrors(fn, "onReady callback threw an error:")();
    });
  }
}
function getGlobalObject() {
  if ((typeof globalThis === "undefined" ? "undefined" : _typeof$g(globalThis)) === "object") {
    return globalThis;
  }
  Object.defineProperty(Object.prototype, "_gc_temp_", {
    get: function get() {
      return this;
    },
    configurable: true
  });
  var globalObject = _gc_temp_;
  delete Object.prototype._gc_temp_;
  if (_typeof$g(globalObject) !== "object") {
    if ((typeof self === "undefined" ? "undefined" : _typeof$g(self)) === "object") {
      globalObject = self;
    } else if ((typeof window === "undefined" ? "undefined" : _typeof$g(window)) === "object") {
      globalObject = window;
    } else {
      globalObject = {};
    }
  }
  return globalObject;
}
function getZoneJsOriginalValue(target, name) {
  var browserWindow = getGlobalObject();
  var original;
  if (browserWindow.Zone && typeof browserWindow.Zone.__symbol__ === "function") {
    original = target[browserWindow.Zone.__symbol__(name)];
  }
  if (!original) {
    original = target[name];
  }
  return original;
}
function setTimeout$1(callback, delay) {
  return getZoneJsOriginalValue(getGlobalObject(), "setTimeout")(monitor(callback), delay);
}
function clearTimeout$1(timeoutId) {
  getZoneJsOriginalValue(getGlobalObject(), "clearTimeout")(timeoutId);
}
function setInterval(callback, delay) {
  return getZoneJsOriginalValue(getGlobalObject(), "setInterval")(monitor(callback), delay);
}
function clearInterval(timeoutId) {
  getZoneJsOriginalValue(getGlobalObject(), "clearInterval")(timeoutId);
}
function _typeof$f(o) {
  "@babel/helpers - typeof";
  return _typeof$f = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(o2) {
    return typeof o2;
  } : function(o2) {
    return o2 && "function" == typeof Symbol && o2.constructor === Symbol && o2 !== Symbol.prototype ? "symbol" : typeof o2;
  }, _typeof$f(o);
}
var ArrayProto = Array.prototype;
var ObjProto = Object.prototype;
var slice = ArrayProto.slice;
var toString = ObjProto.toString;
var hasOwnProperty = ObjProto.hasOwnProperty;
var nativeForEach = ArrayProto.forEach;
var nativeIsArray = Array.isArray;
var breaker = false;
var each = function each2(obj, iterator, context) {
  if (obj === null) return false;
  if (nativeForEach && obj.forEach === nativeForEach) {
    obj.forEach(iterator, context);
  } else if (obj.length === +obj.length) {
    for (var i = 0, l = obj.length; i < l; i++) {
      if (i in obj && iterator.call(context, obj[i], i, obj) === breaker) {
        return false;
      }
    }
  } else {
    for (var key in obj) {
      if (hasOwnProperty.call(obj, key)) {
        if (iterator.call(context, obj[key], key, obj) === breaker) {
          return false;
        }
      }
    }
  }
};
function assign(target) {
  each(slice.call(arguments, 1), function(source) {
    for (var prop in source) {
      if (Object.prototype.hasOwnProperty.call(source, prop)) {
        target[prop] = source[prop];
      }
    }
  });
  return target;
}
function shallowClone(object) {
  return assign({}, object);
}
var extend = function extend2(obj) {
  each(slice.call(arguments, 1), function(source) {
    for (var prop in source) {
      if (source[prop] !== void 0) {
        obj[prop] = source[prop];
      }
    }
  });
  return obj;
};
var extend2Lev = function extend2Lev2(obj) {
  each(slice.call(arguments, 1), function(source) {
    for (var prop in source) {
      if (source[prop] !== void 0) {
        if (isObject(source[prop]) && isObject(obj[prop])) {
          extend(obj[prop], source[prop]);
        } else {
          obj[prop] = source[prop];
        }
      }
    }
  });
  return obj;
};
var isArray = nativeIsArray || function(obj) {
  return toString.call(obj) === "[object Array]";
};
var isFunction = function isFunction2(f) {
  if (!f) {
    return false;
  }
  try {
    return /^\s*\bfunction\b/.test(f);
  } catch (err) {
    return false;
  }
};
var isArguments = function isArguments2(obj) {
  return !!(obj && hasOwnProperty.call(obj, "callee"));
};
var toArray = function toArray2(iterable) {
  if (!iterable) return [];
  if (iterable.toArray) {
    return iterable.toArray();
  }
  if (isArray(iterable)) {
    return slice.call(iterable);
  }
  if (isArguments(iterable)) {
    return slice.call(iterable);
  }
  return values(iterable);
};
var values = function values2(obj) {
  var results = [];
  if (obj === null) {
    return results;
  }
  each(obj, function(value) {
    results[results.length] = value;
  });
  return results;
};
var keys = function keys2(obj) {
  var results = [];
  if (obj === null) {
    return results;
  }
  each(obj, function(value, key) {
    results[results.length] = key;
  });
  return results;
};
var filter = function filter2(arr, fn, self2) {
  if (arr.filter) {
    return arr.filter(fn);
  }
  var ret = [];
  for (var i = 0; i < arr.length; i++) {
    if (!hasOwnProperty.call(arr, i)) {
      continue;
    }
    var val = arr[i];
    if (fn.call(self2, val, i, arr)) {
      ret.push(val);
    }
  }
  return ret;
};
var map = function map2(arr, fn, self2) {
  if (arr.map) {
    return arr.map(fn);
  }
  var ret = [];
  for (var i = 0; i < arr.length; i++) {
    if (!hasOwnProperty.call(arr, i)) {
      continue;
    }
    var val = arr[i];
    ret.push(fn.call(self2, val, i, arr));
  }
  return ret;
};
var some = function some2(arr, fn, self2) {
  if (arr.some) {
    return arr.some(fn);
  }
  var flag = false;
  for (var i = 0; i < arr.length; i++) {
    if (!hasOwnProperty.call(arr, i)) {
      continue;
    }
    var val = arr[i];
    if (fn.call(self2, val, i, arr)) {
      flag = true;
      break;
    }
  }
  return flag;
};
var every = function every2(arr, fn, self2) {
  if (arr.every) {
    return arr.every(fn);
  }
  var flag = true;
  for (var i = 0; i < arr.length; i++) {
    if (!hasOwnProperty.call(arr, i)) {
      continue;
    }
    var val = arr[i];
    if (!fn.call(self2, val, i, arr)) {
      flag = false;
      break;
    }
  }
  return flag;
};
var matchList = function matchList2(list, value, useStartsWith) {
  if (useStartsWith === void 0) {
    useStartsWith = false;
  }
  return some(list, function(item) {
    try {
      if (typeof item === "function") {
        return item(value);
      } else if (item instanceof RegExp) {
        return item.test(value);
      } else if (typeof item === "string") {
        return useStartsWith ? startsWith(value, item) : item === value;
      }
    } catch (e) {
      display.error(e);
    }
    return false;
  });
};
var cssEscape = function cssEscape2(str) {
  str = str + "";
  if (window.CSS && window.CSS.escape) {
    return window.CSS.escape(str);
  }
  return str.replace(/([\0-\x1f\x7f]|^-?\d)|^-$|[^\x80-\uFFFF\w-]/g, function(ch, asCodePoint) {
    if (asCodePoint) {
      if (ch === "\0") {
        return "�";
      }
      return ch.slice(0, -1) + "\\" + ch.charCodeAt(ch.length - 1).toString(16) + " ";
    }
    return "\\" + ch;
  });
};
var isObject = function isObject2(obj) {
  if (obj === null) return false;
  return toString.call(obj) === "[object Object]";
};
var isEmptyObject = function isEmptyObject2(obj) {
  if (isObject(obj)) {
    for (var key in obj) {
      if (hasOwnProperty.call(obj, key)) {
        return false;
      }
    }
    return true;
  } else {
    return false;
  }
};
var objectEntries = function objectEntries2(object) {
  var res = [];
  each(object, function(value, key) {
    res.push([key, value]);
  });
  return res;
};
var isString = function isString2(obj) {
  return toString.call(obj) === "[object String]";
};
var isBoolean = function isBoolean2(obj) {
  return toString.call(obj) === "[object Boolean]";
};
var isNumber = function isNumber2(obj) {
  return toString.call(obj) === "[object Number]" && /[\d\.]+/.test(String(obj));
};
var throttle = function throttle2(fn, wait, options) {
  var needLeadingExecution = options && options.leading !== void 0 ? options.leading : true;
  var needTrailingExecution = options && options.trailing !== void 0 ? options.trailing : true;
  var inWaitPeriod = false;
  var pendingExecutionWithParameters;
  var pendingTimeoutId;
  var context = this;
  return {
    throttled: function throttled() {
      if (inWaitPeriod) {
        pendingExecutionWithParameters = arguments;
        return;
      }
      if (needLeadingExecution) {
        fn.apply(context, arguments);
      } else {
        pendingExecutionWithParameters = arguments;
      }
      inWaitPeriod = true;
      pendingTimeoutId = setTimeout$1(function() {
        if (needTrailingExecution && pendingExecutionWithParameters) {
          fn.apply(context, pendingExecutionWithParameters);
        }
        inWaitPeriod = false;
        pendingExecutionWithParameters = void 0;
      }, wait);
    },
    cancel: function cancel() {
      clearTimeout$1(pendingTimeoutId);
      inWaitPeriod = false;
      pendingExecutionWithParameters = void 0;
    }
  };
};
var utf8Encode = function utf8Encode2(string) {
  string = (string + "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  var utftext = "", start, end;
  var stringl = 0, n;
  start = end = 0;
  stringl = string.length;
  for (n = 0; n < stringl; n++) {
    var c1 = string.charCodeAt(n);
    var enc = null;
    if (c1 < 128) {
      end++;
    } else if (c1 > 127 && c1 < 2048) {
      enc = String.fromCharCode(c1 >> 6 | 192, c1 & 63 | 128);
    } else {
      enc = String.fromCharCode(c1 >> 12 | 224, c1 >> 6 & 63 | 128, c1 & 63 | 128);
    }
    if (enc !== null) {
      if (end > start) {
        utftext += string.substring(start, end);
      }
      utftext += enc;
      start = end = n + 1;
    }
  }
  if (end > start) {
    utftext += string.substring(start, string.length);
  }
  return utftext;
};
var base64Encode = function base64Encode2(data) {
  if (typeof btoa === "function") {
    return btoa(encodeURIComponent(data).replace(/%([0-9A-F]{2})/g, function(match, p1) {
      return String.fromCharCode("0x" + p1);
    }));
  }
  data = String(data);
  var b64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  var o1, o2, o3, h1, h2, h3, h4, bits, i = 0, ac = 0, enc = "", tmp_arr = [];
  if (!data) {
    return data;
  }
  data = utf8Encode(data);
  do {
    o1 = data.charCodeAt(i++);
    o2 = data.charCodeAt(i++);
    o3 = data.charCodeAt(i++);
    bits = o1 << 16 | o2 << 8 | o3;
    h1 = bits >> 18 & 63;
    h2 = bits >> 12 & 63;
    h3 = bits >> 6 & 63;
    h4 = bits & 63;
    tmp_arr[ac++] = b64.charAt(h1) + b64.charAt(h2) + b64.charAt(h3) + b64.charAt(h4);
  } while (i < data.length);
  enc = tmp_arr.join("");
  switch (data.length % 3) {
    case 1:
      enc = enc.slice(0, -2) + "==";
      break;
    case 2:
      enc = enc.slice(0, -1) + "=";
      break;
  }
  return enc;
};
function UUID(placeholder) {
  return placeholder ? (
    // eslint-disable-next-line  no-bitwise
    (parseInt(placeholder, 10) ^ Math.random() * 16 >> parseInt(placeholder, 10) / 4).toString(16)
  ) : "".concat(1e7, "-", 1e3, "-", 4e3, "-", 8e3, "-", 1e11).replace(/[018]/g, UUID);
}
function replaceNumberCharByPath(path) {
  var pathGroup = "";
  if (path) {
    pathGroup = path.replace(/\/([^\/]*)\d([^\/]*)/g, "/?").replace(/\/$/g, "");
  }
  return pathGroup || "/";
}
var urlParse = function urlParse2(para) {
  var URLParser = function URLParser2(a) {
    this._fields = {
      Username: 4,
      Password: 5,
      Port: 7,
      Protocol: 2,
      Host: 6,
      Path: 8,
      URL: 0,
      QueryString: 9,
      Fragment: 10
    };
    this._values = {};
    this._regex = null;
    this._regex = /^((\w+):\/\/)?((\w+):?(\w+)?@)?([^\/\?:]+):?(\d+)?(\/?[^\?#]+)?\??([^#]+)?#?(\w*)/;
    if (typeof a != "undefined") {
      this._parse(a);
    }
  };
  URLParser.prototype.setUrl = function(a) {
    this._parse(a);
  };
  URLParser.prototype._initValues = function() {
    for (var a in this._fields) {
      this._values[a] = "";
    }
  };
  URLParser.prototype.addQueryString = function(queryObj) {
    if (_typeof$f(queryObj) !== "object") {
      return false;
    }
    var query = this._values.QueryString || "";
    for (var i in queryObj) {
      if (new RegExp(i + "[^&]+").test(query)) {
        query = query.replace(new RegExp(i + "[^&]+"), i + "=" + queryObj[i]);
      } else {
        if (query.slice(-1) === "&") {
          query = query + i + "=" + queryObj[i];
        } else {
          if (query === "") {
            query = i + "=" + queryObj[i];
          } else {
            query = query + "&" + i + "=" + queryObj[i];
          }
        }
      }
    }
    this._values.QueryString = query;
  };
  URLParser.prototype.getParse = function() {
    return this._values;
  };
  URLParser.prototype.getUrl = function() {
    var url = "";
    url += this._values.Origin;
    url += this._values.Path;
    url += this._values.QueryString ? "?" + this._values.QueryString : "";
    return url;
  };
  URLParser.prototype._parse = function(a) {
    this._initValues();
    var b = this._regex.exec(a);
    if (!b) {
      throw "DPURLParser::_parse -> Invalid URL";
    }
    for (var c in this._fields) {
      if (typeof b[this._fields[c]] != "undefined") {
        this._values[c] = b[this._fields[c]];
      }
    }
    this._values["Path"] = this._values["Path"] || "/";
    this._values["Hostname"] = this._values["Host"].replace(/:\d+$/, "");
    this._values["Origin"] = this._values["Protocol"] + "://" + this._values["Hostname"] + (this._values.Port ? ":" + this._values.Port : "");
  };
  return new URLParser(para);
};
function elementMatches(element, selector) {
  if (element.matches) {
    return element.matches(selector);
  }
  if (element.msMatchesSelector) {
    return element.msMatchesSelector(selector);
  }
  return false;
}
var getQueryParamsFromUrl = function getQueryParamsFromUrl2(url) {
  var result = {};
  var arr = url.split("?");
  var queryString = arr[1] || "";
  if (queryString) {
    result = getURLSearchParams("?" + queryString);
  }
  return result;
};
var getURLSearchParams = function getURLSearchParams2(queryString) {
  queryString = queryString || "";
  var decodeParam = function decodeParam2(str) {
    return decodeURIComponent(str);
  };
  var args = {};
  var query = queryString.substring(1);
  var pairs = query.split("&");
  for (var i = 0; i < pairs.length; i++) {
    var pos = pairs[i].indexOf("=");
    if (pos === -1) continue;
    var name = pairs[i].substring(0, pos);
    var value = pairs[i].substring(pos + 1);
    name = decodeParam(name);
    value = decodeParam(value);
    args[name] = value;
  }
  return args;
};
function createCircularReferenceChecker() {
  if (typeof WeakSet !== "undefined") {
    var set = /* @__PURE__ */ new WeakSet();
    return {
      hasAlreadyBeenSeen: function hasAlreadyBeenSeen(value) {
        var has = set.has(value);
        if (!has) {
          set.add(value);
        }
        return has;
      }
    };
  }
  var array = [];
  return {
    hasAlreadyBeenSeen: function hasAlreadyBeenSeen(value) {
      var has = array.indexOf(value) >= 0;
      if (!has) {
        array.push(value);
      }
      return has;
    }
  };
}
function getType(value) {
  if (value === null) {
    return "null";
  }
  if (Array.isArray(value)) {
    return "array";
  }
  return _typeof$f(value);
}
function mergeInto(destination, source, circularReferenceChecker) {
  if (typeof circularReferenceChecker === "undefined") {
    circularReferenceChecker = createCircularReferenceChecker();
  }
  if (source === void 0) {
    return destination;
  }
  if (_typeof$f(source) !== "object" || source === null) {
    return source;
  } else if (source instanceof Date) {
    return new Date(source.getTime());
  } else if (source instanceof RegExp) {
    var flags = source.flags || // old browsers compatibility
    [source.global ? "g" : "", source.ignoreCase ? "i" : "", source.multiline ? "m" : "", source.sticky ? "y" : "", source.unicode ? "u" : ""].join("");
    return new RegExp(source.source, flags);
  }
  if (circularReferenceChecker.hasAlreadyBeenSeen(source)) {
    return void 0;
  } else if (Array.isArray(source)) {
    var merged = Array.isArray(destination) ? destination : [];
    for (var i = 0; i < source.length; ++i) {
      merged[i] = mergeInto(merged[i], source[i], circularReferenceChecker);
    }
    return merged;
  }
  var merged = getType(destination) === "object" ? destination : {};
  for (var key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      merged[key] = mergeInto(merged[key], source[key], circularReferenceChecker);
    }
  }
  return merged;
}
function deepClone(value) {
  return mergeInto(void 0, value);
}
function getStatusGroup(status) {
  if (!status) return status === 0 ? void 0 : status;
  return String(status).substr(0, 1) + String(status).substr(1).replace(/\d*/g, "x");
}
function noop() {
}
var ONE_SECOND = 1e3;
var ONE_MINUTE = 60 * ONE_SECOND;
var ONE_HOUR = 60 * ONE_MINUTE;
var ONE_DAY = 24 * ONE_HOUR;
var ONE_YEAR = 365 * ONE_DAY;
function performDraw(threshold) {
  return threshold !== 0 && Math.random() * 100 <= threshold;
}
function round(num, decimals) {
  return +num.toFixed(decimals);
}
function msToNs(duration) {
  if (typeof duration !== "number") {
    return duration;
  }
  return round(duration * 1e6, 0);
}
function mapValues(object, fn) {
  var newObject = {};
  each(object, function(value, key) {
    newObject[key] = fn(value);
  });
  return newObject;
}
function toServerDuration(duration) {
  if (!isNumber(duration)) {
    return duration;
  }
  return round(duration * 1e6, 0);
}
function getRelativeTime(timestamp) {
  return timestamp - getNavigationStart();
}
function preferredNow() {
  return relativeNow();
}
function getTimestamp(relativeTime) {
  return Math.round(getNavigationStart() + relativeTime);
}
function relativeNow() {
  return performance.now();
}
function clocksNow() {
  return {
    relative: relativeNow(),
    timeStamp: timeStampNow()
  };
}
function timeStampNow() {
  return dateNow();
}
function looksLikeRelativeTime(time) {
  return time < ONE_YEAR;
}
function dateNow() {
  return (/* @__PURE__ */ new Date()).getTime();
}
function elapsed(start, end) {
  return end - start;
}
function clocksOrigin() {
  return {
    relative: 0,
    timeStamp: getNavigationStart()
  };
}
function relativeToClocks(relative) {
  return {
    relative,
    timeStamp: getCorrectedTimeStamp(relative)
  };
}
function currentDrift() {
  return Math.round(dateNow() - (getNavigationStart() + performance.now()));
}
function addDuration(a, b) {
  return a + b;
}
function getCorrectedTimeStamp(relativeTime) {
  var correctedOrigin = dateNow() - performance.now();
  if (correctedOrigin > getNavigationStart()) {
    return Math.round(correctedOrigin + relativeTime);
  }
  return getTimestamp(relativeTime);
}
var navigationStart;
function getNavigationStart() {
  if (navigationStart === void 0) {
    navigationStart = performance.timing.navigationStart;
  }
  return navigationStart;
}
var COMMA_SEPARATED_KEY_VALUE = /([\w-]+)\s*=\s*([^;]+)/g;
function findCommaSeparatedValue(rawString, name) {
  COMMA_SEPARATED_KEY_VALUE.lastIndex = 0;
  while (true) {
    var match = COMMA_SEPARATED_KEY_VALUE.exec(rawString);
    if (match) {
      if (match[1] === name) {
        return match[2];
      }
    } else {
      break;
    }
  }
}
function findByPath(source, path) {
  var pathArr = path.split(".");
  while (pathArr.length) {
    var key = pathArr.shift();
    if (source && isObject(source) && key in source && hasOwnProperty.call(source, key)) {
      source = source[key];
    } else {
      return void 0;
    }
  }
  return source;
}
function safeTruncate(candidate, length) {
  var lastChar = candidate.charCodeAt(length - 1);
  if (lastChar >= 55296 && lastChar <= 56319) {
    return candidate.slice(0, length + 1);
  }
  return candidate.slice(0, length);
}
function isMatchOption(item) {
  var itemType = getType(item);
  return itemType === "string" || itemType === "function" || item instanceof RegExp;
}
function includes(candidate, search) {
  return candidate.indexOf(search) !== -1;
}
function find(array, predicate) {
  for (var i = 0; i < array.length; i += 1) {
    var item = array[i];
    if (predicate(item, i, array)) {
      return item;
    }
  }
  return void 0;
}
function arrayFrom(arrayLike) {
  if (Array.from) {
    return Array.from(arrayLike);
  }
  var array = [];
  if (arrayLike instanceof Set) {
    arrayLike.forEach(function(item) {
      array.push(item);
    });
  } else {
    for (var i = 0; i < arrayLike.length; i++) {
      array.push(arrayLike[i]);
    }
  }
  return array;
}
function findLast(array, predicate) {
  for (var i = array.length - 1; i >= 0; i -= 1) {
    var item = array[i];
    if (predicate(item, i, array)) {
      return item;
    }
  }
  return void 0;
}
function isPercentage(value) {
  return isNumber(value) && value >= 0 && value <= 100;
}
function getLocationOrigin() {
  return getLinkElementOrigin(window.location);
}
var Browser = {
  IE: 0,
  CHROMIUM: 1,
  SAFARI: 2,
  OTHER: 3
};
function isIE() {
  return detectBrowserCached() === Browser.IE;
}
function isChromium() {
  return detectBrowserCached() === Browser.CHROMIUM;
}
function isSafari() {
  return detectBrowserCached() === Browser.SAFARI;
}
var browserCache;
function detectBrowserCached() {
  return isNullUndefinedDefaultValue(browserCache, browserCache = detectBrowser());
}
function detectBrowser(browserWindow) {
  var _browserWindow, _browserWindow$naviga;
  if (typeof browserWindow === "undefined") {
    browserWindow = window || {};
  }
  var userAgent2 = ((_browserWindow = browserWindow) === null || _browserWindow === void 0 || (_browserWindow = _browserWindow.navigator) === null || _browserWindow === void 0 ? void 0 : _browserWindow.userAgent) || "";
  if (browserWindow.chrome || /HeadlessChrome/.test(userAgent2)) {
    return Browser.CHROMIUM;
  }
  if (
    // navigator.vendor is deprecated, but it is the most resilient way we found to detect
    // "Apple maintained browsers" (AKA Safari). If one day it gets removed, we still have the
    // useragent test as a semi-working fallback.
    ((_browserWindow$naviga = browserWindow.navigator.vendor) === null || _browserWindow$naviga === void 0 ? void 0 : _browserWindow$naviga.indexOf("Apple")) === 0 || /safari/i.test(userAgent2) && !/chrome|android/i.test(userAgent2)
  ) {
    return Browser.SAFARI;
  }
  if (browserWindow.document.documentMode) {
    return Browser.IE;
  }
  return Browser.OTHER;
}
function getLinkElementOrigin(element) {
  if (element.origin && element.origin !== "null") {
    return element.origin;
  }
  var sanitizedHost = element.host.replace(/(:80|:443)$/, "");
  return element.protocol + "//" + sanitizedHost;
}
function withSnakeCaseKeys(candidate) {
  var result = {};
  each(candidate, function(value, key) {
    result[toSnakeCase(key)] = deepSnakeCase(value);
  });
  return result;
}
function deepSnakeCase(candidate) {
  if (isArray(candidate)) {
    return map(candidate, function(value) {
      return deepSnakeCase(value);
    });
  }
  if (_typeof$f(candidate) === "object" && candidate !== null) {
    return withSnakeCaseKeys(candidate);
  }
  return candidate;
}
function toSnakeCase(word) {
  return word.replace(/[A-Z]/g, function(uppercaseLetter, index) {
    return (index !== 0 ? "_" : "") + uppercaseLetter.toLowerCase();
  }).replace(/-/g, "_");
}
function isNullUndefinedDefaultValue(data, defaultValue) {
  if (data !== null && data !== void 0) {
    return data;
  } else {
    return defaultValue;
  }
}
function objectHasValue(object, value) {
  return some(keys(object), function(key) {
    return object[key] === value;
  });
}
function startsWith(candidate, search) {
  return candidate.slice(0, search.length) === search;
}
function removeItem(array, item) {
  var index = array.indexOf(item);
  if (index >= 0) {
    array.splice(index, 1);
  }
}
function tryToClone(response) {
  try {
    return response.clone();
  } catch (e) {
    return;
  }
}
function isHashAnAnchor(hash) {
  var correspondingId = hash.substr(1);
  if (!correspondingId) return false;
  return !!document.getElementById(correspondingId);
}
function getPathFromHash(hash) {
  var index = hash.indexOf("?");
  return index < 0 ? hash : hash.slice(0, index);
}
function discardNegativeDuration(duration) {
  return isNumber(duration) && duration < 0 ? void 0 : duration;
}
var BUFFER_LIMIT = 500;
function createBoundedBuffer() {
  var buffer = [];
  var add = function add2(callback) {
    var length = buffer.push(callback);
    if (length > BUFFER_LIMIT) {
      buffer.splice(0, 1);
    }
  };
  var remove = function remove2(callback) {
    removeItem(buffer, callback);
  };
  var drain = function drain2(arg) {
    buffer.forEach(function(callback) {
      callback(arg);
    });
    buffer.length = 0;
  };
  return {
    add,
    remove,
    drain
  };
}
var END_OF_TIMES = Infinity;
var CLEAR_OLD_VALUES_INTERVAL = ONE_MINUTE;
var cleanupHistoriesInterval = null;
var cleanupTasks = /* @__PURE__ */ new Set();
function createValueHistory(params) {
  var expireDelay = params.expireDelay;
  var maxEntries = params.maxEntries;
  var entries = [];
  if (cleanupHistoriesInterval === null) {
    cleanupHistoriesInterval = setInterval(function() {
      return clearExpiredValues();
    }, CLEAR_OLD_VALUES_INTERVAL);
  }
  function clearExpiredValues() {
    var oldTimeThreshold = relativeNow() - expireDelay;
    while (entries.length > 0 && entries[entries.length - 1].endTime < oldTimeThreshold) {
      entries.pop();
    }
  }
  cleanupTasks.add(clearExpiredValues);
  function add(value, startTime) {
    var entry = {
      value,
      startTime,
      endTime: END_OF_TIMES,
      remove: function remove() {
        removeItem(entries, entry);
      },
      close: function close(endTime2) {
        entry.endTime = endTime2;
      }
    };
    if (maxEntries && entries.length >= maxEntries) {
      entries.pop();
    }
    entries.unshift(entry);
    return entry;
  }
  function find2(startTime, options) {
    if (typeof startTime === "undefined") {
      startTime = END_OF_TIMES;
    }
    if (typeof options === "undefined") {
      options = {
        returnInactive: false
      };
    }
    for (var _i = 0, entries_1 = entries; _i < entries_1.length; _i++) {
      var entry = entries_1[_i];
      if (entry.startTime <= startTime) {
        if (options.returnInactive || startTime <= entry.endTime) {
          return entry.value;
        }
        break;
      }
    }
  }
  function closeActive(endTime2) {
    var latestEntry = entries[0];
    if (latestEntry && latestEntry.endTime === END_OF_TIMES) {
      latestEntry.close(endTime2);
    }
  }
  function findAll(startTime, duration) {
    if (startTime === void 0) {
      startTime = END_OF_TIMES;
    }
    if (duration === void 0) {
      duration = 0;
    }
    var endTime2 = addDuration(startTime, duration);
    return entries.filter(function(entry) {
      return entry.startTime <= endTime2 && startTime <= entry.endTime;
    }).map(function(entry) {
      return entry.value;
    });
  }
  function reset() {
    entries = [];
  }
  function stop() {
    cleanupTasks["delete"](clearExpiredValues);
    if (cleanupTasks.size === 0 && cleanupHistoriesInterval) {
      clearInterval(cleanupHistoriesInterval);
      cleanupHistoriesInterval = null;
    }
  }
  return {
    add,
    find: find2,
    closeActive,
    findAll,
    reset,
    stop
  };
}
function getBrowserWindow() {
  return typeof window !== "undefined" ? window : void 0;
}
function getNavigator() {
  var browserWindow = getBrowserWindow();
  return browserWindow && typeof browserWindow.navigator !== "undefined" ? browserWindow.navigator : {};
}
function getUserAgent() {
  return getNavigator().userAgent || "";
}
function getTarget(target, context) {
  return target || context || {};
}
var VariableLibrary = {
  infoMap: {
    engine: ["WebKit", "Trident", "Gecko", "Presto"],
    browser: ["Safari", "Chrome", "Edge", "IE", "IE 11", "IE 10", "IE 9", "IE 8", "IE 7", "Firefox", "Firefox Focus", "Chromium", "Opera", "Vivaldi", "Yandex", "Arora", "Lunascape", "QupZilla", "Coc Coc", "Kindle", "Iceweasel", "Konqueror", "Iceape", "SeaMonkey", "Epiphany", "360", "360SE", "360EE", "UC", "QQBrowser", "QQ", "Baidu", "Maxthon", "Sogou", "LBBROWSER", "2345Explorer", "TheWorld", "XiaoMi", "Quark", "Qiyu", "Wechat", "WechatWork", "Taobao", "Alipay", "Weibo", "Douban", "Suning", "iQiYi"],
    os: ["Windows", "Linux", "Mac OS", "Android", "HarmonyOS", "Ubuntu", "FreeBSD", "Debian", "iOS", "Windows Phone", "BlackBerry", "MeeGo", "Symbian", "Chrome OS", "WebOS"],
    device: ["Mobile", "Tablet", "iPad"]
  }
};
var MethodLibrary = {
  getMatchMap: monitor(function(u) {
    return {
      Trident: u.indexOf("Trident") > -1 || u.indexOf("NET CLR") > -1,
      Presto: u.indexOf("Presto") > -1,
      WebKit: u.indexOf("AppleWebKit") > -1,
      Gecko: u.indexOf("Gecko/") > -1,
      Safari: u.indexOf("Safari") > -1,
      Chrome: u.indexOf("Chrome") > -1 || u.indexOf("CriOS") > -1,
      IE: u.indexOf("MSIE") > -1 || u.indexOf("Trident") > -1,
      Edge: u.indexOf("Edge") > -1 || u.indexOf("Edg") > -1,
      Firefox: u.indexOf("Firefox") > -1 || u.indexOf("FxiOS") > -1,
      "Firefox Focus": u.indexOf("Focus") > -1,
      Chromium: u.indexOf("Chromium") > -1,
      Opera: u.indexOf("Opera") > -1 || u.indexOf("OPR") > -1,
      Vivaldi: u.indexOf("Vivaldi") > -1,
      Yandex: u.indexOf("YaBrowser") > -1,
      Arora: u.indexOf("Arora") > -1,
      Lunascape: u.indexOf("Lunascape") > -1,
      QupZilla: u.indexOf("QupZilla") > -1,
      "Coc Coc": u.indexOf("coc_coc_browser") > -1,
      Kindle: u.indexOf("Kindle") > -1 || u.indexOf("Silk/") > -1,
      Iceweasel: u.indexOf("Iceweasel") > -1,
      Konqueror: u.indexOf("Konqueror") > -1,
      Iceape: u.indexOf("Iceape") > -1,
      SeaMonkey: u.indexOf("SeaMonkey") > -1,
      Epiphany: u.indexOf("Epiphany") > -1,
      360: u.indexOf("QihooBrowser") > -1 || u.indexOf("QHBrowser") > -1,
      "360EE": u.indexOf("360EE") > -1,
      "360SE": u.indexOf("360SE") > -1,
      UC: u.indexOf("UC") > -1 || u.indexOf(" UBrowser") > -1,
      QQBrowser: u.indexOf("QQBrowser") > -1,
      QQ: u.indexOf("QQ/") > -1,
      Baidu: u.indexOf("Baidu") > -1 || u.indexOf("BIDUBrowser") > -1,
      Maxthon: u.indexOf("Maxthon") > -1,
      Sogou: u.indexOf("MetaSr") > -1 || u.indexOf("Sogou") > -1,
      LBBROWSER: u.indexOf("LBBROWSER") > -1,
      "2345Explorer": u.indexOf("2345Explorer") > -1,
      TheWorld: u.indexOf("TheWorld") > -1,
      XiaoMi: u.indexOf("MiuiBrowser") > -1,
      Quark: u.indexOf("Quark") > -1,
      Qiyu: u.indexOf("Qiyu") > -1,
      Wechat: u.indexOf("MicroMessenger") > -1,
      Taobao: u.indexOf("AliApp(TB") > -1,
      Alipay: u.indexOf("AliApp(AP") > -1,
      Weibo: u.indexOf("Weibo") > -1,
      Douban: u.indexOf("com.douban.frodo") > -1,
      Suning: u.indexOf("SNEBUY-APP") > -1,
      iQiYi: u.indexOf("IqiyiApp") > -1,
      Windows: u.indexOf("Windows") > -1,
      Linux: u.indexOf("Linux") > -1 || u.indexOf("X11") > -1,
      "Mac OS": u.indexOf("Macintosh") > -1,
      Android: u.indexOf("Android") > -1 || u.indexOf("Adr") > -1,
      HarmonyOS: u.indexOf("HarmonyOS") > -1 || u.indexOf("OpenHarmony") > -1 || u.indexOf("HMOS") > -1,
      Ubuntu: u.indexOf("Ubuntu") > -1,
      FreeBSD: u.indexOf("FreeBSD") > -1,
      Debian: u.indexOf("Debian") > -1,
      "Windows Phone": u.indexOf("IEMobile") > -1 || u.indexOf("Windows Phone") > -1,
      BlackBerry: u.indexOf("BlackBerry") > -1 || u.indexOf("RIM") > -1,
      MeeGo: u.indexOf("MeeGo") > -1,
      Symbian: u.indexOf("Symbian") > -1,
      iOS: u.indexOf("like Mac OS X") > -1,
      "Chrome OS": u.indexOf("CrOS") > -1,
      WebOS: u.indexOf("hpwOS") > -1,
      Mobile: u.indexOf("Mobi") > -1 || u.indexOf("iPh") > -1 || u.indexOf("480") > -1,
      Tablet: u.indexOf("Tablet") > -1 || u.indexOf("Nexus 7") > -1,
      iPad: u.indexOf("iPad") > -1
    };
  }),
  matchInfoMap: monitor(function(target) {
    var _this = getTarget(target, this);
    var u = getUserAgent();
    var match = MethodLibrary.getMatchMap(u);
    for (var s in VariableLibrary.infoMap) {
      for (var i = 0; i < VariableLibrary.infoMap[s].length; i++) {
        var value = VariableLibrary.infoMap[s][i];
        if (match[value]) {
          _this[s] = value;
        }
      }
    }
  }),
  getOS: monitor(function(target) {
    var _this = getTarget(target, this);
    _this.os = "";
    MethodLibrary.matchInfoMap(_this);
    return _this.os || "Unknown";
  }),
  getOSVersion: monitor(function(target) {
    var _this = getTarget(target, this);
    var u = getUserAgent();
    _this.osVersion = "";
    _this.osMajor = "";
    var osVersion = {
      Windows: function Windows() {
        var v = u.replace(/^.*Windows NT ([\d.]+);.*$/, "$1");
        var oldWindowsVersionMap = {
          6.4: "10",
          6.3: "8.1",
          6.2: "8",
          6.1: "7",
          "6.0": "Vista",
          5.2: "XP",
          5.1: "XP",
          "5.0": "2000"
        };
        return oldWindowsVersionMap[v] || v;
      },
      Android: function Android() {
        return u.replace(/^.*Android ([\d.]+);.*$/, "$1");
      },
      HarmonyOS: function HarmonyOS() {
        return u.replace(/^.*(?:HarmonyOS|OpenHarmony)[\/\s]([\d.]+).*$/, "$1").replace(/^.*HMOS[\s\/]([\d.]+).*$/, "$1");
      },
      iOS: function iOS() {
        return u.replace(/^.*OS ([\d_]+) like.*$/, "$1").replace(/_/g, ".");
      },
      Debian: function Debian() {
        return u.replace(/^.*Debian\/([\d.]+).*$/, "$1");
      },
      "Windows Phone": function Windows_Phone() {
        return u.replace(/^.*Windows Phone( OS)? ([\d.]+);.*$/, "$2");
      },
      "Mac OS": function Mac_OS() {
        return u.replace(/^.*Mac OS X ([\d_]+).*$/, "$1").replace(/_/g, ".");
      },
      WebOS: function WebOS() {
        return u.replace(/^.*hpwOS\/([\d.]+);.*$/, "$1");
      }
    };
    if (osVersion[_this.os]) {
      _this.osVersion = osVersion[_this.os]();
      if (_this.osVersion === u) {
        _this.osVersion = "";
      }
    }
    if (_this.osVersion) {
      _this.osMajor = _this.osVersion.split(".").length && _this.osVersion.split(".")[0];
    }
    return {
      version: _this.osVersion,
      osMajor: _this.osMajor
    };
  }),
  getDeviceType: monitor(function(target) {
    var _this = getTarget(target, this);
    _this.device = "PC";
    MethodLibrary.matchInfoMap(_this);
    return _this.device;
  }),
  getNetwork: monitor(function() {
    var browserWindow = getBrowserWindow();
    if (!browserWindow || !browserWindow.navigator) {
      return "unknown";
    }
    var connection = browserWindow.navigator.connection || browserWindow.navigator.mozConnection || browserWindow.navigator.webkitConnection;
    var result = "unknown";
    var type = connection ? connection.type || connection.effectiveType : null;
    if (type && typeof type === "string") {
      switch (type) {
        // possible type values
        case "bluetooth":
        case "cellular":
          result = "cellular";
          break;
        case "none":
          result = "none";
          break;
        case "ethernet":
        case "wifi":
        case "wimax":
          result = "wifi";
          break;
        case "other":
        case "unknown":
          result = "unknown";
          break;
        // possible effectiveType values
        case "slow-2g":
        case "2g":
        case "3g":
          result = "cellular";
          break;
        case "4g":
          result = "wifi";
          break;
      }
    }
    return result;
  }),
  getLanguage: monitor(function(target) {
    var _this = getTarget(target, this);
    _this.language = (function() {
      var navigator2 = getNavigator();
      var language = navigator2.browserLanguage || navigator2.language || "";
      var arr = language.split("-");
      if (arr[1]) {
        arr[1] = arr[1].toUpperCase();
      }
      return arr.join("_");
    })();
    return _this.language;
  }),
  getTimeZone: monitor(function() {
    try {
      var intl = new Intl.DateTimeFormat();
      return intl.resolvedOptions().timeZone;
    } catch (_unused) {
      return void 0;
    }
  }),
  getBrowserInfo: monitor(function(target) {
    var _this = getTarget(target, this);
    _this.engine = "";
    _this.browser = "";
    MethodLibrary.matchInfoMap(_this);
    var browserWindow = getBrowserWindow();
    var navigator2 = getNavigator();
    var u = getUserAgent();
    var _mime = function _mime2(option, value) {
      var mimeTypes = navigator2.mimeTypes;
      if (!mimeTypes) {
        return false;
      }
      for (var key in mimeTypes) {
        if (mimeTypes[key][option] == value) {
          return true;
        }
      }
      return false;
    };
    var match = MethodLibrary.getMatchMap(u);
    var is360 = false;
    if (browserWindow && browserWindow.chrome) {
      var chrome_version = u.replace(/^.*Chrome\/([\d]+).*$/, "$1");
      if (chrome_version > 36 && browserWindow.showModalDialog) {
        is360 = true;
      } else if (chrome_version > 45) {
        is360 = _mime("type", "application/vnd.chromium.remoting-viewer");
      }
    }
    if (match["Baidu"] && match["Opera"]) {
      match["Baidu"] = false;
    }
    if (match["Mobile"]) {
      match["Mobile"] = !(u.indexOf("iPad") > -1);
    }
    if (is360) {
      if (_mime("type", "application/gameplugin")) {
        match["360SE"] = true;
      } else if (navigator2 && navigator2.connection && typeof navigator2["connection"]["saveData"] == "undefined") {
        match["360SE"] = true;
      } else {
        match["360EE"] = true;
      }
    }
    if (browserWindow && (match["IE"] || match["Edge"])) {
      var navigator_top = browserWindow.screenTop - browserWindow.screenY;
      switch (navigator_top) {
        case 71:
          break;
        case 74:
          break;
        case 99:
          break;
        case 102:
          match["360EE"] = true;
          break;
        case 75:
          break;
        case 74:
          break;
        case 105:
          break;
        case 104:
          match["360SE"] = true;
          break;
      }
    }
    var browerVersionMap = {
      Safari: function Safari() {
        return u.replace(/^.*Version\/([\d.]+).*$/, "$1");
      },
      Chrome: function Chrome() {
        return u.replace(/^.*Chrome\/([\d.]+).*$/, "$1").replace(/^.*CriOS\/([\d.]+).*$/, "$1");
      },
      IE: function IE() {
        return u.replace(/^.*MSIE ([\d.]+).*$/, "$1").replace(/^.*rv:([\d.]+).*$/, "$1");
      },
      Edge: function Edge() {
        return u.replace(/^.*Edge?\/([\d.]+).*$/, "$1");
      },
      Firefox: function Firefox() {
        return u.replace(/^.*Firefox\/([\d.]+).*$/, "$1").replace(/^.*FxiOS\/([\d.]+).*$/, "$1");
      },
      "Firefox Focus": function Firefox_Focus() {
        return u.replace(/^.*Focus\/([\d.]+).*$/, "$1");
      },
      Chromium: function Chromium() {
        return u.replace(/^.*Chromium\/([\d.]+).*$/, "$1");
      },
      Opera: function Opera() {
        return u.replace(/^.*Opera\/([\d.]+).*$/, "$1").replace(/^.*OPR\/([\d.]+).*$/, "$1");
      },
      Vivaldi: function Vivaldi() {
        return u.replace(/^.*Vivaldi\/([\d.]+).*$/, "$1");
      },
      Yandex: function Yandex() {
        return u.replace(/^.*YaBrowser\/([\d.]+).*$/, "$1");
      },
      Arora: function Arora() {
        return u.replace(/^.*Arora\/([\d.]+).*$/, "$1");
      },
      Lunascape: function Lunascape() {
        return u.replace(/^.*Lunascape[\/\s]([\d.]+).*$/, "$1");
      },
      QupZilla: function QupZilla() {
        return u.replace(/^.*QupZilla[\/\s]([\d.]+).*$/, "$1");
      },
      "Coc Coc": function Coc_Coc() {
        return u.replace(/^.*coc_coc_browser\/([\d.]+).*$/, "$1");
      },
      Kindle: function Kindle() {
        return u.replace(/^.*Version\/([\d.]+).*$/, "$1");
      },
      Iceweasel: function Iceweasel() {
        return u.replace(/^.*Iceweasel\/([\d.]+).*$/, "$1");
      },
      Konqueror: function Konqueror() {
        return u.replace(/^.*Konqueror\/([\d.]+).*$/, "$1");
      },
      Iceape: function Iceape() {
        return u.replace(/^.*Iceape\/([\d.]+).*$/, "$1");
      },
      SeaMonkey: function SeaMonkey() {
        return u.replace(/^.*SeaMonkey\/([\d.]+).*$/, "$1");
      },
      Epiphany: function Epiphany() {
        return u.replace(/^.*Epiphany\/([\d.]+).*$/, "$1");
      },
      360: function _() {
        return u.replace(/^.*QihooBrowser\/([\d.]+).*$/, "$1");
      },
      "360SE": function SE() {
        var hash = {
          63: "10.0",
          55: "9.1",
          45: "8.1",
          42: "8.0",
          31: "7.0",
          21: "6.3"
        };
        var chrome_version2 = u.replace(/^.*Chrome\/([\d]+).*$/, "$1");
        return hash[chrome_version2] || "";
      },
      "360EE": function EE() {
        var hash = {
          69: "11.0",
          63: "9.5",
          55: "9.0",
          50: "8.7",
          30: "7.5"
        };
        var chrome_version2 = u.replace(/^.*Chrome\/([\d]+).*$/, "$1");
        return hash[chrome_version2] || "";
      },
      Maxthon: function Maxthon() {
        return u.replace(/^.*Maxthon\/([\d.]+).*$/, "$1");
      },
      QQBrowser: function QQBrowser() {
        return u.replace(/^.*QQBrowser\/([\d.]+).*$/, "$1");
      },
      QQ: function QQ() {
        return u.replace(/^.*QQ\/([\d.]+).*$/, "$1");
      },
      Baidu: function Baidu() {
        return u.replace(/^.*BIDUBrowser[\s\/]([\d.]+).*$/, "$1");
      },
      UC: function UC() {
        return u.replace(/^.*UC?Browser\/([\d.]+).*$/, "$1");
      },
      Sogou: function Sogou() {
        return u.replace(/^.*SE ([\d.X]+).*$/, "$1").replace(/^.*SogouMobileBrowser\/([\d.]+).*$/, "$1");
      },
      LBBROWSER: function LBBROWSER() {
        var version = "";
        if (u.indexOf("LieBaoFast") > -1) {
          version = u.replace(/^.*LieBaoFast\/([\d.]+).*$/, "$1");
        }
        var hash = {
          57: "6.5",
          49: "6.0",
          46: "5.9",
          42: "5.3",
          39: "5.2",
          34: "5.0",
          29: "4.5",
          21: "4.0"
        };
        var chrome_version2 = u.replace(/^.*Chrome\/([\d]+).*$/, "$1");
        return version || hash[chrome_version2] || "";
      },
      "2345Explorer": function Explorer() {
        return u.replace(/^.*2345Explorer\/([\d.]+).*$/, "$1");
      },
      TheWorld: function TheWorld() {
        return u.replace(/^.*TheWorld ([\d.]+).*$/, "$1");
      },
      XiaoMi: function XiaoMi() {
        return u.replace(/^.*MiuiBrowser\/([\d.]+).*$/, "$1");
      },
      Quark: function Quark() {
        return u.replace(/^.*Quark\/([\d.]+).*$/, "$1");
      },
      Qiyu: function Qiyu() {
        return u.replace(/^.*Qiyu\/([\d.]+).*$/, "$1");
      },
      Wechat: function Wechat() {
        return u.replace(/^.*MicroMessenger\/([\d.]+).*$/, "$1");
      },
      WechatWork: function WechatWork() {
        return u.replace(/^.*wxwork\/([\d.]+).*$/, "$1");
      },
      Taobao: function Taobao() {
        return u.replace(/^.*AliApp\(TB\/([\d.]+).*$/, "$1");
      },
      Alipay: function Alipay() {
        return u.replace(/^.*AliApp\(AP\/([\d.]+).*$/, "$1");
      },
      Weibo: function Weibo() {
        return u.replace(/^.*weibo__([\d.]+).*$/, "$1");
      },
      Douban: function Douban() {
        return u.replace(/^.*com.douban.frodo\/([\d.]+).*$/, "$1");
      },
      Suning: function Suning() {
        return u.replace(/^.*SNEBUY-APP([\d.]+).*$/, "$1");
      },
      iQiYi: function iQiYi() {
        return u.replace(/^.*IqiyiVersion\/([\d.]+).*$/, "$1");
      }
    };
    _this.browserVersion = "";
    _this.browserMajor = "";
    if (browerVersionMap[_this.browser]) {
      _this.browserVersion = browerVersionMap[_this.browser]();
      if (_this.browserVersion == u) {
        _this.browserVersion = "";
      }
    }
    if (_this.browser == "Chrome" && u.match(/\S+Browser/)) {
      _this.browser = u.match(/\S+Browser/)[0];
      _this.browserVersion = u.replace(/^.*Browser\/([\d.]+).*$/, "$1");
    }
    if (_this.browser == "Edge") {
      if (_this.browserVersion > "75") {
        _this.engine = "Blink";
      } else {
        _this.engine = "EdgeHTML";
      }
    }
    if (_this.browser == "Chrome" && parseInt(_this.browserVersion) > 27) {
      _this.engine = "Blink";
    } else if (match["Chrome"] && _this.engine == "WebKit" && parseInt(_this.browserVersion) > 27) {
      _this.engine = "Blink";
    } else if (_this.browser == "Opera" && parseInt(_this.browserVersion) > 12) {
      _this.engine = "Blink";
    } else if (_this.browser == "Yandex") {
      _this.engine = "Blink";
    }
    if (_this.browserVersion) {
      _this.browserMajor = _this.browserVersion.split(".").length && _this.browserVersion.split(".")[0];
    }
    return {
      browser: _this.browser,
      browserVersion: _this.browserVersion,
      engine: _this.engine || "Unknown",
      browserMajor: _this.browserMajor
    };
  }),
  getGeoPosition: monitor(function(callback) {
    var navigator2 = getNavigator();
    navigator2 && navigator2.geolocation && navigator2.geolocation.getCurrentPosition(function(position) {
      callback(position);
    }, function(error) {
      display.warn(error);
    });
  })
};
MethodLibrary.getGeoPostion = MethodLibrary.getGeoPosition;
function getDeviceInfo() {
  var browserWindow = getBrowserWindow();
  if (!browserWindow) {
    return {};
  }
  var screen = browserWindow.screen || {
    width: 0,
    height: 0
  };
  var target = {};
  var osInfo = MethodLibrary.getOS(target);
  var osVersionInfo = MethodLibrary.getOSVersion(target);
  var browserInfo = MethodLibrary.getBrowserInfo(target);
  return {
    os: osInfo,
    osVersion: osVersionInfo.version,
    osVersionMajor: osVersionInfo.osMajor,
    browser: browserInfo.browser,
    browserVersion: browserInfo.browserVersion,
    browserVersionMajor: browserInfo.browserMajor,
    screenSize: screen.width + "*" + screen.height,
    networkType: MethodLibrary.getNetwork(),
    device: MethodLibrary.getDeviceType(target),
    timeZone: MethodLibrary.getTimeZone(),
    userAgent: getUserAgent()
  };
}
var deviceInfo = getDeviceInfo();
var DOM_EVENT = {
  BEFORE_UNLOAD: "beforeunload",
  CLICK: "click",
  DBL_CLICK: "dblclick",
  KEY_DOWN: "keydown",
  LOAD: "load",
  POP_STATE: "popstate",
  SCROLL: "scroll",
  TOUCH_START: "touchstart",
  TOUCH_END: "touchend",
  TOUCH_MOVE: "touchmove",
  VISIBILITY_CHANGE: "visibilitychange",
  PRERENDERING_CHANGE: "prerenderingchange",
  PAGE_SHOW: "pageshow",
  FREEZE: "freeze",
  RESUME: "resume",
  DOM_CONTENT_LOADED: "DOMContentLoaded",
  POINTER_DOWN: "pointerdown",
  POINTER_UP: "pointerup",
  POINTER_CANCEL: "pointercancel",
  HASH_CHANGE: "hashchange",
  PAGE_HIDE: "pagehide",
  MOUSE_DOWN: "mousedown",
  MOUSE_MOVE: "mousemove",
  FOCUS: "focus",
  BLUR: "blur",
  CONTEXT_MENU: "contextmenu",
  RESIZE: "resize",
  CHANGE: "change",
  INPUT: "input",
  PLAY: "play",
  PAUSE: "pause",
  SECURITY_POLICY_VIOLATION: "securitypolicyviolation",
  SELECTION_CHANGE: "selectionchange",
  STORAGE: "storage"
};
var ResourceType = {
  DOCUMENT: "document",
  XHR: "xhr",
  BEACON: "beacon",
  FETCH: "fetch",
  CSS: "css",
  JS: "js",
  IMAGE: "image",
  FONT: "font",
  MEDIA: "media",
  OTHER: "other",
  CUSTOM: "custom"
};
var ActionType = {
  CLICK: "click",
  CUSTOM: "custom"
};
var FrustrationType = {
  RAGE_CLICK: "rage_click",
  ERROR_CLICK: "error_click",
  DEAD_CLICK: "dead_click"
};
var RumEventType = {
  ACTION: "action",
  ERROR: "error",
  LONG_TASK: "long_task",
  VIEW: "view",
  RESOURCE: "resource",
  LOGGER: "logger"
};
var RumLongTaskEntryType = {
  LONG_TASK: "long-task",
  LONG_ANIMATION_FRAME: "long-animation-frame"
};
var ViewLoadingType = {
  INITIAL_LOAD: "initial_load",
  ROUTE_CHANGE: "route_change"
};
var RequestType = {
  FETCH: ResourceType.FETCH,
  XHR: ResourceType.XHR
};
var TraceType = {
  DDTRACE: "ddtrace",
  ZIPKIN_MULTI_HEADER: "zipkin",
  ZIPKIN_SINGLE_HEADER: "zipkin_single_header",
  W3C_TRACEPARENT: "w3c_traceparent",
  W3C_TRACEPARENT_64: "w3c_traceparent_64bit",
  SKYWALKING_V3: "skywalking_v3",
  JAEGER: "jaeger"
};
var ErrorHandling = {
  HANDLED: "handled",
  UNHANDLED: "unhandled"
};
var NonErrorPrefix = {
  UNCAUGHT: "Uncaught",
  PROVIDED: "Provided"
};
function _typeof$e(o) {
  "@babel/helpers - typeof";
  return _typeof$e = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(o2) {
    return typeof o2;
  } : function(o2) {
    return o2 && "function" == typeof Symbol && o2.constructor === Symbol && o2 !== Symbol.prototype ? "symbol" : typeof o2;
  }, _typeof$e(o);
}
function jsonStringify(value, replacer, space) {
  if (_typeof$e(value) !== "object" || value === null) {
    return JSON.stringify(value);
  }
  var restoreObjectPrototypeToJson = detachToJsonMethod(Object.prototype);
  var restoreArrayPrototypeToJson = detachToJsonMethod(Array.prototype);
  var restoreValuePrototypeToJson = detachToJsonMethod(Object.getPrototypeOf(value));
  var restoreValueToJson = detachToJsonMethod(value);
  try {
    return JSON.stringify(value, replacer, space);
  } catch (_unused) {
    return "<error: unable to serialize object>";
  } finally {
    restoreObjectPrototypeToJson();
    restoreArrayPrototypeToJson();
    restoreValuePrototypeToJson();
    restoreValueToJson();
  }
}
function detachToJsonMethod(value) {
  var object = value;
  var objectToJson = object.toJSON;
  if (objectToJson) {
    delete object.toJSON;
    return function() {
      object.toJSON = objectToJson;
    };
  }
  return noop;
}
function _typeof$d(o) {
  "@babel/helpers - typeof";
  return _typeof$d = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(o2) {
    return typeof o2;
  } : function(o2) {
    return o2 && "function" == typeof Symbol && o2.constructor === Symbol && o2 !== Symbol.prototype ? "symbol" : typeof o2;
  }, _typeof$d(o);
}
var UNKNOWN_FUNCTION = "?";
function computeStackTrace(ex) {
  var stack = [];
  var stackProperty = tryToGetString(ex, "stack");
  var exString = String(ex);
  if (stackProperty && stackProperty.startsWith(exString)) {
    stackProperty = stackProperty.slice(exString.length);
  }
  if (stackProperty) {
    each(stackProperty.split("\n"), function(line) {
      var stackFrame = parseChromeLine(line) || parseChromeAnonymousLine(line) || parseWinLine(line) || parseGeckoLine(line);
      if (stackFrame) {
        if (!stackFrame.func && stackFrame.line) {
          stackFrame.func = UNKNOWN_FUNCTION;
        }
        stack.push(stackFrame);
      }
    });
  }
  return {
    message: tryToGetString(ex, "message"),
    name: tryToGetString(ex, "name"),
    stack
  };
}
var fileUrl = "((?:file|https?|blob|chrome-extension|electron|native|eval|webpack|<anonymous>|\\w+\\.|\\/).*?)";
var filePosition = "(?::(\\d+))";
var CHROME_LINE_RE = new RegExp("^\\s*at (.*?) ?\\(" + fileUrl + filePosition + "?" + filePosition + "?\\)?\\s*$", "i");
var CHROME_EVAL_RE = new RegExp("\\((\\S*)" + filePosition + filePosition + "\\)");
function parseChromeLine(line) {
  var parts = CHROME_LINE_RE.exec(line);
  if (!parts) {
    return;
  }
  var isNative = parts[2] && parts[2].indexOf("native") === 0;
  var isEval = parts[2] && parts[2].indexOf("eval") === 0;
  var submatch = CHROME_EVAL_RE.exec(parts[2]);
  if (isEval && submatch) {
    parts[2] = submatch[1];
    parts[3] = submatch[2];
    parts[4] = submatch[3];
  }
  return {
    args: isNative ? [parts[2]] : [],
    column: parts[4] ? +parts[4] : void 0,
    func: parts[1] || UNKNOWN_FUNCTION,
    line: parts[3] ? +parts[3] : void 0,
    url: !isNative ? parts[2] : void 0
  };
}
var CHROME_ANONYMOUS_FUNCTION_RE = new RegExp("^\\s*at ?" + fileUrl + filePosition + "?" + filePosition + "??\\s*$", "i");
function parseChromeAnonymousLine(line) {
  var parts = CHROME_ANONYMOUS_FUNCTION_RE.exec(line);
  if (!parts) {
    return;
  }
  return {
    args: [],
    column: parts[3] ? +parts[3] : void 0,
    func: UNKNOWN_FUNCTION,
    line: parts[2] ? +parts[2] : void 0,
    url: parts[1]
  };
}
var WINJS_LINE_RE = /^\s*at (?:((?:\[object object\])?.+) )?\(?((?:file|ms-appx|https?|webpack|blob):.*?):(\d+)(?::(\d+))?\)?\s*$/i;
function parseWinLine(line) {
  var parts = WINJS_LINE_RE.exec(line);
  if (!parts) {
    return;
  }
  return {
    args: [],
    column: parts[4] ? +parts[4] : void 0,
    func: parts[1] || UNKNOWN_FUNCTION,
    line: +parts[3],
    url: parts[2]
  };
}
var GECKO_LINE_RE = /^\s*(.*?)(?:\((.*?)\))?(?:^|@)((?:file|https?|blob|chrome|webpack|resource|capacitor|\[native).*?|[^@]*bundle|\[wasm code\])(?::(\d+))?(?::(\d+))?\s*$/i;
var GECKO_EVAL_RE = /(\S+) line (\d+)(?: > eval line \d+)* > eval/i;
function parseGeckoLine(line) {
  var parts = GECKO_LINE_RE.exec(line);
  if (!parts) {
    return;
  }
  var isEval = parts[3] && parts[3].indexOf(" > eval") > -1;
  var submatch = GECKO_EVAL_RE.exec(parts[3]);
  if (isEval && submatch) {
    parts[3] = submatch[1];
    parts[4] = submatch[2];
    parts[5] = void 0;
  }
  return {
    args: parts[2] ? parts[2].split(",") : [],
    column: parts[5] ? +parts[5] : void 0,
    func: parts[1] || UNKNOWN_FUNCTION,
    line: parts[4] ? +parts[4] : void 0,
    url: parts[3]
  };
}
function tryToGetString(candidate, property) {
  if (_typeof$d(candidate) !== "object" || !candidate || !(property in candidate)) {
    return void 0;
  }
  var value = candidate[property];
  return typeof value === "string" ? value : void 0;
}
var ERROR_TYPES_RE = /^(?:[Uu]ncaught (?:exception: )?)?(?:((?:Eval|Internal|Range|Reference|Syntax|Type|URI|)Error): )?([\s\S]*)$/;
function startUnhandledErrorCollection(callback) {
  var _instrumentOnError = instrumentOnError(callback);
  var _instrumentUnhandledRejection = instrumentUnhandledRejection(callback);
  return {
    stop: function stop() {
      _instrumentOnError.stop();
      _instrumentUnhandledRejection.stop();
    }
  };
}
function instrumentOnError(callback) {
  return instrumentMethod(window, "onerror", function(params) {
    var parameters = params.parameters;
    var messageObj = parameters[0];
    var url = parameters[1];
    var line = parameters[2];
    var column = parameters[3];
    var errorObj = parameters[4];
    var stackTrace;
    if (errorObj instanceof Error) {
      stackTrace = computeStackTrace(errorObj);
    } else {
      var location2 = {
        url,
        column,
        line
      };
      var parse = tryToParseMessage(messageObj);
      stackTrace = {
        name: parse.name,
        message: parse.message,
        stack: [location2]
      };
    }
    callback(stackTrace, isNullUndefinedDefaultValue(errorObj, messageObj));
  });
}
function tryToParseMessage(messageObj) {
  var name;
  var message;
  if ({}.toString.call(messageObj) === "[object String]") {
    var groups = ERROR_TYPES_RE.exec(messageObj);
    if (groups) {
      name = groups[1];
      message = groups[2];
    }
  }
  return {
    name,
    message
  };
}
function instrumentUnhandledRejection(callback) {
  return instrumentMethod(window, "onunhandledrejection", function(params) {
    var parameters = params.parameters;
    var e = parameters[0];
    var reason = e.reason || "Empty reason";
    var stack = computeStackTrace(reason);
    callback(stack, reason);
  });
}
var ONE_KIBI_BYTE = 1024;
var ONE_MEBI_BYTE = 1024 * ONE_KIBI_BYTE;
var HAS_MULTI_BYTES_CHARACTERS$1 = /[^\u0000-\u007F]/;
function computeBytesCount(candidate) {
  if (!HAS_MULTI_BYTES_CHARACTERS$1.test(candidate)) {
    return candidate.length;
  }
  if (window.TextEncoder !== void 0) {
    return new TextEncoder().encode(candidate).length;
  }
  return new Blob([candidate]).size;
}
function concatBuffers(buffers) {
  var length = buffers.reduce(function(total, buffer2) {
    return total + buffer2.length;
  }, 0);
  var result = new Uint8Array(length);
  var offset = 0;
  for (var _i = 0, buffers_1 = buffers; _i < buffers_1.length; _i++) {
    var buffer = buffers_1[_i];
    result.set(buffer, offset);
    offset += buffer.length;
  }
  return result;
}
function _typeof$c(o) {
  "@babel/helpers - typeof";
  return _typeof$c = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(o2) {
    return typeof o2;
  } : function(o2) {
    return o2 && "function" == typeof Symbol && o2.constructor === Symbol && o2 !== Symbol.prototype ? "symbol" : typeof o2;
  }, _typeof$c(o);
}
var SANITIZE_DEFAULT_MAX_CHARACTER_COUNT = 220 * ONE_KIBI_BYTE;
var JSON_PATH_ROOT_ELEMENT = "$";
var KEY_DECORATION_LENGTH = 3;
function sanitize(source, maxCharacterCount) {
  if (maxCharacterCount === void 0) {
    maxCharacterCount = SANITIZE_DEFAULT_MAX_CHARACTER_COUNT;
  }
  var restoreObjectPrototypeToJson = detachToJsonMethod(Object.prototype);
  var restoreArrayPrototypeToJson = detachToJsonMethod(Array.prototype);
  var containerQueue = [];
  var visitedObjectsWithPath = /* @__PURE__ */ new WeakMap();
  var sanitizedData = sanitizeProcessor(source, JSON_PATH_ROOT_ELEMENT, void 0, containerQueue, visitedObjectsWithPath);
  var accumulatedCharacterCount = JSON.stringify(sanitizedData) && JSON.stringify(sanitizedData).length || 0;
  if (accumulatedCharacterCount > maxCharacterCount) {
    warnOverCharacterLimit(maxCharacterCount, "discarded", source);
    return void 0;
  }
  while (containerQueue.length > 0 && accumulatedCharacterCount < maxCharacterCount) {
    var containerToProcess = containerQueue.shift();
    var separatorLength = 0;
    if (Array.isArray(containerToProcess.source)) {
      for (var key = 0; key < containerToProcess.source.length; key++) {
        var targetData = sanitizeProcessor(containerToProcess.source[key], containerToProcess.path, key, containerQueue, visitedObjectsWithPath);
        if (targetData !== void 0) {
          accumulatedCharacterCount += JSON.stringify(targetData).length;
        } else {
          accumulatedCharacterCount += 4;
        }
        accumulatedCharacterCount += separatorLength;
        separatorLength = 1;
        if (accumulatedCharacterCount > maxCharacterCount) {
          warnOverCharacterLimit(maxCharacterCount, "truncated", source);
          break;
        }
        containerToProcess.target[key] = targetData;
      }
    } else {
      for (var key in containerToProcess.source) {
        if (Object.prototype.hasOwnProperty.call(containerToProcess.source, key)) {
          var targetData = sanitizeProcessor(containerToProcess.source[key], containerToProcess.path, key, containerQueue, visitedObjectsWithPath);
          if (targetData !== void 0) {
            accumulatedCharacterCount += JSON.stringify(targetData).length + separatorLength + key.length + KEY_DECORATION_LENGTH;
            separatorLength = 1;
          }
          if (accumulatedCharacterCount > maxCharacterCount) {
            warnOverCharacterLimit(maxCharacterCount, "truncated", source);
            break;
          }
          containerToProcess.target[key] = targetData;
        }
      }
    }
  }
  restoreObjectPrototypeToJson();
  restoreArrayPrototypeToJson();
  return sanitizedData;
}
function sanitizeProcessor(source, parentPath, key, queue, visitedObjectsWithPath) {
  var sourceToSanitize = tryToApplyToJSON(source);
  if (!sourceToSanitize || _typeof$c(sourceToSanitize) !== "object") {
    return sanitizePrimitivesAndFunctions(sourceToSanitize);
  }
  var sanitizedSource = sanitizeObjects(sourceToSanitize);
  if (sanitizedSource !== "[Object]" && sanitizedSource !== "[Array]" && sanitizedSource !== "[Error]") {
    return sanitizedSource;
  }
  var sourceAsObject = source;
  if (visitedObjectsWithPath.has(sourceAsObject)) {
    return "[Reference seen at " + visitedObjectsWithPath.get(sourceAsObject) + "]";
  }
  var currentPath = key !== void 0 ? parentPath + "." + key : parentPath;
  var target = Array.isArray(sourceToSanitize) ? [] : {};
  visitedObjectsWithPath.set(sourceAsObject, currentPath);
  queue.push({
    source: sourceToSanitize,
    target,
    path: currentPath
  });
  return target;
}
function sanitizePrimitivesAndFunctions(value) {
  if (typeof value === "bigint") {
    return "[BigInt] " + value.toString();
  }
  if (typeof value === "function") {
    return "[Function] " + value.name || "unknown";
  }
  if (_typeof$c(value) === "symbol") {
    return "[Symbol] " + value.description || value.toString();
  }
  return value;
}
function sanitizeObjects(value) {
  try {
    if (value instanceof Event) {
      return sanitizeEvent(value);
    }
    if (value instanceof RegExp) {
      return "[RegExp] ".concat(value.toString());
    }
    var result = Object.prototype.toString.call(value);
    var match = result.match(/\[object (.*)\]/);
    if (match && match[1]) {
      return "[" + match[1] + "]";
    }
  } catch (_unused) {
  }
  return "[Unserializable]";
}
function sanitizeEvent(event) {
  return {
    type: event.type,
    isTrusted: event.isTrusted,
    currentTarget: event.currentTarget ? sanitizeObjects(event.currentTarget) : null,
    target: event.target ? sanitizeObjects(event.target) : null
  };
}
function tryToApplyToJSON(value) {
  var object = value;
  if (object && typeof object.toJSON === "function") {
    try {
      return object.toJSON();
    } catch (_unused2) {
    }
  }
  return value;
}
function warnOverCharacterLimit(maxCharacterCount, changeType, source) {
  display.warn("The data provided has been " + changeType + " as it is over the limit of " + maxCharacterCount + " characters:", source);
}
var NO_ERROR_STACK_PRESENT_MESSAGE = "No stack, consider using an instance of Error";
var ErrorSource = {
  AGENT: "agent",
  CONSOLE: "console",
  NETWORK: "network",
  SOURCE: "source",
  LOGGER: "logger",
  CUSTOM: "custom",
  REPORT: "report"
};
function computeRawError(data) {
  var stackTrace = data.stackTrace;
  var originalError = data.originalError;
  var handlingStack = data.handlingStack;
  var startClocks = data.startClocks;
  var nonErrorPrefix = data.nonErrorPrefix;
  var source = data.source;
  var handling = data.handling;
  var useFallbackStack = data.useFallbackStack === void 0 ? true : data.useFallbackStack;
  var isErrorInstance = isError(originalError);
  if (!stackTrace && isErrorInstance) {
    stackTrace = computeStackTrace(originalError);
  }
  var message = computeMessage(stackTrace, isErrorInstance, nonErrorPrefix, originalError);
  return {
    startClocks,
    source,
    handling,
    originalError,
    message,
    stack: stackTrace ? toStackTraceString(stackTrace) : useFallbackStack ? NO_ERROR_STACK_PRESENT_MESSAGE : void 0,
    handlingStack,
    type: stackTrace ? stackTrace.name : void 0,
    causes: isErrorInstance ? flattenErrorCauses(originalError, source) : void 0
  };
}
function computeMessage(stackTrace, isErrorInstance, nonErrorPrefix, originalError) {
  return stackTrace && stackTrace.message && stackTrace && stackTrace.name ? stackTrace.message : !isErrorInstance ? nonErrorPrefix + " " + jsonStringify(sanitize(originalError)) : "Empty message";
}
function createHandlingStack() {
  var internalFramesToSkip = 2;
  var error = new Error();
  var formattedStack;
  if (!error.stack) {
    try {
      throw error;
    } catch (e) {
    }
  }
  callMonitored(function() {
    var stackTrace = computeStackTrace(error);
    stackTrace.stack = stackTrace.stack.slice(internalFramesToSkip);
    formattedStack = toStackTraceString(stackTrace);
  });
  return formattedStack;
}
function toStackTraceString(stack) {
  var result = formatErrorMessage(stack);
  each(stack.stack, function(frame) {
    var func = frame.func === "?" ? "<anonymous>" : frame.func;
    var args = frame.args && frame.args.length > 0 ? "(" + frame.args.join(", ") + ")" : "";
    var line = frame.line ? ":" + frame.line : "";
    var column = frame.line && frame.column ? ":" + frame.column : "";
    result += "\n  at " + func + args + " @ " + frame.url + line + column;
  });
  return result;
}
function formatErrorMessage(stack) {
  return (stack.name || "Error") + ": " + stack.message;
}
function flattenErrorCauses(error, parentSource) {
  var currentError = error;
  var causes = [];
  while (currentError && currentError.cause instanceof Error && causes.length < 10) {
    var stackTrace = computeStackTrace(currentError.cause);
    causes.push({
      message: currentError.cause.message,
      source: parentSource,
      type: stackTrace && stackTrace.name,
      stack: stackTrace && toStackTraceString(stackTrace)
    });
    currentError = currentError.cause;
  }
  return causes.length ? causes : void 0;
}
function isError(error) {
  return error instanceof Error || Object.prototype.toString.call(error) === "[object Error]";
}
function instrumentMethod(targetPrototype, method, onPreCall, opts) {
  var computeHandlingStack = opts && opts.computeHandlingStack;
  var original = targetPrototype[method];
  if (typeof original !== "function") {
    if (startsWith(method, "on")) {
      original = noop;
    } else {
      return {
        stop: noop
      };
    }
  }
  var stopped = false;
  var instrumentation = function instrumentation2() {
    if (stopped) {
      return original.apply(this, arguments);
    }
    var parameters = arrayFrom(arguments);
    var postCallCallback;
    callMonitored(onPreCall, null, [{
      target: this,
      parameters,
      onPostCall: function onPostCall(callback) {
        postCallCallback = callback;
      },
      handlingStack: computeHandlingStack ? createHandlingStack() : void 0
    }]);
    var result = original.apply(this, parameters);
    if (postCallCallback) {
      callMonitored(postCallCallback, null, [result]);
    }
    return result;
  };
  targetPrototype[method] = instrumentation;
  return {
    stop: function stop() {
      stopped = true;
      if (targetPrototype[method] === instrumentation) {
        targetPrototype[method] = original;
      }
    }
  };
}
function instrumentSetter(targetPrototype, property, after) {
  var originalDescriptor = Object.getOwnPropertyDescriptor(targetPrototype, property);
  if (!originalDescriptor || !originalDescriptor.set || !originalDescriptor.configurable) {
    return {
      stop: noop
    };
  }
  var stoppedInstrumentation = noop;
  var _instrumentation = function instrumentation(target, value) {
    setTimeout$1(function() {
      if (_instrumentation !== stoppedInstrumentation) {
        after(target, value);
      }
    }, 0);
  };
  var instrumentationWrapper = function instrumentationWrapper2(value) {
    originalDescriptor.set.call(this, value);
    _instrumentation(this, value);
  };
  Object.defineProperty(targetPrototype, property, {
    set: instrumentationWrapper
  });
  return {
    stop: function stop() {
      if (Object.getOwnPropertyDescriptor(targetPrototype, property) && Object.getOwnPropertyDescriptor(targetPrototype, property).set === instrumentationWrapper) {
        Object.defineProperty(targetPrototype, property, originalDescriptor);
      }
      _instrumentation = stoppedInstrumentation;
    }
  };
}
function trackRuntimeError(errorObservable) {
  return startUnhandledErrorCollection(function(stackTrace, originalError) {
    errorObservable.notify(computeRawError({
      stackTrace,
      originalError,
      startClocks: clocksNow(),
      nonErrorPrefix: NonErrorPrefix.UNCAUGHT,
      source: ErrorSource.SOURCE,
      handling: ErrorHandling.UNHANDLED
    }));
  });
}
var _Observable = function _Observable2(onFirstSubscribe) {
  this.observers = [];
  this.onLastUnsubscribe = void 0;
  this.onFirstSubscribe = onFirstSubscribe;
};
_Observable.prototype = {
  subscribe: function subscribe(f) {
    this.observers.push(f);
    if (this.observers.length === 1 && this.onFirstSubscribe) {
      this.onLastUnsubscribe = this.onFirstSubscribe(this) || void 0;
    }
    var _this = this;
    return {
      unsubscribe: function unsubscribe() {
        _this.observers = filter(_this.observers, function(other) {
          return f !== other;
        });
        if (!_this.observers.length && _this.onLastUnsubscribe) {
          _this.onLastUnsubscribe();
        }
      }
    };
  },
  notify: function notify(data) {
    each(this.observers, function(observer2) {
      observer2(data);
    });
  }
};
var Observable = _Observable;
function mergeObservables() {
  var observables = [].slice.call(arguments);
  return new Observable(function(globalObservable) {
    var subscriptions = map(observables, function(observable) {
      return observable.subscribe(function(data) {
        return globalObservable.notify(data);
      });
    });
    return function() {
      return each(subscriptions, function(subscription) {
        return subscription.unsubscribe();
      });
    };
  });
}
var consoleObservablesByApi = {};
function initConsoleObservable(apis) {
  var consoleObservables = map(apis, function(api) {
    if (!consoleObservablesByApi[api]) {
      consoleObservablesByApi[api] = createConsoleObservable(api);
    }
    return consoleObservablesByApi[api];
  });
  return mergeObservables.apply(this, consoleObservables);
}
function createConsoleObservable(api) {
  return new Observable(function(observable) {
    var originalConsoleApi = console[api];
    console[api] = function() {
      var params = [].slice.call(arguments);
      originalConsoleApi.apply(console, arguments);
      var handlingStack = createHandlingStack();
      callMonitored(function() {
        observable.notify(buildConsoleLog(params, api, handlingStack));
      });
    };
    return function() {
      console[api] = originalConsoleApi;
    };
  });
}
function buildConsoleLog(params, api, handlingStack) {
  var message = map(params, function(param) {
    return formatConsoleParameters(param);
  }).join(" ");
  if (api === ConsoleApiName.error) {
    var firstErrorParam = find(params, isError);
    var rawError = computeRawError({
      originalError: firstErrorParam,
      startClocks: clocksNow(),
      source: ErrorSource.CONSOLE,
      handling: ErrorHandling.HANDLED,
      handlingStack,
      nonErrorPrefix: NonErrorPrefix.PROVIDED,
      useFallbackStack: false
    });
    rawError.message = message;
    return {
      api,
      message,
      error: rawError,
      handlingStack
    };
  }
  return {
    api,
    message,
    error: void 0,
    handlingStack
  };
}
function formatConsoleParameters(param) {
  if (typeof param === "string") {
    return sanitize(param);
  }
  if (isError(param)) {
    return formatErrorMessage(computeStackTrace(param));
  }
  return jsonStringify(sanitize(param), void 0, 2);
}
function addEventListener(eventTarget, event, listener, options) {
  return addEventListeners(eventTarget, [event], listener, options);
}
function addEventListeners(eventTarget, eventNames, listener, options) {
  var wrappedListener = monitor(options && options.once ? function(event) {
    stop();
    listener(event);
  } : listener);
  options = options && options.passive ? {
    capture: options.capture,
    passive: options.passive
  } : options && options.capture;
  each(eventNames, function(eventName) {
    withOriginalOrZoneJsPatchedMethod(eventTarget, "addEventListener", function(method) {
      return method.call(eventTarget, eventName, wrappedListener, options);
    });
  });
  var stop = function stop2() {
    each(eventNames, function(eventName) {
      withOriginalOrZoneJsPatchedMethod(eventTarget, "removeEventListener", function(method) {
        return method.call(eventTarget, eventName, wrappedListener, options);
      });
    });
  };
  return {
    stop
  };
}
function isIllegalInvocationError(error, methodName) {
  if (!(error instanceof Error)) {
    return false;
  }
  return error.message.includes("Illegal invocation") || // chrome
  error.message.includes("'".concat(methodName, "' called on an object that does not implement interface EventTarget.")) || // firefox
  error.message.includes("Can only call EventTarget.".concat(methodName, " on instances of EventTarget"));
}
function withOriginalOrZoneJsPatchedMethod(eventTarget, methodName, cb) {
  var listenerTarget = window.EventTarget && eventTarget instanceof EventTarget ? window.EventTarget.prototype : eventTarget;
  var originalMethod = getZoneJsOriginalValue(listenerTarget, methodName);
  try {
    cb(originalMethod);
  } catch (error) {
    if (isIllegalInvocationError(error, methodName)) {
      return cb(eventTarget[methodName]);
    }
    throw error;
  }
}
var RawReportType = {
  intervention: "intervention",
  cspViolation: "csp_violation"
};
function initReportObservable(configuration, apis) {
  var observables = [];
  if (includes(apis, RawReportType.cspViolation)) {
    observables.push(createCspViolationReportObservable());
  }
  var reportTypes = filter(apis, function(api) {
    return api !== RawReportType.cspViolation;
  });
  if (reportTypes.length) {
    observables.push(createReportObservable(reportTypes));
  }
  return mergeObservables.apply(this, observables);
}
function createReportObservable(reportTypes) {
  return new Observable(function(observable) {
    if (!window.ReportingObserver) {
      return;
    }
    var handleReports = monitor(function(reports) {
      each(reports, function(report) {
        observable.notify(buildRawReportErrorFromReport(report));
      });
    });
    var observer2 = new window.ReportingObserver(handleReports, {
      types: reportTypes,
      buffered: true
    });
    observer2.observe();
    return function() {
      observer2.disconnect();
    };
  });
}
function createCspViolationReportObservable(configuration) {
  return new Observable(function(observable) {
    var _addEventListener = addEventListener(document, DOM_EVENT.SECURITY_POLICY_VIOLATION, function(event) {
      observable.notify(buildRawReportErrorFromCspViolation(event));
    });
    return _addEventListener.stop;
  });
}
function buildRawReportErrorFromReport(report) {
  var body = report.body;
  var type = report.type;
  return buildRawReportError({
    type: body.id,
    message: type + ": " + body.message,
    originalError: report,
    stack: buildStack(body.id, body.message, body.sourceFile, body.lineNumber, body.columnNumber)
  });
}
function buildRawReportError(partial) {
  return assign({
    startClocks: clocksNow(),
    source: ErrorSource.REPORT,
    handling: ErrorHandling.UNHANDLED
  }, partial);
}
function buildRawReportErrorFromCspViolation(event) {
  var message = "'" + event.blockedURI + "' blocked by '" + event.effectiveDirective + "' directive";
  return buildRawReportError({
    type: event.effectiveDirective,
    message: RawReportType.cspViolation + ": " + message,
    originalError: event,
    csp: {
      disposition: event.disposition
    },
    stack: buildStack(event.effectiveDirective, event.originalPolicy ? "".concat(message, ' of the policy "').concat(safeTruncate(event.originalPolicy, 100), '"') : "no policy", event.sourceFile, event.lineNumber, event.columnNumber)
  });
}
function buildStack(name, message, sourceFile, lineNumber, columnNumber) {
  return sourceFile && toStackTraceString({
    name,
    message,
    stack: [{
      func: "?",
      url: sourceFile,
      line: lineNumber,
      column: columnNumber
    }]
  });
}
var LifeCycleEventType = {
  AUTO_ACTION_COMPLETED: "AUTO_ACTION_COMPLETED",
  BEFORE_VIEW_CREATED: "BEFORE_VIEW_CREATED",
  VIEW_CREATED: "VIEW_CREATED",
  VIEW_UPDATED: "VIEW_UPDATED",
  BEFORE_VIEW_UPDATED: "BEFORE_VIEW_UPDATED",
  VIEW_ENDED: "VIEW_ENDED",
  AFTER_VIEW_ENDED: "AFTER_VIEW_ENDED",
  SESSION_RENEWED: "SESSION_RENEWED",
  SESSION_EXPIRED: "SESSION_EXPIRED",
  PAGE_EXITED: "PAGE_EXITED",
  REQUEST_STARTED: "REQUEST_STARTED",
  REQUEST_COMPLETED: "REQUEST_COMPLETED",
  RAW_RUM_EVENT_COLLECTED: "RAW_RUM_EVENT_COLLECTED",
  RUM_EVENT_COLLECTED: "RUM_EVENT_COLLECTED",
  RAW_ERROR_COLLECTED: "RAW_ERROR_COLLECTED",
  RAW_LOG_COLLECTED: "RAW_LOG_COLLECTED",
  LOG_COLLECTED: "LOG_COLLECTED"
};
function LifeCycle() {
  this.callbacks = {};
}
LifeCycle.prototype = {
  notify: function notify2(eventType, data) {
    var eventCallbacks = this.callbacks[eventType];
    if (eventCallbacks) {
      each(eventCallbacks, function(callback) {
        callback(data);
      });
    }
  },
  subscribe: function subscribe2(eventType, callback) {
    if (!this.callbacks[eventType]) {
      this.callbacks[eventType] = [];
    }
    this.callbacks[eventType].push(callback);
    var _this = this;
    return {
      unsubscribe: function unsubscribe() {
        _this.callbacks[eventType] = filter(_this.callbacks[eventType], function(other) {
          return other !== callback;
        });
      }
    };
  }
};
function _toArray(r) {
  return _arrayWithHoles$4(r) || _iterableToArray$1(r) || _unsupportedIterableToArray$5(r) || _nonIterableRest$4();
}
function _iterableToArray$1(r) {
  if ("undefined" != typeof Symbol && null != r[Symbol.iterator] || null != r["@@iterator"]) return Array.from(r);
}
function _slicedToArray$4(r, e) {
  return _arrayWithHoles$4(r) || _iterableToArrayLimit$4(r, e) || _unsupportedIterableToArray$5(r, e) || _nonIterableRest$4();
}
function _nonIterableRest$4() {
  throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}
function _unsupportedIterableToArray$5(r, a) {
  if (r) {
    if ("string" == typeof r) return _arrayLikeToArray$5(r, a);
    var t = {}.toString.call(r).slice(8, -1);
    return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray$5(r, a) : void 0;
  }
}
function _arrayLikeToArray$5(r, a) {
  (null == a || a > r.length) && (a = r.length);
  for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e];
  return n;
}
function _iterableToArrayLimit$4(r, l) {
  var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"];
  if (null != t) {
    var e, n, i, u, a = [], f = true, o = false;
    try {
      if (i = (t = t.call(r)).next, 0 === l) ;
      else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = true) ;
    } catch (r2) {
      o = true, n = r2;
    } finally {
      try {
        if (!f && null != t["return"] && (u = t["return"](), Object(u) !== u)) return;
      } finally {
        if (o) throw n;
      }
    }
    return a;
  }
}
function _arrayWithHoles$4(r) {
  if (Array.isArray(r)) return r;
}
function limitModification(object, modifiableFieldPaths2, modifier) {
  var clone = deepClone(object);
  var result = modifier(clone);
  objectEntries(modifiableFieldPaths2).forEach(function(_ref) {
    var _ref2 = _slicedToArray$4(_ref, 2), fieldPath = _ref2[0], fieldType = _ref2[1];
    return (
      // Traverse both object and clone simultaneously up to the path and apply the modification from the clone to the original object when the type is valid
      setValueAtPath(object, clone, fieldPath.split(/\.|(?=\[\])/), fieldType)
    );
  });
  return result;
}
function setValueAtPath(object, clone, pathSegments, fieldType) {
  var _pathSegments = _toArray(pathSegments), field = _pathSegments[0], restPathSegments = _pathSegments.slice(1);
  if (field === "[]") {
    if (Array.isArray(object) && Array.isArray(clone)) {
      object.forEach(function(item, i) {
        return setValueAtPath(item, clone[i], restPathSegments, fieldType);
      });
    }
    return;
  }
  if (!isValidObject(object) || !isValidObject(clone)) {
    return;
  }
  if (restPathSegments.length > 0) {
    return setValueAtPath(object[field], clone[field], restPathSegments, fieldType);
  }
  setNestedValue(object, field, clone[field], fieldType);
}
function setNestedValue(object, field, value, fieldType) {
  var newType = getType(value);
  if (newType === fieldType) {
    object[field] = sanitize(value);
  } else if (fieldType === "object" && (newType === "undefined" || newType === "null")) {
    object[field] = {};
  }
}
function isValidObject(object) {
  return getType(object) === "object";
}
function createEventRateLimiter(eventType, limit, onLimitReached) {
  var eventCount = 0;
  var allowNextEvent = false;
  return {
    isLimitReached: function isLimitReached() {
      if (eventCount === 0) {
        setTimeout$1(function() {
          eventCount = 0;
        }, ONE_MINUTE);
      }
      eventCount += 1;
      if (eventCount <= limit || allowNextEvent) {
        allowNextEvent = false;
        return false;
      }
      if (eventCount === limit + 1) {
        allowNextEvent = true;
        try {
          onLimitReached({
            message: "Reached max number of " + eventType + "s by minute: " + limit,
            source: ErrorSource.AGENT,
            startClocks: clocksNow()
          });
        } finally {
          allowNextEvent = false;
        }
      }
      return true;
    }
  };
}
function normalizeUrl(url) {
  return buildUrl(url, getLocationOrigin()).href;
}
function isValidUrl(url) {
  try {
    return !!buildUrl(url);
  } catch (e) {
    return false;
  }
}
function getOrigin(url) {
  return getLinkElementOrigin(buildUrl(url));
}
function getPathName(url) {
  var pathname = buildUrl(url).pathname;
  return pathname[0] === "/" ? pathname : "/" + pathname;
}
function buildUrl(url, base) {
  if (checkURLSupported()) {
    return base !== void 0 ? new URL(url, base) : new URL(url);
  }
  if (base === void 0 && !/:/.test(url)) {
    throw new Error("Invalid URL: " + url);
  }
  var doc = document;
  var anchorElement = doc.createElement("a");
  if (base !== void 0) {
    doc = document.implementation.createHTMLDocument("");
    var baseElement = doc.createElement("base");
    baseElement.href = base;
    doc.head.appendChild(baseElement);
    doc.body.appendChild(anchorElement);
  }
  anchorElement.href = url;
  return anchorElement;
}
var isURLSupported;
function checkURLSupported() {
  if (isURLSupported !== void 0) {
    return isURLSupported;
  }
  try {
    var url = new URL("http://test/path");
    isURLSupported = url.href === "http://test/path";
    return isURLSupported;
  } catch (e) {
    isURLSupported = false;
  }
  return isURLSupported;
}
var _navigator;
var userAgent = ((_navigator = navigator) === null || _navigator === void 0 || (_navigator = _navigator.userAgent) === null || _navigator === void 0 ? void 0 : _navigator.toLowerCase()) || "";
var isIos = function isIos2() {
  return /iphone os/.test(userAgent);
};
var JsBirdge = function JsBirdge2() {
  this.bridge = window["FTWebViewJavascriptBridge"];
  this.tagMaps = {};
  window.mapWebViewCallBack = {};
  try {
    this.initBridge();
  } catch (err) {
  }
};
JsBirdge.prototype = {
  initBridge: function initBridge() {
    var _this = this;
    if (isIos()) {
      if (!_this.bridge) {
        if (window.WVJBCallbacks) {
          window.WVJBCallbacks.push(function(bridge) {
            _this.bridge = bridge;
          });
          return;
        } else {
          window.WVJBCallbacks = [function(bridge) {
            _this.bridge = bridge;
            return;
          }];
          var WVJBIframe = document.createElement("iframe");
          WVJBIframe.style.display = "none";
          WVJBIframe.src = "wvjbscheme://__BRIDGE_LOADED__";
          document.documentElement.appendChild(WVJBIframe);
          setTimeout(function() {
            document.documentElement.removeChild(WVJBIframe);
          }, 0);
        }
      }
    }
  },
  sendEvent: function sendEvent(params, callback) {
    if (typeof params === "undefined") {
      params = {};
    }
    var _this = this;
    var tag = "Unique id:" + (/* @__PURE__ */ new Date()).getTime();
    if (params.name) {
      _this.tagMaps[params.name] = tag;
      window.mapWebViewCallBack[tag] = function(ret, err) {
        return Promise.resolve(ret, err);
      };
      params["_tag"] = tag;
      try {
        if (isIos()) {
          _this.bridge.callHandler("sendEvent", JSON.stringify(params), "mapWebViewCallBack");
        } else {
          _this.bridge.sendEvent(JSON.stringify(params), "mapWebViewCallBack");
        }
      } catch (err) {
      }
    } else {
      callback({
        error: "please input event name"
      });
    }
  },
  addEventListener: function addEventListener2(params, callback) {
    var tag = "Unique id:" + (/* @__PURE__ */ new Date()).getTime();
    var _this = this;
    if (params.name) {
      _this.tagMaps[params.name] = tag;
      window.mapWebViewCallBack[tag] = function(ret, err) {
        callback(ret, err);
        return;
      };
      params["_tag"] = tag;
      try {
        if (isIos()) {
          _this.bridge.callHandler("addEventListener", JSON.stringify(params), "mapWebViewCallBack");
        } else {
          _this.bridge.addEventListener(JSON.stringify(params), "mapWebViewCallBack");
        }
      } catch (err) {
      }
    } else {
      callback({
        error: "please input event name"
      });
    }
  }
};
var JsBirdge = JsBirdge;
function readBytesFromStream(stream, callback, options) {
  var reader = stream.getReader();
  var readBytesCount = 0;
  readMore();
  function readMore() {
    reader.read().then(monitor(function(result) {
      if (result.done) {
        onDone();
        return;
      }
      readBytesCount += result.value.length;
      if (readBytesCount > options.bytesLimit) {
        onDone();
      } else {
        readMore();
      }
    }), monitor(function(error) {
      callback(error);
    }));
  }
  function onDone() {
    reader.cancel()["catch"](
      // we don't care if cancel fails, but we still need to catch the error to avoid reporting it
      // as an unhandled rejection
      noop
    );
    var bytes;
    var limitExceeded;
    callback(void 0, bytes, limitExceeded);
  }
}
function requestIdleCallback(callback, opts) {
  if (window.requestIdleCallback && window.cancelIdleCallback) {
    var id = window.requestIdleCallback(monitor(callback), opts);
    return function() {
      return window.cancelIdleCallback(id);
    };
  }
  return requestIdleCallbackShim(callback);
}
var MAX_TASK_TIME = 50;
function requestIdleCallbackShim(callback) {
  var start = dateNow();
  var timeoutId = setTimeout$1(function() {
    callback({
      didTimeout: false,
      timeRemaining: function timeRemaining() {
        return Math.max(0, MAX_TASK_TIME - (dateNow() - start));
      }
    });
  }, 0);
  return function() {
    return clearTimeout$1(timeoutId);
  };
}
var IDLE_CALLBACK_TIMEOUT = ONE_SECOND;
var MAX_EXECUTION_TIME_ON_TIMEOUT = 30;
function createTaskQueue() {
  var pendingTasks = [];
  function run(deadline) {
    var executionTimeRemaining;
    if (deadline.didTimeout) {
      var start = performance.now();
      executionTimeRemaining = function executionTimeRemaining2() {
        return MAX_EXECUTION_TIME_ON_TIMEOUT - (performance.now() - start);
      };
    } else {
      executionTimeRemaining = deadline.timeRemaining.bind(deadline);
    }
    while (executionTimeRemaining() > 0 && pendingTasks.length) {
      pendingTasks.shift()();
    }
    if (pendingTasks.length) {
      scheduleNextRun();
    }
  }
  function scheduleNextRun() {
    requestIdleCallback(run, {
      timeout: IDLE_CALLBACK_TIMEOUT
    });
  }
  return {
    push: function push(task) {
      if (pendingTasks.push(task) === 1) {
        scheduleNextRun();
      }
    }
  };
}
var TRIM_REGIX = /^\s+|\s+$/g;
var typeMap = {
  rum: "/rum",
  log: "/logging",
  sessionReplay: "/rum/replay"
};
function getEndPointUrl(configuration, type) {
  var subUrl = typeMap[type];
  if (!subUrl) return "";
  var url = configuration.datakitOrigin || configuration.datakitUrl || configuration.site;
  if (url.indexOf("/") === 0) {
    url = location.origin + trim(url);
  }
  var endpoint = url;
  if (url.lastIndexOf("/") === url.length - 1) {
    endpoint = trim(url) + "v1/write" + subUrl;
  } else {
    endpoint = trim(url) + "/v1/write" + subUrl;
  }
  if (configuration.site && configuration.clientToken) {
    endpoint = endpoint + "?token=" + configuration.clientToken + "&to_headless=true";
  }
  return endpoint;
}
function trim(str) {
  return str.replace(TRIM_REGIX, "");
}
function computeTransportConfiguration(initConfiguration) {
  var isIntakeUrl = function isIntakeUrl2(url) {
    return false;
  };
  if ("isIntakeUrl" in initConfiguration && isFunction(initConfiguration.isIntakeUrl) && isBoolean(initConfiguration.isIntakeUrl())) {
    isIntakeUrl = initConfiguration.isIntakeUrl;
  }
  var isServerError = function isServerError2(request) {
    return false;
  };
  if ("isServerError" in initConfiguration && isFunction(initConfiguration.isServerError) && isBoolean(initConfiguration.isServerError())) {
    isServerError = initConfiguration.isServerError;
  }
  return {
    rumEndpoint: getEndPointUrl(initConfiguration, "rum"),
    logsEndpoint: getEndPointUrl(initConfiguration, "log"),
    sessionReplayEndPoint: getEndPointUrl(initConfiguration, "sessionReplay"),
    isIntakeUrl,
    isServerError
  };
}
function isIntakeRequest(url, configuration) {
  var notTakeRequest = [configuration.rumEndpoint];
  if (configuration.logsEndpoint) {
    notTakeRequest.push(configuration.logsEndpoint);
  }
  if (configuration.sessionReplayEndPoint) {
    notTakeRequest.push(configuration.sessionReplayEndPoint);
  }
  return some(notTakeRequest, function(takeUrl) {
    return url.indexOf(takeUrl) === 0;
  }) || configuration.isIntakeUrl(url);
}
function getCookieName(name, options) {
  return "".concat(name, "_").concat(options && options.crossSite ? "cs1" : "cs0", "_").concat(options && options.domain ? "d1" : "d0", "_").concat(options && options.secure ? "sec1" : "sec0", "_").concat(options && options.partitioned ? "part1" : "part0");
}
function setCookie(name, value, expireDelay, options) {
  var date = /* @__PURE__ */ new Date();
  date.setTime(date.getTime() + expireDelay);
  var expires = "expires=" + date.toUTCString();
  var sameSite = options && options.crossSite ? "none" : "strict";
  var domain = options && options.domain ? ";domain=" + options.domain : "";
  var secure = options && options.secure ? ";secure" : "";
  var partitioned = options && options.partitioned ? ";partitioned" : "";
  document.cookie = getCookieName(name, options) + "=" + value + ";" + expires + ";path=/;samesite=" + sameSite + domain + secure + partitioned;
}
function getCookie(name, options) {
  return findCommaSeparatedValue(document.cookie, getCookieName(name, options));
}
function deleteCookie(name, options) {
  setCookie(name, "", 0, options);
}
function areCookiesAuthorized(options) {
  if (document.cookie === void 0 || document.cookie === null) {
    return false;
  }
  try {
    var testCookieName = "gc_cookie_test_".concat(UUID());
    var testCookieValue = "test";
    setCookie(testCookieName, testCookieValue, ONE_MINUTE, options);
    var isCookieCorrectlySet = getCookie(testCookieName, options) === testCookieValue;
    deleteCookie(testCookieName, options);
    return isCookieCorrectlySet;
  } catch (error) {
    return false;
  }
}
var getCurrentSiteCache;
function getCurrentSite() {
  if (getCurrentSiteCache === void 0) {
    var testCookieName = "gc_site_test_".concat(UUID());
    var testCookieValue = "test";
    var domainLevels = window.location.hostname.split(".");
    var candidateDomain = domainLevels.pop();
    while (domainLevels.length && !getCookie(testCookieName, {
      domain: candidateDomain
    })) {
      candidateDomain = "".concat(domainLevels.pop(), ".").concat(candidateDomain);
      setCookie(testCookieName, testCookieValue, ONE_SECOND, {
        domain: candidateDomain
      });
    }
    deleteCookie(testCookieName, {
      domain: candidateDomain
    });
    getCurrentSiteCache = candidateDomain;
  }
  return getCurrentSiteCache;
}
var SESSION_TIME_OUT_DELAY = 4 * ONE_HOUR;
var SESSION_EXPIRATION_DELAY = 15 * ONE_MINUTE;
var SESSION_STORE_KEY = "_gc_s";
var SESSION_NOT_TRACKED = "0";
var SessionPersistence = {
  COOKIE: "cookie",
  LOCAL_STORAGE: "local-storage"
};
function _slicedToArray$3(r, e) {
  return _arrayWithHoles$3(r) || _iterableToArrayLimit$3(r, e) || _unsupportedIterableToArray$4(r, e) || _nonIterableRest$3();
}
function _nonIterableRest$3() {
  throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}
function _unsupportedIterableToArray$4(r, a) {
  if (r) {
    if ("string" == typeof r) return _arrayLikeToArray$4(r, a);
    var t = {}.toString.call(r).slice(8, -1);
    return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray$4(r, a) : void 0;
  }
}
function _arrayLikeToArray$4(r, a) {
  (null == a || a > r.length) && (a = r.length);
  for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e];
  return n;
}
function _iterableToArrayLimit$3(r, l) {
  var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"];
  if (null != t) {
    var e, n, i, u, a = [], f = true, o = false;
    try {
      if (i = (t = t.call(r)).next, 0 === l) ;
      else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = true) ;
    } catch (r2) {
      o = true, n = r2;
    } finally {
      try {
        if (!f && null != t["return"] && (u = t["return"](), Object(u) !== u)) return;
      } finally {
        if (o) throw n;
      }
    }
    return a;
  }
}
function _arrayWithHoles$3(r) {
  if (Array.isArray(r)) return r;
}
var SESSION_ENTRY_REGEXP = /^([a-zA-Z]+)=([a-z0-9-]+)$/;
var SESSION_ENTRY_SEPARATOR = "&";
var EXPIRED = "1";
function getExpiredSessionState() {
  return {
    isExpired: EXPIRED
  };
}
function isSessionInNotStartedState(session) {
  return isEmptyObject(session);
}
function isSessionStarted(session) {
  return !isSessionInNotStartedState(session);
}
function isSessionInExpiredState(session) {
  return session.isExpired !== void 0 || !isActiveSession(session);
}
function isActiveSession(sessionState) {
  return (sessionState.created === void 0 || dateNow() - Number(sessionState.created) < SESSION_TIME_OUT_DELAY) && (sessionState.expire === void 0 || dateNow() < Number(sessionState.expire));
}
function expandSessionState(session) {
  session.expire = String(dateNow() + SESSION_EXPIRATION_DELAY);
}
function toSessionString(session) {
  return map(objectEntries(session), function(item) {
    return item[0] + "=" + item[1];
  }).join(SESSION_ENTRY_SEPARATOR);
}
function toSessionState(sessionString) {
  var session = {};
  if (isValidSessionString(sessionString)) {
    sessionString.split(SESSION_ENTRY_SEPARATOR).forEach(function(entry) {
      var matches = SESSION_ENTRY_REGEXP.exec(entry);
      if (matches !== null) {
        var _matches = _slicedToArray$3(matches, 3), key = _matches[1], value = _matches[2];
        session[key] = value;
      }
    });
  }
  return session;
}
function isValidSessionString(sessionString) {
  return !!sessionString && (sessionString.indexOf(SESSION_ENTRY_SEPARATOR) !== -1 || SESSION_ENTRY_REGEXP.test(sessionString));
}
function selectCookieStrategy(initConfiguration) {
  var cookieOptions = buildCookieOptions(initConfiguration);
  return areCookiesAuthorized(cookieOptions) ? {
    type: SessionPersistence.COOKIE,
    cookieOptions
  } : void 0;
}
function initCookieStrategy(cookieOptions) {
  var cookieStore = {
    /**
     * Lock strategy allows mitigating issues due to concurrent access to cookie.
     * This issue concerns only chromium browsers and enabling this on firefox increases cookie write failures.
     */
    isLockEnabled: isChromium(),
    persistSession: persistSessionCookie(cookieOptions),
    retrieveSession: retrieveSessionCookie(cookieOptions),
    expireSession: function expireSession() {
      return expireSessionCookie(cookieOptions);
    }
  };
  return cookieStore;
}
function persistSessionCookie(options) {
  return function(session) {
    setCookie(SESSION_STORE_KEY, toSessionString(session), SESSION_EXPIRATION_DELAY, options);
  };
}
function expireSessionCookie(options) {
  setCookie(SESSION_STORE_KEY, toSessionString(getExpiredSessionState()), SESSION_TIME_OUT_DELAY, options);
}
function retrieveSessionCookie(options) {
  return function() {
    var sessionString = getCookie(SESSION_STORE_KEY, options);
    return toSessionState(sessionString);
  };
}
function buildCookieOptions(initConfiguration) {
  var cookieOptions = {};
  cookieOptions.secure = !!initConfiguration.useSecureSessionCookie || !!initConfiguration.usePartitionedCrossSiteSessionCookie || !!initConfiguration.useCrossSiteSessionCookie;
  cookieOptions.crossSite = !!initConfiguration.usePartitionedCrossSiteSessionCookie || !!initConfiguration.useCrossSiteSessionCookie;
  cookieOptions.partitioned = !!initConfiguration.usePartitionedCrossSiteSessionCookie;
  if (initConfiguration.trackSessionAcrossSubdomains) {
    cookieOptions.domain = getCurrentSite();
  }
  return cookieOptions;
}
var LOCAL_STORAGE_TEST_KEY = "_gc_test_";
function selectLocalStorageStrategy() {
  try {
    var id = UUID();
    var testKey = "".concat(LOCAL_STORAGE_TEST_KEY).concat(id);
    localStorage.setItem(testKey, id);
    var retrievedId = localStorage.getItem(testKey);
    localStorage.removeItem(testKey);
    return id === retrievedId ? {
      type: SessionPersistence.LOCAL_STORAGE
    } : void 0;
  } catch (e) {
    return void 0;
  }
}
function initLocalStorageStrategy() {
  return {
    isLockEnabled: false,
    persistSession: persistInLocalStorage,
    retrieveSession: retrieveSessionFromLocalStorage,
    expireSession: expireSessionFromLocalStorage
  };
}
function persistInLocalStorage(sessionState) {
  localStorage.setItem(SESSION_STORE_KEY, toSessionString(sessionState));
}
function retrieveSessionFromLocalStorage() {
  var sessionString = localStorage.getItem(SESSION_STORE_KEY);
  return toSessionState(sessionString);
}
function expireSessionFromLocalStorage() {
  persistInLocalStorage(getExpiredSessionState());
}
function getConnectivity() {
  var _navigator$connection;
  var navigator2 = window.navigator;
  return {
    status: navigator2.onLine ? "connected" : "not_connected",
    interfaces: navigator2.connection && navigator2.connection.type ? [navigator2.connection.type] : void 0,
    effective_type: (_navigator$connection = navigator2.connection) === null || _navigator$connection === void 0 ? void 0 : _navigator$connection.effectiveType
  };
}
var TelemetryType = {
  log: "log",
  configuration: "configuration",
  usage: "usage"
};
var TelemetryStatusType = {
  debug: "debug",
  error: "error"
};
var ALLOWED_FRAME_URLS = ["https://static.guance.com", "http://localhost", "<anonymous>"];
var TelemetryService = {
  RUM: "browser-rum-sdk"
};
var preStartTelemetryBuffer = createBoundedBuffer();
var _onRawTelemetryEventCollected2 = function onRawTelemetryEventCollected(event) {
  preStartTelemetryBuffer.add(function() {
    _onRawTelemetryEventCollected2(event);
  });
};
function startTelemetry(telemetryService, configuration) {
  var contextProvider;
  var observable = new Observable();
  var alreadySentEvents = /* @__PURE__ */ new Set();
  var telemetryEnabled = configuration.telemetryEnabled && performDraw(configuration.telemetrySampleRate);
  var runtimeEnvInfo = getRuntimeEnvInfo();
  _onRawTelemetryEventCollected2 = function _onRawTelemetryEventCollected(rawEvent) {
    var stringifiedEvent = jsonStringify(rawEvent);
    if (telemetryEnabled && alreadySentEvents.size < configuration.maxTelemetryEventsPerPage && !alreadySentEvents.has(stringifiedEvent)) {
      var event = toTelemetryEvent(telemetryService, rawEvent, runtimeEnvInfo);
      observable.notify(event);
      alreadySentEvents.add(stringifiedEvent);
    }
  };
  startMonitorErrorCollection(addTelemetryError);
  function toTelemetryEvent(telemetryService2, event, runtimeEnvInfo2) {
    return extend2Lev({
      type: "telemetry",
      date: timeStampNow(),
      service: telemetryService2,
      version: __BUILD_ENV__SDK_VERSION__,
      source: "browser",
      telemetry: extend2Lev(event, {
        runtime_env: runtimeEnvInfo2,
        connectivity: getConnectivity()
      })
    }, contextProvider !== void 0 ? contextProvider() : {});
  }
  return {
    setContextProvider: function setContextProvider(provider) {
      contextProvider = provider;
    },
    observable,
    enabled: telemetryEnabled
  };
}
function getRuntimeEnvInfo() {
  return {
    is_local_file: window.location.protocol === "file:",
    is_worker: "WorkerGlobalScope" in self
  };
}
function drainPreStartTelemetry() {
  preStartTelemetryBuffer.drain();
}
function addTelemetryDebug(message, context) {
  displayIfDebugEnabled(message, context);
  _onRawTelemetryEventCollected2(assign({
    type: TelemetryType.log,
    message,
    status: TelemetryStatusType.debug
  }, context));
}
function addTelemetryError(e, context) {
  _onRawTelemetryEventCollected2(assign({
    type: TelemetryType.log,
    status: TelemetryStatusType.error
  }, formatError(e), context));
}
function addTelemetryConfiguration(configuration) {
  _onRawTelemetryEventCollected2({
    type: TelemetryType.configuration,
    configuration
  });
}
function addTelemetryUsage(usage) {
  _onRawTelemetryEventCollected2({
    type: TelemetryType.usage,
    usage
  });
}
function formatError(e) {
  if (e instanceof Error) {
    var stackTrace = computeStackTrace(e);
    return {
      error: {
        kind: stackTrace.name,
        stack: toStackTraceString(scrubCustomerFrames(stackTrace))
      },
      message: stackTrace.message
    };
  }
  return {
    error: {
      stack: NO_ERROR_STACK_PRESENT_MESSAGE
    },
    message: NonErrorPrefix.UNCAUGHT + " " + jsonStringify(e)
  };
}
function scrubCustomerFrames(stackTrace) {
  stackTrace.stack = stackTrace.stack.filter(function(frame) {
    return !frame.url || ALLOWED_FRAME_URLS.some(function(allowedFrameUrl) {
      return startsWith(frame.url, allowedFrameUrl);
    });
  });
  return stackTrace;
}
var _excluded = ["lock"];
function _slicedToArray$2(r, e) {
  return _arrayWithHoles$2(r) || _iterableToArrayLimit$2(r, e) || _unsupportedIterableToArray$3(r, e) || _nonIterableRest$2();
}
function _nonIterableRest$2() {
  throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}
function _unsupportedIterableToArray$3(r, a) {
  if (r) {
    if ("string" == typeof r) return _arrayLikeToArray$3(r, a);
    var t = {}.toString.call(r).slice(8, -1);
    return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray$3(r, a) : void 0;
  }
}
function _arrayLikeToArray$3(r, a) {
  (null == a || a > r.length) && (a = r.length);
  for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e];
  return n;
}
function _iterableToArrayLimit$2(r, l) {
  var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"];
  if (null != t) {
    var e, n, i, u, a = [], f = true, o = false;
    try {
      if (i = (t = t.call(r)).next, 0 === l) ;
      else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = true) ;
    } catch (r2) {
      o = true, n = r2;
    } finally {
      try {
        if (!f && null != t["return"] && (u = t["return"](), Object(u) !== u)) return;
      } finally {
        if (o) throw n;
      }
    }
    return a;
  }
}
function _arrayWithHoles$2(r) {
  if (Array.isArray(r)) return r;
}
function _objectWithoutProperties(e, t) {
  if (null == e) return {};
  var o, r, i = _objectWithoutPropertiesLoose(e, t);
  if (Object.getOwnPropertySymbols) {
    var n = Object.getOwnPropertySymbols(e);
    for (r = 0; r < n.length; r++) o = n[r], -1 === t.indexOf(o) && {}.propertyIsEnumerable.call(e, o) && (i[o] = e[o]);
  }
  return i;
}
function _objectWithoutPropertiesLoose(r, e) {
  if (null == r) return {};
  var t = {};
  for (var n in r) if ({}.hasOwnProperty.call(r, n)) {
    if (-1 !== e.indexOf(n)) continue;
    t[n] = r[n];
  }
  return t;
}
var LOCK_RETRY_DELAY = 10;
var LOCK_MAX_TRIES = 100;
var LOCK_EXPIRATION_DELAY = ONE_SECOND;
var LOCK_SEPARATOR = "--";
var bufferedOperations = [];
var ongoingOperations;
function processSessionStoreOperations(operations, sessionStoreStrategy) {
  var numberOfRetries = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : 0;
  var isLockEnabled = sessionStoreStrategy.isLockEnabled, persistSession = sessionStoreStrategy.persistSession, expireSession = sessionStoreStrategy.expireSession;
  var persistWithLock = function persistWithLock2(session) {
    return persistSession(assign({}, session, {
      lock: currentLock
    }));
  };
  var retrieveStore = function retrieveStore2() {
    var _sessionStoreStrategy = sessionStoreStrategy.retrieveSession(), lock = _sessionStoreStrategy.lock, session = _objectWithoutProperties(_sessionStoreStrategy, _excluded);
    return {
      session,
      lock: lock && !isLockExpired(lock) ? lock : void 0
    };
  };
  if (!ongoingOperations) {
    ongoingOperations = operations;
  }
  if (operations !== ongoingOperations) {
    bufferedOperations.push(operations);
    return;
  }
  if (isLockEnabled && numberOfRetries >= LOCK_MAX_TRIES) {
    addTelemetryDebug("Aborted session operation after max lock retries", {
      currentStore: retrieveStore()
    });
    next(sessionStoreStrategy);
    return;
  }
  var currentLock;
  var currentStore = retrieveStore();
  if (isLockEnabled) {
    if (currentStore.lock) {
      retryLater(operations, sessionStoreStrategy, numberOfRetries);
      return;
    }
    currentLock = createLock();
    persistWithLock(currentStore.session);
    currentStore = retrieveStore();
    if (currentStore.lock !== currentLock) {
      retryLater(operations, sessionStoreStrategy, numberOfRetries);
      return;
    }
  }
  var processedSession = operations.process(currentStore.session);
  if (isLockEnabled) {
    currentStore = retrieveStore();
    if (currentStore.lock !== currentLock) {
      retryLater(operations, sessionStoreStrategy, numberOfRetries);
      return;
    }
  }
  if (processedSession) {
    if (isSessionInExpiredState(processedSession)) {
      expireSession();
    } else {
      expandSessionState(processedSession);
      isLockEnabled ? persistWithLock(processedSession) : persistSession(processedSession);
    }
  }
  if (isLockEnabled) {
    if (!(processedSession && isSessionInExpiredState(processedSession))) {
      currentStore = retrieveStore();
      if (currentStore.lock !== currentLock) {
        retryLater(operations, sessionStoreStrategy, numberOfRetries);
        return;
      }
      persistSession(currentStore.session);
      processedSession = currentStore.session;
    }
  }
  if (operations.after) {
    operations.after(processedSession || currentStore.session);
  }
  next(sessionStoreStrategy);
}
function retryLater(operations, sessionStore, currentNumberOfRetries) {
  setTimeout$1(function() {
    processSessionStoreOperations(operations, sessionStore, currentNumberOfRetries + 1);
  }, LOCK_RETRY_DELAY);
}
function next(sessionStore) {
  ongoingOperations = void 0;
  var nextOperations = bufferedOperations.shift();
  if (nextOperations) {
    processSessionStoreOperations(nextOperations, sessionStore);
  }
}
function createLock() {
  return UUID() + LOCK_SEPARATOR + timeStampNow();
}
function isLockExpired(lock) {
  var _lock$split = lock.split(LOCK_SEPARATOR), _lock$split2 = _slicedToArray$2(_lock$split, 2), timeStamp = _lock$split2[1];
  return !timeStamp || elapsed(Number(timeStamp), timeStampNow()) > LOCK_EXPIRATION_DELAY;
}
var STORAGE_POLL_DELAY = ONE_SECOND;
function selectSessionStoreStrategyType(initConfiguration) {
  switch (initConfiguration.sessionPersistence) {
    case SessionPersistence.COOKIE:
      return selectCookieStrategy(initConfiguration);
    case SessionPersistence.LOCAL_STORAGE:
      return selectLocalStorageStrategy();
    case void 0: {
      var sessionStoreStrategyType = selectCookieStrategy(initConfiguration);
      if (!sessionStoreStrategyType && initConfiguration.allowFallbackToLocalStorage) {
        sessionStoreStrategyType = selectLocalStorageStrategy();
      }
      return sessionStoreStrategyType;
    }
    default:
      display.error("Invalid session persistence '".concat(String(initConfiguration.sessionPersistence), "'"));
  }
}
function startSessionStore(sessionStoreStrategyType, productKey, computeSessionState2) {
  var renewObservable = new Observable();
  var expireObservable = new Observable();
  var sessionStateUpdateObservable = new Observable();
  var sessionStoreStrategy = sessionStoreStrategyType.type === SessionPersistence.COOKIE ? initCookieStrategy(sessionStoreStrategyType.cookieOptions) : initLocalStorageStrategy();
  var expireSession = sessionStoreStrategy.expireSession;
  var watchSessionTimeoutId = setInterval(watchSession, STORAGE_POLL_DELAY);
  var sessionCache;
  startSession();
  var _throttle = throttle(function() {
    processSessionStoreOperations({
      process: function process(sessionState) {
        if (isSessionInNotStartedState(sessionState)) {
          return;
        }
        var synchronizedSession = synchronizeSession(sessionState);
        expandOrRenewSessionState(synchronizedSession);
        return synchronizedSession;
      },
      after: function after(sessionState) {
        if (isSessionStarted(sessionState) && !hasSessionInCache()) {
          renewSessionInCache(sessionState);
        }
        sessionCache = sessionState;
      }
    }, sessionStoreStrategy);
  }, STORAGE_POLL_DELAY), throttledExpandOrRenewSession = _throttle.throttled, cancelExpandOrRenewSession = _throttle.cancel;
  function expandSession() {
    processSessionStoreOperations({
      process: function process(sessionState) {
        return hasSessionInCache() ? synchronizeSession(sessionState) : void 0;
      }
    }, sessionStoreStrategy);
  }
  function watchSession() {
    processSessionStoreOperations({
      process: function process(sessionState) {
        return isSessionInExpiredState(sessionState) ? getExpiredSessionState() : void 0;
      },
      after: synchronizeSession
    }, sessionStoreStrategy);
  }
  function synchronizeSession(sessionState) {
    if (isSessionInExpiredState(sessionState)) {
      sessionState = getExpiredSessionState();
    }
    if (hasSessionInCache()) {
      if (isSessionInCacheOutdated(sessionState)) {
        expireSessionInCache();
      } else {
        sessionStateUpdateObservable.notify({
          previousState: sessionCache,
          newState: sessionState
        });
        sessionCache = sessionState;
      }
    }
    return sessionState;
  }
  function startSession() {
    processSessionStoreOperations({
      process: function process(sessionState) {
        if (isSessionInNotStartedState(sessionState) || isSessionInExpiredState(sessionState)) {
          return getExpiredSessionState();
        }
      },
      after: function after(sessionState) {
        sessionCache = sessionState;
      }
    }, sessionStoreStrategy);
  }
  function expandOrRenewSessionState(sessionState) {
    if (isSessionInNotStartedState(sessionState)) {
      return false;
    }
    var _computeSessionState = computeSessionState2(sessionState[productKey]), trackingType = _computeSessionState.trackingType, isTracked = _computeSessionState.isTracked;
    sessionState[productKey] = trackingType;
    delete sessionState.isExpired;
    if (isTracked && !sessionState.id) {
      sessionState.id = UUID();
      sessionState.created = String(dateNow());
    }
  }
  function hasSessionInCache() {
    return sessionCache[productKey] !== void 0;
  }
  function isSessionInCacheOutdated(sessionState) {
    return sessionCache.id !== sessionState.id || sessionCache[productKey] !== sessionState[productKey];
  }
  function expireSessionInCache() {
    sessionCache = getExpiredSessionState();
    expireObservable.notify();
  }
  function renewSessionInCache(sessionState) {
    sessionCache = sessionState;
    renewObservable.notify();
  }
  function updateSessionState(partialSessionState) {
    processSessionStoreOperations({
      process: function process(sessionState) {
        return assign({}, sessionState, partialSessionState);
      },
      after: synchronizeSession
    }, sessionStoreStrategy);
  }
  return {
    expandOrRenewSession: throttledExpandOrRenewSession,
    expandSession,
    getSession: function getSession() {
      return sessionCache;
    },
    renewObservable,
    expireObservable,
    sessionStateUpdateObservable,
    restartSession: startSession,
    expire: function expire() {
      cancelExpandOrRenewSession();
      expireSession();
      synchronizeSession(getExpiredSessionState());
    },
    stop: function stop() {
      clearInterval(watchSessionTimeoutId);
    },
    updateSessionState
  };
}
var DefaultPrivacyLevel = {
  ALLOW: "allow",
  MASK: "mask",
  MASK_USER_INPUT: "mask-user-input"
};
function validateAndBuildConfiguration(initConfiguration) {
  if (initConfiguration.sampleRate !== void 0 && !isPercentage(initConfiguration.sampleRate)) {
    display.error("Sample Rate should be a number between 0 and 100");
    return;
  }
  if (initConfiguration.sessionSampleRate !== void 0 && !isPercentage(initConfiguration.sessionSampleRate)) {
    display.error("Sample Rate should be a number between 0 and 100");
    return;
  }
  if (initConfiguration.telemetrySampleRate !== void 0 && !isPercentage(initConfiguration.telemetrySampleRate)) {
    display.error("Telemetry Sample Rate should be a number between 0 and 100");
    return;
  }
  var sessionSampleRate = isNullUndefinedDefaultValue(initConfiguration.sessionSampleRate, initConfiguration.sampleRate);
  return assign({
    beforeSend: initConfiguration.beforeSend && catchUserErrors(initConfiguration.beforeSend, "beforeSend threw an error:"),
    sessionStoreStrategyType: selectSessionStoreStrategyType(initConfiguration),
    isOpenWay: initConfiguration.site && initConfiguration.clientToken,
    sessionSampleRate: isNullUndefinedDefaultValue(sessionSampleRate, 100),
    service: initConfiguration.service,
    version: initConfiguration.version,
    env: initConfiguration.env,
    telemetrySampleRate: isNullUndefinedDefaultValue(initConfiguration.telemetrySampleRate, 100),
    telemetryEnabled: isNullUndefinedDefaultValue(initConfiguration.telemetryEnabled, false),
    silentMultipleInit: !!initConfiguration.silentMultipleInit,
    /**
     * beacon payload max queue size implementation is 64kb
     * ensure that we leave room for logs, rum and potential other users
     */
    batchBytesLimit: 16 * ONE_KIBI_BYTE,
    eventRateLimiterThreshold: 3e3,
    maxTelemetryEventsPerPage: 15,
    /**
     * flush automatically, aim to be lower than ALB connection timeout
     * to maximize connection reuse.
     */
    flushTimeout: 30 * ONE_SECOND,
    /**
     * Logs intake limit
     */
    batchMessagesLimit: 50,
    messageBytesLimit: 256 * ONE_KIBI_BYTE,
    resourceUrlLimit: 5 * ONE_KIBI_BYTE,
    storeContextsToLocal: !!initConfiguration.storeContextsToLocal,
    // localstorage key ，default auto gen
    storeContextsKey: initConfiguration.storeContextsKey,
    sendContentTypeByJson: !!initConfiguration.sendContentTypeByJson,
    retryMaxSize: isNullUndefinedDefaultValue(initConfiguration.retryMaxSize, -1)
  }, computeTransportConfiguration(initConfiguration));
}
function validatePostRequestRequireParamsConfiguration(initConfiguration) {
  if (!initConfiguration.site && !initConfiguration.datakitOrigin && !initConfiguration.datakitUrl) {
    display.error("datakitOrigin or site is not configured, no RUM data will be collected.");
    return false;
  }
  if (initConfiguration.site && !initConfiguration.clientToken) {
    display.error("clientToken is not configured, no RUM data will be collected.");
    return false;
  }
  return true;
}
function _typeof$b(o) {
  "@babel/helpers - typeof";
  return _typeof$b = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(o2) {
    return typeof o2;
  } : function(o2) {
    return o2 && "function" == typeof Symbol && o2.constructor === Symbol && o2 !== Symbol.prototype ? "symbol" : typeof o2;
  }, _typeof$b(o);
}
function ownKeys$2(e, r) {
  var t = Object.keys(e);
  if (Object.getOwnPropertySymbols) {
    var o = Object.getOwnPropertySymbols(e);
    r && (o = o.filter(function(r2) {
      return Object.getOwnPropertyDescriptor(e, r2).enumerable;
    })), t.push.apply(t, o);
  }
  return t;
}
function _objectSpread$2(e) {
  for (var r = 1; r < arguments.length; r++) {
    var t = null != arguments[r] ? arguments[r] : {};
    r % 2 ? ownKeys$2(Object(t), true).forEach(function(r2) {
      _defineProperty$4(e, r2, t[r2]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys$2(Object(t)).forEach(function(r2) {
      Object.defineProperty(e, r2, Object.getOwnPropertyDescriptor(t, r2));
    });
  }
  return e;
}
function _defineProperty$4(e, r, t) {
  return (r = _toPropertyKey$4(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: true, configurable: true, writable: true }) : e[r] = t, e;
}
function _toPropertyKey$4(t) {
  var i = _toPrimitive$4(t, "string");
  return "symbol" == _typeof$b(i) ? i : i + "";
}
function _toPrimitive$4(t, r) {
  if ("object" != _typeof$b(t) || !t) return t;
  var e = t[Symbol.toPrimitive];
  if (void 0 !== e) {
    var i = e.call(t, r);
    if ("object" != _typeof$b(i)) return i;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return ("string" === r ? String : Number)(t);
}
function _slicedToArray$1(r, e) {
  return _arrayWithHoles$1(r) || _iterableToArrayLimit$1(r, e) || _unsupportedIterableToArray$2(r, e) || _nonIterableRest$1();
}
function _nonIterableRest$1() {
  throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}
function _unsupportedIterableToArray$2(r, a) {
  if (r) {
    if ("string" == typeof r) return _arrayLikeToArray$2(r, a);
    var t = {}.toString.call(r).slice(8, -1);
    return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray$2(r, a) : void 0;
  }
}
function _arrayLikeToArray$2(r, a) {
  (null == a || a > r.length) && (a = r.length);
  for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e];
  return n;
}
function _iterableToArrayLimit$1(r, l) {
  var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"];
  if (null != t) {
    var e, n, i, u, a = [], f = true, o = false;
    try {
      if (i = (t = t.call(r)).next, 0 === l) ;
      else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = true) ;
    } catch (r2) {
      o = true, n = r2;
    } finally {
      try {
        if (!f && null != t["return"] && (u = t["return"](), Object(u) !== u)) return;
      } finally {
        if (o) throw n;
      }
    }
    return a;
  }
}
function _arrayWithHoles$1(r) {
  if (Array.isArray(r)) return r;
}
function fetchAndApplyRemoteConfiguration(initConfiguration, callback) {
  fetchRemoteConfiguration(initConfiguration, function(remoteInitConfiguration) {
    callback(applyRemoteConfiguration(initConfiguration, remoteInitConfiguration), getSimpleRemoteConfiguration(initConfiguration, remoteInitConfiguration));
  });
}
var modifiableFieldPaths = {
  sessionSampleRate: "number",
  telemetrySampleRate: "number",
  silentMultipleInit: "boolean",
  service: "string",
  env: "string",
  version: "string",
  tracingSampleRate: "number",
  useCrossSiteSessionCookie: "boolean",
  usePartitionedCrossSiteSessionCookie: "boolean",
  useSecureSessionCookie: "boolean",
  trackSessionAcrossSubdomains: "boolean",
  storeContextsToLocal: "boolean",
  storeContextsKey: "string",
  sendContentTypeByJson: "boolean",
  allowFallbackToLocalStorage: "boolean",
  sessionOnErrorSampleRate: "number",
  sessionReplaySampleRate: "number",
  sessionReplayOnErrorSampleRate: "number",
  trackUserInteractions: "boolean",
  trackInteractions: "boolean",
  actionNameAttribute: "string",
  trackViewsManually: "boolean",
  workerUrl: "string",
  replayCanvasWorkerUrl: "string",
  compressIntakeRequests: "boolean",
  traceType: "string"
};
function modificationByFieldsPath(remoteConfiguration, modifiableFieldPaths2) {
  var result = {};
  objectEntries(modifiableFieldPaths2).forEach(function(_ref) {
    var _ref2 = _slicedToArray$1(_ref, 2), fieldPath = _ref2[0], fieldType = _ref2[1];
    var remoteValue = remoteConfiguration[fieldPath];
    if (getType(remoteValue) === fieldType) {
      result[fieldPath] = remoteValue;
    }
  });
  return result;
}
function getSimpleRemoteConfiguration(initConfiguration, remoteInitConfiguration) {
  var simpleRemoteInitConfiguration = {};
  for (var key in remoteInitConfiguration) {
    if (remoteInitConfiguration[key] !== void 0) {
      var simpleKey = key.replace("R." + initConfiguration.applicationId + ".", "");
      simpleRemoteInitConfiguration[simpleKey] = remoteInitConfiguration[key];
    }
  }
  return simpleRemoteInitConfiguration;
}
function applyRemoteConfiguration(initConfiguration, remoteInitConfiguration) {
  var simpleRemoteInitConfiguration = getSimpleRemoteConfiguration(initConfiguration, remoteInitConfiguration);
  return _objectSpread$2(_objectSpread$2({}, initConfiguration), modificationByFieldsPath(simpleRemoteInitConfiguration, modifiableFieldPaths));
}
function fetchRemoteConfiguration(configuration, callback) {
  var xhr = new XMLHttpRequest();
  addEventListener(xhr, "load", function() {
    if (xhr.status === 200) {
      var remoteConfiguration = JSON.parse(xhr.responseText);
      callback(remoteConfiguration.content);
    } else {
      callback({});
      displayRemoteConfigurationFetchingError();
    }
  });
  addEventListener(xhr, "error", function() {
    callback({});
    displayRemoteConfigurationFetchingError();
  });
  xhr.open("GET", buildEndpoint(configuration));
  xhr.send();
}
function buildEndpoint(configuration) {
  var url = configuration.datakitOrigin || configuration.datakitUrl || configuration.site;
  if (url.indexOf("/") === 0) {
    url = location.origin + trim(url);
  }
  var endpoint = url;
  if (url.lastIndexOf("/") === url.length - 1) {
    endpoint = trim(url) + "v1/env_variable";
  } else {
    endpoint = trim(url) + "/v1/env_variable";
  }
  endpoint += "?app_id=" + configuration.applicationId;
  if (configuration.site && configuration.clientToken) {
    endpoint = endpoint + "&token=" + configuration.clientToken + "&to_headless=true";
  }
  return endpoint;
}
function displayRemoteConfigurationFetchingError() {
  display.error("Error fetching the remote configuration.");
}
var fetchObservable;
function initFetchObservable() {
  if (!fetchObservable) {
    fetchObservable = createFetchObservable();
  }
  return fetchObservable;
}
function createFetchObservable() {
  return new Observable(function(observable) {
    if (!window.fetch) {
      return;
    }
    var fetchMethod = instrumentMethod(window, "fetch", function(call) {
      return beforeSend(call, observable);
    }, {
      computeHandlingStack: true
    });
    return fetchMethod.stop;
  });
}
function beforeSend(params, observable) {
  var parameters = params.parameters;
  var onPostCall = params.onPostCall;
  var handlingStack = params.handlingStack;
  var input = parameters[0];
  var init = parameters[1];
  var methodFromParams = init && init.method;
  if (methodFromParams === void 0 && input instanceof Request) {
    methodFromParams = input.method;
  }
  var method = methodFromParams !== void 0 ? String(methodFromParams).toUpperCase() : "GET";
  var url = input instanceof Request ? input.url : normalizeUrl(String(input));
  var startClocks = clocksNow();
  var context = {
    state: "start",
    init,
    input,
    method,
    startClocks,
    url,
    handlingStack
  };
  observable.notify(context);
  parameters[0] = context.input;
  parameters[1] = context.init;
  onPostCall(function(responsePromise) {
    return afterSend(observable, responsePromise, context);
  });
}
function afterSend(observable, responsePromise, startContext) {
  var context = startContext;
  var reportFetch = function reportFetch2(partialContext) {
    context.state = "resolve";
    assign(context, partialContext);
    observable.notify(context);
  };
  responsePromise.then(monitor(function(response) {
    var responseType = "";
    try {
      responseType = response.constructor === Response && response.type || "";
    } catch (err) {
      responseType = "";
    }
    reportFetch({
      response,
      responseType,
      status: response.status,
      isAborted: false
    });
  }), monitor(function(error) {
    reportFetch({
      status: 0,
      isAborted: context.init && context.init.signal && context.init.signal.aborted || error instanceof DOMException && error.code === DOMException.ABORT_ERR,
      error
    });
  }));
}
var xhrObservable;
var xhrContexts = /* @__PURE__ */ new WeakMap();
function initXhrObservable() {
  if (!xhrObservable) {
    xhrObservable = createXhrObservable();
  }
  return xhrObservable;
}
function createXhrObservable() {
  return new Observable(function(observable) {
    var openInstrumentMethod = instrumentMethod(XMLHttpRequest.prototype, "open", openXhr);
    var sendInstrumentMethod = instrumentMethod(XMLHttpRequest.prototype, "send", function(call) {
      sendXhr(call, observable);
    }, {
      computeHandlingStack: true
    });
    var setRequestHeaderInstrumentMethod = instrumentMethod(XMLHttpRequest.prototype, "setRequestHeader", setRequestHeaderXhr);
    var abortInstrumentMethod = instrumentMethod(XMLHttpRequest.prototype, "abort", abortXhr);
    return function() {
      openInstrumentMethod.stop();
      sendInstrumentMethod.stop();
      abortInstrumentMethod.stop();
      setRequestHeaderInstrumentMethod.stop();
    };
  });
}
function openXhr(params) {
  var xhr = params.target;
  var method = params.parameters[0];
  var url = params.parameters[1];
  xhrContexts.set(xhr, {
    state: "open",
    method: String(method).toUpperCase(),
    url: normalizeUrl(String(url))
  });
}
function setRequestHeaderXhr(params) {
  var xhr = params.target;
  var headerKey = params.parameters[0];
  var headerValue = params.parameters[1];
  var context = xhrContexts.get(xhr);
  if (context && headerKey) {
    var requestHeaderContexts = context.requestHeaderContexts || {};
    requestHeaderContexts[headerKey] = headerValue;
    context.requestHeaderContexts = requestHeaderContexts;
  }
}
function sendXhr(params, observable) {
  var xhr = params.target;
  var handlingStack = params.handlingStack;
  var context = xhrContexts.get(xhr);
  if (!context) {
    return;
  }
  var startContext = context;
  startContext.state = "start";
  startContext.startClocks = clocksNow();
  startContext.isAborted = false;
  startContext.xhr = xhr;
  startContext.handlingStack = handlingStack;
  var hasBeenReported = false;
  var stopInstrumentingOnReadyStateChange = instrumentMethod(xhr, "onreadystatechange", function() {
    if (xhr.readyState === XMLHttpRequest.DONE) {
      onEnd();
    }
  }).stop;
  var onEnd = function onEnd2() {
    unsubscribeLoadEndListener();
    stopInstrumentingOnReadyStateChange();
    if (hasBeenReported) {
      return;
    }
    hasBeenReported = true;
    var completeContext = context;
    completeContext.state = "complete";
    completeContext.duration = elapsed(startContext.startClocks.timeStamp, timeStampNow());
    completeContext.status = xhr.status;
    observable.notify(shallowClone(completeContext));
  };
  var unsubscribeLoadEndListener = addEventListener(xhr, "loadend", onEnd).stop;
  observable.notify(startContext);
}
function abortXhr(params) {
  var xhr = params.target;
  var context = xhrContexts.get(xhr);
  if (context) {
    context.isAborted = true;
  }
}
var PageExitReason = {
  HIDDEN: "visibility_hidden",
  UNLOADING: "before_unload",
  PAGEHIDE: "page_hide",
  FROZEN: "page_frozen"
};
function createPageExitObservable() {
  return new Observable(function(observable) {
    var visibilityChangeListener = addEventListeners(window, [DOM_EVENT.VISIBILITY_CHANGE, DOM_EVENT.FREEZE], function(event) {
      if (event.type === DOM_EVENT.VISIBILITY_CHANGE && document.visibilityState === "hidden") {
        observable.notify({
          reason: PageExitReason.HIDDEN
        });
      } else if (event.type === DOM_EVENT.FREEZE) {
        observable.notify({
          reason: PageExitReason.FROZEN
        });
      }
    }, {
      capture: true
    });
    var beforeUnloadListener = addEventListener(window, DOM_EVENT.BEFORE_UNLOAD, function() {
      observable.notify({
        reason: PageExitReason.UNLOADING
      });
    });
    return function() {
      visibilityChangeListener.stop();
      beforeUnloadListener.stop();
    };
  });
}
function isPageExitReason(reason) {
  return includes(values(PageExitReason), reason);
}
function isTextNode(node) {
  return node.nodeType === Node.TEXT_NODE;
}
function isElementNode(node) {
  return node.nodeType === Node.ELEMENT_NODE;
}
function isNodeShadowHost(node) {
  return isElementNode(node) && Boolean(node.shadowRoot);
}
function isNodeShadowRoot(node) {
  var shadowRoot = node;
  return !!shadowRoot.host && shadowRoot.nodeType === Node.DOCUMENT_FRAGMENT_NODE && isElementNode(shadowRoot.host);
}
function hasChildNodes(node) {
  return node.childNodes.length > 0 || isNodeShadowHost(node);
}
function forEachChildNodes(node, callback) {
  var child = node.firstChild;
  while (child) {
    callback(child);
    child = child.nextSibling;
  }
  if (isNodeShadowHost(node)) {
    callback(node.shadowRoot);
  }
}
function getParentNode(node) {
  return isNodeShadowRoot(node) ? node.host : node.parentNode;
}
function runOnReadyState(expectedReadyState, callback) {
  if (document.readyState === expectedReadyState || document.readyState === "complete") {
    callback();
    return {
      stop: noop
    };
  } else {
    var eventName = expectedReadyState === "complete" ? DOM_EVENT.LOAD : DOM_EVENT.DOM_CONTENT_LOADED;
    return addEventListener(window, eventName, callback, {
      once: true
    });
  }
}
function getScrollX() {
  var scrollX;
  var visual = window.visualViewport;
  if (visual) {
    scrollX = visual.pageLeft - visual.offsetLeft;
  } else if (window.scrollX !== void 0) {
    scrollX = window.scrollX;
  } else {
    scrollX = window.pageXOffset || 0;
  }
  return Math.round(scrollX);
}
function getScrollY() {
  var scrollY;
  var visual = window.visualViewport;
  if (visual) {
    scrollY = visual.pageTop - visual.offsetTop;
  } else if (window.scrollY !== void 0) {
    scrollY = window.scrollY;
  } else {
    scrollY = window.pageYOffset || 0;
  }
  return Math.round(scrollY);
}
var commonTags = {
  sdk_name: "_gc.sdk_name",
  sdk_version: "_gc.sdk_version",
  app_id: "application.id",
  env: "env",
  service: "service",
  version: "version",
  source: "source",
  userid: "user.id",
  user_email: "user.email",
  user_name: "user.name",
  session_id: "session.id",
  session_type: "session.type",
  session_is_forced: "session.is_forced_session",
  session_sampling: "session.is_sampling",
  is_signin: "user.is_signin",
  os: "device.os",
  os_version: "device.os_version",
  os_version_major: "device.os_version_major",
  browser: "device.browser",
  browser_version: "device.browser_version",
  browser_version_major: "device.browser_version_major",
  screen_size: "device.screen_size",
  network_type: "device.network_type",
  time_zone: "device.time_zone",
  device: "device.device",
  user_agent: "device.user_agent",
  view_id: "view.id",
  view_referrer: "view.referrer",
  view_url: "view.url",
  view_host: "view.host",
  view_path: "view.path",
  view_name: "view.name",
  view_path_group: "view.path_group",
  view_path_name: "view.pathname"
};
var commonFields = {
  view_url_query: "view.url_query",
  action_id: "action.id",
  action_ids: "action.ids",
  view_in_foreground: "view.in_foreground",
  display: "display",
  session_has_replay: "session.has_replay",
  is_login: "user.is_login",
  page_states: "_gc.page_states",
  session_sample_rate: "_gc.configuration.session_sample_rate",
  session_replay_sample_rate: "_gc.configuration.session_replay_sample_rate",
  session_on_error_sample_rate: "_gc.configuration.session_on_error_sample_rate",
  session_replay_on_error_sample_rate: "_gc.configuration.session_replay_on_error_sample_rate",
  drift: "_gc.drift"
};
var dataMap = {
  view: {
    type: RumEventType.VIEW,
    tags: {
      view_loading_type: "view.loading_type",
      view_apdex_level: "view.apdex_level",
      view_privacy_replay_level: "privacy.replay_level"
    },
    fields: {
      view_update_time: "_gc.view_update_time",
      sampled_for_replay: "session.sampled_for_replay",
      sampled_for_error_replay: "session.sampled_for_error_replay",
      sampled_for_error_session: "session.sampled_for_error_session",
      session_error_timestamp: "session.error_timestamp_for_session",
      is_active: "view.is_active",
      session_replay_stats: "_gc.replay_stats",
      session_is_active: "session.is_active",
      view_error_count: "view.error.count",
      view_resource_count: "view.resource.count",
      view_long_task_count: "view.long_task.count",
      view_action_count: "view.action.count",
      first_contentful_paint: "view.first_contentful_paint",
      largest_contentful_paint: "view.largest_contentful_paint",
      largest_contentful_paint_element_selector: "view.largest_contentful_paint_element_selector",
      cumulative_layout_shift: "view.cumulative_layout_shift",
      cumulative_layout_shift_time: "view.cumulative_layout_shift_time",
      cumulative_layout_shift_target_selector: "view.cumulative_layout_shift_target_selector",
      first_input_delay: "view.first_input_delay",
      loading_time: "view.loading_time",
      dom_interactive: "view.dom_interactive",
      dom_content_loaded: "view.dom_content_loaded",
      dom_complete: "view.dom_complete",
      load_event: "view.load_event",
      first_input_time: "view.first_input_time",
      first_input_target_selector: "view.first_input_target_selector",
      first_paint_time: "view.fpt",
      interaction_to_next_paint: "view.interaction_to_next_paint",
      interaction_to_next_paint_target_selector: "view.interaction_to_next_paint_target_selector",
      resource_load_time: "view.resource_load_time",
      time_to_interactive: "view.tti",
      dom: "view.dom",
      dom_ready: "view.dom_ready",
      time_spent: "view.time_spent",
      first_byte: "view.first_byte",
      frustration_count: "view.frustration.count",
      custom_timings: "view.custom_timings"
    }
  },
  resource: {
    type: RumEventType.RESOURCE,
    tags: {
      trace_id: "_gc.trace_id",
      span_id: "_gc.span_id",
      resource_id: "resource.id",
      resource_status: "resource.status",
      resource_status_group: "resource.status_group",
      resource_method: "resource.method"
    },
    fields: {
      duration: "resource.duration",
      resource_size: "resource.size",
      resource_url: "resource.url",
      resource_url_host: "resource.url_host",
      resource_url_path: "resource.url_path",
      resource_url_path_group: "resource.url_path_group",
      resource_url_query: "resource.url_query",
      resource_delivery_type: "resource.delivery_type",
      resource_type: "resource.type",
      resource_protocol: "resource.protocol",
      resource_encode_size: "resource.encoded_body_size",
      resource_decode_size: "resource.decoded_body_size",
      resource_transfer_size: "resource.transfer_size",
      resource_render_blocking_status: "resource.render_blocking_status",
      resource_dns: "resource.dns",
      resource_tcp: "resource.tcp",
      resource_ssl: "resource.ssl",
      resource_ttfb: "resource.ttfb",
      resource_trans: "resource.trans",
      resource_redirect: "resource.redirect",
      resource_first_byte: "resource.firstbyte",
      resource_dns_time: "resource.dns_time",
      resource_download_time: "resource.download_time",
      resource_first_byte_time: "resource.first_byte_time",
      resource_connect_time: "resource.connect_time",
      resource_ssl_time: "resource.ssl_time",
      resource_redirect_time: "resource.redirect_time"
    }
  },
  error: {
    type: RumEventType.ERROR,
    tags: {
      error_id: "error.id",
      trace_id: "_gc.trace_id",
      span_id: "_gc.span_id",
      error_source: "error.source",
      error_type: "error.type",
      error_handling: "error.handling"
      //   resource_url: 'error.resource.url',
      //   resource_url_host: 'error.resource.url_host',
      //   resource_url_path: 'error.resource.url_path',
      //   resource_url_path_group: 'error.resource.url_path_group',
      //   resource_status: 'error.resource.status',
      //   resource_status_group: 'error.resource.status_group',
      //   resource_method: 'error.resource.method'
    },
    fields: {
      error_message: ["string", "error.message"],
      error_stack: ["string", "error.stack"],
      error_causes: ["string", "error.causes"],
      error_handling_stack: ["string", "error.handling_stack"]
    }
  },
  long_task: {
    type: RumEventType.LONG_TASK,
    tags: {
      long_task_id: "long_task.id"
    },
    fields: {
      duration: "long_task.duration",
      blocking_duration: "long_task.blocking_duration",
      first_ui_event_timestamp: "long_task.first_ui_event_timestamp",
      render_start: "long_task.render_start",
      style_and_layout_start: "long_task.style_and_layout_start",
      long_task_start_time: "long_task.start_time",
      scripts: ["string", "long_task.scripts"]
    }
  },
  action: {
    type: RumEventType.ACTION,
    tags: {
      action_type: "action.type"
    },
    fields: {
      action_name: "action.target.name",
      duration: "action.loading_time",
      action_error_count: "action.error.count",
      action_resource_count: "action.resource.count",
      action_frustration_types: "action.frustration.type",
      action_long_task_count: "action.long_task.count",
      action_target: "_gc.action.target",
      action_position: "_gc.action.position"
    }
  },
  telemetry: {
    type: "telemetry",
    fields: {
      status: "telemetry.status",
      message: ["string", "telemetry.message"],
      type: "telemetry.type",
      error_stack: ["string", "telemetry.error.stack"],
      error_kind: ["string", "telemetry.error.kind"],
      connectivity: ["string", "telemetry.connectivity"],
      runtime_env: ["string", "telemetry.runtime_env"],
      usage: ["string", "telemetry.usage"],
      configuration: ["string", "telemetry.configuration"]
    }
  },
  browser_log: {
    type: RumEventType.LOGGER,
    tags: {
      error_source: "error.source",
      error_type: "error.type",
      error_resource_url: "http.url",
      error_resource_url_host: "http.url_host",
      error_resource_url_path: "http.url_path",
      error_resource_url_path_group: "http.url_path_group",
      error_resource_status: "http.status_code",
      error_resource_status_group: "http.status_group",
      error_resource_method: "http.method",
      action_id: "user_action.id",
      service: "service",
      status: "status"
    },
    fields: {
      message: ["string", "message"],
      error_message: ["string", "error.message"],
      error_stack: ["string", "error.stack"]
    }
  }
};
var VISIBILITY_CHECK_DELAY = ONE_MINUTE;
var SESSION_CONTEXT_TIMEOUT_DELAY = SESSION_TIME_OUT_DELAY;
function startSessionManager(configuration, productKey, computeSessionState2) {
  var renewObservable = new Observable();
  var expireObservable = new Observable();
  var sessionStore = startSessionStore(configuration.sessionStoreStrategyType, productKey, computeSessionState2);
  var sessionContextHistory = createValueHistory({
    expireDelay: SESSION_CONTEXT_TIMEOUT_DELAY
  });
  sessionStore.renewObservable.subscribe(function() {
    sessionContextHistory.add(buildSessionContext(), relativeNow());
    renewObservable.notify();
  });
  sessionStore.expireObservable.subscribe(function() {
    expireObservable.notify();
    sessionContextHistory.closeActive(relativeNow());
  });
  sessionStore.expandOrRenewSession();
  sessionContextHistory.add(buildSessionContext(), clocksOrigin().relative);
  trackActivity(function() {
    sessionStore.expandOrRenewSession();
  });
  trackVisibility(function() {
    return sessionStore.expandSession();
  });
  trackResume(function() {
    sessionStore.restartSession();
  });
  function buildSessionContext() {
    var session = sessionStore.getSession();
    if (!session) {
      return {
        id: "invalid",
        trackingType: SESSION_NOT_TRACKED,
        isSessionForced: false,
        hasError: false
      };
    }
    return {
      id: session.id,
      trackingType: session[productKey],
      hasError: !!session.hasError,
      isSessionForced: !!session.forcedSession
    };
  }
  return {
    findSession: function findSession(startTime, options) {
      return sessionContextHistory.find(startTime, options);
    },
    expandOrRenewSession: sessionStore.expandOrRenewSession,
    renewObservable,
    expireObservable,
    sessionStateUpdateObservable: sessionStore.sessionStateUpdateObservable,
    expire: sessionStore.expire,
    updateSessionState: sessionStore.updateSessionState
  };
}
function trackActivity(expandOrRenewSession) {
  var _addEventListeners = addEventListeners(window, [DOM_EVENT.CLICK, DOM_EVENT.TOUCH_START, DOM_EVENT.KEY_DOWN, DOM_EVENT.SCROLL], expandOrRenewSession, {
    capture: true,
    passive: true
  });
  _addEventListeners.stop;
}
function trackVisibility(expandSession) {
  var expandSessionWhenVisible = function expandSessionWhenVisible2() {
    if (document.visibilityState === "visible") {
      expandSession();
    }
  };
  var _addEventListener = addEventListener(document, DOM_EVENT.VISIBILITY_CHANGE, expandSessionWhenVisible);
  _addEventListener.stop;
  setInterval(expandSessionWhenVisible, VISIBILITY_CHECK_DELAY);
}
function trackResume(cb) {
  var _addEventListener2 = addEventListener(window, DOM_EVENT.RESUME, cb, {
    capture: true
  });
  _addEventListener2.stop;
}
var MAX_ONGOING_BYTES_COUNT = 80 * ONE_KIBI_BYTE;
var MAX_ONGOING_REQUESTS = 32;
var MAX_QUEUE_BYTES_COUNT = 20 * ONE_MEBI_BYTE;
var MAX_BACKOFF_TIME = 256 * ONE_SECOND;
var INITIAL_BACKOFF_TIME = ONE_SECOND;
var TransportStatus = {
  UP: 0,
  FAILURE_DETECTED: 1,
  DOWN: 2
};
var RetryReason = {
  AFTER_SUCCESS: 0,
  AFTER_RESUME: 1
};
function sendWithRetryStrategy(payload, state2, sendStrategy, endpointUrl, reportError) {
  if (state2.transportStatus === TransportStatus.UP && state2.queuedPayloads.size() === 0 && state2.bandwidthMonitor.canHandle(payload)) {
    send(payload, state2, sendStrategy, {
      onSuccess: function onSuccess() {
        return retryQueuedPayloads(RetryReason.AFTER_SUCCESS, state2, sendStrategy, endpointUrl, reportError);
      },
      onFailure: function onFailure() {
        state2.queuedPayloads.enqueue(payload);
        scheduleRetry(state2, sendStrategy, endpointUrl, reportError);
      }
    });
  } else {
    state2.queuedPayloads.enqueue(payload);
  }
}
function scheduleRetry(state2, sendStrategy, endpointUrl, reportError) {
  if (state2.transportStatus !== TransportStatus.DOWN) {
    return;
  }
  setTimeout$1(function() {
    var payload = state2.queuedPayloads.first();
    send(payload, state2, sendStrategy, {
      onSuccess: function onSuccess() {
        state2.queuedPayloads.dequeue();
        state2.currentBackoffTime = INITIAL_BACKOFF_TIME;
        retryQueuedPayloads(RetryReason.AFTER_RESUME, state2, sendStrategy, endpointUrl, reportError);
      },
      onFailure: function onFailure() {
        state2.currentBackoffTime = Math.min(MAX_BACKOFF_TIME, state2.currentBackoffTime * 2);
        scheduleRetry(state2, sendStrategy, endpointUrl, reportError);
      }
    });
  }, state2.currentBackoffTime);
}
function send(payload, state2, sendStrategy, responseData) {
  var onSuccess = responseData.onSuccess;
  var onFailure = responseData.onFailure;
  state2.bandwidthMonitor.add(payload);
  sendStrategy(payload, function(response) {
    state2.bandwidthMonitor.remove(payload);
    if (!shouldRetryRequest(response, state2, payload)) {
      state2.transportStatus = TransportStatus.UP;
      onSuccess();
    } else {
      state2.transportStatus = state2.bandwidthMonitor.ongoingRequestCount > 0 ? TransportStatus.FAILURE_DETECTED : TransportStatus.DOWN;
      payload.retry = {
        count: payload.retry ? payload.retry.count + 1 : 1,
        lastFailureStatus: response.status
      };
      onFailure();
    }
  });
}
function retryQueuedPayloads(reason, state2, sendStrategy, endpointUrl, reportError) {
  if (reason === RetryReason.AFTER_SUCCESS && state2.queuedPayloads.isFull() && !state2.queueFullReported) {
    reportError({
      message: "Reached max " + endpointUrl + " events size queued for upload: " + MAX_QUEUE_BYTES_COUNT / ONE_MEBI_BYTE + "MiB",
      source: ErrorSource.AGENT,
      startClocks: clocksNow()
    });
    state2.queueFullReported = true;
  }
  var previousQueue = state2.queuedPayloads;
  state2.queuedPayloads = newPayloadQueue();
  while (previousQueue.size() > 0) {
    sendWithRetryStrategy(previousQueue.dequeue(), state2, sendStrategy, endpointUrl, reportError);
  }
}
function shouldRetryRequest(response, state2, payload) {
  if (state2.retryMaxSize > -1 && payload.retry && payload.retry.count > state2.retryMaxSize) return false;
  return response.type !== "opaque" && (response.status === 0 && !navigator.onLine || response.status === 408 || response.status === 429 || response.status >= 500);
}
function newRetryState(retryMaxSize) {
  return {
    transportStatus: TransportStatus.UP,
    currentBackoffTime: INITIAL_BACKOFF_TIME,
    bandwidthMonitor: newBandwidthMonitor(),
    queuedPayloads: newPayloadQueue(),
    queueFullReported: false,
    retryMaxSize
  };
}
function newPayloadQueue() {
  var queue = [];
  return {
    bytesCount: 0,
    enqueue: function enqueue(payload) {
      if (this.isFull()) {
        return;
      }
      queue.push(payload);
      this.bytesCount += payload.bytesCount;
    },
    first: function first() {
      return queue[0];
    },
    dequeue: function dequeue() {
      var payload = queue.shift();
      if (payload) {
        this.bytesCount -= payload.bytesCount;
      }
      return payload;
    },
    size: function size() {
      return queue.length;
    },
    isFull: function isFull() {
      return this.bytesCount >= MAX_QUEUE_BYTES_COUNT;
    }
  };
}
function newBandwidthMonitor() {
  return {
    ongoingRequestCount: 0,
    ongoingByteCount: 0,
    canHandle: function canHandle(payload) {
      return this.ongoingRequestCount === 0 || this.ongoingByteCount + payload.bytesCount <= MAX_ONGOING_BYTES_COUNT && this.ongoingRequestCount < MAX_ONGOING_REQUESTS;
    },
    add: function add(payload) {
      this.ongoingRequestCount += 1;
      this.ongoingByteCount += payload.bytesCount;
    },
    remove: function remove(payload) {
      this.ongoingRequestCount -= 1;
      this.ongoingByteCount -= payload.bytesCount;
    }
  };
}
function addBatchPrecision(url, encoding) {
  if (!url) return url;
  url = url + (url.indexOf("?") === -1 ? "?" : "&") + "precision=ms";
  if (encoding) {
    url = url + "&encoding=" + encoding;
  }
  return url;
}
function createHttpRequest(endpointUrl, bytesLimit, retryMaxSize, reportError) {
  if (retryMaxSize === void 0) {
    retryMaxSize = -1;
  }
  var retryState = newRetryState(retryMaxSize);
  var sendStrategyForRetry = function sendStrategyForRetry2(payload, onResponse) {
    return fetchKeepAliveStrategy(endpointUrl, bytesLimit, payload, onResponse);
  };
  return {
    send: function send2(payload) {
      sendWithRetryStrategy(payload, retryState, sendStrategyForRetry, endpointUrl, reportError);
    },
    /**
     * Since fetch keepalive behaves like regular fetch on Firefox,
     * keep using sendBeaconStrategy on exit
     */
    sendOnExit: function sendOnExit(payload) {
      sendBeaconStrategy(endpointUrl, bytesLimit, payload);
    }
  };
}
function sendBeaconStrategy(endpointUrl, bytesLimit, payload) {
  var data = payload.data;
  var bytesCount = payload.bytesCount;
  var url = addBatchPrecision(endpointUrl, payload.encoding);
  var canUseBeacon = !!navigator.sendBeacon && bytesCount < bytesLimit;
  if (canUseBeacon) {
    try {
      var beaconData;
      if (payload.type) {
        beaconData = new Blob([data], {
          type: payload.type
        });
      } else {
        beaconData = data;
      }
      var isQueued = navigator.sendBeacon(url, beaconData);
      if (isQueued) {
        return;
      }
    } catch (e) {
      reportBeaconError(e);
    }
  }
  sendXHR(url, payload);
}
var hasReportedBeaconError = false;
function reportBeaconError(e) {
  if (!hasReportedBeaconError) {
    hasReportedBeaconError = true;
    addTelemetryError(e);
  }
}
function fetchKeepAliveStrategy(endpointUrl, bytesLimit, payload, onResponse) {
  var data = payload.data;
  var bytesCount = payload.bytesCount;
  var url = addBatchPrecision(endpointUrl, payload.encoding);
  var canUseKeepAlive = isKeepAliveSupported() && bytesCount < bytesLimit;
  if (canUseKeepAlive) {
    var fetchOption = {
      method: "POST",
      body: data,
      keepalive: true,
      mode: "cors"
    };
    var headers = {
      "x-client-timestamp": Date.now().toString()
    };
    if (payload.type) {
      headers["Content-Type"] = payload.type;
    }
    fetchOption.headers = headers;
    fetch(url, fetchOption).then(monitor(function(response) {
      if (typeof onResponse === "function") {
        onResponse({
          status: response.status,
          type: response.type
        });
      }
    }))["catch"](monitor(function() {
      fetchStrategy(url, payload, onResponse);
    }));
  } else {
    sendXHR(url, payload, onResponse);
  }
}
function isKeepAliveSupported() {
  try {
    return window.Request && "keepalive" in new Request("http://a");
  } catch (_unused) {
    return false;
  }
}
function sendXHR(url, payload, onResponse) {
  var data = payload.data;
  var request = new XMLHttpRequest();
  request.open("POST", url, true);
  if (data instanceof Blob) {
    request.setRequestHeader("Content-Type", data.type);
  } else if (payload.type) {
    request.setRequestHeader("Content-Type", payload.type);
  }
  request.setRequestHeader("x-client-timestamp", Date.now().toString());
  addEventListener(request, "loadend", function() {
    if (typeof onResponse === "function") {
      onResponse({
        status: request.status
      });
    }
  }, {
    once: true
  });
  request.send(data);
}
function fetchStrategy(url, payload, onResponse) {
  var fetchOption = {
    method: "POST",
    body: payload.data,
    keepalive: true,
    mode: "cors"
  };
  var headers = {
    "x-client-timestamp": Date.now().toString()
  };
  if (payload.type) {
    headers["Content-Type"] = payload.type;
  }
  fetchOption.headers = headers;
  fetch(url, fetchOption).then(monitor(function(response) {
    if (typeof onResponse === "function") {
      onResponse({
        status: response.status,
        type: response.type
      });
    }
  }))["catch"](monitor(function() {
    if (typeof onResponse === "function") {
      onResponse({
        status: 0
      });
    }
  }));
}
function _typeof$a(o) {
  "@babel/helpers - typeof";
  return _typeof$a = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(o2) {
    return typeof o2;
  } : function(o2) {
    return o2 && "function" == typeof Symbol && o2.constructor === Symbol && o2 !== Symbol.prototype ? "symbol" : typeof o2;
  }, _typeof$a(o);
}
function escapeRowData(str) {
  if (_typeof$a(str) === "object" && str) {
    str = jsonStringify(str);
  } else if (!isString(str)) {
    return str;
  }
  var reg = /[\s=,"]/g;
  return String(str).replace(reg, function(word) {
    return "\\" + word;
  });
}
function escapeJsonValue(value, isTag) {
  if (_typeof$a(value) === "object" && value) {
    value = jsonStringify(value);
  } else if (isTag) {
    value = "" + value;
  }
  return value;
}
function escapeFieldValueStr(str) {
  return '"' + str.replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
}
function escapeRowField(value) {
  if (_typeof$a(value) === "object" && value) {
    return escapeFieldValueStr(jsonStringify(value));
  } else if (isString(value)) {
    return escapeFieldValueStr(value);
  } else {
    return value;
  }
}
function _toConsumableArray(r) {
  return _arrayWithoutHoles(r) || _iterableToArray(r) || _unsupportedIterableToArray$1(r) || _nonIterableSpread();
}
function _nonIterableSpread() {
  throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}
function _unsupportedIterableToArray$1(r, a) {
  if (r) {
    if ("string" == typeof r) return _arrayLikeToArray$1(r, a);
    var t = {}.toString.call(r).slice(8, -1);
    return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray$1(r, a) : void 0;
  }
}
function _iterableToArray(r) {
  if ("undefined" != typeof Symbol && null != r[Symbol.iterator] || null != r["@@iterator"]) return Array.from(r);
}
function _arrayWithoutHoles(r) {
  if (Array.isArray(r)) return _arrayLikeToArray$1(r);
}
function _arrayLikeToArray$1(r, a) {
  (null == a || a > r.length) && (a = r.length);
  for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e];
  return n;
}
var CUSTOM_KEYS = "custom_keys";
var processedMessageByDataMap = function processedMessageByDataMap2(message) {
  if (!message || !message.type) return {
    rowStr: "",
    rowData: void 0
  };
  var rowData = {
    tags: {},
    fields: {}
  };
  var hasFileds = false;
  var rowStr = "";
  each(dataMap, function(value, key) {
    if (value.type === message.type) {
      rowStr += key + ",";
      rowData.measurement = key;
      var tagsStr = [];
      var tags = extend({}, commonTags, value.tags);
      var filterFileds = ["date", "type", CUSTOM_KEYS];
      each(tags, function(value_path, _key) {
        var _value = findByPath(message, value_path);
        filterFileds.push(_key);
        if (_value || isNumber(_value)) {
          rowData.tags[_key] = escapeJsonValue(_value, true);
          tagsStr.push(escapeRowData(_key) + "=" + escapeRowData(_value));
        }
      });
      var fieldsStr = [];
      var fields = extend({}, commonFields, value.fields);
      each(fields, function(_value, _key) {
        if (isArray(_value) && _value.length === 2) {
          var value_path = _value[1];
          var _valueData = findByPath(message, value_path);
          filterFileds.push(_key);
          if (_valueData !== void 0 && _valueData !== null) {
            rowData.fields[_key] = escapeJsonValue(_valueData);
            fieldsStr.push(escapeRowData(_key) + "=" + escapeRowField(_valueData));
          }
        } else if (isString(_value)) {
          var _valueData = findByPath(message, _value);
          filterFileds.push(_key);
          if (_valueData !== void 0 && _valueData !== null) {
            rowData.fields[_key] = escapeJsonValue(_valueData);
            fieldsStr.push(escapeRowData(_key) + "=" + escapeRowField(_valueData));
          }
        }
      });
      if (message.context && isObject(message.context) && !isEmptyObject(message.context)) {
        var _tagKeys = [];
        each(message.context, function(_value, _key) {
          if (filterFileds.indexOf(_key) > -1) return;
          filterFileds.push(_key);
          if (_value !== void 0 && _value !== null) {
            _tagKeys.push(_key);
            rowData.fields[_key] = escapeJsonValue(_value);
            fieldsStr.push(escapeRowData(_key) + "=" + escapeRowField(_value));
          }
        });
        if (_tagKeys.length) {
          rowData.fields[CUSTOM_KEYS] = escapeJsonValue(_tagKeys);
          fieldsStr.push(escapeRowData(CUSTOM_KEYS) + "=" + escapeRowField(_tagKeys));
        }
      }
      if (message.type === RumEventType.LOGGER) {
        each(message, function(value2, key2) {
          if (filterFileds.indexOf(key2) === -1 && value2 !== void 0 && value2 !== null) {
            rowData.fields[key2] = escapeJsonValue(value2);
            fieldsStr.push(escapeRowData(key2) + "=" + escapeRowField(value2));
          }
        });
      }
      if (tagsStr.length) {
        rowStr += tagsStr.join(",");
      }
      if (fieldsStr.length) {
        rowStr += " ";
        rowStr += fieldsStr.join(",");
        hasFileds = true;
      }
      rowStr = rowStr + " " + message.date;
      rowData.time = message.date;
    }
  });
  return {
    rowStr: hasFileds ? rowStr : "",
    rowData: hasFileds ? rowData : void 0
  };
};
function createBatch(options) {
  var encoder = options.encoder;
  var request = options.request;
  var messageBytesLimit = options.messageBytesLimit;
  var sendContentTypeByJson = options.sendContentTypeByJson;
  var flushController = options.flushController;
  var upsertBuffer = {};
  var flushSubscription = flushController.flushObservable.subscribe(function(event) {
    flush(event);
  });
  function getMessageText(messages) {
    var isEmpty = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : false;
    if (sendContentTypeByJson) {
      if (isEmpty) {
        return "[" + messages.join(",");
      } else {
        return "," + messages.join(",");
      }
    } else {
      if (isEmpty) {
        return messages.join("\n");
      } else {
        return "\n" + messages.join("\n");
      }
    }
  }
  function push(serializedMessage, estimatedMessageBytesCount, key) {
    flushController.notifyBeforeAddMessage(estimatedMessageBytesCount);
    if (key !== void 0) {
      upsertBuffer[key] = serializedMessage;
      flushController.notifyAfterAddMessage();
    } else {
      encoder.write(getMessageText([serializedMessage], encoder.isEmpty()), function(realMessageBytesCount) {
        flushController.notifyAfterAddMessage(realMessageBytesCount - estimatedMessageBytesCount);
      });
    }
  }
  function hasMessageFor(key) {
    return key !== void 0 && upsertBuffer[key] !== void 0;
  }
  function remove(key) {
    var removedMessage = upsertBuffer[key];
    delete upsertBuffer[key];
    var messageBytesCount = encoder.estimateEncodedBytesCount(removedMessage);
    flushController.notifyAfterRemoveMessage(messageBytesCount);
  }
  function process(message) {
    var processedMessage = "";
    if (sendContentTypeByJson) {
      processedMessage = jsonStringify(processedMessageByDataMap(message).rowData);
    } else {
      processedMessage = processedMessageByDataMap(message).rowStr;
    }
    return processedMessage;
  }
  function addOrUpdate(message, key) {
    var serializedMessage = process(message);
    var estimatedMessageBytesCount = encoder.estimateEncodedBytesCount(serializedMessage);
    if (estimatedMessageBytesCount >= messageBytesLimit) {
      display.warn("Discarded a message whose size was bigger than the maximum allowed size ".concat(messageBytesLimit, "KB."));
      return;
    }
    if (hasMessageFor(key)) {
      remove(key);
    }
    push(serializedMessage, estimatedMessageBytesCount, key);
  }
  function flush(event) {
    var upsertMessages = values(upsertBuffer).join(sendContentTypeByJson ? "," : "\n");
    upsertBuffer = {};
    var isPageExit = isPageExitReason(event.reason);
    var send2 = isPageExit ? request.sendOnExit : request.send;
    if (isPageExit && // Note: checking that the encoder is async is not strictly needed, but it's an optimization:
    // if the encoder is async we need to send two requests in some cases (one for encoded data
    // and the other for non-encoded data). But if it's not async, we don't have to worry about
    // it and always send a single request.
    encoder.isAsync) {
      var encoderResult = encoder.finishSync();
      if (encoderResult.outputBytesCount) {
        send2(formatPayloadFromEncoder(encoderResult, sendContentTypeByJson));
      }
      var pendingMessages = [].concat(_toConsumableArray(encoderResult.pendingData), [upsertMessages]).filter(Boolean).join("\n");
      if (pendingMessages) {
        send2({
          data: pendingMessages,
          bytesCount: computeBytesCount(pendingMessages)
        });
      }
    } else {
      if (upsertMessages) {
        var text = getMessageText([upsertMessages], encoder.isEmpty());
        if (sendContentTypeByJson) {
          text += "]";
        }
        encoder.write(text);
      } else {
        if (sendContentTypeByJson) {
          encoder.write("]");
        }
      }
      encoder.finish(function(encoderResult2) {
        send2(formatPayloadFromEncoder(encoderResult2));
      });
    }
  }
  return {
    flushController,
    add: addOrUpdate,
    upsert: addOrUpdate,
    stop: flushSubscription.unsubscribe
  };
}
function formatPayloadFromEncoder(encoderResult, sendContentTypeByJson) {
  var data;
  if (typeof encoderResult.output === "string") {
    data = encoderResult.output;
  } else {
    data = new Blob([encoderResult.output], {
      // This will set the 'Content-Type: text/plain' header. Reasoning:
      // * The intake rejects the request if there is no content type.
      // * The browser will issue CORS preflight requests if we set it to 'application/json', which
      // could induce higher intake load (and maybe has other impacts).
      // * Also it's not quite JSON, since we are concatenating multiple JSON objects separated by
      // new lines.
      type: "text/plain"
    });
  }
  return {
    data,
    type: sendContentTypeByJson ? "application/json;UTF-8" : void 0,
    bytesCount: encoderResult.outputBytesCount,
    encoding: encoderResult.encoding
  };
}
function createFlushController(_ref) {
  var messagesLimit = _ref.messagesLimit, bytesLimit = _ref.bytesLimit, durationLimit = _ref.durationLimit, pageExitObservable = _ref.pageExitObservable, sessionExpireObservable = _ref.sessionExpireObservable;
  var pageExitSubscription = pageExitObservable.subscribe(function(event) {
    return flush(event.reason);
  });
  var sessionExpireSubscription = sessionExpireObservable.subscribe(function() {
    return flush("session_expire");
  });
  var flushObservable = new Observable(function() {
    return function() {
      pageExitSubscription.unsubscribe();
      sessionExpireSubscription.unsubscribe();
    };
  });
  var currentBytesCount = 0;
  var currentMessagesCount = 0;
  function flush(flushReason) {
    if (currentMessagesCount === 0) {
      return;
    }
    var messagesCount = currentMessagesCount;
    var bytesCount = currentBytesCount;
    currentMessagesCount = 0;
    currentBytesCount = 0;
    cancelDurationLimitTimeout();
    flushObservable.notify({
      reason: flushReason,
      messagesCount,
      bytesCount
    });
  }
  var durationLimitTimeoutId;
  function scheduleDurationLimitTimeout() {
    if (durationLimitTimeoutId === void 0) {
      durationLimitTimeoutId = setTimeout$1(function() {
        flush("duration_limit");
      }, durationLimit);
    }
  }
  function cancelDurationLimitTimeout() {
    clearTimeout$1(durationLimitTimeoutId);
    durationLimitTimeoutId = void 0;
  }
  return {
    flushObservable,
    getMessagesCount: function getMessagesCount() {
      return currentMessagesCount;
    },
    /**
     * Notifies that a message will be added to a pool of pending messages waiting to be flushed.
     *
     * This function needs to be called synchronously, right before adding the message, so no flush
     * event can happen after `notifyBeforeAddMessage` and before adding the message.
     */
    notifyBeforeAddMessage: function notifyBeforeAddMessage(estimatedMessageBytesCount) {
      if (currentBytesCount + estimatedMessageBytesCount >= bytesLimit) {
        flush("bytes_limit");
      }
      currentMessagesCount += 1;
      currentBytesCount += estimatedMessageBytesCount;
      scheduleDurationLimitTimeout();
    },
    /**
     * Notifies that a message *was* added to a pool of pending messages waiting to be flushed.
     *
     * This function can be called asynchronously after the message was added, but in this case it
     * should not be called if a flush event occurred in between.
     */
    notifyAfterAddMessage: function notifyAfterAddMessage(messageBytesCountDiff) {
      if (messageBytesCountDiff === void 0) {
        messageBytesCountDiff = 0;
      }
      currentBytesCount += messageBytesCountDiff;
      if (currentMessagesCount >= messagesLimit) {
        flush("messages_limit");
      } else if (currentBytesCount >= bytesLimit) {
        flush("bytes_limit");
      }
    },
    /**
     * Notifies that a message was removed from a pool of pending messages waiting to be flushed.
     *
     * This function needs to be called synchronously, right after removing the message, so no flush
     * event can happen after removing the message and before `notifyAfterRemoveMessage`.
     *
     * @param messageBytesCount: the message bytes count that was added to the pool. Should
     * correspond to the sum of bytes counts passed to `notifyBeforeAddMessage` and
     * `notifyAfterAddMessage`.
     */
    notifyAfterRemoveMessage: function notifyAfterRemoveMessage(messageBytesCount) {
      currentBytesCount -= messageBytesCount;
      currentMessagesCount -= 1;
      if (currentMessagesCount === 0) {
        cancelDurationLimitTimeout();
      }
    }
  };
}
function startBatchWithReplica(configuration, primary, reportError, pageExitObservable, sessionExpireObservable, batchFactoryImp) {
  if (batchFactoryImp === void 0) {
    batchFactoryImp = createBatch;
  }
  var primaryBatch = createBatchFromConfig(configuration, primary);
  function createBatchFromConfig(configuration2, batchConfiguration) {
    return batchFactoryImp({
      encoder: batchConfiguration.encoder,
      request: createHttpRequest(batchConfiguration.endpoint, configuration2.batchBytesLimit, configuration2.retryMaxSize, reportError),
      flushController: createFlushController({
        messagesLimit: configuration2.batchMessagesLimit,
        bytesLimit: configuration2.batchBytesLimit,
        durationLimit: configuration2.flushTimeout,
        pageExitObservable,
        sessionExpireObservable
      }),
      messageBytesLimit: configuration2.messageBytesLimit,
      sendContentTypeByJson: configuration2.sendContentTypeByJson
    });
  }
  return {
    flushObservable: primaryBatch.flushController.flushObservable,
    add: function add(message) {
      primaryBatch.add(message);
    },
    upsert: function upsert(message, key) {
      primaryBatch.upsert(message, key);
    },
    stop: function stop() {
      primaryBatch.stop();
    }
  };
}
function getEventBridgeGlobal() {
  return getGlobalObject().FTWebViewJavascriptBridge;
}
function getEventBridge() {
  var eventBridgeGlobal = getEventBridgeGlobal();
  if (!eventBridgeGlobal) {
    return;
  }
  return {
    getCapabilities: function getCapabilities() {
      return JSON.parse(eventBridgeGlobal.getCapabilities && eventBridgeGlobal.getCapabilities() || "[]");
    },
    getPrivacyLevel: function getPrivacyLevel() {
      return eventBridgeGlobal.getPrivacyLevel && eventBridgeGlobal.getPrivacyLevel();
    },
    getAllowedWebViewHosts: function getAllowedWebViewHosts() {
      return JSON.parse(eventBridgeGlobal.getAllowedWebViewHosts && eventBridgeGlobal.getAllowedWebViewHosts() || "[]");
    },
    send: function send2(eventType, event, viewId) {
      var view = viewId ? {
        id: viewId
      } : void 0;
      try {
        eventBridgeGlobal.sendEvent(JSON.stringify({
          name: eventType,
          data: event,
          view
        }));
      } catch (e) {
      }
    }
  };
}
var BridgeCapability = {
  RECORDS: "records"
};
function bridgeSupports(capability) {
  var bridge = getEventBridge();
  return !!bridge && bridge.getCapabilities().includes(capability);
}
function canUseEventBridge() {
  var _getGlobalObject$loca;
  var currentHost = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : (_getGlobalObject$loca = getGlobalObject().location) === null || _getGlobalObject$loca === void 0 ? void 0 : _getGlobalObject$loca.hostname;
  var eventBridgeGlobal = getEventBridgeGlobal();
  if (eventBridgeGlobal && eventBridgeGlobal.getAllowedWebViewHosts === void 0) {
    return true;
  }
  if (eventBridgeGlobal && eventBridgeGlobal.getAllowedWebViewHosts && (eventBridgeGlobal.getAllowedWebViewHosts() === null || eventBridgeGlobal.getAllowedWebViewHosts() === void 0)) {
    return true;
  }
  var bridge = getEventBridge();
  return !!bridge && bridge.getAllowedWebViewHosts().some(function(allowedHost) {
    return currentHost === allowedHost || currentHost.endsWith(".".concat(allowedHost));
  });
}
var SYNTHETICS_INJECTS_RUM_COOKIE_NAME = "guance-synthetics-injects-rum";
function willSyntheticsInjectRum() {
  return Boolean(window._GUANCE_SYNTHETICS_INJECTS_RUM || getCookie(SYNTHETICS_INJECTS_RUM_COOKIE_NAME));
}
function _typeof$9(o) {
  "@babel/helpers - typeof";
  return _typeof$9 = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(o2) {
    return typeof o2;
  } : function(o2) {
    return o2 && "function" == typeof Symbol && o2.constructor === Symbol && o2 !== Symbol.prototype ? "symbol" : typeof o2;
  }, _typeof$9(o);
}
function _slicedToArray(r, e) {
  return _arrayWithHoles(r) || _iterableToArrayLimit(r, e) || _unsupportedIterableToArray(r, e) || _nonIterableRest();
}
function _nonIterableRest() {
  throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}
function _unsupportedIterableToArray(r, a) {
  if (r) {
    if ("string" == typeof r) return _arrayLikeToArray(r, a);
    var t = {}.toString.call(r).slice(8, -1);
    return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0;
  }
}
function _arrayLikeToArray(r, a) {
  (null == a || a > r.length) && (a = r.length);
  for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e];
  return n;
}
function _iterableToArrayLimit(r, l) {
  var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"];
  if (null != t) {
    var e, n, i, u, a = [], f = true, o = false;
    try {
      if (i = (t = t.call(r)).next, 0 === l) ;
      else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = true) ;
    } catch (r2) {
      o = true, n = r2;
    } finally {
      try {
        if (!f && null != t["return"] && (u = t["return"](), Object(u) !== u)) return;
      } finally {
        if (o) throw n;
      }
    }
    return a;
  }
}
function _arrayWithHoles(r) {
  if (Array.isArray(r)) return r;
}
function ownKeys$1(e, r) {
  var t = Object.keys(e);
  if (Object.getOwnPropertySymbols) {
    var o = Object.getOwnPropertySymbols(e);
    r && (o = o.filter(function(r2) {
      return Object.getOwnPropertyDescriptor(e, r2).enumerable;
    })), t.push.apply(t, o);
  }
  return t;
}
function _objectSpread$1(e) {
  for (var r = 1; r < arguments.length; r++) {
    var t = null != arguments[r] ? arguments[r] : {};
    r % 2 ? ownKeys$1(Object(t), true).forEach(function(r2) {
      _defineProperty$3(e, r2, t[r2]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys$1(Object(t)).forEach(function(r2) {
      Object.defineProperty(e, r2, Object.getOwnPropertyDescriptor(t, r2));
    });
  }
  return e;
}
function _defineProperty$3(e, r, t) {
  return (r = _toPropertyKey$3(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: true, configurable: true, writable: true }) : e[r] = t, e;
}
function _toPropertyKey$3(t) {
  var i = _toPrimitive$3(t, "string");
  return "symbol" == _typeof$9(i) ? i : i + "";
}
function _toPrimitive$3(t, r) {
  if ("object" != _typeof$9(t) || !t) return t;
  var e = t[Symbol.toPrimitive];
  if (void 0 !== e) {
    var i = e.call(t, r);
    if ("object" != _typeof$9(i)) return i;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return ("string" === r ? String : Number)(t);
}
function ensureProperties(context, propertiesConfig, name) {
  var newContext = _objectSpread$1({}, context);
  for (var _i = 0, _Object$entries = Object.entries(propertiesConfig); _i < _Object$entries.length; _i++) {
    var _Object$entries$_i = _slicedToArray(_Object$entries[_i], 2), key = _Object$entries$_i[0], _Object$entries$_i$ = _Object$entries$_i[1], required = _Object$entries$_i$.required, type = _Object$entries$_i$.type;
    if (type === "string" && key in newContext) {
      newContext[key] = String(newContext[key]);
    }
    if (required && !(key in context)) {
      display.warn("The property ".concat(key, " of ").concat(name, " context is required; context will not be sent to the intake."));
    }
  }
  return newContext;
}
function createContextManager() {
  var name = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : "";
  var _ref = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {}, customerDataTracker = _ref.customerDataTracker, _ref$propertiesConfig = _ref.propertiesConfig, propertiesConfig = _ref$propertiesConfig === void 0 ? {} : _ref$propertiesConfig;
  var context = {};
  var changeObservable = new Observable();
  var contextManager = {
    getContext: function getContext() {
      return deepClone(context);
    },
    setContext: function setContext(newContext) {
      if (getType(newContext) === "object") {
        context = sanitize(ensureProperties(newContext, propertiesConfig, name));
        customerDataTracker === null || customerDataTracker === void 0 || customerDataTracker.updateCustomerData(context);
      } else {
        contextManager.clearContext();
      }
      changeObservable.notify();
    },
    setContextProperty: function setContextProperty(key, property) {
      context[key] = sanitize(ensureProperties(_defineProperty$3({}, key, property), propertiesConfig, name)[key]);
      customerDataTracker === null || customerDataTracker === void 0 || customerDataTracker.updateCustomerData(context);
      changeObservable.notify();
    },
    removeContextProperty: function removeContextProperty(key) {
      delete context[key];
      customerDataTracker === null || customerDataTracker === void 0 || customerDataTracker.updateCustomerData(context);
      ensureProperties(context, propertiesConfig, name);
      changeObservable.notify();
    },
    clearContext: function clearContext() {
      context = {};
      customerDataTracker === null || customerDataTracker === void 0 || customerDataTracker.resetCustomerData();
      changeObservable.notify();
    },
    changeObservable
  };
  return contextManager;
}
var CustomerDataType = {
  User: "user",
  GlobalContext: "global context",
  View: "view"
};
var CONTEXT_STORE_KEY_PREFIX = "_gc_s";
var storageListeners = [];
function storeContextManager(configuration, contextManager, productKey, customerDataType) {
  var storageKey = buildStorageKey(configuration, productKey, customerDataType);
  storageListeners.push(addEventListener(window, DOM_EVENT.STORAGE, function(params) {
    if (storageKey === params.key) {
      synchronizeWithStorage();
    }
  }));
  contextManager.changeObservable.subscribe(dumpToStorage);
  contextManager.setContext(extend2Lev(getFromStorage(), contextManager.getContext()));
  function synchronizeWithStorage() {
    contextManager.setContext(getFromStorage());
  }
  function dumpToStorage() {
    localStorage.setItem(storageKey, JSON.stringify(contextManager.getContext()));
  }
  function getFromStorage() {
    var rawContext = localStorage.getItem(storageKey);
    return rawContext !== null ? JSON.parse(rawContext) : {};
  }
  return contextManager;
}
function buildStorageKey(configuration, productKey, customerDataType) {
  if (configuration.storeContextsKey && isString(configuration.storeContextsKey)) {
    return CONTEXT_STORE_KEY_PREFIX + "_" + productKey + "_" + customerDataType + "_" + configuration.storeContextsKey;
  } else {
    return CONTEXT_STORE_KEY_PREFIX + "_" + productKey + "_" + customerDataType;
  }
}
var CUSTOMER_DATA_BYTES_LIMIT = 3 * ONE_KIBI_BYTE;
var CUSTOMER_COMPRESSED_DATA_BYTES_LIMIT = 16 * ONE_KIBI_BYTE;
var BYTES_COMPUTATION_THROTTLING_DELAY = 200;
var CustomerDataCompressionStatus = {
  Unknown: 0,
  Enabled: 1,
  Disabled: 2
};
function createCustomerDataTrackerManager() {
  var compressionStatus = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : CustomerDataCompressionStatus.Disabled;
  var customerDataTrackers = /* @__PURE__ */ new Map();
  var alreadyWarned = false;
  function checkCustomerDataLimit() {
    var initialBytesCount = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : 0;
    if (alreadyWarned || compressionStatus === CustomerDataCompressionStatus.Unknown) {
      return;
    }
    var bytesCountLimit = compressionStatus === CustomerDataCompressionStatus.Disabled ? CUSTOMER_DATA_BYTES_LIMIT : CUSTOMER_COMPRESSED_DATA_BYTES_LIMIT;
    var bytesCount = initialBytesCount;
    customerDataTrackers.forEach(function(tracker) {
      bytesCount += tracker.getBytesCount();
    });
    if (bytesCount > bytesCountLimit) {
      displayCustomerDataLimitReachedWarning(bytesCountLimit);
      alreadyWarned = true;
    }
  }
  return {
    /**
     * Creates a detached tracker. The manager will not store a reference to that tracker, and the
     * bytes count will be counted independently from other detached trackers.
     *
     * This is particularly useful when we don't know when the tracker will be unused, so we don't
     * leak memory (ex: when used in Logger instances).
     */
    createDetachedTracker: function createDetachedTracker() {
      var tracker = createCustomerDataTracker(function() {
        return checkCustomerDataLimit(tracker.getBytesCount());
      });
      return tracker;
    },
    /**
     * Creates a tracker if it doesn't exist, and returns it.
     */
    getOrCreateTracker: function getOrCreateTracker(type) {
      if (!customerDataTrackers.has(type)) {
        customerDataTrackers.set(type, createCustomerDataTracker(checkCustomerDataLimit));
      }
      return customerDataTrackers.get(type);
    },
    setCompressionStatus: function setCompressionStatus(newCompressionStatus) {
      if (compressionStatus === CustomerDataCompressionStatus.Unknown) {
        compressionStatus = newCompressionStatus;
        checkCustomerDataLimit();
      }
    },
    getCompressionStatus: function getCompressionStatus() {
      return compressionStatus;
    },
    stop: function stop() {
      customerDataTrackers.forEach(function(tracker) {
        return tracker.stop();
      });
      customerDataTrackers.clear();
    }
  };
}
function createCustomerDataTracker(checkCustomerDataLimit) {
  var bytesCountCache = 0;
  var _throttle = throttle(function(context) {
    bytesCountCache = computeBytesCount(jsonStringify(context));
    checkCustomerDataLimit();
  }, BYTES_COMPUTATION_THROTTLING_DELAY), computeBytesCountThrottled = _throttle.throttled, cancelComputeBytesCount = _throttle.cancel;
  var resetBytesCount = function resetBytesCount2() {
    cancelComputeBytesCount();
    bytesCountCache = 0;
  };
  return {
    updateCustomerData: function updateCustomerData(context) {
      if (isEmptyObject(context)) {
        resetBytesCount();
      } else {
        computeBytesCountThrottled(context);
      }
    },
    resetCustomerData: resetBytesCount,
    getBytesCount: function getBytesCount() {
      return bytesCountCache;
    },
    stop: function stop() {
      cancelComputeBytesCount();
    }
  };
}
function displayCustomerDataLimitReachedWarning(bytesCountLimit) {
  display.warn("Customer data exceeds the recommended ".concat(bytesCountLimit / ONE_KIBI_BYTE, "KiB threshold."));
}
function createIdentityEncoder() {
  var output = "";
  var outputBytesCount = 0;
  return {
    isAsync: false,
    isEmpty: function isEmpty() {
      return !output;
    },
    write: function write(data, callback) {
      var additionalEncodedBytesCount = computeBytesCount(data);
      outputBytesCount += additionalEncodedBytesCount;
      output += data;
      if (callback) {
        callback(additionalEncodedBytesCount);
      }
    },
    finish: function finish(callback) {
      callback(this.finishSync());
    },
    finishSync: function finishSync() {
      var result = {
        output,
        outputBytesCount,
        rawBytesCount: outputBytesCount,
        pendingData: []
      };
      output = "";
      outputBytesCount = 0;
      return result;
    },
    estimateEncodedBytesCount: function estimateEncodedBytesCount(data) {
      return data.length;
    }
  };
}
function sanitizeUser(newUser) {
  var user = assign({}, newUser);
  var keys3 = ["id", "name", "email"];
  each(keys3, function(key) {
    if (key in user) {
      user[key] = String(user[key]);
    }
  });
  return user;
}
function checkUser(newUser) {
  var isValid = getType(newUser) === "object";
  if (!isValid) {
    display.error("Unsupported user:", newUser);
  }
  return isValid;
}
var PLACEHOLDER = 1;
function WeakSet$1(initialValues) {
  this.map = /* @__PURE__ */ new WeakMap();
  if (initialValues) {
    initialValues.forEach(function(value) {
      this.map.set(value, PLACEHOLDER);
    }, this);
  }
}
WeakSet$1.prototype.add = function(value) {
  this.map.set(value, PLACEHOLDER);
  return this;
};
WeakSet$1.prototype["delete"] = function(value) {
  return this.map["delete"](value);
};
WeakSet$1.prototype.has = function(value) {
  return this.map.has(value);
};
function displayAlreadyInitializedError(sdkName, initConfiguration) {
  if (!initConfiguration.silentMultipleInit) {
    display.error(sdkName + " is already initialized.");
  }
}
var RUM_SESSION_KEY = "rum";
var RumSessionPlan = {
  WITHOUT_SESSION_REPLAY: 1,
  WITH_SESSION_REPLAY: 2,
  WITH_ERROR_SESSION_REPLAY: 3
};
var RumTrackingType = {
  NOT_TRACKED: SESSION_NOT_TRACKED,
  // Note: the "tracking type" value (stored in the session cookie) does not match the "session
  // plan" value (sent in RUM events). This is expected, and was done to keep retrocompatibility
  // with active sessions when upgrading the SDK.
  TRACKED_WITH_SESSION_AND_WITH_SESSION_REPLAY: "1",
  TRACKED_WITH_SESSION_AND_WITHOUT_SESSION_REPLAY: "2",
  TRACKED_WITH_SESSION_AND_WITH_ERROR_SESSION_REPLAY: "3",
  TRACKED_WITH_ERROR_SESSION_AND_WITH_SESSION_REPLAY: "4",
  TRACKED_WITH_ERROR_SESSION_AND_WITHOUT_SESSION_REPLAY: "5",
  TRACKED_WITH_ERROR_SESSION_AND_WITH_ERROR_SESSION_REPLAY: "6"
};
function startRumSessionManager(configuration, lifeCycle) {
  var sessionManager = startSessionManager(configuration, RUM_SESSION_KEY, function(rawTrackingType) {
    return computeSessionState(configuration, rawTrackingType);
  });
  sessionManager.expireObservable.subscribe(function() {
    lifeCycle.notify(LifeCycleEventType.SESSION_EXPIRED);
  });
  sessionManager.renewObservable.subscribe(function() {
    lifeCycle.notify(LifeCycleEventType.SESSION_RENEWED);
  });
  sessionManager.sessionStateUpdateObservable.subscribe(function(_ref) {
    var previousState = _ref.previousState, newState = _ref.newState;
    if (!previousState.hasError && newState.hasError) {
      var sessionEntity = sessionManager.findSession();
      if (sessionEntity) {
        sessionEntity.hasError = true;
        sessionEntity.ets = newState.ets || timeStampNow();
      }
    }
    if (!previousState.forcedSession && newState.forcedSession) {
      var _sessionEntity = sessionManager.findSession();
      if (_sessionEntity) {
        _sessionEntity.isSessionForced = true;
      }
    }
  });
  return {
    findTrackedSession: function findTrackedSession(startTime) {
      var session = sessionManager.findSession(startTime);
      if (!session) {
        return;
      }
      if (!isTypeTracked(session.trackingType) && !session.isSessionForced) {
        return;
      }
      var isErrorSession = session.trackingType === RumTrackingType.TRACKED_WITH_ERROR_SESSION_AND_WITHOUT_SESSION_REPLAY || session.trackingType === RumTrackingType.TRACKED_WITH_ERROR_SESSION_AND_WITH_SESSION_REPLAY || session.trackingType === RumTrackingType.TRACKED_WITH_ERROR_SESSION_AND_WITH_ERROR_SESSION_REPLAY;
      var plan = RumSessionPlan.WITHOUT_SESSION_REPLAY;
      if (session.trackingType === RumTrackingType.TRACKED_WITH_SESSION_AND_WITH_SESSION_REPLAY || session.trackingType === RumTrackingType.TRACKED_WITH_ERROR_SESSION_AND_WITH_SESSION_REPLAY) {
        plan = RumSessionPlan.WITH_SESSION_REPLAY;
      } else if (session.trackingType === RumTrackingType.TRACKED_WITH_ERROR_SESSION_AND_WITH_ERROR_SESSION_REPLAY || session.trackingType === RumTrackingType.TRACKED_WITH_SESSION_AND_WITH_ERROR_SESSION_REPLAY) {
        plan = RumSessionPlan.WITH_ERROR_SESSION_REPLAY;
      }
      return {
        id: session.id,
        plan,
        errorSessionReplayAllowed: plan === RumSessionPlan.WITH_ERROR_SESSION_REPLAY,
        sessionHasError: session.hasError,
        isErrorSession,
        sessionErrorTimestamp: session.ets,
        isSessionForced: session.isSessionForced,
        sessionReplayAllowed: plan === RumSessionPlan.WITH_SESSION_REPLAY || plan === RumSessionPlan.WITH_ERROR_SESSION_REPLAY || session.isSessionForced
      };
    },
    expire: sessionManager.expire,
    keepSessionAlive: sessionManager.expandOrRenewSession,
    expireObservable: sessionManager.expireObservable,
    sessionStateUpdateObservable: sessionManager.sessionStateUpdateObservable,
    setErrorForSession: function setErrorForSession() {
      return sessionManager.updateSessionState({
        hasError: "1",
        ets: timeStampNow()
      });
    },
    setForcedSession: function setForcedSession() {
      sessionManager.updateSessionState({
        forcedSession: "1"
      });
    }
  };
}
function startRumSessionManagerStub() {
  var session = {
    id: "00000000-aaaa-0000-aaaa-000000000000",
    isErrorSession: false,
    sessionErrorTimestamp: 0,
    sessionReplayAllowed: bridgeSupports(BridgeCapability.RECORDS) ? true : false,
    errorSessionReplayAllowed: false,
    sessionHasError: false,
    isSessionForced: false
  };
  return {
    findTrackedSession: function findTrackedSession() {
      return session;
    },
    expire: noop,
    keepSessionAlive: noop,
    expireObservable: new Observable(),
    setErrorForSession: function setErrorForSession() {
      session.sessionErrorTimestamp = timeStampNow();
      session.sessionHasError = true;
      session.isErrorSession = true;
      session.errorSessionReplayAllowed = true;
    },
    setForcedSession: noop
  };
}
function computeSessionState(configuration, rawTrackingType) {
  var sessionSampleRate = configuration.sessionSampleRate, sessionOnErrorSampleRate = configuration.sessionOnErrorSampleRate, sessionReplaySampleRate = configuration.sessionReplaySampleRate, sessionReplayOnErrorSampleRate = configuration.sessionReplayOnErrorSampleRate;
  var isSession = performDraw(sessionSampleRate);
  var isErrorSession = performDraw(sessionOnErrorSampleRate);
  var isSessionReplay = performDraw(sessionReplaySampleRate);
  var isErrorSessionReplay = performDraw(sessionReplayOnErrorSampleRate);
  var trackingType;
  if (hasValidRumSession(rawTrackingType)) {
    trackingType = rawTrackingType;
  } else if (!isErrorSession && !isSession) {
    trackingType = RumTrackingType.NOT_TRACKED;
  } else if (isSession && isSessionReplay) {
    trackingType = RumTrackingType.TRACKED_WITH_SESSION_AND_WITH_SESSION_REPLAY;
  } else if (isSession && isErrorSessionReplay) {
    trackingType = RumTrackingType.TRACKED_WITH_SESSION_AND_WITH_ERROR_SESSION_REPLAY;
  } else if (isSession && !isSessionReplay && !isErrorSessionReplay) {
    trackingType = RumTrackingType.TRACKED_WITH_SESSION_AND_WITHOUT_SESSION_REPLAY;
  } else if (isErrorSession && isSessionReplay) {
    trackingType = RumTrackingType.TRACKED_WITH_ERROR_SESSION_AND_WITH_SESSION_REPLAY;
  } else if (isErrorSession && isErrorSessionReplay) {
    trackingType = RumTrackingType.TRACKED_WITH_ERROR_SESSION_AND_WITH_ERROR_SESSION_REPLAY;
  } else if (isErrorSession && !isSessionReplay && !isErrorSessionReplay) {
    trackingType = RumTrackingType.TRACKED_WITH_ERROR_SESSION_AND_WITHOUT_SESSION_REPLAY;
  }
  return {
    trackingType,
    isTracked: isTypeTracked(trackingType)
  };
}
function hasValidRumSession(trackingType) {
  return trackingType === RumTrackingType.NOT_TRACKED || trackingType === RumTrackingType.TRACKED_WITH_ERROR_SESSION_AND_WITHOUT_SESSION_REPLAY || trackingType === RumTrackingType.TRACKED_WITH_ERROR_SESSION_AND_WITH_ERROR_SESSION_REPLAY || trackingType === RumTrackingType.TRACKED_WITH_ERROR_SESSION_AND_WITH_SESSION_REPLAY || trackingType === RumTrackingType.TRACKED_WITH_SESSION_AND_WITHOUT_SESSION_REPLAY || trackingType === RumTrackingType.TRACKED_WITH_SESSION_AND_WITH_ERROR_SESSION_REPLAY || trackingType === RumTrackingType.TRACKED_WITH_SESSION_AND_WITH_SESSION_REPLAY;
}
function isTypeTracked(rumSessionType) {
  return rumSessionType !== RumTrackingType.NOT_TRACKED;
}
var USR_ID_COOKIE_NAME = "_gc_usr_id";
var ANONYMOUS_ID_EXPIRATION = 60 * 24 * ONE_HOUR;
function initUsrCookie(cookieOptions) {
  var usrCacheId = getCookie(USR_ID_COOKIE_NAME, cookieOptions);
  if (!usrCacheId) {
    usrCacheId = UUID();
    setCookie(USR_ID_COOKIE_NAME, usrCacheId, ANONYMOUS_ID_EXPIRATION, cookieOptions);
  }
  return usrCacheId;
}
function initUsrLocalStorage() {
  var usrCacheId = localStorage.getItem(USR_ID_COOKIE_NAME);
  if (!usrCacheId) {
    usrCacheId = UUID();
    localStorage.setItem(USR_ID_COOKIE_NAME, usrCacheId);
  }
  return usrCacheId;
}
var startCacheUsrCache = function startCacheUsrCache2(configuration) {
  if (!configuration.sessionStoreStrategyType) {
    return {
      getId: noop
    };
  }
  var usrCacheId;
  if (configuration.sessionStoreStrategyType.type === SessionPersistence.COOKIE) {
    usrCacheId = initUsrCookie(configuration.sessionStoreStrategyType.cookieOptions);
  } else {
    usrCacheId = initUsrLocalStorage();
  }
  return {
    getId: function getId() {
      return usrCacheId;
    }
  };
};
function createDOMMutationObservable() {
  var MutationObserver = getMutationObserverConstructor();
  return new Observable(function(observable) {
    if (!MutationObserver) {
      return;
    }
    var observer2 = new MutationObserver(monitor(function() {
      return observable.notify();
    }));
    try {
      observer2.observe(document, {
        attributes: true,
        characterData: true,
        childList: true,
        subtree: true
      });
    } catch (err) {
    }
    return function() {
      return observer2.disconnect();
    };
  });
}
function getMutationObserverConstructor() {
  var constructor;
  var browserWindow = window;
  if (browserWindow.Zone) {
    constructor = getZoneJsOriginalValue(browserWindow, "MutationObserver");
    if (browserWindow.MutationObserver && constructor === browserWindow.MutationObserver) {
      var patchedInstance = new browserWindow.MutationObserver(noop);
      var originalInstance = getZoneJsOriginalValue(patchedInstance, "originalInstance");
      constructor = originalInstance && originalInstance.constructor;
    }
  }
  if (!constructor) {
    constructor = browserWindow.MutationObserver;
  }
  return constructor;
}
function createLocationChangeObservable(location2) {
  var currentLocation = shallowClone(location2);
  return new Observable(function(observable) {
    var _trackHistory = trackHistory(onLocationChange);
    var _trackHash = trackHash(onLocationChange);
    function onLocationChange() {
      if (currentLocation.href === location2.href) {
        return;
      }
      var newLocation = shallowClone(location2);
      observable.notify({
        newLocation,
        oldLocation: currentLocation
      });
      currentLocation = newLocation;
    }
    return function() {
      _trackHistory.stop();
      _trackHash.stop();
    };
  });
}
function trackHistory(onHistoryChange) {
  var pushState = instrumentMethod(getHistoryInstrumentationTarget("pushState"), "pushState", function(params) {
    var onPostCall = params.onPostCall;
    onPostCall(onHistoryChange);
  });
  var replaceState = instrumentMethod(getHistoryInstrumentationTarget("replaceState"), "replaceState", function(params) {
    var onPostCall = params.onPostCall;
    onPostCall(onHistoryChange);
  });
  var popState = addEventListener(window, DOM_EVENT.POP_STATE, onHistoryChange);
  return {
    stop: function stop() {
      pushState.stop();
      replaceState.stop();
      popState.stop();
    }
  };
}
function trackHash(onHashChange) {
  return addEventListener(window, DOM_EVENT.HASH_CHANGE, onHashChange);
}
function getHistoryInstrumentationTarget(methodName) {
  return Object.prototype.hasOwnProperty.call(history, methodName) ? history : History.prototype;
}
var FAKE_INITIAL_DOCUMENT = "initial_document";
var RESOURCE_TYPES = [[ResourceType.DOCUMENT, function(initiatorType) {
  return FAKE_INITIAL_DOCUMENT === initiatorType;
}], [ResourceType.XHR, function(initiatorType) {
  return "xmlhttprequest" === initiatorType;
}], [ResourceType.FETCH, function(initiatorType) {
  return "fetch" === initiatorType;
}], [ResourceType.BEACON, function(initiatorType) {
  return "beacon" === initiatorType;
}], [ResourceType.CSS, function(_, path) {
  return path.match(/\.css$/i) !== null;
}], [ResourceType.JS, function(_, path) {
  return path.match(/\.js$/i) !== null;
}], [ResourceType.IMAGE, function(initiatorType, path) {
  return includes(["image", "img", "icon"], initiatorType) || path.match(/\.(gif|jpg|jpeg|tiff|png|svg|ico)$/i) !== null;
}], [ResourceType.FONT, function(_, path) {
  return path.match(/\.(woff|eot|woff2|ttf)$/i) !== null;
}], [ResourceType.MEDIA, function(initiatorType, path) {
  return includes(["audio", "video"], initiatorType) || path.match(/\.(mp3|mp4)$/i) !== null;
}]];
function computeResourceEntryType(entry) {
  var url = entry.name;
  if (!isValidUrl(url)) {
    return ResourceType.OTHER;
  }
  var path = getPathName(url);
  var type = ResourceType.OTHER;
  each(RESOURCE_TYPES, function(res) {
    var _type = res[0], isType = res[1];
    if (isType(entry.initiatorType, path)) {
      type = _type;
      return false;
    }
  });
  return type;
}
function areInOrder() {
  var numbers = toArray(arguments);
  for (var i = 1; i < numbers.length; i += 1) {
    if (numbers[i - 1] > numbers[i]) {
      return false;
    }
  }
  return true;
}
function computeResourceEntryDeliveryType(entry) {
  return entry.deliveryType === "" ? "other" : entry.deliveryType;
}
function computeResourceEntryProtocol(entry) {
  return entry.nextHopProtocol === "" ? void 0 : entry.nextHopProtocol;
}
function isResourceEntryRequestType(entry) {
  return entry.initiatorType === "xmlhttprequest" || entry.initiatorType === "fetch";
}
var HAS_MULTI_BYTES_CHARACTERS = /[^\u0000-\u007F]/;
function getStrSize(candidate) {
  if (!HAS_MULTI_BYTES_CHARACTERS.test(candidate)) {
    return candidate.length;
  }
  if (window.TextEncoder !== void 0) {
    return new TextEncoder().encode(candidate).length;
  }
  return new Blob([candidate]).size;
}
function isResourceUrlLimit(name, limitSize) {
  return getStrSize(name) > limitSize;
}
function computeResourceEntryDuration(entry) {
  if (entry.duration === 0 && entry.startTime < entry.responseEnd) {
    return msToNs(entry.responseEnd - entry.startTime);
  }
  return msToNs(entry.duration);
}
function computePerformanceResourceDetails(entry) {
  if (!hasValidResourceEntryTimings(entry)) {
    return void 0;
  }
  var startTime = entry.startTime, fetchStart = entry.fetchStart, redirectStart = entry.redirectStart, redirectEnd = entry.redirectEnd, domainLookupStart = entry.domainLookupStart, domainLookupEnd = entry.domainLookupEnd, connectStart = entry.connectStart, secureConnectionStart = entry.secureConnectionStart, connectEnd = entry.connectEnd, requestStart = entry.requestStart, responseStart = entry.responseStart, responseEnd = entry.responseEnd;
  var details = {
    firstbyte: msToNs(responseStart - requestStart),
    trans: msToNs(responseEnd - responseStart),
    downloadTime: formatTiming(startTime, responseStart, responseEnd),
    firstByteTime: formatTiming(startTime, requestStart, responseStart)
  };
  if (responseStart > 0 && responseStart <= preferredNow()) {
    details.ttfb = msToNs(responseStart - requestStart);
  }
  if (connectEnd !== fetchStart) {
    details.tcp = msToNs(connectEnd - connectStart);
    details.connectTime = formatTiming(startTime, connectStart, connectEnd);
    if (areInOrder(connectStart, secureConnectionStart, connectEnd)) {
      details.ssl = msToNs(connectEnd - secureConnectionStart);
      details.sslTime = formatTiming(startTime, secureConnectionStart, connectEnd);
    }
  }
  if (domainLookupEnd !== fetchStart) {
    details.dns = msToNs(domainLookupEnd - domainLookupStart);
    details.dnsTime = formatTiming(startTime, domainLookupStart, domainLookupEnd);
  }
  if (hasRedirection(entry)) {
    details.redirect = msToNs(redirectEnd - redirectStart);
    details.redirectTime = formatTiming(startTime, redirectStart, redirectEnd);
  }
  if (entry.renderBlockingStatus) {
    details.renderBlockingStatus = entry.renderBlockingStatus;
  }
  return details;
}
function hasValidResourceEntryDuration(entry) {
  return entry.duration >= 0;
}
function hasValidResourceEntryTimings(entry) {
  var areCommonTimingsInOrder = areInOrder(entry.startTime, entry.fetchStart, entry.domainLookupStart, entry.domainLookupEnd, entry.connectStart, entry.connectEnd, entry.requestStart, entry.responseStart, entry.responseEnd);
  var areRedirectionTimingsInOrder = hasRedirection(entry) ? areInOrder(entry.startTime, entry.redirectStart, entry.redirectEnd, entry.fetchStart) : true;
  return areCommonTimingsInOrder && areRedirectionTimingsInOrder;
}
function hasRedirection(entry) {
  return entry.redirectEnd > entry.startTime;
}
function formatTiming(origin, start, end) {
  return {
    duration: msToNs(end - start),
    start: msToNs(start - origin)
  };
}
function computeResourceEntrySize(entry) {
  if (entry.startTime < entry.responseStart) {
    return {
      size: entry.decodedBodySize,
      encodedBodySize: entry.encodedBodySize,
      decodedBodySize: entry.decodedBodySize,
      transferSize: entry.transferSize
    };
  }
  return {
    size: void 0,
    encodedBodySize: void 0,
    decodedBodySize: void 0,
    transferSize: void 0
  };
}
function isAllowedRequestUrl(configuration, url) {
  return url && !isIntakeRequest(url, configuration);
}
var DATA_URL_REGEX = /data:(.+)?(;base64)?,/g;
var MAX_ATTRIBUTE_VALUE_CHAR_LENGTH = 24e3;
function isLongDataUrl(url) {
  if (url.length <= MAX_ATTRIBUTE_VALUE_CHAR_LENGTH) {
    return false;
  } else if (url.substring(0, 5) === "data:") {
    url = url.substring(0, MAX_ATTRIBUTE_VALUE_CHAR_LENGTH);
    return true;
  }
  return false;
}
function sanitizeDataUrl(url) {
  return url.match(DATA_URL_REGEX)[0] + "[...]";
}
function retrieveFirstInputTiming(configuration, callback) {
  var startTimeStamp = dateNow();
  var timingSent = false;
  var _addEventListeners = addEventListeners(window, [DOM_EVENT.CLICK, DOM_EVENT.MOUSE_DOWN, DOM_EVENT.KEY_DOWN, DOM_EVENT.TOUCH_START, DOM_EVENT.POINTER_DOWN], function(evt) {
    if (!evt.cancelable) {
      return;
    }
    var timing = {
      entryType: "first-input",
      processingStart: relativeNow(),
      processingEnd: relativeNow(),
      startTime: evt.timeStamp,
      duration: 0,
      // arbitrary value to avoid nullable duration and simplify INP logic
      name: "",
      cancelable: false,
      target: null,
      toJSON: function toJSON() {
        return {};
      }
    };
    if (evt.type === DOM_EVENT.POINTER_DOWN) {
      sendTimingIfPointerIsNotCancelled(timing);
    } else {
      sendTiming(timing);
    }
  }, {
    passive: true,
    capture: true
  });
  var removeEventListeners = _addEventListeners.stop;
  return {
    stop: removeEventListeners
  };
  function sendTimingIfPointerIsNotCancelled(timing) {
    addEventListeners(window, [DOM_EVENT.POINTER_UP, DOM_EVENT.POINTER_CANCEL], function(event) {
      if (event.type === DOM_EVENT.POINTER_UP) {
        sendTiming(timing);
      }
    }, {
      once: true
    });
  }
  function sendTiming(timing) {
    if (!timingSent) {
      timingSent = true;
      removeEventListeners();
      var delay = timing.processingStart - timing.startTime;
      if (delay >= 0 && delay < dateNow() - startTimeStamp) {
        callback(timing);
      }
    }
  }
}
var RumPerformanceEntryType = {
  EVENT: "event",
  FIRST_INPUT: "first-input",
  LARGEST_CONTENTFUL_PAINT: "largest-contentful-paint",
  LAYOUT_SHIFT: "layout-shift",
  LONG_TASK: "longtask",
  LONG_ANIMATION_FRAME: "long-animation-frame",
  NAVIGATION: "navigation",
  PAINT: "paint",
  RESOURCE: "resource",
  VISIBILITY_STATE: "visibility-state"
};
function createPerformanceObservable(configuration, options) {
  return new Observable(function(observable) {
    if (!window.PerformanceObserver) {
      return;
    }
    var handlePerformanceEntries = function handlePerformanceEntries2(entries) {
      var rumPerformanceEntries = filterRumPerformanceEntries(configuration, entries);
      if (rumPerformanceEntries.length > 0) {
        observable.notify(rumPerformanceEntries);
      }
    };
    var timeoutId;
    var isObserverInitializing = true;
    var observer2 = new PerformanceObserver(monitor(function(entries) {
      if (isObserverInitializing) {
        timeoutId = setTimeout$1(function() {
          handlePerformanceEntries(entries.getEntries());
        });
      } else {
        handlePerformanceEntries(entries.getEntries());
      }
    }));
    try {
      observer2.observe(options);
    } catch (_unused) {
      var fallbackSupportedEntryTypes = [RumPerformanceEntryType.RESOURCE, RumPerformanceEntryType.NAVIGATION, RumPerformanceEntryType.LONG_TASK, RumPerformanceEntryType.PAINT];
      if (includes(fallbackSupportedEntryTypes, options.type)) {
        if (options.buffered) {
          timeoutId = setTimeout$1(function() {
            handlePerformanceEntries(performance.getEntriesByType(options.type));
          });
        }
        try {
          observer2.observe({
            entryTypes: [options.type]
          });
        } catch (_unused2) {
          return;
        }
      }
    }
    isObserverInitializing = false;
    manageResourceTimingBufferFull();
    var stopFirstInputTiming;
    if (!supportPerformanceTimingEvent(RumPerformanceEntryType.FIRST_INPUT) && options.type === RumPerformanceEntryType.FIRST_INPUT) {
      var _retrieveFirstInputTiming = retrieveFirstInputTiming(configuration, function(timing) {
        handlePerformanceEntries([timing]);
      });
      stopFirstInputTiming = _retrieveFirstInputTiming.stop;
    }
    return function() {
      observer2.disconnect();
      if (stopFirstInputTiming) {
        stopFirstInputTiming();
      }
      clearTimeout$1(timeoutId);
    };
  });
}
var resourceTimingBufferFullListener;
function manageResourceTimingBufferFull(configuration) {
  if (!resourceTimingBufferFullListener && supportPerformanceObject() && "addEventListener" in performance) {
    resourceTimingBufferFullListener = addEventListener(performance, "resourcetimingbufferfull", function() {
      performance.clearResourceTimings();
    });
  }
  return function() {
    resourceTimingBufferFullListener && resourceTimingBufferFullListener.stop();
  };
}
function supportPerformanceObject() {
  return window.performance !== void 0 && "getEntries" in performance;
}
function supportPerformanceTimingEvent(entryType) {
  return window.PerformanceObserver && PerformanceObserver.supportedEntryTypes !== void 0 && PerformanceObserver.supportedEntryTypes.includes(entryType);
}
function filterRumPerformanceEntries(configuration, entries) {
  return entries.filter(function(entry) {
    return !isForbiddenResource(configuration, entry);
  });
}
function isForbiddenResource(configuration, entry) {
  return entry.entryType === RumPerformanceEntryType.RESOURCE && (!isAllowedRequestUrl(configuration, entry.name) || !hasValidResourceEntryDuration(entry));
}
function startLongTaskCollection(lifeCycle, configuration) {
  var performanceLongTaskSubscription = createPerformanceObservable(configuration, {
    type: RumPerformanceEntryType.LONG_TASK,
    buffered: true
  }).subscribe(function(entries) {
    for (var i = 0; i < entries.length; i++) {
      var entry = entries[i];
      if (entry.entryType !== RumPerformanceEntryType.LONG_TASK) {
        break;
      }
      var startClocks = relativeToClocks(entry.startTime);
      var rawRumEvent = {
        date: startClocks.timeStamp,
        longTask: {
          id: UUID(),
          entryType: RumLongTaskEntryType.LONG_TASK,
          duration: toServerDuration(entry.duration)
        },
        type: RumEventType.LONG_TASK
      };
      lifeCycle.notify(LifeCycleEventType.RAW_RUM_EVENT_COLLECTED, {
        rawRumEvent,
        startTime: startClocks.relative,
        domainContext: {
          performanceEntry: entry
        }
      });
    }
  });
  return {
    stop: function stop() {
      performanceLongTaskSubscription.unsubscribe();
    }
  };
}
function startLongAnimationFrameCollection(lifeCycle, configuration) {
  var performanceResourceSubscription = createPerformanceObservable(configuration, {
    type: RumPerformanceEntryType.LONG_ANIMATION_FRAME,
    buffered: true
  }).subscribe(function(entries) {
    for (var _i = 0, entries_1 = entries; _i < entries_1.length; _i++) {
      var entry = entries_1[_i];
      var startClocks = relativeToClocks(entry.startTime);
      var rawRumEvent = {
        date: startClocks.timeStamp,
        longTask: {
          id: UUID(),
          entryType: RumLongTaskEntryType.LONG_ANIMATION_FRAME,
          duration: toServerDuration(entry.duration),
          blockingDuration: toServerDuration(entry.blockingDuration),
          firstUiEventTimestamp: toServerDuration(entry.firstUIEventTimestamp),
          renderStart: toServerDuration(entry.renderStart),
          styleAndLayoutStart: toServerDuration(entry.styleAndLayoutStart),
          startTime: toServerDuration(entry.startTime),
          scripts: entry.scripts.map(function(script) {
            return {
              duration: toServerDuration(script.duration),
              pause_duration: toServerDuration(script.pauseDuration),
              forced_style_and_layout_duration: toServerDuration(script.forcedStyleAndLayoutDuration),
              start_time: toServerDuration(script.startTime),
              execution_start: toServerDuration(script.executionStart),
              source_url: script.sourceURL,
              source_function_name: script.sourceFunctionName,
              source_char_position: script.sourceCharPosition,
              invoker: script.invoker,
              invoker_type: script.invokerType,
              window_attribution: script.windowAttribution
            };
          })
        },
        type: RumEventType.LONG_TASK
      };
      lifeCycle.notify(LifeCycleEventType.RAW_RUM_EVENT_COLLECTED, {
        rawRumEvent,
        startTime: startClocks.relative,
        domainContext: {
          performanceEntry: entry
        }
      });
    }
  });
  return {
    stop: function stop() {
      performanceResourceSubscription.unsubscribe();
    }
  };
}
function trackEventCounts(data) {
  var lifeCycle = data.lifeCycle;
  var isChildEvent = data.isChildEvent;
  var callback = data.onChange;
  if (callback === void 0) {
    callback = noop;
  }
  var eventCounts = {
    errorCount: 0,
    longTaskCount: 0,
    resourceCount: 0,
    actionCount: 0,
    frustrationCount: 0
  };
  var subscription = lifeCycle.subscribe(LifeCycleEventType.RUM_EVENT_COLLECTED, function(event) {
    if (event.type === RumEventType.VIEW || !isChildEvent(event)) {
      return;
    }
    switch (event.type) {
      case RumEventType.ERROR:
        eventCounts.errorCount += 1;
        callback();
        break;
      case RumEventType.ACTION:
        if (event.action.frustration) {
          eventCounts.frustrationCount += event.action.frustration.type.length;
        }
        eventCounts.actionCount += 1;
        callback();
        break;
      case RumEventType.LONG_TASK:
        eventCounts.longTaskCount += 1;
        callback();
        break;
      case RumEventType.RESOURCE:
        eventCounts.resourceCount += 1;
        callback();
        break;
    }
  });
  return {
    stop: function stop() {
      subscription.unsubscribe();
    },
    eventCounts
  };
}
var PAGE_ACTIVITY_VALIDATION_DELAY = 100;
var PAGE_ACTIVITY_END_DELAY = 100;
function waitPageActivityEnd(lifeCycle, domMutationObservable, configuration, pageActivityEndCallback, maxDuration) {
  var pageActivityObservable = createPageActivityObservable(lifeCycle, domMutationObservable, configuration);
  return doWaitPageActivityEnd(pageActivityObservable, pageActivityEndCallback, maxDuration);
}
function doWaitPageActivityEnd(pageActivityObservable, pageActivityEndCallback, maxDuration) {
  var pageActivityEndTimeoutId;
  var hasCompleted = false;
  var validationTimeoutId = setTimeout$1(function() {
    complete({
      hadActivity: false
    });
  }, PAGE_ACTIVITY_VALIDATION_DELAY);
  var maxDurationTimeoutId = maxDuration !== void 0 ? setTimeout$1(function() {
    return complete({
      hadActivity: true,
      end: timeStampNow()
    });
  }, maxDuration) : void 0;
  var pageActivitySubscription = pageActivityObservable.subscribe(function(data) {
    var isBusy = data.isBusy;
    clearTimeout$1(validationTimeoutId);
    clearTimeout$1(pageActivityEndTimeoutId);
    var lastChangeTime = timeStampNow();
    if (!isBusy) {
      pageActivityEndTimeoutId = setTimeout$1(function() {
        complete({
          hadActivity: true,
          end: lastChangeTime
        });
      }, PAGE_ACTIVITY_END_DELAY);
    }
  });
  var stop = function stop2() {
    hasCompleted = true;
    clearTimeout$1(validationTimeoutId);
    clearTimeout$1(pageActivityEndTimeoutId);
    clearTimeout$1(maxDurationTimeoutId);
    pageActivitySubscription.unsubscribe();
  };
  function complete(event) {
    if (hasCompleted) {
      return;
    }
    stop && stop();
    pageActivityEndCallback(event);
  }
  return {
    stop
  };
}
function createPageActivityObservable(lifeCycle, domMutationObservable, configuration) {
  return new Observable(function(observable) {
    var subscriptions = [];
    var firstRequestIndex;
    var pendingRequestsCount = 0;
    subscriptions.push(domMutationObservable.subscribe(function() {
      notifyPageActivity();
    }), createPerformanceObservable(configuration, {
      type: RumPerformanceEntryType.RESOURCE
    }).subscribe(function(entries) {
      if (some(entries, function(entry) {
        return !isExcludedUrl(configuration, entry.name);
      })) {
        notifyPageActivity();
      }
    }), lifeCycle.subscribe(LifeCycleEventType.REQUEST_STARTED, function(startEvent) {
      if (isExcludedUrl(configuration, startEvent.url)) {
        return;
      }
      if (firstRequestIndex === void 0) {
        firstRequestIndex = startEvent.requestIndex;
      }
      pendingRequestsCount += 1;
      notifyPageActivity();
    }), lifeCycle.subscribe(LifeCycleEventType.REQUEST_COMPLETED, function(request) {
      if (isExcludedUrl(configuration, request.url) || firstRequestIndex === void 0 || // If the request started before the tracking start, ignore it
      request.requestIndex < firstRequestIndex) {
        return;
      }
      pendingRequestsCount -= 1;
      notifyPageActivity();
    }));
    var _trackWindowOpen = trackWindowOpen(notifyPageActivity);
    var stopTrackingWindowOpen = _trackWindowOpen.stop;
    return function() {
      stopTrackingWindowOpen();
      each(subscriptions, function(s) {
        s.unsubscribe();
      });
    };
    function notifyPageActivity() {
      observable.notify({
        isBusy: pendingRequestsCount > 0
      });
    }
  });
}
function isExcludedUrl(configuration, requestUrl) {
  return matchList(configuration.excludedActivityUrls, requestUrl);
}
function trackWindowOpen(callback) {
  return instrumentMethod(window, "open", callback);
}
var MAX_DURATION_BETWEEN_CLICKS = ONE_SECOND;
var MAX_DISTANCE_BETWEEN_CLICKS = 100;
var ClickChainStatus = {
  WaitingForMoreClicks: 0,
  WaitingForClicksToStop: 1,
  Finalized: 2
};
function createClickChain(firstClick, onFinalize) {
  var bufferedClicks = [];
  var status = ClickChainStatus.WaitingForMoreClicks;
  var maxDurationBetweenClicksTimeout;
  appendClick(firstClick);
  function appendClick(click) {
    click.stopObservable.subscribe(tryFinalize);
    bufferedClicks.push(click);
    clearTimeout$1(maxDurationBetweenClicksTimeout);
    maxDurationBetweenClicksTimeout = setTimeout$1(dontAcceptMoreClick, MAX_DURATION_BETWEEN_CLICKS);
  }
  function tryFinalize() {
    if (status === ClickChainStatus.WaitingForClicksToStop && every(bufferedClicks, function(click) {
      return click.isStopped();
    })) {
      status = ClickChainStatus.Finalized;
      onFinalize(bufferedClicks);
    }
  }
  function dontAcceptMoreClick() {
    clearTimeout$1(maxDurationBetweenClicksTimeout);
    if (status === ClickChainStatus.WaitingForMoreClicks) {
      status = ClickChainStatus.WaitingForClicksToStop;
      tryFinalize();
    }
  }
  return {
    tryAppend: function tryAppend(click) {
      if (status !== ClickChainStatus.WaitingForMoreClicks) {
        return false;
      }
      if (bufferedClicks.length > 0 && !areEventsSimilar(bufferedClicks[bufferedClicks.length - 1].event, click.event)) {
        dontAcceptMoreClick();
        return false;
      }
      appendClick(click);
      return true;
    },
    stop: function stop() {
      dontAcceptMoreClick();
    }
  };
}
function areEventsSimilar(first, second) {
  return first.target === second.target && mouseEventDistance(first, second) <= MAX_DISTANCE_BETWEEN_CLICKS && second.timeStamp - first.timeStamp <= MAX_DURATION_BETWEEN_CLICKS;
}
function mouseEventDistance(origin, other) {
  return Math.sqrt(Math.pow(origin.clientX - other.clientX, 2) + Math.pow(origin.clientY - other.clientY, 2));
}
var DEFAULT_PROGRAMMATIC_ACTION_NAME_ATTRIBUTE = "data-guance-action-name";
function getActionNameFromElement(element, userProgrammaticAttribute) {
  return getActionNameFromElementProgrammatically(element, DEFAULT_PROGRAMMATIC_ACTION_NAME_ATTRIBUTE) || userProgrammaticAttribute && getActionNameFromElementProgrammatically(element, userProgrammaticAttribute) || getActionNameFromElementForStrategies(element, userProgrammaticAttribute, priorityStrategies) || getActionNameFromElementForStrategies(element, userProgrammaticAttribute, fallbackStrategies) || "";
}
function getActionNameFromElementProgrammatically(targetElement, programmaticAttribute) {
  var elementWithAttribute;
  if (supportsElementClosest()) {
    elementWithAttribute = targetElement.closest("[" + programmaticAttribute + "]");
  } else {
    var element = targetElement;
    while (element) {
      if (element.hasAttribute(programmaticAttribute)) {
        elementWithAttribute = element;
        break;
      }
      element = element.parentElement;
    }
  }
  if (!elementWithAttribute) {
    return;
  }
  var name = elementWithAttribute.getAttribute(programmaticAttribute);
  return truncate(normalizeWhitespace(name.trim()));
}
var priorityStrategies = [
  // associated LABEL text
  function(element, userProgrammaticAttribute) {
    if (supportsLabelProperty()) {
      if ("labels" in element && element.labels && element.labels.length > 0) {
        return getTextualContent(element.labels[0], userProgrammaticAttribute);
      }
    } else if (element.id) {
      var label = element.ownerDocument && find(element.ownerDocument.querySelectorAll("label"), function(label2) {
        return label2.htmlFor === element.id;
      });
      return label && getTextualContent(label, userProgrammaticAttribute);
    }
  },
  // INPUT button (and associated) value
  function(element) {
    if (element.nodeName === "INPUT") {
      var input = element;
      var type = input.getAttribute("type");
      if (type === "button" || type === "submit" || type === "reset") {
        return input.value;
      }
    }
  },
  // BUTTON, LABEL or button-like element text
  function(element, userProgrammaticAttribute) {
    if (element.nodeName === "BUTTON" || element.nodeName === "LABEL" || element.getAttribute("role") === "button") {
      return getTextualContent(element, userProgrammaticAttribute);
    }
  },
  function(element) {
    return element.getAttribute("aria-label");
  },
  // associated element text designated by the aria-labelledby attribute
  function(element, userProgrammaticAttribute) {
    var labelledByAttribute = element.getAttribute("aria-labelledby");
    if (labelledByAttribute) {
      labelledByAttribute = labelledByAttribute.split(/\s+/);
      labelledByAttribute = map(labelledByAttribute, function(id) {
        return getElementById(element, id);
      });
      labelledByAttribute = filter(labelledByAttribute, function(label) {
        return Boolean(label);
      });
      labelledByAttribute = map(labelledByAttribute, function(ele) {
        return getTextualContent(ele, userProgrammaticAttribute);
      });
      return labelledByAttribute.join(" ");
    }
  },
  function(element) {
    return element.getAttribute("alt");
  },
  function(element) {
    return element.getAttribute("name");
  },
  function(element) {
    return element.getAttribute("title");
  },
  function(element) {
    return element.getAttribute("placeholder");
  },
  // SELECT first OPTION text
  function(element, userProgrammaticAttribute) {
    if ("options" in element && element.options.length > 0) {
      return getTextualContent(element.options[0], userProgrammaticAttribute);
    }
  }
];
var fallbackStrategies = [function(element, userProgrammaticAttribute) {
  return getTextualContent(element, userProgrammaticAttribute);
}];
var MAX_PARENTS_TO_CONSIDER = 10;
function getActionNameFromElementForStrategies(targetElement, userProgrammaticAttribute, strategies) {
  var element = targetElement;
  var recursionCounter = 0;
  while (recursionCounter <= MAX_PARENTS_TO_CONSIDER && element && element.nodeName !== "BODY" && element.nodeName !== "HTML" && element.nodeName !== "HEAD") {
    for (var i = 0; i < strategies.length; i++) {
      var strategy = strategies[i];
      var name = strategy(element, userProgrammaticAttribute);
      if (typeof name === "string") {
        var trimmedName = name.trim();
        if (trimmedName) {
          return truncate(normalizeWhitespace(trimmedName));
        }
      }
    }
    if (element.nodeName === "FORM") {
      break;
    }
    element = element.parentElement;
    recursionCounter += 1;
  }
}
function normalizeWhitespace(s) {
  return s.replace(/\s+/g, " ");
}
function truncate(s) {
  return s.length > 100 ? safeTruncate(s, 100) + " [...]" : s;
}
function getElementById(refElement, id) {
  return refElement.ownerDocument ? refElement.ownerDocument.getElementById(id) : null;
}
function getTextualContent(element, userProgrammaticAttribute) {
  if (element.isContentEditable) {
    return;
  }
  if ("innerText" in element) {
    var text = element.innerText;
    var removeTextFromElements = function removeTextFromElements2(query) {
      var list = element.querySelectorAll(query);
      for (var index = 0; index < list.length; index += 1) {
        var _element = list[index];
        if ("innerText" in _element) {
          var textToReplace = _element.innerText;
          if (textToReplace && textToReplace.trim().length > 0) {
            text = text.replace(textToReplace, "");
          }
        }
      }
    };
    if (!supportsInnerTextScriptAndStyleRemoval()) {
      removeTextFromElements("script, style");
    }
    removeTextFromElements("[" + DEFAULT_PROGRAMMATIC_ACTION_NAME_ATTRIBUTE + "]");
    if (userProgrammaticAttribute) {
      removeTextFromElements("[" + userProgrammaticAttribute + "]");
    }
    return text;
  }
  return element.textContent;
}
function supportsInnerTextScriptAndStyleRemoval() {
  return !isIE();
}
var supportsLabelPropertyResult;
function supportsLabelProperty() {
  if (supportsLabelPropertyResult === void 0) {
    supportsLabelPropertyResult = "labels" in HTMLInputElement.prototype;
  }
  return supportsLabelPropertyResult;
}
var supportsElementClosestResult;
function supportsElementClosest() {
  if (supportsElementClosestResult === void 0) {
    supportsElementClosestResult = "closest" in HTMLElement.prototype;
  }
  return supportsElementClosestResult;
}
var STABLE_ATTRIBUTES = [
  DEFAULT_PROGRAMMATIC_ACTION_NAME_ATTRIBUTE,
  // Common test attributes (list provided by google recorder)
  "data-testid",
  "data-test",
  "data-qa",
  "data-cy",
  "data-test-id",
  "data-qa-id",
  "data-testing",
  // FullStory decorator attributes:
  "data-component",
  "data-element",
  "data-source-file"
];
var GLOBALLY_UNIQUE_SELECTOR_GETTERS = [getStableAttributeSelector, getIDSelector];
var UNIQUE_AMONG_CHILDREN_SELECTOR_GETTERS = [getStableAttributeSelector, getClassSelector, getTagNameSelector];
function getSelectorFromElement(targetElement, actionNameAttribute) {
  if (!isConnected(targetElement)) {
    return;
  }
  var targetElementSelector;
  var currentElement = targetElement;
  while (currentElement && currentElement.nodeName !== "HTML") {
    var globallyUniqueSelector = findSelector(currentElement, GLOBALLY_UNIQUE_SELECTOR_GETTERS, isSelectorUniqueGlobally, actionNameAttribute, targetElementSelector);
    if (globallyUniqueSelector) {
      return globallyUniqueSelector;
    }
    var uniqueSelectorAmongChildren = findSelector(currentElement, UNIQUE_AMONG_CHILDREN_SELECTOR_GETTERS, isSelectorUniqueAmongSiblings, actionNameAttribute, targetElementSelector);
    targetElementSelector = uniqueSelectorAmongChildren || combineSelector(getPositionSelector(currentElement), targetElementSelector);
    currentElement = currentElement.parentElement;
  }
  return targetElementSelector;
}
function isGeneratedValue(value) {
  return /[0-9]/.test(value);
}
function getIDSelector(element) {
  if (element.id && !isGeneratedValue(element.id)) {
    return "#" + cssEscape(element.id);
  }
}
function getClassSelector(element) {
  if (element.tagName === "BODY") {
    return;
  }
  if (element.classList.length > 0) {
    for (var i = 0; i < element.classList.length; i += 1) {
      var className = element.classList[i];
      if (isGeneratedValue(className)) {
        continue;
      }
      return cssEscape(element.tagName) + "." + cssEscape(className);
    }
  }
}
function getTagNameSelector(element) {
  return cssEscape(element.tagName);
}
function getStableAttributeSelector(element, actionNameAttribute) {
  if (actionNameAttribute) {
    var selector = getAttributeSelector(actionNameAttribute);
    if (selector) {
      return selector;
    }
  }
  for (var i = 0; i < STABLE_ATTRIBUTES.length; i++) {
    var attributeName = STABLE_ATTRIBUTES[i];
    var selector = getAttributeSelector(attributeName);
    if (selector) {
      return selector;
    }
  }
  function getAttributeSelector(attributeName2) {
    if (element.hasAttribute(attributeName2)) {
      return cssEscape(element.tagName) + "[" + attributeName2 + '="' + cssEscape(element.getAttribute(attributeName2)) + '"]';
    }
  }
}
function getPositionSelector(element) {
  var sibling = element.parentElement && element.parentElement.firstElementChild;
  var elementIndex = 1;
  while (sibling && sibling !== element) {
    if (sibling.tagName === element.tagName) {
      elementIndex += 1;
    }
    sibling = sibling.nextElementSibling;
  }
  var tagName = cssEscape(element.tagName);
  if (/^::/.test(tagName)) {
    return tagName;
  }
  return tagName + ":nth-of-type(" + elementIndex + ")";
}
function findSelector(element, selectorGetters, predicate, actionNameAttribute, childSelector) {
  for (var i = 0; i < selectorGetters.length; i++) {
    var selectorGetter = selectorGetters[i];
    var elementSelector = selectorGetter(element, actionNameAttribute);
    if (!elementSelector) {
      continue;
    }
    if (predicate(element, elementSelector, childSelector)) {
      return combineSelector(elementSelector, childSelector);
    }
  }
}
function isSelectorUniqueGlobally(element, elementSelector, childSelector) {
  return element.ownerDocument.querySelectorAll(combineSelector(elementSelector, childSelector)).length === 1;
}
function isSelectorUniqueAmongSiblings(currentElement, currentElementSelector, childSelector) {
  var isSiblingMatching;
  if (childSelector === void 0) {
    isSiblingMatching = function isSiblingMatching2(sibling2) {
      return sibling2.matches(currentElementSelector);
    };
  } else {
    var scopedSelector = supportScopeSelector() ? combineSelector("".concat(currentElementSelector, ":scope"), childSelector) : combineSelector(currentElementSelector, childSelector);
    isSiblingMatching = function isSiblingMatching2(sibling2) {
      return sibling2.querySelector(scopedSelector) !== null;
    };
  }
  var parent = currentElement.parentElement;
  var sibling = parent.firstElementChild;
  while (sibling) {
    if (sibling !== currentElement && isSiblingMatching(sibling)) {
      return false;
    }
    sibling = sibling.nextElementSibling;
  }
  return true;
}
function combineSelector(parent, child) {
  return child ? parent + ">" + child : parent;
}
var supportScopeSelectorCache;
function supportScopeSelector() {
  if (supportScopeSelectorCache === void 0) {
    try {
      document.querySelector(":scope");
      supportScopeSelectorCache = true;
    } catch (_unused) {
      supportScopeSelectorCache = false;
    }
  }
  return supportScopeSelectorCache;
}
function isConnected(element) {
  if ("isConnected" in element) {
    return element.isConnected;
  }
  return element.ownerDocument.documentElement.contains(element);
}
function listenActionEvents(events) {
  var selectionEmptyAtPointerDown;
  var userActivity = {
    selection: false,
    input: false,
    scroll: false
  };
  var clickContext;
  var listeners = [addEventListener(window, DOM_EVENT.POINTER_DOWN, function(event) {
    if (isValidPointerEvent(event)) {
      selectionEmptyAtPointerDown = isSelectionEmpty();
      userActivity = {
        selection: false,
        input: false,
        scroll: false
      };
      clickContext = events.onPointerDown(event);
    }
  }, {
    capture: true
  }), addEventListener(window, DOM_EVENT.SELECTION_CHANGE, function() {
    if (!selectionEmptyAtPointerDown || !isSelectionEmpty()) {
      userActivity.selection = true;
    }
  }, {
    capture: true
  }), addEventListener(window, DOM_EVENT.POINTER_UP, function(event) {
    if (isValidPointerEvent(event) && clickContext) {
      var localUserActivity = userActivity;
      events.onPointerUp(clickContext, event, function() {
        return localUserActivity;
      });
      clickContext = void 0;
    }
  }, {
    capture: true
  }), addEventListener(window, DOM_EVENT.SCROLL, function() {
    userActivity.scroll = true;
  }, {
    capture: true,
    passive: true
  }), addEventListener(window, DOM_EVENT.INPUT, function() {
    userActivity.input = true;
  }, {
    capture: true
  })];
  return {
    stop: function stop() {
      each(listeners, function(listener) {
        return listener.stop();
      });
    }
  };
}
function isSelectionEmpty() {
  var selection = window.getSelection();
  return !selection || selection.isCollapsed;
}
function isValidPointerEvent(event) {
  return event.target instanceof Element && // Only consider 'primary' pointer events for now. Multi-touch support could be implemented in
  // the future.
  event.isPrimary !== false;
}
var MIN_CLICKS_PER_SECOND_TO_CONSIDER_RAGE = 3;
function computeFrustration(clicks, rageClick) {
  if (isRage(clicks)) {
    rageClick.addFrustration(FrustrationType.RAGE_CLICK);
    if (some(clicks, isDead)) {
      rageClick.addFrustration(FrustrationType.DEAD_CLICK);
    }
    if (rageClick.hasError()) {
      rageClick.addFrustration(FrustrationType.ERROR_CLICK);
    }
    return {
      isRage: true
    };
  }
  var hasSelectionChanged = some(clicks, function(click) {
    return click.getUserActivity().selection;
  });
  each(clicks, function(click) {
    if (click.hasError()) {
      click.addFrustration(FrustrationType.ERROR_CLICK);
    }
    if (isDead(click) && // Avoid considering clicks part of a double-click or triple-click selections as dead clicks
    !hasSelectionChanged) {
      click.addFrustration(FrustrationType.DEAD_CLICK);
    }
  });
  return {
    isRage: false
  };
}
function isRage(clicks) {
  if (some(clicks, function(click) {
    return click.getUserActivity().selection || click.getUserActivity().scroll;
  })) {
    return false;
  }
  for (var i = 0; i < clicks.length - (MIN_CLICKS_PER_SECOND_TO_CONSIDER_RAGE - 1); i += 1) {
    if (clicks[i + MIN_CLICKS_PER_SECOND_TO_CONSIDER_RAGE - 1].event.timeStamp - clicks[i].event.timeStamp <= ONE_SECOND) {
      return true;
    }
  }
  return false;
}
var DEAD_CLICK_EXCLUDE_SELECTOR = (
  // inputs that don't trigger a meaningful event like "input" when clicked, including textual
  // inputs (using a negative selector is shorter here)
  'input:not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="range"]),textarea,select,[contenteditable],[contenteditable] *,canvas,a[href],a[href] *'
);
function isDead(click) {
  if (click.hasPageActivity() || click.getUserActivity().input || click.getUserActivity().scroll) {
    return false;
  }
  var target = click.event.target;
  if (target.tagName === "LABEL" && target.hasAttribute("for")) {
    target = document.getElementById(target.getAttribute("for"));
  }
  return !target || !elementMatches(target, DEAD_CLICK_EXCLUDE_SELECTOR);
}
var CLICK_ACTION_MAX_DURATION = 10 * ONE_SECOND;
var interactionSelectorCache = /* @__PURE__ */ new Map();
function getInteractionSelector(relativeTimestamp) {
  var selector = interactionSelectorCache.get(relativeTimestamp);
  interactionSelectorCache["delete"](relativeTimestamp);
  return selector;
}
function updateInteractionSelector(relativeTimestamp, selector) {
  var now = relativeNow();
  interactionSelectorCache.set(relativeTimestamp, selector);
  interactionSelectorCache.forEach(function(_, relativeTimestamp2) {
    if (elapsed(relativeTimestamp2, now) > CLICK_ACTION_MAX_DURATION) {
      interactionSelectorCache["delete"](relativeTimestamp2);
    }
  });
}
var ACTION_CONTEXT_TIME_OUT_DELAY = 5 * ONE_MINUTE;
function trackClickActions(lifeCycle, domMutationObservable, configuration) {
  var history2 = new createValueHistory({
    expireDelay: ACTION_CONTEXT_TIME_OUT_DELAY
  });
  var stopObservable = new Observable();
  var currentClickChain;
  lifeCycle.subscribe(LifeCycleEventType.SESSION_RENEWED, function() {
    history2.reset();
  });
  lifeCycle.subscribe(LifeCycleEventType.VIEW_ENDED, stopClickChain);
  var _listenActionEvents = listenActionEvents({
    onPointerDown: function onPointerDown(pointerDownEvent) {
      return processPointerDown(configuration, lifeCycle, domMutationObservable, pointerDownEvent);
    },
    onPointerUp: function onPointerUp(data, startEvent, getUserActivity) {
      startClickAction(configuration, lifeCycle, domMutationObservable, history2, stopObservable, appendClickToClickChain, data.clickActionBase, startEvent, getUserActivity, data.hadActivityOnPointerDown);
    }
  });
  var stopActionEventsListener = _listenActionEvents.stop;
  var actionContexts = {
    findActionId: function findActionId(startTime) {
      var allIds = history2.findAll(startTime);
      if (allIds && allIds.length) {
        return allIds[allIds.length - 1];
      }
      return void 0;
    },
    findAllActionId: function findAllActionId(startTime) {
      return history2.findAll(startTime);
    }
  };
  return {
    stop: function stop() {
      stopClickChain();
      stopObservable.notify();
      stopActionEventsListener();
    },
    actionContexts
  };
  function stopClickChain() {
    if (currentClickChain) {
      currentClickChain.stop();
    }
  }
  function appendClickToClickChain(click) {
    if (!currentClickChain || !currentClickChain.tryAppend(click)) {
      var rageClick = click.clone();
      currentClickChain = createClickChain(click, function(clicks) {
        finalizeClicks(clicks, rageClick);
      });
    }
  }
}
function processPointerDown(configuration, lifeCycle, domMutationObservable, pointerDownEvent) {
  var clickActionBase = computeClickActionBase(pointerDownEvent, configuration.actionNameAttribute);
  var _hadActivityOnPointerDown = false;
  waitPageActivityEnd(lifeCycle, domMutationObservable, configuration, function(pageActivityEndEvent) {
    _hadActivityOnPointerDown = pageActivityEndEvent.hadActivity;
  }, PAGE_ACTIVITY_VALIDATION_DELAY);
  return {
    clickActionBase,
    hadActivityOnPointerDown: function hadActivityOnPointerDown() {
      return _hadActivityOnPointerDown;
    }
  };
}
function startClickAction(configuration, lifeCycle, domMutationObservable, history2, stopObservable, appendClickToClickChain, clickActionBase, startEvent, getUserActivity, hadActivityOnPointerDown) {
  var click = newClick(lifeCycle, history2, getUserActivity, clickActionBase, startEvent);
  appendClickToClickChain(click);
  var selector = clickActionBase && clickActionBase.target && clickActionBase.target.selector;
  if (selector) {
    updateInteractionSelector(startEvent.timeStamp, selector);
  }
  var _waitPageActivityEnd = waitPageActivityEnd(lifeCycle, domMutationObservable, configuration, function(pageActivityEndEvent) {
    if (pageActivityEndEvent.hadActivity && pageActivityEndEvent.end < click.startClocks.timeStamp) {
      click.discard();
    } else {
      if (pageActivityEndEvent.hadActivity) {
        click.stop(pageActivityEndEvent.end);
      } else if (hadActivityOnPointerDown()) {
        click.stop(
          // using the click start as activity end, so the click will have some activity but its
          // duration will be 0 (as the activity started before the click start)
          click.startClocks.timeStamp
        );
      } else {
        click.stop();
      }
    }
  }, CLICK_ACTION_MAX_DURATION);
  var stopWaitPageActivityEnd = _waitPageActivityEnd.stop;
  var viewEndedSubscription = lifeCycle.subscribe(LifeCycleEventType.VIEW_ENDED, function(data) {
    click.stop(data.endClocks.timeStamp);
  });
  var stopSubscription = stopObservable.subscribe(function() {
    click.stop();
  });
  click.stopObservable.subscribe(function() {
    viewEndedSubscription.unsubscribe();
    stopWaitPageActivityEnd();
    stopSubscription.unsubscribe();
  });
}
function computeClickActionBase(event, actionNameAttribute) {
  var rect = event.target.getBoundingClientRect();
  var selector = getSelectorFromElement(event.target, actionNameAttribute);
  if (selector) {
    updateInteractionSelector(event.timeStamp, selector);
  }
  return {
    type: ActionType.CLICK,
    target: {
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      selector
    },
    position: {
      x: Math.round(event.clientX - rect.left),
      y: Math.round(event.clientY - rect.top)
    },
    name: getActionNameFromElement(event.target, actionNameAttribute)
  };
}
var ClickStatus = {
  // Initial state, the click is still ongoing.
  ONGOING: 0,
  // The click is no more ongoing but still needs to be validated or discarded.
  STOPPED: 1,
  // Final state, the click has been stopped and validated or discarded.
  FINALIZED: 2
};
function newClick(lifeCycle, history2, getUserActivity, clickActionBase, startEvent) {
  var id = UUID();
  var startClocks = clocksNow();
  var historyEntry = history2.add(id, startClocks.relative);
  var eventCountsSubscription = trackEventCounts({
    lifeCycle,
    isChildEvent: function isChildEvent(event) {
      return event.action !== void 0 && (isArray(event.action.ids) ? includes(event.action.ids, id) : event.action.ids === id);
    }
  });
  var status = ClickStatus.ONGOING;
  var activityEndTime;
  var frustrationTypes = [];
  var stopObservable = new Observable();
  function stop(newActivityEndTime) {
    if (status !== ClickStatus.ONGOING) {
      return;
    }
    activityEndTime = newActivityEndTime;
    status = ClickStatus.STOPPED;
    if (activityEndTime) {
      historyEntry.close(getRelativeTime(activityEndTime));
    } else {
      historyEntry.remove();
    }
    eventCountsSubscription.stop();
    stopObservable.notify();
  }
  return {
    event: startEvent,
    stop,
    stopObservable,
    hasError: function hasError() {
      return eventCountsSubscription.eventCounts.errorCount > 0;
    },
    hasPageActivity: function hasPageActivity() {
      return activityEndTime !== void 0;
    },
    getUserActivity,
    addFrustration: function addFrustration(frustrationType) {
      frustrationTypes.push(frustrationType);
    },
    startClocks,
    isStopped: function isStopped() {
      return status === ClickStatus.STOPPED || status === ClickStatus.FINALIZED;
    },
    clone: function clone() {
      return newClick(lifeCycle, history2, getUserActivity, clickActionBase, startEvent);
    },
    validate: function validate(domEvents) {
      stop();
      if (status !== ClickStatus.STOPPED) {
        return;
      }
      var _eventCountsSubscription = eventCountsSubscription.eventCounts;
      var resourceCount = _eventCountsSubscription.resourceCount;
      var errorCount = _eventCountsSubscription.errorCount;
      var longTaskCount = _eventCountsSubscription.longTaskCount;
      var clickAction = assign({
        type: ActionType.CLICK,
        duration: activityEndTime && elapsed(startClocks.timeStamp, activityEndTime),
        startClocks,
        id,
        frustrationTypes,
        counts: {
          resourceCount,
          errorCount,
          longTaskCount
        },
        events: isNullUndefinedDefaultValue(domEvents, [startEvent]),
        event: startEvent
      }, clickActionBase);
      lifeCycle.notify(LifeCycleEventType.AUTO_ACTION_COMPLETED, clickAction);
      status = ClickStatus.FINALIZED;
    },
    discard: function discard() {
      stop();
      status = ClickStatus.FINALIZED;
    }
  };
}
function finalizeClicks(clicks, rageClick) {
  var _computeFrustration = computeFrustration(clicks, rageClick);
  var isRage2 = _computeFrustration.isRage;
  if (isRage2) {
    each(clicks, function(click) {
      click.discard();
    });
    rageClick.stop(timeStampNow());
    rageClick.validate(map(clicks, function(click) {
      return click.event;
    }));
  } else {
    rageClick.discard();
    each(clicks, function(click) {
      click.validate();
    });
  }
}
var MAX_PAGE_STATE_ENTRIES = 4e3;
var MAX_PAGE_STATE_ENTRIES_SELECTABLE = 500;
var PAGE_STATE_CONTEXT_TIME_OUT_DELAY = SESSION_TIME_OUT_DELAY;
var PageState = {
  ACTIVE: "active",
  PASSIVE: "passive",
  HIDDEN: "hidden",
  FROZEN: "frozen",
  TERMINATED: "terminated"
};
function startPageStateHistory(maxPageStateEntriesSelectable) {
  if (maxPageStateEntriesSelectable === void 0) {
    maxPageStateEntriesSelectable = MAX_PAGE_STATE_ENTRIES_SELECTABLE;
  }
  var pageStateEntryHistory = createValueHistory({
    expireDelay: PAGE_STATE_CONTEXT_TIME_OUT_DELAY,
    maxEntries: MAX_PAGE_STATE_ENTRIES
  });
  var currentPageState;
  if (supportPerformanceTimingEvent(RumPerformanceEntryType.VISIBILITY_STATE)) {
    var visibilityEntries = performance.getEntriesByType(RumPerformanceEntryType.VISIBILITY_STATE);
    visibilityEntries.forEach(function(entry) {
      var state2 = entry.name === "hidden" ? PageState.HIDDEN : PageState.ACTIVE;
      addPageState(state2, entry.startTime);
    });
  }
  addPageState(getPageState(), relativeNow());
  var _addEventListeners = addEventListeners(window, [DOM_EVENT.PAGE_SHOW, DOM_EVENT.FOCUS, DOM_EVENT.BLUR, DOM_EVENT.VISIBILITY_CHANGE, DOM_EVENT.RESUME, DOM_EVENT.FREEZE, DOM_EVENT.PAGE_HIDE], function(event) {
    addPageState(computePageState(event), event.timeStamp);
  }, {
    capture: true
  });
  var stopEventListeners = _addEventListeners.stop;
  function addPageState(nextPageState, startTime) {
    if (startTime === void 0) {
      startTime = relativeNow();
    }
    if (nextPageState === currentPageState) {
      return;
    }
    currentPageState = nextPageState;
    pageStateEntryHistory.closeActive(startTime);
    pageStateEntryHistory.add({
      state: currentPageState,
      startTime
    }, startTime);
  }
  var pageStateHistory = {
    findAll: function findAll(startTime, duration) {
      var pageStateEntries = pageStateEntryHistory.findAll(startTime, duration);
      return processPageStates(pageStateEntries, startTime, maxPageStateEntriesSelectable);
    },
    wasInPageStateAt: function wasInPageStateAt(state2, startTime) {
      return pageStateHistory.wasInPageStateDuringPeriod(state2, startTime, 0);
    },
    wasInPageStateDuringPeriod: function wasInPageStateDuringPeriod(state2, startTime, duration) {
      return pageStateEntryHistory.findAll(startTime, duration).some(function(pageState) {
        return pageState.state === state2;
      });
    },
    addPageState,
    stop: function stop() {
      stopEventListeners();
      pageStateEntryHistory.stop();
    }
  };
  return pageStateHistory;
}
function processPageStates(pageStateEntries, eventStartTime, maxPageStateEntriesSelectable) {
  if (pageStateEntries.length === 0) {
    return;
  }
  return pageStateEntries.slice(-maxPageStateEntriesSelectable).reverse().map(function(_ref) {
    var state2 = _ref.state, startTime = _ref.startTime;
    return {
      state: state2,
      start: toServerDuration(elapsed(eventStartTime, startTime))
    };
  });
}
function computePageState(event) {
  if (event.type === DOM_EVENT.FREEZE) {
    return PageState.FROZEN;
  } else if (event.type === DOM_EVENT.PAGE_HIDE) {
    return event.persisted ? PageState.FROZEN : PageState.TERMINATED;
  }
  return getPageState();
}
function getPageState() {
  if (document.visibilityState === "hidden") {
    return PageState.HIDDEN;
  }
  if (document.hasFocus()) {
    return PageState.ACTIVE;
  }
  return PageState.PASSIVE;
}
function startActionCollection(lifeCycle, domMutationObservable, configuration, pageStateHistory) {
  lifeCycle.subscribe(LifeCycleEventType.AUTO_ACTION_COMPLETED, function(action) {
    lifeCycle.notify(LifeCycleEventType.RAW_RUM_EVENT_COLLECTED, processAction(action, pageStateHistory));
  });
  var actionContexts = {
    findActionId: noop,
    findAllActionId: noop
  };
  if (configuration.trackUserInteractions) {
    actionContexts = trackClickActions(lifeCycle, domMutationObservable, configuration).actionContexts;
  }
  return {
    actionContexts,
    addAction: function addAction(action, savedCommonContext) {
      lifeCycle.notify(LifeCycleEventType.RAW_RUM_EVENT_COLLECTED, extend({
        savedCommonContext
      }, processAction(action, pageStateHistory)));
    }
  };
}
function processAction(action, pageStateHistory) {
  var _action$context;
  var autoActionProperties = isAutoAction(action) ? {
    action: {
      error: {
        count: action.counts.errorCount
      },
      id: action.id,
      loadingTime: discardNegativeDuration(toServerDuration(action.duration)),
      frustration: {
        type: action.frustrationTypes
      },
      long_task: {
        count: action.counts.longTaskCount
      },
      resource: {
        count: action.counts.resourceCount
      }
    },
    _gc: {
      action: {
        target: action.target,
        position: action.position
      }
    }
  } : {
    action: {
      loadingTime: ((_action$context = action.context) === null || _action$context === void 0 ? void 0 : _action$context.duration) || 0
    }
  };
  var customerContext = !isAutoAction(action) ? action.context : void 0;
  var actionEvent = extend2Lev({
    action: {
      id: UUID(),
      target: {
        name: action.name
      },
      type: action.type
    },
    date: action.startClocks.timeStamp,
    type: RumEventType.ACTION,
    view: {
      in_foreground: pageStateHistory.wasInPageStateAt(PageState.ACTIVE, action.startClocks.relative)
    }
  }, autoActionProperties);
  return {
    customerContext,
    rawRumEvent: actionEvent,
    startTime: action.startClocks.relative,
    domainContext: isAutoAction(action) ? {
      event: action.event,
      events: action.events
    } : {}
  };
}
function isAutoAction(action) {
  return action.type === ActionType.CLICK;
}
var DeflateEncoderStreamId = {
  REPLAY: 1,
  RUM: 2
};
function createDeflateEncoder(worker, streamId) {
  var rawBytesCount = 0;
  var compressedData = [];
  var compressedDataTrailer;
  var _isEmpty = true;
  var nextWriteActionId = 0;
  var pendingWriteActions = [];
  var wokerListener = addEventListener(worker, "message", function(params) {
    var workerResponse = params.data;
    if (workerResponse.type !== "wrote" || workerResponse.streamId && workerResponse.streamId !== streamId) {
      return;
    }
    var nextPendingAction = pendingWriteActions[0];
    if (nextPendingAction) {
      if (nextPendingAction.id === workerResponse.id) {
        pendingWriteActions.shift();
        rawBytesCount += workerResponse.additionalBytesCount;
        compressedData.push(workerResponse.result);
        compressedDataTrailer = workerResponse.trailer;
        if (nextPendingAction.writeCallback) {
          nextPendingAction.writeCallback(workerResponse.result.byteLength);
        } else if (nextPendingAction.finishCallback) {
          nextPendingAction.finishCallback();
        }
      } else if (nextPendingAction.id < workerResponse.id) {
        removeMessageListener();
        addTelemetryDebug("Worker responses received out of order.");
      }
    }
  });
  var removeMessageListener = wokerListener.stop;
  function consumeResult() {
    var output = compressedData.length === 0 ? new Uint8Array(0) : concatBuffers(compressedData.concat(compressedDataTrailer));
    var result = {
      rawBytesCount,
      output,
      outputBytesCount: output.byteLength,
      encoding: "deflate"
    };
    rawBytesCount = 0;
    compressedData = [];
    return result;
  }
  function sendResetIfNeeded() {
    if (!_isEmpty) {
      worker.postMessage({
        action: "reset",
        streamId
      });
      _isEmpty = true;
    }
  }
  return {
    isAsync: true,
    isEmpty: function isEmpty() {
      return _isEmpty;
    },
    write: function write(data, callback) {
      worker.postMessage({
        action: "write",
        id: nextWriteActionId,
        data,
        streamId
      });
      pendingWriteActions.push({
        id: nextWriteActionId,
        writeCallback: callback,
        data
      });
      _isEmpty = false;
      nextWriteActionId += 1;
    },
    finish: function finish(callback) {
      sendResetIfNeeded();
      if (!pendingWriteActions.length) {
        callback(consumeResult());
      } else {
        pendingWriteActions.forEach(function(pendingWriteAction) {
          delete pendingWriteAction.writeCallback;
        });
        pendingWriteActions[pendingWriteActions.length - 1].finishCallback = function() {
          return callback(consumeResult());
        };
      }
    },
    finishSync: function finishSync() {
      sendResetIfNeeded();
      var pendingData = pendingWriteActions.map(function(pendingWriteAction) {
        return pendingWriteAction.data;
      });
      pendingWriteActions.length = 0;
      return assign(consumeResult(), {
        pendingData
      });
    },
    estimateEncodedBytesCount: function estimateEncodedBytesCount(data) {
      return data.length / 8;
    },
    stop: function stop() {
      removeMessageListener();
    }
  };
}
var INITIALIZATION_TIME_OUT_DELAY = 10 * ONE_SECOND;
function createDeflateWorker(configuration) {
  return new Worker(configuration.workerUrl || URL.createObjectURL(new Blob(['!function(){"use strict";function t(t){for(var e=t.reduce((function(t,e){return t+e.length}),0),a=new Uint8Array(e),n=0,r=0,i=t;r<i.length;r++){var s=i[r];a.set(s,n),n+=s.length}return a}function e(t){for(var e=t.length;--e>=0;)t[e]=0}var a=256,n=286,r=30,i=15,s=new Uint8Array([0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0]),h=new Uint8Array([0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13]),l=new Uint8Array([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,3,7]),_=new Uint8Array([16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15]),o=new Array(576);e(o);var d=new Array(60);e(d);var u=new Array(512);e(u);var f=new Array(256);e(f);var c=new Array(29);e(c);var p,g,w,v=new Array(r);function b(t,e,a,n,r){this.static_tree=t,this.extra_bits=e,this.extra_base=a,this.elems=n,this.max_length=r,this.has_stree=t&&t.length}function m(t,e){this.dyn_tree=t,this.max_code=0,this.stat_desc=e}e(v);var y=function(t){return t<256?u[t]:u[256+(t>>>7)]},k=function(t,e){t.pending_buf[t.pending++]=255&e,t.pending_buf[t.pending++]=e>>>8&255},z=function(t,e,a){t.bi_valid>16-a?(t.bi_buf|=e<<t.bi_valid&65535,k(t,t.bi_buf),t.bi_buf=e>>16-t.bi_valid,t.bi_valid+=a-16):(t.bi_buf|=e<<t.bi_valid&65535,t.bi_valid+=a)},x=function(t,e,a){z(t,a[2*e],a[2*e+1])},A=function(t,e){var a=0;do{a|=1&t,t>>>=1,a<<=1}while(--e>0);return a>>>1},U=function(t,e,a){var n,r,s=new Array(16),h=0;for(n=1;n<=i;n++)s[n]=h=h+a[n-1]<<1;for(r=0;r<=e;r++){var l=t[2*r+1];0!==l&&(t[2*r]=A(s[l]++,l))}},I=function(t){var e;for(e=0;e<n;e++)t.dyn_ltree[2*e]=0;for(e=0;e<r;e++)t.dyn_dtree[2*e]=0;for(e=0;e<19;e++)t.bl_tree[2*e]=0;t.dyn_ltree[512]=1,t.opt_len=t.static_len=0,t.last_lit=t.matches=0},B=function(t){t.bi_valid>8?k(t,t.bi_buf):t.bi_valid>0&&(t.pending_buf[t.pending++]=t.bi_buf),t.bi_buf=0,t.bi_valid=0},E=function(t,e,a,n){var r=2*e,i=2*a;return t[r]<t[i]||t[r]===t[i]&&n[e]<=n[a]},S=function(t,e,a){for(var n=t.heap[a],r=a<<1;r<=t.heap_len&&(r<t.heap_len&&E(e,t.heap[r+1],t.heap[r],t.depth)&&r++,!E(e,n,t.heap[r],t.depth));)t.heap[a]=t.heap[r],a=r,r<<=1;t.heap[a]=n},C=function(t,e,n){var r,i,l,_,o=0;if(0!==t.last_lit)do{r=t.pending_buf[t.d_buf+2*o]<<8|t.pending_buf[t.d_buf+2*o+1],i=t.pending_buf[t.l_buf+o],o++,0===r?x(t,i,e):(l=f[i],x(t,l+a+1,e),0!==(_=s[l])&&(i-=c[l],z(t,i,_)),r--,l=y(r),x(t,l,n),0!==(_=h[l])&&(r-=v[l],z(t,r,_)))}while(o<t.last_lit);x(t,256,e)},D=function(t,e){var a,n,r,s=e.dyn_tree,h=e.stat_desc.static_tree,l=e.stat_desc.has_stree,_=e.stat_desc.elems,o=-1;for(t.heap_len=0,t.heap_max=573,a=0;a<_;a++)0!==s[2*a]?(t.heap[++t.heap_len]=o=a,t.depth[a]=0):s[2*a+1]=0;for(;t.heap_len<2;)s[2*(r=t.heap[++t.heap_len]=o<2?++o:0)]=1,t.depth[r]=0,t.opt_len--,l&&(t.static_len-=h[2*r+1]);for(e.max_code=o,a=t.heap_len>>1;a>=1;a--)S(t,s,a);r=_;do{a=t.heap[1],t.heap[1]=t.heap[t.heap_len--],S(t,s,1),n=t.heap[1],t.heap[--t.heap_max]=a,t.heap[--t.heap_max]=n,s[2*r]=s[2*a]+s[2*n],t.depth[r]=(t.depth[a]>=t.depth[n]?t.depth[a]:t.depth[n])+1,s[2*a+1]=s[2*n+1]=r,t.heap[1]=r++,S(t,s,1)}while(t.heap_len>=2);t.heap[--t.heap_max]=t.heap[1],function(t,e){var a,n,r,s,h,l,_=e.dyn_tree,o=e.max_code,d=e.stat_desc.static_tree,u=e.stat_desc.has_stree,f=e.stat_desc.extra_bits,c=e.stat_desc.extra_base,p=e.stat_desc.max_length,g=0;for(s=0;s<=i;s++)t.bl_count[s]=0;for(_[2*t.heap[t.heap_max]+1]=0,a=t.heap_max+1;a<573;a++)(s=_[2*_[2*(n=t.heap[a])+1]+1]+1)>p&&(s=p,g++),_[2*n+1]=s,n>o||(t.bl_count[s]++,h=0,n>=c&&(h=f[n-c]),l=_[2*n],t.opt_len+=l*(s+h),u&&(t.static_len+=l*(d[2*n+1]+h)));if(0!==g){do{for(s=p-1;0===t.bl_count[s];)s--;t.bl_count[s]--,t.bl_count[s+1]+=2,t.bl_count[p]--,g-=2}while(g>0);for(s=p;0!==s;s--)for(n=t.bl_count[s];0!==n;)(r=t.heap[--a])>o||(_[2*r+1]!==s&&(t.opt_len+=(s-_[2*r+1])*_[2*r],_[2*r+1]=s),n--)}}(t,e),U(s,o,t.bl_count)},j=function(t,e,a){var n,r,i=-1,s=e[1],h=0,l=7,_=4;for(0===s&&(l=138,_=3),e[2*(a+1)+1]=65535,n=0;n<=a;n++)r=s,s=e[2*(n+1)+1],++h<l&&r===s||(h<_?t.bl_tree[2*r]+=h:0!==r?(r!==i&&t.bl_tree[2*r]++,t.bl_tree[32]++):h<=10?t.bl_tree[34]++:t.bl_tree[36]++,h=0,i=r,0===s?(l=138,_=3):r===s?(l=6,_=3):(l=7,_=4))},M=function(t,e,a){var n,r,i=-1,s=e[1],h=0,l=7,_=4;for(0===s&&(l=138,_=3),n=0;n<=a;n++)if(r=s,s=e[2*(n+1)+1],!(++h<l&&r===s)){if(h<_)do{x(t,r,t.bl_tree)}while(0!=--h);else 0!==r?(r!==i&&(x(t,r,t.bl_tree),h--),x(t,16,t.bl_tree),z(t,h-3,2)):h<=10?(x(t,17,t.bl_tree),z(t,h-3,3)):(x(t,18,t.bl_tree),z(t,h-11,7));h=0,i=r,0===s?(l=138,_=3):r===s?(l=6,_=3):(l=7,_=4)}},L=!1,T=function(t,e,a,n){z(t,0+(n?1:0),3),function(t,e,a,n){B(t),n&&(k(t,a),k(t,~a)),t.pending_buf.set(t.window.subarray(e,e+a),t.pending),t.pending+=a}(t,e,a,!0)},H=function(t,e,n,r){var i,s,h=0;t.level>0?(2===t.strm.data_type&&(t.strm.data_type=function(t){var e,n=4093624447;for(e=0;e<=31;e++,n>>>=1)if(1&n&&0!==t.dyn_ltree[2*e])return 0;if(0!==t.dyn_ltree[18]||0!==t.dyn_ltree[20]||0!==t.dyn_ltree[26])return 1;for(e=32;e<a;e++)if(0!==t.dyn_ltree[2*e])return 1;return 0}(t)),D(t,t.l_desc),D(t,t.d_desc),h=function(t){var e;for(j(t,t.dyn_ltree,t.l_desc.max_code),j(t,t.dyn_dtree,t.d_desc.max_code),D(t,t.bl_desc),e=18;e>=3&&0===t.bl_tree[2*_[e]+1];e--);return t.opt_len+=3*(e+1)+5+5+4,e}(t),i=t.opt_len+3+7>>>3,(s=t.static_len+3+7>>>3)<=i&&(i=s)):i=s=n+5,n+4<=i&&-1!==e?T(t,e,n,r):4===t.strategy||s===i?(z(t,2+(r?1:0),3),C(t,o,d)):(z(t,4+(r?1:0),3),function(t,e,a,n){var r;for(z(t,e-257,5),z(t,a-1,5),z(t,n-4,4),r=0;r<n;r++)z(t,t.bl_tree[2*_[r]+1],3);M(t,t.dyn_ltree,e-1),M(t,t.dyn_dtree,a-1)}(t,t.l_desc.max_code+1,t.d_desc.max_code+1,h+1),C(t,t.dyn_ltree,t.dyn_dtree)),I(t),r&&B(t)},R={_tr_init:function(t){L||(!function(){var t,e,a,_,m,y=new Array(16);for(a=0,_=0;_<28;_++)for(c[_]=a,t=0;t<1<<s[_];t++)f[a++]=_;for(f[a-1]=_,m=0,_=0;_<16;_++)for(v[_]=m,t=0;t<1<<h[_];t++)u[m++]=_;for(m>>=7;_<r;_++)for(v[_]=m<<7,t=0;t<1<<h[_]-7;t++)u[256+m++]=_;for(e=0;e<=i;e++)y[e]=0;for(t=0;t<=143;)o[2*t+1]=8,t++,y[8]++;for(;t<=255;)o[2*t+1]=9,t++,y[9]++;for(;t<=279;)o[2*t+1]=7,t++,y[7]++;for(;t<=287;)o[2*t+1]=8,t++,y[8]++;for(U(o,287,y),t=0;t<r;t++)d[2*t+1]=5,d[2*t]=A(t,5);p=new b(o,s,257,n,i),g=new b(d,h,0,r,i),w=new b(new Array(0),l,0,19,7)}(),L=!0),t.l_desc=new m(t.dyn_ltree,p),t.d_desc=new m(t.dyn_dtree,g),t.bl_desc=new m(t.bl_tree,w),t.bi_buf=0,t.bi_valid=0,I(t)},_tr_stored_block:T,_tr_flush_block:H,_tr_tally:function(t,e,n){return t.pending_buf[t.d_buf+2*t.last_lit]=e>>>8&255,t.pending_buf[t.d_buf+2*t.last_lit+1]=255&e,t.pending_buf[t.l_buf+t.last_lit]=255&n,t.last_lit++,0===e?t.dyn_ltree[2*n]++:(t.matches++,e--,t.dyn_ltree[2*(f[n]+a+1)]++,t.dyn_dtree[2*y(e)]++),t.last_lit===t.lit_bufsize-1},_tr_align:function(t){z(t,2,3),x(t,256,o),function(t){16===t.bi_valid?(k(t,t.bi_buf),t.bi_buf=0,t.bi_valid=0):t.bi_valid>=8&&(t.pending_buf[t.pending++]=255&t.bi_buf,t.bi_buf>>=8,t.bi_valid-=8)}(t)}},K=function(t,e,a,n){for(var r=65535&t,i=t>>>16&65535,s=0;0!==a;){a-=s=a>2e3?2e3:a;do{i=i+(r=r+e[n++]|0)|0}while(--s);r%=65521,i%=65521}return r|i<<16},N=new Uint32Array(function(){for(var t,e=[],a=0;a<256;a++){t=a;for(var n=0;n<8;n++)t=1&t?3988292384^t>>>1:t>>>1;e[a]=t}return e}()),O=function(t,e,a,n){var r=N,i=n+a;t^=-1;for(var s=n;s<i;s++)t=t>>>8^r[255&(t^e[s])];return~t},q={2:"need dictionary",1:"stream end",0:"","-1":"file error","-2":"stream error","-3":"data error","-4":"insufficient memory","-5":"buffer error","-6":"incompatible version"},F=0,G=2,J=3,P=4,Q=0,V=1,W=-1,X=0,Y=8,Z=R._tr_init,$=R._tr_stored_block,tt=R._tr_flush_block,et=R._tr_tally,at=R._tr_align,nt=F,rt=1,it=J,st=P,ht=5,lt=Q,_t=V,ot=-2,dt=-3,ut=-5,ft=W,ct=1,pt=2,gt=3,wt=4,vt=X,bt=2,mt=Y,yt=258,kt=262,zt=103,xt=113,At=666,Ut=function(t,e){return t.msg=q[e],e},It=function(t){return(t<<1)-(t>4?9:0)},Bt=function(t){for(var e=t.length;--e>=0;)t[e]=0},Et=function(t,e,a){return(e<<t.hash_shift^a)&t.hash_mask},St=function(t){var e=t.state,a=e.pending;a>t.avail_out&&(a=t.avail_out),0!==a&&(t.output.set(e.pending_buf.subarray(e.pending_out,e.pending_out+a),t.next_out),t.next_out+=a,e.pending_out+=a,t.total_out+=a,t.avail_out-=a,e.pending-=a,0===e.pending&&(e.pending_out=0))},Ct=function(t,e){tt(t,t.block_start>=0?t.block_start:-1,t.strstart-t.block_start,e),t.block_start=t.strstart,St(t.strm)},Dt=function(t,e){t.pending_buf[t.pending++]=e},jt=function(t,e){t.pending_buf[t.pending++]=e>>>8&255,t.pending_buf[t.pending++]=255&e},Mt=function(t,e){var a,n,r=t.max_chain_length,i=t.strstart,s=t.prev_length,h=t.nice_match,l=t.strstart>t.w_size-kt?t.strstart-(t.w_size-kt):0,_=t.window,o=t.w_mask,d=t.prev,u=t.strstart+yt,f=_[i+s-1],c=_[i+s];t.prev_length>=t.good_match&&(r>>=2),h>t.lookahead&&(h=t.lookahead);do{if(_[(a=e)+s]===c&&_[a+s-1]===f&&_[a]===_[i]&&_[++a]===_[i+1]){i+=2,a++;do{}while(_[++i]===_[++a]&&_[++i]===_[++a]&&_[++i]===_[++a]&&_[++i]===_[++a]&&_[++i]===_[++a]&&_[++i]===_[++a]&&_[++i]===_[++a]&&_[++i]===_[++a]&&i<u);if(n=yt-(u-i),i=u-yt,n>s){if(t.match_start=e,s=n,n>=h)break;f=_[i+s-1],c=_[i+s]}}}while((e=d[e&o])>l&&0!=--r);return s<=t.lookahead?s:t.lookahead},Lt=function(t){var e,a,n,r,i,s,h,l,_,o,d=t.w_size;do{if(r=t.window_size-t.lookahead-t.strstart,t.strstart>=d+(d-kt)){t.window.set(t.window.subarray(d,d+d),0),t.match_start-=d,t.strstart-=d,t.block_start-=d,e=a=t.hash_size;do{n=t.head[--e],t.head[e]=n>=d?n-d:0}while(--a);e=a=d;do{n=t.prev[--e],t.prev[e]=n>=d?n-d:0}while(--a);r+=d}if(0===t.strm.avail_in)break;if(s=t.strm,h=t.window,l=t.strstart+t.lookahead,_=r,o=void 0,(o=s.avail_in)>_&&(o=_),a=0===o?0:(s.avail_in-=o,h.set(s.input.subarray(s.next_in,s.next_in+o),l),1===s.state.wrap?s.adler=K(s.adler,h,o,l):2===s.state.wrap&&(s.adler=O(s.adler,h,o,l)),s.next_in+=o,s.total_in+=o,o),t.lookahead+=a,t.lookahead+t.insert>=3)for(i=t.strstart-t.insert,t.ins_h=t.window[i],t.ins_h=Et(t,t.ins_h,t.window[i+1]);t.insert&&(t.ins_h=Et(t,t.ins_h,t.window[i+3-1]),t.prev[i&t.w_mask]=t.head[t.ins_h],t.head[t.ins_h]=i,i++,t.insert--,!(t.lookahead+t.insert<3)););}while(t.lookahead<kt&&0!==t.strm.avail_in)},Tt=function(t,e){for(var a,n;;){if(t.lookahead<kt){if(Lt(t),t.lookahead<kt&&e===nt)return 1;if(0===t.lookahead)break}if(a=0,t.lookahead>=3&&(t.ins_h=Et(t,t.ins_h,t.window[t.strstart+3-1]),a=t.prev[t.strstart&t.w_mask]=t.head[t.ins_h],t.head[t.ins_h]=t.strstart),0!==a&&t.strstart-a<=t.w_size-kt&&(t.match_length=Mt(t,a)),t.match_length>=3)if(n=et(t,t.strstart-t.match_start,t.match_length-3),t.lookahead-=t.match_length,t.match_length<=t.max_lazy_match&&t.lookahead>=3){t.match_length--;do{t.strstart++,t.ins_h=Et(t,t.ins_h,t.window[t.strstart+3-1]),a=t.prev[t.strstart&t.w_mask]=t.head[t.ins_h],t.head[t.ins_h]=t.strstart}while(0!=--t.match_length);t.strstart++}else t.strstart+=t.match_length,t.match_length=0,t.ins_h=t.window[t.strstart],t.ins_h=Et(t,t.ins_h,t.window[t.strstart+1]);else n=et(t,0,t.window[t.strstart]),t.lookahead--,t.strstart++;if(n&&(Ct(t,!1),0===t.strm.avail_out))return 1}return t.insert=t.strstart<2?t.strstart:2,e===st?(Ct(t,!0),0===t.strm.avail_out?3:4):t.last_lit&&(Ct(t,!1),0===t.strm.avail_out)?1:2},Ht=function(t,e){for(var a,n,r;;){if(t.lookahead<kt){if(Lt(t),t.lookahead<kt&&e===nt)return 1;if(0===t.lookahead)break}if(a=0,t.lookahead>=3&&(t.ins_h=Et(t,t.ins_h,t.window[t.strstart+3-1]),a=t.prev[t.strstart&t.w_mask]=t.head[t.ins_h],t.head[t.ins_h]=t.strstart),t.prev_length=t.match_length,t.prev_match=t.match_start,t.match_length=2,0!==a&&t.prev_length<t.max_lazy_match&&t.strstart-a<=t.w_size-kt&&(t.match_length=Mt(t,a),t.match_length<=5&&(t.strategy===ct||3===t.match_length&&t.strstart-t.match_start>4096)&&(t.match_length=2)),t.prev_length>=3&&t.match_length<=t.prev_length){r=t.strstart+t.lookahead-3,n=et(t,t.strstart-1-t.prev_match,t.prev_length-3),t.lookahead-=t.prev_length-1,t.prev_length-=2;do{++t.strstart<=r&&(t.ins_h=Et(t,t.ins_h,t.window[t.strstart+3-1]),a=t.prev[t.strstart&t.w_mask]=t.head[t.ins_h],t.head[t.ins_h]=t.strstart)}while(0!=--t.prev_length);if(t.match_available=0,t.match_length=2,t.strstart++,n&&(Ct(t,!1),0===t.strm.avail_out))return 1}else if(t.match_available){if((n=et(t,0,t.window[t.strstart-1]))&&Ct(t,!1),t.strstart++,t.lookahead--,0===t.strm.avail_out)return 1}else t.match_available=1,t.strstart++,t.lookahead--}return t.match_available&&(n=et(t,0,t.window[t.strstart-1]),t.match_available=0),t.insert=t.strstart<2?t.strstart:2,e===st?(Ct(t,!0),0===t.strm.avail_out?3:4):t.last_lit&&(Ct(t,!1),0===t.strm.avail_out)?1:2};function Rt(t,e,a,n,r){this.good_length=t,this.max_lazy=e,this.nice_length=a,this.max_chain=n,this.func=r}var Kt=[new Rt(0,0,0,0,(function(t,e){var a=65535;for(a>t.pending_buf_size-5&&(a=t.pending_buf_size-5);;){if(t.lookahead<=1){if(Lt(t),0===t.lookahead&&e===nt)return 1;if(0===t.lookahead)break}t.strstart+=t.lookahead,t.lookahead=0;var n=t.block_start+a;if((0===t.strstart||t.strstart>=n)&&(t.lookahead=t.strstart-n,t.strstart=n,Ct(t,!1),0===t.strm.avail_out))return 1;if(t.strstart-t.block_start>=t.w_size-kt&&(Ct(t,!1),0===t.strm.avail_out))return 1}return t.insert=0,e===st?(Ct(t,!0),0===t.strm.avail_out?3:4):(t.strstart>t.block_start&&(Ct(t,!1),t.strm.avail_out),1)})),new Rt(4,4,8,4,Tt),new Rt(4,5,16,8,Tt),new Rt(4,6,32,32,Tt),new Rt(4,4,16,16,Ht),new Rt(8,16,32,32,Ht),new Rt(8,16,128,128,Ht),new Rt(8,32,128,256,Ht),new Rt(32,128,258,1024,Ht),new Rt(32,258,258,4096,Ht)];function Nt(){this.strm=null,this.status=0,this.pending_buf=null,this.pending_buf_size=0,this.pending_out=0,this.pending=0,this.wrap=0,this.gzhead=null,this.gzindex=0,this.method=mt,this.last_flush=-1,this.w_size=0,this.w_bits=0,this.w_mask=0,this.window=null,this.window_size=0,this.prev=null,this.head=null,this.ins_h=0,this.hash_size=0,this.hash_bits=0,this.hash_mask=0,this.hash_shift=0,this.block_start=0,this.match_length=0,this.prev_match=0,this.match_available=0,this.strstart=0,this.match_start=0,this.lookahead=0,this.prev_length=0,this.max_chain_length=0,this.max_lazy_match=0,this.level=0,this.strategy=0,this.good_match=0,this.nice_match=0,this.dyn_ltree=new Uint16Array(1146),this.dyn_dtree=new Uint16Array(122),this.bl_tree=new Uint16Array(78),Bt(this.dyn_ltree),Bt(this.dyn_dtree),Bt(this.bl_tree),this.l_desc=null,this.d_desc=null,this.bl_desc=null,this.bl_count=new Uint16Array(16),this.heap=new Uint16Array(573),Bt(this.heap),this.heap_len=0,this.heap_max=0,this.depth=new Uint16Array(573),Bt(this.depth),this.l_buf=0,this.lit_bufsize=0,this.last_lit=0,this.d_buf=0,this.opt_len=0,this.static_len=0,this.matches=0,this.insert=0,this.bi_buf=0,this.bi_valid=0}var Ot=function(t){if(!t||!t.state)return Ut(t,ot);t.total_in=t.total_out=0,t.data_type=bt;var e=t.state;return e.pending=0,e.pending_out=0,e.wrap<0&&(e.wrap=-e.wrap),e.status=e.wrap?42:xt,t.adler=2===e.wrap?0:1,e.last_flush=nt,Z(e),lt},qt=function(t){var e,a=Ot(t);return a===lt&&((e=t.state).window_size=2*e.w_size,Bt(e.head),e.max_lazy_match=Kt[e.level].max_lazy,e.good_match=Kt[e.level].good_length,e.nice_match=Kt[e.level].nice_length,e.max_chain_length=Kt[e.level].max_chain,e.strstart=0,e.block_start=0,e.lookahead=0,e.insert=0,e.match_length=e.prev_length=2,e.match_available=0,e.ins_h=0),a},Ft=function(t,e,a,n,r,i){if(!t)return ot;var s=1;if(e===ft&&(e=6),n<0?(s=0,n=-n):n>15&&(s=2,n-=16),r<1||r>9||a!==mt||n<8||n>15||e<0||e>9||i<0||i>wt)return Ut(t,ot);8===n&&(n=9);var h=new Nt;return t.state=h,h.strm=t,h.wrap=s,h.gzhead=null,h.w_bits=n,h.w_size=1<<h.w_bits,h.w_mask=h.w_size-1,h.hash_bits=r+7,h.hash_size=1<<h.hash_bits,h.hash_mask=h.hash_size-1,h.hash_shift=~~((h.hash_bits+3-1)/3),h.window=new Uint8Array(2*h.w_size),h.head=new Uint16Array(h.hash_size),h.prev=new Uint16Array(h.w_size),h.lit_bufsize=1<<r+6,h.pending_buf_size=4*h.lit_bufsize,h.pending_buf=new Uint8Array(h.pending_buf_size),h.d_buf=1*h.lit_bufsize,h.l_buf=3*h.lit_bufsize,h.level=e,h.strategy=i,h.method=a,qt(t)},Gt={deflateInit:function(t,e){return Ft(t,e,mt,15,8,vt)},deflateInit2:Ft,deflateReset:qt,deflateResetKeep:Ot,deflateSetHeader:function(t,e){return t&&t.state?2!==t.state.wrap?ot:(t.state.gzhead=e,lt):ot},deflate:function(t,e){var a,n;if(!t||!t.state||e>ht||e<0)return t?Ut(t,ot):ot;var r=t.state;if(!t.output||!t.input&&0!==t.avail_in||r.status===At&&e!==st)return Ut(t,0===t.avail_out?ut:ot);r.strm=t;var i=r.last_flush;if(r.last_flush=e,42===r.status)if(2===r.wrap)t.adler=0,Dt(r,31),Dt(r,139),Dt(r,8),r.gzhead?(Dt(r,(r.gzhead.text?1:0)+(r.gzhead.hcrc?2:0)+(r.gzhead.extra?4:0)+(r.gzhead.name?8:0)+(r.gzhead.comment?16:0)),Dt(r,255&r.gzhead.time),Dt(r,r.gzhead.time>>8&255),Dt(r,r.gzhead.time>>16&255),Dt(r,r.gzhead.time>>24&255),Dt(r,9===r.level?2:r.strategy>=pt||r.level<2?4:0),Dt(r,255&r.gzhead.os),r.gzhead.extra&&r.gzhead.extra.length&&(Dt(r,255&r.gzhead.extra.length),Dt(r,r.gzhead.extra.length>>8&255)),r.gzhead.hcrc&&(t.adler=O(t.adler,r.pending_buf,r.pending,0)),r.gzindex=0,r.status=69):(Dt(r,0),Dt(r,0),Dt(r,0),Dt(r,0),Dt(r,0),Dt(r,9===r.level?2:r.strategy>=pt||r.level<2?4:0),Dt(r,3),r.status=xt);else{var s=mt+(r.w_bits-8<<4)<<8;s|=(r.strategy>=pt||r.level<2?0:r.level<6?1:6===r.level?2:3)<<6,0!==r.strstart&&(s|=32),s+=31-s%31,r.status=xt,jt(r,s),0!==r.strstart&&(jt(r,t.adler>>>16),jt(r,65535&t.adler)),t.adler=1}if(69===r.status)if(r.gzhead.extra){for(a=r.pending;r.gzindex<(65535&r.gzhead.extra.length)&&(r.pending!==r.pending_buf_size||(r.gzhead.hcrc&&r.pending>a&&(t.adler=O(t.adler,r.pending_buf,r.pending-a,a)),St(t),a=r.pending,r.pending!==r.pending_buf_size));)Dt(r,255&r.gzhead.extra[r.gzindex]),r.gzindex++;r.gzhead.hcrc&&r.pending>a&&(t.adler=O(t.adler,r.pending_buf,r.pending-a,a)),r.gzindex===r.gzhead.extra.length&&(r.gzindex=0,r.status=73)}else r.status=73;if(73===r.status)if(r.gzhead.name){a=r.pending;do{if(r.pending===r.pending_buf_size&&(r.gzhead.hcrc&&r.pending>a&&(t.adler=O(t.adler,r.pending_buf,r.pending-a,a)),St(t),a=r.pending,r.pending===r.pending_buf_size)){n=1;break}n=r.gzindex<r.gzhead.name.length?255&r.gzhead.name.charCodeAt(r.gzindex++):0,Dt(r,n)}while(0!==n);r.gzhead.hcrc&&r.pending>a&&(t.adler=O(t.adler,r.pending_buf,r.pending-a,a)),0===n&&(r.gzindex=0,r.status=91)}else r.status=91;if(91===r.status)if(r.gzhead.comment){a=r.pending;do{if(r.pending===r.pending_buf_size&&(r.gzhead.hcrc&&r.pending>a&&(t.adler=O(t.adler,r.pending_buf,r.pending-a,a)),St(t),a=r.pending,r.pending===r.pending_buf_size)){n=1;break}n=r.gzindex<r.gzhead.comment.length?255&r.gzhead.comment.charCodeAt(r.gzindex++):0,Dt(r,n)}while(0!==n);r.gzhead.hcrc&&r.pending>a&&(t.adler=O(t.adler,r.pending_buf,r.pending-a,a)),0===n&&(r.status=zt)}else r.status=zt;if(r.status===zt&&(r.gzhead.hcrc?(r.pending+2>r.pending_buf_size&&St(t),r.pending+2<=r.pending_buf_size&&(Dt(r,255&t.adler),Dt(r,t.adler>>8&255),t.adler=0,r.status=xt)):r.status=xt),0!==r.pending){if(St(t),0===t.avail_out)return r.last_flush=-1,lt}else if(0===t.avail_in&&It(e)<=It(i)&&e!==st)return Ut(t,ut);if(r.status===At&&0!==t.avail_in)return Ut(t,ut);if(0!==t.avail_in||0!==r.lookahead||e!==nt&&r.status!==At){var h=r.strategy===pt?function(t,e){for(var a;;){if(0===t.lookahead&&(Lt(t),0===t.lookahead)){if(e===nt)return 1;break}if(t.match_length=0,a=et(t,0,t.window[t.strstart]),t.lookahead--,t.strstart++,a&&(Ct(t,!1),0===t.strm.avail_out))return 1}return t.insert=0,e===st?(Ct(t,!0),0===t.strm.avail_out?3:4):t.last_lit&&(Ct(t,!1),0===t.strm.avail_out)?1:2}(r,e):r.strategy===gt?function(t,e){for(var a,n,r,i,s=t.window;;){if(t.lookahead<=yt){if(Lt(t),t.lookahead<=yt&&e===nt)return 1;if(0===t.lookahead)break}if(t.match_length=0,t.lookahead>=3&&t.strstart>0&&(n=s[r=t.strstart-1])===s[++r]&&n===s[++r]&&n===s[++r]){i=t.strstart+yt;do{}while(n===s[++r]&&n===s[++r]&&n===s[++r]&&n===s[++r]&&n===s[++r]&&n===s[++r]&&n===s[++r]&&n===s[++r]&&r<i);t.match_length=yt-(i-r),t.match_length>t.lookahead&&(t.match_length=t.lookahead)}if(t.match_length>=3?(a=et(t,1,t.match_length-3),t.lookahead-=t.match_length,t.strstart+=t.match_length,t.match_length=0):(a=et(t,0,t.window[t.strstart]),t.lookahead--,t.strstart++),a&&(Ct(t,!1),0===t.strm.avail_out))return 1}return t.insert=0,e===st?(Ct(t,!0),0===t.strm.avail_out?3:4):t.last_lit&&(Ct(t,!1),0===t.strm.avail_out)?1:2}(r,e):Kt[r.level].func(r,e);if(3!==h&&4!==h||(r.status=At),1===h||3===h)return 0===t.avail_out&&(r.last_flush=-1),lt;if(2===h&&(e===rt?at(r):e!==ht&&($(r,0,0,!1),e===it&&(Bt(r.head),0===r.lookahead&&(r.strstart=0,r.block_start=0,r.insert=0))),St(t),0===t.avail_out))return r.last_flush=-1,lt}return e!==st?lt:r.wrap<=0?_t:(2===r.wrap?(Dt(r,255&t.adler),Dt(r,t.adler>>8&255),Dt(r,t.adler>>16&255),Dt(r,t.adler>>24&255),Dt(r,255&t.total_in),Dt(r,t.total_in>>8&255),Dt(r,t.total_in>>16&255),Dt(r,t.total_in>>24&255)):(jt(r,t.adler>>>16),jt(r,65535&t.adler)),St(t),r.wrap>0&&(r.wrap=-r.wrap),0!==r.pending?lt:_t)},deflateEnd:function(t){if(!t||!t.state)return ot;var e=t.state.status;return 42!==e&&69!==e&&73!==e&&91!==e&&e!==zt&&e!==xt&&e!==At?Ut(t,ot):(t.state=null,e===xt?Ut(t,dt):lt)},deflateSetDictionary:function(t,e){var a=e.length;if(!t||!t.state)return ot;var n=t.state,r=n.wrap;if(2===r||1===r&&42!==n.status||n.lookahead)return ot;if(1===r&&(t.adler=K(t.adler,e,a,0)),n.wrap=0,a>=n.w_size){0===r&&(Bt(n.head),n.strstart=0,n.block_start=0,n.insert=0);var i=new Uint8Array(n.w_size);i.set(e.subarray(a-n.w_size,a),0),e=i,a=n.w_size}var s=t.avail_in,h=t.next_in,l=t.input;for(t.avail_in=a,t.next_in=0,t.input=e,Lt(n);n.lookahead>=3;){var _=n.strstart,o=n.lookahead-2;do{n.ins_h=Et(n,n.ins_h,n.window[_+3-1]),n.prev[_&n.w_mask]=n.head[n.ins_h],n.head[n.ins_h]=_,_++}while(--o);n.strstart=_,n.lookahead=2,Lt(n)}return n.strstart+=n.lookahead,n.block_start=n.strstart,n.insert=n.lookahead,n.lookahead=0,n.match_length=n.prev_length=2,n.match_available=0,t.next_in=h,t.input=l,t.avail_in=s,n.wrap=r,lt},deflateInfo:"pako deflate (from Nodeca project)"};for(var Jt=new Uint8Array(256),Pt=0;Pt<256;Pt++)Jt[Pt]=Pt>=252?6:Pt>=248?5:Pt>=240?4:Pt>=224?3:Pt>=192?2:1;Jt[254]=Jt[254]=1;var Qt=function(){this.input=null,this.next_in=0,this.avail_in=0,this.total_in=0,this.output=null,this.next_out=0,this.avail_out=0,this.total_out=0,this.msg="",this.state=null,this.data_type=2,this.adler=0},Vt=Object.prototype.toString,Wt=F,Xt=G,Yt=J,Zt=P,$t=Q,te=V,ee=W,ae=X,ne=Y;function re(){this.options={level:ee,method:ne,chunkSize:16384,windowBits:15,memLevel:8,strategy:ae};var t=this.options;t.raw&&t.windowBits>0?t.windowBits=-t.windowBits:t.gzip&&t.windowBits>0&&t.windowBits<16&&(t.windowBits+=16),this.err=0,this.msg="",this.ended=!1,this.chunks=[],this.strm=new Qt,this.strm.avail_out=0;var e=Gt.deflateInit2(this.strm,t.level,t.method,t.windowBits,t.memLevel,t.strategy);if(e!==$t)throw new Error(q[e]);if(t.header&&Gt.deflateSetHeader(this.strm,t.header),t.dictionary){var a;if(a="[object ArrayBuffer]"===Vt.call(t.dictionary)?new Uint8Array(t.dictionary):t.dictionary,(e=Gt.deflateSetDictionary(this.strm,a))!==$t)throw new Error(q[e]);this._dict_set=!0}}function ie(t,e,a){try{t.postMessage({type:"errored",error:e,streamId:a})}catch(n){t.postMessage({type:"errored",error:String(e),streamId:a})}}function se(t){var e=t.strm.adler;return new Uint8Array([3,0,e>>>24&255,e>>>16&255,e>>>8&255,255&e])}re.prototype.push=function(t,e){var a,n,r=this.strm,i=this.options.chunkSize;if(this.ended)return!1;for(n=e===~~e?e:!0===e?Zt:Wt,"[object ArrayBuffer]"===Vt.call(t)?r.input=new Uint8Array(t):r.input=t,r.next_in=0,r.avail_in=r.input.length;;)if(0===r.avail_out&&(r.output=new Uint8Array(i),r.next_out=0,r.avail_out=i),(n===Xt||n===Yt)&&r.avail_out<=6)this.onData(r.output.subarray(0,r.next_out)),r.avail_out=0;else{if((a=Gt.deflate(r,n))===te)return r.next_out>0&&this.onData(r.output.subarray(0,r.next_out)),a=Gt.deflateEnd(this.strm),this.onEnd(a),this.ended=!0,a===$t;if(0!==r.avail_out){if(n>0&&r.next_out>0)this.onData(r.output.subarray(0,r.next_out)),r.avail_out=0;else if(0===r.avail_in)break}else this.onData(r.output)}return!0},re.prototype.onData=function(t){this.chunks.push(t)},re.prototype.onEnd=function(t){t===$t&&(this.result=function(t){for(var e=0,a=0,n=t.length;a<n;a++)e+=t[a].length;for(var r=new Uint8Array(e),i=0,s=0,h=t.length;i<h;i++){var l=t[i];r.set(l,s),s+=l.length}return r}(this.chunks)),this.chunks=[],this.err=t,this.msg=this.strm.msg},function(e){void 0===e&&(e=self);try{var a=new Map;e.addEventListener("message",(function(n){try{var r=function(e,a){switch(a.action){case"init":return{type:"initialized",version:"3.3.1"};case"write":var n=e.get(a.streamId);n||(n=new re,e.set(a.streamId,n));var r=n.chunks.length,i=function(t){if("function"==typeof TextEncoder&&TextEncoder.prototype.encode)return(new TextEncoder).encode(t);var e,a,n,r,i,s=t.length,h=0;for(r=0;r<s;r++)55296==(64512&(a=t.charCodeAt(r)))&&r+1<s&&56320==(64512&(n=t.charCodeAt(r+1)))&&(a=65536+(a-55296<<10)+(n-56320),r++),h+=a<128?1:a<2048?2:a<65536?3:4;for(e=new Uint8Array(h),i=0,r=0;i<h;r++)55296==(64512&(a=t.charCodeAt(r)))&&r+1<s&&56320==(64512&(n=t.charCodeAt(r+1)))&&(a=65536+(a-55296<<10)+(n-56320),r++),a<128?e[i++]=a:a<2048?(e[i++]=192|a>>>6,e[i++]=128|63&a):a<65536?(e[i++]=224|a>>>12,e[i++]=128|a>>>6&63,e[i++]=128|63&a):(e[i++]=240|a>>>18,e[i++]=128|a>>>12&63,e[i++]=128|a>>>6&63,e[i++]=128|63&a);return e}(a.data);return n.push(i,G),{type:"wrote",id:a.id,streamId:a.streamId,result:t(n.chunks.slice(r)),trailer:se(n),additionalBytesCount:i.length};case"reset":e.delete(a.streamId)}}(a,n.data);r&&e.postMessage(r)}catch(t){ie(e,t,n.data&&"streamId"in n.data?n.data.streamId:void 0)}}))}catch(t){ie(e,t)}}()}();'])));
}
var DeflateWorkerStatus = {
  Nil: 0,
  Loading: 1,
  Error: 2,
  Initialized: 3
};
var state = {
  status: DeflateWorkerStatus.Nil
};
function startDeflateWorker(configuration, source, onInitializationFailure, createDeflateWorkerImpl) {
  if (createDeflateWorkerImpl === void 0) {
    createDeflateWorkerImpl = createDeflateWorker;
  }
  if (state.status === DeflateWorkerStatus.Nil) {
    doStartDeflateWorker(configuration, source, createDeflateWorkerImpl);
  }
  switch (state.status) {
    case DeflateWorkerStatus.Loading:
      state.initializationFailureCallbacks.push(onInitializationFailure);
      return state.worker;
    case DeflateWorkerStatus.Initialized:
      return state.worker;
  }
}
function getDeflateWorkerStatus() {
  return state.status;
}
function doStartDeflateWorker(configuration, source, createDeflateWorkerImpl) {
  if (createDeflateWorkerImpl === void 0) {
    createDeflateWorkerImpl = createDeflateWorker;
  }
  try {
    var worker = createDeflateWorkerImpl(configuration);
    var errorListener = addEventListener(worker, "error", function(error) {
      onError(configuration, source, error);
    });
    var messageListener = addEventListener(worker, "message", function(event) {
      var data = event.data;
      if (data.type === "errored") {
        onError(data.error, data.streamId);
      } else if (data.type === "initialized") {
        onInitialized(data.version);
      }
    });
    worker.postMessage({
      action: "init"
    });
    setTimeout$1(function() {
      return onTimeout(source);
    }, INITIALIZATION_TIME_OUT_DELAY);
    var stop = function stop2() {
      errorListener.stop();
      messageListener.stop();
    };
    state = {
      status: DeflateWorkerStatus.Loading,
      worker,
      stop,
      initializationFailureCallbacks: []
    };
  } catch (error) {
    onError(configuration, source, error);
  }
}
function onTimeout(source) {
  if (state.status === DeflateWorkerStatus.Loading) {
    display.error(source + " failed to start: a timeout occurred while initializing the Worker");
    state.initializationFailureCallbacks.forEach(function(callback) {
      callback();
    });
    state = {
      status: DeflateWorkerStatus.Error
    };
  }
}
function onInitialized(version) {
  if (state.status === DeflateWorkerStatus.Loading) {
    state = {
      status: DeflateWorkerStatus.Initialized,
      worker: state.worker,
      version,
      stop: state.stop
    };
  }
}
function onError(configuration, source, error, streamId) {
  if (state.status === DeflateWorkerStatus.Loading) {
    display.error(source + " failed to start: an error occurred while creating the Worker:", error);
    if (error instanceof Event || error instanceof Error && isMessageCspRelated$1(error.message)) {
      var baseMessage;
      if (configuration.workerUrl) {
        baseMessage = "Please make sure the Worker URL " + configuration.workerUrl + " is correct and CSP is correctly configured.";
      } else {
        baseMessage = "Please make sure CSP is correctly configured.";
      }
      display.error(baseMessage);
    } else {
      addTelemetryError(error);
    }
    if (state.status === DeflateWorkerStatus.Loading) {
      state.initializationFailureCallbacks.forEach(function(callback) {
        callback();
      });
    }
    state = {
      status: DeflateWorkerStatus.Error
    };
  } else {
    addTelemetryError(error, {
      worker_version: state.status === DeflateWorkerStatus.Initialized && state.version,
      stream_id: streamId
    });
  }
}
function isMessageCspRelated$1(message) {
  return includes(message, "Content Security Policy") || // Related to `require-trusted-types-for` CSP: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/require-trusted-types-for
  includes(message, "requires 'TrustedScriptURL'");
}
function startRumBatch(configuration, lifeCycle, telemetryEventObservable, reportError, pageExitObservable, sessionExpireObservable, createEncoder) {
  var batch = startBatchWithReplica(configuration, {
    endpoint: configuration.rumEndpoint,
    encoder: createEncoder(DeflateEncoderStreamId.RUM)
  }, reportError, pageExitObservable, sessionExpireObservable);
  lifeCycle.subscribe(LifeCycleEventType.RUM_EVENT_COLLECTED, function(serverRumEvent) {
    if (serverRumEvent.type === RumEventType.VIEW) {
      batch.upsert(serverRumEvent, serverRumEvent.view.id);
    } else {
      batch.add(serverRumEvent);
    }
  });
  telemetryEventObservable.subscribe(function(event) {
    batch.add(event);
  });
  return batch;
}
function startRumEventBridge(lifeCycle) {
  var bridge = getEventBridge();
  lifeCycle.subscribe(LifeCycleEventType.RUM_EVENT_COLLECTED, function(serverRumEvent) {
    var data = processedMessageByDataMap(serverRumEvent).rowData;
    bridge.send("rum", data);
  });
}
function _typeof$8(o) {
  "@babel/helpers - typeof";
  return _typeof$8 = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(o2) {
    return typeof o2;
  } : function(o2) {
    return o2 && "function" == typeof Symbol && o2.constructor === Symbol && o2 !== Symbol.prototype ? "symbol" : typeof o2;
  }, _typeof$8(o);
}
function ownKeys(e, r) {
  var t = Object.keys(e);
  if (Object.getOwnPropertySymbols) {
    var o = Object.getOwnPropertySymbols(e);
    r && (o = o.filter(function(r2) {
      return Object.getOwnPropertyDescriptor(e, r2).enumerable;
    })), t.push.apply(t, o);
  }
  return t;
}
function _objectSpread(e) {
  for (var r = 1; r < arguments.length; r++) {
    var t = null != arguments[r] ? arguments[r] : {};
    r % 2 ? ownKeys(Object(t), true).forEach(function(r2) {
      _defineProperty$2(e, r2, t[r2]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function(r2) {
      Object.defineProperty(e, r2, Object.getOwnPropertyDescriptor(t, r2));
    });
  }
  return e;
}
function _defineProperty$2(e, r, t) {
  return (r = _toPropertyKey$2(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: true, configurable: true, writable: true }) : e[r] = t, e;
}
function _toPropertyKey$2(t) {
  var i = _toPrimitive$2(t, "string");
  return "symbol" == _typeof$8(i) ? i : i + "";
}
function _toPrimitive$2(t, r) {
  if ("object" != _typeof$8(t) || !t) return t;
  var e = t[Symbol.toPrimitive];
  if (void 0 !== e) {
    var i = e.call(t, r);
    if ("object" != _typeof$8(i)) return i;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return ("string" === r ? String : Number)(t);
}
var SessionType = {
  SYNTHETICS: "synthetics",
  USER: "user"
};
var VIEW_MODIFIABLE_FIELD_PATHS = {
  "view.url": "string",
  "view.referrer": "string"
};
var USER_CUSTOMIZABLE_FIELD_PATHS = {
  context: "object"
};
var ROOT_MODIFIABLE_FIELD_PATHS = {
  service: "string",
  version: "string"
};
var modifiableFieldPathsByEvent = {};
function startRumAssembly(configuration, lifeCycle, sessionManager, userSessionManager, viewContexts, urlContexts, actionContexts, displayContext, getCommonContext, reportError) {
  modifiableFieldPathsByEvent[RumEventType.VIEW] = _objectSpread(_objectSpread({}, USER_CUSTOMIZABLE_FIELD_PATHS), VIEW_MODIFIABLE_FIELD_PATHS);
  modifiableFieldPathsByEvent[RumEventType.ERROR] = assign({
    "error.message": "string",
    "error.stack": "string",
    "error.resource.url": "string"
  }, USER_CUSTOMIZABLE_FIELD_PATHS, VIEW_MODIFIABLE_FIELD_PATHS, ROOT_MODIFIABLE_FIELD_PATHS);
  modifiableFieldPathsByEvent[RumEventType.RESOURCE] = assign({
    "resource.url": "string"
  }, USER_CUSTOMIZABLE_FIELD_PATHS, VIEW_MODIFIABLE_FIELD_PATHS, ROOT_MODIFIABLE_FIELD_PATHS);
  modifiableFieldPathsByEvent[RumEventType.ACTION] = assign({
    "action.target.name": "string"
  }, USER_CUSTOMIZABLE_FIELD_PATHS, VIEW_MODIFIABLE_FIELD_PATHS, ROOT_MODIFIABLE_FIELD_PATHS);
  modifiableFieldPathsByEvent[RumEventType.LONG_TASK] = assign({}, USER_CUSTOMIZABLE_FIELD_PATHS, VIEW_MODIFIABLE_FIELD_PATHS);
  var eventRateLimiters = {};
  eventRateLimiters[RumEventType.ERROR] = createEventRateLimiter(RumEventType.ERROR, configuration.eventRateLimiterThreshold, reportError);
  eventRateLimiters[RumEventType.ACTION] = createEventRateLimiter(RumEventType.ACTION, configuration.eventRateLimiterThreshold, reportError);
  lifeCycle.subscribe(LifeCycleEventType.RAW_RUM_EVENT_COLLECTED, function(data) {
    var startTime = data.startTime;
    var rawRumEvent = data.rawRumEvent;
    var savedCommonContext = data.savedCommonContext;
    var customerContext = data.customerContext;
    var domainContext = data.domainContext;
    var viewContext = viewContexts.findView(startTime);
    var urlContext = urlContexts.findUrl(startTime);
    var session = sessionManager.findTrackedSession(startTime);
    if (session && session.isErrorSession && !session.sessionHasError) return;
    if (session && viewContext && urlContext) {
      var actionId = actionContexts.findActionId(startTime);
      var actionIds = actionContexts.findAllActionId(startTime);
      var commonContext = savedCommonContext || getCommonContext();
      var rumContext = {
        _gc: {
          sdkName: configuration.sdkName,
          sdkVersion: configuration.sdkVersion,
          drift: currentDrift(),
          configuration: {
            session_sample_rate: round(configuration.sessionSampleRate, 3),
            session_replay_sample_rate: round(configuration.sessionReplaySampleRate, 3),
            session_on_error_sample_rate: round(configuration.sessionOnErrorSampleRate, 3),
            session_replay_on_error_sample_rate: round(configuration.sessionReplayOnErrorSampleRate, 3)
          }
        },
        terminal: {
          type: "web"
        },
        application: {
          id: configuration.applicationId
        },
        device: deviceInfo,
        env: configuration.env || "",
        service: viewContext.service || configuration.service || "browser",
        version: viewContext.version || configuration.version || "",
        source: "browser",
        date: timeStampNow(),
        user: {
          id: userSessionManager.getId(),
          is_signin: "F",
          is_login: false
        },
        session: {
          // must be computed on each event because synthetics instrumentation can be done after sdk execution
          // cf https://github.com/puppeteer/puppeteer/issues/3667
          type: getSessionType(),
          id: session.id,
          is_forced_session: session.isSessionForced
        },
        view: {
          id: viewContext.id,
          name: viewContext.name || urlContext.path,
          url: urlContext.url,
          referrer: urlContext.referrer,
          host: urlContext.host,
          path: urlContext.path,
          pathGroup: urlContext.pathGroup,
          pathname: urlContext.pathname,
          urlQuery: urlContext.urlQuery
        },
        action: needToAssembleWithAction(rawRumEvent) && actionId ? {
          id: actionId,
          ids: actionIds
        } : void 0,
        display: displayContext.get()
      };
      var rumEvent = extend2Lev(rumContext, viewContext, rawRumEvent);
      var serverRumEvent = withSnakeCaseKeys(rumEvent);
      var context = extend2Lev({}, commonContext.context, viewContext.context, customerContext);
      if (!isEmptyObject(context)) {
        serverRumEvent.context = context;
      }
      if (!("has_replay" in serverRumEvent.session)) {
        serverRumEvent.session.has_replay = commonContext.hasReplay;
      }
      if (session.errorSessionReplayAllowed) {
        serverRumEvent.session.has_replay = serverRumEvent.session.has_replay && session.sessionHasError;
      }
      if (serverRumEvent.type === "view") {
        serverRumEvent.session.sampled_for_error_replay = session.errorSessionReplayAllowed;
        serverRumEvent.session.sampled_for_error_session = session.isErrorSession;
        serverRumEvent.session.error_timestamp_for_session = session.sessionErrorTimestamp;
      }
      if (!isEmptyObject(commonContext.user)) {
        serverRumEvent.user = extend2Lev({
          // id: session.getAnonymousID(),
          is_signin: "T",
          is_login: true
        }, commonContext.user);
      }
      if (shouldSend(serverRumEvent, configuration.beforeSend, domainContext, eventRateLimiters)) {
        if (isEmptyObject(serverRumEvent.context)) {
          delete serverRumEvent.context;
        }
        lifeCycle.notify(LifeCycleEventType.RUM_EVENT_COLLECTED, serverRumEvent);
      }
    }
  });
}
function shouldSend(event, beforeSend2, domainContext, eventRateLimiters) {
  if (beforeSend2) {
    var result = limitModification(event, modifiableFieldPathsByEvent[event.type], function(event2) {
      return beforeSend2(event2, domainContext);
    });
    if (result === false && event.type !== RumEventType.VIEW) {
      return false;
    }
    if (result === false) {
      display.warn("Can't dismiss view events using beforeSend!");
    }
  }
  var rateLimitReached = false;
  if (eventRateLimiters[event.type]) {
    rateLimitReached = eventRateLimiters[event.type].isLimitReached();
  }
  return !rateLimitReached;
}
function needToAssembleWithAction(event) {
  return [RumEventType.ERROR, RumEventType.RESOURCE, RumEventType.LONG_TASK].indexOf(event.type) !== -1;
}
function getSessionType() {
  return window._DATAFLUX_SYNTHETICS_BROWSER === void 0 ? SessionType.USER : SessionType.SYNTHETICS;
}
var viewportObservable;
function initViewportObservable() {
  if (!viewportObservable) {
    viewportObservable = createViewportObservable();
  }
  return viewportObservable;
}
function createViewportObservable() {
  return new Observable(function(observable) {
    var _throttledUpdateDimension = throttle(function() {
      observable.notify(getViewportDimension());
    }, 200);
    var updateDimension = _throttledUpdateDimension.throttled;
    return addEventListener(window, DOM_EVENT.RESIZE, updateDimension, {
      capture: true,
      passive: true
    }).stop;
  });
}
function getViewportDimension() {
  var visual = window.visualViewport;
  if (visual) {
    return {
      width: Number(visual.width * visual.scale),
      height: Number(visual.height * visual.scale)
    };
  }
  return {
    width: Number(window.innerWidth || 0),
    height: Number(window.innerHeight || 0)
  };
}
function startDisplayContext() {
  var viewport = getViewportDimension();
  var unsubscribeViewport = initViewportObservable().subscribe(function(viewportDimension) {
    viewport = viewportDimension;
  }).unsubscribe;
  return {
    get: function get() {
      return {
        viewport
      };
    },
    stop: unsubscribeViewport
  };
}
function startInternalContext(applicationId, sessionManager, viewContexts, actionContexts, urlContexts) {
  return {
    get: function get(startTime) {
      var viewContext = viewContexts.findView(startTime);
      var urlContext = urlContexts.findUrl(startTime);
      var session = sessionManager.findTrackedSession(startTime);
      if (session && viewContext && urlContext) {
        var actionId = actionContexts.findActionId(startTime);
        var actionIds = actionContexts.findAllActionId(startTime);
        return {
          application: {
            id: applicationId
          },
          session: {
            id: session.id
          },
          userAction: actionId ? {
            id: actionId,
            ids: actionIds
          } : void 0,
          view: {
            id: viewContext.id,
            name: viewContext.name || urlContext.path,
            url: urlContext.url,
            referrer: urlContext.referrer,
            host: urlContext.host,
            path: urlContext.path,
            pathGroup: urlContext.pathGroup,
            pathname: urlContext.pathname,
            urlQuery: urlContext.urlQuery
          }
        };
      }
    }
  };
}
var URL_CONTEXT_TIME_OUT_DELAY = SESSION_TIME_OUT_DELAY;
function startUrlContexts(lifeCycle, locationChangeObservable, location2) {
  var urlContextHistory = createValueHistory({
    expireDelay: URL_CONTEXT_TIME_OUT_DELAY
  });
  var previousViewUrl;
  lifeCycle.subscribe(LifeCycleEventType.BEFORE_VIEW_CREATED, function(data) {
    var viewUrl = location2.href;
    urlContextHistory.add(buildUrlContext({
      url: viewUrl,
      location: location2,
      referrer: !previousViewUrl ? document.referrer : previousViewUrl
    }), data.startClocks.relative);
    previousViewUrl = viewUrl;
  });
  lifeCycle.subscribe(LifeCycleEventType.AFTER_VIEW_ENDED, function(data) {
    urlContextHistory.closeActive(data.endClocks.relative);
  });
  var locationChangeSubscription = locationChangeObservable.subscribe(function(data) {
    var current = urlContextHistory.find();
    if (current) {
      var changeTime = relativeNow();
      urlContextHistory.closeActive(changeTime);
      urlContextHistory.add(buildUrlContext({
        url: data.newLocation.href,
        location: data.newLocation,
        referrer: current.referrer
      }), changeTime);
    }
  });
  function buildUrlContext(data) {
    var pathname = data.location.pathname;
    var path = pathname;
    var hash = data.location.hash;
    if (hash && hash.indexOf("#/") === 0) {
      path = "/" + getPathFromHash(hash);
    }
    return {
      url: data.url,
      referrer: data.referrer,
      host: data.location.host,
      path,
      pathGroup: replaceNumberCharByPath(path),
      urlQuery: getQueryParamsFromUrl(data.location.href),
      pathname
    };
  }
  return {
    findUrl: function findUrl(startTime) {
      return urlContextHistory.find(startTime);
    },
    stop: function stop() {
      locationChangeSubscription.unsubscribe();
      urlContextHistory.stop();
    }
  };
}
var VIEW_CONTEXT_TIME_OUT_DELAY = SESSION_TIME_OUT_DELAY;
function startViewContexts(lifeCycle) {
  var viewContextHistory = createValueHistory({
    expireDelay: VIEW_CONTEXT_TIME_OUT_DELAY
  });
  lifeCycle.subscribe(LifeCycleEventType.BEFORE_VIEW_CREATED, function(view) {
    viewContextHistory.add(buildViewContext(view), view.startClocks.relative);
  });
  lifeCycle.subscribe(LifeCycleEventType.AFTER_VIEW_ENDED, function(data) {
    viewContextHistory.closeActive(data.endClocks.relative);
  });
  lifeCycle.subscribe(LifeCycleEventType.BEFORE_VIEW_UPDATED, function(viewUpdate) {
    var currentView = viewContextHistory.find(viewUpdate.startClocks.relative);
    if (currentView && viewUpdate.name) {
      currentView.name = viewUpdate.name;
    }
    if (currentView && viewUpdate.context) {
      currentView.context = viewUpdate.context;
    }
  });
  lifeCycle.subscribe(LifeCycleEventType.SESSION_RENEWED, function() {
    viewContextHistory.reset();
  });
  function buildViewContext(view) {
    return {
      service: view.service,
      version: view.version,
      context: view.context,
      id: view.id,
      name: view.name,
      startClocks: view.startClocks
    };
  }
  return {
    findView: function findView(startTime) {
      return viewContextHistory.find(startTime);
    },
    stop: function stop() {
      viewContextHistory.stop();
    }
  };
}
function trackConsoleError(errorObservable) {
  var subscription = initConsoleObservable([ConsoleApiName.error]).subscribe(function(consoleLog) {
    errorObservable.notify(consoleLog.error);
  });
  return {
    stop: function stop() {
      subscription.unsubscribe();
    }
  };
}
function trackReportError(configuration, errorObservable) {
  var subscription = initReportObservable(configuration, [RawReportType.cspViolation, RawReportType.intervention]).subscribe(function(reportError) {
    errorObservable.notify({
      startClocks: clocksNow(),
      message: reportError.message,
      stack: reportError.stack,
      type: reportError.type,
      source: ErrorSource.REPORT,
      handling: ErrorHandling.UNHANDLED
    });
  });
  return {
    stop: function stop() {
      subscription.unsubscribe();
    }
  };
}
function startErrorCollection(lifeCycle, configuration, sessionManager, pageStateHistory) {
  var errorObservable = new Observable();
  trackConsoleError(errorObservable);
  trackRuntimeError(errorObservable);
  trackReportError(configuration, errorObservable);
  var session = sessionManager.findTrackedSession();
  var hasError = session && session.isErrorSession && session.sessionHasError;
  if (session && session.isErrorSession) {
    lifeCycle.subscribe(LifeCycleEventType.SESSION_RENEWED, function() {
      hasError = false;
    });
  }
  errorObservable.subscribe(function(error) {
    if (session && session.isErrorSession && !hasError) {
      sessionManager.setErrorForSession();
      hasError = true;
    }
    lifeCycle.notify(LifeCycleEventType.RAW_ERROR_COLLECTED, {
      error
    });
  });
  return doStartErrorCollection(lifeCycle, pageStateHistory);
}
function doStartErrorCollection(lifeCycle, pageStateHistory) {
  lifeCycle.subscribe(LifeCycleEventType.RAW_ERROR_COLLECTED, function(error) {
    lifeCycle.notify(LifeCycleEventType.RAW_RUM_EVENT_COLLECTED, assign({
      customerContext: error.customerContext,
      savedCommonContext: error.savedCommonContext
    }, processError(error.error, pageStateHistory)));
  });
  return {
    addError: function addError(providedError, savedCommonContext) {
      var error = providedError.error;
      var stackTrace = error instanceof Error ? computeStackTrace(error) : void 0;
      var rawError = computeRawError({
        stackTrace,
        originalError: error,
        handlingStack: providedError.handlingStack,
        startClocks: providedError.startClocks,
        nonErrorPrefix: NonErrorPrefix.PROVIDED,
        source: ErrorSource.CUSTOM,
        handling: ErrorHandling.HANDLED
      });
      lifeCycle.notify(LifeCycleEventType.RAW_ERROR_COLLECTED, {
        customerContext: providedError.context,
        savedCommonContext,
        error: rawError
      });
    }
  };
}
function processError(error, pageStateHistory) {
  var rawRumEvent = {
    date: error.startClocks.timeStamp,
    error: {
      id: UUID(),
      message: error.message,
      source: error.source,
      stack: error.stack,
      handling_stack: error.handlingStack,
      type: error.type,
      handling: error.handling,
      causes: error.causes,
      source_type: "browser"
    },
    type: RumEventType.ERROR,
    view: {
      in_foreground: pageStateHistory.wasInPageStateAt(PageState.ACTIVE, error.startClocks.relative)
    }
  };
  return {
    rawRumEvent,
    startTime: error.startClocks.relative,
    domainContext: {
      error: error.originalError
    }
  };
}
var TIMING_MAXIMUM_DELAY = 10 * ONE_MINUTE;
function trackFirstContentfulPaint(configuration, firstHidden, callback) {
  var performanceSubscription = createPerformanceObservable(configuration, {
    type: RumPerformanceEntryType.PAINT,
    buffered: true
  }).subscribe(function(entries) {
    var fcpEntry = find(entries, function(entry) {
      return entry.entryType === RumPerformanceEntryType.PAINT && entry.name === "first-contentful-paint" && entry.startTime < firstHidden.getTimeStamp() && entry.startTime < TIMING_MAXIMUM_DELAY;
    });
    if (fcpEntry) {
      callback(fcpEntry.startTime);
    }
  });
  return {
    stop: performanceSubscription.unsubscribe
  };
}
function trackFirstInput(configuration, firstHidden, callback) {
  var performanceFirstInputSubscription = createPerformanceObservable(configuration, {
    type: RumPerformanceEntryType.FIRST_INPUT,
    buffered: true
  }).subscribe(function(entries) {
    var firstInputEntry = find(entries, function(entry) {
      return entry.entryType === RumPerformanceEntryType.FIRST_INPUT && entry.startTime < firstHidden.getTimeStamp();
    });
    if (firstInputEntry) {
      var firstInputDelay = elapsed(firstInputEntry.startTime, firstInputEntry.processingStart);
      var firstInputTargetSelector;
      if (firstInputEntry.target && isElementNode(firstInputEntry.target)) {
        firstInputTargetSelector = getSelectorFromElement(firstInputEntry.target, configuration.actionNameAttribute);
      }
      callback({
        // Ensure firstInputDelay to be positive, see
        // https://bugs.chromium.org/p/chromium/issues/detail?id=1185815
        delay: firstInputDelay >= 0 ? firstInputDelay : 0,
        time: firstInputEntry.startTime,
        targetSelector: firstInputTargetSelector
      });
    }
  });
  return {
    stop: function stop() {
      performanceFirstInputSubscription.unsubscribe();
    }
  };
}
function getNavigationEntry() {
  if (supportPerformanceTimingEvent(RumPerformanceEntryType.NAVIGATION)) {
    var navigationEntry = performance.getEntriesByType(RumPerformanceEntryType.NAVIGATION)[0];
    if (navigationEntry) {
      return navigationEntry;
    }
  }
  var timings = computeTimingsFromDeprecatedPerformanceTiming();
  var entry = assign({
    entryType: RumPerformanceEntryType.NAVIGATION,
    initiatorType: "navigation",
    name: window.location.href,
    startTime: 0,
    duration: timings.responseEnd,
    decodedBodySize: 0,
    encodedBodySize: 0,
    transferSize: 0,
    toJSON: function toJSON() {
      return assign({}, entry, {
        toJSON: void 0
      });
    }
  }, timings);
  return entry;
}
function computeTimingsFromDeprecatedPerformanceTiming() {
  var result = {};
  var timing = performance.timing;
  for (var key in timing) {
    if (isNumber(timing[key])) {
      var numberKey = key;
      var timingElement = timing[numberKey];
      result[numberKey] = timingElement === 0 ? 0 : getRelativeTime(timingElement);
    }
  }
  return result;
}
function trackNavigationTimings(configuration, callback, getNavigationEntryImpl) {
  if (getNavigationEntryImpl === void 0) {
    getNavigationEntryImpl = getNavigationEntry;
  }
  return waitAfterLoadEvent(function() {
    var entry = getNavigationEntryImpl();
    if (!isIncompleteNavigation(entry)) {
      callback(processNavigationEntry(entry));
    }
  });
}
function processNavigationEntry(entry) {
  return {
    fetchStart: entry.fetchStart,
    responseEnd: entry.responseEnd,
    domComplete: entry.domComplete,
    domContentLoaded: entry.domContentLoadedEventEnd,
    domInteractive: entry.domInteractive,
    loadEvent: entry.loadEventEnd,
    loadEventEnd: entry.loadEventEnd,
    loadEventStart: entry.loadEventStart,
    domContentLoadedEventEnd: entry.domContentLoadedEventEnd,
    domContentLoadedEventStart: entry.domContentLoadedEventStart,
    // In some cases the value reported is negative or is larger
    // than the current page time. Ignore these cases:
    // https://github.com/GoogleChrome/web-vitals/issues/137
    // https://github.com/GoogleChrome/web-vitals/issues/162
    firstByte: entry.responseStart >= 0 && entry.responseStart <= relativeNow() ? entry.responseStart : void 0
  };
}
function isIncompleteNavigation(entry) {
  return entry.loadEventEnd <= 0;
}
function waitAfterLoadEvent(callback) {
  var timeoutId;
  var _runOnReadyState = runOnReadyState("complete", function() {
    timeoutId = setTimeout$1(function() {
      callback();
    });
  });
  return {
    stop: function stop() {
      _runOnReadyState.stop();
      clearTimeout$1(timeoutId);
    }
  };
}
var LCP_MAXIMUM_DELAY = 10 * ONE_MINUTE;
function trackLargestContentfulPaint(configuration, firstHidden, eventTarget, callback) {
  var firstInteractionTimestamp = Infinity;
  var _addEventListeners = addEventListeners(eventTarget, [DOM_EVENT.POINTER_DOWN, DOM_EVENT.KEY_DOWN], function(event) {
    firstInteractionTimestamp = event.timeStamp;
  }, {
    capture: true,
    once: true
  });
  var stopEventListener = _addEventListeners.stop;
  var biggestLcpSize = 0;
  var performanceLcpSubscription = createPerformanceObservable(configuration, {
    type: RumPerformanceEntryType.LARGEST_CONTENTFUL_PAINT,
    buffered: true
  }).subscribe(function(entries) {
    var lcpEntry = findLast(entries, function(entry) {
      return entry.entryType === RumPerformanceEntryType.LARGEST_CONTENTFUL_PAINT && entry.startTime < firstInteractionTimestamp && entry.startTime < firstHidden.getTimeStamp() && entry.startTime < LCP_MAXIMUM_DELAY && // Ensure to get the LCP entry with the biggest size, see
      // https://bugs.chromium.org/p/chromium/issues/detail?id=1516655
      entry.size > biggestLcpSize;
    });
    if (lcpEntry) {
      var lcpTargetSelector;
      if (lcpEntry.element) {
        lcpTargetSelector = getSelectorFromElement(lcpEntry.element, configuration.actionNameAttribute);
      }
      callback({
        value: lcpEntry.startTime,
        targetSelector: lcpTargetSelector
      });
      biggestLcpSize = lcpEntry.size;
    }
  });
  return {
    stop: function stop() {
      stopEventListener();
      performanceLcpSubscription.unsubscribe();
    }
  };
}
function trackFirstHidden(viewStart, eventTarget) {
  if (typeof eventTarget === "undefined") {
    eventTarget = window;
  }
  if (document.visibilityState === "hidden" && !document.prerendering) {
    return {
      getTimeStamp: function getTimeStamp() {
        return 0;
      },
      stop: noop
    };
  }
  if (supportPerformanceTimingEvent(RumPerformanceEntryType.VISIBILITY_STATE) && !document.prerendering) {
    var firstHiddenEntry = performance.getEntriesByType(RumPerformanceEntryType.VISIBILITY_STATE).filter(function(entry) {
      return entry.name === "hidden";
    }).find(function(entry) {
      return entry.startTime >= viewStart.relative;
    });
    if (firstHiddenEntry) {
      return {
        getTimeStamp: function getTimeStamp() {
          return firstHiddenEntry.startTime;
        },
        stop: noop
      };
    }
  }
  var timeStamp = Infinity;
  var _addEventListeners = addEventListeners(eventTarget, [DOM_EVENT.PAGE_HIDE, DOM_EVENT.VISIBILITY_CHANGE, DOM_EVENT.PRERENDERING_CHANGE], function(event) {
    if (event.type === DOM_EVENT.PAGE_HIDE || document.visibilityState === "hidden") {
      timeStamp = event.timeStamp;
      _stop();
    }
  }, {
    capture: true
  }), _stop = _addEventListeners.stop;
  return {
    getTimeStamp: function getTimeStamp() {
      return timeStamp;
    },
    stop: function stop() {
      _stop();
    }
  };
}
function trackInitialViewMetrics(configuration, viewStart, setLoadEvent, scheduleViewUpdate) {
  var initialViewMetrics = {};
  var _trackNavigationTimings = trackNavigationTimings(configuration, function(navigationTimings) {
    setLoadEvent(navigationTimings.loadEvent);
    initialViewMetrics.navigationTimings = navigationTimings;
    scheduleViewUpdate();
  });
  var firstHidden = trackFirstHidden(viewStart);
  var stopNavigationTracking = _trackNavigationTimings.stop;
  var _trackFirstContentfulPaint = trackFirstContentfulPaint(configuration, firstHidden, function(firstContentfulPaint) {
    initialViewMetrics.firstContentfulPaint = firstContentfulPaint;
    scheduleViewUpdate();
  });
  var stopFCPTracking = _trackFirstContentfulPaint.stop;
  var _trackLargestContentfulPaint = trackLargestContentfulPaint(configuration, firstHidden, window, function(largestContentfulPaint) {
    initialViewMetrics.largestContentfulPaint = largestContentfulPaint;
    scheduleViewUpdate();
  });
  var stopLCPTracking = _trackLargestContentfulPaint.stop;
  var _trackFirstInput = trackFirstInput(configuration, firstHidden, function(firstInput) {
    initialViewMetrics.firstInput = firstInput;
    scheduleViewUpdate();
  });
  var stopFIDTracking = _trackFirstInput.stop;
  function stop() {
    stopNavigationTracking();
    stopFCPTracking();
    stopLCPTracking();
    stopFIDTracking();
    firstHidden.stop();
  }
  return {
    stop,
    initialViewMetrics
  };
}
var THROTTLE_SCROLL_DURATION = ONE_SECOND;
function trackScrollMetrics(configuration, viewStart, callback, scrollValues) {
  if (scrollValues === void 0) {
    scrollValues = createScrollValuesObservable();
  }
  var maxScrollDepth = 0;
  var maxScrollHeight = 0;
  var maxScrollHeightTime = 0;
  var subscription = scrollValues.subscribe(function(data) {
    var scrollDepth = data.scrollDepth;
    var scrollTop = data.scrollTop;
    var scrollHeight = data.scrollHeight;
    var shouldUpdate = false;
    if (scrollDepth > maxScrollDepth) {
      maxScrollDepth = scrollDepth;
      shouldUpdate = true;
    }
    if (scrollHeight > maxScrollHeight) {
      maxScrollHeight = scrollHeight;
      var now = relativeNow();
      maxScrollHeightTime = elapsed(viewStart.relative, now);
      shouldUpdate = true;
    }
    if (shouldUpdate) {
      callback({
        maxDepth: Math.min(maxScrollDepth, maxScrollHeight),
        maxDepthScrollTop: scrollTop,
        maxScrollHeight,
        maxScrollHeightTime
      });
    }
  });
  return {
    stop: function stop() {
      return subscription.unsubscribe();
    }
  };
}
function computeScrollValues() {
  var scrollTop = getScrollY();
  var viewport = getViewportDimension();
  var height = viewport.height;
  var scrollHeight = Math.round((document.scrollingElement || document.documentElement).scrollHeight);
  var scrollDepth = Math.round(height + scrollTop);
  return {
    scrollHeight,
    scrollDepth,
    scrollTop
  };
}
function createScrollValuesObservable(configuration, throttleDuration) {
  if (throttleDuration === void 0) {
    throttleDuration = THROTTLE_SCROLL_DURATION;
  }
  return new Observable(function(observable) {
    function notify3() {
      observable.notify(computeScrollValues());
    }
    if (window.ResizeObserver) {
      var throttledNotify = throttle(notify3, throttleDuration, {
        leading: false,
        trailing: true
      });
      var observerTarget = document.scrollingElement || document.documentElement;
      var resizeObserver = new ResizeObserver(monitor(throttledNotify.throttled));
      if (observerTarget) {
        resizeObserver.observe(observerTarget);
      }
      var eventListener = addEventListener(window, DOM_EVENT.SCROLL, throttledNotify.throttled, {
        passive: true
      });
      return function() {
        throttledNotify.cancel();
        resizeObserver.unobserve(observerTarget);
        eventListener.stop();
      };
    }
  });
}
function trackLoadingTime(lifeCycle, domMutationObservable, configuration, loadType, viewStart, callback) {
  var isWaitingForLoadEvent = loadType === ViewLoadingType.INITIAL_LOAD;
  var isWaitingForActivityLoadingTime = true;
  var loadingTimeCandidates = [];
  var firstHidden = trackFirstHidden(viewStart);
  function invokeCallbackIfAllCandidatesAreReceived() {
    if (!isWaitingForActivityLoadingTime && !isWaitingForLoadEvent && loadingTimeCandidates.length > 0) {
      var loadingTime = Math.max.apply(Math, loadingTimeCandidates);
      if (loadingTime < firstHidden.getTimeStamp() - viewStart.relative) {
        callback(loadingTime);
      }
    }
  }
  var _waitPageActivityEnd = waitPageActivityEnd(lifeCycle, domMutationObservable, configuration, function(event) {
    if (isWaitingForActivityLoadingTime) {
      isWaitingForActivityLoadingTime = false;
      if (event.hadActivity) {
        loadingTimeCandidates.push(elapsed(viewStart.timeStamp, event.end));
      }
      invokeCallbackIfAllCandidatesAreReceived();
    }
  });
  var _stop = _waitPageActivityEnd.stop;
  return {
    setLoadEvent: function setLoadEvent(loadEvent) {
      if (isWaitingForLoadEvent) {
        isWaitingForLoadEvent = false;
        loadingTimeCandidates.push(loadEvent);
        invokeCallbackIfAllCandidatesAreReceived();
      }
    },
    stop: function stop() {
      _stop();
      firstHidden.stop();
      if (isWaitingForActivityLoadingTime) {
        isWaitingForActivityLoadingTime = false;
        invokeCallbackIfAllCandidatesAreReceived();
      }
    }
  };
}
function trackCumulativeLayoutShift(configuration, viewStart, callback) {
  if (!isLayoutShiftSupported()) {
    return {
      stop: noop
    };
  }
  var maxClsValue = 0;
  var maxClsTarget;
  var maxClsStartTime;
  callback({
    value: 0
  });
  var window2 = slidingSessionWindow();
  var performanceSubscription = createPerformanceObservable(configuration, {
    type: RumPerformanceEntryType.LAYOUT_SHIFT,
    buffered: true
  }).subscribe(function(entries) {
    for (var _i = 0, entries_1 = entries; _i < entries_1.length; _i++) {
      var entry = entries_1[_i];
      if (entry.hadRecentInput || entry.startTime < viewStart) {
        continue;
      }
      var _update = window2.update(entry);
      var cumulatedValue = _update.cumulatedValue;
      var isMaxValue = _update.isMaxValue;
      if (isMaxValue) {
        var target = getTargetFromSource(entry.sources);
        maxClsTarget = target ? new WeakRef(target) : void 0;
        maxClsStartTime = elapsed(viewStart, entry.startTime);
      }
      if (cumulatedValue > maxClsValue) {
        maxClsValue = cumulatedValue;
        var target = maxClsTarget && maxClsTarget.deref();
        callback({
          value: round(maxClsValue, 4),
          targetSelector: target && getSelectorFromElement(target, configuration.actionNameAttribute),
          time: maxClsStartTime
        });
      }
    }
  });
  return {
    stop: function stop() {
      performanceSubscription.unsubscribe();
    }
  };
}
function getTargetFromSource(sources) {
  if (!sources) {
    return;
  }
  var source = find(sources, function(source2) {
    return !!source2.node && isElementNode(source2.node);
  });
  return source && source.node;
}
var MAX_WINDOW_DURATION = 5 * ONE_SECOND;
var MAX_UPDATE_GAP = ONE_SECOND;
function slidingSessionWindow() {
  var cumulatedValue = 0;
  var startTime;
  var endTime2;
  var maxValue = 0;
  return {
    update: function update(entry) {
      var shouldCreateNewWindow = startTime === void 0 || entry.startTime - endTime2 >= MAX_UPDATE_GAP || entry.startTime - startTime >= 5 * MAX_WINDOW_DURATION;
      var isMaxValue;
      if (shouldCreateNewWindow) {
        startTime = endTime2 = entry.startTime;
        maxValue = cumulatedValue = entry.value;
        isMaxValue = true;
      } else {
        cumulatedValue += entry.value;
        endTime2 = entry.startTime;
        isMaxValue = entry.value > maxValue;
        if (isMaxValue) {
          maxValue = entry.value;
        }
      }
      return {
        cumulatedValue,
        isMaxValue
      };
    }
  };
}
function isLayoutShiftSupported() {
  return supportPerformanceTimingEvent(RumPerformanceEntryType.LAYOUT_SHIFT) && "WeakRef" in window;
}
var observer;
var interactionCountEstimate = 0;
var minKnownInteractionId = Infinity;
var maxKnownInteractionId = 0;
function initInteractionCountPolyfill() {
  if ("interactionCount" in performance || observer) {
    return;
  }
  observer = new window.PerformanceObserver(monitor(function(entries) {
    entries.getEntries().forEach(function(e) {
      var entry = e;
      if (entry.interactionId) {
        minKnownInteractionId = Math.min(minKnownInteractionId, entry.interactionId);
        maxKnownInteractionId = Math.max(maxKnownInteractionId, entry.interactionId);
        interactionCountEstimate = (maxKnownInteractionId - minKnownInteractionId) / 7 + 1;
      }
    });
  }));
  observer.observe({
    type: "event",
    buffered: true,
    durationThreshold: 0
  });
}
var getInteractionCount = function getInteractionCount2() {
  return observer ? interactionCountEstimate : window.performance.interactionCount || 0;
};
var MAX_INTERACTION_ENTRIES = 10;
var MAX_INP_VALUE = 1 * ONE_MINUTE;
function trackInteractionToNextPaint(configuration, viewStart, viewLoadingType) {
  if (!isInteractionToNextPaintSupported()) {
    return {
      getInteractionToNextPaint: function getInteractionToNextPaint() {
        return void 0;
      },
      setViewEnd: noop,
      stop: noop
    };
  }
  var _trackViewInteractionCount = trackViewInteractionCount(viewLoadingType);
  var getViewInteractionCount = _trackViewInteractionCount.getViewInteractionCount;
  var stopViewInteractionCount = _trackViewInteractionCount.stopViewInteractionCount;
  var viewEnd = Infinity;
  var longestInteractions = trackLongestInteractions(getViewInteractionCount);
  var interactionToNextPaint = -1;
  var interactionToNextPaintTargetSelector;
  var interactionToNextPaintStartTime;
  function handleEntries(entries) {
    for (var _i = 0, entries_1 = entries; _i < entries_1.length; _i++) {
      var entry = entries_1[_i];
      if (entry.interactionId && entry.startTime >= viewStart && entry.startTime <= viewEnd) {
        longestInteractions.process(entry);
      }
    }
    var newInteraction = longestInteractions.estimateP98Interaction();
    if (newInteraction && newInteraction.duration !== interactionToNextPaint) {
      interactionToNextPaint = newInteraction.duration;
      interactionToNextPaintStartTime = elapsed(viewStart, newInteraction.startTime);
      interactionToNextPaintTargetSelector = getInteractionSelector(newInteraction.startTime);
      if (!interactionToNextPaintTargetSelector && newInteraction.target && isElementNode(newInteraction.target)) {
        interactionToNextPaintTargetSelector = getSelectorFromElement(newInteraction.target, configuration.actionNameAttribute);
      }
    }
  }
  var firstInputSubscription = createPerformanceObservable(configuration, {
    type: RumPerformanceEntryType.FIRST_INPUT,
    buffered: true
  }).subscribe(handleEntries);
  var eventSubscription = createPerformanceObservable(configuration, {
    type: RumPerformanceEntryType.EVENT,
    // durationThreshold only impact PerformanceEventTiming entries used for INP computation which requires a threshold at 40 (default is 104ms)
    // cf: https://github.com/GoogleChrome/web-vitals/blob/3806160ffbc93c3c4abf210a167b81228172b31c/src/onINP.ts#L202-L210
    durationThreshold: 40,
    buffered: true
  }).subscribe(handleEntries);
  return {
    getInteractionToNextPaint: function getInteractionToNextPaint() {
      if (interactionToNextPaint >= 0) {
        return {
          value: Math.min(interactionToNextPaint, MAX_INP_VALUE),
          targetSelector: interactionToNextPaintTargetSelector,
          time: interactionToNextPaintStartTime
        };
      } else if (getViewInteractionCount()) {
        return {
          value: 0
        };
      }
    },
    setViewEnd: function setViewEnd(viewEndTime) {
      viewEnd = viewEndTime;
      stopViewInteractionCount();
    },
    stop: function stop() {
      eventSubscription.unsubscribe();
      firstInputSubscription.unsubscribe();
    }
  };
}
function trackLongestInteractions(getViewInteractionCount) {
  var longestInteractions = [];
  function sortAndTrimLongestInteractions() {
    longestInteractions.sort(function(a, b) {
      return b.duration - a.duration;
    }).splice(MAX_INTERACTION_ENTRIES);
  }
  return {
    /**
     * Process the performance entry:
     * - if its duration is long enough, add the performance entry to the list of worst interactions
     * - if an entry with the same interaction id exists and its duration is lower than the new one, then replace it in the list of worst interactions
     */
    process: function process(entry) {
      var interactionIndex = longestInteractions.findIndex(function(interaction) {
        return entry.interactionId === interaction.interactionId;
      });
      var minLongestInteraction = longestInteractions[longestInteractions.length - 1];
      if (interactionIndex !== -1) {
        if (entry.duration > longestInteractions[interactionIndex].duration) {
          longestInteractions[interactionIndex] = entry;
          sortAndTrimLongestInteractions();
        }
      } else if (longestInteractions.length < MAX_INTERACTION_ENTRIES || entry.duration > minLongestInteraction.duration) {
        longestInteractions.push(entry);
        sortAndTrimLongestInteractions();
      }
    },
    /**
     * Compute the p98 longest interaction.
     * For better performance the computation is based on 10 longest interactions and the interaction count of the current view.
     */
    estimateP98Interaction: function estimateP98Interaction() {
      var interactionIndex = Math.min(longestInteractions.length - 1, Math.floor(getViewInteractionCount() / 50));
      return longestInteractions[interactionIndex];
    }
  };
}
function trackViewInteractionCount(viewLoadingType) {
  initInteractionCountPolyfill();
  var previousInteractionCount = viewLoadingType === ViewLoadingType.INITIAL_LOAD ? 0 : getInteractionCount();
  var state2 = {
    stopped: false
  };
  function computeViewInteractionCount() {
    return getInteractionCount() - previousInteractionCount;
  }
  return {
    getViewInteractionCount: function getViewInteractionCount() {
      if (state2.stopped) {
        return state2.interactionCount;
      }
      return computeViewInteractionCount();
    },
    stopViewInteractionCount: function stopViewInteractionCount() {
      state2 = {
        stopped: true,
        interactionCount: computeViewInteractionCount()
      };
    }
  };
}
function isInteractionToNextPaintSupported() {
  return supportPerformanceTimingEvent("event") && window.PerformanceEventTiming && "interactionId" in PerformanceEventTiming.prototype;
}
function trackCommonViewMetrics(lifeCycle, domMutationObservable, configuration, scheduleViewUpdate, loadingType, viewStart) {
  var commonViewMetrics = {};
  var _trackLoadingTime = trackLoadingTime(lifeCycle, domMutationObservable, configuration, loadingType, viewStart, function(newLoadingTime) {
    commonViewMetrics.loadingTime = newLoadingTime;
    scheduleViewUpdate();
  });
  var stopLoadingTimeTracking = _trackLoadingTime.stop;
  var setLoadEvent = _trackLoadingTime.setLoadEvent;
  var _trackScrollMetrics = trackScrollMetrics(configuration, viewStart, function(newScrollMetrics) {
    commonViewMetrics.scroll = newScrollMetrics;
  });
  var stopScrollMetricsTracking = _trackScrollMetrics.stop;
  var stopCLSTracking;
  var _trackCumulativeLayoutShift = trackCumulativeLayoutShift(configuration, viewStart.relative, function(cumulativeLayoutShift) {
    commonViewMetrics.cumulativeLayoutShift = cumulativeLayoutShift;
    scheduleViewUpdate();
  });
  var stopCLSTracking = _trackCumulativeLayoutShift.stop;
  var _trackInteractionToNextPaint = trackInteractionToNextPaint(configuration, viewStart.relative, loadingType);
  var stopINPTracking = _trackInteractionToNextPaint.stop;
  var getInteractionToNextPaint = _trackInteractionToNextPaint.getInteractionToNextPaint;
  var setViewEnd = _trackInteractionToNextPaint.setViewEnd;
  return {
    stop: function stop() {
      stopLoadingTimeTracking();
      stopCLSTracking();
      stopScrollMetricsTracking();
    },
    stopINPTracking,
    setLoadEvent,
    setViewEnd,
    getCommonViewMetrics: function getCommonViewMetrics() {
      commonViewMetrics.interactionToNextPaint = getInteractionToNextPaint();
      return commonViewMetrics;
    }
  };
}
function trackViewEventCounts(lifeCycle, viewId, onChange) {
  var _trackEventCounts = trackEventCounts({
    lifeCycle,
    isChildEvent: function isChildEvent(event) {
      return event.view.id === viewId;
    },
    onChange
  });
  return {
    stop: _trackEventCounts.stop,
    eventCounts: _trackEventCounts.eventCounts
  };
}
var THROTTLE_VIEW_UPDATE_PERIOD = 3e3;
var SESSION_KEEP_ALIVE_INTERVAL = 5 * ONE_MINUTE;
var KEEP_TRACKING_AFTER_VIEW_DELAY = 5 * ONE_MINUTE;
function trackViews(location2, lifeCycle, domMutationObservable, configuration, locationChangeObservable, areViewsTrackedAutomatically, initialViewOptions) {
  var activeViews = /* @__PURE__ */ new Set();
  function startNewView(loadingType, startClocks, viewOptions) {
    var newlyCreatedView = newView(lifeCycle, domMutationObservable, configuration, location2, loadingType, startClocks, viewOptions);
    activeViews.add(newlyCreatedView);
    newlyCreatedView.stopObservable.subscribe(function() {
      activeViews["delete"](newlyCreatedView);
    });
    return newlyCreatedView;
  }
  var currentView = startNewView(ViewLoadingType.INITIAL_LOAD, clocksOrigin(), initialViewOptions);
  startViewLifeCycle();
  var locationChangeSubscription;
  if (areViewsTrackedAutomatically) {
    locationChangeSubscription = renewViewOnLocationChange(locationChangeObservable);
  }
  function startViewLifeCycle() {
    lifeCycle.subscribe(LifeCycleEventType.SESSION_RENEWED, function() {
      currentView = startNewView(ViewLoadingType.ROUTE_CHANGE, void 0, {
        name: currentView.name,
        service: currentView.service,
        version: currentView.version,
        context: currentView.contextManager.getContext()
      });
    });
    lifeCycle.subscribe(LifeCycleEventType.SESSION_EXPIRED, function() {
      currentView.end({
        sessionIsActive: false
      });
    });
  }
  function renewViewOnLocationChange(locationChangeObservable2) {
    return locationChangeObservable2.subscribe(function(params) {
      var oldLocation = params.oldLocation;
      var newLocation = params.newLocation;
      if (areDifferentLocation(oldLocation, newLocation)) {
        currentView.end();
        currentView = startNewView(ViewLoadingType.ROUTE_CHANGE);
        return;
      }
    });
  }
  return {
    addTiming: function addTiming(name, time) {
      if (typeof time === "undefined") {
        time = timeStampNow();
      }
      currentView.addTiming(name, time);
    },
    startView: function startView(options, startClocks) {
      currentView.end({
        endClocks: startClocks
      });
      currentView = startNewView(ViewLoadingType.ROUTE_CHANGE, startClocks, options);
    },
    setViewContext: function setViewContext(context) {
      currentView.contextManager.setContext(context);
    },
    setViewContextProperty: function setViewContextProperty(key, value) {
      currentView.contextManager.setContextProperty(key, value);
    },
    setViewName: function setViewName(name) {
      currentView.setViewName(name);
    },
    getViewContext: function getViewContext() {
      return currentView.contextManager.getContext();
    },
    stop: function stop() {
      if (locationChangeSubscription) {
        locationChangeSubscription.unsubscribe();
      }
      currentView.end();
      activeViews.forEach(function(view) {
        view.stop();
      });
    }
  };
}
function newView(lifeCycle, domMutationObservable, configuration, initialLocation, loadingType, startClocks, viewOptions) {
  if (startClocks === void 0) {
    startClocks = clocksNow();
  }
  var id = UUID();
  var stopObservable = new Observable();
  var customTimings = {};
  var documentVersion = 0;
  var endClocks;
  var location2 = shallowClone(initialLocation);
  var contextManager = createContextManager();
  var sessionIsActive = true;
  var name;
  var service;
  var version;
  var context;
  if (viewOptions) {
    name = viewOptions.name;
    service = viewOptions.service;
    version = viewOptions.version;
    context = viewOptions.context;
  }
  if (context) {
    contextManager.setContext(context);
  }
  var viewCreatedEvent = {
    id,
    name,
    startClocks,
    service,
    version
  };
  lifeCycle.notify(LifeCycleEventType.BEFORE_VIEW_CREATED, viewCreatedEvent);
  lifeCycle.notify(LifeCycleEventType.VIEW_CREATED, viewCreatedEvent);
  var _scheduleViewUpdate = throttle(triggerViewUpdate, THROTTLE_VIEW_UPDATE_PERIOD, {
    leading: false
  });
  var throttled = _scheduleViewUpdate.throttled;
  var cancelScheduleViewUpdate = _scheduleViewUpdate.cancel;
  var _trackCommonViewMetrics = trackCommonViewMetrics(lifeCycle, domMutationObservable, configuration, scheduleViewUpdate, loadingType, startClocks);
  var setLoadEvent = _trackCommonViewMetrics.setLoadEvent;
  var stopCommonViewMetricsTracking = _trackCommonViewMetrics.stop;
  var getCommonViewMetrics = _trackCommonViewMetrics.getCommonViewMetrics;
  var stopINPTracking = _trackCommonViewMetrics.stopINPTracking;
  var setViewEnd = _trackCommonViewMetrics.setViewEnd;
  var _trackInitialViewTimings = loadingType === ViewLoadingType.INITIAL_LOAD ? trackInitialViewMetrics(configuration, startClocks, setLoadEvent, scheduleViewUpdate) : {
    stop: noop,
    initialViewMetrics: {}
  };
  var stopInitialViewMetricsTracking = _trackInitialViewTimings.stop;
  var initialViewMetrics = _trackInitialViewTimings.initialViewMetrics;
  var _trackViewEventCounts = trackViewEventCounts(lifeCycle, id, scheduleViewUpdate);
  var stopEventCountsTracking = _trackViewEventCounts.stop;
  var eventCounts = _trackViewEventCounts.eventCounts;
  var keepAliveIntervalId = setInterval(triggerViewUpdate, SESSION_KEEP_ALIVE_INTERVAL);
  var pageMayExitSubscription = lifeCycle.subscribe(LifeCycleEventType.PAGE_EXITED, function(pageMayExitEvent) {
    if (pageMayExitEvent.reason === PageExitReason.UNLOADING) {
      triggerViewUpdate();
    }
  });
  triggerViewUpdate();
  contextManager.changeObservable.subscribe(scheduleViewUpdate);
  function triggerBeforeViewUpdate() {
    lifeCycle.notify(LifeCycleEventType.BEFORE_VIEW_UPDATED, {
      id,
      name,
      context: contextManager.getContext(),
      startClocks
    });
  }
  function scheduleViewUpdate() {
    triggerBeforeViewUpdate();
    throttled();
  }
  function triggerViewUpdate() {
    cancelScheduleViewUpdate();
    triggerBeforeViewUpdate();
    documentVersion += 1;
    var currentEnd = endClocks === void 0 ? timeStampNow() : endClocks.timeStamp;
    lifeCycle.notify(LifeCycleEventType.VIEW_UPDATED, {
      customTimings,
      documentVersion,
      id,
      name,
      service,
      version,
      context: contextManager.getContext(),
      loadingType,
      location: location2,
      startClocks,
      commonViewMetrics: getCommonViewMetrics(),
      initialViewMetrics,
      duration: elapsed(startClocks.timeStamp, currentEnd),
      isActive: endClocks === void 0,
      sessionIsActive,
      eventCounts
    });
  }
  var result = {
    name,
    service,
    version,
    contextManager,
    stopObservable,
    end: function end(options) {
      if (endClocks) {
        return;
      }
      endClocks = isNullUndefinedDefaultValue(options && options.endClocks, clocksNow());
      sessionIsActive = isNullUndefinedDefaultValue(options && options.sessionIsActive, true);
      lifeCycle.notify(LifeCycleEventType.VIEW_ENDED, {
        endClocks
      });
      lifeCycle.notify(LifeCycleEventType.AFTER_VIEW_ENDED, {
        endClocks
      });
      clearInterval(keepAliveIntervalId);
      setViewEnd(endClocks.relative);
      stopCommonViewMetricsTracking();
      pageMayExitSubscription.unsubscribe();
      triggerViewUpdate();
      setTimeout$1(function() {
        result.stop();
      }, KEEP_TRACKING_AFTER_VIEW_DELAY);
    },
    stop: function stop() {
      stopInitialViewMetricsTracking();
      stopEventCountsTracking();
      stopINPTracking();
      stopObservable.notify();
    },
    addTiming: function addTiming(name2, time) {
      if (endClocks) {
        return;
      }
      var relativeTime = looksLikeRelativeTime(time) ? time : elapsed(startClocks.timeStamp, time);
      customTimings[sanitizeTiming(name2)] = relativeTime;
      scheduleViewUpdate();
    },
    setViewName: function setViewName(updatedName) {
      name = updatedName;
      triggerViewUpdate();
    }
  };
  return result;
}
function sanitizeTiming(name) {
  var sanitized = name.replace(/[^a-zA-Z0-9-_.@$]/g, "_");
  if (sanitized !== name) {
    console.warn("Invalid timing name: " + name + ", sanitized to: " + sanitized);
  }
  return sanitized;
}
function areDifferentLocation(currentLocation, otherLocation) {
  return currentLocation.pathname !== otherLocation.pathname || !isHashAnAnchor(otherLocation.hash) && getPathFromHash(otherLocation.hash) !== getPathFromHash(currentLocation.hash);
}
function startViewCollection(lifeCycle, configuration, location2, domMutationObservable, locationChangeObservable, pageStateHistory, recorderApi2, initialViewOptions) {
  lifeCycle.subscribe(LifeCycleEventType.VIEW_UPDATED, function(view) {
    lifeCycle.notify(LifeCycleEventType.RAW_RUM_EVENT_COLLECTED, processViewUpdate(view, configuration, recorderApi2, pageStateHistory));
  });
  return trackViews(location2, lifeCycle, domMutationObservable, configuration, locationChangeObservable, !configuration.trackViewsManually, initialViewOptions);
}
function computePerformanceViewDetails(navigationTimings) {
  if (!navigationTimings) {
    return void 0;
  }
  var fetchStart = navigationTimings.fetchStart, responseEnd = navigationTimings.responseEnd, domInteractive = navigationTimings.domInteractive, domContentLoaded = navigationTimings.domContentLoaded, domComplete = navigationTimings.domComplete, loadEventEnd = navigationTimings.loadEventEnd, loadEventStart = navigationTimings.loadEventStart, domContentLoadedEventEnd = navigationTimings.domContentLoadedEventEnd;
  var details = {};
  if (isNumber(responseEnd) && isNumber(fetchStart) && responseEnd !== fetchStart && responseEnd > fetchStart) {
    details.fpt = toServerDuration(responseEnd - fetchStart);
    var apdexLevel = parseInt((responseEnd - fetchStart) / 1e3);
    details.apdexLevel = apdexLevel > 9 ? 9 : apdexLevel;
  }
  if (isNumber(domInteractive) && isNumber(fetchStart) && domInteractive !== fetchStart && domInteractive > fetchStart) {
    details.tti = toServerDuration(domInteractive - fetchStart);
  }
  if (isNumber(domContentLoaded) && isNumber(fetchStart) && domContentLoaded !== fetchStart && domContentLoaded > fetchStart) {
    details.dom_ready = toServerDuration(domContentLoaded - fetchStart);
  }
  if (isNumber(loadEventEnd) && isNumber(fetchStart) && loadEventEnd !== fetchStart && loadEventEnd > fetchStart) {
    details.load = toServerDuration(loadEventEnd - fetchStart);
  }
  if (isNumber(loadEventStart) && isNumber(domContentLoadedEventEnd) && loadEventStart !== domContentLoadedEventEnd && loadEventStart > domContentLoadedEventEnd) {
    details.resource_load_time = toServerDuration(loadEventStart - domContentLoadedEventEnd);
  }
  if (isNumber(domComplete) && isNumber(domInteractive) && domComplete !== domInteractive && domComplete > domInteractive) {
    details.dom = toServerDuration(domComplete - domInteractive);
  }
  return details;
}
function processViewUpdate(view, configuration, recorderApi2, pageStateHistory) {
  var replayStats = recorderApi2.getReplayStats(view.id);
  var pageStates = pageStateHistory.findAll(view.startClocks.relative, view.duration);
  var viewEvent = {
    _gc: {
      document_version: view.documentVersion,
      replay_stats: replayStats,
      page_states: pageStates,
      view_update_time: view.documentVersion
    },
    date: view.startClocks.timeStamp,
    type: RumEventType.VIEW,
    view: {
      action: {
        count: view.eventCounts.actionCount
      },
      frustration: {
        count: view.eventCounts.frustrationCount
      },
      cumulative_layout_shift: findByPath(view.commonViewMetrics, "cumulativeLayoutShift.value"),
      cumulative_layout_shift_time: findByPath(view.commonViewMetrics, "cumulativeLayoutShift.time"),
      cumulative_layout_shift_target_selector: findByPath(view.commonViewMetrics, "cumulativeLayoutShift.targetSelector"),
      first_byte: toServerDuration(findByPath(view.initialViewMetrics, "navigationTimings.firstByte")),
      dom_complete: toServerDuration(findByPath(view.initialViewMetrics, "navigationTimings.domComplete")),
      dom_content_loaded: toServerDuration(findByPath(view.initialViewMetrics, "navigationTimings.domContentLoaded")),
      dom_interactive: toServerDuration(findByPath(view.initialViewMetrics, "navigationTimings.domInteractive")),
      error: {
        count: view.eventCounts.errorCount
      },
      first_contentful_paint: toServerDuration(findByPath(view.initialViewMetrics, "firstContentfulPaint")),
      first_input_delay: toServerDuration(findByPath(view.initialViewMetrics, "firstInput.delay")),
      first_input_time: toServerDuration(findByPath(view.initialViewMetrics, "firstInput.time")),
      first_input_target_selector: findByPath(view.initialViewMetrics, "firstInput.targetSelector"),
      interaction_to_next_paint: toServerDuration(findByPath(view.commonViewMetrics, "interactionToNextPaint.value")),
      interaction_to_next_paint_target_selector: findByPath(view.commonViewMetrics, "interactionToNextPaint.targetSelector"),
      is_active: view.isActive,
      name: view.name,
      largest_contentful_paint: toServerDuration(findByPath(view.initialViewMetrics, "largestContentfulPaint.value")),
      largest_contentful_paint_element_selector: findByPath(view.initialViewMetrics, "largestContentfulPaint.targetSelector"),
      load_event: toServerDuration(findByPath(view.initialViewMetrics, "navigationTimings.loadEvent")),
      loading_time: discardNegativeDuration(toServerDuration(view.commonViewMetrics.loadingTime)),
      loading_type: view.loadingType,
      long_task: {
        count: view.eventCounts.longTaskCount
      },
      resource: {
        count: view.eventCounts.resourceCount
      },
      time_spent: toServerDuration(view.duration)
    },
    display: view.commonViewMetrics.scroll ? {
      scroll: {
        max_depth: view.commonViewMetrics.scroll.maxDepth,
        max_depth_scroll_top: view.commonViewMetrics.scroll.maxDepthScrollTop,
        max_scroll_height: view.commonViewMetrics.scroll.maxScrollHeight,
        max_scroll_height_time: toServerDuration(view.commonViewMetrics.scroll.maxScrollHeightTime)
      }
    } : void 0,
    session: {
      has_replay: replayStats ? true : void 0,
      is_active: view.sessionIsActive ? void 0 : false
    },
    privacy: {
      replay_level: configuration.defaultPrivacyLevel
    }
  };
  if (!isEmptyObject(view.customTimings)) {
    viewEvent.view.custom_timings = mapValues(view.customTimings, toServerDuration);
  }
  viewEvent = extend2Lev(viewEvent, {
    view: computePerformanceViewDetails(view.initialViewMetrics.navigationTimings)
  });
  return {
    rawRumEvent: viewEvent,
    startTime: view.startClocks.relative,
    domainContext: {
      location: view.location
    }
  };
}
function TraceIdentifier() {
  this.buffer = new Uint8Array(8);
  getCrypto().getRandomValues(this.buffer);
  this.buffer[0] = this.buffer[0] & 127;
}
TraceIdentifier.prototype = {
  // buffer: new Uint8Array(8),
  toString: function toString2(radix) {
    var high = this.readInt32(0);
    var low = this.readInt32(4);
    var str = "";
    do {
      var mod = high % radix * 4294967296 + low;
      high = Math.floor(high / radix);
      low = Math.floor(mod / radix);
      str = (mod % radix).toString(radix) + str;
    } while (high || low);
    return str;
  },
  toDecimalString: function toDecimalString() {
    return this.toString(10);
  },
  /**
   * Format used by OTel headers
   */
  toPaddedHexadecimalString: function toPaddedHexadecimalString() {
    var traceId = this.toString(16);
    return Array(17 - traceId.length).join("0") + traceId;
  },
  readInt32: function readInt32(offset) {
    return this.buffer[offset] * 16777216 + (this.buffer[offset + 1] << 16) + (this.buffer[offset + 2] << 8) + this.buffer[offset + 3];
  }
};
function getCrypto() {
  return window.crypto || window.msCrypto;
}
function createRandomHexIdentifier(byteLength) {
  var buffer = new Uint8Array(byteLength);
  getCrypto().getRandomValues(buffer);
  var parts = [];
  for (var i = 0; i < buffer.length; i += 1) {
    var hex = buffer[i].toString(16);
    parts.push(hex.length === 1 ? "0" + hex : hex);
  }
  return parts.join("");
}
function normalizeHexIdentifier(value, allowedLengths) {
  if (typeof value !== "string") {
    return void 0;
  }
  var normalized = value.toLowerCase();
  if (allowedLengths.indexOf(normalized.length) === -1) {
    return void 0;
  }
  return /^[0-9a-f]+$/.test(normalized) ? normalized : void 0;
}
function DDtraceTracer(configuration, traceSampled) {
  this._spanId = new TraceIdentifier();
  this._traceId = new TraceIdentifier();
  this._traceSampled = traceSampled;
  if (configuration.generateTraceId && getType(configuration.generateTraceId) === "function") {
    var customTraceId = configuration.generateTraceId();
    if (getType(customTraceId) === "string") {
      this.customTraceId = customTraceId;
    }
  }
}
DDtraceTracer.prototype = {
  isTracingSupported: function isTracingSupported() {
    return getCrypto() !== void 0;
  },
  getSpanId: function getSpanId() {
    return this._spanId.toDecimalString();
  },
  getTraceId: function getTraceId() {
    if (this.customTraceId) {
      return this.customTraceId;
    }
    return this._traceId.toDecimalString();
  },
  makeTracingHeaders: function makeTracingHeaders() {
    return {
      "x-datadog-origin": "rum",
      "x-datadog-parent-id": this.getSpanId(),
      "x-datadog-sampling-priority": this._traceSampled ? "2" : "-1",
      "x-datadog-trace-id": this.getTraceId()
    };
  }
};
function uuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0;
    var v = c === "x" ? r : r & 3 | 8;
    return v.toString(16);
  });
}
function SkyWalkingTracer(configuration, requestUrl, traceSampled) {
  this._spanId = uuid();
  this._traceId = uuid();
  this._applicationId = configuration.applicationId;
  this._env = configuration.env;
  this._version = configuration.version;
  this._urlParse = urlParse(requestUrl).getParse();
  this._traceSampled = traceSampled;
  if (configuration.generateTraceId && getType(configuration.generateTraceId) === "function") {
    var customTraceId = configuration.generateTraceId();
    if (getType(customTraceId) === "string") {
      this.customTraceId = customTraceId;
    }
  }
}
SkyWalkingTracer.prototype = {
  isTracingSupported: function isTracingSupported2() {
    if (this._env && this._version && this._urlParse) return true;
    return false;
  },
  getSpanId: function getSpanId2() {
    return this._spanId;
  },
  getTraceId: function getTraceId2() {
    if (this.customTraceId) {
      return this.customTraceId;
    }
    return this._traceId;
  },
  getSkyWalkingSw8: function getSkyWalkingSw8() {
    try {
      var traceIdStr = String(base64Encode(this.getTraceId()));
      var segmentId = String(base64Encode(this.getSpanId()));
      var service = String(base64Encode(this._applicationId + "_rum_" + this._env));
      var instance = String(base64Encode(this._version));
      var endpoint = String(base64Encode(window.location.href));
      var peer = String(base64Encode(this._urlParse.Host));
      var index = "0";
      return (this._traceSampled ? "1" : "0") + "-" + traceIdStr + "-" + segmentId + "-" + index + "-" + service + "-" + instance + "-" + endpoint + "-" + peer;
    } catch (err) {
      return "";
    }
  },
  makeTracingHeaders: function makeTracingHeaders2() {
    return {
      sw8: this.getSkyWalkingSw8()
    };
  }
};
function JaegerTracer(configuration, traceSampled) {
  this._traceId = configuration.traceId128Bit ? createRandomHexIdentifier(16) : createRandomHexIdentifier(8);
  this._spanId = createRandomHexIdentifier(8);
  this._traceSampled = traceSampled;
  this.is128Bit = configuration.traceId128Bit;
  if (configuration.generateTraceId && getType(configuration.generateTraceId) === "function") {
    var customTraceId = normalizeHexIdentifier(configuration.generateTraceId(), [16, 32]);
    if (customTraceId) {
      this.customTraceId = customTraceId;
    }
  }
}
JaegerTracer.prototype = {
  isTracingSupported: function isTracingSupported3() {
    return getCrypto() !== void 0;
  },
  getSpanId: function getSpanId3() {
    return this._spanId;
  },
  getTraceId: function getTraceId3() {
    if (this.customTraceId) {
      return this.customTraceId;
    }
    return this._traceId;
  },
  getUberTraceId: function getUberTraceId() {
    return this.getTraceId() + ":" + this.getSpanId() + ":0:" + (this._traceSampled ? "1" : "0");
  },
  makeTracingHeaders: function makeTracingHeaders3() {
    return {
      "uber-trace-id": this.getUberTraceId()
    };
  }
};
function ZipkinSingleTracer(configuration, traceSampled) {
  this._traceId = createRandomHexIdentifier(8);
  this._spanId = createRandomHexIdentifier(8);
  this._traceSampled = traceSampled;
  if (configuration.generateTraceId && getType(configuration.generateTraceId) === "function") {
    var customTraceId = normalizeHexIdentifier(configuration.generateTraceId(), [16, 32]);
    if (customTraceId) {
      this.customTraceId = customTraceId;
    }
  }
}
ZipkinSingleTracer.prototype = {
  isTracingSupported: function isTracingSupported4() {
    return getCrypto() !== void 0;
  },
  getSpanId: function getSpanId4() {
    return this._spanId;
  },
  getTraceId: function getTraceId4() {
    if (this.customTraceId) {
      return this.customTraceId;
    }
    return this._traceId;
  },
  getB3Str: function getB3Str() {
    return this.getTraceId() + "-" + this.getSpanId() + "-" + (this._traceSampled ? "1" : "0");
  },
  makeTracingHeaders: function makeTracingHeaders4() {
    return {
      b3: this.getB3Str()
    };
  }
};
function ZipkinMultiTracer(configuration, traceSampled) {
  this._traceId = configuration.traceId128Bit ? createRandomHexIdentifier(16) : createRandomHexIdentifier(8);
  this._spanId = createRandomHexIdentifier(8);
  this._traceSampled = traceSampled;
  this.is128Bit = configuration.traceId128Bit;
  if (configuration.generateTraceId && getType(configuration.generateTraceId) === "function") {
    var customTraceId = normalizeHexIdentifier(configuration.generateTraceId(), [16, 32]);
    if (customTraceId) {
      this.customTraceId = customTraceId;
    }
  }
}
ZipkinMultiTracer.prototype = {
  isTracingSupported: function isTracingSupported5() {
    return getCrypto() !== void 0;
  },
  getSpanId: function getSpanId5() {
    return this._spanId;
  },
  getTraceId: function getTraceId5() {
    if (this.customTraceId) {
      return this.customTraceId;
    }
    return this._traceId;
  },
  makeTracingHeaders: function makeTracingHeaders5() {
    return {
      "X-B3-TraceId": this.getTraceId(),
      "X-B3-SpanId": this.getSpanId(),
      //  'X-B3-ParentSpanId': '',
      "X-B3-Sampled": this._traceSampled ? "1" : "0"
      //  'X-B3-Flags': '0'
    };
  }
};
function W3cTraceParentTracer(configuration, traceSampled, isHexTraceId) {
  this._traceId = new TraceIdentifier();
  this._spanId = new TraceIdentifier();
  this._traceSampled = traceSampled;
  this.isHexTraceId = isHexTraceId;
  if (configuration.generateTraceId && getType(configuration.generateTraceId) === "function") {
    var customTraceId = configuration.generateTraceId();
    if (getType(customTraceId) === "string") {
      this.customTraceId = customTraceId;
    }
  }
}
W3cTraceParentTracer.prototype = {
  isTracingSupported: function isTracingSupported6() {
    return getCrypto() !== void 0;
  },
  getSpanId: function getSpanId6() {
    return this.isHexTraceId ? this._spanId.toDecimalString() : this._spanId.toPaddedHexadecimalString();
  },
  getTraceId: function getTraceId6() {
    if (this.customTraceId) {
      return this.customTraceId;
    }
    if (this.isHexTraceId) {
      return this._traceId.toDecimalString();
    } else {
      return this._traceId.toPaddedHexadecimalString() + this._spanId.toPaddedHexadecimalString();
    }
  },
  getTraceParent: function getTraceParent() {
    if (this.isHexTraceId) {
      return "00-0000000000000000" + this._traceId.toPaddedHexadecimalString() + "-" + this._spanId.toPaddedHexadecimalString() + "-" + (this._traceSampled ? "01" : "00");
    } else {
      return "00-" + this.getTraceId() + "-" + this.getSpanId() + "-" + (this._traceSampled ? "01" : "00");
    }
  },
  makeTracingHeaders: function makeTracingHeaders6() {
    var baseHeaders = {
      traceparent: this.getTraceParent()
    };
    if (this.isHexTraceId) {
      return assign(baseHeaders, {
        "x-gc-trace-id": this.getTraceId(),
        "x-gc-span-id": this.getSpanId()
      });
    }
    return baseHeaders;
  }
};
var sampleDecisionCache;
function isTraceSampled(sessionId, sampleRate) {
  if (sampleRate === 100) {
    return true;
  }
  if (sampleRate === 0) {
    return false;
  }
  if (sampleDecisionCache && sessionId === sampleDecisionCache.sessionId) {
    return sampleDecisionCache.decision;
  }
  var decision;
  if (window.BigInt) {
    decision = sampleUsingKnuthFactor(BigInt("0x".concat(sessionId.split("-")[4])), sampleRate);
  } else {
    decision = performDraw(sampleRate);
  }
  sampleDecisionCache = {
    sessionId,
    decision
  };
  return decision;
}
function sampleUsingKnuthFactor(identifier, sampleRate) {
  var knuthFactor = BigInt("1111111111111111111");
  var twoPow64 = BigInt("0x10000000000000000");
  var hash = identifier * knuthFactor % twoPow64;
  return Number(hash) <= sampleRate / 100 * Number(twoPow64);
}
function isTracingOption(item) {
  var expectedItem = item;
  return getType(expectedItem) === "object" && isMatchOption(expectedItem.match) && isString(expectedItem.traceType);
}
function clearTracingIfNeeded(context) {
  if (context.status === 0 && !context.isAborted) {
    context.traceId = void 0;
    context.spanId = void 0;
    context.traceSampled = void 0;
  }
}
function startTracer(configuration, sessionManager) {
  return {
    clearTracingIfNeeded,
    traceFetch: function traceFetch(context) {
      return injectHeadersIfTracingAllowed(configuration, context, sessionManager, function(tracingHeaders) {
        if (context.input instanceof Request && (!context.init || !context.init.headers)) {
          context.input = new Request(context.input);
          each(tracingHeaders, function(value, key) {
            context.input.headers.append(key, value);
          });
        } else {
          context.init = shallowClone(context.init);
          var headers = [];
          if (context.init.headers instanceof Headers) {
            context.init.headers.forEach(function(value, key) {
              headers.push([key, value]);
            });
          } else if (isArray(context.init.headers)) {
            each(context.init.headers, function(header) {
              headers.push(header);
            });
          } else if (context.init.headers) {
            each(context.init.headers, function(value, key) {
              headers.push([key, value]);
            });
          }
          var headersMap = {};
          each(headers.concat(objectEntries(tracingHeaders)), function(header) {
            headersMap[header[0]] = header[1];
          });
          context.init.headers = headersMap;
        }
      });
    },
    traceXhr: function traceXhr(context, xhr) {
      return injectHeadersIfTracingAllowed(configuration, context, sessionManager, function(tracingHeaders) {
        each(tracingHeaders, function(value, name) {
          xhr.setRequestHeader(name, value);
        });
      });
    }
  };
}
function injectHeadersIfTracingAllowed(configuration, context, sessionManager, inject) {
  var session = sessionManager.findTrackedSession();
  if (!session) {
    return;
  }
  var tracingOption = find(configuration.allowedTracingUrls, function(tracingOption2) {
    return matchList([tracingOption2.match], context.url, true);
  });
  if (!tracingOption) {
    return;
  }
  var traceSampled = isTraceSampled(session.id, configuration.tracingSampleRate);
  var tracer, traceType = tracingOption.traceType;
  switch (traceType) {
    case TraceType.DDTRACE:
      tracer = new DDtraceTracer(configuration, traceSampled);
      break;
    case TraceType.SKYWALKING_V3:
      tracer = new SkyWalkingTracer(configuration, context.url, traceSampled);
      break;
    case TraceType.ZIPKIN_MULTI_HEADER:
      tracer = new ZipkinMultiTracer(configuration, traceSampled);
      break;
    case TraceType.JAEGER:
      tracer = new JaegerTracer(configuration, traceSampled);
      break;
    case TraceType.W3C_TRACEPARENT:
      tracer = new W3cTraceParentTracer(configuration, traceSampled);
      break;
    case TraceType.W3C_TRACEPARENT_64:
      tracer = new W3cTraceParentTracer(configuration, traceSampled, true);
      break;
    case TraceType.ZIPKIN_SINGLE_HEADER:
      tracer = new ZipkinSingleTracer(configuration, traceSampled);
      break;
  }
  if (!tracer || !tracer.isTracingSupported()) {
    return;
  }
  context.traceId = tracer.getTraceId();
  context.spanId = tracer.getSpanId();
  context.traceSampled = traceSampled;
  var headers = tracer.makeTracingHeaders();
  if (configuration.injectTraceHeader) {
    var result = configuration.injectTraceHeader(shallowClone(context));
    if (getType(result) === "object") {
      each(result, function(value, key) {
        if (getType(value) === "string") {
          headers[key] = value;
        }
      });
    }
  }
  inject(headers);
}
var nextRequestIndex = 1;
function startRequestCollection(lifeCycle, configuration, sessionManager) {
  var tracer = startTracer(configuration, sessionManager);
  trackXhr(lifeCycle, configuration, tracer);
  trackFetch(lifeCycle, configuration, tracer);
}
function trackXhr(lifeCycle, configuration, tracer) {
  var subscription = initXhrObservable().subscribe(function(rawContext) {
    var context = rawContext;
    if (!isAllowedRequestUrl(configuration, context.url)) {
      return;
    }
    switch (context.state) {
      case "start":
        tracer.traceXhr(context, context.xhr);
        context.requestIndex = getNextRequestIndex();
        lifeCycle.notify(LifeCycleEventType.REQUEST_STARTED, {
          requestIndex: context.requestIndex,
          url: context.url
        });
        break;
      case "complete":
        tracer.clearTracingIfNeeded(context);
        lifeCycle.notify(LifeCycleEventType.REQUEST_COMPLETED, {
          duration: context.duration,
          method: context.method,
          requestIndex: context.requestIndex,
          spanId: context.spanId,
          startClocks: context.startClocks,
          status: context.status,
          traceId: context.traceId,
          traceSampled: context.traceSampled,
          type: RequestType.XHR,
          url: context.url,
          xhr: context.xhr,
          isAborted: context.isAborted,
          requestHeaderContexts: context.requestHeaderContexts,
          handlingStack: context.handlingStack
        });
        break;
    }
  });
  return {
    stop: function stop() {
      return subscription.unsubscribe();
    }
  };
}
function trackFetch(lifeCycle, configuration, tracer) {
  var subscription = initFetchObservable().subscribe(function(rawContext) {
    var context = rawContext;
    if (!isAllowedRequestUrl(configuration, context.url)) {
      return;
    }
    switch (context.state) {
      case "start":
        tracer.traceFetch(context);
        context.requestIndex = getNextRequestIndex();
        lifeCycle.notify(LifeCycleEventType.REQUEST_STARTED, {
          requestIndex: context.requestIndex,
          url: context.url
        });
        break;
      case "resolve":
        waitForResponseToComplete(context, function(duration) {
          var _context$init;
          tracer.clearTracingIfNeeded(context);
          lifeCycle.notify(LifeCycleEventType.REQUEST_COMPLETED, {
            duration,
            method: context.method,
            requestIndex: context.requestIndex,
            responseType: context.responseType,
            spanId: context.spanId,
            startClocks: context.startClocks,
            status: context.status,
            traceId: context.traceId,
            traceSampled: context.traceSampled,
            requestHeaderContexts: ((_context$init = context.init) === null || _context$init === void 0 ? void 0 : _context$init.headers) || (context.input instanceof Request ? context.input.headers : void 0),
            type: RequestType.FETCH,
            url: context.url,
            response: context.response,
            init: context.init,
            input: context.input,
            isAborted: context.isAborted,
            handlingStack: context.handlingStack
          });
        });
        break;
    }
  });
  return {
    stop: function stop() {
      return subscription.unsubscribe();
    }
  };
}
function getNextRequestIndex() {
  var result = nextRequestIndex;
  nextRequestIndex += 1;
  return result;
}
function waitForResponseToComplete(context, callback) {
  var clonedResponse = context.response && tryToClone(context.response);
  if (!clonedResponse || !clonedResponse.body) {
    callback(elapsed(context.startClocks.timeStamp, timeStampNow()));
  } else {
    readBytesFromStream(clonedResponse.body, function() {
      callback(elapsed(context.startClocks.timeStamp, timeStampNow()));
    }, {
      bytesLimit: Number.POSITIVE_INFINITY
    });
  }
}
function createRequestResourceEntryMatcher() {
  var alreadyMatchedEntries = new WeakSet$1();
  return {
    matchRequestResourceEntry: function matchRequestResourceEntry(request) {
      if (!performance || !("getEntriesByName" in performance)) {
        return;
      }
      var sameNameEntries = performance.getEntriesByName(request.url, "resource");
      if (!sameNameEntries.length || !("toJSON" in sameNameEntries[0])) {
        return;
      }
      var candidates = filter(sameNameEntries, function(entry) {
        return !alreadyMatchedEntries.has(entry);
      });
      candidates = filter(candidates, function(entry) {
        return hasValidResourceEntryDuration(entry) && hasValidResourceEntryTimings(entry);
      });
      candidates = filter(candidates, function(entry) {
        return isBetween(entry, request.startClocks.relative, endTime({
          startTime: request.startClocks.relative,
          duration: request.duration
        }));
      });
      var lastEntry = void 0;
      if (candidates.length > 1) {
        var startTimeDuration = Number.MAX_SAFE_INTEGER;
        candidates.forEach(function(entry) {
          var _startTimeDuration = Math.abs(entry.startTime - request.startClocks.relative);
          if (_startTimeDuration < startTimeDuration) {
            startTimeDuration = _startTimeDuration;
            lastEntry = entry;
          }
        });
      } else if (candidates.length === 1) {
        lastEntry = candidates[0];
      }
      if (lastEntry) {
        alreadyMatchedEntries.add(lastEntry);
        return lastEntry.toJSON();
      }
      return;
    }
  };
}
function endTime(timing) {
  return addDuration(timing.startTime, timing.duration);
}
function isBetween(timing, start, end) {
  var errorMargin = 1;
  return timing.startTime >= start - errorMargin && endTime(timing) <= addDuration(end, errorMargin);
}
function retrieveInitialDocumentResourceTiming(configuration, callback) {
  runOnReadyState("interactive", function() {
    var entry = assign(getNavigationEntry().toJSON(), {
      entryType: RumPerformanceEntryType.RESOURCE,
      initiatorType: FAKE_INITIAL_DOCUMENT,
      toJSON: function toJSON() {
        return assign({}, entry, {
          toJSON: void 0
        });
      }
    });
    callback(entry);
  });
}
function startResourceCollection(lifeCycle, configuration, pageStateHistory, taskQueue, retrieveInitialDocumentResourceTimingImpl, resourceTrackerManager) {
  if (taskQueue === void 0) {
    taskQueue = createTaskQueue();
  }
  if (typeof retrieveInitialDocumentResourceTimingImpl === "undefined") {
    retrieveInitialDocumentResourceTimingImpl = retrieveInitialDocumentResourceTiming;
  }
  if (resourceTrackerManager) {
    resourceTrackerManager.setFlushTrackedResource(function(rawEvent) {
      lifeCycle.notify(LifeCycleEventType.RAW_RUM_EVENT_COLLECTED, rawEvent);
    });
  }
  var requestResourceEntryMatcher = createRequestResourceEntryMatcher();
  lifeCycle.subscribe(LifeCycleEventType.REQUEST_COMPLETED, function(request) {
    handleResource(function() {
      return processRequest(request, pageStateHistory, requestResourceEntryMatcher);
    });
  });
  var performanceResourceSubscription = createPerformanceObservable(configuration, {
    type: RumPerformanceEntryType.RESOURCE,
    buffered: true
  }).subscribe(function(entries) {
    var loop = function loop2(entry2) {
      if (!isResourceEntryRequestType(entry2) && !isResourceUrlLimit(entry2.name, configuration.resourceUrlLimit)) {
        handleResource(function() {
          return processResourceEntry(entry2, configuration);
        });
      }
    };
    for (var _i = 0, entries_1 = entries; _i < entries_1.length; _i++) {
      var entry = entries_1[_i];
      loop(entry);
    }
  });
  retrieveInitialDocumentResourceTimingImpl(configuration, function(timing) {
    handleResource(function() {
      return processResourceEntry(timing, configuration);
    });
  });
  function handleResource(computeRawEvent) {
    taskQueue.push(function() {
      try {
        var rawEvent = computeRawEvent();
        if (rawEvent) {
          if (resourceTrackerManager && rawEvent.domainContext && rawEvent.domainContext.resourceTrackerId && resourceTrackerManager.trackRequestResource(rawEvent.domainContext.resourceTrackerId, rawEvent)) {
            return;
          }
          lifeCycle.notify(LifeCycleEventType.RAW_RUM_EVENT_COLLECTED, rawEvent);
        }
      } catch (error) {
        addTelemetryError(error);
      }
    });
  }
  return {
    stop: function stop() {
      performanceResourceSubscription.unsubscribe();
    },
    addResource: function addResource(resource, savedCommonContext) {
      handleResource(function() {
        return extend({
          savedCommonContext
        }, processCustomResource(resource));
      });
    }
  };
}
function processRequest(request, pageStateHistory, requestResourceEntryMatcher) {
  var matchingTiming = requestResourceEntryMatcher.matchRequestResourceEntry(request);
  var startClocks = matchingTiming ? relativeToClocks(matchingTiming.startTime) : request.startClocks;
  var tracingInfo = computeRequestTracingInfo(request);
  var type = request.type === RequestType.XHR ? ResourceType.XHR : ResourceType.FETCH;
  var correspondingTimingOverrides = matchingTiming ? computeResourceEntryMetrics(matchingTiming) : void 0;
  var duration = computeRequestDuration(pageStateHistory, startClocks, request.duration);
  var urlObj = urlParse(request.url).getParse();
  var resourceEvent = extend2Lev({
    date: startClocks.timeStamp,
    resource: {
      id: UUID(),
      type,
      duration,
      method: request.method,
      status: request.status,
      statusGroup: getStatusGroup(request.status),
      url: isLongDataUrl(request.url) ? sanitizeDataUrl(request.url) : request.url,
      urlHost: urlObj.Host,
      urlPath: urlObj.Path,
      urlPathGroup: replaceNumberCharByPath(urlObj.Path),
      urlQuery: getQueryParamsFromUrl(request.url),
      deliveryType: matchingTiming && computeResourceEntryDeliveryType(matchingTiming),
      protocol: matchingTiming && computeResourceEntryProtocol(matchingTiming)
    },
    type: RumEventType.RESOURCE
  }, tracingInfo, correspondingTimingOverrides);
  return {
    startTime: startClocks.relative,
    rawRumEvent: resourceEvent,
    domainContext: {
      performanceEntry: matchingTiming,
      xhr: request.xhr,
      requestHeaderContexts: request.requestHeaderContexts,
      response: request.response,
      requestInput: request.input,
      requestInit: request.init,
      error: request.error,
      isAborted: request.isAborted,
      handlingStack: request.handlingStack,
      resourceTrackerId: getResourceTrackerIdFromRequest(request)
    }
  };
}
function processResourceEntry(entry, configuration) {
  var startClocks = relativeToClocks(entry.startTime);
  var tracingInfo = computeResourceEntryTracingInfo(entry);
  var type = computeResourceEntryType(entry);
  var entryMetrics = computeResourceEntryMetrics(entry);
  var urlObj = urlParse(entry.name).getParse();
  var resourceEvent = extend2Lev({
    date: startClocks.timeStamp,
    resource: {
      id: UUID(),
      type,
      url: entry.name,
      urlHost: urlObj.Host,
      urlPath: urlObj.Path,
      urlPathGroup: replaceNumberCharByPath(urlObj.Path),
      urlQuery: getQueryParamsFromUrl(entry.name),
      method: "GET",
      status: discardZeroStatus(entry.responseStatus),
      statusGroup: getStatusGroup(entry.responseStatus),
      deliveryType: computeResourceEntryDeliveryType(entry),
      protocol: computeResourceEntryProtocol(entry)
    },
    type: RumEventType.RESOURCE
  }, tracingInfo, entryMetrics);
  return {
    startTime: startClocks.relative,
    rawRumEvent: resourceEvent,
    domainContext: {
      performanceEntry: entry
    }
  };
}
function processCustomResource(resource) {
  var resourceEvent = {
    date: resource.startClocks.timeStamp,
    resource: {
      id: UUID(),
      type: resource.type
    },
    type: RumEventType.RESOURCE
  };
  return {
    customerContext: resource.context,
    startTime: resource.startClocks.relative,
    rawRumEvent: resourceEvent,
    domainContext: {
      resource
    }
  };
}
function computeResourceEntryMetrics(entry) {
  return {
    resource: extend2Lev({}, {
      duration: computeResourceEntryDuration(entry)
    }, computeResourceEntrySize(entry), computePerformanceResourceDetails(entry))
  };
}
function computeRequestTracingInfo(request) {
  var hasBeenTraced = request.traceSampled && request.traceId && request.spanId;
  if (!hasBeenTraced) {
    return void 0;
  }
  return {
    _gc: {
      spanId: request.spanId,
      traceId: request.traceId
    },
    resource: {
      id: UUID()
    }
  };
}
function computeRequestDuration(pageStateHistory, startClocks, duration) {
  return !pageStateHistory.wasInPageStateDuringPeriod(PageState.FROZEN, startClocks.relative, duration) ? toServerDuration(duration) : void 0;
}
function computeResourceEntryTracingInfo(entry) {
  return entry.traceId ? {
    _gc: {
      traceId: entry.traceId
    }
  } : void 0;
}
function discardZeroStatus(statusCode) {
  return statusCode === 0 ? void 0 : statusCode;
}
function getResourceTrackerIdFromRequest(request) {
  return getHeaderValue$1(request.requestHeaderContexts, "x-rum-resource-id");
}
function getHeaderValue$1(headers, key) {
  if (!headers || !key) {
    return void 0;
  }
  var normalizedKey = String(key).toLowerCase();
  if (typeof headers.get === "function") {
    return headers.get(key) || headers.get(normalizedKey) || void 0;
  }
  if (Array.isArray(headers)) {
    for (var i = 0; i < headers.length; i += 1) {
      var headerEntry = headers[i];
      if (Array.isArray(headerEntry) && String(headerEntry[0]).toLowerCase() === normalizedKey) {
        return headerEntry[1];
      }
    }
    return void 0;
  }
  for (var headerKey in headers) {
    if (String(headerKey).toLowerCase() === normalizedKey) {
      return headers[headerKey];
    }
  }
}
function startRum(configuration, recorderApi2, customerDataTrackerManager, getCommonContext, initialViewOptions, createEncoder, resourceTrackerManager) {
  var cleanupTasks2 = [];
  var lifeCycle = new LifeCycle();
  var telemetry = startRumTelemetry(configuration);
  var reportError = function reportError2(error) {
    lifeCycle.notify(LifeCycleEventType.RAW_ERROR_COLLECTED, {
      error
    });
  };
  var pageExitObservable = createPageExitObservable();
  var pageExitSubscription = pageExitObservable.subscribe(function(event) {
    lifeCycle.notify(LifeCycleEventType.PAGE_EXITED, event);
  });
  cleanupTasks2.push(function() {
    pageExitSubscription.unsubscribe();
  });
  var session = !canUseEventBridge() ? startRumSessionManager(configuration, lifeCycle) : startRumSessionManagerStub();
  if (!canUseEventBridge()) {
    var batch = startRumBatch(configuration, lifeCycle, telemetry.observable, reportError, pageExitObservable, session.expireObservable, createEncoder);
    cleanupTasks2.push(function() {
      batch.stop();
    });
  } else {
    startRumEventBridge(lifeCycle);
  }
  var userSession = startCacheUsrCache(configuration);
  var domMutationObservable = createDOMMutationObservable();
  var locationChangeObservable = createLocationChangeObservable(location);
  var pageStateHistory = startPageStateHistory();
  var _startRumEventCollection = startRumEventCollection(lifeCycle, configuration, location, session, userSession, pageStateHistory, locationChangeObservable, domMutationObservable, getCommonContext, reportError);
  var viewContexts = _startRumEventCollection.viewContexts;
  var urlContexts = _startRumEventCollection.urlContexts;
  var actionContexts = _startRumEventCollection.actionContexts;
  var stopRumEventCollection = _startRumEventCollection.stop;
  var addAction = _startRumEventCollection.addAction;
  cleanupTasks2.push(stopRumEventCollection);
  drainPreStartTelemetry();
  telemetry.setContextProvider(function() {
    return {
      application: {
        id: configuration.applicationId
      },
      session: {
        id: session.findTrackedSession() && session.findTrackedSession().id
      },
      view: {
        id: viewContexts.findView() && viewContexts.findView().id
      },
      action: {
        id: actionContexts.findActionId(),
        ids: actionContexts.findAllActionId()
      }
    };
  });
  var _startViewCollection = startViewCollection(lifeCycle, configuration, location, domMutationObservable, locationChangeObservable, pageStateHistory, recorderApi2, initialViewOptions), addTiming = _startViewCollection.addTiming, startView = _startViewCollection.startView, setViewName = _startViewCollection.setViewName, setViewContext = _startViewCollection.setViewContext, setViewContextProperty = _startViewCollection.setViewContextProperty, getViewContext = _startViewCollection.getViewContext, stopViewCollection = _startViewCollection.stop;
  cleanupTasks2.push(stopViewCollection);
  var _startResourceCollection = startResourceCollection(lifeCycle, configuration, pageStateHistory, void 0, void 0, resourceTrackerManager);
  var addResource = _startResourceCollection.addResource;
  cleanupTasks2.push(_startResourceCollection.stop);
  if (PerformanceObserver.supportedEntryTypes && PerformanceObserver.supportedEntryTypes.includes(RumPerformanceEntryType.LONG_ANIMATION_FRAME)) {
    var longAnimationFrameCollection = startLongAnimationFrameCollection(lifeCycle, configuration);
    cleanupTasks2.push(longAnimationFrameCollection.stop);
  } else {
    startLongTaskCollection(lifeCycle, configuration);
  }
  var _startErrorCollection = startErrorCollection(lifeCycle, configuration, session, pageStateHistory);
  var addError = _startErrorCollection.addError;
  startRequestCollection(lifeCycle, configuration, session);
  var internalContext = startInternalContext(configuration.applicationId, session, viewContexts, actionContexts, urlContexts);
  return {
    addResource,
    addAction,
    addError,
    addTiming,
    configuration,
    startView,
    setViewContext,
    setViewContextProperty,
    getViewContext,
    setViewName,
    lifeCycle,
    viewContexts,
    session,
    setForcedSession: function setForcedSession() {
      session.setForcedSession();
    },
    stopSession: function stopSession() {
      session.expire();
    },
    getInternalContext: internalContext.get,
    stop: function stop() {
      cleanupTasks2.forEach(function(task) {
        task();
      });
    },
    createResourceTrackerId: function createResourceTrackerId() {
      return resourceTrackerManager.createTrackerId();
    },
    setResourceContext: function setResourceContext(trackerId, context) {
      resourceTrackerManager.setResourceContext(trackerId, context);
    },
    appendResourceContext: function appendResourceContext(trackerId, context) {
      resourceTrackerManager.appendResourceContext(trackerId, context);
    },
    finishResource: function finishResource(trackerId) {
      resourceTrackerManager.finishResource(trackerId);
    },
    getResource: function getResource(trackerId) {
      return resourceTrackerManager.getResource(trackerId);
    }
  };
}
function startRumTelemetry(configuration) {
  var telemetry = startTelemetry(TelemetryService.RUM, configuration);
  return telemetry;
}
function startRumEventCollection(lifeCycle, configuration, location2, sessionManager, userSessionManager, pageStateHistory, locationChangeObservable, domMutationObservable, getCommonContext, reportError) {
  var viewContexts = startViewContexts(lifeCycle);
  var urlContexts = startUrlContexts(lifeCycle, locationChangeObservable, location2);
  var _startActionCollection = startActionCollection(lifeCycle, domMutationObservable, configuration, pageStateHistory);
  var actionContexts = _startActionCollection.actionContexts;
  var addAction = _startActionCollection.addAction;
  var displayContext = startDisplayContext();
  startRumAssembly(configuration, lifeCycle, sessionManager, userSessionManager, viewContexts, urlContexts, actionContexts, displayContext, getCommonContext, reportError);
  return {
    viewContexts,
    urlContexts,
    pageStateHistory,
    addAction,
    actionContexts,
    stop: function stop() {
      displayContext.stop();
      pageStateHistory.stop();
      urlContexts.stop();
      viewContexts.stop();
    }
  };
}
function buildCommonContext(globalContextManager, userContextManager, recorderApi2) {
  return {
    context: globalContextManager.getContext(),
    user: userContextManager.getContext(),
    hasReplay: recorderApi2.isRecording() ? true : void 0
  };
}
var buildEnv = {
  sdkVersion: "3.3.1",
  sdkName: "df_web_rum_sdk"
};
var REPLAY_CANVAS_QUALITY_PRESETS = {
  low: {
    quality: 0.25,
    sampling: 1,
    autoInterval: 1500,
    autoCooldown: 3e3,
    autoUnchangedBackoff: 5e3,
    autoFailureBackoff: 7e3,
    autoMaxPerRun: 1
  },
  medium: {
    quality: 0.4,
    sampling: 2,
    autoInterval: 1e3,
    autoCooldown: 2e3,
    autoUnchangedBackoff: 3e3,
    autoFailureBackoff: 5e3,
    autoMaxPerRun: 2
  },
  high: {
    quality: 0.5,
    sampling: 4,
    autoInterval: 700,
    autoCooldown: 1400,
    autoUnchangedBackoff: 2e3,
    autoFailureBackoff: 4e3,
    autoMaxPerRun: 4
  }
};
function getReplayCanvasQualityPreset(value) {
  return typeof value === "string" ? REPLAY_CANVAS_QUALITY_PRESETS[value] : void 0;
}
function validateAndBuildRumConfiguration(initConfiguration) {
  if (!initConfiguration.applicationId) {
    display.error("Application ID is not configured, no RUM data will be collected.");
    return;
  }
  var requireParamsValidate = validatePostRequestRequireParamsConfiguration(initConfiguration);
  if (!requireParamsValidate) return;
  if (initConfiguration.sessionOnErrorSampleRate !== void 0 && !isPercentage(initConfiguration.sessionOnErrorSampleRate)) {
    display.error("Error Session  Sample Rate should be a number between 0 and 100");
    return;
  }
  if (initConfiguration.sessionReplaySampleRate !== void 0 && !isPercentage(initConfiguration.sessionReplaySampleRate)) {
    display.error("Session Replay Sample Rate should be a number between 0 and 100");
    return;
  }
  if (initConfiguration.sessionReplayOnErrorSampleRate !== void 0 && !isPercentage(initConfiguration.sessionReplayOnErrorSampleRate)) {
    display.error("Error Session Replay Sample Rate should be a number between 0 and 100");
    return;
  }
  var allowedTracingUrls = validateAndBuildTracingOptions(initConfiguration);
  if (!allowedTracingUrls) {
    return;
  }
  if (initConfiguration.tracingSampleRate !== void 0 && !isPercentage(initConfiguration.tracingSampleRate)) {
    display.error("Tracing Sample Rate should be a number between 0 and 100");
    return;
  }
  if (initConfiguration.excludedActivityUrls !== void 0 && !isArray(initConfiguration.excludedActivityUrls)) {
    display.error("Excluded Activity Urls should be an array");
    return;
  }
  if (initConfiguration.replayCanvasMode !== void 0 && initConfiguration.replayCanvasMode !== "manual" && initConfiguration.replayCanvasMode !== "auto") {
    display.error("Replay Canvas Mode should be 'manual' or 'auto'");
    return;
  }
  if (initConfiguration.replayCanvasQuality !== void 0 && !(getReplayCanvasQualityPreset(initConfiguration.replayCanvasQuality) || typeof initConfiguration.replayCanvasQuality === "number" && initConfiguration.replayCanvasQuality >= 0 && initConfiguration.replayCanvasQuality <= 1)) {
    display.error("Replay Canvas Quality should be 'low', 'medium', 'high', or a number between 0 and 1");
    return;
  }
  if (initConfiguration.replayCanvasSampling !== void 0 && !(initConfiguration.replayCanvasSampling === "all" || isNumber(initConfiguration.replayCanvasSampling) && initConfiguration.replayCanvasSampling > 0)) {
    display.error("Replay Canvas Sampling should be 'all' or a positive number");
    return;
  }
  if (initConfiguration.replayCanvasMaxCanvasSize !== void 0 && (!isNumber(initConfiguration.replayCanvasMaxCanvasSize) || initConfiguration.replayCanvasMaxCanvasSize <= 0)) {
    display.error("Replay Canvas Max Canvas Size should be a positive number");
    return;
  }
  if (initConfiguration.replayCanvasMaxEncodedBytes !== void 0 && (!isNumber(initConfiguration.replayCanvasMaxEncodedBytes) || initConfiguration.replayCanvasMaxEncodedBytes <= 0)) {
    display.error("Replay Canvas Max Encoded Bytes should be a positive number");
    return;
  }
  if (initConfiguration.replayCanvasMaxConcurrentEncodes !== void 0 && (!isNumber(initConfiguration.replayCanvasMaxConcurrentEncodes) || initConfiguration.replayCanvasMaxConcurrentEncodes <= 0)) {
    display.error("Replay Canvas Max Concurrent Encodes should be a positive number");
    return;
  }
  if (initConfiguration.replayCanvasAutoInterval !== void 0 && (!isNumber(initConfiguration.replayCanvasAutoInterval) || initConfiguration.replayCanvasAutoInterval <= 0)) {
    display.error("Replay Canvas Auto Interval should be a positive number");
    return;
  }
  if (initConfiguration.replayCanvasAutoCooldown !== void 0 && (!isNumber(initConfiguration.replayCanvasAutoCooldown) || initConfiguration.replayCanvasAutoCooldown <= 0)) {
    display.error("Replay Canvas Auto Cooldown should be a positive number");
    return;
  }
  if (initConfiguration.replayCanvasAutoUnchangedBackoff !== void 0 && (!isNumber(initConfiguration.replayCanvasAutoUnchangedBackoff) || initConfiguration.replayCanvasAutoUnchangedBackoff <= 0)) {
    display.error("Replay Canvas Auto Unchanged Backoff should be a positive number");
    return;
  }
  if (initConfiguration.replayCanvasAutoFailureBackoff !== void 0 && (!isNumber(initConfiguration.replayCanvasAutoFailureBackoff) || initConfiguration.replayCanvasAutoFailureBackoff <= 0)) {
    display.error("Replay Canvas Auto Failure Backoff should be a positive number");
    return;
  }
  if (initConfiguration.replayCanvasAutoMaxPerRun !== void 0 && (!isNumber(initConfiguration.replayCanvasAutoMaxPerRun) || initConfiguration.replayCanvasAutoMaxPerRun <= 0)) {
    display.error("Replay Canvas Auto Max Per Run should be a positive number");
    return;
  }
  var baseConfiguration = validateAndBuildConfiguration(initConfiguration);
  if (!baseConfiguration) {
    return;
  }
  var trackUserInteractions = !!isNullUndefinedDefaultValue(initConfiguration.trackUserInteractions, initConfiguration.trackInteractions);
  var replayCanvasMode = isNullUndefinedDefaultValue(initConfiguration.replayCanvasMode, "auto");
  var replayCanvasQualityPreset = getReplayCanvasQualityPreset(initConfiguration.replayCanvasQuality);
  var replayCanvasSampling = initConfiguration.replayCanvasSampling;
  if (replayCanvasSampling === void 0 || replayCanvasSampling === null) {
    replayCanvasSampling = replayCanvasQualityPreset ? replayCanvasQualityPreset.sampling : 2;
  }
  return assign({
    applicationId: initConfiguration.applicationId,
    actionNameAttribute: initConfiguration.actionNameAttribute,
    sessionReplaySampleRate: isNullUndefinedDefaultValue(initConfiguration.sessionReplaySampleRate, 100),
    sessionOnErrorSampleRate: isNullUndefinedDefaultValue(initConfiguration.sessionOnErrorSampleRate, 0),
    sessionReplayOnErrorSampleRate: isNullUndefinedDefaultValue(initConfiguration.sessionReplayOnErrorSampleRate, 0),
    tracingSampleRate: isNullUndefinedDefaultValue(initConfiguration.tracingSampleRate, 100),
    allowedTracingUrls,
    injectTraceHeader: initConfiguration.injectTraceHeader && catchUserErrors(initConfiguration.injectTraceHeader, "injectTraceHeader threw an error:"),
    generateTraceId: initConfiguration.generateTraceId && catchUserErrors(initConfiguration.generateTraceId, "generateTraceId threw an error:"),
    excludedActivityUrls: isNullUndefinedDefaultValue(initConfiguration.excludedActivityUrls, []),
    workerUrl: initConfiguration.workerUrl,
    replayCanvasWorkerUrl: initConfiguration.replayCanvasWorkerUrl,
    compressIntakeRequests: !!initConfiguration.compressIntakeRequests,
    trackUserInteractions,
    enableLongAnimationFrame: !!initConfiguration.enableLongAnimationFrame,
    trackViewsManually: !!initConfiguration.trackViewsManually,
    replayCanvasEnabled: !!initConfiguration.replayCanvasEnabled,
    replayCanvasMode,
    replayCanvasSampling,
    replayCanvasQuality: isNullUndefinedDefaultValue(replayCanvasQualityPreset ? replayCanvasQualityPreset.quality : initConfiguration.replayCanvasQuality, 0.4),
    replayCanvasMimeType: isNullUndefinedDefaultValue(initConfiguration.replayCanvasMimeType, "image/webp"),
    replayCanvasMaxCanvasSize: isNullUndefinedDefaultValue(initConfiguration.replayCanvasMaxCanvasSize, 1280),
    replayCanvasMaxEncodedBytes: isNullUndefinedDefaultValue(initConfiguration.replayCanvasMaxEncodedBytes, 4e4),
    replayCanvasMaxConcurrentEncodes: isNullUndefinedDefaultValue(initConfiguration.replayCanvasMaxConcurrentEncodes, 1),
    replayCanvasAutoInterval: isNullUndefinedDefaultValue(initConfiguration.replayCanvasAutoInterval, replayCanvasQualityPreset ? replayCanvasQualityPreset.autoInterval : void 0),
    replayCanvasAutoCooldown: isNullUndefinedDefaultValue(initConfiguration.replayCanvasAutoCooldown, replayCanvasQualityPreset ? replayCanvasQualityPreset.autoCooldown : void 0),
    replayCanvasAutoUnchangedBackoff: isNullUndefinedDefaultValue(initConfiguration.replayCanvasAutoUnchangedBackoff, replayCanvasQualityPreset ? replayCanvasQualityPreset.autoUnchangedBackoff : void 0),
    replayCanvasAutoFailureBackoff: isNullUndefinedDefaultValue(initConfiguration.replayCanvasAutoFailureBackoff, replayCanvasQualityPreset ? replayCanvasQualityPreset.autoFailureBackoff : void 0),
    replayCanvasAutoMaxPerRun: isNullUndefinedDefaultValue(initConfiguration.replayCanvasAutoMaxPerRun, replayCanvasQualityPreset ? replayCanvasQualityPreset.autoMaxPerRun : void 0),
    replayCanvasFlushImmediately: isNullUndefinedDefaultValue(initConfiguration.replayCanvasFlushImmediately, replayCanvasMode === "manual"),
    traceType: isNullUndefinedDefaultValue(initConfiguration.traceType, TraceType.DDTRACE),
    traceId128Bit: !!initConfiguration.traceId128Bit,
    defaultPrivacyLevel: objectHasValue(DefaultPrivacyLevel, initConfiguration.defaultPrivacyLevel) ? initConfiguration.defaultPrivacyLevel : DefaultPrivacyLevel.MASK_USER_INPUT,
    shouldMaskNode: initConfiguration.shouldMaskNode && catchUserErrors(initConfiguration.shouldMaskNode, "shouldMaskNode threw an error:"),
    shouldRecordCanvas: initConfiguration.shouldRecordCanvas && catchUserErrors(initConfiguration.shouldRecordCanvas, "shouldRecordCanvas threw an error:")
  }, baseConfiguration, buildEnv);
}
function validateAndBuildTracingOptions(initConfiguration) {
  if (initConfiguration.allowedTracingUrls !== void 0 && initConfiguration.allowedTracingOrigins !== void 0) {
    display.warn("Both allowedTracingUrls and allowedTracingOrigins (deprecated) have been defined. The parameter allowedTracingUrls will override allowedTracingOrigins.");
  }
  if (initConfiguration.allowedTracingUrls !== void 0) {
    if (!isArray(initConfiguration.allowedTracingUrls)) {
      display.error("Allowed Tracing URLs should be an array");
      return;
    }
    var tracingOptions = [];
    each(initConfiguration.allowedTracingUrls, function(option) {
      if (isMatchOption(option)) {
        tracingOptions.push({
          match: option,
          traceType: isNullUndefinedDefaultValue(initConfiguration.traceType, TraceType.DDTRACE)
        });
      } else if (isTracingOption(option)) {
        tracingOptions.push(option);
      } else {
        display.warn("Allowed Tracing Urls parameters should be a string, RegExp, function, or an object. Ignoring parameter", option);
      }
    });
    return tracingOptions;
  }
  if (initConfiguration.allowedTracingOrigins !== void 0) {
    if (!isArray(initConfiguration.allowedTracingOrigins)) {
      display.error("Allowed Tracing Origins should be an array");
      return;
    }
    var tracingOptions = [];
    each(initConfiguration.allowedTracingOrigins, function(legacyMatchOption) {
      var tracingOption = convertLegacyMatchOptionToTracingOption(legacyMatchOption, isNullUndefinedDefaultValue(initConfiguration.traceType, TraceType.DDTRACE));
      if (tracingOption) {
        tracingOptions.push(tracingOption);
      }
    });
    return tracingOptions;
  }
  if (initConfiguration.allowedDDTracingOrigins !== void 0) {
    if (!isArray(initConfiguration.allowedDDTracingOrigins)) {
      display.error("Allowed Tracing Origins should be an array");
      return;
    }
    var tracingOptions = [];
    each(initConfiguration.allowedDDTracingOrigins, function(legacyMatchOption) {
      var tracingOption = convertLegacyMatchOptionToTracingOption(legacyMatchOption, isNullUndefinedDefaultValue(initConfiguration.traceType, TraceType.DDTRACE));
      if (tracingOption) {
        tracingOptions.push(tracingOption);
      }
    });
    return tracingOptions;
  }
  return [];
}
function convertLegacyMatchOptionToTracingOption(item, traceType) {
  var match;
  if (typeof item === "string") {
    match = item;
  } else if (item instanceof RegExp) {
    match = function match2(url) {
      return item.test(getOrigin(url));
    };
  } else if (typeof item === "function") {
    match = function match2(url) {
      return item(getOrigin(url));
    };
  }
  if (match === void 0) {
    display.warn("Allowed Tracing Origins parameters should be a string, RegExp or function. Ignoring parameter", item);
    return void 0;
  }
  return {
    match,
    traceType
  };
}
function createPreStartStrategy(rumPublicApiOptions, getCommonContext, doStartRum) {
  var ignoreInitIfSyntheticsWillInjectRum = rumPublicApiOptions.ignoreInitIfSyntheticsWillInjectRum;
  var startDeflateWorker2 = rumPublicApiOptions.startDeflateWorker;
  var bufferApiCalls = createBoundedBuffer();
  var remoteConfigrationCallbacks = createBoundedBuffer();
  var firstStartViewCall;
  var deflateWorker;
  var cachedInitConfiguration;
  var cachedConfiguration;
  var cachedRemoteConfiguration;
  var resourceTrackerManager = rumPublicApiOptions.resourceTrackerManager;
  function tryStartRum() {
    if (!cachedInitConfiguration || !cachedConfiguration) {
      return;
    }
    var initialViewOptions;
    if (cachedConfiguration.trackViewsManually) {
      if (!firstStartViewCall) {
        return;
      }
      bufferApiCalls.remove(firstStartViewCall.callback);
      initialViewOptions = firstStartViewCall.options;
    }
    var startRumResult = doStartRum(cachedConfiguration, deflateWorker, initialViewOptions);
    bufferApiCalls.drain(startRumResult);
  }
  function doInit(initConfiguration, remoteConfiguration) {
    var eventBridgeAvailable = canUseEventBridge();
    if (eventBridgeAvailable) {
      initConfiguration = overrideInitConfigurationForBridge(initConfiguration);
    }
    cachedInitConfiguration = initConfiguration;
    cachedRemoteConfiguration = remoteConfiguration;
    remoteConfigrationCallbacks.drain(cachedRemoteConfiguration);
    addTelemetryConfiguration(deepClone(initConfiguration));
    if (cachedConfiguration) {
      displayAlreadyInitializedError("DATAFLUX_RUM", initConfiguration);
      return;
    }
    var configuration = validateAndBuildRumConfiguration(initConfiguration);
    if (!configuration) {
      return;
    }
    if (!eventBridgeAvailable && !configuration.sessionStoreStrategyType) {
      display.warn("No storage available for session. We will not send any data.");
      return;
    }
    if (configuration.compressIntakeRequests && !configuration.sendContentTypeByJson && !eventBridgeAvailable && startDeflateWorker2) {
      deflateWorker = startDeflateWorker2(
        configuration,
        "RUM",
        // Worker initialization can fail asynchronously, especially in Firefox where even CSP
        // issues are reported asynchronously. For now, the SDK will continue its execution even if
        // data won't be sent to Datadog. We could improve this behavior in the future.
        noop
      );
      if (!deflateWorker) {
        return;
      }
    }
    cachedConfiguration = configuration;
    initFetchObservable().subscribe(noop);
    tryStartRum();
  }
  return {
    init: function init(initConfiguration) {
      if (!initConfiguration) {
        display.error("Missing configuration");
        return;
      }
      cachedInitConfiguration = initConfiguration;
      if (ignoreInitIfSyntheticsWillInjectRum && willSyntheticsInjectRum()) {
        return;
      }
      if (initConfiguration.remoteConfiguration) {
        fetchAndApplyRemoteConfiguration(initConfiguration, doInit);
      } else {
        doInit(initConfiguration);
      }
    },
    getInitConfiguration: function getInitConfiguration() {
      return cachedInitConfiguration;
    },
    getRemoteConfiguration: function getRemoteConfiguration(callback) {
      if (getType(callback) === "function") {
        if (cachedRemoteConfiguration) {
          callback(cachedRemoteConfiguration);
        } else {
          remoteConfigrationCallbacks.add(callback);
        }
      }
    },
    getInternalContext: noop,
    stopSession: noop,
    setForcedSession: function setForcedSession() {
      bufferApiCalls.add(function(startRumResult) {
        return startRumResult.setForcedSession();
      });
    },
    addTiming: function addTiming(name, time) {
      if (time === void 0) {
        time = timeStampNow();
      }
      bufferApiCalls.add(function(startRumResult) {
        startRumResult.addTiming(name, time);
      });
    },
    startView: function startView(options, startClocks) {
      if (startClocks === void 0) {
        startClocks = clocksNow();
      }
      var callback = function callback2(startRumResult) {
        startRumResult.startView(options, startClocks);
      };
      bufferApiCalls.add(callback);
      if (!firstStartViewCall) {
        firstStartViewCall = {
          options,
          callback
        };
        tryStartRum();
      }
    },
    setViewName: function setViewName(name) {
      bufferApiCalls.add(function(startRumResult) {
        return startRumResult.setViewName(name);
      });
    },
    setViewContext: function setViewContext(context) {
      bufferApiCalls.add(function(startRumResult) {
        return startRumResult.setViewContext(context);
      });
    },
    setViewContextProperty: function setViewContextProperty(key, value) {
      bufferApiCalls.add(function(startRumResult) {
        return startRumResult.setViewContextProperty(key, value);
      });
    },
    getViewContext: function getViewContext() {
    },
    addTypeAction: function addTypeAction(action, type, commonContext) {
      if (commonContext === void 0) {
        commonContext = getCommonContext();
      }
      bufferApiCalls.add(function(startRumResult) {
        startRumResult.addTypeAction(action, type, commonContext);
      });
    },
    addAction: function addAction(action, commonContext) {
      if (commonContext === void 0) {
        commonContext = getCommonContext();
      }
      bufferApiCalls.add(function(startRumResult) {
        startRumResult.addAction(action, commonContext);
      });
    },
    addResource: function addResource(resource, commonContext) {
      if (commonContext === void 0) {
        commonContext = getCommonContext();
      }
      bufferApiCalls.add(function(startRumResult) {
        startRumResult.addResource(resource, commonContext);
      });
    },
    addError: function addError(providedError, commonContext) {
      if (commonContext === void 0) {
        commonContext = getCommonContext();
      }
      bufferApiCalls.add(function(startRumResult) {
        startRumResult.addError(providedError, commonContext);
      });
    },
    createResourceTrackerId: function createResourceTrackerId() {
      return resourceTrackerManager.createTrackerId();
    },
    setResourceContext: function setResourceContext(trackerId, context) {
      resourceTrackerManager.setResourceContext(trackerId, context);
    },
    appendResourceContext: function appendResourceContext(trackerId, context) {
      resourceTrackerManager.appendResourceContext(trackerId, context);
    },
    finishResource: function finishResource(trackerId) {
      resourceTrackerManager.finishResource(trackerId);
    },
    getResource: function getResource(trackerId) {
      return resourceTrackerManager.getResource(trackerId);
    }
  };
}
function overrideInitConfigurationForBridge(initConfiguration) {
  var _initConfiguration$de, _getEventBridge;
  return assign({}, initConfiguration, {
    applicationId: "00000000-aaaa-0000-aaaa-000000000000",
    clientToken: "empty",
    sessionSampleRate: 100,
    defaultPrivacyLevel: (_initConfiguration$de = initConfiguration.defaultPrivacyLevel) !== null && _initConfiguration$de !== void 0 ? _initConfiguration$de : (_getEventBridge = getEventBridge()) === null || _getEventBridge === void 0 ? void 0 : _getEventBridge.getPrivacyLevel()
  });
}
function _typeof$7(o) {
  "@babel/helpers - typeof";
  return _typeof$7 = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(o2) {
    return typeof o2;
  } : function(o2) {
    return o2 && "function" == typeof Symbol && o2.constructor === Symbol && o2 !== Symbol.prototype ? "symbol" : typeof o2;
  }, _typeof$7(o);
}
var RESOURCE_TRACKER_HEADER = "x-rum-resource-id";
var RESOURCE_TRACKER_TIMEOUT_MS = 30 * 1e3;
var RESOURCE_TRACKER_RETENTION_MS = 60 * 1e3;
var RESOURCE_TRACKER_ORPHAN_TTL_MS = 5 * 60 * 1e3;
var DEBUG_CLONE_MAX_DEPTH = 8;
function createResourceTrackerManager() {
  var trackers = /* @__PURE__ */ new Map();
  var flushTrackedResource;
  return {
    createTrackerId: function createTrackerId() {
      var trackerId = UUID();
      getOrCreateTracker(trackerId);
      return trackerId;
    },
    setResourceContext: function setResourceContext(trackerId, context) {
      var tracker = trackers.get(trackerId);
      if (!tracker) {
        return;
      }
      if (isTrackerImmutable(tracker)) {
        return;
      }
      tracker.context = assign({}, context || {});
    },
    appendResourceContext: function appendResourceContext(trackerId, context) {
      var tracker = trackers.get(trackerId);
      if (!tracker) {
        return;
      }
      if (isTrackerImmutable(tracker)) {
        return;
      }
      tracker.context = assign(tracker.context, context || {});
    },
    finishResource: function finishResource(trackerId) {
      var tracker = trackers.get(trackerId);
      if (!tracker) {
        return;
      }
      tracker.finished = true;
      if (tracker.status === "request_collected") {
        flushTracker(tracker, "flushed");
      } else if (tracker.status === "created") {
        tracker.status = "finished";
      }
    },
    getResource: function getResource(trackerId) {
      var tracker = trackers.get(trackerId);
      if (!tracker) {
        return void 0;
      }
      return cloneTrackerSnapshot(tracker);
    },
    trackRequestResource: function trackRequestResource(trackerId, rawEvent) {
      var tracker = trackers.get(trackerId);
      if (!tracker) {
        return false;
      }
      if (tracker.requestHeaderMatched || tracker.flushed) {
        return false;
      }
      clearTrackerTimeout(tracker);
      tracker.requestHeaderMatched = true;
      tracker.rawResourceEvent = rawEvent.rawRumEvent;
      tracker.startTime = rawEvent.startTime;
      tracker.domainContext = rawEvent.domainContext;
      tracker.resource = extractResourceSummary(rawEvent.rawRumEvent);
      tracker.status = "request_collected";
      if (tracker.finished) {
        flushTracker(tracker, "flushed");
      } else {
        tracker.timeoutId = setTimeout(function() {
          tracker.timeoutId = void 0;
          if (tracker.status === "request_collected") {
            flushTracker(tracker, "timeout_flushed");
          }
        }, RESOURCE_TRACKER_TIMEOUT_MS);
      }
      return true;
    },
    setFlushTrackedResource: function setFlushTrackedResource(handler) {
      flushTrackedResource = handler;
    },
    getTrackerIdFromRequestHeaders: function getTrackerIdFromRequestHeaders(requestHeaders) {
      return getHeaderValue(requestHeaders, RESOURCE_TRACKER_HEADER);
    }
  };
  function getOrCreateTracker(trackerId) {
    var tracker = trackers.get(trackerId);
    if (!tracker) {
      tracker = {
        id: trackerId,
        status: "created",
        context: {},
        finished: false,
        flushed: false,
        requestHeaderMatched: false
      };
      trackers.set(trackerId, tracker);
      tracker.orphanTimeoutId = setTimeout(function() {
        tracker.status = "cleared";
        trackers["delete"](tracker.id);
      }, RESOURCE_TRACKER_ORPHAN_TTL_MS);
    }
    return tracker;
  }
  function flushTracker(tracker, status) {
    if (tracker.flushed || !tracker.rawResourceEvent) {
      tracker.status = status;
      return;
    }
    clearTrackerTimeout(tracker);
    tracker.flushed = true;
    tracker.status = status;
    if (!flushTrackedResource) {
      scheduleTrackerClear(tracker);
      return;
    }
    try {
      flushTrackedResource({
        startTime: tracker.startTime,
        rawRumEvent: tracker.rawResourceEvent,
        customerContext: assign({}, tracker.context),
        domainContext: tracker.domainContext
      });
    } catch (error) {
      addTelemetryError(error);
    } finally {
      scheduleTrackerClear(tracker);
    }
  }
  function scheduleTrackerClear(tracker) {
    clearTrackerTimeout(tracker);
    tracker.clearTimeoutId = setTimeout(function() {
      tracker.status = "cleared";
      trackers["delete"](tracker.id);
    }, RESOURCE_TRACKER_RETENTION_MS);
  }
}
function clearTrackerTimeout(tracker) {
  if (tracker.timeoutId) {
    clearTimeout(tracker.timeoutId);
    tracker.timeoutId = void 0;
  }
  if (tracker.orphanTimeoutId) {
    clearTimeout(tracker.orphanTimeoutId);
    tracker.orphanTimeoutId = void 0;
  }
  if (tracker.clearTimeoutId) {
    clearTimeout(tracker.clearTimeoutId);
    tracker.clearTimeoutId = void 0;
  }
}
function isTrackerImmutable(tracker) {
  return tracker.status === "flushed" || tracker.status === "timeout_flushed" || tracker.status === "cleared";
}
function extractResourceSummary(rawRumEvent) {
  var resource = rawRumEvent && rawRumEvent.resource;
  if (!resource) {
    return void 0;
  }
  return {
    type: resource.type,
    url: resource.url,
    method: resource.method,
    status: resource.status
  };
}
function cloneTrackerSnapshot(tracker) {
  return {
    trackerId: tracker.id,
    status: tracker.status,
    context: deepClone(tracker.context),
    resource: tracker.resource ? assign({}, tracker.resource) : void 0,
    rawRumEvent: tracker.rawResourceEvent ? cloneDebugRawRumEvent(tracker.rawResourceEvent) : void 0
  };
}
function cloneDebugRawRumEvent(rawRumEvent) {
  var clonedEvent = {};
  for (var key in rawRumEvent) {
    if (Object.prototype.hasOwnProperty.call(rawRumEvent, key)) {
      clonedEvent[key] = cloneDebugObject(rawRumEvent[key], DEBUG_CLONE_MAX_DEPTH);
    }
  }
  return clonedEvent;
}
function cloneDebugObject(value, depth) {
  if (!value || _typeof$7(value) !== "object" || depth < 0) {
    return value;
  }
  if (Array.isArray(value)) {
    var clonedArray = [];
    for (var i = 0; i < value.length; i += 1) {
      clonedArray.push(cloneDebugObject(value[i], depth - 1));
    }
    return clonedArray;
  }
  var clonedObject = {};
  for (var key in value) {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      clonedObject[key] = cloneDebugObject(value[key], depth - 1);
    }
  }
  return clonedObject;
}
function getHeaderValue(headers, key) {
  if (!headers || !key) {
    return void 0;
  }
  var normalizedKey = String(key).toLowerCase();
  if (typeof headers.get === "function") {
    return headers.get(key) || headers.get(normalizedKey) || void 0;
  }
  if (Array.isArray(headers)) {
    for (var i = 0; i < headers.length; i += 1) {
      var entry = headers[i];
      if (Array.isArray(entry) && String(entry[0]).toLowerCase() === normalizedKey) {
        return entry[1];
      }
    }
    return void 0;
  }
  for (var headerKey in headers) {
    if (String(headerKey).toLowerCase() === normalizedKey) {
      return headers[headerKey];
    }
  }
}
function _typeof$6(o) {
  "@babel/helpers - typeof";
  return _typeof$6 = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(o2) {
    return typeof o2;
  } : function(o2) {
    return o2 && "function" == typeof Symbol && o2.constructor === Symbol && o2 !== Symbol.prototype ? "symbol" : typeof o2;
  }, _typeof$6(o);
}
var RUM_STORAGE_KEY = "rum";
function makeRumPublicApi(startRumImpl, recorderApi2, options) {
  if (options === void 0) {
    options = {};
  }
  var customerDataTrackerManager = createCustomerDataTrackerManager(CustomerDataCompressionStatus.Unknown);
  var resourceTrackerManager = createResourceTrackerManager();
  var globalContextManager = createContextManager("global", {
    customerDataTracker: customerDataTrackerManager.getOrCreateTracker(CustomerDataType.GlobalContext)
  });
  var userContextManager = createContextManager("user", {
    customerDataTracker: customerDataTrackerManager.getOrCreateTracker(CustomerDataType.User),
    propertiesConfig: {
      id: {
        type: "string"
      },
      name: {
        type: "string"
      },
      email: {
        type: "string"
      }
    }
  });
  function getCommonContext() {
    return buildCommonContext(globalContextManager, userContextManager, recorderApi2);
  }
  var strategy = createPreStartStrategy(assign({}, options, {
    resourceTrackerManager
  }), getCommonContext, function(configuration, deflateWorker, initialViewOptions) {
    if (configuration.storeContextsToLocal) {
      storeContextManager(configuration, globalContextManager, RUM_STORAGE_KEY, CustomerDataType.GlobalContext);
      storeContextManager(configuration, userContextManager, RUM_STORAGE_KEY, CustomerDataType.User);
    }
    customerDataTrackerManager.setCompressionStatus(deflateWorker ? CustomerDataCompressionStatus.Enabled : CustomerDataCompressionStatus.Disabled);
    var startRumResult = startRumImpl(configuration, recorderApi2, customerDataTrackerManager, getCommonContext, initialViewOptions, deflateWorker && options.createDeflateEncoder ? function(streamId) {
      return options.createDeflateEncoder(deflateWorker, streamId);
    } : createIdentityEncoder, resourceTrackerManager);
    recorderApi2.onRumStart(startRumResult.lifeCycle, configuration, startRumResult.session, startRumResult.viewContexts, deflateWorker);
    strategy = createPostStartStrategy(strategy, startRumResult);
    return startRumResult;
  });
  var startView = monitor(function(options2) {
    var sanitizedOptions = _typeof$6(options2) === "object" ? options2 : {
      name: options2
    };
    strategy.startView(sanitizedOptions);
    if (sanitizedOptions.context) {
      customerDataTrackerManager.getOrCreateTracker(CustomerDataType.View).updateCustomerData(sanitizedOptions.context);
    }
    addTelemetryUsage({
      feature: "start-view"
    });
  });
  var rumPublicApi = makePublicApi({
    init: monitor(function(initConfiguration) {
      strategy.init(initConfiguration);
    }),
    setViewName: monitor(function(name) {
      strategy.setViewName(name);
      addTelemetryUsage({
        feature: "set-view-name"
      });
    }),
    setViewContext: monitor(function(context) {
      strategy.setViewContext(context);
      addTelemetryUsage({
        feature: "set-view-context"
      });
    }),
    setViewContextProperty: monitor(function(key, value) {
      strategy.setViewContextProperty(key, value);
      addTelemetryUsage({
        feature: "set-view-context-property"
      });
    }),
    getViewContext: monitor(function() {
      addTelemetryUsage({
        feature: "set-view-context-property"
      });
      return strategy.getViewContext();
    }),
    /** @deprecated: use setGlobalContextProperty instead */
    addRumGlobalContext: monitor(function(key, value) {
      globalContextManager.setContextProperty(key, value);
      addTelemetryUsage({
        feature: "set-global-context"
      });
    }),
    setGlobalContextProperty: monitor(function(key, value) {
      globalContextManager.setContextProperty(key, value);
      addTelemetryUsage({
        feature: "set-global-context"
      });
    }),
    /** @deprecated: use removeGlobalContextProperty instead */
    removeRumGlobalContext: monitor(function(key) {
      return globalContextManager.removeContextProperty(key);
    }),
    removeGlobalContextProperty: monitor(function(key) {
      return globalContextManager.removeContextProperty(key);
    }),
    /** @deprecated: use getGlobalContext instead */
    getRumGlobalContext: monitor(function() {
      return globalContextManager.getContext();
    }),
    getGlobalContext: monitor(function() {
      return globalContextManager.getContext();
    }),
    /** @deprecated: use setGlobalContext instead */
    setRumGlobalContext: monitor(function(context) {
      globalContextManager.setContext(context);
      addTelemetryUsage({
        feature: "set-global-context"
      });
    }),
    setGlobalContext: monitor(function(context) {
      globalContextManager.setContext(context);
      addTelemetryUsage({
        feature: "set-global-context"
      });
    }),
    clearGlobalContext: monitor(function() {
      return globalContextManager.clearContext();
    }),
    getInitConfiguration: monitor(function() {
      return deepClone(strategy.initConfiguration);
    }),
    getRemoteConfiguration: monitor(function(callback) {
      return strategy.getRemoteConfiguration(callback);
    }),
    getInternalContext: monitor(function(startTime) {
      return strategy.getInternalContext(startTime);
    }),
    addDebugSession: monitor(function(id) {
    }),
    clearDebugSession: monitor(function() {
    }),
    getDebugSession: monitor(function() {
    }),
    addResource: monitor(function(context) {
      var handlingStack = createHandlingStack();
      callMonitored(function() {
        strategy.addResource({
          context: sanitize(context),
          startClocks: clocksNow(),
          type: ResourceType.CUSTOM,
          handlingStack
        });
        addTelemetryUsage({
          feature: "add-resource"
        });
      });
    }),
    addTypeAction: monitor(function(name, type, context) {
      var handlingStack = createHandlingStack();
      callMonitored(function() {
        var sourceType = sanitize(type);
        strategy.addAction({
          name: sanitize(name),
          context: sanitize(context),
          startClocks: clocksNow(),
          type: getType(sourceType) === "string" ? sourceType : ActionType.CUSTOM,
          handlingStack
        });
        addTelemetryUsage({
          feature: "add-type-action"
        });
      });
    }),
    addAction: monitor(function(name, context) {
      var handlingStack = createHandlingStack();
      callMonitored(function() {
        strategy.addAction({
          name: sanitize(name),
          context: sanitize(context),
          startClocks: clocksNow(),
          type: ActionType.CUSTOM,
          handlingStack
        });
        addTelemetryUsage({
          feature: "add-action"
        });
      });
    }),
    addError: monitor(function(error, context) {
      var handlingStack = createHandlingStack();
      callMonitored(function() {
        strategy.addError({
          error,
          // Do not sanitize error here, it is needed unserialized by computeRawError()
          handlingStack,
          context: sanitize(context),
          startClocks: clocksNow()
        });
        addTelemetryUsage({
          feature: "add-error"
        });
      });
    }),
    addTiming: monitor(function(name, time) {
      strategy.addTiming(sanitize(name), time);
    }),
    setUser: monitor(function(newUser) {
      if (checkUser(newUser)) {
        userContextManager.setContext(sanitizeUser(newUser));
      }
      addTelemetryUsage({
        feature: "set-user"
      });
    }),
    getUser: monitor(function() {
      return userContextManager.getContext();
    }),
    setUserProperty: monitor(function(key, property) {
      var newUser = {};
      newUser[key] = property;
      var sanitizedProperty = sanitizeUser(newUser)[key];
      userContextManager.setContextProperty(key, sanitizedProperty);
      addTelemetryUsage({
        feature: "set-user"
      });
    }),
    removeUserProperty: monitor(function(key) {
      return userContextManager.removeContextProperty(key);
    }),
    /** @deprecated: renamed to clearUser */
    removeUser: monitor(function() {
      return userContextManager.clearContext();
    }),
    clearUser: monitor(function() {
      return userContextManager.clearContext();
    }),
    startView,
    stopSession: monitor(function() {
      strategy.stopSession();
      addTelemetryUsage({
        feature: "stop-session"
      });
    }),
    setForcedSession: monitor(function() {
      strategy.setForcedSession();
      addTelemetryUsage({
        feature: "set-forced-session"
      });
    }),
    startSessionReplayRecording: monitor(function(options2) {
      recorderApi2.start(options2);
      addTelemetryUsage({
        feature: "start-session-replay-recording",
        force: options2 && options2.force
      });
    }),
    isRecording: monitor(function() {
      return recorderApi2.isRecording();
    }),
    stopSessionReplayRecording: monitor(recorderApi2.stop),
    takeSubsequentFullSnapshot: monitor(recorderApi2.takeSubsequentFullSnapshot),
    snapshotCanvas: monitor(function(canvas, options2) {
      return recorderApi2.snapshotCanvas(canvas, options2);
    }),
    getSerializedNodeIdForDebug: monitor(function(node) {
      return recorderApi2.getSerializedNodeIdForDebug(node);
    }),
    getLastAutoCanvasSnapshotResultForDebug: monitor(function() {
      return recorderApi2.getLastAutoCanvasSnapshotResultForDebug();
    }),
    getAutoCanvasSnapshotDebugHistoryForDebug: monitor(function() {
      return recorderApi2.getAutoCanvasSnapshotDebugHistoryForDebug();
    }),
    getLastCanvasMutationForDebug: monitor(function() {
      return recorderApi2.getLastCanvasMutationForDebug();
    }),
    getCanvasMutationHistoryForDebug: monitor(function() {
      return recorderApi2.getCanvasMutationHistoryForDebug();
    }),
    getLastDomMutationForDebug: monitor(function() {
      return recorderApi2.getLastDomMutationForDebug();
    }),
    getDomMutationHistoryForDebug: monitor(function() {
      return recorderApi2.getDomMutationHistoryForDebug();
    }),
    getLastReplaySegmentFlushForDebug: monitor(function() {
      return recorderApi2.getLastReplaySegmentFlushForDebug();
    }),
    getReplaySegmentFlushHistoryForDebug: monitor(function() {
      return recorderApi2.getReplaySegmentFlushHistoryForDebug();
    }),
    getReplayPerformanceForDebug: monitor(function() {
      return recorderApi2.getReplayPerformanceForDebug();
    }),
    flushReplayMutationsForDebug: monitor(function() {
      if (recorderApi2.flushReplayMutationsForDebug) {
        recorderApi2.flushReplayMutationsForDebug();
      }
    }),
    createResourceTrackerId: monitor(function() {
      return resourceTrackerManager.createTrackerId();
    }),
    setResourceContext: monitor(function(trackerId, context) {
      return resourceTrackerManager.setResourceContext(trackerId, sanitize(context));
    }),
    appendResourceContext: monitor(function(trackerId, context) {
      return resourceTrackerManager.appendResourceContext(trackerId, sanitize(context));
    }),
    finishResource: monitor(function(trackerId) {
      return resourceTrackerManager.finishResource(trackerId);
    }),
    getResource: monitor(function(trackerId) {
      return resourceTrackerManager.getResource(trackerId);
    })
  });
  return rumPublicApi;
}
function createPostStartStrategy(preStartStrategy, startRumResult) {
  return assign({
    init: function init(initConfiguration) {
      displayAlreadyInitializedError("DATAFLUX_RUM", initConfiguration);
    },
    initConfiguration: preStartStrategy.getInitConfiguration(),
    getRemoteConfiguration: function getRemoteConfiguration(callback) {
      preStartStrategy.getRemoteConfiguration(callback);
    }
  }, startRumResult);
}
var RecordType = {
  FullSnapshot: 2,
  IncrementalSnapshot: 3,
  Meta: 4,
  Focus: 6,
  ViewEnd: 7,
  VisualViewport: 8,
  FrustrationRecord: 9
};
var NodeType = {
  Document: 0,
  DocumentType: 1,
  Element: 2,
  Text: 3,
  CDATA: 4,
  DocumentFragment: 11
};
var IncrementalSource = {
  Mutation: 0,
  MouseMove: 1,
  MouseInteraction: 2,
  Scroll: 3,
  ViewportResize: 4,
  Input: 5,
  TouchMove: 6,
  MediaInteraction: 7,
  StyleSheetRule: 8,
  CanvasMutation: 9
  // Font : 10,
};
var MouseInteractionType = {
  MouseUp: 0,
  MouseDown: 1,
  Click: 2,
  ContextMenu: 3,
  DblClick: 4,
  Focus: 5,
  Blur: 6,
  TouchStart: 7,
  TouchEnd: 9
};
var MediaInteractionType = {
  Play: 0,
  Pause: 1
};
var NodePrivacyLevel = {
  IGNORE: "ignore",
  HIDDEN: "hidden",
  ALLOW: DefaultPrivacyLevel.ALLOW,
  MASK: DefaultPrivacyLevel.MASK,
  MASK_USER_INPUT: DefaultPrivacyLevel.MASK_USER_INPUT
};
var PRIVACY_ATTR_NAME = "data-gc-privacy";
var PRIVACY_ATTR_VALUE_ALLOW = "allow";
var PRIVACY_ATTR_VALUE_MASK = "mask";
var PRIVACY_ATTR_VALUE_MASK_USER_INPUT = "mask-user-input";
var PRIVACY_ATTR_VALUE_HIDDEN = "hidden";
var PRIVACY_CLASS_ALLOW = "gc-privacy-allow";
var PRIVACY_CLASS_MASK = "gc-privacy-mask";
var PRIVACY_CLASS_MASK_USER_INPUT = "gc-privacy-mask-user-input";
var PRIVACY_CLASS_HIDDEN = "gc-privacy-hidden";
var CENSORED_STRING_MARK = "***";
var CENSORED_IMG_MARK = "data:image/gif;base64,R0lGODlhAQABAIAAAMLCwgAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==";
var FORM_PRIVATE_TAG_NAMES = {
  INPUT: true,
  OUTPUT: true,
  TEXTAREA: true,
  SELECT: true,
  OPTION: true,
  DATALIST: true,
  OPTGROUP: true
};
var TEXT_MASKING_CHAR = "x";
function getNodePrivacyLevel(node, defaultPrivacyLevel, cache) {
  if (cache && cache.has(node)) {
    return cache.get(node);
  }
  var parentNode = getParentNode(node);
  var parentNodePrivacyLevel = parentNode ? getNodePrivacyLevel(parentNode, defaultPrivacyLevel) : defaultPrivacyLevel;
  var selfNodePrivacyLevel = getNodeSelfPrivacyLevel(node);
  var nodePrivacyLevel = reducePrivacyLevel(selfNodePrivacyLevel, parentNodePrivacyLevel);
  if (cache) {
    cache.set(node, nodePrivacyLevel);
  }
  return nodePrivacyLevel;
}
function reducePrivacyLevel(childPrivacyLevel, parentNodePrivacyLevel) {
  switch (parentNodePrivacyLevel) {
    // These values cannot be overridden
    case NodePrivacyLevel.HIDDEN:
    case NodePrivacyLevel.IGNORE:
      return parentNodePrivacyLevel;
  }
  switch (childPrivacyLevel) {
    case NodePrivacyLevel.ALLOW:
    case NodePrivacyLevel.MASK:
    case NodePrivacyLevel.MASK_USER_INPUT:
    case NodePrivacyLevel.HIDDEN:
    case NodePrivacyLevel.IGNORE:
      return childPrivacyLevel;
    default:
      return parentNodePrivacyLevel;
  }
}
function getNodeSelfPrivacyLevel(node) {
  if (!isElementNode(node)) {
    return;
  }
  var privAttr = node.getAttribute(PRIVACY_ATTR_NAME);
  if (node.tagName === "BASE") {
    return NodePrivacyLevel.ALLOW;
  }
  if (node.tagName === "INPUT") {
    var inputElement = node;
    if (inputElement.type === "password" || inputElement.type === "email" || inputElement.type === "tel") {
      return NodePrivacyLevel.MASK;
    }
    if (inputElement.type === "hidden") {
      return NodePrivacyLevel.MASK;
    }
    var autocomplete = inputElement.getAttribute("autocomplete");
    if (autocomplete && autocomplete.indexOf("cc-") === 0) {
      return NodePrivacyLevel.MASK;
    }
  }
  if (privAttr === PRIVACY_ATTR_VALUE_HIDDEN || node.classList.contains(PRIVACY_CLASS_HIDDEN)) {
    return NodePrivacyLevel.HIDDEN;
  }
  if (privAttr === PRIVACY_ATTR_VALUE_MASK || node.classList.contains(PRIVACY_CLASS_MASK)) {
    return NodePrivacyLevel.MASK;
  }
  if (privAttr === PRIVACY_ATTR_VALUE_MASK_USER_INPUT || node.classList.contains(PRIVACY_CLASS_MASK_USER_INPUT)) {
    return NodePrivacyLevel.MASK_USER_INPUT;
  }
  if (privAttr === PRIVACY_ATTR_VALUE_ALLOW || node.classList.contains(PRIVACY_CLASS_ALLOW)) {
    return NodePrivacyLevel.ALLOW;
  }
  if (shouldIgnoreElement(node)) {
    return NodePrivacyLevel.IGNORE;
  }
}
function shouldMaskNode(configuration, node, privacyLevel) {
  if (configuration.shouldMaskNode && configuration.shouldMaskNode(node, privacyLevel) === true) return true;
  switch (privacyLevel) {
    case NodePrivacyLevel.MASK:
    case NodePrivacyLevel.HIDDEN:
    case NodePrivacyLevel.IGNORE:
      return true;
    case NodePrivacyLevel.MASK_USER_INPUT:
      return isTextNode(node) ? isFormElement(node.parentNode) : isFormElement(node);
    default:
      return false;
  }
}
function isFormElement(node) {
  if (!node || node.nodeType !== node.ELEMENT_NODE) {
    return false;
  }
  var element = node;
  if (element.tagName === "INPUT") {
    switch (element.type) {
      case "button":
      case "color":
      case "reset":
      case "submit":
        return false;
    }
  }
  return !!FORM_PRIVATE_TAG_NAMES[element.tagName];
}
var censorText = function censorText2(text) {
  return text.replace(/\S/g, TEXT_MASKING_CHAR);
};
function getTextContent(configuration, textNode, ignoreWhiteSpace, parentNodePrivacyLevel) {
  var parentTagName = textNode.parentElement && textNode.parentElement.tagName;
  var textContent = textNode.textContent || "";
  if (ignoreWhiteSpace && !textContent.trim()) {
    return;
  }
  var nodePrivacyLevel = parentNodePrivacyLevel;
  var isScript = parentTagName === "SCRIPT";
  if (isScript) {
    textContent = CENSORED_STRING_MARK;
  } else if (nodePrivacyLevel === NodePrivacyLevel.HIDDEN) {
    textContent = CENSORED_STRING_MARK;
  } else if (shouldMaskNode(configuration, textNode, nodePrivacyLevel)) {
    if (
      // Scrambling the child list breaks text nodes for DATALIST/SELECT/OPTGROUP
      parentTagName === "DATALIST" || parentTagName === "SELECT" || parentTagName === "OPTGROUP"
    ) {
      if (!textContent.trim()) {
        return;
      }
    } else if (parentTagName === "OPTION") {
      textContent = CENSORED_STRING_MARK;
    } else {
      textContent = censorText(textContent);
    }
  }
  return textContent;
}
function shouldIgnoreElement(element) {
  if (element.nodeName === "SCRIPT") {
    return true;
  }
  if (element.nodeName === "LINK") {
    var relAttribute = getLowerCaseAttribute("rel");
    return (
      // Link as script - Ignore only when rel=preload, modulepreload or prefetch
      /preload|prefetch/i.test(relAttribute) && getLowerCaseAttribute("as") === "script" || // Favicons
      relAttribute === "shortcut icon" || relAttribute === "icon"
    );
  }
  if (element.nodeName === "META") {
    var nameAttribute = getLowerCaseAttribute("name");
    var relAttribute = getLowerCaseAttribute("rel");
    var propertyAttribute = getLowerCaseAttribute("property");
    return (
      // Favicons
      /^msapplication-tile(image|color)$/.test(nameAttribute) || nameAttribute === "application-name" || relAttribute === "icon" || relAttribute === "apple-touch-icon" || relAttribute === "shortcut icon" || // Description
      nameAttribute === "keywords" || nameAttribute === "description" || // Social
      /^(og|twitter|fb):/.test(propertyAttribute) || /^(og|twitter):/.test(nameAttribute) || nameAttribute === "pinterest" || // Robots
      nameAttribute === "robots" || nameAttribute === "googlebot" || nameAttribute === "bingbot" || // Http headers. Ex: X-UA-Compatible, Content-Type, Content-Language, cache-control,
      // X-Translated-By
      element.hasAttribute("http-equiv") || // Authorship
      nameAttribute === "author" || nameAttribute === "generator" || nameAttribute === "framework" || nameAttribute === "publisher" || nameAttribute === "progid" || /^article:/.test(propertyAttribute) || /^product:/.test(propertyAttribute) || // Verification
      nameAttribute === "google-site-verification" || nameAttribute === "yandex-verification" || nameAttribute === "csrf-token" || nameAttribute === "p:domain_verify" || nameAttribute === "verify-v1" || nameAttribute === "verification" || nameAttribute === "shopify-checkout-api-token"
    );
  }
  function getLowerCaseAttribute(name) {
    return (element.getAttribute(name) || "").toLowerCase();
  }
  return false;
}
var serializedNodeIds = /* @__PURE__ */ new WeakMap();
var serializedCanvasNodes = /* @__PURE__ */ new Set();
var anchorElementByDocument = /* @__PURE__ */ new WeakMap();
var hrefByDocument = /* @__PURE__ */ new WeakMap();
function getHiddenElementPlaceholderSize(element) {
  var width = element.getAttribute("width") || element.style && element.style.width || void 0;
  var height = element.getAttribute("height") || element.style && element.style.height || void 0;
  return {
    width,
    height
  };
}
function hasSerializedNode(node) {
  return serializedNodeIds.has(node);
}
function nodeAndAncestorsHaveSerializedNode(node) {
  var current = node;
  while (current) {
    if (!hasSerializedNode(current) && !isNodeShadowRoot(current)) {
      return false;
    }
    current = getParentNode(current);
  }
  return true;
}
function getSerializedNodeId(node) {
  return serializedNodeIds.get(node);
}
function setSerializedNodeId(node, serializeNodeId) {
  serializedNodeIds.set(node, serializeNodeId);
  if (node instanceof HTMLCanvasElement) {
    serializedCanvasNodes.add(node);
  }
}
function isSerializedCanvasConnectedToDocument(node) {
  if (document.documentElement && document.documentElement.contains) {
    return document.documentElement.contains(node);
  }
  var current = node;
  while (current) {
    if (current === document) {
      return true;
    }
    current = getParentNode(current);
  }
  return false;
}
function getSerializedCanvasNodes() {
  var connectedSerializedCanvasNodes = [];
  serializedCanvasNodes.forEach(function(node) {
    if (hasSerializedNode(node) && isSerializedCanvasConnectedToDocument(node)) {
      connectedSerializedCanvasNodes.push(node);
      return;
    }
    serializedCanvasNodes["delete"](node);
  });
  return connectedSerializedCanvasNodes;
}
function getElementInputValue(configuration, element, nodePrivacyLevel) {
  var tagName = element.tagName;
  var value = element.value;
  if (shouldMaskNode(configuration, element, nodePrivacyLevel)) {
    var type = element.type;
    if (tagName === "INPUT" && (type === "button" || type === "submit" || type === "reset" || type === "range")) {
      return value;
    } else if (!value || tagName === "OPTION") {
      return;
    }
    return CENSORED_STRING_MARK;
  }
  if (tagName === "OPTION" || tagName === "SELECT") {
    return element.value;
  }
  if (tagName !== "INPUT" && tagName !== "TEXTAREA") {
    return;
  }
  return value;
}
function extractOrigin(url) {
  var origin = "";
  if (url.indexOf("//") > -1) {
    origin = url.split("/").slice(0, 3).join("/");
  } else {
    origin = url.split("/")[0];
  }
  origin = origin.split("?")[0];
  return origin;
}
var URL_IN_CSS_REF = /url\((?:(')([^']*)'|(")([^"]*)"|([^)]*))\)/gm;
var ABSOLUTE_URL = /^[A-Za-z]+:|^\/\//;
var DATA_URI = /^data:.*,/i;
function fixBrowserCompatibilityIssuesInCSS(cssText) {
  if (cssText.includes(" background-clip: text;") && !cssText.includes(" -webkit-background-clip: text;")) {
    cssText = cssText.replace(" background-clip: text;", " -webkit-background-clip: text; background-clip: text;");
  }
  return cssText;
}
function getHref() {
  return getDocumentHref(document);
}
function switchToAbsoluteUrl(cssText, cssHref) {
  return cssText.replace(URL_IN_CSS_REF, function(matchingSubstring, singleQuote, urlWrappedInSingleQuotes, doubleQuote, urlWrappedInDoubleQuotes, urlNotWrappedInQuotes) {
    var url = urlWrappedInSingleQuotes || urlWrappedInDoubleQuotes || urlNotWrappedInQuotes;
    if (!cssHref || !url || ABSOLUTE_URL.test(url) || DATA_URI.test(url)) {
      return matchingSubstring;
    }
    var quote = singleQuote || doubleQuote || "";
    if (url[0] === "/") {
      return "url(".concat(quote).concat(extractOrigin(cssHref) + url).concat(quote, ")");
    }
    return "url(".concat(quote).concat(makeUrlAbsolute(url, cssHref)).concat(quote, ")");
  });
}
function getCssRulesString(cssStyleSheet) {
  if (!cssStyleSheet) {
    return null;
  }
  var rules;
  try {
    rules = cssStyleSheet.rules || cssStyleSheet.cssRules;
  } catch (_unused) {
  }
  if (!rules) {
    return null;
  }
  var styleSheetCssText = fixBrowserCompatibilityIssuesInCSS(Array.from(rules, isSafari() ? getCssRuleStringForSafari : getCssRuleString).join(""));
  return switchToAbsoluteUrl(styleSheetCssText, cssStyleSheet.href);
}
function isCSSImportRule(rule) {
  return "styleSheet" in rule;
}
function isSVGElement(el) {
  return el.tagName === "svg" || el instanceof SVGElement;
}
function getCssRuleString(rule) {
  return isCSSImportRule(rule) && getCssRulesString(rule.styleSheet) || rule.cssText;
}
function makeUrlAbsolute(url, baseUrl) {
  try {
    return buildUrl(url, baseUrl).href;
  } catch (_) {
    return url;
  }
}
function isCSSStyleRule(rule) {
  return "selectorText" in rule;
}
function getCssRuleStringForSafari(rule) {
  if (isCSSStyleRule(rule) && rule.selectorText.includes(":")) {
    var escapeColon = /(\[[\w-]+[^\\])(:[^\]]+\])/g;
    return rule.cssText.replace(escapeColon, "$1\\$2");
  }
  return getCssRuleString(rule);
}
function serializeStyleSheets(cssStyleSheets) {
  if (cssStyleSheets === void 0 || cssStyleSheets.length === 0) {
    return void 0;
  }
  return cssStyleSheets.map(function(cssStyleSheet) {
    var rules = cssStyleSheet.cssRules || cssStyleSheet.rules;
    var cssRules = Array.from(rules, function(cssRule) {
      return cssRule.cssText;
    });
    var styleSheet = {
      cssRules,
      disabled: cssStyleSheet.disabled || void 0,
      media: cssStyleSheet.media.length > 0 ? Array.from(cssStyleSheet.media) : void 0
    };
    return styleSheet;
  });
}
function absoluteToDoc(doc, attributeValue) {
  if (!attributeValue || attributeValue.trim() === "") {
    return attributeValue;
  }
  var a = getAnchorElement(doc);
  a.href = attributeValue;
  return a.href;
}
function getAnchorElement(doc) {
  var anchor = anchorElementByDocument.get(doc);
  if (!anchor) {
    anchor = doc.createElement("a");
    anchorElementByDocument.set(doc, anchor);
  }
  return anchor;
}
function getDocumentHref(doc) {
  var href = hrefByDocument.get(doc);
  if (!href) {
    var anchor = getAnchorElement(doc);
    anchor.href = "";
    href = anchor.href;
    hrefByDocument.set(doc, href);
  }
  return href;
}
var SRCSET_NOT_SPACES = /^[^ \t\n\r\u000c]+/;
var SRCSET_COMMAS_OR_SPACES = /^[, \t\n\r\u000c]+/;
function getAbsoluteSrcsetString(doc, attributeValue) {
  if (attributeValue.trim() === "") {
    return attributeValue;
  }
  var pos = 0;
  function collectCharacters(regEx) {
    var chars;
    var match = regEx.exec(attributeValue.substring(pos));
    if (match) {
      chars = match[0];
      pos += chars.length;
      return chars;
    }
    return "";
  }
  var output = [];
  while (true) {
    collectCharacters(SRCSET_COMMAS_OR_SPACES);
    if (pos >= attributeValue.length) {
      break;
    }
    var url = collectCharacters(SRCSET_NOT_SPACES);
    if (url.slice(-1) === ",") {
      url = absoluteToDoc(doc, url.substring(0, url.length - 1));
      output.push(url);
    } else {
      var descriptorsStr = "";
      url = absoluteToDoc(doc, url);
      var inParens = false;
      while (true) {
        var c = attributeValue.charAt(pos);
        if (c === "") {
          output.push((url + descriptorsStr).trim());
          break;
        } else if (!inParens) {
          if (c === ",") {
            pos += 1;
            output.push((url + descriptorsStr).trim());
            break;
          } else if (c === "(") {
            inParens = true;
          }
        } else {
          if (c === ")") {
            inParens = false;
          }
        }
        descriptorsStr += c;
        pos += 1;
      }
    }
  }
  return output.join(", ");
}
function _typeof$5(o) {
  "@babel/helpers - typeof";
  return _typeof$5 = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(o2) {
    return typeof o2;
  } : function(o2) {
    return o2 && "function" == typeof Symbol && o2.constructor === Symbol && o2 !== Symbol.prototype ? "symbol" : typeof o2;
  }, _typeof$5(o);
}
function _defineProperty$1(e, r, t) {
  return (r = _toPropertyKey$1(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: true, configurable: true, writable: true }) : e[r] = t, e;
}
function _toPropertyKey$1(t) {
  var i = _toPrimitive$1(t, "string");
  return "symbol" == _typeof$5(i) ? i : i + "";
}
function _toPrimitive$1(t, r) {
  if ("object" != _typeof$5(t) || !t) return t;
  var e = t[Symbol.toPrimitive];
  if (void 0 !== e) {
    var i = e.call(t, r);
    if ("object" != _typeof$5(i)) return i;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return ("string" === r ? String : Number)(t);
}
var SerializationContextStatus = {
  INITIAL_FULL_SNAPSHOT: 0,
  SUBSEQUENT_FULL_SNAPSHOT: 1,
  MUTATION: 2
};
function serializeDocument(document2, configuration, serializationContext) {
  return serializeNodeWithId(document2, {
    serializationContext,
    parentNodePrivacyLevel: configuration.defaultPrivacyLevel,
    configuration
  });
}
function serializeNodeWithId(node, options) {
  var serializedNodeDescription = describeSerializedNode(node, options);
  if (!serializedNodeDescription) {
    return null;
  }
  var serializedNodeWithId = assignSerializedNodeId(node, serializedNodeDescription.serializedNode, options);
  if (serializedNodeDescription.shouldSerializeChildren) {
    serializedNodeWithId.childNodes = serializeChildNodes(node, serializedNodeDescription.childNodesOptions);
  }
  return serializedNodeWithId;
}
function createMutationSerializerTask(node, options) {
  var rootNodeDescription = describeSerializedNode(node, options);
  if (!rootNodeDescription) {
    return null;
  }
  var serializedRootNode = assignSerializedNodeId(node, rootNodeDescription.serializedNode, options);
  var stack = [];
  if (rootNodeDescription.shouldSerializeChildren) {
    pushChildNodes(node, serializedRootNode, rootNodeDescription.childNodesOptions);
  }
  return {
    serializedNode: serializedRootNode,
    isComplete: stack.length === 0,
    advance: function advance(deadline) {
      while (stack.length && getCurrentTime$1() < deadline) {
        var current = stack.pop();
        var childNodeDescription = describeSerializedNode(current.node, current.options);
        if (!childNodeDescription) {
          continue;
        }
        var serializedChildNode = assignSerializedNodeId(current.node, childNodeDescription.serializedNode, current.options);
        current.parentSerializedNode.childNodes.push(serializedChildNode);
        if (childNodeDescription.shouldSerializeChildren) {
          pushChildNodes(current.node, serializedChildNode, childNodeDescription.childNodesOptions);
        }
      }
      this.isComplete = stack.length === 0;
      return this.isComplete;
    }
  };
  function pushChildNodes(parentNode, parentSerializedNode, childNodesOptions) {
    var childNodes = [];
    forEachChildNodes(parentNode, function(childNode) {
      childNodes.push(childNode);
    });
    for (var i = childNodes.length - 1; i >= 0; i--) {
      stack.push({
        node: childNodes[i],
        options: childNodesOptions,
        parentSerializedNode
      });
    }
  }
}
function describeSerializedNode(node, options) {
  switch (node.nodeType) {
    case node.DOCUMENT_NODE:
      return describeDocumentNode(node, options);
    case node.DOCUMENT_FRAGMENT_NODE:
      return describeDocumentFragmentNode(node, options);
    case node.DOCUMENT_TYPE_NODE:
      return {
        serializedNode: serializeDocumentTypeNode(node),
        shouldSerializeChildren: false
      };
    case node.ELEMENT_NODE:
      return describeElementNode(node, options);
    case node.TEXT_NODE: {
      var serializedTextNode = serializeTextNode(node, options);
      return serializedTextNode ? {
        serializedNode: serializedTextNode,
        shouldSerializeChildren: false
      } : null;
    }
    case node.CDATA_SECTION_NODE: {
      var serializedCDataNode = serializeCDataNode();
      return serializedCDataNode ? {
        serializedNode: serializedCDataNode,
        shouldSerializeChildren: false
      } : null;
    }
  }
}
function describeDocumentNode(document2, options) {
  return {
    serializedNode: {
      type: NodeType.Document,
      childNodes: [],
      adoptedStyleSheets: serializeStyleSheets(document2.adoptedStyleSheets)
    },
    shouldSerializeChildren: true,
    childNodesOptions: options
  };
}
function serializeDocumentTypeNode(documentType) {
  return {
    type: NodeType.DocumentType,
    name: documentType.name,
    publicId: documentType.publicId,
    systemId: documentType.systemId
  };
}
function describeDocumentFragmentNode(element, options) {
  var isShadowRoot = isNodeShadowRoot(element);
  if (isShadowRoot) {
    options.serializationContext.shadowRootsController.addShadowRoot(element);
  }
  return {
    serializedNode: {
      type: NodeType.DocumentFragment,
      childNodes: [],
      isShadowRoot,
      adoptedStyleSheets: isShadowRoot ? serializeStyleSheets(element.adoptedStyleSheets) : void 0
    },
    shouldSerializeChildren: true,
    childNodesOptions: options
  };
}
function describeElementNode(element, options) {
  var tagName = getValidTagName(element.tagName);
  var isSVG = isSVGElement(element) || void 0;
  var nodePrivacyLevel = reducePrivacyLevel(getNodeSelfPrivacyLevel(element), options.parentNodePrivacyLevel);
  if (nodePrivacyLevel === NodePrivacyLevel.HIDDEN) {
    var placeholderSize = getHiddenElementPlaceholderSize(element);
    var attributes = _defineProperty$1({}, PRIVACY_ATTR_NAME, PRIVACY_ATTR_VALUE_HIDDEN);
    if (placeholderSize.width) {
      attributes.rr_width = placeholderSize.width;
    }
    if (placeholderSize.height) {
      attributes.rr_height = placeholderSize.height;
    }
    return {
      serializedNode: {
        type: NodeType.Element,
        tagName,
        attributes,
        childNodes: [],
        isSVG
      },
      shouldSerializeChildren: false
    };
  }
  if (nodePrivacyLevel === NodePrivacyLevel.IGNORE) {
    return null;
  }
  var attributes = getAttributesForPrivacyLevel(element, nodePrivacyLevel, options);
  var shouldSerializeChildren = false;
  var childNodesSerializationOptions;
  if (hasChildNodes(element) && tagName !== "style") {
    var childNodesSerializationOptions;
    if (options.parentNodePrivacyLevel === nodePrivacyLevel && options.ignoreWhiteSpace === (tagName === "head")) {
      childNodesSerializationOptions = options;
    } else {
      childNodesSerializationOptions = assign({}, options, {
        parentNodePrivacyLevel: nodePrivacyLevel,
        ignoreWhiteSpace: tagName === "head"
      });
    }
    shouldSerializeChildren = true;
  }
  return {
    serializedNode: {
      type: NodeType.Element,
      tagName,
      attributes,
      childNodes: [],
      isSVG
    },
    shouldSerializeChildren,
    childNodesOptions: childNodesSerializationOptions
  };
}
function serializeTextNode(textNode, options) {
  var textContent = getTextContent(options.configuration, textNode, options.ignoreWhiteSpace || false, options.parentNodePrivacyLevel);
  if (textContent === void 0) {
    return;
  }
  return {
    type: NodeType.Text,
    textContent
    // isStyle: parentTagName === 'STYLE' ? true : undefined
  };
}
function serializeCDataNode() {
  return {
    type: NodeType.CDATA,
    textContent: ""
  };
}
function serializeChildNodes(node, options) {
  var result = [];
  forEachChildNodes(node, function(childNode) {
    var serializedChildNode = serializeNodeWithId(childNode, options);
    if (serializedChildNode) {
      result.push(serializedChildNode);
    }
  });
  return result;
}
function assignSerializedNodeId(node, serializedNode, options) {
  var id = getSerializedNodeId(node) || generateNextId();
  var serializedNodeWithId = serializedNode;
  serializedNodeWithId.id = id;
  setSerializedNodeId(node, id);
  if (options.serializedNodeIds) {
    options.serializedNodeIds.add(id);
  }
  return serializedNodeWithId;
}
function getCurrentTime$1() {
  if (typeof performance !== "undefined" && performance.now) {
    return performance.now();
  }
  return Date.now();
}
function serializeAttribute(element, nodePrivacyLevel, attributeName, configuration) {
  if (nodePrivacyLevel === NodePrivacyLevel.HIDDEN) {
    return null;
  }
  var attributeValue = element.getAttribute(attributeName);
  if (nodePrivacyLevel === NodePrivacyLevel.MASK && attributeName !== PRIVACY_ATTR_NAME && !STABLE_ATTRIBUTES.includes(attributeName) && attributeName !== configuration.actionNameAttribute) {
    var tagName = element.tagName;
    switch (attributeName) {
      // Mask Attribute text content
      case "title":
      case "alt":
      case "placeholder":
        return CENSORED_STRING_MARK;
    }
    if (tagName === "IMG" || tagName === "SOURCE") {
      if (attributeName === "src" || attributeName === "srcset") {
        return CENSORED_IMG_MARK;
      } else if (attributeName === "onerror") {
        return null;
      }
    }
    if (tagName === "A" && attributeName === "href") {
      return CENSORED_STRING_MARK;
    }
    if (attributeValue && startsWith(attributeName, "data-")) {
      return CENSORED_STRING_MARK;
    }
    if (tagName === "IFRAME" && attributeName === "srcdoc") {
      return CENSORED_STRING_MARK;
    }
  }
  if (!attributeValue || typeof attributeValue !== "string") {
    return attributeValue;
  }
  if (isLongDataUrl(attributeValue)) {
    return sanitizeDataUrl(attributeValue);
  }
  return attributeValue;
}
var _nextId = 1;
function generateNextId() {
  return _nextId++;
}
var TAG_NAME_REGEX = /[^a-z1-6-_]/;
function getValidTagName(tagName) {
  var processedTagName = (tagName + "").toLowerCase().trim();
  if (TAG_NAME_REGEX.test(processedTagName)) {
    return "div";
  }
  return processedTagName;
}
function transformAttribute(doc, tagName, name, value) {
  if (!value) return value;
  if (name === "src" || name === "href" && !(tagName === "use" && value[0] === "#")) {
    return absoluteToDoc(doc, value);
  } else if (name === "xlink:href" && value[0] !== "#") {
    return absoluteToDoc(doc, value);
  } else if (name === "background" && value && (tagName === "table" || tagName === "td" || tagName === "th")) {
    return absoluteToDoc(doc, value);
  } else if (name === "srcset") {
    return getAbsoluteSrcsetString(doc, value);
  } else if (name === "style") {
    return switchToAbsoluteUrl(value, getHref());
  } else if (tagName === "object" && name === "data") {
    return absoluteToDoc(doc, value);
  } else {
    return value;
  }
}
function getAttributesForPrivacyLevel(element, nodePrivacyLevel, options) {
  if (nodePrivacyLevel === NodePrivacyLevel.HIDDEN) {
    return {};
  }
  var safeAttrs = {};
  var tagName = getValidTagName(element.tagName);
  var doc = element.ownerDocument;
  for (var i = 0; i < element.attributes.length; i += 1) {
    var attribute = element.attributes.item(i);
    var attributeName = attribute.name;
    var attributeValue = serializeAttribute(element, nodePrivacyLevel, attributeName, options.configuration);
    if (attributeValue !== null) {
      safeAttrs[attributeName] = transformAttribute(doc, tagName, attributeName, attributeValue);
    }
  }
  if (element.value && (tagName === "textarea" || tagName === "select" || tagName === "option" || tagName === "input")) {
    var formValue = getElementInputValue(options.configuration, element, nodePrivacyLevel);
    if (formValue !== void 0) {
      safeAttrs.value = formValue;
    }
  }
  if (tagName === "option" && nodePrivacyLevel === NodePrivacyLevel.ALLOW) {
    var optionElement = element;
    if (optionElement.selected) {
      safeAttrs.selected = optionElement.selected;
    }
  }
  if (tagName === "link") {
    var stylesheet = getStyleSheetByHref(options.serializationContext, doc, element.href);
    var cssText = getCssRulesString(stylesheet);
    if (cssText && stylesheet) {
      safeAttrs._cssText = cssText;
    }
  }
  if (tagName === "style" && element.sheet) {
    var cssText = getCssRulesString(element.sheet);
    if (cssText) {
      safeAttrs._cssText = cssText;
    }
  }
  var inputElement = element;
  if (tagName === "input" && (inputElement.type === "radio" || inputElement.type === "checkbox")) {
    if (nodePrivacyLevel === NodePrivacyLevel.ALLOW) {
      safeAttrs.checked = !!inputElement.checked;
    } else if (shouldMaskNode(options.configuration, inputElement, nodePrivacyLevel)) {
      delete safeAttrs.checked;
    }
  }
  if (tagName === "audio" || tagName === "video") {
    var mediaElement = element;
    safeAttrs.rr_mediaState = mediaElement.paused ? "paused" : "played";
  }
  var scrollTop;
  var scrollLeft;
  var serializationContext = options.serializationContext;
  switch (serializationContext.status) {
    case SerializationContextStatus.INITIAL_FULL_SNAPSHOT:
      scrollTop = Math.round(element.scrollTop);
      scrollLeft = Math.round(element.scrollLeft);
      if (scrollTop || scrollLeft) {
        serializationContext.elementsScrollPositions.set(element, {
          scrollTop,
          scrollLeft
        });
      }
      break;
    case SerializationContextStatus.SUBSEQUENT_FULL_SNAPSHOT:
      if (serializationContext.elementsScrollPositions.has(element)) {
        var scroll = serializationContext.elementsScrollPositions.get(element);
        scrollTop = scroll.scrollTop;
        scrollLeft = scroll.scrollLeft;
      }
      break;
  }
  if (scrollLeft) {
    safeAttrs.rr_scrollLeft = scrollLeft;
  }
  if (scrollTop) {
    safeAttrs.rr_scrollTop = scrollTop;
  }
  return safeAttrs;
}
function getStyleSheetByHref(serializationContext, doc, href) {
  if (!href) {
    return void 0;
  }
  var styleSheetByHref = serializationContext.styleSheetByHref;
  if (!styleSheetByHref) {
    styleSheetByHref = /* @__PURE__ */ new Map();
    for (var i = 0; i < doc.styleSheets.length; i += 1) {
      var styleSheet = doc.styleSheets[i];
      if (styleSheet.href) {
        styleSheetByHref.set(styleSheet.href, styleSheet);
      }
    }
    serializationContext.styleSheetByHref = styleSheetByHref;
  }
  return styleSheetByHref.get(href);
}
function isTouchEvent(event) {
  return Boolean(event.changedTouches);
}
function forEach(list, callback) {
  Array.prototype.forEach.call(list, callback);
}
function assembleIncrementalSnapshot(source, data) {
  return {
    data: assign({
      source
    }, data),
    type: RecordType.IncrementalSnapshot,
    timestamp: timeStampNow()
  };
}
function getPathToNestedCSSRule(rule) {
  var path = [];
  var currentRule = rule;
  while (currentRule.parentRule) {
    var rules = Array.from(currentRule.parentRule.cssRules);
    var index = rules.indexOf(currentRule);
    path.unshift(index);
    currentRule = currentRule.parentRule;
  }
  if (!currentRule.parentStyleSheet) {
    return;
  }
  var rules = Array.from(currentRule.parentStyleSheet.cssRules);
  var index = rules.indexOf(currentRule);
  path.unshift(index);
  return path;
}
var MUTATION_PROCESS_MAX_DELAY = 120;
var MUTATION_PROCESS_MIN_DELAY = 48;
function createMutationBatch(processMutationBatch) {
  var cancelScheduledFlush = noop;
  var pendingMutations = [];
  function flush() {
    cancelScheduledFlush();
    processMutationBatch(pendingMutations);
    pendingMutations = [];
  }
  var _throttled = throttle(flush, MUTATION_PROCESS_MIN_DELAY, {
    leading: false
  });
  var throttledFlush = _throttled.throttled;
  var cancelThrottle = _throttled.cancel;
  return {
    addMutations: function addMutations(mutations) {
      if (pendingMutations.length === 0) {
        cancelScheduledFlush = requestIdleCallback(throttledFlush, {
          timeout: MUTATION_PROCESS_MAX_DELAY
        });
      }
      Array.prototype.push.apply(pendingMutations, mutations);
    },
    flush,
    reset: function reset() {
      cancelScheduledFlush();
      cancelThrottle();
      pendingMutations = [];
    },
    stop: function stop() {
      cancelScheduledFlush();
      cancelThrottle();
    }
  };
}
var MUTATION_SERIALIZATION_SLICE_MS = 4;
var MUTATION_SERIALIZATION_EMIT_DELAY_MS = 16;
function startMutationObserver(mutationCallback, configuration, shadowRootsController, target, mutationPerfCb) {
  var MutationObserver = getMutationObserverConstructor();
  if (!MutationObserver) {
    return {
      stop: noop,
      flush: noop,
      reset: noop
    };
  }
  var mutationTasksController = createMutationTasksController(mutationCallback, configuration, shadowRootsController);
  var mutationBatch = createMutationBatch(function(mutations) {
    var processStart = getCurrentTime();
    processMutations(mutations.concat(observer2.takeRecords()), mutationCallback, configuration, shadowRootsController, mutationTasksController);
    if (mutationPerfCb) {
      mutationPerfCb({
        processMutationsCount: 1,
        processMutationsDuration: getCurrentTime() - processStart
      });
    }
  });
  var observer2 = new MutationObserver(monitor(mutationBatch.addMutations));
  try {
    observer2.observe(target, {
      attributeOldValue: true,
      attributes: true,
      characterData: true,
      characterDataOldValue: true,
      childList: true,
      subtree: true
    });
  } catch (err) {
  }
  return {
    stop: function stop() {
      observer2.disconnect();
      mutationBatch.stop();
      mutationTasksController.stop();
    },
    flush: function flush() {
      mutationBatch.flush();
      mutationTasksController.flush();
    },
    reset: function reset() {
      if (mutationBatch.reset) {
        mutationBatch.reset();
      }
      mutationTasksController.reset();
    }
  };
}
function processMutations(mutations, mutationCallback, configuration, shadowRootsController, mutationTasksController) {
  var nodePrivacyLevelCache = /* @__PURE__ */ new Map();
  var pendingRootTasksToRefresh = /* @__PURE__ */ new Set();
  var childListMutations = [];
  var characterDataMutations = [];
  var attributeMutations = [];
  for (var _i = 0, mutations_1 = mutations; _i < mutations_1.length; _i++) {
    var mutation = mutations_1[_i];
    if (mutation.type === "childList") {
      mutation.removedNodes.forEach(function(removedNode) {
        traverseRemovedShadowDom(removedNode, shadowRootsController.removeShadowRoot);
      });
    }
    var target = mutation.target;
    var pendingRootTask = mutationTasksController.findPendingRootTask(target);
    if (!target.isConnected || !nodeAndAncestorsHaveSerializedNode(target) && !pendingRootTask || getNodePrivacyLevel(target, configuration.defaultPrivacyLevel, nodePrivacyLevelCache) === NodePrivacyLevel.HIDDEN) {
      continue;
    }
    switch (mutation.type) {
      case "childList":
        childListMutations.push(mutation);
        break;
      case "characterData":
        characterDataMutations.push(mutation);
        break;
      case "attributes":
        attributeMutations.push(mutation);
        break;
    }
  }
  var _processChildListMutations = processChildListMutations(childListMutations, configuration, shadowRootsController, nodePrivacyLevelCache, mutationTasksController, pendingRootTasksToRefresh);
  var removes = _processChildListMutations.removes;
  var serializedNodeIds2 = _processChildListMutations.serializedNodeIds;
  function hasBeenSerialized(node) {
    return hasSerializedNode(node) && serializedNodeIds2.has(getSerializedNodeId(node));
  }
  var pendingCharacterDataMutations = [];
  for (var _a = 0, characterDataMutations_1 = characterDataMutations; _a < characterDataMutations_1.length; _a++) {
    var characterDataMutation = characterDataMutations_1[_a];
    var pendingCharacterDataRootTask = mutationTasksController.findPendingRootTask(characterDataMutation.target);
    if (pendingCharacterDataRootTask) {
      pendingRootTasksToRefresh.add(pendingCharacterDataRootTask);
      continue;
    }
    if (!hasBeenSerialized(characterDataMutation.target)) {
      pendingCharacterDataMutations.push(characterDataMutation);
    }
  }
  var texts = processCharacterDataMutations(pendingCharacterDataMutations, configuration, nodePrivacyLevelCache);
  var pendingAttributeMutations = [];
  for (var _b = 0, attributeMutations_1 = attributeMutations; _b < attributeMutations_1.length; _b++) {
    var attributeMutation = attributeMutations_1[_b];
    var pendingAttributeRootTask = mutationTasksController.findPendingRootTask(attributeMutation.target);
    if (pendingAttributeRootTask) {
      pendingRootTasksToRefresh.add(pendingAttributeRootTask);
      continue;
    }
    if (!hasBeenSerialized(attributeMutation.target)) {
      pendingAttributeMutations.push(attributeMutation);
    }
  }
  var attributes = processAttributesMutations(pendingAttributeMutations, configuration, nodePrivacyLevelCache);
  pendingRootTasksToRefresh.forEach(function(task) {
    mutationTasksController.refreshPendingRootTask(task);
  });
  if (!texts.length && !attributes.length && !removes.length) {
    return;
  }
  mutationCallback({
    adds: [],
    removes,
    texts,
    attributes
  });
}
function processChildListMutations(mutations, configuration, shadowRootsController, nodePrivacyLevelCache, mutationTasksController, pendingRootTasksToRefresh) {
  var addedAndMovedNodes = /* @__PURE__ */ new Set();
  var removedNodes = /* @__PURE__ */ new Map();
  for (var _i = 0, mutations_1 = mutations; _i < mutations_1.length; _i++) {
    var mutation = mutations_1[_i];
    mutation.addedNodes.forEach(function(node2) {
      addedAndMovedNodes.add(node2);
    });
    mutation.removedNodes.forEach(function(node2) {
      if (!addedAndMovedNodes.has(node2)) {
        removedNodes.set(node2, mutation.target);
      }
      addedAndMovedNodes["delete"](node2);
    });
  }
  var sortedAddedAndMovedNodes = Array.from(addedAndMovedNodes);
  sortAddedAndMovedNodes(sortedAddedAndMovedNodes);
  var serializedNodeIds2 = /* @__PURE__ */ new Set();
  for (var _a = 0, sortedAddedAndMovedNodes_1 = sortedAddedAndMovedNodes; _a < sortedAddedAndMovedNodes_1.length; _a++) {
    var node = sortedAddedAndMovedNodes_1[_a];
    var pendingRootTask = mutationTasksController.findPendingRootTask(node);
    if (pendingRootTask) {
      pendingRootTasksToRefresh.add(pendingRootTask);
      continue;
    }
    if (hasBeenSerialized(node)) {
      continue;
    }
    var parentNodePrivacyLevel = getNodePrivacyLevel(node.parentNode, configuration.defaultPrivacyLevel, nodePrivacyLevelCache);
    if (parentNodePrivacyLevel === NodePrivacyLevel.HIDDEN || parentNodePrivacyLevel === NodePrivacyLevel.IGNORE) {
      continue;
    }
    mutationTasksController.addPendingRootTask(node, {
      serializedNodeIds: serializedNodeIds2,
      parentNodePrivacyLevel,
      serializationContext: {
        status: SerializationContextStatus.MUTATION,
        shadowRootsController
      },
      configuration
    });
  }
  var removedNodeMutations = [];
  removedNodes.forEach(function(parent, node2) {
    var pendingRootTask2 = mutationTasksController.findPendingRootTask(node2);
    if (pendingRootTask2) {
      pendingRootTasksToRefresh["delete"](pendingRootTask2);
      mutationTasksController.handlePendingRootRemoval(pendingRootTask2, node2);
      return;
    }
    if (hasSerializedNode(node2)) {
      removedNodeMutations.push({
        parentId: getSerializedNodeId(parent),
        id: getSerializedNodeId(node2)
      });
    }
  });
  return {
    removes: removedNodeMutations,
    serializedNodeIds: serializedNodeIds2,
    hasBeenSerialized
  };
  function hasBeenSerialized(node2) {
    return hasSerializedNode(node2) && serializedNodeIds2.has(getSerializedNodeId(node2));
  }
}
function processCharacterDataMutations(mutations, configuration, nodePrivacyLevelCache) {
  var textMutations = [];
  var handledNodes = /* @__PURE__ */ new Set();
  var filteredMutations = mutations.filter(function(mutation2) {
    if (handledNodes.has(mutation2.target)) {
      return false;
    }
    handledNodes.add(mutation2.target);
    return true;
  });
  for (var _i = 0, filteredMutations_1 = filteredMutations; _i < filteredMutations_1.length; _i++) {
    var mutation = filteredMutations_1[_i];
    var value = mutation.target.textContent;
    if (value === mutation.oldValue) {
      continue;
    }
    var parentNodePrivacyLevel = getNodePrivacyLevel(getParentNode(mutation.target), configuration.defaultPrivacyLevel, nodePrivacyLevelCache);
    if (parentNodePrivacyLevel === NodePrivacyLevel.HIDDEN || parentNodePrivacyLevel === NodePrivacyLevel.IGNORE) {
      continue;
    }
    textMutations.push({
      id: getSerializedNodeId(mutation.target),
      value: isNullUndefinedDefaultValue(getTextContent(configuration, mutation.target, false, parentNodePrivacyLevel))
    });
  }
  return textMutations;
}
function processAttributesMutations(mutations, configuration, nodePrivacyLevelCache) {
  var attributeMutations = [];
  var handledElements = /* @__PURE__ */ new Map();
  var filteredMutations = mutations.filter(function(mutation2) {
    var handledAttributes = handledElements.get(mutation2.target);
    if (handledAttributes && handledAttributes.has(mutation2.attributeName)) {
      return false;
    }
    if (!handledAttributes) {
      handledElements.set(mutation2.target, /* @__PURE__ */ new Set([mutation2.attributeName]));
    } else {
      handledAttributes.add(mutation2.attributeName);
    }
    return true;
  });
  var emittedMutations = /* @__PURE__ */ new Map();
  for (var _i = 0, filteredMutations_2 = filteredMutations; _i < filteredMutations_2.length; _i++) {
    var mutation = filteredMutations_2[_i];
    var uncensoredValue = mutation.target.getAttribute(mutation.attributeName);
    if (uncensoredValue === mutation.oldValue) {
      continue;
    }
    var privacyLevel = getNodePrivacyLevel(mutation.target, configuration.defaultPrivacyLevel, nodePrivacyLevelCache);
    var attributeValue = serializeAttribute(mutation.target, privacyLevel, mutation.attributeName, configuration);
    var transformedValue;
    if (mutation.attributeName === "value") {
      var inputValue = getElementInputValue(configuration, mutation.target, privacyLevel);
      if (inputValue === void 0) {
        continue;
      }
      transformedValue = inputValue;
    } else if (typeof attributeValue === "string") {
      transformedValue = attributeValue;
    } else {
      transformedValue = null;
    }
    var emittedMutation = emittedMutations.get(mutation.target);
    if (!emittedMutation) {
      emittedMutation = {
        id: getSerializedNodeId(mutation.target),
        attributes: {}
      };
      attributeMutations.push(emittedMutation);
      emittedMutations.set(mutation.target, emittedMutation);
    }
    emittedMutation.attributes[mutation.attributeName] = transformedValue;
  }
  return attributeMutations;
}
function sortAddedAndMovedNodes(nodes) {
  nodes.sort(function(a, b) {
    var position = a.compareDocumentPosition(b);
    if (position & Node.DOCUMENT_POSITION_CONTAINED_BY) {
      return -1;
    } else if (position & Node.DOCUMENT_POSITION_CONTAINS) {
      return 1;
    } else if (position & Node.DOCUMENT_POSITION_FOLLOWING) {
      return 1;
    } else if (position & Node.DOCUMENT_POSITION_PRECEDING) {
      return -1;
    }
    return 0;
  });
}
function createMutationTasksController(mutationCallback, configuration, shadowRootsController) {
  var generation = 0;
  var nextTaskSequence = 0;
  var nextEmitSequence = 0;
  var pendingRootTasks = [];
  var pendingRootTaskByRootNode = /* @__PURE__ */ new WeakMap();
  var pendingRootTaskBySequence = /* @__PURE__ */ new Map();
  var scheduledFlush = void 0;
  var scheduledEmit = void 0;
  var stopped = false;
  var completedRootTasks = [];
  return {
    addPendingRootTask,
    findPendingRootTask,
    refreshPendingRootTask,
    handlePendingRootRemoval,
    flush: function flush() {
      processPendingRootTasks(true);
    },
    reset: function reset() {
      generation += 1;
      nextTaskSequence = 0;
      nextEmitSequence = 0;
      clearScheduledFlush();
      clearScheduledEmit();
      pendingRootTasks = [];
      completedRootTasks = [];
      pendingRootTaskByRootNode = /* @__PURE__ */ new WeakMap();
      pendingRootTaskBySequence = /* @__PURE__ */ new Map();
    },
    stop: function stop() {
      stopped = true;
      clearScheduledFlush();
      clearScheduledEmit();
      pendingRootTasks = [];
      completedRootTasks = [];
      pendingRootTaskByRootNode = /* @__PURE__ */ new WeakMap();
      pendingRootTaskBySequence = /* @__PURE__ */ new Map();
    }
  };
  function addPendingRootTask(node, serializationOptions) {
    if (findPendingRootTask(getParentNode(node))) {
      return;
    }
    var serializerTask = createMutationSerializerTask(node, serializationOptions);
    if (!serializerTask) {
      return;
    }
    var task = {
      generation,
      sequence: nextTaskSequence++,
      rootNode: node,
      parentId: getSerializedNodeId(getParentNode(node)),
      nextId: getNextSibling(node),
      serializerTask
    };
    pendingRootTasks.push(task);
    pendingRootTaskByRootNode.set(node, task);
    pendingRootTaskBySequence.set(task.sequence, task);
    schedulePendingRootTasks();
  }
  function findPendingRootTask(node) {
    var current = node;
    while (current) {
      var task = pendingRootTaskByRootNode.get(current);
      if (task && task.generation === generation) {
        return task;
      }
      current = getParentNode(current);
    }
  }
  function refreshPendingRootTask(task) {
    if (!task || task.generation !== generation) {
      return;
    }
    if (!task.rootNode.isConnected) {
      cancelPendingRootTask(task);
      return;
    }
    var parentNode = getParentNode(task.rootNode);
    var parentPendingRootTask = findPendingRootTask(parentNode);
    if (parentPendingRootTask && parentPendingRootTask !== task) {
      cancelPendingRootTask(task);
      return;
    }
    var parentNodePrivacyLevel = getNodePrivacyLevel(parentNode, configuration.defaultPrivacyLevel);
    if (parentNodePrivacyLevel === NodePrivacyLevel.HIDDEN || parentNodePrivacyLevel === NodePrivacyLevel.IGNORE) {
      cancelPendingRootTask(task);
      return;
    }
    var serializerTask = createMutationSerializerTask(task.rootNode, {
      parentNodePrivacyLevel,
      serializationContext: {
        status: SerializationContextStatus.MUTATION,
        shadowRootsController
      },
      configuration
    });
    if (!serializerTask) {
      cancelPendingRootTask(task);
      return;
    }
    removeCompletedRootTask(task);
    task.parentId = getSerializedNodeId(parentNode);
    task.nextId = getNextSibling(task.rootNode);
    task.serializerTask = serializerTask;
    task.isCompleted = false;
    schedulePendingRootTasks();
  }
  function handlePendingRootRemoval(task, node) {
    if (!task || task.generation !== generation) {
      return;
    }
    if (node === task.rootNode) {
      if (task.rootNode.isConnected) {
        refreshPendingRootTask(task);
        return;
      }
      cancelPendingRootTask(task);
      return;
    }
    if (!task.rootNode.isConnected) {
      cancelPendingRootTask(task);
      return;
    }
    refreshPendingRootTask(task);
  }
  function cancelPendingRootTask(task) {
    pendingRootTaskByRootNode["delete"](task.rootNode);
    pendingRootTaskBySequence["delete"](task.sequence);
    removeCompletedRootTask(task);
    pendingRootTasks = pendingRootTasks.filter(function(pendingRootTask) {
      return pendingRootTask !== task;
    });
    advanceEmitSequencePastGaps();
  }
  function schedulePendingRootTasks() {
    if (stopped || scheduledFlush || !pendingRootTasks.length) {
      return;
    }
    scheduledFlush = setTimeout(function() {
      scheduledFlush = void 0;
      processPendingRootTasks(false);
    }, 0);
  }
  function processPendingRootTasks(forceDrain) {
    clearScheduledFlush();
    if (stopped) {
      return;
    }
    if (!pendingRootTasks.length) {
      if (forceDrain && completedRootTasks.length) {
        emitCompletedRootTasks();
      }
      return;
    }
    var deadline = forceDrain ? Infinity : getCurrentTime() + MUTATION_SERIALIZATION_SLICE_MS;
    while (pendingRootTasks.length) {
      var task = pendingRootTasks.shift();
      if (task.generation !== generation) {
        continue;
      }
      var completed = task.serializerTask.advance(deadline);
      if (task.generation !== generation) {
        continue;
      }
      if (completed) {
        task.isCompleted = true;
        completedRootTasks.push(task);
      } else {
        pendingRootTasks.push(task);
        if (!forceDrain && getCurrentTime() >= deadline) {
          break;
        }
      }
    }
    if (completedRootTasks.length) {
      if (forceDrain || !pendingRootTasks.length) {
        emitCompletedRootTasks();
      } else {
        scheduleCompletedRootTasksEmit();
      }
    }
    if (pendingRootTasks.length) {
      schedulePendingRootTasks();
    }
  }
  function clearScheduledFlush() {
    if (scheduledFlush) {
      clearTimeout(scheduledFlush);
      scheduledFlush = void 0;
    }
  }
  function scheduleCompletedRootTasksEmit() {
    if (stopped || scheduledEmit || !completedRootTasks.length) {
      return;
    }
    scheduledEmit = setTimeout(function() {
      scheduledEmit = void 0;
      emitCompletedRootTasks();
    }, MUTATION_SERIALIZATION_EMIT_DELAY_MS);
  }
  function emitCompletedRootTasks() {
    clearScheduledEmit();
    if (!completedRootTasks.length) {
      return;
    }
    var completedTasksBySequence = /* @__PURE__ */ new Map();
    completedRootTasks.forEach(function(task) {
      completedTasksBySequence.set(task.sequence, task);
    });
    var readyTasks = [];
    advanceEmitSequencePastGaps();
    while (nextEmitSequence < nextTaskSequence) {
      var nextTask = completedTasksBySequence.get(nextEmitSequence);
      if (!nextTask) {
        break;
      }
      readyTasks.push(nextTask);
      completedTasksBySequence["delete"](nextEmitSequence);
      nextEmitSequence += 1;
    }
    if (!readyTasks.length) {
      if (pendingRootTasks.length) {
        schedulePendingRootTasks();
      } else if (completedRootTasks.length) {
        scheduleCompletedRootTasksEmit();
      }
      return;
    }
    var adds = readyTasks.map(function(task) {
      pendingRootTaskByRootNode["delete"](task.rootNode);
      pendingRootTaskBySequence["delete"](task.sequence);
      return {
        nextId: task.nextId,
        parentId: task.parentId,
        node: task.serializerTask.serializedNode
      };
    });
    completedRootTasks = completedRootTasks.filter(function(task) {
      return readyTasks.indexOf(task) === -1;
    });
    mutationCallback({
      adds,
      removes: [],
      texts: [],
      attributes: []
    });
    if (completedRootTasks.length) {
      scheduleCompletedRootTasksEmit();
    }
  }
  function removeCompletedRootTask(task) {
    completedRootTasks = completedRootTasks.filter(function(completedTask) {
      return completedTask !== task;
    });
  }
  function clearScheduledEmit() {
    if (scheduledEmit) {
      clearTimeout(scheduledEmit);
      scheduledEmit = void 0;
    }
  }
  function advanceEmitSequencePastGaps() {
    while (nextEmitSequence < nextTaskSequence && !pendingRootTaskBySequence.has(nextEmitSequence)) {
      nextEmitSequence += 1;
    }
  }
  function getNextSibling(node) {
    var nextSibling = node.nextSibling;
    while (nextSibling) {
      if (hasSerializedNode(nextSibling)) {
        return getSerializedNodeId(nextSibling);
      }
      nextSibling = nextSibling.nextSibling;
    }
    return null;
  }
}
function getCurrentTime() {
  if (typeof performance !== "undefined" && performance.now) {
    return performance.now();
  }
  return Date.now();
}
function traverseRemovedShadowDom(removedNode, shadowDomRemovedCallback) {
  if (isNodeShadowHost(removedNode)) {
    shadowDomRemovedCallback(removedNode.shadowRoot);
  }
  forEachChildNodes(removedNode, function(childNode) {
    return traverseRemovedShadowDom(childNode, shadowDomRemovedCallback);
  });
}
var TOLERANCE = 25;
function isVisualViewportFactoredIn() {
  var visual = window.visualViewport;
  return Math.abs(visual.pageTop - visual.offsetTop - window.scrollY) > TOLERANCE || Math.abs(visual.pageLeft - visual.offsetLeft - window.scrollX) > TOLERANCE;
}
var convertMouseEventToLayoutCoordinates = function convertMouseEventToLayoutCoordinates2(clientX, clientY) {
  var visual = window.visualViewport;
  var normalised = {
    layoutViewportX: clientX,
    layoutViewportY: clientY,
    visualViewportX: clientX,
    visualViewportY: clientY
  };
  if (!visual) {
    return normalised;
  } else if (isVisualViewportFactoredIn()) {
    normalised.layoutViewportX = Math.round(clientX + visual.offsetLeft);
    normalised.layoutViewportY = Math.round(clientY + visual.offsetTop);
  } else {
    normalised.visualViewportX = Math.round(clientX - visual.offsetLeft);
    normalised.visualViewportY = Math.round(clientY - visual.offsetTop);
  }
  return normalised;
};
var getVisualViewport = function getVisualViewport2() {
  var visual = window.visualViewport;
  return {
    scale: visual.scale,
    offsetLeft: visual.offsetLeft,
    offsetTop: visual.offsetTop,
    pageLeft: visual.pageLeft,
    pageTop: visual.pageTop,
    height: visual.height,
    width: visual.width
  };
};
function _typeof$4(o) {
  "@babel/helpers - typeof";
  return _typeof$4 = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(o2) {
    return typeof o2;
  } : function(o2) {
    return o2 && "function" == typeof Symbol && o2.constructor === Symbol && o2 !== Symbol.prototype ? "symbol" : typeof o2;
  }, _typeof$4(o);
}
function _defineProperty(e, r, t) {
  return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: true, configurable: true, writable: true }) : e[r] = t, e;
}
function _toPropertyKey(t) {
  var i = _toPrimitive(t, "string");
  return "symbol" == _typeof$4(i) ? i : i + "";
}
function _toPrimitive(t, r) {
  if ("object" != _typeof$4(t) || !t) return t;
  var e = t[Symbol.toPrimitive];
  if (void 0 !== e) {
    var i = e.call(t, r);
    if ("object" != _typeof$4(i)) return i;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return ("string" === r ? String : Number)(t);
}
var MOUSE_MOVE_OBSERVER_THRESHOLD = 50;
var SCROLL_OBSERVER_THRESHOLD = 100;
var VISUAL_VIEWPORT_OBSERVER_THRESHOLD = 200;
var recordIds = /* @__PURE__ */ new WeakMap();
var nextId = 1;
function getRecordIdForEvent(event) {
  if (!recordIds.has(event)) {
    recordIds.set(event, nextId++);
  }
  return recordIds.get(event);
}
function initObservers(o) {
  var mutationHandler = initMutationObserver(o.mutationCb, o.configuration, o.shadowRootsController, o.mutationPerfCb);
  var mousemoveHandler = initMoveObserver(o.mousemoveCb, o.configuration);
  var mouseInteractionHandler = initMouseInteractionObserver(o.mouseInteractionCb, o.configuration);
  var scrollHandler = initScrollObserver(o.scrollCb, o.configuration, o.elementsScrollPositions);
  var viewportResizeHandler = initViewportResizeObserver(o.viewportResizeCb, o.configuration);
  var inputHandler = initInputObserver(o.inputCb, o.configuration);
  var mediaInteractionHandler = initMediaInteractionObserver(o.mediaInteractionCb, o.configuration);
  var styleSheetObserver = initStyleSheetObserver(o.styleSheetCb, o.configuration);
  var focusHandler = initFocusObserver(o.focusCb, o.configuration);
  var visualViewportResizeHandler = initVisualViewportResizeObserver(o.visualViewportResizeCb, o.configuration);
  var frustrationHandler = initFrustrationObserver(o.lifeCycle, o.frustrationCb, o.configuration);
  return {
    flush: function flush() {
      mutationHandler.flush();
    },
    reset: function reset() {
      if (mutationHandler.reset) {
        mutationHandler.reset();
      }
    },
    stop: function stop() {
      mutationHandler.stop();
      mousemoveHandler();
      mouseInteractionHandler();
      scrollHandler();
      viewportResizeHandler();
      inputHandler();
      mediaInteractionHandler();
      styleSheetObserver();
      focusHandler();
      visualViewportResizeHandler();
      frustrationHandler();
    }
  };
}
function initMutationObserver(cb, configuration, shadowRootsController, mutationPerfCb) {
  return startMutationObserver(cb, configuration, shadowRootsController, document, mutationPerfCb);
}
function initMoveObserver(cb, configuration) {
  var _updatePosition = throttle(function(event) {
    var target = getEventTarget(event);
    if (hasSerializedNode(target)) {
      var coordinates = tryToComputeCoordinates(event);
      if (!coordinates) {
        return;
      }
      var position = {
        id: getSerializedNodeId(target),
        timeOffset: 0,
        x: coordinates.x,
        y: coordinates.y
      };
      cb([position], isTouchEvent(event) ? IncrementalSource.TouchMove : IncrementalSource.MouseMove);
    }
  }, MOUSE_MOVE_OBSERVER_THRESHOLD, {
    trailing: false
  });
  var cancelThrottle = _updatePosition.cancel;
  var updatePosition = _updatePosition.throttled;
  var _listener = addEventListeners(document, [DOM_EVENT.MOUSE_MOVE, DOM_EVENT.TOUCH_MOVE], updatePosition, {
    capture: true,
    passive: true
  });
  var removeListener = _listener.stop;
  return function() {
    removeListener();
    cancelThrottle();
  };
}
var eventTypeToMouseInteraction = _defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty({}, DOM_EVENT.POINTER_UP, MouseInteractionType.MouseUp), DOM_EVENT.MOUSE_DOWN, MouseInteractionType.MouseDown), DOM_EVENT.CLICK, MouseInteractionType.Click), DOM_EVENT.CONTEXT_MENU, MouseInteractionType.ContextMenu), DOM_EVENT.DBL_CLICK, MouseInteractionType.DblClick), DOM_EVENT.FOCUS, MouseInteractionType.Focus), DOM_EVENT.BLUR, MouseInteractionType.Blur), DOM_EVENT.TOUCH_START, MouseInteractionType.TouchStart), DOM_EVENT.TOUCH_END, MouseInteractionType.TouchEnd);
function initMouseInteractionObserver(cb, configuration) {
  var handler = function handler2(event) {
    var target = getEventTarget(event);
    if (getNodePrivacyLevel(target, configuration.defaultPrivacyLevel) === NodePrivacyLevel.HIDDEN || !hasSerializedNode(target)) {
      return;
    }
    var id = getSerializedNodeId(target);
    var type = eventTypeToMouseInteraction[event.type];
    var interaction;
    if (type !== MouseInteractionType.Blur && type !== MouseInteractionType.Focus) {
      var coordinates = tryToComputeCoordinates(event);
      if (!coordinates) {
        return;
      }
      interaction = {
        id,
        type,
        x: coordinates.x,
        y: coordinates.y
      };
    } else {
      interaction = {
        id,
        type
      };
    }
    var record2 = assign({
      id: getRecordIdForEvent(event)
    }, assembleIncrementalSnapshot(IncrementalSource.MouseInteraction, interaction));
    cb(record2);
  };
  return addEventListeners(document, Object.keys(eventTypeToMouseInteraction), handler, {
    capture: true,
    passive: true
  }).stop;
}
function tryToComputeCoordinates(event) {
  var _event = isTouchEvent(event) ? event.changedTouches[0] : event;
  var x = _event.clientX;
  var y = _event.clientY;
  if (window.visualViewport) {
    var _convertMouseEventToLayoutCoordinates = convertMouseEventToLayoutCoordinates(x, y);
    x = _convertMouseEventToLayoutCoordinates.visualViewportX;
    y = _convertMouseEventToLayoutCoordinates.visualViewportY;
  }
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return void 0;
  }
  return {
    x,
    y
  };
}
function initScrollObserver(cb, configuration, elementsScrollPositions) {
  var _updatePosition = throttle(function(event) {
    var target = getEventTarget(event);
    if (!target || getNodePrivacyLevel(target, configuration.defaultPrivacyLevel) === NodePrivacyLevel.HIDDEN || !hasSerializedNode(target)) {
      return;
    }
    var id = getSerializedNodeId(target);
    var scrollPositions = target === document ? {
      scrollTop: getScrollY(),
      scrollLeft: getScrollX()
    } : {
      scrollTop: Math.round(target.scrollTop),
      scrollLeft: Math.round(target.scrollLeft)
    };
    elementsScrollPositions.set(target, scrollPositions);
    cb({
      id,
      x: scrollPositions.scrollLeft,
      y: scrollPositions.scrollTop
    });
  }, SCROLL_OBSERVER_THRESHOLD);
  var cancelThrottle = _updatePosition.cancel;
  var updatePosition = _updatePosition.throttled;
  var _listener = addEventListener(document, DOM_EVENT.SCROLL, updatePosition, {
    capture: true,
    passive: true
  });
  var removeListener = _listener.stop;
  return function() {
    removeListener();
    cancelThrottle();
  };
}
function initViewportResizeObserver(cb, configuration) {
  return initViewportObservable().subscribe(cb).unsubscribe;
}
function initInputObserver(cb, configuration, target) {
  if (target === void 0) {
    target = document;
  }
  var lastInputStateMap = /* @__PURE__ */ new WeakMap();
  var isShadowRoot = target !== document;
  var _addEventListeners = addEventListeners(
    target,
    // The 'input' event bubbles across shadow roots, so we don't have to listen for it on shadow
    // roots since it will be handled by the event listener that we did add to the document. Only
    // the 'change' event is blocked and needs to be handled on shadow roots.
    isShadowRoot ? [DOM_EVENT.CHANGE] : [DOM_EVENT.INPUT, DOM_EVENT.CHANGE],
    function(event) {
      var target2 = getEventTarget(event);
      if (target2 instanceof HTMLInputElement || target2 instanceof HTMLTextAreaElement || target2 instanceof HTMLSelectElement) {
        onElementChange(target2);
      }
    },
    {
      capture: true,
      passive: true
    }
  );
  var stopEventListeners = _addEventListeners.stop;
  var stopPropertySetterInstrumentation;
  if (!isShadowRoot) {
    var instrumentationStoppers = [instrumentSetter(HTMLInputElement.prototype, "value", onElementChange), instrumentSetter(HTMLInputElement.prototype, "checked", onElementChange), instrumentSetter(HTMLSelectElement.prototype, "value", onElementChange), instrumentSetter(HTMLTextAreaElement.prototype, "value", onElementChange), instrumentSetter(HTMLSelectElement.prototype, "selectedIndex", onElementChange)];
    stopPropertySetterInstrumentation = function stopPropertySetterInstrumentation2() {
      instrumentationStoppers.forEach(function(stopper) {
        return stopper.stop();
      });
    };
  } else {
    stopPropertySetterInstrumentation = noop;
  }
  return function() {
    stopPropertySetterInstrumentation();
    stopEventListeners();
  };
  function onElementChange(target2) {
    var nodePrivacyLevel = getNodePrivacyLevel(target2, configuration.defaultPrivacyLevel);
    if (nodePrivacyLevel === NodePrivacyLevel.HIDDEN) {
      return;
    }
    var type = target2.type;
    var inputState;
    if (type === "radio" || type === "checkbox") {
      if (shouldMaskNode(configuration, target2, nodePrivacyLevel)) {
        return;
      }
      inputState = {
        isChecked: target2.checked
      };
    } else {
      var value = getElementInputValue(configuration, target2, nodePrivacyLevel);
      if (value === void 0) {
        return;
      }
      inputState = {
        text: value
      };
    }
    cbWithDedup(target2, inputState);
    var name = target2.name;
    if (type === "radio" && name && target2.checked) {
      forEach(document.querySelectorAll('input[type="radio"][name="' + cssEscape(name) + '"]'), function(el) {
        if (el !== target2) {
          cbWithDedup(el, {
            isChecked: false
          });
        }
      });
    }
  }
  function cbWithDedup(target2, inputState) {
    if (!hasSerializedNode(target2)) {
      return;
    }
    var lastInputState = lastInputStateMap.get(target2);
    if (!lastInputState || lastInputState.text !== inputState.text || lastInputState.isChecked !== inputState.isChecked) {
      lastInputStateMap.set(target2, inputState);
      cb(assign({
        id: getSerializedNodeId(target2)
      }, inputState));
    }
  }
}
function initStyleSheetObserver(cb, configuration) {
  function checkStyleSheetAndCallback(styleSheet, callback) {
    if (styleSheet && hasSerializedNode(styleSheet.ownerNode)) {
      callback(getSerializedNodeId(styleSheet.ownerNode));
    }
  }
  var instrumentationStoppers = [instrumentMethod(CSSStyleSheet.prototype, "insertRule", function(params) {
    var styleSheet = params.target;
    var parameters = params.parameters;
    var rule = parameters[0];
    var index = parameters[1];
    checkStyleSheetAndCallback(styleSheet, function(id) {
      return cb({
        id,
        adds: [{
          rule,
          index
        }]
      });
    });
  }), instrumentMethod(CSSStyleSheet.prototype, "deleteRule", function(params) {
    var styleSheet = params.target;
    var parameters = params.parameters;
    var index = parameters[0];
    checkStyleSheetAndCallback(styleSheet, function(id) {
      return cb({
        id,
        removes: [{
          index
        }]
      });
    });
  })];
  if (typeof CSSGroupingRule !== "undefined") {
    instrumentGroupingCSSRuleClass(CSSGroupingRule);
  } else {
    instrumentGroupingCSSRuleClass(CSSMediaRule);
    instrumentGroupingCSSRuleClass(CSSSupportsRule);
  }
  function instrumentGroupingCSSRuleClass(cls) {
    instrumentationStoppers.push(instrumentMethod(cls.prototype, "insertRule", function(params) {
      var styleSheet = params.target;
      var parameters = params.parameters;
      var rule = parameters[0];
      var index = parameters[1];
      checkStyleSheetAndCallback(styleSheet.parentStyleSheet, function(id) {
        var path = getPathToNestedCSSRule(styleSheet);
        if (path) {
          path.push(index || 0);
          cb({
            id,
            adds: [{
              rule,
              index: path
            }]
          });
        }
      });
    }), instrumentMethod(cls.prototype, "deleteRule", function(params) {
      var styleSheet = params.target;
      var parameters = params.parameters;
      var index = parameters[0];
      checkStyleSheetAndCallback(styleSheet.parentStyleSheet, function(id) {
        var path = getPathToNestedCSSRule(styleSheet);
        if (path) {
          path.push(index);
          cb({
            id,
            removes: [{
              index: path
            }]
          });
        }
      });
    }));
  }
  return function() {
    instrumentationStoppers.forEach(function(stopper) {
      stopper.stop();
    });
  };
}
function initMediaInteractionObserver(mediaInteractionCb, configuration) {
  var handler = function handler2(event) {
    var target = getEventTarget(event);
    if (!target || getNodePrivacyLevel(target, configuration.defaultPrivacyLevel) === NodePrivacyLevel.HIDDEN || !hasSerializedNode(target)) {
      return;
    }
    mediaInteractionCb({
      id: getSerializedNodeId(target),
      type: event.type === DOM_EVENT.PLAY ? MediaInteractionType.Play : MediaInteractionType.Pause
    });
  };
  return addEventListeners(document, [DOM_EVENT.PLAY, DOM_EVENT.PAUSE], handler, {
    capture: true,
    passive: true
  }).stop;
}
function initFocusObserver(focusCb, configuration) {
  return addEventListeners(window, [DOM_EVENT.FOCUS, DOM_EVENT.BLUR], function() {
    focusCb({
      has_focus: document.hasFocus()
    });
  }).stop;
}
function initVisualViewportResizeObserver(cb, configuration) {
  if (!window.visualViewport) {
    return noop;
  }
  var _updateDimension = throttle(function() {
    cb(getVisualViewport());
  }, VISUAL_VIEWPORT_OBSERVER_THRESHOLD, {
    trailing: false
  });
  var removeListener = addEventListeners(window.visualViewport, [DOM_EVENT.RESIZE, DOM_EVENT.SCROLL], _updateDimension.throttled, {
    capture: true,
    passive: true
  }).stop;
  var cancelThrottle = _updateDimension.cancel;
  return function stop() {
    removeListener();
    cancelThrottle();
  };
}
function initFrustrationObserver(lifeCycle, frustrationCb, configuration) {
  return lifeCycle.subscribe(LifeCycleEventType.RAW_RUM_EVENT_COLLECTED, function(data) {
    if (data.rawRumEvent.type === RumEventType.ACTION && data.rawRumEvent.action.type === ActionType.CLICK && data.rawRumEvent.action.frustration && data.rawRumEvent.action.frustration.type && data.rawRumEvent.action.frustration.type.length && "events" in data.domainContext && data.domainContext.events && data.domainContext.events.length) {
      frustrationCb({
        timestamp: data.rawRumEvent.date,
        type: RecordType.FrustrationRecord,
        data: {
          frustrationTypes: data.rawRumEvent.action.frustration.type,
          recordIds: data.domainContext.events.map(function(e) {
            return getRecordIdForEvent(e);
          })
        }
      });
    }
  }).unsubscribe;
}
function getEventTarget(event) {
  if (event.composed === true && isNodeShadowHost(event.target)) {
    return event.composedPath()[0];
  }
  return event.target;
}
function createElementsScrollPositions() {
  var scrollPositionsByElement = /* @__PURE__ */ new WeakMap();
  return {
    set: function set(element, scrollPositions) {
      if (element === document && !document.scrollingElement) {
        return;
      }
      scrollPositionsByElement.set(element === document ? document.scrollingElement : element, scrollPositions);
    },
    get: function get(element) {
      return scrollPositionsByElement.get(element);
    },
    has: function has(element) {
      return scrollPositionsByElement.has(element);
    }
  };
}
var initShadowRootsController = function initShadowRootsController2(configuration, data) {
  var mutationCb = data.mutationCb;
  var inputCb = data.inputCb;
  var controllerByShadowRoot = /* @__PURE__ */ new Map();
  var shadowRootsController = {
    addShadowRoot: function addShadowRoot(shadowRoot) {
      if (controllerByShadowRoot.has(shadowRoot)) {
        return;
      }
      var _startMutaionObserve = startMutationObserver(mutationCb, configuration, shadowRootsController, shadowRoot);
      var flush = _startMutaionObserve.flush;
      var stopMutationObserver = _startMutaionObserve.stop;
      var stopInputObserver = initInputObserver(inputCb, configuration, shadowRoot);
      controllerByShadowRoot.set(shadowRoot, {
        flush,
        stop: function stop() {
          stopMutationObserver();
          stopInputObserver();
        }
      });
    },
    removeShadowRoot: function removeShadowRoot(shadowRoot) {
      var entry = controllerByShadowRoot.get(shadowRoot);
      if (!entry) {
        return;
      }
      entry.stop();
      controllerByShadowRoot["delete"](shadowRoot);
    },
    stop: function stop() {
      controllerByShadowRoot.forEach(function(event) {
        event.stop();
      });
    },
    flush: function flush() {
      controllerByShadowRoot.forEach(function(event) {
        event.flush();
      });
    }
  };
  return shadowRootsController;
};
function dataUrlToBase64(dataUrl) {
  var parts = dataUrl.split(",");
  return parts.length > 1 ? parts[1] : "";
}
var BASE64_PAYLOAD_REGEXP = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
function getMimeTypeFromDataUrl(dataUrl) {
  var match = /^data:([^;,]+)/.exec(dataUrl);
  return match ? match[1] : void 0;
}
function takeBase64Sample(base64, fromStart) {
  if (typeof base64 !== "string" || !base64) {
    return void 0;
  }
  if (base64.length <= 32) {
    return base64;
  }
  return fromStart ? base64.slice(0, 32) : base64.slice(-32);
}
function getBase64Window(base64, centerIndex) {
  if (typeof base64 !== "string" || !base64 || typeof centerIndex !== "number" || centerIndex < 0) {
    return void 0;
  }
  var start = Math.max(0, centerIndex - 16);
  var end = Math.min(base64.length, centerIndex + 17);
  return base64.slice(start, end);
}
function getBase64InvalidCharacterIndex(base64) {
  if (typeof base64 !== "string") {
    return void 0;
  }
  for (var index = 0; index < base64.length; index += 1) {
    var character = base64.charAt(index);
    var isAlphaNumeric = character >= "A" && character <= "Z" || character >= "a" && character <= "z" || character >= "0" && character <= "9";
    if (!isAlphaNumeric && character !== "+" && character !== "/" && character !== "=") {
      return index;
    }
  }
  return void 0;
}
function getBase64FirstPaddingIndex(base64) {
  if (typeof base64 !== "string") {
    return void 0;
  }
  var paddingIndex = base64.indexOf("=");
  return paddingIndex === -1 ? void 0 : paddingIndex;
}
function hasMidstreamBase64Padding(base64) {
  var firstPaddingIndex = getBase64FirstPaddingIndex(base64);
  if (typeof firstPaddingIndex === "undefined") {
    return false;
  }
  for (var index = firstPaddingIndex; index < base64.length; index += 1) {
    if (base64.charAt(index) !== "=") {
      return true;
    }
  }
  return false;
}
function isValidEncodedCanvasDataUrl(dataUrl) {
  if (typeof dataUrl !== "string" || dataUrl.indexOf("data:") !== 0) {
    return false;
  }
  var base64 = dataUrlToBase64(dataUrl);
  return !!base64 && BASE64_PAYLOAD_REGEXP.test(base64);
}
function getEncodedCanvasDataUrlDiagnostics(dataUrl) {
  var base64 = dataUrlToBase64(dataUrl);
  var firstPaddingIndex = getBase64FirstPaddingIndex(base64);
  var invalidCharacterIndex = getBase64InvalidCharacterIndex(base64);
  return {
    mimeType: getMimeTypeFromDataUrl(dataUrl),
    dataUrlLength: typeof dataUrl === "string" ? dataUrl.length : void 0,
    base64Length: base64 ? base64.length : void 0,
    base64Prefix: takeBase64Sample(base64, true),
    base64Suffix: takeBase64Sample(base64, false),
    firstPaddingIndex,
    firstPaddingWindow: getBase64Window(base64, firstPaddingIndex),
    invalidCharacterIndex,
    invalidCharacterWindow: getBase64Window(base64, invalidCharacterIndex),
    hasMidstreamPadding: hasMidstreamBase64Padding(base64)
  };
}
function buildSerializedCanvasImage(dataUrl, mimeType) {
  var resolvedMimeType = getMimeTypeFromDataUrl(dataUrl) || mimeType;
  return {
    rr_type: "ImageBitmap",
    args: [{
      rr_type: "Blob",
      data: [{
        rr_type: "ArrayBuffer",
        base64: dataUrlToBase64(dataUrl)
      }],
      type: resolvedMimeType
    }]
  };
}
function estimateEncodedBytesFromDataUrl(dataUrl) {
  var base64 = dataUrlToBase64(dataUrl);
  return Math.ceil(base64.length * 3 / 4);
}
function createCanvasMutationRecord(options) {
  var record2 = {
    type: RecordType.IncrementalSnapshot,
    timestamp: options.timestamp,
    data: {
      source: IncrementalSource.CanvasMutation,
      id: options.id,
      type: options.contextType || "2D",
      commands: options.commands
    }
  };
  if (typeof options.startedAt === "number") {
    record2.startedAt = options.startedAt;
  }
  if (typeof options.completedAt === "number") {
    record2.completedAt = options.completedAt;
  }
  return record2;
}
function createEncodedCanvasMutationRecord(options) {
  var record2 = createCanvasMutationRecord(options);
  record2.data.encodedBytesCount = options.encodedBytesCount;
  return record2;
}
var CANVAS_WORKER_INITIALIZATION_TIME_OUT_DELAY = 10 * ONE_SECOND;
var CanvasEncodeWorkerStatus = {
  Nil: 0,
  Loading: 1,
  Error: 2,
  Initialized: 3
};
function createCanvasEncodeWorker(configuration, workerCtor, urlObject) {
  var workerUrl = configuration.replayCanvasWorkerUrl;
  var usesExternalUrl = !!workerUrl;
  if (!workerUrl) {
    workerUrl = urlObject.createObjectURL(new Blob(['!function(){"use strict";function t(t){for(var e=new Uint8Array(t),n=[],r=0;r<e.length;r+=8192){for(var i=e.subarray(r,r+8192),o="",a=0;a<i.length;a+=1)o+=String.fromCharCode(i[a]);n.push(o)}return btoa(n.join(""))}function e(t,e){try{t.postMessage(e)}catch(n){t.postMessage({action:"errored",id:e&&e.id,error:String(n&&n.message?n.message:n)})}}var n;void 0===n&&(n=self),n.addEventListener("message",(function(r){var i=r.data;i&&("init"!==i.action?"encode"===i.action&&Promise.resolve().then((function(){var e=function(t,e,n){if(!t||!e||!n)return{width:t,height:e};if(t<=n&&e<=n)return{width:t,height:e};var r=t>e?n/t:n/e;return{width:Math.max(1,Math.round(t*r)),height:Math.max(1,Math.round(e*r))}}(i.width,i.height,i.maxSize),n=new OffscreenCanvas(e.width,e.height),r=n.getContext("2d");if(!r)throw new Error("Cannot create offscreen canvas 2d context for encoding");if(r.drawImage(i.bitmap,0,0,e.width,e.height),i.bitmap&&"function"==typeof i.bitmap.close&&i.bitmap.close(),"function"!=typeof n.convertToBlob)throw new Error("OffscreenCanvas convertToBlob is not supported");return n.convertToBlob({type:i.mimeType,quality:i.quality}).then((function(n){return n.arrayBuffer().then((function(r){var o=n.type||i.mimeType;return{action:"encoded",id:i.id,dataUrl:"data:"+o+";base64,"+t(r),width:e.width,height:e.height}}))}))})).then((function(t){e(n,t)})).catch((function(t){e(n,{action:"errored",id:i.id,error:String(t&&t.message?t.message:t)})})):e(n,{action:"initialized",version:"3.3.1"}))}))}();']));
  }
  return {
    worker: new workerCtor(workerUrl),
    workerUrl,
    usesExternalUrl,
    urlObject
  };
}
function createCanvasEncodeWorkerManager(configuration, options) {
  options = options || {};
  var status = CanvasEncodeWorkerStatus.Nil;
  var version;
  var worker;
  var workerUrl;
  var workerUrlObject;
  var shouldRevokeWorkerUrl = false;
  var initializationTimeoutId;
  var initializationAttempt = 0;
  var stopListeners = function stopListeners2() {
  };
  var createWorker = options.createWorker || function() {
    return createCanvasEncodeWorker(configuration, options.Worker || globalThis.Worker, options.url || globalThis.URL);
  };
  var timeoutDelay = options.initializationTimeoutDelay || CANVAS_WORKER_INITIALIZATION_TIME_OUT_DELAY;
  var addTelemetryErrorImpl = options.addTelemetryError || addTelemetryError;
  var displayError = options.displayError || display.error;
  var onInitialized2 = options.onInitialized || function() {
  };
  var onError2 = options.onError || function() {
  };
  var onMessage = options.onMessage || function() {
  };
  function cleanup() {
    stopListeners();
    stopListeners = function stopListeners2() {
    };
    if (initializationTimeoutId) {
      clearTimeout$1(initializationTimeoutId);
      initializationTimeoutId = void 0;
    }
    if (worker) {
      if (typeof worker.terminate === "function") {
        worker.terminate();
      }
      worker = void 0;
    }
    if (workerUrl && shouldRevokeWorkerUrl && workerUrlObject && typeof workerUrlObject.revokeObjectURL === "function") {
      workerUrlObject.revokeObjectURL(workerUrl);
    }
    workerUrl = void 0;
    workerUrlObject = void 0;
    shouldRevokeWorkerUrl = false;
  }
  function handleError(error, phase) {
    if (status === CanvasEncodeWorkerStatus.Loading) {
      displayError("canvas encode worker failed to start: an error occurred while creating the Worker:", error);
      if (error instanceof Event || error instanceof Error && isMessageCspRelated(error.message)) {
        if (configuration.replayCanvasWorkerUrl) {
          displayError("Please make sure the Canvas Worker URL " + configuration.replayCanvasWorkerUrl + " is correct and CSP is correctly configured.");
        } else {
          displayError("Please make sure CSP is correctly configured.");
        }
      } else {
        addTelemetryErrorImpl(error);
      }
      status = CanvasEncodeWorkerStatus.Error;
      cleanup();
      onError2(error, {
        phase: phase || "initialization",
        deterministic: phase === "initialization"
      });
      return;
    }
    addTelemetryErrorImpl(error, {
      worker_version: version
    });
    onError2(error, {
      phase: phase || "runtime"
    });
  }
  return {
    ensureWorker: function ensureWorker() {
      if (status === CanvasEncodeWorkerStatus.Loading || status === CanvasEncodeWorkerStatus.Initialized) {
        return worker;
      }
      try {
        var createdWorker = createWorker();
        var attempt = initializationAttempt + 1;
        initializationAttempt = attempt;
        worker = createdWorker.worker || createdWorker;
        workerUrl = createdWorker.workerUrl;
        workerUrlObject = createdWorker.urlObject || options.url || globalThis.URL;
        shouldRevokeWorkerUrl = !!workerUrl && !createdWorker.usesExternalUrl;
        status = CanvasEncodeWorkerStatus.Loading;
        var errorListener = addEventListener(worker, "error", function(event) {
          handleError(event.error || event || new Error("Canvas encode worker failed"), status === CanvasEncodeWorkerStatus.Loading ? "initialization" : "runtime");
        });
        var messageListener = addEventListener(worker, "message", function(event) {
          var data = event.data || {};
          if (data.action === "initialized") {
            version = data.version;
            status = CanvasEncodeWorkerStatus.Initialized;
            onInitialized2(data);
            return;
          }
          onMessage(data);
        });
        stopListeners = function stopListeners2() {
          errorListener.stop();
          messageListener.stop();
        };
        worker.postMessage({
          action: "init"
        });
        initializationTimeoutId = setTimeout$1(function() {
          if (status === CanvasEncodeWorkerStatus.Loading && initializationAttempt === attempt) {
            displayError("canvas encode worker failed to start: a timeout occurred while initializing the Worker");
            handleError(new Error("Canvas encode worker initialization timeout"), "initialization");
          }
        }, timeoutDelay);
      } catch (error) {
        handleError(error, "initialization");
      }
      return worker;
    },
    stop: function stop() {
      status = CanvasEncodeWorkerStatus.Nil;
      cleanup();
    },
    getStatus: function getStatus() {
      return status;
    }
  };
}
function isMessageCspRelated(message) {
  return includes(message, "Content Security Policy") || includes(message, "requires 'TrustedScriptURL'");
}
function computeTargetSize(width, height, maxSize) {
  if (!width || !height || !maxSize) {
    return {
      width,
      height
    };
  }
  if (width <= maxSize && height <= maxSize) {
    return {
      width,
      height
    };
  }
  var ratio = width > height ? maxSize / width : maxSize / height;
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio))
  };
}
function buildEncodeConfiguration(configuration, encodeOptions) {
  return {
    mimeType: encodeOptions && encodeOptions.mimeType || configuration.replayCanvasMimeType,
    quality: encodeOptions && typeof encodeOptions.quality === "number" ? encodeOptions.quality : configuration.replayCanvasQuality,
    maxSize: encodeOptions && typeof encodeOptions.maxSize === "number" ? encodeOptions.maxSize : configuration.replayCanvasMaxCanvasSize
  };
}
function encodeCanvasOnMainThread(canvas, configuration, encodeOptions) {
  var encodeConfiguration = buildEncodeConfiguration(configuration, encodeOptions);
  var targetSize = computeTargetSize(canvas.width, canvas.height, encodeConfiguration.maxSize);
  var targetCanvas = canvas;
  if (targetSize.width !== canvas.width || targetSize.height !== canvas.height) {
    targetCanvas = document.createElement("canvas");
    targetCanvas.width = targetSize.width;
    targetCanvas.height = targetSize.height;
    var context = targetCanvas.getContext("2d");
    if (!context) {
      throw new Error("Cannot create canvas 2d context for encoding");
    }
    context.drawImage(canvas, 0, 0, targetSize.width, targetSize.height);
  }
  return {
    dataUrl: targetCanvas.toDataURL(encodeConfiguration.mimeType, encodeConfiguration.quality),
    width: targetSize.width,
    height: targetSize.height
  };
}
function canUseWorkerEncoding(createImageBitmapImpl, workerCtor, urlObject) {
  return typeof createImageBitmapImpl === "function" && typeof workerCtor === "function" && typeof Blob === "function" && !!urlObject && typeof urlObject.createObjectURL === "function";
}
function getOption(options, key, fallback) {
  return Object.prototype.hasOwnProperty.call(options, key) ? options[key] : fallback;
}
function createCanvasEncodeBridge(configuration, options) {
  options = options || {};
  var stopped = false;
  var inFlightCount = 0;
  var nextRequestId = 0;
  var maxConcurrentEncodes = configuration.replayCanvasMaxConcurrentEncodes || 1;
  var maxQueuedEncodes = Math.max(maxConcurrentEncodes * 20, 50);
  var pendingRequests = {};
  var queuedRequests = [];
  var activeJobs = [];
  var createImageBitmapImpl = getOption(options, "createImageBitmap", globalThis.createImageBitmap);
  var urlObject = getOption(options, "url", globalThis.URL);
  var workerCtor = getOption(options, "Worker", globalThis.Worker);
  var workerEncodingSupported = canUseWorkerEncoding(createImageBitmapImpl, workerCtor, urlObject);
  var workerManager = createCanvasEncodeWorkerManager(configuration, {
    createWorker: options.createWorker,
    Worker: workerCtor,
    url: urlObject,
    onMessage: function onMessage(data) {
      var request = pendingRequests[data.id];
      if (!request) {
        return;
      }
      cleanupRequest(data.id);
      if (data.action === "encoded") {
        request.resolve({
          dataUrl: data.dataUrl,
          width: data.width,
          height: data.height
        });
      } else {
        request.reject(new Error(data.error || "Canvas encode worker failed"));
      }
    },
    onError: function onError2(error, meta) {
      if (meta && meta.phase === "initialization") {
        workerEncodingSupported = false;
      }
      workerManager.stop();
      Object.keys(pendingRequests).forEach(function(requestId) {
        var request = pendingRequests[requestId];
        cleanupRequest(requestId);
        request.reject(error || new Error("Canvas encode worker failed"));
      });
    }
  });
  function cleanupRequest(id) {
    delete pendingRequests[id];
  }
  function runNextQueuedRequest() {
    if (stopped) {
      return;
    }
    while (inFlightCount < maxConcurrentEncodes && queuedRequests.length > 0) {
      var queuedRequest = queuedRequests.shift();
      if (queuedRequest.cancelled) {
        continue;
      }
      startEncode(queuedRequest);
    }
  }
  function encodeWithWorker(canvas, encodeOptions) {
    var encodeConfiguration = buildEncodeConfiguration(configuration, encodeOptions);
    return Promise.resolve(createImageBitmapImpl(canvas)).then(function(bitmap) {
      return new Promise(function(resolve, reject) {
        var activeWorker = workerManager.ensureWorker();
        if (!activeWorker) {
          reject(new Error("Canvas encode worker is unavailable"));
          return;
        }
        var requestId = nextRequestId;
        nextRequestId += 1;
        pendingRequests[requestId] = {
          resolve,
          reject
        };
        activeWorker.postMessage({
          action: "encode",
          id: requestId,
          bitmap,
          width: canvas.width,
          height: canvas.height,
          mimeType: encodeConfiguration.mimeType,
          quality: encodeConfiguration.quality,
          maxSize: encodeConfiguration.maxSize
        }, [bitmap]);
      })["catch"](function(error) {
        closeBitmap(bitmap);
        throw error;
      });
    });
  }
  function closeBitmap(bitmap) {
    if (bitmap && typeof bitmap.close === "function") {
      try {
        bitmap.close();
      } catch (_) {
      }
    }
  }
  function startEncode(job) {
    inFlightCount += 1;
    activeJobs.push(job);
    var shouldUseWorker = workerEncodingSupported;
    var encodePromise = shouldUseWorker ? encodeWithWorker(job.canvas, job.encodeOptions)["catch"](function() {
      workerManager.stop();
      return encodeCanvasOnMainThread(job.canvas, configuration, job.encodeOptions);
    }) : Promise.resolve().then(function() {
      return encodeCanvasOnMainThread(job.canvas, configuration, job.encodeOptions);
    });
    encodePromise.then(function(result) {
      if (!job.cancelled) {
        job.resolve(result);
      }
    })["catch"](function(error) {
      if (!job.cancelled) {
        job.reject(error);
      }
    })["finally"](function() {
      var activeJobIndex = activeJobs.indexOf(job);
      if (activeJobIndex !== -1) {
        activeJobs.splice(activeJobIndex, 1);
      }
      inFlightCount -= 1;
      runNextQueuedRequest();
    });
  }
  return {
    encode: function encode(canvas, encodeOptions) {
      return new Promise(function(resolve, reject) {
        if (stopped) {
          reject(new Error("Canvas encode bridge stopped"));
          return;
        }
        if (queuedRequests.length >= maxQueuedEncodes) {
          reject(new Error("Canvas encode bridge queue full"));
          return;
        }
        var job = {
          canvas,
          encodeOptions,
          resolve,
          reject,
          cancelled: false
        };
        queuedRequests.push(job);
        runNextQueuedRequest();
      });
    },
    stop: function stop() {
      stopped = true;
      queuedRequests.forEach(function(job) {
        job.cancelled = true;
        job.reject(new Error("Canvas encode bridge stopped"));
      });
      queuedRequests = [];
      activeJobs.forEach(function(job) {
        job.cancelled = true;
        job.reject(new Error("Canvas encode bridge stopped"));
      });
      activeJobs = [];
      Object.keys(pendingRequests).forEach(function(requestId) {
        var request = pendingRequests[requestId];
        cleanupRequest(requestId);
        request.reject(new Error("Canvas encode bridge stopped"));
      });
      workerManager.stop();
    },
    getWorkerStatus: function getWorkerStatus() {
      return workerManager.getStatus();
    }
  };
}
var AUTO_CANVAS_SIGNATURE_SIZE = 8;
var AUTO_CANVAS_SIGNATURE_DIFF_THRESHOLD = 8;
function createCanvasFrameSignatureExtractor() {
  var signatureCanvas = document.createElement("canvas");
  signatureCanvas.width = AUTO_CANVAS_SIGNATURE_SIZE;
  signatureCanvas.height = AUTO_CANVAS_SIGNATURE_SIZE;
  var signatureContext = signatureCanvas.getContext("2d", {
    willReadFrequently: true
  });
  if (!signatureContext) {
    return function() {
      return void 0;
    };
  }
  return function(canvas) {
    try {
      signatureContext.clearRect(0, 0, AUTO_CANVAS_SIGNATURE_SIZE, AUTO_CANVAS_SIGNATURE_SIZE);
      signatureContext.drawImage(canvas, 0, 0, AUTO_CANVAS_SIGNATURE_SIZE, AUTO_CANVAS_SIGNATURE_SIZE);
      return buildCanvasFrameSignature(signatureContext.getImageData(0, 0, AUTO_CANVAS_SIGNATURE_SIZE, AUTO_CANVAS_SIGNATURE_SIZE).data);
    } catch (_) {
      return void 0;
    }
  };
}
function buildCanvasFrameSignature(imageData) {
  var signature = [];
  for (var index = 0; index < imageData.length; index += 4) {
    signature.push(Math.round(imageData[index] * 0.299 + imageData[index + 1] * 0.587 + imageData[index + 2] * 0.114));
  }
  return signature;
}
function isCanvasFrameBelowThreshold(previousSignature, nextSignature) {
  if (!Array.isArray(previousSignature) || !Array.isArray(nextSignature) || previousSignature.length !== nextSignature.length) {
    return false;
  }
  var totalDifference = 0;
  for (var index = 0; index < previousSignature.length; index += 1) {
    totalDifference += Math.abs(previousSignature[index] - nextSignature[index]);
  }
  return totalDifference / previousSignature.length <= AUTO_CANVAS_SIGNATURE_DIFF_THRESHOLD;
}
function createSnapshotSuccessResult() {
  return {
    ok: true
  };
}
function createSnapshotFailureResult(reason) {
  return {
    ok: false,
    reason
  };
}
function isSupportedReplayCanvasMode(mode) {
  return mode === "manual" || mode === "auto";
}
function getContinuousAutoEncodeOptions(canvas, configuration, snapshotOptions) {
  if (!snapshotOptions || snapshotOptions.trigger !== "auto" || snapshotOptions.scheduler !== "continuous_snapshot") {
    return void 0;
  }
  var pixelArea = canvas.width * canvas.height;
  if (pixelArea < 12e4) {
    return void 0;
  }
  return {
    quality: Math.max(configuration.replayCanvasQuality * 0.75, 0.2),
    maxSize: Math.max(1, Math.round(configuration.replayCanvasMaxCanvasSize * 0.85))
  };
}
function createCanvasObserver(options) {
  var configuration = options.configuration;
  var emit = options.emit;
  var onMutationDebug = options.onMutationDebug || function() {
  };
  var now = options.now || Date.now;
  var encodeBridge = options.encodeBridge || createCanvasEncodeBridge(configuration);
  var frameSignatureExtractor = options.frameSignatureExtractor || createCanvasFrameSignatureExtractor();
  var stopped = false;
  var generation = 0;
  var lastEncodedDataUrlByCanvas = /* @__PURE__ */ new WeakMap();
  var lastAutoFrameSignatureByCanvas = /* @__PURE__ */ new WeakMap();
  var lastAutoSuccessfulSnapshotAtByCanvas = /* @__PURE__ */ new WeakMap();
  function _reset() {
    generation += 1;
    lastEncodedDataUrlByCanvas = /* @__PURE__ */ new WeakMap();
    lastAutoFrameSignatureByCanvas = /* @__PURE__ */ new WeakMap();
    lastAutoSuccessfulSnapshotAtByCanvas = /* @__PURE__ */ new WeakMap();
  }
  return {
    snapshot: function snapshot(canvas, snapshotOptions) {
      var isAutoSnapshot = snapshotOptions && snapshotOptions.trigger === "auto";
      var shouldTrackAutoBaseline = configuration.replayCanvasMode === "auto";
      if (stopped) {
        return Promise.resolve(createSnapshotFailureResult("observer_stopped"));
      }
      if (!configuration.replayCanvasEnabled) {
        return Promise.resolve(createSnapshotFailureResult("replay_disabled"));
      }
      if (!isSupportedReplayCanvasMode(configuration.replayCanvasMode)) {
        return Promise.resolve(createSnapshotFailureResult("invalid_mode"));
      }
      if (!(canvas instanceof HTMLCanvasElement)) {
        return Promise.resolve(createSnapshotFailureResult("not_canvas"));
      }
      if (!hasSerializedNode(canvas)) {
        return Promise.resolve(createSnapshotFailureResult("not_serialized"));
      }
      var id = getSerializedNodeId(canvas);
      if (!id || !canvas.isConnected) {
        return Promise.resolve(createSnapshotFailureResult("detached"));
      }
      if (configuration.shouldRecordCanvas && configuration.shouldRecordCanvas(canvas) === false) {
        return Promise.resolve(createSnapshotFailureResult("rejected_by_should_record_canvas"));
      }
      var snapshotGeneration = generation;
      var autoFrameSignatureResult = getAutoFrameSignatureResult({
        canvas,
        configuration,
        now,
        frameSignatureExtractor,
        lastAutoFrameSignatureByCanvas,
        lastAutoSuccessfulSnapshotAtByCanvas,
        isAutoSnapshot,
        shouldTrackAutoBaseline
      });
      if (autoFrameSignatureResult && autoFrameSignatureResult.result) {
        return Promise.resolve(autoFrameSignatureResult.result);
      }
      var encodeOptions = getContinuousAutoEncodeOptions(canvas, configuration, snapshotOptions);
      return encodeBridge.encode(canvas, encodeOptions).then(function(encodedCanvas) {
        if (stopped) {
          return createSnapshotFailureResult("observer_stopped");
        }
        if (snapshotGeneration !== generation) {
          return createSnapshotFailureResult("reset_during_snapshot");
        }
        if (isAutoSnapshot && lastEncodedDataUrlByCanvas.get(canvas) === encodedCanvas.dataUrl) {
          return createSnapshotFailureResult("unchanged");
        }
        var encodedBytesCount = estimateEncodedBytesFromDataUrl(encodedCanvas.dataUrl);
        if (!isValidEncodedCanvasDataUrl(encodedCanvas.dataUrl)) {
          onMutationDebug({
            timestamp: timeStampNow(),
            canvasId: id,
            trigger: snapshotOptions && snapshotOptions.trigger === "auto" ? "auto" : "manual",
            reason: "invalid_encoded_payload",
            width: encodedCanvas.width,
            height: encodedCanvas.height,
            encodedBytesCount,
            diagnostics: getEncodedCanvasDataUrlDiagnostics(encodedCanvas.dataUrl)
          });
          return createSnapshotFailureResult("invalid_encoded_payload");
        }
        if (encodedBytesCount > configuration.replayCanvasMaxEncodedBytes) {
          return createSnapshotFailureResult("encode_too_large");
        }
        lastEncodedDataUrlByCanvas.set(canvas, encodedCanvas.dataUrl);
        if (shouldTrackAutoBaseline) {
          if (autoFrameSignatureResult && autoFrameSignatureResult.nextFrameSignature) {
            lastAutoFrameSignatureByCanvas.set(canvas, autoFrameSignatureResult.nextFrameSignature);
          }
          lastAutoSuccessfulSnapshotAtByCanvas.set(canvas, now());
        }
        var mutationTimestamp = timeStampNow();
        emit(createEncodedCanvasMutationRecord({
          timestamp: mutationTimestamp,
          id,
          contextType: "2D",
          commands: [{
            property: "clearRect",
            args: [0, 0, encodedCanvas.width, encodedCanvas.height]
          }, {
            property: "drawImage",
            args: [buildSerializedCanvasImage(encodedCanvas.dataUrl, configuration.replayCanvasMimeType), 0, 0, encodedCanvas.width, encodedCanvas.height]
          }],
          encodedBytesCount
        }));
        onMutationDebug({
          timestamp: mutationTimestamp,
          canvasId: id,
          trigger: snapshotOptions && snapshotOptions.trigger === "auto" ? "auto" : "manual",
          encodedBytesCount,
          width: encodedCanvas.width,
          height: encodedCanvas.height
        });
        return createSnapshotSuccessResult();
      })["catch"](function(error) {
        if (error && error.ok === false && error.reason) {
          return error;
        }
        return createSnapshotFailureResult("encode_failed");
      });
    },
    stop: function stop() {
      stopped = true;
      encodeBridge.stop();
    },
    reset: function reset() {
      _reset();
    }
  };
}
function getAutoFrameSignatureResult(options) {
  if (!options.shouldTrackAutoBaseline || options.configuration.replayCanvasMode !== "auto") {
    return void 0;
  }
  var nextFrameSignature = options.frameSignatureExtractor(options.canvas);
  var previousFrameSignature = options.lastAutoFrameSignatureByCanvas.get(options.canvas);
  var lastAutoSuccessfulSnapshotAt = options.lastAutoSuccessfulSnapshotAtByCanvas.get(options.canvas);
  var canSkipBelowThreshold = typeof lastAutoSuccessfulSnapshotAt === "number" && options.now() - lastAutoSuccessfulSnapshotAt < options.configuration.replayCanvasAutoUnchangedBackoff;
  if (options.isAutoSnapshot && canSkipBelowThreshold && previousFrameSignature && nextFrameSignature && isCanvasFrameBelowThreshold(previousFrameSignature, nextFrameSignature)) {
    return {
      result: createSnapshotFailureResult("below_threshold"),
      nextFrameSignature
    };
  }
  return {
    nextFrameSignature
  };
}
function _typeof$3(o) {
  "@babel/helpers - typeof";
  return _typeof$3 = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(o2) {
    return typeof o2;
  } : function(o2) {
    return o2 && "function" == typeof Symbol && o2.constructor === Symbol && o2 !== Symbol.prototype ? "symbol" : typeof o2;
  }, _typeof$3(o);
}
function arrayBufferToBase64(buffer) {
  var bytes = new Uint8Array(buffer);
  var binary = "";
  for (var index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }
  return btoa(binary);
}
var canvasObjectRefMap = /* @__PURE__ */ new WeakMap();
function isTypedArray(value) {
  return value instanceof Float32Array || value instanceof Float64Array || value instanceof Int32Array || value instanceof Uint32Array || value instanceof Uint8Array || value instanceof Uint16Array || value instanceof Int16Array || value instanceof Int8Array || value instanceof Uint8ClampedArray;
}
function variableListFor(context, constructorName) {
  var contextMap = canvasObjectRefMap.get(context);
  if (!contextMap) {
    contextMap = /* @__PURE__ */ new Map();
    canvasObjectRefMap.set(context, contextMap);
  }
  if (!contextMap.has(constructorName)) {
    contextMap.set(constructorName, []);
  }
  return contextMap.get(constructorName);
}
function serializeCanvasObjectRef(value, context) {
  if (!value || _typeof$3(value) !== "object" || !context || !value.constructor) {
    return value;
  }
  var constructorName = value.constructor.name || "Object";
  var objectList = variableListFor(context, constructorName);
  var objectIndex = objectList.indexOf(value);
  if (objectIndex === -1) {
    objectIndex = objectList.length;
    objectList.push(value);
  }
  return {
    rr_type: constructorName,
    index: objectIndex
  };
}
function serializeCanvasCommandArg(value, context) {
  if (Array.isArray(value)) {
    return value.map(function(item) {
      return serializeCanvasCommandArg(item, context);
    });
  }
  if (value === null || value === void 0 || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (isTypedArray(value)) {
    return {
      rr_type: value.constructor.name,
      args: [Array.prototype.slice.call(value)]
    };
  }
  if (value instanceof ArrayBuffer) {
    return {
      rr_type: "ArrayBuffer",
      base64: arrayBufferToBase64(value)
    };
  }
  if (value instanceof DataView) {
    return {
      rr_type: "DataView",
      args: [serializeCanvasCommandArg(value.buffer, context), value.byteOffset, value.byteLength]
    };
  }
  if (typeof ImageData !== "undefined" && value instanceof ImageData) {
    return {
      rr_type: "ImageData",
      args: [serializeCanvasCommandArg(value.data, context), value.width, value.height]
    };
  }
  if (typeof HTMLImageElement !== "undefined" && value instanceof HTMLImageElement) {
    return {
      rr_type: "HTMLImageElement",
      src: value.src
    };
  }
  return serializeCanvasObjectRef(value, context);
}
function serializeCanvasCommandArgs(args, context) {
  return Array.prototype.slice.call(args).map(function(arg) {
    return serializeCanvasCommandArg(arg, context);
  });
}
function _typeof$2(o) {
  "@babel/helpers - typeof";
  return _typeof$2 = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(o2) {
    return typeof o2;
  } : function(o2) {
    return o2 && "function" == typeof Symbol && o2.constructor === Symbol && o2 !== Symbol.prototype ? "symbol" : typeof o2;
  }, _typeof$2(o);
}
var CANVAS_2D_CAPTURED_METHODS = ["save", "restore", "translate", "scale", "rotate", "transform", "setTransform", "createLinearGradient", "createRadialGradient", "createPattern", "createConicGradient", "clearRect", "fillRect", "strokeRect", "rect", "beginPath", "moveTo", "lineTo", "bezierCurveTo", "quadraticCurveTo", "closePath", "arc", "ellipse", "roundRect", "clip", "fill", "stroke", "fillText", "strokeText", "setLineDash", "drawImage"];
var CANVAS_2D_CAPTURED_PROPERTIES = ["fillStyle", "strokeStyle", "lineWidth", "lineCap", "lineJoin", "miterLimit", "font", "globalAlpha", "shadowColor", "shadowBlur", "shadowOffsetX", "shadowOffsetY", "textAlign", "textBaseline", "filter"];
var UNSUPPORTED_REPLAY_OBJECT_NAMES = {
  CanvasGradient: true,
  CanvasPattern: true,
  Path2D: true
};
var ORIGINAL_ADD_COLOR_STOP_KEY = "__dd_original_addColorStop__";
var PATCHED_ADD_COLOR_STOP_KEY = "__dd_patched_addColorStop__";
function canPatchProperty(target, property) {
  var descriptor = Object.getOwnPropertyDescriptor(target, property);
  return !descriptor || descriptor.configurable !== false;
}
function getPropertyDescriptor(target, property) {
  var currentTarget = target;
  while (currentTarget) {
    var descriptor = Object.getOwnPropertyDescriptor(currentTarget, property);
    if (descriptor) {
      return descriptor;
    }
    currentTarget = Object.getPrototypeOf(currentTarget);
  }
}
function getCanvasObjectConstructorName(value) {
  if (!value || _typeof$2(value) !== "object" || !value.constructor) {
    return;
  }
  return value.constructor.name || "Object";
}
function getFallbackReasonForValue(value) {
  if (Array.isArray(value)) {
    for (var index = 0; index < value.length; index += 1) {
      var nestedReason = getFallbackReasonForValue(value[index]);
      if (nestedReason) {
        return nestedReason;
      }
    }
    return;
  }
  var constructorName = getCanvasObjectConstructorName(value);
  if (!constructorName || !UNSUPPORTED_REPLAY_OBJECT_NAMES[constructorName]) {
    return;
  }
  if (constructorName === "CanvasGradient") {
    return "gradient_style_assignment";
  }
  if (constructorName === "CanvasPattern") {
    return "canvas_pattern";
  }
  if (constructorName === "Path2D") {
    return "path2d_argument";
  }
  return "unsupported_canvas_object";
}
function isCrossOriginImageElement(value) {
  if (typeof HTMLImageElement === "undefined" || !(value instanceof HTMLImageElement)) {
    return false;
  }
  var src = value.currentSrc || value.src;
  if (!src) {
    return false;
  }
  if (src.indexOf("data:") === 0 || src.indexOf("blob:") === 0) {
    return false;
  }
  try {
    return new URL(src, window.location.href).origin !== window.location.origin;
  } catch (_) {
    return false;
  }
}
function isUnsupportedDrawImageSource(value) {
  if (typeof HTMLCanvasElement !== "undefined" && value instanceof HTMLCanvasElement) {
    return "draw_image_canvas";
  }
  if (typeof HTMLVideoElement !== "undefined" && value instanceof HTMLVideoElement) {
    return "draw_image_video";
  }
  if (isCrossOriginImageElement(value)) {
    return "draw_image_cross_origin";
  }
}
function createCanvas2DCommandRecorder(options) {
  options = options || {};
  var emit = options.emit || function() {
  };
  var now = options.now || Date.now;
  var requestAnimationFrameImpl = options.requestAnimationFrameImpl || function(callback) {
    return window.requestAnimationFrame(callback);
  };
  var cancelAnimationFrameImpl = options.cancelAnimationFrameImpl || function(rafId) {
    return window.cancelAnimationFrame(rafId);
  };
  var trackedContexts = [];
  var trackedContextSet = /* @__PURE__ */ new Set();
  var patchedPrototypeRecords = [];
  var pendingCommandsByContext = /* @__PURE__ */ new Map();
  var fallbackModeContexts = /* @__PURE__ */ new WeakSet();
  var fallbackReasonByContext = /* @__PURE__ */ new WeakMap();
  var patchedOpaqueObjects = /* @__PURE__ */ new WeakSet();
  var patchedOpaqueObjectRefs = [];
  var opaqueObjectContextMap = /* @__PURE__ */ new WeakMap();
  var weakRefFactory = Object.prototype.hasOwnProperty.call(options, "weakRefFactory") ? typeof options.weakRefFactory === "function" ? options.weakRefFactory : void 0 : typeof WeakRef === "function" ? function(value) {
    return new WeakRef(value);
  } : void 0;
  var scheduledFlushId;
  var stopped = false;
  var paused = false;
  var getCanvasId = options.getCanvasId || function(context) {
    return context && context.canvas && context.canvas.__sn && context.canvas.__sn.id;
  };
  var getCanvasType = options.getCanvasType || function() {
    return "2D";
  };
  var requestSnapshotFallback = options.requestSnapshotFallback || function() {
  };
  var shouldRecordContext = options.shouldRecordContext || function() {
    return true;
  };
  function scheduleFlush() {
    if (stopped || paused || scheduledFlushId !== void 0) {
      return;
    }
    scheduledFlushId = requestAnimationFrameImpl(function() {
      scheduledFlushId = void 0;
      flush();
    });
  }
  function enqueueCommand(context, command) {
    if (paused) {
      return;
    }
    if (!pendingCommandsByContext.has(context)) {
      pendingCommandsByContext.set(context, {
        commands: [],
        startedAt: now()
      });
    }
    pendingCommandsByContext.get(context).commands.push(command);
    scheduleFlush();
  }
  function flush() {
    if (stopped || paused) {
      return;
    }
    pendingCommandsByContext.forEach(function(batch, context) {
      if (!batch.commands.length) {
        return;
      }
      if (fallbackModeContexts.has(context)) {
        requestSnapshotFallback(context, fallbackReasonByContext.get(context) || "unsupported_canvas_object");
        return;
      }
      var id = getCanvasId(context);
      if (id === void 0 || id === null || id === -1) {
        return;
      }
      var completedAt = now();
      emit(createCanvasMutationRecord({
        id,
        contextType: getCanvasType(context),
        commands: batch.commands.slice(),
        timestamp: completedAt,
        startedAt: batch.startedAt,
        completedAt
      }));
    });
    pendingCommandsByContext.clear();
  }
  function shouldCaptureContext(context) {
    return trackedContextSet.has(context);
  }
  function registerTrackedContext(context, restoreFns) {
    if (!context || trackedContextSet.has(context)) {
      return false;
    }
    restoreFns = restoreFns || [];
    Object.defineProperty(context, "__dd_command_capture__", {
      configurable: true,
      enumerable: false,
      value: true
    });
    restoreFns.push(function() {
      delete context.__dd_command_capture__;
    });
    trackedContexts.push({
      context,
      restore: function restore() {
        trackedContextSet["delete"](context);
        pendingCommandsByContext["delete"](context);
        fallbackReasonByContext["delete"](context);
        while (restoreFns.length) {
          restoreFns.pop()();
        }
      }
    });
    trackedContextSet.add(context);
    return true;
  }
  function maybeTrackContext(context) {
    if (!context || trackedContextSet.has(context) || !context.canvas || shouldRecordContext(context) === false) {
      return false;
    }
    return registerTrackedContext(context, []);
  }
  function enableSnapshotFallbackForContext(context, reason) {
    fallbackModeContexts.add(context);
    if (!fallbackReasonByContext.has(context)) {
      fallbackReasonByContext.set(context, reason || "unsupported_canvas_object");
    }
    pendingCommandsByContext["delete"](context);
    requestSnapshotFallback(context, fallbackReasonByContext.get(context) || "unsupported_canvas_object");
  }
  function patchGradientObjectMethods(value, context) {
    if (!value || _typeof$2(value) !== "object" || typeof value.addColorStop !== "function") {
      return;
    }
    opaqueObjectContextMap.set(value, context);
    if (patchedOpaqueObjects.has(value)) {
      return;
    }
    var originalAddColorStop = value.addColorStop;
    try {
      value[ORIGINAL_ADD_COLOR_STOP_KEY] = originalAddColorStop;
      value[PATCHED_ADD_COLOR_STOP_KEY] = true;
      value.addColorStop = function() {
        if (stopped || !this[PATCHED_ADD_COLOR_STOP_KEY]) {
          var restoredOriginal = this[ORIGINAL_ADD_COLOR_STOP_KEY];
          if (typeof restoredOriginal === "function") {
            this.addColorStop = restoredOriginal;
            delete this[ORIGINAL_ADD_COLOR_STOP_KEY];
            delete this[PATCHED_ADD_COLOR_STOP_KEY];
            return restoredOriginal.apply(this, arguments);
          }
        }
        var fallbackContext = opaqueObjectContextMap.get(this);
        if (fallbackContext && shouldCaptureContext(fallbackContext)) {
          enableSnapshotFallbackForContext(fallbackContext, "gradient_color_stop");
        }
        return originalAddColorStop.apply(this, arguments);
      };
      patchedOpaqueObjects.add(value);
      patchedOpaqueObjectRefs.push(weakRefFactory ? weakRefFactory(value) : {
        value
      });
    } catch (_) {
    }
  }
  function restorePatchedOpaqueObjects() {
    while (patchedOpaqueObjectRefs.length) {
      var objectRef = patchedOpaqueObjectRefs.pop();
      var object = objectRef && typeof objectRef.deref === "function" ? objectRef.deref() : objectRef && objectRef.value;
      if (object && object[PATCHED_ADD_COLOR_STOP_KEY] && typeof object[ORIGINAL_ADD_COLOR_STOP_KEY] === "function") {
        object.addColorStop = object[ORIGINAL_ADD_COLOR_STOP_KEY];
        delete object[ORIGINAL_ADD_COLOR_STOP_KEY];
        delete object[PATCHED_ADD_COLOR_STOP_KEY];
      }
    }
  }
  function patchMethodOnTarget(target, methodName, restoreFns) {
    if (typeof target[methodName] !== "function") {
      return;
    }
    var originalMethod = target[methodName];
    target[methodName] = function() {
      maybeTrackContext(this);
      var drawImageFallbackReason = shouldCaptureContext(this) && methodName === "drawImage" ? isUnsupportedDrawImageSource(arguments[0]) : void 0;
      if (drawImageFallbackReason) {
        enableSnapshotFallbackForContext(this, drawImageFallbackReason);
        return originalMethod.apply(this, arguments);
      }
      var fallbackReason = shouldCaptureContext(this) ? getFallbackReasonForValue(Array.prototype.slice.call(arguments)) : void 0;
      if (fallbackReason) {
        enableSnapshotFallbackForContext(this, fallbackReason);
        return originalMethod.apply(this, arguments);
      }
      var serializedArgs;
      if (shouldCaptureContext(this)) {
        try {
          serializedArgs = serializeCanvasCommandArgs(arguments, this);
        } catch (error) {
          throw error;
        }
        enqueueCommand(this, {
          property: methodName,
          args: serializedArgs
        });
      }
      var result = originalMethod.apply(this, arguments);
      if (shouldCaptureContext(this) && (methodName === "createLinearGradient" || methodName === "createRadialGradient" || methodName === "createConicGradient")) {
        patchGradientObjectMethods(result, this);
      }
      return result;
    };
    restoreFns.push(function() {
      target[methodName] = originalMethod;
    });
  }
  function patchPropertyOnTarget(target, propertyName, restoreFns) {
    if (!canPatchProperty(target, propertyName)) {
      return;
    }
    var originalDescriptor = getPropertyDescriptor(target, propertyName);
    var fallbackValues = /* @__PURE__ */ new WeakMap();
    Object.defineProperty(target, propertyName, {
      configurable: true,
      enumerable: true,
      get: function get() {
        if (originalDescriptor && originalDescriptor.get) {
          return originalDescriptor.get.call(this);
        }
        return fallbackValues.get(this);
      },
      set: function set(value) {
        maybeTrackContext(this);
        fallbackValues.set(this, value);
        if (originalDescriptor && originalDescriptor.set) {
          originalDescriptor.set.call(this, value);
        }
        if (shouldCaptureContext(this)) {
          var fallbackReason = getFallbackReasonForValue(value);
          if (fallbackReason) {
            enableSnapshotFallbackForContext(this, fallbackReason);
            return;
          }
          enqueueCommand(this, {
            property: propertyName,
            args: [serializeCanvasCommandArgs([value], this)[0]],
            setter: true
          });
        }
      }
    });
    restoreFns.push(function() {
      if (originalDescriptor) {
        Object.defineProperty(target, propertyName, originalDescriptor);
      } else {
        delete target[propertyName];
      }
    });
  }
  function patchPrototype(context) {
    var prototype = Object.getPrototypeOf(context);
    if (!prototype || prototype === Object.prototype) {
      return;
    }
    var existingRecord = patchedPrototypeRecords.find(function(record2) {
      return record2.prototype === prototype;
    });
    if (existingRecord) {
      return;
    }
    var restoreFns = [];
    CANVAS_2D_CAPTURED_METHODS.forEach(function(methodName) {
      patchMethodOnTarget(prototype, methodName, restoreFns);
    });
    CANVAS_2D_CAPTURED_PROPERTIES.forEach(function(propertyName) {
      patchPropertyOnTarget(prototype, propertyName, restoreFns);
    });
    patchedPrototypeRecords.push({
      prototype,
      restore: function restore() {
        while (restoreFns.length) {
          restoreFns.pop()();
        }
      }
    });
  }
  function patchSharedPrototype(prototype) {
    if (!prototype || prototype === Object.prototype) {
      return;
    }
    var existingRecord = patchedPrototypeRecords.find(function(record2) {
      return record2.prototype === prototype;
    });
    if (existingRecord) {
      return;
    }
    var restoreFns = [];
    CANVAS_2D_CAPTURED_METHODS.forEach(function(methodName) {
      patchMethodOnTarget(prototype, methodName, restoreFns);
    });
    CANVAS_2D_CAPTURED_PROPERTIES.forEach(function(propertyName) {
      patchPropertyOnTarget(prototype, propertyName, restoreFns);
    });
    patchedPrototypeRecords.push({
      prototype,
      restore: function restore() {
        while (restoreFns.length) {
          restoreFns.pop()();
        }
      }
    });
  }
  function patchContextInstance(context, restoreFns) {
    CANVAS_2D_CAPTURED_METHODS.forEach(function(methodName) {
      patchMethodOnTarget(context, methodName, restoreFns);
    });
    CANVAS_2D_CAPTURED_PROPERTIES.forEach(function(propertyName) {
      patchPropertyOnTarget(context, propertyName, restoreFns);
    });
  }
  function patchContext(context) {
    if (!context || context.__dd_command_capture__) {
      return function() {
      };
    }
    var restoreFns = [];
    var prototype = Object.getPrototypeOf(context);
    if (prototype && prototype !== Object.prototype) {
      patchPrototype(context);
    } else {
      patchContextInstance(context, restoreFns);
    }
    registerTrackedContext(context, restoreFns);
    return function() {
      var trackedIndex = trackedContexts.findIndex(function(tracked) {
        return tracked.context === context;
      });
      if (trackedIndex >= 0) {
        trackedContexts.splice(trackedIndex, 1)[0].restore();
      }
    };
  }
  function stop() {
    stopped = true;
    if (scheduledFlushId !== void 0) {
      cancelAnimationFrameImpl(scheduledFlushId);
      scheduledFlushId = void 0;
    }
    pendingCommandsByContext.clear();
    fallbackModeContexts = /* @__PURE__ */ new WeakSet();
    fallbackReasonByContext = /* @__PURE__ */ new WeakMap();
    opaqueObjectContextMap = /* @__PURE__ */ new WeakMap();
    restorePatchedOpaqueObjects();
    while (trackedContexts.length) {
      trackedContexts.pop().restore();
    }
    while (patchedPrototypeRecords.length) {
      patchedPrototypeRecords.pop().restore();
    }
  }
  function pause() {
    paused = true;
    if (scheduledFlushId !== void 0) {
      cancelAnimationFrameImpl(scheduledFlushId);
      scheduledFlushId = void 0;
    }
    pendingCommandsByContext.clear();
    fallbackModeContexts = /* @__PURE__ */ new WeakSet();
    fallbackReasonByContext = /* @__PURE__ */ new WeakMap();
  }
  function resume() {
    paused = false;
  }
  function reset() {
    if (scheduledFlushId !== void 0) {
      cancelAnimationFrameImpl(scheduledFlushId);
      scheduledFlushId = void 0;
    }
    pendingCommandsByContext.clear();
    fallbackModeContexts = /* @__PURE__ */ new WeakSet();
    fallbackReasonByContext = /* @__PURE__ */ new WeakMap();
  }
  return {
    patchContext,
    patchSharedPrototype,
    flush,
    pause,
    resume,
    reset,
    stop
  };
}
function shouldEnableCanvasCommandCapture(configuration) {
  return configuration.replayCanvasEnabled && configuration.replayCanvasMode === "auto" && configuration.replayCanvasSampling === "all";
}
function isDocumentHidden() {
  return document.visibilityState === "hidden" || document.hidden === true;
}
function startCanvasCommandCapture(options) {
  var configuration = options.configuration;
  if (!shouldEnableCanvasCommandCapture(configuration) || !window.HTMLCanvasElement || !window.HTMLCanvasElement.prototype) {
    return {
      stop: function stop() {
      },
      reset: function reset() {
      }
    };
  }
  var _emit = options.emit;
  var now = options.now || Date.now;
  var onDebug = options.onDebug || function() {
  };
  var onMutationDebug = options.onMutationDebug || function() {
  };
  var snapshotCanvas = options.snapshotCanvas || function() {
  };
  var getCanvases = options.getCanvases || function() {
    if (!document.querySelectorAll) {
      return [];
    }
    return Array.prototype.slice.call(document.querySelectorAll("canvas"));
  };
  var getSerializedNodeId2 = options.getSerializedNodeId || function(canvas) {
    return canvas && canvas.__sn && canvas.__sn.id;
  };
  var known2dContextsByCanvas = /* @__PURE__ */ new WeakMap();
  var initialSnapshotCanvases = /* @__PURE__ */ new WeakSet();
  var queuedInitialSnapshotCanvases = /* @__PURE__ */ new WeakSet();
  var pendingInitialSnapshotCanvases = [];
  var runningInitialSnapshotCanvas;
  var generation = 0;
  var stopped = false;
  var recorder = options.commandRecorder || createCanvas2DCommandRecorder({
    shouldRecordContext: function shouldRecordContext(context) {
      return context && context.canvas && (!configuration.shouldRecordCanvas || configuration.shouldRecordCanvas(context.canvas) !== false);
    },
    getCanvasId: function getCanvasId(context) {
      return context && context.canvas ? getSerializedNodeId2(context.canvas) : void 0;
    },
    requestSnapshotFallback: function requestSnapshotFallback(context, reason) {
      if (!context || !context.canvas) {
        return;
      }
      var timestamp = now();
      var canvasId = getSerializedNodeId2(context.canvas);
      onDebug({
        scheduler: "command_capture",
        status: "fallback",
        startedAt: timestamp,
        completedAt: timestamp,
        timestamp,
        eligibleCanvasCount: 1,
        selectedCanvasCount: 0,
        skippedBudgetCount: 0,
        keepSessionAliveTriggered: false,
        results: [{
          canvasId,
          ok: false,
          reason,
          priority: void 0
        }]
      });
      snapshotCanvas(context.canvas, {
        trigger: "auto",
        scheduler: "command_capture",
        reason
      });
    },
    emit: function emit(event) {
      var completedAt = typeof event.completedAt === "number" ? event.completedAt : typeof event.timestamp === "number" ? event.timestamp : now();
      var startedAt = typeof event.startedAt === "number" ? event.startedAt : completedAt;
      var approxBytes = JSON.stringify(event.data && event.data.commands || []).length;
      onMutationDebug({
        timestamp: completedAt,
        canvasId: event.data && event.data.id,
        trigger: "auto",
        approxBytesCount: approxBytes,
        commandCount: event.data && event.data.commands ? event.data.commands.length : 0
      });
      onDebug({
        scheduler: "command_capture",
        status: "completed",
        startedAt,
        completedAt,
        timestamp: completedAt,
        eligibleCanvasCount: 1,
        selectedCanvasCount: 1,
        skippedBudgetCount: 0,
        keepSessionAliveTriggered: false,
        results: [{
          canvasId: event.data && event.data.id,
          ok: true,
          reason: void 0,
          priority: void 0
        }]
      });
      _emit(event);
    }
  });
  var originalGetContext = window.HTMLCanvasElement.prototype.getContext;
  var removeVisibilityListener = function removeVisibilityListener2() {
  };
  if (typeof originalGetContext !== "function") {
    return {
      stop: function stop() {
      },
      reset: function reset() {
      }
    };
  }
  function patchExistingCanvases() {
    getCanvases().forEach(function(canvas) {
      if (stopped || !canvas || configuration.shouldRecordCanvas && configuration.shouldRecordCanvas(canvas) === false) {
        return;
      }
      var context = known2dContextsByCanvas.get(canvas);
      if (context) {
        recorder.patchContext(context);
      }
      if (getSerializedNodeId2(canvas) !== void 0 && getSerializedNodeId2(canvas) !== null && getSerializedNodeId2(canvas) !== -1 && !initialSnapshotCanvases.has(canvas) && !queuedInitialSnapshotCanvases.has(canvas) && context) {
        queuedInitialSnapshotCanvases.add(canvas);
        pendingInitialSnapshotCanvases.push(canvas);
      }
    });
    runNextInitialSnapshot();
  }
  function runNextInitialSnapshot() {
    if (stopped || runningInitialSnapshotCanvas || !pendingInitialSnapshotCanvases.length) {
      return;
    }
    var canvas = pendingInitialSnapshotCanvases.shift();
    if (!canvas) {
      return;
    }
    var canvasId = getSerializedNodeId2(canvas);
    if (!canvasId && canvasId !== 0) {
      runNextInitialSnapshot();
      return;
    }
    if (initialSnapshotCanvases.has(canvas) || configuration.shouldRecordCanvas && configuration.shouldRecordCanvas(canvas) === false) {
      runNextInitialSnapshot();
      return;
    }
    var startedAt = now();
    var snapshotGeneration = generation;
    runningInitialSnapshotCanvas = canvas;
    initialSnapshotCanvases.add(canvas);
    Promise.resolve().then(function() {
      return snapshotCanvas(canvas, {
        trigger: "auto",
        scheduler: "command_capture",
        reason: "initial_static_canvas"
      });
    }).then(function(result) {
      if (stopped || snapshotGeneration !== generation) {
        return;
      }
      var completedAt = now();
      if (!result || result.ok === false) {
        initialSnapshotCanvases["delete"](canvas);
      }
      onDebug({
        scheduler: "command_capture",
        status: "completed",
        startedAt,
        completedAt,
        timestamp: completedAt,
        eligibleCanvasCount: 1,
        selectedCanvasCount: result && result.ok === false ? 0 : 1,
        skippedBudgetCount: 0,
        keepSessionAliveTriggered: false,
        results: [{
          canvasId,
          ok: !(result && result.ok === false),
          reason: result && result.ok === false ? result.reason : void 0,
          priority: void 0
        }]
      });
    })["catch"](function() {
      if (stopped || snapshotGeneration !== generation) {
        return;
      }
      var completedAt = now();
      initialSnapshotCanvases["delete"](canvas);
      onDebug({
        scheduler: "command_capture",
        status: "completed",
        startedAt,
        completedAt,
        timestamp: completedAt,
        eligibleCanvasCount: 1,
        selectedCanvasCount: 0,
        skippedBudgetCount: 0,
        keepSessionAliveTriggered: false,
        results: [{
          canvasId,
          ok: false,
          reason: "snapshot_failed",
          priority: void 0
        }]
      });
    })["finally"](function() {
      queuedInitialSnapshotCanvases["delete"](canvas);
      if (runningInitialSnapshotCanvas === canvas) {
        runningInitialSnapshotCanvas = void 0;
      }
      runNextInitialSnapshot();
    });
  }
  if (recorder.patchSharedPrototype && window.CanvasRenderingContext2D && window.CanvasRenderingContext2D.prototype) {
    recorder.patchSharedPrototype(window.CanvasRenderingContext2D.prototype);
  }
  window.HTMLCanvasElement.prototype.getContext = function(contextType) {
    var context = originalGetContext.apply(this, arguments);
    if (contextType === "2d" && context && (!configuration.shouldRecordCanvas || configuration.shouldRecordCanvas(this) !== false)) {
      known2dContextsByCanvas.set(this, context);
      recorder.patchContext(context);
    }
    return context;
  };
  patchExistingCanvases();
  if (document.addEventListener && document.removeEventListener) {
    var onVisibilityChange = function onVisibilityChange2() {
      if (isDocumentHidden()) {
        if (recorder.pause) {
          recorder.pause();
        }
        return;
      }
      if (recorder.resume) {
        recorder.resume();
      }
      patchExistingCanvases();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    removeVisibilityListener = function removeVisibilityListener2() {
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }
  return {
    stop: function stop() {
      stopped = true;
      generation += 1;
      pendingInitialSnapshotCanvases = [];
      queuedInitialSnapshotCanvases = /* @__PURE__ */ new WeakSet();
      runningInitialSnapshotCanvas = void 0;
      window.HTMLCanvasElement.prototype.getContext = originalGetContext;
      removeVisibilityListener();
      recorder.stop();
    },
    reset: function reset() {
      generation += 1;
      initialSnapshotCanvases = /* @__PURE__ */ new WeakSet();
      queuedInitialSnapshotCanvases = /* @__PURE__ */ new WeakSet();
      pendingInitialSnapshotCanvases = [];
      runningInitialSnapshotCanvas = void 0;
      recorder.flush();
      if (recorder.reset) {
        recorder.reset();
      }
    },
    scanExistingCanvases: function scanExistingCanvases() {
      patchExistingCanvases();
    }
  };
}
function takeAutoCanvasSnapshots(getCanvases, snapshotCanvas) {
  var canvases = Array.prototype.slice.call(getCanvases());
  return canvases.reduce(function(chain, canvas) {
    return chain.then(function() {
      return Promise.resolve(snapshotCanvas(canvas))["catch"](function() {
      });
    });
  }, Promise.resolve());
}
var CONTINUOUS_CANVAS_MIN_SUCCESS_INTERVAL = 120;
function isContinuousCanvasRecordingEnabled(configuration) {
  return configuration.replayCanvasEnabled && configuration.replayCanvasMode === "auto" && configuration.replayCanvasSampling !== "all";
}
function getContinuousSnapshotCanvases(getCanvases, configuration) {
  return Array.prototype.slice.call(getCanvases()).filter(function(canvas) {
    if (!configuration.shouldRecordCanvas) {
      return true;
    }
    return configuration.shouldRecordCanvas(canvas) !== false;
  });
}
function startContinuousCanvasSnapshotLoop(options) {
  var configuration = options.configuration;
  var snapshotCanvas = options.snapshotCanvas;
  var now = options.now || Date.now;
  var getSerializedNodeId2 = options.getSerializedNodeId;
  var onDebug = options.onDebug || function() {
  };
  var getVisibilityState = options.getVisibilityState || function() {
    return document.visibilityState;
  };
  var getCanvases = options.getCanvases || function() {
    return document.querySelectorAll("canvas");
  };
  var addEventListenerImpl = options.addEventListenerImpl || addEventListener;
  var requestAnimationFrameImpl = options.requestAnimationFrameImpl || function(callback) {
    return window.requestAnimationFrame(callback);
  };
  var cancelAnimationFrameImpl = options.cancelAnimationFrameImpl || function(frameId2) {
    return window.cancelAnimationFrame(frameId2);
  };
  var stopped = false;
  var frameId;
  var snapshotInProgress = false;
  var visibilityChangeListener;
  var generation = 0;
  var pendingImmediateRunAfterReset = false;
  var lastSuccessfulSnapshotAtByCanvas = /* @__PURE__ */ new WeakMap();
  function notifyDebug(summary) {
    onDebug(summary);
  }
  function clearScheduledFrame() {
    if (frameId !== void 0) {
      cancelAnimationFrameImpl(frameId);
      frameId = void 0;
    }
  }
  function scheduleNextFrame() {
    if (stopped || frameId !== void 0 || getVisibilityState() === "hidden") {
      return;
    }
    frameId = requestAnimationFrameImpl(function() {
      frameId = void 0;
      runSnapshots();
    });
  }
  function stop() {
    stopped = true;
    if (visibilityChangeListener) {
      visibilityChangeListener.stop();
    }
    clearScheduledFrame();
  }
  function reset() {
    if (!isContinuousCanvasRecordingEnabled(configuration)) {
      return;
    }
    generation += 1;
    lastSuccessfulSnapshotAtByCanvas = /* @__PURE__ */ new WeakMap();
    clearScheduledFrame();
    pendingImmediateRunAfterReset = !stopped && getVisibilityState() !== "hidden";
    if (pendingImmediateRunAfterReset && !snapshotInProgress) {
      scheduleNextFrame();
    }
  }
  function requestResumeAfterPause() {
    if (stopped || getVisibilityState() === "hidden") {
      return;
    }
    if (snapshotInProgress) {
      pendingImmediateRunAfterReset = true;
      return;
    }
    scheduleNextFrame();
  }
  function runSnapshots() {
    if (stopped || snapshotInProgress) {
      return;
    }
    if (getVisibilityState() === "hidden") {
      notifyDebug({
        scheduler: "continuous_snapshot",
        status: "skipped_hidden",
        startedAt: now(),
        completedAt: now(),
        timestamp: now(),
        eligibleCanvasCount: 0,
        selectedCanvasCount: 0,
        skippedBudgetCount: 0,
        results: []
      });
      return;
    }
    var canvases = getContinuousSnapshotCanvases(getCanvases, configuration);
    if (!canvases.length) {
      notifyDebug({
        scheduler: "continuous_snapshot",
        status: "skipped_no_candidates",
        startedAt: now(),
        completedAt: now(),
        timestamp: now(),
        eligibleCanvasCount: 0,
        selectedCanvasCount: 0,
        skippedBudgetCount: 0,
        results: []
      });
      scheduleNextFrame();
      return;
    }
    var startedAt = now();
    var selectedCanvases = canvases.filter(function(canvas) {
      var lastSuccessfulSnapshotAt = lastSuccessfulSnapshotAtByCanvas.get(canvas);
      return lastSuccessfulSnapshotAt === void 0 || startedAt - lastSuccessfulSnapshotAt >= CONTINUOUS_CANVAS_MIN_SUCCESS_INTERVAL;
    });
    if (!selectedCanvases.length) {
      notifyDebug({
        scheduler: "continuous_snapshot",
        status: "skipped_no_candidates",
        startedAt,
        completedAt: now(),
        timestamp: now(),
        eligibleCanvasCount: canvases.length,
        selectedCanvasCount: 0,
        skippedBudgetCount: canvases.length,
        keepSessionAliveTriggered: false,
        results: []
      });
      scheduleNextFrame();
      return;
    }
    var summary = {
      scheduler: "continuous_snapshot",
      status: "completed",
      startedAt,
      eligibleCanvasCount: canvases.length,
      selectedCanvasCount: selectedCanvases.length,
      skippedBudgetCount: 0,
      keepSessionAliveTriggered: false,
      results: []
    };
    var runGeneration = generation;
    snapshotInProgress = true;
    takeAutoCanvasSnapshots(function() {
      return selectedCanvases;
    }, function(canvas) {
      if (runGeneration !== generation || getVisibilityState() === "hidden") {
        return {
          ok: false,
          reason: "skipped_hidden"
        };
      }
      var serializedNodeId = getSerializedNodeId2 ? getSerializedNodeId2(canvas) : void 0;
      return Promise.resolve(snapshotCanvas(canvas)).then(function(result) {
        if (runGeneration !== generation || getVisibilityState() === "hidden") {
          return result;
        }
        if (!result || result.ok !== false) {
          lastSuccessfulSnapshotAtByCanvas.set(canvas, now());
        }
        summary.results.push({
          canvasId: serializedNodeId,
          ok: !result || result.ok !== false,
          reason: result && result.ok === false ? result.reason : void 0,
          priority: void 0
        });
        return result;
      })["catch"](function() {
        var result = {
          ok: false,
          reason: "encode_failed"
        };
        if (runGeneration !== generation || getVisibilityState() === "hidden") {
          return result;
        }
        summary.results.push({
          canvasId: serializedNodeId,
          ok: false,
          reason: result.reason,
          priority: void 0
        });
        return result;
      });
    }).then(function() {
      snapshotInProgress = false;
      if (runGeneration !== generation) {
        if (pendingImmediateRunAfterReset) {
          pendingImmediateRunAfterReset = false;
          scheduleNextFrame();
        }
        return;
      }
      pendingImmediateRunAfterReset = false;
      summary.completedAt = now();
      summary.timestamp = summary.completedAt;
      notifyDebug(summary);
      scheduleNextFrame();
    }, function() {
      snapshotInProgress = false;
      if (runGeneration !== generation) {
        if (pendingImmediateRunAfterReset) {
          pendingImmediateRunAfterReset = false;
          scheduleNextFrame();
        }
        return;
      }
      pendingImmediateRunAfterReset = false;
      summary.completedAt = now();
      summary.timestamp = summary.completedAt;
      notifyDebug(summary);
      scheduleNextFrame();
    });
  }
  if (!isContinuousCanvasRecordingEnabled(configuration)) {
    return {
      stop,
      reset
    };
  }
  scheduleNextFrame();
  visibilityChangeListener = addEventListenerImpl(window, DOM_EVENT.VISIBILITY_CHANGE, function() {
    if (getVisibilityState() !== "hidden") {
      requestResumeAfterPause();
    } else {
      generation += 1;
      lastSuccessfulSnapshotAtByCanvas = /* @__PURE__ */ new WeakMap();
      pendingImmediateRunAfterReset = false;
      clearScheduledFrame();
    }
  }, {
    capture: true
  });
  return {
    stop,
    reset
  };
}
function _typeof$1(o) {
  "@babel/helpers - typeof";
  return _typeof$1 = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(o2) {
    return typeof o2;
  } : function(o2) {
    return o2 && "function" == typeof Symbol && o2.constructor === Symbol && o2 !== Symbol.prototype ? "symbol" : typeof o2;
  }, _typeof$1(o);
}
var MUTATION_EMIT_DELAY_MS = 16;
var MAX_MUTATION_EMIT_APPROX_BYTES = 2e5;
var CANVAS_DEBUG_HISTORY_LIMIT = 200;
function shouldUseCommandCapture(configuration) {
  return configuration.replayCanvasEnabled && configuration.replayCanvasMode === "auto" && configuration.replayCanvasSampling === "all";
}
function record(options) {
  var emit = options.emit;
  if (!emit) {
    throw new Error("emit function is required");
  }
  var elementsScrollPositions = createElementsScrollPositions();
  var replayPerformanceStats = createReplayPerformanceStats();
  var pendingMutationPayload;
  var pendingMutationTimeout;
  var updateReplayPerformanceStats = function updateReplayPerformanceStats2(delta) {
    accumulateReplayPerformanceStats(replayPerformanceStats, delta);
  };
  var mutationCb = function mutationCb2(mutation) {
    if (pendingMutationPayload && shouldFlushPendingMutationPayloadBeforeMerge(pendingMutationPayload, mutation)) {
      flushPendingMutations();
    }
    pendingMutationPayload = mergeMutationPayloads(pendingMutationPayload, mutation);
    scheduleMutationEmit();
  };
  function scheduleMutationEmit() {
    if (pendingMutationTimeout) {
      return;
    }
    pendingMutationTimeout = setTimeout(function() {
      pendingMutationTimeout = void 0;
      flushPendingMutations();
    }, MUTATION_EMIT_DELAY_MS);
  }
  function flushPendingMutations() {
    if (pendingMutationTimeout) {
      clearTimeout(pendingMutationTimeout);
      pendingMutationTimeout = void 0;
    }
    if (!pendingMutationPayload) {
      return;
    }
    var mutationPayloads = splitPendingMutationPayloadForEmit(pendingMutationPayload);
    pendingMutationPayload = void 0;
    updateReplayPerformanceStats(mutationPayloads.reduce(function(stats, mutationPayload) {
      stats.mutationCallbackCount += 1;
      stats.mutationRecordCount += countMutationPayloadRecords(mutationPayload);
      stats.mutationAddCount += mutationPayload.adds.length;
      stats.mutationRemoveCount += mutationPayload.removes.length;
      stats.mutationTextCount += mutationPayload.texts.length;
      stats.mutationAttributeCount += mutationPayload.attributes.length;
      return stats;
    }, {
      mutationCallbackCount: 0,
      mutationRecordCount: 0,
      mutationAddCount: 0,
      mutationRemoveCount: 0,
      mutationTextCount: 0,
      mutationAttributeCount: 0
    }));
    mutationPayloads.forEach(function(mutationPayload) {
      lastDomMutationForDebug = cloneDomMutationDebugResult(mutationPayload);
      pushCanvasDebugHistoryEntry(domMutationHistoryForDebug, lastDomMutationForDebug);
      emit(assembleIncrementalSnapshot(IncrementalSource.Mutation, mutationPayload));
    });
  }
  var inputCb = function inputCb2(s) {
    emit(assembleIncrementalSnapshot(IncrementalSource.Input, s));
  };
  var shadowRootsController = initShadowRootsController(options.configuration, {
    mutationCb,
    inputCb
  });
  var lastAutoCanvasSnapshotResult;
  var autoCanvasSnapshotDebugHistoryForDebug = [];
  var lastCanvasMutationForDebug;
  var canvasMutationHistoryForDebug = [];
  var lastDomMutationForDebug;
  var domMutationHistoryForDebug = [];
  var shouldUseCanvasCommandCapture = shouldUseCommandCapture(options.configuration);
  var canvasObserver = (options.createCanvasObserver || createCanvasObserver)({
    configuration: options.configuration,
    emit,
    onMutationDebug: function onMutationDebug(result) {
      lastCanvasMutationForDebug = cloneCanvasMutationDebugResult(result);
      pushCanvasDebugHistoryEntry(canvasMutationHistoryForDebug, lastCanvasMutationForDebug);
    }
  });
  var startCanvasSnapshotLoop = options.startContinuousCanvasSnapshotLoop || startContinuousCanvasSnapshotLoop;
  var canvasSnapshotLoop = shouldUseCanvasCommandCapture ? {
    stop: function stop() {
    },
    reset: function reset() {
    }
  } : startCanvasSnapshotLoop({
    configuration: options.configuration,
    getCanvases: function getCanvases() {
      return getSerializedCanvasNodes();
    },
    getSerializedNodeId: function getSerializedNodeId$1(canvas) {
      return getSerializedNodeId(canvas);
    },
    onDebug: function onDebug(result) {
      var keepSessionAliveTriggered = false;
      if (shouldKeepSessionAliveAfterAutoCanvasSnapshot(result) && options.sessionManager && options.sessionManager.keepSessionAlive) {
        options.sessionManager.keepSessionAlive();
        keepSessionAliveTriggered = true;
      }
      lastAutoCanvasSnapshotResult = cloneAutoCanvasSnapshotDebugResult(result, keepSessionAliveTriggered);
      pushCanvasDebugHistoryEntry(autoCanvasSnapshotDebugHistoryForDebug, lastAutoCanvasSnapshotResult);
    },
    snapshotCanvas: function snapshotCanvas(canvas) {
      return canvasObserver.snapshot(canvas, {
        trigger: "auto",
        scheduler: "continuous_snapshot"
      });
    }
  });
  var canvasCommandCapture = (options.startCanvasCommandCapture || startCanvasCommandCapture)({
    configuration: options.configuration,
    emit,
    snapshotCanvas: function snapshotCanvas(canvas, snapshotOptions) {
      return canvasObserver.snapshot(canvas, snapshotOptions);
    },
    getCanvases: function getCanvases() {
      return getSerializedCanvasNodes();
    },
    getSerializedNodeId: function getSerializedNodeId$1(canvas) {
      return getSerializedNodeId(canvas);
    },
    onDebug: function onDebug(result) {
      var keepSessionAliveTriggered = false;
      if (shouldKeepSessionAliveAfterAutoCanvasSnapshot(result) && options.sessionManager && options.sessionManager.keepSessionAlive) {
        options.sessionManager.keepSessionAlive();
        keepSessionAliveTriggered = true;
      }
      lastAutoCanvasSnapshotResult = cloneAutoCanvasSnapshotDebugResult(result, keepSessionAliveTriggered);
      pushCanvasDebugHistoryEntry(autoCanvasSnapshotDebugHistoryForDebug, lastAutoCanvasSnapshotResult);
    },
    onMutationDebug: function onMutationDebug(result) {
      lastCanvasMutationForDebug = cloneCanvasMutationDebugResult(result);
      pushCanvasDebugHistoryEntry(canvasMutationHistoryForDebug, lastCanvasMutationForDebug);
    }
  });
  var takeFullSnapshot = function takeFullSnapshot2(timestamp, serializationContext) {
    if (typeof timestamp === "undefined") {
      timestamp = timeStampNow();
    }
    if (typeof serializationContext === "undefined") {
      serializationContext = {
        status: SerializationContextStatus.INITIAL_FULL_SNAPSHOT,
        elementsScrollPositions,
        shadowRootsController
      };
    }
    var _viewportDimension = getViewportDimension();
    var width = _viewportDimension.width;
    var height = _viewportDimension.height;
    emit({
      data: {
        height,
        href: window.location.href,
        width
      },
      type: RecordType.Meta,
      timestamp
    });
    emit({
      data: {
        has_focus: document.hasFocus()
      },
      type: RecordType.Focus,
      timestamp
    });
    emit({
      data: {
        node: serializeDocument(document, options.configuration, serializationContext),
        initialOffset: {
          left: getScrollX(),
          top: getScrollY()
        }
      },
      type: RecordType.FullSnapshot,
      timestamp
    });
    if (window.visualViewport) {
      emit({
        data: getVisualViewport(),
        type: RecordType.VisualViewport,
        timestamp
      });
    }
  };
  takeFullSnapshot();
  if (canvasCommandCapture.scanExistingCanvases) {
    canvasCommandCapture.scanExistingCanvases();
  }
  var _initObservers = initObservers({
    lifeCycle: options.lifeCycle,
    configuration: options.configuration,
    elementsScrollPositions,
    inputCb,
    mediaInteractionCb: function mediaInteractionCb(p) {
      emit(assembleIncrementalSnapshot(IncrementalSource.MediaInteraction, p));
    },
    mouseInteractionCb: function mouseInteractionCb(mouseInteractionRecord) {
      emit(mouseInteractionRecord);
    },
    mousemoveCb: function mousemoveCb(positions, source) {
      emit(assembleIncrementalSnapshot(source, {
        positions
      }));
    },
    mutationCb,
    mutationPerfCb: updateReplayPerformanceStats,
    scrollCb: function scrollCb(p) {
      emit(assembleIncrementalSnapshot(IncrementalSource.Scroll, p));
    },
    styleSheetCb: function styleSheetCb(r) {
      emit(assembleIncrementalSnapshot(IncrementalSource.StyleSheetRule, r));
    },
    viewportResizeCb: function viewportResizeCb(d) {
      emit(assembleIncrementalSnapshot(IncrementalSource.ViewportResize, d));
    },
    frustrationCb: function frustrationCb(frustrationRecord) {
      emit(frustrationRecord);
    },
    focusCb: function focusCb(data) {
      emit({
        data,
        type: RecordType.Focus,
        timestamp: timeStampNow()
      });
    },
    visualViewportResizeCb: function visualViewportResizeCb(data) {
      emit({
        data,
        type: RecordType.VisualViewport,
        timestamp: timeStampNow()
      });
    },
    shadowRootsController
  });
  var stopObservers = _initObservers.stop;
  var flushMutationsFromObservers = _initObservers.flush;
  var resetMutationsFromObservers = _initObservers.reset || function() {
  };
  function flushMutations() {
    shadowRootsController.flush();
    flushMutationsFromObservers();
    flushPendingMutations();
  }
  return {
    stop: function stop() {
      flushPendingMutations();
      shadowRootsController.stop();
      canvasCommandCapture.stop();
      canvasObserver.stop();
      stopCanvasSnapshots(canvasSnapshotLoop);
      stopObservers();
    },
    snapshotCanvas: function snapshotCanvas(canvas, snapshotOptions) {
      return canvasObserver.snapshot(canvas, assign({
        trigger: "manual"
      }, snapshotOptions));
    },
    getSerializedNodeIdForDebug: function getSerializedNodeIdForDebug(node) {
      return getSerializedNodeId(node);
    },
    getLastAutoCanvasSnapshotResultForDebug: function getLastAutoCanvasSnapshotResultForDebug() {
      return cloneAutoCanvasSnapshotDebugResult(lastAutoCanvasSnapshotResult);
    },
    getAutoCanvasSnapshotDebugHistoryForDebug: function getAutoCanvasSnapshotDebugHistoryForDebug() {
      return autoCanvasSnapshotDebugHistoryForDebug.map(cloneAutoCanvasSnapshotDebugResult);
    },
    getLastCanvasMutationForDebug: function getLastCanvasMutationForDebug() {
      return cloneCanvasMutationDebugResult(lastCanvasMutationForDebug);
    },
    getCanvasMutationHistoryForDebug: function getCanvasMutationHistoryForDebug() {
      return canvasMutationHistoryForDebug.map(cloneCanvasMutationDebugResult);
    },
    getLastDomMutationForDebug: function getLastDomMutationForDebug() {
      return cloneDomMutationDebugResult(lastDomMutationForDebug);
    },
    getDomMutationHistoryForDebug: function getDomMutationHistoryForDebug() {
      return domMutationHistoryForDebug.map(cloneDomMutationDebugResult);
    },
    getReplayPerformanceForDebug: function getReplayPerformanceForDebug() {
      return cloneReplayPerformanceStats(replayPerformanceStats);
    },
    takeSubsequentFullSnapshot: function takeSubsequentFullSnapshot(timestamp) {
      flushMutations();
      resetMutationsFromObservers();
      if (canvasObserver.reset) {
        canvasObserver.reset();
      }
      if (canvasCommandCapture.reset) {
        canvasCommandCapture.reset();
      }
      resetCanvasSnapshots(canvasSnapshotLoop);
      takeFullSnapshot(timestamp, {
        shadowRootsController,
        status: SerializationContextStatus.SUBSEQUENT_FULL_SNAPSHOT,
        elementsScrollPositions
      });
      if (canvasCommandCapture.scanExistingCanvases) {
        canvasCommandCapture.scanExistingCanvases();
      }
    },
    flushMutations,
    shadowRootsController
  };
}
function materializeMutationPayload(pendingMutationPayload) {
  return {
    adds: pendingMutationPayload.adds,
    removes: pendingMutationPayload.removes,
    texts: pendingMutationPayload.texts,
    attributes: pendingMutationPayload.attributes
  };
}
function createEmptyMutationPayload() {
  return {
    adds: [],
    removes: [],
    texts: [],
    attributes: [],
    approxBytes: 0,
    addsApproxBytes: 0,
    removesApproxBytes: 0,
    textsApproxBytes: 0,
    attributesApproxBytes: 0,
    addApproxBytes: [],
    removesByKey: /* @__PURE__ */ new Map(),
    removeApproxBytesByKey: /* @__PURE__ */ new Map(),
    textsById: /* @__PURE__ */ new Map(),
    textApproxBytesById: /* @__PURE__ */ new Map(),
    attributesById: /* @__PURE__ */ new Map(),
    attributeApproxBytesById: /* @__PURE__ */ new Map()
  };
}
function mergeMutationPayloads(target, source) {
  var merged = target || createEmptyMutationPayload();
  mergeAddMutations(merged, source.adds);
  mergeRemoveMutations(merged, source.removes);
  mergeTextMutations(merged, source.texts);
  mergeAttributeMutations(merged, source.attributes);
  updateMutationPayloadApproxBytes(merged);
  return merged;
}
function mergeAddMutations(merged, sourceAdds) {
  if (!sourceAdds.length) {
    return;
  }
  sourceAdds.forEach(function(add) {
    var addApproxBytes = estimateMutationEntryBytes(add);
    merged.adds.push(add);
    merged.addApproxBytes.push(addApproxBytes);
    merged.addsApproxBytes += addApproxBytes;
  });
}
function mergeRemoveMutations(merged, sourceRemoves) {
  if (!sourceRemoves.length) {
    return;
  }
  sourceRemoves.forEach(function(remove) {
    var key = getRemoveMutationKey(remove);
    if (!merged.removesByKey.has(key)) {
      merged.removes.push(remove);
      var removeApproxBytes = estimateMutationEntryBytes(remove);
      merged.removeApproxBytesByKey.set(key, removeApproxBytes);
      merged.removesApproxBytes += removeApproxBytes;
    }
    merged.removesByKey.set(key, remove);
  });
}
function mergeTextMutations(merged, sourceTexts) {
  if (!sourceTexts.length) {
    return;
  }
  sourceTexts.forEach(function(textMutation) {
    var existingTextMutation = merged.textsById.get(textMutation.id);
    if (existingTextMutation) {
      merged.textsApproxBytes -= merged.textApproxBytesById.get(textMutation.id) || 0;
      existingTextMutation.value = textMutation.value;
      var nextTextApproxBytes = estimateMutationEntryBytes(existingTextMutation);
      merged.textApproxBytesById.set(textMutation.id, nextTextApproxBytes);
      merged.textsApproxBytes += nextTextApproxBytes;
      return;
    }
    merged.texts.push(textMutation);
    merged.textsById.set(textMutation.id, textMutation);
    var textApproxBytes = estimateMutationEntryBytes(textMutation);
    merged.textApproxBytesById.set(textMutation.id, textApproxBytes);
    merged.textsApproxBytes += textApproxBytes;
  });
}
function mergeAttributeMutations(merged, sourceAttributes) {
  if (!sourceAttributes.length) {
    return;
  }
  sourceAttributes.forEach(function(attributeMutation) {
    var existingAttributeMutation = merged.attributesById.get(attributeMutation.id);
    if (!existingAttributeMutation) {
      var nextAttributeMutation = {
        id: attributeMutation.id,
        attributes: assign({}, attributeMutation.attributes)
      };
      merged.attributes.push(nextAttributeMutation);
      merged.attributesById.set(attributeMutation.id, nextAttributeMutation);
      var attributeApproxBytes = estimateMutationEntryBytes(nextAttributeMutation);
      merged.attributeApproxBytesById.set(attributeMutation.id, attributeApproxBytes);
      merged.attributesApproxBytes += attributeApproxBytes;
      return;
    }
    merged.attributesApproxBytes -= merged.attributeApproxBytesById.get(attributeMutation.id) || 0;
    existingAttributeMutation.attributes = assign(existingAttributeMutation.attributes, attributeMutation.attributes);
    var nextAttributeApproxBytes = estimateMutationEntryBytes(existingAttributeMutation);
    merged.attributeApproxBytesById.set(attributeMutation.id, nextAttributeApproxBytes);
    merged.attributesApproxBytes += nextAttributeApproxBytes;
  });
}
function getRemoveMutationKey(remove) {
  return remove.parentId + ":" + remove.id;
}
function shouldFlushPendingMutationPayloadBeforeMerge(target, source) {
  return target.approxBytes + estimateMutationPayloadBytes(source) > MAX_MUTATION_EMIT_APPROX_BYTES;
}
function splitPendingMutationPayloadForEmit(pendingMutationPayload) {
  var mutation = materializeMutationPayload(pendingMutationPayload);
  if (!mutation.adds.length || pendingMutationPayload.approxBytes <= MAX_MUTATION_EMIT_APPROX_BYTES) {
    return [mutation];
  }
  var addOnlyPayloads = [];
  var currentAdds = [];
  var currentAddsBytes = BASE_MUTATION_PAYLOAD_APPROX_BYTES;
  mutation.adds.forEach(function(add, index) {
    var addBytes = pendingMutationPayload.addApproxBytes[index];
    if (currentAdds.length && currentAddsBytes + addBytes > MAX_MUTATION_EMIT_APPROX_BYTES) {
      addOnlyPayloads.push({
        adds: currentAdds,
        removes: [],
        texts: [],
        attributes: []
      });
      currentAdds = [];
      currentAddsBytes = BASE_MUTATION_PAYLOAD_APPROX_BYTES;
    }
    currentAdds.push(add);
    currentAddsBytes += addBytes;
  });
  if (currentAdds.length) {
    addOnlyPayloads.push({
      adds: currentAdds,
      removes: [],
      texts: [],
      attributes: []
    });
  }
  if (mutation.removes.length || mutation.texts.length || mutation.attributes.length) {
    addOnlyPayloads.push({
      adds: [],
      removes: mutation.removes,
      texts: mutation.texts,
      attributes: mutation.attributes
    });
  }
  return addOnlyPayloads;
}
var BASE_MUTATION_PAYLOAD_APPROX_BYTES = 64;
function estimateMutationPayloadBytes(mutation) {
  return BASE_MUTATION_PAYLOAD_APPROX_BYTES + estimateMutationEntriesBytes(mutation.adds) + estimateMutationEntriesBytes(mutation.removes) + estimateMutationEntriesBytes(mutation.texts) + estimateMutationEntriesBytes(mutation.attributes);
}
function estimateMutationEntryBytes(entry) {
  return JSON.stringify(entry).length;
}
function estimateMutationEntriesBytes(entries) {
  var total = 0;
  for (var i = 0; i < entries.length; i += 1) {
    total += estimateMutationEntryBytes(entries[i]);
  }
  return total;
}
function updateMutationPayloadApproxBytes(mutationPayload) {
  mutationPayload.approxBytes = BASE_MUTATION_PAYLOAD_APPROX_BYTES + mutationPayload.addsApproxBytes + mutationPayload.removesApproxBytes + mutationPayload.textsApproxBytes + mutationPayload.attributesApproxBytes;
}
function createReplayPerformanceStats() {
  return {
    processMutationsCount: 0,
    processMutationsDuration: 0,
    mutationCallbackCount: 0,
    mutationRecordCount: 0,
    mutationAddCount: 0,
    mutationRemoveCount: 0,
    mutationTextCount: 0,
    mutationAttributeCount: 0
  };
}
function accumulateReplayPerformanceStats(stats, delta) {
  if (!delta) {
    return;
  }
  stats.processMutationsCount += delta.processMutationsCount || 0;
  stats.processMutationsDuration += delta.processMutationsDuration || 0;
  stats.mutationCallbackCount += delta.mutationCallbackCount || 0;
  stats.mutationRecordCount += delta.mutationRecordCount || 0;
  stats.mutationAddCount += delta.mutationAddCount || 0;
  stats.mutationRemoveCount += delta.mutationRemoveCount || 0;
  stats.mutationTextCount += delta.mutationTextCount || 0;
  stats.mutationAttributeCount += delta.mutationAttributeCount || 0;
}
function countMutationPayloadRecords(mutation) {
  return mutation.adds.length + mutation.removes.length + mutation.texts.length + mutation.attributes.length;
}
function cloneReplayPerformanceStats(stats) {
  if (!stats) {
    return stats;
  }
  return {
    processMutationsCount: stats.processMutationsCount,
    processMutationsDuration: Math.round(stats.processMutationsDuration * 10) / 10,
    mutationCallbackCount: stats.mutationCallbackCount,
    mutationRecordCount: stats.mutationRecordCount,
    mutationAddCount: stats.mutationAddCount,
    mutationRemoveCount: stats.mutationRemoveCount,
    mutationTextCount: stats.mutationTextCount,
    mutationAttributeCount: stats.mutationAttributeCount
  };
}
function pushCanvasDebugHistoryEntry(history2, entry) {
  if (!entry) {
    return;
  }
  history2.push(entry);
  if (history2.length > CANVAS_DEBUG_HISTORY_LIMIT) {
    history2.shift();
  }
}
function stopCanvasSnapshots(canvasSnapshotLoop) {
  if (typeof canvasSnapshotLoop === "function") {
    canvasSnapshotLoop();
    return;
  }
  if (canvasSnapshotLoop && canvasSnapshotLoop.stop) {
    canvasSnapshotLoop.stop();
  }
}
function resetCanvasSnapshots(canvasSnapshotLoop) {
  if (canvasSnapshotLoop && canvasSnapshotLoop.reset) {
    canvasSnapshotLoop.reset();
  }
}
function shouldKeepSessionAliveAfterAutoCanvasSnapshot(result) {
  return !!(result && result.status === "completed" && result.selectedCanvasCount > 0 && (result.results || []).some(function(entry) {
    return isKeepAliveWorthyAutoCanvasResult(entry);
  }));
}
function isKeepAliveWorthyAutoCanvasResult(entry) {
  return !!(entry && (entry.ok || entry.reason === "unchanged" || entry.reason === "below_threshold"));
}
function cloneAutoCanvasSnapshotDebugResult(result, keepSessionAliveTriggered) {
  if (!result) {
    return result;
  }
  if (typeof keepSessionAliveTriggered === "undefined") {
    keepSessionAliveTriggered = result.keepSessionAliveTriggered;
  }
  return {
    scheduler: result.scheduler,
    status: result.status,
    startedAt: typeof result.startedAt === "number" ? result.startedAt : result.timestamp,
    completedAt: typeof result.completedAt === "number" ? result.completedAt : result.timestamp,
    timestamp: result.timestamp,
    eligibleCanvasCount: result.eligibleCanvasCount,
    selectedCanvasCount: result.selectedCanvasCount,
    skippedBudgetCount: result.skippedBudgetCount,
    keepSessionAliveTriggered: !!keepSessionAliveTriggered,
    results: (result.results || []).map(function(entry) {
      return {
        canvasId: entry.canvasId,
        ok: entry.ok,
        reason: entry.reason,
        priority: entry.priority
      };
    })
  };
}
function cloneCanvasMutationDebugResult(result) {
  if (!result) {
    return result;
  }
  var clonedResult = {
    timestamp: result.timestamp,
    canvasId: result.canvasId,
    trigger: result.trigger,
    encodedBytesCount: result.encodedBytesCount,
    approxBytesCount: result.approxBytesCount,
    commandCount: result.commandCount,
    width: result.width,
    height: result.height
  };
  if (typeof result.reason !== "undefined") {
    clonedResult.reason = result.reason;
  }
  if (typeof result.diagnostics !== "undefined") {
    clonedResult.diagnostics = result.diagnostics;
  }
  return clonedResult;
}
function cloneDomMutationDebugResult(result) {
  if (!result) {
    return result;
  }
  return {
    timestamp: typeof result.timestamp === "number" ? result.timestamp : timeStampNow(),
    adds: (result.adds || []).map(cloneDebugValue),
    removes: (result.removes || []).map(cloneDebugValue),
    texts: (result.texts || []).map(cloneDebugValue),
    attributes: (result.attributes || []).map(cloneDebugValue),
    addsCount: (result.adds || []).length,
    removesCount: (result.removes || []).length,
    textsCount: (result.texts || []).length,
    attributesCount: (result.attributes || []).length
  };
}
function cloneDebugValue(value) {
  if (!value || _typeof$1(value) !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(cloneDebugValue);
  }
  return Object.keys(value).reduce(function(accumulator, key) {
    accumulator[key] = cloneDebugValue(value[key]);
    return accumulator;
  }, {});
}
function startRecordBridge(viewHistory) {
  var bridge = getEventBridge();
  return {
    addRecord: function addRecord2(record2) {
      var view = viewHistory.findView();
      bridge.send("session_replay", record2, view.id);
    }
  };
}
function _typeof(o) {
  "@babel/helpers - typeof";
  return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(o2) {
    return typeof o2;
  } : function(o2) {
    return o2 && "function" == typeof Symbol && o2.constructor === Symbol && o2 !== Symbol.prototype ? "symbol" : typeof o2;
  }, _typeof(o);
}
function buildReplayPayload(data, metadata, rawSegmentBytesCount) {
  var formData = new FormData();
  formData.append("segment", new Blob([data], {
    type: "application/octet-stream"
  }), metadata.session.id + "-" + metadata.start);
  toFormEntries(metadata, function(key, value) {
    formData.append(key, value);
  });
  formData.append("raw_segment_size", rawSegmentBytesCount);
  return {
    data: formData,
    bytesCount: data.byteLength
  };
}
function toFormEntries(input, onEntry, prefix) {
  if (prefix === void 0) {
    prefix = "";
  }
  each(objectEntries(input), function(item) {
    var value = item[1];
    var key = item[0];
    if (_typeof(value) === "object" && value !== null) {
      toFormEntries(value, onEntry, "" + prefix + key + "_");
    } else {
      onEntry("" + prefix + key, String(value));
    }
  });
}
var MAX_STATS_HISTORY = 10;
var statsPerView;
function getSegmentsCount(viewId) {
  return getOrCreateReplayStats(viewId).segments_count;
}
function addSegment(viewId) {
  getOrCreateReplayStats(viewId).segments_count += 1;
}
function addRecord(viewId) {
  getOrCreateReplayStats(viewId).records_count += 1;
}
function addWroteData(viewId, additionalBytesCount) {
  getOrCreateReplayStats(viewId).segments_total_raw_size += additionalBytesCount;
}
function getReplayStats(viewId) {
  return statsPerView && statsPerView.get(viewId);
}
function getOrCreateReplayStats(viewId) {
  if (!statsPerView) {
    statsPerView = /* @__PURE__ */ new Map();
  }
  var replayStats;
  if (statsPerView.has(viewId)) {
    replayStats = statsPerView.get(viewId);
  } else {
    replayStats = {
      records_count: 0,
      segments_count: 0,
      segments_total_raw_size: 0
    };
    statsPerView.set(viewId, replayStats);
    if (statsPerView.size > MAX_STATS_HISTORY) {
      deleteOldestStats();
    }
  }
  return replayStats;
}
function deleteOldestStats() {
  if (!statsPerView) {
    return;
  }
  if (statsPerView.keys) {
    statsPerView["delete"](statsPerView.keys().next().value);
  } else {
    var isFirst = true;
    statsPerView.forEach(function(_value, key) {
      if (isFirst) {
        statsPerView["delete"](key);
        isFirst = false;
      }
    });
  }
}
function createSegment(options) {
  var context = options.context;
  var creationReason = options.creationReason;
  var encoder = options.encoder;
  var encodedBytesCount = 0;
  var viewId = context.view.id;
  var recordCountsByType = {};
  var metadata = assign({
    start: Infinity,
    end: -Infinity,
    creation_reason: creationReason,
    records_count: 0,
    has_full_snapshot: false,
    index_in_view: getSegmentsCount(viewId),
    source: "browser"
  }, context);
  addSegment(viewId);
  function addRecord$1(record2, callback) {
    metadata.start = Math.min(metadata.start, record2.timestamp);
    metadata.end = Math.max(metadata.end, record2.timestamp);
    metadata.records_count += 1;
    incrementRecordCount(recordCountsByType, getRecordDebugType(record2));
    if (!metadata.has_full_snapshot) {
      metadata.has_full_snapshot = record2.type === RecordType.FullSnapshot;
    }
    addRecord(metadata.view.id);
    var prefix = encoder.isEmpty() ? '{"records":[' : ",";
    encoder.write(prefix + JSON.stringify(record2), function(additionalEncodedBytesCount) {
      encodedBytesCount += additionalEncodedBytesCount;
      callback(encodedBytesCount);
    });
  }
  function flush(callback) {
    if (encoder.isEmpty()) {
      throw new Error("Empty segment flushed");
    }
    encoder.write("]," + JSON.stringify(metadata).slice(1) + "\n");
    encoder.finish(function(encoderResult) {
      addWroteData(metadata.view.id, encoderResult.rawBytesCount);
      callback(metadata, encoderResult, assign({}, recordCountsByType));
    });
  }
  return {
    addRecord: addRecord$1,
    flush
  };
}
function incrementRecordCount(recordCountsByType, recordDebugType) {
  recordCountsByType[recordDebugType] = (recordCountsByType[recordDebugType] || 0) + 1;
}
function getRecordDebugType(record2) {
  if (!record2) {
    return "other";
  }
  switch (record2.type) {
    case RecordType.FullSnapshot:
      return "full_snapshot";
    case RecordType.Meta:
      return "meta";
    case RecordType.Focus:
      return "focus";
    case RecordType.ViewEnd:
      return "view_end";
    case RecordType.VisualViewport:
      return "visual_viewport";
    case RecordType.FrustrationRecord:
      return "frustration_record";
    case RecordType.IncrementalSnapshot:
      return getIncrementalRecordDebugType(record2);
    default:
      return "other";
  }
}
function getIncrementalRecordDebugType(record2) {
  if (!record2.data) {
    return "incremental_unknown";
  }
  switch (record2.data.source) {
    case IncrementalSource.Mutation:
      return "mutation";
    case IncrementalSource.MouseMove:
      return "mouse_move";
    case IncrementalSource.MouseInteraction:
      return "mouse_interaction";
    case IncrementalSource.Scroll:
      return "scroll";
    case IncrementalSource.ViewportResize:
      return "viewport_resize";
    case IncrementalSource.Input:
      return "input";
    case IncrementalSource.TouchMove:
      return "touch_move";
    case IncrementalSource.MediaInteraction:
      return "media_interaction";
    case IncrementalSource.StyleSheetRule:
      return "style_sheet_rule";
    case IncrementalSource.CanvasMutation:
      return "canvas_mutation";
    default:
      return "incremental_unknown";
  }
}
var SEGMENT_DURATION_LIMIT = 5 * ONE_SECOND;
var SEGMENT_BYTES_LIMIT = 6e4;
function startSegmentCollection(lifeCycle, configuration, sessionManager, viewContexts, httpRequest, encoder) {
  var isLocked = arguments.length > 6 && arguments[6] !== void 0 ? arguments[6] : false;
  var additionalOptions = arguments.length > 7 ? arguments[7] : void 0;
  return doStartSegmentCollection(lifeCycle, function() {
    return computeSegmentContext(configuration, sessionManager, viewContexts);
  }, httpRequest, encoder, isLocked, assign({
    flushCanvasImmediately: configuration.replayCanvasFlushImmediately,
    onSegmentFlushed: void 0
  }, additionalOptions));
}
var SegmentCollectionStatus = {
  WaitingForInitialRecord: 0,
  SegmentPending: 1,
  Stopped: 2
};
function doStartSegmentCollection(lifeCycle, getSegmentContext, httpRequest, encoder, isLocked, options) {
  if (options === void 0) {
    options = {};
  }
  var state2 = {
    status: SegmentCollectionStatus.WaitingForInitialRecord,
    nextSegmentCreationReason: "init",
    isLocked
  };
  var subscribeViewCreated = lifeCycle.subscribe(LifeCycleEventType.VIEW_CREATED, function() {
    flushSegment("view_change");
  });
  var unsubscribeViewCreated = subscribeViewCreated.unsubscribe;
  var subscribePageExited = lifeCycle.subscribe(LifeCycleEventType.PAGE_EXITED, function(pageExitEvent) {
    flushSegment(pageExitEvent.reason);
  });
  var unsubscribePageExited = subscribePageExited.unsubscribe;
  var lockedFlushReason = ["view_change", "buffer_checkout"];
  function flushSegment(flushReason, callback) {
    var isLocked2 = state2.isLocked;
    if (state2.status === SegmentCollectionStatus.SegmentPending) {
      if (isLocked2 && lockedFlushReason.includes(flushReason)) {
        state2.segment.flush(function() {
          if (callback) callback();
        });
      } else {
        if (isLocked2) {
          return;
        }
        state2.segment.flush(function(metadata, encoderResult, recordCountsByType) {
          if (options.onSegmentFlushed) {
            options.onSegmentFlushed({
              creationReason: metadata.creation_reason,
              flushReason,
              recordsCount: metadata.records_count,
              recordCountsByType,
              start: metadata.start,
              end: metadata.end,
              indexInView: metadata.index_in_view,
              rawBytesCount: encoderResult.rawBytesCount
            });
          }
          var payload = buildReplayPayload(encoderResult.output, metadata, encoderResult.rawBytesCount);
          if (isPageExitReason(flushReason)) {
            httpRequest.sendOnExit(payload);
          } else {
            httpRequest.send(payload);
          }
        });
      }
      clearTimeout$1(state2.expirationTimeoutId);
    }
    if (flushReason !== "stop") {
      state2 = {
        status: SegmentCollectionStatus.WaitingForInitialRecord,
        nextSegmentCreationReason: flushReason,
        isLocked: state2.isLocked
      };
    } else {
      state2 = {
        status: SegmentCollectionStatus.Stopped,
        isLocked: false
      };
    }
  }
  return {
    addRecord: function addRecord2(record2) {
      if (state2.status === SegmentCollectionStatus.Stopped) {
        return;
      }
      if (state2.status === SegmentCollectionStatus.WaitingForInitialRecord) {
        var context = getSegmentContext();
        if (!context) {
          return;
        }
        state2 = {
          status: SegmentCollectionStatus.SegmentPending,
          segment: createSegment({
            encoder,
            context,
            creationReason: state2.nextSegmentCreationReason
          }),
          isLocked: state2.isLocked,
          expirationTimeoutId: setTimeout$1(function() {
            flushSegment("segment_duration_limit");
          }, SEGMENT_DURATION_LIMIT)
        };
      }
      state2.segment.addRecord(record2, function(encodedBytesCount) {
        if (encodedBytesCount > SEGMENT_BYTES_LIMIT) {
          flushSegment("segment_bytes_limit");
        }
      });
      if (options.flushCanvasImmediately && isCanvasMutationRecord(record2) && state2.status === SegmentCollectionStatus.SegmentPending) {
        flushSegment("canvas_snapshot");
      }
    },
    unlockSegment: function unlockSegment() {
      state2.isLocked = false;
    },
    flushBufferSegment: function flushBufferSegment(callback) {
      flushSegment("buffer_checkout", callback);
    },
    isLocked: function isLocked2() {
      return state2.isLocked;
    },
    stop: function stop() {
      flushSegment("stop");
      unsubscribeViewCreated();
      unsubscribePageExited();
    }
  };
}
function isCanvasMutationRecord(record2) {
  return record2 && record2.type === RecordType.IncrementalSnapshot && record2.data && record2.data.source === IncrementalSource.CanvasMutation;
}
function computeSegmentContext(configuration, sessionManager, viewContexts) {
  var session = sessionManager.findTrackedSession();
  var viewContext = viewContexts.findView();
  if (!session || !viewContext) {
    return void 0;
  }
  return {
    sdk: {
      name: configuration.sdkName,
      version: configuration.sdkVersion
    },
    env: configuration.env || "",
    service: viewContext.service || configuration.service || "browser",
    version: viewContext.version || configuration.version || "",
    app: {
      id: configuration.applicationId
    },
    session: {
      id: session.id
    },
    view: {
      id: viewContext.id
    }
  };
}
var BUFFER_CHECKOUT_TIME = 60 * ONE_SECOND;
var REPLAY_SEGMENT_FLUSH_HISTORY_LIMIT = 10;
function startRecording(lifeCycle, configuration, sessionManager, viewContexts, encoder, httpRequest) {
  var cleanupTasks2 = [];
  var lastReplaySegmentFlushForDebug;
  var replaySegmentFlushHistoryForDebug = [];
  var replaySegmentFlushCount = 0;
  var reportError = function reportError2(error) {
    lifeCycle.notify(LifeCycleEventType.RAW_ERROR_COLLECTED, {
      error
    });
    addTelemetryDebug("Error reported to customer", {
      "error.message": error.message
    });
  };
  var replayRequest = httpRequest || createHttpRequest(configuration.sessionReplayEndPoint, SEGMENT_BYTES_LIMIT, configuration.retryMaxSize, reportError);
  var addRecord2, _record;
  if (!canUseEventBridge()) {
    var session = sessionManager.findTrackedSession();
    var isRecordErrorSessionReplay = session && session.errorSessionReplayAllowed && !session.sessionHasError;
    var segmentCollection = startSegmentCollection(lifeCycle, configuration, sessionManager, viewContexts, replayRequest, encoder, isRecordErrorSessionReplay, {
      onSegmentFlushed: function onSegmentFlushed(segmentFlush) {
        replaySegmentFlushCount += 1;
        lastReplaySegmentFlushForDebug = cloneReplaySegmentFlushForDebug(segmentFlush, replaySegmentFlushCount);
        replaySegmentFlushHistoryForDebug.push(lastReplaySegmentFlushForDebug);
        if (replaySegmentFlushHistoryForDebug.length > REPLAY_SEGMENT_FLUSH_HISTORY_LIMIT) {
          replaySegmentFlushHistoryForDebug.shift();
        }
      }
    });
    addRecord2 = segmentCollection.addRecord;
    var flushBufferSegment = segmentCollection.flushBufferSegment;
    var unlockSegment = segmentCollection.unlockSegment;
    cleanupTasks2.push(segmentCollection.stop);
    if (isRecordErrorSessionReplay) {
      sessionManager.sessionStateUpdateObservable.subscribe(function(_ref) {
        var previousState = _ref.previousState, newState = _ref.newState;
        if (!previousState.hasError && newState.hasError) {
          isRecordErrorSessionReplay = false;
          unlockSegment();
        }
      });
    }
    var lastFullSnapshotEvent = null;
    var wrappedEmit = function wrappedEmit2(recordData) {
      addRecord2(recordData);
      if (isRecordErrorSessionReplay) {
        if (recordData.type === RecordType.FullSnapshot) {
          lastFullSnapshotEvent = recordData;
        } else if (recordData.type === RecordType.IncrementalSnapshot) {
          var exceedTime = recordData.timestamp - lastFullSnapshotEvent.timestamp > BUFFER_CHECKOUT_TIME;
          if (exceedTime) {
            flushBufferSegment(function() {
              deleteOldestStats();
              takeSubsequentFullSnapshot();
            });
          }
        }
      }
    };
    _record = record({
      emit: wrappedEmit,
      configuration,
      lifeCycle,
      sessionManager
    });
  } else {
    var _startRecordBridge = startRecordBridge(viewContexts);
    addRecord2 = _startRecordBridge.addRecord;
    _record = record({
      emit: addRecord2,
      configuration,
      lifeCycle,
      sessionManager
    });
  }
  cleanupTasks2.push(_record.stop);
  var takeSubsequentFullSnapshot = _record.takeSubsequentFullSnapshot;
  var snapshotCanvas = _record.snapshotCanvas;
  var getSerializedNodeIdForDebug = _record.getSerializedNodeIdForDebug;
  var getLastAutoCanvasSnapshotResultForDebug = _record.getLastAutoCanvasSnapshotResultForDebug;
  var getAutoCanvasSnapshotDebugHistoryForDebug = _record.getAutoCanvasSnapshotDebugHistoryForDebug;
  var getLastCanvasMutationForDebug = _record.getLastCanvasMutationForDebug;
  var getCanvasMutationHistoryForDebug = _record.getCanvasMutationHistoryForDebug;
  var getLastDomMutationForDebug = _record.getLastDomMutationForDebug;
  var getDomMutationHistoryForDebug = _record.getDomMutationHistoryForDebug;
  var getReplayPerformanceForDebug = function getReplayPerformanceForDebug2() {
    return cloneReplayPerformanceForDebug(_record.getReplayPerformanceForDebug ? _record.getReplayPerformanceForDebug() : void 0, replaySegmentFlushCount);
  };
  var getLastReplaySegmentFlushForDebug = function getLastReplaySegmentFlushForDebug2() {
    return cloneReplaySegmentFlushForDebug(lastReplaySegmentFlushForDebug);
  };
  var getReplaySegmentFlushHistoryForDebug = function getReplaySegmentFlushHistoryForDebug2() {
    return replaySegmentFlushHistoryForDebug.map(function(segmentFlush) {
      return cloneReplaySegmentFlushForDebug(segmentFlush);
    });
  };
  var flushMutations = _record.flushMutations;
  var subscribeViewEnded = lifeCycle.subscribe(LifeCycleEventType.VIEW_ENDED, function() {
    flushMutations();
    addRecord2({
      timestamp: timeStampNow(),
      type: RecordType.ViewEnd
    });
  });
  cleanupTasks2.push(subscribeViewEnded.unsubscribe);
  var scribeViewCreated = lifeCycle.subscribe(LifeCycleEventType.VIEW_CREATED, function(view) {
    takeSubsequentFullSnapshot(view.startClocks.timeStamp);
  });
  cleanupTasks2.push(scribeViewCreated.unsubscribe);
  return {
    stop: function stop() {
      cleanupTasks2.forEach(function(task) {
        task();
      });
    },
    takeSubsequentFullSnapshot,
    snapshotCanvas,
    getSerializedNodeIdForDebug,
    getLastAutoCanvasSnapshotResultForDebug,
    getAutoCanvasSnapshotDebugHistoryForDebug,
    getLastCanvasMutationForDebug,
    getCanvasMutationHistoryForDebug,
    getLastDomMutationForDebug,
    getDomMutationHistoryForDebug,
    getLastReplaySegmentFlushForDebug,
    getReplaySegmentFlushHistoryForDebug,
    getReplayPerformanceForDebug,
    flushReplayMutationsForDebug: flushMutations
  };
}
function cloneReplaySegmentFlushForDebug(segmentFlush, sequence) {
  if (!segmentFlush) {
    return segmentFlush;
  }
  return {
    sequence: typeof sequence === "number" ? sequence : segmentFlush.sequence,
    creationReason: segmentFlush.creationReason,
    flushReason: segmentFlush.flushReason,
    recordsCount: segmentFlush.recordsCount,
    recordCountsByType: assign({}, segmentFlush.recordCountsByType),
    start: segmentFlush.start,
    end: segmentFlush.end,
    indexInView: segmentFlush.indexInView,
    rawBytesCount: segmentFlush.rawBytesCount
  };
}
function cloneReplayPerformanceForDebug(stats, replaySegmentFlushCount) {
  if (!stats && typeof replaySegmentFlushCount === "undefined") {
    return void 0;
  }
  return assign({}, stats || {}, {
    replaySegmentFlushCount: replaySegmentFlushCount || 0
  });
}
var RecorderStatus = {
  // The recorder is stopped.
  Stopped: 0,
  // The user started the recording while it wasn't possible yet. The recorder should start as soon
  // as possible.
  IntentToStart: 1,
  // The recorder is starting. It does not record anything yet.
  Starting: 2,
  // The recorder is started, it records the session.
  Started: 3
};
function makeRecorderApi(startRecordingImpl, createDeflateWorkerImpl) {
  if (canUseEventBridge() && !bridgeSupports(BridgeCapability.RECORDS) || !isBrowserSupported()) {
    return {
      start: noop,
      stop: noop,
      takeSubsequentFullSnapshot: noop,
      snapshotCanvas: function snapshotCanvas() {
        return {
          ok: false,
          reason: "not_recording"
        };
      },
      getSerializedNodeIdForDebug: function getSerializedNodeIdForDebug() {
        return void 0;
      },
      getLastAutoCanvasSnapshotResultForDebug: function getLastAutoCanvasSnapshotResultForDebug() {
        return void 0;
      },
      getAutoCanvasSnapshotDebugHistoryForDebug: function getAutoCanvasSnapshotDebugHistoryForDebug() {
        return void 0;
      },
      getLastCanvasMutationForDebug: function getLastCanvasMutationForDebug() {
        return void 0;
      },
      getCanvasMutationHistoryForDebug: function getCanvasMutationHistoryForDebug() {
        return void 0;
      },
      getLastDomMutationForDebug: function getLastDomMutationForDebug() {
        return void 0;
      },
      getDomMutationHistoryForDebug: function getDomMutationHistoryForDebug() {
        return void 0;
      },
      getLastReplaySegmentFlushForDebug: function getLastReplaySegmentFlushForDebug() {
        return void 0;
      },
      getReplaySegmentFlushHistoryForDebug: function getReplaySegmentFlushHistoryForDebug() {
        return void 0;
      },
      getReplayPerformanceForDebug: function getReplayPerformanceForDebug() {
        return void 0;
      },
      flushReplayMutationsForDebug: noop,
      getReplayStats: function getReplayStats2() {
        return void 0;
      },
      onRumStart: noop,
      isRecording: function isRecording() {
        return false;
      }
    };
  }
  var state2 = {
    status: RecorderStatus.Stopped
  };
  var startStrategy = function startStrategy2() {
    state2 = {
      status: RecorderStatus.IntentToStart
    };
  };
  var stopStrategy = function stopStrategy2() {
    state2 = {
      status: RecorderStatus.Stopped
    };
  };
  var _takeSubsequentFullSnapshot = function takeSubsequentFullSnapshot() {
  };
  var _snapshotCanvas = function snapshotCanvas() {
    return {
      ok: false,
      reason: "not_recording"
    };
  };
  var _getSerializedNodeIdForDebug = function getSerializedNodeIdForDebug() {
    return void 0;
  };
  var _getLastAutoCanvasSnapshotResultForDebug = function getLastAutoCanvasSnapshotResultForDebug() {
    return void 0;
  };
  var _getAutoCanvasSnapshotDebugHistoryForDebug = function getAutoCanvasSnapshotDebugHistoryForDebug() {
    return void 0;
  };
  var _getLastCanvasMutationForDebug = function getLastCanvasMutationForDebug() {
    return void 0;
  };
  var _getCanvasMutationHistoryForDebug = function getCanvasMutationHistoryForDebug() {
    return void 0;
  };
  var _getLastDomMutationForDebug = function getLastDomMutationForDebug() {
    return void 0;
  };
  var _getDomMutationHistoryForDebug = function getDomMutationHistoryForDebug() {
    return void 0;
  };
  var _getLastReplaySegmentFlushForDebug = function getLastReplaySegmentFlushForDebug() {
    return void 0;
  };
  var _getReplaySegmentFlushHistoryForDebug = function getReplaySegmentFlushHistoryForDebug() {
    return void 0;
  };
  var _getReplayPerformanceForDebug = function getReplayPerformanceForDebug() {
    return void 0;
  };
  var _flushReplayMutationsForDebug = noop;
  return {
    start: function start(options) {
      startStrategy(options);
    },
    stop: function stop() {
      stopStrategy();
    },
    onRumStart: function onRumStart(lifeCycle, configuration, sessionManager, viewContexts, worker) {
      lifeCycle.subscribe(LifeCycleEventType.SESSION_EXPIRED, function() {
        if (state2.status === RecorderStatus.Starting || state2.status === RecorderStatus.Started) {
          stopStrategy();
          state2 = {
            status: RecorderStatus.IntentToStart
          };
        }
      });
      lifeCycle.subscribe(LifeCycleEventType.PAGE_EXITED, function(pageExitEvent) {
        if (pageExitEvent.reason === PageExitReason.UNLOADING) {
          stopStrategy();
        }
      });
      lifeCycle.subscribe(LifeCycleEventType.SESSION_RENEWED, function() {
        if (state2.status === RecorderStatus.IntentToStart) {
          startStrategy();
        }
      });
      var cachedDeflateEncoder;
      function getOrCreateDeflateEncoder() {
        if (!cachedDeflateEncoder) {
          if (!worker) {
            worker = startDeflateWorker(configuration, "Session Replay", function() {
              stopStrategy();
            }, createDeflateWorkerImpl);
          }
          if (worker) {
            cachedDeflateEncoder = createDeflateEncoder(worker, DeflateEncoderStreamId.REPLAY);
          }
        }
        return cachedDeflateEncoder;
      }
      startStrategy = function startStrategy2(options) {
        var session = sessionManager.findTrackedSession();
        if (!session || !session.sessionReplayAllowed) {
          state2 = {
            status: RecorderStatus.IntentToStart
          };
          return;
        }
        if (state2.status === RecorderStatus.Starting || state2.status === RecorderStatus.Started) {
          return;
        }
        state2 = {
          status: RecorderStatus.Starting
        };
        runOnReadyState("interactive", function() {
          if (state2.status !== RecorderStatus.Starting) {
            return;
          }
          var deflateEncoder = getOrCreateDeflateEncoder();
          if (!deflateEncoder) {
            state2 = {
              status: RecorderStatus.Stopped
            };
            return;
          }
          var recordingImpl = startRecordingImpl(lifeCycle, configuration, sessionManager, viewContexts, deflateEncoder);
          state2 = {
            status: RecorderStatus.Started,
            stopRecording: recordingImpl.stop,
            takeSubsequentFullSnapshot: recordingImpl.takeSubsequentFullSnapshot,
            snapshotCanvas: recordingImpl.snapshotCanvas || noop,
            getSerializedNodeIdForDebug: recordingImpl.getSerializedNodeIdForDebug || noop,
            getLastAutoCanvasSnapshotResultForDebug: recordingImpl.getLastAutoCanvasSnapshotResultForDebug || noop,
            getAutoCanvasSnapshotDebugHistoryForDebug: recordingImpl.getAutoCanvasSnapshotDebugHistoryForDebug || noop,
            getLastCanvasMutationForDebug: recordingImpl.getLastCanvasMutationForDebug || noop,
            getCanvasMutationHistoryForDebug: recordingImpl.getCanvasMutationHistoryForDebug || noop,
            getLastDomMutationForDebug: recordingImpl.getLastDomMutationForDebug || noop,
            getDomMutationHistoryForDebug: recordingImpl.getDomMutationHistoryForDebug || noop,
            getLastReplaySegmentFlushForDebug: recordingImpl.getLastReplaySegmentFlushForDebug || noop,
            getReplaySegmentFlushHistoryForDebug: recordingImpl.getReplaySegmentFlushHistoryForDebug || noop,
            getReplayPerformanceForDebug: recordingImpl.getReplayPerformanceForDebug || noop,
            flushReplayMutationsForDebug: recordingImpl.flushReplayMutationsForDebug || noop
          };
        });
      };
      stopStrategy = function stopStrategy2() {
        if (state2.status === RecorderStatus.Stopped) {
          return;
        }
        if (state2.status === RecorderStatus.Started) {
          state2.stopRecording();
        }
        state2 = {
          status: RecorderStatus.Stopped
        };
      };
      _takeSubsequentFullSnapshot = function takeSubsequentFullSnapshot() {
        state2.takeSubsequentFullSnapshot();
      };
      _snapshotCanvas = function snapshotCanvas(canvas, options) {
        if (state2.status === RecorderStatus.Started) {
          return state2.snapshotCanvas(canvas, options);
        }
        return {
          ok: false,
          reason: "not_recording"
        };
      };
      _getSerializedNodeIdForDebug = function getSerializedNodeIdForDebug(node) {
        if (state2.status === RecorderStatus.Started) {
          return state2.getSerializedNodeIdForDebug(node);
        }
        return void 0;
      };
      _getLastAutoCanvasSnapshotResultForDebug = function getLastAutoCanvasSnapshotResultForDebug() {
        if (state2.status === RecorderStatus.Started) {
          return state2.getLastAutoCanvasSnapshotResultForDebug();
        }
        return void 0;
      };
      _getAutoCanvasSnapshotDebugHistoryForDebug = function getAutoCanvasSnapshotDebugHistoryForDebug() {
        if (state2.status === RecorderStatus.Started) {
          return state2.getAutoCanvasSnapshotDebugHistoryForDebug();
        }
        return void 0;
      };
      _getLastCanvasMutationForDebug = function getLastCanvasMutationForDebug() {
        if (state2.status === RecorderStatus.Started) {
          return state2.getLastCanvasMutationForDebug();
        }
        return void 0;
      };
      _getCanvasMutationHistoryForDebug = function getCanvasMutationHistoryForDebug() {
        if (state2.status === RecorderStatus.Started) {
          return state2.getCanvasMutationHistoryForDebug();
        }
        return void 0;
      };
      _getLastDomMutationForDebug = function getLastDomMutationForDebug() {
        if (state2.status === RecorderStatus.Started) {
          return state2.getLastDomMutationForDebug();
        }
        return void 0;
      };
      _getDomMutationHistoryForDebug = function getDomMutationHistoryForDebug() {
        if (state2.status === RecorderStatus.Started) {
          return state2.getDomMutationHistoryForDebug();
        }
        return void 0;
      };
      _getLastReplaySegmentFlushForDebug = function getLastReplaySegmentFlushForDebug() {
        if (state2.status === RecorderStatus.Started) {
          return state2.getLastReplaySegmentFlushForDebug();
        }
        return void 0;
      };
      _getReplaySegmentFlushHistoryForDebug = function getReplaySegmentFlushHistoryForDebug() {
        if (state2.status === RecorderStatus.Started) {
          return state2.getReplaySegmentFlushHistoryForDebug();
        }
        return void 0;
      };
      _getReplayPerformanceForDebug = function getReplayPerformanceForDebug() {
        if (state2.status === RecorderStatus.Started) {
          return state2.getReplayPerformanceForDebug();
        }
        return void 0;
      };
      _flushReplayMutationsForDebug = function flushReplayMutationsForDebug() {
        if (state2.status === RecorderStatus.Started) {
          state2.flushReplayMutationsForDebug();
        }
      };
      if (state2.status === RecorderStatus.IntentToStart) {
        startStrategy();
      }
    },
    takeSubsequentFullSnapshot: function takeSubsequentFullSnapshot() {
      _takeSubsequentFullSnapshot();
    },
    snapshotCanvas: function snapshotCanvas(canvas, options) {
      return _snapshotCanvas(canvas, options);
    },
    getSerializedNodeIdForDebug: function getSerializedNodeIdForDebug(node) {
      return _getSerializedNodeIdForDebug(node);
    },
    getLastReplaySegmentFlushForDebug: function getLastReplaySegmentFlushForDebug() {
      return _getLastReplaySegmentFlushForDebug();
    },
    getLastAutoCanvasSnapshotResultForDebug: function getLastAutoCanvasSnapshotResultForDebug() {
      return _getLastAutoCanvasSnapshotResultForDebug();
    },
    getAutoCanvasSnapshotDebugHistoryForDebug: function getAutoCanvasSnapshotDebugHistoryForDebug() {
      return _getAutoCanvasSnapshotDebugHistoryForDebug();
    },
    getLastCanvasMutationForDebug: function getLastCanvasMutationForDebug() {
      return _getLastCanvasMutationForDebug();
    },
    getCanvasMutationHistoryForDebug: function getCanvasMutationHistoryForDebug() {
      return _getCanvasMutationHistoryForDebug();
    },
    getLastDomMutationForDebug: function getLastDomMutationForDebug() {
      return _getLastDomMutationForDebug();
    },
    getDomMutationHistoryForDebug: function getDomMutationHistoryForDebug() {
      return _getDomMutationHistoryForDebug();
    },
    getReplaySegmentFlushHistoryForDebug: function getReplaySegmentFlushHistoryForDebug() {
      return _getReplaySegmentFlushHistoryForDebug();
    },
    getReplayPerformanceForDebug: function getReplayPerformanceForDebug() {
      return _getReplayPerformanceForDebug();
    },
    flushReplayMutationsForDebug: function flushReplayMutationsForDebug() {
      _flushReplayMutationsForDebug();
    },
    isRecording: function isRecording() {
      return getDeflateWorkerStatus() === DeflateWorkerStatus.Initialized && state2.status === RecorderStatus.Started;
    },
    getReplayStats: function getReplayStats$1(viewId) {
      return getDeflateWorkerStatus() === DeflateWorkerStatus.Initialized ? getReplayStats(viewId) : void 0;
    }
  };
}
function isBrowserSupported() {
  return (
    // Array.from is a bit less supported by browsers than CSSSupportsRule, but has higher chances
    // to be polyfilled. Test for both to be more confident. We could add more things if we find out
    // this test is not sufficient.
    typeof Array.from === "function" && typeof CSSSupportsRule === "function" && typeof URL.createObjectURL === "function" && "forEach" in NodeList.prototype
  );
}
var recorderApi = makeRecorderApi(startRecording);
var datafluxRum = makeRumPublicApi(startRum, recorderApi, {
  startDeflateWorker,
  createDeflateEncoder
});
defineGlobal(getGlobalObject(), "DATAFLUX_RUM", datafluxRum);
export {
  datafluxRum
};
