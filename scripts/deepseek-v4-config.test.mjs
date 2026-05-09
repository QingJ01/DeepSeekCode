import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const read = path => readFileSync(join(root, path), 'utf8')

const runMjs = read('scripts/run-deepseek.mjs')
const runPs1 = read('run-deepseek.ps1')
const envExample = read('.env.example')
const readme = read('README.md')
const readmeCn = read('README_CN.md')
const effort = read('src/utils/effort.ts')
const claudeApi = read('src/services/api/claude.ts')

assert.match(
  runMjs,
  /DEEPSEEK_MODEL\s*\|\|=\s*['"]deepseek-v4-pro['"]/,
  'Node DeepSeek launcher should default to deepseek-v4-pro',
)
assert.doesNotMatch(
  runMjs,
  /deepseek-v4-pro\[1m\]/,
  'Node DeepSeek launcher should not default to the [1m] model alias',
)
assert.match(
  runMjs,
  /CLAUDE_CODE_EFFORT_LEVEL\s*\|\|=\s*['"]max['"]/,
  'Node DeepSeek launcher should default effort to max',
)

assert.match(
  runPs1,
  /\$env:DEEPSEEK_MODEL\s*=\s*["']deepseek-v4-pro["']/,
  'PowerShell launcher should default to deepseek-v4-pro',
)
assert.match(
  runPs1,
  /\$env:CLAUDE_CODE_EFFORT_LEVEL\s*=\s*["']max["']/,
  'PowerShell launcher should default effort to max',
)

for (const [name, source] of [
  ['.env.example', envExample],
  ['README.md', readme],
  ['README_CN.md', readmeCn],
]) {
  assert.doesNotMatch(source, /deepseek-v4-pro\[1m\]/, `${name} should not mention the [1m] model alias`)
}
assert.match(envExample, /^DEEPSEEK_MODEL=deepseek-v4-pro$/m)

assert.match(
  effort,
  /if\s*\(\s*getAPIProvider\(\)\s*===\s*['"]deepseek['"]\s*\)\s*\{\s*return\s+['"]max['"]/,
  'DeepSeek default effort should be max',
)

assert.match(
  claudeApi,
  /prompt_cache_hit_tokens/,
  'DeepSeek prompt_cache_hit_tokens should be mapped into usage',
)
assert.match(
  claudeApi,
  /prompt_cache_miss_tokens/,
  'DeepSeek prompt_cache_miss_tokens should be mapped into usage',
)
