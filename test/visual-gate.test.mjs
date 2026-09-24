import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import {
  GATE_ROUTES,
  LOCK_MAX_AGE_MS,
  REMOVED_FILES,
  SWAPPED_FILES,
  backUpLiveData,
  claimFile,
  playwrightArgs,
  releaseLock,
  restoreKilledRun,
  restoreLiveData,
  tryLock,
  withLock,
} from '../scripts/visual-gate.mjs';

const root = process.cwd();
const quiet = () => {};

/** A data dir holding live copies of every swapped file, and a fixtures dir. */
function setup() {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'visual-gate-'));
  const dir = path.join(base, 'data');
  const fixtures = path.join(base, 'fixtures');
  const backup = path.join(base, 'backup');
  const lock = path.join(base, 'lock.json');
  fs.mkdirSync(dir);
  fs.mkdirSync(fixtures);
  for (const name of SWAPPED_FILES) {
    fs.writeFileSync(path.join(dir, name), `live ${name}\n`);
    // The catalog record and the ETags have no fixture, as in the repo.
    if (!REMOVED_FILES.includes(name)) fs.writeFileSync(path.join(fixtures, name), `fixture ${name}\n`);
  }
  return { base, dir, fixtures, backup, lock };
}

/** What the gate does between backup and restore. */
function swap({ dir, fixtures }) {
  for (const name of REMOVED_FILES) fs.rmSync(path.join(dir, name), { force: true });
  for (const name of fs.readdirSync(fixtures)) fs.copyFileSync(path.join(fixtures, name), path.join(dir, name));
}

const read = (dir, name) => (fs.existsSync(path.join(dir, name)) ? fs.readFileSync(path.join(dir, name), 'utf8') : null);

test('a gate run leaves every live data file as it found it', () => {
  const env = setup();
  backUpLiveData({ ...env, log: quiet });
  swap(env);
  assert.equal(read(env.dir, '_stars.json'), 'fixture _stars.json\n', 'the swap is in place during the run');
  assert.equal(read(env.dir, '_catalog-drift.json'), null);

  const restored = restoreLiveData({ ...env, log: quiet });
  assert.deepEqual(restored, [...SWAPPED_FILES]);
  for (const name of SWAPPED_FILES) assert.equal(read(env.dir, name), `live ${name}\n`, name);
  assert.equal(fs.existsSync(env.backup), false, 'the backup is gone once restored');
  fs.rmSync(env.base, { recursive: true, force: true });
});

test('a file that was missing before the swap is missing after it', () => {
  const env = setup();
  fs.rmSync(path.join(env.dir, '_readme-refresh.json'));
  backUpLiveData({ ...env, log: quiet });
  swap(env);
  restoreLiveData({ ...env, log: quiet });
  assert.equal(read(env.dir, '_readme-refresh.json'), null);
  assert.equal(read(env.dir, '_stars.json'), 'live _stars.json\n');
  fs.rmSync(env.base, { recursive: true, force: true });
});

test('a killed run is undone completely, even over a refresh that came between', () => {
  // A refresh on top of the fixture caches isn't live data: it keeps a fixture
  // row wherever GitHub answers 304 (tenth drain review). So the backup, at
  // worst a day old, wins over anything written after the swap.
  const env = setup();
  backUpLiveData({ ...env, log: quiet });
  swap(env);
  // Killed here: no restore. Then a refresh rewrites the stars and the catalog
  // record before the next gate runs.
  fs.writeFileSync(path.join(env.dir, '_stars.json'), 'fresher _stars.json\n');
  fs.writeFileSync(path.join(env.dir, '_catalog-drift.json'), 'fresher _catalog-drift.json\n');

  const messages = [];
  backUpLiveData({ ...env, log: (message) => messages.push(message) });
  assert.match(messages.join('\n'), /stopped before restoring/);
  for (const name of SWAPPED_FILES) assert.equal(read(env.dir, name), `live ${name}\n`, name);

  // And that new run's own cycle ends live too.
  swap(env);
  restoreLiveData({ ...env, log: quiet });
  for (const name of SWAPPED_FILES) assert.equal(read(env.dir, name), `live ${name}\n`, name);
  fs.rmSync(env.base, { recursive: true, force: true });
});

