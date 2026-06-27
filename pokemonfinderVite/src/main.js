import "./styles.css";

import { getHistory, saveToHistory } from "./store.js";

import {
  fetchPokemon,
  fetchSpecies,
  fetchEvolutionChain,
  fetchTCGCards,
  fetchTCGCardsBatch,
  fetchAllpokemonNames,
} from "./api.js";

import { getSpriteUrl } from "./sprites.js";

import {
  renderSprite,
  renderTypes,
  renderMeta,
  renderStats,
  renderTypeEffectiveness,
} from "./render.js";

import { setCurrentPokemon, getCurrentPokemon } from "./state.js";

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
const tcgBtn = document.getElementById("tcg-btn");
//
//POKEMON TCG LIBRARY
//

const libraryBtn = document.getElementById("library-btn");
const libraryView = document.getElementById("library-view");
const libraryBack = document.getElementById("library-back");
const librarySearchInput = document.getElementById("library-search");
const librarySearchBtn = document.getElementById("library-search-btn");
const cardPanel = document.getElementById("card-panel");
const cardPanelBack = document.getElementById("card-panel-back");
const cardPanelTitle = document.getElementById("card-panel-title");
const cardGrid = document.getElementById("card-grid");
const sortSelect = document.getElementById("sort-select");
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

//getting the tcg of a specific pokemon
tcgBtn.addEventListener("click", () => {
  const currentPokemon = getCurrentPokemon();
  if (!currentPokemon) return;

  //navigating to the library view
  showLibrary();

  //we immediately open the pokemon's card panel
  //we use setTimeout(0) to let showLibrary() finish its async setup
  //before showCardPanel tries to write into the DOM it just built
  setTimeout(() => showCardPanel(currentPokemon.name), 0);
});

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
     <img src="${sprite}" alt="${name}" />
     <span>${name}</span>
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

//in-memory store for currently loaded TCG cards.
let currentTCGCards = [];

//rarity ranking map
//converting rarity from strings to numbers and ranking them up from highest number to lowest
const RARITY_RANK = {
  "Secret Rare": 9,
  "Special Illustration Rare": 8,
  "Illustration Rare": 7,
  "Ultra Rare": 7,
  "Hyper Rare": 7,
  "Rare Rainbow": 6,
  "Rare Secret": 6,
  "Rare Ultra": 5,
  "Rare Holo VMAX": 5,
  "Rare Holo VSTAR": 5,
  "Rare Holo V": 4,
  "Rare Holo GX": 4,
  "Rare Holo EX": 4,
  "Rare Holo": 3,
  Rare: 2,
  Uncommon: 1,
  Common: 0,
};

