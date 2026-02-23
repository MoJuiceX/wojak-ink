import { g as Zo } from "./wallet-connect-standalone-runtime-ByX85dGu.js";
var on = function(e, t, r) {
  if (r || arguments.length === 2) for (var o = 0, n = t.length, i; o < n; o++)
    (i || !(o in t)) && (i || (i = Array.prototype.slice.call(t, 0, o)), i[o] = t[o]);
  return e.concat(i || Array.prototype.slice.call(t));
}, Ko = (
  /** @class */
  /* @__PURE__ */ (function() {
    function e(t, r, o) {
      this.name = t, this.version = r, this.os = o, this.type = "browser";
    }
    return e;
  })()
), Yo = (
  /** @class */
  /* @__PURE__ */ (function() {
    function e(t) {
      this.version = t, this.type = "node", this.name = "node", this.os = process.platform;
    }
    return e;
  })()
), Qo = (
  /** @class */
  /* @__PURE__ */ (function() {
    function e(t, r, o, n) {
      this.name = t, this.version = r, this.os = o, this.bot = n, this.type = "bot-device";
    }
    return e;
  })()
), Go = (
  /** @class */
  /* @__PURE__ */ (function() {
    function e() {
      this.type = "bot", this.bot = !0, this.name = "bot", this.version = null, this.os = null;
    }
    return e;
  })()
), Jo = (
  /** @class */
  /* @__PURE__ */ (function() {
    function e() {
      this.type = "react-native", this.name = "react-native", this.version = null, this.os = null;
    }
    return e;
  })()
), Xo = /alexa|bot|crawl(er|ing)|facebookexternalhit|feedburner|google web preview|nagios|postrank|pingdom|slurp|spider|yahoo!|yandex/, ei = /(nuhk|curl|Googlebot|Yammybot|Openbot|Slurp|MSNBot|Ask\ Jeeves\/Teoma|ia_archiver)/, sn = 3, ti = [
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
  ["searchbot", Xo]
], an = [
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
function tc(e) {
  return typeof document > "u" && typeof navigator < "u" && navigator.product === "ReactNative" ? new Jo() : typeof navigator < "u" ? ni(navigator.userAgent) : ii();
}
function ri(e) {
  return e !== "" && ti.reduce(function(t, r) {
    var o = r[0], n = r[1];
    if (t)
      return t;
    var i = n.exec(e);
    return !!i && [o, i];
  }, !1);
}
function ni(e) {
  var t = ri(e);
  if (!t)
    return null;
  var r = t[0], o = t[1];
  if (r === "searchbot")
    return new Go();
  var n = o[1] && o[1].split(".").join("_").split("_").slice(0, 3);
  n ? n.length < sn && (n = on(on([], n, !0), si(sn - n.length), !0)) : n = [];
  var i = n.join("."), s = oi(e), a = ei.exec(e);
  return a && a[1] ? new Qo(r, i, s, a[1]) : new Ko(r, i, s);
}
function oi(e) {
  for (var t = 0, r = an.length; t < r; t++) {
    var o = an[t], n = o[0], i = o[1], s = i.exec(e);
    if (s)
      return n;
  }
  return null;
}
function ii() {
  var e = typeof process < "u" && process.version;
  return e ? new Yo(process.version.slice(1)) : null;
}
function si(e) {
  for (var t = [], r = 0; r < e; r++)
    t.push("0");
  return t;
}
const ai = /* @__PURE__ */ Symbol(), ln = Object.getPrototypeOf, yr = /* @__PURE__ */ new WeakMap(), li = (e) => e && (yr.has(e) ? yr.get(e) : ln(e) === Object.prototype || ln(e) === Array.prototype), ci = (e) => li(e) && e[ai] || null, cn = (e, t = !0) => {
  yr.set(e, t);
}, vt = {}, Dt = (e) => typeof e == "object" && e !== null, ce = /* @__PURE__ */ new WeakMap(), ht = /* @__PURE__ */ new WeakSet(), di = (e = Object.is, t = (c, m) => new Proxy(c, m), r = (c) => Dt(c) && !ht.has(c) && (Array.isArray(c) || !(Symbol.iterator in c)) && !(c instanceof WeakMap) && !(c instanceof WeakSet) && !(c instanceof Error) && !(c instanceof Number) && !(c instanceof Date) && !(c instanceof String) && !(c instanceof RegExp) && !(c instanceof ArrayBuffer), o = (c) => {
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
  return cn(f, !0), n.set(c, [m, f]), Reflect.ownKeys(c).forEach((b) => {
    if (Object.getOwnPropertyDescriptor(f, b))
      return;
    const w = Reflect.get(c, b), M = {
      value: w,
      enumerable: !0,
      // This is intentional to avoid copying with proxy-compare.
      // It's still non-writable, so it avoids assigning a value.
      configurable: !0
    };
    if (ht.has(w))
      cn(w, !1);
    else if (w instanceof Promise)
      delete M.value, M.get = () => g(w);
    else if (ce.has(w)) {
      const [p, I] = ce.get(
        w
      );
      M.value = i(
        p,
        I(),
        g
      );
    }
    Object.defineProperty(f, b, M);
  }), Object.preventExtensions(f);
}, s = /* @__PURE__ */ new WeakMap(), a = [1, 1], l = (c) => {
  if (!Dt(c))
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
  })), g), M = (u) => (v, d) => {
    const _ = [...v];
    _[1] = [u, ..._[1]], f(_, d);
  }, p = /* @__PURE__ */ new Map(), I = (u, v) => {
    if ((vt ? "production" : void 0) !== "production" && p.has(u))
      throw new Error("prop listener already exists");
    if (h.size) {
      const d = v[3](M(u));
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
    const S = d[3](M(C));
    p.set(C, [d, S]);
  }), () => {
    h.delete(u), h.size === 0 && p.forEach(([d, _], C) => {
      _ && (_(), p.set(C, [d]));
    });
  }), D = Array.isArray(c) ? [] : Object.create(Object.getPrototypeOf(c)), E = t(D, {
    deleteProperty(u, v) {
      const d = Reflect.get(u, v);
      $(v);
      const _ = Reflect.deleteProperty(u, v);
      return _ && f(["delete", [v], d]), _;
    },
    set(u, v, d, _) {
      const C = Reflect.has(u, v), S = Reflect.get(u, v, _);
      if (C && (e(S, d) || s.has(d) && e(S, s.get(d))))
        return !0;
      $(v), Dt(d) && (d = ci(d) || d);
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
        Z && I(v, Z);
      }
      return Reflect.set(u, v, Q, _), f(["set", [v], d, S]), !0;
    }
  });
  s.set(c, E);
  const P = [
    D,
    w,
    i,
    A
  ];
  return ce.set(E, P), Reflect.ownKeys(c).forEach((u) => {
    const v = Object.getOwnPropertyDescriptor(
      c,
      u
    );
    "value" in v && (E[u] = c[u], delete v.value, delete v.writable), Object.defineProperty(D, u, v);
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
], [ui] = di();
function we(e = {}) {
  return ui(e);
}
function Se(e, t, r) {
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
function hi(e, t) {
  const r = ce.get(e);
  (vt ? "production" : void 0) !== "production" && !r && console.warn("Please use proxy object");
  const [o, n, i] = r;
  return i(o, n(), t);
}
const F = we({
  history: ["ConnectWallet"],
  view: "ConnectWallet",
  data: void 0
}), U = {
  state: F,
  subscribe(e) {
    return Se(F, () => e(F));
  },
  push(e, t) {
    e !== F.view && (F.view = e, t && (F.data = t), F.history.push(e));
  },
  reset(e) {
    F.view = e, F.history = [e];
  },
  replace(e) {
    F.history.length > 1 && (F.history[F.history.length - 1] = e, F.view = e);
  },
  goBack() {
    if (F.history.length > 1) {
      F.history.pop();
      const [e] = F.history.slice(-1);
      F.view = e;
    }
  },
  setData(e) {
    F.data = e;
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
    const t = (e = U.state.data) == null ? void 0 : e.Wallet;
    if (!t)
      throw new Error('Missing "Wallet" view data');
    return t;
  }
}, mi = typeof location < "u" && (location.hostname.includes("localhost") || location.protocol.includes("https")), z = we({
  enabled: mi,
  userSessionId: "",
  events: [],
  connectedWalletId: void 0
}), po = {
  state: z,
  subscribe(e) {
    return Se(z.events, () => e(hi(z.events[z.events.length - 1])));
  },
  initialize() {
    z.enabled && typeof (crypto == null ? void 0 : crypto.randomUUID) < "u" && (z.userSessionId = crypto.randomUUID());
  },
  setConnectedWalletId(e) {
    z.connectedWalletId = e;
  },
  click(e) {
    if (z.enabled) {
      const t = {
        type: "CLICK",
        name: e.name,
        userSessionId: z.userSessionId,
        timestamp: Date.now(),
        data: e
      };
      z.events.push(t);
    }
  },
  track(e) {
    if (z.enabled) {
      const t = {
        type: "TRACK",
        name: e.name,
        userSessionId: z.userSessionId,
        timestamp: Date.now(),
        data: e
      };
      z.events.push(t);
    }
  },
  view(e) {
    if (z.enabled) {
      const t = {
        type: "VIEW",
        name: e.name,
        userSessionId: z.userSessionId,
        timestamp: Date.now(),
        data: e
      };
      z.events.push(t);
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
    return Se(X, () => e(X));
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
    return Se(mt, () => e(mt));
  },
  setConfig(e) {
    var t, r;
    po.initialize(), H.setChains(e.chains), H.setIsAuth(!!e.enableAuthMode), H.setIsCustomMobile(!!((t = e.mobileWallets) != null && t.length)), H.setIsCustomDesktop(!!((r = e.desktopWallets) != null && r.length)), x.setModalVersionInStorage(), Object.assign(mt, e);
  }
};
var fi = Object.defineProperty, dn = Object.getOwnPropertySymbols, pi = Object.prototype.hasOwnProperty, gi = Object.prototype.propertyIsEnumerable, un = (e, t, r) => t in e ? fi(e, t, { enumerable: !0, configurable: !0, writable: !0, value: r }) : e[t] = r, wi = (e, t) => {
  for (var r in t || (t = {}))
    pi.call(t, r) && un(e, r, t[r]);
  if (dn)
    for (var r of dn(t))
      gi.call(t, r) && un(e, r, t[r]);
  return e;
};
const _r = "https://explorer-api.walletconnect.com", xr = "wcm", Cr = "js-2.7.0";
async function ft(e, t) {
  const r = wi({ sdkType: xr, sdkVersion: Cr }, t), o = new URL(e, _r);
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
var vi = Object.defineProperty, hn = Object.getOwnPropertySymbols, bi = Object.prototype.hasOwnProperty, yi = Object.prototype.propertyIsEnumerable, mn = (e, t, r) => t in e ? vi(e, t, { enumerable: !0, configurable: !0, writable: !0, value: r }) : e[t] = r, _i = (e, t) => {
  for (var r in t || (t = {}))
    bi.call(t, r) && mn(e, r, t[r]);
  if (hn)
    for (var r of hn(t))
      yi.call(t, r) && mn(e, r, t[r]);
  return e;
};
const fn = x.isMobile(), ee = we({
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
      }, { listings: a } = fn ? await be.getMobileListings(s) : await be.getDesktopListings(s);
      ee.recomendedWallets = Object.values(a);
    }
    return ee.recomendedWallets;
  },
  async getWallets(e) {
    const t = _i({}, e), { explorerRecommendedWalletIds: r, explorerExcludedWalletIds: o } = G.state, { recomendedWallets: n } = ee;
    if (o === "ALL")
      return ee.wallets;
    n.length ? t.excludedIds = n.map((g) => g.id).join(",") : x.isArray(r) && (t.excludedIds = r.join(",")), x.isArray(o) && (t.excludedIds = [t.excludedIds, o].filter(Boolean).join(",")), H.state.isAuth && (t.sdks = "auth_v1");
    const { page: i, search: s } = e, { listings: a, total: l } = fn ? await be.getMobileListings(t) : await be.getDesktopListings(t), c = Object.values(a), m = s ? "search" : "wallets";
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
}, We = we({
  open: !1
}), $e = {
  state: We,
  subscribe(e) {
    return Se(We, () => e(We));
  },
  async open(e) {
    return new Promise((t) => {
      const { isUiLoaded: r, isDataLoaded: o } = H.state;
      if (x.removeWalletConnectDeepLink(), H.setWalletConnectUri(e?.uri), H.setChains(e?.chains), U.reset("ConnectWallet"), r && o)
        We.open = !0, t();
      else {
        const n = setInterval(() => {
          const i = H.state;
          i.isUiLoaded && i.isDataLoaded && (clearInterval(n), We.open = !0, t());
        }, 200);
      }
    });
  },
  close() {
    We.open = !1;
  }
};
var xi = Object.defineProperty, pn = Object.getOwnPropertySymbols, Ci = Object.prototype.hasOwnProperty, $i = Object.prototype.propertyIsEnumerable, gn = (e, t, r) => t in e ? xi(e, t, { enumerable: !0, configurable: !0, writable: !0, value: r }) : e[t] = r, Ei = (e, t) => {
  for (var r in t || (t = {}))
    Ci.call(t, r) && gn(e, r, t[r]);
  if (pn)
    for (var r of pn(t))
      $i.call(t, r) && gn(e, r, t[r]);
  return e;
};
function Ai() {
  return typeof matchMedia < "u" && matchMedia("(prefers-color-scheme: dark)").matches;
}
const Ye = we({
  themeMode: Ai() ? "dark" : "light"
}), fe = {
  state: Ye,
  subscribe(e) {
    return Se(Ye, () => e(Ye));
  },
  setThemeConfig(e) {
    const { themeMode: t, themeVariables: r } = e;
    t && (Ye.themeMode = t), r && (Ye.themeVariables = Ei({}, r));
  }
}, ye = we({
  open: !1,
  message: "",
  variant: "success"
}), ue = {
  state: ye,
  subscribe(e) {
    return Se(ye, () => e(ye));
  },
  openToast(e, t) {
    ye.open = !0, ye.message = e, ye.variant = t;
  },
  closeToast() {
    ye.open = !1;
  }
};
class rc {
  constructor(t) {
    this.openModal = $e.open, this.closeModal = $e.close, this.subscribeModal = $e.subscribe, this.setTheme = fe.setThemeConfig, fe.setThemeConfig(t), G.setConfig(t), this.initUi();
  }
  async initUi() {
    if (typeof window < "u") {
      await Promise.resolve().then(() => Xl);
      const t = document.createElement("wcm-modal");
      document.body.insertAdjacentElement("beforeend", t), H.setIsUiLoaded(!0);
    }
  }
}
const wt = window, qr = wt.ShadowRoot && (wt.ShadyCSS === void 0 || wt.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, Zr = /* @__PURE__ */ Symbol(), wn = /* @__PURE__ */ new WeakMap();
let go = class {
  constructor(t, r, o) {
    if (this._$cssResult$ = !0, o !== Zr) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = t, this.t = r;
  }
  get styleSheet() {
    let t = this.o;
    const r = this.t;
    if (qr && t === void 0) {
      const o = r !== void 0 && r.length === 1;
      o && (t = wn.get(r)), t === void 0 && ((this.o = t = new CSSStyleSheet()).replaceSync(this.cssText), o && wn.set(r, t));
    }
    return t;
  }
  toString() {
    return this.cssText;
  }
};
const Oi = (e) => new go(typeof e == "string" ? e : e + "", void 0, Zr), B = (e, ...t) => {
  const r = e.length === 1 ? e[0] : t.reduce(((o, n, i) => o + ((s) => {
    if (s._$cssResult$ === !0) return s.cssText;
    if (typeof s == "number") return s;
    throw Error("Value passed to 'css' function must be a 'css' function result: " + s + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
  })(n) + e[i + 1]), e[0]);
  return new go(r, e, Zr);
}, Ii = (e, t) => {
  qr ? e.adoptedStyleSheets = t.map(((r) => r instanceof CSSStyleSheet ? r : r.styleSheet)) : t.forEach(((r) => {
    const o = document.createElement("style"), n = wt.litNonce;
    n !== void 0 && o.setAttribute("nonce", n), o.textContent = r.cssText, e.appendChild(o);
  }));
}, vn = qr ? (e) => e : (e) => e instanceof CSSStyleSheet ? ((t) => {
  let r = "";
  for (const o of t.cssRules) r += o.cssText;
  return Oi(r);
})(e) : e;
var Nt;
const bt = window, bn = bt.trustedTypes, Pi = bn ? bn.emptyScript : "", yn = bt.reactiveElementPolyfillSupport, $r = { toAttribute(e, t) {
  switch (t) {
    case Boolean:
      e = e ? Pi : null;
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
} }, wo = (e, t) => t !== e && (t == t || e == e), Bt = { attribute: !0, type: String, converter: $r, reflect: !1, hasChanged: wo }, Er = "finalized";
let De = class extends HTMLElement {
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
      for (const n of o) r.unshift(vn(n));
    } else t !== void 0 && r.push(vn(t));
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
    return Ii(r, this.constructor.elementStyles), r;
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
    t !== void 0 && (((o = o || this.constructor.getPropertyOptions(t)).hasChanged || wo)(this[t], r) ? (this._$AL.has(t) || this._$AL.set(t, r), o.reflect === !0 && this._$El !== t && (this._$EC === void 0 && (this._$EC = /* @__PURE__ */ new Map()), this._$EC.set(t, o))) : n = !1), !this.isUpdatePending && n && (this._$E_ = this._$Ej());
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
De[Er] = !0, De.elementProperties = /* @__PURE__ */ new Map(), De.elementStyles = [], De.shadowRootOptions = { mode: "open" }, yn?.({ ReactiveElement: De }), ((Nt = bt.reactiveElementVersions) !== null && Nt !== void 0 ? Nt : bt.reactiveElementVersions = []).push("1.6.3");
var kt;
const yt = window, Ue = yt.trustedTypes, _n = Ue ? Ue.createPolicy("lit-html", { createHTML: (e) => e }) : void 0, Ar = "$lit$", de = `lit$${(Math.random() + "").slice(9)}$`, vo = "?" + de, Si = `<${vo}>`, Ee = document, et = () => Ee.createComment(""), tt = (e) => e === null || typeof e != "object" && typeof e != "function", bo = Array.isArray, Mi = (e) => bo(e) || typeof e?.[Symbol.iterator] == "function", Ut = `[ 	
\f\r]`, Qe = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, xn = /-->/g, Cn = />/g, _e = RegExp(`>|${Ut}(?:([^\\s"'>=/]+)(${Ut}*=${Ut}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g"), $n = /'/g, En = /"/g, yo = /^(?:script|style|textarea|title)$/i, _o = (e) => (t, ...r) => ({ _$litType$: e, strings: t, values: r }), y = _o(1), j = _o(2), Ae = /* @__PURE__ */ Symbol.for("lit-noChange"), V = /* @__PURE__ */ Symbol.for("lit-nothing"), An = /* @__PURE__ */ new WeakMap(), xe = Ee.createTreeWalker(Ee, 129, null, !1);
function xo(e, t) {
  if (!Array.isArray(e) || !e.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return _n !== void 0 ? _n.createHTML(t) : t;
}
const Ti = (e, t) => {
  const r = e.length - 1, o = [];
  let n, i = t === 2 ? "<svg>" : "", s = Qe;
  for (let a = 0; a < r; a++) {
    const l = e[a];
    let c, m, g = -1, h = 0;
    for (; h < l.length && (s.lastIndex = h, m = s.exec(l), m !== null); ) h = s.lastIndex, s === Qe ? m[1] === "!--" ? s = xn : m[1] !== void 0 ? s = Cn : m[2] !== void 0 ? (yo.test(m[2]) && (n = RegExp("</" + m[2], "g")), s = _e) : m[3] !== void 0 && (s = _e) : s === _e ? m[0] === ">" ? (s = n ?? Qe, g = -1) : m[1] === void 0 ? g = -2 : (g = s.lastIndex - m[2].length, c = m[1], s = m[3] === void 0 ? _e : m[3] === '"' ? En : $n) : s === En || s === $n ? s = _e : s === xn || s === Cn ? s = Qe : (s = _e, n = void 0);
    const f = s === _e && e[a + 1].startsWith("/>") ? " " : "";
    i += s === Qe ? l + Si : g >= 0 ? (o.push(c), l.slice(0, g) + Ar + l.slice(g) + de + f) : l + de + (g === -2 ? (o.push(void 0), a) : f);
  }
  return [xo(e, i + (e[r] || "<?>") + (t === 2 ? "</svg>" : "")), o];
};
class rt {
  constructor({ strings: t, _$litType$: r }, o) {
    let n;
    this.parts = [];
    let i = 0, s = 0;
    const a = t.length - 1, l = this.parts, [c, m] = Ti(t, r);
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
              l.push({ type: 1, index: i, name: w[2], strings: b, ctor: w[1] === "." ? Wi : w[1] === "?" ? Di : w[1] === "@" ? Ni : Pt });
            } else l.push({ type: 6, index: i });
          }
          for (const h of g) n.removeAttribute(h);
        }
        if (yo.test(n.tagName)) {
          const g = n.textContent.split(de), h = g.length - 1;
          if (h > 0) {
            n.textContent = Ue ? Ue.emptyScript : "";
            for (let f = 0; f < h; f++) n.append(g[f], et()), xe.nextNode(), l.push({ type: 2, index: ++i });
            n.append(g[h], et());
          }
        }
      } else if (n.nodeType === 8) if (n.data === vo) l.push({ type: 2, index: i });
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
class Ri {
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
        c.type === 2 ? m = new at(s, s.nextSibling, this, t) : c.type === 1 ? m = new c.ctor(s, c.name, c.strings, this, t) : c.type === 6 && (m = new Bi(s, this, t)), this._$AV.push(m), c = n[++l];
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
    t = je(this, t, r), tt(t) ? t === V || t == null || t === "" ? (this._$AH !== V && this._$AR(), this._$AH = V) : t !== this._$AH && t !== Ae && this._(t) : t._$litType$ !== void 0 ? this.g(t) : t.nodeType !== void 0 ? this.$(t) : Mi(t) ? this.T(t) : this._(t);
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
    const { values: o, _$litType$: n } = t, i = typeof n == "number" ? this._$AC(t) : (n.el === void 0 && (n.el = rt.createElement(xo(n.h, n.h[0]), this.options)), n);
    if (((r = this._$AH) === null || r === void 0 ? void 0 : r._$AD) === i) this._$AH.v(o);
    else {
      const s = new Ri(i, this), a = s.u(this.options);
      s.v(o), this.$(a), this._$AH = s;
    }
  }
  _$AC(t) {
    let r = An.get(t.strings);
    return r === void 0 && An.set(t.strings, r = new rt(t)), r;
  }
  T(t) {
    bo(this._$AH) || (this._$AH = [], this._$AR());
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
class Wi extends Pt {
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(t) {
    this.element[this.name] = t === V ? void 0 : t;
  }
}
const Li = Ue ? Ue.emptyScript : "";
class Di extends Pt {
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(t) {
    t && t !== V ? this.element.setAttribute(this.name, Li) : this.element.removeAttribute(this.name);
  }
}
class Ni extends Pt {
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
class Bi {
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
const On = yt.litHtmlPolyfillSupport;
On?.(rt, at), ((kt = yt.litHtmlVersions) !== null && kt !== void 0 ? kt : yt.litHtmlVersions = []).push("2.8.0");
const ki = (e, t, r) => {
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
class W extends De {
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
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(t), this._$Do = ki(r, this.renderRoot, this.renderOptions);
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
W.finalized = !0, W._$litElement$ = !0, (jt = globalThis.litElementHydrateSupport) === null || jt === void 0 || jt.call(globalThis, { LitElement: W });
const In = globalThis.litElementPolyfillSupport;
In?.({ LitElement: W });
((Ht = globalThis.litElementVersions) !== null && Ht !== void 0 ? Ht : globalThis.litElementVersions = []).push("3.3.3");
const N = (e) => (t) => typeof t == "function" ? ((r, o) => (customElements.define(r, o), o))(e, t) : ((r, o) => {
  const { kind: n, elements: i } = o;
  return { kind: n, elements: i, finisher(s) {
    customElements.define(r, s);
  } };
})(e, t);
const Ui = (e, t) => t.kind === "method" && t.descriptor && !("value" in t.descriptor) ? { ...t, finisher(r) {
  r.createProperty(t.key, e);
} } : { kind: "field", key: /* @__PURE__ */ Symbol(), placement: "own", descriptor: {}, originalKey: t.key, initializer() {
  typeof t.initializer == "function" && (this[t.key] = t.initializer.call(this));
}, finisher(r) {
  r.createProperty(t.key, e);
} }, ji = (e, t, r) => {
  t.constructor.createProperty(r, e);
};
function R(e) {
  return (t, r) => r !== void 0 ? ji(e, t, r) : Ui(e, t);
}
function Y(e) {
  return R({ ...e, state: !0 });
}
var Vt;
((Vt = window.HTMLSlotElement) === null || Vt === void 0 ? void 0 : Vt.prototype.assignedElements) != null;
const Hi = { ATTRIBUTE: 1 }, Vi = (e) => (...t) => ({ _$litDirective$: e, values: t });
class Fi {
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
const ae = Vi(class extends Fi {
  constructor(e) {
    var t;
    if (super(e), e.type !== Hi.ATTRIBUTE || e.name !== "class" || ((t = e.strings) === null || t === void 0 ? void 0 : t.length) > 2) throw Error("`classMap()` can only be used in the `class` attribute and must be the only part in the attribute.");
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
function zi(e, t) {
  e.indexOf(t) === -1 && e.push(t);
}
const Co = (e, t, r) => Math.min(Math.max(r, e), t), J = {
  duration: 0.3,
  delay: 0,
  endDelay: 0,
  repeat: 0,
  easing: "ease"
}, _t = (e) => typeof e == "number", Be = (e) => Array.isArray(e) && !_t(e[0]), qi = (e, t, r) => {
  const o = t - e;
  return ((r - e) % o + o) % o + e;
};
function Zi(e, t) {
  return Be(e) ? e[qi(0, e.length, t)] : e;
}
const $o = (e, t, r) => -r * e + r * t + e, Eo = () => {
}, he = (e) => e, Kr = (e, t, r) => t - e === 0 ? 1 : (r - e) / (t - e);
function Ao(e, t) {
  const r = e[e.length - 1];
  for (let o = 1; o <= t; o++) {
    const n = Kr(0, t, o);
    e.push($o(r, 1, n));
  }
}
function Ki(e) {
  const t = [0];
  return Ao(t, e - 1), t;
}
function Yi(e, t = Ki(e.length), r = he) {
  const o = e.length, n = o - t.length;
  return n > 0 && Ao(t, n), (i) => {
    let s = 0;
    for (; s < o - 2 && !(i < t[s + 1]); s++)
      ;
    let a = Co(0, 1, Kr(t[s], t[s + 1], i));
    return a = Zi(r, s)(a), $o(e[s], e[s + 1], a);
  };
}
const Oo = (e) => Array.isArray(e) && _t(e[0]), Or = (e) => typeof e == "object" && !!e.createAnimation, He = (e) => typeof e == "function", Qi = (e) => typeof e == "string", Xe = {
  ms: (e) => e * 1e3,
  s: (e) => e / 1e3
}, Io = (e, t, r) => (((1 - 3 * r + 3 * t) * e + (3 * r - 6 * t)) * e + 3 * t) * e, Gi = 1e-7, Ji = 12;
function Xi(e, t, r, o, n) {
  let i, s, a = 0;
  do
    s = t + (r - t) / 2, i = Io(s, o, n) - e, i > 0 ? r = s : t = s;
  while (Math.abs(i) > Gi && ++a < Ji);
  return s;
}
function Je(e, t, r, o) {
  if (e === t && r === o)
    return he;
  const n = (i) => Xi(i, 0, 1, e, r);
  return (i) => i === 0 || i === 1 ? i : Io(n(i), t, o);
}
const es = (e, t = "end") => (r) => {
  r = t === "end" ? Math.min(r, 0.999) : Math.max(r, 1e-3);
  const o = r * e, n = t === "end" ? Math.floor(o) : Math.ceil(o);
  return Co(0, 1, n / e);
}, ts = {
  ease: Je(0.25, 0.1, 0.25, 1),
  "ease-in": Je(0.42, 0, 1, 1),
  "ease-in-out": Je(0.42, 0, 0.58, 1),
  "ease-out": Je(0, 0, 0.58, 1)
}, rs = /\((.*?)\)/;
function Pn(e) {
  if (He(e))
    return e;
  if (Oo(e))
    return Je(...e);
  const t = ts[e];
  if (t)
    return t;
  if (e.startsWith("steps")) {
    const r = rs.exec(e);
    if (r) {
      const o = r[1].split(",");
      return es(parseFloat(o[0]), o[1].trim());
    }
  }
  return he;
}
class Po {
  constructor(t, r = [0, 1], { easing: o, duration: n = J.duration, delay: i = J.delay, endDelay: s = J.endDelay, repeat: a = J.repeat, offset: l, direction: c = "normal", autoplay: m = !0 } = {}) {
    if (this.startTime = null, this.rate = 1, this.t = 0, this.cancelTimestamp = null, this.easing = he, this.duration = 0, this.totalDuration = 0, this.repeat = 0, this.playState = "idle", this.finished = new Promise((h, f) => {
      this.resolve = h, this.reject = f;
    }), o = o || J.easing, Or(o)) {
      const h = o.createAnimation(r);
      o = h.easing, r = h.keyframes || r, n = h.duration || n;
    }
    this.repeat = a, this.easing = Be(o) ? he : Pn(o), this.updateDuration(n);
    const g = Yi(r, l, Be(o) ? o.map(Pn) : he);
    this.tick = (h) => {
      var f;
      i = i;
      let b = 0;
      this.pauseTime !== void 0 ? b = this.pauseTime : b = (h - this.startTime) * this.rate, this.t = b, b /= 1e3, b = Math.max(b - i, 0), this.playState === "finished" && this.pauseTime === void 0 && (b = this.totalDuration);
      const w = b / this.duration;
      let M = Math.floor(w), p = w % 1;
      !p && w >= 1 && (p = 1), p === 1 && M--;
      const I = M % 2;
      (c === "reverse" || c === "alternate" && I || c === "alternate-reverse" && !I) && (p = 1 - p);
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
var Ir = function() {
};
process.env.NODE_ENV !== "production" && (Ir = function(e, t) {
  if (!e)
    throw new Error(t);
});
class ns {
  setAnimation(t) {
    this.animation = t, t?.finished.then(() => this.clearAnimation()).catch(() => {
    });
  }
  clearAnimation() {
    this.animation = this.generator = void 0;
  }
}
const Ft = /* @__PURE__ */ new WeakMap();
function So(e) {
  return Ft.has(e) || Ft.set(e, {
    transforms: [],
    values: /* @__PURE__ */ new Map()
  }), Ft.get(e);
}
function os(e, t) {
  return e.has(t) || e.set(t, new ns()), e.get(t);
}
const is = ["", "X", "Y", "Z"], ss = ["translate", "scale", "rotate", "skew"], xt = {
  x: "translateX",
  y: "translateY",
  z: "translateZ"
}, Sn = {
  syntax: "<angle>",
  initialValue: "0deg",
  toDefaultUnit: (e) => e + "deg"
}, as = {
  translate: {
    syntax: "<length-percentage>",
    initialValue: "0px",
    toDefaultUnit: (e) => e + "px"
  },
  rotate: Sn,
  scale: {
    syntax: "<number>",
    initialValue: 1,
    toDefaultUnit: he
  },
  skew: Sn
}, nt = /* @__PURE__ */ new Map(), Yr = (e) => `--motion-${e}`, Ct = ["x", "y", "z"];
ss.forEach((e) => {
  is.forEach((t) => {
    Ct.push(e + t), nt.set(Yr(e + t), as[e]);
  });
});
const ls = (e, t) => Ct.indexOf(e) - Ct.indexOf(t), cs = new Set(Ct), Mo = (e) => cs.has(e), ds = (e, t) => {
  xt[t] && (t = xt[t]);
  const { transforms: r } = So(e);
  zi(r, t), e.style.transform = us(r);
}, us = (e) => e.sort(ls).reduce(hs, "").trim(), hs = (e, t) => `${e} ${t}(var(${Yr(t)}))`, Pr = (e) => e.startsWith("--"), Mn = /* @__PURE__ */ new Set();
function ms(e) {
  if (!Mn.has(e)) {
    Mn.add(e);
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
const zt = (e, t) => document.createElement("div").animate(e, t), Tn = {
  cssRegisterProperty: () => typeof CSS < "u" && Object.hasOwnProperty.call(CSS, "registerProperty"),
  waapi: () => Object.hasOwnProperty.call(Element.prototype, "animate"),
  partialKeyframes: () => {
    try {
      zt({ opacity: [1] });
    } catch {
      return !1;
    }
    return !0;
  },
  finished: () => !!zt({ opacity: [0, 1] }, { duration: 1e-3 }).finished,
  linearEasing: () => {
    try {
      zt({ opacity: 0 }, { easing: "linear(0, 1)" });
    } catch {
      return !1;
    }
    return !0;
  }
}, qt = {}, Ne = {};
for (const e in Tn)
  Ne[e] = () => (qt[e] === void 0 && (qt[e] = Tn[e]()), qt[e]);
const fs = 0.015, ps = (e, t) => {
  let r = "";
  const o = Math.round(t / fs);
  for (let n = 0; n < o; n++)
    r += e(Kr(0, o - 1, n)) + ", ";
  return r.substring(0, r.length - 2);
}, Rn = (e, t) => He(e) ? Ne.linearEasing() ? `linear(${ps(e, t)})` : J.easing : Oo(e) ? gs(e) : e, gs = ([e, t, r, o]) => `cubic-bezier(${e}, ${t}, ${r}, ${o})`;
function ws(e, t) {
  for (let r = 0; r < e.length; r++)
    e[r] === null && (e[r] = r ? e[r - 1] : t());
  return e;
}
const vs = (e) => Array.isArray(e) ? e : [e];
function Sr(e) {
  return xt[e] && (e = xt[e]), Mo(e) ? Yr(e) : e;
}
const pt = {
  get: (e, t) => {
    t = Sr(t);
    let r = Pr(t) ? e.style.getPropertyValue(t) : getComputedStyle(e)[t];
    if (!r && r !== 0) {
      const o = nt.get(t);
      o && (r = o.initialValue);
    }
    return r;
  },
  set: (e, t, r) => {
    t = Sr(t), Pr(t) ? e.style.setProperty(t, r) : e.style[t] = r;
  }
};
function To(e, t = !0) {
  if (!(!e || e.playState === "finished"))
    try {
      e.stop ? e.stop() : (t && e.commitStyles(), e.cancel());
    } catch {
    }
}
function bs(e, t) {
  var r;
  let o = t?.toDefaultUnit || he;
  const n = e[e.length - 1];
  if (Qi(n)) {
    const i = ((r = n.match(/(-?[\d.]+)([a-z%]*)/)) === null || r === void 0 ? void 0 : r[2]) || "";
    i && (o = (s) => s + i);
  }
  return o;
}
function ys() {
  return window.__MOTION_DEV_TOOLS_RECORD;
}
function _s(e, t, r, o = {}, n) {
  const i = ys(), s = o.record !== !1 && i;
  let a, { duration: l = J.duration, delay: c = J.delay, endDelay: m = J.endDelay, repeat: g = J.repeat, easing: h = J.easing, persist: f = !1, direction: b, offset: w, allowWebkitAcceleration: M = !1, autoplay: p = !0 } = o;
  const I = So(e), $ = Mo(t);
  let A = Ne.waapi();
  $ && ds(e, t);
  const D = Sr(t), O = os(I.values, D), E = nt.get(D);
  return To(O.animation, !(Or(h) && O.generator) && o.record !== !1), () => {
    const P = () => {
      var d, _;
      return (_ = (d = pt.get(e, D)) !== null && d !== void 0 ? d : E?.initialValue) !== null && _ !== void 0 ? _ : 0;
    };
    let u = ws(vs(r), P);
    const v = bs(u, E);
    if (Or(h)) {
      const d = h.createAnimation(u, t !== "opacity", P, D, O);
      h = d.easing, u = d.keyframes || u, l = d.duration || l;
    }
    if (Pr(D) && (Ne.cssRegisterProperty() ? ms(D) : A = !1), $ && !Ne.linearEasing() && (He(h) || Be(h) && h.some(He)) && (A = !1), A) {
      E && (u = u.map((C) => _t(C) ? E.toDefaultUnit(C) : C)), u.length === 1 && (!Ne.partialKeyframes() || s) && u.unshift(P());
      const d = {
        delay: Xe.ms(c),
        duration: Xe.ms(l),
        endDelay: Xe.ms(m),
        easing: Be(h) ? void 0 : Rn(h, l),
        direction: b,
        iterations: g + 1,
        fill: "both"
      };
      a = e.animate({
        [D]: u,
        offset: w,
        easing: Be(h) ? h.map((C) => Rn(C, l)) : void 0
      }, d), a.finished || (a.finished = new Promise((C, S) => {
        a.onfinish = C, a.oncancel = S;
      }));
      const _ = u[u.length - 1];
      a.finished.then(() => {
        f || (pt.set(e, D, _), a.cancel());
      }).catch(Eo), M || (a.playbackRate = 1.000001);
    } else if (n && $)
      u = u.map((d) => typeof d == "string" ? parseFloat(d) : d), u.length === 1 && u.unshift(parseFloat(P())), a = new n((d) => {
        pt.set(e, D, v ? v(d) : d);
      }, u, Object.assign(Object.assign({}, o), {
        duration: l,
        easing: h
      }));
    else {
      const d = u[u.length - 1];
      pt.set(e, D, E && _t(d) ? E.toDefaultUnit(d) : d);
    }
    return s && i(e, t, u, {
      duration: l,
      delay: c,
      easing: h,
      repeat: g,
      offset: w
    }, "motion-one"), O.setAnimation(a), a && !p && a.pause(), a;
  };
}
const xs = (e, t) => (
  /**
   * TODO: Make test for this
   * Always return a new object otherwise delay is overwritten by results of stagger
   * and this results in no stagger
   */
  e[t] ? Object.assign(Object.assign({}, e), e[t]) : Object.assign({}, e)
);
function Cs(e, t) {
  return typeof e == "string" ? e = document.querySelectorAll(e) : e instanceof Element && (e = [e]), Array.from(e || []);
}
const $s = (e) => e(), Ro = (e, t, r = J.duration) => new Proxy({
  animations: e.map($s).filter(Boolean),
  duration: r,
  options: t
}, As), Es = (e) => e.animations[0], As = {
  get: (e, t) => {
    const r = Es(e);
    switch (t) {
      case "duration":
        return e.duration;
      case "currentTime":
        return Xe.s(r?.[t] || 0);
      case "playbackRate":
      case "playState":
        return r?.[t];
      case "finished":
        return e.finished || (e.finished = Promise.all(e.animations.map(Os)).catch(Eo)), e.finished;
      case "stop":
        return () => {
          e.animations.forEach((o) => To(o));
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
}, Os = (e) => e.finished;
function Is(e, t, r) {
  return He(e) ? e(t, r) : e;
}
function Ps(e) {
  return function(r, o, n = {}) {
    r = Cs(r);
    const i = r.length;
    Ir(!!i, "No valid element provided."), Ir(!!o, "No keyframes defined.");
    const s = [];
    for (let a = 0; a < i; a++) {
      const l = r[a];
      for (const c in o) {
        const m = xs(n, c);
        m.delay = Is(m.delay, a, i);
        const g = _s(l, c, o[c], m, e);
        s.push(g);
      }
    }
    return Ro(
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
const Ss = Ps(Po);
function Ms(e, t = {}) {
  return Ro([
    () => {
      const r = new Po(e, [0, 1], t);
      return r.finished.catch(() => {
      }), r;
    }
  ], t, t.duration);
}
function Ce(e, t, r) {
  return (He(e) ? Ms : Ss)(e, t, r);
}
const q = (e) => e ?? V;
var Le = {}, Zt, Wn;
function Ts() {
  return Wn || (Wn = 1, Zt = function() {
    return typeof Promise == "function" && Promise.prototype && Promise.prototype.then;
  }), Zt;
}
var Kt = {}, le = {}, Ln;
function Me() {
  if (Ln) return le;
  Ln = 1;
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
var Yt = {}, Dn;
function Qr() {
  return Dn || (Dn = 1, (function(e) {
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
var Qt, Nn;
function Rs() {
  if (Nn) return Qt;
  Nn = 1;
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
var Gt, Bn;
function Ws() {
  if (Bn) return Gt;
  Bn = 1;
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
var Jt = {}, kn;
function Ls() {
  return kn || (kn = 1, (function(e) {
    const t = Me().getSymbolSize;
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
var Xt = {}, Un;
function Ds() {
  if (Un) return Xt;
  Un = 1;
  const e = Me().getSymbolSize, t = 7;
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
var er = {}, jn;
function Ns() {
  return jn || (jn = 1, (function(e) {
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
var gt = {}, Hn;
function Wo() {
  if (Hn) return gt;
  Hn = 1;
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
var tr = {}, Ge = {}, Vn;
function Bs() {
  if (Vn) return Ge;
  Vn = 1;
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
var Fn;
function ks() {
  return Fn || (Fn = 1, (function(e) {
    const t = Bs();
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
var rr, zn;
function Us() {
  if (zn) return rr;
  zn = 1;
  const e = ks();
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
var nr = {}, or = {}, ir = {}, qn;
function Lo() {
  return qn || (qn = 1, ir.isValid = function(t) {
    return !isNaN(t) && t >= 1 && t <= 40;
  }), ir;
}
var te = {}, Zn;
function Do() {
  if (Zn) return te;
  Zn = 1;
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
var Kn;
function Te() {
  return Kn || (Kn = 1, (function(e) {
    const t = Lo(), r = Do();
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
var Yn;
function js() {
  return Yn || (Yn = 1, (function(e) {
    const t = Me(), r = Wo(), o = Qr(), n = Te(), i = Lo(), s = 7973, a = t.getBCHDigit(s);
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
        const M = c(w.mode, f);
        b += M + w.getBitsLength();
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
      const M = t.getSymbolTotalCodewords(f), p = r.getTotalCodewordsCount(f, b), I = (M - p) * 8;
      if (w === n.MIXED) return I;
      const $ = I - c(w, f);
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
      const M = o.from(b, o.M);
      if (Array.isArray(f)) {
        if (f.length > 1)
          return g(f, M);
        if (f.length === 0)
          return 1;
        w = f[0];
      } else
        w = f;
      return l(w.mode, w.getLength(), M);
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
var sr = {}, Qn;
function Hs() {
  if (Qn) return sr;
  Qn = 1;
  const e = Me(), t = 1335, r = 21522, o = e.getBCHDigit(t);
  return sr.getEncodedBits = function(i, s) {
    const a = i.bit << 3 | s;
    let l = a << 10;
    for (; e.getBCHDigit(l) - o >= 0; )
      l ^= t << e.getBCHDigit(l) - o;
    return (a << 10 | l) ^ r;
  }, sr;
}
var ar = {}, lr, Gn;
function Vs() {
  if (Gn) return lr;
  Gn = 1;
  const e = Te();
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
var cr, Jn;
function Fs() {
  if (Jn) return cr;
  Jn = 1;
  const e = Te(), t = [
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
var dr, Xn;
function zs() {
  return Xn || (Xn = 1, dr = function(t) {
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
var ur, eo;
function qs() {
  if (eo) return ur;
  eo = 1;
  const e = zs(), t = Te();
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
var hr, to;
function Zs() {
  if (to) return hr;
  to = 1;
  const e = Te(), t = Me();
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
var mr = { exports: {} }, ro;
function Ks() {
  return ro || (ro = 1, (function(e) {
    var t = {
      single_source_shortest_paths: function(r, o, n) {
        var i = {}, s = {};
        s[o] = 0;
        var a = t.PriorityQueue.make();
        a.push(o, 0);
        for (var l, c, m, g, h, f, b, w, M; !a.empty(); ) {
          l = a.pop(), c = l.value, g = l.cost, h = r[c] || {};
          for (m in h)
            h.hasOwnProperty(m) && (f = h[m], b = g + f, w = s[m], M = typeof s[m] > "u", (M || w > b) && (s[m] = b, a.push(m, b), i[m] = c));
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
var no;
function Ys() {
  return no || (no = 1, (function(e) {
    const t = Te(), r = Vs(), o = Fs(), n = qs(), i = Zs(), s = Do(), a = Me(), l = Ks();
    function c(p) {
      return unescape(encodeURIComponent(p)).length;
    }
    function m(p, I, $) {
      const A = [];
      let D;
      for (; (D = p.exec($)) !== null; )
        A.push({
          data: D[0],
          index: D.index,
          mode: I,
          length: D[0].length
        });
      return A;
    }
    function g(p) {
      const I = m(s.NUMERIC, t.NUMERIC, p), $ = m(s.ALPHANUMERIC, t.ALPHANUMERIC, p);
      let A, D;
      return a.isKanjiModeEnabled() ? (A = m(s.BYTE, t.BYTE, p), D = m(s.KANJI, t.KANJI, p)) : (A = m(s.BYTE_KANJI, t.BYTE, p), D = []), I.concat($, A, D).sort(function(E, P) {
        return E.index - P.index;
      }).map(function(E) {
        return {
          data: E.data,
          mode: E.mode,
          length: E.length
        };
      });
    }
    function h(p, I) {
      switch (I) {
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
      return p.reduce(function(I, $) {
        const A = I.length - 1 >= 0 ? I[I.length - 1] : null;
        return A && A.mode === $.mode ? (I[I.length - 1].data += $.data, I) : (I.push($), I);
      }, []);
    }
    function b(p) {
      const I = [];
      for (let $ = 0; $ < p.length; $++) {
        const A = p[$];
        switch (A.mode) {
          case t.NUMERIC:
            I.push([
              A,
              { data: A.data, mode: t.ALPHANUMERIC, length: A.length },
              { data: A.data, mode: t.BYTE, length: A.length }
            ]);
            break;
          case t.ALPHANUMERIC:
            I.push([
              A,
              { data: A.data, mode: t.BYTE, length: A.length }
            ]);
            break;
          case t.KANJI:
            I.push([
              A,
              { data: A.data, mode: t.BYTE, length: c(A.data) }
            ]);
            break;
          case t.BYTE:
            I.push([
              { data: A.data, mode: t.BYTE, length: c(A.data) }
            ]);
        }
      }
      return I;
    }
    function w(p, I) {
      const $ = {}, A = { start: {} };
      let D = ["start"];
      for (let O = 0; O < p.length; O++) {
        const E = p[O], P = [];
        for (let u = 0; u < E.length; u++) {
          const v = E[u], d = "" + O + u;
          P.push(d), $[d] = { node: v, lastCount: 0 }, A[d] = {};
          for (let _ = 0; _ < D.length; _++) {
            const C = D[_];
            $[C] && $[C].node.mode === v.mode ? (A[C][d] = h($[C].lastCount + v.length, v.mode) - h($[C].lastCount, v.mode), $[C].lastCount += v.length) : ($[C] && ($[C].lastCount = v.length), A[C][d] = h(v.length, v.mode) + 4 + t.getCharCountIndicator(v.mode, I));
          }
        }
        D = P;
      }
      for (let O = 0; O < D.length; O++)
        A[D[O]].end = 0;
      return { map: A, table: $ };
    }
    function M(p, I) {
      let $;
      const A = t.getBestModeForData(p);
      if ($ = t.from(I, A), $ !== t.BYTE && $.bit < A.bit)
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
    e.fromArray = function(I) {
      return I.reduce(function($, A) {
        return typeof A == "string" ? $.push(M(A, null)) : A.data && $.push(M(A.data, A.mode)), $;
      }, []);
    }, e.fromString = function(I, $) {
      const A = g(I, a.isKanjiModeEnabled()), D = b(A), O = w(D, $), E = l.find_path(O.map, "start", "end"), P = [];
      for (let u = 1; u < E.length - 1; u++)
        P.push(O.table[E[u]].node);
      return e.fromArray(f(P));
    }, e.rawSplit = function(I) {
      return e.fromArray(
        g(I, a.isKanjiModeEnabled())
      );
    };
  })(ar)), ar;
}
var oo;
function Qs() {
  if (oo) return Kt;
  oo = 1;
  const e = Me(), t = Qr(), r = Rs(), o = Ws(), n = Ls(), i = Ds(), s = Ns(), a = Wo(), l = Us(), c = js(), m = Hs(), g = Te(), h = Ys();
  function f(O, E) {
    const P = O.size, u = i.getPositions(E);
    for (let v = 0; v < u.length; v++) {
      const d = u[v][0], _ = u[v][1];
      for (let C = -1; C <= 7; C++)
        if (!(d + C <= -1 || P <= d + C))
          for (let S = -1; S <= 7; S++)
            _ + S <= -1 || P <= _ + S || (C >= 0 && C <= 6 && (S === 0 || S === 6) || S >= 0 && S <= 6 && (C === 0 || C === 6) || C >= 2 && C <= 4 && S >= 2 && S <= 4 ? O.set(d + C, _ + S, !0, !0) : O.set(d + C, _ + S, !1, !0));
    }
  }
  function b(O) {
    const E = O.size;
    for (let P = 8; P < E - 8; P++) {
      const u = P % 2 === 0;
      O.set(P, 6, u, !0), O.set(6, P, u, !0);
    }
  }
  function w(O, E) {
    const P = n.getPositions(E);
    for (let u = 0; u < P.length; u++) {
      const v = P[u][0], d = P[u][1];
      for (let _ = -2; _ <= 2; _++)
        for (let C = -2; C <= 2; C++)
          _ === -2 || _ === 2 || C === -2 || C === 2 || _ === 0 && C === 0 ? O.set(v + _, d + C, !0, !0) : O.set(v + _, d + C, !1, !0);
    }
  }
  function M(O, E) {
    const P = O.size, u = c.getEncodedBits(E);
    let v, d, _;
    for (let C = 0; C < 18; C++)
      v = Math.floor(C / 3), d = C % 3 + P - 8 - 3, _ = (u >> C & 1) === 1, O.set(v, d, _, !0), O.set(d, v, _, !0);
  }
  function p(O, E, P) {
    const u = O.size, v = m.getEncodedBits(E, P);
    let d, _;
    for (d = 0; d < 15; d++)
      _ = (v >> d & 1) === 1, d < 6 ? O.set(d, 8, _, !0) : d < 8 ? O.set(d + 1, 8, _, !0) : O.set(u - 15 + d, 8, _, !0), d < 8 ? O.set(8, u - d - 1, _, !0) : d < 9 ? O.set(8, 15 - d - 1 + 1, _, !0) : O.set(8, 15 - d - 1, _, !0);
    O.set(u - 8, 8, 1, !0);
  }
  function I(O, E) {
    const P = O.size;
    let u = -1, v = P - 1, d = 7, _ = 0;
    for (let C = P - 1; C > 0; C -= 2)
      for (C === 6 && C--; ; ) {
        for (let S = 0; S < 2; S++)
          if (!O.isReserved(v, C - S)) {
            let Q = !1;
            _ < E.length && (Q = (E[_] >>> d & 1) === 1), O.set(v, C - S, Q), d--, d === -1 && (_++, d = 7);
          }
        if (v += u, v < 0 || P <= v) {
          v -= u, u = -u;
          break;
        }
      }
  }
  function $(O, E, P) {
    const u = new r();
    P.forEach(function(S) {
      u.put(S.mode.bit, 4), u.put(S.getLength(), g.getCharCountIndicator(S.mode, O)), S.write(u);
    });
    const v = e.getSymbolTotalCodewords(O), d = a.getTotalCodewordsCount(O, E), _ = (v - d) * 8;
    for (u.getLengthInBits() + 4 <= _ && u.put(0, 4); u.getLengthInBits() % 8 !== 0; )
      u.putBit(0);
    const C = (_ - u.getLengthInBits()) / 8;
    for (let S = 0; S < C; S++)
      u.put(S % 2 ? 17 : 236, 8);
    return A(u, O, E);
  }
  function A(O, E, P) {
    const u = e.getSymbolTotalCodewords(E), v = a.getTotalCodewordsCount(E, P), d = u - v, _ = a.getBlocksCount(E, P), C = u % _, S = _ - C, Q = Math.floor(u / _), Z = Math.floor(d / _), Fo = Z + 1, tn = Q - Z, zo = new l(tn);
    let Tt = 0;
    const ut = new Array(_), rn = new Array(_);
    let Rt = 0;
    const qo = new Uint8Array(O.buffer);
    for (let Re = 0; Re < _; Re++) {
      const Lt = Re < S ? Z : Fo;
      ut[Re] = qo.slice(Tt, Tt + Lt), rn[Re] = zo.encode(ut[Re]), Tt += Lt, Rt = Math.max(Rt, Lt);
    }
    const Wt = new Uint8Array(u);
    let nn = 0, ne, oe;
    for (ne = 0; ne < Rt; ne++)
      for (oe = 0; oe < _; oe++)
        ne < ut[oe].length && (Wt[nn++] = ut[oe][ne]);
    for (ne = 0; ne < tn; ne++)
      for (oe = 0; oe < _; oe++)
        Wt[nn++] = rn[oe][ne];
    return Wt;
  }
  function D(O, E, P, u) {
    let v;
    if (Array.isArray(O))
      v = h.fromArray(O);
    else if (typeof O == "string") {
      let Q = E;
      if (!Q) {
        const Z = h.rawSplit(O);
        Q = c.getBestVersionForData(Z, P);
      }
      v = h.fromString(O, Q || 40);
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
    const _ = $(E, P, v), C = e.getSymbolSize(E), S = new o(C);
    return f(S, E), b(S), w(S, E), p(S, P, 0), E >= 7 && M(S, E), I(S, _), isNaN(u) && (u = s.getBestMask(
      S,
      p.bind(null, S, P)
    )), s.applyMask(u, S), p(S, P, u), {
      modules: S,
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
    return typeof P < "u" && (u = t.from(P.errorCorrectionLevel, t.M), v = c.from(P.version), d = s.from(P.maskPattern), P.toSJISFunc && e.setToSJISFunction(P.toSJISFunc)), D(E, v, u, d);
  }, Kt;
}
var fr = {}, pr = {}, io;
function No() {
  return io || (io = 1, (function(e) {
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
            const M = Math.floor((h - m) / l), p = Math.floor((f - m) / l);
            w = g[a[M * s + p] ? 1 : 0];
          }
          o[b++] = w.r, o[b++] = w.g, o[b++] = w.b, o[b] = w.a;
        }
    };
  })(pr)), pr;
}
var so;
function Gs() {
  return so || (so = 1, (function(e) {
    const t = No();
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
var gr = {}, ao;
function Js() {
  if (ao) return gr;
  ao = 1;
  const e = No();
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
    const l = e.getOptions(s), c = i.modules.size, m = i.modules.data, g = c + l.margin * 2, h = l.color.light.a ? "<path " + t(l.color.light, "fill") + ' d="M0 0h' + g + "v" + g + 'H0z"/>' : "", f = "<path " + t(l.color.dark, "stroke") + ' d="' + o(m, c, l.margin) + '"/>', b = 'viewBox="0 0 ' + g + " " + g + '"', M = '<svg xmlns="http://www.w3.org/2000/svg" ' + (l.width ? 'width="' + l.width + '" height="' + l.width + '" ' : "") + b + ' shape-rendering="crispEdges">' + h + f + `</svg>
`;
    return typeof a == "function" && a(null, M), M;
  }, gr;
}
var lo;
function Xs() {
  if (lo) return Le;
  lo = 1;
  const e = Ts(), t = Qs(), r = Gs(), o = Js();
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
  return Le.create = t.create, Le.toCanvas = n.bind(null, r.render), Le.toDataURL = n.bind(null, r.renderToDataURL), Le.toString = n.bind(null, function(i, s, a) {
    return o.render(i, a);
  }), Le;
}
var ea = Xs();
const ta = /* @__PURE__ */ Zo(ea);
var ra = Object.defineProperty, co = Object.getOwnPropertySymbols, na = Object.prototype.hasOwnProperty, oa = Object.prototype.propertyIsEnumerable, uo = (e, t, r) => t in e ? ra(e, t, { enumerable: !0, configurable: !0, writable: !0, value: r }) : e[t] = r, wr = (e, t) => {
  for (var r in t || (t = {}))
    na.call(t, r) && uo(e, r, t[r]);
  if (co)
    for (var r of co(t))
      oa.call(t, r) && uo(e, r, t[r]);
  return e;
};
function ia() {
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
function ho() {
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
const L = {
  getPreset(e) {
    return ho()[e];
  },
  setTheme() {
    const e = document.querySelector(":root"), { themeVariables: t } = fe.state;
    if (e) {
      const r = wr(wr(wr({}, ia()), ho()), t);
      Object.entries(r).forEach(([o, n]) => e.style.setProperty(o, n));
    }
  },
  globalCss: B`*,::after,::before{margin:0;padding:0;box-sizing:border-box;font-style:normal;text-rendering:optimizeSpeed;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;-webkit-tap-highlight-color:transparent;backface-visibility:hidden}button{cursor:pointer;display:flex;justify-content:center;align-items:center;position:relative;border:none;background-color:transparent;transition:all .2s ease}@media (hover:hover) and (pointer:fine){button:active{transition:all .1s ease;transform:scale(.93)}}button::after{content:'';position:absolute;top:0;bottom:0;left:0;right:0;transition:background-color,.2s ease}button:disabled{cursor:not-allowed}button svg,button wcm-text{position:relative;z-index:1}input{border:none;outline:0;appearance:none}img{display:block}::selection{color:var(--wcm-accent-fill-color);background:var(--wcm-accent-color)}`
}, sa = B`button{border-radius:var(--wcm-secondary-button-border-radius);height:28px;padding:0 10px;background-color:var(--wcm-accent-color)}button path{fill:var(--wcm-accent-fill-color)}button::after{border-radius:inherit;border:1px solid var(--wcm-color-overlay)}button:disabled::after{background-color:transparent}.wcm-icon-left svg{margin-right:5px}.wcm-icon-right svg{margin-left:5px}button:active::after{background-color:var(--wcm-color-overlay)}.wcm-ghost,.wcm-ghost:active::after,.wcm-outline{background-color:transparent}.wcm-ghost:active{opacity:.5}@media(hover:hover){button:hover::after{background-color:var(--wcm-color-overlay)}.wcm-ghost:hover::after{background-color:transparent}.wcm-ghost:hover{opacity:.5}}button:disabled{background-color:var(--wcm-color-bg-3);pointer-events:none}.wcm-ghost::after{border-color:transparent}.wcm-ghost path{fill:var(--wcm-color-fg-2)}.wcm-outline path{fill:var(--wcm-accent-color)}.wcm-outline:disabled{background-color:transparent;opacity:.5}`;
var aa = Object.defineProperty, la = Object.getOwnPropertyDescriptor, qe = (e, t, r, o) => {
  for (var n = o > 1 ? void 0 : o ? la(t, r) : t, i = e.length - 1, s; i >= 0; i--)
    (s = e[i]) && (n = (o ? s(t, r, n) : s(n)) || n);
  return o && n && aa(t, r, n), n;
};
let pe = class extends W {
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
pe.styles = [L.globalCss, sa];
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
const ca = B`:host{display:inline-block}button{padding:0 15px 1px;height:40px;border-radius:var(--wcm-button-border-radius);color:var(--wcm-accent-fill-color);background-color:var(--wcm-accent-color)}button::after{content:'';top:0;bottom:0;left:0;right:0;position:absolute;background-color:transparent;border-radius:inherit;transition:background-color .2s ease;border:1px solid var(--wcm-color-overlay)}button:active::after{background-color:var(--wcm-color-overlay)}button:disabled{padding-bottom:0;background-color:var(--wcm-color-bg-3);color:var(--wcm-color-fg-3)}.wcm-secondary{color:var(--wcm-accent-color);background-color:transparent}.wcm-secondary::after{display:none}@media(hover:hover){button:hover::after{background-color:var(--wcm-color-overlay)}}`;
var da = Object.defineProperty, ua = Object.getOwnPropertyDescriptor, Gr = (e, t, r, o) => {
  for (var n = o > 1 ? void 0 : o ? ua(t, r) : t, i = e.length - 1, s; i >= 0; i--)
    (s = e[i]) && (n = (o ? s(t, r, n) : s(n)) || n);
  return o && n && da(t, r, n), n;
};
let ot = class extends W {
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
ot.styles = [L.globalCss, ca];
Gr([
  R({ type: Boolean })
], ot.prototype, "disabled", 2);
Gr([
  R()
], ot.prototype, "variant", 2);
ot = Gr([
  N("wcm-button-big")
], ot);
const ha = B`:host{background-color:var(--wcm-color-bg-2);border-top:1px solid var(--wcm-color-bg-3)}div{padding:10px 20px;display:inherit;flex-direction:inherit;align-items:inherit;width:inherit;justify-content:inherit}`;
var ma = Object.getOwnPropertyDescriptor, fa = (e, t, r, o) => {
  for (var n = o > 1 ? void 0 : o ? ma(t, r) : t, i = e.length - 1, s; i >= 0; i--)
    (s = e[i]) && (n = s(n) || n);
  return n;
};
let Mr = class extends W {
  // -- render ------------------------------------------------------- //
  render() {
    return y`<div><slot></slot></div>`;
  }
};
Mr.styles = [L.globalCss, ha];
Mr = fa([
  N("wcm-info-footer")
], Mr);
const k = {
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
}, pa = B`.wcm-toolbar-placeholder{top:0;bottom:0;left:0;right:0;width:100%;position:absolute;display:block;pointer-events:none;height:100px;border-radius:calc(var(--wcm-background-border-radius) * .9);background-color:var(--wcm-background-color);background-position:center;background-size:cover}.wcm-toolbar{height:38px;display:flex;position:relative;margin:5px 15px 5px 5px;justify-content:space-between;align-items:center}.wcm-toolbar img,.wcm-toolbar svg{height:28px;object-position:left center;object-fit:contain}#wcm-wc-logo path{fill:var(--wcm-accent-fill-color)}button{width:28px;height:28px;border-radius:var(--wcm-icon-button-border-radius);border:0;display:flex;justify-content:center;align-items:center;cursor:pointer;background-color:var(--wcm-color-bg-1);box-shadow:0 0 0 1px var(--wcm-color-overlay)}button:active{background-color:var(--wcm-color-bg-2)}button svg{display:block;object-position:center}button path{fill:var(--wcm-color-fg-1)}.wcm-toolbar div{display:flex}@media(hover:hover){button:hover{background-color:var(--wcm-color-bg-2)}}`;
var ga = Object.getOwnPropertyDescriptor, wa = (e, t, r, o) => {
  for (var n = o > 1 ? void 0 : o ? ga(t, r) : t, i = e.length - 1, s; i >= 0; i--)
    (s = e[i]) && (n = s(n) || n);
  return n;
};
let Tr = class extends W {
  // -- render ------------------------------------------------------- //
  render() {
    return y`<div class="wcm-toolbar-placeholder"></div><div class="wcm-toolbar">${k.WALLET_CONNECT_LOGO} <button @click="${$e.close}">${k.CROSS_ICON}</button></div>`;
  }
};
Tr.styles = [L.globalCss, pa];
Tr = wa([
  N("wcm-modal-backcard")
], Tr);
const va = B`main{padding:20px;padding-top:0;width:100%}`;
var ba = Object.getOwnPropertyDescriptor, ya = (e, t, r, o) => {
  for (var n = o > 1 ? void 0 : o ? ba(t, r) : t, i = e.length - 1, s; i >= 0; i--)
    (s = e[i]) && (n = s(n) || n);
  return n;
};
let Rr = class extends W {
  // -- render ------------------------------------------------------- //
  render() {
    return y`<main><slot></slot></main>`;
  }
};
Rr.styles = [L.globalCss, va];
Rr = ya([
  N("wcm-modal-content")
], Rr);
const _a = B`footer{padding:10px;display:flex;flex-direction:column;align-items:inherit;justify-content:inherit;border-top:1px solid var(--wcm-color-bg-2)}`;
var xa = Object.getOwnPropertyDescriptor, Ca = (e, t, r, o) => {
  for (var n = o > 1 ? void 0 : o ? xa(t, r) : t, i = e.length - 1, s; i >= 0; i--)
    (s = e[i]) && (n = s(n) || n);
  return n;
};
let Wr = class extends W {
  // -- render ------------------------------------------------------- //
  render() {
    return y`<footer><slot></slot></footer>`;
  }
};
Wr.styles = [L.globalCss, _a];
Wr = Ca([
  N("wcm-modal-footer")
], Wr);
const $a = B`header{display:flex;justify-content:center;align-items:center;padding:20px;position:relative}.wcm-border{border-bottom:1px solid var(--wcm-color-bg-2);margin-bottom:20px}header button{padding:15px 20px}header button:active{opacity:.5}@media(hover:hover){header button:hover{opacity:.5}}.wcm-back-btn{position:absolute;left:0}.wcm-action-btn{position:absolute;right:0}path{fill:var(--wcm-accent-color)}`;
var Ea = Object.defineProperty, Aa = Object.getOwnPropertyDescriptor, lt = (e, t, r, o) => {
  for (var n = o > 1 ? void 0 : o ? Aa(t, r) : t, i = e.length - 1, s; i >= 0; i--)
    (s = e[i]) && (n = (o ? s(t, r, n) : s(n)) || n);
  return o && n && Ea(t, r, n), n;
};
let Oe = class extends W {
  constructor() {
    super(...arguments), this.title = "", this.onAction = void 0, this.actionIcon = void 0, this.border = !1;
  }
  // -- private ------------------------------------------------------ //
  backBtnTemplate() {
    return y`<button class="wcm-back-btn" @click="${U.goBack}">${k.BACK_ICON}</button>`;
  }
  actionBtnTemplate() {
    return y`<button class="wcm-action-btn" @click="${this.onAction}">${this.actionIcon}</button>`;
  }
  // -- render ------------------------------------------------------- //
  render() {
    const e = {
      "wcm-border": this.border
    }, t = U.state.history.length > 1, r = this.title ? y`<wcm-text variant="big-bold">${this.title}</wcm-text>` : y`<slot></slot>`;
    return y`<header class="${ae(e)}">${t ? this.backBtnTemplate() : null} ${r} ${this.onAction ? this.actionBtnTemplate() : null}</header>`;
  }
};
Oe.styles = [L.globalCss, $a];
lt([
  R()
], Oe.prototype, "title", 2);
lt([
  R()
], Oe.prototype, "onAction", 2);
lt([
  R()
], Oe.prototype, "actionIcon", 2);
lt([
  R({ type: Boolean })
], Oe.prototype, "border", 2);
Oe = lt([
  N("wcm-modal-header")
], Oe);
const T = {
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
    return window.innerWidth <= T.MOBILE_BREAKPOINT;
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
    T.setRecentWallet(e);
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
      localStorage.setItem(T.WCM_RECENT_WALLET_DATA, JSON.stringify(e));
    } catch {
      console.info("Unable to set recent wallet");
    }
  },
  getRecentWallet() {
    try {
      const e = localStorage.getItem(T.WCM_RECENT_WALLET_DATA);
      return e ? JSON.parse(e) : void 0;
    } catch {
      console.info("Unable to get recent wallet");
    }
  },
  caseSafeIncludes(e, t) {
    return e.toUpperCase().includes(t.toUpperCase());
  },
  openWalletExplorerUrl() {
    x.openHref(T.EXPLORER_WALLET_URL, "_blank");
  },
  getCachedRouterWalletPlatforms() {
    const { desktop: e, mobile: t } = x.getWalletRouterData(), r = !!e?.native, o = !!e?.universal, n = !!t?.native || !!t?.universal;
    return { isDesktop: r, isMobile: n, isWeb: o };
  },
  goToConnectingView(e) {
    U.setData({ Wallet: e });
    const t = x.isMobile(), { isDesktop: r, isWeb: o, isMobile: n } = T.getCachedRouterWalletPlatforms();
    t ? n ? (U.push("MobileConnecting"), !x.isAndroid() && x.isTelegram() && this.handleMobileLinking(e, "_blank")) : o ? U.push("WebConnecting") : U.push("InstallWallet") : r ? U.push("DesktopConnecting") : o ? U.push("WebConnecting") : n ? U.push("MobileQrcodeConnecting") : U.push("InstallWallet");
  }
}, Oa = B`.wcm-router{overflow:hidden;will-change:transform}.wcm-content{display:flex;flex-direction:column}`;
var Ia = Object.defineProperty, Pa = Object.getOwnPropertyDescriptor, Jr = (e, t, r, o) => {
  for (var n = o > 1 ? void 0 : o ? Pa(t, r) : t, i = e.length - 1, s; i >= 0; i--)
    (s = e[i]) && (n = (o ? s(t, r, n) : s(n)) || n);
  return o && n && Ia(t, r, n), n;
};
let it = class extends W {
  // -- lifecycle ---------------------------------------------------- //
  constructor() {
    super(), this.view = U.state.view, this.prevView = U.state.view, this.unsubscribe = void 0, this.oldHeight = "0px", this.resizeObserver = void 0, this.unsubscribe = U.subscribe((e) => {
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
    return T.getShadowRootElement(this, ".wcm-router");
  }
  get contentEl() {
    return T.getShadowRootElement(this, ".wcm-content");
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
    ).finished, this.view = U.state.view, Ce(this.routerEl, { opacity: [0, 1], scale: [0.99, 1] }, { duration: 0.37, delay: 0.05 });
  }
  // -- render ------------------------------------------------------- //
  render() {
    return y`<div class="wcm-router"><div class="wcm-content">${this.viewTemplate()}</div></div>`;
  }
};
it.styles = [L.globalCss, Oa];
Jr([
  Y()
], it.prototype, "view", 2);
Jr([
  Y()
], it.prototype, "prevView", 2);
it = Jr([
  N("wcm-modal-router")
], it);
const Sa = B`div{height:36px;width:max-content;display:flex;justify-content:center;align-items:center;padding:9px 15px 11px;position:absolute;top:12px;box-shadow:0 6px 14px -6px rgba(10,16,31,.3),0 10px 32px -4px rgba(10,16,31,.15);z-index:2;left:50%;transform:translateX(-50%);pointer-events:none;backdrop-filter:blur(20px) saturate(1.8);-webkit-backdrop-filter:blur(20px) saturate(1.8);border-radius:var(--wcm-notification-border-radius);border:1px solid var(--wcm-color-overlay);background-color:var(--wcm-color-overlay)}svg{margin-right:5px}@-moz-document url-prefix(){div{background-color:var(--wcm-color-bg-3)}}.wcm-success path{fill:var(--wcm-accent-color)}.wcm-error path{fill:var(--wcm-error-color)}`;
var Ma = Object.defineProperty, Ta = Object.getOwnPropertyDescriptor, Bo = (e, t, r, o) => {
  for (var n = o > 1 ? void 0 : o ? Ta(t, r) : t, i = e.length - 1, s; i >= 0; i--)
    (s = e[i]) && (n = (o ? s(t, r, n) : s(n)) || n);
  return o && n && Ma(t, r, n), n;
};
let $t = class extends W {
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
    return this.open ? y`<div class="${ae(r)}">${t === "success" ? k.CHECKMARK_ICON : null} ${t === "error" ? k.CROSS_ICON : null}<wcm-text variant="small-regular">${e}</wcm-text></div>` : null;
  }
};
$t.styles = [L.globalCss, Sa];
Bo([
  Y()
], $t.prototype, "open", 2);
$t = Bo([
  N("wcm-modal-toast")
], $t);
const Ra = 0.1, mo = 2.5, ie = 7;
function vr(e, t, r) {
  return e === t ? !1 : (e - t < 0 ? t - e : e - t) <= r + Ra;
}
function Wa(e, t) {
  const r = Array.prototype.slice.call(
    ta.create(e, { errorCorrectionLevel: t }).modules.data,
    0
  ), o = Math.sqrt(r.length);
  return r.reduce(
    (n, i, s) => (s % o === 0 ? n.push([i]) : n[n.length - 1].push(i)) && n,
    []
  );
}
const La = {
  generate(e, t, r) {
    const o = "#141414", n = "#ffffff", i = [], s = Wa(e, "Q"), a = t / s.length, l = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 }
    ];
    l.forEach(({ x: b, y: w }) => {
      const M = (s.length - ie) * a * b, p = (s.length - ie) * a * w, I = 0.45;
      for (let $ = 0; $ < l.length; $ += 1) {
        const A = a * (ie - $ * 2);
        i.push(
          j`<rect fill="${$ % 2 === 0 ? o : n}" height="${A}" rx="${A * I}" ry="${A * I}" width="${A}" x="${M + a * $}" y="${p + a * $}">`
        );
      }
    });
    const c = Math.floor((r + 25) / a), m = s.length / 2 - c / 2, g = s.length / 2 + c / 2 - 1, h = [];
    s.forEach((b, w) => {
      b.forEach((M, p) => {
        if (s[w][p] && !(w < ie && p < ie || w > s.length - (ie + 1) && p < ie || w < ie && p > s.length - (ie + 1)) && !(w > m && w < g && p > m && p < g)) {
          const I = w * a + a / 2, $ = p * a + a / 2;
          h.push([I, $]);
        }
      });
    });
    const f = {};
    return h.forEach(([b, w]) => {
      f[b] ? f[b].push(w) : f[b] = [w];
    }), Object.entries(f).map(([b, w]) => {
      const M = w.filter(
        (p) => w.every((I) => !vr(p, I, a))
      );
      return [Number(b), M];
    }).forEach(([b, w]) => {
      w.forEach((M) => {
        i.push(
          j`<circle cx="${b}" cy="${M}" fill="${o}" r="${a / mo}">`
        );
      });
    }), Object.entries(f).filter(([b, w]) => w.length > 1).map(([b, w]) => {
      const M = w.filter((p) => w.some((I) => vr(p, I, a)));
      return [Number(b), M];
    }).map(([b, w]) => {
      w.sort((p, I) => p < I ? -1 : 1);
      const M = [];
      for (const p of w) {
        const I = M.find(
          ($) => $.some((A) => vr(p, A, a))
        );
        I ? I.push(p) : M.push([p]);
      }
      return [b, M.map((p) => [p[0], p[p.length - 1]])];
    }).forEach(([b, w]) => {
      w.forEach(([M, p]) => {
        i.push(
          j`<line x1="${b}" x2="${b}" y1="${M}" y2="${p}" stroke="${o}" stroke-width="${a / (mo / 2)}" stroke-linecap="round">`
        );
      });
    }), i;
  }
}, Da = B`@keyframes fadeIn{0%{opacity:0}100%{opacity:1}}div{position:relative;user-select:none;display:block;overflow:hidden;aspect-ratio:1/1;animation:fadeIn ease .2s}.wcm-dark{background-color:#fff;border-radius:var(--wcm-container-border-radius);padding:18px;box-shadow:0 2px 5px #000}svg:first-child,wcm-wallet-image{position:absolute;top:50%;left:50%;transform:translateY(-50%) translateX(-50%)}wcm-wallet-image{transform:translateY(-50%) translateX(-50%)}wcm-wallet-image{width:25%;height:25%;border-radius:var(--wcm-wallet-icon-border-radius)}svg:first-child{transform:translateY(-50%) translateX(-50%) scale(.9)}svg:first-child path:first-child{fill:var(--wcm-accent-color)}svg:first-child path:last-child{stroke:var(--wcm-color-overlay)}`;
var Na = Object.defineProperty, Ba = Object.getOwnPropertyDescriptor, Ze = (e, t, r, o) => {
  for (var n = o > 1 ? void 0 : o ? Ba(t, r) : t, i = e.length - 1, s; i >= 0; i--)
    (s = e[i]) && (n = (o ? s(t, r, n) : s(n)) || n);
  return o && n && Na(t, r, n), n;
};
let se = class extends W {
  constructor() {
    super(...arguments), this.uri = "", this.size = 0, this.imageId = void 0, this.walletId = void 0, this.imageUrl = void 0;
  }
  // -- private ------------------------------------------------------ //
  svgTemplate() {
    const t = fe.state.themeMode === "light" ? this.size : this.size - 36;
    return j`<svg height="${t}" width="${t}">${La.generate(this.uri, t, t / 4)}</svg>`;
  }
  // -- render ------------------------------------------------------- //
  render() {
    const e = {
      "wcm-dark": fe.state.themeMode === "dark"
    };
    return y`<div style="${`width: ${this.size}px`}" class="${ae(e)}">${this.walletId || this.imageUrl ? y`<wcm-wallet-image walletId="${q(this.walletId)}" imageId="${q(this.imageId)}" imageUrl="${q(this.imageUrl)}"></wcm-wallet-image>` : k.WALLET_CONNECT_ICON_COLORED} ${this.svgTemplate()}</div>`;
  }
};
se.styles = [L.globalCss, Da];
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
const ka = B`:host{position:relative;height:28px;width:80%}input{width:100%;height:100%;line-height:28px!important;border-radius:var(--wcm-input-border-radius);font-style:normal;font-family:-apple-system,system-ui,BlinkMacSystemFont,'Segoe UI',Roboto,Ubuntu,'Helvetica Neue',sans-serif;font-feature-settings:'case' on;font-weight:500;font-size:16px;letter-spacing:-.03em;padding:0 10px 0 34px;transition:.2s all ease;color:var(--wcm-color-fg-1);background-color:var(--wcm-color-bg-3);box-shadow:inset 0 0 0 1px var(--wcm-color-overlay);caret-color:var(--wcm-accent-color)}input::placeholder{color:var(--wcm-color-fg-2)}svg{left:10px;top:4px;pointer-events:none;position:absolute;width:20px;height:20px}input:focus-within{box-shadow:inset 0 0 0 1px var(--wcm-accent-color)}path{fill:var(--wcm-color-fg-2)}`;
var Ua = Object.defineProperty, ja = Object.getOwnPropertyDescriptor, ko = (e, t, r, o) => {
  for (var n = o > 1 ? void 0 : o ? ja(t, r) : t, i = e.length - 1, s; i >= 0; i--)
    (s = e[i]) && (n = (o ? s(t, r, n) : s(n)) || n);
  return o && n && Ua(t, r, n), n;
};
let Et = class extends W {
  constructor() {
    super(...arguments), this.onChange = () => null;
  }
  // -- render ------------------------------------------------------- //
  render() {
    return y`<input type="text" @input="${this.onChange}" placeholder="Search wallets"> ${k.SEARCH_ICON}`;
  }
};
Et.styles = [L.globalCss, ka];
ko([
  R()
], Et.prototype, "onChange", 2);
Et = ko([
  N("wcm-search-input")
], Et);
const Ha = B`@keyframes rotate{100%{transform:rotate(360deg)}}@keyframes dash{0%{stroke-dasharray:1,150;stroke-dashoffset:0}50%{stroke-dasharray:90,150;stroke-dashoffset:-35}100%{stroke-dasharray:90,150;stroke-dashoffset:-124}}svg{animation:rotate 2s linear infinite;display:flex;justify-content:center;align-items:center}svg circle{stroke-linecap:round;animation:dash 1.5s ease infinite;stroke:var(--wcm-accent-color)}`;
var Va = Object.getOwnPropertyDescriptor, Fa = (e, t, r, o) => {
  for (var n = o > 1 ? void 0 : o ? Va(t, r) : t, i = e.length - 1, s; i >= 0; i--)
    (s = e[i]) && (n = s(n) || n);
  return n;
};
let Lr = class extends W {
  // -- render ------------------------------------------------------- //
  render() {
    return y`<svg viewBox="0 0 50 50" width="24" height="24"><circle cx="25" cy="25" r="20" fill="none" stroke-width="4" stroke="#fff"/></svg>`;
  }
};
Lr.styles = [L.globalCss, Ha];
Lr = Fa([
  N("wcm-spinner")
], Lr);
const za = B`span{font-style:normal;font-family:var(--wcm-font-family);font-feature-settings:var(--wcm-font-feature-settings)}.wcm-xsmall-bold{font-family:var(--wcm-text-xsmall-bold-font-family);font-weight:var(--wcm-text-xsmall-bold-weight);font-size:var(--wcm-text-xsmall-bold-size);line-height:var(--wcm-text-xsmall-bold-line-height);letter-spacing:var(--wcm-text-xsmall-bold-letter-spacing);text-transform:var(--wcm-text-xsmall-bold-text-transform)}.wcm-xsmall-regular{font-family:var(--wcm-text-xsmall-regular-font-family);font-weight:var(--wcm-text-xsmall-regular-weight);font-size:var(--wcm-text-xsmall-regular-size);line-height:var(--wcm-text-xsmall-regular-line-height);letter-spacing:var(--wcm-text-xsmall-regular-letter-spacing);text-transform:var(--wcm-text-xsmall-regular-text-transform)}.wcm-small-thin{font-family:var(--wcm-text-small-thin-font-family);font-weight:var(--wcm-text-small-thin-weight);font-size:var(--wcm-text-small-thin-size);line-height:var(--wcm-text-small-thin-line-height);letter-spacing:var(--wcm-text-small-thin-letter-spacing);text-transform:var(--wcm-text-small-thin-text-transform)}.wcm-small-regular{font-family:var(--wcm-text-small-regular-font-family);font-weight:var(--wcm-text-small-regular-weight);font-size:var(--wcm-text-small-regular-size);line-height:var(--wcm-text-small-regular-line-height);letter-spacing:var(--wcm-text-small-regular-letter-spacing);text-transform:var(--wcm-text-small-regular-text-transform)}.wcm-medium-regular{font-family:var(--wcm-text-medium-regular-font-family);font-weight:var(--wcm-text-medium-regular-weight);font-size:var(--wcm-text-medium-regular-size);line-height:var(--wcm-text-medium-regular-line-height);letter-spacing:var(--wcm-text-medium-regular-letter-spacing);text-transform:var(--wcm-text-medium-regular-text-transform)}.wcm-big-bold{font-family:var(--wcm-text-big-bold-font-family);font-weight:var(--wcm-text-big-bold-weight);font-size:var(--wcm-text-big-bold-size);line-height:var(--wcm-text-big-bold-line-height);letter-spacing:var(--wcm-text-big-bold-letter-spacing);text-transform:var(--wcm-text-big-bold-text-transform)}:host(*){color:var(--wcm-color-fg-1)}.wcm-color-primary{color:var(--wcm-color-fg-1)}.wcm-color-secondary{color:var(--wcm-color-fg-2)}.wcm-color-tertiary{color:var(--wcm-color-fg-3)}.wcm-color-inverse{color:var(--wcm-accent-fill-color)}.wcm-color-accnt{color:var(--wcm-accent-color)}.wcm-color-error{color:var(--wcm-error-color)}`;
var qa = Object.defineProperty, Za = Object.getOwnPropertyDescriptor, Xr = (e, t, r, o) => {
  for (var n = o > 1 ? void 0 : o ? Za(t, r) : t, i = e.length - 1, s; i >= 0; i--)
    (s = e[i]) && (n = (o ? s(t, r, n) : s(n)) || n);
  return o && n && qa(t, r, n), n;
};
let st = class extends W {
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
st.styles = [L.globalCss, za];
Xr([
  R()
], st.prototype, "variant", 2);
Xr([
  R()
], st.prototype, "color", 2);
st = Xr([
  N("wcm-text")
], st);
const Ka = B`button{width:100%;height:100%;border-radius:var(--wcm-button-hover-highlight-border-radius);display:flex;align-items:flex-start}button:active{background-color:var(--wcm-color-overlay)}@media(hover:hover){button:hover{background-color:var(--wcm-color-overlay)}}button>div{width:80px;padding:5px 0;display:flex;flex-direction:column;align-items:center}wcm-text{width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:center}wcm-wallet-image{height:60px;width:60px;transition:all .2s ease;border-radius:var(--wcm-wallet-icon-border-radius);margin-bottom:5px}.wcm-sublabel{margin-top:2px}`;
var Ya = Object.defineProperty, Qa = Object.getOwnPropertyDescriptor, ve = (e, t, r, o) => {
  for (var n = o > 1 ? void 0 : o ? Qa(t, r) : t, i = e.length - 1, s; i >= 0; i--)
    (s = e[i]) && (n = (o ? s(t, r, n) : s(n)) || n);
  return o && n && Ya(t, r, n), n;
};
let re = class extends W {
  constructor() {
    super(...arguments), this.onClick = () => null, this.name = "", this.walletId = "", this.label = void 0, this.imageId = void 0, this.installed = !1, this.recent = !1;
  }
  // -- private ------------------------------------------------------ //
  sublabelTemplate() {
    return this.recent ? y`<wcm-text class="wcm-sublabel" variant="xsmall-bold" color="tertiary">RECENT</wcm-text>` : this.installed ? y`<wcm-text class="wcm-sublabel" variant="xsmall-bold" color="tertiary">INSTALLED</wcm-text>` : null;
  }
  handleClick() {
    po.click({ name: "WALLET_BUTTON", walletId: this.walletId }), this.onClick();
  }
  // -- render ------------------------------------------------------- //
  render() {
    var e;
    return y`<button @click="${this.handleClick.bind(this)}"><div><wcm-wallet-image walletId="${this.walletId}" imageId="${q(this.imageId)}"></wcm-wallet-image><wcm-text variant="xsmall-regular">${(e = this.label) != null ? e : T.getWalletName(this.name, !0)}</wcm-text>${this.sublabelTemplate()}</div></button>`;
  }
};
re.styles = [L.globalCss, Ka];
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
const Ga = B`:host{display:block}div{overflow:hidden;position:relative;border-radius:inherit;width:100%;height:100%;background-color:var(--wcm-color-overlay)}svg{position:relative;width:100%;height:100%}div::after{content:'';position:absolute;top:0;bottom:0;left:0;right:0;border-radius:inherit;border:1px solid var(--wcm-color-overlay)}div img{width:100%;height:100%;object-fit:cover;object-position:center}#wallet-placeholder-fill{fill:var(--wcm-color-bg-3)}#wallet-placeholder-dash{stroke:var(--wcm-color-overlay)}`;
var Ja = Object.defineProperty, Xa = Object.getOwnPropertyDescriptor, St = (e, t, r, o) => {
  for (var n = o > 1 ? void 0 : o ? Xa(t, r) : t, i = e.length - 1, s; i >= 0; i--)
    (s = e[i]) && (n = (o ? s(t, r, n) : s(n)) || n);
  return o && n && Ja(t, r, n), n;
};
let Ve = class extends W {
  constructor() {
    super(...arguments), this.walletId = "", this.imageId = void 0, this.imageUrl = void 0;
  }
  // -- render ------------------------------------------------------- //
  render() {
    var e;
    const t = (e = this.imageUrl) != null && e.length ? this.imageUrl : T.getWalletIcon({ id: this.walletId, image_id: this.imageId });
    return y`${t.length ? y`<div><img crossorigin="anonymous" src="${t}" alt="${this.id}"></div>` : k.WALLET_PLACEHOLDER}`;
  }
};
Ve.styles = [L.globalCss, Ga];
St([
  R()
], Ve.prototype, "walletId", 2);
St([
  R()
], Ve.prototype, "imageId", 2);
St([
  R()
], Ve.prototype, "imageUrl", 2);
Ve = St([
  N("wcm-wallet-image")
], Ve);
var el = Object.defineProperty, tl = Object.getOwnPropertyDescriptor, Uo = (e, t, r, o) => {
  for (var n = o > 1 ? void 0 : o ? tl(t, r) : t, i = e.length - 1, s; i >= 0; i--)
    (s = e[i]) && (n = (o ? s(t, r, n) : s(n)) || n);
  return o && n && el(t, r, n), n;
};
let Dr = class extends W {
  // -- lifecycle ---------------------------------------------------- //
  constructor() {
    super(), this.preload = !0, this.preloadData();
  }
  // -- private ------------------------------------------------------ //
  async loadImages(e) {
    try {
      e?.length && await Promise.all(e.map(async (t) => T.preloadImage(t)));
    } catch {
      console.info("Unsuccessful attempt at preloading some images", e);
    }
  }
  async preloadListings() {
    if (G.state.enableExplorer) {
      await K.getRecomendedWallets(), H.setIsDataLoaded(!0);
      const { recomendedWallets: e } = K.state, t = e.map((r) => T.getWalletIcon(r));
      await this.loadImages(t);
    } else
      H.setIsDataLoaded(!0);
  }
  async preloadCustomImages() {
    const e = T.getCustomImageUrls();
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
Uo([
  Y()
], Dr.prototype, "preload", 2);
Dr = Uo([
  N("wcm-explorer-context")
], Dr);
var rl = Object.getOwnPropertyDescriptor, nl = (e, t, r, o) => {
  for (var n = o > 1 ? void 0 : o ? rl(t, r) : t, i = e.length - 1, s; i >= 0; i--)
    (s = e[i]) && (n = s(n) || n);
  return n;
};
let fo = class extends W {
  // -- lifecycle ---------------------------------------------------- //
  constructor() {
    super(), this.unsubscribeTheme = void 0, L.setTheme(), this.unsubscribeTheme = fe.subscribe(L.setTheme);
  }
  disconnectedCallback() {
    var e;
    (e = this.unsubscribeTheme) == null || e.call(this);
  }
};
fo = nl([
  N("wcm-theme-context")
], fo);
const ol = B`@keyframes scroll{0%{transform:translate3d(0,0,0)}100%{transform:translate3d(calc(-70px * 9),0,0)}}.wcm-slider{position:relative;overflow-x:hidden;padding:10px 0;margin:0 -20px;width:calc(100% + 40px)}.wcm-track{display:flex;width:calc(70px * 18);animation:scroll 20s linear infinite;opacity:.7}.wcm-track svg{margin:0 5px}wcm-wallet-image{width:60px;height:60px;margin:0 5px;border-radius:var(--wcm-wallet-icon-border-radius)}.wcm-grid{display:grid;grid-template-columns:repeat(4,80px);justify-content:space-between}.wcm-title{display:flex;align-items:center;margin-bottom:10px}.wcm-title svg{margin-right:6px}.wcm-title path{fill:var(--wcm-accent-color)}wcm-modal-footer .wcm-title{padding:0 10px}wcm-button-big{position:absolute;top:50%;left:50%;transform:translateY(-50%) translateX(-50%);filter:drop-shadow(0 0 17px var(--wcm-color-bg-1))}wcm-info-footer{flex-direction:column;align-items:center;display:flex;width:100%;padding:5px 0}wcm-info-footer wcm-text{text-align:center;margin-bottom:15px}#wallet-placeholder-fill{fill:var(--wcm-color-bg-3)}#wallet-placeholder-dash{stroke:var(--wcm-color-overlay)}`;
var il = Object.getOwnPropertyDescriptor, sl = (e, t, r, o) => {
  for (var n = o > 1 ? void 0 : o ? il(t, r) : t, i = e.length - 1, s; i >= 0; i--)
    (s = e[i]) && (n = s(n) || n);
  return n;
};
let Nr = class extends W {
  // -- private ------------------------------------------------------ //
  onGoToQrcode() {
    U.push("Qrcode");
  }
  // -- render ------------------------------------------------------- //
  render() {
    const { recomendedWallets: e } = K.state, t = [...e, ...e], r = x.RECOMMENDED_WALLET_AMOUNT * 2;
    return y`<wcm-modal-header title="Connect your wallet" .onAction="${this.onGoToQrcode}" .actionIcon="${k.QRCODE_ICON}"></wcm-modal-header><wcm-modal-content><div class="wcm-title">${k.MOBILE_ICON}<wcm-text variant="small-regular" color="accent">WalletConnect</wcm-text></div><div class="wcm-slider"><div class="wcm-track">${[...Array(r)].map((o, n) => {
      const i = t[n % t.length];
      return i ? y`<wcm-wallet-image walletId="${i.id}" imageId="${i.image_id}"></wcm-wallet-image>` : k.WALLET_PLACEHOLDER;
    })}</div><wcm-button-big @click="${T.handleAndroidLinking}"><wcm-text variant="medium-regular" color="inverse">Select Wallet</wcm-text></wcm-button-big></div></wcm-modal-content><wcm-info-footer><wcm-text color="secondary" variant="small-thin">Choose WalletConnect to see supported apps on your device</wcm-text></wcm-info-footer>`;
  }
};
Nr.styles = [L.globalCss, ol];
Nr = sl([
  N("wcm-android-wallet-selection")
], Nr);
const al = B`@keyframes loading{to{stroke-dashoffset:0}}@keyframes shake{10%,90%{transform:translate3d(-1px,0,0)}20%,80%{transform:translate3d(1px,0,0)}30%,50%,70%{transform:translate3d(-2px,0,0)}40%,60%{transform:translate3d(2px,0,0)}}:host{display:flex;flex-direction:column;align-items:center}div{position:relative;width:110px;height:110px;display:flex;justify-content:center;align-items:center;margin:40px 0 20px 0;transform:translate3d(0,0,0)}svg{position:absolute;width:110px;height:110px;fill:none;stroke:transparent;stroke-linecap:round;stroke-width:2px;top:0;left:0}use{stroke:var(--wcm-accent-color);animation:loading 1s linear infinite}wcm-wallet-image{border-radius:var(--wcm-wallet-icon-large-border-radius);width:90px;height:90px}wcm-text{margin-bottom:40px}.wcm-error svg{stroke:var(--wcm-error-color)}.wcm-error use{display:none}.wcm-error{animation:shake .4s cubic-bezier(.36,.07,.19,.97) both}.wcm-stale svg,.wcm-stale use{display:none}`;
var ll = Object.defineProperty, cl = Object.getOwnPropertyDescriptor, Ke = (e, t, r, o) => {
  for (var n = o > 1 ? void 0 : o ? cl(t, r) : t, i = e.length - 1, s; i >= 0; i--)
    (s = e[i]) && (n = (o ? s(t, r, n) : s(n)) || n);
  return o && n && ll(t, r, n), n;
};
let ge = class extends W {
  constructor() {
    super(...arguments), this.walletId = void 0, this.imageId = void 0, this.isError = !1, this.isStale = !1, this.label = "";
  }
  // -- private ------------------------------------------------------ //
  svgLoaderTemplate() {
    var e, t;
    const i = (t = (e = fe.state.themeVariables) == null ? void 0 : e["--wcm-wallet-icon-large-border-radius"]) != null ? t : L.getPreset("--wcm-wallet-icon-large-border-radius");
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
ge.styles = [L.globalCss, al];
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
const ke = {
  manualWallets() {
    var e, t;
    const { mobileWallets: r, desktopWallets: o } = G.state, n = (e = ke.recentWallet()) == null ? void 0 : e.id, i = x.isMobile() ? r : o, s = i?.filter((a) => n !== a.id);
    return (t = x.isMobile() ? s?.map(({ id: a, name: l, links: c }) => ({ id: a, name: l, mobile: c, links: c })) : s?.map(({ id: a, name: l, links: c }) => ({ id: a, name: l, desktop: c, links: c }))) != null ? t : [];
  },
  recentWallet() {
    return T.getRecentWallet();
  },
  recomendedWallets(e = !1) {
    var t;
    const r = e || (t = ke.recentWallet()) == null ? void 0 : t.id, { recomendedWallets: o } = K.state;
    return o.filter((i) => r !== i.id);
  }
}, me = {
  onConnecting(e) {
    T.goToConnectingView(e);
  },
  manualWalletsTemplate() {
    return ke.manualWallets().map(
      (t) => y`<wcm-wallet-button walletId="${t.id}" name="${t.name}" .onClick="${() => this.onConnecting(t)}"></wcm-wallet-button>`
    );
  },
  recomendedWalletsTemplate(e = !1) {
    return ke.recomendedWallets(e).map(
      (r) => y`<wcm-wallet-button name="${r.name}" walletId="${r.id}" imageId="${r.image_id}" .onClick="${() => this.onConnecting(r)}"></wcm-wallet-button>`
    );
  },
  recentWalletTemplate() {
    const e = ke.recentWallet();
    if (e)
      return y`<wcm-wallet-button name="${e.name}" walletId="${e.id}" imageId="${q(e.image_id)}" .recent="${!0}" .onClick="${() => this.onConnecting(e)}"></wcm-wallet-button>`;
  }
}, dl = B`.wcm-grid{display:grid;grid-template-columns:repeat(4,80px);justify-content:space-between}.wcm-desktop-title,.wcm-mobile-title{display:flex;align-items:center}.wcm-mobile-title{justify-content:space-between;margin-bottom:20px;margin-top:-10px}.wcm-desktop-title{margin-bottom:10px;padding:0 10px}.wcm-subtitle{display:flex;align-items:center}.wcm-subtitle:last-child path{fill:var(--wcm-color-fg-3)}.wcm-desktop-title svg,.wcm-mobile-title svg{margin-right:6px}.wcm-desktop-title path,.wcm-mobile-title path{fill:var(--wcm-accent-color)}`;
var ul = Object.getOwnPropertyDescriptor, hl = (e, t, r, o) => {
  for (var n = o > 1 ? void 0 : o ? ul(t, r) : t, i = e.length - 1, s; i >= 0; i--)
    (s = e[i]) && (n = s(n) || n);
  return n;
};
let Br = class extends W {
  // -- render ------------------------------------------------------- //
  render() {
    const { explorerExcludedWalletIds: e, enableExplorer: t } = G.state, r = e !== "ALL" && t, o = me.manualWalletsTemplate(), n = me.recomendedWalletsTemplate();
    let s = [me.recentWalletTemplate(), ...o, ...n];
    s = s.filter(Boolean);
    const a = s.length > 4 || r;
    let l = [];
    a ? l = s.slice(0, 3) : l = s;
    const c = !!l.length;
    return y`<wcm-modal-header .border="${!0}" title="Connect your wallet" .onAction="${T.handleUriCopy}" .actionIcon="${k.COPY_ICON}"></wcm-modal-header><wcm-modal-content><div class="wcm-mobile-title"><div class="wcm-subtitle">${k.MOBILE_ICON}<wcm-text variant="small-regular" color="accent">Mobile</wcm-text></div><div class="wcm-subtitle">${k.SCAN_ICON}<wcm-text variant="small-regular" color="secondary">Scan with your wallet</wcm-text></div></div><wcm-walletconnect-qr></wcm-walletconnect-qr></wcm-modal-content>${c ? y`<wcm-modal-footer><div class="wcm-desktop-title">${k.DESKTOP_ICON}<wcm-text variant="small-regular" color="accent">Desktop</wcm-text></div><div class="wcm-grid">${l} ${a ? y`<wcm-view-all-wallets-button></wcm-view-all-wallets-button>` : null}</div></wcm-modal-footer>` : null}`;
  }
};
Br.styles = [L.globalCss, dl];
Br = hl([
  N("wcm-desktop-wallet-selection")
], Br);
const ml = B`div{background-color:var(--wcm-color-bg-2);padding:10px 20px 15px 20px;border-top:1px solid var(--wcm-color-bg-3);text-align:center}a{color:var(--wcm-accent-color);text-decoration:none;transition:opacity .2s ease-in-out;display:inline}a:active{opacity:.8}@media(hover:hover){a:hover{opacity:.8}}`;
var fl = Object.getOwnPropertyDescriptor, pl = (e, t, r, o) => {
  for (var n = o > 1 ? void 0 : o ? fl(t, r) : t, i = e.length - 1, s; i >= 0; i--)
    (s = e[i]) && (n = s(n) || n);
  return n;
};
let kr = class extends W {
  // -- render ------------------------------------------------------- //
  render() {
    const { termsOfServiceUrl: e, privacyPolicyUrl: t } = G.state;
    return e ?? t ? y`<div><wcm-text variant="small-regular" color="secondary">By connecting your wallet to this app, you agree to the app's ${e ? y`<a href="${e}" target="_blank" rel="noopener noreferrer">Terms of Service</a>` : null} ${e && t ? "and" : null} ${t ? y`<a href="${t}" target="_blank" rel="noopener noreferrer">Privacy Policy</a>` : null}</wcm-text></div>` : null;
  }
};
kr.styles = [L.globalCss, ml];
kr = pl([
  N("wcm-legal-notice")
], kr);
const gl = B`div{display:grid;grid-template-columns:repeat(4,80px);margin:0 -10px;justify-content:space-between;row-gap:10px}`;
var wl = Object.getOwnPropertyDescriptor, vl = (e, t, r, o) => {
  for (var n = o > 1 ? void 0 : o ? wl(t, r) : t, i = e.length - 1, s; i >= 0; i--)
    (s = e[i]) && (n = s(n) || n);
  return n;
};
let Ur = class extends W {
  // -- private ------------------------------------------------------ //
  onQrcode() {
    U.push("Qrcode");
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
    return y`<wcm-modal-header title="Connect your wallet" .onAction="${this.onQrcode}" .actionIcon="${k.QRCODE_ICON}"></wcm-modal-header>${c ? y`<wcm-modal-content><div>${l} ${a ? y`<wcm-view-all-wallets-button></wcm-view-all-wallets-button>` : null}</div></wcm-modal-content>` : null}`;
  }
};
Ur.styles = [L.globalCss, gl];
Ur = vl([
  N("wcm-mobile-wallet-selection")
], Ur);
const bl = B`:host{all:initial}.wcm-overlay{top:0;bottom:0;left:0;right:0;position:fixed;z-index:var(--wcm-z-index);overflow:hidden;display:flex;justify-content:center;align-items:center;opacity:0;pointer-events:none;background-color:var(--wcm-overlay-background-color);backdrop-filter:var(--wcm-overlay-backdrop-filter)}@media(max-height:720px) and (orientation:landscape){.wcm-overlay{overflow:scroll;align-items:flex-start;padding:20px 0}}.wcm-active{pointer-events:auto}.wcm-container{position:relative;max-width:360px;width:100%;outline:0;border-radius:var(--wcm-background-border-radius) var(--wcm-background-border-radius) var(--wcm-container-border-radius) var(--wcm-container-border-radius);border:1px solid var(--wcm-color-overlay);overflow:hidden}.wcm-card{width:100%;position:relative;border-radius:var(--wcm-container-border-radius);overflow:hidden;box-shadow:0 6px 14px -6px rgba(10,16,31,.12),0 10px 32px -4px rgba(10,16,31,.1),0 0 0 1px var(--wcm-color-overlay);background-color:var(--wcm-color-bg-1);color:var(--wcm-color-fg-1)}@media(max-width:600px){.wcm-container{max-width:440px;border-radius:var(--wcm-background-border-radius) var(--wcm-background-border-radius) 0 0}.wcm-card{border-radius:var(--wcm-container-border-radius) var(--wcm-container-border-radius) 0 0}.wcm-overlay{align-items:flex-end}}@media(max-width:440px){.wcm-container{border:0}}`;
var yl = Object.defineProperty, _l = Object.getOwnPropertyDescriptor, en = (e, t, r, o) => {
  for (var n = o > 1 ? void 0 : o ? _l(t, r) : t, i = e.length - 1, s; i >= 0; i--)
    (s = e[i]) && (n = (o ? s(t, r, n) : s(n)) || n);
  return o && n && yl(t, r, n), n;
};
let Fe = class extends W {
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
    return T.getShadowRootElement(this, ".wcm-overlay");
  }
  get containerEl() {
    return T.getShadowRootElement(this, ".wcm-container");
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
      const e = T.isMobileAnimation() ? { y: ["50vh", "0vh"] } : { scale: [0.98, 1] }, t = 0.1, r = 0.2;
      await Promise.all([
        Ce(this.overlayEl, { opacity: [0, 1] }, { delay: t, duration: r }).finished,
        Ce(this.containerEl, e, { delay: t, duration: r }).finished
      ]), this.active = !0;
    }, 0);
  }
  async onCloseModalEvent() {
    this.toggleBodyScroll(!0), this.removeKeyboardEvents();
    const e = T.isMobileAnimation() ? { y: ["0vh", "50vh"] } : { scale: [1, 0.98] }, t = 0.2;
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
Fe.styles = [L.globalCss, bl];
en([
  Y()
], Fe.prototype, "open", 2);
en([
  Y()
], Fe.prototype, "active", 2);
Fe = en([
  N("wcm-modal")
], Fe);
const xl = B`div{display:flex;margin-top:15px}slot{display:inline-block;margin:0 5px}wcm-button{margin:0 5px}`;
var Cl = Object.defineProperty, $l = Object.getOwnPropertyDescriptor, ct = (e, t, r, o) => {
  for (var n = o > 1 ? void 0 : o ? $l(t, r) : t, i = e.length - 1, s; i >= 0; i--)
    (s = e[i]) && (n = (o ? s(t, r, n) : s(n)) || n);
  return o && n && Cl(t, r, n), n;
};
let Ie = class extends W {
  constructor() {
    super(...arguments), this.isMobile = !1, this.isDesktop = !1, this.isWeb = !1, this.isRetry = !1;
  }
  // -- private ------------------------------------------------------ //
  onMobile() {
    x.isMobile() ? U.replace("MobileConnecting") : U.replace("MobileQrcodeConnecting");
  }
  onDesktop() {
    U.replace("DesktopConnecting");
  }
  onWeb() {
    U.replace("WebConnecting");
  }
  // -- render ------------------------------------------------------- //
  render() {
    return y`<div>${this.isRetry ? y`<slot></slot>` : null} ${this.isMobile ? y`<wcm-button .onClick="${this.onMobile}" .iconLeft="${k.MOBILE_ICON}" variant="outline">Mobile</wcm-button>` : null} ${this.isDesktop ? y`<wcm-button .onClick="${this.onDesktop}" .iconLeft="${k.DESKTOP_ICON}" variant="outline">Desktop</wcm-button>` : null} ${this.isWeb ? y`<wcm-button .onClick="${this.onWeb}" .iconLeft="${k.GLOBE_ICON}" variant="outline">Web</wcm-button>` : null}</div>`;
  }
};
Ie.styles = [L.globalCss, xl];
ct([
  R({ type: Boolean })
], Ie.prototype, "isMobile", 2);
ct([
  R({ type: Boolean })
], Ie.prototype, "isDesktop", 2);
ct([
  R({ type: Boolean })
], Ie.prototype, "isWeb", 2);
ct([
  R({ type: Boolean })
], Ie.prototype, "isRetry", 2);
Ie = ct([
  N("wcm-platform-selection")
], Ie);
const El = B`button{display:flex;flex-direction:column;padding:5px 10px;border-radius:var(--wcm-button-hover-highlight-border-radius);height:100%;justify-content:flex-start}.wcm-icons{width:60px;height:60px;display:flex;flex-wrap:wrap;padding:7px;border-radius:var(--wcm-wallet-icon-border-radius);justify-content:space-between;align-items:center;margin-bottom:5px;background-color:var(--wcm-color-bg-2);box-shadow:inset 0 0 0 1px var(--wcm-color-overlay)}button:active{background-color:var(--wcm-color-overlay)}@media(hover:hover){button:hover{background-color:var(--wcm-color-overlay)}}.wcm-icons img{width:21px;height:21px;object-fit:cover;object-position:center;border-radius:calc(var(--wcm-wallet-icon-border-radius)/ 2);border:1px solid var(--wcm-color-overlay)}.wcm-icons svg{width:21px;height:21px}.wcm-icons img:nth-child(1),.wcm-icons img:nth-child(2),.wcm-icons svg:nth-child(1),.wcm-icons svg:nth-child(2){margin-bottom:4px}wcm-text{width:100%;text-align:center}#wallet-placeholder-fill{fill:var(--wcm-color-bg-3)}#wallet-placeholder-dash{stroke:var(--wcm-color-overlay)}`;
var Al = Object.getOwnPropertyDescriptor, Ol = (e, t, r, o) => {
  for (var n = o > 1 ? void 0 : o ? Al(t, r) : t, i = e.length - 1, s; i >= 0; i--)
    (s = e[i]) && (n = s(n) || n);
  return n;
};
let jr = class extends W {
  // -- render ------------------------------------------------------- //
  onClick() {
    U.push("WalletExplorer");
  }
  // -- render ------------------------------------------------------- //
  render() {
    const { recomendedWallets: e } = K.state, t = ke.manualWallets(), r = [...e, ...t].reverse().slice(0, 4);
    return y`<button @click="${this.onClick}"><div class="wcm-icons">${r.map((o) => {
      const n = T.getWalletIcon(o);
      if (n)
        return y`<img crossorigin="anonymous" src="${n}">`;
      const i = T.getWalletIcon({ id: o.id });
      return i ? y`<img crossorigin="anonymous" src="${i}">` : k.WALLET_PLACEHOLDER;
    })} ${[...Array(4 - r.length)].map(() => k.WALLET_PLACEHOLDER)}</div><wcm-text variant="xsmall-regular">View All</wcm-text></button>`;
  }
};
jr.styles = [L.globalCss, El];
jr = Ol([
  N("wcm-view-all-wallets-button")
], jr);
const Il = B`.wcm-qr-container{width:100%;display:flex;justify-content:center;align-items:center;aspect-ratio:1/1}`;
var Pl = Object.defineProperty, Sl = Object.getOwnPropertyDescriptor, Mt = (e, t, r, o) => {
  for (var n = o > 1 ? void 0 : o ? Sl(t, r) : t, i = e.length - 1, s; i >= 0; i--)
    (s = e[i]) && (n = (o ? s(t, r, n) : s(n)) || n);
  return o && n && Pl(t, r, n), n;
};
let ze = class extends W {
  // -- lifecycle ---------------------------------------------------- //
  constructor() {
    super(), this.walletId = "", this.imageId = "", this.uri = "", setTimeout(() => {
      const { walletConnectUri: e } = H.state;
      this.uri = e;
    }, 0);
  }
  // -- private ------------------------------------------------------ //
  get overlayEl() {
    return T.getShadowRootElement(this, ".wcm-qr-container");
  }
  // -- render ------------------------------------------------------- //
  render() {
    return y`<div class="wcm-qr-container">${this.uri ? y`<wcm-qrcode size="${this.overlayEl.offsetWidth}" uri="${this.uri}" walletId="${q(this.walletId)}" imageId="${q(this.imageId)}"></wcm-qrcode>` : y`<wcm-spinner></wcm-spinner>`}</div>`;
  }
};
ze.styles = [L.globalCss, Il];
Mt([
  R()
], ze.prototype, "walletId", 2);
Mt([
  R()
], ze.prototype, "imageId", 2);
Mt([
  Y()
], ze.prototype, "uri", 2);
ze = Mt([
  N("wcm-walletconnect-qr")
], ze);
var Ml = Object.getOwnPropertyDescriptor, Tl = (e, t, r, o) => {
  for (var n = o > 1 ? void 0 : o ? Ml(t, r) : t, i = e.length - 1, s; i >= 0; i--)
    (s = e[i]) && (n = s(n) || n);
  return n;
};
let Hr = class extends W {
  // -- private ------------------------------------------------------ //
  viewTemplate() {
    return x.isAndroid() && !x.isTelegram() ? y`<wcm-android-wallet-selection></wcm-android-wallet-selection>` : x.isMobile() ? y`<wcm-mobile-wallet-selection></wcm-mobile-wallet-selection>` : y`<wcm-desktop-wallet-selection></wcm-desktop-wallet-selection>`;
  }
  // -- render ------------------------------------------------------- //
  render() {
    return y`${this.viewTemplate()}<wcm-legal-notice></wcm-legal-notice>`;
  }
};
Hr.styles = [L.globalCss];
Hr = Tl([
  N("wcm-connect-wallet-view")
], Hr);
const Rl = B`wcm-info-footer{flex-direction:column;align-items:center;display:flex;width:100%;padding:5px 0}wcm-text{text-align:center}`;
var Wl = Object.defineProperty, Ll = Object.getOwnPropertyDescriptor, jo = (e, t, r, o) => {
  for (var n = o > 1 ? void 0 : o ? Ll(t, r) : t, i = e.length - 1, s; i >= 0; i--)
    (s = e[i]) && (n = (o ? s(t, r, n) : s(n)) || n);
  return o && n && Wl(t, r, n), n;
};
let At = class extends W {
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
    T.setRecentWallet(t), e && this.onFormatAndRedirect(e);
  }
  // -- render ------------------------------------------------------- //
  render() {
    const { name: e, id: t, image_id: r } = x.getWalletRouterData(), { isMobile: o, isWeb: n } = T.getCachedRouterWalletPlatforms();
    return y`<wcm-modal-header title="${e}" .onAction="${T.handleUriCopy}" .actionIcon="${k.COPY_ICON}"></wcm-modal-header><wcm-modal-content><wcm-connector-waiting walletId="${t}" imageId="${q(r)}" label="${`Continue in ${e}...`}" .isError="${this.isError}"></wcm-connector-waiting></wcm-modal-content><wcm-info-footer><wcm-text color="secondary" variant="small-thin">${`Connection can continue loading if ${e} is not installed on your device`}</wcm-text><wcm-platform-selection .isMobile="${o}" .isWeb="${n}" .isRetry="${!0}"><wcm-button .onClick="${this.openDesktopApp.bind(this)}" .iconRight="${k.RETRY_ICON}">Retry</wcm-button></wcm-platform-selection></wcm-info-footer>`;
  }
};
At.styles = [L.globalCss, Rl];
jo([
  Y()
], At.prototype, "isError", 2);
At = jo([
  N("wcm-desktop-connecting-view")
], At);
const Dl = B`wcm-info-footer{flex-direction:column;align-items:center;display:flex;width:100%;padding:5px 0}wcm-text{text-align:center}wcm-button{margin-top:15px}`;
var Nl = Object.getOwnPropertyDescriptor, Bl = (e, t, r, o) => {
  for (var n = o > 1 ? void 0 : o ? Nl(t, r) : t, i = e.length - 1, s; i >= 0; i--)
    (s = e[i]) && (n = s(n) || n);
  return n;
};
let Vr = class extends W {
  // -- private ------------------------------------------------------ //
  onInstall(e) {
    e && x.openHref(e, "_blank");
  }
  // -- render ------------------------------------------------------- //
  render() {
    const { name: e, id: t, image_id: r, homepage: o } = x.getWalletRouterData();
    return y`<wcm-modal-header title="${e}"></wcm-modal-header><wcm-modal-content><wcm-connector-waiting walletId="${t}" imageId="${q(r)}" label="Not Detected" .isStale="${!0}"></wcm-connector-waiting></wcm-modal-content><wcm-info-footer><wcm-text color="secondary" variant="small-thin">${`Download ${e} to continue. If multiple browser extensions are installed, disable non ${e} ones and try again`}</wcm-text><wcm-button .onClick="${() => this.onInstall(o)}" .iconLeft="${k.ARROW_DOWN_ICON}">Download</wcm-button></wcm-info-footer>`;
  }
};
Vr.styles = [L.globalCss, Dl];
Vr = Bl([
  N("wcm-install-wallet-view")
], Vr);
const kl = B`wcm-wallet-image{border-radius:var(--wcm-wallet-icon-large-border-radius);width:96px;height:96px;margin-bottom:20px}wcm-info-footer{display:flex;width:100%}.wcm-app-store{justify-content:space-between}.wcm-app-store wcm-wallet-image{margin-right:10px;margin-bottom:0;width:28px;height:28px;border-radius:var(--wcm-wallet-icon-small-border-radius)}.wcm-app-store div{display:flex;align-items:center}.wcm-app-store wcm-button{margin-right:-10px}.wcm-note{flex-direction:column;align-items:center;padding:5px 0}.wcm-note wcm-text{text-align:center}wcm-platform-selection{margin-top:-15px}.wcm-note wcm-text{margin-top:15px}.wcm-note wcm-text span{color:var(--wcm-accent-color)}`;
var Ul = Object.defineProperty, jl = Object.getOwnPropertyDescriptor, Ho = (e, t, r, o) => {
  for (var n = o > 1 ? void 0 : o ? jl(t, r) : t, i = e.length - 1, s; i >= 0; i--)
    (s = e[i]) && (n = (o ? s(t, r, n) : s(n)) || n);
  return o && n && Ul(t, r, n), n;
};
let Ot = class extends W {
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
    t && this.onFormatAndRedirect(t, e), T.setRecentWallet(r);
  }
  onGoToAppStore(e) {
    e && x.openHref(e, "_blank");
  }
  // -- render ------------------------------------------------------- //
  render() {
    const { name: e, id: t, image_id: r, app: o, mobile: n } = x.getWalletRouterData(), { isWeb: i } = T.getCachedRouterWalletPlatforms(), s = o?.ios, a = n?.universal;
    return y`<wcm-modal-header title="${e}"></wcm-modal-header><wcm-modal-content><wcm-connector-waiting walletId="${t}" imageId="${q(r)}" label="Tap 'Open' to continue…" .isError="${this.isError}"></wcm-connector-waiting></wcm-modal-content><wcm-info-footer class="wcm-note"><wcm-platform-selection .isWeb="${i}" .isRetry="${!0}"><wcm-button .onClick="${() => this.openMobileApp(!1)}" .iconRight="${k.RETRY_ICON}">Retry</wcm-button></wcm-platform-selection>${a ? y`<wcm-text color="secondary" variant="small-thin">Still doesn't work? <span tabindex="0" @click="${() => this.openMobileApp(!0)}">Try this alternate link</span></wcm-text>` : null}</wcm-info-footer><wcm-info-footer class="wcm-app-store"><div><wcm-wallet-image walletId="${t}" imageId="${q(r)}"></wcm-wallet-image><wcm-text>${`Get ${e}`}</wcm-text></div><wcm-button .iconRight="${k.ARROW_RIGHT_ICON}" .onClick="${() => this.onGoToAppStore(s)}" variant="ghost">App Store</wcm-button></wcm-info-footer>`;
  }
};
Ot.styles = [L.globalCss, kl];
Ho([
  Y()
], Ot.prototype, "isError", 2);
Ot = Ho([
  N("wcm-mobile-connecting-view")
], Ot);
const Hl = B`wcm-info-footer{flex-direction:column;align-items:center;display:flex;width:100%;padding:5px 0}wcm-text{text-align:center}`;
var Vl = Object.getOwnPropertyDescriptor, Fl = (e, t, r, o) => {
  for (var n = o > 1 ? void 0 : o ? Vl(t, r) : t, i = e.length - 1, s; i >= 0; i--)
    (s = e[i]) && (n = s(n) || n);
  return n;
};
let Fr = class extends W {
  // -- render ------------------------------------------------------- //
  render() {
    const { name: e, id: t, image_id: r } = x.getWalletRouterData(), { isDesktop: o, isWeb: n } = T.getCachedRouterWalletPlatforms();
    return y`<wcm-modal-header title="${e}" .onAction="${T.handleUriCopy}" .actionIcon="${k.COPY_ICON}"></wcm-modal-header><wcm-modal-content><wcm-walletconnect-qr walletId="${t}" imageId="${q(r)}"></wcm-walletconnect-qr></wcm-modal-content><wcm-info-footer><wcm-text color="secondary" variant="small-thin">${`Scan this QR Code with your phone's camera or inside ${e} app`}</wcm-text><wcm-platform-selection .isDesktop="${o}" .isWeb="${n}"></wcm-platform-selection></wcm-info-footer>`;
  }
};
Fr.styles = [L.globalCss, Hl];
Fr = Fl([
  N("wcm-mobile-qr-connecting-view")
], Fr);
var zl = Object.getOwnPropertyDescriptor, ql = (e, t, r, o) => {
  for (var n = o > 1 ? void 0 : o ? zl(t, r) : t, i = e.length - 1, s; i >= 0; i--)
    (s = e[i]) && (n = s(n) || n);
  return n;
};
let zr = class extends W {
  // -- render ------------------------------------------------------- //
  render() {
    return y`<wcm-modal-header title="Scan the code" .onAction="${T.handleUriCopy}" .actionIcon="${k.COPY_ICON}"></wcm-modal-header><wcm-modal-content><wcm-walletconnect-qr></wcm-walletconnect-qr></wcm-modal-content>`;
  }
};
zr.styles = [L.globalCss];
zr = ql([
  N("wcm-qrcode-view")
], zr);
const Zl = B`wcm-modal-content{height:clamp(200px,60vh,600px);display:block;overflow:scroll;scrollbar-width:none;position:relative;margin-top:1px}.wcm-grid{display:grid;grid-template-columns:repeat(4,80px);justify-content:space-between;margin:-15px -10px;padding-top:20px}wcm-modal-content::after,wcm-modal-content::before{content:'';position:fixed;pointer-events:none;z-index:1;width:100%;height:20px;opacity:1}wcm-modal-content::before{box-shadow:0 -1px 0 0 var(--wcm-color-bg-1);background:linear-gradient(var(--wcm-color-bg-1),rgba(255,255,255,0))}wcm-modal-content::after{box-shadow:0 1px 0 0 var(--wcm-color-bg-1);background:linear-gradient(rgba(255,255,255,0),var(--wcm-color-bg-1));top:calc(100% - 20px)}wcm-modal-content::-webkit-scrollbar{display:none}.wcm-placeholder-block{display:flex;justify-content:center;align-items:center;height:100px;overflow:hidden}.wcm-empty,.wcm-loading{display:flex}.wcm-loading .wcm-placeholder-block{height:100%}.wcm-end-reached .wcm-placeholder-block{height:0;opacity:0}.wcm-empty .wcm-placeholder-block{opacity:1;height:100%}wcm-wallet-button{margin:calc((100% - 60px)/ 3) 0}`;
var Kl = Object.defineProperty, Yl = Object.getOwnPropertyDescriptor, dt = (e, t, r, o) => {
  for (var n = o > 1 ? void 0 : o ? Yl(t, r) : t, i = e.length - 1, s; i >= 0; i--)
    (s = e[i]) && (n = (o ? s(t, r, n) : s(n)) || n);
  return o && n && Kl(t, r, n), n;
};
const br = 40;
let Pe = class extends W {
  constructor() {
    super(...arguments), this.loading = !K.state.wallets.listings.length, this.firstFetch = !K.state.wallets.listings.length, this.search = "", this.endReached = !1, this.intersectionObserver = void 0, this.searchDebounce = T.debounce((e) => {
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
    return T.getShadowRootElement(this, ".wcm-placeholder-block");
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
        }), l = a.map((c) => T.getWalletIcon(c));
        await Promise.all([
          ...l.map(async (c) => T.preloadImage(c)),
          x.wait(300)
        ]), this.endReached = this.isLastPage();
      } catch (s) {
        console.error(s), ue.openToast(T.getErrorMessage(s), "error");
      } finally {
        this.loading = !1, this.firstFetch = !1;
      }
  }
  onConnect(e) {
    x.isAndroid() ? T.handleMobileLinking(e) : T.goToConnectingView(e);
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
      ({ values: c }) => T.caseSafeIncludes(c[0], this.search)
    ), s = s.filter(
      ({ values: c }) => T.caseSafeIncludes(c[0], this.search)
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
Pe.styles = [L.globalCss, Zl];
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
const Ql = B`wcm-info-footer{flex-direction:column;align-items:center;display:flex;width:100%;padding:5px 0}wcm-text{text-align:center}`;
var Gl = Object.defineProperty, Jl = Object.getOwnPropertyDescriptor, Vo = (e, t, r, o) => {
  for (var n = o > 1 ? void 0 : o ? Jl(t, r) : t, i = e.length - 1, s; i >= 0; i--)
    (s = e[i]) && (n = (o ? s(t, r, n) : s(n)) || n);
  return o && n && Gl(t, r, n), n;
};
let It = class extends W {
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
    T.setRecentWallet(t), e && this.onFormatAndRedirect(e);
  }
  // -- render ------------------------------------------------------- //
  render() {
    const { name: e, id: t, image_id: r } = x.getWalletRouterData(), { isMobile: o, isDesktop: n } = T.getCachedRouterWalletPlatforms(), i = x.isMobile();
    return y`<wcm-modal-header title="${e}" .onAction="${T.handleUriCopy}" .actionIcon="${k.COPY_ICON}"></wcm-modal-header><wcm-modal-content><wcm-connector-waiting walletId="${t}" imageId="${q(r)}" label="${`Continue in ${e}...`}" .isError="${this.isError}"></wcm-connector-waiting></wcm-modal-content><wcm-info-footer><wcm-text color="secondary" variant="small-thin">${`${e} web app has opened in a new tab. Go there, accept the connection, and come back`}</wcm-text><wcm-platform-selection .isMobile="${o}" .isDesktop="${i ? !1 : n}" .isRetry="${!0}"><wcm-button .onClick="${this.openWebWallet.bind(this)}" .iconRight="${k.RETRY_ICON}">Retry</wcm-button></wcm-platform-selection></wcm-info-footer>`;
  }
};
It.styles = [L.globalCss, Ql];
Vo([
  Y()
], It.prototype, "isError", 2);
It = Vo([
  N("wcm-web-connecting-view")
], It);
const Xl = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  get WcmModal() {
    return Fe;
  },
  get WcmQrCode() {
    return se;
  }
}, Symbol.toStringTag, { value: "Module" }));
export {
  rc as W,
  tc as d
};
