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
const favoritesToggle = document.getElementById("favorites-toggle");
const favoritesDrawer = document.getElementById("favorites-drawer");
const overlay = document.getElementById("overlay");
const closeDrawer = document.getElementById("close-drawer");
const favoriteBtn = document.getElementById("favorite-btn");
const favoritesContainer = document.getElementById("favorites-container");
const evolutionContainer = document.getElementById("evolution-chain");
const compareBtn = document.getElementById("compare-btn");
const compareHint = document.getElementById("compare-hint");
const compareCard = document.getElementById("compare-card");
const compareImg = document.getElementById("compareImg");
const compareName = document.getElementById("compareName");
const compareId = document.getElementById("compareId");
const compareTypes = document.getElementById("compareTypes");
const compareStats = document.getElementById("compareStats");
const evolutionSection = document.querySelector(".evolution-title");
const teamStrip = document.getElementById("team-strip");
const teamSlots = document.getElementById("team-slots");
const teamBtn = document.getElementById("team-btn");

//storage key and limit constants for building teams
const TEAM_KEY = "pokemon_team";
const MAX_TEAM = 6;

//initially we arent comparing any pokemon
let compareMode = false;
let comparePokemon = null;

//initially we arent displaying any shiny sprites
let isShiny = false;
let currentSprites = null;

//opening and closing the drawer

function openDrawer() {
  favoritesDrawer.classList.add("open");
  overlay.classList.remove("hidden");
}

function closeDrawerFn() {
  favoritesDrawer.classList.remove("open");
  overlay.classList.add("hidden");
}

favoritesToggle.addEventListener("click", openDrawer);
closeDrawer.addEventListener("click", closeDrawerFn);
overlay.addEventListener("click", closeDrawerFn);

//Saving and displaying the favorites

const FAVORITES_KEY = "pokemon_favorites";

//using DRY principle on the getFavorites() function
function getFavorites() {
  return JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");
}

let currentPokemon = null;

function toggleFavorite() {
  if (!currentPokemon) return;

  const favorites = getFavorites();

  const alreadyFavorited = favorites.some(
    (f) => f.name === currentPokemon.name,
  );

  if (alreadyFavorited) {
    const updated = favorites.filter((f) => f.name !== currentPokemon.name);

    localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
  } else {
    const newFavorite = {
      name: currentPokemon.name,
      id: currentPokemon.id,
      sprite:
        currentPokemon.sprites.other["official-artwork"].front_default ||
        currentPokemon.sprites.front_default,
    };
    favorites.push(newFavorite);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  }

  renderFavorites();
  updateFavoriteBtn();
}

function updateFavoriteBtn() {
  if (!currentPokemon) return;

  const favorites = getFavorites();
  const isFavorited = favorites.some((f) => f.name === currentPokemon.name);

  favoriteBtn.textContent = isFavorited ? "❤️ Favorited" : "🤍 Favorite";
  favoriteBtn.classList.toggle("favorited", isFavorited);
}

//now to render favorites in the drawer

function renderFavorites() {
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

    // clicking the card searches for that pokemon
    card.addEventListener("click", (e) => {
      if (e.target.classList.contains("remove-favorite")) return;
      searchInput.value = pokemon.name;
      searchPokemon();
      closeDrawerFn();
    });

    // clicking the remove button removes just that favorite
    card.querySelector(".remove-favorite").addEventListener("click", (e) => {
      e.stopPropagation();
      const updated = getFavorites().filter((f) => f.name !== pokemon.name);
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
      renderFavorites();
      updateFavoriteBtn();
    });

    favoritesContainer.appendChild(card);
  });
}

favoriteBtn.addEventListener("click", toggleFavorite);

// helper function to read the team
function getTeam() {
  return JSON.parse(localStorage.getItem(TEAM_KEY) || "[]");
}

//working on functionality of add to team button
function toggleTeam() {
  if (!currentPokemon) return;

  const team = getTeam();
  const onTeam = team.some((p) => p.name === currentPokemon.name);

  if (onTeam) {
    const updated = team.filter((p) => p.name !== currentPokemon.name);
    localStorage.setItem(TEAM_KEY, JSON.stringify(updated));
  } else {
    if (team.length >= MAX_TEAM) {
      errorDiv.textContent = "Your team is full - remove a Pokémon  first.";
      errorDiv.classList.remove("hidden");
      setTimeout(() => errorDiv.classList.add("hidden"), 3000);
      return;
    }

    const newMember = {
      name: currentPokemon.name,
      id: currentPokemon.id,
      sprite:
        currentPokemon.sprites.other["official-artwork"].front_default ||
        currentPokemon.sprites.front_default,
    };
    team.push(newMember);
    localStorage.setItem(TEAM_KEY, JSON.stringify(team));
  }

  renderTeam();
  updateTeamBtn();
}

teamBtn.addEventListener("click", toggleTeam);

//updating the button text and style depending on if a pokemon is on the team or not
function updateTeamBtn() {
  if (!currentPokemon) return;

  const team = getTeam();
  const onTeam = team.some((p) => p.name === currentPokemon.name);

  teamBtn.textContent = onTeam ? "On Team!" : "+Add to Team";
  teamBtn.classList.toggle("on-team", onTeam);
}

