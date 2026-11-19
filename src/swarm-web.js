/*! swarm-web v1.0.0 | MIT License | https://github.com/bom-sudo/swarm-web */
// Animated swarm (boids + linked particles) for any website.
// Zero dependencies. Works as an ES module class, a classic <script>, or the <swarm-web> custom element.

export const DEFAULTS = Object.freeze({
  count: 'auto',            // number of particles, or 'auto' (scales with area)
  density: 12000,           // auto mode: 1 particle per N square pixels
  minCount: 30,             // auto mode lower bound
  maxCount: 180,            // auto mode upper bound
  colors: ['#38bdf8', '#818cf8', '#f472b6'],
  shape: 'dot',             // 'dot' | 'triangle'
  size: 2,                  // particle radius in CSS px
  speed: 1,                 // global speed multiplier
  perception: 50,           // how far a particle "sees" its neighbours (px)
  separation: 1.6,          // boids weights
  alignment: 1,
  cohesion: 0.7,
  linkDistance: 110,        // draw lines between particles closer than this (0 = off)
  linkColor: null,          // null = first color
  linkOpacity: 0.35,
  linkWidth: 1,
  interaction: 'repel',     // 'repel' | 'attract' | 'none'
  interactionRadius: 140,
  interactionStrength: 1,
  opacity: 1,
  background: 'transparent',
  fullscreen: false,        // fixed full-viewport background behind the page
  zIndex: -1,               // canvas z-index (sits behind host content)
  maxDpr: 2,                // cap devicePixelRatio for performance
  respectReducedMotion: true,
});

const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
const NUMERIC = new Set([
  'density', 'minCount', 'maxCount', 'size', 'speed', 'perception', 'separation', 'alignment',
  'cohesion', 'linkDistance', 'linkOpacity', 'linkWidth', 'interactionRadius',
  'interactionStrength', 'opacity', 'zIndex', 'maxDpr',
]);

function normalize(options) {
  const out = {};
  for (const key of Object.keys(options || {})) {
    let value = options[key];
    if (value === undefined) continue; // keep defaults for undefined (e.g. unset React props)
    if (key === 'colors' && typeof value === 'string') {
      value = value.split(',').map((c) => c.trim()).filter(Boolean);
    }
    if (key === 'count' && value !== 'auto') {
      const n = Number(value);
      value = Number.isFinite(n) && n > 0 ? Math.floor(n) : 'auto';
    }
    if (NUMERIC.has(key)) {
      const n = Number(value);
      if (!Number.isFinite(n)) continue;
      value = n;
    }
    out[key] = value;
  }
  if (out.colors && !out.colors.length) delete out.colors;
  return out;
}

export class SwarmWeb {
  /**
   * @param {HTMLElement|HTMLCanvasElement|string} target  container element, canvas, or CSS selector.
   *   Pass document.body (or { fullscreen: true }) for a full-page background.
   * @param {Partial<typeof DEFAULTS>} [options]
   */
  constructor(target, options = {}) {
    if (!isBrowser) throw new Error('SwarmWeb: must run in a browser (call it on the client only).');
    this.options = { ...DEFAULTS, ...normalize(options) };
    this.particles = [];
    this.pointer = null;
    this.width = 0;
    this.height = 0;
    this._raf = 0;
    this._wantRun = true;
    this._visible = true;
    this._last = 0;
    this._restore = [];
    this._links = [[], [], [], []];
    this._setupCanvas(target);
    this._bind();
    this._resize();
    this._update();
  }

  /** Resume animation. */
  start() {
    this._wantRun = true;
    this._update();
    return this;
  }

  /** Pause animation (last frame stays on screen). */
  stop() {
    this._wantRun = false;
    this._update();
    return this;
  }

  /** Change any option at runtime. */
  setOptions(options) {
    Object.assign(this.options, normalize(options));
    if (this._ownsCanvas) this.canvas.style.zIndex = String(this.options.zIndex);
    this._syncCount();
    this._update();
    if (!this._raf) this._frame(0, false);
    return this;
  }

