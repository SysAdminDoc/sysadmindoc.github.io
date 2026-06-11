import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const explicitBaseUrl = readArg('--base') || process.env.PORTFOLIO_AUDIT_BASE || '';
const baseUrl = explicitBaseUrl || 'http://127.0.0.1:4321';
const outputPath = path.resolve(root, readArg('--out') || path.join('.tmp', 'performance-audit.json'));
const strict = process.argv.includes('--strict');
const warmupEnabled = !process.argv.includes('--no-warmup');
const thresholds = {
  lcpMs: Number(readArg('--lcp') || 2500),
  cls: Number(readArg('--cls') || 0.1),
  eventMs: Number(readArg('--event') || 200),
};

const tests = [
  { label: 'Home mobile', path: '/', width: 390, height: 900, mobile: true, waitMs: 3200, awayPath: '/archive/' },
  { label: 'Search mobile', path: '/search/?q=NukeMap', width: 390, height: 900, mobile: true, waitMs: 4800, awayPath: '/archive/' },
  { label: 'Archive mobile', path: '/archive/', width: 390, height: 900, mobile: true, waitMs: 3000, awayPath: '/timeline/' },
  { label: 'Project mobile', path: '/projects/project-nomad-desktop/', width: 390, height: 900, mobile: true, waitMs: 3000, awayPath: '/archive/' },
  { label: 'Home desktop', path: '/', width: 1365, height: 900, mobile: false, waitMs: 3200, awayPath: '/archive/' },
];

function readArg(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  return process.argv[index + 1] || null;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function exists(filePath) {
  try {
    const stat = await fs.stat(filePath);
    return stat.isFile();
  } catch {
    return false;
  }
}

async function baseResponds(url) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1500);
    const response = await fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timer));
    return response.ok;
  } catch {
    return false;
  }
}

function canStartLocalPreview(url) {
  if (explicitBaseUrl) return false;
  try {
    const parsed = new URL(url);
    return ['127.0.0.1', 'localhost', '[::1]'].includes(parsed.hostname);
  } catch {
    return false;
  }
}

async function waitForPreview(url, preview) {
  const start = Date.now();
  while (Date.now() - start < 30000) {
    if (preview.exitCode !== null) {
      throw new Error(`Preview server exited before ${url} was reachable with code ${preview.exitCode}.`);
    }
    if (await baseResponds(url)) return;
    await delay(300);
  }
  throw new Error(`Timed out waiting for preview server at ${url}.`);
}

function stopPreview(preview) {
  if (!preview || preview.exitCode !== null) return;
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(preview.pid), '/t', '/f'], { stdio: 'ignore' });
    return;
  }
  preview.kill('SIGTERM');
}

async function startPreviewIfNeeded() {
  if (await baseResponds(baseUrl)) return null;
  if (!canStartLocalPreview(baseUrl)) return null;

  const distIndex = path.join(root, 'dist', 'index.html');
  if (!(await exists(distIndex))) {
    throw new Error('dist/index.html was not found. Run npm run build:ci before npm run audit:perf.');
  }

  const parsed = new URL(baseUrl);
  const host = parsed.hostname === '[::1]' ? '::1' : parsed.hostname;
  const port = parsed.port || (parsed.protocol === 'https:' ? '443' : '80');
  const command = process.platform === 'win32' ? process.env.ComSpec || 'cmd.exe' : 'npm';
  const args = process.platform === 'win32'
    ? ['/d', '/s', '/c', `npm run preview -- --host ${host} --port ${port}`]
    : ['run', 'preview', '--', '--host', host, '--port', port];
  const preview = spawn(command, args, {
    cwd: root,
    stdio: 'ignore',
  });
  await waitForPreview(baseUrl, preview);
  return preview;
}

async function findChrome() {
  const playwrightBrowsers = [];
  const playwrightRoot = process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'ms-playwright') : null;
  if (playwrightRoot) {
    try {
      const entries = await fs.readdir(playwrightRoot);
      for (const entry of entries) {
        playwrightBrowsers.push(path.join(playwrightRoot, entry, 'chrome-win64', 'chrome.exe'));
      }
    } catch {
      // Playwright browsers are optional; keep checking regular Chrome/Edge paths.
    }
  }

  const candidates = [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/microsoft-edge',
    ...playwrightBrowsers,
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (await exists(candidate)) return candidate;
  }

  throw new Error('Chrome or Edge was not found. Set CHROME_PATH to a Chromium-compatible browser binary.');
}

