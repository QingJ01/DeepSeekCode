import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))

const matching = spawnSync(process.execPath, [
  'scripts/verify-release-tag.mjs',
  `v${packageJson.version}`,
], {
  cwd: root,
  encoding: 'utf8',
})

assert.equal(
  matching.status,
  0,
  `matching release tag should pass: ${matching.stderr || matching.stdout}`,
)

const mismatched = spawnSync(process.execPath, [
  'scripts/verify-release-tag.mjs',
  'v0.0.0',
], {
  cwd: root,
  encoding: 'utf8',
})

assert.notEqual(mismatched.status, 0, 'mismatched release tag should fail')
assert.match(
  mismatched.stderr,
  /does not match package\.json version/,
  'mismatched release tag should explain the version mismatch',
)
