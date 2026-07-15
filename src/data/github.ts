export const GITHUB_OWNER = 'SysAdminDoc';

export function githubRepoUrl(repo: string): string {
  return `https://github.com/${GITHUB_OWNER}/${repo}`;
}
