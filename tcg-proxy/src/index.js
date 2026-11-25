//cloudflare worker
//this runs on cloudflare's servers, never in the browser
//the TCG API key lives here as a secret, not in code

//This is the one piece of hardcoded truth everything else in the file will refer back to:
const ALLOWED_ORIGINS = [
  "https://pokemon-finder-5wx.pages.dev",
  "http://localhost:5173",
  "http://localhost:4173",
  "https://ui-rehaul.pokemon-finder-react-b8o.pages.dev",
];

//the React app on Cloudflare Pages: its production site AND every preview
//deploy, which Pages serves on a per-deploy subdomain
//(https://1f089d80.pokemon-finder-react-b8o.pages.dev). an exact list could
//never name those in advance, so this one project's host is matched by
//pattern: https only, any single subdomain label or none, and nothing
//after the host (anchored with ^ and $, so "evil.com/?x=...pages.dev" or
//"pokemon-finder-react-b8o.pages.dev.evil.com" never match)
const ALLOWED_ORIGIN_PATTERN =
  /^https:\/\/([a-z0-9-]+\.)?pokemon-finder-react-b8o\.pages\.dev$/;

//the decision function
// "figure out, per request, whether this origin earns a yes"
function getAllowedOrigin(request) {
  const origin = request.headers.get("Origin");
  if (!origin) return null;
  if (ALLOWED_ORIGINS.includes(origin)) return origin;
  return ALLOWED_ORIGIN_PATTERN.test(origin) ? origin : null;
}

//one call to the TCG API, read safely. the API sometimes answers with an
//empty or cut-off body; calling .json() on that threw "Unexpected end of
//JSON input" and this worker answered 500. now a bad body is reported as
//{ ok: false } so the caller can try again
async function callTcgApi(url, apiKey) {
  try {
    const response = await fetch(url, { headers: { "X-Api-Key": apiKey } });
    const text = await response.text();
    const data = text ? JSON.parse(text) : null;
    if (data === null) return { ok: false, status: 502 };
    return { ok: response.ok, status: response.status, data };
  } catch {
    //the network failed, or the body was not JSON
    return { ok: false, status: 502 };
  }
}

//a SERVER-side failure (5xx, or a body we could not read) is often gone a
//moment later: try once more after a short pause. a 4xx is the request's
//own fault and would not change, so it is returned as it is
async function callTcgApiWithRetry(url, apiKey) {
  const first = await callTcgApi(url, apiKey);
  if (first.ok || first.status < 500) return first;
  await new Promise((resolve) => setTimeout(resolve, 400));
  return callTcgApi(url, apiKey);
}

//builds the actual header set for a given decision.
//if allowedOrigin is null, we simply dont include Access-Control-Allow-Origin at all,
//which is what tells the browser "no, this origin doesnt get to read the response."
function buildCorsHeaders(allowedOrigin) {
  const headers = { Vary: "Origin" };

  if (allowedOrigin) {
    headers["Access-Control-Allow-Origin"] = allowedOrigin;
    headers["Access-Control-Allow-Methods"] = "GET, OPTIONS";
    headers["Access-Control-Allow-Headers"] = "Content-Type";
  }

  return headers;
}

export default {
  async fetch(request, env) {
    //CORS headers are created immediately.
    //this is important because if anything fails later,
    //our error response can still tell the browser:
    //"yes, this origin is allowed to read this response."
    const allowedOrigin = getAllowedOrigin(request);
    const corsHeaders = buildCorsHeaders(allowedOrigin);

    try {
      //---CORS preflight
      //before making a "real" request, browsers send a preflight options request to ask:
      //"is this cross-origin request allowed?"
      //we have to answer yes, or the browser wont proceed
      if (request.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: corsHeaders,
        });
      }

      const clientIP = request.headers.get("CF-Connecting-IP");

      const { success } = await env.TCG_RATE_LIMITER.limit({ key: clientIP });

      if (!success) {
        return new Response("Too many requests", {
          status: 429,
          headers: corsHeaders,
        });
      }

      //---only allow GET requests
      //corsHeaders is included here too, not just on the success response below -
      //otherwise a disallowed-method request from an ALLOWED origin would get a
      //405 the browser can't actually read, which just looks like a confusing
      //CORS error instead of the real, boring "wrong method" reason
      if (request.method !== "GET") {
        return new Response("Method not allowed", {
          status: 405,
          headers: corsHeaders,
        });
      }

      //---build the TCG API URL
      //the browser sends requests to our worker url with TCG api as a query parameter
      //we extract everything after the worker's origin and forward it to the real tcg api
      const incomingURL = new URL(request.url);

      //---check the server-side cache first
      //the key is the exact query string, prefixed so this KV namespace,
      //stays safe to reuse for other kinds of cached data later
      const cacheKey = `tcg:${incomingURL.search}`;

      const cached = await env.TCG_CACHE.get(cacheKey, { type: "json" });

      if (cached) {
        return new Response(JSON.stringify(cached), {
          status: 200,
          headers: {
            "Content-type": "application/json",
            "X-Cache": "HIT",
            ...corsHeaders,
          },
        });
      }

      //---build the TCG API URL
      const tcgURL = `https://api.pokemontcg.io/v2/cards${incomingURL.search}`;

      //---forward request to TCG api with the secret key
      //env.TCG_API_KEY is a cloudflare secret, its never in the code,
      //never in any file, or visible to anywhere
      const result = await callTcgApiWithRetry(tcgURL, env.TCG_API_KEY);

      //---the API failed twice: say so plainly, as a 502 (a bad answer from
      //the server behind this one), with the CORS headers, so the browser
      //shows the app's error message instead of a confusing CORS error
      if (!result.data) {
        return new Response(
          JSON.stringify({ error: "The card service did not answer. Try again." }),
          {
            status: result.status,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          },
        );
      }

      const data = result.data;

      //only a real success is cached: an error cached for 24 hours would
      //keep a Pokémon's cards away for a whole day
      if (result.ok) {
        await env.TCG_CACHE.put(cacheKey, JSON.stringify(data), {
          expirationTtl: 60 * 60 * 24, //24 hours, in seconds
        });
      }

      //---forward the response back to the browser
      return new Response(JSON.stringify(data), {
        status: result.status,
        headers: {
          "Content-Type": "application/json",
          "X-Cache": "MISS",

          //corsHeaders is already the object we want -
          //it was built once, above, by CALLING buildCorsHeaders().
          //from here on it's just data to spread in, not a function to call again
          ...corsHeaders,
        },
      });
    } catch (error) {
      //this catches unexpected Worker crashes.
      //without this, Cloudflare creates its own 500 response,
      //which does NOT contain our CORS headers.
      //the browser then incorrectly reports the problem as a CORS error.
      console.error(error);

      return new Response(
        JSON.stringify({
          error: error.message,
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        },
      );
    }
  },
};
