const vscode = require("vscode");

class MultiplayerViewProvider {
  constructor(handlers) {
    this._handlers = handlers;
    this._sidebarView = null;
    this._surfaces = new Map();
    this._nextSurfaceId = 1;
  }

  resolveWebviewView(webviewView) {
    try {
      this._sidebarView = webviewView;
      this._attachSurface({
        surfaceId: "sidebar",
        webview: webviewView.webview,
        initialView: "overview"
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`Multiplayer panel failed to load: ${message}`);
      webviewView.webview.html = getErrorWebviewHtml(message);
    }
  }

  openEditorPanel({ initialView = "overview", title } = {}) {
    const panel = vscode.window.createWebviewPanel(
      "multiplayer.editorPanel",
      title || "Multiplayer Workspace",
      vscode.ViewColumn.Active,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );

    const surfaceId = `editor-${this._nextSurfaceId++}`;
    this._attachSurface({
      surfaceId,
      webview: panel.webview,
      initialView
    });

    panel.onDidDispose(() => {
      this._surfaces.delete(surfaceId);
    });

    return panel;
  }

  sendMessage(payload) {
    for (const webview of this._surfaces.values()) {
      webview.postMessage(payload);
    }
  }

  reveal() {
    this._sidebarView?.show(true);
  }

  _attachSurface({ surfaceId, webview, initialView }) {
    webview.options = { enableScripts: true };
    webview.html = getWebviewHtml({ initialView });

    this._surfaces.set(surfaceId, webview);

    webview.onDidReceiveMessage(async (message) => {
      if (!message?.type) {
        return;
      }

      if (message.type === "host-session") {
        await this._handlers.onHostSession();
        return;
      }

      if (message.type === "join-session") {
        await this._handlers.onJoinSession();
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

      if (message.type === "open-chat-tab") {
        this._handlers.onOpenChatTab();
        return;
      }

      if (message.type === "open-browser-tab") {
        this._handlers.onOpenBrowserTab(message.view || "overview");
        return;
      }

      if (message.type === "panel-ready") {
        await this._handlers.onPanelReady(surfaceId);
      }
    });
  }
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

function getWebviewHtml({ initialView = "overview" } = {}) {
  const safeInitialView = ["overview", "invites", "chat", "call"].includes(initialView)
    ? initialView
    : "overview";

  return `<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      *, *::before, *::after {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        font-family: var(--vscode-font-family);
        font-size: var(--vscode-font-size, 13px);
        color: var(--vscode-foreground);
        background: var(--vscode-sideBar-background);
      }

      .header {
        padding: 12px;
        border-bottom: 1px solid color-mix(in srgb, var(--vscode-panel-border) 55%, transparent);
      }

      .title {
        font-size: 13px;
        font-weight: 700;
      }

      .subtitle {
        margin-top: 2px;
        font-size: 11px;
        color: var(--vscode-descriptionForeground);
      }

      .row {
        display: flex;
        gap: 6px;
      }

      .tabs {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 6px;
        padding: 10px;
      }

      .tab {
        height: 28px;
        border: 1px solid color-mix(in srgb, var(--vscode-panel-border) 65%, transparent);
        border-radius: 6px;
        background: color-mix(in srgb, var(--vscode-editor-background) 70%, transparent);
        color: var(--vscode-descriptionForeground);
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
      }

      .tab.active {
        color: var(--vscode-button-foreground);
        background: var(--vscode-button-background);
        border-color: transparent;
      }

      .top-actions {
        padding: 0 10px 10px;
      }

      .top-actions button,
      button {
        font: inherit;
        height: 30px;
        border-radius: 6px;
        border: 1px solid transparent;
        padding: 0 12px;
        cursor: pointer;
      }

      button.primary {
        background: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
      }

      button.secondary {
        background: color-mix(in srgb, var(--vscode-editor-background) 72%, transparent);
        color: var(--vscode-foreground);
        border-color: color-mix(in srgb, var(--vscode-panel-border) 75%, transparent);
      }

      button.warn {
        background: color-mix(in srgb, var(--vscode-errorForeground) 12%, transparent);
        color: var(--vscode-errorForeground);
        border-color: color-mix(in srgb, var(--vscode-errorForeground) 32%, transparent);
      }

      button:disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }

      .panel {
        display: none;
        padding: 0 10px 12px;
      }

      .panel.active {
        display: block;
      }

      .card {
        padding: 10px;
        border-radius: 8px;
        border: 1px solid color-mix(in srgb, var(--vscode-panel-border) 55%, transparent);
        background: color-mix(in srgb, var(--vscode-editor-background) 66%, transparent);
      }

      .section-title {
        margin: 0 0 8px;
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.7px;
        color: var(--vscode-descriptionForeground);
      }

      .status-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }

      .status-main {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
      }

      .dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: color-mix(in srgb, var(--vscode-descriptionForeground) 60%, transparent);
      }

      .dot.host {
        background: var(--vscode-textLink-foreground);
      }

      .dot.guest {
        background: var(--vscode-charts-orange);
      }

      .status-label {
        font-size: 12px;
        font-weight: 600;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .status-sub {
        margin-top: 2px;
        font-size: 11px;
        color: var(--vscode-descriptionForeground);
      }

      .pill {
        padding: 3px 8px;
        border-radius: 999px;
        border: 1px solid color-mix(in srgb, var(--vscode-panel-border) 65%, transparent);
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.6px;
      }

      .pill.host {
        color: var(--vscode-textLink-foreground);
      }

      .pill.guest {
        color: var(--vscode-charts-orange);
      }

      .stack {
        display: grid;
        gap: 8px;
      }

      .field-label {
        display: block;
        margin-bottom: 4px;
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.6px;
        color: var(--vscode-descriptionForeground);
      }

      input[type="text"] {
        width: 100%;
        height: 30px;
        border-radius: 6px;
        border: 1px solid var(--vscode-input-border, color-mix(in srgb, var(--vscode-panel-border) 90%, transparent));
        background: var(--vscode-input-background);
        color: var(--vscode-input-foreground);
        padding: 0 9px;
      }

      .participants {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        gap: 6px;
      }

      .participant {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        border-radius: 6px;
        padding: 6px 8px;
        border: 1px solid color-mix(in srgb, var(--vscode-panel-border) 45%, transparent);
        background: color-mix(in srgb, var(--vscode-editor-background) 58%, transparent);
      }

      .chat-list {
        max-height: 170px;
        overflow-y: auto;
        display: grid;
        gap: 5px;
      }

      .chat-item {
        border-radius: 6px;
        padding: 6px 8px;
        border: 1px solid color-mix(in srgb, var(--vscode-panel-border) 45%, transparent);
        background: color-mix(in srgb, var(--vscode-editor-inactiveSelectionBackground) 60%, transparent);
      }

      .chat-meta {
        font-size: 10px;
        color: var(--vscode-descriptionForeground);
        margin-bottom: 2px;
      }

      .chat-text {
        font-size: 12px;
        white-space: pre-wrap;
        word-break: break-word;
      }

      .video-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }

      .video-tile {
        border-radius: 7px;
        border: 1px solid color-mix(in srgb, var(--vscode-panel-border) 60%, transparent);
        overflow: hidden;
        transition: transform 0.18s ease;
      }

      .video-tile.zoomable:hover {
        transform: scale(1.03);
      }

      .video-tile-label {
        padding: 4px 7px;
        border-bottom: 1px solid color-mix(in srgb, var(--vscode-panel-border) 45%, transparent);
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.6px;
        color: var(--vscode-descriptionForeground);
      }

      video {
        width: 100%;
        height: 96px;
        background: #000;
        object-fit: cover;
        transform-origin: center;
      }

      .help {
        margin: 8px 0 0;
        color: var(--vscode-descriptionForeground);
        font-size: 11px;
        line-height: 1.4;
      }

      .split {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 6px;
      }

      .mt8 { margin-top: 8px; }
      .mt10 { margin-top: 10px; }
    </style>
  </head>
  <body>
    <header class="header">
      <div class="title">Multiplayer Workspace</div>
      <div class="subtitle">Live collaboration, calls, and chat in one place</div>
    </header>

    <nav class="tabs">
      <button class="tab" data-tab="overview">Overview</button>
      <button class="tab" data-tab="invites">Invites</button>
      <button class="tab" data-tab="chat">Chat</button>
      <button class="tab" data-tab="call">Call</button>
    </nav>

    <div class="top-actions row">
      <button id="openChatTab" class="secondary">Pop Out Chat Tab</button>
      <button id="openBrowserTab" class="secondary">Open Browser Tab</button>
    </div>

    <section class="panel" data-panel="overview">
      <div class="stack">
        <article class="card">
          <div class="status-row">
            <div class="status-main">
              <span id="statusDot" class="dot"></span>
              <div>
                <div id="sessionStatus" class="status-label">Ready</div>
                <div id="statusSub" class="status-sub">No active session</div>
              </div>
            </div>
            <span id="modePill" class="pill">Idle</span>
          </div>
        </article>

        <article class="card">
          <h3 class="section-title">Actions</h3>
          <div class="row">
            <button id="hostSession" class="primary" style="flex:1">Host Session</button>
            <button id="joinSession" class="secondary" style="flex:1">Join Session</button>
          </div>
          <button id="endSession" class="warn mt8" style="width:100%">End Session</button>
          <p class="help">Use Host/Join to start collaboration. End Session cleanly closes sync and call channels.</p>
        </article>

        <article class="card">
          <h3 class="section-title">Participants</h3>
          <div id="participantCount" class="status-sub">0 connected</div>
          <ul id="participants" class="participants mt8"></ul>
        </article>
      </div>
    </section>

    <section class="panel" data-panel="invites">
      <div class="stack">
        <article class="card">
          <h3 class="section-title">Private Link</h3>
          <input id="privateInvite" type="text" readonly placeholder="Host a session to generate links" />
          <button id="copyPrivateInvite" class="secondary mt8">Copy Private Link</button>
        </article>

        <article class="card">
          <h3 class="section-title">Open Link</h3>
          <input id="openInvite" type="text" readonly placeholder="Optional shareable invite" />
          <div class="row mt8">
            <button id="copyOpenInvite" class="secondary" style="flex:1">Copy Open Link</button>
            <button id="invitePolicy" class="secondary" style="pointer-events:none">Policy: n/a</button>
          </div>
        </article>
      </div>
    </section>

    <section class="panel" data-panel="chat">
      <div class="stack">
        <article class="card">
          <h3 class="section-title">Team Chat</h3>
          <div id="chat" class="chat-list"></div>
          <div class="split mt10">
            <input id="chatInput" type="text" placeholder="Message everyone..." />
            <button id="sendChat" class="primary">Send</button>
          </div>
        </article>
      </div>
    </section>

    <section class="panel" data-panel="call">
      <div class="stack">
        <article class="card">
          <h3 class="section-title">Voice + Video</h3>
          <div class="row">
            <button id="startCall" class="primary" style="flex:1">Start Call</button>
            <button id="toggleAudio" class="secondary" style="flex:1">Mute</button>
          </div>
          <button id="toggleVideo" class="secondary mt8" style="width:100%">Camera Off</button>

          <div class="mt10">
            <label class="field-label" for="zoomRange">Camera Zoom</label>
            <input id="zoomRange" type="range" min="1" max="2" step="0.05" value="1" />
          </div>

          <div class="row mt8">
            <button id="hoverZoomToggle" class="secondary" style="flex:1">Hover Zoom: Off</button>
            <button id="callState" class="secondary" style="pointer-events:none; flex:1">Idle</button>
          </div>

          <div class="video-grid mt10">
            <div class="video-tile" id="localTile">
              <div class="video-tile-label">You</div>
              <video id="localVideo" muted autoplay playsinline></video>
            </div>
            <div class="video-tile" id="remoteTile">
              <div class="video-tile-label">Remote</div>
              <video id="remoteVideo" autoplay playsinline></video>
            </div>
          </div>
        </article>
      </div>
    </section>

    <script>
      const vscode = acquireVsCodeApi();

      const tabs = [...document.querySelectorAll(".tab")];
      const panels = [...document.querySelectorAll(".panel")];

      const sessionStatus = document.getElementById("sessionStatus");
      const statusSub = document.getElementById("statusSub");
      const statusDot = document.getElementById("statusDot");
      const modePill = document.getElementById("modePill");
      const hostSessionButton = document.getElementById("hostSession");
      const joinSessionButton = document.getElementById("joinSession");
      const endSessionButton = document.getElementById("endSession");
      const privateInvite = document.getElementById("privateInvite");
      const openInvite = document.getElementById("openInvite");
      const copyPrivateInviteButton = document.getElementById("copyPrivateInvite");
      const copyOpenInviteButton = document.getElementById("copyOpenInvite");
      const invitePolicy = document.getElementById("invitePolicy");
      const participantCount = document.getElementById("participantCount");
      const participants = document.getElementById("participants");

      const chat = document.getElementById("chat");
      const chatInput = document.getElementById("chatInput");
      const sendChatButton = document.getElementById("sendChat");

      const startCallButton = document.getElementById("startCall");
      const toggleAudioButton = document.getElementById("toggleAudio");
      const toggleVideoButton = document.getElementById("toggleVideo");
      const callStateButton = document.getElementById("callState");
      const zoomRange = document.getElementById("zoomRange");
      const hoverZoomToggle = document.getElementById("hoverZoomToggle");
      const localVideo = document.getElementById("localVideo");
      const remoteVideo = document.getElementById("remoteVideo");
      const localTile = document.getElementById("localTile");
      const remoteTile = document.getElementById("remoteTile");

      document.getElementById("openChatTab").addEventListener("click", () => {
        vscode.postMessage({ type: "open-chat-tab" });
      });

      document.getElementById("openBrowserTab").addEventListener("click", () => {
        vscode.postMessage({ type: "open-browser-tab", view: activeTab });
      });

      let activeTab = "${safeInitialView}";
      let localStream = null;
      let pc = null;
      let audioEnabled = true;
      let videoEnabled = true;
      let hoverZoomEnabled = false;
      let isCallConnected = false;
      let sessionState = {
        mode: "idle",
        status: "Ready",
        inviteOnlyMode: null,
        openInviteLink: "",
        privateInviteLink: ""
      };

      function setActiveTab(tabName) {
        activeTab = tabName;

        for (const tab of tabs) {
          tab.classList.toggle("active", tab.dataset.tab === tabName);
        }

        for (const panel of panels) {
          panel.classList.toggle("active", panel.dataset.panel === tabName);
        }
      }

      for (const tab of tabs) {
        tab.addEventListener("click", () => setActiveTab(tab.dataset.tab));
      }

      function updateSessionState(nextState) {
        sessionState = { ...sessionState, ...(nextState || {}) };
        const mode = sessionState.mode || "idle";

        statusDot.className = `dot ${mode === "host" ? "host" : mode === "guest" ? "guest" : ""}`.trim();
        modePill.className = `pill ${mode === "host" ? "host" : mode === "guest" ? "guest" : ""}`.trim();

        modePill.textContent = mode === "host" ? "Host" : mode === "guest" ? "Guest" : "Idle";
        sessionStatus.textContent = sessionState.status || "Ready";
        statusSub.textContent = mode === "host"
          ? "Hosting session"
          : mode === "guest"
            ? "Connected as guest"
            : "No active session";

        privateInvite.value = sessionState.privateInviteLink || "";
        openInvite.value = sessionState.openInviteLink || "";

        invitePolicy.textContent = sessionState.inviteOnlyMode === null
          ? "Policy: n/a"
          : `Policy: ${sessionState.inviteOnlyMode ? "Invite-only" : "Open"}`;

        const isIdle = mode === "idle";
        const isHost = mode === "host";

        hostSessionButton.disabled = !isIdle;
        joinSessionButton.disabled = !isIdle;
        endSessionButton.disabled = isIdle;

        copyPrivateInviteButton.disabled = !isHost || !sessionState.privateInviteLink;
        copyOpenInviteButton.disabled = !isHost || !sessionState.openInviteLink;
      }

      function setCallState(text, connected = false) {
        callStateButton.textContent = text;
        isCallConnected = connected;
        applyVideoZoom();
      }

      function applyVideoZoom() {
        const zoom = Number(zoomRange.value || "1");
        localVideo.style.transform = `scale(${zoom.toFixed(2)})`;
        remoteVideo.style.transform = `scale(${zoom.toFixed(2)})`;

        const zoomable = hoverZoomEnabled && isCallConnected;
        localTile.classList.toggle("zoomable", zoomable);
        remoteTile.classList.toggle("zoomable", zoomable);
      }

      function renderParticipants(list) {
        participants.innerHTML = "";

        const items = list || [];
        participantCount.textContent = `${items.length} connected`;

        if (!items.length) {
          const li = document.createElement("li");
          li.className = "status-sub";
          li.textContent = "No participants yet.";
          participants.append(li);
          return;
        }

        for (const item of items) {
          const li = document.createElement("li");
          li.className = "participant";

          const left = document.createElement("span");
          left.textContent = item.name || "Unknown";

          const right = document.createElement("span");
          right.className = "status-sub";
          right.textContent = item.role || "member";

          li.append(left, right);
          participants.append(li);
        }
      }

      function appendChat(message) {
        const payload = message || {};

        const wrapper = document.createElement("div");
        wrapper.className = "chat-item";

        const meta = document.createElement("div");
        meta.className = "chat-meta";
        const timestamp = payload.timestamp
          ? new Date(payload.timestamp).toLocaleTimeString()
          : "now";
        meta.textContent = `${timestamp} · ${payload.user || "Unknown"}`;

        const text = document.createElement("div");
        text.className = "chat-text";
        text.textContent = payload.text || "";

        wrapper.append(meta, text);
        chat.append(wrapper);
        chat.scrollTop = chat.scrollHeight;
      }

      function setChatHistory(messages) {
        chat.innerHTML = "";
        for (const message of messages || []) {
          appendChat(message);
        }
      }

      async function ensurePeerConnection() {
        if (pc) {
          return pc;
        }

        pc = new RTCPeerConnection({
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
        });

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            vscode.postMessage({
              type: "rtc-signal",
              signal: { type: "ice", candidate: event.candidate }
            });
          }
        };

        pc.onconnectionstatechange = () => {
          const state = pc.connectionState;
          const connected = state === "connected";
          const text = connected ? "Connected" : `RTC: ${state}`;
          setCallState(text, connected);
        };

        pc.ontrack = (event) => {
          remoteVideo.srcObject = event.streams[0];
          setCallState("Connected", true);
        };

        if (localStream) {
          for (const track of localStream.getTracks()) {
            pc.addTrack(track, localStream);
          }
        }

        return pc;
      }

      async function ensureMedia() {
        if (localStream) {
          return localStream;
        }

        localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        localVideo.srcObject = localStream;
        setCallState("Media Ready", false);
        return localStream;
      }

      async function startCall() {
        await ensureMedia();
        const conn = await ensurePeerConnection();

        const offer = await conn.createOffer();
        await conn.setLocalDescription(offer);

        vscode.postMessage({
          type: "rtc-signal",
          signal: { type: "offer", sdp: offer }
        });

        setCallState("Calling...", false);
      }

      async function handleRtcSignal(signal) {
        if (!signal) {
          return;
        }

        await ensureMedia();
        const conn = await ensurePeerConnection();

        if (signal.type === "offer") {
          await conn.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          const answer = await conn.createAnswer();
          await conn.setLocalDescription(answer);

          vscode.postMessage({
            type: "rtc-signal",
            signal: { type: "answer", sdp: answer }
          });

          setCallState("Answering...", false);
          return;
        }

        if (signal.type === "answer") {
          await conn.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          setCallState("Connected", true);
          return;
        }

        if (signal.type === "ice" && signal.candidate) {
          try {
            await conn.addIceCandidate(new RTCIceCandidate(signal.candidate));
          } catch {
            // Ignore out-of-order ICE candidates.
          }
        }
      }

      hostSessionButton.addEventListener("click", () => {
        vscode.postMessage({ type: "host-session" });
      });

      joinSessionButton.addEventListener("click", () => {
        vscode.postMessage({ type: "join-session" });
      });

      endSessionButton.addEventListener("click", () => {
        vscode.postMessage({ type: "end-session" });
      });

      copyPrivateInviteButton.addEventListener("click", () => {
        vscode.postMessage({ type: "copy-invite", kind: "private" });
      });

      copyOpenInviteButton.addEventListener("click", () => {
        vscode.postMessage({ type: "copy-invite", kind: "open" });
      });

      sendChatButton.addEventListener("click", () => {
        const text = chatInput.value.trim();
        if (!text) {
          return;
        }

        vscode.postMessage({ type: "send-chat", text });
        chatInput.value = "";
      });

      chatInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          sendChatButton.click();
        }
      });

      startCallButton.addEventListener("click", () => {
        startCall().catch((error) => {
          setCallState(`Call failed: ${error.message || String(error)}`);
        });
      });

      toggleAudioButton.addEventListener("click", async () => {
        await ensureMedia();
        audioEnabled = !audioEnabled;

        for (const track of localStream.getAudioTracks()) {
          track.enabled = audioEnabled;
        }

        toggleAudioButton.textContent = audioEnabled ? "Mute" : "Unmute";
      });

      toggleVideoButton.addEventListener("click", async () => {
        await ensureMedia();
        videoEnabled = !videoEnabled;

        for (const track of localStream.getVideoTracks()) {
          track.enabled = videoEnabled;
        }

        toggleVideoButton.textContent = videoEnabled ? "Camera Off" : "Camera On";
      });

      zoomRange.addEventListener("input", applyVideoZoom);

      hoverZoomToggle.addEventListener("click", () => {
        hoverZoomEnabled = !hoverZoomEnabled;
        hoverZoomToggle.textContent = `Hover Zoom: ${hoverZoomEnabled ? "On" : "Off"}`;
        applyVideoZoom();
      });

      window.addEventListener("message", (event) => {
        const data = event.data;

        if (!data?.type) {
          return;
        }

        if (data.type === "chat-message") {
          appendChat(data.payload);
          return;
        }

        if (data.type === "chat-history") {
          setChatHistory(data.payload || []);
          return;
        }

        if (data.type === "participants") {
          renderParticipants(data.payload || []);
          return;
        }

        if (data.type === "rtc-signal") {
          handleRtcSignal(data.payload).catch((error) => {
            setCallState(`RTC error: ${error.message || String(error)}`);
          });
          return;
        }

        if (data.type === "session-state") {
          updateSessionState(data.payload || {});
          return;
        }

        if (data.type === "status") {
          const text = typeof data.payload === "string" ? data.payload : String(data.payload || "Idle");
          updateSessionState({ status: text });
          return;
        }

        if (data.type === "switch-view") {
          setActiveTab(data.payload || "overview");
        }
      });

      setActiveTab(activeTab);
      updateSessionState({ mode: "idle", status: "Ready" });
      renderParticipants([]);
      setCallState("Idle", false);
      applyVideoZoom();

      vscode.postMessage({ type: "panel-ready" });
    </script>
  </body>
</html>`;
}

module.exports = {
  MultiplayerViewProvider,
  sendPanelMessage
};
