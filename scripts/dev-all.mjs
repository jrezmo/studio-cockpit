import { spawn } from "node:child_process";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

const children = [
  spawn(npmCommand, ["run", "dev"], {
    cwd: process.cwd(),
    stdio: "inherit",
  }),
  spawn(npmCommand, ["run", "dev:watch"], {
    cwd: new URL("../protools-mcp-server", import.meta.url).pathname,
    stdio: "inherit",
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
