//Shared type definitions with no runtime behavior of their own, mirrors the same "one place to agree" idea as state.js applied to shapes instead of values.
//nothing in this file exists after compilation, its purely something for the compiler to check other files against

import { PokemonSprites } from "./sprites";

//the shape of a full pokemon object as fetched from pokeAPI. this is intentionally incomplete right now,
//it only lists the fields that state.js and store.js actually touch (name, id, sprites).
//as we comvert render.js, tcglibrary.js etc in later chapters, this interface will grow to include the fields those files need (types, states, heights...)
export interface PokemonDetails {
  name: string;
  id: number;
  sprites: PokemonSprites;
}

//the small, derived shape we actually persist to localStorage for both favorites and the team roster
//not the full API response, just enough to render a list item and look one back up by name.
export interface FavoritePokemon {
  name: string;
  id: number;
  sprite: string | null;
}
