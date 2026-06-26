import { describe, it, expect } from "vitest";
import { getSpriteUrl } from "./sprites.js";

describe("getSpriteUrl", () => {
  it("returns official artwork when it exists", () => {
    const sprites = {
      front_default: "basic.png",
      other: {
        "official-artwork": { front_default: "artwork.png" },
      },
    };
    expect(getSpriteUrl(sprites)).toBe("artwork.png");
  });
  it("falls back to basic sprite when official artwork is not available", () => {
    const sprites = { front_default: "basic.png", other: {} };
    expect(getSpriteUrl(sprites)).toBe("basic.png");
  });

  it("returns null when nothing is available", () => {
    expect(getSpriteUrl({})).toBeNull();
  });

  it("returns the shiny artwork when shiny is requested", () => {
    const sprites = {
      front_shiny: "basic-shiny.png",
      other: { "official-artwork": { front_shiny: "artwork-shiny.png" } },
    };
    expect(getSpriteUrl(sprites, { shiny: true })).toBe("artwork-shiny.png");
  });

  it("falls back to the basic shiny sprite when shiny artwork is missing", () => {
    const sprites = { front_shiny: "basic-shiny.png", other: {} };
    expect(getSpriteUrl(sprites, { shiny: true })).toBe("basic-shiny.png");
  });
});

//AAA:
//Arrange- build a plain object shaped like a real PokeAPI sprites payload, but tiny, only the fields the functions cares about
//Act- call getSpriteUrl(sprites)
//Assert- expect(...).toBe("artwork.png")
