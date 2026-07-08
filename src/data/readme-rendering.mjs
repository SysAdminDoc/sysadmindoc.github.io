import { Marked } from 'marked';
import sanitizeHtml from 'sanitize-html';
import { createHighlighter } from 'shiki';

const SHIKI_THEME = 'github-dark-default';
const SHIKI_LANGS = [
  'javascript',
  'typescript',
  'tsx',
  'jsx',
  'json',
  'shellscript',
  'powershell',
  'python',
  'html',
  'css',
  'scss',
  'yaml',
  'xml',
  'csharp',
  'cpp',
  'kotlin',
  'diff',
  'markdown',
];

const SHIKI_COLOR_CLASSES = new Map([
  ['#161B22', 'shiki-c-canvas'],
  ['#79C0FF', 'shiki-c-blue'],
  ['#7EE787', 'shiki-c-green'],
  ['#8B949E', 'shiki-c-muted'],
  ['#A5D6FF', 'shiki-c-cyan'],
  ['#D2A8FF', 'shiki-c-purple'],
  ['#F0F6FC', 'shiki-c-bright'],
  ['#FF7B72', 'shiki-c-red'],
  ['#FFA198', 'shiki-c-rose'],
  ['#FFA657', 'shiki-c-orange'],
]);
const SHIKI_SPAN_CLASSES = [
  'line',
  ...SHIKI_COLOR_CLASSES.values(),
  'shiki-f-italic',
  'shiki-f-bold',
  'shiki-f-underline',
];
const README_WORDS_PER_MINUTE = 220;

const LANGUAGE_ALIASES = new Map([
  ['astro', 'html'],
  ['bash', 'shellscript'],
  ['c#', 'csharp'],
  ['console', 'shellscript'],
  ['cs', 'csharp'],
  ['htm', 'html'],
  ['js', 'javascript'],
  ['kotlin', 'kotlin'],
  ['kt', 'kotlin'],
  ['jsx', 'jsx'],
  ['md', 'markdown'],
  ['mjs', 'javascript'],
  ['ps', 'powershell'],
  ['ps1', 'powershell'],
  ['pwsh', 'powershell'],
  ['py', 'python'],
  ['sh', 'shellscript'],
  ['shell', 'shellscript'],
  ['terminal', 'shellscript'],
  ['ts', 'typescript'],
  ['tsx', 'tsx'],
  ['yml', 'yaml'],
]);

let highlighterPromise;

export function getReadmeHighlighter() {
  highlighterPromise ??= createHighlighter({
    themes: [SHIKI_THEME],
    langs: SHIKI_LANGS,
  });
  return highlighterPromise;
}

export function normalizeReadmeCodeLang(rawLang, loadedLanguages = []) {
  const firstToken = String(rawLang ?? '').trim().split(/\s+/)[0]?.toLowerCase() ?? '';
  if (!firstToken) return null;
  const normalized = LANGUAGE_ALIASES.get(firstToken) ?? firstToken;
  return loadedLanguages.includes(normalized) ? normalized : null;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/"/g, '&quot;');
}

function safeClassToken(value) {
  return String(value).replace(/[^A-Za-z0-9_-]/g, '-');
}