test('the review\'s token-less refresh after a kill ends with every file live', () => {
  // The tenth drain review's sequence: a kill after the swap, then a plain
  // fetch-stars without a token, which rewrites the READMEs in its own layout
  // (no longer equal to the fixture, though still fixture text) and writes no
  // ETags. Keeping what "no longer looked like the fixture" put the live ETags
  // back beside fixture bodies, and the nightly's 304s kept all 16.
  const env = setup();
  backUpLiveData({ ...env, log: quiet });
  swap(env);
  const reformatted = JSON.stringify(read(env.dir, '_readmes.json'));
  fs.writeFileSync(path.join(env.dir, '_readmes.json'), reformatted);
  assert.equal(read(env.dir, '_etags.json'), null);

  restoreLiveData({ ...env, log: quiet });
  assert.equal(read(env.dir, '_readmes.json'), 'live _readmes.json\n', 'the fixture bodies go');
  assert.equal(read(env.dir, '_etags.json'), 'live _etags.json\n', 'and the ETags come back with the bodies they describe');
  fs.rmSync(env.base, { recursive: true, force: true });
});

test('a backup without its manifest touches nothing', () => {
  const env = setup();
  // Killed while copying: the manifest is written last, and the swap only
  // starts after it.
  fs.mkdirSync(env.backup);
  fs.writeFileSync(path.join(env.backup, '_stars.json'), 'partial copy\n');
  assert.deepEqual(restoreLiveData({ ...env, log: quiet }), []);
  assert.equal(read(env.dir, '_stars.json'), 'live _stars.json\n');
  assert.equal(fs.existsSync(env.backup), false);
  fs.rmSync(env.base, { recursive: true, force: true });
});

test('the backup covers every file the swap touches, or a gate run would lose it', () => {
  // What install-generated-fixtures.mjs copies over, plus the files with no
  // fixture that the gate deletes itself. A file missing here would be
  // overwritten, or deleted, and never put back.
  const installer = fs.readFileSync(path.join(root, 'scripts', 'install-generated-fixtures.mjs'), 'utf8');
  const installed = [...(installer.match(/const requiredFiles = \[([\s\S]*?)\];/)?.[1] ?? '').matchAll(/'([^']+)'/g)].map((match) => match[1]);
  assert.ok(installed.length >= 7, 'the installer list was read');
  const gate = fs.readFileSync(path.join(root, 'scripts', 'visual-gate.mjs'), 'utf8');
  assert.match(gate, /for \(const name of REMOVED_FILES\) fs\.rmSync\(path\.join\(dataDir, name\), \{ force: true \}\);/, 'the gate deletes what it has no fixture for');
  assert.deepEqual([...REMOVED_FILES].sort(), ['_catalog-drift.json', '_etags.json']);
  for (const name of REMOVED_FILES) {
    assert.equal(fs.existsSync(path.join(root, 'src', 'data', 'fixtures', 'generated', name)), false, `${name} has no fixture`);
  }
  assert.deepEqual([...SWAPPED_FILES].sort(), [...new Set([...installed, ...REMOVED_FILES])].sort());
});

test('a killed run leaves no live ETags beside the fixture caches', () => {
  // With the live ETags still there, fetch-stars took GitHub's 304s as leave to
  // keep the fixture rows it found in the caches (eighth drain review).
  const env = setup();
  backUpLiveData({ ...env, log: quiet });
  swap(env);
  assert.equal(read(env.dir, '_etags.json'), null, 'no ETags while the fixtures are in');
  // Killed here, then ETags written by a refresh on top of the fixtures. They
  // describe fixture bodies, so the backup's pair comes back instead.
  fs.writeFileSync(path.join(env.dir, '_etags.json'), 'fresher _etags.json\n');
  restoreLiveData({ ...env, log: quiet });
  assert.equal(read(env.dir, '_etags.json'), 'live _etags.json\n');
  assert.equal(read(env.dir, '_readmes.json'), 'live _readmes.json\n');
  fs.rmSync(env.base, { recursive: true, force: true });
});

