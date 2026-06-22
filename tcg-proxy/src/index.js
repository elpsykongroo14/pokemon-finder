//cloudflare worker
//this runs on cloudflare's servers, never in the browser
//the TCG API key lives here as a secre not in code

export default {
  async fetch(request, env) {
    //---CORS preflight
    //before making a "real" request, brosers send a preflight otpions request to ask:
    //"is this cross-origin request allowed?"
    //we have to answer yes, or the browser wont proceed
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: corsHeaders(),
      });
    }
    //---only allow GET requests
    if (request.method !== "GET") {
      return new Response("Method not allowed", { status: 405 });
    }

    //---build the TCG API URL
    //the browser sends requests to our worker url with TCG api as a query parameter
    //we extract everything after the worker's origin and forward it to the real tcg api
    const incomingURL = new URL(request.url);
    const tcgURL = `https://api.pokemontcg.io/v2/cards${incomingURL.search}`;

    //---forward rquest to TCG api with the secret key
    //env.TCG_API_KEY is a cloudflare secret its never in the code, never in any file, or visible to anywhere
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
        ...corsHeaders(),
      },
    });
  },
};

//---CORS headers helper
//this tells the browser: "yes any origin may read this response"
//in production, would be replace * with an actual domain
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}
