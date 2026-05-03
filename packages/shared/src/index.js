const CONTROL_EVENTS = {
  HELLO: "hello",
  START_HOST: "start-host",
  JOIN_SESSION: "join-session",
  JOIN_REQUEST: "join-request",
  JOIN_DECISION: "join-decision",
  SESSION_READY: "session-ready",
  PRESENCE: "presence",
  ERROR: "error"
};

const SYNC_EVENTS = {
  IDE_HELLO: "ide-hello",
  IDE_STATUS: "ide-status",
  FILE_OPEN: "file-open",
  YJS_UPDATE: "yjs-update",
  CURSOR_UPDATE: "cursor-update",
  SELECTION_UPDATE: "selection-update"
};

const ROLES = {
  HOST: "host",
  GUEST: "guest"
};

function toInviteCode(invite) {
  return Buffer.from(JSON.stringify(invite), "utf8").toString("base64url");
}

function fromInviteCode(code) {
  const decoded = Buffer.from(code, "base64url").toString("utf8");
  return JSON.parse(decoded);
}

module.exports = {
  CONTROL_EVENTS,
  SYNC_EVENTS,
  ROLES,
  toInviteCode,
  fromInviteCode
};
