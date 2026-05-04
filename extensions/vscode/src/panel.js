const path = require("node:path");
const vscode = require("vscode");

class MultiplayerViewProvider {
  constructor(handlers) {
    this._handlers = handlers;
    this._sidebarView = null;
    this._surfaces = new Map();
    this._nextSurfaceId = 1;
    this._chatPopoutPanel = null;
    this._chatPopoutSurfaceId = null;
  }

  resolveWebviewView(webviewView) {
    try {
      this._sidebarView = webviewView;
      this._attachSurface({
        surfaceId: "sidebar",
        webview: webviewView.webview,
        initialView: "session",
        surfaceKind: "sidebar"
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`Multiplayer panel failed to load: ${message}`);
      webviewView.webview.html = getErrorWebviewHtml(message);
    }
  }

  openEditorPanel({ initialView = "session", title } = {}) {
    const panel = vscode.window.createWebviewPanel(
      "multiplayer.editorPanel",
      title || "Multiplayer Workspace",
      vscode.ViewColumn.Active,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );

    panel.iconPath = getPanelIconPath();

    const surfaceId = `editor-${this._nextSurfaceId++}`;
    this._attachSurface({
      surfaceId,
      webview: panel.webview,
      initialView,
      surfaceKind: "editor"
    });

    panel.onDidDispose(() => {
      this._surfaces.delete(surfaceId);
    });

    return panel;
  }

  openChatPopoutPanel() {
    if (this._chatPopoutPanel) {
      this._chatPopoutPanel.reveal(vscode.ViewColumn.Active, true);
      return this._chatPopoutPanel;
    }

    const panel = vscode.window.createWebviewPanel(
      "multiplayer.chatPanel",
      "Multiplayer Chat",
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );

    panel.iconPath = getPanelIconPath();

    const surfaceId = `chat-popout-${this._nextSurfaceId++}`;
    this._chatPopoutPanel = panel;
    this._chatPopoutSurfaceId = surfaceId;

    this._attachSurface({
      surfaceId,
      webview: panel.webview,
      initialView: "chat",
      surfaceKind: "chat-popout"
    });

    panel.onDidDispose(() => {
      this._surfaces.delete(surfaceId);
      if (this._chatPopoutSurfaceId === surfaceId) {
        this._chatPopoutPanel = null;
        this._chatPopoutSurfaceId = null;
        this._broadcastChatPopoutState();
      }
    });

    this._broadcastChatPopoutState();
    return panel;
  }

  focusChatPopoutPanel() {
    if (!this._chatPopoutPanel) {
      this.openChatPopoutPanel();
      return;
    }

    this._chatPopoutPanel.reveal(vscode.ViewColumn.Active, true);
  }

  dockChatPopoutPanel() {
    if (!this._chatPopoutPanel) {
      this.reveal();
      this.sendMessage({ type: "switch-view", payload: "chat" });
      return;
    }

    this._chatPopoutPanel.dispose();
    this.reveal();
    this.sendMessage({ type: "switch-view", payload: "chat" });
  }

  sendMessage(payload) {
    for (const webview of this._surfaces.values()) {
      webview.postMessage(payload);
    }
  }

  reveal() {
    this._sidebarView?.show(true);
  }

  _broadcastChatPopoutState() {
    this.sendMessage({
      type: "chat-popout-state",
      payload: { open: Boolean(this._chatPopoutPanel) }
    });
  }

  _attachSurface({ surfaceId, webview, initialView, surfaceKind = "editor" }) {
    webview.options = { enableScripts: true, localResourceRoots: [vscode.Uri.file(path.join(__dirname))] };
    webview.html = getWebviewHtml({ initialView, surfaceKind, webview });

    this._surfaces.set(surfaceId, webview);

    webview.onDidReceiveMessage(async (message) => {
      if (!message?.type) {
        return;
      }

      if (message.type === "host-session") {
        await this._handlers.onHostSession({ name: message.name, port: message.port, inviteOnly: message.inviteOnly });
        return;
      }

      if (message.type === "join-session") {
        await this._handlers.onJoinSession({ name: message.name, inviteText: message.inviteText });
        return;
      }

      if (message.type === "end-session") {
        await this._handlers.onEndSession();
        return;
      }

      if (message.type === "copy-invite") {
        await this._handlers.onCopyInvite(message.kind || "private");
        return;
      }

      if (message.type === "send-chat") {
        await this._handlers.onSendChat(message.text || "");
        return;
      }

      if (message.type === "rtc-signal") {
        this._handlers.onRtcSignal(message.signal);
        return;
      }

      if (message.type === "start-call") {
        await this._handlers.onStartCall?.();
        return;
      }

      if (message.type === "end-call") {
        this._handlers.onEndCall?.();
        return;
      }

      if (message.type === "call-mute") {
        this._handlers.onCallMute?.(Boolean(message.audio));
        return;
      }

      if (message.type === "call-video") {
        this._handlers.onCallVideo?.(Boolean(message.enabled));
        return;
      }

      if (message.type === "open-chat-popout") {
        this.openChatPopoutPanel();
        return;
      }

      if (message.type === "focus-chat-popout") {
        this.focusChatPopoutPanel();
        return;
      }

      if (message.type === "dock-chat-popout") {
        this.dockChatPopoutPanel();
        return;
      }

      if (message.type === "open-browser-tab") {
        this._handlers.onOpenBrowserTab(message.view || "session");
        return;
      }

      if (message.type === "approve-join") {
        await this._handlers.onApproveJoin(message.requestId);
        return;
      }

      if (message.type === "reject-join") {
        await this._handlers.onRejectJoin(message.requestId);
        return;
      }

      if (message.type === "open-privacy-settings") {
        vscode.env.openExternal(vscode.Uri.parse("x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone"));
        return;
      }

      if (message.type === "panel-ready") {
        await this._handlers.onPanelReady(surfaceId);
        this._broadcastChatPopoutState();
      }
    });
  }
}

function getPanelIconPath() {
  const dark = vscode.Uri.file(path.join(__dirname, "..", "media", "icon-people-centered-white.svg"));
  const light = vscode.Uri.file(path.join(__dirname, "..", "media", "icon-people-centered.svg"));
  return { dark, light };
}

function sendPanelMessage(provider, payload) {
  provider?.sendMessage(payload);
}

function getErrorWebviewHtml(message) {
  return `<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      body {
        margin: 0;
        padding: 12px;
        font-family: var(--vscode-font-family);
        color: var(--vscode-foreground);
        background: var(--vscode-sideBar-background);
      }

      .error-card {
        border-radius: 8px;
        border: 1px solid color-mix(in srgb, var(--vscode-errorForeground) 30%, transparent);
        background: color-mix(in srgb, var(--vscode-errorForeground) 10%, transparent);
        padding: 12px;
      }
      /* ─── Scrollable content area ─── */
      .scroll-area {
        scrollbar-width: thin;
        scrollbar-color: var(--vscode-scrollbarSlider-background) transparent;
      }
    </style>
  </head>
  <body>
    <section class="error-card">
      <strong>Multiplayer Panel Failed To Load</strong>
      <p>${escapeHtml(message)}</p>
    </section>
  </body>
</html>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getWebviewHtml({ initialView = "session", surfaceKind = "editor", webview } = {}) {
  const initialViewMap = {
    overview: "session",
    invites: "session"
  };
  const mappedInitialView = initialViewMap[initialView] || initialView;
  const safeInitialView = ["session", "chat", "call"].includes(mappedInitialView)
    ? mappedInitialView
    : "session";
  const isChatPopout = surfaceKind === "chat-popout";
  const surfaceClass = isChatPopout ? "chat-popout" : "standard-surface";

  const styleHref = webview
    ? webview.asWebviewUri(vscode.Uri.file(path.join(__dirname, "panel.css")))
    : "";

  return `<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    ${styleHref ? `<link rel="stylesheet" href="${styleHref}" />` : ""}
  </head>
  <body class="${surfaceClass}">

    <!-- Tab bar styled like VS Code panel tabs -->
    <nav class="toolbar" role="tablist" aria-label="Multiplayer views">
      <button id="tab-session" class="tab active" type="button" data-tab="session" role="tab" aria-selected="true" aria-controls="view-session">Session</button>
      <button id="tab-chat" class="tab" type="button" data-tab="chat" role="tab" aria-selected="false" aria-controls="view-chat">
        Chat
        <span id="chatBadge" class="tab-badge" aria-label="unread messages"></span>
      </button>
      <button id="tab-call" class="tab" type="button" data-tab="call" role="tab" aria-selected="false" aria-controls="view-call">Call</button>
    </nav>

    <!-- Persistent session status strip (like VS Code status bar, but inline) -->
    <div class="session-bar" id="sessionBar">
      <span class="conn-dot" id="connDot"></span>
      <span class="session-label" id="sessionLabel"><span class="dim">No active session</span></span>
      <span class="mode-badge" id="modeBadge">Idle</span>
    </div>

    <!-- ── SESSION ─────────────────────────────────────────────── -->
    <div class="view active scroll-area" data-view="session" id="view-session">
      <div class="section">
        <div class="section-head">
          <span class="section-title">Session</span>
        </div>
        <!-- When idle: show Host / Join toggle buttons -->
        <div class="row" id="idleActions">
          <button id="showHostForm" class="primary flex-1">Host</button>
          <button id="showJoinForm" class="secondary flex-1">Join…</button>
          <button id="endSession" class="danger" disabled>End</button>
        </div>
        <!-- When live: End session only -->
        <div class="row" id="liveActions" style="display:none">
          <button id="endSessionLive" class="danger flex-1">End Session</button>
        </div>
        <p class="hint mt6" id="sessionHint" style="padding:0; font-size:11px; color:var(--vscode-descriptionForeground)">
          Host to start a session, or paste an invite to join.
        </p>
      </div>

      <!-- Inline Host Form -->
      <div class="inline-form" id="hostForm">
        <span class="form-title">Host a Session</span>
        <div>
          <label class="field-label" for="hostName">Your display name</label>
          <input id="hostName" type="text" placeholder="e.g. Alex" autocomplete="off" />
        </div>
        <div class="form-row">
          <div>
            <label class="field-label" for="hostPort">Port</label>
            <input id="hostPort" type="number" value="3700" min="1024" max="65535" />
          </div>
          <div style="display:flex; flex-direction:column; justify-content:flex-end;">
            <label class="toggle-row">
              <input type="checkbox" id="hostInviteOnly" checked />
              Invite-only
            </label>
          </div>
        </div>
        <div class="form-actions">
          <button id="hostSubmit" class="primary flex-1">Start Hosting</button>
          <button id="hostCancel" class="secondary">Cancel</button>
        </div>
      </div>

      <!-- Inline Join Form -->
      <div class="inline-form" id="joinForm">
        <span class="form-title">Join a Session</span>
        <div>
          <label class="field-label" for="joinName">Your display name</label>
          <input id="joinName" type="text" placeholder="e.g. Alex" autocomplete="off" />
        </div>
        <div>
          <label class="field-label" for="joinInvite">Invite link, token, or 6-digit code</label>
          <input id="joinInvite" type="text" placeholder="Paste invite, or type host:port#123456" autocomplete="off" />
        </div>
        <div class="form-actions">
          <button id="joinSubmit" class="primary flex-1">Join</button>
          <button id="joinCancel" class="secondary">Cancel</button>
        </div>
      </div>

      <!-- Inline join-request approvals rendered here -->
      <div id="approvals"></div>

      <div class="divider mt8"></div>

      <div class="section mt8">
        <div class="section-head">
          <span class="section-title">Participants</span>
          <span id="participantCount" style="font-size:11px; color:var(--vscode-descriptionForeground)">0</span>
        </div>
        <div id="participants">
          <div class="empty" style="padding:10px 0; text-align:left">
            <span style="color:var(--vscode-descriptionForeground); font-size:12px">No participants yet.</span>
          </div>
        </div>
      </div>

      <div class="section" id="inviteSection">
        <div class="section-head">
          <span class="section-title">Invites</span>
          <span id="invitePolicy" style="font-size:10px; color:var(--vscode-descriptionForeground)">Policy: n/a</span>
        </div>

        <div class="invite-card" id="privateInviteCard">
          <div class="invite-card-title">Private invite</div>
          <div class="invite-card-sub">Link stays hidden. Copy only when you are ready to share.</div>
          <div class="row mt6">
            <button id="copyPrivateInvite" class="primary">Copy Private Invite</button>
          </div>
        </div>

        <div class="invite-card mt8" id="publicInviteCard">
          <div class="invite-card-title">Public join code</div>
          <div class="invite-card-sub">Easy to type. Anyone with this code can request access.</div>
          <div class="code-display mt6">
            <span id="publicJoinCode" class="code-pill">------</span>
          </div>
          <div class="invite-actions mt6">
            <button id="copyPublicCode" class="secondary flex-1">Copy Code</button>
            <button id="copyPublicToken" class="secondary flex-1" title="Copy host:port#code">Copy Token</button>
          </div>
          <div class="link-row mt6">
            <button id="toggleOpenInviteLink" class="icon-btn" title="Show or hide public invite link">Show Link</button>
            <input id="openInviteLink" class="link-input" readonly placeholder="Public link hidden" style="display:none" />
            <button id="copyOpenInvite" class="icon-btn" title="Copy public invite link" style="display:none">&#x2398;</button>
          </div>
        </div>

        <div class="hint mt6" style="padding:0;">
          Join accepts full invite links, encoded invite codes, or quick token format: <strong>host:port#123456</strong>.
        </div>
      </div>

      <div class="divider mt8"></div>

      <div class="section mt8">
        <div class="section-head"><span class="section-title">End Session</span></div>
        <button id="endSession2" class="danger w-full" disabled>End Session</button>
      </div>
    </div>

    <!-- ── CHAT ───────────────────────────────────── -->
    <div class="view view-chat" data-view="chat" id="view-chat">
      <div class="chat-header">
        <span class="chat-header-title">Chat</span>
        <div class="chat-header-actions">
          <button id="openChatPopout" class="icon-btn" title="Pop out chat">&#x29C9;</button>
          <button id="focusChatPopout" class="icon-btn" title="Focus detached chat" style="display:none">Focus</button>
          <button id="dockChatPopout" class="icon-btn" title="Dock detached chat" style="display:none">Dock</button>
        </div>
      </div>
      <div class="chat-scroll" id="chatScroll">
        <div class="chat-messages" id="chat"></div>
      </div>
      <div class="chat-composer">
        <input id="chatInput" type="text" placeholder="Message everyone…" />
        <button id="sendChat" class="primary" style="height:26px">Send</button>
      </div>
    </div>

    <!-- ── CALL ───────────────────────────────────── -->
    <div class="view scroll-area" data-view="call" id="view-call">
      <div class="call-dock" id="callDock">
        <div class="call-dock-status-row">
          <span class="call-dock-title">Live Call</span>
          <span id="callState" class="call-dock-state">Idle</span>
        </div>

        <div class="call-controls">
          <button id="startCall" class="primary flex-1">Start Call</button>
          <button id="toggleAudio" class="secondary">Mute</button>
          <button id="toggleVideo" class="secondary">Cam Off</button>
        </div>

        <div id="camWarn" class="cam-warn">
          Camera denied. Enable access for <strong>Multiplayer Code Helper</strong>
          in System Settings.
          <br><button id="camWarnSettings">Open Privacy Settings</button>
        </div>

        <div class="section mt4">
          <div class="section-head">
            <span class="section-title">Camera Zoom</span>
          </div>
          <input id="zoomRange" type="range" min="1" max="2" step="0.05" value="1" />
          <div class="row mt4">
            <button id="hoverZoomToggle" class="secondary flex-1">Hover Zoom: Off</button>
          </div>
        </div>
      </div>
      <p class="call-footnote">
        Call permissions and media run in the <strong>Multiplayer Call Helper</strong> background process.
      </p>

      <div class="helper-surface" id="helperSurface">
        <div class="helper-window" id="helperWindow" role="dialog" aria-label="Embedded call helper window">
          <div class="helper-window-bar" id="helperWindowBar">
            <span class="helper-window-grip" aria-hidden="true"></span>
            <span class="helper-window-title">Call Helper</span>
            <span class="helper-window-status" id="helperWindowStatus">Idle</span>
          </div>
          <div class="helper-window-body">
            <div class="helper-window-page" id="helperWindowPage">
              <div class="helper-window-copy">
                <span class="helper-window-eyebrow">Call Helper</span>
                <strong>Ready when you are.</strong>
                <p>Start a call to launch the dedicated media helper and keep camera and microphone permissions separate from VS Code.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style="display:none">
        <div class="video-wrap">
          <div class="video-tile" id="localTile">
            <div class="video-tile-label">You</div>
            <video id="localVideo" muted autoplay playsinline></video>
          </div>
          <div class="video-tile" id="remoteTile">
            <div class="video-tile-label">Remote</div>
            <video id="remoteVideo" autoplay playsinline></video>
          </div>
        </div>
      </div>
    </div>

    <!-- ── PERMISSION DIALOG (shown only when macOS has permanently blocked access) ── -->
    <div id="permissionDialog" class="permission-overlay" hidden aria-modal="true" role="dialog" aria-labelledby="permDialogTitle">
      <div class="permission-card">
        <div class="perm-icon-row" aria-hidden="true">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="40" height="40" rx="9" fill="var(--vscode-focusBorder,#007acc)" opacity="0.18"/>
            <text x="50%" y="52%" dominant-baseline="middle" text-anchor="middle" font-size="22">&#x1F3A4;</text>
          </svg>
        </div>
        <div id="permDialogTitle" class="permission-title">Microphone &amp; Camera Access Denied</div>
        <p class="permission-body">
          The <strong>Multiplayer Code Helper</strong> was denied microphone/camera access.
          Open <strong>Privacy &amp; Security</strong> in System Settings, find
          <em>Multiplayer Code Helper</em>, and allow it.
          Then click Retry.
        </p>
        <div class="permission-actions">
          <button id="permOpenSettings" class="perm-btn-allow flex-1">Open Privacy Settings</button>
          <button id="permRetry" class="perm-btn-dont">Retry</button>
          <button id="permDismiss" class="perm-btn-dont">Dismiss</button>
        </div>
      </div>
    </div>

    <script>
      const vscode = acquireVsCodeApi();

      // ── DOM refs ───────────────────────────────────────────────
      const toolbarEl = document.querySelector(".toolbar");
      const tabButtons = [...document.querySelectorAll(".tab")];
      const views = [...document.querySelectorAll(".view")];

      const connDot       = document.getElementById("connDot");
      const sessionLabel  = document.getElementById("sessionLabel");
      const modeBadge     = document.getElementById("modeBadge");
      const sessionStatus = document.getElementById("sessionStatus");
      const sessionHint   = document.getElementById("sessionHint");

      // Overview action rows
      const idleActions   = document.getElementById("idleActions");
      const liveActions   = document.getElementById("liveActions");
      const showHostFormBtn = document.getElementById("showHostForm");
      const showJoinFormBtn = document.getElementById("showJoinForm");
      const endBtn          = document.getElementById("endSession");
      const endBtnLive      = document.getElementById("endSessionLive");
      const endBtn2         = document.getElementById("endSession2");

      // Host form
      const hostForm        = document.getElementById("hostForm");
      const hostNameInput   = document.getElementById("hostName");
      const hostPortInput   = document.getElementById("hostPort");
      const hostInviteOnly  = document.getElementById("hostInviteOnly");
      const hostSubmitBtn   = document.getElementById("hostSubmit");
      const hostCancelBtn   = document.getElementById("hostCancel");

      // Join form
      const joinForm        = document.getElementById("joinForm");
      const joinNameInput   = document.getElementById("joinName");
      const joinInviteInput = document.getElementById("joinInvite");
      const joinSubmitBtn   = document.getElementById("joinSubmit");
      const joinCancelBtn   = document.getElementById("joinCancel");

      // Approvals container
      const approvalsEl    = document.getElementById("approvals");

      // Session tab
      const inviteSection       = document.getElementById("inviteSection");
      const privateInviteCard   = document.getElementById("privateInviteCard");
      const publicInviteCard    = document.getElementById("publicInviteCard");
      const publicJoinCodeEl    = document.getElementById("publicJoinCode");
      const openInviteLinkEl    = document.getElementById("openInviteLink");
      const copyPrivateBtn      = document.getElementById("copyPrivateInvite");
      const copyOpenBtn         = document.getElementById("copyOpenInvite");
      const copyPublicCodeBtn   = document.getElementById("copyPublicCode");
      const copyPublicTokenBtn  = document.getElementById("copyPublicToken");
      const toggleOpenInviteBtn = document.getElementById("toggleOpenInviteLink");
      const invitePolicy        = document.getElementById("invitePolicy");

      const participantCount    = document.getElementById("participantCount");
      const participantsEl      = document.getElementById("participants");

      const chatScrollEl         = document.getElementById("chatScroll");
      const chatEl              = document.getElementById("chat");
      const chatInput           = document.getElementById("chatInput");
      const sendChatBtn         = document.getElementById("sendChat");
      const chatBadge           = document.getElementById("chatBadge");
      const openChatPopoutBtn   = document.getElementById("openChatPopout");
      const focusChatPopoutBtn  = document.getElementById("focusChatPopout");
      const dockChatPopoutBtn   = document.getElementById("dockChatPopout");

      const startCallBtn        = document.getElementById("startCall");
      const toggleAudioBtn      = document.getElementById("toggleAudio");
      const toggleVideoBtn      = document.getElementById("toggleVideo");
      const callStateEl         = document.getElementById("callState");
      const callDockEl          = document.getElementById("callDock");
      const camWarnEl           = document.getElementById("camWarn");
      const camWarnSettingsBtn  = document.getElementById("camWarnSettings");
      const helperSurface       = document.getElementById("helperSurface");
      const helperWindow        = document.getElementById("helperWindow");
      const helperWindowBar     = document.getElementById("helperWindowBar");
      const helperWindowStatus  = document.getElementById("helperWindowStatus");
      const zoomRange           = document.getElementById("zoomRange");
      const hoverZoomToggle     = document.getElementById("hoverZoomToggle");
      const localVideo          = document.getElementById("localVideo");
      const remoteVideo         = document.getElementById("remoteVideo");
      const localTile           = document.getElementById("localTile");
      const remoteTile          = document.getElementById("remoteTile");

      // Permission dialog
      const permissionDialog    = document.getElementById("permissionDialog");

      // ── State ──────────────────────────────────────────────────
      let activeTab = "${safeInitialView}";
      let unreadChat = 0;
      let localStream = null;
      let pc = null;
      let audioEnabled = true;
      let videoEnabled = true;
      let hoverZoomEnabled = false;
      let isCallConnected = false;
      let callActive = false; // true when the call helper is running
      let helperWindowPosition = { x: 24, y: 24 };
      let helperDragState = null;
      const isChatPopoutSurface = document.body.classList.contains("chat-popout");
      let chatPopoutOpen = isChatPopoutSurface;
      let sessionState = {
        mode: "idle",
        status: "Ready",
        inviteOnlyMode: null,
        openInviteLink: "",
        privateInviteLink: "",
        publicJoinCode: "",
        publicJoinToken: ""
      };
      let isOpenInviteVisible = false;

      function updateChatPopoutControls() {
        if (!openChatPopoutBtn || !focusChatPopoutBtn || !dockChatPopoutBtn) {
          return;
        }

        if (isChatPopoutSurface) {
          openChatPopoutBtn.style.display = "none";
          focusChatPopoutBtn.style.display = "none";
          dockChatPopoutBtn.style.display = "";
          return;
        }

        openChatPopoutBtn.style.display = chatPopoutOpen ? "none" : "";
        focusChatPopoutBtn.style.display = chatPopoutOpen && activeTab === "chat" ? "" : "none";
        dockChatPopoutBtn.style.display = chatPopoutOpen && activeTab === "chat" ? "" : "none";
      }

      // ── Tab routing ────────────────────────────────────────────
      function setActiveTab(name) {
        // Accept legacy names while rendering a single Session tab.
        const nameMap = { invites: "session", overview: "session" };
        name = nameMap[name] || name;
        if (!["session", "chat", "call"].includes(name)) { name = "session"; }
        activeTab = name;
        const activeTabButton = name;

        for (const btn of tabButtons) {
          const active = btn.dataset.tab === activeTabButton;
          btn.classList.toggle("active", active);
          btn.setAttribute("aria-selected", active ? "true" : "false");
          btn.tabIndex = active ? 0 : -1;
        }
        for (const v of views) {
          v.classList.toggle("active", v.dataset.view === name);
        }

        if (name === "chat") {
          unreadChat = 0;
          chatBadge.textContent = "";
          chatBadge.classList.remove("show");
        }

        updateChatPopoutControls();
      }

      function activateToolbarTab(tabName) {
        setActiveTab(tabName);
      }

      toolbarEl?.addEventListener("click", (event) => {
        const button = event.target.closest(".tab[data-tab]");
        if (!button) {
          return;
        }

        event.preventDefault();
        activateToolbarTab(button.dataset.tab);
      });

      toolbarEl?.addEventListener("keydown", (event) => {
        const currentIndex = tabButtons.findIndex((button) => button.dataset.tab === activeTab);
        if (currentIndex === -1) {
          return;
        }

        if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
          event.preventDefault();
          const direction = event.key === "ArrowRight" ? 1 : -1;
          const nextIndex = (currentIndex + direction + tabButtons.length) % tabButtons.length;
          const nextButton = tabButtons[nextIndex];
          activateToolbarTab(nextButton.dataset.tab);
          nextButton.focus();
          return;
        }

        if (event.key === "Home") {
          event.preventDefault();
          activateToolbarTab(tabButtons[0].dataset.tab);
          tabButtons[0].focus();
          return;
        }

        if (event.key === "End") {
          event.preventDefault();
          const lastButton = tabButtons[tabButtons.length - 1];
          activateToolbarTab(lastButton.dataset.tab);
          lastButton.focus();
        }
      });

