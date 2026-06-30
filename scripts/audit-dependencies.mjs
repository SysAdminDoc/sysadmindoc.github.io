#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const severityOrder = ['info', 'low', 'moderate', 'high', 'critical'];

export const knownMajorBlocks = {
  astro: {
    major: 7,
    reason: 'Astro 7 needs a separate migration pass for the Astro 6 static build, Pagefind, CSP, and Playwright audit chain.',
  },
  vite: {
    major: 8,
    reason: 'Vite is pinned through package overrides and should move with Astro after compatibility checks.',
  },
};

function hasFlag(name) {
  return process.argv.includes(name);
}

function option(name, fallback = undefined) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
}

function parseSeverity(value) {
  const severity = String(value ?? 'high').toLowerCase();
  if (severity === 'none') return severity;
  if (!severityOrder.includes(severity)) {
    throw new Error(`Unsupported audit threshold "${value}". Use one of: ${severityOrder.join(', ')}, none.`);
  }
  return severity;
}

function parseJsonText(text, label) {
  const trimmed = String(text ?? '').trim();
  if (!trimmed) return {};
  try {
    return JSON.parse(trimmed);
  } catch (error) {
    throw new Error(`${label} did not return valid JSON: ${error.message}`);
  }
}

function runNpmJson(args, { allowOutdatedExit = false } = {}) {
  const npmExecPath = process.env.npm_execpath;
  const command = npmExecPath ? process.execPath : process.platform === 'win32' ? process.env.ComSpec || 'cmd.exe' : 'npm';
  const commandArgs = npmExecPath
    ? [npmExecPath, ...args]
    : process.platform === 'win32'
      ? ['/d', '/s', '/c', 'npm', ...args]
      : args;
  const result = spawnSync(command, commandArgs, {
    cwd: root,
    encoding: 'utf8',
    shell: false,
  });
  if (result.error) {
    throw new Error(`npm ${args.join(' ')} failed to start: ${result.error.message}`);
  }
  const allowedStatuses = allowOutdatedExit ? new Set([0, 1]) : new Set([0, 1]);
  if (!allowedStatuses.has(result.status ?? 1) && !result.stdout.trim()) {
    throw new Error(`npm ${args.join(' ')} failed: ${result.stderr.trim() || `exit ${result.status}`}`);
  }
  return parseJsonText(result.stdout, `npm ${args.join(' ')}`);
}

function flattenOverridePackages(overrides, seen = new Map()) {
  if (!overrides || typeof overrides !== 'object') return seen;
  for (const [name, spec] of Object.entries(overrides)) {
    if (typeof spec === 'string') {
      seen.set(name, spec);
    } else if (spec && typeof spec === 'object') {
      flattenOverridePackages(spec, seen);
    }
  }
  return seen;
}

function lockVersion(lock, name) {
  return lock?.packages?.[`node_modules/${name}`]?.version ?? null;
}

