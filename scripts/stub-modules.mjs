#!/usr/bin/env node
/**
 * stub-modules.mjs — Create stub files for all missing feature-gated modules
 *
 * Run: node scripts/stub-modules.mjs
 * Then: npx esbuild build-src/entry.ts --bundle --platform=node --packages=external ...
 *
 * Reads esbuild errors, resolves each relative import to its correct absolute
 * path inside build-src/src/, and creates an empty stub.
 */

import { readFile, writeFile, mkdir, stat } from 'node:fs/promises'
import { join, dirname, resolve } from 'node:path'
import { execSync } from 'node:child_process'

const ROOT = join(import.meta.dirname, '..')
const BUILD_SRC = join(ROOT, 'build-src', 'src')

async function exists(p) { try { await stat(p); return true } catch { return false } }

// Parse all missing modules from esbuild output
const out = execSync(
  `npx esbuild "${join(ROOT, 'build-src', 'entry.ts')}" ` +
  `--bundle --platform=node --packages=external ` +
  `--external:'bun:*' --log-level=error --log-limit=0 ` +
  `--outfile=/dev/null 2>&1 || true`,
  { cwd: ROOT, shell: true, encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 }
)

const missingRe = /Could not resolve "([^"]+)"/g
const errors = [...out.matchAll(/\s+(\S+:\d+:\d+):\s/g)].map(m => m[1])
const moduleFiles = new Map() // module → set of importing files

let match
while ((match = missingRe.exec(out)) !== null) {
  const mod = match[1]
  if (mod.startsWith('node:') || mod.startsWith('bun:') || mod.startsWith('/')) continue
  moduleFiles.set(mod, new Set())
}

// Now resolve each relative module path to its absolute path
// by finding which source file imports it
const importRe = /(\S+:\d+:\d+):\s*\d+.*require\(["']([^"']+)["']\)|import.*from\s*["']([^"']+)["']/g

let stubCount = 0
const created = new Set()

for (const [mod] of moduleFiles) {
  // For relative imports, we need to find the importing file to resolve the path
  // Search for the import in the build-src
  const escapedMod = mod.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const grepResult = execSync(
    `grep -rl "${escapedMod}" "${BUILD_SRC}" 2>/dev/null || true`,
    { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024, shell: true }
  ).trim()

  const importers = grepResult.split('\n').filter(Boolean)

  for (const importer of importers) {
    const importerDir = dirname(importer)
    const absPath = resolve(importerDir, mod)

    // Check if it's a .d.ts type file — just create empty
    if (mod.endsWith('.d.ts')) {
      if (!created.has(absPath)) {
        await mkdir(dirname(absPath), { recursive: true }).catch(() => {})
        if (!await exists(absPath)) {
          await writeFile(absPath, '// Type stub\nexport {}\n', 'utf8')
          stubCount++
          created.add(absPath)
        }
      }
      continue
    }

    // Text assets (.txt, .md)
    if (/\.(txt|md)$/.test(mod)) {
      if (!created.has(absPath)) {
        await mkdir(dirname(absPath), { recursive: true }).catch(() => {})
        if (!await exists(absPath)) {
          await writeFile(absPath, '', 'utf8')
          stubCount++
          created.add(absPath)
        }
      }
      continue
    }

    // JS/TS modules
    if (/\.[tj]sx?$/.test(mod)) {
      if (!created.has(absPath)) {
        await mkdir(dirname(absPath), { recursive: true }).catch(() => {})
        if (!await exists(absPath)) {
          const name = mod.split('/').pop().replace(/\.[tj]sx?$/, '')
          const safeName = name.replace(/[^a-zA-Z0-9_$]/g, '_') || 'stub'
          await writeFile(absPath, `// Auto-generated stub for feature-gated module: ${mod}\nexport default function ${safeName}() { return null }\nexport const ${safeName} = () => null\n`, 'utf8')
          stubCount++
          created.add(absPath)
        }
      }
    }
  }

  // Also try resolving from src root for modules starting with ../
  if (mod.startsWith('../')) {
    // Try from several likely locations
    for (const prefix of ['src', 'src/commands', 'src/components', 'src/services', 'src/tools', 'src/utils']) {
      const absPath = join(ROOT, 'build-src', prefix, mod)
      if (!created.has(absPath)) {
        await mkdir(dirname(absPath), { recursive: true }).catch(() => {})
        if (!await exists(absPath) && (/\.[tj]sx?$/.test(mod))) {
          const name = mod.split('/').pop().replace(/\.[tj]sx?$/, '')
          const safeName = name.replace(/[^a-zA-Z0-9_$]/g, '_') || 'stub'
          await writeFile(absPath, `// Auto-generated stub for: ${mod}\nexport default function ${safeName}() { return null }\nexport const ${safeName} = () => null\n`, 'utf8')
          stubCount++
          created.add(absPath)
        }
      }
    }
  }
}

console.log(`✅ Created ${stubCount} stubs for ${moduleFiles.size} missing modules`)

// Now try the build
console.log('\n🔨 Attempting esbuild bundle...\n')
try {
  const OUT = join(ROOT, 'dist', 'cli.js')
  await mkdir(dirname(OUT), { recursive: true })

  execSync([
    'npx esbuild',
    `"${join(ROOT, 'build-src', 'entry.ts')}"`,
    '--bundle',
    '--platform=node',
    '--target=node18',
    '--format=esm',
    `--outfile="${OUT}"`,
    '--packages=external',
    '--external:bun:*',
    '--banner:js=$\'#!/usr/bin/env node\\n// Claude Code v0.1.0 (built from source)\\n// Copyright (c) Anthropic PBC. All rights reserved.\\n\'',
    '--allow-overwrite',
    '--log-level=warning',
    '--sourcemap',
  ].join(' '), {
    cwd: ROOT,
    stdio: 'inherit',
    shell: true,
  })

  const size = (await stat(OUT)).size
  console.log(`\n✅ Build succeeded: ${OUT}`)
  console.log(`   Size: ${(size / 1024 / 1024).toFixed(1)}MB`)
  console.log(`   Usage: node ${OUT} --version`)
} catch (e) {
  console.error('\n❌ Build still has errors. Run again to iterate:')
  console.error('   node scripts/stub-modules.mjs')
}
