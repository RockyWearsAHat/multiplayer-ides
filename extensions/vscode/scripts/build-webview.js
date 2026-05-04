const path = require("node:path");
const esbuild = require("esbuild");

const extensionRoot = path.resolve(__dirname, "..");
const entryFile = path.join(extensionRoot, "src", "webview", "index.jsx");
const outfile = path.join(extensionRoot, "src", "webview", "bundle.js");

esbuild
  .build({
    entryPoints: [entryFile],
    outfile,
    bundle: true,
    format: "iife",
    target: ["es2021"],
    minify: false,
    sourcemap: false,
    logLevel: "info"
  })
  .catch((error) => {
    console.error("Webview build failed", error);
    process.exit(1);
  });