test('one gate run holds the lock at a time, and a dead or hour-old holder loses it', () => {
  const env = setup();
  const now = Date.parse('2026-09-24T03:00:00Z');
  const alive = () => true;
  const dead = () => false;
  assert.deepEqual(tryLock({ lock: env.lock, now, isAlive: alive }), { taken: true, holder: null });
  const held = tryLock({ lock: env.lock, now: now + 60_000, isAlive: alive });
  assert.equal(held.taken, false);
  assert.equal(held.holder.pid, process.pid);

  // A lock stamped a moment after this reader's clock is fresh, not stale
  // (tenth drain review: the negative age once counted as stale).
  fs.writeFileSync(env.lock, JSON.stringify({ pid: process.pid, takenAt: new Date(now + 5_000).toISOString() }));
  assert.equal(tryLock({ lock: env.lock, now, isAlive: alive }).taken, false);

  // A holder whose process is gone, or that's older than any real run, is taken over.
  assert.equal(tryLock({ lock: env.lock, now: now + 60_000, isAlive: dead }).taken, true);
  // That takeover stamped the lock at now + 60 s; an hour after that it's stale.
  assert.equal(tryLock({ lock: env.lock, now: now + 60_000 + LOCK_MAX_AGE_MS - 1, isAlive: alive }).taken, false);
  assert.equal(tryLock({ lock: env.lock, now: now + 60_000 + LOCK_MAX_AGE_MS + 1, isAlive: alive }).taken, true);
  fs.writeFileSync(env.lock, 'not json');
  assert.equal(tryLock({ lock: env.lock, now, isAlive: alive }).taken, true);

  // Only the holder releases it.
  fs.writeFileSync(env.lock, JSON.stringify({ pid: process.pid + 1, takenAt: new Date(now).toISOString() }));
  releaseLock({ lock: env.lock });
  assert.equal(fs.existsSync(env.lock), true);
  fs.writeFileSync(env.lock, JSON.stringify({ pid: process.pid, takenAt: new Date(now).toISOString() }));
  releaseLock({ lock: env.lock });
  assert.equal(fs.existsSync(env.lock), false);
  fs.rmSync(env.base, { recursive: true, force: true });
});

// The eleventh drain review got two holders out of the old stale takeover,
// which moved the lock aside and put back one that turned out fresh: 4 pairs
// in 3,529 takeovers with six workers. Now only the process that claims a
// stale instance may replace it, in one rename. These pin the claim's rules;
// the race itself ran 13,843 takeovers with no overlap (2026-09-24).
test('only the process that claims a stale lock replaces it, and a dead claimant is outlived', () => {
  const env = setup();
  const now = Date.parse('2026-09-24T03:00:00Z');
  const alive = () => true;
  const deadPid = 999_999;
  const onlyMeAlive = (pid) => pid === process.pid;
  const stale = JSON.stringify({ pid: deadPid, takenAt: new Date(now).toISOString(), nonce: 'stale-one' });

  // Someone alive is replacing this stale lock: leave it to them. (A claim
  // carries the time it was made; one without it is stale since the
  // thirteenth review, so these fixtures give theirs.)
  fs.writeFileSync(env.lock, stale);
  fs.writeFileSync(`${env.lock}.stale-one.claim`, JSON.stringify({ pid: process.pid, takenAt: new Date(now).toISOString(), nonce: 'theirs' }));
  const held = tryLock({ lock: env.lock, now, isAlive: onlyMeAlive });
  assert.equal(held.taken, false);
  assert.equal(fs.readFileSync(env.lock, 'utf8'), stale, 'the stale lock is left for the claimant');

  // The claimant died in its few milliseconds: its claim is claimed and dropped.
  fs.writeFileSync(`${env.lock}.stale-one.claim`, JSON.stringify({ pid: deadPid, nonce: 'theirs' }));
  assert.equal(tryLock({ lock: env.lock, now, isAlive: onlyMeAlive }).taken, true);
  assert.equal(JSON.parse(fs.readFileSync(env.lock, 'utf8')).pid, process.pid);
  assert.deepEqual(fs.readdirSync(path.dirname(env.lock)).filter((name) => name.includes('.claim') || name.endsWith('.new')), [], 'no claim or draft is left behind');

  const mine = JSON.parse(fs.readFileSync(env.lock, 'utf8'));

  // Judged stale, then replaced by a faster run before this one claimed it:
  // the claim is on the old instance, so the new lock stays.
  fs.writeFileSync(env.lock, JSON.stringify({ pid: deadPid, takenAt: new Date(now).toISOString(), nonce: 'stale-two' }));
  const fresh = JSON.stringify({ pid: process.pid, takenAt: new Date(now).toISOString(), nonce: 'fresh-one' });
  let replaced = false;
  const replacedWhileJudging = (pid) => {
    if (pid === deadPid && !replaced) {
      replaced = true;
      fs.writeFileSync(env.lock, fresh);
    }
    return pid === process.pid;
  };
  assert.equal(tryLock({ lock: env.lock, now, isAlive: replacedWhileJudging }).taken, false);
  assert.equal(fs.readFileSync(env.lock, 'utf8'), fresh);
  fs.writeFileSync(env.lock, JSON.stringify(mine));

  // A holder never removes a lock while someone has claimed it, and one it
  // doesn't hold is never its to remove.
  fs.writeFileSync(`${env.lock}.${mine.nonce}.claim`, JSON.stringify({ pid: process.pid, takenAt: new Date(now).toISOString(), nonce: 'taker' }));
  releaseLock({ lock: env.lock, isAlive: alive, now });
  assert.equal(fs.existsSync(env.lock), true);
  fs.rmSync(`${env.lock}.${mine.nonce}.claim`);
  releaseLock({ lock: env.lock, isAlive: alive, now });
  assert.equal(fs.existsSync(env.lock), false);
  fs.rmSync(env.base, { recursive: true, force: true });
});

