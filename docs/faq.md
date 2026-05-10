# 常见问题

## 安装与运行

### Q: 应该怎么安装发布版？

```bash
npm install -g @qingj/deepseekcode
deepseekcode --version
deepseekcode
```

也可以使用等价命令 `deepseek-code`。

### Q: `npm run check` 失败

确保 Node.js 版本 >= 18：

```bash
node --version
```

如果构建出错，尝试清除后重建：

```bash
rm -rf dist build-src node_modules
npm ci --ignore-scripts
npm run build
```

### Q: 启动时提示 API key 错误

1. 确认 key 格式正确（以 `sk-` 开头）
2. 确认 key 有效且未过期
3. 确认环境变量已生效：
   ```bash
   echo $DEEPSEEK_API_KEY
   ```

### Q: 启动器运行的项目不对

启动器会保留 `当前工作目录`。确保你先 `cd` 到目标项目再运行启动器：

```bash
cd /path/to/your/project     # 先进入目标项目
deepseek-code                # 再运行 DeepSeekCode
```

## 模型与推理

### Q: 如何切换到 Flash 模型？

```bash
# CLI 参数
deepseek-code --model flash

# 环境变量
export DEEPSEEK_MODEL=deepseek-v4-flash

# 交互模式
/model
```

### Q: 回复很慢

- 将 effort 降低到 `low` 或 `medium`：`/effort low`
- 关闭 thinking：`export CLAUDE_CODE_DISABLE_THINKING=1`
- 切换到 Flash 模型：`/model` → 选择 Flash
- 使用 `/compact` 压缩过长的对话上下文

### Q: 输出被截断了

增大输出 token 上限（DeepSeek V4 最大支持 384K）：

```bash
export CLAUDE_CODE_MAX_OUTPUT_TOKENS=128000
```

### Q: 提示 temperature 相关错误

DeepSeek V4 支持 0.0-2.0 范围的 temperature，且 thinking 开启时也可以设置 temperature。如果遇到问题，检查是否有其他工具设置了非法值。

## 功能兼容性

### Q: 能读取图片/截图吗？

不能。DeepSeek API 不支持 image 内容块。DeepSeekCode 会自动将图片内容块转换为文本提示。

替代方案：
- 先用 OCR 工具提取文字，再发送文字给 DeepSeekCode
- 用文字描述图片内容

### Q: 能读取 PDF 吗？

**部分支持**。只能读取文本可提取的 PDF（通过内置 PDF 解析器或本地 `pdftotext` 命令）。扫描件和纯图片 PDF 不支持。

### Q: WebSearch 能用吗？

服务端 WebSearch 不可用（这是 Anthropic 专有功能）。替代方案：

- 使用 `WebFetch` 工具抓取已知 URL 的网页内容
- 通过 Bash 调用 `curl` 或其他搜索 CLI
- 配置 MCP 服务器连接搜索 API

### Q: `--file` 参数能用吗？

不能。Files API 使用 Anthropic 专有端点，在 DeepSeek 模式下不可用。

### Q: 提示 "DeepSeek 账户余额不足"

登录 [platform.deepseek.com](https://platform.deepseek.com) 充值后重试。DeepSeek 使用 HTTP 402 状态码表示余额不足，DeepSeekCode 不会自动重试此错误。

### Q: 缓存命中率很低

- 确保对话中没有频繁切换模型（会导致缓存失效）
- 长对话中使用 `/compact` 压缩上下文不会影响缓存（系统提示和工具定义保持不变）
- 首次请求不会有缓存命中，这是正常的

## 配置

### Q: 配置文件在哪里？

DeepSeek 模式下配置保存在 `~/.deepseek-code/`（而非 `~/.claude/`）：

```
~/.deepseek-code/
  settings.json      # 全局设置
  claude.json         # MCP 服务器等配置
  memory/             # 自动记忆
  projects/           # 项目级记忆
  transcripts/        # 会话记录
```

### Q: 怎么授权常用命令避免反复确认？

在项目的 `.deepseek/settings.json` 中添加：

```jsonc
{
  "permissions": {
    "allow": [
      "Read",
      "Glob",
      "Grep",
      "Bash(npm run *)",
      "Bash(git *)"
    ]
  }
}
```

### Q: 项目指令文件放在哪？

在项目根目录创建 `CLAUDE.md`，DeepSeekCode 每次启动自动加载。也可以用 `/init` 命令自动生成。

## 网络与代理

### Q: 需要代理访问 DeepSeek API

设置标准的 HTTP 代理环境变量：

```bash
export HTTPS_PROXY=http://proxy:port
export HTTP_PROXY=http://proxy:port
```

### Q: 使用自建的 DeepSeek API 代理

```bash
export DEEPSEEK_BASE_URL=https://your-proxy.example.com/anthropic
```

## 数据与隐私

### Q: 数据发送到哪里？

模型请求发送到你配置的 `DEEPSEEK_BASE_URL`（默认 `https://api.deepseek.com/anthropic`）。DeepSeekCode 在 DeepSeek 模式下不会向 Anthropic 发送任何数据。

### Q: 会话记录保存在哪？

本地保存在 `~/.deepseek-code/transcripts/` 目录。默认保留 30 天，可通过 `cleanupPeriodDays` 设置修改。

### Q: 如何清除所有本地数据？

```bash
rm -rf ~/.deepseek-code
```

## 开发与贡献

### Q: 构建产物在哪里？

`dist/cli.js` 是最终打包文件，`build-src/` 是构建中间产物，两者都被 git 忽略。详见[架构与开发指南](architecture.md)。

### Q: 如何添加新的 DeepSeek 适配逻辑？

在相关源文件中添加 `if (getAPIProvider() === 'deepseek')` 分支。路径相关的代码使用 `getProjectConfigDirName()` 而非硬编码 `.claude`。修改后运行 `npm test` 确认测试通过。

### Q: 为什么不用 patch 文件？

所有适配修改直接嵌入 `src/` 目录，便于 IDE 跳转和调试。同步上游时需要手动处理约 10 个文件的冲突，但这些文件的修改都集中在 `getAPIProvider() === 'deepseek'` 分支中，比较容易识别。
