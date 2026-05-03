const state = {
  workspacePath: "",
  pendingRequests: []
};

const displayNameInput = document.getElementById("displayName");
const workspacePathInput = document.getElementById("workspacePath");
const pickWorkspaceButton = document.getElementById("pickWorkspace");
const hostPortInput = document.getElementById("hostPort");
const hostButton = document.getElementById("hostButton");
const joinInviteCodeInput = document.getElementById("joinInviteCode");
const joinHostAddressInput = document.getElementById("joinHostAddress");
const joinButton = document.getElementById("joinButton");
const inviteCodeNode = document.getElementById("inviteCode");
const inviteAddressNode = document.getElementById("inviteAddress");
const ideListNode = document.getElementById("ideList");
const pendingRequestsNode = document.getElementById("pendingRequests");
const statusLogNode = document.getElementById("statusLog");

function pushStatus(message) {
  const item = document.createElement("li");
  item.textContent = message;
  statusLogNode.prepend(item);
}

function renderIdeList(ides) {
  ideListNode.innerHTML = "";
  ides.forEach((ide) => {
    const item = document.createElement("li");
    item.innerHTML = `<strong>${ide.name}</strong> <span class=\"mono\">${ide.command}</span> ${
      ide.detected ? "detected" : "not detected"
    }`;
    ideListNode.append(item);
  });
}

function renderPendingRequests() {
  pendingRequestsNode.innerHTML = "";

  if (state.pendingRequests.length === 0) {
    const empty = document.createElement("li");
    empty.textContent = "No pending requests";
    pendingRequestsNode.append(empty);
    return;
  }

  state.pendingRequests.forEach((request) => {
    const row = document.createElement("li");
    row.className = "request-row";

    const text = document.createElement("span");
    text.textContent = `${request.displayName} (${request.workspaceName})`;

    const actions = document.createElement("div");
    actions.className = "request-actions";

    const approve = document.createElement("button");
    approve.textContent = "Approve";
    approve.addEventListener("click", async () => {
      await window.multiplayerApi.decideJoinRequest({
        requestId: request.requestId,
        accepted: true
      });

      state.pendingRequests = state.pendingRequests.filter((x) => x.requestId !== request.requestId);
      renderPendingRequests();
    });

    const reject = document.createElement("button");
    reject.textContent = "Reject";
    reject.className = "secondary";
    reject.addEventListener("click", async () => {
      await window.multiplayerApi.decideJoinRequest({
        requestId: request.requestId,
        accepted: false
      });

      state.pendingRequests = state.pendingRequests.filter((x) => x.requestId !== request.requestId);
      renderPendingRequests();
    });

    actions.append(approve, reject);
    row.append(text, actions);
    pendingRequestsNode.append(row);
  });
}

async function bootstrap() {
  const ides = await window.multiplayerApi.listIdes();
  renderIdeList(ides);

  renderPendingRequests();

  window.multiplayerApi.onStatus((entry) => {
    pushStatus(`[${entry.timestamp}] ${entry.message}`);
  });

  window.multiplayerApi.onJoinRequest((request) => {
    state.pendingRequests.push(request);
    renderPendingRequests();
  });

  window.multiplayerApi.onJoinAccepted(() => {
    pushStatus("Join approved. If VS Code CLI is installed, workspace should open shortly.");
  });

  window.multiplayerApi.onJoinRejected(() => {
    pushStatus("Join request was rejected by host.");
  });
}

pickWorkspaceButton.addEventListener("click", async () => {
  const path = await window.multiplayerApi.pickWorkspace();
  if (!path) {
    return;
  }

  state.workspacePath = path;
  workspacePathInput.value = path;
  pushStatus(`Selected workspace: ${path}`);
});

hostButton.addEventListener("click", async () => {
  if (!state.workspacePath) {
    pushStatus("Select a workspace folder before hosting");
    return;
  }

  const displayName = displayNameInput.value.trim() || "Host";
  await window.multiplayerApi.setDisplayName(displayName);

  const result = await window.multiplayerApi.hostSession({
    workspacePath: state.workspacePath,
    port: Number(hostPortInput.value) || 3700
  });

  inviteCodeNode.textContent = `Invite Code: ${result.inviteCode}`;
  inviteAddressNode.textContent = `Address: ${result.invite.host}:${result.invite.port}:${result.invite.sessionId}`;

  pushStatus(`Hosting as ${displayName}`);
});

joinButton.addEventListener("click", async () => {
  if (!state.workspacePath) {
    pushStatus("Select a local workspace folder before joining");
    return;
  }

  const displayName = displayNameInput.value.trim() || "Guest";
  await window.multiplayerApi.setDisplayName(displayName);

  const inviteCode = joinInviteCodeInput.value.trim();
  const hostAddress = joinHostAddressInput.value.trim();

  if (!inviteCode && !hostAddress) {
    pushStatus("Enter invite code or fallback host address");
    return;
  }

  try {
    await window.multiplayerApi.joinSession({
      inviteCode,
      hostAddress,
      displayName,
      workspacePath: state.workspacePath
    });
    pushStatus("Join request submitted");
  } catch (error) {
    pushStatus(`Join failed: ${error.message}`);
  }
});

bootstrap();
