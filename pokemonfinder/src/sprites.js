//pure helper file for picking a sprite url out of a pokeAPI `sprites` object.
//no network calls or DOM access, just one rule defined once:
//prefer the official artwork, if it isnt available then fall back to the basic default sprite

export function getSpriteUrl(sprites, { shiny = false } = {}) {
  //sprites.other?.[...]: optional chaining, the original code assumed sprites.other always exists, this is just safer
  const artwork = sprites.other?.["official-artwork"];

  if (shiny) {
    return artwork?.front_shiny || sprites.front_shiny || null;
  }
  return artwork?.front_default || sprites.front_default || null;
}

//{shiny = false} = {}, is an options object called instead of plain getSpriteUrl(sprites, true)
