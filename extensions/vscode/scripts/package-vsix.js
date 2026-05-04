const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const extensionRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(extensionRoot, "..", "..");
const callHelperRoot = path.join(repoRoot, "apps", "call-helper");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "multiplayer-vsix-"));
const outFile = "multiplayer-code-bridge.vsix";

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
    shell: false
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

function copyRequiredFiles() {
  const requiredPaths = ["src", "media", "scripts", "package.json", "README.md", "LICENSE", ".vscodeignore"];

  for (const relPath of requiredPaths) {
    const source = path.join(extensionRoot, relPath);
    const target = path.join(tempRoot, relPath);
    fs.cpSync(source, target, { recursive: true });
  }

  // Bundle the standalone call helper into the extension so users do not need
  // to run manual install commands after VSIX installation.
  fs.cpSync(callHelperRoot, path.join(tempRoot, "call-helper"), {
    recursive: true,
    filter: (sourcePath) => !sourcePath.includes(`${path.sep}node_modules${path.sep}`)
  });
}

function materializeSymlink(linkPath) {
  const stat = fs.lstatSync(linkPath);
  if (!stat.isSymbolicLink()) {
    return;
  }

  const realTarget = fs.realpathSync(linkPath);
  fs.rmSync(linkPath, { recursive: true, force: true });

  const targetStat = fs.statSync(realTarget);
  if (targetStat.isDirectory()) {
    fs.cpSync(realTarget, linkPath, { recursive: true });
  } else {
    fs.copyFileSync(realTarget, linkPath);
  }
}

function materializeTreeSymlinks(rootDir) {
  if (!fs.existsSync(rootDir)) {
    return;
  }

  const stack = [rootDir];
  while (stack.length > 0) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isSymbolicLink()) {
        materializeSymlink(fullPath);
      }

      // Re-stat because a symlink may have been replaced with a directory.
      const nextStat = fs.statSync(fullPath);
      if (nextStat.isDirectory()) {
        stack.push(fullPath);
      }
    }
  }
}

function cleanup() {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

// ── macOS only: stamp the bundled Electron.app with our own app identity ──────
// The generic npm Electron binary ships as com.github.Electron.  macOS TCC uses
// bundle ID to cache permission decisions, so any prior allow/deny for
// com.github.Electron would silently affect the helper.  We rename the bundle to
// com.multiplayercode.helper so macOS treats it as a distinct app and shows the
// "Multiplayer Code Helper would like to access your camera" dialog fresh.
// After patching Info.plist we ad-hoc re-sign (identity "-") so macOS does not
// reject the modified bundle.
// ─────────────────────────────────────────────────────────────────────────────
function patchElectronAppIdentity(helperNodeModulesDir) {
  if (process.platform !== "darwin") { return; }

  const originalAppPath = path.join(helperNodeModulesDir, "electron", "dist", "Electron.app");
  const renamedAppPath  = path.join(helperNodeModulesDir, "electron", "dist", "Multiplayer Code Helper.app");

  // Rename the bundle folder — TCC uses the bundle name as the display name in
  // the permission dialog and the folder name is the most reliable source.
  if (fs.existsSync(originalAppPath) && !fs.existsSync(renamedAppPath)) {
    fs.renameSync(originalAppPath, renamedAppPath);
  }

  const appPath   = fs.existsSync(renamedAppPath) ? renamedAppPath : originalAppPath;
  const plistPath = path.join(appPath, "Contents", "Info.plist");

  if (!fs.existsSync(plistPath)) {
    console.log("Electron.app not found — skipping identity patch");
    return;
  }

  console.log("Patching Electron app identity for macOS TCC…");

  const patches = {
    CFBundleDisplayName:         "Multiplayer Code Helper",
    CFBundleName:                "Multiplayer Code Helper",
    CFBundleIdentifier:          "com.multiplayercode.helper",
    NSCameraUsageDescription:    "Multiplayer Code Helper uses your camera for video calls.",
    NSMicrophoneUsageDescription:"Multiplayer Code Helper uses your microphone for voice calls.",
  };

  for (const [key, value] of Object.entries(patches)) {
    const result = spawnSync("plutil", ["-replace", key, "-string", value, plistPath], {
      stdio: "inherit",
      shell: false,
    });
    if (result.status !== 0) {
      console.warn(`plutil -replace ${key} exited ${result.status} — continuing`);
    }
  }

  // Ad-hoc re-sign after Info.plist edits. Top-level signing is sufficient here
  // because only app metadata changed.
  console.log("Ad-hoc re-signing Electron.app (this may take a few seconds)…");
  const signResult = spawnSync(
    "codesign",
    ["--force", "--sign", "-", appPath],
    { stdio: "inherit", shell: false }
  );
  if (signResult.status !== 0) {
    console.warn("codesign returned non-zero — app may still work but check Gatekeeper if it doesn't");
  }

  console.log("Electron app identity patched ✓");
}

try {
  copyRequiredFiles();

  run("npm", ["install", "--omit=dev"], tempRoot);
  run("npm", ["install", "--omit=dev"], path.join(tempRoot, "call-helper"));
  materializeTreeSymlinks(path.join(tempRoot, "call-helper", "node_modules"));
  patchElectronAppIdentity(path.join(tempRoot, "call-helper", "node_modules"));
  run("npx", ["@vscode/vsce", "package", "-o", outFile, "--allow-missing-repository"], tempRoot);

  fs.copyFileSync(path.join(tempRoot, outFile), path.join(extensionRoot, outFile));
  console.log(`Created ${path.join(extensionRoot, outFile)}`);
} finally {
  cleanup();
}
