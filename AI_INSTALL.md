# AI_INSTALL.md — add swarm-web to this website

> **You are an AI coding agent.** A human pointed you at this file because they want the
> **swarm-web** animated background (a flocking swarm of particles with connecting lines,
> reacting to the mouse) added to the website in the current project.
> Follow the steps below **in order**. Do not ask the human questions that this file already answers.
> Only ask if a decision in step 1 is truly ambiguous (e.g. several unrelated sites in one repo).

Source repo: <https://github.com/bom-sudo/swarm-web> · License: MIT · Zero dependencies · ~10 KB

---

## 0. Defaults (use these unless the human said otherwise)

| Decision | Default |
|---|---|
| Where | The **hero / first section** of the home page. If there is no clear hero, use a **full-page background** (`fullscreen`). |
| Colors | Take 1–3 colors from the site's existing brand / CSS variables / Tailwind theme. Fallback: `#38bdf8,#818cf8,#f472b6`. |
| Install method | **Vendor the file** into the project (copy it). Use the CDN only for plain HTML sites with no build step and no local asset folder. |
| Interaction | `repel` |
| Everything else | Library defaults |

If the human's request mentions a specific place, colors, density or behaviour, that overrides this table.

---

## 1. Detect the stack

Look at the project files and pick **exactly one** recipe:

| You find | Recipe |
|---|---|
| `package.json` with `react` / `next` (and the page you edit is `.jsx`/`.tsx`) | **B — React / Next.js** |
| `package.json` with `vue`, `svelte`, `astro`, `@angular/core`, `solid-js`, `lit` | **C — Other frameworks (Web Component)** |
| Only `.html` files, or a server-rendered template (PHP, Django/Jinja, Rails ERB, Laravel Blade, Hugo, Jekyll, WordPress theme) | **A — Plain HTML / templates** |

---

## 2. Get the file(s)

Download from the repo (pin the tag so the code never changes underneath the site):

| File | URL |
|---|---|
| Classic script (window global + `<swarm-web>`) | `https://cdn.jsdelivr.net/gh/bom-sudo/swarm-web@v1.0.0/dist/swarm-web.js` |
| ES module | `https://cdn.jsdelivr.net/gh/bom-sudo/swarm-web@v1.0.0/dist/swarm-web.mjs` |
| TypeScript types | `https://cdn.jsdelivr.net/gh/bom-sudo/swarm-web@v1.0.0/dist/swarm-web.d.ts` |
| React wrapper | `https://cdn.jsdelivr.net/gh/bom-sudo/swarm-web@v1.0.0/react/SwarmWeb.jsx` |

Fetch with `curl -fsSL <url> -o <dest>` (or your file-fetch tool). Save files **byte-for-byte**; do not
reformat, minify or "improve" them.

Alternative for npm projects: `npm install github:bom-sudo/swarm-web#v1.0.0` then
`import { SwarmWeb } from 'swarm-web'` (the package ships `dist/`).

---

## Recipe A — Plain HTML / server templates

1. Save `swarm-web.js` into the site's static/JS folder (e.g. `assets/js/`, `static/js/`, `public/js/`).
   No local static folder? Use the CDN URL directly.
2. Add **once**, before `</body>` of the layout/base template:
   ```html
   <script src="/assets/js/swarm-web.js" defer></script>
   ```
3. Put the swarm where it belongs.

   **Hero section** — wrap the existing hero content (or turn the hero element into `<swarm-web>`):
   ```html
   <swarm-web class="hero" colors="#38bdf8,#818cf8" style="min-height:70vh">
     <!-- existing hero content stays here, it renders ON TOP of the swarm -->
   </swarm-web>
   ```
   Keep the hero's existing classes/ids on `<swarm-web>` or on an inner `<div>` so its CSS still applies.
   `<swarm-web>` is `display:block`; it **must have a height** (from its content, a CSS class, or `min-height`).

   **Full-page background** — anywhere inside `<body>`:
   ```html
   <swarm-web fullscreen colors="#38bdf8,#818cf8"></swarm-web>
   ```

   **Existing element, without changing markup** (JS API):
   ```html
   <script defer>
     addEventListener('DOMContentLoaded', () => {
       new SwarmWeb(document.querySelector('.hero'), { colors: ['#38bdf8', '#818cf8'] });
     });
   </script>
   ```

