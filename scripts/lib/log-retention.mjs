// How much of a container's own log Docker keeps. The json-file driver keeps
// max-file files of max-size each, and without a max-size the log grows for as
// long as the container runs.
//
// Only the container's own LogConfig counts. Docker merges the host's defaults
// from /etc/docker/daemon.json into it once, when it creates the container,
// and every later start uses what was saved then (moby daemon/create.go and
// daemon/container/container.go). The edge was created before the host had
// defaults, so its LogConfig stayed empty and its log never rotated, while an
// earlier version of this check merged today's daemon.json and passed it
// (eleventh drain review).

// Docker reads max-size with go-units' FromHumanSize: decimal units (k is
// 1000), with an optional space before the unit and an optional i and b after
// it, so 10m, 10mb, 10 MB and 10MiB are all 10,000,000 bytes.
const BYTES_PER_UNIT = { '': 1, k: 1e3, m: 1e6, g: 1e9, t: 1e12, p: 1e15 };

/** "10m" -> 10, "512k" -> 0.512, "10000000" -> 10, "-1", "0" or junk -> null. */
export function sizeMb(value) {
  const match = String(value ?? '').trim().match(/^(\d+(?:\.\d+)?) ?([kmgtp])?i?b?$/i);
  if (!match) return null;
  const bytes = Number(match[1]) * BYTES_PER_UNIT[(match[2] ?? '').toLowerCase()];
  return bytes > 0 ? bytes / 1e6 : null;
}

// The local driver's own defaults when it has no options: 20 MiB files, five
// of them (moby daemon/logger/local).
const LOCAL_DEFAULT_MB = (20 * 1024 * 1024) / 1e6;
const LOCAL_DEFAULT_FILES = 5;

/**
 * @param {string} logConfigJson  `docker inspect <c> --format '{{json .HostConfig.LogConfig}}'`
 * @returns {number | null}  the MB Docker keeps, or null when nothing bounds the log
 */
export function keptLogMb(logConfigJson) {
  let config;
  try {
    config = JSON.parse(logConfigJson);
  } catch {
    return null;
  }
  const options = config?.Config ?? {};
  if (config?.Type === 'local') {
    const size = 'max-size' in options ? sizeMb(options['max-size']) : LOCAL_DEFAULT_MB;
    const files = Number(options['max-file'] ?? LOCAL_DEFAULT_FILES);
    return size && Number.isSafeInteger(files) && files > 0 ? size * files : null;
  }
  if (config?.Type !== 'json-file') return null;
  const size = sizeMb(options['max-size']);
  const files = Number(options['max-file'] ?? 1);
  return size && Number.isSafeInteger(files) && files > 0 ? size * files : null;
}

/** What's wrong with how much of `container`'s log Docker keeps, or null. */
export function logRetentionProblem(container, logConfigJson, expectedMb) {
  const kept = keptLogMb(logConfigJson);
  if (kept !== null && Math.abs(kept - expectedMb) < 1e-9) return null;
  const actual = kept === null ? 'no limit on' : `${Number(kept.toFixed(3))} MB of`;
  return `Docker keeps ${actual} ${container}'s own log, but /privacy/ says ${expectedMb} MB`;
}
