import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { loadCachedFont } from './og-font-cache';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FONT_CACHE = join(__dirname, '..', '..', '.astro', 'fonts');

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

export interface OgMetric {
  label: string;
  value: string;
}

export interface OgCardModel {
  eyebrow: string;
  title: string;
  description: string;
  route: string;
  accent?: string;
  metrics: readonly [OgMetric, OgMetric, OgMetric];
}

const fontSources = {
  outfit400: 'https://unpkg.com/@fontsource/outfit@5.3.0/files/outfit-latin-400-normal.woff',
  outfit700: 'https://unpkg.com/@fontsource/outfit@5.3.0/files/outfit-latin-700-normal.woff',
  outfit800: 'https://unpkg.com/@fontsource/outfit@5.3.0/files/outfit-latin-800-normal.woff',
  mono400: 'https://github.com/JetBrains/JetBrainsMono/raw/v2.304/fonts/ttf/JetBrainsMono-Regular.ttf',
  mono700: 'https://github.com/JetBrains/JetBrainsMono/raw/v2.304/fonts/ttf/JetBrainsMono-Bold.ttf',
} as const;

let fontPromise: Promise<{
  outfit400: ArrayBuffer;
  outfit700: ArrayBuffer;
  outfit800: ArrayBuffer;
  mono400: ArrayBuffer;
  mono700: ArrayBuffer;
}> | null = null;

function loadOgFonts() {
  if (!fontPromise) {
    fontPromise = Promise.all([
      loadCachedFont(join(FONT_CACHE, 'outfit-400.woff'), fontSources.outfit400),
      loadCachedFont(join(FONT_CACHE, 'outfit-700.woff'), fontSources.outfit700),
      loadCachedFont(join(FONT_CACHE, 'outfit-800.woff'), fontSources.outfit800),
      loadCachedFont(join(FONT_CACHE, 'jetbrains-mono-400.ttf'), fontSources.mono400),
      loadCachedFont(join(FONT_CACHE, 'jetbrains-mono-700.ttf'), fontSources.mono700),
    ]).then(([outfit400, outfit700, outfit800, mono400, mono700]) => ({
      outfit400,
      outfit700,
      outfit800,
      mono400,
      mono700,
    }));
  }
  return fontPromise;
}

function headlineSize(title: string) {
  if (title.length > 28) return 57;
  if (title.length > 18) return 66;
  if (title.length > 12) return 76;
  return 88;
}

const operatingLanes = [
  ['01', 'AI IMPLEMENTATION', 'TOOLS · AUTOMATION · ENABLEMENT'],
  ['02', 'HEALTHCARE SYSTEMS', 'PACS/DICOM · SUPPORT · MIGRATIONS'],
  ['03', 'INFRASTRUCTURE & AUTOMATION', 'WINDOWS · NETWORKS · SOFTWARE'],
] as const;

let renderQueue: Promise<void> = Promise.resolve();

