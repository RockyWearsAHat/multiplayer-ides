"use strict";

// ── Multiplayer Code Helper — Electron main process ──────────────────────────
//
// This is a STANDALONE process with its own macOS app identity.
// When it calls getUserMedia, macOS shows its own real system permission dialog:
//   "Multiplayer Code Helper would like to access your microphone"
// The user consciously approves access to THIS app — not VS Code, not anything
// else. This is the ONLY correct and privacy-respecting way to get media
// permissions inside a VS Code extension workflow.
//
// IPC: The VS Code extension starts a WebSocket server on a local-only port and
// passes --ipc-port=<N> here. This helper connects back as a client, enabling
// bidirectional message exchange with the extension host.
//
// Privacy guarantee: No media access happens without the user explicitly
// clicking "Allow" in the OS-level dialog that this process triggers.
// ─────────────────────────────────────────────────────────────────────────────

const { app, BrowserWindow, session, ipcMain, systemPreferences, screen } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");
const { execFileSync, spawn } = require("node:child_process");
const WebSocket = require("ws");

// ── Debug log to file (stdout is piped by the extension) ──────────────────────
const DBG_LOG = path.join(os.homedir(), "multiplayer-debug.log");
fs.writeFileSync(DBG_LOG, `--- helper start ${new Date().toISOString()} ---\n`);
function dbg(...args) {
  const line = `${new Date().toISOString().slice(11,23)} ${args.join(" ")}\n`;
  fs.appendFileSync(DBG_LOG, line);
}

// ── Parse CLI args ────────────────────────────────────────────────────────────
const portArg = process.argv.slice(2).find((a) => a.startsWith("--ipc-port="));
const IPC_PORT = portArg ? parseInt(portArg.split("=")[1], 10) : null;
const IS_CHAT_MODE = process.argv.includes("--chat");
const ideAppArg = process.argv.slice(2).find((a) => a.startsWith("--ide-app-name="));
const IDE_APP_NAME = ideAppArg ? ideAppArg.split("=").slice(1).join("=").trim() : "";
const ideBundleArg = process.argv.slice(2).find((a) => a.startsWith("--ide-bundle-id="));
const IDE_BUNDLE_ID = ideBundleArg ? ideBundleArg.split("=").slice(1).join("=").trim() : "";
const _idePidArg = process.argv.slice(2).find((a) => a.startsWith("--ide-pid="));
const IDE_PID = _idePidArg ? parseInt(_idePidArg.split("=")[1], 10) : NaN;
const ideWindowTitleArg = process.argv.slice(2).find((a) => a.startsWith("--ide-window-title="));
const IDE_WINDOW_TITLE = ideWindowTitleArg ? ideWindowTitleArg.split("=").slice(1).join("=").trim() : "";

const _argNum = (prefix) => {
  const a = process.argv.slice(2).find((x) => x.startsWith(prefix));
  if (!a) return null;
  const v = Number(a.slice(prefix.length));
  return isNaN(v) ? null : v;
};
const _ax = _argNum("--anchor-x=");
const _ay = _argNum("--anchor-y=");
const _aw = _argNum("--anchor-w=");
const _ah = _argNum("--anchor-h=");
const PASSED_ANCHOR_AREA = (_ax != null && _ay != null && _aw != null && _ah != null && _aw >= 220 && _ah >= 160)
  ? { x: _ax, y: _ay, width: _aw, height: _ah }
  : null;
console.log(`[anchor] argv: ${process.argv.slice(2).join(' ')}`);
console.log(`[anchor] PASSED_ANCHOR_AREA: ${JSON.stringify(PASSED_ANCHOR_AREA)}`);

if (!IPC_PORT || isNaN(IPC_PORT)) {
  console.error("[call-helper] Missing or invalid --ipc-port argument — exiting");
  process.exitCode = 1;
  app.quit();
}

// Identify the app to macOS — this name appears in the system permission dialog.
app.setName("Multiplayer Code Helper");
// NOTE: app.dock.hide() is deferred until after the first window is shown and
// Space-pinned (see app.whenReady). Hiding the dock early prevents macOS from
// assigning the window to VS Code's fullscreen Space.

let mainWindow = null;        // call bar window
let chatWindow = null;        // floating chat window (chat mode only)
let extSocket = null;         // WebSocket connection back to the VS Code extension
let extSocketConnecting = false;
let pinnedCallDisplayId = null;
let pinnedChatDisplayId = null;
let pinnedCallArea = null;
let pinnedChatArea = null;
let chatPanelStealCooldownUntil = 0; // epoch ms — suppress doSpaceSteal re-triggers after finish
let ideFrontmostEnsured = false;
let boundsWatcherProc = null;  // persistent Python watcher for live bounds tracking
let resolvedPythonBin = null;  // cached python3 binary path
let displayWatcherCleanup = null;
let lastIdeArea = null;
let lastIdeLooksFullscreen = null;
let ideInFullscreen = false;
let lastStableWindowedIdeArea = null;
const repinTimersByWindowId = new Map();
const spaceStealStartedAtByWindowId = new Map();
let lastAxRepinAt = 0;
let lastGeometryTransitionRepinAt = 0;
let lastGeometryTransitionDirection = null;
const spaceStealWindows = new Set();
const pendingSpacePinByWindowId = new Set();
// CGS space sync is the intended path for true co-animation. Allow opt-out only
// for emergency rollback while debugging.
const USE_CGS_SPACE_SYNC = process.env.MP_DISABLE_CGS_SPACE_SYNC !== "1";
const ignoreWindowMoveSaveUntilById = new Map();
const prefSaveTimerByWindowId = new Map();

function anySpaceStealInProgress() {
  return spaceStealWindows.size > 0;
}

// Persisted user window preferences — relative offsets from IDE area top-left.
// null means "use default layout formula".
let windowPrefs = {
  call: { relX: null, relY: null },
  chat: { relX: null, relY: null, width: 320, height: 460 },
};

function isAccessibilityTrusted(prompt = false) {
  if (process.platform !== "darwin") {
    return true;
  }

  try {
    return systemPreferences.isTrustedAccessibilityClient(Boolean(prompt));
  } catch {
    return false;
  }
}

// ── Send a message to the extension ──────────────────────────────────────────
function sendToExtension(msg) {
  if (extSocket && extSocket.readyState === WebSocket.OPEN) {
    extSocket.send(JSON.stringify(msg));
  }
}

// ── Send a message to the call renderer ──────────────────────────────────────
function sendToRenderer(msg) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("ipc", msg);
  }
}

// ── Send a message to the chat renderer ──────────────────────────────────────
function sendToChat(msg) {
  if (chatWindow && !chatWindow.isDestroyed()) {
    chatWindow.webContents.send("ipc", msg);
  }
}

function usesNativePanelForKind(kind) {
  return process.platform === "darwin" && kind === "chat";
}

function isNativePanelWindow(win) {
  return Boolean(
    process.platform === "darwin"
      && win
      && !win.isDestroyed()
      && chatWindow
      && !chatWindow.isDestroyed()
      && win.id === chatWindow.id
  );
}

function reinforceNativePanelWindow(win) {
  if (!isNativePanelWindow(win)) {
    return;
  }

  win.setAlwaysOnTop(true, "floating");
  try {
    win.setVisibleOnAllWorkspaces(true, {
      visibleOnFullScreen: true,
      skipTransformProcessType: true,
    });
  } catch (err) {
    dbg(`[panel] reinforce failed winId=${win.id} ${String(err).split("\\n")[0]}`);
  }
}

function setOverlayForegroundState(ideFrontmost) {
  const apply = (win, kind) => {
    if (!win || win.isDestroyed() || !win.isVisible()) return;
    if (ideFrontmost) {
      win.setAlwaysOnTop(true, "floating");
      if (usesNativePanelForKind(kind)) {
        reinforceNativePanelWindow(win);
      }
      win.showInactive();
      win.moveTop();
    } else {
      // Drop out of floating level when IDE is not active so other apps can
      // appear above the helper windows, making the helper behave like one app
      // tied to VS Code focus.
      win.setAlwaysOnTop(false);
    }
  };

  apply(mainWindow, "call");
  apply(chatWindow, "chat");
}

function configureOverlayWindow(win, kind) {
  win.setAlwaysOnTop(true, "floating");
  if (usesNativePanelForKind(kind)) {
    win.setHiddenInMissionControl(false);
    win.setFullScreenable(false);
    // Set workspace visibility NOW (window is still hidden — no UIElement flash).
    // Use skipTransformProcessType so calling this again later never causes a flash.
    win.setVisibleOnAllWorkspaces(true, {
      visibleOnFullScreen: true,
      skipTransformProcessType: true,
    });
    return;
  }
  // Space-steal: start visible on ALL workspaces so the window immediately
  // enters VS Code's fullscreen Space. It will be pinned to VS Code's Space
  // in revealOverlayWindow() right after the first show, while VS Code is
  // still the frontmost app (showInactive never steals focus).
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  win.setFullScreenable(false);
}

function parseArea(out) {
  const parts = String(out || "").trim().split("|").map(Number);
  if (parts.length !== 4 || parts.some(Number.isNaN)) {
    return null;
  }

  const [x, y, width, height] = parts;
  if (width < 220 || height < 160) {
    return null;
  }

  return { x, y, width, height };
}

function ensureLaunchingIdeFrontmostOnce() {
  if (process.platform !== "darwin" || ideFrontmostEnsured) {
    return;
  }

  ideFrontmostEnsured = true;

  if (!Number.isFinite(IDE_PID) || IDE_PID <= 0) {
    return;
  }

  try {
    // One-time foreground activation of the exact launching IDE process.
    // This aligns the helper's initial Space with the VS Code instance that
    // spawned it, without ongoing hide/show management.
    execFileSync("osascript", [
      "-e",
      "tell application \"System Events\"",
      `set frontmost of first process whose unix id is ${IDE_PID} to true`,
      "end tell",
    ], {
      encoding: "utf8",
      timeout: 1500,
    });
  } catch (err) {
    console.warn("[anchor] could not activate launching IDE PID:", String(err).split("\n")[0]);
  }
}

// ── Bounds watcher: Swift AXObserver (event-driven) + Python fallback ─────────
// Primary: compile a tiny Swift binary on first launch that registers
// kAXWindowMovedNotification / kAXWindowResizedNotification via AXObserver —
// true macOS event callbacks with zero CPU at idle, instant response time.
//
// Fallback: Python/CGWindowList polling at 200 ms used only on the very first
// launch while Swift is compiling in the background, or if swiftc is absent.

