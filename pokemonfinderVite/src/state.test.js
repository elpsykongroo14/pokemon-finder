import { describe, it, expect, beforeEach } from "vitest";
import { getCurrentPokemon, setCurrentPokemon, pushState } from "./state.js";

function makePokemon(name, id) {
  return { name, id };
}
describe("currentPokemon", () => {
  it("starts as null before anything is set", () => {});

  it("returns what was set", () => {
    setCurrentPokemon(makePokemon("pikachu", 25));
    expect(getCurrentPokemon()).toEqual(makePokemon("pikachu", 25));
  });

  it("overwrites the previous value on a second set", () => {
    setCurrentPokemon(makePokemon("pikachu", 25));
    setCurrentPokemon(makePokemon("charmander", 4));
    expect(getCurrentPokemon()).toEqual(makePokemon("charmander", 4));
  });
});

describe("pushState", () => {
  it("pushes the params onto the URL query string", () => {
    pushState({ pokemon: "pikachu" }, "Pikachu");
    expect(location.search).toBe("?pokemon=pikachu");
  });

  it("sets document.title using the given title", () => {
    pushState({ pokemon: "pikachu" }, "Pikachu");
    expect(document.title).toBe("Pikachu - Pokémon Finder");
  });

  it("stores the params as the history state object", () => {
    pushState({ pokemon: "pikachu", view: "card" }, "Pikachu");
    expect(history.state).toEqual({ pokemon: "pikachu", view: "card" });
  });
});
