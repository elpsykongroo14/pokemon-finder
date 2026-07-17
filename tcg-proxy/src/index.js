//cloudflare worker
//this runs on cloudflare's servers, never in the browser
//the TCG API key lives here as a secret, not in code

//This is the one piece of hardcoded truth everything else in the file will refer back to:
const ALLOWED_ORIGINS = [
  "https://pokemon-finder-5wx.pages.dev",
  "http://localhost:5173",
];

//the decision function
// "figure out, per request, whether this origin earns a yes"
function getAllowedOrigin(request) {
  const origin = request.headers.get("Origin");
  return ALLOWED_ORIGINS.includes(origin) ? origin : null;
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
    //---CORS preflight
    //before making a "real" request, browsers send a preflight options request to ask:
    //"is this cross-origin request allowed?"
    //we have to answer yes, or the browser wont proceed
    const allowedOrigin = getAllowedOrigin(request);
    const corsHeaders = buildCorsHeaders(allowedOrigin);

    if (request.method === "OPTIONS") {
      return new Response(null, {
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
    const tcgURL = `https://api.pokemontcg.io/v2/cards${incomingURL.search}`;

    //---forward request to TCG api with the secret key
    //env.TCG_API_KEY is a cloudflare secret, its never in the code, never in any file, or visible to anywhere
    const tcgResponse = await fetch(tcgURL, {
      headers: {
        "X-Api-Key": env.TCG_API_KEY,
      },
    });

    //---forward the response back to the browser
    const data = await tcgResponse.json();

    return new Response(JSON.stringify(data), {
      status: tcgResponse.status,
      headers: {
        "Content-Type": "application/json",
        //corsHeaders is already the object we want - it was built once,
        //above, by CALLING buildCorsHeaders(). from here on it's just data
        //to spread in, not a function to call again.
        ...corsHeaders,
      },
    });
  },
};
