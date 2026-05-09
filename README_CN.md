# DeepSeekCode

[English](README.md) | [简体中文](README_CN.md)

基于 Claude Code 代码库改造的本地 CLI 编程代理，将模型请求路由到 DeepSeek 的 Anthropic 兼容 API。

> 社区独立 fork，非 DeepSeek 或 Anthropic 官方产品。

## 功能特性

- 项目感知对话，支持工具执行和权限确认
- 文件编辑、子代理、MCP 支持、`-p` 非交互模式
- 本地配置隔离至 `.deepseek-code` 目录
- 自动清理不支持的内容块

## 环境要求

- Node.js >= 18
- npm
- DeepSeek API key

## 安装

```bash
git clone https://github.com/linyan185/deepseekcode.git
cd deepseekcode
npm ci --ignore-scripts
npm run check
```

## 使用

设置 API key：

```bash
export DEEPSEEK_API_KEY="sk-..."
```

在你要操作的项目目录下运行：

```bash
cd /path/to/your/project
/path/to/deepseekcode/run-deepseek.cmd
```

一次性命令模式：

```bash
/path/to/deepseekcode/run-deepseek.cmd -p "总结这个仓库"
```

### 可选：全局链接

```bash
npm link
deepseek-code --version
```

## 配置

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `DEEPSEEK_API_KEY` | — | DeepSeek API 密钥 |
| `DEEPSEEK_BASE_URL` | `https://api.deepseek.com/anthropic` | API 端点 |
| `DEEPSEEK_MODEL` | `deepseek-v4-pro` | 使用的模型 |
| `DEEPSEEK_CODE_CONFIG_DIR` | `~/.deepseek-code` | 本地配置目录 |

### 模型别名

| 别名 | DeepSeek 模型 |
|------|--------------|
| `pro` | `deepseek-v4-pro` |
| `flash` | `deepseek-v4-flash` |

旧版 Claude 别名（`sonnet`、`opus`、`haiku`、`best`）仍然兼容可用。

## 工作原理

- 通过 DeepSeek 适配层路由 API 调用
- 跳过 Anthropic OAuth/keychain 认证和分析上报
- 发送 DeepSeek 兼容的 effort 控制参数，默认使用 `max`
- 将不支持的内容块（image、document、thinking、server-tool）转为文本占位
- 子代理继承所有 DeepSeek 环境变量

## 构建

```bash
npm run build
```

生成目录（`dist/`、`build-src/`）已被 git 忽略。

## 许可证

[MIT](LICENSE)
