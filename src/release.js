'use strict';

const INSTALLERS = {
  win32: /\.(exe|msi)$/i,
  darwin: /\.(dmg|pkg)$/i,
  linux: /\.(AppImage|deb|rpm)$/i
};
function isSafeRepo(repo) {
  return typeof repo === 'string' && /^yetsin7\/[a-zA-Z0-9._-]+$/.test(repo);
}
function selectAsset(release, platform, arch) {
  const ext = INSTALLERS[platform];
  if (!ext || !Array.isArray(release?.assets)) return null;
  const candidates = release.assets.filter(a => a && typeof a.name === 'string' && ext.test(a.name) && !/(?:debug|symbols|source|checksum|\.blockmap)/i.test(a.name) && /^https:\/\/github\.com\/yetsin7\//i.test(a.browser_download_url || ''));
  const isArm = /(arm64|aarch64)/i, isX64 = /(x64|x86_64|amd64)/i, isX86 = /(?:^|[-_.])(ia32|x86|win32)(?:[-_.]|$)/i;
  const preferred = arch === 'arm64' ? isArm : arch === 'x64' ? isX64 : isX86;
  const incompatible = arch === 'arm64' ? (s) => isX64.test(s) || isX86.test(s) : arch === 'x64' ? (s) => isArm.test(s) || isX86.test(s) : (s) => isArm.test(s) || isX64.test(s);
  return candidates.find(a => preferred.test(a.name)) || candidates.find(a => /universal/i.test(a.name)) || candidates.find(a => !incompatible(a.name)) || null;
}
function trustedAssetURL(url, repo, releaseTag) {
  if (!isSafeRepo(repo) || typeof url !== 'string') return false;
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && u.hostname === 'github.com' && u.username === '' && u.password === '' && u.pathname.startsWith('/' + repo + '/releases/download/' + encodeURIComponent(releaseTag) + '/');
  } catch { return false; }
}
module.exports = { isSafeRepo, selectAsset, trustedAssetURL };
