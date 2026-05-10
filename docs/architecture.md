# 架构与开发指南

本文档面向想要理解 DeepSeekCode 内部实现或参与开发的贡献者。

## 项目定位

DeepSeekCode 是 Anthropic Claude Code CLI 的社区 fork，通过 in-place 修改源码中约 10 个关键文件，将 API 请求路由到 DeepSeek 的 Anthropic 兼容端点。不使用 patch 文件，所有适配代码直接嵌入 `src/` 目录。

## 目录结构

```
DeepSeekCode/
├── src/                    # TypeScript 源码（含 DeepSeek 适配修改）
│   ├── entrypoints/        # CLI 入口（cli.tsx）
│   ├── services/api/       # API 客户端和请求逻辑
│   ├── utils/model/        # 模型配置、别名、Provider 检测
│   ├── utils/              # 工具函数（effort、thinking、context 等）
│   ├── constants/          # 系统提示、常量定义
│   ├── components/         # UI 组件（Ink/React 终端 UI）
│   └── commands/           # 斜杠命令实现
├── scripts/                # 构建脚本、启动器、测试
│   ├── run-deepseek.mjs    # npm bin 入口（启动器）
│   ├── build.mjs           # 主构建脚本
│   ├── prepare-src.mjs     # 旧版源码预处理（备用）
│   └── *.test.mjs          # 测试套件
├── stubs/                  # Bun-only API 的 Node.js 替代桩
├── build-src/              # 构建中间产物（git 忽略）
├── dist/                   # 最终产物 cli.js（git 忽略）
└── docs/                   # 用户文档
```

## 构建流程

原版 Claude Code 使用 Bun 构建，DeepSeekCode 替换为纯 Node.js + esbuild：

```
src/ ──复制──▶ build-src/src/ ──esbuild──▶ dist/cli.js
                  │
            转换处理：
            - MACRO.X → package.json 实际值
            - feature('...') → false
            - bun:bundle 导入 → 移除
```

### 核心步骤（scripts/build.mjs）

1. **复制源码**：`src/` → `build-src/src/`（干净副本）
2. **宏替换**：遍历所有 `.ts/.tsx` 文件，内联 `MACRO.VERSION`、`MACRO.PACKAGE_NAME` 等
3. **Feature flag 裁剪**：所有 `feature('FLAG_NAME')` 调用替换为 `false`
4. **生成入口**：创建 `build-src/entry.ts`（导入 `./src/entrypoints/cli.tsx`）
5. **esbuild 打包**：ESM 格式，`--platform=node`，目标 Node 18+
6. **自动桩生成**：遇到 `Could not resolve "..."` 错误时，自动在 `build-src/node_modules/` 创建桩模块（最多 8 轮迭代）
7. **后处理**：添加 shebang 和版本注释

### 构建命令

```bash
npm run build          # 仅构建
npm run check          # 构建 + 验证版本输出
npm run test:release   # 运行所有发布测试
```

## DeepSeek 适配层

适配修改集中在以下文件，均通过 `getAPIProvider() === 'deepseek'` 分支实现：

### Provider 检测

**`src/utils/model/providers.ts`**

新增 `'deepseek'` 作为一级 Provider。检测逻辑：
- `CLAUDE_CODE_USE_DEEPSEEK=1`，或
- `DEEPSEEK_API_KEY` 已设置，或
- `DEEPSEEK_BASE_URL` 已设置，或
- `ANTHROPIC_BASE_URL` 指向 `*.deepseek.com`

### API 客户端

**`src/services/api/client.ts`**

为 DeepSeek 创建标准 Anthropic SDK 客户端，替换 `baseURL` 和 `apiKey`：
- `baseURL`: `DEEPSEEK_BASE_URL`（默认 `https://api.deepseek.com/anthropic`）
- `apiKey`: `DEEPSEEK_API_KEY`
- `User-Agent`: `deepseek-code/<VERSION>`
- 跳过 OAuth 和 Anthropic 专有认证

### 请求处理

**`src/services/api/claude.ts`**

- **内容清洗**：`sanitizeMessagesForDeepSeek()` 将不支持的内容块（image、document、redacted_thinking）替换为文本占位
- **缓存**：关闭 `cache_control`（DeepSeek 服务端自动前缀缓存）
- **用量映射**：`prompt_cache_hit_tokens` / `prompt_cache_miss_tokens` → `cache_read_input_tokens` / `cache_creation_input_tokens`
- **Temperature**：DeepSeek 允许 thinking + 自定义 temperature（0.0-2.0），跳过 Claude 的 temperature=1 约束
- **API 路径**：使用 `anthropic.messages` 标准路径，而非 `anthropic.beta.messages`
- **元数据**：跳过 `metadata` 和 advisor beta header