//shuffling the names we have
function shuffleArray(arr) {
  //copying so we don't mutate the original aray
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    //swap
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

//the following functions are SPA navigation functions, toggling visibility using css instead of reloading the page
async function showLibrary() {
  mainContainer.classList.add("hidden");
  libraryView.classList.remove("hidden");
  favoritesToggle.classList.add("hidden");
  libraryBtn.classList.add("hidden");
  teamStrip.classList.add("hidden");

  pushState({ view: "library" }, "TCG Library");

  //reset the library each time its entered
  librarySearchInput.value = "";
  librarySearchInput.focus();

  //show panel immediately with  a loading state
  cardPanelTitle.textContent = "Featured Cards";
  cardGrid.innerHTML = `<p class="library-loading">Loading cards...</p>`;
  cardPanel.classList.remove("hidden");

  try {
    const allNames = await fetchAllpokemonNames();
    const picks = shuffleArray(allNames).slice(0, 25);
    currentTCGCards = await fetchTCGCardsBatch(picks);

    if (currentTCGCards.length === 0) {
      cardGrid.innerHTML = `<p class="library-empty">No cards loaded.</p>`;
      return;
    }

    renderCardGrid(getSortedCards());
  } catch (err) {
    if (err instanceof TypeError) {
      cardGrid.innerHTML = `<p class="library-empty">Network error — check your connection.</p>`;
    } else {
      cardGrid.innerHTML = `<p class="library-empty">Failed to load featured cards. Try again.</p>`;
    }
  }
}

function hideLibrary() {
  const currentPokemon = getCurrentPokemon();
  libraryView.classList.add("hidden");
  mainContainer.classList.remove("hidden");

  favoritesToggle.classList.remove("hidden");
  libraryBtn.classList.remove("hidden");
  teamStrip.classList.remove("hidden");

  //restore the URL to reflect main view when we leave the library
  if (currentPokemon) {
    pushState({ pokemon: currentPokemon.name }, currentPokemon.name);
  } else {
    //no pokemon loaded = clear the URL back to normal
    history.pushState({}, "", window.location.pathname);
    document.title = "Pokémon Finder";
  }
}

libraryBtn.addEventListener("click", showLibrary);
libraryBack.addEventListener("click", hideLibrary);

//this functions takes a name, and fetches all its available cards

async function showCardPanel(pokemonName) {
  pushState(
    { view: "library", search: pokemonName },
    `${pokemonName} - TCG Cards`,
  );

  cardPanelTitle.textContent = pokemonName;
  cardGrid.innerHTML = `<p class="library-loading">Loading cards...</p>`;
  cardPanel.classList.remove("hidden");

  try {
    currentTCGCards = await fetchTCGCards(pokemonName);

    if (currentTCGCards.length === 0) {
      cardGrid.innerHTML = `<p class="library-empty">No TCG cards found for "${pokemonName}".</p>`;
      return;
    }

    renderCardGrid(getSortedCards());
  } catch (err) {
    if (err instanceof TypeError) {
      cardGrid.innerHTML = `<p class="library-empty">Network error — check your connection.</p>`;
    } else {
      cardGrid.innerHTML = `<p class="library-empty">Failed to load cards for "${pokemonName}".</p>`;
    }
  }
}

//going back to search results without re-fetching anything
function hideCardPanel() {
  cardPanel.classList.add("hidden");
  currentTCGCards = [];
}

cardPanelBack.addEventListener("click", hideCardPanel);

//now for the sorting part

//reading currentTCGCards and returning a new sorted array without mutating currentTCGCards itself
function getSortedCards() {
  const sortValue = sortSelect.value;
  //[...currentTCGCards] creates a shallow copy which sort will operate on
  const cards = [...currentTCGCards];

  if (sortValue === "newest") {
    cards.sort((a, b) =>
      (b.set.releaseDate || "").localeCompare(a.set.releaseDate || ""),
    );
  } else if (sortValue === "oldest") {
    cards.sort((a, b) =>
      (a.set.releaseDate || "").localeCompare(b.set.releaseDate || ""),
    );
  } else if (sortValue === "rarity") {
    //looking up each card's rarity string in the RARITY_RANK map, if it isn't found, fall back to 0
    //subtracting a from b so higher rank = earlier in array (descending)
    cards.sort(
      (a, b) => (RARITY_RANK[b.rarity] ?? 0) - (RARITY_RANK[a.rarity] ?? 0),
    );
  }

  return cards;
}

//when sort dropdown changes, re-render with new order
sortSelect.addEventListener("change", () => {
  if (currentTCGCards.length > 0) renderCardGrid(getSortedCards());
});

//here's the rendering part

//the function takes an array card objects and builds the DOM
function renderCardGrid(cards) {
  cardGrid.innerHTML = "";

  cards.forEach((card) => {
    const el = document.createElement("div");
    el.className = "tcg-card";

    const imgSrc = card.images?.small || "";
    const setName = card.set?.name || "Unknown set";
    const rarity = card.rarity || "Unknown";

    el.innerHTML = `
      <div class="tcg-card-img-wrap">
        <img src="${imgSrc}" alt="${card.name}" loading="lazy" />
      </div>
      <div class="tcg-card-info">
        <div class="tcg-card-set">${setName}</div>
        <div class="tcg-card-rarity">${rarity}</div>
      </div>
    `;

    //clicking on a card opens the high-res image in a new tab.
    el.addEventListener("click", () => {
      openCardModal(card);
    });

    cardGrid.appendChild(el);
  });
}

//card detail modal

const cardModal = document.createElement("div");
cardModal.className = "card-modal hidden";
cardModal.innerHTML = `
  <div class="card-modal-backdrop"></div>
  <div class="card-modal-content">
    <button class="card-modal-close">✕</button>
    <div class="card-modal-body">
      <div class="card-modal-img-wrap">
        <img id="card-modal-img" src="" alt="" />
      </div>
      <div class="card-modal-info">
        <h2 class="card-modal-name"></h2>
        <div class="card-modal-meta"></div>
        <p class="card-modal-flavor"></p>
      </div>
    </div>
  </div>
`;
document.body.appendChild(cardModal);

const cardModalImg = cardModal.querySelector("#card-modal-img");
const cardModalName = cardModal.querySelector(".card-modal-name");
const cardModalMeta = cardModal.querySelector(".card-modal-meta");
const cardModalFlavor = cardModal.querySelector(".card-modal-flavor");

function openCardModal(card) {
  cardModalImg.src = card.images?.large || card.images?.small || "";
  cardModalImg.alt = card.name;
  cardModalName.textContent = card.name;

  //building meta rows from whatever data exists on the card project
  const metaRows = [
    { label: "Set", value: card.set?.name },
    { label: "Released", value: card.set?.releaseDate?.replace(/\//g, " · ") },
    { label: "Rarity", value: card.rarity },
    { label: "Artist", value: card.artist },
    { label: "HP", value: card.hp ? `${card.hp} HP` : null },
    { label: "Type", value: card.supertypes?.join(", ") },
  ];

  cardModalMeta.innerHTML = metaRows
    .filter((row) => row.value) //skip rows where the api returns nothing
    .map(
      (row) => `
      <div class="meta-row">
        <span class="meta-label">${row.label}</span>
        <span class="meta-value">${row.value}</span>
      </div>
    `,
    )
    .join("");

  // flavorText is the italic lore text printed on the card — lovely detail,
  // but only present on some cards (mostly older sets and certain rarities)
  cardModalFlavor.textContent = card.flavorText || "";
  cardModalFlavor.classList.toggle("hidden", !card.flavorText);

  cardModal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeCardModal() {
  cardModal.classList.add("hidden");
  document.body.style.overflow = "";
}

//closing the modal
cardModal
  .querySelector(".card-modal-backdrop")
  .addEventListener("click", closeCardModal);
cardModal
  .querySelector(".card-modal-close")
  .addEventListener("click", closeCardModal);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !cardModal.classList.contains("hidden"))
    closeCardModal();
});

//library search part

//this is the entry point for when a user types a pokemon name and hits search in library view, showCardPanel() handles the fetching
function searchLibrary() {
  const query = librarySearchInput.value.trim();
  if (!query) return;
  showCardPanel(query);
}

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

librarySearchBtn.addEventListener("click", searchLibrary);
librarySearchInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") searchLibrary();
});

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

//this function is responsible for updating the URL
//every view transaction calls this, nothing else touches history.pushState directly.
function pushState(params, title) {
  const urlParams = new URLSearchParams(params);
  history.pushState(
    //state object mirrors the params
    Object.fromEntries(urlParams),
    "",
    `?${urlParams.toString()}`,
  );
  document.title = `${title} - Pokémon Finder`;
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
    mainContainer.classList.add("hidden");
    libraryView.classList.remove("hidden");
    favoritesToggle.classList.add("hidden");
    libraryBtn.classList.add("hidden");
    teamStrip.classList.add("hidden");

    document.title = state.search
      ? `${state.search} - TCG Cards`
      : "TCG Library - Pokémon Finder";

    //if there was a search open, re-open it
    if (state.search) {
      showCardPanel(state.search);
    }
    return;
  }

  //main pokemon view
  if (state.pokemon) {
    //making sure the main view is visible if we were in the library
    if (!libraryView.classList.contains("hidden")) {
      hideLibrary();
    }
    searchInput.value = state.pokemon;
    searchPokemon();
  }
});
