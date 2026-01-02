var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// ../.wrangler/tmp/bundle-t1QkpV/checked-fetch.js
var urls = /* @__PURE__ */ new Set();
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
__name(checkURL, "checkURL");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});

// api/offers.js
var SERVER_CACHE_TTL_S = 3600;
var MANUAL_REFRESH_COOLDOWN_S = 60;
var COLLECTION_ID = "col10hfq4hml2z0z0wutu3a9hvt60qy9fcq4k4dznsfncey4lu6kpt3su7u9ah";
var TOKEN_ID = "xch";
var API_BASE = `https://api.mintgarden.io/collections/${COLLECTION_ID}/nfts/by_offers`;
var fetchPromise = null;
async function fetchWithRetry(url, maxRetries = 5) {
  let lastError;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url);
      if (response.status === 429 || response.status === 503 || response.status === 504) {
        if (attempt < maxRetries - 1) {
          const backoff = Math.min(1e3 * Math.pow(2, attempt), 5e3);
          await new Promise((resolve) => setTimeout(resolve, backoff));
          continue;
        }
      }
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries - 1) {
        const backoff = Math.min(1e3 * Math.pow(2, attempt), 5e3);
        await new Promise((resolve) => setTimeout(resolve, backoff));
      }
    }
  }
  throw lastError || new Error("Failed to fetch after retries");
}
__name(fetchWithRetry, "fetchWithRetry");
function extractLauncher(item) {
  if (item.encoded_id && typeof item.encoded_id === "string" && item.encoded_id.startsWith("nft1")) {
    return item.encoded_id;
  }
  if (item.encodedId && typeof item.encodedId === "string" && item.encodedId.startsWith("nft1")) {
    return item.encodedId;
  }
  if (item.launcher_bech32 && typeof item.launcher_bech32 === "string" && item.launcher_bech32.startsWith("nft1")) {
    return item.launcher_bech32;
  }
  if (item.launcherBech32 && typeof item.launcherBech32 === "string" && item.launcherBech32.startsWith("nft1")) {
    return item.launcherBech32;
  }
  if (item.id && typeof item.id === "string" && item.id.startsWith("nft1")) {
    return item.id;
  }
  return null;
}
__name(extractLauncher, "extractLauncher");
function extractRawPrice(item) {
  if (item.xch_price !== void 0 && item.xch_price !== null) {
    return item.xch_price;
  }
  if (item.price?.xch_price !== void 0 && item.price.xch_price !== null) {
    return item.price.xch_price;
  }
  if (item.price !== void 0 && item.price !== null) {
    return item.price;
  }
  if (item.amount !== void 0 && item.amount !== null) {
    return item.amount;
  }
  if (item.listing_price !== void 0 && item.listing_price !== null) {
    return item.listing_price;
  }
  return null;
}
__name(extractRawPrice, "extractRawPrice");
function normalizePrice(raw) {
  if (raw === null || raw === void 0 || isNaN(raw)) return null;
  const rawNum = typeof raw === "number" ? raw : parseFloat(raw);
  if (isNaN(rawNum)) return null;
  if (Number.isInteger(rawNum) && rawNum >= 1e9) {
    return rawNum / 1e12;
  }
  return rawNum;
}
__name(normalizePrice, "normalizePrice");
function computePercentiles(sortedPrices, percentiles) {
  if (sortedPrices.length === 0) return {};
  const result = {};
  for (const p of percentiles) {
    const index = Math.floor(p / 100 * (sortedPrices.length - 1));
    result[`p${p}`] = sortedPrices[index];
  }
  return result;
}
__name(computePercentiles, "computePercentiles");
async function fetchAllOffers(reverseMap) {
  const listingsById = {};
  let pageCursor = null;
  let totalItemsFetched = 0;
  while (true) {
    let url = `${API_BASE}?token_id=${TOKEN_ID}&size=100`;
    if (pageCursor) {
      url += `&page=${encodeURIComponent(pageCursor)}`;
    }
    const response = await fetchWithRetry(url);
    const items = response.items || [];
    const next = response.next;
    if (items.length === 0) {
      break;
    }
    totalItemsFetched += items.length;
    for (const item of items) {
      const launcher = extractLauncher(item);
      if (!launcher) continue;
      const rawPrice = extractRawPrice(item);
      if (rawPrice === null) continue;
      const priceXch = normalizePrice(rawPrice);
      if (priceXch === null || priceXch <= 0) continue;
      const internalId = reverseMap[launcher];
      if (!internalId) continue;
      const nowIso = (/* @__PURE__ */ new Date()).toISOString();
      const listing = {
        price_xch: priceXch,
        timestamp: item.updated_at || item.data?.updated_at || nowIso,
        updated_at: item.updated_at || item.data?.updated_at || nowIso
      };
      if (!listingsById[internalId]) {
        listingsById[internalId] = {
          best_listing: null
        };
      }
      if (!listingsById[internalId].best_listing || listing.price_xch < listingsById[internalId].best_listing.price_xch) {
        listingsById[internalId].best_listing = listing;
      }
    }
    if (!next) {
      break;
    }
    pageCursor = next;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return { listingsById, totalItemsFetched };
}
__name(fetchAllOffers, "fetchAllOffers");
function normalizeResponse(listingsById, collectionId) {
  let floorXch = null;
  let floorId = null;
  for (const [id, data] of Object.entries(listingsById)) {
    if (data.best_listing && data.best_listing.price_xch) {
      if (floorXch === null || data.best_listing.price_xch < floorXch) {
        floorXch = data.best_listing.price_xch;
        floorId = id;
      }
    }
  }
  const prices = [];
  for (const [id, data] of Object.entries(listingsById)) {
    if (data.best_listing && data.best_listing.price_xch) {
      prices.push(data.best_listing.price_xch);
    }
  }
  let marketStats = {
    floor_xch: floorXch,
    listed_count: prices.length,
    median_xch: null,
    p10_xch: null,
    p90_xch: null
  };
  if (prices.length > 0) {
    const sortedPrices = [...prices].sort((a, b) => a - b);
    const percentiles = computePercentiles(sortedPrices, [10, 50, 90]);
    marketStats.median_xch = percentiles.p50 || null;
    marketStats.p10_xch = percentiles.p10 || null;
    marketStats.p90_xch = percentiles.p90 || null;
  }
  return {
    schema_version: "1.0",
    generated_at: (/* @__PURE__ */ new Date()).toISOString(),
    collection_id: collectionId,
    floor_xch: floorXch,
    floor_id: floorId,
    count: Object.keys(listingsById).length,
    market_stats: marketStats,
    listings_by_id: listingsById
  };
}
__name(normalizeResponse, "normalizeResponse");
async function loadReverseMap(request) {
  try {
    const url = new URL(request.url);
    const origin = url.origin;
    const launcherMapUrl = `${origin}/assets/BigPulp/mintgarden_launcher_map_runtime_v1.json`;
    const response = await fetch(launcherMapUrl);
    if (!response.ok) {
      const legacyUrl = `${origin}/assets/BigPulp/mintgarden_launcher_map_v1.json`;
      const legacyResponse = await fetch(legacyUrl);
      if (!legacyResponse.ok) {
        throw new Error(`Failed to fetch launcher map: ${legacyResponse.status}`);
      }
      const data2 = await legacyResponse.json();
      if (!data2.map) {
        throw new Error("Launcher map has no map field");
      }
      const reverseMap2 = {};
      for (const [id, launcher] of Object.entries(data2.map)) {
        reverseMap2[launcher] = id;
      }
      return reverseMap2;
    }
    const data = await response.json();
    if (!data.map) {
      throw new Error("Launcher map has no map field");
    }
    const reverseMap = {};
    for (const [id, launcher] of Object.entries(data.map)) {
      reverseMap[launcher] = id;
    }
    return reverseMap;
  } catch (err) {
    console.error("[Offers API] Could not load launcher map:", err.message);
    throw err;
  }
}
__name(loadReverseMap, "loadReverseMap");
async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const force = url.searchParams.get("force") === "1";
  const cacheKeyUrl = new URL(request.url);
  cacheKeyUrl.search = "";
  cacheKeyUrl.pathname = force ? "/__cache/offers/forced" : "/__cache/offers/normal";
  const cacheRequest = new Request(cacheKeyUrl.toString(), { method: "GET" });
  const cached = await caches.default.match(cacheRequest);
  if (cached) {
    console.log(`[Offers API] Cache hit (${force ? "forced" : "normal"})`);
    const headers = new Headers(cached.headers);
    headers.set("X-Offers-Cache", "HIT");
    headers.set("X-Offers-Key", force ? "forced" : "normal");
    return new Response(cached.body, {
      status: cached.status,
      statusText: cached.statusText,
      headers
    });
  }
  if (fetchPromise) {
    console.log("[Offers API] One-flight lock: awaiting existing fetch");
    try {
      const { payloadText, generatedAt } = await fetchPromise;
      if (force) {
        const forcedKeyUrl = new URL(request.url);
        forcedKeyUrl.search = "";
        forcedKeyUrl.pathname = "/__cache/offers/forced";
        const forcedCacheRequest = new Request(forcedKeyUrl.toString(), { method: "GET" });
        const responseForced = new Response(payloadText, {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": `public, max-age=0, s-maxage=${MANUAL_REFRESH_COOLDOWN_S}`,
            "X-Offers-Generated-At": generatedAt,
            "X-Cache-Mode": "forced",
            "X-Offers-Cache": "MISS",
            "X-Offers-Key": "forced"
          }
        });
        context.waitUntil(caches.default.put(forcedCacheRequest, responseForced.clone()));
        return responseForced;
      } else {
        return new Response(payloadText, {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": `public, max-age=0, s-maxage=${SERVER_CACHE_TTL_S}`,
            "X-Offers-Generated-At": generatedAt,
            "X-Cache-Mode": "normal",
            "X-Offers-Cache": "MISS",
            "X-Offers-Key": "normal"
          }
        });
      }
    } catch (err) {
      fetchPromise = null;
    }
  }
  const startTime = Date.now();
  fetchPromise = (async () => {
    try {
      console.log(`[Offers API] Cache miss, fetching from MintGarden (forced: ${force})`);
      const reverseMap = await loadReverseMap(request);
      const { listingsById, totalItemsFetched } = await fetchAllOffers(reverseMap);
      const collectionId = env?.COLLECTION_ID || COLLECTION_ID;
      const normalized = normalizeResponse(listingsById, collectionId);
      const duration = Date.now() - startTime;
      console.log(`[Offers API] Fetched ${totalItemsFetched} items, ${normalized.count} listings, duration: ${duration}ms`);
      const payloadText = JSON.stringify(normalized);
      const generatedAt = normalized.generated_at;
      const responseForced = new Response(payloadText, {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": `public, max-age=0, s-maxage=${MANUAL_REFRESH_COOLDOWN_S}`,
          "X-Offers-Generated-At": generatedAt,
          "X-Cache-Mode": "forced",
          "X-Offers-Cache": "MISS",
          "X-Offers-Key": "forced"
        }
      });
      const responseNormal = new Response(payloadText, {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": `public, max-age=0, s-maxage=${SERVER_CACHE_TTL_S}`,
          "X-Offers-Generated-At": generatedAt,
          "X-Cache-Mode": "normal",
          "X-Offers-Cache": "MISS",
          "X-Offers-Key": "normal"
        }
      });
      if (force) {
        const forcedKeyUrl = new URL(request.url);
        forcedKeyUrl.search = "";
        forcedKeyUrl.pathname = "/__cache/offers/forced";
        const forcedCacheRequest = new Request(forcedKeyUrl.toString(), { method: "GET" });
        const normalKeyUrl = new URL(request.url);
        normalKeyUrl.search = "";
        normalKeyUrl.pathname = "/__cache/offers/normal";
        const normalCacheRequest = new Request(normalKeyUrl.toString(), { method: "GET" });
        await Promise.all([
          caches.default.put(forcedCacheRequest, responseForced.clone()),
          caches.default.put(normalCacheRequest, responseNormal.clone())
        ]);
      } else {
        const normalKeyUrl = new URL(request.url);
        normalKeyUrl.search = "";
        normalKeyUrl.pathname = "/__cache/offers/normal";
        const normalCacheRequest = new Request(normalKeyUrl.toString(), { method: "GET" });
        await caches.default.put(normalCacheRequest, responseNormal.clone());
      }
      return { payloadText, generatedAt };
    } catch (err) {
      console.error("[Offers API] Error:", err);
      fetchPromise = null;
      throw err;
    } finally {
      fetchPromise = null;
    }
  })();
  try {
    const { payloadText, generatedAt } = await fetchPromise;
    if (force) {
      return new Response(payloadText, {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": `public, max-age=0, s-maxage=${MANUAL_REFRESH_COOLDOWN_S}`,
          "X-Offers-Generated-At": generatedAt,
          "X-Cache-Mode": "forced",
          "X-Offers-Cache": "MISS",
          "X-Offers-Key": "forced"
        }
      });
    } else {
      return new Response(payloadText, {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": `public, max-age=0, s-maxage=${SERVER_CACHE_TTL_S}`,
          "X-Offers-Generated-At": generatedAt,
          "X-Cache-Mode": "normal",
          "X-Offers-Cache": "MISS",
          "X-Offers-Key": "normal"
        }
      });
    }
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: "Failed to fetch offers",
        message: err.message
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      }
    );
  }
}
__name(onRequestGet, "onRequestGet");

