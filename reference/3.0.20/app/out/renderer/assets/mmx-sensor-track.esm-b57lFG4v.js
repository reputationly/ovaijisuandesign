const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./sensorsdata-9tggX5Db.js","./index-CANVzzmD.js","./index-DhaBhXjN.css"])))=>i.map(i=>d[i]);
import { _ as __vitePreload } from "./index-CANVzzmD.js";
function _arrayLikeToArray(r, a) {
  (null == a || a > r.length) && (a = r.length);
  for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e];
  return n;
}
function _arrayWithHoles(r) {
  if (Array.isArray(r)) return r;
}
function asyncGeneratorStep(n, t, e, r, o, a, c) {
  try {
    var i = n[a](c), u = i.value;
  } catch (n2) {
    return void e(n2);
  }
  i.done ? t(u) : Promise.resolve(u).then(r, o);
}
function _asyncToGenerator(n) {
  return function() {
    var t = this, e = arguments;
    return new Promise(function(r, o) {
      var a = n.apply(t, e);
      function _next(n2) {
        asyncGeneratorStep(a, r, o, _next, _throw, "next", n2);
      }
      function _throw(n2) {
        asyncGeneratorStep(a, r, o, _next, _throw, "throw", n2);
      }
      _next(void 0);
    });
  };
}
function _classCallCheck(a, n) {
  if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function");
}
function _defineProperties(e, r) {
  for (var t = 0; t < r.length; t++) {
    var o = r[t];
    o.enumerable = o.enumerable || false, o.configurable = true, "value" in o && (o.writable = true), Object.defineProperty(e, _toPropertyKey(o.key), o);
  }
}
function _createClass(e, r, t) {
  return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", {
    writable: false
  }), e;
}
function _createForOfIteratorHelper(r, e) {
  var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"];
  if (!t) {
    if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e) {
      t && (r = t);
      var n = 0, F = function() {
      };
      return {
        s: F,
        n: function() {
          return n >= r.length ? {
            done: true
          } : {
            done: false,
            value: r[n++]
          };
        },
        e: function(r2) {
          throw r2;
        },
        f: F
      };
    }
    throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
  }
  var o, a = true, u = false;
  return {
    s: function() {
      t = t.call(r);
    },
    n: function() {
      var r2 = t.next();
      return a = r2.done, r2;
    },
    e: function(r2) {
      u = true, o = r2;
    },
    f: function() {
      try {
        a || null == t.return || t.return();
      } finally {
        if (u) throw o;
      }
    }
  };
}
function _defineProperty(e, r, t) {
  return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, {
    value: t,
    enumerable: true,
    configurable: true,
    writable: true
  }) : e[r] = t, e;
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
        if (!f && null != t.return && (u = t.return(), Object(u) !== u)) return;
      } finally {
        if (o) throw n;
      }
    }
    return a;
  }
}
function _nonIterableRest() {
  throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
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
function _objectSpread2(e) {
  for (var r = 1; r < arguments.length; r++) {
    var t = null != arguments[r] ? arguments[r] : {};
    r % 2 ? ownKeys(Object(t), true).forEach(function(r2) {
      _defineProperty(e, r2, t[r2]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function(r2) {
      Object.defineProperty(e, r2, Object.getOwnPropertyDescriptor(t, r2));
    });
  }
  return e;
}
function _regenerator() {
  /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */
  var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag";
  function i(r2, n2, o2, i2) {
    var c2 = n2 && n2.prototype instanceof Generator ? n2 : Generator, u2 = Object.create(c2.prototype);
    return _regeneratorDefine(u2, "_invoke", (function(r3, n3, o3) {
      var i3, c3, u3, f2 = 0, p = o3 || [], y = false, G = {
        p: 0,
        n: 0,
        v: e,
        a: d,
        f: d.bind(e, 4),
        d: function(t2, r4) {
          return i3 = t2, c3 = 0, u3 = e, G.n = r4, a;
        }
      };
      function d(r4, n4) {
        for (c3 = r4, u3 = n4, t = 0; !y && f2 && !o4 && t < p.length; t++) {
          var o4, i4 = p[t], d2 = G.p, l = i4[2];
          r4 > 3 ? (o4 = l === n4) && (u3 = i4[(c3 = i4[4]) ? 5 : (c3 = 3, 3)], i4[4] = i4[5] = e) : i4[0] <= d2 && ((o4 = r4 < 2 && d2 < i4[1]) ? (c3 = 0, G.v = n4, G.n = i4[1]) : d2 < l && (o4 = r4 < 3 || i4[0] > n4 || n4 > l) && (i4[4] = r4, i4[5] = n4, G.n = l, c3 = 0));
        }
        if (o4 || r4 > 1) return a;
        throw y = true, n4;
      }
      return function(o4, p2, l) {
        if (f2 > 1) throw TypeError("Generator is already running");
        for (y && 1 === p2 && d(p2, l), c3 = p2, u3 = l; (t = c3 < 2 ? e : u3) || !y; ) {
          i3 || (c3 ? c3 < 3 ? (c3 > 1 && (G.n = -1), d(c3, u3)) : G.n = u3 : G.v = u3);
          try {
            if (f2 = 2, i3) {
              if (c3 || (o4 = "next"), t = i3[o4]) {
                if (!(t = t.call(i3, u3))) throw TypeError("iterator result is not an object");
                if (!t.done) return t;
                u3 = t.value, c3 < 2 && (c3 = 0);
              } else 1 === c3 && (t = i3.return) && t.call(i3), c3 < 2 && (u3 = TypeError("The iterator does not provide a '" + o4 + "' method"), c3 = 1);
              i3 = e;
            } else if ((t = (y = G.n < 0) ? u3 : r3.call(n3, G)) !== a) break;
          } catch (t2) {
            i3 = e, c3 = 1, u3 = t2;
          } finally {
            f2 = 1;
          }
        }
        return {
          value: t,
          done: y
        };
      };
    })(r2, o2, i2), true), u2;
  }
  var a = {};
  function Generator() {
  }
  function GeneratorFunction() {
  }
  function GeneratorFunctionPrototype() {
  }
  t = Object.getPrototypeOf;
  var c = [][n] ? t(t([][n]())) : (_regeneratorDefine(t = {}, n, function() {
    return this;
  }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c);
  function f(e2) {
    return Object.setPrototypeOf ? Object.setPrototypeOf(e2, GeneratorFunctionPrototype) : (e2.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine(e2, o, "GeneratorFunction")), e2.prototype = Object.create(u), e2;
  }
  return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine(u), _regeneratorDefine(u, o, "Generator"), _regeneratorDefine(u, n, function() {
    return this;
  }), _regeneratorDefine(u, "toString", function() {
    return "[object Generator]";
  }), (_regenerator = function() {
    return {
      w: i,
      m: f
    };
  })();
}
function _regeneratorDefine(e, r, n, t) {
  var i = Object.defineProperty;
  try {
    i({}, "", {});
  } catch (e2) {
    i = 0;
  }
  _regeneratorDefine = function(e2, r2, n2, t2) {
    if (r2) i ? i(e2, r2, {
      value: n2,
      enumerable: !t2,
      configurable: !t2,
      writable: !t2
    }) : e2[r2] = n2;
    else {
      let o = function(r3, n3) {
        _regeneratorDefine(e2, r3, function(e3) {
          return this._invoke(r3, n3, e3);
        });
      };
      o("next", 0), o("throw", 1), o("return", 2);
    }
  }, _regeneratorDefine(e, r, n, t);
}
function _slicedToArray(r, e) {
  return _arrayWithHoles(r) || _iterableToArrayLimit(r, e) || _unsupportedIterableToArray(r, e) || _nonIterableRest();
}
function _toPrimitive(t, r) {
  if ("object" != typeof t || !t) return t;
  var e = t[Symbol.toPrimitive];
  if (void 0 !== e) {
    var i = e.call(t, r);
    if ("object" != typeof i) return i;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return String(t);
}
function _toPropertyKey(t) {
  var i = _toPrimitive(t, "string");
  return "symbol" == typeof i ? i : i + "";
}
function _typeof(o) {
  "@babel/helpers - typeof";
  return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(o2) {
    return typeof o2;
  } : function(o2) {
    return o2 && "function" == typeof Symbol && o2.constructor === Symbol && o2 !== Symbol.prototype ? "symbol" : typeof o2;
  }, _typeof(o);
}
function _unsupportedIterableToArray(r, a) {
  if (r) {
    if ("string" == typeof r) return _arrayLikeToArray(r, a);
    var t = {}.toString.call(r).slice(8, -1);
    return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0;
  }
}
var Utils = /* @__PURE__ */ (function() {
  function Utils2() {
    _classCallCheck(this, Utils2);
  }
  return _createClass(Utils2, null, [{
    key: "getUrlParams",
    value: (
      /**
       * 获取URL参数
       * @param {string} url 可选，默认为当前页面URL
       * @returns {Object} URL参数对象
       */
      function getUrlParams(url) {
        var targetUrl = url || (typeof window !== "undefined" ? window.location.href : "");
        var params = {};
        try {
          var urlObj = new URL(targetUrl);
          var searchParams = urlObj.searchParams;
          var _iterator = _createForOfIteratorHelper(searchParams.entries()), _step;
          try {
            for (_iterator.s(); !(_step = _iterator.n()).done; ) {
              var _step$value = _slicedToArray(_step.value, 2), key = _step$value[0], value = _step$value[1];
              params[key] = value;
            }
          } catch (err) {
            _iterator.e(err);
          } finally {
            _iterator.f();
          }
        } catch (error) {
          console.error("[MMXSensorTrack] 解析URL参数失败:", error);
        }
        return params;
      }
    )
    /**
     * 获取URL hash参数
     * @param {string} url 可选，默认为当前页面URL
     * @returns {Object} hash参数对象
     */
  }, {
    key: "getHashParams",
    value: function getHashParams(url) {
      var targetUrl = url || (typeof window !== "undefined" ? window.location.href : "");
      var params = {};
      try {
        var urlObj = new URL(targetUrl);
        var hash = urlObj.hash.substring(1);
        if (hash) {
          var hashParams = new URLSearchParams(hash);
          var _iterator2 = _createForOfIteratorHelper(hashParams.entries()), _step2;
          try {
            for (_iterator2.s(); !(_step2 = _iterator2.n()).done; ) {
              var _step2$value = _slicedToArray(_step2.value, 2), key = _step2$value[0], value = _step2$value[1];
              params[key] = value;
            }
          } catch (err) {
            _iterator2.e(err);
          } finally {
            _iterator2.f();
          }
        }
      } catch (error) {
        console.error("[MMXSensorTrack] 解析hash参数失败:", error);
      }
      return params;
    }
    /**
     * 深度克隆对象
     * @param {any} obj 要克隆的对象
     * @returns {any} 克隆后的对象
     */
  }, {
    key: "deepClone",
    value: function deepClone(obj) {
      var _this = this;
      if (obj === null || _typeof(obj) !== "object") {
        return obj;
      }
      if (obj instanceof Date) {
        return new Date(obj.getTime());
      }
      if (obj instanceof Array) {
        return obj.map(function(item) {
          return _this.deepClone(item);
        });
      }
      if (_typeof(obj) === "object") {
        var clonedObj = {};
        for (var key in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, key)) {
            clonedObj[key] = this.deepClone(obj[key]);
          }
        }
        return clonedObj;
      }
      return obj;
    }
    /**
     * 生成UUID
     * @returns {string} UUID字符串
     */
  }, {
    key: "generateUUID",
    value: function generateUUID() {
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0;
        var v = c === "x" ? r : r & 3 | 8;
        return v.toString(16);
      });
    }
    /**
     * 防抖函数
     * @param {Function} func 要防抖的函数
     * @param {number} wait 等待时间
     * @returns {Function} 防抖后的函数
     */
  }, {
    key: "debounce",
    value: function debounce(func, wait) {
      var timeout;
      return function executedFunction() {
        for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
          args[_key] = arguments[_key];
        }
        var later = function later2() {
          clearTimeout(timeout);
          func.apply(void 0, args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
      };
    }
    /**
     * 节流函数
     * @param {Function} func 要节流的函数
     * @param {number} limit 时间限制
     * @returns {Function} 节流后的函数
     */
  }, {
    key: "throttle",
    value: function throttle(func, limit) {
      var inThrottle;
      return function() {
        if (!inThrottle) {
          for (var _len2 = arguments.length, args = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
            args[_key2] = arguments[_key2];
          }
          func.apply(this, args);
          inThrottle = true;
          setTimeout(function() {
            return inThrottle = false;
          }, limit);
        }
      };
    }
    /**
     * 检查是否为移动设备
     * @returns {boolean} 是否为移动设备
     */
  }, {
    key: "isMobile",
    value: function isMobile() {
      if (typeof window === "undefined" || !window.navigator) {
        return false;
      }
      return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(window.navigator.userAgent);
    }
    /**
     * 获取设备信息
     * @returns {Object} 设备信息
     */
  }, {
    key: "getDeviceInfo",
    value: function getDeviceInfo() {
      if (typeof window === "undefined") {
        return {};
      }
      return {
        userAgent: window.navigator.userAgent,
        platform: window.navigator.platform,
        language: window.navigator.language,
        cookieEnabled: window.navigator.cookieEnabled,
        onLine: window.navigator.onLine,
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        isMobile: this.isMobile()
      };
    }
    /**
     * 格式化时间戳
     * @param {number} timestamp 时间戳
     * @param {string} format 格式字符串
     * @returns {string} 格式化后的时间
     */
  }, {
    key: "formatTimestamp",
    value: function formatTimestamp(timestamp) {
      var format = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : "YYYY-MM-DD HH:mm:ss";
      var date = new Date(timestamp);
      var year = date.getFullYear();
      var month = String(date.getMonth() + 1).padStart(2, "0");
      var day = String(date.getDate()).padStart(2, "0");
      var hours = String(date.getHours()).padStart(2, "0");
      var minutes = String(date.getMinutes()).padStart(2, "0");
      var seconds = String(date.getSeconds()).padStart(2, "0");
      return format.replace("YYYY", year).replace("MM", month).replace("DD", day).replace("HH", hours).replace("mm", minutes).replace("ss", seconds);
    }
  }]);
})();
var Storage = /* @__PURE__ */ (function() {
  function Storage2() {
    var type = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : "localStorage";
    _classCallCheck(this, Storage2);
    this.type = type;
    this.isSupported = this.checkSupport();
  }
  return _createClass(Storage2, [{
    key: "checkSupport",
    value: function checkSupport() {
      if (typeof window === "undefined") {
        return false;
      }
      try {
        var storage = window[this.type];
        var testKey = "__storage_test__";
        storage.setItem(testKey, "test");
        storage.removeItem(testKey);
        return true;
      } catch (error) {
        return false;
      }
    }
    /**
     * 设置存储项
     * @param {string} key 键名
     * @param {any} value 值
     * @param {number} expires 过期时间（毫秒，仅对cookie有效）
     */
  }, {
    key: "setItem",
    value: function setItem(key, value, expires) {
      try {
        var data = {
          value,
          timestamp: Date.now(),
          expires: expires || null
        };
        if (this.isSupported) {
          window[this.type].setItem(key, JSON.stringify(data));
        } else {
          this.setCookie(key, JSON.stringify(data), expires);
        }
      } catch (error) {
        console.error("[Storage] 设置存储失败:", error);
      }
    }
    /**
     * 获取存储项
     * @param {string} key 键名
     * @returns {any} 存储的值
     */
  }, {
    key: "getItem",
    value: function getItem(key) {
      try {
        var dataStr;
        if (this.isSupported) {
          dataStr = window[this.type].getItem(key);
        } else {
          dataStr = this.getCookie(key);
        }
        if (!dataStr) {
          return null;
        }
        var data = JSON.parse(dataStr);
        if (data.expires && Date.now() > data.expires) {
          this.removeItem(key);
          return null;
        }
        return data.value;
      } catch (error) {
        console.error("[Storage] 获取存储失败:", error);
        return null;
      }
    }
    /**
     * 移除存储项
     * @param {string} key 键名
     */
  }, {
    key: "removeItem",
    value: function removeItem(key) {
      try {
        if (this.isSupported) {
          window[this.type].removeItem(key);
        } else {
          this.setCookie(key, "", -1);
        }
      } catch (error) {
        console.error("[Storage] 移除存储失败:", error);
      }
    }
    /**
     * 清空所有存储
     */
  }, {
    key: "clear",
    value: function clear() {
      try {
        if (this.isSupported) {
          window[this.type].clear();
        }
      } catch (error) {
        console.error("[Storage] 清空存储失败:", error);
      }
    }
    /**
     * 设置Cookie
     * @param {string} name Cookie名
     * @param {string} value Cookie值
     * @param {number} expires 过期时间（毫秒）
     */
  }, {
    key: "setCookie",
    value: function setCookie(name, value, expires) {
      if (typeof document === "undefined") {
        return;
      }
      var cookieStr = "".concat(name, "=").concat(encodeURIComponent(value));
      if (expires && expires > 0) {
        var date = /* @__PURE__ */ new Date();
        date.setTime(date.getTime() + expires);
        cookieStr += "; expires=".concat(date.toUTCString());
      } else if (expires < 0) {
        cookieStr += "; expires=Thu, 01 Jan 1970 00:00:00 UTC";
      }
      cookieStr += "; path=/";
      document.cookie = cookieStr;
    }
    /**
     * 获取Cookie
     * @param {string} name Cookie名
     * @returns {string|null} Cookie值
     */
  }, {
    key: "getCookie",
    value: function getCookie(name) {
      if (typeof document === "undefined") {
        return null;
      }
      var nameEQ = name + "=";
      var cookies = document.cookie.split(";");
      for (var i = 0; i < cookies.length; i++) {
        var cookie = cookies[i];
        while (cookie.charAt(0) === " ") {
          cookie = cookie.substring(1, cookie.length);
        }
        if (cookie.indexOf(nameEQ) === 0) {
          return decodeURIComponent(cookie.substring(nameEQ.length, cookie.length));
        }
      }
      return null;
    }
    /**
     * 获取所有键名
     * @returns {Array} 键名数组
     */
  }, {
    key: "getAllKeys",
    value: function getAllKeys() {
      if (!this.isSupported) {
        return [];
      }
      try {
        var keys = [];
        var storage = window[this.type];
        for (var i = 0; i < storage.length; i++) {
          keys.push(storage.key(i));
        }
        return keys;
      } catch (error) {
        console.error("[Storage] 获取所有键名失败:", error);
        return [];
      }
    }
    /**
     * 检查键是否存在
     * @param {string} key 键名
     * @returns {boolean} 是否存在
     */
  }, {
    key: "hasKey",
    value: function hasKey(key) {
      return this.getItem(key) !== null;
    }
    /**
     * 获取存储大小（仅localStorage和sessionStorage）
     * @returns {number} 存储大小（字节）
     */
  }, {
    key: "getSize",
    value: function getSize() {
      if (!this.isSupported) {
        return 0;
      }
      try {
        var size = 0;
        var storage = window[this.type];
        for (var key in storage) {
          if (Object.prototype.hasOwnProperty.call(storage, key)) {
            size += storage[key].length + key.length;
          }
        }
        return size;
      } catch (error) {
        console.error("[Storage] 获取存储大小失败:", error);
        return 0;
      }
    }
  }]);
})();
var MMXSensorTracker = /* @__PURE__ */ (function() {
  function MMXSensorTracker2(config) {
    var sensorsInstance = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : null;
    _classCallCheck(this, MMXSensorTracker2);
    this.config = config;
    this.storage = new Storage();
    this.adsParams = {};
    this.adsProperties = {};
    this.sensors = sensorsInstance;
    this.isInitialized = false;
    this.isExternalSensors = !!sensorsInstance;
    this.init();
  }
  return _createClass(MMXSensorTracker2, [{
    key: "init",
    value: (function() {
      var _init = _asyncToGenerator(/* @__PURE__ */ _regenerator().m(function _callee() {
        var _t;
        return _regenerator().w(function(_context) {
          while (1) switch (_context.n) {
            case 0:
              _context.p = 0;
              _context.n = 1;
              return this.importSensorsSDK();
            case 1:
              _context.n = 2;
              return this.initSensorsSDK();
            case 2:
              this.loadStorageAdsParams();
              this.handleAdsSourceParams();
              this.isInitialized = true;
              if (this.config.debug) {
                console.log("[MMXSensorTrack] SDK初始化完成");
              }
              _context.n = 4;
              break;
            case 3:
              _context.p = 3;
              _t = _context.v;
              console.error("[MMXSensorTrack] 初始化失败:", _t);
            case 4:
              return _context.a(2);
          }
        }, _callee, this, [[0, 3]]);
      }));
      function init() {
        return _init.apply(this, arguments);
      }
      return init;
    })()
  }, {
    key: "importSensorsSDK",
    value: (function() {
      var _importSensorsSDK = _asyncToGenerator(/* @__PURE__ */ _regenerator().m(function _callee2() {
        var sensorsModule, errorMsg, _t2;
        return _regenerator().w(function(_context2) {
          while (1) switch (_context2.n) {
            case 0:
              if (!this.isExternalSensors) {
                _context2.n = 1;
                break;
              }
              if (this.config.debug) {
                console.log("[MMXSensorTrack] 使用外部传入的神策SDK实例");
              }
              return _context2.a(2);
            case 1:
              _context2.p = 1;
              if (!(typeof window !== "undefined" && window.sensors)) {
                _context2.n = 2;
                break;
              }
              this.sensors = window.sensors;
              this.isExternalSensors = true;
              if (this.config.debug) {
                console.log("[MMXSensorTrack] 检测到全局神策SDK实例");
              }
              return _context2.a(2);
            case 2:
              _context2.n = 3;
              return __vitePreload(() => import("./sensorsdata-9tggX5Db.js").then((n) => n.s), true ? __vite__mapDeps([0,1,2]) : void 0, import.meta.url);
            case 3:
              sensorsModule = _context2.v;
              this.sensors = sensorsModule.default;
              if (this.config.debug) {
                console.log("[MMXSensorTrack] 神策SDK导入成功");
              }
              _context2.n = 5;
              break;
            case 4:
              _context2.p = 4;
              _t2 = _context2.v;
              errorMsg = this.isExternalSensors ? "外部传入的神策SDK实例无效" : "神策SDK未找到，请确保已安装 sa-sdk-javascript >= 1.25.0";
              console.error("[MMXSensorTrack] 神策SDK导入失败:", errorMsg, _t2);
              throw new Error(errorMsg);
            case 5:
              return _context2.a(2);
          }
        }, _callee2, this, [[1, 4]]);
      }));
      function importSensorsSDK() {
        return _importSensorsSDK.apply(this, arguments);
      }
      return importSensorsSDK;
    })()
  }, {
    key: "initSensorsSDK",
    value: (function() {
      var _initSensorsSDK = _asyncToGenerator(/* @__PURE__ */ _regenerator().m(function _callee3() {
        var baseProperties, _t3;
        return _regenerator().w(function(_context3) {
          while (1) switch (_context3.n) {
            case 0:
              if (this.sensors) {
                _context3.n = 1;
                break;
              }
              throw new Error("神策SDK未导入");
            case 1:
              _context3.p = 1;
              this.checkSensorsCompatibility();
              if (this.isExternalSensors) {
                if (this.config.debug) {
                  console.log("[MMXSensorTrack] 使用已有的神策SDK实例");
                }
              } else {
                this.sensors.use("SensorsChannel", {});
                this.sensors.init({
                  server_url: this.config.getConfig().server_url,
                  is_track_single_page: true,
                  use_client_time: true,
                  show_log: this.config.debug,
                  send_type: "ajax",
                  heatmap: {
                    clickmap: "default",
                    scroll_notice_map: "not_collect"
                  }
                });
                if (this.config.debug) {
                  console.log("[MMXSensorTrack] 神策SDK初始化完成");
                }
              }
              baseProperties = this.getBaseProperties();
              this.sensors.registerPage(baseProperties);
              if (this.config.debug) {
                console.log("[MMXSensorTrack] 页面属性注册完成", baseProperties);
              }
              _context3.n = 3;
              break;
            case 2:
              _context3.p = 2;
              _t3 = _context3.v;
              console.error("[MMXSensorTrack] 神策SDK初始化失败:", _t3);
              throw _t3;
            case 3:
              return _context3.a(2);
          }
        }, _callee3, this, [[1, 2]]);
      }));
      function initSensorsSDK() {
        return _initSensorsSDK.apply(this, arguments);
      }
      return initSensorsSDK;
    })()
  }, {
    key: "checkSensorsCompatibility",
    value: function checkSensorsCompatibility() {
      var _this = this;
      if (!this.sensors) return;
      try {
        var requiredMethods = ["init", "track", "registerPage"];
        var missingMethods = requiredMethods.filter(function(method) {
          return typeof _this.sensors[method] !== "function";
        });
        if (missingMethods.length > 0) {
          throw new Error("神策SDK版本不兼容，缺少方法: ".concat(missingMethods.join(", ")));
        }
        if (this.config.debug) {
          console.log("[MMXSensorTrack] 神策SDK兼容性检查通过");
        }
      } catch (error) {
        console.warn("[MMXSensorTrack] 兼容性检查失败:", error.message);
      }
    }
    /**
     * 获取基础属性
     */
  }, {
    key: "getBaseProperties",
    value: function getBaseProperties() {
      var config = this.config.getConfig();
      return _objectSpread2(_objectSpread2(_objectSpread2({
        // 项目信息
        project_name: config.project_name,
        // 页面信息
        current_url: typeof window !== "undefined" ? window.location.href : "",
        referrer: typeof document !== "undefined" ? document.referrer : "",
        page_title: typeof document !== "undefined" ? document.title : ""
      }, Utils.getDeviceInfo()), this.adsParams), this.adsProperties);
    }
    /**
     * 处理广告来源参数
     */
  }, {
    key: "handleAdsSourceParams",
    value: function handleAdsSourceParams() {
      try {
        var urlParams = Utils.getUrlParams();
        var adsConfig = this.config.getAdsConfig();
        if (!adsConfig.auto_collect) {
          return;
        }
        var newAdsParams = this.extractAdsParams(urlParams);
        var usesCachedData = false;
        if (Object.keys(newAdsParams).length > 0) {
          this.adsParams = _objectSpread2(_objectSpread2({}, this.adsParams), newAdsParams);
          usesCachedData = false;
          if (this.config.debug) {
            console.log("[MMXSensorTrack] 检测到广告参数:", newAdsParams);
          }
        } else {
          var cachedParams = this.getCachedAdsParams();
          if (Object.keys(cachedParams).length > 0) {
            this.adsParams = _objectSpread2(_objectSpread2({}, this.adsParams), cachedParams);
            usesCachedData = true;
            if (this.config.debug) {
              console.log("[MMXSensorTrack] 使用缓存的广告参数:", cachedParams);
            }
          }
        }
        if (Object.keys(this.adsParams).length > 0) {
          var urlKey = "".concat(adsConfig.param_prefix, "url");
          this.adsParams[urlKey] = typeof window !== "undefined" ? window.location.href : "";
          var cacheKey = "".concat(adsConfig.param_prefix, "is_cached");
          this.adsParams[cacheKey] = usesCachedData;
          if (!usesCachedData) {
            this.saveAdsParams();
          }
          this.updateSensorsPageProperties();
        }
      } catch (error) {
        console.error("[MMXSensorTrack] 处理广告参数失败:", error);
      }
    }
    /**
     * 获取缓存的广告参数
     */
  }, {
    key: "getCachedAdsParams",
    value: function getCachedAdsParams() {
      var adsConfig = this.config.getAdsConfig();
      var storageData = this.storage.getItem(adsConfig.storage_key);
      if (storageData && storageData.expires > Date.now()) {
        return storageData.params || {};
      }
      return {};
    }
    /**
     * 更新神策页面属性
     */
  }, {
    key: "updateSensorsPageProperties",
    value: function updateSensorsPageProperties() {
      if (this.sensors && this.isInitialized) {
        var properties = _objectSpread2(_objectSpread2({}, this.adsParams), this.adsProperties);
        this.sensors.registerPage(properties);
        this.sensors.quick("autoTrack", properties);
        if (this.config.debug) {
          console.log("[MMXSensorTrack] 更新神策页面属性:", properties);
        }
      }
    }
    /**
     * 提取广告参数
     */
  }, {
    key: "extractAdsParams",
    value: function extractAdsParams(urlParams) {
      var adsConfig = this.config.getAdsConfig();
      var paramPrefix = adsConfig.param_prefix;
      var adsParams = {};
      Object.keys(urlParams).forEach(function(param) {
        if (!urlParams[param] || urlParams[param] === "") {
          return;
        }
        adsParams["".concat(paramPrefix).concat(param)] = urlParams[param];
      });
      if (this.config.debug && Object.keys(adsParams).length > 0) {
        console.log("[MMXSensorTrack] 解析到的广告参数:", adsParams);
      }
      return adsParams;
    }
    /**
     * 保存广告参数到存储
     */
  }, {
    key: "saveAdsParams",
    value: function saveAdsParams() {
      var adsConfig = this.config.getAdsConfig();
      var storageData = {
        params: this.adsParams,
        timestamp: Date.now(),
        expires: Date.now() + adsConfig.storage_duration
      };
      this.storage.setItem(adsConfig.storage_key, storageData);
    }
    /**
     * 从存储加载广告参数
     */
  }, {
    key: "loadStorageAdsParams",
    value: function loadStorageAdsParams() {
      var adsConfig = this.config.getAdsConfig();
      var storageData = this.storage.getItem(adsConfig.storage_key);
      if (storageData && storageData.expires > Date.now()) {
        this.adsParams = storageData.params || {};
        if (this.config.debug) {
          console.log("[MMXSensorTrack] 从存储加载广告参数:", this.adsParams);
        }
      } else if (storageData) {
        this.storage.removeItem(adsConfig.storage_key);
      }
    }
    /**
     * 追踪广告点击
     */
  }, {
    key: "trackAdClick",
    value: (function() {
      var _trackAdClick = _asyncToGenerator(/* @__PURE__ */ _regenerator().m(function _callee4() {
        var properties, eventName, eventProperties, _args4 = arguments;
        return _regenerator().w(function(_context4) {
          while (1) switch (_context4.n) {
            case 0:
              properties = _args4.length > 0 && _args4[0] !== void 0 ? _args4[0] : {};
              _context4.n = 1;
              return this.ensureInitialized();
            case 1:
              eventName = "ad_click";
              eventProperties = this.buildEventProperties(properties);
              this.trackEvent(eventName, eventProperties);
            case 2:
              return _context4.a(2);
          }
        }, _callee4, this);
      }));
      function trackAdClick() {
        return _trackAdClick.apply(this, arguments);
      }
      return trackAdClick;
    })()
  }, {
    key: "trackAdExposure",
    value: (function() {
      var _trackAdExposure = _asyncToGenerator(/* @__PURE__ */ _regenerator().m(function _callee5() {
        var properties, eventName, eventProperties, _args5 = arguments;
        return _regenerator().w(function(_context5) {
          while (1) switch (_context5.n) {
            case 0:
              properties = _args5.length > 0 && _args5[0] !== void 0 ? _args5[0] : {};
              _context5.n = 1;
              return this.ensureInitialized();
            case 1:
              eventName = "ad_exposure";
              eventProperties = this.buildEventProperties(properties);
              this.trackEvent(eventName, eventProperties);
            case 2:
              return _context5.a(2);
          }
        }, _callee5, this);
      }));
      function trackAdExposure() {
        return _trackAdExposure.apply(this, arguments);
      }
      return trackAdExposure;
    })()
  }, {
    key: "trackAdConversion",
    value: (function() {
      var _trackAdConversion = _asyncToGenerator(/* @__PURE__ */ _regenerator().m(function _callee6() {
        var properties, eventName, eventProperties, _args6 = arguments;
        return _regenerator().w(function(_context6) {
          while (1) switch (_context6.n) {
            case 0:
              properties = _args6.length > 0 && _args6[0] !== void 0 ? _args6[0] : {};
              _context6.n = 1;
              return this.ensureInitialized();
            case 1:
              eventName = "ad_conversion";
              eventProperties = this.buildEventProperties(properties);
              this.trackEvent(eventName, eventProperties);
            case 2:
              return _context6.a(2);
          }
        }, _callee6, this);
      }));
      function trackAdConversion() {
        return _trackAdConversion.apply(this, arguments);
      }
      return trackAdConversion;
    })()
  }, {
    key: "trackCustomEvent",
    value: (function() {
      var _trackCustomEvent = _asyncToGenerator(/* @__PURE__ */ _regenerator().m(function _callee7(eventName) {
        var properties, eventProperties, _args7 = arguments;
        return _regenerator().w(function(_context7) {
          while (1) switch (_context7.n) {
            case 0:
              properties = _args7.length > 1 && _args7[1] !== void 0 ? _args7[1] : {};
              _context7.n = 1;
              return this.ensureInitialized();
            case 1:
              eventProperties = this.buildEventProperties(properties);
              this.trackEvent(eventName, eventProperties);
            case 2:
              return _context7.a(2);
          }
        }, _callee7, this);
      }));
      function trackCustomEvent(_x) {
        return _trackCustomEvent.apply(this, arguments);
      }
      return trackCustomEvent;
    })()
  }, {
    key: "buildEventProperties",
    value: function buildEventProperties() {
      var customProperties = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
      return _objectSpread2(_objectSpread2({}, customProperties), {}, {
        // 事件时间
        event_time: (/* @__PURE__ */ new Date()).toISOString()
        // 广告参数已经通过registerPage设置为公共属性，不需要重复添加
      });
    }
    /**
     * 发送事件到神策
     */
  }, {
    key: "trackEvent",
    value: function trackEvent(eventName, properties) {
      try {
        if (this.sensors) {
          this.sensors.track(eventName, properties);
          if (this.config.debug) {
            console.log("[MMXSensorTrack] 发送事件: ".concat(eventName), properties);
          }
        } else {
          console.warn("[MMXSensorTrack] 神策SDK未初始化");
        }
      } catch (error) {
        console.error("[MMXSensorTrack] 发送事件失败:", error);
      }
    }
    /**
     * 设置广告公共属性
     */
  }, {
    key: "setAdsProperties",
    value: function setAdsProperties() {
      var properties = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
      this.adsProperties = _objectSpread2(_objectSpread2({}, this.adsProperties), properties);
      this.updateSensorsPageProperties();
      if (this.config.debug) {
        console.log("[MMXSensorTrack] 设置广告公共属性:", this.adsProperties);
      }
    }
    /**
     * 获取当前广告参数
     */
  }, {
    key: "getAdsParams",
    value: function getAdsParams() {
      return _objectSpread2({}, this.adsParams);
    }
    /**
     * 清除广告参数
     */
  }, {
    key: "clearAdsParams",
    value: function clearAdsParams() {
      this.adsParams = {};
      this.adsProperties = {};
      var adsConfig = this.config.getAdsConfig();
      this.storage.removeItem(adsConfig.storage_key);
      if (this.sensors && this.isInitialized) {
        var baseProperties = this.getBaseProperties();
        this.sensors.registerPage(baseProperties);
      }
      if (this.config.debug) {
        console.log("[MMXSensorTrack] 已清除广告参数");
      }
    }
    /**
     * 确保SDK已初始化
     */
  }, {
    key: "ensureInitialized",
    value: (function() {
      var _ensureInitialized = _asyncToGenerator(/* @__PURE__ */ _regenerator().m(function _callee8() {
        return _regenerator().w(function(_context8) {
          while (1) switch (_context8.n) {
            case 0:
              if (this.isInitialized) {
                _context8.n = 1;
                break;
              }
              _context8.n = 1;
              return this.init();
            case 1:
              return _context8.a(2);
          }
        }, _callee8, this);
      }));
      function ensureInitialized() {
        return _ensureInitialized.apply(this, arguments);
      }
      return ensureInitialized;
    })()
  }, {
    key: "getSensorsInstance",
    value: function getSensorsInstance() {
      return this.sensors;
    }
  }]);
})();
var AdsConfig = /* @__PURE__ */ (function() {
  function AdsConfig2() {
    var options = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
    _classCallCheck(this, AdsConfig2);
    this.defaultConfig = {
      // 神策相关配置
      server_url: "",
      project_name: "",
      debug: false,
      // 广告追踪配置
      ads_config: {
        // 是否自动采集广告参数
        auto_collect: true,
        // 广告参数存储时长（毫秒）
        storage_duration: Infinity,
        // 不过期
        // 广告参数前缀
        param_prefix: "hl_ads_",
        // 存储键名
        storage_key: "ads_sensor_params"
      }
    };
    this.config = this.mergeConfig(this.defaultConfig, options);
    this.validateConfig();
  }
  return _createClass(AdsConfig2, [{
    key: "mergeConfig",
    value: function mergeConfig(defaultConfig, userConfig) {
      var result = _objectSpread2({}, defaultConfig);
      for (var key in userConfig) {
        if (Object.prototype.hasOwnProperty.call(userConfig, key)) {
          if (_typeof(userConfig[key]) === "object" && !Array.isArray(userConfig[key])) {
            result[key] = this.mergeConfig(result[key] || {}, userConfig[key]);
          } else {
            result[key] = userConfig[key];
          }
        }
      }
      return result;
    }
    /**
     * 验证配置
     */
  }, {
    key: "validateConfig",
    value: function validateConfig() {
      if (!this.config.server_url) {
        throw new Error("server_url是必需的配置项");
      }
      if (!this.config.project_name) {
        throw new Error("project_name是必需的配置项");
      }
    }
    /**
     * 获取配置
     */
  }, {
    key: "getConfig",
    value: function getConfig() {
      return this.config;
    }
    /**
     * 获取广告配置
     */
  }, {
    key: "getAdsConfig",
    value: function getAdsConfig() {
      return this.config.ads_config;
    }
    /**
     * 更新配置
     */
  }, {
    key: "updateConfig",
    value: function updateConfig(newConfig) {
      this.config = this.mergeConfig(this.config, newConfig);
      this.validateConfig();
    }
    /**
     * 获取调试模式
     */
  }, {
    key: "debug",
    get: function get() {
      return this.config.debug;
    }
  }]);
})();
var VERSION = "1.3.0";
var MMXSensorTrack = /* @__PURE__ */ (function() {
  function MMXSensorTrack2() {
    _classCallCheck(this, MMXSensorTrack2);
    this.version = VERSION;
    this.tracker = null;
    this.config = null;
    this.initialized = false;
    this.initPromise = null;
  }
  return _createClass(MMXSensorTrack2, [{
    key: "init",
    value: (function() {
      var _init = _asyncToGenerator(/* @__PURE__ */ _regenerator().m(function _callee() {
        var options, sensorsInstance, _args = arguments;
        return _regenerator().w(function(_context) {
          while (1) switch (_context.n) {
            case 0:
              options = _args.length > 0 && _args[0] !== void 0 ? _args[0] : {};
              sensorsInstance = _args.length > 1 && _args[1] !== void 0 ? _args[1] : null;
              if (!this.initPromise) {
                _context.n = 1;
                break;
              }
              return _context.a(2, this.initPromise);
            case 1:
              this.initPromise = this._doInit(options, sensorsInstance);
              return _context.a(2, this.initPromise);
          }
        }, _callee, this);
      }));
      function init() {
        return _init.apply(this, arguments);
      }
      return init;
    })()
  }, {
    key: "_doInit",
    value: (function() {
      var _doInit2 = _asyncToGenerator(/* @__PURE__ */ _regenerator().m(function _callee2(options) {
        var sensorsInstance, _args2 = arguments, _t;
        return _regenerator().w(function(_context2) {
          while (1) switch (_context2.n) {
            case 0:
              sensorsInstance = _args2.length > 1 && _args2[1] !== void 0 ? _args2[1] : null;
              if (!this.initialized) {
                _context2.n = 1;
                break;
              }
              console.warn("[MMXSensorTrack] SDK已经初始化");
              return _context2.a(2);
            case 1:
              _context2.p = 1;
              this.config = new AdsConfig(options);
              this.tracker = new MMXSensorTracker(this.config, sensorsInstance);
              _context2.n = 2;
              return this.tracker.init();
            case 2:
              this.initialized = true;
              if (this.config.debug) {
                console.log("[MMXSensorTrack] SDK初始化成功", {
                  version: this.version,
                  config: this.config.getConfig(),
                  externalSensors: !!sensorsInstance
                });
              }
              _context2.n = 4;
              break;
            case 3:
              _context2.p = 3;
              _t = _context2.v;
              console.error("[MMXSensorTrack] SDK初始化失败:", _t);
              throw _t;
            case 4:
              return _context2.a(2);
          }
        }, _callee2, this, [[1, 3]]);
      }));
      function _doInit(_x) {
        return _doInit2.apply(this, arguments);
      }
      return _doInit;
    })()
    /**
     * 确保SDK已初始化
     */
  }, {
    key: "_ensureInitialized",
    value: (function() {
      var _ensureInitialized2 = _asyncToGenerator(/* @__PURE__ */ _regenerator().m(function _callee3() {
        return _regenerator().w(function(_context3) {
          while (1) switch (_context3.n) {
            case 0:
              if (!(!this.initialized && !this.initPromise)) {
                _context3.n = 1;
                break;
              }
              throw new Error("[MMXSensorTrack] SDK未初始化，请先调用init()方法");
            case 1:
              if (!this.initPromise) {
                _context3.n = 2;
                break;
              }
              _context3.n = 2;
              return this.initPromise;
            case 2:
              return _context3.a(2);
          }
        }, _callee3, this);
      }));
      function _ensureInitialized() {
        return _ensureInitialized2.apply(this, arguments);
      }
      return _ensureInitialized;
    })()
  }, {
    key: "trackAdClick",
    value: (function() {
      var _trackAdClick = _asyncToGenerator(/* @__PURE__ */ _regenerator().m(function _callee4() {
        var properties, _args4 = arguments;
        return _regenerator().w(function(_context4) {
          while (1) switch (_context4.n) {
            case 0:
              properties = _args4.length > 0 && _args4[0] !== void 0 ? _args4[0] : {};
              _context4.n = 1;
              return this._ensureInitialized();
            case 1:
              return _context4.a(2, this.tracker.trackAdClick(properties));
          }
        }, _callee4, this);
      }));
      function trackAdClick() {
        return _trackAdClick.apply(this, arguments);
      }
      return trackAdClick;
    })()
    /**
     * 追踪广告曝光事件
     * @param {Object} properties 事件属性
     * @returns {Promise}
     */
  }, {
    key: "trackAdExposure",
    value: (function() {
      var _trackAdExposure = _asyncToGenerator(/* @__PURE__ */ _regenerator().m(function _callee5() {
        var properties, _args5 = arguments;
        return _regenerator().w(function(_context5) {
          while (1) switch (_context5.n) {
            case 0:
              properties = _args5.length > 0 && _args5[0] !== void 0 ? _args5[0] : {};
              _context5.n = 1;
              return this._ensureInitialized();
            case 1:
              return _context5.a(2, this.tracker.trackAdExposure(properties));
          }
        }, _callee5, this);
      }));
      function trackAdExposure() {
        return _trackAdExposure.apply(this, arguments);
      }
      return trackAdExposure;
    })()
  }, {
    key: "trackAdConversion",
    value: (function() {
      var _trackAdConversion = _asyncToGenerator(/* @__PURE__ */ _regenerator().m(function _callee6() {
        var properties, _args6 = arguments;
        return _regenerator().w(function(_context6) {
          while (1) switch (_context6.n) {
            case 0:
              properties = _args6.length > 0 && _args6[0] !== void 0 ? _args6[0] : {};
              _context6.n = 1;
              return this._ensureInitialized();
            case 1:
              return _context6.a(2, this.tracker.trackAdConversion(properties));
          }
        }, _callee6, this);
      }));
      function trackAdConversion() {
        return _trackAdConversion.apply(this, arguments);
      }
      return trackAdConversion;
    })()
  }, {
    key: "trackCustomEvent",
    value: (function() {
      var _trackCustomEvent = _asyncToGenerator(/* @__PURE__ */ _regenerator().m(function _callee7(eventName) {
        var properties, _args7 = arguments;
        return _regenerator().w(function(_context7) {
          while (1) switch (_context7.n) {
            case 0:
              properties = _args7.length > 1 && _args7[1] !== void 0 ? _args7[1] : {};
              _context7.n = 1;
              return this._ensureInitialized();
            case 1:
              return _context7.a(2, this.tracker.trackCustomEvent(eventName, properties));
          }
        }, _callee7, this);
      }));
      function trackCustomEvent(_x2) {
        return _trackCustomEvent.apply(this, arguments);
      }
      return trackCustomEvent;
    })()
  }, {
    key: "setAdsProperties",
    value: function setAdsProperties() {
      var properties = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
      if (!this.initialized) {
        console.error("[MMXSensorTrack] SDK未初始化");
        return;
      }
      this.tracker.setAdsProperties(properties);
    }
    /**
     * 获取当前广告参数
     * @returns {Object} 广告参数
     */
  }, {
    key: "getAdsParams",
    value: function getAdsParams() {
      if (!this.initialized) {
        console.error("[MMXSensorTrack] SDK未初始化");
        return {};
      }
      return this.tracker.getAdsParams();
    }
    /**
     * 清除广告参数缓存
     */
  }, {
    key: "clearAdsParams",
    value: function clearAdsParams() {
      if (!this.initialized) {
        console.error("[MMXSensorTrack] SDK未初始化");
        return;
      }
      this.tracker.clearAdsParams();
    }
    /**
     * 获取神策SDK实例（高级用法）
     * @returns {Object} 神策SDK实例
     */
  }, {
    key: "getSensorsInstance",
    value: function getSensorsInstance() {
      if (!this.initialized) {
        console.error("[MMXSensorTrack] SDK未初始化");
        return null;
      }
      return this.tracker.getSensorsInstance();
    }
    /**
     * 获取公共追踪参数（类似你的示例）
     * @returns {Object} 公共参数
     */
  }, {
    key: "getCommonTrackParams",
    value: function getCommonTrackParams() {
      if (!this.initialized) {
        return {};
      }
      return this.tracker.getBaseProperties();
    }
    // === 神策原生SDK方法透传 ===
    /**
     * 创建神策方法代理
     * 自动透传所有神策SDK的方法，避免手动一个个添加
     */
  }, {
    key: "_createSensorsProxy",
    value: function _createSensorsProxy() {
      if (!this.initialized) {
        throw new Error("[MMXSensorTrack] SDK未初始化");
      }
      var sensors = this.tracker.getSensorsInstance();
      if (!sensors) {
        throw new Error("[MMXSensorTrack] 神策SDK实例未找到");
      }
      return new Proxy(sensors, {
        get: function get(target, prop) {
          var originalMethod = target[prop];
          if (typeof originalMethod !== "function") {
            return originalMethod;
          }
          return function() {
            try {
              for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
                args[_key] = arguments[_key];
              }
              var result = originalMethod.apply(target, args);
              if (result && typeof result.then === "function") {
                return result.catch(function(error) {
                  console.error("[MMXSensorTrack] 神策方法 ".concat(prop, " 执行失败:"), error);
                  throw error;
                });
              }
              return result;
            } catch (error) {
              console.error("[MMXSensorTrack] 神策方法 ".concat(prop, " 执行失败:"), error);
              throw error;
            }
          };
        }
      });
    }
    /**
     * 获取神策SDK代理对象
     * 通过代理可以直接调用神策SDK的所有方法
     * @returns {Proxy} 神策SDK代理对象
     */
  }, {
    key: "getSensorsProxy",
    value: function getSensorsProxy() {
      return this._createSensorsProxy();
    }
    /**
     * 便捷方法：直接调用神策SDK方法
     * @param {string} methodName 方法名
     * @param {...any} args 参数
     * @returns {any} 方法执行结果
     */
  }, {
    key: "callSensorsMethod",
    value: (function() {
      var _callSensorsMethod = _asyncToGenerator(/* @__PURE__ */ _regenerator().m(function _callee8(methodName) {
        var proxy, _len2, args, _key2, _args8 = arguments;
        return _regenerator().w(function(_context8) {
          while (1) switch (_context8.n) {
            case 0:
              _context8.n = 1;
              return this._ensureInitialized();
            case 1:
              proxy = this._createSensorsProxy();
              for (_len2 = _args8.length, args = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
                args[_key2 - 1] = _args8[_key2];
              }
              return _context8.a(2, proxy[methodName].apply(proxy, args));
          }
        }, _callee8, this);
      }));
      function callSensorsMethod(_x3) {
        return _callSensorsMethod.apply(this, arguments);
      }
      return callSensorsMethod;
    })()
  }, {
    key: "track",
    value: (function() {
      var _track = _asyncToGenerator(/* @__PURE__ */ _regenerator().m(function _callee9(eventName) {
        var properties, _args9 = arguments;
        return _regenerator().w(function(_context9) {
          while (1) switch (_context9.n) {
            case 0:
              properties = _args9.length > 1 && _args9[1] !== void 0 ? _args9[1] : {};
              return _context9.a(2, this.callSensorsMethod("track", eventName, properties));
          }
        }, _callee9, this);
      }));
      function track(_x4) {
        return _track.apply(this, arguments);
      }
      return track;
    })()
    /**
     * 设置用户属性 - 神策原生方法
     */
  }, {
    key: "set",
    value: (function() {
      var _set = _asyncToGenerator(/* @__PURE__ */ _regenerator().m(function _callee0() {
        var properties, _args0 = arguments;
        return _regenerator().w(function(_context0) {
          while (1) switch (_context0.n) {
            case 0:
              properties = _args0.length > 0 && _args0[0] !== void 0 ? _args0[0] : {};
              return _context0.a(2, this.callSensorsMethod("set", properties));
          }
        }, _callee0, this);
      }));
      function set() {
        return _set.apply(this, arguments);
      }
      return set;
    })()
  }, {
    key: "setOnce",
    value: (function() {
      var _setOnce = _asyncToGenerator(/* @__PURE__ */ _regenerator().m(function _callee1() {
        var properties, _args1 = arguments;
        return _regenerator().w(function(_context1) {
          while (1) switch (_context1.n) {
            case 0:
              properties = _args1.length > 0 && _args1[0] !== void 0 ? _args1[0] : {};
              return _context1.a(2, this.callSensorsMethod("setOnce", properties));
          }
        }, _callee1, this);
      }));
      function setOnce() {
        return _setOnce.apply(this, arguments);
      }
      return setOnce;
    })()
  }, {
    key: "increment",
    value: (function() {
      var _increment = _asyncToGenerator(/* @__PURE__ */ _regenerator().m(function _callee10() {
        var properties, _args10 = arguments;
        return _regenerator().w(function(_context10) {
          while (1) switch (_context10.n) {
            case 0:
              properties = _args10.length > 0 && _args10[0] !== void 0 ? _args10[0] : {};
              return _context10.a(2, this.callSensorsMethod("increment", properties));
          }
        }, _callee10, this);
      }));
      function increment() {
        return _increment.apply(this, arguments);
      }
      return increment;
    })()
  }, {
    key: "append",
    value: (function() {
      var _append = _asyncToGenerator(/* @__PURE__ */ _regenerator().m(function _callee11() {
        var properties, _args11 = arguments;
        return _regenerator().w(function(_context11) {
          while (1) switch (_context11.n) {
            case 0:
              properties = _args11.length > 0 && _args11[0] !== void 0 ? _args11[0] : {};
              return _context11.a(2, this.callSensorsMethod("append", properties));
          }
        }, _callee11, this);
      }));
      function append() {
        return _append.apply(this, arguments);
      }
      return append;
    })()
  }, {
    key: "unset",
    value: (function() {
      var _unset = _asyncToGenerator(/* @__PURE__ */ _regenerator().m(function _callee12(properties) {
        return _regenerator().w(function(_context12) {
          while (1) switch (_context12.n) {
            case 0:
              return _context12.a(2, this.callSensorsMethod("unset", properties));
          }
        }, _callee12, this);
      }));
      function unset(_x5) {
        return _unset.apply(this, arguments);
      }
      return unset;
    })()
  }, {
    key: "deleteUser",
    value: (function() {
      var _deleteUser = _asyncToGenerator(/* @__PURE__ */ _regenerator().m(function _callee13() {
        return _regenerator().w(function(_context13) {
          while (1) switch (_context13.n) {
            case 0:
              return _context13.a(2, this.callSensorsMethod("deleteUser"));
          }
        }, _callee13, this);
      }));
      function deleteUser() {
        return _deleteUser.apply(this, arguments);
      }
      return deleteUser;
    })()
  }, {
    key: "login",
    value: (function() {
      var _login = _asyncToGenerator(/* @__PURE__ */ _regenerator().m(function _callee14(loginId) {
        var properties, _args14 = arguments;
        return _regenerator().w(function(_context14) {
          while (1) switch (_context14.n) {
            case 0:
              properties = _args14.length > 1 && _args14[1] !== void 0 ? _args14[1] : {};
              return _context14.a(2, this.callSensorsMethod("login", loginId, properties));
          }
        }, _callee14, this);
      }));
      function login(_x6) {
        return _login.apply(this, arguments);
      }
      return login;
    })()
  }, {
    key: "logout",
    value: (function() {
      var _logout = _asyncToGenerator(/* @__PURE__ */ _regenerator().m(function _callee15() {
        return _regenerator().w(function(_context15) {
          while (1) switch (_context15.n) {
            case 0:
              return _context15.a(2, this.callSensorsMethod("logout"));
          }
        }, _callee15, this);
      }));
      function logout() {
        return _logout.apply(this, arguments);
      }
      return logout;
    })()
  }, {
    key: "trackSignup",
    value: (function() {
      var _trackSignup = _asyncToGenerator(/* @__PURE__ */ _regenerator().m(function _callee16(loginId) {
        var properties, _args16 = arguments;
        return _regenerator().w(function(_context16) {
          while (1) switch (_context16.n) {
            case 0:
              properties = _args16.length > 1 && _args16[1] !== void 0 ? _args16[1] : {};
              return _context16.a(2, this.callSensorsMethod("trackSignup", loginId, properties));
          }
        }, _callee16, this);
      }));
      function trackSignup(_x7) {
        return _trackSignup.apply(this, arguments);
      }
      return trackSignup;
    })()
  }, {
    key: "identify",
    value: (function() {
      var _identify = _asyncToGenerator(/* @__PURE__ */ _regenerator().m(function _callee17(userId) {
        var properties, _args17 = arguments;
        return _regenerator().w(function(_context17) {
          while (1) switch (_context17.n) {
            case 0:
              properties = _args17.length > 1 && _args17[1] !== void 0 ? _args17[1] : {};
              return _context17.a(2, this.callSensorsMethod("identify", userId, properties));
          }
        }, _callee17, this);
      }));
      function identify(_x8) {
        return _identify.apply(this, arguments);
      }
      return identify;
    })()
  }, {
    key: "registerPage",
    value: (function() {
      var _registerPage = _asyncToGenerator(/* @__PURE__ */ _regenerator().m(function _callee18() {
        var properties, _args18 = arguments;
        return _regenerator().w(function(_context18) {
          while (1) switch (_context18.n) {
            case 0:
              properties = _args18.length > 0 && _args18[0] !== void 0 ? _args18[0] : {};
              return _context18.a(2, this.callSensorsMethod("registerPage", properties));
          }
        }, _callee18, this);
      }));
      function registerPage() {
        return _registerPage.apply(this, arguments);
      }
      return registerPage;
    })()
  }, {
    key: "quick",
    value: (function() {
      var _quick = _asyncToGenerator(/* @__PURE__ */ _regenerator().m(function _callee19(name, value) {
        return _regenerator().w(function(_context19) {
          while (1) switch (_context19.n) {
            case 0:
              return _context19.a(2, this.callSensorsMethod("quick", name, value));
          }
        }, _callee19, this);
      }));
      function quick(_x9, _x0) {
        return _quick.apply(this, arguments);
      }
      return quick;
    })()
  }, {
    key: "getDistinctId",
    value: function getDistinctId() {
      if (!this.initialized) {
        console.error("[MMXSensorTrack] SDK未初始化");
        return null;
      }
      var proxy = this._createSensorsProxy();
      return proxy.getDistinctId();
    }
    /**
     * 获取匿名ID - 神策原生方法
     */
  }, {
    key: "getAnonymousId",
    value: function getAnonymousId() {
      if (!this.initialized) {
        console.error("[MMXSensorTrack] SDK未初始化");
        return null;
      }
      var proxy = this._createSensorsProxy();
      return proxy.getAnonymousId();
    }
    /**
     * 获取预置属性 - 神策原生方法
     */
  }, {
    key: "getPresetProperties",
    value: function getPresetProperties() {
      if (!this.initialized) {
        console.error("[MMXSensorTrack] SDK未初始化");
        return {};
      }
      var proxy = this._createSensorsProxy();
      return proxy.getPresetProperties();
    }
    /**
     * 使用插件 - 神策原生方法
     */
  }, {
    key: "use",
    value: (function() {
      var _use = _asyncToGenerator(/* @__PURE__ */ _regenerator().m(function _callee20(pluginName) {
        var options, _args20 = arguments;
        return _regenerator().w(function(_context20) {
          while (1) switch (_context20.n) {
            case 0:
              options = _args20.length > 1 && _args20[1] !== void 0 ? _args20[1] : {};
              return _context20.a(2, this.callSensorsMethod("use", pluginName, options));
          }
        }, _callee20, this);
      }));
      function use(_x1) {
        return _use.apply(this, arguments);
      }
      return use;
    })()
  }, {
    key: "clearAllData",
    value: (function() {
      var _clearAllData = _asyncToGenerator(/* @__PURE__ */ _regenerator().m(function _callee21() {
        return _regenerator().w(function(_context21) {
          while (1) switch (_context21.n) {
            case 0:
              return _context21.a(2, this.callSensorsMethod("clearAllData"));
          }
        }, _callee21, this);
      }));
      function clearAllData() {
        return _clearAllData.apply(this, arguments);
      }
      return clearAllData;
    })()
  }]);
})();
var mmxSensorTrack = new MMXSensorTrack();
if (typeof window !== "undefined") {
  window.mmxSensorTrack = mmxSensorTrack;
}
export {
  MMXSensorTrack,
  VERSION,
  mmxSensorTrack as default
};
