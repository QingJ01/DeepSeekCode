#!/usr/bin/env node

import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { execFileSync, execSync } from 'node:child_process'
import { dirname, isAbsolute, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const PACKAGE_JSON = JSON.parse(await readFile(join(ROOT, 'package.json'), 'utf8'))
const VERSION = PACKAGE_JSON.version
const PACKAGE_NAME = PACKAGE_JSON.name
const BUILD = join(ROOT, 'build-src')
const ENTRY = join(BUILD, 'entry.ts')
const OUT_DIR = join(ROOT, 'dist')
const OUT_FILE = join(OUT_DIR, 'cli.js')
const ESBUILD_BIN = join(ROOT, 'node_modules', 'esbuild', 'bin', 'esbuild')

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory() && entry.name !== 'node_modules') {
      yield* walk(path)
    } else {
      yield path
    }
  }
}

async function exists(path) {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

async function ensureEsbuild() {
  if (await exists(ESBUILD_BIN)) return
  execSync('npm install --save-dev esbuild', { cwd: ROOT, stdio: 'inherit' })
}

function importerToBuildPath(importer) {
  const normalized = importer.replace(/\\/g, '/')
  if (isAbsolute(normalized)) return normalized
  if (normalized.startsWith('build-src/')) return join(ROOT, normalized)
  if (normalized.startsWith('src/')) return join(BUILD, normalized)
  return join(ROOT, normalized)
}

function parseMissingModules(output) {
  const missingRe =
    /Could not resolve "([^"]+)"([\s\S]*?)(?=\n(?:X|\u2718) \[ERROR\]|\n\d+ errors?|$)/g
  const missing = []
  let match
  while ((match = missingRe.exec(output)) !== null) {
    const mod = match[1]
    if (mod.startsWith('node:') || mod.startsWith('bun:') || mod.startsWith('/')) {
      continue
    }
    const location = (match[2] || '').match(/\n\s+([^:\n]+):\d+:\d+:/)
    missing.push({ mod, importer: location?.[1]?.trim() })
  }
  return missing
}

function parseMissingExports(output) {
  const exportRe = /No matching export in "([^"]+)" for import "([^"]+)"/g
  const missing = []
  let match
  while ((match = exportRe.exec(output)) !== null) {
    missing.push({ path: join(ROOT, match[1]), name: match[2] })
  }
  return missing
}

function stubPathFor({ mod, importer }) {
  const cleanMod = mod.replace(/^\.\//, '')
  if (mod.startsWith('.') && importer) {
    return join(dirname(importerToBuildPath(importer)), mod)
  }
  if (mod.startsWith('@')) {
    const [scope, pkg, ...rest] = mod.split('/')
    return join(BUILD, 'node_modules', scope, pkg, rest.length ? rest.join('/') : 'index.js')
  }
  const [pkg, ...rest] = cleanMod.split('/')
  return join(BUILD, 'node_modules', pkg, rest.length ? rest.join('/') : 'index.js')
}

function safeExportName(path) {
  const base = path.split(/[\\/]/).pop().replace(/\.[tj]sx?$/, '')
  let name = base.replace(/[^a-zA-Z0-9_$]/g, '_') || 'stub'
  if (!/^[a-zA-Z_$]/.test(name)) name = `stub_${name}`
  return name
}

async function createStub(path) {
  await mkdir(dirname(path), { recursive: true })
  if (await exists(path)) return false

  if (path.endsWith('.json')) {
    await writeFile(path, '{}', 'utf8')
    return true
  }
  if (/\.(txt|md)$/.test(path)) {
    await writeFile(path, '', 'utf8')
    return true
  }
  if (/\.[tj]sx?$/.test(path)) {
    const name = safeExportName(path)
    await writeFile(
      path,
      `// Auto-generated build stub\nconst ${name} = Object.assign([], { enabled: false })\nexport { ${name} }\nexport default ${name}\n`,
      'utf8',
    )
    if (path.includes(`${BUILD}${process.platform === 'win32' ? '\\' : '/'}node_modules`)) {
      const pkgDir = path.endsWith('index.js') ? dirname(path) : null
      if (pkgDir) {
        await writeFile(
          join(pkgDir, 'package.json'),
          JSON.stringify({ type: 'module', main: 'index.js' }, null, 2),
          'utf8',
        )
      }
    }
    return true
  }
  return false
}

async function addMissingExport(path, name) {
  if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name)) return false
  if (!(await exists(path))) return false
  const source = await readFile(path, 'utf8')
  const namedExport = new RegExp(`export\\s+(const|function|class)\\s+${name}\\b`)
  const exportList = new RegExp(`export\\s*\\{[^}]*\\b${name}\\b[^}]*\\}`)
  if (namedExport.test(source) || exportList.test(source)) return false
  await writeFile(
    path,
    `${source}\nexport const ${name} = Object.assign([], { enabled: false })\n`,
    'utf8',
  )
  return true
}

