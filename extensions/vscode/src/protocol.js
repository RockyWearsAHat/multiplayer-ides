const { randomUUID, randomBytes } = require("node:crypto");

const EVENTS = {
  JOIN_REQUEST: "join-request",
  JOIN_DECISION: "join-decision",
  STATUS: "status",
  IDE_STATUS: "ide-status",
  FILE_OPEN: "file-open",
  YJS_UPDATE: "yjs-update",
  CURSOR_UPDATE: "cursor-update",
  CHAT_MESSAGE: "chat-message",
  PARTICIPANTS: "participants",
  RTC_SIGNAL: "rtc-signal",
  ERROR: "error"
};

function createSessionId() {
  return randomUUID();
}

function createInviteSecret() {
  return randomBytes(16).toString("hex");
}

function toInviteCode(invite) {
  return Buffer.from(JSON.stringify(invite), "utf8").toString("base64url");
}

function fromInviteCode(code) {
  const decoded = Buffer.from(code, "base64url").toString("utf8");
  return JSON.parse(decoded);
}

function toInviteLink(code) {
  return `multiplayercode://join?code=${encodeURIComponent(code)}`;
}

function parseInviteInput(value) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();

  try {
    if (trimmed.includes("://")) {
      const url = new URL(trimmed);
      const code = url.searchParams.get("code");
      if (code) {
        return fromInviteCode(code);
      }
    }
  } catch {
    // Fall through to plain code parse.
  }

  try {
    return fromInviteCode(trimmed);
  } catch {
    return null;
  }
}

module.exports = {
  EVENTS,
  createSessionId,
  createInviteSecret,
  toInviteCode,
  toInviteLink,
  parseInviteInput
};
