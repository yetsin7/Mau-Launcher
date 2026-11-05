'use strict';
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('mau', {
  catalog: () => ipcRenderer.invoke('catalog'),
  releases: () => ipcRenderer.invoke('releases'),
  registered: () => ipcRenderer.invoke('registered'),
  install: (id) => ipcRenderer.invoke('install', id),
  register: (id) => ipcRenderer.invoke('register', id),
  launch: (id) => ipcRenderer.invoke('launch', id),
  openRepo: (id) => ipcRenderer.invoke('open-repo', id),
  onDownloadProgress: (fn) => {
    const listener = (_event, data) => fn(data);
    ipcRenderer.on('download-progress', listener);
    return () => ipcRenderer.removeListener('download-progress', listener);
  },
  platform: process.platform
});
