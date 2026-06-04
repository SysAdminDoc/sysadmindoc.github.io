#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const distDir = path.join(root, 'dist');
const suppliedBase = readArg('--base');
const viewports = [
  { label: 'Desktop', width: 1365, height: 900, mobile: false },
  { label: 'Mobile', width: 390, height: 900, mobile: true },
];

function readArg(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1] || null;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fileExists(filePath) {
  try {
    const stat = await fs.stat(filePath);
    return stat.isFile();
  } catch {
    return false;
  }
}

async function findChrome() {
  const playwrightBrowsers = [];
  const playwrightRoot = process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'ms-playwright') : null;
  if (playwrightRoot) {
    try {
      const entries = await fs.readdir(playwrightRoot);
      for (const entry of entries) playwrightBrowsers.push(path.join(playwrightRoot, entry, 'chrome-win64', 'chrome.exe'));
    } catch {
      // Optional local cache; continue through regular browser paths.
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
    if (await fileExists(candidate)) return candidate;
  }
  throw new Error('Chrome or Edge was not found. Set CHROME_PATH to a Chromium-compatible browser binary.');
}

async function waitForDevToolsPort(userDataDir, chrome) {
  const portFile = path.join(userDataDir, 'DevToolsActivePort');
  const start = Date.now();
  while (Date.now() - start < 15000) {
    if (chrome.exitCode !== null) throw new Error(`Chrome exited before DevTools was ready with code ${chrome.exitCode}.`);
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
      this.socket.addEventListener('open', () => {
        clearTimeout(timer);
        resolve();
      }, { once: true });
      this.socket.addEventListener('error', (event) => {
        clearTimeout(timer);
        reject(event.error || new Error('CDP socket error.'));
      }, { once: true });
      this.socket.addEventListener('message', (event) => this.handleMessage(event.data));
      this.socket.addEventListener('close', () => {
        for (const { reject: rejectPending } of this.pending.values()) rejectPending(new Error('CDP socket closed.'));
        this.pending.clear();
      });
    });
  }

  handleMessage(data) {
    const message = JSON.parse(typeof data === 'string' ? data : data.toString());
    if (message.id) {
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(message.error.message || JSON.stringify(message.error)));
      else pending.resolve(message.result || {});
      return;
    }
    const handlers = this.handlers.get(message.method);
    if (handlers) for (const handler of handlers) handler(message.params || {});
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

  waitFor(method, predicate = () => true, timeoutMs = 45000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const handlers = this.handlers.get(method) || [];
        this.handlers.set(method, handlers.filter((handler) => handler !== wrapped));
        reject(new Error(`Timed out waiting for ${method}.`));
      }, timeoutMs);
      const wrapped = (params) => {
        if (!predicate(params)) return;
        clearTimeout(timer);
        const handlers = this.handlers.get(method) || [];
        this.handlers.set(method, handlers.filter((handler) => handler !== wrapped));
        resolve(params);
      };
      const handlers = this.handlers.get(method) || [];
      handlers.push(wrapped);
      this.handlers.set(method, handlers);
    });
  }

  close() {
    if (this.socket) this.socket.close();
  }
}

async function startStaticServer() {
  if (!existsSync(distDir)) throw new Error('forced-colors audit: dist/ not found. Run "npm run build" first.');
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url || '/', 'http://127.0.0.1');
      const pathname = decodeURIComponent(url.pathname);
      const filePath = await resolveDistPath(pathname);
      if (!filePath) {
        response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        response.end('Not found');
        return;
      }
      const body = await fs.readFile(filePath);
      response.writeHead(200, { 'Content-Type': contentType(filePath) });
      response.end(body);
    } catch (error) {
      response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end(error.message);
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  return { server, baseUrl: `http://127.0.0.1:${address.port}/` };
}

