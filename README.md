# DeepSeekCode

[English](README.md) | [简体中文](README_CN.md)

A local CLI coding agent adapted from the Claude Code codebase, routing model requests to DeepSeek's Anthropic-compatible API.

> Community fork — not an official DeepSeek or Anthropic product.

## Features

- Project-aware chat with tool execution and permission prompts
- File editing, sub-agents, MCP support, and `-p` non-interactive mode
- Local config isolation under `.deepseek-code`
- Automatic sanitization of unsupported content blocks

## Requirements

- Node.js >= 18
- npm
- DeepSeek API key

## Install

```bash
git clone https://github.com/linyan185/deepseekcode.git
cd deepseekcode
npm ci --ignore-scripts
npm run check
```

## Usage

Set your API key:

```bash
export DEEPSEEK_API_KEY="sk-..."
```

Run from the project you want to work in:

```bash
cd /path/to/your/project
/path/to/deepseekcode/run-deepseek.cmd
```

One-shot mode:

```bash
/path/to/deepseekcode/run-deepseek.cmd -p "summarize this repository"
```

### Optional: Global Link

```bash
npm link
deepseek-code --version
```

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `DEEPSEEK_API_KEY` | — | Your DeepSeek API key |
| `DEEPSEEK_BASE_URL` | `https://api.deepseek.com/anthropic` | API endpoint |
| `DEEPSEEK_MODEL` | `deepseek-v4-pro` | Model to use |
| `DEEPSEEK_CODE_CONFIG_DIR` | `~/.deepseek-code` | Local config directory |

### Model Aliases

| Alias | DeepSeek Model |
|-------|---------------|
| `pro` | `deepseek-v4-pro` |
| `flash` | `deepseek-v4-flash` |

Legacy Claude aliases (`sonnet`, `opus`, `haiku`, `best`) are still supported for compatibility.

## How It Works

- Routes API calls through a DeepSeek adapter layer
- Skips Anthropic OAuth/keychain auth and analytics
- Sends DeepSeek-compatible effort controls, defaulting to `max`
- Converts unsupported blocks (image, document, thinking, server-tool) to text placeholders
- Sub-agents inherit all DeepSeek environment variables

## Build

```bash
npm run build
```

Generated directories (`dist/`, `build-src/`) are git-ignored.

## License

[MIT](LICENSE)
