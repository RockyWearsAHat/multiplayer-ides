"use strict";

// ── Multiplayer Code Helper — renderer process ───────────────────────────────
//
// This runs inside the helper's BrowserWindow (not VS Code).
// Because this is a standalone Electron app, navigator.mediaDevices.getUserMedia
// triggers the REAL macOS system permission dialog:
//   "Multiplayer Code Helper would like to access your microphone"
//
// The user explicitly grants permission to THIS app — transparent, correct,
// and privacy-respecting by design.
// ─────────────────────────────────────────────────────────────────────────────

const statusDetail = document.getElementById("statusDetail");
const statusDot = document.getElementById("statusDot");
const muteBtn = document.getElementById("muteBtn");
const camBtn = document.getElementById("camBtn");
const endBtn = document.getElementById("endBtn");

let localStream = null;
let pc = null;
let audioEnabled = true;
let videoEnabled = true;
let audioAvailable = false;
let videoAvailable = false;

function setStatus(text, active = false) {
  statusDetail.textContent = text;
  statusDot.classList.toggle("live", active);
}

function pushControlState(label) {
  callHelper.send({
    type: "call-controls",
    label,
    audioEnabled,
    videoEnabled,
    hasAudio: audioAvailable,
    hasVideo: videoAvailable,
  });
}

function updateControls() {
  muteBtn.disabled = !audioAvailable;
  camBtn.disabled = !videoAvailable;
  endBtn.disabled = !localStream;

  muteBtn.textContent = audioEnabled ? "Mute" : "Unmute";
  muteBtn.classList.toggle("off", !audioEnabled);
  muteBtn.classList.toggle("warn", !audioEnabled);

  camBtn.textContent = videoEnabled ? "Cam Off" : "Cam On";
  camBtn.classList.toggle("off", !videoEnabled);
  camBtn.classList.toggle("warn", !videoEnabled);
}

// ── WebRTC peer connection ────────────────────────────────────────────────────
function ensurePeerConnection() {
  if (pc) { return pc; }

  pc = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  });

  pc.onicecandidate = (e) => {
    if (e.candidate) {
      callHelper.send({
        type: "rtc-signal",
        signal: { type: "ice", candidate: e.candidate },
      });
    }
  };

  pc.onconnectionstatechange = () => {
    const s = pc.connectionState;
    if (s === "connected") {
      setStatus("Connected", true);
    } else {
      setStatus(s, false);
    }
    pushControlState(s);
    callHelper.send({ type: "call-state", text: s, connected: s === "connected" });
  };

  pc.ontrack = () => {
    setStatus("Connected", true);
    pushControlState("Connected");
  };

  if (localStream) {
    for (const track of localStream.getTracks()) {
      pc.addTrack(track, localStream);
    }
  }

  return pc;
}

// ── Request mic + camera — this fires the real macOS permission dialog ────────
async function startMedia(preferredConstraints = null) {
  setStatus("Requesting…", false);
  updateControls();

  let attempts;
  if (preferredConstraints) {
    // Main process already resolved what permissions are available.
    // Avoid requesting denied tracks again, which can lead to silent fallbacks.
    const hasAudio = Boolean(preferredConstraints.audio);
    const hasVideo = Boolean(preferredConstraints.video);
    attempts = [];
    if (hasAudio && hasVideo) {
      attempts.push({ constraints: { audio: true, video: true }, label: "Audio & video ready", hasAudio: true, hasVideo: true });
      attempts.push({ constraints: { audio: true, video: false }, label: "Audio only · camera denied", hasAudio: true, hasVideo: false });
      attempts.push({ constraints: { audio: false, video: true }, label: "Video only · mic denied", hasAudio: false, hasVideo: true });
    } else if (hasAudio) {
      attempts.push({ constraints: { audio: true, video: false }, label: "Audio only · camera denied", hasAudio: true, hasVideo: false });
    } else if (hasVideo) {
      attempts.push({ constraints: { audio: false, video: true }, label: "Video only · mic denied", hasAudio: false, hasVideo: true });
    }
  } else {
    // Try audio+video first, then degrade gracefully.
    attempts = [
      { constraints: { audio: true, video: true },  label: "Audio & video ready",  hasAudio: true,  hasVideo: true  },
      { constraints: { audio: true, video: false }, label: "Audio only · camera unavailable", hasAudio: true,  hasVideo: false },
      { constraints: { audio: false, video: true }, label: "Video only · mic unavailable",    hasAudio: false, hasVideo: true  },
    ];
  }

  if (!attempts.length) {
    audioAvailable = false;
    videoAvailable = false;
    setStatus("Denied", false);
    pushControlState("Denied");
    updateControls();
    callHelper.send({ type: "media-denied" });
    return;
  }

  let lastError = null;

  for (const attempt of attempts) {
    try {
      localStream = await navigator.mediaDevices.getUserMedia(attempt.constraints);
      audioAvailable = localStream.getAudioTracks().length > 0;
      videoAvailable = localStream.getVideoTracks().length > 0;
      audioEnabled = audioAvailable;
      videoEnabled = videoAvailable;
      setStatus("Media ready", true);
      updateControls();
      pushControlState(attempt.label);

      callHelper.send({
        type: "media-ready",
        label: attempt.label,
        hasAudio: attempt.hasAudio,
        hasVideo: attempt.hasVideo,
      });

      return;
    } catch (err) {
      lastError = err;
      // Only hard-stop if BOTH audio and video were requested and the user
      // explicitly denied both (pure access denial with no fallback possible).
      // If we were already trying audio-only or video-only, stop immediately.
      const isDenied = err.name === "NotAllowedError" || err.name === "PermissionDeniedError";
      const wasAudioVideoCombo = attempt.constraints.audio && attempt.constraints.video;
      if (isDenied && !wasAudioVideoCombo) {
        // Single-track denial — no further fallback makes sense
        break;
      }
      // For audio+video combos, fall through to try less permissive constraints
    }
  }

  const denied =
    lastError?.name === "NotAllowedError" ||
    lastError?.name === "PermissionDeniedError";

  if (denied) {
    audioAvailable = false;
    videoAvailable = false;
    setStatus("Denied", false);
    updateControls();
    pushControlState("Denied");
    callHelper.send({ type: "media-denied" });
  } else {
    const msg = lastError?.message || "Unknown error";
    audioAvailable = false;
    videoAvailable = false;
    updateControls();
    setStatus("Error", false);
    pushControlState("Error");
    callHelper.send({ type: "media-error", message: msg });
  }
}