## Recipe B — React / Next.js

1. Create a folder such as `src/components/swarm-web/` (Next.js: `components/swarm-web/` or `app/components/swarm-web/`;
   follow the project's existing component location).
2. Save **both** files there: `SwarmWeb.jsx` and `swarm-web.mjs` (same folder — the wrapper imports `./swarm-web.mjs`).
   - TypeScript project: rename to `SwarmWeb.tsx`, and also save `swarm-web.d.ts` next to `swarm-web.mjs`
     (rename it to `swarm-web.d.mts`). Type the props as
     `{ fullscreen?: boolean; as?: React.ElementType; className?: string; style?: React.CSSProperties; children?: React.ReactNode } & Partial<SwarmWebOptions>`
     importing `SwarmWebOptions` from `./swarm-web.mjs`.
   - If the project forbids `.mjs` imports, rename it to `swarm-web.js` and update the import in the wrapper.
3. Use it:
   ```jsx
   import SwarmWeb from '@/components/swarm-web/SwarmWeb'; // match the project's import style/alias

   // hero section: content renders on top
   <SwarmWeb className="hero" style={{ minHeight: '70vh' }} colors={['#38bdf8', '#818cf8']}>
     ...existing hero JSX...
   </SwarmWeb>

   // or whole-page background (put it once in the root layout / App)
   <SwarmWeb fullscreen colors={['#38bdf8', '#818cf8']} />
   ```
   The wrapper renders a `<div>` by default; pass `as="section"` to keep semantics. Tailwind classes go in `className`.
4. Next.js App Router: the wrapper already starts with `'use client'`, so it can be used from Server Components.
   Do **not** call `new SwarmWeb()` during SSR — the wrapper only does it in `useEffect`.

## Recipe C — Vue / Svelte / Astro / Angular / others

Use the Web Component.

1. Save `swarm-web.mjs` into the source tree (e.g. `src/lib/swarm-web.mjs`).
2. Import it **once, client-side only** in the app entry or the component that uses it:
   - Vue (`main.js`/`main.ts`): `import './lib/swarm-web.mjs'`
     and tell the compiler it is a custom element — in `vite.config`:
     `vue({ template: { compilerOptions: { isCustomElement: (tag) => tag === 'swarm-web' } } })`.
     Nuxt: import it in a `.client` plugin, and set the same option under `vue.compilerOptions` in `nuxt.config`.
   - Svelte / SvelteKit: `import { onMount } from 'svelte'; onMount(() => import('$lib/swarm-web.mjs'));`
   - Astro: `<script>import '../lib/swarm-web.mjs';</script>` in the page/layout (Astro bundles it client-side).
   - Angular: import it in `main.ts` and add `CUSTOM_ELEMENTS_SCHEMA` to the standalone component's `schemas`.
3. Use `<swarm-web ...attributes>` in templates exactly as in Recipe A.

---

## 3. Options

HTML attribute (kebab-case) ⇄ JS/React option (camelCase). All optional.

| Attribute | Option | Default | Notes |
|---|---|---|---|
| `count` | `count` | `auto` | number, or `auto` (scales with area, 30–180) |
| `colors` | `colors` | `#38bdf8,#818cf8,#f472b6` | comma list in HTML, array in JS |
| `shape` | `shape` | `dot` | `dot` or `triangle` (triangles point where they fly) |
| `size` | `size` | `2` | particle radius, px |
| `speed` | `speed` | `1` | 0.3 = calm, 2 = energetic |
| `link-distance` | `linkDistance` | `110` | `0` = no connecting lines |
| `link-color` | `linkColor` | first color | |
| `link-opacity` | `linkOpacity` | `0.35` | |
| `link-width` | `linkWidth` | `1` | |
| `interaction` | `interaction` | `repel` | `repel`, `attract`, `none` |
| `interaction-radius` | `interactionRadius` | `140` | px |
| `interaction-strength` | `interactionStrength` | `1` | |
| `opacity` | `opacity` | `1` | whole layer; use `0.4–0.6` behind body text |
| `background` | `background` | `transparent` | fill color painted behind the particles |
| `perception` / `separation` / `alignment` / `cohesion` | same | `50` / `1.6` / `1` / `0.7` | boids tuning |
| `density`, `max-dpr` | `density`, `maxDpr`, `minCount`, `maxCount` | `12000`, `2`, `30`, `180` | performance |
| `fullscreen` | `fullscreen` | off | fixed full-viewport background |
| `paused` | `.stop()` / `.start()` | off | |
| `ignore-reduced-motion` | `respectReducedMotion: false` | off | **don't use** unless asked |
| CSS `--swarm-web-z-index` | `zIndex` | `-1` | layer order of the fullscreen background |

JS API: `const s = new SwarmWeb(elementOrSelector, options)` → `s.setOptions({...})`, `s.stop()`, `s.start()`, `s.destroy()`.
Element API: `document.querySelector('swarm-web').swarm` is the same instance. Changing attributes updates it live.

---

## 4. Rules — do / don't

- **Do** keep existing content readable. If text sits on top of the swarm and contrast suffers, lower `opacity` (0.5) or `link-opacity`, not the text.
- **Do** reuse the site's brand colors. Don't invent a new palette.
- **Do** add it in one place (one hero, or one fullscreen background). Don't put it on every section unless asked.
- **Don't** wrap navigation, forms or modals in `<swarm-web>`; it's for visual sections. (Clicks still work — the canvas has `pointer-events: none` — but layout styles may change.)
- **Don't** edit the library file. Configure it via attributes/options.
- **Don't** add `ignore-reduced-motion`. The library already shows a still frame for users who prefer reduced motion, pauses when off-screen or in a background tab, and caps pixel density.
- **Don't** add a dependency (no npm package is needed) unless the project already installs things from GitHub and the human prefers that.

---

## 5. Verify before you say "done"

1. Build / type-check / lint the project with its own commands (e.g. `npm run build`). Fix any errors you introduced.
2. Run the dev server and open the page (or, if you can't run a browser, re-read the edited files and confirm):
   - [ ] the swarm is visible where intended and moves; moving the mouse pushes/pulls particles;
   - [ ] text, buttons and links on top are still visible and clickable;
   - [ ] the swarm section has a non-zero height (most common bug: `<swarm-web>` with no content and no height);
   - [ ] no console errors (`SwarmWeb: target not found` means the selector/ref is wrong or ran before the element existed);
   - [ ] the script is included once, not once per page/component.
3. Report back to the human: which file(s) you added, where you placed the swarm, the options you chose, and how to change colors/density.

## 6. Troubleshooting

| Symptom | Fix |
|---|---|
| Nothing visible, no errors | The element has 0 height → give it `min-height` / a height class. |
| Fullscreen swarm hidden behind the page | Some ancestor paints an opaque background over it. Set `--swarm-web-z-index: 0` on the `<swarm-web fullscreen>` element and give the main content wrapper `position: relative; z-index: 1`. With the JS API pass `zIndex: 0` and make the same wrapper change. |
| Swarm covers the hero text | The hero content must be **inside** `<swarm-web>` / the host element, not a sibling positioned over it. |
| Vue warns "Failed to resolve component: swarm-web" | Add the `isCustomElement` compiler option (Recipe C). |
| `window is not defined` / `HTMLElement is not defined` (SSR) | Import or construct only on the client (`useEffect`, `onMount`, `.client` plugin, Astro `<script>`). Importing `swarm-web.mjs` itself is SSR-safe; constructing `new SwarmWeb()` is not. |
| Static picture, no animation | The OS has "reduce motion" enabled — this is intended. |
| Laggy on slow devices | Lower `count` (e.g. 60), set `link-distance` to 80, or `max-dpr="1"`. |