export function renderOgCard(card: OgCardModel): Promise<Uint8Array> {
  const next = renderQueue.then(() => renderOgCardNow(card));
  renderQueue = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

async function renderOgCardNow(card: OgCardModel) {
  const fonts = await loadOgFonts();
  const accent = card.accent ?? '#1648dc';

  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          width: OG_WIDTH,
          height: OG_HEIGHT,
          display: 'flex',
          flexDirection: 'column',
          background: '#f4f0e7',
          color: '#071a32',
          fontFamily: 'Outfit',
          borderTop: '8px solid #1648dc',
        },
        children: [
          {
            type: 'div',
            props: {
              style: {
                height: 76,
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 44px',
                borderBottom: '1px solid rgba(7,26,50,.24)',
              },
              children: [
                {
                  type: 'div',
                  props: {
                    style: { display: 'flex', alignItems: 'center', gap: 16 },
                    children: [
                      {
                        type: 'div',
                        props: {
                          style: {
                            width: 46,
                            height: 46,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: '#1648dc',
                            color: '#ffffff',
                            fontSize: 18,
                            fontWeight: 800,
                            letterSpacing: '-.04em',
                          },
                          children: 'MP',
                        },
                      },
                      {
                        type: 'div',
                        props: {
                          style: { display: 'flex', flexDirection: 'column', gap: 2 },
                          children: [
                            {
                              type: 'div',
                              props: {
                                style: { fontSize: 19, fontWeight: 800, letterSpacing: '.09em' },
                                children: 'SYSADMINDOC',
                              },
                            },
                            {
                              type: 'div',
                              props: {
                                style: {
                                  color: '#667386',
                                  fontFamily: 'JetBrains Mono',
                                  fontSize: 8,
                                  fontWeight: 700,
                                  letterSpacing: '.18em',
                                },
                                children: 'AI · HEALTHCARE · SYSTEMS',
                              },
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
                {
                  type: 'div',
                  props: {
                    style: {
                      color: '#d84b2d',
                      fontFamily: 'JetBrains Mono',
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: '.15em',
                    },
                    children: 'INDEPENDENT TECHNICAL PRACTICE · MP-001',
                  },
                },
              ],
            },
          },
          {
            type: 'div',
            props: {
              style: { height: 434, flexShrink: 0, display: 'flex', minHeight: 0 },
              children: [
                {
                  type: 'div',
                  props: {
                    style: {
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      padding: '34px 46px 30px',
                    },
                    children: [
                      {
                        type: 'div',
                        props: {
                          style: {
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            marginBottom: 20,
                            color: '#d84b2d',
                            fontFamily: 'JetBrains Mono',
                            fontSize: 11,
                            fontWeight: 700,
                            letterSpacing: '.16em',
                          },
                          children: [
                            {
                              type: 'div',
                              props: { style: { width: 9, height: 9, background: accent } },
                            },
                            { type: 'div', props: { children: card.eyebrow.toUpperCase() } },
                          ],
                        },
                      },
                      {
                        type: 'div',
                        props: {
                          style: {
                            maxWidth: 760,
                            color: '#071a32',
                            fontSize: headlineSize(card.title),
                            fontWeight: 800,
                            lineHeight: .92,
                            letterSpacing: '-.055em',
                          },
                          children: card.title,
                        },
                      },
                      {
                        type: 'div',
                        props: {
                          style: {
                            maxWidth: 730,
                            maxHeight: 100,
                            display: '-webkit-box',
                            marginTop: 22,
                            overflow: 'hidden',
                            color: '#34465c',
                            fontSize: 22,
                            lineHeight: 1.42,
                            WebkitBoxOrient: 'vertical',
                            WebkitLineClamp: 3,
                          },
                          children: card.description,
                        },
                      },
                      {
                        type: 'div',
                        props: {
                          style: {
                            marginTop: 20,
                            color: '#1648dc',
                            fontFamily: 'JetBrains Mono',
                            fontSize: 11,
                            fontWeight: 700,
                            letterSpacing: '.08em',
                          },
                          children: card.route,
                        },
                      },
                    ],
                  },
                },
                {
                  type: 'div',
                  props: {
                    style: {
                      width: 340,
                      display: 'flex',
                      flexDirection: 'column',
                      padding: '32px 34px 26px',
                      borderLeft: '1px solid rgba(7,26,50,.24)',
                    },
                    children: [
                      {
                        type: 'div',
                        props: {
                          style: {
                            marginBottom: 18,
                            color: '#d84b2d',
                            fontFamily: 'JetBrains Mono',
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: '.16em',
                          },
                          children: 'OPERATING INDEX',
                        },
                      },
                      ...operatingLanes.map(([number, name, detail]) => ({
                        type: 'div',
                        props: {
                          style: {
                            flex: 1,
                            display: 'flex',
                            gap: 12,
                            padding: '14px 0',
                            borderTop: '1px solid rgba(7,26,50,.2)',
                          },
                          children: [
                            {
                              type: 'div',
                              props: {
                                style: {
                                  width: 24,
                                  color: '#d84b2d',
                                  fontFamily: 'JetBrains Mono',
                                  fontSize: 9,
                                },
                                children: number,
                              },
                            },
                            {
                              type: 'div',
                              props: {
                                style: { flex: 1, display: 'flex', flexDirection: 'column', gap: 6 },
                                children: [
                                  {
                                    type: 'div',
                                    props: {
                                      style: { fontSize: 14, fontWeight: 800, lineHeight: 1.12 },
                                      children: name,
                                    },
                                  },
                                  {
                                    type: 'div',
                                    props: {
                                      style: {
                                        color: '#667386',
                                        fontFamily: 'JetBrains Mono',
                                        fontSize: 7,
                                        fontWeight: 700,
                                        letterSpacing: '.08em',
                                        lineHeight: 1.45,
                                      },
                                      children: detail,
                                    },
                                  },
                                ],
                              },
                            },
                          ],
                        },
                      })),
                    ],
                  },
                },
              ],
            },
          },
          {
            type: 'div',
            props: {
              style: {
                height: 112,
                flexShrink: 0,
                display: 'flex',
                margin: '0 44px',
                borderTop: '2px solid #1648dc',
              },
              children: card.metrics.map((metric, index) => ({
                type: 'div',
                props: {
                  style: {
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    padding: index === 0 ? '0 24px 0 0' : '0 24px',
                    borderLeft: index === 0 ? '0' : '1px solid rgba(7,26,50,.24)',
                  },
                  children: [
                    {
                      type: 'div',
                      props: {
                        style: {
                          marginBottom: 7,
                          color: '#d84b2d',
                          fontFamily: 'JetBrains Mono',
                          fontSize: 9,
                          fontWeight: 700,
                          letterSpacing: '.15em',
                        },
                        children: metric.label.toUpperCase(),
                      },
                    },
                    {
                      type: 'div',
                      props: {
                        style: {
                          color: '#071a32',
                          fontFamily: 'JetBrains Mono',
                          fontSize: 26,
                          fontWeight: 700,
                          letterSpacing: '-.04em',
                        },
                        children: metric.value,
                      },
                    },
                  ],
                },
              })),
            },
          },
        ],
      },
    },
    {
      width: OG_WIDTH,
      height: OG_HEIGHT,
      fonts: [
        { name: 'Outfit', data: fonts.outfit400, weight: 400, style: 'normal' },
        { name: 'Outfit', data: fonts.outfit700, weight: 700, style: 'normal' },
        { name: 'Outfit', data: fonts.outfit800, weight: 800, style: 'normal' },
        { name: 'JetBrains Mono', data: fonts.mono400, weight: 400, style: 'normal' },
        { name: 'JetBrains Mono', data: fonts.mono700, weight: 700, style: 'normal' },
      ],
    },
  );

  return new Uint8Array(
    new Resvg(svg, { fitTo: { mode: 'width', value: OG_WIDTH } }).render().asPng(),
  );
}
