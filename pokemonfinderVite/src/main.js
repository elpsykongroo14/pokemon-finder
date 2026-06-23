import "./styles.css";

import {
  getTeam,
  addToTeam,
  removeFromTeam,
  isOnTeam,
  getHistory,
  saveToHistory,
  MAX_TEAM,
} from "./store.js";

import {
  fetchPokemon,
  fetchSpecies,
  fetchEvolutionChain,
  fetchTCGCards,
  fetchTCGCardsBatch,
  fetchAllpokemonNames,
} from "./api.js";

import { getSpriteUrl } from "./sprites.js";

import { setCurrentPokemon, getCurrentPokemon } from "./state.js";

import {
  initFavorites,
  renderFavorites,
  updateFavoriteBtn,
} from "./favorites.js";

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
const compareBtn = document.getElementById("compare-btn");
const compareHint = document.getElementById("compare-hint");
const compareCard = document.getElementById("compare-card");
const compareImg = document.getElementById("compareImg");
const compareName = document.getElementById("compareName");
const compareId = document.getElementById("compareId");
const compareTypes = document.getElementById("compareTypes");
const compareStats = document.getElementById("compareStats");
const evolutionSection = document.querySelector(".evolution-title");
const favoritesToggle = document.getElementById("favorites-toggle");
const favoriteBtn = document.getElementById("favorite-btn");
const teamStrip = document.getElementById("team-strip");
const teamSlots = document.getElementById("team-slots");
const teamBtn = document.getElementById("team-btn");
const flavorText = document.getElementById("flavor-text");
const pokemonMeta = document.getElementById("pokemon-meta");
const typeEffectiveness = document.getElementById("type-effectiveness");
const tcgBtn = document.getElementById("tcg-btn");
const compareTypeEffectiveness = document.getElementById(
  "compare-type-effectiveness",
);
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

// this is the types effectiveness, the data is static so we keep it in the code to avoid unnecessary network round trips
// "double" means 2× damage to those types
// "half"   means 0.5× damage to those types
// "immune" means 0× damage to those types
// Omitted = 1× (normal damage)
const TYPE_CHART = {
  normal: { immune: ["ghost"], half: ["rock", "steel"] },
  fire: {
    double: ["grass", "ice", "bug", "steel"],
    half: ["fire", "water", "rock", "dragon"],
  },
  water: {
    double: ["fire", "ground", "rock"],
    half: ["water", "grass", "dragon"],
  },
  electric: {
    double: ["water", "flying"],
    half: ["electric", "grass", "dragon"],
    immune: ["ground"],
  },
  grass: {
    double: ["water", "ground", "rock"],
    half: ["fire", "grass", "poison", "flying", "bug", "dragon", "steel"],
  },
  ice: {
    double: ["grass", "ground", "flying", "dragon"],
    half: ["water", "ice", "steel"],
  },
  fighting: {
    double: ["normal", "ice", "rock", "dark", "steel"],
    half: ["poison", "flying", "psychic", "bug", "fairy"],
    immune: ["ghost"],
  },
  poison: {
    double: ["grass", "fairy"],
    half: ["poison", "ground", "rock", "ghost"],
    immune: ["steel"],
  },
  ground: {
    double: ["fire", "electric", "poison", "rock", "steel"],
    half: ["grass", "bug"],
    immune: ["flying"],
  },
  flying: {
    double: ["grass", "fighting", "bug"],
    half: ["electric", "rock", "steel"],
  },
  psychic: {
    double: ["fighting", "poison"],
    half: ["psychic", "steel"],
    immune: ["dark"],
  },
  bug: {
    double: ["grass", "psychic", "dark"],
    half: ["fire", "fighting", "poison", "flying", "ghost", "steel", "fairy"],
  },
  rock: {
    double: ["fire", "ice", "flying", "bug"],
    half: ["fighting", "ground", "steel"],
  },
  ghost: {
    double: ["psychic", "ghost"],
    half: ["dark"],
    immune: ["normal", "fighting"],
  },
  dragon: { double: ["dragon"], half: ["steel"], immune: ["fairy"] },
  dark: {
    double: ["psychic", "ghost"],
    half: ["fighting", "dark", "fairy"],
    immune: [],
  },
  steel: {
    double: ["ice", "rock", "fairy"],
    half: ["fire", "water", "electric", "steel"],
  },
  fairy: {
    double: ["fighting", "dragon", "dark"],
    half: ["fire", "poison", "steel"],
  },
};

const mainStats = [
  "hp",
  "attack",
  "defense",
  "speed",
  "special-attack",
  "special-defense",
];
const MAX_POKEMON = 1025;
const MAX_STAT = 255;

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