function collectTrackedPackages(manifest, lock) {
  const tracked = new Map();
  const sections = [
    ['dependencies', 'production'],
    ['devDependencies', 'development'],
  ];

  for (const [section, type] of sections) {
    for (const [name, requested] of Object.entries(manifest[section] ?? {})) {
      tracked.set(name, {
        name,
        type,
        requested,
        current: lockVersion(lock, name),
      });
    }
  }

  for (const [name, requested] of flattenOverridePackages(manifest.overrides ?? {})) {
    if (tracked.has(name)) continue;
    tracked.set(name, {
      name,
      type: 'override',
      requested,
      current: lockVersion(lock, name),
    });
  }

  return [...tracked.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function isNestedPackageLocation(location) {
  return /\/node_modules\/(?:@[^/]+\/)?[^/]+\/node_modules\//.test(String(location ?? '').replaceAll('\\', '/'));
}

function normalizeOutdatedEntry(entry, pkg) {
  if (!entry) return null;
  const entries = Array.isArray(entry) ? entry : [entry];
  const directEntry = entries.find((item) => item?.location && !isNestedPackageLocation(item.location));
  if (directEntry) return directEntry;
  if (pkg.type !== 'override') return null;
  return entries.find((item) => item?.current) ?? entries[0] ?? null;
}

function majorOf(version) {
  const match = String(version ?? '').match(/^v?(\d+)/);
  return match ? Number(match[1]) : null;
}

function classifyPackage(row) {
  const currentMajor = majorOf(row.current);
  const latestMajor = majorOf(row.latest);
  if (!row.current || row.current === 'unknown') return 'missing';
  if (!row.latest || row.latest === 'unknown' || row.latest === row.current) return 'current';
  if (currentMajor !== null && latestMajor !== null && latestMajor > currentMajor) {
    const block = knownMajorBlocks[row.name];
    return block && block.major === latestMajor ? 'major-blocked' : 'major-available';
  }
  return row.wanted && row.wanted !== row.current ? 'range-update' : 'latest-update';
}

function severityAtOrAbove(severity, threshold) {
  if (threshold === 'none') return false;
  return severityOrder.indexOf(severity) >= severityOrder.indexOf(threshold);
}

export function summarizeAudit(audit, threshold = 'high') {
  const parsedThreshold = parseSeverity(threshold);
  const counts = audit?.metadata?.vulnerabilities ?? {};
  const blockingSeverities = severityOrder.filter((severity) => severityAtOrAbove(severity, parsedThreshold));
  const blockingCount = blockingSeverities.reduce((total, severity) => total + Number(counts[severity] ?? 0), 0);
  const advisories = Object.entries(audit?.vulnerabilities ?? {})
    .filter(([, advisory]) => severityAtOrAbove(advisory?.severity, parsedThreshold))
    .map(([name, advisory]) => ({
      name,
      severity: advisory.severity,
      via: Array.isArray(advisory.via) ? advisory.via.map((item) => (typeof item === 'string' ? item : item?.title)).filter(Boolean) : [],
      fixAvailable: Boolean(advisory.fixAvailable),
    }))
    .sort((a, b) => severityOrder.indexOf(b.severity) - severityOrder.indexOf(a.severity) || a.name.localeCompare(b.name));

  return {
    threshold: parsedThreshold,
    counts: Object.fromEntries(severityOrder.map((severity) => [severity, Number(counts[severity] ?? 0)])),
    total: Number(counts.total ?? 0),
    blockingCount,
    advisories,
    ok: blockingCount === 0,
  };
}

export function buildDependencyReport({ manifest, lock, outdated, audit, threshold = 'high' }) {
  const tracked = collectTrackedPackages(manifest, lock);
  const packages = tracked.map((pkg) => {
    const stale = normalizeOutdatedEntry(outdated?.[pkg.name], pkg);
    const row = {
      ...pkg,
      current: stale?.current ?? pkg.current ?? 'unknown',
      wanted: stale?.wanted ?? pkg.current ?? 'unknown',
      latest: stale?.latest ?? pkg.current ?? 'unknown',
    };
    row.status = classifyPackage(row);
    const block = knownMajorBlocks[row.name];
    const latestMajor = majorOf(row.latest);
    row.blocked = row.status === 'major-blocked' && block?.major === latestMajor ? block : null;
    return row;
  });

  return {
    generatedAt: new Date().toISOString(),
    packageCount: packages.length,
    packages,
    security: summarizeAudit(audit, threshold),
  };
}

function pad(value, width) {
  const text = String(value ?? '');
  return text.length >= width ? text : `${text}${' '.repeat(width - text.length)}`;
}

export function formatDependencyReport(report) {
  const lines = [
    'Dependency freshness report',
    `  packages tracked: ${report.packageCount}`,
    `  audit threshold: ${report.security.threshold}`,
    `  security: ${report.security.ok ? 'PASS' : 'FAIL'} (${report.security.counts.high} high, ${report.security.counts.critical} critical)`,
    '',
    'Packages',
    `${pad('name', 28)} ${pad('type', 11)} ${pad('current', 12)} ${pad('wanted', 12)} ${pad('latest', 12)} status`,
    `${'-'.repeat(28)} ${'-'.repeat(11)} ${'-'.repeat(12)} ${'-'.repeat(12)} ${'-'.repeat(12)} ${'-'.repeat(14)}`,
  ];

  for (const row of report.packages) {
    lines.push(`${pad(row.name, 28)} ${pad(row.type, 11)} ${pad(row.current, 12)} ${pad(row.wanted, 12)} ${pad(row.latest, 12)} ${row.status}`);
  }

  const blocked = report.packages.filter((row) => row.blocked);
  if (blocked.length > 0) {
    lines.push('', 'Known blocked majors');
    for (const row of blocked) {
      lines.push(`  - ${row.name} ${row.current} -> ${row.latest}: ${row.blocked.reason}`);
    }
  }

  if (report.security.advisories.length > 0) {
    lines.push('', 'Blocking security advisories');
    for (const advisory of report.security.advisories) {
      const via = advisory.via.length ? ` (${advisory.via.join('; ')})` : '';
      lines.push(`  - ${advisory.name}: ${advisory.severity}${via}`);
    }
  }

  lines.push('', report.security.ok ? 'Dependency freshness report passed.' : 'Dependency freshness report failed.');
  return `${lines.join('\n')}\n`;
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function main() {
  const threshold = parseSeverity(option('--audit-level', process.env.DEPENDENCY_AUDIT_LEVEL ?? 'high'));
  const manifest = await readJson(path.join(root, 'package.json'));
  const lock = await readJson(path.join(root, 'package-lock.json'));
  const outdated = runNpmJson(['outdated', '--json', '--all'], { allowOutdatedExit: true });
  const audit = runNpmJson(['audit', '--omit=dev', `--audit-level=${threshold === 'none' ? 'critical' : threshold}`, '--json']);
  const report = buildDependencyReport({ manifest, lock, outdated, audit, threshold });

  if (hasFlag('--json')) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    process.stdout.write(formatDependencyReport(report));
  }

  if (!report.security.ok) process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
