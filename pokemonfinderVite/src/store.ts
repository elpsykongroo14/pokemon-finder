//single source of truth for all persistent data
//everything that reads from or writes to localStorage lives here

import type { PokemonDetails, FavoritePokemon } from "./type";
import { getSpriteUrl } from "./sprites";

const FAVORITES_KEY = "pokemon_favorites";
const TEAM_KEY = "pokemon_team";
const HISTORY_KEY = "pokemon_history";
const MAX_HISTORY = 5;
const MAX_TEAM = 6;

//Favorites

export function getFavorites(): FavoritePokemon[] {
  return JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");
}

export function addFavorite(pokemon: PokemonDetails): void {
  const favorites = getFavorites();
  const already = favorites.some((f) => f.name === pokemon.name);
  if (already) return;

  favorites.push({
    name: pokemon.name,
    id: pokemon.id,
    sprite: getSpriteUrl(pokemon.sprites),
  });
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
}

export function removeFavorite(name: string): void {
  const updated = getFavorites().filter((f) => f.name !== name);
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
}

export function isFavorite(name: string): boolean {
  return getFavorites().some((f) => f.name === name);
}

//Team

export function getTeam(): FavoritePokemon[] {
  return JSON.parse(localStorage.getItem(TEAM_KEY) || "[]");
}

interface TeamOk {
  ok: true;
}
interface TeamError {
  error: string;
}
type TeamResult = TeamOk | TeamError;

export function addToTeam(pokemon: PokemonDetails): TeamResult {
  const team = getTeam();
  if (team.length >= MAX_TEAM) return { error: `Team is full` };
  if (team.some((p) => p.name === pokemon.name))
    return { error: `Already on team` };

  team.push({
    name: pokemon.name,
    id: pokemon.id,
    sprite: getSpriteUrl(pokemon.sprites),
  });
  localStorage.setItem(TEAM_KEY, JSON.stringify(team));
  return { ok: true };
}

export function removeFromTeam(name: string): void {
  const updated = getTeam().filter((p) => p.name !== name);
  localStorage.setItem(TEAM_KEY, JSON.stringify(updated));
}

export function isOnTeam(name: string): boolean {
  return getTeam().some((p) => p.name === name);
}

export { MAX_TEAM };

//History
export function getHistory() {
  return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
}

export function saveToHistory(query: string): void {
  const existing = getHistory();
  const unique = [...new Set([query, ...existing])];
  localStorage.setItem(
    HISTORY_KEY,
    JSON.stringify(unique.slice(0, MAX_HISTORY)),
  );
}

//------------
//a few things are different from the original here
// the toggle pattern is now split into add/remove + is functions
//the original toggleFavorite() was doing two jobs, checking and acting
//now isFavorite(name) tells a fact, addFavorite/removeFavorite() each do one thing
//applied the seperation of query and command here

//-----------
//now addToTeam returns a result object instead of having the store function update the error div directly
//it lets the caller decide how to show {error: '...'} or {ok: true} to the user
