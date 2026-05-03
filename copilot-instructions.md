# Multiplayer Code Prototype Context

- Project type: Node.js monorepo (desktop app + VS Code extension + shared package)
- Packages:
  - `apps/desktop`: Electron session manager/daemon
  - `extensions/vscode`: VS Code bridge for collaborative sync
  - `packages/shared`: Protocol/event constants and shared helpers
- Realtime sync: Yjs updates over WebSocket transport
- Host/session ownership: desktop app controls approvals and session state
- Prototype networking: direct WebSocket host/guest connection over LAN with invite link transport
- Invite UX: copyable invite links (`multiplayercode://join?code=...`) with invite-only mode support
- Guest onboarding: host-approved fast git-bundle transfer with snapshot fallback when guest lacks local project files
- Initial IDE support: VS Code collaboration bridge, plus installed-IDE detection in desktop app
- Key commands:
  - `npm install`
  - `npm run dev:desktop`
  - `npm run start:desktop`
  - `npm run start:extension`
