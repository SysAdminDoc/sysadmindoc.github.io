#!/usr/bin/env node
// What visitors' browsers refused under the site's CSP, read from the report
// store on the VPS (deploy/vps/csp-report-server.mjs writes it). Read-only on
// the server. The avatar bug sat in that store for three weeks before anyone
// looked, so the nightly runs this after every deploy.
//
//   npm run csp:reports                  print the summary
//   npm run csp:reports -- --file <p>    read a local copy of the store instead
//   npm run csp:reports -- --record      remember the new violations it reports,
//                                        so each one fails the nightly once
//
// It always writes .tmp/csp-report-summary.json, which refresh-and-deploy.mjs
// reads. Exit 1 means the store couldn't be read; finding a new violation is
// not an error here, since the nightly decides what that costs.
//
//   PORTFOLIO_VPS_SSH   required unless --file is given (see scripts/deploy-vps.mjs)
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { parseStore, printable, summarizeReports, summaryLine } from './lib/csp-report-summary.mjs';
import { vpsSshOptions } from './lib/vps-ssh.mjs';

const root = process.cwd();
const tmpDir = path.join(root, '.tmp');
const statePath = path.join(tmpDir, 'csp-report-state.json');
const summaryPath = path.join(tmpDir, 'csp-report-summary.json');
// The store and its one rotated copy, at CSP_REPORT_LOG in deploy/vps/docker-compose.yml.
const REMOTE_READ =
  "docker exec portfolio-csp-reporter sh -c 'cat /var/lib/csp-reports/reports.ndjson.1 2>/dev/null; cat /var/lib/csp-reports/reports.ndjson 2>/dev/null; true'";

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function readStore() {
  const file = argValue('--file');
  if (file) return { source: 'file', text: fs.readFileSync(file, 'utf8') };
  const ssh = process.env.PORTFOLIO_VPS_SSH;
  if (!ssh) throw new Error('set PORTFOLIO_VPS_SSH (e.g. deploy@203.0.113.10), or pass --file');
  const text = execFileSync('ssh', [...vpsSshOptions(), ssh, REMOTE_READ], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
    timeout: 90_000,
    maxBuffer: 32 * 1024 * 1024,
  });
  return { source: 'vps', text };
}

function readKnown() {
  try {
    const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    return state && typeof state.known === 'object' && state.known !== null ? state.known : {};
  } catch {
    return {};
  }
}

function main() {
  let store;
  try {
    store = readStore();
  } catch (error) {
    const detail = printable(error instanceof Error ? error.message : String(error), 200);
    console.error(`csp-report-summary: could not read the report store: ${detail}`);
    process.exit(1);
  }

  const { reports, unreadable } = parseStore(store.text);
  const known = readKnown();
  const summary = summarizeReports(reports, { known: Object.keys(known) });
  const line = summaryLine(summary, unreadable);

  console.log(`csp-report-summary: ${line}`);
  for (const group of summary.firstParty.slice(0, 10)) {
    const flag = summary.newViolations.includes(group) ? 'NEW ' : known[group.key] ? '    ' : 'WAIT';
    const sample = group.sample ? `  sample: ${JSON.stringify(group.sample)}` : '';
    const minutes = Math.round(group.spanMs / 60_000);
    console.log(`  ${flag} ${group.key}: ${group.count} report(s) over ${minutes} min, last ${group.lastAt ?? 'unknown'}${sample}`);
  }

  fs.mkdirSync(tmpDir, { recursive: true });
  fs.writeFileSync(
    summaryPath,
    `${JSON.stringify(
      {
        schema: 'sysadmindoc.csp-report-summary.v1',
        generatedAt: new Date().toISOString(),
        source: store.source,
        line,
        total: summary.total,
        unreadable,
        counts: summary.counts,
        // Already capped, and exactly what --record remembers below.
        newViolations: summary.newViolations,
        deferred: summary.deferred,
        watching: summary.watching.slice(0, 20),
        firstParty: summary.firstParty.slice(0, 20),
      },
      null,
      2,
    )}\n`,
  );

  if (process.argv.includes('--record') && summary.newViolations.length > 0) {
    const now = new Date().toISOString();
    for (const group of summary.newViolations) known[group.key] = { reportedAt: now, count: group.count };
    fs.writeFileSync(statePath, `${JSON.stringify({ schema: 'sysadmindoc.csp-report-state.v1', known }, null, 2)}\n`);
  }
}

main();
