const EventEmitter = require("node:events");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const WebSocket = require("ws");

const {
  EVENTS,
  createSessionId,
  createPublicJoinCode,
  createInviteSecret,
  toInviteCode,
  toInviteLink,
  parseInviteInput
} = require("./protocol");

const execFileAsync = promisify(execFile);

class SessionService extends EventEmitter {
  constructor(getWorkspaceRoot) {
    super();
    this.getWorkspaceRoot = getWorkspaceRoot;

    this.mode = null;
    this.sessionId = null;
    this.displayName = "Anonymous";

    this.hostServer = null;
    this.hostPort = null;
    this.inviteOnlyMode = true;
    this.inviteSecret = null;

    this.peerSocket = null;
    this.pendingRequests = new Map();
    this.participants = new Map();
  }

  setDisplayName(name) {
    this.displayName = name || "Anonymous";
  }

  async hostSession({ port = 3700, inviteOnlyMode = true }) {
    await this.endSession();

    this.mode = "host";
    this.sessionId = createPublicJoinCode();
    this.hostPort = port;
    this.inviteOnlyMode = Boolean(inviteOnlyMode);
    this.inviteSecret = createInviteSecret();

    this.hostServer = new WebSocket.Server({ port });
    this.hostServer.on("connection", (socket) => {
      socket.on("message", (rawData) => this.handleHostMessage(socket, rawData));
      socket.on("close", () => {
        if (this.peerSocket === socket) {
          this.peerSocket = null;
          this.participants.delete("guest");
          this.emitParticipants();
          this.emitStatus("Guest disconnected");
        }
      });
    });

    const host = this.getPrimaryHostAddress();
    const baseInvite = {
      host,
      port,
      sessionId: this.sessionId
    };
    const quickJoinToken = `${host}:${port}#${this.sessionId}`;

    const openCode = toInviteCode(baseInvite);
    const privateCode = toInviteCode({
      ...baseInvite,
      inviteSecret: this.inviteSecret
    });

    this.participants.set("host", {
      id: "host",
      name: this.displayName,
      role: "host"
    });
    this.emitParticipants();
    this.emitStatus(`Hosting on ws://${host}:${port}`);

    return {
      openInviteLink: toInviteLink(openCode),
      privateInviteLink: toInviteLink(privateCode),
      publicJoinCode: this.sessionId,
      publicJoinToken: quickJoinToken,
      sessionId: this.sessionId,
      inviteOnlyMode: this.inviteOnlyMode
    };
  }

  async joinSession({ inviteText, cloneIfMissing = true }) {
    await this.endSession();

    const invite = parseInviteInput(inviteText);
    if (!invite?.host || !invite?.port || !invite?.sessionId) {
      throw new Error("Invalid invite link/code");
    }

    this.mode = "guest";
    this.sessionId = invite.sessionId;

    const socket = new WebSocket(`ws://${invite.host}:${invite.port}`);
    await new Promise((resolve, reject) => {
      socket.once("open", resolve);
      socket.once("error", reject);
    });

    this.peerSocket = socket;
    socket.on("message", (rawData) => this.handleGuestMessage(rawData));
    socket.on("close", () => {
      this.emitStatus("Disconnected from host");
      this.participants.clear();
      this.emitParticipants();
    });

    this.sendToPeer({
      type: EVENTS.JOIN_REQUEST,
      sessionId: this.sessionId,
      requestId: createSessionId(),
      displayName: this.displayName,
      inviteSecret: invite.inviteSecret || null,
      cloneIfMissing
    });

    this.emitStatus("Join request sent");
  }

  async endSession() {
    if (this.peerSocket) {
      this.peerSocket.close();
      this.peerSocket = null;
    }

    if (this.hostServer) {
      await new Promise((resolve) => this.hostServer.close(resolve));
      this.hostServer = null;
    }

    this.pendingRequests.clear();
    this.participants.clear();
    this.emitParticipants();

    this.mode = null;
    this.sessionId = null;
    this.inviteSecret = null;
    this.emitStatus("Session stopped");
  }

  async decideJoinRequest({ requestId, accepted }) {
    const pending = this.pendingRequests.get(requestId);
    if (!pending) {
      return;
    }

    this.pendingRequests.delete(requestId);

    let workspacePath = this.getWorkspaceRoot();
    let remoteUrl = null;

    if (accepted) {
      remoteUrl = await this.getGitRemoteUrl(workspacePath);
      this.participants.set("guest", {
        id: "guest",
        name: pending.displayName,
        role: "guest"
      });
      this.emitParticipants();
    }

    this.sendToSocket(pending.socket, {
      type: EVENTS.JOIN_DECISION,
      accepted,
      sessionId: this.sessionId,
      workspacePath,
      remoteUrl,
      reason: accepted ? null : "Host rejected request"
    });

    this.emitStatus(accepted ? `Approved ${pending.displayName}` : `Rejected ${pending.displayName}`);
  }

  async sendChat(text) {
    if (!text?.trim()) {
      return;
    }

    const message = {
      type: EVENTS.CHAT_MESSAGE,
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      user: this.displayName,
      text: text.trim(),
      id: createSessionId()
    };

    await this.persistChatMessage(message);
    this.emit("chat-message", message);
    this.sendToPeer(message);
  }

  sendRtcSignal(signal) {
    this.sendToPeer({
      type: EVENTS.RTC_SIGNAL,
      sessionId: this.sessionId,
      from: this.displayName,
      signal
    });
  }

