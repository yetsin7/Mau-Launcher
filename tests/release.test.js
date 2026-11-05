const test = require('node:test');
const assert = require('node:assert/strict');
const { selectAsset, trustedAssetURL, isSafeRepo } = require('../src/release');

test('only owner repos are accepted', () => {
  assert.equal(isSafeRepo('yetsin7/my-movies'), true);
  assert.equal(isSafeRepo('someone/other'), false);
  assert.equal(isSafeRepo('yetsin7/../evil'), false);
});
test('match architecture and supported installer suffixes', () => {
  const release = {assets:[
    {name:'Mau-1.0-arm64.dmg', browser_download_url:'https://github.com/yetsin7/my-movies/releases/download/v1/Mau-arm64.dmg'},
    {name:'Mau-1.0-x64.dmg', browser_download_url:'https://github.com/yetsin7/my-movies/releases/download/v1/Mau-x64.dmg'}
  ]};
  assert.equal(selectAsset(release,'darwin','x64').name,'Mau-1.0-x64.dmg');
  assert.equal(selectAsset(release,'darwin','arm64').name,'Mau-1.0-arm64.dmg');
  assert.equal(selectAsset(release,'win32','x64'),null);
});
test('never offer mismatched-only installers',()=>{
 const release={assets:[{name:'App-arm64.exe',browser_download_url:'https://github.com/yetsin7/my-movies/releases/download/v1/App-arm64.exe'}]};
 assert.equal(selectAsset(release,'win32','x64'),null);
});
test('trusted release URLs require HTTPS, owner, tag and download path',()=>{
 assert.equal(trustedAssetURL('https://github.com/yetsin7/my-movies/releases/download/v1/file.exe','yetsin7/my-movies','v1'),true);
 assert.equal(trustedAssetURL('https://evil.example/yetsin7/my-movies/releases/download/v1/file.exe','yetsin7/my-movies','v1'),false);
 assert.equal(trustedAssetURL('https://github.com/yetsin7/my-movies/releases/download/v2/file.exe','yetsin7/my-movies','v1'),false);
});