// api/tangify.js
var corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Expose-Headers": "X-Tangify-Model"
};
var MAX_IMAGE_BYTES = 6 * 1024 * 1024;
function base64ToBytes(b64) {
  if (typeof atob === "function") {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
      bytes[i] = bin.charCodeAt(i);
    }
    return bytes;
  }
  const buf = Buffer.from(b64, "base64");
  return new Uint8Array(buf);
}
__name(base64ToBytes, "base64ToBytes");
async function callEdits({ model, apiKey, imageFile, prompt }) {
  const fd = new FormData();
  fd.append("model", model);
  fd.append("image", imageFile, imageFile.name || "input.png");
  fd.append("prompt", prompt);
  fd.append("size", "1024x1024");
  if (model === "gpt-image-1") {
    fd.append("input_fidelity", "high");
  }
  if (model === "dall-e-2") {
    fd.append("response_format", "b64_json");
  }
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12e4);
    const response = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: fd,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    let json = null;
    try {
      json = await response.json();
    } catch (e) {
      console.warn("OpenAI response was not JSON:", e);
      try {
        const text = await response.text();
        console.warn("OpenAI response text:", text.substring(0, 500));
      } catch (e2) {
        console.warn("Could not read response as text either");
      }
    }
    return { ok: response.ok, status: response.status, json };
  } catch (error) {
    if (error.name === "AbortError") {
      console.error("OpenAI API request timed out after 120 seconds");
      return {
        ok: false,
        status: 504,
        json: { error: { message: "Request timed out. The image generation is taking too long." } }
      };
    }
    console.error("OpenAI API request failed:", error);
    return {
      ok: false,
      status: 500,
      json: { error: { message: `Network error: ${error.message || "Connection failed"}` } }
    };
  }
}
__name(callEdits, "callEdits");
function isVerificationOrPermissionError(json, status) {
  if (!(status === 401 || status === 403)) return false;
  const msg = (json?.error?.message || "").toLowerCase();
  return msg.includes("must be verified") || msg.includes("organization must be verified") || msg.includes("verify organization") || msg.includes("not authorized") || msg.includes("permission") || msg.includes("insufficient") || msg.includes("identity");
}
__name(isVerificationOrPermissionError, "isVerificationOrPermissionError");
async function onRequestPost(context) {
  const { request, env } = context;
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }
  try {
    const apiKey = env.OPENAI_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "OpenAI API key not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
    let form;
    try {
      form = await request.formData();
    } catch (parseError) {
      console.error("Failed to parse form data:", parseError);
      return new Response(
        JSON.stringify({ error: "Invalid request. Expected multipart/form-data." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
    const imageFile = form.get("image");
    if (!imageFile || !(imageFile instanceof File)) {
      return new Response(
        JSON.stringify({ error: 'No image file provided. Expected "image" field with a file.' }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
    if (imageFile.size === 0) {
      return new Response(
        JSON.stringify({ error: "Image file is empty." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
    if (imageFile.size > MAX_IMAGE_BYTES) {
      return new Response(
        JSON.stringify({ error: `Image file too large. Maximum size is ${MAX_IMAGE_BYTES / (1024 * 1024)}MB.` }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
    const userPrompt = (form.get("prompt") || "").toString().trim();
    if (!userPrompt || userPrompt.length === 0) {
      return new Response(
        JSON.stringify({ error: "No prompt provided. Prompt is required." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
    const HARD_CONSTRAINTS = `Keep the exact original drawing style and pose. Do not redraw the face or body shape. Only add accessories and background elements on top. Maintain black outlines, minimal shading, and the same character proportions.`;
    const FINAL_PROMPT = `${HARD_CONSTRAINTS}

${userPrompt}`;
    const r1 = await callEdits({
      model: "gpt-image-1",
      apiKey,
      imageFile,
      prompt: FINAL_PROMPT
    });
    if (r1.ok) {
      if (!r1.json) {
        return new Response(
          JSON.stringify({ error: "OpenAI request failed (non-JSON response)" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }
      const b64Json = r1.json.data?.[0]?.b64_json;
      if (!b64Json) {
        return new Response(
          JSON.stringify({ error: "No image data in response (missing b64_json)" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }
      const bytes = base64ToBytes(b64Json);
      return new Response(bytes, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "image/png",
          "X-Tangify-Model": "gpt-image-1",
          "Cache-Control": "no-store"
        }
      });
    }
    if (isVerificationOrPermissionError(r1.json, r1.status)) {
      const r2 = await callEdits({
        model: "dall-e-2",
        apiKey,
        imageFile,
        prompt: FINAL_PROMPT
      });
      if (r2.ok) {
        if (!r2.json) {
          return new Response(
            JSON.stringify({ error: "OpenAI request failed (non-JSON response)" }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            }
          );
        }
        const b64Json = r2.json.data?.[0]?.b64_json;
        if (!b64Json) {
          return new Response(
            JSON.stringify({ error: "No image data in response (missing b64_json)" }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            }
          );
        }
        const bytes = base64ToBytes(b64Json);
        return new Response(bytes, {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "image/png",
            "X-Tangify-Model": "dall-e-2",
            "Cache-Control": "no-store"
          }
        });
      } else {
        let errorMessage = "Failed to edit image";
        if (r2.json?.error?.message) {
          errorMessage = r2.json.error.message;
        } else if (!r2.json) {
          errorMessage = "OpenAI request failed (non-JSON response)";
        }
        return new Response(
          JSON.stringify({ error: errorMessage }),
          {
            status: r2.status,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }
    } else {
      let errorMessage = "Failed to edit image";
      if (r1.json?.error?.message) {
        errorMessage = r1.json.error.message;
      } else if (r1.json?.error) {
        errorMessage = typeof r1.json.error === "string" ? r1.json.error : JSON.stringify(r1.json.error);
      } else if (!r1.json) {
        errorMessage = "OpenAI request failed (non-JSON response)";
      }
      return new Response(
        JSON.stringify({ error: errorMessage }),
        {
          status: r1.status || 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
  } catch (error) {
    console.error("Tangify error:", error);
    let errorMessage = error.message || "Internal server error";
    let statusCode = 500;
    if (error.message?.includes("timeout") || error.message?.includes("AbortError")) {
      errorMessage = "Request timed out. The image generation is taking too long. Please try again with a smaller image or simpler prompt.";
      statusCode = 504;
    } else if (error.message?.includes("network") || error.message?.includes("fetch") || error.message?.includes("connection")) {
      errorMessage = `Network connection error: ${error.message}. Please check your internet connection and try again.`;
      statusCode = 503;
    }
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: statusCode,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
}
__name(onRequestPost, "onRequestPost");
async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders
  });
}
__name(onRequestOptions, "onRequestOptions");

// api/wallet-balances.js
async function onRequestGet2(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const address = url.searchParams.get("address");
  if (!address) {
    return new Response(
      JSON.stringify({ error: "Missing address parameter" }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      }
    );
  }
  const endpointsToTry = [
    `https://api.xchscan.com/address/${address}`,
    // PRIMARY - most reliable
    `https://api2.spacescan.io/1/xch/address/balance/${address}`,
    // FALLBACK 1
    `https://api.spacescan.io/address/xch-balance/${address}`
    // FALLBACK 2 - XCH only
  ];
  const errors = [];
  let lastStatus = null;
  const apiKey = env?.spacescan || env?.SPACESCAN_API_KEY || null;
  for (const endpoint of endpointsToTry) {
    try {
      const headers = {
        "User-Agent": "WojakInk-Treasury/1.0",
        "Accept": "application/json"
      };
      if (apiKey) {
        headers["Authorization"] = `Bearer ${apiKey}`;
        console.log(`[Wallet Balances Proxy] Using API key for ${endpoint}`);
      } else {
        console.log(`[Wallet Balances Proxy] No API key found, using unauthenticated request`);
      }
      const response = await fetch(endpoint, {
        method: "GET",
        headers
      });
      const status = response.status;
      const responseText = await response.text();
      console.log(`[Wallet Balances Proxy] ${endpoint} - Status: ${status}`);
      if (response.ok) {
        try {
          const data = JSON.parse(responseText);
          console.log(`[Wallet Balances Proxy] Success! Response keys:`, Object.keys(data || {}));
          return new Response(responseText, {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
              "X-Proxied-Endpoint": endpoint,
              "Cache-Control": "public, max-age=240"
              // 4 min cache
            }
          });
        } catch (parseError) {
          console.warn(`[Wallet Balances Proxy] JSON parse failed for ${endpoint}:`, parseError);
          return new Response(responseText, {
            status: 200,
            headers: {
              "Content-Type": "text/plain",
              "Access-Control-Allow-Origin": "*",
              "X-Proxied-Endpoint": endpoint
            }
          });
        }
      }
      const errorInfo = {
        endpoint,
        status,
        error: `HTTP ${status}: ${response.statusText}`,
        responsePreview: responseText.substring(0, 200)
        // First 200 chars
      };
      errors.push(errorInfo);
      lastStatus = status;
      if (status === 429) {
        console.log(`[Wallet Balances Proxy] \u23F8\uFE0F Rate limited: ${endpoint}, trying next endpoint...`);
        await new Promise((resolve) => setTimeout(resolve, 1e3));
        continue;
      }
      if (status === 404) {
        console.log(`[Wallet Balances Proxy] \u274C Not found: ${endpoint}, trying next endpoint...`);
        continue;
      }
      if (status >= 500) {
        console.log(`[Wallet Balances Proxy] \u274C Server error: ${endpoint} (${status}), trying next endpoint...`);
        await new Promise((resolve) => setTimeout(resolve, 1e3));
        continue;
      }
    } catch (error) {
      console.error(`[Wallet Balances Proxy] Error fetching ${endpoint}:`, error);
      errors.push({
        endpoint,
        status: null,
        error: error.message,
        responsePreview: null
      });
    }
  }
  const hasRateLimit = errors.some((e) => e.status === 429);
  const hint = hasRateLimit ? "Rate limit hit. Wait 5-10 minutes and try again." : "API may be down. Check https://spacescan.io status.";
  return new Response(
    JSON.stringify({
      success: false,
      error: "All API endpoints failed",
      tried: errors.map((e) => ({
        endpoint: e.endpoint,
        status: e.status,
        error: e.error
      })),
      hint,
      lastStatus
    }),
    {
      status: lastStatus || 503,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    }
  );
}
__name(onRequestGet2, "onRequestGet");

// ../.wrangler/tmp/pages-9ZlkXN/functionsRoutes-0.611172221830512.mjs
var routes = [
  {
    routePath: "/api/offers",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet]
  },
  {
    routePath: "/api/tangify",
    mountPath: "/api",
    method: "OPTIONS",
    middlewares: [],
    modules: [onRequestOptions]
  },
  {
    routePath: "/api/tangify",
    mountPath: "/api",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost]
  },
  {
    routePath: "/api/wallet-balances",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet2]
  }
];

// ../../node_modules/path-to-regexp/dist.es2015/index.js
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
__name(lexer, "lexer");
function parse(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = /* @__PURE__ */ __name(function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  }, "tryConsume");
  var mustConsume = /* @__PURE__ */ __name(function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  }, "mustConsume");
  var consumeText = /* @__PURE__ */ __name(function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  }, "consumeText");
  var isSafe = /* @__PURE__ */ __name(function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  }, "isSafe");
  var safePattern = /* @__PURE__ */ __name(function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  }, "safePattern");
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
__name(parse, "parse");
function match(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
__name(match, "match");
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = /* @__PURE__ */ __name(function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    }, "_loop_1");
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path, index, params };
  };
}
__name(regexpToFunction, "regexpToFunction");
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(escapeString, "escapeString");
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
__name(flags, "flags");
function regexpToRegexp(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
__name(regexpToRegexp, "regexpToRegexp");
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
__name(arrayToRegexp, "arrayToRegexp");
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse(path, options), keys, options);
}
__name(stringToRegexp, "stringToRegexp");
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
__name(tokensToRegexp, "tokensToRegexp");
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
__name(pathToRegexp, "pathToRegexp");

// ../../node_modules/wrangler/templates/pages-template-worker.ts
var escapeRegex = /[.+?^${}()|[\]\\]/g;
function* executeRequest(request) {
  const requestPath = new URL(request.url).pathname;
  for (const route of [...routes].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult) {
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: mountMatchResult.path
        };
      }
    }
  }
  for (const route of routes) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: true
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}
__name(executeRequest, "executeRequest");
var pages_template_worker_default = {
  async fetch(originalRequest, env, workerContext) {
    let request = originalRequest;
    const handlerIterator = executeRequest(request);
    let data = {};
    let isFailOpen = false;
    const next = /* @__PURE__ */ __name(async (input, init) => {
      if (input !== void 0) {
        let url = input;
        if (typeof input === "string") {
          url = new URL(input, request.url).toString();
        }
        request = new Request(url, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const { handler, params, path } = result.value;
        const context = {
          request: new Request(request.clone()),
          functionPath: path,
          next,
          params,
          get data() {
            return data;
          },
          set data(value) {
            if (typeof value !== "object" || value === null) {
              throw new Error("context.data must be an object");
            }
            data = value;
          },
          env,
          waitUntil: workerContext.waitUntil.bind(workerContext),
          passThroughOnException: /* @__PURE__ */ __name(() => {
            isFailOpen = true;
          }, "passThroughOnException")
        };
        const response = await handler(context);
        if (!(response instanceof Response)) {
          throw new Error("Your Pages function should return a Response");
        }
        return cloneResponse(response);
      } else if ("ASSETS") {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      } else {
        const response = await fetch(request);
        return cloneResponse(response);
      }
    }, "next");
    try {
      return await next();
    } catch (error) {
      if (isFailOpen) {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      }
      throw error;
    }
  }
};
var cloneResponse = /* @__PURE__ */ __name((response) => (
  // https://fetch.spec.whatwg.org/#null-body-status
  new Response(
    [101, 204, 205, 304].includes(response.status) ? null : response.body,
    response
  )
), "cloneResponse");

// ../../node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// ../.wrangler/tmp/bundle-t1QkpV/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = pages_template_worker_default;

// ../../node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// ../.wrangler/tmp/bundle-t1QkpV/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=functionsWorker-0.3569088657631404.mjs.map