const WATCHER_VERSION = "19";
const WATCHER_DIR = path.join(os.homedir(), ".local", "share", "multiplayer-code", "native");
const WATCHER_BIN = path.join(WATCHER_DIR, "bounds-watcher");
const WATCHER_SRC = path.join(WATCHER_DIR, "bounds-watcher.swift");
const WATCHER_VER_FILE = path.join(WATCHER_DIR, ".watcher-ver");
const PREFS_FILE = path.join(os.homedir(), ".local", "share", "multiplayer-code", "window-prefs.json");

// Swift source embedded as a string — written to disk and compiled once.
// Uses AXObserver so we get notified the moment VS Code's window moves/resizes,
// then queries CGWindowList for the new bounds and prints x|y|w|h to stdout.
const SWIFT_WATCHER_SOURCE = `
import Foundation
import Cocoa
import ApplicationServices

guard CommandLine.arguments.count >= 4 else { exit(1) }
let targetPid   = pid_t(Int(CommandLine.arguments[1])!)
let namesArray  = (try? JSONSerialization.jsonObject(
    with: CommandLine.arguments[2].data(using: .utf8)!)) as? [String] ?? []
let helperPid   = Int(CommandLine.arguments[3])!   // Electron helper PID
let names = Set(namesArray)
var lastBounds = ""
let appElem = AXUIElementCreateApplication(targetPid)
var observer: AXObserver?
var observedWindowHashes = Set<CFHashCode>()
var lastSpaceSyncAt = Date.distantPast
var lastSyncedIdeSpaceSignature = ""
var pruneOldSpaces = false
// Track when the last major AX event (main-window-changed etc.) fired so that
// move/resize syncs are only triggered within a short window after a real
// transition — not on every scroll or typing event.
var lastMajorAxEventAt = Date.distantPast
// Rapid-sync timer: fires every 50 ms during a fullscreen transition so that
// CGSAddWindowsToSpaces catches the exact moment macOS creates the destination
// Space and assigns VS Code to it. Stopped once activeSpaceDidChange fires.
var spaceSyncTimer: Timer? = nil
var spaceSyncStopTimer: Timer? = nil

func startRapidSpaceSync() {
    spaceSyncTimer?.invalidate()
    spaceSyncStopTimer?.invalidate()
    spaceSyncTimer = Timer.scheduledTimer(withTimeInterval: 0.05, repeats: true) { _ in
        lastSpaceSyncAt = Date.distantPast   // bypass 120 ms throttle
        syncHelperWindowsToVSCodeSpace()
    }
    // Safety cap: stop after 4 s even if activeSpaceDidChange never fires.
    spaceSyncStopTimer = Timer.scheduledTimer(withTimeInterval: 4.0, repeats: false) { _ in
        stopRapidSpaceSync()
    }
}

func stopRapidSpaceSync() {
    spaceSyncTimer?.invalidate();  spaceSyncTimer = nil
    spaceSyncStopTimer?.invalidate(); spaceSyncStopTimer = nil
}

// ── Private CGS declarations ──────────────────────────────────────────────────
// CGS private API declarations.
// These functions live in SkyLight (the WindowServer framework). The connection
// need not own the windows — the server accepts any valid CGWindowID from any
// process with a valid CGS connection.
typealias CGSConnectionID = UInt32
typealias CGWindowID = UInt32
@_silgen_name("CGSMainConnectionID")
func CGSMainConnectionID() -> CGSConnectionID
@_silgen_name("CGSCopySpacesForWindows")
func CGSCopySpacesForWindows(_ cid: CGSConnectionID, _ mask: Int32, _ wids: CFArray) -> CFArray
@_silgen_name("CGSAddWindowsToSpaces")
func CGSAddWindowsToSpaces(_ cid: CGSConnectionID, _ wids: CFArray, _ sids: CFArray)
@_silgen_name("CGSRemoveWindowsFromSpaces")
func CGSRemoveWindowsFromSpaces(_ cid: CGSConnectionID, _ wids: CFArray, _ sids: CFArray)
// ─────────────────────────────────────────────────────────────────────────────

func emitEvent(_ name: String) {
  print("event|\\(name)")
  fflush(stdout)
}

/// All CGWindowIDs for a given PID (all window levels).
func windowIDsForPid(_ pid: Int) -> [Int] {
    guard let list = CGWindowListCopyWindowInfo(.optionAll, kCGNullWindowID)
          as? [[String: Any]] else { return [] }
    return list.compactMap { w -> Int? in
        guard (w["kCGWindowOwnerPID"] as? NSNumber)?.intValue == pid else { return nil }
        guard let wid = (w["kCGWindowNumber"] as? NSNumber)?.intValue else { return nil }
        return wid
    }
}

    /// Resolve a single IDE window ID that represents the active/main IDE window.
    /// Using all IDE window IDs can return multiple Spaces, which causes helper
    /// windows to be added to desktop + fullscreen at once and break attachment.
    func mainWindowIDForIDE() -> Int? {
      guard let list = CGWindowListCopyWindowInfo(.optionAll, kCGNullWindowID)
          as? [[String: Any]] else { return nil }

      var bestPid: (wid: Int, area: Int)?
      var bestName: (wid: Int, area: Int)?

      for w in list {
        guard (w["kCGWindowLayer"] as? Int) == 0,
            let bd = w["kCGWindowBounds"] as? [String: Any],
            let wid = (w["kCGWindowNumber"] as? NSNumber)?.intValue else { continue }

        let ww = Int((bd["Width"] as? NSNumber)?.doubleValue ?? 0)
        let wh = Int((bd["Height"] as? NSNumber)?.doubleValue ?? 0)
        guard ww >= 220, wh >= 160 else { continue }

        let area = ww * wh
        let pid = (w["kCGWindowOwnerPID"] as? NSNumber)?.intValue ?? -1
        let owner = w["kCGWindowOwnerName"] as? String ?? ""

        if pid == Int(targetPid) {
          if bestPid == nil || area > bestPid!.area {
            bestPid = (wid, area)
          }
        }

        if names.contains(owner) {
          if bestName == nil || area > bestName!.area {
            bestName = (wid, area)
          }
        }
      }

      let hasTargetPid = Int(targetPid) > 0
      if hasTargetPid {
        return bestPid?.wid ?? bestName?.wid
      }
      return bestName?.wid ?? bestPid?.wid
    }

/// Move our Electron windows into the same Space(s) that VS Code is currently on.
/// Called at transition start so macOS animates them together.
func syncHelperWindowsToVSCodeSpace() {
  // Throttle to avoid hammering CGS during rapid AX bursts.
  let now = Date()
  if now.timeIntervalSince(lastSpaceSyncAt) < 0.12 {
    return
  }
  lastSpaceSyncAt = now

    let cid = CGSMainConnectionID()
    let ideWid = mainWindowIDForIDE()
    let ourWids = windowIDsForPid(helperPid)
  guard let ideWid, !ourWids.isEmpty else {
    print("event|spaces-sync-skip|ideWid=\\(ideWid != nil ? 1 : 0)|ourWids=\\(ourWids.count)")
    fflush(stdout)
    return
  }

    guard let ideSpaces = CGSCopySpacesForWindows(cid, 7 /*kCGSAllSpacesMask*/,
                                            [ideWid as NSNumber] as CFArray)
                    as? [NSNumber], !ideSpaces.isEmpty else {
    print("event|spaces-sync-skip|ideSpaces=0")
    fflush(stdout)
    return
  }

    let ideSpaceIds = ideSpaces.map { $0.intValue }.sorted()
    let ideSpaceSet = Set(ideSpaceIds)
    let ideSpaceSignature = ideSpaceIds.map { String($0) }.joined(separator: ",")

    // Get spaces our windows are currently on. Defer removal until settled.
    let oldSpaces = (CGSCopySpacesForWindows(cid, 7,
                                            ourWids.map { $0 as NSNumber } as CFArray)
                    as? [NSNumber]) ?? []

    let oldSpaceSet = Set(oldSpaces.map { $0.intValue })
    if oldSpaceSet == ideSpaceSet {
      if ideSpaceSignature != lastSyncedIdeSpaceSignature {
        lastSyncedIdeSpaceSignature = ideSpaceSignature
        print("event|spaces-synced|\(ideSpaces.count)")
        fflush(stdout)
      }
      return
    }

    let ourCF  = ourWids.map  { $0 as NSNumber } as CFArray
    let newCF  = ideSpaces as CFArray

    // Add our windows to VS Code's Space first.
    CGSAddWindowsToSpaces(cid, ourCF, newCF)

    let toRemove = oldSpaces.filter { !ideSpaces.contains($0) }
    if !toRemove.isEmpty {
      CGSRemoveWindowsFromSpaces(cid, ourCF, toRemove as CFArray)
    }

    lastSyncedIdeSpaceSignature = ideSpaceSignature
    print("event|spaces-synced|\(ideSpaces.count)")
    fflush(stdout)
}

func queryAndEmit() {
    guard let list = CGWindowListCopyWindowInfo(.optionAll, kCGNullWindowID)
          as? [[String: Any]] else { return }
    var bestPid: (Int, Int, Int, Int, Int)?
    var bestName: (Int, Int, Int, Int, Int)?
    for w in list {
        guard (w["kCGWindowLayer"] as? Int) == 0,
              let bd = w["kCGWindowBounds"] as? [String: Any] else { continue }
        let x  = Int((bd["X"]      as? NSNumber)?.doubleValue ?? 0)
        let y  = Int((bd["Y"]      as? NSNumber)?.doubleValue ?? 0)
        let ww = Int((bd["Width"]  as? NSNumber)?.doubleValue ?? 0)
        let wh = Int((bd["Height"] as? NSNumber)?.doubleValue ?? 0)
        guard ww >= 220, wh >= 160 else { continue }
        let area  = ww * wh
        let pid   = (w["kCGWindowOwnerPID"]  as? NSNumber)?.intValue ?? -1
        let owner =  w["kCGWindowOwnerName"] as? String ?? ""
        if pid == Int(targetPid) { if bestPid  == nil || area > bestPid!.4  { bestPid  = (x,y,ww,wh,area) } }
        if names.contains(owner) { if bestName == nil || area > bestName!.4 { bestName = (x,y,ww,wh,area) } }
    }
    let hasTargetPid = Int(targetPid) > 0
    let chosen = hasTargetPid ? bestPid : (bestPid ?? bestName)
    if let c = chosen {
        let s = "\\(c.0)|\\(c.1)|\\(c.2)|\\(c.3)"
        if s != lastBounds { lastBounds = s; print(s); fflush(stdout) }
    }
}

  func subscribeWindowNotifications(_ obs: AXObserver, _ win: AXUIElement) {
    let hash = CFHash(win)
    if observedWindowHashes.contains(hash) { return }
    observedWindowHashes.insert(hash)

    AXObserverAddNotification(obs, win, kAXWindowMovedNotification as CFString, nil)
    AXObserverAddNotification(obs, win, kAXWindowResizedNotification as CFString, nil)
  }

  func refreshWindowSubscriptions() {
    guard let obs = observer else { return }

    var wins: CFTypeRef?
    AXUIElementCopyAttributeValue(appElem, kAXWindowsAttribute as CFString, &wins)
    if let winList = wins as? [AXUIElement] {
      for win in winList {
        subscribeWindowNotifications(obs, win)
      }
    }

    var focused: CFTypeRef?
    AXUIElementCopyAttributeValue(appElem, kAXFocusedWindowAttribute as CFString, &focused)
    if let f = focused {
      subscribeWindowNotifications(obs, unsafeBitCast(f, to: AXUIElement.self))
    }

    var main: CFTypeRef?
    AXUIElementCopyAttributeValue(appElem, kAXMainWindowAttribute as CFString, &main)
    if let m = main {
      subscribeWindowNotifications(obs, unsafeBitCast(m, to: AXUIElement.self))
    }
  }

// AXObserverCallback is @convention(c) — must be a global, cannot capture vars.
  let axCallback: AXObserverCallback = { _, _, notification, _ in
    let note = notification as String
    if note == (kAXMainWindowChangedNotification as String) {
      // Transition starts — sync once immediately, then start the rapid-sync
      // timer so CGS continuously tracks VS Code's destination Space.
      lastMajorAxEventAt = Date()
      syncHelperWindowsToVSCodeSpace()
      startRapidSpaceSync()
      emitEvent("main-window-changed")
    } else if note == (kAXFocusedWindowChangedNotification as String) {
      lastMajorAxEventAt = Date()
      syncHelperWindowsToVSCodeSpace()
      startRapidSpaceSync()
      emitEvent("focused-window-changed")
    } else if note == (kAXWindowCreatedNotification as String) {
      lastMajorAxEventAt = Date()
      syncHelperWindowsToVSCodeSpace()
      startRapidSpaceSync()
      emitEvent("window-created")
    } else if note == (kAXWindowMovedNotification as String)
              || note == (kAXWindowResizedNotification as String) {
      // Only sync during the first 2s after a major AX event (transition window).
      // Outside that window VS Code emits move/resize on every scroll/type
      // which would cause continuous spaces-synced spam.
      if Date().timeIntervalSince(lastMajorAxEventAt) < 2.0 {
        syncHelperWindowsToVSCodeSpace()
      }
    }
    refreshWindowSubscriptions()
    queryAndEmit()
  }

AXObserverCreate(targetPid, axCallback, &observer)

var observerAdded = false
  if let obs = observer {
    AXObserverAddNotification(obs, appElem, kAXFocusedWindowChangedNotification as CFString, nil)
    AXObserverAddNotification(obs, appElem, kAXMainWindowChangedNotification as CFString, nil)
    AXObserverAddNotification(obs, appElem, kAXWindowCreatedNotification as CFString, nil)

    refreshWindowSubscriptions()
    CFRunLoopAddSource(CFRunLoopGetCurrent(), AXObserverGetRunLoopSource(obs), .defaultMode)
    observerAdded = true
}

if !observerAdded { fputs("[watcher] AXObserver unavailable\\n", stderr) }
queryAndEmit()

// Allow JS side to force a sync at transition start.
var stdinBuffer = ""
FileHandle.standardInput.readabilityHandler = { handle in
  let data = handle.availableData
  if data.isEmpty { return }
  guard let chunk = String(data: data, encoding: .utf8) else { return }
  stdinBuffer += chunk
  let lines = stdinBuffer.split(separator: "\\n", omittingEmptySubsequences: false)
  if lines.isEmpty { return }
  stdinBuffer = String(lines.last ?? "")
  for lineSub in lines.dropLast() {
    let line = lineSub.trimmingCharacters(in: .whitespacesAndNewlines)
    if line == "sync" || line == "sync-now" {
      // Bypass the 120 ms AX-burst throttle — explicit stdin sync is always
      // intentional (sent at transition start/finish) and must not be skipped.
      lastSpaceSyncAt = Date.distantPast
      syncHelperWindowsToVSCodeSpace()
      emitEvent("sync-requested")
    }
  }
}

NSWorkspace.shared.notificationCenter.addObserver(
    forName: NSWorkspace.didActivateApplicationNotification,
    object: nil,
    queue: nil
) { note in
    if let app = note.userInfo?[NSWorkspace.applicationUserInfoKey] as? NSRunningApplication,
       app.processIdentifier == targetPid {
        emitEvent("ide-activated")
  } else {
    emitEvent("ide-deactivated")
    }
}

NSWorkspace.shared.notificationCenter.addObserver(
    forName: NSWorkspace.activeSpaceDidChangeNotification,
    object: nil,
    queue: nil
) { _ in
    // Animation done — stop the rapid-sync timer and do one final authoritative sync.
    stopRapidSpaceSync()
  pruneOldSpaces = true
    syncHelperWindowsToVSCodeSpace()
  pruneOldSpaces = false
  emitEvent("spaces-settled")
    emitEvent("space-changed")
}

RunLoop.main.run()
`;

