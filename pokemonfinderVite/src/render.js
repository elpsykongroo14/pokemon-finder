//pure helpers that turn a pokemon object into DOM content.
//every function here takes (pokemon, target) - no default target,
//no implicit "which element am i writing to" guessing.
//caller always says exactly where the result goes. thats what lets both main.js's own card and comparemode.js's card reuse the exact same rendering logic

import { getSpriteUrl } from "./sprites";

//main.js's card and compareMode's card both render stats in this order
//which is the only reason index-based comparison between the two cards (in compareMode.js) is safe to do

export const mainStats = [
  "hp",
  "attack",
  "defense",
  "speed",
  "special-attack",
  "special-defense",
];

const MAX_STAT = 225;

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

export function renderSprite(pokemon, target) {
  target.src = getSpriteUrl(pokemon.sprites);
}

export function renderTypes(pokemon, target) {
  target.textContent = ""; //clear whatever was rendered last time

  const fragment = document.createDocumentFragment();

  pokemon.types.forEach((t) => {
    const typeName = t.type.name;
    const chip = document.createElement("span");
    chip.className = "type";
    chip.style.backgroundColor = typeColors[typeName] || "#777";
    chip.textContent = typeName;
    fragment.appendChild(chip);
  });

  target.appendChild(fragment);
}

//helper function that captures the repeated shape of renderMeta
function makeMetaRow(key, value, extraClass) {
  const row = document.createElement("tr");

  const keyCell = document.createElement("td");
  keyCell.className = "meta-key";
  keyCell.textContent = key;

  const valCell = document.createElement("td");
  valCell.className = extraClass ? `meta-val ${extraClass}` : "meta-val";
  valCell.textContent = value;

  row.appendChild(keyCell);
  row.appendChild(valCell);
  return row;
}

export function renderMeta(pokemon, target) {
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

  const table = document.createElement("table");
  table.className = "meta-table";
  const tbody = document.createElement("tbody");

  tbody.appendChild(makeMetaRow("Height", `${heightM} m`));
  tbody.appendChild(makeMetaRow("Weight", `${weightKg} kg`));
  tbody.appendChild(makeMetaRow("Abilities", normalAbilities));

  if (hiddenAbility) {
    tbody.appendChild(
      makeMetaRow("Hidden", hiddenAbility.ability.name, "hidden-ability"),
    );
  }

  table.appendChild(tbody);
  target.textContent = "";
  target.appendChild(table);
}

export function renderStats(pokemon, target) {
  //driven by the mainStats array, not pokemon.stats' own order
  //this guarantees index 0 is always hp, index 3 is always speed etc...
  //which is the guarantee highlighStat() depends on to compare bars by index between two cards
  target.textContent = "";
  const fragment = document.createDocumentFragment();

  mainStats.forEach((statName) => {
    const stat = pokemon.stats.find((s) => s.stat.name === statName);
    if (!stat) return;

    const row = document.createElement("div");
    row.className = "stat";

    const nameSpan = document.createElement("span");
    nameSpan.className = "stat-name";
    nameSpan.textContent = statName;

    const barOuter = document.createElement("div");
    barOuter.className = "stat-bar";

    const barFill = document.createElement("div");
    barFill.className = "stat-bar-fill";
    barFill.style.width = `${(stat.base_stat / MAX_STAT) * 100}%`;
    barOuter.appendChild(barFill);

    const valueSpan = document.createElement("span");
    valueSpan.className = "stat-value";
    valueSpan.textContent = stat.base_stat;

    row.appendChild(nameSpan);
    row.appendChild(barOuter);
    row.appendChild(valueSpan);
    fragment.appendChild(row);
  });

  target.appendChild(fragment);
}

//rendering the type effectiveness
//target: the dom element to render into
//it defaults to primary card's element so existing calls like renderTypeEffectiveness(pokemon) still work without passing a second argument
export function renderTypeEffectiveness(pokemon, target) {
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

  target.textContent = "";

  const nonEmptyGroups = Object.entries(groups).filter(
    ([, types]) => types.length > 0,
  );
  if (nonEmptyGroups.length === 0) return;

  const heading = document.createElement("h3");
  heading.className = "section-label";
  heading.textContent = "Type Matchups";
  target.appendChild(heading);

  nonEmptyGroups.forEach(([mult, types]) => {
    const { text, color } = labels[mult];

    const row = document.createElement("div");
    row.className = "effectiveness-label";

    const label = document.createElement("span");
    label.className = "effectiveness-label";
    label.style.color = color;
    label.textContent = text;

    const chipContainer = document.createElement("div");
    chipContainer.className = "effectiveness-types";

    types.forEach((t) => {
      const chip = document.createElement("span");
      chip.className = "type";
      chip.style.backgroundColor = typeColors[t] || "#777";
      chip.textContent = t;
      chipContainer.appendChild(chip);
    });

    row.appendChild(label);
    row.appendChild(chipContainer);
    target.appendChild(row);
  });
}
