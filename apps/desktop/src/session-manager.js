const EventEmitter = require("node:events");
const { exec } = require("node:child_process");
const { randomUUID } = require("node:crypto");
const os = require("node:os");
const path = require("node:path");
const fs = require("node:fs");
const WebSocket = require("ws");

const {
  CONTROL_EVENTS,
  SYNC_EVENTS,
  ROLES,
  toInviteCode,
  fromInviteCode
} = require("@multiplayer/shared/src/index");

class SessionManager extends EventEmitter {
  constructor() {
    super();
    this.mode = null;
    this.sessionId = null;
    this.displayName = "Anonymous";
    this.workspacePath = null;

    this.hostControlServer = null;
    this.hostControlPort = null;

    this.hostControlPeer = null;
    this.guestControlSocket = null;

    this.localIdeServer = null;
    this.localIdeSocket = null;

    this.pendingRequests = new Map();
  }

  setDisplayName(name) {
    this.displayName = name || "Anonymous";
  }

  startLocalIdeBridge(port = 48765) {
    if (this.localIdeServer) {
      return;
    }

    this.localIdeServer = new WebSocket.Server({ port });
    this.localIdeServer.on("connection", (socket) => {
      this.localIdeSocket = socket;
      this.emitStatus("Local IDE bridge connected");

      socket.on("message", (data) => {
        this.handleLocalIdeMessage(data);
      });

      socket.on("close", () => {
        this.emitStatus("Local IDE bridge disconnected");
        if (this.localIdeSocket === socket) {
          this.localIdeSocket = null;
        }
      });

      this.sendToLocalIde({
        type: SYNC_EVENTS.IDE_STATUS,
        role: this.mode,
        sessionId: this.sessionId,
        workspacePath: this.workspacePath
      });
    });

    this.emitStatus(`Local IDE bridge listening on ws://127.0.0.1:${port}`);
  }

  async hostSession({ workspacePath, port = 3700 }) {
    this.mode = ROLES.HOST;
    this.sessionId = randomUUID();
    this.workspacePath = workspacePath;

    this.startLocalIdeBridge();
    this.launchVsCode(workspacePath);

    this.hostControlServer = new WebSocket.Server({ port });
    this.hostControlPort = port;

    this.hostControlServer.on("connection", (socket) => {
      socket.on("message", (data) => this.handleHostControlMessage(socket, data));
      socket.on("close", () => {
        if (this.hostControlPeer === socket) {
          this.hostControlPeer = null;
          this.emitStatus("Guest disconnected from host session");
          this.emit("guest-disconnected");
        }
      });
    });

    const invite = {
      host: this.getPrimaryHostAddress(),
      port,
      sessionId: this.sessionId
    };

    const inviteCode = toInviteCode(invite);
    this.emitStatus(`Hosting session ${this.sessionId} on ws://0.0.0.0:${port}`);

    return {
      sessionId: this.sessionId,
      invite,
      inviteCode
    };
  }

  async joinSession({ inviteCode, hostAddress, displayName, workspacePath }) {
    this.mode = ROLES.GUEST;
    this.workspacePath = workspacePath;
    this.startLocalIdeBridge();

    const invite = inviteCode ? fromInviteCode(inviteCode) : this.parseHostAddress(hostAddress);
    if (!invite?.host || !invite?.port || !invite?.sessionId) {
      throw new Error("Invalid invite payload");
    }

    const url = `ws://${invite.host}:${invite.port}`;
    const socket = new WebSocket(url);

    await new Promise((resolve, reject) => {
      socket.once("open", resolve);
      socket.once("error", reject);
    });

    this.guestControlSocket = socket;
    this.sessionId = invite.sessionId;

    socket.on("message", (data) => this.handleGuestControlMessage(data));
    socket.on("close", () => this.emitStatus("Disconnected from host"));

    this.sendToControl(socket, {
      type: CONTROL_EVENTS.JOIN_REQUEST,
      sessionId: this.sessionId,
      requestId: randomUUID(),
      displayName: displayName || this.displayName,
      workspaceName: path.basename(workspacePath || "guest-workspace")
    });

    this.emitStatus(`Join request sent to ${url}`);
  }

  decideJoinRequest({ requestId, accepted }) {
    const request = this.pendingRequests.get(requestId);
    if (!request) {
      return;
    }

    this.pendingRequests.delete(requestId);

    this.sendToControl(request.socket, {
      type: CONTROL_EVENTS.JOIN_DECISION,
      requestId,
      accepted,
      sessionId: this.sessionId,
      workspacePath: this.workspacePath
    });

    if (accepted) {
      this.hostControlPeer = request.socket;
      this.emitStatus(`Accepted guest ${request.displayName}`);
      this.emit("guest-accepted", { displayName: request.displayName });
    } else {
      this.emitStatus(`Rejected guest ${request.displayName}`);
    }
  }