function buildCandidateNames() {
  const candidates = [];
  const push = (n) => {
    const s = String(n || "").trim();
    if (s && !candidates.includes(s)) candidates.push(s);
  };
  push(IDE_APP_NAME);
  push(IDE_APP_NAME.replace(/^Visual Studio /i, ""));
  ["Visual Studio Code - Insiders", "Visual Studio Code", "Code - Insiders", "Code",
   "Cursor", "Windsurf", "VSCodium"].forEach(push);
  return candidates;
}

function isSwiftWatcherReady() {
  try {
    return fs.readFileSync(WATCHER_VER_FILE, "utf8").trim() === WATCHER_VERSION
      && fs.existsSync(WATCHER_BIN);
  } catch { return false; }
}

function getCursorDisplayWorkArea() {
  const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  const wa = display.workArea;
  return { x: wa.x, y: wa.y, width: wa.width, height: wa.height };
}

function looksLikeFullscreenArea(area) {
  if (!area) return false;

  const center = {
    x: Math.round(area.x + area.width / 2),
    y: Math.round(area.y + area.height / 2),
  };
  const display = screen.getDisplayNearestPoint(center);
  if (!display) return false;

  const dw = display.bounds.width;
  const dh = display.bounds.height;
  if (dw <= 0 || dh <= 0) return false;

  // Fullscreen windows on macOS should cover nearly the full display bounds.
  // Also require y <= 5 — true macOS fullscreen always starts at y=0 (no menu
  // bar offset). A large windowed window can pass the size threshold alone on
  // small displays (e.g. 1512×945 on a 1512×982 screen = 96% height).
  const sizeMatch = area.width >= Math.floor(dw * 0.94) && area.height >= Math.floor(dh * 0.94);
  if (!sizeMatch) return false;
  if (process.platform === "darwin") return area.y <= 5;
  return true;
}

function looksLikeDesktopWorkAreaFrame(area) {
  if (!area) return false;
  const center = {
    x: Math.round(area.x + area.width / 2),
    y: Math.round(area.y + area.height / 2),
  };
  const display = screen.getDisplayNearestPoint(center);
  if (!display) return false;
  const wa = display.workArea;
  return Math.abs(area.x - wa.x) <= 2
    && Math.abs(area.y - wa.y) <= 2
    && Math.abs(area.width - wa.width) <= 2
    && Math.abs(area.height - wa.height) <= 2;
}

// Unified Space steal — only needed as a cleanup pass now.
// The Swift watcher calls CGSAddWindowsToSpaces at transition START so our
// window is already in VS Code's Space and animates with it. All this does
// is keep the overlay visible through transitions and re-pin position after
// transition settles.
function doSpaceSteal(win, kind, force = false) {
  if (!win || win.isDestroyed() || !win.isVisible()) return;
  // Chat should behave like a normal attached panel in windowed mode.
  // Running the full steal pipeline on every AX event causes churn loops
  // (window-created/focused-window-changed -> steal -> finish) and breaks
  // stable follow behavior. Reserve steal for fullscreen handling only.
  if (kind === "chat" && !ideInFullscreen && !force) {
    if (lastIdeArea) {
      pinnedChatArea = lastIdeArea;
      positionOverlayWindow(win, "chat", false);
    }
    return;
  }
  if (usesNativePanelForKind(kind)) {
    if (spaceStealWindows.has(win.id)) return;
    // Never suppress chat steals during transition bursts. Missing even one
    // steal in the fullscreen enter/exit sequence causes the panel to remain
    // on the wrong Space.
    clearRepinTimers(win);
    win.setAlwaysOnTop(true, "floating");
    // all-workspaces keeps the panel visible during the transition.
    // CGS moves it to VS Code's Space; finishSpaceSteal pins it there
    // (calls setVisibleOnAllWorkspaces(false)) once CGS confirms.
    win.setVisibleOnAllWorkspaces(true, {
      visibleOnFullScreen: true,
      skipTransformProcessType: true,
    });
    spaceStealWindows.add(win.id);
    spaceStealStartedAtByWindowId.set(win.id, Date.now());
    // Trigger CGS Space sync eagerly.
    requestWatcherSpaceSync("start");
    if (kind && lastIdeArea) {
      if (kind === "call") {
        pinnedCallArea = lastIdeArea;
      } else {
        pinnedChatArea = lastIdeArea;
      }
    }
    positionOverlayWindow(win, kind, false);
    win.showInactive();
    win.moveTop();
    // Schedule settle in case CGS spaces-synced never fires.
    scheduleSpaceStealSettle(win, kind);
    return;
  }
  if (spaceStealWindows.has(win.id)) return;
  clearRepinTimers(win);
  dbg(`[spacesteal] START kind=${kind} winId=${win.id}`);

  spaceStealWindows.add(win.id);
  pendingSpacePinByWindowId.add(win.id);
  spaceStealStartedAtByWindowId.set(win.id, Date.now());
  requestWatcherSpaceSync("start");

  win.setAlwaysOnTop(true, "floating");

  // visibleOnAllWorkspaces(true) keeps the window visible on the fullscreen
  // Space once the macOS transition lands. We leave it as all-workspaces until
  // CGS confirms our window is on the correct Space (spaces-synced event).
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  win.showInactive();
  win.moveTop();

  // Position toward target immediately.
  positionOverlayWindow(win, kind);
  dbg(`[spacesteal] waiting for bounds settle`);

  // scheduleSpaceStealSettle starts the settle timer. It will be reset each
  // time bounds change while steal is active, so finish fires ~300 ms after
  // the last animation frame — not on a fixed wall-clock delay.
  scheduleSpaceStealSettle(win, kind);
}

