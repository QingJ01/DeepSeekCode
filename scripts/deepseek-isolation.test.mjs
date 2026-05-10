import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const read = path => readFileSync(join(root, path), 'utf8')

const envUtils = read('src/utils/envUtils.ts')
const settings = read('src/utils/settings/settings.ts')
const cronTasks = read('src/utils/cronTasks.ts')
const worktree = read('src/utils/worktree.ts')
const cachePaths = read('src/utils/cachePaths.ts')
const loadSkillsDir = read('src/skills/loadSkillsDir.ts')
const markdownConfigLoader = read('src/utils/markdownConfigLoader.ts')
const claudemd = read('src/utils/claudemd.ts')
const agentMemory = read('src/tools/AgentTool/agentMemory.ts')
const agentMemorySnapshot = read('src/tools/AgentTool/agentMemorySnapshot.ts')
const addDirPluginSettings = read('src/utils/plugins/addDirPluginSettings.ts')
const fileEditConstants = read('src/tools/FileEditTool/constants.ts')
const permissionsFilesystem = read('src/utils/permissions/filesystem.ts')

assert.match(
  envUtils,
  /getProjectConfigDirName/,
  'envUtils should expose a centralized project config directory helper',
)

assert.match(
  settings,
  /getProjectConfigDirName/,
  'project settings paths should use the centralized project config directory helper',
)
assert.doesNotMatch(
  settings,
  /join\(\s*['"]\.claude['"]\s*,\s*['"]settings(?:\.local)?\.json['"]\s*\)/,
  'project settings should not hardcode .claude/settings*.json',
)

assert.match(
  cronTasks,
  /getProjectConfigDirName/,
  'scheduled tasks should use the centralized project config directory helper',
)
assert.doesNotMatch(
  cronTasks,
  /join\(\s*['"]\.claude['"]\s*,\s*['"]scheduled_tasks\.json['"]\s*\)/,
  'scheduled tasks should not hardcode .claude/scheduled_tasks.json',
)

assert.match(
  worktree,
  /getProjectConfigDirName/,
  'worktree storage should use the centralized project config directory helper',
)
assert.doesNotMatch(
  worktree,
  /join\(\s*repoRoot\s*,\s*['"]\.claude['"]\s*,\s*['"]worktrees['"]\s*\)/,
  'worktree storage should not hardcode <repo>/.claude/worktrees',
)

assert.match(
  cachePaths,
  /deepseek-code/,
  'DeepSeek mode should use a distinct app name for OS cache/data paths',
)
assert.doesNotMatch(
  cachePaths,
  /envPaths\(\s*['"]claude-cli['"]\s*\)/,
  'cache paths should not be fixed to the Claude CLI app namespace',
)

for (const [name, source] of [
  ['src/skills/loadSkillsDir.ts', loadSkillsDir],
  ['src/utils/markdownConfigLoader.ts', markdownConfigLoader],
  ['src/utils/claudemd.ts', claudemd],
  ['src/tools/AgentTool/agentMemory.ts', agentMemory],
  ['src/tools/AgentTool/agentMemorySnapshot.ts', agentMemorySnapshot],
  ['src/utils/plugins/addDirPluginSettings.ts', addDirPluginSettings],
]) {
  assert.match(
    source,
    /getProjectConfigDirName/,
    `${name} should use the centralized project config directory helper`,
  )
}

assert.doesNotMatch(
  loadSkillsDir,
  /(?:join\(\s*(?:dir|currentDir)\s*,\s*['"]\.claude['"]\s*,\s*['"]skills['"]\s*\)|`\.claude\/\$\{dir\}`)/,
  'project skill discovery should not hardcode .claude/skills',
)

assert.doesNotMatch(
  markdownConfigLoader,
  /join\(\s*(?:current|gitRoot|canonicalRoot)\s*,\s*['"]\.claude['"]\s*,\s*subdir\s*\)/,
  'project markdown config discovery should not hardcode .claude/<subdir>',
)

assert.doesNotMatch(
  claudemd,
  /(?:join\(\s*dir\s*,\s*['"]\.claude['"]\s*,\s*['"](?:CLAUDE\.md|rules)['"]\s*\)|`\\\$\{sep\}\.claude\\\$\{sep\}rules\\\$\{sep\}`)/,
  'project memory discovery should not hardcode .claude/CLAUDE.md or .claude/rules',
)

assert.doesNotMatch(
  agentMemory,
  /join\(\s*getCwd\(\)\s*,\s*['"]\.claude['"]\s*,\s*['"]agent-memory/,
  'project agent memory should not hardcode <cwd>/.claude/agent-memory',
)

assert.doesNotMatch(
  agentMemorySnapshot,
  /join\(\s*getCwd\(\)\s*,\s*['"]\.claude['"]/,
  'agent memory snapshots should not hardcode <cwd>/.claude',
)

assert.doesNotMatch(
  addDirPluginSettings,
  /join\(\s*dir\s*,\s*['"]\.claude['"]\s*,\s*file\s*\)/,
  '--add-dir plugin settings should not hardcode .claude/settings*.json',
)

assert.match(
  fileEditConstants,
  /getProjectConfigDirName/,
  'session permission patterns should use the active project config directory',
)
assert.match(
  permissionsFilesystem,
  /['"]\.deepseek['"]/,
  'the DeepSeek project config directory should be protected as a dangerous directory',
)
