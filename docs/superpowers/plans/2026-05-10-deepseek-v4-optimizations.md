# DeepSeek V4 优化实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 针对 DeepSeek V4 适配五项优化：人民币费用显示、错误处理、缓存统计、Tokenizer 适配、前缀缓存优化。

**Architecture:** 三阶段实施。Phase 1 的费用显示和错误处理互相独立可并行。Phase 2 的缓存统计依赖费用计算基础设施，Tokenizer 独立。Phase 3 的缓存优化依赖统计面板验证效果。

**Tech Stack:** TypeScript, Node.js, Anthropic SDK, esbuild

---

## Phase 1：费用显示 + 错误处理

### Task 1: DeepSeek 定价常量与费用计算

**Files:**
- Modify: `src/utils/modelCost.ts`

- [ ] **Step 1: 新增 DeepSeek 定价常量**

在 `COST_HAIKU_45` 之后、`DEFAULT_UNKNOWN_MODEL_COST` 之前添加：

```typescript
// DeepSeek V4 Pro pricing (CNY per Mtok)
// Discounted until 2026-05-31; set DEEPSEEK_USE_FULL_PRICE=1 for standard price
export const COST_DEEPSEEK_PRO_DISCOUNTED = {
  inputTokens: 3,
  outputTokens: 6,
  promptCacheWriteTokens: 3,
  promptCacheReadTokens: 0.025,
  webSearchRequests: 0,
} as const satisfies ModelCosts

export const COST_DEEPSEEK_PRO_FULL = {
  inputTokens: 12,
  outputTokens: 24,
  promptCacheWriteTokens: 12,
  promptCacheReadTokens: 0.1,
  webSearchRequests: 0,
} as const satisfies ModelCosts

// DeepSeek V4 Flash pricing (CNY per Mtok)
export const COST_DEEPSEEK_FLASH = {
  inputTokens: 1,
  outputTokens: 2,
  promptCacheWriteTokens: 1,
  promptCacheReadTokens: 0.02,
  webSearchRequests: 0,
} as const satisfies ModelCosts
```

- [ ] **Step 2: 新增 DeepSeek 定价选择函数和 MODEL_COSTS 映射**

在 `getOpus46CostTier` 函数之后添加：

```typescript
export function getDeepSeekProCostTier(): ModelCosts {
  if (process.env.DEEPSEEK_USE_FULL_PRICE === '1') {
    return COST_DEEPSEEK_PRO_FULL
  }
  return COST_DEEPSEEK_PRO_DISCOUNTED
}
```

在 `MODEL_COSTS` 对象末尾添加两个映射：

```typescript
  'deepseek-v4-pro': COST_DEEPSEEK_PRO_DISCOUNTED,
  'deepseek-v4-flash': COST_DEEPSEEK_FLASH,
```

- [ ] **Step 3: 修改 getModelCosts 支持 DeepSeek 动态定价**

在 `getModelCosts` 函数中，Opus 4.6 fast mode 判断之后添加 DeepSeek Pro 分支：

```typescript
export function getModelCosts(model: string, usage: Usage): ModelCosts {
  const shortName = getCanonicalName(model)

  // Check if this is an Opus 4.6 model with fast mode active.
  if (
    shortName === firstPartyNameToCanonical(CLAUDE_OPUS_4_6_CONFIG.firstParty)
  ) {
    const isFastMode = usage.speed === 'fast'
    return getOpus46CostTier(isFastMode)
  }

  // DeepSeek V4 Pro has a discount period with dynamic pricing
  if (shortName === 'deepseek-v4-pro') {
    return getDeepSeekProCostTier()
  }

  const costs = MODEL_COSTS[shortName]
  // ... rest unchanged
```

- [ ] **Step 4: 新增人民币格式化函数**

在文件末尾添加，并修改 `formatPrice` 和导出：

```typescript
import { getAPIProvider } from './model/providers.js'

function formatPriceCNY(price: number): string {
  if (Number.isInteger(price)) {
    return `¥${price}`
  }
  return `¥${price.toFixed(price < 0.1 ? 3 : 2)}`
}

export function isDeepSeekCurrency(): boolean {
  return getAPIProvider() === 'deepseek'
}
```

