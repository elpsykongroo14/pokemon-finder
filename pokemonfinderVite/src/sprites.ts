//pure helper file for picking a sprite url out of a pokeAPI `sprites` object.
//no network calls or DOM access, just one rule defined once:
//prefer the official artwork, if it isnt available then fall back to the basic default sprite

export interface PokemonSprites {
  front_default?: string | null;
  front_shiny?: string | null;
  other?: {
    "official-artwork"?: {
      front_default?: string | null;
      front_shiny?: string | null;
    };
  };
}

interface SpriteOptions {
  shiny?: boolean;
}

export function getSpriteUrl(
  sprites: PokemonSprites,
  { shiny = false }: SpriteOptions = {},
): string | null {
  const artwork = sprites.other?.["official-artwork"];

  if (shiny) {
    return artwork?.front_shiny || sprites.front_shiny || null;
  }
  return artwork?.front_default || sprites.front_default || null;
}

//{shiny = false}: SpritesOptions = {}, is an options object called instead of plain getSpriteUrl(sprites, true)
