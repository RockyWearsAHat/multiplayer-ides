const { execSync } = require("node:child_process");
const fs = require("node:fs");

const IDE_CANDIDATES = [
  {
    id: "vscode",
    name: "Visual Studio Code",
    command: "code",
    appPaths: ["/Applications/Visual Studio Code.app"]
  },
  {
    id: "cursor",
    name: "Cursor",
    command: "cursor",
    appPaths: ["/Applications/Cursor.app"]
  },
  {
    id: "jetbrains-toolbox",
    name: "JetBrains (Toolbox/IDE)",
    command: "idea",
    appPaths: ["/Applications/IntelliJ IDEA.app", "/Applications/PyCharm.app"]
  },
  {
    id: "sublime",
    name: "Sublime Text",
    command: "subl",
    appPaths: ["/Applications/Sublime Text.app"]
  },
  {
    id: "neovim",
    name: "Neovim",
    command: "nvim",
    appPaths: []
  },
  {
    id: "zed",
    name: "Zed",
    command: "zed",
    appPaths: ["/Applications/Zed.app"]
  }
];

function hasCommand(command) {
  try {
    execSync(`command -v ${command}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function hasAppPath(appPaths) {
  return appPaths.some((path) => fs.existsSync(path));
}

function detectInstalledIdes() {
  return IDE_CANDIDATES.map((candidate) => ({
    ...candidate,
    detected: hasCommand(candidate.command) || hasAppPath(candidate.appPaths)
  }));
}

module.exports = {
  detectInstalledIdes
};