修改 `formatModelPricing`：

```typescript
export function formatModelPricing(costs: ModelCosts): string {
  const fmt = isDeepSeekCurrency() ? formatPriceCNY : formatPrice
  return `${fmt(costs.inputTokens)}/${fmt(costs.outputTokens)} per Mtok`
}
```

- [ ] **Step 5: 构建验证**

Run: `npm run build 2>&1 | tail -5`
Expected: 构建成功，无类型错误

- [ ] **Step 6: Commit**

```bash
git add src/utils/modelCost.ts
git commit -m "feat: add DeepSeek V4 pricing constants in CNY"
```

---

### Task 2: 费用显示格式化（人民币）

**Files:**
- Modify: `src/cost-tracker.ts`

- [ ] **Step 1: 修改 formatCost 支持人民币**

```typescript
import { isDeepSeekCurrency } from './utils/modelCost.js'

function formatCost(cost: number, maxDecimalPlaces: number = 4): string {
  const symbol = isDeepSeekCurrency() ? '¥' : '$'
  return `${symbol}${cost > 0.5 ? round(cost, 100).toFixed(2) : cost.toFixed(maxDecimalPlaces)}`
}
```

- [ ] **Step 2: 修改 formatModelUsage 中的内联 formatCost 调用**

`formatModelUsage` 函数第 222 行的 `(${formatCost(usage.costUSD)})` 无需改动，因为 `formatCost` 已经处理了货币符号。

- [ ] **Step 3: 构建验证**

Run: `npm run build 2>&1 | tail -5`
Expected: 构建成功

- [ ] **Step 4: Commit**

```bash
git add src/cost-tracker.ts
git commit -m "feat: format cost display in CNY for DeepSeek mode"
```

---

### Task 3: 退出摘要与成本阈值适配

**Files:**
- Modify: `src/costHook.ts`
- Modify: `src/commands/cost/cost.ts`
- Modify: `src/components/CostThresholdDialog.tsx`
- Modify: `src/screens/REPL.tsx`

- [ ] **Step 1: 修改退出摘要，DeepSeek 模式始终显示**

`src/costHook.ts`，修改 `useCostSummary` 中的 exit handler：

```typescript
import { getAPIProvider } from './utils/model/providers.js'

export function useCostSummary(
  getFpsMetrics?: () => FpsMetrics | undefined,
): void {
  useEffect(() => {
    const f = () => {
      if (getAPIProvider() === 'deepseek' || hasConsoleBillingAccess()) {
        process.stdout.write('\n' + formatTotalCost() + '\n')
      }
      saveCurrentSessionCosts(getFpsMetrics?.())
    }
    process.on('exit', f)
    return () => {
      process.off('exit', f)
    }
  }, [])
}
```

- [ ] **Step 2: 修改 /cost 命令，DeepSeek 跳过订阅分支**

`src/commands/cost/cost.ts`：

```typescript
import { getAPIProvider } from '../../utils/model/providers.js'

export const call: LocalCommandCall = async () => {
  if (getAPIProvider() === 'deepseek') {
    return { type: 'text', value: formatTotalCost() }
  }
  if (isClaudeAISubscriber()) {
    // ... existing subscriber logic unchanged
  }
  return { type: 'text', value: formatTotalCost() }
}
```

- [ ] **Step 3: 修改成本阈值对话框**

`src/components/CostThresholdDialog.tsx`，修改原始 TSX 源码中的 title 和链接。因为此文件是编译后的 React Compiler 输出，直接修改编译产物。定位 line 41 的 Dialog title：

将：
```
title="You've spent $5 on the Anthropic API this session."
```
替换为动态内容。由于此文件是编译产物，改为在 `src/screens/REPL.tsx` 中处理。

- [ ] **Step 4: 修改 REPL.tsx 中的成本阈值**

`src/screens/REPL.tsx`，找到 `totalCost >= 5` 的阈值判断（约 line 2205）：

```typescript
import { isDeepSeekCurrency } from '../../utils/modelCost.js'

// In the useEffect:
const costThreshold = isDeepSeekCurrency() ? 35 : 5
if (totalCost >= costThreshold && !showCostDialog && !haveShownCostDialog) {
```

