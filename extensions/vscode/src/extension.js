const path = require("node:path");
const net = require("node:net");
const { spawn, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const vscode = require("vscode");
const Y = require("yjs");
const { WebSocketServer } = require("ws");

const { EVENTS } = require("./protocol");
const { SessionService } = require("./session-service");
const { MultiplayerViewProvider, sendPanelMessage } = require("./panel");

let statusBar = null;
let panel = null;
let sessionService = null;
let suppressChanges = false;
let latestParticipants = [];
let latestChatMessages = [];
let shownAccessibilityWarning = false;

function warnMissingAccessibility() {
  if (shownAccessibilityWarning) {
    return;
  }

  shownAccessibilityWarning = true;
  vscode.window.showWarningMessage(
    "Multiplayer Code Helper needs macOS Accessibility permission to anchor chat/call to the VS Code window. Enable it in System Settings > Privacy & Security > Accessibility."
  );
}

/** Resolve the IDE process/window context we should bind to.
 *  On macOS, capture the frontmost IDE PID + front window title at invocation
 *  time so Extension Development Host binds to the exact launching window.
 */
function detectLaunchingIdeContext(appName) {
  const fallback = Number(process.env.VSCODE_PID || process.ppid || 0);
  const fallbackPid = Number.isFinite(fallback) && fallback > 0 ? fallback : null;
  if (process.platform !== "darwin") {
    return { pid: fallbackPid, windowTitle: null };
  }

  try {
    const out = spawnSync("osascript", [
      "-e",
      'tell application "System Events"',
      "set p to first process whose frontmost is true",
      "set wname to \"\"",
      "try",
      "  if (count of windows of p) > 0 then",
      "    set wname to name of front window of p",
      "  end if",
      "end try",
      'return (name of p) & "|" & (unix id of p) & "|" & wname',
      "end tell",
    ], { encoding: "utf8", timeout: 1500 });

    const text = String(out.stdout || "").trim();
    const [frontNameRaw, frontPidRaw, frontWindowRaw] = text.split("|");
    const frontName = String(frontNameRaw || "").trim();
    const frontPid = Number(frontPidRaw);
    const frontWindow = String(frontWindowRaw || "").trim();
    const ideLike = [appName, "Visual Studio Code", "Code", "Cursor", "Windsurf", "VSCodium"]
      .filter(Boolean)
      .some((n) => frontName.toLowerCase().includes(String(n).toLowerCase()));

    if (ideLike && Number.isFinite(frontPid) && frontPid > 0) {
      return { pid: frontPid, windowTitle: frontWindow || null };
    }
  } catch {
    // Fall back below.
  }

  return { pid: fallbackPid, windowTitle: null };
}

/** Detect VS Code window bounds via Quartz (macOS only).
 *  Prefers exact PID match when provided, then falls back to owner-name match.
 *  Returns {x,y,width,height} or null.
 */
function detectVSCodeWindowBounds(targetPid = null, targetTitle = null) {
  if (process.platform !== "darwin") return null;

  const appName = typeof vscode.env.appName === "string" ? vscode.env.appName.trim() : "";
  const candidates = [];
  const push = (n) => { const s = String(n||"").trim(); if (s && !candidates.includes(s)) candidates.push(s); };
  push(appName);
  push(appName.replace(/^Visual Studio /i, ""));
  ["Visual Studio Code - Insiders","Visual Studio Code","Code - Insiders","Code",
   "Cursor","Windsurf","VSCodium"].forEach(push);

  const namesLiteral = JSON.stringify(candidates);
  const pyScript = [
    "import sys, json",
    "try:",
    "  from Quartz import CGWindowListCopyWindowInfo, kCGWindowListOptionAll, kCGNullWindowID",
    "  target_pid = None",
    "  target_title = None",
    "  if len(sys.argv) > 1:",
    "    try:",
    "      target_pid = int(sys.argv[1])",
    "    except Exception:",
    "      target_pid = None",
    "  if len(sys.argv) > 2:",
    "    t = (sys.argv[2] or '').strip()",
    "    if t:",
    "      target_title = t.lower()",
    `  names = set(json.loads(r'''${namesLiteral}'''))`,
    "  wl = CGWindowListCopyWindowInfo(kCGWindowListOptionAll, kCGNullWindowID) or []",
    "  best_title = None",
    "  best_pid = None",
    "  best_name = None",
    "  for w in wl:",
    "    if w.get('kCGWindowLayer', 0) != 0: continue",
    "    b = w.get('kCGWindowBounds') or {}",
    "    wx,wy,ww,wh = int(b.get('X',0)),int(b.get('Y',0)),int(b.get('Width',0)),int(b.get('Height',0))",
    "    if ww < 220 or wh < 160: continue",
    "    pid = int(w.get('kCGWindowOwnerPID', -1))",
    "    name = w.get('kCGWindowOwnerName')",
    "    title = str(w.get('kCGWindowName') or '').lower()",
    "    area = ww*wh",
    "    if target_title is not None and target_title in title:",
    "      if best_title is None or area > best_title[4]: best_title = (wx,wy,ww,wh,area)",
    "    if target_pid is not None and pid == target_pid:",
    "      if best_pid is None or area > best_pid[4]: best_pid = (wx,wy,ww,wh,area)",
    "    if name in names:",
    "      if best_name is None or area > best_name[4]: best_name = (wx,wy,ww,wh,area)",
    "  best = best_title or best_pid or best_name",
    "  if best: print(f'{best[0]}|{best[1]}|{best[2]}|{best[3]}')",
    "except Exception as e:",
    "  sys.stderr.write(str(e)+'\\n')",
  ].join("\n");

  const pythonCandidates = [
    "/usr/local/bin/python3",
    "/opt/homebrew/bin/python3",
    "/usr/bin/python3",
    "python3",
  ];

  for (const py of pythonCandidates) {
    try {
      const result = spawnSync(py, ["-c", pyScript, String(targetPid || ""), String(targetTitle || "")], { encoding: "utf8", timeout: 5000 });
      if (result.status === 0 && result.stdout) {
        const out = result.stdout.trim();
        const parts = out.split("|").map(Number);
        if (parts.length === 4 && parts.every(n => !isNaN(n)) && parts[2] >= 220 && parts[3] >= 160) {
          return { x: parts[0], y: parts[1], width: parts[2], height: parts[3] };
        }
      }
    } catch (_) { /* try next */ }
  }
  return null;
}

function buildIdeAnchorArgs() {
  const args = [];
  const appName = typeof vscode.env.appName === "string" ? vscode.env.appName.trim() : "";
  if (appName) args.push(`--ide-app-name=${appName}`);

  const uriScheme = String(vscode.env.uriScheme || "").toLowerCase();
  const bundleByScheme = {
    vscode: "com.microsoft.VSCode",
    "vscode-insiders": "com.microsoft.VSCodeInsiders",
    vscodium: "com.vscodium",
    cursor: "com.todesktop.230313mzl4w4u92",
    windsurf: "com.exafunction.windsurf",
  };
  const bundleId = bundleByScheme[uriScheme] || "";
  if (bundleId) args.push(`--ide-bundle-id=${bundleId}`);

  const launchCtx = detectLaunchingIdeContext(appName);
  const launchingIdePid = launchCtx?.pid || null;
  const launchingWindowTitle = launchCtx?.windowTitle || null;
  if (launchingIdePid) args.push(`--ide-pid=${launchingIdePid}`);
  if (launchingWindowTitle) args.push(`--ide-window-title=${launchingWindowTitle}`);

  // Detect VS Code's window bounds here (extension has full shell PATH) and
  // pass them directly so the helper never needs to re-detect them.
  const bounds = detectVSCodeWindowBounds(launchingIdePid, launchingWindowTitle);
  if (bounds) {
    args.push(`--anchor-x=${bounds.x}`);
    args.push(`--anchor-y=${bounds.y}`);
    args.push(`--anchor-w=${bounds.width}`);
    args.push(`--anchor-h=${bounds.height}`);
    vscode.window.showInformationMessage(`[anchor] ext detected: ${bounds.width}x${bounds.height} @ (${bounds.x},${bounds.y}) pid=${launchingIdePid || "?"} title=${launchingWindowTitle || "?"}`);
  } else {
    vscode.window.showWarningMessage(`[anchor] ext detection FAILED pid=${launchingIdePid || "?"} title=${launchingWindowTitle || "?"} — no bounds passed to helper`);
  }

  return args;
}

function buildIdeWindowBoundsPayload() {
  const appName = typeof vscode.env.appName === "string" ? vscode.env.appName.trim() : "";
  const launchCtx = detectLaunchingIdeContext(appName);
  const bounds = detectVSCodeWindowBounds(launchCtx?.pid || null, launchCtx?.windowTitle || null);
  if (!bounds) {
    return null;
  }

  return {
    type: "ide-window-bounds",
    bounds,
  };
}

// ── CallHelperManager ─────────────────────────────────────────────────────────
// Manages the lifecycle of the standalone companion helper process that handles
// camera/microphone access with its own macOS app identity.
//
// Privacy guarantee: all media access flows through the helper — the user sees
// a real OS-level permission dialog for "Multiplayer Code Helper", not VS Code.
// ─────────────────────────────────────────────────────────────────────────────
class CallHelperManager {
  constructor({ helperDir, onState, onRtcSignal, onSendChat, onChatWindowState, onChatWindowReady }) {
    this._helperDir    = helperDir;
    this._onState      = onState;
    this._onRtcSignal  = onRtcSignal;
    this._onSendChat = onSendChat;
    this._onChatWindowState = onChatWindowState;
    this._onChatWindowReady = onChatWindowReady;
    this._server       = null;
    this._socket       = null;
    this._process      = null;
    this._active       = false;
    this._stopping     = false;
    this._stderrLines  = [];
    this._startTimeout = null;
    this._shutdownPromise = null;
  }

  isActive() { return this._active; }

  /** Send a message to the helper renderer (via main). */
  sendToHelper(msg) {
    if (this._socket && this._socket.readyState === 1 /* OPEN */) {
      this._socket.send(JSON.stringify(msg));
    }
  }

  /** Start the helper process. Resolves when the IPC server is listening. */
  async startCall() {
    if (this._shutdownPromise) {
      await this._shutdownPromise;
    }

    if (this._active) {
      // Already running — end the call instead (toggle)
      await this.stopCall();
      return;
    }

    if (this._socket || this._server || this._process) {
      await this._shutdownHelper({ announceEnded: false });
    }

    const mainScript = path.join(this._helperDir, "main.js");
    const launchSpec = this._resolveElectronLaunch(mainScript);

    if (!fs.existsSync(this._helperDir) || !fs.existsSync(mainScript) || !launchSpec) {
      this._onState({
        status: "not-installed",
        text: "Helper not installed — run: cd apps/call-helper && npm install",
      });
      return;
    }

    this._active = true;
    this._stopping = false;
    this._stderrLines = [];
    this._clearStartTimeout();
    this._onState({ status: "starting", text: "Starting call helper…" });

    try {
      const port = await this._getFreePort();
      const childEnv = { ...process.env };
      delete childEnv.ELECTRON_RUN_AS_NODE;

      this._server = new WebSocketServer({ host: "127.0.0.1", port });
      this._scheduleStartTimeout();
      this._server.on("connection", (sock) => {
        this._socket = sock;

        sock.on("message", (data) => {
          try { this._handleHelperMessage(JSON.parse(data.toString())); } catch { /* ignore malformed */ }
        });

        sock.on("close", () => {
          this._socket = null;
          if (this._active) {
            this._active = false;
            this._onState({ status: "ended", text: "Idle", connected: false });
          }
        });
      });

      this._process = spawn(
        launchSpec.command,
        [...launchSpec.args, `--ipc-port=${port}`, ...buildIdeAnchorArgs()],
        { stdio: ["ignore", "pipe", "pipe"], env: childEnv }
      );

      this._process.stdout?.on("data", (chunk) => {
        this._appendStderrLine(String(chunk));
      });
      this._process.stderr?.on("data", (chunk) => {
        this._appendStderrLine(String(chunk));
      });

      this._process.on("exit", (code, signal) => {
        this._process = null;

        // When launched via `open` on macOS, the `open` command itself exits
        // immediately after handing off to LaunchServices — the actual Electron
        // process is not our direct child.  In that case we should NOT treat the
        // launcher exit as a helper crash; lifecycle is tracked via the WebSocket
        // connection instead.
        if (launchSpec.usesOpen) { return; }

        if (!this._stopping && this._active) {
          const extra = this._stderrLines.length ? ` — ${this._stderrLines.join(" | ")}` : "";
          this._onState({
            status: "error",
            text: `Helper exited early (${signal || code || "unknown"})${extra}`,
            connected: false,
          });
        } else if (this._active) {
          this._active = false;
          this._onState({ status: "ended", text: "Idle", connected: false });
        }

        this._active = false;
        this._stopping = false;
        this._cleanup();
      });

      this._process.on("error", (err) => {
        this._active = false;
        this._stopping = false;
        this._onState({ status: "error", text: "Helper failed to start: " + err.message });
        this._cleanup();
      });

    } catch (err) {
      this._active = false;
      this._onState({ status: "error", text: "Call setup error: " + err.message });
      this._cleanup();
    }
  }

  /** Stop the helper and clean up. */
  stopCall() {
    return this._shutdownHelper({ announceEnded: true });
  }

  /** Dispose all resources — call when extension deactivates. */
  dispose() {
    return this._shutdownHelper({ announceEnded: false, forceKill: true });
  }

  _cleanup() {
    this._clearStartTimeout();
    try {
      this._socket?.close();
    } catch {
      /* ignore */
    }
    try {
      this._server?.clients?.forEach((client) => {
        try { client.terminate(); } catch { /* ignore */ }
      });
    } catch {
      /* ignore */
    }
    try { this._server?.close(); } catch { /* ignore */ }
    this._server = null;
    this._socket = null;
  }

  async _shutdownHelper({ announceEnded = true, forceKill = false } = {}) {
    if (this._shutdownPromise) {
      return this._shutdownPromise;
    }

    const hadHelper = Boolean(this._active || this._socket || this._server || this._process);

    this._shutdownPromise = (async () => {
      this._active = false;
      this._stopping = true;
      this._clearStartTimeout();

      try {
        this.sendToHelper({ type: "end-call" });
      } catch {
        /* ignore */
      }

      try {
        this._socket?.close();
      } catch {
        /* ignore */
      }

      await new Promise((resolve) => setTimeout(resolve, forceKill ? 0 : 200));

      if (this._process && !this._process.killed) {
        try {
          this._process.kill();
        } catch {
          /* ignore */
        }
      }

      this._process = null;
      this._cleanup();

      if (announceEnded && hadHelper) {
        this._onState({ status: "ended", text: "Idle", connected: false });
      }
    })().finally(() => {
      this._stopping = false;
      this._shutdownPromise = null;
    });

    return this._shutdownPromise;
  }

  _handleHelperMessage(msg) {
    switch (msg.type) {
      case "helper-ready":
        if (msg.accessibilityTrusted === false) {
          warnMissingAccessibility();
        }
        // Helper connected — tell it to start the call immediately
        this.sendToHelper({ type: "focus-overlay-window" });
        this._onState({ status: "starting", text: "Requesting camera and microphone permission…" });
        this.sendToHelper({ type: "start-call" });
        break;
      case "media-ready":
        this._clearStartTimeout();
        this._onState({
          status: "media-ready",
          text: msg.label || "Media ready",
          hasAudio: msg.hasAudio,
          hasVideo: msg.hasVideo,
        });
        break;
      case "media-denied":
        this._clearStartTimeout();
        this._onState({ status: "denied", text: "Permission denied — grant access to 'Multiplayer Code Helper' in System Settings" });
        break;
      case "media-error":
        this._clearStartTimeout();
        this._onState({ status: "error", text: "Media error: " + (msg.message || "unknown") });
        break;
      case "call-state":
        this._clearStartTimeout();
        this._onState({ status: "call", text: msg.text, connected: Boolean(msg.connected) });
        break;
      case "call-controls":
        this._onState({
          status: this._active ? "call" : "idle",
          text: msg.label || "In call",
          connected: this._active,
          hasAudio: msg.hasAudio,
          hasVideo: msg.hasVideo,
          audioEnabled: msg.audioEnabled,
          videoEnabled: msg.videoEnabled,
        });
        break;
      case "mute":
        this.sendToHelper({ type: "mute", audio: Boolean(msg.audio) });
        break;
      case "video":
        this.sendToHelper({ type: "video", enabled: Boolean(msg.enabled) });
        break;
      case "call-ended":
        this._clearStartTimeout();
        this._active = false;
        this._onState({ status: "ended", text: "Idle", connected: false });
        this._cleanup();
        break;
      case "rtc-signal":
        this._onRtcSignal(msg.signal);
        break;
      case "send-chat":
        this._onSendChat?.(msg.text || "");
        break;
      case "chat-window-ready":
        this._onChatWindowState?.(true);
        this._onChatWindowReady?.();
        break;
      case "chat-window-closed":
        this._onChatWindowState?.(false);
        break;
      case "anchor-debug": {
        const { source, bounds, idePid } = msg;
        const b = bounds ? `${bounds.width}x${bounds.height} @ (${bounds.x},${bounds.y})` : "?";
        vscode.window.showInformationMessage(
          `[Multiplayer anchor] source=${source} pid=${idePid} bounds=${b}`
        );
        break;
      }
    }
  }

  async _getFreePort() {
    return new Promise((resolve, reject) => {
      const srv = net.createServer();
      srv.listen(0, "127.0.0.1", () => {
        const { port } = srv.address();
        srv.close(() => resolve(port));
      });
      srv.on("error", reject);
    });
  }

  _scheduleStartTimeout() {
    this._clearStartTimeout();
    this._startTimeout = setTimeout(() => {
      if (!this._active) {
        return;
      }
      this._active = false;
      this._stopping = false;
      this._onState({
        status: "error",
        text: "Timed out waiting for call helper. Click Start Call to retry.",
        connected: false,
      });
      this._cleanup();
    }, 120000);
  }

  _clearStartTimeout() {
    if (this._startTimeout) {
      clearTimeout(this._startTimeout);
      this._startTimeout = null;
    }
  }

  _ensureMacHelperIdentity(electronRoot) {
    return _sharedEnsureMacHelperIdentity(electronRoot);
  }

  _resolveElectronLaunch(mainScript) {
    return _sharedResolveElectronLaunch(this._helperDir, mainScript);
  }

  _appendStderrLine(textChunk) {
    const lines = textChunk
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (!lines.length) return;

    this._stderrLines.push(...lines);
    if (this._stderrLines.length > 6) {
      this._stderrLines = this._stderrLines.slice(-6);
    }
  }
}

// ── Shared electron-launch helpers ───────────────────────────────────────────
// Shared by both CallHelperManager and ChatWindowManager so the macOS identity
// setup and binary resolution logic lives in exactly one place.

function _sharedEnsureMacHelperIdentity(electronRoot) {
  const distDir = path.join(electronRoot, "dist");
  const defaultBundle = path.join(distDir, "Electron.app");
  const helperBundle = path.join(distDir, "Multiplayer Code Helper.app");

  if (!fs.existsSync(distDir)) return null;

  if (fs.existsSync(defaultBundle) && !fs.existsSync(helperBundle)) {
    try {
      fs.renameSync(defaultBundle, helperBundle);
    } catch {
      try {
        fs.cpSync(defaultBundle, helperBundle, { recursive: true });
      } catch {
        /* keep default */
      }
    }
  }

  const appBundle = fs.existsSync(helperBundle) ? helperBundle : defaultBundle;
  if (!fs.existsSync(appBundle)) return null;

  const plistPath = path.join(appBundle, "Contents", "Info.plist");
  const plistPatches = {
    CFBundleDisplayName: "Multiplayer Code Helper",
    CFBundleName: "Multiplayer Code Helper",
    CFBundleIdentifier: "com.multiplayercode.helper",
    NSCameraUsageDescription: "Multiplayer Code Helper uses your camera for video calls.",
    NSMicrophoneUsageDescription: "Multiplayer Code Helper uses your microphone for voice calls.",
  };

  if (fs.existsSync(plistPath)) {
    for (const [key, value] of Object.entries(plistPatches)) {
      spawnSync("plutil", ["-replace", key, "-string", value, plistPath], { stdio: "ignore" });
    }
    spawnSync("codesign", ["--force", "--sign", "-", appBundle], { stdio: "ignore" });
  }

  return appBundle;
}

function _sharedResolveElectronLaunch(helperDir, mainScript) {
  const electronRoot = path.join(helperDir, "node_modules", "electron");

  if (process.platform === "darwin") {
    const appBundle = _sharedEnsureMacHelperIdentity(electronRoot);
    if (appBundle && fs.existsSync(appBundle)) {
      return {
        command: "open",
        // -n forces a new instance even if one is already running (prevents
        // macOS from reusing an existing call-helper process for the chat window
        // or vice-versa, since they share the same .app bundle).
        // Intentionally avoid `-g`: windows created by background launch can
        // appear on desktop space instead of the active IDE space.
        args: ["-n", appBundle, "--args", mainScript],
        usesOpen: true,
      };
    }
  }

  const directExecutable = process.platform === "win32"
    ? path.join(electronRoot, "dist", "electron.exe")
    : path.join(electronRoot, "dist", "electron");

  if (fs.existsSync(directExecutable)) {
    return { command: directExecutable, args: [mainScript] };
  }

  const electronCli = path.join(electronRoot, "cli.js");
  if (fs.existsSync(electronCli)) {
    return { command: process.execPath, args: [electronCli, mainScript] };
  }

  return null;
}

// ── ChatWindowManager ─────────────────────────────────────────────────────────
// Manages the lifecycle of the floating native chat overlay window.
// Uses the same call-helper Electron process launched with --chat.
// ─────────────────────────────────────────────────────────────────────────────
class ChatWindowManager {
  /**
   * @param {{ helperDir: string, onSendChat: (text: string) => void,
   *           onStateChange: (open: boolean) => void, onReady: () => void }} opts
   */
  constructor({ helperDir, onSendChat, onStateChange, onReady }) {
    this._helperDir      = helperDir;
    this._onSendChat     = onSendChat;
    this._onStateChange  = onStateChange;
    this._onReady        = onReady;
    this._server         = null;
    this._socket         = null;
    this._process        = null;
    this._open           = false;
    this._shutdownPromise = null;
  }

  isOpen() { return this._open; }

  /** Forward a message to the chat window renderer. */
  forward(msg) {
    if (this._socket && this._socket.readyState === 1 /* OPEN */) {
      this._socket.send(JSON.stringify(msg));
    }
  }

  /** Open the floating chat window. Resolves when the process is spawned. */
  async open() {
    if (this._shutdownPromise) {
      await this._shutdownPromise;
    }

    if (this._open) {
      this.forward({ type: "focus-overlay-window" });
      return;
    }

    const mainScript = path.join(this._helperDir, "main.js");
    const launchSpec = _sharedResolveElectronLaunch(this._helperDir, mainScript);

    if (!fs.existsSync(mainScript) || !launchSpec) {
      vscode.window.showErrorMessage(
        "Chat helper not available. Run: cd apps/call-helper && npm install"
      );
      return;
    }

    this._open = true;

    try {
      const port = await this._getFreePort();
      const childEnv = { ...process.env };
      delete childEnv.ELECTRON_RUN_AS_NODE;

      this._server = new WebSocketServer({ host: "127.0.0.1", port });

      this._server.on("connection", (sock) => {
        this._socket = sock;
        this._onStateChange?.(true);

        sock.on("message", (data) => {
          try {
            this._handleHelperMessage(JSON.parse(data.toString()));
          } catch {
            /* ignore malformed frames */
          }
        });

        sock.on("close", () => {
          this._socket = null;
          if (this._open) {
            this._open = false;
            this._onStateChange?.(false);
            this._cleanup();
          }
        });
      });

      const extraArgs = [`--ipc-port=${port}`, "--chat", ...buildIdeAnchorArgs()];
      const spawnArgs = [...launchSpec.args, ...extraArgs];

      this._process = spawn(launchSpec.command, spawnArgs, {
        stdio: ["ignore", "pipe", "pipe"],
        env: childEnv,
      });

      this._process.on("exit", () => {
        this._process = null;
        if (launchSpec.usesOpen) return; // macOS: open exits immediately, lifecycle via WS
        if (this._open) {
          this._open = false;
          this._onStateChange?.(false);
          this._cleanup();
        }
      });

      this._process.on("error", () => {
        this._open = false;
        this._onStateChange?.(false);
        this._cleanup();
      });

    } catch (err) {
      this._open = false;
      vscode.window.showErrorMessage("Failed to open chat window: " + err.message);
      this._cleanup();
    }
  }

  /** Close the floating chat window. */
  async close() {
    if (this._shutdownPromise) return this._shutdownPromise;

    this._shutdownPromise = (async () => {
      if (!this._open && !this._socket && !this._server && !this._process) return;

      this._open = false;
      try { this.forward({ type: "close-chat-window" }); } catch { /* ignore */ }
      await new Promise((r) => setTimeout(r, 200));
      this._cleanup();
    })().finally(() => { this._shutdownPromise = null; });

    return this._shutdownPromise;
  }

  /** Release all resources (called on extension deactivate). */
  dispose() { return this.close(); }

  _handleHelperMessage(msg) {
    if (msg.type === "helper-ready") {
      if (msg.accessibilityTrusted === false) {
        warnMissingAccessibility();
      }
      this._onReady?.();
      return;
    }
    if (msg.type === "send-chat") {
      this._onSendChat?.(msg.text || "");
      return;
    }
    if (msg.type === "chat-window-closed") {
      this._open = false;
      this._onStateChange?.(false);
      this._cleanup();
      return;
    }
    if (msg.type === "anchor-debug") {
      const { source, bounds, idePid } = msg;
      const b = bounds ? `${bounds.width}x${bounds.height} @ (${bounds.x},${bounds.y})` : "?";
      vscode.window.showInformationMessage(
        `[Multiplayer anchor] source=${source} pid=${idePid} bounds=${b}`
      );
      return;
    }
  }

  async _getFreePort() {
    return new Promise((resolve, reject) => {
      const srv = net.createServer();
      srv.listen(0, "127.0.0.1", () => {
        const { port } = srv.address();
        srv.close(() => resolve(port));
      });
      srv.on("error", reject);
    });
  }

  _cleanup() {
    try { this._socket?.close(); } catch { /* ignore */ }
    try { this._server?.close(); } catch { /* ignore */ }
    this._server = null;
    this._socket = null;
    if (this._process && !this._process.killed) {
      try { this._process.kill(); } catch { /* ignore */ }
    }
    this._process = null;
  }
}

let callHelper = null;
let chatHelper = null;

const sessionUiState = {
  mode: "idle",
  status: "Ready",
  inviteOnlyMode: null,
  openInviteLink: "",
  privateInviteLink: "",
  publicJoinCode: "",
  publicJoinToken: ""
};

const docStates = new Map();
let remoteCursorType = null;

function activate(context) {
  remoteCursorType = vscode.window.createTextEditorDecorationType({
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#4fc3f7",
    borderRadius: "2px"
  });

  statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBar.text = "Multiplayer: idle";
  statusBar.show();

  sessionService = new SessionService(getWorkspaceRoot);

  // Resolve helper path from installed extension first, then local monorepo dev fallback.
  const packagedHelperDir = path.join(context.extensionPath, "call-helper");
  const devHelperDir = path.join(context.extensionPath, "..", "..", "apps", "call-helper");
  const helperDir = fs.existsSync(packagedHelperDir) ? packagedHelperDir : devHelperDir;

  // Initialise the call helper manager — the standalone process that owns mic/camera
  // permissions separately from VS Code, with its own macOS app identity.
  callHelper = new CallHelperManager({
    helperDir,
    onState: (state) => {
      sendPanelMessage(panel, { type: "call-helper-state", ...state });
    },
    onRtcSignal: (signal) => {
      // Outgoing signal from helper → relay to remote peer via session transport
      sessionService.sendRtcSignal(signal);
    },
    onSendChat: async (text) => {
      await sessionService.sendChat(text);
    },
    onChatWindowState: (open) => {
      sendPanelMessage(panel, { type: "floating-chat-state", payload: { open } });
    },
    onChatWindowReady: () => {
      callHelper.sendToHelper({ type: "focus-overlay-window", target: "chat" });
      callHelper.sendToHelper({ type: "chat-history", payload: latestChatMessages });
      callHelper.sendToHelper({ type: "participants", payload: latestParticipants });
      callHelper.sendToHelper({ type: "session-state", payload: { mode: sessionUiState.mode } });
      pushIdeWindowBoundsToHelpers();
    },
  });
  context.subscriptions.push({ dispose: () => callHelper.dispose() });

  const openFloatingChat = async () => {
    if (callHelper?.isActive()) {
      callHelper.sendToHelper({ type: "open-chat-window" });
      callHelper.sendToHelper({ type: "focus-overlay-window", target: "chat" });
      callHelper.sendToHelper({ type: "chat-history", payload: latestChatMessages });
      callHelper.sendToHelper({ type: "participants", payload: latestParticipants });
      callHelper.sendToHelper({ type: "session-state", payload: { mode: sessionUiState.mode } });
      pushIdeWindowBoundsToHelpers();
      sendPanelMessage(panel, { type: "floating-chat-state", payload: { open: true } });
      return;
    }

    await chatHelper.open();
    chatHelper.forward({ type: "focus-overlay-window" });
    pushIdeWindowBoundsToHelpers();
  };

  const closeFloatingChat = async () => {
    if (callHelper?.isActive()) {
      callHelper.sendToHelper({ type: "close-chat-window" });
      sendPanelMessage(panel, { type: "floating-chat-state", payload: { open: false } });
      return;
    }

    await chatHelper.close();
  };

  chatHelper = new ChatWindowManager({
    helperDir,
    onSendChat: async (text) => {
      await sessionService.sendChat(text);
    },
    onStateChange: (open) => {
      sendPanelMessage(panel, { type: "floating-chat-state", payload: { open } });
    },
    onReady: () => {
      chatHelper.forward({ type: "focus-overlay-window" });
      chatHelper.forward({ type: "chat-history", payload: latestChatMessages });
      chatHelper.forward({ type: "session-state", payload: { mode: sessionUiState.mode } });
      pushIdeWindowBoundsToHelpers();
    },
  });
  context.subscriptions.push({ dispose: () => chatHelper.dispose() });

  // Forward VS Code window focus changes to the helper so it can trigger a
  // space-sync immediately — faster than waiting for the Python poller to
  // notice bounds changes during a fullscreen/Space transition.
  context.subscriptions.push(
    vscode.window.onDidChangeWindowState((state) => {
      callHelper.sendToHelper({ type: "ide-focus-change", focused: state.focused });
      chatHelper.forward({ type: "ide-focus-change", focused: state.focused });
      pushIdeWindowBoundsToHelpers();
    })
  );

  panel = new MultiplayerViewProvider({
    onSendChat: async (text) => {
      await sessionService.sendChat(text);
    },
    onRtcSignal: () => {
      // Panel no longer handles WebRTC — signals flow through the call helper
    },
    onStartCall: async () => {
      await callHelper.startCall();
      callHelper.sendToHelper({ type: "focus-overlay-window" });
      pushIdeWindowBoundsToHelpers();
    },
    onEndCall: () => {
      callHelper.stopCall();
    },
    onCallMute: (audio) => {
      callHelper.sendToHelper({ type: "mute", audio });
    },
    onCallVideo: (enabled) => {
      callHelper.sendToHelper({ type: "video", enabled });
    },
    onHostSession: async ({ name, port, inviteOnly } = {}) => {
      await hostFromPanel({ name, port, inviteOnly });
      openPanel();
    },
    onJoinSession: async ({ name, inviteText } = {}) => {
      await joinFromPanel({ name, inviteText });
      openPanel();
    },
    onEndSession: async () => {
      await endCurrentSession();
    },
    onApproveJoin: async (requestId) => {
      await sessionService.decideJoinRequest({ requestId, accepted: true });
    },
    onRejectJoin: async (requestId) => {
      await sessionService.decideJoinRequest({ requestId, accepted: false });
    },
    onOpenChatTab: () => {
      openFloatingChat();
    },
    onOpenBrowserTab: (initialView) => {
      openBrowserTab(initialView);
    },
    onOpenFloatingChat: async () => {
      await openFloatingChat();
    },
    onCloseFloatingChat: async () => {
      await closeFloatingChat();
    },
    onCopyInvite: async (kind) => {
      const invite = kind === "open"
        ? sessionUiState.openInviteLink
        : kind === "public-code"
          ? sessionUiState.publicJoinCode
          : kind === "public-token"
            ? sessionUiState.publicJoinToken
            : sessionUiState.privateInviteLink;

      if (!invite) {
        vscode.window.showWarningMessage("No invite link available yet");
        return;
      }

      await vscode.env.clipboard.writeText(invite);
      const label = kind === "open"
        ? "Open invite link"
        : kind === "public-code"
          ? "Public join code"
          : kind === "public-token"
            ? "Public quick-join token"
            : "Private invite link";
      vscode.window.showInformationMessage(`${label} copied`);
    },
    onPanelReady: async () => {
      pushSessionStateToPanel();
      sendPanelMessage(panel, { type: "participants", payload: latestParticipants });
      await refreshChatHistory();
    }
  });

  context.subscriptions.push(
    statusBar,
    vscode.window.registerWebviewViewProvider("multiplayer.sidePanel", panel, {
      webviewOptions: { retainContextWhenHidden: true }
    })
  );

  if (remoteCursorType) {
    context.subscriptions.push(remoteCursorType);
  }

  sessionService.on("status", (entry) => {
    setStatus(entry.message);
    sessionUiState.status = entry.message;
    pushSessionStateToPanel();
    sendPanelMessage(panel, { type: "status", payload: entry.message });
  });

  sessionService.on("join-request", async (request) => {
    // Push inline approval card to all panel surfaces
    sendPanelMessage(panel, {
      type: "join-request",
      payload: { requestId: request.requestId, displayName: request.displayName }
    });

    // Also show a VS Code notification so it's visible even if panel is hidden
    const choice = await vscode.window.showInformationMessage(
      `${request.displayName} wants to join your session`,
      "Approve",
      "Reject"
    );

    if (choice) {
      await sessionService.decideJoinRequest({
        requestId: request.requestId,
        accepted: choice === "Approve"
      });
    }
  });

  sessionService.on("join-rejected", (reason) => {
    sessionUiState.mode = "idle";
    sessionUiState.status = "Join rejected";
    sessionUiState.openInviteLink = "";
    sessionUiState.privateInviteLink = "";
    pushSessionStateToPanel();
    vscode.window.showErrorMessage(reason || "Join rejected");
  });

  sessionService.on("join-accepted", async (workspacePath) => {
    sessionUiState.mode = "guest";
    pushSessionStateToPanel();
    if (workspacePath) {
      const uri = vscode.Uri.file(workspacePath);
      await vscode.commands.executeCommand("vscode.openFolder", uri, false);
    }
    vscode.window.showInformationMessage("Multiplayer session connected");
  });

  sessionService.on("participants", (participants) => {
    latestParticipants = participants;
    sendPanelMessage(panel, { type: "participants", payload: participants });
    callHelper?.sendToHelper({ type: "participants", payload: participants });
  });

  sessionService.on("chat-message", (message) => {
    latestChatMessages.push(message);
    if (latestChatMessages.length > 300) {
      latestChatMessages = latestChatMessages.slice(-300);
    }

    sendPanelMessage(panel, { type: "chat-message", payload: message });
    chatHelper?.forward({ type: "chat-message", payload: message });
    callHelper?.sendToHelper({ type: "chat-message", payload: message });
  });

  sessionService.on("rtc-signal", (message) => {
    // Incoming signal from remote peer is handled only by the standalone helper.
    // Never route RTC into the VS Code webview — this prevents VS Code-level
    // camera/mic permission prompts.
    if (callHelper?.isActive()) {
      callHelper.sendToHelper({ type: "rtc-signal", signal: message.signal });
    }
  });

  sessionService.on("sync-message", async (message) => {
    await applySyncMessage(message);
  });

  context.subscriptions.push(
    vscode.commands.registerCommand("multiplayer.easyStart", async () => {
      const action = await vscode.window.showQuickPick(
        [
          { label: "Host New Session", value: "host" },
          { label: "Join Session", value: "join" },
          { label: "Open Multiplayer Panel", value: "panel" }
        ],
        { placeHolder: "Start multiplayer collaboration" }
      );

      if (!action) {
        return;
      }

      if (action.value === "host") {
        await hostFromPrompt();
      } else if (action.value === "join") {
        await joinFromPrompt();
      } else {
        openPanel();
      }
    }),
    vscode.commands.registerCommand("multiplayer.hostSession", hostFromPrompt),
    vscode.commands.registerCommand("multiplayer.joinSession", joinFromPrompt),
    vscode.commands.registerCommand("multiplayer.openPanel", () => openPanel()),
    vscode.commands.registerCommand("multiplayer.openWorkspaceTab", () => openBrowserTab("session")),
    vscode.commands.registerCommand("multiplayer.openChatTab", () => openFloatingChat()),
    vscode.commands.registerCommand("multiplayer.endSession", endCurrentSession),
    vscode.commands.registerCommand("multiplayer.toggleInviteOnly", async () => {
      const enabled = await vscode.window.showQuickPick(
        [
          { label: "Invite-Only On", value: true },
          { label: "Invite-Only Off", value: false }
        ],
        { placeHolder: "Set invite policy for the next host session" }
      );

      if (!enabled) {
        return;
      }

      await context.workspaceState.update("multiplayer.inviteOnly", enabled.value);
      vscode.window.showInformationMessage(`Invite-only set to ${enabled.value ? "ON" : "OFF"}`);
    }),
    vscode.workspace.onDidChangeTextDocument(onDidChangeTextDocument),
    vscode.window.onDidChangeTextEditorSelection(onDidChangeSelection),
    vscode.workspace.onDidOpenTextDocument(onDidOpenDocument)
  );

  setStatus("Ready");
}

async function hostFromPanel({ name, port, inviteOnly } = {}) {
  const displayName = name || (await askDisplayName());
  if (!displayName) { return; }

  sessionService.setDisplayName(displayName);

  const inviteOnlyMode = inviteOnly !== undefined
    ? Boolean(inviteOnly)
    : Boolean(vscode.workspace.getConfiguration("multiplayer").get("inviteOnlyDefault", true));

  const result = await sessionService.hostSession({
    port: Number(port) || 3700,
    inviteOnlyMode
  });

  sessionUiState.mode = "host";
  sessionUiState.inviteOnlyMode = result.inviteOnlyMode;
  sessionUiState.openInviteLink = result.openInviteLink;
  sessionUiState.privateInviteLink = result.privateInviteLink;
  sessionUiState.publicJoinCode = result.publicJoinCode || "";
  sessionUiState.publicJoinToken = result.publicJoinToken || "";
  pushSessionStateToPanel();

  await vscode.env.clipboard.writeText(result.privateInviteLink);
  vscode.window.showInformationMessage(
    `Hosting started on port ${Number(port) || 3700}. Private invite copied.`
  );
}

async function joinFromPanel({ name, inviteText } = {}) {
  if (!inviteText) { return; }

  const displayName = name || (await askDisplayName());
  if (!displayName) { return; }

  sessionService.setDisplayName(displayName);
  await sessionService.joinSession({ inviteText, cloneIfMissing: true });

  sessionUiState.mode = "guest";
  sessionUiState.openInviteLink = "";
  sessionUiState.privateInviteLink = "";
  sessionUiState.publicJoinCode = "";
  sessionUiState.publicJoinToken = "";
  pushSessionStateToPanel();
}

async function hostFromPrompt() {
  const portInput = await vscode.window.showInputBox({
    prompt: "Host port",
    value: "3700"
  });

  if (!portInput) {
    return;
  }

  const displayName = await askDisplayName();
  sessionService.setDisplayName(displayName);

  const inviteOnlyMode = Boolean(
    vscode.workspace.getConfiguration("multiplayer").get("inviteOnlyDefault", true)
  );

  const result = await sessionService.hostSession({
    port: Number(portInput) || 3700,
    inviteOnlyMode
  });

  sessionUiState.mode = "host";
  sessionUiState.inviteOnlyMode = result.inviteOnlyMode;
  sessionUiState.openInviteLink = result.openInviteLink;
  sessionUiState.privateInviteLink = result.privateInviteLink;
  sessionUiState.publicJoinCode = result.publicJoinCode || "";
  sessionUiState.publicJoinToken = result.publicJoinToken || "";
  pushSessionStateToPanel();

  await vscode.env.clipboard.writeText(result.privateInviteLink);

  const copyChoice = await vscode.window.showInformationMessage(
    `Hosting started. Private invite copied to clipboard. Invite-only: ${result.inviteOnlyMode ? "ON" : "OFF"}`,
    "Copy Open Invite",
    "Open Panel"
  );

  if (copyChoice === "Copy Open Invite") {
    await vscode.env.clipboard.writeText(result.openInviteLink);
  }

  if (copyChoice === "Open Panel") {
    openPanel();
  }
}

async function joinFromPrompt() {
  const inviteText = await vscode.window.showInputBox({
    prompt: "Paste invite link or code"
  });

  if (!inviteText) {
    return;
  }

  const displayName = await askDisplayName();
  sessionService.setDisplayName(displayName);
  await sessionService.joinSession({ inviteText, cloneIfMissing: true });

  sessionUiState.mode = "guest";
  sessionUiState.openInviteLink = "";
  sessionUiState.privateInviteLink = "";
  sessionUiState.publicJoinCode = "";
  sessionUiState.publicJoinToken = "";
  pushSessionStateToPanel();
}

async function endCurrentSession() {
  await sessionService.endSession();
  latestParticipants = [];
  latestChatMessages = [];
  sessionUiState.mode = "idle";
  sessionUiState.status = "Session stopped";
  sessionUiState.inviteOnlyMode = null;
  sessionUiState.openInviteLink = "";
  sessionUiState.privateInviteLink = "";
  sessionUiState.publicJoinCode = "";
  sessionUiState.publicJoinToken = "";
  pushSessionStateToPanel();
  setStatus("Session stopped");
}

async function askDisplayName() {
  const name = await vscode.window.showInputBox({
    prompt: "Display name",
    value: vscode.env.machineId.slice(0, 8)
  });

  return name || "Anonymous";
}

function openPanel() {
  vscode.commands.executeCommand("multiplayer.sidePanel.focus");
}

function openBrowserTab(initialView = "session") {
  // remap legacy view name so the editor tab respects the renamed tab
  const viewMap = { invites: "session", overview: "session" };
  const view = viewMap[initialView] || initialView;
  panel.openEditorPanel({
    initialView: view,
    title: "Multiplayer"
  });
}

function openChatPopout() {
  panel.openChatPopoutPanel();
}

async function refreshChatHistory() {
  latestChatMessages = await sessionService.getRecentChatMessages(250);
  sendPanelMessage(panel, { type: "chat-history", payload: latestChatMessages });
}

function onDidOpenDocument(document) {
  if (document.uri.scheme !== "file") {
    return;
  }

  if (!isInWorkspace(document.uri.fsPath)) {
    return;
  }

  const relativePath = toRelativePath(document.uri.fsPath);
  if (!relativePath) {
    return;
  }

  ensureDocState(relativePath, document.getText());
  sessionService.sendSyncMessage({
    type: EVENTS.FILE_OPEN,
    relativePath,
    content: document.getText()
  });
}

function onDidChangeSelection(event) {
  if (!event?.textEditor?.document || event.textEditor.document.uri.scheme !== "file") {
    return;
  }

  const relativePath = toRelativePath(event.textEditor.document.uri.fsPath);
  if (!relativePath || !event.selections?.length) {
    return;
  }

  const selection = event.selections[0];
  sessionService.sendSyncMessage({
    type: EVENTS.CURSOR_UPDATE,
    relativePath,
    user: vscode.env.machineId,
    active: {
      line: selection.active.line,
      character: selection.active.character
    }
  });
}

function onDidChangeTextDocument(event) {
  if (suppressChanges || event.document.uri.scheme !== "file") {
    return;
  }

  const relativePath = toRelativePath(event.document.uri.fsPath);
  if (!relativePath) {
    return;
  }

  const state = ensureDocState(relativePath, event.document.getText());
  state.text.delete(0, state.text.length);
  state.text.insert(0, event.document.getText());

  const update = Y.encodeStateAsUpdate(state.doc);
  sessionService.sendSyncMessage({
    type: EVENTS.YJS_UPDATE,
    relativePath,
    update: Buffer.from(update).toString("base64")
  });
}

async function applySyncMessage(message) {
  if (message.type === EVENTS.FILE_OPEN) {
    await applyRemoteFileOpen(message);
    return;
  }

  if (message.type === EVENTS.YJS_UPDATE) {
    await applyRemoteYjsUpdate(message);
    return;
  }

  if (message.type === EVENTS.CURSOR_UPDATE) {
    await renderRemoteCursor(message);
  }
}

async function applyRemoteFileOpen(message) {
  const root = getWorkspaceRoot();
  if (!root || !message.relativePath) {
    return;
  }

  const target = path.join(root, message.relativePath);
  const uri = vscode.Uri.file(target);

  try {
    const document = await vscode.workspace.openTextDocument(uri);
    const editor = await vscode.window.showTextDocument(document, { preview: false, preserveFocus: true });

    if (typeof message.content === "string" && document.getText() !== message.content) {
      await replaceEntireDocument(editor, message.content);
    }

    ensureDocState(message.relativePath, message.content || document.getText());
  } catch {
    await vscode.workspace.fs.writeFile(uri, new TextEncoder().encode(message.content || ""));
    const document = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(document, { preview: false, preserveFocus: true });
    ensureDocState(message.relativePath, message.content || "");
  }
}

async function applyRemoteYjsUpdate(message) {
  if (!message.relativePath || !message.update) {
    return;
  }

  const root = getWorkspaceRoot();
  if (!root) {
    return;
  }

  const uri = vscode.Uri.file(path.join(root, message.relativePath));

  let document;
  try {
    document = await vscode.workspace.openTextDocument(uri);
  } catch {
    await vscode.workspace.fs.writeFile(uri, new TextEncoder().encode(""));
    document = await vscode.workspace.openTextDocument(uri);
  }

  const state = ensureDocState(message.relativePath, document.getText());
  Y.applyUpdate(state.doc, Buffer.from(message.update, "base64"), "remote");
  const merged = state.text.toString();

  if (document.getText() === merged) {
    return;
  }

  const editor = await vscode.window.showTextDocument(document, { preview: false, preserveFocus: true });
  await replaceEntireDocument(editor, merged);
}

async function renderRemoteCursor(message) {
  if (!message.relativePath || !message.active) {
    return;
  }

  const root = getWorkspaceRoot();
  if (!root) {
    return;
  }

  const uri = vscode.Uri.file(path.join(root, message.relativePath));
  const editor = vscode.window.visibleTextEditors.find((item) => item.document.uri.fsPath === uri.fsPath);
  if (!editor) {
    return;
  }

  const position = new vscode.Position(message.active.line || 0, message.active.character || 0);
  if (remoteCursorType) {
    editor.setDecorations(remoteCursorType, [new vscode.Range(position, position)]);
  }
}

async function replaceEntireDocument(editor, text) {
  suppressChanges = true;

  try {
    const document = editor.document;
    const end = document.lineCount > 0
      ? document.lineAt(document.lineCount - 1).range.end
      : new vscode.Position(0, 0);

    await editor.edit((editBuilder) => {
      editBuilder.replace(new vscode.Range(new vscode.Position(0, 0), end), text);
    });
  } finally {
    suppressChanges = false;
  }
}

function ensureDocState(relativePath, initialText) {
  const existing = docStates.get(relativePath);
  if (existing) {
    return existing;
  }

  const doc = new Y.Doc();
  const text = doc.getText("content");
  text.insert(0, initialText || "");

  const state = { doc, text };
  docStates.set(relativePath, state);
  return state;
}

function getWorkspaceRoot() {
  return vscode.workspace.workspaceFolders?.[0]?.uri?.fsPath || null;
}

function toRelativePath(absPath) {
  const root = getWorkspaceRoot();
  if (!root || !absPath.startsWith(root)) {
    return null;
  }

  return path.relative(root, absPath);
}

function isInWorkspace(absPath) {
  const root = getWorkspaceRoot();
  return Boolean(root && absPath.startsWith(root));
}

function setStatus(message) {
  if (statusBar) {
    statusBar.text = `Multiplayer: ${message}`;
  }
}

function pushSessionStateToPanel() {
  sendPanelMessage(panel, { type: "session-state", payload: { ...sessionUiState } });
  chatHelper?.forward({ type: "session-state", payload: { mode: sessionUiState.mode } });
  callHelper?.sendToHelper({ type: "session-state", payload: { mode: sessionUiState.mode } });
}

function pushIdeWindowBoundsToHelpers() {
  const payload = buildIdeWindowBoundsPayload();
  if (!payload) {
    return;
  }

  callHelper?.sendToHelper(payload);
  chatHelper?.forward(payload);
}

async function deactivate() {
  if (sessionService) {
    await sessionService.endSession();
  }
}

module.exports = {
  activate,
  deactivate
};
