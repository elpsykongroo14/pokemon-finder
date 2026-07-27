//same shape as favorites.js
import {
  getTeam,
  addToTeam,
  removeFromTeam,
  isOnTeam,
  MAX_TEAM,
} from "./store";

import { getCurrentPokemon } from "./state";

import { requireElement } from "./dom";

const teamBtn = requireElement<HTMLButtonElement>("team-btn");
const teamSlots = requireElement<HTMLElement>("team-slots");
const errorDiv = requireElement<HTMLElement>("error");
//set once by initTeam() - same circular import workaround as favorites.js
//this lets this module ask "go search for this pokemon" without
//importing searchPokemon directly from main.js
let onSelectPokemon: (name: string) => void = () => {};

function toggleTeam(): void {
  const currentPokemon = getCurrentPokemon();
  if (!currentPokemon) return;

  if (isOnTeam(currentPokemon.name)) {
    removeFromTeam(currentPokemon.name);
  } else {
    const result = addToTeam(currentPokemon);
    if ("error" in result) {
      errorDiv.textContent = result.error;
      errorDiv.classList.remove("hidden");
      setTimeout(() => errorDiv.classList.add("hidden"), 3000);
      return;
    }
  }

  renderTeam();
  updateTeamBtn();
}

export function initTeam(onSelect: (name: string) => void): void {
  onSelectPokemon = onSelect;
  teamBtn.addEventListener("click", toggleTeam);
}

//updating the button text and style depending on if a pokemon is on the team or not
export function updateTeamBtn(): void {
  const currentPokemon = getCurrentPokemon();
  if (!currentPokemon) return;

  const onTeam = isOnTeam(currentPokemon.name);
  teamBtn.textContent = onTeam ? "On Team!" : "+ Add to Team";
  teamBtn.classList.toggle("on-team", onTeam);
}

export function renderTeam(): void {
  const team = getTeam();
  teamSlots.textContent = "";

  const fragment = document.createDocumentFragment();

  for (let i = 0; i < MAX_TEAM; i++) {
    const slot = document.createElement("div");
    slot.className = "team-slot";

    const memeber = team[i];
    if (memeber) {
      slot.classList.add("filled");

      const img = document.createElement("img");
      img.src = memeber.sprite ?? "";
      img.alt = memeber.name;

      const removeBtn = document.createElement("button");
      removeBtn.className = "remove-team";
      removeBtn.textContent = "X";

      img.addEventListener("click", () => {
        onSelectPokemon(memeber.name);
      });

      removeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        removeFromTeam(memeber.name);
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
