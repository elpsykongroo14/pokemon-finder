//same shape as favorites.js
import {
  getTeam,
  addToTeam,
  removeFromTeam,
  isOnTeam,
  MAX_TEAM,
} from "./store";

import { getCurrentPokemon } from "./state";

const teamBtn = document.getElementById("team-btn");
const teamSlots = document.getElementById("team-slots");
const errorDiv = document.getElementById("error");

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

export function initTeam(onSelect) {
  onSelectPokemon = onSelect;
  teamBtn.addEventListener("click", toggleTeam);
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
  teamSlots.textContent = "";

  const fragment = document.createDocumentFragment();

  for (let i = 0; i < MAX_TEAM; i++) {
    const slot = document.createElement("div");
    slot.className = "team-slot";

    if (team[i]) {
      slot.classList.add("filled");

      const img = document.createElement("img");
      img.src = team[i].sprite;
      img.alt = team[i].name;

      const removeBtn = document.createElement("button");
      removeBtn.className = "remove-team";
      removeBtn.textContent = "X";

      img.addEventListener("click", () => {
        onSelectPokemon(team[i].name);
      });

      removeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        removeFromTeam(team[i].name);
        renderTeam();
        updateTeamBtn();
      });

      slot.appendChild(img);
      slot.appendChild(removeBtn);
    } else {
      const emptySpan = document.createElement("span");
      emptySpan.className = "slot-empty";
      emptySpan.textContent = "+";
      slot.appendChild(emptySpan);
    }

    fragment.appendChild(slot);
  }

  teamSlots.appendChild(fragment);
  updateTeamBtn();
}
