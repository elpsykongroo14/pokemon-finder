//same shape as favorites.js
let onSelectPokemon = () => {};

export function initTeam(onSelect) {
  onSelectPokemon = onSelect;
  teamBtn.addEventListener("click", toggleTeam);
}
