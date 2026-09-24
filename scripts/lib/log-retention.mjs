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

// Docker reads max-size with go-units' FromHumanSize (size.go parseSize):
// decimal units (k is 1000), the number read by Go's ParseFloat (so 1e7, +10,
// .5 and 10. all count), an optional space before the unit and an optional b
// or ib after it, and the result cut to whole bytes. So 10m, 10mb, 10 MB,
// 10MiB and 10000000 are all 10,000,000 bytes, and so is 10.0000001m
// (thirteenth drain review).
const BYTES_PER_UNIT = { k: 1e3, m: 1e6, g: 1e9, t: 1e12, p: 1e15 };

/** The bytes go-units reads from a size, or null where it returns an error. */
export function sizeBytes(value) {
  const text = String(value ?? '');
  let separator = -1;
  for (let index = text.length - 1; index >= 0; index -= 1) {
    if ('0123456789. '.includes(text[index])) {
      separator = index;
      break;
    }
  }
  if (separator === -1) return null;
  const number = text[separator] === ' ' ? text.slice(0, separator) : text.slice(0, separator + 1);
  const suffix = text.slice(separator + 1).toLowerCase();
  if (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(number)) return null;
  let size = Number(number);
  if (!Number.isFinite(size) || size < 0) return null;
  if (suffix.length > 3) return null;
  if (suffix.length > 0 && suffix[0] === 'b') {
    if (suffix.length > 1) return null;
  } else if (suffix.length > 0) {
    const multiplier = BYTES_PER_UNIT[suffix[0]];
    if (!multiplier) return null;
    if ((suffix.length === 2 && suffix[1] !== 'b') || (suffix.length === 3 && suffix.slice(1) !== 'ib')) return null;
    size *= multiplier;
  }
  return Math.trunc(size);
}

/** "10m" -> 10, "512k" -> 0.512, "1e7" -> 10; "-1", "0" or junk -> null. */
export function sizeMb(value) {
  const bytes = sizeBytes(value);
  return bytes !== null && bytes > 0 ? bytes / 1e6 : null;
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
  // The none driver keeps nothing at all.
  if (config?.Type === 'none') return 0;
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
  const actual = kept === null ? 'no limit on' : kept === 0 ? 'nothing of' : `${Number(kept.toFixed(3))} MB of`;
  return `Docker keeps ${actual} ${container}'s own log, but /privacy/ says ${expectedMb} MB`;
}
