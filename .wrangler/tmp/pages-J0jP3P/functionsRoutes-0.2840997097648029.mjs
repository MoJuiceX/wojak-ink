import { onRequestOptions as __api_tangify_js_onRequestOptions } from "/Users/abit_hex/Downloads/wojak-ink-v2/functions/api/tangify.js"
import { onRequestPost as __api_tangify_js_onRequestPost } from "/Users/abit_hex/Downloads/wojak-ink-v2/functions/api/tangify.js"

export const routes = [
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
  ]