// Settle timer: fires 600 ms after the last observed bounds/AX change.
// 600 ms ensures the macOS fullscreen animation (~800 ms) is nearly done
// before we call finishSpaceSteal. With the Swift AXObserver this resets
// on every AX event, so it naturally fires after the last animation frame.
const settleTimerByWindowId = new Map();
function scheduleSpaceStealSettle(win, kind) {
  if (!win || win.isDestroyed() || !spaceStealWindows.has(win.id)) return;
  const existing = settleTimerByWindowId.get(win.id);
  if (existing) clearTimeout(existing);
  const t = setTimeout(() => {
    settleTimerByWindowId.delete(win.id);
    if (!win.isDestroyed() && spaceStealWindows.has(win.id)) {
      dbg(`[spacesteal] settled — finishing winId=${win.id}`);
      finishSpaceSteal(win, kind, "settle");
    }
  }, 600);
  settleTimerByWindowId.set(win.id, t);
}

function requestWatcherSpaceSync(reason) {
  const proc = boundsWatcherProc;
  if (!proc || proc.killed || !proc.stdin || proc.stdin.destroyed) return;
  try {
    proc.stdin.write("sync\n");
    dbg(`[watcher] sync requested (${reason})`);
  } catch (err) {
    dbg(`[watcher] sync request failed (${reason}) ${String(err).split("\\n")[0]}`);
  }
}

function finishSpaceSteal(win, kind, reason) {
  if (!win || win.isDestroyed() || !win.isVisible()) return;
  clearRepinTimers(win);
  const existing = settleTimerByWindowId.get(win.id);
  if (existing) { clearTimeout(existing); settleTimerByWindowId.delete(win.id); }
  // Capture before deleting — cooldown should only fire when a steal actually ran.
  const wasActuallyStolen = spaceStealWindows.has(win.id);
  spaceStealWindows.delete(win.id);
  spaceStealStartedAtByWindowId.delete(win.id);
  pendingSpacePinByWindowId.delete(win.id);
  dbg(`[spacesteal] FINISH reason=${reason} kind=${kind} winId=${win.id}`);
  win.setAlwaysOnTop(true, "floating");
  if (usesNativePanelForKind(kind)) {
    // No chat cooldown: every transition event must be allowed to re-steal.
    if (kind === "chat" && wasActuallyStolen) chatPanelStealCooldownUntil = 0;
    if (kind && lastIdeArea) {
      if (kind === "call") {
        pinnedCallArea = lastIdeArea;
      } else {
        pinnedChatArea = lastIdeArea;
      }
      positionOverlayWindow(win, kind, false);
    }
    // Don't pin here — CGS may not have moved the window yet (settle fires
    // ~600 ms but CGS confirms ~2 s later). The pin is applied in the
    // spaces-synced → CGS-confirmed handler once CGS confirms the move.
    // Mark the window as pending-pin so that handler knows to act on it.
    pendingSpacePinByWindowId.add(win.id);
    win.showInactive();
    win.moveTop();
    return;
  }
  // Animate to the final position.
  if (kind && lastIdeArea) {
    pinnedCallArea = lastIdeArea;
    pinnedChatArea = lastIdeArea;
    positionOverlayWindow(win, kind);
  }
  // Send a final CGS sync so the Swift watcher moves our window to the
  // fullscreen Space. If Swift isn't compiled yet, no CGS happens but
  // we leave visibleOnAllWorkspaces(true) so the window stays visible.
  requestWatcherSpaceSync("finish");
  if (!ideInFullscreen) {
    // Back on a regular desktop Space: safe to pin back after a short delay.
    // Register timer so a new steal cancels it via clearRepinTimers().
    const pinWin = win;
    registerRepinTimer(win, setTimeout(() => {
      if (!pinWin || pinWin.isDestroyed()) return;
      pinWin.setVisibleOnAllWorkspaces(false);
      pendingSpacePinByWindowId.delete(pinWin.id);
    }, 300));
  } else {
    // Entering fullscreen: keep all-workspaces until we receive spaces-synced,
    // then pin there.
    dbg(`[spacesteal] waiting for spaces-synced before fullscreen pin`);
  }
}

function handleWatcherEventLine(line) {
  if (!line.startsWith("event|")) {
    return false;
  }

  if (process.platform !== "darwin") {
    return true;
  }

  const eventName = line.slice(6).trim();

  if (eventName.startsWith("spaces-synced")) {
    // CGS confirmed our windows are on the same Space as VS Code.
    // If a steal is still in progress, finish it now.
    // If steal already finished (entering fullscreen path kept all-workspaces),
    // pin the window to this Space now that CGS has moved it there.
    const now = Date.now();
    const canFinish = (win) => {
      if (!win || win.isDestroyed() || !spaceStealWindows.has(win.id)) return false;
      const started = spaceStealStartedAtByWindowId.get(win.id) || 0;
      return now - started >= 180;
    };
    const hasPendingPin = (mainWindow && pendingSpacePinByWindowId.has(mainWindow.id))
      || (chatWindow && pendingSpacePinByWindowId.has(chatWindow.id));

    if (anySpaceStealInProgress()) {
      dbg(`[ax] ${eventName} → finishSpaceSteal`);
      if (canFinish(mainWindow)) finishSpaceSteal(mainWindow, "call", "spaces-synced");
      if (canFinish(chatWindow)) finishSpaceSteal(chatWindow, "chat", "spaces-synced");
    } else if (hasPendingPin) {
      dbg(`[ax] ${eventName} → CGS confirmed`);
      // Pin any window that was waiting for CGS confirmation before clearing
      // all-workspaces. For the panel we do this even during fullscreen because
      // that's exactly when CGS moves it to VS Code's fullscreen Space.
      const pinIfPending = (win) => {
        if (!win || win.isDestroyed() || !win.isVisible()) return;
        if (!pendingSpacePinByWindowId.has(win.id)) return;
        // Delete immediately so subsequent spaces-synced floods don't repeat.
        pendingSpacePinByWindowId.delete(win.id);
        clearRepinTimers(win);
        registerRepinTimer(win, setTimeout(() => {
          if (!win || win.isDestroyed()) return;
          win.setVisibleOnAllWorkspaces(false);
        }, 120));
      };
      if (mainWindow) pinIfPending(mainWindow);
      // Panel gets pinned even during fullscreen — that's when VS Code's
      // fullscreen Space is the target Space CGS just moved us to.
      if (chatWindow) pinIfPending(chatWindow);
    }
    return true;
  }

  if (eventName.startsWith("cgs-parent")) {
    dbg(`[ax] ${eventName}`);
    return true;
  }

  if (eventName === "ide-deactivated") {
    dbg(`[ax] ${eventName} → lower helper overlays`);
    setOverlayForegroundState(false);
    return true;
  }

  if (eventName === "ide-activated") {
    dbg(`[ax] ${eventName} → raise helper overlays`);
    setOverlayForegroundState(true);
    requestWatcherSpaceSync("ide-focus-change");
    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible()) {
      doSpaceSteal(mainWindow, "call", true);
    }
    if (chatWindow && !chatWindow.isDestroyed() && chatWindow.isVisible()) {
      doSpaceSteal(chatWindow, "chat", true);
    }
    return true;
  }

  if (eventName === "spaces-settled" || eventName === "space-changed") {
    dbg(`[ax] ${eventName} → finishSpaceSteal`);
    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible()) {
      finishSpaceSteal(mainWindow, "call", eventName);
    }
    if (chatWindow && !chatWindow.isDestroyed() && chatWindow.isVisible()) {
      finishSpaceSteal(chatWindow, "chat", eventName);
    }
    return true;
  }

  if (eventName === "main-window-changed" || eventName === "focused-window-changed" || eventName === "window-created") {
    const now = Date.now();
    if (now - lastAxRepinAt < 250) { dbg(`[ax] ${eventName} throttled`); return true; }
    lastAxRepinAt = now;
    dbg(`[ax] ${eventName} → doSpaceSteal`);

    // During normal window drags, AX events can arrive before watcher geometry
    // updates. Refresh bounds immediately so overlays track the IDE in real time.
    const instantArea = getPreferredIdeWindowArea();
    if (instantArea) {
      onIdeBoundsChanged(instantArea);
    }

    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible()) {
      doSpaceSteal(mainWindow, "call");
    }
    if (chatWindow && !chatWindow.isDestroyed() && chatWindow.isVisible()) {
      // AX events can arrive before fullscreen state fully settles.
      // Force steal if either current or last-known state indicates fullscreen.
      if (ideInFullscreen || lastIdeLooksFullscreen === true) {
        doSpaceSteal(chatWindow, "chat", true);
      }
      let area = instantArea || lastIdeArea;
      // Never anchor chat to transient transition frames (negative X) or
      // desktop-like work-area frames in windowed mode. onIdeBoundsChanged()
      // already normalizes these into lastIdeArea; prefer that stabilized value.
      if (area && !looksLikeFullscreenArea(area)) {
        if (area.x < 0 || looksLikeDesktopWorkAreaFrame(area)) {
          area = lastIdeArea;
        }
      }
      if (area) {
        pinnedChatArea = area;
        positionOverlayWindow(chatWindow, "chat", false);
      }
    }
  }

  return true;
}

