// single source of truth for "what Pokémon is currently shown."
// any module that needs to read or change this imports it from here —
// that's what makes it possible for favorites.js, team.js, compareMode.js
// etc. to all agree on the same answer without importing from each

let currentPokemon = null;

export function getCurrentPokemon() {
  return currentPokemon;
}

export function setCurrentPokemon(pokemon) {
  currentPokemon = pokemon;
}