async function waitForDevToolsPort(userDataDir, chrome) {
  const portFile = path.join(userDataDir, 'DevToolsActivePort');
  const start = Date.now();

  while (Date.now() - start < 15000) {
    if (chrome.exitCode !== null) {
      throw new Error(`Chrome exited before DevTools was ready with code ${chrome.exitCode}.`);
    }
    try {
      const text = await fs.readFile(portFile, 'utf8');
      const [port] = text.trim().split(/\r?\n/);
      if (port) return Number(port);
    } catch {
      // Keep polling until Chrome writes DevToolsActivePort.
    }
    await delay(150);
  }

  throw new Error('Timed out waiting for Chrome DevToolsActivePort.');
}

async function requestJson(url, init) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  const response = await fetch(url, { ...(init || {}), signal: controller.signal }).finally(() => clearTimeout(timer));
  if (!response.ok) throw new Error(`${init?.method || 'GET'} ${url} failed with ${response.status}`);
  return response.json();
}

class CdpClient {
  constructor(webSocketUrl) {
    this.webSocketUrl = webSocketUrl;
    this.nextId = 1;
    this.pending = new Map();
    this.handlers = new Map();
  }

  open() {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timed out opening CDP socket.')), 15000);
      this.socket = new WebSocket(this.webSocketUrl);
      this.socket.addEventListener(
        'open',
        () => {
          clearTimeout(timer);
          resolve();
        },
        { once: true },
      );
      this.socket.addEventListener(
        'error',
        (event) => {
          clearTimeout(timer);
          reject(event.error || new Error('CDP socket error.'));
        },
        { once: true },
      );
      this.socket.addEventListener('message', (event) => this.handleMessage(event.data));
      this.socket.addEventListener('close', () => {
        for (const { reject: rejectPending } of this.pending.values()) {
          rejectPending(new Error('CDP socket closed.'));
        }
        this.pending.clear();
      });
    });
  }

  handleMessage(data) {
    const raw = typeof data === 'string' ? data : data.toString();
    const message = JSON.parse(raw);
    if (message.id) {
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(message.error.message || JSON.stringify(message.error)));
      else pending.resolve(message.result || {});
      return;
    }

    const handlers = this.handlers.get(message.method);
    if (!handlers) return;
    for (const handler of handlers) handler(message.params || {});
  }

  send(method, params = {}) {
    const id = this.nextId++;
    this.socket.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Timed out running ${method}.`));
      }, 45000);
      this.pending.set(id, {
        resolve: (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
      });
    });
  }

  on(method, handler) {
    const handlers = this.handlers.get(method) || [];
    handlers.push(handler);
    this.handlers.set(method, handlers);
  }

  waitFor(method, predicate = () => true, timeoutMs = 45000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const handlers = this.handlers.get(method) || [];
        this.handlers.set(
          method,
          handlers.filter((handler) => handler !== wrapped),
        );
        reject(new Error(`Timed out waiting for ${method}.`));
      }, timeoutMs);

      const wrapped = (params) => {
        if (!predicate(params)) return;
        clearTimeout(timer);
        const handlers = this.handlers.get(method) || [];
        this.handlers.set(
          method,
          handlers.filter((handler) => handler !== wrapped),
        );
        resolve(params);
      };

      this.on(method, wrapped);
    });
  }

  close() {
    if (this.socket) this.socket.close();
  }
}

const metricsBootstrap = String.raw`
(() => {
  window.__portfolioAudit = { lcp: 0, cls: 0, events: [], longTasks: [], pageShows: [] };
  window.addEventListener('pageshow', (event) => {
    const nav = performance.getEntriesByType('navigation')[0];
    window.__portfolioAudit.pageShows.push({
      persisted: event.persisted,
      time: Math.round(performance.now()),
      type: nav && nav.type ? nav.type : '',
    });
  });
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        window.__portfolioAudit.lcp = entry.renderTime || entry.loadTime || entry.startTime || 0;
      }
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  } catch {}
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) window.__portfolioAudit.cls += entry.value || 0;
      }
    }).observe({ type: 'layout-shift', buffered: true });
  } catch {}
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        window.__portfolioAudit.events.push({ name: entry.name, duration: entry.duration || 0, start: entry.startTime || 0 });
      }
    }).observe({ type: 'event', buffered: true, durationThreshold: 16 });
  } catch {}
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        window.__portfolioAudit.longTasks.push({ duration: entry.duration || 0, start: entry.startTime || 0 });
      }
    }).observe({ type: 'longtask', buffered: true });
  } catch {}
})();
`;

async function evaluate(client, expression) {
  const result = await client.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || 'Runtime.evaluate failed.');
  }
  return result.result?.value;
}

async function navigate(client, url, waitMs) {
  const loaded = client.waitFor('Page.loadEventFired', () => true, 45000).catch(() => null);
  const result = await client.send('Page.navigate', { url });
  if (result.errorText) throw new Error(`Navigation to ${url} failed: ${result.errorText}`);
  await loaded;
  await delay(waitMs);
}

async function snapshot(client) {
  return evaluate(
    client,
    `(() => {
      const metrics = window.__portfolioAudit || {};
      const events = metrics.events || [];
      const longTasks = metrics.longTasks || [];
      const doc = document.documentElement;
      const body = document.body;
      const scrollWidth = Math.max(doc ? doc.scrollWidth : 0, body ? body.scrollWidth : 0);
      const clientWidth = doc ? doc.clientWidth : window.innerWidth;
      return {
        title: document.title,
        href: location.href,
        lcpMs: Math.round(metrics.lcp || 0),
        cls: Number((metrics.cls || 0).toFixed(4)),
        maxEventMs: Math.round(Math.max(0, ...events.map((entry) => entry.duration || 0))),
        eventCount: events.length,
        maxLongTaskMs: Math.round(Math.max(0, ...longTasks.map((entry) => entry.duration || 0))),
        longTaskCount: longTasks.length,
        overflow: scrollWidth > clientWidth + 1,
        scrollWidth,
        clientWidth,
        bfcacheRestored: (metrics.pageShows || []).some((entry) => entry.persisted),
        pageShows: metrics.pageShows || [],
      };
    })()`,
  );
}

async function sendInteraction(client, test) {
  await evaluate(client, 'window.scrollTo({ top: Math.min(document.body.scrollHeight, window.innerHeight * 1.2), behavior: "instant" }); true;');
  await delay(200);
  const x = Math.round(test.width / 2);
  const y = Math.round(Math.min(test.height - 40, test.height / 2));
  await client.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
  await client.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
  await client.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
  await delay(300);
}

async function createTarget(port) {
  const target = await requestJson(`http://127.0.0.1:${port}/json/new?${encodeURIComponent('about:blank')}`, { method: 'PUT' });
  const client = new CdpClient(target.webSocketDebuggerUrl);
  await client.open();
  return { client, target };
}

