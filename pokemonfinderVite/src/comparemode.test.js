import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

//same shape of fixture helper as team.test.js/favorites.test.js,
//but comparemode.js needs a full `stats` array too, since highlightStats()
//reads currentPokemon.stats / comparePokemon.stats directly
function makePokemon(name, id, statOverrides = {}) {
  const baseStats = {
    hp: 45,
    attack: 49,
    defense: 49,
    speed: 45,
    "special-attack": 65,
    "special-defense": 65,
    ...statOverrides,
  };

  return {
    name,
    id,
    sprites: { front_default: `${name}.png` },
    stats: Object.entries(baseStats).map(([statName, base_stat]) => ({
      stat: { name: statName },
      base_stat,
    })),
  };
}

describe("comparemode.js", () => {
  let compareMode; //freshly imported comparemode.js module
  let state; //freshly imported state.js module
  let render; //freshly imported render.js module (real renderStats etc.)

  beforeEach(async () => {
    document.body.innerHTML = `
      <div class="container">
        <div id="cards-wrapper">
          <div id="pokemonCard">
            <div class="stats" id="pokemonStats"></div>
          </div>
          <div id="compare-card" class="hidden">
            <img id="compareImg" />
            <h2 id="compareName"></h2>
            <div id="compareId"></div>
            <div id="compareTypes"></div>
            <div class="stats" id="compareStats"></div>
            <div id="compare-type-effectiveness"></div>
          </div>
        </div>
 
        <button id="compare-btn"></button>
        <div id="compare-hint" class="hidden"></div>
 
        <button id="shiny-btn"></button>
        <button id="favorite-btn"></button>
        <h3 class="evolution-title"></h3>
        <div id="evolution-chain"></div>
        <button id="team-btn"></button>
        <p id="flavor-text"></p>
        <div id="pokemon-meta"></div>
        <div id="type-effectiveness"></div>
        <button id="tcg-btn"></button>
 
        <div id="error" class="hidden"></div>
      </div>
    `;

    vi.resetModules();
    state = await import("./state.js");
    render = await import("./render.js");
    compareMode = await import("./comparemode.js");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts with compare mode off", () => {
    //Assert
    expect(compareMode.isCompareMode()).toBe(false);
  });

  it("announceFirstPick writes a hint naming the pokemon just picked", () => {
    //Act
    compareMode.announceFirstPick("charmander");

    //Assert
    expect(document.getElementById("compare-hint").textContent).toBe(
      "⚔️ Now search a second Pokémon to compare with charmander",
    );
  });

  it("toggling compare mode on hides the single-pokemon controls and shows a generic hint", () => {
    //Arrange - no current pokemon set, this is the "cold start" case

    //Act
    compareMode.toggleCompareMode();

    //Assert
    expect(compareMode.isCompareMode()).toBe(true);
    expect(
      document.getElementById("compare-btn").classList.contains("active"),
    ).toBe(true);

    const hint = document.getElementById("compare-hint");
    expect(hint.classList.contains("hidden")).toBe(false);
    expect(hint.textContent).toBe("⚔️ Search a Pokémon to start comparing");

    //the single-pokemon-only controls all get tucked away
    expect(
      document.getElementById("shiny-btn").classList.contains("hidden"),
    ).toBe(true);
    expect(
      document.getElementById("favorite-btn").classList.contains("hidden"),
    ).toBe(true);
    expect(
      document.querySelector(".evolution-title").classList.contains("hidden"),
    ).toBe(true);
    expect(
      document.getElementById("evolution-chain").classList.contains("hidden"),
    ).toBe(true);
    expect(
      document.getElementById("team-btn").classList.contains("hidden"),
    ).toBe(true);
    expect(
      document.getElementById("flavor-text").classList.contains("hidden"),
    ).toBe(true);
    expect(
      document.getElementById("pokemon-meta").classList.contains("hidden"),
    ).toBe(true);
    expect(
      document.getElementById("tcg-btn").classList.contains("hidden"),
    ).toBe(true);

    expect(
      document.querySelector(".container").classList.contains("comparing"),
    ).toBe(true);
    expect(
      document.getElementById("cards-wrapper").classList.contains("comparing"),
    ).toBe(true);
  });

  it("toggling compare mode on with a pokemon already showing names it in the hint", () => {
    //Arrange
    state.setCurrentPokemon(makePokemon("bulbasaur", 1));

    //Act
    compareMode.toggleCompareMode();

    //Assert - note: this is a *different* string than announceFirstPick's,
    //double space before "to" and all - that's what the source actually writes
    expect(document.getElementById("compare-hint").textContent).toBe(
      "⚔️ Now search a second Pokémon  to compare with bulbasaur",
    );
  });

  it("toggling compare mode back off restores everything and hands the current pokemon back to onExitCompare", () => {
    //Arrange
    const onExitCompareSpy = vi.fn();
    compareMode.initCompareMode({
      onExitCompare: onExitCompareSpy,
      renderSprite: vi.fn(),
      renderTypes: vi.fn(),
      renderStats: vi.fn(),
      renderTypeEffectiveness: vi.fn(),
    });

    const bulbasaur = makePokemon("bulbasaur", 1);
    state.setCurrentPokemon(bulbasaur);

    compareMode.toggleCompareMode(); //on
    document.getElementById("compareName").textContent = "leftover"; //pretend a compare was mid-flight

    //Act
    compareMode.toggleCompareMode(); //off

    //Assert
    expect(compareMode.isCompareMode()).toBe(false);
    expect(
      document.getElementById("compare-btn").classList.contains("active"),
    ).toBe(false);
    expect(
      document.getElementById("compare-card").classList.contains("hidden"),
    ).toBe(true);
    expect(
      document.getElementById("compare-hint").classList.contains("hidden"),
    ).toBe(true);
    expect(document.getElementById("compareName").textContent).toBe("");
    expect(document.getElementById("compareId").textContent).toBe("");
    expect(document.getElementById("compareTypes").innerHTML).toBe("");
    expect(document.getElementById("compareStats").innerHTML).toBe("");
    expect(
      document.getElementById("compare-type-effectiveness").innerHTML,
    ).toBe("");

    //everything that got hidden on the way in comes back
    expect(
      document.getElementById("shiny-btn").classList.contains("hidden"),
    ).toBe(false);
    expect(
      document.getElementById("favorite-btn").classList.contains("hidden"),
    ).toBe(false);
    expect(
      document.getElementById("team-btn").classList.contains("hidden"),
    ).toBe(false);
    expect(
      document.querySelector(".container").classList.contains("comparing"),
    ).toBe(false);
    expect(
      document.getElementById("cards-wrapper").classList.contains("comparing"),
    ).toBe(false);

    //and main.js gets told "redisplay this one, were back to single view"
    expect(onExitCompareSpy).toHaveBeenCalledWith(bulbasaur);
    expect(onExitCompareSpy).toHaveBeenCalledTimes(1);
  });

  it("clicking the compare button (once wired via initCompareMode) toggles compare mode", () => {
    //Arrange
    compareMode.initCompareMode({
      onExitCompare: vi.fn(),
      renderSprite: vi.fn(),
      renderTypes: vi.fn(),
      renderStats: vi.fn(),
      renderTypeEffectiveness: vi.fn(),
    });

    //Act
    document.getElementById("compare-btn").click();

    //Assert
    expect(compareMode.isCompareMode()).toBe(true);
  });

  it("displayComparedPokemon refuses to compare a pokemon against itself", () => {
    //Arrange
    const bulbasaur = makePokemon("bulbasaur", 1);
    state.setCurrentPokemon(bulbasaur);

    //Act
    compareMode.displayComparedPokemon(makePokemon("bulbasaur", 1));

    //Assert
    const errorDiv = document.getElementById("error");
    expect(errorDiv.textContent).toBe("Choose a different Pokémon to compare.");
    expect(errorDiv.classList.contains("hidden")).toBe(false);

    //we bailed before ever showing the compare card
    expect(
      document.getElementById("compare-card").classList.contains("hidden"),
    ).toBe(true);
  });

  it("displayComparedPokemon fills in the compare card and highlights the winning stats on both cards", () => {
    //Arrange: build the *main* card's stat bars the same way main.js would
    //using the real renderStats helper - highlightStats() reaches into these bars by index,
    //so they have to actually exist for this test to mean anything
    const bulbasaur = makePokemon("bulbasaur", 1, { hp: 45, speed: 45 });
    const charmander = makePokemon("charmander", 4, { hp: 39, speed: 65 });

    render.renderStats(bulbasaur, document.getElementById("pokemonStats"));
    state.setCurrentPokemon(bulbasaur);

    compareMode.initCompareMode({
      onExitCompare: vi.fn(),
      renderSprite: render.renderSprite,
      renderTypes: (pokemon, target) => {
        target.innerHTML = `<span>${pokemon.name}</span>`;
      },
      renderStats: render.renderStats,
      renderTypeEffectiveness: vi.fn(),
    });

    //Act
    compareMode.displayComparedPokemon(charmander);

    //Assert
    expect(document.getElementById("compareName").textContent).toBe(
      "charmander",
    );
    expect(document.getElementById("compareId").textContent).toBe("#004");
    expect(
      document.getElementById("compare-card").classList.contains("hidden"),
    ).toBe(false);
    expect(document.getElementById("compare-hint").textContent).toBe(
      "bulbasaur vs charmander",
    );

    //Assert: highlightStats compared bulbasaur (hp 45) vs charmander (hp 39)
    //by index - hp is mainStats[0], so index 0 on both cards
    const mainValues = document
      .getElementById("pokemonStats")
      .querySelectorAll(".stat-value");
    const compareValues = document
      .getElementById("compareStats")
      .querySelectorAll(".stat-value");

    expect(mainValues[0].className).toBe("stat-value stat-win"); //bulbasaur's 45 hp beats charmander's 39
    expect(compareValues[0].className).toBe("stat-value stat-lose");

    //speed: bulbasaur's 45 vs charmander's 65, charmander wins
    expect(mainValues[3].className).toBe("stat-value stat-lose");
    expect(compareValues[3].className).toBe("stat-value stat-win");
  });

  it("does not throw when the compare card has fewer stat bars than mainStats (defensive guard regression test)", () => {
    //Arrange: main card renders normally (all 6 stat bars exist)
    const bulbasaur = makePokemon("bulbasaur", 1, { hp: 45, speed: 45 });
    const charmander = makePokemon("charmander", 4, { hp: 39, speed: 65 });

    render.renderStats(bulbasaur, document.getElementById("pokemonStats"));
    state.setCurrentPokemon(bulbasaur);

    //but the compare card's renderStats only renders the first 5 stats -
    //simulating the exact situation highlighStats() has to survive:
    //an index (5, "special-defense") has no matching DOM element
    compareMode.initCompareMode({
      onExitCompare: vi.fn(),
      renderSprite: render.renderSprite,
      renderTypes: (pokemon, target) => {
        target.innerHTML = `<span>${pokemon.name}</span>`;
      },
      renderStats: (pokemon, target) => {
        render.renderStats(pokemon, target);
        //drop the last stat bar to simulate a mismatch with mainStats
        const bars = target.querySelectorAll(".stat");
        bars[bars.length - 1].remove();
      },
      renderTypeEffectiveness: vi.fn(),
    });

    //Act + Assert: this must not throw, even though comparePokemon's compareStats is missing the
    //6th bar that highlightStats expects at mainStats index 5
    expect(() => {
      compareMode.displayComparedPokemon(charmander);
    }).not.toThrow();

    //the stats that do have matching bars on both side still highlight normally -
    //the missing one just gets silently skipped, not crashed past
    const mainValues = document
      .getElementById("pokemonStats")
      .querySelectorAll(".stat-value");
    expect(mainValues[0].className).toBe("stat-value stat-win"); //hp still highlights
  });
});