      // ── Session state rendering ────────────────────────────────
      function updateSessionState(next) {
        sessionState = { ...sessionState, ...(next || {}) };
        const mode = sessionState.mode || "idle";
        const isIdle = mode === "idle";
        const isHost = mode === "host";
        const isGuest = mode === "guest";

        // connection dot
        connDot.className = "conn-dot" + (isHost ? " live" : isGuest ? " pending" : "");

        // inline label
        sessionLabel.innerHTML = isHost
          ? "Hosting · <span class='dim'>" + (sessionState.status || "") + "</span>"
          : isGuest
            ? "Connected as guest · <span class='dim'>" + (sessionState.status || "") + "</span>"
            : "<span class='dim'>" + (sessionState.status || "No active session") + "</span>";

        // mode badge
        modeBadge.textContent = isHost ? "Host" : isGuest ? "Guest" : "Idle";
        modeBadge.className = "mode-badge" + (isHost ? " host" : isGuest ? " guest" : "");

        // status text on session tab
        if (sessionStatus) sessionStatus.textContent = sessionState.status || "Ready";

        // hint copy
        if (sessionHint) {
          sessionHint.textContent = isHost
            ? "Share private invites with trusted collaborators. Use the public code only when needed."
            : isGuest
              ? "You are connected as a guest."
              : "Host to start a session, or paste an invite to join.";
        }

        // session action rows: idle shows host/join buttons, live shows end button
        if (idleActions && liveActions) {
          idleActions.style.display = isIdle ? "" : "none";
          liveActions.style.display = isIdle ? "none" : "";
        }

        // close inline forms when session becomes active
        if (!isIdle) {
          hostForm?.classList.remove("open");
          joinForm?.classList.remove("open");
        }

        // end buttons
        if (endBtn)     endBtn.disabled = isIdle;
        if (endBtnLive) endBtnLive.disabled = isIdle;
        if (endBtn2)    endBtn2.disabled = isIdle;

        // invite fields
        const publicCode = String(sessionState.publicJoinCode || "").trim();
        const publicToken = String(sessionState.publicJoinToken || "").trim();
        const openLink = String(sessionState.openInviteLink || "").trim();

        if (publicJoinCodeEl) {
          publicJoinCodeEl.textContent = publicCode || "------";
        }

        if (openInviteLinkEl) {
          openInviteLinkEl.value = openLink;
        }

        if (!isHost) {
          isOpenInviteVisible = false;
        }

        if (toggleOpenInviteBtn) {
          toggleOpenInviteBtn.style.display = isHost ? "" : "none";
          toggleOpenInviteBtn.textContent = isOpenInviteVisible ? "Hide Link" : "Show Link";
          toggleOpenInviteBtn.disabled = !openLink;
        }

        if (openInviteLinkEl) {
          openInviteLinkEl.style.display = isOpenInviteVisible && isHost ? "" : "none";
        }

        if (copyOpenBtn) {
          copyOpenBtn.style.display = isOpenInviteVisible && isHost ? "" : "none";
        }

        if (inviteSection) {
          inviteSection.style.display = isHost ? "" : "none";
        }

        if (privateInviteCard) {
          privateInviteCard.style.display = isHost ? "" : "none";
        }

        if (publicInviteCard) {
          publicInviteCard.style.display = isHost ? "" : "none";
        }

        invitePolicy.textContent = sessionState.inviteOnlyMode === null
          ? "Policy: n/a"
          : "Policy: " + (sessionState.inviteOnlyMode ? "invite-only" : "open");

        copyPrivateBtn.disabled = !isHost || !sessionState.privateInviteLink;
        copyOpenBtn.disabled = !isHost || !openLink;
        if (copyPublicCodeBtn) {
          copyPublicCodeBtn.disabled = !isHost || !publicCode;
        }
        if (copyPublicTokenBtn) {
          copyPublicTokenBtn.disabled = !isHost || !publicToken;
        }
      }

