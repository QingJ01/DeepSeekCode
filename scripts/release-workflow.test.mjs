import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const read = path => readFileSync(join(root, path), 'utf8')
const readJson = path => JSON.parse(read(path))

const packageJson = readJson('package.json')
const ciWorkflow = read('.github/workflows/ci.yml')
const publishWorkflow = read('.github/workflows/publish.yml')
const buildScript = read('scripts/build.mjs')

assert.equal(
  packageJson.name,
  '@qingj/deepseekcode',
  'package should publish under the scoped npm name allowed by npm',
)
assert.equal(
  packageJson.bin?.deepseekcode,
  'scripts/run-deepseek.mjs',
  'scoped package should still expose deepseekcode as a CLI command',
)
assert.equal(
  packageJson.bin?.['deepseek-code'],
  'scripts/run-deepseek.mjs',
  'scoped package should still expose deepseek-code as a CLI command',
)

assert.ok(
  existsSync(join(root, 'scripts/verify-release-tag.mjs')),
  'release tag verification script should exist',
)

assert.ok(packageJson.scripts?.['test:release'], 'package.json should define test:release')
assert.match(
  packageJson.scripts['test:release'],
  /deepseek-isolation\.test\.mjs/,
  'test:release should include DeepSeek isolation coverage',
)
assert.match(
  packageJson.scripts['test:release'],
  /logo-alignment\.test\.mjs/,
  'test:release should include logo alignment coverage',
)
assert.match(
  packageJson.scripts['test:release'],
  /version\.test\.mjs/,
  'test:release should include version consistency coverage',
)
assert.match(
  packageJson.scripts['test:release'],
  /release-workflow\.test\.mjs/,
  'test:release should include release workflow coverage',
)
assert.match(
  packageJson.scripts['test:release'],
  /verify-release-tag\.test\.mjs/,
  'test:release should include release tag script coverage',
)
assert.equal(
  packageJson.scripts?.['verify-release-tag'],
  'node scripts/verify-release-tag.mjs',
  'package.json should expose verify-release-tag',
)

assert.match(ciWorkflow, /npm run test:release/, 'CI should run release test suite')
assert.match(
  publishWorkflow,
  /npm run verify-release-tag/,
  'publish workflow should verify the GitHub Release tag matches package.json',
)
assert.match(
  publishWorkflow,
  /RELEASE_TAG:\s*\$\{\{\s*github\.event\.release\.tag_name\s*\}\}/,
  'publish workflow should pass github.event.release.tag_name to the tag verifier',
)
assert.match(
  publishWorkflow,
  /npm run test:release/,
  'publish workflow should run release test suite before publishing',
)
assert.match(
  publishWorkflow,
  /npm publish --provenance --access public --ignore-scripts/,
  'publish workflow should publish the already-verified build without rebuilding in prepublishOnly',
)
assert.doesNotMatch(
  packageJson.files.join('\n'),
  /^dist\/cli\.js\.map$/m,
  'published npm package should not include the large source map',
)
assert.match(
  buildScript,
  /import \{[^}]*\bisAbsolute\b[^}]*\} from 'node:path'/,
  'build should import isAbsolute for CI/Linux esbuild paths',
)
assert.match(
  buildScript,
  /if \(isAbsolute\(normalized\)\) return normalized/,
  'build should preserve absolute importer paths when creating stubs',
)
assert.match(
  buildScript,
  /\(\?:X\|\\u2718\) \\\[ERROR\\\]/,
  'build should parse esbuild error blocks on both Windows and Linux runners',
)