// The thirteenth drain review left the lock untakeable for good two ways: a
// dead claimant's pid reused by a live process, and a dead claim with a dead
// claim on it. Claims now expire after a minute, and a claim on a claim is
// resolved the same way at every depth.
test('a claim older than a minute is stale whatever its pid, and dead claims on claims resolve', () => {
  const env = setup();
  const now = Date.parse('2026-09-24T03:00:00Z');
  const deadPid = 999_999;
  const onlyMeAlive = (pid) => pid === process.pid;
  const staleLock = (nonce) => fs.writeFileSync(env.lock, JSON.stringify({ pid: deadPid, takenAt: new Date(now).toISOString(), nonce }));
  const leftovers = () => fs.readdirSync(path.dirname(env.lock)).filter((name) => name.startsWith(`${path.basename(env.lock)}.`));

  // A live pid (reused) on a claim made just over ten minutes ago. (A minute
  // until the fourteenth drain review overtook a claimant stalled for 61 s.)
  staleLock('x1');
  fs.writeFileSync(claimFile(env.lock, 'x1'), JSON.stringify({ pid: process.pid, takenAt: new Date(now - 601_000).toISOString(), nonce: 'c1' }));
  assert.equal(tryLock({ lock: env.lock, now, isAlive: onlyMeAlive }).taken, true);
  assert.deepEqual(leftovers(), []);
  // One made 61 s ago, a live claimant stalled, still stands.
  staleLock('x2');
  fs.writeFileSync(claimFile(env.lock, 'x2'), JSON.stringify({ pid: process.pid, takenAt: new Date(now - 61_000).toISOString(), nonce: 'c2' }));
  assert.equal(tryLock({ lock: env.lock, now, isAlive: onlyMeAlive }).taken, false);
  fs.rmSync(claimFile(env.lock, 'x2'));

  // Killed three times over: a dead claim, a dead claim on it, and one on that.
  staleLock('x3');
  const first = claimFile(env.lock, 'x3');
  fs.writeFileSync(first, JSON.stringify({ pid: deadPid, takenAt: new Date(now).toISOString(), nonce: 'c3' }));
  const second = claimFile(env.lock, 'c3', first);
  fs.writeFileSync(second, JSON.stringify({ pid: deadPid, takenAt: new Date(now).toISOString(), nonce: 'c4' }));
  fs.writeFileSync(claimFile(env.lock, 'c4', second), JSON.stringify({ pid: deadPid, takenAt: new Date(now).toISOString(), nonce: 'c5' }));
  assert.equal(tryLock({ lock: env.lock, now, isAlive: onlyMeAlive }).taken, true);
  assert.deepEqual(leftovers(), [], 'every dead claim is gone');

  // A claim that can't be read, like the old empty one, is stale too.
  staleLock('x4');
  fs.writeFileSync(claimFile(env.lock, 'x4'), '');
  assert.equal(tryLock({ lock: env.lock, now, isAlive: onlyMeAlive }).taken, true);

  // Ten dead claims deep, past the depth limit: nothing is removed there
  // without a claim (the fifteenth drain review got two holders out of that),
  // so the run waits, and the sweep clears the chain once it's ten minutes old.
  staleLock('x5');
  let chainParent = null;
  let chainId = 'x5';
  const chain = [];
  for (let depth = 0; depth < 10; depth += 1) {
    const file = claimFile(env.lock, chainId, chainParent);
    const nonce = `d${depth}`;
    fs.writeFileSync(file, JSON.stringify({ pid: deadPid, takenAt: new Date(now).toISOString(), nonce }));
    chain.push(file);
    chainParent = file;
    chainId = nonce;
  }
  assert.equal(tryLock({ lock: env.lock, now, isAlive: onlyMeAlive }).taken, false, 'it waits at the depth limit');
  const elevenMinutesAgo = (Date.now() - 11 * 60_000) / 1000;
  for (const file of chain) if (fs.existsSync(file)) fs.utimesSync(file, elevenMinutesAgo, elevenMinutesAgo);
  assert.equal(tryLock({ lock: env.lock, now, isAlive: onlyMeAlive }).taken, true, 'and the sweep lets it through');

  // However deep, a claim's path stays short enough for Windows.
  let parent = claimFile(env.lock, `${process.pid}.${'f'.repeat(36)}`);
  for (let depth = 0; depth < 10; depth += 1) parent = claimFile(env.lock, 'f'.repeat(36), parent);
  assert.ok(`${parent}.${'f'.repeat(36)}.new`.length < env.lock.length + 80);
  fs.rmSync(env.base, { recursive: true, force: true });
});

