# Codex Security (OpenRouter fork)

Fork of [openai/codex-security](https://github.com/openai/codex-security) that
runs scans through [OpenRouter](https://openrouter.ai/) with
`moonshotai/kimi-k3` as the default model.

This is **not** the published `@openai/codex-security` npm package. Build and
run it from this repository.

## Quick start

Requires Node.js 22 or later, Python 3.10 or later, [pnpm](https://pnpm.io/),
and an OpenRouter API key.

```bash
git clone https://github.com/marcopesani/codex-security.git
cd codex-security/sdk/typescript
pnpm install
pnpm build

export OPENROUTER_API_KEY=...
node ./bin/codex-security.mjs scan /path/to/repository
node ./bin/codex-security.mjs scan /path/to/repository --model moonshotai/kimi-k3 --effort high
```

Optional: link the local CLI onto your PATH after building:

```bash
pnpm link --global
codex-security scan /path/to/repository
```

Scan history is stored in the Codex Security workbench state directory. If that
directory cannot be written, set `CODEX_SECURITY_STATE_DIR` to a writable
directory outside the repository.

## TypeScript SDK

After `pnpm build` in `sdk/typescript`, import from the local package (or link
it into your app):

```ts
import { CodexSecurity } from "@openai/codex-security";

const security = new CodexSecurity();
const result = await security.run(".");

console.log(result.reportPath);
await security.close();
```

For CLI options, authentication, and the local security model, see
[sdk/typescript/README.md](sdk/typescript/README.md).
