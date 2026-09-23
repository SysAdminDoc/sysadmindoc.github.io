// A reviewed page's JSON-LD names its own node `<url>#webpage`
// (reviewedWebPageJsonLd in src/data/page-freshness.ts), and that node's
// dateModified is the one a search engine pairs with the sitemap lastmod. The
// first dateModified on the page is not always it: an earlier block, or an
// earlier node in the same @graph, can carry another.

const JSON_LD_BLOCK = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

/**
 * Every distinct dateModified on the node whose @id is `${pageUrl}#webpage`.
 * @param {string} html
 * @param {string} pageUrl
 * @returns {string[]}
 */
export function pageNodeDates(html, pageUrl) {
  const id = `${pageUrl}#webpage`;
  const dates = new Set();
  for (const match of html.matchAll(JSON_LD_BLOCK)) {
    let data;
    try {
      data = JSON.parse(match[1]);
    } catch {
      continue;
    }
    const queue = [data];
    while (queue.length > 0) {
      const node = queue.shift();
      if (Array.isArray(node)) queue.push(...node);
      else if (node && typeof node === 'object') {
        if (node['@id'] === id && typeof node.dateModified === 'string') dates.add(node.dateModified);
        queue.push(...Object.values(node));
      }
    }
  }
  return [...dates];
}