// The fourteenth drain review left 274 drafts and claims behind after 300
// random kills. Each lives for milliseconds, so old ones are swept.
test('drafts and claims a killed run left are swept once they are older than any claim can be', () => {
  const env = setup();
  const dir = path.dirname(env.lock);
  const old = (Date.now() - 11 * 60_000) / 1000;
  const leftovers = [`${env.lock}.123.abc.new`, claimFile(env.lock, 'gone-instance'), `${env.lock}.0123456789abcdef0123.claim`];
  for (const file of leftovers) {
    fs.writeFileSync(file, '{}');
    fs.utimesSync(file, old, old);
  }
  const fresh = claimFile(env.lock, 'someone-now');
  fs.writeFileSync(fresh, JSON.stringify({ pid: process.pid, takenAt: new Date().toISOString(), nonce: 'n' }));
  const unrelated = path.join(dir, 'other.claim');
  fs.writeFileSync(unrelated, 'x');
  fs.utimesSync(unrelated, old, old);

  assert.equal(tryLock({ lock: env.lock }).taken, true);
  for (const file of leftovers) assert.equal(fs.existsSync(file), false, path.basename(file));
  assert.equal(fs.existsSync(fresh), true, 'a fresh claim stays');
  assert.equal(fs.existsSync(unrelated), true, 'and so does a file that is not the lock\'s');
  fs.rmSync(env.base, { recursive: true, force: true });
});

