import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const read = path => readFileSync(join(root, path), 'utf8')
const readJson = path => JSON.parse(read(path))

const packageJson = readJson('package.json')
const packageLock = readJson('package-lock.json')
const expectedVersion = packageJson.version
const packageName = packageJson.name

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const expectedVersionRe = new RegExp(`(?<!\\d)${escapeRegExp(expectedVersion)}(?!\\d)`)

assert.equal(packageJson.version, expectedVersion, `package.json version should be ${expectedVersion}`)
assert.equal(packageLock.version, expectedVersion, `package-lock.json root version should be ${expectedVersion}`)
assert.equal(
  packageLock.packages[''].version,
  expectedVersion,
  `package-lock.json package entry version should be ${expectedVersion}`,
)

for (const path of [
  'scripts/build.mjs',
  'scripts/prepare-src.mjs',
  'scripts/transform.mjs',
  'scripts/stub-modules.mjs',
]) {
  const source = read(path)
  assert.doesNotMatch(
    source,
    expectedVersionRe,
    `${path} should read the package version from package.json instead of hardcoding ${expectedVersion}`,
  )
  assert.doesNotMatch(source, /2\.1\.88/, `${path} should not reference the old version`)
}

for (const path of [
  'scripts/build.mjs',
  'scripts/prepare-src.mjs',
  'scripts/transform.mjs',
]) {
  const source = read(path)
  assert.doesNotMatch(
    source,
    /'@anthropic-ai\/claude-code'|"@anthropic-ai\/claude-code"/,
    `${path} should not inject the Claude Code npm package name`,
  )
  assert.match(
    source,
    new RegExp(`['"]\\$\\{${packageName}\\}['"]|['"]${escapeRegExp(packageName)}['"]|PACKAGE_NAME`),
    `${path} should inject ${packageName} as the package URL`,
  )
}

for (const path of [
  'src/utils/localInstaller.ts',
  'src/utils/nativeInstaller/download.ts',
]) {
  const source = read(path)
  assert.doesNotMatch(
    source,
    expectedVersionRe,
    `${path} should use MACRO.VERSION instead of hardcoding ${expectedVersion}`,
  )
  assert.doesNotMatch(source, /2\.1\.88/, `${path} should not reference the old version`)
}
