"use strict";

// ── Multiplayer Code Helper — Electron main process ──────────────────────────
//
// This is a STANDALONE process with its own macOS app identity.
// When it calls getUserMedia, macOS shows its own real system permission dialog:
//   "Multiplayer Code Helper would like to access your microphone"
// The user consciously approves access to THIS app — not VS Code, not anything
// else. This is the ONLY correct and privacy-respecting way to get media
// permissions inside a VS Code extension workflow.
//
// IPC: The VS Code extension starts a WebSocket server on a local-only port and
// passes --ipc-port=<N> here. This helper connects back as a client, enabling
// bidirectional message exchange with the extension host.
//
// Privacy guarantee: No media access happens without the user explicitly
// clicking "Allow" in the OS-level dialog that this process triggers.
// ─────────────────────────────────────────────────────────────────────────────

const { app, BrowserWindow, session, ipcMain, systemPreferences } = require("electron");
const path = require("node:path");
const WebSocket = require("ws");

// ── Parse --ipc-port=<N> from CLI args ───────────────────────────────────────
const portArg = process.argv.slice(2).find((a) => a.startsWith("--ipc-port="));
const IPC_PORT = portArg ? parseInt(portArg.split("=")[1], 10) : null;

if (!IPC_PORT || isNaN(IPC_PORT)) {
  console.error("[call-helper] Missing or invalid --ipc-port argument — exiting");
  process.exitCode = 1;
  app.quit();
}

// Identify the app to macOS — this name appears in the system permission dialog.
app.setName("Multiplayer Code Helper");

let mainWindow = null;
let extSocket = null; // WebSocket connection back to the VS Code extension

// ── Send a message to the extension ──────────────────────────────────────────
function sendToExtension(msg) {
  if (extSocket && extSocket.readyState === WebSocket.OPEN) {
    extSocket.send(JSON.stringify(msg));
  }
}

// ── Send a message to the renderer (call UI) ─────────────────────────────────
function sendToRenderer(msg) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("ipc", msg);
  }
}

// ── Create the floating global call window ───────────────────────────────────
function createCallWindow() {
  mainWindow = new BrowserWindow({
    show: false,
    width: 480,
    height: 58,
    minWidth: 360,
    minHeight: 58,
    maxHeight: 58,
    resizable: false,
    frame: false,
    transparent: true,
    title: "Multiplayer Call",
    backgroundColor: "#00000000",
    hasShadow: true,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      // Media access is handled by the permission request handler below.
      // contextIsolation keeps renderer code sandboxed from Node.
    },
  });

  // Float above all windows at the OS "floating" level (above normal app windows)
  // and make visible on every macOS Space/desktop.
  mainWindow.setAlwaysOnTop(true, "floating");
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  mainWindow.loadFile(path.join(__dirname, "src", "renderer.html"));

  mainWindow.on("closed", () => {
    mainWindow = null;
    sendToExtension({ type: "call-ended" });
    // Give the message a moment to send before quitting
    setTimeout(() => app.quit(), 300);
  });
}

ipcMain.on("helper-close-window", () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.close();
  }
});

// ── Connect back to the extension's IPC WebSocket server ─────────────────────
function connectToExtension() {
  extSocket = new WebSocket(`ws://127.0.0.1:${IPC_PORT}`);

  extSocket.on("open", () => {
    sendToExtension({ type: "helper-ready" });
  });

  extSocket.on("message", (data) => {
    try {
      const msg = JSON.parse(data.toString());

      if (msg.type === "start-call") {
        handleStartCallRequest().catch((err) => {
          sendToExtension({
            type: "media-error",
            message: err?.message || String(err || "unknown permission error"),
          });
        });
        return;
      }

      // Forward other messages from extension to the renderer
      sendToRenderer(msg);
    } catch {
      // Ignore malformed frames
    }
  });

  extSocket.on("close", () => {
    // Extension disconnected — end the call and exit
    extSocket = null;
    sendToRenderer({ type: "end-call" });
    setTimeout(() => app.quit(), 500);
  });

  extSocket.on("error", () => {
    extSocket = null;
    app.quit();
  });
}

async function handleStartCallRequest() {
  // Single prompt path: do not pre-request via askForMediaAccess, because that
  // causes duplicate prompts when getUserMedia requests the same tracks.
  // Instead, use current status only to avoid requesting already-denied tracks.
  const micStatus = systemPreferences.getMediaAccessStatus("microphone");
  const camStatus = systemPreferences.getMediaAccessStatus("camera");

  const hasAudio = micStatus !== "denied" && micStatus !== "restricted";
  const hasVideo = camStatus !== "denied" && camStatus !== "restricted";

  if (!hasAudio && !hasVideo) {
    sendToExtension({ type: "media-denied" });
    return;
  }

  if (!hasVideo || !hasAudio) {
    const missing = [
      !hasAudio ? "microphone" : null,
      !hasVideo ? "camera" : null,
    ].filter(Boolean).join(" and ");

    sendToExtension({
      type: "call-state",
      text: `Limited permissions (${missing} denied in System Settings)` ,
      connected: false,
    });
  }

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    // Bring above VS Code — required because the extension launches the helper
    // via `open -g` (background launch) so macOS never activates it.
    app.focus({ steal: true });
    mainWindow.moveTop();
    mainWindow.focus();
  }

  sendToRenderer({
    type: "start-call",
    constraints: {
      audio: hasAudio,
      video: hasVideo,
    },
  });
}

// ── Bridge: renderer → extension ─────────────────────────────────────────────
ipcMain.on("helper-to-ext", (_event, msg) => {
  sendToExtension(msg);
});

// ── Renderer signals it is loaded and ready ───────────────────────────────────
ipcMain.on("renderer-ready", () => {
  // Connect to the extension (this triggers "helper-ready" on open).
  connectToExtension();
});

// ── App lifecycle ─────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  // Grant our own renderer permission to access media.
  // macOS still shows the user-facing permission dialog for THIS process —
  // the user sees "Multiplayer Code Helper would like to access your microphone".
  // We are not bypassing the OS prompt; we are allowing it to reach the OS.
  session.defaultSession.setPermissionRequestHandler(
    (_webContents, permission, callback) => {
      const mediaPermissions = new Set([
        "media",
        "microphone",
        "camera",
        "audioCapture",
        "videoCapture",
      ]);
      callback(mediaPermissions.has(permission));
    }
  );

  createCallWindow();
});

app.on("window-all-closed", () => {
  app.quit();
});
