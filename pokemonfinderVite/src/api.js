//all network requests live here
//functions return data or throw - they never touch DOM

//base URLs
const POKE_API = "https://pokeapi.co/api/v2";
const TCG_API = "https://api.pokemontcg.io/v2";

const TCG_PROXY = "https://tcg-proxy.tcg-proxy.workers.dev";

//simple in memory cache
//a plain object used as a key value store
//key: the pokemon name or id
//value: the full api response object
const pokeCache = {};

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

export async function fetchSpecies(url) {
  //species url comes from the pokemon object (pokemon.species.url)
  //we just forward the URL rather than construct it
  return getJSON(url);
}

export async function fetchEvolutionChain(url) {
  //same pattern - URL comes from species data
  return getJSON(url);
}

export async function fetchAllpokemonNames() {
  const data = await getJSON(`${POKE_API}/pokemon?limit=1025`);
  //the api returns {results: [{name, url}, ...]}
  //we only need the names
  return data.results.map((p) => p.name);
}

//-------TCG

export async function fetchTCGCards(
  pokemonName,
  { orderBy = "-set.releaseDate", pageSize = 250 } = {},
) {
  const url = `${TCG_PROXY}/?q=name:"${pokemonName}"&orderBy=${orderBy}&pageSize=${pageSize}`;
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