- [ ] **Step 5: 构建验证**

Run: `npm run build 2>&1 | tail -5`
Expected: 构建成功

- [ ] **Step 6: Commit**

```bash
git add src/costHook.ts src/commands/cost/cost.ts src/components/CostThresholdDialog.tsx src/screens/REPL.tsx
git commit -m "feat: DeepSeek cost threshold ¥35, always show exit summary"
```

---

### Task 4: 错误处理 — 402 余额不足

**Files:**
- Modify: `src/services/api/errors.ts`
- Modify: `src/services/api/errorUtils.ts`
- Modify: `src/services/api/withRetry.ts`

- [ ] **Step 1: 在 classifyAPIError 中新增 402 分类**

`src/services/api/errors.ts`，在 `classifyAPIError` 函数中，429 (`rate_limit`) 判断之前添加：

```typescript
  // DeepSeek: 402 = insufficient balance
  if (error instanceof APIError && error.status === 402) {
    return 'insufficient_balance'
  }
```

- [ ] **Step 2: 在 formatAPIError 中新增 402 用户提示**

`src/services/api/errorUtils.ts`，在 `formatAPIError` 函数的 connection error 判断之后、`error.message` 判断之前添加：

```typescript
  if (error.status === 402) {
    return 'DeepSeek 账户余额不足，请在 platform.deepseek.com 充值后重试'
  }
```

- [ ] **Step 3: 在 withRetry 中将 402 标记为不可重试**

`src/services/api/withRetry.ts`，在 `shouldRetry` 函数中，mock rate limit 检查之后添加：

```typescript
  // 402 Insufficient Balance (DeepSeek) — never retry
  if (error.status === 402) {
    return false
  }
```

- [ ] **Step 4: 构建验证**

Run: `npm run build 2>&1 | tail -5`
Expected: 构建成功

- [ ] **Step 5: Commit**

```bash
git add src/services/api/errors.ts src/services/api/errorUtils.ts src/services/api/withRetry.ts
git commit -m "feat: handle DeepSeek 402 insufficient balance error"
```

---

### Task 5: 错误处理 — 429/529 适配

**Files:**
- Modify: `src/services/api/withRetry.ts`
- Modify: `src/services/api/errors.ts`

- [ ] **Step 1: 429 重试跳过 Anthropic 专有头解析**

`src/services/api/withRetry.ts`，在 `getRetryDelay` 函数中，DeepSeek 不返回 `retry-after` 头，现有逻辑已正确回退到指数退避——无需改动此函数。

在 429 处理逻辑中（`shouldRetry` 函数约 line 766-769），DeepSeek 模式应直接重试而不检查订阅状态：

```typescript
  // 429 rate limit
  if (error.status === 429) {
    if (getAPIProvider() === 'deepseek') {
      return true  // DeepSeek: always retry 429 with exponential backoff
    }
    if (!isClaudeAISubscriber() || isEnterpriseSubscriber()) {
      return true
    }
  }
```

需要在文件顶部添加 import：

```typescript
import { getAPIProvider } from '../../utils/model/providers.js'
```

- [ ] **Step 2: 529 处理跳过 DeepSeek**

`src/services/api/withRetry.ts`，在 529 重试计数逻辑（约 line 326-364）中，在 `is529Error` 检查后添加 DeepSeek 跳过：

```typescript
    if (is529Error(error)) {
      // DeepSeek does not return 529; skip fallback logic
      if (getAPIProvider() === 'deepseek') {
        // Let it fall through to normal 5xx retry
      } else {
        // existing 529 consecutive count + fallback logic...
      }
    }
```

- [ ] **Step 3: 429 错误消息适配**

`src/services/api/errors.ts`，在 429 订阅者错误消息格式化逻辑（约 line 465-558）中，DeepSeek 模式提前返回：

```typescript
  if (
    error instanceof APIError &&
    error.status === 429
  ) {
    // DeepSeek: simple rate limit message, no subscription logic
    if (getAPIProvider() === 'deepseek') {
      return '请求频率超限，请稍后重试'
    }
    if (shouldProcessRateLimits(isClaudeAISubscriber())) {
      // ... existing subscriber logic
    }
  }
```

