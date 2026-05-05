import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

const bootstrap = window.__MP_BOOTSTRAP__ || {};
const vscode = acquireVsCodeApi();

const TAB_ORDER = ["session", "chat", "call"];

function mapInitialTab(raw) {
  const nameMap = { invites: "session", overview: "session" };
  const mapped = nameMap[raw] || raw;
  return TAB_ORDER.includes(mapped) ? mapped : "session";
}

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function createDefaultSessionState() {
  return {
    mode: "idle",
    status: "Ready",
    inviteOnlyMode: null,
    openInviteLink: "",
    privateInviteLink: "",
    publicJoinCode: "",
    publicJoinToken: ""
  };
}

function createDefaultCallUiState() {
  return {
    label: "Idle",
    status: "idle",
    callActive: false,
    startDisabled: false,
    startLabel: "Start Call",
    audioEnabled: true,
    videoEnabled: true,
    audioAvailable: false,
    videoAvailable: false,
    showCameraWarning: false,
    showPermissionDialog: false
  };
}

function getCallStateVariant(label, callActive) {
  const text = String(label || "").toLowerCase();
  if (text.includes("denied") || text.includes("error") || text.includes("failed")) {
    return "state-err";
  }
  if (callActive || text.includes("ready") || text === "connected") {
    return "state-ok";
  }
  if (
    text.includes("only") ||
    text.includes("limited") ||
    text.includes("requesting") ||
    text.includes("starting") ||
    text.includes("calling") ||
    text.includes("ending")
  ) {
    return "state-warn";
  }
  return "";
}

