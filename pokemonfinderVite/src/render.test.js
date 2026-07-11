import { describe, it, expect } from "vitest";
import {
  renderSprite,
  renderTypes,
  renderMeta,
  renderStats,
  renderTypeEffectiveness,
  mainStats,
} from "./render.js";

function makePokemon(overrides = {}) {
  return {
    sprites: {
      front_default: "basic.png",
      other: { "official-artwork": { front_default: "artwork.png" } },
    },
    types: [{ type: { name: "fire" } }, { type: { name: "flying" } }],
    height: 7,
    weight: 690,
    abilities: [
      { ability: { name: "blaze" }, is_hidden: false },
      { ability: { name: "solar-power" }, is_hidden: true },
    ],
    // deliberately out of mainStats order, to prove renderStats doesn't trust it
    stats: [
      { stat: { name: "speed" }, base_stat: 100 },
      { stat: { name: "hp" }, base_stat: 78 },
      { stat: { name: "defense" }, base_stat: 78 },
      { stat: { name: "attack" }, base_stat: 84 },
      { stat: { name: "special-defense" }, base_stat: 85 },
      { stat: { name: "special-attack" }, base_stat: 109 },
    ],
    ...overrides,
  };
}

describe("renderSprite", () => {
  it("sets target.src to the sprite URL", () => {
    const target = document.createElement("img");
    renderSprite(makePokemon(), target);
    expect(target.getAttribute("src")).toBe("artwork.png");
  });
});

describe("renderTypes", () => {
  it("renders a chip for each type", () => {
    const target = document.createElement("div");
    renderTypes(makePokemon(), target);
    //.toContain() checks the thing that matters (both type names showed up, styled as chips)
    //without coupling the test formatting
    expect(target.innerHTML).toContain("fire");
    expect(target.innerHTML).toContain("flying");
    expect(target.innerHTML).toContain('class="type"');
  });
});

describe("renderMeta", () => {
  it("renders height, weight and abilities", () => {
    const target = document.createElement("div");
    renderMeta(makePokemon(), target);
    //height: 7 becomes 0.7 m because the code does (pokemon.height / 10).toFixed(1)
    expect(target.innerHTML).toContain("0.7 m");
    expect(target.innerHTML).toContain("69.0 kg");
    expect(target.innerHTML).toContain("blaze");
    expect(target.innerHTML).toContain("solar-power");
  });

  it("omits the hidden-ability row when there is no hidden ability", () => {
    const target = document.createElement("div");
    const pokemon = makePokemon({
      abilities: [{ ability: { name: "blaze" }, is_hidden: false }],
    });
    renderMeta(pokemon, target);
    expect(target.innerHTML).not.toContain("Hidden");
  });
});

//this test matters the most this where we prove the index order guarantee, not just "does it render"
describe("renderStats", () => {
  it("renders stats in mainStats order regardless of input order", () => {
    const target = document.createElement("div");
    renderStats(makePokemon(), target);

    const positions = mainStats.map((name) => target.innerHTML.indexOf(name));
    for (let i = 1; i < positions.length; i++) {
      expect(positions[i]).toBeGreaterThan(positions[i - 1]);
    }
  });
});

describe("renderTypeEffectiveness", () => {
  it("groups weakness and resistance correctly for a single-type pokemon", () => {
    const target = document.createElement("div");
    const pokemon = makePokemon({ types: [{ type: { name: "ice" } }] });
    renderTypeEffectiveness(pokemon, target);

    expect(target.innerHTML).toContain("2× Weak");
    expect(target.innerHTML).toContain("fire");
    expect(target.innerHTML).toContain("fighting");
    expect(target.innerHTML).toContain("rock");
    expect(target.innerHTML).toContain("steel");
    expect(target.innerHTML).toContain("½× Resist");
    expect(target.innerHTML).toContain("ice");
  });

  it("shows an Immune row when a multiplier is 0", () => {
    const target = document.createElement("div");
    const pokemon = makePokemon({ types: [{ type: { name: "ghost" } }] });
    renderTypeEffectiveness(pokemon, target);

    expect(target.innerHTML).toContain("Immune");
    expect(target.innerHTML).toContain("normal");
    expect(target.innerHTML).toContain("fighting");
  });
});

describe("mainStats", () => {
  it("defines the canonical stat order every card depends on", () => {
    expect(mainStats).toEqual([
      "hp",
      "attack",
      "defense",
      "speed",
      "special-attack",
      "special-defense",
    ]);
  });
});