//initially we aren't comparing any pokemon
let compareMode = false;
let comparePokemon = null;

//initially we aren't displaying any shiny sprites
let isShiny = false;
let currentSprites = null;

//working on functionality of add to team button
function toggleTeam() {
  const currentPokemon = getCurrentPokemon();
  if (!currentPokemon) return;

  if (isOnTeam(currentPokemon.name)) {
    removeFromTeam(currentPokemon.name);
  } else {
    const result = addToTeam(currentPokemon);
    if (result.error) {
      errorDiv.textContent = result.error;
      errorDiv.classList.remove("hidden");
      setTimeout(() => errorDiv.classList.add("hidden"), 3000);
      return;
    }
  }

  renderTeam();
  updateTeamBtn();
}

teamBtn.addEventListener("click", toggleTeam);

//updating the button text and style depending on if a pokemon is on the team or not
function updateTeamBtn() {
  const currentPokemon = getCurrentPokemon();
  if (!currentPokemon) return;

  const onTeam = isOnTeam(currentPokemon.name);
  teamBtn.textContent = onTeam ? "On Team!" : "+ Add to Team";
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
        removeFromTeam(team[i].name);
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

  if (!compareMode) {
    pokemonCard.classList.add("hidden");
  }
  errorDiv.classList.add("hidden");
  spinner.classList.remove("hidden");

  try {
    const pokemon = await fetchPokemon(searchQuery);

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

//---pure rendering functions
//each of these takes a pokemon object and (optionally) a target DOM element
//it does exactly one job: turns data into DOM. no state mutation, no fetches and no side effects outside the element handed

function renderSprite(pokemon, target = pokemonImg) {
  target.src = getSpriteUrl(pokemon.sprites);
}

function renderTypes(pokemon, target = pokemonTypes) {
  target.innerHTML = pokemon.types
    .map(
      (t) =>
        `<span class="type" style="background-color:${typeColors[t.type.name] || "#777"}">${t.type.name}</span>`,
    )
    .join("");
}

function renderMeta(pokemon, target = pokemonMeta) {
  //displaying the physical info
  const heightM = (pokemon.height / 10).toFixed(1);
  const weightKg = (pokemon.weight / 10).toFixed(1);

  //abilities separate normal from hidden
  //is_hidden is a boolean provided by the api
  const normalAbilities = pokemon.abilities
    .filter((a) => !a.is_hidden)
    .map((a) => a.ability.name)
    .join(", ");

  const hiddenAbility = pokemon.abilities.find((a) => a.is_hidden);

  target.innerHTML = `
  <table class="meta-table">
    <tbody>
      <tr>
        <td class="meta-key">Height</td>
        <td class="meta-val">${heightM} m</td>
      </tr>
      <tr>
        <td class="meta-key">Weight</td>
        <td class="meta-val">${weightKg} kg</td>
      </tr>
      <tr>
        <td class="meta-key">Abilities</td>
        <td class="meta-val">${normalAbilities}</td>
      </tr>
      ${
        hiddenAbility
          ? `
      <tr>
        <td class="meta-key">Hidden</td>
        <td class="meta-val hidden-ability">${hiddenAbility.ability.name}</td>
      </tr>`
          : ""
      }
    </tbody>
  </table>
`;
}

function renderStats(pokemon, target = pokemonStats) {
  //driven by the mainStats array, not pokemon.stats' own order
  //this guarantees index 0 is always hp, index 3 is always speed etc...
  //which is the guarantee highlighStat() depends on to compare bars by index between two cards
  target.innerHTML = mainStats
    .map((statName) => {
      const stat = pokemon.stats.find((s) => s.stat.name === statName);
      if (!stat) return;
      return `
       <div class="stat">
        <span class="stat-name">${statName}</span>
        <div class="stat-bar">
         <div class= "stat-bar-fill" style="width: ${(stat.base_stat / MAX_STAT) * 100}%"></div>
        </div>
        <span class= "stat-value">${stat.base_stat}</span>
       </div>
      `;
    })
    .join("");
}

//displaying the pokemon

function displayPokemon(pokemon) {
  //rendering: pokemon data -> DOM
  renderSprite(pokemon);
  pokemonName.textContent = pokemon.name;
  renderTypes(pokemon);
  renderMeta(pokemon);
  renderStats(pokemon);
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
  renderTypeEffectiveness(pokemon);

  pokemonCard.classList.remove("hidden");
}

//now to work on the type's weaknesses and strengths
//we are going to compute how much damage each attacking type deals
function computeDefensiveChart(pokemonTypes) {
  //starting every attacking type at 1x multiplier
  const multipliers = {};
  Object.keys(TYPE_CHART).forEach((type) => {
    multipliers[type] = 1;
  });

  //for each of the types (could be 1 or 2)
  //loop through every attacking type and adjust the multiplier
  pokemonTypes.forEach((defendingType) => {
    Object.keys(TYPE_CHART).forEach((attackingType) => {
      const chart = TYPE_CHART[attackingType];

      if (chart.double?.includes(defendingType)) {
        //deals 2x against this defending type
        multipliers[attackingType] *= 2;
      } else if (chart.half?.includes(defendingType)) {
        //deals 0.5x against this defending type
        multipliers[attackingType] *= 0.5;
      } else if (chart.immune?.includes(defendingType)) {
        multipliers[attackingType] *= 0; // 0x = immune;
      }
      //if its not listed, multiplier stays at 1x
    });
  });
  return multipliers;
}

//rendering the type effectiveness
//target: the dom element to render into
//it defaults to primary card's element so existing calls like renderTypeEffectiveness(pokemon) still work without passing a second argument
function renderTypeEffectiveness(pokemon, target = typeEffectiveness) {
  const pokemonTypes = pokemon.types.map((t) => t.type.name);
  const multipliers = computeDefensiveChart(pokemonTypes);

  //group the types by their multiplier value
  const groups = { 4: [], 2: [], 0.5: [], 0.25: [], 0: [] };

  Object.entries(multipliers).forEach(([type, mult]) => {
    if (mult === 4) groups[4].push(type);
    if (mult === 2) groups[2].push(type);
    if (mult === 0.5) groups[0.5].push(type);
    if (mult === 0.25) groups[0.25].push(type);
    if (mult === 0) groups[0].push(type);
  });

  //only rendering groups in HTML
  const labels = {
    4: { text: "4× Weak", color: "#e74c3c" },
    2: { text: "2× Weak", color: "#e8754a" },
    0.5: { text: "½× Resist", color: "#4a9eff" },
    0.25: { text: "¼× Resist", color: "#3a7fd4" },
    0: { text: "Immune", color: "#545a6e" },
  };

  const rows = Object.entries(groups)
    .filter(([, types]) => types.length > 0)
    .map(([mult, types]) => {
      const { text, color } = labels[mult];
      const chips = types
        .map(
          (t) =>
            `<span class="type" style="background-color:${typeColors[t] || "#777"}">${t}</span>`,
        )
        .join("");
      return `
        <div class="effectiveness-row">
          <span class="effectiveness-label" style="color:${color}">${text}</span>
          <div class="effectiveness-types">${chips}</div>
        </div>`;
    })
    .join("");

  target.innerHTML = rows
    ? `<h3 class= "section-label">Type Matchups</h3>${rows}`
    : "";
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
    evolutionContainer.innerHTML = "";
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

//toggling the compare Mode OFF/ON:

function toggleCompareMode() {
  const currentPokemon = getCurrentPokemon();
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

    flavorText.classList.remove("hidden");
    pokemonMeta.classList.remove("hidden");
    typeEffectiveness.classList.remove("hidden");
    tcgBtn.classList.remove("hidden");
    compareTypeEffectiveness.innerHTML = "";

    if (currentPokemon) displayPokemon(currentPokemon);
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

function displayComparedPokemon(pokemon) {
  const currentPokemon = getCurrentPokemon();
  errorDiv.classList.add("hidden");

  if (pokemon.id === currentPokemon.id) {
    errorDiv.textContent = "Choose a different Pokémon to compare.";
    errorDiv.classList.remove("hidden");
    return;
  }

  comparePokemon = pokemon;

  renderSprite(pokemon, compareImg);
  compareName.textContent = pokemon.name;
  compareId.textContent = `#${String(pokemon.id).padStart(3, "0")}`;
  renderTypes(pokemon, compareTypes);
  renderStats(pokemon, compareStats);

  compareCard.classList.remove("hidden");

  highlightStats();

  renderTypeEffectiveness(pokemon, compareTypeEffectiveness);

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

    p1Bar.classList.toggle("win", p1Wins);
    p1Bar.classList.toggle("lose", !p1Wins);
    p2Bar.classList.toggle("win", !p1Wins);
    p2Bar.classList.toggle("lose", p1Wins);
  });
}

compareBtn.addEventListener("click", toggleCompareMode);

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
initFavorites((name) => {
  searchInput.value = name;
  searchPokemon();
});

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
