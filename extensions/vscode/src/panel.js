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
      :root {
        color-scheme: light dark;
      }
      body {
        margin: 0;
        font-family: var(--vscode-font-family);
        color: var(--vscode-foreground);
        background: var(--vscode-editor-background);
      }
      .wrap {
        display: grid;
        gap: 12px;
        padding: 12px;
      }
      .card {
        border: 1px solid var(--vscode-panel-border);
        border-radius: 8px;
        padding: 10px;
        background: color-mix(in srgb, var(--vscode-editor-background) 88%, var(--vscode-button-background) 12%);
      }
      .row {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      input, button {
        font: inherit;
      }
      input {
        flex: 1;
        min-width: 220px;
        padding: 8px;
      }
      button {
        padding: 8px 12px;
        border: 0;
        border-radius: 6px;
        background: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
      }
      #chat {
        max-height: 220px;
        overflow: auto;
        display: grid;
        gap: 6px;
      }
      #participants {
        margin: 0;
        padding-left: 18px;
      }
      video {
        width: 100%;
        max-height: 220px;
        border-radius: 8px;
        background: #000;
      }
      .muted {
        opacity: 0.75;
      }
    </style>
  </head>
  <body>
    <main class="wrap">
      <section class="card">
        <strong>Participants</strong>
        <ul id="participants"></ul>
      </section>

      <section class="card">
        <strong>Chat</strong>
        <div id="chat"></div>
        <div class="row" style="margin-top:8px">
          <input id="chatInput" placeholder="Message" />
          <button id="sendChat">Send</button>
        </div>
      </section>

      <section class="card">
        <strong>Voice + Video</strong>
        <div class="row" style="margin-top:8px">
          <button id="startCall">Start Call</button>
          <button id="toggleAudio">Mute/Unmute</button>
          <button id="toggleVideo">Camera On/Off</button>
        </div>
        <p id="callStatus" class="muted">Idle</p>
        <div class="row">
          <video id="localVideo" muted autoplay playsinline></video>
          <video id="remoteVideo" autoplay playsinline></video>
        </div>
      </section>
    </main>

    <script>
      const vscode = acquireVsCodeApi();
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
        for (const item of list || []) {
          const li = document.createElement("li");
          li.textContent = item.name + " (" + item.role + ")";
          participants.append(li);
        }
      }

      function appendChat(message) {
        const line = document.createElement("div");
        line.textContent = "[" + message.timestamp + "] " + message.user + ": " + message.text;
        chat.append(line);
        chat.scrollTop = chat.scrollHeight;
      }

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

        if (data.type === "status") {
          callStatus.textContent = data.payload;
        }
      });

      vscode.postMessage({ type: "panel-ready" });
    </script>
  </body>
</html>`;
}

module.exports = {
  MultiplayerViewProvider,
  sendPanelMessage
};
