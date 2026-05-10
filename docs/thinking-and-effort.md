# 推理模式（Thinking & Effort）

DeepSeekCode 支持 DeepSeek V4 的推理增强功能，在复杂编程任务中显著提升代码质量。

## Thinking 模式

Thinking 模式让模型在回复前进行链式推理（Chain-of-Thought），输出的思考过程可以在交互界面中查看。

### 默认行为

- **默认开启**，使用 `max` 推理等级
- 模型会自行控制思考深度，`budget_tokens` 参数会被发送但由 DeepSeek 内部决定

### 关闭 Thinking

如果你需要更快的响应速度，可以关闭 thinking：

```bash
# 环境变量
export CLAUDE_CODE_DISABLE_THINKING=1

# 或在 settings.json 中
{ "alwaysThinkingEnabled": false }
```

## Effort 等级

Effort 控制推理的深度，影响响应质量和速度：

| 等级 | 说明 | 适用场景 |
|------|------|----------|
| `low` | 快速响应，最少思考 | 简单问答、格式转换 |
| `medium` | 平衡模式 | 一般编码任务 |
| `high` | 深度推理 | 复杂代码实现、调试 |
| `max` | **默认**，最深推理 | 架构设计、疑难问题 |

### 设置方式

**1. 环境变量（全局）**

```bash
export CLAUDE_CODE_EFFORT_LEVEL=high
```

**2. CLI 参数（单次会话）**

```bash
deepseek-code --effort max
```

**3. 交互命令（会话中切换）**

```
/effort low
/effort max
```

**4. settings.json（持久化）**

```jsonc
{ "effortLevel": "high" }
```

### 优先级

`CLI 参数` > `环境变量` > `settings.json` > `默认值 (max)`

## 输出 Token 限制

DeepSeek V4 支持最大 **384,000 token** 的输出：

- 默认输出上限：64,000 token
- 最大上限：384,000 token

自定义输出上限：

```bash
export CLAUDE_CODE_MAX_OUTPUT_TOKENS=128000
```

## 与 Claude 的差异

| 特性 | DeepSeek V4 | Claude |
|------|-------------|--------|
| Thinking 模式 | 支持，budget_tokens 被忽略 | 支持，精确控制 budget_tokens |
| Adaptive thinking | 不支持（DeepSeek 自行控制） | 支持 |
| Effort 等级 | `low`/`high`/`max` 生效 | `low`/`medium`/`high`/`max` |
| Temperature + Thinking | 支持同时使用（0.0-2.0） | Thinking 开启时必须 temperature=1.0 |
| 最大输出 | 384K token | 128K token |
| 上下文窗口 | 1M token | 200K / 1M token |
| 缓存机制 | 自动前缀缓存 | 显式 cache_control |

## 提示

- **复杂任务用 `max`**：架构设计、多文件重构、疑难调试时切到 `max` 等级可以获得更高质量的输出
- **简单任务用 `low` 或关闭 thinking**：格式化、简单查询时不需要深度推理，`low` 等级或关闭 thinking 可以加快响应
- **`flash` 模型 + `low` effort**：对于大量简单子任务（如批量重命名），使用 Flash 模型配合 low effort 是最经济的选择
