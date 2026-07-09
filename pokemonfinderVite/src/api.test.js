import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchPokemon,
  fetchSpecies,
  fetchTCGCards,
  fetchTCGCardsBatch,
  clearPokeCache,
} from "./api.js";

function fakeResponse(ok, body) {
  return { ok, status: ok ? 200 : 404, json: async () => body };
}

beforeEach(() => {
  global.fetch = vi.fn(); //a fresh mock for every test - no leftover behavior
  clearPokeCache(); //a fresh cache for every test- no leftover data
});

describe("fetchPokemon", () => {
  it("returns parsed JSON on success", async () => {
    global.fetch.mockResolvedValue(
      fakeResponse(true, { name: "pikachu", id: 25 }),
    );
    const data = await fetchPokemon("pikachu");
    expect(data).toEqual({ name: "pikachu", id: 25 });
  });

  it("calls the correct pokeAPI url, lowercased and trimmed", async () => {
    global.fetch.mockResolvedValue(fakeResponse(true, { name: "pikachu" }));
    await fetchPokemon(" PIKACHU ");
    expect(global.fetch).toHaveBeenCalledWith(
      "https://pokeapi.co/api/v2/pokemon/pikachu",
      {},
    );
  });

  it("throws when the response is not ok", async () => {
    global.fetch.mockResolvedValue(fakeResponse(false, {}));
    await expect(fetchPokemon("not-a-real-pokemon")).rejects.toThrow(
      /HTTP 404/,
    );
  });

  it("does not call fetch twice for the same name (cache hit)", async () => {
    global.fetch.mockResolvedValue(
      fakeResponse(true, { name: "pikachu", id: 25 }),
    );
    await fetchPokemon("pikachu");
    await fetchPokemon("pikachu");
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});

describe("fetchSpecies", () => {
  it("forwards the given url as-is", async () => {
    global.fetch.mockResolvedValue(fakeResponse(true, { flavor: "text" }));
    await fetchSpecies("https://pokeapi.co/api/v2/pokemon-species/25/");
    expect(global.fetch).toHaveBeenCalledWith(
      "https://pokeapi.co/api/v2/pokemon-species/25/",
      {},
    );
  });
});

describe("fetchTCGCards", () => {
  it("returns the data array from the response", async () => {
    global.fetch.mockResolvedValue(
      fakeResponse(true, { data: [{ id: "card-1" }] }),
    );
    const cards = await fetchTCGCards("pikachu");
    expect(cards).toEqual([{ id: "card-1" }]);
  });

  it("returns an empty array when the response has no data field", async () => {
    global.fetch.mockResolvedValue(fakeResponse(true, {}));
    const cards = await fetchTCGCards("pikachu");
    expect(cards).toEqual([]);
  });

  it("percent-encodes special characters instead of injecting new params", async () => {
    global.fetch.mockResolvedValue(fakeResponse(true, { data: [] }));
    await fetchTCGCards("pikachu&pageSize=1");
    const calledUrl = global.fetch.mock.calls[0][0];
    expect(calledUrl).not.toContain('&pageSize=1"');
    expect(calledUrl).toContain("pikachu%26pageSize%3D1");
  });
});

describe("fetchTCGCardsBatch", () => {
  it("flattens results from multiple names into one array", async () => {
    global.fetch
      .mockResolvedValueOnce(fakeResponse(true, { data: [{ id: "pika-1" }] }))
      .mockResolvedValueOnce(fakeResponse(true, { data: [{ id: "char-1" }] }));
    const cards = await fetchTCGCardsBatch(["pikachu", "charmander"]);
    expect(cards).toEqual([{ id: "pika-1" }, { id: "char-1" }]);
  });

  it("swallows a single failed name instead of rejecting the whole batch", async () => {
    global.fetch
      .mockResolvedValueOnce(fakeResponse(true, { data: [{ id: "pika-1" }] }))
      .mockResolvedValueOnce(fakeResponse(false, {}));
    const cards = await fetchTCGCardsBatch(["pikachu", "charmander"]);
    expect(cards).toEqual([{ id: "pika-1" }]);
  });
});

//vi.fn() creates a "mock function" that records every call made to it and replaces the browser's real fetch with this recording fake, for the lifetime of a test
//.mockResolvedValue(x) scripts the mock to always return a promise that resolves to x - perfect for stubbing an async function's return value
//.mockResolvedValueOnce(x) is the same idea but only for the next call — used in fetchTCGCardsBatch because that function calls fetch twice
//toHaveBeenCalledWith(...) asks "was this mock called exctly as these arguments at some point"
//rejects.toThrow(/HTTP 404/) is the async-aware way to assert a promise rejects, optionally matching the error message agaisnt a regex
