import { describe, it, expect, beforeEach, vi } from "vitest";

//main.js is the wiring/orchestration layer - it exports nothing except
//initApp(). everything else it does (searching, toggling shiny sprites,
//keyboard nav, restoring state from a URL) is only observable through the
//DOM, exactly like a real user would trigger it: click a button, type into
//an input, dispatch a popstate event, then check what changed.
//
//that's why this file looks different from state.test.js or api.test.js.
//there we called an exported function and asserted on its return value.
//here we simulate a user action and assert on the DOM/URL/localStorage
//afterwards. same discipline, different shape - this is an integration
//test of the whole app, not a unit test of one function.

//this mirrors index.html closely enough that every id main.js and its
//dependencies (favorites.js, team.js, tcglibrary.js, comparemode.js) look
//up with getElementById actually exists before we import the module.
function buildDOM() {
  document.body.innerHTML = `
    <button id="favorites-toggle"></button>
    <button id="library-btn"></button>
    <div id="overlay" class="hidden"></div>
    <div id="favorites-drawer">
      <button id="close-drawer"></button>
      <div id="favorites-container"></div>
    </div>

    <div class="container">
      <input id="searchInput" />
      <button id="searchBtn"></button>
      <button id="randomBtn"></button>

      <div class="suggestions">
        <button class="suggestion" data-name="charizard">Charizard</button>
        <button class="suggestion" data-name="mewtwo">Mewtwo</button>
      </div>

      <div id="cards-wrapper">
        <div id="pokemonCard" class="hidden">
          <img id="pokemonImg" />
          <div id="spinner" class="hidden"></div>
          <h2 id="pokemonName"></h2>
          <div id="pokemonId"></div>
          <div id="pokemonTypes"></div>
          <div id="pokemon-meta"></div>
          <p id="flavor-text"></p>
          <button id="shiny-btn">Toggle Shiny</button>
          <div id="pokemonStats"></div>
          <div id="evolution-chain"></div>
          <div id="type-effectiveness"></div>
          <button id="favorite-btn"></button>
          <button id="team-btn"></button>
          <button id="tcg-btn"></button>
        </div>

        <div id="compare-card" class="hidden">
          <img id="compareImg" />
          <h2 id="compareName"></h2>
          <div id="compareId"></div>
          <div id="compareTypes"></div>
          <div id="compareStats"></div>
          <div id="compare-type-effectiveness"></div>
        </div>
      </div>

      <button id="compare-btn"></button>
      <div id="compare-hint" class="hidden"></div>
      <div id="search-history"></div>
      <div id="error" class="hidden"></div>
    </div>

    <div id="team-strip">
      <div id="team-slots"></div>
    </div>

    <div id="library-view" class="hidden">
      <button id="library-back"></button>
      <input id="library-search" />
      <button id="library-search-btn"></button>
      <div id="card-panel" class="hidden">
        <button id="card-panel-back"></button>
        <h3 id="card-panel-title"></h3>
        <select id="sort-select">
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="rarity">Rarity</option>
        </select>
        <div id="card-grid"></div>
      </div>
    </div>
  `;
}

function fakeResponse(ok, body) {
  return { ok, status: ok ? 200 : 404, json: async () => body };
}

//only the fields main.js / render.js actually read need to be present
function makePokemon(name, id, overrides = {}) {
  return {
    name,
    id,
    species: { url: `https://pokeapi.co/api/v2/pokemon-species/${id}/` },
    sprites: {
      front_default: `${name}.png`,
      front_shiny: overrides.noShiny ? null : `${name}-shiny.png`,
      other: { "official-artwork": { front_default: `${name}-art.png` } },
    },
    types: [{ type: { name: "normal" } }],
    height: 5,
    weight: 60,
    abilities: [{ ability: { name: "run-away" }, is_hidden: false }],
    stats: [
      { stat: { name: "hp" }, base_stat: 50 },
      { stat: { name: "attack" }, base_stat: 50 },
      { stat: { name: "defense" }, base_stat: 50 },
      { stat: { name: "special-attack" }, base_stat: 50 },
      { stat: { name: "special-defense" }, base_stat: 50 },
      { stat: { name: "speed" }, base_stat: 50 },
    ],
    ...overrides,
  };
}

