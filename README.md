# Pokémon Finder

A Pokédex-style web app for looking up any of the 1,025 Pokémon —
sprites, stats, type matchups, evolution chains, and their official
TCG cards — built with vanilla JS, Vite, and a Cloudflare Worker proxy.

## Features

- Search by name or ID across all 1,025 Pokémon
- Random Pokémon button + shiny sprite toggle
- Full stat bars and an 18×18 type-effectiveness chart (weaknesses,
  resistances, immunities)
- Flavor text, height/weight, and abilities
- Evolution chains, including branching lines like Eevee's 8 evolutions
- Side-by-side compare mode with stat highlighting
- Favorites drawer and a 6-slot team builder (persisted via localStorage)
- Pokémon TCG card library — search, sort by newest/oldest/rarity, and
  view full card detail
- Shareable, deep-linkable URLs
- Keyboard-navigable search suggestions

## Tech stack

- Vanilla JavaScript (ES Modules) — no framework
- Vite for dev/build tooling
- [PokéAPI](https://pokeapi.co/) for Pokémon data
- [Pokémon TCG API](https://dev.pokemontcg.io/) for card data, proxied
  through a Cloudflare Worker so the API key never reaches the client
- localStorage for favorites, team, and search history

## Setup

\`\`\`bash
git clone <https://github.com/elpsykongroo14/pokemon-finder>
cd pokemon-finder
npm install
npm run dev\`\`\`

You'll need your own Cloudflare Worker deployed as a proxy for the TCG
API key — see `/worker` for the source — and point `TCG_PROXY` in
`src/api.js` at your deployed Worker URL.

## What I learned building this

This has been my main project for leveling up as a self-taught dev —
ES Modules, API proxying, recursion over tree-shaped data, and a lot of
refactoring discipline. Full build log: [DEVLOG.md](./DEVLOG.md)

## Roadmap

- [ ] CSS component system for buttons
- [ ] Rebuild in React