async function prepareBuildSource() {
  await rm(BUILD, { recursive: true, force: true })
  await mkdir(BUILD, { recursive: true })
  await cp(join(ROOT, 'src'), join(BUILD, 'src'), { recursive: true })
  console.log('OK Phase 1: copied src/ to build-src/')

  const macros = {
    'MACRO.VERSION': `'${VERSION}'`,
    'MACRO.BUILD_TIME': `''`,
    'MACRO.FEEDBACK_CHANNEL': `'https://github.com/anthropics/claude-code/issues'`,
    'MACRO.ISSUES_EXPLAINER': `'https://github.com/anthropics/claude-code/issues/new/choose'`,
    'MACRO.FEEDBACK_CHANNEL_URL': `'https://github.com/anthropics/claude-code/issues'`,
    'MACRO.ISSUES_EXPLAINER_URL': `'https://github.com/anthropics/claude-code/issues/new/choose'`,
    'MACRO.NATIVE_PACKAGE_URL': `'${PACKAGE_NAME}'`,
    'MACRO.PACKAGE_URL': `'${PACKAGE_NAME}'`,
    'MACRO.VERSION_CHANGELOG': `''`,
  }

  let transformed = 0
  for await (const file of walk(join(BUILD, 'src'))) {
    if (!file.match(/\.[tj]sx?$/)) continue
    let source = await readFile(file, 'utf8')
    let changed = false

    if (/\bfeature\s*\(\s*['"][^'"]+['"]\s*,?\s*\)/.test(source)) {
      source = source.replace(
        /\bfeature\s*\(\s*['"][^'"]+['"]\s*,?\s*\)/g,
        'false',
      )
      changed = true
    }

    for (const [key, value] of Object.entries(macros).sort(
      ([a], [b]) => b.length - a.length,
    )) {
      if (source.includes(key)) {
        source = source.replaceAll(key, value)
        changed = true
      }
    }

    if (source.includes("from 'bun:bundle'") || source.includes('from "bun:bundle"')) {
      source = source.replace(
        /import\s*\{\s*feature\s*\}\s*from\s*['"]bun:bundle['"];?\n?/g,
        '// feature() replaced with false at build time\n',
      )
      changed = true
    }

    if (source.includes("global.d.ts'") || source.includes('global.d.ts"')) {
      source = source.replace(/import\s*['"][.\/]*global\.d\.ts['"];?\n?/g, '')
      changed = true
    }

    if (changed) {
      await writeFile(file, source, 'utf8')
      transformed++
    }
  }
  console.log(`OK Phase 2: transformed ${transformed} files`)

  await writeFile(
    ENTRY,
    `#!/usr/bin/env node\nimport './src/entrypoints/cli.tsx'\n`,
    'utf8',
  )
  await writeFile(
    join(BUILD, 'tsconfig.json'),
    JSON.stringify(
      {
        compilerOptions: {
          baseUrl: '.',
          paths: {
            'src/*': ['src/*'],
          },
        },
      },
      null,
      2,
    ),
    'utf8',
  )
  console.log('OK Phase 3: created entry wrapper')
}

function runEsbuild() {
  try {
    execFileSync(process.execPath, [
      ESBUILD_BIN,
      ENTRY,
      '--bundle',
      '--platform=node',
      '--target=node18',
      '--format=esm',
      `--outfile=${OUT_FILE}`,
      `--tsconfig=${join(BUILD, 'tsconfig.json')}`,
      '--banner:js=import { createRequire as __ccCreateRequire } from "node:module"; const require = __ccCreateRequire(import.meta.url);',
      '--external:bun:*',
      '--loader:.md=text',
      '--loader:.txt=text',
      '--allow-overwrite',
      '--log-level=error',
      '--log-limit=0',
      '--sourcemap',
    ], {
      cwd: ROOT,
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    return { ok: true, output: '' }
  } catch (error) {
    const output =
      (error.stderr?.toString() || '') +
      (error.stdout?.toString() || '') +
      (Array.isArray(error.output)
        ? error.output.map(part => part?.toString?.() || '').join('')
        : '') +
      (error.message ? `\n${error.message}` : '')
    return { ok: false, output }
  }
}

await ensureEsbuild()
await mkdir(OUT_DIR, { recursive: true })
await prepareBuildSource()

const maxRounds = 8
let succeeded = false
for (let round = 1; round <= maxRounds; round++) {
  console.log(`\nPhase 4 round ${round}/${maxRounds}: bundling...`)
  const result = runEsbuild()
  if (result.ok) {
    succeeded = true
    break
  }

  const missing = parseMissingModules(result.output)
  const missingExports = parseMissingExports(result.output)
  if (missing.length === 0 && missingExports.length === 0) {
    console.log('Unrecoverable errors:')
    result.output
      .split('\n')
      .filter(line => line.includes('ERROR') || line.trim())
      .slice(0, 20)
      .forEach(line => console.log(`  ${line}`))
    break
  }

  const stubTargets = new Map()
  for (const item of missing) {
    const path = stubPathFor(item)
    const items = stubTargets.get(path) ?? []
    items.push(item)
    stubTargets.set(path, items)
  }

  let created = 0
  const createdDetails = []
  for (const [path, items] of stubTargets) {
    if (await createStub(path)) {
      created++
      const sample = items[0]
      createdDetails.push(
        `${sample.mod}${sample.importer ? ` from ${sample.importer}` : ''} -> ${path}`,
      )
    }
  }
  let addedExports = 0
  for (const item of missingExports) {
    if (await addMissingExport(item.path, item.name)) addedExports++
  }
  console.log(
    `  Found ${missing.length} missing modules, created ${created} stubs, added ${addedExports} exports`,
  )
  for (const detail of createdDetails.slice(0, 5)) {
    console.log(`    stubbed: ${detail}`)
  }
  if (created === 0 && addedExports === 0) {
    console.log('  No new stubs or exports were created; stopping to avoid a retry loop.')
    break
  }
}

if (!succeeded) {
  console.error('\nBuild failed. The transformed source is in build-src/.')
  process.exit(1)
}

const banner = `#!/usr/bin/env node\n// DeepSeek Code v${VERSION} (built from source)\n`
const output = await readFile(OUT_FILE, 'utf8')
if (!output.startsWith('#!/usr/bin/env node')) {
  await writeFile(OUT_FILE, banner + output, 'utf8')
}

const size = (await stat(OUT_FILE)).size
console.log(`\nBuild succeeded: ${OUT_FILE}`)
console.log(`Size: ${(size / 1024 / 1024).toFixed(1)}MB`)
console.log(`Usage: node ${OUT_FILE} --version`)
