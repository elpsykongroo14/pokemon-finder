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

07-01-26
fixed a real security bug today: reflected XSS in showCardPanel(). pokemonName
was coming straight from the URL (?search=...) and getting spliced directly into
innerHTML — meaning anyone could craft a link with a script tag in it and have it
execute in a visitor's browser automatically on page load.

fix: wrote a setCardGridMessage(text, className) helper that builds the <p> node
with document.createElement and sets the message via textContent instead of innerHTML.
textContent never runs the HTML parser, so the string is always treated as plain
text no matter what it contains. replaced every cardGrid status message
(loading, empty, error) with it, so there's now one safe path instead of six
independent chances to get it wrong.

also knocked out the last two test files:

team.test.js — 5 tests

- empty state renders 6 slots
- clicking team btn adds pokemon and updates btn text/class
- team full path: shows error message, auto-hides after 3s (used vi.useFakeTimers
  so the test doesn't actually wait 3 real seconds — fake timers let you advance
  the clock manually)
- remove button removes from team and clears the slot from the DOM
- clicking a filled slot's image fires the onSelectPokemon callback
  with the right name (tested with vi.fn() spy, proved the DI wiring works)

favorites.test.js — 5 tests

- empty state shows the no-favorites message
- favorite btn toggles correctly
- drawer open/close — tested all 3 close paths (close btn, overlay click, card select)
- remove button removes card without triggering onSelectPokemon
- clicking a card fires onSelectPokemon and closes the drawer

07-02-26 — moved pushState into state.js

- What moved: pushState(params, title) — was living somewhere it caused a coupling problem, now lives in state.js alongside currentPokemon/getCurrentPokemon/setCurrentPokemon.

- Why: every feature module (favorites, team, compareMode, tcgLibrary) needs to update the URL/title on view changes. Putting it in state.js means they all import one neutral shared utility instead of one module reaching into another or duplicating the URL-building logic.

07-03/07-04-26 — extracted tcglibrary.js out of main.js, wrote its test suite

- What moved: the entire TCG card library feature — showLibrary, showCardPanel, restoreLibraryState, renderCardGrid, the sort logic, the card detail modal, initTCGLibrary — all of it, into its own file.

- Same DI pattern as before: initTCGLibrary({ enterLibrary, exitLibrary }), mirroring initFavorites/initTeam.

- Wrote tcglibrary.test.js: 6 tests covering rendering a fetched batch, loading cards for a specific name, re-sorting on dropdown change, the tcg-button → auto-opens-card-panel flow, restoring library state from a popstate event, and isLibraryOpen().

07-08-26 — fixed innerHTML XSS in renderCardGrid()

- what was wrong: renderCardGrid() in tcglibrary.js built each TCG card
  with a template literal (card.name, card.set.name, card.rarity, the
  image src) and assigned it straight to el.innerHTML. same shape of bug as the showCardPanel fix from 07-01, different source — this data comes from the TCG API fetch, not the URL, but "not user-typed" doesn't mean trusted. anything crossing into the page from outside code i wrote is untrusted for DOM-injection purposes, api included.

- fix: rebuilt the card element with document.createElement for structure,
  .textContent for the set name and rarity, and direct property assignment
  (img.src, img.alt) for the image — none of those paths touch the HTML
  parser, so there's no route left for a string to be interpreted as
  markup, no matter what it contains.

- mental model that made this click: innerHTML re-parses the string through
  the browser's HTML parser (same one that runs on page load) — any <tag>
  in it becomes a real, live element. textContent/createElement/property
  assignment never invoke that parser at all, so the string is always just
  data, never structure. that's the actual rule underneath every XSS fix,
  not something to memorize per-case.

