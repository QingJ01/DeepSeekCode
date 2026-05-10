# DeepSeek V4 优化设计文档

日期：2026-05-10

## 概述

针对 DeepSeek V4 的五项适配优化，按依赖关系分三阶段实施。

## Phase 1：费用显示 + 错误处理（独立，可并行）

### 1.1 DeepSeek 费用显示

**目标**：将 Anthropic 定价替换为 DeepSeek 实际定价，使用人民币显示。

**定价常量**（¥/百万 token）：

| 模型 | 输入（缓存未命中） | 输入（缓存命中） | 输出 |
|------|-------------------|-----------------|------|
| deepseek-v4-pro（折扣期至 2026-05-31） | ¥3.00 | ¥0.025 | ¥6.00 |
| deepseek-v4-pro（原价） | ¥12.00 | ¥0.10 | ¥24.00 |
| deepseek-v4-flash | ¥1.00 | ¥0.02 | ¥2.00 |

**改动**：

1. **`src/utils/modelCost.ts`**：
   - 新增 `COST_DEEPSEEK_PRO` 和 `COST_DEEPSEEK_FLASH` 定价常量（人民币）
   - 通过 `DEEPSEEK_USE_FULL_PRICE=1` 环境变量切换 Pro 原价
   - 在 `MODEL_COSTS` 表中添加 `deepseek-v4-pro` 和 `deepseek-v4-flash` 映射
   - `tokensToUSDCost` 重命名或新增 `tokensToCost`，DeepSeek 模式返回人民币值
   - `formatCost()` DeepSeek 模式输出 `¥` 前缀
   - `getModelPricingString()` DeepSeek 模式输出 `¥X/¥Y per Mtok`
   - DeepSeek 的 `cache_creation_input_tokens`（由 `prompt_cache_miss_tokens` 映射而来）按普通输入价计价

2. **`src/cost-tracker.ts`**：
   - 退出摘要在 DeepSeek 模式下始终显示（跳过 `hasConsoleBillingAccess()` 门控）

3. **`src/screens/REPL.tsx`**：
   - 成本阈值从 $5 调整为 ¥35（DeepSeek 模式）
   - 对话框文案改为 "DeepSeek API"

### 1.2 错误处理适配

**目标**：适配 DeepSeek API 错误码、去除 Anthropic 专有逻辑。

**DeepSeek 错误码**：

| 状态码 | 含义 | 处理方式 |
|--------|------|----------|
| 400 | 请求格式错误 | 不重试 |
| 401 | 认证失败 | 不重试，提示检查 API key |
| 402 | 余额不足（DeepSeek 特有） | 不重试，提示充值 |
| 422 | 参数无效 | 不重试 |
| 429 | 频率超限 | 指数退避重试 |
| 500 | 服务器错误 | 重试 |
| 503 | 服务过载 | 重试 |

**改动**：

1. **`src/services/api/withRetry.ts`**：
   - 429：DeepSeek 不返回 `retry-after` 和 `anthropic-ratelimit-*` 头，DeepSeek 模式跳过这些头解析，使用纯指数退避（`500ms * 2^attempt`，上限 32s）
   - 402：新增为不可重试错误，立即终止并展示充值提示
   - 529：DeepSeek 不返回 529，DeepSeek 模式跳过 529 重试和模型回退逻辑
   - `shouldRetry()` 新增 DeepSeek 分支

2. **`src/services/api/errors.ts`**：
   - `classifyAPIError()` 新增 `402` → `insufficient_balance` 分类
   - 429 错误消息：DeepSeek 模式显示 "请求频率超限，请稍后重试" 而非订阅相关信息
   - 新增 `x-ds-trace-id` 响应头提取，附加到错误日志

3. **`src/services/api/errorUtils.ts`**：
   - `formatAPIError()` 新增 402 用户友好提示

## Phase 2：缓存统计 + Tokenizer（依赖 Phase 1）

### 2.1 缓存统计展示

**目标**：在 `/cost` 输出中展示缓存命中率和节省金额。

**改动**：

1. **`src/cost-tracker.ts`**：
   - `formatTotalCost()` 新增两行：
     ```
     缓存命中率:          73.2% (892,341 / 1,219,000 input tokens)
     缓存节省:            ¥2.65
     ```
   - 命中率 = `cacheReadTokens / (cacheReadTokens + inputTokens + cacheCreationTokens) * 100`
   - 节省 = `cacheReadTokens * (inputRate - cacheReadRate) / 1_000_000`
   - 仅 DeepSeek 模式显示（Anthropic 的缓存语义不同）

2. **`src/commands/cost/cost.ts`**：
   - DeepSeek 用户直接展示 `formatTotalCost()`（跳过订阅分支）

### 2.2 Tokenizer 适配

**目标**：修正 DeepSeek 模式下的 token 估算准确度。

**问题分析**：

- 当前使用 `content.length / 4` 估算 token 数
- `content.length` 返回 UTF-16 code unit 数，对 CJK 文本严重低估（中文字符 1 code unit ÷ 4 = 0.25 token，实际约 1.5 token）
- `countTokensWithAPI()` 调用 `anthropic.beta.messages.countTokens`，DeepSeek 端点不支持
- `countTokensViaHaikuFallback()` 调用 Claude Haiku，DeepSeek 模式不可用

**改动**：

1. **`src/services/tokenEstimation.ts`**：
   - `roughTokenCountEstimation()`：DeepSeek 模式使用 `Buffer.byteLength(content, 'utf8') / 4`（中文字符 3 bytes ÷ 4 = 0.75 token，更接近真实值）
   - `countTokensWithAPI()`：DeepSeek 模式返回 `null`（跳过）
   - `countTokensViaHaikuFallback()`：DeepSeek 模式返回 `null`（跳过）

2. **`src/utils/tokens.ts`**：
   - `tokenCountWithEstimation()`：DeepSeek 模式完全依赖 API 返回的 usage + 粗略估算，不调用 API 计数

**影响**：`autoCompact.ts` 阈值逻辑无需改动，它消费 `tokenCountWithEstimation()` 的返回值，估算修正后自动生效。

## Phase 3：缓存命中率优化

### 3.1 前缀缓存优化

**目标**：最大化 DeepSeek 自动前缀缓存的命中率。

DeepSeek 自动缓存相邻请求的公共前缀。前缀越稳定、越长，缓存命中越多。

**改动**：

1. **`src/services/api/claude.ts`**：
   - 固定 tools 数组排序（按 `name` 字典序），避免工具加载顺序不同导致前缀失效
   - compact 后验证消息序列头部稳定性

2. **`src/constants/system.ts`**：
   - 审计系统提示，将动态内容（如有）移到末尾，保证前缀稳定

**验证**：通过 Phase 2 缓存统计面板对比优化前后的命中率。

## 文档更新

完成实施后需同步更新以下文档：

- `docs/configuration.md`：新增 `DEEPSEEK_USE_FULL_PRICE` 环境变量
- `docs/usage.md`：说明 `/cost` 命令在 DeepSeek 模式下的输出格式
- `docs/faq.md`：新增 402 余额不足、缓存统计相关 FAQ
- `docs/architecture.md`：更新适配层文件列表
- `README.md` / `README_EN.md`：工作原理章节补充费用显示和缓存优化说明
