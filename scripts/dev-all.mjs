import { spawn } from "node:child_process";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

const repoRoot = process.cwd();
const protoPath = new URL(
  "../PTSL_SDK_CPP.2025.10.0.1232349/Source/PTSL.proto",
  import.meta.url
).pathname;
const sharedEnv = {
  ...process.env,
  PTSL_PROTO_PATH: process.env.PTSL_PROTO_PATH ?? protoPath,
};

const children = [
  spawn(npmCommand, ["run", "dev"], {
    cwd: repoRoot,
    stdio: "inherit",
    env: sharedEnv,
  }),
  spawn(npmCommand, ["run", "dev:watch"], {
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
