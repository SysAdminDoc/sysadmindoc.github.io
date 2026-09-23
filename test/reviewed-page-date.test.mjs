import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pageNodeDates } from '../scripts/lib/reviewed-page-date.mjs';

const url = 'https://portfolio.getparkerai.com/now/';
const block = (data) => `<script type="application/ld+json">${JSON.stringify(data)}</script>`;

// The fourth drain review hid a wrong page date behind an earlier block that
// carried the right one, and the audit read the first date it met.
test('only the page node\'s own date counts, wherever other dates sit', () => {
  const html = [
    block({ '@context': 'https://schema.org', '@id': 'https://portfolio.getparkerai.com/#website', dateModified: '2026-09-23T00:00:00.000Z' }),
    block({
      '@context': 'https://schema.org',
      '@graph': [
        { '@id': `${url}#offer`, dateModified: '2026-09-23T00:00:00.000Z' },
        { '@id': `${url}#webpage`, '@type': 'WebPage', dateModified: '2001-01-01T00:00:00.000Z' },
      ],
    }),
  ].join('');
  assert.deepEqual(pageNodeDates(html, url), ['2001-01-01T00:00:00.000Z']);
});

test('a page with no page node, or an unreadable block, gives no date', () => {
  assert.deepEqual(pageNodeDates(block({ '@id': 'https://portfolio.getparkerai.com/#website', dateModified: '2026-09-23' }), url), []);
  assert.deepEqual(pageNodeDates('<script type="application/ld+json">{not json</script>', url), []);
  assert.deepEqual(pageNodeDates(block({ '@id': `${url}#webpage`, dateModified: '2026-09-23' }), 'https://portfolio.getparkerai.com/uses/'), []);
});

test('two page nodes that disagree give both dates, so the audit can refuse them', () => {
  const html = block({ '@id': `${url}#webpage`, dateModified: '2026-09-23' }) + block({ '@id': `${url}#webpage`, dateModified: '2026-06-04' });
  assert.deepEqual(pageNodeDates(html, url).sort(), ['2026-06-04', '2026-09-23']);
  assert.deepEqual(pageNodeDates(html + block({ '@id': `${url}#webpage`, dateModified: '2026-09-23' }), url).length, 2, 'the same date twice is one date');
});
