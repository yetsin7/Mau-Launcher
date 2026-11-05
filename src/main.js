const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const catalog = require('./catalog.json');
const API = 'https://api.github.com/repos/';
function requestJSON(url, redirects = 3) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'Mau-Launcher', Accept: 'application/vnd.github+json' }, timeout: 15000 }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirects) { res.resume(); return resolve(requestJSON(res.headers.location, redirects - 1)); }
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { body += chunk; if (body.length > 3_000_000) req.destroy(new Error('Respuesta demasiado grande')); });
      res.on('end', () => {
        if (res.statusCode !== 200) return resolve(null);
        try { resolve(JSON.parse(body)); } catch(e) { reject(e); }
      });
    });
    req.on('timeout', () => req.destroy(new Error('Tiempo de espera agotado')));
    req.on('error', reject);
  });
}
function assetFor(release) {
  const assets = release?.assets || [];
  const platform = process.platform;
  const ext = platform === 'win32' ? /\.(exe|msi)$/i : platform === 'darwin' ? /\.(dmg|pkg)$/i : /\.(AppImage|deb|rpm)$/i;
  const arch = process.arch;
  const matches = assets.filter(a => ext.test(a.name) && !/source|symbols|debug/i.test(a.name));
  return matches.find(a => arch === 'arm64' ? /arm64|aarch64|universal/i.test(a.name) : /x64|x86_64|amd64|universal/i.test(a.name)) || matches.find(a => !/arm64|aarch64|x86|x64|amd64/i.test(a.name)) || null;
}
const cache = new Map();
async function getRelease(item) {
  if (item.pending) return { status: 'pending' };
  try {
    const release = await requestJSON(API + item.repo + '/releases/latest');
    if (!release) return { status: 'no-release' };
    const asset = assetFor(release);
    return { status: asset ? 'available' : 'unsupported', version: release.tag_name, assetName: asset?.name, url: asset?.browser_download_url, published: release.published_at };
  } catch(error) { return { status: 'error', message: error.message }; }
}
function findItem(id) { return catalog.find(x => x.id === id); }
function createWindow() {
  const win = new BrowserWindow({ width: 1160, height: 790, minWidth: 850, minHeight: 600, backgroundColor: '#0b1020', title: 'Mau Launcher', webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true } });
  win.loadFile(path.join(__dirname, 'index.html'));
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
}
app.whenReady().then(() => {
  ipcMain.handle('catalog', () => catalog);
  ipcMain.handle('releases', async () => {
    const entries = await Promise.all(catalog.map(async item => [item.id, await getRelease(item)]));
    entries.forEach(([id, release]) => cache.set(id, release));
    return Object.fromEntries(entries);
  });
  ipcMain.handle('open-repo', async (_event, id) => {
    const item = findItem(id);
    if (!item || !/^yetsin7\/[a-zA-Z0-9._-]+$/.test(item.repo)) return false;
    await shell.openExternal('https://github.com/' + item.repo);
    return true;
  });
  ipcMain.handle('install', async (_event, id) => {
    const item = findItem(id);
    if (!item) return { error: 'Aplicación desconocida' };
    const release = cache.get(id) || await getRelease(item);
    if (release.status !== 'available' || !release.url || !release.url.startsWith('https://github.com/')) return { error: 'No hay instalador compatible publicado en GitHub Releases.' };
    // Open the official release asset; do not silently execute unverified downloads.
    await shell.openExternal(release.url);
    return { ok: true, message: 'Se abrió la descarga oficial. Ejecuta el instalador descargado para instalar la aplicación.' };
  });
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
