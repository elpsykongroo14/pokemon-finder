import { describe, it, expect, beforeEach, vi } from "vitest";

function fakeResponse(ok, body) {
  return { ok, status: ok ? 200 : 404, json: async () => body };
}

//only the fields the module actually reads need to be present
function makeCard(id, { rarity = "Common", releaseDate = "2020/01/01" } = {}) {
  return {
    id,
    name: `Card ${id}`,
    images: { small: `${id}-small.png`, large: `${id}-large.png` },
    set: { name: "Test Set", releaseDate },
    rarity,
  };
}

describe("tcgLibrary.js", () => {
  let tcgLibrary;
  let state;

  beforeEach(async () => {
    document.body.innerHTML = `<button id="tcg-btn"></button>
      <div id="library-view" class="hidden">
        <button id="library-btn"></button>
        <button id="library-back"></button>
        <input id="library-search" />
        <button id="library-search-btn"></button>
        <select id="sort-select">
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="rarity">Rarity</option>
        </select>
        <div id="card-panel" class="hidden">
          <button id="card-panel-back"></button>
          <h2 id="card-panel-title"></h2>
          <div id="card-grid"></div>
        </div>
      </div>`;

    vi.resetModules();
    state = await import("./state.js");
    tcgLibrary = await import("./tcglibrary.js");

    //routes by URL rather than call order, so both endpoints tcgLibrary.js
    //hits (the pokemon-names list and the TCG proxy) return something
    //usable without needing to sequence mockResolvedVadlueOnce calls
    global.fetch = vi.fn((url) => {
      if (url.includes("pokemon?limit")) {
        return Promise.resolve(
          fakeResponse(true, {
            results: [{ name: "pikachu" }, { name: "charmander" }],
          }),
        );
      }
      return Promise.resolve(
        fakeResponse(true, { data: [makeCard("card-1")] }),
      );
    });
  });

  it("shows the library chrome and renders  batch of fetched cards", async () => {
    //Arrange
    const onEnter = vi.fn();
    tcgLibrary.initTCGLibrary({ enterLibrary: onEnter, exitLibrary: vi.fn() });

    //Act
    await tcgLibrary.showLibrary();

    //Assert
    expect(onEnter).toHaveBeenCalled();
    expect(
      document.getElementById("library-view").classList.contains("hidden"),
    ).toBe(false);
    expect(document.querySelectorAll(".tcg-card").length).toBeGreaterThan(0);
  });

  it("load cards for a specific name and pushes it into the URL", async () => {
    //Act
    await tcgLibrary.showCardPanel("pikachu");

    //Assert
    expect(document.getElementById("card-panel-title").textContent).toBe(
      "pikachu",
    );
    expect(document.querySelectorAll(".tcg-card").length).toBe(1);
    expect(window.location.search).toContain("search=pikachu");
  });

  it("re-renders cards in the new order when the sort dropdown changes", async () => {
    //Arrange
    global.fetch = vi.fn(() =>
      Promise.resolve(
        fakeResponse(true, {
          data: [
            makeCard("common-1", { rarity: "Common" }),
            makeCard("rare-1", { rarity: "Rare" }),
            makeCard("secret-1", { rarity: "Secret Rare" }),
          ],
        }),
      ),
    );
    tcgLibrary.initTCGLibrary({ enterLibrary: vi.fn(), exitLibrary: vi.fn() });
    await tcgLibrary.showCardPanel("pikachu");

    //Act
    const sortSelect = document.getElementById("sort-select");
    sortSelect.value = "rarity";
    sortSelect.dispatchEvent(new Event("change"));

    //Assert: highest rarity crad should now render first
    const rarities = Array.from(
      document.querySelectorAll(".tcg-card-rarity"),
    ).map((el) => el.textContent);
    expect(rarities[0]).toBe("Secret Rare");
  });

  function flush() {
    return new Promise((resolve) => setTimeout(resolve, 0));
  }

  it("clicking the tcg button opens the library, then opens the card panel for the current pokemon", async () => {
    //Arrange
    state.setCurrentPokemon({ name: "pikachu", id: 25 });
    tcgLibrary.initTCGLibrary({ enterLibrary: vi.fn(), exitLibrary: vi.fn() });

    //Act
    document.getElementById("tcg-btn").click();
    await flush();
    await flush();

    //Assert
    expect(
      document.getElementById("library-view").classList.contains("hidden"),
    ).toBe(false);
    expect(document.getElementById("card-panel-title").textContent).toBe(
      "pikachu",
    );
  });

  it("reopens a search without re-fetching the random featured batch", async () => {
    //Arrange
    const onEnter = vi.fn();
    tcgLibrary.initTCGLibrary({ enterLibrary: onEnter, exitLibrary: vi.fn() });

    //Act
    await tcgLibrary.restoreLibraryState({
      view: "library",
      search: "pikachu",
    });

    //Assert
    expect(onEnter).toHaveBeenCalled();
    expect(document.getElementById("card-panel-title").textContent).toBe(
      "pikachu",
    );

    //the names endpoint is only hit by showLibrary's random batch
    //it should never be called by a restore
    const calledUrls = global.fetch.mock.calls.map((call) => call[0]);
    expect(calledUrls.some((url) => url.includes("pokemon?limit"))).toBe(false);
  });

  it("reflects wethere the library view is currently visible", async () => {
    //Arrange
    tcgLibrary.initTCGLibrary({ enterLibrary: vi.fn(), exitLibrary: vi.fn() });
    expect(tcgLibrary.isLibraryOpen()).toBe(false);

    //Act
    await tcgLibrary.showLibrary();
    expect(tcgLibrary.isLibraryOpen()).toBe(true);

    tcgLibrary.hideLibrary();

    //Assert
    expect(tcgLibrary.isLibraryOpen()).toBe(false);
  });
});
