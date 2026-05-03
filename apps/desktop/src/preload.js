const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("multiplayerApi", {
  listIdes: () => ipcRenderer.invoke("ides:list"),
  pickWorkspace: () => ipcRenderer.invoke("workspace:pick"),
  setDisplayName: (name) => ipcRenderer.invoke("session:set-display-name", name),
  hostSession: (payload) => ipcRenderer.invoke("session:host", payload),
  joinSession: (payload) => ipcRenderer.invoke("session:join", payload),
  decideJoinRequest: (payload) => ipcRenderer.invoke("session:decide", payload),
  onStatus: (handler) => ipcRenderer.on("session:status", (_event, data) => handler(data)),
  onJoinRequest: (handler) =>
    ipcRenderer.on("session:join-request", (_event, data) => handler(data)),
  onJoinAccepted: (handler) =>
    ipcRenderer.on("session:join-accepted", (_event, data) => handler(data)),
  onJoinRejected: (handler) => ipcRenderer.on("session:join-rejected", () => handler())
});
