import type { APIContext } from 'astro';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { imageEndpointHeaders } from '../../data/endpoint-headers';
import { getInteriorOgPage, interiorOgPages } from '../../data/interior-og-pages';
import { featured, liveApps, catalog } from '../../data/portfolio';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FONT_CACHE = join(__dirname, '..', '..', '..', '.astro', 'fonts');

function bufferToExactArrayBuffer(buffer: Buffer): ArrayBuffer {
  return new Uint8Array(buffer).buffer;
}

async function loadFont(weight: 400 | 700): Promise<ArrayBuffer> {
  mkdirSync(FONT_CACHE, { recursive: true });
  const cachePath = join(FONT_CACHE, `jetbrains-mono-${weight}.ttf`);
  if (existsSync(cachePath)) return bufferToExactArrayBuffer(readFileSync(cachePath));
  // JetBrains Mono from GitHub release (single TTF per weight, well-cached CDN)
  const urlByWeight: Record<number, string> = {
    400: 'https://github.com/JetBrains/JetBrainsMono/raw/v2.304/fonts/ttf/JetBrainsMono-Regular.ttf',
    700: 'https://github.com/JetBrains/JetBrainsMono/raw/v2.304/fonts/ttf/JetBrainsMono-Bold.ttf',
  };
  const res = await fetch(urlByWeight[weight]);
  if (!res.ok) throw new Error(`Font fetch failed: ${res.status}`);
  const buf = await res.arrayBuffer();
  writeFileSync(cachePath, Buffer.from(buf));
  return buf;
}

const [regular, bold] = await Promise.all([loadFont(400), loadFont(700)]);

// Category → accent color map (matches site palette)
const accentByCat: Record<string, string> = {
  ps: '#58a6ff', py: '#4ade80', web: '#facc15', ext: '#fb923c',
  kt: '#2dd4bf', sec: '#f87171', media: '#fb923c', cs: '#c084fc',
  cpp: '#f97316', guide: '#8b9cc0', fork: '#7080a0', other: '#7080a0',
};
const labelByCat: Record<string, string> = {
  ps: 'PowerShell', py: 'Python', web: 'Web App', ext: 'Extension',
  kt: 'Android', sec: 'Security', media: 'Media', cs: 'Desktop',
  cpp: 'C++', guide: 'Guide', fork: 'Fork', other: 'Other',
};

export async function getStaticPaths() {
  const seen = new Set<string>();
  const paths: { params: { slug: string } }[] = [];
  const add = (slug: string) => {
    if (!slug || seen.has(slug)) return;
    seen.add(slug);
    paths.push({ params: { slug } });
  };
  interiorOgPages.forEach((page) => add(page.slug));
  featured.forEach((p) => add(p.repo));
  liveApps.forEach((a) => add(a.slug));
  catalog.forEach((c) => add(c.repo));
  return paths;
}

function decodeEntities(s: string) {
  return s
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&[a-z]+;/gi, ' ');
}

type CardBadge = {
  label: string;
  color: string;
  background: string;
  border: string;
};

type CardModel = {
  slug: string;
  name: string;
  desc: string;
  accent: string;
  catLabel: string;
  command: string;
  footer: string;
  badges: CardBadge[];
};

function projectCard(slug: string): CardModel {
  const f = featured.find((p) => p.repo === slug);
  const l = liveApps.find((a) => a.slug === slug);
  const c = catalog.find((x) => x.repo === slug);
  const name = f?.name ?? l?.name ?? c?.name ?? slug;
  const desc = decodeEntities(f?.desc ?? l?.desc ?? c?.desc ?? '');
  const category = f?.lang ?? c?.category ?? 'web';
  const accent = accentByCat[category] || '#58a6ff';
  const catLabel = labelByCat[category] || category.toUpperCase();
  const badges: CardBadge[] = [];
  if (f) {
    badges.push({
      label: 'FEATURED',
      color: '#facc15',
      background: '#facc1522',
      border: '#facc1555',
    });
  }
  if (l) {
    badges.push({
      label: 'LIVE',
      color: '#4ade80',
      background: '#4ade8022',
      border: '#4ade8055',
    });
  }

  return {
    slug,
    name,
    desc,
    accent,
    catLabel,
    command: `cat ${slug.slice(0, 40)}`,
    footer: 'Matt Parker  ·  github.com/SysAdminDoc',
    badges,
  };
}

function cardForSlug(slug: string): CardModel {
  const page = getInteriorOgPage(slug);
  if (!page) return projectCard(slug);

  return {
    slug: page.slug,
    name: page.title,
    desc: page.description,
    accent: page.accent,
    catLabel: page.label,
    command: page.command,
    footer: `${page.route}  ·  sysadmindoc.github.io`,
    badges: [
      {
        label: 'INTERIOR PAGE',
        color: '#e8edf5',
        background: '#e8edf522',
        border: '#e8edf555',
      },
    ],
  };
}

export async function GET({ params }: APIContext) {
  const slug = params.slug!;
  const card = cardForSlug(slug);

  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          width: 1200, height: 630, display: 'flex', flexDirection: 'column',
          background: '#0a0e17', color: '#e8edf5', padding: 60,
          fontFamily: 'JetBrains Mono',
          backgroundImage: `radial-gradient(ellipse at 80% 20%, ${card.accent}22, transparent 60%), radial-gradient(ellipse at 10% 90%, #c084fc15, transparent 60%)`,
        },
        children: [
          // Top: prompt + category
          {
            type: 'div',
            props: {
              style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#4ade80', fontSize: 22 },
              children: [
                { type: 'div', props: { children: `matt@sysadmin:~$ ${card.command}` } },
                {
                  type: 'div',
                  props: {
                    style: {
                      padding: '6px 14px', borderRadius: 8, background: `${card.accent}22`,
                      border: `1px solid ${card.accent}55`, color: card.accent, fontSize: 16, letterSpacing: 2,
                    },
                    children: card.catLabel.toUpperCase(),
                  },
                },
              ],
            },
          },
          // Center: title + description
          {
            type: 'div',
            props: {
              style: { display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center', gap: 24 },
              children: [
                {
                  type: 'div',
                  props: {
                    style: { fontSize: 72, fontWeight: 700, color: '#e8edf5', lineHeight: 1.05, letterSpacing: 0, maxWidth: 1080, overflow: 'hidden' },
                    children: card.name,
                  },
                },
                {
                  type: 'div',
                  props: {
                    style: { fontSize: 28, color: '#8b9cc0', lineHeight: 1.4, maxWidth: 1080, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' },
                    children: card.desc,
                  },
                },
              ],
            },
          },
          // Bottom: author + badges
          {
            type: 'div',
            props: {
              style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#8b9cc0', fontSize: 22 },
              children: [
                { type: 'div', props: { children: card.footer } },
                {
                  type: 'div',
                  props: {
                    style: { display: 'flex', gap: 12 },
                    children: card.badges.map((badge) => ({
                      type: 'div',
                      props: {
                        style: { padding: '6px 14px', borderRadius: 6, background: badge.background, color: badge.color, border: `1px solid ${badge.border}`, fontSize: 16 },
                        children: badge.label,
                      },
                    })),
                  },
                },
              ],
            },
          },
        ],
      },
    },
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: 'JetBrains Mono', data: regular, weight: 400, style: 'normal' },
        { name: 'JetBrains Mono', data: bold, weight: 700, style: 'normal' },
      ],
    }
  );

  const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();

  return new Response(new Uint8Array(png), {
    headers: imageEndpointHeaders('image/png'),
  });
}
