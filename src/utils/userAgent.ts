/**
 * User-Agent string helpers.
 *
 * Kept dependency-free so SDK-bundled code (bridge, cli/transports) can
 * import without pulling in auth.ts and its transitive dependency tree.
 */

export function getClaudeCodeUserAgent(): string {
  if (
    process.env.CLAUDE_CODE_USE_DEEPSEEK ||
    process.env.DEEPSEEK_API_KEY ||
    process.env.DEEPSEEK_BASE_URL
  ) {
    return `deepseek-code/${MACRO.VERSION}`
  }

  return `claude-code/${MACRO.VERSION}`
}
