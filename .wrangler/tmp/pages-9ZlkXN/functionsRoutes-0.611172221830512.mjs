import { onRequestGet as __api_offers_js_onRequestGet } from "/Users/abit_hex/Downloads/wojak-ink-v2/wojak-ink/functions/api/offers.js"
import { onRequestOptions as __api_tangify_js_onRequestOptions } from "/Users/abit_hex/Downloads/wojak-ink-v2/wojak-ink/functions/api/tangify.js"
import { onRequestPost as __api_tangify_js_onRequestPost } from "/Users/abit_hex/Downloads/wojak-ink-v2/wojak-ink/functions/api/tangify.js"
import { onRequestGet as __api_wallet_balances_js_onRequestGet } from "/Users/abit_hex/Downloads/wojak-ink-v2/wojak-ink/functions/api/wallet-balances.js"

export const routes = [
    {
      routePath: "/api/offers",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_offers_js_onRequestGet],
    },
  {
      routePath: "/api/tangify",
      mountPath: "/api",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_tangify_js_onRequestOptions],
    },
  {
      routePath: "/api/tangify",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_tangify_js_onRequestPost],
    },
  {
      routePath: "/api/wallet-balances",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_wallet_balances_js_onRequestGet],
    },
  ]