// Called on every bounds change — reposition all visible overlay windows.
function onIdeBoundsChanged(area) {
  const incomingFullscreenLike = looksLikeFullscreenArea(area);
  const incomingDesktopLikeWindowed = !incomingFullscreenLike && looksLikeDesktopWorkAreaFrame(area);
  const incomingOffscreenWindowed = !incomingFullscreenLike && area.x < 0;

  // Transition noise can emit large negative X windowed frames while Space
  // animations are mid-flight. Treat those as invalid anchors.
  if (process.platform === "darwin" && incomingOffscreenWindowed) {
    const preferredArea = getPreferredIdeWindowArea();
    if (preferredArea && !looksLikeFullscreenArea(preferredArea) && preferredArea.x >= 0) {
      area = preferredArea;
    } else if (lastStableWindowedIdeArea) {
      dbg(`[bounds] replacing offscreen frame with stable windowed frame ${lastStableWindowedIdeArea.width}x${lastStableWindowedIdeArea.height}@(${lastStableWindowedIdeArea.x},${lastStableWindowedIdeArea.y})`);
      area = lastStableWindowedIdeArea;
    } else {
      dbg(`[bounds] dropping offscreen frame ${area.width}x${area.height}@(${area.x},${area.y}) (no stable replacement)`);
      return;
    }
  }

  // If the watcher reports a desktop/work-area frame in windowed mode, treat
  // it as low-confidence and prefer a real window frame source.
  if (process.platform === "darwin" && incomingDesktopLikeWindowed) {
    const preferredArea = getPreferredIdeWindowArea();
    if (preferredArea) {
      area = preferredArea;
    } else if (lastStableWindowedIdeArea) {
      dbg(`[bounds] replacing desktop-like frame with stable windowed frame ${lastStableWindowedIdeArea.width}x${lastStableWindowedIdeArea.height}@(${lastStableWindowedIdeArea.x},${lastStableWindowedIdeArea.y})`);
      area = lastStableWindowedIdeArea;
    } else {
      // No reliable replacement yet; ignore this frame instead of poisoning
      // anchor state with desktop coordinates.
      dbg(`[bounds] dropping desktop-like frame ${area.width}x${area.height}@(${area.x},${area.y}) (no stable replacement)`);
      return;
    }
  }

  // Quartz fallback can emit display work-area frames (desktop-sized) instead
  // of VS Code window bounds. In windowed mode, ignore those and keep the last
  // non-desktop frame so chat remains attached to VS Code.
  if (process.platform === "darwin" && !looksLikeFullscreenArea(area) && looksLikeDesktopWorkAreaFrame(area)) {
    if (lastIdeArea && !looksLikeFullscreenArea(lastIdeArea) && !looksLikeDesktopWorkAreaFrame(lastIdeArea)) {
      dbg(`[bounds] ignoring desktop-like frame ${area.width}x${area.height}@(${area.x},${area.y})`);
      area = lastIdeArea;
    }
  }

  // In windowed mode, watcher data can occasionally report display/work-area
  // bounds (x=0) instead of the actual VS Code window frame. Prefer a direct
  // live window read when available so overlays anchor to VS Code itself.
  if (process.platform === "darwin") {
    const incomingLooksFullscreen = looksLikeFullscreenArea(area);
    if (!incomingLooksFullscreen) {
      const preferredArea = getPreferredIdeWindowArea();
      if (preferredArea && !looksLikeFullscreenArea(preferredArea)) {
        area = preferredArea;
      }
    }
  }

  const prevArea = lastIdeArea;
  const prevFullscreenLike = lastIdeLooksFullscreen;
  const nextFullscreenLike = looksLikeFullscreenArea(area);
  dbg(`[bounds] area=${area.width}x${area.height}@(${area.x},${area.y}) fullscreen=${nextFullscreenLike} prev=${lastIdeLooksFullscreen}`);

  if (!nextFullscreenLike && !looksLikeDesktopWorkAreaFrame(area)) {
    lastStableWindowedIdeArea = area;
  }

  lastIdeArea = area;
  lastIdeLooksFullscreen = nextFullscreenLike;
  ideInFullscreen = nextFullscreenLike;

  const isFullscreenTransition = process.platform === "darwin"
    && prevArea
    && prevFullscreenLike !== null
    && prevFullscreenLike !== nextFullscreenLike;

  if (chatWindow && !chatWindow.isDestroyed() && chatWindow.isVisible() && isNativePanelWindow(chatWindow)) {
    // Keep chat anchored to live IDE bounds. CGS (Swift watcher) manages
    // which Space the window is on — no JS-side visibility toggling here.
    if (area.x >= 0 && !anySpaceStealInProgress()) {
      pinnedChatArea = area;
      positionOverlayWindow(chatWindow, "chat", false);
    }
  }

  // During an active steal, track VS Code's position frame-by-frame so the
  // overlay moves WITH the animation. Skip frames where VS Code has negative X
  // — that means it's mid-Mission-Control slide (moving to its new Space) and
  // we must NOT follow it off screen. Stay at the target position instead.
  if (anySpaceStealInProgress()) {
    const offScreen = area.x < 0;
    dbg(`[bounds] steal in progress — ${offScreen ? "skip off-screen frame" : "tracking position"}`);
    if (!offScreen) {
      if (mainWindow && spaceStealWindows.has(mainWindow.id)) {
        positionOverlayWindow(mainWindow, "call", false);
        scheduleSpaceStealSettle(mainWindow, "call");
      }
      if (chatWindow && spaceStealWindows.has(chatWindow.id)) {
        // Update pinnedChatArea to the CURRENT VS Code position so the panel
        // actually follows VS Code through the transition animation.
        pinnedChatArea = area;
        positionOverlayWindow(chatWindow, "chat", false);
        scheduleSpaceStealSettle(chatWindow, "chat");
      }
    } else {
      // Still reset the settle timer so we wait until after VS Code returns.
      if (mainWindow && spaceStealWindows.has(mainWindow.id)) scheduleSpaceStealSettle(mainWindow, "call");
      if (chatWindow && spaceStealWindows.has(chatWindow.id)) scheduleSpaceStealSettle(chatWindow, "chat");
    }
    return;
  }

  if (isFullscreenTransition) {
    const now = Date.now();
    const sameDirectionAsLast = lastGeometryTransitionDirection === nextFullscreenLike;
    // Suppress same-direction duplicates within 900 ms.
    if (sameDirectionAsLast && now - lastGeometryTransitionRepinAt < 900) {
      dbg(`[bounds] transition duplicate suppressed entering=${nextFullscreenLike}`);
      return;
    }
    // Suppress reverse-direction transitions while a steal is in progress or
    // within 1.5 s of the last steal start — the Python poller (200 ms) sees
    // VS Code at intermediate sizes during animation and fires false bounces.
    if (anySpaceStealInProgress()) {
      dbg(`[bounds] reverse transition suppressed — steal in progress entering=${nextFullscreenLike}`);
      return;
    }
    if (!sameDirectionAsLast && now - lastGeometryTransitionRepinAt < 1500) {
      dbg(`[bounds] reverse transition suppressed — too soon after last entering=${nextFullscreenLike}`);
      return;
    }
    lastGeometryTransitionRepinAt = now;
    lastGeometryTransitionDirection = nextFullscreenLike;
    console.log(`[bounds] FULLSCREEN TRANSITION entering=${nextFullscreenLike} → doSpaceSteal`);
    dbg(`[bounds] FULLSCREEN TRANSITION entering=${nextFullscreenLike} → doSpaceSteal`);

    // Main window keeps legacy steal flow.
    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible()) {
      doSpaceSteal(mainWindow, "call");
    }

    // Chat: enter the same steal pipeline as the call bar during fullscreen
    // transitions so it moves Space membership and settles with VS Code.
    if (chatWindow && !chatWindow.isDestroyed() && chatWindow.isVisible() && isNativePanelWindow(chatWindow)) {
      // Force chat steal for both directions (windowed->fullscreen and
      // fullscreen->windowed). The default chat guard skips steal in
      // windowed mode; force=true bypasses that transition-breaking guard.
      doSpaceSteal(chatWindow, "chat", true);
      requestWatcherSpaceSync("chat-transition");
      pinnedChatArea = area;
      positionOverlayWindow(chatWindow, "chat", false);
    }
    return;
  }

  pinnedCallArea = area;
  pinnedChatArea = area;

  // Keep overlays anchored during normal bounds updates too so they follow
  // VS Code while windowed (move/resize) and recover from any stale startup
  // fallback position quickly.
  if (mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible()) {
    positionOverlayWindow(mainWindow, "call", false);
  }
  if (chatWindow && !chatWindow.isDestroyed() && chatWindow.isVisible()) {
    positionOverlayWindow(chatWindow, "chat", false);
  }

}

function attachWatcherStdio(proc, label) {
  let buf = "";
  proc.stdout.on("data", (chunk) => {
    buf += chunk.toString();
    const lines = buf.split("\n");
    buf = lines.pop();
    for (const line of lines) {
      const text = line.trim();
      if (!text) continue;
      if (handleWatcherEventLine(text)) continue;

      const area = parseArea(text);
      if (area) onIdeBoundsChanged(area);
    }
  });
  proc.stderr.on("data", (d) => {
    const msg = d.toString().trim();
    if (!msg) return;
    console.warn(`[watcher/${label}]`, msg);
    dbg(`[watcher/${label}] stderr ${msg}`);
  });
  proc.on("exit", (code) => {
    console.log(`[watcher/${label}] exited (${code})`);
    dbg(`[watcher/${label}] exited (${code})`);
    if (boundsWatcherProc === proc) {
      boundsWatcherProc = null;
      // Auto-respawn after crash — without this, all future transitions fall
      // back to the 1.2 s timer with no AX events at all.
      if (isSwiftWatcherReady()) {
        dbg(`[watcher] respawning after unexpected exit`);
        setTimeout(() => {
          if (!boundsWatcherProc) {
            const pidArg = String(Number.isFinite(IDE_PID) ? IDE_PID : "");
            spawnSwiftWatcher(pidArg, JSON.stringify(buildCandidateNames()));
          }
        }, 1500);
      }
    }
  });
}

function spawnSwiftWatcher(pidArg, nameLiteral) {
  dbg(`[watcher] spawn Swift pidArg=${pidArg || "(none)"} helperPid=${process.pid}`);
  const proc = spawn(WATCHER_BIN, [pidArg, nameLiteral, String(process.pid)], { stdio: ["pipe", "pipe", "pipe"] });
  boundsWatcherProc = proc;
  attachWatcherStdio(proc, "Swift/AXObserver");
  console.log("[watcher] started Swift/AXObserver (event-driven)");
}

function spawnPythonWatcher(pidArg, nameLiteral) {
  const pythonCandidates = [
    "/usr/local/bin/python3", "/opt/homebrew/bin/python3", "/usr/bin/python3", "python3",
  ];
  let py = resolvedPythonBin;
  if (!py) {
    for (const p of pythonCandidates) {
      try {
        execFileSync(p, ["-c", "from Quartz import CGWindowListCopyWindowInfo"],
          { encoding: "utf8", timeout: 3000 });
        py = p;
        resolvedPythonBin = p;
        break;
      } catch { /* try next */ }
    }
  }
  if (!py) { console.warn("[watcher] no python3 with Quartz — tracking disabled"); return; }

  const script = [
    "import sys,json,time",
    "from Quartz import CGWindowListCopyWindowInfo,kCGWindowListOptionAll,kCGNullWindowID",
    "tpid=int(sys.argv[1]) if len(sys.argv)>1 and sys.argv[1].strip() else None",
    "names=set(json.loads(sys.argv[2]))",
    "last=None",
    "while True:",
    " try:",
    "  wl=CGWindowListCopyWindowInfo(kCGWindowListOptionAll,kCGNullWindowID) or []",
    "  bp=None;bn=None",
    "  for w in wl:",
    "   if w.get('kCGWindowLayer',0)!=0:continue",
    "   b=w.get('kCGWindowBounds') or {}",
    "   wx,wy,ww,wh=int(b.get('X',0)),int(b.get('Y',0)),int(b.get('Width',0)),int(b.get('Height',0))",
    "   if ww<220 or wh<160:continue",
    "   a=ww*wh;pid=int(w.get('kCGWindowOwnerPID',-1));own=w.get('kCGWindowOwnerName','')",
    "   if tpid is not None and pid==tpid and(bp is None or a>bp[4]):bp=(wx,wy,ww,wh,a)",
    "   if own in names and(bn is None or a>bn[4]):bn=(wx,wy,ww,wh,a)",
    "  c=bp if tpid is not None else (bp or bn)",
    "  if c:",
    "   cur=(c[0],c[1],c[2],c[3])",
    "   if cur!=last:last=cur;sys.stdout.write(f'{cur[0]}|{cur[1]}|{cur[2]}|{cur[3]}\\n');sys.stdout.flush()",
    " except Exception as e:sys.stderr.write(str(e)+'\\n')",
    " time.sleep(0.2)",
  ].join("\n");

  const proc = spawn(py, ["-c", script, pidArg, nameLiteral], { stdio: ["ignore", "pipe", "pipe"] });
  boundsWatcherProc = proc;
  attachWatcherStdio(proc, "Python/polling");
  console.log("[watcher] started Python/polling fallback");
}

