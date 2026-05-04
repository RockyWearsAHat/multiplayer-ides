const vscode = require("vscode");

class MultiplayerViewProvider {
  constructor(handlers) {
    this._handlers = handlers;
    this._view = null;
  }

  resolveWebviewView(webviewView) {
    try {
      this._view = webviewView;

      webviewView.webview.options = {
        enableScripts: true
      };

      webviewView.webview.html = getWebviewHtml();

      webviewView.webview.onDidReceiveMessage(async (message) => {
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

        if (message.type === "panel-ready") {
          this._handlers.onPanelReady();
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`Multiplayer panel failed to load: ${message}`);
      throw error;
    }
  }

  sendMessage(payload) {
    this._view?.webview.postMessage(payload);
  }

  reveal() {
    this._view?.show(true);
  }
}

function sendPanelMessage(provider, payload) {
  provider?.sendMessage(payload);
}

function getWebviewHtml() {
  return `<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      body {
        margin: 0;
        font-family: var(--vscode-font-family);
        color: var(--vscode-foreground);
        background: var(--vscode-sideBar-background);
      }

      .wrap {
        display: grid;
        gap: 12px;
        padding: 12px;
      }

      .card {
        border: 1px solid color-mix(in srgb, var(--vscode-panel-border) 78%, transparent);
        border-radius: 12px;
        padding: 12px;
        background: color-mix(in srgb, var(--vscode-editor-background) 90%, var(--vscode-sideBar-background) 10%);
        box-shadow: inset 0 1px 0 color-mix(in srgb, var(--vscode-foreground) 7%, transparent);
      }

      .card h3 {
        margin: 0 0 8px;
        font-size: 11px;
        letter-spacing: 0.6px;
        text-transform: uppercase;
        font-weight: 700;
      }

      .status-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }

      .pill {
        display: inline-flex;
        align-items: center;
        height: 22px;
        padding: 0 8px;
        border-radius: 999px;
        border: 1px solid color-mix(in srgb, var(--vscode-panel-border) 85%, transparent);
        font-size: 11px;
        color: var(--vscode-descriptionForeground);
        background: color-mix(in srgb, var(--vscode-editor-background) 80%, var(--vscode-sideBar-background) 20%);
      }

      .pill[data-mode="host"] {
        color: var(--vscode-textLink-foreground);
        border-color: color-mix(in srgb, var(--vscode-textLink-foreground) 50%, transparent);
      }

      .pill[data-mode="guest"] {
        color: var(--vscode-charts-orange);
        border-color: color-mix(in srgb, var(--vscode-charts-orange) 45%, transparent);
      }

      .status-copy {
        margin: 8px 0 0;
        font-size: 12px;
        color: var(--vscode-descriptionForeground);
      }

      .row {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }

      .row.stack {
        flex-direction: column;
      }

      input,
      button,
      textarea {
        font: inherit;
      }

      input {
        flex: 1;
        min-width: 120px;
        padding: 7px 8px;
        border-radius: 6px;
        border: 1px solid var(--vscode-input-border, var(--vscode-panel-border));
        background: var(--vscode-input-background);
        color: var(--vscode-input-foreground);
      }

      button {
        padding: 8px 11px;
        border: 1px solid color-mix(in srgb, var(--vscode-panel-border) 80%, transparent);
        border-radius: 6px;
        background: color-mix(in srgb, var(--vscode-editor-background) 75%, var(--vscode-sideBar-background) 25%);
        color: var(--vscode-foreground);
        cursor: pointer;
      }

      button:hover {
        background: color-mix(in srgb, var(--vscode-list-hoverBackground) 75%, var(--vscode-editor-background) 25%);
      }

      button.primary {
        border-color: color-mix(in srgb, var(--vscode-textLink-foreground) 50%, transparent);
        background: color-mix(in srgb, var(--vscode-textLink-foreground) 88%, var(--vscode-editor-background) 12%);
        color: var(--vscode-editor-background);
      }

      button.primary:hover {
        background: color-mix(in srgb, var(--vscode-textLink-foreground) 78%, var(--vscode-editor-background) 22%);
      }

      button.secondary {
        background: color-mix(in srgb, var(--vscode-editor-background) 85%, var(--vscode-sideBar-background) 15%);
        color: var(--vscode-foreground);
      }

      button.secondary:hover {
        background: color-mix(in srgb, var(--vscode-list-hoverBackground) 80%, var(--vscode-editor-background) 20%);
      }

      button.warn {
        border-color: color-mix(in srgb, var(--vscode-errorForeground) 55%, transparent);
        background: color-mix(in srgb, var(--vscode-errorForeground) 20%, transparent);
        color: var(--vscode-errorForeground);
      }

      button.warn:hover {
        background: color-mix(in srgb, var(--vscode-errorForeground) 30%, transparent);
      }

      button:disabled {
        cursor: default;
        opacity: 0.5;
        border-color: color-mix(in srgb, var(--vscode-panel-border) 60%, transparent);
      }

      .btn-grid {
        display: grid;
        gap: 8px;
        grid-template-columns: 1fr 1fr;
      }

      .hint {
        margin: 6px 0 0;
        font-size: 11px;
        color: var(--vscode-descriptionForeground);
      }

      .field {
        display: grid;
        gap: 6px;
      }

      .field label {
        font-size: 11px;
        color: var(--vscode-descriptionForeground);
      }

      .field input {
        width: 100%;
        box-sizing: border-box;
      }

      #chat {
        max-height: 160px;
        overflow: auto;
        display: grid;
        gap: 6px;
        padding-right: 4px;
      }

      .chat-line {
        font-size: 12px;
        line-height: 1.4;
        background: color-mix(in srgb, var(--vscode-editor-inactiveSelectionBackground) 70%, transparent);
        border-radius: 6px;
        padding: 6px 8px;
        border: 1px solid color-mix(in srgb, var(--vscode-panel-border) 70%, transparent);
      }

      .chat-line .meta {
        color: var(--vscode-descriptionForeground);
        font-size: 11px;
      }

      #participants {
        margin: 0;
        padding-left: 18px;
        display: grid;
        gap: 4px;
        font-size: 12px;
      }

      .participants-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }

      .counter {
        font-size: 11px;
        color: var(--vscode-descriptionForeground);
      }

      .video-grid {
        margin-top: 8px;
        display: grid;
        gap: 8px;
      }

      .video-card {
        border: 1px solid color-mix(in srgb, var(--vscode-panel-border) 75%, transparent);
        border-radius: 8px;
        overflow: hidden;
      }

      .video-card .label {
        padding: 4px 8px;
        font-size: 11px;
        color: var(--vscode-descriptionForeground);
        border-bottom: 1px solid var(--vscode-panel-border);
      }

      video {
        width: 100%;
        height: 120px;
        display: block;
        background: #000;
      }

      .muted {
        opacity: 0.75;
      }

      .empty {
        font-size: 12px;
        color: var(--vscode-descriptionForeground);
      }
    </style>
  </head>
  <body>
    <main class="wrap">
      <section class="card">
        <div class="status-row">
          <h3>Session</h3>
          <span id="modePill" class="pill">Idle</span>
        </div>
        <p id="sessionStatus" class="status-copy">Ready</p>
      </section>

      <section class="card">
        <h3>Quick Actions</h3>
        <div class="btn-grid">
          <button id="hostSession" class="primary">Host</button>
          <button id="joinSession" class="secondary">Join</button>
        </div>
        <div class="row" style="margin-top:8px">
          <button id="endSession" class="warn" style="width:100%">End Session</button>
        </div>
        <p class="hint">Host and Join open guided prompts so setup stays fast and safe.</p>
      </section>

      <section class="card">
        <h3>Invites</h3>
        <div class="field">
          <label for="privateInvite">Private Invite</label>
          <input id="privateInvite" readonly placeholder="Host a session to generate links" />
        </div>
        <div class="row" style="margin-top:8px">
          <button id="copyPrivateInvite" class="secondary">Copy Private</button>
        </div>
        <div class="field" style="margin-top:8px">
          <label for="openInvite">Open Invite</label>
          <input id="openInvite" readonly placeholder="Optional shareable invite" />
        </div>
        <div class="row" style="margin-top:8px">
          <button id="copyOpenInvite" class="secondary">Copy Open</button>
          <span id="invitePolicy" class="pill">Policy: n/a</span>
        </div>
      </section>

      <section class="card">
        <div class="participants-head">
          <h3>Participants</h3>
          <span id="participantCount" class="counter">0 connected</span>
        </div>
        <ul id="participants"></ul>
      </section>

      <section class="card">
        <h3>Team Chat</h3>
        <div id="chat"></div>
        <div class="row stack" style="margin-top:8px">
          <input id="chatInput" placeholder="Send a message to everyone in this session" />
          <button id="sendChat" class="primary">Send</button>
        </div>
      </section>

      <section class="card">
        <h3>Voice + Video</h3>
        <div class="row" style="margin-top:8px">
          <button id="startCall" class="primary">Start Call</button>
          <button id="toggleAudio" class="secondary">Mute/Unmute</button>
          <button id="toggleVideo" class="secondary">Camera On/Off</button>
        </div>
        <p id="callStatus" class="muted">Idle</p>
        <div class="video-grid">
          <div class="video-card">
            <div class="label">You</div>
            <video id="localVideo" muted autoplay playsinline></video>
          </div>
          <div class="video-card">
            <div class="label">Remote</div>
            <video id="remoteVideo" autoplay playsinline></video>
          </div>
        </div>
      </section>
    </main>

    <script>
      const vscode = acquireVsCodeApi();
      const sessionStatus = document.getElementById("sessionStatus");
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
      const chat = document.getElementById("chat");
      const chatInput = document.getElementById("chatInput");
      const sendChat = document.getElementById("sendChat");
      const participants = document.getElementById("participants");
      const localVideo = document.getElementById("localVideo");
      const remoteVideo = document.getElementById("remoteVideo");
      const callStatus = document.getElementById("callStatus");

      const startCallButton = document.getElementById("startCall");
      const toggleAudioButton = document.getElementById("toggleAudio");
      const toggleVideoButton = document.getElementById("toggleVideo");

      let localStream = null;
      let pc = null;
      let audioEnabled = true;
      let videoEnabled = true;
      let sessionState = {
        mode: "idle",
        status: "Ready",
        inviteOnlyMode: null,
        openInviteLink: "",
        privateInviteLink: ""
      };

      function updateSessionState(nextState) {
        sessionState = { ...sessionState, ...(nextState || {}) };
        const mode = sessionState.mode || "idle";
        modePill.dataset.mode = mode;

        modePill.textContent = mode === "host" ? "Hosting" : mode === "guest" ? "Guest" : "Idle";
        sessionStatus.textContent = sessionState.status || "Ready";

        privateInvite.value = sessionState.privateInviteLink || "";
        openInvite.value = sessionState.openInviteLink || "";

        invitePolicy.textContent = sessionState.inviteOnlyMode === null
          ? "Policy: n/a"
          : "Policy: " + (sessionState.inviteOnlyMode ? "Invite-only" : "Open");

        const isHost = mode === "host";
        const canEnd = mode !== "idle";

        hostSessionButton.disabled = mode !== "idle";
        joinSessionButton.disabled = mode !== "idle";
        endSessionButton.disabled = !canEnd;
        copyPrivateInviteButton.disabled = !isHost || !sessionState.privateInviteLink;
        copyOpenInviteButton.disabled = !isHost || !sessionState.openInviteLink;
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

        pc.ontrack = (event) => {
          remoteVideo.srcObject = event.streams[0];
          callStatus.textContent = "Connected";
        };

        if (localStream) {
          localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));
        }

        return pc;
      }

      async function ensureMedia() {
        if (localStream) {
          return localStream;
        }

        localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        localVideo.srcObject = localStream;
        callStatus.textContent = "Media ready";
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

        callStatus.textContent = "Calling...";
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
          callStatus.textContent = "Answering call...";
          return;
        }

        if (signal.type === "answer") {
          await conn.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          callStatus.textContent = "Call connected";
          return;
        }

        if (signal.type === "ice" && signal.candidate) {
          try {
            await conn.addIceCandidate(new RTCIceCandidate(signal.candidate));
          } catch {
            // Ignore out-of-order ICE errors in prototype.
          }
        }
      }

      function renderParticipants(list) {
        participants.innerHTML = "";

        const items = list || [];
        participantCount.textContent = items.length + " connected";

        if (!items.length) {
          const li = document.createElement("li");
          li.className = "empty";
          li.textContent = "No one connected yet.";
          participants.append(li);
          return;
        }

        for (const item of items) {
          const li = document.createElement("li");
          li.textContent = item.name + " (" + item.role + ")";
          participants.append(li);
        }
      }

      function appendChat(message) {
        const line = document.createElement("div");
        line.className = "chat-line";
        const timestamp = message.timestamp ? new Date(message.timestamp).toLocaleTimeString() : "now";
        line.innerHTML = "<div class=\"meta\">"
          + timestamp
          + " · "
          + (message.user || "Unknown")
          + "</div><div>"
          + (message.text || "")
          + "</div>";
        chat.append(line);
        chat.scrollTop = chat.scrollHeight;
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

      sendChat.addEventListener("click", () => {
        const text = chatInput.value.trim();
        if (!text) {
          return;
        }
        vscode.postMessage({ type: "send-chat", text });
        chatInput.value = "";
      });

      chatInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          sendChat.click();
        }
      });

      startCallButton.addEventListener("click", () => {
        startCall().catch((error) => {
          callStatus.textContent = "Call failed: " + error.message;
        });
      });

      toggleAudioButton.addEventListener("click", async () => {
        await ensureMedia();
        audioEnabled = !audioEnabled;
        localStream.getAudioTracks().forEach((track) => {
          track.enabled = audioEnabled;
        });
      });

      toggleVideoButton.addEventListener("click", async () => {
        await ensureMedia();
        videoEnabled = !videoEnabled;
        localStream.getVideoTracks().forEach((track) => {
          track.enabled = videoEnabled;
        });
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

        if (data.type === "participants") {
          renderParticipants(data.payload || []);
          return;
        }

        if (data.type === "rtc-signal") {
          handleRtcSignal(data.payload).catch((error) => {
            callStatus.textContent = "RTC error: " + error.message;
          });
          return;
        }

        if (data.type === "session-state") {
          updateSessionState(data.payload || {});
          return;
        }

        if (data.type === "status") {
          callStatus.textContent = data.payload;
          updateSessionState({ status: data.payload || "Ready" });
        }
      });

      updateSessionState({ mode: "idle", status: "Ready" });
      renderParticipants([]);
      vscode.postMessage({ type: "panel-ready" });
    </script>
  </body>
</html>`;
}

module.exports = {
  MultiplayerViewProvider,
  sendPanelMessage
};
