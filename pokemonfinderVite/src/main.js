import "./styles.css";

import { getHistory, saveToHistory } from "./store.js";

import { fetchPokemon, fetchSpecies, fetchEvolutionChain } from "./api.js";

import {
  initTCGLibrary,
  showLibrary,
  showCardPanel,
  hideLibrary,
  isLibraryOpen,
  restoreLibraryState,
} from "./tcglibrary.js";

import { getSpriteUrl } from "./sprites";
import { escapeHTML } from "./sanitize";

import {
  renderSprite,
  renderTypes,
  renderMeta,
  renderStats,
  renderTypeEffectiveness,
} from "./render.js";

import { setCurrentPokemon, getCurrentPokemon, pushState } from "./state";

import { initTeam, renderTeam, updateTeamBtn } from "./team.js";

import {
  initFavorites,
  renderFavorites,
  updateFavoriteBtn,
} from "./favorites.js";

import {
  initCompareMode,
  isCompareMode,
  displayComparedPokemon,
  announceFirstPick,
} from "./comparemode.js";

const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const randomBtn = document.getElementById("randomBtn");
const pokemonCard = document.getElementById("pokemonCard");
const errorDiv = document.getElementById("error");
const pokemonImg = document.getElementById("pokemonImg");
const pokemonName = document.getElementById("pokemonName");
const pokemonId = document.getElementById("pokemonId");
const pokemonTypes = document.getElementById("pokemonTypes");
const pokemonStats = document.getElementById("pokemonStats");
const spinner = document.getElementById("spinner");
const historyContainer = document.getElementById("search-history");
const shinyBtn = document.getElementById("shiny-btn");
const evolutionContainer = document.getElementById("evolution-chain");
const favoritesToggle = document.getElementById("favorites-toggle");
const teamStrip = document.getElementById("team-strip");
const flavorText = document.getElementById("flavor-text");
const pokemonMeta = document.getElementById("pokemon-meta");
const typeEffectiveness = document.getElementById("type-effectiveness");
const mainContainer = document.querySelector(".container");

const MAX_POKEMON = 1025;

//initially we aren't displaying any shiny sprites
let isShiny = false;
let currentSprites = null;

//toggling shiny version
function toggleShiny() {
  if (!currentSprites) return;

  const shinyUrl = getSpriteUrl(currentSprites, { shiny: true });

  if (!shinyUrl && !isShiny) {
    errorDiv.textContent = "No shiny sprite available for this Pokémon.";
    errorDiv.classList.remove("hidden");
    setTimeout(() => errorDiv.classList.add("hidden"), 2500);
    return;
  }

  isShiny = !isShiny;

  spinner.classList.remove("hidden");
  pokemonImg.classList.add("hidden");

  pokemonImg.onload = () => {
    spinner.classList.add("hidden");
    pokemonImg.classList.remove("hidden");
  };

  pokemonImg.src = getSpriteUrl(currentSprites, { shiny: isShiny });

  shinyBtn.textContent = isShiny ? "✨ Shiny" : "Toggle Shiny";
}

shinyBtn.addEventListener("click", toggleShiny);

const suggestions = document.querySelectorAll(".suggestion");

//pokemon search

async function searchPokemon() {
  const currentPokemon = getCurrentPokemon();
  const searchQuery = searchInput.value.trim().toLowerCase();
  if (!searchQuery) return;

  if (!isCompareMode()) {
    pokemonCard.classList.add("hidden");
  }
  errorDiv.classList.add("hidden");
  spinner.classList.remove("hidden");

  try {
    const pokemon = await fetchPokemon(searchQuery);

    //checking if were in compare mode or not

    if (isCompareMode() && currentPokemon) {
      displayComparedPokemon(pokemon);
    } else {
      displayPokemon(pokemon);
      saveToHistory(searchQuery);
      renderHistory();

      //update the hint if compare mode is already on
      if (isCompareMode()) {
        announceFirstPick(pokemon.name);
      }
    }
    spinner.classList.add("hidden");
  } catch (error) {
    spinner.classList.add("hidden");
    errorDiv.classList.remove("hidden");

    //handling error cases (network error and plain error)
    if (error instanceof TypeError) {
      errorDiv.textContent = "Network error. Check your connection.";
    } else {
      errorDiv.textContent = "Pokémon not found. Try another name or ID.";
    }
  }
}

//displaying the pokemon
//(renderSprite/renderTypes/renderMeta/renderStats/renderTypeEffectiveness now
//live in render.js - main.js just tells each one exactly where to render)

