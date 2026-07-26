//uses same shape as favorites.js/team.js: own state, own DOM, callback injection for the one main.js specific decision wwe cant make ouselves ("what does existing compare mode display")
//the one difference from those two: this module also needs main.js's pure render helpers (rendersprite/renderTypes/renderStats/renderTypeEffectiveness), handed in the same way

import { getCurrentPokemon } from "./state";
import {
  mainStats,
  renderSprite,
  renderStats,
  renderTypes,
  renderTypeEffectiveness,
} from "./render";
import { PokemonDetails } from "./type";
import { requireElement, requireQuery } from "./dom";

//compare mode's elements
const compareBtn = requireElement<HTMLButtonElement>("compare-btn");
const compareHint = requireElement<HTMLElement>("compare-hint");
const compareCard = requireElement<HTMLElement>("compare-card");
const compareImg = requireElement<HTMLImageElement>("compareImg");
const compareName = requireElement<HTMLElement>("compareName");
const compareId = requireElement<HTMLElement>("compareId");
const compareTypes = requireElement<HTMLElement>("compareTypes");
const compareStats = requireElement<HTMLElement>("compareStats");
const compareTypeEffectiveness = requireElement<HTMLElement>(
  "compare-type-effectiveness",
);
//"foreign" elements - they belong conceptually to other features but compare mode  has to hide/show them while its ative
//grabbing our own reference here is the same thing favorites.js/team.js already do for errorDiv -
//its fine for two files to each hold reference to the same elements for two different reasons
const container = requireQuery<HTMLElement>(".container");
const shinyBtn = requireElement<HTMLElement>("shiny-btn");
const favoriteBtn = requireElement<HTMLElement>("favorite-btn");
const evolutionContainer = requireElement<HTMLElement>("evolution-chain");
const teamBtn = requireElement<HTMLElement>("team-btn");
const flavorText = requireElement<HTMLElement>("flavor-text");
const pokemonMeta = requireElement<HTMLElement>("pokemon-meta");
const typeEffectiveness = requireElement<HTMLElement>("type-effectiveness");
const tcgBtn = requireElement<HTMLElement>("tcg-btn");
const pokemonStats = requireElement<HTMLElement>("pokemonStats"); //read-only - main card's stat bars, for index-based comparison

const evolutionSection = requireQuery<HTMLElement>(".evolution-title");

//initially we aren't comparing any pokemon
let compareMode = false;
let comparePokemon: PokemonDetails | null = null;

//set once by initCompareMode() - same circular import workaround as favorites.js/team.js's onSelectPokemon, just with more than one dependency
type RenderSpriteFn = typeof renderSprite;
type RenderTypesFn = typeof renderTypes;
type RenderStatsFn = typeof renderStats;
type RenderTypeEffectivenessFn = typeof renderTypeEffectiveness;

let onExitCompare: (pokemon: PokemonDetails) => void = () => {};
let renderSpriteFn: RenderSpriteFn = () => {};
let renderTypesFn: RenderTypesFn = () => {};
let renderStatsFn: RenderStatsFn = () => {};
let renderTypeEffectivenessFn: RenderTypeEffectivenessFn = () => {};

export function isCompareMode() {
  return compareMode;
}

//called by main.js after the user picks a *first* pokemon while compare mode is already on,
//but before a second one exists to compare against
export function announceFirstPick(pokemonName: string): void {
  compareHint.textContent = `⚔️ Now search a second Pokémon to compare with ${pokemonName}`;
}

//toggling the compare Mode OFF/ON:

export function toggleCompareMode() {
  const currentPokemon = getCurrentPokemon();
  compareMode = !compareMode;

  compareBtn.classList.toggle("active", compareMode);

  const cardsWrapper = requireElement<HTMLElement>("cards-wrapper");

  if (!compareMode) {
    comparePokemon = null;

    compareImg.src = "";
    compareName.textContent = "";
    compareId.textContent = "";
    compareTypes.innerHTML = "";
    compareStats.innerHTML = "";

    compareCard.classList.add("hidden");
    compareHint.classList.add("hidden");
    container.classList.remove("comparing");
    shinyBtn.classList.remove("hidden");
    favoriteBtn.classList.remove("hidden");
    evolutionSection.classList.remove("hidden");
    evolutionContainer.classList.remove("hidden");
    teamBtn.classList.remove("hidden");
    cardsWrapper.classList.remove("comparing");

    flavorText.classList.remove("hidden");
    pokemonMeta.classList.remove("hidden");
    typeEffectiveness.classList.remove("hidden");
    tcgBtn.classList.remove("hidden");
    compareTypeEffectiveness.innerHTML = "";

    if (currentPokemon) onExitCompare(currentPokemon);
  } else {
    shinyBtn.classList.add("hidden");
    favoriteBtn.classList.add("hidden");
    evolutionSection.classList.add("hidden");
    evolutionContainer.classList.add("hidden");
    container.classList.add("comparing");
    cardsWrapper.classList.add("comparing");
    compareHint.classList.remove("hidden");
    teamBtn.classList.add("hidden");
    compareHint.textContent = currentPokemon
      ? `⚔️ Now search a second Pokémon  to compare with ${currentPokemon.name}`
      : "⚔️ Search a Pokémon to start comparing";
    flavorText.classList.add("hidden");
    pokemonMeta.classList.add("hidden");
    tcgBtn.classList.add("hidden");
  }
}