//most tests only care about the main pokemon payload, but displayPokemon()
//always kicks off loadEvolutionData() as a side effect (see main.js) - it
//fetches species data and an evolution chain for whatever was searched,
//no matter what the test is actually checking. if a test's fetch mock
//doesn't cover those two extra endpoints, loadEvolutionData's own
//try/catch swallows the resulting error (that's correct, defensive
//production behavior) but it still logs to the console on every test run.
//this helper builds a fetch mock that satisfies all three calls - the
//pokemon itself, its species, and a flat (non-branching) evolution chain -
//so tests that aren't specifically about evolution rendering stay quiet.
function mockFetchFor(...pokemons) {
  return vi.fn((url) => {
    for (const p of pokemons) {
      //each pokemon gets its own species/evolution-chain url, keyed by id,
      //so this works whether the test searches for one pokemon or several
      if (url.includes(`/pokemon-species/${p.id}`)) {
        return Promise.resolve(
          fakeResponse(true, makeSpecies(`https://pokeapi.co/evo/${p.id}/`)),
        );
      }
      if (url.includes(`/evo/${p.id}`)) {
        return Promise.resolve(fakeResponse(true, flatChain(p.name)));
      }
      //a search can be by name (typed in the box) or by id (getRandomPokemon
      //puts a raw number in the search box) - match either
      if (
        url.endsWith(`/pokemon/${p.name}`) ||
        url.endsWith(`/pokemon/${p.id}`)
      ) {
        return Promise.resolve(fakeResponse(true, p));
      }
    }
    return Promise.resolve(fakeResponse(false, {}));
  });
}

function makeSpecies(evoUrl) {
  return {
    flavor_text_entries: [
      { language: { name: "en" }, flavor_text: "A calm pokemon." },
    ],
    evolution_chain: { url: evoUrl },
  };
}

//a non-evolving chain: just the root, no evolves_to
function flatChain(name) {
  return { chain: { species: { name }, evolves_to: [] } };
}

//a branching chain like eevee: one root, two children
function branchingChain(rootName, childNames) {
  return {
    chain: {
      species: { name: rootName },
      evolves_to: childNames.map((n) => ({
        species: { name: n },
        evolves_to: [],
      })),
    },
  };
}

