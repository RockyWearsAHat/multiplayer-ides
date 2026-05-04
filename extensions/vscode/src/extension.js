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

// ── CallHelperManager ─────────────────────────────────────────────────────────
// Manages the lifecycle of the standalone companion helper process that handles
// camera/microphone access with its own macOS app identity.
//
// Privacy guarantee: all media access flows through the helper — the user sees
// a real OS-level permission dialog for "Multiplayer Code Helper", not VS Code.
// ─────────────────────────────────────────────────────────────────────────────
class CallHelperManager {
  constructor({ helperDir, onState, onRtcSignal }) {
    this._helperDir    = helperDir;
    this._onState      = onState;
    this._onRtcSignal  = onRtcSignal;
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
        [...launchSpec.args, `--ipc-port=${port}`],
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
        // Helper connected — tell it to start the call immediately
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
      case "call-ended":
        this._clearStartTimeout();
        this._active = false;
        this._onState({ status: "ended", text: "Idle", connected: false });
        this._cleanup();
        break;
      case "rtc-signal":
        this._onRtcSignal(msg.signal);
        break;
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
    const distDir = path.join(electronRoot, "dist");
    const defaultBundle = path.join(distDir, "Electron.app");
    const helperBundle = path.join(distDir, "Multiplayer Code Helper.app");

    if (!fs.existsSync(distDir)) {
      return null;
    }

    // Ensure both packaged and dev helper paths present a stable helper name.
    if (fs.existsSync(defaultBundle) && !fs.existsSync(helperBundle)) {
      try {
        fs.renameSync(defaultBundle, helperBundle);
      } catch {
        // Fallback: copy when rename is blocked by filesystem semantics.
        try {
          fs.cpSync(defaultBundle, helperBundle, { recursive: true });
        } catch {
          // Keep default bundle path as last resort.
        }
      }
    }

    const appBundle = fs.existsSync(helperBundle) ? helperBundle : defaultBundle;
    if (!fs.existsSync(appBundle)) {
      return null;
    }

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

      // Re-sign after mutating Info.plist so LaunchServices/TCC sees a valid app.
      spawnSync("codesign", ["--force", "--sign", "-", appBundle], {
        stdio: "ignore"
      });
    }

    return appBundle;
  }

  _resolveElectronLaunch(mainScript) {
    const electronRoot = path.join(this._helperDir, "node_modules", "electron");

    if (process.platform === "darwin") {
      const appBundle = this._ensureMacHelperIdentity(electronRoot);

      // On macOS we MUST launch via `open -a` so LaunchServices owns the process
      // launch.  When spawned directly as a child of the VS Code extension host,
      // macOS TCC attributes camera/mic requests to the responsible parent process
      // (VS Code Insiders) rather than to our helper's bundle identity, regardless
      // of what bundle ID is in Info.plist.  Launching through `open` makes macOS
      // treat the helper as a user-initiated process with its own TCC identity so
      // the permission dialog reads "Multiplayer Code Helper would like to access
      // your camera" instead of attributing it to VS Code.
      if (appBundle && fs.existsSync(appBundle)) {
        return {
          command: "open",
          // -g         — launch in background (avoid focus/Space jump)
          // <app path> — explicit bundle path, avoids name-based resolution
          // --args     — everything after this is forwarded to the app as argv
          args: ["-g", appBundle, "--args", mainScript],
          usesOpen: true,
        };
      }
    }

    // Linux / Windows — spawn the binary directly
    const directExecutable = process.platform === "win32"
      ? path.join(electronRoot, "dist", "electron.exe")
      : path.join(electronRoot, "dist", "electron");

    if (fs.existsSync(directExecutable)) {
      return {
        command: directExecutable,
        args: [mainScript],
      };
    }

    const electronCli = path.join(electronRoot, "cli.js");
    if (fs.existsSync(electronCli)) {
      return {
        command: process.execPath,
        args: [electronCli, mainScript],
      };
    }

    return null;
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

let callHelper = null;

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
  });
  context.subscriptions.push({ dispose: () => callHelper.dispose() });

  panel = new MultiplayerViewProvider({
    onSendChat: async (text) => {
      await sessionService.sendChat(text);
    },
    onRtcSignal: () => {
      // Panel no longer handles WebRTC — signals flow through the call helper
    },
    onStartCall: async () => {
      await callHelper.startCall();
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
      openChatPopout();
    },
    onOpenBrowserTab: (initialView) => {
      openBrowserTab(initialView);
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
  });

  sessionService.on("chat-message", (message) => {
    latestChatMessages.push(message);
    if (latestChatMessages.length > 300) {
      latestChatMessages = latestChatMessages.slice(-300);
    }

    sendPanelMessage(panel, { type: "chat-message", payload: message });
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
    vscode.commands.registerCommand("multiplayer.openChatTab", () => openChatPopout()),
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
