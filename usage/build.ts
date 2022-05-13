import { BuildOptions, build } from "esbuild";
import plugin from "../src/index";
import * as path from "path";

const binderBuilderConfig: BuildOptions = {
  entryPoints: [path.resolve(__dirname, "server.js")],
  outfile: path.resolve(__dirname, "build/binder.js"),
  conditions: ["worker"],
  platform: "neutral",
  format: "esm",
  treeShaking: true,
  mainFields: ["browser", "module", "main"],
  target: "node14",
  bundle: true,
  logLevel: "silent",
  incremental: undefined,
  sourcemap: false,
  assetNames: "_assets/[name]-[hash]",
  publicPath: "/build/",
  plugins: [plugin(true, "BINDEE", true)],
};

const bindeeBuilderConfig: BuildOptions = {
  entryPoints: [path.resolve(__dirname, "server.js")],
  outfile: path.resolve(__dirname, "build/bindee.js"),
  conditions: ["worker"],
  platform: "neutral",
  format: "esm",
  treeShaking: true,
  mainFields: ["browser", "module", "main"],
  target: "node14",
  bundle: true,
  logLevel: "silent",
  incremental: undefined,
  sourcemap: false,
  assetNames: "_assets/[name]-[hash]",
  publicPath: "/build/",
  plugins: [plugin(false, "BINDEE", true)],
};

const main = async () => {
  await build(binderBuilderConfig);
  await build(bindeeBuilderConfig);
};
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
