const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const extensionRoot = path.resolve(__dirname, "..");
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
  const requiredPaths = ["src", "media", "scripts", "package.json", "README.md", "LICENSE"];

  for (const relPath of requiredPaths) {
    const source = path.join(extensionRoot, relPath);
    const target = path.join(tempRoot, relPath);
    fs.cpSync(source, target, { recursive: true });
  }
}

function cleanup() {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

try {
  copyRequiredFiles();

  run("npm", ["install", "--omit=dev"], tempRoot);
  run("npx", ["@vscode/vsce", "package", "-o", outFile, "--allow-missing-repository"], tempRoot);

  fs.copyFileSync(path.join(tempRoot, outFile), path.join(extensionRoot, outFile));
  console.log(`Created ${path.join(extensionRoot, outFile)}`);
} finally {
  cleanup();
}
