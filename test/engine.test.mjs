// Headless tests for the simulation core (no browser needed): mocks a 2D context.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SwarmWeb, DEFAULTS } from '../dist/swarm-web.mjs';

function mockCtx() {
  const calls = { stroke: 0, fill: 0, arc: 0, lineTo: 0, moveTo: 0 };
  const ctx = new Proxy({}, {
    get: (t, k) => (k in t ? t[k] : (...a) => { if (k in calls) calls[k]++; }),
    set: (t, k, v) => { t[k] = v; return true; },
  });
  return { ctx, calls };
}

function engine(options = {}, w = 800, h = 600) {
  const s = Object.create(SwarmWeb.prototype);
  const { ctx, calls } = mockCtx();
  Object.assign(s, {
    options: { ...DEFAULTS, ...options }, particles: [], pointer: null,
    width: w, height: h, ctx, _links: [[], [], [], []],
  });
  s._syncCount();
  return { s, calls };
}

const finite = (s) => s.particles.every((p) => [p.x, p.y, p.vx, p.vy].every(Number.isFinite));

test('auto count scales with area and respects bounds', () => {
  assert.equal(engine({}, 800, 600).s.particles.length, 40);
  assert.equal(engine({}, 100, 100).s.particles.length, DEFAULTS.minCount);
  assert.equal(engine({}, 4000, 4000).s.particles.length, DEFAULTS.maxCount);
  assert.equal(engine({ count: 77 }).s.particles.length, 77);
});

test('simulation stays finite, in bounds, and under max speed for 2000 frames', () => {
  const { s } = engine({ count: 150 });
  s.pointer = { x: 400, y: 300 };
  for (let i = 0; i < 2000; i++) {
    s._frame(i % 7 === 0 ? 3 : 1, true);
  }
  assert.ok(finite(s));
  const max = 1.6 * DEFAULTS.speed + 1e-9;
  for (const p of s.particles) {
    assert.ok(Math.hypot(p.vx, p.vy) <= max);
    assert.ok(p.x >= -21 && p.x <= 821 && p.y >= -21 && p.y <= 621);
  }
});

test('boids actually flock: alignment increases over time', () => {
  const { s } = engine({ count: 120, interaction: 'none', linkDistance: 0 }, 500, 500);
  const order = () => {
    let x = 0, y = 0;
    for (const p of s.particles) { const m = Math.hypot(p.vx, p.vy); x += p.vx / m; y += p.vy / m; }
    return Math.hypot(x, y) / s.particles.length;
  };
  const before = order();
  for (let i = 0; i < 1500; i++) s._frame(1, true);
  assert.ok(order() > before, `order ${before} -> ${order()}`);
});

test('repel pushes particles away from pointer, attract pulls them in', () => {
  for (const [mode, sign] of [['repel', 1], ['attract', -1]]) {
    const { s } = engine({ count: 60, interaction: mode, interactionStrength: 3 }, 400, 400);
    s.pointer = { x: 200, y: 200 };
    const mean = () => s.particles.reduce((a, p) => a + Math.hypot(p.x - 200, p.y - 200), 0) / s.particles.length;
    const before = mean();
    for (let i = 0; i < 120; i++) s._frame(1, true);
    assert.ok(sign * (mean() - before) > 0, `${mode}: ${before} -> ${mean()}`);
  }
});

test('draws links and one fill per color; linkDistance 0 draws no links', () => {
  const a = engine({ count: 100 }, 300, 300);
  a.s._frame(0, false);
  assert.ok(a.calls.stroke > 0);
  assert.equal(a.calls.fill, DEFAULTS.colors.length);
  const b = engine({ count: 100, linkDistance: 0 }, 300, 300);
  b.s._frame(0, false);
  assert.equal(b.calls.stroke, 0);
});

test('triangle shape and string colors work', () => {
  const { s, calls } = engine({ shape: 'triangle', colors: ['#fff'] });
  s._frame(1, true);
  assert.ok(calls.lineTo > 0 && calls.arc === 0);
  assert.ok(finite(s));
});
