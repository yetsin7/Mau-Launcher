'use strict';
const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const https = require('node:https');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const catalog = require('./catalog.json');
const { isSafeRepo, selectAsset, trustedAssetURL } = require('./release');
const USER_AGENT = 'Mau-Launcher/0.2';
const cache = new Map();
const activeDownloads = new Set();

function requestJSON(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/vnd.github+json' }, timeout: 15000 }, res => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', chunk => {
        data += chunk;
        if (data.length > 3_000_000) req.destroy(new Error('Respuesta demasiado grande'));
      });
      res.on('end', () => {
        if (res.statusCode === 404) return resolve(null);
        if (res.statusCode !== 200) return reject(new Error('GitHub HTTP ' + res.statusCode));
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    });
    req.on('timeout', () => req.destroy(new Error('GitHub no respondió a tiempo')));
    req.on('error', reject);
  });
}
function itemById(id) { return catalog.find(item => item.id === id); }
function registryPath() { return path.join(app.getPath('userData'), 'registered-apps.json'); }
function getRegistry() {
  try {
    const data = JSON.parse(fs.readFileSync(registryPath(), 'utf8'));
    return data && typeof data === 'object' && !Array.isArray(data) ? data : {};
  } catch { return {}; }
}
function saveRegistry(registry) {
  const file = registryPath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(registry, null, 2), { mode: 0o600 });
  fs.renameSync(tmp, file);
}
function getRegistered() {
  const registry = getRegistry();
  return Object.fromEntries(catalog.map(item => {
    const value = registry[item.id];
    return [item.id, Boolean(value && typeof value.path === 'string' && fs.existsSync(value.path))];
  }));
}
async function latestRelease(item) {
  if (item.pending) return { status: 'pending' };
  if (!isSafeRepo(item.repo)) return { status: 'invalid-repo' };
  if (Array.isArray(item.platforms) && !item.platforms.includes(process.platform)) return { status: 'unsupported' };
  try {
    const release = await requestJSON('https://api.github.com/repos/' + item.repo + '/releases/latest');
    if (!release) return { status: 'no-release' };
    if (release.draft || release.prerelease) return { status: 'no-release' };
    const asset = selectAsset(release, process.platform, process.arch);
    if (!asset || !trustedAssetURL(asset.browser_download_url, item.repo, release.tag_name)) return { status: 'unsupported' };
    return { status: 'available', version: release.tag_name, assetName: asset.name, url: asset.browser_download_url, digest: asset.digest || null, size: asset.size, published: release.published_at };
  } catch (e) { return { status: 'error', message: e.message }; }
}
function downloadFile(url, destination, expectedDigest, onProgress) {
  // GitHub release assets redirect to their CDN. Only HTTPS redirects are accepted.
  return new Promise((resolve, reject) => {
    const temporary = destination + '.partial';
    const hash = crypto.createHash('sha256');
    const expected = typeof expectedDigest === 'string' && /^sha256:[a-f0-9]{64}$/i.test(expectedDigest) ? expectedDigest.slice(7).toLowerCase() : null;
    let written = 0;
    let finished = false;
    const cleanup = error => {
      if (finished) return;
      finished = true;
      fs.rm(temporary, { force: true }, () => reject(error));
    };
    const visit = (target, hops) => {
      if (hops > 5) return cleanup(new Error('Demasiadas redirecciones'));
      let uri;
      try { uri = new URL(target); } catch { return cleanup(new Error('URL inválida')); }
      if (uri.protocol !== 'https:' || uri.username || uri.password || !['github.com','release-assets.githubusercontent.com','objects.githubusercontent.com'].includes(uri.hostname))
        return cleanup(new Error('Origen de descarga no permitido'));
      const req = https.get(uri, { headers: { 'User-Agent': USER_AGENT }, timeout: 30000 }, res => {
        if ([301,302,303,307,308].includes(res.statusCode) && res.headers.location) {
          res.resume(); return visit(new URL(res.headers.location, uri).toString(), hops + 1);
        }
        if (res.statusCode !== 200) { res.resume(); return cleanup(new Error('Descarga HTTP ' + res.statusCode)); }
        const total = Number(res.headers['content-length']) || 0;
        if (total > 3 * 1024 ** 3) { res.destroy(); return cleanup(new Error('Archivo demasiado grande')); }
        const stream = fs.createWriteStream(temporary, { flags: 'wx', mode: 0o600 });
        res.on('data', chunk => {
          written += chunk.length;
          if (written > 3 * 1024 ** 3) return res.destroy(new Error('Archivo demasiado grande'));
          hash.update(chunk);
          if (onProgress) onProgress({ received: written, total });
        });
        res.on('error', cleanup);
        stream.on('error', cleanup);
        stream.on('finish', () => {
          stream.close(err => {
            if (err) return cleanup(err);
            const digest = hash.digest('hex');
            if (expected && digest !== expected) return cleanup(new Error('El SHA-256 no coincide. Se eliminó el archivo.'));
            try {
              fs.renameSync(temporary, destination);
              finished = true;
              resolve({ sha256: digest, verified: Boolean(expected), path: destination });
            } catch(e) { cleanup(e); }
          });
        });
        res.pipe(stream);
      });
      req.on('timeout', () => req.destroy(new Error('Descarga sin respuesta')));
      req.on('error', cleanup);
    };
    visit(url, 0);
  });
}
function window() {
  const win = new BrowserWindow({
    width: 1160, height: 790, minWidth: 850, minHeight: 600,
    backgroundColor: '#0b1020', title: 'Mau Launcher',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), nodeIntegration: false, contextIsolation: true, sandbox: true }
  });
  win.loadFile(path.join(__dirname, 'index.html'));
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  return win;
}
app.whenReady().then(() => {
  ipcMain.handle('catalog', () => catalog);
  ipcMain.handle('releases', async () => {
    const values = await Promise.all(catalog.map(async item => [item.id, await latestRelease(item)]));
    for (const [id, info] of values) cache.set(id, info);
    return Object.fromEntries(values);
  });
  ipcMain.handle('registered', () => getRegistered());
  ipcMain.handle('open-repo', async (_event, id) => {
    const item = itemById(id);
    if (!item || !isSafeRepo(item.repo)) return false;
    await shell.openExternal('https://github.com/' + item.repo);
    return true;
  });
  ipcMain.handle('register', async (_event, id) => {
    if (!itemById(id)) return { error: 'Aplicación desconocida' };
    const ext = process.platform === 'win32' ? ['exe'] : process.platform === 'darwin' ? ['app'] : ['AppImage'];
    const result = await dialog.showOpenDialog({
      title: 'Seleccionar programa instalado',
      properties: ['openFile'],
      filters: [{ name: 'Aplicación', extensions: ext }]
    });
    if (result.canceled || !result.filePaths?.[0]) return { cancelled: true };
    const selected = path.resolve(result.filePaths[0]);
    if (!fs.statSync(selected).isFile()) return { error: 'Selecciona un ejecutable válido' };
    const registry = getRegistry();
    registry[id] = { path: selected };
    saveRegistry(registry);
    return { ok: true };
  });
  ipcMain.handle('launch', async (_event, id) => {
    if (!itemById(id)) return { error: 'Aplicación desconocida' };
    const installed = getRegistry()[id];
    if (!installed || !fs.existsSync(installed.path)) return { error: 'Primero selecciona el programa instalado' };
    try {
      if (process.platform === 'win32' && !/\.exe$/i.test(installed.path)) return { error: 'El programa no es un .exe' };
      if (process.platform === 'darwin' && !/\.app$/i.test(installed.path)) return { error: 'Selecciona una aplicación .app' };
      const child = process.platform === 'darwin'
        ? spawn('/usr/bin/open', [installed.path], { detached: true, stdio: 'ignore' })
        : spawn(installed.path, [], { detached: true, stdio: 'ignore', cwd: path.dirname(installed.path), shell: false });
      child.on('error', error => console.error('No se pudo abrir el programa:', error.message));
      child.unref();
      return { ok: true };
    } catch(e) { return { error: e.message }; }
  });
  ipcMain.handle('install', async (event, id) => {
    if (!itemById(id)) return { error: 'Aplicación desconocida' };
    if (activeDownloads.has(id)) return { error: 'Ya hay una descarga en curso' };
    const latest = await latestRelease(itemById(id));
    if (latest.status !== 'available') return { error: 'No hay instalador publicado para tu sistema' };
    const chosen = await dialog.showSaveDialog({
      title: 'Guardar instalador de ' + itemById(id).name,
      defaultPath: path.join(app.getPath('downloads'), path.basename(latest.assetName)),
      buttonLabel: 'Descargar instalador'
    });
    if (chosen.canceled || !chosen.filePath) return { cancelled: true };
    if (fs.existsSync(chosen.filePath)) return { error: 'El archivo ya existe. Selecciona otro nombre.' };
    activeDownloads.add(id);
    try {
      const saved = await downloadFile(latest.url, chosen.filePath, latest.digest, progress => {
        if (!event.sender.isDestroyed()) event.sender.send('download-progress', { id, ...progress });
      });
      await shell.showItemInFolder(saved.path);
      return { ok: true, message: saved.verified ? 'Descargado y verificado con SHA-256 de GitHub. Abre el instalador desde tu carpeta.' : 'Descargado. GitHub no aportó una huella SHA-256 verificable; comprueba el origen antes de ejecutar.', sha256: saved.sha256 };
    } catch(e) { return { error: e.message }; }
    finally { activeDownloads.delete(id); }
  });
  window();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) window(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
