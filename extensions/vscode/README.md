# Multiplayer Code Bridge (VS Code)

This extension now runs multiplayer setup directly inside VS Code.

## In-IDE Flow

1. Run `Multiplayer: Start Live Collaboration`.
2. Pick `Host New Session` or `Join Session`.
3. Host shares invite link copied to clipboard.
4. Open `Multiplayer: Open Multiplayer Panel` for:
   - participant list
   - live chat
   - voice/video call controls
5. Optional: open browser-style editor tabs with:
   - `Multiplayer: Open Multiplayer Workspace Tab`
   - `Multiplayer: Open Multiplayer Chat Tab`
5. Edit files and watch live sync.

## Commands

- `Multiplayer: Start Live Collaboration`
- `Multiplayer: Host Session`
- `Multiplayer: Join Session`
- `Multiplayer: Open Multiplayer Panel`
- `Multiplayer: Open Multiplayer Workspace Tab`
- `Multiplayer: Open Multiplayer Chat Tab`
- `Multiplayer: Toggle Invite Policy`
- `Multiplayer: End Session`

## Live Chat Persistence

Chat is stored in the repository workspace:

- `.multiplayer/chat/events.jsonl`
- `.multiplayer/chat/latest.md`

This makes session chat history available later from the repo.

## Packaging

From `extensions/vscode`:

```bash
npm install
npm run package
```

This creates `multiplayer-code-bridge.vsix`.

Install with:

```bash
code --install-extension multiplayer-code-bridge.vsix
```
