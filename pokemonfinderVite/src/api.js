//all network requests live here
//functions return data or throw - they never touch DOM

//base URLs
const POKE_API = "https://pokeapi.co/api/v2";

const TCG_PROXY = "https://tcg-proxy.tcg-proxy.workers.dev";

//simple in memory cache
//a plain object used as a key value store
//key: the pokemon name or id
//value: the full api response object
const pokeCache = {};
//caches species and evolution-chain responses by their own URL,
//same reasoning as pokeCache: this data is static for the life of the session
const speciesCache = {};
const evoChainCache = {};

//exported so test can reset cache state between runs - see api.test.js
//(the app itself never needs to call this; pokemon data never changes
//within a session, so the cache is meant to live for the app's whole life)
export function clearPokeCache() {
  for (const key in pokeCache) delete pokeCache[key];
  for (const key in speciesCache) delete speciesCache[key];
  for (const key in evoChainCache) delete evoChainCache[key];
  allNamesCache = null;
}

//----
//Helper
//a private helper that all functions use
//private = no 'export' - only code inside this file can call it
//it handles the two failure modes of fetch:
//network failure = fetch() throws a typeError
//bad status code = response.ok is false, we throw manuallly
async function getJSON(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for: ${url}`);
  }
  return response.json();
}

//Pokemon
export async function fetchPokemon(nameOrId) {
  const key = String(nameOrId).toLowerCase().trim();

  //return cached result if we have it
  if (pokeCache[key]) return pokeCache[key];

  const data = await getJSON(`${POKE_API}/pokemon/${key}`);

  //Store in cache before returning
  pokeCache[key] = data;
  return data;
}

//species
export async function fetchSpecies(url) {
  if (speciesCache[url]) return speciesCache[url];
  const data = await getJSON(url);
  speciesCache[url] = data;
  return data;
}

//evolution chain
export async function fetchEvolutionChain(url) {
  if (evoChainCache[url]) return evoChainCache[url];
  const data = await getJSON(url);
  evoChainCache[url] = data;
  return data;
}

//theres only ever one possible result here (theres no "which pokemon" argument to key bey)
//so unliike pokeCache/speciesCache/evoChainCache this doesnt need to be an object
//a single variable that starts out empty and gets filled in once is enough
let allNamesCache = null;

export async function fetchAllpokemonNames() {
  if (allNamesCache) return allNamesCache;
  const data = await getJSON(`${POKE_API}/pokemon?limit=1025`);
  //the api returns {results: [{name, url}, ...]}
  //we only need the names
  allNamesCache = data.results.map((p) => p.name);
  return allNamesCache;
}

//-------TCG

export async function fetchTCGCards(
  pokemonName,
  { orderBy = "-set.releaseDate", pageSize = 250 } = {},
) {
  //strip embedded quotes before wrapping in our own "..." -
  //no real Pokemon name contains a quote, so this loses nothing legitimate,
  //and it closes off the one character that could break out of the
  //name:"..." expression we're building below
  const safeName = pokemonName.replace(/"/g, "");

  //this is TCG's own query syntax (a lucene style field: "value search")
  //it has its own grammar, separate from the URL's grammar, so it gets built and sanitized as its own step before it ever touches a URL
  const searchExpr = `name:"${safeName}"`;

  //URLSearchParams owns all URL layer encoding from here down
  //every value gets percent encoded automatically so a stray & or =
  //inside searchExpr cant be reinterpreted as a new query param
  const params = new URLSearchParams({
    q: searchExpr,
    orderBy,
    pageSize,
  });

  const url = `${TCG_PROXY}/?${params}`;

  //TCG api wraps results in a 'data' array
  const data = await getJSON(url);
  return data.data || [];
}

export async function fetchTCGCardsBatch(names) {
  //this fires multiple requests in parallel using Promise.all
  //and flattens the results into one array
  //used by library featured Cards display

  const results = await Promise.all(
    names.map((name) =>
      fetchTCGCards(name, { pageSize: 60 })
        //if one name fails, return empty array instead of crashing whole batch
        //.catch() on individual promises
        .catch(() => []),
    ),
  );
  return results.flat();
}

//these functions return data or throw an error
//never touching document, never setting innerHTML or calling classList
//which is what was happening originally
//as a result, now error handling in the UI becomes much cleaner
