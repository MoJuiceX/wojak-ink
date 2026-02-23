import { g as rs, a as Ho, c as ft } from "./wallet-connect-standalone-runtime-ByX85dGu.js";
import { f as le, t as ue, c as Ut, d as os, e as is, b as ss, a as as, g as fs, r as cs } from "./wallet-connect-standalone-wallet-crypto-CtgPRmL-.js";
import { C as us, s as ls } from "./wallet-connect-standalone-wallet-protocol-DyKo_wW-.js";
var qt = { exports: {} }, Ar;
function hs() {
  if (Ar) return qt.exports;
  Ar = 1;
  var e = typeof Reflect == "object" ? Reflect : null, t = e && typeof e.apply == "function" ? e.apply : function(v, _, B) {
    return Function.prototype.apply.call(v, _, B);
  }, n;
  e && typeof e.ownKeys == "function" ? n = e.ownKeys : Object.getOwnPropertySymbols ? n = function(v) {
    return Object.getOwnPropertyNames(v).concat(Object.getOwnPropertySymbols(v));
  } : n = function(v) {
    return Object.getOwnPropertyNames(v);
  };
  function r(E) {
    console && console.warn && console.warn(E);
  }
  var o = Number.isNaN || function(v) {
    return v !== v;
  };
  function i() {
    i.init.call(this);
  }
  qt.exports = i, qt.exports.once = $, i.EventEmitter = i, i.prototype._events = void 0, i.prototype._eventsCount = 0, i.prototype._maxListeners = void 0;
  var a = 10;
  function f(E) {
    if (typeof E != "function")
      throw new TypeError('The "listener" argument must be of type Function. Received type ' + typeof E);
  }
  Object.defineProperty(i, "defaultMaxListeners", {
    enumerable: !0,
    get: function() {
      return a;
    },
    set: function(E) {
      if (typeof E != "number" || E < 0 || o(E))
        throw new RangeError('The value of "defaultMaxListeners" is out of range. It must be a non-negative number. Received ' + E + ".");
      a = E;
    }
  }), i.init = function() {
    (this._events === void 0 || this._events === Object.getPrototypeOf(this)._events) && (this._events = /* @__PURE__ */ Object.create(null), this._eventsCount = 0), this._maxListeners = this._maxListeners || void 0;
  }, i.prototype.setMaxListeners = function(v) {
    if (typeof v != "number" || v < 0 || o(v))
      throw new RangeError('The value of "n" is out of range. It must be a non-negative number. Received ' + v + ".");
    return this._maxListeners = v, this;
  };
  function l(E) {
    return E._maxListeners === void 0 ? i.defaultMaxListeners : E._maxListeners;
  }
  i.prototype.getMaxListeners = function() {
    return l(this);
  }, i.prototype.emit = function(v) {
    for (var _ = [], B = 1; B < arguments.length; B++) _.push(arguments[B]);
    var U = v === "error", S = this._events;
    if (S !== void 0)
      U = U && S.error === void 0;
    else if (!U)
      return !1;
    if (U) {
      var R;
      if (_.length > 0 && (R = _[0]), R instanceof Error)
        throw R;
      var k = new Error("Unhandled error." + (R ? " (" + R.message + ")" : ""));
      throw k.context = R, k;
    }
    var x = S[v];
    if (x === void 0)
      return !1;
    if (typeof x == "function")
      t(x, this, _);
    else
      for (var y = x.length, w = p(x, y), B = 0; B < y; ++B)
        t(w[B], this, _);
    return !0;
  };
  function s(E, v, _, B) {
    var U, S, R;
    if (f(_), S = E._events, S === void 0 ? (S = E._events = /* @__PURE__ */ Object.create(null), E._eventsCount = 0) : (S.newListener !== void 0 && (E.emit(
      "newListener",
      v,
      _.listener ? _.listener : _
    ), S = E._events), R = S[v]), R === void 0)
      R = S[v] = _, ++E._eventsCount;
    else if (typeof R == "function" ? R = S[v] = B ? [_, R] : [R, _] : B ? R.unshift(_) : R.push(_), U = l(E), U > 0 && R.length > U && !R.warned) {
      R.warned = !0;
      var k = new Error("Possible EventEmitter memory leak detected. " + R.length + " " + String(v) + " listeners added. Use emitter.setMaxListeners() to increase limit");
      k.name = "MaxListenersExceededWarning", k.emitter = E, k.type = v, k.count = R.length, r(k);
    }
    return E;
  }
  i.prototype.addListener = function(v, _) {
    return s(this, v, _, !1);
  }, i.prototype.on = i.prototype.addListener, i.prototype.prependListener = function(v, _) {
    return s(this, v, _, !0);
  };
  function c() {
    if (!this.fired)
      return this.target.removeListener(this.type, this.wrapFn), this.fired = !0, arguments.length === 0 ? this.listener.call(this.target) : this.listener.apply(this.target, arguments);
  }
  function h(E, v, _) {
    var B = { fired: !1, wrapFn: void 0, target: E, type: v, listener: _ }, U = c.bind(B);
    return U.listener = _, B.wrapFn = U, U;
  }
  i.prototype.once = function(v, _) {
    return f(_), this.on(v, h(this, v, _)), this;
  }, i.prototype.prependOnceListener = function(v, _) {
    return f(_), this.prependListener(v, h(this, v, _)), this;
  }, i.prototype.removeListener = function(v, _) {
    var B, U, S, R, k;
    if (f(_), U = this._events, U === void 0)
      return this;
    if (B = U[v], B === void 0)
      return this;
    if (B === _ || B.listener === _)
      --this._eventsCount === 0 ? this._events = /* @__PURE__ */ Object.create(null) : (delete U[v], U.removeListener && this.emit("removeListener", v, B.listener || _));
    else if (typeof B != "function") {
      for (S = -1, R = B.length - 1; R >= 0; R--)
        if (B[R] === _ || B[R].listener === _) {
          k = B[R].listener, S = R;
          break;
        }
      if (S < 0)
        return this;
      S === 0 ? B.shift() : g(B, S), B.length === 1 && (U[v] = B[0]), U.removeListener !== void 0 && this.emit("removeListener", v, k || _);
    }
    return this;
  }, i.prototype.off = i.prototype.removeListener, i.prototype.removeAllListeners = function(v) {
    var _, B, U;
    if (B = this._events, B === void 0)
      return this;
    if (B.removeListener === void 0)
      return arguments.length === 0 ? (this._events = /* @__PURE__ */ Object.create(null), this._eventsCount = 0) : B[v] !== void 0 && (--this._eventsCount === 0 ? this._events = /* @__PURE__ */ Object.create(null) : delete B[v]), this;
    if (arguments.length === 0) {
      var S = Object.keys(B), R;
      for (U = 0; U < S.length; ++U)
        R = S[U], R !== "removeListener" && this.removeAllListeners(R);
      return this.removeAllListeners("removeListener"), this._events = /* @__PURE__ */ Object.create(null), this._eventsCount = 0, this;
    }
    if (_ = B[v], typeof _ == "function")
      this.removeListener(v, _);
    else if (_ !== void 0)
      for (U = _.length - 1; U >= 0; U--)
        this.removeListener(v, _[U]);
    return this;
  };
  function u(E, v, _) {
    var B = E._events;
    if (B === void 0)
      return [];
    var U = B[v];
    return U === void 0 ? [] : typeof U == "function" ? _ ? [U.listener || U] : [U] : _ ? b(U) : p(U, U.length);
  }
  i.prototype.listeners = function(v) {
    return u(this, v, !0);
  }, i.prototype.rawListeners = function(v) {
    return u(this, v, !1);
  }, i.listenerCount = function(E, v) {
    return typeof E.listenerCount == "function" ? E.listenerCount(v) : d.call(E, v);
  }, i.prototype.listenerCount = d;
  function d(E) {
    var v = this._events;
    if (v !== void 0) {
      var _ = v[E];
      if (typeof _ == "function")
        return 1;
      if (_ !== void 0)
        return _.length;
    }
    return 0;
  }
  i.prototype.eventNames = function() {
    return this._eventsCount > 0 ? n(this._events) : [];
  };
  function p(E, v) {
    for (var _ = new Array(v), B = 0; B < v; ++B)
      _[B] = E[B];
    return _;
  }
  function g(E, v) {
    for (; v + 1 < E.length; v++)
      E[v] = E[v + 1];
    E.pop();
  }
  function b(E) {
    for (var v = new Array(E.length), _ = 0; _ < v.length; ++_)
      v[_] = E[_].listener || E[_];
    return v;
  }
  function $(E, v) {
    return new Promise(function(_, B) {
      function U(R) {
        E.removeListener(v, S), B(R);
      }
      function S() {
        typeof E.removeListener == "function" && E.removeListener("error", U), _([].slice.call(arguments));
      }
      A(E, v, S, { once: !0 }), v !== "error" && C(E, U, { once: !0 });
    });
  }
  function C(E, v, _) {
    typeof E.on == "function" && A(E, "error", v, _);
  }
  function A(E, v, _, B) {
    if (typeof E.on == "function")
      B.once ? E.once(v, _) : E.on(v, _);
    else if (typeof E.addEventListener == "function")
      E.addEventListener(v, function U(S) {
        B.once && E.removeEventListener(v, U), _(S);
      });
    else
      throw new TypeError('The "emitter" argument must be of type EventEmitter. Received type ' + typeof E);
  }
  return qt.exports;
}
var zo = hs();
const td = /* @__PURE__ */ rs(zo);
var In = {};
var Vn = function(e, t) {
  return Vn = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(n, r) {
    n.__proto__ = r;
  } || function(n, r) {
    for (var o in r) r.hasOwnProperty(o) && (n[o] = r[o]);
  }, Vn(e, t);
};
function ds(e, t) {
  Vn(e, t);
  function n() {
    this.constructor = e;
  }
  e.prototype = t === null ? Object.create(t) : (n.prototype = t.prototype, new n());
}
var Wn = function() {
  return Wn = Object.assign || function(t) {
    for (var n, r = 1, o = arguments.length; r < o; r++) {
      n = arguments[r];
      for (var i in n) Object.prototype.hasOwnProperty.call(n, i) && (t[i] = n[i]);
    }
    return t;
  }, Wn.apply(this, arguments);
};
function ps(e, t) {
  var n = {};
  for (var r in e) Object.prototype.hasOwnProperty.call(e, r) && t.indexOf(r) < 0 && (n[r] = e[r]);
  if (e != null && typeof Object.getOwnPropertySymbols == "function")
    for (var o = 0, r = Object.getOwnPropertySymbols(e); o < r.length; o++)
      t.indexOf(r[o]) < 0 && Object.prototype.propertyIsEnumerable.call(e, r[o]) && (n[r[o]] = e[r[o]]);
  return n;
}
function gs(e, t, n, r) {
  var o = arguments.length, i = o < 3 ? t : r === null ? r = Object.getOwnPropertyDescriptor(t, n) : r, a;
  if (typeof Reflect == "object" && typeof Reflect.decorate == "function") i = Reflect.decorate(e, t, n, r);
  else for (var f = e.length - 1; f >= 0; f--) (a = e[f]) && (i = (o < 3 ? a(i) : o > 3 ? a(t, n, i) : a(t, n)) || i);
  return o > 3 && i && Object.defineProperty(t, n, i), i;
}
function ys(e, t) {
  return function(n, r) {
    t(n, r, e);
  };
}
function ws(e, t) {
  if (typeof Reflect == "object" && typeof Reflect.metadata == "function") return Reflect.metadata(e, t);
}
function bs(e, t, n, r) {
  function o(i) {
    return i instanceof n ? i : new n(function(a) {
      a(i);
    });
  }
  return new (n || (n = Promise))(function(i, a) {
    function f(c) {
      try {
        s(r.next(c));
      } catch (h) {
        a(h);
      }
    }
    function l(c) {
      try {
        s(r.throw(c));
      } catch (h) {
        a(h);
      }
    }
    function s(c) {
      c.done ? i(c.value) : o(c.value).then(f, l);
    }
    s((r = r.apply(e, t || [])).next());
  });
}
function ms(e, t) {
  var n = { label: 0, sent: function() {
    if (i[0] & 1) throw i[1];
    return i[1];
  }, trys: [], ops: [] }, r, o, i, a;
  return a = { next: f(0), throw: f(1), return: f(2) }, typeof Symbol == "function" && (a[Symbol.iterator] = function() {
    return this;
  }), a;
  function f(s) {
    return function(c) {
      return l([s, c]);
    };
  }
  function l(s) {
    if (r) throw new TypeError("Generator is already executing.");
    for (; n; ) try {
      if (r = 1, o && (i = s[0] & 2 ? o.return : s[0] ? o.throw || ((i = o.return) && i.call(o), 0) : o.next) && !(i = i.call(o, s[1])).done) return i;
      switch (o = 0, i && (s = [s[0] & 2, i.value]), s[0]) {
        case 0:
        case 1:
          i = s;
          break;
        case 4:
          return n.label++, { value: s[1], done: !1 };
        case 5:
          n.label++, o = s[1], s = [0];
          continue;
        case 7:
          s = n.ops.pop(), n.trys.pop();
          continue;
        default:
          if (i = n.trys, !(i = i.length > 0 && i[i.length - 1]) && (s[0] === 6 || s[0] === 2)) {
            n = 0;
            continue;
          }
          if (s[0] === 3 && (!i || s[1] > i[0] && s[1] < i[3])) {
            n.label = s[1];
            break;
          }
          if (s[0] === 6 && n.label < i[1]) {
            n.label = i[1], i = s;
            break;
          }
          if (i && n.label < i[2]) {
            n.label = i[2], n.ops.push(s);
            break;
          }
          i[2] && n.ops.pop(), n.trys.pop();
          continue;
      }
      s = t.call(e, n);
    } catch (c) {
      s = [6, c], o = 0;
    } finally {
      r = i = 0;
    }
    if (s[0] & 5) throw s[1];
    return { value: s[0] ? s[1] : void 0, done: !0 };
  }
}
function vs(e, t, n, r) {
  r === void 0 && (r = n), e[r] = t[n];
}
function Es(e, t) {
  for (var n in e) n !== "default" && !t.hasOwnProperty(n) && (t[n] = e[n]);
}
function qn(e) {
  var t = typeof Symbol == "function" && Symbol.iterator, n = t && e[t], r = 0;
  if (n) return n.call(e);
  if (e && typeof e.length == "number") return {
    next: function() {
      return e && r >= e.length && (e = void 0), { value: e && e[r++], done: !e };
    }
  };
  throw new TypeError(t ? "Object is not iterable." : "Symbol.iterator is not defined.");
}
function Vo(e, t) {
  var n = typeof Symbol == "function" && e[Symbol.iterator];
  if (!n) return e;
  var r = n.call(e), o, i = [], a;
  try {
    for (; (t === void 0 || t-- > 0) && !(o = r.next()).done; ) i.push(o.value);
  } catch (f) {
    a = { error: f };
  } finally {
    try {
      o && !o.done && (n = r.return) && n.call(r);
    } finally {
      if (a) throw a.error;
    }
  }
  return i;
}
function Os() {
  for (var e = [], t = 0; t < arguments.length; t++)
    e = e.concat(Vo(arguments[t]));
  return e;
}
function _s() {
  for (var e = 0, t = 0, n = arguments.length; t < n; t++) e += arguments[t].length;
  for (var r = Array(e), o = 0, t = 0; t < n; t++)
    for (var i = arguments[t], a = 0, f = i.length; a < f; a++, o++)
      r[o] = i[a];
  return r;
}
function Tt(e) {
  return this instanceof Tt ? (this.v = e, this) : new Tt(e);
}
function Is(e, t, n) {
  if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
  var r = n.apply(e, t || []), o, i = [];
  return o = {}, a("next"), a("throw"), a("return"), o[Symbol.asyncIterator] = function() {
    return this;
  }, o;
  function a(u) {
    r[u] && (o[u] = function(d) {
      return new Promise(function(p, g) {
        i.push([u, d, p, g]) > 1 || f(u, d);
      });
    });
  }
  function f(u, d) {
    try {
      l(r[u](d));
    } catch (p) {
      h(i[0][3], p);
    }
  }
  function l(u) {
    u.value instanceof Tt ? Promise.resolve(u.value.v).then(s, c) : h(i[0][2], u);
  }
  function s(u) {
    f("next", u);
  }
  function c(u) {
    f("throw", u);
  }
  function h(u, d) {
    u(d), i.shift(), i.length && f(i[0][0], i[0][1]);
  }
}
function Ss(e) {
  var t, n;
  return t = {}, r("next"), r("throw", function(o) {
    throw o;
  }), r("return"), t[Symbol.iterator] = function() {
    return this;
  }, t;
  function r(o, i) {
    t[o] = e[o] ? function(a) {
      return (n = !n) ? { value: Tt(e[o](a)), done: o === "return" } : i ? i(a) : a;
    } : i;
  }
}
function xs(e) {
  if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
  var t = e[Symbol.asyncIterator], n;
  return t ? t.call(e) : (e = typeof qn == "function" ? qn(e) : e[Symbol.iterator](), n = {}, r("next"), r("throw"), r("return"), n[Symbol.asyncIterator] = function() {
    return this;
  }, n);
  function r(i) {
    n[i] = e[i] && function(a) {
      return new Promise(function(f, l) {
        a = e[i](a), o(f, l, a.done, a.value);
      });
    };
  }
  function o(i, a, f, l) {
    Promise.resolve(l).then(function(s) {
      i({ value: s, done: f });
    }, a);
  }
}
function Bs(e, t) {
  return Object.defineProperty ? Object.defineProperty(e, "raw", { value: t }) : e.raw = t, e;
}
function Ns(e) {
  if (e && e.__esModule) return e;
  var t = {};
  if (e != null) for (var n in e) Object.hasOwnProperty.call(e, n) && (t[n] = e[n]);
  return t.default = e, t;
}
function As(e) {
  return e && e.__esModule ? e : { default: e };
}
function js(e, t) {
  if (!t.has(e))
    throw new TypeError("attempted to get private field on non-instance");
  return t.get(e);
}
function Us(e, t, n) {
  if (!t.has(e))
    throw new TypeError("attempted to set private field on non-instance");
  return t.set(e, n), n;
}
const Ls = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  get __assign() {
    return Wn;
  },
  __asyncDelegator: Ss,
  __asyncGenerator: Is,
  __asyncValues: xs,
  __await: Tt,
  __awaiter: bs,
  __classPrivateFieldGet: js,
  __classPrivateFieldSet: Us,
  __createBinding: vs,
  __decorate: gs,
  __exportStar: Es,
  __extends: ds,
  __generator: ms,
  __importDefault: As,
  __importStar: Ns,
  __makeTemplateObject: Bs,
  __metadata: ws,
  __param: ys,
  __read: Vo,
  __rest: ps,
  __spread: Os,
  __spreadArrays: _s,
  __values: qn
}, Symbol.toStringTag, { value: "Module" })), ln = /* @__PURE__ */ Ho(Ls);
var Sn = {}, It = {}, jr;
function Rs() {
  if (jr) return It;
  jr = 1, Object.defineProperty(It, "__esModule", { value: !0 }), It.delay = void 0;
  function e(t) {
    return new Promise((n) => {
      setTimeout(() => {
        n(!0);
      }, t);
    });
  }
  return It.delay = e, It;
}
var Ye = {}, xn = {}, Ze = {}, Ur;
function Ts() {
  return Ur || (Ur = 1, Object.defineProperty(Ze, "__esModule", { value: !0 }), Ze.ONE_THOUSAND = Ze.ONE_HUNDRED = void 0, Ze.ONE_HUNDRED = 100, Ze.ONE_THOUSAND = 1e3), Ze;
}
var Bn = {}, Lr;
function Ps() {
  return Lr || (Lr = 1, (function(e) {
    Object.defineProperty(e, "__esModule", { value: !0 }), e.ONE_YEAR = e.FOUR_WEEKS = e.THREE_WEEKS = e.TWO_WEEKS = e.ONE_WEEK = e.THIRTY_DAYS = e.SEVEN_DAYS = e.FIVE_DAYS = e.THREE_DAYS = e.ONE_DAY = e.TWENTY_FOUR_HOURS = e.TWELVE_HOURS = e.SIX_HOURS = e.THREE_HOURS = e.ONE_HOUR = e.SIXTY_MINUTES = e.THIRTY_MINUTES = e.TEN_MINUTES = e.FIVE_MINUTES = e.ONE_MINUTE = e.SIXTY_SECONDS = e.THIRTY_SECONDS = e.TEN_SECONDS = e.FIVE_SECONDS = e.ONE_SECOND = void 0, e.ONE_SECOND = 1, e.FIVE_SECONDS = 5, e.TEN_SECONDS = 10, e.THIRTY_SECONDS = 30, e.SIXTY_SECONDS = 60, e.ONE_MINUTE = e.SIXTY_SECONDS, e.FIVE_MINUTES = e.ONE_MINUTE * 5, e.TEN_MINUTES = e.ONE_MINUTE * 10, e.THIRTY_MINUTES = e.ONE_MINUTE * 30, e.SIXTY_MINUTES = e.ONE_MINUTE * 60, e.ONE_HOUR = e.SIXTY_MINUTES, e.THREE_HOURS = e.ONE_HOUR * 3, e.SIX_HOURS = e.ONE_HOUR * 6, e.TWELVE_HOURS = e.ONE_HOUR * 12, e.TWENTY_FOUR_HOURS = e.ONE_HOUR * 24, e.ONE_DAY = e.TWENTY_FOUR_HOURS, e.THREE_DAYS = e.ONE_DAY * 3, e.FIVE_DAYS = e.ONE_DAY * 5, e.SEVEN_DAYS = e.ONE_DAY * 7, e.THIRTY_DAYS = e.ONE_DAY * 30, e.ONE_WEEK = e.SEVEN_DAYS, e.TWO_WEEKS = e.ONE_WEEK * 2, e.THREE_WEEKS = e.ONE_WEEK * 3, e.FOUR_WEEKS = e.ONE_WEEK * 4, e.ONE_YEAR = e.ONE_DAY * 365;
  })(Bn)), Bn;
}
var Rr;
function Wo() {
  return Rr || (Rr = 1, (function(e) {
    Object.defineProperty(e, "__esModule", { value: !0 });
    const t = ln;
    t.__exportStar(Ts(), e), t.__exportStar(Ps(), e);
  })(xn)), xn;
}
var Tr;
function Cs() {
  if (Tr) return Ye;
  Tr = 1, Object.defineProperty(Ye, "__esModule", { value: !0 }), Ye.fromMiliseconds = Ye.toMiliseconds = void 0;
  const e = Wo();
  function t(r) {
    return r * e.ONE_THOUSAND;
  }
  Ye.toMiliseconds = t;
  function n(r) {
    return Math.floor(r / e.ONE_THOUSAND);
  }
  return Ye.fromMiliseconds = n, Ye;
}
var Pr;
function Ds() {
  return Pr || (Pr = 1, (function(e) {
    Object.defineProperty(e, "__esModule", { value: !0 });
    const t = ln;
    t.__exportStar(Rs(), e), t.__exportStar(Cs(), e);
  })(Sn)), Sn;
}
var ct = {}, Cr;
function $s() {
  if (Cr) return ct;
  Cr = 1, Object.defineProperty(ct, "__esModule", { value: !0 }), ct.Watch = void 0;
  class e {
    constructor() {
      this.timestamps = /* @__PURE__ */ new Map();
    }
    start(n) {
      if (this.timestamps.has(n))
        throw new Error(`Watch already started for label: ${n}`);
      this.timestamps.set(n, { started: Date.now() });
    }
    stop(n) {
      const r = this.get(n);
      if (typeof r.elapsed < "u")
        throw new Error(`Watch already stopped for label: ${n}`);
      const o = Date.now() - r.started;
      this.timestamps.set(n, { started: r.started, elapsed: o });
    }
    get(n) {
      const r = this.timestamps.get(n);
      if (typeof r > "u")
        throw new Error(`No timestamp found for label: ${n}`);
      return r;
    }
    elapsed(n) {
      const r = this.get(n);
      return r.elapsed || Date.now() - r.started;
    }
  }
  return ct.Watch = e, ct.default = e, ct;
}
var Nn = {}, St = {}, Dr;
function ks() {
  if (Dr) return St;
  Dr = 1, Object.defineProperty(St, "__esModule", { value: !0 }), St.IWatch = void 0;
  class e {
  }
  return St.IWatch = e, St;
}
var $r;
function Ms() {
  return $r || ($r = 1, (function(e) {
    Object.defineProperty(e, "__esModule", { value: !0 }), ln.__exportStar(ks(), e);
  })(Nn)), Nn;
}
var kr;
function Fs() {
  return kr || (kr = 1, (function(e) {
    Object.defineProperty(e, "__esModule", { value: !0 });
    const t = ln;
    t.__exportStar(Ds(), e), t.__exportStar($s(), e), t.__exportStar(Ms(), e), t.__exportStar(Wo(), e);
  })(In)), In;
}
var Fe = Fs();
class ot {
}
class Ks extends ot {
  constructor(t) {
    super();
  }
}
const Mr = Fe.FIVE_SECONDS, Hs = { pulse: "heartbeat_pulse" };
let nd = class qo extends Ks {
  constructor(t) {
    super(t), this.events = new zo.EventEmitter(), this.interval = Mr, this.interval = t?.interval || Mr;
  }
  static async init(t) {
    const n = new qo(t);
    return await n.init(), n;
  }
  async init() {
    await this.initialize();
  }
  stop() {
    clearInterval(this.intervalRef);
  }
  on(t, n) {
    this.events.on(t, n);
  }
  once(t, n) {
    this.events.once(t, n);
  }
  off(t, n) {
    this.events.off(t, n);
  }
  removeListener(t, n) {
    this.events.removeListener(t, n);
  }
  async initialize() {
    this.intervalRef = setInterval(() => this.pulse(), Fe.toMiliseconds(this.interval));
  }
  pulse() {
    this.events.emit(Hs.pulse);
  }
};
const zs = /"(?:_|\\u0{2}5[Ff]){2}(?:p|\\u0{2}70)(?:r|\\u0{2}72)(?:o|\\u0{2}6[Ff])(?:t|\\u0{2}74)(?:o|\\u0{2}6[Ff])(?:_|\\u0{2}5[Ff]){2}"\s*:/, Vs = /"(?:c|\\u0063)(?:o|\\u006[Ff])(?:n|\\u006[Ee])(?:s|\\u0073)(?:t|\\u0074)(?:r|\\u0072)(?:u|\\u0075)(?:c|\\u0063)(?:t|\\u0074)(?:o|\\u006[Ff])(?:r|\\u0072)"\s*:/, Ws = /^\s*["[{]|^\s*-?\d{1,16}(\.\d{1,17})?([Ee][+-]?\d+)?\s*$/;
function qs(e, t) {
  if (e === "__proto__" || e === "constructor" && t && typeof t == "object" && "prototype" in t) {
    Gs(e);
    return;
  }
  return t;
}
function Gs(e) {
  console.warn(`[destr] Dropping "${e}" key to prevent prototype pollution.`);
}
function Gt(e, t = {}) {
  if (typeof e != "string")
    return e;
  if (e[0] === '"' && e[e.length - 1] === '"' && e.indexOf("\\") === -1)
    return e.slice(1, -1);
  const n = e.trim();
  if (n.length <= 9)
    switch (n.toLowerCase()) {
      case "true":
        return !0;
      case "false":
        return !1;
      case "undefined":
        return;
      case "null":
        return null;
      case "nan":
        return Number.NaN;
      case "infinity":
        return Number.POSITIVE_INFINITY;
      case "-infinity":
        return Number.NEGATIVE_INFINITY;
    }
  if (!Ws.test(e)) {
    if (t.strict)
      throw new SyntaxError("[destr] Invalid JSON");
    return e;
  }
  try {
    if (zs.test(e) || Vs.test(e)) {
      if (t.strict)
        throw new Error("[destr] Possible prototype pollution");
      return JSON.parse(e, qs);
    }
    return JSON.parse(e);
  } catch (r) {
    if (t.strict)
      throw r;
    return e;
  }
}
function Ys(e) {
  return !e || typeof e.then != "function" ? Promise.resolve(e) : e;
}
function Z(e, ...t) {
  try {
    return Ys(e(...t));
  } catch (n) {
    return Promise.reject(n);
  }
}
function Zs(e) {
  const t = typeof e;
  return e === null || t !== "object" && t !== "function";
}
function Xs(e) {
  const t = Object.getPrototypeOf(e);
  return !t || t.isPrototypeOf(Object);
}
function rn(e) {
  if (Zs(e))
    return String(e);
  if (Xs(e) || Array.isArray(e))
    return JSON.stringify(e);
  if (typeof e.toJSON == "function")
    return rn(e.toJSON());
  throw new Error("[unstorage] Cannot stringify value!");
}
const Gn = "base64:";
function Js(e) {
  return typeof e == "string" ? e : Gn + ta(e);
}
function Qs(e) {
  return typeof e != "string" || !e.startsWith(Gn) ? e : ea(e.slice(Gn.length));
}
function ea(e) {
  return globalThis.Buffer ? Buffer.from(e, "base64") : Uint8Array.from(
    globalThis.atob(e),
    (t) => t.codePointAt(0)
  );
}
function ta(e) {
  return globalThis.Buffer ? Buffer.from(e).toString("base64") : globalThis.btoa(String.fromCodePoint(...e));
}
function oe(e) {
  return e && e.split("?")[0]?.replace(/[/\\]/g, ":").replace(/:+/g, ":").replace(/^:|:$/g, "") || "";
}
function na(...e) {
  return oe(e.join(":"));
}
function Yt(e) {
  return e = oe(e), e ? e + ":" : "";
}
function ra(e, t) {
  if (t === void 0)
    return !0;
  let n = 0, r = e.indexOf(":");
  for (; r > -1; )
    n++, r = e.indexOf(":", r + 1);
  return n <= t;
}
function oa(e, t) {
  return t ? e.startsWith(t) && e[e.length - 1] !== "$" : e[e.length - 1] !== "$";
}
const ia = "memory", sa = () => {
  const e = /* @__PURE__ */ new Map();
  return {
    name: ia,
    getInstance: () => e,
    hasItem(t) {
      return e.has(t);
    },
    getItem(t) {
      return e.get(t) ?? null;
    },
    getItemRaw(t) {
      return e.get(t) ?? null;
    },
    setItem(t, n) {
      e.set(t, n);
    },
    setItemRaw(t, n) {
      e.set(t, n);
    },
    removeItem(t) {
      e.delete(t);
    },
    getKeys() {
      return [...e.keys()];
    },
    clear() {
      e.clear();
    },
    dispose() {
      e.clear();
    }
  };
};
function aa(e = {}) {
  const t = {
    mounts: { "": e.driver || sa() },
    mountpoints: [""],
    watching: !1,
    watchListeners: [],
    unwatch: {}
  }, n = (s) => {
    for (const c of t.mountpoints)
      if (s.startsWith(c))
        return {
          base: c,
          relativeKey: s.slice(c.length),
          driver: t.mounts[c]
        };
    return {
      base: "",
      relativeKey: s,
      driver: t.mounts[""]
    };
  }, r = (s, c) => t.mountpoints.filter(
    (h) => h.startsWith(s) || c && s.startsWith(h)
  ).map((h) => ({
    relativeBase: s.length > h.length ? s.slice(h.length) : void 0,
    mountpoint: h,
    driver: t.mounts[h]
  })), o = (s, c) => {
    if (t.watching) {
      c = oe(c);
      for (const h of t.watchListeners)
        h(s, c);
    }
  }, i = async () => {
    if (!t.watching) {
      t.watching = !0;
      for (const s in t.mounts)
        t.unwatch[s] = await Fr(
          t.mounts[s],
          o,
          s
        );
    }
  }, a = async () => {
    if (t.watching) {
      for (const s in t.unwatch)
        await t.unwatch[s]();
      t.unwatch = {}, t.watching = !1;
    }
  }, f = (s, c, h) => {
    const u = /* @__PURE__ */ new Map(), d = (p) => {
      let g = u.get(p.base);
      return g || (g = {
        driver: p.driver,
        base: p.base,
        items: []
      }, u.set(p.base, g)), g;
    };
    for (const p of s) {
      const g = typeof p == "string", b = oe(g ? p : p.key), $ = g ? void 0 : p.value, C = g || !p.options ? c : { ...c, ...p.options }, A = n(b);
      d(A).items.push({
        key: b,
        value: $,
        relativeKey: A.relativeKey,
        options: C
      });
    }
    return Promise.all([...u.values()].map((p) => h(p))).then(
      (p) => p.flat()
    );
  }, l = {
    // Item
    hasItem(s, c = {}) {
      s = oe(s);
      const { relativeKey: h, driver: u } = n(s);
      return Z(u.hasItem, h, c);
    },
    getItem(s, c = {}) {
      s = oe(s);
      const { relativeKey: h, driver: u } = n(s);
      return Z(u.getItem, h, c).then(
        (d) => Gt(d)
      );
    },
    getItems(s, c = {}) {
      return f(s, c, (h) => h.driver.getItems ? Z(
        h.driver.getItems,
        h.items.map((u) => ({
          key: u.relativeKey,
          options: u.options
        })),
        c
      ).then(
        (u) => u.map((d) => ({
          key: na(h.base, d.key),
          value: Gt(d.value)
        }))
      ) : Promise.all(
        h.items.map((u) => Z(
          h.driver.getItem,
          u.relativeKey,
          u.options
        ).then((d) => ({
          key: u.key,
          value: Gt(d)
        })))
      ));
    },
    getItemRaw(s, c = {}) {
      s = oe(s);
      const { relativeKey: h, driver: u } = n(s);
      return u.getItemRaw ? Z(u.getItemRaw, h, c) : Z(u.getItem, h, c).then(
        (d) => Qs(d)
      );
    },
    async setItem(s, c, h = {}) {
      if (c === void 0)
        return l.removeItem(s);
      s = oe(s);
      const { relativeKey: u, driver: d } = n(s);
      d.setItem && (await Z(d.setItem, u, rn(c), h), d.watch || o("update", s));
    },
    async setItems(s, c) {
      await f(s, c, async (h) => {
        if (h.driver.setItems)
          return Z(
            h.driver.setItems,
            h.items.map((u) => ({
              key: u.relativeKey,
              value: rn(u.value),
              options: u.options
            })),
            c
          );
        h.driver.setItem && await Promise.all(
          h.items.map((u) => Z(
            h.driver.setItem,
            u.relativeKey,
            rn(u.value),
            u.options
          ))
        );
      });
    },
    async setItemRaw(s, c, h = {}) {
      if (c === void 0)
        return l.removeItem(s, h);
      s = oe(s);
      const { relativeKey: u, driver: d } = n(s);
      if (d.setItemRaw)
        await Z(d.setItemRaw, u, c, h);
      else if (d.setItem)
        await Z(d.setItem, u, Js(c), h);
      else
        return;
      d.watch || o("update", s);
    },
    async removeItem(s, c = {}) {
      typeof c == "boolean" && (c = { removeMeta: c }), s = oe(s);
      const { relativeKey: h, driver: u } = n(s);
      u.removeItem && (await Z(u.removeItem, h, c), (c.removeMeta || c.removeMata) && await Z(u.removeItem, h + "$", c), u.watch || o("remove", s));
    },
    // Meta
    async getMeta(s, c = {}) {
      typeof c == "boolean" && (c = { nativeOnly: c }), s = oe(s);
      const { relativeKey: h, driver: u } = n(s), d = /* @__PURE__ */ Object.create(null);
      if (u.getMeta && Object.assign(d, await Z(u.getMeta, h, c)), !c.nativeOnly) {
        const p = await Z(
          u.getItem,
          h + "$",
          c
        ).then((g) => Gt(g));
        p && typeof p == "object" && (typeof p.atime == "string" && (p.atime = new Date(p.atime)), typeof p.mtime == "string" && (p.mtime = new Date(p.mtime)), Object.assign(d, p));
      }
      return d;
    },
    setMeta(s, c, h = {}) {
      return this.setItem(s + "$", c, h);
    },
    removeMeta(s, c = {}) {
      return this.removeItem(s + "$", c);
    },
    // Keys
    async getKeys(s, c = {}) {
      s = Yt(s);
      const h = r(s, !0);
      let u = [];
      const d = [];
      let p = !0;
      for (const b of h) {
        b.driver.flags?.maxDepth || (p = !1);
        const $ = await Z(
          b.driver.getKeys,
          b.relativeBase,
          c
        );
        for (const C of $) {
          const A = b.mountpoint + oe(C);
          u.some((E) => A.startsWith(E)) || d.push(A);
        }
        u = [
          b.mountpoint,
          ...u.filter((C) => !C.startsWith(b.mountpoint))
        ];
      }
      const g = c.maxDepth !== void 0 && !p;
      return d.filter(
        (b) => (!g || ra(b, c.maxDepth)) && oa(b, s)
      );
    },
    // Utils
    async clear(s, c = {}) {
      s = Yt(s), await Promise.all(
        r(s, !1).map(async (h) => {
          if (h.driver.clear)
            return Z(h.driver.clear, h.relativeBase, c);
          if (h.driver.removeItem) {
            const u = await h.driver.getKeys(h.relativeBase || "", c);
            return Promise.all(
              u.map((d) => h.driver.removeItem(d, c))
            );
          }
        })
      );
    },
    async dispose() {
      await Promise.all(
        Object.values(t.mounts).map((s) => Kr(s))
      );
    },
    async watch(s) {
      return await i(), t.watchListeners.push(s), async () => {
        t.watchListeners = t.watchListeners.filter(
          (c) => c !== s
        ), t.watchListeners.length === 0 && await a();
      };
    },
    async unwatch() {
      t.watchListeners = [], await a();
    },
    // Mount
    mount(s, c) {
      if (s = Yt(s), s && t.mounts[s])
        throw new Error(`already mounted at ${s}`);
      return s && (t.mountpoints.push(s), t.mountpoints.sort((h, u) => u.length - h.length)), t.mounts[s] = c, t.watching && Promise.resolve(Fr(c, o, s)).then((h) => {
        t.unwatch[s] = h;
      }).catch(console.error), l;
    },
    async unmount(s, c = !0) {
      s = Yt(s), !(!s || !t.mounts[s]) && (t.watching && s in t.unwatch && (t.unwatch[s]?.(), delete t.unwatch[s]), c && await Kr(t.mounts[s]), t.mountpoints = t.mountpoints.filter((h) => h !== s), delete t.mounts[s]);
    },
    getMount(s = "") {
      s = oe(s) + ":";
      const c = n(s);
      return {
        driver: c.driver,
        base: c.base
      };
    },
    getMounts(s = "", c = {}) {
      return s = oe(s), r(s, c.parents).map((u) => ({
        driver: u.driver,
        base: u.mountpoint
      }));
    },
    // Aliases
    keys: (s, c = {}) => l.getKeys(s, c),
    get: (s, c = {}) => l.getItem(s, c),
    set: (s, c, h = {}) => l.setItem(s, c, h),
    has: (s, c = {}) => l.hasItem(s, c),
    del: (s, c = {}) => l.removeItem(s, c),
    remove: (s, c = {}) => l.removeItem(s, c)
  };
  return l;
}
function Fr(e, t, n) {
  return e.watch ? e.watch((r, o) => t(r, n + o)) : () => {
  };
}
async function Kr(e) {
  typeof e.dispose == "function" && await Z(e.dispose);
}
function it(e) {
  return new Promise((t, n) => {
    e.oncomplete = e.onsuccess = () => t(e.result), e.onabort = e.onerror = () => n(e.error);
  });
}
function Go(e, t) {
  let n;
  const r = () => {
    if (n)
      return n;
    const o = indexedDB.open(e);
    return o.onupgradeneeded = () => o.result.createObjectStore(t), n = it(o), n.then((i) => {
      i.onclose = () => n = void 0;
    }, () => {
    }), n;
  };
  return (o, i) => r().then((a) => i(a.transaction(t, o).objectStore(t)));
}
let An;
function kt() {
  return An || (An = Go("keyval-store", "keyval")), An;
}
function Hr(e, t = kt()) {
  return t("readonly", (n) => it(n.get(e)));
}
function fa(e, t, n = kt()) {
  return n("readwrite", (r) => (r.put(t, e), it(r.transaction)));
}
function ca(e, t = kt()) {
  return t("readwrite", (n) => (n.delete(e), it(n.transaction)));
}
function ua(e = kt()) {
  return e("readwrite", (t) => (t.clear(), it(t.transaction)));
}
function la(e, t) {
  return e.openCursor().onsuccess = function() {
    this.result && (t(this.result), this.result.continue());
  }, it(e.transaction);
}
function ha(e = kt()) {
  return e("readonly", (t) => {
    if (t.getAllKeys)
      return it(t.getAllKeys());
    const n = [];
    return la(t, (r) => n.push(r.key)).then(() => n);
  });
}
const da = (e) => JSON.stringify(e, (t, n) => typeof n == "bigint" ? n.toString() + "n" : n), pa = (e) => {
  const t = /([\[:])?(\d{17,}|(?:[9](?:[1-9]07199254740991|0[1-9]7199254740991|00[8-9]199254740991|007[2-9]99254740991|007199[3-9]54740991|0071992[6-9]4740991|00719925[5-9]740991|007199254[8-9]40991|0071992547[5-9]0991|00719925474[1-9]991|00719925474099[2-9])))([,\}\]])/g, n = e.replace(t, '$1"$2n"$3');
  return JSON.parse(n, (r, o) => typeof o == "string" && o.match(/^\d+n$/) ? BigInt(o.substring(0, o.length - 1)) : o);
};
function Yo(e) {
  if (typeof e != "string")
    throw new Error(`Cannot safe json parse value of type ${typeof e}`);
  try {
    return pa(e);
  } catch {
    return e;
  }
}
function Zo(e) {
  return typeof e == "string" ? e : da(e) || "";
}
const ga = "idb-keyval";
var ya = (e = {}) => {
  const t = e.base && e.base.length > 0 ? `${e.base}:` : "", n = (o) => t + o;
  let r;
  return e.dbName && e.storeName && (r = Go(e.dbName, e.storeName)), { name: ga, options: e, async hasItem(o) {
    return !(typeof await Hr(n(o), r) > "u");
  }, async getItem(o) {
    return await Hr(n(o), r) ?? null;
  }, setItem(o, i) {
    return fa(n(o), i, r);
  }, removeItem(o) {
    return ca(n(o), r);
  }, getKeys() {
    return ha(r);
  }, clear() {
    return ua(r);
  } };
};
const wa = "WALLET_CONNECT_V2_INDEXED_DB", ba = "keyvaluestorage";
class ma {
  constructor() {
    this.indexedDb = aa({ driver: ya({ dbName: wa, storeName: ba }) });
  }
  async getKeys() {
    return this.indexedDb.getKeys();
  }
  async getEntries() {
    return (await this.indexedDb.getItems(await this.indexedDb.getKeys())).map((t) => [t.key, t.value]);
  }
  async getItem(t) {
    const n = await this.indexedDb.getItem(t);
    if (n !== null) return n;
  }
  async setItem(t, n) {
    await this.indexedDb.setItem(t, Zo(n));
  }
  async removeItem(t) {
    await this.indexedDb.removeItem(t);
  }
}
var jn = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {}, on = { exports: {} };
(function() {
  let e;
  function t() {
  }
  e = t, e.prototype.getItem = function(n) {
    return this.hasOwnProperty(n) ? String(this[n]) : null;
  }, e.prototype.setItem = function(n, r) {
    this[n] = String(r);
  }, e.prototype.removeItem = function(n) {
    delete this[n];
  }, e.prototype.clear = function() {
    const n = this;
    Object.keys(n).forEach(function(r) {
      n[r] = void 0, delete n[r];
    });
  }, e.prototype.key = function(n) {
    return n = n || 0, Object.keys(this)[n];
  }, e.prototype.__defineGetter__("length", function() {
    return Object.keys(this).length;
  }), typeof jn < "u" && jn.localStorage ? on.exports = jn.localStorage : typeof window < "u" && window.localStorage ? on.exports = window.localStorage : on.exports = new t();
})();
function va(e) {
  var t;
  return [e[0], Yo((t = e[1]) != null ? t : "")];
}
let Ea = class {
  constructor() {
    this.localStorage = on.exports;
  }
  async getKeys() {
    return Object.keys(this.localStorage);
  }
  async getEntries() {
    return Object.entries(this.localStorage).map(va);
  }
  async getItem(t) {
    const n = this.localStorage.getItem(t);
    if (n !== null) return Yo(n);
  }
  async setItem(t, n) {
    this.localStorage.setItem(t, Zo(n));
  }
  async removeItem(t) {
    this.localStorage.removeItem(t);
  }
};
const Oa = "wc_storage_version", zr = 1, _a = async (e, t, n) => {
  const r = Oa, o = await t.getItem(r);
  if (o && o >= zr) {
    n(t);
    return;
  }
  const i = await e.getKeys();
  if (!i.length) {
    n(t);
    return;
  }
  const a = [];
  for (; i.length; ) {
    const f = i.shift();
    if (!f) continue;
    const l = f.toLowerCase();
    if (l.includes("wc@") || l.includes("walletconnect") || l.includes("wc_") || l.includes("wallet_connect")) {
      const s = await e.getItem(f);
      await t.setItem(f, s), a.push(f);
    }
  }
  await t.setItem(r, zr), n(t), Ia(e, a);
}, Ia = async (e, t) => {
  t.length && t.forEach(async (n) => {
    await e.removeItem(n);
  });
};
let od = class {
  constructor() {
    this.initialized = !1, this.setInitialized = (n) => {
      this.storage = n, this.initialized = !0;
    };
    const t = new Ea();
    this.storage = t;
    try {
      const n = new ma();
      _a(t, n, this.setInitialized);
    } catch {
      this.initialized = !0;
    }
  }
  async getKeys() {
    return await this.initialize(), this.storage.getKeys();
  }
  async getEntries() {
    return await this.initialize(), this.storage.getEntries();
  }
  async getItem(t) {
    return await this.initialize(), this.storage.getItem(t);
  }
  async setItem(t, n) {
    return await this.initialize(), this.storage.setItem(t, n);
  }
  async removeItem(t) {
    return await this.initialize(), this.storage.removeItem(t);
  }
  async initialize() {
    this.initialized || await new Promise((t) => {
      const n = setInterval(() => {
        this.initialized && (clearInterval(n), t());
      }, 20);
    });
  }
};
var me = { exports: {} };
function Sa(e) {
  try {
    return JSON.stringify(e);
  } catch {
    return '"[Circular]"';
  }
}
var xa = Ba;
function Ba(e, t, n) {
  var r = n && n.stringify || Sa, o = 1;
  if (typeof e == "object" && e !== null) {
    var i = t.length + o;
    if (i === 1) return e;
    var a = new Array(i);
    a[0] = r(e);
    for (var f = 1; f < i; f++) a[f] = r(t[f]);
    return a.join(" ");
  }
  if (typeof e != "string") return e;
  var l = t.length;
  if (l === 0) return e;
  for (var s = "", c = 1 - o, h = -1, u = e && e.length || 0, d = 0; d < u; ) {
    if (e.charCodeAt(d) === 37 && d + 1 < u) {
      switch (h = h > -1 ? h : 0, e.charCodeAt(d + 1)) {
        case 100:
        case 102:
          if (c >= l || t[c] == null) break;
          h < d && (s += e.slice(h, d)), s += Number(t[c]), h = d + 2, d++;
          break;
        case 105:
          if (c >= l || t[c] == null) break;
          h < d && (s += e.slice(h, d)), s += Math.floor(Number(t[c])), h = d + 2, d++;
          break;
        case 79:
        case 111:
        case 106:
          if (c >= l || t[c] === void 0) break;
          h < d && (s += e.slice(h, d));
          var p = typeof t[c];
          if (p === "string") {
            s += "'" + t[c] + "'", h = d + 2, d++;
            break;
          }
          if (p === "function") {
            s += t[c].name || "<anonymous>", h = d + 2, d++;
            break;
          }
          s += r(t[c]), h = d + 2, d++;
          break;
        case 115:
          if (c >= l) break;
          h < d && (s += e.slice(h, d)), s += String(t[c]), h = d + 2, d++;
          break;
        case 37:
          h < d && (s += e.slice(h, d)), s += "%", h = d + 2, d++, c--;
          break;
      }
      ++c;
    }
    ++d;
  }
  return h === -1 ? e : (h < u && (s += e.slice(h)), s);
}
const Vr = xa;
me.exports = xe;
const Pt = Ka().console || {}, Na = { mapHttpRequest: Zt, mapHttpResponse: Zt, wrapRequestSerializer: Un, wrapResponseSerializer: Un, wrapErrorSerializer: Un, req: Zt, res: Zt, err: qr, errWithCause: qr };
function Me(e, t) {
  return e === "silent" ? 1 / 0 : t.levels.values[e];
}
const lr = /* @__PURE__ */ Symbol("pino.logFuncs"), Yn = /* @__PURE__ */ Symbol("pino.hierarchy"), Aa = { error: "log", fatal: "error", warn: "error", info: "log", debug: "log", trace: "log" };
function Wr(e, t) {
  const n = { logger: t, parent: e[Yn] };
  t[Yn] = n;
}
function ja(e, t, n) {
  const r = {};
  t.forEach((o) => {
    r[o] = n[o] ? n[o] : Pt[o] || Pt[Aa[o] || "log"] || dt;
  }), e[lr] = r;
}
function Ua(e, t) {
  return Array.isArray(e) ? e.filter(function(n) {
    return n !== "!stdSerializers.err";
  }) : e === !0 ? Object.keys(t) : !1;
}
function xe(e) {
  e = e || {}, e.browser = e.browser || {};
  const t = e.browser.transmit;
  if (t && typeof t.send != "function") throw Error("pino: transmit option must have a send function");
  const n = e.browser.write || Pt;
  e.browser.write && (e.browser.asObject = !0);
  const r = e.serializers || {}, o = Ua(e.browser.serialize, r);
  let i = e.browser.serialize;
  Array.isArray(e.browser.serialize) && e.browser.serialize.indexOf("!stdSerializers.err") > -1 && (i = !1);
  const a = Object.keys(e.customLevels || {}), f = ["error", "fatal", "warn", "info", "debug", "trace"].concat(a);
  typeof n == "function" && f.forEach(function(g) {
    n[g] = n;
  }), (e.enabled === !1 || e.browser.disabled) && (e.level = "silent");
  const l = e.level || "info", s = Object.create(n);
  s.log || (s.log = dt), ja(s, f, n), Wr({}, s), Object.defineProperty(s, "levelVal", { get: h }), Object.defineProperty(s, "level", { get: u, set: d });
  const c = { transmit: t, serialize: o, asObject: e.browser.asObject, asObjectBindingsOnly: e.browser.asObjectBindingsOnly, formatters: e.browser.formatters, levels: f, timestamp: ka(e), messageKey: e.messageKey || "msg", onChild: e.onChild || dt };
  s.levels = La(e), s.level = l, s.isLevelEnabled = function(g) {
    return this.levels.values[g] ? this.levels.values[g] >= this.levels.values[this.level] : !1;
  }, s.setMaxListeners = s.getMaxListeners = s.emit = s.addListener = s.on = s.prependListener = s.once = s.prependOnceListener = s.removeListener = s.removeAllListeners = s.listeners = s.listenerCount = s.eventNames = s.write = s.flush = dt, s.serializers = r, s._serialize = o, s._stdErrSerialize = i, s.child = function(...g) {
    return p.call(this, c, ...g);
  }, t && (s._logEvent = Zn());
  function h() {
    return Me(this.level, this);
  }
  function u() {
    return this._level;
  }
  function d(g) {
    if (g !== "silent" && !this.levels.values[g]) throw Error("unknown level " + g);
    this._level = g, Xe(this, c, s, "error"), Xe(this, c, s, "fatal"), Xe(this, c, s, "warn"), Xe(this, c, s, "info"), Xe(this, c, s, "debug"), Xe(this, c, s, "trace"), a.forEach((b) => {
      Xe(this, c, s, b);
    });
  }
  function p(g, b, $) {
    if (!b) throw new Error("missing bindings for child Pino");
    $ = $ || {}, o && b.serializers && ($.serializers = b.serializers);
    const C = $.serializers;
    if (o && C) {
      var A = Object.assign({}, r, C), E = e.browser.serialize === !0 ? Object.keys(A) : o;
      delete b.serializers, hr([b], E, A, this._stdErrSerialize);
    }
    function v(B) {
      this._childLevel = (B._childLevel | 0) + 1, this.bindings = b, A && (this.serializers = A, this._serialize = E), t && (this._logEvent = Zn([].concat(B._logEvent.bindings, b)));
    }
    v.prototype = this;
    const _ = new v(this);
    return Wr(this, _), _.child = function(...B) {
      return p.call(this, g, ...B);
    }, _.level = $.level || this.level, g.onChild(_), _;
  }
  return s;
}
function La(e) {
  const t = e.customLevels || {}, n = Object.assign({}, xe.levels.values, t), r = Object.assign({}, xe.levels.labels, Ra(t));
  return { values: n, labels: r };
}
function Ra(e) {
  const t = {};
  return Object.keys(e).forEach(function(n) {
    t[e[n]] = n;
  }), t;
}
xe.levels = { values: { fatal: 60, error: 50, warn: 40, info: 30, debug: 20, trace: 10 }, labels: { 10: "trace", 20: "debug", 30: "info", 40: "warn", 50: "error", 60: "fatal" } }, xe.stdSerializers = Na, xe.stdTimeFunctions = Object.assign({}, { nullTime: Xo, epochTime: Jo, unixTime: Ma, isoTime: Fa });
function Ta(e) {
  const t = [];
  e.bindings && t.push(e.bindings);
  let n = e[Yn];
  for (; n.parent; ) n = n.parent, n.logger.bindings && t.push(n.logger.bindings);
  return t.reverse();
}
function Xe(e, t, n, r) {
  if (Object.defineProperty(e, r, { value: Me(e.level, n) > Me(r, n) ? dt : n[lr][r], writable: !0, enumerable: !0, configurable: !0 }), e[r] === dt) {
    if (!t.transmit) return;
    const i = t.transmit.level || e.level, a = Me(i, n);
    if (Me(r, n) < a) return;
  }
  e[r] = Ca(e, t, n, r);
  const o = Ta(e);
  o.length !== 0 && (e[r] = Pa(o, e[r]));
}
function Pa(e, t) {
  return function() {
    return t.apply(this, [...e, ...arguments]);
  };
}
function Ca(e, t, n, r) {
  return /* @__PURE__ */ (function(o) {
    return function() {
      const i = t.timestamp(), a = new Array(arguments.length), f = Object.getPrototypeOf && Object.getPrototypeOf(this) === Pt ? Pt : this;
      for (var l = 0; l < a.length; l++) a[l] = arguments[l];
      var s = !1;
      if (t.serialize && (hr(a, this._serialize, this.serializers, this._stdErrSerialize), s = !0), t.asObject || t.formatters ? o.call(f, ...Da(this, r, a, i, t)) : o.apply(f, a), t.transmit) {
        const c = t.transmit.level || e._level, h = Me(c, n), u = Me(r, n);
        if (u < h) return;
        $a(this, { ts: i, methodLevel: r, methodValue: u, transmitValue: n.levels.values[t.transmit.level || e._level], send: t.transmit.send, val: Me(e._level, n) }, a, s);
      }
    };
  })(e[lr][r]);
}
function Da(e, t, n, r, o) {
  const { level: i, log: a = (h) => h } = o.formatters || {}, f = n.slice();
  let l = f[0];
  const s = {};
  let c = (e._childLevel | 0) + 1;
  if (c < 1 && (c = 1), r && (s.time = r), i) {
    const h = i(t, e.levels.values[t]);
    Object.assign(s, h);
  } else s.level = e.levels.values[t];
  if (o.asObjectBindingsOnly) {
    if (l !== null && typeof l == "object") for (; c-- && typeof f[0] == "object"; ) Object.assign(s, f.shift());
    return [a(s), ...f];
  } else {
    if (l !== null && typeof l == "object") {
      for (; c-- && typeof f[0] == "object"; ) Object.assign(s, f.shift());
      l = f.length ? Vr(f.shift(), f) : void 0;
    } else typeof l == "string" && (l = Vr(f.shift(), f));
    return l !== void 0 && (s[o.messageKey] = l), [a(s)];
  }
}
function hr(e, t, n, r) {
  for (const o in e) if (r && e[o] instanceof Error) e[o] = xe.stdSerializers.err(e[o]);
  else if (typeof e[o] == "object" && !Array.isArray(e[o]) && t) for (const i in e[o]) t.indexOf(i) > -1 && i in n && (e[o][i] = n[i](e[o][i]));
}
function $a(e, t, n, r = !1) {
  const o = t.send, i = t.ts, a = t.methodLevel, f = t.methodValue, l = t.val, s = e._logEvent.bindings;
  r || hr(n, e._serialize || Object.keys(e.serializers), e.serializers, e._stdErrSerialize === void 0 ? !0 : e._stdErrSerialize), e._logEvent.ts = i, e._logEvent.messages = n.filter(function(c) {
    return s.indexOf(c) === -1;
  }), e._logEvent.level.label = a, e._logEvent.level.value = f, o(a, e._logEvent, l), e._logEvent = Zn(s);
}
function Zn(e) {
  return { ts: 0, messages: [], bindings: e || [], level: { label: "", value: 0 } };
}
function qr(e) {
  const t = { type: e.constructor.name, msg: e.message, stack: e.stack };
  for (const n in e) t[n] === void 0 && (t[n] = e[n]);
  return t;
}
function ka(e) {
  return typeof e.timestamp == "function" ? e.timestamp : e.timestamp === !1 ? Xo : Jo;
}
function Zt() {
  return {};
}
function Un(e) {
  return e;
}
function dt() {
}
function Xo() {
  return !1;
}
function Jo() {
  return Date.now();
}
function Ma() {
  return Math.round(Date.now() / 1e3);
}
function Fa() {
  return new Date(Date.now()).toISOString();
}
function Ka() {
  function e(t) {
    return typeof t < "u" && t;
  }
  try {
    return typeof globalThis < "u" || Object.defineProperty(Object.prototype, "globalThis", { get: function() {
      return delete Object.prototype.globalThis, this.globalThis = this;
    }, configurable: !0 }), globalThis;
  } catch {
    return e(self) || e(window) || e(this) || {};
  }
}
me.exports.default = xe;
me.exports.pino = xe;
const Ha = { level: "info" }, hn = "custom_context", dr = 1e3 * 1024;
var za = Object.defineProperty, Va = (e, t, n) => t in e ? za(e, t, { enumerable: !0, configurable: !0, writable: !0, value: n }) : e[t] = n, De = (e, t, n) => Va(e, typeof t != "symbol" ? t + "" : t, n);
let Wa = class {
  constructor(t) {
    De(this, "nodeValue"), De(this, "sizeInBytes"), De(this, "next"), this.nodeValue = t, this.sizeInBytes = new TextEncoder().encode(this.nodeValue).length, this.next = null;
  }
  get value() {
    return this.nodeValue;
  }
  get size() {
    return this.sizeInBytes;
  }
};
class Gr {
  constructor(t) {
    De(this, "lengthInNodes"), De(this, "sizeInBytes"), De(this, "head"), De(this, "tail"), De(this, "maxSizeInBytes"), this.head = null, this.tail = null, this.lengthInNodes = 0, this.maxSizeInBytes = t, this.sizeInBytes = 0;
  }
  append(t) {
    const n = new Wa(t);
    if (n.size > this.maxSizeInBytes) throw new Error(`[LinkedList] Value too big to insert into list: ${t} with size ${n.size}`);
    for (; this.size + n.size > this.maxSizeInBytes; ) this.shift();
    this.head ? (this.tail && (this.tail.next = n), this.tail = n) : (this.head = n, this.tail = n), this.lengthInNodes++, this.sizeInBytes += n.size;
  }
  shift() {
    if (!this.head) return;
    const t = this.head;
    this.head = this.head.next, this.head || (this.tail = null), this.lengthInNodes--, this.sizeInBytes -= t.size;
  }
  toArray() {
    const t = [];
    let n = this.head;
    for (; n !== null; ) t.push(n.value), n = n.next;
    return t;
  }
  get length() {
    return this.lengthInNodes;
  }
  get size() {
    return this.sizeInBytes;
  }
  toOrderedArray() {
    return Array.from(this);
  }
  [Symbol.iterator]() {
    let t = this.head;
    return { next: () => {
      if (!t) return { done: !0, value: null };
      const n = t.value;
      return t = t.next, { done: !1, value: n };
    } };
  }
}
const qa = (e) => JSON.stringify(e, (t, n) => typeof n == "bigint" ? n.toString() + "n" : n);
function Yr(e) {
  return typeof e == "string" ? e : qa(e) || "";
}
var Ga = Object.defineProperty, Ya = (e, t, n) => t in e ? Ga(e, t, { enumerable: !0, configurable: !0, writable: !0, value: n }) : e[t] = n, Xt = (e, t, n) => Ya(e, typeof t != "symbol" ? t + "" : t, n);
let Qo = class {
  constructor(t, n = dr) {
    Xt(this, "logs"), Xt(this, "level"), Xt(this, "levelValue"), Xt(this, "MAX_LOG_SIZE_IN_BYTES"), this.level = t ?? "error", this.levelValue = me.exports.levels.values[this.level], this.MAX_LOG_SIZE_IN_BYTES = n, this.logs = new Gr(this.MAX_LOG_SIZE_IN_BYTES);
  }
  forwardToConsole(t, n) {
    n === me.exports.levels.values.error ? console.error(t) : n === me.exports.levels.values.warn ? console.warn(t) : n === me.exports.levels.values.debug ? console.debug(t) : n === me.exports.levels.values.trace ? console.trace(t) : console.log(t);
  }
  appendToLogs(t) {
    this.logs.append(Yr({ timestamp: (/* @__PURE__ */ new Date()).toISOString(), log: t }));
    const n = typeof t == "string" ? JSON.parse(t).level : t.level;
    n >= this.levelValue && this.forwardToConsole(t, n);
  }
  getLogs() {
    return this.logs;
  }
  clearLogs() {
    this.logs = new Gr(this.MAX_LOG_SIZE_IN_BYTES);
  }
  getLogArray() {
    return Array.from(this.logs);
  }
  logsToBlob(t) {
    const n = this.getLogArray();
    return n.push(Yr({ extraMetadata: t })), new Blob(n, { type: "application/json" });
  }
};
var Za = Object.defineProperty, Xa = (e, t, n) => t in e ? Za(e, t, { enumerable: !0, configurable: !0, writable: !0, value: n }) : e[t] = n, Ja = (e, t, n) => Xa(e, t + "", n);
let Qa = class {
  constructor(t, n = dr) {
    Ja(this, "baseChunkLogger"), this.baseChunkLogger = new Qo(t, n);
  }
  write(t) {
    this.baseChunkLogger.appendToLogs(t);
  }
  getLogs() {
    return this.baseChunkLogger.getLogs();
  }
  clearLogs() {
    this.baseChunkLogger.clearLogs();
  }
  getLogArray() {
    return this.baseChunkLogger.getLogArray();
  }
  logsToBlob(t) {
    return this.baseChunkLogger.logsToBlob(t);
  }
  downloadLogsBlobInBrowser(t) {
    const n = URL.createObjectURL(this.logsToBlob(t)), r = document.createElement("a");
    r.href = n, r.download = `walletconnect-logs-${(/* @__PURE__ */ new Date()).toISOString()}.txt`, document.body.appendChild(r), r.click(), document.body.removeChild(r), URL.revokeObjectURL(n);
  }
};
var ef = Object.defineProperty, tf = (e, t, n) => t in e ? ef(e, t, { enumerable: !0, configurable: !0, writable: !0, value: n }) : e[t] = n, nf = (e, t, n) => tf(e, t + "", n);
let rf = class {
  constructor(t, n = dr) {
    nf(this, "baseChunkLogger"), this.baseChunkLogger = new Qo(t, n);
  }
  write(t) {
    this.baseChunkLogger.appendToLogs(t);
  }
  getLogs() {
    return this.baseChunkLogger.getLogs();
  }
  clearLogs() {
    this.baseChunkLogger.clearLogs();
  }
  getLogArray() {
    return this.baseChunkLogger.getLogArray();
  }
  logsToBlob(t) {
    return this.baseChunkLogger.logsToBlob(t);
  }
};
var of = Object.defineProperty, sf = Object.defineProperties, af = Object.getOwnPropertyDescriptors, Zr = Object.getOwnPropertySymbols, ff = Object.prototype.hasOwnProperty, cf = Object.prototype.propertyIsEnumerable, Xr = (e, t, n) => t in e ? of(e, t, { enumerable: !0, configurable: !0, writable: !0, value: n }) : e[t] = n, Ke = (e, t) => {
  for (var n in t || (t = {})) ff.call(t, n) && Xr(e, n, t[n]);
  if (Zr) for (var n of Zr(t)) cf.call(t, n) && Xr(e, n, t[n]);
  return e;
}, He = (e, t) => sf(e, af(t));
function ud(e) {
  return He(Ke({}, e), { level: e?.level || Ha.level });
}
function uf(e, t, n = hn) {
  return e[n] = t, e;
}
function lf(e, t = hn) {
  return e[t] || "";
}
function hf(e, t, n = hn) {
  const r = lf(e, n);
  return r.trim() ? `${r}/${t}` : t;
}
function ld(e, t, n = hn) {
  const r = hf(e, t, n), o = e.child({ context: r });
  return uf(o, r, n);
}
function df(e) {
  var t, n;
  const r = new Qa((t = e.opts) == null ? void 0 : t.level, e.maxSizeInBytes);
  return { logger: me.exports(He(Ke({}, e.opts), { level: "trace", browser: He(Ke({}, (n = e.opts) == null ? void 0 : n.browser), { write: (o) => r.write(o) }) })), chunkLoggerController: r };
}
function pf(e) {
  var t, n;
  const r = new rf((t = e.opts) == null ? void 0 : t.level, e.maxSizeInBytes);
  return { logger: me.exports(He(Ke({}, e.opts), { level: "trace", browser: He(Ke({}, (n = e.opts) == null ? void 0 : n.browser), { write: (o) => r.write(o) }) }), r), chunkLoggerController: r };
}
function gf(e) {
  var t;
  if (typeof e.loggerOverride < "u" && typeof e.loggerOverride != "string") return { logger: e.loggerOverride, chunkLoggerController: null };
  const n = He(Ke({}, e.opts), { level: typeof e.loggerOverride == "string" ? e.loggerOverride : (t = e.opts) == null ? void 0 : t.level });
  return typeof window < "u" ? df(He(Ke({}, e), { opts: n })) : pf(He(Ke({}, e), { opts: n }));
}
var yf = Object.defineProperty, wf = (e, t, n) => t in e ? yf(e, t, { enumerable: !0, configurable: !0, writable: !0, value: n }) : e[t] = n, Jr = (e, t, n) => wf(e, typeof t != "symbol" ? t + "" : t, n);
class hd extends ot {
  constructor(t) {
    super(), this.opts = t, Jr(this, "protocol", "wc"), Jr(this, "version", 2);
  }
}
var bf = Object.defineProperty, mf = (e, t, n) => t in e ? bf(e, t, { enumerable: !0, configurable: !0, writable: !0, value: n }) : e[t] = n, vf = (e, t, n) => mf(e, t + "", n);
class dd extends ot {
  constructor(t, n) {
    super(), this.core = t, this.logger = n, vf(this, "records", /* @__PURE__ */ new Map());
  }
}
class pd {
  constructor(t, n) {
    this.logger = t, this.core = n;
  }
}
class gd extends ot {
  constructor(t, n) {
    super(), this.relayer = t, this.logger = n;
  }
}
class yd extends ot {
  constructor(t) {
    super();
  }
}
class wd {
  constructor(t, n, r, o) {
    this.core = t, this.logger = n, this.name = r;
  }
}
class bd extends ot {
  constructor(t, n) {
    super(), this.relayer = t, this.logger = n;
  }
}
let md = class extends ot {
  constructor(t, n) {
    super(), this.core = t, this.logger = n;
  }
};
class Ed {
  constructor(t, n, r) {
    this.core = t, this.logger = n, this.store = r;
  }
}
class Od {
  constructor(t, n) {
    this.projectId = t, this.logger = n;
  }
}
class _d {
  constructor(t, n, r) {
    this.core = t, this.logger = n, this.telemetryEnabled = r;
  }
}
var Ef = Object.defineProperty, Of = (e, t, n) => t in e ? Ef(e, t, { enumerable: !0, configurable: !0, writable: !0, value: n }) : e[t] = n, Qr = (e, t, n) => Of(e, typeof t != "symbol" ? t + "" : t, n);
let Id = class {
  constructor(t) {
    this.opts = t, Qr(this, "protocol", "wc"), Qr(this, "version", 2);
  }
};
class xd {
  constructor(t) {
    this.client = t;
  }
}
var eo = function(e, t, n) {
  if (n || arguments.length === 2) for (var r = 0, o = t.length, i; r < o; r++)
    (i || !(r in t)) && (i || (i = Array.prototype.slice.call(t, 0, r)), i[r] = t[r]);
  return e.concat(i || Array.prototype.slice.call(t));
}, _f = (
  /** @class */
  /* @__PURE__ */ (function() {
    function e(t, n, r) {
      this.name = t, this.version = n, this.os = r, this.type = "browser";
    }
    return e;
  })()
), If = (
  /** @class */
  /* @__PURE__ */ (function() {
    function e(t) {
      this.version = t, this.type = "node", this.name = "node", this.os = process.platform;
    }
    return e;
  })()
), Sf = (
  /** @class */
  /* @__PURE__ */ (function() {
    function e(t, n, r, o) {
      this.name = t, this.version = n, this.os = r, this.bot = o, this.type = "bot-device";
    }
    return e;
  })()
), xf = (
  /** @class */
  /* @__PURE__ */ (function() {
    function e() {
      this.type = "bot", this.bot = !0, this.name = "bot", this.version = null, this.os = null;
    }
    return e;
  })()
), Bf = (
  /** @class */
  /* @__PURE__ */ (function() {
    function e() {
      this.type = "react-native", this.name = "react-native", this.version = null, this.os = null;
    }
    return e;
  })()
), Nf = /alexa|bot|crawl(er|ing)|facebookexternalhit|feedburner|google web preview|nagios|postrank|pingdom|slurp|spider|yahoo!|yandex/, Af = /(nuhk|curl|Googlebot|Yammybot|Openbot|Slurp|MSNBot|Ask\ Jeeves\/Teoma|ia_archiver)/, to = 3, jf = [
  ["aol", /AOLShield\/([0-9\._]+)/],
  ["edge", /Edge\/([0-9\._]+)/],
  ["edge-ios", /EdgiOS\/([0-9\._]+)/],
  ["yandexbrowser", /YaBrowser\/([0-9\._]+)/],
  ["kakaotalk", /KAKAOTALK\s([0-9\.]+)/],
  ["samsung", /SamsungBrowser\/([0-9\.]+)/],
  ["silk", /\bSilk\/([0-9._-]+)\b/],
  ["miui", /MiuiBrowser\/([0-9\.]+)$/],
  ["beaker", /BeakerBrowser\/([0-9\.]+)/],
  ["edge-chromium", /EdgA?\/([0-9\.]+)/],
  [
    "chromium-webview",
    /(?!Chrom.*OPR)wv\).*Chrom(?:e|ium)\/([0-9\.]+)(:?\s|$)/
  ],
  ["chrome", /(?!Chrom.*OPR)Chrom(?:e|ium)\/([0-9\.]+)(:?\s|$)/],
  ["phantomjs", /PhantomJS\/([0-9\.]+)(:?\s|$)/],
  ["crios", /CriOS\/([0-9\.]+)(:?\s|$)/],
  ["firefox", /Firefox\/([0-9\.]+)(?:\s|$)/],
  ["fxios", /FxiOS\/([0-9\.]+)/],
  ["opera-mini", /Opera Mini.*Version\/([0-9\.]+)/],
  ["opera", /Opera\/([0-9\.]+)(?:\s|$)/],
  ["opera", /OPR\/([0-9\.]+)(:?\s|$)/],
  ["pie", /^Microsoft Pocket Internet Explorer\/(\d+\.\d+)$/],
  ["pie", /^Mozilla\/\d\.\d+\s\(compatible;\s(?:MSP?IE|MSInternet Explorer) (\d+\.\d+);.*Windows CE.*\)$/],
  ["netfront", /^Mozilla\/\d\.\d+.*NetFront\/(\d.\d)/],
  ["ie", /Trident\/7\.0.*rv\:([0-9\.]+).*\).*Gecko$/],
  ["ie", /MSIE\s([0-9\.]+);.*Trident\/[4-7].0/],
  ["ie", /MSIE\s(7\.0)/],
  ["bb10", /BB10;\sTouch.*Version\/([0-9\.]+)/],
  ["android", /Android\s([0-9\.]+)/],
  ["ios", /Version\/([0-9\._]+).*Mobile.*Safari.*/],
  ["safari", /Version\/([0-9\._]+).*Safari/],
  ["facebook", /FB[AS]V\/([0-9\.]+)/],
  ["instagram", /Instagram\s([0-9\.]+)/],
  ["ios-webview", /AppleWebKit\/([0-9\.]+).*Mobile/],
  ["ios-webview", /AppleWebKit\/([0-9\.]+).*Gecko\)$/],
  ["curl", /^curl\/([0-9\.]+)$/],
  ["searchbot", Nf]
], no = [
  ["iOS", /iP(hone|od|ad)/],
  ["Android OS", /Android/],
  ["BlackBerry OS", /BlackBerry|BB10/],
  ["Windows Mobile", /IEMobile/],
  ["Amazon OS", /Kindle/],
  ["Windows 3.11", /Win16/],
  ["Windows 95", /(Windows 95)|(Win95)|(Windows_95)/],
  ["Windows 98", /(Windows 98)|(Win98)/],
  ["Windows 2000", /(Windows NT 5.0)|(Windows 2000)/],
  ["Windows XP", /(Windows NT 5.1)|(Windows XP)/],
  ["Windows Server 2003", /(Windows NT 5.2)/],
  ["Windows Vista", /(Windows NT 6.0)/],
  ["Windows 7", /(Windows NT 6.1)/],
  ["Windows 8", /(Windows NT 6.2)/],
  ["Windows 8.1", /(Windows NT 6.3)/],
  ["Windows 10", /(Windows NT 10.0)/],
  ["Windows ME", /Windows ME/],
  ["Windows CE", /Windows CE|WinCE|Microsoft Pocket Internet Explorer/],
  ["Open BSD", /OpenBSD/],
  ["Sun OS", /SunOS/],
  ["Chrome OS", /CrOS/],
  ["Linux", /(Linux)|(X11)/],
  ["Mac OS", /(Mac_PowerPC)|(Macintosh)/],
  ["QNX", /QNX/],
  ["BeOS", /BeOS/],
  ["OS/2", /OS\/2/]
];
function Uf(e) {
  return typeof document > "u" && typeof navigator < "u" && navigator.product === "ReactNative" ? new Bf() : typeof navigator < "u" ? Rf(navigator.userAgent) : Pf();
}
function Lf(e) {
  return e !== "" && jf.reduce(function(t, n) {
    var r = n[0], o = n[1];
    if (t)
      return t;
    var i = o.exec(e);
    return !!i && [r, i];
  }, !1);
}
function Rf(e) {
  var t = Lf(e);
  if (!t)
    return null;
  var n = t[0], r = t[1];
  if (n === "searchbot")
    return new xf();
  var o = r[1] && r[1].split(".").join("_").split("_").slice(0, 3);
  o ? o.length < to && (o = eo(eo([], o, !0), Cf(to - o.length), !0)) : o = [];
  var i = o.join("."), a = Tf(e), f = Af.exec(e);
  return f && f[1] ? new Sf(n, i, a, f[1]) : new _f(n, i, a);
}
function Tf(e) {
  for (var t = 0, n = no.length; t < n; t++) {
    var r = no[t], o = r[0], i = r[1], a = i.exec(e);
    if (a)
      return o;
  }
  return null;
}
function Pf() {
  var e = typeof process < "u" && process.version;
  return e ? new If(process.version.slice(1)) : null;
}
function Cf(e) {
  for (var t = [], n = 0; n < e; n++)
    t.push("0");
  return t;
}
var q = {}, ro;
function ei() {
  if (ro) return q;
  ro = 1, Object.defineProperty(q, "__esModule", { value: !0 }), q.getLocalStorage = q.getLocalStorageOrThrow = q.getCrypto = q.getCryptoOrThrow = q.getLocation = q.getLocationOrThrow = q.getNavigator = q.getNavigatorOrThrow = q.getDocument = q.getDocumentOrThrow = q.getFromWindowOrThrow = q.getFromWindow = void 0;
  function e(u) {
    let d;
    return typeof window < "u" && typeof window[u] < "u" && (d = window[u]), d;
  }
  q.getFromWindow = e;
  function t(u) {
    const d = e(u);
    if (!d)
      throw new Error(`${u} is not defined in Window`);
    return d;
  }
  q.getFromWindowOrThrow = t;
  function n() {
    return t("document");
  }
  q.getDocumentOrThrow = n;
  function r() {
    return e("document");
  }
  q.getDocument = r;
  function o() {
    return t("navigator");
  }
  q.getNavigatorOrThrow = o;
  function i() {
    return e("navigator");
  }
  q.getNavigator = i;
  function a() {
    return t("location");
  }
  q.getLocationOrThrow = a;
  function f() {
    return e("location");
  }
  q.getLocation = f;
  function l() {
    return t("crypto");
  }
  q.getCryptoOrThrow = l;
  function s() {
    return e("crypto");
  }
  q.getCrypto = s;
  function c() {
    return t("localStorage");
  }
  q.getLocalStorageOrThrow = c;
  function h() {
    return e("localStorage");
  }
  return q.getLocalStorage = h, q;
}
var Ve = ei(), xt = {}, oo;
function Df() {
  if (oo) return xt;
  oo = 1, Object.defineProperty(xt, "__esModule", { value: !0 }), xt.getWindowMetadata = void 0;
  const e = ei();
  function t() {
    let n, r;
    try {
      n = e.getDocumentOrThrow(), r = e.getLocationOrThrow();
    } catch {
      return null;
    }
    function o() {
      const d = n.getElementsByTagName("link"), p = [];
      for (let g = 0; g < d.length; g++) {
        const b = d[g], $ = b.getAttribute("rel");
        if ($ && $.toLowerCase().indexOf("icon") > -1) {
          const C = b.getAttribute("href");
          if (C)
            if (C.toLowerCase().indexOf("https:") === -1 && C.toLowerCase().indexOf("http:") === -1 && C.indexOf("//") !== 0) {
              let A = r.protocol + "//" + r.host;
              if (C.indexOf("/") === 0)
                A += C;
              else {
                const E = r.pathname.split("/");
                E.pop();
                const v = E.join("/");
                A += v + "/" + C;
              }
              p.push(A);
            } else if (C.indexOf("//") === 0) {
              const A = r.protocol + C;
              p.push(A);
            } else
              p.push(C);
        }
      }
      return p;
    }
    function i(...d) {
      const p = n.getElementsByTagName("meta");
      for (let g = 0; g < p.length; g++) {
        const b = p[g], $ = ["itemprop", "property", "name"].map((C) => b.getAttribute(C)).filter((C) => C ? d.includes(C) : !1);
        if ($.length && $) {
          const C = b.getAttribute("content");
          if (C)
            return C;
        }
      }
      return "";
    }
    function a() {
      let d = i("name", "og:site_name", "og:title", "twitter:title");
      return d || (d = n.title), d;
    }
    function f() {
      return i("description", "og:description", "twitter:description", "keywords");
    }
    const l = a(), s = f(), c = r.origin, h = o();
    return {
      description: s,
      url: c,
      icons: h,
      name: l
    };
  }
  return xt.getWindowMetadata = t, xt;
}
var $f = Df();
function kf(e) {
  if (e.length >= 255)
    throw new TypeError("Alphabet too long");
  const t = new Uint8Array(256);
  for (let s = 0; s < t.length; s++)
    t[s] = 255;
  for (let s = 0; s < e.length; s++) {
    const c = e.charAt(s), h = c.charCodeAt(0);
    if (t[h] !== 255)
      throw new TypeError(c + " is ambiguous");
    t[h] = s;
  }
  const n = e.length, r = e.charAt(0), o = Math.log(n) / Math.log(256), i = Math.log(256) / Math.log(n);
  function a(s) {
    if (s instanceof Uint8Array || (ArrayBuffer.isView(s) ? s = new Uint8Array(s.buffer, s.byteOffset, s.byteLength) : Array.isArray(s) && (s = Uint8Array.from(s))), !(s instanceof Uint8Array))
      throw new TypeError("Expected Uint8Array");
    if (s.length === 0)
      return "";
    let c = 0, h = 0, u = 0;
    const d = s.length;
    for (; u !== d && s[u] === 0; )
      u++, c++;
    const p = (d - u) * i + 1 >>> 0, g = new Uint8Array(p);
    for (; u !== d; ) {
      let C = s[u], A = 0;
      for (let E = p - 1; (C !== 0 || A < h) && E !== -1; E--, A++)
        C += 256 * g[E] >>> 0, g[E] = C % n >>> 0, C = C / n >>> 0;
      if (C !== 0)
        throw new Error("Non-zero carry");
      h = A, u++;
    }
    let b = p - h;
    for (; b !== p && g[b] === 0; )
      b++;
    let $ = r.repeat(c);
    for (; b < p; ++b)
      $ += e.charAt(g[b]);
    return $;
  }
  function f(s) {
    if (typeof s != "string")
      throw new TypeError("Expected String");
    if (s.length === 0)
      return new Uint8Array();
    let c = 0, h = 0, u = 0;
    for (; s[c] === r; )
      h++, c++;
    const d = (s.length - c) * o + 1 >>> 0, p = new Uint8Array(d);
    for (; c < s.length; ) {
      const C = s.charCodeAt(c);
      if (C > 255)
        return;
      let A = t[C];
      if (A === 255)
        return;
      let E = 0;
      for (let v = d - 1; (A !== 0 || E < u) && v !== -1; v--, E++)
        A += n * p[v] >>> 0, p[v] = A % 256 >>> 0, A = A / 256 >>> 0;
      if (A !== 0)
        throw new Error("Non-zero carry");
      u = E, c++;
    }
    let g = d - u;
    for (; g !== d && p[g] === 0; )
      g++;
    const b = new Uint8Array(h + (d - g));
    let $ = h;
    for (; g !== d; )
      b[$++] = p[g++];
    return b;
  }
  function l(s) {
    const c = f(s);
    if (c)
      return c;
    throw new Error("Non-base" + n + " character");
  }
  return {
    encode: a,
    decodeUnsafe: f,
    decode: l
  };
}
var Mf = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const Mt = kf(Mf), Ff = ":";
function Kf(e) {
  const [t, n] = e.split(Ff);
  return { namespace: t, reference: n };
}
function ti(e, t) {
  return e.includes(":") ? [e] : t.chains || [];
}
var Hf = Object.defineProperty, zf = Object.defineProperties, Vf = Object.getOwnPropertyDescriptors, io = Object.getOwnPropertySymbols, Wf = Object.prototype.hasOwnProperty, qf = Object.prototype.propertyIsEnumerable, Xn = (e, t, n) => t in e ? Hf(e, t, { enumerable: !0, configurable: !0, writable: !0, value: n }) : e[t] = n, so = (e, t) => {
  for (var n in t || (t = {})) Wf.call(t, n) && Xn(e, n, t[n]);
  if (io) for (var n of io(t)) qf.call(t, n) && Xn(e, n, t[n]);
  return e;
}, Gf = (e, t) => zf(e, Vf(t)), ao = (e, t, n) => Xn(e, typeof t != "symbol" ? t + "" : t, n);
const Yf = "ReactNative", ce = { reactNative: "react-native", node: "node", browser: "browser", unknown: "unknown" }, Zf = "js";
function ni() {
  return typeof process < "u" && typeof process.versions < "u" && typeof process.versions.node < "u";
}
function st() {
  return !Ve.getDocument() && !!Ve.getNavigator() && navigator.product === Yf;
}
function Bd() {
  return st() && typeof global < "u" && typeof (global == null ? void 0 : global.Platform) < "u" && (global == null ? void 0 : global.Platform.OS) === "android";
}
function Nd() {
  return st() && typeof global < "u" && typeof (global == null ? void 0 : global.Platform) < "u" && (global == null ? void 0 : global.Platform.OS) === "ios";
}
function Ft() {
  return !ni() && !!Ve.getNavigator() && !!Ve.getDocument();
}
function Kt() {
  return st() ? ce.reactNative : ni() ? ce.node : Ft() ? ce.browser : ce.unknown;
}
function Ad() {
  var e;
  try {
    return st() && typeof global < "u" && typeof (global == null ? void 0 : global.Application) < "u" ? (e = global.Application) == null ? void 0 : e.applicationId : void 0;
  } catch {
    return;
  }
}
function Xf(e, t) {
  const n = new URLSearchParams(e);
  return Object.entries(t).sort(([r], [o]) => r.localeCompare(o)).forEach(([r, o]) => {
    o != null && n.set(r, String(o));
  }), n.toString();
}
function jd(e) {
  var t, n;
  const r = Jf();
  try {
    return e != null && e.url && r.url && new URL(e.url).host !== new URL(r.url).host && (console.warn(`The configured WalletConnect 'metadata.url':${e.url} differs from the actual page url:${r.url}. This is probably unintended and can lead to issues.`), e.url = r.url), (t = e?.icons) != null && t.length && e.icons.length > 0 && (e.icons = e.icons.filter((o) => o !== "")), Gf(so(so({}, r), e), { url: e?.url || r.url, name: e?.name || r.name, description: e?.description || r.description, icons: (n = e?.icons) != null && n.length && e.icons.length > 0 ? e.icons : r.icons });
  } catch (o) {
    return console.warn("Error populating app metadata", o), e || r;
  }
}
function Jf() {
  return $f.getWindowMetadata() || { name: "", description: "", url: "", icons: [""] };
}
function Qf() {
  if (Kt() === ce.reactNative && typeof global < "u" && typeof (global == null ? void 0 : global.Platform) < "u") {
    const { OS: n, Version: r } = global.Platform;
    return [n, r].join("-");
  }
  const e = Uf();
  if (e === null) return "unknown";
  const t = e.os ? e.os.replace(" ", "").toLowerCase() : "unknown";
  return e.type === "browser" ? [t, e.name, e.version].join("-") : [t, e.version].join("-");
}
function ec() {
  var e;
  const t = Kt();
  return t === ce.browser ? [t, ((e = Ve.getLocation()) == null ? void 0 : e.host) || "unknown"].join(":") : t;
}
function tc(e, t, n) {
  const r = Qf(), o = ec();
  return [[e, t].join("-"), [Zf, n].join("-"), r, o].join("/");
}
function Ud({ protocol: e, version: t, relayUrl: n, sdkVersion: r, auth: o, projectId: i, useOnCloseEvent: a, bundleId: f, packageName: l }) {
  const s = n.split("?"), c = tc(e, t, r), h = { auth: o, ua: c, projectId: i, useOnCloseEvent: a, packageName: l || void 0, bundleId: f || void 0 }, u = Xf(s[1] || "", h);
  return s[0] + "?" + u;
}
function Je(e, t) {
  return e.filter((n) => t.includes(n)).length === e.length;
}
function Ld(e) {
  return Object.fromEntries(e.entries());
}
function Rd(e) {
  return new Map(Object.entries(e));
}
function Td(e = Fe.FIVE_MINUTES, t) {
  const n = Fe.toMiliseconds(e || Fe.FIVE_MINUTES);
  let r, o, i, a;
  return { resolve: (f) => {
    i && r && (clearTimeout(i), r(f), a = Promise.resolve(f));
  }, reject: (f) => {
    i && o && (clearTimeout(i), o(f));
  }, done: () => new Promise((f, l) => {
    if (a) return f(a);
    i = setTimeout(() => {
      const s = new Error(t);
      a = Promise.reject(s), l(s);
    }, n), r = f, o = l;
  }) };
}
function Pd(e, t, n) {
  return new Promise(async (r, o) => {
    const i = setTimeout(() => o(new Error(n)), t);
    try {
      const a = await e;
      r(a);
    } catch (a) {
      o(a);
    }
    clearTimeout(i);
  });
}
function ri(e, t) {
  if (typeof t == "string" && t.startsWith(`${e}:`)) return t;
  if (e.toLowerCase() === "topic") {
    if (typeof t != "string") throw new Error('Value must be "string" for expirer target type: topic');
    return `topic:${t}`;
  } else if (e.toLowerCase() === "id") {
    if (typeof t != "number") throw new Error('Value must be "number" for expirer target type: id');
    return `id:${t}`;
  }
  throw new Error(`Unknown expirer target type: ${e}`);
}
function Cd(e) {
  return ri("topic", e);
}
function Dd(e) {
  return ri("id", e);
}
function $d(e) {
  const [t, n] = e.split(":"), r = { id: void 0, topic: void 0 };
  if (t === "topic" && typeof n == "string") r.topic = n;
  else if (t === "id" && Number.isInteger(Number(n))) r.id = Number(n);
  else throw new Error(`Invalid target, expected id:number or topic:string, got ${t}:${n}`);
  return r;
}
function kd(e, t) {
  return Fe.fromMiliseconds(Date.now() + Fe.toMiliseconds(e));
}
function Md(e) {
  return Date.now() >= Fe.toMiliseconds(e);
}
function Fd(e, t) {
  return `${e}${t ? `:${t}` : ""}`;
}
function nt(e = [], t = []) {
  return [.../* @__PURE__ */ new Set([...e, ...t])];
}
async function Kd({ id: e, topic: t, wcDeepLink: n }) {
  var r;
  try {
    if (!n) return;
    const o = typeof n == "string" ? JSON.parse(n) : n, i = o?.href;
    if (typeof i != "string") return;
    const a = nc(i, e, t), f = Kt();
    if (f === ce.browser) {
      if (!((r = Ve.getDocument()) != null && r.hasFocus())) {
        console.warn("Document does not have focus, skipping deeplink.");
        return;
      }
      rc(a);
    } else f === ce.reactNative && typeof (global == null ? void 0 : global.Linking) < "u" && await global.Linking.openURL(a);
  } catch (o) {
    console.error(o);
  }
}
function nc(e, t, n) {
  const r = `requestId=${t}&sessionTopic=${n}`;
  e.endsWith("/") && (e = e.slice(0, -1));
  let o = `${e}`;
  if (e.startsWith("https://t.me")) {
    const i = e.includes("?") ? "&startapp=" : "?startapp=";
    o = `${o}${i}${sc(r, !0)}`;
  } else o = `${o}/wc?${r}`;
  return o;
}
function rc(e) {
  let t = "_self";
  ic() ? t = "_top" : (oc() || e.startsWith("https://") || e.startsWith("http://")) && (t = "_blank"), window.open(e, t, "noreferrer noopener");
}
async function Hd(e, t) {
  let n = "";
  try {
    if (Ft() && (n = localStorage.getItem(t), n)) return n;
    n = await e.getItem(t);
  } catch (r) {
    console.error(r);
  }
  return n;
}
function zd(e, t) {
  if (!e.includes(t)) return null;
  const n = e.split(/([&,?,=])/), r = n.indexOf(t);
  return n[r + 2];
}
function Vd() {
  return typeof crypto < "u" && crypto != null && crypto.randomUUID ? crypto.randomUUID() : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/gu, (e) => {
    const t = Math.random() * 16 | 0;
    return (e === "x" ? t : t & 3 | 8).toString(16);
  });
}
function Wd() {
  return typeof process < "u" && process.env.IS_VITEST === "true";
}
function oc() {
  return typeof window < "u" && (!!window.TelegramWebviewProxy || !!window.Telegram || !!window.TelegramWebviewProxyProto);
}
function ic() {
  try {
    return window.self !== window.top;
  } catch {
    return !1;
  }
}
function sc(e, t = !1) {
  const n = Buffer.from(e).toString("base64");
  return t ? n.replace(/[=]/g, "") : n;
}
function oi(e) {
  return Buffer.from(e, "base64").toString("utf-8");
}
function qd(e) {
  return new Promise((t) => setTimeout(t, e));
}
class Gd {
  constructor({ limit: t }) {
    ao(this, "limit"), ao(this, "set"), this.limit = t, this.set = /* @__PURE__ */ new Set();
  }
  add(t) {
    if (!this.set.has(t)) {
      if (this.set.size >= this.limit) {
        const n = this.set.values().next().value;
        n && this.set.delete(n);
      }
      this.set.add(t);
    }
  }
  has(t) {
    return this.set.has(t);
  }
}
const Jt = BigInt(2 ** 32 - 1), fo = BigInt(32);
function ii(e, t = !1) {
  return t ? { h: Number(e & Jt), l: Number(e >> fo & Jt) } : { h: Number(e >> fo & Jt) | 0, l: Number(e & Jt) | 0 };
}
function si(e, t = !1) {
  const n = e.length;
  let r = new Uint32Array(n), o = new Uint32Array(n);
  for (let i = 0; i < n; i++) {
    const { h: a, l: f } = ii(e[i], t);
    [r[i], o[i]] = [a, f];
  }
  return [r, o];
}
const co = (e, t, n) => e >>> n, uo = (e, t, n) => e << 32 - n | t >>> n, Te = (e, t, n) => e >>> n | t << 32 - n, Pe = (e, t, n) => e << 32 - n | t >>> n, At = (e, t, n) => e << 64 - n | t >>> n - 32, jt = (e, t, n) => e >>> n - 32 | t << 64 - n, ac = (e, t) => t, fc = (e, t) => e, cc = (e, t, n) => e << n | t >>> 32 - n, uc = (e, t, n) => t << n | e >>> 32 - n, lc = (e, t, n) => t << n - 32 | e >>> 64 - n, hc = (e, t, n) => e << n - 32 | t >>> 64 - n;
function ge(e, t, n, r) {
  const o = (t >>> 0) + (r >>> 0);
  return { h: e + n + (o / 2 ** 32 | 0) | 0, l: o | 0 };
}
const pr = (e, t, n) => (e >>> 0) + (t >>> 0) + (n >>> 0), gr = (e, t, n, r) => t + n + r + (e / 2 ** 32 | 0) | 0, dc = (e, t, n, r) => (e >>> 0) + (t >>> 0) + (n >>> 0) + (r >>> 0), pc = (e, t, n, r, o) => t + n + r + o + (e / 2 ** 32 | 0) | 0, gc = (e, t, n, r, o) => (e >>> 0) + (t >>> 0) + (n >>> 0) + (r >>> 0) + (o >>> 0), yc = (e, t, n, r, o, i) => t + n + r + o + i + (e / 2 ** 32 | 0) | 0, ut = typeof globalThis == "object" && "crypto" in globalThis ? globalThis.crypto : void 0;
function dn(e) {
  return e instanceof Uint8Array || ArrayBuffer.isView(e) && e.constructor.name === "Uint8Array";
}
function Be(e) {
  if (!Number.isSafeInteger(e) || e < 0) throw new Error("positive integer expected, got " + e);
}
function we(e, ...t) {
  if (!dn(e)) throw new Error("Uint8Array expected");
  if (t.length > 0 && !t.includes(e.length)) throw new Error("Uint8Array expected of length " + t + ", got length=" + e.length);
}
function pn(e) {
  if (typeof e != "function" || typeof e.create != "function") throw new Error("Hash should be wrapped by utils.createHasher");
  Be(e.outputLen), Be(e.blockLen);
}
function We(e, t = !0) {
  if (e.destroyed) throw new Error("Hash instance has been destroyed");
  if (t && e.finished) throw new Error("Hash#digest() has already been called");
}
function yr(e, t) {
  we(e);
  const n = t.outputLen;
  if (e.length < n) throw new Error("digestInto() expects output buffer of length at least " + n);
}
function Ct(e) {
  return new Uint32Array(e.buffer, e.byteOffset, Math.floor(e.byteLength / 4));
}
function he(...e) {
  for (let t = 0; t < e.length; t++) e[t].fill(0);
}
function Ln(e) {
  return new DataView(e.buffer, e.byteOffset, e.byteLength);
}
function be(e, t) {
  return e << 32 - t | e >>> t;
}
const ai = new Uint8Array(new Uint32Array([287454020]).buffer)[0] === 68;
function fi(e) {
  return e << 24 & 4278190080 | e << 8 & 16711680 | e >>> 8 & 65280 | e >>> 24 & 255;
}
const _e = ai ? (e) => e : (e) => fi(e);
function wc(e) {
  for (let t = 0; t < e.length; t++) e[t] = fi(e[t]);
  return e;
}
const Ce = ai ? (e) => e : wc, ci = typeof Uint8Array.from([]).toHex == "function" && typeof Uint8Array.fromHex == "function", bc = Array.from({ length: 256 }, (e, t) => t.toString(16).padStart(2, "0"));
function pt(e) {
  if (we(e), ci) return e.toHex();
  let t = "";
  for (let n = 0; n < e.length; n++) t += bc[e[n]];
  return t;
}
const ve = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 };
function lo(e) {
  if (e >= ve._0 && e <= ve._9) return e - ve._0;
  if (e >= ve.A && e <= ve.F) return e - (ve.A - 10);
  if (e >= ve.a && e <= ve.f) return e - (ve.a - 10);
}
function sn(e) {
  if (typeof e != "string") throw new Error("hex string expected, got " + typeof e);
  if (ci) return Uint8Array.fromHex(e);
  const t = e.length, n = t / 2;
  if (t % 2) throw new Error("hex string expected, got unpadded hex of length " + t);
  const r = new Uint8Array(n);
  for (let o = 0, i = 0; o < n; o++, i += 2) {
    const a = lo(e.charCodeAt(i)), f = lo(e.charCodeAt(i + 1));
    if (a === void 0 || f === void 0) {
      const l = e[i] + e[i + 1];
      throw new Error('hex string expected, got non-hex character "' + l + '" at index ' + i);
    }
    r[o] = a * 16 + f;
  }
  return r;
}
function ui(e) {
  if (typeof e != "string") throw new Error("string expected");
  return new Uint8Array(new TextEncoder().encode(e));
}
function ye(e) {
  return typeof e == "string" && (e = ui(e)), we(e), e;
}
function $e(...e) {
  let t = 0;
  for (let r = 0; r < e.length; r++) {
    const o = e[r];
    we(o), t += o.length;
  }
  const n = new Uint8Array(t);
  for (let r = 0, o = 0; r < e.length; r++) {
    const i = e[r];
    n.set(i, o), o += i.length;
  }
  return n;
}
class gn {
}
function Ht(e) {
  const t = (r) => e().update(ye(r)).digest(), n = e();
  return t.outputLen = n.outputLen, t.blockLen = n.blockLen, t.create = () => e(), t;
}
function mc(e) {
  const t = (r, o) => e(o).update(ye(r)).digest(), n = e({});
  return t.outputLen = n.outputLen, t.blockLen = n.blockLen, t.create = (r) => e(r), t;
}
function at(e = 32) {
  if (ut && typeof ut.getRandomValues == "function") return ut.getRandomValues(new Uint8Array(e));
  if (ut && typeof ut.randomBytes == "function") return Uint8Array.from(ut.randomBytes(e));
  throw new Error("crypto.getRandomValues must be defined");
}
const vc = BigInt(0), Bt = BigInt(1), Ec = BigInt(2), Oc = BigInt(7), _c = BigInt(256), Ic = BigInt(113), li = [], hi = [], di = [];
for (let e = 0, t = Bt, n = 1, r = 0; e < 24; e++) {
  [n, r] = [r, (2 * n + 3 * r) % 5], li.push(2 * (5 * r + n)), hi.push((e + 1) * (e + 2) / 2 % 64);
  let o = vc;
  for (let i = 0; i < 7; i++) t = (t << Bt ^ (t >> Oc) * Ic) % _c, t & Ec && (o ^= Bt << (Bt << BigInt(i)) - Bt);
  di.push(o);
}
const pi = si(di, !0), Sc = pi[0], xc = pi[1], ho = (e, t, n) => n > 32 ? lc(e, t, n) : cc(e, t, n), po = (e, t, n) => n > 32 ? hc(e, t, n) : uc(e, t, n);
function Bc(e, t = 24) {
  const n = new Uint32Array(10);
  for (let r = 24 - t; r < 24; r++) {
    for (let a = 0; a < 10; a++) n[a] = e[a] ^ e[a + 10] ^ e[a + 20] ^ e[a + 30] ^ e[a + 40];
    for (let a = 0; a < 10; a += 2) {
      const f = (a + 8) % 10, l = (a + 2) % 10, s = n[l], c = n[l + 1], h = ho(s, c, 1) ^ n[f], u = po(s, c, 1) ^ n[f + 1];
      for (let d = 0; d < 50; d += 10) e[a + d] ^= h, e[a + d + 1] ^= u;
    }
    let o = e[2], i = e[3];
    for (let a = 0; a < 24; a++) {
      const f = hi[a], l = ho(o, i, f), s = po(o, i, f), c = li[a];
      o = e[c], i = e[c + 1], e[c] = l, e[c + 1] = s;
    }
    for (let a = 0; a < 50; a += 10) {
      for (let f = 0; f < 10; f++) n[f] = e[a + f];
      for (let f = 0; f < 10; f++) e[a + f] ^= ~n[(f + 2) % 10] & n[(f + 4) % 10];
    }
    e[0] ^= Sc[r], e[1] ^= xc[r];
  }
  he(n);
}
class wr extends gn {
  constructor(t, n, r, o = !1, i = 24) {
    if (super(), this.pos = 0, this.posOut = 0, this.finished = !1, this.destroyed = !1, this.enableXOF = !1, this.blockLen = t, this.suffix = n, this.outputLen = r, this.enableXOF = o, this.rounds = i, Be(r), !(0 < t && t < 200)) throw new Error("only keccak-f1600 function is supported");
    this.state = new Uint8Array(200), this.state32 = Ct(this.state);
  }
  clone() {
    return this._cloneInto();
  }
  keccak() {
    Ce(this.state32), Bc(this.state32, this.rounds), Ce(this.state32), this.posOut = 0, this.pos = 0;
  }
  update(t) {
    We(this), t = ye(t), we(t);
    const { blockLen: n, state: r } = this, o = t.length;
    for (let i = 0; i < o; ) {
      const a = Math.min(n - this.pos, o - i);
      for (let f = 0; f < a; f++) r[this.pos++] ^= t[i++];
      this.pos === n && this.keccak();
    }
    return this;
  }
  finish() {
    if (this.finished) return;
    this.finished = !0;
    const { state: t, suffix: n, pos: r, blockLen: o } = this;
    t[r] ^= n, (n & 128) !== 0 && r === o - 1 && this.keccak(), t[o - 1] ^= 128, this.keccak();
  }
  writeInto(t) {
    We(this, !1), we(t), this.finish();
    const n = this.state, { blockLen: r } = this;
    for (let o = 0, i = t.length; o < i; ) {
      this.posOut >= r && this.keccak();
      const a = Math.min(r - this.posOut, i - o);
      t.set(n.subarray(this.posOut, this.posOut + a), o), this.posOut += a, o += a;
    }
    return t;
  }
  xofInto(t) {
    if (!this.enableXOF) throw new Error("XOF is not possible for this instance");
    return this.writeInto(t);
  }
  xof(t) {
    return Be(t), this.xofInto(new Uint8Array(t));
  }
  digestInto(t) {
    if (yr(t, this), this.finished) throw new Error("digest() was already called");
    return this.writeInto(t), this.destroy(), t;
  }
  digest() {
    return this.digestInto(new Uint8Array(this.outputLen));
  }
  destroy() {
    this.destroyed = !0, he(this.state);
  }
  _cloneInto(t) {
    const { blockLen: n, suffix: r, outputLen: o, rounds: i, enableXOF: a } = this;
    return t || (t = new wr(n, r, o, a, i)), t.state32.set(this.state32), t.pos = this.pos, t.posOut = this.posOut, t.finished = this.finished, t.rounds = i, t.suffix = r, t.outputLen = o, t.enableXOF = a, t.destroyed = this.destroyed, t;
  }
}
const Nc = (e, t, n) => Ht(() => new wr(t, e, n)), Ac = Nc(1, 136, 256 / 8);
function jc(e, t, n, r) {
  if (typeof e.setBigUint64 == "function") return e.setBigUint64(t, n, r);
  const o = BigInt(32), i = BigInt(4294967295), a = Number(n >> o & i), f = Number(n & i), l = r ? 4 : 0, s = r ? 0 : 4;
  e.setUint32(t + l, a, r), e.setUint32(t + s, f, r);
}
function Uc(e, t, n) {
  return e & t ^ ~e & n;
}
function Lc(e, t, n) {
  return e & t ^ e & n ^ t & n;
}
class gi extends gn {
  constructor(t, n, r, o) {
    super(), this.finished = !1, this.length = 0, this.pos = 0, this.destroyed = !1, this.blockLen = t, this.outputLen = n, this.padOffset = r, this.isLE = o, this.buffer = new Uint8Array(t), this.view = Ln(this.buffer);
  }
  update(t) {
    We(this), t = ye(t), we(t);
    const { view: n, buffer: r, blockLen: o } = this, i = t.length;
    for (let a = 0; a < i; ) {
      const f = Math.min(o - this.pos, i - a);
      if (f === o) {
        const l = Ln(t);
        for (; o <= i - a; a += o) this.process(l, a);
        continue;
      }
      r.set(t.subarray(a, a + f), this.pos), this.pos += f, a += f, this.pos === o && (this.process(n, 0), this.pos = 0);
    }
    return this.length += t.length, this.roundClean(), this;
  }
  digestInto(t) {
    We(this), yr(t, this), this.finished = !0;
    const { buffer: n, view: r, blockLen: o, isLE: i } = this;
    let { pos: a } = this;
    n[a++] = 128, he(this.buffer.subarray(a)), this.padOffset > o - a && (this.process(r, 0), a = 0);
    for (let h = a; h < o; h++) n[h] = 0;
    jc(r, o - 8, BigInt(this.length * 8), i), this.process(r, 0);
    const f = Ln(t), l = this.outputLen;
    if (l % 4) throw new Error("_sha2: outputLen should be aligned to 32bit");
    const s = l / 4, c = this.get();
    if (s > c.length) throw new Error("_sha2: outputLen bigger than state");
    for (let h = 0; h < s; h++) f.setUint32(4 * h, c[h], i);
  }
  digest() {
    const { buffer: t, outputLen: n } = this;
    this.digestInto(t);
    const r = t.slice(0, n);
    return this.destroy(), r;
  }
  _cloneInto(t) {
    t || (t = new this.constructor()), t.set(...this.get());
    const { blockLen: n, buffer: r, length: o, finished: i, destroyed: a, pos: f } = this;
    return t.destroyed = a, t.finished = i, t.length = o, t.pos = f, o % n && t.buffer.set(r), t;
  }
  clone() {
    return this._cloneInto();
  }
}
const Ne = Uint32Array.from([1779033703, 3144134277, 1013904242, 2773480762, 1359893119, 2600822924, 528734635, 1541459225]), Q = Uint32Array.from([3418070365, 3238371032, 1654270250, 914150663, 2438529370, 812702999, 355462360, 4144912697, 1731405415, 4290775857, 2394180231, 1750603025, 3675008525, 1694076839, 1203062813, 3204075428]), ee = Uint32Array.from([1779033703, 4089235720, 3144134277, 2227873595, 1013904242, 4271175723, 2773480762, 1595750129, 1359893119, 2917565137, 2600822924, 725511199, 528734635, 4215389547, 1541459225, 327033209]), Rc = Uint32Array.from([1116352408, 1899447441, 3049323471, 3921009573, 961987163, 1508970993, 2453635748, 2870763221, 3624381080, 310598401, 607225278, 1426881987, 1925078388, 2162078206, 2614888103, 3248222580, 3835390401, 4022224774, 264347078, 604807628, 770255983, 1249150122, 1555081692, 1996064986, 2554220882, 2821834349, 2952996808, 3210313671, 3336571891, 3584528711, 113926993, 338241895, 666307205, 773529912, 1294757372, 1396182291, 1695183700, 1986661051, 2177026350, 2456956037, 2730485921, 2820302411, 3259730800, 3345764771, 3516065817, 3600352804, 4094571909, 275423344, 430227734, 506948616, 659060556, 883997877, 958139571, 1322822218, 1537002063, 1747873779, 1955562222, 2024104815, 2227730452, 2361852424, 2428436474, 2756734187, 3204031479, 3329325298]), Ae = new Uint32Array(64);
class Tc extends gi {
  constructor(t = 32) {
    super(64, t, 8, !1), this.A = Ne[0] | 0, this.B = Ne[1] | 0, this.C = Ne[2] | 0, this.D = Ne[3] | 0, this.E = Ne[4] | 0, this.F = Ne[5] | 0, this.G = Ne[6] | 0, this.H = Ne[7] | 0;
  }
  get() {
    const { A: t, B: n, C: r, D: o, E: i, F: a, G: f, H: l } = this;
    return [t, n, r, o, i, a, f, l];
  }
  set(t, n, r, o, i, a, f, l) {
    this.A = t | 0, this.B = n | 0, this.C = r | 0, this.D = o | 0, this.E = i | 0, this.F = a | 0, this.G = f | 0, this.H = l | 0;
  }
  process(t, n) {
    for (let h = 0; h < 16; h++, n += 4) Ae[h] = t.getUint32(n, !1);
    for (let h = 16; h < 64; h++) {
      const u = Ae[h - 15], d = Ae[h - 2], p = be(u, 7) ^ be(u, 18) ^ u >>> 3, g = be(d, 17) ^ be(d, 19) ^ d >>> 10;
      Ae[h] = g + Ae[h - 7] + p + Ae[h - 16] | 0;
    }
    let { A: r, B: o, C: i, D: a, E: f, F: l, G: s, H: c } = this;
    for (let h = 0; h < 64; h++) {
      const u = be(f, 6) ^ be(f, 11) ^ be(f, 25), d = c + u + Uc(f, l, s) + Rc[h] + Ae[h] | 0, p = (be(r, 2) ^ be(r, 13) ^ be(r, 22)) + Lc(r, o, i) | 0;
      c = s, s = l, l = f, f = a + d | 0, a = i, i = o, o = r, r = d + p | 0;
    }
    r = r + this.A | 0, o = o + this.B | 0, i = i + this.C | 0, a = a + this.D | 0, f = f + this.E | 0, l = l + this.F | 0, s = s + this.G | 0, c = c + this.H | 0, this.set(r, o, i, a, f, l, s, c);
  }
  roundClean() {
    he(Ae);
  }
  destroy() {
    this.set(0, 0, 0, 0, 0, 0, 0, 0), he(this.buffer);
  }
}
const yi = si(["0x428a2f98d728ae22", "0x7137449123ef65cd", "0xb5c0fbcfec4d3b2f", "0xe9b5dba58189dbbc", "0x3956c25bf348b538", "0x59f111f1b605d019", "0x923f82a4af194f9b", "0xab1c5ed5da6d8118", "0xd807aa98a3030242", "0x12835b0145706fbe", "0x243185be4ee4b28c", "0x550c7dc3d5ffb4e2", "0x72be5d74f27b896f", "0x80deb1fe3b1696b1", "0x9bdc06a725c71235", "0xc19bf174cf692694", "0xe49b69c19ef14ad2", "0xefbe4786384f25e3", "0x0fc19dc68b8cd5b5", "0x240ca1cc77ac9c65", "0x2de92c6f592b0275", "0x4a7484aa6ea6e483", "0x5cb0a9dcbd41fbd4", "0x76f988da831153b5", "0x983e5152ee66dfab", "0xa831c66d2db43210", "0xb00327c898fb213f", "0xbf597fc7beef0ee4", "0xc6e00bf33da88fc2", "0xd5a79147930aa725", "0x06ca6351e003826f", "0x142929670a0e6e70", "0x27b70a8546d22ffc", "0x2e1b21385c26c926", "0x4d2c6dfc5ac42aed", "0x53380d139d95b3df", "0x650a73548baf63de", "0x766a0abb3c77b2a8", "0x81c2c92e47edaee6", "0x92722c851482353b", "0xa2bfe8a14cf10364", "0xa81a664bbc423001", "0xc24b8b70d0f89791", "0xc76c51a30654be30", "0xd192e819d6ef5218", "0xd69906245565a910", "0xf40e35855771202a", "0x106aa07032bbd1b8", "0x19a4c116b8d2d0c8", "0x1e376c085141ab53", "0x2748774cdf8eeb99", "0x34b0bcb5e19b48a8", "0x391c0cb3c5c95a63", "0x4ed8aa4ae3418acb", "0x5b9cca4f7763e373", "0x682e6ff3d6b2b8a3", "0x748f82ee5defb2fc", "0x78a5636f43172f60", "0x84c87814a1f0ab72", "0x8cc702081a6439ec", "0x90befffa23631e28", "0xa4506cebde82bde9", "0xbef9a3f7b2c67915", "0xc67178f2e372532b", "0xca273eceea26619c", "0xd186b8c721c0c207", "0xeada7dd6cde0eb1e", "0xf57d4f7fee6ed178", "0x06f067aa72176fba", "0x0a637dc5a2c898a6", "0x113f9804bef90dae", "0x1b710b35131c471b", "0x28db77f523047d84", "0x32caab7b40c72493", "0x3c9ebe0a15c9bebc", "0x431d67c49c100d4c", "0x4cc5d4becb3e42b6", "0x597f299cfc657e2a", "0x5fcb6fab3ad6faec", "0x6c44198c4a475817"].map((e) => BigInt(e))), Pc = yi[0], Cc = yi[1], je = new Uint32Array(80), Ue = new Uint32Array(80);
class br extends gi {
  constructor(t = 64) {
    super(128, t, 16, !1), this.Ah = ee[0] | 0, this.Al = ee[1] | 0, this.Bh = ee[2] | 0, this.Bl = ee[3] | 0, this.Ch = ee[4] | 0, this.Cl = ee[5] | 0, this.Dh = ee[6] | 0, this.Dl = ee[7] | 0, this.Eh = ee[8] | 0, this.El = ee[9] | 0, this.Fh = ee[10] | 0, this.Fl = ee[11] | 0, this.Gh = ee[12] | 0, this.Gl = ee[13] | 0, this.Hh = ee[14] | 0, this.Hl = ee[15] | 0;
  }
  get() {
    const { Ah: t, Al: n, Bh: r, Bl: o, Ch: i, Cl: a, Dh: f, Dl: l, Eh: s, El: c, Fh: h, Fl: u, Gh: d, Gl: p, Hh: g, Hl: b } = this;
    return [t, n, r, o, i, a, f, l, s, c, h, u, d, p, g, b];
  }
  set(t, n, r, o, i, a, f, l, s, c, h, u, d, p, g, b) {
    this.Ah = t | 0, this.Al = n | 0, this.Bh = r | 0, this.Bl = o | 0, this.Ch = i | 0, this.Cl = a | 0, this.Dh = f | 0, this.Dl = l | 0, this.Eh = s | 0, this.El = c | 0, this.Fh = h | 0, this.Fl = u | 0, this.Gh = d | 0, this.Gl = p | 0, this.Hh = g | 0, this.Hl = b | 0;
  }
  process(t, n) {
    for (let A = 0; A < 16; A++, n += 4) je[A] = t.getUint32(n), Ue[A] = t.getUint32(n += 4);
    for (let A = 16; A < 80; A++) {
      const E = je[A - 15] | 0, v = Ue[A - 15] | 0, _ = Te(E, v, 1) ^ Te(E, v, 8) ^ co(E, v, 7), B = Pe(E, v, 1) ^ Pe(E, v, 8) ^ uo(E, v, 7), U = je[A - 2] | 0, S = Ue[A - 2] | 0, R = Te(U, S, 19) ^ At(U, S, 61) ^ co(U, S, 6), k = Pe(U, S, 19) ^ jt(U, S, 61) ^ uo(U, S, 6), x = dc(B, k, Ue[A - 7], Ue[A - 16]), y = pc(x, _, R, je[A - 7], je[A - 16]);
      je[A] = y | 0, Ue[A] = x | 0;
    }
    let { Ah: r, Al: o, Bh: i, Bl: a, Ch: f, Cl: l, Dh: s, Dl: c, Eh: h, El: u, Fh: d, Fl: p, Gh: g, Gl: b, Hh: $, Hl: C } = this;
    for (let A = 0; A < 80; A++) {
      const E = Te(h, u, 14) ^ Te(h, u, 18) ^ At(h, u, 41), v = Pe(h, u, 14) ^ Pe(h, u, 18) ^ jt(h, u, 41), _ = h & d ^ ~h & g, B = u & p ^ ~u & b, U = gc(C, v, B, Cc[A], Ue[A]), S = yc(U, $, E, _, Pc[A], je[A]), R = U | 0, k = Te(r, o, 28) ^ At(r, o, 34) ^ At(r, o, 39), x = Pe(r, o, 28) ^ jt(r, o, 34) ^ jt(r, o, 39), y = r & i ^ r & f ^ i & f, w = o & a ^ o & l ^ a & l;
      $ = g | 0, C = b | 0, g = d | 0, b = p | 0, d = h | 0, p = u | 0, { h, l: u } = ge(s | 0, c | 0, S | 0, R | 0), s = f | 0, c = l | 0, f = i | 0, l = a | 0, i = r | 0, a = o | 0;
      const m = pr(R, x, w);
      r = gr(m, S, k, y), o = m | 0;
    }
    ({ h: r, l: o } = ge(this.Ah | 0, this.Al | 0, r | 0, o | 0)), { h: i, l: a } = ge(this.Bh | 0, this.Bl | 0, i | 0, a | 0), { h: f, l } = ge(this.Ch | 0, this.Cl | 0, f | 0, l | 0), { h: s, l: c } = ge(this.Dh | 0, this.Dl | 0, s | 0, c | 0), { h, l: u } = ge(this.Eh | 0, this.El | 0, h | 0, u | 0), { h: d, l: p } = ge(this.Fh | 0, this.Fl | 0, d | 0, p | 0), { h: g, l: b } = ge(this.Gh | 0, this.Gl | 0, g | 0, b | 0), { h: $, l: C } = ge(this.Hh | 0, this.Hl | 0, $ | 0, C | 0), this.set(r, o, i, a, f, l, s, c, h, u, d, p, g, b, $, C);
  }
  roundClean() {
    he(je, Ue);
  }
  destroy() {
    he(this.buffer), this.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
  }
}
class Dc extends br {
  constructor() {
    super(48), this.Ah = Q[0] | 0, this.Al = Q[1] | 0, this.Bh = Q[2] | 0, this.Bl = Q[3] | 0, this.Ch = Q[4] | 0, this.Cl = Q[5] | 0, this.Dh = Q[6] | 0, this.Dl = Q[7] | 0, this.Eh = Q[8] | 0, this.El = Q[9] | 0, this.Fh = Q[10] | 0, this.Fl = Q[11] | 0, this.Gh = Q[12] | 0, this.Gl = Q[13] | 0, this.Hh = Q[14] | 0, this.Hl = Q[15] | 0;
  }
}
const te = Uint32Array.from([573645204, 4230739756, 2673172387, 3360449730, 596883563, 1867755857, 2520282905, 1497426621, 2519219938, 2827943907, 3193839141, 1401305490, 721525244, 746961066, 246885852, 2177182882]);
class $c extends br {
  constructor() {
    super(32), this.Ah = te[0] | 0, this.Al = te[1] | 0, this.Bh = te[2] | 0, this.Bl = te[3] | 0, this.Ch = te[4] | 0, this.Cl = te[5] | 0, this.Dh = te[6] | 0, this.Dl = te[7] | 0, this.Eh = te[8] | 0, this.El = te[9] | 0, this.Fh = te[10] | 0, this.Fl = te[11] | 0, this.Gh = te[12] | 0, this.Gl = te[13] | 0, this.Hh = te[14] | 0, this.Hl = te[15] | 0;
  }
}
const yn = Ht(() => new Tc()), kc = Ht(() => new br()), Mc = Ht(() => new Dc()), Fc = Ht(() => new $c()), Kc = Uint8Array.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 14, 10, 4, 8, 9, 15, 13, 6, 1, 12, 0, 2, 11, 7, 5, 3, 11, 8, 12, 0, 5, 2, 15, 13, 10, 14, 3, 6, 7, 1, 9, 4, 7, 9, 3, 1, 13, 12, 11, 14, 2, 6, 5, 10, 4, 0, 15, 8, 9, 0, 5, 7, 2, 4, 10, 15, 14, 1, 11, 12, 6, 8, 3, 13, 2, 12, 6, 10, 0, 11, 8, 3, 4, 13, 7, 5, 15, 14, 1, 9, 12, 5, 1, 15, 14, 13, 4, 10, 0, 7, 6, 3, 9, 2, 8, 11, 13, 11, 7, 14, 12, 1, 3, 9, 5, 0, 15, 4, 8, 6, 2, 10, 6, 15, 14, 9, 11, 3, 0, 8, 12, 2, 13, 7, 1, 4, 10, 5, 10, 2, 8, 4, 7, 6, 1, 5, 15, 11, 9, 14, 3, 12, 13, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 14, 10, 4, 8, 9, 15, 13, 6, 1, 12, 0, 2, 11, 7, 5, 3, 11, 8, 12, 0, 5, 2, 15, 13, 10, 14, 3, 6, 7, 1, 9, 4, 7, 9, 3, 1, 13, 12, 11, 14, 2, 6, 5, 10, 4, 0, 15, 8, 9, 0, 5, 7, 2, 4, 10, 15, 14, 1, 11, 12, 6, 8, 3, 13, 2, 12, 6, 10, 0, 11, 8, 3, 4, 13, 7, 5, 15, 14, 1, 9]), Y = Uint32Array.from([4089235720, 1779033703, 2227873595, 3144134277, 4271175723, 1013904242, 1595750129, 2773480762, 2917565137, 1359893119, 725511199, 2600822924, 4215389547, 528734635, 327033209, 1541459225]), T = new Uint32Array(32);
function Le(e, t, n, r, o, i) {
  const a = o[i], f = o[i + 1];
  let l = T[2 * e], s = T[2 * e + 1], c = T[2 * t], h = T[2 * t + 1], u = T[2 * n], d = T[2 * n + 1], p = T[2 * r], g = T[2 * r + 1], b = pr(l, c, a);
  s = gr(b, s, h, f), l = b | 0, { Dh: g, Dl: p } = { Dh: g ^ s, Dl: p ^ l }, { Dh: g, Dl: p } = { Dh: ac(g, p), Dl: fc(g) }, { h: d, l: u } = ge(d, u, g, p), { Bh: h, Bl: c } = { Bh: h ^ d, Bl: c ^ u }, { Bh: h, Bl: c } = { Bh: Te(h, c, 24), Bl: Pe(h, c, 24) }, T[2 * e] = l, T[2 * e + 1] = s, T[2 * t] = c, T[2 * t + 1] = h, T[2 * n] = u, T[2 * n + 1] = d, T[2 * r] = p, T[2 * r + 1] = g;
}
function Re(e, t, n, r, o, i) {
  const a = o[i], f = o[i + 1];
  let l = T[2 * e], s = T[2 * e + 1], c = T[2 * t], h = T[2 * t + 1], u = T[2 * n], d = T[2 * n + 1], p = T[2 * r], g = T[2 * r + 1], b = pr(l, c, a);
  s = gr(b, s, h, f), l = b | 0, { Dh: g, Dl: p } = { Dh: g ^ s, Dl: p ^ l }, { Dh: g, Dl: p } = { Dh: Te(g, p, 16), Dl: Pe(g, p, 16) }, { h: d, l: u } = ge(d, u, g, p), { Bh: h, Bl: c } = { Bh: h ^ d, Bl: c ^ u }, { Bh: h, Bl: c } = { Bh: At(h, c, 63), Bl: jt(h, c, 63) }, T[2 * e] = l, T[2 * e + 1] = s, T[2 * t] = c, T[2 * t + 1] = h, T[2 * n] = u, T[2 * n + 1] = d, T[2 * r] = p, T[2 * r + 1] = g;
}
function Hc(e, t = {}, n, r, o) {
  if (Be(n), e < 0 || e > n) throw new Error("outputLen bigger than keyLen");
  const { key: i, salt: a, personalization: f } = t;
  if (i !== void 0 && (i.length < 1 || i.length > n)) throw new Error("key length must be undefined or 1.." + n);
  if (a !== void 0 && a.length !== r) throw new Error("salt must be undefined or " + r);
  if (f !== void 0 && f.length !== o) throw new Error("personalization must be undefined or " + o);
}
class zc extends gn {
  constructor(t, n) {
    super(), this.finished = !1, this.destroyed = !1, this.length = 0, this.pos = 0, Be(t), Be(n), this.blockLen = t, this.outputLen = n, this.buffer = new Uint8Array(t), this.buffer32 = Ct(this.buffer);
  }
  update(t) {
    We(this), t = ye(t), we(t);
    const { blockLen: n, buffer: r, buffer32: o } = this, i = t.length, a = t.byteOffset, f = t.buffer;
    for (let l = 0; l < i; ) {
      this.pos === n && (Ce(o), this.compress(o, 0, !1), Ce(o), this.pos = 0);
      const s = Math.min(n - this.pos, i - l), c = a + l;
      if (s === n && !(c % 4) && l + s < i) {
        const h = new Uint32Array(f, c, Math.floor((i - l) / 4));
        Ce(h);
        for (let u = 0; l + n < i; u += o.length, l += n) this.length += n, this.compress(h, u, !1);
        Ce(h);
        continue;
      }
      r.set(t.subarray(l, l + s), this.pos), this.pos += s, this.length += s, l += s;
    }
    return this;
  }
  digestInto(t) {
    We(this), yr(t, this);
    const { pos: n, buffer32: r } = this;
    this.finished = !0, he(this.buffer.subarray(n)), Ce(r), this.compress(r, 0, !0), Ce(r);
    const o = Ct(t);
    this.get().forEach((i, a) => o[a] = _e(i));
  }
  digest() {
    const { buffer: t, outputLen: n } = this;
    this.digestInto(t);
    const r = t.slice(0, n);
    return this.destroy(), r;
  }
  _cloneInto(t) {
    const { buffer: n, length: r, finished: o, destroyed: i, outputLen: a, pos: f } = this;
    return t || (t = new this.constructor({ dkLen: a })), t.set(...this.get()), t.buffer.set(n), t.destroyed = i, t.finished = o, t.length = r, t.pos = f, t.outputLen = a, t;
  }
  clone() {
    return this._cloneInto();
  }
}
class Vc extends zc {
  constructor(t = {}) {
    const n = t.dkLen === void 0 ? 64 : t.dkLen;
    super(128, n), this.v0l = Y[0] | 0, this.v0h = Y[1] | 0, this.v1l = Y[2] | 0, this.v1h = Y[3] | 0, this.v2l = Y[4] | 0, this.v2h = Y[5] | 0, this.v3l = Y[6] | 0, this.v3h = Y[7] | 0, this.v4l = Y[8] | 0, this.v4h = Y[9] | 0, this.v5l = Y[10] | 0, this.v5h = Y[11] | 0, this.v6l = Y[12] | 0, this.v6h = Y[13] | 0, this.v7l = Y[14] | 0, this.v7h = Y[15] | 0, Hc(n, t, 64, 16, 16);
    let { key: r, personalization: o, salt: i } = t, a = 0;
    if (r !== void 0 && (r = ye(r), a = r.length), this.v0l ^= this.outputLen | a << 8 | 65536 | 1 << 24, i !== void 0) {
      i = ye(i);
      const f = Ct(i);
      this.v4l ^= _e(f[0]), this.v4h ^= _e(f[1]), this.v5l ^= _e(f[2]), this.v5h ^= _e(f[3]);
    }
    if (o !== void 0) {
      o = ye(o);
      const f = Ct(o);
      this.v6l ^= _e(f[0]), this.v6h ^= _e(f[1]), this.v7l ^= _e(f[2]), this.v7h ^= _e(f[3]);
    }
    if (r !== void 0) {
      const f = new Uint8Array(this.blockLen);
      f.set(r), this.update(f);
    }
  }
  get() {
    let { v0l: t, v0h: n, v1l: r, v1h: o, v2l: i, v2h: a, v3l: f, v3h: l, v4l: s, v4h: c, v5l: h, v5h: u, v6l: d, v6h: p, v7l: g, v7h: b } = this;
    return [t, n, r, o, i, a, f, l, s, c, h, u, d, p, g, b];
  }
  set(t, n, r, o, i, a, f, l, s, c, h, u, d, p, g, b) {
    this.v0l = t | 0, this.v0h = n | 0, this.v1l = r | 0, this.v1h = o | 0, this.v2l = i | 0, this.v2h = a | 0, this.v3l = f | 0, this.v3h = l | 0, this.v4l = s | 0, this.v4h = c | 0, this.v5l = h | 0, this.v5h = u | 0, this.v6l = d | 0, this.v6h = p | 0, this.v7l = g | 0, this.v7h = b | 0;
  }
  compress(t, n, r) {
    this.get().forEach((l, s) => T[s] = l), T.set(Y, 16);
    let { h: o, l: i } = ii(BigInt(this.length));
    T[24] = Y[8] ^ i, T[25] = Y[9] ^ o, r && (T[28] = ~T[28], T[29] = ~T[29]);
    let a = 0;
    const f = Kc;
    for (let l = 0; l < 12; l++) Le(0, 4, 8, 12, t, n + 2 * f[a++]), Re(0, 4, 8, 12, t, n + 2 * f[a++]), Le(1, 5, 9, 13, t, n + 2 * f[a++]), Re(1, 5, 9, 13, t, n + 2 * f[a++]), Le(2, 6, 10, 14, t, n + 2 * f[a++]), Re(2, 6, 10, 14, t, n + 2 * f[a++]), Le(3, 7, 11, 15, t, n + 2 * f[a++]), Re(3, 7, 11, 15, t, n + 2 * f[a++]), Le(0, 5, 10, 15, t, n + 2 * f[a++]), Re(0, 5, 10, 15, t, n + 2 * f[a++]), Le(1, 6, 11, 12, t, n + 2 * f[a++]), Re(1, 6, 11, 12, t, n + 2 * f[a++]), Le(2, 7, 8, 13, t, n + 2 * f[a++]), Re(2, 7, 8, 13, t, n + 2 * f[a++]), Le(3, 4, 9, 14, t, n + 2 * f[a++]), Re(3, 4, 9, 14, t, n + 2 * f[a++]);
    this.v0l ^= T[0] ^ T[16], this.v0h ^= T[1] ^ T[17], this.v1l ^= T[2] ^ T[18], this.v1h ^= T[3] ^ T[19], this.v2l ^= T[4] ^ T[20], this.v2h ^= T[5] ^ T[21], this.v3l ^= T[6] ^ T[22], this.v3h ^= T[7] ^ T[23], this.v4l ^= T[8] ^ T[24], this.v4h ^= T[9] ^ T[25], this.v5l ^= T[10] ^ T[26], this.v5h ^= T[11] ^ T[27], this.v6l ^= T[12] ^ T[28], this.v6h ^= T[13] ^ T[29], this.v7l ^= T[14] ^ T[30], this.v7h ^= T[15] ^ T[31], he(T);
  }
  destroy() {
    this.destroyed = !0, he(this.buffer32), this.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
  }
}
const Wc = mc((e) => new Vc(e)), qc = "https://rpc.walletconnect.org/v1";
function wi(e) {
  const t = `Ethereum Signed Message:
${e.length}`, n = new TextEncoder().encode(t + e);
  return "0x" + Buffer.from(Ac(n)).toString("hex");
}
async function Gc(e, t, n, r, o, i) {
  switch (n.t) {
    case "eip191":
      return await Yc(e, t, n.s);
    case "eip1271":
      return await Zc(e, t, n.s, r, o, i);
    default:
      throw new Error(`verifySignature failed: Attempted to verify CacaoSignature with unknown type: ${n.t}`);
  }
}
function Yc(e, t, n) {
  const r = fs(n);
  return cs({ payload: wi(t), signature: r }).toLowerCase() === e.toLowerCase();
}
async function Zc(e, t, n, r, o, i) {
  const a = Kf(r);
  if (!a.namespace || !a.reference) throw new Error(`isValidEip1271Signature failed: chainId must be in CAIP-2 format, received: ${r}`);
  try {
    const f = "0x1626ba7e", l = "0000000000000000000000000000000000000000000000000000000000000040", s = n.substring(2), c = (s.length / 2).toString(16).padStart(64, "0"), h = (t.startsWith("0x") ? t : wi(t)).substring(2), u = f + h + l + c + s, d = await fetch(`${i || qc}/?chainId=${r}&projectId=${o}`, { headers: { "Content-Type": "application/json" }, method: "POST", body: JSON.stringify({ id: Xc(), jsonrpc: "2.0", method: "eth_call", params: [{ to: e, data: u }, "latest"] }) }), { result: p } = await d.json();
    return p ? p.slice(0, f.length).toLowerCase() === f.toLowerCase() : !1;
  } catch (f) {
    return console.error("isValidEip1271Signature: ", f), !1;
  }
}
function Xc() {
  return Date.now() + Math.floor(Math.random() * 1e3);
}
function Yd(e) {
  const t = atob(e), n = new Uint8Array(t.length);
  for (let a = 0; a < t.length; a++) n[a] = t.charCodeAt(a);
  const r = n[0];
  if (r === 0) throw new Error("No signatures found");
  const o = 1 + r * 64;
  if (n.length < o) throw new Error("Transaction data too short for claimed signature count");
  if (n.length < 100) throw new Error("Transaction too short");
  const i = Buffer.from(e, "base64").slice(1, 65);
  return Mt.encode(i);
}
function Zd(e) {
  const t = new Uint8Array(Buffer.from(e, "base64")), n = Array.from("TransactionData::").map((i) => i.charCodeAt(0)), r = new Uint8Array(n.length + t.length);
  r.set(n), r.set(t, n.length);
  const o = Wc(r, { dkLen: 32 });
  return Mt.encode(o);
}
function Xd(e) {
  const t = new Uint8Array(yn(Jc(e)));
  return Mt.encode(t);
}
function Jc(e) {
  if (e instanceof Uint8Array) return e;
  if (Array.isArray(e)) return new Uint8Array(e);
  if (typeof e == "object" && e != null && e.data) return new Uint8Array(Object.values(e.data));
  if (typeof e == "object" && e) return new Uint8Array(Object.values(e));
  throw new Error("getNearUint8ArrayFromBytes: Unexpected result type from bytes array");
}
function Jd(e) {
  const t = Buffer.from(e, "base64"), n = os(t).txn;
  if (!n) throw new Error("Invalid signed transaction: missing 'txn' field");
  const r = is(n), o = Buffer.from("TX"), i = Buffer.concat([o, Buffer.from(r)]), a = Fc(i);
  return ss.encode(a).replace(/=+$/, "");
}
function Rn(e) {
  const t = [];
  let n = BigInt(e);
  for (; n >= BigInt(128); ) t.push(Number(n & BigInt(127) | BigInt(128))), n >>= BigInt(7);
  return t.push(Number(n)), Buffer.from(t);
}
function Qd(e) {
  const t = Buffer.from(e.signed.bodyBytes, "base64"), n = Buffer.from(e.signed.authInfoBytes, "base64"), r = Buffer.from(e.signature.signature, "base64"), o = [];
  o.push(Buffer.from([10])), o.push(Rn(t.length)), o.push(t), o.push(Buffer.from([18])), o.push(Rn(n.length)), o.push(n), o.push(Buffer.from([26])), o.push(Rn(r.length)), o.push(r);
  const i = Buffer.concat(o), a = yn(i);
  return Buffer.from(a).toString("hex").toUpperCase();
}
function e0(e) {
  var t, n;
  const r = [];
  try {
    if (typeof e == "string") return r.push(e), r;
    if (typeof e != "object") return r;
    e != null && e.id && r.push(e.id);
    const o = (n = (t = e?.capabilities) == null ? void 0 : t.caip345) == null ? void 0 : n.transactionHashes;
    o && r.push(...o);
  } catch (o) {
    console.warn("getWalletSendCallsHashes failed: ", o);
  }
  return r;
}
var Qc = Object.defineProperty, eu = Object.defineProperties, tu = Object.getOwnPropertyDescriptors, go = Object.getOwnPropertySymbols, nu = Object.prototype.hasOwnProperty, ru = Object.prototype.propertyIsEnumerable, yo = (e, t, n) => t in e ? Qc(e, t, { enumerable: !0, configurable: !0, writable: !0, value: n }) : e[t] = n, ou = (e, t) => {
  for (var n in t || (t = {})) nu.call(t, n) && yo(e, n, t[n]);
  if (go) for (var n of go(t)) ru.call(t, n) && yo(e, n, t[n]);
  return e;
}, iu = (e, t) => eu(e, tu(t));
const bi = "did:pkh:", su = { eip155: "Ethereum", solana: "Solana", bip122: "Bitcoin" }, au = (e) => e ? su[e] || e : "", wn = (e) => e?.split(":"), fu = (e) => {
  const t = e && wn(e);
  if (t) return e.includes(bi) ? t[3] : t[1];
}, cu = (e) => {
  const t = e && wn(e);
  if (t) return e.includes(bi) ? t[2] : t[0];
}, uu = (e) => {
  const t = e && wn(e);
  if (t) return t[2] + ":" + t[3];
}, mi = (e) => {
  const t = e && wn(e);
  if (t) return t.pop();
};
async function t0(e) {
  const { cacao: t, projectId: n } = e, { s: r, p: o } = t, i = lu(o, o.iss), a = mi(o.iss);
  return await Gc(a, i, r, uu(o.iss), n);
}
const lu = (e, t) => {
  const n = cu(t);
  if (!n) throw new Error("Invalid issuer: " + t);
  const r = `${e.domain} wants you to sign in with your ${au(n)} account:`, o = mi(t);
  if (!e.aud && !e.uri) throw new Error("Either `aud` or `uri` is required to construct the message");
  let i = e.statement || void 0;
  const a = `URI: ${e.aud || e.uri}`, f = `Version: ${e.version}`, l = `Chain ID: ${fu(t)}`, s = `Nonce: ${e.nonce}`, c = `Issued At: ${e.iat}`, h = e.exp ? `Expiration Time: ${e.exp}` : void 0, u = e.nbf ? `Not Before: ${e.nbf}` : void 0, d = e.requestId ? `Request ID: ${e.requestId}` : void 0, p = e.resources ? `Resources:${e.resources.map((b) => `
- ${b}`).join("")}` : void 0, g = mu(e.resources);
  if (g) {
    const b = Dt(g);
    i = bu(i, b);
  }
  return [r, o, "", i, "", a, f, l, s, c, h, u, d, p].filter((b) => b != null).join(`
`);
};
function hu(e) {
  return Buffer.from(JSON.stringify(e)).toString("base64");
}
function du(e) {
  return JSON.parse(Buffer.from(e, "base64").toString("utf-8"));
}
function rt(e) {
  if (!e) throw new Error("No recap provided, value is undefined");
  if (!e.att) throw new Error("No `att` property found");
  const t = Object.keys(e.att);
  if (!(t != null && t.length)) throw new Error("No resources found in `att` property");
  t.forEach((n) => {
    const r = e.att[n];
    if (Array.isArray(r)) throw new Error(`Resource must be an object: ${n}`);
    if (typeof r != "object") throw new Error(`Resource must be an object: ${n}`);
    if (!Object.keys(r).length) throw new Error(`Resource object is empty: ${n}`);
    Object.keys(r).forEach((o) => {
      const i = r[o];
      if (!Array.isArray(i)) throw new Error(`Ability limits ${o} must be an array of objects, found: ${i}`);
      if (!i.length) throw new Error(`Value of ${o} is empty array, must be an array with objects`);
      i.forEach((a) => {
        if (typeof a != "object") throw new Error(`Ability limits (${o}) must be an array of objects, found: ${a}`);
      });
    });
  });
}
function pu(e, t, n, r = {}) {
  return n?.sort((o, i) => o.localeCompare(i)), { att: { [e]: gu(t, n, r) } };
}
function gu(e, t, n = {}) {
  t = t?.sort((o, i) => o.localeCompare(i));
  const r = t.map((o) => ({ [`${e}/${o}`]: [n] }));
  return Object.assign({}, ...r);
}
function vi(e) {
  return rt(e), `urn:recap:${hu(e).replace(/=/g, "")}`;
}
function Dt(e) {
  const t = du(e.replace("urn:recap:", ""));
  return rt(t), t;
}
function n0(e, t, n) {
  const r = pu(e, t, n);
  return vi(r);
}
function yu(e) {
  return e && e.includes("urn:recap:");
}
function r0(e, t) {
  const n = Dt(e), r = Dt(t), o = wu(n, r);
  return vi(o);
}
function wu(e, t) {
  rt(e), rt(t);
  const n = Object.keys(e.att).concat(Object.keys(t.att)).sort((o, i) => o.localeCompare(i)), r = { att: {} };
  return n.forEach((o) => {
    var i, a;
    Object.keys(((i = e.att) == null ? void 0 : i[o]) || {}).concat(Object.keys(((a = t.att) == null ? void 0 : a[o]) || {})).sort((f, l) => f.localeCompare(l)).forEach((f) => {
      var l, s;
      r.att[o] = iu(ou({}, r.att[o]), { [f]: ((l = e.att[o]) == null ? void 0 : l[f]) || ((s = t.att[o]) == null ? void 0 : s[f]) });
    });
  }), r;
}
function bu(e = "", t) {
  rt(t);
  const n = "I further authorize the stated URI to perform the following actions on my behalf: ";
  if (e.includes(n)) return e;
  const r = [];
  let o = 0;
  Object.keys(t.att).forEach((f) => {
    const l = Object.keys(t.att[f]).map((h) => ({ ability: h.split("/")[0], action: h.split("/")[1] }));
    l.sort((h, u) => h.action.localeCompare(u.action));
    const s = {};
    l.forEach((h) => {
      s[h.ability] || (s[h.ability] = []), s[h.ability].push(h.action);
    });
    const c = Object.keys(s).map((h) => (o++, `(${o}) '${h}': '${s[h].join("', '")}' for '${f}'.`));
    r.push(c.join(", ").replace(".,", "."));
  });
  const i = r.join(" "), a = `${n}${i}`;
  return `${e ? e + " " : ""}${a}`;
}
function o0(e) {
  var t;
  const n = Dt(e);
  rt(n);
  const r = (t = n.att) == null ? void 0 : t.eip155;
  return r ? Object.keys(r).map((o) => o.split("/")[1]) : [];
}
function i0(e) {
  const t = Dt(e);
  rt(t);
  const n = [];
  return Object.values(t.att).forEach((r) => {
    Object.values(r).forEach((o) => {
      var i;
      (i = o?.[0]) != null && i.chains && n.push(o[0].chains);
    });
  }), [...new Set(n.flat())];
}
function mu(e) {
  if (!e) return;
  const t = e?.[e.length - 1];
  return yu(t) ? t : void 0;
}
function Ei(e) {
  return e instanceof Uint8Array || ArrayBuffer.isView(e) && e.constructor.name === "Uint8Array";
}
function Jn(e) {
  if (typeof e != "boolean") throw new Error(`boolean expected, not ${e}`);
}
function Tn(e) {
  if (!Number.isSafeInteger(e) || e < 0) throw new Error("positive integer expected, got " + e);
}
function ie(e, ...t) {
  if (!Ei(e)) throw new Error("Uint8Array expected");
  if (t.length > 0 && !t.includes(e.length)) throw new Error("Uint8Array expected of length " + t + ", got length=" + e.length);
}
function wo(e, t = !0) {
  if (e.destroyed) throw new Error("Hash instance has been destroyed");
  if (t && e.finished) throw new Error("Hash#digest() has already been called");
}
function vu(e, t) {
  ie(e);
  const n = t.outputLen;
  if (e.length < n) throw new Error("digestInto() expects output buffer of length at least " + n);
}
function ze(e) {
  return new Uint32Array(e.buffer, e.byteOffset, Math.floor(e.byteLength / 4));
}
function wt(...e) {
  for (let t = 0; t < e.length; t++) e[t].fill(0);
}
function Eu(e) {
  return new DataView(e.buffer, e.byteOffset, e.byteLength);
}
const Ou = new Uint8Array(new Uint32Array([287454020]).buffer)[0] === 68;
function _u(e) {
  if (typeof e != "string") throw new Error("string expected");
  return new Uint8Array(new TextEncoder().encode(e));
}
function Qn(e) {
  if (typeof e == "string") e = _u(e);
  else if (Ei(e)) e = er(e);
  else throw new Error("Uint8Array expected, got " + typeof e);
  return e;
}
function Iu(e, t) {
  if (t == null || typeof t != "object") throw new Error("options must be defined");
  return Object.assign(e, t);
}
function Su(e, t) {
  if (e.length !== t.length) return !1;
  let n = 0;
  for (let r = 0; r < e.length; r++) n |= e[r] ^ t[r];
  return n === 0;
}
const xu = (e, t) => {
  function n(r, ...o) {
    if (ie(r), !Ou) throw new Error("Non little-endian hardware is not yet supported");
    if (e.nonceLength !== void 0) {
      const s = o[0];
      if (!s) throw new Error("nonce / iv required");
      e.varSizeNonce ? ie(s) : ie(s, e.nonceLength);
    }
    const i = e.tagLength;
    i && o[1] !== void 0 && ie(o[1]);
    const a = t(r, ...o), f = (s, c) => {
      if (c !== void 0) {
        if (s !== 2) throw new Error("cipher output not supported");
        ie(c);
      }
    };
    let l = !1;
    return { encrypt(s, c) {
      if (l) throw new Error("cannot encrypt() twice with same key + nonce");
      return l = !0, ie(s), f(a.encrypt.length, c), a.encrypt(s, c);
    }, decrypt(s, c) {
      if (ie(s), i && s.length < i) throw new Error("invalid ciphertext length: smaller than tagLength=" + i);
      return f(a.decrypt.length, c), a.decrypt(s, c);
    } };
  }
  return Object.assign(n, e), n;
};
function bo(e, t, n = !0) {
  if (t === void 0) return new Uint8Array(e);
  if (t.length !== e) throw new Error("invalid output length, expected " + e + ", got: " + t.length);
  if (n && !Nu(t)) throw new Error("invalid output, must be aligned");
  return t;
}
function mo(e, t, n, r) {
  if (typeof e.setBigUint64 == "function") return e.setBigUint64(t, n, r);
  const o = BigInt(32), i = BigInt(4294967295), a = Number(n >> o & i), f = Number(n & i);
  e.setUint32(t + 4, a, r), e.setUint32(t + 0, f, r);
}
function Bu(e, t, n) {
  Jn(n);
  const r = new Uint8Array(16), o = Eu(r);
  return mo(o, 0, BigInt(t), n), mo(o, 8, BigInt(e), n), r;
}
function Nu(e) {
  return e.byteOffset % 4 === 0;
}
function er(e) {
  return Uint8Array.from(e);
}
const Oi = (e) => Uint8Array.from(e.split("").map((t) => t.charCodeAt(0))), Au = Oi("expand 16-byte k"), ju = Oi("expand 32-byte k"), Uu = ze(Au), Lu = ze(ju);
function z(e, t) {
  return e << t | e >>> 32 - t;
}
function tr(e) {
  return e.byteOffset % 4 === 0;
}
const Qt = 64, Ru = 16, _i = 2 ** 32 - 1, vo = new Uint32Array();
function Tu(e, t, n, r, o, i, a, f) {
  const l = o.length, s = new Uint8Array(Qt), c = ze(s), h = tr(o) && tr(i), u = h ? ze(o) : vo, d = h ? ze(i) : vo;
  for (let p = 0; p < l; a++) {
    if (e(t, n, r, c, a, f), a >= _i) throw new Error("arx: counter overflow");
    const g = Math.min(Qt, l - p);
    if (h && g === Qt) {
      const b = p / 4;
      if (p % 4 !== 0) throw new Error("arx: invalid block position");
      for (let $ = 0, C; $ < Ru; $++) C = b + $, d[C] = u[C] ^ c[$];
      p += Qt;
      continue;
    }
    for (let b = 0, $; b < g; b++) $ = p + b, i[$] = o[$] ^ s[b];
    p += g;
  }
}
function Pu(e, t) {
  const { allowShortKeys: n, extendNonceFn: r, counterLength: o, counterRight: i, rounds: a } = Iu({ allowShortKeys: !1, counterLength: 8, counterRight: !1, rounds: 20 }, t);
  if (typeof e != "function") throw new Error("core must be a function");
  return Tn(o), Tn(a), Jn(i), Jn(n), (f, l, s, c, h = 0) => {
    ie(f), ie(l), ie(s);
    const u = s.length;
    if (c === void 0 && (c = new Uint8Array(u)), ie(c), Tn(h), h < 0 || h >= _i) throw new Error("arx: counter overflow");
    if (c.length < u) throw new Error(`arx: output (${c.length}) is shorter than data (${u})`);
    const d = [];
    let p = f.length, g, b;
    if (p === 32) d.push(g = er(f)), b = Lu;
    else if (p === 16 && n) g = new Uint8Array(32), g.set(f), g.set(f, 16), b = Uu, d.push(g);
    else throw new Error(`arx: invalid 32-byte key, got length=${p}`);
    tr(l) || d.push(l = er(l));
    const $ = ze(g);
    if (r) {
      if (l.length !== 24) throw new Error("arx: extended nonce must be 24 bytes");
      r(b, $, ze(l.subarray(0, 16)), $), l = l.subarray(16);
    }
    const C = 16 - o;
    if (C !== l.length) throw new Error(`arx: nonce must be ${C} or 16 bytes`);
    if (C !== 12) {
      const E = new Uint8Array(12);
      E.set(l, i ? 0 : 12 - l.length), l = E, d.push(l);
    }
    const A = ze(l);
    return Tu(e, b, $, A, s, c, h, a), wt(...d), c;
  };
}
const J = (e, t) => e[t++] & 255 | (e[t++] & 255) << 8;
class Cu {
  constructor(t) {
    this.blockLen = 16, this.outputLen = 16, this.buffer = new Uint8Array(16), this.r = new Uint16Array(10), this.h = new Uint16Array(10), this.pad = new Uint16Array(8), this.pos = 0, this.finished = !1, t = Qn(t), ie(t, 32);
    const n = J(t, 0), r = J(t, 2), o = J(t, 4), i = J(t, 6), a = J(t, 8), f = J(t, 10), l = J(t, 12), s = J(t, 14);
    this.r[0] = n & 8191, this.r[1] = (n >>> 13 | r << 3) & 8191, this.r[2] = (r >>> 10 | o << 6) & 7939, this.r[3] = (o >>> 7 | i << 9) & 8191, this.r[4] = (i >>> 4 | a << 12) & 255, this.r[5] = a >>> 1 & 8190, this.r[6] = (a >>> 14 | f << 2) & 8191, this.r[7] = (f >>> 11 | l << 5) & 8065, this.r[8] = (l >>> 8 | s << 8) & 8191, this.r[9] = s >>> 5 & 127;
    for (let c = 0; c < 8; c++) this.pad[c] = J(t, 16 + 2 * c);
  }
  process(t, n, r = !1) {
    const o = r ? 0 : 2048, { h: i, r: a } = this, f = a[0], l = a[1], s = a[2], c = a[3], h = a[4], u = a[5], d = a[6], p = a[7], g = a[8], b = a[9], $ = J(t, n + 0), C = J(t, n + 2), A = J(t, n + 4), E = J(t, n + 6), v = J(t, n + 8), _ = J(t, n + 10), B = J(t, n + 12), U = J(t, n + 14);
    let S = i[0] + ($ & 8191), R = i[1] + (($ >>> 13 | C << 3) & 8191), k = i[2] + ((C >>> 10 | A << 6) & 8191), x = i[3] + ((A >>> 7 | E << 9) & 8191), y = i[4] + ((E >>> 4 | v << 12) & 8191), w = i[5] + (v >>> 1 & 8191), m = i[6] + ((v >>> 14 | _ << 2) & 8191), I = i[7] + ((_ >>> 11 | B << 5) & 8191), N = i[8] + ((B >>> 8 | U << 8) & 8191), L = i[9] + (U >>> 5 | o), O = 0, j = O + S * f + R * (5 * b) + k * (5 * g) + x * (5 * p) + y * (5 * d);
    O = j >>> 13, j &= 8191, j += w * (5 * u) + m * (5 * h) + I * (5 * c) + N * (5 * s) + L * (5 * l), O += j >>> 13, j &= 8191;
    let D = O + S * l + R * f + k * (5 * b) + x * (5 * g) + y * (5 * p);
    O = D >>> 13, D &= 8191, D += w * (5 * d) + m * (5 * u) + I * (5 * h) + N * (5 * c) + L * (5 * s), O += D >>> 13, D &= 8191;
    let P = O + S * s + R * l + k * f + x * (5 * b) + y * (5 * g);
    O = P >>> 13, P &= 8191, P += w * (5 * p) + m * (5 * d) + I * (5 * u) + N * (5 * h) + L * (5 * c), O += P >>> 13, P &= 8191;
    let H = O + S * c + R * s + k * l + x * f + y * (5 * b);
    O = H >>> 13, H &= 8191, H += w * (5 * g) + m * (5 * p) + I * (5 * d) + N * (5 * u) + L * (5 * h), O += H >>> 13, H &= 8191;
    let F = O + S * h + R * c + k * s + x * l + y * f;
    O = F >>> 13, F &= 8191, F += w * (5 * b) + m * (5 * g) + I * (5 * p) + N * (5 * d) + L * (5 * u), O += F >>> 13, F &= 8191;
    let M = O + S * u + R * h + k * c + x * s + y * l;
    O = M >>> 13, M &= 8191, M += w * f + m * (5 * b) + I * (5 * g) + N * (5 * p) + L * (5 * d), O += M >>> 13, M &= 8191;
    let K = O + S * d + R * u + k * h + x * c + y * s;
    O = K >>> 13, K &= 8191, K += w * l + m * f + I * (5 * b) + N * (5 * g) + L * (5 * p), O += K >>> 13, K &= 8191;
    let V = O + S * p + R * d + k * u + x * h + y * c;
    O = V >>> 13, V &= 8191, V += w * s + m * l + I * f + N * (5 * b) + L * (5 * g), O += V >>> 13, V &= 8191;
    let G = O + S * g + R * p + k * d + x * u + y * h;
    O = G >>> 13, G &= 8191, G += w * c + m * s + I * l + N * f + L * (5 * b), O += G >>> 13, G &= 8191;
    let W = O + S * b + R * g + k * p + x * d + y * u;
    O = W >>> 13, W &= 8191, W += w * h + m * c + I * s + N * l + L * f, O += W >>> 13, W &= 8191, O = (O << 2) + O | 0, O = O + j | 0, j = O & 8191, O = O >>> 13, D += O, i[0] = j, i[1] = D, i[2] = P, i[3] = H, i[4] = F, i[5] = M, i[6] = K, i[7] = V, i[8] = G, i[9] = W;
  }
  finalize() {
    const { h: t, pad: n } = this, r = new Uint16Array(10);
    let o = t[1] >>> 13;
    t[1] &= 8191;
    for (let f = 2; f < 10; f++) t[f] += o, o = t[f] >>> 13, t[f] &= 8191;
    t[0] += o * 5, o = t[0] >>> 13, t[0] &= 8191, t[1] += o, o = t[1] >>> 13, t[1] &= 8191, t[2] += o, r[0] = t[0] + 5, o = r[0] >>> 13, r[0] &= 8191;
    for (let f = 1; f < 10; f++) r[f] = t[f] + o, o = r[f] >>> 13, r[f] &= 8191;
    r[9] -= 8192;
    let i = (o ^ 1) - 1;
    for (let f = 0; f < 10; f++) r[f] &= i;
    i = ~i;
    for (let f = 0; f < 10; f++) t[f] = t[f] & i | r[f];
    t[0] = (t[0] | t[1] << 13) & 65535, t[1] = (t[1] >>> 3 | t[2] << 10) & 65535, t[2] = (t[2] >>> 6 | t[3] << 7) & 65535, t[3] = (t[3] >>> 9 | t[4] << 4) & 65535, t[4] = (t[4] >>> 12 | t[5] << 1 | t[6] << 14) & 65535, t[5] = (t[6] >>> 2 | t[7] << 11) & 65535, t[6] = (t[7] >>> 5 | t[8] << 8) & 65535, t[7] = (t[8] >>> 8 | t[9] << 5) & 65535;
    let a = t[0] + n[0];
    t[0] = a & 65535;
    for (let f = 1; f < 8; f++) a = (t[f] + n[f] | 0) + (a >>> 16) | 0, t[f] = a & 65535;
    wt(r);
  }
  update(t) {
    wo(this), t = Qn(t), ie(t);
    const { buffer: n, blockLen: r } = this, o = t.length;
    for (let i = 0; i < o; ) {
      const a = Math.min(r - this.pos, o - i);
      if (a === r) {
        for (; r <= o - i; i += r) this.process(t, i);
        continue;
      }
      n.set(t.subarray(i, i + a), this.pos), this.pos += a, i += a, this.pos === r && (this.process(n, 0, !1), this.pos = 0);
    }
    return this;
  }
  destroy() {
    wt(this.h, this.r, this.buffer, this.pad);
  }
  digestInto(t) {
    wo(this), vu(t, this), this.finished = !0;
    const { buffer: n, h: r } = this;
    let { pos: o } = this;
    if (o) {
      for (n[o++] = 1; o < 16; o++) n[o] = 0;
      this.process(n, 0, !0);
    }
    this.finalize();
    let i = 0;
    for (let a = 0; a < 8; a++) t[i++] = r[a] >>> 0, t[i++] = r[a] >>> 8;
    return t;
  }
  digest() {
    const { buffer: t, outputLen: n } = this;
    this.digestInto(t);
    const r = t.slice(0, n);
    return this.destroy(), r;
  }
}
function Du(e) {
  const t = (r, o) => e(o).update(Qn(r)).digest(), n = e(new Uint8Array(32));
  return t.outputLen = n.outputLen, t.blockLen = n.blockLen, t.create = (r) => e(r), t;
}
const $u = Du((e) => new Cu(e));
function ku(e, t, n, r, o, i = 20) {
  let a = e[0], f = e[1], l = e[2], s = e[3], c = t[0], h = t[1], u = t[2], d = t[3], p = t[4], g = t[5], b = t[6], $ = t[7], C = o, A = n[0], E = n[1], v = n[2], _ = a, B = f, U = l, S = s, R = c, k = h, x = u, y = d, w = p, m = g, I = b, N = $, L = C, O = A, j = E, D = v;
  for (let H = 0; H < i; H += 2) _ = _ + R | 0, L = z(L ^ _, 16), w = w + L | 0, R = z(R ^ w, 12), _ = _ + R | 0, L = z(L ^ _, 8), w = w + L | 0, R = z(R ^ w, 7), B = B + k | 0, O = z(O ^ B, 16), m = m + O | 0, k = z(k ^ m, 12), B = B + k | 0, O = z(O ^ B, 8), m = m + O | 0, k = z(k ^ m, 7), U = U + x | 0, j = z(j ^ U, 16), I = I + j | 0, x = z(x ^ I, 12), U = U + x | 0, j = z(j ^ U, 8), I = I + j | 0, x = z(x ^ I, 7), S = S + y | 0, D = z(D ^ S, 16), N = N + D | 0, y = z(y ^ N, 12), S = S + y | 0, D = z(D ^ S, 8), N = N + D | 0, y = z(y ^ N, 7), _ = _ + k | 0, D = z(D ^ _, 16), I = I + D | 0, k = z(k ^ I, 12), _ = _ + k | 0, D = z(D ^ _, 8), I = I + D | 0, k = z(k ^ I, 7), B = B + x | 0, L = z(L ^ B, 16), N = N + L | 0, x = z(x ^ N, 12), B = B + x | 0, L = z(L ^ B, 8), N = N + L | 0, x = z(x ^ N, 7), U = U + y | 0, O = z(O ^ U, 16), w = w + O | 0, y = z(y ^ w, 12), U = U + y | 0, O = z(O ^ U, 8), w = w + O | 0, y = z(y ^ w, 7), S = S + R | 0, j = z(j ^ S, 16), m = m + j | 0, R = z(R ^ m, 12), S = S + R | 0, j = z(j ^ S, 8), m = m + j | 0, R = z(R ^ m, 7);
  let P = 0;
  r[P++] = a + _ | 0, r[P++] = f + B | 0, r[P++] = l + U | 0, r[P++] = s + S | 0, r[P++] = c + R | 0, r[P++] = h + k | 0, r[P++] = u + x | 0, r[P++] = d + y | 0, r[P++] = p + w | 0, r[P++] = g + m | 0, r[P++] = b + I | 0, r[P++] = $ + N | 0, r[P++] = C + L | 0, r[P++] = A + O | 0, r[P++] = E + j | 0, r[P++] = v + D | 0;
}
const Mu = Pu(ku, { counterRight: !1, counterLength: 4, allowShortKeys: !1 }), Fu = new Uint8Array(16), Eo = (e, t) => {
  e.update(t);
  const n = t.length % 16;
  n && e.update(Fu.subarray(n));
}, Ku = new Uint8Array(32);
function Oo(e, t, n, r, o) {
  const i = e(t, n, Ku), a = $u.create(i);
  o && Eo(a, o), Eo(a, r);
  const f = Bu(r.length, o ? o.length : 0, !0);
  a.update(f);
  const l = a.digest();
  return wt(i, f), l;
}
const Hu = (e) => (t, n, r) => ({ encrypt(o, i) {
  const a = o.length;
  i = bo(a + 16, i, !1), i.set(o);
  const f = i.subarray(0, -16);
  e(t, n, f, f, 1);
  const l = Oo(e, t, n, f, r);
  return i.set(l, a), wt(l), i;
}, decrypt(o, i) {
  i = bo(o.length - 16, i, !1);
  const a = o.subarray(0, -16), f = o.subarray(-16), l = Oo(e, t, n, a, r);
  if (!Su(f, l)) throw new Error("invalid tag");
  return i.set(o.subarray(0, -16)), e(t, n, i, i, 1), wt(l), i;
} }), Ii = xu({ blockSize: 64, nonceLength: 12, tagLength: 16 }, Hu(Mu));
class Si extends gn {
  constructor(t, n) {
    super(), this.finished = !1, this.destroyed = !1, pn(t);
    const r = ye(n);
    if (this.iHash = t.create(), typeof this.iHash.update != "function") throw new Error("Expected instance of class which extends utils.Hash");
    this.blockLen = this.iHash.blockLen, this.outputLen = this.iHash.outputLen;
    const o = this.blockLen, i = new Uint8Array(o);
    i.set(r.length > o ? t.create().update(r).digest() : r);
    for (let a = 0; a < i.length; a++) i[a] ^= 54;
    this.iHash.update(i), this.oHash = t.create();
    for (let a = 0; a < i.length; a++) i[a] ^= 106;
    this.oHash.update(i), he(i);
  }
  update(t) {
    return We(this), this.iHash.update(t), this;
  }
  digestInto(t) {
    We(this), we(t, this.outputLen), this.finished = !0, this.iHash.digestInto(t), this.oHash.update(t), this.oHash.digestInto(t), this.destroy();
  }
  digest() {
    const t = new Uint8Array(this.oHash.outputLen);
    return this.digestInto(t), t;
  }
  _cloneInto(t) {
    t || (t = Object.create(Object.getPrototypeOf(this), {}));
    const { oHash: n, iHash: r, finished: o, destroyed: i, blockLen: a, outputLen: f } = this;
    return t = t, t.finished = o, t.destroyed = i, t.blockLen = a, t.outputLen = f, t.oHash = n._cloneInto(t.oHash), t.iHash = r._cloneInto(t.iHash), t;
  }
  clone() {
    return this._cloneInto();
  }
  destroy() {
    this.destroyed = !0, this.oHash.destroy(), this.iHash.destroy();
  }
}
const bn = (e, t, n) => new Si(e, t).update(n).digest();
bn.create = (e, t) => new Si(e, t);
function zu(e, t, n) {
  return pn(e), n === void 0 && (n = new Uint8Array(e.outputLen)), bn(e, ye(n), ye(t));
}
const Pn = Uint8Array.from([0]), _o = Uint8Array.of();
function Vu(e, t, n, r = 32) {
  pn(e), Be(r);
  const o = e.outputLen;
  if (r > 255 * o) throw new Error("Length should be <= 255*HashLen");
  const i = Math.ceil(r / o);
  n === void 0 && (n = _o);
  const a = new Uint8Array(i * o), f = bn.create(e, t), l = f._cloneInto(), s = new Uint8Array(f.outputLen);
  for (let c = 0; c < i; c++) Pn[0] = c + 1, l.update(c === 0 ? _o : s).update(n).update(Pn).digestInto(s), a.set(s, o * c), f._cloneInto(l);
  return f.destroy(), l.destroy(), he(s, Pn), a.slice(0, r);
}
const Wu = (e, t, n, r, o) => Vu(e, zu(e, t, n), r, o), mn = yn, mr = BigInt(0), nr = BigInt(1);
function an(e, t = "") {
  if (typeof e != "boolean") {
    const n = t && `"${t}"`;
    throw new Error(n + "expected boolean, got type=" + typeof e);
  }
  return e;
}
function Qe(e, t, n = "") {
  const r = dn(e), o = e?.length, i = t !== void 0;
  if (!r || i && o !== t) {
    const a = n && `"${n}" `, f = i ? ` of length ${t}` : "", l = r ? `length=${o}` : `type=${typeof e}`;
    throw new Error(a + "expected Uint8Array" + f + ", got " + l);
  }
  return e;
}
function en(e) {
  const t = e.toString(16);
  return t.length & 1 ? "0" + t : t;
}
function xi(e) {
  if (typeof e != "string") throw new Error("hex string expected, got " + typeof e);
  return e === "" ? mr : BigInt("0x" + e);
}
function vn(e) {
  return xi(pt(e));
}
function fn(e) {
  return we(e), xi(pt(Uint8Array.from(e).reverse()));
}
function vr(e, t) {
  return sn(e.toString(16).padStart(t * 2, "0"));
}
function Er(e, t) {
  return vr(e, t).reverse();
}
function ne(e, t, n) {
  let r;
  if (typeof t == "string") try {
    r = sn(t);
  } catch (i) {
    throw new Error(e + " must be hex string or Uint8Array, cause: " + i);
  }
  else if (dn(t)) r = Uint8Array.from(t);
  else throw new Error(e + " must be hex string or Uint8Array");
  const o = r.length;
  if (typeof n == "number" && o !== n) throw new Error(e + " of length " + n + " expected, got " + o);
  return r;
}
const Cn = (e) => typeof e == "bigint" && mr <= e;
function qu(e, t, n) {
  return Cn(e) && Cn(t) && Cn(n) && t <= e && e < n;
}
function rr(e, t, n, r) {
  if (!qu(t, n, r)) throw new Error("expected valid " + e + ": " + n + " <= n < " + r + ", got " + t);
}
function Bi(e) {
  let t;
  for (t = 0; e > mr; e >>= nr, t += 1) ;
  return t;
}
const zt = (e) => (nr << BigInt(e)) - nr;
function Gu(e, t, n) {
  if (typeof e != "number" || e < 2) throw new Error("hashLen must be a number");
  if (typeof t != "number" || t < 2) throw new Error("qByteLen must be a number");
  if (typeof n != "function") throw new Error("hmacFn must be a function");
  const r = (u) => new Uint8Array(u), o = (u) => Uint8Array.of(u);
  let i = r(e), a = r(e), f = 0;
  const l = () => {
    i.fill(1), a.fill(0), f = 0;
  }, s = (...u) => n(a, i, ...u), c = (u = r(0)) => {
    a = s(o(0), u), i = s(), u.length !== 0 && (a = s(o(1), u), i = s());
  }, h = () => {
    if (f++ >= 1e3) throw new Error("drbg: tried 1000 values");
    let u = 0;
    const d = [];
    for (; u < t; ) {
      i = s();
      const p = i.slice();
      d.push(p), u += i.length;
    }
    return $e(...d);
  };
  return (u, d) => {
    l(), c(u);
    let p;
    for (; !(p = d(h())); ) c();
    return l(), p;
  };
}
function En(e, t, n = {}) {
  if (!e || typeof e != "object") throw new Error("expected valid options object");
  function r(o, i, a) {
    const f = e[o];
    if (a && f === void 0) return;
    const l = typeof f;
    if (l !== i || f === null) throw new Error(`param "${o}" is invalid: expected ${i}, got ${l}`);
  }
  Object.entries(t).forEach(([o, i]) => r(o, i, !1)), Object.entries(n).forEach(([o, i]) => r(o, i, !0));
}
function Io(e) {
  const t = /* @__PURE__ */ new WeakMap();
  return (n, ...r) => {
    const o = t.get(n);
    if (o !== void 0) return o;
    const i = e(n, ...r);
    return t.set(n, i), i;
  };
}
const se = BigInt(0), re = BigInt(1), et = BigInt(2), Ni = BigInt(3), Ai = BigInt(4), ji = BigInt(5), Yu = BigInt(7), Ui = BigInt(8), Zu = BigInt(9), Li = BigInt(16);
function fe(e, t) {
  const n = e % t;
  return n >= se ? n : t + n;
}
function pe(e, t, n) {
  let r = e;
  for (; t-- > se; ) r *= r, r %= n;
  return r;
}
function So(e, t) {
  if (e === se) throw new Error("invert: expected non-zero number");
  if (t <= se) throw new Error("invert: expected positive modulus, got " + t);
  let n = fe(e, t), r = t, o = se, i = re;
  for (; n !== se; ) {
    const a = r / n, f = r % n, l = o - i * a;
    r = n, n = f, o = i, i = l;
  }
  if (r !== re) throw new Error("invert: does not exist");
  return fe(o, t);
}
function Or(e, t, n) {
  if (!e.eql(e.sqr(t), n)) throw new Error("Cannot find square root");
}
function Ri(e, t) {
  const n = (e.ORDER + re) / Ai, r = e.pow(t, n);
  return Or(e, r, t), r;
}
function Xu(e, t) {
  const n = (e.ORDER - ji) / Ui, r = e.mul(t, et), o = e.pow(r, n), i = e.mul(t, o), a = e.mul(e.mul(i, et), o), f = e.mul(i, e.sub(a, e.ONE));
  return Or(e, f, t), f;
}
function Ju(e) {
  const t = qe(e), n = Ti(e), r = n(t, t.neg(t.ONE)), o = n(t, r), i = n(t, t.neg(r)), a = (e + Yu) / Li;
  return (f, l) => {
    let s = f.pow(l, a), c = f.mul(s, r);
    const h = f.mul(s, o), u = f.mul(s, i), d = f.eql(f.sqr(c), l), p = f.eql(f.sqr(h), l);
    s = f.cmov(s, c, d), c = f.cmov(u, h, p);
    const g = f.eql(f.sqr(c), l), b = f.cmov(s, c, g);
    return Or(f, b, l), b;
  };
}
function Ti(e) {
  if (e < Ni) throw new Error("sqrt is not defined for small field");
  let t = e - re, n = 0;
  for (; t % et === se; ) t /= et, n++;
  let r = et;
  const o = qe(e);
  for (; xo(o, r) === 1; ) if (r++ > 1e3) throw new Error("Cannot find square root: probably non-prime P");
  if (n === 1) return Ri;
  let i = o.pow(r, t);
  const a = (t + re) / et;
  return function(f, l) {
    if (f.is0(l)) return l;
    if (xo(f, l) !== 1) throw new Error("Cannot find square root");
    let s = n, c = f.mul(f.ONE, i), h = f.pow(l, t), u = f.pow(l, a);
    for (; !f.eql(h, f.ONE); ) {
      if (f.is0(h)) return f.ZERO;
      let d = 1, p = f.sqr(h);
      for (; !f.eql(p, f.ONE); ) if (d++, p = f.sqr(p), d === s) throw new Error("Cannot find square root");
      const g = re << BigInt(s - d - 1), b = f.pow(c, g);
      s = d, c = f.sqr(b), h = f.mul(h, c), u = f.mul(u, b);
    }
    return u;
  };
}
function Qu(e) {
  return e % Ai === Ni ? Ri : e % Ui === ji ? Xu : e % Li === Zu ? Ju(e) : Ti(e);
}
const el = ["create", "isValid", "is0", "neg", "inv", "sqrt", "sqr", "eql", "add", "sub", "mul", "pow", "div", "addN", "subN", "mulN", "sqrN"];
function tl(e) {
  const t = { ORDER: "bigint", MASK: "bigint", BYTES: "number", BITS: "number" }, n = el.reduce((r, o) => (r[o] = "function", r), t);
  return En(e, n), e;
}
function nl(e, t, n) {
  if (n < se) throw new Error("invalid exponent, negatives unsupported");
  if (n === se) return e.ONE;
  if (n === re) return t;
  let r = e.ONE, o = t;
  for (; n > se; ) n & re && (r = e.mul(r, o)), o = e.sqr(o), n >>= re;
  return r;
}
function Pi(e, t, n = !1) {
  const r = new Array(t.length).fill(n ? e.ZERO : void 0), o = t.reduce((a, f, l) => e.is0(f) ? a : (r[l] = a, e.mul(a, f)), e.ONE), i = e.inv(o);
  return t.reduceRight((a, f, l) => e.is0(f) ? a : (r[l] = e.mul(a, r[l]), e.mul(a, f)), i), r;
}
function xo(e, t) {
  const n = (e.ORDER - re) / et, r = e.pow(t, n), o = e.eql(r, e.ONE), i = e.eql(r, e.ZERO), a = e.eql(r, e.neg(e.ONE));
  if (!o && !i && !a) throw new Error("invalid Legendre symbol result");
  return o ? 1 : i ? 0 : -1;
}
function Ci(e, t) {
  t !== void 0 && Be(t);
  const n = t !== void 0 ? t : e.toString(2).length, r = Math.ceil(n / 8);
  return { nBitLength: n, nByteLength: r };
}
function qe(e, t, n = !1, r = {}) {
  if (e <= se) throw new Error("invalid field: expected ORDER > 0, got " + e);
  let o, i, a = !1, f;
  if (typeof t == "object" && t != null) {
    if (r.sqrt || n) throw new Error("cannot specify opts in two arguments");
    const u = t;
    u.BITS && (o = u.BITS), u.sqrt && (i = u.sqrt), typeof u.isLE == "boolean" && (n = u.isLE), typeof u.modFromBytes == "boolean" && (a = u.modFromBytes), f = u.allowedLengths;
  } else typeof t == "number" && (o = t), r.sqrt && (i = r.sqrt);
  const { nBitLength: l, nByteLength: s } = Ci(e, o);
  if (s > 2048) throw new Error("invalid field: expected ORDER of <= 2048 bytes");
  let c;
  const h = Object.freeze({ ORDER: e, isLE: n, BITS: l, BYTES: s, MASK: zt(l), ZERO: se, ONE: re, allowedLengths: f, create: (u) => fe(u, e), isValid: (u) => {
    if (typeof u != "bigint") throw new Error("invalid field element: expected bigint, got " + typeof u);
    return se <= u && u < e;
  }, is0: (u) => u === se, isValidNot0: (u) => !h.is0(u) && h.isValid(u), isOdd: (u) => (u & re) === re, neg: (u) => fe(-u, e), eql: (u, d) => u === d, sqr: (u) => fe(u * u, e), add: (u, d) => fe(u + d, e), sub: (u, d) => fe(u - d, e), mul: (u, d) => fe(u * d, e), pow: (u, d) => nl(h, u, d), div: (u, d) => fe(u * So(d, e), e), sqrN: (u) => u * u, addN: (u, d) => u + d, subN: (u, d) => u - d, mulN: (u, d) => u * d, inv: (u) => So(u, e), sqrt: i || ((u) => (c || (c = Qu(e)), c(h, u))), toBytes: (u) => n ? Er(u, s) : vr(u, s), fromBytes: (u, d = !0) => {
    if (f) {
      if (!f.includes(u.length) || u.length > s) throw new Error("Field.fromBytes: expected " + f + " bytes, got " + u.length);
      const g = new Uint8Array(s);
      g.set(u, n ? 0 : g.length - u.length), u = g;
    }
    if (u.length !== s) throw new Error("Field.fromBytes: expected " + s + " bytes, got " + u.length);
    let p = n ? fn(u) : vn(u);
    if (a && (p = fe(p, e)), !d && !h.isValid(p)) throw new Error("invalid field element: outside of range 0..ORDER");
    return p;
  }, invertBatch: (u) => Pi(h, u), cmov: (u, d, p) => p ? d : u });
  return Object.freeze(h);
}
function Di(e) {
  if (typeof e != "bigint") throw new Error("field order must be bigint");
  const t = e.toString(2).length;
  return Math.ceil(t / 8);
}
function $i(e) {
  const t = Di(e);
  return t + Math.ceil(t / 2);
}
function rl(e, t, n = !1) {
  const r = e.length, o = Di(t), i = $i(t);
  if (r < 16 || r < i || r > 1024) throw new Error("expected " + i + "-1024 bytes of input, got " + r);
  const a = n ? fn(e) : vn(e), f = fe(a, t - re) + re;
  return n ? Er(f, o) : vr(f, o);
}
const bt = BigInt(0), tt = BigInt(1);
function cn(e, t) {
  const n = t.negate();
  return e ? n : t;
}
function Dn(e, t) {
  const n = Pi(e.Fp, t.map((r) => r.Z));
  return t.map((r, o) => e.fromAffine(r.toAffine(n[o])));
}
function ki(e, t) {
  if (!Number.isSafeInteger(e) || e <= 0 || e > t) throw new Error("invalid window size, expected [1.." + t + "], got W=" + e);
}
function $n(e, t) {
  ki(e, t);
  const n = Math.ceil(t / e) + 1, r = 2 ** (e - 1), o = 2 ** e, i = zt(e), a = BigInt(e);
  return { windows: n, windowSize: r, mask: i, maxNumber: o, shiftBy: a };
}
function Bo(e, t, n) {
  const { windowSize: r, mask: o, maxNumber: i, shiftBy: a } = n;
  let f = Number(e & o), l = e >> a;
  f > r && (f -= i, l += tt);
  const s = t * r, c = s + Math.abs(f) - 1, h = f === 0, u = f < 0, d = t % 2 !== 0;
  return { nextN: l, offset: c, isZero: h, isNeg: u, isNegF: d, offsetF: s };
}
function ol(e, t) {
  if (!Array.isArray(e)) throw new Error("array expected");
  e.forEach((n, r) => {
    if (!(n instanceof t)) throw new Error("invalid point at index " + r);
  });
}
function il(e, t) {
  if (!Array.isArray(e)) throw new Error("array of scalars expected");
  e.forEach((n, r) => {
    if (!t.isValid(n)) throw new Error("invalid scalar at index " + r);
  });
}
const kn = /* @__PURE__ */ new WeakMap(), Mi = /* @__PURE__ */ new WeakMap();
function Mn(e) {
  return Mi.get(e) || 1;
}
function No(e) {
  if (e !== bt) throw new Error("invalid wNAF");
}
class sl {
  constructor(t, n) {
    this.BASE = t.BASE, this.ZERO = t.ZERO, this.Fn = t.Fn, this.bits = n;
  }
  _unsafeLadder(t, n, r = this.ZERO) {
    let o = t;
    for (; n > bt; ) n & tt && (r = r.add(o)), o = o.double(), n >>= tt;
    return r;
  }
  precomputeWindow(t, n) {
    const { windows: r, windowSize: o } = $n(n, this.bits), i = [];
    let a = t, f = a;
    for (let l = 0; l < r; l++) {
      f = a, i.push(f);
      for (let s = 1; s < o; s++) f = f.add(a), i.push(f);
      a = f.double();
    }
    return i;
  }
  wNAF(t, n, r) {
    if (!this.Fn.isValid(r)) throw new Error("invalid scalar");
    let o = this.ZERO, i = this.BASE;
    const a = $n(t, this.bits);
    for (let f = 0; f < a.windows; f++) {
      const { nextN: l, offset: s, isZero: c, isNeg: h, isNegF: u, offsetF: d } = Bo(r, f, a);
      r = l, c ? i = i.add(cn(u, n[d])) : o = o.add(cn(h, n[s]));
    }
    return No(r), { p: o, f: i };
  }
  wNAFUnsafe(t, n, r, o = this.ZERO) {
    const i = $n(t, this.bits);
    for (let a = 0; a < i.windows && r !== bt; a++) {
      const { nextN: f, offset: l, isZero: s, isNeg: c } = Bo(r, a, i);
      if (r = f, !s) {
        const h = n[l];
        o = o.add(c ? h.negate() : h);
      }
    }
    return No(r), o;
  }
  getPrecomputes(t, n, r) {
    let o = kn.get(n);
    return o || (o = this.precomputeWindow(n, t), t !== 1 && (typeof r == "function" && (o = r(o)), kn.set(n, o))), o;
  }
  cached(t, n, r) {
    const o = Mn(t);
    return this.wNAF(o, this.getPrecomputes(o, t, r), n);
  }
  unsafe(t, n, r, o) {
    const i = Mn(t);
    return i === 1 ? this._unsafeLadder(t, n, o) : this.wNAFUnsafe(i, this.getPrecomputes(i, t, r), n, o);
  }
  createCache(t, n) {
    ki(n, this.bits), Mi.set(t, n), kn.delete(t);
  }
  hasCache(t) {
    return Mn(t) !== 1;
  }
}
function al(e, t, n, r) {
  let o = t, i = e.ZERO, a = e.ZERO;
  for (; n > bt || r > bt; ) n & tt && (i = i.add(o)), r & tt && (a = a.add(o)), o = o.double(), n >>= tt, r >>= tt;
  return { p1: i, p2: a };
}
function fl(e, t, n, r) {
  ol(n, e), il(r, t);
  const o = n.length, i = r.length;
  if (o !== i) throw new Error("arrays of points and scalars must have equal length");
  const a = e.ZERO, f = Bi(BigInt(o));
  let l = 1;
  f > 12 ? l = f - 3 : f > 4 ? l = f - 2 : f > 0 && (l = 2);
  const s = zt(l), c = new Array(Number(s) + 1).fill(a), h = Math.floor((t.BITS - 1) / l) * l;
  let u = a;
  for (let d = h; d >= 0; d -= l) {
    c.fill(a);
    for (let g = 0; g < i; g++) {
      const b = r[g], $ = Number(b >> BigInt(d) & s);
      c[$] = c[$].add(n[g]);
    }
    let p = a;
    for (let g = c.length - 1, b = a; g > 0; g--) b = b.add(c[g]), p = p.add(b);
    if (u = u.add(p), d !== 0) for (let g = 0; g < l; g++) u = u.double();
  }
  return u;
}
function Ao(e, t, n) {
  if (t) {
    if (t.ORDER !== e) throw new Error("Field.ORDER must match order: Fp == p, Fn == n");
    return tl(t), t;
  } else return qe(e, { isLE: n });
}
function cl(e, t, n = {}, r) {
  if (r === void 0 && (r = e === "edwards"), !t || typeof t != "object") throw new Error(`expected valid ${e} CURVE object`);
  for (const f of ["p", "n", "h"]) {
    const l = t[f];
    if (!(typeof l == "bigint" && l > bt)) throw new Error(`CURVE.${f} must be positive bigint`);
  }
  const o = Ao(t.p, n.Fp, r), i = Ao(t.n, n.Fn, r), a = ["Gx", "Gy", "a", "b"];
  for (const f of a) if (!o.isValid(t[f])) throw new Error(`CURVE.${f} must be valid field element of CURVE.Fp`);
  return t = Object.freeze(Object.assign({}, t)), { CURVE: t, Fp: o, Fn: i };
}
BigInt(0), BigInt(1), BigInt(2), BigInt(8), ui("HashToScalar-");
const Nt = BigInt(0), lt = BigInt(1), tn = BigInt(2);
function ul(e) {
  return En(e, { adjustScalarBytes: "function", powPminus2: "function" }), Object.freeze({ ...e });
}
function ll(e) {
  const t = ul(e), { P: n, type: r, adjustScalarBytes: o, powPminus2: i, randomBytes: a } = t, f = r === "x25519";
  if (!f && r !== "x448") throw new Error("invalid type");
  const l = a || at, s = f ? 255 : 448, c = f ? 32 : 56, h = BigInt(f ? 9 : 5), u = BigInt(f ? 121665 : 39081), d = f ? tn ** BigInt(254) : tn ** BigInt(447), p = f ? BigInt(8) * tn ** BigInt(251) - lt : BigInt(4) * tn ** BigInt(445) - lt, g = d + p + lt, b = (x) => fe(x, n), $ = C(h);
  function C(x) {
    return Er(b(x), c);
  }
  function A(x) {
    const y = ne("u coordinate", x, c);
    return f && (y[31] &= 127), b(fn(y));
  }
  function E(x) {
    return fn(o(ne("scalar", x, c)));
  }
  function v(x, y) {
    const w = U(A(y), E(x));
    if (w === Nt) throw new Error("invalid private or public key received");
    return C(w);
  }
  function _(x) {
    return v(x, $);
  }
  function B(x, y, w) {
    const m = b(x * (y - w));
    return y = b(y - m), w = b(w + m), { x_2: y, x_3: w };
  }
  function U(x, y) {
    rr("u", x, Nt, n), rr("scalar", y, d, g);
    const w = y, m = x;
    let I = lt, N = Nt, L = x, O = lt, j = Nt;
    for (let P = BigInt(s - 1); P >= Nt; P--) {
      const H = w >> P & lt;
      j ^= H, { x_2: I, x_3: L } = B(j, I, L), { x_2: N, x_3: O } = B(j, N, O), j = H;
      const F = I + N, M = b(F * F), K = I - N, V = b(K * K), G = M - V, W = L + O, X = L - O, Ge = b(X * F), Ot = b(W * K), _t = Ge + Ot, Nr = Ge - Ot;
      L = b(_t * _t), O = b(m * b(Nr * Nr)), I = b(M * V), N = b(G * (M + b(u * G)));
    }
    ({ x_2: I, x_3: L } = B(j, I, L)), { x_2: N, x_3: O } = B(j, N, O);
    const D = i(N);
    return b(I * D);
  }
  const S = { secretKey: c, publicKey: c, seed: c }, R = (x = l(c)) => (we(x, S.seed), x);
  function k(x) {
    const y = R(x);
    return { secretKey: y, publicKey: _(y) };
  }
  return { keygen: k, getSharedSecret: (x, y) => v(x, y), getPublicKey: (x) => _(x), scalarMult: v, scalarMultBase: _, utils: { randomSecretKey: R, randomPrivateKey: R }, GuBytes: $.slice(), lengths: S };
}
const hl = BigInt(1), jo = BigInt(2), dl = BigInt(3), pl = BigInt(5);
BigInt(8);
const Fi = BigInt("0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffed"), gl = { p: Fi, n: BigInt("0x1000000000000000000000000000000014def9dea2f79cd65812631a5cf5d3ed"), a: BigInt("0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffec"), d: BigInt("0x52036cee2b6ffe738cc740797779e89800700a4d4141d8ab75eb4dca135978a3"), Gx: BigInt("0x216936d3cd6e53fec0a4e231fdd6dc5c692cc7609525a7b2c9562d608f25d51a"), Gy: BigInt("0x6666666666666666666666666666666666666666666666666666666666666658") };
function yl(e) {
  const t = BigInt(10), n = BigInt(20), r = BigInt(40), o = BigInt(80), i = Fi, a = e * e % i * e % i, f = pe(a, jo, i) * a % i, l = pe(f, hl, i) * e % i, s = pe(l, pl, i) * l % i, c = pe(s, t, i) * s % i, h = pe(c, n, i) * c % i, u = pe(h, r, i) * h % i, d = pe(u, o, i) * u % i, p = pe(d, o, i) * u % i, g = pe(p, t, i) * s % i;
  return { pow_p_5_8: pe(g, jo, i) * e % i, b2: a };
}
function wl(e) {
  return e[0] &= 248, e[31] &= 127, e[31] |= 64, e;
}
const bl = qe(gl.p, { isLE: !0 }), or = (() => {
  const e = bl.ORDER;
  return ll({ P: e, type: "x25519", powPminus2: (t) => {
    const { pow_p_5_8: n, b2: r } = yl(t);
    return fe(pe(n, dl, e) * r, e);
  }, adjustScalarBytes: wl });
})(), Uo = (e, t) => (e + (e >= 0 ? t : -t) / Ki) / t;
function ml(e, t, n) {
  const [[r, o], [i, a]] = t, f = Uo(a * e, n), l = Uo(-o * e, n);
  let s = e - f * r - l * i, c = -f * o - l * a;
  const h = s < Se, u = c < Se;
  h && (s = -s), u && (c = -c);
  const d = zt(Math.ceil(Bi(n) / 2)) + gt;
  if (s < Se || s >= d || c < Se || c >= d) throw new Error("splitScalar (endomorphism): failed, k=" + e);
  return { k1neg: h, k1: s, k2neg: u, k2: c };
}
function ir(e) {
  if (!["compact", "recovered", "der"].includes(e)) throw new Error('Signature format must be "compact", "recovered", or "der"');
  return e;
}
function Fn(e, t) {
  const n = {};
  for (let r of Object.keys(t)) n[r] = e[r] === void 0 ? t[r] : e[r];
  return an(n.lowS, "lowS"), an(n.prehash, "prehash"), n.format !== void 0 && ir(n.format), n;
}
class vl extends Error {
  constructor(t = "") {
    super(t);
  }
}
const Ie = { Err: vl, _tlv: { encode: (e, t) => {
  const { Err: n } = Ie;
  if (e < 0 || e > 256) throw new n("tlv.encode: wrong tag");
  if (t.length & 1) throw new n("tlv.encode: unpadded data");
  const r = t.length / 2, o = en(r);
  if (o.length / 2 & 128) throw new n("tlv.encode: long form length too big");
  const i = r > 127 ? en(o.length / 2 | 128) : "";
  return en(e) + i + o + t;
}, decode(e, t) {
  const { Err: n } = Ie;
  let r = 0;
  if (e < 0 || e > 256) throw new n("tlv.encode: wrong tag");
  if (t.length < 2 || t[r++] !== e) throw new n("tlv.decode: wrong tlv");
  const o = t[r++], i = !!(o & 128);
  let a = 0;
  if (!i) a = o;
  else {
    const l = o & 127;
    if (!l) throw new n("tlv.decode(long): indefinite length not supported");
    if (l > 4) throw new n("tlv.decode(long): byte length is too big");
    const s = t.subarray(r, r + l);
    if (s.length !== l) throw new n("tlv.decode: length bytes not complete");
    if (s[0] === 0) throw new n("tlv.decode(long): zero leftmost byte");
    for (const c of s) a = a << 8 | c;
    if (r += l, a < 128) throw new n("tlv.decode(long): not minimal encoding");
  }
  const f = t.subarray(r, r + a);
  if (f.length !== a) throw new n("tlv.decode: wrong value length");
  return { v: f, l: t.subarray(r + a) };
} }, _int: { encode(e) {
  const { Err: t } = Ie;
  if (e < Se) throw new t("integer: negative integers are not allowed");
  let n = en(e);
  if (Number.parseInt(n[0], 16) & 8 && (n = "00" + n), n.length & 1) throw new t("unexpected DER parsing assertion: unpadded hex");
  return n;
}, decode(e) {
  const { Err: t } = Ie;
  if (e[0] & 128) throw new t("invalid signature integer: negative");
  if (e[0] === 0 && !(e[1] & 128)) throw new t("invalid signature integer: unnecessary leading zero");
  return vn(e);
} }, toSig(e) {
  const { Err: t, _int: n, _tlv: r } = Ie, o = ne("signature", e), { v: i, l: a } = r.decode(48, o);
  if (a.length) throw new t("invalid signature: left bytes after parsing");
  const { v: f, l } = r.decode(2, i), { v: s, l: c } = r.decode(2, l);
  if (c.length) throw new t("invalid signature: left bytes after parsing");
  return { r: n.decode(f), s: n.decode(s) };
}, hexFromSig(e) {
  const { _tlv: t, _int: n } = Ie, r = t.encode(2, n.encode(e.r)), o = t.encode(2, n.encode(e.s)), i = r + o;
  return t.encode(48, i);
} }, Se = BigInt(0), gt = BigInt(1), Ki = BigInt(2), nn = BigInt(3), El = BigInt(4);
function ht(e, t) {
  const { BYTES: n } = e;
  let r;
  if (typeof t == "bigint") r = t;
  else {
    let o = ne("private key", t);
    try {
      r = e.fromBytes(o);
    } catch {
      throw new Error(`invalid private key: expected ui8a of size ${n}, got ${typeof t}`);
    }
  }
  if (!e.isValidNot0(r)) throw new Error("invalid private key: out of range [1..N-1]");
  return r;
}
function Ol(e, t = {}) {
  const n = cl("weierstrass", e, t), { Fp: r, Fn: o } = n;
  let i = n.CURVE;
  const { h: a, n: f } = i;
  En(t, {}, { allowInfinityPoint: "boolean", clearCofactor: "function", isTorsionFree: "function", fromBytes: "function", toBytes: "function", endo: "object", wrapPrivateKey: "boolean" });
  const { endo: l } = t;
  if (l && (!r.is0(i.a) || typeof l.beta != "bigint" || !Array.isArray(l.basises))) throw new Error('invalid endo: expected "beta": bigint and "basises": array');
  const s = zi(r, o);
  function c() {
    if (!r.isOdd) throw new Error("compression is not supported: Field does not have .isOdd()");
  }
  function h(x, y, w) {
    const { x: m, y: I } = y.toAffine(), N = r.toBytes(m);
    if (an(w, "isCompressed"), w) {
      c();
      const L = !r.isOdd(I);
      return $e(Hi(L), N);
    } else return $e(Uint8Array.of(4), N, r.toBytes(I));
  }
  function u(x) {
    Qe(x, void 0, "Point");
    const { publicKey: y, publicKeyUncompressed: w } = s, m = x.length, I = x[0], N = x.subarray(1);
    if (m === y && (I === 2 || I === 3)) {
      const L = r.fromBytes(N);
      if (!r.isValid(L)) throw new Error("bad point: is not on curve, wrong x");
      const O = g(L);
      let j;
      try {
        j = r.sqrt(O);
      } catch (P) {
        const H = P instanceof Error ? ": " + P.message : "";
        throw new Error("bad point: is not on curve, sqrt error" + H);
      }
      c();
      const D = r.isOdd(j);
      return (I & 1) === 1 !== D && (j = r.neg(j)), { x: L, y: j };
    } else if (m === w && I === 4) {
      const L = r.BYTES, O = r.fromBytes(N.subarray(0, L)), j = r.fromBytes(N.subarray(L, L * 2));
      if (!b(O, j)) throw new Error("bad point: is not on curve");
      return { x: O, y: j };
    } else throw new Error(`bad point: got length ${m}, expected compressed=${y} or uncompressed=${w}`);
  }
  const d = t.toBytes || h, p = t.fromBytes || u;
  function g(x) {
    const y = r.sqr(x), w = r.mul(y, x);
    return r.add(r.add(w, r.mul(x, i.a)), i.b);
  }
  function b(x, y) {
    const w = r.sqr(y), m = g(x);
    return r.eql(w, m);
  }
  if (!b(i.Gx, i.Gy)) throw new Error("bad curve params: generator point");
  const $ = r.mul(r.pow(i.a, nn), El), C = r.mul(r.sqr(i.b), BigInt(27));
  if (r.is0(r.add($, C))) throw new Error("bad curve params: a or b");
  function A(x, y, w = !1) {
    if (!r.isValid(y) || w && r.is0(y)) throw new Error(`bad point coordinate ${x}`);
    return y;
  }
  function E(x) {
    if (!(x instanceof S)) throw new Error("ProjectivePoint expected");
  }
  function v(x) {
    if (!l || !l.basises) throw new Error("no endo");
    return ml(x, l.basises, o.ORDER);
  }
  const _ = Io((x, y) => {
    const { X: w, Y: m, Z: I } = x;
    if (r.eql(I, r.ONE)) return { x: w, y: m };
    const N = x.is0();
    y == null && (y = N ? r.ONE : r.inv(I));
    const L = r.mul(w, y), O = r.mul(m, y), j = r.mul(I, y);
    if (N) return { x: r.ZERO, y: r.ZERO };
    if (!r.eql(j, r.ONE)) throw new Error("invZ was invalid");
    return { x: L, y: O };
  }), B = Io((x) => {
    if (x.is0()) {
      if (t.allowInfinityPoint && !r.is0(x.Y)) return;
      throw new Error("bad point: ZERO");
    }
    const { x: y, y: w } = x.toAffine();
    if (!r.isValid(y) || !r.isValid(w)) throw new Error("bad point: x or y not field elements");
    if (!b(y, w)) throw new Error("bad point: equation left != right");
    if (!x.isTorsionFree()) throw new Error("bad point: not in prime-order subgroup");
    return !0;
  });
  function U(x, y, w, m, I) {
    return w = new S(r.mul(w.X, x), w.Y, w.Z), y = cn(m, y), w = cn(I, w), y.add(w);
  }
  class S {
    constructor(y, w, m) {
      this.X = A("x", y), this.Y = A("y", w, !0), this.Z = A("z", m), Object.freeze(this);
    }
    static CURVE() {
      return i;
    }
    static fromAffine(y) {
      const { x: w, y: m } = y || {};
      if (!y || !r.isValid(w) || !r.isValid(m)) throw new Error("invalid affine point");
      if (y instanceof S) throw new Error("projective point not allowed");
      return r.is0(w) && r.is0(m) ? S.ZERO : new S(w, m, r.ONE);
    }
    static fromBytes(y) {
      const w = S.fromAffine(p(Qe(y, void 0, "point")));
      return w.assertValidity(), w;
    }
    static fromHex(y) {
      return S.fromBytes(ne("pointHex", y));
    }
    get x() {
      return this.toAffine().x;
    }
    get y() {
      return this.toAffine().y;
    }
    precompute(y = 8, w = !0) {
      return k.createCache(this, y), w || this.multiply(nn), this;
    }
    assertValidity() {
      B(this);
    }
    hasEvenY() {
      const { y } = this.toAffine();
      if (!r.isOdd) throw new Error("Field doesn't support isOdd");
      return !r.isOdd(y);
    }
    equals(y) {
      E(y);
      const { X: w, Y: m, Z: I } = this, { X: N, Y: L, Z: O } = y, j = r.eql(r.mul(w, O), r.mul(N, I)), D = r.eql(r.mul(m, O), r.mul(L, I));
      return j && D;
    }
    negate() {
      return new S(this.X, r.neg(this.Y), this.Z);
    }
    double() {
      const { a: y, b: w } = i, m = r.mul(w, nn), { X: I, Y: N, Z: L } = this;
      let O = r.ZERO, j = r.ZERO, D = r.ZERO, P = r.mul(I, I), H = r.mul(N, N), F = r.mul(L, L), M = r.mul(I, N);
      return M = r.add(M, M), D = r.mul(I, L), D = r.add(D, D), O = r.mul(y, D), j = r.mul(m, F), j = r.add(O, j), O = r.sub(H, j), j = r.add(H, j), j = r.mul(O, j), O = r.mul(M, O), D = r.mul(m, D), F = r.mul(y, F), M = r.sub(P, F), M = r.mul(y, M), M = r.add(M, D), D = r.add(P, P), P = r.add(D, P), P = r.add(P, F), P = r.mul(P, M), j = r.add(j, P), F = r.mul(N, L), F = r.add(F, F), P = r.mul(F, M), O = r.sub(O, P), D = r.mul(F, H), D = r.add(D, D), D = r.add(D, D), new S(O, j, D);
    }
    add(y) {
      E(y);
      const { X: w, Y: m, Z: I } = this, { X: N, Y: L, Z: O } = y;
      let j = r.ZERO, D = r.ZERO, P = r.ZERO;
      const H = i.a, F = r.mul(i.b, nn);
      let M = r.mul(w, N), K = r.mul(m, L), V = r.mul(I, O), G = r.add(w, m), W = r.add(N, L);
      G = r.mul(G, W), W = r.add(M, K), G = r.sub(G, W), W = r.add(w, I);
      let X = r.add(N, O);
      return W = r.mul(W, X), X = r.add(M, V), W = r.sub(W, X), X = r.add(m, I), j = r.add(L, O), X = r.mul(X, j), j = r.add(K, V), X = r.sub(X, j), P = r.mul(H, W), j = r.mul(F, V), P = r.add(j, P), j = r.sub(K, P), P = r.add(K, P), D = r.mul(j, P), K = r.add(M, M), K = r.add(K, M), V = r.mul(H, V), W = r.mul(F, W), K = r.add(K, V), V = r.sub(M, V), V = r.mul(H, V), W = r.add(W, V), M = r.mul(K, W), D = r.add(D, M), M = r.mul(X, W), j = r.mul(G, j), j = r.sub(j, M), M = r.mul(G, K), P = r.mul(X, P), P = r.add(P, M), new S(j, D, P);
    }
    subtract(y) {
      return this.add(y.negate());
    }
    is0() {
      return this.equals(S.ZERO);
    }
    multiply(y) {
      const { endo: w } = t;
      if (!o.isValidNot0(y)) throw new Error("invalid scalar: out of range");
      let m, I;
      const N = (L) => k.cached(this, L, (O) => Dn(S, O));
      if (w) {
        const { k1neg: L, k1: O, k2neg: j, k2: D } = v(y), { p: P, f: H } = N(O), { p: F, f: M } = N(D);
        I = H.add(M), m = U(w.beta, P, F, L, j);
      } else {
        const { p: L, f: O } = N(y);
        m = L, I = O;
      }
      return Dn(S, [m, I])[0];
    }
    multiplyUnsafe(y) {
      const { endo: w } = t, m = this;
      if (!o.isValid(y)) throw new Error("invalid scalar: out of range");
      if (y === Se || m.is0()) return S.ZERO;
      if (y === gt) return m;
      if (k.hasCache(this)) return this.multiply(y);
      if (w) {
        const { k1neg: I, k1: N, k2neg: L, k2: O } = v(y), { p1: j, p2: D } = al(S, m, N, O);
        return U(w.beta, j, D, I, L);
      } else return k.unsafe(m, y);
    }
    multiplyAndAddUnsafe(y, w, m) {
      const I = this.multiplyUnsafe(w).add(y.multiplyUnsafe(m));
      return I.is0() ? void 0 : I;
    }
    toAffine(y) {
      return _(this, y);
    }
    isTorsionFree() {
      const { isTorsionFree: y } = t;
      return a === gt ? !0 : y ? y(S, this) : k.unsafe(this, f).is0();
    }
    clearCofactor() {
      const { clearCofactor: y } = t;
      return a === gt ? this : y ? y(S, this) : this.multiplyUnsafe(a);
    }
    isSmallOrder() {
      return this.multiplyUnsafe(a).is0();
    }
    toBytes(y = !0) {
      return an(y, "isCompressed"), this.assertValidity(), d(S, this, y);
    }
    toHex(y = !0) {
      return pt(this.toBytes(y));
    }
    toString() {
      return `<Point ${this.is0() ? "ZERO" : this.toHex()}>`;
    }
    get px() {
      return this.X;
    }
    get py() {
      return this.X;
    }
    get pz() {
      return this.Z;
    }
    toRawBytes(y = !0) {
      return this.toBytes(y);
    }
    _setWindowSize(y) {
      this.precompute(y);
    }
    static normalizeZ(y) {
      return Dn(S, y);
    }
    static msm(y, w) {
      return fl(S, o, y, w);
    }
    static fromPrivateKey(y) {
      return S.BASE.multiply(ht(o, y));
    }
  }
  S.BASE = new S(i.Gx, i.Gy, r.ONE), S.ZERO = new S(r.ZERO, r.ONE, r.ZERO), S.Fp = r, S.Fn = o;
  const R = o.BITS, k = new sl(S, t.endo ? Math.ceil(R / 2) : R);
  return S.BASE.precompute(8), S;
}
function Hi(e) {
  return Uint8Array.of(e ? 2 : 3);
}
function zi(e, t) {
  return { secretKey: t.BYTES, publicKey: 1 + e.BYTES, publicKeyUncompressed: 1 + 2 * e.BYTES, publicKeyHasPrefix: !0, signature: 2 * t.BYTES };
}
function _l(e, t = {}) {
  const { Fn: n } = e, r = t.randomBytes || at, o = Object.assign(zi(e.Fp, n), { seed: $i(n.ORDER) });
  function i(u) {
    try {
      return !!ht(n, u);
    } catch {
      return !1;
    }
  }
  function a(u, d) {
    const { publicKey: p, publicKeyUncompressed: g } = o;
    try {
      const b = u.length;
      return d === !0 && b !== p || d === !1 && b !== g ? !1 : !!e.fromBytes(u);
    } catch {
      return !1;
    }
  }
  function f(u = r(o.seed)) {
    return rl(Qe(u, o.seed, "seed"), n.ORDER);
  }
  function l(u, d = !0) {
    return e.BASE.multiply(ht(n, u)).toBytes(d);
  }
  function s(u) {
    const d = f(u);
    return { secretKey: d, publicKey: l(d) };
  }
  function c(u) {
    if (typeof u == "bigint") return !1;
    if (u instanceof e) return !0;
    const { secretKey: d, publicKey: p, publicKeyUncompressed: g } = o;
    if (n.allowedLengths || d === p) return;
    const b = ne("key", u).length;
    return b === p || b === g;
  }
  function h(u, d, p = !0) {
    if (c(u) === !0) throw new Error("first arg must be private key");
    if (c(d) === !1) throw new Error("second arg must be public key");
    const g = ht(n, u);
    return e.fromHex(d).multiply(g).toBytes(p);
  }
  return Object.freeze({ getPublicKey: l, getSharedSecret: h, keygen: s, Point: e, utils: { isValidSecretKey: i, isValidPublicKey: a, randomSecretKey: f, isValidPrivateKey: i, randomPrivateKey: f, normPrivateKeyToScalar: (u) => ht(n, u), precompute(u = 8, d = e.BASE) {
    return d.precompute(u, !1);
  } }, lengths: o });
}
function Il(e, t, n = {}) {
  pn(t), En(n, {}, { hmac: "function", lowS: "boolean", randomBytes: "function", bits2int: "function", bits2int_modN: "function" });
  const r = n.randomBytes || at, o = n.hmac || ((w, ...m) => bn(t, w, $e(...m))), { Fp: i, Fn: a } = e, { ORDER: f, BITS: l } = a, { keygen: s, getPublicKey: c, getSharedSecret: h, utils: u, lengths: d } = _l(e, n), p = { prehash: !1, lowS: typeof n.lowS == "boolean" ? n.lowS : !1, format: void 0, extraEntropy: !1 }, g = "compact";
  function b(w) {
    const m = f >> gt;
    return w > m;
  }
  function $(w, m) {
    if (!a.isValidNot0(m)) throw new Error(`invalid signature ${w}: out of range 1..Point.Fn.ORDER`);
    return m;
  }
  function C(w, m) {
    ir(m);
    const I = d.signature, N = m === "compact" ? I : m === "recovered" ? I + 1 : void 0;
    return Qe(w, N, `${m} signature`);
  }
  class A {
    constructor(m, I, N) {
      this.r = $("r", m), this.s = $("s", I), N != null && (this.recovery = N), Object.freeze(this);
    }
    static fromBytes(m, I = g) {
      C(m, I);
      let N;
      if (I === "der") {
        const { r: D, s: P } = Ie.toSig(Qe(m));
        return new A(D, P);
      }
      I === "recovered" && (N = m[0], I = "compact", m = m.subarray(1));
      const L = a.BYTES, O = m.subarray(0, L), j = m.subarray(L, L * 2);
      return new A(a.fromBytes(O), a.fromBytes(j), N);
    }
    static fromHex(m, I) {
      return this.fromBytes(sn(m), I);
    }
    addRecoveryBit(m) {
      return new A(this.r, this.s, m);
    }
    recoverPublicKey(m) {
      const I = i.ORDER, { r: N, s: L, recovery: O } = this;
      if (O == null || ![0, 1, 2, 3].includes(O)) throw new Error("recovery id invalid");
      if (f * Ki < I && O > 1) throw new Error("recovery id is ambiguous for h>1 curve");
      const j = O === 2 || O === 3 ? N + f : N;
      if (!i.isValid(j)) throw new Error("recovery id 2 or 3 invalid");
      const D = i.toBytes(j), P = e.fromBytes($e(Hi((O & 1) === 0), D)), H = a.inv(j), F = v(ne("msgHash", m)), M = a.create(-F * H), K = a.create(L * H), V = e.BASE.multiplyUnsafe(M).add(P.multiplyUnsafe(K));
      if (V.is0()) throw new Error("point at infinify");
      return V.assertValidity(), V;
    }
    hasHighS() {
      return b(this.s);
    }
    toBytes(m = g) {
      if (ir(m), m === "der") return sn(Ie.hexFromSig(this));
      const I = a.toBytes(this.r), N = a.toBytes(this.s);
      if (m === "recovered") {
        if (this.recovery == null) throw new Error("recovery bit must be present");
        return $e(Uint8Array.of(this.recovery), I, N);
      }
      return $e(I, N);
    }
    toHex(m) {
      return pt(this.toBytes(m));
    }
    assertValidity() {
    }
    static fromCompact(m) {
      return A.fromBytes(ne("sig", m), "compact");
    }
    static fromDER(m) {
      return A.fromBytes(ne("sig", m), "der");
    }
    normalizeS() {
      return this.hasHighS() ? new A(this.r, a.neg(this.s), this.recovery) : this;
    }
    toDERRawBytes() {
      return this.toBytes("der");
    }
    toDERHex() {
      return pt(this.toBytes("der"));
    }
    toCompactRawBytes() {
      return this.toBytes("compact");
    }
    toCompactHex() {
      return pt(this.toBytes("compact"));
    }
  }
  const E = n.bits2int || function(w) {
    if (w.length > 8192) throw new Error("input is too large");
    const m = vn(w), I = w.length * 8 - l;
    return I > 0 ? m >> BigInt(I) : m;
  }, v = n.bits2int_modN || function(w) {
    return a.create(E(w));
  }, _ = zt(l);
  function B(w) {
    return rr("num < 2^" + l, w, Se, _), a.toBytes(w);
  }
  function U(w, m) {
    return Qe(w, void 0, "message"), m ? Qe(t(w), void 0, "prehashed message") : w;
  }
  function S(w, m, I) {
    if (["recovered", "canonical"].some((K) => K in I)) throw new Error("sign() legacy options not supported");
    const { lowS: N, prehash: L, extraEntropy: O } = Fn(I, p);
    w = U(w, L);
    const j = v(w), D = ht(a, m), P = [B(D), B(j)];
    if (O != null && O !== !1) {
      const K = O === !0 ? r(d.secretKey) : O;
      P.push(ne("extraEntropy", K));
    }
    const H = $e(...P), F = j;
    function M(K) {
      const V = E(K);
      if (!a.isValidNot0(V)) return;
      const G = a.inv(V), W = e.BASE.multiply(V).toAffine(), X = a.create(W.x);
      if (X === Se) return;
      const Ge = a.create(G * a.create(F + X * D));
      if (Ge === Se) return;
      let Ot = (W.x === X ? 0 : 2) | Number(W.y & gt), _t = Ge;
      return N && b(Ge) && (_t = a.neg(Ge), Ot ^= 1), new A(X, _t, Ot);
    }
    return { seed: H, k2sig: M };
  }
  function R(w, m, I = {}) {
    w = ne("message", w);
    const { seed: N, k2sig: L } = S(w, m, I);
    return Gu(t.outputLen, a.BYTES, o)(N, L);
  }
  function k(w) {
    let m;
    const I = typeof w == "string" || dn(w), N = !I && w !== null && typeof w == "object" && typeof w.r == "bigint" && typeof w.s == "bigint";
    if (!I && !N) throw new Error("invalid signature, expected Uint8Array, hex string or Signature instance");
    if (N) m = new A(w.r, w.s);
    else if (I) {
      try {
        m = A.fromBytes(ne("sig", w), "der");
      } catch (L) {
        if (!(L instanceof Ie.Err)) throw L;
      }
      if (!m) try {
        m = A.fromBytes(ne("sig", w), "compact");
      } catch {
        return !1;
      }
    }
    return m || !1;
  }
  function x(w, m, I, N = {}) {
    const { lowS: L, prehash: O, format: j } = Fn(N, p);
    if (I = ne("publicKey", I), m = U(ne("message", m), O), "strict" in N) throw new Error("options.strict was renamed to lowS");
    const D = j === void 0 ? k(w) : A.fromBytes(ne("sig", w), j);
    if (D === !1) return !1;
    try {
      const P = e.fromBytes(I);
      if (L && D.hasHighS()) return !1;
      const { r: H, s: F } = D, M = v(m), K = a.inv(F), V = a.create(M * K), G = a.create(H * K), W = e.BASE.multiplyUnsafe(V).add(P.multiplyUnsafe(G));
      return W.is0() ? !1 : a.create(W.x) === H;
    } catch {
      return !1;
    }
  }
  function y(w, m, I = {}) {
    const { prehash: N } = Fn(I, p);
    return m = U(m, N), A.fromBytes(w, "recovered").recoverPublicKey(m).toBytes();
  }
  return Object.freeze({ keygen: s, getPublicKey: c, getSharedSecret: h, utils: u, lengths: d, Point: e, sign: R, verify: x, recoverPublicKey: y, Signature: A, hash: t });
}
function Sl(e) {
  const t = { a: e.a, b: e.b, p: e.Fp.ORDER, n: e.n, h: e.h, Gx: e.Gx, Gy: e.Gy }, n = e.Fp;
  let r = e.allowedPrivateKeyLengths ? Array.from(new Set(e.allowedPrivateKeyLengths.map((a) => Math.ceil(a / 2)))) : void 0;
  const o = qe(t.n, { BITS: e.nBitLength, allowedLengths: r, modFromBytes: e.wrapPrivateKey }), i = { Fp: n, Fn: o, allowInfinityPoint: e.allowInfinityPoint, endo: e.endo, isTorsionFree: e.isTorsionFree, clearCofactor: e.clearCofactor, fromBytes: e.fromBytes, toBytes: e.toBytes };
  return { CURVE: t, curveOpts: i };
}
function xl(e) {
  const { CURVE: t, curveOpts: n } = Sl(e), r = { hmac: e.hmac, randomBytes: e.randomBytes, lowS: e.lowS, bits2int: e.bits2int, bits2int_modN: e.bits2int_modN };
  return { CURVE: t, curveOpts: n, hash: e.hash, ecdsaOpts: r };
}
function Bl(e, t) {
  const n = t.Point;
  return Object.assign({}, t, { ProjectivePoint: n, CURVE: Object.assign({}, e, Ci(n.Fn.ORDER, n.Fn.BITS)) });
}
function Nl(e) {
  const { CURVE: t, curveOpts: n, hash: r, ecdsaOpts: o } = xl(e), i = Ol(t, n), a = Il(i, r, o);
  return Bl(e, a);
}
function sr(e, t) {
  const n = (r) => Nl({ ...e, hash: r });
  return { ...n(t), create: n };
}
const Vi = { p: BigInt("0xffffffff00000001000000000000000000000000ffffffffffffffffffffffff"), n: BigInt("0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551"), h: BigInt(1), a: BigInt("0xffffffff00000001000000000000000000000000fffffffffffffffffffffffc"), b: BigInt("0x5ac635d8aa3a93e7b3ebbd55769886bc651d06b0cc53b0f63bce3c3e27d2604b"), Gx: BigInt("0x6b17d1f2e12c4247f8bce6e563a440f277037d812deb33a0f4a13945d898c296"), Gy: BigInt("0x4fe342e2fe1a7f9b8ee7eb4a7c0f9e162bce33576b315ececbb6406837bf51f5") }, Wi = { p: BigInt("0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffeffffffff0000000000000000ffffffff"), n: BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffc7634d81f4372ddf581a0db248b0a77aecec196accc52973"), h: BigInt(1), a: BigInt("0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffeffffffff0000000000000000fffffffc"), b: BigInt("0xb3312fa7e23ee7e4988e056be3f82d19181d9c6efe8141120314088f5013875ac656398d8a2ed19d2a85c8edd3ec2aef"), Gx: BigInt("0xaa87ca22be8b05378eb1c71ef320ad746e1d3b628ba79b9859f741e082542a385502f25dbf55296c3a545e3872760ab7"), Gy: BigInt("0x3617de4a96262c6f5d9e98bf9292dc29f8f41dbd289a147ce9da3113b5f0b8c00a60b1ce1d7e819d7a431d7c90ea0e5f") }, qi = { p: BigInt("0x1ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"), n: BigInt("0x01fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffa51868783bf2f966b7fcc0148f709a5d03bb5c9b8899c47aebb6fb71e91386409"), h: BigInt(1), a: BigInt("0x1fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc"), b: BigInt("0x0051953eb9618e1c9a1f929a21a0b68540eea2da725b99b315f3b8b489918ef109e156193951ec7e937b1652c0bd3bb1bf073573df883d2c34f1ef451fd46b503f00"), Gx: BigInt("0x00c6858e06b70404e9cd9e3ecb662395b4429c648139053fb521f828af606b4d3dbaa14b5e77efe75928fe1dc127a2ffa8de3348b3c1856a429bf97e7e31c2e5bd66"), Gy: BigInt("0x011839296a789a3bc0045c8a5fb42c7d1bd998f54449579b446817afbd17273e662c97ee72995ef42640c550b9013fad0761353c7086a272c24088be94769fd16650") }, Al = qe(Vi.p), jl = qe(Wi.p), Ul = qe(qi.p), Ll = sr({ ...Vi, Fp: Al, lowS: !1 }, yn);
sr({ ...Wi, Fp: jl, lowS: !1 }, Mc), sr({ ...qi, Fp: Ul, lowS: !1, allowedPrivateKeyLengths: [130, 131, 132] }, kc);
const Rl = Ll, Gi = "base10", ae = "base16", Lt = "base64pad", _r = "base64url", Vt = "utf8", Yi = 0, Wt = 1, On = 2, Tl = 0, Lo = 1, Rt = 12, Ir = 32;
function s0() {
  const e = or.utils.randomPrivateKey(), t = or.getPublicKey(e);
  return { privateKey: ue(e, ae), publicKey: ue(t, ae) };
}
function a0() {
  const e = at(Ir);
  return ue(e, ae);
}
function f0(e, t) {
  const n = or.getSharedSecret(le(e, ae), le(t, ae)), r = Wu(mn, n, void 0, void 0, Ir);
  return ue(r, ae);
}
function c0(e) {
  const t = mn(le(e, ae));
  return ue(t, ae);
}
function u0(e) {
  const t = mn(le(e, Vt));
  return ue(t, ae);
}
function Zi(e) {
  return le(`${e}`, Gi);
}
function mt(e) {
  return Number(ue(e, Gi));
}
function Xi(e) {
  return e.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}
function Ji(e) {
  const t = e.replace(/-/g, "+").replace(/_/g, "/"), n = (4 - t.length % 4) % 4;
  return t + "=".repeat(n);
}
function l0(e) {
  const t = Zi(typeof e.type < "u" ? e.type : Yi);
  if (mt(t) === Wt && typeof e.senderPublicKey > "u") throw new Error("Missing sender public key for type 1 envelope");
  const n = typeof e.senderPublicKey < "u" ? le(e.senderPublicKey, ae) : void 0, r = typeof e.iv < "u" ? le(e.iv, ae) : at(Rt), o = le(e.symKey, ae), i = Ii(o, r).encrypt(le(e.message, Vt)), a = Qi({ type: t, sealed: i, iv: r, senderPublicKey: n });
  return e.encoding === _r ? Xi(a) : a;
}
function h0(e) {
  const t = le(e.symKey, ae), { sealed: n, iv: r } = Sr({ encoded: e.encoded, encoding: e.encoding }), o = Ii(t, r).decrypt(n);
  if (o === null) throw new Error("Failed to decrypt");
  return ue(o, Vt);
}
function d0(e, t) {
  const n = Zi(On), r = at(Rt), o = le(e, Vt), i = Qi({ type: n, sealed: o, iv: r });
  return t === _r ? Xi(i) : i;
}
function p0(e, t) {
  const { sealed: n } = Sr({ encoded: e, encoding: t });
  return ue(n, Vt);
}
function Qi(e) {
  if (mt(e.type) === On) return ue(Ut([e.type, e.sealed]), Lt);
  if (mt(e.type) === Wt) {
    if (typeof e.senderPublicKey > "u") throw new Error("Missing sender public key for type 1 envelope");
    return ue(Ut([e.type, e.senderPublicKey, e.iv, e.sealed]), Lt);
  }
  return ue(Ut([e.type, e.iv, e.sealed]), Lt);
}
function Sr(e) {
  const t = (e.encoding || Lt) === _r ? Ji(e.encoded) : e.encoded, n = le(t, Lt), r = n.slice(Tl, Lo), o = Lo;
  if (mt(r) === Wt) {
    const l = o + Ir, s = l + Rt, c = n.slice(o, l), h = n.slice(l, s), u = n.slice(s);
    return { type: r, sealed: u, iv: h, senderPublicKey: c };
  }
  if (mt(r) === On) {
    const l = n.slice(o), s = at(Rt);
    return { type: r, sealed: l, iv: s };
  }
  const i = o + Rt, a = n.slice(o, i), f = n.slice(i);
  return { type: r, sealed: f, iv: a };
}
function g0(e, t) {
  const n = Sr({ encoded: e, encoding: t?.encoding });
  return Pl({ type: mt(n.type), senderPublicKey: typeof n.senderPublicKey < "u" ? ue(n.senderPublicKey, ae) : void 0, receiverPublicKey: t?.receiverPublicKey });
}
function Pl(e) {
  const t = e?.type || Yi;
  if (t === Wt) {
    if (typeof e?.senderPublicKey > "u") throw new Error("missing sender public key");
    if (typeof e?.receiverPublicKey > "u") throw new Error("missing receiver public key");
  }
  return { type: t, senderPublicKey: e?.senderPublicKey, receiverPublicKey: e?.receiverPublicKey };
}
function y0(e) {
  return e.type === Wt && typeof e.senderPublicKey == "string" && typeof e.receiverPublicKey == "string";
}
function w0(e) {
  return e.type === On;
}
function Cl(e) {
  const t = Buffer.from(e.x, "base64"), n = Buffer.from(e.y, "base64");
  return Ut([new Uint8Array([4]), t, n]);
}
function b0(e, t) {
  const [n, r, o] = e.split("."), i = Buffer.from(Ji(o), "base64");
  if (i.length !== 64) throw new Error("Invalid signature length");
  const a = i.slice(0, 32), f = i.slice(32, 64), l = `${n}.${r}`, s = mn(l), c = Cl(t);
  if (!Rl.verify(Ut([a, f]), s, c)) throw new Error("Invalid signature");
  return ls(e).payload;
}
const Dl = "irn";
function m0(e) {
  return e?.relay || { protocol: Dl };
}
function v0(e) {
  const t = us[e];
  if (typeof t > "u") throw new Error(`Relay Protocol not supported: ${e}`);
  return t;
}
var $l = Object.defineProperty, kl = Object.defineProperties, Ml = Object.getOwnPropertyDescriptors, Ro = Object.getOwnPropertySymbols, Fl = Object.prototype.hasOwnProperty, Kl = Object.prototype.propertyIsEnumerable, To = (e, t, n) => t in e ? $l(e, t, { enumerable: !0, configurable: !0, writable: !0, value: n }) : e[t] = n, Kn = (e, t) => {
  for (var n in t || (t = {})) Fl.call(t, n) && To(e, n, t[n]);
  if (Ro) for (var n of Ro(t)) Kl.call(t, n) && To(e, n, t[n]);
  return e;
}, Hl = (e, t) => kl(e, Ml(t));
function zl(e, t = "-") {
  const n = {}, r = "relay" + t;
  return Object.keys(e).forEach((o) => {
    if (o.startsWith(r)) {
      const i = o.replace(r, ""), a = e[o];
      n[i] = a;
    }
  }), n;
}
function E0(e) {
  if (!e.includes("wc:")) {
    const s = oi(e);
    s != null && s.includes("wc:") && (e = s);
  }
  e = e.includes("wc://") ? e.replace("wc://", "") : e, e = e.includes("wc:") ? e.replace("wc:", "") : e;
  const t = e.indexOf(":"), n = e.indexOf("?") !== -1 ? e.indexOf("?") : void 0, r = e.substring(0, t), o = e.substring(t + 1, n).split("@"), i = typeof n < "u" ? e.substring(n) : "", a = new URLSearchParams(i), f = Object.fromEntries(a.entries()), l = typeof f.methods == "string" ? f.methods.split(",") : void 0;
  return { protocol: r, topic: Vl(o[0]), version: parseInt(o[1], 10), symKey: f.symKey, relay: zl(f), methods: l, expiryTimestamp: f.expiryTimestamp ? parseInt(f.expiryTimestamp, 10) : void 0 };
}
function Vl(e) {
  return e.startsWith("//") ? e.substring(2) : e;
}
function Wl(e, t = "-") {
  const n = "relay", r = {};
  return Object.keys(e).forEach((o) => {
    const i = o, a = n + t + i;
    e[i] && (r[a] = e[i]);
  }), r;
}
function O0(e) {
  const t = new URLSearchParams(), n = Kn(Kn(Hl(Kn({}, Wl(e.relay)), { symKey: e.symKey }), e.expiryTimestamp && { expiryTimestamp: e.expiryTimestamp.toString() }), e.methods && { methods: e.methods.join(",") });
  return Object.entries(n).sort(([r], [o]) => r.localeCompare(o)).forEach(([r, o]) => {
    o !== void 0 && t.append(r, String(o));
  }), `${e.protocol}:${e.topic}@${e.version}?${t}`;
}
function _0(e, t, n) {
  return `${e}?wc_ev=${n}&topic=${t}`;
}
var ql = Object.defineProperty, Gl = Object.defineProperties, Yl = Object.getOwnPropertyDescriptors, Po = Object.getOwnPropertySymbols, Zl = Object.prototype.hasOwnProperty, Xl = Object.prototype.propertyIsEnumerable, Co = (e, t, n) => t in e ? ql(e, t, { enumerable: !0, configurable: !0, writable: !0, value: n }) : e[t] = n, Jl = (e, t) => {
  for (var n in t || (t = {})) Zl.call(t, n) && Co(e, n, t[n]);
  if (Po) for (var n of Po(t)) Xl.call(t, n) && Co(e, n, t[n]);
  return e;
}, Ql = (e, t) => Gl(e, Yl(t));
function Et(e) {
  const t = [];
  return e.forEach((n) => {
    const [r, o] = n.split(":");
    t.push(`${r}:${o}`);
  }), t;
}
function eh(e) {
  const t = [];
  return Object.values(e).forEach((n) => {
    t.push(...Et(n.accounts));
  }), [...new Set(t)];
}
function I0(e) {
  const t = [];
  return Object.values(e).forEach((n) => {
    t.push(...n.methods);
  }), [...new Set(t)];
}
function S0(e) {
  const t = [];
  return Object.values(e).forEach((n) => {
    t.push(...n.events);
  }), [...new Set(t)];
}
function th(e, t) {
  const n = [];
  return Object.values(e).forEach((r) => {
    Et(r.accounts).includes(t) && n.push(...r.methods);
  }), n;
}
function nh(e, t) {
  const n = [];
  return Object.values(e).forEach((r) => {
    Et(r.accounts).includes(t) && n.push(...r.events);
  }), n;
}
function es(e) {
  return e.includes(":");
}
function rh(e) {
  return es(e) ? e.split(":")[0] : e;
}
function Do(e) {
  var t, n, r;
  const o = {};
  if (!xr(e)) return o;
  for (const [i, a] of Object.entries(e)) {
    const f = es(i) ? [i] : a.chains, l = a.methods || [], s = a.events || [], c = rh(i);
    o[c] = Ql(Jl({}, o[c]), { chains: nt(f, (t = o[c]) == null ? void 0 : t.chains), methods: nt(l, (n = o[c]) == null ? void 0 : n.methods), events: nt(s, (r = o[c]) == null ? void 0 : r.events) });
  }
  return o;
}
function oh(e) {
  const t = {};
  return e?.forEach((n) => {
    var r;
    const [o, i] = n.split(":");
    t[o] || (t[o] = { accounts: [], chains: [], events: [], methods: [] }), t[o].accounts.push(n), (r = t[o].chains) == null || r.push(`${o}:${i}`);
  }), t;
}
function x0(e, t) {
  t = t.map((r) => r.replace("did:pkh:", ""));
  const n = oh(t);
  for (const [r, o] of Object.entries(n)) o.methods ? o.methods = nt(o.methods, e) : o.methods = e, o.events = ["chainChanged", "accountsChanged"];
  return n;
}
function B0(e, t) {
  var n, r, o, i, a, f;
  const l = Do(e), s = Do(t), c = {}, h = Object.keys(l).concat(Object.keys(s));
  for (const u of h) c[u] = { chains: nt((n = l[u]) == null ? void 0 : n.chains, (r = s[u]) == null ? void 0 : r.chains), methods: nt((o = l[u]) == null ? void 0 : o.methods, (i = s[u]) == null ? void 0 : i.methods), events: nt((a = l[u]) == null ? void 0 : a.events, (f = s[u]) == null ? void 0 : f.events) };
  return c;
}
const ih = { INVALID_METHOD: { message: "Invalid method.", code: 1001 }, INVALID_EVENT: { message: "Invalid event.", code: 1002 }, INVALID_UPDATE_REQUEST: { message: "Invalid update request.", code: 1003 }, INVALID_EXTEND_REQUEST: { message: "Invalid extend request.", code: 1004 }, INVALID_SESSION_SETTLE_REQUEST: { message: "Invalid session settle request.", code: 1005 }, UNAUTHORIZED_METHOD: { message: "Unauthorized method.", code: 3001 }, UNAUTHORIZED_EVENT: { message: "Unauthorized event.", code: 3002 }, UNAUTHORIZED_UPDATE_REQUEST: { message: "Unauthorized update request.", code: 3003 }, UNAUTHORIZED_EXTEND_REQUEST: { message: "Unauthorized extend request.", code: 3004 }, USER_REJECTED: { message: "User rejected.", code: 5e3 }, USER_REJECTED_CHAINS: { message: "User rejected chains.", code: 5001 }, USER_REJECTED_METHODS: { message: "User rejected methods.", code: 5002 }, USER_REJECTED_EVENTS: { message: "User rejected events.", code: 5003 }, UNSUPPORTED_CHAINS: { message: "Unsupported chains.", code: 5100 }, UNSUPPORTED_METHODS: { message: "Unsupported methods.", code: 5101 }, UNSUPPORTED_EVENTS: { message: "Unsupported events.", code: 5102 }, UNSUPPORTED_ACCOUNTS: { message: "Unsupported accounts.", code: 5103 }, UNSUPPORTED_NAMESPACE_KEY: { message: "Unsupported namespace key.", code: 5104 }, USER_DISCONNECTED: { message: "User disconnected.", code: 6e3 }, SESSION_SETTLEMENT_FAILED: { message: "Session settlement failed.", code: 7e3 }, WC_METHOD_UNSUPPORTED: { message: "Unsupported wc_ method.", code: 10001 } }, sh = { NOT_INITIALIZED: { message: "Not initialized.", code: 1 }, NO_MATCHING_KEY: { message: "No matching key.", code: 2 }, RESTORE_WILL_OVERRIDE: { message: "Restore will override.", code: 3 }, RESUBSCRIBED: { message: "Resubscribed.", code: 4 }, MISSING_OR_INVALID: { message: "Missing or invalid.", code: 5 }, EXPIRED: { message: "Expired.", code: 6 }, UNKNOWN_TYPE: { message: "Unknown type.", code: 7 }, MISMATCHED_TOPIC: { message: "Mismatched topic.", code: 8 }, NON_CONFORMING_NAMESPACES: { message: "Non conforming namespaces.", code: 9 } };
function ke(e, t) {
  const { message: n, code: r } = sh[e];
  return { message: t ? `${n} ${t}` : n, code: r };
}
function vt(e, t) {
  const { message: n, code: r } = ih[e];
  return { message: t ? `${n} ${t}` : n, code: r };
}
function _n(e, t) {
  return Array.isArray(e) ? typeof t < "u" && e.length ? e.every(t) : !0 : !1;
}
function xr(e) {
  return Object.getPrototypeOf(e) === Object.prototype && Object.keys(e).length;
}
function yt(e) {
  return typeof e > "u";
}
function de(e, t) {
  return t && yt(e) ? !0 : typeof e == "string" && !!e.trim().length;
}
function Br(e, t) {
  return typeof e == "number" && !isNaN(e);
}
function N0(e, t) {
  const { requiredNamespaces: n } = t, r = Object.keys(e.namespaces), o = Object.keys(n);
  let i = !0;
  return Je(o, r) ? (r.forEach((a) => {
    const { accounts: f, methods: l, events: s } = e.namespaces[a], c = Et(f), h = n[a];
    (!Je(ti(a, h), c) || !Je(h.methods, l) || !Je(h.events, s)) && (i = !1);
  }), i) : !1;
}
function un(e) {
  return de(e, !1) && e.includes(":") ? e.split(":").length === 2 : !1;
}
function ah(e) {
  if (de(e, !1) && e.includes(":")) {
    const t = e.split(":");
    if (t.length === 3) {
      const n = t[0] + ":" + t[1];
      return !!t[2] && un(n);
    }
  }
  return !1;
}
function A0(e) {
  function t(n) {
    try {
      return typeof new URL(n) < "u";
    } catch {
      return !1;
    }
  }
  try {
    if (de(e, !1)) {
      if (t(e)) return !0;
      const n = oi(e);
      return t(n);
    }
  } catch {
  }
  return !1;
}
function j0(e) {
  var t;
  return (t = e?.proposer) == null ? void 0 : t.publicKey;
}
function U0(e) {
  return e?.topic;
}
function L0(e, t) {
  let n = null;
  return de(e?.publicKey, !1) || (n = ke("MISSING_OR_INVALID", `${t} controller public key should be a string`)), n;
}
function $o(e) {
  let t = !0;
  return _n(e) ? e.length && (t = e.every((n) => de(n, !1))) : t = !1, t;
}
function fh(e, t, n) {
  let r = null;
  return _n(t) && t.length ? t.forEach((o) => {
    r || un(o) || (r = vt("UNSUPPORTED_CHAINS", `${n}, chain ${o} should be a string and conform to "namespace:chainId" format`));
  }) : un(e) || (r = vt("UNSUPPORTED_CHAINS", `${n}, chains must be defined as "namespace:chainId" e.g. "eip155:1": {...} in the namespace key OR as an array of CAIP-2 chainIds e.g. eip155: { chains: ["eip155:1", "eip155:5"] }`)), r;
}
function ch(e, t, n) {
  let r = null;
  return Object.entries(e).forEach(([o, i]) => {
    if (r) return;
    const a = fh(o, ti(o, i), `${t} ${n}`);
    a && (r = a);
  }), r;
}
function uh(e, t) {
  let n = null;
  return _n(e) ? e.forEach((r) => {
    n || ah(r) || (n = vt("UNSUPPORTED_ACCOUNTS", `${t}, account ${r} should be a string and conform to "namespace:chainId:address" format`));
  }) : n = vt("UNSUPPORTED_ACCOUNTS", `${t}, accounts should be an array of strings conforming to "namespace:chainId:address" format`), n;
}
function lh(e, t) {
  let n = null;
  return Object.values(e).forEach((r) => {
    if (n) return;
    const o = uh(r?.accounts, `${t} namespace`);
    o && (n = o);
  }), n;
}
function hh(e, t) {
  let n = null;
  return $o(e?.methods) ? $o(e?.events) || (n = vt("UNSUPPORTED_EVENTS", `${t}, events should be an array of strings or empty array for no events`)) : n = vt("UNSUPPORTED_METHODS", `${t}, methods should be an array of strings or empty array for no methods`), n;
}
function ts(e, t) {
  let n = null;
  return Object.values(e).forEach((r) => {
    if (n) return;
    const o = hh(r, `${t}, namespace`);
    o && (n = o);
  }), n;
}
function R0(e, t, n) {
  let r = null;
  if (e && xr(e)) {
    const o = ts(e, t);
    o && (r = o);
    const i = ch(e, t, n);
    i && (r = i);
  } else r = ke("MISSING_OR_INVALID", `${t}, ${n} should be an object with data`);
  return r;
}
function T0(e, t) {
  let n = null;
  if (e && xr(e)) {
    const r = ts(e, t);
    r && (n = r);
    const o = lh(e, t);
    o && (n = o);
  } else n = ke("MISSING_OR_INVALID", `${t}, namespaces should be an object with data`);
  return n;
}
function dh(e) {
  return de(e.protocol, !0);
}
function P0(e, t) {
  let n = !1;
  return e ? e && _n(e) && e.length && e.forEach((r) => {
    n = dh(r);
  }) : n = !0, n;
}
function C0(e) {
  return typeof e == "number";
}
function D0(e) {
  return typeof e < "u" && typeof e !== null;
}
function $0(e) {
  return !(!e || typeof e != "object" || !e.code || !Br(e.code) || !e.message || !de(e.message, !1));
}
function k0(e) {
  return !(yt(e) || !de(e.method, !1));
}
function M0(e) {
  return !(yt(e) || yt(e.result) && yt(e.error) || !Br(e.id) || !de(e.jsonrpc, !1));
}
function F0(e) {
  return !(yt(e) || !de(e.name, !1));
}
function K0(e, t) {
  return !(!un(t) || !eh(e).includes(t));
}
function H0(e, t, n) {
  return de(n, !1) ? th(e, t).includes(n) : !1;
}
function z0(e, t, n) {
  return de(n, !1) ? nh(e, t).includes(n) : !1;
}
function V0(e, t, n) {
  let r = null;
  const o = ph(e), i = gh(t), a = Object.keys(o), f = Object.keys(i), l = ko(Object.keys(e)), s = ko(Object.keys(t)), c = l.filter((h) => !s.includes(h));
  return c.length && (r = ke("NON_CONFORMING_NAMESPACES", `${n} namespaces keys don't satisfy requiredNamespaces.
      Required: ${c.toString()}
      Received: ${Object.keys(t).toString()}`)), Je(a, f) || (r = ke("NON_CONFORMING_NAMESPACES", `${n} namespaces chains don't satisfy required namespaces.
      Required: ${a.toString()}
      Approved: ${f.toString()}`)), Object.keys(t).forEach((h) => {
    if (!h.includes(":") || r) return;
    const u = Et(t[h].accounts);
    u.includes(h) || (r = ke("NON_CONFORMING_NAMESPACES", `${n} namespaces accounts don't satisfy namespace accounts for ${h}
        Required: ${h}
        Approved: ${u.toString()}`));
  }), a.forEach((h) => {
    r || (Je(o[h].methods, i[h].methods) ? Je(o[h].events, i[h].events) || (r = ke("NON_CONFORMING_NAMESPACES", `${n} namespaces events don't satisfy namespace events for ${h}`)) : r = ke("NON_CONFORMING_NAMESPACES", `${n} namespaces methods don't satisfy namespace methods for ${h}`));
  }), r;
}
function ph(e) {
  const t = {};
  return Object.keys(e).forEach((n) => {
    var r;
    n.includes(":") ? t[n] = e[n] : (r = e[n].chains) == null || r.forEach((o) => {
      t[o] = { methods: e[n].methods, events: e[n].events };
    });
  }), t;
}
function ko(e) {
  return [...new Set(e.map((t) => t.includes(":") ? t.split(":")[0] : t))];
}
function gh(e) {
  const t = {};
  return Object.keys(e).forEach((n) => {
    n.includes(":") ? t[n] = e[n] : Et(e[n].accounts)?.forEach((o) => {
      t[o] = { accounts: e[n].accounts.filter((i) => i.includes(`${o}:`)), methods: e[n].methods, events: e[n].events };
    });
  }), t;
}
function W0(e, t) {
  return Br(e) && e <= t.max && e >= t.min;
}
function q0() {
  const e = Kt();
  return new Promise((t) => {
    switch (e) {
      case ce.browser:
        t(yh());
        break;
      case ce.reactNative:
        t(wh());
        break;
      case ce.node:
        t(bh());
        break;
      default:
        t(!0);
    }
  });
}
function yh() {
  return Ft() && navigator?.onLine;
}
async function wh() {
  return st() && typeof global < "u" && global != null && global.NetInfo ? (await (global == null ? void 0 : global.NetInfo.fetch()))?.isConnected : !0;
}
function bh() {
  return !0;
}
function G0(e) {
  switch (Kt()) {
    case ce.browser:
      mh(e);
      break;
    case ce.reactNative:
      vh(e);
      break;
  }
}
function mh(e) {
  !st() && Ft() && (window.addEventListener("online", () => e(!0)), window.addEventListener("offline", () => e(!1)));
}
function vh(e) {
  st() && typeof global < "u" && global != null && global.NetInfo && global?.NetInfo.addEventListener((t) => e(t?.isConnected));
}
function Y0() {
  var e;
  return Ft() && Ve.getDocument() ? ((e = Ve.getDocument()) == null ? void 0 : e.visibilityState) === "visible" : !0;
}
const Hn = {};
class Z0 {
  static get(t) {
    return Hn[t];
  }
  static set(t, n) {
    Hn[t] = n;
  }
  static delete(t) {
    delete Hn[t];
  }
}
function Eh(e) {
  const t = Mt.decode(e);
  if (t.length < 33) throw new Error("Too short to contain a public key");
  return t.slice(1, 33);
}
function Oh({ publicKey: e, signature: t, payload: n }) {
  var r;
  const o = ar(n.method), i = 128 | parseInt(((r = n.version) == null ? void 0 : r.toString()) || "4"), a = Sh(n.address), f = n.era === "00" ? new Uint8Array([0]) : ar(n.era);
  if (f.length !== 1 && f.length !== 2) throw new Error("Invalid era length");
  const l = parseInt(n.nonce, 16), s = new Uint8Array([l & 255, l >> 8 & 255]), c = BigInt(`0x${Ih(n.tip)}`), h = Bh(c), u = new Uint8Array([0, ...e, a, ...t, ...f, ...s, ...h, ...o]), d = xh(u.length + 1);
  return new Uint8Array([...d, i, ...u]);
}
function _h(e) {
  const t = ar(e), n = as.blake2b(t, void 0, 32);
  return "0x" + Buffer.from(n).toString("hex");
}
function ar(e) {
  return new Uint8Array(e.replace(/^0x/, "").match(/.{1,2}/g).map((t) => parseInt(t, 16)));
}
function Ih(e) {
  return e.startsWith("0x") ? e.slice(2) : e;
}
function Sh(e) {
  const t = Mt.decode(e)[0];
  return t === 42 ? 0 : t === 60 ? 2 : 1;
}
function xh(e) {
  if (e < 64) return new Uint8Array([e << 2]);
  if (e < 16384) {
    const t = e << 2 | 1;
    return new Uint8Array([t & 255, t >> 8 & 255]);
  } else if (e < 1 << 30) {
    const t = e << 2 | 2;
    return new Uint8Array([t & 255, t >> 8 & 255, t >> 16 & 255, t >> 24 & 255]);
  } else throw new Error("Compact encoding > 2^30 not supported");
}
function Bh(e) {
  if (e < BigInt(1) << BigInt(6)) return new Uint8Array([Number(e << BigInt(2))]);
  if (e < BigInt(1) << BigInt(14)) {
    const t = e << BigInt(2) | BigInt(1);
    return new Uint8Array([Number(t & BigInt(255)), Number(t >> BigInt(8) & BigInt(255))]);
  } else if (e < BigInt(1) << BigInt(30)) {
    const t = e << BigInt(2) | BigInt(2);
    return new Uint8Array([Number(t & BigInt(255)), Number(t >> BigInt(8) & BigInt(255)), Number(t >> BigInt(16) & BigInt(255)), Number(t >> BigInt(24) & BigInt(255))]);
  } else throw new Error("BigInt compact encoding not supported > 2^30");
}
function X0(e) {
  const t = Uint8Array.from(Buffer.from(e.signature, "hex")), n = Eh(e.transaction.address), r = Oh({ publicKey: n, signature: t, payload: e.transaction }), o = Buffer.from(r).toString("hex");
  return _h(o);
}
function J0({ logger: e, name: t }) {
  const n = typeof e == "string" ? gf({ opts: { level: e, name: t } }).logger : e;
  return n.level = typeof e == "string" ? e : e.level, n;
}
var zn = {};
var fr = function(e, t) {
  return fr = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(n, r) {
    n.__proto__ = r;
  } || function(n, r) {
    for (var o in r) r.hasOwnProperty(o) && (n[o] = r[o]);
  }, fr(e, t);
};
function Nh(e, t) {
  fr(e, t);
  function n() {
    this.constructor = e;
  }
  e.prototype = t === null ? Object.create(t) : (n.prototype = t.prototype, new n());
}
var cr = function() {
  return cr = Object.assign || function(t) {
    for (var n, r = 1, o = arguments.length; r < o; r++) {
      n = arguments[r];
      for (var i in n) Object.prototype.hasOwnProperty.call(n, i) && (t[i] = n[i]);
    }
    return t;
  }, cr.apply(this, arguments);
};
function Ah(e, t) {
  var n = {};
  for (var r in e) Object.prototype.hasOwnProperty.call(e, r) && t.indexOf(r) < 0 && (n[r] = e[r]);
  if (e != null && typeof Object.getOwnPropertySymbols == "function")
    for (var o = 0, r = Object.getOwnPropertySymbols(e); o < r.length; o++)
      t.indexOf(r[o]) < 0 && Object.prototype.propertyIsEnumerable.call(e, r[o]) && (n[r[o]] = e[r[o]]);
  return n;
}
function jh(e, t, n, r) {
  var o = arguments.length, i = o < 3 ? t : r === null ? r = Object.getOwnPropertyDescriptor(t, n) : r, a;
  if (typeof Reflect == "object" && typeof Reflect.decorate == "function") i = Reflect.decorate(e, t, n, r);
  else for (var f = e.length - 1; f >= 0; f--) (a = e[f]) && (i = (o < 3 ? a(i) : o > 3 ? a(t, n, i) : a(t, n)) || i);
  return o > 3 && i && Object.defineProperty(t, n, i), i;
}
function Uh(e, t) {
  return function(n, r) {
    t(n, r, e);
  };
}
function Lh(e, t) {
  if (typeof Reflect == "object" && typeof Reflect.metadata == "function") return Reflect.metadata(e, t);
}
function Rh(e, t, n, r) {
  function o(i) {
    return i instanceof n ? i : new n(function(a) {
      a(i);
    });
  }
  return new (n || (n = Promise))(function(i, a) {
    function f(c) {
      try {
        s(r.next(c));
      } catch (h) {
        a(h);
      }
    }
    function l(c) {
      try {
        s(r.throw(c));
      } catch (h) {
        a(h);
      }
    }
    function s(c) {
      c.done ? i(c.value) : o(c.value).then(f, l);
    }
    s((r = r.apply(e, t || [])).next());
  });
}
function Th(e, t) {
  var n = { label: 0, sent: function() {
    if (i[0] & 1) throw i[1];
    return i[1];
  }, trys: [], ops: [] }, r, o, i, a;
  return a = { next: f(0), throw: f(1), return: f(2) }, typeof Symbol == "function" && (a[Symbol.iterator] = function() {
    return this;
  }), a;
  function f(s) {
    return function(c) {
      return l([s, c]);
    };
  }
  function l(s) {
    if (r) throw new TypeError("Generator is already executing.");
    for (; n; ) try {
      if (r = 1, o && (i = s[0] & 2 ? o.return : s[0] ? o.throw || ((i = o.return) && i.call(o), 0) : o.next) && !(i = i.call(o, s[1])).done) return i;
      switch (o = 0, i && (s = [s[0] & 2, i.value]), s[0]) {
        case 0:
        case 1:
          i = s;
          break;
        case 4:
          return n.label++, { value: s[1], done: !1 };
        case 5:
          n.label++, o = s[1], s = [0];
          continue;
        case 7:
          s = n.ops.pop(), n.trys.pop();
          continue;
        default:
          if (i = n.trys, !(i = i.length > 0 && i[i.length - 1]) && (s[0] === 6 || s[0] === 2)) {
            n = 0;
            continue;
          }
          if (s[0] === 3 && (!i || s[1] > i[0] && s[1] < i[3])) {
            n.label = s[1];
            break;
          }
          if (s[0] === 6 && n.label < i[1]) {
            n.label = i[1], i = s;
            break;
          }
          if (i && n.label < i[2]) {
            n.label = i[2], n.ops.push(s);
            break;
          }
          i[2] && n.ops.pop(), n.trys.pop();
          continue;
      }
      s = t.call(e, n);
    } catch (c) {
      s = [6, c], o = 0;
    } finally {
      r = i = 0;
    }
    if (s[0] & 5) throw s[1];
    return { value: s[0] ? s[1] : void 0, done: !0 };
  }
}
function Ph(e, t, n, r) {
  r === void 0 && (r = n), e[r] = t[n];
}
function Ch(e, t) {
  for (var n in e) n !== "default" && !t.hasOwnProperty(n) && (t[n] = e[n]);
}
function ur(e) {
  var t = typeof Symbol == "function" && Symbol.iterator, n = t && e[t], r = 0;
  if (n) return n.call(e);
  if (e && typeof e.length == "number") return {
    next: function() {
      return e && r >= e.length && (e = void 0), { value: e && e[r++], done: !e };
    }
  };
  throw new TypeError(t ? "Object is not iterable." : "Symbol.iterator is not defined.");
}
function ns(e, t) {
  var n = typeof Symbol == "function" && e[Symbol.iterator];
  if (!n) return e;
  var r = n.call(e), o, i = [], a;
  try {
    for (; (t === void 0 || t-- > 0) && !(o = r.next()).done; ) i.push(o.value);
  } catch (f) {
    a = { error: f };
  } finally {
    try {
      o && !o.done && (n = r.return) && n.call(r);
    } finally {
      if (a) throw a.error;
    }
  }
  return i;
}
function Dh() {
  for (var e = [], t = 0; t < arguments.length; t++)
    e = e.concat(ns(arguments[t]));
  return e;
}
function $h() {
  for (var e = 0, t = 0, n = arguments.length; t < n; t++) e += arguments[t].length;
  for (var r = Array(e), o = 0, t = 0; t < n; t++)
    for (var i = arguments[t], a = 0, f = i.length; a < f; a++, o++)
      r[o] = i[a];
  return r;
}
function $t(e) {
  return this instanceof $t ? (this.v = e, this) : new $t(e);
}
function kh(e, t, n) {
  if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
  var r = n.apply(e, t || []), o, i = [];
  return o = {}, a("next"), a("throw"), a("return"), o[Symbol.asyncIterator] = function() {
    return this;
  }, o;
  function a(u) {
    r[u] && (o[u] = function(d) {
      return new Promise(function(p, g) {
        i.push([u, d, p, g]) > 1 || f(u, d);
      });
    });
  }
  function f(u, d) {
    try {
      l(r[u](d));
    } catch (p) {
      h(i[0][3], p);
    }
  }
  function l(u) {
    u.value instanceof $t ? Promise.resolve(u.value.v).then(s, c) : h(i[0][2], u);
  }
  function s(u) {
    f("next", u);
  }
  function c(u) {
    f("throw", u);
  }
  function h(u, d) {
    u(d), i.shift(), i.length && f(i[0][0], i[0][1]);
  }
}
function Mh(e) {
  var t, n;
  return t = {}, r("next"), r("throw", function(o) {
    throw o;
  }), r("return"), t[Symbol.iterator] = function() {
    return this;
  }, t;
  function r(o, i) {
    t[o] = e[o] ? function(a) {
      return (n = !n) ? { value: $t(e[o](a)), done: o === "return" } : i ? i(a) : a;
    } : i;
  }
}
function Fh(e) {
  if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
  var t = e[Symbol.asyncIterator], n;
  return t ? t.call(e) : (e = typeof ur == "function" ? ur(e) : e[Symbol.iterator](), n = {}, r("next"), r("throw"), r("return"), n[Symbol.asyncIterator] = function() {
    return this;
  }, n);
  function r(i) {
    n[i] = e[i] && function(a) {
      return new Promise(function(f, l) {
        a = e[i](a), o(f, l, a.done, a.value);
      });
    };
  }
  function o(i, a, f, l) {
    Promise.resolve(l).then(function(s) {
      i({ value: s, done: f });
    }, a);
  }
}
function Kh(e, t) {
  return Object.defineProperty ? Object.defineProperty(e, "raw", { value: t }) : e.raw = t, e;
}
function Hh(e) {
  if (e && e.__esModule) return e;
  var t = {};
  if (e != null) for (var n in e) Object.hasOwnProperty.call(e, n) && (t[n] = e[n]);
  return t.default = e, t;
}
function zh(e) {
  return e && e.__esModule ? e : { default: e };
}
function Vh(e, t) {
  if (!t.has(e))
    throw new TypeError("attempted to get private field on non-instance");
  return t.get(e);
}
function Wh(e, t, n) {
  if (!t.has(e))
    throw new TypeError("attempted to set private field on non-instance");
  return t.set(e, n), n;
}
const qh = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  get __assign() {
    return cr;
  },
  __asyncDelegator: Mh,
  __asyncGenerator: kh,
  __asyncValues: Fh,
  __await: $t,
  __awaiter: Rh,
  __classPrivateFieldGet: Vh,
  __classPrivateFieldSet: Wh,
  __createBinding: Ph,
  __decorate: jh,
  __exportStar: Ch,
  __extends: Nh,
  __generator: Th,
  __importDefault: zh,
  __importStar: Hh,
  __makeTemplateObject: Kh,
  __metadata: Lh,
  __param: Uh,
  __read: ns,
  __rest: Ah,
  __spread: Dh,
  __spreadArrays: $h,
  __values: ur
}, Symbol.toStringTag, { value: "Module" })), Gh = /* @__PURE__ */ Ho(qh);
var Ee = {}, Mo;
function Yh() {
  if (Mo) return Ee;
  Mo = 1, Object.defineProperty(Ee, "__esModule", { value: !0 }), Ee.isBrowserCryptoAvailable = Ee.getSubtleCrypto = Ee.getBrowerCrypto = void 0;
  function e() {
    return (ft === null || ft === void 0 ? void 0 : ft.crypto) || (ft === null || ft === void 0 ? void 0 : ft.msCrypto) || {};
  }
  Ee.getBrowerCrypto = e;
  function t() {
    const r = e();
    return r.subtle || r.webkitSubtle;
  }
  Ee.getSubtleCrypto = t;
  function n() {
    return !!e() && !!t();
  }
  return Ee.isBrowserCryptoAvailable = n, Ee;
}
var Oe = {}, Fo;
function Zh() {
  if (Fo) return Oe;
  Fo = 1, Object.defineProperty(Oe, "__esModule", { value: !0 }), Oe.isBrowser = Oe.isNode = Oe.isReactNative = void 0;
  function e() {
    return typeof document > "u" && typeof navigator < "u" && navigator.product === "ReactNative";
  }
  Oe.isReactNative = e;
  function t() {
    return typeof process < "u" && typeof process.versions < "u" && typeof process.versions.node < "u";
  }
  Oe.isNode = t;
  function n() {
    return !e() && !t();
  }
  return Oe.isBrowser = n, Oe;
}
var Ko;
function Xh() {
  return Ko || (Ko = 1, (function(e) {
    Object.defineProperty(e, "__esModule", { value: !0 });
    const t = Gh;
    t.__exportStar(Yh(), e), t.__exportStar(Zh(), e);
  })(zn)), zn;
}
var Q0 = Xh();
export {
  d0 as $,
  wd as A,
  ke as B,
  Ld as C,
  Rd as D,
  pd as E,
  bd as F,
  ud as G,
  m0 as H,
  dd as I,
  vt as J,
  v0 as K,
  qd as L,
  Ed as M,
  Dd as N,
  Cd as O,
  td as P,
  u0 as Q,
  ld as R,
  md as S,
  gd as T,
  gf as U,
  s0 as V,
  f0 as W,
  c0 as X,
  Pl as Y,
  w0 as Z,
  kd as _,
  Zo as a,
  M0 as a$,
  y0 as a0,
  l0 as a1,
  g0 as a2,
  p0 as a3,
  h0 as a4,
  Lt as a5,
  Sr as a6,
  mt as a7,
  ae as a8,
  yt as a9,
  Kd as aA,
  N0 as aB,
  Kf as aC,
  n0 as aD,
  mu as aE,
  r0 as aF,
  On as aG,
  _0 as aH,
  t0 as aI,
  uu as aJ,
  mi as aK,
  o0 as aL,
  i0 as aM,
  x0 as aN,
  lu as aO,
  Z0 as aP,
  P0 as aQ,
  xr as aR,
  R0 as aS,
  T0 as aT,
  V0 as aU,
  $0 as aV,
  dh as aW,
  L0 as aX,
  K0 as aY,
  k0 as aZ,
  H0 as a_,
  j0 as aa,
  U0 as ab,
  Wt as ac,
  O0 as ad,
  E0 as ae,
  Td as af,
  Fd as ag,
  Md as ah,
  D0 as ai,
  A0 as aj,
  de as ak,
  Ft as al,
  Ve as am,
  b0 as an,
  tc as ao,
  Vd as ap,
  Jf as aq,
  Id as ar,
  jd as as,
  xd as at,
  Gd as au,
  _r as av,
  C0 as aw,
  W0 as ax,
  B0 as ay,
  Hd as az,
  Q0 as b,
  F0 as b0,
  z0 as b1,
  zd as b2,
  st as b3,
  eh as b4,
  I0 as b5,
  S0 as b6,
  Zd as b7,
  Xd as b8,
  X0 as b9,
  Jd as ba,
  _n as bb,
  Qd as bc,
  e0 as bd,
  Yd as be,
  Fe as c,
  od as d,
  zo as e,
  lf as f,
  yd as g,
  hd as h,
  nd as i,
  J0 as j,
  Ad as k,
  Bd as l,
  Nd as m,
  Pd as n,
  q0 as o,
  a0 as p,
  ni as q,
  Hs as r,
  Yo as s,
  Ud as t,
  G0 as u,
  $d as v,
  Wd as w,
  Od as x,
  Y0 as y,
  _d as z
};
