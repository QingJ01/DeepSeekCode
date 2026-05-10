# 快速开始

## 环境要求

- Node.js >= 18
- npm
- DeepSeek API key（在 [DeepSeek 开放平台](https://platform.deepseek.com/) 获取）

## 安装

通过 npm 全局安装：

```bash
npm install -g @qingj/deepseekcode
```

安装后会提供两个等价命令：

```bash
deepseekcode --version
deepseek-code --version
```

## 设置 API Key

**Linux / macOS:**

```bash
export DEEPSEEK_API_KEY="sk-..."
```

**Windows PowerShell:**

```powershell
setx DEEPSEEK_API_KEY "sk-..."
```

重新打开 PowerShell 后生效。

**Windows CMD:**

```cmd
setx DEEPSEEK_API_KEY "sk-..."
```

重新打开 CMD 后生效。

也可以只在当前终端临时设置：

```cmd
set DEEPSEEK_API_KEY=sk-...
```

> 如果启动时未设置 API key，启动器会交互式提示你输入。

## 第一次运行

进入你要操作的项目目录，然后运行：

```bash
cd /path/to/your/project
deepseekcode
```

也可以使用：

```bash
deepseek-code
```

DeepSeekCode 操作的是你启动时所在的当前工作目录。

## 一次性命令（非交互模式）

用 `-p` 参数运行单次任务后自动退出：

```bash
deepseek-code -p "总结这个仓库的架构"
```

## 从源码运行

如果你要开发或调试本项目，可以从源码构建：

```bash
git clone https://github.com/QingJ01/DeepSeekCode.git
cd DeepSeekCode
npm ci --ignore-scripts
npm run check
```

本地源码运行：

```bash
node scripts/run-deepseek.mjs
```

开发时也可以把当前源码包链接到全局：

```bash
npm link
deepseek-code --version
deepseek-code
```

移除全局 npm 安装：

```bash
npm uninstall -g @qingj/deepseekcode
```

移除开发链接：

```bash
npm unlink -g @qingj/deepseekcode
```

## 下一步

- [配置参考](configuration.md) - 环境变量、模型选择、配置目录
- [使用指南](usage.md) - 交互模式、命令、工具
- [推理模式](thinking-and-effort.md) - Thinking 和 Effort 等级