async function resolveDistPath(pathname) {
  const candidates = [];
  const clean = pathname.replace(/^\/+/, '');
  if (clean === '') candidates.push(path.join(distDir, 'index.html'));
  else {
    candidates.push(path.join(distDir, clean));
    if (!path.extname(clean)) candidates.push(path.join(distDir, clean, 'index.html'));
  }
  for (const candidate of candidates) {
    const resolved = path.resolve(candidate);
    if (!resolved.startsWith(path.resolve(distDir))) continue;
    if (await fileExists(resolved)) return resolved;
  }
  return null;
}

function contentType(filePath) {
  if (filePath.endsWith('.html')) return 'text/html; charset=utf-8';
  if (filePath.endsWith('.js')) return 'text/javascript; charset=utf-8';
  if (filePath.endsWith('.css')) return 'text/css; charset=utf-8';
  if (filePath.endsWith('.json')) return 'application/json; charset=utf-8';
  if (filePath.endsWith('.svg')) return 'image/svg+xml';
  if (filePath.endsWith('.png')) return 'image/png';
  if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) return 'image/jpeg';
  if (filePath.endsWith('.webp')) return 'image/webp';
  if (filePath.endsWith('.avif')) return 'image/avif';
  return 'application/octet-stream';
}

async function evaluate(client, expression) {
  const result = await client.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'Runtime.evaluate failed.');
  return result.result?.value;
}

async function navigate(client, url) {
  const loaded = client.waitFor('Page.loadEventFired', () => true, 45000).catch(() => null);
  const result = await client.send('Page.navigate', { url });
  if (result.errorText) throw new Error(`Navigation to ${url} failed: ${result.errorText}`);
  await loaded;
  await delay(900);
}

async function runViewport(port, baseUrl, viewport) {
  const target = await requestJson(`http://127.0.0.1:${port}/json/new?${encodeURIComponent('about:blank')}`, { method: 'PUT' });
  const client = new CdpClient(target.webSocketDebuggerUrl);
  await client.open();
  try {
    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: viewport.mobile ? 2 : 1,
      mobile: viewport.mobile,
      screenWidth: viewport.width,
      screenHeight: viewport.height,
    });
    await client.send('Emulation.setTouchEmulationEnabled', { enabled: viewport.mobile });
    await client.send('Emulation.setEmulatedMedia', {
      media: 'screen',
      features: [
        { name: 'forced-colors', value: 'active' },
        { name: 'prefers-color-scheme', value: 'dark' },
      ],
    });
    await navigate(client, new URL('/', baseUrl).toString());
    await evaluate(client, `document.querySelector('#skills')?.scrollIntoView({ block: 'center' }); true;`);
    await delay(900);
    return await evaluate(client, auditExpression);
  } finally {
    client.close();
    await fetch(`http://127.0.0.1:${port}/json/close/${target.id}`).catch(() => {});
  }
}