function compileSwiftWatcherAsync(pidArg, nameLiteral) {
  try { execFileSync("swiftc", ["--version"], { encoding: "utf8", timeout: 4000 }); }
  catch { console.log("[watcher] swiftc not found — staying on Python fallback"); return; }

  try { fs.mkdirSync(WATCHER_DIR, { recursive: true }); } catch { /* exists */ }
  fs.writeFileSync(WATCHER_SRC, SWIFT_WATCHER_SOURCE.trim());
  console.log("[watcher] compiling Swift AXObserver watcher (one-time ~10 s)...");

  const compiler = spawn("swiftc", ["-O", WATCHER_SRC, "-o", WATCHER_BIN],
    { stdio: ["ignore", "pipe", "pipe"] });
  compiler.stderr.on("data", (d) => console.warn("[swiftc]", d.toString().trim()));
  compiler.on("exit", (code) => {
    if (code !== 0) { console.error("[watcher] swiftc failed — keeping Python fallback"); return; }
    try { fs.writeFileSync(WATCHER_VER_FILE, WATCHER_VERSION); } catch { /* ignore */ }
    console.log("[watcher] Swift watcher compiled — switching from Python to AXObserver");
    stopBoundsWatcher();
    spawnSwiftWatcher(pidArg, nameLiteral);
  });
}

function startDisplayWatcherFallback() {
  if (displayWatcherCleanup) return;

  const onDisplayChanged = () => {
    // Non-mac fallback: keep overlays anchored to the active display's work area.
    onIdeBoundsChanged(getCursorDisplayWorkArea());
  };

  screen.on("display-added", onDisplayChanged);
  screen.on("display-removed", onDisplayChanged);
  screen.on("display-metrics-changed", onDisplayChanged);
  onDisplayChanged();

  displayWatcherCleanup = () => {
    screen.removeListener("display-added", onDisplayChanged);
    screen.removeListener("display-removed", onDisplayChanged);
    screen.removeListener("display-metrics-changed", onDisplayChanged);
    displayWatcherCleanup = null;
  };
}

function startBoundsWatcher() {
  if (process.platform !== "darwin") {
    startDisplayWatcherFallback();
    return;
  }
  if (boundsWatcherProc) return;

  const pidArg = String(Number.isFinite(IDE_PID) ? IDE_PID : "");
  const nameLiteral = JSON.stringify(buildCandidateNames());
  dbg(`[watcher] startBoundsWatcher version=${WATCHER_VERSION} ready=${isSwiftWatcherReady()} pidArg=${pidArg || "(none)"}`);

  if (isSwiftWatcherReady()) {
    spawnSwiftWatcher(pidArg, nameLiteral);
    return;
  }

  // First launch: start Python polling immediately, compile Swift in background.
  // On subsequent launches the binary exists and Swift starts directly.
  spawnPythonWatcher(pidArg, nameLiteral);
  compileSwiftWatcherAsync(pidArg, nameLiteral);
}

function stopBoundsWatcher() {
  if (displayWatcherCleanup) {
    displayWatcherCleanup();
  }

  if (boundsWatcherProc) {
    boundsWatcherProc.kill();
    boundsWatcherProc = null;
  }
}

// ── One-shot window area query (startup / fallback) ───────────────────────────
// Used for the initial anchor and as a fallback when the watcher is unavailable.
function getIdeWindowAreaOnce() {
  if (process.platform !== "darwin") return null;

  const candidates = buildCandidateNames();
  if (candidates.length === 0) return null;

  const namesLiteral = JSON.stringify(candidates);
  const titleLiteral = JSON.stringify(IDE_WINDOW_TITLE || "");
  const pyScript = [
    "import sys, json",
    "try:",
    "  from Quartz import CGWindowListCopyWindowInfo, kCGWindowListOptionAll, kCGNullWindowID",
    "  target_pid = None",
    "  if len(sys.argv) > 1:",
    "    tpid = str(sys.argv[1]).strip()",
    "    if tpid:",
    "      target_pid = int(tpid)",
    `  names = set(json.loads(r'''${namesLiteral}'''))`,
    `  target_title = (json.loads(r'''${titleLiteral}''') or '').strip().lower()`,
    "  wl = CGWindowListCopyWindowInfo(kCGWindowListOptionAll, kCGNullWindowID) or []",
    "  best_title = None",
    "  best_pid = None",
    "  best = None",
    "  for w in wl:",
    "    if w.get('kCGWindowLayer', 0) != 0: continue",
    "    owner = w.get('kCGWindowOwnerName')",
    "    if owner not in names: continue",
    "    b = w.get('kCGWindowBounds') or {}",
    "    wx,wy,ww,wh = int(b.get('X',0)),int(b.get('Y',0)),int(b.get('Width',0)),int(b.get('Height',0))",
    "    if ww < 220 or wh < 160: continue",
    "    area = ww*wh",
    "    title = str(w.get('kCGWindowName') or '').lower()",
    "    pid = int(w.get('kCGWindowOwnerPID', -1))",
    "    if target_title and target_title in title:",
    "      if best_title is None or area > best_title[4]: best_title = (wx,wy,ww,wh,area)",
    "    if target_pid is not None and pid == target_pid:",
    "      if best_pid is None or area > best_pid[4]: best_pid = (wx,wy,ww,wh,area)",
    "    if best is None or area > best[4]: best = (wx,wy,ww,wh,area)",
    "  chosen = (best_pid if target_pid is not None else (best_title or best_pid or best))",
    "  if chosen: print(f'{chosen[0]}|{chosen[1]}|{chosen[2]}|{chosen[3]}')",
    "except Exception as e:",
    "  sys.stderr.write(str(e)+'\\n')",
  ].join("\n");

  const pythonCandidates = [
    "/usr/local/bin/python3",
    "/opt/homebrew/bin/python3",
    "/usr/bin/python3",
    "python3",
  ];

  let out = null;
  let lastErr = null;
  for (const py of pythonCandidates) {
    try {
      out = execFileSync(py, ["-c", pyScript, String(Number.isFinite(IDE_PID) ? IDE_PID : "")], {
        encoding: "utf8",
        timeout: 5000,
      }).trim();
      console.log(`[anchor] Python/Quartz (${py}) result: "${out}"`);
      if (!resolvedPythonBin) resolvedPythonBin = py; // cache for watcher
      break;
    } catch (err) {
      lastErr = err;
      console.warn(`[anchor] Python/Quartz failed with ${py}:`, String(err).split("\n")[0]);
    }
  }

  if (out === null) {
    console.error("[anchor] All python3 candidates failed. Last:", String(lastErr).split("\n")[0]);
    return null;
  }

  return parseArea(out);
}



function getPreferredIdeWindowArea() {
  if (process.platform !== "darwin") {
    return null;
  }

  // Prefer AX/System Events front-window geometry first. Quartz/CGWindowList
  // can return stale desktop-like bounds during Space/fullscreen transitions.
  const axTrusted = isAccessibilityTrusted(false);
  if (!axTrusted) {
    dbg("[anchor] AX not trusted; using quartz fallback");
  }
  if (axTrusted) {
    try {
      const scripts = [];

      if (IDE_BUNDLE_ID) {
        scripts.push({
          label: "bundle-id",
          script: [
            "tell application \"System Events\"",
            `set procs to every process whose bundle identifier is \"${IDE_BUNDLE_ID.replace(/\"/g, "\\\"")}\"`,
            "repeat with p in procs",
            "if (count of windows of p) > 0 then",
            "set {px, py} to position of front window of p",
            "set {pw, ph} to size of front window of p",
            "return px & \"|\" & py & \"|\" & pw & \"|\" & ph",
            "end if",
            "end repeat",
            "return \"\"",
            "end tell",
          ].join("\n"),
        });
      }

      if (!isNaN(IDE_PID) && IDE_PID > 0) {
        scripts.push({
          label: "pid",
          script: [
            "tell application \"System Events\"",
            `set procs to every process whose unix id is ${IDE_PID}`,
            "repeat with p in procs",
            "if (count of windows of p) > 0 then",
            "set {px, py} to position of front window of p",
            "set {pw, ph} to size of front window of p",
            "return px & \"|\" & py & \"|\" & pw & \"|\" & ph",
            "end if",
            "end repeat",
            "return \"\"",
            "end tell",
          ].join("\n"),
        });
      }

      const candidates = [];
      const push = (n) => {
        const c = String(n || "").trim();
        if (c && !candidates.includes(c)) candidates.push(c);
      };
      push(IDE_APP_NAME);
      ["Code - Insiders", "Code", "Visual Studio Code - Insiders", "Visual Studio Code",
       "Cursor", "Windsurf", "VSCodium"].forEach(push);
      const esc = (n) => '"' + String(n).replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
      const list = `{${candidates.map(esc).join(", ")}}`;
      scripts.push({
        label: "name",
        script: [
          "tell application \"System Events\"",
          `set ns to ${list}`,
          "repeat with n in ns",
          "set procs to every process whose name is (contents of n)",
          "repeat with p in procs",
          "if (count of windows of p) > 0 then",
          "set {px, py} to position of front window of p",
          "set {pw, ph} to size of front window of p",
          "return px & \"|\" & py & \"|\" & pw & \"|\" & ph",
          "end if",
          "end repeat",
          "end repeat",
          "return \"\"",
          "end tell",
        ].join("\n"),
      });

      for (const entry of scripts) {
        try {
          const out = execFileSync("osascript", ["-e", entry.script], { encoding: "utf8", timeout: 4000 }).trim();
          const axArea = parseArea(out);
          if (axArea) {
            dbg(`[anchor] source=ax-${entry.label} area=${axArea.width}x${axArea.height}@(${axArea.x},${axArea.y})`);
            return axArea;
          }
        } catch (err) {
          dbg(`[anchor] AX ${entry.label} lookup failed ${String(err).split("\\n")[0]}`);
        }
      }

      dbg("[anchor] AX query returned empty window frame");
    } catch (err) {
      dbg(`[anchor] AX query failed ${String(err).split("\\n")[0]}`);
      // Fall through to Quartz/Python fallback.
    }
  }

  const pyArea = getIdeWindowAreaOnce();
  if (pyArea) {
    if (!looksLikeFullscreenArea(pyArea) && looksLikeDesktopWorkAreaFrame(pyArea)) {
      dbg(`[anchor] rejecting quartz desktop-like frame ${pyArea.width}x${pyArea.height}@(${pyArea.x},${pyArea.y})`);
      return null;
    }
    dbg(`[anchor] source=quartz-fallback area=${pyArea.width}x${pyArea.height}@(${pyArea.x},${pyArea.y})`);
    return pyArea;
  }
  return null;
}

