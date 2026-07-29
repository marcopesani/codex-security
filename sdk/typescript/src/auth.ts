import { spawn } from "node:child_process";
import type { CodexCommand, ProcessEnvironment } from "./runtime.js";

export interface LoginResult {
  success: boolean;
  exitCode: number | null;
  stdout: string;
  stderr: string;
}

export interface AccountStatus {
  authenticated: boolean;
  details: string;
}

export async function accountStatus(
  command: CodexCommand,
  environment: ProcessEnvironment,
  signal?: AbortSignal,
): Promise<AccountStatus> {
  const result = await runCodex(
    command,
    ["login", "status"],
    environment,
    undefined,
    signal,
  );
  const details = [result.stdout.trim(), result.stderr.trim()]
    .filter(Boolean)
    .join("\n");
  return {
    authenticated:
      result.exitCode === 0 && !/not logged in|unauthenticated/i.test(details),
    details,
  };
}

export async function runCodex(
  command: CodexCommand,
  args: readonly string[],
  environment: ProcessEnvironment,
  input?: string,
  signal?: AbortSignal,
): Promise<LoginResult> {
  const child = spawn(command.command, [...command.prefixArgs, ...args], {
    env: environment,
    stdio: ["pipe", "pipe", "pipe"],
    windowsHide: true,
    signal,
  });
  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk: string) => {
    stdout += chunk;
  });
  child.stderr.on("data", (chunk: string) => {
    stderr += chunk;
  });
  const completion = new Promise<LoginResult>((resolve, reject) => {
    let processError: Error | null = null;
    child.once("error", (error) => {
      processError = error;
    });
    child.stdin.on("error", (error: NodeJS.ErrnoException) => {
      // A short-lived command can close stdin before Node flushes the input.
      // Its exit status remains authoritative; the stream error must not escape
      // as an uncaught exception.
      if (
        error.code !== "EPIPE" &&
        error.code !== "ECONNRESET" &&
        error.code !== "EOF" &&
        error.code !== "ERR_STREAM_DESTROYED"
      ) {
        processError ??= error;
      }
    });
    child.once("close", (exitCode) => {
      if (processError !== null) {
        reject(processError);
      } else {
        resolve({ success: exitCode === 0, exitCode, stdout, stderr });
      }
    });
  });
  child.stdin.end(input);
  return await completion;
}
