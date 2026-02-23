import { g as zo } from "./wallet-connect-standalone-runtime-ByX85dGu.js";
const Fo = /* @__PURE__ */ Symbol(), on = Object.getPrototypeOf, yr = /* @__PURE__ */ new WeakMap(), qo = (e) => e && (yr.has(e) ? yr.get(e) : on(e) === Object.prototype || on(e) === Array.prototype), Zo = (e) => qo(e) && e[Fo] || null, sn = (e, t = !0) => {
  yr.set(e, t);
}, vt = {}, Wt = (e) => typeof e == "object" && e !== null, ce = /* @__PURE__ */ new WeakMap(), ht = /* @__PURE__ */ new WeakSet(), Ko = (e = Object.is, t = (c, m) => new Proxy(c, m), r = (c) => Wt(c) && !ht.has(c) && (Array.isArray(c) || !(Symbol.iterator in c)) && !(c instanceof WeakMap) && !(c instanceof WeakSet) && !(c instanceof Error) && !(c instanceof Number) && !(c instanceof Date) && !(c instanceof String) && !(c instanceof RegExp) && !(c instanceof ArrayBuffer), o = (c) => {
  switch (c.status) {
    case "fulfilled":
      return c.value;
    case "rejected":
      throw c.reason;
    default:
      throw c;
  }
}, n = /* @__PURE__ */ new WeakMap(), i = (c, m, g = o) => {
  const h = n.get(c);
  if (h?.[0] === m)
    return h[1];
  const f = Array.isArray(c) ? [] : Object.create(Object.getPrototypeOf(c));
  return sn(f, !0), n.set(c, [m, f]), Reflect.ownKeys(c).forEach((b) => {
    if (Object.getOwnPropertyDescriptor(f, b))
      return;
    const w = Reflect.get(c, b), T = {
      value: w,
      enumerable: !0,
      // This is intentional to avoid copying with proxy-compare.
      // It's still non-writable, so it avoids assigning a value.
      configurable: !0
    };
    if (ht.has(w))
      sn(w, !1);
    else if (w instanceof Promise)
      delete T.value, T.get = () => g(w);
    else if (ce.has(w)) {
      const [p, O] = ce.get(
        w
      );
      T.value = i(
        p,
        O(),
        g
      );
    }
    Object.defineProperty(f, b, T);
  }), Object.preventExtensions(f);
}, s = /* @__PURE__ */ new WeakMap(), a = [1, 1], l = (c) => {
  if (!Wt(c))
    throw new Error("object required");
  const m = s.get(c);
  if (m)
    return m;
  let g = a[0];
  const h = /* @__PURE__ */ new Set(), f = (u, v = ++a[0]) => {
    g !== v && (g = v, h.forEach((d) => d(u, v)));
  };
  let b = a[1];
  const w = (u = ++a[1]) => (b !== u && !h.size && (b = u, p.forEach(([v]) => {
    const d = v[1](u);
    d > g && (g = d);
  })), g), T = (u) => (v, d) => {
    const _ = [...v];
    _[1] = [u, ..._[1]], f(_, d);
  }, p = /* @__PURE__ */ new Map(), O = (u, v) => {
    if ((vt ? "production" : void 0) !== "production" && p.has(u))
      throw new Error("prop listener already exists");
    if (h.size) {
      const d = v[3](T(u));
      p.set(u, [v, d]);
    } else
      p.set(u, [v]);
  }, $ = (u) => {
    var v;
    const d = p.get(u);
    d && (p.delete(u), (v = d[1]) == null || v.call(d));
  }, A = (u) => (h.add(u), h.size === 1 && p.forEach(([d, _], C) => {
    if ((vt ? "production" : void 0) !== "production" && _)
      throw new Error("remove already exists");
    const M = d[3](T(C));
    p.set(C, [d, M]);
  }), () => {
    h.delete(u), h.size === 0 && p.forEach(([d, _], C) => {
      _ && (_(), p.set(C, [d]));
    });
  }), W = Array.isArray(c) ? [] : Object.create(Object.getPrototypeOf(c)), E = t(W, {
    deleteProperty(u, v) {
      const d = Reflect.get(u, v);
      $(v);
      const _ = Reflect.deleteProperty(u, v);
      return _ && f(["delete", [v], d]), _;
    },
    set(u, v, d, _) {
      const C = Reflect.has(u, v), M = Reflect.get(u, v, _);
      if (C && (e(M, d) || s.has(d) && e(M, s.get(d))))
        return !0;
      $(v), Wt(d) && (d = Zo(d) || d);
      let Q = d;
      if (d instanceof Promise)
        d.then((Z) => {
          d.status = "fulfilled", d.value = Z, f(["resolve", [v], Z]);
        }).catch((Z) => {
          d.status = "rejected", d.reason = Z, f(["reject", [v], Z]);
        });
      else {
        !ce.has(d) && r(d) && (Q = l(d));
        const Z = !ht.has(Q) && ce.get(Q);
        Z && O(v, Z);
      }
      return Reflect.set(u, v, Q, _), f(["set", [v], d, M]), !0;
    }
  });
  s.set(c, E);
  const P = [
    W,
    w,
    i,
    A
  ];
  return ce.set(E, P), Reflect.ownKeys(c).forEach((u) => {
    const v = Object.getOwnPropertyDescriptor(
      c,
      u
    );
    "value" in v && (E[u] = c[u], delete v.value, delete v.writable), Object.defineProperty(W, u, v);
  }), E;
}) => [
  // public functions
  l,
  // shared state
  ce,
  ht,
  // internal things
  e,
  t,
  r,
  o,
  n,
  i,
  s,
  a
], [Yo] = Ko();
function we(e = {}) {
  return Yo(e);
}
function Me(e, t, r) {
  const o = ce.get(e);
  (vt ? "production" : void 0) !== "production" && !o && console.warn("Please use proxy object");
  let n;
  const i = [], s = o[3];
  let a = !1;
  const c = s((m) => {
    i.push(m), n || (n = Promise.resolve().then(() => {
      n = void 0, a && t(i.splice(0));
    }));
  });
  return a = !0, () => {
    a = !1, c();
  };
}
function Qo(e, t) {
  const r = ce.get(e);
  (vt ? "production" : void 0) !== "production" && !r && console.warn("Please use proxy object");
  const [o, n, i] = r;
  return i(o, n(), t);
}
const z = we({
  history: ["ConnectWallet"],
  view: "ConnectWallet",
  data: void 0
}), k = {
  state: z,
  subscribe(e) {
    return Me(z, () => e(z));
  },
  push(e, t) {
    e !== z.view && (z.view = e, t && (z.data = t), z.history.push(e));
  },
  reset(e) {
    z.view = e, z.history = [e];
  },
  replace(e) {
    z.history.length > 1 && (z.history[z.history.length - 1] = e, z.view = e);
  },
  goBack() {
    if (z.history.length > 1) {
      z.history.pop();
      const [e] = z.history.slice(-1);
      z.view = e;
    }
  },
  setData(e) {
    z.data = e;
  }
}, x = {
  WALLETCONNECT_DEEPLINK_CHOICE: "WALLETCONNECT_DEEPLINK_CHOICE",
  WCM_VERSION: "WCM_VERSION",
  RECOMMENDED_WALLET_AMOUNT: 9,
  isMobile() {
    return typeof window < "u" ? !!(window.matchMedia("(pointer:coarse)").matches || /Android|webOS|iPhone|iPad|iPod|BlackBerry|Opera Mini/u.test(navigator.userAgent)) : !1;
  },
  isAndroid() {
    return x.isMobile() && navigator.userAgent.toLowerCase().includes("android");
  },
  isIos() {
    const e = navigator.userAgent.toLowerCase();
    return x.isMobile() && (e.includes("iphone") || e.includes("ipad"));
  },
  isHttpUrl(e) {
    return e.startsWith("http://") || e.startsWith("https://");
  },
  isArray(e) {
    return Array.isArray(e) && e.length > 0;
  },
  isTelegram() {
    return typeof window < "u" && // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (!!window.TelegramWebviewProxy || // eslint-disable-next-line @typescript-eslint/no-explicit-any
    !!window.Telegram || // eslint-disable-next-line @typescript-eslint/no-explicit-any
    !!window.TelegramWebviewProxyProto);
  },
  formatNativeUrl(e, t, r) {
    if (x.isHttpUrl(e))
      return this.formatUniversalUrl(e, t, r);
    let o = e;
    o.includes("://") || (o = e.replaceAll("/", "").replaceAll(":", ""), o = `${o}://`), o.endsWith("/") || (o = `${o}/`), this.setWalletConnectDeepLink(o, r);
    const n = encodeURIComponent(t);
    return `${o}wc?uri=${n}`;
  },
  formatUniversalUrl(e, t, r) {
    if (!x.isHttpUrl(e))
      return this.formatNativeUrl(e, t, r);
    let o = e;
    if (o.startsWith("https://t.me")) {
      const i = Buffer.from(t).toString("base64").replace(/[=]/g, "");
      o.endsWith("/") && (o = o.slice(0, -1)), this.setWalletConnectDeepLink(o, r);
      const s = new URL(o);
      return s.searchParams.set("startapp", i), s.toString();
    }
    o.endsWith("/") || (o = `${o}/`), this.setWalletConnectDeepLink(o, r);
    const n = encodeURIComponent(t);
    return `${o}wc?uri=${n}`;
  },
  async wait(e) {
    return new Promise((t) => {
      setTimeout(t, e);
    });
  },
  openHref(e, t) {
    const r = this.isTelegram() ? "_blank" : t;
    window.open(e, r, "noreferrer noopener");
  },
  setWalletConnectDeepLink(e, t) {
    try {
      localStorage.setItem(x.WALLETCONNECT_DEEPLINK_CHOICE, JSON.stringify({ href: e, name: t }));
    } catch {
      console.info("Unable to set WalletConnect deep link");
    }
  },
  setWalletConnectAndroidDeepLink(e) {
    try {
      const [t] = e.split("?");
      localStorage.setItem(
        x.WALLETCONNECT_DEEPLINK_CHOICE,
        JSON.stringify({ href: t, name: "Android" })
      );
    } catch {
      console.info("Unable to set WalletConnect android deep link");
    }
  },
  removeWalletConnectDeepLink() {
    try {
      localStorage.removeItem(x.WALLETCONNECT_DEEPLINK_CHOICE);
    } catch {
      console.info("Unable to remove WalletConnect deep link");
    }
  },
  setModalVersionInStorage() {
    try {
      typeof localStorage < "u" && localStorage.setItem(x.WCM_VERSION, "2.7.0");
    } catch {
      console.info("Unable to set Web3Modal version in storage");
    }
  },
  getWalletRouterData() {
    var e;
    const t = (e = k.state.data) == null ? void 0 : e.Wallet;
    if (!t)
      throw new Error('Missing "Wallet" view data');
    return t;
  }
}, Go = typeof location < "u" && (location.hostname.includes("localhost") || location.protocol.includes("https")), F = we({
  enabled: Go,
  userSessionId: "",
  events: [],
  connectedWalletId: void 0
}), ho = {
  state: F,
  subscribe(e) {
    return Me(F.events, () => e(Qo(F.events[F.events.length - 1])));
  },
  initialize() {
    F.enabled && typeof (crypto == null ? void 0 : crypto.randomUUID) < "u" && (F.userSessionId = crypto.randomUUID());
  },
  setConnectedWalletId(e) {
    F.connectedWalletId = e;
  },
  click(e) {
    if (F.enabled) {
      const t = {
        type: "CLICK",
        name: e.name,
        userSessionId: F.userSessionId,
        timestamp: Date.now(),
        data: e
      };
      F.events.push(t);
    }
  },
  track(e) {
    if (F.enabled) {
      const t = {
        type: "TRACK",
        name: e.name,
        userSessionId: F.userSessionId,
        timestamp: Date.now(),
        data: e
      };
      F.events.push(t);
    }
  },
  view(e) {
    if (F.enabled) {
      const t = {
        type: "VIEW",
        name: e.name,
        userSessionId: F.userSessionId,
        timestamp: Date.now(),
        data: e
      };
      F.events.push(t);
    }
  }
}, X = we({
  chains: void 0,
  walletConnectUri: void 0,
  isAuth: !1,
  isCustomDesktop: !1,
  isCustomMobile: !1,
  isDataLoaded: !1,
  isUiLoaded: !1
}), H = {
  state: X,
  subscribe(e) {
    return Me(X, () => e(X));
  },
  setChains(e) {
    X.chains = e;
  },
  setWalletConnectUri(e) {
    X.walletConnectUri = e;
  },
  setIsCustomDesktop(e) {
    X.isCustomDesktop = e;
  },
  setIsCustomMobile(e) {
    X.isCustomMobile = e;
  },
  setIsDataLoaded(e) {
    X.isDataLoaded = e;
  },
  setIsUiLoaded(e) {
    X.isUiLoaded = e;
  },
  setIsAuth(e) {
    X.isAuth = e;
  }
}, mt = we({
  projectId: "",
  mobileWallets: void 0,
  desktopWallets: void 0,
  walletImages: void 0,
  chains: void 0,
  enableAuthMode: !1,
  enableExplorer: !0,
  explorerExcludedWalletIds: void 0,
  explorerRecommendedWalletIds: void 0,
  termsOfServiceUrl: void 0,
  privacyPolicyUrl: void 0
}), G = {
  state: mt,
  subscribe(e) {
    return Me(mt, () => e(mt));
  },
  setConfig(e) {
    var t, r;
    ho.initialize(), H.setChains(e.chains), H.setIsAuth(!!e.enableAuthMode), H.setIsCustomMobile(!!((t = e.mobileWallets) != null && t.length)), H.setIsCustomDesktop(!!((r = e.desktopWallets) != null && r.length)), x.setModalVersionInStorage(), Object.assign(mt, e);
  }
};
var Jo = Object.defineProperty, an = Object.getOwnPropertySymbols, Xo = Object.prototype.hasOwnProperty, ei = Object.prototype.propertyIsEnumerable, ln = (e, t, r) => t in e ? Jo(e, t, { enumerable: !0, configurable: !0, writable: !0, value: r }) : e[t] = r, ti = (e, t) => {
  for (var r in t || (t = {}))
    Xo.call(t, r) && ln(e, r, t[r]);
  if (an)
    for (var r of an(t))
      ei.call(t, r) && ln(e, r, t[r]);
  return e;
};
const _r = "https://explorer-api.walletconnect.com", xr = "wcm", Cr = "js-2.7.0";
async function ft(e, t) {
  const r = ti({ sdkType: xr, sdkVersion: Cr }, t), o = new URL(e, _r);
  return o.searchParams.append("projectId", G.state.projectId), Object.entries(r).forEach(([i, s]) => {
    s && o.searchParams.append(i, String(s));
  }), (await fetch(o)).json();
}
const be = {
  async getDesktopListings(e) {
    return ft("/w3m/v1/getDesktopListings", e);
  },
  async getMobileListings(e) {
    return ft("/w3m/v1/getMobileListings", e);
  },
  async getInjectedListings(e) {
    return ft("/w3m/v1/getInjectedListings", e);
  },
  async getAllListings(e) {
    return ft("/w3m/v1/getAllListings", e);
  },
  getWalletImageUrl(e) {
    return `${_r}/w3m/v1/getWalletImage/${e}?projectId=${G.state.projectId}&sdkType=${xr}&sdkVersion=${Cr}`;
  },
  getAssetImageUrl(e) {
    return `${_r}/w3m/v1/getAssetImage/${e}?projectId=${G.state.projectId}&sdkType=${xr}&sdkVersion=${Cr}`;
  }
};
var ri = Object.defineProperty, cn = Object.getOwnPropertySymbols, ni = Object.prototype.hasOwnProperty, oi = Object.prototype.propertyIsEnumerable, dn = (e, t, r) => t in e ? ri(e, t, { enumerable: !0, configurable: !0, writable: !0, value: r }) : e[t] = r, ii = (e, t) => {
  for (var r in t || (t = {}))
    ni.call(t, r) && dn(e, r, t[r]);
  if (cn)
    for (var r of cn(t))
      oi.call(t, r) && dn(e, r, t[r]);
  return e;
};
const un = x.isMobile(), ee = we({
  wallets: { listings: [], total: 0, page: 1 },
  search: { listings: [], total: 0, page: 1 },
  recomendedWallets: []
}), K = {
  state: ee,
  async getRecomendedWallets() {
    const { explorerRecommendedWalletIds: e, explorerExcludedWalletIds: t } = G.state;
    if (e === "NONE" || t === "ALL" && !e)
      return ee.recomendedWallets;
    if (x.isArray(e)) {
      const o = { recommendedIds: e.join(",") }, { listings: n } = await be.getAllListings(o), i = Object.values(n);
      i.sort((s, a) => {
        const l = e.indexOf(s.id), c = e.indexOf(a.id);
        return l - c;
      }), ee.recomendedWallets = i;
    } else {
      const { chains: r, isAuth: o } = H.state, n = r?.join(","), i = x.isArray(t), s = {
        page: 1,
        sdks: o ? "auth_v1" : void 0,
        entries: x.RECOMMENDED_WALLET_AMOUNT,
        chains: n,
        version: 2,
        excludedIds: i ? t.join(",") : void 0
      }, { listings: a } = un ? await be.getMobileListings(s) : await be.getDesktopListings(s);
      ee.recomendedWallets = Object.values(a);
    }
    return ee.recomendedWallets;
  },
  async getWallets(e) {
    const t = ii({}, e), { explorerRecommendedWalletIds: r, explorerExcludedWalletIds: o } = G.state, { recomendedWallets: n } = ee;
    if (o === "ALL")
      return ee.wallets;
    n.length ? t.excludedIds = n.map((g) => g.id).join(",") : x.isArray(r) && (t.excludedIds = r.join(",")), x.isArray(o) && (t.excludedIds = [t.excludedIds, o].filter(Boolean).join(",")), H.state.isAuth && (t.sdks = "auth_v1");
    const { page: i, search: s } = e, { listings: a, total: l } = un ? await be.getMobileListings(t) : await be.getDesktopListings(t), c = Object.values(a), m = s ? "search" : "wallets";
    return ee[m] = {
      listings: [...ee[m].listings, ...c],
      total: l,
      page: i ?? 1
    }, { listings: c, total: l };
  },
  getWalletImageUrl(e) {
    return be.getWalletImageUrl(e);
  },
  getAssetImageUrl(e) {
    return be.getAssetImageUrl(e);
  },
  resetSearch() {
    ee.search = { listings: [], total: 0, page: 1 };
  }
}, Le = we({
  open: !1
}), $e = {
  state: Le,
  subscribe(e) {
    return Me(Le, () => e(Le));
  },
  async open(e) {
    return new Promise((t) => {
      const { isUiLoaded: r, isDataLoaded: o } = H.state;
      if (x.removeWalletConnectDeepLink(), H.setWalletConnectUri(e?.uri), H.setChains(e?.chains), k.reset("ConnectWallet"), r && o)
        Le.open = !0, t();
      else {
        const n = setInterval(() => {
          const i = H.state;
          i.isUiLoaded && i.isDataLoaded && (clearInterval(n), Le.open = !0, t());
        }, 200);
      }
    });
  },
  close() {
    Le.open = !1;
  }
};
var si = Object.defineProperty, hn = Object.getOwnPropertySymbols, ai = Object.prototype.hasOwnProperty, li = Object.prototype.propertyIsEnumerable, mn = (e, t, r) => t in e ? si(e, t, { enumerable: !0, configurable: !0, writable: !0, value: r }) : e[t] = r, ci = (e, t) => {
  for (var r in t || (t = {}))
    ai.call(t, r) && mn(e, r, t[r]);
  if (hn)
    for (var r of hn(t))
      li.call(t, r) && mn(e, r, t[r]);
  return e;
};
function di() {
  return typeof matchMedia < "u" && matchMedia("(prefers-color-scheme: dark)").matches;
}
const Ye = we({
  themeMode: di() ? "dark" : "light"
}), fe = {
  state: Ye,
  subscribe(e) {
    return Me(Ye, () => e(Ye));
  },
  setThemeConfig(e) {
    const { themeMode: t, themeVariables: r } = e;
    t && (Ye.themeMode = t), r && (Ye.themeVariables = ci({}, r));
  }
}, ye = we({
  open: !1,
  message: "",
  variant: "success"
}), ue = {
  state: ye,
  subscribe(e) {
    return Me(ye, () => e(ye));
  },
  openToast(e, t) {
    ye.open = !0, ye.message = e, ye.variant = t;
  },
  closeToast() {
    ye.open = !1;
  }
};
class Ul {
  constructor(t) {
    this.openModal = $e.open, this.closeModal = $e.close, this.subscribeModal = $e.subscribe, this.setTheme = fe.setThemeConfig, fe.setThemeConfig(t), G.setConfig(t), this.initUi();
  }
  async initUi() {
    if (typeof window < "u") {
      await Promise.resolve().then(() => Nl);
      const t = document.createElement("wcm-modal");
      document.body.insertAdjacentElement("beforeend", t), H.setIsUiLoaded(!0);
    }
  }
}
const wt = window, qr = wt.ShadowRoot && (wt.ShadyCSS === void 0 || wt.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, Zr = /* @__PURE__ */ Symbol(), fn = /* @__PURE__ */ new WeakMap();
let mo = class {
  constructor(t, r, o) {
    if (this._$cssResult$ = !0, o !== Zr) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = t, this.t = r;
  }
  get styleSheet() {
    let t = this.o;
    const r = this.t;
    if (qr && t === void 0) {
      const o = r !== void 0 && r.length === 1;
      o && (t = fn.get(r)), t === void 0 && ((this.o = t = new CSSStyleSheet()).replaceSync(this.cssText), o && fn.set(r, t));
    }
    return t;
  }
  toString() {
    return this.cssText;
  }
};
const ui = (e) => new mo(typeof e == "string" ? e : e + "", void 0, Zr), B = (e, ...t) => {
  const r = e.length === 1 ? e[0] : t.reduce(((o, n, i) => o + ((s) => {
    if (s._$cssResult$ === !0) return s.cssText;
    if (typeof s == "number") return s;
    throw Error("Value passed to 'css' function must be a 'css' function result: " + s + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
  })(n) + e[i + 1]), e[0]);
  return new mo(r, e, Zr);
}, hi = (e, t) => {
  qr ? e.adoptedStyleSheets = t.map(((r) => r instanceof CSSStyleSheet ? r : r.styleSheet)) : t.forEach(((r) => {
    const o = document.createElement("style"), n = wt.litNonce;
    n !== void 0 && o.setAttribute("nonce", n), o.textContent = r.cssText, e.appendChild(o);
  }));
}, pn = qr ? (e) => e : (e) => e instanceof CSSStyleSheet ? ((t) => {
  let r = "";
  for (const o of t.cssRules) r += o.cssText;
  return ui(r);
})(e) : e;
var Nt;
const bt = window, gn = bt.trustedTypes, mi = gn ? gn.emptyScript : "", wn = bt.reactiveElementPolyfillSupport, $r = { toAttribute(e, t) {
  switch (t) {
    case Boolean:
      e = e ? mi : null;
      break;
    case Object:
    case Array:
      e = e == null ? e : JSON.stringify(e);
  }
  return e;
}, fromAttribute(e, t) {
  let r = e;
  switch (t) {
    case Boolean:
      r = e !== null;
      break;
    case Number:
      r = e === null ? null : Number(e);
      break;
    case Object:
    case Array:
      try {
        r = JSON.parse(e);
      } catch {
        r = null;
      }
  }
  return r;
} }, fo = (e, t) => t !== e && (t == t || e == e), Bt = { attribute: !0, type: String, converter: $r, reflect: !1, hasChanged: fo }, Er = "finalized";
let We = class extends HTMLElement {
  constructor() {
    super(), this._$Ei = /* @__PURE__ */ new Map(), this.isUpdatePending = !1, this.hasUpdated = !1, this._$El = null, this._$Eu();
  }
  static addInitializer(t) {
    var r;
    this.finalize(), ((r = this.h) !== null && r !== void 0 ? r : this.h = []).push(t);
  }
  static get observedAttributes() {
    this.finalize();
    const t = [];
    return this.elementProperties.forEach(((r, o) => {
      const n = this._$Ep(o, r);
      n !== void 0 && (this._$Ev.set(n, o), t.push(n));
    })), t;
  }
  static createProperty(t, r = Bt) {
    if (r.state && (r.attribute = !1), this.finalize(), this.elementProperties.set(t, r), !r.noAccessor && !this.prototype.hasOwnProperty(t)) {
      const o = typeof t == "symbol" ? /* @__PURE__ */ Symbol() : "__" + t, n = this.getPropertyDescriptor(t, o, r);
      n !== void 0 && Object.defineProperty(this.prototype, t, n);
    }
  }
  static getPropertyDescriptor(t, r, o) {
    return { get() {
      return this[r];
    }, set(n) {
      const i = this[t];
      this[r] = n, this.requestUpdate(t, i, o);
    }, configurable: !0, enumerable: !0 };
  }
  static getPropertyOptions(t) {
    return this.elementProperties.get(t) || Bt;
  }
  static finalize() {
    if (this.hasOwnProperty(Er)) return !1;
    this[Er] = !0;
    const t = Object.getPrototypeOf(this);
    if (t.finalize(), t.h !== void 0 && (this.h = [...t.h]), this.elementProperties = new Map(t.elementProperties), this._$Ev = /* @__PURE__ */ new Map(), this.hasOwnProperty("properties")) {
      const r = this.properties, o = [...Object.getOwnPropertyNames(r), ...Object.getOwnPropertySymbols(r)];
      for (const n of o) this.createProperty(n, r[n]);
    }
    return this.elementStyles = this.finalizeStyles(this.styles), !0;
  }
  static finalizeStyles(t) {
    const r = [];
    if (Array.isArray(t)) {
      const o = new Set(t.flat(1 / 0).reverse());
      for (const n of o) r.unshift(pn(n));
    } else t !== void 0 && r.push(pn(t));
    return r;
  }
  static _$Ep(t, r) {
    const o = r.attribute;
    return o === !1 ? void 0 : typeof o == "string" ? o : typeof t == "string" ? t.toLowerCase() : void 0;
  }
  _$Eu() {
    var t;
    this._$E_ = new Promise(((r) => this.enableUpdating = r)), this._$AL = /* @__PURE__ */ new Map(), this._$Eg(), this.requestUpdate(), (t = this.constructor.h) === null || t === void 0 || t.forEach(((r) => r(this)));
  }
  addController(t) {
    var r, o;
    ((r = this._$ES) !== null && r !== void 0 ? r : this._$ES = []).push(t), this.renderRoot !== void 0 && this.isConnected && ((o = t.hostConnected) === null || o === void 0 || o.call(t));
  }
  removeController(t) {
    var r;
    (r = this._$ES) === null || r === void 0 || r.splice(this._$ES.indexOf(t) >>> 0, 1);
  }
  _$Eg() {
    this.constructor.elementProperties.forEach(((t, r) => {
      this.hasOwnProperty(r) && (this._$Ei.set(r, this[r]), delete this[r]);
    }));
  }
  createRenderRoot() {
    var t;
    const r = (t = this.shadowRoot) !== null && t !== void 0 ? t : this.attachShadow(this.constructor.shadowRootOptions);
    return hi(r, this.constructor.elementStyles), r;
  }
  connectedCallback() {
    var t;
    this.renderRoot === void 0 && (this.renderRoot = this.createRenderRoot()), this.enableUpdating(!0), (t = this._$ES) === null || t === void 0 || t.forEach(((r) => {
      var o;
      return (o = r.hostConnected) === null || o === void 0 ? void 0 : o.call(r);
    }));
  }
  enableUpdating(t) {
  }
  disconnectedCallback() {
    var t;
    (t = this._$ES) === null || t === void 0 || t.forEach(((r) => {
      var o;
      return (o = r.hostDisconnected) === null || o === void 0 ? void 0 : o.call(r);
    }));
  }
  attributeChangedCallback(t, r, o) {
    this._$AK(t, o);
  }
  _$EO(t, r, o = Bt) {
    var n;
    const i = this.constructor._$Ep(t, o);
    if (i !== void 0 && o.reflect === !0) {
      const s = (((n = o.converter) === null || n === void 0 ? void 0 : n.toAttribute) !== void 0 ? o.converter : $r).toAttribute(r, o.type);
      this._$El = t, s == null ? this.removeAttribute(i) : this.setAttribute(i, s), this._$El = null;
    }
  }
  _$AK(t, r) {
    var o;
    const n = this.constructor, i = n._$Ev.get(t);
    if (i !== void 0 && this._$El !== i) {
      const s = n.getPropertyOptions(i), a = typeof s.converter == "function" ? { fromAttribute: s.converter } : ((o = s.converter) === null || o === void 0 ? void 0 : o.fromAttribute) !== void 0 ? s.converter : $r;
      this._$El = i, this[i] = a.fromAttribute(r, s.type), this._$El = null;
    }
  }
  requestUpdate(t, r, o) {
    let n = !0;
    t !== void 0 && (((o = o || this.constructor.getPropertyOptions(t)).hasChanged || fo)(this[t], r) ? (this._$AL.has(t) || this._$AL.set(t, r), o.reflect === !0 && this._$El !== t && (this._$EC === void 0 && (this._$EC = /* @__PURE__ */ new Map()), this._$EC.set(t, o))) : n = !1), !this.isUpdatePending && n && (this._$E_ = this._$Ej());
  }
  async _$Ej() {
    this.isUpdatePending = !0;
    try {
      await this._$E_;
    } catch (r) {
      Promise.reject(r);
    }
    const t = this.scheduleUpdate();
    return t != null && await t, !this.isUpdatePending;
  }
  scheduleUpdate() {
    return this.performUpdate();
  }
  performUpdate() {
    var t;
    if (!this.isUpdatePending) return;
    this.hasUpdated, this._$Ei && (this._$Ei.forEach(((n, i) => this[i] = n)), this._$Ei = void 0);
    let r = !1;
    const o = this._$AL;
    try {
      r = this.shouldUpdate(o), r ? (this.willUpdate(o), (t = this._$ES) === null || t === void 0 || t.forEach(((n) => {
        var i;
        return (i = n.hostUpdate) === null || i === void 0 ? void 0 : i.call(n);
      })), this.update(o)) : this._$Ek();
    } catch (n) {
      throw r = !1, this._$Ek(), n;
    }
    r && this._$AE(o);
  }
  willUpdate(t) {
  }
  _$AE(t) {
    var r;
    (r = this._$ES) === null || r === void 0 || r.forEach(((o) => {
      var n;
      return (n = o.hostUpdated) === null || n === void 0 ? void 0 : n.call(o);
    })), this.hasUpdated || (this.hasUpdated = !0, this.firstUpdated(t)), this.updated(t);
  }
  _$Ek() {
    this._$AL = /* @__PURE__ */ new Map(), this.isUpdatePending = !1;
  }
  get updateComplete() {
    return this.getUpdateComplete();
  }
  getUpdateComplete() {
    return this._$E_;
  }
  shouldUpdate(t) {
    return !0;
  }
  update(t) {
    this._$EC !== void 0 && (this._$EC.forEach(((r, o) => this._$EO(o, this[o], r))), this._$EC = void 0), this._$Ek();
  }
  updated(t) {
  }
  firstUpdated(t) {
  }
};
We[Er] = !0, We.elementProperties = /* @__PURE__ */ new Map(), We.elementStyles = [], We.shadowRootOptions = { mode: "open" }, wn?.({ ReactiveElement: We }), ((Nt = bt.reactiveElementVersions) !== null && Nt !== void 0 ? Nt : bt.reactiveElementVersions = []).push("1.6.3");
var Ut;
const yt = window, ke = yt.trustedTypes, vn = ke ? ke.createPolicy("lit-html", { createHTML: (e) => e }) : void 0, Ar = "$lit$", de = `lit$${(Math.random() + "").slice(9)}$`, po = "?" + de, fi = `<${po}>`, Ee = document, et = () => Ee.createComment(""), tt = (e) => e === null || typeof e != "object" && typeof e != "function", go = Array.isArray, pi = (e) => go(e) || typeof e?.[Symbol.iterator] == "function", kt = `[ 	
\f\r]`, Qe = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, bn = /-->/g, yn = />/g, _e = RegExp(`>|${kt}(?:([^\\s"'>=/]+)(${kt}*=${kt}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g"), _n = /'/g, xn = /"/g, wo = /^(?:script|style|textarea|title)$/i, vo = (e) => (t, ...r) => ({ _$litType$: e, strings: t, values: r }), y = vo(1), j = vo(2), Ae = /* @__PURE__ */ Symbol.for("lit-noChange"), V = /* @__PURE__ */ Symbol.for("lit-nothing"), Cn = /* @__PURE__ */ new WeakMap(), xe = Ee.createTreeWalker(Ee, 129, null, !1);
function bo(e, t) {
  if (!Array.isArray(e) || !e.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return vn !== void 0 ? vn.createHTML(t) : t;
}
const gi = (e, t) => {
  const r = e.length - 1, o = [];
  let n, i = t === 2 ? "<svg>" : "", s = Qe;
  for (let a = 0; a < r; a++) {
    const l = e[a];
    let c, m, g = -1, h = 0;
    for (; h < l.length && (s.lastIndex = h, m = s.exec(l), m !== null); ) h = s.lastIndex, s === Qe ? m[1] === "!--" ? s = bn : m[1] !== void 0 ? s = yn : m[2] !== void 0 ? (wo.test(m[2]) && (n = RegExp("</" + m[2], "g")), s = _e) : m[3] !== void 0 && (s = _e) : s === _e ? m[0] === ">" ? (s = n ?? Qe, g = -1) : m[1] === void 0 ? g = -2 : (g = s.lastIndex - m[2].length, c = m[1], s = m[3] === void 0 ? _e : m[3] === '"' ? xn : _n) : s === xn || s === _n ? s = _e : s === bn || s === yn ? s = Qe : (s = _e, n = void 0);
    const f = s === _e && e[a + 1].startsWith("/>") ? " " : "";
    i += s === Qe ? l + fi : g >= 0 ? (o.push(c), l.slice(0, g) + Ar + l.slice(g) + de + f) : l + de + (g === -2 ? (o.push(void 0), a) : f);
  }
  return [bo(e, i + (e[r] || "<?>") + (t === 2 ? "</svg>" : "")), o];
};
class rt {
  constructor({ strings: t, _$litType$: r }, o) {
    let n;
    this.parts = [];
    let i = 0, s = 0;
    const a = t.length - 1, l = this.parts, [c, m] = gi(t, r);
    if (this.el = rt.createElement(c, o), xe.currentNode = this.el.content, r === 2) {
      const g = this.el.content, h = g.firstChild;
      h.remove(), g.append(...h.childNodes);
    }
    for (; (n = xe.nextNode()) !== null && l.length < a; ) {
      if (n.nodeType === 1) {
        if (n.hasAttributes()) {
          const g = [];
          for (const h of n.getAttributeNames()) if (h.endsWith(Ar) || h.startsWith(de)) {
            const f = m[s++];
            if (g.push(h), f !== void 0) {
              const b = n.getAttribute(f.toLowerCase() + Ar).split(de), w = /([.?@])?(.*)/.exec(f);
              l.push({ type: 1, index: i, name: w[2], strings: b, ctor: w[1] === "." ? vi : w[1] === "?" ? yi : w[1] === "@" ? _i : Pt });
            } else l.push({ type: 6, index: i });
          }
          for (const h of g) n.removeAttribute(h);
        }
        if (wo.test(n.tagName)) {
          const g = n.textContent.split(de), h = g.length - 1;
          if (h > 0) {
            n.textContent = ke ? ke.emptyScript : "";
            for (let f = 0; f < h; f++) n.append(g[f], et()), xe.nextNode(), l.push({ type: 2, index: ++i });
            n.append(g[h], et());
          }
        }
      } else if (n.nodeType === 8) if (n.data === po) l.push({ type: 2, index: i });
      else {
        let g = -1;
        for (; (g = n.data.indexOf(de, g + 1)) !== -1; ) l.push({ type: 7, index: i }), g += de.length - 1;
      }
      i++;
    }
  }
  static createElement(t, r) {
    const o = Ee.createElement("template");
    return o.innerHTML = t, o;
  }
}
function je(e, t, r = e, o) {
  var n, i, s, a;
  if (t === Ae) return t;
  let l = o !== void 0 ? (n = r._$Co) === null || n === void 0 ? void 0 : n[o] : r._$Cl;
  const c = tt(t) ? void 0 : t._$litDirective$;
  return l?.constructor !== c && ((i = l?._$AO) === null || i === void 0 || i.call(l, !1), c === void 0 ? l = void 0 : (l = new c(e), l._$AT(e, r, o)), o !== void 0 ? ((s = (a = r)._$Co) !== null && s !== void 0 ? s : a._$Co = [])[o] = l : r._$Cl = l), l !== void 0 && (t = je(e, l._$AS(e, t.values), l, o)), t;
}
class wi {
  constructor(t, r) {
    this._$AV = [], this._$AN = void 0, this._$AD = t, this._$AM = r;
  }
  get parentNode() {
    return this._$AM.parentNode;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  u(t) {
    var r;
    const { el: { content: o }, parts: n } = this._$AD, i = ((r = t?.creationScope) !== null && r !== void 0 ? r : Ee).importNode(o, !0);
    xe.currentNode = i;
    let s = xe.nextNode(), a = 0, l = 0, c = n[0];
    for (; c !== void 0; ) {
      if (a === c.index) {
        let m;
        c.type === 2 ? m = new at(s, s.nextSibling, this, t) : c.type === 1 ? m = new c.ctor(s, c.name, c.strings, this, t) : c.type === 6 && (m = new xi(s, this, t)), this._$AV.push(m), c = n[++l];
      }
      a !== c?.index && (s = xe.nextNode(), a++);
    }
    return xe.currentNode = Ee, i;
  }
  v(t) {
    let r = 0;
    for (const o of this._$AV) o !== void 0 && (o.strings !== void 0 ? (o._$AI(t, o, r), r += o.strings.length - 2) : o._$AI(t[r])), r++;
  }
}
class at {
  constructor(t, r, o, n) {
    var i;
    this.type = 2, this._$AH = V, this._$AN = void 0, this._$AA = t, this._$AB = r, this._$AM = o, this.options = n, this._$Cp = (i = n?.isConnected) === null || i === void 0 || i;
  }
  get _$AU() {
    var t, r;
    return (r = (t = this._$AM) === null || t === void 0 ? void 0 : t._$AU) !== null && r !== void 0 ? r : this._$Cp;
  }
  get parentNode() {
    let t = this._$AA.parentNode;
    const r = this._$AM;
    return r !== void 0 && t?.nodeType === 11 && (t = r.parentNode), t;
  }
  get startNode() {
    return this._$AA;
  }
  get endNode() {
    return this._$AB;
  }
  _$AI(t, r = this) {
    t = je(this, t, r), tt(t) ? t === V || t == null || t === "" ? (this._$AH !== V && this._$AR(), this._$AH = V) : t !== this._$AH && t !== Ae && this._(t) : t._$litType$ !== void 0 ? this.g(t) : t.nodeType !== void 0 ? this.$(t) : pi(t) ? this.T(t) : this._(t);
  }
  k(t) {
    return this._$AA.parentNode.insertBefore(t, this._$AB);
  }
  $(t) {
    this._$AH !== t && (this._$AR(), this._$AH = this.k(t));
  }
  _(t) {
    this._$AH !== V && tt(this._$AH) ? this._$AA.nextSibling.data = t : this.$(Ee.createTextNode(t)), this._$AH = t;
  }
  g(t) {
    var r;
    const { values: o, _$litType$: n } = t, i = typeof n == "number" ? this._$AC(t) : (n.el === void 0 && (n.el = rt.createElement(bo(n.h, n.h[0]), this.options)), n);
    if (((r = this._$AH) === null || r === void 0 ? void 0 : r._$AD) === i) this._$AH.v(o);
    else {
      const s = new wi(i, this), a = s.u(this.options);
      s.v(o), this.$(a), this._$AH = s;
    }
  }
  _$AC(t) {
    let r = Cn.get(t.strings);
    return r === void 0 && Cn.set(t.strings, r = new rt(t)), r;
  }
  T(t) {
    go(this._$AH) || (this._$AH = [], this._$AR());
    const r = this._$AH;
    let o, n = 0;
    for (const i of t) n === r.length ? r.push(o = new at(this.k(et()), this.k(et()), this, this.options)) : o = r[n], o._$AI(i), n++;
    n < r.length && (this._$AR(o && o._$AB.nextSibling, n), r.length = n);
  }
  _$AR(t = this._$AA.nextSibling, r) {
    var o;
    for ((o = this._$AP) === null || o === void 0 || o.call(this, !1, !0, r); t && t !== this._$AB; ) {
      const n = t.nextSibling;
      t.remove(), t = n;
    }
  }
  setConnected(t) {
    var r;
    this._$AM === void 0 && (this._$Cp = t, (r = this._$AP) === null || r === void 0 || r.call(this, t));
  }
}
class Pt {
  constructor(t, r, o, n, i) {
    this.type = 1, this._$AH = V, this._$AN = void 0, this.element = t, this.name = r, this._$AM = n, this.options = i, o.length > 2 || o[0] !== "" || o[1] !== "" ? (this._$AH = Array(o.length - 1).fill(new String()), this.strings = o) : this._$AH = V;
  }
  get tagName() {
    return this.element.tagName;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AI(t, r = this, o, n) {
    const i = this.strings;
    let s = !1;
    if (i === void 0) t = je(this, t, r, 0), s = !tt(t) || t !== this._$AH && t !== Ae, s && (this._$AH = t);
    else {
      const a = t;
      let l, c;
      for (t = i[0], l = 0; l < i.length - 1; l++) c = je(this, a[o + l], r, l), c === Ae && (c = this._$AH[l]), s || (s = !tt(c) || c !== this._$AH[l]), c === V ? t = V : t !== V && (t += (c ?? "") + i[l + 1]), this._$AH[l] = c;
    }
    s && !n && this.j(t);
  }
  j(t) {
    t === V ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, t ?? "");
  }
}
class vi extends Pt {
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(t) {
    this.element[this.name] = t === V ? void 0 : t;
  }
}
const bi = ke ? ke.emptyScript : "";
class yi extends Pt {
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(t) {
    t && t !== V ? this.element.setAttribute(this.name, bi) : this.element.removeAttribute(this.name);
  }
}
class _i extends Pt {
  constructor(t, r, o, n, i) {
    super(t, r, o, n, i), this.type = 5;
  }
  _$AI(t, r = this) {
    var o;
    if ((t = (o = je(this, t, r, 0)) !== null && o !== void 0 ? o : V) === Ae) return;
    const n = this._$AH, i = t === V && n !== V || t.capture !== n.capture || t.once !== n.once || t.passive !== n.passive, s = t !== V && (n === V || i);
    i && this.element.removeEventListener(this.name, this, n), s && this.element.addEventListener(this.name, this, t), this._$AH = t;
  }
  handleEvent(t) {
    var r, o;
    typeof this._$AH == "function" ? this._$AH.call((o = (r = this.options) === null || r === void 0 ? void 0 : r.host) !== null && o !== void 0 ? o : this.element, t) : this._$AH.handleEvent(t);
  }
}
class xi {
  constructor(t, r, o) {
    this.element = t, this.type = 6, this._$AN = void 0, this._$AM = r, this.options = o;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AI(t) {
    je(this, t);
  }
}
const $n = yt.litHtmlPolyfillSupport;
$n?.(rt, at), ((Ut = yt.litHtmlVersions) !== null && Ut !== void 0 ? Ut : yt.litHtmlVersions = []).push("2.8.0");
const Ci = (e, t, r) => {
  var o, n;
  const i = (o = r?.renderBefore) !== null && o !== void 0 ? o : t;
  let s = i._$litPart$;
  if (s === void 0) {
    const a = (n = r?.renderBefore) !== null && n !== void 0 ? n : null;
    i._$litPart$ = s = new at(t.insertBefore(et(), a), a, void 0, r ?? {});
  }
  return s._$AI(e), s;
};
var jt, Ht;
class L extends We {
  constructor() {
    super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
  }
  createRenderRoot() {
    var t, r;
    const o = super.createRenderRoot();
    return (t = (r = this.renderOptions).renderBefore) !== null && t !== void 0 || (r.renderBefore = o.firstChild), o;
  }
  update(t) {
    const r = this.render();
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(t), this._$Do = Ci(r, this.renderRoot, this.renderOptions);
  }
  connectedCallback() {
    var t;
    super.connectedCallback(), (t = this._$Do) === null || t === void 0 || t.setConnected(!0);
  }
  disconnectedCallback() {
    var t;
    super.disconnectedCallback(), (t = this._$Do) === null || t === void 0 || t.setConnected(!1);
  }
  render() {
    return Ae;
  }
}
L.finalized = !0, L._$litElement$ = !0, (jt = globalThis.litElementHydrateSupport) === null || jt === void 0 || jt.call(globalThis, { LitElement: L });
const En = globalThis.litElementPolyfillSupport;
En?.({ LitElement: L });
((Ht = globalThis.litElementVersions) !== null && Ht !== void 0 ? Ht : globalThis.litElementVersions = []).push("3.3.3");
const N = (e) => (t) => typeof t == "function" ? ((r, o) => (customElements.define(r, o), o))(e, t) : ((r, o) => {
  const { kind: n, elements: i } = o;
  return { kind: n, elements: i, finisher(s) {
    customElements.define(r, s);
  } };
})(e, t);
const $i = (e, t) => t.kind === "method" && t.descriptor && !("value" in t.descriptor) ? { ...t, finisher(r) {
  r.createProperty(t.key, e);
} } : { kind: "field", key: /* @__PURE__ */ Symbol(), placement: "own", descriptor: {}, originalKey: t.key, initializer() {
  typeof t.initializer == "function" && (this[t.key] = t.initializer.call(this));
}, finisher(r) {
  r.createProperty(t.key, e);
} }, Ei = (e, t, r) => {
  t.constructor.createProperty(r, e);
};
function R(e) {
  return (t, r) => r !== void 0 ? Ei(e, t, r) : $i(e, t);
}
function Y(e) {
  return R({ ...e, state: !0 });
}
var Vt;
((Vt = window.HTMLSlotElement) === null || Vt === void 0 ? void 0 : Vt.prototype.assignedElements) != null;
const Ai = { ATTRIBUTE: 1 }, Ii = (e) => (...t) => ({ _$litDirective$: e, values: t });
class Oi {
  constructor(t) {
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AT(t, r, o) {
    this._$Ct = t, this._$AM = r, this._$Ci = o;
  }
  _$AS(t, r) {
    return this.update(t, r);
  }
  update(t, r) {
    return this.render(...r);
  }
}
const ae = Ii(class extends Oi {
  constructor(e) {
    var t;
    if (super(e), e.type !== Ai.ATTRIBUTE || e.name !== "class" || ((t = e.strings) === null || t === void 0 ? void 0 : t.length) > 2) throw Error("`classMap()` can only be used in the `class` attribute and must be the only part in the attribute.");
  }
  render(e) {
    return " " + Object.keys(e).filter(((t) => e[t])).join(" ") + " ";
  }
  update(e, [t]) {
    var r, o;
    if (this.it === void 0) {
      this.it = /* @__PURE__ */ new Set(), e.strings !== void 0 && (this.nt = new Set(e.strings.join(" ").split(/\s/).filter(((i) => i !== ""))));
      for (const i in t) t[i] && !(!((r = this.nt) === null || r === void 0) && r.has(i)) && this.it.add(i);
      return this.render(t);
    }
    const n = e.element.classList;
    this.it.forEach(((i) => {
      i in t || (n.remove(i), this.it.delete(i));
    }));
    for (const i in t) {
      const s = !!t[i];
      s === this.it.has(i) || !((o = this.nt) === null || o === void 0) && o.has(i) || (s ? (n.add(i), this.it.add(i)) : (n.remove(i), this.it.delete(i)));
    }
    return Ae;
  }
});
function Pi(e, t) {
  e.indexOf(t) === -1 && e.push(t);
}
const yo = (e, t, r) => Math.min(Math.max(r, e), t), J = {
  duration: 0.3,
  delay: 0,
  endDelay: 0,
  repeat: 0,
  easing: "ease"
}, _t = (e) => typeof e == "number", Be = (e) => Array.isArray(e) && !_t(e[0]), Mi = (e, t, r) => {
  const o = t - e;
  return ((r - e) % o + o) % o + e;
};
function Ti(e, t) {
  return Be(e) ? e[Mi(0, e.length, t)] : e;
}
const _o = (e, t, r) => -r * e + r * t + e, xo = () => {
}, he = (e) => e, Kr = (e, t, r) => t - e === 0 ? 1 : (r - e) / (t - e);
function Co(e, t) {
  const r = e[e.length - 1];
  for (let o = 1; o <= t; o++) {
    const n = Kr(0, t, o);
    e.push(_o(r, 1, n));
  }
}
function Si(e) {
  const t = [0];
  return Co(t, e - 1), t;
}
function Ri(e, t = Si(e.length), r = he) {
  const o = e.length, n = o - t.length;
  return n > 0 && Co(t, n), (i) => {
    let s = 0;
    for (; s < o - 2 && !(i < t[s + 1]); s++)
      ;
    let a = yo(0, 1, Kr(t[s], t[s + 1], i));
    return a = Ti(r, s)(a), _o(e[s], e[s + 1], a);
  };
}
const $o = (e) => Array.isArray(e) && _t(e[0]), Ir = (e) => typeof e == "object" && !!e.createAnimation, He = (e) => typeof e == "function", Li = (e) => typeof e == "string", Xe = {
  ms: (e) => e * 1e3,
  s: (e) => e / 1e3
}, Eo = (e, t, r) => (((1 - 3 * r + 3 * t) * e + (3 * r - 6 * t)) * e + 3 * t) * e, Di = 1e-7, Wi = 12;
function Ni(e, t, r, o, n) {
  let i, s, a = 0;
  do
    s = t + (r - t) / 2, i = Eo(s, o, n) - e, i > 0 ? r = s : t = s;
  while (Math.abs(i) > Di && ++a < Wi);
  return s;
}
function Je(e, t, r, o) {
  if (e === t && r === o)
    return he;
  const n = (i) => Ni(i, 0, 1, e, r);
  return (i) => i === 0 || i === 1 ? i : Eo(n(i), t, o);
}
const Bi = (e, t = "end") => (r) => {
  r = t === "end" ? Math.min(r, 0.999) : Math.max(r, 1e-3);
  const o = r * e, n = t === "end" ? Math.floor(o) : Math.ceil(o);
  return yo(0, 1, n / e);
}, Ui = {
  ease: Je(0.25, 0.1, 0.25, 1),
  "ease-in": Je(0.42, 0, 1, 1),
  "ease-in-out": Je(0.42, 0, 0.58, 1),
  "ease-out": Je(0, 0, 0.58, 1)
}, ki = /\((.*?)\)/;
function An(e) {
  if (He(e))
    return e;
  if ($o(e))
    return Je(...e);
  const t = Ui[e];
  if (t)
    return t;
  if (e.startsWith("steps")) {
    const r = ki.exec(e);
    if (r) {
      const o = r[1].split(",");
      return Bi(parseFloat(o[0]), o[1].trim());
    }
  }
  return he;
}
class Ao {
  constructor(t, r = [0, 1], { easing: o, duration: n = J.duration, delay: i = J.delay, endDelay: s = J.endDelay, repeat: a = J.repeat, offset: l, direction: c = "normal", autoplay: m = !0 } = {}) {
    if (this.startTime = null, this.rate = 1, this.t = 0, this.cancelTimestamp = null, this.easing = he, this.duration = 0, this.totalDuration = 0, this.repeat = 0, this.playState = "idle", this.finished = new Promise((h, f) => {
      this.resolve = h, this.reject = f;
    }), o = o || J.easing, Ir(o)) {
      const h = o.createAnimation(r);
      o = h.easing, r = h.keyframes || r, n = h.duration || n;
    }
    this.repeat = a, this.easing = Be(o) ? he : An(o), this.updateDuration(n);
    const g = Ri(r, l, Be(o) ? o.map(An) : he);
    this.tick = (h) => {
      var f;
      i = i;
      let b = 0;
      this.pauseTime !== void 0 ? b = this.pauseTime : b = (h - this.startTime) * this.rate, this.t = b, b /= 1e3, b = Math.max(b - i, 0), this.playState === "finished" && this.pauseTime === void 0 && (b = this.totalDuration);
      const w = b / this.duration;
      let T = Math.floor(w), p = w % 1;
      !p && w >= 1 && (p = 1), p === 1 && T--;
      const O = T % 2;
      (c === "reverse" || c === "alternate" && O || c === "alternate-reverse" && !O) && (p = 1 - p);
      const $ = b >= this.totalDuration ? 1 : Math.min(p, 1), A = g(this.easing($));
      t(A), this.pauseTime === void 0 && (this.playState === "finished" || b >= this.totalDuration + s) ? (this.playState = "finished", (f = this.resolve) === null || f === void 0 || f.call(this, A)) : this.playState !== "idle" && (this.frameRequestId = requestAnimationFrame(this.tick));
    }, m && this.play();
  }
  play() {
    const t = performance.now();
    this.playState = "running", this.pauseTime !== void 0 ? this.startTime = t - this.pauseTime : this.startTime || (this.startTime = t), this.cancelTimestamp = this.startTime, this.pauseTime = void 0, this.frameRequestId = requestAnimationFrame(this.tick);
  }
  pause() {
    this.playState = "paused", this.pauseTime = this.t;
  }
  finish() {
    this.playState = "finished", this.tick(0);
  }
  stop() {
    var t;
    this.playState = "idle", this.frameRequestId !== void 0 && cancelAnimationFrame(this.frameRequestId), (t = this.reject) === null || t === void 0 || t.call(this, !1);
  }
  cancel() {
    this.stop(), this.tick(this.cancelTimestamp);
  }
  reverse() {
    this.rate *= -1;
  }
  commitStyles() {
  }
  updateDuration(t) {
    this.duration = t, this.totalDuration = t * (this.repeat + 1);
  }
  get currentTime() {
    return this.t;
  }
  set currentTime(t) {
    this.pauseTime !== void 0 || this.rate === 0 ? this.pauseTime = t : this.startTime = performance.now() - t / this.rate;
  }
  get playbackRate() {
    return this.rate;
  }
  set playbackRate(t) {
    this.rate = t;
  }
}
var Or = function() {
};
process.env.NODE_ENV !== "production" && (Or = function(e, t) {
  if (!e)
    throw new Error(t);
});
class ji {
  setAnimation(t) {
    this.animation = t, t?.finished.then(() => this.clearAnimation()).catch(() => {
    });
  }
  clearAnimation() {
    this.animation = this.generator = void 0;
  }
}
const zt = /* @__PURE__ */ new WeakMap();
function Io(e) {
  return zt.has(e) || zt.set(e, {
    transforms: [],
    values: /* @__PURE__ */ new Map()
  }), zt.get(e);
}
function Hi(e, t) {
  return e.has(t) || e.set(t, new ji()), e.get(t);
}
const Vi = ["", "X", "Y", "Z"], zi = ["translate", "scale", "rotate", "skew"], xt = {
  x: "translateX",
  y: "translateY",
  z: "translateZ"
}, In = {
  syntax: "<angle>",
  initialValue: "0deg",
  toDefaultUnit: (e) => e + "deg"
}, Fi = {
  translate: {
    syntax: "<length-percentage>",
    initialValue: "0px",
    toDefaultUnit: (e) => e + "px"
  },
  rotate: In,
  scale: {
    syntax: "<number>",
    initialValue: 1,
    toDefaultUnit: he
  },
  skew: In
}, nt = /* @__PURE__ */ new Map(), Yr = (e) => `--motion-${e}`, Ct = ["x", "y", "z"];
zi.forEach((e) => {
  Vi.forEach((t) => {
    Ct.push(e + t), nt.set(Yr(e + t), Fi[e]);
  });
});
const qi = (e, t) => Ct.indexOf(e) - Ct.indexOf(t), Zi = new Set(Ct), Oo = (e) => Zi.has(e), Ki = (e, t) => {
  xt[t] && (t = xt[t]);
  const { transforms: r } = Io(e);
  Pi(r, t), e.style.transform = Yi(r);
}, Yi = (e) => e.sort(qi).reduce(Qi, "").trim(), Qi = (e, t) => `${e} ${t}(var(${Yr(t)}))`, Pr = (e) => e.startsWith("--"), On = /* @__PURE__ */ new Set();
function Gi(e) {
  if (!On.has(e)) {
    On.add(e);
    try {
      const { syntax: t, initialValue: r } = nt.has(e) ? nt.get(e) : {};
      CSS.registerProperty({
        name: e,
        inherits: !1,
        syntax: t,
        initialValue: r
      });
    } catch {
    }
  }
}
const Ft = (e, t) => document.createElement("div").animate(e, t), Pn = {
  cssRegisterProperty: () => typeof CSS < "u" && Object.hasOwnProperty.call(CSS, "registerProperty"),
  waapi: () => Object.hasOwnProperty.call(Element.prototype, "animate"),
  partialKeyframes: () => {
    try {
      Ft({ opacity: [1] });
    } catch {
      return !1;
    }
    return !0;
  },
  finished: () => !!Ft({ opacity: [0, 1] }, { duration: 1e-3 }).finished,
  linearEasing: () => {
    try {
      Ft({ opacity: 0 }, { easing: "linear(0, 1)" });
    } catch {
      return !1;
    }
    return !0;
  }
}, qt = {}, Ne = {};
for (const e in Pn)
  Ne[e] = () => (qt[e] === void 0 && (qt[e] = Pn[e]()), qt[e]);
const Ji = 0.015, Xi = (e, t) => {
  let r = "";
  const o = Math.round(t / Ji);
  for (let n = 0; n < o; n++)
    r += e(Kr(0, o - 1, n)) + ", ";
  return r.substring(0, r.length - 2);
}, Mn = (e, t) => He(e) ? Ne.linearEasing() ? `linear(${Xi(e, t)})` : J.easing : $o(e) ? es(e) : e, es = ([e, t, r, o]) => `cubic-bezier(${e}, ${t}, ${r}, ${o})`;
function ts(e, t) {
  for (let r = 0; r < e.length; r++)
    e[r] === null && (e[r] = r ? e[r - 1] : t());
  return e;
}
const rs = (e) => Array.isArray(e) ? e : [e];
function Mr(e) {
  return xt[e] && (e = xt[e]), Oo(e) ? Yr(e) : e;
}
const pt = {
  get: (e, t) => {
    t = Mr(t);
    let r = Pr(t) ? e.style.getPropertyValue(t) : getComputedStyle(e)[t];
    if (!r && r !== 0) {
      const o = nt.get(t);
      o && (r = o.initialValue);
    }
    return r;
  },
  set: (e, t, r) => {
    t = Mr(t), Pr(t) ? e.style.setProperty(t, r) : e.style[t] = r;
  }
};
function Po(e, t = !0) {
  if (!(!e || e.playState === "finished"))
    try {
      e.stop ? e.stop() : (t && e.commitStyles(), e.cancel());
    } catch {
    }
}
function ns(e, t) {
  var r;
  let o = t?.toDefaultUnit || he;
  const n = e[e.length - 1];
  if (Li(n)) {
    const i = ((r = n.match(/(-?[\d.]+)([a-z%]*)/)) === null || r === void 0 ? void 0 : r[2]) || "";
    i && (o = (s) => s + i);
  }
  return o;
}
function os() {
  return window.__MOTION_DEV_TOOLS_RECORD;
}
function is(e, t, r, o = {}, n) {
  const i = os(), s = o.record !== !1 && i;
  let a, { duration: l = J.duration, delay: c = J.delay, endDelay: m = J.endDelay, repeat: g = J.repeat, easing: h = J.easing, persist: f = !1, direction: b, offset: w, allowWebkitAcceleration: T = !1, autoplay: p = !0 } = o;
  const O = Io(e), $ = Oo(t);
  let A = Ne.waapi();
  $ && Ki(e, t);
  const W = Mr(t), I = Hi(O.values, W), E = nt.get(W);
  return Po(I.animation, !(Ir(h) && I.generator) && o.record !== !1), () => {
    const P = () => {
      var d, _;
      return (_ = (d = pt.get(e, W)) !== null && d !== void 0 ? d : E?.initialValue) !== null && _ !== void 0 ? _ : 0;
    };
    let u = ts(rs(r), P);
    const v = ns(u, E);
    if (Ir(h)) {
      const d = h.createAnimation(u, t !== "opacity", P, W, I);
      h = d.easing, u = d.keyframes || u, l = d.duration || l;
    }
    if (Pr(W) && (Ne.cssRegisterProperty() ? Gi(W) : A = !1), $ && !Ne.linearEasing() && (He(h) || Be(h) && h.some(He)) && (A = !1), A) {
      E && (u = u.map((C) => _t(C) ? E.toDefaultUnit(C) : C)), u.length === 1 && (!Ne.partialKeyframes() || s) && u.unshift(P());
      const d = {
        delay: Xe.ms(c),
        duration: Xe.ms(l),
        endDelay: Xe.ms(m),
        easing: Be(h) ? void 0 : Mn(h, l),
        direction: b,
        iterations: g + 1,
        fill: "both"
      };
      a = e.animate({
        [W]: u,
        offset: w,
        easing: Be(h) ? h.map((C) => Mn(C, l)) : void 0
      }, d), a.finished || (a.finished = new Promise((C, M) => {
        a.onfinish = C, a.oncancel = M;
      }));
      const _ = u[u.length - 1];
      a.finished.then(() => {
        f || (pt.set(e, W, _), a.cancel());
      }).catch(xo), T || (a.playbackRate = 1.000001);
    } else if (n && $)
      u = u.map((d) => typeof d == "string" ? parseFloat(d) : d), u.length === 1 && u.unshift(parseFloat(P())), a = new n((d) => {
        pt.set(e, W, v ? v(d) : d);
      }, u, Object.assign(Object.assign({}, o), {
        duration: l,
        easing: h
      }));
    else {
      const d = u[u.length - 1];
      pt.set(e, W, E && _t(d) ? E.toDefaultUnit(d) : d);
    }
    return s && i(e, t, u, {
      duration: l,
      delay: c,
      easing: h,
      repeat: g,
      offset: w
    }, "motion-one"), I.setAnimation(a), a && !p && a.pause(), a;
  };
}
const ss = (e, t) => (
  /**
   * TODO: Make test for this
   * Always return a new object otherwise delay is overwritten by results of stagger
   * and this results in no stagger
   */
  e[t] ? Object.assign(Object.assign({}, e), e[t]) : Object.assign({}, e)
);
function as(e, t) {
  return typeof e == "string" ? e = document.querySelectorAll(e) : e instanceof Element && (e = [e]), Array.from(e || []);
}
const ls = (e) => e(), Mo = (e, t, r = J.duration) => new Proxy({
  animations: e.map(ls).filter(Boolean),
  duration: r,
  options: t
}, ds), cs = (e) => e.animations[0], ds = {
  get: (e, t) => {
    const r = cs(e);
    switch (t) {
      case "duration":
        return e.duration;
      case "currentTime":
        return Xe.s(r?.[t] || 0);
      case "playbackRate":
      case "playState":
        return r?.[t];
      case "finished":
        return e.finished || (e.finished = Promise.all(e.animations.map(us)).catch(xo)), e.finished;
      case "stop":
        return () => {
          e.animations.forEach((o) => Po(o));
        };
      case "forEachNative":
        return (o) => {
          e.animations.forEach((n) => o(n, e));
        };
      default:
        return typeof r?.[t] > "u" ? void 0 : () => e.animations.forEach((o) => o[t]());
    }
  },
  set: (e, t, r) => {
    switch (t) {
      case "currentTime":
        r = Xe.ms(r);
      // Fall-through
      case "playbackRate":
        for (let o = 0; o < e.animations.length; o++)
          e.animations[o][t] = r;
        return !0;
    }
    return !1;
  }
}, us = (e) => e.finished;
function hs(e, t, r) {
  return He(e) ? e(t, r) : e;
}
function ms(e) {
  return function(r, o, n = {}) {
    r = as(r);
    const i = r.length;
    Or(!!i, "No valid element provided."), Or(!!o, "No keyframes defined.");
    const s = [];
    for (let a = 0; a < i; a++) {
      const l = r[a];
      for (const c in o) {
        const m = ss(n, c);
        m.delay = hs(m.delay, a, i);
        const g = is(l, c, o[c], m, e);
        s.push(g);
      }
    }
    return Mo(
      s,
      n,
      /**
       * TODO:
       * If easing is set to spring or glide, duration will be dynamically
       * generated. Ideally we would dynamically generate this from
       * animation.effect.getComputedTiming().duration but this isn't
       * supported in iOS13 or our number polyfill. Perhaps it's possible
       * to Proxy animations returned from animateStyle that has duration
       * as a getter.
       */
      n.duration
    );
  };
}
const fs = ms(Ao);
function ps(e, t = {}) {
  return Mo([
    () => {
      const r = new Ao(e, [0, 1], t);
      return r.finished.catch(() => {
      }), r;
    }
  ], t, t.duration);
}
function Ce(e, t, r) {
  return (He(e) ? ps : fs)(e, t, r);
}
const q = (e) => e ?? V;
var De = {}, Zt, Tn;
function gs() {
  return Tn || (Tn = 1, Zt = function() {
    return typeof Promise == "function" && Promise.prototype && Promise.prototype.then;
  }), Zt;
}
var Kt = {}, le = {}, Sn;
function Te() {
  if (Sn) return le;
  Sn = 1;
  let e;
  const t = [
    0,
    // Not used
    26,
    44,
    70,
    100,
    134,
    172,
    196,
    242,
    292,
    346,
    404,
    466,
    532,
    581,
    655,
    733,
    815,
    901,
    991,
    1085,
    1156,
    1258,
    1364,
    1474,
    1588,
    1706,
    1828,
    1921,
    2051,
    2185,
    2323,
    2465,
    2611,
    2761,
    2876,
    3034,
    3196,
    3362,
    3532,
    3706
  ];
  return le.getSymbolSize = function(o) {
    if (!o) throw new Error('"version" cannot be null or undefined');
    if (o < 1 || o > 40) throw new Error('"version" should be in range from 1 to 40');
    return o * 4 + 17;
  }, le.getSymbolTotalCodewords = function(o) {
    return t[o];
  }, le.getBCHDigit = function(r) {
    let o = 0;
    for (; r !== 0; )
      o++, r >>>= 1;
    return o;
  }, le.setToSJISFunction = function(o) {
    if (typeof o != "function")
      throw new Error('"toSJISFunc" is not a valid function.');
    e = o;
  }, le.isKanjiModeEnabled = function() {
    return typeof e < "u";
  }, le.toSJIS = function(o) {
    return e(o);
  }, le;
}
var Yt = {}, Rn;
function Qr() {
  return Rn || (Rn = 1, (function(e) {
    e.L = { bit: 1 }, e.M = { bit: 0 }, e.Q = { bit: 3 }, e.H = { bit: 2 };
    function t(r) {
      if (typeof r != "string")
        throw new Error("Param is not a string");
      switch (r.toLowerCase()) {
        case "l":
        case "low":
          return e.L;
        case "m":
        case "medium":
          return e.M;
        case "q":
        case "quartile":
          return e.Q;
        case "h":
        case "high":
          return e.H;
        default:
          throw new Error("Unknown EC Level: " + r);
      }
    }
    e.isValid = function(o) {
      return o && typeof o.bit < "u" && o.bit >= 0 && o.bit < 4;
    }, e.from = function(o, n) {
      if (e.isValid(o))
        return o;
      try {
        return t(o);
      } catch {
        return n;
      }
    };
  })(Yt)), Yt;
}
var Qt, Ln;
function ws() {
  if (Ln) return Qt;
  Ln = 1;
  function e() {
    this.buffer = [], this.length = 0;
  }
  return e.prototype = {
    get: function(t) {
      const r = Math.floor(t / 8);
      return (this.buffer[r] >>> 7 - t % 8 & 1) === 1;
    },
    put: function(t, r) {
      for (let o = 0; o < r; o++)
        this.putBit((t >>> r - o - 1 & 1) === 1);
    },
    getLengthInBits: function() {
      return this.length;
    },
    putBit: function(t) {
      const r = Math.floor(this.length / 8);
      this.buffer.length <= r && this.buffer.push(0), t && (this.buffer[r] |= 128 >>> this.length % 8), this.length++;
    }
  }, Qt = e, Qt;
}
var Gt, Dn;
function vs() {
  if (Dn) return Gt;
  Dn = 1;
  function e(t) {
    if (!t || t < 1)
      throw new Error("BitMatrix size must be defined and greater than 0");
    this.size = t, this.data = new Uint8Array(t * t), this.reservedBit = new Uint8Array(t * t);
  }
  return e.prototype.set = function(t, r, o, n) {
    const i = t * this.size + r;
    this.data[i] = o, n && (this.reservedBit[i] = !0);
  }, e.prototype.get = function(t, r) {
    return this.data[t * this.size + r];
  }, e.prototype.xor = function(t, r, o) {
    this.data[t * this.size + r] ^= o;
  }, e.prototype.isReserved = function(t, r) {
    return this.reservedBit[t * this.size + r];
  }, Gt = e, Gt;
}
var Jt = {}, Wn;
function bs() {
  return Wn || (Wn = 1, (function(e) {
    const t = Te().getSymbolSize;
    e.getRowColCoords = function(o) {
      if (o === 1) return [];
      const n = Math.floor(o / 7) + 2, i = t(o), s = i === 145 ? 26 : Math.ceil((i - 13) / (2 * n - 2)) * 2, a = [i - 7];
      for (let l = 1; l < n - 1; l++)
        a[l] = a[l - 1] - s;
      return a.push(6), a.reverse();
    }, e.getPositions = function(o) {
      const n = [], i = e.getRowColCoords(o), s = i.length;
      for (let a = 0; a < s; a++)
        for (let l = 0; l < s; l++)
          a === 0 && l === 0 || // top-left
          a === 0 && l === s - 1 || // bottom-left
          a === s - 1 && l === 0 || n.push([i[a], i[l]]);
      return n;
    };
  })(Jt)), Jt;
}
var Xt = {}, Nn;
function ys() {
  if (Nn) return Xt;
  Nn = 1;
  const e = Te().getSymbolSize, t = 7;
  return Xt.getPositions = function(o) {
    const n = e(o);
    return [
      // top-left
      [0, 0],
      // top-right
      [n - t, 0],
      // bottom-left
      [0, n - t]
    ];
  }, Xt;
}
var er = {}, Bn;
function _s() {
  return Bn || (Bn = 1, (function(e) {
    e.Patterns = {
      PATTERN000: 0,
      PATTERN001: 1,
      PATTERN010: 2,
      PATTERN011: 3,
      PATTERN100: 4,
      PATTERN101: 5,
      PATTERN110: 6,
      PATTERN111: 7
    };
    const t = {
      N1: 3,
      N2: 3,
      N3: 40,
      N4: 10
    };
    e.isValid = function(n) {
      return n != null && n !== "" && !isNaN(n) && n >= 0 && n <= 7;
    }, e.from = function(n) {
      return e.isValid(n) ? parseInt(n, 10) : void 0;
    }, e.getPenaltyN1 = function(n) {
      const i = n.size;
      let s = 0, a = 0, l = 0, c = null, m = null;
      for (let g = 0; g < i; g++) {
        a = l = 0, c = m = null;
        for (let h = 0; h < i; h++) {
          let f = n.get(g, h);
          f === c ? a++ : (a >= 5 && (s += t.N1 + (a - 5)), c = f, a = 1), f = n.get(h, g), f === m ? l++ : (l >= 5 && (s += t.N1 + (l - 5)), m = f, l = 1);
        }
        a >= 5 && (s += t.N1 + (a - 5)), l >= 5 && (s += t.N1 + (l - 5));
      }
      return s;
    }, e.getPenaltyN2 = function(n) {
      const i = n.size;
      let s = 0;
      for (let a = 0; a < i - 1; a++)
        for (let l = 0; l < i - 1; l++) {
          const c = n.get(a, l) + n.get(a, l + 1) + n.get(a + 1, l) + n.get(a + 1, l + 1);
          (c === 4 || c === 0) && s++;
        }
      return s * t.N2;
    }, e.getPenaltyN3 = function(n) {
      const i = n.size;
      let s = 0, a = 0, l = 0;
      for (let c = 0; c < i; c++) {
        a = l = 0;
        for (let m = 0; m < i; m++)
          a = a << 1 & 2047 | n.get(c, m), m >= 10 && (a === 1488 || a === 93) && s++, l = l << 1 & 2047 | n.get(m, c), m >= 10 && (l === 1488 || l === 93) && s++;
      }
      return s * t.N3;
    }, e.getPenaltyN4 = function(n) {
      let i = 0;
      const s = n.data.length;
      for (let l = 0; l < s; l++) i += n.data[l];
      return Math.abs(Math.ceil(i * 100 / s / 5) - 10) * t.N4;
    };
    function r(o, n, i) {
      switch (o) {
        case e.Patterns.PATTERN000:
          return (n + i) % 2 === 0;
        case e.Patterns.PATTERN001:
          return n % 2 === 0;
        case e.Patterns.PATTERN010:
          return i % 3 === 0;
        case e.Patterns.PATTERN011:
          return (n + i) % 3 === 0;
        case e.Patterns.PATTERN100:
          return (Math.floor(n / 2) + Math.floor(i / 3)) % 2 === 0;
        case e.Patterns.PATTERN101:
          return n * i % 2 + n * i % 3 === 0;
        case e.Patterns.PATTERN110:
          return (n * i % 2 + n * i % 3) % 2 === 0;
        case e.Patterns.PATTERN111:
          return (n * i % 3 + (n + i) % 2) % 2 === 0;
        default:
          throw new Error("bad maskPattern:" + o);
      }
    }
    e.applyMask = function(n, i) {
      const s = i.size;
      for (let a = 0; a < s; a++)
        for (let l = 0; l < s; l++)
          i.isReserved(l, a) || i.xor(l, a, r(n, l, a));
    }, e.getBestMask = function(n, i) {
      const s = Object.keys(e.Patterns).length;
      let a = 0, l = 1 / 0;
      for (let c = 0; c < s; c++) {
        i(c), e.applyMask(c, n);
        const m = e.getPenaltyN1(n) + e.getPenaltyN2(n) + e.getPenaltyN3(n) + e.getPenaltyN4(n);
        e.applyMask(c, n), m < l && (l = m, a = c);
      }
      return a;
    };
  })(er)), er;
}
var gt = {}, Un;
function To() {
  if (Un) return gt;
  Un = 1;
  const e = Qr(), t = [
    // L  M  Q  H
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    2,
    2,
    1,
    2,
    2,
    4,
    1,
    2,
    4,
    4,
    2,
    4,
    4,
    4,
    2,
    4,
    6,
    5,
    2,
    4,
    6,
    6,
    2,
    5,
    8,
    8,
    4,
    5,
    8,
    8,
    4,
    5,
    8,
    11,
    4,
    8,
    10,
    11,
    4,
    9,
    12,
    16,
    4,
    9,
    16,
    16,
    6,
    10,
    12,
    18,
    6,
    10,
    17,
    16,
    6,
    11,
    16,
    19,
    6,
    13,
    18,
    21,
    7,
    14,
    21,
    25,
    8,
    16,
    20,
    25,
    8,
    17,
    23,
    25,
    9,
    17,
    23,
    34,
    9,
    18,
    25,
    30,
    10,
    20,
    27,
    32,
    12,
    21,
    29,
    35,
    12,
    23,
    34,
    37,
    12,
    25,
    34,
    40,
    13,
    26,
    35,
    42,
    14,
    28,
    38,
    45,
    15,
    29,
    40,
    48,
    16,
    31,
    43,
    51,
    17,
    33,
    45,
    54,
    18,
    35,
    48,
    57,
    19,
    37,
    51,
    60,
    19,
    38,
    53,
    63,
    20,
    40,
    56,
    66,
    21,
    43,
    59,
    70,
    22,
    45,
    62,
    74,
    24,
    47,
    65,
    77,
    25,
    49,
    68,
    81
  ], r = [
    // L  M  Q  H
    7,
    10,
    13,
    17,
    10,
    16,
    22,
    28,
    15,
    26,
    36,
    44,
    20,
    36,
    52,
    64,
    26,
    48,
    72,
    88,
    36,
    64,
    96,
    112,
    40,
    72,
    108,
    130,
    48,
    88,
    132,
    156,
    60,
    110,
    160,
    192,
    72,
    130,
    192,
    224,
    80,
    150,
    224,
    264,
    96,
    176,
    260,
    308,
    104,
    198,
    288,
    352,
    120,
    216,
    320,
    384,
    132,
    240,
    360,
    432,
    144,
    280,
    408,
    480,
    168,
    308,
    448,
    532,
    180,
    338,
    504,
    588,
    196,
    364,
    546,
    650,
    224,
    416,
    600,
    700,
    224,
    442,
    644,
    750,
    252,
    476,
    690,
    816,
    270,
    504,
    750,
    900,
    300,
    560,
    810,
    960,
    312,
    588,
    870,
    1050,
    336,
    644,
    952,
    1110,
    360,
    700,
    1020,
    1200,
    390,
    728,
    1050,
    1260,
    420,
    784,
    1140,
    1350,
    450,
    812,
    1200,
    1440,
    480,
    868,
    1290,
    1530,
    510,
    924,
    1350,
    1620,
    540,
    980,
    1440,
    1710,
    570,
    1036,
    1530,
    1800,
    570,
    1064,
    1590,
    1890,
    600,
    1120,
    1680,
    1980,
    630,
    1204,
    1770,
    2100,
    660,
    1260,
    1860,
    2220,
    720,
    1316,
    1950,
    2310,
    750,
    1372,
    2040,
    2430
  ];
  return gt.getBlocksCount = function(n, i) {
    switch (i) {
      case e.L:
        return t[(n - 1) * 4 + 0];
      case e.M:
        return t[(n - 1) * 4 + 1];
      case e.Q:
        return t[(n - 1) * 4 + 2];
      case e.H:
        return t[(n - 1) * 4 + 3];
      default:
        return;
    }
  }, gt.getTotalCodewordsCount = function(n, i) {
    switch (i) {
      case e.L:
        return r[(n - 1) * 4 + 0];
      case e.M:
        return r[(n - 1) * 4 + 1];
      case e.Q:
        return r[(n - 1) * 4 + 2];
      case e.H:
        return r[(n - 1) * 4 + 3];
      default:
        return;
    }
  }, gt;
}
var tr = {}, Ge = {}, kn;
function xs() {
  if (kn) return Ge;
  kn = 1;
  const e = new Uint8Array(512), t = new Uint8Array(256);
  return (function() {
    let o = 1;
    for (let n = 0; n < 255; n++)
      e[n] = o, t[o] = n, o <<= 1, o & 256 && (o ^= 285);
    for (let n = 255; n < 512; n++)
      e[n] = e[n - 255];
  })(), Ge.log = function(o) {
    if (o < 1) throw new Error("log(" + o + ")");
    return t[o];
  }, Ge.exp = function(o) {
    return e[o];
  }, Ge.mul = function(o, n) {
    return o === 0 || n === 0 ? 0 : e[t[o] + t[n]];
  }, Ge;
}
var jn;
function Cs() {
  return jn || (jn = 1, (function(e) {
    const t = xs();
    e.mul = function(o, n) {
      const i = new Uint8Array(o.length + n.length - 1);
      for (let s = 0; s < o.length; s++)
        for (let a = 0; a < n.length; a++)
          i[s + a] ^= t.mul(o[s], n[a]);
      return i;
    }, e.mod = function(o, n) {
      let i = new Uint8Array(o);
      for (; i.length - n.length >= 0; ) {
        const s = i[0];
        for (let l = 0; l < n.length; l++)
          i[l] ^= t.mul(n[l], s);
        let a = 0;
        for (; a < i.length && i[a] === 0; ) a++;
        i = i.slice(a);
      }
      return i;
    }, e.generateECPolynomial = function(o) {
      let n = new Uint8Array([1]);
      for (let i = 0; i < o; i++)
        n = e.mul(n, new Uint8Array([1, t.exp(i)]));
      return n;
    };
  })(tr)), tr;
}
var rr, Hn;
function $s() {
  if (Hn) return rr;
  Hn = 1;
  const e = Cs();
  function t(r) {
    this.genPoly = void 0, this.degree = r, this.degree && this.initialize(this.degree);
  }
  return t.prototype.initialize = function(o) {
    this.degree = o, this.genPoly = e.generateECPolynomial(this.degree);
  }, t.prototype.encode = function(o) {
    if (!this.genPoly)
      throw new Error("Encoder not initialized");
    const n = new Uint8Array(o.length + this.degree);
    n.set(o);
    const i = e.mod(n, this.genPoly), s = this.degree - i.length;
    if (s > 0) {
      const a = new Uint8Array(this.degree);
      return a.set(i, s), a;
    }
    return i;
  }, rr = t, rr;
}
var nr = {}, or = {}, ir = {}, Vn;
function So() {
  return Vn || (Vn = 1, ir.isValid = function(t) {
    return !isNaN(t) && t >= 1 && t <= 40;
  }), ir;
}
var te = {}, zn;
function Ro() {
  if (zn) return te;
  zn = 1;
  const e = "[0-9]+", t = "[A-Z $%*+\\-./:]+";
  let r = "(?:[u3000-u303F]|[u3040-u309F]|[u30A0-u30FF]|[uFF00-uFFEF]|[u4E00-u9FAF]|[u2605-u2606]|[u2190-u2195]|u203B|[u2010u2015u2018u2019u2025u2026u201Cu201Du2225u2260]|[u0391-u0451]|[u00A7u00A8u00B1u00B4u00D7u00F7])+";
  r = r.replace(/u/g, "\\u");
  const o = "(?:(?![A-Z0-9 $%*+\\-./:]|" + r + `)(?:.|[\r
]))+`;
  te.KANJI = new RegExp(r, "g"), te.BYTE_KANJI = new RegExp("[^A-Z0-9 $%*+\\-./:]+", "g"), te.BYTE = new RegExp(o, "g"), te.NUMERIC = new RegExp(e, "g"), te.ALPHANUMERIC = new RegExp(t, "g");
  const n = new RegExp("^" + r + "$"), i = new RegExp("^" + e + "$"), s = new RegExp("^[A-Z0-9 $%*+\\-./:]+$");
  return te.testKanji = function(l) {
    return n.test(l);
  }, te.testNumeric = function(l) {
    return i.test(l);
  }, te.testAlphanumeric = function(l) {
    return s.test(l);
  }, te;
}
var Fn;
function Se() {
  return Fn || (Fn = 1, (function(e) {
    const t = So(), r = Ro();
    e.NUMERIC = {
      id: "Numeric",
      bit: 1,
      ccBits: [10, 12, 14]
    }, e.ALPHANUMERIC = {
      id: "Alphanumeric",
      bit: 2,
      ccBits: [9, 11, 13]
    }, e.BYTE = {
      id: "Byte",
      bit: 4,
      ccBits: [8, 16, 16]
    }, e.KANJI = {
      id: "Kanji",
      bit: 8,
      ccBits: [8, 10, 12]
    }, e.MIXED = {
      bit: -1
    }, e.getCharCountIndicator = function(i, s) {
      if (!i.ccBits) throw new Error("Invalid mode: " + i);
      if (!t.isValid(s))
        throw new Error("Invalid version: " + s);
      return s >= 1 && s < 10 ? i.ccBits[0] : s < 27 ? i.ccBits[1] : i.ccBits[2];
    }, e.getBestModeForData = function(i) {
      return r.testNumeric(i) ? e.NUMERIC : r.testAlphanumeric(i) ? e.ALPHANUMERIC : r.testKanji(i) ? e.KANJI : e.BYTE;
    }, e.toString = function(i) {
      if (i && i.id) return i.id;
      throw new Error("Invalid mode");
    }, e.isValid = function(i) {
      return i && i.bit && i.ccBits;
    };
    function o(n) {
      if (typeof n != "string")
        throw new Error("Param is not a string");
      switch (n.toLowerCase()) {
        case "numeric":
          return e.NUMERIC;
        case "alphanumeric":
          return e.ALPHANUMERIC;
        case "kanji":
          return e.KANJI;
        case "byte":
          return e.BYTE;
        default:
          throw new Error("Unknown mode: " + n);
      }
    }
    e.from = function(i, s) {
      if (e.isValid(i))
        return i;
      try {
        return o(i);
      } catch {
        return s;
      }
    };
  })(or)), or;
}
var qn;
function Es() {
  return qn || (qn = 1, (function(e) {
    const t = Te(), r = To(), o = Qr(), n = Se(), i = So(), s = 7973, a = t.getBCHDigit(s);
    function l(h, f, b) {
      for (let w = 1; w <= 40; w++)
        if (f <= e.getCapacity(w, b, h))
          return w;
    }
    function c(h, f) {
      return n.getCharCountIndicator(h, f) + 4;
    }
    function m(h, f) {
      let b = 0;
      return h.forEach(function(w) {
        const T = c(w.mode, f);
        b += T + w.getBitsLength();
      }), b;
    }
    function g(h, f) {
      for (let b = 1; b <= 40; b++)
        if (m(h, b) <= e.getCapacity(b, f, n.MIXED))
          return b;
    }
    e.from = function(f, b) {
      return i.isValid(f) ? parseInt(f, 10) : b;
    }, e.getCapacity = function(f, b, w) {
      if (!i.isValid(f))
        throw new Error("Invalid QR Code version");
      typeof w > "u" && (w = n.BYTE);
      const T = t.getSymbolTotalCodewords(f), p = r.getTotalCodewordsCount(f, b), O = (T - p) * 8;
      if (w === n.MIXED) return O;
      const $ = O - c(w, f);
      switch (w) {
        case n.NUMERIC:
          return Math.floor($ / 10 * 3);
        case n.ALPHANUMERIC:
          return Math.floor($ / 11 * 2);
        case n.KANJI:
          return Math.floor($ / 13);
        case n.BYTE:
        default:
          return Math.floor($ / 8);
      }
    }, e.getBestVersionForData = function(f, b) {
      let w;
      const T = o.from(b, o.M);
      if (Array.isArray(f)) {
        if (f.length > 1)
          return g(f, T);
        if (f.length === 0)
          return 1;
        w = f[0];
      } else
        w = f;
      return l(w.mode, w.getLength(), T);
    }, e.getEncodedBits = function(f) {
      if (!i.isValid(f) || f < 7)
        throw new Error("Invalid QR Code version");
      let b = f << 12;
      for (; t.getBCHDigit(b) - a >= 0; )
        b ^= s << t.getBCHDigit(b) - a;
      return f << 12 | b;
    };
  })(nr)), nr;
}
var sr = {}, Zn;
function As() {
  if (Zn) return sr;
  Zn = 1;
  const e = Te(), t = 1335, r = 21522, o = e.getBCHDigit(t);
  return sr.getEncodedBits = function(i, s) {
    const a = i.bit << 3 | s;
    let l = a << 10;
    for (; e.getBCHDigit(l) - o >= 0; )
      l ^= t << e.getBCHDigit(l) - o;
    return (a << 10 | l) ^ r;
  }, sr;
}
var ar = {}, lr, Kn;
function Is() {
  if (Kn) return lr;
  Kn = 1;
  const e = Se();
  function t(r) {
    this.mode = e.NUMERIC, this.data = r.toString();
  }
  return t.getBitsLength = function(o) {
    return 10 * Math.floor(o / 3) + (o % 3 ? o % 3 * 3 + 1 : 0);
  }, t.prototype.getLength = function() {
    return this.data.length;
  }, t.prototype.getBitsLength = function() {
    return t.getBitsLength(this.data.length);
  }, t.prototype.write = function(o) {
    let n, i, s;
    for (n = 0; n + 3 <= this.data.length; n += 3)
      i = this.data.substr(n, 3), s = parseInt(i, 10), o.put(s, 10);
    const a = this.data.length - n;
    a > 0 && (i = this.data.substr(n), s = parseInt(i, 10), o.put(s, a * 3 + 1));
  }, lr = t, lr;
}
var cr, Yn;
function Os() {
  if (Yn) return cr;
  Yn = 1;
  const e = Se(), t = [
    "0",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "A",
    "B",
    "C",
    "D",
    "E",
    "F",
    "G",
    "H",
    "I",
    "J",
    "K",
    "L",
    "M",
    "N",
    "O",
    "P",
    "Q",
    "R",
    "S",
    "T",
    "U",
    "V",
    "W",
    "X",
    "Y",
    "Z",
    " ",
    "$",
    "%",
    "*",
    "+",
    "-",
    ".",
    "/",
    ":"
  ];
  function r(o) {
    this.mode = e.ALPHANUMERIC, this.data = o;
  }
  return r.getBitsLength = function(n) {
    return 11 * Math.floor(n / 2) + 6 * (n % 2);
  }, r.prototype.getLength = function() {
    return this.data.length;
  }, r.prototype.getBitsLength = function() {
    return r.getBitsLength(this.data.length);
  }, r.prototype.write = function(n) {
    let i;
    for (i = 0; i + 2 <= this.data.length; i += 2) {
      let s = t.indexOf(this.data[i]) * 45;
      s += t.indexOf(this.data[i + 1]), n.put(s, 11);
    }
    this.data.length % 2 && n.put(t.indexOf(this.data[i]), 6);
  }, cr = r, cr;
}
var dr, Qn;
function Ps() {
  return Qn || (Qn = 1, dr = function(t) {
    for (var r = [], o = t.length, n = 0; n < o; n++) {
      var i = t.charCodeAt(n);
      if (i >= 55296 && i <= 56319 && o > n + 1) {
        var s = t.charCodeAt(n + 1);
        s >= 56320 && s <= 57343 && (i = (i - 55296) * 1024 + s - 56320 + 65536, n += 1);
      }
      if (i < 128) {
        r.push(i);
        continue;
      }
      if (i < 2048) {
        r.push(i >> 6 | 192), r.push(i & 63 | 128);
        continue;
      }
      if (i < 55296 || i >= 57344 && i < 65536) {
        r.push(i >> 12 | 224), r.push(i >> 6 & 63 | 128), r.push(i & 63 | 128);
        continue;
      }
      if (i >= 65536 && i <= 1114111) {
        r.push(i >> 18 | 240), r.push(i >> 12 & 63 | 128), r.push(i >> 6 & 63 | 128), r.push(i & 63 | 128);
        continue;
      }
      r.push(239, 191, 189);
    }
    return new Uint8Array(r).buffer;
  }), dr;
}
var ur, Gn;
function Ms() {
  if (Gn) return ur;
  Gn = 1;
  const e = Ps(), t = Se();
  function r(o) {
    this.mode = t.BYTE, typeof o == "string" && (o = e(o)), this.data = new Uint8Array(o);
  }
  return r.getBitsLength = function(n) {
    return n * 8;
  }, r.prototype.getLength = function() {
    return this.data.length;
  }, r.prototype.getBitsLength = function() {
    return r.getBitsLength(this.data.length);
  }, r.prototype.write = function(o) {
    for (let n = 0, i = this.data.length; n < i; n++)
      o.put(this.data[n], 8);
  }, ur = r, ur;
}
var hr, Jn;
function Ts() {
  if (Jn) return hr;
  Jn = 1;
  const e = Se(), t = Te();
  function r(o) {
    this.mode = e.KANJI, this.data = o;
  }
  return r.getBitsLength = function(n) {
    return n * 13;
  }, r.prototype.getLength = function() {
    return this.data.length;
  }, r.prototype.getBitsLength = function() {
    return r.getBitsLength(this.data.length);
  }, r.prototype.write = function(o) {
    let n;
    for (n = 0; n < this.data.length; n++) {
      let i = t.toSJIS(this.data[n]);
      if (i >= 33088 && i <= 40956)
        i -= 33088;
      else if (i >= 57408 && i <= 60351)
        i -= 49472;
      else
        throw new Error(
          "Invalid SJIS character: " + this.data[n] + `
Make sure your charset is UTF-8`
        );
      i = (i >>> 8 & 255) * 192 + (i & 255), o.put(i, 13);
    }
  }, hr = r, hr;
}
var mr = { exports: {} }, Xn;
function Ss() {
  return Xn || (Xn = 1, (function(e) {
    var t = {
      single_source_shortest_paths: function(r, o, n) {
        var i = {}, s = {};
        s[o] = 0;
        var a = t.PriorityQueue.make();
        a.push(o, 0);
        for (var l, c, m, g, h, f, b, w, T; !a.empty(); ) {
          l = a.pop(), c = l.value, g = l.cost, h = r[c] || {};
          for (m in h)
            h.hasOwnProperty(m) && (f = h[m], b = g + f, w = s[m], T = typeof s[m] > "u", (T || w > b) && (s[m] = b, a.push(m, b), i[m] = c));
        }
        if (typeof n < "u" && typeof s[n] > "u") {
          var p = ["Could not find a path from ", o, " to ", n, "."].join("");
          throw new Error(p);
        }
        return i;
      },
      extract_shortest_path_from_predecessor_list: function(r, o) {
        for (var n = [], i = o; i; )
          n.push(i), r[i], i = r[i];
        return n.reverse(), n;
      },
      find_path: function(r, o, n) {
        var i = t.single_source_shortest_paths(r, o, n);
        return t.extract_shortest_path_from_predecessor_list(
          i,
          n
        );
      },
      /**
       * A very naive priority queue implementation.
       */
      PriorityQueue: {
        make: function(r) {
          var o = t.PriorityQueue, n = {}, i;
          r = r || {};
          for (i in o)
            o.hasOwnProperty(i) && (n[i] = o[i]);
          return n.queue = [], n.sorter = r.sorter || o.default_sorter, n;
        },
        default_sorter: function(r, o) {
          return r.cost - o.cost;
        },
        /**
         * Add a new item to the queue and ensure the highest priority element
         * is at the front of the queue.
         */
        push: function(r, o) {
          var n = { value: r, cost: o };
          this.queue.push(n), this.queue.sort(this.sorter);
        },
        /**
         * Return the highest priority element in the queue.
         */
        pop: function() {
          return this.queue.shift();
        },
        empty: function() {
          return this.queue.length === 0;
        }
      }
    };
    e.exports = t;
  })(mr)), mr.exports;
}
var eo;
function Rs() {
  return eo || (eo = 1, (function(e) {
    const t = Se(), r = Is(), o = Os(), n = Ms(), i = Ts(), s = Ro(), a = Te(), l = Ss();
    function c(p) {
      return unescape(encodeURIComponent(p)).length;
    }
    function m(p, O, $) {
      const A = [];
      let W;
      for (; (W = p.exec($)) !== null; )
        A.push({
          data: W[0],
          index: W.index,
          mode: O,
          length: W[0].length
        });
      return A;
    }
    function g(p) {
      const O = m(s.NUMERIC, t.NUMERIC, p), $ = m(s.ALPHANUMERIC, t.ALPHANUMERIC, p);
      let A, W;
      return a.isKanjiModeEnabled() ? (A = m(s.BYTE, t.BYTE, p), W = m(s.KANJI, t.KANJI, p)) : (A = m(s.BYTE_KANJI, t.BYTE, p), W = []), O.concat($, A, W).sort(function(E, P) {
        return E.index - P.index;
      }).map(function(E) {
        return {
          data: E.data,
          mode: E.mode,
          length: E.length
        };
      });
    }
    function h(p, O) {
      switch (O) {
        case t.NUMERIC:
          return r.getBitsLength(p);
        case t.ALPHANUMERIC:
          return o.getBitsLength(p);
        case t.KANJI:
          return i.getBitsLength(p);
        case t.BYTE:
          return n.getBitsLength(p);
      }
    }
    function f(p) {
      return p.reduce(function(O, $) {
        const A = O.length - 1 >= 0 ? O[O.length - 1] : null;
        return A && A.mode === $.mode ? (O[O.length - 1].data += $.data, O) : (O.push($), O);
      }, []);
    }
    function b(p) {
      const O = [];
      for (let $ = 0; $ < p.length; $++) {
        const A = p[$];
        switch (A.mode) {
          case t.NUMERIC:
            O.push([
              A,
              { data: A.data, mode: t.ALPHANUMERIC, length: A.length },
              { data: A.data, mode: t.BYTE, length: A.length }
            ]);
            break;
          case t.ALPHANUMERIC:
            O.push([
              A,
              { data: A.data, mode: t.BYTE, length: A.length }
            ]);
            break;
          case t.KANJI:
            O.push([
              A,
              { data: A.data, mode: t.BYTE, length: c(A.data) }
            ]);
            break;
          case t.BYTE:
            O.push([
              { data: A.data, mode: t.BYTE, length: c(A.data) }
            ]);
        }
      }
      return O;
    }
    function w(p, O) {
      const $ = {}, A = { start: {} };
      let W = ["start"];
      for (let I = 0; I < p.length; I++) {
        const E = p[I], P = [];
        for (let u = 0; u < E.length; u++) {
          const v = E[u], d = "" + I + u;
          P.push(d), $[d] = { node: v, lastCount: 0 }, A[d] = {};
          for (let _ = 0; _ < W.length; _++) {
            const C = W[_];
            $[C] && $[C].node.mode === v.mode ? (A[C][d] = h($[C].lastCount + v.length, v.mode) - h($[C].lastCount, v.mode), $[C].lastCount += v.length) : ($[C] && ($[C].lastCount = v.length), A[C][d] = h(v.length, v.mode) + 4 + t.getCharCountIndicator(v.mode, O));
          }
        }
        W = P;
      }
      for (let I = 0; I < W.length; I++)
        A[W[I]].end = 0;
      return { map: A, table: $ };
    }
    function T(p, O) {
      let $;
      const A = t.getBestModeForData(p);
      if ($ = t.from(O, A), $ !== t.BYTE && $.bit < A.bit)
        throw new Error('"' + p + '" cannot be encoded with mode ' + t.toString($) + `.
 Suggested mode is: ` + t.toString(A));
      switch ($ === t.KANJI && !a.isKanjiModeEnabled() && ($ = t.BYTE), $) {
        case t.NUMERIC:
          return new r(p);
        case t.ALPHANUMERIC:
          return new o(p);
        case t.KANJI:
          return new i(p);
        case t.BYTE:
          return new n(p);
      }
    }
    e.fromArray = function(O) {
      return O.reduce(function($, A) {
        return typeof A == "string" ? $.push(T(A, null)) : A.data && $.push(T(A.data, A.mode)), $;
      }, []);
    }, e.fromString = function(O, $) {
      const A = g(O, a.isKanjiModeEnabled()), W = b(A), I = w(W, $), E = l.find_path(I.map, "start", "end"), P = [];
      for (let u = 1; u < E.length - 1; u++)
        P.push(I.table[E[u]].node);
      return e.fromArray(f(P));
    }, e.rawSplit = function(O) {
      return e.fromArray(
        g(O, a.isKanjiModeEnabled())
      );
    };
  })(ar)), ar;
}
var to;
function Ls() {
  if (to) return Kt;
  to = 1;
  const e = Te(), t = Qr(), r = ws(), o = vs(), n = bs(), i = ys(), s = _s(), a = To(), l = $s(), c = Es(), m = As(), g = Se(), h = Rs();
  function f(I, E) {
    const P = I.size, u = i.getPositions(E);
    for (let v = 0; v < u.length; v++) {
      const d = u[v][0], _ = u[v][1];
      for (let C = -1; C <= 7; C++)
        if (!(d + C <= -1 || P <= d + C))
          for (let M = -1; M <= 7; M++)
            _ + M <= -1 || P <= _ + M || (C >= 0 && C <= 6 && (M === 0 || M === 6) || M >= 0 && M <= 6 && (C === 0 || C === 6) || C >= 2 && C <= 4 && M >= 2 && M <= 4 ? I.set(d + C, _ + M, !0, !0) : I.set(d + C, _ + M, !1, !0));
    }
  }
  function b(I) {
    const E = I.size;
    for (let P = 8; P < E - 8; P++) {
      const u = P % 2 === 0;
      I.set(P, 6, u, !0), I.set(6, P, u, !0);
    }
  }
  function w(I, E) {
    const P = n.getPositions(E);
    for (let u = 0; u < P.length; u++) {
      const v = P[u][0], d = P[u][1];
      for (let _ = -2; _ <= 2; _++)
        for (let C = -2; C <= 2; C++)
          _ === -2 || _ === 2 || C === -2 || C === 2 || _ === 0 && C === 0 ? I.set(v + _, d + C, !0, !0) : I.set(v + _, d + C, !1, !0);
    }
  }
  function T(I, E) {
    const P = I.size, u = c.getEncodedBits(E);
    let v, d, _;
    for (let C = 0; C < 18; C++)
      v = Math.floor(C / 3), d = C % 3 + P - 8 - 3, _ = (u >> C & 1) === 1, I.set(v, d, _, !0), I.set(d, v, _, !0);
  }
  function p(I, E, P) {
    const u = I.size, v = m.getEncodedBits(E, P);
    let d, _;
    for (d = 0; d < 15; d++)
      _ = (v >> d & 1) === 1, d < 6 ? I.set(d, 8, _, !0) : d < 8 ? I.set(d + 1, 8, _, !0) : I.set(u - 15 + d, 8, _, !0), d < 8 ? I.set(8, u - d - 1, _, !0) : d < 9 ? I.set(8, 15 - d - 1 + 1, _, !0) : I.set(8, 15 - d - 1, _, !0);
    I.set(u - 8, 8, 1, !0);
  }
  function O(I, E) {
    const P = I.size;
    let u = -1, v = P - 1, d = 7, _ = 0;
    for (let C = P - 1; C > 0; C -= 2)
      for (C === 6 && C--; ; ) {
        for (let M = 0; M < 2; M++)
          if (!I.isReserved(v, C - M)) {
            let Q = !1;
            _ < E.length && (Q = (E[_] >>> d & 1) === 1), I.set(v, C - M, Q), d--, d === -1 && (_++, d = 7);
          }
        if (v += u, v < 0 || P <= v) {
          v -= u, u = -u;
          break;
        }
      }
  }
  function $(I, E, P) {
    const u = new r();
    P.forEach(function(M) {
      u.put(M.mode.bit, 4), u.put(M.getLength(), g.getCharCountIndicator(M.mode, I)), M.write(u);
    });
    const v = e.getSymbolTotalCodewords(I), d = a.getTotalCodewordsCount(I, E), _ = (v - d) * 8;
    for (u.getLengthInBits() + 4 <= _ && u.put(0, 4); u.getLengthInBits() % 8 !== 0; )
      u.putBit(0);
    const C = (_ - u.getLengthInBits()) / 8;
    for (let M = 0; M < C; M++)
      u.put(M % 2 ? 17 : 236, 8);
    return A(u, I, E);
  }
  function A(I, E, P) {
    const u = e.getSymbolTotalCodewords(E), v = a.getTotalCodewordsCount(E, P), d = u - v, _ = a.getBlocksCount(E, P), C = u % _, M = _ - C, Q = Math.floor(u / _), Z = Math.floor(d / _), jo = Z + 1, tn = Q - Z, Ho = new l(tn);
    let St = 0;
    const ut = new Array(_), rn = new Array(_);
    let Rt = 0;
    const Vo = new Uint8Array(I.buffer);
    for (let Re = 0; Re < _; Re++) {
      const Dt = Re < M ? Z : jo;
      ut[Re] = Vo.slice(St, St + Dt), rn[Re] = Ho.encode(ut[Re]), St += Dt, Rt = Math.max(Rt, Dt);
    }
    const Lt = new Uint8Array(u);
    let nn = 0, ne, oe;
    for (ne = 0; ne < Rt; ne++)
      for (oe = 0; oe < _; oe++)
        ne < ut[oe].length && (Lt[nn++] = ut[oe][ne]);
    for (ne = 0; ne < tn; ne++)
      for (oe = 0; oe < _; oe++)
        Lt[nn++] = rn[oe][ne];
    return Lt;
  }
  function W(I, E, P, u) {
    let v;
    if (Array.isArray(I))
      v = h.fromArray(I);
    else if (typeof I == "string") {
      let Q = E;
      if (!Q) {
        const Z = h.rawSplit(I);
        Q = c.getBestVersionForData(Z, P);
      }
      v = h.fromString(I, Q || 40);
    } else
      throw new Error("Invalid data");
    const d = c.getBestVersionForData(v, P);
    if (!d)
      throw new Error("The amount of data is too big to be stored in a QR Code");
    if (!E)
      E = d;
    else if (E < d)
      throw new Error(
        `
The chosen QR Code version cannot contain this amount of data.
Minimum version required to store current data is: ` + d + `.
`
      );
    const _ = $(E, P, v), C = e.getSymbolSize(E), M = new o(C);
    return f(M, E), b(M), w(M, E), p(M, P, 0), E >= 7 && T(M, E), O(M, _), isNaN(u) && (u = s.getBestMask(
      M,
      p.bind(null, M, P)
    )), s.applyMask(u, M), p(M, P, u), {
      modules: M,
      version: E,
      errorCorrectionLevel: P,
      maskPattern: u,
      segments: v
    };
  }
  return Kt.create = function(E, P) {
    if (typeof E > "u" || E === "")
      throw new Error("No input text");
    let u = t.M, v, d;
    return typeof P < "u" && (u = t.from(P.errorCorrectionLevel, t.M), v = c.from(P.version), d = s.from(P.maskPattern), P.toSJISFunc && e.setToSJISFunction(P.toSJISFunc)), W(E, v, u, d);
  }, Kt;
}
var fr = {}, pr = {}, ro;
function Lo() {
  return ro || (ro = 1, (function(e) {
    function t(r) {
      if (typeof r == "number" && (r = r.toString()), typeof r != "string")
        throw new Error("Color should be defined as hex string");
      let o = r.slice().replace("#", "").split("");
      if (o.length < 3 || o.length === 5 || o.length > 8)
        throw new Error("Invalid hex color: " + r);
      (o.length === 3 || o.length === 4) && (o = Array.prototype.concat.apply([], o.map(function(i) {
        return [i, i];
      }))), o.length === 6 && o.push("F", "F");
      const n = parseInt(o.join(""), 16);
      return {
        r: n >> 24 & 255,
        g: n >> 16 & 255,
        b: n >> 8 & 255,
        a: n & 255,
        hex: "#" + o.slice(0, 6).join("")
      };
    }
    e.getOptions = function(o) {
      o || (o = {}), o.color || (o.color = {});
      const n = typeof o.margin > "u" || o.margin === null || o.margin < 0 ? 4 : o.margin, i = o.width && o.width >= 21 ? o.width : void 0, s = o.scale || 4;
      return {
        width: i,
        scale: i ? 4 : s,
        margin: n,
        color: {
          dark: t(o.color.dark || "#000000ff"),
          light: t(o.color.light || "#ffffffff")
        },
        type: o.type,
        rendererOpts: o.rendererOpts || {}
      };
    }, e.getScale = function(o, n) {
      return n.width && n.width >= o + n.margin * 2 ? n.width / (o + n.margin * 2) : n.scale;
    }, e.getImageWidth = function(o, n) {
      const i = e.getScale(o, n);
      return Math.floor((o + n.margin * 2) * i);
    }, e.qrToImageData = function(o, n, i) {
      const s = n.modules.size, a = n.modules.data, l = e.getScale(s, i), c = Math.floor((s + i.margin * 2) * l), m = i.margin * l, g = [i.color.light, i.color.dark];
      for (let h = 0; h < c; h++)
        for (let f = 0; f < c; f++) {
          let b = (h * c + f) * 4, w = i.color.light;
          if (h >= m && f >= m && h < c - m && f < c - m) {
            const T = Math.floor((h - m) / l), p = Math.floor((f - m) / l);
            w = g[a[T * s + p] ? 1 : 0];
          }
          o[b++] = w.r, o[b++] = w.g, o[b++] = w.b, o[b] = w.a;
        }
    };
  })(pr)), pr;
}
var no;
function Ds() {
  return no || (no = 1, (function(e) {
    const t = Lo();
    function r(n, i, s) {
      n.clearRect(0, 0, i.width, i.height), i.style || (i.style = {}), i.height = s, i.width = s, i.style.height = s + "px", i.style.width = s + "px";
    }
    function o() {
      try {
        return document.createElement("canvas");
      } catch {
        throw new Error("You need to specify a canvas element");
      }
    }
    e.render = function(i, s, a) {
      let l = a, c = s;
      typeof l > "u" && (!s || !s.getContext) && (l = s, s = void 0), s || (c = o()), l = t.getOptions(l);
      const m = t.getImageWidth(i.modules.size, l), g = c.getContext("2d"), h = g.createImageData(m, m);
      return t.qrToImageData(h.data, i, l), r(g, c, m), g.putImageData(h, 0, 0), c;
    }, e.renderToDataURL = function(i, s, a) {
      let l = a;
      typeof l > "u" && (!s || !s.getContext) && (l = s, s = void 0), l || (l = {});
      const c = e.render(i, s, l), m = l.type || "image/png", g = l.rendererOpts || {};
      return c.toDataURL(m, g.quality);
    };
  })(fr)), fr;
}
var gr = {}, oo;
function Ws() {
  if (oo) return gr;
  oo = 1;
  const e = Lo();
  function t(n, i) {
    const s = n.a / 255, a = i + '="' + n.hex + '"';
    return s < 1 ? a + " " + i + '-opacity="' + s.toFixed(2).slice(1) + '"' : a;
  }
  function r(n, i, s) {
    let a = n + i;
    return typeof s < "u" && (a += " " + s), a;
  }
  function o(n, i, s) {
    let a = "", l = 0, c = !1, m = 0;
    for (let g = 0; g < n.length; g++) {
      const h = Math.floor(g % i), f = Math.floor(g / i);
      !h && !c && (c = !0), n[g] ? (m++, g > 0 && h > 0 && n[g - 1] || (a += c ? r("M", h + s, 0.5 + f + s) : r("m", l, 0), l = 0, c = !1), h + 1 < i && n[g + 1] || (a += r("h", m), m = 0)) : l++;
    }
    return a;
  }
  return gr.render = function(i, s, a) {
    const l = e.getOptions(s), c = i.modules.size, m = i.modules.data, g = c + l.margin * 2, h = l.color.light.a ? "<path " + t(l.color.light, "fill") + ' d="M0 0h' + g + "v" + g + 'H0z"/>' : "", f = "<path " + t(l.color.dark, "stroke") + ' d="' + o(m, c, l.margin) + '"/>', b = 'viewBox="0 0 ' + g + " " + g + '"', T = '<svg xmlns="http://www.w3.org/2000/svg" ' + (l.width ? 'width="' + l.width + '" height="' + l.width + '" ' : "") + b + ' shape-rendering="crispEdges">' + h + f + `</svg>
`;
    return typeof a == "function" && a(null, T), T;
  }, gr;
}
var io;
function Ns() {
  if (io) return De;
  io = 1;
  const e = gs(), t = Ls(), r = Ds(), o = Ws();
  function n(i, s, a, l, c) {
    const m = [].slice.call(arguments, 1), g = m.length, h = typeof m[g - 1] == "function";
    if (!h && !e())
      throw new Error("Callback required as last argument");
    if (h) {
      if (g < 2)
        throw new Error("Too few arguments provided");
      g === 2 ? (c = a, a = s, s = l = void 0) : g === 3 && (s.getContext && typeof c > "u" ? (c = l, l = void 0) : (c = l, l = a, a = s, s = void 0));
    } else {
      if (g < 1)
        throw new Error("Too few arguments provided");
      return g === 1 ? (a = s, s = l = void 0) : g === 2 && !s.getContext && (l = a, a = s, s = void 0), new Promise(function(f, b) {
        try {
          const w = t.create(a, l);
          f(i(w, s, l));
        } catch (w) {
          b(w);
        }
      });
    }
    try {
      const f = t.create(a, l);
      c(null, i(f, s, l));
    } catch (f) {
      c(f);
    }
  }
  return De.create = t.create, De.toCanvas = n.bind(null, r.render), De.toDataURL = n.bind(null, r.renderToDataURL), De.toString = n.bind(null, function(i, s, a) {
    return o.render(i, a);
  }), De;
}
var Bs = Ns();
const Us = /* @__PURE__ */ zo(Bs);
var ks = Object.defineProperty, so = Object.getOwnPropertySymbols, js = Object.prototype.hasOwnProperty, Hs = Object.prototype.propertyIsEnumerable, ao = (e, t, r) => t in e ? ks(e, t, { enumerable: !0, configurable: !0, writable: !0, value: r }) : e[t] = r, wr = (e, t) => {
  for (var r in t || (t = {}))
    js.call(t, r) && ao(e, r, t[r]);
  if (so)
    for (var r of so(t))
      Hs.call(t, r) && ao(e, r, t[r]);
  return e;
};
function Vs() {
  var e;
  const t = (e = fe.state.themeMode) != null ? e : "dark", o = {
    light: {
      foreground: { 1: "rgb(20,20,20)", 2: "rgb(121,134,134)", 3: "rgb(158,169,169)" },
      background: { 1: "rgb(255,255,255)", 2: "rgb(241,243,243)", 3: "rgb(228,231,231)" },
      overlay: "rgba(0,0,0,0.1)"
    },
    dark: {
      foreground: { 1: "rgb(228,231,231)", 2: "rgb(148,158,158)", 3: "rgb(110,119,119)" },
      background: { 1: "rgb(20,20,20)", 2: "rgb(39,42,42)", 3: "rgb(59,64,64)" },
      overlay: "rgba(255,255,255,0.1)"
    }
  }[t];
  return {
    "--wcm-color-fg-1": o.foreground[1],
    "--wcm-color-fg-2": o.foreground[2],
    "--wcm-color-fg-3": o.foreground[3],
    "--wcm-color-bg-1": o.background[1],
    "--wcm-color-bg-2": o.background[2],
    "--wcm-color-bg-3": o.background[3],
    "--wcm-color-overlay": o.overlay
  };
}
function lo() {
  return {
    "--wcm-accent-color": "#3396FF",
    "--wcm-accent-fill-color": "#FFFFFF",
    "--wcm-z-index": "89",
    "--wcm-background-color": "#3396FF",
    "--wcm-background-border-radius": "8px",
    "--wcm-container-border-radius": "30px",
    "--wcm-wallet-icon-border-radius": "15px",
    "--wcm-wallet-icon-large-border-radius": "30px",
    "--wcm-wallet-icon-small-border-radius": "7px",
    "--wcm-input-border-radius": "28px",
    "--wcm-button-border-radius": "10px",
    "--wcm-notification-border-radius": "36px",
    "--wcm-secondary-button-border-radius": "28px",
    "--wcm-icon-button-border-radius": "50%",
    "--wcm-button-hover-highlight-border-radius": "10px",
    "--wcm-text-big-bold-size": "20px",
    "--wcm-text-big-bold-weight": "600",
    "--wcm-text-big-bold-line-height": "24px",
    "--wcm-text-big-bold-letter-spacing": "-0.03em",
    "--wcm-text-big-bold-text-transform": "none",
    "--wcm-text-xsmall-bold-size": "10px",
    "--wcm-text-xsmall-bold-weight": "700",
    "--wcm-text-xsmall-bold-line-height": "12px",
    "--wcm-text-xsmall-bold-letter-spacing": "0.02em",
    "--wcm-text-xsmall-bold-text-transform": "uppercase",
    "--wcm-text-xsmall-regular-size": "12px",
    "--wcm-text-xsmall-regular-weight": "600",
    "--wcm-text-xsmall-regular-line-height": "14px",
    "--wcm-text-xsmall-regular-letter-spacing": "-0.03em",
    "--wcm-text-xsmall-regular-text-transform": "none",
    "--wcm-text-small-thin-size": "14px",
    "--wcm-text-small-thin-weight": "500",
    "--wcm-text-small-thin-line-height": "16px",
    "--wcm-text-small-thin-letter-spacing": "-0.03em",
    "--wcm-text-small-thin-text-transform": "none",
    "--wcm-text-small-regular-size": "14px",
    "--wcm-text-small-regular-weight": "600",
    "--wcm-text-small-regular-line-height": "16px",
    "--wcm-text-small-regular-letter-spacing": "-0.03em",
    "--wcm-text-small-regular-text-transform": "none",
    "--wcm-text-medium-regular-size": "16px",
    "--wcm-text-medium-regular-weight": "600",
    "--wcm-text-medium-regular-line-height": "20px",
    "--wcm-text-medium-regular-letter-spacing": "-0.03em",
    "--wcm-text-medium-regular-text-transform": "none",
    "--wcm-font-family": "-apple-system, system-ui, BlinkMacSystemFont, 'Segoe UI', Roboto, Ubuntu, 'Helvetica Neue', sans-serif",
    "--wcm-font-feature-settings": "'tnum' on, 'lnum' on, 'case' on",
    "--wcm-success-color": "rgb(38,181,98)",
    "--wcm-error-color": "rgb(242, 90, 103)",
    "--wcm-overlay-background-color": "rgba(0, 0, 0, 0.3)",
    "--wcm-overlay-backdrop-filter": "none"
  };
}
const D = {
  getPreset(e) {
    return lo()[e];
  },
  setTheme() {
    const e = document.querySelector(":root"), { themeVariables: t } = fe.state;
    if (e) {
      const r = wr(wr(wr({}, Vs()), lo()), t);
      Object.entries(r).forEach(([o, n]) => e.style.setProperty(o, n));
    }
  },
  globalCss: B`*,::after,::before{margin:0;padding:0;box-sizing:border-box;font-style:normal;text-rendering:optimizeSpeed;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;-webkit-tap-highlight-color:transparent;backface-visibility:hidden}button{cursor:pointer;display:flex;justify-content:center;align-items:center;position:relative;border:none;background-color:transparent;transition:all .2s ease}@media (hover:hover) and (pointer:fine){button:active{transition:all .1s ease;transform:scale(.93)}}button::after{content:'';position:absolute;top:0;bottom:0;left:0;right:0;transition:background-color,.2s ease}button:disabled{cursor:not-allowed}button svg,button wcm-text{position:relative;z-index:1}input{border:none;outline:0;appearance:none}img{display:block}::selection{color:var(--wcm-accent-fill-color);background:var(--wcm-accent-color)}`
}, zs = B`button{border-radius:var(--wcm-secondary-button-border-radius);height:28px;padding:0 10px;background-color:var(--wcm-accent-color)}button path{fill:var(--wcm-accent-fill-color)}button::after{border-radius:inherit;border:1px solid var(--wcm-color-overlay)}button:disabled::after{background-color:transparent}.wcm-icon-left svg{margin-right:5px}.wcm-icon-right svg{margin-left:5px}button:active::after{background-color:var(--wcm-color-overlay)}.wcm-ghost,.wcm-ghost:active::after,.wcm-outline{background-color:transparent}.wcm-ghost:active{opacity:.5}@media(hover:hover){button:hover::after{background-color:var(--wcm-color-overlay)}.wcm-ghost:hover::after{background-color:transparent}.wcm-ghost:hover{opacity:.5}}button:disabled{background-color:var(--wcm-color-bg-3);pointer-events:none}.wcm-ghost::after{border-color:transparent}.wcm-ghost path{fill:var(--wcm-color-fg-2)}.wcm-outline path{fill:var(--wcm-accent-color)}.wcm-outline:disabled{background-color:transparent;opacity:.5}`;
var Fs = Object.defineProperty, qs = Object.getOwnPropertyDescriptor, qe = (e, t, r, o) => {
  for (var n = o > 1 ? void 0 : o ? qs(t, r) : t, i = e.length - 1, s; i >= 0; i--)
    (s = e[i]) && (n = (o ? s(t, r, n) : s(n)) || n);
  return o && n && Fs(t, r, n), n;
};
let pe = class extends L {
  constructor() {
    super(...arguments), this.disabled = !1, this.iconLeft = void 0, this.iconRight = void 0, this.onClick = () => null, this.variant = "default";
  }
  // -- render ------------------------------------------------------- //
  render() {
    const e = {
      "wcm-icon-left": this.iconLeft !== void 0,
      "wcm-icon-right": this.iconRight !== void 0,
      "wcm-ghost": this.variant === "ghost",
      "wcm-outline": this.variant === "outline"
    };
    let t = "inverse";
    return this.variant === "ghost" && (t = "secondary"), this.variant === "outline" && (t = "accent"), y`<button class="${ae(e)}" ?disabled="${this.disabled}" @click="${this.onClick}">${this.iconLeft}<wcm-text variant="small-regular" color="${t}"><slot></slot></wcm-text>${this.iconRight}</button>`;
  }
};
pe.styles = [D.globalCss, zs];
qe([
  R({ type: Boolean })
], pe.prototype, "disabled", 2);
qe([
  R()
], pe.prototype, "iconLeft", 2);
qe([
  R()
], pe.prototype, "iconRight", 2);
qe([
  R()
], pe.prototype, "onClick", 2);
qe([
  R()
], pe.prototype, "variant", 2);
pe = qe([
  N("wcm-button")
], pe);
const Zs = B`:host{display:inline-block}button{padding:0 15px 1px;height:40px;border-radius:var(--wcm-button-border-radius);color:var(--wcm-accent-fill-color);background-color:var(--wcm-accent-color)}button::after{content:'';top:0;bottom:0;left:0;right:0;position:absolute;background-color:transparent;border-radius:inherit;transition:background-color .2s ease;border:1px solid var(--wcm-color-overlay)}button:active::after{background-color:var(--wcm-color-overlay)}button:disabled{padding-bottom:0;background-color:var(--wcm-color-bg-3);color:var(--wcm-color-fg-3)}.wcm-secondary{color:var(--wcm-accent-color);background-color:transparent}.wcm-secondary::after{display:none}@media(hover:hover){button:hover::after{background-color:var(--wcm-color-overlay)}}`;
var Ks = Object.defineProperty, Ys = Object.getOwnPropertyDescriptor, Gr = (e, t, r, o) => {
  for (var n = o > 1 ? void 0 : o ? Ys(t, r) : t, i = e.length - 1, s; i >= 0; i--)
    (s = e[i]) && (n = (o ? s(t, r, n) : s(n)) || n);
  return o && n && Ks(t, r, n), n;
};
let ot = class extends L {
  constructor() {
    super(...arguments), this.disabled = !1, this.variant = "primary";
  }
  // -- render ------------------------------------------------------- //
  render() {
    const e = {
      "wcm-secondary": this.variant === "secondary"
    };
    return y`<button ?disabled="${this.disabled}" class="${ae(e)}"><slot></slot></button>`;
  }
};
ot.styles = [D.globalCss, Zs];
Gr([
  R({ type: Boolean })
], ot.prototype, "disabled", 2);
Gr([
  R()
], ot.prototype, "variant", 2);
ot = Gr([
  N("wcm-button-big")
], ot);
const Qs = B`:host{background-color:var(--wcm-color-bg-2);border-top:1px solid var(--wcm-color-bg-3)}div{padding:10px 20px;display:inherit;flex-direction:inherit;align-items:inherit;width:inherit;justify-content:inherit}`;
var Gs = Object.getOwnPropertyDescriptor, Js = (e, t, r, o) => {
  for (var n = o > 1 ? void 0 : o ? Gs(t, r) : t, i = e.length - 1, s; i >= 0; i--)
    (s = e[i]) && (n = s(n) || n);
  return n;
};
let Tr = class extends L {
  // -- render ------------------------------------------------------- //
  render() {
    return y`<div><slot></slot></div>`;
  }
};
Tr.styles = [D.globalCss, Qs];
Tr = Js([
  N("wcm-info-footer")
], Tr);
const U = {
  CROSS_ICON: j`<svg width="12" height="12" viewBox="0 0 12 12"><path d="M9.94 11A.75.75 0 1 0 11 9.94L7.414 6.353a.5.5 0 0 1 0-.708L11 2.061A.75.75 0 1 0 9.94 1L6.353 4.586a.5.5 0 0 1-.708 0L2.061 1A.75.75 0 0 0 1 2.06l3.586 3.586a.5.5 0 0 1 0 .708L1 9.939A.75.75 0 1 0 2.06 11l3.586-3.586a.5.5 0 0 1 .708 0L9.939 11Z" fill="#fff"/></svg>`,
  WALLET_CONNECT_LOGO: j`<svg width="178" height="29" viewBox="0 0 178 29" id="wcm-wc-logo"><path d="M10.683 7.926c5.284-5.17 13.85-5.17 19.134 0l.636.623a.652.652 0 0 1 0 .936l-2.176 2.129a.343.343 0 0 1-.478 0l-.875-.857c-3.686-3.607-9.662-3.607-13.348 0l-.937.918a.343.343 0 0 1-.479 0l-2.175-2.13a.652.652 0 0 1 0-.936l.698-.683Zm23.633 4.403 1.935 1.895a.652.652 0 0 1 0 .936l-8.73 8.543a.687.687 0 0 1-.956 0L20.37 17.64a.172.172 0 0 0-.239 0l-6.195 6.063a.687.687 0 0 1-.957 0l-8.73-8.543a.652.652 0 0 1 0-.936l1.936-1.895a.687.687 0 0 1 .957 0l6.196 6.064a.172.172 0 0 0 .239 0l6.195-6.064a.687.687 0 0 1 .957 0l6.196 6.064a.172.172 0 0 0 .24 0l6.195-6.064a.687.687 0 0 1 .956 0ZM48.093 20.948l2.338-9.355c.139-.515.258-1.07.416-1.942.12.872.258 1.427.357 1.942l2.022 9.355h4.181l3.528-13.874h-3.21l-1.943 8.523a24.825 24.825 0 0 0-.456 2.457c-.158-.931-.317-1.625-.495-2.438l-1.883-8.542h-4.201l-2.042 8.542a41.204 41.204 0 0 0-.475 2.438 41.208 41.208 0 0 0-.476-2.438l-1.903-8.542h-3.349l3.508 13.874h4.083ZM63.33 21.304c1.585 0 2.596-.654 3.11-1.605-.059.297-.078.595-.078.892v.357h2.655V15.22c0-2.735-1.248-4.32-4.3-4.32-2.636 0-4.36 1.466-4.52 3.487h2.914c.1-.891.734-1.426 1.705-1.426.911 0 1.407.515 1.407 1.11 0 .435-.258.693-1.03.792l-1.388.159c-2.061.257-3.825 1.01-3.825 3.19 0 1.982 1.645 3.092 3.35 3.092Zm.891-2.041c-.773 0-1.348-.436-1.348-1.19 0-.733.655-1.09 1.645-1.268l.674-.119c.575-.118.892-.218 1.09-.396v.912c0 1.228-.892 2.06-2.06 2.06ZM70.398 7.074v13.874h2.874V7.074h-2.874ZM74.934 7.074v13.874h2.874V7.074h-2.874ZM84.08 21.304c2.735 0 4.5-1.546 4.697-3.567h-2.893c-.139.892-.892 1.387-1.804 1.387-1.228 0-2.12-.99-2.14-2.358h6.897v-.555c0-3.21-1.764-5.312-4.816-5.312-2.933 0-4.994 2.062-4.994 5.173 0 3.37 2.12 5.232 5.053 5.232Zm-2.16-6.421c.119-1.11.932-1.922 2.081-1.922 1.11 0 1.883.772 1.903 1.922H81.92ZM94.92 21.146c.633 0 1.248-.1 1.525-.179v-2.18c-.218.04-.475.06-.693.06-1.05 0-1.427-.595-1.427-1.566v-3.805h2.338v-2.24h-2.338V7.788H91.47v3.448H89.37v2.24h2.1v4.201c0 2.3 1.15 3.469 3.45 3.469ZM104.62 21.304c3.924 0 6.302-2.299 6.599-5.608h-3.111c-.238 1.803-1.506 3.032-3.369 3.032-2.2 0-3.746-1.784-3.746-4.796 0-2.953 1.605-4.638 3.805-4.638 1.883 0 2.953 1.15 3.171 2.834h3.191c-.317-3.448-2.854-5.41-6.342-5.41-3.984 0-7.036 2.695-7.036 7.214 0 4.677 2.676 7.372 6.838 7.372ZM117.449 21.304c2.993 0 5.114-1.882 5.114-5.172 0-3.23-2.121-5.233-5.114-5.233-2.972 0-5.093 2.002-5.093 5.233 0 3.29 2.101 5.172 5.093 5.172Zm0-2.22c-1.327 0-2.18-1.09-2.18-2.952 0-1.903.892-2.973 2.18-2.973 1.308 0 2.2 1.07 2.2 2.973 0 1.862-.872 2.953-2.2 2.953ZM126.569 20.948v-5.689c0-1.208.753-2.1 1.823-2.1 1.011 0 1.606.773 1.606 2.06v5.729h2.873v-6.144c0-2.339-1.229-3.905-3.428-3.905-1.526 0-2.458.734-2.953 1.606a5.31 5.31 0 0 0 .079-.892v-.377h-2.874v9.712h2.874ZM137.464 20.948v-5.689c0-1.208.753-2.1 1.823-2.1 1.011 0 1.606.773 1.606 2.06v5.729h2.873v-6.144c0-2.339-1.228-3.905-3.428-3.905-1.526 0-2.458.734-2.953 1.606a5.31 5.31 0 0 0 .079-.892v-.377h-2.874v9.712h2.874ZM149.949 21.304c2.735 0 4.499-1.546 4.697-3.567h-2.893c-.139.892-.892 1.387-1.804 1.387-1.228 0-2.12-.99-2.14-2.358h6.897v-.555c0-3.21-1.764-5.312-4.816-5.312-2.933 0-4.994 2.062-4.994 5.173 0 3.37 2.12 5.232 5.053 5.232Zm-2.16-6.421c.119-1.11.932-1.922 2.081-1.922 1.11 0 1.883.772 1.903 1.922h-3.984ZM160.876 21.304c3.013 0 4.658-1.645 4.975-4.201h-2.874c-.099 1.07-.713 1.982-2.001 1.982-1.309 0-2.2-1.21-2.2-2.993 0-1.942 1.03-2.933 2.259-2.933 1.209 0 1.803.872 1.883 1.882h2.873c-.218-2.358-1.823-4.142-4.776-4.142-2.874 0-5.153 1.903-5.153 5.193 0 3.25 1.923 5.212 5.014 5.212ZM172.067 21.146c.634 0 1.248-.1 1.526-.179v-2.18c-.218.04-.476.06-.694.06-1.05 0-1.427-.595-1.427-1.566v-3.805h2.339v-2.24h-2.339V7.788h-2.854v3.448h-2.1v2.24h2.1v4.201c0 2.3 1.15 3.469 3.449 3.469Z" fill="#fff"/></svg>`,
  WALLET_CONNECT_ICON: j`<svg width="28" height="20" viewBox="0 0 28 20"><g clip-path="url(#a)"><path d="M7.386 6.482c3.653-3.576 9.575-3.576 13.228 0l.44.43a.451.451 0 0 1 0 .648L19.55 9.033a.237.237 0 0 1-.33 0l-.606-.592c-2.548-2.496-6.68-2.496-9.228 0l-.648.634a.237.237 0 0 1-.33 0L6.902 7.602a.451.451 0 0 1 0-.647l.483-.473Zm16.338 3.046 1.339 1.31a.451.451 0 0 1 0 .648l-6.035 5.909a.475.475 0 0 1-.662 0L14.083 13.2a.119.119 0 0 0-.166 0l-4.283 4.194a.475.475 0 0 1-.662 0l-6.035-5.91a.451.451 0 0 1 0-.647l1.338-1.31a.475.475 0 0 1 .662 0l4.283 4.194c.046.044.12.044.166 0l4.283-4.194a.475.475 0 0 1 .662 0l4.283 4.194c.046.044.12.044.166 0l4.283-4.194a.475.475 0 0 1 .662 0Z" fill="#000000"/></g><defs><clipPath id="a"><path fill="#ffffff" d="M0 0h28v20H0z"/></clipPath></defs></svg>`,
  WALLET_CONNECT_ICON_COLORED: j`<svg width="96" height="96" fill="none"><path fill="#fff" d="M25.322 33.597c12.525-12.263 32.83-12.263 45.355 0l1.507 1.476a1.547 1.547 0 0 1 0 2.22l-5.156 5.048a.814.814 0 0 1-1.134 0l-2.074-2.03c-8.737-8.555-22.903-8.555-31.64 0l-2.222 2.175a.814.814 0 0 1-1.134 0l-5.156-5.049a1.547 1.547 0 0 1 0-2.22l1.654-1.62Zm56.019 10.44 4.589 4.494a1.547 1.547 0 0 1 0 2.22l-20.693 20.26a1.628 1.628 0 0 1-2.267 0L48.283 56.632a.407.407 0 0 0-.567 0L33.03 71.012a1.628 1.628 0 0 1-2.268 0L10.07 50.75a1.547 1.547 0 0 1 0-2.22l4.59-4.494a1.628 1.628 0 0 1 2.267 0l14.687 14.38c.156.153.41.153.567 0l14.685-14.38a1.628 1.628 0 0 1 2.268 0l14.687 14.38c.156.153.41.153.567 0l14.686-14.38a1.628 1.628 0 0 1 2.268 0Z"/><path stroke="#000" d="M25.672 33.954c12.33-12.072 32.325-12.072 44.655 0l1.508 1.476a1.047 1.047 0 0 1 0 1.506l-5.157 5.048a.314.314 0 0 1-.434 0l-2.074-2.03c-8.932-8.746-23.409-8.746-32.34 0l-2.222 2.174a.314.314 0 0 1-.434 0l-5.157-5.048a1.047 1.047 0 0 1 0-1.506l1.655-1.62Zm55.319 10.44 4.59 4.494a1.047 1.047 0 0 1 0 1.506l-20.694 20.26a1.128 1.128 0 0 1-1.568 0l-14.686-14.38a.907.907 0 0 0-1.267 0L32.68 70.655a1.128 1.128 0 0 1-1.568 0L10.42 50.394a1.047 1.047 0 0 1 0-1.506l4.59-4.493a1.128 1.128 0 0 1 1.567 0l14.687 14.379a.907.907 0 0 0 1.266 0l-.35-.357.35.357 14.686-14.38a1.128 1.128 0 0 1 1.568 0l14.687 14.38a.907.907 0 0 0 1.267 0l14.686-14.38a1.128 1.128 0 0 1 1.568 0Z"/></svg>`,
  BACK_ICON: j`<svg width="10" height="18" viewBox="0 0 10 18"><path fill-rule="evenodd" clip-rule="evenodd" d="M8.735.179a.75.75 0 0 1 .087 1.057L2.92 8.192a1.25 1.25 0 0 0 0 1.617l5.902 6.956a.75.75 0 1 1-1.144.97L1.776 10.78a2.75 2.75 0 0 1 0-3.559L7.678.265A.75.75 0 0 1 8.735.18Z" fill="#fff"/></svg>`,
  COPY_ICON: j`<svg width="24" height="24" fill="none"><path fill="#fff" fill-rule="evenodd" d="M7.01 7.01c.03-1.545.138-2.5.535-3.28A5 5 0 0 1 9.73 1.545C10.8 1 12.2 1 15 1c2.8 0 4.2 0 5.27.545a5 5 0 0 1 2.185 2.185C23 4.8 23 6.2 23 9c0 2.8 0 4.2-.545 5.27a5 5 0 0 1-2.185 2.185c-.78.397-1.735.505-3.28.534l-.001.01c-.03 1.54-.138 2.493-.534 3.27a5 5 0 0 1-2.185 2.186C13.2 23 11.8 23 9 23c-2.8 0-4.2 0-5.27-.545a5 5 0 0 1-2.185-2.185C1 19.2 1 17.8 1 15c0-2.8 0-4.2.545-5.27A5 5 0 0 1 3.73 7.545C4.508 7.149 5.46 7.04 7 7.01h.01ZM15 15.5c-1.425 0-2.403-.001-3.162-.063-.74-.06-1.139-.172-1.427-.319a3.5 3.5 0 0 1-1.53-1.529c-.146-.288-.257-.686-.318-1.427C8.501 11.403 8.5 10.425 8.5 9c0-1.425.001-2.403.063-3.162.06-.74.172-1.139.318-1.427a3.5 3.5 0 0 1 1.53-1.53c.288-.146.686-.257 1.427-.318.759-.062 1.737-.063 3.162-.063 1.425 0 2.403.001 3.162.063.74.06 1.139.172 1.427.318a3.5 3.5 0 0 1 1.53 1.53c.146.288.257.686.318 1.427.062.759.063 1.737.063 3.162 0 1.425-.001 2.403-.063 3.162-.06.74-.172 1.139-.319 1.427a3.5 3.5 0 0 1-1.529 1.53c-.288.146-.686.257-1.427.318-.759.062-1.737.063-3.162.063ZM7 8.511c-.444.009-.825.025-1.162.052-.74.06-1.139.172-1.427.318a3.5 3.5 0 0 0-1.53 1.53c-.146.288-.257.686-.318 1.427-.062.759-.063 1.737-.063 3.162 0 1.425.001 2.403.063 3.162.06.74.172 1.139.318 1.427a3.5 3.5 0 0 0 1.53 1.53c.288.146.686.257 1.427.318.759.062 1.737.063 3.162.063 1.425 0 2.403-.001 3.162-.063.74-.06 1.139-.172 1.427-.319a3.5 3.5 0 0 0 1.53-1.53c.146-.287.257-.685.318-1.426.027-.337.043-.718.052-1.162H15c-2.8 0-4.2 0-5.27-.545a5 5 0 0 1-2.185-2.185C7 13.2 7 11.8 7 9v-.489Z" clip-rule="evenodd"/></svg>`,
  RETRY_ICON: j`<svg width="15" height="16" viewBox="0 0 15 16"><path d="M6.464 2.03A.75.75 0 0 0 5.403.97L2.08 4.293a1 1 0 0 0 0 1.414L5.403 9.03a.75.75 0 0 0 1.06-1.06L4.672 6.177a.25.25 0 0 1 .177-.427h2.085a4 4 0 1 1-3.93 4.746c-.077-.407-.405-.746-.82-.746-.414 0-.755.338-.7.748a5.501 5.501 0 1 0 5.45-6.248H4.848a.25.25 0 0 1-.177-.427L6.464 2.03Z" fill="#fff"/></svg>`,
  DESKTOP_ICON: j`<svg width="16" height="16" viewBox="0 0 16 16"><path fill-rule="evenodd" clip-rule="evenodd" d="M0 5.98c0-1.85 0-2.775.394-3.466a3 3 0 0 1 1.12-1.12C2.204 1 3.13 1 4.98 1h6.04c1.85 0 2.775 0 3.466.394a3 3 0 0 1 1.12 1.12C16 3.204 16 4.13 16 5.98v1.04c0 1.85 0 2.775-.394 3.466a3 3 0 0 1-1.12 1.12C13.796 12 12.87 12 11.02 12H4.98c-1.85 0-2.775 0-3.466-.394a3 3 0 0 1-1.12-1.12C0 9.796 0 8.87 0 7.02V5.98ZM4.98 2.5h6.04c.953 0 1.568.001 2.034.043.446.04.608.108.69.154a1.5 1.5 0 0 1 .559.56c.046.08.114.243.154.69.042.465.043 1.08.043 2.033v1.04c0 .952-.001 1.568-.043 2.034-.04.446-.108.608-.154.69a1.499 1.499 0 0 1-.56.559c-.08.046-.243.114-.69.154-.466.042-1.08.043-2.033.043H4.98c-.952 0-1.568-.001-2.034-.043-.446-.04-.608-.108-.69-.154a1.5 1.5 0 0 1-.559-.56c-.046-.08-.114-.243-.154-.69-.042-.465-.043-1.08-.043-2.033V5.98c0-.952.001-1.568.043-2.034.04-.446.108-.608.154-.69a1.5 1.5 0 0 1 .56-.559c.08-.046.243-.114.69-.154.465-.042 1.08-.043 2.033-.043Z" fill="#fff"/><path d="M4 14.25a.75.75 0 0 1 .75-.75h6.5a.75.75 0 0 1 0 1.5h-6.5a.75.75 0 0 1-.75-.75Z" fill="#fff"/></svg>`,
  MOBILE_ICON: j`<svg width="16" height="16" viewBox="0 0 16 16"><path d="M6.75 5a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5Z" fill="#fff"/><path fill-rule="evenodd" clip-rule="evenodd" d="M3 4.98c0-1.85 0-2.775.394-3.466a3 3 0 0 1 1.12-1.12C5.204 0 6.136 0 8 0s2.795 0 3.486.394a3 3 0 0 1 1.12 1.12C13 2.204 13 3.13 13 4.98v6.04c0 1.85 0 2.775-.394 3.466a3 3 0 0 1-1.12 1.12C10.796 16 9.864 16 8 16s-2.795 0-3.486-.394a3 3 0 0 1-1.12-1.12C3 13.796 3 12.87 3 11.02V4.98Zm8.5 0v6.04c0 .953-.001 1.568-.043 2.034-.04.446-.108.608-.154.69a1.499 1.499 0 0 1-.56.559c-.08.045-.242.113-.693.154-.47.042-1.091.043-2.05.043-.959 0-1.58-.001-2.05-.043-.45-.04-.613-.109-.693-.154a1.5 1.5 0 0 1-.56-.56c-.046-.08-.114-.243-.154-.69-.042-.466-.043-1.08-.043-2.033V4.98c0-.952.001-1.568.043-2.034.04-.446.108-.608.154-.69a1.5 1.5 0 0 1 .56-.559c.08-.045.243-.113.693-.154C6.42 1.501 7.041 1.5 8 1.5c.959 0 1.58.001 2.05.043.45.04.613.109.693.154a1.5 1.5 0 0 1 .56.56c.046.08.114.243.154.69.042.465.043 1.08.043 2.033Z" fill="#fff"/></svg>`,
  ARROW_DOWN_ICON: j`<svg width="14" height="14" viewBox="0 0 14 14"><path d="M2.28 7.47a.75.75 0 0 0-1.06 1.06l5.25 5.25a.75.75 0 0 0 1.06 0l5.25-5.25a.75.75 0 0 0-1.06-1.06l-3.544 3.543a.25.25 0 0 1-.426-.177V.75a.75.75 0 0 0-1.5 0v10.086a.25.25 0 0 1-.427.176L2.28 7.47Z" fill="#fff"/></svg>`,
  ARROW_UP_RIGHT_ICON: j`<svg width="15" height="14" fill="none"><path d="M4.5 1.75A.75.75 0 0 1 5.25 1H12a1.5 1.5 0 0 1 1.5 1.5v6.75a.75.75 0 0 1-1.5 0V4.164a.25.25 0 0 0-.427-.176L4.061 11.5A.75.75 0 0 1 3 10.44l7.513-7.513a.25.25 0 0 0-.177-.427H5.25a.75.75 0 0 1-.75-.75Z" fill="#fff"/></svg>`,
  ARROW_RIGHT_ICON: j`<svg width="6" height="14" viewBox="0 0 6 14"><path fill-rule="evenodd" clip-rule="evenodd" d="M2.181 1.099a.75.75 0 0 1 1.024.279l2.433 4.258a2.75 2.75 0 0 1 0 2.729l-2.433 4.257a.75.75 0 1 1-1.303-.744L4.335 7.62a1.25 1.25 0 0 0 0-1.24L1.902 2.122a.75.75 0 0 1 .28-1.023Z" fill="#fff"/></svg>`,
  QRCODE_ICON: j`<svg width="25" height="24" viewBox="0 0 25 24"><path d="M23.748 9a.748.748 0 0 0 .748-.752c-.018-2.596-.128-4.07-.784-5.22a6 6 0 0 0-2.24-2.24c-1.15-.656-2.624-.766-5.22-.784a.748.748 0 0 0-.752.748c0 .414.335.749.748.752 1.015.007 1.82.028 2.494.088.995.09 1.561.256 1.988.5.7.398 1.28.978 1.679 1.678.243.427.41.993.498 1.988.061.675.082 1.479.09 2.493a.753.753 0 0 0 .75.749ZM3.527.788C4.677.132 6.152.022 8.747.004A.748.748 0 0 1 9.5.752a.753.753 0 0 1-.749.752c-1.014.007-1.818.028-2.493.088-.995.09-1.561.256-1.988.5-.7.398-1.28.978-1.679 1.678-.243.427-.41.993-.499 1.988-.06.675-.081 1.479-.088 2.493A.753.753 0 0 1 1.252 9a.748.748 0 0 1-.748-.752c.018-2.596.128-4.07.784-5.22a6 6 0 0 1 2.24-2.24ZM1.252 15a.748.748 0 0 0-.748.752c.018 2.596.128 4.07.784 5.22a6 6 0 0 0 2.24 2.24c1.15.656 2.624.766 5.22.784a.748.748 0 0 0 .752-.748.753.753 0 0 0-.749-.752c-1.014-.007-1.818-.028-2.493-.089-.995-.089-1.561-.255-1.988-.498a4.5 4.5 0 0 1-1.679-1.68c-.243-.426-.41-.992-.499-1.987-.06-.675-.081-1.479-.088-2.493A.753.753 0 0 0 1.252 15ZM22.996 15.749a.753.753 0 0 1 .752-.749c.415 0 .751.338.748.752-.018 2.596-.128 4.07-.784 5.22a6 6 0 0 1-2.24 2.24c-1.15.656-2.624.766-5.22.784a.748.748 0 0 1-.752-.748c0-.414.335-.749.748-.752 1.015-.007 1.82-.028 2.494-.089.995-.089 1.561-.255 1.988-.498a4.5 4.5 0 0 0 1.679-1.68c.243-.426.41-.992.498-1.987.061-.675.082-1.479.09-2.493Z" fill="#fff"/><path fill-rule="evenodd" clip-rule="evenodd" d="M7 4a2.5 2.5 0 0 0-2.5 2.5v2A2.5 2.5 0 0 0 7 11h2a2.5 2.5 0 0 0 2.5-2.5v-2A2.5 2.5 0 0 0 9 4H7Zm2 1.5H7a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1ZM13.5 6.5A2.5 2.5 0 0 1 16 4h2a2.5 2.5 0 0 1 2.5 2.5v2A2.5 2.5 0 0 1 18 11h-2a2.5 2.5 0 0 1-2.5-2.5v-2Zm2.5-1h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1ZM7 13a2.5 2.5 0 0 0-2.5 2.5v2A2.5 2.5 0 0 0 7 20h2a2.5 2.5 0 0 0 2.5-2.5v-2A2.5 2.5 0 0 0 9 13H7Zm2 1.5H7a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1Z" fill="#fff"/><path d="M13.5 15.5c0-.465 0-.697.038-.89a2 2 0 0 1 1.572-1.572C15.303 13 15.535 13 16 13v2.5h-2.5ZM18 13c.465 0 .697 0 .89.038a2 2 0 0 1 1.572 1.572c.038.193.038.425.038.89H18V13ZM18 17.5h2.5c0 .465 0 .697-.038.89a2 2 0 0 1-1.572 1.572C18.697 20 18.465 20 18 20v-2.5ZM13.5 17.5H16V20c-.465 0-.697 0-.89-.038a2 2 0 0 1-1.572-1.572c-.038-.193-.038-.425-.038-.89Z" fill="#fff"/></svg>`,
  SCAN_ICON: j`<svg width="16" height="16" fill="none"><path fill="#fff" d="M10 15.216c0 .422.347.763.768.74 1.202-.064 2.025-.222 2.71-.613a5.001 5.001 0 0 0 1.865-1.866c.39-.684.549-1.507.613-2.709a.735.735 0 0 0-.74-.768.768.768 0 0 0-.76.732c-.009.157-.02.306-.032.447-.073.812-.206 1.244-.384 1.555-.31.545-.761.996-1.306 1.306-.311.178-.743.311-1.555.384-.141.013-.29.023-.447.032a.768.768 0 0 0-.732.76ZM10 .784c0 .407.325.737.732.76.157.009.306.02.447.032.812.073 1.244.206 1.555.384a3.5 3.5 0 0 1 1.306 1.306c.178.311.311.743.384 1.555.013.142.023.29.032.447a.768.768 0 0 0 .76.732.734.734 0 0 0 .74-.768c-.064-1.202-.222-2.025-.613-2.71A5 5 0 0 0 13.477.658c-.684-.39-1.507-.549-2.709-.613a.735.735 0 0 0-.768.74ZM5.232.044A.735.735 0 0 1 6 .784a.768.768 0 0 1-.732.76c-.157.009-.305.02-.447.032-.812.073-1.244.206-1.555.384A3.5 3.5 0 0 0 1.96 3.266c-.178.311-.311.743-.384 1.555-.013.142-.023.29-.032.447A.768.768 0 0 1 .784 6a.735.735 0 0 1-.74-.768c.064-1.202.222-2.025.613-2.71A5 5 0 0 1 2.523.658C3.207.267 4.03.108 5.233.044ZM5.268 14.456a.768.768 0 0 1 .732.76.734.734 0 0 1-.768.74c-1.202-.064-2.025-.222-2.71-.613a5 5 0 0 1-1.865-1.866c-.39-.684-.549-1.507-.613-2.709A.735.735 0 0 1 .784 10c.407 0 .737.325.76.732.009.157.02.306.032.447.073.812.206 1.244.384 1.555a3.5 3.5 0 0 0 1.306 1.306c.311.178.743.311 1.555.384.142.013.29.023.447.032Z"/></svg>`,
  CHECKMARK_ICON: j`<svg width="13" height="12" viewBox="0 0 13 12"><path fill-rule="evenodd" clip-rule="evenodd" d="M12.155.132a.75.75 0 0 1 .232 1.035L5.821 11.535a1 1 0 0 1-1.626.09L.665 7.21a.75.75 0 1 1 1.17-.937L4.71 9.867a.25.25 0 0 0 .406-.023L11.12.364a.75.75 0 0 1 1.035-.232Z" fill="#fff"/></svg>`,
  SEARCH_ICON: j`<svg width="20" height="21"><path fill-rule="evenodd" clip-rule="evenodd" d="M12.432 13.992c-.354-.353-.91-.382-1.35-.146a5.5 5.5 0 1 1 2.265-2.265c-.237.441-.208.997.145 1.35l3.296 3.296a.75.75 0 1 1-1.06 1.061l-3.296-3.296Zm.06-5a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" fill="#949E9E"/></svg>`,
  WALLET_PLACEHOLDER: j`<svg width="60" height="60" fill="none" viewBox="0 0 60 60"><g clip-path="url(#q)"><path id="wallet-placeholder-fill" fill="#fff" d="M0 24.9c0-9.251 0-13.877 1.97-17.332a15 15 0 0 1 5.598-5.597C11.023 0 15.648 0 24.9 0h10.2c9.252 0 13.877 0 17.332 1.97a15 15 0 0 1 5.597 5.598C60 11.023 60 15.648 60 24.9v10.2c0 9.252 0 13.877-1.97 17.332a15.001 15.001 0 0 1-5.598 5.597C48.977 60 44.352 60 35.1 60H24.9c-9.251 0-13.877 0-17.332-1.97a15 15 0 0 1-5.597-5.598C0 48.977 0 44.352 0 35.1V24.9Z"/><path id="wallet-placeholder-dash" stroke="#000" stroke-dasharray="4 4" stroke-width="1.5" d="M.04 41.708a231.598 231.598 0 0 1-.039-4.403l.75-.001L.75 35.1v-2.55H0v-5.1h.75V24.9l.001-2.204h-.75c.003-1.617.011-3.077.039-4.404l.75.016c.034-1.65.099-3.08.218-4.343l-.746-.07c.158-1.678.412-3.083.82-4.316l.713.236c.224-.679.497-1.296.827-1.875a14.25 14.25 0 0 1 1.05-1.585L3.076 5.9A15 15 0 0 1 5.9 3.076l.455.596a14.25 14.25 0 0 1 1.585-1.05c.579-.33 1.196-.603 1.875-.827l-.236-.712C10.812.674 12.217.42 13.895.262l.07.746C15.23.89 16.66.824 18.308.79l-.016-.75C19.62.012 21.08.004 22.695.001l.001.75L24.9.75h2.55V0h5.1v.75h2.55l2.204.001v-.75c1.617.003 3.077.011 4.404.039l-.016.75c1.65.034 3.08.099 4.343.218l.07-.746c1.678.158 3.083.412 4.316.82l-.236.713c.679.224 1.296.497 1.875.827a14.24 14.24 0 0 1 1.585 1.05l.455-.596A14.999 14.999 0 0 1 56.924 5.9l-.596.455c.384.502.735 1.032 1.05 1.585.33.579.602 1.196.827 1.875l.712-.236c.409 1.233.663 2.638.822 4.316l-.747.07c.119 1.264.184 2.694.218 4.343l.75-.016c.028 1.327.036 2.787.039 4.403l-.75.001.001 2.204v2.55H60v5.1h-.75v2.55l-.001 2.204h.75a231.431 231.431 0 0 1-.039 4.404l-.75-.016c-.034 1.65-.099 3.08-.218 4.343l.747.07c-.159 1.678-.413 3.083-.822 4.316l-.712-.236a10.255 10.255 0 0 1-.827 1.875 14.242 14.242 0 0 1-1.05 1.585l.596.455a14.997 14.997 0 0 1-2.824 2.824l-.455-.596c-.502.384-1.032.735-1.585 1.05-.579.33-1.196.602-1.875.827l.236.712c-1.233.409-2.638.663-4.316.822l-.07-.747c-1.264.119-2.694.184-4.343.218l.016.75c-1.327.028-2.787.036-4.403.039l-.001-.75-2.204.001h-2.55V60h-5.1v-.75H24.9l-2.204-.001v.75a231.431 231.431 0 0 1-4.404-.039l.016-.75c-1.65-.034-3.08-.099-4.343-.218l-.07.747c-1.678-.159-3.083-.413-4.316-.822l.236-.712a10.258 10.258 0 0 1-1.875-.827 14.252 14.252 0 0 1-1.585-1.05l-.455.596A14.999 14.999 0 0 1 3.076 54.1l.596-.455a14.24 14.24 0 0 1-1.05-1.585 10.259 10.259 0 0 1-.827-1.875l-.712.236C.674 49.188.42 47.783.262 46.105l.746-.07C.89 44.77.824 43.34.79 41.692l-.75.016Z"/><path fill="#fff" fill-rule="evenodd" d="M35.643 32.145c-.297-.743-.445-1.114-.401-1.275a.42.42 0 0 1 .182-.27c.134-.1.463-.1 1.123-.1.742 0 1.499.046 2.236-.05a6 6 0 0 0 5.166-5.166c.051-.39.051-.855.051-1.784 0-.928 0-1.393-.051-1.783a6 6 0 0 0-5.166-5.165c-.39-.052-.854-.052-1.783-.052h-7.72c-4.934 0-7.401 0-9.244 1.051a8 8 0 0 0-2.985 2.986C16.057 22.28 16.003 24.58 16 29 15.998 31.075 16 33.15 16 35.224A7.778 7.778 0 0 0 23.778 43H28.5c1.394 0 2.09 0 2.67-.116a6 6 0 0 0 4.715-4.714c.115-.58.115-1.301.115-2.744 0-1.31 0-1.964-.114-2.49a4.998 4.998 0 0 0-.243-.792Z" clip-rule="evenodd"/><path fill="#9EA9A9" fill-rule="evenodd" d="M37 18h-7.72c-2.494 0-4.266.002-5.647.126-1.361.122-2.197.354-2.854.728a6.5 6.5 0 0 0-2.425 2.426c-.375.657-.607 1.492-.729 2.853-.11 1.233-.123 2.777-.125 4.867 0 .7 0 1.05.097 1.181.096.13.182.181.343.2.163.02.518-.18 1.229-.581a6.195 6.195 0 0 1 3.053-.8H37c.977 0 1.32-.003 1.587-.038a4.5 4.5 0 0 0 3.874-3.874c.036-.268.039-.611.039-1.588 0-.976-.003-1.319-.038-1.587a4.5 4.5 0 0 0-3.875-3.874C38.32 18.004 37.977 18 37 18Zm-7.364 12.5h-7.414a4.722 4.722 0 0 0-4.722 4.723 6.278 6.278 0 0 0 6.278 6.278H28.5c1.466 0 1.98-.008 2.378-.087a4.5 4.5 0 0 0 3.535-3.536c.08-.397.087-.933.087-2.451 0-1.391-.009-1.843-.08-2.17a3.5 3.5 0 0 0-2.676-2.676c-.328-.072-.762-.08-2.108-.08Z" clip-rule="evenodd"/></g><defs><clipPath id="q"><path fill="#fff" d="M0 0h60v60H0z"/></clipPath></defs></svg>`,
  GLOBE_ICON: j`<svg width="16" height="16" fill="none" viewBox="0 0 16 16"><path fill="#fff" fill-rule="evenodd" d="M15.5 8a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Zm-2.113.75c.301 0 .535.264.47.558a6.01 6.01 0 0 1-2.867 3.896c-.203.116-.42-.103-.334-.32.409-1.018.691-2.274.797-3.657a.512.512 0 0 1 .507-.477h1.427Zm.47-2.058c.065.294-.169.558-.47.558H11.96a.512.512 0 0 1-.507-.477c-.106-1.383-.389-2.638-.797-3.656-.087-.217.13-.437.333-.32a6.01 6.01 0 0 1 2.868 3.895Zm-4.402.558c.286 0 .515-.24.49-.525-.121-1.361-.429-2.534-.83-3.393-.279-.6-.549-.93-.753-1.112a.535.535 0 0 0-.724 0c-.204.182-.474.513-.754 1.112-.4.859-.708 2.032-.828 3.393a.486.486 0 0 0 .49.525h2.909Zm-5.415 0c.267 0 .486-.21.507-.477.106-1.383.389-2.638.797-3.656.087-.217-.13-.437-.333-.32a6.01 6.01 0 0 0-2.868 3.895c-.065.294.169.558.47.558H4.04ZM2.143 9.308c-.065-.294.169-.558.47-.558H4.04c.267 0 .486.21.507.477.106 1.383.389 2.639.797 3.657.087.217-.13.436-.333.32a6.01 6.01 0 0 1-2.868-3.896Zm3.913-.033a.486.486 0 0 1 .49-.525h2.909c.286 0 .515.24.49.525-.121 1.361-.428 2.535-.83 3.394-.279.6-.549.93-.753 1.112a.535.535 0 0 1-.724 0c-.204-.182-.474-.513-.754-1.112-.4-.859-.708-2.033-.828-3.394Z" clip-rule="evenodd"/></svg>`
}, Xs = B`.wcm-toolbar-placeholder{top:0;bottom:0;left:0;right:0;width:100%;position:absolute;display:block;pointer-events:none;height:100px;border-radius:calc(var(--wcm-background-border-radius) * .9);background-color:var(--wcm-background-color);background-position:center;background-size:cover}.wcm-toolbar{height:38px;display:flex;position:relative;margin:5px 15px 5px 5px;justify-content:space-between;align-items:center}.wcm-toolbar img,.wcm-toolbar svg{height:28px;object-position:left center;object-fit:contain}#wcm-wc-logo path{fill:var(--wcm-accent-fill-color)}button{width:28px;height:28px;border-radius:var(--wcm-icon-button-border-radius);border:0;display:flex;justify-content:center;align-items:center;cursor:pointer;background-color:var(--wcm-color-bg-1);box-shadow:0 0 0 1px var(--wcm-color-overlay)}button:active{background-color:var(--wcm-color-bg-2)}button svg{display:block;object-position:center}button path{fill:var(--wcm-color-fg-1)}.wcm-toolbar div{display:flex}@media(hover:hover){button:hover{background-color:var(--wcm-color-bg-2)}}`;
var ea = Object.getOwnPropertyDescriptor, ta = (e, t, r, o) => {
  for (var n = o > 1 ? void 0 : o ? ea(t, r) : t, i = e.length - 1, s; i >= 0; i--)
    (s = e[i]) && (n = s(n) || n);
  return n;
};
let Sr = class extends L {
  // -- render ------------------------------------------------------- //
  render() {
    return y`<div class="wcm-toolbar-placeholder"></div><div class="wcm-toolbar">${U.WALLET_CONNECT_LOGO} <button @click="${$e.close}">${U.CROSS_ICON}</button></div>`;
  }
};
Sr.styles = [D.globalCss, Xs];
Sr = ta([
  N("wcm-modal-backcard")
], Sr);
const ra = B`main{padding:20px;padding-top:0;width:100%}`;
var na = Object.getOwnPropertyDescriptor, oa = (e, t, r, o) => {
  for (var n = o > 1 ? void 0 : o ? na(t, r) : t, i = e.length - 1, s; i >= 0; i--)
    (s = e[i]) && (n = s(n) || n);
  return n;
};
let Rr = class extends L {
  // -- render ------------------------------------------------------- //
  render() {
    return y`<main><slot></slot></main>`;
  }
};
Rr.styles = [D.globalCss, ra];
Rr = oa([
  N("wcm-modal-content")
], Rr);
const ia = B`footer{padding:10px;display:flex;flex-direction:column;align-items:inherit;justify-content:inherit;border-top:1px solid var(--wcm-color-bg-2)}`;
var sa = Object.getOwnPropertyDescriptor, aa = (e, t, r, o) => {
  for (var n = o > 1 ? void 0 : o ? sa(t, r) : t, i = e.length - 1, s; i >= 0; i--)
    (s = e[i]) && (n = s(n) || n);
  return n;
};
let Lr = class extends L {
  // -- render ------------------------------------------------------- //
  render() {
    return y`<footer><slot></slot></footer>`;
  }
};
Lr.styles = [D.globalCss, ia];
Lr = aa([
  N("wcm-modal-footer")
], Lr);
const la = B`header{display:flex;justify-content:center;align-items:center;padding:20px;position:relative}.wcm-border{border-bottom:1px solid var(--wcm-color-bg-2);margin-bottom:20px}header button{padding:15px 20px}header button:active{opacity:.5}@media(hover:hover){header button:hover{opacity:.5}}.wcm-back-btn{position:absolute;left:0}.wcm-action-btn{position:absolute;right:0}path{fill:var(--wcm-accent-color)}`;
var ca = Object.defineProperty, da = Object.getOwnPropertyDescriptor, lt = (e, t, r, o) => {
  for (var n = o > 1 ? void 0 : o ? da(t, r) : t, i = e.length - 1, s; i >= 0; i--)
    (s = e[i]) && (n = (o ? s(t, r, n) : s(n)) || n);
  return o && n && ca(t, r, n), n;
};
let Ie = class extends L {
  constructor() {
    super(...arguments), this.title = "", this.onAction = void 0, this.actionIcon = void 0, this.border = !1;
  }
  // -- private ------------------------------------------------------ //
  backBtnTemplate() {
    return y`<button class="wcm-back-btn" @click="${k.goBack}">${U.BACK_ICON}</button>`;
  }
  actionBtnTemplate() {
    return y`<button class="wcm-action-btn" @click="${this.onAction}">${this.actionIcon}</button>`;
  }
  // -- render ------------------------------------------------------- //
  render() {
    const e = {
      "wcm-border": this.border
    }, t = k.state.history.length > 1, r = this.title ? y`<wcm-text variant="big-bold">${this.title}</wcm-text>` : y`<slot></slot>`;
    return y`<header class="${ae(e)}">${t ? this.backBtnTemplate() : null} ${r} ${this.onAction ? this.actionBtnTemplate() : null}</header>`;
  }
};
Ie.styles = [D.globalCss, la];
lt([
  R()
], Ie.prototype, "title", 2);
lt([
  R()
], Ie.prototype, "onAction", 2);
lt([
  R()
], Ie.prototype, "actionIcon", 2);
lt([
  R({ type: Boolean })
], Ie.prototype, "border", 2);
Ie = lt([
  N("wcm-modal-header")
], Ie);
const S = {
  MOBILE_BREAKPOINT: 600,
  WCM_RECENT_WALLET_DATA: "WCM_RECENT_WALLET_DATA",
  EXPLORER_WALLET_URL: "https://explorer.walletconnect.com/?type=wallet",
  getShadowRootElement(e, t) {
    const r = e.renderRoot.querySelector(t);
    if (!r)
      throw new Error(`${t} not found`);
    return r;
  },
  getWalletIcon({ id: e, image_id: t }) {
    const { walletImages: r } = G.state;
    return r?.[e] ? r[e] : t ? K.getWalletImageUrl(t) : "";
  },
  getWalletName(e, t = !1) {
    return t && e.length > 8 ? `${e.substring(0, 8)}..` : e;
  },
  isMobileAnimation() {
    return window.innerWidth <= S.MOBILE_BREAKPOINT;
  },
  async preloadImage(e) {
    const t = new Promise((r, o) => {
      const n = new Image();
      n.onload = r, n.onerror = o, n.crossOrigin = "anonymous", n.src = e;
    });
    return Promise.race([t, x.wait(3e3)]);
  },
  getErrorMessage(e) {
    return e instanceof Error ? e.message : "Unknown Error";
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  debounce(e, t = 500) {
    let r;
    return (...o) => {
      function n() {
        e(...o);
      }
      r && clearTimeout(r), r = setTimeout(n, t);
    };
  },
  handleMobileLinking(e, t = "_self") {
    const { walletConnectUri: r } = H.state, { mobile: o, name: n } = e, i = o?.native, s = o?.universal;
    S.setRecentWallet(e);
    function a(l) {
      if (i) {
        const c = x.formatNativeUrl(i, l, n);
        x.openHref(c, t);
      } else if (s) {
        const c = x.formatUniversalUrl(s, l, n);
        x.openHref(c, t);
      }
    }
    r && a(r);
  },
  handleAndroidLinking() {
    const { walletConnectUri: e } = H.state;
    e && (x.setWalletConnectAndroidDeepLink(e), x.openHref(e, x.isTelegram() ? "_blank" : "_self"));
  },
  async handleUriCopy() {
    const { walletConnectUri: e } = H.state;
    if (e)
      try {
        await navigator.clipboard.writeText(e), ue.openToast("Link copied", "success");
      } catch {
        ue.openToast("Failed to copy", "error");
      }
  },
  getCustomImageUrls() {
    const { walletImages: e } = G.state, t = Object.values(e ?? {});
    return Object.values(t);
  },
  truncate(e, t = 8) {
    return e.length <= t ? e : `${e.substring(0, 4)}...${e.substring(e.length - 4)}`;
  },
  setRecentWallet(e) {
    try {
      localStorage.setItem(S.WCM_RECENT_WALLET_DATA, JSON.stringify(e));
    } catch {
      console.info("Unable to set recent wallet");
    }
  },
  getRecentWallet() {
    try {
      const e = localStorage.getItem(S.WCM_RECENT_WALLET_DATA);
      return e ? JSON.parse(e) : void 0;
    } catch {
      console.info("Unable to get recent wallet");
    }
  },
  caseSafeIncludes(e, t) {
    return e.toUpperCase().includes(t.toUpperCase());
  },
  openWalletExplorerUrl() {
    x.openHref(S.EXPLORER_WALLET_URL, "_blank");
  },
  getCachedRouterWalletPlatforms() {
    const { desktop: e, mobile: t } = x.getWalletRouterData(), r = !!e?.native, o = !!e?.universal, n = !!t?.native || !!t?.universal;
    return { isDesktop: r, isMobile: n, isWeb: o };
  },
  goToConnectingView(e) {
    k.setData({ Wallet: e });
    const t = x.isMobile(), { isDesktop: r, isWeb: o, isMobile: n } = S.getCachedRouterWalletPlatforms();
    t ? n ? (k.push("MobileConnecting"), !x.isAndroid() && x.isTelegram() && this.handleMobileLinking(e, "_blank")) : o ? k.push("WebConnecting") : k.push("InstallWallet") : r ? k.push("DesktopConnecting") : o ? k.push("WebConnecting") : n ? k.push("MobileQrcodeConnecting") : k.push("InstallWallet");
  }
}, ua = B`.wcm-router{overflow:hidden;will-change:transform}.wcm-content{display:flex;flex-direction:column}`;
var ha = Object.defineProperty, ma = Object.getOwnPropertyDescriptor, Jr = (e, t, r, o) => {
  for (var n = o > 1 ? void 0 : o ? ma(t, r) : t, i = e.length - 1, s; i >= 0; i--)
    (s = e[i]) && (n = (o ? s(t, r, n) : s(n)) || n);
  return o && n && ha(t, r, n), n;
};
let it = class extends L {
  // -- lifecycle ---------------------------------------------------- //
  constructor() {
    super(), this.view = k.state.view, this.prevView = k.state.view, this.unsubscribe = void 0, this.oldHeight = "0px", this.resizeObserver = void 0, this.unsubscribe = k.subscribe((e) => {
      this.view !== e.view && this.onChangeRoute();
    });
  }
  firstUpdated() {
    this.resizeObserver = new ResizeObserver(([e]) => {
      const t = `${e.contentRect.height}px`;
      this.oldHeight !== "0px" && Ce(this.routerEl, { height: [this.oldHeight, t] }, { duration: 0.2 }), this.oldHeight = t;
    }), this.resizeObserver.observe(this.contentEl);
  }
  disconnectedCallback() {
    var e, t;
    (e = this.unsubscribe) == null || e.call(this), (t = this.resizeObserver) == null || t.disconnect();
  }
  get routerEl() {
    return S.getShadowRootElement(this, ".wcm-router");
  }
  get contentEl() {
    return S.getShadowRootElement(this, ".wcm-content");
  }
  viewTemplate() {
    switch (this.view) {
      case "ConnectWallet":
        return y`<wcm-connect-wallet-view></wcm-connect-wallet-view>`;
      case "DesktopConnecting":
        return y`<wcm-desktop-connecting-view></wcm-desktop-connecting-view>`;
      case "MobileConnecting":
        return y`<wcm-mobile-connecting-view></wcm-mobile-connecting-view>`;
      case "WebConnecting":
        return y`<wcm-web-connecting-view></wcm-web-connecting-view>`;
      case "MobileQrcodeConnecting":
        return y`<wcm-mobile-qr-connecting-view></wcm-mobile-qr-connecting-view>`;
      case "WalletExplorer":
        return y`<wcm-wallet-explorer-view></wcm-wallet-explorer-view>`;
      case "Qrcode":
        return y`<wcm-qrcode-view></wcm-qrcode-view>`;
      case "InstallWallet":
        return y`<wcm-install-wallet-view></wcm-install-wallet-view>`;
      default:
        return y`<div>Not Found</div>`;
    }
  }
  async onChangeRoute() {
    await Ce(
      this.routerEl,
      { opacity: [1, 0], scale: [1, 1.02] },
      { duration: 0.15, delay: 0.1 }
    ).finished, this.view = k.state.view, Ce(this.routerEl, { opacity: [0, 1], scale: [0.99, 1] }, { duration: 0.37, delay: 0.05 });
  }
  // -- render ------------------------------------------------------- //
  render() {
    return y`<div class="wcm-router"><div class="wcm-content">${this.viewTemplate()}</div></div>`;
  }
};
it.styles = [D.globalCss, ua];
Jr([
  Y()
], it.prototype, "view", 2);
Jr([
  Y()
], it.prototype, "prevView", 2);
it = Jr([
  N("wcm-modal-router")
], it);
const fa = B`div{height:36px;width:max-content;display:flex;justify-content:center;align-items:center;padding:9px 15px 11px;position:absolute;top:12px;box-shadow:0 6px 14px -6px rgba(10,16,31,.3),0 10px 32px -4px rgba(10,16,31,.15);z-index:2;left:50%;transform:translateX(-50%);pointer-events:none;backdrop-filter:blur(20px) saturate(1.8);-webkit-backdrop-filter:blur(20px) saturate(1.8);border-radius:var(--wcm-notification-border-radius);border:1px solid var(--wcm-color-overlay);background-color:var(--wcm-color-overlay)}svg{margin-right:5px}@-moz-document url-prefix(){div{background-color:var(--wcm-color-bg-3)}}.wcm-success path{fill:var(--wcm-accent-color)}.wcm-error path{fill:var(--wcm-error-color)}`;
var pa = Object.defineProperty, ga = Object.getOwnPropertyDescriptor, Do = (e, t, r, o) => {
  for (var n = o > 1 ? void 0 : o ? ga(t, r) : t, i = e.length - 1, s; i >= 0; i--)
    (s = e[i]) && (n = (o ? s(t, r, n) : s(n)) || n);
  return o && n && pa(t, r, n), n;
};
let $t = class extends L {
  constructor() {
    super(), this.open = !1, this.unsubscribe = void 0, this.timeout = void 0, this.unsubscribe = ue.subscribe((e) => {
      e.open ? (this.open = !0, this.timeout = setTimeout(() => ue.closeToast(), 2200)) : (this.open = !1, clearTimeout(this.timeout));
    });
  }
  disconnectedCallback() {
    var e;
    (e = this.unsubscribe) == null || e.call(this), clearTimeout(this.timeout), ue.closeToast();
  }
  // -- render ------------------------------------------------------- //
  render() {
    const { message: e, variant: t } = ue.state, r = {
      "wcm-success": t === "success",
      "wcm-error": t === "error"
    };
    return this.open ? y`<div class="${ae(r)}">${t === "success" ? U.CHECKMARK_ICON : null} ${t === "error" ? U.CROSS_ICON : null}<wcm-text variant="small-regular">${e}</wcm-text></div>` : null;
  }
};
$t.styles = [D.globalCss, fa];
Do([
  Y()
], $t.prototype, "open", 2);
$t = Do([
  N("wcm-modal-toast")
], $t);
const wa = 0.1, co = 2.5, ie = 7;
function vr(e, t, r) {
  return e === t ? !1 : (e - t < 0 ? t - e : e - t) <= r + wa;
}
function va(e, t) {
  const r = Array.prototype.slice.call(
    Us.create(e, { errorCorrectionLevel: t }).modules.data,
    0
  ), o = Math.sqrt(r.length);
  return r.reduce(
    (n, i, s) => (s % o === 0 ? n.push([i]) : n[n.length - 1].push(i)) && n,
    []
  );
}
const ba = {
  generate(e, t, r) {
    const o = "#141414", n = "#ffffff", i = [], s = va(e, "Q"), a = t / s.length, l = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 }
    ];
    l.forEach(({ x: b, y: w }) => {
      const T = (s.length - ie) * a * b, p = (s.length - ie) * a * w, O = 0.45;
      for (let $ = 0; $ < l.length; $ += 1) {
        const A = a * (ie - $ * 2);
        i.push(
          j`<rect fill="${$ % 2 === 0 ? o : n}" height="${A}" rx="${A * O}" ry="${A * O}" width="${A}" x="${T + a * $}" y="${p + a * $}">`
        );
      }
    });
    const c = Math.floor((r + 25) / a), m = s.length / 2 - c / 2, g = s.length / 2 + c / 2 - 1, h = [];
    s.forEach((b, w) => {
      b.forEach((T, p) => {
        if (s[w][p] && !(w < ie && p < ie || w > s.length - (ie + 1) && p < ie || w < ie && p > s.length - (ie + 1)) && !(w > m && w < g && p > m && p < g)) {
          const O = w * a + a / 2, $ = p * a + a / 2;
          h.push([O, $]);
        }
      });
    });
    const f = {};
    return h.forEach(([b, w]) => {
      f[b] ? f[b].push(w) : f[b] = [w];
    }), Object.entries(f).map(([b, w]) => {
      const T = w.filter(
        (p) => w.every((O) => !vr(p, O, a))
      );
      return [Number(b), T];
    }).forEach(([b, w]) => {
      w.forEach((T) => {
        i.push(
          j`<circle cx="${b}" cy="${T}" fill="${o}" r="${a / co}">`
        );
      });
    }), Object.entries(f).filter(([b, w]) => w.length > 1).map(([b, w]) => {
      const T = w.filter((p) => w.some((O) => vr(p, O, a)));
      return [Number(b), T];
    }).map(([b, w]) => {
      w.sort((p, O) => p < O ? -1 : 1);
      const T = [];
      for (const p of w) {
        const O = T.find(
          ($) => $.some((A) => vr(p, A, a))
        );
        O ? O.push(p) : T.push([p]);
      }
      return [b, T.map((p) => [p[0], p[p.length - 1]])];
    }).forEach(([b, w]) => {
      w.forEach(([T, p]) => {
        i.push(
          j`<line x1="${b}" x2="${b}" y1="${T}" y2="${p}" stroke="${o}" stroke-width="${a / (co / 2)}" stroke-linecap="round">`
        );
      });
    }), i;
  }
}, ya = B`@keyframes fadeIn{0%{opacity:0}100%{opacity:1}}div{position:relative;user-select:none;display:block;overflow:hidden;aspect-ratio:1/1;animation:fadeIn ease .2s}.wcm-dark{background-color:#fff;border-radius:var(--wcm-container-border-radius);padding:18px;box-shadow:0 2px 5px #000}svg:first-child,wcm-wallet-image{position:absolute;top:50%;left:50%;transform:translateY(-50%) translateX(-50%)}wcm-wallet-image{transform:translateY(-50%) translateX(-50%)}wcm-wallet-image{width:25%;height:25%;border-radius:var(--wcm-wallet-icon-border-radius)}svg:first-child{transform:translateY(-50%) translateX(-50%) scale(.9)}svg:first-child path:first-child{fill:var(--wcm-accent-color)}svg:first-child path:last-child{stroke:var(--wcm-color-overlay)}`;
var _a = Object.defineProperty, xa = Object.getOwnPropertyDescriptor, Ze = (e, t, r, o) => {
  for (var n = o > 1 ? void 0 : o ? xa(t, r) : t, i = e.length - 1, s; i >= 0; i--)
    (s = e[i]) && (n = (o ? s(t, r, n) : s(n)) || n);
  return o && n && _a(t, r, n), n;
};
let se = class extends L {
  constructor() {
    super(...arguments), this.uri = "", this.size = 0, this.imageId = void 0, this.walletId = void 0, this.imageUrl = void 0;
  }
  // -- private ------------------------------------------------------ //
  svgTemplate() {
    const t = fe.state.themeMode === "light" ? this.size : this.size - 36;
    return j`<svg height="${t}" width="${t}">${ba.generate(this.uri, t, t / 4)}</svg>`;
  }
  // -- render ------------------------------------------------------- //
  render() {
    const e = {
      "wcm-dark": fe.state.themeMode === "dark"
    };
    return y`<div style="${`width: ${this.size}px`}" class="${ae(e)}">${this.walletId || this.imageUrl ? y`<wcm-wallet-image walletId="${q(this.walletId)}" imageId="${q(this.imageId)}" imageUrl="${q(this.imageUrl)}"></wcm-wallet-image>` : U.WALLET_CONNECT_ICON_COLORED} ${this.svgTemplate()}</div>`;
  }
};
se.styles = [D.globalCss, ya];
Ze([
  R()
], se.prototype, "uri", 2);
Ze([
  R({ type: Number })
], se.prototype, "size", 2);
Ze([
  R()
], se.prototype, "imageId", 2);
Ze([
  R()
], se.prototype, "walletId", 2);
Ze([
  R()
], se.prototype, "imageUrl", 2);
se = Ze([
  N("wcm-qrcode")
], se);
const Ca = B`:host{position:relative;height:28px;width:80%}input{width:100%;height:100%;line-height:28px!important;border-radius:var(--wcm-input-border-radius);font-style:normal;font-family:-apple-system,system-ui,BlinkMacSystemFont,'Segoe UI',Roboto,Ubuntu,'Helvetica Neue',sans-serif;font-feature-settings:'case' on;font-weight:500;font-size:16px;letter-spacing:-.03em;padding:0 10px 0 34px;transition:.2s all ease;color:var(--wcm-color-fg-1);background-color:var(--wcm-color-bg-3);box-shadow:inset 0 0 0 1px var(--wcm-color-overlay);caret-color:var(--wcm-accent-color)}input::placeholder{color:var(--wcm-color-fg-2)}svg{left:10px;top:4px;pointer-events:none;position:absolute;width:20px;height:20px}input:focus-within{box-shadow:inset 0 0 0 1px var(--wcm-accent-color)}path{fill:var(--wcm-color-fg-2)}`;
var $a = Object.defineProperty, Ea = Object.getOwnPropertyDescriptor, Wo = (e, t, r, o) => {
  for (var n = o > 1 ? void 0 : o ? Ea(t, r) : t, i = e.length - 1, s; i >= 0; i--)
    (s = e[i]) && (n = (o ? s(t, r, n) : s(n)) || n);
  return o && n && $a(t, r, n), n;
};
let Et = class extends L {
  constructor() {
    super(...arguments), this.onChange = () => null;
  }
  // -- render ------------------------------------------------------- //
  render() {
    return y`<input type="text" @input="${this.onChange}" placeholder="Search wallets"> ${U.SEARCH_ICON}`;
  }
};
Et.styles = [D.globalCss, Ca];
Wo([
  R()
], Et.prototype, "onChange", 2);
Et = Wo([
  N("wcm-search-input")
], Et);
const Aa = B`@keyframes rotate{100%{transform:rotate(360deg)}}@keyframes dash{0%{stroke-dasharray:1,150;stroke-dashoffset:0}50%{stroke-dasharray:90,150;stroke-dashoffset:-35}100%{stroke-dasharray:90,150;stroke-dashoffset:-124}}svg{animation:rotate 2s linear infinite;display:flex;justify-content:center;align-items:center}svg circle{stroke-linecap:round;animation:dash 1.5s ease infinite;stroke:var(--wcm-accent-color)}`;
var Ia = Object.getOwnPropertyDescriptor, Oa = (e, t, r, o) => {
  for (var n = o > 1 ? void 0 : o ? Ia(t, r) : t, i = e.length - 1, s; i >= 0; i--)
    (s = e[i]) && (n = s(n) || n);
  return n;
};
let Dr = class extends L {
  // -- render ------------------------------------------------------- //
  render() {
    return y`<svg viewBox="0 0 50 50" width="24" height="24"><circle cx="25" cy="25" r="20" fill="none" stroke-width="4" stroke="#fff"/></svg>`;
  }
};
Dr.styles = [D.globalCss, Aa];
Dr = Oa([
  N("wcm-spinner")
], Dr);
const Pa = B`span{font-style:normal;font-family:var(--wcm-font-family);font-feature-settings:var(--wcm-font-feature-settings)}.wcm-xsmall-bold{font-family:var(--wcm-text-xsmall-bold-font-family);font-weight:var(--wcm-text-xsmall-bold-weight);font-size:var(--wcm-text-xsmall-bold-size);line-height:var(--wcm-text-xsmall-bold-line-height);letter-spacing:var(--wcm-text-xsmall-bold-letter-spacing);text-transform:var(--wcm-text-xsmall-bold-text-transform)}.wcm-xsmall-regular{font-family:var(--wcm-text-xsmall-regular-font-family);font-weight:var(--wcm-text-xsmall-regular-weight);font-size:var(--wcm-text-xsmall-regular-size);line-height:var(--wcm-text-xsmall-regular-line-height);letter-spacing:var(--wcm-text-xsmall-regular-letter-spacing);text-transform:var(--wcm-text-xsmall-regular-text-transform)}.wcm-small-thin{font-family:var(--wcm-text-small-thin-font-family);font-weight:var(--wcm-text-small-thin-weight);font-size:var(--wcm-text-small-thin-size);line-height:var(--wcm-text-small-thin-line-height);letter-spacing:var(--wcm-text-small-thin-letter-spacing);text-transform:var(--wcm-text-small-thin-text-transform)}.wcm-small-regular{font-family:var(--wcm-text-small-regular-font-family);font-weight:var(--wcm-text-small-regular-weight);font-size:var(--wcm-text-small-regular-size);line-height:var(--wcm-text-small-regular-line-height);letter-spacing:var(--wcm-text-small-regular-letter-spacing);text-transform:var(--wcm-text-small-regular-text-transform)}.wcm-medium-regular{font-family:var(--wcm-text-medium-regular-font-family);font-weight:var(--wcm-text-medium-regular-weight);font-size:var(--wcm-text-medium-regular-size);line-height:var(--wcm-text-medium-regular-line-height);letter-spacing:var(--wcm-text-medium-regular-letter-spacing);text-transform:var(--wcm-text-medium-regular-text-transform)}.wcm-big-bold{font-family:var(--wcm-text-big-bold-font-family);font-weight:var(--wcm-text-big-bold-weight);font-size:var(--wcm-text-big-bold-size);line-height:var(--wcm-text-big-bold-line-height);letter-spacing:var(--wcm-text-big-bold-letter-spacing);text-transform:var(--wcm-text-big-bold-text-transform)}:host(*){color:var(--wcm-color-fg-1)}.wcm-color-primary{color:var(--wcm-color-fg-1)}.wcm-color-secondary{color:var(--wcm-color-fg-2)}.wcm-color-tertiary{color:var(--wcm-color-fg-3)}.wcm-color-inverse{color:var(--wcm-accent-fill-color)}.wcm-color-accnt{color:var(--wcm-accent-color)}.wcm-color-error{color:var(--wcm-error-color)}`;
var Ma = Object.defineProperty, Ta = Object.getOwnPropertyDescriptor, Xr = (e, t, r, o) => {
  for (var n = o > 1 ? void 0 : o ? Ta(t, r) : t, i = e.length - 1, s; i >= 0; i--)
    (s = e[i]) && (n = (o ? s(t, r, n) : s(n)) || n);
  return o && n && Ma(t, r, n), n;
};
let st = class extends L {
  constructor() {
    super(...arguments), this.variant = "medium-regular", this.color = "primary";
  }
  // -- render ------------------------------------------------------- //
  render() {
    const e = {
      "wcm-big-bold": this.variant === "big-bold",
      "wcm-medium-regular": this.variant === "medium-regular",
      "wcm-small-regular": this.variant === "small-regular",
      "wcm-small-thin": this.variant === "small-thin",
      "wcm-xsmall-regular": this.variant === "xsmall-regular",
      "wcm-xsmall-bold": this.variant === "xsmall-bold",
      "wcm-color-primary": this.color === "primary",
      "wcm-color-secondary": this.color === "secondary",
      "wcm-color-tertiary": this.color === "tertiary",
      "wcm-color-inverse": this.color === "inverse",
      "wcm-color-accnt": this.color === "accent",
      "wcm-color-error": this.color === "error"
    };
    return y`<span><slot class="${ae(e)}"></slot></span>`;
  }
};
st.styles = [D.globalCss, Pa];
Xr([
  R()
], st.prototype, "variant", 2);
Xr([
  R()
], st.prototype, "color", 2);
st = Xr([
  N("wcm-text")
], st);
const Sa = B`button{width:100%;height:100%;border-radius:var(--wcm-button-hover-highlight-border-radius);display:flex;align-items:flex-start}button:active{background-color:var(--wcm-color-overlay)}@media(hover:hover){button:hover{background-color:var(--wcm-color-overlay)}}button>div{width:80px;padding:5px 0;display:flex;flex-direction:column;align-items:center}wcm-text{width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:center}wcm-wallet-image{height:60px;width:60px;transition:all .2s ease;border-radius:var(--wcm-wallet-icon-border-radius);margin-bottom:5px}.wcm-sublabel{margin-top:2px}`;
var Ra = Object.defineProperty, La = Object.getOwnPropertyDescriptor, ve = (e, t, r, o) => {
  for (var n = o > 1 ? void 0 : o ? La(t, r) : t, i = e.length - 1, s; i >= 0; i--)
    (s = e[i]) && (n = (o ? s(t, r, n) : s(n)) || n);
  return o && n && Ra(t, r, n), n;
};
let re = class extends L {
  constructor() {
    super(...arguments), this.onClick = () => null, this.name = "", this.walletId = "", this.label = void 0, this.imageId = void 0, this.installed = !1, this.recent = !1;
  }
  // -- private ------------------------------------------------------ //
  sublabelTemplate() {
    return this.recent ? y`<wcm-text class="wcm-sublabel" variant="xsmall-bold" color="tertiary">RECENT</wcm-text>` : this.installed ? y`<wcm-text class="wcm-sublabel" variant="xsmall-bold" color="tertiary">INSTALLED</wcm-text>` : null;
  }
  handleClick() {
    ho.click({ name: "WALLET_BUTTON", walletId: this.walletId }), this.onClick();
  }
  // -- render ------------------------------------------------------- //
  render() {
    var e;
    return y`<button @click="${this.handleClick.bind(this)}"><div><wcm-wallet-image walletId="${this.walletId}" imageId="${q(this.imageId)}"></wcm-wallet-image><wcm-text variant="xsmall-regular">${(e = this.label) != null ? e : S.getWalletName(this.name, !0)}</wcm-text>${this.sublabelTemplate()}</div></button>`;
  }
};
re.styles = [D.globalCss, Sa];
ve([
  R()
], re.prototype, "onClick", 2);
ve([
  R()
], re.prototype, "name", 2);
ve([
  R()
], re.prototype, "walletId", 2);
ve([
  R()
], re.prototype, "label", 2);
ve([
  R()
], re.prototype, "imageId", 2);
ve([
  R({ type: Boolean })
], re.prototype, "installed", 2);
ve([
  R({ type: Boolean })
], re.prototype, "recent", 2);
re = ve([
  N("wcm-wallet-button")
], re);
const Da = B`:host{display:block}div{overflow:hidden;position:relative;border-radius:inherit;width:100%;height:100%;background-color:var(--wcm-color-overlay)}svg{position:relative;width:100%;height:100%}div::after{content:'';position:absolute;top:0;bottom:0;left:0;right:0;border-radius:inherit;border:1px solid var(--wcm-color-overlay)}div img{width:100%;height:100%;object-fit:cover;object-position:center}#wallet-placeholder-fill{fill:var(--wcm-color-bg-3)}#wallet-placeholder-dash{stroke:var(--wcm-color-overlay)}`;
var Wa = Object.defineProperty, Na = Object.getOwnPropertyDescriptor, Mt = (e, t, r, o) => {
  for (var n = o > 1 ? void 0 : o ? Na(t, r) : t, i = e.length - 1, s; i >= 0; i--)
    (s = e[i]) && (n = (o ? s(t, r, n) : s(n)) || n);
  return o && n && Wa(t, r, n), n;
};
let Ve = class extends L {
  constructor() {
    super(...arguments), this.walletId = "", this.imageId = void 0, this.imageUrl = void 0;
  }
  // -- render ------------------------------------------------------- //
  render() {
    var e;
    const t = (e = this.imageUrl) != null && e.length ? this.imageUrl : S.getWalletIcon({ id: this.walletId, image_id: this.imageId });
    return y`${t.length ? y`<div><img crossorigin="anonymous" src="${t}" alt="${this.id}"></div>` : U.WALLET_PLACEHOLDER}`;
  }
};
Ve.styles = [D.globalCss, Da];
Mt([
  R()
], Ve.prototype, "walletId", 2);
Mt([
  R()
], Ve.prototype, "imageId", 2);
Mt([
  R()
], Ve.prototype, "imageUrl", 2);
Ve = Mt([
  N("wcm-wallet-image")
], Ve);
var Ba = Object.defineProperty, Ua = Object.getOwnPropertyDescriptor, No = (e, t, r, o) => {
  for (var n = o > 1 ? void 0 : o ? Ua(t, r) : t, i = e.length - 1, s; i >= 0; i--)
    (s = e[i]) && (n = (o ? s(t, r, n) : s(n)) || n);
  return o && n && Ba(t, r, n), n;
};
let Wr = class extends L {
  // -- lifecycle ---------------------------------------------------- //
  constructor() {
    super(), this.preload = !0, this.preloadData();
  }
  // -- private ------------------------------------------------------ //
  async loadImages(e) {
    try {
      e?.length && await Promise.all(e.map(async (t) => S.preloadImage(t)));
    } catch {
      console.info("Unsuccessful attempt at preloading some images", e);
    }
  }
  async preloadListings() {
    if (G.state.enableExplorer) {
      await K.getRecomendedWallets(), H.setIsDataLoaded(!0);
      const { recomendedWallets: e } = K.state, t = e.map((r) => S.getWalletIcon(r));
      await this.loadImages(t);
    } else
      H.setIsDataLoaded(!0);
  }
  async preloadCustomImages() {
    const e = S.getCustomImageUrls();
    await this.loadImages(e);
  }
  async preloadData() {
    try {
      this.preload && (this.preload = !1, await Promise.all([this.preloadListings(), this.preloadCustomImages()]));
    } catch (e) {
      console.error(e), ue.openToast("Failed preloading", "error");
    }
  }
};
No([
  Y()
], Wr.prototype, "preload", 2);
Wr = No([
  N("wcm-explorer-context")
], Wr);
var ka = Object.getOwnPropertyDescriptor, ja = (e, t, r, o) => {
  for (var n = o > 1 ? void 0 : o ? ka(t, r) : t, i = e.length - 1, s; i >= 0; i--)
    (s = e[i]) && (n = s(n) || n);
  return n;
};
let uo = class extends L {
  // -- lifecycle ---------------------------------------------------- //
  constructor() {
    super(), this.unsubscribeTheme = void 0, D.setTheme(), this.unsubscribeTheme = fe.subscribe(D.setTheme);
  }
  disconnectedCallback() {
    var e;
    (e = this.unsubscribeTheme) == null || e.call(this);
  }
};
uo = ja([
  N("wcm-theme-context")
], uo);
const Ha = B`@keyframes scroll{0%{transform:translate3d(0,0,0)}100%{transform:translate3d(calc(-70px * 9),0,0)}}.wcm-slider{position:relative;overflow-x:hidden;padding:10px 0;margin:0 -20px;width:calc(100% + 40px)}.wcm-track{display:flex;width:calc(70px * 18);animation:scroll 20s linear infinite;opacity:.7}.wcm-track svg{margin:0 5px}wcm-wallet-image{width:60px;height:60px;margin:0 5px;border-radius:var(--wcm-wallet-icon-border-radius)}.wcm-grid{display:grid;grid-template-columns:repeat(4,80px);justify-content:space-between}.wcm-title{display:flex;align-items:center;margin-bottom:10px}.wcm-title svg{margin-right:6px}.wcm-title path{fill:var(--wcm-accent-color)}wcm-modal-footer .wcm-title{padding:0 10px}wcm-button-big{position:absolute;top:50%;left:50%;transform:translateY(-50%) translateX(-50%);filter:drop-shadow(0 0 17px var(--wcm-color-bg-1))}wcm-info-footer{flex-direction:column;align-items:center;display:flex;width:100%;padding:5px 0}wcm-info-footer wcm-text{text-align:center;margin-bottom:15px}#wallet-placeholder-fill{fill:var(--wcm-color-bg-3)}#wallet-placeholder-dash{stroke:var(--wcm-color-overlay)}`;
var Va = Object.getOwnPropertyDescriptor, za = (e, t, r, o) => {
  for (var n = o > 1 ? void 0 : o ? Va(t, r) : t, i = e.length - 1, s; i >= 0; i--)
    (s = e[i]) && (n = s(n) || n);
  return n;
};
let Nr = class extends L {
  // -- private ------------------------------------------------------ //
  onGoToQrcode() {
    k.push("Qrcode");
  }
  // -- render ------------------------------------------------------- //
  render() {
    const { recomendedWallets: e } = K.state, t = [...e, ...e], r = x.RECOMMENDED_WALLET_AMOUNT * 2;
    return y`<wcm-modal-header title="Connect your wallet" .onAction="${this.onGoToQrcode}" .actionIcon="${U.QRCODE_ICON}"></wcm-modal-header><wcm-modal-content><div class="wcm-title">${U.MOBILE_ICON}<wcm-text variant="small-regular" color="accent">WalletConnect</wcm-text></div><div class="wcm-slider"><div class="wcm-track">${[...Array(r)].map((o, n) => {
      const i = t[n % t.length];
      return i ? y`<wcm-wallet-image walletId="${i.id}" imageId="${i.image_id}"></wcm-wallet-image>` : U.WALLET_PLACEHOLDER;
    })}</div><wcm-button-big @click="${S.handleAndroidLinking}"><wcm-text variant="medium-regular" color="inverse">Select Wallet</wcm-text></wcm-button-big></div></wcm-modal-content><wcm-info-footer><wcm-text color="secondary" variant="small-thin">Choose WalletConnect to see supported apps on your device</wcm-text></wcm-info-footer>`;
  }
};
Nr.styles = [D.globalCss, Ha];
Nr = za([
  N("wcm-android-wallet-selection")
], Nr);
const Fa = B`@keyframes loading{to{stroke-dashoffset:0}}@keyframes shake{10%,90%{transform:translate3d(-1px,0,0)}20%,80%{transform:translate3d(1px,0,0)}30%,50%,70%{transform:translate3d(-2px,0,0)}40%,60%{transform:translate3d(2px,0,0)}}:host{display:flex;flex-direction:column;align-items:center}div{position:relative;width:110px;height:110px;display:flex;justify-content:center;align-items:center;margin:40px 0 20px 0;transform:translate3d(0,0,0)}svg{position:absolute;width:110px;height:110px;fill:none;stroke:transparent;stroke-linecap:round;stroke-width:2px;top:0;left:0}use{stroke:var(--wcm-accent-color);animation:loading 1s linear infinite}wcm-wallet-image{border-radius:var(--wcm-wallet-icon-large-border-radius);width:90px;height:90px}wcm-text{margin-bottom:40px}.wcm-error svg{stroke:var(--wcm-error-color)}.wcm-error use{display:none}.wcm-error{animation:shake .4s cubic-bezier(.36,.07,.19,.97) both}.wcm-stale svg,.wcm-stale use{display:none}`;
var qa = Object.defineProperty, Za = Object.getOwnPropertyDescriptor, Ke = (e, t, r, o) => {
  for (var n = o > 1 ? void 0 : o ? Za(t, r) : t, i = e.length - 1, s; i >= 0; i--)
    (s = e[i]) && (n = (o ? s(t, r, n) : s(n)) || n);
  return o && n && qa(t, r, n), n;
};
let ge = class extends L {
  constructor() {
    super(...arguments), this.walletId = void 0, this.imageId = void 0, this.isError = !1, this.isStale = !1, this.label = "";
  }
  // -- private ------------------------------------------------------ //
  svgLoaderTemplate() {
    var e, t;
    const i = (t = (e = fe.state.themeVariables) == null ? void 0 : e["--wcm-wallet-icon-large-border-radius"]) != null ? t : D.getPreset("--wcm-wallet-icon-large-border-radius");
    let s = 0;
    i.includes("%") ? s = 88 / 100 * parseInt(i, 10) : s = parseInt(i, 10), s *= 1.17;
    const a = 317 - s * 1.57, l = 425 - s * 1.8;
    return y`<svg viewBox="0 0 110 110" width="110" height="110"><rect id="wcm-loader" x="2" y="2" width="106" height="106" rx="${s}"/><use xlink:href="#wcm-loader" stroke-dasharray="106 ${a}" stroke-dashoffset="${l}"></use></svg>`;
  }
  // -- render ------------------------------------------------------- //
  render() {
    const e = {
      "wcm-error": this.isError,
      "wcm-stale": this.isStale
    };
    return y`<div class="${ae(e)}">${this.svgLoaderTemplate()}<wcm-wallet-image walletId="${q(this.walletId)}" imageId="${q(this.imageId)}"></wcm-wallet-image></div><wcm-text variant="medium-regular" color="${this.isError ? "error" : "primary"}">${this.isError ? "Connection declined" : this.label}</wcm-text>`;
  }
};
ge.styles = [D.globalCss, Fa];
Ke([
  R()
], ge.prototype, "walletId", 2);
Ke([
  R()
], ge.prototype, "imageId", 2);
Ke([
  R({ type: Boolean })
], ge.prototype, "isError", 2);
Ke([
  R({ type: Boolean })
], ge.prototype, "isStale", 2);
Ke([
  R()
], ge.prototype, "label", 2);
ge = Ke([
  N("wcm-connector-waiting")
], ge);
const Ue = {
  manualWallets() {
    var e, t;
    const { mobileWallets: r, desktopWallets: o } = G.state, n = (e = Ue.recentWallet()) == null ? void 0 : e.id, i = x.isMobile() ? r : o, s = i?.filter((a) => n !== a.id);
    return (t = x.isMobile() ? s?.map(({ id: a, name: l, links: c }) => ({ id: a, name: l, mobile: c, links: c })) : s?.map(({ id: a, name: l, links: c }) => ({ id: a, name: l, desktop: c, links: c }))) != null ? t : [];
  },
  recentWallet() {
    return S.getRecentWallet();
  },
  recomendedWallets(e = !1) {
    var t;
    const r = e || (t = Ue.recentWallet()) == null ? void 0 : t.id, { recomendedWallets: o } = K.state;
    return o.filter((i) => r !== i.id);
  }
}, me = {
  onConnecting(e) {
    S.goToConnectingView(e);
  },
  manualWalletsTemplate() {
    return Ue.manualWallets().map(
      (t) => y`<wcm-wallet-button walletId="${t.id}" name="${t.name}" .onClick="${() => this.onConnecting(t)}"></wcm-wallet-button>`
    );
  },
  recomendedWalletsTemplate(e = !1) {
    return Ue.recomendedWallets(e).map(
      (r) => y`<wcm-wallet-button name="${r.name}" walletId="${r.id}" imageId="${r.image_id}" .onClick="${() => this.onConnecting(r)}"></wcm-wallet-button>`
    );
  },
  recentWalletTemplate() {
    const e = Ue.recentWallet();
    if (e)
      return y`<wcm-wallet-button name="${e.name}" walletId="${e.id}" imageId="${q(e.image_id)}" .recent="${!0}" .onClick="${() => this.onConnecting(e)}"></wcm-wallet-button>`;
  }
}, Ka = B`.wcm-grid{display:grid;grid-template-columns:repeat(4,80px);justify-content:space-between}.wcm-desktop-title,.wcm-mobile-title{display:flex;align-items:center}.wcm-mobile-title{justify-content:space-between;margin-bottom:20px;margin-top:-10px}.wcm-desktop-title{margin-bottom:10px;padding:0 10px}.wcm-subtitle{display:flex;align-items:center}.wcm-subtitle:last-child path{fill:var(--wcm-color-fg-3)}.wcm-desktop-title svg,.wcm-mobile-title svg{margin-right:6px}.wcm-desktop-title path,.wcm-mobile-title path{fill:var(--wcm-accent-color)}`;
var Ya = Object.getOwnPropertyDescriptor, Qa = (e, t, r, o) => {
  for (var n = o > 1 ? void 0 : o ? Ya(t, r) : t, i = e.length - 1, s; i >= 0; i--)
    (s = e[i]) && (n = s(n) || n);
  return n;
};
let Br = class extends L {
  // -- render ------------------------------------------------------- //
  render() {
    const { explorerExcludedWalletIds: e, enableExplorer: t } = G.state, r = e !== "ALL" && t, o = me.manualWalletsTemplate(), n = me.recomendedWalletsTemplate();
    let s = [me.recentWalletTemplate(), ...o, ...n];
    s = s.filter(Boolean);
    const a = s.length > 4 || r;
    let l = [];
    a ? l = s.slice(0, 3) : l = s;
    const c = !!l.length;
    return y`<wcm-modal-header .border="${!0}" title="Connect your wallet" .onAction="${S.handleUriCopy}" .actionIcon="${U.COPY_ICON}"></wcm-modal-header><wcm-modal-content><div class="wcm-mobile-title"><div class="wcm-subtitle">${U.MOBILE_ICON}<wcm-text variant="small-regular" color="accent">Mobile</wcm-text></div><div class="wcm-subtitle">${U.SCAN_ICON}<wcm-text variant="small-regular" color="secondary">Scan with your wallet</wcm-text></div></div><wcm-walletconnect-qr></wcm-walletconnect-qr></wcm-modal-content>${c ? y`<wcm-modal-footer><div class="wcm-desktop-title">${U.DESKTOP_ICON}<wcm-text variant="small-regular" color="accent">Desktop</wcm-text></div><div class="wcm-grid">${l} ${a ? y`<wcm-view-all-wallets-button></wcm-view-all-wallets-button>` : null}</div></wcm-modal-footer>` : null}`;
  }
};
Br.styles = [D.globalCss, Ka];
Br = Qa([
  N("wcm-desktop-wallet-selection")
], Br);
const Ga = B`div{background-color:var(--wcm-color-bg-2);padding:10px 20px 15px 20px;border-top:1px solid var(--wcm-color-bg-3);text-align:center}a{color:var(--wcm-accent-color);text-decoration:none;transition:opacity .2s ease-in-out;display:inline}a:active{opacity:.8}@media(hover:hover){a:hover{opacity:.8}}`;
var Ja = Object.getOwnPropertyDescriptor, Xa = (e, t, r, o) => {
  for (var n = o > 1 ? void 0 : o ? Ja(t, r) : t, i = e.length - 1, s; i >= 0; i--)
    (s = e[i]) && (n = s(n) || n);
  return n;
};
let Ur = class extends L {
  // -- render ------------------------------------------------------- //
  render() {
    const { termsOfServiceUrl: e, privacyPolicyUrl: t } = G.state;
    return e ?? t ? y`<div><wcm-text variant="small-regular" color="secondary">By connecting your wallet to this app, you agree to the app's ${e ? y`<a href="${e}" target="_blank" rel="noopener noreferrer">Terms of Service</a>` : null} ${e && t ? "and" : null} ${t ? y`<a href="${t}" target="_blank" rel="noopener noreferrer">Privacy Policy</a>` : null}</wcm-text></div>` : null;
  }
};
Ur.styles = [D.globalCss, Ga];
Ur = Xa([
  N("wcm-legal-notice")
], Ur);
const el = B`div{display:grid;grid-template-columns:repeat(4,80px);margin:0 -10px;justify-content:space-between;row-gap:10px}`;
var tl = Object.getOwnPropertyDescriptor, rl = (e, t, r, o) => {
  for (var n = o > 1 ? void 0 : o ? tl(t, r) : t, i = e.length - 1, s; i >= 0; i--)
    (s = e[i]) && (n = s(n) || n);
  return n;
};
let kr = class extends L {
  // -- private ------------------------------------------------------ //
  onQrcode() {
    k.push("Qrcode");
  }
  // -- render ------------------------------------------------------- //
  render() {
    const { explorerExcludedWalletIds: e, enableExplorer: t } = G.state, r = e !== "ALL" && t, o = me.manualWalletsTemplate(), n = me.recomendedWalletsTemplate();
    let s = [me.recentWalletTemplate(), ...o, ...n];
    s = s.filter(Boolean);
    const a = s.length > 8 || r;
    let l = [];
    a ? l = s.slice(0, 7) : l = s;
    const c = !!l.length;
    return y`<wcm-modal-header title="Connect your wallet" .onAction="${this.onQrcode}" .actionIcon="${U.QRCODE_ICON}"></wcm-modal-header>${c ? y`<wcm-modal-content><div>${l} ${a ? y`<wcm-view-all-wallets-button></wcm-view-all-wallets-button>` : null}</div></wcm-modal-content>` : null}`;
  }
};
kr.styles = [D.globalCss, el];
kr = rl([
  N("wcm-mobile-wallet-selection")
], kr);
const nl = B`:host{all:initial}.wcm-overlay{top:0;bottom:0;left:0;right:0;position:fixed;z-index:var(--wcm-z-index);overflow:hidden;display:flex;justify-content:center;align-items:center;opacity:0;pointer-events:none;background-color:var(--wcm-overlay-background-color);backdrop-filter:var(--wcm-overlay-backdrop-filter)}@media(max-height:720px) and (orientation:landscape){.wcm-overlay{overflow:scroll;align-items:flex-start;padding:20px 0}}.wcm-active{pointer-events:auto}.wcm-container{position:relative;max-width:360px;width:100%;outline:0;border-radius:var(--wcm-background-border-radius) var(--wcm-background-border-radius) var(--wcm-container-border-radius) var(--wcm-container-border-radius);border:1px solid var(--wcm-color-overlay);overflow:hidden}.wcm-card{width:100%;position:relative;border-radius:var(--wcm-container-border-radius);overflow:hidden;box-shadow:0 6px 14px -6px rgba(10,16,31,.12),0 10px 32px -4px rgba(10,16,31,.1),0 0 0 1px var(--wcm-color-overlay);background-color:var(--wcm-color-bg-1);color:var(--wcm-color-fg-1)}@media(max-width:600px){.wcm-container{max-width:440px;border-radius:var(--wcm-background-border-radius) var(--wcm-background-border-radius) 0 0}.wcm-card{border-radius:var(--wcm-container-border-radius) var(--wcm-container-border-radius) 0 0}.wcm-overlay{align-items:flex-end}}@media(max-width:440px){.wcm-container{border:0}}`;
var ol = Object.defineProperty, il = Object.getOwnPropertyDescriptor, en = (e, t, r, o) => {
  for (var n = o > 1 ? void 0 : o ? il(t, r) : t, i = e.length - 1, s; i >= 0; i--)
    (s = e[i]) && (n = (o ? s(t, r, n) : s(n)) || n);
  return o && n && ol(t, r, n), n;
};
let ze = class extends L {
  // -- lifecycle ---------------------------------------------------- //
  constructor() {
    super(), this.open = !1, this.active = !1, this.unsubscribeModal = void 0, this.abortController = void 0, this.unsubscribeModal = $e.subscribe((e) => {
      e.open ? this.onOpenModalEvent() : this.onCloseModalEvent();
    });
  }
  disconnectedCallback() {
    var e;
    (e = this.unsubscribeModal) == null || e.call(this);
  }
  get overlayEl() {
    return S.getShadowRootElement(this, ".wcm-overlay");
  }
  get containerEl() {
    return S.getShadowRootElement(this, ".wcm-container");
  }
  toggleBodyScroll(e) {
    if (document.querySelector("body"))
      if (e) {
        const r = document.getElementById("wcm-styles");
        r?.remove();
      } else
        document.head.insertAdjacentHTML(
          "beforeend",
          '<style id="wcm-styles">html,body{touch-action:none;overflow:hidden;overscroll-behavior:contain;}</style>'
        );
  }
  onCloseModal(e) {
    e.target === e.currentTarget && $e.close();
  }
  onOpenModalEvent() {
    this.toggleBodyScroll(!1), this.addKeyboardEvents(), this.open = !0, setTimeout(async () => {
      const e = S.isMobileAnimation() ? { y: ["50vh", "0vh"] } : { scale: [0.98, 1] }, t = 0.1, r = 0.2;
      await Promise.all([
        Ce(this.overlayEl, { opacity: [0, 1] }, { delay: t, duration: r }).finished,
        Ce(this.containerEl, e, { delay: t, duration: r }).finished
      ]), this.active = !0;
    }, 0);
  }
  async onCloseModalEvent() {
    this.toggleBodyScroll(!0), this.removeKeyboardEvents();
    const e = S.isMobileAnimation() ? { y: ["0vh", "50vh"] } : { scale: [1, 0.98] }, t = 0.2;
    await Promise.all([
      Ce(this.overlayEl, { opacity: [1, 0] }, { duration: t }).finished,
      Ce(this.containerEl, e, { duration: t }).finished
    ]), this.containerEl.removeAttribute("style"), this.active = !1, this.open = !1;
  }
  addKeyboardEvents() {
    this.abortController = new AbortController(), window.addEventListener(
      "keydown",
      (e) => {
        var t;
        e.key === "Escape" ? $e.close() : e.key === "Tab" && ((t = e.target) != null && t.tagName.includes("wcm-") || this.containerEl.focus());
      },
      this.abortController
    ), this.containerEl.focus();
  }
  removeKeyboardEvents() {
    var e;
    (e = this.abortController) == null || e.abort(), this.abortController = void 0;
  }
  // -- render ------------------------------------------------------- //
  render() {
    const e = {
      "wcm-overlay": !0,
      "wcm-active": this.active
    };
    return y`<wcm-explorer-context></wcm-explorer-context><wcm-theme-context></wcm-theme-context><div id="wcm-modal" class="${ae(e)}" @click="${this.onCloseModal}" role="alertdialog" aria-modal="true"><div class="wcm-container" tabindex="0">${this.open ? y`<wcm-modal-backcard></wcm-modal-backcard><div class="wcm-card"><wcm-modal-router></wcm-modal-router><wcm-modal-toast></wcm-modal-toast></div>` : null}</div></div>`;
  }
};
ze.styles = [D.globalCss, nl];
en([
  Y()
], ze.prototype, "open", 2);
en([
  Y()
], ze.prototype, "active", 2);
ze = en([
  N("wcm-modal")
], ze);
const sl = B`div{display:flex;margin-top:15px}slot{display:inline-block;margin:0 5px}wcm-button{margin:0 5px}`;
var al = Object.defineProperty, ll = Object.getOwnPropertyDescriptor, ct = (e, t, r, o) => {
  for (var n = o > 1 ? void 0 : o ? ll(t, r) : t, i = e.length - 1, s; i >= 0; i--)
    (s = e[i]) && (n = (o ? s(t, r, n) : s(n)) || n);
  return o && n && al(t, r, n), n;
};
let Oe = class extends L {
  constructor() {
    super(...arguments), this.isMobile = !1, this.isDesktop = !1, this.isWeb = !1, this.isRetry = !1;
  }
  // -- private ------------------------------------------------------ //
  onMobile() {
    x.isMobile() ? k.replace("MobileConnecting") : k.replace("MobileQrcodeConnecting");
  }
  onDesktop() {
    k.replace("DesktopConnecting");
  }
  onWeb() {
    k.replace("WebConnecting");
  }
  // -- render ------------------------------------------------------- //
  render() {
    return y`<div>${this.isRetry ? y`<slot></slot>` : null} ${this.isMobile ? y`<wcm-button .onClick="${this.onMobile}" .iconLeft="${U.MOBILE_ICON}" variant="outline">Mobile</wcm-button>` : null} ${this.isDesktop ? y`<wcm-button .onClick="${this.onDesktop}" .iconLeft="${U.DESKTOP_ICON}" variant="outline">Desktop</wcm-button>` : null} ${this.isWeb ? y`<wcm-button .onClick="${this.onWeb}" .iconLeft="${U.GLOBE_ICON}" variant="outline">Web</wcm-button>` : null}</div>`;
  }
};
Oe.styles = [D.globalCss, sl];
ct([
  R({ type: Boolean })
], Oe.prototype, "isMobile", 2);
ct([
  R({ type: Boolean })
], Oe.prototype, "isDesktop", 2);
ct([
  R({ type: Boolean })
], Oe.prototype, "isWeb", 2);
ct([
  R({ type: Boolean })
], Oe.prototype, "isRetry", 2);
Oe = ct([
  N("wcm-platform-selection")
], Oe);
const cl = B`button{display:flex;flex-direction:column;padding:5px 10px;border-radius:var(--wcm-button-hover-highlight-border-radius);height:100%;justify-content:flex-start}.wcm-icons{width:60px;height:60px;display:flex;flex-wrap:wrap;padding:7px;border-radius:var(--wcm-wallet-icon-border-radius);justify-content:space-between;align-items:center;margin-bottom:5px;background-color:var(--wcm-color-bg-2);box-shadow:inset 0 0 0 1px var(--wcm-color-overlay)}button:active{background-color:var(--wcm-color-overlay)}@media(hover:hover){button:hover{background-color:var(--wcm-color-overlay)}}.wcm-icons img{width:21px;height:21px;object-fit:cover;object-position:center;border-radius:calc(var(--wcm-wallet-icon-border-radius)/ 2);border:1px solid var(--wcm-color-overlay)}.wcm-icons svg{width:21px;height:21px}.wcm-icons img:nth-child(1),.wcm-icons img:nth-child(2),.wcm-icons svg:nth-child(1),.wcm-icons svg:nth-child(2){margin-bottom:4px}wcm-text{width:100%;text-align:center}#wallet-placeholder-fill{fill:var(--wcm-color-bg-3)}#wallet-placeholder-dash{stroke:var(--wcm-color-overlay)}`;
var dl = Object.getOwnPropertyDescriptor, ul = (e, t, r, o) => {
  for (var n = o > 1 ? void 0 : o ? dl(t, r) : t, i = e.length - 1, s; i >= 0; i--)
    (s = e[i]) && (n = s(n) || n);
  return n;
};
let jr = class extends L {
  // -- render ------------------------------------------------------- //
  onClick() {
    k.push("WalletExplorer");
  }
  // -- render ------------------------------------------------------- //
  render() {
    const { recomendedWallets: e } = K.state, t = Ue.manualWallets(), r = [...e, ...t].reverse().slice(0, 4);
    return y`<button @click="${this.onClick}"><div class="wcm-icons">${r.map((o) => {
      const n = S.getWalletIcon(o);
      if (n)
        return y`<img crossorigin="anonymous" src="${n}">`;
      const i = S.getWalletIcon({ id: o.id });
      return i ? y`<img crossorigin="anonymous" src="${i}">` : U.WALLET_PLACEHOLDER;
    })} ${[...Array(4 - r.length)].map(() => U.WALLET_PLACEHOLDER)}</div><wcm-text variant="xsmall-regular">View All</wcm-text></button>`;
  }
};
jr.styles = [D.globalCss, cl];
jr = ul([
  N("wcm-view-all-wallets-button")
], jr);
const hl = B`.wcm-qr-container{width:100%;display:flex;justify-content:center;align-items:center;aspect-ratio:1/1}`;
var ml = Object.defineProperty, fl = Object.getOwnPropertyDescriptor, Tt = (e, t, r, o) => {
  for (var n = o > 1 ? void 0 : o ? fl(t, r) : t, i = e.length - 1, s; i >= 0; i--)
    (s = e[i]) && (n = (o ? s(t, r, n) : s(n)) || n);
  return o && n && ml(t, r, n), n;
};
let Fe = class extends L {
  // -- lifecycle ---------------------------------------------------- //
  constructor() {
    super(), this.walletId = "", this.imageId = "", this.uri = "", setTimeout(() => {
      const { walletConnectUri: e } = H.state;
      this.uri = e;
    }, 0);
  }
  // -- private ------------------------------------------------------ //
  get overlayEl() {
    return S.getShadowRootElement(this, ".wcm-qr-container");
  }
  // -- render ------------------------------------------------------- //
  render() {
    return y`<div class="wcm-qr-container">${this.uri ? y`<wcm-qrcode size="${this.overlayEl.offsetWidth}" uri="${this.uri}" walletId="${q(this.walletId)}" imageId="${q(this.imageId)}"></wcm-qrcode>` : y`<wcm-spinner></wcm-spinner>`}</div>`;
  }
};
Fe.styles = [D.globalCss, hl];
Tt([
  R()
], Fe.prototype, "walletId", 2);
Tt([
  R()
], Fe.prototype, "imageId", 2);
Tt([
  Y()
], Fe.prototype, "uri", 2);
Fe = Tt([
  N("wcm-walletconnect-qr")
], Fe);
var pl = Object.getOwnPropertyDescriptor, gl = (e, t, r, o) => {
  for (var n = o > 1 ? void 0 : o ? pl(t, r) : t, i = e.length - 1, s; i >= 0; i--)
    (s = e[i]) && (n = s(n) || n);
  return n;
};
let Hr = class extends L {
  // -- private ------------------------------------------------------ //
  viewTemplate() {
    return x.isAndroid() && !x.isTelegram() ? y`<wcm-android-wallet-selection></wcm-android-wallet-selection>` : x.isMobile() ? y`<wcm-mobile-wallet-selection></wcm-mobile-wallet-selection>` : y`<wcm-desktop-wallet-selection></wcm-desktop-wallet-selection>`;
  }
  // -- render ------------------------------------------------------- //
  render() {
    return y`${this.viewTemplate()}<wcm-legal-notice></wcm-legal-notice>`;
  }
};
Hr.styles = [D.globalCss];
Hr = gl([
  N("wcm-connect-wallet-view")
], Hr);
const wl = B`wcm-info-footer{flex-direction:column;align-items:center;display:flex;width:100%;padding:5px 0}wcm-text{text-align:center}`;
var vl = Object.defineProperty, bl = Object.getOwnPropertyDescriptor, Bo = (e, t, r, o) => {
  for (var n = o > 1 ? void 0 : o ? bl(t, r) : t, i = e.length - 1, s; i >= 0; i--)
    (s = e[i]) && (n = (o ? s(t, r, n) : s(n)) || n);
  return o && n && vl(t, r, n), n;
};
let At = class extends L {
  // -- lifecycle ---------------------------------------------------- //
  constructor() {
    super(), this.isError = !1, this.openDesktopApp();
  }
  // -- private ------------------------------------------------------ //
  onFormatAndRedirect(e) {
    const { desktop: t, name: r } = x.getWalletRouterData(), o = t?.native, n = t?.universal;
    if (o) {
      const i = x.formatNativeUrl(o, e, r);
      x.openHref(i, "_self");
    } else if (n) {
      const i = x.formatUniversalUrl(n, e, r);
      x.openHref(i, "_blank");
    }
  }
  openDesktopApp() {
    const { walletConnectUri: e } = H.state, t = x.getWalletRouterData();
    S.setRecentWallet(t), e && this.onFormatAndRedirect(e);
  }
  // -- render ------------------------------------------------------- //
  render() {
    const { name: e, id: t, image_id: r } = x.getWalletRouterData(), { isMobile: o, isWeb: n } = S.getCachedRouterWalletPlatforms();
    return y`<wcm-modal-header title="${e}" .onAction="${S.handleUriCopy}" .actionIcon="${U.COPY_ICON}"></wcm-modal-header><wcm-modal-content><wcm-connector-waiting walletId="${t}" imageId="${q(r)}" label="${`Continue in ${e}...`}" .isError="${this.isError}"></wcm-connector-waiting></wcm-modal-content><wcm-info-footer><wcm-text color="secondary" variant="small-thin">${`Connection can continue loading if ${e} is not installed on your device`}</wcm-text><wcm-platform-selection .isMobile="${o}" .isWeb="${n}" .isRetry="${!0}"><wcm-button .onClick="${this.openDesktopApp.bind(this)}" .iconRight="${U.RETRY_ICON}">Retry</wcm-button></wcm-platform-selection></wcm-info-footer>`;
  }
};
At.styles = [D.globalCss, wl];
Bo([
  Y()
], At.prototype, "isError", 2);
At = Bo([
  N("wcm-desktop-connecting-view")
], At);
const yl = B`wcm-info-footer{flex-direction:column;align-items:center;display:flex;width:100%;padding:5px 0}wcm-text{text-align:center}wcm-button{margin-top:15px}`;
var _l = Object.getOwnPropertyDescriptor, xl = (e, t, r, o) => {
  for (var n = o > 1 ? void 0 : o ? _l(t, r) : t, i = e.length - 1, s; i >= 0; i--)
    (s = e[i]) && (n = s(n) || n);
  return n;
};
let Vr = class extends L {
  // -- private ------------------------------------------------------ //
  onInstall(e) {
    e && x.openHref(e, "_blank");
  }
  // -- render ------------------------------------------------------- //
  render() {
    const { name: e, id: t, image_id: r, homepage: o } = x.getWalletRouterData();
    return y`<wcm-modal-header title="${e}"></wcm-modal-header><wcm-modal-content><wcm-connector-waiting walletId="${t}" imageId="${q(r)}" label="Not Detected" .isStale="${!0}"></wcm-connector-waiting></wcm-modal-content><wcm-info-footer><wcm-text color="secondary" variant="small-thin">${`Download ${e} to continue. If multiple browser extensions are installed, disable non ${e} ones and try again`}</wcm-text><wcm-button .onClick="${() => this.onInstall(o)}" .iconLeft="${U.ARROW_DOWN_ICON}">Download</wcm-button></wcm-info-footer>`;
  }
};
Vr.styles = [D.globalCss, yl];
Vr = xl([
  N("wcm-install-wallet-view")
], Vr);
const Cl = B`wcm-wallet-image{border-radius:var(--wcm-wallet-icon-large-border-radius);width:96px;height:96px;margin-bottom:20px}wcm-info-footer{display:flex;width:100%}.wcm-app-store{justify-content:space-between}.wcm-app-store wcm-wallet-image{margin-right:10px;margin-bottom:0;width:28px;height:28px;border-radius:var(--wcm-wallet-icon-small-border-radius)}.wcm-app-store div{display:flex;align-items:center}.wcm-app-store wcm-button{margin-right:-10px}.wcm-note{flex-direction:column;align-items:center;padding:5px 0}.wcm-note wcm-text{text-align:center}wcm-platform-selection{margin-top:-15px}.wcm-note wcm-text{margin-top:15px}.wcm-note wcm-text span{color:var(--wcm-accent-color)}`;
var $l = Object.defineProperty, El = Object.getOwnPropertyDescriptor, Uo = (e, t, r, o) => {
  for (var n = o > 1 ? void 0 : o ? El(t, r) : t, i = e.length - 1, s; i >= 0; i--)
    (s = e[i]) && (n = (o ? s(t, r, n) : s(n)) || n);
  return o && n && $l(t, r, n), n;
};
let It = class extends L {
  // -- lifecycle ---------------------------------------------------- //
  constructor() {
    super(), this.isError = !1, this.openMobileApp();
  }
  // -- private ------------------------------------------------------ //
  onFormatAndRedirect(e, t = !1) {
    const { mobile: r, name: o } = x.getWalletRouterData(), n = r?.native, i = r?.universal, s = x.isTelegram() ? "_blank" : "_self";
    if (e = x.isTelegram() && x.isAndroid() ? encodeURIComponent(e) : e, n && !t) {
      const a = x.formatNativeUrl(n, e, o);
      x.openHref(a, s);
    } else if (i) {
      const a = x.formatUniversalUrl(i, e, o);
      x.openHref(a, s);
    }
  }
  openMobileApp(e = !1) {
    const { walletConnectUri: t } = H.state, r = x.getWalletRouterData();
    t && this.onFormatAndRedirect(t, e), S.setRecentWallet(r);
  }
  onGoToAppStore(e) {
    e && x.openHref(e, "_blank");
  }
  // -- render ------------------------------------------------------- //
  render() {
    const { name: e, id: t, image_id: r, app: o, mobile: n } = x.getWalletRouterData(), { isWeb: i } = S.getCachedRouterWalletPlatforms(), s = o?.ios, a = n?.universal;
    return y`<wcm-modal-header title="${e}"></wcm-modal-header><wcm-modal-content><wcm-connector-waiting walletId="${t}" imageId="${q(r)}" label="Tap 'Open' to continue…" .isError="${this.isError}"></wcm-connector-waiting></wcm-modal-content><wcm-info-footer class="wcm-note"><wcm-platform-selection .isWeb="${i}" .isRetry="${!0}"><wcm-button .onClick="${() => this.openMobileApp(!1)}" .iconRight="${U.RETRY_ICON}">Retry</wcm-button></wcm-platform-selection>${a ? y`<wcm-text color="secondary" variant="small-thin">Still doesn't work? <span tabindex="0" @click="${() => this.openMobileApp(!0)}">Try this alternate link</span></wcm-text>` : null}</wcm-info-footer><wcm-info-footer class="wcm-app-store"><div><wcm-wallet-image walletId="${t}" imageId="${q(r)}"></wcm-wallet-image><wcm-text>${`Get ${e}`}</wcm-text></div><wcm-button .iconRight="${U.ARROW_RIGHT_ICON}" .onClick="${() => this.onGoToAppStore(s)}" variant="ghost">App Store</wcm-button></wcm-info-footer>`;
  }
};
It.styles = [D.globalCss, Cl];
Uo([
  Y()
], It.prototype, "isError", 2);
It = Uo([
  N("wcm-mobile-connecting-view")
], It);
const Al = B`wcm-info-footer{flex-direction:column;align-items:center;display:flex;width:100%;padding:5px 0}wcm-text{text-align:center}`;
var Il = Object.getOwnPropertyDescriptor, Ol = (e, t, r, o) => {
  for (var n = o > 1 ? void 0 : o ? Il(t, r) : t, i = e.length - 1, s; i >= 0; i--)
    (s = e[i]) && (n = s(n) || n);
  return n;
};
let zr = class extends L {
  // -- render ------------------------------------------------------- //
  render() {
    const { name: e, id: t, image_id: r } = x.getWalletRouterData(), { isDesktop: o, isWeb: n } = S.getCachedRouterWalletPlatforms();
    return y`<wcm-modal-header title="${e}" .onAction="${S.handleUriCopy}" .actionIcon="${U.COPY_ICON}"></wcm-modal-header><wcm-modal-content><wcm-walletconnect-qr walletId="${t}" imageId="${q(r)}"></wcm-walletconnect-qr></wcm-modal-content><wcm-info-footer><wcm-text color="secondary" variant="small-thin">${`Scan this QR Code with your phone's camera or inside ${e} app`}</wcm-text><wcm-platform-selection .isDesktop="${o}" .isWeb="${n}"></wcm-platform-selection></wcm-info-footer>`;
  }
};
zr.styles = [D.globalCss, Al];
zr = Ol([
  N("wcm-mobile-qr-connecting-view")
], zr);
var Pl = Object.getOwnPropertyDescriptor, Ml = (e, t, r, o) => {
  for (var n = o > 1 ? void 0 : o ? Pl(t, r) : t, i = e.length - 1, s; i >= 0; i--)
    (s = e[i]) && (n = s(n) || n);
  return n;
};
let Fr = class extends L {
  // -- render ------------------------------------------------------- //
  render() {
    return y`<wcm-modal-header title="Scan the code" .onAction="${S.handleUriCopy}" .actionIcon="${U.COPY_ICON}"></wcm-modal-header><wcm-modal-content><wcm-walletconnect-qr></wcm-walletconnect-qr></wcm-modal-content>`;
  }
};
Fr.styles = [D.globalCss];
Fr = Ml([
  N("wcm-qrcode-view")
], Fr);
const Tl = B`wcm-modal-content{height:clamp(200px,60vh,600px);display:block;overflow:scroll;scrollbar-width:none;position:relative;margin-top:1px}.wcm-grid{display:grid;grid-template-columns:repeat(4,80px);justify-content:space-between;margin:-15px -10px;padding-top:20px}wcm-modal-content::after,wcm-modal-content::before{content:'';position:fixed;pointer-events:none;z-index:1;width:100%;height:20px;opacity:1}wcm-modal-content::before{box-shadow:0 -1px 0 0 var(--wcm-color-bg-1);background:linear-gradient(var(--wcm-color-bg-1),rgba(255,255,255,0))}wcm-modal-content::after{box-shadow:0 1px 0 0 var(--wcm-color-bg-1);background:linear-gradient(rgba(255,255,255,0),var(--wcm-color-bg-1));top:calc(100% - 20px)}wcm-modal-content::-webkit-scrollbar{display:none}.wcm-placeholder-block{display:flex;justify-content:center;align-items:center;height:100px;overflow:hidden}.wcm-empty,.wcm-loading{display:flex}.wcm-loading .wcm-placeholder-block{height:100%}.wcm-end-reached .wcm-placeholder-block{height:0;opacity:0}.wcm-empty .wcm-placeholder-block{opacity:1;height:100%}wcm-wallet-button{margin:calc((100% - 60px)/ 3) 0}`;
var Sl = Object.defineProperty, Rl = Object.getOwnPropertyDescriptor, dt = (e, t, r, o) => {
  for (var n = o > 1 ? void 0 : o ? Rl(t, r) : t, i = e.length - 1, s; i >= 0; i--)
    (s = e[i]) && (n = (o ? s(t, r, n) : s(n)) || n);
  return o && n && Sl(t, r, n), n;
};
const br = 40;
let Pe = class extends L {
  constructor() {
    super(...arguments), this.loading = !K.state.wallets.listings.length, this.firstFetch = !K.state.wallets.listings.length, this.search = "", this.endReached = !1, this.intersectionObserver = void 0, this.searchDebounce = S.debounce((e) => {
      e.length >= 1 ? (this.firstFetch = !0, this.endReached = !1, this.search = e, K.resetSearch(), this.fetchWallets()) : this.search && (this.search = "", this.endReached = this.isLastPage(), K.resetSearch());
    });
  }
  // -- lifecycle ---------------------------------------------------- //
  firstUpdated() {
    this.createPaginationObserver();
  }
  disconnectedCallback() {
    var e;
    (e = this.intersectionObserver) == null || e.disconnect();
  }
  // -- private ------------------------------------------------------ //
  get placeholderEl() {
    return S.getShadowRootElement(this, ".wcm-placeholder-block");
  }
  createPaginationObserver() {
    this.intersectionObserver = new IntersectionObserver(([e]) => {
      e.isIntersecting && !(this.search && this.firstFetch) && this.fetchWallets();
    }), this.intersectionObserver.observe(this.placeholderEl);
  }
  isLastPage() {
    const { wallets: e, search: t } = K.state, { listings: r, total: o } = this.search ? t : e;
    return o <= br || r.length >= o;
  }
  async fetchWallets() {
    var e;
    const { wallets: t, search: r } = K.state, { listings: o, total: n, page: i } = this.search ? r : t;
    if (!this.endReached && (this.firstFetch || n > br && o.length < n))
      try {
        this.loading = !0;
        const s = (e = H.state.chains) == null ? void 0 : e.join(","), { listings: a } = await K.getWallets({
          page: this.firstFetch ? 1 : i + 1,
          entries: br,
          search: this.search,
          version: 2,
          chains: s
        }), l = a.map((c) => S.getWalletIcon(c));
        await Promise.all([
          ...l.map(async (c) => S.preloadImage(c)),
          x.wait(300)
        ]), this.endReached = this.isLastPage();
      } catch (s) {
        console.error(s), ue.openToast(S.getErrorMessage(s), "error");
      } finally {
        this.loading = !1, this.firstFetch = !1;
      }
  }
  onConnect(e) {
    x.isAndroid() ? S.handleMobileLinking(e) : S.goToConnectingView(e);
  }
  onSearchChange(e) {
    const { value: t } = e.target;
    this.searchDebounce(t);
  }
  // -- render ------------------------------------------------------- //
  render() {
    const { wallets: e, search: t } = K.state, { listings: r } = this.search ? t : e, o = this.loading && !r.length, n = this.search.length >= 3;
    let i = me.manualWalletsTemplate(), s = me.recomendedWalletsTemplate(!0);
    n && (i = i.filter(
      ({ values: c }) => S.caseSafeIncludes(c[0], this.search)
    ), s = s.filter(
      ({ values: c }) => S.caseSafeIncludes(c[0], this.search)
    ));
    const a = !this.loading && !r.length && !s.length, l = {
      "wcm-loading": o,
      "wcm-end-reached": this.endReached || !this.loading,
      "wcm-empty": a
    };
    return y`<wcm-modal-header><wcm-search-input .onChange="${this.onSearchChange.bind(this)}"></wcm-search-input></wcm-modal-header><wcm-modal-content class="${ae(l)}"><div class="wcm-grid">${o ? null : i} ${o ? null : s} ${o ? null : r.map(
      (c) => y`${c ? y`<wcm-wallet-button imageId="${c.image_id}" name="${c.name}" walletId="${c.id}" .onClick="${() => this.onConnect(c)}"></wcm-wallet-button>` : null}`
    )}</div><div class="wcm-placeholder-block">${a ? y`<wcm-text variant="big-bold" color="secondary">No results found</wcm-text>` : null} ${!a && this.loading ? y`<wcm-spinner></wcm-spinner>` : null}</div></wcm-modal-content>`;
  }
};
Pe.styles = [D.globalCss, Tl];
dt([
  Y()
], Pe.prototype, "loading", 2);
dt([
  Y()
], Pe.prototype, "firstFetch", 2);
dt([
  Y()
], Pe.prototype, "search", 2);
dt([
  Y()
], Pe.prototype, "endReached", 2);
Pe = dt([
  N("wcm-wallet-explorer-view")
], Pe);
const Ll = B`wcm-info-footer{flex-direction:column;align-items:center;display:flex;width:100%;padding:5px 0}wcm-text{text-align:center}`;
var Dl = Object.defineProperty, Wl = Object.getOwnPropertyDescriptor, ko = (e, t, r, o) => {
  for (var n = o > 1 ? void 0 : o ? Wl(t, r) : t, i = e.length - 1, s; i >= 0; i--)
    (s = e[i]) && (n = (o ? s(t, r, n) : s(n)) || n);
  return o && n && Dl(t, r, n), n;
};
let Ot = class extends L {
  // -- lifecycle ---------------------------------------------------- //
  constructor() {
    super(), this.isError = !1, this.openWebWallet();
  }
  // -- private ------------------------------------------------------ //
  onFormatAndRedirect(e) {
    const { desktop: t, name: r } = x.getWalletRouterData(), o = t?.universal;
    if (o) {
      const n = x.formatUniversalUrl(o, e, r);
      x.openHref(n, "_blank");
    }
  }
  openWebWallet() {
    const { walletConnectUri: e } = H.state, t = x.getWalletRouterData();
    S.setRecentWallet(t), e && this.onFormatAndRedirect(e);
  }
  // -- render ------------------------------------------------------- //
  render() {
    const { name: e, id: t, image_id: r } = x.getWalletRouterData(), { isMobile: o, isDesktop: n } = S.getCachedRouterWalletPlatforms(), i = x.isMobile();
    return y`<wcm-modal-header title="${e}" .onAction="${S.handleUriCopy}" .actionIcon="${U.COPY_ICON}"></wcm-modal-header><wcm-modal-content><wcm-connector-waiting walletId="${t}" imageId="${q(r)}" label="${`Continue in ${e}...`}" .isError="${this.isError}"></wcm-connector-waiting></wcm-modal-content><wcm-info-footer><wcm-text color="secondary" variant="small-thin">${`${e} web app has opened in a new tab. Go there, accept the connection, and come back`}</wcm-text><wcm-platform-selection .isMobile="${o}" .isDesktop="${i ? !1 : n}" .isRetry="${!0}"><wcm-button .onClick="${this.openWebWallet.bind(this)}" .iconRight="${U.RETRY_ICON}">Retry</wcm-button></wcm-platform-selection></wcm-info-footer>`;
  }
};
Ot.styles = [D.globalCss, Ll];
ko([
  Y()
], Ot.prototype, "isError", 2);
Ot = ko([
  N("wcm-web-connecting-view")
], Ot);
const Nl = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  get WcmModal() {
    return ze;
  },
  get WcmQrCode() {
    return se;
  }
}, Symbol.toStringTag, { value: "Module" }));
export {
  Ul as W
};