  /** Remove the canvas, listeners and any style changes made to the host. */
  destroy() {
    this._wantRun = false;
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = 0;
    window.removeEventListener('pointermove', this._onPointerMove);
    window.removeEventListener('pointerdown', this._onPointerMove);
    window.removeEventListener('blur', this._onPointerLeave);
    document.documentElement.removeEventListener('pointerleave', this._onPointerLeave);
    document.removeEventListener('visibilitychange', this._onChange);
    if (this._mq) this._mq.removeEventListener('change', this._onChange);
    if (this._ro) this._ro.disconnect();
    if (this._io) this._io.disconnect();
    if (this._ownsCanvas) this.canvas.remove();
    while (this._restore.length) this._restore.pop()();
    this.particles.length = 0;
  }

  // ---------------------------------------------------------------- setup

  _setupCanvas(target) {
    const el = typeof target === 'string' ? document.querySelector(target) : target;
    if (!el) throw new Error(`SwarmWeb: target not found (${String(target)})`);

    if (el instanceof HTMLCanvasElement) {
      this.canvas = el;
      this._ownsCanvas = false;
      return;
    }

    const fullscreen = this.options.fullscreen || el === document.body || el === document.documentElement;
    const host = fullscreen ? document.body : el;
    const canvas = document.createElement('canvas');
    canvas.className = 'swarm-web-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    Object.assign(canvas.style, {
      position: fullscreen ? 'fixed' : 'absolute',
      inset: '0',
      width: '100%',
      height: '100%',
      display: 'block',
      pointerEvents: 'none',
      zIndex: String(this.options.zIndex),
    });

    // A stacking context on the host lets z-index:-1 paint above the host's
    // background but below its content, without the page needing any z-index work.
    this._patchStyle(host, 'isolation', 'isolate', (v) => v === 'auto');
    if (!fullscreen) this._patchStyle(host, 'position', 'relative', (v) => v === 'static');

    host.prepend(canvas);
    this.canvas = canvas;
    this._ownsCanvas = true;
  }

  _patchStyle(el, prop, value, shouldPatch) {
    if (!shouldPatch(getComputedStyle(el)[prop])) return;
    const previous = el.style[prop];
    el.style[prop] = value;
    this._restore.push(() => { el.style[prop] = previous; });
  }

  _bind() {
    this._onPointerMove = (e) => {
      const r = this.canvas.getBoundingClientRect();
      this.pointer = { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    this._onPointerLeave = () => { this.pointer = null; };
    this._onChange = () => this._update();
    this._tick = (now) => {
      this._raf = 0;
      const dt = Math.min((now - this._last) / 16.667, 3); // 1 = one 60fps frame
      this._last = now;
      this._frame(dt, true);
      if (this._shouldAnimate()) this._raf = requestAnimationFrame(this._tick);
    };

    window.addEventListener('pointermove', this._onPointerMove, { passive: true });
    window.addEventListener('pointerdown', this._onPointerMove, { passive: true });
    window.addEventListener('blur', this._onPointerLeave);
    document.documentElement.addEventListener('pointerleave', this._onPointerLeave);
    document.addEventListener('visibilitychange', this._onChange);

    if (window.matchMedia) {
      this._mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      this._mq.addEventListener('change', this._onChange);
    }
    if (window.ResizeObserver) {
      this._ro = new ResizeObserver(() => this._resize());
      this._ro.observe(this.canvas);
    } else {
      window.addEventListener('resize', () => this._resize());
    }
    if (window.IntersectionObserver) {
      this._io = new IntersectionObserver((entries) => {
        this._visible = entries[entries.length - 1].isIntersecting;
        this._update();
      });
      this._io.observe(this.canvas);
    }
  }

  _reducedMotion() {
    return this.options.respectReducedMotion && !!this._mq && this._mq.matches;
  }

  _shouldAnimate() {
    return this._wantRun && this._visible && !document.hidden && !this._reducedMotion();
  }

  _update() {
    if (this._shouldAnimate()) {
      if (!this._raf) {
        this._last = performance.now();
        this._raf = requestAnimationFrame(this._tick);
      }
    } else {
      if (this._raf) cancelAnimationFrame(this._raf);
      this._raf = 0;
      this._frame(0, false); // static frame (paused / reduced motion)
    }
  }

  _resize() {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    if (!w || !h) return;
    const dpr = Math.min(window.devicePixelRatio || 1, this.options.maxDpr);
    const first = !this.width;
    this.width = w;
    this.height = h;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.ctx = this.ctx || this.canvas.getContext('2d');
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!first) {
      for (const p of this.particles) {
        if (p.x > w) p.x = Math.random() * w;
        if (p.y > h) p.y = Math.random() * h;
      }
    }
    this._syncCount();
    this._frame(0, false);
  }

  // ---------------------------------------------------------------- particles

  _targetCount() {
    const o = this.options;
    if (o.count !== 'auto') return o.count;
    const auto = Math.round((this.width * this.height) / Math.max(o.density, 1));
    return Math.max(o.minCount, Math.min(o.maxCount, auto));
  }

  _syncCount() {
    if (!this.width) return;
    const target = this._targetCount();
    const P = this.particles;
    const max = 1.6 * this.options.speed;
    while (P.length < target) {
      const a = Math.random() * Math.PI * 2;
      const s = max * (0.5 + Math.random() * 0.5);
      P.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        r: this.options.size * (0.7 + Math.random() * 0.6),
        c: (Math.random() * 1e6) | 0,
      });
    }
    P.length = target;
  }

  /**
   * One frame: neighbour search (spatial grid) -> collect links + steer velocities
   * -> draw at current positions -> integrate positions.
   */
  _frame(dt, simulate) {
    const { ctx, width: W, height: H, particles: P, options: o } = this;
    if (!ctx || !W || !H) return;
    const n = P.length;

    const per = o.perception;
    const link = Math.max(0, o.linkDistance);
    const cell = Math.max(per, link, 20);
    const cols = Math.ceil(W / cell) + 1;
    const rows = Math.ceil(H / cell) + 1;
    if (!this._head || this._head.length < cols * rows) this._head = new Int32Array(cols * rows);
    if (!this._next || this._next.length < n) this._next = new Int32Array(Math.max(n, 64));
    if (!this._cell || this._cell.length < n) this._cell = new Int32Array(Math.max(n, 64));
    const head = this._head;
    const next = this._next;
    const cellOf = this._cell;
    head.fill(-1);
    for (let i = 0; i < n; i++) {
      const gx = Math.min(cols - 1, Math.max(0, Math.floor(P[i].x / cell)));
      const gy = Math.min(rows - 1, Math.max(0, Math.floor(P[i].y / cell)));
      const idx = gy * cols + gx;
      cellOf[i] = idx;
      next[i] = head[idx];
      head[idx] = i;
    }

    const links = this._links;
    for (const b of links) b.length = 0;
    const link2 = link * link;
    const per2 = per * per;
    const sep2 = (per * 0.5) ** 2;
    const maxSpeed = 1.6 * o.speed;
    const minSpeed = maxSpeed * 0.35;
    const maxForce = 0.05 * o.speed;
    const mode = o.interaction;
    const ptr = mode !== 'none' ? this.pointer : null;
    const ir = o.interactionRadius;
    const ir2 = ir * ir;

    for (let i = 0; i < n; i++) {
      const p = P[i];
      let cnt = 0, avx = 0, avy = 0, cdx = 0, cdy = 0, sx = 0, sy = 0;
      const gx = cellOf[i] % cols;
      const gy = (cellOf[i] / cols) | 0;
      for (let yy = gy - 1; yy <= gy + 1; yy++) {
        if (yy < 0 || yy >= rows) continue;
        for (let xx = gx - 1; xx <= gx + 1; xx++) {
          if (xx < 0 || xx >= cols) continue;
          for (let j = head[yy * cols + xx]; j !== -1; j = next[j]) {
            if (j === i) continue;
            const q = P[j];
            const dx = q.x - p.x;
            const dy = q.y - p.y;
            const d2 = dx * dx + dy * dy;
            if (link && j > i && d2 < link2) {
              const t = 1 - Math.sqrt(d2) / link;
              links[Math.min(3, (t * 4) | 0)].push(p.x, p.y, q.x, q.y);
            }
            if (simulate && d2 < per2 && d2 > 0) {
              cnt++;
              avx += q.vx; avy += q.vy;
              cdx += dx; cdy += dy;
              if (d2 < sep2) { sx -= dx / d2; sy -= dy / d2; }
            }
          }
        }
      }
      if (!simulate) continue;

      let fx = 0, fy = 0;
      const steer = (tx, ty, weight) => {
        const m = Math.hypot(tx, ty);
        if (!m) return;
        let ux = (tx / m) * maxSpeed - p.vx;
        let uy = (ty / m) * maxSpeed - p.vy;
        const f = Math.hypot(ux, uy);
        if (f > maxForce) { ux *= maxForce / f; uy *= maxForce / f; }
        fx += ux * weight;
        fy += uy * weight;
      };
      if (cnt) {
        steer(avx, avy, o.alignment);
        steer(cdx / cnt, cdy / cnt, o.cohesion);
        steer(sx, sy, o.separation);
      }
      if (ptr) {
        const dx = p.x - ptr.x;
        const dy = p.y - ptr.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < ir2 && d2 > 0.01) {
          const d = Math.sqrt(d2);
          const f = (1 - d / ir) * 0.5 * o.interactionStrength * o.speed * (mode === 'attract' ? -1 : 1);
          fx += (dx / d) * f;
          fy += (dy / d) * f;
        }
      }
      fx += (Math.random() - 0.5) * 0.04 * o.speed; // wander
      fy += (Math.random() - 0.5) * 0.04 * o.speed;

      p.vx += fx * dt;
      p.vy += fy * dt;
      const s = Math.hypot(p.vx, p.vy);
      if (s > maxSpeed) { p.vx *= maxSpeed / s; p.vy *= maxSpeed / s; }
      else if (s < minSpeed && s > 0) { p.vx *= minSpeed / s; p.vy *= minSpeed / s; }
    }

    this._draw(links);

    if (simulate) {
      const m = 20;
      for (let i = 0; i < n; i++) {
        const p = P[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.x < -m) p.x = W + m; else if (p.x > W + m) p.x = -m;
        if (p.y < -m) p.y = H + m; else if (p.y > H + m) p.y = -m;
      }
    }
  }

  _draw(links) {
    const { ctx, width: W, height: H, particles: P, options: o } = this;
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, W, H);
    if (o.background && o.background !== 'transparent') {
      ctx.fillStyle = o.background;
      ctx.fillRect(0, 0, W, H);
    }
    const colors = o.colors.length ? o.colors : DEFAULTS.colors;

    // links, batched into 4 opacity buckets (one stroke call each)
    ctx.strokeStyle = o.linkColor || colors[0];
    ctx.lineWidth = o.linkWidth;
    for (let b = 0; b < 4; b++) {
      const seg = links[b];
      if (!seg.length) continue;
      ctx.globalAlpha = o.opacity * o.linkOpacity * ((b + 1) / 4);
      ctx.beginPath();
      for (let k = 0; k < seg.length; k += 4) {
        ctx.moveTo(seg[k], seg[k + 1]);
        ctx.lineTo(seg[k + 2], seg[k + 3]);
      }
      ctx.stroke();
    }

    // particles, one fill call per color
    ctx.globalAlpha = o.opacity;
    const triangle = o.shape === 'triangle';
    for (let ci = 0; ci < colors.length; ci++) {
      ctx.fillStyle = colors[ci];
      ctx.beginPath();
      for (let i = 0; i < P.length; i++) {
        const p = P[i];
        if (p.c % colors.length !== ci) continue;
        if (triangle) {
          const a = Math.atan2(p.vy, p.vx);
          const r = p.r * 2;
          const cos = Math.cos(a), sin = Math.sin(a);
          ctx.moveTo(p.x + cos * r * 1.4, p.y + sin * r * 1.4);
          ctx.lineTo(p.x - cos * r + sin * r * 0.7, p.y - sin * r - cos * r * 0.7);
          ctx.lineTo(p.x - cos * r - sin * r * 0.7, p.y - sin * r + cos * r * 0.7);
          ctx.closePath();
        } else {
          ctx.moveTo(p.x + p.r, p.y);
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        }
      }
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

// ------------------------------------------------------------------ <swarm-web>

const ATTRIBUTES = {
  count: 'count',
  density: 'density',
  colors: 'colors',
  shape: 'shape',
  size: 'size',
  speed: 'speed',
  perception: 'perception',
  separation: 'separation',
  alignment: 'alignment',
  cohesion: 'cohesion',
  'link-distance': 'linkDistance',
  'link-color': 'linkColor',
  'link-opacity': 'linkOpacity',
  'link-width': 'linkWidth',
  interaction: 'interaction',
  'interaction-radius': 'interactionRadius',
  'interaction-strength': 'interactionStrength',
  opacity: 'opacity',
  background: 'background',
  'max-dpr': 'maxDpr',
};

/**
 * Register the <swarm-web> custom element (called automatically in browsers).
 * @param {string} [tagName='swarm-web']
 */
export function defineSwarmWeb(tagName = 'swarm-web') {
  if (!isBrowser || !window.customElements) return undefined;
  const existing = customElements.get(tagName);
  if (existing) return existing;

  class SwarmWebElement extends HTMLElement {
    static get observedAttributes() {
      return [...Object.keys(ATTRIBUTES), 'paused', 'ignore-reduced-motion'];
    }

    constructor() {
      super();
      const root = this.attachShadow({ mode: 'open' });
      root.innerHTML = `<style>
        :host { display: block; position: relative; isolation: isolate; }
        :host([hidden]) { display: none; }
        :host([fullscreen]) { position: fixed; inset: 0; z-index: var(--swarm-web-z-index, -1); pointer-events: none; }
        canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; z-index: -1; pointer-events: none; }
      </style><canvas part="canvas" aria-hidden="true"></canvas><slot></slot>`;
      this._canvas = root.querySelector('canvas');
    }

    connectedCallback() {
      if (this.swarm) return;
      if (this.hasAttribute('fullscreen') && getComputedStyle(document.body).isolation === 'auto') {
        const previous = document.body.style.isolation;
        document.body.style.isolation = 'isolate';
        this._restoreBody = () => { document.body.style.isolation = previous; };
      }
      this.swarm = new SwarmWeb(this._canvas, this._readOptions());
      if (this.hasAttribute('paused')) this.swarm.stop();
    }

    disconnectedCallback() {
      if (this.swarm) this.swarm.destroy();
      this.swarm = null;
      if (this._restoreBody) this._restoreBody();
      this._restoreBody = null;
    }

    attributeChangedCallback(name) {
      if (!this.swarm) return;
      if (name === 'paused') {
        if (this.hasAttribute('paused')) this.swarm.stop(); else this.swarm.start();
        return;
      }
      this.swarm.setOptions(this._readOptions());
    }

    _readOptions() {
      const options = {};
      for (const [attr, key] of Object.entries(ATTRIBUTES)) {
        options[key] = this.hasAttribute(attr) ? this.getAttribute(attr) : DEFAULTS[key];
      }
      options.respectReducedMotion = !this.hasAttribute('ignore-reduced-motion');
      return options;
    }
  }

  customElements.define(tagName, SwarmWebElement);
  return SwarmWebElement;
}

if (isBrowser) defineSwarmWeb();

export default SwarmWeb;
