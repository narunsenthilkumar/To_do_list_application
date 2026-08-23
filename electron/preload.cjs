const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,

  // Native File Dialogs (Secure IPC)
  saveFile: (options) => ipcRenderer.invoke('dialog:saveFile', options),
  openFile: (options) => ipcRenderer.invoke('dialog:openFile', options),

  // Windows Desktop Notifications
  showNotification: (options) => ipcRenderer.invoke('notification:show', options),

  // Window Controls
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),

  // Windows Native Voice & Speech Recognition (Secure IPC)
  voice: {
    checkPermission: () => ipcRenderer.invoke('voice:checkPermission'),
    startListening: () => ipcRenderer.invoke('voice:startListening'),
    stopListening: () => ipcRenderer.invoke('voice:stopListening'),
    openSettings: () => ipcRenderer.invoke('voice:openSettings'),
    onResult: (callback) => {
      const listener = (event, data) => callback(data);
      ipcRenderer.on('voice:onResult', listener);
      return () => ipcRenderer.removeListener('voice:onResult', listener);
    },
    onError: (callback) => {
      const listener = (event, err) => callback(err);
      ipcRenderer.on('voice:onError', listener);
      return () => ipcRenderer.removeListener('voice:onError', listener);
    },
    onEnd: (callback) => {
      const listener = () => callback();
      ipcRenderer.on('voice:onEnd', listener);
      return () => ipcRenderer.removeListener('voice:onEnd', listener);
    },
    onVolume: (callback) => {
      const listener = (event, lvl) => callback(lvl);
      ipcRenderer.on('voice:onVolume', listener);
      return () => ipcRenderer.removeListener('voice:onVolume', listener);
    },
    getSystemDiagnostics: () => ipcRenderer.invoke('voice:getSystemDiagnostics'),
  },

  // System Clipboard (Secure IPC)
  clipboard: {
    writeText: (text) => ipcRenderer.invoke('clipboard:writeText', text),
    readText: () => ipcRenderer.invoke('clipboard:readText'),
  },

  // Native System Theme (Secure IPC)
  theme: {
    getSystemTheme: () => ipcRenderer.invoke('theme:getSystemTheme'),
    onSystemThemeChange: (callback) => {
      const listener = (event, theme) => callback(theme);
      ipcRenderer.on('theme:changed', listener);
      return () => ipcRenderer.removeListener('theme:changed', listener);
    },
  },
});