      // ── Participants ───────────────────────────────────────────
      function renderParticipants(list) {
        participantsEl.innerHTML = "";
        const items = list || [];
        participantCount.textContent = items.length || "0";

        if (!items.length) {
          participantsEl.innerHTML = "<div style='padding:4px 0; font-size:12px; color:var(--vscode-descriptionForeground)'>No participants yet.</div>";
          return;
        }

        for (const item of items) {
          const row = document.createElement("div");
          row.className = "list-item";

          const av = document.createElement("div");
          av.className = "avatar";
          av.textContent = (item.name || "?")[0];

          const name = document.createElement("span");
          name.className = "item-name";
          name.textContent = item.name || "Unknown";

          const role = document.createElement("span");
          role.className = "item-role";
          role.textContent = item.role || "member";

          row.append(av, name, role);
          participantsEl.append(row);
        }
      }

      // ── Chat ──────────────────────────────────────────────────
      function appendChat(message) {
        const payload = message || {};
        const wrapper = document.createElement("div");
        wrapper.className = "chat-msg";

        const meta = document.createElement("div");
        meta.className = "msg-meta";
        const ts = payload.timestamp ? new Date(payload.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "now";
        meta.innerHTML = "<span class='msg-user'>" + escapeHtml(payload.user || "Unknown") + "</span>" + ts;

        const body = document.createElement("div");
        body.className = "msg-body";
        body.textContent = payload.text || "";

        wrapper.append(meta, body);
        chatEl.append(wrapper);
        chatScrollEl.scrollTop = chatScrollEl.scrollHeight;

        if (activeTab !== "chat") {
          unreadChat++;
          chatBadge.textContent = unreadChat > 9 ? "9+" : String(unreadChat);
          chatBadge.classList.add("show");
        }
      }

      function setChatHistory(messages) {
        chatEl.innerHTML = "";
        unreadChat = 0;
        chatBadge.textContent = "";
        chatBadge.classList.remove("show");
        for (const m of messages || []) { appendChat(m); }
        chatScrollEl.scrollTop = chatScrollEl.scrollHeight;
      }

      function escapeHtml(s) {
        return String(s)
          .replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;")
          .replaceAll('"', "&quot;");
      }

      // ── Call / WebRTC ──────────────────────────────────────────
      function setCallState(text, connected = false) {
        callStateEl.textContent = text;
        isCallConnected = connected;

        const lowerText = text.toLowerCase();
        const isErr  = lowerText.includes("denied") || lowerText.includes("error") || lowerText.includes("failed");
        const isOk   = connected || lowerText === "media ready" || lowerText === "connected";
        const isWarn = !isErr && !isOk && (lowerText.includes("only") || lowerText.includes("limited") || lowerText.includes("requesting") || lowerText.includes("starting") || lowerText.includes("calling"));

        callStateEl.className = "call-dock-state" +
          (isErr ? " state-err" : isOk ? " state-ok" : isWarn ? " state-warn" : "");

        applyVideoZoom();
      }

      function setCamWarn(show) {
        camWarnEl?.classList.toggle("show", show);
      }

      function resetCallControls() {
        audioEnabled = true;
        videoEnabled = true;
        toggleAudioBtn.disabled = true;
        toggleVideoBtn.disabled = true;
        toggleAudioBtn.textContent = "Mute";
        toggleVideoBtn.textContent = "Cam Off";
        toggleAudioBtn.classList.remove("active");
        toggleVideoBtn.classList.remove("active");
        toggleAudioBtn.setAttribute("aria-pressed", "false");
        toggleVideoBtn.setAttribute("aria-pressed", "false");
      }

      function setHelperWindowStatus(text, variant = "idle") {
        if (!helperWindow || !helperWindowStatus) {
          return;
        }

        helperWindowStatus.textContent = text;
        helperWindow.dataset.state = variant;
      }

      function clampHelperWindowPosition(x, y) {
        const surfaceWidth = helperSurface?.clientWidth || 0;
        const surfaceHeight = helperSurface?.clientHeight || 0;
        const windowWidth = helperWindow?.offsetWidth || 0;
        const windowHeight = helperWindow?.offsetHeight || 0;
        const maxX = Math.max(0, surfaceWidth - windowWidth);
        const maxY = Math.max(0, surfaceHeight - windowHeight);

        return {
          x: Math.min(Math.max(0, x), maxX),
          y: Math.min(Math.max(0, y), maxY),
        };
      }

      function positionHelperWindow(nextPosition) {
        if (!helperWindow) {
          return;
        }

        helperWindowPosition = clampHelperWindowPosition(nextPosition.x, nextPosition.y);
        helperWindow.style.transform = "translate(" + helperWindowPosition.x + "px, " + helperWindowPosition.y + "px)";
      }

      function syncHelperWindowPosition() {
        positionHelperWindow(helperWindowPosition);
      }

      function startHelperWindowDrag(event) {
        if (!helperSurface || !helperWindowBar || event.button !== 0) {
          return;
        }

        helperDragState = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          originX: helperWindowPosition.x,
          originY: helperWindowPosition.y,
        };

        helperWindowBar.setPointerCapture(event.pointerId);
        helperWindow.classList.add("dragging");
      }

