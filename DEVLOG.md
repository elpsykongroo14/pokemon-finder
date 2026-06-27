06-11-26:
Focused on creating a pokedex sort of website that allows users to look up
their favorite pokemon, using the pokeapi to access about 1025 different pokemon
i was able to add a randomizer button, and a toggle shinies button that switches
between two art sprites, then added an evolution chain as well as a favorites button and implemented local storage to remember the last five viewed pokemon as well as the ones added to favorites too.

06-12-26:
added feature that allows us to build a team of 6 pokemon and prompts an error message if we exceed the limit

06-13-2026
worked mainly on implementing a new feature, where i added a pokemon TCG library that allows us to search for all available cards using https://dev.pokemontcg.io/ api, a sorting system that allows us to sort from newest to oldest and vice versa as well as sorting using rarity, clicking on a card shows use a container with a description of it. Also when first entering said library we shuffle through a number of preselected pokemon and return a selected group to present randomly.

06-14-2026
update and cleaned up the UI, as well as fixing some design flaws, cleaning up dead code and Inconsistencies.

06-15-2026
added a few features that improve the user experience such as flavour text that adds a bried description of each pokemon
as well as the physical attributes describing the weight/height/abilities, then a complex type effectiveness which was
the most interesting one conceptually, so let's really dig in.
The mental model: Pokémon has 18 types. Every attacking type deals a certain multiplier against every defending type: 2× (super effective), 0.5× (not very effective), 0× (immune), or 1× (normal). This forms an 18×18 matrix of rules.
We bake this in as a data structure because:

It never changes (it's game data, not live data)
Fetching it from the API on every search would be wasteful and add latency
Having it in code means you can read and reason about it directly.

all of these previous features data were all provided by the API.

06-17-26
worked on improving some existing features as well as added some quality of life improvements such as:

Keyboard nav — to improve accesibility for everyone.
Compare type effectiveness — just to make it more clean
Shareable URLs - biggest learning experience for me today, taught me an interesting concept

06-18-26
learned and implemented essential, valuable concepts into the project that were really beneficial:

1. ES modules with Vite (import/export).
2. Cloudflare Worker as API proxy (biggest challenge and learning experience of the day, really beneficial)

06-20-26:
refactored displayPokemon() into smaller functions (renderSprite, renderTypes,
renderMeta, renderStats) so each one only handles one piece of the UI instead
of one giant function doing everything. while doing that, found and fixed a
bug where the stat bars on the main card were highlighting the wrong stat
during compare mode.

also fixed the evolution chain so it handles Pokemon with multiple evolutions
(like Eevee's 8 evolutions) instead of only ever showing the first one —
used recursion to walk the full evolution tree instead of just following one
path.

06-21-26

1. Fixed variable shadowing bug in showLibrary() error message

2. Extracted getSpriteUrl() helper to remove duplicated sprite-fallback logic

3. Refactored button CSS to inclusion-based .btn system, remove !important overrides

4) spent the rest of the day migrating the app into an actual Vite project (previously it was just loaing js straight in the browser with no build step) the scaffold Vite generates comes with a placeholder demo (a counter button) —
   had to understand what every piece of that demo was doing before ripping it out,
   then ported my real files in: store.js, api.js, sprites.js, and the main app file
   became src/main.js. main lesson here was a relative-path gotcha — my real app
   expected its helpers one folder down (./src/store.js), but once main.js itself
   became part of Vite's src/ folder, that nesting needed to be flattened.
   decided to import the CSS straight from main.js (import "./pokemonfinder.css")
   instead of a <link> tag, so Vite can hot-reload style changes.

06-23-26/ 06-24-26
started breaking main.js up into seperate feature fi;es instead of one giant file.
first one done: pulled currentPokemon out into its own state.js file with getCurrentPokemon()/setCurrentPokemon() functions, then extracted all the
favorites logic (toggleFavorite, renderFavorites, updateFavoriteBtn) into
favorites.js.

biggest concept today: circular imports, favorites.js needs to trigger a search when a favorited pokemon is clicked it cant just import searchPokemon from main.js because main.js already imports favorites.js.
fixed it with a callback: main.js hands favorites.js a function to call (initFavorites(onSelect)) instead of favorites.js reaching into main.js directly, same concept applied to team.js

found and fixed a few bugs after the first pass: leftover unused imports in
main.js, a deleted DOM reference (teamBtn/favoriteBtn) that was still needed
for hiding buttons during compare mode, and a real bug in the back-button
handler — was calling setCurrentPokemon(pokemon) with a pokemon variable
that didn't even exist in that scope, fixed to setCurrentPokemon(null).

06-26-26
wrote my first unit tests today using Vitest, targeted sprites.js, store.js and api.s
since they're the only modules with zero DOM dependency

key concepts:

1. AAA pattern (arrange/act/assert)- the shape everly test follows
2. test isolation - localStorage and module-level state both persist across
   tests in the same file unless you rest them in beforeEach.
3. caught a bug by testing -api.js has an in memory cache for fetchPokemon that has no way to rest itself.
   wrote two tests against the same mocked-fetch pikachu call expecting different result, and the second one silently returned the first test's cached data instead of hitting my new mock.
   i then added a small clearPokeCache() export just to so tests can get a clean slate - first time a test caught a design problem instead of a logic bug.
4. mocking - only mock things that are slow/unpredictable (fetch, the network).
   never mock a deterministic code just because its a dependency