async function closeTarget(port, client, target) {
  client.close();
  await fetch(`http://127.0.0.1:${port}/json/close/${target.id}`).catch(() => {});
}

async function applyViewport(client, test) {
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: test.width,
    height: test.height,
    deviceScaleFactor: test.mobile ? 2 : 1,
    mobile: test.mobile,
    screenWidth: test.width,
    screenHeight: test.height,
  });
  await client.send('Emulation.setTouchEmulationEnabled', { enabled: test.mobile });
}

async function warmRoute(port, test) {
  const { client, target } = await createTarget(port);
  try {
    await client.send('Page.enable');
    await applyViewport(client, test);
    await navigate(client, new URL(test.path, baseUrl).toString(), test.waitMs);
  } finally {
    await closeTarget(port, client, target);
  }
}

async function warmAuditRoutes(port) {
  if (!warmupEnabled) return;
  for (const test of tests) {
    await warmRoute(port, test);
  }
}

async function runTest(port, test) {
  const { client, target } = await createTarget(port);
  const issues = [];

  try {
    client.on('Runtime.consoleAPICalled', (params) => {
      if (params.type !== 'error' && params.type !== 'warning') return;
      issues.push({ type: `console:${params.type}`, text: (params.args || []).map((arg) => arg.value || arg.description || '').join(' ') });
    });
    client.on('Log.entryAdded', (params) => {
      const entry = params.entry || {};
      if (entry.level !== 'error' && entry.level !== 'warning') return;
      issues.push({ type: `log:${entry.level}`, text: entry.text || '', url: entry.url || '' });
    });
    client.on('Network.responseReceived', (params) => {
      const response = params.response || {};
      if ((response.status || 0) >= 400) {
        issues.push({ type: 'response', status: response.status, url: response.url });
      }
    });
    client.on('Network.loadingFailed', (params) => {
      if (params.canceled) return;
      issues.push({ type: 'failed', url: params.url || params.requestId, errorText: params.errorText || '' });
    });

    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('Log.enable');
    await client.send('Network.enable');
    await client.send('Page.addScriptToEvaluateOnNewDocument', { source: metricsBootstrap });
    await applyViewport(client, test);

    await navigate(client, new URL(test.path, baseUrl).toString(), test.waitMs);
    await sendInteraction(client, test);
    const beforeBack = await snapshot(client);

    await navigate(client, new URL(test.awayPath, baseUrl).toString(), 900);
    await evaluate(client, 'history.back(); true;');
    await delay(1700);
    const afterBack = await snapshot(client);

    const result = {
      label: test.label,
      path: test.path,
      viewport: `${test.width}x${test.height}${test.mobile ? ' mobile' : ' desktop'}`,
      ...beforeBack,
      bfcacheRestored: afterBack.bfcacheRestored,
      pageShows: afterBack.pageShows,
      overflow: beforeBack.overflow || afterBack.overflow,
      issues,
    };

    return result;
  } finally {
    await closeTarget(port, client, target);
  }
}

