# Multiplayer Code (Prototype)

Multiplayer coding prototype with a VS Code-first workflow.

Current recommended path: run sessions directly from the VS Code extension.

Legacy path: desktop host/join app is still available.

## What this prototype includes

- VS Code extension for:
  - In-IDE host/join session flow
  - Invite links with invite-only policy
  - Host approval prompts for join requests
  - Realtime file sync (Yjs updates)
  - Cursor presence sync (basic marker)
  - Live chat panel
  - Repo-persisted chat history (`.multiplayer/chat/events.jsonl`, `.multiplayer/chat/latest.md`)
  - Prototype voice/video controls in panel (WebRTC signaling)
- Desktop app (Electron) for:
  - IDE detection (VS Code, Cursor, JetBrains, Sublime, Neovim, Zed)
  - Workspace folder selection for hosting
  - Hosting with copyable invite links (private invite-only and optional open link)
  - Host invite-only toggle for join policy
  - Join requests and host approval/rejection
  - Fast git-style transfer (git bundle) for clean git workspaces
  - Host-approved project transfer when guests do not have a local project folder
  - Local IDE bridge endpoint (`ws://127.0.0.1:48765`)
- Separation of concerns:
  - Realtime collaborative text uses Yjs updates
  - Durable history stays in each user's own local Git repo and identity

## Architecture

- `apps/desktop`: legacy desktop host/join flow
- `extensions/vscode`: in-IDE host/join, approvals, sync, chat, and panel UX
- `packages/shared`: shared event names, transfer events, and invite encoding/decoding helpers

Current in-IDE flow:

1. In VS Code, run `Multiplayer: Start Live Collaboration`.
2. Choose `Host New Session` or `Join Session`.
3. Host shares invite link.
4. Host approves incoming join request.
5. Session members edit and sync live.
6. Optional: open `Multiplayer: Open Multiplayer Panel` for participants/chat/voice-video.

Legacy desktop flow:

1. Host starts desktop app session and picks workspace.
2. Host desktop app opens local VS Code and starts control server (`ws://<host-ip>:3700`).
3. Guest pastes invite link/code and requests access.
4. Host accepts request.
5. If guest has no local project, host uses fast git-bundle transfer when possible, with automatic snapshot fallback.
6. Guest desktop app opens local VS Code for guest workspace.
7. Both local VS Code extensions connect to local daemon bridge (`ws://127.0.0.1:48765`).
8. Desktop apps relay Yjs/cursor messages over host-guest control socket.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Run desktop app (optional/legacy path):

```bash
npm run start:desktop
```

3. Install VS Code extension on each machine:

- Build and install:

```bash
cd extensions/vscode
npm install
npm run package
code --install-extension multiplayer-code-bridge.vsix
```

- In VS Code run: `Multiplayer: Start Live Collaboration`

## In-IDE Commands

- `Multiplayer: Start Live Collaboration`
- `Multiplayer: Host Session`
- `Multiplayer: Join Session`
- `Multiplayer: Open Multiplayer Panel`
- `Multiplayer: Toggle Invite Policy`
- `Multiplayer: End Session`

## Legacy Desktop Host Flow

1. Open desktop app.
2. Pick workspace folder.
3. Set display name.
4. (Optional) Keep invite-only mode enabled for safer joins.
5. Click `Start Hosting`.
6. Share the private invite link with guest (or open link if invite-only mode is disabled).
7. Approve pending join request.

## Legacy Desktop Guest Flow

1. Open desktop app.
2. Set display name.
3. Paste invite link/code.
4. Choose one:
  - Use an existing local project folder, or
  - Leave it unset and choose an optional download location.
5. Click `Request Access`.
6. After acceptance, the project opens. If no local project was selected, it is transferred from the host first.

## Prototype limitations

- VS Code bridge only (other IDEs detected but not integrated yet)
- Single host + one guest path is the tested scope
- Local/LAN direct WebSocket transport only
- Basic cursor rendering only for visible editors
- Voice/video is prototype-level (no SFU, no TURN hardening yet)
- Invite-only mode with per-session private secret links
- Workspace transfer runs only after explicit host approval
- Fast transfer requires both sides to have git installed and host workspace to have no uncommitted changes

## Next steps for production

- Multi-guest sessions and role/permission granularity
- Reliable file tree sync and binary handling
- Presence panel and richer collaborator cursors/selections
- Auth, encryption, and secure invite transport
- Replace direct sockets with relay and optional decentralized P2P transport
- Add IDE adapters for Cursor, JetBrains, Neovim, Zed, Sublime
