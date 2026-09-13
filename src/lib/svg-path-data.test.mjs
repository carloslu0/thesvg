/**
 * Tests for the SVG arc-flattening edge cases in `svg-path-data.ts`,
 * covering the functions extracted out of `parsePathSubpaths`
 * (`flattenArc` in particular).
 *
 * No test runner dep — uses Node's built-in `node:test` (Node >= 20).
 * Run with: `npx tsx --test src/lib/svg-path-data.test.mjs`
 * (svg-path-data.ts uses TypeScript parameter properties, which Node's
 * built-in `--experimental-strip-types` does not support, so this one
 * needs the tsx loader rather than strip-only mode.)
 */

import test from "node:test";
import assert from "node:assert/strict";
import { flattenArc, parsePathSubpaths } from "./svg-path-data.ts";

/** Rotates a point by `deg` degrees around the origin. */
function rotate(p, deg) {
  const r = (deg * Math.PI) / 180;
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  return { x: p.x * cos - p.y * sin, y: p.x * sin + p.y * cos };
}

function pathLength(points, start) {
  let prev = start;
  let len = 0;
  for (const p of points) {
    len += Math.hypot(p.x - prev.x, p.y - prev.y);
    prev = p;
  }
  return len;
}

test("flattenArc with rx=0 degenerates to a straight line to the endpoint", () => {
  const p0 = { x: 0, y: 0 };
  const p1 = { x: 10, y: 0 };
  const out = [];
  flattenArc(p0, 0, 8, 30, 1, 1, p1, out);
  assert.deepEqual(out, [p1]);
});

test("flattenArc with ry=0 degenerates to a straight line to the endpoint", () => {
  const p0 = { x: 0, y: 0 };
  const p1 = { x: 10, y: 0 };
  const out = [];
  flattenArc(p0, 8, 0, 0, 0, 0, p1, out);
  assert.deepEqual(out, [p1]);
});

test("flattenArc with both radii zero degenerates to a straight line", () => {
  const p0 = { x: 3, y: -4 };
  const p1 = { x: 3, y: 4 };
  const out = [];
  flattenArc(p0, 0, 0, 45, 1, 0, p1, out);
  assert.deepEqual(out, [p1]);
});

test("sweep-flag=0 vs sweep-flag=1 bulge to opposite sides of the chord", () => {
  const p0 = { x: 0, y: 0 };
  const p1 = { x: 10, y: 0 };

  const outSweep0 = [];
  flattenArc(p0, 8, 8, 0, 0, 0, p1, outSweep0);
  const outSweep1 = [];
  flattenArc(p0, 8, 8, 0, 0, 1, p1, outSweep1);

  assert.ok(outSweep0.length > 0);
  assert.ok(outSweep1.length > 0);

  const midY0 = outSweep0[Math.floor(outSweep0.length / 2)].y;
  const midY1 = outSweep1[Math.floor(outSweep1.length / 2)].y;

  // Same chord and radii, opposite sweep direction: the arc bulges to
  // opposite sides of the p0-p1 chord.
  assert.ok(midY0 > 0, `expected sweep=0 midpoint above the chord, got ${midY0}`);
  assert.ok(midY1 < 0, `expected sweep=1 midpoint below the chord, got ${midY1}`);
  assert.ok(Math.abs(Math.abs(midY0) - Math.abs(midY1)) < 1e-9);
});

test("large-arc-flag=1 sweeps the major arc, large-arc-flag=0 the minor arc", () => {
  const p0 = { x: 0, y: 0 };
  const p1 = { x: 10, y: 0 };

  const outMinor = [];
  flattenArc(p0, 8, 8, 0, 0, 1, p1, outMinor);
  const outMajor = [];
  flattenArc(p0, 8, 8, 0, 1, 1, p1, outMajor);

  // The major arc has a much wider angular sweep, so it flattens into
  // more segments and its polyline is far longer than the minor arc's.
  assert.ok(outMajor.length > outMinor.length);
  assert.ok(pathLength(outMajor, p0) > pathLength(outMinor, p0) * 2);
});

test("flattenArc rotation matches rotating the whole configuration", () => {
  // Rotating the endpoints and the ellipse's x-axis-rotation by the same
  // angle around the origin must rotate every flattened point by that
  // same angle: rotation is a symmetry of the arc construction.
  const p0 = { x: 5, y: 2 };
  const p1 = { x: 15, y: 8 };
  const rxAxisRotation = 20;
  const turn = 40;

  const base = [];
  flattenArc(p0, 10, 6, rxAxisRotation, 0, 1, p1, base);

  const rotatedP0 = rotate(p0, turn);
  const rotatedP1 = rotate(p1, turn);
  const rotated = [];
  flattenArc(rotatedP0, 10, 6, rxAxisRotation + turn, 0, 1, rotatedP1, rotated);

  assert.equal(rotated.length, base.length);
  for (let i = 0; i < base.length; i++) {
    const expected = rotate(base[i], turn);
    assert.ok(
      Math.abs(expected.x - rotated[i].x) < 1e-9,
      `point ${i} x mismatch: expected ${expected.x}, got ${rotated[i].x}`,
    );
    assert.ok(
      Math.abs(expected.y - rotated[i].y) < 1e-9,
      `point ${i} y mismatch: expected ${expected.y}, got ${rotated[i].y}`,
    );
  }
});

test("a non-zero x-axis rotation changes the flattened shape", () => {
  const p0 = { x: 0, y: 0 };
  const p1 = { x: 10, y: 0 };

  const unrotated = [];
  flattenArc(p0, 10, 4, 0, 0, 1, p1, unrotated);
  const rotated = [];
  flattenArc(p0, 10, 4, 45, 0, 1, p1, rotated);

  // The x-axis rotation changes the ellipse's orientation relative to the
  // chord, so the swept angle (and therefore the flattened shape, possibly
  // even the segment count) is different from the unrotated case.
  const differs =
    unrotated.length !== rotated.length ||
    unrotated.some(
      (pt, i) => Math.abs(pt.x - rotated[i].x) > 1e-6 || Math.abs(pt.y - rotated[i].y) > 1e-6,
    );
  assert.ok(differs, "expected rotating the ellipse to change the flattened points");
});

test("parsePathSubpaths wires the large-arc and sweep flags through from path data", () => {
  const minor = parsePathSubpaths("M0,0 A8,8 0 0,1 10,0");
  const major = parsePathSubpaths("M0,0 A8,8 0 1,1 10,0");

  assert.equal(minor.length, 1);
  assert.equal(major.length, 1);
  assert.ok(
    major[0].points.length > minor[0].points.length,
    "large-arc-flag=1 should produce more flattened points than large-arc-flag=0",
  );
});

test("parsePathSubpaths handles a zero-radius arc command as a straight line", () => {
  const subpaths = parsePathSubpaths("M0,0 A0,0 0 0,0 10,10");
  assert.equal(subpaths.length, 1);
  const { points } = subpaths[0];
  assert.equal(points[0].x, 0);
  assert.equal(points[0].y, 0);
  assert.equal(points[points.length - 1].x, 10);
  assert.equal(points[points.length - 1].y, 10);
  assert.equal(points.length, 2);
});