function stripHtml(value) {
  return String(value).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function stripMarkdownForReading(value) {
  return String(value)
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z0-9#]+;/gi, ' ')
    .replace(/[#>*_~[\]()`|:-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeEmbeddedHeadingDepth(rawDepth, previousDepth) {
  const nestedDepth = Math.min(6, Math.max(3, Number(rawDepth) + 2));
  return Math.min(nestedDepth, previousDepth + 1);
}

function labelEmptyTableHeaders(html) {
  return String(html).replace(/<thead>([\s\S]*?)<\/thead>/gi, (theadHtml) => {
    let column = 0;
    return theadHtml.replace(/<th\b([^>]*)>([\s\S]*?)<\/th>/gi, (match, attrs, inner) => {
      column += 1;
      return stripHtml(inner) ? match : `<th${attrs}>Column ${column}</th>`;
    });
  });
}

export function getReadmeReadingTime(rawMd) {
  const text = stripMarkdownForReading(rawMd);
  const words = text ? text.split(/\s+/).length : 0;
  const minutes = Math.max(1, Math.ceil(words / README_WORDS_PER_MINUTE));
  return {
    words,
    minutes,
    label: `${minutes} min read`,
  };
}

function isAbsoluteReadmeRef(value) {
  return /^(?:https?:|data:|\/\/|#|mailto:)/i.test(value);
}

function renderToken(token) {
  const content = escapeHtml(token.content);
  const classes = [];
  const colorClass = SHIKI_COLOR_CLASSES.get(String(token.color ?? '').toUpperCase());
  if (colorClass) classes.push(colorClass);
  if ((token.fontStyle ?? 0) & 1) classes.push('shiki-f-italic');
  if ((token.fontStyle ?? 0) & 2) classes.push('shiki-f-bold');
  if ((token.fontStyle ?? 0) & 4) classes.push('shiki-f-underline');
  return classes.length > 0 ? `<span class="${classes.join(' ')}">${content}</span>` : content;
}

function fallbackCodeHtml(code, lang) {
  const languageClass = lang ? ` language-${safeClassToken(lang)}` : '';
  return `<pre class="readme-code" tabindex="0"><code class="readme-code-inner${languageClass}">${escapeHtml(code)}</code></pre>`;
}

export function renderHighlightedCode(code, rawLang, highlighter) {
  const loadedLanguages = highlighter.getLoadedLanguages?.() ?? [];
  const lang = normalizeReadmeCodeLang(rawLang, loadedLanguages);
  if (!lang) return fallbackCodeHtml(code, rawLang);

  try {
    const result = highlighter.codeToTokens(code, { lang, theme: SHIKI_THEME });
    const languageClass = ` language-${safeClassToken(lang)}`;
    const lines = result.tokens.map((line) => `<span class="line">${line.map(renderToken).join('')}</span>`);
    return `<pre class="readme-code shiki shiki-github-dark-default" tabindex="0"><code class="readme-code-inner${languageClass}">${lines.join('\n')}</code></pre>`;
  } catch {
    return fallbackCodeHtml(code, rawLang);
  }
}

export async function renderProjectReadme(rawMd, slug, options = {}) {
  if (!rawMd || rawMd.trim().length === 0) return null;

  const highlighter = options.highlighter ?? await getReadmeHighlighter();
  const rawBase = `https://raw.githubusercontent.com/SysAdminDoc/${slug}/HEAD/`;
  const blobBase = `https://github.com/SysAdminDoc/${slug}/blob/HEAD/`;
  const resolveReadmeAsset = (value) =>
    isAbsoluteReadmeRef(value) ? value : rawBase + value.replace(/^\.?\//, '');
  const resolveReadmeLink = (value) =>
    isAbsoluteReadmeRef(value) ? value : blobBase + value.replace(/^\.?\//, '');

  const marked = new Marked();
  marked.use({
    gfm: true,
    breaks: false,
    renderer: {
      code(token) {
        return renderHighlightedCode(token.text ?? '', token.lang ?? '', highlighter);
      },
      image(token) {
        const href = resolveReadmeAsset(token.href);
        const alt = token.text ?? '';
        return `<img src="${escapeAttr(href)}" alt="${escapeAttr(alt)}" loading="lazy" decoding="async" />`;
      },
      link(token) {
        const href = resolveReadmeLink(token.href);
        const safeHref = escapeAttr(href);
        const safeText = token.text ?? safeHref;
        if (href.startsWith('#')) {
          return `<a href="${safeHref}">${safeText}</a>`;
        }
        if (href.startsWith('mailto:')) {
          return `<a href="${safeHref}" rel="nofollow">${safeText}</a>`;
        }
        return `<a href="${safeHref}" rel="noopener nofollow" target="_blank">${safeText}</a>`;
      },
    },
  });

  const rendered = await marked.parse(rawMd);
  const headingCounts = new Map();
  const outline = [];
  let previousHeadingDepth = 2;
  const renderedWithHeadingIds = String(rendered).replace(/<h([1-6])>([\s\S]*?)<\/h\1>/g, (_match, level, inner) => {
    const depth = normalizeEmbeddedHeadingDepth(level, previousHeadingDepth);
    previousHeadingDepth = depth;
    const text = stripHtml(inner);
    const baseId = text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'section';
    const seen = headingCounts.get(baseId) ?? 0;
    headingCounts.set(baseId, seen + 1);
    const id = seen === 0 ? baseId : `${baseId}-${seen + 1}`;
    outline.push({ depth, id, text });
    return `<h${depth} id="${escapeAttr(id)}">${inner}</h${depth}>`;
  });
  const accessibleReadmeHtml = labelEmptyTableHeaders(renderedWithHeadingIds);

  const html = sanitizeHtml(accessibleReadmeHtml, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'h1', 'h2', 'picture', 'source', 'details', 'summary', 'kbd', 'del', 'input']),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      img: ['src', 'alt', 'title', 'width', 'height', 'loading', 'decoding', 'align'],
      a: ['href', 'name', 'target', 'rel', 'id'],
      pre: ['class', 'tabindex'],
      code: ['class'],
      span: ['class'],
      div: ['class', 'align'],
      h1: ['id'], h2: ['id'], h3: ['id'], h4: ['id'], h5: ['id'], h6: ['id'],
      input: ['type', 'checked', 'disabled'],
      source: ['srcset', 'media', 'type'],
    },
    allowedClasses: {
      pre: ['readme-code', 'shiki', 'shiki-github-dark-default'],
      code: ['readme-code-inner', /^language-[A-Za-z0-9_-]+$/],
      span: SHIKI_SPAN_CLASSES,
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesByTag: { img: ['http', 'https', 'data'] },
    transformTags: {
      a: (tagName, attribs) => {
        const href = attribs.href ?? '';
        const nextAttribs = { ...attribs };
        if (href) nextAttribs.href = resolveReadmeLink(href);
        if (href.startsWith('#')) {
          delete nextAttribs.rel;
          delete nextAttribs.target;
          return { tagName, attribs: nextAttribs };
        }
        if (href.startsWith('mailto:')) {
          nextAttribs.rel = 'nofollow';
          delete nextAttribs.target;
          return { tagName, attribs: nextAttribs };
        }
        nextAttribs.rel = 'noopener nofollow';
        nextAttribs.target = '_blank';
        return { tagName, attribs: nextAttribs };
      },
      img: (tagName, attribs) => {
        const nextAttribs = { ...attribs };
        if (nextAttribs.src) nextAttribs.src = resolveReadmeAsset(nextAttribs.src);
        if (!nextAttribs.loading) nextAttribs.loading = 'lazy';
        if (!nextAttribs.decoding) nextAttribs.decoding = 'async';
        // Raw README <img> tags can omit alt; guarantee a text alternative
        // (title when present, otherwise empty = decorative) for a11y.
        if (nextAttribs.alt == null) nextAttribs.alt = nextAttribs.title ?? '';
        return { tagName, attribs: nextAttribs };
      },
      input: (tagName, attribs) => {
        // Only allow GFM task-list checkboxes; force disabled to prevent interaction.
        if (attribs.type !== 'checkbox') return { tagName: '', attribs: {} };
        return { tagName, attribs: { type: 'checkbox', disabled: '', ...(attribs.checked != null ? { checked: '' } : {}) } };
      },
    },
  });

  return {
    html,
    outline,
    readingTime: getReadmeReadingTime(rawMd),
  };
}

export async function renderProjectReadmeHtml(rawMd, slug, options = {}) {
  const result = await renderProjectReadme(rawMd, slug, options);
  return result?.html ?? null;
}
