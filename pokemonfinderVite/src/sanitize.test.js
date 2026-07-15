import { describe, it, expect } from "vitest";
import { escapeHTML } from "./sanitize.js";

describe("escapeHTML", () => {
  it("leaves plain text unchanged", () => {
    expect(escapeHTML("charizard")).toBe("charizard");
  });

  it("neutralizes a script tag", () => {
    const result = escapeHTML('<script>alert("hacked")</script>');
    expect(result).not.toContain("<script>");
    expect(result).toContain("&lt;script&gt;");
  });

  it("neutralizes an img onerror payload", () => {
    const result = escapeHTML('<img src=x onerror="alert(1)">');
    expect(result).not.toContain("<img");
    expect(result).toContain("&lt;img");
  });

  it("escapes ampersands and quotes", () => {
    expect(escapeHTML(`Tom & Jerry's "great" day`)).toBe(
      "Tom &amp; Jerry&#39;s &quot;great&quot; day",
    );
  });

  it("returns an empty string for null or undefined input", () => {
    expect(escapeHTML(null)).toBe("");
    expect(escapeHTML(undefined)).toBe("");
  });
});
