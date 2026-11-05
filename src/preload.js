const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('mau', {
  catalog: () => ipcRenderer.invoke('catalog'),
  releases: () => ipcRenderer.invoke('releases'),
  install: (id) => ipcRenderer.invoke('install', id),
  openRepo: (id) => ipcRenderer.invoke('open-repo', id),
  platform: process.platform
});
