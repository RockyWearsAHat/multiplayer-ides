const path = require("node:path");
const { app, BrowserWindow, ipcMain, dialog } = require("electron");

const { detectInstalledIdes } = require("./ide-detector");
const { SessionManager } = require("./session-manager");

const sessionManager = new SessionManager();

function createWindow() {
  const window = new BrowserWindow({
    width: 1100,
    height: 760,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.js")
    }
  });

  window.loadFile(path.join(__dirname, "renderer", "index.html"));

  sessionManager.on("status", (payload) => {
    window.webContents.send("session:status", payload);
  });

  sessionManager.on("join-request", (payload) => {
    window.webContents.send("session:join-request", payload);
  });

  sessionManager.on("join-accepted", (payload) => {
    window.webContents.send("session:join-accepted", payload);
  });

  sessionManager.on("join-rejected", () => {
    window.webContents.send("session:join-rejected");
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

ipcMain.handle("ides:list", () => {
  return detectInstalledIdes();
});

ipcMain.handle("workspace:pick", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openDirectory"]
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return result.filePaths[0];
});

ipcMain.handle("session:set-display-name", (_event, displayName) => {
  sessionManager.setDisplayName(displayName);
});

ipcMain.handle("session:host", async (_event, payload) => {
  return sessionManager.hostSession(payload);
});

ipcMain.handle("session:join", async (_event, payload) => {
  return sessionManager.joinSession(payload);
});

ipcMain.handle("session:decide", (_event, payload) => {
  return sessionManager.decideJoinRequest(payload);
});
