# Multiplayer Code Prototype Context

- Project type: Node.js monorepo (desktop app + VS Code extension + shared package)
- Packages:
  - `apps/desktop`: Electron session manager/daemon
  - `extensions/vscode`: VS Code bridge for collaborative sync
  - `packages/shared`: Protocol/event constants and shared helpers
- Realtime sync: Yjs updates over WebSocket transport
- Host/session ownership: desktop app controls approvals and session state
- Prototype networking: direct WebSocket host/guest connection (LAN/manual host address)
- Initial IDE support: VS Code collaboration bridge, plus installed-IDE detection in desktop app
- Key commands:
  - `npm install`
  - `npm run dev:desktop`
  - `npm run start:desktop`
  - `npm run start:extension`