  handleHostControlMessage(socket, rawData) {
    const message = this.safeParse(rawData);
    if (!message) {
      return;
    }

    if (
      message.type === SYNC_EVENTS.YJS_UPDATE ||
      message.type === SYNC_EVENTS.CURSOR_UPDATE ||
      message.type === SYNC_EVENTS.SELECTION_UPDATE ||
      message.type === SYNC_EVENTS.FILE_OPEN
    ) {
      this.relayPeerMessageToIde(message);
      return;
    }

    if (message.type === CONTROL_EVENTS.JOIN_REQUEST) {
      if (message.sessionId !== this.sessionId) {
        this.sendToControl(socket, {
          type: CONTROL_EVENTS.ERROR,
          message: "Session mismatch"
        });
        return;
      }

      this.pendingRequests.set(message.requestId, {
        socket,
        displayName: message.displayName
      });

      this.emitStatus(`Join request from ${message.displayName}`);
      this.emit("join-request", {
        requestId: message.requestId,
        displayName: message.displayName,
        workspaceName: message.workspaceName
      });
    }
  }

  handleGuestControlMessage(rawData) {
    const message = this.safeParse(rawData);
    if (!message) {
      return;
    }

    if (
      message.type === SYNC_EVENTS.YJS_UPDATE ||
      message.type === SYNC_EVENTS.CURSOR_UPDATE ||
      message.type === SYNC_EVENTS.SELECTION_UPDATE ||
      message.type === SYNC_EVENTS.FILE_OPEN
    ) {
      this.relayPeerMessageToIde(message);
      return;
    }

    if (message.type === CONTROL_EVENTS.JOIN_DECISION) {
      if (!message.accepted) {
        this.emitStatus("Host rejected join request");
        this.emit("join-rejected");
        return;
      }

      this.emitStatus("Host accepted join request");
      this.emit("join-accepted", {
        workspacePath: this.workspacePath
      });
      this.launchVsCode(this.workspacePath);
    }
  }

  handleLocalIdeMessage(rawData) {
    const message = this.safeParse(rawData);
    if (!message) {
      return;
    }

    if (
      message.type === SYNC_EVENTS.YJS_UPDATE ||
      message.type === SYNC_EVENTS.CURSOR_UPDATE ||
      message.type === SYNC_EVENTS.SELECTION_UPDATE ||
      message.type === SYNC_EVENTS.FILE_OPEN
    ) {
      this.sendToPeer(message);
    }
  }

  sendToPeer(message) {
    if (this.mode === ROLES.HOST && this.hostControlPeer?.readyState === WebSocket.OPEN) {
      this.sendToControl(this.hostControlPeer, message);
      return;
    }

    if (this.mode === ROLES.GUEST && this.guestControlSocket?.readyState === WebSocket.OPEN) {
      this.sendToControl(this.guestControlSocket, message);
    }
  }

  relayPeerMessageToIde(message) {
    if (
      message.type === SYNC_EVENTS.YJS_UPDATE ||
      message.type === SYNC_EVENTS.CURSOR_UPDATE ||
      message.type === SYNC_EVENTS.SELECTION_UPDATE ||
      message.type === SYNC_EVENTS.FILE_OPEN
    ) {
      this.sendToLocalIde(message);
    }
  }

  sendToLocalIde(message) {
    if (this.localIdeSocket?.readyState === WebSocket.OPEN) {
      this.localIdeSocket.send(JSON.stringify(message));
    }
  }

  sendToControl(socket, message) {
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  }

  parseHostAddress(value) {
    if (!value) {
      return null;
    }

    const [host, portString, sessionId] = value.split(":");
    const port = Number(portString);

    if (!host || Number.isNaN(port) || !sessionId) {
      return null;
    }

    return {
      host,
      port,
      sessionId
    };
  }

  getPrimaryHostAddress() {
    const interfaces = os.networkInterfaces();

    for (const netEntries of Object.values(interfaces)) {
      for (const entry of netEntries || []) {
        if (entry.family === "IPv4" && !entry.internal) {
          return entry.address;
        }
      }
    }

    return "127.0.0.1";
  }

  launchVsCode(workspacePath) {
    if (!workspacePath || !fs.existsSync(workspacePath)) {
      this.emitStatus("Workspace path not found for VS Code launch");
      return;
    }

    exec(`code \"${workspacePath}\"`, (error) => {
      if (error) {
        this.emitStatus(`Failed to launch VS Code: ${error.message}`);
      } else {
        this.emitStatus("Opened workspace in VS Code");
      }
    });
  }

  safeParse(rawData) {
    try {
      const text = Buffer.isBuffer(rawData) ? rawData.toString("utf8") : String(rawData);
      return JSON.parse(text);
    } catch {
      return null;
    }
  }

  emitStatus(message) {
    this.emit("status", {
      timestamp: new Date().toISOString(),
      message
    });
  }
}

module.exports = {
  SessionManager
};