- [ ] **Step 4: 提取 x-ds-trace-id 调试头**

`src/services/api/errors.ts`，在 `classifyAPIError` 或错误日志输出处，检查并记录 DeepSeek trace ID：

```typescript
function extractDeepSeekTraceId(error: APIError): string | undefined {
  const headers = error.headers
  if (!headers) return undefined
  if (typeof headers.get === 'function') {
    return headers.get('x-ds-trace-id') ?? undefined
  }
  return (headers as Record<string, string>)['x-ds-trace-id']
}
```

在错误格式化时附加 trace ID（如果存在）：

在 `formatAPIError` 的返回值之前检查并追加 `[trace: xxx]`。

- [ ] **Step 5: 构建验证**

Run: `npm run build 2>&1 | tail -5`
Expected: 构建成功

- [ ] **Step 6: Commit**

```bash
git add src/services/api/withRetry.ts src/services/api/errors.ts
git commit -m "feat: adapt 429/529 retry logic for DeepSeek API"
```

---

## Phase 2：缓存统计 + Tokenizer

### Task 6: 缓存统计展示

**Files:**
- Modify: `src/cost-tracker.ts`

- [ ] **Step 1: 在 formatTotalCost 中添加缓存统计**

在 `formatTotalCost` 函数中，`modelUsageDisplay` 之后，仅 DeepSeek 模式添加缓存统计行：

```typescript
import { getAPIProvider } from './utils/model/providers.js'
import { getModelCosts } from './utils/modelCost.js'
import { getDefaultMainLoopModelSetting } from './utils/model/model.js'

export function formatTotalCost(): string {
  const costDisplay =
    formatCost(getTotalCostUSD()) +
    (hasUnknownModelCost()
      ? ' (costs may be inaccurate due to usage of unknown models)'
      : '')

  const modelUsageDisplay = formatModelUsage()

  let cacheStatsDisplay = ''
  if (getAPIProvider() === 'deepseek') {
    const cacheRead = getTotalCacheReadInputTokens()
    const cacheCreation = getTotalCacheCreationInputTokens()
    const directInput = getTotalInputTokens()
    const totalInput = cacheRead + cacheCreation + directInput
    if (totalInput > 0) {
      const hitRate = (cacheRead / totalInput) * 100
      const model = getDefaultMainLoopModelSetting()
      const costs = getModelCosts(model, { input_tokens: 0, output_tokens: 0 } as Usage)
      const savings = (cacheRead / 1_000_000) * (costs.inputTokens - costs.promptCacheReadTokens)
      cacheStatsDisplay = `\nCache hit rate:         ${hitRate.toFixed(1)}% (${formatNumber(cacheRead)} / ${formatNumber(totalInput)} input tokens)\nCache savings:         ${formatCost(savings)}`
    }
  }

  return chalk.dim(
    `Total cost:            ${costDisplay}\n` +
      `Total duration (API):  ${formatDuration(getTotalAPIDuration())}
Total duration (wall): ${formatDuration(getTotalDuration())}
Total code changes:    ${getTotalLinesAdded()} ${getTotalLinesAdded() === 1 ? 'line' : 'lines'} added, ${getTotalLinesRemoved()} ${getTotalLinesRemoved() === 1 ? 'line' : 'lines'} removed
${modelUsageDisplay}${cacheStatsDisplay}`,
  )
}
```

- [ ] **Step 2: 构建验证**

Run: `npm run build 2>&1 | tail -5`
Expected: 构建成功

- [ ] **Step 3: Commit**

```bash
git add src/cost-tracker.ts
git commit -m "feat: show cache hit rate and savings in DeepSeek cost display"
```

---

### Task 7: Tokenizer 适配 — 粗略估算修正

**Files:**
- Modify: `src/services/tokenEstimation.ts`

- [ ] **Step 1: 修改 roughTokenCountEstimation 使用字节长度**

```typescript
import { getAPIProvider } from '../utils/model/providers.js'

export function roughTokenCountEstimation(
  content: string,
  bytesPerToken: number = 4,
): number {
  if (getAPIProvider() === 'deepseek') {
    return Math.round(Buffer.byteLength(content, 'utf8') / bytesPerToken)
  }
  return Math.round(content.length / bytesPerToken)
}
```

