// Bridge between the pet page and the main process.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('pet', {
  init: () => ipcRenderer.invoke('pet:init'),
  setIgnoreMouse: (ignore) => ipcRenderer.send('pet:ignore', ignore),
  dragStart: () => ipcRenderer.send('pet:drag-start'),
  dragTick: () => ipcRenderer.invoke('pet:drag-tick'),
  dragEnd: () => ipcRenderer.invoke('pet:drag-end'),
  showMenu: () => ipcRenderer.send('pet:menu'),
  onCommand: (fn) => ipcRenderer.on('pet:command', (_e, command) => fn(command)),
});
