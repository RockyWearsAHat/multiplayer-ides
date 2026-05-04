"use strict";

const { contextBridge, ipcRenderer } = require("electron");

// Expose a minimal, typed IPC surface to the renderer.
// The renderer cannot access Node APIs directly (contextIsolation: true).
contextBridge.exposeInMainWorld("callHelper", {
  /** Signal to main that the renderer DOM is ready. */
  ready: () => ipcRenderer.send("renderer-ready"),

  /** Send a message from renderer → extension (via main). */
  send: (msg) => ipcRenderer.send("helper-to-ext", msg),

  /** Register a handler for messages coming from the extension → renderer. */
  onMessage: (callback) => {
    ipcRenderer.on("ipc", (_event, msg) => callback(msg));
  },
});