function positionOverlayWindow(win, kind, animate = true) {
  if (!win || win.isDestroyed()) {
    return;
  }

  // macOS pins to an IDE window; other platforms use active display work area.
  if (process.platform !== "darwin") {
    if (kind === "call") {
      pinnedCallArea = null;
    } else {
      pinnedChatArea = null;
    }
  }

  let area = kind === "call" ? pinnedCallArea : pinnedChatArea;
  let anchorSource = "pinned";

  if (!area) {
    const detected = getPreferredIdeWindowArea();
    if (detected) {
      area = detected;
      anchorSource = "window-detection";
    } else if (PASSED_ANCHOR_AREA) {
      // Passed args are a useful bootstrap fallback, but may be stale or
      // display-sized. Prefer live window detection whenever possible.
      area = PASSED_ANCHOR_AREA;
      anchorSource = "passed-args";
    }

    if (!area) {
      let display = null;
      if (kind === "call" && pinnedCallDisplayId != null) {
        display = screen.getAllDisplays().find((d) => d.id === pinnedCallDisplayId) || null;
      }
      if (kind === "chat" && pinnedChatDisplayId != null) {
        display = screen.getAllDisplays().find((d) => d.id === pinnedChatDisplayId) || null;
      }
      if (!display) {
        display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
        if (kind === "call") pinnedCallDisplayId = display.id;
        if (kind === "chat") pinnedChatDisplayId = display.id;
      }

      area = {
        x: display.workArea.x,
        y: display.workArea.y,
        width: display.workArea.width,
        height: display.workArea.height,
      };
      anchorSource = "display-fallback";
    }

    if (kind === "call") {
      pinnedCallArea = area;
    } else {
      pinnedChatArea = area;
    }

    // Report anchor source so the extension can surface it for debugging.
    sendToExtension({
      type: "anchor-debug",
      kind,
      source: anchorSource,
      idePid: IDE_PID,
      bounds: { x: area.x, y: area.y, width: area.width, height: area.height },
    });
  }

  const bounds = win.getBounds();

  let x = bounds.x;
  let y = bounds.y;

  if (kind === "call") {
    if (windowPrefs.call.relX !== null && windowPrefs.call.relY !== null) {
      x = Math.round(area.x + windowPrefs.call.relX);
      y = Math.round(area.y + windowPrefs.call.relY);
    } else {
      x = Math.round(area.x + (area.width - bounds.width) / 2);
      y = Math.round(area.y + 18);
    }
  } else {
    // Native chat panel should behave like a fixed companion surface for VS Code.
    // Ignore persisted rel offsets for this mode because stale values (e.g. relX=0)
    // pin the panel to desktop-left after fullscreen transitions.
    if (!isNativePanelWindow(win) && windowPrefs.chat.relX !== null && windowPrefs.chat.relY !== null) {
      // Recover from stale bug-era saved offsets that pin chat to the extreme
      // left edge (relX=0/relY=0 or relY near menu bar) when anchor sources
      // were desktop-like during transitions.
      if (windowPrefs.chat.relX === 0 && windowPrefs.chat.relY <= 40 && area.x === 0) {
        windowPrefs.chat.relX = null;
        windowPrefs.chat.relY = null;
      }
      x = Math.round(area.x + windowPrefs.chat.relX);
      y = Math.round(area.y + windowPrefs.chat.relY);
    } else {
      x = Math.round(area.x + area.width - bounds.width - 24);
      y = Math.round(area.y + 72);
    }
  }

  const maxX = area.x + area.width - bounds.width;
  const maxY = area.y + area.height - bounds.height;
  x = Math.max(area.x, Math.min(x, maxX));
  y = Math.max(area.y, Math.min(y, maxY));

  dbg(`[pos] kind=${kind} source=${anchorSource} area=${area.width}x${area.height}@(${area.x},${area.y}) target=(${x},${y}) current=(${bounds.x},${bounds.y}) animate=${animate}`);

  markProgrammaticWindowMove(win, animate ? 600 : 80);
  win.setPosition(x, y, animate);
}

function repinOverlayWindowWithoutMoving(win) {
  if (!win || win.isDestroyed()) {
    return;
  }

  if (isNativePanelWindow(win)) {
    win.setAlwaysOnTop(true, "floating");
    win.showInactive();
    win.moveTop();
    return;
  }

  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  win.showInactive();
  win.moveTop();

  registerRepinTimer(win, setTimeout(() => {
    if (!win || win.isDestroyed()) return;
    if (anySpaceStealInProgress() || ideInFullscreen) return;
    win.setVisibleOnAllWorkspaces(false);
  }, 350));
}

function clearRepinTimers(win) {
  if (!win || win.isDestroyed()) {
    return;
  }

  const timers = repinTimersByWindowId.get(win.id);
  if (!timers) {
    return;
  }

  for (const t of timers) {
    clearTimeout(t);
  }
  repinTimersByWindowId.delete(win.id);
}

function registerRepinTimer(win, timerId) {
  if (!win || win.isDestroyed()) {
    clearTimeout(timerId);
    return;
  }

  const timers = repinTimersByWindowId.get(win.id) || [];
  timers.push(timerId);
  repinTimersByWindowId.set(win.id, timers);
}

function markProgrammaticWindowMove(win, durationMs = 350) {
  if (!win || win.isDestroyed()) return;
  ignoreWindowMoveSaveUntilById.set(win.id, Date.now() + durationMs);
}

function shouldIgnoreWindowMoveSave(win) {
  if (!win || win.isDestroyed()) return true;
  const until = ignoreWindowMoveSaveUntilById.get(win.id) || 0;
  return Date.now() < until;
}

function scheduleWindowPrefSave(kind, win) {
  if (!win || win.isDestroyed()) return;
  const existing = prefSaveTimerByWindowId.get(win.id);
  if (existing) clearTimeout(existing);

  const timer = setTimeout(() => {
    prefSaveTimerByWindowId.delete(win.id);
    if (!win || win.isDestroyed() || !lastIdeArea) return;
    if (anySpaceStealInProgress() || shouldIgnoreWindowMoveSave(win)) return;

    const b = win.getBounds();
    windowPrefs[kind].relX = b.x - lastIdeArea.x;
    windowPrefs[kind].relY = b.y - lastIdeArea.y;
    if (kind === "chat") {
      windowPrefs.chat.width = b.width;
      windowPrefs.chat.height = b.height;
    }
    dbg(`[prefs] ${kind} saved relX=${windowPrefs[kind].relX} relY=${windowPrefs[kind].relY}`);
    saveWindowPrefs();
  }, 180);

  prefSaveTimerByWindowId.set(win.id, timer);
}


function loadWindowPrefs() {
  try {
    const raw = fs.readFileSync(PREFS_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      if (parsed.call && typeof parsed.call === "object") Object.assign(windowPrefs.call, parsed.call);
      if (parsed.chat && typeof parsed.chat === "object") Object.assign(windowPrefs.chat, parsed.chat);
    }
    dbg(`[prefs] loaded call=(${windowPrefs.call.relX},${windowPrefs.call.relY}) chat=(${windowPrefs.chat.relX},${windowPrefs.chat.relY}) chatSize=${windowPrefs.chat.width}x${windowPrefs.chat.height}`);
  } catch {
    dbg("[prefs] no saved prefs, using defaults");
  }
}

function saveWindowPrefs() {
  try {
    fs.mkdirSync(path.dirname(PREFS_FILE), { recursive: true });
    fs.writeFileSync(PREFS_FILE, JSON.stringify(windowPrefs, null, 2));
    dbg("[prefs] saved");
    sendToExtension({ type: "window-prefs-updated", prefs: windowPrefs });
  } catch (err) {
    dbg("[prefs] save failed:", String(err).split("\n")[0]);
  }
}

// Called from the window's 'moved'/'resized' event to record the user's chosen
// position as a relative offset from the IDE area so it survives transitions.
function updateWindowPrefRelPos(kind, win) {
  if (!win || win.isDestroyed() || !lastIdeArea) return;
  // Debounced so drag/resize bursts persist only once near the final position.
  scheduleWindowPrefSave(kind, win);
}

function revealOverlayWindow(win) {
  if (!win || win.isDestroyed()) {
    return;
  }

  if (win === mainWindow) {
    positionOverlayWindow(win, "call");
  } else if (win === chatWindow) {
    positionOverlayWindow(win, "chat");
  }

  repinOverlayWindowWithoutMoving(win);

  // Chat must always join VS Code's current Space at reveal time. Do not rely
  // on fullscreen detection (it can be stale during startup/transition bursts).
  if (win === chatWindow) {
    const liveArea = getPreferredIdeWindowArea();
    if (liveArea) {
      pinnedChatArea = liveArea;
    }
    doSpaceSteal(win, "chat", true);
  }
}

