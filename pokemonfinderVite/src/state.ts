// single source of truth for two things every feature needs to agree on:
//1) "what pokemon is currently shown" (currentPokemon)
//2)"how do we update the URL and tab title when the view changes" (pushState)
//any module that needs to read or change either of these imports it from here.
// thats what makes it possible for favorites.js, team.js, compareMode.js and tcgLibrary.js
//to all agree on the same answers without importing from each other

import type { PokemonDetails } from "./type";

let currentPokemon: PokemonDetails | null = null;

export function getCurrentPokemon(): PokemonDetails | null {
  return currentPokemon;
}

export function setCurrentPokemon(pokemon: PokemonDetails | null): void {
  currentPokemon = pokemon;
}

//updates the URL's query string and the browser tab title, and pushes
//a new entry onto the browser's history stack so back/forward work.
//every view change in the app (picking a pokemon, openning the library, opening a card) goes through this one function
//nothing else in the app should call history.pushState directly
export function pushState(params: Record<string, string>, title: string): void {
  const urlParams = new URLSearchParams(params);
  history.pushState(
    //state object mirrors the params
    Object.fromEntries(urlParams),
    "",
    `?${urlParams.toString()}`,
  );
  document.title = `${title} - Pokémon Finder`;
}