// ── Start a call (caller side — send offer) ───────────────────────────────────
async function startCall(preferredConstraints = null) {
  await startMedia(preferredConstraints);
  if (!localStream) { return; }

  const conn = ensurePeerConnection();
  const offer = await conn.createOffer();
  await conn.setLocalDescription(offer);

  callHelper.send({
    type: "rtc-signal",
    signal: { type: "offer", sdp: offer },
  });

  setStatus("Calling…", true);
  updateControls();
  pushControlState("Calling…");
}

// ── Handle incoming RTC signal from remote peer ───────────────────────────────
async function handleRtcSignal(signal) {
  if (!signal) { return; }

  // Answerer path — we receive an offer before media is ready
  if (!localStream) { await startMedia(); }
  if (!localStream) { return; }

  const conn = ensurePeerConnection();

  if (signal.type === "offer") {
    await conn.setRemoteDescription(new RTCSessionDescription(signal.sdp));
    const answer = await conn.createAnswer();
    await conn.setLocalDescription(answer);
    callHelper.send({
      type: "rtc-signal",
      signal: { type: "answer", sdp: answer },
    });
    setStatus("Answering…", true);
    pushControlState("Answering…");
    return;
  }

  if (signal.type === "answer") {
    await conn.setRemoteDescription(new RTCSessionDescription(signal.sdp));
    return;
  }

  if (signal.type === "ice" && signal.candidate) {
    try { await conn.addIceCandidate(new RTCIceCandidate(signal.candidate)); } catch { /* out-of-order */ }
  }
}

// ── Tear everything down ──────────────────────────────────────────────────────
function endCall() {
  if (localStream) {
    for (const t of localStream.getTracks()) { t.stop(); }
    localStream = null;
  }
  if (pc) {
    pc.close();
    pc = null;
  }

  audioAvailable = false;
  videoAvailable = false;
  audioEnabled = true;
  videoEnabled = true;

  setStatus("Idle", false);
  updateControls();
  pushControlState("Idle");
}

function toggleAudio() {
  if (!localStream || !audioAvailable) {
    return;
  }
  audioEnabled = !audioEnabled;
  for (const track of localStream.getAudioTracks()) {
    track.enabled = audioEnabled;
  }
  callHelper.send({ type: "mute", audio: audioEnabled });
  updateControls();
  pushControlState(audioEnabled ? "Mic on" : "Muted");
}

function toggleVideo() {
  if (!localStream || !videoAvailable) {
    return;
  }
  videoEnabled = !videoEnabled;
  for (const track of localStream.getVideoTracks()) {
    track.enabled = videoEnabled;
  }
  callHelper.send({ type: "video", enabled: videoEnabled });
  updateControls();
  pushControlState(videoEnabled ? "Cam on" : "Cam off");
}

function hangUpFromBar() {
  if (!localStream && !pc) {
    return;
  }
  callHelper.send({ type: "call-ended" });
  callHelper.closeWindow();
}

// ── Message bus: extension → renderer ────────────────────────────────────────
callHelper.onMessage((msg) => {
  if (!msg?.type) { return; }

  if (msg.type === "start-call") {
    startCall(msg.constraints || null).catch((e) => {
      const text = e?.message || String(e);
      setStatus("Error", false);
      pushControlState("Error");
      callHelper.send({ type: "media-error", message: text });
    });
    return;
  }

  if (msg.type === "rtc-signal") {
    handleRtcSignal(msg.signal).catch(() => {});
    return;
  }

  if (msg.type === "end-call") {
    endCall();
    return;
  }

  if (msg.type === "mute") {
    if (localStream) {
      for (const t of localStream.getAudioTracks()) { t.enabled = Boolean(msg.audio); }
      audioEnabled = Boolean(msg.audio);
      updateControls();
      pushControlState(audioEnabled ? "Mic on" : "Muted");
    }
    return;
  }

  if (msg.type === "video") {
    if (localStream) {
      for (const t of localStream.getVideoTracks()) { t.enabled = Boolean(msg.enabled); }
      videoEnabled = Boolean(msg.enabled);
      updateControls();
      pushControlState(videoEnabled ? "Cam on" : "Cam off");
    }
    return;
  }
});

muteBtn.addEventListener("click", toggleAudio);
camBtn.addEventListener("click", toggleVideo);
endBtn.addEventListener("click", hangUpFromBar);
updateControls();

// ── Boot ──────────────────────────────────────────────────────────────────────
// Tell main.js the renderer is ready — this triggers the IPC connection to
// the extension and then immediately sends "start-call" via the helper-ready flow.
callHelper.ready();
