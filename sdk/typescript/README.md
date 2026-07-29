# Codex Security TypeScript SDK (OpenRouter fork)

Open-source TypeScript SDK and CLI for running Codex Security scans through
[OpenRouter](https://openrouter.ai/). This fork is built from source; it is
not installed from the published `@openai/codex-security` npm package.

The ESM-only package includes TypeScript declarations, the `codex-security`
executable, and the matching Codex runtime. Internally the package name remains
`@openai/codex-security` for compatibility with the upstream layout.

> [!NOTE]
> This package follows semantic versioning. Its public API may change between
> minor versions before `1.0.0`.

## Build from this repository

Requires Node.js 22 or later, [pnpm](https://pnpm.io/), and Python 3.10 or
later. If you use Python 3.10, install the `tomli` package. Select another
interpreter with `--python`, `pythonPath`, or `PYTHON` when needed.

```bash
git clone https://github.com/marcopesani/codex-security.git
cd codex-security/sdk/typescript
pnpm install
pnpm build
node ./bin/codex-security.mjs --version
```

Examples below assume your working directory is `sdk/typescript` after a
successful build. Optionally link the CLI globally with `pnpm link --global`
and then use `codex-security` instead of `node ./bin/codex-security.mjs`.

Set `CODEX_SECURITY_NO_UPDATE_NOTICE=1` to hide update notices (also disabled
in CI and when stderr is not a terminal).

## Run a scan from TypeScript

Set `OPENROUTER_API_KEY`, then create a client and scan a repository you own or
have permission to assess:

```ts
import { CodexSecurity } from "@openai/codex-security";

const security = new CodexSecurity();

try {
  const result = await security.run("/path/to/repository", {
    outputDir: "/path/outside/repository/results",
  });

  console.log(result.reportPath);
  console.log(result.findings.findings.length);
} finally {
  await security.close();
}
```

The SDK supports repository, path, committed-diff, and working-tree targets.
Use `security.preflight()` to validate local inputs, `onWorkerStatus` and
`onReconnect` to observe long-running scans, and an `AbortSignal` to cancel a
scan.

Results can contain source excerpts, vulnerability details, and reproduction
steps. Keep result directories and saved reports outside the repository and
limit access to authorized reviewers.

## Authentication

Codex Security uses [OpenRouter](https://openrouter.ai/) as the model provider.
Set `OPENROUTER_API_KEY` before scanning:

```bash
export OPENROUTER_API_KEY=...
node ./bin/codex-security.mjs scan .
```

On Windows, set the API key in PowerShell:

```powershell
$env:OPENROUTER_API_KEY = "<your-api-key>"
node ./bin/codex-security.mjs scan C:\code\repository
```

## CLI

```bash
node ./bin/codex-security.mjs scan /path/to/repository
node ./bin/codex-security.mjs scan /path/to/repository --model moonshotai/kimi-k3
node ./bin/codex-security.mjs scan /path/to/repository --model moonshotai/kimi-k3 --effort high
node ./bin/codex-security.mjs scan /path/to/repository --path src --path tests
node ./bin/codex-security.mjs scan /path/to/repository --knowledge-base /path/to/threat-models --knowledge-base /path/to/architecture.pdf
node ./bin/codex-security.mjs scan /path/to/repository --diff origin/main --json
node ./bin/codex-security.mjs scan /path/to/repository --output-dir /path/outside/repository/results
node ./bin/codex-security.mjs scan /path/to/repository --output-dir /path/outside/repository/results --archive-existing
node ./bin/codex-security.mjs scan /path/to/repository --dry-run
node ./bin/codex-security.mjs scan /path/to/repository --fail-on-severity high
node ./bin/codex-security.mjs scan /path/to/repository --max-cost 5
node ./bin/codex-security.mjs install-hook
node ./bin/codex-security.mjs bulk-scan
node ./bin/codex-security.mjs bulk-scan --model moonshotai/kimi-k3 --effort high
node ./bin/codex-security.mjs bulk-scan repositories.csv --output-dir /path/outside/repositories/security-scans --workers 4
node ./bin/codex-security.mjs scans list /path/to/repository
node ./bin/codex-security.mjs scans list --scan-root /path/outside/repository/results
node ./bin/codex-security.mjs scans show SCAN_ID
node ./bin/codex-security.mjs scans rerun SCAN_ID
node ./bin/codex-security.mjs scans match PREVIOUS_SCAN_ID CURRENT_SCAN_ID
node ./bin/codex-security.mjs scans match --all
node ./bin/codex-security.mjs scans compare PREVIOUS_SCAN_ID CURRENT_SCAN_ID
node ./bin/codex-security.mjs findings false-positive OCCURRENCE_ID --reason "The route already checks permissions"
node ./bin/codex-security.mjs export /path/outside/repository/results --export-format sarif --output /path/outside/repository/results.sarif
node ./bin/codex-security.mjs export /path/outside/repository/results --export-format csv --output /path/outside/repository/findings.csv
node ./bin/codex-security.mjs export /path/outside/repository/results --export-format json --output /path/outside/repository/findings.json
node ./bin/codex-security.mjs validate /path/outside/repository/findings.json "Possible SQL injection in src/query.ts:42"
node ./bin/codex-security.mjs validate "Possible SQL injection" --effort high
node ./bin/codex-security.mjs patch /path/outside/repository/findings.json "Missing authorization check in src/routes.ts:18"
node ./bin/codex-security.mjs patch "Missing authorization check" --effort high
```

Run `node ./bin/codex-security.mjs --version` for the installed CLI version or
`node ./bin/codex-security.mjs info --json` for the package, bundled plugin, Codex runtime,
default model, reasoning effort, and first-scan command. A scan with `--dry-run`
also reports its effective model and reasoning effort, including `--codex`
overrides, without starting Codex or contacting the network.

`install-hook` scans staged and unstaged changes before each commit. It respects
`core.hooksPath`, does not replace an existing hook, and blocks high-severity
findings or failed scans. Set `--fail-on-severity` to change the threshold.

`--path` scopes a scan to one or more paths, `--diff` scans committed changes,
and `--working-tree` scans staged and unstaged changes. Deep scans support
repository and path targets. The output directory must be outside the scanned
directory and any enclosing Git worktree. When SARIF is produced, it is written
to
`<scan-dir>/exports/results.sarif`.

Repeat `--knowledge-base PATH` for multiple files or directories. Directories are
searched recursively for Markdown, text, PDF, and Word (`.docx`) files.

On macOS/Linux, an existing output directory must be private to the current
user (`chmod 700`).

If the output directory already contains results, add `--archive-existing`.
The CLI moves them to `<output-dir>.previous-<timestamp>-<id>` and starts the
scan in a new, empty directory at the original path. Add `--dry-run` to see
the destination without moving files.

Scans are report-only by default. Use `--fail-on-severity` in CI to exit 1 when
a completed scan contains a finding at or above the selected severity.
Incomplete coverage and CLI/runtime errors exit 2 so they cannot be mistaken
for a passing policy. Incomplete scans still write the available human or JSON
result to stdout and a coverage warning to stderr, including in report-only
mode.

Scans use OpenRouter with `moonshotai/kimi-k3` and high reasoning effort
by default. Use `--model moonshotai/kimi-k3` to set the model explicitly and
`--effort minimal|low|medium|high|xhigh` to set reasoning effort. Repeat
`--codex KEY=VALUE` for other Codex settings; existing
`--codex 'model_reasoning_effort="high"'` overrides remain supported.

These overrides do not change the scan's approval policy or filesystem
permissions. See [Local security model](#local-security-model).

Scan progress identifies the requested paths and reports actual ranking,
file-review, validation, and attack-path phases as they become available.
Completion summarizes findings, severity, coverage, elapsed time, available
token and worker counts, estimated cost, the results directory, and the next
useful command.
Progress and summaries use stderr; structured scan results remain on stdout.

Each scan records its model, tokens, and estimated cost in its JSON result,
scan history, and bulk-scan receipt. Estimates use
[OpenRouter model pricing](https://openrouter.ai/moonshotai/kimi-k3),
including cached input when reported; fees and surcharges are not included.

Use `--max-cost USD` to stop a scan, including its delegated workers, when its
running cost exceeds the limit. Partial results are preserved. Requests
already in progress can finish above the limit.

Run `node ./bin/codex-security.mjs scan --help` or `node ./bin/codex-security.mjs bulk-scan --help`
for the complete CLI references.

Sign in with `gh auth login`, then run `node ./bin/codex-security.mjs bulk-scan` to discover
GitHub repositories pushed in the last 90 days. Archived
repositories and forks are excluded. Search the repository list, select the
repositories to scan, and confirm before scanning.
Private checkouts reuse your GitHub CLI sign-in without changing your global Git
configuration. The selected repositories are saved to
`<output-dir>/repositories.csv` for review or resumption.

To use an existing repository list or run in CI, pass a CSV with required `id`,
`repository`, and `revision` columns. Revisions must be full commit hashes;
optional `scope` and `mode` columns narrow individual scans:

```csv
id,repository,revision,scope,mode
service,https://github.com/acme/service.git,0123456789abcdef0123456789abcdef01234567,src,standard
```

`--workers` limits concurrent scans and `--max-attempts` retries failures.
Results remain under `--output-dir`; rerun the same command to resume.

### Scan history and reruns

`node ./bin/codex-security.mjs scans list` lists scans for the current repository. Pass a
repository path to inspect another checkout, `--scan-root DIR` to list scans
whose artifacts are under a particular root. `scans show SCAN_ID` includes the
scan configuration, results, coverage, and artifact locations.

Every scan history command accepts a full scan ID or a unique prefix of at
least eight characters.

Scan history uses the existing Codex Security workbench database at
`$CODEX_HOME/state/plugins/codex-security/workbench.sqlite3`. Set
`CODEX_SECURITY_STATE_DIR` to place the database elsewhere. Scan credentials
are never stored in the scan configuration.

The scan sandbox permits writes to the selected state directory so SQLite can
maintain its database and journal files. If the host itself cannot write to the
default directory, select a writable directory outside the scanned repository:

```bash
export CODEX_SECURITY_STATE_DIR=/path/to/writable/codex-security-state
```

Use `findings false-positive OCCURRENCE_ID --reason TEXT` to mark a finding as
a false positive and explain why. Later scans dismiss a matching finding only
when the same reason still applies.

`scans rerun SCAN_ID` repeats the original configuration against the current
checkout so a fixed vulnerability can be checked again.

`scans match BEFORE_SCAN_ID AFTER_SCAN_ID` links findings with the same root
cause; `scans match --all` matches all completed scans of the current repository,
including other worktrees and clones. Saved matches appear in `scans show` and
are reused unless `--force` is passed. Scans without sealed artifacts are skipped.

`scans compare BEFORE_SCAN_ID AFTER_SCAN_ID` reads saved matches and reports
findings as new, persisting, reopened, resolved, or unknown. Missing findings
are not treated as resolved when the later scan is incomplete or does not cover
their original scope.

The CLI uses [Incur](https://github.com/wevm/incur) for agent-friendly discovery
and structured output. Inspect the command manifest with `--llms`, inspect a
command schema with `scan --schema --format json`, register the CLI as an MCP
server with `mcp add`, sync agent skills with `skills add`, or generate shell
completions with `completions bash|zsh|fish`. Scan results support
`--format toon|json|yaml|jsonl` and `--full-output`.
Use `info --json` for SDK and bundled-plugin metadata. MCP exposes only this
read-only metadata command; scans, bulk repository scans,
authentication, exports, validation, and patching remain CLI-only because the
MCP transport cannot cancel active scans.

For CI, save machine-readable output outside the checked-out repository and
apply a severity policy. Incomplete coverage and runtime errors still exit
nonzero:

```bash
SCAN_ROOT="$(mktemp -d)"
node ./bin/codex-security.mjs scan . \
  --diff origin/main \
  --output-dir "$SCAN_ROOT/results" \
  --json \
  --fail-on-severity high > "$SCAN_ROOT/findings.json"
```

JSON scans never use interactive terminal controls, even when stderr is a TTY.
The `validate` and `patch` commands reject `--json` because they do not produce
structured CLI output. CSV exports cannot be written to stdout while JSON
output is requested.

Use `export` to create CSV, JSON, or SARIF from a completed, sealed scan without
starting Codex or loading credentials. JSON preserves the sealed findings
document. CSV uses the portable findings columns, marks findings as open, and
does not include local workbench triage state. The exporter validates the seal
before writing, accepts `--output -` for stdout, and can use
`--source-root /path/to/repository` with SARIF to add source-line fingerprints.
Run `node ./bin/codex-security.mjs export --help` for all export options.

Use `validate` to run the bundled validation skill on candidate findings and
`patch` to run the bundled fix-finding skill on security issues. Each positional
input can be either a file, whose contents are read into the request, or literal
text. Both commands operate on the current directory, use the scan model
and reasoning defaults, ignore unrelated user configuration and plugins, and
print the final response without the underlying Codex event stream. Override
the model with `--codex 'model="moonshotai/kimi-k3"'` and the reasoning effort
with `--effort high` or `--codex 'model_reasoning_effort="high"'`. Inputs are
limited to 64 items and 1 MiB total.

Canonical scan documents are limited to 16 MiB for the manifest, 128 MiB for
findings, and 32 MiB for coverage. Oversized scans are rejected before sealing.

Exit codes are `0` for a completed report-only scan or a passing policy, `1`
for a completed policy violation, `2` for invalid input, incomplete coverage, or
a runtime/export error, `130` for interruption, and `143` for termination.

Use `--dry-run` or `await security.preflight(...)` to validate the repository,
target, mode, output location, and Codex overrides without initializing the
runtime or loading credentials. Dry runs do not inspect the plugin or probe its
Python interpreter. The preflight result includes the selected authentication
method and, for an environment API key, its variable name. Authentication and
model access remain unverified until a real scan starts.

Scan progress identifies the selected credential source before Codex starts.
Progress remains on stderr so JSON output stays machine readable. Network
failures and rate limits remain retryable; definitive authentication and model
authorization failures stop immediately.

## Local security model

Codex Security runs with your local operating-system permissions. Scan only
repositories you trust and either own or are authorized to assess. Your
repository, Git installation, configured tools, and other scans under the
same account are not separate security principals.

Every scan uses the `codex_security_scan` filesystem profile and
`approvalPolicy: "never"`. It can read the local filesystem and write to
workspace roots and the selected scan state directory. Scans do not request
interactive approval. Setting `approval_policy`, `sandbox_mode`, or permissions
through `--codex` or SDK `codexOverrides` does not replace these controls or
make them more restrictive. Independently enforced host and network
restrictions still apply.

Scan and workbench subprocesses can inherit your environment, including
unrelated API tokens and cloud credentials. Start a scan with only the
credentials it needs.

The scanner must stay within the target and output paths you authorize and
must not disclose private data beyond the operation you requested. Its results
must accurately report the scan mode, reviewed files, and exclusions. Consult
the security policy for the full threat model and private reporting process.

## Documentation and security

- [Repository README](../../README.md)
- [GitHub issues](https://github.com/marcopesani/codex-security/issues) for bugs and
  feature requests
- [Security policy](../../SECURITY.md) for private vulnerability reporting and
  safe operation
- Upstream project: [openai/codex-security](https://github.com/openai/codex-security)
