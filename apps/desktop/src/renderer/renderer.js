const state = {
  hostWorkspacePath: "",
  joinWorkspacePath: "",
  cloneParentPath: "",
  pendingRequests: [],
  inviteOnlyLink: "",
  publicInviteLink: ""
};

const displayNameInput = document.getElementById("displayName");
const hostWorkspacePathInput = document.getElementById("hostWorkspacePath");
const pickHostWorkspaceButton = document.getElementById("pickHostWorkspace");
const hostPortInput = document.getElementById("hostPort");
const inviteOnlyModeInput = document.getElementById("inviteOnlyMode");
const hostButton = document.getElementById("hostButton");

const inviteOnlyLinkInput = document.getElementById("inviteOnlyLink");
const publicInviteLinkInput = document.getElementById("publicInviteLink");
const copyInviteOnlyLinkButton = document.getElementById("copyInviteOnlyLink");
const copyPublicInviteLinkButton = document.getElementById("copyPublicInviteLink");

const joinInviteTextInput = document.getElementById("joinInviteText");
const hasLocalProjectInput = document.getElementById("hasLocalProject");
const localProjectGroup = document.getElementById("localProjectGroup");
const cloneTargetGroup = document.getElementById("cloneTargetGroup");
const joinWorkspacePathInput = document.getElementById("workspacePath");
const pickWorkspaceButton = document.getElementById("pickWorkspace");
const cloneParentPathInput = document.getElementById("cloneParentPath");
const pickCloneParentButton = document.getElementById("pickCloneParent");

const joinButton = document.getElementById("joinButton");
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

function setJoinModeUi() {
  const hasLocalProject = hasLocalProjectInput.checked;
  localProjectGroup.classList.toggle("hidden", !hasLocalProject);
  cloneTargetGroup.classList.toggle("hidden", hasLocalProject);
}

async function copyInvite(value) {
  if (!value) {
    pushStatus("Nothing to copy yet. Start hosting first.");
    return;
  }

  await window.multiplayerApi.copyToClipboard(value);
  pushStatus("Copied invite link to clipboard");
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
  setJoinModeUi();

  window.multiplayerApi.onStatus((entry) => {
    pushStatus(`[${entry.timestamp}] ${entry.message}`);
  });

  window.multiplayerApi.onJoinRequest((request) => {
    state.pendingRequests.push(request);
    renderPendingRequests();
  });

  window.multiplayerApi.onJoinAccepted((payload) => {
    if (payload?.workspacePath) {
      pushStatus(`Join approved. Opening workspace: ${payload.workspacePath}`);
      return;
    }

    pushStatus("Join approved. If VS Code CLI is installed, workspace should open shortly.");
  });

  window.multiplayerApi.onJoinRejected((payload) => {
    pushStatus(payload?.reason || "Join request was rejected by host.");
  });
}

pickHostWorkspaceButton.addEventListener("click", async () => {
  const path = await window.multiplayerApi.pickWorkspace();
  if (!path) {
    return;
  }

  state.hostWorkspacePath = path;
  hostWorkspacePathInput.value = path;
  pushStatus(`Host workspace selected: ${path}`);
});

pickWorkspaceButton.addEventListener("click", async () => {
  const path = await window.multiplayerApi.pickWorkspace();
  if (!path) {
    return;
  }

  state.joinWorkspacePath = path;
  joinWorkspacePathInput.value = path;
  pushStatus(`Local project selected: ${path}`);
});

pickCloneParentButton.addEventListener("click", async () => {
  const path = await window.multiplayerApi.pickWorkspace();
  if (!path) {
    return;
  }

  state.cloneParentPath = path;
  cloneParentPathInput.value = path;
  pushStatus(`Project download location selected: ${path}`);
});

hostButton.addEventListener("click", async () => {
  if (!state.hostWorkspacePath) {
    pushStatus("Select a workspace folder before hosting");
    return;
  }

  const displayName = displayNameInput.value.trim() || "Host";
  await window.multiplayerApi.setDisplayName(displayName);

  const result = await window.multiplayerApi.hostSession({
    workspacePath: state.hostWorkspacePath,
    port: Number(hostPortInput.value) || 3700,
    inviteOnlyMode: inviteOnlyModeInput.checked
  });

  state.inviteOnlyLink = result.inviteOnlyLink;
  state.publicInviteLink = result.publicInviteLink;
  inviteOnlyLinkInput.value = result.inviteOnlyLink;
  publicInviteLinkInput.value = result.publicInviteLink;

  if (result.inviteOnlyMode) {
    pushStatus(`Hosting as ${displayName} in invite-only mode. Share the private invite link.`);
  } else {
    pushStatus(`Hosting as ${displayName}. Open join link is active.`);
  }
});

joinButton.addEventListener("click", async () => {
  const displayName = displayNameInput.value.trim() || "Guest";
  await window.multiplayerApi.setDisplayName(displayName);

  const inviteText = joinInviteTextInput.value.trim();
  const hasLocalProject = hasLocalProjectInput.checked;

  if (!inviteText) {
    pushStatus("Paste an invite link or invite code");
    return;
  }

  if (hasLocalProject && !state.joinWorkspacePath) {
    pushStatus("Select your local project folder to join with your existing checkout");
    return;
  }

  try {
    await window.multiplayerApi.joinSession({
      inviteText,
      displayName,
      workspacePath: hasLocalProject ? state.joinWorkspacePath : null,
      cloneParentPath: hasLocalProject ? null : state.cloneParentPath || null
    });

    pushStatus("Join request submitted");
  } catch (error) {
    pushStatus(`Join failed: ${error.message}`);
  }
});

hasLocalProjectInput.addEventListener("change", setJoinModeUi);

copyInviteOnlyLinkButton.addEventListener("click", async () => {
  await copyInvite(state.inviteOnlyLink);
});

copyPublicInviteLinkButton.addEventListener("click", async () => {
  await copyInvite(state.publicInviteLink);
});

bootstrap();
