import { describe, it, expect, beforeEach } from "vitest";
import type { IconEntry } from "../icons";

// The Fuse index is cached per-array reference inside search.ts, so each test
// builds its own fixture array to force a fresh index.
function makeIcon(partial: Partial<IconEntry> & { slug: string; title: string }): IconEntry {
  return {
    aliases: [],
    hex: "000000",
    categories: [],
    variants: { default: `/icons/${partial.slug}/default.svg` },
    license: "MIT",
    collection: "brands",
    ...partial,
  } as IconEntry;
}

const ICONS: IconEntry[] = [
  makeIcon({ slug: "looker", title: "Looker" }),
  makeIcon({ slug: "data-studio", title: "Data Studio" }),
  makeIcon({ slug: "android-studio", title: "Android Studio" }),
  makeIcon({ slug: "app-store", title: "App Store" }),
  makeIcon({ slug: "nano-stores", title: "Nano Stores" }),
  makeIcon({ slug: "some-app", title: "Some App" }),
  makeIcon({ slug: "github", title: "GitHub", aliases: ["git", "source control"] }),
];

let searchIcons: (icons: IconEntry[], query: string) => IconEntry[];

beforeEach(async () => {
  // Re-import so the module-level Fuse cache does not leak across tests.
  searchIcons = (await import("../search")).searchIcons;
});

describe("searchIcons", () => {
  it("returns every icon for a blank query", () => {
    expect(searchIcons(ICONS, "")).toHaveLength(ICONS.length);
    expect(searchIcons(ICONS, "   ")).toHaveLength(ICONS.length);
  });

  it("matches a single-word query", () => {
    const slugs = searchIcons(ICONS, "looker").map((i) => i.slug);
    expect(slugs).toContain("looker");
  });

  it("ranks the icon matching every token first for a multi-word query", () => {
    const results = searchIcons(ICONS, "app store");
    expect(results[0]?.slug).toBe("app-store");
  });

  it("still returns partial matches when no icon matches all tokens", () => {
    // "looker studio" — no icon holds both words, but the search must not
    // report an empty result. It should surface the closest single-token
    // matches (Looker, the Studio icons) instead of nothing.
    const slugs = searchIcons(ICONS, "looker studio").map((i) => i.slug);
    expect(slugs.length).toBeGreaterThan(0);
    expect(slugs).toContain("looker");
    expect(slugs.some((s) => s.includes("studio"))).toBe(true);
  });

  it("matches a keyword that sits mid-string thanks to ignoreLocation", () => {
    // "Data Studio" — the keyword "studio" is not near the start of the
    // title, so the default location-weighted scoring would drop it.
    const slugs = searchIcons(ICONS, "studio").map((i) => i.slug);
    expect(slugs).toContain("data-studio");
    expect(slugs).toContain("android-studio");
  });

  it("matches against aliases", () => {
    const slugs = searchIcons(ICONS, "source control").map((i) => i.slug);
    expect(slugs).toContain("github");
  });
});