function displayPokemon(pokemon) {
  //rendering: pokemon data -> DOM
  renderSprite(pokemon, pokemonImg);
  pokemonName.textContent = pokemon.name;
  renderTypes(pokemon, pokemonTypes);
  renderMeta(pokemon, pokemonMeta);
  renderStats(pokemon, pokemonStats);
  pokemonId.textContent = `#${String(pokemon.id).padStart(3, "0")}`;

  //state: this is now "the currently displayed pokemon"
  setCurrentPokemon(pokemon);
  currentSprites = pokemon.sprites;
  isShiny = false;
  shinyBtn.textContent = "Toggle Shiny";

  //side effect: url, tab title, related UI sync
  pushState({ pokemon: pokemon.name }, pokemon.name);
  document.title = `${pokemon.name} - Pokémon  Finder`;
  updateFavoriteBtn();
  renderFavorites();
  updateTeamBtn();

  //triggers further async work
  loadEvolutionData(pokemon);
  renderTypeEffectiveness(pokemon, typeEffectiveness);

  pokemonCard.classList.remove("hidden");
}

//fetching random pokemon

function getRandomPokemon() {
  const randomId = Math.floor(Math.random() * MAX_POKEMON) + 1;
  searchInput.value = randomId;
  searchPokemon();
}

searchBtn.addEventListener("click", searchPokemon);
randomBtn.addEventListener("click", getRandomPokemon);

searchInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") searchPokemon();
});

suggestions.forEach((btn) => {
  btn.addEventListener("click", () => {
    searchInput.value = btn.dataset.name;
    searchPokemon();
  });
});

//working on fetching the evolution chain

//the api already gives us a tree (every node's evolves to is an array of more nodes)
//we just reshape it into something easier to work with:
//{ name, children: [...] }
function buildEvolutionTree(node) {
  return {
    name: node.species.name,
    children: node.evolves_to.map(buildEvolutionTree),
  };
}

async function loadEvolutionData(pokemon) {
  try {
    //fetching species data
    const speciesData = await fetchSpecies(pokemon.species.url);

    //flavor text
    const englishEntry = speciesData.flavor_text_entries.find(
      (entry) => entry.language.name === "en",
    );

    if (englishEntry) {
      const cleaned = englishEntry.flavor_text
        .replace(/\f/g, " ")
        .replace(/\n/g, " ")
        .replace(/POK\u00e9MON/gi, "Pokémon")
        .replace(/\b([A-ZÉÈÊ]{2,})\b/g, (match) => {
          return match.charAt(0).toUpperCase() + match.slice(1).toLowerCase();
        });
      flavorText.textContent = cleaned;
    } else {
      flavorText.textContent = "";
    }

    //fetching evolution data
    const evoData = await fetchEvolutionChain(speciesData.evolution_chain.url);
    const tree = buildEvolutionTree(evoData.chain);

    //no children at all means this pokemon doesn't evolve, period
    if (tree.children.length === 0) {
      evolutionContainer.innerHTML = `<p class="no-evolution">This Pokémon does not evolve.</p>`;
      return;
    }

    await displayEvolutionChain(tree);
  } catch (error) {
    console.error("Failed to load evolution chain:", error);
    evolutionContainer.innerHTML = `<p class="no-evolution">Couldn't load evolution data.</p>`;
  }
}

//displaying the evolution chain
//pulled out of the old loop body - builds one evolution stage element for a single pokemon name
async function buildStageElement(name) {
  const data = await fetchPokemon(name);
  const sprite = getSpriteUrl(data.sprites);

  const stage = document.createElement("div");
  stage.className = "evolution-stage";
  stage.innerHTML = `
     <img src="${escapeHTML(sprite)}" alt="${escapeHTML(name)}" />
     <span>${escapeHTML(name)}</span>
  `;

  stage.addEventListener("click", () => {
    searchInput.value = name;
    searchPokemon();
  });

  return stage;
}

//recursively renders one tree node and everything beneath it
//returning the DOM elment that represents the whole subtree
async function renderEvolutionNode(node) {
  const stage = await buildStageElement(node.name);

  if (node.children.length === 0) {
    return stage;
  }

  const childElements = await Promise.all(
    node.children.map((child) => renderEvolutionNode(child)),
  );

  const arrow = document.createElement("div");
  arrow.className = "evolution-arrow";

  const childrenGroup = document.createElement("div");
  childrenGroup.className = "evolution-branch-group";
  childElements.forEach((el) => childrenGroup.appendChild(el));

  const row = document.createElement("div");
  row.className = "evolution-branch-row";
  row.append(stage, arrow, childrenGroup);

  return row;
}

async function displayEvolutionChain(tree) {
  evolutionContainer.innerHTML = "";
  const rootElement = await renderEvolutionNode(tree);
  evolutionContainer.appendChild(rootElement);
}

//compare mode itself (its state, its own DOM, toggleCompareMode,
//displayComparedPokemon, highlightStats) now lives in compareMode.js.
//main.js just hands it the few things it can't own itself.
initCompareMode({
  onExitCompare: displayPokemon,
  renderSprite,
  renderTypes,
  renderStats,
  renderTypeEffectiveness,
});

