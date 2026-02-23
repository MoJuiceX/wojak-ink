import { c as E, s as Bt, a as Ds, e as Ye, b as Tn, h as On, G as qn, U as Cn, R as Ie, i as Nn, d as Dn, f as xe, p as fs, B as I, I as kn, r as yt, S as Mn, O as Ln, N as Bn, g as Un, j as Er, l as jn, k as ii, m as zn, n as ze, o as ri, _ as X, q as ni, t as Vn, u as Kn, y as Hn, P as Ir, v as xr, M as Gn, w as ks, x as Wn, z as Jn, A as Yn, C as ms, D as ws, E as Qn, F as Zn, H as Ut, J as ge, K as gt, L as Xn, Q as Ae, T as eo, V as to, W as so, X as Nt, Y as io, Z as oi, $ as ro, a0 as ai, a1 as no, a2 as oo, a3 as ao, a4 as co, a5 as We, a6 as ci, a7 as ho, a8 as lo, a9 as Te, aa as uo, ab as po, ac as Dt, ad as hi, ae as li, af as nt, ag as V, ah as et, ai as be, aj as go, ak as Xe, al as yo, am as fo, an as mo, ao as wo, ap as ui, aq as bo, ar as vo, as as _o, at as Eo, au as Io, av as mt, aw as xo, ax as So, ay as Fo, az as Po, aA as Ro, aB as Ao, aC as Xt, aD as $o, aE as es, aF as To, aG as Oo, aH as Tt, aI as pi, aJ as di, aK as gi, aL as yi, aM as fi, aN as mi, aO as qo, aP as wt, aQ as Co, aR as wi, aS as No, aT as ts, aU as bi, aV as Do, aW as ko, aX as Mo, aY as vi, aZ as Lo, a_ as Bo, a$ as Uo, b0 as jo, b1 as zo, b2 as _i, b3 as Vo, b4 as Ko, b5 as Ho, b6 as Go, b7 as Wo, b8 as Ei, b9 as Jo, ba as Ii, bb as xi, bc as Yo, bd as Qo, be as Zo } from "./wallet-connect-standalone-wallet-core-D8R1rIyp.js";
import { t as Xo } from "./wallet-connect-standalone-wallet-crypto-CtgPRmL-.js";
function ea(r) {
  return r instanceof Uint8Array || ArrayBuffer.isView(r) && r.constructor.name === "Uint8Array";
}
function Sr(r, ...e) {
  if (!ea(r)) throw new Error("Uint8Array expected");
  if (e.length > 0 && !e.includes(r.length)) throw new Error("Uint8Array expected of length " + e + ", got length=" + r.length);
}
function Si(r, e = !0) {
  if (r.destroyed) throw new Error("Hash instance has been destroyed");
  if (e && r.finished) throw new Error("Hash#digest() has already been called");
}
function ta(r, e) {
  Sr(r);
  const t = e.outputLen;
  if (r.length < t) throw new Error("digestInto() expects output buffer of length at least " + t);
}
const lt = typeof globalThis == "object" && "crypto" in globalThis ? globalThis.crypto : void 0;
const ss = (r) => new DataView(r.buffer, r.byteOffset, r.byteLength);
function sa(r) {
  if (typeof r != "string") throw new Error("utf8ToBytes expected string, got " + typeof r);
  return new Uint8Array(new TextEncoder().encode(r));
}
function Fr(r) {
  return typeof r == "string" && (r = sa(r)), Sr(r), r;
}
let ia = class {
  clone() {
    return this._cloneInto();
  }
};
function ra(r) {
  const e = (s) => r().update(Fr(s)).digest(), t = r();
  return e.outputLen = t.outputLen, e.blockLen = t.blockLen, e.create = () => r(), e;
}
function Pr(r = 32) {
  if (lt && typeof lt.getRandomValues == "function") return lt.getRandomValues(new Uint8Array(r));
  if (lt && typeof lt.randomBytes == "function") return lt.randomBytes(r);
  throw new Error("crypto.getRandomValues must be defined");
}
function na(r, e, t, s) {
  if (typeof r.setBigUint64 == "function") return r.setBigUint64(e, t, s);
  const i = BigInt(32), n = BigInt(4294967295), o = Number(t >> i & n), a = Number(t & n), c = s ? 4 : 0, h = s ? 0 : 4;
  r.setUint32(e + c, o, s), r.setUint32(e + h, a, s);
}
let oa = class extends ia {
  constructor(e, t, s, i) {
    super(), this.blockLen = e, this.outputLen = t, this.padOffset = s, this.isLE = i, this.finished = !1, this.length = 0, this.pos = 0, this.destroyed = !1, this.buffer = new Uint8Array(e), this.view = ss(this.buffer);
  }
  update(e) {
    Si(this);
    const { view: t, buffer: s, blockLen: i } = this;
    e = Fr(e);
    const n = e.length;
    for (let o = 0; o < n; ) {
      const a = Math.min(i - this.pos, n - o);
      if (a === i) {
        const c = ss(e);
        for (; i <= n - o; o += i) this.process(c, o);
        continue;
      }
      s.set(e.subarray(o, o + a), this.pos), this.pos += a, o += a, this.pos === i && (this.process(t, 0), this.pos = 0);
    }
    return this.length += e.length, this.roundClean(), this;
  }
  digestInto(e) {
    Si(this), ta(e, this), this.finished = !0;
    const { buffer: t, view: s, blockLen: i, isLE: n } = this;
    let { pos: o } = this;
    t[o++] = 128, this.buffer.subarray(o).fill(0), this.padOffset > i - o && (this.process(s, 0), o = 0);
    for (let p = o; p < i; p++) t[p] = 0;
    na(s, i - 8, BigInt(this.length * 8), n), this.process(s, 0);
    const a = ss(e), c = this.outputLen;
    if (c % 4) throw new Error("_sha2: outputLen should be aligned to 32bit");
    const h = c / 4, l = this.get();
    if (h > l.length) throw new Error("_sha2: outputLen bigger than state");
    for (let p = 0; p < h; p++) a.setUint32(4 * p, l[p], n);
  }
  digest() {
    const { buffer: e, outputLen: t } = this;
    this.digestInto(e);
    const s = e.slice(0, t);
    return this.destroy(), s;
  }
  _cloneInto(e) {
    e || (e = new this.constructor()), e.set(...this.get());
    const { blockLen: t, buffer: s, length: i, finished: n, destroyed: o, pos: a } = this;
    return e.length = i, e.pos = a, e.finished = n, e.destroyed = o, i % t && e.buffer.set(s), e;
  }
};
const Ot = BigInt(2 ** 32 - 1), bs = BigInt(32);
function Rr(r, e = !1) {
  return e ? { h: Number(r & Ot), l: Number(r >> bs & Ot) } : { h: Number(r >> bs & Ot) | 0, l: Number(r & Ot) | 0 };
}
function aa(r, e = !1) {
  let t = new Uint32Array(r.length), s = new Uint32Array(r.length);
  for (let i = 0; i < r.length; i++) {
    const { h: n, l: o } = Rr(r[i], e);
    [t[i], s[i]] = [n, o];
  }
  return [t, s];
}
const ca = (r, e) => BigInt(r >>> 0) << bs | BigInt(e >>> 0), ha = (r, e, t) => r >>> t, la = (r, e, t) => r << 32 - t | e >>> t, ua = (r, e, t) => r >>> t | e << 32 - t, pa = (r, e, t) => r << 32 - t | e >>> t, da = (r, e, t) => r << 64 - t | e >>> t - 32, ga = (r, e, t) => r >>> t - 32 | e << 64 - t, ya = (r, e) => e, fa = (r, e) => r, ma = (r, e, t) => r << t | e >>> 32 - t, wa = (r, e, t) => e << t | r >>> 32 - t, ba = (r, e, t) => e << t - 32 | r >>> 64 - t, va = (r, e, t) => r << t - 32 | e >>> 64 - t;
function _a(r, e, t, s) {
  const i = (e >>> 0) + (s >>> 0);
  return { h: r + t + (i / 2 ** 32 | 0) | 0, l: i | 0 };
}
const Ea = (r, e, t) => (r >>> 0) + (e >>> 0) + (t >>> 0), Ia = (r, e, t, s) => e + t + s + (r / 2 ** 32 | 0) | 0, xa = (r, e, t, s) => (r >>> 0) + (e >>> 0) + (t >>> 0) + (s >>> 0), Sa = (r, e, t, s, i) => e + t + s + i + (r / 2 ** 32 | 0) | 0, Fa = (r, e, t, s, i) => (r >>> 0) + (e >>> 0) + (t >>> 0) + (s >>> 0) + (i >>> 0), Pa = (r, e, t, s, i, n) => e + t + s + i + n + (r / 2 ** 32 | 0) | 0, N = { fromBig: Rr, split: aa, toBig: ca, shrSH: ha, shrSL: la, rotrSH: ua, rotrSL: pa, rotrBH: da, rotrBL: ga, rotr32H: ya, rotr32L: fa, rotlSH: ma, rotlSL: wa, rotlBH: ba, rotlBL: va, add: _a, add3L: Ea, add3H: Ia, add4L: xa, add4H: Sa, add5H: Pa, add5L: Fa }, [Ra, Aa] = N.split(["0x428a2f98d728ae22", "0x7137449123ef65cd", "0xb5c0fbcfec4d3b2f", "0xe9b5dba58189dbbc", "0x3956c25bf348b538", "0x59f111f1b605d019", "0x923f82a4af194f9b", "0xab1c5ed5da6d8118", "0xd807aa98a3030242", "0x12835b0145706fbe", "0x243185be4ee4b28c", "0x550c7dc3d5ffb4e2", "0x72be5d74f27b896f", "0x80deb1fe3b1696b1", "0x9bdc06a725c71235", "0xc19bf174cf692694", "0xe49b69c19ef14ad2", "0xefbe4786384f25e3", "0x0fc19dc68b8cd5b5", "0x240ca1cc77ac9c65", "0x2de92c6f592b0275", "0x4a7484aa6ea6e483", "0x5cb0a9dcbd41fbd4", "0x76f988da831153b5", "0x983e5152ee66dfab", "0xa831c66d2db43210", "0xb00327c898fb213f", "0xbf597fc7beef0ee4", "0xc6e00bf33da88fc2", "0xd5a79147930aa725", "0x06ca6351e003826f", "0x142929670a0e6e70", "0x27b70a8546d22ffc", "0x2e1b21385c26c926", "0x4d2c6dfc5ac42aed", "0x53380d139d95b3df", "0x650a73548baf63de", "0x766a0abb3c77b2a8", "0x81c2c92e47edaee6", "0x92722c851482353b", "0xa2bfe8a14cf10364", "0xa81a664bbc423001", "0xc24b8b70d0f89791", "0xc76c51a30654be30", "0xd192e819d6ef5218", "0xd69906245565a910", "0xf40e35855771202a", "0x106aa07032bbd1b8", "0x19a4c116b8d2d0c8", "0x1e376c085141ab53", "0x2748774cdf8eeb99", "0x34b0bcb5e19b48a8", "0x391c0cb3c5c95a63", "0x4ed8aa4ae3418acb", "0x5b9cca4f7763e373", "0x682e6ff3d6b2b8a3", "0x748f82ee5defb2fc", "0x78a5636f43172f60", "0x84c87814a1f0ab72", "0x8cc702081a6439ec", "0x90befffa23631e28", "0xa4506cebde82bde9", "0xbef9a3f7b2c67915", "0xc67178f2e372532b", "0xca273eceea26619c", "0xd186b8c721c0c207", "0xeada7dd6cde0eb1e", "0xf57d4f7fee6ed178", "0x06f067aa72176fba", "0x0a637dc5a2c898a6", "0x113f9804bef90dae", "0x1b710b35131c471b", "0x28db77f523047d84", "0x32caab7b40c72493", "0x3c9ebe0a15c9bebc", "0x431d67c49c100d4c", "0x4cc5d4becb3e42b6", "0x597f299cfc657e2a", "0x5fcb6fab3ad6faec", "0x6c44198c4a475817"].map((r) => BigInt(r))), Qe = new Uint32Array(80), Ze = new Uint32Array(80);
let $a = class extends oa {
  constructor() {
    super(128, 64, 16, !1), this.Ah = 1779033703, this.Al = -205731576, this.Bh = -1150833019, this.Bl = -2067093701, this.Ch = 1013904242, this.Cl = -23791573, this.Dh = -1521486534, this.Dl = 1595750129, this.Eh = 1359893119, this.El = -1377402159, this.Fh = -1694144372, this.Fl = 725511199, this.Gh = 528734635, this.Gl = -79577749, this.Hh = 1541459225, this.Hl = 327033209;
  }
  get() {
    const { Ah: e, Al: t, Bh: s, Bl: i, Ch: n, Cl: o, Dh: a, Dl: c, Eh: h, El: l, Fh: p, Fl: d, Gh: g, Gl: u, Hh: y, Hl: w } = this;
    return [e, t, s, i, n, o, a, c, h, l, p, d, g, u, y, w];
  }
  set(e, t, s, i, n, o, a, c, h, l, p, d, g, u, y, w) {
    this.Ah = e | 0, this.Al = t | 0, this.Bh = s | 0, this.Bl = i | 0, this.Ch = n | 0, this.Cl = o | 0, this.Dh = a | 0, this.Dl = c | 0, this.Eh = h | 0, this.El = l | 0, this.Fh = p | 0, this.Fl = d | 0, this.Gh = g | 0, this.Gl = u | 0, this.Hh = y | 0, this.Hl = w | 0;
  }
  process(e, t) {
    for (let f = 0; f < 16; f++, t += 4) Qe[f] = e.getUint32(t), Ze[f] = e.getUint32(t += 4);
    for (let f = 16; f < 80; f++) {
      const x = Qe[f - 15] | 0, R = Ze[f - 15] | 0, S = N.rotrSH(x, R, 1) ^ N.rotrSH(x, R, 8) ^ N.shrSH(x, R, 7), q = N.rotrSL(x, R, 1) ^ N.rotrSL(x, R, 8) ^ N.shrSL(x, R, 7), O = Qe[f - 2] | 0, P = Ze[f - 2] | 0, M = N.rotrSH(O, P, 19) ^ N.rotrBH(O, P, 61) ^ N.shrSH(O, P, 6), ne = N.rotrSL(O, P, 19) ^ N.rotrBL(O, P, 61) ^ N.shrSL(O, P, 6), pe = N.add4L(q, ne, Ze[f - 7], Ze[f - 16]), ve = N.add4H(pe, S, M, Qe[f - 7], Qe[f - 16]);
      Qe[f] = ve | 0, Ze[f] = pe | 0;
    }
    let { Ah: s, Al: i, Bh: n, Bl: o, Ch: a, Cl: c, Dh: h, Dl: l, Eh: p, El: d, Fh: g, Fl: u, Gh: y, Gl: w, Hh: _, Hl: v } = this;
    for (let f = 0; f < 80; f++) {
      const x = N.rotrSH(p, d, 14) ^ N.rotrSH(p, d, 18) ^ N.rotrBH(p, d, 41), R = N.rotrSL(p, d, 14) ^ N.rotrSL(p, d, 18) ^ N.rotrBL(p, d, 41), S = p & g ^ ~p & y, q = d & u ^ ~d & w, O = N.add5L(v, R, q, Aa[f], Ze[f]), P = N.add5H(O, _, x, S, Ra[f], Qe[f]), M = O | 0, ne = N.rotrSH(s, i, 28) ^ N.rotrBH(s, i, 34) ^ N.rotrBH(s, i, 39), pe = N.rotrSL(s, i, 28) ^ N.rotrBL(s, i, 34) ^ N.rotrBL(s, i, 39), ve = s & n ^ s & a ^ n & a, De = i & o ^ i & c ^ o & c;
      _ = y | 0, v = w | 0, y = g | 0, w = u | 0, g = p | 0, u = d | 0, { h: p, l: d } = N.add(h | 0, l | 0, P | 0, M | 0), h = a | 0, l = c | 0, a = n | 0, c = o | 0, n = s | 0, o = i | 0;
      const A = N.add3L(M, pe, De);
      s = N.add3H(A, P, ne, ve), i = A | 0;
    }
    ({ h: s, l: i } = N.add(this.Ah | 0, this.Al | 0, s | 0, i | 0)), { h: n, l: o } = N.add(this.Bh | 0, this.Bl | 0, n | 0, o | 0), { h: a, l: c } = N.add(this.Ch | 0, this.Cl | 0, a | 0, c | 0), { h, l } = N.add(this.Dh | 0, this.Dl | 0, h | 0, l | 0), { h: p, l: d } = N.add(this.Eh | 0, this.El | 0, p | 0, d | 0), { h: g, l: u } = N.add(this.Fh | 0, this.Fl | 0, g | 0, u | 0), { h: y, l: w } = N.add(this.Gh | 0, this.Gl | 0, y | 0, w | 0), { h: _, l: v } = N.add(this.Hh | 0, this.Hl | 0, _ | 0, v | 0), this.set(s, i, n, o, a, c, h, l, p, d, g, u, y, w, _, v);
  }
  roundClean() {
    Qe.fill(0), Ze.fill(0);
  }
  destroy() {
    this.buffer.fill(0), this.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
  }
};
const Ta = ra(() => new $a());
const Ms = BigInt(0), Ar = BigInt(1), Oa = BigInt(2);
function Ls(r) {
  return r instanceof Uint8Array || ArrayBuffer.isView(r) && r.constructor.name === "Uint8Array";
}
function Bs(r) {
  if (!Ls(r)) throw new Error("Uint8Array expected");
}
function is(r, e) {
  if (typeof e != "boolean") throw new Error(r + " boolean expected, got " + e);
}
const qa = Array.from({ length: 256 }, (r, e) => e.toString(16).padStart(2, "0"));
function Us(r) {
  Bs(r);
  let e = "";
  for (let t = 0; t < r.length; t++) e += qa[r[t]];
  return e;
}
function $r(r) {
  if (typeof r != "string") throw new Error("hex string expected, got " + typeof r);
  return r === "" ? Ms : BigInt("0x" + r);
}
const Ke = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 };
function Fi(r) {
  if (r >= Ke._0 && r <= Ke._9) return r - Ke._0;
  if (r >= Ke.A && r <= Ke.F) return r - (Ke.A - 10);
  if (r >= Ke.a && r <= Ke.f) return r - (Ke.a - 10);
}
function Tr(r) {
  if (typeof r != "string") throw new Error("hex string expected, got " + typeof r);
  const e = r.length, t = e / 2;
  if (e % 2) throw new Error("hex string expected, got unpadded hex of length " + e);
  const s = new Uint8Array(t);
  for (let i = 0, n = 0; i < t; i++, n += 2) {
    const o = Fi(r.charCodeAt(n)), a = Fi(r.charCodeAt(n + 1));
    if (o === void 0 || a === void 0) {
      const c = r[n] + r[n + 1];
      throw new Error('hex string expected, got non-hex character "' + c + '" at index ' + n);
    }
    s[i] = o * 16 + a;
  }
  return s;
}
function Ca(r) {
  return $r(Us(r));
}
function kt(r) {
  return Bs(r), $r(Us(Uint8Array.from(r).reverse()));
}
function Or(r, e) {
  return Tr(r.toString(16).padStart(e * 2, "0"));
}
function vs(r, e) {
  return Or(r, e).reverse();
}
function He(r, e, t) {
  let s;
  if (typeof e == "string") try {
    s = Tr(e);
  } catch (n) {
    throw new Error(r + " must be hex string or Uint8Array, cause: " + n);
  }
  else if (Ls(e)) s = Uint8Array.from(e);
  else throw new Error(r + " must be hex string or Uint8Array");
  const i = s.length;
  if (typeof t == "number" && i !== t) throw new Error(r + " of length " + t + " expected, got " + i);
  return s;
}
function Pi(...r) {
  let e = 0;
  for (let s = 0; s < r.length; s++) {
    const i = r[s];
    Bs(i), e += i.length;
  }
  const t = new Uint8Array(e);
  for (let s = 0, i = 0; s < r.length; s++) {
    const n = r[s];
    t.set(n, i), i += n.length;
  }
  return t;
}
const rs = (r) => typeof r == "bigint" && Ms <= r;
function Na(r, e, t) {
  return rs(r) && rs(e) && rs(t) && e <= r && r < t;
}
function bt(r, e, t, s) {
  if (!Na(e, t, s)) throw new Error("expected valid " + r + ": " + t + " <= n < " + s + ", got " + e);
}
function Da(r) {
  let e;
  for (e = 0; r > Ms; r >>= Ar, e += 1) ;
  return e;
}
const ka = (r) => (Oa << BigInt(r - 1)) - Ar, Ma = { bigint: (r) => typeof r == "bigint", function: (r) => typeof r == "function", boolean: (r) => typeof r == "boolean", string: (r) => typeof r == "string", stringOrUint8Array: (r) => typeof r == "string" || Ls(r), isSafeInteger: (r) => Number.isSafeInteger(r), array: (r) => Array.isArray(r), field: (r, e) => e.Fp.isValid(r), hash: (r) => typeof r == "function" && Number.isSafeInteger(r.outputLen) };
function js(r, e, t = {}) {
  const s = (i, n, o) => {
    const a = Ma[n];
    if (typeof a != "function") throw new Error("invalid validator function");
    const c = r[i];
    if (!(o && c === void 0) && !a(c, r)) throw new Error("param " + String(i) + " is invalid. Expected " + n + ", got " + c);
  };
  for (const [i, n] of Object.entries(e)) s(i, n, !1);
  for (const [i, n] of Object.entries(t)) s(i, n, !0);
  return r;
}
function Ri(r) {
  const e = /* @__PURE__ */ new WeakMap();
  return (t, ...s) => {
    const i = e.get(t);
    if (i !== void 0) return i;
    const n = r(t, ...s);
    return e.set(t, n), n;
  };
}
const re = BigInt(0), Y = BigInt(1), ot = BigInt(2), La = BigInt(3), _s = BigInt(4), Ai = BigInt(5), $i = BigInt(8);
function ee(r, e) {
  const t = r % e;
  return t >= re ? t : e + t;
}
function Ba(r, e, t) {
  if (e < re) throw new Error("invalid exponent, negatives unsupported");
  if (t <= re) throw new Error("invalid modulus");
  if (t === Y) return re;
  let s = Y;
  for (; e > re; ) e & Y && (s = s * r % t), r = r * r % t, e >>= Y;
  return s;
}
function ke(r, e, t) {
  let s = r;
  for (; e-- > re; ) s *= s, s %= t;
  return s;
}
function Ti(r, e) {
  if (r === re) throw new Error("invert: expected non-zero number");
  if (e <= re) throw new Error("invert: expected positive modulus, got " + e);
  let t = ee(r, e), s = e, i = re, n = Y;
  for (; t !== re; ) {
    const o = s / t, a = s % t, c = i - n * o;
    s = t, t = a, i = n, n = c;
  }
  if (s !== Y) throw new Error("invert: does not exist");
  return ee(i, e);
}
function Ua(r) {
  const e = (r - Y) / ot;
  let t, s, i;
  for (t = r - Y, s = 0; t % ot === re; t /= ot, s++) ;
  for (i = ot; i < r && Ba(i, e, r) !== r - Y; i++) if (i > 1e3) throw new Error("Cannot find square root: likely non-prime P");
  if (s === 1) {
    const o = (r + Y) / _s;
    return function(a, c) {
      const h = a.pow(c, o);
      if (!a.eql(a.sqr(h), c)) throw new Error("Cannot find square root");
      return h;
    };
  }
  const n = (t + Y) / ot;
  return function(o, a) {
    if (o.pow(a, e) === o.neg(o.ONE)) throw new Error("Cannot find square root");
    let c = s, h = o.pow(o.mul(o.ONE, i), t), l = o.pow(a, n), p = o.pow(a, t);
    for (; !o.eql(p, o.ONE); ) {
      if (o.eql(p, o.ZERO)) return o.ZERO;
      let d = 1;
      for (let u = o.sqr(p); d < c && !o.eql(u, o.ONE); d++) u = o.sqr(u);
      const g = o.pow(h, Y << BigInt(c - d - 1));
      h = o.sqr(g), l = o.mul(l, g), p = o.mul(p, h), c = d;
    }
    return l;
  };
}
function ja(r) {
  if (r % _s === La) {
    const e = (r + Y) / _s;
    return function(t, s) {
      const i = t.pow(s, e);
      if (!t.eql(t.sqr(i), s)) throw new Error("Cannot find square root");
      return i;
    };
  }
  if (r % $i === Ai) {
    const e = (r - Ai) / $i;
    return function(t, s) {
      const i = t.mul(s, ot), n = t.pow(i, e), o = t.mul(s, n), a = t.mul(t.mul(o, ot), n), c = t.mul(o, t.sub(a, t.ONE));
      if (!t.eql(t.sqr(c), s)) throw new Error("Cannot find square root");
      return c;
    };
  }
  return Ua(r);
}
const za = (r, e) => (ee(r, e) & Y) === Y, Va = ["create", "isValid", "is0", "neg", "inv", "sqrt", "sqr", "eql", "add", "sub", "mul", "pow", "div", "addN", "subN", "mulN", "sqrN"];
function Ka(r) {
  const e = { ORDER: "bigint", MASK: "bigint", BYTES: "isSafeInteger", BITS: "isSafeInteger" }, t = Va.reduce((s, i) => (s[i] = "function", s), e);
  return js(r, t);
}
function Ha(r, e, t) {
  if (t < re) throw new Error("invalid exponent, negatives unsupported");
  if (t === re) return r.ONE;
  if (t === Y) return e;
  let s = r.ONE, i = e;
  for (; t > re; ) t & Y && (s = r.mul(s, i)), i = r.sqr(i), t >>= Y;
  return s;
}
function Ga(r, e) {
  const t = new Array(e.length), s = e.reduce((n, o, a) => r.is0(o) ? n : (t[a] = n, r.mul(n, o)), r.ONE), i = r.inv(s);
  return e.reduceRight((n, o, a) => r.is0(o) ? n : (t[a] = r.mul(n, t[a]), r.mul(n, o)), i), t;
}
function qr(r, e) {
  const t = e !== void 0 ? e : r.toString(2).length, s = Math.ceil(t / 8);
  return { nBitLength: t, nByteLength: s };
}
function Cr(r, e, t = !1, s = {}) {
  if (r <= re) throw new Error("invalid field: expected ORDER > 0, got " + r);
  const { nBitLength: i, nByteLength: n } = qr(r, e);
  if (n > 2048) throw new Error("invalid field: expected ORDER of <= 2048 bytes");
  let o;
  const a = Object.freeze({ ORDER: r, isLE: t, BITS: i, BYTES: n, MASK: ka(i), ZERO: re, ONE: Y, create: (c) => ee(c, r), isValid: (c) => {
    if (typeof c != "bigint") throw new Error("invalid field element: expected bigint, got " + typeof c);
    return re <= c && c < r;
  }, is0: (c) => c === re, isOdd: (c) => (c & Y) === Y, neg: (c) => ee(-c, r), eql: (c, h) => c === h, sqr: (c) => ee(c * c, r), add: (c, h) => ee(c + h, r), sub: (c, h) => ee(c - h, r), mul: (c, h) => ee(c * h, r), pow: (c, h) => Ha(a, c, h), div: (c, h) => ee(c * Ti(h, r), r), sqrN: (c) => c * c, addN: (c, h) => c + h, subN: (c, h) => c - h, mulN: (c, h) => c * h, inv: (c) => Ti(c, r), sqrt: s.sqrt || ((c) => (o || (o = ja(r)), o(a, c))), invertBatch: (c) => Ga(a, c), cmov: (c, h, l) => l ? h : c, toBytes: (c) => t ? vs(c, n) : Or(c, n), fromBytes: (c) => {
    if (c.length !== n) throw new Error("Field.fromBytes: expected " + n + " bytes, got " + c.length);
    return t ? kt(c) : Ca(c);
  } });
  return Object.freeze(a);
}
const Oi = BigInt(0), qt = BigInt(1);
function ns(r, e) {
  const t = e.negate();
  return r ? t : e;
}
function Nr(r, e) {
  if (!Number.isSafeInteger(r) || r <= 0 || r > e) throw new Error("invalid window size, expected [1.." + e + "], got W=" + r);
}
function os(r, e) {
  Nr(r, e);
  const t = Math.ceil(e / r) + 1, s = 2 ** (r - 1);
  return { windows: t, windowSize: s };
}
function Wa(r, e) {
  if (!Array.isArray(r)) throw new Error("array expected");
  r.forEach((t, s) => {
    if (!(t instanceof e)) throw new Error("invalid point at index " + s);
  });
}
function Ja(r, e) {
  if (!Array.isArray(r)) throw new Error("array of scalars expected");
  r.forEach((t, s) => {
    if (!e.isValid(t)) throw new Error("invalid scalar at index " + s);
  });
}
const as = /* @__PURE__ */ new WeakMap(), Dr = /* @__PURE__ */ new WeakMap();
function cs(r) {
  return Dr.get(r) || 1;
}
function Ya(r, e) {
  return { constTimeNegate: ns, hasPrecomputes(t) {
    return cs(t) !== 1;
  }, unsafeLadder(t, s, i = r.ZERO) {
    let n = t;
    for (; s > Oi; ) s & qt && (i = i.add(n)), n = n.double(), s >>= qt;
    return i;
  }, precomputeWindow(t, s) {
    const { windows: i, windowSize: n } = os(s, e), o = [];
    let a = t, c = a;
    for (let h = 0; h < i; h++) {
      c = a, o.push(c);
      for (let l = 1; l < n; l++) c = c.add(a), o.push(c);
      a = c.double();
    }
    return o;
  }, wNAF(t, s, i) {
    const { windows: n, windowSize: o } = os(t, e);
    let a = r.ZERO, c = r.BASE;
    const h = BigInt(2 ** t - 1), l = 2 ** t, p = BigInt(t);
    for (let d = 0; d < n; d++) {
      const g = d * o;
      let u = Number(i & h);
      i >>= p, u > o && (u -= l, i += qt);
      const y = g, w = g + Math.abs(u) - 1, _ = d % 2 !== 0, v = u < 0;
      u === 0 ? c = c.add(ns(_, s[y])) : a = a.add(ns(v, s[w]));
    }
    return { p: a, f: c };
  }, wNAFUnsafe(t, s, i, n = r.ZERO) {
    const { windows: o, windowSize: a } = os(t, e), c = BigInt(2 ** t - 1), h = 2 ** t, l = BigInt(t);
    for (let p = 0; p < o; p++) {
      const d = p * a;
      if (i === Oi) break;
      let g = Number(i & c);
      if (i >>= l, g > a && (g -= h, i += qt), g === 0) continue;
      let u = s[d + Math.abs(g) - 1];
      g < 0 && (u = u.negate()), n = n.add(u);
    }
    return n;
  }, getPrecomputes(t, s, i) {
    let n = as.get(s);
    return n || (n = this.precomputeWindow(s, t), t !== 1 && as.set(s, i(n))), n;
  }, wNAFCached(t, s, i) {
    const n = cs(t);
    return this.wNAF(n, this.getPrecomputes(n, t, i), s);
  }, wNAFCachedUnsafe(t, s, i, n) {
    const o = cs(t);
    return o === 1 ? this.unsafeLadder(t, s, n) : this.wNAFUnsafe(o, this.getPrecomputes(o, t, i), s, n);
  }, setWindowSize(t, s) {
    Nr(s, e), Dr.set(t, s), as.delete(t);
  } };
}
function Qa(r, e, t, s) {
  if (Wa(t, r), Ja(s, e), t.length !== s.length) throw new Error("arrays of points and scalars must have equal length");
  const i = r.ZERO, n = Da(BigInt(t.length)), o = n > 12 ? n - 3 : n > 4 ? n - 2 : n ? 2 : 1, a = (1 << o) - 1, c = new Array(a + 1).fill(i), h = Math.floor((e.BITS - 1) / o) * o;
  let l = i;
  for (let p = h; p >= 0; p -= o) {
    c.fill(i);
    for (let g = 0; g < s.length; g++) {
      const u = s[g], y = Number(u >> BigInt(p) & BigInt(a));
      c[y] = c[y].add(t[g]);
    }
    let d = i;
    for (let g = c.length - 1, u = i; g > 0; g--) u = u.add(c[g]), d = d.add(u);
    if (l = l.add(d), p !== 0) for (let g = 0; g < o; g++) l = l.double();
  }
  return l;
}
function Za(r) {
  return Ka(r.Fp), js(r, { n: "bigint", h: "bigint", Gx: "field", Gy: "field" }, { nBitLength: "isSafeInteger", nByteLength: "isSafeInteger" }), Object.freeze({ ...qr(r.n, r.nBitLength), ...r, p: r.Fp.ORDER });
}
const qe = BigInt(0), me = BigInt(1), Ct = BigInt(2), Xa = BigInt(8), ec = { zip215: !0 };
function tc(r) {
  const e = Za(r);
  return js(r, { hash: "function", a: "bigint", d: "bigint", randomBytes: "function" }, { adjustScalarBytes: "function", domain: "function", uvRatio: "function", mapToCurve: "function" }), Object.freeze({ ...e });
}
function sc(r) {
  const e = tc(r), { Fp: t, n: s, prehash: i, hash: n, randomBytes: o, nByteLength: a, h: c } = e, h = Ct << BigInt(a * 8) - me, l = t.create, p = Cr(e.n, e.nBitLength), d = e.uvRatio || ((A, b) => {
    try {
      return { isValid: !0, value: t.sqrt(A * t.inv(b)) };
    } catch {
      return { isValid: !1, value: qe };
    }
  }), g = e.adjustScalarBytes || ((A) => A), u = e.domain || ((A, b, F) => {
    if (is("phflag", F), b.length || F) throw new Error("Contexts/pre-hash are not supported");
    return A;
  });
  function y(A, b) {
    bt("coordinate " + A, b, qe, h);
  }
  function w(A) {
    if (!(A instanceof f)) throw new Error("ExtendedPoint expected");
  }
  const _ = Ri((A, b) => {
    const { ex: F, ey: $, ez: T } = A, C = A.is0();
    b == null && (b = C ? Xa : t.inv(T));
    const U = l(F * b), G = l($ * b), z = l(T * b);
    if (C) return { x: qe, y: me };
    if (z !== me) throw new Error("invZ was invalid");
    return { x: U, y: G };
  }), v = Ri((A) => {
    const { a: b, d: F } = e;
    if (A.is0()) throw new Error("bad point: ZERO");
    const { ex: $, ey: T, ez: C, et: U } = A, G = l($ * $), z = l(T * T), j = l(C * C), J = l(j * j), oe = l(G * b), ye = l(j * l(oe + z)), fe = l(J + l(F * l(G * z)));
    if (ye !== fe) throw new Error("bad point: equation left != right (1)");
    const te = l($ * T), Se = l(C * U);
    if (te !== Se) throw new Error("bad point: equation left != right (2)");
    return !0;
  });
  class f {
    constructor(b, F, $, T) {
      this.ex = b, this.ey = F, this.ez = $, this.et = T, y("x", b), y("y", F), y("z", $), y("t", T), Object.freeze(this);
    }
    get x() {
      return this.toAffine().x;
    }
    get y() {
      return this.toAffine().y;
    }
    static fromAffine(b) {
      if (b instanceof f) throw new Error("extended point not allowed");
      const { x: F, y: $ } = b || {};
      return y("x", F), y("y", $), new f(F, $, me, l(F * $));
    }
    static normalizeZ(b) {
      const F = t.invertBatch(b.map(($) => $.ez));
      return b.map(($, T) => $.toAffine(F[T])).map(f.fromAffine);
    }
    static msm(b, F) {
      return Qa(f, p, b, F);
    }
    _setWindowSize(b) {
      S.setWindowSize(this, b);
    }
    assertValidity() {
      v(this);
    }
    equals(b) {
      w(b);
      const { ex: F, ey: $, ez: T } = this, { ex: C, ey: U, ez: G } = b, z = l(F * G), j = l(C * T), J = l($ * G), oe = l(U * T);
      return z === j && J === oe;
    }
    is0() {
      return this.equals(f.ZERO);
    }
    negate() {
      return new f(l(-this.ex), this.ey, this.ez, l(-this.et));
    }
    double() {
      const { a: b } = e, { ex: F, ey: $, ez: T } = this, C = l(F * F), U = l($ * $), G = l(Ct * l(T * T)), z = l(b * C), j = F + $, J = l(l(j * j) - C - U), oe = z + U, ye = oe - G, fe = z - U, te = l(J * ye), Se = l(oe * fe), Oe = l(J * fe), st = l(ye * oe);
      return new f(te, Se, st, Oe);
    }
    add(b) {
      w(b);
      const { a: F, d: $ } = e, { ex: T, ey: C, ez: U, et: G } = this, { ex: z, ey: j, ez: J, et: oe } = b;
      if (F === BigInt(-1)) {
        const Ys = l((C - T) * (j + z)), Qs = l((C + T) * (j - z)), Zt = l(Qs - Ys);
        if (Zt === qe) return this.double();
        const Zs = l(U * Ct * oe), Xs = l(G * Ct * J), ei = Xs + Zs, ti = Qs + Ys, si = Xs - Zs, Pn = l(ei * Zt), Rn = l(ti * si), An = l(ei * si), $n = l(Zt * ti);
        return new f(Pn, Rn, $n, An);
      }
      const ye = l(T * z), fe = l(C * j), te = l(G * $ * oe), Se = l(U * J), Oe = l((T + C) * (z + j) - ye - fe), st = Se - te, $t = Se + te, ht = l(fe - F * ye), Qt = l(Oe * st), xn = l($t * ht), Sn = l(Oe * ht), Fn = l(st * $t);
      return new f(Qt, xn, Fn, Sn);
    }
    subtract(b) {
      return this.add(b.negate());
    }
    wNAF(b) {
      return S.wNAFCached(this, b, f.normalizeZ);
    }
    multiply(b) {
      const F = b;
      bt("scalar", F, me, s);
      const { p: $, f: T } = this.wNAF(F);
      return f.normalizeZ([$, T])[0];
    }
    multiplyUnsafe(b, F = f.ZERO) {
      const $ = b;
      return bt("scalar", $, qe, s), $ === qe ? R : this.is0() || $ === me ? this : S.wNAFCachedUnsafe(this, $, f.normalizeZ, F);
    }
    isSmallOrder() {
      return this.multiplyUnsafe(c).is0();
    }
    isTorsionFree() {
      return S.unsafeLadder(this, s).is0();
    }
    toAffine(b) {
      return _(this, b);
    }
    clearCofactor() {
      const { h: b } = e;
      return b === me ? this : this.multiplyUnsafe(b);
    }
    static fromHex(b, F = !1) {
      const { d: $, a: T } = e, C = t.BYTES;
      b = He("pointHex", b, C), is("zip215", F);
      const U = b.slice(), G = b[C - 1];
      U[C - 1] = G & -129;
      const z = kt(U), j = F ? h : t.ORDER;
      bt("pointHex.y", z, qe, j);
      const J = l(z * z), oe = l(J - me), ye = l($ * J - T);
      let { isValid: fe, value: te } = d(oe, ye);
      if (!fe) throw new Error("Point.fromHex: invalid y coordinate");
      const Se = (te & me) === me, Oe = (G & 128) !== 0;
      if (!F && te === qe && Oe) throw new Error("Point.fromHex: x=0 and x_0=1");
      return Oe !== Se && (te = l(-te)), f.fromAffine({ x: te, y: z });
    }
    static fromPrivateKey(b) {
      return P(b).point;
    }
    toRawBytes() {
      const { x: b, y: F } = this.toAffine(), $ = vs(F, t.BYTES);
      return $[$.length - 1] |= b & me ? 128 : 0, $;
    }
    toHex() {
      return Us(this.toRawBytes());
    }
  }
  f.BASE = new f(e.Gx, e.Gy, me, l(e.Gx * e.Gy)), f.ZERO = new f(qe, me, me, qe);
  const { BASE: x, ZERO: R } = f, S = Ya(f, a * 8);
  function q(A) {
    return ee(A, s);
  }
  function O(A) {
    return q(kt(A));
  }
  function P(A) {
    const b = t.BYTES;
    A = He("private key", A, b);
    const F = He("hashed private key", n(A), 2 * b), $ = g(F.slice(0, b)), T = F.slice(b, 2 * b), C = O($), U = x.multiply(C), G = U.toRawBytes();
    return { head: $, prefix: T, scalar: C, point: U, pointBytes: G };
  }
  function M(A) {
    return P(A).pointBytes;
  }
  function ne(A = new Uint8Array(), ...b) {
    const F = Pi(...b);
    return O(n(u(F, He("context", A), !!i)));
  }
  function pe(A, b, F = {}) {
    A = He("message", A), i && (A = i(A));
    const { prefix: $, scalar: T, pointBytes: C } = P(b), U = ne(F.context, $, A), G = x.multiply(U).toRawBytes(), z = ne(F.context, G, C, A), j = q(U + z * T);
    bt("signature.s", j, qe, s);
    const J = Pi(G, vs(j, t.BYTES));
    return He("result", J, t.BYTES * 2);
  }
  const ve = ec;
  function De(A, b, F, $ = ve) {
    const { context: T, zip215: C } = $, U = t.BYTES;
    A = He("signature", A, 2 * U), b = He("message", b), F = He("publicKey", F, U), C !== void 0 && is("zip215", C), i && (b = i(b));
    const G = kt(A.slice(U, 2 * U));
    let z, j, J;
    try {
      z = f.fromHex(F, C), j = f.fromHex(A.slice(0, U), C), J = x.multiplyUnsafe(G);
    } catch {
      return !1;
    }
    if (!C && z.isSmallOrder()) return !1;
    const oe = ne(T, j.toRawBytes(), z.toRawBytes(), b);
    return j.add(z.multiplyUnsafe(oe)).subtract(J).clearCofactor().equals(f.ZERO);
  }
  return x._setWindowSize(8), { CURVE: e, getPublicKey: M, sign: pe, verify: De, ExtendedPoint: f, utils: { getExtendedPublicKey: P, randomPrivateKey: () => o(t.BYTES), precompute(A = 8, b = f.BASE) {
    return b._setWindowSize(A), b.multiply(BigInt(3)), b;
  } } };
}
BigInt(0), BigInt(1);
const zs = BigInt("57896044618658097711785492504343953926634992332820282019728792003956564819949"), qi = BigInt("19681161376707505956807079304988542015446066515923890162744021073123829784752");
BigInt(0);
const ic = BigInt(1), Ci = BigInt(2);
BigInt(3);
const rc = BigInt(5), nc = BigInt(8);
function oc(r) {
  const e = BigInt(10), t = BigInt(20), s = BigInt(40), i = BigInt(80), n = zs, o = r * r % n * r % n, a = ke(o, Ci, n) * o % n, c = ke(a, ic, n) * r % n, h = ke(c, rc, n) * c % n, l = ke(h, e, n) * h % n, p = ke(l, t, n) * l % n, d = ke(p, s, n) * p % n, g = ke(d, i, n) * d % n, u = ke(g, i, n) * d % n, y = ke(u, e, n) * h % n;
  return { pow_p_5_8: ke(y, Ci, n) * r % n, b2: o };
}
function ac(r) {
  return r[0] &= 248, r[31] &= 127, r[31] |= 64, r;
}
function cc(r, e) {
  const t = zs, s = ee(e * e * e, t), i = ee(s * s * e, t), n = oc(r * i).pow_p_5_8;
  let o = ee(r * s * n, t);
  const a = ee(e * o * o, t), c = o, h = ee(o * qi, t), l = a === r, p = a === ee(-r, t), d = a === ee(-r * qi, t);
  return l && (o = c), (p || d) && (o = h), za(o, t) && (o = ee(-o, t)), { isValid: l || p, value: o };
}
const hc = Cr(zs, void 0, !0), lc = { a: BigInt(-1), d: BigInt("37095705934669439343138083508754565189542113879843219016388785533085940283555"), Fp: hc, n: BigInt("7237005577332262213973186563042994240857116359379907606001950938285454250989"), h: nc, Gx: BigInt("15112221349535400772501151409588531511454012693041857206046113283949847762202"), Gy: BigInt("46316835694926478169428394003475163141307993866256225615783033603165251855960"), hash: Ta, randomBytes: Pr, adjustScalarBytes: ac, uvRatio: cc }, kr = sc(lc), uc = "EdDSA", pc = "JWT", jt = ".", Kt = "base64url", Mr = "utf8", Lr = "utf8", dc = ":", gc = "did", yc = "key", Ni = "base58btc", fc = "z", mc = "K36", wc = 32;
function Vs(r) {
  return globalThis.Buffer != null ? new Uint8Array(r.buffer, r.byteOffset, r.byteLength) : r;
}
function Br(r = 0) {
  return globalThis.Buffer != null && globalThis.Buffer.allocUnsafe != null ? Vs(globalThis.Buffer.allocUnsafe(r)) : new Uint8Array(r);
}
function Ur(r, e) {
  e || (e = r.reduce((i, n) => i + n.length, 0));
  const t = Br(e);
  let s = 0;
  for (const i of r) t.set(i, s), s += i.length;
  return Vs(t);
}
function bc(r, e) {
  if (r.length >= 255) throw new TypeError("Alphabet too long");
  for (var t = new Uint8Array(256), s = 0; s < t.length; s++) t[s] = 255;
  for (var i = 0; i < r.length; i++) {
    var n = r.charAt(i), o = n.charCodeAt(0);
    if (t[o] !== 255) throw new TypeError(n + " is ambiguous");
    t[o] = i;
  }
  var a = r.length, c = r.charAt(0), h = Math.log(a) / Math.log(256), l = Math.log(256) / Math.log(a);
  function p(u) {
    if (u instanceof Uint8Array || (ArrayBuffer.isView(u) ? u = new Uint8Array(u.buffer, u.byteOffset, u.byteLength) : Array.isArray(u) && (u = Uint8Array.from(u))), !(u instanceof Uint8Array)) throw new TypeError("Expected Uint8Array");
    if (u.length === 0) return "";
    for (var y = 0, w = 0, _ = 0, v = u.length; _ !== v && u[_] === 0; ) _++, y++;
    for (var f = (v - _) * l + 1 >>> 0, x = new Uint8Array(f); _ !== v; ) {
      for (var R = u[_], S = 0, q = f - 1; (R !== 0 || S < w) && q !== -1; q--, S++) R += 256 * x[q] >>> 0, x[q] = R % a >>> 0, R = R / a >>> 0;
      if (R !== 0) throw new Error("Non-zero carry");
      w = S, _++;
    }
    for (var O = f - w; O !== f && x[O] === 0; ) O++;
    for (var P = c.repeat(y); O < f; ++O) P += r.charAt(x[O]);
    return P;
  }
  function d(u) {
    if (typeof u != "string") throw new TypeError("Expected String");
    if (u.length === 0) return new Uint8Array();
    var y = 0;
    if (u[y] !== " ") {
      for (var w = 0, _ = 0; u[y] === c; ) w++, y++;
      for (var v = (u.length - y) * h + 1 >>> 0, f = new Uint8Array(v); u[y]; ) {
        var x = t[u.charCodeAt(y)];
        if (x === 255) return;
        for (var R = 0, S = v - 1; (x !== 0 || R < _) && S !== -1; S--, R++) x += a * f[S] >>> 0, f[S] = x % 256 >>> 0, x = x / 256 >>> 0;
        if (x !== 0) throw new Error("Non-zero carry");
        _ = R, y++;
      }
      if (u[y] !== " ") {
        for (var q = v - _; q !== v && f[q] === 0; ) q++;
        for (var O = new Uint8Array(w + (v - q)), P = w; q !== v; ) O[P++] = f[q++];
        return O;
      }
    }
  }
  function g(u) {
    var y = d(u);
    if (y) return y;
    throw new Error(`Non-${e} character`);
  }
  return { encode: p, decodeUnsafe: d, decode: g };
}
var vc = bc, _c = vc;
const jr = (r) => {
  if (r instanceof Uint8Array && r.constructor.name === "Uint8Array") return r;
  if (r instanceof ArrayBuffer) return new Uint8Array(r);
  if (ArrayBuffer.isView(r)) return new Uint8Array(r.buffer, r.byteOffset, r.byteLength);
  throw new Error("Unknown type, must be binary type");
}, Ec = (r) => new TextEncoder().encode(r), Ic = (r) => new TextDecoder().decode(r);
let xc = class {
  constructor(e, t, s) {
    this.name = e, this.prefix = t, this.baseEncode = s;
  }
  encode(e) {
    if (e instanceof Uint8Array) return `${this.prefix}${this.baseEncode(e)}`;
    throw Error("Unknown type, must be binary type");
  }
}, Sc = class {
  constructor(e, t, s) {
    if (this.name = e, this.prefix = t, t.codePointAt(0) === void 0) throw new Error("Invalid prefix character");
    this.prefixCodePoint = t.codePointAt(0), this.baseDecode = s;
  }
  decode(e) {
    if (typeof e == "string") {
      if (e.codePointAt(0) !== this.prefixCodePoint) throw Error(`Unable to decode multibase string ${JSON.stringify(e)}, ${this.name} decoder only supports inputs prefixed with ${this.prefix}`);
      return this.baseDecode(e.slice(this.prefix.length));
    } else throw Error("Can only multibase decode strings");
  }
  or(e) {
    return zr(this, e);
  }
}, Fc = class {
  constructor(e) {
    this.decoders = e;
  }
  or(e) {
    return zr(this, e);
  }
  decode(e) {
    const t = e[0], s = this.decoders[t];
    if (s) return s.decode(e);
    throw RangeError(`Unable to decode multibase string ${JSON.stringify(e)}, only inputs prefixed with ${Object.keys(this.decoders)} are supported`);
  }
};
const zr = (r, e) => new Fc({ ...r.decoders || { [r.prefix]: r }, ...e.decoders || { [e.prefix]: e } });
let Pc = class {
  constructor(e, t, s, i) {
    this.name = e, this.prefix = t, this.baseEncode = s, this.baseDecode = i, this.encoder = new xc(e, t, s), this.decoder = new Sc(e, t, i);
  }
  encode(e) {
    return this.encoder.encode(e);
  }
  decode(e) {
    return this.decoder.decode(e);
  }
};
const Ht = ({ name: r, prefix: e, encode: t, decode: s }) => new Pc(r, e, t, s), Rt = ({ prefix: r, name: e, alphabet: t }) => {
  const { encode: s, decode: i } = _c(t, e);
  return Ht({ prefix: r, name: e, encode: s, decode: (n) => jr(i(n)) });
}, Rc = (r, e, t, s) => {
  const i = {};
  for (let l = 0; l < e.length; ++l) i[e[l]] = l;
  let n = r.length;
  for (; r[n - 1] === "="; ) --n;
  const o = new Uint8Array(n * t / 8 | 0);
  let a = 0, c = 0, h = 0;
  for (let l = 0; l < n; ++l) {
    const p = i[r[l]];
    if (p === void 0) throw new SyntaxError(`Non-${s} character`);
    c = c << t | p, a += t, a >= 8 && (a -= 8, o[h++] = 255 & c >> a);
  }
  if (a >= t || 255 & c << 8 - a) throw new SyntaxError("Unexpected end of data");
  return o;
}, Ac = (r, e, t) => {
  const s = e[e.length - 1] === "=", i = (1 << t) - 1;
  let n = "", o = 0, a = 0;
  for (let c = 0; c < r.length; ++c) for (a = a << 8 | r[c], o += 8; o > t; ) o -= t, n += e[i & a >> o];
  if (o && (n += e[i & a << t - o]), s) for (; n.length * t & 7; ) n += "=";
  return n;
}, le = ({ name: r, prefix: e, bitsPerChar: t, alphabet: s }) => Ht({ prefix: e, name: r, encode(i) {
  return Ac(i, s, t);
}, decode(i) {
  return Rc(i, s, t, r);
} }), $c = Ht({ prefix: "\0", name: "identity", encode: (r) => Ic(r), decode: (r) => Ec(r) });
var Tc = Object.freeze({ __proto__: null, identity: $c });
const Oc = le({ prefix: "0", name: "base2", alphabet: "01", bitsPerChar: 1 });
var qc = Object.freeze({ __proto__: null, base2: Oc });
const Cc = le({ prefix: "7", name: "base8", alphabet: "01234567", bitsPerChar: 3 });
var Nc = Object.freeze({ __proto__: null, base8: Cc });
const Dc = Rt({ prefix: "9", name: "base10", alphabet: "0123456789" });
var kc = Object.freeze({ __proto__: null, base10: Dc });
const Mc = le({ prefix: "f", name: "base16", alphabet: "0123456789abcdef", bitsPerChar: 4 }), Lc = le({ prefix: "F", name: "base16upper", alphabet: "0123456789ABCDEF", bitsPerChar: 4 });
var Bc = Object.freeze({ __proto__: null, base16: Mc, base16upper: Lc });
const Uc = le({ prefix: "b", name: "base32", alphabet: "abcdefghijklmnopqrstuvwxyz234567", bitsPerChar: 5 }), jc = le({ prefix: "B", name: "base32upper", alphabet: "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567", bitsPerChar: 5 }), zc = le({ prefix: "c", name: "base32pad", alphabet: "abcdefghijklmnopqrstuvwxyz234567=", bitsPerChar: 5 }), Vc = le({ prefix: "C", name: "base32padupper", alphabet: "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567=", bitsPerChar: 5 }), Kc = le({ prefix: "v", name: "base32hex", alphabet: "0123456789abcdefghijklmnopqrstuv", bitsPerChar: 5 }), Hc = le({ prefix: "V", name: "base32hexupper", alphabet: "0123456789ABCDEFGHIJKLMNOPQRSTUV", bitsPerChar: 5 }), Gc = le({ prefix: "t", name: "base32hexpad", alphabet: "0123456789abcdefghijklmnopqrstuv=", bitsPerChar: 5 }), Wc = le({ prefix: "T", name: "base32hexpadupper", alphabet: "0123456789ABCDEFGHIJKLMNOPQRSTUV=", bitsPerChar: 5 }), Jc = le({ prefix: "h", name: "base32z", alphabet: "ybndrfg8ejkmcpqxot1uwisza345h769", bitsPerChar: 5 });
var Yc = Object.freeze({ __proto__: null, base32: Uc, base32upper: jc, base32pad: zc, base32padupper: Vc, base32hex: Kc, base32hexupper: Hc, base32hexpad: Gc, base32hexpadupper: Wc, base32z: Jc });
const Qc = Rt({ prefix: "k", name: "base36", alphabet: "0123456789abcdefghijklmnopqrstuvwxyz" }), Zc = Rt({ prefix: "K", name: "base36upper", alphabet: "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ" });
var Xc = Object.freeze({ __proto__: null, base36: Qc, base36upper: Zc });
const eh = Rt({ name: "base58btc", prefix: "z", alphabet: "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz" }), th = Rt({ name: "base58flickr", prefix: "Z", alphabet: "123456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ" });
var sh = Object.freeze({ __proto__: null, base58btc: eh, base58flickr: th });
const ih = le({ prefix: "m", name: "base64", alphabet: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/", bitsPerChar: 6 }), rh = le({ prefix: "M", name: "base64pad", alphabet: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=", bitsPerChar: 6 }), nh = le({ prefix: "u", name: "base64url", alphabet: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_", bitsPerChar: 6 }), oh = le({ prefix: "U", name: "base64urlpad", alphabet: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_=", bitsPerChar: 6 });
var ah = Object.freeze({ __proto__: null, base64: ih, base64pad: rh, base64url: nh, base64urlpad: oh });
const Vr = Array.from("🚀🪐☄🛰🌌🌑🌒🌓🌔🌕🌖🌗🌘🌍🌏🌎🐉☀💻🖥💾💿😂❤😍🤣😊🙏💕😭😘👍😅👏😁🔥🥰💔💖💙😢🤔😆🙄💪😉☺👌🤗💜😔😎😇🌹🤦🎉💞✌✨🤷😱😌🌸🙌😋💗💚😏💛🙂💓🤩😄😀🖤😃💯🙈👇🎶😒🤭❣😜💋👀😪😑💥🙋😞😩😡🤪👊🥳😥🤤👉💃😳✋😚😝😴🌟😬🙃🍀🌷😻😓⭐✅🥺🌈😈🤘💦✔😣🏃💐☹🎊💘😠☝😕🌺🎂🌻😐🖕💝🙊😹🗣💫💀👑🎵🤞😛🔴😤🌼😫⚽🤙☕🏆🤫👈😮🙆🍻🍃🐶💁😲🌿🧡🎁⚡🌞🎈❌✊👋😰🤨😶🤝🚶💰🍓💢🤟🙁🚨💨🤬✈🎀🍺🤓😙💟🌱😖👶🥴▶➡❓💎💸⬇😨🌚🦋😷🕺⚠🙅😟😵👎🤲🤠🤧📌🔵💅🧐🐾🍒😗🤑🌊🤯🐷☎💧😯💆👆🎤🙇🍑❄🌴💣🐸💌📍🥀🤢👅💡💩👐📸👻🤐🤮🎼🥵🚩🍎🍊👼💍📣🥂"), ch = Vr.reduce((r, e, t) => (r[t] = e, r), []), hh = Vr.reduce((r, e, t) => (r[e.codePointAt(0)] = t, r), []);
function lh(r) {
  return r.reduce((e, t) => (e += ch[t], e), "");
}
function uh(r) {
  const e = [];
  for (const t of r) {
    const s = hh[t.codePointAt(0)];
    if (s === void 0) throw new Error(`Non-base256emoji character: ${t}`);
    e.push(s);
  }
  return new Uint8Array(e);
}
const ph = Ht({ prefix: "🚀", name: "base256emoji", encode: lh, decode: uh });
var dh = Object.freeze({ __proto__: null, base256emoji: ph }), gh = Kr, Di = 128, yh = -128, fh = Math.pow(2, 31);
function Kr(r, e, t) {
  e = e || [], t = t || 0;
  for (var s = t; r >= fh; ) e[t++] = r & 255 | Di, r /= 128;
  for (; r & yh; ) e[t++] = r & 255 | Di, r >>>= 7;
  return e[t] = r | 0, Kr.bytes = t - s + 1, e;
}
var mh = Es, wh = 128, ki = 127;
function Es(r, s) {
  var t = 0, s = s || 0, i = 0, n = s, o, a = r.length;
  do {
    if (n >= a) throw Es.bytes = 0, new RangeError("Could not decode varint");
    o = r[n++], t += i < 28 ? (o & ki) << i : (o & ki) * Math.pow(2, i), i += 7;
  } while (o >= wh);
  return Es.bytes = n - s, t;
}
var bh = Math.pow(2, 7), vh = Math.pow(2, 14), _h = Math.pow(2, 21), Eh = Math.pow(2, 28), Ih = Math.pow(2, 35), xh = Math.pow(2, 42), Sh = Math.pow(2, 49), Fh = Math.pow(2, 56), Ph = Math.pow(2, 63), Rh = function(r) {
  return r < bh ? 1 : r < vh ? 2 : r < _h ? 3 : r < Eh ? 4 : r < Ih ? 5 : r < xh ? 6 : r < Sh ? 7 : r < Fh ? 8 : r < Ph ? 9 : 10;
}, Ah = { encode: gh, decode: mh, encodingLength: Rh }, Hr = Ah;
const Mi = (r, e, t = 0) => (Hr.encode(r, e, t), e), Li = (r) => Hr.encodingLength(r), Is = (r, e) => {
  const t = e.byteLength, s = Li(r), i = s + Li(t), n = new Uint8Array(i + t);
  return Mi(r, n, 0), Mi(t, n, s), n.set(e, i), new $h(r, t, e, n);
};
let $h = class {
  constructor(e, t, s, i) {
    this.code = e, this.size = t, this.digest = s, this.bytes = i;
  }
};
const Gr = ({ name: r, code: e, encode: t }) => new Th(r, e, t);
let Th = class {
  constructor(e, t, s) {
    this.name = e, this.code = t, this.encode = s;
  }
  digest(e) {
    if (e instanceof Uint8Array) {
      const t = this.encode(e);
      return t instanceof Uint8Array ? Is(this.code, t) : t.then((s) => Is(this.code, s));
    } else throw Error("Unknown type, must be binary type");
  }
};
const Wr = (r) => async (e) => new Uint8Array(await crypto.subtle.digest(r, e)), Oh = Gr({ name: "sha2-256", code: 18, encode: Wr("SHA-256") }), qh = Gr({ name: "sha2-512", code: 19, encode: Wr("SHA-512") });
var Ch = Object.freeze({ __proto__: null, sha256: Oh, sha512: qh });
const Jr = 0, Nh = "identity", Yr = jr, Dh = (r) => Is(Jr, Yr(r)), kh = { code: Jr, name: Nh, encode: Yr, digest: Dh };
var Mh = Object.freeze({ __proto__: null, identity: kh });
new TextEncoder(), new TextDecoder();
const Bi = { ...Tc, ...qc, ...Nc, ...kc, ...Bc, ...Yc, ...Xc, ...sh, ...ah, ...dh };
({ ...Ch, ...Mh });
function Qr(r, e, t, s) {
  return { name: r, prefix: e, encoder: { name: r, prefix: e, encode: t }, decoder: { decode: s } };
}
const Ui = Qr("utf8", "u", (r) => "u" + new TextDecoder("utf8").decode(r), (r) => new TextEncoder().encode(r.substring(1))), hs = Qr("ascii", "a", (r) => {
  let e = "a";
  for (let t = 0; t < r.length; t++) e += String.fromCharCode(r[t]);
  return e;
}, (r) => {
  r = r.substring(1);
  const e = Br(r.length);
  for (let t = 0; t < r.length; t++) e[t] = r.charCodeAt(t);
  return e;
}), Zr = { utf8: Ui, "utf-8": Ui, hex: Bi.base16, latin1: hs, ascii: hs, binary: hs, ...Bi };
function Gt(r, e = "utf8") {
  const t = Zr[e];
  if (!t) throw new Error(`Unsupported encoding "${e}"`);
  return (e === "utf8" || e === "utf-8") && globalThis.Buffer != null && globalThis.Buffer.from != null ? globalThis.Buffer.from(r.buffer, r.byteOffset, r.byteLength).toString("utf8") : t.encoder.encode(r).substring(1);
}
function ft(r, e = "utf8") {
  const t = Zr[e];
  if (!t) throw new Error(`Unsupported encoding "${e}"`);
  return (e === "utf8" || e === "utf-8") && globalThis.Buffer != null && globalThis.Buffer.from != null ? Vs(globalThis.Buffer.from(r, "utf-8")) : t.decoder.decode(`${t.prefix}${r}`);
}
function ji(r) {
  return Bt(Gt(ft(r, Kt), Mr));
}
function zt(r) {
  return Gt(ft(Ds(r), Mr), Kt);
}
function Xr(r) {
  const e = ft(mc, Ni), t = fc + Gt(Ur([e, r]), Ni);
  return [gc, yc, t].join(dc);
}
function Lh(r) {
  return Gt(r, Kt);
}
function Bh(r) {
  return ft(r, Kt);
}
function Uh(r) {
  return ft([zt(r.header), zt(r.payload)].join(jt), Lr);
}
function jh(r) {
  return [zt(r.header), zt(r.payload), Lh(r.signature)].join(jt);
}
function zi(r) {
  const e = r.split(jt), t = ji(e[0]), s = ji(e[1]), i = Bh(e[2]), n = ft(e.slice(0, 2).join(jt), Lr);
  return { header: t, payload: s, signature: i, data: n };
}
function Vi(r = Pr(wc)) {
  const e = kr.getPublicKey(r);
  return { secretKey: Ur([r, e]), publicKey: e };
}
async function zh(r, e, t, s, i = E.fromMiliseconds(Date.now())) {
  const n = { alg: uc, typ: pc }, o = Xr(s.publicKey), a = i + t, c = { iss: o, sub: r, aud: e, iat: i, exp: a }, h = Uh({ header: n, payload: c }), l = kr.sign(h, s.secretKey.slice(0, 32));
  return jh({ header: n, payload: c, signature: l });
}
const Og = { waku: { publish: "waku_publish", batchPublish: "waku_batchPublish", subscribe: "waku_subscribe", batchSubscribe: "waku_batchSubscribe", subscription: "waku_subscription", unsubscribe: "waku_unsubscribe", batchUnsubscribe: "waku_batchUnsubscribe", batchFetchMessages: "waku_batchFetchMessages" }, irn: { publish: "irn_publish", batchPublish: "irn_batchPublish", subscribe: "irn_subscribe", batchSubscribe: "irn_batchSubscribe", subscription: "irn_subscription", unsubscribe: "irn_unsubscribe", batchUnsubscribe: "irn_batchUnsubscribe", batchFetchMessages: "irn_batchFetchMessages" }, iridium: { publish: "iridium_publish", batchPublish: "iridium_batchPublish", subscribe: "iridium_subscribe", batchSubscribe: "iridium_batchSubscribe", subscription: "iridium_subscription", unsubscribe: "iridium_unsubscribe", batchUnsubscribe: "iridium_batchUnsubscribe", batchFetchMessages: "iridium_batchFetchMessages" } }, Vh = "PARSE_ERROR", Kh = "INVALID_REQUEST", Hh = "METHOD_NOT_FOUND", Gh = "INVALID_PARAMS", en = "INTERNAL_ERROR", Ks = "SERVER_ERROR", Wh = [-32700, -32600, -32601, -32602, -32603], St = {
  [Vh]: { code: -32700, message: "Parse error" },
  [Kh]: { code: -32600, message: "Invalid Request" },
  [Hh]: { code: -32601, message: "Method not found" },
  [Gh]: { code: -32602, message: "Invalid params" },
  [en]: { code: -32603, message: "Internal error" },
  [Ks]: { code: -32e3, message: "Server error" }
}, tn = Ks;
function Jh(r) {
  return Wh.includes(r);
}
function Ki(r) {
  return Object.keys(St).includes(r) ? St[r] : St[tn];
}
function Yh(r) {
  const e = Object.values(St).find((t) => t.code === r);
  return e || St[tn];
}
function Qh(r, e, t) {
  return r.message.includes("getaddrinfo ENOTFOUND") || r.message.includes("connect ECONNREFUSED") ? new Error(`Unavailable ${t} RPC url at ${e}`) : r;
}
function Ue(r = 3) {
  const e = Date.now() * Math.pow(10, r), t = Math.floor(Math.random() * Math.pow(10, r));
  return e + t;
}
function tt(r = 6) {
  return BigInt(Ue(r));
}
function Je(r, e, t) {
  return {
    id: t || Ue(),
    jsonrpc: "2.0",
    method: r,
    params: e
  };
}
function Vt(r, e) {
  return {
    id: r,
    jsonrpc: "2.0",
    result: e
  };
}
function Hs(r, e, t) {
  return {
    id: r,
    jsonrpc: "2.0",
    error: Zh(e)
  };
}
function Zh(r, e) {
  return typeof r > "u" ? Ki(en) : (typeof r == "string" && (r = Object.assign(Object.assign({}, Ki(Ks)), { message: r })), Jh(r.code) && (r = Yh(r.code)), r);
}
class Xh {
}
class el extends Xh {
  constructor() {
    super();
  }
}
class tl extends el {
  constructor(e) {
    super();
  }
}
const sl = "^wss?:";
function il(r) {
  const e = r.match(new RegExp(/^\w+:/, "gi"));
  if (!(!e || !e.length))
    return e[0];
}
function rl(r, e) {
  const t = il(r);
  return typeof t > "u" ? !1 : new RegExp(e).test(t);
}
function Hi(r) {
  return rl(r, sl);
}
function nl(r) {
  return new RegExp("wss?://localhost(:d{2,5})?").test(r);
}
function sn(r) {
  return typeof r == "object" && "id" in r && "jsonrpc" in r && r.jsonrpc === "2.0";
}
function Gs(r) {
  return sn(r) && "method" in r;
}
function Wt(r) {
  return sn(r) && (je(r) || $e(r));
}
function je(r) {
  return "result" in r;
}
function $e(r) {
  return "error" in r;
}
class ol extends tl {
  constructor(e) {
    super(e), this.events = new Ye.EventEmitter(), this.hasRegisteredEventListeners = !1, this.connection = this.setConnection(e), this.connection.connected && this.registerEventListeners();
  }
  async connect(e = this.connection) {
    await this.open(e);
  }
  async disconnect() {
    await this.close();
  }
  on(e, t) {
    this.events.on(e, t);
  }
  once(e, t) {
    this.events.once(e, t);
  }
  off(e, t) {
    this.events.off(e, t);
  }
  removeListener(e, t) {
    this.events.removeListener(e, t);
  }
  async request(e, t) {
    return this.requestStrict(Je(e.method, e.params || [], e.id || tt().toString()), t);
  }
  async requestStrict(e, t) {
    return new Promise(async (s, i) => {
      if (!this.connection.connected) try {
        await this.open();
      } catch (n) {
        i(n);
      }
      this.events.on(`${e.id}`, (n) => {
        $e(n) ? i(n.error) : s(n.result);
      });
      try {
        await this.connection.send(e, t);
      } catch (n) {
        i(n);
      }
    });
  }
  setConnection(e = this.connection) {
    return e;
  }
  onPayload(e) {
    this.events.emit("payload", e), Wt(e) ? this.events.emit(`${e.id}`, e) : this.events.emit("message", { type: e.method, data: e.params });
  }
  onClose(e) {
    e && e.code === 3e3 && this.events.emit("error", new Error(`WebSocket connection closed abnormally with code: ${e.code} ${e.reason ? `(${e.reason})` : ""}`)), this.events.emit("disconnect");
  }
  async open(e = this.connection) {
    this.connection === e && this.connection.connected || (this.connection.connected && this.close(), typeof e == "string" && (await this.connection.open(e), e = this.connection), this.connection = this.setConnection(e), await this.connection.open(), this.registerEventListeners(), this.events.emit("connect"));
  }
  async close() {
    await this.connection.close();
  }
  registerEventListeners() {
    this.hasRegisteredEventListeners || (this.connection.on("payload", (e) => this.onPayload(e)), this.connection.on("close", (e) => this.onClose(e)), this.connection.on("error", (e) => this.events.emit("error", e)), this.connection.on("register_error", (e) => this.onClose()), this.hasRegisteredEventListeners = !0);
  }
}
const al = () => typeof WebSocket < "u" ? WebSocket : typeof global < "u" && typeof global.WebSocket < "u" ? global.WebSocket : typeof window < "u" && typeof window.WebSocket < "u" ? window.WebSocket : typeof self < "u" && typeof self.WebSocket < "u" ? self.WebSocket : require("ws"), cl = () => typeof WebSocket < "u" || typeof global < "u" && typeof global.WebSocket < "u" || typeof window < "u" && typeof window.WebSocket < "u" || typeof self < "u" && typeof self.WebSocket < "u", Gi = (r) => r.split("?")[0], Wi = 10, hl = al();
let ll = class {
  constructor(e) {
    if (this.url = e, this.events = new Ye.EventEmitter(), this.registering = !1, !Hi(e)) throw new Error(`Provided URL is not compatible with WebSocket connection: ${e}`);
    this.url = e;
  }
  get connected() {
    return typeof this.socket < "u";
  }
  get connecting() {
    return this.registering;
  }
  on(e, t) {
    this.events.on(e, t);
  }
  once(e, t) {
    this.events.once(e, t);
  }
  off(e, t) {
    this.events.off(e, t);
  }
  removeListener(e, t) {
    this.events.removeListener(e, t);
  }
  async open(e = this.url) {
    await this.register(e);
  }
  async close() {
    return new Promise((e, t) => {
      if (typeof this.socket > "u") {
        t(new Error("Connection already closed"));
        return;
      }
      this.socket.onclose = (s) => {
        this.onClose(s), e();
      }, this.socket.close();
    });
  }
  async send(e) {
    typeof this.socket > "u" && (this.socket = await this.register());
    try {
      this.socket.send(Ds(e));
    } catch (t) {
      this.onError(e.id, t);
    }
  }
  register(e = this.url) {
    if (!Hi(e)) throw new Error(`Provided URL is not compatible with WebSocket connection: ${e}`);
    if (this.registering) {
      const t = this.events.getMaxListeners();
      return (this.events.listenerCount("register_error") >= t || this.events.listenerCount("open") >= t) && this.events.setMaxListeners(t + 1), new Promise((s, i) => {
        this.events.once("register_error", (n) => {
          this.resetMaxListeners(), i(n);
        }), this.events.once("open", () => {
          if (this.resetMaxListeners(), typeof this.socket > "u") return i(new Error("WebSocket connection is missing or invalid"));
          s(this.socket);
        });
      });
    }
    return this.url = e, this.registering = !0, new Promise((t, s) => {
      const i = Tn.isReactNative() ? void 0 : { rejectUnauthorized: !nl(e) }, n = new hl(e, [], i);
      cl() ? n.onerror = (o) => {
        const a = o;
        s(this.emitError(a.error));
      } : n.on("error", (o) => {
        s(this.emitError(o));
      }), n.onopen = () => {
        this.onOpen(n), t(n);
      };
    });
  }
  onOpen(e) {
    e.onmessage = (t) => this.onPayload(t), e.onclose = (t) => this.onClose(t), this.socket = e, this.registering = !1, this.events.emit("open");
  }
  onClose(e) {
    this.socket = void 0, this.registering = !1, this.events.emit("close", e);
  }
  onPayload(e) {
    if (typeof e.data > "u") return;
    const t = typeof e.data == "string" ? Bt(e.data) : e.data;
    this.events.emit("payload", t);
  }
  onError(e, t) {
    const s = this.parseError(t), i = s.message || s.toString(), n = Hs(e, i);
    this.events.emit("payload", n);
  }
  parseError(e, t = this.url) {
    return Qh(e, Gi(t), "WS");
  }
  resetMaxListeners() {
    this.events.getMaxListeners() > Wi && this.events.setMaxListeners(Wi);
  }
  emitError(e) {
    const t = this.parseError(new Error(e?.message || `WebSocket connection failed for host: ${Gi(this.url)}`));
    return this.events.emit("register_error", t), t;
  }
};
const rn = "wc", nn = 2, xs = "core", Ve = `${rn}@2:${xs}:`, ul = { logger: "error" }, pl = { database: ":memory:" }, dl = "crypto", Ji = "client_ed25519_seed", gl = E.ONE_DAY, yl = "keychain", fl = "0.3", ml = "messages", wl = "0.3", bl = E.SIX_HOURS, vl = "publisher", on = "irn", _l = "error", an = "wss://relay.walletconnect.org", El = "relayer", Z = { message: "relayer_message", message_ack: "relayer_message_ack", connect: "relayer_connect", disconnect: "relayer_disconnect", error: "relayer_error", connection_stalled: "relayer_connection_stalled", transport_closed: "relayer_transport_closed", publish: "relayer_publish" }, Il = "_subscription", Fe = { payload: "payload", connect: "connect", disconnect: "disconnect", error: "error" }, xl = 0.1, Ss = "2.23.3", W = { link_mode: "link_mode", relay: "relay" }, Mt = { inbound: "inbound", outbound: "outbound" }, Sl = "0.3", Fl = "WALLETCONNECT_CLIENT_ID", Yi = "WALLETCONNECT_LINK_MODE_APPS", Ee = { created: "subscription_created", deleted: "subscription_deleted", expired: "subscription_expired", disabled: "subscription_disabled", sync: "subscription_sync", resubscribed: "subscription_resubscribed" }, Pl = "subscription", Rl = "0.3", Al = "pairing", $l = "0.3", vt = { wc_pairingDelete: { req: { ttl: E.ONE_DAY, prompt: !1, tag: 1e3 }, res: { ttl: E.ONE_DAY, prompt: !1, tag: 1001 } }, wc_pairingPing: { req: { ttl: E.THIRTY_SECONDS, prompt: !1, tag: 1002 }, res: { ttl: E.THIRTY_SECONDS, prompt: !1, tag: 1003 } }, unregistered_method: { req: { ttl: E.ONE_DAY, prompt: !1, tag: 0 }, res: { ttl: E.ONE_DAY, prompt: !1, tag: 0 } } }, at = { create: "pairing_create", expire: "pairing_expire", delete: "pairing_delete", ping: "pairing_ping" }, Ce = { created: "history_created", updated: "history_updated", deleted: "history_deleted", sync: "history_sync" }, Tl = "history", Ol = "0.3", ql = "expirer", Re = { created: "expirer_created", deleted: "expirer_deleted", expired: "expirer_expired", sync: "expirer_sync" }, Cl = "0.3", Nl = "verify-api", Dl = "https://verify.walletconnect.com", cn = "https://verify.walletconnect.org", Ft = cn, kl = `${Ft}/v3`, Ml = [Dl, cn], Ll = "echo", Bl = "https://echo.walletconnect.com", Be = { pairing_started: "pairing_started", pairing_uri_validation_success: "pairing_uri_validation_success", pairing_uri_not_expired: "pairing_uri_not_expired", store_new_pairing: "store_new_pairing", subscribing_pairing_topic: "subscribing_pairing_topic", subscribe_pairing_topic_success: "subscribe_pairing_topic_success", existing_pairing: "existing_pairing", pairing_not_expired: "pairing_not_expired", emit_inactive_pairing: "emit_inactive_pairing", emit_session_proposal: "emit_session_proposal", subscribing_to_pairing_topic: "subscribing_to_pairing_topic" }, Ge = { no_wss_connection: "no_wss_connection", no_internet_connection: "no_internet_connection", malformed_pairing_uri: "malformed_pairing_uri", active_pairing_already_exists: "active_pairing_already_exists", subscribe_pairing_topic_failure: "subscribe_pairing_topic_failure", pairing_expired: "pairing_expired", proposal_expired: "proposal_expired", proposal_listener_not_found: "proposal_listener_not_found" }, Ne = { session_approve_started: "session_approve_started", proposal_not_expired: "proposal_not_expired", session_namespaces_validation_success: "session_namespaces_validation_success", create_session_topic: "create_session_topic", subscribing_session_topic: "subscribing_session_topic", subscribe_session_topic_success: "subscribe_session_topic_success", publishing_session_approve: "publishing_session_approve", session_approve_publish_success: "session_approve_publish_success", store_session: "store_session", publishing_session_settle: "publishing_session_settle", session_settle_publish_success: "session_settle_publish_success", session_request_response_started: "session_request_response_started", session_request_response_validation_success: "session_request_response_validation_success", session_request_response_publish_started: "session_request_response_publish_started" }, it = { no_internet_connection: "no_internet_connection", no_wss_connection: "no_wss_connection", proposal_expired: "proposal_expired", subscribe_session_topic_failure: "subscribe_session_topic_failure", session_approve_publish_failure: "session_approve_publish_failure", session_settle_publish_failure: "session_settle_publish_failure", session_approve_namespace_validation_failure: "session_approve_namespace_validation_failure", proposal_not_found: "proposal_not_found", session_request_response_validation_failure: "session_request_response_validation_failure", session_request_response_publish_failure: "session_request_response_publish_failure" }, rt = { authenticated_session_approve_started: "authenticated_session_approve_started", create_authenticated_session_topic: "create_authenticated_session_topic", cacaos_verified: "cacaos_verified", store_authenticated_session: "store_authenticated_session", subscribing_authenticated_session_topic: "subscribing_authenticated_session_topic", subscribe_authenticated_session_topic_success: "subscribe_authenticated_session_topic_success", publishing_authenticated_session_approve: "publishing_authenticated_session_approve" }, _t = { no_internet_connection: "no_internet_connection", invalid_cacao: "invalid_cacao", subscribe_authenticated_session_topic_failure: "subscribe_authenticated_session_topic_failure", authenticated_session_approve_publish_failure: "authenticated_session_approve_publish_failure", authenticated_session_pending_request_not_found: "authenticated_session_pending_request_not_found" }, Ul = 0.1, jl = "event-client", zl = 86400, Vl = "https://pulse.walletconnect.org/batch";
function Kl(r, e) {
  if (r.length >= 255) throw new TypeError("Alphabet too long");
  for (var t = new Uint8Array(256), s = 0; s < t.length; s++) t[s] = 255;
  for (var i = 0; i < r.length; i++) {
    var n = r.charAt(i), o = n.charCodeAt(0);
    if (t[o] !== 255) throw new TypeError(n + " is ambiguous");
    t[o] = i;
  }
  var a = r.length, c = r.charAt(0), h = Math.log(a) / Math.log(256), l = Math.log(256) / Math.log(a);
  function p(u) {
    if (u instanceof Uint8Array || (ArrayBuffer.isView(u) ? u = new Uint8Array(u.buffer, u.byteOffset, u.byteLength) : Array.isArray(u) && (u = Uint8Array.from(u))), !(u instanceof Uint8Array)) throw new TypeError("Expected Uint8Array");
    if (u.length === 0) return "";
    for (var y = 0, w = 0, _ = 0, v = u.length; _ !== v && u[_] === 0; ) _++, y++;
    for (var f = (v - _) * l + 1 >>> 0, x = new Uint8Array(f); _ !== v; ) {
      for (var R = u[_], S = 0, q = f - 1; (R !== 0 || S < w) && q !== -1; q--, S++) R += 256 * x[q] >>> 0, x[q] = R % a >>> 0, R = R / a >>> 0;
      if (R !== 0) throw new Error("Non-zero carry");
      w = S, _++;
    }
    for (var O = f - w; O !== f && x[O] === 0; ) O++;
    for (var P = c.repeat(y); O < f; ++O) P += r.charAt(x[O]);
    return P;
  }
  function d(u) {
    if (typeof u != "string") throw new TypeError("Expected String");
    if (u.length === 0) return new Uint8Array();
    var y = 0;
    if (u[y] !== " ") {
      for (var w = 0, _ = 0; u[y] === c; ) w++, y++;
      for (var v = (u.length - y) * h + 1 >>> 0, f = new Uint8Array(v); u[y]; ) {
        var x = t[u.charCodeAt(y)];
        if (x === 255) return;
        for (var R = 0, S = v - 1; (x !== 0 || R < _) && S !== -1; S--, R++) x += a * f[S] >>> 0, f[S] = x % 256 >>> 0, x = x / 256 >>> 0;
        if (x !== 0) throw new Error("Non-zero carry");
        _ = R, y++;
      }
      if (u[y] !== " ") {
        for (var q = v - _; q !== v && f[q] === 0; ) q++;
        for (var O = new Uint8Array(w + (v - q)), P = w; q !== v; ) O[P++] = f[q++];
        return O;
      }
    }
  }
  function g(u) {
    var y = d(u);
    if (y) return y;
    throw new Error(`Non-${e} character`);
  }
  return { encode: p, decodeUnsafe: d, decode: g };
}
var Hl = Kl, Gl = Hl;
const hn = (r) => {
  if (r instanceof Uint8Array && r.constructor.name === "Uint8Array") return r;
  if (r instanceof ArrayBuffer) return new Uint8Array(r);
  if (ArrayBuffer.isView(r)) return new Uint8Array(r.buffer, r.byteOffset, r.byteLength);
  throw new Error("Unknown type, must be binary type");
}, Wl = (r) => new TextEncoder().encode(r), Jl = (r) => new TextDecoder().decode(r);
class Yl {
  constructor(e, t, s) {
    this.name = e, this.prefix = t, this.baseEncode = s;
  }
  encode(e) {
    if (e instanceof Uint8Array) return `${this.prefix}${this.baseEncode(e)}`;
    throw Error("Unknown type, must be binary type");
  }
}
class Ql {
  constructor(e, t, s) {
    if (this.name = e, this.prefix = t, t.codePointAt(0) === void 0) throw new Error("Invalid prefix character");
    this.prefixCodePoint = t.codePointAt(0), this.baseDecode = s;
  }
  decode(e) {
    if (typeof e == "string") {
      if (e.codePointAt(0) !== this.prefixCodePoint) throw Error(`Unable to decode multibase string ${JSON.stringify(e)}, ${this.name} decoder only supports inputs prefixed with ${this.prefix}`);
      return this.baseDecode(e.slice(this.prefix.length));
    } else throw Error("Can only multibase decode strings");
  }
  or(e) {
    return ln(this, e);
  }
}
class Zl {
  constructor(e) {
    this.decoders = e;
  }
  or(e) {
    return ln(this, e);
  }
  decode(e) {
    const t = e[0], s = this.decoders[t];
    if (s) return s.decode(e);
    throw RangeError(`Unable to decode multibase string ${JSON.stringify(e)}, only inputs prefixed with ${Object.keys(this.decoders)} are supported`);
  }
}
const ln = (r, e) => new Zl({ ...r.decoders || { [r.prefix]: r }, ...e.decoders || { [e.prefix]: e } });
class Xl {
  constructor(e, t, s, i) {
    this.name = e, this.prefix = t, this.baseEncode = s, this.baseDecode = i, this.encoder = new Yl(e, t, s), this.decoder = new Ql(e, t, i);
  }
  encode(e) {
    return this.encoder.encode(e);
  }
  decode(e) {
    return this.decoder.decode(e);
  }
}
const Jt = ({ name: r, prefix: e, encode: t, decode: s }) => new Xl(r, e, t, s), At = ({ prefix: r, name: e, alphabet: t }) => {
  const { encode: s, decode: i } = Gl(t, e);
  return Jt({ prefix: r, name: e, encode: s, decode: (n) => hn(i(n)) });
}, eu = (r, e, t, s) => {
  const i = {};
  for (let l = 0; l < e.length; ++l) i[e[l]] = l;
  let n = r.length;
  for (; r[n - 1] === "="; ) --n;
  const o = new Uint8Array(n * t / 8 | 0);
  let a = 0, c = 0, h = 0;
  for (let l = 0; l < n; ++l) {
    const p = i[r[l]];
    if (p === void 0) throw new SyntaxError(`Non-${s} character`);
    c = c << t | p, a += t, a >= 8 && (a -= 8, o[h++] = 255 & c >> a);
  }
  if (a >= t || 255 & c << 8 - a) throw new SyntaxError("Unexpected end of data");
  return o;
}, tu = (r, e, t) => {
  const s = e[e.length - 1] === "=", i = (1 << t) - 1;
  let n = "", o = 0, a = 0;
  for (let c = 0; c < r.length; ++c) for (a = a << 8 | r[c], o += 8; o > t; ) o -= t, n += e[i & a >> o];
  if (o && (n += e[i & a << t - o]), s) for (; n.length * t & 7; ) n += "=";
  return n;
}, ue = ({ name: r, prefix: e, bitsPerChar: t, alphabet: s }) => Jt({ prefix: e, name: r, encode(i) {
  return tu(i, s, t);
}, decode(i) {
  return eu(i, s, t, r);
} }), su = Jt({ prefix: "\0", name: "identity", encode: (r) => Jl(r), decode: (r) => Wl(r) });
var iu = Object.freeze({ __proto__: null, identity: su });
const ru = ue({ prefix: "0", name: "base2", alphabet: "01", bitsPerChar: 1 });
var nu = Object.freeze({ __proto__: null, base2: ru });
const ou = ue({ prefix: "7", name: "base8", alphabet: "01234567", bitsPerChar: 3 });
var au = Object.freeze({ __proto__: null, base8: ou });
const cu = At({ prefix: "9", name: "base10", alphabet: "0123456789" });
var hu = Object.freeze({ __proto__: null, base10: cu });
const lu = ue({ prefix: "f", name: "base16", alphabet: "0123456789abcdef", bitsPerChar: 4 }), uu = ue({ prefix: "F", name: "base16upper", alphabet: "0123456789ABCDEF", bitsPerChar: 4 });
var pu = Object.freeze({ __proto__: null, base16: lu, base16upper: uu });
const du = ue({ prefix: "b", name: "base32", alphabet: "abcdefghijklmnopqrstuvwxyz234567", bitsPerChar: 5 }), gu = ue({ prefix: "B", name: "base32upper", alphabet: "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567", bitsPerChar: 5 }), yu = ue({ prefix: "c", name: "base32pad", alphabet: "abcdefghijklmnopqrstuvwxyz234567=", bitsPerChar: 5 }), fu = ue({ prefix: "C", name: "base32padupper", alphabet: "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567=", bitsPerChar: 5 }), mu = ue({ prefix: "v", name: "base32hex", alphabet: "0123456789abcdefghijklmnopqrstuv", bitsPerChar: 5 }), wu = ue({ prefix: "V", name: "base32hexupper", alphabet: "0123456789ABCDEFGHIJKLMNOPQRSTUV", bitsPerChar: 5 }), bu = ue({ prefix: "t", name: "base32hexpad", alphabet: "0123456789abcdefghijklmnopqrstuv=", bitsPerChar: 5 }), vu = ue({ prefix: "T", name: "base32hexpadupper", alphabet: "0123456789ABCDEFGHIJKLMNOPQRSTUV=", bitsPerChar: 5 }), _u = ue({ prefix: "h", name: "base32z", alphabet: "ybndrfg8ejkmcpqxot1uwisza345h769", bitsPerChar: 5 });
var Eu = Object.freeze({ __proto__: null, base32: du, base32upper: gu, base32pad: yu, base32padupper: fu, base32hex: mu, base32hexupper: wu, base32hexpad: bu, base32hexpadupper: vu, base32z: _u });
const Iu = At({ prefix: "k", name: "base36", alphabet: "0123456789abcdefghijklmnopqrstuvwxyz" }), xu = At({ prefix: "K", name: "base36upper", alphabet: "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ" });
var Su = Object.freeze({ __proto__: null, base36: Iu, base36upper: xu });
const Fu = At({ name: "base58btc", prefix: "z", alphabet: "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz" }), Pu = At({ name: "base58flickr", prefix: "Z", alphabet: "123456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ" });
var Ru = Object.freeze({ __proto__: null, base58btc: Fu, base58flickr: Pu });
const Au = ue({ prefix: "m", name: "base64", alphabet: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/", bitsPerChar: 6 }), $u = ue({ prefix: "M", name: "base64pad", alphabet: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=", bitsPerChar: 6 }), Tu = ue({ prefix: "u", name: "base64url", alphabet: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_", bitsPerChar: 6 }), Ou = ue({ prefix: "U", name: "base64urlpad", alphabet: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_=", bitsPerChar: 6 });
var qu = Object.freeze({ __proto__: null, base64: Au, base64pad: $u, base64url: Tu, base64urlpad: Ou });
const un = Array.from("🚀🪐☄🛰🌌🌑🌒🌓🌔🌕🌖🌗🌘🌍🌏🌎🐉☀💻🖥💾💿😂❤😍🤣😊🙏💕😭😘👍😅👏😁🔥🥰💔💖💙😢🤔😆🙄💪😉☺👌🤗💜😔😎😇🌹🤦🎉💞✌✨🤷😱😌🌸🙌😋💗💚😏💛🙂💓🤩😄😀🖤😃💯🙈👇🎶😒🤭❣😜💋👀😪😑💥🙋😞😩😡🤪👊🥳😥🤤👉💃😳✋😚😝😴🌟😬🙃🍀🌷😻😓⭐✅🥺🌈😈🤘💦✔😣🏃💐☹🎊💘😠☝😕🌺🎂🌻😐🖕💝🙊😹🗣💫💀👑🎵🤞😛🔴😤🌼😫⚽🤙☕🏆🤫👈😮🙆🍻🍃🐶💁😲🌿🧡🎁⚡🌞🎈❌✊👋😰🤨😶🤝🚶💰🍓💢🤟🙁🚨💨🤬✈🎀🍺🤓😙💟🌱😖👶🥴▶➡❓💎💸⬇😨🌚🦋😷🕺⚠🙅😟😵👎🤲🤠🤧📌🔵💅🧐🐾🍒😗🤑🌊🤯🐷☎💧😯💆👆🎤🙇🍑❄🌴💣🐸💌📍🥀🤢👅💡💩👐📸👻🤐🤮🎼🥵🚩🍎🍊👼💍📣🥂"), Cu = un.reduce((r, e, t) => (r[t] = e, r), []), Nu = un.reduce((r, e, t) => (r[e.codePointAt(0)] = t, r), []);
function Du(r) {
  return r.reduce((e, t) => (e += Cu[t], e), "");
}
function ku(r) {
  const e = [];
  for (const t of r) {
    const s = Nu[t.codePointAt(0)];
    if (s === void 0) throw new Error(`Non-base256emoji character: ${t}`);
    e.push(s);
  }
  return new Uint8Array(e);
}
const Mu = Jt({ prefix: "🚀", name: "base256emoji", encode: Du, decode: ku });
var Lu = Object.freeze({ __proto__: null, base256emoji: Mu }), Bu = pn, Qi = 128, Uu = -128, ju = Math.pow(2, 31);
function pn(r, e, t) {
  e = e || [], t = t || 0;
  for (var s = t; r >= ju; ) e[t++] = r & 255 | Qi, r /= 128;
  for (; r & Uu; ) e[t++] = r & 255 | Qi, r >>>= 7;
  return e[t] = r | 0, pn.bytes = t - s + 1, e;
}
var zu = Fs, Vu = 128, Zi = 127;
function Fs(r, s) {
  var t = 0, s = s || 0, i = 0, n = s, o, a = r.length;
  do {
    if (n >= a) throw Fs.bytes = 0, new RangeError("Could not decode varint");
    o = r[n++], t += i < 28 ? (o & Zi) << i : (o & Zi) * Math.pow(2, i), i += 7;
  } while (o >= Vu);
  return Fs.bytes = n - s, t;
}
var Ku = Math.pow(2, 7), Hu = Math.pow(2, 14), Gu = Math.pow(2, 21), Wu = Math.pow(2, 28), Ju = Math.pow(2, 35), Yu = Math.pow(2, 42), Qu = Math.pow(2, 49), Zu = Math.pow(2, 56), Xu = Math.pow(2, 63), ep = function(r) {
  return r < Ku ? 1 : r < Hu ? 2 : r < Gu ? 3 : r < Wu ? 4 : r < Ju ? 5 : r < Yu ? 6 : r < Qu ? 7 : r < Zu ? 8 : r < Xu ? 9 : 10;
}, tp = { encode: Bu, decode: zu, encodingLength: ep }, dn = tp;
const Xi = (r, e, t = 0) => (dn.encode(r, e, t), e), er = (r) => dn.encodingLength(r), Ps = (r, e) => {
  const t = e.byteLength, s = er(r), i = s + er(t), n = new Uint8Array(i + t);
  return Xi(r, n, 0), Xi(t, n, s), n.set(e, i), new sp(r, t, e, n);
};
class sp {
  constructor(e, t, s, i) {
    this.code = e, this.size = t, this.digest = s, this.bytes = i;
  }
}
const gn = ({ name: r, code: e, encode: t }) => new ip(r, e, t);
class ip {
  constructor(e, t, s) {
    this.name = e, this.code = t, this.encode = s;
  }
  digest(e) {
    if (e instanceof Uint8Array) {
      const t = this.encode(e);
      return t instanceof Uint8Array ? Ps(this.code, t) : t.then((s) => Ps(this.code, s));
    } else throw Error("Unknown type, must be binary type");
  }
}
const yn = (r) => async (e) => new Uint8Array(await crypto.subtle.digest(r, e)), rp = gn({ name: "sha2-256", code: 18, encode: yn("SHA-256") }), np = gn({ name: "sha2-512", code: 19, encode: yn("SHA-512") });
var op = Object.freeze({ __proto__: null, sha256: rp, sha512: np });
const fn = 0, ap = "identity", mn = hn, cp = (r) => Ps(fn, mn(r)), hp = { code: fn, name: ap, encode: mn, digest: cp };
var lp = Object.freeze({ __proto__: null, identity: hp });
new TextEncoder(), new TextDecoder();
const tr = { ...iu, ...nu, ...au, ...hu, ...pu, ...Eu, ...Su, ...Ru, ...qu, ...Lu };
({ ...op, ...lp });
function wn(r) {
  return globalThis.Buffer != null ? new Uint8Array(r.buffer, r.byteOffset, r.byteLength) : r;
}
function up(r = 0) {
  return globalThis.Buffer != null && globalThis.Buffer.allocUnsafe != null ? wn(globalThis.Buffer.allocUnsafe(r)) : new Uint8Array(r);
}
function bn(r, e, t, s) {
  return { name: r, prefix: e, encoder: { name: r, prefix: e, encode: t }, decoder: { decode: s } };
}
const sr = bn("utf8", "u", (r) => "u" + new TextDecoder("utf8").decode(r), (r) => new TextEncoder().encode(r.substring(1))), ls = bn("ascii", "a", (r) => {
  let e = "a";
  for (let t = 0; t < r.length; t++) e += String.fromCharCode(r[t]);
  return e;
}, (r) => {
  r = r.substring(1);
  const e = up(r.length);
  for (let t = 0; t < r.length; t++) e[t] = r.charCodeAt(t);
  return e;
}), pp = { utf8: sr, "utf-8": sr, hex: tr.base16, latin1: ls, ascii: ls, binary: ls, ...tr };
function dp(r, e = "utf8") {
  const t = pp[e];
  if (!t) throw new Error(`Unsupported encoding "${e}"`);
  return (e === "utf8" || e === "utf-8") && globalThis.Buffer != null && globalThis.Buffer.from != null ? wn(globalThis.Buffer.from(r, "utf-8")) : t.decoder.decode(`${t.prefix}${r}`);
}
var gp = Object.defineProperty, yp = (r, e, t) => e in r ? gp(r, e, { enumerable: !0, configurable: !0, writable: !0, value: t }) : r[e] = t, Me = (r, e, t) => yp(r, typeof e != "symbol" ? e + "" : e, t);
class fp {
  constructor(e, t) {
    this.core = e, this.logger = t, Me(this, "keychain", /* @__PURE__ */ new Map()), Me(this, "name", yl), Me(this, "version", fl), Me(this, "initialized", !1), Me(this, "storagePrefix", Ve), Me(this, "init", async () => {
      if (!this.initialized) {
        const s = await this.getKeyChain();
        typeof s < "u" && (this.keychain = s), this.initialized = !0;
      }
    }), Me(this, "has", (s) => (this.isInitialized(), this.keychain.has(s))), Me(this, "set", async (s, i) => {
      this.isInitialized(), this.keychain.set(s, i), await this.persist();
    }), Me(this, "get", (s) => {
      this.isInitialized();
      const i = this.keychain.get(s);
      if (typeof i > "u") {
        const { message: n } = I("NO_MATCHING_KEY", `${this.name}: ${s}`);
        throw new Error(n);
      }
      return i;
    }), Me(this, "del", async (s) => {
      this.isInitialized(), this.keychain.delete(s), await this.persist();
    }), this.core = e, this.logger = Ie(t, this.name);
  }
  get context() {
    return xe(this.logger);
  }
  get storageKey() {
    return this.storagePrefix + this.version + this.core.customStoragePrefix + "//" + this.name;
  }
  async setKeyChain(e) {
    await this.core.storage.setItem(this.storageKey, ms(e));
  }
  async getKeyChain() {
    const e = await this.core.storage.getItem(this.storageKey);
    return typeof e < "u" ? ws(e) : void 0;
  }
  async persist() {
    await this.setKeyChain(this.keychain);
  }
  isInitialized() {
    if (!this.initialized) {
      const { message: e } = I("NOT_INITIALIZED", this.name);
      throw new Error(e);
    }
  }
}
var mp = Object.defineProperty, wp = (r, e, t) => e in r ? mp(r, e, { enumerable: !0, configurable: !0, writable: !0, value: t }) : r[e] = t, se = (r, e, t) => wp(r, typeof e != "symbol" ? e + "" : e, t);
class bp {
  constructor(e, t, s) {
    this.core = e, this.logger = t, se(this, "name", dl), se(this, "keychain"), se(this, "randomSessionIdentifier", fs()), se(this, "initialized", !1), se(this, "clientId"), se(this, "init", async () => {
      this.initialized || (await this.keychain.init(), this.initialized = !0);
    }), se(this, "hasKeys", (i) => (this.isInitialized(), this.keychain.has(i))), se(this, "getClientId", async () => {
      if (this.isInitialized(), this.clientId) return this.clientId;
      const i = await this.getClientSeed(), n = Vi(i), o = Xr(n.publicKey);
      return this.clientId = o, o;
    }), se(this, "generateKeyPair", () => {
      this.isInitialized();
      const i = to();
      return this.setPrivateKey(i.publicKey, i.privateKey);
    }), se(this, "signJWT", async (i) => {
      this.isInitialized();
      const n = await this.getClientSeed(), o = Vi(n), a = this.randomSessionIdentifier;
      return await zh(a, i, gl, o);
    }), se(this, "generateSharedKey", (i, n, o) => {
      this.isInitialized();
      const a = this.getPrivateKey(i), c = so(a, n);
      return this.setSymKey(c, o);
    }), se(this, "setSymKey", async (i, n) => {
      this.isInitialized();
      const o = n || Nt(i);
      return await this.keychain.set(o, i), o;
    }), se(this, "deleteKeyPair", async (i) => {
      this.isInitialized(), await this.keychain.del(i);
    }), se(this, "deleteSymKey", async (i) => {
      this.isInitialized(), await this.keychain.del(i);
    }), se(this, "encode", async (i, n, o) => {
      this.isInitialized();
      const a = io(o), c = Ds(n);
      if (oi(a)) return ro(c, o?.encoding);
      if (ai(a)) {
        const d = a.senderPublicKey, g = a.receiverPublicKey;
        i = await this.generateSharedKey(d, g);
      }
      const h = this.getSymKey(i), { type: l, senderPublicKey: p } = a;
      return no({ type: l, symKey: h, message: c, senderPublicKey: p, encoding: o?.encoding });
    }), se(this, "decode", async (i, n, o) => {
      this.isInitialized();
      const a = oo(n, o);
      if (oi(a)) {
        const c = ao(n, o?.encoding);
        return Bt(c);
      }
      if (ai(a)) {
        const c = a.receiverPublicKey, h = a.senderPublicKey;
        i = await this.generateSharedKey(c, h);
      }
      try {
        const c = this.getSymKey(i), h = co({ symKey: c, encoded: n, encoding: o?.encoding });
        return Bt(h);
      } catch (c) {
        this.logger.error(`Failed to decode message from topic: '${i}', clientId: '${await this.getClientId()}'`), this.logger.error(c);
      }
    }), se(this, "getPayloadType", (i, n = We) => {
      const o = ci({ encoded: i, encoding: n });
      return ho(o.type);
    }), se(this, "getPayloadSenderPublicKey", (i, n = We) => {
      const o = ci({ encoded: i, encoding: n });
      return o.senderPublicKey ? Xo(o.senderPublicKey, lo) : void 0;
    }), this.core = e, this.logger = Ie(t, this.name), this.keychain = s || new fp(this.core, this.logger);
  }
  get context() {
    return xe(this.logger);
  }
  async setPrivateKey(e, t) {
    return await this.keychain.set(e, t), e;
  }
  getPrivateKey(e) {
    return this.keychain.get(e);
  }
  async getClientSeed() {
    let e = "";
    try {
      e = this.keychain.get(Ji);
    } catch {
      e = fs(), await this.keychain.set(Ji, e);
    }
    return dp(e, "base16");
  }
  getSymKey(e) {
    return this.keychain.get(e);
  }
  isInitialized() {
    if (!this.initialized) {
      const { message: e } = I("NOT_INITIALIZED", this.name);
      throw new Error(e);
    }
  }
}
var vp = Object.defineProperty, _p = Object.defineProperties, Ep = Object.getOwnPropertyDescriptors, ir = Object.getOwnPropertySymbols, Ip = Object.prototype.hasOwnProperty, xp = Object.prototype.propertyIsEnumerable, Rs = (r, e, t) => e in r ? vp(r, e, { enumerable: !0, configurable: !0, writable: !0, value: t }) : r[e] = t, Sp = (r, e) => {
  for (var t in e || (e = {})) Ip.call(e, t) && Rs(r, t, e[t]);
  if (ir) for (var t of ir(e)) xp.call(e, t) && Rs(r, t, e[t]);
  return r;
}, Fp = (r, e) => _p(r, Ep(e)), _e = (r, e, t) => Rs(r, typeof e != "symbol" ? e + "" : e, t);
class Pp extends Qn {
  constructor(e, t) {
    super(e, t), this.logger = e, this.core = t, _e(this, "messages", /* @__PURE__ */ new Map()), _e(this, "messagesWithoutClientAck", /* @__PURE__ */ new Map()), _e(this, "name", ml), _e(this, "version", wl), _e(this, "initialized", !1), _e(this, "storagePrefix", Ve), _e(this, "init", async () => {
      if (!this.initialized) {
        this.logger.trace("Initialized");
        try {
          const s = await this.getRelayerMessages();
          typeof s < "u" && (this.messages = s);
          const i = await this.getRelayerMessagesWithoutClientAck();
          typeof i < "u" && (this.messagesWithoutClientAck = i), this.logger.debug(`Successfully Restored records for ${this.name}`), this.logger.trace({ type: "method", method: "restore", size: this.messages.size });
        } catch (s) {
          this.logger.debug(`Failed to Restore records for ${this.name}`), this.logger.error(s);
        } finally {
          this.initialized = !0;
        }
      }
    }), _e(this, "set", async (s, i, n) => {
      this.isInitialized();
      const o = Ae(i);
      let a = this.messages.get(s);
      if (typeof a > "u" && (a = {}), typeof a[o] < "u") return o;
      if (a[o] = i, this.messages.set(s, a), n === Mt.inbound) {
        const c = this.messagesWithoutClientAck.get(s) || {};
        this.messagesWithoutClientAck.set(s, Fp(Sp({}, c), { [o]: i }));
      }
      return await this.persist(), o;
    }), _e(this, "get", (s) => {
      this.isInitialized();
      let i = this.messages.get(s);
      return typeof i > "u" && (i = {}), i;
    }), _e(this, "getWithoutAck", (s) => {
      this.isInitialized();
      const i = {};
      for (const n of s) {
        const o = this.messagesWithoutClientAck.get(n) || {};
        i[n] = Object.values(o);
      }
      return i;
    }), _e(this, "has", (s, i) => {
      this.isInitialized();
      const n = this.get(s), o = Ae(i);
      return typeof n[o] < "u";
    }), _e(this, "ack", async (s, i) => {
      this.isInitialized();
      const n = this.messagesWithoutClientAck.get(s);
      if (typeof n > "u") return;
      const o = Ae(i);
      delete n[o], Object.keys(n).length === 0 ? this.messagesWithoutClientAck.delete(s) : this.messagesWithoutClientAck.set(s, n), await this.persist();
    }), _e(this, "del", async (s) => {
      this.isInitialized(), this.messages.delete(s), this.messagesWithoutClientAck.delete(s), await this.persist();
    }), this.logger = Ie(e, this.name), this.core = t;
  }
  get context() {
    return xe(this.logger);
  }
  get storageKey() {
    return this.storagePrefix + this.version + this.core.customStoragePrefix + "//" + this.name;
  }
  get storageKeyWithoutClientAck() {
    return this.storagePrefix + this.version + this.core.customStoragePrefix + "//" + this.name + "_withoutClientAck";
  }
  async setRelayerMessages(e) {
    await this.core.storage.setItem(this.storageKey, ms(e));
  }
  async setRelayerMessagesWithoutClientAck(e) {
    await this.core.storage.setItem(this.storageKeyWithoutClientAck, ms(e));
  }
  async getRelayerMessages() {
    const e = await this.core.storage.getItem(this.storageKey);
    return typeof e < "u" ? ws(e) : void 0;
  }
  async getRelayerMessagesWithoutClientAck() {
    const e = await this.core.storage.getItem(this.storageKeyWithoutClientAck);
    return typeof e < "u" ? ws(e) : void 0;
  }
  async persist() {
    await this.setRelayerMessages(this.messages), await this.setRelayerMessagesWithoutClientAck(this.messagesWithoutClientAck);
  }
  isInitialized() {
    if (!this.initialized) {
      const { message: e } = I("NOT_INITIALIZED", this.name);
      throw new Error(e);
    }
  }
}
var Rp = Object.defineProperty, Ap = Object.defineProperties, $p = Object.getOwnPropertyDescriptors, rr = Object.getOwnPropertySymbols, Tp = Object.prototype.hasOwnProperty, Op = Object.prototype.propertyIsEnumerable, As = (r, e, t) => e in r ? Rp(r, e, { enumerable: !0, configurable: !0, writable: !0, value: t }) : r[e] = t, ut = (r, e) => {
  for (var t in e || (e = {})) Tp.call(e, t) && As(r, t, e[t]);
  if (rr) for (var t of rr(e)) Op.call(e, t) && As(r, t, e[t]);
  return r;
}, nr = (r, e) => Ap(r, $p(e)), Pe = (r, e, t) => As(r, typeof e != "symbol" ? e + "" : e, t);
class qp extends eo {
  constructor(e, t) {
    super(e, t), this.relayer = e, this.logger = t, Pe(this, "events", new Ye.EventEmitter()), Pe(this, "name", vl), Pe(this, "queue", /* @__PURE__ */ new Map()), Pe(this, "publishTimeout", E.toMiliseconds(E.ONE_MINUTE)), Pe(this, "initialPublishTimeout", E.toMiliseconds(E.ONE_SECOND * 15)), Pe(this, "needsTransportRestart", !1), Pe(this, "publish", async (s, i, n) => {
      var o, a, c, h, l;
      this.logger.debug("Publishing Payload"), this.logger.trace({ type: "method", method: "publish", params: { topic: s, message: i, opts: n } });
      const p = n?.ttl || bl, d = n?.prompt || !1, g = n?.tag || 0, u = n?.id || tt().toString(), y = gt(Ut().protocol), w = { id: u, method: n?.publishMethod || y.publish, params: ut({ topic: s, message: i, ttl: p, prompt: d, tag: g, attestation: n?.attestation }, n?.tvf) }, _ = `Failed to publish payload, please try again. id:${u} tag:${g}`;
      try {
        Te((o = w.params) == null ? void 0 : o.prompt) && ((a = w.params) == null || delete a.prompt), Te((c = w.params) == null ? void 0 : c.tag) && ((h = w.params) == null || delete h.tag);
        const v = new Promise(async (f) => {
          const x = ({ id: S }) => {
            var q;
            ((q = w.id) == null ? void 0 : q.toString()) === S.toString() && (this.removeRequestFromQueue(S), this.relayer.events.removeListener(Z.publish, x), f());
          };
          this.relayer.events.on(Z.publish, x);
          const R = ze(new Promise((S, q) => {
            this.rpcPublish(w, n).then(S).catch((O) => {
              this.logger.warn(O, O?.message), q(O);
            });
          }), this.initialPublishTimeout, `Failed initial publish, retrying.... id:${u} tag:${g}`);
          try {
            await R, this.events.removeListener(Z.publish, x);
          } catch (S) {
            this.queue.set(u, { request: w, opts: n, attempt: 1 }), this.logger.warn(S, S?.message);
          }
        });
        this.logger.trace({ type: "method", method: "publish", params: { id: u, topic: s, message: i, opts: n } }), await ze(v, this.publishTimeout, _);
      } catch (v) {
        if (this.logger.debug("Failed to Publish Payload"), this.logger.error(v), (l = n?.internal) != null && l.throwOnFailedPublish) throw v;
      } finally {
        this.queue.delete(u);
      }
    }), Pe(this, "publishCustom", async (s) => {
      var i, n, o, a, c;
      this.logger.debug("Publishing custom payload"), this.logger.trace({ type: "method", method: "publishCustom", params: s });
      const { payload: h, opts: l = {} } = s, { attestation: p, tvf: d, publishMethod: g, prompt: u, tag: y, ttl: w = E.FIVE_MINUTES } = l, _ = l.id || tt().toString(), v = gt(Ut().protocol), f = g || v.publish, x = { id: _, method: f, params: ut(nr(ut({}, h), { ttl: w, prompt: u, tag: y, attestation: p }), d) }, R = `Failed to publish custom payload, please try again. id:${_} tag:${y}`;
      try {
        Te((i = x.params) == null ? void 0 : i.prompt) && ((n = x.params) == null || delete n.prompt), Te((o = x.params) == null ? void 0 : o.tag) && ((a = x.params) == null || delete a.tag);
        const S = new Promise(async (q) => {
          const O = ({ id: M }) => {
            var ne;
            ((ne = x.id) == null ? void 0 : ne.toString()) === M.toString() && (this.removeRequestFromQueue(M), this.relayer.events.removeListener(Z.publish, O), q());
          };
          this.relayer.events.on(Z.publish, O);
          const P = ze(new Promise((M, ne) => {
            this.rpcPublish(x, l).then(M).catch((pe) => {
              this.logger.warn(pe, pe?.message), ne(pe);
            });
          }), this.initialPublishTimeout, `Failed initial custom payload publish, retrying.... method:${f} id:${_} tag:${y}`);
          try {
            await P, this.events.removeListener(Z.publish, O);
          } catch (M) {
            this.queue.set(_, { request: x, opts: l, attempt: 1 }), this.logger.warn(M, M?.message);
          }
        });
        this.logger.trace({ type: "method", method: "publish", params: { id: _, payload: h, opts: l } }), await ze(S, this.publishTimeout, R);
      } catch (S) {
        if (this.logger.debug("Failed to Publish Payload"), this.logger.error(S), (c = l?.internal) != null && c.throwOnFailedPublish) throw S;
      } finally {
        this.queue.delete(_);
      }
    }), Pe(this, "on", (s, i) => {
      this.events.on(s, i);
    }), Pe(this, "once", (s, i) => {
      this.events.once(s, i);
    }), Pe(this, "off", (s, i) => {
      this.events.off(s, i);
    }), Pe(this, "removeListener", (s, i) => {
      this.events.removeListener(s, i);
    }), this.relayer = e, this.logger = Ie(t, this.name), this.registerEventListeners();
  }
  get context() {
    return xe(this.logger);
  }
  async rpcPublish(e, t) {
    this.logger.debug("Outgoing Relay Payload"), this.logger.trace({ type: "message", direction: "outgoing", request: e });
    const s = await this.relayer.request(e);
    return this.relayer.events.emit(Z.publish, ut(ut({}, e), t)), this.logger.debug("Successfully Published Payload"), s;
  }
  removeRequestFromQueue(e) {
    this.queue.delete(e);
  }
  checkQueue() {
    this.queue.forEach(async (e, t) => {
      var s;
      const i = e.attempt + 1;
      this.queue.set(t, nr(ut({}, e), { attempt: i })), this.logger.warn({}, `Publisher: queue->publishing: ${e.request.id}, tag: ${(s = e.request.params) == null ? void 0 : s.tag}, attempt: ${i}`), await this.rpcPublish(e.request, e.opts), this.logger.warn({}, `Publisher: queue->published: ${e.request.id}`);
    });
  }
  registerEventListeners() {
    this.relayer.core.heartbeat.on(yt.pulse, () => {
      if (this.needsTransportRestart) {
        this.needsTransportRestart = !1, this.relayer.events.emit(Z.connection_stalled);
        return;
      }
      this.checkQueue();
    }), this.relayer.on(Z.message_ack, (e) => {
      this.removeRequestFromQueue(e.id.toString());
    });
  }
}
var Cp = Object.defineProperty, Np = (r, e, t) => e in r ? Cp(r, e, { enumerable: !0, configurable: !0, writable: !0, value: t }) : r[e] = t, pt = (r, e, t) => Np(r, typeof e != "symbol" ? e + "" : e, t);
class Dp {
  constructor() {
    pt(this, "map", /* @__PURE__ */ new Map()), pt(this, "set", (e, t) => {
      const s = this.get(e);
      this.exists(e, t) || this.map.set(e, [...s, t]);
    }), pt(this, "get", (e) => this.map.get(e) || []), pt(this, "exists", (e, t) => this.get(e).includes(t)), pt(this, "delete", (e, t) => {
      if (typeof t > "u") {
        this.map.delete(e);
        return;
      }
      if (!this.map.has(e)) return;
      const s = this.get(e);
      if (!this.exists(e, t)) return;
      const i = s.filter((n) => n !== t);
      if (!i.length) {
        this.map.delete(e);
        return;
      }
      this.map.set(e, i);
    }), pt(this, "clear", () => {
      this.map.clear();
    });
  }
  get topics() {
    return Array.from(this.map.keys());
  }
}
var kp = Object.defineProperty, Mp = Object.defineProperties, Lp = Object.getOwnPropertyDescriptors, or = Object.getOwnPropertySymbols, Bp = Object.prototype.hasOwnProperty, Up = Object.prototype.propertyIsEnumerable, $s = (r, e, t) => e in r ? kp(r, e, { enumerable: !0, configurable: !0, writable: !0, value: t }) : r[e] = t, Et = (r, e) => {
  for (var t in e || (e = {})) Bp.call(e, t) && $s(r, t, e[t]);
  if (or) for (var t of or(e)) Up.call(e, t) && $s(r, t, e[t]);
  return r;
}, us = (r, e) => Mp(r, Lp(e)), K = (r, e, t) => $s(r, typeof e != "symbol" ? e + "" : e, t);
class jp extends Zn {
  constructor(e, t) {
    super(e, t), this.relayer = e, this.logger = t, K(this, "subscriptions", /* @__PURE__ */ new Map()), K(this, "topicMap", new Dp()), K(this, "events", new Ye.EventEmitter()), K(this, "name", Pl), K(this, "version", Rl), K(this, "pending", /* @__PURE__ */ new Map()), K(this, "cached", []), K(this, "initialized", !1), K(this, "storagePrefix", Ve), K(this, "subscribeTimeout", E.toMiliseconds(E.ONE_MINUTE)), K(this, "initialSubscribeTimeout", E.toMiliseconds(E.ONE_SECOND * 15)), K(this, "clientId"), K(this, "batchSubscribeTopicsLimit", 500), K(this, "init", async () => {
      this.initialized || (this.logger.trace("Initialized"), this.registerEventListeners(), await this.restore()), this.initialized = !0;
    }), K(this, "subscribe", async (s, i) => {
      var n;
      this.isInitialized(), this.logger.debug("Subscribing Topic"), this.logger.trace({ type: "method", method: "subscribe", params: { topic: s, opts: i } });
      try {
        const o = Ut(i), a = { topic: s, relay: o, transportType: i?.transportType };
        (n = i?.internal) != null && n.skipSubscribe || this.pending.set(s, a);
        const c = await this.rpcSubscribe(s, o, i);
        return typeof c == "string" && (this.onSubscribe(c, a), this.logger.debug("Successfully Subscribed Topic"), this.logger.trace({ type: "method", method: "subscribe", params: { topic: s, opts: i } })), c;
      } catch (o) {
        throw this.logger.debug("Failed to Subscribe Topic"), this.logger.error(o), o;
      }
    }), K(this, "unsubscribe", async (s, i) => {
      this.isInitialized(), typeof i?.id < "u" ? await this.unsubscribeById(s, i.id, i) : await this.unsubscribeByTopic(s, i);
    }), K(this, "isSubscribed", (s) => new Promise((i) => {
      i(this.topicMap.topics.includes(s));
    })), K(this, "isKnownTopic", (s) => new Promise((i) => {
      i(this.topicMap.topics.includes(s) || this.pending.has(s) || this.cached.some((n) => n.topic === s));
    })), K(this, "on", (s, i) => {
      this.events.on(s, i);
    }), K(this, "once", (s, i) => {
      this.events.once(s, i);
    }), K(this, "off", (s, i) => {
      this.events.off(s, i);
    }), K(this, "removeListener", (s, i) => {
      this.events.removeListener(s, i);
    }), K(this, "start", async () => {
      await this.onConnect();
    }), K(this, "stop", async () => {
      await this.onDisconnect();
    }), K(this, "restart", async () => {
      await this.restore(), await this.onRestart();
    }), K(this, "checkPending", async () => {
      if (this.pending.size === 0 && (!this.initialized || !this.relayer.connected)) return;
      const s = [];
      this.pending.forEach((i) => {
        s.push(i);
      }), await this.batchSubscribe(s);
    }), K(this, "registerEventListeners", () => {
      this.relayer.core.heartbeat.on(yt.pulse, async () => {
        await this.checkPending();
      }), this.events.on(Ee.created, async (s) => {
        const i = Ee.created;
        this.logger.info(`Emitting ${i}`), this.logger.debug({ type: "event", event: i, data: s }), await this.persist();
      }), this.events.on(Ee.deleted, async (s) => {
        const i = Ee.deleted;
        this.logger.info(`Emitting ${i}`), this.logger.debug({ type: "event", event: i, data: s }), await this.persist();
      });
    }), this.relayer = e, this.logger = Ie(t, this.name), this.clientId = "";
  }
  get context() {
    return xe(this.logger);
  }
  get storageKey() {
    return this.storagePrefix + this.version + this.relayer.core.customStoragePrefix + "//" + this.name;
  }
  get length() {
    return this.subscriptions.size;
  }
  get ids() {
    return Array.from(this.subscriptions.keys());
  }
  get values() {
    return Array.from(this.subscriptions.values());
  }
  get topics() {
    return this.topicMap.topics;
  }
  get hasAnyTopics() {
    return this.topicMap.topics.length > 0 || this.pending.size > 0 || this.cached.length > 0 || this.subscriptions.size > 0;
  }
  hasSubscription(e, t) {
    let s = !1;
    try {
      s = this.getSubscription(e).topic === t;
    } catch {
    }
    return s;
  }
  reset() {
    this.cached = [], this.initialized = !0;
  }
  onDisable() {
    this.values.length > 0 && (this.cached = this.values), this.subscriptions.clear(), this.topicMap.clear();
  }
  async unsubscribeByTopic(e, t) {
    const s = this.topicMap.get(e);
    await Promise.all(s.map(async (i) => await this.unsubscribeById(e, i, t)));
  }
  async unsubscribeById(e, t, s) {
    this.logger.debug("Unsubscribing Topic"), this.logger.trace({ type: "method", method: "unsubscribe", params: { topic: e, id: t, opts: s } });
    try {
      const i = Ut(s);
      await this.restartToComplete({ topic: e, id: t, relay: i }), await this.rpcUnsubscribe(e, t, i);
      const n = ge("USER_DISCONNECTED", `${this.name}, ${e}`);
      await this.onUnsubscribe(e, t, n), this.logger.debug("Successfully Unsubscribed Topic"), this.logger.trace({ type: "method", method: "unsubscribe", params: { topic: e, id: t, opts: s } });
    } catch (i) {
      throw this.logger.debug("Failed to Unsubscribe Topic"), this.logger.error(i), i;
    }
  }
  async rpcSubscribe(e, t, s) {
    var i, n;
    const o = await this.getSubscriptionId(e);
    if ((i = s?.internal) != null && i.skipSubscribe) return o;
    (!s || s?.transportType === W.relay) && await this.restartToComplete({ topic: e, id: e, relay: t });
    const a = { method: gt(t.protocol).subscribe, params: { topic: e } };
    this.logger.debug("Outgoing Relay Payload"), this.logger.trace({ type: "payload", direction: "outgoing", request: a });
    const c = (n = s?.internal) == null ? void 0 : n.throwOnFailedPublish;
    try {
      if (s?.transportType === W.link_mode) return setTimeout(() => {
        (this.relayer.connected || this.relayer.connecting) && this.relayer.request(a).catch((p) => this.logger.warn(p));
      }, E.toMiliseconds(E.ONE_SECOND)), o;
      const h = new Promise(async (p) => {
        const d = (g) => {
          g.topic === e && (this.events.removeListener(Ee.created, d), p(g.id));
        };
        this.events.on(Ee.created, d);
        try {
          const g = await ze(new Promise((u, y) => {
            this.relayer.request(a).catch((w) => {
              this.logger.warn(w, w?.message), y(w);
            }).then(u);
          }), this.initialSubscribeTimeout, `Subscribing to ${e} failed, please try again`);
          this.events.removeListener(Ee.created, d), p(g);
        } catch {
        }
      }), l = await ze(h, this.subscribeTimeout, `Subscribing to ${e} failed, please try again`);
      if (!l && c) throw new Error(`Subscribing to ${e} failed, please try again`);
      return l ? o : null;
    } catch (h) {
      if (this.logger.debug("Outgoing Relay Subscribe Payload stalled"), this.relayer.events.emit(Z.connection_stalled), c) throw h;
    }
    return null;
  }
  async rpcBatchSubscribe(e) {
    if (!e.length) return;
    const t = e[0].relay, s = { method: gt(t.protocol).batchSubscribe, params: { topics: e.map((i) => i.topic) } };
    this.logger.debug("Outgoing Relay Payload"), this.logger.trace({ type: "payload", direction: "outgoing", request: s });
    try {
      await await ze(new Promise((i) => {
        this.relayer.request(s).catch((n) => this.logger.warn(n)).then(i);
      }), this.subscribeTimeout, "rpcBatchSubscribe failed, please try again");
    } catch {
      this.relayer.events.emit(Z.connection_stalled);
    }
  }
  async rpcBatchFetchMessages(e) {
    if (!e.length) return;
    const t = e[0].relay, s = { method: gt(t.protocol).batchFetchMessages, params: { topics: e.map((n) => n.topic) } };
    this.logger.debug("Outgoing Relay Payload"), this.logger.trace({ type: "payload", direction: "outgoing", request: s });
    let i;
    try {
      i = await await ze(new Promise((n, o) => {
        this.relayer.request(s).catch((a) => {
          this.logger.warn(a), o(a);
        }).then(n);
      }), this.subscribeTimeout, "rpcBatchFetchMessages failed, please try again");
    } catch {
      this.relayer.events.emit(Z.connection_stalled);
    }
    return i;
  }
  rpcUnsubscribe(e, t, s) {
    const i = { method: gt(s.protocol).unsubscribe, params: { topic: e, id: t } };
    return this.logger.debug("Outgoing Relay Payload"), this.logger.trace({ type: "payload", direction: "outgoing", request: i }), this.relayer.request(i);
  }
  onSubscribe(e, t) {
    this.setSubscription(e, us(Et({}, t), { id: e })), this.pending.delete(t.topic);
  }
  onBatchSubscribe(e) {
    e.length && e.forEach((t) => {
      this.setSubscription(t.id, Et({}, t)), this.pending.delete(t.topic);
    });
  }
  async onUnsubscribe(e, t, s) {
    this.events.removeAllListeners(t), this.hasSubscription(t, e) && this.deleteSubscription(t, s), await this.relayer.messages.del(e);
  }
  async setRelayerSubscriptions(e) {
    await this.relayer.core.storage.setItem(this.storageKey, e);
  }
  async getRelayerSubscriptions() {
    return await this.relayer.core.storage.getItem(this.storageKey);
  }
  setSubscription(e, t) {
    this.logger.debug("Setting subscription"), this.logger.trace({ type: "method", method: "setSubscription", id: e, subscription: t }), this.addSubscription(e, t);
  }
  addSubscription(e, t) {
    this.subscriptions.set(e, Et({}, t)), this.topicMap.set(t.topic, e), this.events.emit(Ee.created, t);
  }
  getSubscription(e) {
    this.logger.debug("Getting subscription"), this.logger.trace({ type: "method", method: "getSubscription", id: e });
    const t = this.subscriptions.get(e);
    if (!t) {
      const { message: s } = I("NO_MATCHING_KEY", `${this.name}: ${e}`);
      throw new Error(s);
    }
    return t;
  }
  deleteSubscription(e, t) {
    this.logger.debug("Deleting subscription"), this.logger.trace({ type: "method", method: "deleteSubscription", id: e, reason: t });
    const s = this.getSubscription(e);
    this.subscriptions.delete(e), this.topicMap.delete(s.topic, e), this.events.emit(Ee.deleted, us(Et({}, s), { reason: t }));
  }
  async persist() {
    await this.setRelayerSubscriptions(this.values), this.events.emit(Ee.sync);
  }
  async onRestart() {
    if (this.cached.length) {
      const e = [...this.cached], t = Math.ceil(this.cached.length / this.batchSubscribeTopicsLimit);
      for (let s = 0; s < t; s++) {
        const i = e.splice(0, this.batchSubscribeTopicsLimit);
        await this.batchSubscribe(i);
      }
    }
    this.events.emit(Ee.resubscribed);
  }
  async restore() {
    try {
      const e = await this.getRelayerSubscriptions();
      if (typeof e > "u" || !e.length) return;
      if (this.subscriptions.size && !e.every((t) => {
        var s;
        return t.topic === ((s = this.subscriptions.get(t.id)) == null ? void 0 : s.topic);
      })) {
        const { message: t } = I("RESTORE_WILL_OVERRIDE", this.name);
        throw this.logger.error(t), this.logger.error(`${this.name}: ${JSON.stringify(this.values)}`), new Error(t);
      }
      this.cached = e, this.logger.debug(`Successfully Restored subscriptions for ${this.name}`), this.logger.trace({ type: "method", method: "restore", subscriptions: this.values });
    } catch (e) {
      this.logger.debug(`Failed to Restore subscriptions for ${this.name}`), this.logger.error(e);
    }
  }
  async batchSubscribe(e) {
    e.length && (await this.rpcBatchSubscribe(e), this.onBatchSubscribe(await Promise.all(e.map(async (t) => us(Et({}, t), { id: await this.getSubscriptionId(t.topic) })))));
  }
  async batchFetchMessages(e) {
    if (!e.length) return;
    this.logger.trace(`Fetching batch messages for ${e.length} subscriptions`);
    const t = await this.rpcBatchFetchMessages(e);
    t && t.messages && (await Xn(E.toMiliseconds(E.ONE_SECOND)), await this.relayer.handleBatchMessageEvents(t.messages));
  }
  async onConnect() {
    await this.restart(), this.reset();
  }
  onDisconnect() {
    this.onDisable();
  }
  isInitialized() {
    if (!this.initialized) {
      const { message: e } = I("NOT_INITIALIZED", this.name);
      throw new Error(e);
    }
  }
  async restartToComplete(e) {
    !this.relayer.connected && !this.relayer.connecting && (this.cached.push(e), await this.relayer.transportOpen());
  }
  async getClientId() {
    return this.clientId || (this.clientId = await this.relayer.core.crypto.getClientId()), this.clientId;
  }
  async getSubscriptionId(e) {
    return Ae(e + await this.getClientId());
  }
}
var zp = Object.defineProperty, ar = Object.getOwnPropertySymbols, Vp = Object.prototype.hasOwnProperty, Kp = Object.prototype.propertyIsEnumerable, Ts = (r, e, t) => e in r ? zp(r, e, { enumerable: !0, configurable: !0, writable: !0, value: t }) : r[e] = t, cr = (r, e) => {
  for (var t in e || (e = {})) Vp.call(e, t) && Ts(r, t, e[t]);
  if (ar) for (var t of ar(e)) Kp.call(e, t) && Ts(r, t, e[t]);
  return r;
}, L = (r, e, t) => Ts(r, typeof e != "symbol" ? e + "" : e, t);
class Hp extends Un {
  constructor(e) {
    var t;
    super(e), L(this, "protocol", "wc"), L(this, "version", 2), L(this, "core"), L(this, "logger"), L(this, "events", new Ye.EventEmitter()), L(this, "provider"), L(this, "messages"), L(this, "subscriber"), L(this, "publisher"), L(this, "name", El), L(this, "transportExplicitlyClosed", !1), L(this, "initialized", !1), L(this, "connectionAttemptInProgress", !1), L(this, "relayUrl"), L(this, "projectId"), L(this, "packageName"), L(this, "bundleId"), L(this, "hasExperiencedNetworkDisruption", !1), L(this, "pingTimeout"), L(this, "heartBeatTimeout", E.toMiliseconds(E.THIRTY_SECONDS + E.FIVE_SECONDS)), L(this, "reconnectTimeout"), L(this, "connectPromise"), L(this, "reconnectInProgress", !1), L(this, "requestsInFlight", []), L(this, "connectTimeout", E.toMiliseconds(E.ONE_SECOND * 15)), L(this, "request", async (s) => {
      var i, n;
      this.logger.debug("Publishing Request Payload");
      const o = s.id || tt().toString();
      await this.toEstablishConnection();
      try {
        this.logger.trace({ id: o, method: s.method, topic: (i = s.params) == null ? void 0 : i.topic }, "relayer.request - publishing...");
        const a = `${o}:${((n = s.params) == null ? void 0 : n.tag) || ""}`;
        this.requestsInFlight.push(a);
        const c = await this.provider.request(s);
        return this.requestsInFlight = this.requestsInFlight.filter((h) => h !== a), c;
      } catch (a) {
        throw this.logger.debug(`Failed to Publish Request: ${o}`), a;
      }
    }), L(this, "resetPingTimeout", () => {
      ni() && (clearTimeout(this.pingTimeout), this.pingTimeout = setTimeout(() => {
        var s, i, n, o;
        try {
          this.logger.debug({}, "pingTimeout: Connection stalled, terminating..."), (o = (n = (i = (s = this.provider) == null ? void 0 : s.connection) == null ? void 0 : i.socket) == null ? void 0 : n.terminate) == null || o.call(n);
        } catch (a) {
          this.logger.warn(a, a?.message);
        }
      }, this.heartBeatTimeout));
    }), L(this, "onPayloadHandler", (s) => {
      this.onProviderPayload(s), this.resetPingTimeout();
    }), L(this, "onConnectHandler", () => {
      this.logger.warn({}, "Relayer connected 🛜"), this.startPingTimeout(), this.events.emit(Z.connect);
    }), L(this, "onDisconnectHandler", () => {
      this.logger.warn({}, "Relayer disconnected 🛑"), this.requestsInFlight = [], this.onProviderDisconnect();
    }), L(this, "onProviderErrorHandler", (s) => {
      this.logger.fatal(`Fatal socket error: ${s.message}`), this.events.emit(Z.error, s), this.logger.fatal("Fatal socket error received, closing transport"), this.transportExplicitlyClosed = !0, clearTimeout(this.reconnectTimeout), this.reconnectTimeout = void 0, this.reconnectInProgress = !1, this.transportClose().catch((i) => this.logger.warn(i));
    }), L(this, "registerProviderListeners", () => {
      this.provider.on(Fe.payload, this.onPayloadHandler), this.provider.on(Fe.connect, this.onConnectHandler), this.provider.on(Fe.disconnect, this.onDisconnectHandler), this.provider.on(Fe.error, this.onProviderErrorHandler);
    }), this.core = e.core, this.logger = Er({ logger: (t = e.logger) != null ? t : _l, name: this.name }), this.messages = new Pp(this.logger, e.core), this.subscriber = new jp(this, this.logger), this.publisher = new qp(this, this.logger), this.projectId = e?.projectId, this.relayUrl = e?.relayUrl || an, jn() ? this.packageName = ii() : zn() && (this.bundleId = ii()), this.provider = {};
  }
  async init() {
    this.logger.trace("Initialized"), this.registerEventListeners(), await Promise.all([this.messages.init(), this.subscriber.init()]), this.initialized = !0, this.transportOpen().catch((e) => this.logger.warn(e, e?.message));
  }
  get context() {
    return xe(this.logger);
  }
  get connected() {
    var e, t, s;
    return ((s = (t = (e = this.provider) == null ? void 0 : e.connection) == null ? void 0 : t.socket) == null ? void 0 : s.readyState) === 1 || !1;
  }
  get connecting() {
    var e, t, s;
    return ((s = (t = (e = this.provider) == null ? void 0 : e.connection) == null ? void 0 : t.socket) == null ? void 0 : s.readyState) === 0 || this.connectPromise !== void 0 || !1;
  }
  async publish(e, t, s) {
    this.isInitialized(), await this.publisher.publish(e, t, s), await this.recordMessageEvent({ topic: e, message: t, publishedAt: Date.now(), transportType: W.relay }, Mt.outbound);
  }
  async publishCustom(e) {
    this.isInitialized(), await this.publisher.publishCustom(e);
  }
  async subscribe(e, t) {
    var s, i, n;
    this.isInitialized(), (!(t != null && t.transportType) || t?.transportType === "relay") && await this.toEstablishConnection();
    const o = typeof ((s = t?.internal) == null ? void 0 : s.throwOnFailedPublish) > "u" ? !0 : (i = t?.internal) == null ? void 0 : i.throwOnFailedPublish;
    let a = ((n = this.subscriber.topicMap.get(e)) == null ? void 0 : n[0]) || "", c;
    const h = (l) => {
      l.topic === e && (this.subscriber.off(Ee.created, h), c());
    };
    return await Promise.all([new Promise((l) => {
      c = l, this.subscriber.on(Ee.created, h);
    }), new Promise(async (l, p) => {
      a = await this.subscriber.subscribe(e, cr({ internal: { throwOnFailedPublish: o } }, t)).catch((d) => {
        o && p(d);
      }) || a, l();
    })]), a;
  }
  async unsubscribe(e, t) {
    this.isInitialized(), await this.subscriber.unsubscribe(e, t);
  }
  on(e, t) {
    this.events.on(e, t);
  }
  once(e, t) {
    this.events.once(e, t);
  }
  off(e, t) {
    this.events.off(e, t);
  }
  removeListener(e, t) {
    this.events.removeListener(e, t);
  }
  async transportDisconnect() {
    this.provider.disconnect && (this.hasExperiencedNetworkDisruption || this.connected) ? await ze(this.provider.disconnect(), 2e3, "provider.disconnect()").catch(() => this.onProviderDisconnect()) : this.onProviderDisconnect();
  }
  async transportClose() {
    this.transportExplicitlyClosed = !0, clearTimeout(this.reconnectTimeout), this.reconnectTimeout = void 0, this.reconnectInProgress = !1, await this.transportDisconnect();
  }
  async transportOpen(e) {
    if (!this.subscriber.hasAnyTopics) {
      this.logger.info("Starting WS connection skipped because the client has no topics to work with.");
      return;
    }
    if (this.connectPromise ? (this.logger.debug({}, "Waiting for existing connection attempt to resolve..."), await this.connectPromise, this.logger.debug({}, "Existing connection attempt resolved")) : (this.connectPromise = new Promise(async (t, s) => {
      await this.connect(e).then(t).catch(s).finally(() => {
        this.connectPromise = void 0;
      });
    }), await this.connectPromise), !this.connected) throw new Error(`Couldn't establish socket connection to the relay server: ${this.relayUrl}`);
  }
  async restartTransport(e) {
    this.logger.debug({}, "Restarting transport..."), !this.connectionAttemptInProgress && (this.relayUrl = e || this.relayUrl, await this.confirmOnlineStateOrThrow(), await this.transportClose(), await this.transportOpen());
  }
  async confirmOnlineStateOrThrow() {
    if (!await ri()) throw new Error("No internet connection detected. Please restart your network and try again.");
  }
  async handleBatchMessageEvents(e) {
    if (e?.length === 0) {
      this.logger.trace("Batch message events is empty. Ignoring...");
      return;
    }
    const t = e.sort((s, i) => s.publishedAt - i.publishedAt);
    this.logger.debug(`Batch of ${t.length} message events sorted`);
    for (const s of t) try {
      await this.onMessageEvent(s);
    } catch (i) {
      this.logger.warn(i, "Error while processing batch message event: " + i?.message);
    }
    this.logger.trace(`Batch of ${t.length} message events processed`);
  }
  async onLinkMessageEvent(e, t) {
    const { topic: s } = e;
    if (!t.sessionExists) {
      const i = X(E.FIVE_MINUTES), n = { topic: s, expiry: i, relay: { protocol: "irn" }, active: !1 };
      await this.core.pairing.pairings.set(s, n);
    }
    this.events.emit(Z.message, e), await this.recordMessageEvent(e, Mt.inbound);
  }
  async connect(e) {
    await this.confirmOnlineStateOrThrow(), e && e !== this.relayUrl && (this.relayUrl = e, await this.transportDisconnect()), this.connectionAttemptInProgress = !0, this.transportExplicitlyClosed = !1;
    let t = 1;
    for (; t < 6; ) {
      try {
        if (this.transportExplicitlyClosed) break;
        this.logger.debug({}, `Connecting to ${this.relayUrl}, attempt: ${t}...`), await this.createProvider(), await new Promise(async (s, i) => {
          const n = () => {
            i(new Error("Connection interrupted while trying to connect"));
          };
          this.provider.once(Fe.disconnect, n), await ze(new Promise((o, a) => {
            this.provider.connect().then(o).catch(a);
          }), this.connectTimeout, `Socket stalled when trying to connect to ${this.relayUrl}`).catch((o) => {
            i(o);
          }).finally(() => {
            this.provider.off(Fe.disconnect, n), clearTimeout(this.reconnectTimeout);
          }), await new Promise(async (o, a) => {
            const c = () => {
              i(new Error("Connection interrupted while trying to subscribe"));
            };
            this.provider.once(Fe.disconnect, c), await this.subscriber.start().then(o).catch(a).finally(() => {
              this.provider.off(Fe.disconnect, c);
            });
          }), this.hasExperiencedNetworkDisruption = !1, s();
        });
      } catch (s) {
        await this.subscriber.stop();
        const i = s;
        this.logger.warn({}, i.message), this.hasExperiencedNetworkDisruption = !0;
      } finally {
        this.connectionAttemptInProgress = !1;
      }
      if (this.connected) {
        this.logger.debug({}, `Connected to ${this.relayUrl} successfully on attempt: ${t}`);
        break;
      }
      await new Promise((s) => setTimeout(s, E.toMiliseconds(t * 1))), t++;
    }
  }
  startPingTimeout() {
    var e, t, s, i, n;
    if (ni()) try {
      (t = (e = this.provider) == null ? void 0 : e.connection) != null && t.socket && ((n = (i = (s = this.provider) == null ? void 0 : s.connection) == null ? void 0 : i.socket) == null || n.on("ping", () => {
        this.resetPingTimeout();
      })), this.resetPingTimeout();
    } catch (o) {
      this.logger.warn(o, o?.message);
    }
  }
  async createProvider() {
    this.provider.connection && this.unregisterProviderListeners();
    const e = await this.core.crypto.signJWT(this.relayUrl);
    this.provider = new ol(new ll(Vn({ sdkVersion: Ss, protocol: this.protocol, version: this.version, relayUrl: this.relayUrl, projectId: this.projectId, auth: e, useOnCloseEvent: !0, bundleId: this.bundleId, packageName: this.packageName }))), this.registerProviderListeners();
  }
  async recordMessageEvent(e, t) {
    const { topic: s, message: i } = e;
    await this.messages.set(s, i, t);
  }
  async shouldIgnoreMessageEvent(e) {
    const { topic: t, message: s } = e;
    if (!s || s.length === 0) return this.logger.warn(`Ignoring invalid/empty message: ${s}`), !0;
    if (!await this.subscriber.isKnownTopic(t)) return this.logger.warn(`Ignoring message for unknown topic ${t}`), !0;
    const i = this.messages.has(t, s);
    return i && this.logger.warn(`Ignoring duplicate message: ${s}`), i;
  }
  async onProviderPayload(e) {
    if (this.logger.debug("Incoming Relay Payload"), this.logger.trace({ type: "payload", direction: "incoming", payload: e }), Gs(e)) {
      if (!e.method.endsWith(Il)) return;
      const t = e.params, { topic: s, message: i, publishedAt: n, attestation: o } = t.data, a = { topic: s, message: i, publishedAt: n, transportType: W.relay, attestation: o };
      this.logger.debug("Emitting Relayer Payload"), this.logger.trace(cr({ type: "event", event: t.id }, a)), this.events.emit(t.id, a), await this.acknowledgePayload(e), await this.onMessageEvent(a);
    } else Wt(e) && this.events.emit(Z.message_ack, e);
  }
  async onMessageEvent(e) {
    await this.shouldIgnoreMessageEvent(e) || (await this.recordMessageEvent(e, Mt.inbound), this.events.emit(Z.message, e));
  }
  async acknowledgePayload(e) {
    const t = Vt(e.id, !0);
    await this.provider.connection.send(t);
  }
  unregisterProviderListeners() {
    this.provider.off(Fe.payload, this.onPayloadHandler), this.provider.off(Fe.connect, this.onConnectHandler), this.provider.off(Fe.disconnect, this.onDisconnectHandler), this.provider.off(Fe.error, this.onProviderErrorHandler), clearTimeout(this.pingTimeout);
  }
  async registerEventListeners() {
    let e = await ri();
    Kn(async (t) => {
      e !== t && (e = t, t ? await this.transportOpen().catch((s) => this.logger.error(s, s?.message)) : (this.hasExperiencedNetworkDisruption = !0, await this.transportDisconnect(), this.transportExplicitlyClosed = !1));
    }), this.core.heartbeat.on(yt.pulse, async () => {
      if (!this.transportExplicitlyClosed && !this.connected && Hn()) try {
        await this.confirmOnlineStateOrThrow(), await this.transportOpen();
      } catch (t) {
        this.logger.warn(t, t?.message);
      }
    });
  }
  async onProviderDisconnect() {
    clearTimeout(this.pingTimeout), this.events.emit(Z.disconnect), this.connectionAttemptInProgress = !1, !this.reconnectInProgress && (this.reconnectInProgress = !0, await this.subscriber.stop(), this.subscriber.hasAnyTopics && (this.transportExplicitlyClosed || (this.reconnectTimeout = setTimeout(async () => {
      await this.transportOpen().catch((e) => this.logger.error(e, e?.message)), this.reconnectTimeout = void 0, this.reconnectInProgress = !1;
    }, E.toMiliseconds(xl)))));
  }
  isInitialized() {
    if (!this.initialized) {
      const { message: e } = I("NOT_INITIALIZED", this.name);
      throw new Error(e);
    }
  }
  async toEstablishConnection() {
    if (await this.confirmOnlineStateOrThrow(), !this.connected) {
      if (this.connectPromise) {
        await this.connectPromise;
        return;
      }
      await this.connect();
    }
  }
}
function Gp(r, e) {
  return r === e || Number.isNaN(r) && Number.isNaN(e);
}
function hr(r) {
  return Object.getOwnPropertySymbols(r).filter((e) => Object.prototype.propertyIsEnumerable.call(r, e));
}
function lr(r) {
  return r == null ? r === void 0 ? "[object Undefined]" : "[object Null]" : Object.prototype.toString.call(r);
}
const Wp = "[object RegExp]", Jp = "[object String]", Yp = "[object Number]", Qp = "[object Boolean]", ur = "[object Arguments]", Zp = "[object Symbol]", Xp = "[object Date]", ed = "[object Map]", td = "[object Set]", sd = "[object Array]", id = "[object Function]", rd = "[object ArrayBuffer]", ps = "[object Object]", nd = "[object Error]", od = "[object DataView]", ad = "[object Uint8Array]", cd = "[object Uint8ClampedArray]", hd = "[object Uint16Array]", ld = "[object Uint32Array]", ud = "[object BigUint64Array]", pd = "[object Int8Array]", dd = "[object Int16Array]", gd = "[object Int32Array]", yd = "[object BigInt64Array]", fd = "[object Float32Array]", md = "[object Float64Array]";
function wd() {
}
function pr(r) {
  if (!r || typeof r != "object") return !1;
  const e = Object.getPrototypeOf(r);
  return e === null || e === Object.prototype || Object.getPrototypeOf(e) === null ? Object.prototype.toString.call(r) === "[object Object]" : !1;
}
function bd(r, e, t) {
  return xt(r, e, void 0, void 0, void 0, void 0, t);
}
function xt(r, e, t, s, i, n, o) {
  const a = o(r, e, t, s, i, n);
  if (a !== void 0) return a;
  if (typeof r == typeof e) switch (typeof r) {
    case "bigint":
    case "string":
    case "boolean":
    case "symbol":
    case "undefined":
      return r === e;
    case "number":
      return r === e || Object.is(r, e);
    case "function":
      return r === e;
    case "object":
      return Pt(r, e, n, o);
  }
  return Pt(r, e, n, o);
}
function Pt(r, e, t, s) {
  if (Object.is(r, e)) return !0;
  let i = lr(r), n = lr(e);
  if (i === ur && (i = ps), n === ur && (n = ps), i !== n) return !1;
  switch (i) {
    case Jp:
      return r.toString() === e.toString();
    case Yp: {
      const c = r.valueOf(), h = e.valueOf();
      return Gp(c, h);
    }
    case Qp:
    case Xp:
    case Zp:
      return Object.is(r.valueOf(), e.valueOf());
    case Wp:
      return r.source === e.source && r.flags === e.flags;
    case id:
      return r === e;
  }
  t = t ?? /* @__PURE__ */ new Map();
  const o = t.get(r), a = t.get(e);
  if (o != null && a != null) return o === e;
  t.set(r, e), t.set(e, r);
  try {
    switch (i) {
      case ed: {
        if (r.size !== e.size) return !1;
        for (const [c, h] of r.entries()) if (!e.has(c) || !xt(h, e.get(c), c, r, e, t, s)) return !1;
        return !0;
      }
      case td: {
        if (r.size !== e.size) return !1;
        const c = Array.from(r.values()), h = Array.from(e.values());
        for (let l = 0; l < c.length; l++) {
          const p = c[l], d = h.findIndex((g) => xt(p, g, void 0, r, e, t, s));
          if (d === -1) return !1;
          h.splice(d, 1);
        }
        return !0;
      }
      case sd:
      case ad:
      case cd:
      case hd:
      case ld:
      case ud:
      case pd:
      case dd:
      case gd:
      case yd:
      case fd:
      case md: {
        if (typeof Buffer < "u" && Buffer.isBuffer(r) !== Buffer.isBuffer(e) || r.length !== e.length) return !1;
        for (let c = 0; c < r.length; c++) if (!xt(r[c], e[c], c, r, e, t, s)) return !1;
        return !0;
      }
      case rd:
        return r.byteLength !== e.byteLength ? !1 : Pt(new Uint8Array(r), new Uint8Array(e), t, s);
      case od:
        return r.byteLength !== e.byteLength || r.byteOffset !== e.byteOffset ? !1 : Pt(new Uint8Array(r), new Uint8Array(e), t, s);
      case nd:
        return r.name === e.name && r.message === e.message;
      case ps: {
        if (!(Pt(r.constructor, e.constructor, t, s) || pr(r) && pr(e))) return !1;
        const c = [...Object.keys(r), ...hr(r)], h = [...Object.keys(e), ...hr(e)];
        if (c.length !== h.length) return !1;
        for (let l = 0; l < c.length; l++) {
          const p = c[l], d = r[p];
          if (!Object.hasOwn(e, p)) return !1;
          const g = e[p];
          if (!xt(d, g, p, r, e, t, s)) return !1;
        }
        return !0;
      }
      default:
        return !1;
    }
  } finally {
    t.delete(r), t.delete(e);
  }
}
function vd(r, e) {
  return bd(r, e, wd);
}
var _d = Object.defineProperty, dr = Object.getOwnPropertySymbols, Ed = Object.prototype.hasOwnProperty, Id = Object.prototype.propertyIsEnumerable, Os = (r, e, t) => e in r ? _d(r, e, { enumerable: !0, configurable: !0, writable: !0, value: t }) : r[e] = t, gr = (r, e) => {
  for (var t in e || (e = {})) Ed.call(e, t) && Os(r, t, e[t]);
  if (dr) for (var t of dr(e)) Id.call(e, t) && Os(r, t, e[t]);
  return r;
}, we = (r, e, t) => Os(r, typeof e != "symbol" ? e + "" : e, t);
class ct extends Yn {
  constructor(e, t, s, i = Ve, n = void 0) {
    super(e, t, s, i), this.core = e, this.logger = t, this.name = s, we(this, "map", /* @__PURE__ */ new Map()), we(this, "version", Sl), we(this, "cached", []), we(this, "initialized", !1), we(this, "getKey"), we(this, "storagePrefix", Ve), we(this, "recentlyDeleted", []), we(this, "recentlyDeletedLimit", 200), we(this, "init", async () => {
      this.initialized || (this.logger.trace("Initialized"), await this.restore(), this.cached.forEach((o) => {
        this.getKey && o !== null && !Te(o) ? this.map.set(this.getKey(o), o) : uo(o) ? this.map.set(o.id, o) : po(o) && this.map.set(o.topic, o);
      }), this.cached = [], this.initialized = !0);
    }), we(this, "set", async (o, a) => {
      this.isInitialized(), this.map.has(o) ? await this.update(o, a) : (this.logger.debug("Setting value"), this.logger.trace({ type: "method", method: "set", key: o, value: a }), this.map.set(o, a), await this.persist());
    }), we(this, "get", (o) => (this.isInitialized(), this.logger.debug("Getting value"), this.logger.trace({ type: "method", method: "get", key: o }), this.getData(o))), we(this, "getAll", (o) => (this.isInitialized(), o ? this.values.filter((a) => Object.keys(o).every((c) => vd(a[c], o[c]))) : this.values)), we(this, "update", async (o, a) => {
      this.isInitialized(), this.logger.debug("Updating value"), this.logger.trace({ type: "method", method: "update", key: o, update: a });
      const c = gr(gr({}, this.getData(o)), a);
      this.map.set(o, c), await this.persist();
    }), we(this, "delete", async (o, a) => {
      this.isInitialized(), this.map.has(o) && (this.logger.debug("Deleting value"), this.logger.trace({ type: "method", method: "delete", key: o, reason: a }), this.map.delete(o), this.addToRecentlyDeleted(o), await this.persist());
    }), this.logger = Ie(t, this.name), this.storagePrefix = i, this.getKey = n;
  }
  get context() {
    return xe(this.logger);
  }
  get storageKey() {
    return this.storagePrefix + this.version + this.core.customStoragePrefix + "//" + this.name;
  }
  get length() {
    return this.map.size;
  }
  get keys() {
    return Array.from(this.map.keys());
  }
  get values() {
    return Array.from(this.map.values());
  }
  addToRecentlyDeleted(e) {
    this.recentlyDeleted.push(e), this.recentlyDeleted.length >= this.recentlyDeletedLimit && this.recentlyDeleted.splice(0, this.recentlyDeletedLimit / 2);
  }
  async setDataStore(e) {
    await this.core.storage.setItem(this.storageKey, e);
  }
  async getDataStore() {
    return await this.core.storage.getItem(this.storageKey);
  }
  getData(e) {
    const t = this.map.get(e);
    if (!t) {
      if (this.recentlyDeleted.includes(e)) {
        const { message: i } = I("MISSING_OR_INVALID", `Record was recently deleted - ${this.name}: ${e}`);
        throw this.logger.error(i), new Error(i);
      }
      const { message: s } = I("NO_MATCHING_KEY", `${this.name}: ${e}`);
      throw this.logger.error(s), new Error(s);
    }
    return t;
  }
  async persist() {
    await this.setDataStore(this.values);
  }
  async restore() {
    try {
      const e = await this.getDataStore();
      if (typeof e > "u" || !e.length) return;
      if (this.map.size) {
        const { message: t } = I("RESTORE_WILL_OVERRIDE", this.name);
        throw this.logger.error(t), new Error(t);
      }
      this.cached = e, this.logger.debug(`Successfully Restored value for ${this.name}`), this.logger.trace({ type: "method", method: "restore", value: this.values });
    } catch (e) {
      this.logger.debug(`Failed to Restore value for ${this.name}`), this.logger.error(e);
    }
  }
  isInitialized() {
    if (!this.initialized) {
      const { message: e } = I("NOT_INITIALIZED", this.name);
      throw new Error(e);
    }
  }
}
var xd = Object.defineProperty, Sd = (r, e, t) => e in r ? xd(r, e, { enumerable: !0, configurable: !0, writable: !0, value: t }) : r[e] = t, D = (r, e, t) => Sd(r, typeof e != "symbol" ? e + "" : e, t);
class Fd {
  constructor(e, t) {
    this.core = e, this.logger = t, D(this, "name", Al), D(this, "version", $l), D(this, "events", new Ir()), D(this, "pairings"), D(this, "initialized", !1), D(this, "storagePrefix", Ve), D(this, "ignoredPayloadTypes", [Dt]), D(this, "registeredMethods", []), D(this, "init", async () => {
      this.initialized || (await this.pairings.init(), await this.cleanup(), this.registerRelayerEvents(), this.registerExpirerEvents(), this.initialized = !0, this.logger.trace("Initialized"));
    }), D(this, "register", ({ methods: s }) => {
      this.isInitialized(), this.registeredMethods = [.../* @__PURE__ */ new Set([...this.registeredMethods, ...s])];
    }), D(this, "create", async (s) => {
      this.isInitialized();
      const i = fs(), n = await this.core.crypto.setSymKey(i), o = X(E.FIVE_MINUTES), a = { protocol: on }, c = { topic: n, expiry: o, relay: a, active: !1, methods: s?.methods }, h = hi({ protocol: this.core.protocol, version: this.core.version, topic: n, symKey: i, relay: a, expiryTimestamp: o, methods: s?.methods });
      return this.events.emit(at.create, c), this.core.expirer.set(n, o), await this.pairings.set(n, c), await this.core.relayer.subscribe(n, { transportType: s?.transportType, internal: s?.internal }), { topic: n, uri: h };
    }), D(this, "pair", async (s) => {
      this.isInitialized();
      const i = this.core.eventClient.createEvent({ properties: { topic: s?.uri, trace: [Be.pairing_started] } });
      this.isValidPair(s, i);
      const { topic: n, symKey: o, relay: a, expiryTimestamp: c, methods: h } = li(s.uri);
      i.props.properties.topic = n, i.addTrace(Be.pairing_uri_validation_success), i.addTrace(Be.pairing_uri_not_expired);
      let l;
      if (this.pairings.keys.includes(n)) {
        if (l = this.pairings.get(n), i.addTrace(Be.existing_pairing), l.active) throw i.setError(Ge.active_pairing_already_exists), new Error(`Pairing already exists: ${n}. Please try again with a new connection URI.`);
        i.addTrace(Be.pairing_not_expired);
      }
      const p = c || X(E.FIVE_MINUTES), d = { topic: n, relay: a, expiry: p, active: !1, methods: h };
      this.core.expirer.set(n, p), await this.pairings.set(n, d), i.addTrace(Be.store_new_pairing), s.activatePairing && await this.activate({ topic: n }), this.events.emit(at.create, d), i.addTrace(Be.emit_inactive_pairing), this.core.crypto.keychain.has(n) || await this.core.crypto.setSymKey(o, n), i.addTrace(Be.subscribing_pairing_topic);
      try {
        await this.core.relayer.confirmOnlineStateOrThrow();
      } catch {
        i.setError(Ge.no_internet_connection);
      }
      try {
        await this.core.relayer.subscribe(n, { relay: a });
      } catch (g) {
        throw i.setError(Ge.subscribe_pairing_topic_failure), g;
      }
      return i.addTrace(Be.subscribe_pairing_topic_success), d;
    }), D(this, "activate", async ({ topic: s }) => {
      this.isInitialized();
      const i = X(E.FIVE_MINUTES);
      this.core.expirer.set(s, i), await this.pairings.update(s, { active: !0, expiry: i });
    }), D(this, "ping", async (s) => {
      this.isInitialized(), await this.isValidPing(s), this.logger.warn("ping() is deprecated and will be removed in the next major release.");
      const { topic: i } = s;
      if (this.pairings.keys.includes(i)) {
        const n = await this.sendRequest(i, "wc_pairingPing", {}), { done: o, resolve: a, reject: c } = nt();
        this.events.once(V("pairing_ping", n), ({ error: h }) => {
          h ? c(h) : a();
        }), await o();
      }
    }), D(this, "updateExpiry", async ({ topic: s, expiry: i }) => {
      this.isInitialized(), await this.pairings.update(s, { expiry: i });
    }), D(this, "updateMetadata", async ({ topic: s, metadata: i }) => {
      this.isInitialized(), await this.pairings.update(s, { peerMetadata: i });
    }), D(this, "getPairings", () => (this.isInitialized(), this.pairings.values)), D(this, "disconnect", async (s) => {
      this.isInitialized(), await this.isValidDisconnect(s);
      const { topic: i } = s;
      this.pairings.keys.includes(i) && (await this.sendRequest(i, "wc_pairingDelete", ge("USER_DISCONNECTED")), await this.deletePairing(i));
    }), D(this, "formatUriFromPairing", (s) => {
      this.isInitialized();
      const { topic: i, relay: n, expiry: o, methods: a } = s, c = this.core.crypto.keychain.get(i);
      return hi({ protocol: this.core.protocol, version: this.core.version, topic: i, symKey: c, relay: n, expiryTimestamp: o, methods: a });
    }), D(this, "sendRequest", async (s, i, n) => {
      const o = Je(i, n), a = await this.core.crypto.encode(s, o), c = vt[i].req;
      return this.core.history.set(s, o), this.core.relayer.publish(s, a, c), o.id;
    }), D(this, "sendResult", async (s, i, n) => {
      const o = Vt(s, n), a = await this.core.crypto.encode(i, o), c = (await this.core.history.get(i, s)).request.method, h = vt[c].res;
      await this.core.relayer.publish(i, a, h), await this.core.history.resolve(o);
    }), D(this, "sendError", async (s, i, n) => {
      const o = Hs(s, n), a = await this.core.crypto.encode(i, o), c = (await this.core.history.get(i, s)).request.method, h = vt[c] ? vt[c].res : vt.unregistered_method.res;
      await this.core.relayer.publish(i, a, h), await this.core.history.resolve(o);
    }), D(this, "deletePairing", async (s, i) => {
      await this.core.relayer.unsubscribe(s), await Promise.all([this.pairings.delete(s, ge("USER_DISCONNECTED")), this.core.crypto.deleteSymKey(s), i ? Promise.resolve() : this.core.expirer.del(s)]);
    }), D(this, "cleanup", async () => {
      const s = this.pairings.getAll().filter((i) => et(i.expiry));
      await Promise.all(s.map((i) => this.deletePairing(i.topic)));
    }), D(this, "onRelayEventRequest", async (s) => {
      const { topic: i, payload: n } = s;
      switch (n.method) {
        case "wc_pairingPing":
          return await this.onPairingPingRequest(i, n);
        case "wc_pairingDelete":
          return await this.onPairingDeleteRequest(i, n);
        default:
          return await this.onUnknownRpcMethodRequest(i, n);
      }
    }), D(this, "onRelayEventResponse", async (s) => {
      const { topic: i, payload: n } = s, o = (await this.core.history.get(i, n.id)).request.method;
      return o === "wc_pairingPing" ? this.onPairingPingResponse(i, n) : this.onUnknownRpcMethodResponse(o);
    }), D(this, "onPairingPingRequest", async (s, i) => {
      const { id: n } = i;
      try {
        this.isValidPing({ topic: s }), await this.sendResult(n, s, !0), this.events.emit(at.ping, { id: n, topic: s });
      } catch (o) {
        await this.sendError(n, s, o), this.logger.error(o);
      }
    }), D(this, "onPairingPingResponse", (s, i) => {
      const { id: n } = i;
      setTimeout(() => {
        je(i) ? this.events.emit(V("pairing_ping", n), {}) : $e(i) && this.events.emit(V("pairing_ping", n), { error: i.error });
      }, 500);
    }), D(this, "onPairingDeleteRequest", async (s, i) => {
      const { id: n } = i;
      try {
        this.isValidDisconnect({ topic: s }), await this.deletePairing(s), this.events.emit(at.delete, { id: n, topic: s });
      } catch (o) {
        await this.sendError(n, s, o), this.logger.error(o);
      }
    }), D(this, "onUnknownRpcMethodRequest", async (s, i) => {
      const { id: n, method: o } = i;
      try {
        if (this.registeredMethods.includes(o)) return;
        const a = ge("WC_METHOD_UNSUPPORTED", o);
        await this.sendError(n, s, a), this.logger.error(a);
      } catch (a) {
        await this.sendError(n, s, a), this.logger.error(a);
      }
    }), D(this, "onUnknownRpcMethodResponse", (s) => {
      this.registeredMethods.includes(s) || this.logger.error(ge("WC_METHOD_UNSUPPORTED", s));
    }), D(this, "isValidPair", (s, i) => {
      var n;
      if (!be(s)) {
        const { message: a } = I("MISSING_OR_INVALID", `pair() params: ${s}`);
        throw i.setError(Ge.malformed_pairing_uri), new Error(a);
      }
      if (!go(s.uri)) {
        const { message: a } = I("MISSING_OR_INVALID", `pair() uri: ${s.uri}`);
        throw i.setError(Ge.malformed_pairing_uri), new Error(a);
      }
      const o = li(s?.uri);
      if (!((n = o?.relay) != null && n.protocol)) {
        const { message: a } = I("MISSING_OR_INVALID", "pair() uri#relay-protocol");
        throw i.setError(Ge.malformed_pairing_uri), new Error(a);
      }
      if (!(o != null && o.symKey)) {
        const { message: a } = I("MISSING_OR_INVALID", "pair() uri#symKey");
        throw i.setError(Ge.malformed_pairing_uri), new Error(a);
      }
      if (o != null && o.expiryTimestamp && E.toMiliseconds(o?.expiryTimestamp) < Date.now()) {
        i.setError(Ge.pairing_expired);
        const { message: a } = I("EXPIRED", "pair() URI has expired. Please try again with a new connection URI.");
        throw new Error(a);
      }
    }), D(this, "isValidPing", async (s) => {
      if (!be(s)) {
        const { message: n } = I("MISSING_OR_INVALID", `ping() params: ${s}`);
        throw new Error(n);
      }
      const { topic: i } = s;
      await this.isValidPairingTopic(i);
    }), D(this, "isValidDisconnect", async (s) => {
      if (!be(s)) {
        const { message: n } = I("MISSING_OR_INVALID", `disconnect() params: ${s}`);
        throw new Error(n);
      }
      const { topic: i } = s;
      await this.isValidPairingTopic(i);
    }), D(this, "isValidPairingTopic", async (s) => {
      if (!Xe(s, !1)) {
        const { message: i } = I("MISSING_OR_INVALID", `pairing topic should be a string: ${s}`);
        throw new Error(i);
      }
      if (!this.pairings.keys.includes(s)) {
        const { message: i } = I("NO_MATCHING_KEY", `pairing topic doesn't exist: ${s}`);
        throw new Error(i);
      }
      if (et(this.pairings.get(s).expiry)) {
        await this.deletePairing(s);
        const { message: i } = I("EXPIRED", `pairing topic: ${s}`);
        throw new Error(i);
      }
    }), this.core = e, this.logger = Ie(t, this.name), this.pairings = new ct(this.core, this.logger, this.name, this.storagePrefix);
  }
  get context() {
    return xe(this.logger);
  }
  isInitialized() {
    if (!this.initialized) {
      const { message: e } = I("NOT_INITIALIZED", this.name);
      throw new Error(e);
    }
  }
  registerRelayerEvents() {
    this.core.relayer.on(Z.message, async (e) => {
      const { topic: t, message: s, transportType: i } = e;
      if (this.pairings.keys.includes(t) && i !== W.link_mode && !this.ignoredPayloadTypes.includes(this.core.crypto.getPayloadType(s))) try {
        const n = await this.core.crypto.decode(t, s);
        Gs(n) ? (this.core.history.set(t, n), await this.onRelayEventRequest({ topic: t, payload: n })) : Wt(n) && (await this.core.history.resolve(n), await this.onRelayEventResponse({ topic: t, payload: n }), this.core.history.delete(t, n.id)), await this.core.relayer.messages.ack(t, s);
      } catch (n) {
        this.logger.error(n);
      }
    });
  }
  registerExpirerEvents() {
    this.core.expirer.on(Re.expired, async (e) => {
      const { topic: t } = xr(e.target);
      t && this.pairings.keys.includes(t) && (await this.deletePairing(t, !0), this.events.emit(at.expire, { topic: t }));
    });
  }
}
var Pd = Object.defineProperty, Rd = (r, e, t) => e in r ? Pd(r, e, { enumerable: !0, configurable: !0, writable: !0, value: t }) : r[e] = t, ae = (r, e, t) => Rd(r, typeof e != "symbol" ? e + "" : e, t);
class Ad extends kn {
  constructor(e, t) {
    super(e, t), this.core = e, this.logger = t, ae(this, "records", /* @__PURE__ */ new Map()), ae(this, "events", new Ye.EventEmitter()), ae(this, "name", Tl), ae(this, "version", Ol), ae(this, "cached", []), ae(this, "initialized", !1), ae(this, "storagePrefix", Ve), ae(this, "init", async () => {
      this.initialized || (this.logger.trace("Initialized"), await this.restore(), this.cached.forEach((s) => this.records.set(s.id, s)), this.cached = [], this.registerEventListeners(), this.initialized = !0);
    }), ae(this, "set", (s, i, n) => {
      if (this.isInitialized(), this.logger.debug("Setting JSON-RPC request history record"), this.logger.trace({ type: "method", method: "set", topic: s, request: i, chainId: n }), this.records.has(i.id)) return;
      const o = { id: i.id, topic: s, request: { method: i.method, params: i.params || null }, chainId: n, expiry: X(E.THIRTY_DAYS) };
      this.records.set(o.id, o), this.persist(), this.events.emit(Ce.created, o);
    }), ae(this, "resolve", async (s) => {
      if (this.isInitialized(), this.logger.debug("Updating JSON-RPC response history record"), this.logger.trace({ type: "method", method: "update", response: s }), !this.records.has(s.id)) return;
      const i = await this.getRecord(s.id);
      typeof i.response > "u" && (i.response = $e(s) ? { error: s.error } : { result: s.result }, this.records.set(i.id, i), this.persist(), this.events.emit(Ce.updated, i));
    }), ae(this, "get", async (s, i) => (this.isInitialized(), this.logger.debug("Getting record"), this.logger.trace({ type: "method", method: "get", topic: s, id: i }), await this.getRecord(i))), ae(this, "delete", (s, i) => {
      this.isInitialized(), this.logger.debug("Deleting record"), this.logger.trace({ type: "method", method: "delete", id: i }), this.values.forEach((n) => {
        if (n.topic === s) {
          if (typeof i < "u" && n.id !== i) return;
          this.records.delete(n.id), this.events.emit(Ce.deleted, n);
        }
      }), this.persist();
    }), ae(this, "exists", async (s, i) => (this.isInitialized(), this.records.has(i) ? (await this.getRecord(i)).topic === s : !1)), ae(this, "on", (s, i) => {
      this.events.on(s, i);
    }), ae(this, "once", (s, i) => {
      this.events.once(s, i);
    }), ae(this, "off", (s, i) => {
      this.events.off(s, i);
    }), ae(this, "removeListener", (s, i) => {
      this.events.removeListener(s, i);
    }), this.logger = Ie(t, this.name);
  }
  get context() {
    return xe(this.logger);
  }
  get storageKey() {
    return this.storagePrefix + this.version + this.core.customStoragePrefix + "//" + this.name;
  }
  get size() {
    return this.records.size;
  }
  get keys() {
    return Array.from(this.records.keys());
  }
  get values() {
    return Array.from(this.records.values());
  }
  get pending() {
    const e = [];
    return this.values.forEach((t) => {
      if (typeof t.response < "u") return;
      const s = { topic: t.topic, request: Je(t.request.method, t.request.params, t.id), chainId: t.chainId };
      return e.push(s);
    }), e;
  }
  async setJsonRpcRecords(e) {
    await this.core.storage.setItem(this.storageKey, e);
  }
  async getJsonRpcRecords() {
    return await this.core.storage.getItem(this.storageKey);
  }
  getRecord(e) {
    this.isInitialized();
    const t = this.records.get(e);
    if (!t) {
      const { message: s } = I("NO_MATCHING_KEY", `${this.name}: ${e}`);
      throw new Error(s);
    }
    return t;
  }
  async persist() {
    await this.setJsonRpcRecords(this.values), this.events.emit(Ce.sync);
  }
  async restore() {
    try {
      const e = await this.getJsonRpcRecords();
      if (typeof e > "u" || !e.length) return;
      if (this.records.size) {
        const { message: t } = I("RESTORE_WILL_OVERRIDE", this.name);
        throw this.logger.error(t), new Error(t);
      }
      this.cached = e, this.logger.debug(`Successfully Restored records for ${this.name}`), this.logger.trace({ type: "method", method: "restore", records: this.values });
    } catch (e) {
      this.logger.debug(`Failed to Restore records for ${this.name}`), this.logger.error(e);
    }
  }
  registerEventListeners() {
    this.events.on(Ce.created, (e) => {
      const t = Ce.created;
      this.logger.info(`Emitting ${t}`), this.logger.debug({ type: "event", event: t, record: e });
    }), this.events.on(Ce.updated, (e) => {
      const t = Ce.updated;
      this.logger.info(`Emitting ${t}`), this.logger.debug({ type: "event", event: t, record: e });
    }), this.events.on(Ce.deleted, (e) => {
      const t = Ce.deleted;
      this.logger.info(`Emitting ${t}`), this.logger.debug({ type: "event", event: t, record: e });
    }), this.core.heartbeat.on(yt.pulse, () => {
      this.cleanup();
    });
  }
  cleanup() {
    try {
      this.isInitialized();
      let e = !1;
      this.records.forEach((t) => {
        E.toMiliseconds(t.expiry || 0) - Date.now() <= 0 && (this.logger.info(`Deleting expired history log: ${t.id}`), this.records.delete(t.id), this.events.emit(Ce.deleted, t, !1), e = !0);
      }), e && this.persist();
    } catch (e) {
      this.logger.warn(e);
    }
  }
  isInitialized() {
    if (!this.initialized) {
      const { message: e } = I("NOT_INITIALIZED", this.name);
      throw new Error(e);
    }
  }
}
var $d = Object.defineProperty, Td = (r, e, t) => e in r ? $d(r, e, { enumerable: !0, configurable: !0, writable: !0, value: t }) : r[e] = t, de = (r, e, t) => Td(r, typeof e != "symbol" ? e + "" : e, t);
class Od extends Mn {
  constructor(e, t) {
    super(e, t), this.core = e, this.logger = t, de(this, "expirations", /* @__PURE__ */ new Map()), de(this, "events", new Ye.EventEmitter()), de(this, "name", ql), de(this, "version", Cl), de(this, "cached", []), de(this, "initialized", !1), de(this, "storagePrefix", Ve), de(this, "init", async () => {
      this.initialized || (this.logger.trace("Initialized"), await this.restore(), this.cached.forEach((s) => this.expirations.set(s.target, s)), this.cached = [], this.registerEventListeners(), this.initialized = !0);
    }), de(this, "has", (s) => {
      try {
        const i = this.formatTarget(s);
        return typeof this.getExpiration(i) < "u";
      } catch {
        return !1;
      }
    }), de(this, "set", (s, i) => {
      this.isInitialized();
      const n = this.formatTarget(s), o = { target: n, expiry: i };
      this.expirations.set(n, o), this.checkExpiry(n, o), this.events.emit(Re.created, { target: n, expiration: o });
    }), de(this, "get", (s) => {
      this.isInitialized();
      const i = this.formatTarget(s);
      return this.getExpiration(i);
    }), de(this, "del", (s) => {
      if (this.isInitialized(), this.has(s)) {
        const i = this.formatTarget(s), n = this.getExpiration(i);
        this.expirations.delete(i), this.events.emit(Re.deleted, { target: i, expiration: n });
      }
    }), de(this, "on", (s, i) => {
      this.events.on(s, i);
    }), de(this, "once", (s, i) => {
      this.events.once(s, i);
    }), de(this, "off", (s, i) => {
      this.events.off(s, i);
    }), de(this, "removeListener", (s, i) => {
      this.events.removeListener(s, i);
    }), this.logger = Ie(t, this.name);
  }
  get context() {
    return xe(this.logger);
  }
  get storageKey() {
    return this.storagePrefix + this.version + this.core.customStoragePrefix + "//" + this.name;
  }
  get length() {
    return this.expirations.size;
  }
  get keys() {
    return Array.from(this.expirations.keys());
  }
  get values() {
    return Array.from(this.expirations.values());
  }
  formatTarget(e) {
    if (typeof e == "string") return Ln(e);
    if (typeof e == "number") return Bn(e);
    const { message: t } = I("UNKNOWN_TYPE", `Target type: ${typeof e}`);
    throw new Error(t);
  }
  async setExpirations(e) {
    await this.core.storage.setItem(this.storageKey, e);
  }
  async getExpirations() {
    return await this.core.storage.getItem(this.storageKey);
  }
  async persist() {
    await this.setExpirations(this.values), this.events.emit(Re.sync);
  }
  async restore() {
    try {
      const e = await this.getExpirations();
      if (typeof e > "u" || !e.length) return;
      if (this.expirations.size) {
        const { message: t } = I("RESTORE_WILL_OVERRIDE", this.name);
        throw this.logger.error(t), new Error(t);
      }
      this.cached = e, this.logger.debug(`Successfully Restored expirations for ${this.name}`), this.logger.trace({ type: "method", method: "restore", expirations: this.values });
    } catch (e) {
      this.logger.debug(`Failed to Restore expirations for ${this.name}`), this.logger.error(e);
    }
  }
  getExpiration(e) {
    const t = this.expirations.get(e);
    if (!t) {
      const { message: s } = I("NO_MATCHING_KEY", `${this.name}: ${e}`);
      throw this.logger.warn(s), new Error(s);
    }
    return t;
  }
  checkExpiry(e, t) {
    const { expiry: s } = t;
    E.toMiliseconds(s) - Date.now() <= 0 && this.expire(e, t);
  }
  expire(e, t) {
    this.expirations.delete(e), this.events.emit(Re.expired, { target: e, expiration: t });
  }
  checkExpirations() {
    this.core.relayer.connected && this.expirations.forEach((e, t) => this.checkExpiry(t, e));
  }
  registerEventListeners() {
    this.core.heartbeat.on(yt.pulse, () => this.checkExpirations()), this.events.on(Re.created, (e) => {
      const t = Re.created;
      this.logger.info(`Emitting ${t}`), this.logger.debug({ type: "event", event: t, data: e }), this.persist();
    }), this.events.on(Re.expired, (e) => {
      const t = Re.expired;
      this.logger.info(`Emitting ${t}`), this.logger.debug({ type: "event", event: t, data: e }), this.persist();
    }), this.events.on(Re.deleted, (e) => {
      const t = Re.deleted;
      this.logger.info(`Emitting ${t}`), this.logger.debug({ type: "event", event: t, data: e }), this.persist();
    });
  }
  isInitialized() {
    if (!this.initialized) {
      const { message: e } = I("NOT_INITIALIZED", this.name);
      throw new Error(e);
    }
  }
}
var qd = Object.defineProperty, Cd = (r, e, t) => e in r ? qd(r, e, { enumerable: !0, configurable: !0, writable: !0, value: t }) : r[e] = t, Q = (r, e, t) => Cd(r, typeof e != "symbol" ? e + "" : e, t);
class Nd extends Gn {
  constructor(e, t, s) {
    super(e, t, s), this.core = e, this.logger = t, this.store = s, Q(this, "name", Nl), Q(this, "abortController"), Q(this, "isDevEnv"), Q(this, "verifyUrlV3", kl), Q(this, "storagePrefix", Ve), Q(this, "version", nn), Q(this, "publicKey"), Q(this, "fetchPromise"), Q(this, "init", async () => {
      var i;
      this.isDevEnv || (this.publicKey = await this.store.getItem(this.storeKey), this.publicKey && E.toMiliseconds((i = this.publicKey) == null ? void 0 : i.expiresAt) < Date.now() && (this.logger.debug("verify v2 public key expired"), await this.removePublicKey()));
    }), Q(this, "register", async (i) => {
      if (!yo() || this.isDevEnv) return;
      const n = window.location.origin, { id: o, decryptedId: a } = i, c = `${this.verifyUrlV3}/attestation?projectId=${this.core.projectId}&origin=${n}&id=${o}&decryptedId=${a}`;
      try {
        const h = fo.getDocument(), l = this.startAbortTimer(E.ONE_SECOND * 5), p = await new Promise((d, g) => {
          const u = () => {
            window.removeEventListener("message", w), h.body.removeChild(y), g("attestation aborted");
          };
          this.abortController.signal.addEventListener("abort", u);
          const y = h.createElement("iframe");
          y.src = c, y.style.display = "none", y.addEventListener("error", u, { signal: this.abortController.signal });
          const w = (_) => {
            if (_.data && typeof _.data == "string") try {
              const v = JSON.parse(_.data);
              if (v.type === "verify_attestation") {
                if (zi(v.attestation).payload.id !== o) return;
                clearInterval(l), h.body.removeChild(y), this.abortController.signal.removeEventListener("abort", u), window.removeEventListener("message", w), d(v.attestation === null ? "" : v.attestation);
              }
            } catch (v) {
              this.logger.warn(v);
            }
          };
          h.body.appendChild(y), window.addEventListener("message", w, { signal: this.abortController.signal });
        });
        return this.logger.debug(p, "jwt attestation"), p;
      } catch (h) {
        this.logger.warn(h);
      }
      return "";
    }), Q(this, "resolve", async (i) => {
      if (this.isDevEnv) return "";
      const { attestationId: n, hash: o, encryptedId: a } = i;
      if (n === "") {
        this.logger.debug("resolve: attestationId is empty, skipping");
        return;
      }
      if (n) {
        if (zi(n).payload.id !== a) return;
        const h = await this.isValidJwtAttestation(n);
        if (h) {
          if (!h.isVerified) {
            this.logger.warn("resolve: jwt attestation: origin url not verified");
            return;
          }
          return h;
        }
      }
      if (!o) return;
      const c = this.getVerifyUrl(i?.verifyUrl);
      return this.fetchAttestation(o, c);
    }), Q(this, "fetchAttestation", async (i, n) => {
      this.logger.debug(`resolving attestation: ${i} from url: ${n}`);
      const o = this.startAbortTimer(E.ONE_SECOND * 5), a = await fetch(`${n}/attestation/${i}?v2Supported=true`, { signal: this.abortController.signal });
      return clearTimeout(o), a.status === 200 ? await a.json() : void 0;
    }), Q(this, "getVerifyUrl", (i) => {
      let n = i || Ft;
      return Ml.includes(n) || (this.logger.info(`verify url: ${n}, not included in trusted list, assigning default: ${Ft}`), n = Ft), n;
    }), Q(this, "fetchPublicKey", async () => {
      try {
        this.logger.debug(`fetching public key from: ${this.verifyUrlV3}`);
        const i = this.startAbortTimer(E.FIVE_SECONDS), n = await fetch(`${this.verifyUrlV3}/public-key`, { signal: this.abortController.signal });
        return clearTimeout(i), await n.json();
      } catch (i) {
        this.logger.warn(i);
      }
    }), Q(this, "persistPublicKey", async (i) => {
      this.logger.debug(i, "persisting public key to local storage"), await this.store.setItem(this.storeKey, i), this.publicKey = i;
    }), Q(this, "removePublicKey", async () => {
      this.logger.debug("removing verify v2 public key from storage"), await this.store.removeItem(this.storeKey), this.publicKey = void 0;
    }), Q(this, "isValidJwtAttestation", async (i) => {
      const n = await this.getPublicKey();
      try {
        if (n) return this.validateAttestation(i, n);
      } catch (a) {
        this.logger.error(a), this.logger.warn("error validating attestation");
      }
      const o = await this.fetchAndPersistPublicKey();
      try {
        if (o) return this.validateAttestation(i, o);
      } catch (a) {
        this.logger.error(a), this.logger.warn("error validating attestation");
      }
    }), Q(this, "getPublicKey", async () => this.publicKey ? this.publicKey : await this.fetchAndPersistPublicKey()), Q(this, "fetchAndPersistPublicKey", async () => {
      if (this.fetchPromise) return await this.fetchPromise, this.publicKey;
      this.fetchPromise = new Promise(async (n) => {
        const o = await this.fetchPublicKey();
        o && (await this.persistPublicKey(o), n(o));
      });
      const i = await this.fetchPromise;
      return this.fetchPromise = void 0, i;
    }), Q(this, "validateAttestation", (i, n) => {
      const o = mo(i, n.publicKey), a = { hasExpired: E.toMiliseconds(o.exp) < Date.now(), payload: o };
      if (a.hasExpired) throw this.logger.warn("resolve: jwt attestation expired"), new Error("JWT attestation expired");
      return { origin: a.payload.origin, isScam: a.payload.isScam, isVerified: a.payload.isVerified };
    }), this.logger = Ie(t, this.name), this.abortController = new AbortController(), this.isDevEnv = ks(), this.init();
  }
  get storeKey() {
    return this.storagePrefix + this.version + this.core.customStoragePrefix + "//verify:public:key";
  }
  get context() {
    return xe(this.logger);
  }
  startAbortTimer(e) {
    return this.abortController = new AbortController(), setTimeout(() => this.abortController.abort(), E.toMiliseconds(e));
  }
}
var Dd = Object.defineProperty, kd = (r, e, t) => e in r ? Dd(r, e, { enumerable: !0, configurable: !0, writable: !0, value: t }) : r[e] = t, yr = (r, e, t) => kd(r, typeof e != "symbol" ? e + "" : e, t);
class Md extends Wn {
  constructor(e, t) {
    super(e, t), this.projectId = e, this.logger = t, yr(this, "context", Ll), yr(this, "registerDeviceToken", async (s) => {
      const { clientId: i, token: n, notificationType: o, enableEncrypted: a = !1 } = s, c = `${Bl}/${this.projectId}/clients`;
      await fetch(c, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ client_id: i, type: o, token: n, always_raw: a }) });
    }), this.logger = Ie(t, this.context);
  }
}
var Ld = Object.defineProperty, fr = Object.getOwnPropertySymbols, Bd = Object.prototype.hasOwnProperty, Ud = Object.prototype.propertyIsEnumerable, qs = (r, e, t) => e in r ? Ld(r, e, { enumerable: !0, configurable: !0, writable: !0, value: t }) : r[e] = t, It = (r, e) => {
  for (var t in e || (e = {})) Bd.call(e, t) && qs(r, t, e[t]);
  if (fr) for (var t of fr(e)) Ud.call(e, t) && qs(r, t, e[t]);
  return r;
}, ie = (r, e, t) => qs(r, typeof e != "symbol" ? e + "" : e, t);
class jd extends Jn {
  constructor(e, t, s = !0) {
    super(e, t, s), this.core = e, this.logger = t, ie(this, "context", jl), ie(this, "storagePrefix", Ve), ie(this, "storageVersion", Ul), ie(this, "events", /* @__PURE__ */ new Map()), ie(this, "shouldPersist", !1), ie(this, "init", async () => {
      if (!ks()) try {
        const i = { eventId: ui(), timestamp: Date.now(), domain: this.getAppDomain(), props: { event: "INIT", type: "", properties: { client_id: await this.core.crypto.getClientId(), user_agent: wo(this.core.relayer.protocol, this.core.relayer.version, Ss) } } };
        await this.sendEvent([i]);
      } catch (i) {
        this.logger.warn(i);
      }
    }), ie(this, "createEvent", (i) => {
      const { event: n = "ERROR", type: o = "", properties: { topic: a, trace: c } } = i, h = ui(), l = this.core.projectId || "", p = Date.now(), d = It({ eventId: h, timestamp: p, props: { event: n, type: o, properties: { topic: a, trace: c } }, bundleId: l, domain: this.getAppDomain() }, this.setMethods(h));
      return this.telemetryEnabled && (this.events.set(h, d), this.shouldPersist = !0), d;
    }), ie(this, "getEvent", (i) => {
      const { eventId: n, topic: o } = i;
      if (n) return this.events.get(n);
      const a = Array.from(this.events.values()).find((c) => c.props.properties.topic === o);
      if (a) return It(It({}, a), this.setMethods(a.eventId));
    }), ie(this, "deleteEvent", (i) => {
      const { eventId: n } = i;
      this.events.delete(n), this.shouldPersist = !0;
    }), ie(this, "setEventListeners", () => {
      this.core.heartbeat.on(yt.pulse, async () => {
        this.shouldPersist && await this.persist(), this.events.forEach((i) => {
          E.fromMiliseconds(Date.now()) - E.fromMiliseconds(i.timestamp) > zl && (this.events.delete(i.eventId), this.shouldPersist = !0);
        });
      });
    }), ie(this, "setMethods", (i) => ({ addTrace: (n) => this.addTrace(i, n), setError: (n) => this.setError(i, n) })), ie(this, "addTrace", (i, n) => {
      const o = this.events.get(i);
      o && (o.props.properties.trace.push(n), this.events.set(i, o), this.shouldPersist = !0);
    }), ie(this, "setError", (i, n) => {
      const o = this.events.get(i);
      o && (o.props.type = n, o.timestamp = Date.now(), this.events.set(i, o), this.shouldPersist = !0);
    }), ie(this, "persist", async () => {
      await this.core.storage.setItem(this.storageKey, Array.from(this.events.values())), this.shouldPersist = !1;
    }), ie(this, "restore", async () => {
      try {
        const i = await this.core.storage.getItem(this.storageKey) || [];
        if (!i.length) return;
        i.forEach((n) => {
          this.events.set(n.eventId, It(It({}, n), this.setMethods(n.eventId)));
        });
      } catch (i) {
        this.logger.warn(i);
      }
    }), ie(this, "submit", async () => {
      if (!this.telemetryEnabled || this.events.size === 0) return;
      const i = [];
      for (const [n, o] of this.events) o.props.type && i.push(o);
      if (i.length !== 0) try {
        if ((await this.sendEvent(i)).ok) for (const n of i) this.events.delete(n.eventId), this.shouldPersist = !0;
      } catch (n) {
        this.logger.warn(n);
      }
    }), ie(this, "sendEvent", async (i) => {
      const n = this.getAppDomain() ? "" : "&sp=desktop";
      return await fetch(`${Vl}?projectId=${this.core.projectId}&st=events_sdk&sv=js-${Ss}${n}`, { method: "POST", body: JSON.stringify(i) });
    }), ie(this, "getAppDomain", () => bo().url), this.logger = Ie(t, this.context), this.telemetryEnabled = s, s ? this.restore().then(async () => {
      await this.submit(), this.setEventListeners();
    }) : this.persist();
  }
  get storageKey() {
    return this.storagePrefix + this.storageVersion + this.core.customStoragePrefix + "//" + this.context;
  }
}
var zd = Object.defineProperty, mr = Object.getOwnPropertySymbols, Vd = Object.prototype.hasOwnProperty, Kd = Object.prototype.propertyIsEnumerable, Cs = (r, e, t) => e in r ? zd(r, e, { enumerable: !0, configurable: !0, writable: !0, value: t }) : r[e] = t, wr = (r, e) => {
  for (var t in e || (e = {})) Vd.call(e, t) && Cs(r, t, e[t]);
  if (mr) for (var t of mr(e)) Kd.call(e, t) && Cs(r, t, e[t]);
  return r;
}, H = (r, e, t) => Cs(r, typeof e != "symbol" ? e + "" : e, t);
class Ws extends On {
  constructor(e) {
    var t;
    super(e), H(this, "protocol", rn), H(this, "version", nn), H(this, "name", xs), H(this, "relayUrl"), H(this, "projectId"), H(this, "customStoragePrefix"), H(this, "events", new Ye.EventEmitter()), H(this, "logger"), H(this, "heartbeat"), H(this, "relayer"), H(this, "crypto"), H(this, "storage"), H(this, "history"), H(this, "expirer"), H(this, "pairing"), H(this, "verify"), H(this, "echoClient"), H(this, "linkModeSupportedApps"), H(this, "eventClient"), H(this, "initialized", !1), H(this, "logChunkController"), H(this, "on", (a, c) => this.events.on(a, c)), H(this, "once", (a, c) => this.events.once(a, c)), H(this, "off", (a, c) => this.events.off(a, c)), H(this, "removeListener", (a, c) => this.events.removeListener(a, c)), H(this, "dispatchEnvelope", ({ topic: a, message: c, sessionExists: h }) => {
      if (!a || !c) return;
      const l = { topic: a, message: c, publishedAt: Date.now(), transportType: W.link_mode };
      this.relayer.onLinkMessageEvent(l, { sessionExists: h });
    });
    const s = this.getGlobalCore(e?.customStoragePrefix);
    if (s) try {
      return this.customStoragePrefix = s.customStoragePrefix, this.logger = s.logger, this.heartbeat = s.heartbeat, this.crypto = s.crypto, this.history = s.history, this.expirer = s.expirer, this.storage = s.storage, this.relayer = s.relayer, this.pairing = s.pairing, this.verify = s.verify, this.echoClient = s.echoClient, this.linkModeSupportedApps = s.linkModeSupportedApps, this.eventClient = s.eventClient, this.initialized = s.initialized, this.logChunkController = s.logChunkController, s;
    } catch (a) {
      console.warn("Failed to copy global core", a);
    }
    this.projectId = e?.projectId, this.relayUrl = e?.relayUrl || an, this.customStoragePrefix = e != null && e.customStoragePrefix ? `:${e.customStoragePrefix}` : "";
    const i = qn({ level: typeof e?.logger == "string" && e.logger ? e.logger : ul.logger, name: xs }), { logger: n, chunkLoggerController: o } = Cn({ opts: i, maxSizeInBytes: e?.maxLogBlobSizeInBytes, loggerOverride: e?.logger });
    this.logChunkController = o, (t = this.logChunkController) != null && t.downloadLogsBlobInBrowser && (window.downloadLogsBlobInBrowser = async () => {
      var a, c;
      (a = this.logChunkController) != null && a.downloadLogsBlobInBrowser && ((c = this.logChunkController) == null || c.downloadLogsBlobInBrowser({ clientId: await this.crypto.getClientId() }));
    }), this.logger = Ie(n, this.name), this.heartbeat = new Nn(), this.crypto = new bp(this, this.logger, e?.keychain), this.history = new Ad(this, this.logger), this.expirer = new Od(this, this.logger), this.storage = e != null && e.storage ? e.storage : new Dn(wr(wr({}, pl), e?.storageOptions)), this.relayer = new Hp({ core: this, logger: this.logger, relayUrl: this.relayUrl, projectId: this.projectId }), this.pairing = new Fd(this, this.logger), this.verify = new Nd(this, this.logger, this.storage), this.echoClient = new Md(this.projectId || "", this.logger), this.linkModeSupportedApps = [], this.eventClient = new jd(this, this.logger, e?.telemetryEnabled), this.setGlobalCore(this);
  }
  static async init(e) {
    const t = new Ws(e);
    await t.initialize();
    const s = await t.crypto.getClientId();
    return await t.storage.setItem(Fl, s), t;
  }
  get context() {
    return xe(this.logger);
  }
  async start() {
    this.initialized || await this.initialize();
  }
  async getLogsBlob() {
    var e;
    return (e = this.logChunkController) == null ? void 0 : e.logsToBlob({ clientId: await this.crypto.getClientId() });
  }
  async addLinkModeSupportedApp(e) {
    this.linkModeSupportedApps.includes(e) || (this.linkModeSupportedApps.push(e), await this.storage.setItem(Yi, this.linkModeSupportedApps));
  }
  async initialize() {
    this.logger.trace("Initialized");
    try {
      await this.crypto.init(), await this.history.init(), await this.expirer.init(), await this.relayer.init(), await this.heartbeat.init(), await this.pairing.init(), this.linkModeSupportedApps = await this.storage.getItem(Yi) || [], this.initialized = !0, this.logger.info("Core Initialization Success");
    } catch (e) {
      throw this.logger.warn(e, `Core Initialization Failure at epoch ${Date.now()}`), this.logger.error(e.message), e;
    }
  }
  getGlobalCore(e = "") {
    try {
      if (this.isGlobalCoreDisabled()) return;
      const t = `_walletConnectCore_${e}`, s = `${t}_count`;
      return globalThis[s] = (globalThis[s] || 0) + 1, globalThis[s] > 1 && console.warn(`WalletConnect Core is already initialized. This is probably a mistake and can lead to unexpected behavior. Init() was called ${globalThis[s]} times.`), globalThis[t];
    } catch (t) {
      console.warn("Failed to get global WalletConnect core", t);
      return;
    }
  }
  setGlobalCore(e) {
    var t;
    try {
      if (this.isGlobalCoreDisabled()) return;
      const s = `_walletConnectCore_${((t = e.opts) == null ? void 0 : t.customStoragePrefix) || ""}`;
      globalThis[s] = e;
    } catch (s) {
      console.warn("Failed to set global WalletConnect core", s);
    }
  }
  isGlobalCoreDisabled() {
    try {
      return typeof process < "u" && process.env.DISABLE_GLOBAL_CORE === "true";
    } catch {
      return !0;
    }
  }
}
const Hd = Ws, vn = "wc", _n = 2, En = "client", Js = `${vn}@${_n}:${En}:`, ds = { name: En, logger: "error" }, br = "WALLETCONNECT_DEEPLINK_CHOICE", Gd = "proposal", vr = "Proposal expired", Wd = "session", dt = E.SEVEN_DAYS, Jd = "engine", ce = { wc_sessionPropose: { req: { ttl: E.FIVE_MINUTES, prompt: !0, tag: 1100 }, res: { ttl: E.FIVE_MINUTES, prompt: !1, tag: 1101 }, reject: { ttl: E.FIVE_MINUTES, prompt: !1, tag: 1120 }, autoReject: { ttl: E.FIVE_MINUTES, prompt: !1, tag: 1121 } }, wc_sessionSettle: { req: { ttl: E.FIVE_MINUTES, prompt: !1, tag: 1102 }, res: { ttl: E.FIVE_MINUTES, prompt: !1, tag: 1103 } }, wc_sessionUpdate: { req: { ttl: E.ONE_DAY, prompt: !1, tag: 1104 }, res: { ttl: E.ONE_DAY, prompt: !1, tag: 1105 } }, wc_sessionExtend: { req: { ttl: E.ONE_DAY, prompt: !1, tag: 1106 }, res: { ttl: E.ONE_DAY, prompt: !1, tag: 1107 } }, wc_sessionRequest: { req: { ttl: E.FIVE_MINUTES, prompt: !0, tag: 1108 }, res: { ttl: E.FIVE_MINUTES, prompt: !1, tag: 1109 } }, wc_sessionEvent: { req: { ttl: E.FIVE_MINUTES, prompt: !0, tag: 1110 }, res: { ttl: E.FIVE_MINUTES, prompt: !1, tag: 1111 } }, wc_sessionDelete: { req: { ttl: E.ONE_DAY, prompt: !1, tag: 1112 }, res: { ttl: E.ONE_DAY, prompt: !1, tag: 1113 } }, wc_sessionPing: { req: { ttl: E.ONE_DAY, prompt: !1, tag: 1114 }, res: { ttl: E.ONE_DAY, prompt: !1, tag: 1115 } }, wc_sessionAuthenticate: { req: { ttl: E.ONE_HOUR, prompt: !0, tag: 1116 }, res: { ttl: E.ONE_HOUR, prompt: !1, tag: 1117 }, reject: { ttl: E.FIVE_MINUTES, prompt: !1, tag: 1118 }, autoReject: { ttl: E.FIVE_MINUTES, prompt: !1, tag: 1119 } } }, gs = { min: E.FIVE_MINUTES, max: E.SEVEN_DAYS }, Le = { idle: "IDLE", active: "ACTIVE" }, Yd = { eth_sendTransaction: { key: "" }, eth_sendRawTransaction: { key: "" }, wallet_sendCalls: { key: "" }, solana_signTransaction: { key: "signature" }, solana_signAllTransactions: { key: "transactions" }, solana_signAndSendTransaction: { key: "signature" }, sui_signAndExecuteTransaction: { key: "digest" }, sui_signTransaction: { key: "" }, hedera_signAndExecuteTransaction: { key: "transactionId" }, hedera_executeTransaction: { key: "transactionId" }, near_signTransaction: { key: "" }, near_signTransactions: { key: "" }, tron_signTransaction: { key: "txID" }, xrpl_signTransaction: { key: "" }, xrpl_signTransactionFor: { key: "" }, algo_signTxn: { key: "" }, sendTransfer: { key: "txid" }, stacks_stxTransfer: { key: "txId" }, polkadot_signTransaction: { key: "" }, cosmos_signDirect: { key: "" } }, Qd = "request", Zd = ["wc_sessionPropose", "wc_sessionRequest", "wc_authRequest", "wc_sessionAuthenticate"], Xd = "wc", eg = "auth", tg = "authKeys", sg = "pairingTopics", ig = "requests", Yt = `${Xd}@${1.5}:${eg}:`, Lt = `${Yt}:PUB_KEY`;
var rg = Object.defineProperty, ng = Object.defineProperties, og = Object.getOwnPropertyDescriptors, _r = Object.getOwnPropertySymbols, ag = Object.prototype.hasOwnProperty, cg = Object.prototype.propertyIsEnumerable, Ns = (r, e, t) => e in r ? rg(r, e, { enumerable: !0, configurable: !0, writable: !0, value: t }) : r[e] = t, B = (r, e) => {
  for (var t in e || (e = {})) ag.call(e, t) && Ns(r, t, e[t]);
  if (_r) for (var t of _r(e)) cg.call(e, t) && Ns(r, t, e[t]);
  return r;
}, he = (r, e) => ng(r, og(e)), m = (r, e, t) => Ns(r, typeof e != "symbol" ? e + "" : e, t);
class hg extends Eo {
  constructor(e) {
    super(e), m(this, "name", Jd), m(this, "events", new Ir()), m(this, "initialized", !1), m(this, "requestQueue", { state: Le.idle, queue: [] }), m(this, "sessionRequestQueue", { state: Le.idle, queue: [] }), m(this, "emittedSessionRequests", new Io({ limit: 500 })), m(this, "requestQueueDelay", E.ONE_SECOND), m(this, "expectedPairingMethodMap", /* @__PURE__ */ new Map()), m(this, "recentlyDeletedMap", /* @__PURE__ */ new Map()), m(this, "recentlyDeletedLimit", 200), m(this, "relayMessageCache", []), m(this, "pendingSessions", /* @__PURE__ */ new Map()), m(this, "init", async () => {
      this.initialized || (await this.cleanup(), this.registerRelayerEvents(), this.registerExpirerEvents(), this.registerPairingEvents(), await this.registerLinkModeListeners(), this.client.core.pairing.register({ methods: Object.keys(ce) }), this.initialized = !0, setTimeout(async () => {
        await this.processPendingMessageEvents(), this.sessionRequestQueue.queue = this.getPendingSessionRequests(), this.processSessionRequestQueue();
      }, E.toMiliseconds(this.requestQueueDelay)));
    }), m(this, "connect", async (t) => {
      var s;
      this.isInitialized(), await this.confirmOnlineStateOrThrow();
      const i = he(B({}, t), { requiredNamespaces: t.requiredNamespaces || {}, optionalNamespaces: t.optionalNamespaces || {} });
      await this.isValidConnect(i), i.optionalNamespaces = Fo(i.requiredNamespaces, i.optionalNamespaces), i.requiredNamespaces = {};
      const { pairingTopic: n, requiredNamespaces: o, optionalNamespaces: a, sessionProperties: c, scopedProperties: h, relays: l, authentication: p, walletPay: d } = i, g = ((s = p?.[0]) == null ? void 0 : s.ttl) || ce.wc_sessionPropose.req.ttl || E.FIVE_MINUTES;
      this.validateRequestExpiry(g);
      let u = n, y, w = !1;
      try {
        if (u) {
          const P = this.client.core.pairing.pairings.get(u);
          this.client.logger.warn("connect() with existing pairing topic is deprecated and will be removed in the next major release."), w = P.active;
        }
      } catch (P) {
        throw this.client.logger.error(`connect() -> pairing.get(${u}) failed`), P;
      }
      if (!u || !w) {
        const { topic: P, uri: M } = await this.client.core.pairing.create({ internal: { skipSubscribe: !0 } });
        u = P, y = M;
      }
      if (!u) {
        const { message: P } = I("NO_MATCHING_KEY", `connect() pairing topic: ${u}`);
        throw new Error(P);
      }
      const _ = await this.client.core.crypto.generateKeyPair(), v = X(g), f = B(he(B(B({ requiredNamespaces: o, optionalNamespaces: a, relays: l ?? [{ protocol: on }], proposer: { publicKey: _, metadata: this.client.metadata }, expiryTimestamp: v, pairingTopic: u }, c && { sessionProperties: c }), h && { scopedProperties: h }), { id: Ue() }), (p || d) && { requests: { authentication: p?.map((P) => {
        const { domain: M, chains: ne, nonce: pe, uri: ve, exp: De, nbf: A, type: b, statement: F, requestId: $, resources: T, signatureTypes: C } = P;
        return { domain: M, chains: ne, nonce: pe, type: b ?? "caip122", aud: ve, version: "1", iat: (/* @__PURE__ */ new Date()).toISOString(), exp: De, nbf: A, statement: F, requestId: $, resources: T, signatureTypes: C };
      }), walletPay: d } }), x = V("session_connect", f.id), { reject: R, resolve: S, done: q } = nt(g, vr), O = ({ id: P }) => {
        P === f.id && (this.client.events.off("proposal_expire", O), this.pendingSessions.delete(f.id), this.events.emit(x, { error: { message: vr, code: 0 } }));
      };
      return this.client.events.on("proposal_expire", O), this.events.once(x, ({ error: P, session: M }) => {
        this.client.events.off("proposal_expire", O), P ? R(P) : M && S(M);
      }), await this.setProposal(f.id, f), await this.sendProposeSession({ proposal: f, publishOpts: { internal: { throwOnFailedPublish: !0 }, tvf: { correlationId: f.id } } }).catch((P) => {
        throw this.deleteProposal(f.id), P;
      }), { uri: y, approval: q };
    }), m(this, "pair", async (t) => {
      this.isInitialized(), await this.confirmOnlineStateOrThrow();
      try {
        return await this.client.core.pairing.pair(t);
      } catch (s) {
        throw this.client.logger.error("pair() failed"), s;
      }
    }), m(this, "approve", async (t) => {
      var s, i, n;
      const o = this.client.core.eventClient.createEvent({ properties: { topic: (s = t?.id) == null ? void 0 : s.toString(), trace: [Ne.session_approve_started] } });
      try {
        this.isInitialized(), await this.confirmOnlineStateOrThrow();
      } catch (M) {
        throw o.setError(it.no_internet_connection), M;
      }
      try {
        await this.isValidProposalId(t?.id);
      } catch (M) {
        throw this.client.logger.error(`approve() -> proposal.get(${t?.id}) failed`), o.setError(it.proposal_not_found), M;
      }
      try {
        await this.isValidApprove(t);
      } catch (M) {
        throw this.client.logger.error("approve() -> isValidApprove() failed"), o.setError(it.session_approve_namespace_validation_failure), M;
      }
      const { id: a, relayProtocol: c, namespaces: h, sessionProperties: l, scopedProperties: p, sessionConfig: d, proposalRequestsResponses: g } = t, u = this.client.proposal.get(a);
      this.client.core.eventClient.deleteEvent({ eventId: o.eventId });
      const { pairingTopic: y, proposer: w, requiredNamespaces: _, optionalNamespaces: v } = u;
      let f = (i = this.client.core.eventClient) == null ? void 0 : i.getEvent({ topic: y });
      f || (f = (n = this.client.core.eventClient) == null ? void 0 : n.createEvent({ type: Ne.session_approve_started, properties: { topic: y, trace: [Ne.session_approve_started, Ne.session_namespaces_validation_success] } }));
      const x = await this.client.core.crypto.generateKeyPair(), R = w.publicKey, S = await this.client.core.crypto.generateSharedKey(x, R), q = he(B(B(B({ relay: { protocol: c ?? "irn" }, namespaces: h, controller: { publicKey: x, metadata: this.client.metadata }, expiry: X(dt) }, l && { sessionProperties: l }), p && { scopedProperties: p }), d && { sessionConfig: d }), { proposalRequestsResponses: g }), O = W.relay;
      f.addTrace(Ne.subscribing_session_topic);
      try {
        await this.client.core.relayer.subscribe(S, { transportType: O, internal: { skipSubscribe: !0 } });
      } catch (M) {
        throw f.setError(it.subscribe_session_topic_failure), M;
      }
      f.addTrace(Ne.subscribe_session_topic_success);
      const P = he(B({}, q), { topic: S, requiredNamespaces: _, optionalNamespaces: v, pairingTopic: y, acknowledged: !1, self: q.controller, peer: { publicKey: w.publicKey, metadata: w.metadata }, controller: x, transportType: W.relay, authentication: g?.authentication, walletPayResult: g?.walletPay });
      await this.client.session.set(S, P), f.addTrace(Ne.store_session);
      try {
        await this.sendApproveSession({ sessionTopic: S, proposal: u, pairingProposalResponse: { relay: { protocol: c ?? "irn" }, responderPublicKey: x }, sessionSettleRequest: q, publishOpts: { internal: { throwOnFailedPublish: !0 }, tvf: B({ correlationId: a }, this.getTVFApproveParams(P)) } }), f.addTrace(Ne.session_approve_publish_success);
      } catch (M) {
        throw this.client.logger.error(M), this.client.session.delete(S, ge("USER_DISCONNECTED")), await this.client.core.relayer.unsubscribe(S), M;
      }
      return this.client.core.eventClient.deleteEvent({ eventId: f.eventId }), await this.client.core.pairing.updateMetadata({ topic: y, metadata: w.metadata }), await this.deleteProposal(a), await this.client.core.pairing.activate({ topic: y }), await this.setExpiry(S, X(dt)), { topic: S, acknowledged: () => Promise.resolve(this.client.session.get(S)) };
    }), m(this, "reject", async (t) => {
      this.isInitialized(), await this.confirmOnlineStateOrThrow();
      try {
        await this.isValidReject(t);
      } catch (o) {
        throw this.client.logger.error("reject() -> isValidReject() failed"), o;
      }
      const { id: s, reason: i } = t;
      let n;
      try {
        n = this.client.proposal.get(s).pairingTopic;
      } catch (o) {
        throw this.client.logger.error(`reject() -> proposal.get(${s}) failed`), o;
      }
      n && await this.sendError({ id: s, topic: n, error: i, rpcOpts: ce.wc_sessionPropose.reject }), await this.deleteProposal(s);
    }), m(this, "update", async (t) => {
      this.isInitialized(), await this.confirmOnlineStateOrThrow();
      try {
        await this.isValidUpdate(t);
      } catch (p) {
        throw this.client.logger.error("update() -> isValidUpdate() failed"), p;
      }
      const { topic: s, namespaces: i } = t, { done: n, resolve: o, reject: a } = nt(E.FIVE_MINUTES, "Session update request expired without receiving any acknowledgement"), c = Ue(), h = tt().toString(), l = this.client.session.get(s).namespaces;
      return this.events.once(V("session_update", c), ({ error: p }) => {
        p ? a(p) : o();
      }), await this.client.session.update(s, { namespaces: i }), await this.sendRequest({ topic: s, method: "wc_sessionUpdate", params: { namespaces: i }, throwOnFailedPublish: !0, clientRpcId: c, relayRpcId: h }).catch((p) => {
        this.client.logger.error(p), this.client.session.update(s, { namespaces: l }), a(p);
      }), { acknowledged: n };
    }), m(this, "extend", async (t) => {
      this.isInitialized(), await this.confirmOnlineStateOrThrow();
      try {
        await this.isValidExtend(t);
      } catch (c) {
        throw this.client.logger.error("extend() -> isValidExtend() failed"), c;
      }
      const { topic: s } = t, i = Ue(), { done: n, resolve: o, reject: a } = nt(E.FIVE_MINUTES, "Session extend request expired without receiving any acknowledgement");
      return this.events.once(V("session_extend", i), ({ error: c }) => {
        c ? a(c) : o();
      }), await this.setExpiry(s, X(dt)), this.sendRequest({ topic: s, method: "wc_sessionExtend", params: {}, clientRpcId: i, throwOnFailedPublish: !0 }).catch((c) => {
        a(c);
      }), { acknowledged: n };
    }), m(this, "request", async (t) => {
      this.isInitialized();
      try {
        await this.isValidRequest(t);
      } catch (w) {
        throw this.client.logger.error("request() -> isValidRequest() failed"), w;
      }
      const { chainId: s, request: i, topic: n, expiry: o = ce.wc_sessionRequest.req.ttl } = t, a = this.client.session.get(n);
      a?.transportType === W.relay && await this.confirmOnlineStateOrThrow();
      const c = Ue(), h = tt().toString(), { done: l, resolve: p, reject: d } = nt(o, "Request expired. Please try again.");
      this.events.once(V("session_request", c), ({ error: w, result: _ }) => {
        w ? d(w) : p(_);
      });
      const g = "wc_sessionRequest", u = this.getAppLinkIfEnabled(a.peer.metadata, a.transportType);
      if (u) return await this.sendRequest({ clientRpcId: c, relayRpcId: h, topic: n, method: g, params: { request: he(B({}, i), { expiryTimestamp: X(o) }), chainId: s }, expiry: o, throwOnFailedPublish: !0, appLink: u }).catch((w) => d(w)), this.client.events.emit("session_request_sent", { topic: n, request: i, chainId: s, id: c }), await l();
      const y = { request: he(B({}, i), { expiryTimestamp: X(o) }), chainId: s };
      return await Promise.all([new Promise(async (w) => {
        await this.sendRequest({ clientRpcId: c, relayRpcId: h, topic: n, method: g, params: y, expiry: o, throwOnFailedPublish: !0, tvf: this.getTVFParams(c, y) }).catch((_) => d(_)), this.client.events.emit("session_request_sent", { topic: n, request: i, chainId: s, id: c }), w();
      }), new Promise(async (w) => {
        var _;
        if (!((_ = a.sessionConfig) != null && _.disableDeepLink)) {
          const v = await Po(this.client.core.storage, br);
          await Ro({ id: c, topic: n, wcDeepLink: v });
        }
        w();
      }), l()]).then((w) => w[2]);
    }), m(this, "respond", async (t) => {
      var s, i;
      this.isInitialized();
      const n = this.client.core.eventClient.createEvent({ properties: { topic: t?.topic || ((i = (s = t?.response) == null ? void 0 : s.id) == null ? void 0 : i.toString()), trace: [Ne.session_request_response_started] } });
      try {
        await this.isValidRespond(t);
      } catch (p) {
        throw n.addTrace(p?.message), n.setError(it.session_request_response_validation_failure), p;
      }
      n.addTrace(Ne.session_request_response_validation_success);
      const { topic: o, response: a } = t, { id: c } = a, h = this.client.session.get(o);
      h.transportType === W.relay && await this.confirmOnlineStateOrThrow();
      const l = this.getAppLinkIfEnabled(h.peer.metadata, h.transportType);
      try {
        n.addTrace(Ne.session_request_response_publish_started), je(a) ? await this.sendResult({ id: c, topic: o, result: a.result, throwOnFailedPublish: !0, appLink: l }) : $e(a) && await this.sendError({ id: c, topic: o, error: a.error, appLink: l }), this.cleanupAfterResponse(t);
      } catch (p) {
        throw n.addTrace(p?.message), n.setError(it.session_request_response_publish_failure), p;
      }
    }), m(this, "ping", async (t) => {
      this.isInitialized(), await this.confirmOnlineStateOrThrow();
      try {
        await this.isValidPing(t);
      } catch (i) {
        throw this.client.logger.error("ping() -> isValidPing() failed"), i;
      }
      const { topic: s } = t;
      if (this.client.session.keys.includes(s)) {
        const i = Ue(), n = tt().toString(), { done: o, resolve: a, reject: c } = nt(E.FIVE_MINUTES, "Ping request expired without receiving any acknowledgement");
        this.events.once(V("session_ping", i), ({ error: h }) => {
          h ? c(h) : a();
        }), await Promise.all([this.sendRequest({ topic: s, method: "wc_sessionPing", params: {}, throwOnFailedPublish: !0, clientRpcId: i, relayRpcId: n }), o()]);
      } else this.client.core.pairing.pairings.keys.includes(s) && (this.client.logger.warn("ping() on pairing topic is deprecated and will be removed in the next major release."), await this.client.core.pairing.ping({ topic: s }));
    }), m(this, "emit", async (t) => {
      this.isInitialized(), await this.confirmOnlineStateOrThrow(), await this.isValidEmit(t);
      const { topic: s, event: i, chainId: n } = t, o = tt().toString(), a = Ue();
      await this.sendRequest({ topic: s, method: "wc_sessionEvent", params: { event: i, chainId: n }, throwOnFailedPublish: !0, relayRpcId: o, clientRpcId: a });
    }), m(this, "disconnect", async (t) => {
      this.isInitialized(), await this.confirmOnlineStateOrThrow(), await this.isValidDisconnect(t);
      const { topic: s } = t;
      if (this.client.session.keys.includes(s)) await this.sendRequest({ topic: s, method: "wc_sessionDelete", params: ge("USER_DISCONNECTED"), throwOnFailedPublish: !0 }), await this.deleteSession({ topic: s, emitEvent: !1 });
      else if (this.client.core.pairing.pairings.keys.includes(s)) await this.client.core.pairing.disconnect({ topic: s });
      else {
        const { message: i } = I("MISMATCHED_TOPIC", `Session or pairing topic not found: ${s}`);
        throw new Error(i);
      }
    }), m(this, "find", (t) => (this.isInitialized(), this.client.session.getAll().filter((s) => Ao(s, t)))), m(this, "getPendingSessionRequests", () => this.client.pendingRequest.getAll()), m(this, "authenticate", async (t, s) => {
      var i;
      this.isInitialized(), this.isValidAuthenticate(t);
      const n = s && this.client.core.linkModeSupportedApps.includes(s) && ((i = this.client.metadata.redirect) == null ? void 0 : i.linkMode), o = n ? W.link_mode : W.relay;
      o === W.relay && await this.confirmOnlineStateOrThrow();
      const { chains: a, statement: c = "", uri: h, domain: l, nonce: p, type: d, exp: g, nbf: u, methods: y = [], expiry: w } = t, _ = [...t.resources || []], { topic: v, uri: f } = await this.client.core.pairing.create({ methods: ["wc_sessionAuthenticate"], transportType: o });
      this.client.logger.info({ message: "Generated new pairing", pairing: { topic: v, uri: f } });
      const x = await this.client.core.crypto.generateKeyPair(), R = Nt(x);
      if (await Promise.all([this.client.auth.authKeys.set(Lt, { responseTopic: R, publicKey: x }), this.client.auth.pairingTopics.set(R, { topic: R, pairingTopic: v })]), await this.client.core.relayer.subscribe(R, { transportType: o }), this.client.logger.info(`sending request to new pairing topic: ${v}`), y.length > 0) {
        const { namespace: T } = Xt(a[0]);
        let C = $o(T, "request", y);
        es(_) && (C = To(C, _.pop())), _.push(C);
      }
      const S = w && w > ce.wc_sessionAuthenticate.req.ttl ? w : ce.wc_sessionAuthenticate.req.ttl, q = { authPayload: { type: d ?? "caip122", chains: a, statement: c, aud: h, domain: l, version: "1", nonce: p, iat: (/* @__PURE__ */ new Date()).toISOString(), exp: g, nbf: u, resources: _ }, requester: { publicKey: x, metadata: this.client.metadata }, expiryTimestamp: X(S) }, O = { eip155: { chains: a, methods: [.../* @__PURE__ */ new Set(["personal_sign", ...y])], events: ["chainChanged", "accountsChanged"] } }, P = { requiredNamespaces: {}, optionalNamespaces: O, relays: [{ protocol: "irn" }], pairingTopic: v, proposer: { publicKey: x, metadata: this.client.metadata }, expiryTimestamp: X(ce.wc_sessionPropose.req.ttl), id: Ue() }, { done: M, resolve: ne, reject: pe } = nt(S, "Request expired"), ve = Ue(), De = V("session_connect", P.id), A = V("session_request", ve), b = async ({ error: T, session: C }) => {
        this.events.off(A, F), T ? pe(T) : C && ne({ session: C });
      }, F = async (T) => {
        var C, U, G;
        if (await this.deletePendingAuthRequest(ve, { message: "fulfilled", code: 0 }), T.error) {
          const te = ge("WC_METHOD_UNSUPPORTED", "wc_sessionAuthenticate");
          return T.error.code === te.code ? void 0 : (this.events.off(De, b), pe(T.error.message));
        }
        await this.deleteProposal(P.id), this.events.off(De, b);
        const { cacaos: z, responder: j } = T.result, J = [], oe = [];
        for (const te of z) {
          await pi({ cacao: te, projectId: this.client.core.projectId }) || (this.client.logger.error(te, "Signature verification failed"), pe(ge("SESSION_SETTLEMENT_FAILED", "Signature verification failed")));
          const { p: Se } = te, Oe = es(Se.resources), st = [di(Se.iss)], $t = gi(Se.iss);
          if (Oe) {
            const ht = yi(Oe), Qt = fi(Oe);
            J.push(...ht), st.push(...Qt);
          }
          for (const ht of st) oe.push(`${ht}:${$t}`);
        }
        const ye = await this.client.core.crypto.generateSharedKey(x, j.publicKey);
        let fe;
        J.length > 0 && (fe = { topic: ye, acknowledged: !0, self: { publicKey: x, metadata: this.client.metadata }, peer: j, controller: j.publicKey, expiry: X(dt), requiredNamespaces: {}, optionalNamespaces: {}, relay: { protocol: "irn" }, pairingTopic: v, namespaces: mi([...new Set(J)], [...new Set(oe)]), transportType: o }, await this.client.core.relayer.subscribe(ye, { transportType: o }), await this.client.session.set(ye, fe), v && await this.client.core.pairing.updateMetadata({ topic: v, metadata: j.metadata }), fe = this.client.session.get(ye)), (C = this.client.metadata.redirect) != null && C.linkMode && (U = j.metadata.redirect) != null && U.linkMode && (G = j.metadata.redirect) != null && G.universal && s && (this.client.core.addLinkModeSupportedApp(j.metadata.redirect.universal), this.client.session.update(ye, { transportType: W.link_mode })), ne({ auths: z, session: fe });
      };
      this.events.once(De, b), this.events.once(A, F);
      let $;
      try {
        if (n) {
          const T = Je("wc_sessionAuthenticate", q, ve);
          this.client.core.history.set(v, T);
          const C = await this.client.core.crypto.encode("", T, { type: Oo, encoding: mt });
          $ = Tt(s, v, C);
        } else await Promise.all([this.sendRequest({ topic: v, method: "wc_sessionAuthenticate", params: q, expiry: t.expiry, throwOnFailedPublish: !0, clientRpcId: ve }), this.sendRequest({ topic: v, method: "wc_sessionPropose", params: P, expiry: ce.wc_sessionPropose.req.ttl, throwOnFailedPublish: !0, clientRpcId: P.id })]);
      } catch (T) {
        throw this.events.off(De, b), this.events.off(A, F), T;
      }
      return await this.setProposal(P.id, P), await this.setAuthRequest(ve, { request: he(B({}, q), { verifyContext: {} }), pairingTopic: v, transportType: o }), { uri: $ ?? f, response: M };
    }), m(this, "approveSessionAuthenticate", async (t) => {
      const { id: s, auths: i } = t, n = this.client.core.eventClient.createEvent({ properties: { topic: s.toString(), trace: [rt.authenticated_session_approve_started] } });
      try {
        this.isInitialized();
      } catch (w) {
        throw n.setError(_t.no_internet_connection), w;
      }
      const o = this.getPendingAuthRequest(s);
      if (!o) throw n.setError(_t.authenticated_session_pending_request_not_found), new Error(`Could not find pending auth request with id ${s}`);
      const a = o.transportType || W.relay;
      a === W.relay && await this.confirmOnlineStateOrThrow();
      const c = o.requester.publicKey, h = await this.client.core.crypto.generateKeyPair(), l = Nt(c), p = { type: Dt, receiverPublicKey: c, senderPublicKey: h }, d = [], g = [];
      for (const w of i) {
        if (!await pi({ cacao: w, projectId: this.client.core.projectId })) {
          n.setError(_t.invalid_cacao);
          const R = ge("SESSION_SETTLEMENT_FAILED", "Signature verification failed");
          throw await this.sendError({ id: s, topic: l, error: R, encodeOpts: p }), new Error(R.message);
        }
        n.addTrace(rt.cacaos_verified);
        const { p: _ } = w, v = es(_.resources), f = [di(_.iss)], x = gi(_.iss);
        if (v) {
          const R = yi(v), S = fi(v);
          d.push(...R), f.push(...S);
        }
        for (const R of f) g.push(`${R}:${x}`);
      }
      const u = await this.client.core.crypto.generateSharedKey(h, c);
      n.addTrace(rt.create_authenticated_session_topic);
      let y;
      if (d?.length > 0) {
        y = { topic: u, acknowledged: !0, self: { publicKey: h, metadata: this.client.metadata }, peer: { publicKey: c, metadata: o.requester.metadata }, controller: c, expiry: X(dt), authentication: i, requiredNamespaces: {}, optionalNamespaces: {}, relay: { protocol: "irn" }, pairingTopic: o.pairingTopic, namespaces: mi([...new Set(d)], [...new Set(g)]), transportType: a }, n.addTrace(rt.subscribing_authenticated_session_topic);
        try {
          await this.client.core.relayer.subscribe(u, { transportType: a });
        } catch (w) {
          throw n.setError(_t.subscribe_authenticated_session_topic_failure), w;
        }
        n.addTrace(rt.subscribe_authenticated_session_topic_success), await this.client.session.set(u, y), n.addTrace(rt.store_authenticated_session), await this.client.core.pairing.updateMetadata({ topic: o.pairingTopic, metadata: o.requester.metadata });
      }
      n.addTrace(rt.publishing_authenticated_session_approve);
      try {
        await this.sendResult({ topic: l, id: s, result: { cacaos: i, responder: { publicKey: h, metadata: this.client.metadata } }, encodeOpts: p, throwOnFailedPublish: !0, appLink: this.getAppLinkIfEnabled(o.requester.metadata, a) });
      } catch (w) {
        throw n.setError(_t.authenticated_session_approve_publish_failure), w;
      }
      return await this.client.auth.requests.delete(s, { message: "fulfilled", code: 0 }), await this.client.core.pairing.activate({ topic: o.pairingTopic }), this.client.core.eventClient.deleteEvent({ eventId: n.eventId }), { session: y };
    }), m(this, "rejectSessionAuthenticate", async (t) => {
      this.isInitialized();
      const { id: s, reason: i } = t, n = this.getPendingAuthRequest(s);
      if (!n) throw new Error(`Could not find pending auth request with id ${s}`);
      n.transportType === W.relay && await this.confirmOnlineStateOrThrow();
      const o = n.requester.publicKey, a = await this.client.core.crypto.generateKeyPair(), c = Nt(o), h = { type: Dt, receiverPublicKey: o, senderPublicKey: a };
      await this.sendError({ id: s, topic: c, error: i, encodeOpts: h, rpcOpts: ce.wc_sessionAuthenticate.reject, appLink: this.getAppLinkIfEnabled(n.requester.metadata, n.transportType) }), await this.client.auth.requests.delete(s, { message: "rejected", code: 0 }), await this.deleteProposal(s);
    }), m(this, "formatAuthMessage", (t) => {
      this.isInitialized();
      const { request: s, iss: i } = t;
      return qo(s, i);
    }), m(this, "processRelayMessageCache", () => {
      setTimeout(async () => {
        if (this.relayMessageCache.length !== 0) for (; this.relayMessageCache.length > 0; ) try {
          const t = this.relayMessageCache.shift();
          t && await this.onRelayMessage(t);
        } catch (t) {
          this.client.logger.error(t);
        }
      }, 50);
    }), m(this, "cleanupDuplicatePairings", async (t) => {
      if (t.pairingTopic) try {
        const s = this.client.core.pairing.pairings.get(t.pairingTopic), i = this.client.core.pairing.pairings.getAll().filter((n) => {
          var o, a;
          return ((o = n.peerMetadata) == null ? void 0 : o.url) && ((a = n.peerMetadata) == null ? void 0 : a.url) === t.peer.metadata.url && n.topic && n.topic !== s.topic;
        });
        if (i.length === 0) return;
        this.client.logger.info(`Cleaning up ${i.length} duplicate pairing(s)`), await Promise.all(i.map((n) => this.client.core.pairing.disconnect({ topic: n.topic }))), this.client.logger.info("Duplicate pairings clean up finished");
      } catch (s) {
        this.client.logger.error(s);
      }
    }), m(this, "deleteSession", async (t) => {
      var s;
      const { topic: i, expirerHasDeleted: n = !1, emitEvent: o = !0, id: a = 0 } = t, { self: c } = this.client.session.get(i);
      await this.client.core.relayer.unsubscribe(i), await this.client.session.delete(i, ge("USER_DISCONNECTED")), this.addToRecentlyDeleted(i, "session"), this.client.core.crypto.keychain.has(c.publicKey) && await this.client.core.crypto.deleteKeyPair(c.publicKey), this.client.core.crypto.keychain.has(i) && await this.client.core.crypto.deleteSymKey(i), n || this.client.core.expirer.del(i), this.client.core.storage.removeItem(br).catch((h) => this.client.logger.warn(h)), i === ((s = this.sessionRequestQueue.queue[0]) == null ? void 0 : s.topic) && (this.sessionRequestQueue.state = Le.idle), await Promise.all(this.getPendingSessionRequests().filter((h) => h.topic === i).map((h) => this.deletePendingSessionRequest(h.id, ge("USER_DISCONNECTED")))), o && this.client.events.emit("session_delete", { id: a, topic: i });
    }), m(this, "deleteProposal", async (t, s) => {
      if (s) try {
        const i = this.client.proposal.get(t);
        this.client.core.eventClient.getEvent({ topic: i.pairingTopic })?.setError(it.proposal_expired);
      } catch {
      }
      await Promise.all([this.client.proposal.delete(t, ge("USER_DISCONNECTED")), s ? Promise.resolve() : this.client.core.expirer.del(t)]), this.addToRecentlyDeleted(t, "proposal");
    }), m(this, "deletePendingSessionRequest", async (t, s, i = !1) => {
      await Promise.all([this.client.pendingRequest.delete(t, s), i ? Promise.resolve() : this.client.core.expirer.del(t)]), this.addToRecentlyDeleted(t, "request"), this.sessionRequestQueue.queue = this.sessionRequestQueue.queue.filter((n) => n.id !== t), i && (this.sessionRequestQueue.state = Le.idle, this.client.events.emit("session_request_expire", { id: t }));
    }), m(this, "deletePendingAuthRequest", async (t, s, i = !1) => {
      await Promise.all([this.client.auth.requests.delete(t, s), i ? Promise.resolve() : this.client.core.expirer.del(t)]);
    }), m(this, "setExpiry", async (t, s) => {
      this.client.session.keys.includes(t) && (this.client.core.expirer.set(t, s), await this.client.session.update(t, { expiry: s }));
    }), m(this, "setProposal", async (t, s) => {
      this.client.core.expirer.set(t, X(ce.wc_sessionPropose.req.ttl)), await this.client.proposal.set(t, s);
    }), m(this, "setAuthRequest", async (t, s) => {
      const { request: i, pairingTopic: n, transportType: o = W.relay } = s;
      this.client.core.expirer.set(t, i.expiryTimestamp), await this.client.auth.requests.set(t, { authPayload: i.authPayload, requester: i.requester, expiryTimestamp: i.expiryTimestamp, id: t, pairingTopic: n, verifyContext: i.verifyContext, transportType: o });
    }), m(this, "setPendingSessionRequest", async (t) => {
      const { id: s, topic: i, params: n, verifyContext: o } = t, a = n.request.expiryTimestamp || X(ce.wc_sessionRequest.req.ttl);
      this.client.core.expirer.set(s, a), await this.client.pendingRequest.set(s, { id: s, topic: i, params: n, verifyContext: o });
    }), m(this, "sendRequest", async (t) => {
      const { topic: s, method: i, params: n, expiry: o, relayRpcId: a, clientRpcId: c, throwOnFailedPublish: h, appLink: l, tvf: p, publishOpts: d = {} } = t, g = Je(i, n, c);
      let u;
      const y = !!l;
      try {
        const v = y ? mt : We;
        u = await this.client.core.crypto.encode(s, g, { encoding: v });
      } catch (v) {
        throw await this.cleanup(), this.client.logger.error(`sendRequest() -> core.crypto.encode() for topic ${s} failed`), v;
      }
      let w;
      if (Zd.includes(i)) {
        const v = Ae(JSON.stringify(g)), f = Ae(u);
        w = await this.client.core.verify.register({ id: f, decryptedId: v });
      }
      const _ = B(B({}, ce[i].req), d);
      if (_.attestation = w, o && (_.ttl = o), a && (_.id = a), this.client.core.history.set(s, g), y) {
        const v = Tt(l, s, u);
        await global.Linking.openURL(v, this.client.name);
      } else _.tvf = he(B({}, p), { correlationId: g.id }), h ? (_.internal = he(B({}, _.internal), { throwOnFailedPublish: !0 }), await this.client.core.relayer.publish(s, u, _)) : this.client.core.relayer.publish(s, u, _).catch((v) => this.client.logger.error(v));
      return g.id;
    }), m(this, "sendProposeSession", async (t) => {
      const { proposal: s, publishOpts: i } = t, n = Je("wc_sessionPropose", s, s.id);
      this.client.core.history.set(s.pairingTopic, n);
      const o = await this.client.core.crypto.encode(s.pairingTopic, n, { encoding: We }), a = Ae(JSON.stringify(n)), c = Ae(o), h = await this.client.core.verify.register({ id: c, decryptedId: a });
      await this.client.core.relayer.publishCustom({ payload: { pairingTopic: s.pairingTopic, sessionProposal: o }, opts: he(B({}, i), { publishMethod: "wc_proposeSession", attestation: h }) });
    }), m(this, "sendApproveSession", async (t) => {
      const { sessionTopic: s, pairingProposalResponse: i, proposal: n, sessionSettleRequest: o, publishOpts: a } = t, c = Vt(n.id, i), h = await this.client.core.crypto.encode(n.pairingTopic, c, { encoding: We }), l = Je("wc_sessionSettle", o, a?.id), p = await this.client.core.crypto.encode(s, l, { encoding: We });
      this.client.core.history.set(s, l), await this.client.core.relayer.publishCustom({ payload: { sessionTopic: s, pairingTopic: n.pairingTopic, sessionProposalResponse: h, sessionSettlementRequest: p }, opts: he(B({}, a), { publishMethod: "wc_approveSession" }) });
    }), m(this, "sendResult", async (t) => {
      const { id: s, topic: i, result: n, throwOnFailedPublish: o, encodeOpts: a, appLink: c } = t, h = Vt(s, n);
      let l;
      const p = c && typeof (global == null ? void 0 : global.Linking) < "u";
      try {
        const u = p ? mt : We;
        l = await this.client.core.crypto.encode(i, h, he(B({}, a || {}), { encoding: u }));
      } catch (u) {
        throw await this.cleanup(), this.client.logger.error(`sendResult() -> core.crypto.encode() for topic ${i} failed`), u;
      }
      let d, g;
      try {
        d = await this.client.core.history.get(i, s);
        const u = d.request;
        try {
          g = this.getTVFParams(s, u.params, n);
        } catch (y) {
          this.client.logger.warn(`sendResult() -> getTVFParams() failed: ${y?.message}`);
        }
      } catch (u) {
        throw this.client.logger.error(`sendResult() -> history.get(${i}, ${s}) failed`), u;
      }
      if (p) {
        const u = Tt(c, i, l);
        await global.Linking.openURL(u, this.client.name);
      } else {
        const u = d.request.method, y = ce[u].res;
        y.tvf = he(B({}, g), { correlationId: s }), o ? (y.internal = he(B({}, y.internal), { throwOnFailedPublish: !0 }), await this.client.core.relayer.publish(i, l, y)) : this.client.core.relayer.publish(i, l, y).catch((w) => this.client.logger.error(w));
      }
      await this.client.core.history.resolve(h);
    }), m(this, "sendError", async (t) => {
      const { id: s, topic: i, error: n, encodeOpts: o, rpcOpts: a, appLink: c } = t, h = Hs(s, n);
      let l;
      const p = c && typeof (global == null ? void 0 : global.Linking) < "u";
      try {
        const g = p ? mt : We;
        l = await this.client.core.crypto.encode(i, h, he(B({}, o || {}), { encoding: g }));
      } catch (g) {
        throw await this.cleanup(), this.client.logger.error(`sendError() -> core.crypto.encode() for topic ${i} failed`), g;
      }
      let d;
      try {
        d = await this.client.core.history.get(i, s);
      } catch (g) {
        throw this.client.logger.error(`sendError() -> history.get(${i}, ${s}) failed`), g;
      }
      if (p) {
        const g = Tt(c, i, l);
        await global.Linking.openURL(g, this.client.name);
      } else {
        const g = d.request.method, u = a || ce[g].res;
        this.client.core.relayer.publish(i, l, u);
      }
      await this.client.core.history.resolve(h);
    }), m(this, "cleanup", async () => {
      const t = [], s = [];
      this.client.session.getAll().forEach((i) => {
        let n = !1;
        et(i.expiry) && (n = !0), this.client.core.crypto.keychain.has(i.topic) || (n = !0), n && t.push(i.topic);
      }), this.client.proposal.getAll().forEach((i) => {
        et(i.expiryTimestamp) && s.push(i.id);
      }), await Promise.all([...t.map((i) => this.deleteSession({ topic: i })), ...s.map((i) => this.deleteProposal(i))]);
    }), m(this, "onProviderMessageEvent", async (t) => {
      !this.initialized || this.relayMessageCache.length > 0 ? this.relayMessageCache.push(t) : await this.onRelayMessage(t);
    }), m(this, "onRelayEventRequest", async (t) => {
      this.requestQueue.queue.push(t), await this.processRequestsQueue();
    }), m(this, "processRequestsQueue", async () => {
      if (this.requestQueue.state === Le.active) {
        this.client.logger.info("Request queue already active, skipping...");
        return;
      }
      for (this.client.logger.info(`Request queue starting with ${this.requestQueue.queue.length} requests`); this.requestQueue.queue.length > 0; ) {
        this.requestQueue.state = Le.active;
        const t = this.requestQueue.queue.shift();
        if (t) try {
          await this.processRequest(t);
        } catch (s) {
          this.client.logger.warn(s);
        }
      }
      this.requestQueue.state = Le.idle;
    }), m(this, "processRequest", async (t) => {
      const { topic: s, payload: i, attestation: n, transportType: o, encryptedId: a } = t, c = i.method;
      if (!this.shouldIgnorePairingRequest({ topic: s, requestMethod: c })) switch (c) {
        case "wc_sessionPropose":
          return await this.onSessionProposeRequest({ topic: s, payload: i, attestation: n, encryptedId: a });
        case "wc_sessionSettle":
          return await this.onSessionSettleRequest(s, i);
        case "wc_sessionUpdate":
          return await this.onSessionUpdateRequest(s, i);
        case "wc_sessionExtend":
          return await this.onSessionExtendRequest(s, i);
        case "wc_sessionPing":
          return await this.onSessionPingRequest(s, i);
        case "wc_sessionDelete":
          return await this.onSessionDeleteRequest(s, i);
        case "wc_sessionRequest":
          return await this.onSessionRequest({ topic: s, payload: i, attestation: n, encryptedId: a, transportType: o });
        case "wc_sessionEvent":
          return await this.onSessionEventRequest(s, i);
        case "wc_sessionAuthenticate":
          return await this.onSessionAuthenticateRequest({ topic: s, payload: i, attestation: n, encryptedId: a, transportType: o });
        default:
          return this.client.logger.info(`Unsupported request method ${c}`);
      }
    }), m(this, "onRelayEventResponse", async (t) => {
      const { topic: s, payload: i, transportType: n } = t, o = (await this.client.core.history.get(s, i.id)).request.method;
      switch (o) {
        case "wc_sessionPropose":
          return this.onSessionProposeResponse(s, i, n);
        case "wc_sessionSettle":
          return this.onSessionSettleResponse(s, i);
        case "wc_sessionUpdate":
          return this.onSessionUpdateResponse(s, i);
        case "wc_sessionExtend":
          return this.onSessionExtendResponse(s, i);
        case "wc_sessionPing":
          return this.onSessionPingResponse(s, i);
        case "wc_sessionRequest":
          return this.onSessionRequestResponse(s, i);
        case "wc_sessionAuthenticate":
          return this.onSessionAuthenticateResponse(s, i);
        default:
          return this.client.logger.info(`Unsupported response method ${o}`);
      }
    }), m(this, "onRelayEventUnknownPayload", (t) => {
      const { topic: s } = t, { message: i } = I("MISSING_OR_INVALID", `Decoded payload on topic ${s} is not identifiable as a JSON-RPC request or a response.`);
      throw new Error(i);
    }), m(this, "shouldIgnorePairingRequest", (t) => {
      const { topic: s, requestMethod: i } = t, n = this.expectedPairingMethodMap.get(s);
      return !n || n.includes(i) ? !1 : !!(n.includes("wc_sessionAuthenticate") && this.client.events.listenerCount("session_authenticate") > 0);
    }), m(this, "onSessionProposeRequest", async (t) => {
      const { topic: s, payload: i, attestation: n, encryptedId: o } = t, { params: a, id: c } = i;
      try {
        const h = this.client.core.eventClient.getEvent({ topic: s });
        this.client.events.listenerCount("session_proposal") === 0 && (console.warn("No listener for session_proposal event"), h?.setError(Ge.proposal_listener_not_found)), this.isValidConnect(B({}, i.params));
        const l = a.expiryTimestamp || X(ce.wc_sessionPropose.req.ttl), p = B({ id: c, pairingTopic: s, expiryTimestamp: l, attestation: n, encryptedId: o }, a);
        await this.setProposal(c, p);
        const d = await this.getVerifyContext({ attestationId: n, hash: Ae(JSON.stringify(i)), encryptedId: o, metadata: p.proposer.metadata });
        h?.addTrace(Be.emit_session_proposal), this.client.events.emit("session_proposal", { id: c, params: p, verifyContext: d });
      } catch (h) {
        await this.sendError({ id: c, topic: s, error: h, rpcOpts: ce.wc_sessionPropose.autoReject }), this.client.logger.error(h);
      }
    }), m(this, "onSessionProposeResponse", async (t, s, i) => {
      const { id: n } = s;
      if (je(s)) {
        const { result: o } = s;
        this.client.logger.trace({ type: "method", method: "onSessionProposeResponse", result: o });
        const a = this.client.proposal.get(n);
        this.client.logger.trace({ type: "method", method: "onSessionProposeResponse", proposal: a });
        const c = a.proposer.publicKey;
        this.client.logger.trace({ type: "method", method: "onSessionProposeResponse", selfPublicKey: c });
        const h = o.responderPublicKey;
        this.client.logger.trace({ type: "method", method: "onSessionProposeResponse", peerPublicKey: h });
        const l = await this.client.core.crypto.generateSharedKey(c, h);
        this.pendingSessions.set(n, { sessionTopic: l, pairingTopic: t, proposalId: n, publicKey: c });
        const p = await this.client.core.relayer.subscribe(l, { transportType: i });
        this.client.logger.trace({ type: "method", method: "onSessionProposeResponse", subscriptionId: p }), await this.client.core.pairing.activate({ topic: t });
      } else if ($e(s)) {
        await this.deleteProposal(n);
        const o = V("session_connect", n);
        if (this.events.listenerCount(o) === 0) throw new Error(`emitting ${o} without any listeners, 954`);
        this.events.emit(o, { error: s.error });
      }
    }), m(this, "onSessionSettleRequest", async (t, s) => {
      const { id: i, params: n } = s;
      try {
        this.isValidSessionSettleRequest(n);
        const { relay: o, controller: a, expiry: c, namespaces: h, sessionProperties: l, scopedProperties: p, sessionConfig: d, proposalRequestsResponses: g } = s.params, u = [...this.pendingSessions.values()].find((_) => _.sessionTopic === t);
        if (!u) return this.client.logger.error(`Pending session not found for topic ${t}`);
        const y = this.client.proposal.get(u.proposalId), w = he(B(B(B({ topic: t, relay: o, expiry: c, namespaces: h, acknowledged: !0, pairingTopic: u.pairingTopic, requiredNamespaces: y.requiredNamespaces, optionalNamespaces: y.optionalNamespaces, controller: a.publicKey, self: { publicKey: u.publicKey, metadata: this.client.metadata }, peer: { publicKey: a.publicKey, metadata: a.metadata } }, l && { sessionProperties: l }), p && { scopedProperties: p }), d && { sessionConfig: d }), { transportType: W.relay, authentication: g?.authentication, walletPayResult: g?.walletPay });
        await this.client.session.set(w.topic, w), await this.setExpiry(w.topic, w.expiry), await this.client.core.pairing.updateMetadata({ topic: u.pairingTopic, metadata: w.peer.metadata }), this.pendingSessions.delete(u.proposalId), this.deleteProposal(u.proposalId, !1), this.cleanupDuplicatePairings(w), await this.sendResult({ id: s.id, topic: t, throwOnFailedPublish: !0, result: !0 }), this.client.events.emit("session_connect", { session: w }), this.events.emit(V("session_connect", u.proposalId), { session: w });
      } catch (o) {
        await this.sendError({ id: i, topic: t, error: o }), this.client.logger.error(o);
      }
    }), m(this, "onSessionSettleResponse", async (t, s) => {
      const { id: i } = s;
      je(s) ? (await this.client.session.update(t, { acknowledged: !0 }), this.events.emit(V("session_approve", i), {})) : $e(s) && (await this.client.session.delete(t, ge("USER_DISCONNECTED")), this.events.emit(V("session_approve", i), { error: s.error }));
    }), m(this, "onSessionUpdateRequest", async (t, s) => {
      const { params: i, id: n } = s;
      try {
        const o = `${t}_session_update`, a = wt.get(o);
        if (a && this.isRequestOutOfSync(a, n)) {
          this.client.logger.warn(`Discarding out of sync request - ${n}`), this.sendError({ id: n, topic: t, error: ge("INVALID_UPDATE_REQUEST") });
          return;
        }
        this.isValidUpdate(B({ topic: t }, i));
        try {
          wt.set(o, n), await this.client.session.update(t, { namespaces: i.namespaces }), await this.sendResult({ id: n, topic: t, result: !0 });
        } catch (c) {
          throw wt.delete(o), c;
        }
        this.client.events.emit("session_update", { id: n, topic: t, params: i });
      } catch (o) {
        await this.sendError({ id: n, topic: t, error: o }), this.client.logger.error(o);
      }
    }), m(this, "isRequestOutOfSync", (t, s) => s.toString().slice(0, -3) < t.toString().slice(0, -3)), m(this, "onSessionUpdateResponse", (t, s) => {
      const { id: i } = s, n = V("session_update", i);
      if (this.events.listenerCount(n) === 0) throw new Error(`emitting ${n} without any listeners`);
      je(s) ? this.events.emit(V("session_update", i), {}) : $e(s) && this.events.emit(V("session_update", i), { error: s.error });
    }), m(this, "onSessionExtendRequest", async (t, s) => {
      const { id: i } = s;
      try {
        this.isValidExtend({ topic: t }), await this.setExpiry(t, X(dt)), await this.sendResult({ id: i, topic: t, result: !0 }), this.client.events.emit("session_extend", { id: i, topic: t });
      } catch (n) {
        await this.sendError({ id: i, topic: t, error: n }), this.client.logger.error(n);
      }
    }), m(this, "onSessionExtendResponse", (t, s) => {
      const { id: i } = s, n = V("session_extend", i);
      if (this.events.listenerCount(n) === 0) throw new Error(`emitting ${n} without any listeners`);
      je(s) ? this.events.emit(V("session_extend", i), {}) : $e(s) && this.events.emit(V("session_extend", i), { error: s.error });
    }), m(this, "onSessionPingRequest", async (t, s) => {
      const { id: i } = s;
      try {
        this.isValidPing({ topic: t }), await this.sendResult({ id: i, topic: t, result: !0, throwOnFailedPublish: !0 }), this.client.events.emit("session_ping", { id: i, topic: t });
      } catch (n) {
        await this.sendError({ id: i, topic: t, error: n }), this.client.logger.error(n);
      }
    }), m(this, "onSessionPingResponse", (t, s) => {
      const { id: i } = s, n = V("session_ping", i);
      setTimeout(() => {
        if (this.events.listenerCount(n) === 0) throw new Error(`emitting ${n} without any listeners 2176`);
        je(s) ? this.events.emit(V("session_ping", i), {}) : $e(s) && this.events.emit(V("session_ping", i), { error: s.error });
      }, 500);
    }), m(this, "onSessionDeleteRequest", async (t, s) => {
      const { id: i } = s;
      try {
        await this.isValidDisconnect({ topic: t, reason: s.params }), this.cleanupPendingSentRequestsForTopic({ topic: t, error: ge("USER_DISCONNECTED") }), await this.deleteSession({ topic: t, id: i });
      } catch (n) {
        this.client.logger.error(n);
      }
    }), m(this, "onSessionRequest", async (t) => {
      var s, i, n;
      const { topic: o, payload: a, attestation: c, encryptedId: h, transportType: l } = t, { id: p, params: d } = a;
      try {
        await this.isValidRequest(B({ topic: o }, d));
        const g = this.client.session.get(o), u = await this.getVerifyContext({ attestationId: c, hash: Ae(JSON.stringify(Je("wc_sessionRequest", d, p))), encryptedId: h, metadata: g.peer.metadata, transportType: l }), y = { id: p, topic: o, params: d, verifyContext: u };
        await this.setPendingSessionRequest(y), l === W.link_mode && (s = g.peer.metadata.redirect) != null && s.universal && this.client.core.addLinkModeSupportedApp((i = g.peer.metadata.redirect) == null ? void 0 : i.universal), (n = this.client.signConfig) != null && n.disableRequestQueue ? this.emitSessionRequest(y) : (this.addSessionRequestToSessionRequestQueue(y), this.processSessionRequestQueue());
      } catch (g) {
        await this.sendError({ id: p, topic: o, error: g }), this.client.logger.error(g);
      }
    }), m(this, "onSessionRequestResponse", (t, s) => {
      const { id: i } = s, n = V("session_request", i);
      if (this.events.listenerCount(n) === 0) throw new Error(`emitting ${n} without any listeners`);
      je(s) ? this.events.emit(V("session_request", i), { result: s.result }) : $e(s) && this.events.emit(V("session_request", i), { error: s.error });
    }), m(this, "onSessionEventRequest", async (t, s) => {
      const { id: i, params: n } = s;
      try {
        const o = `${t}_session_event_${n.event.name}`, a = wt.get(o);
        if (a && this.isRequestOutOfSync(a, i)) {
          this.client.logger.info(`Discarding out of sync request - ${i}`);
          return;
        }
        this.isValidEmit(B({ topic: t }, n)), this.client.events.emit("session_event", { id: i, topic: t, params: n }), wt.set(o, i);
      } catch (o) {
        await this.sendError({ id: i, topic: t, error: o }), this.client.logger.error(o);
      }
    }), m(this, "onSessionAuthenticateResponse", (t, s) => {
      const { id: i } = s;
      this.client.logger.trace({ type: "method", method: "onSessionAuthenticateResponse", topic: t, payload: s }), je(s) ? this.events.emit(V("session_request", i), { result: s.result }) : $e(s) && this.events.emit(V("session_request", i), { error: s.error });
    }), m(this, "onSessionAuthenticateRequest", async (t) => {
      var s;
      const { topic: i, payload: n, attestation: o, encryptedId: a, transportType: c } = t;
      try {
        const { requester: h, authPayload: l, expiryTimestamp: p } = n.params, d = await this.getVerifyContext({ attestationId: o, hash: Ae(JSON.stringify(n)), encryptedId: a, metadata: h.metadata, transportType: c }), g = { requester: h, pairingTopic: i, id: n.id, authPayload: l, verifyContext: d, expiryTimestamp: p };
        await this.setAuthRequest(n.id, { request: g, pairingTopic: i, transportType: c }), c === W.link_mode && (s = h.metadata.redirect) != null && s.universal && this.client.core.addLinkModeSupportedApp(h.metadata.redirect.universal), this.client.events.emit("session_authenticate", { topic: i, params: n.params, id: n.id, verifyContext: d });
      } catch (h) {
        this.client.logger.error(h);
        const l = n.params.requester.publicKey, p = await this.client.core.crypto.generateKeyPair(), d = this.getAppLinkIfEnabled(n.params.requester.metadata, c), g = { type: Dt, receiverPublicKey: l, senderPublicKey: p };
        await this.sendError({ id: n.id, topic: i, error: h, encodeOpts: g, rpcOpts: ce.wc_sessionAuthenticate.autoReject, appLink: d });
      }
    }), m(this, "addSessionRequestToSessionRequestQueue", (t) => {
      this.sessionRequestQueue.queue.push(t);
    }), m(this, "cleanupAfterResponse", (t) => {
      this.deletePendingSessionRequest(t.response.id, { message: "fulfilled", code: 0 }), setTimeout(() => {
        this.sessionRequestQueue.state = Le.idle, this.processSessionRequestQueue();
      }, E.toMiliseconds(this.requestQueueDelay));
    }), m(this, "cleanupPendingSentRequestsForTopic", ({ topic: t, error: s }) => {
      const i = this.client.core.history.pending;
      i.length > 0 && i.filter((n) => n.topic === t && n.request.method === "wc_sessionRequest").forEach((n) => {
        this.events.emit(V("session_request", n.request.id), { error: s });
      });
    }), m(this, "processSessionRequestQueue", () => {
      if (this.sessionRequestQueue.state === Le.active) {
        this.client.logger.info("session request queue is already active.");
        return;
      }
      const t = this.sessionRequestQueue.queue[0];
      if (!t) {
        this.client.logger.info("session request queue is empty.");
        return;
      }
      try {
        this.emitSessionRequest(t);
      } catch (s) {
        this.client.logger.error(s);
      }
    }), m(this, "emitSessionRequest", (t) => {
      if (this.emittedSessionRequests.has(t.id)) {
        this.client.logger.warn({ id: t.id }, `Skipping emitting \`session_request\` event for duplicate request. id: ${t.id}`);
        return;
      }
      this.sessionRequestQueue.state = Le.active, this.emittedSessionRequests.add(t.id), this.client.events.emit("session_request", t);
    }), m(this, "onPairingCreated", (t) => {
      if (t.methods && this.expectedPairingMethodMap.set(t.topic, t.methods), t.active) return;
      const s = this.client.proposal.getAll().find((i) => i.pairingTopic === t.topic);
      s && this.onSessionProposeRequest({ topic: t.topic, payload: Je("wc_sessionPropose", he(B({}, s), { requiredNamespaces: s.requiredNamespaces, optionalNamespaces: s.optionalNamespaces, relays: s.relays, proposer: s.proposer, sessionProperties: s.sessionProperties, scopedProperties: s.scopedProperties }), s.id), attestation: s.attestation, encryptedId: s.encryptedId });
    }), m(this, "isValidConnect", async (t) => {
      if (!be(t)) {
        const { message: h } = I("MISSING_OR_INVALID", `connect() params: ${JSON.stringify(t)}`);
        throw new Error(h);
      }
      const { pairingTopic: s, requiredNamespaces: i, optionalNamespaces: n, sessionProperties: o, scopedProperties: a, relays: c } = t;
      if (Te(s) || await this.isValidPairingTopic(s), !Co(c)) {
        const { message: h } = I("MISSING_OR_INVALID", `connect() relays: ${c}`);
        throw new Error(h);
      }
      if (i && !Te(i) && wi(i) !== 0) {
        const h = "requiredNamespaces are deprecated and are automatically assigned to optionalNamespaces";
        ["fatal", "error", "silent"].includes(this.client.logger.level) ? console.warn(h) : this.client.logger.warn(h), this.validateNamespaces(i, "requiredNamespaces");
      }
      if (n && !Te(n) && wi(n) !== 0 && this.validateNamespaces(n, "optionalNamespaces"), o && !Te(o) && this.validateSessionProps(o, "sessionProperties"), a && !Te(a)) {
        this.validateSessionProps(a, "scopedProperties");
        const h = Object.keys(i || {}).concat(Object.keys(n || {}));
        if (!Object.keys(a).every((l) => h.includes(l.split(":")[0]))) throw new Error(`Scoped properties must be a subset of required/optional namespaces, received: ${JSON.stringify(a)}, required/optional namespaces: ${JSON.stringify(h)}`);
      }
    }), m(this, "validateNamespaces", (t, s) => {
      const i = No(t, "connect()", s);
      if (i) throw new Error(i.message);
    }), m(this, "isValidApprove", async (t) => {
      if (!be(t)) throw new Error(I("MISSING_OR_INVALID", `approve() params: ${t}`).message);
      const { id: s, namespaces: i, relayProtocol: n, sessionProperties: o, scopedProperties: a } = t;
      this.checkRecentlyDeleted(s), await this.isValidProposalId(s);
      const c = this.client.proposal.get(s), h = ts(i, "approve()");
      if (h) throw new Error(h.message);
      const l = bi(c.requiredNamespaces, i, "approve()");
      if (l) throw new Error(l.message);
      if (!Xe(n, !0)) {
        const { message: p } = I("MISSING_OR_INVALID", `approve() relayProtocol: ${n}`);
        throw new Error(p);
      }
      if (o && !Te(o) && this.validateSessionProps(o, "sessionProperties"), a && !Te(a)) {
        this.validateSessionProps(a, "scopedProperties");
        const p = new Set(Object.keys(i));
        if (!Object.keys(a).every((d) => p.has(d.split(":")[0]))) throw new Error(`Scoped properties must be a subset of approved namespaces, received: ${JSON.stringify(a)}, approved namespaces: ${Array.from(p).join(", ")}`);
      }
    }), m(this, "isValidReject", async (t) => {
      if (!be(t)) {
        const { message: n } = I("MISSING_OR_INVALID", `reject() params: ${t}`);
        throw new Error(n);
      }
      const { id: s, reason: i } = t;
      if (this.checkRecentlyDeleted(s), await this.isValidProposalId(s), !Do(i)) {
        const { message: n } = I("MISSING_OR_INVALID", `reject() reason: ${JSON.stringify(i)}`);
        throw new Error(n);
      }
    }), m(this, "isValidSessionSettleRequest", (t) => {
      if (!be(t)) {
        const { message: h } = I("MISSING_OR_INVALID", `onSessionSettleRequest() params: ${t}`);
        throw new Error(h);
      }
      const { relay: s, controller: i, namespaces: n, expiry: o } = t;
      if (!ko(s)) {
        const { message: h } = I("MISSING_OR_INVALID", "onSessionSettleRequest() relay protocol should be a string");
        throw new Error(h);
      }
      const a = Mo(i, "onSessionSettleRequest()");
      if (a) throw new Error(a.message);
      const c = ts(n, "onSessionSettleRequest()");
      if (c) throw new Error(c.message);
      if (et(o)) {
        const { message: h } = I("EXPIRED", "onSessionSettleRequest()");
        throw new Error(h);
      }
    }), m(this, "isValidUpdate", async (t) => {
      if (!be(t)) {
        const { message: c } = I("MISSING_OR_INVALID", `update() params: ${t}`);
        throw new Error(c);
      }
      const { topic: s, namespaces: i } = t;
      this.checkRecentlyDeleted(s), await this.isValidSessionTopic(s);
      const n = this.client.session.get(s), o = ts(i, "update()");
      if (o) throw new Error(o.message);
      const a = bi(n.requiredNamespaces, i, "update()");
      if (a) throw new Error(a.message);
    }), m(this, "isValidExtend", async (t) => {
      if (!be(t)) {
        const { message: i } = I("MISSING_OR_INVALID", `extend() params: ${t}`);
        throw new Error(i);
      }
      const { topic: s } = t;
      this.checkRecentlyDeleted(s), await this.isValidSessionTopic(s);
    }), m(this, "isValidRequest", async (t) => {
      if (!be(t)) {
        const { message: c } = I("MISSING_OR_INVALID", `request() params: ${t}`);
        throw new Error(c);
      }
      const { topic: s, request: i, chainId: n, expiry: o } = t;
      this.checkRecentlyDeleted(s), await this.isValidSessionTopic(s);
      const { namespaces: a } = this.client.session.get(s);
      if (!vi(a, n)) {
        const { message: c } = I("MISSING_OR_INVALID", `request() chainId: ${n}`);
        throw new Error(c);
      }
      if (!Lo(i)) {
        const { message: c } = I("MISSING_OR_INVALID", `request() ${JSON.stringify(i)}`);
        throw new Error(c);
      }
      if (!Bo(a, n, i.method)) {
        const { message: c } = I("MISSING_OR_INVALID", `request() method: ${i.method}`);
        throw new Error(c);
      }
      this.validateRequestExpiry(o);
    }), m(this, "isValidRespond", async (t) => {
      var s;
      if (!be(t)) {
        const { message: a } = I("MISSING_OR_INVALID", `respond() params: ${t}`);
        throw new Error(a);
      }
      const { topic: i, response: n } = t;
      try {
        await this.isValidSessionTopic(i);
      } catch (a) {
        throw (s = t?.response) != null && s.id && this.cleanupAfterResponse(t), a;
      }
      if (!Uo(n)) {
        const { message: a } = I("MISSING_OR_INVALID", `respond() response: ${JSON.stringify(n)}`);
        throw new Error(a);
      }
      const o = this.client.pendingRequest.get(n.id);
      if (o.topic !== i) {
        const { message: a } = I("MISMATCHED_TOPIC", `Request response topic mismatch. reqId: ${n.id}, expected topic: ${o.topic}, received topic: ${i}`);
        throw new Error(a);
      }
    }), m(this, "isValidPing", async (t) => {
      if (!be(t)) {
        const { message: i } = I("MISSING_OR_INVALID", `ping() params: ${t}`);
        throw new Error(i);
      }
      const { topic: s } = t;
      await this.isValidSessionOrPairingTopic(s);
    }), m(this, "isValidEmit", async (t) => {
      if (!be(t)) {
        const { message: a } = I("MISSING_OR_INVALID", `emit() params: ${t}`);
        throw new Error(a);
      }
      const { topic: s, event: i, chainId: n } = t;
      await this.isValidSessionTopic(s);
      const { namespaces: o } = this.client.session.get(s);
      if (!vi(o, n)) {
        const { message: a } = I("MISSING_OR_INVALID", `emit() chainId: ${n}`);
        throw new Error(a);
      }
      if (!jo(i)) {
        const { message: a } = I("MISSING_OR_INVALID", `emit() event: ${JSON.stringify(i)}`);
        throw new Error(a);
      }
      if (!zo(o, n, i.name)) {
        const { message: a } = I("MISSING_OR_INVALID", `emit() event: ${JSON.stringify(i)}`);
        throw new Error(a);
      }
    }), m(this, "isValidDisconnect", async (t) => {
      if (!be(t)) {
        const { message: i } = I("MISSING_OR_INVALID", `disconnect() params: ${t}`);
        throw new Error(i);
      }
      const { topic: s } = t;
      await this.isValidSessionOrPairingTopic(s);
    }), m(this, "isValidAuthenticate", (t) => {
      const { chains: s, uri: i, domain: n, nonce: o } = t;
      if (!Array.isArray(s) || s.length === 0) throw new Error("chains is required and must be a non-empty array");
      if (!Xe(i, !1)) throw new Error("uri is required parameter");
      if (!Xe(n, !1)) throw new Error("domain is required parameter");
      if (!Xe(o, !1)) throw new Error("nonce is required parameter");
      if ([...new Set(s.map((c) => Xt(c).namespace))].length > 1) throw new Error("Multi-namespace requests are not supported. Please request single namespace only.");
      const { namespace: a } = Xt(s[0]);
      if (a !== "eip155") throw new Error("Only eip155 namespace is supported for authenticated sessions. Please use .connect() for non-eip155 chains.");
    }), m(this, "getVerifyContext", async (t) => {
      const { attestationId: s, hash: i, encryptedId: n, metadata: o, transportType: a } = t, c = { verified: { verifyUrl: o.verifyUrl || Ft, validation: "UNKNOWN", origin: o.url || "" } };
      try {
        if (a === W.link_mode) {
          const l = this.getAppLinkIfEnabled(o, a);
          return c.verified.validation = l && new URL(l).origin === new URL(o.url).origin ? "VALID" : "INVALID", c;
        }
        const h = await this.client.core.verify.resolve({ attestationId: s, hash: i, encryptedId: n, verifyUrl: o.verifyUrl });
        h && (c.verified.origin = h.origin, c.verified.isScam = h.isScam, c.verified.validation = h.origin === new URL(o.url).origin ? "VALID" : "INVALID");
      } catch (h) {
        this.client.logger.warn(h);
      }
      return this.client.logger.debug(`Verify context: ${JSON.stringify(c)}`), c;
    }), m(this, "validateSessionProps", (t, s) => {
      Object.values(t).forEach((i, n) => {
        if (i == null) {
          const { message: o } = I("MISSING_OR_INVALID", `${s} must contain an existing value for each key. Received: ${i} for key ${Object.keys(t)[n]}`);
          throw new Error(o);
        }
      });
    }), m(this, "getPendingAuthRequest", (t) => {
      const s = this.client.auth.requests.get(t);
      return typeof s == "object" ? s : void 0;
    }), m(this, "addToRecentlyDeleted", (t, s) => {
      if (this.recentlyDeletedMap.set(t, s), this.recentlyDeletedMap.size >= this.recentlyDeletedLimit) {
        let i = 0;
        const n = this.recentlyDeletedLimit / 2;
        for (const o of this.recentlyDeletedMap.keys()) {
          if (i++ >= n) break;
          this.recentlyDeletedMap.delete(o);
        }
      }
    }), m(this, "checkRecentlyDeleted", (t) => {
      const s = this.recentlyDeletedMap.get(t);
      if (s) {
        const { message: i } = I("MISSING_OR_INVALID", `Record was recently deleted - ${s}: ${t}`);
        throw new Error(i);
      }
    }), m(this, "isLinkModeEnabled", (t, s) => {
      var i, n, o, a, c, h, l, p, d;
      return !t || s !== W.link_mode ? !1 : ((n = (i = this.client.metadata) == null ? void 0 : i.redirect) == null ? void 0 : n.linkMode) === !0 && ((a = (o = this.client.metadata) == null ? void 0 : o.redirect) == null ? void 0 : a.universal) !== void 0 && ((h = (c = this.client.metadata) == null ? void 0 : c.redirect) == null ? void 0 : h.universal) !== "" && ((l = t?.redirect) == null ? void 0 : l.universal) !== void 0 && ((p = t?.redirect) == null ? void 0 : p.universal) !== "" && ((d = t?.redirect) == null ? void 0 : d.linkMode) === !0 && this.client.core.linkModeSupportedApps.includes(t.redirect.universal) && typeof (global == null ? void 0 : global.Linking) < "u";
    }), m(this, "getAppLinkIfEnabled", (t, s) => {
      var i;
      return this.isLinkModeEnabled(t, s) ? (i = t?.redirect) == null ? void 0 : i.universal : void 0;
    }), m(this, "handleLinkModeMessage", ({ url: t }) => {
      if (!t || !t.includes("wc_ev") || !t.includes("topic")) return;
      const s = _i(t, "topic") || "", i = decodeURIComponent(_i(t, "wc_ev") || ""), n = this.client.session.keys.includes(s);
      n && this.client.session.update(s, { transportType: W.link_mode }), this.client.core.dispatchEnvelope({ topic: s, message: i, sessionExists: n });
    }), m(this, "registerLinkModeListeners", async () => {
      var t;
      if (ks() || Vo() && (t = this.client.metadata.redirect) != null && t.linkMode) {
        const s = global == null ? void 0 : global.Linking;
        if (typeof s < "u") {
          s.addEventListener("url", this.handleLinkModeMessage, this.client.name);
          const i = await s.getInitialURL();
          i && setTimeout(() => {
            this.handleLinkModeMessage({ url: i });
          }, 50);
        }
      }
    }), m(this, "getTVFApproveParams", (t) => {
      try {
        const s = Ko(t.namespaces), i = Ho(t.namespaces), n = Go(t.namespaces), o = t.sessionProperties, a = t.scopedProperties;
        return { approvedChains: s, approvedMethods: i, approvedEvents: n, sessionProperties: o, scopedProperties: a };
      } catch (s) {
        return this.client.logger.warn(s, "Error getting TVF approve params"), {};
      }
    }), m(this, "getTVFParams", (t, s, i) => {
      var n, o, a;
      if (!((n = s.request) != null && n.method)) return {};
      const c = { correlationId: t, rpcMethods: [s.request.method], chainId: s.chainId };
      try {
        const h = this.extractTxHashesFromResult(s.request, i);
        c.txHashes = h, c.contractAddresses = this.isValidContractData(s.request.params) ? [(a = (o = s.request.params) == null ? void 0 : o[0]) == null ? void 0 : a.to] : [];
      } catch (h) {
        this.client.logger.warn(h, "Error getting TVF params");
      }
      return c;
    }), m(this, "isValidContractData", (t) => {
      var s;
      if (!t) return !1;
      try {
        const i = t?.data || ((s = t?.[0]) == null ? void 0 : s.data);
        if (!i.startsWith("0x")) return !1;
        const n = i.slice(2);
        return /^[0-9a-fA-F]*$/.test(n) ? n.length % 2 === 0 : !1;
      } catch {
      }
      return !1;
    }), m(this, "extractTxHashesFromResult", (t, s) => {
      var i;
      try {
        if (!s) return [];
        const n = t.method, o = Yd[n];
        if (n === "sui_signTransaction") return [Wo(s.transactionBytes)];
        if (n === "near_signTransaction") return [Ei(s)];
        if (n === "near_signTransactions") return s.map((c) => Ei(c));
        if (n === "xrpl_signTransactionFor" || n === "xrpl_signTransaction") return [(i = s.tx_json) == null ? void 0 : i.hash];
        if (n === "polkadot_signTransaction") return [Jo({ transaction: t.params.transactionPayload, signature: s.signature })];
        if (n === "algo_signTxn") return xi(s) ? s.map((c) => Ii(c)) : [Ii(s)];
        if (n === "cosmos_signDirect") return [Yo(s)];
        if (n === "wallet_sendCalls") return Qo(s);
        if (typeof s == "string") return [s];
        const a = s[o.key];
        if (xi(a)) return n === "solana_signAllTransactions" ? a.map((c) => Zo(c)) : a;
        if (typeof a == "string") return [a];
      } catch (n) {
        this.client.logger.warn(n, "Error extracting tx hashes from result");
      }
      return [];
    });
  }
  async processPendingMessageEvents() {
    try {
      const e = this.client.session.keys, t = this.client.core.relayer.messages.getWithoutAck(e);
      for (const [s, i] of Object.entries(t)) for (const n of i) try {
        await this.onProviderMessageEvent({ topic: s, message: n, publishedAt: Date.now() });
      } catch {
        this.client.logger.warn(`Error processing pending message event for topic: ${s}, message: ${n}`);
      }
    } catch (e) {
      this.client.logger.warn(e, "processPendingMessageEvents failed");
    }
  }
  isInitialized() {
    if (!this.initialized) {
      const { message: e } = I("NOT_INITIALIZED", this.name);
      throw new Error(e);
    }
  }
  async confirmOnlineStateOrThrow() {
    await this.client.core.relayer.confirmOnlineStateOrThrow();
  }
  registerRelayerEvents() {
    this.client.core.relayer.on(Z.message, (e) => {
      this.onProviderMessageEvent(e);
    });
  }
  async onRelayMessage(e) {
    const { topic: t, message: s, attestation: i, transportType: n } = e, { publicKey: o } = this.client.auth.authKeys.keys.includes(Lt) ? this.client.auth.authKeys.get(Lt) : { publicKey: void 0 };
    try {
      const a = await this.client.core.crypto.decode(t, s, { receiverPublicKey: o, encoding: n === W.link_mode ? mt : We });
      Gs(a) ? (this.client.core.history.set(t, a), await this.onRelayEventRequest({ topic: t, payload: a, attestation: i, transportType: n, encryptedId: Ae(s) })) : Wt(a) ? (await this.client.core.history.resolve(a), await this.onRelayEventResponse({ topic: t, payload: a, transportType: n }), this.client.core.history.delete(t, a.id)) : (this.client.logger.error(`onRelayMessage() -> unknown payload: ${JSON.stringify(a)}`), await this.onRelayEventUnknownPayload({ topic: t, payload: a, transportType: n })), await this.client.core.relayer.messages.ack(t, s);
    } catch (a) {
      this.client.logger.error(`onRelayMessage() -> failed to process an inbound message: ${s}`), this.client.logger.error(a);
    }
  }
  registerExpirerEvents() {
    this.client.core.expirer.on(Re.expired, async (e) => {
      const { topic: t, id: s } = xr(e.target);
      if (s && this.client.pendingRequest.keys.includes(s)) return await this.deletePendingSessionRequest(s, I("EXPIRED"), !0);
      if (s && this.client.auth.requests.keys.includes(s)) return await this.deletePendingAuthRequest(s, I("EXPIRED"), !0);
      t ? this.client.session.keys.includes(t) && (await this.deleteSession({ topic: t, expirerHasDeleted: !0 }), this.client.events.emit("session_expire", { topic: t })) : s && (await this.deleteProposal(s, !0), this.client.events.emit("proposal_expire", { id: s }));
    });
  }
  registerPairingEvents() {
    this.client.core.pairing.events.on(at.create, (e) => this.onPairingCreated(e)), this.client.core.pairing.events.on(at.delete, (e) => {
      this.addToRecentlyDeleted(e.topic, "pairing");
    });
  }
  isValidPairingTopic(e) {
    if (!Xe(e, !1)) {
      const { message: t } = I("MISSING_OR_INVALID", `pairing topic should be a string: ${e}`);
      throw new Error(t);
    }
    if (!this.client.core.pairing.pairings.keys.includes(e)) {
      const { message: t } = I("NO_MATCHING_KEY", `pairing topic doesn't exist: ${e}`);
      throw new Error(t);
    }
    if (et(this.client.core.pairing.pairings.get(e).expiry)) {
      const { message: t } = I("EXPIRED", `pairing topic: ${e}`);
      throw new Error(t);
    }
  }
  async isValidSessionTopic(e) {
    if (!Xe(e, !1)) {
      const { message: t } = I("MISSING_OR_INVALID", `session topic should be a string: ${e}`);
      throw new Error(t);
    }
    if (this.checkRecentlyDeleted(e), !this.client.session.keys.includes(e)) {
      const { message: t } = I("NO_MATCHING_KEY", `session topic doesn't exist: ${e}`);
      throw new Error(t);
    }
    if (et(this.client.session.get(e).expiry)) {
      await this.deleteSession({ topic: e });
      const { message: t } = I("EXPIRED", `session topic: ${e}`);
      throw new Error(t);
    }
    if (!this.client.core.crypto.keychain.has(e)) {
      const { message: t } = I("MISSING_OR_INVALID", `session topic does not exist in keychain: ${e}`);
      throw await this.deleteSession({ topic: e }), new Error(t);
    }
  }
  async isValidSessionOrPairingTopic(e) {
    if (this.checkRecentlyDeleted(e), this.client.session.keys.includes(e)) await this.isValidSessionTopic(e);
    else if (this.client.core.pairing.pairings.keys.includes(e)) this.isValidPairingTopic(e);
    else if (Xe(e, !1)) {
      const { message: t } = I("NO_MATCHING_KEY", `session or pairing topic doesn't exist: ${e}`);
      throw new Error(t);
    } else {
      const { message: t } = I("MISSING_OR_INVALID", `session or pairing topic should be a string: ${e}`);
      throw new Error(t);
    }
  }
  async isValidProposalId(e) {
    if (!xo(e)) {
      const { message: t } = I("MISSING_OR_INVALID", `proposal id should be a number: ${e}`);
      throw new Error(t);
    }
    if (!this.client.proposal.keys.includes(e)) {
      const { message: t } = I("NO_MATCHING_KEY", `proposal id doesn't exist: ${e}`);
      throw new Error(t);
    }
    if (et(this.client.proposal.get(e).expiryTimestamp)) {
      await this.deleteProposal(e);
      const { message: t } = I("EXPIRED", `proposal id: ${e}`);
      throw new Error(t);
    }
  }
  validateRequestExpiry(e) {
    if (e && !So(e, gs)) {
      const { message: t } = I("MISSING_OR_INVALID", `request() expiry: ${e}. Expiry must be a number (in seconds) between ${gs.min} and ${gs.max}`);
      throw new Error(t);
    }
  }
}
class lg extends ct {
  constructor(e, t) {
    super(e, t, Gd, Js), this.core = e, this.logger = t;
  }
}
class ug extends ct {
  constructor(e, t) {
    super(e, t, Wd, Js), this.core = e, this.logger = t;
  }
}
class pg extends ct {
  constructor(e, t) {
    super(e, t, Qd, Js, (s) => s.id), this.core = e, this.logger = t;
  }
}
class dg extends ct {
  constructor(e, t) {
    super(e, t, tg, Yt, () => Lt), this.core = e, this.logger = t;
  }
}
class gg extends ct {
  constructor(e, t) {
    super(e, t, sg, Yt), this.core = e, this.logger = t;
  }
}
class yg extends ct {
  constructor(e, t) {
    super(e, t, ig, Yt, (s) => s.id), this.core = e, this.logger = t;
  }
}
var fg = Object.defineProperty, mg = (r, e, t) => e in r ? fg(r, e, { enumerable: !0, configurable: !0, writable: !0, value: t }) : r[e] = t, ys = (r, e, t) => mg(r, typeof e != "symbol" ? e + "" : e, t);
class wg {
  constructor(e, t) {
    this.core = e, this.logger = t, ys(this, "authKeys"), ys(this, "pairingTopics"), ys(this, "requests"), this.authKeys = new dg(this.core, this.logger), this.pairingTopics = new gg(this.core, this.logger), this.requests = new yg(this.core, this.logger);
  }
  async init() {
    await this.authKeys.init(), await this.pairingTopics.init(), await this.requests.init();
  }
}
var bg = Object.defineProperty, vg = (r, e, t) => e in r ? bg(r, e, { enumerable: !0, configurable: !0, writable: !0, value: t }) : r[e] = t, k = (r, e, t) => vg(r, typeof e != "symbol" ? e + "" : e, t);
class In extends vo {
  constructor(e) {
    super(e), k(this, "protocol", vn), k(this, "version", _n), k(this, "name", ds.name), k(this, "metadata"), k(this, "core"), k(this, "logger"), k(this, "events", new Ye.EventEmitter()), k(this, "engine"), k(this, "session"), k(this, "proposal"), k(this, "pendingRequest"), k(this, "auth"), k(this, "signConfig"), k(this, "on", (s, i) => this.events.on(s, i)), k(this, "once", (s, i) => this.events.once(s, i)), k(this, "off", (s, i) => this.events.off(s, i)), k(this, "removeListener", (s, i) => this.events.removeListener(s, i)), k(this, "removeAllListeners", (s) => this.events.removeAllListeners(s)), k(this, "connect", async (s) => {
      try {
        return await this.engine.connect(s);
      } catch (i) {
        throw this.logger.error(i.message), i;
      }
    }), k(this, "pair", async (s) => {
      try {
        return await this.engine.pair(s);
      } catch (i) {
        throw this.logger.error(i.message), i;
      }
    }), k(this, "approve", async (s) => {
      try {
        return await this.engine.approve(s);
      } catch (i) {
        throw this.logger.error(i.message), i;
      }
    }), k(this, "reject", async (s) => {
      try {
        return await this.engine.reject(s);
      } catch (i) {
        throw this.logger.error(i.message), i;
      }
    }), k(this, "update", async (s) => {
      try {
        return await this.engine.update(s);
      } catch (i) {
        throw this.logger.error(i.message), i;
      }
    }), k(this, "extend", async (s) => {
      try {
        return await this.engine.extend(s);
      } catch (i) {
        throw this.logger.error(i.message), i;
      }
    }), k(this, "request", async (s) => {
      try {
        return await this.engine.request(s);
      } catch (i) {
        throw this.logger.error(i.message), i;
      }
    }), k(this, "respond", async (s) => {
      try {
        return await this.engine.respond(s);
      } catch (i) {
        throw this.logger.error(i.message), i;
      }
    }), k(this, "ping", async (s) => {
      try {
        return await this.engine.ping(s);
      } catch (i) {
        throw this.logger.error(i.message), i;
      }
    }), k(this, "emit", async (s) => {
      try {
        return await this.engine.emit(s);
      } catch (i) {
        throw this.logger.error(i.message), i;
      }
    }), k(this, "disconnect", async (s) => {
      try {
        return await this.engine.disconnect(s);
      } catch (i) {
        throw this.logger.error(i.message), i;
      }
    }), k(this, "find", (s) => {
      try {
        return this.engine.find(s);
      } catch (i) {
        throw this.logger.error(i.message), i;
      }
    }), k(this, "getPendingSessionRequests", () => {
      try {
        return this.engine.getPendingSessionRequests();
      } catch (s) {
        throw this.logger.error(s.message), s;
      }
    }), k(this, "authenticate", async (s, i) => {
      try {
        return await this.engine.authenticate(s, i);
      } catch (n) {
        throw this.logger.error(n.message), n;
      }
    }), k(this, "formatAuthMessage", (s) => {
      try {
        return this.engine.formatAuthMessage(s);
      } catch (i) {
        throw this.logger.error(i.message), i;
      }
    }), k(this, "approveSessionAuthenticate", async (s) => {
      try {
        return await this.engine.approveSessionAuthenticate(s);
      } catch (i) {
        throw this.logger.error(i.message), i;
      }
    }), k(this, "rejectSessionAuthenticate", async (s) => {
      try {
        return await this.engine.rejectSessionAuthenticate(s);
      } catch (i) {
        throw this.logger.error(i.message), i;
      }
    }), this.name = e?.name || ds.name, this.metadata = _o(e?.metadata), this.signConfig = e?.signConfig;
    const t = Er({ logger: e?.logger || ds.logger, name: this.name });
    this.logger = t, this.core = e?.core || new Hd(e), this.session = new ug(this.core, this.logger), this.proposal = new lg(this.core, this.logger), this.pendingRequest = new pg(this.core, this.logger), this.engine = new hg(this), this.auth = new wg(this.core, this.logger);
  }
  static async init(e) {
    const t = new In(e);
    return await t.initialize(), t;
  }
  get context() {
    return xe(this.logger);
  }
  get pairing() {
    return this.core.pairing.pairings;
  }
  async initialize() {
    this.logger.trace("Initialized");
    try {
      await this.core.start(), await this.session.init(), await this.proposal.init(), await this.pendingRequest.init(), await this.auth.init(), await this.engine.init(), this.logger.info("SignClient Initialization Success");
    } catch (e) {
      throw this.logger.info("SignClient Initialization Failure"), this.logger.error(e.message), e;
    }
  }
}
export {
  Og as C,
  In as q,
  zi as s
};
