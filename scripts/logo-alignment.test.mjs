import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { build } from 'esbuild'

const root = process.cwd()
const read = path => readFileSync(join(root, path), 'utf8')

const logoUtils = read('src/utils/logoV2Utils.ts')
const logoV2 = read('src/components/LogoV2/LogoV2.tsx')
const stringWidth = read('src/ink/stringWidth.ts')
const feedColumn = read('src/components/LogoV2/FeedColumn.tsx')

assert.match(
  logoUtils,
  /const BORDER_PADDING = OUTER_BORDER_WIDTH \+ TERMINAL_SAFE_MARGIN\b/,
  'LogoV2 outer border accounting should include one-cell borders plus terminal safe margin',
)
assert.match(
  logoUtils,
  /const DIVIDER_WIDTH = 1\b/,
  'LogoV2 vertical divider accounting must match Ink render-border one-cell borders',
)
assert.doesNotMatch(
  logoUtils,
  /DIVIDER_WIDTH\s*=\s*isCJKWidth\s*\?\s*2\s*:\s*1/,
  'LogoV2 divider width must not follow ambiguous CJK width',
)
assert.match(
  stringWidth,
  /NARROW_AMBIGUOUS_CHARS/,
  'stringWidth should preserve terminal UI glyphs as narrow even when ambiguous CJK width is enabled',
)
assert.match(
  stringWidth,
  /\(codePoint >= 0x2500 && codePoint <= 0x257f\)/,
  'stringWidth should keep box drawing glyphs narrow for Ink borders',
)
assert.doesNotMatch(
  stringWidth,
  /0x2580[\s\S]*0x259f[\s\S]*isNarrowAmbiguous/,
  'stringWidth must let block element glyphs follow CJK terminal width so whale art aligns with dividers',
)
assert.doesNotMatch(
  stringWidth,
  /0x00b7|0x2022|0x2026/,
  'stringWidth must let middle-dot, bullet, and ellipsis follow CJK terminal width so truncation does not overflow borders',
)
assert.match(
  logoV2,
  /const\s*\{[\s\S]*leftWidth[\s\S]*rightWidth[\s\S]*totalWidth[\s\S]*\}\s*=\s*calculateLayoutDimensions/,
  'LogoV2 should read totalWidth from calculateLayoutDimensions',
)
assert.match(
  logoV2,
  /<T1[^>]*width=\{totalWidth\}/,
  'LogoV2 outer border box should use the calculated safe totalWidth',
)
assert.match(
  logoUtils,
  /OUTER_BORDER_WIDTH[\s\S]*HORIZONTAL_GAP_WIDTH[\s\S]*availableForRight/,
  'LogoV2 layout should reserve outer border width and both horizontal gaps before assigning rightWidth',
)
assert.match(
  logoUtils,
  /const ellipsisWidth = stringWidth\(ellipsis\)/,
  'LogoV2 path truncation should reserve the rendered width of ellipsis in CJK terminals',
)
assert.doesNotMatch(
  logoUtils,
  /ellipsisWidth\s*=\s*1\b/,
  'LogoV2 path truncation must not assume ellipsis is one cell wide',
)
assert.match(
  logoUtils,
  /const separatorWidth = stringWidth\(separator\)/,
  'LogoV2 model/billing separators should use rendered width instead of JS string length',
)
assert.doesNotMatch(
  logoUtils,
  /separator\.length/,
  'LogoV2 model/billing separators must not use JS string length for terminal layout',
)
assert.match(
  logoUtils,
  /const totalWidth = Math\.max\(0, columns - BORDER_PADDING\)/,
  'LogoV2 horizontal layout should keep the full border padding margin instead of drawing at the terminal edge',
)
assert.doesNotMatch(
  logoUtils,
  /const totalWidth = Math\.max\(0, columns - TERMINAL_SAFE_MARGIN\)/,
  'LogoV2 horizontal layout must not bypass BORDER_PADDING when sizing the outer border',
)
assert.match(
  feedColumn,
  /const actualWidth = Math\.max\(0, maxWidth\)/,
  'LogoV2 FeedColumn should fill the reserved right panel width so dividers align with the outer border',
)
assert.doesNotMatch(
  feedColumn,
  /Math\.min\(maxOfAllFeeds,\s*maxWidth\)/,
  'LogoV2 FeedColumn must not shrink to content width when the outer logo box is fixed width',
)

async function importBundled(entryPoint) {
  const result = await build({
    entryPoints: [entryPoint],
    bundle: true,
    write: false,
    platform: 'node',
    format: 'esm',
  })
  const source = result.outputFiles[0].text
  return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)
}

const previousCJKWidth = process.env.CJK_WIDTH
process.env.CJK_WIDTH = '1'
try {
  const { truncate, truncateStartToWidth, truncateToWidth } = await importBundled(
    'src/utils/truncate.ts',
  )
  assert.equal(
    truncateToWidth('abcdef', 5),
    'abc…',
    'truncateToWidth should reserve the full CJK width of the ellipsis',
  )
  assert.equal(
    truncateToWidth('你好abcdef', 6),
    '你好…',
    'truncateToWidth should not overflow when CJK text is followed by an ellipsis',
  )
  assert.equal(
    truncateStartToWidth('abcdef', 5),
    '…def',
    'truncateStartToWidth should reserve the full CJK width of the ellipsis',
  )
  assert.equal(
    truncate('abcdef', 5),
    'abc…',
    'truncate should use CJK-safe width-aware truncation',
  )
} finally {
  if (previousCJKWidth === undefined) {
    delete process.env.CJK_WIDTH
  } else {
    process.env.CJK_WIDTH = previousCJKWidth
  }
}
