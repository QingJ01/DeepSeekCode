# DeepSeekCode

[简体中文](README.md) | [English](README_EN.md)

A local CLI coding agent adapted from the Claude Code codebase, routing model requests to DeepSeek's Anthropic-compatible API.

> Community fork, not an official DeepSeek or Anthropic product.

![DeepSeekCode](DeepSeekCode.png)

## Features

- Project-aware chat with tool execution and permission prompts
- **Thinking mode** with configurable effort levels (low / high / max)
- File editing, sub-agents, MCP support, and `-p` non-interactive mode
- 1M context window, up to 384K output tokens
- Local config isolation under `.deepseek-code`

## Quick Start

Install globally from npm:

```bash
npm install -g @qingj/deepseekcode
```

Set your DeepSeek API key:

```bash
export DEEPSEEK_API_KEY="sk-..."
```

Windows CMD:

```cmd
setx DEEPSEEK_API_KEY "sk-..."
```

Open a new terminal, then run DeepSeekCode from any project directory:

```bash
cd /path/to/your/project
deepseekcode
```

The equivalent command is also available:

```bash
deepseek-code
```

One-shot mode:

```bash
deepseek-code -p "summarize this repository"
```

## Build From Source

```bash
git clone https://github.com/QingJ01/DeepSeekCode.git
cd DeepSeekCode
npm ci --ignore-scripts
npm run check
```

Run the local source checkout:

```bash
node scripts/run-deepseek.mjs
```

## Model Aliases

| Alias | DeepSeek Model |
|-------|---------------|
| `pro` | `deepseek-v4-pro` |
| `flash` | `deepseek-v4-flash` |

Legacy Claude aliases (`sonnet`, `opus`, `haiku`, `best`) are still supported.

## Documentation

| Document | Description |
|----------|-------------|
| [Getting Started](docs/getting-started.md) | Installation, first run, API key setup |
| [Configuration](docs/configuration.md) | Environment variables, model aliases, settings.json |
| [Usage Guide](docs/usage.md) | Interactive mode, CLI flags, slash commands, tools |
| [Thinking & Effort](docs/thinking-and-effort.md) | Thinking mode, effort levels, output limits |
| [MCP & Advanced](docs/mcp-and-advanced.md) | MCP servers, sub-agents, hooks, worktrees, CI/CD |
| [Architecture](docs/architecture.md) | Project structure, build pipeline, adapter internals, dev guide |
| [FAQ](docs/faq.md) | Troubleshooting, compatibility, common questions |

## How It Works

- Routes API calls through a DeepSeek adapter using the Anthropic SDK
- Thinking mode enabled by default with `max` effort
- Temperature is ignored server-side when thinking is active (0.0-2.0 supported in non-thinking mode)
- Automatic prefix caching is handled server-side by DeepSeek; tools are sorted alphabetically to maximize cache hits
- Costs displayed in CNY (¥); `/cost` shows cache hit rate and savings
- Converts unsupported content blocks (image, document, server-tool) to text placeholders
- Sub-agents inherit all DeepSeek environment variables

## Build

```bash
npm run build
```

Generated directories (`dist/`, `build-src/`) are git-ignored.

## Contributing

Issues and pull requests are welcome. Development workflow:

```bash
git clone https://github.com/QingJ01/DeepSeekCode.git
cd DeepSeekCode
npm ci --ignore-scripts
npm run check          # Build and verify
npm test               # Run test suite
```

See [Architecture & Dev Guide](docs/architecture.md) for details.

## License

[MIT](LICENSE)

## Links

- [LINUX DO](https://linux.do)
