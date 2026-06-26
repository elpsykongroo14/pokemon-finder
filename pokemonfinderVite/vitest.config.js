import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom", // gives us window, document, localStorage in tests
    globals: false, // we import describe/it/expect explicitly - no magic globals
  },
});

//globale: false-
//rather than vitest silently injecting describe/it/expect into every file as invisble globals
//i import them explicitly at the top of every test file that needs it
