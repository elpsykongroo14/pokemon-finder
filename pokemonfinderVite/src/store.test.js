import { describe, it, expect, beforeEach } from "vitest";
import {
  getFavorites,
  addFavorite,
  removeFavorite,
  isFavorite,
  getTeam,
  addToTeam,
  removeFromTeam,
  isOnTeam,
  MAX_TEAM,
  getHistory,
  saveToHistory,
} from "./store";

function makePokemon(name, id) {
  return { name, id, sprites: { front_default: `${name}.png` } };
}

//basically means "start empty", it runs this reset function before every it() in the file
beforeEach(() => {
  localStorage.clear();
});

describe("favorites", () => {
  it("starts empty", () => {
    expect(getFavorites()).toEqual([]);
  });

  it("adds a favorite", () => {
    addFavorite(makePokemon("pikachu", 25));
    expect(isFavorite("pikachu")).toBe(true);
    expect(getFavorites()).toHaveLength(1);
  });

  it("does not add the same favorite twice", () => {
    addFavorite(makePokemon("pikachu", 25));
    addFavorite(makePokemon("pikachu", 25));
    expect(getFavorites()).toHaveLength(1);
  });

  it("removes a favorite", () => {
    addFavorite(makePokemon("pikachu", 25));
    removeFavorite("pikachu");
    expect(getFavorites()).toEqual([]);
  });
});

describe("team", () => {
  it("adds a pokemon to the team", () => {
    const result = addToTeam(makePokemon("charmander", 4));
    expect(result).toEqual({ ok: true });
    expect(isOnTeam("charmander")).toBe(true);
  });

  it("refuses to add the same pokemon twice", () => {
    addToTeam(makePokemon("charmander", 4));
    const result = addToTeam(makePokemon("charmander", 4));
    expect(result).toEqual({ error: "Already on team" });
    expect(getTeam()).toHaveLength(1);
  });

  it("refuses to add a 7th pokemon once the team is full", () => {
    for (let i = 0; i < MAX_TEAM; i++) addToTeam(makePokemon(`mon-${i}`, i));
    const result = addToTeam(makePokemon("overflow", 999));
    expect(result).toEqual({ error: "Team is full" });
    expect(getTeam()).toHaveLength(MAX_TEAM);
  });

  it("removes a pokemon from the team", () => {
    addToTeam(makePokemon("charmander", 4));
    removeFromTeam("charmander");
    expect(isOnTeam("charmander")).toBe(false);
  });
});

describe("history", () => {
  it("saves a search query", () => {
    saveToHistory("pikachu");
    expect(getHistory()).toEqual(["pikachu"]);
  });

  it("puts the newest query first and removes duplicates", () => {
    (saveToHistory("pikachu"), saveToHistory("charmander"));
    (saveToHistory("pikachu"),
      expect(getHistory()).toEqual(["pikachu", "charmander"]));
  });

  it("keeps only the most recent 5 entries", () => {
    for (let i = 0; i < 7; i++) saveToHistory(`mon-${i}`);
    expect(getHistory()).toHaveLength(5);
    expect(getHistory()[0]).toBe("mon-6");
  });
});
