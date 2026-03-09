import { q as g } from "./wallet-connect-standalone-wallet-protocol-C4VxITVL.js";
import { W as u } from "./wallet-connect-standalone-wallet-ui-DuUfeWJu.js";
const m = {
  getItem(e) {
    try {
      return localStorage.getItem(e);
    } catch {
      return console.warn(`[safeStorage] Failed to read key: ${e}`), null;
    }
  },
  setItem(e, t) {
    try {
      return localStorage.setItem(e, t), !0;
    } catch {
      return console.warn(`[safeStorage] Failed to write key: ${e}`), !1;
    }
  },
  removeItem(e) {
    try {
      return localStorage.removeItem(e), !0;
    } catch {
      return console.warn(`[safeStorage] Failed to remove key: ${e}`), !1;
    }
  },
  getJSON(e, t) {
    try {
      const r = localStorage.getItem(e);
      return r === null ? t : JSON.parse(r);
    } catch {
      return console.warn(`[safeStorage] Failed to parse key: ${e}`), t;
    }
  },
  setJSON(e, t) {
    try {
      return localStorage.setItem(e, JSON.stringify(t)), !0;
    } catch {
      return console.warn(`[safeStorage] Failed to write JSON key: ${e}`), !1;
    }
  }
}, i = "500876ce87398e4721f71b6aa681a193", l = "chia:mainnet", f = "sage-wallet-session";
let o = null, a = null, c = !1;
async function d() {
  try {
    o = await g.init({
      projectId: i,
      metadata: {
        name: "Wojak.ink",
        description: "Tang Gang NFT Collection",
        url: window.location.origin,
        icons: ["https://wojak.ink/favicon.ico"]
      },
      relayUrl: "wss://relay.walletconnect.com",
      logger: "error"
    }), a = new u({
      projectId: i,
      themeMode: "dark",
      enableExplorer: !1,
      themeVariables: { "--wcm-z-index": "100000" }
    });
  } catch (e) {
    console.warn("[WC] Init failed:", e.message);
  }
}
async function w() {
  if (!c && !((!o || !a) && (await d(), !o || !a))) {
    c = !0;
    try {
      const { uri: e, approval: t } = await o.connect({
        requiredNamespaces: {
          chia: {
            methods: [
              "chip0002_getPublicKeys",
              "chia_signMessageByAddress",
              "chia_getAddress",
              "chia_takeOffer",
              "chia_send",
              "chip0002_getAssetBalance"
            ],
            chains: [l],
            events: []
          }
        }
      });
      if (e) {
        await a.openModal({ uri: e });
        const r = await t();
        a.closeModal();
        const n = await o.request({
          topic: r.topic,
          chainId: l,
          request: { method: "chia_getAddress", params: {} }
        }), s = typeof n == "string" ? n : n?.address || "";
        s && (m.setJSON(f, {
          topic: r.topic,
          address: s
        }), window.dispatchEvent(new CustomEvent("sage-wallet-connected", { detail: { address: s } })));
      }
    } catch (e) {
      a && a.closeModal();
      const t = e?.message || "";
      !t.includes("dismissed") && !t.includes("Proposal expired") && console.warn("[WC] Connect error:", t);
    } finally {
      c = !1;
    }
  }
}
window._sageConnect = w;
d();
