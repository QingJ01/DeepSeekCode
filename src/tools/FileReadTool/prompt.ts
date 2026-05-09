import { isPDFSupported } from '../../utils/pdfUtils.js'
import { getAPIProvider } from '../../utils/model/providers.js'
import { BASH_TOOL_NAME } from '../BashTool/toolName.js'

// Use a string constant for tool names to avoid circular dependencies
export const FILE_READ_TOOL_NAME = 'Read'

export const FILE_UNCHANGED_STUB =
  'File unchanged since last read. The content from the earlier Read tool_result in this conversation is still current — refer to that instead of re-reading.'

export const MAX_LINES_TO_READ = 2000

export const DESCRIPTION = 'Read a file from the local filesystem.'

export const LINE_FORMAT_INSTRUCTION =
  '- Results are returned using cat -n format, with line numbers starting at 1'

export const OFFSET_INSTRUCTION_DEFAULT =
  "- You can optionally specify a line offset and limit (especially handy for long files), but it's recommended to read the whole file by not providing these parameters"

export const OFFSET_INSTRUCTION_TARGETED =
  '- When you already know which part of the file you need, only read that part. This can be important for larger files.'

/**
 * Renders the Read tool prompt template.  The caller (FileReadTool) supplies
 * the runtime-computed parts.
 */
export function renderPromptTemplate(
  lineFormat: string,
  maxSizeInstruction: string,
  offsetInstruction: string,
): string {
  const isDeepSeek = getAPIProvider() === 'deepseek'
  const mediaGuidance = isDeepSeek
    ? '- DeepSeek Code can read text/code files, notebooks, Word .docx documents, and text-extractable PDFs. It does not have native image, screenshot, scanned-PDF, or PDF visual understanding through the configured DeepSeek API. Do not claim to inspect visual/image contents unless OCR/text extraction has provided text.'
    : `- This tool allows Claude Code to read images (eg PNG, JPG, etc). When reading an image file the contents are presented visually as Claude Code is a multimodal LLM.${
        isPDFSupported()
          ? '\n- This tool can read PDF files (.pdf). For large PDFs (more than 10 pages), you MUST provide the pages parameter to read specific page ranges (e.g., pages: "1-5"). Reading a large PDF without the pages parameter will fail. Maximum 20 pages per request.'
          : ''
      }`
  const screenshotGuidance = isDeepSeek
    ? 'In DeepSeek mode, do not claim visual understanding of screenshots; ask for OCR/text or a vision-capable tool instead.'
    : 'If the user provides a path to a screenshot, ALWAYS use this tool to view the file at the path. This tool will work with all temporary file paths.'

  return `Reads a file from the local filesystem. You can access any file directly by using this tool.
Assume this tool is able to read all files on the machine. If the User provides a path to a file assume that path is valid. It is okay to read a file that does not exist; an error will be returned.

Usage:
- The file_path parameter must be an absolute path, not a relative path
- By default, it reads up to ${MAX_LINES_TO_READ} lines starting from the beginning of the file${maxSizeInstruction}
${offsetInstruction}
${lineFormat}
${mediaGuidance}
- This tool can read Jupyter notebooks (.ipynb files) and returns cells and textual outputs.${
    isDeepSeek
      ? ' Image visualizations inside notebooks are not natively understood in DeepSeek mode unless converted to text.'
      : ' It can also include visualizations.'
  }
- This tool can only read files, not directories. To read a directory, use an ls command via the ${BASH_TOOL_NAME} tool.
- You will regularly be asked to read screenshots. ${screenshotGuidance}
- If you read a file that exists but has empty contents you will receive a system reminder warning in place of file contents.`
}
