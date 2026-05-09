# DeepSeekCode

[简体中文](README.md) | [English](README_EN.md)

A local CLI coding agent adapted from the Claude Code codebase, routing model requests to DeepSeek's Anthropic-compatible API.

> Community fork — not an official DeepSeek or Anthropic product.

## Features

- Project-aware chat with tool execution and permission prompts
- **Thinking mode** with configurable effort levels (low / high / max)
- File editing, sub-agents, MCP support, and `-p` non-interactive mode
- 1M context window, up to 384K output tokens
- Local config isolation under `.deepseek-code`

## Quick Start

```bash
git clone https://github.com/linyan185/deepseekcode.git
cd deepseekcode
npm ci --ignore-scripts
npm run check

export DEEPSEEK_API_KEY="sk-..."

cd /path/to/your/project
/path/to/deepseekcode/run-deepseek.cmd
```

One-shot mode:

```bash
deepseek-code -p "summarize this repository"
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
| [FAQ](docs/faq.md) | Troubleshooting, compatibility, common questions |

## How It Works

- Routes API calls through a DeepSeek adapter using the Anthropic SDK
- Thinking mode enabled by default with `high` effort
- Supports temperature 0.0–2.0 even with thinking enabled
- Automatic prefix caching (DeepSeek server-side, no `cache_control` needed)
- Converts unsupported content blocks (image, document, server-tool) to text placeholders
- Sub-agents inherit all DeepSeek environment variables

## Build

```bash
npm run build
```

Generated directories (`dist/`, `build-src/`) are git-ignored.

## License

[MIT](LICENSE)
