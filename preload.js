// ============================================================
// preload.js — Puente seguro entre el proceso principal y la interfaz
// Solo se expone lo estrictamente necesario con contextBridge:
// la interfaz nunca recibe ipcRenderer ni acceso a Node.js.
// ============================================================

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
    obtenerBebidas: () => ipcRenderer.invoke("bebidas:obtener"),
    versionElectron: process.versions.electron
});
