# Codex Security

`@openai/codex-security` is a CLI and TypeScript SDK for finding, validating, and fixing security vulnerabilities in your code.

**See the [Codex Security Documentation](http://learn.chatgpt.com/docs/security/cli)** for more details.

Scans use [OpenRouter](https://openrouter.ai/) as the model provider, with
`moonshotai/kimi-k3` as the default model.

## Quick start

Requires Node.js 22 or later, Python 3.10 or later, and an OpenRouter API key.

```bash
npm install @openai/codex-security
export OPENROUTER_API_KEY=...
npx @openai/codex-security scan .
npx @openai/codex-security scan . --model moonshotai/kimi-k3 --effort high
```

Scan history is stored in the Codex Security workbench state directory. If that
directory cannot be written, set `CODEX_SECURITY_STATE_DIR` to a writable
directory outside the repository.

## TypeScript SDK

```ts
import { CodexSecurity } from "@openai/codex-security";

const security = new CodexSecurity();
const result = await security.run(".");

console.log(result.reportPath);
await security.close();
```

For installation, authentication, scan options, and CI setup, see the [official documentation](http://learn.chatgpt.com/docs/security/cli).
