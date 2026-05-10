// Width-aware truncation/wrapping — needs ink/stringWidth (not leaf-safe).

import { stringWidth } from '../ink/stringWidth.js'
import { getGraphemeSegmenter } from './intl.js'

const ELLIPSIS = '…'
const ELLIPSIS_WIDTH = stringWidth(ELLIPSIS)

function ellipsisForWidth(maxWidth: number): string {
  return maxWidth >= ELLIPSIS_WIDTH ? ELLIPSIS : ''
}

/**
 * Truncates a file path in the middle to preserve both directory context and filename.
 * Width-aware: uses stringWidth() for correct CJK/emoji measurement.
 * For example: "src/components/deeply/nested/folder/MyComponent.tsx" becomes
 * "src/components/…/MyComponent.tsx" when maxLength is 30.
 *
 * @param path The file path to truncate
 * @param maxLength Maximum display width of the result in terminal columns (must be > 0)
 * @returns The truncated path, or original if it fits within maxLength
 */
export function truncatePathMiddle(path: string, maxLength: number): string {
  // No truncation needed
  if (stringWidth(path) <= maxLength) {
    return path
  }

  // Handle edge case of very small or non-positive maxLength
  if (maxLength <= 0) {
    return ''
  }

  // Need at least room for an ellipsis plus something meaningful
  if (maxLength < ELLIPSIS_WIDTH + 4) {
    return truncateToWidth(path, maxLength)
  }

  // Find the filename (last path segment)
  const lastSlash = path.lastIndexOf('/')
  // Include the leading slash in filename for display
  const filename = lastSlash >= 0 ? path.slice(lastSlash) : path
  const directory = lastSlash >= 0 ? path.slice(0, lastSlash) : ''
  const filenameWidth = stringWidth(filename)

  // If filename alone is too long, truncate from start
  if (filenameWidth >= maxLength - ELLIPSIS_WIDTH) {
    return truncateStartToWidth(path, maxLength)
  }

  // Calculate space available for directory prefix
  // Result format: directory + ellipsis + filename
  const availableForDir = maxLength - ELLIPSIS_WIDTH - filenameWidth

  if (availableForDir <= 0) {
    // No room for directory, just show filename (truncated if needed)
    return truncateStartToWidth(filename, maxLength)
  }

  // Truncate directory and combine
  const truncatedDir = truncateToWidthNoEllipsis(directory, availableForDir)
  return truncatedDir + ELLIPSIS + filename
}

/**
 * Truncates a string to fit within a maximum display width, measured in terminal columns.
 * Splits on grapheme boundaries to avoid breaking emoji or surrogate pairs.
 * Appends '…' when truncation occurs.
 */
export function truncateToWidth(text: string, maxWidth: number): string {
  if (stringWidth(text) <= maxWidth) return text
  if (maxWidth <= 0) return ''
  if (maxWidth <= ELLIPSIS_WIDTH) return ellipsisForWidth(maxWidth)
  let width = 0
  let result = ''
  for (const { segment } of getGraphemeSegmenter().segment(text)) {
    const segWidth = stringWidth(segment)
    if (width + segWidth > maxWidth - ELLIPSIS_WIDTH) break
    result += segment
    width += segWidth
  }
  return result + ELLIPSIS
}

/**
 * Truncates from the start of a string, keeping the tail end.
 * Prepends '…' when truncation occurs.
 * Width-aware and grapheme-safe.
 */
export function truncateStartToWidth(text: string, maxWidth: number): string {
  if (stringWidth(text) <= maxWidth) return text
  if (maxWidth <= 0) return ''
  if (maxWidth <= ELLIPSIS_WIDTH) return ellipsisForWidth(maxWidth)
  const segments = [...getGraphemeSegmenter().segment(text)]
  let width = 0
  let startIdx = segments.length
  for (let i = segments.length - 1; i >= 0; i--) {
    const segWidth = stringWidth(segments[i]!.segment)
    if (width + segWidth > maxWidth - ELLIPSIS_WIDTH) break
    width += segWidth
    startIdx = i
  }
  return (
    ELLIPSIS +
    segments
      .slice(startIdx)
      .map(s => s.segment)
      .join('')
  )
}

/**
 * Truncates a string to fit within a maximum display width, without appending an ellipsis.
 * Useful when the caller adds its own separator (e.g. middle-truncation with '…' between parts).
 * Width-aware and grapheme-safe.
 */
export function truncateToWidthNoEllipsis(
  text: string,
  maxWidth: number,
): string {
  if (stringWidth(text) <= maxWidth) return text
  if (maxWidth <= 0) return ''
  let width = 0
  let result = ''
  for (const { segment } of getGraphemeSegmenter().segment(text)) {
    const segWidth = stringWidth(segment)
    if (width + segWidth > maxWidth) break
    result += segment
    width += segWidth
  }
  return result
}

/**
 * Truncates a string to fit within a maximum display width (terminal columns),
 * splitting on grapheme boundaries to avoid breaking emoji, CJK, or surrogate pairs.
 * Appends '…' when truncation occurs.
 * @param str The string to truncate
 * @param maxWidth Maximum display width in terminal columns
 * @param singleLine If true, also truncates at the first newline
 * @returns The truncated string with ellipsis if needed
 */
export function truncate(
  str: string,
  maxWidth: number,
  singleLine: boolean = false,
): string {
  let result = str

  // If singleLine is true, truncate at first newline
  if (singleLine) {
    const firstNewline = str.indexOf('\n')
    if (firstNewline !== -1) {
      result = str.substring(0, firstNewline)
      // Ensure total width including ellipsis doesn't exceed maxWidth
      if (stringWidth(result) + ELLIPSIS_WIDTH > maxWidth) {
        return truncateToWidth(result, maxWidth)
      }
      return `${result}${ELLIPSIS}`
    }
  }

  if (stringWidth(result) <= maxWidth) {
    return result
  }
  return truncateToWidth(result, maxWidth)
}

export function wrapText(text: string, width: number): string[] {
  const lines: string[] = []
  let currentLine = ''
  let currentWidth = 0

  for (const { segment } of getGraphemeSegmenter().segment(text)) {
    const segWidth = stringWidth(segment)
    if (currentWidth + segWidth <= width) {
      currentLine += segment
      currentWidth += segWidth
    } else {
      if (currentLine) lines.push(currentLine)
      currentLine = segment
      currentWidth = segWidth
    }
  }

  if (currentLine) lines.push(currentLine)
  return lines
}
