// How much of a container's own log Docker keeps. The json-file driver keeps
// max-file files of max-size each, and without a max-size the log grows for as
// long as the container runs. A container's own options sit on top of the
// host's defaults in /etc/docker/daemon.json, which is all the edge Caddy has.

const MB_PER_UNIT = { b: 1 / (1024 * 1024), k: 1 / 1024, m: 1, g: 1024 };

/** "10m" -> 10, "512k" -> 0.5, "-1" or junk -> null. */
export function sizeMb(value) {
  const match = String(value ?? '').trim().toLowerCase().match(/^(\d+(?:\.\d+)?)([bkmg])?$/);
  return match ? Number(match[1]) * MB_PER_UNIT[match[2] ?? 'b'] : null;
}

/**
 * @param {string} logConfigJson  `docker inspect <c> --format '{{json .HostConfig.LogConfig}}'`
 * @param {string} daemonJson  the text of /etc/docker/daemon.json, or '' if it has none
 * @returns {number | null}  the MB Docker keeps, or null when nothing bounds the log
 */
export function keptLogMb(logConfigJson, daemonJson) {
  let config;
  try {
    config = JSON.parse(logConfigJson);
  } catch {
    return null;
  }
  let daemon = {};
  try {
    daemon = daemonJson.trim() ? JSON.parse(daemonJson) : {};
  } catch {
    daemon = {};
  }
  const defaultDriver = daemon['log-driver'] || 'json-file';
  const driver = config?.Type || defaultDriver;
  const options = { ...(driver === defaultDriver ? (daemon['log-opts'] ?? {}) : {}), ...(config?.Config ?? {}) };
  if (driver === 'local') {
    const size = sizeMb(options['max-size'] ?? '20m');
    const files = Number(options['max-file'] ?? 5);
    return size && Number.isSafeInteger(files) && files > 0 ? size * files : null;
  }
  if (driver !== 'json-file') return null;
  const size = sizeMb(options['max-size']);
  const files = Number(options['max-file'] ?? 1);
  return size && Number.isSafeInteger(files) && files > 0 ? size * files : null;
}

/** What's wrong with how much of `container`'s log Docker keeps, or null. */
export function logRetentionProblem(container, logConfigJson, daemonJson, expectedMb) {
  const kept = keptLogMb(logConfigJson, daemonJson);
  if (kept === expectedMb) return null;
  const actual = kept === null ? 'no limit on' : `${kept} MB of`;
  return `Docker keeps ${actual} ${container}'s own log, but /privacy/ says ${expectedMb} MB`;
}
