const path = require("node:path");
const vscode = require("vscode");
const WebSocket = require("ws");
const Y = require("yjs");

const { SYNC_EVENTS } = require("@multiplayer/shared/src/index");

const BRIDGE_URL = "ws://127.0.0.1:48765";

let socket = null;
let statusBar = null;
let localRole = "unknown";
let localSessionId = null;
let localWorkspacePath = null;

const docStates = new Map();
let suppressChanges = false;

const remoteCursorType = vscode.window.createTextEditorDecorationType({
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: "#4fc3f7",
  borderRadius: "2px"
});

function activate(context) {
  statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBar.text = "Multiplayer: disconnected";
  statusBar.show();

  context.subscriptions.push(statusBar, remoteCursorType);

  context.subscriptions.push(
    vscode.commands.registerCommand("multiplayer.connectBridge", () => connectBridge(true)),
    vscode.commands.registerCommand("multiplayer.disconnectBridge", disconnectBridge),
    vscode.workspace.onDidChangeTextDocument(onDidChangeTextDocument),
    vscode.window.onDidChangeTextEditorSelection(onDidChangeSelection),
    vscode.workspace.onDidOpenTextDocument(onDidOpenDocument)
  );

  connectBridge(false);
}

function connectBridge(showMessage) {
  if (socket?.readyState === WebSocket.OPEN || socket?.readyState === WebSocket.CONNECTING) {
    return;
  }

  socket = new WebSocket(BRIDGE_URL);

  socket.on("open", () => {
    setStatus("connected");
    send({ type: SYNC_EVENTS.IDE_HELLO, client: "vscode-bridge" });
    if (showMessage) {
      vscode.window.showInformationMessage("Multiplayer bridge connected");
    }
  });

  socket.on("message", (rawData) => {
    const message = parseMessage(rawData);
    if (!message) {
      return;
    }

    handleIncomingMessage(message).catch((error) => {
      vscode.window.showErrorMessage(`Multiplayer message failed: ${error.message}`);
    });
  });

  socket.on("close", () => {
    setStatus("disconnected");
  });

  socket.on("error", (error) => {
    setStatus("error");
    if (showMessage) {
      vscode.window.showErrorMessage(`Multiplayer bridge error: ${error.message}`);
    }
  });
}

function disconnectBridge() {
  if (socket) {
    socket.close();
    socket = null;
  }
  setStatus("disconnected");
}

async function handleIncomingMessage(message) {
  if (message.type === SYNC_EVENTS.IDE_STATUS) {
    localRole = message.role || "unknown";
    localSessionId = message.sessionId || null;
    localWorkspacePath = message.workspacePath || getWorkspaceRoot();
    setStatus(`connected (${localRole})`);
    return;
  }

  if (message.type === SYNC_EVENTS.FILE_OPEN) {
    await applyRemoteFileOpen(message);
    return;
  }

  if (message.type === SYNC_EVENTS.YJS_UPDATE) {
    await applyRemoteYjsUpdate(message);
    return;
  }

  if (message.type === SYNC_EVENTS.CURSOR_UPDATE) {
    await renderRemoteCursor(message);
  }
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

  send({
    type: SYNC_EVENTS.FILE_OPEN,
    relativePath,
    content: document.getText(),
    role: localRole,
    sessionId: localSessionId
  });
}

function onDidChangeSelection(event) {
  if (!event?.textEditor?.document || event.textEditor.document.uri.scheme !== "file") {
    return;
  }

  const relativePath = toRelativePath(event.textEditor.document.uri.fsPath);
  if (!relativePath || !event.selections || event.selections.length === 0) {
    return;
  }

  const selection = event.selections[0];
  send({
    type: SYNC_EVENTS.CURSOR_UPDATE,
    relativePath,
    sessionId: localSessionId,
    role: localRole,
    user: vscode.env.machineId,
    active: {
      line: selection.active.line,
      character: selection.active.character
    },
    anchor: {
      line: selection.anchor.line,
      character: selection.anchor.character
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

  send({
    type: SYNC_EVENTS.YJS_UPDATE,
    sessionId: localSessionId,
    relativePath,
    role: localRole,
    update: Buffer.from(update).toString("base64")
  });
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
    const editor = await vscode.window.showTextDocument(document, { preview: false });

    if (typeof message.content === "string" && document.getText() !== message.content) {
      await replaceEntireDocument(editor, message.content);
    }

    ensureDocState(message.relativePath, message.content || document.getText());
  } catch {
    // If file doesn't exist yet, create it in workspace and then open it.
    const encoder = new TextEncoder();
    await vscode.workspace.fs.writeFile(uri, encoder.encode(message.content || ""));
    const document = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(document, { preview: false });
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
  const update = Buffer.from(message.update, "base64");

  Y.applyUpdate(state.doc, update, "remote");
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
  const targetEditor = vscode.window.visibleTextEditors.find(
    (editor) => editor.document.uri.fsPath === uri.fsPath
  );

  if (!targetEditor) {
    return;
  }

  const position = new vscode.Position(
    message.active.line || 0,
    message.active.character || 0
  );
  const range = new vscode.Range(position, position);

  targetEditor.setDecorations(remoteCursorType, [range]);
}

async function replaceEntireDocument(editor, text) {
  suppressChanges = true;

  try {
    const document = editor.document;
    const end = document.lineCount > 0
      ? document.lineAt(document.lineCount - 1).range.end
      : new vscode.Position(0, 0);
    const fullRange = new vscode.Range(new vscode.Position(0, 0), end);

    await editor.edit((editBuilder) => {
      editBuilder.replace(fullRange, text);
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

function getWorkspaceRoot() {
  return vscode.workspace.workspaceFolders?.[0]?.uri?.fsPath || localWorkspacePath || null;
}

function parseMessage(rawData) {
  try {
    const text = Buffer.isBuffer(rawData) ? rawData.toString("utf8") : String(rawData);
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function send(message) {
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  }
}

function setStatus(value) {
  if (statusBar) {
    statusBar.text = `Multiplayer: ${value}`;
  }
}

function deactivate() {
  disconnectBridge();
}

module.exports = {
  activate,
  deactivate
};
