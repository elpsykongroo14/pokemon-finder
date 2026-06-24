//same shape as favorites.js
import {
  getTeam,
  addToTeam,
  removeFromTeam,
  isOnTeam,
  MAX_TEAM,
} from "./store.js";

import { getCurrentPokemon } from "./state.js";

const teamBtn = document.getElementById("team-btn");
const teamSlots = document.getElementById("team-slots");
const erroDiv = document.getElementById("error");

//set once by initTeam() - same circular import workaround as favorites.js
//this lets this module ask "go search for this pokemon" without
//importing searchPokemon directly from main.js
let onSelectPokemon = () => {};

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

//updating the button text and style depending on if a pokemon is on the team or not
export function updateTeamBtn() {
  const currentPokemon = getCurrentPokemon();
  if (!currentPokemon) return;

  const onTeam = isOnTeam(currentPokemon.name);
  teamBtn.textContent = onTeam ? "On Team!" : "+ Add to Team";
  teamBtn.classList.toggle("on-team", onTeam);
}

export function renderTeam() {
  const team = getTeam();
  teamSlots.innerHTML = "";

  for (let i = 0; i < MAX_TEAM; i++) {
    const slot = document.createElement("div");
    slot.className = "team-slot";

    if (team[i]) {
      slot.classList.add("filled");
      slot.innerHTML = `
            <img src="${team[i].sprite}" alt="${team[i].name}" />
            <button class="remove-team">X</button>
            `;

      // was: searchInput.value = team[i].name; searchPokemon();
      // now: hand the name to whatever main.js told us "select" means
      slot.querySelector("img").addEventListener("click", () => {
        onSelectPokemon(team[i].name);
      });

      //event to remove pokemon from team
      slot.querySelector(".remove-team").addEventListener("click", (e) => {
        e.stopPropagation();
        removeFromTeam(team[i].name);
        renderTeam();
        updateTeamBtn();
      });
    } else {
      slot.innerHTML = `<span class="slot-empty">+</span>`;
    }
    teamSlots.appendChild(slot);
  }
  updateTeamBtn();
}

//main.js calls this once, on startup handing us the piece of
//behavior we cant own ourselves:
//what "select this pokemon" means
export function initTeam(onSelect) {
  onSelectPokemon = onSelect;
  teamBtn.addEventListener("click", toggleTeam);
}
