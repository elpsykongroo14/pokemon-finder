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
