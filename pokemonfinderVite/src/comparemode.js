//uses same shape as favorites.js/team.js: own state, own DOM, callback injection for the one main.js specific decision wwe cant make ouselves ("what does existing compare mode display")
//the one difference from those two: this module also needs main.js's pure render helpers (rendersprite/renderTypes/renderStats/renderTypeEffectiveness), handed in the same way

import { getCurrentPokemon } from "./state";
import { mainStats } from "./render.js";

//compare mode's elements
const compareBtn = document.getElementById("compare-btn");
const compareHint = document.getElementById("compare-hint");
const compareCard = document.getElementById("compare-card");
const compareImg = document.getElementById("compareImg");
const compareName = document.getElementById("compareName");
const compareId = document.getElementById("compareId");
const compareTypes = document.getElementById("compareTypes");
const compareStats = document.getElementById("compareStats");
const compareTypeEffectiveness = document.getElementById(
  "compare-type-effectiveness",
);

//"foreign" elements - they belong conceptually to other features but compare mode  has to hide/show them while its ative
//grabbing our own reference here is the same thing favorites.js/team.js already do for errorDiv -
//its fine for two files to each hold reference to the same elements for two different reasons
const shinyBtn = document.getElementById("shiny-btn");
const favoriteBtn = document.getElementById("favorite-btn");
const evolutionSection = document.querySelector(".evolution-title");
const evolutionContainer = document.getElementById("evolution-chain");
const teamBtn = document.getElementById("team-btn");
const flavorText = document.getElementById("flavor-text");
const pokemonMeta = document.getElementById("pokemon-meta");
const typeEffectiveness = document.getElementById("type-effectiveness");
const tcgBtn = document.getElementById("tcg-btn");
const container = document.querySelector(".container");
const pokemonStats = document.getElementById("pokemonStats"); //read-only - main card's stat bars, for index-based comparison

//initially we aren't comparing any pokemon
let compareMode = false;
let comparePokemon = null;

//set once by initCompareMode() - same circular import workaround as favorites.js/team.js's onSelectPokemon, just with more than one dependency
let onExitCompare = () => {};
let renderSpriteFn = () => {};
let renderTypesFn = () => {};
let renderStatsFn = () => {};
let renderTypeEffectivenessFn = () => {};

export function isCompareMode() {
  return compareMode;
}

//called by main.js after the user picks a *first* pokemon while compare mode is already on,
//but before a second one exists to compare against
export function announceFirstPick(pokemonName) {
  compareHint.textContent = `⚔️ Now search a second Pokémon to compare with ${pokemonName}`;
}

//toggling the compare Mode OFF/ON:

export function toggleCompareMode() {
  const currentPokemon = getCurrentPokemon();
  compareMode = !compareMode;

  compareBtn.classList.toggle("active", compareMode);

  const cardsWrapper = document.getElementById("cards-wrapper");

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

export function displayComparedPokemon(pokemon) {
  const currentPokemon = getCurrentPokemon();
  //same element main.js uses, grabbed fresh here rather than threaded through as another dependency
  const errorDiv = document.getElementById("error");

  errorDiv.classList.add("hidden");

  if (pokemon.id === currentPokemon.id) {
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

function highlightStats() {
  const currentPokemon = getCurrentPokemon();
  if (!currentPokemon || !comparePokemon) return;

  mainStats.forEach((statName, index) => {
    const p1Stat = currentPokemon.stats.find((s) => s.stat.name === statName);
    const p2Stat = comparePokemon.stats.find((s) => s.stat.name === statName);

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
    if (p1Bar) {
      p1Bar.classList.toggle("win", p1Wins);
      p2Bar.classList.toggle("lose", !p1Wins);
    }
    if (p2Bar) {
      p2Bar.classList.toggle("win", !p1Wins);
      p2Bar.classList.toggle("lose", p1Wins);
    }
  });
}

//main.js calls this once on startup, handing us the pieces we cant own ourselves:
//"what exiting compare mode" redisplays, and the rendering helpers we need to fill our own card with
export function initCompareMode({
  onExitCompare: exit,
  renderSprite,
  renderTypes,
  renderStats,
  renderTypeEffectiveness,
}) {
  onExitCompare = exit;
  renderSpriteFn = renderSprite;
  renderTypesFn = renderTypes;
  renderStatsFn = renderStats;
  renderTypeEffectivenessFn = renderTypeEffectiveness;

  compareBtn.addEventListener("click", toggleCompareMode);
}