      function moveHelperWindow(event) {
        if (!helperDragState || event.pointerId !== helperDragState.pointerId) {
          return;
        }

        positionHelperWindow({
          x: helperDragState.originX + (event.clientX - helperDragState.startX),
          y: helperDragState.originY + (event.clientY - helperDragState.startY),
        });
      }

      function stopHelperWindowDrag(event) {
        if (!helperDragState || (event && event.pointerId !== helperDragState.pointerId)) {
          return;
        }

        try {
          helperWindowBar?.releasePointerCapture(helperDragState.pointerId);
        } catch {
          /* ignore */
        }

        helperWindow?.classList.remove("dragging");
        helperDragState = null;
      }

      function applyVideoZoom() {
        const zoom = Number(zoomRange.value || "1");
        localVideo.style.transform = "scale(" + zoom.toFixed(2) + ")";
        remoteVideo.style.transform = "scale(" + zoom.toFixed(2) + ")";
        const zoomable = hoverZoomEnabled && isCallConnected;
        localTile.classList.toggle("zoomable", zoomable);
        remoteTile.classList.toggle("zoomable", zoomable);
      }

      function isPermissionError(error) {
        const name = error?.name || "";
        const msg = String(error?.message || error || "").toLowerCase();
        return name === "NotAllowedError"
          || name === "PermissionDeniedError"
          || msg.includes("permission denied")
          || msg.includes("not allowed");
      }