//keyboard navigation
function initSuggestionKeyNav(container) {
  //we call this inside the function since the history container is dynamic
  //its buttons are created by renderHistory() and didn't exist when the page loaded
  const buttons = Array.from(container.querySelectorAll(".suggestion"));

  if (buttons.length === 0) return;

  //at fist button gets 0 (Tab will land here)
  //all the others get -1 (Tab skips them but js can focus them)
  buttons.forEach((btn, index) => {
    btn.setAttribute("tabindex", index === 0 ? "0" : "-1");
  });

  //listening for keydown on each button
  //keydown and not keypress because keypress is deprecated and keydown fires for every key reliably
  buttons.forEach((btn, index) => {
    btn.addEventListener("keydown", (e) => {
      //we only care about arrow keys
      //anything else will return early
      if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(e.key)) return;

      //prevents the page from scrolling horizontally when user presses arrow keys
      e.preventDefault();

      let nextIndex;

      if (e.key === "ArrowRight") {
        //means move forward. % operator wraps around:
        //if index is the last button (buttons.length -1)
        //adding 1 and taking % brings us back to 0
        nextIndex = (index + 1) % buttons.length;
      } else if (e.key === "ArrowLeft") {
        //move backward, adding buttons.length before subtracting
        //prevent negative index
        nextIndex = (index - 1 + buttons.length) % buttons.length;
      } else if (e.key === "Home") {
        //jump to first
        nextIndex = 0;
      } else if (e.key === "End") {
        //jump to last
        nextIndex = buttons.length - 1;
      }

      //moving the roving tabindex
      //remove tabindex="0" from the button that currently has it
      buttons[index].setAttribute("tabindex", "-1");
      //give tabindex="0" to the button were moving
      buttons[nextIndex].setAttribute("tabindex", "0");

      //moving focus
      //we call .focus() explicitly to move the browser's focus right away
      buttons[nextIndex].focus();
    });
  });
}

//rendering history
function renderHistory() {
  const history = getHistory(); // ← from store.js now

  historyContainer.innerHTML = "";

  if (history.length === 0) return;

  const label = document.createElement("span");
  label.textContent = "Recent:";
  label.classList.add("suggestion-label");
  historyContainer.appendChild(label);

  history.forEach((query) => {
    const btn = document.createElement("button");
    btn.textContent = query;
    btn.classList.add("suggestion");
    btn.addEventListener("click", () => {
      searchInput.value = query;
      searchPokemon();
    });
    historyContainer.appendChild(btn);
  });

  initSuggestionKeyNav(historyContainer);
}

//setup calls
renderFavorites();
renderHistory();
renderTeam();
function selectPokemon(name) {
  searchInput.value = name;
  searchPokemon();
}
initFavorites(selectPokemon);
initTeam(selectPokemon);
initTCGLibrary({
  enterLibrary: enterLibraryChrome,
  exitLibrary: exitLibraryChrome,
});
//these are the only things about the library main.js needs to know:
//how to get out of the way when it opens, and how to come back when it closes
function enterLibraryChrome() {
  mainContainer.classList.add("hidden");
  favoritesToggle.classList.add("hidden");
  teamStrip.classList.add("hidden");
}

function exitLibraryChrome() {
  mainContainer.classList.remove("hidden");
  favoritesToggle.classList.remove("hidden");
  teamStrip.classList.remove("hidden");
}

//wire up static "Try:" suggestion chips
const staticSuggestions = document.querySelector(".suggestions");
initSuggestionKeyNav(staticSuggestions);

//on page load, check if the URL already has a ?pokemon = parm
//window.location.search is the query string portion of the url

const params = new URLSearchParams(window.location.search);

if (params.get("view") === "library") {
  //restore the library view
  showLibrary().then(() => {
    //if we had a search open, we restore it too
    const search = params.get("search");
    if (search) showCardPanel(search);
  });
} else if (params.get("pokemon")) {
  //restore the pokemon card view
  searchInput.value = params.get("pokemon");
  searchPokemon();
}

//popstate fires when the user clicks back or forward
//event.state is the state object we passed to pushState earlier
window.addEventListener("popstate", (event) => {
  const state = event.state;

  //no state means the user went back to the beginning before any navigation happened
  if (!state || Object.keys(state).length === 0) {
    hideLibrary();
    pokemonCard.classList.add("hidden");
    setCurrentPokemon(null);
    document.title = "Pokémon Finder";
    return;
  }

  //library view states
  if (state.view === "library") {
    //make sure the library view is visible
    restoreLibraryState(state);
    return;
  }

  //main pokemon view
  if (state.pokemon) {
    //making sure the main view is visible if we were in the library
    if (isLibraryOpen()) {
      hideLibrary();
    }
    searchInput.value = state.pokemon;
    searchPokemon();
  }
});
