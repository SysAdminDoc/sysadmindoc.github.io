import type { IOptions } from 'sanitize-html';

/**
 * Sanitizer settings for feed content bodies (`/rss.xml`, `/atom.xml`).
 *
 * These run at build time over reviewed catalog data, so this is defence in
 * depth rather than a boundary against hostile input. It is written explicitly
 * anyway because sanitize-html's defaults are broader than this site needs —
 * they permit `http`, `ftp`, `mailto`, and `tel` URLs plus protocol-relative
 * `//host/path` references across a long list of URL-bearing attributes. Every
 * link this site emits into a feed is an absolute HTTPS GitHub URL, so the
 * allowance is narrowed to match reality: anything else is dropped rather than
 * passed through to a feed reader.
 *
 * Kept in one module because the RSS and Atom endpoints previously carried
 * duplicate inline copies, which is exactly how one of them drifts.
 */
export const FEED_CONTENT_SANITIZE: IOptions = {
  allowedTags: ['p', 'a', 'strong', 'em', 'code'],
  allowedAttributes: { a: ['href'] },
  allowedSchemes: ['https'],
  allowProtocolRelative: false,
  disallowedTagsMode: 'discard',
};

/**
 * Plain-text extraction: strip every tag and attribute. Used for feed summaries
 * and catalog descriptions, where the output is escaped into XML or rendered as
 * text and markup would only ever be noise.
 */
export const TEXT_ONLY_SANITIZE: IOptions = {
  allowedTags: [],
  allowedAttributes: {},
  disallowedTagsMode: 'discard',
};