      function showPermissionDialog() {
        if (permissionDialog) { permissionDialog.hidden = false; }
      }

      function hidePermissionDialog() {
        if (permissionDialog) { permissionDialog.hidden = true; }
      }

      function formatMediaError(error) {
        const message = String(error?.message || error || "Unknown media error");
        const normalized = message.toLowerCase();
        const denied = error?.name === "NotAllowedError"
          || error?.name === "PermissionDeniedError"
          || normalized.includes("permission denied")
          || normalized.includes("not allowed");

        if (denied) {
          return "Permission denied. Enable microphone/camera access for Multiplayer Call Helper in macOS Privacy & Security, then retry.";
        }

        if (error?.name === "NotFoundError") {
          return "No microphone/camera device found.";
        }

        return message;
      }

      function updateTrackControlAvailability() {
        const hasAudio = Boolean(localStream?.getAudioTracks().length);
        const hasVideo = Boolean(localStream?.getVideoTracks().length);

        toggleAudioBtn.disabled = !hasAudio;
        toggleVideoBtn.disabled = !hasVideo;

        if (!hasAudio) {
          toggleAudioBtn.textContent = "No Mic";
        }
        if (!hasVideo) {
          toggleVideoBtn.textContent = "No Cam";
        }
      }

      async function ensurePeerConnection() {
        if (pc) { return pc; }
        pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });

        pc.onicecandidate = (e) => {
          if (e.candidate) {
            vscode.postMessage({ type: "rtc-signal", signal: { type: "ice", candidate: e.candidate } });
          }
        };
        pc.onconnectionstatechange = () => {
          const s = pc.connectionState;
          setCallState(s === "connected" ? "Connected" : "RTC: " + s, s === "connected");
        };
        pc.ontrack = (e) => {
          remoteVideo.srcObject = e.streams[0];
          setCallState("Connected", true);
        };
        if (localStream) {
          for (const t of localStream.getTracks()) { pc.addTrack(t, localStream); }
        }
        return pc;
      }

      async function ensureMedia() {
        if (localStream) { return localStream; }

        // Pre-check permission state so we never request a device that is
        // already blocked — Chromium/Electron can poison the session after one
        // NotAllowedError and refuse subsequent requests even for less access.
        async function permState(name) {
          try { return (await navigator.permissions.query({ name })).state; } catch { return "prompt"; }
        }
        const [micState, camState] = await Promise.all([permState("microphone"), permState("camera")]);
        const micOk = micState !== "denied";
        const camOk = camState !== "denied";

        const attempts = [];
        if (micOk && camOk)  { attempts.push({ constraints: { audio: true, video: true },  label: "Media Ready" }); }
        if (micOk)           { attempts.push({ constraints: { audio: true, video: false }, label: "Audio Ready (camera unavailable)" }); }
        if (camOk && !micOk) { attempts.push({ constraints: { audio: false, video: true }, label: "Video Ready (mic unavailable)" }); }
        if (!attempts.length) {
          const err = new Error("Permission denied");
          err.name = "NotAllowedError";
          throw err;
        }

        let lastError = null;

        for (const attempt of attempts) {
          try {
            localStream = await navigator.mediaDevices.getUserMedia(attempt.constraints);
            localVideo.srcObject = localStream;
            updateTrackControlAvailability();
            setCallState(attempt.label, false);
            return localStream;
          } catch (error) {
            lastError = error;
          }
        }

        throw new Error(formatMediaError(lastError));
      }

      async function startCall() {
        await ensureMedia();
        const conn = await ensurePeerConnection();
        const offer = await conn.createOffer();
        await conn.setLocalDescription(offer);
        vscode.postMessage({ type: "rtc-signal", signal: { type: "offer", sdp: offer } });
        setCallState("Calling…", false);
      }

      async function handleRtcSignal(signal) {
        if (!signal) { return; }
        await ensureMedia();
        const conn = await ensurePeerConnection();
        if (signal.type === "offer") {
          await conn.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          const answer = await conn.createAnswer();
          await conn.setLocalDescription(answer);
          vscode.postMessage({ type: "rtc-signal", signal: { type: "answer", sdp: answer } });
          setCallState("Answering…", false);
          return;
        }
        if (signal.type === "answer") {
          await conn.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          setCallState("Connected", true);
          return;
        }
        if (signal.type === "ice" && signal.candidate) {
          try { await conn.addIceCandidate(new RTCIceCandidate(signal.candidate)); } catch { /* out-of-order */ }
        }
      }

      // ── Inline form helpers ────────────────────────────────────
      function openHostForm() {
        joinForm?.classList.remove("open");
        hostForm?.classList.toggle("open");
        if (hostForm?.classList.contains("open")) {
          hostNameInput?.focus();
        }
      }

      function openJoinForm() {
        hostForm?.classList.remove("open");
        joinForm?.classList.toggle("open");
        if (joinForm?.classList.contains("open")) {
          joinNameInput?.focus();
        }
      }

      // ── Inline approval cards ──────────────────────────────────
      function addApprovalCard({ requestId, displayName }) {
        if (!approvalsEl) { return; }
        const existing = approvalsEl.querySelector("[data-request-id='" + requestId + "']");
        if (existing) { return; }

        const card = document.createElement("div");
        card.className = "approval-card";
        card.dataset.requestId = requestId;
        card.setAttribute("role", "status");
        card.setAttribute("aria-label", escapeHtml(displayName || "Someone") + " wants to join");
        card.innerHTML =
          "<div class='approval-name'>" + escapeHtml(displayName || "Someone") + "</div>" +
          "<div class='approval-sub'>Wants to join your session</div>" +
          "<div class='approval-actions'>" +
            "<button class='primary flex-1 approve-btn' aria-label='Approve " + escapeHtml(displayName || "Someone") + "'>Approve</button>" +
            "<button class='danger reject-btn' aria-label='Reject " + escapeHtml(displayName || "Someone") + "'>Reject</button>" +
          "</div>";

        const approveBtn = card.querySelector(".approve-btn");
        const rejectBtn = card.querySelector(".reject-btn");

        function handleApproval() {
          approveBtn.disabled = true;
          rejectBtn.disabled = true;
          approveBtn.textContent = "Approving…";
          vscode.postMessage({ type: "approve-join", requestId });
          setTimeout(() => { card.classList.add("card-out"); }, 50);
          setTimeout(() => { card.remove(); }, 350);
        }

        function handleRejection() {
          approveBtn.disabled = true;
          rejectBtn.disabled = true;
          rejectBtn.textContent = "Rejecting…";
          vscode.postMessage({ type: "reject-join", requestId });
          setTimeout(() => { card.classList.add("card-out"); }, 50);
          setTimeout(() => { card.remove(); }, 350);
        }

        approveBtn.addEventListener("click", handleApproval);
        rejectBtn.addEventListener("click", handleRejection);

        approvalsEl.appendChild(card);
        setActiveTab("session");
      }

      // ── Event listeners ────────────────────────────────────────
      showHostFormBtn?.addEventListener("click", openHostForm);
      showJoinFormBtn?.addEventListener("click", openJoinForm);

      hostCancelBtn?.addEventListener("click", () => hostForm?.classList.remove("open"));
      joinCancelBtn?.addEventListener("click", () => joinForm?.classList.remove("open"));

      hostSubmitBtn?.addEventListener("click", async () => {
        const name = (hostNameInput?.value || "").trim();
        const port = Number(hostPortInput?.value) || 3700;
        const inviteOnly = hostInviteOnly?.checked ?? true;
        if (!name) {
          hostNameInput?.focus();
          hostNameInput?.style.borderColor = "var(--vscode-errorForeground)";
          setTimeout(() => { if (hostNameInput) hostNameInput.style.borderColor = ""; }, 2000);
          return;
        }
        if (port < 1024 || port > 65535) {
          hostPortInput?.focus();
          hostPortInput?.style.borderColor = "var(--vscode-errorForeground)";
          setTimeout(() => { if (hostPortInput) hostPortInput.style.borderColor = ""; }, 2000);
          return;
        }
        vscode.postMessage({ type: "host-session", name, port, inviteOnly });
        hostForm?.classList.remove("open");
        hostSubmitBtn.disabled = true;
        hostSubmitBtn.textContent = "Starting…";
      });

      joinSubmitBtn?.addEventListener("click", async () => {
        const name = (joinNameInput?.value || "").trim();
        const inviteText = (joinInviteInput?.value || "").trim();
        if (!name) {
          joinNameInput?.focus();
          joinNameInput?.style.borderColor = "var(--vscode-errorForeground)";
          setTimeout(() => { if (joinNameInput) joinNameInput.style.borderColor = ""; }, 2000);
          return;
        }
        if (!inviteText) {
          joinInviteInput?.focus();
          joinInviteInput?.style.borderColor = "var(--vscode-errorForeground)";
          setTimeout(() => { if (joinInviteInput) joinInviteInput.style.borderColor = ""; }, 2000);
          return;
        }
        vscode.postMessage({ type: "join-session", name, inviteText });
        joinForm?.classList.remove("open");
        joinSubmitBtn.disabled = true;
        joinSubmitBtn.textContent = "Joining…";
      });

      // Enter key to submit forms
      hostPortInput?.addEventListener("keydown", (e) => { if (e.key === "Enter") { hostSubmitBtn?.click(); } });
      hostNameInput?.addEventListener("keydown", (e) => { if (e.key === "Enter") { hostSubmitBtn?.click(); } });
      joinInviteInput?.addEventListener("keydown", (e) => { if (e.key === "Enter") { joinSubmitBtn?.click(); } });
      joinNameInput?.addEventListener("keydown", (e) => { if (e.key === "Enter") { joinSubmitBtn?.click(); } });

      for (const b of [endBtn, endBtnLive, endBtn2]) {
        b?.addEventListener("click", () => vscode.postMessage({ type: "end-session" }));
      }

      function addCopyFeedback(btn, label = "Copied!") {
        if (!btn) return;
        const originalText = btn.textContent;
        btn.textContent = label;
        btn.disabled = true;
        btn.classList.add("copied");
        setTimeout(() => {
          if (btn) {
            btn.textContent = originalText;
            btn.disabled = false;
            btn.classList.remove("copied");
          }
        }, 2000);
      }

      copyPrivateBtn?.addEventListener("click", () => {
        vscode.postMessage({ type: "copy-invite", kind: "private" });
        addCopyFeedback(copyPrivateBtn);
      });
      copyOpenBtn?.addEventListener("click", () => {
        vscode.postMessage({ type: "copy-invite", kind: "open" });
        addCopyFeedback(copyOpenBtn);
      });
      copyPublicCodeBtn?.addEventListener("click", () => {
        vscode.postMessage({ type: "copy-invite", kind: "public-code" });
        addCopyFeedback(copyPublicCodeBtn);
      });
      copyPublicTokenBtn?.addEventListener("click", () => {
        vscode.postMessage({ type: "copy-invite", kind: "public-token" });
        addCopyFeedback(copyPublicTokenBtn);
      });
      toggleOpenInviteBtn?.addEventListener("click", () => {
        isOpenInviteVisible = !isOpenInviteVisible;
        updateSessionState({});
      });

      openChatPopoutBtn?.addEventListener("click", () => vscode.postMessage({ type: "open-chat-popout" }));
      focusChatPopoutBtn?.addEventListener("click", () => vscode.postMessage({ type: "focus-chat-popout" }));
      dockChatPopoutBtn?.addEventListener("click", () => vscode.postMessage({ type: "dock-chat-popout" }));

      sendChatBtn.addEventListener("click", () => {
        const text = chatInput.value.trim();
        if (!text) {
          chatInput.focus();
          return;
        }
        vscode.postMessage({ type: "send-chat", text });
        chatInput.value = "";
        chatInput.focus();
      });
      chatInput.addEventListener("keydown", (e) => { if (e.key === "Enter") { sendChatBtn.click(); } });

      startCallBtn.addEventListener("click", () => {
        if (startCallBtn.disabled) return;
        if (callActive) {
          // Toggle off — ask extension to stop the helper
          startCallBtn.disabled = true;
          vscode.postMessage({ type: "end-call" });
          setCallState("Ending call…", false);
          setHelperWindowStatus("Ending", "starting");
          startCallBtn.textContent = "Start Call";
          callActive = false;
          callDockEl?.classList.remove("call-active");
          setCamWarn(false);
          resetCallControls();
          setTimeout(() => { startCallBtn.disabled = false; }, 500);
        } else {
          // Start the companion helper (it owns the OS permission prompt)
          startCallBtn.disabled = true;
          startCallBtn.textContent = "Starting…";
          vscode.postMessage({ type: "start-call" });
          setCallState("Starting call helper…", false);
          setHelperWindowStatus("Starting", "starting");
        }
      });

      document.getElementById("permOpenSettings")?.addEventListener("click", () => {
        vscode.postMessage({ type: "open-privacy-settings" });
      });

      camWarnSettingsBtn?.addEventListener("click", () => {
        vscode.postMessage({ type: "open-privacy-settings" });
      });

      document.getElementById("permRetry")?.addEventListener("click", () => {
        hidePermissionDialog();
        // Re-attempt: restart the call helper so the OS prompt appears again
        vscode.postMessage({ type: "start-call" });
        setCallState("Starting call helper…", false);
        startCallBtn.disabled = true;
      });

      document.getElementById("permDismiss")?.addEventListener("click", () => {
        hidePermissionDialog();
        setCallState("Idle", false);
      });
      toggleAudioBtn.addEventListener("click", () => {
        if (toggleAudioBtn.disabled) return;
        audioEnabled = !audioEnabled;
        toggleAudioBtn.setAttribute("aria-pressed", String(!audioEnabled));
        toggleAudioBtn.classList.toggle("active", !audioEnabled);
        toggleAudioBtn.textContent = audioEnabled ? "Mute" : "Unmute";
        vscode.postMessage({ type: "call-mute", audio: audioEnabled });
      });
      toggleVideoBtn.addEventListener("click", () => {
        if (toggleVideoBtn.disabled) return;
        videoEnabled = !videoEnabled;
        toggleVideoBtn.setAttribute("aria-pressed", String(!videoEnabled));
        toggleVideoBtn.classList.toggle("active", !videoEnabled);
        toggleVideoBtn.textContent = videoEnabled ? "Cam Off" : "Cam On";
        vscode.postMessage({ type: "call-video", enabled: videoEnabled });
      });
      zoomRange.addEventListener("input", applyVideoZoom);
      hoverZoomToggle.addEventListener("click", () => {
        hoverZoomEnabled = !hoverZoomEnabled;
        hoverZoomToggle.setAttribute("aria-pressed", String(hoverZoomEnabled));
        hoverZoomToggle.classList.toggle("active", hoverZoomEnabled);
        hoverZoomToggle.textContent = "Hover Zoom: " + (hoverZoomEnabled ? "On" : "Off");
        applyVideoZoom();
      });
      helperWindowBar?.addEventListener("pointerdown", startHelperWindowDrag);
      helperWindowBar?.addEventListener("pointermove", moveHelperWindow);
      helperWindowBar?.addEventListener("pointerup", stopHelperWindowDrag);
      helperWindowBar?.addEventListener("pointercancel", stopHelperWindowDrag);
      window.addEventListener("resize", syncHelperWindowPosition);

      // ── Message bus ────────────────────────────────────────────
      window.addEventListener("message", (event) => {
        const data = event.data;
        if (!data?.type) { return; }

        if (data.type === "chat-message") { appendChat(data.payload); return; }
        if (data.type === "chat-history") { setChatHistory(data.payload || []); return; }
        if (data.type === "participants") { renderParticipants(data.payload || []); return; }
        if (data.type === "call-helper-state") {
          const { status, text, connected, hasAudio, hasVideo } = data;
          setCallState(text || "Idle", Boolean(connected));
          setHelperWindowStatus(text || "Idle", status || "idle");
          startCallBtn.disabled = false;
          if (status === "media-ready" || status === "call") {
            callActive = true;
            startCallBtn.textContent = "End Call";
            toggleAudioBtn.disabled = !(hasAudio ?? true);
            toggleVideoBtn.disabled = !(hasVideo ?? true);
            callDockEl?.classList.add("call-active");
            setCamWarn(hasVideo === false);
          } else if (status === "starting") {
            startCallBtn.disabled = true;
            startCallBtn.textContent = "Starting…";
            resetCallControls();
          } else if (status === "ended" || status === "error") {
            callActive = false;
            startCallBtn.textContent = "Start Call";
            callDockEl?.classList.remove("call-active");
            setCamWarn(false);
            resetCallControls();
          } else if (status === "denied") {
            callActive = false;
            startCallBtn.textContent = "Start Call";
            callDockEl?.classList.remove("call-active");
            setCamWarn(false);
            resetCallControls();
            showPermissionDialog();
          } else if (status === "not-installed") {
            callActive = false;
            startCallBtn.textContent = "Start Call";
            callDockEl?.classList.remove("call-active");
            setCamWarn(false);
            resetCallControls();
          }
          return;
        }
        if (data.type === "rtc-signal") { return; }
        if (data.type === "session-state") {
          updateSessionState(data.payload || {});
          // reset submit buttons in case they were disabled
          if (hostSubmitBtn) { hostSubmitBtn.disabled = false; hostSubmitBtn.textContent = "Start Hosting"; }
          if (joinSubmitBtn) { joinSubmitBtn.disabled = false; joinSubmitBtn.textContent = "Join"; }
          return;
        }
        if (data.type === "status") {
          const text = typeof data.payload === "string" ? data.payload : String(data.payload || "Idle");
          updateSessionState({ status: text });
          return;
        }
        if (data.type === "join-request") {
          addApprovalCard(data.payload || {});
          return;
        }
        if (data.type === "chat-popout-state") {
          chatPopoutOpen = Boolean(data.payload?.open) || isChatPopoutSurface;
          updateChatPopoutControls();
          return;
        }
        if (data.type === "switch-view") { setActiveTab(data.payload || "session"); }
      });

      // ── Init ───────────────────────────────────────────────────
      setActiveTab(activeTab);
      updateSessionState({ mode: "idle", status: "Ready" });
      renderParticipants([]);
      setCallState("Idle", false);
      resetCallControls();
      syncHelperWindowPosition();
      setHelperWindowStatus("Idle", "idle");
      applyVideoZoom();
      updateChatPopoutControls();
      vscode.postMessage({ type: "panel-ready" });
    </script>
  </body>
</html>`;
}

module.exports = {
  MultiplayerViewProvider,
  sendPanelMessage
};