- [ ] **Step 2: 构建验证**

Run: `npm run build 2>&1 | tail -5`
Expected: 构建成功

- [ ] **Step 3: Commit**

```bash
git add src/services/tokenEstimation.ts
git commit -m "feat: use UTF-8 byte length for DeepSeek token estimation"
```

---

### Task 8: Tokenizer 适配 — 禁用 API 计数

**Files:**
- Modify: `src/services/tokenEstimation.ts`

- [ ] **Step 1: countTokensWithAPI 提前返回 null**

在 `countTokensWithAPI` 函数开头（line 124 之后）添加：

```typescript
export async function countTokensWithAPI(
  content: string,
): Promise<number | null> {
  if (getAPIProvider() === 'deepseek') {
    return null
  }
  // ... rest unchanged
```

- [ ] **Step 2: countMessagesTokensWithAPI 提前返回 null**

在 `countMessagesTokensWithAPI` 函数开头（line 140 之后）添加：

```typescript
export async function countMessagesTokensWithAPI(
  messages: Anthropic.Beta.Messages.BetaMessageParam[],
  tools: Anthropic.Beta.Messages.BetaToolUnion[],
): Promise<number | null> {
  if (getAPIProvider() === 'deepseek') {
    return null
  }
  // ... rest unchanged
```

- [ ] **Step 3: countTokensViaHaikuFallback 提前返回 null**

在 `countTokensViaHaikuFallback` 函数开头（line 251 之后）添加：

```typescript
export async function countTokensViaHaikuFallback(
  messages: Anthropic.Beta.Messages.BetaMessageParam[],
  tools: Anthropic.Beta.Messages.BetaToolUnion[],
): Promise<number | null> {
  if (getAPIProvider() === 'deepseek') {
    return null
  }
  // ... rest unchanged
```

- [ ] **Step 4: 构建验证**

Run: `npm run build 2>&1 | tail -5`
Expected: 构建成功

- [ ] **Step 5: Commit**

```bash
git add src/services/tokenEstimation.ts
git commit -m "feat: skip Anthropic token counting API for DeepSeek"
```

---

## Phase 3：缓存命中率优化

### Task 9: 固定 tools 数组排序

**Files:**
- Modify: `src/services/api/claude.ts`

- [ ] **Step 1: 在 allTools 构建之后添加排序**

定位 `const allTools = [...toolSchemas, ...extraToolSchemas]`（约 line 1495），在其后添加：

```typescript
  const allTools = [...toolSchemas, ...extraToolSchemas]

  // Sort tools by name to ensure stable ordering for DeepSeek prefix caching.
  // DeepSeek automatically caches the common prefix of consecutive requests;
  // non-deterministic tool order would invalidate the cache.
  if (getAPIProvider() === 'deepseek') {
    allTools.sort((a, b) => {
      const nameA = 'name' in a ? a.name : ''
      const nameB = 'name' in b ? b.name : ''
      return nameA.localeCompare(nameB)
    })
  }
```

- [ ] **Step 2: 构建验证**

Run: `npm run build 2>&1 | tail -5`
Expected: 构建成功

- [ ] **Step 3: Commit**

```bash
git add src/services/api/claude.ts
git commit -m "feat: sort tools alphabetically for DeepSeek prefix cache stability"
```

---

## Phase 4：文档更新

### Task 10: 更新文档

**Files:**
- Modify: `docs/configuration.md`
- Modify: `docs/usage.md`
- Modify: `docs/faq.md`
- Modify: `docs/architecture.md`
- Modify: `README.md`
- Modify: `README_EN.md`

- [ ] **Step 1: 更新 docs/configuration.md**

在「行为控制」环境变量表中添加：

```markdown
| `DEEPSEEK_USE_FULL_PRICE` | 设为 `1` 使用 DeepSeek V4 Pro 原价（折扣期结束后自行设置） |
```

在「推理控制」表后新增「费用显示」小节：

