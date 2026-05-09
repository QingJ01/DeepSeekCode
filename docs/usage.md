# 使用指南

## 交互模式

直接运行启动器即可进入交互式对话：

```bash
cd /path/to/your/project
deepseek-code
```

在交互模式中，你可以：
- 直接输入自然语言描述任务
- 使用 `/` 前缀执行斜杠命令
- 按 `Ctrl+C` 中断当前操作
- 按 `Ctrl+D` 或输入 `/exit` 退出

## 非交互模式

用 `-p` / `--print` 参数执行单次任务：

```bash
# 简单查询
deepseek-code -p "这个仓库是什么项目"

# 管道输入
cat error.log | deepseek-code -p "分析这个错误日志"

# 限制执行轮数
deepseek-code -p "重构 utils 目录" --max-turns 10

# JSON 输出（适合脚本调用）
deepseek-code -p "列出所有 TODO" --output-format json
```

## 会话管理

```bash
# 继续上次的对话
deepseek-code -c
deepseek-code --continue

# 恢复指定会话
deepseek-code -r
deepseek-code --resume <session-id>
```

## 常用 CLI 参数

| 参数 | 说明 |
|------|------|
| `-p, --print` | 非交互模式，输出后退出 |
| `-c, --continue` | 继续最近的对话 |
| `-r, --resume [id]` | 恢复指定会话 |
| `--model <model>` | 指定模型（如 `pro`、`flash`） |
| `--effort <level>` | 推理等级（`low`/`medium`/`high`/`max`） |
| `--max-turns <n>` | 非交互模式最大轮数 |
| `--system-prompt <text>` | 自定义系统提示 |
| `--append-system-prompt <text>` | 追加系统提示 |
| `--mcp-config <file>` | 加载 MCP 服务器配置 |
| `--add-dir <dirs...>` | 添加额外目录访问权限 |
| `--output-format <fmt>` | 输出格式：`text`/`json`/`stream-json` |
| `--dangerously-skip-permissions` | 跳过所有权限确认（谨慎使用） |
| `-d, --debug` | 调试模式 |
| `-w, --worktree [name]` | 创建 git worktree 隔离工作区 |

## 斜杠命令

在交互模式中使用 `/` 前缀执行：

### 会话控制

| 命令 | 说明 |
|------|------|
| `/clear` | 清空对话历史 |
| `/compact` | 压缩对话上下文（释放 token） |
| `/exit` | 退出会话 |
| `/resume` | 恢复历史会话 |
| `/rewind` | 回退到之前的状态 |

### 模型与推理

| 命令 | 说明 |
|------|------|
| `/model` | 切换模型（交互式选择） |
| `/effort` | 设置推理等级 |
| `/fast` | 切换快速模式 |

### 项目与文件

| 命令 | 说明 |
|------|------|
| `/init` | 初始化 CLAUDE.md 项目指令文件 |
| `/add-dir` | 添加目录到工具访问范围 |
| `/diff` | 查看文件变更 |

### 配置与诊断

| 命令 | 说明 |
|------|------|
| `/config` | 查看/修改配置 |
| `/permissions` | 管理工具权限 |
| `/doctor` | 诊断常见问题 |
| `/cost` | 查看当前会话费用 |
| `/stats` | 查看会话统计 |
| `/status` | 查看状态信息 |

### MCP 与插件

| 命令 | 说明 |
|------|------|
| `/mcp` | MCP 服务器管理 |
| `/skills` | 查看可用技能 |
| `/plugin` | 插件管理 |

### 其他

| 命令 | 说明 |
|------|------|
| `/help` | 查看帮助 |
| `/theme` | 切换主题 |
| `/memory` | 管理记忆系统 |
| `/review` | 代码审查 |
| `/export` | 导出对话 |
| `/vim` | 切换 Vim 模式 |

## 可用工具

DeepSeekCode 内置以下工具，模型会根据任务自动选择调用：

### 文件操作

| 工具 | 说明 |
|------|------|
| `Read` | 读取文件内容（支持文本、代码、PDF、Word、Jupyter Notebook） |
| `Write` | 创建或覆盖文件 |
| `Edit` | 精确的搜索替换编辑 |
| `Glob` | 按文件名模式搜索（如 `**/*.ts`） |
| `Grep` | 按内容搜索文件（基于 ripgrep） |
| `NotebookEdit` | 编辑 Jupyter Notebook |

### 执行与交互

| 工具 | 说明 |
|------|------|
| `Bash` | 执行 shell 命令 |
| `PowerShell` | 执行 PowerShell 命令（Windows） |
| `WebFetch` | 抓取公开网页内容 |

### 代理与协作

| 工具 | 说明 |
|------|------|
| `Agent` | 派生子代理处理子任务 |
| `TodoWrite` | 创建和管理任务列表 |
| `Skill` | 调用已配置的技能 |

### 不支持的功能

以下功能在 DeepSeek 模式下不可用：

- **原生图片/截图理解** — DeepSeek API 不支持 image 内容块
- **原生 PDF 视觉理解** — 仅支持文本可提取的 PDF
- **服务端 WebSearch** — 这是 Anthropic 专有功能
- **Files API**（`--file` 参数） — 使用 Anthropic 文件端点

## 权限系统

DeepSeekCode 在执行文件操作和 shell 命令前会请求你的确认。可以通过以下方式管理：

### 在 settings.json 中预授权

```jsonc
{
  "permissions": {
    "allow": [
      "Read",
      "Glob",
      "Grep",
      "Bash(npm run *)",
      "Bash(git status)",
      "Bash(git diff *)",
      "Bash(git log *)"
    ]
  }
}
```

### 权限模式

通过 `--permission-mode` 参数或 `/permissions` 命令设置：

- **default** — 每次询问确认
- **acceptEdits** — 自动接受文件编辑，其余询问
- **auto** — 根据安全级别自动决定
- **bypassPermissions** — 跳过所有确认（需要 `--dangerously-skip-permissions`）
