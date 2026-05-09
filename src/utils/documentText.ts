import { readFile } from 'fs/promises'
import { createRequire } from 'module'
import { inflateSync } from 'zlib'
import { execFileNoThrow } from './execFileNoThrow.js'

const runtimeRequire = createRequire(import.meta.url)

export type ExtractedDocumentText = {
  content: string
  source: 'docx' | 'pdf-pdfjs' | 'pdf-pdftotext' | 'pdf-simple'
}

function decodeXmlEntities(text: string): string {
  return text.replace(/&(#x?[0-9a-fA-F]+|amp|lt|gt|quot|apos);/g, (_, entity) => {
    switch (entity) {
      case 'amp':
        return '&'
      case 'lt':
        return '<'
      case 'gt':
        return '>'
      case 'quot':
        return '"'
      case 'apos':
        return "'"
      default: {
        const raw = String(entity)
        const codePoint = raw.startsWith('#x')
          ? parseInt(raw.slice(2), 16)
          : raw.startsWith('#')
            ? parseInt(raw.slice(1), 10)
            : NaN
        return Number.isFinite(codePoint)
          ? String.fromCodePoint(codePoint)
          : `&${entity};`
      }
    }
  })
}

function textFromWordParagraph(xml: string): string {
  let text = ''
  const tokenPattern =
    /<w:t\b[^>]*>([\s\S]*?)<\/w:t>|<w:tab\b[^>]*\/>|<w:br\b[^>]*\/>|<w:cr\b[^>]*\/>/g
  let match: RegExpExecArray | null
  while ((match = tokenPattern.exec(xml)) !== null) {
    const token = match[0]
    if (token.startsWith('<w:t')) {
      text += decodeXmlEntities(match[1] ?? '')
    } else if (token.startsWith('<w:tab')) {
      text += '\t'
    } else {
      text += '\n'
    }
  }
  return text
}

function extractWordXmlText(xml: string): string {
  const paragraphs: string[] = []
  const paragraphPattern = /<w:p\b[\s\S]*?<\/w:p>/g
  let match: RegExpExecArray | null
  while ((match = paragraphPattern.exec(xml)) !== null) {
    paragraphs.push(textFromWordParagraph(match[0]))
  }

  if (paragraphs.length > 0) {
    return paragraphs.join('\n')
  }

  return textFromWordParagraph(xml)
}

function ensureUsefulText(content: string, filePath: string): string {
  const normalized = content
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim()

  if (!normalized) {
    throw new Error(
      `No extractable text was found in ${filePath}. It may be empty, scanned, or image-based.`,
    )
  }

  return normalized
}

export async function extractDocxText(
  filePath: string,
): Promise<ExtractedDocumentText> {
  const { unzipSync } = await import('fflate')
  const zipData = await readFile(filePath)
  const entries = unzipSync(new Uint8Array(zipData))

  const textParts: string[] = []
  const decoder = new TextDecoder('utf-8')
  const preferredEntries = [
    'word/document.xml',
    'word/footnotes.xml',
    'word/endnotes.xml',
  ]

  for (const name of preferredEntries) {
    const data = entries[name]
    if (!data) continue
    const text = extractWordXmlText(decoder.decode(data))
    if (text.trim()) textParts.push(text)
  }

  if (textParts.length === 0) {
    throw new Error(
      `No readable Word document text was found in ${filePath}. The .docx may be encrypted, corrupted, or not a standard Office Open XML document.`,
    )
  }

  return {
    content: ensureUsefulText(textParts.join('\n\n'), filePath),
    source: 'docx',
  }
}

export async function extractPDFText(
  filePath: string,
  pages?: { firstPage: number; lastPage: number },
): Promise<ExtractedDocumentText> {
  const fileBuffer = await readFile(filePath)
  try {
    const { PDFParse } = runtimeRequire('pdf-parse') as typeof import('pdf-parse')
    const parser = new PDFParse({ data: fileBuffer })
    try {
      const params: {
        first?: number
        last?: number
        pageJoiner?: string
      } = { pageJoiner: '\n' }
      if (pages && pages.lastPage !== Infinity) {
        params.first = pages.firstPage
        params.last = pages.lastPage
      }
      const result = await parser.getText(params)
      return {
        content: ensureUsefulText(result.text, filePath),
        source: 'pdf-pdfjs',
      }
    } finally {
      await parser.destroy()
    }
  } catch {
    // Fall back to local tools below. pdf-parse can fail on malformed PDFs or
    // native optional dependency issues; pdftotext often still succeeds.
  }

  const args = ['-layout', '-enc', 'UTF-8']
  if (pages) {
    args.push('-f', String(pages.firstPage))
    if (pages.lastPage !== Infinity) {
      args.push('-l', String(pages.lastPage))
    }
  }
  args.push(filePath, '-')

  const result = await execFileNoThrow('pdftotext', args, {
    timeout: 120_000,
    preserveOutputOnError: true,
    useCwd: false,
  })

  if (result.code === 0) {
    return {
      content: ensureUsefulText(result.stdout, filePath),
      source: 'pdf-pdftotext',
    }
  }

  const simpleFallback = tryExtractTextFromSimplePDFBuffer(fileBuffer)
  if (simpleFallback.trim()) {
    return {
      content: ensureUsefulText(simpleFallback, filePath),
      source: 'pdf-simple',
    }
  }

  if (!result.stderr && !result.stdout) {
    throw new Error(
      'PDF text extraction requires the `pdftotext` command from Poppler. Install Poppler or convert/OCR the PDF to text first.',
    )
  }

  const details = result.stderr || result.stdout || result.error || 'unknown error'
  throw new Error(`pdftotext failed while extracting PDF text: ${details}`)
}

export function tryExtractTextFromSimplePDFBuffer(buffer: Buffer): string {
  const raw = buffer.toString('latin1')
  const streamPattern = /<<(?:.|\n|\r)*?>>\s*stream\r?\n([\s\S]*?)\r?\nendstream/g
  const parts: string[] = []
  let match: RegExpExecArray | null

  while ((match = streamPattern.exec(raw)) !== null) {
    const dictionaryStart = raw.lastIndexOf('<<', match.index)
    const dictionary = raw.slice(dictionaryStart, match.index)
    const streamBytes = Buffer.from(match[1] ?? '', 'latin1')
    let textStream = ''
    try {
      textStream = dictionary.includes('/FlateDecode')
        ? inflateSync(streamBytes).toString('latin1')
        : streamBytes.toString('latin1')
    } catch {
      continue
    }

    for (const textMatch of textStream.matchAll(/\(([^()]*)\)\s*Tj/g)) {
      parts.push(
        textMatch[1]!
          .replace(/\\n/g, '\n')
          .replace(/\\r/g, '\n')
          .replace(/\\t/g, '\t')
          .replace(/\\([()\\])/g, '$1'),
      )
    }
  }

  return parts.join('\n')
}