### 模型配置

| 文件 | 职责 |
|------|------|
| `src/utils/model/configs.ts` | 每个 Claude 模型配置增加 `deepseek` 键，映射到 `deepseek-v4-pro` 或 `deepseek-v4-flash` |
| `src/utils/model/aliases.ts` | 新增 `pro` / `flash` 别名 |
| `src/utils/model/model.ts` | DeepSeek 品牌显示名（如 `'DeepSeek V4 Pro (1M context)'`） |
| `src/utils/model/modelOptions.ts` | 模型选择器中的 DeepSeek 选项 |

### 能力声明

| 文件 | DeepSeek 行为 |
|------|---------------|
| `src/utils/effort.ts` | 始终支持 effort，默认 `max` |
| `src/utils/thinking.ts` | 始终支持 thinking，不支持 adaptive thinking |
| `src/utils/context.ts` | 1M 上下文窗口，64K 默认 / 384K 最大输出 |

### 配置隔离

| 文件 | 职责 |
|------|------|
| `src/utils/envUtils.ts` | 全局配置 `~/.deepseek-code`，项目配置 `.deepseek/` |
| `src/utils/cachePaths.ts` | OS 缓存命名空间 `deepseek-code` |
| `src/constants/system.ts` | 系统提示前缀："You are DeepSeek Code..." |
| `src/utils/permissions/filesystem.ts` | `.deepseek` 列为受保护目录 |

## 测试

所有测试在 `scripts/` 目录，通过 `node scripts/<name>.test.mjs` 运行：

| 测试 | 验证内容 |
|------|----------|
| `deepseek-isolation.test.mjs` | 所有路径引用使用 `getProjectConfigDirName()`，不硬编码 `.claude` |
| `deepseek-v4-config.test.mjs` | 默认模型为 `deepseek-v4-pro`（无 `[1m]`），effort 默认 `max` |
| `logo-alignment.test.mjs` | CJK 终端布局对齐 |
| `version.test.mjs` | package.json 版本一致性，无硬编码版本号 |
| `release-workflow.test.mjs` | npm 包名、CI 工作流、构建兼容性 |
| `verify-release-tag.test.mjs` | GitHub Release tag 与 package.json 版本匹配 |

```bash
npm test              # 运行所有测试
```

## 启动流程

```
用户运行 deepseekcode
  │
  ▼
scripts/run-deepseek.mjs（设置环境变量）
  │  CLAUDE_CODE_USE_DEEPSEEK=1
  │  DEEPSEEK_BASE_URL=https://api.deepseek.com/anthropic
  │  DEEPSEEK_MODEL=deepseek-v4-pro
  │  CLAUDE_CODE_EFFORT_LEVEL=max
  │  CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1
  │  ...
  ▼
node dist/cli.js（打包后的 CLI）
  │
  ▼
src/entrypoints/cli.tsx
  │
  ▼
getAPIProvider() → 'deepseek'
  │
  ▼
创建 Anthropic SDK 客户端（指向 DeepSeek 端点）
  │
  ▼
交互式会话 / 非交互模式
```

## 开发工作流

### 本地开发

```bash
git clone https://github.com/QingJ01/DeepSeekCode.git
cd DeepSeekCode
npm ci --ignore-scripts
npm run build
node scripts/run-deepseek.mjs    # 本地运行
```

### 修改源码后

```bash
npm run build                     # 重新构建
npm run check                     # 构建 + 版本验证
npm test                          # 运行测试套件
```

### 添加新的 DeepSeek 适配

1. 在相关源文件中添加 `if (getAPIProvider() === 'deepseek')` 分支
2. 如果涉及路径，使用 `getProjectConfigDirName()` 而非硬编码 `.claude`
3. 在 `deepseek-isolation.test.mjs` 中验证路径隔离
4. 运行 `npm test` 确认所有测试通过

## 与上游同步

由于修改是 in-place 的，与 Claude Code 上游同步时需要注意：

1. 比较上游变更与本地修改的冲突点（主要在上述 ~10 个文件）
2. `services/api/claude.ts` 是最大的改动文件，同步时最容易冲突
3. 新增的 Claude 模型需要在 `configs.ts` 中添加对应的 `deepseek` 映射
4. 测试套件会自动捕获路径隔离和版本一致性问题
