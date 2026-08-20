/**
 * Loads the pricing engine out of index.html so the tests exercise the
 * SAME code the browser runs. There is no build step and no duplicated
 * copy of the tariff logic - if index.html changes, these tests change
 * behaviour with it. That is deliberate (see docs/adr/0001).
 */
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HTML = path.join(ROOT, 'index.html');

const MARKER = '/* ---------- Section B';

export function loadEngine() {
  const html = fs.readFileSync(HTML, 'utf8');
  const m = html.match(/<script>([\s\S]*?)<\/script>/);
  if (!m) throw new Error('No <script> block found in index.html');

  const script = m[1];
  const cut = script.indexOf(MARKER);
  if (cut === -1) {
    throw new Error(
      `Could not find the marker "${MARKER}" in index.html. The pure-logic ` +
      `section must stay above the first DOM-touching function, otherwise ` +
      `these tests cannot isolate it.`
    );
  }

  const logic = script.slice(0, cut);
  const expose =
    ';globalThis.TIERS=TIERS;globalThis.tierOf=tierOf;' +
    'globalThis.actualCostNoFee=actualCostNoFee;globalThis.billOf=billOf;' +
    'globalThis.SLIDER_MAX=SLIDER_MAX;globalThis.MECH_TEXT=MECH_TEXT;';

  const ctx = vm.createContext({});
  vm.runInContext(logic + expose, ctx);
  return ctx;
}

/** Round to 2dp for money comparisons. */
export const money = (n) => Math.round(n * 100) / 100;
