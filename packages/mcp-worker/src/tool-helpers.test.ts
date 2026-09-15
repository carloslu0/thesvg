import { describe, it, expect } from "vitest";
import { textResult, errorResult, iconNotFoundResult } from "./tool-helpers";

describe("textResult", () => {
  it("wraps text in a single text content block with no error flag", () => {
    expect(textResult("hello")).toEqual({
      content: [{ type: "text", text: "hello" }],
    });
  });
});

describe("errorResult", () => {
  it("wraps text in a text content block and sets isError", () => {
    expect(errorResult("oops")).toEqual({
      content: [{ type: "text", text: "oops" }],
      isError: true,
    });
  });
});

describe("iconNotFoundResult", () => {
  it("builds a consistent not-found message referencing the slug", () => {
    const result = iconNotFoundResult("nope");
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('"nope"');
    expect(result.content[0].text).toContain("search_icons");
  });
});
