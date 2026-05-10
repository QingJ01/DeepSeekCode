#!/usr/bin/env node
/**
 * build.mjs — Build Claude Code from source using esbuild
 *
 * Strategy:
 *   1. Copy src/ → build-src/ (working copy)
 *   2. Transform all `from 'bun:bundle'` imports → `from './stubs/bun-bundle'`
 *   3. Inject MACRO globals via esbuild --define (replaces MACRO.X at compile time)
 *   4. Bundle with esbuild into a single cli.js
 */

import { readdir, readFile, writeFile, mkdir, cp, rm } from 'node:fs/promises'
import { join, relative, dirname } from 'node:path'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

const PACKAGE_JSON = JSON.parse(await readFile(join(ROOT, 'package.json'), 'utf8'))
const VERSION = PACKAGE_JSON.version
const PACKAGE_NAME = PACKAGE_JSON.name

// ── Step 1: Clean & Create build directory ─────────────────────────────────

const BUILD_DIR = join(ROOT, 'build-src')
await rm(BUILD_DIR, { recursive: true, force: true })
await mkdir(BUILD_DIR, { recursive: true })

// Copy src/ → build-src/
await cp(join(ROOT, 'src'), join(BUILD_DIR, 'src'), { recursive: true })
// Copy stubs/ → build-src/stubs/
await cp(join(ROOT, 'stubs'), join(BUILD_DIR, 'stubs'), { recursive: true })

console.log('✅ Copied source to build-src/')

// ── Step 2: Transform imports ──────────────────────────────────────────────

async function* walkFiles(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) yield* walkFiles(full)
    else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) yield full
  }
}

let transformCount = 0

for await (const file of walkFiles(join(BUILD_DIR, 'src'))) {
  let content = await readFile(file, 'utf8')
  let modified = false

  // Replace bun:bundle import with our stub
  if (content.includes("from 'bun:bundle'") || content.includes('from "bun:bundle"')) {
    const rel = relative(dirname(file), join(BUILD_DIR, 'stubs', 'bun-bundle.ts'))
    const importPath = rel.startsWith('.') ? rel : './' + rel
    content = content.replace(
      /import\s*\{\s*feature\s*\}\s*from\s*['"]bun:bundle['"]/g,
      `import { feature } from '${importPath.replace(/\.ts$/, '.js')}'`
    )
    modified = true
  }

  if (modified) {
    await writeFile(file, content, 'utf8')
    transformCount++
  }
}

console.log(`✅ Transformed ${transformCount} files (bun:bundle → stub)`)

// ── Step 3: Create entrypoint wrapper ──────────────────────────────────────

const ENTRY = join(BUILD_DIR, 'entry.ts')
await writeFile(ENTRY, `
// MACRO globals — normally injected by Bun's --define at compile time
// We inject them here as globals so MACRO.X references resolve
const MACRO = {
  VERSION: '${VERSION}',
  BUILD_TIME: '',
  FEEDBACK_CHANNEL: 'https://github.com/anthropics/claude-code/issues',
  ISSUES_EXPLAINER: 'https://github.com/anthropics/claude-code/issues/new/choose',
  FEEDBACK_CHANNEL_URL: 'https://github.com/anthropics/claude-code/issues',
  ISSUES_EXPLAINER_URL: 'https://github.com/anthropics/claude-code/issues/new/choose',
  NATIVE_PACKAGE_URL: '${PACKAGE_NAME}',
  PACKAGE_URL: '${PACKAGE_NAME}',
  VERSION_CHANGELOG: '',
}

// Make it global
globalThis.MACRO = MACRO

// Now load the real entrypoint
import './src/entrypoints/cli.tsx'
`)

console.log('✅ Created entry wrapper with MACRO injection')

// ── Step 4: esbuild bundle ─────────────────────────────────────────────────

const OUT_FILE = join(ROOT, 'dist', 'cli.js')

try {
  // Check if esbuild is available
  execSync('npx esbuild --version', { stdio: 'pipe' })
} catch {
  console.log('\n📦 Installing esbuild...')
  execSync('npm install --save-dev esbuild', { cwd: ROOT, stdio: 'inherit' })
}

console.log('\n🔨 Bundling with esbuild...')

try {
  execSync(`npx esbuild \\
    "${ENTRY}" \\
    --bundle \\
    --platform=node \\
    --target=node18 \\
    --format=esm \\
    --outfile="${OUT_FILE}" \\
    --banner:js='#!/usr/bin/env node' \\
    --define:process.env.USER_TYPE='"external"' \\
    --define:process.env.CLAUDE_CODE_VERSION='"${VERSION}"' \\
    --external:bun:ffi \\
    --external:bun:bundle \\
    --allow-overwrite \\
    --log-level=info \\
    --sourcemap \\
    ${process.argv.includes('--minify') ? '--minify' : ''}`, {
    cwd: ROOT,
    stdio: 'inherit',
    shell: true
  })
} catch (e) {
  console.error('\n❌ esbuild failed. This is expected — the source has complex Bun-specific patterns.')
  console.error('   The source is primarily meant for reading/analysis, not recompilation.')
  console.error('\n   To proceed with fixing, you would need to:')
  console.error('   1. Install Bun runtime (bun.sh)')
  console.error('   2. Create a bun build script that uses Bun.defineMacro / feature() natively')
  console.error('   3. Or manually resolve each compile-time intrinsic')
  process.exit(1)
}

console.log(`\n✅ Build complete: ${OUT_FILE}`)
console.log(`   Run with: node ${OUT_FILE}`)
