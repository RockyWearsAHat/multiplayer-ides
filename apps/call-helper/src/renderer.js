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

const banner       = document.getElementById("banner");
const statusBadge  = document.getElementById("statusBadge");
const statusDot    = document.getElementById("statusDot");
const localVideo   = document.getElementById("localVideo");
const remoteVideo  = document.getElementById("remoteVideo");
const localPlaceholder  = document.getElementById("localPlaceholder");
const remotePlaceholder = document.getElementById("remotePlaceholder");

let localStream = null;
let pc = null;
let audioEnabled = true;
let videoEnabled = true;

function setBanner(text, variant = "") {
  banner.textContent = text;
  banner.className = variant;
}

function setStatus(text, active = false) {
  statusBadge.textContent = text;
  statusDot.classList.toggle("inactive", !active);
}

function showLocalVideo(stream) {
  localVideo.srcObject = stream;
  localVideo.style.display = "block";
  localPlaceholder.style.display = "none";
}

function showRemoteVideo(stream) {
  remoteVideo.srcObject = stream;
  remoteVideo.style.display = "block";
  remotePlaceholder.style.display = "none";
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
      setBanner("Call connected", "ok");
    } else {
      setStatus(s, false);
    }
    callHelper.send({ type: "call-state", text: s, connected: s === "connected" });
  };

  pc.ontrack = (e) => {
    if (e.streams[0]) {
      showRemoteVideo(e.streams[0]);
    }
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
  setBanner("macOS is asking for permission — check the system dialog…");
  setStatus("Requesting…", false);

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
    setBanner("Permission denied — enable camera/microphone for Multiplayer Code Helper in System Settings", "error");
    setStatus("Denied", false);
    callHelper.send({ type: "media-denied" });
    return;
  }

  let lastError = null;

  for (const attempt of attempts) {
    try {
      localStream = await navigator.mediaDevices.getUserMedia(attempt.constraints);
      showLocalVideo(localStream);
      setStatus("Media ready", true);
      setBanner(attempt.label, "ok");

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
    setBanner("Permission denied — open System Settings > Privacy and allow camera/microphone for Multiplayer Code Helper", "error");
    setStatus("Denied", false);
    callHelper.send({ type: "media-denied" });
  } else {
    const msg = lastError?.message || "Unknown error";
    setBanner("Could not access media: " + msg, "error");
    setStatus("Error", false);
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

  setBanner("Calling…");
  setStatus("Calling…", true);
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
    setBanner("Answering…");
    setStatus("Answering…", true);
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

  localVideo.style.display = "none";
  remoteVideo.style.display = "none";
  localPlaceholder.style.display = "flex";
  remotePlaceholder.style.display = "flex";

  setBanner("Call ended");
  setStatus("Idle", false);
}

// ── Message bus: extension → renderer ────────────────────────────────────────
callHelper.onMessage((msg) => {
  if (!msg?.type) { return; }

  if (msg.type === "start-call") {
    startCall(msg.constraints || null).catch((e) => {
      const text = e?.message || String(e);
      setBanner("Call error: " + text, "error");
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
    }
    return;
  }

  if (msg.type === "video") {
    if (localStream) {
      for (const t of localStream.getVideoTracks()) { t.enabled = Boolean(msg.enabled); }
      videoEnabled = Boolean(msg.enabled);
    }
    return;
  }
});

// ── Boot ──────────────────────────────────────────────────────────────────────
// Tell main.js the renderer is ready — this triggers the IPC connection to
// the extension and then immediately sends "start-call" via the helper-ready flow.
callHelper.ready();
