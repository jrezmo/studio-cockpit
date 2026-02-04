import { spawn, spawnSync } from "node:child_process";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

const repoRoot = process.cwd();
const protoPath = new URL(
  "../PTSL_SDK_CPP.2025.10.0.1232349/Source/PTSL.proto",
  import.meta.url
).pathname;
const mcpDistPath = new URL(
  "../protools-mcp-server/dist/index.js",
  import.meta.url
).pathname;

const sharedEnv = {
  ...process.env,
  PTSL_PROTO_PATH: process.env.PTSL_PROTO_PATH ?? protoPath,
  PROTOOLS_ALLOW_WRITES: process.env.PROTOOLS_ALLOW_WRITES ?? "all",
  ALLOW_WRITES: process.env.ALLOW_WRITES ?? "all",
  PROTOOLS_MCP_PATH: process.env.PROTOOLS_MCP_PATH ?? mcpDistPath,
};

if (!process.env.SKIP_SQLITE_REBUILD) {
  const rebuild = spawnSync(npmCommand, ["rebuild", "better-sqlite3"], {
    cwd: repoRoot,
    stdio: "inherit",
  });
  if (rebuild.status && rebuild.status !== 0) {
    process.exit(rebuild.status);
  }
}

const children = [
  spawn(npmCommand, ["run", "dev"], {
    cwd: repoRoot,
    stdio: "inherit",
    env: sharedEnv,
  }),
  spawn(npmCommand, ["run", "build:watch"], {
    cwd: new URL("../protools-mcp-server", import.meta.url).pathname,
    stdio: "inherit",
    env: sharedEnv,
  }),
];

const shutdown = () => {
  for (const child of children) {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  }
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

for (const child of children) {
  child.on("exit", (code) => {
    if (code && code !== 0) {
      shutdown();
      process.exit(code);
    }
  });
}