test('processes racing for the lock never hold it at the same time', async (t) => {
  // The tenth drain review had two processes inside the old lock together 6 to
  // 15 times in 800 tries: a lock caught between its create and its write read
  // as unreadable and was deleted. Each worker here marks itself inside with an
  // exclusive create, so a second holder shows up as a collision.
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'visual-gate-race-'));
  t.after(() => fs.rmSync(base, { recursive: true, force: true }));
  const gate = pathToFileURL(path.join(root, 'scripts', 'visual-gate.mjs')).href;
  const worker = path.join(base, 'worker.mjs');
  fs.writeFileSync(
    worker,
    [
      "import fs from 'node:fs';",
      `import { tryLock, releaseLock } from ${JSON.stringify(gate)};`,
      "const [lock, inside, rounds] = [process.argv[2], process.argv[3], Number(process.argv[4])];",
      'let collisions = 0;',
      'for (let round = 0; round < rounds; round += 1) {',
      '  while (!tryLock({ lock }).taken) {}',
      "  try { fs.writeFileSync(inside, String(process.pid), { flag: 'wx' }); } catch { collisions += 1; }",
      '  for (let spin = 0; spin < 2000; spin += 1) {}',
      '  fs.rmSync(inside, { force: true });',
      '  releaseLock({ lock });',
      '}',
      'process.stdout.write(String(collisions));',
    ].join('\n'),
  );
  const lock = path.join(base, 'lock.json');
  const inside = path.join(base, 'inside');
  const workers = Array.from({ length: 4 }, () =>
    new Promise((resolve) => {
      const child = spawn(process.execPath, [worker, lock, inside, '150'], { windowsHide: true, stdio: ['ignore', 'pipe', 'inherit'] });
      let out = '';
      child.stdout.on('data', (chunk) => {
        out += chunk;
      });
      child.on('close', (code) => resolve({ code, collisions: Number(out) }));
    }),
  );
  const results = await Promise.all(workers);
  assert.deepEqual(results.map((result) => result.code), [0, 0, 0, 0], 'every worker finished');
  assert.deepEqual(results.map((result) => result.collisions), [0, 0, 0, 0], 'no two workers were inside at once');
  assert.equal(fs.existsSync(lock), false, 'and the last one let go');
});

test('a second run waits for the lock, and gives up with the holder named', async () => {
  const env = setup();
  fs.writeFileSync(env.lock, JSON.stringify({ pid: 424242, takenAt: new Date().toISOString() }));
  const messages = [];
  let ran = false;
  await assert.rejects(
    withLock(() => {
      ran = true;
    }, { lock: env.lock, waitMs: 300, pollMs: 50, isAlive: () => true, log: (message) => messages.push(message) }),
    /another visual-gate run \(pid 424242, since [^)]+\) still holds/,
  );
  assert.equal(ran, false);
  assert.equal(messages.length, 1, 'it says once that it is waiting');

  // Once the holder is gone it runs, and lets go afterwards.
  const result = await withLock(() => 'ran', { lock: env.lock, waitMs: 300, pollMs: 50, isAlive: () => false, log: quiet });
  assert.equal(result, 'ran');
  assert.equal(fs.existsSync(env.lock), false);
  fs.rmSync(env.base, { recursive: true, force: true });
});

test('the nightly restore puts back what a killed run left, and does nothing otherwise', async () => {
  const env = setup();
  assert.deepEqual(await restoreKilledRun({ ...env, log: quiet }), [], 'no backup, nothing to do');
  backUpLiveData({ ...env, log: quiet });
  swap(env);
  // Killed here.
  const restored = await restoreKilledRun({ ...env, log: quiet });
  assert.deepEqual(restored, [...SWAPPED_FILES]);
  for (const name of SWAPPED_FILES) assert.equal(read(env.dir, name), `live ${name}\n`, name);
  assert.equal(fs.existsSync(env.lock), false, 'the lock is released');
  fs.rmSync(env.base, { recursive: true, force: true });
});

