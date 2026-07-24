//Shared type definitions with no runtime behavior of their own, mirrors the same "one place to agree" idea as state.js applied to shapes instead of values.
//nothing in this file exists after compilation, its purely something for the compiler to check other files against

import { PokemonSprites } from "./sprites";

//the shape of a full pokemon object as fetched from pokeAPI:
export interface PokemonDetails {
  name: string;
  id: number;
  height: number;
  weight: number;
  types: PokemonType[];
  sprites: PokemonSprites;
  abilities: PokemonAbility[];
  stats: PokemonStat[];
  species: NamedAPIResource;
}

//the small, derived shape we actually persist to localStorage for both favorites and the team roster
//not the full API response, just enough to render a list item and look one back up by name.
export interface FavoritePokemon {
  name: string;
  id: number;
  sprite: string | null;
}

//---pokeAPI's universal building blocks:
//almost every pokeAPI object references other resources this way instead of embeding them.
export interface NamedAPIResource {
  name: string;
  url: string;
}

//A handful of fields (like PokemonSpecies.evolution_chain) reference a resource with no human-redable name attached,
// just URL to follow
export interface APIResource {
  url: string;
}

//---pokemon:
export interface PokemonType {
  slot: number;
  type: NamedAPIResource;
}

export interface PokemonAbility {
  is_hidden: boolean;
  slot: number;
  ability: NamedAPIResource;
}

export interface PokemonStat {
  base_stat: number;
  effort: number;
  stat: NamedAPIResource;
}

//---species and evolution:
export interface FlavorTextEntry {
  flavor_text: string;
  language: NamedAPIResource;
}

//scoped tightly on purpose: main.js only reads .evolution_chain.url and .flavor_text_entries off this object.
//nothing else is modeled, this is the "type only what you use" rule,
//it applies per-endpoint, not globally; PokemonDetails needed to be broad because many files consume it, this one doesnt because only one does.
export interface PokemonSpecies {
  evolution_chain: APIResource;
  flavor_text_entries: FlavorTextEntry[];
}

//evolution_details is deliberately omitted: buildEvolutionTree() in main.js only ever reads .species.name and .evoles_to,
//walking the tree structurally. it never inspects why an evolution happens
//so that data (which is the largest, messiest part of this endpoint) inst modeled
export interface ChainLink {
  species: NamedAPIResource;
  evolves_to: ChainLink[];
}

export interface EvolutionChain {
  id: number;
  chain: ChainLink[];
}

//the wrapper shape every pokeAPI "list" endpoint returns,
//confirmed directly against pokeAPI's own docs for the /pokemon list endpoint
export interface NamedAPIResourceList {
  count: number;
  next: string | null;
  previous: string | null;
  results: NamedAPIResource[];
}

//---TCG card
//sketched from actual field reads in tcglibrary.js, since that gives a more reliable picture than guessing at unseen upstream schema.
//same principle as above: model what render code actually consumes

export interface TCGCard {
  id: string;
  name: string;
  hp?: string;
  rarity?: string;
  artist?: string;
  flavorText?: string;
  supertypes?: string[];
  images?: {
    small?: string;
    large?: string;
  };
  set?: {
    name?: string;
    releaseDate?: string;
  };
}