describe("main.js", () => {
  //every test needs: a clean DOM built BEFORE import (because favorites.js,
  //team.js, tcglibrary.js and comparemode.js all grab elements with
  //getElementById the moment they're imported), a clean localStorage
  //(favorites/team/history all live there), a clean URL (pushState from a
  //previous test would otherwise leak into the next one), and a fresh
  //module graph so none of that state survives between tests.
  //
  //this is deliberately NOT importing main.js yet. main.js calls
  //initApp() itself at the bottom of the file, the instant it's
  //imported - that's what makes index.html's
  //<script type="module" src="/src/main.js"> work with zero extra
  //wiring. importing the module already boots the app.
  //
  //that has a consequence for tests: whatever the fetch mock is at
  //import time is the fetch mock the app boots with. if a test sets up
  //global.fetch AFTER importing, it's too late for anything main.js
  //does during startup (like the ?pokemon= URL restoration below).
  //so instead of importing here, each test calls bootApp() itself,
  //after its fetch mock and URL are ready - import becomes the last
  //setup step, not the first one.
  beforeEach(() => {
    buildDOM();
    localStorage.clear();
    window.history.replaceState(null, "", "/");
    vi.resetModules();
  });

  //importing main.js runs initApp() as a side effect (see above) - so
  //"booting the app" in a test just means importing it fresh. we never
  //call initApp() ourselves; doing that would register every event
  //listener a second time on top of the ones import-time already added.
  async function bootApp() {
    await import("./main.js");
  }

  describe("toggleShiny", () => {
    it("swaps the sprite and button label when a shiny sprite exists", async () => {
      global.fetch = mockFetchFor(makePokemon("pikachu", 25));
      await bootApp();

      document.getElementById("searchInput").value = "pikachu";
      document.getElementById("searchBtn").click();
      await vi.waitFor(() =>
        expect(document.getElementById("pokemonName").textContent).toBe(
          "pikachu",
        ),
      );

      document.getElementById("shiny-btn").click();

      expect(document.getElementById("pokemonImg").src).toContain(
        "pikachu-shiny.png",
      );
      expect(document.getElementById("shiny-btn").textContent).toBe("✨ Shiny");
    });

    it("shows an error and leaves the label alone when no shiny sprite exists", async () => {
      global.fetch = mockFetchFor(
        makePokemon("voltorb", 100, { noShiny: true }),
      );
      await bootApp();

      document.getElementById("searchInput").value = "voltorb";
      document.getElementById("searchBtn").click();
      await vi.waitFor(() =>
        expect(document.getElementById("pokemonName").textContent).toBe(
          "voltorb",
        ),
      );

      document.getElementById("shiny-btn").click();

      expect(document.getElementById("error").textContent).toBe(
        "No shiny sprite available for this Pokémon.",
      );
      expect(document.getElementById("shiny-btn").textContent).toBe(
        "Toggle Shiny",
      );
    });

    it("does nothing if clicked before any pokemon has been searched", async () => {
      await bootApp();

      document.getElementById("shiny-btn").click();

      expect(
        document.getElementById("error").classList.contains("hidden"),
      ).toBe(true);
    });
  });

  describe("getRandomPokemon", () => {
    it("fills the search box with a randomly-chosen id and searches for it", async () => {
      //Math.random() * 1025, floored, +1 - pinning it to 0.5 makes the
      //result deterministic: floor(0.5 * 1025) + 1 = 513
      vi.spyOn(Math, "random").mockReturnValue(0.5);

      global.fetch = mockFetchFor(makePokemon("deoxys", 513));
      await bootApp();

      document.getElementById("randomBtn").click();

      expect(document.getElementById("searchInput").value).toBe("513");
      await vi.waitFor(() =>
        expect(document.getElementById("pokemonName").textContent).toBe(
          "deoxys",
        ),
      );
    });
  });

  describe("searchPokemon", () => {
    it("renders the card and records the query in search history on success", async () => {
      global.fetch = mockFetchFor(makePokemon("bulbasaur", 1));
      await bootApp();

      document.getElementById("searchInput").value = "bulbasaur";
      document.getElementById("searchBtn").click();

      await vi.waitFor(() =>
        expect(document.getElementById("pokemonName").textContent).toBe(
          "bulbasaur",
        ),
      );

      expect(
        document.getElementById("pokemonCard").classList.contains("hidden"),
      ).toBe(false);
      expect(JSON.parse(localStorage.getItem("pokemon_history"))).toEqual([
        "bulbasaur",
      ]);
      expect(window.location.search).toBe("?pokemon=bulbasaur");
    });

    it("shows a not-found message on a 404 and keeps the card hidden", async () => {
      global.fetch = vi.fn(() => Promise.resolve(fakeResponse(false, {})));
      await bootApp();

      document.getElementById("searchInput").value = "notapokemon";
      document.getElementById("searchBtn").click();

      await vi.waitFor(() =>
        expect(
          document.getElementById("error").classList.contains("hidden"),
        ).toBe(false),
      );

      expect(document.getElementById("error").textContent).toBe(
        "Pokémon not found. Try another name or ID.",
      );
      expect(
        document.getElementById("pokemonCard").classList.contains("hidden"),
      ).toBe(true);
    });

    it("shows a network-error message when fetch itself throws", async () => {
      //fetch() rejecting with a TypeError is exactly what happens in a
      //real browser on a dropped connection or DNS failure - this is the
      //same distinction api.js's getJSON() relies on
      global.fetch = vi.fn(() =>
        Promise.reject(new TypeError("Failed to fetch")),
      );
      await bootApp();

      document.getElementById("searchInput").value = "pikachu";
      document.getElementById("searchBtn").click();

      await vi.waitFor(() =>
        expect(document.getElementById("error").textContent).toBe(
          "Network error. Check your connection.",
        ),
      );
    });

    it("does nothing on an empty query", async () => {
      global.fetch = vi.fn();
      await bootApp();

      document.getElementById("searchInput").value = "   ";
      document.getElementById("searchBtn").click();

      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe("evolution chain rendering", () => {
    it("shows the no-evolution message for a pokemon with no evolves_to", async () => {
      const pokemon = makePokemon("tauros", 128);
      global.fetch = vi.fn((url) => {
        if (url.includes("/pokemon/tauros")) {
          return Promise.resolve(fakeResponse(true, pokemon));
        }
        if (url.includes("pokemon-species")) {
          return Promise.resolve(
            fakeResponse(true, makeSpecies("https://pokeapi.co/evo/1/")),
          );
        }
        return Promise.resolve(fakeResponse(true, flatChain("tauros")));
      });
      await bootApp();

      document.getElementById("searchInput").value = "tauros";
      document.getElementById("searchBtn").click();

      await vi.waitFor(() =>
        expect(
          document.getElementById("evolution-chain").textContent,
        ).toContain("does not evolve"),
      );
    });

    it("renders a branch for every child in a branching chain (eevee-style)", async () => {
      const pokemon = makePokemon("eevee", 133);
      global.fetch = vi.fn((url) => {
        if (url.includes("/pokemon/eevee")) {
          return Promise.resolve(fakeResponse(true, pokemon));
        }
        if (url.includes("pokemon-species")) {
          return Promise.resolve(
            fakeResponse(true, makeSpecies("https://pokeapi.co/evo/2/")),
          );
        }
        if (url.includes("/evo/2")) {
          return Promise.resolve(
            fakeResponse(
              true,
              branchingChain("eevee", ["vaporeon", "jolteon", "flareon"]),
            ),
          );
        }
        //buildStageElement calls fetchPokemon(name) for every node in the
        //tree, including the branches - each needs its own sprite lookup
        const requested = url.split("/pokemon/")[1];
        return Promise.resolve(fakeResponse(true, makePokemon(requested, 134)));
      });
      await bootApp();

      document.getElementById("searchInput").value = "eevee";
      document.getElementById("searchBtn").click();

      await vi.waitFor(() => {
        const stages = document.querySelectorAll(".evolution-stage");
        //eevee itself plus 3 evolutions = 4 stage elements
        expect(stages.length).toBe(4);
      });

      const names = Array.from(
        document.querySelectorAll(".evolution-stage span"),
      ).map((el) => el.textContent);
      expect(names).toEqual(["eevee", "vaporeon", "jolteon", "flareon"]);
    });
  });

  describe("initSuggestionKeyNav (static suggestion chips)", () => {
    it("moves the roving tabindex forward on ArrowRight and moves focus", async () => {
      await bootApp();

      const chips = document.querySelectorAll(".suggestions .suggestion");
      expect(chips[0].getAttribute("tabindex")).toBe("0");
      expect(chips[1].getAttribute("tabindex")).toBe("-1");

      chips[0].dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
      );

      expect(chips[0].getAttribute("tabindex")).toBe("-1");
      expect(chips[1].getAttribute("tabindex")).toBe("0");
      expect(document.activeElement).toBe(chips[1]);
    });

    it("wraps from the last chip back to the first on ArrowRight", async () => {
      await bootApp();

      const chips = document.querySelectorAll(".suggestions .suggestion");
      const last = chips[chips.length - 1];
      last.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
      );

      expect(chips[0].getAttribute("tabindex")).toBe("0");
    });
  });

  describe("restoring state from the URL on load", () => {
    it("searches automatically when the page loads with a ?pokemon= param", async () => {
      window.history.replaceState(null, "", "/?pokemon=snorlax");
      global.fetch = mockFetchFor(makePokemon("snorlax", 143));

      await bootApp();

      await vi.waitFor(() =>
        expect(document.getElementById("pokemonName").textContent).toBe(
          "snorlax",
        ),
      );
    });
  });

  describe("popstate (back/forward navigation)", () => {
    it("hides the pokemon card when popstate fires with no state", async () => {
      global.fetch = mockFetchFor(makePokemon("gengar", 94));
      await bootApp();

      document.getElementById("searchInput").value = "gengar";
      document.getElementById("searchBtn").click();
      await vi.waitFor(() =>
        expect(
          document.getElementById("pokemonCard").classList.contains("hidden"),
        ).toBe(false),
      );

      window.dispatchEvent(new PopStateEvent("popstate", { state: null }));

      expect(
        document.getElementById("pokemonCard").classList.contains("hidden"),
      ).toBe(true);
      expect(document.title).toBe("Pokémon Finder");
    });

    it("re-runs the search when popstate fires with a pokemon state", async () => {
      global.fetch = mockFetchFor(
        makePokemon("gengar", 94),
        makePokemon("mewtwo", 150),
      );
      await bootApp();

      document.getElementById("searchInput").value = "gengar";
      document.getElementById("searchBtn").click();
      await vi.waitFor(() =>
        expect(document.getElementById("pokemonName").textContent).toBe(
          "gengar",
        ),
      );

      window.dispatchEvent(
        new PopStateEvent("popstate", { state: { pokemon: "mewtwo" } }),
      );

      await vi.waitFor(() =>
        expect(document.getElementById("pokemonName").textContent).toBe(
          "mewtwo",
        ),
      );
    });
  });
});
