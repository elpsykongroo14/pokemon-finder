import {
  fetchTCGCards,
  fetchTCGCardsBatch,
  fetchAllpokemonNames,
} from "./api.js";

import { pushState, getCurrentPokemon } from "./state.js";

//all of this element's own- the pokemon card "view cards" button,
//the library view itself, and everything inside the card panel/modal
//none of these are queried anywhere outside this file
const tcgBtn = document.getElementById("tcg-btn");
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

//safe function:
//it takes a plain text message and css class then safely puts it into cardGrid no matter what the message contains
function setCardGridMessage(text, className) {
  cardGrid.innerHTML = "";
  const p = document.createElement("p");
  p.className = className;
  p.textContent = text;
  cardGrid.appendChild(p);
}

let onEnterLibrary = () => {};
let onExitLibrary = () => {};

//the following functions are SPA navigation functions, toggling visibility using css instead of reloading the page
export async function showLibrary() {
  onEnterLibrary();
  libraryView.classList.remove("hidden");

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

export function hideLibrary() {
  const currentPokemon = getCurrentPokemon();
  libraryView.classList.add("hidden");
  onExitLibrary();

  //restore the URL to reflect main view when we leave the library
  if (currentPokemon) {
    pushState({ pokemon: currentPokemon.name }, currentPokemon.name);
  } else {
    //no pokemon loaded = clear the URL back to normal
    history.pushState({}, "", window.location.pathname);
    document.title = "Pokémon Finder";
  }
}

export function isLibraryOpen() {
  return !libraryView.classList.contains("hidden");
}

//called from main.js's popstate handler when history state says
//virew === "library". delibrately does not call showLibrary()
//that would refetch and reshuffle a fresh batch of cards, which is wrong
//for back/forward navigation. this just makes the chrome match the history entry, and re-opens a search if one was open
export function restoreLibraryState(state) {
  onEnterLibrary();
  libraryView.classList.remove("hidden");

  document.title = state.search
    ? `${state.search} - TCG Cards`
    : "TCG Library - Pokemon Finder";

  if (state.search) {
    showCardPanel(state.search);
  }
}

//now for the sorting part

//reading currentTCGCards and returning a new sorted array without mutating currentTCGCards itself
export function getSortedCards() {
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

//here's the rendering part

//the function takes an array card objects and builds the DOM
export function renderCardGrid(cards) {
  cardGrid.innerHTML = "";

  cards.forEach((card) => {
    const el = document.createElement("div");
    el.className = "tcg-card";

    const imgWrap = document.createElement("div");
    imgWrap.className = "tcg-card-img-wrap";

    const img = document.createElement("img");
    img.src = card.images?.small || ""; // attribute set directly, not parsed
    img.alt = card.name; // textContent-equivalent for attributes
    img.loading = "lazy";
    imgWrap.appendChild(img);

    const info = document.createElement("div");
    info.className = "tcg-card-info";

    const setDiv = document.createElement("div");
    setDiv.className = "tcg-card-set";
    setDiv.textContent = card.set?.name || "Unknown set";

    const rarityDiv = document.createElement("div");
    rarityDiv.className = "tcg-card-rarity";
    rarityDiv.textContent = card.rarity || "Unknown";

    info.appendChild(setDiv);
    info.appendChild(rarityDiv);
    el.appendChild(imgWrap);
    el.appendChild(info);

    el.addEventListener("click", () => openCardModal(card));
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
export function searchLibrary() {
  const query = librarySearchInput.value.trim();
  if (!query) return;
  showCardPanel(query);
}

//this functions takes a name, and fetches all its available cards

export async function showCardPanel(pokemonName) {
  pushState(
    { view: "library", search: pokemonName },
    `${pokemonName} - TCG Cards`,
  );

  cardPanelTitle.textContent = pokemonName;
  setCardGridMessage("Loading cards...", "library-loading");
  cardPanel.classList.remove("hidden");

  try {
    currentTCGCards = await fetchTCGCards(pokemonName);

    if (currentTCGCards.length === 0) {
      setCardGridMessage(
        `No TCG cards found for "${pokemonName}".`,
        "library-empty",
      );
      return;
    }

    renderCardGrid(getSortedCards());
  } catch (err) {
    if (err instanceof TypeError) {
      setCardGridMessage(
        "Network error - check your connection.",
        "library-empty",
      );
    } else {
      setCardGridMessage(
        `Failed to load cards for "${pokemonName}".`,
        "library-empty",
      );
    }
  }
}

//going back to search results without re-fetching anything
function hideCardPanel() {
  cardPanel.classList.add("hidden");
  currentTCGCards = [];
}

//called once from main.js at startup, the same way initFavorites and initComparemode are.
//main.js hands over the one thing it owns that we need
//(getCurrentPokemon we already get from state.js - this is really just the two chrom callbacks)
//plus wires up the one button that lives in the pokemon detail view but triggers library behavior.
export function initTCGLibrary({ enterLibrary, exitLibrary }) {
  onEnterLibrary = enterLibrary;
  onExitLibrary = exitLibrary;

  tcgBtn.addEventListener("click", () => {
    const currentPokemon = getCurrentPokemon();
    if (!currentPokemon) return;

    showLibrary();
    //setTimeout(0) lets showLibrary's DOM setup finsih before
    //showCardPanel tries to write into the panel it just built
    setTimeout(() => showCardPanel(currentPokemon.name), 0);
  });

  libraryBtn.addEventListener("click", showLibrary);
  libraryBack.addEventListener("click", hideLibrary);
  cardPanelBack.addEventListener("click", hideCardPanel);
  librarySearchBtn.addEventListener("click", searchLibrary);
  librarySearchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") searchLibrary();
  });
  sortSelect.addEventListener("change", () => {
    if (currentTCGCards.length > 0) renderCardGrid(getSortedCards());
  });
}
