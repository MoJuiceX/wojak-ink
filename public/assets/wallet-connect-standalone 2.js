import { q as f } from "./wallet-connect-standalone-wallet-protocol-C4VxITVL.js";
import { W as m } from "./wallet-connect-standalone-wallet-ui-DuUfeWJu.js";
const r = "500876ce87398e4721f71b6aa681a193", l = "chia:mainnet", p = "sage-wallet-session";
let n = null, e = null, o = !1;
async function d() {
  try {
    n = await f.init({
      projectId: r,
      metadata: {
        name: "Wojak.ink",
        description: "Tang Gang NFT Collection",
        url: window.location.origin,
        icons: ["https://wojak.ink/favicon.ico"]
      },
      relayUrl: "wss://relay.walletconnect.com",
      logger: "error"
    }), e = new m({
      projectId: r,
      themeMode: "dark",
      enableExplorer: !1,
      themeVariables: { "--wcm-z-index": "100000" }
    });
  } catch (a) {
    console.warn("[WC] Init failed:", a.message);
  }
}
async function w() {
  if (!o && !((!n || !e) && (await d(), !n || !e))) {
    o = !0;
    try {
      const { uri: a, approval: t } = await n.connect({
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
      if (a) {
        await e.openModal({ uri: a });
        const c = await t();
        e.closeModal();
        const s = await n.request({
          topic: c.topic,
          chainId: l,
          request: { method: "chia_getAddress", params: {} }
        }), i = typeof s == "string" ? s : s?.address || "";
        i && (localStorage.setItem(p, JSON.stringify({
          topic: c.topic,
          address: i
        })), window.dispatchEvent(new CustomEvent("sage-wallet-connected", { detail: { address: i } })));
      }
    } catch (a) {
      e && e.closeModal();
      const t = a?.message || "";
      !t.includes("dismissed") && !t.includes("Proposal expired") && console.warn("[WC] Connect error:", t);
    } finally {
      o = !1;
    }
  }
}
window._sageConnect = w;
d();