function App() {
  const isChatPopoutSurface = bootstrap.surfaceKind === "chat-popout";
  const [activeTab, setActiveTab] = useState(mapInitialTab(bootstrap.initialView));
  const [sessionState, setSessionState] = useState(createDefaultSessionState());
  const [participants, setParticipants] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [unreadChat, setUnreadChat] = useState(0);
  const [chatPopoutOpen, setChatPopoutOpen] = useState(isChatPopoutSurface);

  const [hostFormOpen, setHostFormOpen] = useState(false);
  const [joinFormOpen, setJoinFormOpen] = useState(false);
  const [hostName, setHostName] = useState("");
  const [hostPort, setHostPort] = useState("3700");
  const [hostInviteOnly, setHostInviteOnly] = useState(true);
  const [joinName, setJoinName] = useState("");
  const [joinInviteText, setJoinInviteText] = useState("");

  const [isOpenInviteVisible, setIsOpenInviteVisible] = useState(false);
  const [copiedState, setCopiedState] = useState({});

  const [callUiState, setCallUiState] = useState(createDefaultCallUiState());

  const hostNameRef = useRef(null);
  const joinNameRef = useRef(null);
  const chatInputRef = useRef(null);

  useEffect(() => {
    vscode.postMessage({ type: "panel-ready" });
  }, []);

  useEffect(() => {
    if (activeTab === "chat") {
      setUnreadChat(0);
    }
  }, [activeTab]);

  useEffect(() => {
    if (sessionState.mode !== "host") {
      setIsOpenInviteVisible(false);
    }
  }, [sessionState.mode]);

  useEffect(() => {
    function onMessage(event) {
      const data = event.data;
      if (!data?.type) {
        return;
      }

      if (data.type === "switch-view") {
        setActiveTab(mapInitialTab(data.payload || "session"));
        return;
      }

      if (data.type === "chat-history") {
        setChatMessages(Array.isArray(data.payload) ? data.payload : []);
        setUnreadChat(0);
        return;
      }

      if (data.type === "chat-message") {
        const payload = data.payload || {};
        setChatMessages((prev) => prev.concat(payload));
        if (activeTab !== "chat") {
          setUnreadChat((prev) => prev + 1);
        }
        return;
      }

      if (data.type === "participants") {
        setParticipants(Array.isArray(data.payload) ? data.payload : []);
        return;
      }

      if (data.type === "session-state") {
        setSessionState((prev) => ({ ...prev, ...(data.payload || {}) }));
        return;
      }

      if (data.type === "status") {
        const text = typeof data.payload === "string" ? data.payload : String(data.payload || "Ready");
        setSessionState((prev) => ({ ...prev, status: text }));
        return;
      }

      if (data.type === "join-request") {
        const request = data.payload || {};
        if (!request.requestId) {
          return;
        }
        setApprovals((prev) => {
          if (prev.some((x) => x.requestId === request.requestId)) {
            return prev;
          }
          return prev.concat(request);
        });
        setActiveTab("session");
        return;
      }

      if (data.type === "chat-popout-state") {
        const open = Boolean(data.payload?.open) || isChatPopoutSurface;
        setChatPopoutOpen(open);
        return;
      }

      if (data.type === "call-helper-state") {
        const status = data.status || "idle";
        const label = data.text || "Idle";

        setCallUiState((prev) => {
          if (status === "starting") {
            return {
              ...prev,
              status,
              label,
              callActive: false,
              startDisabled: true,
              startLabel: "Starting…",
              showCameraWarning: false
            };
          }

          if (status === "media-ready" || status === "call") {
            return {
              ...prev,
              status,
              label,
              callActive: true,
              startDisabled: false,
              startLabel: "End Call",
              audioAvailable: data.hasAudio ?? true,
              videoAvailable: data.hasVideo ?? true,
              audioEnabled: data.audioEnabled ?? (prev.callActive ? prev.audioEnabled : true),
              videoEnabled: data.videoEnabled ?? (prev.callActive ? prev.videoEnabled : true),
              showCameraWarning: data.hasVideo === false,
              showPermissionDialog: false
            };
          }

          if (status === "denied") {
            return {
              ...prev,
              status,
              label,
              callActive: false,
              startDisabled: false,
              startLabel: "Start Call",
              audioAvailable: false,
              videoAvailable: false,
              audioEnabled: true,
              videoEnabled: true,
              showCameraWarning: false,
              showPermissionDialog: true
            };
          }

          if (status === "ended" || status === "error" || status === "not-installed") {
            return {
              ...prev,
              status,
              label,
              callActive: false,
              startDisabled: false,
              startLabel: "Start Call",
              audioAvailable: false,
              videoAvailable: false,
              audioEnabled: true,
              videoEnabled: true,
              showCameraWarning: false
            };
          }

          return {
            ...prev,
            status,
            label,
            startDisabled: false
          };
        });
      }
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [activeTab, isChatPopoutSurface]);

  useEffect(() => {
    if (!chatInputRef.current) {
      return;
    }
    chatInputRef.current.scrollIntoView({ block: "nearest" });
  }, [chatMessages]);

  function withCopiedFlag(key) {
    setCopiedState((prev) => ({ ...prev, [key]: true }));
    window.setTimeout(() => {
      setCopiedState((prev) => ({ ...prev, [key]: false }));
    }, 2000);
  }

  function handleTabChange(nextTab) {
    setActiveTab(mapInitialTab(nextTab));
  }

  function handleHostSubmit() {
    const name = hostName.trim();
    const port = Number(hostPort || "3700");
    if (!name) {
      hostNameRef.current?.focus();
      return;
    }
    if (port < 1024 || port > 65535) {
      return;
    }

    vscode.postMessage({
      type: "host-session",
      name,
      port,
      inviteOnly: hostInviteOnly
    });

    setHostFormOpen(false);
  }

  function handleJoinSubmit() {
    const name = joinName.trim();
    const inviteText = joinInviteText.trim();

    if (!name) {
      joinNameRef.current?.focus();
      return;
    }
    if (!inviteText) {
      return;
    }

    vscode.postMessage({
      type: "join-session",
      name,
      inviteText
    });

    setJoinFormOpen(false);
  }

  function handleSendChat() {
    const text = chatInput.trim();
    if (!text) {
      chatInputRef.current?.focus();
      return;
    }

    vscode.postMessage({ type: "send-chat", text });
    setChatInput("");
    chatInputRef.current?.focus();
  }

  function handleApproval(requestId, accepted) {
    vscode.postMessage({ type: accepted ? "approve-join" : "reject-join", requestId });
    setApprovals((prev) => prev.filter((x) => x.requestId !== requestId));
  }

  function handleStartOrEndCall() {
    if (callUiState.startDisabled) {
      return;
    }

    if (callUiState.callActive) {
      vscode.postMessage({ type: "end-call" });
      setCallUiState((prev) => ({
        ...prev,
        callActive: false,
        startDisabled: true,
        startLabel: "Start Call",
        label: "Ending call…",
        status: "ending",
        audioAvailable: false,
        videoAvailable: false,
      }));
      window.setTimeout(() => {
        setCallUiState((prev) => ({
          ...prev,
          startDisabled: false,
          label: "Idle",
          status: "idle",
        }));
      }, 800);
      return;
    }

    vscode.postMessage({ type: "start-call" });
    setCallUiState((prev) => ({
      ...prev,
      startDisabled: true,
      startLabel: "Starting…",
      label: "Starting call helper…",
      status: "starting"
    }));
  }

  function handleToggleAudio() {
    if (!callUiState.audioAvailable) {
      return;
    }
    const nextAudioEnabled = !callUiState.audioEnabled;
    setCallUiState((prev) => ({ ...prev, audioEnabled: nextAudioEnabled }));
    vscode.postMessage({ type: "call-mute", audio: nextAudioEnabled });
  }

  function handleToggleVideo() {
    if (!callUiState.videoAvailable) {
      return;
    }
    const nextVideoEnabled = !callUiState.videoEnabled;
    setCallUiState((prev) => ({ ...prev, videoEnabled: nextVideoEnabled }));
    vscode.postMessage({ type: "call-video", enabled: nextVideoEnabled });
  }

  const isIdle = sessionState.mode === "idle";
  const isHost = sessionState.mode === "host";
  const isGuest = sessionState.mode === "guest";

  const connectionDotClass = cx("conn-dot", isHost ? "live" : isGuest ? "pending" : "");
  const modeBadgeClass = cx("mode-badge", isHost ? "host" : isGuest ? "guest" : "");

  const sessionLabel = isHost
    ? `Hosting · ${sessionState.status || ""}`
    : isGuest
      ? `Connected as guest · ${sessionState.status || ""}`
      : sessionState.status || "No active session";

  const sessionHint = isHost
    ? "Share private invites with trusted collaborators. Use the public code only when needed."
    : isGuest
      ? "You are connected as a guest."
      : "Host to start a session, or paste an invite to join.";

  const chatControls = {
    canOpen: !isChatPopoutSurface && !chatPopoutOpen,
    canFocus: !isChatPopoutSurface && chatPopoutOpen && activeTab === "chat",
    canDock: isChatPopoutSurface || (!isChatPopoutSurface && chatPopoutOpen && activeTab === "chat")
  };

  const callStateClass = cx("call-dock-state", getCallStateVariant(callUiState.label, callUiState.callActive));

  return (
    <>
      {!isChatPopoutSurface && (
        <nav className="toolbar" role="tablist" aria-label="Multiplayer views">
          {TAB_ORDER.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                className={cx("tab", isActive && "active")}
                data-tab={tab}
                role="tab"
                aria-selected={isActive ? "true" : "false"}
                tabIndex={isActive ? 0 : -1}
                onClick={() => handleTabChange(tab)}
              >
                {tab === "session" ? "Session" : tab === "chat" ? "Chat" : "Call"}
                {tab === "chat" && (
                  <span className={cx("tab-badge", unreadChat > 0 && "show")} aria-label="unread messages">
                    {unreadChat > 9 ? "9+" : unreadChat > 0 ? unreadChat : ""}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      )}

      {!isChatPopoutSurface && (
        <div className="session-bar" id="sessionBar">
          <span className={connectionDotClass} />
          <span className="session-label">{sessionLabel}</span>
          <span className={modeBadgeClass}>{isHost ? "Host" : isGuest ? "Guest" : "Idle"}</span>
        </div>
      )}

      <div className={cx("view", "scroll-area", activeTab === "session" && "active")} data-view="session" id="view-session">
        <div className="section">
          <div className="section-head">
            <span className="section-title">Session</span>
          </div>

          {isIdle ? (
            <div className="row" id="idleActions">
              <button type="button" className="primary flex-1" onClick={() => { setJoinFormOpen(false); setHostFormOpen((v) => !v); }}>Host</button>
              <button type="button" className="secondary flex-1" onClick={() => { setHostFormOpen(false); setJoinFormOpen((v) => !v); }}>Join…</button>
              <button type="button" className="danger" disabled>End</button>
            </div>
          ) : (
            <div className="row" id="liveActions">
              <button type="button" className="danger flex-1" onClick={() => vscode.postMessage({ type: "end-session" })}>End Session</button>
            </div>
          )}

          <p className="hint mt6" id="sessionHint" style={{ padding: 0, fontSize: "11px" }}>{sessionHint}</p>
        </div>

        <div className={cx("inline-form", hostFormOpen && "open")} id="hostForm">
          <span className="form-title">Host a Session</span>
          <div>
            <label className="field-label" htmlFor="hostName">Your display name</label>
            <input id="hostName" ref={hostNameRef} type="text" value={hostName} onChange={(e) => setHostName(e.target.value)} placeholder="e.g. Alex" autoComplete="off" />
          </div>
          <div className="form-row">
            <div>
              <label className="field-label" htmlFor="hostPort">Port</label>
              <input id="hostPort" type="number" value={hostPort} onChange={(e) => setHostPort(e.target.value)} min="1024" max="65535" />
            </div>
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
              <label className="toggle-row">
                <input type="checkbox" checked={hostInviteOnly} onChange={(e) => setHostInviteOnly(e.target.checked)} />
                Invite-only
              </label>
            </div>
          </div>
          <div className="form-actions">
            <button type="button" className="primary flex-1" onClick={handleHostSubmit}>Start Hosting</button>
            <button type="button" className="secondary" onClick={() => setHostFormOpen(false)}>Cancel</button>
          </div>
        </div>

        <div className={cx("inline-form", joinFormOpen && "open")} id="joinForm">
          <span className="form-title">Join a Session</span>
          <div>
            <label className="field-label" htmlFor="joinName">Your display name</label>
            <input id="joinName" ref={joinNameRef} type="text" value={joinName} onChange={(e) => setJoinName(e.target.value)} placeholder="e.g. Alex" autoComplete="off" />
          </div>
          <div>
            <label className="field-label" htmlFor="joinInvite">Invite link, token, or 6-digit code</label>
            <input id="joinInvite" type="text" value={joinInviteText} onChange={(e) => setJoinInviteText(e.target.value)} placeholder="Paste invite, or type host:port#123456" autoComplete="off" />
          </div>
          <div className="form-actions">
            <button type="button" className="primary flex-1" onClick={handleJoinSubmit}>Join</button>
            <button type="button" className="secondary" onClick={() => setJoinFormOpen(false)}>Cancel</button>
          </div>
        </div>

        <div id="approvals">
          {approvals.map((request) => (
            <div key={request.requestId} className="approval-card" data-request-id={request.requestId}>
              <div className="approval-name">{request.displayName || "Someone"}</div>
              <div className="approval-sub">Wants to join your session</div>
              <div className="approval-actions">
                <button type="button" className="primary flex-1" onClick={() => handleApproval(request.requestId, true)}>Approve</button>
                <button type="button" className="danger" onClick={() => handleApproval(request.requestId, false)}>Reject</button>
              </div>
            </div>
          ))}
        </div>

        <div className="divider mt8" />

        <div className="section mt8">
          <div className="section-head">
            <span className="section-title">Participants</span>
            <span id="participantCount" style={{ fontSize: "11px", color: "var(--vscode-descriptionForeground)" }}>{participants.length}</span>
          </div>

          <div id="participants">
            {participants.length === 0 ? (
              <div className="empty" style={{ padding: "10px 0", textAlign: "left" }}>
                <span style={{ color: "var(--vscode-descriptionForeground)", fontSize: "12px" }}>No participants yet.</span>
              </div>
            ) : (
              participants.map((item, index) => (
                <div key={`${item.name || "participant"}-${index}`} className="list-item">
                  <div className="avatar">{(item.name || "?").slice(0, 1)}</div>
                  <span className="item-name">{item.name || "Unknown"}</span>
                  <span className="item-role">{item.role || "member"}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="section" id="inviteSection" style={{ display: isHost ? "" : "none" }}>
          <div className="section-head">
            <span className="section-title">Invites</span>
            <span id="invitePolicy" style={{ fontSize: "10px", color: "var(--vscode-descriptionForeground)" }}>
              {sessionState.inviteOnlyMode == null ? "Policy: n/a" : `Policy: ${sessionState.inviteOnlyMode ? "invite-only" : "open"}`}
            </span>
          </div>

          <div className="invite-card" id="privateInviteCard">
            <div className="invite-card-title">Private invite</div>
            <div className="invite-card-sub">Link stays hidden. Copy only when you are ready to share.</div>
            <div className="row mt6">
              <button
                id="copyPrivateInvite"
                type="button"
                className={cx("primary", copiedState.private && "copied")}
                disabled={!sessionState.privateInviteLink}
                onClick={() => {
                  vscode.postMessage({ type: "copy-invite", kind: "private" });
                  withCopiedFlag("private");
                }}
              >
                {copiedState.private ? "Copied!" : "Copy Private Invite"}
              </button>
            </div>
          </div>

          <div className="invite-card mt8" id="publicInviteCard">
            <div className="invite-card-title">Public join code</div>
            <div className="invite-card-sub">Easy to type. Anyone with this code can request access.</div>
            <div className="code-display mt6">
              <span id="publicJoinCode" className="code-pill">{sessionState.publicJoinCode || "------"}</span>
            </div>
            <div className="invite-actions mt6">
              <button
                id="copyPublicCode"
                type="button"
                className={cx("secondary", "flex-1", copiedState.publicCode && "copied")}
                disabled={!sessionState.publicJoinCode}
                onClick={() => {
                  vscode.postMessage({ type: "copy-invite", kind: "public-code" });
                  withCopiedFlag("publicCode");
                }}
              >
                {copiedState.publicCode ? "Copied!" : "Copy Code"}
              </button>
              <button
                id="copyPublicToken"
                type="button"
                className={cx("secondary", "flex-1", copiedState.publicToken && "copied")}
                disabled={!sessionState.publicJoinToken}
                onClick={() => {
                  vscode.postMessage({ type: "copy-invite", kind: "public-token" });
                  withCopiedFlag("publicToken");
                }}
              >
                {copiedState.publicToken ? "Copied!" : "Copy Token"}
              </button>
            </div>

            <div className="link-row mt6">
              <button
                id="toggleOpenInviteLink"
                type="button"
                className="icon-btn"
                disabled={!sessionState.openInviteLink}
                onClick={() => setIsOpenInviteVisible((v) => !v)}
              >
                {isOpenInviteVisible ? "Hide Link" : "Show Link"}
              </button>
              <input
                id="openInviteLink"
                className="link-input"
                readOnly
                value={sessionState.openInviteLink || ""}
                placeholder="Public link hidden"
                style={{ display: isOpenInviteVisible ? "" : "none" }}
              />
              <button
                id="copyOpenInvite"
                type="button"
                className={cx("icon-btn", copiedState.openInvite && "copied")}
                style={{ display: isOpenInviteVisible ? "" : "none" }}
                disabled={!sessionState.openInviteLink}
                onClick={() => {
                  vscode.postMessage({ type: "copy-invite", kind: "open" });
                  withCopiedFlag("openInvite");
                }}
              >
                {copiedState.openInvite ? "Copied!" : "⎘"}
              </button>
            </div>
          </div>

          <div className="hint mt6" style={{ padding: 0 }}>
            Join accepts full invite links, encoded invite codes, or quick token format: <strong>host:port#123456</strong>.
          </div>
        </div>

        <div className="divider mt8" />
        <div className="section mt8">
          <div className="section-head"><span className="section-title">End Session</span></div>
          <button id="endSession2" type="button" className="danger w-full" disabled={isIdle} onClick={() => vscode.postMessage({ type: "end-session" })}>
            End Session
          </button>
        </div>
      </div>

      <div className={cx("view", "view-chat", activeTab === "chat" && "active")} data-view="chat" id="view-chat">
        <div className="chat-header">
          <span className="chat-header-title">Chat</span>
          <div className="chat-header-actions">
            {chatControls.canOpen && (
              <button id="openChatPopout" type="button" className="icon-btn" onClick={() => vscode.postMessage({ type: "open-chat-popout" })}>
                ⧉
              </button>
            )}
            {chatControls.canFocus && (
              <button id="focusChatPopout" type="button" className="icon-btn" onClick={() => vscode.postMessage({ type: "focus-chat-popout" })}>
                Focus
              </button>
            )}
            {chatControls.canDock && (
              <button id="dockChatPopout" type="button" className="icon-btn" onClick={() => vscode.postMessage({ type: "dock-chat-popout" })}>
                Dock
              </button>
            )}
          </div>
        </div>

        <div className="chat-scroll" id="chatScroll">
          <div className="chat-messages" id="chat">
            {chatMessages.map((message, index) => {
              const timestamp = message.timestamp
                ? new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                : "now";
              return (
                <div key={`${message.timestamp || "chat"}-${index}`} className="chat-msg">
                  <div className="msg-meta">
                    <span className="msg-user">{message.user || "Unknown"}</span>
                    <span className="msg-time">{timestamp}</span>
                  </div>
                  <div className="msg-body">{message.text || ""}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="chat-composer">
          <input
            id="chatInput"
            ref={chatInputRef}
            type="text"
            value={chatInput}
            placeholder="Message everyone…"
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSendChat();
              }
            }}
          />
          <button id="sendChat" type="button" className="primary" onClick={handleSendChat}>Send</button>
        </div>
      </div>

      <div className={cx("view", "scroll-area", activeTab === "call" && "active")} data-view="call" id="view-call">
        <div className={cx("call-dock", callUiState.callActive && "call-active")} id="callDock">
          <div className="call-dock-status-row">
            <span className="call-dock-title">Live Call</span>
            <span id="callState" className={callStateClass}>{callUiState.label}</span>
          </div>

          <div className="call-controls">
            <button id="startCall" type="button" className="primary flex-1" disabled={callUiState.startDisabled} onClick={handleStartOrEndCall}>
              {callUiState.startLabel}
            </button>
            <button
              id="toggleAudio"
              type="button"
              className={cx("secondary", !callUiState.audioEnabled && "active")}
              disabled={!callUiState.audioAvailable}
              onClick={handleToggleAudio}
            >
              {callUiState.audioEnabled ? "Mute" : "Unmute"}
            </button>
            <button
              id="toggleVideo"
              type="button"
              className={cx("secondary", !callUiState.videoEnabled && "active")}
              disabled={!callUiState.videoAvailable}
              onClick={handleToggleVideo}
            >
              {callUiState.videoEnabled ? "Cam Off" : "Cam On"}
            </button>
          </div>

          <div id="camWarn" className={cx("cam-warn", callUiState.showCameraWarning && "show")}>
            Camera denied. Enable access for <strong>Multiplayer Code Helper</strong>
            in System Settings.
            <br />
            <button id="camWarnSettings" type="button" onClick={() => vscode.postMessage({ type: "open-privacy-settings" })}>
              Open Privacy Settings
            </button>
          </div>
        </div>

        <p className="call-footnote">
          Call permissions and media run in the <strong>Multiplayer Call Helper</strong> floating bar app.
          Drag the bar anywhere over VS Code for quick mute, camera, and hang-up controls.
        </p>
      </div>

      <div id="permissionDialog" className="permission-overlay" hidden={!callUiState.showPermissionDialog} aria-modal="true" role="dialog" aria-labelledby="permDialogTitle">
        <div className="permission-card">
          <div className="perm-icon-row" aria-hidden="true">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="40" height="40" rx="9" fill="var(--vscode-focusBorder,#007acc)" opacity="0.18" />
              <text x="50%" y="52%" dominantBaseline="middle" textAnchor="middle" fontSize="9">MIC</text>
            </svg>
          </div>
          <div id="permDialogTitle" className="permission-title">Microphone &amp; Camera Access Denied</div>
          <p className="permission-body">
            The <strong>Multiplayer Code Helper</strong> was denied microphone/camera access.
            Open <strong>Privacy &amp; Security</strong> in System Settings, find <em>Multiplayer Code Helper</em>, and allow it.
            Then click Retry.
          </p>
          <div className="permission-actions">
            <button id="permOpenSettings" type="button" className="perm-btn-allow flex-1" onClick={() => vscode.postMessage({ type: "open-privacy-settings" })}>
              Open Privacy Settings
            </button>
            <button
              id="permRetry"
              type="button"
              className="perm-btn-dont"
              onClick={() => {
                setCallUiState((prev) => ({ ...prev, showPermissionDialog: false, startDisabled: true, startLabel: "Starting…" }));
                vscode.postMessage({ type: "start-call" });
              }}
            >
              Retry
            </button>
            <button
              id="permDismiss"
              type="button"
              className="perm-btn-dont"
              onClick={() => setCallUiState((prev) => ({ ...prev, showPermissionDialog: false, label: "Idle", status: "idle" }))}
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

createRoot(document.getElementById("root")).render(<App />);
