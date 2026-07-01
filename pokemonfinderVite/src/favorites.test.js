import { describe, it, expect, beforeEach, vi } from "vitest";

function makePokemon(name, id) {
  return { name, id, sprites: { front_default: `${name}.png` } };
}

describe("favorites.js", () => {
  let favorites; //freshly imported favorites.js modules
  let state; //freshly imported state.js module

  beforeEach(async () => {
    localStorage.clear();

    document.body.innerHTML = `
      <button id="favorites-toggle"></button>
      <div id="favorites-drawer"></div>
      <div id="overlay" class="hidden"></div>
      <button id="close-drawer"></button>
      <button id="favorite-btn"></button>
      <div id="favorites-container"></div>
    `;

    vi.resetModules();
    state = await import("./state.js");
    favorites = await import("./favorites.js");
  });

  it("renders the empty message when there are no favorites", () => {
    //Arrange - localstorage already empty from beforeEach

    //Act
    favorites.renderFavorites();

    //Assert
    const container = document.getElementById("favorites-container");
    expect(container.textContent).toContain("No favorites yet");
    expect(container.querySelectorAll(".favorite-card").length).toBe(0);
  });

  it("clicking the favorite button adds the current pokemon and updates the button", () => {
    //Arrange
    const pikachu = makePokemon("pikachu", 25);
    state.setCurrentPokemon(pikachu);
    favorites.initFavorites(() => {});

    //Act
    document.getElementById("favorite-btn").click();

    //Assert
    const favoriteBtn = document.getElementById("favorite-btn");
    expect(favoriteBtn.textContent).toBe("❤️ in Favorites");
    expect(favoriteBtn.classList.contains("favorited")).toBe(true);
  });

  it("opens the drawer on toggle click, and closes it on overlay or close-button click", () => {
    //Arrange
    favorites.initFavorites(() => {});
    const drawer = document.getElementById("favorites-drawer");
    const overlay = document.getElementById("overlay");

    //Act: open
    document.getElementById("favorites-toggle").click();

    //Assert: open state
    expect(drawer.classList.contains("open")).toBe(true);
    expect(overlay.classList.contains("hidden")).toBe(false);

    //Act: close by clicking close-button
    document.getElementById("close-drawer").click();

    //Assert: closed again
    expect(drawer.classList.contains("open")).toBe(false);
    expect(overlay.classList.contains("hidden")).toBe(true);

    //Act: reopen, then close via the overlay this time
    document.getElementById("favorites-toggle").click();
    overlay.click();

    //Assert: closed again
    expect(drawer.classList.contains("open")).toBe(false);
  });

  it("clicking the remove button removes the favorite without triggering onSelectPokemon", () => {
    //Arrange
    const pikachu = makePokemon("pikachu", 25);
    state.setCurrentPokemon(pikachu);
    favorites.initFavorites(() => {}); //adds the favorite via the button below

    document.getElementById("favorite-btn").click(); //pikachu is no favorited

    favorites.renderFavorites(); //build the card + its listener

    const onSelectSpy = vi.fn();
    //re-init with a spy now that we actually want to observe selection
    favorites.initFavorites(onSelectSpy);
    favorites.renderFavorites(); //rebuild the card under the new callback

    //Act
    document.querySelector(".remove-favorite").click();

    //Assert: its gone
    expect(document.querySelectorAll(".favorite-card").length).toBe(0);

    //Assert: selecting was never triggered
    expect(onSelectSpy).not.toHaveBeenCalled();
  });

  it("clicking a favorite card calls onSelectPokemon and closes the drawer", () => {
    //Arrange
    const pikachu = makePokemon("pikachu", 25);
    state.setCurrentPokemon(pikachu);
    favorites.initFavorites(() => {});
    document.getElementById("favorite-btn").click(); //pikachu is now favorited

    document.getElementById("favorites-toggle").click(); //open drawer

    const onSelectSpy = vi.fn();
    favorites.initFavorites(onSelectSpy);
    favorites.renderFavorites();

    //Act: click the card itself, not the remove button
    document.querySelector(".favorite-card").click();

    //Assert
    expect(onSelectSpy).toHaveBeenCalledWith("pikachu");
    expect(
      document.getElementById("favorites-drawer").classList.contains("open"),
    ).toBe(false);
  });
});
