import { fS as getDefaultExportFromCjs } from "./main.jsx";
function _mergeNamespaces(n, m2) {
  for (var i = 0; i < m2.length; i++) {
    const e = m2[i];
    if (typeof e !== "string" && !Array.isArray(e)) {
      for (const k in e) {
        if (k !== "default" && !(k in n)) {
          const d = Object.getOwnPropertyDescriptor(e, k);
          if (d) {
            Object.defineProperty(n, k, d.get ? d : {
              enumerable: true,
              get: () => e[k]
            });
          }
        }
      }
    }
  }
  return Object.freeze(Object.defineProperty(n, Symbol.toStringTag, { value: "Module" }));
}
var sensorsdata$2 = { exports: {} };
var hasRequiredSensorsdata;
function requireSensorsdata() {
  if (hasRequiredSensorsdata) return sensorsdata$2.exports;
  hasRequiredSensorsdata = 1;
  (function(module, exports$1) {
    !(function(e, t) {
      module.exports = t();
    })(0, function() {
      var e, t = {};
      function r(e2) {
        if (!e2) return false;
        var t2 = Object.prototype.toString.call(e2);
        return "[object Function]" == t2 || "[object AsyncFunction]" == t2;
      }
      function n() {
        return Date.now && r(Date.now) ? Date.now() : (/* @__PURE__ */ new Date()).getTime();
      }
      t.DEFAULT_SEND_TYPE = "image", function() {
        var e2 = { "function": true, object: true }, t2 = e2[typeof window] && window || this;
        var r2 = t2.JSON, n2 = t2.JSON3, i2 = false, a2 = (function o2(r3, n3) {
          r3 || (r3 = t2.Object()), n3 || (n3 = t2.Object());
          var i3 = r3.Number || t2.Number, a3 = r3.String || t2.String, s2 = r3.Object || t2.Object, l2 = r3.Date || t2.Date, u2 = r3.SyntaxError || t2.SyntaxError, c2 = r3.TypeError || t2.TypeError, p2 = r3.Math || t2.Math, d2 = r3.JSON || t2.JSON;
          if ("object" == typeof d2 && d2) return n3.stringify = d2.stringify, n3.parse = d2.parse, n3.runInContext = o2, n3;
          var f2, g2 = s2.prototype, _2 = g2.toString, h2 = g2.hasOwnProperty;
          function m2(e3, t3) {
            try {
              e3();
            } catch (r4) {
              t3 && t3();
            }
          }
          var v2 = new l2(-3509827334573292);
          function y2(e3) {
            if (null != y2[e3]) return y2[e3];
            var t3;
            if ("bug-string-char-index" == e3) t3 = "a" != "a"[0];
            else if ("json" == e3) t3 = y2("json-stringify") && y2("date-serialization") && y2("json-parse");
            else if ("date-serialization" == e3) {
              if (t3 = y2("json-stringify") && v2) {
                var r4 = n3.stringify;
                m2(function() {
                  t3 = '"-271821-04-20T00:00:00.000Z"' == r4(new l2(-864e13)) && '"+275760-09-13T00:00:00.000Z"' == r4(new l2(864e13)) && '"-000001-01-01T00:00:00.000Z"' == r4(new l2(-621987552e5)) && '"1969-12-31T23:59:59.999Z"' == r4(new l2(-1));
                });
              }
            } else {
              var o3, s3 = '{"a":[1,true,false,null,"\\u0000\\b\\n\\f\\r\\t"]}';
              if ("json-stringify" == e3) {
                var u3 = "function" == typeof (r4 = n3.stringify);
                u3 && ((o3 = function() {
                  return 1;
                }).toJSON = o3, m2(function() {
                  u3 = "0" === r4(0) && "0" === r4(new i3()) && '""' == r4(new a3()) && r4(_2) === f2 && r4(f2) === f2 && r4() === f2 && "1" === r4(o3) && "[1]" == r4([o3]) && "[null]" == r4([f2]) && "null" == r4(null) && "[null,null,null]" == r4([f2, _2, null]) && r4({ a: [o3, true, false, null, "\0\b\n\f\r	"] }) == s3 && "1" === r4(null, o3) && "[\n 1,\n 2\n]" == r4([1, 2], null, 1);
                }, function() {
                  u3 = false;
                })), t3 = u3;
              }
              if ("json-parse" == e3) {
                var c3, p3 = n3.parse;
                "function" == typeof p3 && m2(function() {
                  0 !== p3("0") || p3(false) || (o3 = p3(s3), (c3 = 5 == o3.a.length && 1 === o3.a[0]) && (m2(function() {
                    c3 = !p3('"	"');
                  }), c3 && m2(function() {
                    c3 = 1 !== p3("01");
                  }), c3 && m2(function() {
                    c3 = 1 !== p3("1.");
                  })));
                }, function() {
                  c3 = false;
                }), t3 = c3;
              }
            }
            return y2[e3] = !!t3;
          }
          if (m2(function() {
            v2 = -109252 == v2.getUTCFullYear() && 0 === v2.getUTCMonth() && 1 === v2.getUTCDate() && 10 == v2.getUTCHours() && 37 == v2.getUTCMinutes() && 6 == v2.getUTCSeconds() && 708 == v2.getUTCMilliseconds();
          }), y2["bug-string-char-index"] = y2["date-serialization"] = y2.json = y2["json-stringify"] = y2["json-parse"] = null, !y2("json")) {
            var b2 = y2("bug-string-char-index"), w2 = function(t3, r4) {
              var n4, i4, a4, o3 = 0;
              for (a4 in (n4 = function() {
                this.valueOf = 0;
              }).prototype.valueOf = 0, i4 = new n4()) h2.call(i4, a4) && o3++;
              return n4 = i4 = null, o3 ? w2 = function(e3, t4) {
                var r5, n5, i5 = "[object Function]" == _2.call(e3);
                for (r5 in e3) i5 && "prototype" == r5 || !h2.call(e3, r5) || (n5 = "constructor" === r5) || t4(r5);
                (n5 || h2.call(e3, r5 = "constructor")) && t4(r5);
              } : (i4 = ["valueOf", "toString", "toLocaleString", "propertyIsEnumerable", "isPrototypeOf", "hasOwnProperty", "constructor"], w2 = function(t4, r5) {
                var n5, a5, o4 = "[object Function]" == _2.call(t4), s3 = !o4 && "function" != typeof t4.constructor && e2[typeof t4.hasOwnProperty] && t4.hasOwnProperty || h2;
                for (n5 in t4) o4 && "prototype" == n5 || !s3.call(t4, n5) || r5(n5);
                for (a5 = i4.length; n5 = i4[--a5]; ) s3.call(t4, n5) && r5(n5);
              }), w2(t3, r4);
            };
            if (!y2("json-stringify") && !y2("date-serialization")) {
              var S2 = { 92: "\\\\", 34: '\\"', 8: "\\b", 12: "\\f", 10: "\\n", 13: "\\r", 9: "\\t" }, k2 = function(e3, t3) {
                return ("000000" + (t3 || 0)).slice(-e3);
              }, P2 = function(e3) {
                var t3, r4, n4, i4, a4, o3, s3, l3, u3;
                if (v2) t3 = function(e4) {
                  r4 = e4.getUTCFullYear(), n4 = e4.getUTCMonth(), i4 = e4.getUTCDate(), o3 = e4.getUTCHours(), s3 = e4.getUTCMinutes(), l3 = e4.getUTCSeconds(), u3 = e4.getUTCMilliseconds();
                };
                else {
                  var c3 = p2.floor, d3 = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334], f3 = function(e4, t4) {
                    return d3[t4] + 365 * (e4 - 1970) + c3((e4 - 1969 + (t4 = +(t4 > 1))) / 4) - c3((e4 - 1901 + t4) / 100) + c3((e4 - 1601 + t4) / 400);
                  };
                  t3 = function(e4) {
                    for (i4 = c3(e4 / 864e5), r4 = c3(i4 / 365.2425) + 1970 - 1; f3(r4 + 1, 0) <= i4; r4++) ;
                    for (n4 = c3((i4 - f3(r4, 0)) / 30.42); f3(r4, n4 + 1) <= i4; n4++) ;
                    i4 = 1 + i4 - f3(r4, n4), o3 = c3((a4 = (e4 % 864e5 + 864e5) % 864e5) / 36e5) % 24, s3 = c3(a4 / 6e4) % 60, l3 = c3(a4 / 1e3) % 60, u3 = a4 % 1e3;
                  };
                }
                return (P2 = function(e4) {
                  return e4 > -1 / 0 && e4 < 1 / 0 ? (t3(e4), e4 = (r4 <= 0 || r4 >= 1e4 ? (r4 < 0 ? "-" : "+") + k2(6, r4 < 0 ? -r4 : r4) : k2(4, r4)) + "-" + k2(2, n4 + 1) + "-" + k2(2, i4) + "T" + k2(2, o3) + ":" + k2(2, s3) + ":" + k2(2, l3) + "." + k2(3, u3) + "Z", r4 = n4 = i4 = o3 = s3 = l3 = u3 = null) : e4 = null, e4;
                })(e3);
              };
              if (y2("json-stringify") && !y2("date-serialization")) {
                let C2 = function(e3) {
                  return P2(this);
                };
                var O2 = n3.stringify;
                n3.stringify = function(e3, t3, r4) {
                  var n4 = l2.prototype.toJSON;
                  l2.prototype.toJSON = C2;
                  var i4 = O2(e3, t3, r4);
                  return l2.prototype.toJSON = n4, i4;
                };
              } else {
                var j2 = function(e3) {
                  var t3 = e3.charCodeAt(0), r4 = S2[t3];
                  return r4 || "\\u00" + k2(2, t3.toString(16));
                }, N2 = /[\x00-\x1f\x22\x5c]/g, T2 = function(e3) {
                  return N2.lastIndex = 0, '"' + (N2.test(e3) ? e3.replace(N2, j2) : e3) + '"';
                }, I2 = function(e3, t3, r4, n4, i4, a4, o3) {
                  var s3, u3, p3, d3, g3, h3, v3, y3, b3;
                  if (m2(function() {
                    s3 = t3[e3];
                  }), "object" == typeof s3 && s3 && (s3.getUTCFullYear && "[object Date]" == _2.call(s3) && s3.toJSON === l2.prototype.toJSON ? s3 = P2(s3) : "function" == typeof s3.toJSON && (s3 = s3.toJSON(e3))), r4 && (s3 = r4.call(t3, e3, s3)), s3 == f2) return s3 === f2 ? s3 : "null";
                  switch ("object" == (u3 = typeof s3) && (p3 = _2.call(s3)), p3 || u3) {
                    case "boolean":
                    case "[object Boolean]":
                      return "" + s3;
                    case "number":
                    case "[object Number]":
                      return s3 > -1 / 0 && s3 < 1 / 0 ? "" + s3 : "null";
                    case "string":
                    case "[object String]":
                      return T2("" + s3);
                  }
                  if ("object" == typeof s3) {
                    for (v3 = o3.length; v3--; ) if (o3[v3] === s3) throw c2();
                    if (o3.push(s3), d3 = [], y3 = a4, a4 += i4, "[object Array]" == p3) {
                      for (h3 = 0, v3 = s3.length; h3 < v3; h3++) g3 = I2(h3, s3, r4, n4, i4, a4, o3), d3.push(g3 === f2 ? "null" : g3);
                      b3 = d3.length ? i4 ? "[\n" + a4 + d3.join(",\n" + a4) + "\n" + y3 + "]" : "[" + d3.join(",") + "]" : "[]";
                    } else w2(n4 || s3, function(e4) {
                      var t4 = I2(e4, s3, r4, n4, i4, a4, o3);
                      t4 !== f2 && d3.push(T2(e4) + ":" + (i4 ? " " : "") + t4);
                    }), b3 = d3.length ? i4 ? "{\n" + a4 + d3.join(",\n" + a4) + "\n" + y3 + "}" : "{" + d3.join(",") + "}" : "{}";
                    return o3.pop(), b3;
                  }
                };
                n3.stringify = function(t3, r4, n4) {
                  var i4, a4, o3, s3;
                  if (e2[typeof r4] && r4) {
                    if ("[object Function]" == (s3 = _2.call(r4))) a4 = r4;
                    else if ("[object Array]" == s3) {
                      o3 = {};
                      for (var l3, u3 = 0, c3 = r4.length; u3 < c3; ) l3 = r4[u3++], "[object String]" != (s3 = _2.call(l3)) && "[object Number]" != s3 || (o3[l3] = 1);
                    }
                  }
                  if (n4) if ("[object Number]" == (s3 = _2.call(n4))) {
                    if ((n4 -= n4 % 1) > 0) for (n4 > 10 && (n4 = 10), i4 = ""; i4.length < n4; ) i4 += " ";
                  } else "[object String]" == s3 && (i4 = n4.length <= 10 ? n4 : n4.slice(0, 10));
                  return I2("", ((l3 = {})[""] = t3, l3), a4, o3, i4, "", []);
                };
              }
            }
            if (!y2("json-parse")) {
              var A2, D2, $2 = a3.fromCharCode, x2 = { 92: "\\", 34: '"', 47: "/", 98: "\b", 116: "	", 110: "\n", 102: "\f", 114: "\r" }, E2 = function() {
                throw A2 = D2 = null, u2();
              }, L2 = function() {
                for (var e3, t3, r4, n4, i4, a4 = D2, o3 = a4.length; A2 < o3; ) switch (i4 = a4.charCodeAt(A2)) {
                  case 9:
                  case 10:
                  case 13:
                  case 32:
                    A2++;
                    break;
                  case 123:
                  case 125:
                  case 91:
                  case 93:
                  case 58:
                  case 44:
                    return e3 = b2 ? a4.charAt(A2) : a4[A2], A2++, e3;
                  case 34:
                    for (e3 = "@", A2++; A2 < o3; ) if ((i4 = a4.charCodeAt(A2)) < 32) E2();
                    else if (92 == i4) switch (i4 = a4.charCodeAt(++A2)) {
                      case 92:
                      case 34:
                      case 47:
                      case 98:
                      case 116:
                      case 110:
                      case 102:
                      case 114:
                        e3 += x2[i4], A2++;
                        break;
                      case 117:
                        for (t3 = ++A2, r4 = A2 + 4; A2 < r4; A2++) (i4 = a4.charCodeAt(A2)) >= 48 && i4 <= 57 || i4 >= 97 && i4 <= 102 || i4 >= 65 && i4 <= 70 || E2();
                        e3 += $2("0x" + a4.slice(t3, A2));
                        break;
                      default:
                        E2();
                    }
                    else {
                      if (34 == i4) break;
                      for (i4 = a4.charCodeAt(A2), t3 = A2; i4 >= 32 && 92 != i4 && 34 != i4; ) i4 = a4.charCodeAt(++A2);
                      e3 += a4.slice(t3, A2);
                    }
                    if (34 == a4.charCodeAt(A2)) return A2++, e3;
                    E2();
                  default:
                    if (t3 = A2, 45 == i4 && (n4 = true, i4 = a4.charCodeAt(++A2)), i4 >= 48 && i4 <= 57) {
                      for (48 == i4 && (i4 = a4.charCodeAt(A2 + 1)) >= 48 && i4 <= 57 && E2(), n4 = false; A2 < o3 && (i4 = a4.charCodeAt(A2)) >= 48 && i4 <= 57; A2++) ;
                      if (46 == a4.charCodeAt(A2)) {
                        for (r4 = ++A2; r4 < o3 && !((i4 = a4.charCodeAt(r4)) < 48 || i4 > 57); r4++) ;
                        r4 == A2 && E2(), A2 = r4;
                      }
                      if (101 == (i4 = a4.charCodeAt(A2)) || 69 == i4) {
                        for (43 != (i4 = a4.charCodeAt(++A2)) && 45 != i4 || A2++, r4 = A2; r4 < o3 && !((i4 = a4.charCodeAt(r4)) < 48 || i4 > 57); r4++) ;
                        r4 == A2 && E2(), A2 = r4;
                      }
                      return +a4.slice(t3, A2);
                    }
                    n4 && E2();
                    var s3 = a4.slice(A2, A2 + 4);
                    if ("true" == s3) return A2 += 4, true;
                    if ("fals" == s3 && 101 == a4.charCodeAt(A2 + 4)) return A2 += 5, false;
                    if ("null" == s3) return A2 += 4, null;
                    E2();
                }
                return "$";
              }, U2 = function(e3) {
                var t3, r4;
                if ("$" == e3 && E2(), "string" == typeof e3) {
                  if ("@" == (b2 ? e3.charAt(0) : e3[0])) return e3.slice(1);
                  if ("[" == e3) {
                    for (t3 = []; "]" != (e3 = L2()); ) r4 ? "," == e3 ? "]" == (e3 = L2()) && E2() : E2() : r4 = true, "," == e3 && E2(), t3.push(U2(e3));
                    return t3;
                  }
                  if ("{" == e3) {
                    for (t3 = {}; "}" != (e3 = L2()); ) r4 ? "," == e3 ? "}" == (e3 = L2()) && E2() : E2() : r4 = true, "," != e3 && "string" == typeof e3 && "@" == (b2 ? e3.charAt(0) : e3[0]) && ":" == L2() || E2(), t3[e3.slice(1)] = U2(L2());
                    return t3;
                  }
                  E2();
                }
                return e3;
              }, R2 = function(e3, t3, r4) {
                var n4 = B2(e3, t3, r4);
                n4 === f2 ? delete e3[t3] : e3[t3] = n4;
              }, B2 = function(e3, t3, r4) {
                var n4, i4 = e3[t3];
                if ("object" == typeof i4 && i4) if ("[object Array]" == _2.call(i4)) for (n4 = i4.length; n4--; ) R2(_2, w2, i4);
                else w2(i4, function(e4) {
                  R2(i4, e4, r4);
                });
                return r4.call(e3, t3, i4);
              };
              n3.parse = function(e3, t3) {
                var r4, n4;
                return A2 = 0, D2 = "" + e3, r4 = U2(L2()), "$" != L2() && E2(), A2 = D2 = null, t3 && "[object Function]" == _2.call(t3) ? B2(((n4 = {})[""] = r4, n4), "", t3) : r4;
              };
            }
          }
          return n3.runInContext = o2, n3;
        })(t2, t2.JSON3 = { noConflict: function() {
          return i2 || (i2 = true, t2.JSON = r2, t2.JSON3 = n2, r2 = n2 = null), a2;
        } });
        t2.JSON ? (t2.JSON.parse = a2.parse, t2.JSON.stringify = a2.stringify) : t2.JSON = { parse: a2.parse, stringify: a2.stringify };
      }.call(window), (function(e2) {
        if (e2.atob) try {
          e2.atob(" ");
        } catch (a2) {
          e2.atob = (t2 = e2.atob, (r2 = function(e3) {
            return t2(String(e3).replace(/[\t\n\f\r ]+/g, ""));
          }).original = t2, r2);
        }
        else {
          var t2, r2, n2 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=", i2 = /^(?:[A-Za-z\d+\/]{4})*?(?:[A-Za-z\d+\/]{2}(?:==)?|[A-Za-z\d+\/]{3}=?)?$/;
          e2.btoa = function(e3) {
            e3 = String(e3);
            for (var t3, r3, i3, a2, o2 = "", s2 = 0, l2 = e3.length % 3; s2 < e3.length; ) {
              if ((r3 = e3.charCodeAt(s2++)) > 255 || (i3 = e3.charCodeAt(s2++)) > 255 || (a2 = e3.charCodeAt(s2++)) > 255) return "";
              o2 += n2.charAt((t3 = r3 << 16 | i3 << 8 | a2) >> 18 & 63) + n2.charAt(t3 >> 12 & 63) + n2.charAt(t3 >> 6 & 63) + n2.charAt(63 & t3);
            }
            return l2 ? o2.slice(0, l2 - 3) + "===".substring(l2) : o2;
          }, e2.atob = function(e3) {
            if (e3 = String(e3).replace(/[\t\n\f\r ]+/g, ""), !i2.test(e3)) return "";
            e3 += "==".slice(2 - (3 & e3.length));
            for (var t3, r3, a2, o2 = "", s2 = 0; s2 < e3.length; ) t3 = n2.indexOf(e3.charAt(s2++)) << 18 | n2.indexOf(e3.charAt(s2++)) << 12 | (r3 = n2.indexOf(e3.charAt(s2++))) << 6 | (a2 = n2.indexOf(e3.charAt(s2++))), o2 += 64 === r3 ? String.fromCharCode(t3 >> 16 & 255) : 64 === a2 ? String.fromCharCode(t3 >> 16 & 255, t3 >> 8 & 255) : String.fromCharCode(t3 >> 16 & 255, t3 >> 8 & 255, 255 & t3);
            return o2;
          };
        }
      })(window);
      var i = { setup: function(t2) {
        e = t2;
      }, log: function() {
        (e || console && console.log || function() {
        }).apply(null, arguments);
      } }, a = { get: function(e2) {
        return window.localStorage.getItem(e2);
      }, parse: function(e2) {
        var t2;
        try {
          t2 = JSON.parse(a.get(e2)) || null;
        } catch (r2) {
          i.log(r2);
        }
        return t2;
      }, set: function(e2, t2) {
        try {
          window.localStorage.setItem(e2, t2);
        } catch (r2) {
          i.log(r2);
        }
      }, remove: function(e2) {
        window.localStorage.removeItem(e2);
      }, isSupport: function() {
        var e2 = true;
        try {
          var t2 = "__local_store_support__", r2 = "testIsSupportStorage";
          a.set(t2, r2), a.get(t2) !== r2 && (e2 = false), a.remove(t2);
        } catch (n2) {
          e2 = false;
        }
        return e2;
      } };
      function s(e2) {
        return null != e2 && "[object Object]" == Object.prototype.toString.call(e2);
      }
      var l = (function() {
        var e2 = (/* @__PURE__ */ new Date()).getTime();
        return function(t2) {
          return Math.ceil((e2 = (9301 * e2 + 49297) % 233280) / 233280 * t2);
        };
      })();
      function u() {
        if ("function" == typeof Uint32Array) {
          var e2 = "";
          if ("undefined" != typeof crypto ? e2 = crypto : "undefined" != typeof msCrypto && (e2 = msCrypto), s(e2) && e2.getRandomValues) {
            var t2 = new Uint32Array(1);
            return e2.getRandomValues(t2)[0] / Math.pow(2, 32);
          }
        }
        return l(1e19) / 1e19;
      }
      function c(e2) {
        var t2 = null;
        try {
          t2 = JSON.parse(e2);
        } catch (r2) {
        }
        return t2;
      }
      function p(e2, t2) {
        this.lockGetPrefix = e2 || "lock-get-prefix", this.lockSetPrefix = t2 || "lock-set-prefix";
      }
      function d(e2) {
        return "function" == typeof e2 || !(!e2 || "object" != typeof e2) && d(e2.listener);
      }
      function f() {
        this._events = {};
      }
      function g(e2) {
        var t2 = e2;
        try {
          t2 = decodeURIComponent(e2);
        } catch (r2) {
          t2 = e2;
        }
        return t2;
      }
      function _(e2) {
        e2 = e2 || "";
        for (var t2 = (function() {
          function e3() {
          }
          return "function" != typeof Object.create ? (e3.prototype = null, new e3()) : /* @__PURE__ */ Object.create(null);
        })(), r2 = e2.substring(1).split("&"), n2 = 0; n2 < r2.length; n2++) {
          var i2 = r2[n2].indexOf("=");
          if (-1 !== i2) {
            var a2 = r2[n2].substring(0, i2), o2 = r2[n2].substring(i2 + 1);
            a2 = g(a2), o2 = g(o2), "__proto__" !== a2 && "constructor" !== a2 && "prototype" !== a2 && (t2[a2] = o2);
          }
        }
        return t2;
      }
      function h(e2) {
        return "[object String]" == Object.prototype.toString.call(e2);
      }
      function v(e2) {
        return e2.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, "");
      }
      function y(e2) {
        var t2 = function(e3) {
          this._fields = { Username: 4, Password: 5, Port: 7, Protocol: 2, Host: 6, Path: 8, URL: 0, QueryString: 9, Fragment: 10 }, this._values = {}, this._regex = /^((\w+):\/\/)?((\w+):?(\w+)?@)?([^\/\?:]+):?(\d+)?(\/?[^\?#]+)?\??([^#]+)?#?(\w*)/, void 0 !== e3 && this._parse(e3);
        };
        return t2.prototype.setUrl = function(e3) {
          this._parse(e3);
        }, t2.prototype._initValues = function() {
          for (var e3 in this._fields) this._values[e3] = "";
        }, t2.prototype.addQueryString = function(e3) {
          if ("object" != typeof e3) return false;
          var t3 = this._values.QueryString || "";
          for (var r2 in e3) t3 = new RegExp(r2 + "[^&]+").test(t3) ? t3.replace(new RegExp(r2 + "[^&]+"), r2 + "=" + e3[r2]) : "&" === t3.slice(-1) ? t3 + r2 + "=" + e3[r2] : "" === t3 ? r2 + "=" + e3[r2] : t3 + "&" + r2 + "=" + e3[r2];
          this._values.QueryString = t3;
        }, t2.prototype.getUrl = function() {
          var e3 = "";
          return e3 += this._values.Origin, e3 += this._values.Port ? ":" + this._values.Port : "", e3 += this._values.Path, e3 += this._values.QueryString ? "?" + this._values.QueryString : "", e3 += this._values.Fragment ? "#" + this._values.Fragment : "";
        }, t2.prototype._parse = function(e3) {
          this._initValues();
          var t3 = this._regex.exec(e3);
          t3 || i.log("URLParser::_parse -> Invalid URL");
          var r2 = e3.split("#"), n2 = r2[0], a2 = r2.slice(1).join("#");
          for (var o2 in t3 = this._regex.exec(n2), this._fields) "undefined" != typeof t3[this._fields[o2]] && (this._values[o2] = t3[this._fields[o2]]);
          this._values.Hostname = this._values.Host.replace(/:\d+$/, ""), this._values.Origin = this._values.Protocol + "://" + this._values.Hostname, this._values.Fragment = a2;
        }, new t2(e2);
      }
      function b(e2) {
        var t2, r2 = {};
        if ("function" == typeof window.URL && (function() {
          try {
            return "http://modernizr.com/" === new URL("http://modernizr.com/").href;
          } catch (e3) {
            return false;
          }
        })()) (r2 = new URL(e2)).searchParams || (r2.searchParams = (t2 = _(r2.search), { get: function(e3) {
          return t2[e3];
        } }));
        else {
          h(e2) || (e2 = String(e2)), e2 = v(e2);
          if (false === /^https?:\/\/.+/.test(e2)) return void i.log("Invalid URL");
          var n2 = y(e2);
          r2.hash = n2._values.Fragment, r2.host = n2._values.Host ? n2._values.Host + (n2._values.Port ? ":" + n2._values.Port : "") : "", r2.href = n2._values.URL, r2.password = n2._values.Password, r2.pathname = n2._values.Path, r2.port = n2._values.Port, r2.search = n2._values.QueryString ? "?" + n2._values.QueryString : "", r2.username = n2._values.Username, r2.hostname = n2._values.Hostname, r2.protocol = n2._values.Protocol ? n2._values.Protocol + ":" : "", r2.origin = n2._values.Origin ? n2._values.Origin + (n2._values.Port ? ":" + n2._values.Port : "") : "", r2.searchParams = (function() {
            var e3 = _("?" + n2._values.QueryString);
            return { get: function(t3) {
              return e3[t3];
            } };
          })();
        }
        return r2;
      }
      p.prototype.get = function(e2, t2, r2, i2) {
        if (!e2) throw new Error("key is must");
        t2 = t2 || 1e4, r2 = r2 || 1e3, i2 = i2 || function() {
        };
        var o2 = this.lockGetPrefix + e2, s2 = a.get(o2), l2 = String(u());
        if (s2 && (s2 = c(s2) || { randomNum: 0, expireTime: 0 }).expireTime > n()) return i2(null);
        a.set(o2, JSON.stringify({ randomNum: l2, expireTime: n() + t2 })), setTimeout(function() {
          (s2 = c(a.get(o2)) || { randomNum: 0, expireTime: 0 }) && s2.randomNum === l2 ? (i2(a.get(e2)), a.remove(e2), a.remove(o2)) : i2(null);
        }, r2);
      }, p.prototype.set = function(e2, t2, r2, i2, o2) {
        if (!e2 || !t2) throw new Error("key and val is must");
        r2 = r2 || 1e4, i2 = i2 || 1e3, o2 = o2 || function() {
        };
        var s2 = this.lockSetPrefix + e2, l2 = a.get(s2), p2 = String(u());
        if (l2 && (l2 = c(l2) || { randomNum: 0, expireTime: 0 }).expireTime > n()) return o2({ status: "fail", reason: "This key is locked" });
        a.set(s2, JSON.stringify({ randomNum: p2, expireTime: n() + r2 })), setTimeout(function() {
          (l2 = c(a.get(s2)) || { randomNum: 0, expireTime: 0 }).randomNum === p2 ? a.set(e2, t2) && o2({ status: "success" }) : o2({ status: "fail", reason: "This key is locked" });
        }, i2);
      }, f.prototype.on = function(e2, t2) {
        if (!e2 || !t2) return false;
        if (!d(t2)) throw new Error("listener must be a function");
        this._events[e2] = this._events[e2] || [];
        var r2 = "object" == typeof t2;
        return this._events[e2].push(r2 ? t2 : { listener: t2, once: false }), this;
      }, f.prototype.prepend = function(e2, t2) {
        if (!e2 || !t2) return false;
        if (!d(t2)) throw new Error("listener must be a function");
        this._events[e2] = this._events[e2] || [];
        var r2 = "object" == typeof t2;
        return this._events[e2].unshift(r2 ? t2 : { listener: t2, once: false }), this;
      }, f.prototype.prependOnce = function(e2, t2) {
        return this.prepend(e2, { listener: t2, once: true });
      }, f.prototype.once = function(e2, t2) {
        return this.on(e2, { listener: t2, once: true });
      }, f.prototype.off = function(e2, t2) {
        var r2 = this._events[e2];
        if (!r2) return false;
        if ("number" == typeof t2) r2.splice(t2, 1);
        else if ("function" == typeof t2) for (var n2 = 0, i2 = r2.length; n2 < i2; n2++) r2[n2] && r2[n2].listener === t2 && r2.splice(n2, 1);
        return this;
      }, f.prototype.emit = function(e2, t2) {
        var r2 = this._events[e2];
        if (!r2) return false;
        for (var n2 = 0; n2 < r2.length; n2++) {
          var i2 = r2[n2];
          i2 && (i2.listener.call(this, t2 || {}), i2.once && this.off(e2, n2));
        }
        return this;
      }, f.prototype.removeAllListeners = function(e2) {
        e2 && this._events[e2] ? this._events[e2] = [] : this._events = {};
      }, f.prototype.listeners = function(e2) {
        return e2 && "string" == typeof e2 ? this._events[e2] : this._events;
      };
      var w, S = (w = function() {
        for (var e2 = 1 * /* @__PURE__ */ new Date(), t2 = 0; e2 == 1 * /* @__PURE__ */ new Date(); ) t2++;
        return e2.toString(16) + t2.toString(16);
      }, function() {
        var e2 = String(screen.height * screen.width);
        e2 = e2 && /\d{5,}/.test(e2) ? e2.toString(16) : String(31242 * u()).replace(".", "").slice(0, 8);
        var t2 = w() + "-" + u().toString(16).replace(".", "") + "-" + (function() {
          var e3, t3, r2 = navigator.userAgent, n2 = [], i2 = 0;
          function a2(e4, t4) {
            var r3, i3 = 0;
            for (r3 = 0; r3 < t4.length; r3++) i3 |= n2[r3] << 8 * r3;
            return e4 ^ i3;
          }
          for (e3 = 0; e3 < r2.length; e3++) t3 = r2.charCodeAt(e3), n2.unshift(255 & t3), n2.length >= 4 && (i2 = a2(i2, n2), n2 = []);
          return n2.length > 0 && (i2 = a2(i2, n2)), i2.toString(16);
        })() + "-" + e2 + "-" + w();
        return t2 || (String(u()) + String(u()) + String(u())).slice(2, 15);
      });
      function k(e2) {
        return !(!e2 || 1 !== e2.nodeType);
      }
      function P(e2) {
        return void 0 === e2;
      }
      function C(e2) {
        return Array.isArray && r(C) ? Array.isArray(e2) : "[object Array]" === Object.prototype.toString.call(e2);
      }
      function O(e2) {
        return new j(e2);
      }
      var j = function(e2) {
        this.ele = e2;
      }, N = function(e2, t2) {
        for (var r2 = []; e2; e2 = e2.nextSibling) 1 === e2.nodeType && e2 !== t2 && r2.push(e2);
        return r2;
      };
      function T(e2, t2, r2, n2) {
        function i2(e3) {
          return e3 && (e3.preventDefault = i2.preventDefault, e3.stopPropagation = i2.stopPropagation, e3._getPath = i2._getPath), e3;
        }
        i2._getPath = function() {
          return this.path || this.composedPath && this.composedPath() || O(this.target).getParents();
        }, i2.preventDefault = function() {
          this.returnValue = false;
        }, i2.stopPropagation = function() {
          this.cancelBubble = true;
        };
        (function(e3, t3, r3) {
          if (n2 === void 0 && "click" === t3 && (n2 = true), e3 && e3.addEventListener) e3.addEventListener(t3, function(e4) {
            e4._getPath = i2._getPath, r3.call(this, e4);
          }, n2);
          else {
            var a2 = "on" + t3, o2 = e3[a2];
            e3[a2] = /* @__PURE__ */ (function(e4, t4, r4, n3) {
              return function(a3) {
                if (!(a3 = a3 || i2(window.event))) return void 0;
                a3.target = a3.srcElement;
                var o3, s2, l2 = true;
                return "function" == typeof r4 && (o3 = r4(a3)), s2 = t4.call(e4, a3), "beforeunload" !== n3 ? (false !== o3 && false !== s2 || (l2 = false), l2) : void 0;
              };
            })(e3, r3, o2, t3);
          }
        }).apply(null, arguments);
      }
      function I(e2) {
        var t2 = "pushState" in window.history ? "popstate" : "hashchange";
        T(window, t2, e2);
      }
      function A(e2) {
        if (e2) return "undefined" != typeof window.XMLHttpRequest && "withCredentials" in new XMLHttpRequest() ? new XMLHttpRequest() : "undefined" != typeof XDomainRequest ? new XDomainRequest() : null;
        if ("undefined" != typeof window.XMLHttpRequest) return new XMLHttpRequest();
        if (window.ActiveXObject) try {
          return new ActiveXObject("Msxml2.XMLHTTP");
        } catch (t2) {
          try {
            return new ActiveXObject("Microsoft.XMLHTTP");
          } catch (t3) {
            i.log(t3);
          }
        }
      }
      function D(e2, t2, r2) {
        if ("object" == typeof e2 && "number" == typeof e2.length && e2.length > 0) if (Array.prototype.forEach && e2.forEach) e2.forEach(t2, r2);
        else for (var n2 = 0; n2 < e2.length; n2++) t2.call(r2, e2[n2], n2, e2);
        else if ("[object Object]" === Object.prototype.toString.call(e2)) for (var i2 in e2) Object.prototype.hasOwnProperty.call(e2, i2) && t2.call(r2, e2[i2], i2, e2);
      }
      function $(e2) {
        for (var t2 = 1; t2 < arguments.length; t2++) {
          var r2 = arguments[t2];
          if ("[object Object]" === Object.prototype.toString.call(r2)) for (var n2 in r2) Object.prototype.hasOwnProperty.call(r2, n2) && void 0 !== r2[n2] && (e2[n2] = r2[n2]);
        }
        return e2;
      }
      function x(e2) {
        function t2(e3) {
          if (!e3) return "";
          try {
            return JSON.parse(e3);
          } catch (t3) {
            return {};
          }
        }
        e2.timeout = e2.timeout || 2e4, e2.credentials = "undefined" == typeof e2.credentials || e2.credentials;
        var r2 = A(e2.cors);
        if (!r2) return false;
        e2.type || (e2.type = e2.data ? "POST" : "GET");
        var n2, a2 = (e2 = $({ success: function() {
        }, error: function() {
        } }, e2)).success, o2 = e2.error;
        e2.success = function(e3) {
          a2(e3), n2 && (clearTimeout(n2), n2 = null);
        }, e2.error = function(e3) {
          o2(e3), n2 && (clearTimeout(n2), n2 = null);
        }, n2 = setTimeout(function() {
          !(function() {
            try {
              r2 && "object" == typeof r2 && r2.abort && r2.abort();
            } catch (t3) {
              i.log(t3);
            }
            n2 && (clearTimeout(n2), n2 = null, e2.error && e2.error(), r2.onreadystatechange = null, r2.onload = null, r2.onerror = null);
          })();
        }, e2.timeout), "undefined" != typeof XDomainRequest && r2 instanceof XDomainRequest && (r2.onload = function() {
          e2.success && e2.success(t2(r2.responseText)), r2.onreadystatechange = null, r2.onload = null, r2.onerror = null;
        }, r2.onerror = function() {
          e2.error && e2.error(t2(r2.responseText), r2.status), r2.onreadystatechange = null, r2.onerror = null, r2.onload = null;
        }), r2.onreadystatechange = function() {
          try {
            4 == r2.readyState && (r2.status >= 200 && r2.status < 300 || 304 == r2.status ? e2.success(t2(r2.responseText)) : e2.error(t2(r2.responseText), r2.status), r2.onreadystatechange = null, r2.onload = null);
          } catch (n3) {
            r2.onreadystatechange = null, r2.onload = null;
          }
        }, r2.open(e2.type, e2.url, true);
        try {
          e2.credentials && (r2.withCredentials = true), s(e2.header) && D(e2.header, function(e3, t3) {
            r2.setRequestHeader && r2.setRequestHeader(t3, e3);
          }), e2.data && (e2.cors || r2.setRequestHeader && r2.setRequestHeader("X-Requested-With", "XMLHttpRequest"), "application/json" === e2.contentType ? r2.setRequestHeader && r2.setRequestHeader("Content-type", "application/json; charset=UTF-8") : r2.setRequestHeader && r2.setRequestHeader("Content-type", "application/x-www-form-urlencoded"));
        } catch (l2) {
          i.log(l2);
        }
        r2.send(e2.data || null);
      }
      function E(e2, t2) {
        var r2 = [];
        return null == e2 ? r2 : Array.prototype.map && e2.map === Array.prototype.map ? e2.map(t2) : (D(e2, function(e3, n2, i2) {
          r2.push(t2(e3, n2, i2));
        }), r2);
      }
      function L(e2) {
        var t2 = [];
        try {
          t2 = E(atob(e2).split(""), function(e3) {
            return "%" + ("00" + e3.charCodeAt(0).toString(16)).slice(-2);
          });
        } catch (r2) {
          t2 = [];
        }
        try {
          return decodeURIComponent(t2.join(""));
        } catch (r2) {
          return t2.join("");
        }
      }
      function U(e2) {
        var t2 = "";
        try {
          t2 = btoa(encodeURIComponent(e2).replace(/%([0-9A-F]{2})/g, function(e3, t3) {
            return String.fromCharCode("0x" + t3);
          }));
        } catch (r2) {
          t2 = e2;
        }
        return t2;
      }
      j.prototype = { addClass: function(e2) {
        return -1 === (" " + this.ele.className + " ").indexOf(" " + e2 + " ") && (this.ele.className = this.ele.className + ("" === this.ele.className ? "" : " ") + e2), this;
      }, removeClass: function(e2) {
        var t2 = " " + this.ele.className + " ";
        return -1 !== t2.indexOf(" " + e2 + " ") && (this.ele.className = t2.replace(" " + e2 + " ", " ").slice(1, -1)), this;
      }, hasClass: function(e2) {
        return -1 !== (" " + this.ele.className + " ").indexOf(" " + e2 + " ");
      }, attr: function(e2, t2) {
        return "string" == typeof e2 && P(t2) ? this.ele.getAttribute(e2) : ("string" == typeof e2 && (t2 = String(t2), this.ele.setAttribute(e2, t2)), this);
      }, offset: function() {
        var e2 = this.ele.getBoundingClientRect();
        if (e2.width || e2.height) {
          var t2 = this.ele.ownerDocument.documentElement;
          return { top: e2.top + window.pageYOffset - t2.clientTop, left: e2.left + window.pageXOffset - t2.clientLeft };
        }
        return { top: 0, left: 0 };
      }, getSize: function() {
        if (!window.getComputedStyle) return { width: this.ele.offsetWidth, height: this.ele.offsetHeight };
        try {
          var e2 = this.ele.getBoundingClientRect();
          return { width: e2.width, height: e2.height };
        } catch (t2) {
          return { width: 0, height: 0 };
        }
      }, getStyle: function(e2) {
        return this.ele.currentStyle ? this.ele.currentStyle[e2] : this.ele.ownerDocument.defaultView.getComputedStyle(this.ele, null).getPropertyValue(e2);
      }, wrap: function(e2) {
        var t2 = document.createElement(e2);
        return this.ele.parentNode.insertBefore(t2, this.ele), t2.appendChild(this.ele), O(t2);
      }, getCssStyle: function(e2) {
        var t2 = this.ele.style.getPropertyValue(e2);
        if (t2) return t2;
        var r2 = null;
        if ("function" == typeof window.getMatchedCSSRules && (r2 = window.getMatchedCSSRules(this.ele)), !r2 || !C(r2)) return null;
        for (var n2 = r2.length - 1; n2 >= 0; n2--) {
          if (t2 = r2[n2].style.getPropertyValue(e2)) return t2;
        }
      }, sibling: function(e2, t2) {
        for (; (e2 = e2[t2]) && 1 !== e2.nodeType; ) ;
        return e2;
      }, next: function() {
        return this.sibling(this.ele, "nextSibling");
      }, prev: function() {
        return this.sibling(this.ele, "previousSibling");
      }, siblings: function() {
        return N((this.ele.parentNode || {}).firstChild, this.ele);
      }, children: function() {
        return N(this.ele.firstChild);
      }, parent: function() {
        var e2 = this.ele.parentNode;
        return O(e2 = e2 && 11 !== e2.nodeType ? e2 : null);
      }, previousElementSibling: function() {
        var e2 = this.ele;
        if ("previousElementSibling" in document.documentElement) return O(e2.previousElementSibling);
        for (; e2 = e2.previousSibling; ) if (1 === e2.nodeType) return O(e2);
        return O(null);
      }, getSameTypeSiblings: function() {
        for (var e2 = this.ele, t2 = e2.parentNode, r2 = e2.tagName.toLowerCase(), n2 = [], i2 = 0; i2 < t2.children.length; i2++) {
          var a2 = t2.children[i2];
          1 === a2.nodeType && a2.tagName.toLowerCase() === r2 && n2.push(t2.children[i2]);
        }
        return n2;
      }, getParents: function() {
        try {
          var e2 = this.ele;
          if (!k(e2)) return [];
          var t2 = [e2];
          if (null === e2 || null === e2.parentElement) return [];
          for (; null !== e2.parentElement; ) e2 = e2.parentElement, t2.push(e2);
          return t2;
        } catch (r2) {
          return [];
        }
      } };
      var R = { get: function(e2) {
        for (var t2 = e2 + "=", r2 = document.cookie.split(";"), n2 = 0; n2 < r2.length; n2++) {
          for (var i2 = r2[n2]; " " == i2.charAt(0); ) i2 = i2.substring(1, i2.length);
          if (0 == i2.indexOf(t2)) return g(i2.substring(t2.length, i2.length));
        }
        return null;
      }, set: function(e2, t2, r2, n2, i2, a2) {
        var o2 = a2, s2 = "", l2 = "", u2 = "";
        if (0 !== (r2 = null == r2 ? 73e3 : r2)) {
          var c2 = /* @__PURE__ */ new Date();
          "s" === String(r2).slice(-1) ? c2.setTime(c2.getTime() + 1e3 * Number(String(r2).slice(0, -1))) : c2.setTime(c2.getTime() + 24 * r2 * 60 * 60 * 1e3), s2 = "; expires=" + c2.toGMTString();
        }
        function p2(e3) {
          return !!e3 && e3.replace(/\r\n/g, "");
        }
        n2 && "" !== n2 && (u2 = "; SameSite=" + n2), i2 && (l2 = "; secure");
        var d2 = "", f2 = "", g2 = "";
        e2 && (d2 = p2(e2)), t2 && (f2 = p2(t2)), o2 && (g2 = p2(o2)), d2 && f2 && (document.cookie = d2 + "=" + encodeURIComponent(f2) + s2 + "; path=/" + g2 + u2 + l2);
      }, remove: function(e2, t2) {
        this.set(e2, "1", -1, t2);
      }, isSupport: function(e2, t2, r2, n2, i2) {
        e2 = e2 || "cookie_support_test", t2 = t2 || "1";
        var a2 = this;
        return navigator.cookieEnabled && (a2.set(e2, t2, r2, n2, i2), a2.get(e2) === t2 && (a2.remove(e2), true));
      } };
      function B(e2) {
        return D(Array.prototype.slice.call(arguments, 1), function(t2) {
          for (var r2 in t2) void 0 !== t2[r2] && void 0 === e2[r2] && (e2[r2] = t2[r2]);
        }), e2;
      }
      function H(e2) {
        var t2 = e2;
        try {
          t2 = decodeURI(e2);
        } catch (r2) {
          t2 = e2;
        }
        return t2;
      }
      function J(e2) {
        return "[object Date]" == Object.prototype.toString.call(e2);
      }
      function M(e2) {
        function t2(e3) {
          return e3 < 10 ? "0" + e3 : e3;
        }
        return e2.getFullYear() + "-" + t2(e2.getMonth() + 1) + "-" + t2(e2.getDate()) + " " + t2(e2.getHours()) + ":" + t2(e2.getMinutes()) + ":" + t2(e2.getSeconds()) + "." + t2(e2.getMilliseconds());
      }
      function q(e2) {
        return D(Array.prototype.slice.call(arguments, 1), function(t2) {
          for (var r2 in t2) void 0 !== t2[r2] && (s(t2[r2]) && s(e2[r2]) ? $(e2[r2], t2[r2]) : e2[r2] = t2[r2]);
        }), e2;
      }
      function F(e2, t2, r2) {
        var n2 = Object.prototype.hasOwnProperty;
        if (e2.filter) return e2.filter(t2);
        for (var i2 = [], a2 = 0; a2 < e2.length; a2++) if (n2.call(e2, a2)) {
          var o2 = e2[a2];
          t2.call(r2, o2, a2, e2) && i2.push(o2);
        }
        return i2;
      }
      function K(e2, t2, r2) {
        t2 = t2 || "domain_test";
        var n2 = (function(e3) {
          return "string" == typeof e3 && e3.match(/^[a-zA-Z0-9\u4e00-\u9fa5\-\.]+$/) ? e3 : "";
        })(e2 = e2 || location.hostname), i2 = n2.split(".");
        if (C(i2) && i2.length >= 2 && !/^(\d+\.)+\d+$/.test(n2)) {
          for (var a2 = "." + i2.splice(i2.length - 1, 1); i2.length > 0; ) if (a2 = "." + i2.splice(i2.length - 1, 1) + a2, R.set(t2, "true", 0, null, r2, "; domain=" + a2), -1 !== document.cookie.indexOf(t2 + "=true")) return R.set(t2, "true", "-1s", null, r2, "; domain=" + a2), a2;
        }
        return "";
      }
      function V(e2) {
        if (!h(e2)) return null;
        var t2, r2 = e2.split(">");
        return (t2 = (function n2(e3) {
          var t3, a2 = r2.shift();
          if (!a2) return e3;
          try {
            t3 = (function(e4, t4) {
              var r3;
              if ("body" === (e4 = v(e4))) return document.getElementsByTagName("body")[0];
              if (0 === e4.indexOf("#")) e4 = e4.slice(1), r3 = document.getElementById(e4);
              else if (e4.indexOf(":nth-of-type") > -1) {
                var n3 = e4.split(":nth-of-type");
                if (!n3[0] || !n3[1]) return null;
                var i2 = n3[0], a3 = n3[1].match(/\(([0-9]+)\)/);
                if (!a3 || !a3[1]) return null;
                var o2 = Number(a3[1]);
                if (!(k(t4) && t4.children && t4.children.length > 0)) return null;
                for (var s2 = t4.children, l2 = 0; l2 < s2.length; l2++) if (k(s2[l2]) && s2[l2].tagName.toLowerCase() === i2 && 0 == --o2) {
                  r3 = s2[l2];
                  break;
                }
                if (o2 > 0) return null;
              }
              return r3 || null;
            })(a2, e3);
          } catch (o2) {
            i.log(o2);
          }
          return t3 && k(t3) ? n2(t3) : null;
        })()) && k(t2) ? t2 : null;
      }
      function z(e2, t2) {
        var r2 = "", n2 = "";
        return e2.textContent ? r2 = v(e2.textContent) : e2.innerText && (r2 = v(e2.innerText)), r2 && (r2 = r2.replace(/[\r\n]/g, " ").replace(/[ ]+/g, " ").substring(0, 255)), n2 = r2 || "", "input" !== t2 && "INPUT" !== t2 || (n2 = e2.value || ""), n2;
      }
      function W(e2, t2) {
        t2 && "string" == typeof t2 || (t2 = "hostname解析异常");
        var r2 = null;
        try {
          r2 = b(e2).hostname;
        } catch (n2) {
          i.log("getHostname传入的url参数不合法！");
        }
        return r2 || t2;
      }
      function X() {
        try {
          var e2 = navigator.appVersion.match(/OS (\d+)[._](\d+)[._]?(\d+)?/);
          return e2 && e2[1] ? Number.parseInt(e2[1], 10) : "";
        } catch (t2) {
          return "";
        }
      }
      function Z(e2, t2) {
        t2 = t2.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]"), e2 = g(e2);
        var r2 = new RegExp("[\\?&]" + t2 + "=([^&#]*)").exec(e2);
        return null === r2 || r2 && "string" != typeof r2[1] && r2[1].length ? "" : g(r2[1]);
      }
      function Y(e2) {
        var t2 = {}, r2 = e2.split("?")[1] || "";
        return r2 && (t2 = _("?" + r2)), t2;
      }
      function G() {
        return "undefined" != typeof window.matchMedia || "undefined" != typeof window.msMatchMedia;
      }
      function Q() {
        var e2, t2 = {}, r2 = navigator.userAgent.toLowerCase();
        return (e2 = r2.match(/ qq\/([\d.]+)/)) ? t2.qqBuildinBrowser = Number(e2[1].split(".")[0]) : (e2 = r2.match(/mqqbrowser\/([\d.]+)/)) ? t2.qqBrowser = Number(e2[1].split(".")[0]) : (e2 = r2.match(/opera.([\d.]+)/)) ? t2.opera = Number(e2[1].split(".")[0]) : (e2 = r2.match(/msie ([\d.]+)/)) ? t2.ie = Number(e2[1].split(".")[0]) : (e2 = r2.match(/edge.([\d.]+)/)) ? t2.edge = Number(e2[1].split(".")[0]) : (e2 = r2.match(/firefox\/([\d.]+)/)) ? t2.firefox = Number(e2[1].split(".")[0]) : (e2 = r2.match(/chrome\/([\d.]+)/)) ? t2.chrome = Number(e2[1].split(".")[0]) : (e2 = r2.match(/version\/([\d.]+).*safari/)) ? t2.safari = Number(e2[1].match(/^\d*.\d*/)) : (e2 = r2.match(/trident\/([\d.]+)/)) && (t2.ie = 11), t2;
      }
      function ee(e2) {
        return h(e2) ? H(e2 = v(e2)) : H(location.href);
      }
      function te(e2) {
        return h(e2) ? H(e2 = v(e2)) : H(location.pathname);
      }
      function re(e2, t2) {
        return e2.hasAttribute ? e2.hasAttribute(t2) : e2.attributes ? !(!e2.attributes[t2] || !e2.attributes[t2].specified) : void 0;
      }
      function ne(e2, t2) {
        if ("string" == typeof t2) return re(e2, t2);
        if (C(t2)) {
          for (var r2 = false, n2 = 0; n2 < t2.length; n2++) {
            if (re(e2, t2[n2])) {
              r2 = true;
              break;
            }
          }
          return r2;
        }
      }
      function ie(e2) {
        if ("string" != typeof e2) return 0;
        var t2 = 0;
        if (0 == e2.length) return t2;
        for (var r2 = 0; r2 < e2.length; r2++) t2 = (t2 << 5) - t2 + e2.charCodeAt(r2), t2 &= t2;
        return t2;
      }
      function ae(e2) {
        var t2 = 9007199254740992, r2 = -9007199254740992, n2 = 0;
        if (e2.length > 0) for (var i2 = e2.split(""), a2 = 0; a2 < i2.length; a2++) {
          var o2 = i2[a2].charCodeAt(), s2 = 31 * n2 + o2;
          if (s2 > t2) for (n2 = r2 + n2; (s2 = 31 * n2 + o2) < r2; ) n2 = n2 / 2 + o2;
          if (s2 < r2) for (n2 = t2 + n2; (s2 = 31 * n2 + o2) > t2; ) n2 = n2 / 2 + o2;
          n2 = 31 * n2 + o2;
        }
        return n2;
      }
      function oe(e2, t2) {
        var r2 = e2.indexOf;
        if (r2) return r2.call(e2, t2);
        for (var n2 = 0; n2 < e2.length; n2++) if (t2 === e2[n2]) return n2;
        return -1;
      }
      var se = Object.prototype.hasOwnProperty;
      function le(e2) {
        return !(!e2 || !se.call(e2, "callee"));
      }
      function ue(e2) {
        return "[object Boolean]" == Object.prototype.toString.call(e2);
      }
      function ce(e2) {
        if (s(e2)) {
          for (var t2 in e2) if (Object.prototype.hasOwnProperty.call(e2, t2)) return false;
          return true;
        }
        return false;
      }
      function pe(e2) {
        if ("string" != typeof e2) return false;
        return false !== /^https?:\/\/.+/.test(e2) || (i.log("Invalid URL"), false);
      }
      function de() {
        return !!navigator.userAgent.match(/iPhone|iPad|iPod/i);
      }
      function fe(e2) {
        try {
          JSON.parse(e2);
        } catch (t2) {
          return false;
        }
        return true;
      }
      function ge(e2) {
        return "[object Number]" == Object.prototype.toString.call(e2) && /[\d\.]+/.test(String(e2));
      }
      function _e(e2) {
        if (!s(e2) || !h(e2.callbackName)) return i.log("JSONP 请求缺少 callbackName"), false;
        e2.success = r(e2.success) ? e2.success : function() {
        }, e2.error = r(e2.error) ? e2.error : function() {
        }, e2.data = e2.data || "";
        var t2 = document.createElement("script"), n2 = document.getElementsByTagName("head")[0], a2 = null, o2 = false;
        n2.appendChild(t2);
        ge(e2.timeout) && (a2 = setTimeout(function() {
          if (o2) return false;
          e2.error("timeout"), window[e2.callbackName] = function() {
            i.log("call jsonp error");
          }, a2 = null, n2.removeChild(t2), o2 = true;
        }, Math.min(e2.timeout, 3e4))), window[e2.callbackName] = function() {
          clearTimeout(a2), a2 = null, e2.success.apply(null, arguments), window[e2.callbackName] = function() {
            i.log("call jsonp error");
          }, n2.removeChild(t2);
        };
        var l2 = encodeURIComponent(e2.callbackName), u2 = "";
        if (e2.url.indexOf("?") > -1 ? e2.url += "&callbackName=" + l2 : e2.url += "?callbackName=" + l2, s(e2.data)) {
          var c2 = [];
          D(e2.data, function(e3, t3) {
            c2.push(encodeURIComponent(t3) + "=" + encodeURIComponent(e3));
          }), (u2 = c2.join("&")) && (e2.url += "&" + u2);
        }
        t2.onerror = function(r2) {
          if (o2) return false;
          window[e2.callbackName] = function() {
            i.log("call jsonp error");
          }, clearTimeout(a2), a2 = null, n2.removeChild(t2), e2.error(r2), o2 = true;
        }, t2.src = e2.url;
      }
      function he(e2) {
        ({ visibleHandler: r(e2.visible) ? e2.visible : function() {
        }, hiddenHandler: r(e2.hidden) ? e2.hidden : function() {
        }, visibilityChange: null, hidden: null, isSupport: function() {
          return "undefined" != typeof document[this.hidden];
        }, init: function() {
          "undefined" != typeof document.hidden ? (this.hidden = "hidden", this.visibilityChange = "visibilitychange") : "undefined" != typeof document.mozHidden ? (this.hidden = "mozHidden", this.visibilityChange = "mozvisibilitychange") : "undefined" != typeof document.msHidden ? (this.hidden = "msHidden", this.visibilityChange = "msvisibilitychange") : "undefined" != typeof document.webkitHidden && (this.hidden = "webkitHidden", this.visibilityChange = "webkitvisibilitychange"), this.listen();
        }, listen: function() {
          if (this.isSupport()) {
            var e3 = this;
            T(document, this.visibilityChange, function() {
              document[e3.hidden] ? e3.hiddenHandler() : e3.visibleHandler();
            }, 1);
          } else T(window, "focus", this.visibleHandler), T(window, "blur", this.hiddenHandler);
        } }).init();
      }
      function me(e2) {
        e2 = $({ success: function() {
        }, error: function() {
        }, appendCall: function(e3) {
          document.getElementsByTagName("head")[0].appendChild(e3);
        } }, e2);
        var t2 = null;
        "css" === e2.type && ((t2 = document.createElement("link")).rel = "stylesheet", t2.href = e2.url), "js" === e2.type && ((t2 = document.createElement("script")).async = "async", t2.setAttribute("charset", "UTF-8"), t2.src = e2.url, t2.type = "text/javascript"), t2.onload = t2.onreadystatechange = function() {
          this.readyState && "loaded" !== this.readyState && "complete" !== this.readyState || (e2.success(), t2.onload = t2.onreadystatechange = null);
        }, t2.onerror = function() {
          e2.error(), t2.onerror = null;
        }, e2.appendCall(t2);
      }
      function ve(e2, t2) {
        t2 = "number" == typeof t2 ? t2 : 13;
        for (var r2 = (e2 = String(e2)).split(""), n2 = 0; n2 < r2.length; n2++) {
          r2[n2].charCodeAt(0) < 126 && (r2[n2] = String.fromCharCode((r2[n2].charCodeAt(0) + t2) % 126));
        }
        return r2.join("");
      }
      function ye(e2) {
        return ve(e2 = String(e2), 113);
      }
      function be(e2) {
        s(e2) && D(e2, function(t2, r2) {
          s(t2) ? be(e2[r2]) : J(t2) && (e2[r2] = M(t2));
        });
      }
      var we = { isSupport: function() {
        var e2 = true, t2 = "testIsSupportStorage";
        try {
          sessionStorage && sessionStorage.setItem ? (sessionStorage.setItem("__session_storage_support__", t2), sessionStorage.removeItem("__session_storage_support__", t2), e2 = true) : e2 = false;
        } catch (r2) {
          e2 = false;
        }
        return e2;
      } };
      function Se(e2) {
        var t2 = document.createElement("style");
        t2.type = "text/css";
        try {
          t2.appendChild(document.createTextNode(e2));
        } catch (i2) {
          t2.styleSheet.cssText = e2;
        }
        var r2 = document.getElementsByTagName("head")[0], n2 = document.getElementsByTagName("script")[0];
        r2 ? r2.children.length ? r2.insertBefore(t2, r2.children[0]) : r2.appendChild(t2) : n2.parentNode.insertBefore(t2, n2);
      }
      function ke(e2) {
        var t2 = [];
        return null == e2 ? t2 : (D(e2, function(e3) {
          t2[t2.length] = e3;
        }), t2);
      }
      function Pe(e2) {
        for (var t2, r2 = [], n2 = {}, i2 = 0; i2 < e2.length; i2++) (t2 = e2[i2]) in n2 || (n2[t2] = true, r2.push(t2));
        return r2;
      }
      var Ce = { "+": "-", "/": "_", "=": "." }, Oe = { "-": "+", _: "/", ".": "=" };
      function je(e2, t2, r2) {
        return r2 = r2 || 0, e2.substr(r2, t2.length) === t2;
      }
      function Ne(e2) {
        return "__proto__" !== e2 && "constructor" !== e2 && "prototype" !== e2;
      }
      var Te = { __proto__: null, noPrototypePollution: Ne, ConcurrentStorage: p, EventEmitter: f, URL: b, UUID: S, addEvent: T, addHashEvent: I, ajax: x, base64Decode: L, base64Encode: U, bindReady: function(e2, t2) {
        t2 = t2 || window;
        var r2 = false, n2 = true, a2 = t2.document, o2 = a2.documentElement, s2 = a2.addEventListener, l2 = s2 ? "addEventListener" : "attachEvent", u2 = s2 ? "removeEventListener" : "detachEvent", c2 = s2 ? "" : "on", p2 = function(n3) {
          "readystatechange" == n3.type && "complete" != a2.readyState || (("load" == n3.type ? t2 : a2)[u2](c2 + n3.type, p2, false), !r2 && (r2 = true) && e2.call(t2, n3.type || n3));
        }, d2 = function() {
          try {
            o2.doScroll("left");
          } catch (e3) {
            return void setTimeout(d2, 50);
          }
          p2("poll");
        };
        if ("complete" == a2.readyState) e2.call(t2, "lazy");
        else {
          if (!s2 && o2.doScroll) {
            try {
              n2 = !t2.frameElement;
            } catch (f2) {
              i.log(f2);
            }
            n2 && d2();
          }
          a2[l2](c2 + "DOMContentLoaded", p2, false), a2[l2](c2 + "readystatechange", p2, false), t2[l2](c2 + "load", p2, false);
        }
      }, cookie: R, coverExtend: B, decodeURI: H, decodeURIComponent: g, dfmapping: function(e2) {
        var t2 = "t6KJCZa5pDdQ9khoEM3Tj70fbP2eLSyc4BrsYugARqFIw1mzlGNVXOHiWvxUn8", r2 = t2.length - 1, n2 = {}, i2 = 0;
        for (i2 = 0; i2 < t2.length; i2++) n2[t2.charAt(i2)] = t2.charAt(r2 - i2);
        var a2 = "";
        for (i2 = 0; i2 < e2.length; i2++) e2.charAt(i2) in n2 ? a2 += n2[e2.charAt(i2)] : a2 += e2.charAt(i2);
        return a2;
      }, each: D, encodeDates: function La(e2) {
        return D(e2, function(t2, r2) {
          J(t2) ? e2[r2] = M(t2) : s(t2) && (e2[r2] = La(t2));
        }), e2;
      }, extend: $, extend2Lev: q, filter: F, formatDate: M, formatJsonString: function(e2) {
        try {
          return JSON.stringify(e2, null, "  ");
        } catch (t2) {
          return JSON.stringify(e2);
        }
      }, getCookieTopLevelDomain: K, getDomBySelector: V, getElementContent: z, getHostname: W, getIOSVersion: X, getQueryParam: Z, getQueryParamsFromUrl: Y, getRandom: u, getRandomBasic: l, getScreenOrientation: function() {
        var e2 = screen.msOrientation || screen.mozOrientation || (screen.orientation || {}).type, t2 = "未取到值";
        if (e2) t2 = e2.indexOf("landscape") > -1 ? "landscape" : "portrait";
        else if (G()) {
          var r2 = window.matchMedia || window.msMatchMedia;
          r2("(orientation: landscape)").matches ? t2 = "landscape" : r2("(orientation: portrait)").matches && (t2 = "portrait");
        }
        return t2;
      }, getUA: Q, getURL: ee, getURLPath: te, getURLSearchParams: _, hasAttribute: re, hasAttributes: ne, hashCode: ie, hashCode53: ae, indexOf: oe, inherit: function(e2, t2) {
        return e2.prototype = new t2(), e2.prototype.constructor = e2, e2.superclass = t2.prototype, e2;
      }, isArguments: le, isArray: C, isBoolean: ue, isDate: J, isElement: k, isEmptyObject: ce, isFunction: r, isHttpUrl: pe, isIOS: de, isJSONString: fe, isNumber: ge, isObject: s, isString: h, isSupportBeaconSend: function() {
        var e2 = false;
        if ("object" != typeof navigator || "function" != typeof navigator.sendBeacon) return e2;
        var t2 = Q(), r2 = navigator.userAgent.toLowerCase();
        if (/Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent)) {
          var n2 = (r2.match(/os [\d._]*/gi) + "").replace(/[^0-9|_.]/gi, "").replace(/_/gi, ".").split(".");
          "undefined" == typeof t2.safari && (t2.safari = n2[0]), n2[0] && (t2.qqBuildinBrowser || t2.qqBrowser) ? e2 = false : n2[0] && n2[0] < 13 ? (t2.chrome > 41 || t2.firefox > 30 || t2.opera > 25 || t2.safari > 12) && (e2 = true) : (t2.chrome > 41 || t2.firefox > 30 || t2.opera > 25 || t2.safari > 11.3) && (e2 = true);
        } else (t2.chrome > 38 || t2.edge > 13 || t2.firefox > 30 || t2.opera > 25 || t2.safari > 11) && (e2 = true);
        return e2;
      }, isSupportCors: function() {
        return "undefined" != typeof window.XMLHttpRequest && ("withCredentials" in new XMLHttpRequest() || "undefined" != typeof XDomainRequest);
      }, isUndefined: P, jsonp: _e, listenPageState: he, loadScript: me, localStorage: a, logger: i, map: E, mediaQueriesSupported: G, now: n, removeScriptProtocol: function(e2) {
        if ("string" != typeof e2) return "";
        for (var t2 = /^\s*javascript/i; t2.test(e2); ) e2 = e2.replace(t2, "");
        return e2;
      }, rot13defs: ye, rot13obfs: ve, ry: O, safeJSONParse: c, searchObjDate: be, sessionStorage: we, setCssStyle: Se, strToUnicode: function(e2) {
        if ("string" != typeof e2) return i.log("转换unicode错误", e2), e2;
        for (var t2 = "", r2 = 0; r2 < e2.length; r2++) t2 += "\\" + e2.charCodeAt(r2).toString(16);
        return t2;
      }, throttle: function(e2, t2, r2) {
        var i2, a2, o2, s2 = null, l2 = 0;
        r2 || (r2 = {});
        var u2 = function() {
          l2 = false === r2.leading ? 0 : n(), s2 = null, o2 = e2.apply(i2, a2), s2 || (i2 = a2 = null);
        };
        return function() {
          var c2 = n();
          l2 || false !== r2.leading || (l2 = c2);
          var p2 = t2 - (c2 - l2);
          return i2 = this, a2 = arguments, p2 <= 0 || p2 > t2 ? (s2 && (clearTimeout(s2), s2 = null), l2 = c2, o2 = e2.apply(i2, a2), s2 || (i2 = a2 = null)) : s2 || false === r2.trailing || (s2 = setTimeout(u2, p2)), o2;
        };
      }, toArray: function(e2) {
        return e2 ? e2.toArray ? e2.toArray() : C(e2) || le(e2) ? Array.prototype.slice.call(e2) : ke(e2) : [];
      }, trim: v, unique: Pe, urlParse: y, urlSafeBase64: { encode: function(e2) {
        return e2.replace(/[+\/=]/g, function(e3) {
          return Ce[e3];
        });
      }, decode: function(e2) {
        return e2.replace(/[-_.]/g, function(e3) {
          return Oe[e3];
        });
      }, trim: function(e2) {
        return e2.replace(/[.=]{1,2}$/, "");
      }, isBase64: function(e2) {
        return /^[A-Za-z0-9+\/]*[=]{0,2}$/.test(e2);
      }, isUrlSafeBase64: function(e2) {
        return /^[A-Za-z0-9_-]*[.]{0,2}$/.test(e2);
      } }, values: ke, xhr: A, startsWith: je }, Ie = [], Ae = { appendWriter: function(e2) {
        Ie.push(e2);
      }, msg: function() {
        var e2 = { module: "", level: "log", brand: "web-sdk", content: null };
        return e2.content = Array.prototype.slice.call(arguments), { module: function(t2) {
          return h(t2) && (e2.module = t2), this;
        }, level: function(t2) {
          return h(t2) && (e2.level = t2), this;
        }, brand: function(t2) {
          return h(t2) && (e2.brand = t2), this;
        }, log: function() {
          if (e2.content && e2.content.length) {
            for (var t2 = 0; t2 < Ie.length; t2++) if ("function" == typeof Ie[t2]) try {
              Ie[t2].call(null, e2);
            } catch (r2) {
            }
          }
          return this;
        } };
      } };
      function De() {
        Ae.msg.apply(Ae, arguments).log();
      }
      function $e() {
        Ae.msg.apply(Ae, arguments).level("warn").log();
      }
      function xe() {
        Ae.msg.apply(Ae, arguments).level("error").log();
      }
      var Ee = {}, Le = { preset_properties: { search_keyword_baidu: false, latest_utm: true, latest_traffic_source_type: true, latest_search_keyword: true, latest_referrer: true, latest_referrer_host: false, latest_landing_page: false, latest_wx_ad_click_id: void 0, url: true, title: true }, encrypt_cookie: false, enc_cookie: false, img_use_crossorigin: false, name: "sa", max_referrer_string_length: 200, max_string_length: 1024, max_id_length: 255, max_key_length: 100, cross_subdomain: true, show_log: false, is_debug: false, source_channel: [], sdk_id: "", auto_init: true, is_track_single_page: false, is_single_page: false, batch_send: false, custom_server_url: "", source_type: {}, callback_timeout: 200, datasend_timeout: 8e3, is_track_device_id: false, ignore_oom: true, app_js_bridge: false, white_list: {} };
      Le.white_list[location.host] = b(location.href).hostname;
      var Ue = "utm_source utm_medium utm_campaign utm_content utm_term", Re = "1.27.11", Be = "sensorsdata_domain_test", He = { LOGIN: "$identity_login_id" };
      function Je(e2) {
        var t2 = Ee.current_domain;
        switch (typeof t2) {
          case "function":
            var r2 = t2();
            return "" === r2 || "" === v(r2) ? "url解析失败" : -1 !== r2.indexOf(".") ? r2 : "url解析失败";
          case "string":
            return "" === t2 || "" === v(t2) ? "url解析失败" : -1 !== t2.indexOf(".") ? t2 : "url解析失败";
          default:
            var n2 = K(null, Be, Ee.is_secure_cookie);
            return "" === e2 ? "url解析失败" : "" === n2 ? "url解析失败" : n2;
        }
      }
      var Me = { get: function(e2) {
        return R.get(e2);
      }, set: function(e2, t2, r2, n2) {
        var i2 = "";
        if (n2 = P(n2) ? Ee.cross_subdomain : n2) {
          var a2 = Je(location.href);
          "url解析失败" === a2 && (a2 = ""), i2 = a2 ? "; domain=" + a2 : "";
        }
        return R.set(e2, t2, r2, Ee.set_cookie_samesite, Ee.is_secure_cookie, i2);
      }, remove: function(e2, t2) {
        return t2 = P(t2) ? Ee.cross_subdomain : t2, R.remove(e2, t2);
      }, isSupport: function(e2, t2) {
        return e2 = e2 || "sajssdk_2015_cookie_access_test", t2 = t2 || "1", R.isSupport(e2, t2, 0, null, Ee.is_secure_cookie);
      } };
      function qe(e2, r2) {
        var n2 = "";
        if (false === Ee.cross_subdomain) {
          try {
            if (r2) ;
            else {
              var i2 = location.host;
              P(t.para.white_list[i2]) || (n2 = t.para.white_list[i2]);
            }
          } catch (a2) {
            xe(a2);
          }
          n2 = "string" == typeof n2 && "" !== n2 ? "sajssdk_2015_" + Ee.sdk_id + e2 + "_" + n2.replace(/\./g, "_") : "sajssdk_2015_root_" + Ee.sdk_id + e2;
        } else n2 = "sajssdk_2015_cross_" + Ee.sdk_id + e2;
        return n2;
      }
      function Fe() {
        return Me.isSupport() ? null !== Me.get("sensorsdata_is_new_user") || null !== Me.get(qe("new_user")) : null !== Ke.get(Ke.getNewUserFlagMemoryKey("new_user"));
      }
      Me.getNewUser = Fe;
      var Ke = { data: {}, get: function(e2) {
        var t2 = this.data[e2];
        return t2 === void 0 ? null : t2._expirationTimestamp_ !== void 0 ? (/* @__PURE__ */ new Date()).getTime() > t2._expirationTimestamp_ ? null : t2.value : t2;
      }, set: function(e2, t2, r2) {
        if (r2) {
          var n2 = /* @__PURE__ */ new Date();
          t2 = { value: t2, _expirationTimestamp_: "s" === String(r2).slice(-1) ? n2.getTime() + 1e3 * Number(String(r2).slice(0, -1)) : n2.getTime() + 24 * r2 * 60 * 60 * 1e3 };
        }
        this.data[e2] = t2;
      }, getNewUserFlagMemoryKey: function(e2) {
        return "sajssdk_2015_" + Ee.sdk_id + e2;
      } }, Ve = { checkIsAddSign: function(e2) {
        "track" === e2.type && (Fe() ? e2.properties.$is_first_day = true : e2.properties.$is_first_day = false);
      }, is_first_visit_time: false, is_page_first_visited: false, checkIsFirstTime: function(e2) {
        "track" === e2.type && "$pageview" === e2.event && (this.is_first_visit_time ? (e2.properties.$is_first_time = true, this.is_first_visit_time = false) : e2.properties.$is_first_time = false);
      }, setDeviceId: function() {
      }, storeInitCheck: function() {
        if (t.is_first_visitor) {
          var e2 = /* @__PURE__ */ new Date(), r2 = { h: 23 - e2.getHours(), m: 59 - e2.getMinutes(), s: 59 - e2.getSeconds() };
          Me.isSupport() ? Me.set(qe("new_user"), "1", 3600 * r2.h + 60 * r2.m + r2.s + "s") : Ke.set(Ke.getNewUserFlagMemoryKey("new_user"), "1", 3600 * r2.h + 60 * r2.m + r2.s + "s"), this.is_first_visit_time = true, this.is_page_first_visited = true;
        } else Fe() || (this.checkIsAddSign = function(e3) {
          "track" === e3.type && (e3.properties.$is_first_day = false);
        }), this.checkIsFirstTime = function(e3) {
          "track" === e3.type && "$pageview" === e3.event && (e3.properties.$is_first_time = false);
        };
      } };
      function ze(e2, t2, r2) {
        var n2 = !(!s(Ee.heatmap) || !Ee.heatmap.useCapture);
        return s(Ee.heatmap) && P(Ee.heatmap.useCapture) && "click" === t2 && (n2 = true), T(e2, t2, r2, n2);
      }
      var We = function() {
        this._events = [], this.pendingEvents = [];
      };
      function Xe() {
        var e2 = document.referrer;
        if (!e2) return false;
        try {
          var t2 = b(e2).hostname;
          return t2 && "baidu.com" === t2.substring(t2.length - "baidu.com".length);
        } catch (r2) {
          return false;
        }
      }
      We.prototype = { emit: function(e2) {
        var t2 = [].slice.call(arguments, 1);
        D(this._events, function(r2) {
          r2.type === e2 && r2.callback.apply(r2.context, t2);
        }), this.pendingEvents.push({ type: e2, data: t2 }), this.pendingEvents.length > 20 && this.pendingEvents.shift();
      }, on: function(e2, t2, n2, i2) {
        r(t2) && (this._events.push({ type: e2, callback: t2, context: n2 || this }), i2 = false !== i2, this.pendingEvents.length > 0 && i2 && D(this.pendingEvents, function(r2) {
          r2.type === e2 && t2.apply(n2, r2.data);
        }));
      }, tempAdd: function(e2, t2) {
        if (t2 && e2) return this.emit(e2, t2);
      }, isReady: function() {
      } };
      var Ze = { data: {}, id: function() {
        return this.data.id ? this.data.id : (this.data.id = Ge(), this.data.id);
      }, type: function() {
        return this.data.type ? this.data.type : (this.data.type = Ye(), this.data.type);
      } };
      function Ye() {
        var e2 = Y(document.referrer);
        if (ce(e2) || !e2.eqid) {
          var t2 = Y(location.href);
          return e2.ck || t2.utm_source ? "baidu_sem_keyword_id" : "baidu_other_keyword_id";
        }
        return "baidu_seo_keyword_id";
      }
      function Ge() {
        var e2 = Y(document.referrer);
        return ce(e2) || !e2.eqid ? S().replace(/-/g, "") : e2.eqid;
      }
      function Qe(e2, t2) {
        return h(e2 = e2 || document.referrer) ? (0 !== (e2 = H(e2 = v(e2))).indexOf("https://www.baidu.com/") || t2 || (e2 = e2.split("?")[0]), h(e2 = e2.slice(0, Ee.max_referrer_string_length)) ? e2 : "") : "取值异常_referrer异常_" + String(e2);
      }
      function et(e2) {
        if ("" === (e2 = e2 || document.referrer)) return true;
        var t2 = K(null, Be, Ee.is_secure_cookie), r2 = W(e2);
        return -1 === (r2 = "." + r2).indexOf(t2) && "" !== t2;
      }
      function tt(e2, t2) {
        e2 = e2 || document.referrer;
        var r2 = Ee.source_type.keyword;
        if (document && h(e2)) {
          if (0 === e2.indexOf("http")) {
            var n2 = rt(e2), i2 = Y(e2);
            if (ce(i2)) return Ee.preset_properties.search_keyword_baidu && Xe() ? void 0 : "未取到值";
            var a2 = null;
            for (var o2 in r2) if (n2 === o2 && s(i2)) {
              if (C(a2 = r2[o2])) for (o2 = 0; o2 < a2.length; o2++) {
                var l2 = i2[a2[o2]];
                if (l2) return t2 ? { active: l2 } : l2;
              }
              else if (i2[a2]) return t2 ? { active: i2[a2] } : i2[a2];
            }
            return Ee.preset_properties.search_keyword_baidu && Xe() ? void 0 : "未取到值";
          }
          return "" === e2 ? "未取到值_直接打开" : "未取到值_非http的url";
        }
        return "取值异常_referrer异常_" + String(e2);
      }
      function rt(e2) {
        var t2 = W(e2);
        if (!t2 || "hostname解析异常" === t2) return "";
        var r2 = { baidu: [/^.*\.baidu\.com$/], bing: [/^.*\.bing\.com$/], google: [/^www\.google\.com$/, /^www\.google\.com\.[a-z]{2}$/, /^www\.google\.[a-z]{2}$/], sm: [/^m\.sm\.cn$/], so: [/^.+\.so\.com$/], sogou: [/^.*\.sogou\.com$/], yahoo: [/^.*\.yahoo\.com$/] };
        for (var n2 in r2) for (var i2 = r2[n2], a2 = 0, o2 = i2.length; a2 < o2; a2++) if (i2[a2].test(t2)) return n2;
        return "未知搜索引擎";
      }
      var nt = { distinct_id: function() {
      }, jssdkDebug: function() {
      }, _sendDebug: function(e2) {
      }, apph5: function(e2) {
        var t2 = "app_h5打通失败-", r2 = { 1: t2 + "use_app_track为false", 2: t2 + "Android或者iOS，没有暴露相应方法", 3.1: t2 + "Android校验server_url失败", 3.2: t2 + "iOS校验server_url失败", 4.1: t2 + "H5 校验 iOS server_url 失败", 4.2: t2 + "H5 校验 Android server_url 失败" }, n2 = e2.output, i2 = e2.step, a2 = e2.data || "";
        "all" !== n2 && "console" !== n2 || De(r2[i2]), ("all" === n2 || "code" === n2) && s(Ee.is_debug) && Ee.is_debug.apph5 && (a2.type && "profile" === a2.type.slice(0, 7) || (a2.properties._jssdk_debug_info = "apph5-" + String(i2)));
      }, defineMode: function(e2) {
        var t2 = { 1: { title: "当前页面无法进行可视化全埋点", message: "App SDK 与 Web JS SDK 没有进行打通，请联系贵方技术人员修正 App SDK 的配置，详细信息请查看文档。", link_text: "", link_url: "" }, 2: { title: "当前页面无法进行可视化全埋点", message: "App SDK 与 Web JS SDK 没有进行打通，请联系贵方技术人员修正 Web JS SDK 的配置，详细信息请查看文档。", link_text: "", link_url: "" }, 3: { title: "当前页面无法进行可视化全埋点", message: "Web JS SDK 没有开启全埋点配置，请联系贵方工作人员修正 SDK 的配置，详细信息请查看文档。", link_text: "", link_url: "" }, 4: { title: "当前页面无法进行可视化全埋点", message: "Web JS SDK 配置的数据校验地址与 App SDK 配置的数据校验地址不一致，请联系贵方工作人员修正 SDK 的配置，详细信息请查看文档。", link_text: "", link_url: "" } };
        return !(!e2 || !t2[e2]) && t2[e2];
      }, protocol: { protocolIsSame: function(e2, t2) {
        try {
          if (b(e2).protocol !== b(t2).protocol) return false;
        } catch (r2) {
          return $e("不支持 _.URL 方法"), false;
        }
        return true;
      }, serverUrl: function() {
        h(Ee.server_url) && "" !== Ee.server_url && !this.protocolIsSame(Ee.server_url, location.href) && $e("SDK 检测到您的数据发送地址和当前页面地址的协议不一致，建议您修改成一致的协议。\n因为：1、https 下面发送 http 的图片请求会失败。2、http 页面使用 https + ajax 方式发数据，在 ie9 及以下会丢失数据。");
      }, ajax: function(e2) {
        if (e2 === Ee.server_url) return false;
        h(e2) && "" !== e2 && !this.protocolIsSame(e2, location.href) && $e("SDK 检测到您的数据发送地址和当前页面地址的协议不一致，建议您修改成一致的协议。因为 http 页面使用 https + ajax 方式发数据，在 ie9 及以下会丢失数据。");
      } } }, it = { initPage: function() {
        var e2 = Qe(), t2 = ee(), r2 = Je(t2);
        r2 || nt.jssdkDebug("url_domain异常_" + t2 + "_" + r2), this.pageProp = { referrer: e2, referrer_host: e2 ? W(e2) : "", url: t2, url_host: W(t2, "url_host取值异常"), url_domain: r2 };
      }, pageProp: {}, campaignParams: function() {
        return t.kit.getUtmData();
      }, campaignParamsStandard: function(e2, t2) {
        e2 = e2 || "", t2 = t2 || "";
        var r2 = it.campaignParams(), n2 = {}, i2 = {};
        return D(r2, function(r3, a2, o2) {
          -1 !== (" " + Ue + " ").indexOf(" " + a2 + " ") ? n2[e2 + a2] = o2[a2] : i2[t2 + a2] = o2[a2];
        }), { $utms: n2, otherUtms: i2 };
      }, properties: function() {
        var e2 = window.innerHeight || document.documentElement.clientHeight || document.body && document.body.clientHeight || 0, t2 = window.innerWidth || document.documentElement.clientWidth || document.body && document.body.clientWidth || 0;
        return { $timezone_offset: (/* @__PURE__ */ new Date()).getTimezoneOffset(), $screen_height: Number(screen.height) || 0, $screen_width: Number(screen.width) || 0, $viewport_height: e2, $viewport_width: t2, $lib: "js", $lib_version: Re };
      }, currentProps: {}, register: function(e2) {
        $(it.currentProps, e2);
      } };
      function at() {
        function e2(e3, t3) {
          for (var r3 = 0; r3 < e3.length; r3++) if (-1 !== t3.split("?")[0].indexOf(e3[r3])) return true;
        }
        var t2 = "(" + Ee.source_type.utm.join("|") + ")\\=[^&]+", r2 = Ee.source_type.search, n2 = Ee.source_type.social, i2 = document.referrer || "", a2 = it.pageProp.url;
        if (a2) {
          var o2 = a2.match(new RegExp(t2));
          return o2 && o2[0] ? "付费广告流量" : e2(r2, i2) ? "自然搜索流量" : e2(n2, i2) ? "社交网站流量" : "" === i2 ? "直接流量" : "引荐流量";
        }
        return "获取url异常";
      }
      function ot(e2) {
        var t2 = Z(e2, "gdt_vid"), r2 = Z(e2, "hash_key"), n2 = Z(e2, "callbacks"), i2 = { click_id: "", hash_key: "", callbacks: "" };
        return h(t2) && t2.length && (i2.click_id = 16 == t2.length || 18 == t2.length ? t2 : "参数解析不合法", h(r2) && r2.length && (i2.hash_key = r2), h(n2) && n2.length && (i2.callbacks = n2)), i2;
      }
      function st(e2) {
        var t2 = e2.properties, n2 = JSON.parse(JSON.stringify(e2));
        s(t2) && D(t2, function(e3, i2) {
          if (r(e3)) try {
            t2[i2] = e3(n2), r(t2[i2]) && ($e("您的属性- " + i2 + " 格式不满足要求，我们已经将其删除"), delete t2[i2]);
          } catch (a2) {
            delete t2[i2], $e("您的属性- " + i2 + " 抛出了异常，我们已经将其删除");
          }
        });
      }
      function lt(e2) {
        if (s(e2) && e2.$option) {
          var t2 = e2.$option;
          return delete e2.$option, t2;
        }
        return {};
      }
      function ut(e2) {
        var t2 = {};
        return D(e2, function(e3, r2) {
          null != e3 && (t2[r2] = e3);
        }), t2;
      }
      function ct(e2) {
        if (!k(e2.target)) return false;
        var t2 = e2.target, r2 = h(t2.tagName) ? t2.tagName.toLowerCase() : "unknown", n2 = {};
        return n2.$element_type = r2, n2.$element_name = t2.getAttribute("name"), n2.$element_id = t2.getAttribute("id"), n2.$element_class_name = h(t2.className) ? t2.className : null, n2.$element_target_url = t2.getAttribute("href"), n2.$element_content = pt(t2, r2), (n2 = ut(n2)).$url = ee(), n2.$url_path = te(), n2.$title = document.title, n2;
      }
      function pt(e2, t2) {
        return h(t2) && "input" === t2.toLowerCase() ? (n2 = e2, i2 = Ee.heatmap && r(Ee.heatmap.collect_input) && Ee.heatmap.collect_input(n2), ("button" === n2.type || "submit" === n2.type || i2) && n2.value || "") : z(e2, t2);
        var n2, i2;
      }
      function dt(e2) {
        return nt.protocol.ajax(e2.url), x(e2);
      }
      function ft(e2, t2) {
        if ("string" == typeof e2 && (e2 = v(e2)) && ("://" === e2.slice(0, 3) ? e2 = location.protocol.slice(0, -1) + e2 : "//" === e2.slice(0, 2) ? e2 = location.protocol + e2 : "http" !== e2.slice(0, 4) && (e2 = "")), C(e2) && e2.length) for (var r2 = 0; r2 < e2.length; r2++) /sa\.gif[^\/]*$/.test(e2[r2]) || (e2[r2] = e2[r2].replace(/\/sa$/, "/sa.gif").replace(/(\/sa)(\?[^\/]+)$/, "/sa.gif$2"));
        else /sa\.gif[^\/]*$/.test(e2) || "string" != typeof e2 || (e2 = e2.replace(/\/sa$/, "/sa.gif").replace(/(\/sa)(\?[^\/]+)$/, "/sa.gif$2"));
        return t2 && "string" == typeof t2 && (e2 = t2), e2;
      }
      function gt(e2) {
        h(e2) || (e2 = JSON.stringify(e2));
        var t2 = U(e2), r2 = "crc=" + ie(t2);
        return "data=" + encodeURIComponent(t2) + "&ext=" + encodeURIComponent(r2);
      }
      var _t = {}, ht = new f();
      function mt(e2, t2) {
        var r2 = [];
        "string" == typeof e2 && e2 in _t.EVENT_LIST && (r2 = _t.EVENT_LIST[e2], _t[r2[0]].on(r2[1], t2));
      }
      _t.spa = ht, _t.sdk = new f(), _t.data = new f(), _t.initSystemEvent = function() {
        var e2, t2, n2, i2, a2;
        e2 = function(e3) {
          ht.emit("switch", e3);
        }, n2 = location.href, i2 = window.history.pushState, a2 = window.history.replaceState, r(window.history.pushState) && (window.history.pushState = function() {
          i2.apply(window.history, arguments), e2(n2), n2 = location.href;
        }), r(window.history.replaceState) && (window.history.replaceState = function() {
          a2.apply(window.history, arguments), e2(n2), n2 = location.href;
        }), t2 = window.document.documentMode ? "hashchange" : i2 ? "popstate" : "hashchange", T(window, t2, function() {
          e2(n2), n2 = location.href;
        });
      }, _t.EVENT_LIST = { spaSwitch: ["spa", "switch"], sdkBeforeInit: ["sdk", "beforeInit"], sdkInitPara: ["sdk", "initPara"], sdkAfterInitPara: ["sdk", "afterInitPara"], sdkInitAPI: ["sdk", "initAPI"], sdkAfterInitAPI: ["sdk", "afterInitAPI"], sdkAfterInit: ["sdk", "afterInit"], sdkReady: ["sdk", "ready"], dataSendSuccess: ["data", "sendSuccess"], dataSendFail: ["data", "sendFail"] };
      var vt = function(e2) {
        this.callback = e2.callback, this.server_url = e2.server_url, this.data = e2.data, this.origin_data = e2.origin_data;
      };
      vt.prototype.start = function() {
        var e2 = this, t2 = /* @__PURE__ */ new Date();
        dt({ url: this.server_url, type: "POST", data: e2.data, credentials: false, timeout: Ee.datasend_timeout, cors: true, success: function(r2, n2) {
          _t.data.emit("sendSuccess", { status: String(n2), resText: r2, type: "ajax_single", timeout_config: Ee.datasend_timeout, request_timeout: /* @__PURE__ */ new Date() - t2, data: e2.origin_data }), e2.end();
        }, error: function(r2, n2) {
          _t.data.emit("sendFail", { status: String(n2), resText: r2, type: "ajax_single", timeout_config: Ee.datasend_timeout, request_timeout: /* @__PURE__ */ new Date() - t2, data: e2.origin_data }), e2.end();
        } });
      }, vt.prototype.end = function() {
        if (this.callback) {
          if (De("warning: sdk callback is deprecated."), !r(this.callback)) return void De("error: sdk callback must be function.");
          this.callback();
        }
      };
      function yt() {
        this.sendTimeStamp = 0, this.timer = null, this.serverUrl = "", this.hasTabStorage = false;
      }
      yt.prototype = { batchInterval: function() {
        "" === this.serverUrl && this.getServerUrl(), this.hasTabStorage || (this.generateTabStorage(), this.hasTabStorage = true);
        var e2 = this;
        e2.timer = setTimeout(function() {
          e2.updateExpireTime(), e2.recycle(), e2.send(), clearTimeout(e2.timer), e2.batchInterval();
        }, Ee.batch_send.send_interval);
      }, getServerUrl: function() {
        if (!(h(Ee.server_url) && "" !== Ee.server_url || C(Ee.server_url) && Ee.server_url.length)) return xe("当前 server_url 为空或不正确，只在控制台打印日志，network 中不会发数据，请配置正确的 server_url！");
        this.serverUrl = C(Ee.server_url) ? Ee.server_url[0] : Ee.server_url;
      }, send: function() {
        if (this.sendTimeStamp && n() - this.sendTimeStamp < Ee.batch_send.send_interval) return false;
        var e2 = a.get(this.tabKey);
        if (e2) {
          this.sendTimeStamp = n();
          var r2 = Pe((e2 = c(e2) || this.generateTabStorageVal()).data);
          if (r2.length) {
            for (var i2 = [], o2 = 0; o2 < r2.length; o2++) {
              var s2 = t.store.readObjectVal(r2[o2]);
              s2 && (s2._flush_time = (/* @__PURE__ */ new Date()).getTime(), i2.push(s2));
            }
            i2.length && this.request(i2, e2.data);
          }
        }
      }, updateExpireTime: function() {
        var e2 = a.get(this.tabKey);
        e2 && ((e2 = c(e2) || this.generateTabStorageVal()).expireTime = n() + 2 * Ee.batch_send.send_interval, e2.serverUrl = this.serverUrl, a.set(this.tabKey, JSON.stringify(e2)));
      }, request: function(e2, t2) {
        var r2 = this, n2 = /* @__PURE__ */ new Date();
        dt({ url: this.serverUrl, type: "POST", data: "data_list=" + encodeURIComponent(U(JSON.stringify(e2))), credentials: false, timeout: Ee.batch_send.datasend_timeout, cors: true, success: function(i2, a2) {
          _t.data.emit("sendSuccess", { status: String(a2), resText: i2, type: "ajax_batch", timeout_config: Ee.batch_send.datasend_timeout, request_timeout: /* @__PURE__ */ new Date() - n2, data: e2 }), r2.remove(t2), r2.sendTimeStamp = 0;
        }, error: function(t3, i2) {
          _t.data.emit("sendFail", { status: String(i2), resText: t3, type: "ajax_batch", timeout_config: Ee.batch_send.datasend_timeout, request_timeout: /* @__PURE__ */ new Date() - n2, data: e2 }), r2.sendTimeStamp = 0;
        } });
      }, remove: function(e2) {
        var t2 = a.get(this.tabKey);
        if (t2) {
          for (var r2 = (c(t2) || this.generateTabStorageVal()).data, n2 = 0; n2 < e2.length; n2++) {
            var i2 = oe(r2, e2[n2]);
            i2 > -1 && r2.splice(i2, 1), a.remove(e2[n2]);
          }
          r2 = Pe(r2), a.set(this.tabKey, JSON.stringify(this.generateTabStorageVal(r2)));
        }
      }, add: function(e2) {
        var r2 = "sawebjssdk-" + String(u()), i2 = a.get(this.tabKey);
        null === i2 ? (this.tabKey = "tab-sawebjssdk-" + String(u()), i2 = this.generateTabStorageVal()) : i2 = c(i2) || this.generateTabStorageVal(), i2.data.push(r2), i2.expireTime = n() + 2 * Ee.batch_send.send_interval, a.set(this.tabKey, JSON.stringify(i2)), t.store.saveObjectVal(r2, e2), "track_signup" !== e2.type && "$pageview" !== e2.event || this.sendImmediately();
      }, generateTabStorage: function() {
        this.tabKey = "tab-sawebjssdk-" + String(u()), a.set(this.tabKey, JSON.stringify(this.generateTabStorageVal()));
      }, generateTabStorageVal: function(e2) {
        return { data: e2 = e2 || [], expireTime: n() + 2 * Ee.batch_send.send_interval, serverUrl: this.serverUrl };
      }, sendImmediately: function() {
        this.send();
      }, recycle: function() {
        for (var e2 = {}, t2 = 0; t2 < localStorage.length; t2++) {
          var r2 = localStorage.key(t2), i2 = this;
          if (0 === r2.indexOf("tab-sawebjssdk-")) {
            for (var o2 = c(a.get(r2)) || this.generateTabStorageVal(), s2 = 0; s2 < o2.data.length; s2++) e2[o2.data[s2]] = true;
            if (r2 !== i2.tabKey && n() > o2.expireTime && this.serverUrl === o2.serverUrl) new p("sajssdk-lock-get-").get(r2, 1e4, 1e3, function(e3) {
              if (e3) {
                null === a.get(i2.tabKey) && i2.generateTabStorage();
                var t3 = c(e3) || i2.generateTabStorageVal(), r3 = c(a.get(i2.tabKey)) || i2.generateTabStorageVal();
                r3.data = Pe(r3.data.concat(t3.data)), a.set(i2.tabKey, JSON.stringify(r3));
              }
            });
          } else if (0 === r2.indexOf("sajssdk-lock-get-")) {
            var l2 = c(a.get(r2)) || { expireTime: 0 };
            n() - l2.expireTime > 1e4 && a.remove(r2);
          }
        }
        for (var u2 = 0; u2 < localStorage.length; u2++) {
          var d2 = localStorage.key(u2);
          0 !== d2.indexOf("sawebjssdk-") || e2[d2] || a.remove(d2);
        }
      } };
      var bt = function(e2) {
        this.callback = e2.callback, this.server_url = e2.server_url, this.data = e2.data;
      };
      bt.prototype.start = function() {
        var e2 = this;
        "object" == typeof navigator && "function" == typeof navigator.sendBeacon && navigator.sendBeacon(this.server_url, this.data), setTimeout(function() {
          e2.end();
        }, 40);
      }, bt.prototype.end = function() {
        if (this.callback) {
          if (De("warning: sdk callback is deprecated."), !r(this.callback)) return void De("error: sdk callback must be function.");
          this.callback();
        }
      };
      var wt = function(e2) {
        this.callback = e2.callback, this.img = document.createElement("img"), this.img.width = 1, this.img.height = 1, Ee.img_use_crossorigin && (this.img.crossOrigin = "anonymous"), this.server_url = e2.data;
      };
      wt.prototype.start = function() {
        var e2 = this;
        Ee.ignore_oom && (this.img.onload = function() {
          this.onload = null, this.onerror = null, this.onabort = null, e2.end();
        }, this.img.onerror = function() {
          this.onload = null, this.onerror = null, this.onabort = null, e2.end();
        }, this.img.onabort = function() {
          this.onload = null, this.onerror = null, this.onabort = null, e2.end();
        }), this.img.src = this.server_url;
      }, wt.prototype.lastClear = function() {
        Q().ie !== void 0 ? this.img.src = "about:blank" : this.img.src = "";
      }, wt.prototype.end = function() {
        if (this.callback) {
          if (De("warning: sdk callback is deprecated."), !r(this.callback)) return void De("error: sdk callback must be function.");
          this.callback();
        }
        self.lastClear && self.lastClear();
      };
      var St = { __proto__: null, addEvent: ze, EventEmitterSa: We, cookie: Me, info: it, getReferrer: Qe, getCurrentDomain: Je, isBaiduTraffic: Xe, getReferrerEqid: Ge, getReferrerEqidType: Ye, getBaiduKeyword: Ze, isReferralTraffic: et, getKeywordFromReferrer: tt, getReferSearchEngine: rt, getSourceFromReferrer: at, getWxAdIdFromUrl: ot, parseSuperProperties: st, searchConfigData: lt, strip_empty_properties: ut, getEleInfo: ct, getElementContent: pt, ajax: dt, optimizeServerUrl: ft, encodeTrackData: gt, AjaxSend: vt, BatchSend: yt, BeaconSend: bt, ImageSend: wt }, kt = new We(), Pt = { requests: [], _sessionState: {}, _state: { distinct_id: "", first_id: "", props: {}, identities: {} }, getProps: function() {
        return this._state.props || {};
      }, getSessionProps: function() {
      }, getOriginDistinctId: function() {
        return this._state._distinct_id || this._state.distinct_id;
      }, getOriginUnionId: function(e2) {
        var t2 = {}, r2 = (e2 = e2 || this._state)._first_id || e2.first_id, n2 = e2._distinct_id || e2.distinct_id;
        return r2 && n2 ? (t2.login_id = n2, t2.anonymous_id = r2) : t2.anonymous_id = n2, t2;
      }, getIdentities: function() {
        var e2 = JSON.parse(JSON.stringify(this._state.identities));
        return e2.$identity_anonymous_id = this.getAnonymousId(), e2;
      }, getAnonymousId: function() {
        return Pt._state._first_id || Pt._state.first_id || Pt._state._distinct_id || Pt._state.distinct_id;
      }, getDistinctId: function() {
        var e2 = this.getUnionId();
        return e2.login_id || e2.anonymous_id;
      }, getUnionId: function(e2) {
        var t2 = this.getOriginUnionId(e2);
        return t2.login_id && this._state.history_login_id && this._state.history_login_id.name && this._state.history_login_id.name !== He.LOGIN && (t2.login_id = this._state.history_login_id.name + "+" + t2.login_id), t2;
      }, getFirstId: function() {
        return this._state._first_id || this._state.first_id;
      }, initSessionState: function() {
      }, setOnce: function(e2, t2) {
        e2 in this._state || this.set(e2, t2);
      }, set: function(e2, t2) {
        this._state = this._state || {};
        var r2 = this._state.distinct_id;
        this._state[e2] = t2, "first_id" === e2 ? delete this._state._first_id : "distinct_id" === e2 && delete this._state._distinct_id, this.save(), "distinct_id" === e2 && r2 && kt.tempAdd("changeDistinctId", t2);
      }, change: function(e2, t2) {
        this._state["_" + e2] = t2;
      }, setSessionProps: function() {
        t.log("initSessionState 方法已经弃用，请不要使用该功能，如有需求联系技术顾问");
      }, setSessionPropsOnce: function() {
        t.log("initSessionState 方法已经弃用，请不要使用该功能，如有需求联系技术顾问");
      }, setProps: function(e2, r2) {
        var n2 = {};
        for (var i2 in n2 = r2 ? e2 : $(this._state.props || {}, e2)) "string" == typeof n2[i2] && (n2[i2] = n2[i2].slice(0, t.para.max_referrer_string_length));
        this.set("props", n2);
      }, setPropsOnce: function(e2) {
        var t2 = this._state.props || {};
        B(t2, e2), this.set("props", t2);
      }, clearAllProps: function(e2) {
        var t2;
        if (C(e2) && e2.length > 0) for (t2 = 0; t2 < e2.length; t2++) h(e2[t2]) && -1 === e2[t2].indexOf("latest_") && s(this._state.props) && e2[t2] in this._state.props && delete this._state.props[e2[t2]];
        else if (s(this._state.props)) for (t2 in this._state.props) 1 !== t2.indexOf("latest_") && delete this._state.props[t2];
        this.sessionSave({}), this.save();
      }, sessionSave: function() {
        t.log("initSessionState 方法已经弃用，请不要使用该功能，如有需求联系技术顾问");
      }, save: function() {
        var e2 = JSON.parse(JSON.stringify(this._state));
        delete e2._first_id, delete e2._distinct_id, e2.identities && (e2.identities = U(JSON.stringify(e2.identities)));
        var r2 = JSON.stringify(e2);
        t.para.encrypt_cookie && (r2 = t.kit.userEncrypt(r2)), Me.set(this.getCookieName(), r2, 360, t.para.cross_subdomain);
      }, getCookieName: function() {
        var e2 = "";
        if (false === t.para.cross_subdomain) {
          try {
            var r2 = location.host;
            P(t.para.white_list[r2]) || (e2 = t.para.white_list[r2]);
          } catch (n2) {
            $e(n2);
          }
          e2 = "string" == typeof e2 && "" !== e2 ? "sa_jssdk_2015_" + t.para.sdk_id + e2.replace(/\./g, "_") : "sa_jssdk_2015_root" + t.para.sdk_id;
        } else e2 = "sensorsdata2015jssdkcross" + t.para.sdk_id;
        return e2;
      }, init: function() {
        this.initSessionState();
        var e2, r2, n2 = S();
        Me.isSupport() && (e2 = Me.get(this.getCookieName()), r2 = c(e2 = t.kit.userDecryptIfNeeded(e2))), Me.isSupport() && null !== e2 && fe(e2) && s(r2) && (!s(r2) || r2.distinct_id) ? (Pt._state = $((function(e3) {
          var t2;
          e3.identities && (0 === e3.identities.indexOf("\n/") ? e3.identities = c(ye(e3.identities)) : e3.identities = c(L(e3.identities)));
          var r3 = Pt.getOriginUnionId(e3);
          e3.identities && s(e3.identities) && !ce(e3.identities) || (e3.identities = {}, e3.identities.$identity_cookie_id = S()), e3.history_login_id = e3.history_login_id || {};
          var n3 = e3.history_login_id.name;
          if (r3.login_id) if (n3 && e3.identities.hasOwnProperty(n3)) {
            if (e3.identities[n3] !== r3.login_id) {
              for (t2 in e3.identities[n3] = r3.login_id, e3.identities) e3.identities.hasOwnProperty(t2) && "$identity_cookie_id" !== t2 && t2 !== n3 && delete e3.identities[t2];
              e3.history_login_id.value = r3.login_id;
            }
          } else {
            var i2 = n3 || He.LOGIN;
            for (t2 in e3.identities[i2] = r3.login_id, e3.identities) e3.identities.hasOwnProperty(t2) && "$identity_cookie_id" !== t2 && t2 !== i2 && delete e3.identities[t2];
            e3.history_login_id = { name: i2, value: r3.login_id };
          }
          else {
            if (e3.identities.hasOwnProperty("$identity_login_id") || e3.identities.hasOwnProperty(n3)) for (t2 in e3.identities) e3.identities.hasOwnProperty(t2) && "$identity_cookie_id" !== t2 && "$identity_anonymous_id" !== t2 && delete e3.identities[t2];
            e3.history_login_id = { name: "", value: "" };
          }
          return e3;
        })(r2)), Pt.save()) : (t.is_first_visitor = true, (function(e3) {
          Pt.set("distinct_id", e3), Pt.set("identities", { $identity_cookie_id: e3 }), Pt.set("history_login_id", { name: "", value: "" });
        })(n2)), Ve.setDeviceId(n2, this), Ve.storeInitCheck();
      }, saveObjectVal: function(e2, r2) {
        h(r2) || (r2 = JSON.stringify(r2)), 1 == t.para.encrypt_cookie && (r2 = t.kit.userEncrypt(r2)), a.set(e2, r2);
      }, readObjectVal: function(e2) {
        var r2 = a.get(e2);
        return r2 ? c(r2 = t.kit.userDecryptIfNeeded(r2)) : null;
      } }, Ct = { string: function(e2) {
        $e(e2 + " must be string");
      }, emptyString: function(e2) {
        $e(e2 + "'s is empty");
      }, regexTest: function(e2) {
        $e(e2 + " is invalid");
      }, idLength: function(e2) {
        $e(e2 + " length is longer than " + Ee.max_id_length);
      }, keyLength: function(e2) {
        $e(e2 + " length is longer than " + Ee.max_key_length);
      }, stringLength: function(e2) {
        $e(e2 + " length is longer than " + Ee.max_string_length);
      }, voidZero: function(e2) {
        $e(e2 + "'s is undefined");
      }, reservedLoginId: function(e2) {
        $e(e2 + " is invalid");
      }, reservedBind: function(e2) {
        $e(e2 + " is invalid");
      }, reservedUnbind: function(e2) {
        $e(e2 + " is invalid");
      } }, Ot = { regName: /^((?!^distinct_id$|^original_id$|^time$|^properties$|^id$|^first_id$|^second_id$|^users$|^events$|^event$|^user_id$|^date$|^datetime$|^user_tag.*|^user_group.*)[a-zA-Z_$][a-zA-Z\d_$]*)$/i, loginIDReservedNames: ["$identity_anonymous_id", "$identity_cookie_id"], bindReservedNames: ["$identity_login_id", "$identity_anonymous_id", "$identity_cookie_id"], unbindReservedNames: ["$identity_anonymous_id", He.LOGIN], string: function(e2) {
        return !!h(e2);
      }, emptyString: function(e2) {
        return !(!h(e2) || 0 === v(e2).length);
      }, regexTest: function(e2) {
        return !(!h(e2) || !this.regName.test(e2));
      }, idLength: function(e2) {
        return !(!h(e2) || e2.length > Ee.max_id_length);
      }, keyLength: function(e2) {
        return !(!h(e2) || e2.length > Ee.max_key_length);
      }, stringLength: function(e2) {
        return !(!h(e2) || e2.length > Ee.max_string_length);
      }, voidZero: function(e2) {
        return void 0 !== e2;
      }, reservedLoginId: function(e2) {
        return !(oe(this.loginIDReservedNames, e2) > -1);
      }, reservedUnbind: function(e2) {
        return !(oe(this.unbindReservedNames, e2) > -1);
      }, reservedBind: function(e2) {
        var t2 = Pt._state.history_login_id;
        return (!t2 || !t2.name || t2.name !== e2) && !(oe(this.bindReservedNames, e2) > -1);
      } }, jt = { distinct_id: { rules: ["string", "emptyString", "idLength"], onComplete: function(e2, t2, n2) {
        return !e2 && ("emptyString" === n2 && (t2 = "Id"), r(Ct[n2]) && Ct[n2](t2), "idLength" === n2) || e2;
      } }, event: { rules: ["string", "emptyString", "keyLength", "regexTest"], onComplete: function(e2, t2, n2) {
        return e2 || ("emptyString" === n2 && (t2 = "eventName"), r(Ct[n2]) && Ct[n2](t2)), true;
      } }, propertyKey: { rules: ["string", "emptyString", "keyLength", "regexTest"], onComplete: function(e2, t2, n2) {
        return e2 || ("emptyString" === n2 && (t2 = "Property key"), r(Ct[n2]) && Ct[n2](t2)), true;
      } }, propertyValue: { rules: ["voidZero"], onComplete: function(e2, t2, n2) {
        return e2 || r(Ct[n2]) && Ct[n2]("Property Value"), true;
      } }, properties: function(e2) {
        return s(e2) ? D(e2, function(e3, t2) {
          Nt({ propertyKey: t2 });
          Nt({ propertyValue: e3 }, function(e4, n2, i2) {
            return e4 || (n2 = t2 + "'s Value", r(Ct[i2]) && Ct[i2](n2)), true;
          });
        }) : Ot.voidZero(e2) && $e("properties可以没有，但有的话必须是对象"), true;
      }, propertiesMust: function(e2) {
        return e2 !== void 0 && s(e2) && !ce(e2) ? this.properties.call(this, e2) : $e("properties必须是对象"), true;
      }, item_type: { rules: ["string", "emptyString", "keyLength", "regexTest"], onComplete: function(e2, t2, n2) {
        return e2 || ("emptyString" === n2 && (t2 = "item_type"), r(Ct[n2]) && Ct[n2](t2)), true;
      } }, item_id: { rules: ["string", "emptyString", "stringLength"], onComplete: function(e2, t2, n2) {
        return e2 || ("emptyString" === n2 && (t2 = "item_id"), r(Ct[n2]) && Ct[n2](t2)), true;
      } }, loginIdKey: { rules: ["string", "emptyString", "keyLength", "regexTest", "reservedLoginId"], onComplete: function(e2, t2, n2) {
        return !e2 && ("emptyString" === n2 && (t2 = "login_id_key"), r(Ct[n2]) && Ct[n2](t2), "keyLength" === n2) || e2;
      } }, bindKey: { rules: ["string", "emptyString", "keyLength", "regexTest", "reservedBind"], onComplete: function(e2, t2, n2) {
        return !e2 && ("emptyString" === n2 && (t2 = "Key"), r(Ct[n2]) && Ct[n2](t2), "keyLength" === n2) || e2;
      } }, unbindKey: { rules: ["string", "emptyString", "keyLength", "regexTest", "reservedUnbind"], onComplete: function(e2, t2, n2) {
        return !e2 && ("emptyString" === n2 && (t2 = "Key"), r(Ct[n2]) && Ct[n2](t2), "keyLength" === n2) || e2;
      } }, bindValue: { rules: ["string", "emptyString", "idLength"], onComplete: function(e2, t2, n2) {
        return !e2 && ("emptyString" === n2 && (t2 = "Value"), r(Ct[n2]) && Ct[n2](t2), "idLength" === n2) || e2;
      } }, check: function(e2, t2, n2) {
        var i2 = this[e2];
        if (r(i2)) return i2.call(this, t2);
        if (!i2) return false;
        for (var a2 = 0; a2 < i2.rules.length; a2++) {
          var o2 = i2.rules[a2], s2 = Ot[o2](t2), l2 = r(n2) ? n2(s2, t2, o2) : i2.onComplete(s2, t2, o2);
          if (!s2) return l2;
        }
        return true;
      } };
      function Nt(e2, t2) {
        for (var r2 in e2) if (Object.prototype.hasOwnProperty.call(e2, r2) && !jt.check(r2, e2[r2], t2)) return false;
        return true;
      }
      function Tt(e2) {
        var t2 = ["$element_selector", "$element_path"], r2 = ["sensorsdata_app_visual_properties"];
        s(e2) && D(e2, function(n2, i2) {
          if (s(n2)) Tt(e2[i2]);
          else if (h(n2)) {
            if (oe(r2, i2) > -1) return;
            e2[i2] = (a2 = n2, ge(o2 = oe(t2, i2) > -1 ? 1024 : Ee.max_string_length) && a2.length > o2 ? ($e("字符串长度超过限制，已经做截取--" + a2), a2.slice(0, o2)) : a2);
          }
          var a2, o2;
        });
      }
      var It = { initUrl: function() {
        var e2, r2, n2 = { server_url: { project: "", host: "" }, page_url: { host: "", pathname: "" } };
        if (!pe(t.para.server_url)) return xe("----vcollect---server_url必须为有效 URL 字符串"), false;
        try {
          e2 = b(t.para.server_url), n2.server_url.project = e2.searchParams.get("project") || "default", n2.server_url.host = e2.host;
        } catch (i2) {
          return xe("----vcollect---server_url解析异常", i2), false;
        }
        try {
          r2 = b(location.href), n2.page_url.host = r2.hostname, n2.page_url.pathname = r2.pathname;
        } catch (i2) {
          return xe("----vcollect---页面地址解析异常", i2), false;
        }
        return n2;
      }, isDiv: function(e2) {
        if (e2.element_path && "div" !== v(e2.element_path.split(">").pop()).slice(0, 3)) return false;
        return true;
      }, configIsMatchNew: function(e2, t2) {
        if (h(e2.$element_selector) && h(t2.element_selector)) {
          if ("element_selector" === t2.element_field && "equal" === t2["function"]) return e2.$element_selector === t2.element_selector;
          if ("element_selector" === t2.element_field && "contain" === t2["function"]) return e2.$element_selector.indexOf(t2.element_selector) > -1;
        }
        if (h(e2.$element_path) && h(t2.element_path)) {
          if ("element_path" === t2.element_field && "equal" === t2["function"]) return e2.$element_path === t2.element_path;
          if ("element_path" === t2.element_field && "contain" === t2["function"]) return e2.$element_path.indexOf(t2.element_path) > -1;
        }
        return false;
      }, configIsMatch: function(e2, t2) {
        return (!t2.limit_element_content || t2.element_content === e2.$element_content) && ((!t2.limit_element_position || t2.element_position === String(e2.$element_position)) && (t2.element_field && t2["function"] ? It.configIsMatchNew(e2, t2) : It.configIsMatchOldVersion(e2, t2)));
      }, configIsMatchOldVersion: function(e2, t2) {
        if (!t2.element_path) return false;
        if (e2.$element_position !== void 0) {
          if (t2.element_path !== e2.$element_path) return false;
        } else if (It.isDiv({ element_path: t2.element_path })) {
          if (e2.$element_path.indexOf(t2.element_path) < 0) return false;
        } else if (t2.element_path !== e2.$element_path) return false;
        return true;
      }, filterConfig: function(e2, t2, r2) {
        var n2 = [];
        if (!r2) {
          var i2 = It.initUrl();
          if (!i2) return [];
          r2 = i2.page_url;
        }
        return "$WebClick" === e2.event && D(t2, function(t3) {
          s(t3) && ("webclick" === t3.event_type || "appclick" === t3.event_type) && s(t3.event) && t3.event.url_host === r2.host && t3.event.url_path === r2.pathname && It.configIsMatch(e2.properties, t3.event) && n2.push(t3);
        }), n2;
      }, getPropElInLi: function(e2, r2) {
        if (!(e2 && k(e2) && h(r2))) return null;
        if ("li" !== e2.tagName.toLowerCase()) return null;
        var n2 = t.heatmap.getDomSelector(e2);
        if (n2) {
          var i2 = V(n2 + r2);
          return i2 || null;
        }
        return $e("----custom---获取同级属性元素失败，selector信息异常", n2, r2), null;
      }, getProp: function(e2, r2) {
        if (!s(e2)) return false;
        if (!(h(e2.name) && e2.name.length > 0)) return $e("----vcustom----属性名不合法,属性抛弃", e2.name), false;
        var n2, i2, a2 = {};
        if ("content" === e2.method) {
          var o2;
          if (h(e2.element_selector) && e2.element_selector.length > 0) o2 = V(e2.element_selector);
          else {
            if (!r2 || !h(e2.list_selector)) return $e("----vcustom----属性配置异常，属性抛弃", e2.name), false;
            var l2 = V(r2.properties.$element_selector);
            if (!l2) return $e("----vcustom----点击元素获取异常，属性抛弃", e2.name), false;
            var u2 = t.heatmap.getClosestLi(l2);
            o2 = It.getPropElInLi(u2, e2.list_selector);
          }
          if (!o2 || !k(o2)) return $e("----vcustom----属性元素获取失败，属性抛弃", e2.name), false;
          if ("input" === o2.tagName.toLowerCase()) n2 = o2.value || "";
          else if ("select" === o2.tagName.toLowerCase()) {
            var c2 = o2.selectedIndex;
            ge(c2) && k(o2[c2]) && (n2 = pt(o2[c2], "select"));
          } else n2 = pt(o2, o2.tagName.toLowerCase());
          if (e2.regular) {
            try {
              i2 = new RegExp(e2.regular).exec(n2);
            } catch (p2) {
              return $e("----vcustom----正则处理失败，属性抛弃", e2.name), false;
            }
            if (null === i2) return $e("----vcustom----属性规则处理，未匹配到结果,属性抛弃", e2.name), false;
            if (!C(i2) || !h(i2[0])) return $e("----vcustom----正则处理异常，属性抛弃", e2.name, i2), false;
            n2 = i2[0];
          }
          if ("STRING" === e2.type) a2[e2.name] = n2;
          else if ("NUMBER" === e2.type) {
            if (n2.length < 1) return $e("----vcustom----未获取到数字内容，属性抛弃", e2.name, n2), false;
            if (isNaN(Number(n2))) return $e("----vcustom----数字类型属性转换失败，属性抛弃", e2.name, n2), false;
            a2[e2.name] = Number(n2);
          }
          return a2;
        }
        return xe("----vcustom----属性不支持此获取方式", e2.name, e2.method), false;
      }, getAssignConfigs: function(e2, t2) {
        var r2 = It.initUrl();
        if (!r2 || !r2.page_url) return [];
        if (!s(t2)) return [];
        var n2 = [];
        return t2.events = t2.events || t2.eventList, C(t2.events) && t2.events.length > 0 ? (D(t2.events, function(t3) {
          s(t3) && s(t3.event) && t3.event.url_host === r2.page_url.host && t3.event.url_path === r2.page_url.pathname && e2(t3) && n2.push(t3);
        }), n2) : [];
      } }, At = { events: [], customProp: { events: [], getAssignConfigs: It.getAssignConfigs, filterConfig: It.filterConfig, getProp: It.getProp, initUrl: It.initUrl, updateEvents: function(e2) {
        C(e2) && (this.events = e2);
      }, init: function() {
        this.initAppGetPropsBridge();
      }, geth5Props: function(e2) {
        var r2 = {}, n2 = [], i2 = this;
        if (!this.events.length) return {};
        if ("$WebClick" === e2.event) {
          var a2 = this.filterConfig(e2, this.events);
          if (!a2.length) return {};
          D(a2, function(t2) {
            s(t2) && (C(t2.properties) && t2.properties.length > 0 && D(t2.properties, function(t3) {
              if (s(t3)) if (false === t3.h5) C(r2.sensorsdata_app_visual_properties) || (r2.sensorsdata_app_visual_properties = []), r2.sensorsdata_app_visual_properties.push(t3);
              else {
                var n3 = i2.getProp(t3, e2);
                s(n3) && (r2 = $(r2, n3));
              }
            }), h(t2.event_name) && n2.push(t2.event_name));
          }), t.bridge.hasVisualModeBridge() && (r2.sensorsdata_web_visual_eventName = n2);
        }
        return r2.sensorsdata_app_visual_properties && (r2.sensorsdata_app_visual_properties = U(JSON.stringify(r2.sensorsdata_app_visual_properties))), r2;
      }, initAppGetPropsBridge: function() {
        var e2 = this, r2 = new t.SDKJSBridge("getJSVisualProperties");
        return r2.onAppNotify(function(n2) {
          var i2 = {};
          try {
            n2 = JSON.parse(L(n2));
          } catch (l2) {
            xe("getJSVisualProperties data parse error!");
          }
          if (s(n2)) {
            var a2 = n2.sensorsdata_js_visual_properties, o2 = e2.initUrl();
            o2 && (o2 = o2.page_url, C(a2) && a2.length > 0 && D(a2, function(t2) {
              if (s(t2) && t2.url_host === o2.host && t2.url_path === o2.pathname && t2.h5) {
                var r3 = e2.getProp(t2);
                s(r3) && (i2 = $(i2, r3));
              }
            }));
          }
          return "android" === t.bridge.bridge_info.platform && r2.notifyApp({ data: i2 }, n2.message_id), i2;
        }), r2;
      } }, getAssignConfigs: It.getAssignConfigs, initUrl: It.initUrl, init: function() {
        if (this.initUrl()) {
          var e2 = this.getConfigFromApp();
          e2 && this.updateConfigs(e2), this.customProp.init(), this.initAppUpdateConfigBridge();
        }
      }, initAppUpdateConfigBridge: function() {
        var e2 = this;
        return new t.SDKJSBridge("updateH5VisualConfig").onAppNotify(function(t2) {
          if (t2) {
            try {
              t2 = JSON.parse(L(t2));
            } catch (r2) {
              return void xe("updateH5VisualConfig result parse error！");
            }
            e2.updateConfigs(t2);
          }
        });
      }, getConfigFromApp: function() {
        var e2 = new t.SDKJSBridge("sensorsdata_get_app_visual_config").notifyApp();
        if (e2) try {
          e2 = JSON.parse(L(e2));
        } catch (r2) {
          e2 = null, xe("getAppVisualConfig result parse error！");
        }
        return e2;
      }, updateConfigs: function(e2) {
        this.events = this.filterConfigs(e2), this.customProp.updateEvents(this.events);
      }, filterConfigs: function(e2) {
        return this.getAssignConfigs(function(e3) {
          return !(!s(e3) || false === e3.h5);
        }, e2);
      } }, Dt = { events: [], init: function(e2) {
        this.filterWebClickEvents(e2);
      }, filterWebClickEvents: function(e2) {
        this.events = xt.getAssignConfigs(function(e3) {
          return !(!s(e3) || true !== e3.event.unlimited_div || "webclick" !== e3.event_type);
        }, e2);
      }, isTargetEle: function(e2) {
        var r2 = t.heatmap.getEleDetail(e2);
        if (!s(r2) || !h(r2.$element_path)) return false;
        for (var n2 = 0; n2 < this.events.length; n2++) if (s(this.events[n2]) && s(this.events[n2].event) && xt.configIsMatch(r2, this.events[n2].event)) return true;
        return false;
      } }, $t = { events: [], configSwitch: false, collectAble: function() {
        return this.configSwitch && s(t.para.heatmap) && t.para.heatmap.get_vtrack_config;
      }, updateEvents: function(e2) {
        this.events = xt.getAssignConfigs(function(e3) {
          return !!(s(e3) && C(e3.properties) && e3.properties.length > 0);
        }, e2), this.events.length ? this.configSwitch = true : this.configSwitch = false;
      }, getVtrackProps: function(e2) {
        var t2 = {};
        return this.collectAble() ? ("$WebClick" === e2.event && (t2 = this.clickCustomPropMaker(e2, this.events)), t2) : {};
      }, clickCustomPropMaker: function(e2, t2, r2) {
        var n2 = this;
        r2 = r2 || this.filterConfig(e2, t2, xt.url_info.page_url);
        var i2 = {};
        return r2.length ? (D(r2, function(t3) {
          C(t3.properties) && t3.properties.length > 0 && D(t3.properties, function(t4) {
            var r3 = n2.getProp(t4, e2);
            s(r3) && $(i2, r3);
          });
        }), i2) : {};
      }, getProp: It.getProp, getPropElInLi: It.getPropElInLi, filterConfig: It.filterConfig }, xt = { unlimitedDiv: Dt, config: {}, storageEnable: true, storage_name: "webjssdkvtrackcollect", para: { session_time: 18e5, timeout: 5e3, update_interval: 18e5 }, url_info: {}, timer: null, update_time: null, customProp: $t, initUrl: function() {
        var e2 = It.initUrl();
        if (e2) {
          var r2;
          try {
            (r2 = new y(t.para.server_url))._values.Path = "/config/visualized/Web.conf", e2.api_url = r2.getUrl();
          } catch (n2) {
            return xe("----vtrackcollect---API地址解析异常", n2), false;
          }
          this.url_info = e2;
        }
        return e2;
      }, init: function() {
        if (!s(t.para.heatmap) || !t.para.heatmap.get_vtrack_config) return false;
        if (a.isSupport() || (this.storageEnable = false), !this.initUrl()) return xe("----vtrackcustom----初始化失败，url信息解析失败"), false;
        if (this.storageEnable) {
          var e2 = Pt.readObjectVal(this.storage_name);
          if (s(e2) && s(e2.data)) if (this.serverUrlIsSame(e2.serverUrl)) {
            this.config = e2.data, this.update_time = e2.updateTime, this.updateConfig(e2.data);
            var r2 = (/* @__PURE__ */ new Date()).getTime() - this.update_time;
            if (ge(r2) && r2 > 0 && r2 < this.para.session_time) {
              var n2 = this.para.update_interval - r2;
              this.setNextFetch(n2);
            } else this.getConfigFromServer();
          } else this.getConfigFromServer();
          else this.getConfigFromServer();
        } else this.getConfigFromServer();
        this.pageStateListenner();
      }, serverUrlIsSame: function(e2) {
        return !!s(e2) && (e2.host === this.url_info.server_url.host && e2.project === this.url_info.server_url.project);
      }, getConfigFromServer: function() {
        var e2 = this;
        this.sendRequest(function(t2, r2) {
          e2.update_time = (/* @__PURE__ */ new Date()).getTime();
          var n2 = {};
          200 === t2 ? r2 && s(r2) && "Web" === r2.os && (n2 = r2, e2.updateConfig(n2)) : 205 === t2 ? e2.updateConfig(n2) : 304 === t2 ? n2 = e2.config : (xe("----vtrackcustom----数据异常", t2), e2.updateConfig(n2)), e2.updateStorage(n2), e2.setNextFetch();
        }, function(t2) {
          e2.update_time = (/* @__PURE__ */ new Date()).getTime(), xe("----vtrackcustom----配置拉取失败", t2), e2.setNextFetch();
        });
      }, setNextFetch: function(e2) {
        var t2 = this;
        this.timer && (clearTimeout(this.timer), this.timer = null), e2 = e2 || this.para.update_interval, this.timer = setTimeout(function() {
          t2.getConfigFromServer();
        }, e2);
      }, pageStateListenner: function() {
        var e2 = this;
        he({ visible: function() {
          var t2 = (/* @__PURE__ */ new Date()).getTime() - e2.update_time;
          if (ge(t2) && t2 > 0 && t2 < e2.para.update_interval) {
            var r2 = e2.para.update_interval - t2;
            e2.setNextFetch(r2);
          } else e2.getConfigFromServer();
        }, hidden: function() {
          e2.timer && (clearTimeout(e2.timer), e2.timer = null);
        } });
      }, updateConfig: function(e2) {
        if (!s(e2)) return false;
        this.config = e2, this.customProp.updateEvents(e2), this.unlimitedDiv.init(e2);
      }, updateStorage: function(e2) {
        if (!this.storageEnable) return false;
        if (!s(e2)) return false;
        var t2;
        if (this.url_info.server_url) t2 = this.url_info.server_url;
        else {
          var r2 = xt.initUrl();
          if (!r2) return false;
          t2 = r2.server_url;
        }
        var n2 = { updateTime: (/* @__PURE__ */ new Date()).getTime(), data: e2, serverUrl: t2 };
        Pt.saveObjectVal(this.storage_name, n2);
      }, sendRequest: function(e2, t2) {
        var r2 = { app_id: this.url_info.page_url.host };
        this.config.version && (r2.v = this.config.version), _e({ url: this.url_info.api_url, callbackName: "saJSSDKVtrackCollectConfig", data: r2, timeout: this.para.timeout, success: function(t3, r3) {
          e2(t3, r3);
        }, error: function(e3) {
          t2(e3);
        } });
      }, getAssignConfigs: It.getAssignConfigs, configIsMatch: It.configIsMatch };
      var Et = { stage: null, init: function(e2) {
        this.stage = e2;
      }, interceptor: { basicProps: { priority: 0, entry: function(e2, t2) {
        try {
          var r2 = t2.sensors, n2 = {};
          s(e2) && s(e2.identities) && !ce(e2.identities) ? $(n2, e2.identities) : $(n2, Pt.getIdentities());
          var i2 = { identities: n2, distinct_id: Pt.getDistinctId(), lib: { $lib: "js", $lib_method: "code", $lib_version: String(r2.lib_version) }, properties: {} };
          return s(e2) && s(e2.properties) && !ce(e2.properties) && (e2.properties.$lib_detail && (i2.lib.$lib_detail = e2.properties.$lib_detail, delete e2.properties.$lib_detail), e2.properties.$lib_method && (i2.lib.$lib_method = e2.properties.$lib_method, delete e2.properties.$lib_method)), q(i2, Pt.getUnionId(), e2), s(e2.properties) && !ce(e2.properties) && $(i2.properties, e2.properties), "$UnbindID" === i2.event && (i2.login_id && delete i2.login_id, i2.anonymous_id && delete i2.anonymous_id), e2.type && "profile" === e2.type.slice(0, 7) || (r2.para.properties_priority && 3 === r2.para.properties_priority ? i2.properties = $({}, it.properties(), Pt.getSessionProps(), it.currentProps, Pt.getProps(), i2.properties) : i2.properties = $({}, it.properties(), Pt.getProps(), Pt.getSessionProps(), it.currentProps, i2.properties), r2.para.preset_properties.latest_referrer && !h(i2.properties.$latest_referrer) && (i2.properties.$latest_referrer = "取值异常"), r2.para.preset_properties.latest_search_keyword && !h(i2.properties.$latest_search_keyword) && (r2.para.preset_properties.search_keyword_baidu && h(i2.properties.$search_keyword_id) && ge(i2.properties.$search_keyword_id_hash) && h(i2.properties.$search_keyword_id_type) || (i2.properties.$latest_search_keyword = "取值异常")), r2.para.preset_properties.latest_traffic_source_type && !h(i2.properties.$latest_traffic_source_type) && (i2.properties.$latest_traffic_source_type = "取值异常"), r2.para.preset_properties.latest_landing_page && !h(i2.properties.$latest_landing_page) && (i2.properties.$latest_landing_page = "取值异常"), "not_collect" === r2.para.preset_properties.latest_wx_ad_click_id ? (delete i2.properties._latest_wx_ad_click_id, delete i2.properties._latest_wx_ad_hash_key, delete i2.properties._latest_wx_ad_callbacks) : r2.para.preset_properties.latest_wx_ad_click_id && !h(i2.properties._latest_wx_ad_click_id) && (i2.properties._latest_wx_ad_click_id = "取值异常", i2.properties._latest_wx_ad_hash_key = "取值异常", i2.properties._latest_wx_ad_callbacks = "取值异常"), h(i2.properties._latest_wx_ad_click_id) && (i2.properties.$url = ee())), i2.properties.$time && J(i2.properties.$time) ? (i2.time = 1 * i2.properties.$time, delete i2.properties.$time) : i2.time = 1 * /* @__PURE__ */ new Date(), (function(e3) {
            if (r2.bridge && "success" === r2.bridge.bridge_info.verify_success) {
              var t3 = At.customProp.geth5Props(JSON.parse(JSON.stringify(e3)));
              s(t3) && !ce(t3) && (e3.properties = $(e3.properties, t3));
            }
            var n3 = xt.customProp.getVtrackProps(JSON.parse(JSON.stringify(e3)));
            s(n3) && !ce(n3) && (e3.properties = $(e3.properties, n3));
          })(i2), st(i2), Ve.checkIsAddSign(i2), Ve.checkIsFirstTime(i2), (function(e3) {
            var t3 = !e3.type || "profile" !== e3.type.slice(0, 7);
            s(e3.properties) && t3 && ("$referrer" in e3.properties && (e3.properties.$referrer_host = "" === e3.properties.$referrer ? "" : W(e3.properties.$referrer, "取值异常")), Ee.preset_properties.latest_referrer && Ee.preset_properties.latest_referrer_host && (e3.properties.$latest_referrer_host = "" === e3.properties.$latest_referrer ? "" : W(e3.properties.$latest_referrer, "取值异常")));
          })(i2), (function(e3) {
            var t3 = !e3.type || "profile" !== e3.type.slice(0, 7), r3 = Ee.preset_properties && t3;
            r3 && Ee.preset_properties.url && P(e3.properties.$url) && (e3.properties.$url = ee()), r3 && Ee.preset_properties.title && P(e3.properties.$title) && (e3.properties.$title = document.title);
          })(i2), i2;
        } catch (a2) {
          return { _debug_web_msg: String(a2) };
        }
      } }, formatData: { priority: 0, entry: function(e2) {
        var t2, i2 = e2.properties;
        be(e2), s(i2) ? ((function(e3, t3) {
          s(e3) && D(e3, function(n2, i3) {
            if (C(n2)) {
              var a2 = [];
              D(n2, function(e4) {
                if (h(e4)) a2.push(e4);
                else if (P(e4)) a2.push("null");
                else try {
                  a2.push(JSON.stringify(e4));
                } catch (t4) {
                  $e("您的数据-", i3, n2, "数组里值有错误,已将其删除");
                }
              }), e3[i3] = a2;
            }
            var o2 = oe([], i3) > -1;
            if (s(n2) && "$option" !== i3 && !o2) try {
              e3[i3] = JSON.stringify(n2);
            } catch (l2) {
              delete e3[i3], $e("您的数据-", i3, n2, "数据值有错误，已将其删除");
            }
            else h(n2) || ge(n2) || J(n2) || ue(n2) || C(n2) || r(n2) || "$option" === i3 || o2 || ($e("您的数据-", i3, n2, "-格式不满足要求，我们已经将其删除"), delete e3[i3]);
          });
        })(i2), s(t2 = i2) && D(["distinct_id", "user_id", "id", "date", "datetime", "event", "events", "first_id", "original_id", "device_id", "properties", "second_id", "time", "users"], function(e3, r2) {
          e3 in t2 && (oe([], e3) > -1 || (r2 < 3 ? (delete t2[e3], $e("您的属性- " + e3 + "是保留字段，我们已经将其删除")) : $e("您的属性- " + e3 + "是保留字段，请避免其作为属性名")));
        }), (function(e3) {
          "undefined" != typeof e3.properties.$project && (e3.project = e3.properties.$project, delete e3.properties.$project), "undefined" != typeof e3.properties.$token && (e3.token = e3.properties.$token, delete e3.properties.$token);
        })(e2), (function(e3, t3) {
          D(e3, function(r2, n2) {
            -1 === oe([], n2) && Nt({ propertyKey: n2 }, function(t4, r3, i3) {
              return t4 || "keyLength" === i3 || delete e3[n2], true;
            });
          });
        })(i2), Tt(i2)) : "properties" in e2 && (e2.properties = {}), (function(e3) {
          "item_type" in e3 && Nt({ item_type: e3.item_type }, function(t3) {
            return t3 || delete e3.item_type, true;
          }), "item_id" in e3 && Nt({ item_id: e3.item_id }, function(t3, r2, n2) {
            return t3 || "string" !== n2 || delete e3.item_id, true;
          });
        })(e2);
      } }, finalAdjustData: { priority: 0, entry: function(e2, t2) {
        var r2 = t2.sensors;
        return e2._track_id = Number(String(u()).slice(2, 5) + String(u()).slice(2, 4) + String((/* @__PURE__ */ new Date()).getTime()).slice(-4)), e2._flush_time = (/* @__PURE__ */ new Date()).getTime(), r2.events.tempAdd("send", e2), e2;
      } } } };
      var Lt = {};
      function Ut(e2, t2, r2, n2) {
        var i2 = null;
        if ((e2 = e2 || {}).ele && (i2 = e2.ele), e2.event && (i2 = e2.target ? e2.target : e2.event.target), r2 = r2 || {}, !i2 || "object" != typeof i2) return false;
        if (!i2.href || /^javascript/.test(i2.href) || i2.target || i2.download || i2.onclick) return n2(t2, r2), false;
        function a2(e3) {
          e3.stopPropagation(), e3.preventDefault();
          var a3 = false;
          function o2() {
            a3 || (a3 = true, location.href = i2.href);
          }
          setTimeout(o2, 1e3), n2(t2, r2, o2);
        }
        e2.event && a2(e2.event), e2.ele && ze(e2.ele, "click", function(e3) {
          a2(e3);
        });
      }
      function Rt() {
        var e2 = location.protocol;
        return "http:" === e2 || "https:" === e2 ? e2 : "http:";
      }
      Lt.check = Nt, Lt.sendItem = function(e2) {
        var r2 = { lib: { $lib: "js", $lib_method: "code", $lib_version: String(t.lib_version) }, time: 1 * /* @__PURE__ */ new Date() };
        $(r2, e2), (function(e3) {
          Et.stage.process("formatData", e3);
        })(r2), t.kit.sendData(r2);
      }, Lt.send = function(e2, r2) {
        var n2 = t.kit.buildData(e2);
        t.kit.sendData(n2, r2);
      };
      var Bt = { stage: null, init: function(e2) {
        this.stage = e2;
      } };
      var Ht = { label: false, li: false, a: true, button: true }, Jt = { otherTags: [], initUnlimitedTags: function() {
        D(Jt.otherTags, function(e2) {
          e2 in Ht && (Ht[e2] = true);
        });
      }, isUnlimitedTag: function(e2) {
        if (!e2 || 1 !== e2.nodeType) return false;
        var r2 = e2.nodeName.toLowerCase();
        return Ht[r2] || ne(e2, t.para.heatmap.track_attr);
      }, getTargetElement: function(e2, r2) {
        var n2 = this, i2 = e2;
        if ("object" != typeof i2) return null;
        if ("string" != typeof i2.tagName) return null;
        var a2 = i2.tagName.toLowerCase();
        if ("body" === a2.toLowerCase() || "html" === a2.toLowerCase()) return null;
        if (!i2 || !i2.parentNode || !i2.parentNode.children) return null;
        var o2 = i2.parentNode, s2 = n2.otherTags;
        if ("a" === a2 || "button" === a2 || "input" === a2 || "textarea" === a2) return i2;
        if (oe(s2, a2) > -1) return i2;
        if ("area" === a2 && "map" === o2.tagName.toLowerCase() && O(o2).prev().tagName && "img" === O(o2).prev().tagName.toLowerCase()) return O(o2).prev();
        if ("div" === a2 && t.para.heatmap.collect_tags.div && n2.isDivLevelValid(i2) && ((t.para.heatmap && t.para.heatmap.collect_tags && t.para.heatmap.collect_tags.div && t.para.heatmap.collect_tags.div.max_level || 1) > 1 || n2.isCollectableDiv(i2))) return i2;
        if (n2.isStyleTag(a2) && t.para.heatmap.collect_tags.div) {
          var l2 = n2.getCollectableParent(i2);
          if (l2 && n2.isDivLevelValid(l2)) return l2;
        }
        return n2.hasElement({ event: r2 && r2.originalEvent || r2, element: e2 }, function(e3) {
          return n2.isUnlimitedTag(e3);
        }) || null;
      }, getDivLevels: function(e2, t2) {
        var r2 = Jt.getElementPath(e2, true, t2).split(" > "), n2 = 0;
        return D(r2, function(e3) {
          "div" === e3 && n2++;
        }), n2;
      }, isDivLevelValid: function(e2) {
        for (var r2 = t.para.heatmap && t.para.heatmap.collect_tags && t.para.heatmap.collect_tags.div && t.para.heatmap.collect_tags.div.max_level || 1, n2 = e2.getElementsByTagName("div"), i2 = n2.length - 1; i2 >= 0; i2--) if (Jt.getDivLevels(n2[i2], e2) > r2) return false;
        return true;
      }, getElementPath: function(e2, t2, r2) {
        for (var n2 = []; e2.parentNode && k(e2); ) {
          if (!h(e2.tagName)) return "unknown";
          if (e2.id && !t2 && /^[A-Za-z][-A-Za-z0-9_:.]*$/.test(e2.id)) {
            n2.unshift(e2.tagName.toLowerCase() + "#" + e2.id);
            break;
          }
          if (r2 && e2 === r2) {
            n2.unshift(e2.tagName.toLowerCase());
            break;
          }
          if (e2 === document.body) {
            n2.unshift("body");
            break;
          }
          n2.unshift(e2.tagName.toLowerCase()), e2 = e2.parentNode;
        }
        return n2.join(" > ");
      }, getClosestLi: function(e2) {
        return (function(e3, t2) {
          for (; e3 && e3 !== document && 1 === e3.nodeType; e3 = e3.parentNode) if (e3.tagName && h(e3.tagName) && e3.tagName.toLowerCase() === t2) return e3;
          return null;
        })(e2, "li");
      }, getElementPosition: function(e2, r2, n2) {
        var i2 = t.heatmap.getClosestLi(e2);
        if (!i2 || !k(e2) || !h(e2.tagName)) return null;
        var a2 = e2.tagName.toLowerCase(), o2 = i2.getElementsByTagName(a2), s2 = o2.length, l2 = [];
        if (s2 > 1) {
          for (var u2 = 0; u2 < s2; u2++) {
            t.heatmap.getElementPath(o2[u2], n2) === r2 && l2.push(o2[u2]);
          }
          if (l2.length > 1) return oe(l2, e2);
        }
        return (function(e3) {
          if (!e3.parentNode) return "";
          if (1 === O(e3).getSameTypeSiblings().length) return 0;
          for (var t2 = 0, r3 = e3; O(r3).previousElementSibling().ele; r3 = O(r3).previousElementSibling().ele, t2++) ;
          return t2;
        })(i2);
      }, setNotice: function(e2) {
        t.is_heatmap_render_mode = true, t.para.heatmap || (t.errorMsg = "您 SDK 没有配置开启点击图 ！"), e2 && "http:" === e2.slice(0, 5) && "https:" === location.protocol && (t.errorMsg = "您的当前页面是 https 的地址，神策分析环境也必须是 https ！"), t.para.heatmap_url || (t.para.heatmap_url = Rt() + "//static.sensorsdata.cn/sdk/" + t.lib_version + "/heatmap.min.js");
      }, getDomIndex: function(e2) {
        if (!e2.parentNode) return -1;
        for (var t2 = 0, r2 = e2.tagName, n2 = e2.parentNode.children, i2 = 0; i2 < n2.length; i2++) if (n2[i2].tagName === r2) {
          if (e2 === n2[i2]) return t2;
          t2++;
        }
        return -1;
      }, selector: function(e2, r2) {
        if (!e2 || !k(e2) || !h(e2.tagName)) return "";
        var n2 = e2.parentNode && 9 == e2.parentNode.nodeType ? -1 : this.getDomIndex(e2);
        return e2.getAttribute && e2.getAttribute("id") && /^[A-Za-z][-A-Za-z0-9_:.]*$/.test(e2.getAttribute("id")) && (!t.para.heatmap || t.para.heatmap && "not_use_id" !== t.para.heatmap.element_selector) && !r2 ? "#" + e2.getAttribute("id") : e2.tagName.toLowerCase() + (~n2 ? ":nth-of-type(" + (n2 + 1) + ")" : "");
      }, getDomSelector: function(e2, r2, n2) {
        if (!(e2 && e2.parentNode && e2.parentNode.children && h(e2.tagName))) return "unknown";
        r2 = r2 && r2.join ? r2 : [];
        var i2 = e2.nodeName.toLowerCase();
        return e2 && "body" !== i2 && 1 == e2.nodeType ? (r2.unshift(this.selector(e2, n2)), e2.getAttribute && e2.getAttribute("id") && /^[A-Za-z][-A-Za-z0-9_:.]*$/.test(e2.getAttribute("id")) && t.para.heatmap && "not_use_id" !== t.para.heatmap.element_selector && !n2 ? r2.join(" > ") : this.getDomSelector(e2.parentNode, r2, n2)) : (r2.unshift("body"), r2.join(" > "));
      }, na: function() {
        var e2 = document.documentElement.scrollLeft || window.pageXOffset;
        return parseInt(isNaN(e2) ? 0 : e2, 10);
      }, i: function() {
        var e2 = 0;
        try {
          e2 = o.documentElement && o.documentElement.scrollTop || m.pageYOffset, e2 = isNaN(e2) ? 0 : e2;
        } catch (t2) {
          e2 = 0;
        }
        return parseInt(e2, 10);
      }, getBrowserWidth: function() {
        var e2 = window.innerWidth || document.body.clientWidth;
        return isNaN(e2) ? 0 : parseInt(e2, 10);
      }, getBrowserHeight: function() {
        var e2 = window.innerHeight || document.body.clientHeight;
        return isNaN(e2) ? 0 : parseInt(e2, 10);
      }, getScrollWidth: function() {
        var e2 = parseInt(document.body.scrollWidth, 10);
        return isNaN(e2) ? 0 : e2;
      }, getEleDetail: function(e2) {
        var r2 = this.getDomSelector(e2), n2 = ct({ target: e2 });
        n2.$element_selector = r2 || "", n2.$element_path = t.heatmap.getElementPath(e2, t.para.heatmap && "not_use_id" === t.para.heatmap.element_selector);
        var i2 = t.heatmap.getElementPosition(e2, n2.$element_path, t.para.heatmap && "not_use_id" === t.para.heatmap.element_selector);
        return ge(i2) && (n2.$element_position = i2), n2;
      }, getPointerEventProp: function(e2, t2) {
        if (!e2) return {};
        function r2() {
          return { scrollLeft: document.body.scrollLeft || document.documentElement.scrollLeft || 0, scrollTop: document.body.scrollTop || document.documentElement.scrollTop || 0 };
        }
        function n2(e3) {
          if (document.documentElement.getBoundingClientRect) {
            var t3 = e3.getBoundingClientRect();
            return { targetEleX: t3.left + r2().scrollLeft || 0, targetEleY: t3.top + r2().scrollTop || 0 };
          }
        }
        function i2(e3) {
          return Number(Number(e3).toFixed(3));
        }
        return (function(e3) {
          var a2 = e3.pageX || e3.clientX + r2().scrollLeft || e3.offsetX + n2(t2).targetEleX || 0, o2 = e3.pageY || e3.clientY + r2().scrollTop || e3.offsetY + n2(t2).targetEleY || 0;
          return { $page_x: i2(a2), $page_y: i2(o2) };
        })(e2);
      }, start: function(e2, n2, i2, a2, o2) {
        if (s(t.para.heatmap) && r(t.para.heatmap.collect_element) && !t.para.heatmap.collect_element(n2)) return false;
        var l2, u2 = Jt.getBasicEleInfo(e2, n2, i2, a2, o2);
        l2 = u2, Bt.stage.process("webClickEvent", l2);
      }, getBasicEleInfo: function(e2, n2, i2, a2, o2) {
        var l2 = s(a2) ? a2 : {}, u2 = r(o2) ? o2 : r(a2) ? a2 : void 0, c2 = this.getEleDetail(n2);
        if (t.para.heatmap && t.para.heatmap.custom_property) {
          var p2 = t.para.heatmap.custom_property(n2);
          s(p2) && (c2 = $(c2, p2));
        }
        return { event: e2, target: n2, props: c2 = $(c2, this.getPointerEventProp(e2, n2), l2), tagName: i2, callback: u2 };
      }, hasElement: function(e2, t2) {
        var r2;
        if (e2.event) {
          var n2 = e2.event;
          r2 = n2.path || n2._getPath && n2._getPath();
        } else e2.element && (r2 = O(e2.element).getParents());
        if (r2 && C(r2) && r2.length > 0) {
          for (var i2 = 0; i2 < r2.length; i2++) if ("object" == typeof r2[i2] && 1 === r2[i2].nodeType && t2(r2[i2])) return r2[i2];
        }
      }, isStyleTag: function(e2, r2) {
        return !(oe(["a", "div", "input", "button", "textarea"], e2) > -1) && (!r2 || t.para.heatmap && t.para.heatmap.collect_tags && t.para.heatmap.collect_tags.div ? !!(s(t.para.heatmap) && s(t.para.heatmap.collect_tags) && s(t.para.heatmap.collect_tags.div) && C(t.para.heatmap.collect_tags.div.ignore_tags) && oe(t.para.heatmap.collect_tags.div.ignore_tags, e2) > -1) : oe(["mark", "/mark", "strong", "b", "em", "i", "u", "abbr", "ins", "del", "s", "sup"], e2) > -1);
      }, isCollectableDiv: function(e2, r2) {
        try {
          if (0 === e2.children.length) return true;
          for (var n2 = 0; n2 < e2.children.length; n2++) if (1 === e2.children[n2].nodeType) {
            var i2 = h(e2.children[n2].tagName) ? e2.children[n2].tagName.toLowerCase() : "unknown", a2 = t.para && t.para.heatmap && t.para.heatmap.collect_tags && t.para.heatmap.collect_tags.div && t.para.heatmap.collect_tags.div.max_level;
            if (!("div" === i2 && a2 > 1 || this.isStyleTag(i2, r2))) return false;
            if (!this.isCollectableDiv(e2.children[n2], r2)) return false;
          }
          return true;
        } catch (o2) {
          xe("isCollectableDiv:" + o2);
        }
        return false;
      }, getCollectableParent: function(e2, r2) {
        try {
          var n2 = e2.parentNode, i2 = n2 ? n2.tagName.toLowerCase() : "";
          if ("body" === i2) return false;
          var a2 = t.para && t.para.heatmap && t.para.heatmap.collect_tags && t.para.heatmap.collect_tags.div && t.para.heatmap.collect_tags.div.max_level;
          if (i2 && "div" === i2 && (a2 > 1 || this.isCollectableDiv(n2, r2))) return n2;
          if (n2 && this.isStyleTag(i2, r2)) return this.getCollectableParent(n2, r2);
        } catch (o2) {
          xe("getCollectableParent:" + o2);
        }
        return false;
      }, listenUrlChange: function(e2) {
        e2(), t.ee.spa.on("switch", function() {
          e2();
        });
      }, initScrollmap: function() {
        if (!s(t.para.heatmap) || "default" !== t.para.heatmap.scroll_notice_map) return false;
        var e2 = true;
        t.para.scrollmap && r(t.para.scrollmap.collect_url) && this.listenUrlChange(function() {
          e2 = !!t.para.scrollmap.collect_url();
        });
        var n2 = (function(e3) {
          var t2 = {};
          return t2.timeout = e3.timeout || 1e3, t2.func = e3.func, t2.hasInit = false, t2.inter = null, t2.main = function(e4, t3) {
            this.func(e4, t3), this.inter = null;
          }, t2.go = function(e4) {
            var r2 = {};
            this.inter || (r2.$viewport_position = document.documentElement && document.documentElement.scrollTop || window.pageYOffset || document.body.scrollTop || 0, r2.$viewport_position = Math.round(r2.$viewport_position) || 0, e4 ? t2.main(r2, true) : this.inter = setTimeout(function() {
              t2.main(r2);
            }, this.timeout));
          }, t2;
        })({ timeout: 1e3, func: function(e3, r2) {
          var n3, i2 = document.documentElement && document.documentElement.scrollTop || window.pageYOffset || document.body.scrollTop || 0, a2 = /* @__PURE__ */ new Date(), o2 = a2 - this.current_time;
          (o2 > t.para.heatmap.scroll_delay_time && i2 - e3.$viewport_position != 0 || r2) && (e3.$url = ee(), e3.$title = document.title, e3.$url_path = te(), e3.event_duration = Math.min(t.para.heatmap.scroll_event_duration, parseInt(o2) / 1e3), e3.event_duration = e3.event_duration < 0 ? 0 : e3.event_duration, n3 = e3, Bt.stage.process("webStayEvent", n3)), this.current_time = a2;
        } });
        n2.current_time = /* @__PURE__ */ new Date(), ze(window, "scroll", function() {
          if (!e2) return false;
          n2.go();
        }), ze(window, "beforeunload", function() {
          if (!e2) return false;
          n2.go("notime");
        });
      }, initHeatmap: function() {
        var e2 = this, n2 = true;
        if (!s(t.para.heatmap) || "default" !== t.para.heatmap.clickmap) return false;
        r(t.para.heatmap.collect_url) && this.listenUrlChange(function() {
          n2 = !!t.para.heatmap.collect_url();
        }), "all" === t.para.heatmap.collect_elements ? t.para.heatmap.collect_elements = "all" : t.para.heatmap.collect_elements = "interact", "all" === t.para.heatmap.collect_elements ? ze(document, "click", function(t2) {
          if (!n2) return false;
          var r2 = t2 || window.event;
          if (!r2) return false;
          var i2 = r2.target || r2.srcElement;
          if ("object" != typeof i2) return false;
          if ("string" != typeof i2.tagName) return false;
          var a2 = i2.tagName.toLowerCase();
          if ("body" === a2 || "html" === a2) return false;
          if (!i2 || !i2.parentNode || !i2.parentNode.children) return false;
          var o2 = h(i2.parentNode.tagName) ? i2.parentNode.tagName.toLowerCase() : "unknown";
          "a" === o2 || "button" === o2 ? e2.start(r2, i2.parentNode, o2) : e2.start(r2, i2, a2);
        }) : ze(document, "click", function(r2) {
          if (!n2) return false;
          var i2 = r2 || window.event;
          if (!i2) return false;
          var a2 = i2.target || i2.srcElement, o2 = t.heatmap.getTargetElement(a2, r2);
          if (!k(o2) && !h(a2.tagName)) return false;
          k(o2) && h(o2.tagName) ? e2.start(i2, o2, o2.tagName.toLowerCase()) : k(a2) && "div" === a2.tagName.toLowerCase() && s(t.para.heatmap) && t.para.heatmap.get_vtrack_config && Dt.events.length > 0 && Dt.isTargetEle(a2) && e2.start(i2, a2, a2.tagName.toLowerCase(), { $lib_method: "vtrack" });
        });
      } };
      function Mt() {
        var e2 = it.campaignParams(), r2 = {};
        return D(e2, function(e3, n2, i2) {
          -1 !== (" " + t.source_channel_standard + " ").indexOf(" " + n2 + " ") ? r2["$" + n2] = i2[n2] : r2[n2] = i2[n2];
        }), r2;
      }
      function qt(e2, r2, n2) {
        if (t.is_first_visitor && n2) {
          var i2 = {};
          t.para.preset_properties.search_keyword_baidu && et(document.referrer) && Xe() && (i2.$search_keyword_id = Ze.id(), i2.$search_keyword_id_type = Ze.type(), i2.$search_keyword_id_hash = ae(i2.$search_keyword_id));
          var a2 = document.characterSet || document.charset, o2 = Qe(null, r2);
          e2($({ $first_visit_time: /* @__PURE__ */ new Date(), $first_referrer: o2, $first_referrer_host: o2 ? W(o2, "取值异常") : "", $first_browser_language: h(navigator.language) ? navigator.language.toLowerCase() : "取值异常", $first_browser_charset: h(a2) ? a2.toUpperCase() : "取值异常", $first_traffic_source_type: at(), $first_search_keyword: tt(), $timezone_offset: (/* @__PURE__ */ new Date()).getTimezoneOffset() }, Mt(), i2)), t.is_first_visitor = false;
        }
      }
      var Ft = { autoTrackIsUsed: false, isReady: function(e2) {
        r(e2) ? e2() : t.log("error: isReady callback must be function");
      }, getUtm: function() {
        return it.campaignParams();
      }, getStayTime: function() {
        return (/* @__PURE__ */ new Date() - t._t) / 1e3;
      }, setProfileLocal: function(e2) {
        if (!a.isSupport()) return t.setProfile(e2), false;
        if (!s(e2) || ce(e2)) return false;
        var r2 = Pt.readObjectVal("sensorsdata_2015_jssdk_profile"), n2 = false;
        if (s(r2) && !ce(r2)) {
          for (var i2 in e2) !(i2 in r2 && r2[i2] !== e2[i2]) && i2 in r2 || (r2[i2] = e2[i2], n2 = true);
          n2 && (Pt.saveObjectVal("sensorsdata_2015_jssdk_profile", r2), t.setProfile(e2));
        } else Pt.saveObjectVal("sensorsdata_2015_jssdk_profile", e2), t.setProfile(e2);
      }, setInitReferrer: function() {
        var e2 = Qe();
        t.setOnceProfile({ _init_referrer: e2, _init_referrer_host: it.pageProp.referrer_host });
      }, setSessionReferrer: function() {
        var e2 = Qe();
        Pt.setSessionPropsOnce({ _session_referrer: e2, _session_referrer_host: it.pageProp.referrer_host });
      }, setDefaultAttr: function() {
        it.register({ _current_url: location.href, _referrer: Qe(), _referring_host: it.pageProp.referrer_host });
      }, trackHeatMap: function(e2, r2, n2) {
        if ("object" == typeof e2 && e2.tagName && k(e2.parentNode)) {
          var i2 = e2.tagName.toLowerCase(), a2 = e2.parentNode.tagName.toLowerCase(), o2 = t.para.heatmap && t.para.heatmap.track_attr ? t.para.heatmap.track_attr : ["data-sensors-click"];
          "button" === i2 || "a" === i2 || "a" === a2 || "button" === a2 || "input" === i2 || "textarea" === i2 || ne(e2, o2) || Jt.start(null, e2, i2, r2, n2);
        }
      }, trackAllHeatMap: function(e2, t2, r2) {
        if ("object" == typeof e2 && e2.tagName) {
          var n2 = e2.tagName.toLowerCase();
          Jt.start(null, e2, n2, t2, r2);
        }
      }, autoTrackSinglePage: function(e2, r2) {
        var n2;
        n2 = this.autoTrackIsUsed ? it.pageProp.url : it.pageProp.referrer;
        var i2 = !(e2 = s(e2) ? e2 : {}).not_set_profile;
        function a2(e3, r3) {
          t.track("$pageview", $({ $referrer: n2, $url: ee(), $url_path: te(), $title: document.title }, e3, Mt()), r3), n2 = ee();
        }
        e2.not_set_profile && delete e2.not_set_profile, a2(e2, r2), this.autoTrackSinglePage = a2, qt(t.setOnceProfile, false, i2);
      }, autoTrackWithoutProfile: function(e2, t2) {
        e2 = s(e2) ? e2 : {}, this.autoTrack($(e2, { not_set_profile: true }), t2);
      }, autoTrack: function(e2, r2) {
        e2 = s(e2) ? e2 : {};
        var n2 = Mt(), i2 = !e2.not_set_profile;
        e2.not_set_profile && delete e2.not_set_profile;
        var a2 = location.href;
        t.para.is_single_page && I(function() {
          var i3 = Qe(a2, true);
          t.track("$pageview", $({ $referrer: i3, $url: ee(), $url_path: te(), $title: document.title }, n2, e2), r2), a2 = ee();
        }), t.track("$pageview", $({ $referrer: Qe(null, true), $url: ee(), $url_path: te(), $title: document.title }, n2, e2), r2), qt(t.setOnceProfile, true, i2), this.autoTrackIsUsed = true;
      }, getAnonymousID: function() {
        return ce(Pt._state) ? "SDK is not initialized." : Pt.getAnonymousId();
      }, setPlugin: function(e2) {
        if (!s(e2)) return false;
        D(e2, function(e3, n2) {
          r(e3) && (s(window.SensorsDataWebJSSDKPlugin) && window.SensorsDataWebJSSDKPlugin[n2] ? e3(window.SensorsDataWebJSSDKPlugin[n2]) : s(t.modules) && t.modules[n2] ? e3(t.modules[n2]) : $e(n2 + "is not found,please check sensorsdata documents."));
        });
      }, useModulePlugin: function() {
        t.use.apply(t, arguments);
      }, useAppPlugin: function() {
        this.setPlugin.apply(this, arguments);
      } };
      function Kt(e2, t2) {
        var r2 = e2.id, n2 = e2.callback, i2 = e2.name, a2 = Pt.getFirstId(), o2 = Pt.getOriginDistinctId();
        if (!Nt({ distinct_id: r2 })) return xe("login id is invalid"), false;
        if (r2 === Pt.getOriginDistinctId() && !a2) return xe("login id is equal to distinct_id"), false;
        if (s(Pt._state.identities) && Pt._state.identities.hasOwnProperty(i2) && r2 === Pt._state.first_id) return false;
        if (Pt._state.history_login_id.name !== i2 || r2 !== Pt._state.history_login_id.value) {
          Pt._state.identities[i2] = r2, Pt.set("history_login_id", { name: i2, value: r2 }), a2 || Pt.set("first_id", o2), t2(r2, "$SignUp", {}, n2);
          var l2 = { $identity_cookie_id: Pt._state.identities.$identity_cookie_id };
          return l2[i2] = r2, Vt(l2), true;
        }
        return false;
      }
      function Vt(e2) {
        var t2 = {};
        for (var r2 in e2) t2[r2] = e2[r2];
        Pt._state.identities = t2, Pt.save();
      }
      var zt = 1;
      function Wt(e2, n2) {
        if (h(e2) || s(e2)) {
          var i2;
          if (s(e2)) {
            var a2 = t.modules && t.modules[e2.plugin_name];
            a2 && a2 !== e2 && $e(e2.name + " is conflict with builtin plugin, and sdk uses builtin plugin."), i2 = a2 || e2;
          }
          return h(e2) && (s(t.modules) && s(t.modules[e2]) ? i2 = t.modules[e2] : s(window.SensorsDataWebJSSDKPlugin) && s(window.SensorsDataWebJSSDKPlugin[e2]) ? i2 = window.SensorsDataWebJSSDKPlugin[e2] : window.sensorsDataAnalytic201505 && window.sensorsDataAnalytic201505.modules[e2] && (i2 = window.sensorsDataAnalytic201505.modules[e2])), i2 && r(i2.init) ? i2.plugin_is_init ? i2 : (i2.plugin_name || $e("warning: invalid plugin, plugin_name required."), i2.plugin_version ? i2.plugin_version !== t.lib_version && $e("warning: plugin version not match SDK version. plugin may not work correctly. ") : $e("warning: invalid plugin, plugin version required."), !i2.plugin_is_init && i2.init(t, n2), i2.plugin_is_init = true, t.modules = t.modules || {}, t.modules[i2.plugin_name || "unnamed_" + zt++] = i2, i2) : ($e((e2.plugin_name || e2) + " is not found or it's not a standard plugin. Please check sensorsdata official documents."), i2);
        }
        xe("use's first arguments must be string or object.");
      }
      function Xt(e2, t2, r2, n2) {
        var i2 = Pt.getFirstId() || Pt.getDistinctId();
        Pt.set("distinct_id", e2), Lt.send({ original_id: i2, distinct_id: Pt.getDistinctId(), type: "track_signup", event: t2, properties: r2 }, n2);
      }
      function Zt(e2) {
        Nt({ properties: e2 }) ? Pt.setProps(e2) : xe("register输入的参数有误");
      }
      function Yt(e2, t2) {
        "number" == typeof e2 && (e2 = String(e2)), !Kt({ id: e2, callback: t2, name: He.LOGIN }, Xt) && r(t2) && t2();
      }
      var Gt = { __proto__: null, setInitVar: function() {
        t._t = t._t || 1 * /* @__PURE__ */ new Date(), t.is_first_visitor = false, t.source_channel_standard = Ue;
      }, initPara: function(e2) {
        $(Ee, e2 || t.para || {}), t.para = Ee;
        var r2, n2 = {};
        if (s(t.para.is_track_latest)) for (var i2 in t.para.is_track_latest) n2["latest_" + i2] = t.para.is_track_latest[i2];
        for (r2 in t.para.preset_properties = $({}, Le.preset_properties, n2, t.para.preset_properties || {}), Le) void 0 === t.para[r2] && (t.para[r2] = Le[r2]);
        "string" != typeof t.para.web_url || "://" !== t.para.web_url.slice(0, 3) && "//" !== t.para.web_url.slice(0, 2) || ("://" === t.para.web_url.slice(0, 3) ? t.para.web_url = location.protocol.slice(0, -1) + t.para.web_url : t.para.web_url = location.protocol + t.para.web_url), nt.protocol.serverUrl(), t.bridge && t.bridge.initPara();
        var a2 = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"], o2 = ["www.baidu.", "m.baidu.", "m.sm.cn", "so.com", "sogou.com", "youdao.com", "google.", "yahoo.com/", "bing.com/", "ask.com/"], l2 = ["weibo.com", "renren.com", "kaixin001.com", "douban.com", "qzone.qq.com", "zhihu.com", "tieba.baidu.com", "weixin.qq.com"], u2 = { baidu: ["wd", "word", "kw", "keyword"], google: "q", bing: "q", yahoo: "p", sogou: ["query", "keyword"], so: "q", sm: "q" };
        "object" == typeof t.para.source_type && (t.para.source_type.utm = C(t.para.source_type.utm) ? t.para.source_type.utm.concat(a2) : a2, t.para.source_type.search = C(t.para.source_type.search) ? t.para.source_type.search.concat(o2) : o2, t.para.source_type.social = C(t.para.source_type.social) ? t.para.source_type.social.concat(l2) : l2, t.para.source_type.keyword = s(t.para.source_type.keyword) ? $(u2, t.para.source_type.keyword) : u2);
        var c2 = ["mark", "/mark", "strong", "b", "em", "i", "u", "abbr", "ins", "del", "s", "sup"];
        if (t.para.heatmap && !s(t.para.heatmap) && (t.para.heatmap = {}), s(t.para.heatmap)) {
          t.para.heatmap.clickmap = t.para.heatmap.clickmap || "default", t.para.heatmap.scroll_notice_map = t.para.heatmap.scroll_notice_map || "default", t.para.heatmap.scroll_delay_time = t.para.heatmap.scroll_delay_time || 4e3, t.para.heatmap.scroll_event_duration = t.para.heatmap.scroll_event_duration || 18e3, t.para.heatmap.renderRefreshTime = t.para.heatmap.renderRefreshTime || 1e3, t.para.heatmap.loadTimeout = t.para.heatmap.loadTimeout || 1e3, t.para.heatmap.request_timeout = t.para.heatmap.request_timeout || 1e4, true !== t.para.heatmap.get_vtrack_config && (t.para.heatmap.get_vtrack_config = false);
          var p2 = C(t.para.heatmap.track_attr) ? F(t.para.heatmap.track_attr, function(e3) {
            return e3 && "string" == typeof e3;
          }) : [];
          p2.push("data-sensors-click"), t.para.heatmap.track_attr = p2, s(t.para.heatmap.collect_tags) ? true === t.para.heatmap.collect_tags.div ? t.para.heatmap.collect_tags.div = { ignore_tags: c2, max_level: 1 } : s(t.para.heatmap.collect_tags.div) ? (t.para.heatmap.collect_tags.div.ignore_tags ? C(t.para.heatmap.collect_tags.div.ignore_tags) || ($e("ignore_tags 参数必须是数组格式"), t.para.heatmap.collect_tags.div.ignore_tags = c2) : t.para.heatmap.collect_tags.div.ignore_tags = c2, t.para.heatmap.collect_tags.div.max_level && -1 === oe([1, 2, 3], t.para.heatmap.collect_tags.div.max_level) && (t.para.heatmap.collect_tags.div.max_level = 1)) : t.para.heatmap.collect_tags.div = false : t.para.heatmap.collect_tags = { div: false };
        }
        t.para.server_url = ft(t.para.server_url, t.para.custom_server_url), true === t.para.noCache ? t.para.noCache = "?" + (/* @__PURE__ */ new Date()).getTime() : t.para.noCache = "", t.para.callback_timeout > t.para.datasend_timeout && (t.para.datasend_timeout = t.para.callback_timeout), t.para.heatmap && t.para.heatmap.collect_tags && s(t.para.heatmap.collect_tags) && D(t.para.heatmap.collect_tags, function(e3, r3) {
          "div" !== r3 && e3 && t.heatmap.otherTags.push(r3);
        }), t.para.heatmap && "default" === t.para.heatmap.clickmap && t.heatmap.initUnlimitedTags();
      }, quick: function() {
        var e2 = Array.prototype.slice.call(arguments), r2 = e2[0], n2 = e2.slice(1);
        if ("string" == typeof r2 && Ft[r2]) return Ft[r2].apply(Ft, n2);
        "function" == typeof r2 ? r2.apply(t, n2) : $e("quick方法中没有这个功能" + e2[0]);
      }, use: Wt, track: function(e2, t2, r2) {
        Nt({ event: e2, properties: t2 }) && Lt.send({ type: "track", event: e2, properties: t2 }, r2);
      }, bind: function(e2, t2) {
        if (!Nt({ bindKey: e2, bindValue: t2 })) return false;
        Pt._state.identities[e2] = t2, Pt.save(), Lt.send({ type: "track_id_bind", event: "$BindID", properties: {} });
      }, unbind: function(e2, t2) {
        var r2 = (function(e3, t3) {
          if (!Nt({ unbindKey: e3, bindValue: t3 })) return false;
          if (s(Pt._state.identities) && Pt._state.identities.hasOwnProperty(e3) && Pt._state.identities[e3] === t3) {
            var r3 = Pt.getUnionId().login_id;
            r3 && e3 + "+" + t3 === r3 && (Pt._state.distinct_id = Pt._state.first_id, Pt._state.first_id = "", Pt.set("history_login_id", { name: "", value: "" })), "$identity_cookie_id" !== e3 && (delete Pt._state.identities[e3], Pt.save());
          }
          var n2 = {};
          return n2[e3] = t3, n2;
        })(e2, t2);
        r2 && Lt.send({ identities: r2, type: "track_id_unbind", event: "$UnbindID", properties: {} });
      }, trackLink: function(e2, r2, n2) {
        "object" == typeof e2 && e2.tagName ? Ut({ ele: e2 }, r2, n2, t.track) : "object" == typeof e2 && e2.target && e2.event && Ut(e2, r2, n2, t.track);
      }, trackLinks: function(e2, r2, n2) {
        return n2 = n2 || {}, !(!e2 || "object" != typeof e2) && !(!e2.href || /^javascript/.test(e2.href) || e2.target) && void ze(e2, "click", function(i2) {
          i2.preventDefault();
          var a2 = false;
          function o2() {
            a2 || (a2 = true, location.href = e2.href);
          }
          setTimeout(o2, 1e3), t.track(r2, n2, o2);
        });
      }, setItem: function(e2, t2, r2) {
        Nt({ item_type: e2, item_id: t2, properties: r2 }) && Lt.sendItem({ type: "item_set", item_type: e2, item_id: t2, properties: r2 || {} });
      }, deleteItem: function(e2, t2) {
        Nt({ item_type: e2, item_id: t2 }) && Lt.sendItem({ type: "item_delete", item_type: e2, item_id: t2 });
      }, setProfile: function(e2, t2) {
        Nt({ propertiesMust: e2 }) && Lt.send({ type: "profile_set", properties: e2 }, t2);
      }, setOnceProfile: function(e2, t2) {
        Nt({ propertiesMust: e2 }) && Lt.send({ type: "profile_set_once", properties: e2 }, t2);
      }, appendProfile: function(e2, t2) {
        Nt({ propertiesMust: e2 }) && (D(e2, function(t3, r2) {
          h(t3) && Ne(r2) ? e2[r2] = [t3] : C(t3) && Ne(r2) ? e2[r2] = t3 : (delete e2[r2], $e("appendProfile属性的值必须是字符串或者数组"));
        }), ce(e2) || Lt.send({ type: "profile_append", properties: e2 }, t2));
      }, incrementProfile: function(e2, t2) {
        var r2 = e2;
        h(e2) && ((e2 = {})[r2] = 1), Nt({ propertiesMust: e2 }) && ((function(e3) {
          for (var t3 in e3) if (Object.prototype.hasOwnProperty.call(e3, t3) && !/-*\d+/.test(String(e3[t3]))) return false;
          return true;
        })(e2) ? Lt.send({ type: "profile_increment", properties: e2 }, t2) : xe("profile_increment的值只能是数字"));
      }, deleteProfile: function(e2) {
        Lt.send({ type: "profile_delete" }, e2), Pt.set("distinct_id", S()), Pt.set("first_id", "");
      }, unsetProfile: function(e2, t2) {
        var r2 = e2, n2 = {};
        h(e2) && (e2 = []).push(r2), C(e2) ? (D(e2, function(e3) {
          h(e3) ? n2[e3] = true : $e("profile_unset给的数组里面的值必须时string,已经过滤掉", e3);
        }), Lt.send({ type: "profile_unset", properties: n2 }, t2)) : xe("profile_unset的参数必须是数组");
      }, identify: function(e2) {
        "number" == typeof e2 && (e2 = String(e2));
        var t2 = Pt.getFirstId();
        if (void 0 === e2) {
          var r2 = S();
          t2 ? Pt.set("first_id", r2) : Pt.set("distinct_id", r2);
        } else Nt({ distinct_id: e2 }) && (t2 ? Pt.set("first_id", e2) : Pt.set("distinct_id", e2));
      }, resetAnonymousIdentity: function(e2) {
        if (Pt.getFirstId()) return xe("resetAnonymousIdentity must be used in a logout state ！"), false;
        if ("number" == typeof e2 && (e2 = String(e2)), void 0 === e2) {
          var t2 = S();
          Pt._state.identities.$identity_cookie_id = t2, Pt.set("distinct_id", t2);
        } else Nt({ distinct_id: e2 }) && (Pt._state.identities.$identity_cookie_id = e2, Pt.set("distinct_id", e2));
      }, trackSignup: function(e2, t2, r2, n2) {
        "number" == typeof e2 && (e2 = String(e2)), Nt({ distinct_id: e2, event: t2, properties: r2 }) && Xt(e2, t2, r2, n2);
      }, registerPage: function(e2) {
        Nt({ properties: e2 }) ? $(it.currentProps, e2) : xe("register输入的参数有误");
      }, clearAllRegister: function(e2) {
        Pt.clearAllProps(e2);
      }, clearPageRegister: function(e2) {
        var t2;
        if (C(e2) && e2.length > 0) for (t2 = 0; t2 < e2.length; t2++) h(e2[t2]) && e2[t2] in it.currentProps && delete it.currentProps[e2[t2]];
        else if (true === e2) for (t2 in it.currentProps) delete it.currentProps[t2];
      }, register: Zt, registerOnce: function(e2) {
        Nt({ properties: e2 }) ? Pt.setPropsOnce(e2) : xe("registerOnce输入的参数有误");
      }, registerSession: function(e2) {
        t.log("registerSession 方法已经弃用，有问题联系技术顾问"), Nt({ properties: e2 }) ? Pt.setSessionProps(e2) : xe("registerSession输入的参数有误");
      }, registerSessionOnce: function(e2) {
        t.log("registerSessionOnce 方法已经弃用，有问题联系技术顾问"), Nt({ properties: e2 }) ? Pt.setSessionPropsOnce(e2) : xe("registerSessionOnce输入的参数有误");
      }, login: Yt, loginWithKey: function(e2, t2) {
        return $e("loginWithKey is deprecated !!!"), "number" == typeof t2 && (t2 = String(t2)), "number" == typeof e2 && (e2 = String(e2)), !!Nt({ loginIdKey: e2 }) && (He.LOGIN === e2 ? (Yt(t2), false) : void Kt({ id: t2, callback: null, name: e2 }, Xt));
      }, logout: function(e2) {
        var t2 = Pt.getFirstId();
        if (t2) if (Pt.set("first_id", ""), true === e2) {
          var r2 = S();
          Pt.set("distinct_id", r2);
        } else Pt.set("distinct_id", t2);
        Vt({ $identity_cookie_id: Pt._state.identities.$identity_cookie_id }), Pt.set("history_login_id", { name: "", value: "" });
      }, getPresetProperties: function() {
        var e2, r2, n2 = { $is_first_day: Fe(), $is_first_time: Ve.is_page_first_visited, $referrer: it.pageProp.referrer || "", $referrer_host: it.pageProp.referrer ? W(it.pageProp.referrer) : "", $url: ee(), $url_path: te(), $title: document.title || "", _distinct_id: Pt.getDistinctId(), identities: Pt.getIdentities() }, i2 = $({}, it.properties(), Pt.getProps(), (e2 = it.campaignParams(), r2 = {}, D(e2, function(e3, n3, i3) {
          -1 !== (" " + t.source_channel_standard + " ").indexOf(" " + n3 + " ") ? r2["$" + n3] = i3[n3] : r2[n3] = i3[n3];
        }), r2), n2);
        return t.para.preset_properties.latest_referrer && t.para.preset_properties.latest_referrer_host && (i2.$latest_referrer_host = "" === i2.$latest_referrer ? "" : W(i2.$latest_referrer)), i2;
      }, readyState: { state: 0, historyState: [], stateType: { 1: "1-init未开始", 2: "2-init开始", 3: "3-store完成" }, getState: function() {
        return this.historyState.join("\n");
      }, setState: function(e2) {
        String(e2) in this.stateType && (this.state = e2), this.historyState.push(this.stateType[e2]);
      } }, debug: nt, on: mt, log: De };
      i.setup(De);
      var Qt = $({}, Te, St);
      var er = { bridge_info: { touch_app_bridge: false, verify_success: false, platform: "", support_two_way_call: false }, is_verify_success: false, initPara: function() {
        var e2 = { is_send: false !== t.para.use_app_track_is_send && "only" !== t.para.use_app_track, white_list: [], is_mui: "mui" === t.para.use_app_track };
        "object" == typeof t.para.app_js_bridge ? t.para.app_js_bridge = $({}, e2, t.para.app_js_bridge) : true !== t.para.use_app_track && true !== t.para.app_js_bridge && "only" !== t.para.use_app_track && "mui" !== t.para.use_app_track || (t.para.app_js_bridge = $({}, e2)), false === t.para.app_js_bridge.is_send && $e("设置了 is_send:false,如果打通失败，数据将被丢弃!");
      }, app_js_bridge_v1: function() {
        var e2 = null, r2 = null;
        window.sensorsdata_app_js_bridge_call_js = function(t2) {
          !(function(t3) {
            fe(e2 = t3) && (e2 = JSON.parse(e2)), r2 && (r2(e2), r2 = null, e2 = null);
          })(t2);
        }, t.getAppStatus = function(t2) {
          if ((function() {
            if (/iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream) {
              var e3 = document.createElement("iframe");
              e3.setAttribute("src", "sensorsanalytics://getAppInfo"), document.documentElement.appendChild(e3), e3.parentNode.removeChild(e3), e3 = null;
            }
          })(), "object" == typeof window.SensorsData_APP_JS_Bridge && window.SensorsData_APP_JS_Bridge.sensorsdata_call_app && fe(e2 = window.SensorsData_APP_JS_Bridge.sensorsdata_call_app()) && (e2 = JSON.parse(e2)), !t2) return e2;
          null === e2 ? r2 = t2 : (t2(e2), e2 = null);
        };
      }, hasVisualModeBridge: function() {
        var e2 = window.SensorsData_App_Visual_Bridge, t2 = "sensorsdata_visualized_mode";
        return s(e2) && e2[t2] && (true === e2[t2] || e2[t2]());
      }, validateAppUrl: function(e2) {
        function r2(e3) {
          var t2 = { hostname: "", project: "" };
          try {
            e3 = b(e3), t2.hostname = e3.hostname, t2.project = e3.searchParams.get("project") || "default";
          } catch (r3) {
            xe("validateAppUrl:" + r3);
          }
          return t2;
        }
        var n2 = r2(e2), i2 = r2(t.para.server_url);
        if (n2.hostname === i2.hostname && n2.project === i2.project) return true;
        if (C(t.para.app_js_bridge.white_list)) for (var a2 = 0; a2 < t.para.app_js_bridge.white_list.length; a2++) {
          var o2 = r2(t.para.app_js_bridge.white_list[a2]);
          if (o2.hostname === n2.hostname && o2.project === n2.project) return true;
        }
        return false;
      } };
      function tr(e2) {
        var t2 = this;
        this.type = e2, this.resultCbs = {}, this.timeoutCbs = {}, this.timerId = null, this.appCallJsCallback = null, window.sensorsdata_app_call_js || (window.sensorsdata_app_call_js = function(e3, t3) {
          if (e3 in window.sensorsdata_app_call_js.modules) return window.sensorsdata_app_call_js.modules[e3](t3);
        }), window.sensorsdata_app_call_js.modules = window.sensorsdata_app_call_js.modules || {}, window.sensorsdata_app_call_js.modules[this.type] = function(e3) {
          try {
            var r2 = L(e3) || e3;
            try {
              r2 = JSON.parse(r2);
            } catch (a2) {
            }
            var n2 = r2 && r2.message_id;
            if (n2 && t2.resultCbs[n2]) {
              if (e3 = r2, t2.timeoutCbs[n2] && t2.timeoutCbs[n2].isTimeout) return void (t2.resultCbs[n2].callbacks.length = 0);
              if (t2.resultCbs[n2]) for (var i2 in t2.resultCbs[n2].result = e3, clearTimeout(t2.timerId), t2.timeoutCbs[n2].callbacks.length = 0, t2.resultCbs[n2].callbacks) t2.resultCbs[n2].callbacks[i2].call(null, e3), t2.resultCbs[n2].callbacks.splice(i2, 1);
              return;
            }
            return t2.appCallJsCallback && t2.appCallJsCallback.call(null, e3);
          } catch (o2) {
            xe("app 回调 js 异常", e3);
          }
        };
      }
      function rr(e2) {
        try {
          if (t.bridge.activeBridge && r(t.bridge.activeBridge.handleCommand)) return t.bridge.activeBridge.handleCommand(e2);
        } catch (n2) {
          xe("Error: handle command exception:" + n2);
        }
        return xe("数据发往App失败，App没有暴露bridge,type:" + e2.callType), false;
      }
      function nr(e2) {
        this.bridge = new tr(e2.type);
      }
      function ir(e2) {
        var t2 = null;
        try {
          var r2 = JSON.parse(window.name);
          t2 = r2[e2] ? g(r2[e2]) : null;
        } catch (n2) {
          t2 = null;
        }
        return null === t2 && (t2 = Z(location.href, e2) || null), t2;
      }
      tr.prototype.call = function(e2, t2) {
        var r2 = this, n2 = (/* @__PURE__ */ new Date()).getTime().toString(16) + String(u()).replace(".", "").slice(1, 8);
        this.resultCbs[n2] = r2.resultCbs[n2] || { result: null, callbacks: [] }, this.timeoutCbs[n2] = r2.timeoutCbs[n2] || { isTimeout: false, callbacks: [] }, (e2 = e2.data ? e2 : { data: e2 }).data.message_id = n2;
        var i2 = $({ callType: this.type }, e2);
        return t2 && (this.timerId = setTimeout(function() {
          for (var e3 in r2.timeoutCbs[n2].isTimeout = true, r2.timeoutCbs[n2].callbacks) r2.timeoutCbs[n2].callbacks[e3].call(null), r2.timeoutCbs[n2].callbacks.splice(e3, 1);
        }, t2)), rr(i2), { onResult: function(e3) {
          return r2.resultCbs[n2].result ? (e3(r2.resultCbs[n2].result), this) : (!r2.timeoutCbs[n2].isTimeout && r2.resultCbs[n2].callbacks.push(e3), this);
        }, onTimeout: function(e3) {
          return r2.timeoutCbs[n2].isTimeout ? (e3(), this) : (!r2.resultCbs[n2].result && r2.timeoutCbs[n2].callbacks.push(e3), this);
        } };
      }, tr.prototype.onAppNotify = function(e2) {
        this.appCallJsCallback = e2;
      }, tr.prototype.notifyApp = function(e2, t2) {
        var r2 = $({ callType: this.type }, e2);
        return t2 && (r2.message_id = t2), rr(r2);
      }, nr.prototype = { double: function() {
      }, getAppData: function() {
      }, hasAppBridge: function() {
        return t.bridge.bridge_info.support_two_way_call;
      }, init: function() {
      }, jsCallApp: function() {
      }, requestToApp: function(e2) {
        this.bridge.call(e2, e2.timeout.time).onResult(function(t2) {
          r(e2.callback) && e2.callback(t2);
        }).onTimeout(function() {
          r(e2.timeout.callback) && e2.timeout.callback();
        });
      } };
      var ar = { isSeachHasKeyword: function() {
        return "" !== Z(location.href, "sa-request-id") && ("string" == typeof sessionStorage.getItem("sensors-visual-mode") && sessionStorage.removeItem("sensors-visual-mode"), true);
      }, hasKeywordHandle: function() {
        var e2 = location.href, t2 = Z(e2, "sa-request-id") || null, r2 = Z(e2, "sa-request-type") || null, n2 = Z(e2, "sa-request-url") || null;
        if (Jt.setNotice(n2), we.isSupport()) if (null !== n2 && sessionStorage.setItem("sensors_heatmap_url", n2), sessionStorage.setItem("sensors_heatmap_id", t2), null !== r2) "1" === r2 || "2" === r2 || "3" === r2 ? sessionStorage.setItem("sensors_heatmap_type", r2) : r2 = null;
        else {
          var i2 = sessionStorage.getItem("sensors_heatmap_type");
          r2 = null !== i2 ? i2 : null;
        }
        this.isReady(t2, r2);
      }, isReady: function(e2, r2, n2) {
        t.para.heatmap_url && t.para.heatmap ? me({ success: function() {
          setTimeout(function() {
            "undefined" != typeof sa_jssdk_heatmap_render && (sa_jssdk_heatmap_render(t, e2, r2, n2), "object" == typeof console && "function" == typeof console.log && (t.heatmap_version && t.heatmap_version === t.lib_version || $e("heatmap.js与sensorsdata.js版本号不一致，可能存在风险!")));
          }, 0);
        }, error: function() {
        }, type: "js", url: t.para.heatmap_url }) : $e("没有配置 heatmap 开启点击图，或者没有指定 heatmap_url 的路径");
      }, isStorageHasKeyword: function() {
        return we.isSupport() && "string" == typeof sessionStorage.getItem("sensors_heatmap_id");
      }, storageHasKeywordHandle: function() {
        Jt.setNotice(), ar.isReady(sessionStorage.getItem("sensors_heatmap_id"), sessionStorage.getItem("sensors_heatmap_type"), location.href);
      }, isWindowNameHasKeyword: function() {
        try {
          var e2 = JSON.parse(window.name), t2 = h(e2["sa-heatmap-src"]) ? g(e2["sa-heatmap-src"]) : null;
          return e2["sa-request-id"] && h(e2["sa-request-id"]) && t2 === location.href;
        } catch (r2) {
          return false;
        }
      }, windowNameHasKeywordHandle: function() {
        var e2 = JSON.parse(window.name);
        function t2(t3) {
          var r3 = e2[t3];
          return h(r3) ? g(r3) : null;
        }
        var r2 = t2("sa-request-id"), n2 = t2("sa-request-type"), i2 = t2("sa-request-url"), o2 = t2("sa-request-language");
        Jt.setNotice(i2), a.isSupport() && h(o2) && a.set("web_sdk_heatmap_language", o2), we.isSupport() && (null !== i2 && sessionStorage.setItem("sensors_heatmap_url", i2), sessionStorage.setItem("sensors_heatmap_id", r2), null !== n2 ? "1" === n2 || "2" === n2 || "3" === n2 ? sessionStorage.setItem("sensors_heatmap_type", n2) : n2 = null : n2 = null !== sessionStorage.getItem("sensors_heatmap_type") ? sessionStorage.getItem("sensors_heatmap_type") : null), ar.isReady(r2, n2);
      } }, or = { isStorageHasKeyword: function() {
        return we.isSupport() && "string" == typeof sessionStorage.getItem("sensors-visual-mode");
      }, isSearchHasKeyword: function() {
        return (true === ir("sa-visual-mode") || "true" === ir("sa-visual-mode")) && ("string" == typeof sessionStorage.getItem("sensors_heatmap_id") && sessionStorage.removeItem("sensors_heatmap_id"), true);
      }, loadVtrack: function() {
        me({ success: function() {
        }, error: function() {
        }, type: "js", url: t.para.vtrack_url ? t.para.vtrack_url : Rt() + "//static.sensorsdata.cn/sdk/" + t.lib_version + "/vtrack.min.js" });
      }, messageListener: function(e2) {
        if (!e2 || !e2.data || "sa-fe" !== e2.data.source) return false;
        if ("v-track-mode" === e2.data.type) {
          if (e2.data.data && e2.data.data.isVtrack) if (we.isSupport() && sessionStorage.setItem("sensors-visual-mode", "true"), e2.data.data.userURL && location.href.match(/sa-visual-mode=true/)) {
            var t2 = e2.data.data.userURL;
            h(t2) && (je(t2, "http://") || je(t2, "https://")) && (window.location.href = encodeURI(t2), setTimeout(function() {
              window.location.reload(true);
            }, 1e3));
          } else or.loadVtrack();
          window.removeEventListener("message", or.messageListener, false);
        }
      }, removeMessageHandle: function() {
        window.removeEventListener && window.removeEventListener("message", or.messageListener, false);
      }, verifyVtrackMode: function() {
        window.addEventListener && window.addEventListener("message", or.messageListener, false), or.postMessage();
      }, postMessage: function() {
        try {
          window.parent && window.parent.postMessage && window.parent.postMessage({ source: "sa-web-sdk", type: "v-is-vtrack", data: { sdkversion: Re } }, "*");
        } catch (e2) {
          xe("浏览器版本过低，不支持 postMessage API");
        }
      }, notifyUser: function() {
        var e2 = function(t2) {
          if (!t2 || !t2.data || "sa-fe" !== t2.data.source) return false;
          "v-track-mode" === t2.data.type && (t2.data.data && t2.data.data.isVtrack && alert("当前版本不支持，请升级部署神策数据治理"), window.removeEventListener("message", e2, false));
        };
        window.addEventListener && window.addEventListener("message", e2, false), or.postMessage();
      } };
      function sr(e2) {
        var r2 = t.bridge.bridge_info;
        function n2() {
          var e3 = [];
          r2.touch_app_bridge || e3.push(nt.defineMode("1")), s(t.para.app_js_bridge) || (e3.push(nt.defineMode("2")), r2.verify_success = false), s(t.para.heatmap) && "default" == t.para.heatmap.clickmap || e3.push(nt.defineMode("3")), "fail" === r2.verify_success && e3.push(nt.defineMode("4")), new t.SDKJSBridge("app_alert").notifyApp({ data: e3 });
        }
        if (t.bridge.hasVisualModeBridge()) if (s(t.para.heatmap) && "default" == t.para.heatmap.clickmap) if (s(t.para.app_js_bridge) && "success" === r2.verify_success) if (e2) window.sa_jssdk_app_define_mode(t, e2);
        else {
          var i2 = location.protocol;
          me({ success: function() {
            setTimeout(function() {
              "undefined" != typeof sa_jssdk_app_define_mode && window.sa_jssdk_app_define_mode(t, e2);
            }, 0);
          }, error: function() {
          }, type: "js", url: (i2 = oe(["http:", "https:"], i2) > -1 ? i2 : "https:") + "//static.sensorsdata.cn/sdk/" + t.lib_version + "/vapph5define.min.js" });
        }
        else n2();
        else n2();
      }
      function lr() {
        var e2;
        t.readyState.setState(3), new t.SDKJSBridge("visualized").onAppNotify(function() {
          "undefined" != typeof sa_jssdk_app_define_mode ? sr(true) : sr(false);
        }), sr(false), t.bridge.app_js_bridge_v1(), it.initPage(), t.para.is_track_single_page && ht.on("switch", function(n2) {
          var i2 = function(i3) {
            if (i3 = i3 || {}, n2 !== location.href) {
              it.pageProp.referrer = ee(n2);
              var a3 = $({ $url: ee(), $referrer: ee(n2) }, i3);
              r(e2) ? e2(a3) : t.quick && t.quick("autoTrack", a3);
            }
          };
          if ("boolean" == typeof t.para.is_track_single_page) i2();
          else if ("function" == typeof t.para.is_track_single_page) {
            var a2 = t.para.is_track_single_page();
            s(a2) ? i2(a2) : true === a2 && i2();
          }
        }), Pt.init(), (function() {
          var e3 = it.pageProp.url_domain, t2 = {};
          "" === e3 && (e3 = "url解析失败");
          var r2 = tt(document.referrer, true);
          if (Ee.preset_properties.search_keyword_baidu ? et(document.referrer) && (!Xe() || s(r2) && r2.active ? Pt._state && Pt._state.props && (Pt._state.props.$search_keyword_id && delete Pt._state.props.$search_keyword_id, Pt._state.props.$search_keyword_id_type && delete Pt._state.props.$search_keyword_id_type, Pt._state.props.$search_keyword_id_hash && delete Pt._state.props.$search_keyword_id_hash) : (t2.$search_keyword_id = Ze.id(), t2.$search_keyword_id_type = Ze.type(), t2.$search_keyword_id_hash = ae(t2.$search_keyword_id))) : Pt._state && Pt._state.props && (Pt._state.props.$search_keyword_id && delete Pt._state.props.$search_keyword_id, Pt._state.props.$search_keyword_id_type && delete Pt._state.props.$search_keyword_id_type, Pt._state.props.$search_keyword_id_hash && delete Pt._state.props.$search_keyword_id_hash), Pt.save(), D(Ee.preset_properties, function(r3, n3) {
            if (-1 === n3.indexOf("latest_")) return false;
            if (n3 = n3.slice(7), r3) {
              if ("wx_ad_click_id" === n3 && "not_collect" === r3) return false;
              if ("utm" !== n3 && "url解析失败" === e3) "wx_ad_click_id" === n3 ? (t2._latest_wx_ad_click_id = "url的domain解析失败", t2._latest_wx_ad_hash_key = "url的domain解析失败", t2._latest_wx_ad_callbacks = "url的domain解析失败") : t2["$latest_" + n3] = "url的domain解析失败";
              else if (et(document.referrer)) switch (n3) {
                case "traffic_source_type":
                  t2.$latest_traffic_source_type = at();
                  break;
                case "referrer":
                  t2.$latest_referrer = it.pageProp.referrer;
                  break;
                case "search_keyword":
                  tt() ? t2.$latest_search_keyword = tt() : s(Pt._state) && s(Pt._state.props) && Pt._state.props.$latest_search_keyword && delete Pt._state.props.$latest_search_keyword;
                  break;
                case "landing_page":
                  t2.$latest_landing_page = ee();
                  break;
                case "wx_ad_click_id":
                  var i3 = ot(location.href);
                  t2._latest_wx_ad_click_id = i3.click_id, t2._latest_wx_ad_hash_key = i3.hash_key, t2._latest_wx_ad_callbacks = i3.callbacks;
              }
            } else if ("utm" === n3 && Pt._state && Pt._state.props) for (var a3 in Pt._state.props) (0 === a3.indexOf("$latest_utm") || 0 === a3.indexOf("_latest_") && a3.indexOf("_latest_wx_ad_") < 0) && delete Pt._state.props[a3];
            else Pt._state && Pt._state.props && "$latest_" + n3 in Pt._state.props ? delete Pt._state.props["$latest_" + n3] : "wx_ad_click_id" == n3 && Pt._state && Pt._state.props && false === r3 && D(["_latest_wx_ad_click_id", "_latest_wx_ad_hash_key", "_latest_wx_ad_callbacks"], function(e4) {
              e4 in Pt._state.props && delete Pt._state.props[e4];
            });
          }), Ee.preset_properties.latest_utm) {
            var n2 = it.campaignParamsStandard("$latest_", "_latest_"), i2 = n2.$utms, a2 = n2.otherUtms;
            ce(i2) || $(t2, i2), ce(a2) || $(t2, a2);
          }
          Zt(t2);
        })(), xt.init(), "success" === t.bridge.bridge_info.verify_success && At.init(), t.readyState.setState(4), t._q && C(t._q) && t._q.length > 0 && D(t._q, function(e3) {
          t[e3[0]].apply(t, Array.prototype.slice.call(e3[1]));
        }), s(t.para.heatmap) && (Jt.initHeatmap(), Jt.initScrollmap());
      }
      function ur() {
        ar.isWindowNameHasKeyword() ? ar.windowNameHasKeywordHandle() : ar.isSeachHasKeyword() ? ar.hasKeywordHandle() : window.parent !== self && or.isSearchHasKeyword() ? or.verifyVtrackMode() : ar.isStorageHasKeyword() ? ar.storageHasKeywordHandle() : window.parent !== self && or.isStorageHasKeyword() ? or.verifyVtrackMode() : (lr(), or.notifyUser());
      }
      var cr = ["setItem", "deleteItem", "getAppStatus", "track", "quick", "register", "registerPage", "registerOnce", "trackSignup", "setProfile", "setOnceProfile", "appendProfile", "incrementProfile", "deleteProfile", "unsetProfile", "identify", "resetAnonymousIdentity", "login", "logout", "trackLink", "clearAllRegister", "clearPageRegister", "bind", "unbind", "loginWithKey"];
      function pr() {
        D(cr, function(e2) {
          var n2 = t[e2];
          t[e2] = function() {
            if (t.readyState.state < 3) return C(t._q) || (t._q = []), $e("calling sdk api before init is deprecated."), t._q.push([e2, arguments]), false;
            if (!r(t.getDisabled) || !t.getDisabled()) {
              if (t.readyState.getState()) return n2.apply(t, arguments);
              xe("请先初始化神策JS SDK");
            }
          };
        });
      }
      var dr = { track: function(e2, t2, r2) {
      }, quick: function(e2, t2, r2, n2) {
      }, register: function(e2) {
      }, registerPage: function(e2) {
      }, registerOnce: function(e2) {
      }, clearAllRegister: function(e2) {
      }, trackSignup: function(e2, t2, r2, n2) {
      }, setProfile: function(e2, t2) {
      }, setOnceProfile: function(e2, t2) {
      }, appendProfile: function(e2, t2) {
      }, incrementProfile: function(e2, t2) {
      }, deleteProfile: function(e2) {
      }, unsetProfile: function(e2, t2) {
      }, identify: function(e2, t2) {
      }, resetAnonymousIdentity: function(e2) {
      }, login: function(e2, t2) {
      }, logout: function(e2) {
      }, trackLink: function(e2, t2, r2) {
      }, deleteItem: function(e2, t2) {
      }, setItem: function(e2, t2, r2) {
      }, getAppStatus: function(e2) {
      }, clearPageRegister: function(e2) {
      }, bind: function(e2, t2) {
      }, unbind: function(e2, t2) {
      }, registerPropertyPlugin: function(e2) {
      } };
      function fr(e2, t2) {
        this.cancel = function() {
          e2 = true;
        }, this.getCanceled = function() {
          return e2 || false;
        }, this.stop = function() {
          t2 = true;
        }, this.getStopped = function() {
          return t2 || false;
        };
      }
      function gr(e2, t2, r2) {
        var n2 = null;
        try {
          n2 = JSON.parse(JSON.stringify(e2 || null));
        } catch (i2) {
        }
        this.getOriginalData = function() {
          return n2;
        }, this.getPosition = function() {
          return t2;
        }, this.cancellationToken = new fr(), this.sensors = r2;
      }
      function _r(e2) {
        if (!s(e2)) throw "error: Stage constructor requires arguments.";
        this.processDef = e2, this.registeredInterceptors = {};
      }
      _r.prototype.process = function(e2, r2) {
        if (e2 && e2 in this.processDef) {
          var n2 = this.registeredInterceptors[e2];
          if (n2 && C(n2) && n2.length > 0) for (var i2 = { current: 0, total: n2.length }, a2 = new gr(r2, i2, t), o2 = 0; o2 < n2.length; o2++) try {
            if (i2.current = o2 + 1, r2 = n2[o2].call(null, r2, a2) || r2, a2.cancellationToken.getCanceled()) break;
            if (a2.cancellationToken.getStopped()) return;
          } catch (s2) {
            xe("interceptor error:" + s2);
          }
          return this.processDef[e2] && this.processDef[e2] in this.processDef && (r2 = this.process(this.processDef[e2], r2)), r2;
        }
        xe("process [" + e2 + "] is not supported");
      }, _r.prototype.registerStageImplementation = function(e2) {
        e2 && e2.init && r(e2.init) && (e2.init(this), e2.interceptor && this.registerInterceptor(e2.interceptor));
      }, _r.prototype.registerInterceptor = function(e2) {
        if (e2) for (var t2 in e2) {
          var n2 = e2[t2];
          if (n2 && s(n2) && r(n2.entry)) {
            ge(n2.priority) || (n2.priority = Number.MAX_VALUE), this.registeredInterceptors[t2] || (this.registeredInterceptors[t2] = []);
            var i2 = this.registeredInterceptors[t2];
            n2.entry.priority = n2.priority, i2.push(n2.entry), i2.sort(function(e3, t3) {
              return e3.priority - t3.priority;
            });
          }
        }
      };
      var hr = new _r({ basicProps: "extendProps", extendProps: "formatData", formatData: "finalAdjustData", finalAdjustData: null }), mr = new _r({ send: null }), vr = new _r({ getUtmData: null, callSchema: null }), yr = new _r({ webClickEvent: null, webStayEvent: null });
      function br(e2) {
        e2 && e2.buildDataStage && hr.registerStageImplementation(e2.buildDataStage), e2 && e2.businessStage && vr.registerStageImplementation(e2.businessStage), e2 && e2.sendDataStage && mr.registerStageImplementation(e2.sendDataStage), e2 && e2.viewStage && yr.registerStageImplementation(e2.viewStage);
      }
      var wr = { buildDataStage: function(e2) {
        e2 && hr.registerInterceptor(e2);
      }, businessStage: function(e2) {
        e2 && vr.registerInterceptor(e2);
      }, sendDataStage: function(e2) {
        e2 && mr.registerInterceptor(e2);
      }, viewStage: function(e2) {
        e2 && yr.registerInterceptor(e2);
      } };
      function Sr(e2, t2) {
        wr[e2] && wr[e2](t2);
      }
      var kr = { stage: null, init: function(e2) {
        this.stage = e2;
      } };
      var Pr = { stage: null, init: function(e2) {
        this.stage = e2;
      }, interceptor: { send: { entry: function(e2) {
        return e2;
      } } } };
      var Cr = {};
      function Or(e2) {
        e2.kit = Cr, e2.saEvent = Lt, this.buildDataStage = Et, this.sendDataStage = Pr, this.businessStage = kr;
      }
      function jr(e2) {
        e2.heatmap = Jt, this.viewStage = Bt;
      }
      Cr.buildData = function(e2) {
        return t2 = e2, Et.stage.process("basicProps", t2);
        var t2;
      }, Cr.sendData = function(e2, r2) {
        var n2 = lt(e2.properties);
        !(function(e3) {
          Pr.stage.process("send", e3);
        })({ origin_data: e2, server_url: t.para.server_url, data: e2, config: n2 || {}, callback: r2 }), t.log(e2);
      }, Cr.encodeTrackData = function(e2) {
        return gt(e2);
      }, Cr.getUtmData = function() {
        return kr.stage && kr.stage.process("getUtmData");
      };
      var Nr = { webClickEvent: { entry: function(e2, t2) {
        var r2 = t2.sensors;
        "a" === e2.tagName && r2.para.heatmap && true === r2.para.heatmap.isTrackLink ? r2.trackLink({ event: e2.event, target: e2.target }, "$WebClick", e2.props) : r2.track("$WebClick", e2.props, e2.callback);
      } }, webStayEvent: { entry: function(e2, t2) {
        t2.sensors.track("$WebStay", e2);
      } } };
      function Tr(e2) {
        r(e2.properties) ? !e2.isMatchedWithFilter || r(e2.isMatchedWithFilter) ? Sr("buildDataStage", { finalAdjustData: { priority: 100, entry: function(t2) {
          try {
            if (r(e2.isMatchedWithFilter)) return e2.isMatchedWithFilter(t2) && e2.properties(t2);
            e2.properties(t2);
          } catch (n2) {
            xe("execute registerPropertyPlugin callback error:" + n2);
          }
        } } }) : xe("registerPropertyPlugin arguments error, isMatchedWithFilter must be function") : xe("registerPropertyPlugin arguments error, properties must be function");
      }
      var Ir = window.sensors_data_pre_config, Ar = !!Qt.isObject(Ir) && Ir.is_compliance_enabled;
      function Dr(e2) {
        e2 && (t.events = kt, t.bridge = er, t.SDKJSBridge = tr, t.JSBridge = nr, t.store = Pt, t.unlimitedDiv = Dt, t.customProp = $t, t.vtrackcollect = xt, t.vapph5collect = At, t.detectMode = ur, t.registerFeature = br, t.registerInterceptor = Sr, t.commonWays = Ft, br(new Or(t)), br(new jr(t)), Sr("viewStage", Nr));
        var r2 = e2 ? Gt : dr;
        for (var n2 in r2) t[n2] = r2[n2];
        t.logger = Ae, t.log = De, t._ = Qt, t.on = mt, t.ee = _t, t.use = Wt, t.lib_version = Re, t.registerPropertyPlugin = Tr;
      }
      t.init = function(e2) {
        if (_t.sdk.emit("beforeInit"), t.readyState && t.readyState.state && t.readyState.state >= 2) return false;
        var r2, n2;
        Ar && (Dr(true), pr()), _t.initSystemEvent(), t.setInitVar(), t.readyState.setState(2), t.initPara(e2), _t.sdk.emit("initPara"), _t.sdk.emit("afterInitPara"), _t.sdk.emit("initAPI"), _t.sdk.emit("afterInitAPI"), t.detectMode(), r2 = "", n2 = " { cursor: pointer; -webkit-tap-highlight-color: rgba(0,0,0,0); }", t.heatmap && C(t.heatmap.otherTags) && D(t.heatmap.otherTags, function(e3) {
          r2 += e3 + n2;
        }), de() && X() && X() < 13 && (t.para.heatmap && t.para.heatmap.collect_tags && t.para.heatmap.collect_tags.div && Se("div, [data-sensors-click]" + n2), t.para.heatmap && t.para.heatmap.track_attr && Se("[" + t.para.heatmap.track_attr.join("], [") + "]" + n2), "" !== r2 && Se(r2)), _t.sdk.emit("afterInit"), _t.sdk.emit("ready");
      }, Ar ? Dr(false) : (Dr(true), pr());
      var $r = "1.27.11";
      var xr, Ur = (/* @__PURE__ */ (function(e2, t2, r2) {
      })(xr = { init: function(e2) {
        var t2 = e2._.isString, r2 = e2._.rot13defs, n2 = e2._.dfmapping, i2 = "data:enc;";
        e2.ee.sdk.on("afterInitPara", function() {
          e2.kit.userEncrypt = function(e3) {
            return "dfm-enc-" + n2(e3);
          }, e2.kit.userDecrypt = function(e3) {
            return 0 === e3.indexOf(i2) ? (e3 = e3.substring(i2.length), e3 = r2(e3)) : 0 === e3.indexOf("dfm-enc-") && (e3 = e3.substring("dfm-enc-".length), e3 = n2(e3)), e3;
          }, e2.kit.userDecryptIfNeeded = function(r3) {
            return !t2(r3) || 0 !== r3.indexOf(i2) && 0 !== r3.indexOf("dfm-enc-") || (r3 = e2.kit.userDecrypt(r3)), r3;
          };
        });
      }, plugin_name: "UserEncryptDefault" }), xr.plugin_version = $r, xr), Rr = "1.27.11";
      var Br = (function(e2, t2, r2) {
        return (function(e3, t3, r3) {
          if (e3.plugin_name = t3, e3.init) {
            var n2 = e3.init;
            e3.init = function(i2, a2) {
              if ((function(e4, t4, r4) {
                function n3(t5, n4) {
                  e4.logger ? e4.logger.msg.apply(e4.logger, n4).module(r4 + "").level(t5).log() : e4.log && e4.log.apply(e4, n4);
                }
                t4.log = function() {
                  n3("log", arguments);
                }, t4.warn = function() {
                  n3("warn", arguments);
                }, t4.error = function() {
                  n3("error", arguments);
                };
              })(i2, e3, t3), i2.readyState && i2.readyState.state >= 3 || !i2.on) return o2();
              function o2() {
                n2.call(e3, i2, a2);
              }
              i2.on(r3, o2);
            };
          }
        })(e2, t2, r2), e2.plugin_version = Rr, e2;
      })({ sd: null, init: function(e2) {
        if (this.sd) return false;
        if (this.sd = e2, !this.sd || !this.sd._) return false;
        var t2 = this.sd._.cookie.get("sensors_amp_id"), r2 = this.sd.store._state.distinct_id;
        if (t2 && t2.length > 0) {
          var n2 = "amp-" === t2.slice(0, 4);
          if (t2 !== r2) {
            if (!n2) return false;
            this.sd.store._state.first_id ? (this.sd.identify(t2, true), this.sd.saEvent.send({ original_id: t2, distinct_id: r2, type: "track_signup", event: "$SignUp", properties: {} }, null), this.setAmpId(r2)) : this.sd.identify(t2, true);
          }
        } else this.setAmpId(r2);
        this.addListener();
      }, addListener: function() {
        var e2 = this;
        this.sd.events.on("changeDistinctId", function(t2) {
          e2.setAmpId(t2);
        }), this.sd.events.isReady();
      }, setAmpId: function(e2) {
        this.sd._.cookie.set("sensors_amp_id", e2);
      } }, "Amp", "sdkReady"), Hr = window.SensorsData_App_Visual_Bridge, Jr = Hr && Hr.sensorsdata_visualized_mode, Mr = Hr && Hr.sensorsdata_visualized_alert_info, qr = Hr && Hr.sensorsdata_hover_web_nodes;
      function Fr(e2) {
        return Jr.call(Hr) && qr && qr.call(Hr, JSON.stringify(e2));
      }
      var Kr, Vr, zr, Wr, Xr, Zr, Yr = { commands: { app_alert: function(e2) {
        return Mr && Mr.call(Hr, JSON.stringify(e2));
      }, visualized_track: Fr, page_info: Fr, sensorsdata_get_app_visual_config: function(e2, t2) {
        return t2 && "function" == typeof t2[e2.callType] && t2[e2.callType]();
      } } }, Gr = "1.27.11";
      var Qr = { init: function(e2) {
        Xr = (Wr = e2) && Wr._, Zr = Wr && Wr.log || console && console.log || function() {
        }, (function() {
          if (Kr = window.SensorsData_APP_New_H5_Bridge, Vr = Kr && Kr.sensorsdata_track, zr = Vr && Kr.sensorsdata_get_server_url && Kr.sensorsdata_get_server_url(), Zr("---test---fail---", !Wr, Wr.bridge.activeBridge, !zr), !Wr || Wr.bridge.activeBridge || !zr) return;
          Wr.bridge.activeBridge = Qr, Wr.para.app_js_bridge && !Wr.para.app_js_bridge.is_mui && (Wr.bridge.is_verify_success = zr && Wr.bridge.validateAppUrl(zr), Zr("---test---bridge-verify-", Wr.bridge.is_verify_success));
          if (Wr.bridge.bridge_info = { touch_app_bridge: true, platform: "android", verify_success: Wr.bridge.is_verify_success ? "success" : "fail", support_two_way_call: !!Kr.sensorsdata_js_call_app }, !Wr.para.app_js_bridge) return void Zr("---test---app_js_bridge is not configured, data will not be sent by android bridge.");
          Wr.registerInterceptor("sendDataStage", { send: { priority: 60, entry: en } });
        })();
      }, handleCommand: function(e2) {
        var t2 = e2.callType;
        if (t2 in Yr.commands) return Yr.commands[t2](e2, Kr);
        Kr && Xr.isFunction(Kr.sensorsdata_js_call_app) && Kr.sensorsdata_js_call_app(JSON.stringify(e2));
      } };
      function en(e2, t2) {
        if (Zr("---test---datasend-", Wr.bridge.is_verify_success), Wr.para.app_js_bridge.is_mui || "item_set" === e2.data.type || "item_delete" === e2.data.type) return e2;
        var r2 = e2.callback;
        return Wr.bridge.is_verify_success ? (Zr("---test---bridge-verify-success---", e2.data), Vr && Vr.call(Kr, JSON.stringify(Xr.extend({ server_url: Wr.para.server_url }, e2.data))), Xr.isFunction(r2) && r2(), t2.cancellationToken.cancel(), e2) : (Zr("---test---bridge-verify-fail-----", Wr.bridge.is_verify_success), Wr.para.app_js_bridge.is_send ? (Wr.debug.apph5({ data: e2.data, step: "4.2", output: "all" }), e2) : (Xr.isFunction(r2) && r2(), t2.cancellationToken.cancel(), e2));
      }
      var tn = (function(e2, t2, r2) {
        return (function(e3, t3, r3) {
          if (e3.plugin_name = t3, e3.init) {
            var n2 = e3.init;
            e3.init = function(i2, a2) {
              if ((function(e4, t4, r4) {
                function n3(t5, n4) {
                  e4.logger ? e4.logger.msg.apply(e4.logger, n4).module(r4 + "").level(t5).log() : e4.log && e4.log.apply(e4, n4);
                }
                t4.log = function() {
                  n3("log", arguments);
                }, t4.warn = function() {
                  n3("warn", arguments);
                }, t4.error = function() {
                  n3("error", arguments);
                };
              })(i2, e3, t3), i2.readyState && i2.readyState.state >= 3 || !i2.on) return o2();
              function o2() {
                n2.call(e3, i2, a2);
              }
              i2.on(r3, o2);
            };
          }
        })(e2, t2, r2), e2.plugin_version = Gr, e2;
      })(Qr, "AndroidBridge", "sdkAfterInitPara"), rn = window.SensorsData_App_Visual_Bridge, nn = rn && rn.sensorsdata_visualized_mode, an = rn && rn.sensorsdata_visualized_alert_info, on = rn && rn.sensorsdata_hover_web_nodes;
      function sn(e2) {
        return nn.call(rn) && on && on.call(rn, JSON.stringify(e2));
      }
      var ln, un, cn, pn, dn, fn, gn, _n = { commands: { app_alert: function(e2) {
        return an && an.call(rn, JSON.stringify(e2));
      }, visualized_track: sn, page_info: sn, sensorsdata_get_app_visual_config: function(e2, t2) {
        return t2 && "function" == typeof t2[e2.callType] && t2[e2.callType]();
      } } }, hn = "1.27.11";
      var mn = { init: function(e2) {
        fn = (dn = e2) && dn._, gn = dn && dn.log || console && console.log || function() {
        }, (function() {
          if (gn("ObsoleteBridge---test---init---"), ln = window.SensorsData_APP_JS_Bridge, un = ln && ln.sensorsdata_track, cn = ln && ln.sensorsdata_verify, pn = ln && ln.sensorsdata_visual_verify, gn("ObsoleteBridge-", dn.bridge.activeBridge, cn, un, pn), !dn || dn.bridge.activeBridge || !(cn || un || pn)) return;
          dn.bridge.activeBridge = mn;
          var e3 = cn || un;
          pn && (e3 = !!pn.call(ln, JSON.stringify({ server_url: dn.para.server_url })), gn("ObsoleteBridge---called-return", e3));
          if (dn.bridge.bridge_info = { touch_app_bridge: true, platform: "android", verify_success: e3 ? "success" : "fail" }, !dn.para.app_js_bridge) return void gn("app_js_bridge is not configured, data will not be sent by android obsolete bridge.");
          dn.registerInterceptor("sendDataStage", { send: { priority: 80, entry: vn } }), gn("Android obsolete bridge inits succeed.");
        })();
      }, handleCommand: function(e2) {
        gn("ObsoleteBridge---handleCommadn");
        var t2 = e2.callType;
        if (t2 in _n.commands) return gn("ObsoleteBridge---", t2, _n.commands), _n.commands[t2](e2, ln);
        if (ln && fn.isFunction(ln.sensorsdata_js_call_app)) return gn("ObsoleteBridge---handleCommadn-abridge"), ln.sensorsdata_js_call_app(JSON.stringify(e2));
      } };
      function vn(e2, t2) {
        if (gn("ObsoleteBridge---senddata"), dn.para.app_js_bridge.is_mui || "item_set" === e2.data.type || "item_delete" === e2.data.type) return e2;
        var r2 = e2.callback;
        if (cn) {
          var n2 = cn && cn.call(ln, JSON.stringify(fn.extend({ server_url: dn.para.server_url }, e2.data)));
          return gn("ObsoleteBridge---anVerify-success", n2), n2 ? (fn.isFunction(r2) && r2(), t2.cancellationToken.cancel(), e2) : dn.para.app_js_bridge.is_send ? (dn.debug.apph5({ data: e2.data, step: "3.1", output: "all" }), e2) : (fn.isFunction(r2) && r2(), t2.cancellationToken.cancel(), e2);
        }
        return gn("ObsoleteBridge---is-send-old-way", dn.para.app_js_bridge.is_send), un && un.call(ln, JSON.stringify(fn.extend({ server_url: dn.para.server_url }, e2.data))), fn.isFunction(r2) && r2(), t2.cancellationToken.cancel(), e2;
      }
      var yn, bn, wn, Sn, kn = (function(e2, t2, r2) {
        return (function(e3, t3, r3) {
          if (e3.plugin_name = t3, e3.init) {
            var n2 = e3.init;
            e3.init = function(i2, a2) {
              if ((function(e4, t4, r4) {
                function n3(t5, n4) {
                  e4.logger ? e4.logger.msg.apply(e4.logger, n4).module(r4 + "").level(t5).log() : e4.log && e4.log.apply(e4, n4);
                }
                t4.log = function() {
                  n3("log", arguments);
                }, t4.warn = function() {
                  n3("warn", arguments);
                }, t4.error = function() {
                  n3("error", arguments);
                };
              })(i2, e3, t3), i2.readyState && i2.readyState.state >= 3 || !i2.on) return o2();
              function o2() {
                n2.call(e3, i2, a2);
              }
              i2.on(r3, o2);
            };
          }
        })(e2, t2, r2), e2.plugin_version = hn, e2;
      })(mn, "AndroidObsoleteBridge", "sdkAfterInitPara"), Pn = "1.27.11";
      var Cn, On = { event_list: [], latest_event_initial_time: null, max_save_time: 2592e6, init: function(e2, t2) {
        if (bn || !e2) return false;
        Sn = (t2 = t2 || {}).cookie_name || "sensorsdata2015jssdkchannel", bn = e2;
        var r2 = this;
        !(function() {
          if (yn = bn._, wn = bn.store, !yn.localStorage.isSupport()) return false;
          r2.eventList.init(), r2.addLatestChannelUrl(), r2.addIsChannelCallbackEvent();
        })();
      }, addIsChannelCallbackEvent: function() {
        bn.registerPage({ $is_channel_callback_event: function(e2) {
          if (yn.isObject(e2) && e2.event && "$WebClick" !== e2.event && "$pageview" !== e2.event && "$WebStay" !== e2.event && "$SignUp" !== e2.event) return !On.eventList.hasEvent(e2.event) && (On.eventList.add(e2.event), true);
        } });
      }, addLatestChannelUrl: function() {
        var e2 = this.getUrlDomain(), t2 = this.cookie.getChannel();
        if ("url解析失败" === e2) this.registerAndSave({ _sa_channel_landing_url: "", _sa_channel_landing_url_error: "url的domain解析失败" });
        else if (yn.isReferralTraffic(document.referrer)) {
          var r2 = yn.getQueryParam(location.href, "sat_cf");
          yn.isString(r2) && r2.length > 0 ? (this.registerAndSave({ _sa_channel_landing_url: location.href }), On.channelLinkHandler()) : this.registerAndSave({ _sa_channel_landing_url: "" });
        } else t2 ? bn.registerPage(t2) : bn.registerPage({ _sa_channel_landing_url: "", _sa_channel_landing_url_error: "取值异常" });
      }, registerAndSave: function(e2) {
        bn.registerPage(e2), this.cookie.saveChannel(e2);
      }, cookie: { getChannel: function() {
        var e2 = bn.kit.userDecryptIfNeeded(yn.cookie.get(Sn));
        return e2 = yn.safeJSONParse(e2), !(!yn.isObject(e2) || !e2.prop) && e2.prop;
      }, saveChannel: function(e2) {
        var t2 = { prop: e2 }, r2 = JSON.stringify(t2);
        bn.para.encrypt_cookie && (r2 = bn.kit.userEncrypt(r2)), yn.cookie.set(Sn, r2);
      } }, channelLinkHandler: function() {
        this.eventList.reset(), bn.track("$ChannelLinkReaching");
      }, getUrlDomain: function() {
        var e2 = yn.info.pageProp.url_domain;
        return "" === e2 && (e2 = "url解析失败"), e2;
      }, eventList: { init: function() {
        var e2 = this.get(), t2 = (/* @__PURE__ */ new Date()).getTime();
        if (e2 && yn.isNumber(e2.latest_event_initial_time) && yn.isArray(e2.eventList)) {
          var r2 = t2 - e2.latest_event_initial_time;
          r2 > 0 && r2 < On.max_save_time ? (On.event_list = e2.eventList, On.latest_event_initial_time = e2.latest_event_initial_time) : this.reset();
        } else this.reset();
      }, get: function() {
        var e2 = {};
        try {
          e2 = wn.readObjectVal("sawebjssdkchannel");
        } catch (t2) {
          bn.log(t2);
        }
        return e2;
      }, add: function(e2) {
        On.event_list.push(e2), this.save();
      }, save: function() {
        var e2 = { latest_event_initial_time: On.latest_event_initial_time, eventList: On.event_list };
        wn.saveObjectVal("sawebjssdkchannel", e2);
      }, reset: function() {
        On.event_list = [], On.latest_event_initial_time = (/* @__PURE__ */ new Date()).getTime(), this.save();
      }, hasEvent: function(e2) {
        var t2 = false;
        return yn.each(On.event_list, function(r2) {
          r2 === e2 && (t2 = true);
        }), t2;
      } } }, jn = (function(e2, t2, r2) {
        return (function(e3, t3, r3) {
          if (e3.plugin_name = t3, e3.init) {
            var n2 = e3.init;
            e3.init = function(i2, a2) {
              if ((function(e4, t4, r4) {
                function n3(t5, n4) {
                  e4.logger ? e4.logger.msg.apply(e4.logger, n4).module(r4 + "").level(t5).log() : e4.log && e4.log.apply(e4, n4);
                }
                t4.log = function() {
                  n3("log", arguments);
                }, t4.warn = function() {
                  n3("warn", arguments);
                }, t4.error = function() {
                  n3("error", arguments);
                };
              })(i2, e3, t3), i2.readyState && i2.readyState.state >= 3 || !i2.on) return o2();
              function o2() {
                n2.call(e3, i2, a2);
              }
              i2.on(r3, o2);
            };
          }
        })(e2, t2, r2), e2.plugin_version = Pn, e2;
      })(On, "SensorsChannel", "sdkAfterInitAPI"), Nn = "1.27.11";
      var Tn = function() {
        var e2 = {};
        return "undefined" != typeof document.hidden ? (e2.hidden = "hidden", e2.visibilityChange = "visibilitychange") : "undefined" != typeof document.msHidden ? (e2.hidden = "msHidden", e2.visibilityChange = "msvisibilitychange") : "undefined" != typeof document.webkitHidden && (e2.hidden = "webkitHidden", e2.visibilityChange = "webkitvisibilitychange"), e2;
      };
      function In() {
        return void 0 !== Cn && document[Cn];
      }
      Cn = Tn().hidden;
      var An, Dn, $n, xn, En, Ln = { android: /Android/i, iOS: /iPhone|iPad|iPod/i, harmony: /OpenHarmony/i }, Un = (function() {
        for (var e2 in Ln) if (navigator.userAgent.match(Ln[e2])) return e2;
        return "";
      })(), Rn = function(e2) {
        return null != e2 && "[object Object]" == Object.prototype.toString.call(e2);
      }, Bn = function(e2, t2, r2) {
        e2.log("尝试唤起 android app");
        var n2 = t2;
        e2.log("唤起APP的地址：" + n2), window.location = n2, e2.timer = setTimeout(function() {
          var t3 = In();
          if (e2.log("hide:" + Cn + ":" + document[Cn]), t3) return e2.log("The page is hidden, stop navigating to download page"), false;
          e2.log("App可能未安装，跳转到下载地址"), window.location = r2;
        }, e2.timeout);
      }, Hn = { plugin_name: ["deeplink", "Deeplink"], key: null, timer: null, sd: null, data: null, timeout: 2500, apiURL: "{origin}/sdk/deeplink/param?key={key}&system_type=JS&project={project}", init: function(e2) {
        if (this.sd) return this.logger("deeplink已经初始化"), false;
        arguments[0] ? Rn(arguments[0]) && "number" == typeof arguments[0].timeout ? this.sd = window.sensorsDataAnalytic201505 : this.sd = e2 : this.sd = window.sensorsDataAnalytic201505;
        var t2 = {};
        if (arguments.length > 0 && (1 === arguments.length && Rn(arguments[0]) ? t2 = arguments[0] : arguments.length >= 2 && Rn(arguments[1]) && (t2 = arguments[1])), !Ln.hasOwnProperty(Un)) return this.logger("不支持当前系统，目前只支持Android和iOS"), false;
        if (Rn(t2) && this.sd._.isNumber(t2.timeout) && t2.timeout >= 2500 && (this.timeout = t2.timeout), !this.sd.para.server_url) return this.logger("神策JS SDK配置项server_url未正确配置"), false;
        var r2 = (function(e3) {
          var t3 = e3._.URL(e3.para.server_url);
          return { origin: t3.origin, project: t3.searchParams.get("project") || "default" };
        })(this.sd);
        this.apiURL = this.apiURL.replace("{origin}", r2.origin).replace("{project}", r2.project);
        var n2 = this.sd._.getQueryParam(window.location.href, "deeplink");
        if (!n2) return this.logger("当前页面缺少deeplink参数"), false;
        n2 = window.decodeURIComponent(n2);
        var i2 = n2.match(/\/sd\/(\w+)\/(\w+)$/);
        if (!i2) return this.logger("当前页面的deeplink参数无效"), false;
        this.key = i2[2], this.apiURL = this.apiURL.replace("{key}", window.encodeURIComponent(i2[2])), this.sd._.ajax({ url: this.apiURL, type: "GET", cors: true, credentials: false, success: function(e3) {
          if (e3.errorMsg) return Hn.logger("API报错：" + e3.errorMsg), false;
          Hn.data = e3, Hn.logger("API查询成功，数据：" + JSON.stringify(e3, null, "  ")), this.data.app_key && (this.data.android_info && this.data.android_info.url_schemes && (this.data.android_info.url_schemes += "://sensorsdata/sd/" + this.data.app_key + "/" + this.key), this.data.ios_info && this.data.ios_info.url_schemes && (this.data.ios_info.url_schemes += "://sensorsdata/sd/" + this.data.app_key + "/" + this.key), this.data.harmony_info && this.data.harmony_info.url_schemes && (this.data.harmony_info.url_schemes += "://sensorsdata/sd/" + this.data.app_key + "/" + this.key));
        }.bind(this), error: function() {
          Hn.logger("API查询出错");
        } }), this.addListeners();
      }, openDeepLink: function() {
        if (this.logger("openDeeplink()"), !this.data) return this.logger("没有Deep link数据!"), false;
        if ("iOS" === Un) {
          this.logger("当前系统是iOS");
          var e2 = this.sd && this.sd._ && this.sd._.getIOSVersion() >= 9 && this.data.ios_info.ios_wake_url ? this.data.ios_info.ios_wake_url : this.data.ios_info.url_schemes;
          this.logger("唤起APP的地址：" + e2), r2 = this, n2 = e2, i2 = this.data.ios_info.download_url, r2.log("尝试唤起 iOS app:" + n2), window.location.href = n2, r2.timer = setTimeout(function() {
            if (In()) return r2.log("The page is hidden, stop navigating to download page"), false;
            r2.log("App可能未安装，跳转到下载地址"), window.location.href = i2;
          }, r2.timeout), r2.log("new timer:" + r2.timer);
        } else if ("android" === Un) this.logger("当前系统是 android"), Bn(this, this.data.android_info.url_schemes, this.data.android_info.download_url);
        else if ("harmony" === Un) {
          var t2 = this.data.harmony_info.app_linking_url || this.data.harmony_info.url_schemes;
          this.logger("当前系统是 HarmonyOS"), Bn(this, t2, this.data.harmony_info.download_url);
        }
        var r2, n2, i2;
      }, logger: function(e2) {
        this.sd && this.sd.log(e2);
      }, addListeners: function() {
        var e2 = Tn().visibilityChange, t2 = this;
        e2 && document.addEventListener(e2, function() {
          clearTimeout(t2.timer), t2.logger("visibilitychange, clear timeout:" + t2.timer);
        }, false), window.addEventListener("pagehide", function() {
          t2.logger("page hide, clear timeout:" + t2.timer), clearTimeout(t2.timer);
        }, false);
      } }, Jn = (function(e2, t2, r2) {
        return (function(e3, t3, r3) {
          if (e3.init) {
            var n2 = e3.init;
            e3.init = function(i2, a2) {
              if ((function(e4, t4, r4) {
                function n3(t5, n4) {
                  e4.logger ? e4.logger.msg.apply(e4.logger, n4).module(r4 + "").level(t5).log() : e4.log && e4.log.apply(e4, n4);
                }
                t4.log = function() {
                  n3("log", arguments);
                }, t4.warn = function() {
                  n3("warn", arguments);
                }, t4.error = function() {
                  n3("error", arguments);
                };
              })(i2, e3, t3), i2.readyState && i2.readyState.state >= 3 || !i2.on) return o2();
              function o2() {
                n2.call(e3, i2, a2);
              }
              i2.on(r3, o2);
            };
          }
        })(e2, t2, r2), e2.plugin_version = Nn, e2;
      })(Hn, null, "sdkReady"), Mn = "1.27.11";
      var qn = { init: function(e2) {
        xn = ($n = e2) && $n._, En = $n && $n.log || console && console.log || function() {
        }, (function() {
          if (An = window.SensorsData_iOS_JS_Bridge && window.SensorsData_iOS_JS_Bridge.sensorsdata_app_server_url, Dn = function() {
            return window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.sensorsdataNativeTracker;
          }, !$n || $n.bridge.activeBridge || !Dn() || !Dn().postMessage) return;
          $n.bridge.activeBridge = qn, $n.para.app_js_bridge && !$n.para.app_js_bridge.is_mui && ($n.bridge.is_verify_success = An && $n.bridge.validateAppUrl(An));
          if ($n.bridge.bridge_info = { touch_app_bridge: true, platform: "ios", verify_success: $n.bridge.is_verify_success ? "success" : "fail", support_two_way_call: true }, !$n.para.app_js_bridge) return void En("app_js_bridge is not configured, data will not be sent by iOS bridge.");
          $n.registerInterceptor("sendDataStage", { send: { priority: 70, entry: Fn } }), En("IOS bridge inits succeed.");
        })();
      }, handleCommand: function(e2) {
        var t2 = e2.callType;
        if (("page_info" === t2 || "visualized_track" === t2) && !$n.bridge.hasVisualModeBridge()) return null;
        if ("sensorsdata_get_app_visual_config" === t2) return xn.isObject(window.SensorsData_APP_New_H5_Bridge) && window.SensorsData_APP_New_H5_Bridge[t2];
        return Dn() && Dn().postMessage(JSON.stringify(e2));
      } };
      function Fn(e2, t2) {
        if ($n.para.app_js_bridge.is_mui || "item_set" === e2.data.type || "item_delete" === e2.data.type) return e2;
        var r2 = e2.callback;
        return $n.bridge.is_verify_success ? (Dn() && Dn().postMessage(JSON.stringify({ callType: "app_h5_track", data: xn.extend({ server_url: $n.para.server_url }, e2.data) })), xn.isFunction(r2) && r2(), t2.cancellationToken.cancel(), e2) : $n.para.app_js_bridge.is_send ? ($n.debug.apph5({ data: e2.data, step: "4.1", output: "all" }), e2) : (xn.isFunction(r2) && r2(), t2.cancellationToken.cancel(), e2);
      }
      var Kn, Vn, zn, Wn = (function(e2, t2, r2) {
        return (function(e3, t3, r3) {
          if (e3.plugin_name = t3, e3.init) {
            var n2 = e3.init;
            e3.init = function(i2, a2) {
              if ((function(e4, t4, r4) {
                function n3(t5, n4) {
                  e4.logger ? e4.logger.msg.apply(e4.logger, n4).module(r4 + "").level(t5).log() : e4.log && e4.log.apply(e4, n4);
                }
                t4.log = function() {
                  n3("log", arguments);
                }, t4.warn = function() {
                  n3("warn", arguments);
                }, t4.error = function() {
                  n3("error", arguments);
                };
              })(i2, e3, t3), i2.readyState && i2.readyState.state >= 3 || !i2.on) return o2();
              function o2() {
                n2.call(e3, i2, a2);
              }
              i2.on(r3, o2);
            };
          }
        })(e2, t2, r2), e2.plugin_version = Mn, e2;
      })(qn, "IOSBridge", "sdkAfterInitPara"), Xn = "1.27.11";
      var Zn = { init: function(e2) {
        Vn = (Kn = e2) && Kn._, zn = Kn && Kn.log || console && console.log || function() {
        }, (function() {
          if (!Kn || Kn.bridge.activeBridge || !/sensors-verify/.test(navigator.userAgent) && !/sa-sdk-ios/.test(navigator.userAgent) || window.MSStream) return;
          if (Kn.bridge.activeBridge = Zn, Kn.bridge.bridge_info = { touch_app_bridge: true, platform: "ios", verify_success: Yn() ? "success" : "fail" }, !Kn.para.app_js_bridge) return void zn("app_js_bridge is not configured, data will not be sent by iOS obsolete bridge.");
          Kn.registerInterceptor("sendDataStage", { send: { priority: 90, entry: Gn } }), zn("IOS obsolete bridge inits succeed.");
        })();
      } };
      function Yn() {
        if (/sensors-verify/.test(navigator.userAgent)) {
          var e2 = navigator.userAgent.match(/sensors-verify\/([^\s]+)/);
          if (e2 && e2[0] && "string" == typeof e2[1] && 2 === e2[1].split("?").length) {
            e2 = e2[1].split("?");
            var t2 = null, r2 = null;
            try {
              t2 = Vn.URL(Kn.para.server_url).hostname, r2 = Vn.URL(Kn.para.server_url).searchParams.get("project") || "default";
            } catch (n2) {
              Kn.log(n2);
            }
            return !(!t2 || t2 !== e2[0] || !r2 || r2 !== e2[1]);
          }
          return false;
        }
        return !!/sa-sdk-ios/.test(navigator.userAgent);
      }
      function Gn(e2, t2) {
        if (Kn.para.app_js_bridge.is_mui || "item_set" === e2.data.type || "item_delete" === e2.data.type) return e2;
        var r2, n2, i2 = e2.callback;
        if (Kn.bridge.bridge_info.verify_success) {
          var a2 = document.createElement("iframe"), o2 = (r2 = e2.data, n2 = (n2 = JSON.stringify(Vn.extend({ server_url: Kn.para.server_url }, r2))).replace(/\r\n/g, ""), "sensorsanalytics://trackEvent?event=" + (n2 = encodeURIComponent(n2)));
          return a2.setAttribute("src", o2), document.documentElement.appendChild(a2), a2.parentNode.removeChild(a2), a2 = null, Vn.isFunction(i2) && i2(), t2.cancellationToken.cancel(), true;
        }
        return Kn.para.app_js_bridge.is_send ? (Kn.debug.apph5({ data: e2.data, step: "3.2", output: "all" }), e2) : (Vn.isFunction(i2) && i2(), t2.cancellationToken.cancel(), e2);
      }
      var Qn = (function(e2, t2, r2) {
        return (function(e3, t3, r3) {
          if (e3.plugin_name = t3, e3.init) {
            var n2 = e3.init;
            e3.init = function(i2, a2) {
              if ((function(e4, t4, r4) {
                function n3(t5, n4) {
                  e4.logger ? e4.logger.msg.apply(e4.logger, n4).module(r4 + "").level(t5).log() : e4.log && e4.log.apply(e4, n4);
                }
                t4.log = function() {
                  n3("log", arguments);
                }, t4.warn = function() {
                  n3("warn", arguments);
                }, t4.error = function() {
                  n3("error", arguments);
                };
              })(i2, e3, t3), i2.readyState && i2.readyState.state >= 3 || !i2.on) return o2();
              function o2() {
                n2.call(e3, i2, a2);
              }
              i2.on(r3, o2);
            };
          }
        })(e2, t2, r2), e2.plugin_version = Xn, e2;
      })(Zn, "IOSObsoleteBridge", "sdkAfterInitPara"), ei = "1.27.11";
      var ti = 432e3;
      function ri() {
        this.sd = null, this.start_time = +/* @__PURE__ */ new Date(), this.page_show_status = true, this.page_hidden_status = false, this._ = {}, this.timer = null, this.current_page_url = document.referrer, this.url = location.href, this.title = document.title || "", this.option = {}, this.heartbeat_interval_time = 5e3, this.heartbeat_interval_timer = null, this.page_id = null, this.storage_name = "sawebjssdkpageleave", this.max_duration = ti;
      }
      ri.prototype.init = function(e2, t2) {
        if (e2) {
          if (this.sd = e2, this._ = this.sd._, t2) {
            this.option = t2;
            var r2 = t2.heartbeat_interval_time;
            r2 && (this._.isNumber(r2) || this._.isNumber(1 * r2)) && 1 * r2 > 0 && (this.heartbeat_interval_time = 1e3 * r2);
            var n2 = t2.max_duration;
            n2 && (this._.isNumber(n2) || this._.isNumber(1 * n2)) && 1 * n2 > 0 && (this.max_duration = n2);
          }
          this.page_id = Number(String(this._.getRandom()).slice(2, 5) + String(this._.getRandom()).slice(2, 4) + String((/* @__PURE__ */ new Date()).getTime()).slice(-4)), this.addEventListener(), true === document.hidden ? this.page_show_status = false : this.addHeartBeatInterval(), this.log("PageLeave初始化完毕");
        } else this.log("神策JS SDK未成功引入");
      }, ri.prototype.log = function(e2) {
        this.sd && this.sd.log(e2);
      }, ri.prototype.refreshPageEndTimer = function() {
        var e2 = this;
        this.timer && (clearTimeout(this.timer), this.timer = null), this.timer = setTimeout(function() {
          e2.page_hidden_status = false;
        }, 5e3);
      }, ri.prototype.hiddenStatusHandler = function() {
        clearTimeout(this.timer), this.timer = null, this.page_hidden_status = false;
      }, ri.prototype.pageStartHandler = function() {
        this.start_time = +/* @__PURE__ */ new Date(), true == !document.hidden ? this.page_show_status = true : this.page_show_status = false, this.url = location.href, this.title = document.title;
      }, ri.prototype.pageEndHandler = function() {
        if (true !== this.page_hidden_status) {
          var e2 = this.getPageLeaveProperties();
          false === this.page_show_status && delete e2.event_duration, this.page_show_status = false, this.page_hidden_status = true, this.isCollectUrl(this.url) && this.sd.track("$WebPageLeave", e2), this.refreshPageEndTimer(), this.delHeartBeatData();
        }
      }, ri.prototype.addEventListener = function() {
        this.addPageStartListener(), this.addPageSwitchListener(), this.addSinglePageListener(), this.addPageEndListener();
      }, ri.prototype.addPageStartListener = function() {
        var e2 = this;
        "onpageshow" in window && this._.addEvent(window, "pageshow", function() {
          e2.pageStartHandler(), e2.hiddenStatusHandler();
        });
      }, ri.prototype.isCollectUrl = function(e2) {
        return "function" != typeof this.option.isCollectUrl || ("string" != typeof e2 || "" === e2 || this.option.isCollectUrl(e2));
      }, ri.prototype.addSinglePageListener = function() {
        var e2 = this;
        this.sd.ee && this.sd.ee.spa.prepend("switch", function(t2) {
          t2 !== location.href && (e2.url = t2, e2.pageEndHandler(), e2.stopHeartBeatInterval(), e2.current_page_url = e2.url, e2.pageStartHandler(), e2.hiddenStatusHandler(), e2.addHeartBeatInterval());
        });
      }, ri.prototype.addPageEndListener = function() {
        var e2 = this;
        this._.each(["pagehide", "beforeunload", "unload"], function(t2) {
          "on" + t2 in window && e2._.addEvent(window, t2, function() {
            e2.pageEndHandler(), e2.stopHeartBeatInterval();
          });
        });
      }, ri.prototype.addPageSwitchListener = function() {
        var e2 = this;
        this._.listenPageState({ visible: function() {
          e2.pageStartHandler(), e2.hiddenStatusHandler(), e2.addHeartBeatInterval();
        }, hidden: function() {
          e2.url = location.href, e2.title = document.title, e2.pageEndHandler(), e2.stopHeartBeatInterval();
        } });
      }, ri.prototype.addHeartBeatInterval = function() {
        this._.localStorage.isSupport() && this.startHeartBeatInterval();
      }, ri.prototype.startHeartBeatInterval = function() {
        var e2 = this;
        this.heartbeat_interval_timer && this.stopHeartBeatInterval();
        var t2 = true;
        this.isCollectUrl(this.url) || (t2 = false), this.heartbeat_interval_timer = setInterval(function() {
          t2 && e2.saveHeartBeatData();
        }, this.heartbeat_interval_time), t2 && this.saveHeartBeatData("is_first_heartbeat"), this.reissueHeartBeatData();
      }, ri.prototype.stopHeartBeatInterval = function() {
        clearInterval(this.heartbeat_interval_timer), this.heartbeat_interval_timer = null;
      }, ri.prototype.saveHeartBeatData = function(e2) {
        var t2 = this.getPageLeaveProperties(), r2 = /* @__PURE__ */ new Date();
        t2.$time = r2, "is_first_heartbeat" === e2 && (t2.event_duration = 3.14);
        var n2 = this.sd.kit.buildData({ type: "track", event: "$WebPageLeave", properties: t2 });
        n2.heartbeat_interval_time = this.heartbeat_interval_time, this.sd.store.saveObjectVal(this.storage_name + "-" + this.page_id, n2);
      }, ri.prototype.delHeartBeatData = function(e2) {
        this._.localStorage.isSupport() && this._.localStorage.remove(e2 || this.storage_name + "-" + this.page_id);
      }, ri.prototype.reissueHeartBeatData = function() {
        for (var e2 = window.localStorage.length - 1; e2 >= 0; e2--) {
          var t2 = window.localStorage.key(e2);
          if (t2 && t2 !== this.storage_name + "-" + this.page_id && 0 === t2.indexOf(this.storage_name + "-")) {
            var r2 = this.sd.store.readObjectVal(t2);
            this._.isObject(r2) && 1 * /* @__PURE__ */ new Date() - r2.time > r2.heartbeat_interval_time + 5e3 && (delete r2.heartbeat_interval_time, r2._flush_time = (/* @__PURE__ */ new Date()).getTime(), this.sd.kit.sendData(r2), this.delHeartBeatData(t2));
          }
        }
      }, ri.prototype.getPageLeaveProperties = function() {
        var e2 = (+/* @__PURE__ */ new Date() - this.start_time) / 1e3;
        (isNaN(e2) || e2 < 0 || e2 > this.max_duration) && (e2 = 0), e2 = Number(e2.toFixed(3));
        var t2 = this._.getReferrer(this.current_page_url), r2 = document.documentElement && document.documentElement.scrollTop || window.pageYOffset || document.body && document.body.scrollTop || 0;
        r2 = Math.round(r2) || 0;
        var n2 = { $title: this.title, $url: this._.getURL(this.url), $url_path: this._.getURLPath(this._.URL(this.url).pathname), $referrer_host: t2 ? this._.getHostname(t2) : "", $referrer: t2, $viewport_position: r2 };
        return 0 !== e2 && (n2.event_duration = e2), n2 = this._.extend(n2, this.option.custom_props);
      };
      var ni = (function(e2, t2, r2) {
        return (function(e3, t3, r3) {
          if (e3.plugin_name = t3, e3.init) {
            var n2 = e3.init;
            e3.init = function(i2, a2) {
              if ((function(e4, t4, r4) {
                function n3(t5, n4) {
                  e4.logger ? e4.logger.msg.apply(e4.logger, n4).module(r4 + "").level(t5).log() : e4.log && e4.log.apply(e4, n4);
                }
                t4.log = function() {
                  n3("log", arguments);
                }, t4.warn = function() {
                  n3("warn", arguments);
                }, t4.error = function() {
                  n3("error", arguments);
                };
              })(i2, e3, t3), i2.readyState && i2.readyState.state >= 3 || !i2.on) return o2();
              function o2() {
                n2.call(e3, i2, a2);
              }
              i2.on(r3, o2);
            };
          }
        })(e2, t2, r2), e2.plugin_version = ei, e2;
      })(new ri(), "PageLeave", "sdkReady"), ii = "1.27.11";
      var ai = false, oi = (function(e2, t2, r2) {
        return (function(e3, t3, r3) {
          if (e3.plugin_name = t3, e3.init) {
            var n2 = e3.init;
            e3.init = function(i2, a2) {
              if ((function(e4, t4, r4) {
                function n3(t5, n4) {
                  e4.logger ? e4.logger.msg.apply(e4.logger, n4).module(r4 + "").level(t5).log() : e4.log && e4.log.apply(e4, n4);
                }
                t4.log = function() {
                  n3("log", arguments);
                }, t4.warn = function() {
                  n3("warn", arguments);
                }, t4.error = function() {
                  n3("error", arguments);
                };
              })(i2, e3, t3), i2.readyState && i2.readyState.state >= 3 || !i2.on) return o2();
              function o2() {
                n2.call(e3, i2, a2);
              }
              i2.on(r3, o2);
            };
          }
        })(e2, t2, r2), e2.plugin_version = ii, e2;
      })({ init: function(e2, t2) {
        function r2() {
          var n2 = 0, i2 = window.performance || window.webkitPerformance || window.msPerformance || window.mozPerformance, a2 = { $url: e2._.getURL(), $title: document.title, $url_path: e2._.getURLPath(), $referrer: e2._.getReferrer(null, true) };
          if (i2 ? (n2 = (function(t3) {
            var r3 = 0;
            return e2._.isFunction(t3.getEntriesByType) && (r3 = ((t3.getEntriesByType("navigation") || [{}])[0] || {}).domContentLoadedEventEnd || 0), r3;
          })(i2) || (function(t3) {
            var r3 = 0;
            if (t3.timing) {
              var n3 = t3.timing;
              0 !== n3.fetchStart && e2._.isNumber(n3.fetchStart) && 0 !== n3.domContentLoadedEventEnd && e2._.isNumber(n3.domContentLoadedEventEnd) ? r3 = n3.domContentLoadedEventEnd - n3.fetchStart : e2.log("performance 数据获取异常");
            }
            return r3;
          })(i2), (function(t3, r3) {
            if (t3.getEntries && "function" == typeof t3.getEntries) {
              for (var n3 = t3.getEntries(), i3 = null, a3 = 0; a3 < n3.length; a3++) "transferSize" in n3[a3] && (i3 += n3[a3].transferSize);
              e2._.isNumber(i3) && i3 >= 0 && i3 < 10737418240 && (r3.$page_resource_size = Number((i3 / 1024).toFixed(3)));
            }
          })(i2, a2)) : e2.log("浏览器未支持 performance API."), n2 > 0) {
            var o2 = e2._.isObject(t2) && t2.max_duration || 1800;
            n2 = Number((n2 / 1e3).toFixed(3)), (!e2._.isNumber(o2) || o2 <= 0 || n2 <= o2) && (a2.event_duration = n2);
          }
          ai || (e2.track("$WebPageLoad", a2), ai = true), window.removeEventListener ? window.removeEventListener("load", r2) : window.detachEvent && window.detachEvent("onload", r2);
        }
        "complete" == document.readyState ? r2() : window.addEventListener ? window.addEventListener("load", r2) : window.attachEvent && window.attachEvent("onload", r2);
      } }, "PageLoad", "sdkReady");
      function si() {
        this.sd = null, this.log = window.console && window.console.log || function() {
        }, this.customRegister = [];
      }
      si.prototype.init = function(e2) {
        if (e2) {
          this.sd = e2, this._ = e2._, this.log = e2.log;
          var t2 = this;
          e2.registerInterceptor("buildDataStage", { extendProps: { priority: 0, entry: function(e3) {
            return (function(e4, t3) {
              if ("track" !== e4.type) return e4;
              var r2 = t3.sd, n2 = r2._, i2 = r2.saEvent.check, a2 = n2.extend2Lev({ properties: {} }, e4), o2 = t3.customRegister, s2 = a2.properties, l2 = a2.event, u2 = {};
              return n2.each(o2, function(e5) {
                if (n2.isObject(e5)) n2.indexOf(e5.events, l2) > -1 && i2({ properties: e5.properties }) && (u2 = n2.extend(u2, e5.properties));
                else if (n2.isFunction(e5)) {
                  var t4 = e5({ event: l2, properties: s2, data: a2 });
                  n2.isObject(t4) && !n2.isEmptyObject(t4) && i2({ properties: t4 }) && (u2 = n2.extend(u2, t4));
                }
              }), e4.properties = n2.extend(s2, u2), e4;
            })(e3, t2);
          } } });
        } else this.log("神策JS SDK未成功引入");
      }, si.prototype.register = function(e2) {
        this.sd ? this._.isObject(e2) && this._.isArray(e2.events) && e2.events.length > 0 && this._.isObject(e2.properties) && !this._.isEmptyObject(e2.properties) ? this.customRegister.push(e2) : this.log("RegisterProperties: register 参数错误") : this.log("神策JS SDK未成功引入");
      }, si.prototype.hookRegister = function(e2) {
        this.sd ? this._.isFunction(e2) ? this.customRegister.push(e2) : this.log("RegisterProperties: hookRegister 参数错误") : this.log("神策JS SDK未成功引入");
      };
      var li = "1.27.11";
      si.prototype.plugin_name = "RegisterProperties";
      var ui = (function(e2, t2, r2) {
        return e2.plugin_version = li, e2;
      })(new si()), ci = "1.27.11";
      var pi, di, fi = window.console && window.console.log || function() {
      };
      function gi(e2) {
        try {
          if ("$pageview" !== e2.event && (!e2.type || "profile" !== e2.type.slice(0, 7))) {
            var t2 = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight || 0, r2 = document.documentElement.scrollHeight || 0, n2 = { $page_height: Math.max(t2, r2) || 0 };
            e2.properties = pi._.extend(e2.properties || {}, n2);
          }
        } catch (i2) {
          fi("页面高度获取异常。");
        }
        return di.call(pi.kit, e2);
      }
      var _i = (function(e2, t2, r2) {
        return (function(e3, t3, r3) {
          if (e3.plugin_name = t3, e3.init) {
            var n2 = e3.init;
            e3.init = function(i2, a2) {
              if ((function(e4, t4, r4) {
                function n3(t5, n4) {
                  e4.logger ? e4.logger.msg.apply(e4.logger, n4).module(r4 + "").level(t5).log() : e4.log && e4.log.apply(e4, n4);
                }
                t4.log = function() {
                  n3("log", arguments);
                }, t4.warn = function() {
                  n3("warn", arguments);
                }, t4.error = function() {
                  n3("error", arguments);
                };
              })(i2, e3, t3), i2.readyState && i2.readyState.state >= 3 || !i2.on) return o2();
              function o2() {
                n2.call(e3, i2, a2);
              }
              i2.on(r3, o2);
            };
          }
        })(e2, t2, r2), e2.plugin_version = ci, e2;
      })({ init: function(e2) {
        fi = (pi = e2) && pi.log || fi, e2 && e2.kit && e2.kit.buildData ? (di = pi.kit.buildData, pi.kit.buildData = gi, fi("RegisterPropertyPageHeight 插件初始化完成")) : fi("RegisterPropertyPageHeight 插件初始化失败,当前主sdk不支持 RegisterPropertyPageHeight 插件，请升级主sdk");
      } }, "RegisterPropertyPageHeight", "sdkReady"), hi = "1.27.11";
      var mi, vi = { getPart: function(e2) {
        var t2 = this.option.length;
        if (t2) {
          for (var r2 = 0; r2 < t2; r2++) if (e2.indexOf(this.option[r2].part_url) > -1) return true;
        }
        return false;
      }, getPartHash: function(e2) {
        var t2 = this.option.length;
        if (t2) {
          for (var r2 = 0; r2 < t2; r2++) if (e2.indexOf(this.option[r2].part_url) > -1) return this.option[r2].after_hash;
        }
        return false;
      }, getCurrenId: function() {
        var e2 = this.store.getDistinctId() || "", t2 = this.store.getFirstId() || "";
        return this._.urlSafeBase64 && this._.urlSafeBase64.encode ? e2 = e2 ? this._.urlSafeBase64.trim(this._.urlSafeBase64.encode(this._.base64Encode(e2))) : "" : this._.rot13obfs && (e2 = e2 ? this._.rot13obfs(e2) : ""), encodeURIComponent(t2 ? "f" + e2 : "d" + e2);
      }, rewriteUrl: function(e2, t2) {
        var r2 = this, n2 = /([^?#]+)(\?[^#]*)?(#.*)?/.exec(e2), i2 = "";
        if (n2) {
          var a2, o2 = n2[1] || "", s2 = n2[2] || "", l2 = n2[3] || "", u2 = "_sasdk=" + this.getCurrenId(), c2 = function(e3) {
            var t3 = e3.split("&"), n3 = [];
            return r2._.each(t3, function(e4) {
              e4.indexOf("_sasdk=") > -1 ? n3.push(u2) : n3.push(e4);
            }), n3.join("&");
          };
          if (this.getPartHash(e2)) a2 = l2.indexOf("_sasdk"), i2 = l2.indexOf("?") > -1 ? a2 > -1 ? o2 + s2 + "#" + l2.substring(1, a2) + c2(l2.substring(a2, l2.length)) : o2 + s2 + l2 + "&" + u2 : o2 + s2 + "#" + l2.substring(1) + "?" + u2;
          else a2 = s2.indexOf("_sasdk"), i2 = /^\?(\w)+/.test(s2) ? a2 > -1 ? o2 + "?" + c2(s2.substring(1)) + l2 : o2 + s2 + "&" + u2 + l2 : o2 + "?" + u2 + l2;
          return t2 && (t2.href = i2), i2;
        }
      }, getUrlId: function() {
        var e2 = location.href.match(/_sasdk=([aufd][^\?\#\&\=]+)/);
        if (this._.isArray(e2) && e2[1]) {
          var t2 = decodeURIComponent(e2[1]);
          return !t2 || "f" !== t2.substring(0, 1) && "d" !== t2.substring(0, 1) || (this._.urlSafeBase64 && this._.urlSafeBase64.isUrlSafeBase64 && this._.urlSafeBase64.isUrlSafeBase64(t2) ? t2 = t2.substring(0, 1) + this._.base64Decode(this._.urlSafeBase64.decode(t2.substring(1))) : this._.rot13defs && (t2 = t2.substring(0, 1) + this._.rot13defs(t2.substring(1)))), t2;
        }
        return "";
      }, setRefferId: function(e2) {
        var t2 = this.store.getDistinctId(), r2 = this.getUrlId();
        if (r2 && "" !== r2) {
          var n2 = "a" === r2.substring(0, 1) || "d" === r2.substring(0, 1);
          (r2 = r2.substring(1)) !== t2 && (n2 ? (this.sd.identify(r2, true), this.store.getFirstId() && this.sd.saEvent.send({ original_id: r2, distinct_id: t2, type: "track_signup", event: "$SignUp", properties: {} }, null)) : this.store.getFirstId() && !e2.re_login || this.sd.login(r2));
        }
      }, addListen: function() {
        var e2 = this, t2 = function(t3) {
          var r2, n2, i2 = t3.target, a2 = i2.tagName.toLowerCase(), o2 = i2.parentNode;
          if ("a" === a2 && i2.href || o2 && o2.tagName && "a" === o2.tagName.toLowerCase() && o2.href) {
            "a" === a2 && i2.href ? (r2 = i2.href, n2 = i2) : (r2 = o2.href, n2 = o2);
            var s2 = e2._.URL(r2).protocol;
            "http:" !== s2 && "https:" !== s2 || e2.getPart(r2) && e2.rewriteUrl(r2, n2);
          }
        };
        e2._.addEvent(document, "mousedown", t2), window.PointerEvent && "maxTouchPoints" in window.navigator && window.navigator.maxTouchPoints >= 0 && e2._.addEvent(document, "pointerdown", t2);
      }, init: function(e2, t2) {
        this.sd = e2, this._ = e2._, this.store = e2.store, this.para = e2.para, this._.isObject(t2) && this._.isArray(t2.linker) && t2.linker.length > 0 ? (this.setRefferId(t2), this.addListen(), this.option = t2.linker, this.option = (function(t3) {
          for (var r2 = t3.length, n2 = [], i2 = 0; i2 < r2; i2++) /[A-Za-z0-9]+\./.test(t3[i2].part_url) && "[object Boolean]" == Object.prototype.toString.call(t3[i2].after_hash) ? n2.push(t3[i2]) : e2.log("linker 配置的第 " + (i2 + 1) + " 项格式不正确，请检查参数格式！");
          return n2;
        })(this.option)) : e2.log("请配置打通域名参数！");
      } }, yi = (function(e2, t2, r2) {
        return (function(e3, t3, r3) {
          if (e3.plugin_name = t3, e3.init) {
            var n2 = e3.init;
            e3.init = function(i2, a2) {
              if ((function(e4, t4, r4) {
                function n3(t5, n4) {
                  e4.logger ? e4.logger.msg.apply(e4.logger, n4).module(r4 + "").level(t5).log() : e4.log && e4.log.apply(e4, n4);
                }
                t4.log = function() {
                  n3("log", arguments);
                }, t4.warn = function() {
                  n3("warn", arguments);
                }, t4.error = function() {
                  n3("error", arguments);
                };
              })(i2, e3, t3), i2.readyState && i2.readyState.state >= 3 || !i2.on) return o2();
              function o2() {
                n2.call(e3, i2, a2);
              }
              i2.on(r3, o2);
            };
          }
        })(e2, t2, r2), e2.plugin_version = hi, e2;
      })(vi, "SiteLinker", "sdkReady"), bi = "utm_source utm_medium utm_campaign utm_content utm_term", wi = "1.27.11";
      var Si = (function(e2, t2, r2) {
        return (function(e3, t3, r3) {
          if (e3.plugin_name = t3, e3.init) {
            var n2 = e3.init;
            e3.init = function(i2, a2) {
              if ((function(e4, t4, r4) {
                function n3(t5, n4) {
                  e4.logger ? e4.logger.msg.apply(e4.logger, n4).module(r4 + "").level(t5).log() : e4.log && e4.log.apply(e4, n4);
                }
                t4.log = function() {
                  n3("log", arguments);
                }, t4.warn = function() {
                  n3("warn", arguments);
                }, t4.error = function() {
                  n3("error", arguments);
                };
              })(i2, e3, t3), i2.readyState && i2.readyState.state >= 3 || !i2.on) return o2();
              function o2() {
                n2.call(e3, i2, a2);
              }
              i2.on(r3, o2);
            };
          }
        })(e2, t2, r2), e2.plugin_version = wi, e2;
      })({ init: function(e2) {
        e2 && !mi && (mi = e2).registerInterceptor("businessStage", { getUtmData: { priority: 0, entry: function() {
          return (function() {
            var e3 = bi.split(" "), t2 = "", r2 = {};
            mi._.isArray(mi.para.source_channel) && mi.para.source_channel.length > 0 && (e3 = e3.concat(mi.para.source_channel), e3 = mi._.unique(e3));
            return mi._.each(e3, function(e4) {
              (t2 = mi._.getQueryParam(location.href, e4)).length && (r2[e4] = t2);
            }), r2;
          })();
        } } });
      } }, "Utm", "sdkAfterInitPara"), ki = "1.27.11";
      var Pi = false, Ci = null;
      function Oi() {
        Pi = true;
      }
      function ji() {
        Pi = false;
      }
      function Ni() {
        return Pi;
      }
      var Ti, Ii, Ai = (function(e2, t2, r2) {
        return (function(e3, t3, r3) {
          if (e3.plugin_name = t3, e3.init) {
            var n2 = e3.init;
            e3.init = function(i2, a2) {
              if ((function(e4, t4, r4) {
                function n3(t5, n4) {
                  e4.logger ? e4.logger.msg.apply(e4.logger, n4).module(r4 + "").level(t5).log() : e4.log && e4.log.apply(e4, n4);
                }
                t4.log = function() {
                  n3("log", arguments);
                }, t4.warn = function() {
                  n3("warn", arguments);
                }, t4.error = function() {
                  n3("error", arguments);
                };
              })(i2, e3, t3), i2.readyState && i2.readyState.state >= 3 || !i2.on) return o2();
              function o2() {
                n2.call(e3, i2, a2);
              }
              i2.on(r3, o2);
            };
          }
        })(e2, t2, r2), e2.plugin_version = ki, e2;
      })({ init: function(e2) {
        (Ci = e2).disableSDK = Oi, Ci.enableSDK = ji, Ci.getDisabled = Ni;
      } }, "DisableSDK", "sdkInitAPI"), Di = "1.27.11";
      function $i(e2, t2) {
        if (true === Ti.para.debug_mode) {
          var r2 = e2.data;
          e2.callback;
          !(function(e3) {
            var t3 = e3, r3 = "";
            r3 = -1 !== Ti.para.debug_mode_url.indexOf("?") ? Ti.para.debug_mode_url + "&" + Ti.kit.encodeTrackData(e3) : Ti.para.debug_mode_url + "?" + Ti.kit.encodeTrackData(e3), Ii.ajax({ url: r3, type: "GET", cors: true, header: { "Dry-Run": String(Ti.para.debug_mode_upload) }, success: function(e4) {
              true === Ii.isEmptyObject(e4) ? alert("debug数据发送成功" + t3) : alert("debug失败 错误原因" + JSON.stringify(e4));
            } });
          })(JSON.stringify(r2)), t2.cancellationToken.stop();
        }
        return e2;
      }
      function xi() {
        Ti.on("sdkInitPara", function() {
          true === Ti.para.debug_mode && (Ti.para.debug_mode_upload = Ti.para.debug_mode_upload || false, Ii.isString(Ti.para.debug_mode_url) || (Ii.isString(Ti.para.server_url) ? Ti.para.debug_mode_url = Ti.para.server_url.replace("sa.gif", "debug") : Ii.isArray(Ti.para.server_url) && Ii.isString(Ti.para.server_url[0]) ? Ti.para.debug_mode_url = Ti.para.server_url[0].replace("sa.gif", "debug") : Ti.para.debug_mode = false));
        }), Ti.on("sdkAfterInitPara", function() {
          Ti.registerInterceptor("sendDataStage", { send: { priority: 30, entry: $i } });
        });
      }
      var Ei, Li, Ui = (function(e2, t2, r2) {
        return e2.plugin_version = Di, e2;
      })({ plugin_name: "DebugSender", init: function(e2) {
        Ii = (Ti = e2)._, xi();
      } }), Ri = "1.27.11";
      function Bi(e2, t2) {
        if (Li.isObject(Ei.para.jsapp) && !Ei.para.jsapp.isOnline && "function" == typeof Ei.para.jsapp.setData) {
          var r2 = e2;
          delete r2.callback, r2 = JSON.stringify(r2), Ei.para.jsapp.setData(r2), t2.cancellationToken.stop();
        }
        return e2;
      }
      function Hi(e2) {
        if (true === e2 && Li.isObject(Ei.para.jsapp) && "function" == typeof Ei.para.jsapp.getData) {
          Ei.para.jsapp.isOnline = true;
          var t2 = Ei.para.jsapp.getData();
          Li.isArray(t2) && t2.length > 0 && Li.each(t2, function(e3) {
            Li.isJSONString(e3) && Ei.kit.sendData(JSON.parse(e3));
          });
        } else Ei.para.jsapp.isOnline = false;
      }
      var Ji, Mi, qi = (function(e2, t2, r2) {
        return e2.plugin_version = Ri, e2;
      })({ plugin_name: "JsappSender", init: function(e2) {
        Li = (Ei = e2)._, Ei.on("sdkAfterInitAPI", function() {
          Li.isObject(Ei.commonWays) && (Ei.commonWays.setOnlineState = Hi), Ei.registerInterceptor("sendDataStage", { send: { priority: 40, entry: Bi } });
        });
      } }), Fi = "1.27.11";
      var Ki = null;
      function Vi(e2, t2) {
        return !Ji.para.app_js_bridge && Ji.para.batch_send && Mi.localStorage.isSupport() && localStorage.length < Ji.para.batch_send.storage_length && (Ki.add(e2.data), t2.cancellationToken.stop()), e2;
      }
      function zi() {
        Ji.on("sdkInitPara", function() {
          var e2;
          e2 = { datasend_timeout: 6e3, send_interval: 6e3, storage_length: 200 }, Mi.localStorage.isSupport() && Mi.isSupportCors() && "object" == typeof localStorage ? true === Ji.para.batch_send ? Ji.para.batch_send = Mi.extend({}, e2) : "object" == typeof Ji.para.batch_send && (Ji.para.batch_send = Mi.extend({}, e2, Ji.para.batch_send)) : Ji.para.batch_send = false;
        }), Ji.on("sdkAfterInitPara", function() {
          !Ji.para.app_js_bridge && Ji.para.batch_send && Mi.localStorage.isSupport() && (Ki || (Ki = new Mi.BatchSend()), Ki.batchInterval(), Ji.registerInterceptor("sendDataStage", { send: { priority: 100, entry: Vi } }));
        });
      }
      var Wi, Xi, Zi = (function(e2, t2, r2) {
        return e2.plugin_version = Fi, e2;
      })({ plugin_name: "BatchSender", init: function(e2) {
        Mi = (Ji = e2)._, zi();
      } }), Yi = "1.27.11";
      function Gi(e2) {
        new Xi.BeaconSend(e2).start();
      }
      function Qi(e2, t2) {
        var r2 = null, n2 = null;
        if (Xi.isObject(e2.config) && (r2 = e2.config.send_type, n2 = Xi.optimizeServerUrl(e2.config.server_url)), ("beacon" === r2 || !r2 && "beacon" === Wi.para.send_type) && Xi.isSupportBeaconSend()) {
          var i2 = n2 || e2.server_url;
          e2.server_url = i2, e2.data = Wi.kit.encodeTrackData(e2.data), Xi.isArray(i2) && i2.length ? Xi.each(i2, function(t3) {
            e2.callback = null, e2.server_url = t3, Gi(e2);
          }) : "string" == typeof i2 && "" !== i2 ? Gi(e2) : Wi.log("当前 server_url 为空或不正确，只在控制台打印日志，network 中不会发数据，请配置正确的 server_url！"), t2.cancellationToken.stop();
        }
        return e2;
      }
      function ea() {
        Wi.on("sdkInitPara", function() {
          "beacon" !== Wi.para.send_type || Xi.isSupportBeaconSend() || (Wi.para.send_type = Wi.DEFAULT_SEND_TYPE);
        }), Wi.on("sdkAfterInitPara", function() {
          Wi.registerInterceptor("sendDataStage", { send: { priority: 110, entry: Qi } });
        });
      }
      var ta, ra, na = (function(e2, t2, r2) {
        return e2.plugin_version = Yi, e2;
      })({ plugin_name: "BeaconSender", init: function(e2) {
        Xi = (Wi = e2)._, ea();
      } }), ia = "1.27.11";
      function aa(e2) {
        new ra.AjaxSend(e2).start();
      }
      function oa(e2, t2) {
        var r2 = null, n2 = null;
        if (ra.isObject(e2.config) && (r2 = e2.config.send_type, n2 = ra.optimizeServerUrl(e2.config.server_url)), ("ajax" === r2 || !r2 && "ajax" === ta.para.send_type) && ra.isSupportCors()) {
          var i2 = n2 || e2.server_url;
          e2.server_url = i2, e2.data = ta.kit.encodeTrackData(e2.data), ra.isArray(i2) && i2.length ? ra.each(i2, function(t3) {
            e2.callback = null, e2.server_url = t3, aa(e2);
          }) : "string" == typeof i2 && "" !== i2 ? aa(e2) : ta.log("当前 server_url 为空或不正确，只在控制台打印日志，network 中不会发数据，请配置正确的 server_url！"), t2.cancellationToken.stop();
        }
        return e2;
      }
      function sa() {
        ta.on("sdkInitPara", function() {
          "ajax" !== ta.para.send_type || ra.isSupportCors() || (ta.para.send_type = ta.DEFAULT_SEND_TYPE);
        }), ta.on("sdkAfterInitPara", function() {
          ta.registerInterceptor("sendDataStage", { send: { priority: 120, entry: oa } });
        });
      }
      var la, ua, ca = (function(e2, t2, r2) {
        return e2.plugin_version = ia, e2;
      })({ plugin_name: "AjaxSender", init: function(e2) {
        ra = (ta = e2)._, sa();
      } }), pa = "1.27.11";
      function da(e2, t2) {
        var r2 = la.kit.encodeTrackData(t2);
        return -1 !== e2.indexOf("?") ? e2 + "&" + r2 : e2 + "?" + r2;
      }
      function fa(e2) {
        new ua.ImageSend(e2).start();
      }
      function ga(e2, t2) {
        var r2 = null;
        ua.isObject(e2.config) && (r2 = ua.optimizeServerUrl(e2.config.server_url));
        var n2 = r2 || e2.server_url, i2 = e2.data;
        e2.server_url = n2, ua.isArray(n2) && n2.length ? ua.each(n2, function(t3) {
          t3 && (e2.data = da(t3, i2), e2.callback = null, e2.server_url = t3, fa(e2));
        }) : "string" == typeof n2 && "" !== n2 ? (e2.data = da(n2, i2), fa(e2)) : la.logger && la.logger.msg("当前 server_url 为空或不正确，只在控制台打印日志，network 中不会发数据，请配置正确的 server_url！").level("warn").log(), t2.cancellationToken.stop();
      }
      function _a() {
        la.on("sdkInitPara", function() {
          "image" !== la.para.send_type && "ajax" !== la.para.send_type && "beacon" !== la.para.send_type && (la.para.send_type = "image");
        }), la.on("sdkAfterInitPara", function() {
          la.registerInterceptor("sendDataStage", { send: { priority: 130, entry: ga } });
        });
      }
      var ha = (function(e2, t2, r2) {
        return e2.plugin_version = pa, e2;
      })({ plugin_name: "ImageSender", init: function(e2) {
        ua = (la = e2)._, _a();
      } });
      var ma = null, va = null, ya = [], ba = (function(e2, t2, r2) {
        return (function(e3, t3, r3) {
          if (e3.plugin_name = t3, r3) ;
        })(e2, t2, r2), e2.plugin_version = Re, e2;
      })({ init: function(e2) {
        e2 && (va = (ma = e2)._, ma.logger && ma.logger.appendWriter(wa), ma.on && ma.on("sdkAfterInitPara", function() {
          for (var e3 = 0; e3 < ya.length; e3++) Sa(ya[e3]);
          ya = null;
        }), ma.on && ma.on("sdkInitAPI", function() {
          ma.enableLocalLog = Oa, ma.disableLocalLog = ja;
        }));
      } }, "ConsoleLogger");
      function wa(e2) {
        null !== ya ? ya.push(e2) : Sa(e2);
      }
      function Sa(e2) {
        try {
          if ("log" === e2.level && ka()) return void Pa(e2);
          if ("warn" === e2.level && (function() {
            if (Na()) return true;
            return ka() || va.isObject(ma.para.show_log) && "warn" === ma.para.show_log.level;
          })()) return void Pa(e2);
          if ("error" === e2.level && (function() {
            if (Na()) return true;
            if (va.isObject(ma.para.show_log)) return "none" !== ma.para.show_log.level;
            return true;
          })()) return void Pa(e2);
        } catch (t2) {
        }
      }
      function ka() {
        return !!Na() || (true === ma.para.show_log || va.isObject(ma.para.show_log) && "log" === ma.para.show_log.level);
      }
      function Pa(e2) {
        var t2 = e2.content, r2 = va.isObject(t2[0]) ? va.formatJsonString(t2[0]) : t2[0], n2 = (function(e3) {
          var t3 = "", r3 = "", n3 = ma.para.show_log;
          va.isObject(n3) && false === n3.show_brand || (t3 += e3.brand);
          va.isObject(n3) && false === n3.show_level || (t3 += (t3.length > 0 ? "-" : "") + e3.level);
          t3.length > 0 && (t3 = "[" + t3 + "]");
          va.isObject(n3) && false === n3.show_module || (r3 = e3.module);
          return t3 + r3;
        })(e2);
        t2[0] = n2 + (n2.length > 0 ? ": " : "") + r2;
        try {
          console && (va.isFunction(console[e2.level]) ? console[e2.level].apply(console, t2) : va.isObject(console[e2.level]) && console[e2.level](t2[0]));
        } catch (i2) {
        }
      }
      var Ca = "sensorsdata_jssdk_debug";
      function Oa() {
        va.sessionStorage.isSupport() && sessionStorage.setItem(Ca, "true");
      }
      function ja() {
        va.sessionStorage.isSupport() && sessionStorage.removeItem(Ca);
      }
      function Na() {
        return va.sessionStorage.isSupport() && "true" === sessionStorage.getItem(Ca);
      }
      t.modules = t.modules || {};
      for (var Ta = [ba, Br, tn, kn, jn, Jn, Wn, Qn, ni, oi, ui, _i, yi, Si, Ai, Ui, qi, Zi, na, ca, ha], Ia = [ba, Ur, Si, Ai, qi, Ui, tn, Wn, kn, Qn, Zi, na, ca, ha], Aa = 0; Aa < Ta.length; Aa++) {
        var Da = Ta[Aa];
        t._.isString(Da.plugin_name) ? t.modules[Da.plugin_name] = Da : t._.isArray(Da.plugin_name) && t._.each(Da.plugin_name, function(e2) {
          t.modules[e2] = Da;
        });
      }
      for (Aa = 0; Aa < Ia.length; Aa++) t.use(Ia[Aa]);
      var $a = t;
      try {
        "string" == typeof window.sensorsDataAnalytic201505 ? (t.para = window[sensorsDataAnalytic201505].para, t._q = window[sensorsDataAnalytic201505]._q, window[sensorsDataAnalytic201505] = t, window.sensorsDataAnalytic201505 = t, t.init()) : "undefined" == typeof window.sensorsDataAnalytic201505 ? window.sensorsDataAnalytic201505 = t : $a = window.sensorsDataAnalytic201505;
      } catch (Ea) {
        xe(Ea);
      }
      var xa = $a;
      return xa.DEFAULT_SEND_TYPE = "image", xa;
    });
  })(sensorsdata$2);
  return sensorsdata$2.exports;
}
var sensorsdataExports = requireSensorsdata();
const sensorsdata = /* @__PURE__ */ getDefaultExportFromCjs(sensorsdataExports);
const sensorsdata$1 = /* @__PURE__ */ _mergeNamespaces({
  __proto__: null,
  default: sensorsdata
}, [sensorsdataExports]);
export {
  sensorsdata$1 as s
};