  sendSyncMessage(message) {
    this.sendToPeer({
      ...message,
      sessionId: this.sessionId,
      role: this.mode
    });
  }

  handleHostMessage(socket, rawData) {
    const message = this.parse(rawData);
    if (!message) {
      return;
    }

    if (message.type === EVENTS.JOIN_REQUEST) {
      if (this.inviteOnlyMode && message.inviteSecret !== this.inviteSecret) {
        this.sendToSocket(socket, {
          type: EVENTS.JOIN_DECISION,
          accepted: false,
          reason: "Invite-only is enabled. Ask host for private invite link."
        });
        return;
      }

      this.pendingRequests.set(message.requestId, {
        socket,
        displayName: message.displayName
      });

      this.emit("join-request", {
        requestId: message.requestId,
        displayName: message.displayName
      });
      return;
    }

    if (!this.peerSocket) {
      this.peerSocket = socket;
    }

    this.handleSharedMessage(message);
  }

  async handleGuestMessage(rawData) {
    const message = this.parse(rawData);
    if (!message) {
      return;
    }

    if (message.type === EVENTS.JOIN_DECISION) {
      if (!message.accepted) {
        this.emit("join-rejected", message.reason || "Host rejected join request");
        return;
      }

      this.participants.set("host", {
        id: "host",
        name: "Host",
        role: "host"
      });
      this.participants.set("guest", {
        id: "guest",
        name: this.displayName,
        role: "guest"
      });
      this.emitParticipants();

      await this.ensureWorkspaceForGuest(message);
      this.emit("join-accepted", message.workspacePath || this.getWorkspaceRoot());
      this.emitStatus("Connected to host session");
      return;
    }

    this.handleSharedMessage(message);
  }

  async ensureWorkspaceForGuest(decisionMessage) {
    const currentWorkspace = this.getWorkspaceRoot();
    if (currentWorkspace) {
      return;
    }

    if (!decisionMessage?.remoteUrl) {
      return;
    }

    const baseDir = path.join(os.homedir(), "Multiplayer Code Sessions");
    await fs.promises.mkdir(baseDir, { recursive: true });

    const repoName = path.basename(decisionMessage.remoteUrl).replace(/\.git$/i, "") || "shared-project";
    const targetPath = path.join(baseDir, `${repoName}-${Date.now()}`);

    await execFileAsync("git", ["clone", decisionMessage.remoteUrl, targetPath]);
    decisionMessage.workspacePath = targetPath;
  }

  async handleSharedMessage(message) {
    if (
      message.type === EVENTS.FILE_OPEN ||
      message.type === EVENTS.YJS_UPDATE ||
      message.type === EVENTS.CURSOR_UPDATE
    ) {
      this.emit("sync-message", message);
      return;
    }

    if (message.type === EVENTS.CHAT_MESSAGE) {
      await this.persistChatMessage(message);
      this.emit("chat-message", message);
      return;
    }

    if (message.type === EVENTS.RTC_SIGNAL) {
      this.emit("rtc-signal", message);
      return;
    }
  }

  async persistChatMessage(message) {
    const root = this.getWorkspaceRoot();
    if (!root) {
      return;
    }

    const chatDir = path.join(root, ".multiplayer", "chat");
    const jsonlPath = path.join(chatDir, "events.jsonl");
    const markdownPath = path.join(chatDir, "latest.md");

    await fs.promises.mkdir(chatDir, { recursive: true });
    await fs.promises.appendFile(jsonlPath, `${JSON.stringify(message)}\n`, "utf8");

    const lastLines = await this.readLastMessages(jsonlPath, 200);
    const markdown = ["# Multiplayer Chat", ""].concat(
      lastLines.map((entry) => `- [${entry.timestamp}] **${entry.user}**: ${entry.text}`)
    );

    await fs.promises.writeFile(markdownPath, `${markdown.join("\n")}\n`, "utf8");
  }

  async getRecentChatMessages(maxMessages = 100) {
    const root = this.getWorkspaceRoot();
    if (!root) {
      return [];
    }

    const jsonlPath = path.join(root, ".multiplayer", "chat", "events.jsonl");

    try {
      return await this.readLastMessages(jsonlPath, maxMessages);
    } catch {
      return [];
    }
  }

  async readLastMessages(filePath, maxMessages) {
    const raw = await fs.promises.readFile(filePath, "utf8");
    const lines = raw.trim().split("\n").filter(Boolean);
    return lines.slice(-maxMessages).map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    }).filter(Boolean);
  }

  emitParticipants() {
    this.emit("participants", Array.from(this.participants.values()));
  }

  emitStatus(message) {
    this.emit("status", {
      timestamp: new Date().toISOString(),
      message
    });
  }

  sendToPeer(payload) {
    this.sendToSocket(this.peerSocket, payload);
  }

  sendToSocket(socket, payload) {
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(payload));
    }
  }

  parse(rawData) {
    try {
      const text = Buffer.isBuffer(rawData) ? rawData.toString("utf8") : String(rawData);
      return JSON.parse(text);
    } catch {
      return null;
    }
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

  async getGitRemoteUrl(workspacePath) {
    if (!workspacePath) {
      return null;
    }

    try {
      const { stdout } = await execFileAsync("git", ["-C", workspacePath, "config", "--get", "remote.origin.url"]);
      return stdout.trim() || null;
    } catch {
      return null;
    }
  }
}

module.exports = {
  SessionService
};
