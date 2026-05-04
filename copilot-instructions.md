ONLY EVER CHECKPOINT WITH MESSAGE: PARAMETER INSTEAD OF CONTEXT PARAMETER. DO NOT EVER CHECKPOINT WITH CONTEXT PARAMETER IT CALLS A SUBAGENT AND BURNS USAGE QUICKLY.

# Multiplayer Code Prototype Context

- Project type: Node.js monorepo (VS Code extension first, optional desktop app, shared package)
- Packages:
  - `apps/desktop`: legacy Electron session manager/daemon flow
  - `apps/call-helper`: standalone companion process for call media permissions and WebRTC media capture
  - `extensions/vscode`: primary in-IDE multiplayer implementation
  - `packages/shared`: protocol/event constants and invite helpers used by desktop flow
- Extension modules:
  - `extensions/vscode/src/extension.js`: command registration and editor sync integration
  - `extensions/vscode/src/session-service.js`: in-IDE host/join transport, approvals, participants, repo chat persistence
  - `extensions/vscode/src/panel.js`: multi-surface webview UI (sidebar + editor tabs) with tabbed browser navigation, chat pop-out, and call controls
  - `extensions/vscode/src/protocol.js`: extension-side protocol/event helpers and invite parsing
  - `extensions/vscode/scripts/package-vsix.js`: isolated VSIX packaging helper for monorepo-safe builds
- Extension runtime entrypoint: `extensions/vscode/package.json` uses `main: ./src/extension.js`
- Realtime sync: Yjs updates over WebSocket transport
- Primary host/session ownership: VS Code extension controls approvals and session state
- Prototype networking: direct WebSocket host/guest connection over LAN with invite link transport
- Invite UX: copyable invite links (`multiplayercode://join?code=...`) with invite-only mode support
- Repo chat history: `.multiplayer/chat/events.jsonl` + `.multiplayer/chat/latest.md`
- Voice/video: prototype WebRTC signaling through extension panel
- Key commands:
  - `npm install`
  - `npm run dev:desktop`
  - `npm run start:desktop`
  - `npm run start:extension`
  - `cd extensions/vscode && npm run package`
  - VS Code command palette: `Multiplayer: Open Multiplayer Workspace Tab`
  - VS Code command palette: `Multiplayer: Open Multiplayer Chat Tab`

---

## PROJECT DIRECTION — always keep this section current

### Monorepo Direction: Any-IDE Adapter Architecture

- Keep core multiplayer/session/signaling logic IDE-agnostic in shared packages/processes
- Keep each IDE integration as a thin adapter under `extensions/<ide>`
- VS Code is the current production adapter; additional IDE adapters (Cursor, JetBrains, Neovim, Zed, Sublime) should reuse shared protocol + call-helper IPC contracts
- Users should never need manual per-feature setup commands post-extension install for required runtime components

### Camera/Microphone: Companion Helper Architecture (decided May 4 2026)

**Goal:** Voice/video call as a standalone extension — no desktop app dependency — with honest, explicit, OS-level user permission.

**Why the webview-only approach doesn't work:**
VS Code sandboxes extension webviews (Electron `session` with `setPermissionRequestHandler` blocking media). `getUserMedia` is denied before it ever reaches macOS, regardless of System Settings. Attempting to override VS Code's session handler from inside the extension host is fragile, version-dependent, and bypasses intentional VS Code security. It must never be done by silently grabbing camera/mic — user awareness is non-negotiable.

**The correct architecture — `multiplayer-call-helper`:**
Spawn a small standalone companion process (`apps/call-helper/`) from the extension host using Node.js `child_process.spawn`. This helper:
- Is its own Electron or lightweight native process with a distinct macOS app bundle identity
- When it calls `getUserMedia`, macOS shows "Multiplayer Code Helper would like to access your microphone/camera" — a real, user-visible, explicit OS permission prompt
- Users grant permission to the *helper*, not to VS Code — so there is no ambiguity or silent access
- Communicates with the VS Code extension via local WebSocket or named pipe (IPC)
- Extension webview handles all UI (call controls, video tiles) and relays WebRTC signaling through the helper
- Extension starts/stops the helper process on demand; helper exits when call ends

**Privacy principle (non-negotiable):**
A user must always explicitly confirm before camera or microphone is accessed. No code in this project may access camera/mic silently or via a workaround that bypasses the user-facing OS permission prompt. If the architecture requires bypassing that prompt, the architecture is wrong — fix the architecture.

**Current status:** Companion helper is bundled into the VSIX as `call-helper/` and resolved at runtime from the installed extension path (with local monorepo fallback in dev). The VS Code extension (v0.5.1) spawns the helper via `CallHelperManager` in `extension.js`, communicates over a local WebSocket IPC server. Panel call controls (`Start Call`, `Mute`, `Cam Off`) route through the helper. Users should not need to run `cd apps/call-helper && npm install` after extension install.
