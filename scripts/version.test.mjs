import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const read = path => readFileSync(join(root, path), 'utf8')
const readJson = path => JSON.parse(read(path))

const expectedVersion = '0.0.1'

const packageJson = readJson('package.json')
const packageLock = readJson('package-lock.json')

assert.equal(packageJson.version, expectedVersion, 'package.json version should be 0.0.1')
assert.equal(packageLock.version, expectedVersion, 'package-lock.json root version should be 0.0.1')
assert.equal(
  packageLock.packages[''].version,
  expectedVersion,
  'package-lock.json package entry version should be 0.0.1',
)

for (const path of [
  'scripts/build.mjs',
  'scripts/prepare-src.mjs',
  'scripts/transform.mjs',
  'scripts/stub-modules.mjs',
  'stubs/macros.ts',
]) {
  const source = read(path)
  assert.doesNotMatch(source, /2\.1\.88/, `${path} should not reference the old version`)
}