//now to display the compared pokemon

export function displayComparedPokemon(pokemon: PokemonDetails): void {
  const currentPokemon = getCurrentPokemon();
  //same element main.js uses, grabbed fresh here rather than threaded through as another dependency
  const errorDiv = requireElement<HTMLElement>("error");

  errorDiv.classList.add("hidden");

  if (!currentPokemon || pokemon.id === currentPokemon.id) {
    errorDiv.textContent = "Choose a different Pokémon to compare.";
    errorDiv.classList.remove("hidden");
    return;
  }

  comparePokemon = pokemon;

  renderSpriteFn(pokemon, compareImg);
  compareName.textContent = pokemon.name;
  compareId.textContent = `#${String(pokemon.id).padStart(3, "0")}`;
  renderTypesFn(pokemon, compareTypes);
  renderStatsFn(pokemon, compareStats);

  compareCard.classList.remove("hidden");

  highlightStats();

  renderTypeEffectivenessFn(pokemon, compareTypeEffectiveness);

  compareHint.textContent = `${currentPokemon.name} vs ${comparePokemon.name}`;
}

//we are going to loop through the stats and compare them after both pokemon are loaded

function highlightStats(): void {
  const currentPokemon = getCurrentPokemon();
  if (!currentPokemon || !comparePokemon) return;
  const compareTarget = comparePokemon; //frozen into a const so the closure below can trust the narrowing

  mainStats.forEach((statName, index) => {
    const p1Stat = currentPokemon.stats.find((s) => s.stat.name === statName);
    const p2Stat = compareTarget.stats.find((s) => s.stat.name === statName);

    if (!p1Stat || !p2Stat) return;

    const p1Bar = pokemonStats.querySelectorAll(".stat-bar-fill")[index];
    const p2Bar = compareStats.querySelectorAll(".stat-bar-fill")[index];
    const p1StatEl = pokemonStats.querySelectorAll(".stat-value")[index];
    const p2StatEl = compareStats.querySelectorAll(".stat-value")[index];

    if (p1Stat.base_stat === p2Stat.base_stat) {
      if (p1StatEl) p1StatEl.className = "stat-value";
      if (p2StatEl) p2StatEl.className = "stat-value";
      if (p1Bar) p1Bar.className = "stat-bar-fill";
      if (p2Bar) p2Bar.className = "stat-bar-fill";
      return;
    }

    const p1Wins = p1Stat.base_stat > p2Stat.base_stat;

    //updating main card stats

    if (p1StatEl)
      p1StatEl.className = `stat-value ${p1Wins ? "stat-win" : "stat-lose"}`;
    if (p2StatEl)
      p2StatEl.className = `stat-value ${!p1Wins ? "stat-win" : "stat-lose"}`;

    //same guard as the "stats are equal" branch above -
    //p1bar/p2bar come from  an index lookup that assumes the DOM always had exactly mainstats.length bars in the same order as mainStats itself.
    //thats true today but nothing enforces it, so we dont trust it blindly here
    if (p1Bar) p1Bar.classList.toggle("win", p1Wins);
    if (p2Bar) p2Bar.classList.toggle("lose", !p1Wins);
    if (p2Bar) p2Bar.classList.toggle("win", !p1Wins);
    if (p1Bar) p1Bar.classList.toggle("lose", p1Wins);
  });
}

//main.js calls this once on startup, handing us the pieces we cant own ourselves:
//"what exiting compare mode" redisplays, and the rendering helpers we need to fill our own card with
interface CompareModeDeps {
  onExitCompare: (pokemon: PokemonDetails) => void;
  renderSprite: RenderSpriteFn;
  renderTypes: RenderTypesFn;
  renderStats: RenderStatsFn;
  renderTypeEffectiveness: RenderTypeEffectivenessFn;
}

export function initCompareMode({
  onExitCompare: exit,
  renderSprite,
  renderTypes,
  renderStats,
  renderTypeEffectiveness,
}: CompareModeDeps): void {
  onExitCompare = exit;
  renderSpriteFn = renderSprite;
  renderTypesFn = renderTypes;
  renderStatsFn = renderStats;
  renderTypeEffectivenessFn = renderTypeEffectiveness;

  compareBtn.addEventListener("click", toggleCompareMode);
}
