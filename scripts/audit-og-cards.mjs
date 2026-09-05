#!/usr/bin/env node
// Post-build raster-integrity gate for the generated social cards.
//
// Source-token and dimension checks (test/brand-assets.test.mjs) cannot detect a
// blank or partially painted 1200x630 card — a real regression that once shipped
// when concurrent static rendering produced a card with the background but not
// the content layer. This audit reads the actually-rendered PNGs from dist/ and
// fails on wrong dimensions, blank/near-uniform paint, a missing brand palette,
// or a missing ink/content layer.

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import sharp from 'sharp';

const root = process.cwd();
// --dist lets the gate self-test point this at a throwaway copy of the build
// rather than mutating the tree that is about to ship.
const distArg = process.argv.indexOf('--dist');
const distDir = distArg === -1 ? path.join(root, 'dist') : path.resolve(root, process.argv[distArg + 1]);
const reportOnly = process.argv.includes('--report');

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

// Operational Clarity brand palette (must match src/data/og-card.ts).
const PALETTE = {
  paper: [244, 240, 231], // #f4f0e7 background
  ink: [7, 26, 50], // #071a32 headline/metric text
  cobalt: [22, 72, 220], // #1648dc rules, MP mark
  vermilion: [216, 75, 45], // #d84b2d eyebrows/labels (the layer that goes missing)
};

// Minimum share (of sampled pixels) each signal must reach for the card to count
// as fully painted. Calibrated below the values observed on real cards, with
// generous headroom so legitimate copy variation never trips the gate.
const FLOORS = {
  paper: 0.2, // >=20% background — proves it is our card, not a solid fill
  ink: 0.004, // >=0.4% dark text — proves the content/text layer painted
  cobalt: 0.002, // >=0.2% cobalt — proves structural rules/mark painted
  vermilion: 0.0004, // >=0.04% vermilion — proves the accent layer painted
  distinctColors: 24, // near-uniform blank fills collapse to a handful of colors
};

const TOLERANCE = 40; // per-channel distance for a palette-color match

function near(r, g, b, target) {
  return (
    Math.abs(r - target[0]) <= TOLERANCE &&
    Math.abs(g - target[1]) <= TOLERANCE &&
    Math.abs(b - target[2]) <= TOLERANCE
  );
}

async function listCards() {
  const cards = [];
  const homepage = path.join(distDir, 'og.png');
  if (await exists(homepage)) cards.push(homepage);
  const interiorDir = path.join(distDir, 'og');
  const entries = await fs.readdir(interiorDir, { withFileTypes: true }).catch((error) => {
    if (error.code === 'ENOENT') return [];
    throw error;
  });
  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith('.png')) cards.push(path.join(interiorDir, entry.name));
  }
  return cards;
}

async function exists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

async function analyze(file) {
  const image = sharp(file);
  const meta = await image.metadata();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  const channels = info.channels;

  let sampled = 0;
  const counts = { paper: 0, ink: 0, cobalt: 0, vermilion: 0 };
  const colorKeys = new Set();

  // Stride-sample every 4th pixel in each axis: fast, and preserves exact colors
  // (unlike downscaling, which blends the palette and hides thin rules).
  for (let y = 0; y < info.height; y += 4) {
    for (let x = 0; x < info.width; x += 4) {
      const idx = (y * info.width + x) * channels;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      sampled += 1;
      if (near(r, g, b, PALETTE.paper)) counts.paper += 1;
      if (near(r, g, b, PALETTE.ink)) counts.ink += 1;
      if (near(r, g, b, PALETTE.cobalt)) counts.cobalt += 1;
      if (near(r, g, b, PALETTE.vermilion)) counts.vermilion += 1;
      // Quantize to a 32-level cube to estimate distinct-color richness.
      colorKeys.add(((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3));
    }
  }

  return {
    file,
    width: meta.width,
    height: meta.height,
    format: meta.format,
    shares: {
      paper: counts.paper / sampled,
      ink: counts.ink / sampled,
      cobalt: counts.cobalt / sampled,
      vermilion: counts.vermilion / sampled,
    },
    distinctColors: colorKeys.size,
  };
}

function pct(value) {
  return `${(value * 100).toFixed(3)}%`;
}

async function main() {
  if (!(await exists(distDir))) {
    console.error('OG card audit: dist/ not found — run `astro build` first.');
    process.exit(1);
  }

  const cards = await listCards();
  if (cards.length === 0) {
    console.error('OG card audit: no dist/og.png or dist/og/*.png cards found.');
    process.exit(1);
  }

  const errors = [];
  console.log('OG card raster audit');
  console.log(`  cards checked: ${cards.length}`);

  for (const card of cards) {
    const rel = path.relative(distDir, card);
    const result = await analyze(card);

    if (result.format !== 'png') errors.push(`${rel}: not a PNG (${result.format})`);
    if (result.width !== OG_WIDTH || result.height !== OG_HEIGHT) {
      errors.push(`${rel}: dimensions ${result.width}x${result.height}, expected ${OG_WIDTH}x${OG_HEIGHT}`);
    }
    if (result.shares.paper < FLOORS.paper) {
      errors.push(`${rel}: background paper share ${pct(result.shares.paper)} < ${pct(FLOORS.paper)} (blank/wrong palette)`);
    }
    if (result.shares.ink < FLOORS.ink) {
      errors.push(`${rel}: ink/text share ${pct(result.shares.ink)} < ${pct(FLOORS.ink)} (content layer not painted)`);
    }
    if (result.shares.cobalt < FLOORS.cobalt) {
      errors.push(`${rel}: cobalt share ${pct(result.shares.cobalt)} < ${pct(FLOORS.cobalt)} (structure not painted)`);
    }
    if (result.shares.vermilion < FLOORS.vermilion) {
      errors.push(`${rel}: vermilion accent share ${pct(result.shares.vermilion)} < ${pct(FLOORS.vermilion)} (accent layer not painted)`);
    }
    if (result.distinctColors < FLOORS.distinctColors) {
      errors.push(`${rel}: only ${result.distinctColors} distinct colors < ${FLOORS.distinctColors} (near-uniform/blank)`);
    }

    if (reportOnly) {
      console.log(
        `  ${rel}: ${result.width}x${result.height} paper=${pct(result.shares.paper)} ink=${pct(result.shares.ink)} cobalt=${pct(result.shares.cobalt)} vermilion=${pct(result.shares.vermilion)} colors=${result.distinctColors}`,
      );
    }
  }

  if (errors.length && !reportOnly) {
    console.error('OG card audit FAILED:');
    for (const error of errors) console.error(`  - ${error}`);
    process.exit(1);
  }

  console.log('OG card raster audit passed.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
