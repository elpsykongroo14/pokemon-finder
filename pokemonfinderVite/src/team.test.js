import { describe, it, expect, beforeEach, vi } from "vitest";

function makePokemon(name, id) {
  return { name, id, sprites: { front_default: `${name}.png` } };
}

describe("team.js", () => {
  let team; //will hold the freshly imported team.js module
  let state; //will hold the freshly imported state.js module

  beforeEach(async () => {
    localStorage.clear();

    document.body.innerHTML = `
      <button id="team-btn"></button>
      <div id="team-slots"></div>
      <div id="error" class="hidden"></div>
    `;

    vi.resetModules();
    state = await import("./state.js");
    team = await import("./team.js");
  });

  it("renders 6 empty slots when the team is empty", () => {
    //Arrange - nothing to set up, localStorage is already empty from beforeEach

    //Act
    team.renderTeam();

    //Assert
    const slots = document.querySelectorAll("#team-slots .team-slot");
    expect(slots.length).toBe(6);

    const filled = document.querySelectorAll("#team-slots .team-slot.filled");
    expect(filled.length).toBe(0);
  });

  it("clicking the team button adds the current pokemon and updates the button", () => {
    //Arrange
    const pikachu = makePokemon("pikachu", 25);
    state.setCurrentPokemon(pikachu);
    team.initTeam(() => {}); //wires up the click listener on team-btn

    //Act
    document.getElementById("team-btn").click();

    //Assert
    const teamBtn = document.getElementById("team-btn");
    expect(teamBtn.textContent).toBe("On Team!");
    expect(teamBtn.classList.contains("on-team")).toBe(true);

    const filled = document.querySelectorAll("#team-slots .team-slot.filled");

    expect(filled.length).toBe(1);
  });

  it("shows an error and auto-hides it after 3 seconds when the team is full", async () => {
    //Arrange
    const storeModule = await import("./store.js");
    for (let i = 0; i < 6; i++) {
      storeModule.addToTeam(makePokemon(`pokemon${i}`, i));
    }

    const seventhPokemon = makePokemon("pikachu", 25);
    state.setCurrentPokemon(seventhPokemon);
    team.initTeam(() => {});

    vi.useFakeTimers();

    //Act
    document.getElementById("team-btn").click();

    //Assert: error shows immediately
    const errorDiv = document.getElementById("error");
    expect(errorDiv.textContent).toBe("Team is full");
    expect(errorDiv.classList.contains("hidden")).toBe(false);

    //Act again: fast-forward 3 seconds
    vi.advanceTimersByTime(3000);

    //Assert: error is now hidden
    expect(errorDiv.classList.contains("hidden")).toBe(true);
  });

  it("clicking the remove button removes that pokemon from the team", async () => {
    //Arrange
    const storeModule = await import("./store.js");
    storeModule.addToTeam(makePokemon("pikachu", 25));
    team.renderTeam(); //builds the slot DOM + attaches the remove-button listener

    //Act
    document.querySelector(".remove-team").click();

    //Assert
    const filled = document.querySelectorAll("#team-slots .team-slot.filled");
    expect(filled.length).toBe(0);

    const team2 = storeModule.getTeam();
    expect(team2.length).toBe(0);
  });
});
