import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const read = path => readFileSync(join(root, path), 'utf8')
const readJson = path => JSON.parse(read(path))

const expectedVersion = '0.1.0'

const packageJson = readJson('package.json')
const packageLock = readJson('package-lock.json')

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
  'src/utils/localInstaller.ts',
  'src/utils/nativeInstaller/download.ts',
  'stubs/macros.ts',
]) {
  const source = read(path)
  assert.doesNotMatch(source, /(?<!\d)0\.0\.1(?!\d)/, `${path} should not reference 0.0.1`)
  if (path !== 'stubs/macros.ts') {
    assert.match(source, /(?<!\d)0\.1\.0(?!\d)/, `${path} should reference ${expectedVersion}`)
  }
  assert.doesNotMatch(source, /2\.1\.88/, `${path} should not reference the old version`)
}
