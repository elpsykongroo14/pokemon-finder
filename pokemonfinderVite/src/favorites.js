// src/favorites.js

import {
  getFavorites,
  addFavorite,
  removeFavorite,
  isFavorite,
} from "./store.js";
import { getCurrentPokemon } from "./state.js";

const favoritesToggle = document.getElementById("favorites-toggle");
const favoritesDrawer = document.getElementById("favorites-drawer");
const overlay = document.getElementById("overlay");
const closeDrawer = document.getElementById("close-drawer");
const favoriteBtn = document.getElementById("favorite-btn");
const favoritesContainer = document.getElementById("favorites-container");

// set once by initFavorites() — this is how this module asks "go search this
// pokemon" without importing searchPokemon (and creating a circular import
// between favorites.js and main.js)
let onSelectPokemon = () => {};

function openDrawer() {
  favoritesDrawer.classList.add("open");
  overlay.classList.remove("hidden");
}

function closeDrawerFn() {
  favoritesDrawer.classList.remove("open");
  overlay.classList.add("hidden");
}

export function renderFavorites() {
  const favorites = getFavorites();
  favoritesContainer.innerHTML = "";

  if (favorites.length === 0) {
    favoritesContainer.innerHTML =
      '<p style="color:#888; text-align:center; padding:20px;">No favorites yet</p>';
    return;
  }

  favorites.forEach((pokemon) => {
    const card = document.createElement("div");
    card.className = "favorite-card";
    card.innerHTML = `
      <img src="${pokemon.sprite}" alt="${pokemon.name}" />
      <div class="favorite-card-info">
        <div class="favorite-card-name">${pokemon.name}</div>
        <div class="favorite-card-id">#${String(pokemon.id).padStart(3, "0")}</div>
      </div>
      <button class="remove-favorite" data-name="${pokemon.name}">x</button>
    `;

    card.addEventListener("click", (e) => {
      if (e.target.classList.contains("remove-favorite")) return;
      onSelectPokemon(pokemon.name);
      closeDrawerFn();
    });

    card.querySelector(".remove-favorite").addEventListener("click", (e) => {
      e.stopPropagation();
      removeFavorite(pokemon.name);
      renderFavorites();
      updateFavoriteBtn();
    });

    favoritesContainer.appendChild(card);
  });
}

export function updateFavoriteBtn() {
  const currentPokemon = getCurrentPokemon();
  if (!currentPokemon) return;

  const favorited = isFavorite(currentPokemon.name);
  favoriteBtn.textContent = favorited ? "❤️ in Favorites" : "🤍 Favorite";
  favoriteBtn.classList.toggle("favorited", favorited);
}

function toggleFavorite() {
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
export function initFavorites(onSelect) {
  onSelectPokemon = onSelect;

  favoritesToggle.addEventListener("click", openDrawer);
  closeDrawer.addEventListener("click", closeDrawerFn);
  overlay.addEventListener("click", closeDrawerFn);
  favoriteBtn.addEventListener("click", toggleFavorite);
}