const auditExpression = String.raw`
(() => {
  const issues = [];
  const details = {};
  const transparent = new Set(['transparent', 'rgba(0, 0, 0, 0)', 'rgba(0,0,0,0)', 'none']);
  const isVisibleBox = (el) => {
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0.01;
  };
  const hasPaint = (el) => {
    if (!isVisibleBox(el)) return false;
    const style = getComputedStyle(el);
    const fill = (style.fill || '').toLowerCase();
    const stroke = (style.stroke || '').toLowerCase();
    const strokeWidth = Number.parseFloat(style.strokeWidth || '0');
    return (!transparent.has(fill) && !fill.startsWith('rgba(0, 0, 0, 0)')) ||
      (strokeWidth > 0 && !transparent.has(stroke) && !stroke.startsWith('rgba(0, 0, 0, 0)'));
  };
  const visibleText = (selector) => {
    const el = document.querySelector(selector);
    return Boolean(el && isVisibleBox(el) && el.textContent.trim().length > 0);
  };

  details.forcedColors = matchMedia('(forced-colors: active)').matches;
  if (!details.forcedColors) issues.push('forced-colors media emulation is inactive');

  const heatmap = document.querySelector('.heatmap-svg');
  const heatmapCells = heatmap ? Array.from(heatmap.querySelectorAll('rect')) : [];
  const heatmapPainted = heatmapCells.filter(hasPaint).length;
  details.heatmap = { cells: heatmapCells.length, painted: heatmapPainted, label: heatmap?.getAttribute('aria-label') || '' };
  if (!heatmap || !isVisibleBox(heatmap)) issues.push('heatmap svg is missing or collapsed');
  if (heatmapCells.length < 300) issues.push('heatmap has too few cells to represent the year');
  if (heatmapPainted < Math.min(300, heatmapCells.length)) issues.push('heatmap cells are not visibly painted in forced colors');
  if (!details.heatmap.label) issues.push('heatmap is missing its aria-label text equivalent');

  const donut = document.querySelector('.lang-donut svg');
  const donutSegments = donut ? Array.from(donut.querySelectorAll('circle')) : [];
  const donutPainted = donutSegments.filter(hasPaint).length;
  details.languageDonut = {
    segments: donutSegments.length,
    painted: donutPainted,
    centerVisible: visibleText('.lang-donut-center'),
    legendItems: document.querySelectorAll('.lang-legend-item').length,
  };
  if (!donut || !isVisibleBox(donut)) issues.push('language donut svg is missing or collapsed');
  if (donutSegments.length === 0 || donutPainted === 0) issues.push('language donut segments are not visibly painted in forced colors');
  if (!details.languageDonut.centerVisible) issues.push('language donut center text is missing or hidden');
  if (details.languageDonut.legendItems === 0) issues.push('language donut legend is missing');

  const rings = Array.from(document.querySelectorAll('.sk-ring'));
  const ringReports = rings.map((ring) => {
    const card = ring.closest('.skc');
    const label = card?.querySelector('.skn')?.textContent?.trim() || 'unknown';
    const painted = Array.from(ring.querySelectorAll('circle')).filter(hasPaint).length;
    const codeVisible = Boolean(ring.querySelector('.sk-ring-label') && isVisibleBox(ring.querySelector('.sk-ring-label')));
    return { label, painted, codeVisible };
  });
  details.skillRings = { count: rings.length, failing: ringReports.filter((ring) => ring.painted < 2 || !ring.codeVisible) };
  if (rings.length < 4) issues.push('skill ring set is missing expected cards');
  for (const ring of details.skillRings.failing.slice(0, 5)) {
    issues.push('skill ring ' + ring.label + ' is not visibly painted with readable label in forced colors');
  }

  return { issues, details };
})();
`;

let server;
let chrome;
let userDataDir;
let exitCode = 0;
try {
  const serverInfo = suppliedBase ? { baseUrl: suppliedBase.endsWith('/') ? suppliedBase : `${suppliedBase}/` } : await startStaticServer();
  server = serverInfo.server;
  const chromePath = await findChrome();
  userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'portfolio-forced-colors-'));
  chrome = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=0',
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--disable-default-apps',
    '--disable-background-networking',
    '--disable-sync',
    '--no-sandbox',
    'about:blank',
  ], { stdio: 'ignore' });
  const port = await waitForDevToolsPort(userDataDir, chrome);
  const results = [];
  for (const viewport of viewports) {
    const audit = await runViewport(port, serverInfo.baseUrl, viewport);
    results.push({ ...viewport, ...audit });
  }

  console.log(`Forced-colors data-viz audit (${serverInfo.baseUrl})`);
  for (const result of results) {
    const status = result.issues.length === 0 ? 'PASS' : 'FAIL';
    console.log(`  ${status} ${result.label}: heatmap ${result.details.heatmap.painted}/${result.details.heatmap.cells} cells, donut ${result.details.languageDonut.painted}/${result.details.languageDonut.segments} segments, skill rings ${result.details.skillRings.count}`);
    for (const issue of result.issues) console.log(`    - ${issue}`);
  }
  if (results.some((result) => result.issues.length > 0)) exitCode = 1;
} finally {
  if (chrome) chrome.kill();
  if (userDataDir) await fs.rm(userDataDir, { recursive: true, force: true }).catch(() => {});
  if (server) await new Promise((resolve) => server.close(resolve));
}

process.exit(exitCode);
