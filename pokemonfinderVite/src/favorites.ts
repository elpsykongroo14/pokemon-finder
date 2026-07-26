import {
  getFavorites,
  addFavorite,
  removeFavorite,
  isFavorite,
} from "./store.js";
import { getCurrentPokemon } from "./state";
import { requireElement } from "./dom";

const favoritesToggle = requireElement<HTMLButtonElement>("favorites-toggle");
const favoritesDrawer = requireElement<HTMLElement>("favorites-drawer");
const overlay = requireElement<HTMLElement>("overlay");
const closeDrawer = requireElement<HTMLButtonElement>("close-drawer");
const favoriteBtn = requireElement<HTMLButtonElement>("favorite-btn");
const favoritesContainer = requireElement<HTMLElement>("favorites-container");

// set once by initFavorites() — this is how this module asks "go search this pokemon"
// without importing searchPokemon (and creating a circular import between favorites.js and main.js)
let onSelectPokemon: (name: string) => void = () => {};

function openDrawer(): void {
  favoritesDrawer.classList.add("open");
  overlay.classList.remove("hidden");
}

function closeDrawerFn(): void {
  favoritesDrawer.classList.remove("open");
  overlay.classList.add("hidden");
}

export function renderFavorites(): void {
  const favorites = getFavorites();
  favoritesContainer.textContent = "";

  if (favorites.length === 0) {
    const emptyMsg = document.createElement("p");
    emptyMsg.style.color = "#888";
    emptyMsg.style.textAlign = "center";
    emptyMsg.style.padding = "20px";
    emptyMsg.textContent = "No favorites yet";
    favoritesContainer.appendChild(emptyMsg);
    return;
  }

  const fragment = document.createDocumentFragment();

  favorites.forEach((pokemon) => {
    const card = document.createElement("div");
    card.className = "favorite-card";

    const img = document.createElement("img");
    img.src = pokemon.sprite ?? "";
    img.alt = pokemon.name;

    const info = document.createElement("div");
    info.className = "favorite-card-info";

    const nameDiv = document.createElement("div");
    nameDiv.className = "favorite-card-name";
    nameDiv.textContent = pokemon.name;

    const idDiv = document.createElement("div");
    idDiv.className = "favorite-card-id";
    idDiv.textContent = `#${String(pokemon.id).padStart(3, "0")}`;

    info.appendChild(nameDiv);
    info.appendChild(idDiv);

    const removeBtn = document.createElement("button");
    removeBtn.className = "remove-favorite";
    removeBtn.textContent = "X";

    card.appendChild(img);
    card.appendChild(info);
    card.appendChild(removeBtn);

    card.addEventListener("click", (e) => {
      if (e.target === removeBtn) return;
      onSelectPokemon(pokemon.name);
      closeDrawerFn();
    });

    removeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      removeFavorite(pokemon.name);
      renderFavorites();
      updateFavoriteBtn();
    });

    favoritesContainer.appendChild(card);
  });

  favoritesContainer.appendChild(fragment);
}

export function updateFavoriteBtn(): void {
  const currentPokemon = getCurrentPokemon();
  if (!currentPokemon) return;

  const favorited = isFavorite(currentPokemon.name);
  favoriteBtn.textContent = favorited ? "❤️ in Favorites" : "🤍 Favorite";
  favoriteBtn.classList.toggle("favorited", favorited);
}

function toggleFavorite(): void {
  const currentPokemon = getCurrentPokemon();
  if (!currentPokemon) return;

  if (isFavorite(currentPokemon.name)) {
    removeFavorite(currentPokemon.name);
  } else {
    addFavorite(currentPokemon);
  }

  renderFavorites();
  updateFavoriteBtn();
}

// main.js calls this once, on startup, handing us the one piece of behavior
// we can't own ourselves: what "select this pokemon" means.
export function initFavorites(onSelect: (name: string) => void): void {
  onSelectPokemon = onSelect;

  favoritesToggle.addEventListener("click", openDrawer);
  closeDrawer.addEventListener("click", closeDrawerFn);
  overlay.addEventListener("click", closeDrawerFn);
  favoriteBtn.addEventListener("click", toggleFavorite);
}
