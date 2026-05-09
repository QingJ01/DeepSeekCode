# MCP 与高级功能

## MCP（Model Context Protocol）

DeepSeekCode 完整支持 MCP 协议，可以同时作为 MCP 客户端和 MCP 服务端。

### 作为 MCP 客户端

连接外部 MCP 服务器，扩展 DeepSeekCode 的工具能力。

#### 配置方式

**1. 全局配置**（`~/.deepseek-code/claude.json`）：

```jsonc
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/dir"]
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "ghp_..."
      }
    }
  }
}
```

**2. 项目配置**（`<项目>/.mcp.json`）：

```jsonc
{
  "mcpServers": {
    "my-db": {
      "command": "node",
      "args": ["./tools/db-server.js"],
      "env": {
        "DATABASE_URL": "postgres://..."
      }
    }
  }
}
```

**3. CLI 参数**：

```bash
deepseek-code --mcp-config ./my-mcp.json
deepseek-code --mcp-config '{"mcpServers":{"test":{"command":"node","args":["server.js"]}}}'
```

#### 支持的传输方式

| 传输类型 | 说明 |
|----------|------|
| `stdio` | 标准输入输出（最常用） |
| `sse` | Server-Sent Events (HTTP) |
| `websocket` | WebSocket 连接 |

#### MCP 管理命令

```bash
# CLI 子命令
deepseek-code mcp add <name>           # 添加 MCP 服务器
deepseek-code mcp remove <name>        # 移除 MCP 服务器
deepseek-code mcp add-json <name> <json>  # 从 JSON 添加

# 交互模式
/mcp                                    # MCP 管理面板
```

### 作为 MCP 服务端

DeepSeekCode 也可以作为 MCP 服务器运行，让其他 MCP 客户端调用它的工具：

```bash
deepseek-code mcp serve
```

## 子代理（Sub-Agents）

DeepSeekCode 支持派生子代理来并行处理任务。模型会自动使用 `Agent` 工具创建子代理。

### 子代理模型

子代理默认继承父会话的模型。可以通过环境变量指定：

```bash
# 所有子代理使用 Flash 模型（更快更省）
export CLAUDE_CODE_SUBAGENT_MODEL=deepseek-v4-flash
```

子代理继承以下环境变量：
- `CLAUDE_CODE_USE_DEEPSEEK`
- `DEEPSEEK_API_KEY`、`DEEPSEEK_BASE_URL`、`DEEPSEEK_MODEL`
- `CLAUDE_CODE_EFFORT_LEVEL`
- `DEEPSEEK_CODE_CONFIG_DIR`

## Hooks（钩子）

在工具执行前后运行自定义命令：

```jsonc
// settings.json
{
  "hooks": {
    "Bash": {
      "before": "echo '即将执行 Bash 命令'",
      "after": "echo '命令已完成'"
    },
    "Write": {
      "after": "npx prettier --write $FILE_PATH"
    }
  }
}
```

## Git Worktree 隔离

使用 worktree 在独立的工作区中执行任务，避免影响当前分支：

```bash
deepseek-code -w feature-branch
```

配置 worktree 行为：

```jsonc
// settings.json
{
  "worktree": {
    "symlinkDirectories": ["node_modules", ".venv"],
    "sparsePaths": ["src/", "package.json"]
  }
}
```

## 后台会话

在后台运行任务：

```bash
# 启动后台任务
deepseek-code --bg -p "运行所有测试并修复失败的"

# 管理后台会话
deepseek-code ps          # 查看运行中的会话
deepseek-code logs <id>   # 查看会话日志
deepseek-code attach <id> # 连接到会话
deepseek-code kill <id>   # 终止会话
```

## 技能系统（Skills）

技能是可复用的、带结构化元数据的 prompt 模板：

```bash
# 查看可用技能
/skills

# 调用技能
/init          # 初始化 CLAUDE.md
/review        # 代码审查
/security-review  # 安全审查
```

### 自定义技能

在 `~/.deepseek-code/skills/` 或项目 `.claude/skills/` 目录下创建 `.md` 文件：

```markdown
---
name: my-skill
description: 我的自定义技能
---

执行以下操作：
1. ...
2. ...
```

## 非交互管道集成

DeepSeekCode 可以集成到 CI/CD 或脚本管道中：

```bash
# JSON 输出
deepseek-code -p "分析代码质量" --output-format json

# 流式 JSON（适合实时处理）
deepseek-code -p "重构代码" --output-format stream-json

# 限制预算
deepseek-code -p "优化性能" --max-budget-usd 1.0

# 指定工具白名单
deepseek-code -p "只分析不修改" --allowed-tools Read,Glob,Grep

# 禁用所有工具
deepseek-code -p "回答问题" --tools ""
```