//rendering pokemon on team
function renderTeam() {
  const team = getTeam();
  teamSlots.innerHTML = "";

  for (let i = 0; i < MAX_TEAM; i++) {
    const slot = document.createElement("div");
    slot.className = "team-slot";

    if (team[i]) {
      //a filled slot
      slot.classList.add("filled");
      slot.innerHTML = `
            <img src="${team[i].sprite}" alt="${team[i].name}" />
            <button class="remove-team">X</button>
            `;
      //clicking on the sprite will allow us to search for the pokemon
      slot.querySelector("img").addEventListener("click", () => {
        searchInput.value = team[i].name;
        searchPokemon();
      });

      //event to remove pokemon from team
      slot.querySelector(".remove-team").addEventListener("click", (e) => {
        e.stopPropagation();
        const updated = getTeam().filter((p) => p.name !== team[i].name);
        localStorage.setItem(TEAM_KEY, JSON.stringify(updated));
        renderTeam();
        updateTeamBtn();
      });
    } else {
      //if its an empty slot
      slot.innerHTML = `<span class="slot-empty">+</span>`;
    }
    teamSlots.appendChild(slot);
  }
  updateTeamBtn();
}

//toggling shiny version
function toggleShiny() {
  if (!currentSprites) return;

  isShiny = !isShiny;

  spinner.classList.remove("hidden");
  pokemonImg.classList.add("hidden");

  pokemonImg.onload = () => {
    spinner.classList.add("hidden");
    pokemonImg.classList.remove("hidden");
  };

  pokemonImg.src = isShiny
    ? currentSprites.other["official-artwork"].front_shiny ||
      currentSprites.front_shiny
    : currentSprites.other["official-artwork"].front_default ||
      currentSprites.front_default;

  shinyBtn.textContent = isShiny ? "✨ Shiny" : "Toggle Shiny";
}

shinyBtn.addEventListener("click", toggleShiny);

const suggestions = document.querySelectorAll(".suggestion");

const MAX_POKEMON = 1025;

const typeColors = {
  fire: "#ff6b35",
  water: "#4a90d9",
  grass: "#5db85d",
  electric: "#f9c523",
  psychic: "#f85888",
  ice: "#96d9d6",
  dragon: "#7038f8",
  dark: "#705848",
  fairy: "#ee99ac",
  fighting: "#c03028",
  flying: "#a890f0",
  poison: "#a040a0",
  ground: "#e0c068",
  rock: "#b8a038",
  bug: "#a8b820",
  ghost: "#705898",
  steel: "#b8b8d0",
  normal: "#a8a878",
};

//pokemon search

