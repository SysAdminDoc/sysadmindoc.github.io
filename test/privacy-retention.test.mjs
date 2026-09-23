import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { DEFAULT_CONFIG as CONTACT_DEFAULTS } from '../deploy/vps/contact-handler.mjs';
import { DEFAULT_CONFIG as CSP_REPORT_DEFAULTS } from '../deploy/vps/csp-report-server.mjs';
import {
  ACCESS_LOG_RETENTION_DAYS,
  CSP_REPORT_STORE_MB,
  LEAD_RETENTION_DAYS,
  NOTIFICATION_CACHE_HOURS,
  PRIVACY_EFFECTIVE_DATE,
} from '../src/data/retention.ts';

const root = process.cwd();
const read = (...parts) => fs.readFile(path.join(root, ...parts), 'utf8');

// /privacy/ is a promise. Each period it states has to be the one something
// actually enforces, or the page is wrong the day either side changes.
test('every retention period /privacy/ states is the one its purge enforces', async () => {
  const compose = await read('deploy', 'vps', 'docker-compose.yml');

  // Leads: the contact handler deletes them at start and daily. Nothing in
  // compose may override the default the page is built from.
  assert.equal(CONTACT_DEFAULTS.leadRetentionDays, LEAD_RETENTION_DAYS);
  assert.doesNotMatch(compose, /CONTACT_RETENTION_DAYS/);

  // Lead notifications: ntfy expires its own cache.
  assert.equal(compose.match(/NTFY_CACHE_DURATION: (\S+)/)?.[1], `${NOTIFICATION_CACHE_HOURS}h`);

  // Access log: the edge rolls it at midnight and deletes rolled files by age
  // and by count, both set to the stated number of days.
  const edge = await read('deploy', 'vps', 'caddy-block.txt');
  const roll = edge.match(/output file \/var\/log\/caddy\/portfolio\.log \{([^}]*)\}/)?.[1] ?? '';
  assert.match(roll, /roll_at 00:00/);
  assert.equal(roll.match(/roll_keep (\d+)/)?.[1], String(ACCESS_LOG_RETENTION_DAYS));
  assert.equal(roll.match(/roll_keep_for (\d+)h/)?.[1], String(ACCESS_LOG_RETENTION_DAYS * 24));

  // CSP reports: the live file plus one rotated copy.
  assert.equal(CSP_REPORT_DEFAULTS.maxLogBytes * 2, CSP_REPORT_STORE_MB * 1024 * 1024);
  assert.doesNotMatch(compose, /CSP_REPORT_MAX_LOG_BYTES/);
});

test('the page renders those numbers from src/data/retention.ts rather than typing its own', async () => {
  const page = await read('src', 'pages', 'privacy.astro');
  for (const name of ['LEAD_RETENTION_DAYS', 'NOTIFICATION_CACHE_HOURS', 'ACCESS_LOG_RETENTION_DAYS', 'CSP_REPORT_STORE_MB']) {
    assert.match(page, new RegExp(`\\{${name}\\}`), `${name} is rendered from the shared constant`);
  }
  assert.match(page, /datetime=\{PRIVACY_EFFECTIVE_DATE\}/);
  assert.match(PRIVACY_EFFECTIVE_DATE, /^\d{4}-\d{2}-\d{2}$/);
  assert.doesNotMatch(page, /\b\d+ (?:days|hours|MB)\b/, 'no period is typed into the page');
});

test('every page links to /privacy/, and the form says how long a message is kept', async () => {
  const footer = await read('src', 'components', 'Footer.astro');
  assert.match(footer, /href: '\/privacy\/', label: 'Privacy'/);
  const form = await read('src', 'components', 'ContactForm.astro');
  assert.match(form, /kept for \{LEAD_RETENTION_DAYS\} days, then deleted/);
  assert.match(form, /href="\/privacy\/"/);
});

test('the traffic report the cron runs is the repo copy, and it reads the rolled logs too', async () => {
  const deploy = await read('scripts', 'deploy-vps.mjs');
  assert.ok(
    deploy.includes("path.join(root, 'deploy', 'vps', 'analytics-report.sh'), `${ssh}:${remoteDir}/bin/analytics-report.sh`"),
    'deploy-vps ships the script to the path the cron runs',
  );
  const script = await read('deploy', 'vps', 'analytics-report.sh');
  assert.ok(script.includes('"${0%.log}"-*.log.gz'), 'rolled, gzipped logs are read as well as the live one');
  assert.match(script, /--anonymize-ip/);
});
