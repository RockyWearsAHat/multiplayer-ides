# Multiplayer Code (Prototype)

Standalone multiplayer coding app prototype that uses a desktop host/join daemon plus a VS Code bridge extension.

## What this prototype includes

- Desktop app (Electron) for:
  - IDE detection (VS Code, Cursor, JetBrains, Sublime, Neovim, Zed)
  - Workspace folder selection for hosting
  - Hosting with copyable invite links (private invite-only and optional open link)
  - Host invite-only toggle for join policy
  - Join requests and host approval/rejection
  - Fast git-style transfer (git bundle) for clean git workspaces
  - Host-approved project transfer when guests do not have a local project folder
  - Local IDE bridge endpoint (`ws://127.0.0.1:48765`)
- VS Code extension bridge for:
  - Connecting to local daemon bridge
  - Syncing file-open events
  - Realtime text sync using Yjs document updates over WebSocket
  - Sending/receiving cursor position events (basic cursor marker)
- Separation of concerns:
  - Realtime collaborative text uses Yjs updates
  - Durable history stays in each user's own local Git repo and identity

## Architecture

- `apps/desktop`: session orchestration, networking, approvals, invite handling
- `extensions/vscode`: editor integration and Yjs-based sync application
- `packages/shared`: shared event names, transfer events, and invite encoding/decoding helpers

Current transport flow:

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

2. Run desktop app:

```bash
npm run start:desktop
```

3. Load VS Code extension on each machine:

- Open `extensions/vscode` in VS Code.
- Press `F5` to launch an Extension Development Host.
- In the extension host window, run command: `Multiplayer: Connect Desktop Bridge`.

## Host flow

1. Open desktop app.
2. Pick workspace folder.
3. Set display name.
4. (Optional) Keep invite-only mode enabled for safer joins.
5. Click `Start Hosting`.
6. Share the private invite link with guest (or open link if invite-only mode is disabled).
7. Approve pending join request.

## Guest flow

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