async function searchPokemon() {
  const searchQuery = searchInput.value.trim().toLowerCase();
  if (!searchQuery) return;

  if (!compareMode) {
    pokemonCard.classList.add("hidden");
  }
  errorDiv.classList.add("hidden");
  spinner.classList.remove("hidden");

  try {
    const response = await fetch(
      `https://pokeapi.co/api/v2/pokemon/${searchQuery}`,
    );

    if (!response.ok) throw new Error("Not found");

    const pokemon = await response.json();

    //checking if were in compare mode or not

    if (compareMode && currentPokemon) {
      displayComparedPokemon(pokemon);
    } else {
      displayPokemon(pokemon);
      saveToHistory(searchQuery);
      renderHistory();

      //update the hint if compare mode is already on
      if (compareMode) {
        compareHint.textContent = `⚔️ Now search a second Pokémon to compare with ${pokemon.name}`;
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

function displayPokemon(pokemon) {
  pokemonImg.src =
    pokemon.sprites.other["official-artwork"].front_default ||
    pokemon.sprites.front_default;

  pokemonName.textContent = pokemon.name;

  pokemonTypes.innerHTML = pokemon.types
    .map(
      (t) =>
        `<span class="type" style="background-color:${typeColors[t.type.name] || "#777"}">${t.type.name}</span>`,
    )
    .join("");

  pokemonStats.innerHTML = pokemon.stats
    .filter((s) => mainStats.includes(s.stat.name))
    .map(
      (s) => `
        <div class="stat">
        <span class="stat-name">${s.stat.name}</span>
        <div class="stat-bar">
          <div class="stat-bar-fill" style="width: ${(s.base_stat / 255) * 100}%"></div>
        </div>
        <span class="stat-value">${s.base_stat}</span>
        </div>
        `,
    )
    .join("");

  pokemonId.textContent = `#${String(pokemon.id).padStart(3, "0")}`;

  currentPokemon = pokemon;
  updateFavoriteBtn();
  renderFavorites();
  updateTeamBtn();

  fetchEvolutionChain(pokemon);

  pokemonCard.classList.remove("hidden");

  currentSprites = pokemon.sprites;

  isShiny = false;
  shinyBtn.textContent = "Toggle Shiny";
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

async function fetchEvolutionChain(pokemon) {
  try {
    //fetching species data
    const speciesRes = await fetch(pokemon.species.url);
    const speciesData = await speciesRes.json();

    //fetching evolution data
    const evoRes = await fetch(speciesData.evolution_chain.url);
    const evoData = await evoRes.json();

    //extracting names by walking the chain
    const chain = [];
    let current = evoData.chain;

    while (current) {
      chain.push(current.species.name);
      current = current.evolves_to[0];
    }

    //if we have only one entry of a pokemon, then no need to display the evolution chain
    if (chain.length === 1) {
      evolutionContainer.innerHTML = `<p class="no-evolution">This Pokémon does not evolve.</p>`;
      return;
    }

    displayEvolutionChain(chain);
  } catch (error) {
    evolutionContainer.innerHTML = "";
  }
}

//Displaying the evolution Chain

async function displayEvolutionChain(chain) {
  evolutionContainer.innerHTML = "";

  for (let i = 0; i < chain.length; i++) {
    const name = chain[i];

    //fetching each pokemon to get its sprite
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${name}`);
    const data = await res.json();
    const sprite =
      data.sprites.other["official-artwork"].front_default ||
      data.sprites.front_default;

    //create the stage evolution element
    const stage = document.createElement("div");
    stage.className = "evolution-stage";
    stage.innerHTML = `
       <img src="${sprite}" alt="${name}" />
       <span>${name}</span>
    `;

    //clicking a specific stage evolution searches for that pokemon
    stage.addEventListener("click", () => {
      searchInput.value = name;
      searchPokemon();
    });

    evolutionContainer.appendChild(stage);

    //adding an arrow between stages but not after the final evolution
    if (i < chain.length - 1) {
      const arrow = document.createElement("div");
      arrow.className = "evolution-arrow";
      evolutionContainer.appendChild(arrow);
    }
  }
}

//toggling the compare Mode OFF/ON:

function toggleCompareMode() {
  compareMode = !compareMode;

  compareBtn.classList.toggle("active", compareMode);

  const cardsWrapper = document.getElementById("cards-wrapper");
  const container = document.querySelector(".container");

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
    document.getElementById("cards-wrapper").classList.remove("comparing");

    if (currentPokemon) displayPokemon(currentPokemon);
  } else {
    shinyBtn.classList.add("hidden");
    favoriteBtn.classList.add("hidden");
    evolutionSection.classList.add("hidden");
    container.classList.remove("comparing");
    evolutionContainer.classList.add("hidden");
    container.classList.add("comparing");
    cardsWrapper.classList.add("comparing");
    compareHint.classList.remove("hidden");
    teamBtn.classList.add("hidden");
    compareHint.textContent = currentPokemon
      ? `⚔️ Now search a second Pokémon to compare with ${currentPokemon.name}`
      : "⚔️ Search a Pokémon to start comparing";
  }
}

//now to display the compared pokemon

function displayComparedPokemon(pokemon) {
  errorDiv.classList.add("hidden");

  if (pokemon.id === currentPokemon.id) {
    errorDiv.textContent = "Choose a different Pokémon to compare.";
    errorDiv.classList.remove("hidden");
    return;
  }

  comparePokemon = pokemon;

  compareImg.src =
    pokemon.sprites.other["official-artwork"].front_default ||
    pokemon.sprites.front_default;

  compareName.textContent = pokemon.name;
  compareId.textContent = `#${String(pokemon.id).padStart(3, "0")}`;

  compareTypes.innerHTML = pokemon.types
    .map(
      (t) =>
        `<span class="type" style="background-color:${typeColors[t.type.name] || "#777"}">${t.type.name}</span>`,
    )
    .join("");

  compareStats.innerHTML = mainStats
    .map((statName) => {
      const stat = pokemon.stats.find((s) => s.stat.name === statName);
      if (!stat) return "";
      return `
         <div class="stat">
           <span class="stat-name">${statName}</span>
           <div class="stat-bar">
             <div class="stat-bar-fill" style="width:${(stat.base_stat / 255) * 100}%"></div>
           </div>
           <span class="stat-value">${stat.base_stat}</span>
         </div>
        `;
    })
    .join("");

  compareCard.classList.remove("hidden");

  highlightStats();

  compareHint.textContent = `${currentPokemon.name} vs ${comparePokemon.name}`;
}

//we are going to loop through the stats and compare them after both pokemon are loaded

const mainStats = [
  "hp",
  "attack",
  "defense",
  "speed",
  "special-attack",
  "special-defense",
];

function highlightStats() {
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

    p1Bar.classList.toggle("win", p1Wins);
    p1Bar.classList.toggle("lose", !p1Wins);
    p2Bar.classList.toggle("win", !p1Wins);
    p2Bar.classList.toggle("lose", p1Wins);
  });
}

compareBtn.addEventListener("click", toggleCompareMode);

//storing the 5 latest searches locally:

const STORAGE_KEY = "pokemon_history";
const MAX_ITEMS = 5;

function saveToHistory(query) {
  const existingData = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

  const uniqueItems = [...new Set([query, ...existingData])];

  const trimmedItems = uniqueItems.slice(0, MAX_ITEMS);

  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedItems));
}

function renderHistory() {
  const history = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

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
}
renderFavorites();
renderHistory();
renderTeam();
