import { describe, expect, test } from "bun:test";
import { main } from "../src/cli.js";
import { CodexSecurityError, type ScanOptions } from "../src/index.js";
import {
  capture,
  dependencies,
  fakePreflight,
  fakeResult,
} from "./support/cli.js";

describe("CLI authentication", () => {
  test("forwards explicit and automatic scan authentication selection", async () => {
    for (const [argv, expected] of [
      [["scan", "--auth", "api-key"], "api-key"],
      [["scan", "--auth", "auto"], "auto"],
      [["scan"], "auto"],
    ] as const) {
      let selected: ScanOptions["auth"];
      const stderr = capture();

      expect(
        await main(
          argv,
          capture().stream,
          stderr.stream,
          dependencies({
            environment: { OPENROUTER_API_KEY: "synthetic-private-key" },
            onTurn: (_repository, options) => {
              selected = (options as ScanOptions).auth;
            },
          }),
        ),
      ).toBe(0);
      expect(selected).toBe(expected);
      expect(stderr.text()).not.toContain("synthetic-private-key");
    }
  });

  test("never prompts during automation, explicit selection, or unavailable credentials", async () => {
    for (const scenario of [
      { argv: ["scan", "--json"], terminal: true, key: true },
      { argv: ["scan", "--format", "jsonl"], terminal: true, key: true },
      { argv: ["scan", "--dry-run"], terminal: true, key: true },
      { argv: ["scan", "--auth", "api-key"], terminal: true, key: true },
      { argv: ["scan"], terminal: false, key: true },
      { argv: ["scan"], terminal: true, key: false },
      { argv: ["scan"], terminal: true, key: true, inputInteractive: false },
    ]) {
      const stderr = capture(scenario.terminal);
      let selected: ScanOptions["auth"];
      let prompts = 0;
      const deps = dependencies({
        environment: scenario.key
          ? { OPENROUTER_API_KEY: "synthetic-private-key" }
          : {},
        onTurn: (_repository, options) => {
          selected = (options as ScanOptions).auth;
        },
      });
      deps.scanAuthenticationPrompt = {
        isInteractive: () => scenario.inputInteractive !== false,
        select: async <Value extends string>(
          _message: string,
          options: readonly { label: string; value: Value }[],
        ): Promise<Value> => {
          prompts += 1;
          return options[0]!.value;
        },
      };

      expect(
        await main(scenario.argv, capture().stream, stderr.stream, deps),
      ).toBe(0);
      expect(prompts).toBe(0);
      if (!scenario.argv.includes("--dry-run")) {
        expect(selected).toBe(
          scenario.argv.includes("api-key") ? "api-key" : "auto",
        );
      }
      expect(stderr.text()).not.toContain("synthetic-private-key");
    }
  });

  test("rejects explicit API-key authentication before initializing a scan when no key is set", async () => {
    const stderr = capture();
    const deps = dependencies();
    deps.createSecurity = () => {
      throw new Error("must not initialize Codex Security");
    };

    expect(
      await main(
        ["scan", "--auth", "api-key"],
        capture().stream,
        stderr.stream,
        deps,
      ),
    ).toBe(2);
    expect(stderr.text()).toContain(
      "API-key authentication requires OPENROUTER_API_KEY.",
    );
    expect(stderr.text()).not.toContain("must not initialize");
  });

  test("reports selected scan credentials without contaminating JSON output", async () => {
    const stdout = capture();
    const stderr = capture(true);
    const deps = dependencies();
    deps.createSecurity = () => ({
      run: async (_repository, options) => {
        options?.onAuthentication?.({
          method: "api_key",
          source: "OPENROUTER_API_KEY",
          verified: false,
        });
        options?.onScanStarted?.();
        return fakeResult();
      },
      preflight: async () => fakePreflight(),
      close: async () => {},
    });

    expect(
      await main(["scan", "--json"], stdout.stream, stderr.stream, deps),
    ).toBe(0);
    expect(JSON.parse(stdout.text())).toEqual(fakeResult().toJSON());
    expect(stderr.text()).toContain(
      "Authentication: API key from OPENROUTER_API_KEY.",
    );
  });

  test("identifies overriding API keys in noninteractive scan auth failures", async () => {
    for (const [detail, expected] of [
      ["401 invalid API key for org-private", "Authentication failed"],
      [
        "403 model access denied for org-private",
        "cannot access the configured model",
      ],
    ] as const) {
      const stdout = capture();
      const stderr = capture(false);
      const deps = dependencies({
        environment: { OPENROUTER_API_KEY: "sk-or-SYNTHETIC_SECRET_123" },
      });
      deps.createSecurity = () => ({
        run: async (_repository, options) => {
          options?.onAuthentication?.({
            method: "api_key",
            source: "OPENROUTER_API_KEY",
            verified: false,
          });
          throw new CodexSecurityError(detail);
        },
        preflight: async () => fakePreflight(),
        close: async () => {},
      });

      expect(await main(["scan"], stdout.stream, stderr.stream, deps)).toBe(2);
      expect(stdout.text()).toBe("");
      expect(stderr.text()).toContain(expected);
      expect(stderr.text()).toContain("OPENROUTER_API_KEY");
      expect(stderr.text()).toContain("OpenRouter API key");
      expect(stderr.text()).not.toContain("SYNTHETIC_SECRET");
      expect(stderr.text()).not.toContain("org-private");
    }
  });

  test("identifies the rejected API-key source without exposing its value", async () => {
    for (const [environment, message] of [
      [
        { OPENROUTER_API_KEY: "sk-or-SYNTHETIC_SECRET_123" },
        "401 invalid API key for org-private",
      ],
      [
        { Openrouter_Api_Key: "sk-or-SYNTHETIC_SECRET_456" },
        "403 model access denied for org-private",
      ],
    ] as const) {
      const stderr = capture(false);
      const deps = dependencies({ environment });
      deps.createSecurity = () => ({
        run: async () => {
          throw new CodexSecurityError(message);
        },
        preflight: async () => fakePreflight(),
        close: async () => {},
      });

      expect(await main(["scan"], capture().stream, stderr.stream, deps)).toBe(
        2,
      );
      expect(stderr.text()).toContain("OPENROUTER_API_KEY");
      expect(stderr.text()).not.toContain("SYNTHETIC_SECRET");
      expect(stderr.text()).not.toContain("org-private");
    }
  });

  test("reports stored and API-key scan authentication on stderr", async () => {
    for (const [authentication, expected] of [
      [
        { method: "stored_credentials", verified: false },
        "Authentication: stored Codex credentials.",
      ],
      [
        { method: "api_key", source: "OPENROUTER_API_KEY", verified: false },
        "Authentication: API key from OPENROUTER_API_KEY.",
      ],
    ] as const) {
      const stdout = capture();
      const stderr = capture();
      const deps = dependencies();
      deps.createSecurity = () => ({
        run: async (_repository, options) => {
          options?.onAuthentication?.(authentication);
          return fakeResult();
        },
        preflight: async () => fakePreflight(),
        close: async () => {},
      });

      expect(
        await main(["scan", "--json"], stdout.stream, stderr.stream, deps),
      ).toBe(0);
      expect(stderr.text()).toContain(expected);
      expect(stderr.text()).not.toContain("env -u");
      expect(JSON.parse(stdout.text())).toEqual(fakeResult().toJSON());
    }
  });

  test("keeps selected dry-run authentication metadata safe and machine readable", async () => {
    const stdout = capture();
    const stderr = capture();
    const authentication = {
      method: "api_key" as const,
      source: "OPENROUTER_API_KEY" as const,
      verified: false as const,
    };
    expect(
      await main(
        ["scan", "repo", "--dry-run", "--json"],
        stdout.stream,
        stderr.stream,
        dependencies({
          environment: { OPENROUTER_API_KEY: "synthetic-private-key" },
          preflight: { ...fakePreflight("repo"), authentication },
        }),
      ),
    ).toBe(0);
    expect(JSON.parse(stdout.text())).toMatchObject({ authentication });
    expect(`${stdout.text()}${stderr.text()}`).not.toContain("synthetic");
  });
});
