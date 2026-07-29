# Contributing

This repository is a fork of
[openai/codex-security](https://github.com/openai/codex-security) that defaults
to OpenRouter (`moonshotai/kimi-k3`). Contributions belong here unless you are
intentionally contributing upstream.

## Report a bug

Search
[existing GitHub issues](https://github.com/marcopesani/codex-security/issues)
before opening a new one. Include the CLI or SDK version (`node ./bin/codex-security.mjs --version`
after building `sdk/typescript`), operating system, reproduction steps, expected
behavior, and the observed result.

Remove API keys, access tokens, repository contents, security findings, and
other sensitive information from public reports. Report security vulnerabilities
privately as described in [SECURITY.md](SECURITY.md).

## Request a feature or improve the documentation

Open a GitHub issue describing the problem, the workflow you want to support,
and any relevant product behavior. Documentation corrections and safe
reproduction details are welcome in the issue discussion.

## Develop locally

```bash
git clone https://github.com/marcopesani/codex-security.git
cd codex-security/sdk/typescript
pnpm install
pnpm build
pnpm lint
pnpm test
```

Run the CLI with `node ./bin/codex-security.mjs` after a successful build. Set
`OPENROUTER_API_KEY` for live scans.
