# 快速开始

## 环境要求

- Node.js >= 18
- npm
- DeepSeek API key（在 [DeepSeek 开放平台](https://platform.deepseek.com/) 获取）

## 安装

```bash
git clone https://github.com/linyan185/deepseekcode.git
cd deepseekcode
npm ci --ignore-scripts
npm run check
```

`npm run check` 会构建 `dist/cli.js` 并验证版本号输出。

## 设置 API Key

**Linux / macOS:**

```bash
export DEEPSEEK_API_KEY="sk-..."
```

**Windows PowerShell:**

```powershell
$env:DEEPSEEK_API_KEY = "sk-..."
```

**Windows CMD:**

```cmd
set DEEPSEEK_API_KEY=sk-...
```

也可以创建 `.env` 文件（参考 `.env.example`），通过你习惯的 shell 工具加载。

> 如果启动时未设置 API key，启动器会交互式提示你输入。

## 第一次运行

进入你要操作的项目目录，调用启动器：

```bash
cd /path/to/your/project
/path/to/deepseekcode/run-deepseek.cmd
```

启动器会保留你当前的工作目录，DeepSeekCode 操作的是你启动时所在的项目。

## 一次性命令（非交互模式）

用 `-p` 参数运行单次任务后自动退出：

```bash
/path/to/deepseekcode/run-deepseek.cmd -p "总结这个仓库的架构"
```

## 可选：全局链接

开发时可以把命令链接到全局 PATH：

```bash
npm link
deepseek-code --version
deepseek-code
```

移除链接：

```bash
npm unlink -g deepseekcode
```

## 下一步

- [配置参考](configuration.md) — 环境变量、模型选择、配置目录
- [使用指南](usage.md) — 交互模式、命令、工具
- [推理模式](thinking-and-effort.md) — Thinking 和 Effort 等级