- verified: ran the app, loaded cards with special characters in the name
  (Farfetch'd, Flabébé) to confirm .textContent/.alt round-trip them
  correctly with no escaping needed. full test suite still green.

07-09-26 Query string injection in fetchTCGCards

Found and fixed an unencoded query string injection in fetchTCGCards (api.js), pokemoName came straight from the library search input and was interpolated directly into the request URL - no encoding, no escaping. a search term containing "&" could inject a second query param (e.g. "pikachu&pageSize=1" added a rogue pageSize); a term containg '"' could breakout of the name:"..." expression and inject into TCG's own search query syntax.

Root cause: treated a template literal as "just a string" without accounting for the fact that a URL - and the query language nested inside its q= value - both have their own grammar that untrusted input can collide with. Same category of bug as the innerHTML XSS fix done earlier, different grammar.

Fix: strip embedded quotes from the name before building the inner TCG query expression (no real Pokemon name containes one so nothing legitimate is lost), then build the URLSearchParams instead of manual concatenation, so every value is percent-encoded automatically. two layers, handled explicitly in order - inner query language first, then outer URL encoding.

added a regression test (api.test.js) that asserts an injected "&pageSize=1" ends up percent-encoded inside the q value rather than appearing as a second top-level param. verified it actually catches the regression by reverting the fix locally and confirming the test fails against the old code.

Takeaway: anytime i build a string that another system is going to parse - URL, shell command, SQL, file path - the same question applies: what does _that_ system treat as structural, and have i escaped it. this isnt a one off fix, its a pattern to check for everywhere.

07-10-26 -Cache pattern applied a second time, first CI pipelin

extended the caching pattern from fetchPokemon to fetchSpecies and fetchEvolutionChain in api.js. these were being re-fetched on every single pokemon selection, including revisists to something already looked at in the same session - fetchPokemon had a cache, these two didnt, even though loadEvolutionData() in main.js calls both of them every time.

went with two seperate cache objects (speciesCache, evoChainCache) rather than one shared cached, keyed by url instead of name/id since thats what these functions actually receive. folded the clearing logic for both into the existing clearPokeCache() export instead of adding two more exported resets - tests only care about "clean slate before this test," not about how many cache objects exist under the hood, so one reset function is the right granularity. paid off immediately: the existing beforeEach() in api.test.js already calls clearPokeCache(), so the new caches got reset for free with zero test-setup changes.

wrote cache-hit tests for both (same shape as the fetchPokemon one: call twice with the same url, assert fetch was only called once), plus baseline tests for fetchEvolutionChain, which had zero coverage before today.

also set up the first CI pipeline - .github/workflows/ci.yml, runs on push and PR against main: checkout, setup-node, npm ci, lint, test.
biggest non-obvious piece: the repo root has a leftover package.json with no scripts (pre-Vite-migration relic), and the real app lives in pokemonfinderVite/ - so every setup needs
defaults.run.working-directory: pokemonfinderVite, or CI runs against the wrong package.json entirely. also used npm ci instead of npm install the wrong package.json entirely. also used npm ci instead of npm install here specifically because ci fails loudly if the lockfile is out of sync instead of silently patching around it, which is what you want in an automated pipeline and dont necessarily want on our own machine.

07-12-26 - closed the test coverage gap, set up branch protection, found a real CI bug

wrote state.test.js and render.test.js — the two smallest, most self-contained of the four untested modules CI had been silently blind to (comparemode.js and main.js still remain). state.js needed vi.resetModules() + a dynamic import for the "starts as null" test specifically, same shape of problem as pokeCache before it — module-level state leaks across tests in a file unless something forces a genuinely fresh module instance, not just a fresh call.

render.js turned up two things worth remembering. first, target.src on an img element doesn't give back what you assigned to it — it's a URL-resolving property, same as href, and returns the browser's resolved absolute URL. getAttribute("src") is the one that hands back the raw string, and it's the one the test actually needed. second, renderStats needed a fixture with stats deliberately out of order, not matching order — a pre-sorted fixture can't tell the difference between "correctly re-sorted to match mainStats" and "happened to already be in order," so the test is only honest if the input actively disagrees with the expected output.

turned on branch protection so CI is a gate, not just a signal — took two tries. first pass used classic branch protection rules; a later GH013 push rejection on a feature branch (not main) revealed I'd actually landed on the newer Rulesets system instead, whose target scope defaults broad ("all branches") unless narrowed to just the default branch explicitly. narrowed it, and separately learned required status checks in Rulesets block direct pushes, not just PR merges — different enforcement point than classic protection.

then spent a while chasing a required check ("test") that would never report, "Waiting for status to be reported" forever with no failure to point at. root cause, once found: ci.yml lived at
pokemonfinderVite/.github/workflows/ci.yml — nested inside the project folder from the Vite migration, not at the actual repo root. GitHub Actions only ever discovers workflows at the literal repo-root .github/workflows/, silently, no warning. this repo had zero discoverable workflows this whole time; every green check I'd seen before today was real, but the workflow that produced them was invisible to the branch-protection engine looking for it now. moved ci.yml to the correct root path, deleted the dead nested copy, checks started reporting for a real reason.

also noticed refactor/extract-favorites had turned into a de facto second permanent branch — 20+ merge-PR-then-merge-main-back cycles on one branch across several unrelated chapters of work, instead of one branch per scoped task. left the history as-is (not worth rewriting shared/merged history for a cosmetic fix), but deleting the branch now, going forward: one branch, one task, delete after merge.

takeaway: "the check never fails" and "the check never runs" produce the identical UI (a permanently yellow, non-failing status) — worth remembering that a stuck-pending check is a discovery problem to rule out before it's treated as a configuration problem.

07-14-26 — full test coverage: comparemode.js and main.js, the last two holdouts

comparemode.js already had a suite sitting in the repo (8 tests) from a session that never made it into this log - covering the basics (isCompareMode starting false, announceFirstPick's hint text), the two toggleCompareMode directions (on: hides the single-pokemon controls, adds the .comparing classes, names the current pokemon in the hint if one's showing; off: restores everything and calls onExitCompare with the pokemon that was current), the self-compare guard in displayComparedPokemon, and the actual stat-highlighting behavior - built pokemonStats with the real renderStats helper first so highlightStats() has real .stat-value bars to index into, not a mock standing in for them. recording it here since it closes out real coverage even though it predates today.

main.js was the harder one - it's the one module with zero exports, because everything in it (grabbing DOM elements, wiring click/keydown listeners, restoring state from the URL) used to run the instant the file was imported. that's fine for the browser but a dead end for tests: import and "start the app" were the same action, so there was no way to get a clean instance per test.

fix: wrapped the whole file in one exported initApp(), called once unconditionally at the bottom for production (index.html's <script type="module"> still "just works", zero markup changes needed) - tests get the seam back by building the DOM first, then importing the module fresh per test.

tested it as what it actually is - an orchestrator, not a pure-function module - so main.test.js is black-box/DOM-driven throughout: click buttons, dispatch keydown/popstate events, assert on the DOM/URL/localStorage after. 15 tests: toggleShiny (swap + no-shiny-available error + no-op before any search), getRandomPokemon (Math.random pinned for determinism), searchPokemon (success/404/network-error/empty-query), the evolution chain end-to-end through loadEvolutionData (flat chain's "does not evolve" message, and a branching eevee-style chain asserting all 3 children render), initSuggestionKeyNav's roving tabindex (forward + wrap-around), the ?pokemon= URL restore on load, and both popstate cases (no state hides the card, a pokemon state re-searches).

found a real bug in my own test setup, not the app: main.js's initApp() auto-runs on import (needed for prod), so a test that also called initApp() manually was double-registering every listener - one click on the search button fired searchPokemon() twice, doubling every downstream fetch and rendering the evolution chain twice into the same container. couldn't happen in production (a real page only ever imports main.js once) but it's exactly the kind of bug a later refactor (splitting main.js across two entry bundles, say) could reintroduce for real. fixed by never calling initApp() directly in tests - importing the module already boots it - and restructured the harness around a bootApp() helper so import happens last, after the fetch mock and URL are set, instead of first.

also deduplicated every test's fetch mock into one mockFetchFor(...pokemons) helper, keyed by id for species/evolution-chain urls and by id-or-name for the pokemon lookup itself (getRandomPokemon searches by raw numeric id, everything else searches by name) - without it, every happy-path test needed to hand-roll a species+evolution-chain response just to keep loadEvolutionData's internal try/catch from logging a caught error to stderr on every run.

10 test files, 83 tests total, lint clean. every module in src/ now has a matching test file - the gap CI exposed back on 07-12 is closed.

07-15-26 -CD pipeline: auto-deploy to Cloudflare on merge

added .github/workflows/cd.yml, triggered off workflow_run watching CI rather than its own push trigger - deploy only fires if CI on main actually passed, and checks out github.event.workflow_run.head_sha specifically so it's deploying the exact commit that got tested, not whatever main happens to be by the time the job starts (those two can drift if another push lands in the gap).

two jobs, both gated on the same if: github.event.workflow_run.conclusion == 'success' check: deploy-frontend builds pokemonfinderVite (npm ci, npm run build) and ships dist/ to Cloudflare Pages via wrangler-action; deploy-worker deploys tcg-proxy separately since it's its own wrangler project, not part of the vite build output. first real run (CD #1) came back clean off today's earlier devlog-update merge.

-XSS hardening: sanitize.js + escapeHTML everywhere, plus a repo cleanup

three PRs today, each building on the last:

1. chore: removed the stale root-level package.json and package-lock.json - the pre-Vite-migration relic that CI's working-directory setting on 07-10 had already worked around, now actually deleted instead of just noted as dead weight.

2. added sanitize.js - one function, escapeHTML(str), maps &, <, >, ", ' to their entities and returns "" for null/undefined so a missing name never ends up as the literal string "undefined" in the DOM. wrote sanitize.test.js alongside it: plain text passes through untouched, a <script> tag gets neutralized, an <img onerror=...> payload gets neutralized, ampersands/quotes get escaped correctly, null/undefined both come back as "".

3. wired escapeHTML into every remaining innerHTML template literal that interpolates pokemon-derived strings - render.js (types, abilities, hidden ability, type-effectiveness chips), main.js's evolution-stage builder, favorites.js's card, team.js's slot, and tcglibrary.js's card-modal meta rows. same underlying issue as the card-element XSS fix from earlier this month - anywhere a name/sprite/ability string lands inside a template literal that becomes innerHTML, it's a parse-as-markup risk, not just a display string. this closes out the last handful of spots still doing raw interpolation instead of the createElement/textContent pattern.

mental model worth writing down since it kept coming up today: pokemon names/abilities/types come from the pokeAPI so they're not attacker-controlled right now, but the rule that actually holds up is "any string that ends up inside a template literal assigned to .innerHTML gets escaped, full stop" not "escape it if I can think of how it'd be exploited." the second version is exactly how these gaps get left behind in the first place.