function resultFailures(result) {
  const failures = [];
  if (result.overflow) failures.push('horizontal overflow');
  if (!result.bfcacheRestored) failures.push('bfcache was not restored');
  if (result.lcpMs > thresholds.lcpMs) failures.push(`LCP ${result.lcpMs}ms > ${thresholds.lcpMs}ms`);
  if (result.cls > thresholds.cls) failures.push(`CLS ${result.cls} > ${thresholds.cls}`);
  if (result.maxEventMs > thresholds.eventMs) failures.push(`event timing ${result.maxEventMs}ms > ${thresholds.eventMs}ms`);
  for (const issue of result.issues) failures.push(`${issue.type}${issue.status ? ` ${issue.status}` : ''}: ${issue.url || issue.text || issue.errorText || 'unknown issue'}`);
  return failures;
}

let exitCode = 0;
let preview = null;
let chrome = null;
let userDataDir = null;

try {
  preview = await startPreviewIfNeeded();
  const chromePath = await findChrome();
  userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'portfolio-perf-'));
  chrome = spawn(
    chromePath,
    [
      '--headless=new',
      '--remote-debugging-port=0',
      `--user-data-dir=${userDataDir}`,
      '--no-first-run',
      '--disable-default-apps',
      '--disable-background-networking',
      '--disable-sync',
      '--metrics-recording-only',
      '--mute-audio',
      'about:blank',
    ],
    { stdio: 'ignore' },
  );

  const port = await waitForDevToolsPort(userDataDir, chrome);
  await warmAuditRoutes(port);
  const results = [];
  for (const test of tests) {
    results.push(await runTest(port, test));
  }
  const resultsWithFailures = results.map((result) => ({
    ...result,
    failures: resultFailures(result),
  }));

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(
    outputPath,
    `${JSON.stringify({ generatedAt: new Date().toISOString(), baseUrl, warmup: warmupEnabled, thresholds, results: resultsWithFailures }, null, 2)}\n`,
  );

  console.log(`Portfolio performance audit (${baseUrl})`);
  console.log(`  Warmup: ${warmupEnabled ? 'enabled' : 'disabled'}`);
  for (const result of resultsWithFailures) {
    const failures = result.failures || [];
    const status = failures.length ? 'WARN' : 'PASS';
    console.log(
      `  ${status} ${result.label}: LCP ${result.lcpMs}ms, CLS ${result.cls}, max event ${result.maxEventMs}ms, max long task ${result.maxLongTaskMs}ms, bfcache ${result.bfcacheRestored ? 'yes' : 'no'}`,
    );
    for (const failure of failures) console.log(`    - ${failure}`);
  }
  console.log(`  JSON: ${path.relative(root, outputPath)}`);

  if (strict && resultsWithFailures.some((result) => result.failures.length > 0)) exitCode = 1;
} finally {
  chrome?.kill();
  stopPreview(preview);
  if (userDataDir) await fs.rm(userDataDir, { recursive: true, force: true }).catch(() => {});
}

process.exit(exitCode);
