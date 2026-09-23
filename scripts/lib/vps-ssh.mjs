// SSH options for every script that talks to the VPS. Unattended runs need an
// explicit identity and a pinned host key; an interactive session can rely on
// the agent and the user's known_hosts.
//
//   PORTFOLIO_VPS_SSH_KEY      optional, identity file for non-interactive runs
//   PORTFOLIO_VPS_KNOWN_HOSTS  optional, pinned known_hosts for the same
import process from 'node:process';

export function vpsSshOptions(env = process.env) {
  const options = ['-o', 'BatchMode=yes', '-o', 'ConnectTimeout=15', '-o', 'ServerAliveInterval=15'];
  if (env.PORTFOLIO_VPS_SSH_KEY) {
    options.push('-i', env.PORTFOLIO_VPS_SSH_KEY, '-o', 'IdentitiesOnly=yes');
  }
  if (env.PORTFOLIO_VPS_KNOWN_HOSTS) {
    options.push('-o', `UserKnownHostsFile=${env.PORTFOLIO_VPS_KNOWN_HOSTS}`);
  }
  return options;
}
