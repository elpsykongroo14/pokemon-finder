//pure helpers that turn a pokemon object into DOM content.
//every function here takes (pokemon, target) - no default target,
//no implicit "which element am i writing to" guessing.
//caller always says exactly where the result goes. thats what lets both main.js's own card and comparemode.js's card reuse the exact same rendering logic

import { getSpriteUrl } from "./sprites.js";

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
  target.innerHTML = pokemon.types
    .map(
      (t) =>
        `<span class="type" style="background-color:${typeColors[t.type.name] || "#777"}">${t.type.name}</span>`,
    )
    .join("");
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

export function renderStats(pokemon, target) {
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
