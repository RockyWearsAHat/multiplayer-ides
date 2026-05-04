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

  const bundleHref = webview
    ? webview.asWebviewUri(vscode.Uri.file(path.join(__dirname, "webview", "bundle.js")))
    : "";

  const bootstrapPayload = JSON.stringify({
    initialView: safeInitialView,
    surfaceKind
  }).replace(/</g, "\\u003c");

  // React-based panel app entrypoint. Keep host-side event contract in this file.
  return `<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    ${styleHref ? `<link rel="stylesheet" href="${styleHref}" />` : ""}
  </head>
  <body class="${surfaceClass}">
    <div id="root"></div>
    <script>
      window.__MP_BOOTSTRAP__ = ${bootstrapPayload};
    </script>
    ${bundleHref ? `<script src="${bundleHref}"></script>` : ""}
  </body>
</html>`;
}

module.exports = {
  MultiplayerViewProvider,
  sendPanelMessage
};
