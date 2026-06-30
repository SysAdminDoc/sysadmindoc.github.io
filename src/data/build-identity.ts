import { execFileSync } from 'node:child_process';
import process from 'node:process';

export const UNKNOWN_BUILD_COMMIT = 'unknown';

const buildCommitEnvKeys = [
  'SYSADMINDOC_BUILD_COMMIT',
  'BUILD_COMMIT',
  'SOURCE_COMMIT',
  'COMMIT_SHA',
  'GITHUB_SHA',
  'CF_PAGES_COMMIT_SHA',
  'VERCEL_GIT_COMMIT_SHA',
] as const;

export type BuildIdentity = {
  commit: string;
  commitShort: string;
  source: string;
};

export function normalizeBuildCommit(value: string | null | undefined): string {
  const commit = String(value ?? '').trim();
  if (!commit || commit.toLowerCase() === UNKNOWN_BUILD_COMMIT) return UNKNOWN_BUILD_COMMIT;
  return /^[0-9a-f]{7,40}$/i.test(commit) ? commit.toLowerCase() : UNKNOWN_BUILD_COMMIT;
}

function identityFromCommit(commit: string, source: string): BuildIdentity {
  return {
    commit,
    commitShort: commit === UNKNOWN_BUILD_COMMIT ? UNKNOWN_BUILD_COMMIT : commit.slice(0, 12),
    source,
  };
}

function resolveEnvCommit(env: NodeJS.ProcessEnv): BuildIdentity | null {
  for (const key of buildCommitEnvKeys) {
    const commit = normalizeBuildCommit(env[key]);
    if (commit !== UNKNOWN_BUILD_COMMIT) return identityFromCommit(commit, key);
  }
  return null;
}

function resolveGitCommit(): BuildIdentity | null {
  try {
    const commit = normalizeBuildCommit(
      execFileSync('git', ['rev-parse', 'HEAD'], {
        cwd: process.cwd(),
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
        timeout: 2000,
      }),
    );
    return commit === UNKNOWN_BUILD_COMMIT ? null : identityFromCommit(commit, 'git');
  } catch {
    return null;
  }
}

export function resolveBuildIdentity(env: NodeJS.ProcessEnv = process.env): BuildIdentity {
  return resolveEnvCommit(env) ?? resolveGitCommit() ?? identityFromCommit(UNKNOWN_BUILD_COMMIT, 'unknown');
}

export const buildIdentity = resolveBuildIdentity();
