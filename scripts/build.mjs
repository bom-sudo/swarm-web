// Builds dist/ from src/swarm-web.js (no dependencies).
//   dist/swarm-web.mjs  ES module   -> import { SwarmWeb } from './swarm-web.mjs'
//   dist/swarm-web.js   classic     -> <script src="swarm-web.js"></script>  (window.SwarmWeb)
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(resolve(root, 'src/swarm-web.js'), 'utf8');
const dist = resolve(root, 'dist');
mkdirSync(dist, { recursive: true });

writeFileSync(resolve(dist, 'swarm-web.mjs'), src);

const [banner, ...rest] = src.split('\n');
const body = rest
  .join('\n')
  .replace(/^export default .*$/m, '')
  .replace(/^export (const|class|function) /gm, '$1 ');
if (/^export /m.test(body)) throw new Error('build: unhandled export statement in src/swarm-web.js');

const iife = `${banner}
(function (global) {
  'use strict';
${body.trimEnd()}

  SwarmWeb.DEFAULTS = DEFAULTS;
  SwarmWeb.define = defineSwarmWeb;
  global.SwarmWeb = SwarmWeb;
})(typeof window !== 'undefined' ? window : globalThis);
`;
writeFileSync(resolve(dist, 'swarm-web.js'), iife);
copyFileSync(resolve(root, 'src/swarm-web.d.ts'), resolve(dist, 'swarm-web.d.ts'));

console.log('built dist/swarm-web.mjs, dist/swarm-web.js, dist/swarm-web.d.ts');
