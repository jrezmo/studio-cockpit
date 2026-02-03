// MCP bridge for Pro Tools automation: resolves paths and invokes MCP tools.
import { spawn } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

export type McpResult = {
  ok: boolean;
  result?: unknown;
  error?: string;
  raw?: string;
};

/** Resolve the Pro Tools PTSL proto definition path from env or local SDK directory. */
export function resolveProtoPath() {
  const envPath = process.env.PTSL_PROTO_PATH;
  if (envPath && existsSync(envPath)) return envPath;

  try {
    const root = process.cwd();
    const candidates = readdirSync(root, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name.startsWith("PTSL_SDK_CPP"))
      .map((entry) =>
        path.join(root, entry.name, "Source", "PTSL.proto")
      );
    const found = candidates.find((candidate) => existsSync(candidate));
    if (found) return found;
  } catch {
    return null;
  }

  return null;
}

/** Resolve the MCP server entry point from env or the local protools-mcp-server build. */
export function resolveMcpPath() {
  const envPath = process.env.PROTOOLS_MCP_PATH;
  if (envPath && existsSync(envPath)) return envPath;

  const fallback = path.resolve(
    process.cwd(),
    "./protools-mcp-server/dist/index.js"
  );
  if (existsSync(fallback)) return fallback;

  return null;
}

/** Read the allow-writes policy string from env (comma-separated groups or "all"). */
export function getAllowWrites() {
  return process.env.PROTOOLS_ALLOW_WRITES || "";
}

/** Check whether the required write permission groups are enabled. */
export function hasWritePermissions(
  allowWrites: string,
  required: string[]
) {
  if (!allowWrites) return false;
  if (allowWrites === "all") return true;

  const groups = allowWrites
    .split(",")
    .map((group) => group.trim())
    .filter(Boolean);

  return required.every((group) => groups.includes(group));
}

/** Invoke an MCP tool with args, returning structured output and raw logs. */
export async function runMcpTool(
  tool: string,
  args: Record<string, unknown>,
  allowWrites?: string
): Promise<McpResult> {
  const protoPath = resolveProtoPath();
  if (!protoPath) {
    return {
      ok: false,
      error: "PTSL_PROTO_PATH not found. Set it in the environment.",
    };
  }

  const mcpPath = resolveMcpPath();
  if (!mcpPath) {
    return {
      ok: false,
      error:
        "PROTOOLS_MCP_PATH not found. Ensure protools-mcp-server is built and available.",
    };
  }

  const allow = allowWrites ?? getAllowWrites();
  const env = {
    ...process.env,
    PTSL_PROTO_PATH: protoPath,
    ...(allow ? { ALLOW_WRITES: allow } : {}),
  };

  const payload = {
    jsonrpc: "2.0",
    id: Date.now(),
    method: "tools/call",
    params: {
      name: tool,
      arguments: args,
    },
  };

  return await new Promise<McpResult>((resolve) => {
    const child = spawn(process.execPath, [mcpPath], {
      env,
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      resolve({
        ok: false,
        error: "Timed out waiting for MCP server response.",
      });
    }, 15000);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("close", () => {
      clearTimeout(timeout);
      const combined = `${stdout}\n${stderr}`.trim();
      const lines = combined
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      const jsonLine = [...lines].reverse().find(
        (line) => line.startsWith("{") && line.includes("\"jsonrpc\"")
      );

      if (!jsonLine) {
        resolve({
          ok: false,
          error: "No JSON response from MCP server.",
          raw: combined,
        });
        return;
      }

        try {
          const parsed = JSON.parse(jsonLine);
          if (parsed.error) {
            resolve({
              ok: false,
              error: parsed.error?.message || "MCP server returned an error.",
              raw: combined,
            });
            return;
          }

          const result = parsed.result ?? parsed;
          const isError =
            result &&
            typeof result === "object" &&
            "isError" in result &&
            Boolean((result as { isError?: boolean }).isError);

          if (isError) {
            const content = (result as { content?: Array<{ type: string; text?: string }> }).content;
            const message =
              Array.isArray(content) && content.length > 0
                ? content
                    .map((item) => (item.type === "text" ? item.text ?? "" : ""))
                    .filter(Boolean)
                    .join("\n")
                : "MCP tool returned an error.";

            resolve({
              ok: false,
              error: message,
              result,
              raw: combined,
            });
            return;
          }

          resolve({
            ok: true,
            result,
            raw: combined,
          });
        } catch (error) {
          resolve({
            ok: false,
            error: error instanceof Error ? error.message : "Invalid JSON response.",
            raw: combined,
          });
      }
    });

    child.stdin.write(`${JSON.stringify(payload)}\n`);
    child.stdin.end();
  });
}
