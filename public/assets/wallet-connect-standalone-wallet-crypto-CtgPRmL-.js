const er = "0.1.1";
function tr() {
  return er;
}
class F extends Error {
  constructor(e, n = {}) {
    const r = (() => {
      if (n.cause instanceof F) {
        if (n.cause.details)
          return n.cause.details;
        if (n.cause.shortMessage)
          return n.cause.shortMessage;
      }
      return n.cause && "details" in n.cause && typeof n.cause.details == "string" ? n.cause.details : n.cause?.message ? n.cause.message : n.details;
    })(), i = n.cause instanceof F && n.cause.docsPath || n.docsPath, o = `https://oxlib.sh${i ?? ""}`, c = [
      e || "An error occurred.",
      ...n.metaMessages ? ["", ...n.metaMessages] : [],
      ...r || i ? [
        "",
        r ? `Details: ${r}` : void 0,
        i ? `See: ${o}` : void 0
      ] : []
    ].filter((u) => typeof u == "string").join(`
`);
    super(c, n.cause ? { cause: n.cause } : void 0), Object.defineProperty(this, "details", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: void 0
    }), Object.defineProperty(this, "docs", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: void 0
    }), Object.defineProperty(this, "docsPath", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: void 0
    }), Object.defineProperty(this, "shortMessage", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: void 0
    }), Object.defineProperty(this, "cause", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: void 0
    }), Object.defineProperty(this, "name", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: "BaseError"
    }), Object.defineProperty(this, "version", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: `ox@${tr()}`
    }), this.cause = n.cause, this.details = r, this.docs = o, this.docsPath = i, this.shortMessage = e;
  }
  walk(e) {
    return on(this, e);
  }
}
function on(t, e) {
  return e?.(t) ? t : t && typeof t == "object" && "cause" in t && t.cause ? on(t.cause, e) : e ? null : t;
}
const ge = typeof globalThis == "object" && "crypto" in globalThis ? globalThis.crypto : void 0;
function nr(t) {
  return t instanceof Uint8Array || ArrayBuffer.isView(t) && t.constructor.name === "Uint8Array";
}
function Se(t) {
  if (!Number.isSafeInteger(t) || t < 0)
    throw new Error("positive integer expected, got " + t);
}
function le(t, ...e) {
  if (!nr(t))
    throw new Error("Uint8Array expected");
  if (e.length > 0 && !e.includes(t.length))
    throw new Error("Uint8Array expected of length " + e + ", got length=" + t.length);
}
function rr(t) {
  if (typeof t != "function" || typeof t.create != "function")
    throw new Error("Hash should be wrapped by utils.createHasher");
  Se(t.outputLen), Se(t.blockLen);
}
function De(t, e = !0) {
  if (t.destroyed)
    throw new Error("Hash instance has been destroyed");
  if (e && t.finished)
    throw new Error("Hash#digest() has already been called");
}
function un(t, e) {
  le(t);
  const n = e.outputLen;
  if (t.length < n)
    throw new Error("digestInto() expects output buffer of length at least " + n);
}
function ir(t) {
  return new Uint32Array(t.buffer, t.byteOffset, Math.floor(t.byteLength / 4));
}
function xe(...t) {
  for (let e = 0; e < t.length; e++)
    t[e].fill(0);
}
function Ye(t) {
  return new DataView(t.buffer, t.byteOffset, t.byteLength);
}
function G(t, e) {
  return t << 32 - e | t >>> e;
}
const sr = new Uint8Array(new Uint32Array([287454020]).buffer)[0] === 68;
function or(t) {
  return t << 24 & 4278190080 | t << 8 & 16711680 | t >>> 8 & 65280 | t >>> 24 & 255;
}
function ur(t) {
  for (let e = 0; e < t.length; e++)
    t[e] = or(t[e]);
  return t;
}
const zt = sr ? (t) => t : ur;
function cr(t) {
  if (typeof t != "string")
    throw new Error("string expected");
  return new Uint8Array(new TextEncoder().encode(t));
}
function Re(t) {
  return typeof t == "string" && (t = cr(t)), le(t), t;
}
function ar(...t) {
  let e = 0;
  for (let r = 0; r < t.length; r++) {
    const i = t[r];
    le(i), e += i.length;
  }
  const n = new Uint8Array(e);
  for (let r = 0, i = 0; r < t.length; r++) {
    const s = t[r];
    n.set(s, i), i += s.length;
  }
  return n;
}
class yt {
}
function cn(t) {
  const e = (r) => t().update(Re(r)).digest(), n = t();
  return e.outputLen = n.outputLen, e.blockLen = n.blockLen, e.create = () => t(), e;
}
function fr(t = 32) {
  if (ge && typeof ge.getRandomValues == "function")
    return ge.getRandomValues(new Uint8Array(t));
  if (ge && typeof ge.randomBytes == "function")
    return Uint8Array.from(ge.randomBytes(t));
  throw new Error("crypto.getRandomValues must be defined");
}
function lr(t, e, n, r) {
  if (typeof t.setBigUint64 == "function")
    return t.setBigUint64(e, n, r);
  const i = BigInt(32), s = BigInt(4294967295), o = Number(n >> i & s), c = Number(n & s), u = r ? 4 : 0, a = r ? 0 : 4;
  t.setUint32(e + u, o, r), t.setUint32(e + a, c, r);
}
function hr(t, e, n) {
  return t & e ^ ~t & n;
}
function dr(t, e, n) {
  return t & e ^ t & n ^ e & n;
}
class wr extends yt {
  constructor(e, n, r, i) {
    super(), this.finished = !1, this.length = 0, this.pos = 0, this.destroyed = !1, this.blockLen = e, this.outputLen = n, this.padOffset = r, this.isLE = i, this.buffer = new Uint8Array(e), this.view = Ye(this.buffer);
  }
  update(e) {
    De(this), e = Re(e), le(e);
    const { view: n, buffer: r, blockLen: i } = this, s = e.length;
    for (let o = 0; o < s; ) {
      const c = Math.min(i - this.pos, s - o);
      if (c === i) {
        const u = Ye(e);
        for (; i <= s - o; o += i)
          this.process(u, o);
        continue;
      }
      r.set(e.subarray(o, o + c), this.pos), this.pos += c, o += c, this.pos === i && (this.process(n, 0), this.pos = 0);
    }
    return this.length += e.length, this.roundClean(), this;
  }
  digestInto(e) {
    De(this), un(e, this), this.finished = !0;
    const { buffer: n, view: r, blockLen: i, isLE: s } = this;
    let { pos: o } = this;
    n[o++] = 128, xe(this.buffer.subarray(o)), this.padOffset > i - o && (this.process(r, 0), o = 0);
    for (let x = o; x < i; x++)
      n[x] = 0;
    lr(r, i - 8, BigInt(this.length * 8), s), this.process(r, 0);
    const c = Ye(e), u = this.outputLen;
    if (u % 4)
      throw new Error("_sha2: outputLen should be aligned to 32bit");
    const a = u / 4, g = this.get();
    if (a > g.length)
      throw new Error("_sha2: outputLen bigger than state");
    for (let x = 0; x < a; x++)
      c.setUint32(4 * x, g[x], s);
  }
  digest() {
    const { buffer: e, outputLen: n } = this;
    this.digestInto(e);
    const r = e.slice(0, n);
    return this.destroy(), r;
  }
  _cloneInto(e) {
    e || (e = new this.constructor()), e.set(...this.get());
    const { blockLen: n, buffer: r, length: i, finished: s, destroyed: o, pos: c } = this;
    return e.destroyed = o, e.finished = s, e.length = i, e.pos = c, i % n && e.buffer.set(r), e;
  }
  clone() {
    return this._cloneInto();
  }
}
const ie = /* @__PURE__ */ Uint32Array.from([
  1779033703,
  3144134277,
  1013904242,
  2773480762,
  1359893119,
  2600822924,
  528734635,
  1541459225
]), Te = /* @__PURE__ */ BigInt(2 ** 32 - 1), Ot = /* @__PURE__ */ BigInt(32);
function gr(t, e = !1) {
  return e ? { h: Number(t & Te), l: Number(t >> Ot & Te) } : { h: Number(t >> Ot & Te) | 0, l: Number(t & Te) | 0 };
}
function pr(t, e = !1) {
  const n = t.length;
  let r = new Uint32Array(n), i = new Uint32Array(n);
  for (let s = 0; s < n; s++) {
    const { h: o, l: c } = gr(t[s], e);
    [r[s], i[s]] = [o, c];
  }
  return [r, i];
}
const Dr = (t, e, n) => t << n | e >>> 32 - n, xr = (t, e, n) => e << n | t >>> 32 - n, br = (t, e, n) => e << n - 32 | t >>> 64 - n, yr = (t, e, n) => t << n - 32 | e >>> 64 - n, mr = BigInt(0), me = BigInt(1), Er = BigInt(2), Br = BigInt(7), Ar = BigInt(256), Sr = BigInt(113), an = [], fn = [], ln = [];
for (let t = 0, e = me, n = 1, r = 0; t < 24; t++) {
  [n, r] = [r, (2 * n + 3 * r) % 5], an.push(2 * (5 * r + n)), fn.push((t + 1) * (t + 2) / 2 % 64);
  let i = mr;
  for (let s = 0; s < 7; s++)
    e = (e << me ^ (e >> Br) * Sr) % Ar, e & Er && (i ^= me << (me << /* @__PURE__ */ BigInt(s)) - me);
  ln.push(i);
}
const hn = pr(ln, !0), Ur = hn[0], vr = hn[1], $t = (t, e, n) => n > 32 ? br(t, e, n) : Dr(t, e, n), _t = (t, e, n) => n > 32 ? yr(t, e, n) : xr(t, e, n);
function Ir(t, e = 24) {
  const n = new Uint32Array(10);
  for (let r = 24 - e; r < 24; r++) {
    for (let o = 0; o < 10; o++)
      n[o] = t[o] ^ t[o + 10] ^ t[o + 20] ^ t[o + 30] ^ t[o + 40];
    for (let o = 0; o < 10; o += 2) {
      const c = (o + 8) % 10, u = (o + 2) % 10, a = n[u], g = n[u + 1], x = $t(a, g, 1) ^ n[c], B = _t(a, g, 1) ^ n[c + 1];
      for (let v = 0; v < 50; v += 10)
        t[o + v] ^= x, t[o + v + 1] ^= B;
    }
    let i = t[2], s = t[3];
    for (let o = 0; o < 24; o++) {
      const c = fn[o], u = $t(i, s, c), a = _t(i, s, c), g = an[o];
      i = t[g], s = t[g + 1], t[g] = u, t[g + 1] = a;
    }
    for (let o = 0; o < 50; o += 10) {
      for (let c = 0; c < 10; c++)
        n[c] = t[o + c];
      for (let c = 0; c < 10; c++)
        t[o + c] ^= ~n[(c + 2) % 10] & n[(c + 4) % 10];
    }
    t[0] ^= Ur[r], t[1] ^= vr[r];
  }
  xe(n);
}
class mt extends yt {
  // NOTE: we accept arguments in bytes instead of bits here.
  constructor(e, n, r, i = !1, s = 24) {
    if (super(), this.pos = 0, this.posOut = 0, this.finished = !1, this.destroyed = !1, this.enableXOF = !1, this.blockLen = e, this.suffix = n, this.outputLen = r, this.enableXOF = i, this.rounds = s, Se(r), !(0 < e && e < 200))
      throw new Error("only keccak-f1600 function is supported");
    this.state = new Uint8Array(200), this.state32 = ir(this.state);
  }
  clone() {
    return this._cloneInto();
  }
  keccak() {
    zt(this.state32), Ir(this.state32, this.rounds), zt(this.state32), this.posOut = 0, this.pos = 0;
  }
  update(e) {
    De(this), e = Re(e), le(e);
    const { blockLen: n, state: r } = this, i = e.length;
    for (let s = 0; s < i; ) {
      const o = Math.min(n - this.pos, i - s);
      for (let c = 0; c < o; c++)
        r[this.pos++] ^= e[s++];
      this.pos === n && this.keccak();
    }
    return this;
  }
  finish() {
    if (this.finished)
      return;
    this.finished = !0;
    const { state: e, suffix: n, pos: r, blockLen: i } = this;
    e[r] ^= n, (n & 128) !== 0 && r === i - 1 && this.keccak(), e[i - 1] ^= 128, this.keccak();
  }
  writeInto(e) {
    De(this, !1), le(e), this.finish();
    const n = this.state, { blockLen: r } = this;
    for (let i = 0, s = e.length; i < s; ) {
      this.posOut >= r && this.keccak();
      const o = Math.min(r - this.posOut, s - i);
      e.set(n.subarray(this.posOut, this.posOut + o), i), this.posOut += o, i += o;
    }
    return e;
  }
  xofInto(e) {
    if (!this.enableXOF)
      throw new Error("XOF is not possible for this instance");
    return this.writeInto(e);
  }
  xof(e) {
    return Se(e), this.xofInto(new Uint8Array(e));
  }
  digestInto(e) {
    if (un(e, this), this.finished)
      throw new Error("digest() was already called");
    return this.writeInto(e), this.destroy(), e;
  }
  digest() {
    return this.digestInto(new Uint8Array(this.outputLen));
  }
  destroy() {
    this.destroyed = !0, xe(this.state);
  }
  _cloneInto(e) {
    const { blockLen: n, suffix: r, outputLen: i, rounds: s, enableXOF: o } = this;
    return e || (e = new mt(n, r, i, o, s)), e.state32.set(this.state32), e.pos = this.pos, e.posOut = this.posOut, e.finished = this.finished, e.rounds = s, e.suffix = r, e.outputLen = i, e.enableXOF = o, e.destroyed = this.destroyed, e;
  }
}
const Cr = (t, e, n) => cn(() => new mt(e, t, n)), kr = Cr(1, 136, 256 / 8), Tr = /* @__PURE__ */ Uint32Array.from([
  1116352408,
  1899447441,
  3049323471,
  3921009573,
  961987163,
  1508970993,
  2453635748,
  2870763221,
  3624381080,
  310598401,
  607225278,
  1426881987,
  1925078388,
  2162078206,
  2614888103,
  3248222580,
  3835390401,
  4022224774,
  264347078,
  604807628,
  770255983,
  1249150122,
  1555081692,
  1996064986,
  2554220882,
  2821834349,
  2952996808,
  3210313671,
  3336571891,
  3584528711,
  113926993,
  338241895,
  666307205,
  773529912,
  1294757372,
  1396182291,
  1695183700,
  1986661051,
  2177026350,
  2456956037,
  2730485921,
  2820302411,
  3259730800,
  3345764771,
  3516065817,
  3600352804,
  4094571909,
  275423344,
  430227734,
  506948616,
  659060556,
  883997877,
  958139571,
  1322822218,
  1537002063,
  1747873779,
  1955562222,
  2024104815,
  2227730452,
  2361852424,
  2428436474,
  2756734187,
  3204031479,
  3329325298
]), se = /* @__PURE__ */ new Uint32Array(64);
class zr extends wr {
  constructor(e = 32) {
    super(64, e, 8, !1), this.A = ie[0] | 0, this.B = ie[1] | 0, this.C = ie[2] | 0, this.D = ie[3] | 0, this.E = ie[4] | 0, this.F = ie[5] | 0, this.G = ie[6] | 0, this.H = ie[7] | 0;
  }
  get() {
    const { A: e, B: n, C: r, D: i, E: s, F: o, G: c, H: u } = this;
    return [e, n, r, i, s, o, c, u];
  }
  // prettier-ignore
  set(e, n, r, i, s, o, c, u) {
    this.A = e | 0, this.B = n | 0, this.C = r | 0, this.D = i | 0, this.E = s | 0, this.F = o | 0, this.G = c | 0, this.H = u | 0;
  }
  process(e, n) {
    for (let x = 0; x < 16; x++, n += 4)
      se[x] = e.getUint32(n, !1);
    for (let x = 16; x < 64; x++) {
      const B = se[x - 15], v = se[x - 2], w = G(B, 7) ^ G(B, 18) ^ B >>> 3, d = G(v, 17) ^ G(v, 19) ^ v >>> 10;
      se[x] = d + se[x - 7] + w + se[x - 16] | 0;
    }
    let { A: r, B: i, C: s, D: o, E: c, F: u, G: a, H: g } = this;
    for (let x = 0; x < 64; x++) {
      const B = G(c, 6) ^ G(c, 11) ^ G(c, 25), v = g + B + hr(c, u, a) + Tr[x] + se[x] | 0, d = (G(r, 2) ^ G(r, 13) ^ G(r, 22)) + dr(r, i, s) | 0;
      g = a, a = u, u = c, c = o + v | 0, o = s, s = i, i = r, r = v + d | 0;
    }
    r = r + this.A | 0, i = i + this.B | 0, s = s + this.C | 0, o = o + this.D | 0, c = c + this.E | 0, u = u + this.F | 0, a = a + this.G | 0, g = g + this.H | 0, this.set(r, i, s, o, c, u, a, g);
  }
  roundClean() {
    xe(se);
  }
  destroy() {
    this.set(0, 0, 0, 0, 0, 0, 0, 0), xe(this.buffer);
  }
}
const Or = /* @__PURE__ */ cn(() => new zr());
const Et = /* @__PURE__ */ BigInt(0), ht = /* @__PURE__ */ BigInt(1);
function Ie(t) {
  return t instanceof Uint8Array || ArrayBuffer.isView(t) && t.constructor.name === "Uint8Array";
}
function Bt(t) {
  if (!Ie(t))
    throw new Error("Uint8Array expected");
}
function Ue(t, e) {
  if (typeof e != "boolean")
    throw new Error(t + " boolean expected, got " + e);
}
function ze(t) {
  const e = t.toString(16);
  return e.length & 1 ? "0" + e : e;
}
function dn(t) {
  if (typeof t != "string")
    throw new Error("hex string expected, got " + typeof t);
  return t === "" ? Et : BigInt("0x" + t);
}
const wn = (
  // @ts-ignore
  typeof Uint8Array.from([]).toHex == "function" && typeof Uint8Array.fromHex == "function"
), $r = /* @__PURE__ */ Array.from({ length: 256 }, (t, e) => e.toString(16).padStart(2, "0"));
function ve(t) {
  if (Bt(t), wn)
    return t.toHex();
  let e = "";
  for (let n = 0; n < t.length; n++)
    e += $r[t[n]];
  return e;
}
const J = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 };
function Pt(t) {
  if (t >= J._0 && t <= J._9)
    return t - J._0;
  if (t >= J.A && t <= J.F)
    return t - (J.A - 10);
  if (t >= J.a && t <= J.f)
    return t - (J.a - 10);
}
function _e(t) {
  if (typeof t != "string")
    throw new Error("hex string expected, got " + typeof t);
  if (wn)
    return Uint8Array.fromHex(t);
  const e = t.length, n = e / 2;
  if (e % 2)
    throw new Error("hex string expected, got unpadded hex of length " + e);
  const r = new Uint8Array(n);
  for (let i = 0, s = 0; i < n; i++, s += 2) {
    const o = Pt(t.charCodeAt(s)), c = Pt(t.charCodeAt(s + 1));
    if (o === void 0 || c === void 0) {
      const u = t[s] + t[s + 1];
      throw new Error('hex string expected, got non-hex character "' + u + '" at index ' + s);
    }
    r[i] = o * 16 + c;
  }
  return r;
}
function fe(t) {
  return dn(ve(t));
}
function gn(t) {
  return Bt(t), dn(ve(Uint8Array.from(t).reverse()));
}
function Ce(t, e) {
  return _e(t.toString(16).padStart(e * 2, "0"));
}
function pn(t, e) {
  return Ce(t, e).reverse();
}
function Y(t, e, n) {
  let r;
  if (typeof e == "string")
    try {
      r = _e(e);
    } catch (s) {
      throw new Error(t + " must be hex string or Uint8Array, cause: " + s);
    }
  else if (Ie(e))
    r = Uint8Array.from(e);
  else
    throw new Error(t + " must be hex string or Uint8Array");
  const i = r.length;
  if (typeof n == "number" && i !== n)
    throw new Error(t + " of length " + n + " expected, got " + i);
  return r;
}
function Pe(...t) {
  let e = 0;
  for (let r = 0; r < t.length; r++) {
    const i = t[r];
    Bt(i), e += i.length;
  }
  const n = new Uint8Array(e);
  for (let r = 0, i = 0; r < t.length; r++) {
    const s = t[r];
    n.set(s, i), i += s.length;
  }
  return n;
}
const We = (t) => typeof t == "bigint" && Et <= t;
function At(t, e, n) {
  return We(t) && We(e) && We(n) && e <= t && t < n;
}
function pe(t, e, n, r) {
  if (!At(e, n, r))
    throw new Error("expected valid " + t + ": " + n + " <= n < " + r + ", got " + e);
}
function _r(t) {
  let e;
  for (e = 0; t > Et; t >>= ht, e += 1)
    ;
  return e;
}
const qe = (t) => (ht << BigInt(t)) - ht, Ge = (t) => new Uint8Array(t), Ft = (t) => Uint8Array.from(t);
function Pr(t, e, n) {
  if (typeof t != "number" || t < 2)
    throw new Error("hashLen must be a number");
  if (typeof e != "number" || e < 2)
    throw new Error("qByteLen must be a number");
  if (typeof n != "function")
    throw new Error("hmacFn must be a function");
  let r = Ge(t), i = Ge(t), s = 0;
  const o = () => {
    r.fill(1), i.fill(0), s = 0;
  }, c = (...x) => n(i, r, ...x), u = (x = Ge(0)) => {
    i = c(Ft([0]), x), r = c(), x.length !== 0 && (i = c(Ft([1]), x), r = c());
  }, a = () => {
    if (s++ >= 1e3)
      throw new Error("drbg: tried 1000 values");
    let x = 0;
    const B = [];
    for (; x < e; ) {
      r = c();
      const v = r.slice();
      B.push(v), x += r.length;
    }
    return Pe(...B);
  };
  return (x, B) => {
    o(), u(x);
    let v;
    for (; !(v = B(a())); )
      u();
    return o(), v;
  };
}
const Fr = {
  bigint: (t) => typeof t == "bigint",
  function: (t) => typeof t == "function",
  boolean: (t) => typeof t == "boolean",
  string: (t) => typeof t == "string",
  stringOrUint8Array: (t) => typeof t == "string" || Ie(t),
  isSafeInteger: (t) => Number.isSafeInteger(t),
  array: (t) => Array.isArray(t),
  field: (t, e) => e.Fp.isValid(t),
  hash: (t) => typeof t == "function" && Number.isSafeInteger(t.outputLen)
};
function Ve(t, e, n = {}) {
  const r = (i, s, o) => {
    const c = Fr[s];
    if (typeof c != "function")
      throw new Error("invalid validator function");
    const u = t[i];
    if (!(o && u === void 0) && !c(u, t))
      throw new Error("param " + String(i) + " is invalid. Expected " + s + ", got " + u);
  };
  for (const [i, s] of Object.entries(e))
    r(i, s, !1);
  for (const [i, s] of Object.entries(n))
    r(i, s, !0);
  return t;
}
function Lt(t) {
  const e = /* @__PURE__ */ new WeakMap();
  return (n, ...r) => {
    const i = e.get(n);
    if (i !== void 0)
      return i;
    const s = t(n, ...r);
    return e.set(n, s), s;
  };
}
function Lr(t, e) {
  if (Rt(t) > e)
    throw new si({
      givenSize: Rt(t),
      maxSize: e
    });
}
const Q = {
  zero: 48,
  nine: 57,
  A: 65,
  F: 70,
  a: 97,
  f: 102
};
function Ht(t) {
  if (t >= Q.zero && t <= Q.nine)
    return t - Q.zero;
  if (t >= Q.A && t <= Q.F)
    return t - (Q.A - 10);
  if (t >= Q.a && t <= Q.f)
    return t - (Q.a - 10);
}
function Hr(t, e = {}) {
  const { dir: n, size: r = 32 } = e;
  if (r === 0)
    return t;
  if (t.length > r)
    throw new oi({
      size: t.length,
      targetSize: r,
      type: "Bytes"
    });
  const i = new Uint8Array(r);
  for (let s = 0; s < r; s++) {
    const o = n === "right";
    i[o ? s : r - s - 1] = t[o ? s : t.length - s - 1];
  }
  return i;
}
function Dn(t, e) {
  if (oe(t) > e)
    throw new Wr({
      givenSize: oe(t),
      maxSize: e
    });
}
function Mr(t, e) {
  if (typeof e == "number" && e > 0 && e > oe(t) - 1)
    throw new yn({
      offset: e,
      position: "start",
      size: oe(t)
    });
}
function Nr(t, e, n) {
  if (typeof e == "number" && typeof n == "number" && oe(t) !== n - e)
    throw new yn({
      offset: n,
      position: "end",
      size: oe(t)
    });
}
function xn(t, e = {}) {
  const { dir: n, size: r = 32 } = e;
  if (r === 0)
    return t;
  const i = t.replace("0x", "");
  if (i.length > r * 2)
    throw new Gr({
      size: Math.ceil(i.length / 2),
      targetSize: r,
      type: "Hex"
    });
  return `0x${i[n === "right" ? "padEnd" : "padStart"](r * 2, "0")}`;
}
const Rr = "#__bigint";
function St(t, e, n) {
  return JSON.stringify(t, (r, i) => typeof i == "bigint" ? i.toString() + Rr : i, n);
}
const qr = /* @__PURE__ */ Array.from({ length: 256 }, (t, e) => e.toString(16).padStart(2, "0"));
function Vr(t, e = {}) {
  const { strict: n = !1 } = e;
  if (!t)
    throw new Mt(t);
  if (typeof t != "string")
    throw new Mt(t);
  if (n && !/^0x[0-9a-fA-F]*$/.test(t))
    throw new Nt(t);
  if (!t.startsWith("0x"))
    throw new Nt(t);
}
function jr(...t) {
  return `0x${t.reduce((e, n) => e + n.replace("0x", ""), "")}`;
}
function Ut(t) {
  return t instanceof Uint8Array ? Fe(t) : Array.isArray(t) ? Fe(new Uint8Array(t)) : t;
}
function Fe(t, e = {}) {
  let n = "";
  for (let i = 0; i < t.length; i++)
    n += qr[t[i]];
  const r = `0x${n}`;
  return typeof e.size == "number" ? (Dn(r, e.size), bn(r, e.size)) : r;
}
function Xe(t, e = {}) {
  const { signed: n, size: r } = e, i = BigInt(t);
  let s;
  r ? n ? s = (1n << BigInt(r) * 8n - 1n) - 1n : s = 2n ** (BigInt(r) * 8n) - 1n : typeof t == "number" && (s = BigInt(Number.MAX_SAFE_INTEGER));
  const o = typeof s == "bigint" && n ? -s - 1n : 0;
  if (s && i > s || i < o) {
    const a = typeof t == "bigint" ? "n" : "";
    throw new Yr({
      max: s ? `${s}${a}` : void 0,
      min: `${o}${a}`,
      signed: n,
      size: r,
      value: `${t}${a}`
    });
  }
  const u = `0x${(n && i < 0 ? (1n << BigInt(r * 8)) + BigInt(i) : i).toString(16)}`;
  return r ? Kr(u, r) : u;
}
function Kr(t, e) {
  return xn(t, { dir: "left", size: e });
}
function bn(t, e) {
  return xn(t, { dir: "right", size: e });
}
function ee(t, e, n, r = {}) {
  const { strict: i } = r;
  Mr(t, e);
  const s = `0x${t.replace("0x", "").slice((e ?? 0) * 2, (n ?? t.length) * 2)}`;
  return i && Nr(s, e, n), s;
}
function oe(t) {
  return Math.ceil((t.length - 2) / 2);
}
function Zr(t, e = {}) {
  const { strict: n = !1 } = e;
  try {
    return Vr(t, { strict: n }), !0;
  } catch {
    return !1;
  }
}
class Yr extends F {
  constructor({ max: e, min: n, signed: r, size: i, value: s }) {
    super(`Number \`${s}\` is not in safe${i ? ` ${i * 8}-bit` : ""}${r ? " signed" : " unsigned"} integer range ${e ? `(\`${n}\` to \`${e}\`)` : `(above \`${n}\`)`}`), Object.defineProperty(this, "name", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: "Hex.IntegerOutOfRangeError"
    });
  }
}
class Mt extends F {
  constructor(e) {
    super(`Value \`${typeof e == "object" ? St(e) : e}\` of type \`${typeof e}\` is an invalid hex type.`, {
      metaMessages: ['Hex types must be represented as `"0x${string}"`.']
    }), Object.defineProperty(this, "name", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: "Hex.InvalidHexTypeError"
    });
  }
}
class Nt extends F {
  constructor(e) {
    super(`Value \`${e}\` is an invalid hex value.`, {
      metaMessages: [
        'Hex values must start with `"0x"` and contain only hexadecimal characters (0-9, a-f, A-F).'
      ]
    }), Object.defineProperty(this, "name", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: "Hex.InvalidHexValueError"
    });
  }
}
let Wr = class extends F {
  constructor({ givenSize: e, maxSize: n }) {
    super(`Size cannot exceed \`${n}\` bytes. Given size: \`${e}\` bytes.`), Object.defineProperty(this, "name", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: "Hex.SizeOverflowError"
    });
  }
};
class yn extends F {
  constructor({ offset: e, position: n, size: r }) {
    super(`Slice ${n === "start" ? "starting" : "ending"} at offset \`${e}\` is out-of-bounds (size: \`${r}\`).`), Object.defineProperty(this, "name", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: "Hex.SliceOffsetOutOfBoundsError"
    });
  }
}
let Gr = class extends F {
  constructor({ size: e, targetSize: n, type: r }) {
    super(`${r.charAt(0).toUpperCase()}${r.slice(1).toLowerCase()} size (\`${e}\`) exceeds padding size (\`${n}\`).`), Object.defineProperty(this, "name", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: "Hex.SizeExceedsPaddingSizeError"
    });
  }
};
const Xr = /* @__PURE__ */ new TextEncoder();
function Jr(t) {
  if (!(t instanceof Uint8Array)) {
    if (!t)
      throw new Oe(t);
    if (typeof t != "object")
      throw new Oe(t);
    if (!("BYTES_PER_ELEMENT" in t))
      throw new Oe(t);
    if (t.BYTES_PER_ELEMENT !== 1 || t.constructor.name !== "Uint8Array")
      throw new Oe(t);
  }
}
function Qr(t) {
  return t instanceof Uint8Array ? t : typeof t == "string" ? ti(t) : ei(t);
}
function ei(t) {
  return t instanceof Uint8Array ? t : new Uint8Array(t);
}
function ti(t, e = {}) {
  const { size: n } = e;
  let r = t;
  n && (Dn(t, n), r = bn(t, n));
  let i = r.slice(2);
  i.length % 2 && (i = `0${i}`);
  const s = i.length / 2, o = new Uint8Array(s);
  for (let c = 0, u = 0; c < s; c++) {
    const a = Ht(i.charCodeAt(u++)), g = Ht(i.charCodeAt(u++));
    if (a === void 0 || g === void 0)
      throw new F(`Invalid byte sequence ("${i[u - 2]}${i[u - 1]}" in "${i}").`);
    o[c] = a * 16 + g;
  }
  return o;
}
function ni(t, e = {}) {
  const { size: n } = e, r = Xr.encode(t);
  return typeof n == "number" ? (Lr(r, n), ri(r, n)) : r;
}
function ri(t, e) {
  return Hr(t, { dir: "right", size: e });
}
function Rt(t) {
  return t.length;
}
function ii(t) {
  try {
    return Jr(t), !0;
  } catch {
    return !1;
  }
}
class Oe extends F {
  constructor(e) {
    super(`Value \`${typeof e == "object" ? St(e) : e}\` of type \`${typeof e}\` is an invalid Bytes value.`, {
      metaMessages: ["Bytes values must be of type `Bytes`."]
    }), Object.defineProperty(this, "name", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: "Bytes.InvalidBytesTypeError"
    });
  }
}
class si extends F {
  constructor({ givenSize: e, maxSize: n }) {
    super(`Size cannot exceed \`${n}\` bytes. Given size: \`${e}\` bytes.`), Object.defineProperty(this, "name", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: "Bytes.SizeOverflowError"
    });
  }
}
class oi extends F {
  constructor({ size: e, targetSize: n, type: r }) {
    super(`${r.charAt(0).toUpperCase()}${r.slice(1).toLowerCase()} size (\`${e}\`) exceeds padding size (\`${n}\`).`), Object.defineProperty(this, "name", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: "Bytes.SizeExceedsPaddingSizeError"
    });
  }
}
function mn(t, e = {}) {
  const { as: n = typeof t == "string" ? "Hex" : "Bytes" } = e, r = kr(Qr(t));
  return n === "Bytes" ? r : Fe(r);
}
class ui extends Map {
  constructor(e) {
    super(), Object.defineProperty(this, "maxSize", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: void 0
    }), this.maxSize = e;
  }
  get(e) {
    const n = super.get(e);
    return super.has(e) && n !== void 0 && (this.delete(e), super.set(e, n)), n;
  }
  set(e, n) {
    if (super.set(e, n), this.maxSize && this.size > this.maxSize) {
      const r = this.keys().next().value;
      r && this.delete(r);
    }
    return this;
  }
}
const ci = {
  checksum: /* @__PURE__ */ new ui(8192)
}, Je = ci.checksum;
function En(t, e = {}) {
  const { compressed: n } = e, { prefix: r, x: i, y: s } = t;
  if (n === !1 || typeof i == "bigint" && typeof s == "bigint") {
    if (r !== 4)
      throw new qt({
        prefix: r,
        cause: new wi()
      });
    return;
  }
  if (n === !0 || typeof i == "bigint" && typeof s > "u") {
    if (r !== 3 && r !== 2)
      throw new qt({
        prefix: r,
        cause: new di()
      });
    return;
  }
  throw new hi({ publicKey: t });
}
function ai(t) {
  const e = (() => {
    if (Zr(t))
      return Bn(t);
    if (ii(t))
      return fi(t);
    const { prefix: n, x: r, y: i } = t;
    return typeof r == "bigint" && typeof i == "bigint" ? { prefix: n ?? 4, x: r, y: i } : { prefix: n, x: r };
  })();
  return En(e), e;
}
function fi(t) {
  return Bn(Fe(t));
}
function Bn(t) {
  if (t.length !== 132 && t.length !== 130 && t.length !== 68)
    throw new gi({ publicKey: t });
  if (t.length === 130) {
    const r = BigInt(ee(t, 0, 32)), i = BigInt(ee(t, 32, 64));
    return {
      prefix: 4,
      x: r,
      y: i
    };
  }
  if (t.length === 132) {
    const r = Number(ee(t, 0, 1)), i = BigInt(ee(t, 1, 33)), s = BigInt(ee(t, 33, 65));
    return {
      prefix: r,
      x: i,
      y: s
    };
  }
  const e = Number(ee(t, 0, 1)), n = BigInt(ee(t, 1, 33));
  return {
    prefix: e,
    x: n
  };
}
function li(t, e = {}) {
  En(t);
  const { prefix: n, x: r, y: i } = t, { includePrefix: s = !0 } = e;
  return jr(
    s ? Xe(n, { size: 1 }) : "0x",
    Xe(r, { size: 32 }),
    // If the public key is not compressed, add the y coordinate.
    typeof i == "bigint" ? Xe(i, { size: 32 }) : "0x"
  );
}
class hi extends F {
  constructor({ publicKey: e }) {
    super(`Value \`${St(e)}\` is not a valid public key.`, {
      metaMessages: [
        "Public key must contain:",
        "- an `x` and `prefix` value (compressed)",
        "- an `x`, `y`, and `prefix` value (uncompressed)"
      ]
    }), Object.defineProperty(this, "name", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: "PublicKey.InvalidError"
    });
  }
}
class qt extends F {
  constructor({ prefix: e, cause: n }) {
    super(`Prefix "${e}" is invalid.`, {
      cause: n
    }), Object.defineProperty(this, "name", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: "PublicKey.InvalidPrefixError"
    });
  }
}
class di extends F {
  constructor() {
    super("Prefix must be 2 or 3 for compressed public keys."), Object.defineProperty(this, "name", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: "PublicKey.InvalidCompressedPrefixError"
    });
  }
}
class wi extends F {
  constructor() {
    super("Prefix must be 4 for uncompressed public keys."), Object.defineProperty(this, "name", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: "PublicKey.InvalidUncompressedPrefixError"
    });
  }
}
let gi = class extends F {
  constructor({ publicKey: e }) {
    super(`Value \`${e}\` is an invalid public key size.`, {
      metaMessages: [
        "Expected: 33 bytes (compressed + prefix), 64 bytes (uncompressed) or 65 bytes (uncompressed + prefix).",
        `Received ${oe(Ut(e))} bytes.`
      ]
    }), Object.defineProperty(this, "name", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: "PublicKey.InvalidSerializedSizeError"
    });
  }
};
const pi = /^0x[a-fA-F0-9]{40}$/;
function An(t, e = {}) {
  const { strict: n = !0 } = e;
  if (!pi.test(t))
    throw new Vt({
      address: t,
      cause: new bi()
    });
  if (n) {
    if (t.toLowerCase() === t)
      return;
    if (Sn(t) !== t)
      throw new Vt({
        address: t,
        cause: new yi()
      });
  }
}
function Sn(t) {
  if (Je.has(t))
    return Je.get(t);
  An(t, { strict: !1 });
  const e = t.substring(2).toLowerCase(), n = mn(ni(e), { as: "Bytes" }), r = e.split("");
  for (let s = 0; s < 40; s += 2)
    n[s >> 1] >> 4 >= 8 && r[s] && (r[s] = r[s].toUpperCase()), (n[s >> 1] & 15) >= 8 && r[s + 1] && (r[s + 1] = r[s + 1].toUpperCase());
  const i = `0x${r.join("")}`;
  return Je.set(t, i), i;
}
function Di(t, e = {}) {
  const { checksum: n = !1 } = e;
  return An(t), n ? Sn(t) : t;
}
function xi(t, e = {}) {
  const n = mn(`0x${li(t).slice(4)}`).substring(26);
  return Di(`0x${n}`, e);
}
class Vt extends F {
  constructor({ address: e, cause: n }) {
    super(`Address "${e}" is invalid.`, {
      cause: n
    }), Object.defineProperty(this, "name", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: "Address.InvalidAddressError"
    });
  }
}
class bi extends F {
  constructor() {
    super("Address is not a 20 byte (40 hexadecimal character) value."), Object.defineProperty(this, "name", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: "Address.InvalidInputError"
    });
  }
}
class yi extends F {
  constructor() {
    super("Address does not match its checksum counterpart."), Object.defineProperty(this, "name", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: "Address.InvalidChecksumError"
    });
  }
}
class Un extends yt {
  constructor(e, n) {
    super(), this.finished = !1, this.destroyed = !1, rr(e);
    const r = Re(n);
    if (this.iHash = e.create(), typeof this.iHash.update != "function")
      throw new Error("Expected instance of class which extends utils.Hash");
    this.blockLen = this.iHash.blockLen, this.outputLen = this.iHash.outputLen;
    const i = this.blockLen, s = new Uint8Array(i);
    s.set(r.length > i ? e.create().update(r).digest() : r);
    for (let o = 0; o < s.length; o++)
      s[o] ^= 54;
    this.iHash.update(s), this.oHash = e.create();
    for (let o = 0; o < s.length; o++)
      s[o] ^= 106;
    this.oHash.update(s), xe(s);
  }
  update(e) {
    return De(this), this.iHash.update(e), this;
  }
  digestInto(e) {
    De(this), le(e, this.outputLen), this.finished = !0, this.iHash.digestInto(e), this.oHash.update(e), this.oHash.digestInto(e), this.destroy();
  }
  digest() {
    const e = new Uint8Array(this.oHash.outputLen);
    return this.digestInto(e), e;
  }
  _cloneInto(e) {
    e || (e = Object.create(Object.getPrototypeOf(this), {}));
    const { oHash: n, iHash: r, finished: i, destroyed: s, blockLen: o, outputLen: c } = this;
    return e = e, e.finished = i, e.destroyed = s, e.blockLen = o, e.outputLen = c, e.oHash = n._cloneInto(e.oHash), e.iHash = r._cloneInto(e.iHash), e;
  }
  clone() {
    return this._cloneInto();
  }
  destroy() {
    this.destroyed = !0, this.oHash.destroy(), this.iHash.destroy();
  }
}
const vn = (t, e, n) => new Un(t, e).update(n).digest();
vn.create = (t, e) => new Un(t, e);
const j = BigInt(0), R = BigInt(1), ae = /* @__PURE__ */ BigInt(2), mi = /* @__PURE__ */ BigInt(3), In = /* @__PURE__ */ BigInt(4), Cn = /* @__PURE__ */ BigInt(5), kn = /* @__PURE__ */ BigInt(8);
function V(t, e) {
  const n = t % e;
  return n >= j ? n : e + n;
}
function Z(t, e, n) {
  let r = t;
  for (; e-- > j; )
    r *= r, r %= n;
  return r;
}
function dt(t, e) {
  if (t === j)
    throw new Error("invert: expected non-zero number");
  if (e <= j)
    throw new Error("invert: expected positive modulus, got " + e);
  let n = V(t, e), r = e, i = j, s = R;
  for (; n !== j; ) {
    const c = r / n, u = r % n, a = i - s * c;
    r = n, n = u, i = s, s = a;
  }
  if (r !== R)
    throw new Error("invert: does not exist");
  return V(i, e);
}
function Tn(t, e) {
  const n = (t.ORDER + R) / In, r = t.pow(e, n);
  if (!t.eql(t.sqr(r), e))
    throw new Error("Cannot find square root");
  return r;
}
function Ei(t, e) {
  const n = (t.ORDER - Cn) / kn, r = t.mul(e, ae), i = t.pow(r, n), s = t.mul(e, i), o = t.mul(t.mul(s, ae), i), c = t.mul(s, t.sub(o, t.ONE));
  if (!t.eql(t.sqr(c), e))
    throw new Error("Cannot find square root");
  return c;
}
function Bi(t) {
  if (t < BigInt(3))
    throw new Error("sqrt is not defined for small field");
  let e = t - R, n = 0;
  for (; e % ae === j; )
    e /= ae, n++;
  let r = ae;
  const i = vt(t);
  for (; jt(i, r) === 1; )
    if (r++ > 1e3)
      throw new Error("Cannot find square root: probably non-prime P");
  if (n === 1)
    return Tn;
  let s = i.pow(r, e);
  const o = (e + R) / ae;
  return function(u, a) {
    if (u.is0(a))
      return a;
    if (jt(u, a) !== 1)
      throw new Error("Cannot find square root");
    let g = n, x = u.mul(u.ONE, s), B = u.pow(a, e), v = u.pow(a, o);
    for (; !u.eql(B, u.ONE); ) {
      if (u.is0(B))
        return u.ZERO;
      let w = 1, d = u.sqr(B);
      for (; !u.eql(d, u.ONE); )
        if (w++, d = u.sqr(d), w === g)
          throw new Error("Cannot find square root");
      const D = R << BigInt(g - w - 1), h = u.pow(x, D);
      g = w, x = u.sqr(h), B = u.mul(B, x), v = u.mul(v, h);
    }
    return v;
  };
}
function Ai(t) {
  return t % In === mi ? Tn : t % kn === Cn ? Ei : Bi(t);
}
const Si = [
  "create",
  "isValid",
  "is0",
  "neg",
  "inv",
  "sqrt",
  "sqr",
  "eql",
  "add",
  "sub",
  "mul",
  "pow",
  "div",
  "addN",
  "subN",
  "mulN",
  "sqrN"
];
function Ui(t) {
  const e = {
    ORDER: "bigint",
    MASK: "bigint",
    BYTES: "isSafeInteger",
    BITS: "isSafeInteger"
  }, n = Si.reduce((r, i) => (r[i] = "function", r), e);
  return Ve(t, n);
}
function vi(t, e, n) {
  if (n < j)
    throw new Error("invalid exponent, negatives unsupported");
  if (n === j)
    return t.ONE;
  if (n === R)
    return e;
  let r = t.ONE, i = e;
  for (; n > j; )
    n & R && (r = t.mul(r, i)), i = t.sqr(i), n >>= R;
  return r;
}
function zn(t, e, n = !1) {
  const r = new Array(e.length).fill(n ? t.ZERO : void 0), i = e.reduce((o, c, u) => t.is0(c) ? o : (r[u] = o, t.mul(o, c)), t.ONE), s = t.inv(i);
  return e.reduceRight((o, c, u) => t.is0(c) ? o : (r[u] = t.mul(o, r[u]), t.mul(o, c)), s), r;
}
function jt(t, e) {
  const n = (t.ORDER - R) / ae, r = t.pow(e, n), i = t.eql(r, t.ONE), s = t.eql(r, t.ZERO), o = t.eql(r, t.neg(t.ONE));
  if (!i && !s && !o)
    throw new Error("invalid Legendre symbol result");
  return i ? 1 : s ? 0 : -1;
}
function On(t, e) {
  e !== void 0 && Se(e);
  const n = e !== void 0 ? e : t.toString(2).length, r = Math.ceil(n / 8);
  return { nBitLength: n, nByteLength: r };
}
function vt(t, e, n = !1, r = {}) {
  if (t <= j)
    throw new Error("invalid field: expected ORDER > 0, got " + t);
  const { nBitLength: i, nByteLength: s } = On(t, e);
  if (s > 2048)
    throw new Error("invalid field: expected ORDER of <= 2048 bytes");
  let o;
  const c = Object.freeze({
    ORDER: t,
    isLE: n,
    BITS: i,
    BYTES: s,
    MASK: qe(i),
    ZERO: j,
    ONE: R,
    create: (u) => V(u, t),
    isValid: (u) => {
      if (typeof u != "bigint")
        throw new Error("invalid field element: expected bigint, got " + typeof u);
      return j <= u && u < t;
    },
    is0: (u) => u === j,
    isOdd: (u) => (u & R) === R,
    neg: (u) => V(-u, t),
    eql: (u, a) => u === a,
    sqr: (u) => V(u * u, t),
    add: (u, a) => V(u + a, t),
    sub: (u, a) => V(u - a, t),
    mul: (u, a) => V(u * a, t),
    pow: (u, a) => vi(c, u, a),
    div: (u, a) => V(u * dt(a, t), t),
    // Same as above, but doesn't normalize
    sqrN: (u) => u * u,
    addN: (u, a) => u + a,
    subN: (u, a) => u - a,
    mulN: (u, a) => u * a,
    inv: (u) => dt(u, t),
    sqrt: r.sqrt || ((u) => (o || (o = Ai(t)), o(c, u))),
    toBytes: (u) => n ? pn(u, s) : Ce(u, s),
    fromBytes: (u) => {
      if (u.length !== s)
        throw new Error("Field.fromBytes: expected " + s + " bytes, got " + u.length);
      return n ? gn(u) : fe(u);
    },
    // TODO: we don't need it here, move out to separate fn
    invertBatch: (u) => zn(c, u),
    // We can't move this out because Fp6, Fp12 implement it
    // and it's unclear what to return in there.
    cmov: (u, a, g) => g ? a : u
  });
  return Object.freeze(c);
}
function $n(t) {
  if (typeof t != "bigint")
    throw new Error("field order must be bigint");
  const e = t.toString(2).length;
  return Math.ceil(e / 8);
}
function _n(t) {
  const e = $n(t);
  return e + Math.ceil(e / 2);
}
function Ii(t, e, n = !1) {
  const r = t.length, i = $n(e), s = _n(e);
  if (r < 16 || r < s || r > 1024)
    throw new Error("expected " + s + "-1024 bytes of input, got " + r);
  const o = n ? gn(t) : fe(t), c = V(o, e - R) + R;
  return n ? pn(c, i) : Ce(c, i);
}
const Kt = BigInt(0), wt = BigInt(1);
function Qe(t, e) {
  const n = e.negate();
  return t ? n : e;
}
function Pn(t, e) {
  if (!Number.isSafeInteger(t) || t <= 0 || t > e)
    throw new Error("invalid window size, expected [1.." + e + "], got W=" + t);
}
function et(t, e) {
  Pn(t, e);
  const n = Math.ceil(e / t) + 1, r = 2 ** (t - 1), i = 2 ** t, s = qe(t), o = BigInt(t);
  return { windows: n, windowSize: r, mask: s, maxNumber: i, shiftBy: o };
}
function Zt(t, e, n) {
  const { windowSize: r, mask: i, maxNumber: s, shiftBy: o } = n;
  let c = Number(t & i), u = t >> o;
  c > r && (c -= s, u += wt);
  const a = e * r, g = a + Math.abs(c) - 1, x = c === 0, B = c < 0, v = e % 2 !== 0;
  return { nextN: u, offset: g, isZero: x, isNeg: B, isNegF: v, offsetF: a };
}
function Ci(t, e) {
  if (!Array.isArray(t))
    throw new Error("array expected");
  t.forEach((n, r) => {
    if (!(n instanceof e))
      throw new Error("invalid point at index " + r);
  });
}
function ki(t, e) {
  if (!Array.isArray(t))
    throw new Error("array of scalars expected");
  t.forEach((n, r) => {
    if (!e.isValid(n))
      throw new Error("invalid scalar at index " + r);
  });
}
const tt = /* @__PURE__ */ new WeakMap(), Fn = /* @__PURE__ */ new WeakMap();
function nt(t) {
  return Fn.get(t) || 1;
}
function Ti(t, e) {
  return {
    constTimeNegate: Qe,
    hasPrecomputes(n) {
      return nt(n) !== 1;
    },
    // non-const time multiplication ladder
    unsafeLadder(n, r, i = t.ZERO) {
      let s = n;
      for (; r > Kt; )
        r & wt && (i = i.add(s)), s = s.double(), r >>= wt;
      return i;
    },
    /**
     * Creates a wNAF precomputation window. Used for caching.
     * Default window size is set by `utils.precompute()` and is equal to 8.
     * Number of precomputed points depends on the curve size:
     * 2^(𝑊−1) * (Math.ceil(𝑛 / 𝑊) + 1), where:
     * - 𝑊 is the window size
     * - 𝑛 is the bitlength of the curve order.
     * For a 256-bit curve and window size 8, the number of precomputed points is 128 * 33 = 4224.
     * @param elm Point instance
     * @param W window size
     * @returns precomputed point tables flattened to a single array
     */
    precomputeWindow(n, r) {
      const { windows: i, windowSize: s } = et(r, e), o = [];
      let c = n, u = c;
      for (let a = 0; a < i; a++) {
        u = c, o.push(u);
        for (let g = 1; g < s; g++)
          u = u.add(c), o.push(u);
        c = u.double();
      }
      return o;
    },
    /**
     * Implements ec multiplication using precomputed tables and w-ary non-adjacent form.
     * @param W window size
     * @param precomputes precomputed tables
     * @param n scalar (we don't check here, but should be less than curve order)
     * @returns real and fake (for const-time) points
     */
    wNAF(n, r, i) {
      let s = t.ZERO, o = t.BASE;
      const c = et(n, e);
      for (let u = 0; u < c.windows; u++) {
        const { nextN: a, offset: g, isZero: x, isNeg: B, isNegF: v, offsetF: w } = Zt(i, u, c);
        i = a, x ? o = o.add(Qe(v, r[w])) : s = s.add(Qe(B, r[g]));
      }
      return { p: s, f: o };
    },
    /**
     * Implements ec unsafe (non const-time) multiplication using precomputed tables and w-ary non-adjacent form.
     * @param W window size
     * @param precomputes precomputed tables
     * @param n scalar (we don't check here, but should be less than curve order)
     * @param acc accumulator point to add result of multiplication
     * @returns point
     */
    wNAFUnsafe(n, r, i, s = t.ZERO) {
      const o = et(n, e);
      for (let c = 0; c < o.windows && i !== Kt; c++) {
        const { nextN: u, offset: a, isZero: g, isNeg: x } = Zt(i, c, o);
        if (i = u, !g) {
          const B = r[a];
          s = s.add(x ? B.negate() : B);
        }
      }
      return s;
    },
    getPrecomputes(n, r, i) {
      let s = tt.get(r);
      return s || (s = this.precomputeWindow(r, n), n !== 1 && tt.set(r, i(s))), s;
    },
    wNAFCached(n, r, i) {
      const s = nt(n);
      return this.wNAF(s, this.getPrecomputes(s, n, i), r);
    },
    wNAFCachedUnsafe(n, r, i, s) {
      const o = nt(n);
      return o === 1 ? this.unsafeLadder(n, r, s) : this.wNAFUnsafe(o, this.getPrecomputes(o, n, i), r, s);
    },
    // We calculate precomputes for elliptic curve point multiplication
    // using windowed method. This specifies window size and
    // stores precomputed values. Usually only base point would be precomputed.
    setWindowSize(n, r) {
      Pn(r, e), Fn.set(n, r), tt.delete(n);
    }
  };
}
function zi(t, e, n, r) {
  Ci(n, t), ki(r, e);
  const i = n.length, s = r.length;
  if (i !== s)
    throw new Error("arrays of points and scalars must have equal length");
  const o = t.ZERO, c = _r(BigInt(i));
  let u = 1;
  c > 12 ? u = c - 3 : c > 4 ? u = c - 2 : c > 0 && (u = 2);
  const a = qe(u), g = new Array(Number(a) + 1).fill(o), x = Math.floor((e.BITS - 1) / u) * u;
  let B = o;
  for (let v = x; v >= 0; v -= u) {
    g.fill(o);
    for (let d = 0; d < s; d++) {
      const D = r[d], h = Number(D >> BigInt(v) & a);
      g[h] = g[h].add(n[d]);
    }
    let w = o;
    for (let d = g.length - 1, D = o; d > 0; d--)
      D = D.add(g[d]), w = w.add(D);
    if (B = B.add(w), v !== 0)
      for (let d = 0; d < u; d++)
        B = B.double();
  }
  return B;
}
function Ln(t) {
  return Ui(t.Fp), Ve(t, {
    n: "bigint",
    h: "bigint",
    Gx: "field",
    Gy: "field"
  }, {
    nBitLength: "isSafeInteger",
    nByteLength: "isSafeInteger"
  }), Object.freeze({
    ...On(t.n, t.nBitLength),
    ...t,
    p: t.Fp.ORDER
  });
}
function Yt(t) {
  t.lowS !== void 0 && Ue("lowS", t.lowS), t.prehash !== void 0 && Ue("prehash", t.prehash);
}
function Oi(t) {
  const e = Ln(t);
  Ve(e, {
    a: "field",
    b: "field"
  }, {
    allowInfinityPoint: "boolean",
    allowedPrivateKeyLengths: "array",
    clearCofactor: "function",
    fromBytes: "function",
    isTorsionFree: "function",
    toBytes: "function",
    wrapPrivateKey: "boolean"
  });
  const { endo: n, Fp: r, a: i } = e;
  if (n) {
    if (!r.eql(i, r.ZERO))
      throw new Error("invalid endo: CURVE.a must be 0");
    if (typeof n != "object" || typeof n.beta != "bigint" || typeof n.splitScalar != "function")
      throw new Error('invalid endo: expected "beta": bigint and "splitScalar": function');
  }
  return Object.freeze({ ...e });
}
class $i extends Error {
  constructor(e = "") {
    super(e);
  }
}
const te = {
  // asn.1 DER encoding utils
  Err: $i,
  // Basic building block is TLV (Tag-Length-Value)
  _tlv: {
    encode: (t, e) => {
      const { Err: n } = te;
      if (t < 0 || t > 256)
        throw new n("tlv.encode: wrong tag");
      if (e.length & 1)
        throw new n("tlv.encode: unpadded data");
      const r = e.length / 2, i = ze(r);
      if (i.length / 2 & 128)
        throw new n("tlv.encode: long form length too big");
      const s = r > 127 ? ze(i.length / 2 | 128) : "";
      return ze(t) + s + i + e;
    },
    // v - value, l - left bytes (unparsed)
    decode(t, e) {
      const { Err: n } = te;
      let r = 0;
      if (t < 0 || t > 256)
        throw new n("tlv.encode: wrong tag");
      if (e.length < 2 || e[r++] !== t)
        throw new n("tlv.decode: wrong tlv");
      const i = e[r++], s = !!(i & 128);
      let o = 0;
      if (!s)
        o = i;
      else {
        const u = i & 127;
        if (!u)
          throw new n("tlv.decode(long): indefinite length not supported");
        if (u > 4)
          throw new n("tlv.decode(long): byte length is too big");
        const a = e.subarray(r, r + u);
        if (a.length !== u)
          throw new n("tlv.decode: length bytes not complete");
        if (a[0] === 0)
          throw new n("tlv.decode(long): zero leftmost byte");
        for (const g of a)
          o = o << 8 | g;
        if (r += u, o < 128)
          throw new n("tlv.decode(long): not minimal encoding");
      }
      const c = e.subarray(r, r + o);
      if (c.length !== o)
        throw new n("tlv.decode: wrong value length");
      return { v: c, l: e.subarray(r + o) };
    }
  },
  // https://crypto.stackexchange.com/a/57734 Leftmost bit of first byte is 'negative' flag,
  // since we always use positive integers here. It must always be empty:
  // - add zero byte if exists
  // - if next byte doesn't have a flag, leading zero is not allowed (minimal encoding)
  _int: {
    encode(t) {
      const { Err: e } = te;
      if (t < ne)
        throw new e("integer: negative integers are not allowed");
      let n = ze(t);
      if (Number.parseInt(n[0], 16) & 8 && (n = "00" + n), n.length & 1)
        throw new e("unexpected DER parsing assertion: unpadded hex");
      return n;
    },
    decode(t) {
      const { Err: e } = te;
      if (t[0] & 128)
        throw new e("invalid signature integer: negative");
      if (t[0] === 0 && !(t[1] & 128))
        throw new e("invalid signature integer: unnecessary leading zero");
      return fe(t);
    }
  },
  toSig(t) {
    const { Err: e, _int: n, _tlv: r } = te, i = Y("signature", t), { v: s, l: o } = r.decode(48, i);
    if (o.length)
      throw new e("invalid signature: left bytes after parsing");
    const { v: c, l: u } = r.decode(2, s), { v: a, l: g } = r.decode(2, u);
    if (g.length)
      throw new e("invalid signature: left bytes after parsing");
    return { r: n.decode(c), s: n.decode(a) };
  },
  hexFromSig(t) {
    const { _tlv: e, _int: n } = te, r = e.encode(2, n.encode(t.r)), i = e.encode(2, n.encode(t.s)), s = r + i;
    return e.encode(48, s);
  }
};
function rt(t, e) {
  return ve(Ce(t, e));
}
const ne = BigInt(0), L = BigInt(1);
BigInt(2);
const it = BigInt(3), _i = BigInt(4);
function Pi(t) {
  const e = Oi(t), { Fp: n } = e, r = vt(e.n, e.nBitLength), i = e.toBytes || ((l, f, p) => {
    const m = f.toAffine();
    return Pe(Uint8Array.from([4]), n.toBytes(m.x), n.toBytes(m.y));
  }), s = e.fromBytes || ((l) => {
    const f = l.subarray(1), p = n.fromBytes(f.subarray(0, n.BYTES)), m = n.fromBytes(f.subarray(n.BYTES, 2 * n.BYTES));
    return { x: p, y: m };
  });
  function o(l) {
    const { a: f, b: p } = e, m = n.sqr(l), S = n.mul(m, l);
    return n.add(n.add(S, n.mul(l, f)), p);
  }
  function c(l, f) {
    const p = n.sqr(f), m = o(l);
    return n.eql(p, m);
  }
  if (!c(e.Gx, e.Gy))
    throw new Error("bad curve params: generator point");
  const u = n.mul(n.pow(e.a, it), _i), a = n.mul(n.sqr(e.b), BigInt(27));
  if (n.is0(n.add(u, a)))
    throw new Error("bad curve params: a or b");
  function g(l) {
    return At(l, L, e.n);
  }
  function x(l) {
    const { allowedPrivateKeyLengths: f, nByteLength: p, wrapPrivateKey: m, n: S } = e;
    if (f && typeof l != "bigint") {
      if (Ie(l) && (l = ve(l)), typeof l != "string" || !f.includes(l.length))
        throw new Error("invalid private key");
      l = l.padStart(p * 2, "0");
    }
    let C;
    try {
      C = typeof l == "bigint" ? l : fe(Y("private key", l, p));
    } catch {
      throw new Error("invalid private key, expected hex or " + p + " bytes, got " + typeof l);
    }
    return m && (C = V(C, S)), pe("private key", C, L, S), C;
  }
  function B(l) {
    if (!(l instanceof d))
      throw new Error("ProjectivePoint expected");
  }
  const v = Lt((l, f) => {
    const { px: p, py: m, pz: S } = l;
    if (n.eql(S, n.ONE))
      return { x: p, y: m };
    const C = l.is0();
    f == null && (f = C ? n.ONE : n.inv(S));
    const $ = n.mul(p, f), _ = n.mul(m, f), A = n.mul(S, f);
    if (C)
      return { x: n.ZERO, y: n.ZERO };
    if (!n.eql(A, n.ONE))
      throw new Error("invZ was invalid");
    return { x: $, y: _ };
  }), w = Lt((l) => {
    if (l.is0()) {
      if (e.allowInfinityPoint && !n.is0(l.py))
        return;
      throw new Error("bad point: ZERO");
    }
    const { x: f, y: p } = l.toAffine();
    if (!n.isValid(f) || !n.isValid(p))
      throw new Error("bad point: x or y not FE");
    if (!c(f, p))
      throw new Error("bad point: equation left != right");
    if (!l.isTorsionFree())
      throw new Error("bad point: not in prime-order subgroup");
    return !0;
  });
  class d {
    constructor(f, p, m) {
      if (f == null || !n.isValid(f))
        throw new Error("x required");
      if (p == null || !n.isValid(p) || n.is0(p))
        throw new Error("y required");
      if (m == null || !n.isValid(m))
        throw new Error("z required");
      this.px = f, this.py = p, this.pz = m, Object.freeze(this);
    }
    // Does not validate if the point is on-curve.
    // Use fromHex instead, or call assertValidity() later.
    static fromAffine(f) {
      const { x: p, y: m } = f || {};
      if (!f || !n.isValid(p) || !n.isValid(m))
        throw new Error("invalid affine point");
      if (f instanceof d)
        throw new Error("projective point not allowed");
      const S = (C) => n.eql(C, n.ZERO);
      return S(p) && S(m) ? d.ZERO : new d(p, m, n.ONE);
    }
    get x() {
      return this.toAffine().x;
    }
    get y() {
      return this.toAffine().y;
    }
    /**
     * Takes a bunch of Projective Points but executes only one
     * inversion on all of them. Inversion is very slow operation,
     * so this improves performance massively.
     * Optimization: converts a list of projective points to a list of identical points with Z=1.
     */
    static normalizeZ(f) {
      const p = zn(n, f.map((m) => m.pz));
      return f.map((m, S) => m.toAffine(p[S])).map(d.fromAffine);
    }
    /**
     * Converts hash string or Uint8Array to Point.
     * @param hex short/long ECDSA hex
     */
    static fromHex(f) {
      const p = d.fromAffine(s(Y("pointHex", f)));
      return p.assertValidity(), p;
    }
    // Multiplies generator point by privateKey.
    static fromPrivateKey(f) {
      return d.BASE.multiply(x(f));
    }
    // Multiscalar Multiplication
    static msm(f, p) {
      return zi(d, r, f, p);
    }
    // "Private method", don't use it directly
    _setWindowSize(f) {
      E.setWindowSize(this, f);
    }
    // A point on curve is valid if it conforms to equation.
    assertValidity() {
      w(this);
    }
    hasEvenY() {
      const { y: f } = this.toAffine();
      if (n.isOdd)
        return !n.isOdd(f);
      throw new Error("Field doesn't support isOdd");
    }
    /**
     * Compare one point to another.
     */
    equals(f) {
      B(f);
      const { px: p, py: m, pz: S } = this, { px: C, py: $, pz: _ } = f, A = n.eql(n.mul(p, _), n.mul(C, S)), I = n.eql(n.mul(m, _), n.mul($, S));
      return A && I;
    }
    /**
     * Flips point to one corresponding to (x, -y) in Affine coordinates.
     */
    negate() {
      return new d(this.px, n.neg(this.py), this.pz);
    }
    // Renes-Costello-Batina exception-free doubling formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 3
    // Cost: 8M + 3S + 3*a + 2*b3 + 15add.
    double() {
      const { a: f, b: p } = e, m = n.mul(p, it), { px: S, py: C, pz: $ } = this;
      let _ = n.ZERO, A = n.ZERO, I = n.ZERO, k = n.mul(S, S), M = n.mul(C, C), y = n.mul($, $), b = n.mul(S, C);
      return b = n.add(b, b), I = n.mul(S, $), I = n.add(I, I), _ = n.mul(f, I), A = n.mul(m, y), A = n.add(_, A), _ = n.sub(M, A), A = n.add(M, A), A = n.mul(_, A), _ = n.mul(b, _), I = n.mul(m, I), y = n.mul(f, y), b = n.sub(k, y), b = n.mul(f, b), b = n.add(b, I), I = n.add(k, k), k = n.add(I, k), k = n.add(k, y), k = n.mul(k, b), A = n.add(A, k), y = n.mul(C, $), y = n.add(y, y), k = n.mul(y, b), _ = n.sub(_, k), I = n.mul(y, M), I = n.add(I, I), I = n.add(I, I), new d(_, A, I);
    }
    // Renes-Costello-Batina exception-free addition formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 1
    // Cost: 12M + 0S + 3*a + 3*b3 + 23add.
    add(f) {
      B(f);
      const { px: p, py: m, pz: S } = this, { px: C, py: $, pz: _ } = f;
      let A = n.ZERO, I = n.ZERO, k = n.ZERO;
      const M = e.a, y = n.mul(e.b, it);
      let b = n.mul(p, C), U = n.mul(m, $), O = n.mul(S, _), T = n.add(p, m), z = n.add(C, $);
      T = n.mul(T, z), z = n.add(b, U), T = n.sub(T, z), z = n.add(p, S);
      let P = n.add(C, _);
      return z = n.mul(z, P), P = n.add(b, O), z = n.sub(z, P), P = n.add(m, S), A = n.add($, _), P = n.mul(P, A), A = n.add(U, O), P = n.sub(P, A), k = n.mul(M, z), A = n.mul(y, O), k = n.add(A, k), A = n.sub(U, k), k = n.add(U, k), I = n.mul(A, k), U = n.add(b, b), U = n.add(U, b), O = n.mul(M, O), z = n.mul(y, z), U = n.add(U, O), O = n.sub(b, O), O = n.mul(M, O), z = n.add(z, O), b = n.mul(U, z), I = n.add(I, b), b = n.mul(P, z), A = n.mul(T, A), A = n.sub(A, b), b = n.mul(T, U), k = n.mul(P, k), k = n.add(k, b), new d(A, I, k);
    }
    subtract(f) {
      return this.add(f.negate());
    }
    is0() {
      return this.equals(d.ZERO);
    }
    wNAF(f) {
      return E.wNAFCached(this, f, d.normalizeZ);
    }
    /**
     * Non-constant-time multiplication. Uses double-and-add algorithm.
     * It's faster, but should only be used when you don't care about
     * an exposed private key e.g. sig verification, which works over *public* keys.
     */
    multiplyUnsafe(f) {
      const { endo: p, n: m } = e;
      pe("scalar", f, ne, m);
      const S = d.ZERO;
      if (f === ne)
        return S;
      if (this.is0() || f === L)
        return this;
      if (!p || E.hasPrecomputes(this))
        return E.wNAFCachedUnsafe(this, f, d.normalizeZ);
      let { k1neg: C, k1: $, k2neg: _, k2: A } = p.splitScalar(f), I = S, k = S, M = this;
      for (; $ > ne || A > ne; )
        $ & L && (I = I.add(M)), A & L && (k = k.add(M)), M = M.double(), $ >>= L, A >>= L;
      return C && (I = I.negate()), _ && (k = k.negate()), k = new d(n.mul(k.px, p.beta), k.py, k.pz), I.add(k);
    }
    /**
     * Constant time multiplication.
     * Uses wNAF method. Windowed method may be 10% faster,
     * but takes 2x longer to generate and consumes 2x memory.
     * Uses precomputes when available.
     * Uses endomorphism for Koblitz curves.
     * @param scalar by which the point would be multiplied
     * @returns New point
     */
    multiply(f) {
      const { endo: p, n: m } = e;
      pe("scalar", f, L, m);
      let S, C;
      if (p) {
        const { k1neg: $, k1: _, k2neg: A, k2: I } = p.splitScalar(f);
        let { p: k, f: M } = this.wNAF(_), { p: y, f: b } = this.wNAF(I);
        k = E.constTimeNegate($, k), y = E.constTimeNegate(A, y), y = new d(n.mul(y.px, p.beta), y.py, y.pz), S = k.add(y), C = M.add(b);
      } else {
        const { p: $, f: _ } = this.wNAF(f);
        S = $, C = _;
      }
      return d.normalizeZ([S, C])[0];
    }
    /**
     * Efficiently calculate `aP + bQ`. Unsafe, can expose private key, if used incorrectly.
     * Not using Strauss-Shamir trick: precomputation tables are faster.
     * The trick could be useful if both P and Q are not G (not in our case).
     * @returns non-zero affine point
     */
    multiplyAndAddUnsafe(f, p, m) {
      const S = d.BASE, C = (_, A) => A === ne || A === L || !_.equals(S) ? _.multiplyUnsafe(A) : _.multiply(A), $ = C(this, p).add(C(f, m));
      return $.is0() ? void 0 : $;
    }
    // Converts Projective point to affine (x, y) coordinates.
    // Can accept precomputed Z^-1 - for example, from invertBatch.
    // (x, y, z) ∋ (x=x/z, y=y/z)
    toAffine(f) {
      return v(this, f);
    }
    isTorsionFree() {
      const { h: f, isTorsionFree: p } = e;
      if (f === L)
        return !0;
      if (p)
        return p(d, this);
      throw new Error("isTorsionFree() has not been declared for the elliptic curve");
    }
    clearCofactor() {
      const { h: f, clearCofactor: p } = e;
      return f === L ? this : p ? p(d, this) : this.multiplyUnsafe(e.h);
    }
    toRawBytes(f = !0) {
      return Ue("isCompressed", f), this.assertValidity(), i(d, this, f);
    }
    toHex(f = !0) {
      return Ue("isCompressed", f), ve(this.toRawBytes(f));
    }
  }
  d.BASE = new d(e.Gx, e.Gy, n.ONE), d.ZERO = new d(n.ZERO, n.ONE, n.ZERO);
  const { endo: D, nBitLength: h } = e, E = Ti(d, D ? Math.ceil(h / 2) : h);
  return {
    CURVE: e,
    ProjectivePoint: d,
    normPrivateKeyToScalar: x,
    weierstrassEquation: o,
    isWithinCurveOrder: g
  };
}
function Fi(t) {
  const e = Ln(t);
  return Ve(e, {
    hash: "hash",
    hmac: "function",
    randomBytes: "function"
  }, {
    bits2int: "function",
    bits2int_modN: "function",
    lowS: "boolean"
  }), Object.freeze({ lowS: !0, ...e });
}
function Li(t) {
  const e = Fi(t), { Fp: n, n: r, nByteLength: i, nBitLength: s } = e, o = n.BYTES + 1, c = 2 * n.BYTES + 1;
  function u(y) {
    return V(y, r);
  }
  function a(y) {
    return dt(y, r);
  }
  const { ProjectivePoint: g, normPrivateKeyToScalar: x, weierstrassEquation: B, isWithinCurveOrder: v } = Pi({
    ...e,
    toBytes(y, b, U) {
      const O = b.toAffine(), T = n.toBytes(O.x), z = Pe;
      return Ue("isCompressed", U), U ? z(Uint8Array.from([b.hasEvenY() ? 2 : 3]), T) : z(Uint8Array.from([4]), T, n.toBytes(O.y));
    },
    fromBytes(y) {
      const b = y.length, U = y[0], O = y.subarray(1);
      if (b === o && (U === 2 || U === 3)) {
        const T = fe(O);
        if (!At(T, L, n.ORDER))
          throw new Error("Point is not on curve");
        const z = B(T);
        let P;
        try {
          P = n.sqrt(z);
        } catch (W) {
          const q = W instanceof Error ? ": " + W.message : "";
          throw new Error("Point is not on curve" + q);
        }
        const N = (P & L) === L;
        return (U & 1) === 1 !== N && (P = n.neg(P)), { x: T, y: P };
      } else if (b === c && U === 4) {
        const T = n.fromBytes(O.subarray(0, n.BYTES)), z = n.fromBytes(O.subarray(n.BYTES, 2 * n.BYTES));
        return { x: T, y: z };
      } else {
        const T = o, z = c;
        throw new Error("invalid Point, expected length of " + T + ", or uncompressed " + z + ", got " + b);
      }
    }
  });
  function w(y) {
    const b = r >> L;
    return y > b;
  }
  function d(y) {
    return w(y) ? u(-y) : y;
  }
  const D = (y, b, U) => fe(y.slice(b, U));
  class h {
    constructor(b, U, O) {
      pe("r", b, L, r), pe("s", U, L, r), this.r = b, this.s = U, O != null && (this.recovery = O), Object.freeze(this);
    }
    // pair (bytes of r, bytes of s)
    static fromCompact(b) {
      const U = i;
      return b = Y("compactSignature", b, U * 2), new h(D(b, 0, U), D(b, U, 2 * U));
    }
    // DER encoded ECDSA signature
    // https://bitcoin.stackexchange.com/questions/57644/what-are-the-parts-of-a-bitcoin-transaction-input-script
    static fromDER(b) {
      const { r: U, s: O } = te.toSig(Y("DER", b));
      return new h(U, O);
    }
    /**
     * @todo remove
     * @deprecated
     */
    assertValidity() {
    }
    addRecoveryBit(b) {
      return new h(this.r, this.s, b);
    }
    recoverPublicKey(b) {
      const { r: U, s: O, recovery: T } = this, z = S(Y("msgHash", b));
      if (T == null || ![0, 1, 2, 3].includes(T))
        throw new Error("recovery id invalid");
      const P = T === 2 || T === 3 ? U + e.n : U;
      if (P >= n.ORDER)
        throw new Error("recovery id 2 or 3 invalid");
      const N = (T & 1) === 0 ? "02" : "03", X = g.fromHex(N + rt(P, n.BYTES)), W = a(P), q = u(-z * W), he = u(O * W), re = g.BASE.multiplyAndAddUnsafe(X, q, he);
      if (!re)
        throw new Error("point at infinify");
      return re.assertValidity(), re;
    }
    // Signatures should be low-s, to prevent malleability.
    hasHighS() {
      return w(this.s);
    }
    normalizeS() {
      return this.hasHighS() ? new h(this.r, u(-this.s), this.recovery) : this;
    }
    // DER-encoded
    toDERRawBytes() {
      return _e(this.toDERHex());
    }
    toDERHex() {
      return te.hexFromSig(this);
    }
    // padded bytes of r, then padded bytes of s
    toCompactRawBytes() {
      return _e(this.toCompactHex());
    }
    toCompactHex() {
      const b = i;
      return rt(this.r, b) + rt(this.s, b);
    }
  }
  const E = {
    isValidPrivateKey(y) {
      try {
        return x(y), !0;
      } catch {
        return !1;
      }
    },
    normPrivateKeyToScalar: x,
    /**
     * Produces cryptographically secure private key from random of size
     * (groupLen + ceil(groupLen / 2)) with modulo bias being negligible.
     */
    randomPrivateKey: () => {
      const y = _n(e.n);
      return Ii(e.randomBytes(y), e.n);
    },
    /**
     * Creates precompute table for an arbitrary EC point. Makes point "cached".
     * Allows to massively speed-up `point.multiply(scalar)`.
     * @returns cached point
     * @example
     * const fast = utils.precompute(8, ProjectivePoint.fromHex(someonesPubKey));
     * fast.multiply(privKey); // much faster ECDH now
     */
    precompute(y = 8, b = g.BASE) {
      return b._setWindowSize(y), b.multiply(BigInt(3)), b;
    }
  };
  function l(y, b = !0) {
    return g.fromPrivateKey(y).toRawBytes(b);
  }
  function f(y) {
    if (typeof y == "bigint")
      return !1;
    if (y instanceof g)
      return !0;
    const U = Y("key", y).length, O = n.BYTES, T = O + 1, z = 2 * O + 1;
    if (!(e.allowedPrivateKeyLengths || i === T))
      return U === T || U === z;
  }
  function p(y, b, U = !0) {
    if (f(y) === !0)
      throw new Error("first arg must be private key");
    if (f(b) === !1)
      throw new Error("second arg must be public key");
    return g.fromHex(b).multiply(x(y)).toRawBytes(U);
  }
  const m = e.bits2int || function(y) {
    if (y.length > 8192)
      throw new Error("input is too large");
    const b = fe(y), U = y.length * 8 - s;
    return U > 0 ? b >> BigInt(U) : b;
  }, S = e.bits2int_modN || function(y) {
    return u(m(y));
  }, C = qe(s);
  function $(y) {
    return pe("num < 2^" + s, y, ne, C), Ce(y, i);
  }
  function _(y, b, U = A) {
    if (["recovered", "canonical"].some((ue) => ue in U))
      throw new Error("sign() legacy options not supported");
    const { hash: O, randomBytes: T } = e;
    let { lowS: z, prehash: P, extraEntropy: N } = U;
    z == null && (z = !0), y = Y("msgHash", y), Yt(U), P && (y = Y("prehashed msgHash", O(y)));
    const X = S(y), W = x(b), q = [$(W), $(X)];
    if (N != null && N !== !1) {
      const ue = N === !0 ? T(n.BYTES) : N;
      q.push(Y("extraEntropy", ue));
    }
    const he = Pe(...q), re = X;
    function Ke(ue) {
      const de = m(ue);
      if (!v(de))
        return;
      const Ze = a(de), be = g.BASE.multiply(de).toAffine(), ce = u(be.x);
      if (ce === ne)
        return;
      const ye = u(Ze * u(re + ce * W));
      if (ye === ne)
        return;
      let we = (be.x === ce ? 0 : 2) | Number(be.y & L), Tt = ye;
      return z && w(ye) && (Tt = d(ye), we ^= 1), new h(ce, Tt, we);
    }
    return { seed: he, k2sig: Ke };
  }
  const A = { lowS: e.lowS, prehash: !1 }, I = { lowS: e.lowS, prehash: !1 };
  function k(y, b, U = A) {
    const { seed: O, k2sig: T } = _(y, b, U), z = e;
    return Pr(z.hash.outputLen, z.nByteLength, z.hmac)(O, T);
  }
  g.BASE._setWindowSize(8);
  function M(y, b, U, O = I) {
    const T = y;
    b = Y("msgHash", b), U = Y("publicKey", U);
    const { lowS: z, prehash: P, format: N } = O;
    if (Yt(O), "strict" in O)
      throw new Error("options.strict was renamed to lowS");
    if (N !== void 0 && N !== "compact" && N !== "der")
      throw new Error("format must be compact or der");
    const X = typeof T == "string" || Ie(T), W = !X && !N && typeof T == "object" && T !== null && typeof T.r == "bigint" && typeof T.s == "bigint";
    if (!X && !W)
      throw new Error("invalid signature, expected Uint8Array, hex string or Signature instance");
    let q, he;
    try {
      if (W && (q = new h(T.r, T.s)), X) {
        try {
          N !== "compact" && (q = h.fromDER(T));
        } catch (we) {
          if (!(we instanceof te.Err))
            throw we;
        }
        !q && N !== "der" && (q = h.fromCompact(T));
      }
      he = g.fromHex(U);
    } catch {
      return !1;
    }
    if (!q || z && q.hasHighS())
      return !1;
    P && (b = e.hash(b));
    const { r: re, s: Ke } = q, ue = S(b), de = a(Ke), Ze = u(ue * de), be = u(re * de), ce = g.BASE.multiplyAndAddUnsafe(he, Ze, be)?.toAffine();
    return ce ? u(ce.x) === re : !1;
  }
  return {
    CURVE: e,
    getPublicKey: l,
    getSharedSecret: p,
    sign: k,
    verify: M,
    ProjectivePoint: g,
    Signature: h,
    utils: E
  };
}
function Hi(t) {
  return {
    hash: t,
    hmac: (e, ...n) => vn(t, e, ar(...n)),
    randomBytes: fr
  };
}
function Mi(t, e) {
  const n = (r) => Li({ ...t, ...Hi(r) });
  return { ...n(e), create: n };
}
const Hn = BigInt("0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f"), Wt = BigInt("0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141"), Ni = BigInt(0), Ri = BigInt(1), gt = BigInt(2), Gt = (t, e) => (t + e / gt) / e;
function qi(t) {
  const e = Hn, n = BigInt(3), r = BigInt(6), i = BigInt(11), s = BigInt(22), o = BigInt(23), c = BigInt(44), u = BigInt(88), a = t * t * t % e, g = a * a * t % e, x = Z(g, n, e) * g % e, B = Z(x, n, e) * g % e, v = Z(B, gt, e) * a % e, w = Z(v, i, e) * v % e, d = Z(w, s, e) * w % e, D = Z(d, c, e) * d % e, h = Z(D, u, e) * D % e, E = Z(h, c, e) * d % e, l = Z(E, n, e) * g % e, f = Z(l, o, e) * w % e, p = Z(f, r, e) * a % e, m = Z(p, gt, e);
  if (!pt.eql(pt.sqr(m), t))
    throw new Error("Cannot find square root");
  return m;
}
const pt = vt(Hn, void 0, void 0, { sqrt: qi }), Vi = Mi({
  a: Ni,
  b: BigInt(7),
  Fp: pt,
  n: Wt,
  Gx: BigInt("55066263022277343669578718895168534326250603453777594175500187360389116729240"),
  Gy: BigInt("32670510020758816978083085130507043184471273380659243275938904335757337482424"),
  h: BigInt(1),
  lowS: !0,
  // Allow only low-S signatures by default in sign() and verify()
  endo: {
    // Endomorphism, see above
    beta: BigInt("0x7ae96a2b657c07106e64479eac3434e99cf0497512f58995c1396c28719501ee"),
    splitScalar: (t) => {
      const e = Wt, n = BigInt("0x3086d221a7d46bcde86c90e49284eb15"), r = -Ri * BigInt("0xe4437ed6010e88286f547fa90abfe4c3"), i = BigInt("0x114ca50f7a8e2f3f657c1108d9d44cfd8"), s = n, o = BigInt("0x100000000000000000000000000000000"), c = Gt(s * t, e), u = Gt(-r * t, e);
      let a = V(t - c * n - u * i, e), g = V(-c * r - u * s, e);
      const x = a > o, B = g > o;
      if (x && (a = e - a), B && (g = e - g), a > o || g > o)
        throw new Error("splitScalar: Endomorphism failed, k=" + t);
      return { k1neg: x, k1: a, k2neg: B, k2: g };
    }
  }
}, Or);
function Mo(t) {
  if (t.length !== 130 && t.length !== 132)
    throw new Ki({ signature: t });
  const e = BigInt(ee(t, 0, 32)), n = BigInt(ee(t, 32, 64)), r = (() => {
    const i = +`0x${t.slice(130)}`;
    if (!Number.isNaN(i))
      try {
        return ji(i);
      } catch {
        throw new Zi({ value: i });
      }
  })();
  return typeof r > "u" ? {
    r: e,
    s: n
  } : {
    r: e,
    s: n,
    yParity: r
  };
}
function ji(t) {
  if (t === 0 || t === 27)
    return 0;
  if (t === 1 || t === 28)
    return 1;
  if (t >= 35)
    return t % 2 === 0 ? 1 : 0;
  throw new Yi({ value: t });
}
class Ki extends F {
  constructor({ signature: e }) {
    super(`Value \`${e}\` is an invalid signature size.`, {
      metaMessages: [
        "Expected: 64 bytes or 65 bytes.",
        `Received ${oe(Ut(e))} bytes.`
      ]
    }), Object.defineProperty(this, "name", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: "Signature.InvalidSerializedSizeError"
    });
  }
}
class Zi extends F {
  constructor({ value: e }) {
    super(`Value \`${e}\` is an invalid y-parity value. Y-parity must be 0 or 1.`), Object.defineProperty(this, "name", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: "Signature.InvalidYParityError"
    });
  }
}
class Yi extends F {
  constructor({ value: e }) {
    super(`Value \`${e}\` is an invalid v value. v must be 27, 28 or >=35.`), Object.defineProperty(this, "name", {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: "Signature.InvalidVError"
    });
  }
}
function Wi(t) {
  return t instanceof Uint8Array || ArrayBuffer.isView(t) && t.constructor.name === "Uint8Array";
}
function Mn(t, e) {
  return Array.isArray(e) ? e.length === 0 ? !0 : t ? e.every((n) => typeof n == "string") : e.every((n) => Number.isSafeInteger(n)) : !1;
}
function Le(t, e) {
  if (typeof e != "string")
    throw new Error(`${t}: string expected`);
  return !0;
}
function It(t) {
  if (!Number.isSafeInteger(t))
    throw new Error(`invalid integer: ${t}`);
}
function Dt(t) {
  if (!Array.isArray(t))
    throw new Error("array expected");
}
function He(t, e) {
  if (!Mn(!0, e))
    throw new Error(`${t}: array of strings expected`);
}
function Gi(t, e) {
  if (!Mn(!1, e))
    throw new Error(`${t}: array of numbers expected`);
}
// @__NO_SIDE_EFFECTS__
function Xi(...t) {
  const e = (s) => s, n = (s, o) => (c) => s(o(c)), r = t.map((s) => s.encode).reduceRight(n, e), i = t.map((s) => s.decode).reduce(n, e);
  return { encode: r, decode: i };
}
// @__NO_SIDE_EFFECTS__
function Ji(t) {
  const e = typeof t == "string" ? t.split("") : t, n = e.length;
  He("alphabet", e);
  const r = new Map(e.map((i, s) => [i, s]));
  return {
    encode: (i) => (Dt(i), i.map((s) => {
      if (!Number.isSafeInteger(s) || s < 0 || s >= n)
        throw new Error(`alphabet.encode: digit index outside alphabet "${s}". Allowed: ${t}`);
      return e[s];
    })),
    decode: (i) => (Dt(i), i.map((s) => {
      Le("alphabet.decode", s);
      const o = r.get(s);
      if (o === void 0)
        throw new Error(`Unknown letter: "${s}". Allowed: ${t}`);
      return o;
    }))
  };
}
// @__NO_SIDE_EFFECTS__
function Qi(t = "") {
  return Le("join", t), {
    encode: (e) => (He("join.decode", e), e.join(t)),
    decode: (e) => (Le("join.decode", e), e.split(t))
  };
}
// @__NO_SIDE_EFFECTS__
function es(t, e = "=") {
  return It(t), Le("padding", e), {
    encode(n) {
      for (He("padding.encode", n); n.length * t % 8; )
        n.push(e);
      return n;
    },
    decode(n) {
      He("padding.decode", n);
      let r = n.length;
      if (r * t % 8)
        throw new Error("padding: invalid, string should have whole number of bytes");
      for (; r > 0 && n[r - 1] === e; r--)
        if ((r - 1) * t % 8 === 0)
          throw new Error("padding: invalid, string has too much padding");
      return n.slice(0, r);
    }
  };
}
const Nn = (t, e) => e === 0 ? t : Nn(e, t % e), Me = /* @__NO_SIDE_EFFECTS__ */ (t, e) => t + (e - Nn(t, e)), st = /* @__PURE__ */ (() => {
  let t = [];
  for (let e = 0; e < 40; e++)
    t.push(2 ** e);
  return t;
})();
function Xt(t, e, n, r) {
  if (Dt(t), e <= 0 || e > 32)
    throw new Error(`convertRadix2: wrong from=${e}`);
  if (n <= 0 || n > 32)
    throw new Error(`convertRadix2: wrong to=${n}`);
  if (/* @__PURE__ */ Me(e, n) > 32)
    throw new Error(`convertRadix2: carry overflow from=${e} to=${n} carryBits=${/* @__PURE__ */ Me(e, n)}`);
  let i = 0, s = 0;
  const o = st[e], c = st[n] - 1, u = [];
  for (const a of t) {
    if (It(a), a >= o)
      throw new Error(`convertRadix2: invalid data word=${a} from=${e}`);
    if (i = i << e | a, s + e > 32)
      throw new Error(`convertRadix2: carry overflow pos=${s} from=${e}`);
    for (s += e; s >= n; s -= n)
      u.push((i >> s - n & c) >>> 0);
    const g = st[s];
    if (g === void 0)
      throw new Error("invalid carry");
    i &= g - 1;
  }
  if (i = i << n - s & c, !r && s >= e)
    throw new Error("Excess padding");
  if (!r && i > 0)
    throw new Error(`Non-zero padding: ${i}`);
  return r && s > 0 && u.push(i >>> 0), u;
}
// @__NO_SIDE_EFFECTS__
function ts(t, e = !1) {
  if (It(t), t <= 0 || t > 32)
    throw new Error("radix2: bits should be in (0..32]");
  if (/* @__PURE__ */ Me(8, t) > 32 || /* @__PURE__ */ Me(t, 8) > 32)
    throw new Error("radix2: carry overflow");
  return {
    encode: (n) => {
      if (!Wi(n))
        throw new Error("radix2.encode input should be Uint8Array");
      return Xt(Array.from(n), 8, t, !e);
    },
    decode: (n) => (Gi("radix2.decode", n), Uint8Array.from(Xt(n, t, 8, e)))
  };
}
const No = /* @__PURE__ */ Xi(/* @__PURE__ */ ts(5), /* @__PURE__ */ Ji("ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"), /* @__PURE__ */ es(5), /* @__PURE__ */ Qi(""));
function Ro(t) {
  return xi(ns(t));
}
function ns(t) {
  const { payload: e, signature: n } = t, { r, s: i, yParity: s } = n, c = new Vi.Signature(BigInt(r), BigInt(i)).addRecoveryBit(s).recoverPublicKey(Ut(e).substring(2));
  return ai(c);
}
function rs(t) {
  const e = t.length;
  let n = 0, r = 0;
  for (; r < e; ) {
    let i = t.charCodeAt(r++);
    if ((i & 4294967168) === 0) {
      n++;
      continue;
    } else if ((i & 4294965248) === 0)
      n += 2;
    else {
      if (i >= 55296 && i <= 56319 && r < e) {
        const s = t.charCodeAt(r);
        (s & 64512) === 56320 && (++r, i = ((i & 1023) << 10) + (s & 1023) + 65536);
      }
      (i & 4294901760) === 0 ? n += 3 : n += 4;
    }
  }
  return n;
}
function is(t, e, n) {
  const r = t.length;
  let i = n, s = 0;
  for (; s < r; ) {
    let o = t.charCodeAt(s++);
    if ((o & 4294967168) === 0) {
      e[i++] = o;
      continue;
    } else if ((o & 4294965248) === 0)
      e[i++] = o >> 6 & 31 | 192;
    else {
      if (o >= 55296 && o <= 56319 && s < r) {
        const c = t.charCodeAt(s);
        (c & 64512) === 56320 && (++s, o = ((o & 1023) << 10) + (c & 1023) + 65536);
      }
      (o & 4294901760) === 0 ? (e[i++] = o >> 12 & 15 | 224, e[i++] = o >> 6 & 63 | 128) : (e[i++] = o >> 18 & 7 | 240, e[i++] = o >> 12 & 63 | 128, e[i++] = o >> 6 & 63 | 128);
    }
    e[i++] = o & 63 | 128;
  }
}
const ss = new TextEncoder(), os = 50;
function us(t, e, n) {
  ss.encodeInto(t, e.subarray(n));
}
function cs(t, e, n) {
  t.length > os ? us(t, e, n) : is(t, e, n);
}
const as = 4096;
function Rn(t, e, n) {
  let r = e;
  const i = r + n, s = [];
  let o = "";
  for (; r < i; ) {
    const c = t[r++];
    if ((c & 128) === 0)
      s.push(c);
    else if ((c & 224) === 192) {
      const u = t[r++] & 63;
      s.push((c & 31) << 6 | u);
    } else if ((c & 240) === 224) {
      const u = t[r++] & 63, a = t[r++] & 63;
      s.push((c & 31) << 12 | u << 6 | a);
    } else if ((c & 248) === 240) {
      const u = t[r++] & 63, a = t[r++] & 63, g = t[r++] & 63;
      let x = (c & 7) << 18 | u << 12 | a << 6 | g;
      x > 65535 && (x -= 65536, s.push(x >>> 10 & 1023 | 55296), x = 56320 | x & 1023), s.push(x);
    } else
      s.push(c);
    s.length >= as && (o += String.fromCharCode(...s), s.length = 0);
  }
  return s.length > 0 && (o += String.fromCharCode(...s)), o;
}
const fs = new TextDecoder(), ls = 200;
function hs(t, e, n) {
  const r = t.subarray(e, e + n);
  return fs.decode(r);
}
function ds(t, e, n) {
  return n > ls ? hs(t, e, n) : Rn(t, e, n);
}
class $e {
  constructor(e, n) {
    this.type = e, this.data = n;
  }
}
class K extends Error {
  constructor(e) {
    super(e);
    const n = Object.create(K.prototype);
    Object.setPrototypeOf(this, n), Object.defineProperty(this, "name", {
      configurable: !0,
      enumerable: !1,
      value: K.name
    });
  }
}
const Ee = 4294967295;
function ws(t, e, n) {
  const r = n / 4294967296, i = n;
  t.setUint32(e, r), t.setUint32(e + 4, i);
}
function qn(t, e, n) {
  const r = Math.floor(n / 4294967296), i = n;
  t.setUint32(e, r), t.setUint32(e + 4, i);
}
function Vn(t, e) {
  const n = t.getInt32(e), r = t.getUint32(e + 4);
  return n * 4294967296 + r;
}
function gs(t, e) {
  const n = t.getUint32(e), r = t.getUint32(e + 4);
  return n * 4294967296 + r;
}
const ps = -1, Ds = 4294967296 - 1, xs = 17179869184 - 1;
function bs({ sec: t, nsec: e }) {
  if (t >= 0 && e >= 0 && t <= xs)
    if (e === 0 && t <= Ds) {
      const n = new Uint8Array(4);
      return new DataView(n.buffer).setUint32(0, t), n;
    } else {
      const n = t / 4294967296, r = t & 4294967295, i = new Uint8Array(8), s = new DataView(i.buffer);
      return s.setUint32(0, e << 2 | n & 3), s.setUint32(4, r), i;
    }
  else {
    const n = new Uint8Array(12), r = new DataView(n.buffer);
    return r.setUint32(0, e), qn(r, 4, t), n;
  }
}
function ys(t) {
  const e = t.getTime(), n = Math.floor(e / 1e3), r = (e - n * 1e3) * 1e6, i = Math.floor(r / 1e9);
  return {
    sec: n + i,
    nsec: r - i * 1e9
  };
}
function ms(t) {
  if (t instanceof Date) {
    const e = ys(t);
    return bs(e);
  } else
    return null;
}
function Es(t) {
  const e = new DataView(t.buffer, t.byteOffset, t.byteLength);
  switch (t.byteLength) {
    case 4:
      return { sec: e.getUint32(0), nsec: 0 };
    case 8: {
      const n = e.getUint32(0), r = e.getUint32(4), i = (n & 3) * 4294967296 + r, s = n >>> 2;
      return { sec: i, nsec: s };
    }
    case 12: {
      const n = Vn(e, 4), r = e.getUint32(0);
      return { sec: n, nsec: r };
    }
    default:
      throw new K(`Unrecognized data size for timestamp (expected 4, 8, or 12): ${t.length}`);
  }
}
function Bs(t) {
  const e = Es(t);
  return new Date(e.sec * 1e3 + e.nsec / 1e6);
}
const As = {
  type: ps,
  encode: ms,
  decode: Bs
};
class Ne {
  constructor() {
    this.builtInEncoders = [], this.builtInDecoders = [], this.encoders = [], this.decoders = [], this.register(As);
  }
  register({ type: e, encode: n, decode: r }) {
    if (e >= 0)
      this.encoders[e] = n, this.decoders[e] = r;
    else {
      const i = -1 - e;
      this.builtInEncoders[i] = n, this.builtInDecoders[i] = r;
    }
  }
  tryToEncode(e, n) {
    for (let r = 0; r < this.builtInEncoders.length; r++) {
      const i = this.builtInEncoders[r];
      if (i != null) {
        const s = i(e, n);
        if (s != null) {
          const o = -1 - r;
          return new $e(o, s);
        }
      }
    }
    for (let r = 0; r < this.encoders.length; r++) {
      const i = this.encoders[r];
      if (i != null) {
        const s = i(e, n);
        if (s != null) {
          const o = r;
          return new $e(o, s);
        }
      }
    }
    return e instanceof $e ? e : null;
  }
  decode(e, n, r) {
    const i = n < 0 ? this.builtInDecoders[-1 - n] : this.decoders[n];
    return i ? i(e, n, r) : new $e(n, e);
  }
}
Ne.defaultCodec = new Ne();
function Ss(t) {
  return t instanceof ArrayBuffer || typeof SharedArrayBuffer < "u" && t instanceof SharedArrayBuffer;
}
function xt(t) {
  return t instanceof Uint8Array ? t : ArrayBuffer.isView(t) ? new Uint8Array(t.buffer, t.byteOffset, t.byteLength) : Ss(t) ? new Uint8Array(t) : Uint8Array.from(t);
}
const Us = 100, vs = 2048;
let Is = class jn {
  constructor(e) {
    this.entered = !1, this.extensionCodec = e?.extensionCodec ?? Ne.defaultCodec, this.context = e?.context, this.useBigInt64 = e?.useBigInt64 ?? !1, this.maxDepth = e?.maxDepth ?? Us, this.initialBufferSize = e?.initialBufferSize ?? vs, this.sortKeys = e?.sortKeys ?? !1, this.forceFloat32 = e?.forceFloat32 ?? !1, this.ignoreUndefined = e?.ignoreUndefined ?? !1, this.forceIntegerToFloat = e?.forceIntegerToFloat ?? !1, this.pos = 0, this.view = new DataView(new ArrayBuffer(this.initialBufferSize)), this.bytes = new Uint8Array(this.view.buffer);
  }
  clone() {
    return new jn({
      extensionCodec: this.extensionCodec,
      context: this.context,
      useBigInt64: this.useBigInt64,
      maxDepth: this.maxDepth,
      initialBufferSize: this.initialBufferSize,
      sortKeys: this.sortKeys,
      forceFloat32: this.forceFloat32,
      ignoreUndefined: this.ignoreUndefined,
      forceIntegerToFloat: this.forceIntegerToFloat
    });
  }
  reinitializeState() {
    this.pos = 0;
  }
  /**
   * This is almost equivalent to {@link Encoder#encode}, but it returns an reference of the encoder's internal buffer and thus much faster than {@link Encoder#encode}.
   *
   * @returns Encodes the object and returns a shared reference the encoder's internal buffer.
   */
  encodeSharedRef(e) {
    if (this.entered)
      return this.clone().encodeSharedRef(e);
    try {
      return this.entered = !0, this.reinitializeState(), this.doEncode(e, 1), this.bytes.subarray(0, this.pos);
    } finally {
      this.entered = !1;
    }
  }
  /**
   * @returns Encodes the object and returns a copy of the encoder's internal buffer.
   */
  encode(e) {
    if (this.entered)
      return this.clone().encode(e);
    try {
      return this.entered = !0, this.reinitializeState(), this.doEncode(e, 1), this.bytes.slice(0, this.pos);
    } finally {
      this.entered = !1;
    }
  }
  doEncode(e, n) {
    if (n > this.maxDepth)
      throw new Error(`Too deep objects in depth ${n}`);
    e == null ? this.encodeNil() : typeof e == "boolean" ? this.encodeBoolean(e) : typeof e == "number" ? this.forceIntegerToFloat ? this.encodeNumberAsFloat(e) : this.encodeNumber(e) : typeof e == "string" ? this.encodeString(e) : this.useBigInt64 && typeof e == "bigint" ? this.encodeBigInt64(e) : this.encodeObject(e, n);
  }
  ensureBufferSizeToWrite(e) {
    const n = this.pos + e;
    this.view.byteLength < n && this.resizeBuffer(n * 2);
  }
  resizeBuffer(e) {
    const n = new ArrayBuffer(e), r = new Uint8Array(n), i = new DataView(n);
    r.set(this.bytes), this.view = i, this.bytes = r;
  }
  encodeNil() {
    this.writeU8(192);
  }
  encodeBoolean(e) {
    e === !1 ? this.writeU8(194) : this.writeU8(195);
  }
  encodeNumber(e) {
    !this.forceIntegerToFloat && Number.isSafeInteger(e) ? e >= 0 ? e < 128 ? this.writeU8(e) : e < 256 ? (this.writeU8(204), this.writeU8(e)) : e < 65536 ? (this.writeU8(205), this.writeU16(e)) : e < 4294967296 ? (this.writeU8(206), this.writeU32(e)) : this.useBigInt64 ? this.encodeNumberAsFloat(e) : (this.writeU8(207), this.writeU64(e)) : e >= -32 ? this.writeU8(224 | e + 32) : e >= -128 ? (this.writeU8(208), this.writeI8(e)) : e >= -32768 ? (this.writeU8(209), this.writeI16(e)) : e >= -2147483648 ? (this.writeU8(210), this.writeI32(e)) : this.useBigInt64 ? this.encodeNumberAsFloat(e) : (this.writeU8(211), this.writeI64(e)) : this.encodeNumberAsFloat(e);
  }
  encodeNumberAsFloat(e) {
    this.forceFloat32 ? (this.writeU8(202), this.writeF32(e)) : (this.writeU8(203), this.writeF64(e));
  }
  encodeBigInt64(e) {
    e >= BigInt(0) ? (this.writeU8(207), this.writeBigUint64(e)) : (this.writeU8(211), this.writeBigInt64(e));
  }
  writeStringHeader(e) {
    if (e < 32)
      this.writeU8(160 + e);
    else if (e < 256)
      this.writeU8(217), this.writeU8(e);
    else if (e < 65536)
      this.writeU8(218), this.writeU16(e);
    else if (e < 4294967296)
      this.writeU8(219), this.writeU32(e);
    else
      throw new Error(`Too long string: ${e} bytes in UTF-8`);
  }
  encodeString(e) {
    const r = rs(e);
    this.ensureBufferSizeToWrite(5 + r), this.writeStringHeader(r), cs(e, this.bytes, this.pos), this.pos += r;
  }
  encodeObject(e, n) {
    const r = this.extensionCodec.tryToEncode(e, this.context);
    if (r != null)
      this.encodeExtension(r);
    else if (Array.isArray(e))
      this.encodeArray(e, n);
    else if (ArrayBuffer.isView(e))
      this.encodeBinary(e);
    else if (typeof e == "object")
      this.encodeMap(e, n);
    else
      throw new Error(`Unrecognized object: ${Object.prototype.toString.apply(e)}`);
  }
  encodeBinary(e) {
    const n = e.byteLength;
    if (n < 256)
      this.writeU8(196), this.writeU8(n);
    else if (n < 65536)
      this.writeU8(197), this.writeU16(n);
    else if (n < 4294967296)
      this.writeU8(198), this.writeU32(n);
    else
      throw new Error(`Too large binary: ${n}`);
    const r = xt(e);
    this.writeU8a(r);
  }
  encodeArray(e, n) {
    const r = e.length;
    if (r < 16)
      this.writeU8(144 + r);
    else if (r < 65536)
      this.writeU8(220), this.writeU16(r);
    else if (r < 4294967296)
      this.writeU8(221), this.writeU32(r);
    else
      throw new Error(`Too large array: ${r}`);
    for (const i of e)
      this.doEncode(i, n + 1);
  }
  countWithoutUndefined(e, n) {
    let r = 0;
    for (const i of n)
      e[i] !== void 0 && r++;
    return r;
  }
  encodeMap(e, n) {
    const r = Object.keys(e);
    this.sortKeys && r.sort();
    const i = this.ignoreUndefined ? this.countWithoutUndefined(e, r) : r.length;
    if (i < 16)
      this.writeU8(128 + i);
    else if (i < 65536)
      this.writeU8(222), this.writeU16(i);
    else if (i < 4294967296)
      this.writeU8(223), this.writeU32(i);
    else
      throw new Error(`Too large map object: ${i}`);
    for (const s of r) {
      const o = e[s];
      this.ignoreUndefined && o === void 0 || (this.encodeString(s), this.doEncode(o, n + 1));
    }
  }
  encodeExtension(e) {
    if (typeof e.data == "function") {
      const r = e.data(this.pos + 6), i = r.length;
      if (i >= 4294967296)
        throw new Error(`Too large extension object: ${i}`);
      this.writeU8(201), this.writeU32(i), this.writeI8(e.type), this.writeU8a(r);
      return;
    }
    const n = e.data.length;
    if (n === 1)
      this.writeU8(212);
    else if (n === 2)
      this.writeU8(213);
    else if (n === 4)
      this.writeU8(214);
    else if (n === 8)
      this.writeU8(215);
    else if (n === 16)
      this.writeU8(216);
    else if (n < 256)
      this.writeU8(199), this.writeU8(n);
    else if (n < 65536)
      this.writeU8(200), this.writeU16(n);
    else if (n < 4294967296)
      this.writeU8(201), this.writeU32(n);
    else
      throw new Error(`Too large extension object: ${n}`);
    this.writeI8(e.type), this.writeU8a(e.data);
  }
  writeU8(e) {
    this.ensureBufferSizeToWrite(1), this.view.setUint8(this.pos, e), this.pos++;
  }
  writeU8a(e) {
    const n = e.length;
    this.ensureBufferSizeToWrite(n), this.bytes.set(e, this.pos), this.pos += n;
  }
  writeI8(e) {
    this.ensureBufferSizeToWrite(1), this.view.setInt8(this.pos, e), this.pos++;
  }
  writeU16(e) {
    this.ensureBufferSizeToWrite(2), this.view.setUint16(this.pos, e), this.pos += 2;
  }
  writeI16(e) {
    this.ensureBufferSizeToWrite(2), this.view.setInt16(this.pos, e), this.pos += 2;
  }
  writeU32(e) {
    this.ensureBufferSizeToWrite(4), this.view.setUint32(this.pos, e), this.pos += 4;
  }
  writeI32(e) {
    this.ensureBufferSizeToWrite(4), this.view.setInt32(this.pos, e), this.pos += 4;
  }
  writeF32(e) {
    this.ensureBufferSizeToWrite(4), this.view.setFloat32(this.pos, e), this.pos += 4;
  }
  writeF64(e) {
    this.ensureBufferSizeToWrite(8), this.view.setFloat64(this.pos, e), this.pos += 8;
  }
  writeU64(e) {
    this.ensureBufferSizeToWrite(8), ws(this.view, this.pos, e), this.pos += 8;
  }
  writeI64(e) {
    this.ensureBufferSizeToWrite(8), qn(this.view, this.pos, e), this.pos += 8;
  }
  writeBigUint64(e) {
    this.ensureBufferSizeToWrite(8), this.view.setBigUint64(this.pos, e), this.pos += 8;
  }
  writeBigInt64(e) {
    this.ensureBufferSizeToWrite(8), this.view.setBigInt64(this.pos, e), this.pos += 8;
  }
};
function qo(t, e) {
  return new Is(e).encodeSharedRef(t);
}
function ot(t) {
  return `${t < 0 ? "-" : ""}0x${Math.abs(t).toString(16).padStart(2, "0")}`;
}
const Cs = 16, ks = 16;
class Ts {
  constructor(e = Cs, n = ks) {
    this.hit = 0, this.miss = 0, this.maxKeyLength = e, this.maxLengthPerKey = n, this.caches = [];
    for (let r = 0; r < this.maxKeyLength; r++)
      this.caches.push([]);
  }
  canBeCached(e) {
    return e > 0 && e <= this.maxKeyLength;
  }
  find(e, n, r) {
    const i = this.caches[r - 1];
    e: for (const s of i) {
      const o = s.bytes;
      for (let c = 0; c < r; c++)
        if (o[c] !== e[n + c])
          continue e;
      return s.str;
    }
    return null;
  }
  store(e, n) {
    const r = this.caches[e.length - 1], i = { bytes: e, str: n };
    r.length >= this.maxLengthPerKey ? r[Math.random() * r.length | 0] = i : r.push(i);
  }
  decode(e, n, r) {
    const i = this.find(e, n, r);
    if (i != null)
      return this.hit++, i;
    this.miss++;
    const s = Rn(e, n, r), o = Uint8Array.prototype.slice.call(e, n, n + r);
    return this.store(o, s), s;
  }
}
const bt = "array", Ae = "map_key", Kn = "map_value", zs = (t) => {
  if (typeof t == "string" || typeof t == "number")
    return t;
  throw new K("The type of key must be string or number but " + typeof t);
};
class Os {
  constructor() {
    this.stack = [], this.stackHeadPosition = -1;
  }
  get length() {
    return this.stackHeadPosition + 1;
  }
  top() {
    return this.stack[this.stackHeadPosition];
  }
  pushArrayState(e) {
    const n = this.getUninitializedStateFromPool();
    n.type = bt, n.position = 0, n.size = e, n.array = new Array(e);
  }
  pushMapState(e) {
    const n = this.getUninitializedStateFromPool();
    n.type = Ae, n.readCount = 0, n.size = e, n.map = {};
  }
  getUninitializedStateFromPool() {
    if (this.stackHeadPosition++, this.stackHeadPosition === this.stack.length) {
      const e = {
        type: void 0,
        size: 0,
        array: void 0,
        position: 0,
        readCount: 0,
        map: void 0,
        key: null
      };
      this.stack.push(e);
    }
    return this.stack[this.stackHeadPosition];
  }
  release(e) {
    if (this.stack[this.stackHeadPosition] !== e)
      throw new Error("Invalid stack state. Released state is not on top of the stack.");
    if (e.type === bt) {
      const r = e;
      r.size = 0, r.array = void 0, r.position = 0, r.type = void 0;
    }
    if (e.type === Ae || e.type === Kn) {
      const r = e;
      r.size = 0, r.map = void 0, r.readCount = 0, r.type = void 0;
    }
    this.stackHeadPosition--;
  }
  reset() {
    this.stack.length = 0, this.stackHeadPosition = -1;
  }
}
const Be = -1, Ct = new DataView(new ArrayBuffer(0)), $s = new Uint8Array(Ct.buffer);
try {
  Ct.getInt8(0);
} catch (t) {
  if (!(t instanceof RangeError))
    throw new Error("This module is not supported in the current JavaScript engine because DataView does not throw RangeError on out-of-bounds access");
}
const Jt = new RangeError("Insufficient data"), _s = new Ts();
let Ps = class Zn {
  constructor(e) {
    this.totalPos = 0, this.pos = 0, this.view = Ct, this.bytes = $s, this.headByte = Be, this.stack = new Os(), this.entered = !1, this.extensionCodec = e?.extensionCodec ?? Ne.defaultCodec, this.context = e?.context, this.useBigInt64 = e?.useBigInt64 ?? !1, this.rawStrings = e?.rawStrings ?? !1, this.maxStrLength = e?.maxStrLength ?? Ee, this.maxBinLength = e?.maxBinLength ?? Ee, this.maxArrayLength = e?.maxArrayLength ?? Ee, this.maxMapLength = e?.maxMapLength ?? Ee, this.maxExtLength = e?.maxExtLength ?? Ee, this.keyDecoder = e?.keyDecoder !== void 0 ? e.keyDecoder : _s, this.mapKeyConverter = e?.mapKeyConverter ?? zs;
  }
  clone() {
    return new Zn({
      extensionCodec: this.extensionCodec,
      context: this.context,
      useBigInt64: this.useBigInt64,
      rawStrings: this.rawStrings,
      maxStrLength: this.maxStrLength,
      maxBinLength: this.maxBinLength,
      maxArrayLength: this.maxArrayLength,
      maxMapLength: this.maxMapLength,
      maxExtLength: this.maxExtLength,
      keyDecoder: this.keyDecoder
    });
  }
  reinitializeState() {
    this.totalPos = 0, this.headByte = Be, this.stack.reset();
  }
  setBuffer(e) {
    const n = xt(e);
    this.bytes = n, this.view = new DataView(n.buffer, n.byteOffset, n.byteLength), this.pos = 0;
  }
  appendBuffer(e) {
    if (this.headByte === Be && !this.hasRemaining(1))
      this.setBuffer(e);
    else {
      const n = this.bytes.subarray(this.pos), r = xt(e), i = new Uint8Array(n.length + r.length);
      i.set(n), i.set(r, n.length), this.setBuffer(i);
    }
  }
  hasRemaining(e) {
    return this.view.byteLength - this.pos >= e;
  }
  createExtraByteError(e) {
    const { view: n, pos: r } = this;
    return new RangeError(`Extra ${n.byteLength - r} of ${n.byteLength} byte(s) found at buffer[${e}]`);
  }
  /**
   * @throws {@link DecodeError}
   * @throws {@link RangeError}
   */
  decode(e) {
    if (this.entered)
      return this.clone().decode(e);
    try {
      this.entered = !0, this.reinitializeState(), this.setBuffer(e);
      const n = this.doDecodeSync();
      if (this.hasRemaining(1))
        throw this.createExtraByteError(this.pos);
      return n;
    } finally {
      this.entered = !1;
    }
  }
  *decodeMulti(e) {
    if (this.entered) {
      yield* this.clone().decodeMulti(e);
      return;
    }
    try {
      for (this.entered = !0, this.reinitializeState(), this.setBuffer(e); this.hasRemaining(1); )
        yield this.doDecodeSync();
    } finally {
      this.entered = !1;
    }
  }
  async decodeAsync(e) {
    if (this.entered)
      return this.clone().decodeAsync(e);
    try {
      this.entered = !0;
      let n = !1, r;
      for await (const c of e) {
        if (n)
          throw this.entered = !1, this.createExtraByteError(this.totalPos);
        this.appendBuffer(c);
        try {
          r = this.doDecodeSync(), n = !0;
        } catch (u) {
          if (!(u instanceof RangeError))
            throw u;
        }
        this.totalPos += this.pos;
      }
      if (n) {
        if (this.hasRemaining(1))
          throw this.createExtraByteError(this.totalPos);
        return r;
      }
      const { headByte: i, pos: s, totalPos: o } = this;
      throw new RangeError(`Insufficient data in parsing ${ot(i)} at ${o} (${s} in the current buffer)`);
    } finally {
      this.entered = !1;
    }
  }
  decodeArrayStream(e) {
    return this.decodeMultiAsync(e, !0);
  }
  decodeStream(e) {
    return this.decodeMultiAsync(e, !1);
  }
  async *decodeMultiAsync(e, n) {
    if (this.entered) {
      yield* this.clone().decodeMultiAsync(e, n);
      return;
    }
    try {
      this.entered = !0;
      let r = n, i = -1;
      for await (const s of e) {
        if (n && i === 0)
          throw this.createExtraByteError(this.totalPos);
        this.appendBuffer(s), r && (i = this.readArraySize(), r = !1, this.complete());
        try {
          for (; yield this.doDecodeSync(), --i !== 0; )
            ;
        } catch (o) {
          if (!(o instanceof RangeError))
            throw o;
        }
        this.totalPos += this.pos;
      }
    } finally {
      this.entered = !1;
    }
  }
  doDecodeSync() {
    e: for (; ; ) {
      const e = this.readHeadByte();
      let n;
      if (e >= 224)
        n = e - 256;
      else if (e < 192)
        if (e < 128)
          n = e;
        else if (e < 144) {
          const i = e - 128;
          if (i !== 0) {
            this.pushMapState(i), this.complete();
            continue e;
          } else
            n = {};
        } else if (e < 160) {
          const i = e - 144;
          if (i !== 0) {
            this.pushArrayState(i), this.complete();
            continue e;
          } else
            n = [];
        } else {
          const i = e - 160;
          n = this.decodeString(i, 0);
        }
      else if (e === 192)
        n = null;
      else if (e === 194)
        n = !1;
      else if (e === 195)
        n = !0;
      else if (e === 202)
        n = this.readF32();
      else if (e === 203)
        n = this.readF64();
      else if (e === 204)
        n = this.readU8();
      else if (e === 205)
        n = this.readU16();
      else if (e === 206)
        n = this.readU32();
      else if (e === 207)
        this.useBigInt64 ? n = this.readU64AsBigInt() : n = this.readU64();
      else if (e === 208)
        n = this.readI8();
      else if (e === 209)
        n = this.readI16();
      else if (e === 210)
        n = this.readI32();
      else if (e === 211)
        this.useBigInt64 ? n = this.readI64AsBigInt() : n = this.readI64();
      else if (e === 217) {
        const i = this.lookU8();
        n = this.decodeString(i, 1);
      } else if (e === 218) {
        const i = this.lookU16();
        n = this.decodeString(i, 2);
      } else if (e === 219) {
        const i = this.lookU32();
        n = this.decodeString(i, 4);
      } else if (e === 220) {
        const i = this.readU16();
        if (i !== 0) {
          this.pushArrayState(i), this.complete();
          continue e;
        } else
          n = [];
      } else if (e === 221) {
        const i = this.readU32();
        if (i !== 0) {
          this.pushArrayState(i), this.complete();
          continue e;
        } else
          n = [];
      } else if (e === 222) {
        const i = this.readU16();
        if (i !== 0) {
          this.pushMapState(i), this.complete();
          continue e;
        } else
          n = {};
      } else if (e === 223) {
        const i = this.readU32();
        if (i !== 0) {
          this.pushMapState(i), this.complete();
          continue e;
        } else
          n = {};
      } else if (e === 196) {
        const i = this.lookU8();
        n = this.decodeBinary(i, 1);
      } else if (e === 197) {
        const i = this.lookU16();
        n = this.decodeBinary(i, 2);
      } else if (e === 198) {
        const i = this.lookU32();
        n = this.decodeBinary(i, 4);
      } else if (e === 212)
        n = this.decodeExtension(1, 0);
      else if (e === 213)
        n = this.decodeExtension(2, 0);
      else if (e === 214)
        n = this.decodeExtension(4, 0);
      else if (e === 215)
        n = this.decodeExtension(8, 0);
      else if (e === 216)
        n = this.decodeExtension(16, 0);
      else if (e === 199) {
        const i = this.lookU8();
        n = this.decodeExtension(i, 1);
      } else if (e === 200) {
        const i = this.lookU16();
        n = this.decodeExtension(i, 2);
      } else if (e === 201) {
        const i = this.lookU32();
        n = this.decodeExtension(i, 4);
      } else
        throw new K(`Unrecognized type byte: ${ot(e)}`);
      this.complete();
      const r = this.stack;
      for (; r.length > 0; ) {
        const i = r.top();
        if (i.type === bt)
          if (i.array[i.position] = n, i.position++, i.position === i.size)
            n = i.array, r.release(i);
          else
            continue e;
        else if (i.type === Ae) {
          if (n === "__proto__")
            throw new K("The key __proto__ is not allowed");
          i.key = this.mapKeyConverter(n), i.type = Kn;
          continue e;
        } else if (i.map[i.key] = n, i.readCount++, i.readCount === i.size)
          n = i.map, r.release(i);
        else {
          i.key = null, i.type = Ae;
          continue e;
        }
      }
      return n;
    }
  }
  readHeadByte() {
    return this.headByte === Be && (this.headByte = this.readU8()), this.headByte;
  }
  complete() {
    this.headByte = Be;
  }
  readArraySize() {
    const e = this.readHeadByte();
    switch (e) {
      case 220:
        return this.readU16();
      case 221:
        return this.readU32();
      default: {
        if (e < 160)
          return e - 144;
        throw new K(`Unrecognized array type byte: ${ot(e)}`);
      }
    }
  }
  pushMapState(e) {
    if (e > this.maxMapLength)
      throw new K(`Max length exceeded: map length (${e}) > maxMapLengthLength (${this.maxMapLength})`);
    this.stack.pushMapState(e);
  }
  pushArrayState(e) {
    if (e > this.maxArrayLength)
      throw new K(`Max length exceeded: array length (${e}) > maxArrayLength (${this.maxArrayLength})`);
    this.stack.pushArrayState(e);
  }
  decodeString(e, n) {
    return !this.rawStrings || this.stateIsMapKey() ? this.decodeUtf8String(e, n) : this.decodeBinary(e, n);
  }
  /**
   * @throws {@link RangeError}
   */
  decodeUtf8String(e, n) {
    if (e > this.maxStrLength)
      throw new K(`Max length exceeded: UTF-8 byte length (${e}) > maxStrLength (${this.maxStrLength})`);
    if (this.bytes.byteLength < this.pos + n + e)
      throw Jt;
    const r = this.pos + n;
    let i;
    return this.stateIsMapKey() && this.keyDecoder?.canBeCached(e) ? i = this.keyDecoder.decode(this.bytes, r, e) : i = ds(this.bytes, r, e), this.pos += n + e, i;
  }
  stateIsMapKey() {
    return this.stack.length > 0 ? this.stack.top().type === Ae : !1;
  }
  /**
   * @throws {@link RangeError}
   */
  decodeBinary(e, n) {
    if (e > this.maxBinLength)
      throw new K(`Max length exceeded: bin length (${e}) > maxBinLength (${this.maxBinLength})`);
    if (!this.hasRemaining(e + n))
      throw Jt;
    const r = this.pos + n, i = this.bytes.subarray(r, r + e);
    return this.pos += n + e, i;
  }
  decodeExtension(e, n) {
    if (e > this.maxExtLength)
      throw new K(`Max length exceeded: ext length (${e}) > maxExtLength (${this.maxExtLength})`);
    const r = this.view.getInt8(this.pos + n), i = this.decodeBinary(
      e,
      n + 1
      /* extType */
    );
    return this.extensionCodec.decode(i, r, this.context);
  }
  lookU8() {
    return this.view.getUint8(this.pos);
  }
  lookU16() {
    return this.view.getUint16(this.pos);
  }
  lookU32() {
    return this.view.getUint32(this.pos);
  }
  readU8() {
    const e = this.view.getUint8(this.pos);
    return this.pos++, e;
  }
  readI8() {
    const e = this.view.getInt8(this.pos);
    return this.pos++, e;
  }
  readU16() {
    const e = this.view.getUint16(this.pos);
    return this.pos += 2, e;
  }
  readI16() {
    const e = this.view.getInt16(this.pos);
    return this.pos += 2, e;
  }
  readU32() {
    const e = this.view.getUint32(this.pos);
    return this.pos += 4, e;
  }
  readI32() {
    const e = this.view.getInt32(this.pos);
    return this.pos += 4, e;
  }
  readU64() {
    const e = gs(this.view, this.pos);
    return this.pos += 8, e;
  }
  readI64() {
    const e = Vn(this.view, this.pos);
    return this.pos += 8, e;
  }
  readU64AsBigInt() {
    const e = this.view.getBigUint64(this.pos);
    return this.pos += 8, e;
  }
  readI64AsBigInt() {
    const e = this.view.getBigInt64(this.pos);
    return this.pos += 8, e;
  }
  readF32() {
    const e = this.view.getFloat32(this.pos);
    return this.pos += 4, e;
  }
  readF64() {
    const e = this.view.getFloat64(this.pos);
    return this.pos += 8, e;
  }
};
function Vo(t, e) {
  return new Ps(e).decode(t);
}
function kt(t) {
  return globalThis.Buffer != null ? new Uint8Array(t.buffer, t.byteOffset, t.byteLength) : t;
}
function Yn(t = 0) {
  return globalThis.Buffer != null && globalThis.Buffer.allocUnsafe != null ? kt(globalThis.Buffer.allocUnsafe(t)) : new Uint8Array(t);
}
function jo(t, e) {
  e || (e = t.reduce((i, s) => i + s.length, 0));
  const n = Yn(e);
  let r = 0;
  for (const i of t)
    n.set(i, r), r += i.length;
  return kt(n);
}
function Fs(t, e) {
  if (t.length >= 255)
    throw new TypeError("Alphabet too long");
  for (var n = new Uint8Array(256), r = 0; r < n.length; r++)
    n[r] = 255;
  for (var i = 0; i < t.length; i++) {
    var s = t.charAt(i), o = s.charCodeAt(0);
    if (n[o] !== 255)
      throw new TypeError(s + " is ambiguous");
    n[o] = i;
  }
  var c = t.length, u = t.charAt(0), a = Math.log(c) / Math.log(256), g = Math.log(256) / Math.log(c);
  function x(w) {
    if (w instanceof Uint8Array || (ArrayBuffer.isView(w) ? w = new Uint8Array(w.buffer, w.byteOffset, w.byteLength) : Array.isArray(w) && (w = Uint8Array.from(w))), !(w instanceof Uint8Array))
      throw new TypeError("Expected Uint8Array");
    if (w.length === 0)
      return "";
    for (var d = 0, D = 0, h = 0, E = w.length; h !== E && w[h] === 0; )
      h++, d++;
    for (var l = (E - h) * g + 1 >>> 0, f = new Uint8Array(l); h !== E; ) {
      for (var p = w[h], m = 0, S = l - 1; (p !== 0 || m < D) && S !== -1; S--, m++)
        p += 256 * f[S] >>> 0, f[S] = p % c >>> 0, p = p / c >>> 0;
      if (p !== 0)
        throw new Error("Non-zero carry");
      D = m, h++;
    }
    for (var C = l - D; C !== l && f[C] === 0; )
      C++;
    for (var $ = u.repeat(d); C < l; ++C)
      $ += t.charAt(f[C]);
    return $;
  }
  function B(w) {
    if (typeof w != "string")
      throw new TypeError("Expected String");
    if (w.length === 0)
      return new Uint8Array();
    var d = 0;
    if (w[d] !== " ") {
      for (var D = 0, h = 0; w[d] === u; )
        D++, d++;
      for (var E = (w.length - d) * a + 1 >>> 0, l = new Uint8Array(E); w[d]; ) {
        var f = n[w.charCodeAt(d)];
        if (f === 255)
          return;
        for (var p = 0, m = E - 1; (f !== 0 || p < h) && m !== -1; m--, p++)
          f += c * l[m] >>> 0, l[m] = f % 256 >>> 0, f = f / 256 >>> 0;
        if (f !== 0)
          throw new Error("Non-zero carry");
        h = p, d++;
      }
      if (w[d] !== " ") {
        for (var S = E - h; S !== E && l[S] === 0; )
          S++;
        for (var C = new Uint8Array(D + (E - S)), $ = D; S !== E; )
          C[$++] = l[S++];
        return C;
      }
    }
  }
  function v(w) {
    var d = B(w);
    if (d)
      return d;
    throw new Error(`Non-${e} character`);
  }
  return {
    encode: x,
    decodeUnsafe: B,
    decode: v
  };
}
var Ls = Fs, Hs = Ls;
const Ms = (t) => {
  if (t instanceof Uint8Array && t.constructor.name === "Uint8Array")
    return t;
  if (t instanceof ArrayBuffer)
    return new Uint8Array(t);
  if (ArrayBuffer.isView(t))
    return new Uint8Array(t.buffer, t.byteOffset, t.byteLength);
  throw new Error("Unknown type, must be binary type");
}, Ns = (t) => new TextEncoder().encode(t), Rs = (t) => new TextDecoder().decode(t);
class qs {
  constructor(e, n, r) {
    this.name = e, this.prefix = n, this.baseEncode = r;
  }
  encode(e) {
    if (e instanceof Uint8Array)
      return `${this.prefix}${this.baseEncode(e)}`;
    throw Error("Unknown type, must be binary type");
  }
}
class Vs {
  constructor(e, n, r) {
    if (this.name = e, this.prefix = n, n.codePointAt(0) === void 0)
      throw new Error("Invalid prefix character");
    this.prefixCodePoint = n.codePointAt(0), this.baseDecode = r;
  }
  decode(e) {
    if (typeof e == "string") {
      if (e.codePointAt(0) !== this.prefixCodePoint)
        throw Error(`Unable to decode multibase string ${JSON.stringify(e)}, ${this.name} decoder only supports inputs prefixed with ${this.prefix}`);
      return this.baseDecode(e.slice(this.prefix.length));
    } else
      throw Error("Can only multibase decode strings");
  }
  or(e) {
    return Wn(this, e);
  }
}
class js {
  constructor(e) {
    this.decoders = e;
  }
  or(e) {
    return Wn(this, e);
  }
  decode(e) {
    const n = e[0], r = this.decoders[n];
    if (r)
      return r.decode(e);
    throw RangeError(`Unable to decode multibase string ${JSON.stringify(e)}, only inputs prefixed with ${Object.keys(this.decoders)} are supported`);
  }
}
const Wn = (t, e) => new js({
  ...t.decoders || { [t.prefix]: t },
  ...e.decoders || { [e.prefix]: e }
});
class Ks {
  constructor(e, n, r, i) {
    this.name = e, this.prefix = n, this.baseEncode = r, this.baseDecode = i, this.encoder = new qs(e, n, r), this.decoder = new Vs(e, n, i);
  }
  encode(e) {
    return this.encoder.encode(e);
  }
  decode(e) {
    return this.decoder.decode(e);
  }
}
const je = ({ name: t, prefix: e, encode: n, decode: r }) => new Ks(t, e, n, r), ke = ({ prefix: t, name: e, alphabet: n }) => {
  const { encode: r, decode: i } = Hs(n, e);
  return je({
    prefix: t,
    name: e,
    encode: r,
    decode: (s) => Ms(i(s))
  });
}, Zs = (t, e, n, r) => {
  const i = {};
  for (let g = 0; g < e.length; ++g)
    i[e[g]] = g;
  let s = t.length;
  for (; t[s - 1] === "="; )
    --s;
  const o = new Uint8Array(s * n / 8 | 0);
  let c = 0, u = 0, a = 0;
  for (let g = 0; g < s; ++g) {
    const x = i[t[g]];
    if (x === void 0)
      throw new SyntaxError(`Non-${r} character`);
    u = u << n | x, c += n, c >= 8 && (c -= 8, o[a++] = 255 & u >> c);
  }
  if (c >= n || 255 & u << 8 - c)
    throw new SyntaxError("Unexpected end of data");
  return o;
}, Ys = (t, e, n) => {
  const r = e[e.length - 1] === "=", i = (1 << n) - 1;
  let s = "", o = 0, c = 0;
  for (let u = 0; u < t.length; ++u)
    for (c = c << 8 | t[u], o += 8; o > n; )
      o -= n, s += e[i & c >> o];
  if (o && (s += e[i & c << n - o]), r)
    for (; s.length * n & 7; )
      s += "=";
  return s;
}, H = ({ name: t, prefix: e, bitsPerChar: n, alphabet: r }) => je({
  prefix: e,
  name: t,
  encode(i) {
    return Ys(i, r, n);
  },
  decode(i) {
    return Zs(i, r, n, t);
  }
}), Ws = je({
  prefix: "\0",
  name: "identity",
  encode: (t) => Rs(t),
  decode: (t) => Ns(t)
}), Gs = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  identity: Ws
}, Symbol.toStringTag, { value: "Module" })), Xs = H({
  prefix: "0",
  name: "base2",
  alphabet: "01",
  bitsPerChar: 1
}), Js = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  base2: Xs
}, Symbol.toStringTag, { value: "Module" })), Qs = H({
  prefix: "7",
  name: "base8",
  alphabet: "01234567",
  bitsPerChar: 3
}), eo = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  base8: Qs
}, Symbol.toStringTag, { value: "Module" })), to = ke({
  prefix: "9",
  name: "base10",
  alphabet: "0123456789"
}), no = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  base10: to
}, Symbol.toStringTag, { value: "Module" })), ro = H({
  prefix: "f",
  name: "base16",
  alphabet: "0123456789abcdef",
  bitsPerChar: 4
}), io = H({
  prefix: "F",
  name: "base16upper",
  alphabet: "0123456789ABCDEF",
  bitsPerChar: 4
}), so = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  base16: ro,
  base16upper: io
}, Symbol.toStringTag, { value: "Module" })), oo = H({
  prefix: "b",
  name: "base32",
  alphabet: "abcdefghijklmnopqrstuvwxyz234567",
  bitsPerChar: 5
}), uo = H({
  prefix: "B",
  name: "base32upper",
  alphabet: "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567",
  bitsPerChar: 5
}), co = H({
  prefix: "c",
  name: "base32pad",
  alphabet: "abcdefghijklmnopqrstuvwxyz234567=",
  bitsPerChar: 5
}), ao = H({
  prefix: "C",
  name: "base32padupper",
  alphabet: "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567=",
  bitsPerChar: 5
}), fo = H({
  prefix: "v",
  name: "base32hex",
  alphabet: "0123456789abcdefghijklmnopqrstuv",
  bitsPerChar: 5
}), lo = H({
  prefix: "V",
  name: "base32hexupper",
  alphabet: "0123456789ABCDEFGHIJKLMNOPQRSTUV",
  bitsPerChar: 5
}), ho = H({
  prefix: "t",
  name: "base32hexpad",
  alphabet: "0123456789abcdefghijklmnopqrstuv=",
  bitsPerChar: 5
}), wo = H({
  prefix: "T",
  name: "base32hexpadupper",
  alphabet: "0123456789ABCDEFGHIJKLMNOPQRSTUV=",
  bitsPerChar: 5
}), go = H({
  prefix: "h",
  name: "base32z",
  alphabet: "ybndrfg8ejkmcpqxot1uwisza345h769",
  bitsPerChar: 5
}), po = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  base32: oo,
  base32hex: fo,
  base32hexpad: ho,
  base32hexpadupper: wo,
  base32hexupper: lo,
  base32pad: co,
  base32padupper: ao,
  base32upper: uo,
  base32z: go
}, Symbol.toStringTag, { value: "Module" })), Do = ke({
  prefix: "k",
  name: "base36",
  alphabet: "0123456789abcdefghijklmnopqrstuvwxyz"
}), xo = ke({
  prefix: "K",
  name: "base36upper",
  alphabet: "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
}), bo = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  base36: Do,
  base36upper: xo
}, Symbol.toStringTag, { value: "Module" })), yo = ke({
  name: "base58btc",
  prefix: "z",
  alphabet: "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
}), mo = ke({
  name: "base58flickr",
  prefix: "Z",
  alphabet: "123456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ"
}), Eo = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  base58btc: yo,
  base58flickr: mo
}, Symbol.toStringTag, { value: "Module" })), Bo = H({
  prefix: "m",
  name: "base64",
  alphabet: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",
  bitsPerChar: 6
}), Ao = H({
  prefix: "M",
  name: "base64pad",
  alphabet: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
  bitsPerChar: 6
}), So = H({
  prefix: "u",
  name: "base64url",
  alphabet: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_",
  bitsPerChar: 6
}), Uo = H({
  prefix: "U",
  name: "base64urlpad",
  alphabet: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_=",
  bitsPerChar: 6
}), vo = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  base64: Bo,
  base64pad: Ao,
  base64url: So,
  base64urlpad: Uo
}, Symbol.toStringTag, { value: "Module" })), Gn = Array.from("🚀🪐☄🛰🌌🌑🌒🌓🌔🌕🌖🌗🌘🌍🌏🌎🐉☀💻🖥💾💿😂❤😍🤣😊🙏💕😭😘👍😅👏😁🔥🥰💔💖💙😢🤔😆🙄💪😉☺👌🤗💜😔😎😇🌹🤦🎉💞✌✨🤷😱😌🌸🙌😋💗💚😏💛🙂💓🤩😄😀🖤😃💯🙈👇🎶😒🤭❣😜💋👀😪😑💥🙋😞😩😡🤪👊🥳😥🤤👉💃😳✋😚😝😴🌟😬🙃🍀🌷😻😓⭐✅🥺🌈😈🤘💦✔😣🏃💐☹🎊💘😠☝😕🌺🎂🌻😐🖕💝🙊😹🗣💫💀👑🎵🤞😛🔴😤🌼😫⚽🤙☕🏆🤫👈😮🙆🍻🍃🐶💁😲🌿🧡🎁⚡🌞🎈❌✊👋😰🤨😶🤝🚶💰🍓💢🤟🙁🚨💨🤬✈🎀🍺🤓😙💟🌱😖👶🥴▶➡❓💎💸⬇😨🌚🦋😷🕺⚠🙅😟😵👎🤲🤠🤧📌🔵💅🧐🐾🍒😗🤑🌊🤯🐷☎💧😯💆👆🎤🙇🍑❄🌴💣🐸💌📍🥀🤢👅💡💩👐📸👻🤐🤮🎼🥵🚩🍎🍊👼💍📣🥂"), Io = Gn.reduce((t, e, n) => (t[n] = e, t), []), Co = Gn.reduce((t, e, n) => (t[e.codePointAt(0)] = n, t), []);
function ko(t) {
  return t.reduce((e, n) => (e += Io[n], e), "");
}
function To(t) {
  const e = [];
  for (const n of t) {
    const r = Co[n.codePointAt(0)];
    if (r === void 0)
      throw new Error(`Non-base256emoji character: ${n}`);
    e.push(r);
  }
  return new Uint8Array(e);
}
const zo = je({
  prefix: "🚀",
  name: "base256emoji",
  encode: ko,
  decode: To
}), Oo = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  base256emoji: zo
}, Symbol.toStringTag, { value: "Module" }));
new TextEncoder();
new TextDecoder();
const Qt = {
  ...Gs,
  ...Js,
  ...eo,
  ...no,
  ...so,
  ...po,
  ...bo,
  ...Eo,
  ...vo,
  ...Oo
};
function Xn(t, e, n, r) {
  return {
    name: t,
    prefix: e,
    encoder: {
      name: t,
      prefix: e,
      encode: n
    },
    decoder: { decode: r }
  };
}
const en = Xn("utf8", "u", (t) => "u" + new TextDecoder("utf8").decode(t), (t) => new TextEncoder().encode(t.substring(1))), ut = Xn("ascii", "a", (t) => {
  let e = "a";
  for (let n = 0; n < t.length; n++)
    e += String.fromCharCode(t[n]);
  return e;
}, (t) => {
  t = t.substring(1);
  const e = Yn(t.length);
  for (let n = 0; n < t.length; n++)
    e[n] = t.charCodeAt(n);
  return e;
}), Jn = {
  utf8: en,
  "utf-8": en,
  hex: Qt.base16,
  latin1: ut,
  ascii: ut,
  binary: ut,
  ...Qt
};
function Ko(t, e = "utf8") {
  const n = Jn[e];
  if (!n)
    throw new Error(`Unsupported encoding "${e}"`);
  return (e === "utf8" || e === "utf-8") && globalThis.Buffer != null && globalThis.Buffer.from != null ? kt(globalThis.Buffer.from(t, "utf-8")) : n.decoder.decode(`${n.prefix}${t}`);
}
function Zo(t, e = "utf8") {
  const n = Jn[e];
  if (!n)
    throw new Error(`Unsupported encoding "${e}"`);
  return (e === "utf8" || e === "utf-8") && globalThis.Buffer != null && globalThis.Buffer.from != null ? globalThis.Buffer.from(t.buffer, t.byteOffset, t.byteLength).toString("utf8") : n.encoder.encode(t).substring(1);
}
var ct, tn;
function Qn() {
  if (tn) return ct;
  tn = 1;
  const t = "Input must be an string, Buffer or Uint8Array";
  function e(o) {
    let c;
    if (o instanceof Uint8Array)
      c = o;
    else if (typeof o == "string")
      c = new TextEncoder().encode(o);
    else
      throw new Error(t);
    return c;
  }
  function n(o) {
    return Array.prototype.map.call(o, function(c) {
      return (c < 16 ? "0" : "") + c.toString(16);
    }).join("");
  }
  function r(o) {
    return (4294967296 + o).toString(16).substring(1);
  }
  function i(o, c, u) {
    let a = `
` + o + " = ";
    for (let g = 0; g < c.length; g += 2) {
      if (u === 32)
        a += r(c[g]).toUpperCase(), a += " ", a += r(c[g + 1]).toUpperCase();
      else if (u === 64)
        a += r(c[g + 1]).toUpperCase(), a += r(c[g]).toUpperCase();
      else throw new Error("Invalid size " + u);
      g % 6 === 4 ? a += `
` + new Array(o.length + 4).join(" ") : g < c.length - 2 && (a += " ");
    }
    console.log(a);
  }
  function s(o, c, u) {
    let a = (/* @__PURE__ */ new Date()).getTime();
    const g = new Uint8Array(c);
    for (let B = 0; B < c; B++)
      g[B] = B % 256;
    const x = (/* @__PURE__ */ new Date()).getTime();
    console.log("Generated random input in " + (x - a) + "ms"), a = x;
    for (let B = 0; B < u; B++) {
      const v = o(g), w = (/* @__PURE__ */ new Date()).getTime(), d = w - a;
      a = w, console.log("Hashed in " + d + "ms: " + v.substring(0, 20) + "..."), console.log(
        Math.round(c / (1 << 20) / (d / 1e3) * 100) / 100 + " MB PER SECOND"
      );
    }
  }
  return ct = {
    normalizeInput: e,
    toHex: n,
    debugPrint: i,
    testSpeed: s
  }, ct;
}
var at, nn;
function $o() {
  if (nn) return at;
  nn = 1;
  const t = Qn();
  function e(h, E, l) {
    const f = h[E] + h[l];
    let p = h[E + 1] + h[l + 1];
    f >= 4294967296 && p++, h[E] = f, h[E + 1] = p;
  }
  function n(h, E, l, f) {
    let p = h[E] + l;
    l < 0 && (p += 4294967296);
    let m = h[E + 1] + f;
    p >= 4294967296 && m++, h[E] = p, h[E + 1] = m;
  }
  function r(h, E) {
    return h[E] ^ h[E + 1] << 8 ^ h[E + 2] << 16 ^ h[E + 3] << 24;
  }
  function i(h, E, l, f, p, m) {
    const S = a[p], C = a[p + 1], $ = a[m], _ = a[m + 1];
    e(u, h, E), n(u, h, S, C);
    let A = u[f] ^ u[h], I = u[f + 1] ^ u[h + 1];
    u[f] = I, u[f + 1] = A, e(u, l, f), A = u[E] ^ u[l], I = u[E + 1] ^ u[l + 1], u[E] = A >>> 24 ^ I << 8, u[E + 1] = I >>> 24 ^ A << 8, e(u, h, E), n(u, h, $, _), A = u[f] ^ u[h], I = u[f + 1] ^ u[h + 1], u[f] = A >>> 16 ^ I << 16, u[f + 1] = I >>> 16 ^ A << 16, e(u, l, f), A = u[E] ^ u[l], I = u[E + 1] ^ u[l + 1], u[E] = I >>> 31 ^ A << 1, u[E + 1] = A >>> 31 ^ I << 1;
  }
  const s = new Uint32Array([
    4089235720,
    1779033703,
    2227873595,
    3144134277,
    4271175723,
    1013904242,
    1595750129,
    2773480762,
    2917565137,
    1359893119,
    725511199,
    2600822924,
    4215389547,
    528734635,
    327033209,
    1541459225
  ]), o = [
    0,
    1,
    2,
    3,
    4,
    5,
    6,
    7,
    8,
    9,
    10,
    11,
    12,
    13,
    14,
    15,
    14,
    10,
    4,
    8,
    9,
    15,
    13,
    6,
    1,
    12,
    0,
    2,
    11,
    7,
    5,
    3,
    11,
    8,
    12,
    0,
    5,
    2,
    15,
    13,
    10,
    14,
    3,
    6,
    7,
    1,
    9,
    4,
    7,
    9,
    3,
    1,
    13,
    12,
    11,
    14,
    2,
    6,
    5,
    10,
    4,
    0,
    15,
    8,
    9,
    0,
    5,
    7,
    2,
    4,
    10,
    15,
    14,
    1,
    11,
    12,
    6,
    8,
    3,
    13,
    2,
    12,
    6,
    10,
    0,
    11,
    8,
    3,
    4,
    13,
    7,
    5,
    15,
    14,
    1,
    9,
    12,
    5,
    1,
    15,
    14,
    13,
    4,
    10,
    0,
    7,
    6,
    3,
    9,
    2,
    8,
    11,
    13,
    11,
    7,
    14,
    12,
    1,
    3,
    9,
    5,
    0,
    15,
    4,
    8,
    6,
    2,
    10,
    6,
    15,
    14,
    9,
    11,
    3,
    0,
    8,
    12,
    2,
    13,
    7,
    1,
    4,
    10,
    5,
    10,
    2,
    8,
    4,
    7,
    6,
    1,
    5,
    15,
    11,
    9,
    14,
    3,
    12,
    13,
    0,
    0,
    1,
    2,
    3,
    4,
    5,
    6,
    7,
    8,
    9,
    10,
    11,
    12,
    13,
    14,
    15,
    14,
    10,
    4,
    8,
    9,
    15,
    13,
    6,
    1,
    12,
    0,
    2,
    11,
    7,
    5,
    3
  ], c = new Uint8Array(
    o.map(function(h) {
      return h * 2;
    })
  ), u = new Uint32Array(32), a = new Uint32Array(32);
  function g(h, E) {
    let l = 0;
    for (l = 0; l < 16; l++)
      u[l] = h.h[l], u[l + 16] = s[l];
    for (u[24] = u[24] ^ h.t, u[25] = u[25] ^ h.t / 4294967296, E && (u[28] = ~u[28], u[29] = ~u[29]), l = 0; l < 32; l++)
      a[l] = r(h.b, 4 * l);
    for (l = 0; l < 12; l++)
      i(0, 8, 16, 24, c[l * 16 + 0], c[l * 16 + 1]), i(2, 10, 18, 26, c[l * 16 + 2], c[l * 16 + 3]), i(4, 12, 20, 28, c[l * 16 + 4], c[l * 16 + 5]), i(6, 14, 22, 30, c[l * 16 + 6], c[l * 16 + 7]), i(0, 10, 20, 30, c[l * 16 + 8], c[l * 16 + 9]), i(2, 12, 22, 24, c[l * 16 + 10], c[l * 16 + 11]), i(4, 14, 16, 26, c[l * 16 + 12], c[l * 16 + 13]), i(6, 8, 18, 28, c[l * 16 + 14], c[l * 16 + 15]);
    for (l = 0; l < 16; l++)
      h.h[l] = h.h[l] ^ u[l] ^ u[l + 16];
  }
  const x = new Uint8Array([
    0,
    0,
    0,
    0,
    //  0: outlen, keylen, fanout, depth
    0,
    0,
    0,
    0,
    //  4: leaf length, sequential mode
    0,
    0,
    0,
    0,
    //  8: node offset
    0,
    0,
    0,
    0,
    // 12: node offset
    0,
    0,
    0,
    0,
    // 16: node depth, inner length, rfu
    0,
    0,
    0,
    0,
    // 20: rfu
    0,
    0,
    0,
    0,
    // 24: rfu
    0,
    0,
    0,
    0,
    // 28: rfu
    0,
    0,
    0,
    0,
    // 32: salt
    0,
    0,
    0,
    0,
    // 36: salt
    0,
    0,
    0,
    0,
    // 40: salt
    0,
    0,
    0,
    0,
    // 44: salt
    0,
    0,
    0,
    0,
    // 48: personal
    0,
    0,
    0,
    0,
    // 52: personal
    0,
    0,
    0,
    0,
    // 56: personal
    0,
    0,
    0,
    0
    // 60: personal
  ]);
  function B(h, E, l, f) {
    if (h === 0 || h > 64)
      throw new Error("Illegal output length, expected 0 < length <= 64");
    if (E && E.length > 64)
      throw new Error("Illegal key, expected Uint8Array with 0 < length <= 64");
    if (l && l.length !== 16)
      throw new Error("Illegal salt, expected Uint8Array with length is 16");
    if (f && f.length !== 16)
      throw new Error("Illegal personal, expected Uint8Array with length is 16");
    const p = {
      b: new Uint8Array(128),
      h: new Uint32Array(16),
      t: 0,
      // input count
      c: 0,
      // pointer within buffer
      outlen: h
      // output length in bytes
    };
    x.fill(0), x[0] = h, E && (x[1] = E.length), x[2] = 1, x[3] = 1, l && x.set(l, 32), f && x.set(f, 48);
    for (let m = 0; m < 16; m++)
      p.h[m] = s[m] ^ r(x, m * 4);
    return E && (v(p, E), p.c = 128), p;
  }
  function v(h, E) {
    for (let l = 0; l < E.length; l++)
      h.c === 128 && (h.t += h.c, g(h, !1), h.c = 0), h.b[h.c++] = E[l];
  }
  function w(h) {
    for (h.t += h.c; h.c < 128; )
      h.b[h.c++] = 0;
    g(h, !0);
    const E = new Uint8Array(h.outlen);
    for (let l = 0; l < h.outlen; l++)
      E[l] = h.h[l >> 2] >> 8 * (l & 3);
    return E;
  }
  function d(h, E, l, f, p) {
    l = l || 64, h = t.normalizeInput(h), f && (f = t.normalizeInput(f)), p && (p = t.normalizeInput(p));
    const m = B(l, E, f, p);
    return v(m, h), w(m);
  }
  function D(h, E, l, f, p) {
    const m = d(h, E, l, f, p);
    return t.toHex(m);
  }
  return at = {
    blake2b: d,
    blake2bHex: D,
    blake2bInit: B,
    blake2bUpdate: v,
    blake2bFinal: w
  }, at;
}
var ft, rn;
function _o() {
  if (rn) return ft;
  rn = 1;
  const t = Qn();
  function e(w, d) {
    return w[d] ^ w[d + 1] << 8 ^ w[d + 2] << 16 ^ w[d + 3] << 24;
  }
  function n(w, d, D, h, E, l) {
    o[w] = o[w] + o[d] + E, o[h] = r(o[h] ^ o[w], 16), o[D] = o[D] + o[h], o[d] = r(o[d] ^ o[D], 12), o[w] = o[w] + o[d] + l, o[h] = r(o[h] ^ o[w], 8), o[D] = o[D] + o[h], o[d] = r(o[d] ^ o[D], 7);
  }
  function r(w, d) {
    return w >>> d ^ w << 32 - d;
  }
  const i = new Uint32Array([
    1779033703,
    3144134277,
    1013904242,
    2773480762,
    1359893119,
    2600822924,
    528734635,
    1541459225
  ]), s = new Uint8Array([
    0,
    1,
    2,
    3,
    4,
    5,
    6,
    7,
    8,
    9,
    10,
    11,
    12,
    13,
    14,
    15,
    14,
    10,
    4,
    8,
    9,
    15,
    13,
    6,
    1,
    12,
    0,
    2,
    11,
    7,
    5,
    3,
    11,
    8,
    12,
    0,
    5,
    2,
    15,
    13,
    10,
    14,
    3,
    6,
    7,
    1,
    9,
    4,
    7,
    9,
    3,
    1,
    13,
    12,
    11,
    14,
    2,
    6,
    5,
    10,
    4,
    0,
    15,
    8,
    9,
    0,
    5,
    7,
    2,
    4,
    10,
    15,
    14,
    1,
    11,
    12,
    6,
    8,
    3,
    13,
    2,
    12,
    6,
    10,
    0,
    11,
    8,
    3,
    4,
    13,
    7,
    5,
    15,
    14,
    1,
    9,
    12,
    5,
    1,
    15,
    14,
    13,
    4,
    10,
    0,
    7,
    6,
    3,
    9,
    2,
    8,
    11,
    13,
    11,
    7,
    14,
    12,
    1,
    3,
    9,
    5,
    0,
    15,
    4,
    8,
    6,
    2,
    10,
    6,
    15,
    14,
    9,
    11,
    3,
    0,
    8,
    12,
    2,
    13,
    7,
    1,
    4,
    10,
    5,
    10,
    2,
    8,
    4,
    7,
    6,
    1,
    5,
    15,
    11,
    9,
    14,
    3,
    12,
    13,
    0
  ]), o = new Uint32Array(16), c = new Uint32Array(16);
  function u(w, d) {
    let D = 0;
    for (D = 0; D < 8; D++)
      o[D] = w.h[D], o[D + 8] = i[D];
    for (o[12] ^= w.t, o[13] ^= w.t / 4294967296, d && (o[14] = ~o[14]), D = 0; D < 16; D++)
      c[D] = e(w.b, 4 * D);
    for (D = 0; D < 10; D++)
      n(0, 4, 8, 12, c[s[D * 16 + 0]], c[s[D * 16 + 1]]), n(1, 5, 9, 13, c[s[D * 16 + 2]], c[s[D * 16 + 3]]), n(2, 6, 10, 14, c[s[D * 16 + 4]], c[s[D * 16 + 5]]), n(3, 7, 11, 15, c[s[D * 16 + 6]], c[s[D * 16 + 7]]), n(0, 5, 10, 15, c[s[D * 16 + 8]], c[s[D * 16 + 9]]), n(1, 6, 11, 12, c[s[D * 16 + 10]], c[s[D * 16 + 11]]), n(2, 7, 8, 13, c[s[D * 16 + 12]], c[s[D * 16 + 13]]), n(3, 4, 9, 14, c[s[D * 16 + 14]], c[s[D * 16 + 15]]);
    for (D = 0; D < 8; D++)
      w.h[D] ^= o[D] ^ o[D + 8];
  }
  function a(w, d) {
    if (!(w > 0 && w <= 32))
      throw new Error("Incorrect output length, should be in [1, 32]");
    const D = d ? d.length : 0;
    if (d && !(D > 0 && D <= 32))
      throw new Error("Incorrect key length, should be in [1, 32]");
    const h = {
      h: new Uint32Array(i),
      // hash state
      b: new Uint8Array(64),
      // input block
      c: 0,
      // pointer within block
      t: 0,
      // input count
      outlen: w
      // output length in bytes
    };
    return h.h[0] ^= 16842752 ^ D << 8 ^ w, D > 0 && (g(h, d), h.c = 64), h;
  }
  function g(w, d) {
    for (let D = 0; D < d.length; D++)
      w.c === 64 && (w.t += w.c, u(w, !1), w.c = 0), w.b[w.c++] = d[D];
  }
  function x(w) {
    for (w.t += w.c; w.c < 64; )
      w.b[w.c++] = 0;
    u(w, !0);
    const d = new Uint8Array(w.outlen);
    for (let D = 0; D < w.outlen; D++)
      d[D] = w.h[D >> 2] >> 8 * (D & 3) & 255;
    return d;
  }
  function B(w, d, D) {
    D = D || 32, w = t.normalizeInput(w);
    const h = a(D, d);
    return g(h, w), x(h);
  }
  function v(w, d, D) {
    const h = B(w, d, D);
    return t.toHex(h);
  }
  return ft = {
    blake2s: B,
    blake2sHex: v,
    blake2sInit: a,
    blake2sUpdate: g,
    blake2sFinal: x
  }, ft;
}
var lt, sn;
function Po() {
  if (sn) return lt;
  sn = 1;
  const t = $o(), e = _o();
  return lt = {
    blake2b: t.blake2b,
    blake2bHex: t.blake2bHex,
    blake2bInit: t.blake2bInit,
    blake2bUpdate: t.blake2bUpdate,
    blake2bFinal: t.blake2bFinal,
    blake2s: e.blake2s,
    blake2sHex: e.blake2sHex,
    blake2sInit: e.blake2sInit,
    blake2sUpdate: e.blake2sUpdate,
    blake2sFinal: e.blake2sFinal
  }, lt;
}
var Yo = Po();
export {
  Yo as a,
  No as b,
  jo as c,
  Vo as d,
  qo as e,
  Ko as f,
  Mo as g,
  Ro as r,
  Zo as t
};