```markdown
### 费用显示

DeepSeek 模式下，费用以人民币（¥）显示。V4 Pro 当前享受折扣价（至 2026-05-31）：

| 模型 | 输入（缓存未命中） | 输入（缓存命中） | 输出 |
|------|-------------------|-----------------|------|
| deepseek-v4-pro（折扣） | ¥3.00/Mtok | ¥0.025/Mtok | ¥6.00/Mtok |
| deepseek-v4-pro（原价） | ¥12.00/Mtok | ¥0.10/Mtok | ¥24.00/Mtok |
| deepseek-v4-flash | ¥1.00/Mtok | ¥0.02/Mtok | ¥2.00/Mtok |

折扣期结束后设置 `DEEPSEEK_USE_FULL_PRICE=1` 切换到原价。
```

- [ ] **Step 2: 更新 docs/usage.md**

在 `/cost` 命令说明后添加：

```markdown
DeepSeek 模式下，`/cost` 输出额外包含：
- **缓存命中率** — 显示前缀缓存的命中比例
- **缓存节省** — 因缓存命中而节省的费用（¥）

退出会话时也会自动显示费用摘要。
```

- [ ] **Step 3: 更新 docs/faq.md**

在「功能兼容性」章节后添加：

```markdown
### Q: 提示 "DeepSeek 账户余额不足"

登录 [platform.deepseek.com](https://platform.deepseek.com) 充值后重试。DeepSeek 使用 HTTP 402 状态码表示余额不足，DeepSeekCode 不会自动重试此错误。

### Q: 缓存命中率很低

- 确保对话中没有频繁切换模型（会导致缓存失效）
- 长对话中使用 `/compact` 压缩上下文不会影响缓存（系统提示和工具定义保持不变）
- 首次请求不会有缓存命中，这是正常的
```

- [ ] **Step 4: 更新 docs/architecture.md**

在「适配层」章节的文件列表中添加：

```markdown
| `src/utils/modelCost.ts` | DeepSeek 人民币定价常量和费用计算 |
| `src/cost-tracker.ts` | 缓存统计展示、人民币格式化 |
```

- [ ] **Step 5: 更新 README.md 工作原理章节**

将工作原理章节替换为：

```markdown
## 工作原理

- 通过 Anthropic SDK 将 API 调用路由到 DeepSeek 适配层
- 默认开启 Thinking 推理模式，effort 等级为 `max`
- Thinking 开启时仍支持自定义 temperature（0.0-2.0）
- 自动前缀缓存由 DeepSeek 服务端处理，工具定义按字典序排列以最大化缓存命中
- 费用以人民币（¥）显示，`/cost` 命令展示缓存命中率和节省金额
- 将不支持的内容块（image、document、server-tool）转为文本占位
- 子代理继承所有 DeepSeek 环境变量
```

- [ ] **Step 6: 更新 README_EN.md 工作原理章节**

```markdown
## How It Works

- Routes API calls through a DeepSeek adapter using the Anthropic SDK
- Thinking mode enabled by default with `max` effort
- Supports temperature 0.0-2.0 even with thinking enabled
- Automatic prefix caching is handled server-side by DeepSeek; tools are sorted alphabetically to maximize cache hits
- Costs displayed in CNY (¥); `/cost` shows cache hit rate and savings
- Converts unsupported content blocks (image, document, server-tool) to text placeholders
- Sub-agents inherit all DeepSeek environment variables
```

- [ ] **Step 7: Commit**

```bash
git add docs/configuration.md docs/usage.md docs/faq.md docs/architecture.md README.md README_EN.md
git commit -m "docs: update for DeepSeek V4 cost display, caching, and error handling"
```

---

### Task 11: 最终验证

- [ ] **Step 1: 全量构建**

Run: `npm run check`
Expected: 构建成功，版本号输出正确

- [ ] **Step 2: 运行测试套件**

Run: `npm test`
Expected: 所有测试通过

- [ ] **Step 3: 如果测试失败，修复并重新提交**

根据错误信息修复。常见问题：
- `deepseek-v4-config.test.mjs` 可能需要更新以反映新增的 `modelCost.ts` 导出
- `deepseek-isolation.test.mjs` 应无影响（路径相关）
