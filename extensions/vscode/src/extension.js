const path = require("node:path");
const vscode = require("vscode");
const Y = require("yjs");

const { EVENTS } = require("./protocol");
const { SessionService } = require("./session-service");
const { MultiplayerViewProvider, sendPanelMessage } = require("./panel");

let statusBar = null;
let panel = null;
let sessionService = null;
let suppressChanges = false;

const docStates = new Map();

const remoteCursorType = vscode.window.createTextEditorDecorationType({
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: "#4fc3f7",
  borderRadius: "2px"
});

function activate(context) {
  statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBar.text = "Multiplayer: idle";
  statusBar.show();

  context.subscriptions.push(
    statusBar,
    remoteCursorType,
    vscode.window.registerWebviewViewProvider("multiplayer.sidePanel", panel, {
      webviewOptions: { retainContextWhenHidden: true }
    })
  );

  sessionService = new SessionService(getWorkspaceRoot);

  panel = new MultiplayerViewProvider({
    onSendChat: async (text) => {
      await sessionService.sendChat(text);
    },
    onRtcSignal: (signal) => {
      sessionService.sendRtcSignal(signal);
    },
    onPanelReady: () => {
      sendPanelMessage(panel, { type: "status", payload: statusBar?.text || "Multiplayer: ready" });
    }
  });

  sessionService.on("status", (entry) => {
    setStatus(entry.message);
    sendPanelMessage(panel, { type: "status", payload: entry.message });
  });

  sessionService.on("join-request", async (request) => {
    const choice = await vscode.window.showInformationMessage(
      `${request.displayName} wants to join your session`,
      "Approve",
      "Reject"
    );

    await sessionService.decideJoinRequest({
      requestId: request.requestId,
      accepted: choice === "Approve"
    });
  });

  sessionService.on("join-rejected", (reason) => {
    vscode.window.showErrorMessage(reason || "Join rejected");
  });

  sessionService.on("join-accepted", async (workspacePath) => {
    if (workspacePath) {
      const uri = vscode.Uri.file(workspacePath);
      await vscode.commands.executeCommand("vscode.openFolder", uri, false);
    }
    vscode.window.showInformationMessage("Multiplayer session connected");
  });

  sessionService.on("participants", (participants) => {
    sendPanelMessage(panel, { type: "participants", payload: participants });
  });

  sessionService.on("chat-message", (message) => {
    sendPanelMessage(panel, { type: "chat-message", payload: message });
  });

  sessionService.on("rtc-signal", (message) => {
    sendPanelMessage(panel, { type: "rtc-signal", payload: message.signal });
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
    vscode.commands.registerCommand("multiplayer.endSession", async () => {
      await sessionService.endSession();
      setStatus("Session stopped");
    }),
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
  editor.setDecorations(remoteCursorType, [new vscode.Range(position, position)]);
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

async function deactivate() {
  if (sessionService) {
    await sessionService.endSession();
  }
}

module.exports = {
  activate,
  deactivate
};