// The eighth drain review: these two ran only in audit:playwright, which
// nothing runs on a schedule, so a regression they'd catch could ship.
test('the gate also runs every route gutter check and the offline palette check', () => {
  const gateArgs = playwrightArgs();
  assert.ok(gateArgs.includes('tests/playwright/sw-lifecycle.spec.mjs'));
  const gate = new RegExp(gateArgs[gateArgs.indexOf('-g') + 1]);
  const spec = fs.readFileSync(path.join(root, 'tests', 'playwright', 'portfolio-audits.spec.mjs'), 'utf8');
  // Any name the spec gives a route, not just [\w-]+ (thirteenth drain review:
  // a route named lang-c# would have dropped out of the grep and this test).
  const routes = [...spec.matchAll(/\{ name: '([^']+)', path: '[^']+', ready: '[^']+' \}/g)].map((match) => match[1]);
  assert.ok(routes.length >= 17, 'the routes were found');
  assert.equal(routes.length, spec.match(/^\s+\{ name: '[^']+', path: /gm)?.length, 'every route line was read');
  for (const route of ['lang-c#', 'lang-c++', 'lang-.net']) {
    assert.match(`chromium portfolio-audits.spec.mjs Mobile gutter audit ${route} keeps its text off the screen edge at 390px`, gate);
  }
  for (const route of routes) {
    assert.match(`chromium-light portfolio-audits.spec.mjs Mobile gutter audit ${route} keeps its text off the screen edge at 390px`, gate);
  }
  assert.match(spec, /test\.describe\('Mobile gutter audit'/);
  assert.match(spec, /test\(`\$\{route\.name\} keeps its text off the screen edge at 390px`/);
  const sw = fs.readFileSync(path.join(root, 'tests', 'playwright', 'sw-lifecycle.spec.mjs'), 'utf8');
  const palette = 'the command palette works offline for a returning visitor who never opened it';
  assert.ok(sw.includes(`test('${palette}'`), 'the title still names the test');
  assert.match(`chromium sw-lifecycle.spec.mjs ${palette}`, gate);
  assert.doesNotMatch('chromium sw-lifecycle.spec.mjs offline navigation reaches the offline fallback page', gate, 'and nothing else from that file');
});

test('the gate compares the five key routes, and the full run runs every audits spec', () => {
  const spec = fs.readFileSync(path.join(root, 'tests', 'playwright', 'portfolio-audits.spec.mjs'), 'utf8');
  const routePaths = Object.fromEntries([...spec.matchAll(/\{ name: '([\w-]+)', path: '([^']+)', ready: '[^']+' \}/g)].map((match) => [match[1], match[2]]));
  for (const name of ['colophon', 'privacy']) assert.ok(routePaths[name], `the spec renders ${name}`);
  // The routes the roadmap item named for the deploy gate.
  assert.deepEqual(GATE_ROUTES.map((name) => routePaths[name]), ['/', '/ai/', '/healthcare-it/', '/resume/', '/catalog/']);

  const gateArgs = playwrightArgs();
  assert.ok(gateArgs.includes('tests/playwright/portfolio-audits.spec.mjs'));
  const gate = new RegExp(gateArgs[gateArgs.indexOf('-g') + 1]);
  // Playwright matches the project, file, describe and test titles, space-separated.
  const title = (route, viewport) => `chromium portfolio-audits.spec.mjs Playwright visual baselines ${route} ${viewport} viewport matches baseline`;
  for (const route of GATE_ROUTES) {
    for (const viewport of ['desktop', 'mobile']) assert.match(title(route, viewport), gate);
  }
  assert.doesNotMatch(title('status', 'desktop'), gate);
  assert.doesNotMatch('chromium portfolio-audits.spec.mjs Playwright axe accessibility audit home is clean', gate);
  assert.ok(!gateArgs.some((arg) => arg.startsWith('--update-snapshots')), 'the gate never rewrites a baseline');

  assert.deepEqual(playwrightArgs({ all: true }), ['test', '--config=playwright.audits.config.mjs']);
  assert.deepEqual(playwrightArgs({ all: true, update: true }), ['test', '--config=playwright.audits.config.mjs', '--update-snapshots=all']);
});

test('deploy:preflight runs the gate on its own fixture build before the real one', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const steps = pkg.scripts['deploy:preflight'].split('&&').map((step) => step.trim());
  const gate = steps.indexOf('npm run visual:gate');
  assert.ok(gate > 0, 'the gate is a preflight step');
  assert.ok(gate < steps.indexOf('npm run build'), 'the real build comes after it, so dist/ ships live data');
  assert.equal(pkg.scripts['visual:gate'], 'node scripts/visual-gate.mjs');
  assert.equal(pkg.scripts['audit:playwright'], 'node scripts/visual-gate.mjs --all');
  assert.equal(pkg.scripts['audit:playwright:update'], 'node scripts/visual-gate.mjs --all --update');
});
