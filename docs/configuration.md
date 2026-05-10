# 配置参考

## 环境变量

### DeepSeek 核心变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `DEEPSEEK_API_KEY` | — | **必填**，DeepSeek API 密钥 |
| `DEEPSEEK_BASE_URL` | `https://api.deepseek.com/anthropic` | API 端点地址 |
| `DEEPSEEK_MODEL` | `deepseek-v4-pro[1m]` | 默认模型 |
| `DEEPSEEK_CODE_CONFIG_DIR` | `~/.deepseek-code` | 本地配置目录 |
| `CLAUDE_CODE_USE_DEEPSEEK` | `1`（启动器自动设置） | 显式选择 DeepSeek provider |

### 推理控制

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `CLAUDE_CODE_EFFORT_LEVEL` | `high` | 推理等级：`low`、`medium`、`high`、`max` |
| `CLAUDE_CODE_DISABLE_THINKING` | — | 设为 `1` 关闭 thinking 推理模式 |
| `MAX_THINKING_TOKENS` | — | 自定义 thinking token 预算 |
| `CLAUDE_CODE_MAX_OUTPUT_TOKENS` | — | 自定义最大输出 token（上限 384K） |

### 行为控制

| 变量 | 说明 |
|------|------|
| `CLAUDE_CODE_SUBAGENT_MODEL` | 子代理使用的模型（如 `deepseek-v4-flash`） |
| `BASH_DEFAULT_TIMEOUT_MS` | Bash 命令默认超时（毫秒） |
| `BASH_MAX_TIMEOUT_MS` | Bash 命令最大超时 |
| `BASH_MAX_OUTPUT_LENGTH` | Bash 输出最大长度 |
| `DISABLE_TELEMETRY` | 设为 `1` 关闭遥测 |
| `MCP_TIMEOUT` | MCP 连接超时 |
| `MCP_TOOL_TIMEOUT` | MCP 工具调用超时 |

## 模型别名

DeepSeekCode 提供简短别名，可在 `--model` 参数或 `/model` 命令中使用：

| 别名 | 实际模型 | 说明 |
|------|----------|------|
| `pro` | `deepseek-v4-pro` | 推荐，最强推理能力 |
| `flash` | `deepseek-v4-flash` | 快速响应，适合简单任务 |

兼容旧版 Claude 别名：

| 别名 | 映射到 |
|------|--------|
| `sonnet`、`opus`、`best` | `deepseek-v4-pro` |
| `haiku` | `deepseek-v4-flash` |

### 使用示例

```bash
# 命令行指定
deepseek-code --model flash

# 环境变量指定
export DEEPSEEK_MODEL="deepseek-v4-flash"
```

在交互模式中也可以用 `/model` 命令切换。

## 上下文窗口

两个模型都支持 **1M（100 万）token** 上下文窗口：

- 默认模型名 `deepseek-v4-pro[1m]` 中的 `[1m]` 后缀启用 1M 上下文
- 最大输出 token 上限为 **384K**（默认 64K）

## 配置文件

DeepSeekCode 使用分层配置系统：

| 路径 | 作用 | 优先级 |
|------|------|--------|
| `~/.deepseek-code/settings.json` | 全局用户设置 | 最低 |
| `<项目>/.deepseek/settings.json` | 项目设置 | 中 |
| `<项目>/.deepseek/settings.local.json` | 本地覆盖（不进 git） | 最高 |

### 常用设置项

```jsonc
{
  // 模型设置
  "model": "deepseek-v4-pro",

  // 推理等级
  "effortLevel": "high",

  // 开启/关闭 thinking
  "alwaysThinkingEnabled": true,

  // 响应语言
  "language": "zh-CN",

  // 权限规则
  "permissions": {
    "allow": [
      "Bash(npm run *)",
      "Bash(git *)",
      "Read",
      "Write",
      "Edit"
    ]
  },

  // 默认 shell
  "defaultShell": "bash",

  // 自动记忆
  "autoMemoryEnabled": true,

  // 禁用语法高亮
  "syntaxHighlightingDisabled": false
}
```

### CLAUDE.md 项目指令

在项目根目录创建 `CLAUDE.md` 文件，可以为每个项目定义持久化的指令。DeepSeekCode 在每次会话开始时自动加载：

```markdown
# 项目指令

- 使用 TypeScript 严格模式
- 测试框架用 vitest
- 提交信息用中文
```

支持多层级 `CLAUDE.md`：项目根目录、子目录、`~/.deepseek-code/CLAUDE.md`（全局）。

## .env 文件

可参考项目根目录的 `.env.example`：

```bash
DEEPSEEK_API_KEY=sk-...
DEEPSEEK_BASE_URL=https://api.deepseek.com/anthropic
DEEPSEEK_MODEL=deepseek-v4-pro
```

> 注意：DeepSeekCode 本身不自动加载 `.env` 文件，需要通过你的 shell 工具（如 `direnv`、`dotenv`）加载。
