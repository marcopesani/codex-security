import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import { accountStatus, runCodex } from "../src/auth.js";
import type { CodexCommand } from "../src/index.js";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((path) => rm(path, { recursive: true, force: true })),
  );
});

async function fakeCodex(): Promise<CodexCommand> {
  const root = await mkdtemp(join(tmpdir(), "codex-security-auth-"));
  temporaryDirectories.push(root);
  const script = join(root, "codex.mjs");
  await writeFile(
    script,
    `
const args = process.argv.slice(2);
if (args.join(" ") === "login status") {
  console.log("Logged in using an API key");
} else if (args.join(" ") === "echo-input") {
  let input = "";
  for await (const chunk of process.stdin) input += chunk;
  console.log(input.trim());
} else {
  console.error("unexpected args: " + args.join(" "));
  process.exitCode = 3;
}
`,
  );
  return { command: process.execPath, prefixArgs: [script] };
}

describe("Codex authentication process boundary", () => {
  test("runs the exact public Codex executable and captures its streams", async () => {
    const command = await fakeCodex();
    await expect(
      runCodex(command, ["echo-input"], process.env, "hello codex\n"),
    ).resolves.toMatchObject({
      success: true,
      exitCode: 0,
      stdout: "hello codex\n",
    });
    await expect(
      runCodex(command, ["unknown-command"], process.env),
    ).resolves.toMatchObject({
      success: false,
      exitCode: 3,
      stderr: expect.stringContaining("unexpected args"),
    });
  });

  test("handles a child closing stdin before the write completes", async () => {
    const root = await mkdtemp(join(tmpdir(), "codex-security-auth-epipe-"));
    temporaryDirectories.push(root);
    const script = join(root, "exit.mjs");
    await writeFile(script, "process.exit(1);\n");
    await expect(
      runCodex(
        { command: process.execPath, prefixArgs: [script] },
        [],
        process.env,
        "x".repeat(16 * 1024 * 1024),
      ),
    ).resolves.toMatchObject({ success: false, exitCode: 1 });
  });

  test("reports account state from the delegated Codex status command", async () => {
    const command = await fakeCodex();
    await expect(accountStatus(command, process.env)).resolves.toMatchObject({
      authenticated: true,
      details: "Logged in using an API key",
    });
  });

  test("reports an unauthenticated account without masking details", async () => {
    const root = await mkdtemp(join(tmpdir(), "codex-security-auth-status-"));
    temporaryDirectories.push(root);
    const script = join(root, "codex.mjs");
    await writeFile(script, 'console.log("Not logged in");\n');
    await expect(
      accountStatus(
        { command: process.execPath, prefixArgs: [script] },
        process.env,
      ),
    ).resolves.toEqual({
      authenticated: false,
      details: "Not logged in",
    });
  });
});
