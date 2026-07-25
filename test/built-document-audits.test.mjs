import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';

const root = process.cwd();
const feedAudit = path.join(root, 'scripts', 'audit-feed.mjs');
const endpointAudit = path.join(root, 'scripts', 'audit-public-endpoints.mjs');

function run(script, args) {
  return spawnSync(process.execPath, [script, ...args], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 4 * 1024 * 1024,
  });
}

const rssFixture = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <title>Projects</title>
  <link>https://sysadmindoc.github.io/</link>
  <description>Project updates.</description>
  <item>
    <title>Example</title>
    <link>https://github.com/SysAdminDoc/example</link>
    <description>Example project.</description>
    <pubDate>Fri, 24 Jul 2026 12:00:00 GMT</pubDate>
  </item>
</channel></rss>`;

const releaseRssFixture = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <title>Releases</title>
  <link>https://sysadmindoc.github.io/releases/</link>
  <description>Release updates.</description>
  <item>
    <title>Example v1.0.0</title>
    <link>https://github.com/SysAdminDoc/example/releases/tag/v1.0.0</link>
    <description>Initial release.</description>
    <pubDate>Fri, 24 Jul 2026 12:00:00 GMT</pubDate>
  </item>
</channel></rss>`;

async function writeFeedFixture(dist) {
  await fs.writeFile(path.join(dist, 'icon.png'), 'icon');
  await fs.writeFile(path.join(dist, 'favicon.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>');
  await fs.writeFile(path.join(dist, 'feed.json'), JSON.stringify({
    version: 'https://jsonfeed.org/version/1.1',
    title: 'Projects',
    home_page_url: 'https://sysadmindoc.github.io/',
    feed_url: 'https://sysadmindoc.github.io/feed.json',
    icon: 'https://sysadmindoc.github.io/icon.png',
    favicon: 'https://sysadmindoc.github.io/favicon.svg',
    items: [{
      id: 'https://github.com/SysAdminDoc/example',
      url: 'https://github.com/SysAdminDoc/example',
      content_text: 'Example project.',
      date_modified: '2026-07-24T12:00:00Z',
    }],
  }));
  await fs.writeFile(path.join(dist, 'atom.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Projects</title>
  <id>https://sysadmindoc.github.io/</id>
  <updated>2026-07-24T12:00:00Z</updated>
  <link href="https://sysadmindoc.github.io/atom.xml" rel="self" type="application/atom+xml" />
  <entry>
    <title>Example</title>
    <id>https://github.com/SysAdminDoc/example</id>
    <updated>2026-07-24T12:00:00Z</updated>
    <summary>Example project.</summary>
    <content type="text">Example project.</content>
    <link href="https://github.com/SysAdminDoc/example" rel="alternate" />
  </entry>
</feed>`);
  await fs.writeFile(path.join(dist, 'rss.xml'), rssFixture);
  await fs.writeFile(path.join(dist, 'releases.xml'), releaseRssFixture);
}

test('built feed audit parses RSS documents and rejects truncated output', async (t) => {
  const dist = await fs.mkdtemp(path.join(os.tmpdir(), 'built-feed-audit-'));
  t.after(() => fs.rm(dist, { recursive: true, force: true }));
  await writeFeedFixture(dist);

  const valid = run(feedAudit, ['--dist', dist]);
  assert.equal(valid.status, 0, valid.stderr || valid.stdout);
  assert.match(valid.stdout, /RSS items: 1/);
  assert.match(valid.stdout, /release RSS items: 1/);

  for (const [file, original] of [['rss.xml', rssFixture], ['releases.xml', releaseRssFixture]]) {
    await fs.writeFile(path.join(dist, file), '<?xml version="1.0"?><rss><channel>');
    const truncated = run(feedAudit, ['--dist', dist]);
    assert.notEqual(truncated.status, 0, `${file} truncation must fail the audit`);
    assert.match(truncated.stderr, new RegExp(`${file} is not well-formed XML`));
    await fs.writeFile(path.join(dist, file), original);
  }
});

test('resume endpoint audit validates built JSON and rejects truncation', async (t) => {
  const dist = await fs.mkdtemp(path.join(os.tmpdir(), 'built-resume-audit-'));
  t.after(() => fs.rm(dist, { recursive: true, force: true }));
  const resumePath = path.join(dist, 'resume.json');
  await fs.writeFile(resumePath, JSON.stringify({
    $schema: 'https://raw.githubusercontent.com/jsonresume/resume-schema/v1.0.0/schema.json',
    basics: {
      name: 'Matt Parker',
      label: 'Senior Technical Support Manager',
      email: 'matt_parker@outlook.com',
      url: 'https://sysadmindoc.github.io/',
      summary: 'Enterprise IT and healthcare technology support.',
      location: { city: 'Sarasota', region: 'FL', countryCode: 'US' },
      profiles: [{ network: 'GitHub', username: 'SysAdminDoc', url: 'https://github.com/SysAdminDoc' }],
    },
    work: [{
      name: 'Maven Imaging',
      position: 'Senior Technical Support Manager',
      location: 'Remote',
      startDate: '2023-01-01',
      summary: 'Customer systems support.',
      highlights: ['Led escalations.'],
      keywords: ['Healthcare IT'],
    }],
    skills: [{ name: 'Systems administration', keywords: ['Windows'] }],
  }));

  const valid = run(endpointAudit, ['--dist', dist, '--resume-only']);
  assert.equal(valid.status, 0, valid.stderr || valid.stdout);
  assert.match(valid.stdout, /roles: 1/);

  await fs.writeFile(resumePath, '{"basics":');
  const truncated = run(endpointAudit, ['--dist', dist, '--resume-only']);
  assert.notEqual(truncated.status, 0, 'resume.json truncation must fail the audit');
  assert.match(truncated.stderr, /resume\.json is invalid JSON/);
});