// ── Create the floating global call window ───────────────────────────────────
function createCallWindow() {
  mainWindow = new BrowserWindow({
    show: false,
    width: 480,
    height: 58,
    minWidth: 360,
    minHeight: 58,
    maxHeight: 58,
    resizable: false,
    frame: false,
    transparent: true,
    title: "Multiplayer Call",
    backgroundColor: "#00000000",
    hasShadow: true,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  configureOverlayWindow(mainWindow, "call");
  mainWindow.loadFile(path.join(__dirname, "src", "renderer.html"));

  mainWindow.once("ready-to-show", () => {
    positionOverlayWindow(mainWindow, "call");
  });

  mainWindow.on("moved", () => updateWindowPrefRelPos("call", mainWindow));

  mainWindow.on("closed", () => {
    clearRepinTimers(mainWindow);
    const t = prefSaveTimerByWindowId.get(mainWindow.id);
    if (t) {
      clearTimeout(t);
      prefSaveTimerByWindowId.delete(mainWindow.id);
    }
    mainWindow = null;
    sendToExtension({ type: "call-ended" });
    if (!chatWindow || chatWindow.isDestroyed()) {
      setTimeout(() => app.quit(), 300);
    }
  });
}

// ── Create the floating chat window ──────────────────────────────────────────
function createChatWindow() {
  // No anchor window needed — CGS windowIDsForPid now finds chatWindow directly
  // (all layers, no kCGWindowLayer==0 filter) and moves it to VS Code's Space.

  chatWindow = new BrowserWindow({
    show: false,
    width: windowPrefs.chat.width || 320,
    height: windowPrefs.chat.height || 460,
    minWidth: 260,
    minHeight: 300,
    resizable: true,
    frame: false,
    transparent: true,
    title: "Multiplayer Chat",
    backgroundColor: "#00000000",
    hasShadow: true,
    skipTaskbar: true,
    ...(process.platform === "darwin"
      ? {
          hiddenInMissionControl: false,
          acceptFirstMouse: true,
        }
      : {}),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  configureOverlayWindow(chatWindow, "chat");
  chatWindow.loadFile(path.join(__dirname, "src", "renderer-chat.html"));

  chatWindow.once("ready-to-show", () => {
    // Prefer live IDE geometry on startup instead of display fallback coords.
    const startupArea = getPreferredIdeWindowArea() || lastIdeArea;
    if (startupArea) {
      pinnedChatArea = startupArea;
    }
    positionOverlayWindow(chatWindow, "chat", false);
    revealOverlayWindow(chatWindow);
    setTimeout(() => {
      if (chatWindow && !chatWindow.isDestroyed()) {
        reinforceNativePanelWindow(chatWindow);
      }
    }, 900);
  });

  chatWindow.on("moved",   () => updateWindowPrefRelPos("chat", chatWindow));
  chatWindow.on("resized", () => updateWindowPrefRelPos("chat", chatWindow));

  chatWindow.on("closed", () => {
    clearRepinTimers(chatWindow);
    const t = prefSaveTimerByWindowId.get(chatWindow.id);
    if (t) {
      clearTimeout(t);
      prefSaveTimerByWindowId.delete(chatWindow.id);
    }
    chatWindow = null;
    sendToExtension({ type: "chat-window-closed" });
    if (IS_CHAT_MODE || !mainWindow || mainWindow.isDestroyed()) {
      setTimeout(() => app.quit(), 300);
    }
  });
}

// ── IPC: close window requests ────────────────────────────────────────────────
ipcMain.on("helper-close-window", () => {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.close();
  if (chatWindow && !chatWindow.isDestroyed()) chatWindow.close();
});

// ── Connect back to the extension's IPC WebSocket server ─────────────────────
function connectToExtension() {
  if (extSocketConnecting || (extSocket && extSocket.readyState === WebSocket.OPEN)) {
    return;
  }

  extSocketConnecting = true;
  extSocket = new WebSocket(`ws://127.0.0.1:${IPC_PORT}`);

  extSocket.on("open", () => {
    extSocketConnecting = false;
    sendToExtension({
      type: "helper-ready",
      accessibilityTrusted: isAccessibilityTrusted(false),
      mode: IS_CHAT_MODE ? "chat" : "call",
    });
    sendToExtension({ type: "window-prefs-updated", prefs: windowPrefs });
  });

  extSocket.on("message", (data) => {
    try {
      const msg = JSON.parse(data.toString());

      // ── Call-mode messages ────────────────────────────────────────────────
      if (msg.type === "start-call") {
        handleStartCallRequest().catch((err) => {
          sendToExtension({
            type: "media-error",
            message: err?.message || String(err || "unknown permission error"),
          });
        });
        return;
      }

      // ── Chat-mode messages ────────────────────────────────────────────────
      if (msg.type === "chat-history" || msg.type === "chat-message" ||
          msg.type === "session-state" || msg.type === "participants") {
        sendToChat(msg);
        return;
      }

      if (msg.type === "close-chat-window") {
        chatWindow?.close();
        return;
      }

      if (msg.type === "open-chat-window") {
        if (!chatWindow || chatWindow.isDestroyed()) {
          createChatWindow();
          return;
        }
        revealOverlayWindow(chatWindow);
        return;
      }

      if (msg.type === "focus-overlay-window") {
        if (msg.target === "chat" && chatWindow && !chatWindow.isDestroyed()) {
          revealOverlayWindow(chatWindow);
        } else if (msg.target === "call" && mainWindow && !mainWindow.isDestroyed()) {
          revealOverlayWindow(mainWindow);
        } else if (IS_CHAT_MODE) {
          revealOverlayWindow(chatWindow);
        } else {
          revealOverlayWindow(mainWindow);
        }
        return;
      }

      // Extension notifies us when VS Code focus changes — this fires faster
      // than the Python poller and lets us sync space membership immediately
      // when VS Code enters/exits Mission Control or a Space transition.
      if (msg.type === "ide-focus-change") {
        requestWatcherSpaceSync("ide-focus-change");
        return;
      }

      if (msg.type === "ide-window-bounds") {
        const b = msg.bounds || {};
        const area = {
          x: Number(b.x),
          y: Number(b.y),
          width: Number(b.width),
          height: Number(b.height),
        };

        if ([area.x, area.y, area.width, area.height].every((n) => Number.isFinite(n)) && area.width >= 220 && area.height >= 160) {
          dbg(`[anchor] source=extension-bounds area=${area.width}x${area.height}@(${area.x},${area.y})`);
          onIdeBoundsChanged(area);
        }
        return;
      }

      // Extension can push new prefs (e.g. from a VS Code settings panel).
      if (msg.type === "set-window-prefs") {
        if (msg.prefs && typeof msg.prefs === "object") {
          if (msg.prefs.call) Object.assign(windowPrefs.call, msg.prefs.call);
          if (msg.prefs.chat) Object.assign(windowPrefs.chat, msg.prefs.chat);
          saveWindowPrefs();
          if (mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible()) positionOverlayWindow(mainWindow, "call");
          if (chatWindow && !chatWindow.isDestroyed() && chatWindow.isVisible()) positionOverlayWindow(chatWindow, "chat");
        }
        return;
      }

      // Forward other messages to whichever renderer is active
      if (IS_CHAT_MODE) {
        sendToChat(msg);
      } else {
        sendToRenderer(msg);
      }
    } catch {
      // Ignore malformed frames
    }
  });

  extSocket.on("close", () => {
    extSocketConnecting = false;
    extSocket = null;
    if (!IS_CHAT_MODE) {
      sendToRenderer({ type: "end-call" });
    }
    setTimeout(() => app.quit(), 500);
  });

  extSocket.on("error", () => {
    extSocketConnecting = false;
    extSocket = null;
    app.quit();
  });
}

async function handleStartCallRequest() {
  const micStatus = systemPreferences.getMediaAccessStatus("microphone");
  const camStatus = systemPreferences.getMediaAccessStatus("camera");

  const hasAudio = micStatus !== "denied" && micStatus !== "restricted";
  const hasVideo = camStatus !== "denied" && camStatus !== "restricted";

  if (!hasAudio && !hasVideo) {
    sendToExtension({ type: "media-denied" });
    return;
  }

  if (!hasVideo || !hasAudio) {
    const missing = [
      !hasAudio ? "microphone" : null,
      !hasVideo ? "camera" : null,
    ].filter(Boolean).join(" and ");

    sendToExtension({
      type: "call-state",
      text: `Limited permissions (${missing} denied in System Settings)`,
      connected: false,
    });
  }

  if (mainWindow && !mainWindow.isDestroyed()) {
    revealOverlayWindow(mainWindow);
  }

  sendToRenderer({
    type: "start-call",
    constraints: { audio: hasAudio, video: hasVideo },
  });
}

// ── Bridge: renderer → extension ─────────────────────────────────────────────
ipcMain.on("helper-to-ext", (_event, msg) => {
  sendToExtension(msg);
});

// ── Call renderer ready ───────────────────────────────────────────────────────
ipcMain.on("renderer-ready", () => {
  connectToExtension();
});

// ── Chat renderer ready ───────────────────────────────────────────────────────
ipcMain.on("chat-renderer-ready", () => {
  if (extSocket && extSocket.readyState === WebSocket.OPEN) {
    sendToExtension({ type: "chat-window-ready" });
    return;
  }
  connectToExtension();
});

// ── App lifecycle ─────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  ensureLaunchingIdeFrontmostOnce();

  loadWindowPrefs();

  // Defer dock.hide() so that window creation happens while the process still
  // has a normal macOS app type. This gives macOS enough context to assign the
  // window to VS Code's fullscreen Space during the Space-steal pin sequence.
  // At 700 ms the Space has already been pinned (pin fires at 350 ms).
  setTimeout(() => { if (app.dock) app.dock.hide(); }, 700);

  // Required to inspect other app window bounds via System Events.
  if (process.platform === "darwin" && !isAccessibilityTrusted(false)) {
    isAccessibilityTrusted(true);
  }

  // Capture the IDE window area NOW, while VS Code is guaranteed to still be
  // frontmost (we launched with `open -g` which keeps the calling app active).
  // This is the most reliable capture point — no focus race possible here.
  const earlyArea = getPreferredIdeWindowArea() || PASSED_ANCHOR_AREA;
  console.log(`[anchor] early detection: ${earlyArea ? `${earlyArea.width}x${earlyArea.height} @ (${earlyArea.x},${earlyArea.y})` : "FAILED — will use display fallback"} | appName="${IDE_APP_NAME}" pid=${IDE_PID}`);
  if (earlyArea) {
    ideInFullscreen = looksLikeFullscreenArea(earlyArea);
    pinnedCallArea = earlyArea;
    pinnedChatArea = earlyArea;
  }

  // Start persistent CGWindowList watcher to track VS Code window position/size
  // changes in real time (~200ms resolution). This repositions overlay windows
  // continuously during resize/move without spawning a new process per update.
  startBoundsWatcher();

  session.defaultSession.setPermissionRequestHandler(
    (_webContents, permission, callback) => {
      const mediaPermissions = new Set([
        "media", "microphone", "camera", "audioCapture", "videoCapture",
      ]);
      callback(mediaPermissions.has(permission));
    }
  );

  if (IS_CHAT_MODE) {
    createChatWindow();
  } else {
    createCallWindow();
  }
});

app.on("window-all-closed", () => {
  stopBoundsWatcher();
  app.quit();
});
