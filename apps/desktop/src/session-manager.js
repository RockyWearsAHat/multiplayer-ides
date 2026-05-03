const EventEmitter = require("node:events");
const { exec, execFile } = require("node:child_process");
const { randomUUID, randomBytes } = require("node:crypto");
const os = require("node:os");
const path = require("node:path");
const fs = require("node:fs");
const { promisify } = require("node:util");
const WebSocket = require("ws");

const {
  CONTROL_EVENTS,
  SYNC_EVENTS,
  ROLES,
  toInviteCode,
  fromInviteCode
} = require("@multiplayer/shared/src/index");

const execFileAsync = promisify(execFile);
const SNAPSHOT_CHUNK_SIZE = 192 * 1024;

class SessionManager extends EventEmitter {
  constructor() {
    super();
    this.mode = null;
    this.sessionId = null;
    this.displayName = "Anonymous";
    this.workspacePath = null;

    this.hostControlServer = null;
    this.hostControlPort = null;
    this.inviteSecret = null;
    this.inviteOnlyMode = true;

    this.hostControlPeer = null;
    this.guestControlSocket = null;

    this.localIdeServer = null;
    this.localIdeSocket = null;

    this.pendingRequests = new Map();
    this.pendingSnapshots = new Map();

    this.cloneParentPath = null;
    this.preferredWorkspacePath = null;
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

  async hostSession({ workspacePath, port = 3700, inviteOnlyMode = true }) {
    this.mode = ROLES.HOST;
    this.sessionId = randomUUID();
    this.workspacePath = workspacePath;
    this.inviteSecret = randomBytes(16).toString("hex");
    this.inviteOnlyMode = Boolean(inviteOnlyMode);

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

    const inviteBase = {
      host: this.getPrimaryHostAddress(),
      port,
      sessionId: this.sessionId
    };

    const publicInviteCode = toInviteCode(inviteBase);
    const privateInviteCode = toInviteCode({
      ...inviteBase,
      inviteSecret: this.inviteSecret
    });

    this.emitStatus(`Hosting session ${this.sessionId} on ws://0.0.0.0:${port}`);

    return {
      sessionId: this.sessionId,
      invite: inviteBase,
      publicInviteCode,
      inviteOnlyCode: privateInviteCode,
      publicInviteLink: this.toInviteLink(publicInviteCode),
      inviteOnlyLink: this.toInviteLink(privateInviteCode),
      inviteOnlyMode: this.inviteOnlyMode
    };
  }

  async joinSession({ inviteText, displayName, workspacePath, cloneParentPath }) {
    this.mode = ROLES.GUEST;
    this.workspacePath = workspacePath;
    this.preferredWorkspacePath = workspacePath || null;
    this.cloneParentPath = cloneParentPath || null;
    this.startLocalIdeBridge();

    const invite = this.parseInviteInput(inviteText);
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
    const guestCanUseGit = await this.hasGitInstalled();

    socket.on("message", (data) => this.handleGuestControlMessage(data));
    socket.on("close", () => this.emitStatus("Disconnected from host"));

    this.sendToControl(socket, {
      type: CONTROL_EVENTS.JOIN_REQUEST,
      sessionId: this.sessionId,
      requestId: randomUUID(),
      displayName: displayName || this.displayName,
      workspaceName: path.basename(workspacePath || cloneParentPath || "guest-workspace"),
      inviteSecret: invite.inviteSecret || null,
      requestClone: !workspacePath,
      cloneParentPath: cloneParentPath || null,
      guestCanUseGit
    });

    this.emitStatus(`Join request sent to ${url}`);
  }

  decideJoinRequest({ requestId, accepted }) {
    const request = this.pendingRequests.get(requestId);
    if (!request) {
      return;
    }

    this.pendingRequests.delete(requestId);

    const remoteUrl = this.getGitRemoteUrl(this.workspacePath);

    this.sendToControl(request.socket, {
      type: CONTROL_EVENTS.JOIN_DECISION,
      requestId,
      accepted,
      sessionId: this.sessionId,
      workspacePath: request.requestClone ? null : this.workspacePath,
      clonePlan: {
        requestClone: request.requestClone,
        workspaceName: path.basename(this.workspacePath || "shared-workspace"),
        remoteUrl: remoteUrl || null
      }
    });

    if (accepted) {
      this.hostControlPeer = request.socket;
      this.emitStatus(`Accepted guest ${request.displayName}`);
      this.emit("guest-accepted", { displayName: request.displayName });

      if (request.requestClone) {
        this.sendBestWorkspaceTransfer(request).catch((error) => {
          this.emitStatus(`Workspace transfer failed: ${error.message}`);
          this.sendToControl(request.socket, {
            type: CONTROL_EVENTS.TRANSFER_ERROR,
            message: `Workspace transfer failed: ${error.message}`
          });
        });
      }
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

      if (this.inviteOnlyMode && message.inviteSecret !== this.inviteSecret) {
        this.sendToControl(socket, {
          type: CONTROL_EVENTS.JOIN_DECISION,
          requestId: message.requestId,
          accepted: false,
          reason: "This host is currently invite-only. Ask for a fresh invite link."
        });
        this.emitStatus(`Blocked join request from ${message.displayName} (invite-only mode)`);
        return;
      }

      this.pendingRequests.set(message.requestId, {
        socket,
        displayName: message.displayName,
        requestClone: Boolean(message.requestClone),
        cloneParentPath: message.cloneParentPath || null,
        guestCanUseGit: Boolean(message.guestCanUseGit)
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
        const reason = message.reason || "Host rejected join request";
        this.emitStatus(reason);
        this.emit("join-rejected", { reason });
        return;
      }

      this.emitStatus("Host accepted join request");

      const clonePlan = message.clonePlan || {};
      if (clonePlan.requestClone) {
        this.emitStatus("Preparing secure project transfer from host...");
        return;
      }

      const finalWorkspacePath = this.preferredWorkspacePath || this.workspacePath;
      this.emit("join-accepted", {
        workspacePath: finalWorkspacePath
      });
      this.launchVsCode(finalWorkspacePath);
      return;
    }

    if (message.type === CONTROL_EVENTS.SNAPSHOT_META) {
      this.pendingSnapshots.set(message.transferId, {
        transferKind: message.transferKind || "workspace-snapshot",
        workspaceName: message.workspaceName,
        totalChunks: message.totalChunks,
        chunks: new Array(message.totalChunks).fill(null)
      });

      const transferLabel = message.transferKind === "git-bundle" ? "fast git bundle" : "workspace snapshot";
      this.emitStatus(`Receiving ${transferLabel} (${message.totalChunks} chunks)...`);
      return;
    }

    if (message.type === CONTROL_EVENTS.SNAPSHOT_CHUNK) {
      const snapshot = this.pendingSnapshots.get(message.transferId);
      if (!snapshot || message.chunkIndex < 0 || message.chunkIndex >= snapshot.totalChunks) {
        return;
      }

      snapshot.chunks[message.chunkIndex] = message.chunk;
      return;
    }

    if (message.type === CONTROL_EVENTS.SNAPSHOT_COMPLETE) {
      this.materializeSnapshot(message.transferId).catch((error) => {
        this.emitStatus(`Failed to apply workspace snapshot: ${error.message}`);
        this.emit("join-rejected", {
          reason: `Workspace transfer failed: ${error.message}`
        });
      });
      return;
    }

    if (message.type === CONTROL_EVENTS.TRANSFER_ERROR) {
      this.emitStatus(message.message || "Host transfer failed");
      this.emit("join-rejected", {
        reason: message.message || "Host transfer failed"
      });
      return;
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

  toInviteLink(code) {
    return `multiplayercode://join?code=${encodeURIComponent(code)}`;
  }

  parseInviteInput(value) {
    if (!value) {
      return null;
    }

    const trimmed = value.trim();
    try {
      if (trimmed.includes("://")) {
        const url = new URL(trimmed);
        const codeFromQuery = url.searchParams.get("code");
        if (codeFromQuery) {
          return fromInviteCode(codeFromQuery);
        }
      }
    } catch {
      // Fall back to raw invite code parsing.
    }

    try {
      return fromInviteCode(trimmed);
    } catch {
      return this.parseHostAddress(trimmed);
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

  async sendWorkspaceSnapshot(request) {
    const transferId = randomUUID();
    const archivePath = path.join(os.tmpdir(), `multiplayer-snapshot-${transferId}.tar.gz`);
    await execFileAsync("tar", [
      "-czf",
      archivePath,
      "--exclude=node_modules",
      "--exclude=.DS_Store",
      "-C",
      this.workspacePath,
      "."
    ]);

    try {
      const archiveBuffer = await fs.promises.readFile(archivePath);
      const archiveBase64 = archiveBuffer.toString("base64");
      const totalChunks = Math.ceil(archiveBase64.length / SNAPSHOT_CHUNK_SIZE);

      this.sendToControl(request.socket, {
        type: CONTROL_EVENTS.SNAPSHOT_META,
        transferId,
        workspaceName: path.basename(this.workspacePath || "shared-workspace"),
        transferKind: "workspace-snapshot",
        totalChunks
      });

      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex += 1) {
        const start = chunkIndex * SNAPSHOT_CHUNK_SIZE;
        const end = start + SNAPSHOT_CHUNK_SIZE;
        const chunk = archiveBase64.slice(start, end);

        this.sendToControl(request.socket, {
          type: CONTROL_EVENTS.SNAPSHOT_CHUNK,
          transferId,
          chunkIndex,
          chunk
        });
      }

      this.sendToControl(request.socket, {
        type: CONTROL_EVENTS.SNAPSHOT_COMPLETE,
        transferId
      });

      this.emitStatus(`Workspace snapshot sent to ${request.displayName}`);
    } finally {
      await fs.promises.rm(archivePath, { force: true });
    }
  }

  async materializeSnapshot(transferId) {
    const snapshot = this.pendingSnapshots.get(transferId);
    if (!snapshot) {
      throw new Error("Snapshot transfer not found");
    }

    if (snapshot.chunks.some((chunk) => chunk === null)) {
      throw new Error("Snapshot transfer is incomplete");
    }

    if (snapshot.transferKind === "git-bundle") {
      await this.materializeGitBundleTransfer(transferId, snapshot);
      return;
    }

    await this.materializeArchiveSnapshotTransfer(transferId, snapshot);
  }

  async materializeArchiveSnapshotTransfer(transferId, snapshot) {
    const archiveBuffer = Buffer.from(snapshot.chunks.join(""), "base64");
    const targetPath = await this.resolveGuestTargetPath(snapshot.workspaceName);
    const archivePath = path.join(os.tmpdir(), `multiplayer-guest-snapshot-${transferId}.tar.gz`);

    await fs.promises.writeFile(archivePath, archiveBuffer);

    try {
      await execFileAsync("tar", ["-xzf", archivePath, "-C", targetPath]);
    } finally {
      await fs.promises.rm(archivePath, { force: true });
    }

    this.pendingSnapshots.delete(transferId);
    this.workspacePath = targetPath;
    this.emitStatus(`Workspace downloaded to ${targetPath}`);
    this.emit("join-accepted", { workspacePath: targetPath });
    this.launchVsCode(targetPath);
  }

  async materializeGitBundleTransfer(transferId, snapshot) {
    const bundleBuffer = Buffer.from(snapshot.chunks.join(""), "base64");
    const targetPath = await this.resolveGuestTargetPath(snapshot.workspaceName);
    const bundlePath = path.join(os.tmpdir(), `multiplayer-guest-${transferId}.bundle`);

    await fs.promises.writeFile(bundlePath, bundleBuffer);

    try {
      await execFileAsync("git", ["clone", bundlePath, targetPath]);
    } finally {
      await fs.promises.rm(bundlePath, { force: true });
    }

    this.pendingSnapshots.delete(transferId);
    this.workspacePath = targetPath;
    this.emitStatus(`Workspace cloned via fast git transfer to ${targetPath}`);
    this.emit("join-accepted", { workspacePath: targetPath });
    this.launchVsCode(targetPath);
  }

  async resolveGuestTargetPath(workspaceName) {
    const workspaceRoot = this.cloneParentPath || path.join(os.homedir(), "Multiplayer Code Sessions");
    const safeWorkspaceName = (workspaceName || "shared-workspace").replace(/[^a-zA-Z0-9._-]/g, "-");

    await fs.promises.mkdir(workspaceRoot, { recursive: true });

    let targetPath = path.join(workspaceRoot, safeWorkspaceName);
    if (fs.existsSync(targetPath)) {
      targetPath = path.join(workspaceRoot, `${safeWorkspaceName}-${Date.now()}`);
    }

    await fs.promises.mkdir(targetPath, { recursive: true });
    return targetPath;
  }

  async sendBestWorkspaceTransfer(request) {
    if (request.guestCanUseGit && (await this.canUseFastGitTransfer())) {
      try {
        await this.sendWorkspaceGitBundle(request);
        return;
      } catch (error) {
        this.emitStatus(`Fast git transfer unavailable: ${error.message}. Falling back to snapshot.`);
      }
    }

    await this.sendWorkspaceSnapshot(request);
  }

  async sendWorkspaceGitBundle(request) {
    const transferId = randomUUID();
    const bundlePath = path.join(os.tmpdir(), `multiplayer-host-${transferId}.bundle`);

    await execFileAsync("git", ["-C", this.workspacePath, "bundle", "create", bundlePath, "HEAD"]);

    try {
      const bundleBuffer = await fs.promises.readFile(bundlePath);
      const bundleBase64 = bundleBuffer.toString("base64");
      const totalChunks = Math.ceil(bundleBase64.length / SNAPSHOT_CHUNK_SIZE);

      this.sendToControl(request.socket, {
        type: CONTROL_EVENTS.SNAPSHOT_META,
        transferId,
        workspaceName: path.basename(this.workspacePath || "shared-workspace"),
        transferKind: "git-bundle",
        totalChunks
      });

      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex += 1) {
        const start = chunkIndex * SNAPSHOT_CHUNK_SIZE;
        const end = start + SNAPSHOT_CHUNK_SIZE;
        const chunk = bundleBase64.slice(start, end);

        this.sendToControl(request.socket, {
          type: CONTROL_EVENTS.SNAPSHOT_CHUNK,
          transferId,
          chunkIndex,
          chunk
        });
      }

      this.sendToControl(request.socket, {
        type: CONTROL_EVENTS.SNAPSHOT_COMPLETE,
        transferId
      });

      this.emitStatus(`Fast git transfer sent to ${request.displayName}`);
    } finally {
      await fs.promises.rm(bundlePath, { force: true });
    }
  }

  async canUseFastGitTransfer() {
    if (!this.workspacePath || !fs.existsSync(path.join(this.workspacePath, ".git"))) {
      return false;
    }

    if (!(await this.hasGitInstalled())) {
      return false;
    }

    try {
      const { stdout } = await execFileAsync("git", ["-C", this.workspacePath, "status", "--porcelain"]);
      return stdout.trim().length === 0;
    } catch {
      return false;
    }
  }

  async hasGitInstalled() {
    try {
      await execFileAsync("git", ["--version"]);
      return true;
    } catch {
      return false;
    }
  }

  getGitRemoteUrl(workspacePath) {
    if (!workspacePath || !fs.existsSync(workspacePath)) {
      return null;
    }

    const gitConfigPath = path.join(workspacePath, ".git", "config");
    if (!fs.existsSync(gitConfigPath)) {
      return null;
    }

    try {
      const gitConfig = fs.readFileSync(gitConfigPath, "utf8");
      const remoteMatch = gitConfig.match(/\[remote\s+"origin"\][\s\S]*?url\s*=\s*(.+)/);
      return remoteMatch?.[1]?.trim() || null;
    } catch {
      return null;
    }
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
