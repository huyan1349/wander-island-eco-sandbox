import { spawn } from 'node:child_process';
import { request } from 'node:http';
import { createServer } from 'node:net';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pageErrors = [];
const serverLogs = [];
let serverProcess;

const url = process.env.SMOKE_URL || await startVite();

const browser = await puppeteer.launch({
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--proxy-server=direct://',
    '--proxy-bypass-list=*',
  ],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
  page.on('pageerror', error => pageErrors.push(error.message));

  const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
  if (!response || !response.ok()) {
    throw new Error(`Smoke target returned ${response?.status() ?? 'no response'} for ${url}`);
  }

  await page.waitForSelector('#root', { timeout: 20_000 });
  await page.waitForFunction(() => {
    const root = document.querySelector('#root');
    if (!root || root.childElementCount === 0) return false;
    const rect = root.getBoundingClientRect();
    return rect.width > 100 && rect.height > 100;
  }, { timeout: 20_000 });
  await page.waitForFunction(() => document.querySelectorAll('canvas').length > 0, { timeout: 30_000 });

  await page.waitForFunction(() => {
    const text = document.body.innerText || '';
    return !/application error|something went wrong/i.test(text);
  }, { timeout: 5_000 }).catch(() => {});

  if (pageErrors.length > 0) {
    throw new Error(`Page error during smoke:\n${pageErrors.join('\n')}`);
  }

  const summary = await page.evaluate(() => ({
    title: document.title,
    rootChildren: document.querySelector('#root')?.childElementCount ?? 0,
    canvasCount: document.querySelectorAll('canvas').length,
  }));

  console.log(`Smoke passed: ${url}`);
  console.log(JSON.stringify(summary));
} finally {
  await browser.close();
  await stopVite();
}

async function startVite() {
  const port = await getFreePort();
  const binName = process.platform === 'win32' ? 'vite.cmd' : 'vite';
  const viteBin = resolve(repoRoot, 'node_modules', '.bin', binName);

  serverProcess = spawn(viteBin, ['--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
    cwd: repoRoot,
    env: {
      ...process.env,
      ALL_PROXY: '',
      HTTP_PROXY: '',
      HTTPS_PROXY: '',
      NO_PROXY: '127.0.0.1,localhost',
      all_proxy: '',
      http_proxy: '',
      https_proxy: '',
      no_proxy: '127.0.0.1,localhost',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let exitCode = null;
  serverProcess.stdout.on('data', chunk => captureServerLog(chunk));
  serverProcess.stderr.on('data', chunk => captureServerLog(chunk));
  serverProcess.on('exit', code => {
    exitCode = code;
  });

  const localUrl = `http://127.0.0.1:${port}/`;
  await waitForHttp(localUrl, () => exitCode);
  return localUrl;
}

function captureServerLog(chunk) {
  serverLogs.push(String(chunk).trim());
  if (serverLogs.length > 40) serverLogs.shift();
}

function getFreePort() {
  return new Promise((resolvePort, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        reject(new Error('Unable to reserve a local smoke-test port'));
        return;
      }
      const { port } = address;
      server.close(() => resolvePort(port));
    });
  });
}

async function waitForHttp(targetUrl, getExitCode, timeoutMs = 45_000) {
  const startedAt = Date.now();
  let lastError;

  while (Date.now() - startedAt < timeoutMs) {
    const exitCode = getExitCode();
    if (exitCode !== null) {
      throw new Error(`Vite smoke server exited early with code ${exitCode}.\n${serverLogs.join('\n')}`);
    }

    try {
      const statusCode = await getStatus(targetUrl);
      if (statusCode >= 200 && statusCode < 500) return;
    } catch (error) {
      lastError = error;
    }

    await delay(250);
  }

  const detail = lastError instanceof Error ? lastError.message : String(lastError ?? 'unknown error');
  throw new Error(`Timed out waiting for ${targetUrl}: ${detail}\n${serverLogs.join('\n')}`);
}

function getStatus(targetUrl) {
  return new Promise((resolveStatus, reject) => {
    const req = request(targetUrl, { timeout: 3_000 }, res => {
      res.resume();
      resolveStatus(res.statusCode ?? 0);
    });
    req.on('timeout', () => req.destroy(new Error(`Request timed out for ${targetUrl}`)));
    req.on('error', reject);
    req.end();
  });
}

async function stopVite() {
  if (!serverProcess || serverProcess.exitCode !== null) return;
  serverProcess.kill('SIGTERM');
  await delay(500);
  if (serverProcess.exitCode === null) serverProcess.kill('SIGKILL');
}

function delay(ms) {
  return new Promise(resolveDelay => setTimeout(resolveDelay, ms));
}
