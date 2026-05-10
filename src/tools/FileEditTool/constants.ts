// In its own file to avoid circular dependencies
import { homedir } from 'os'
import { relative, sep } from 'path'
import {
  getClaudeConfigHomeDir,
  getProjectConfigDirName,
} from '../../utils/envUtils.js'

export const FILE_EDIT_TOOL_NAME = 'Edit'

function getGlobalConfigFolderPermissionPattern(): string {
  const home = homedir().normalize('NFC')
  const configHome = getClaudeConfigHomeDir()
  if (configHome === home || configHome.startsWith(home + sep)) {
    const relativeFromHome = relative(home, configHome).split(sep).join('/')
    return `~/${relativeFromHome}/**`
  }
  return `${configHome.split(sep).join('/')}/**`
}

// Permission pattern for granting session-level access to the project's config folder
export const CLAUDE_FOLDER_PERMISSION_PATTERN = `/${getProjectConfigDirName()}/**`

// Permission pattern for granting session-level access to the global config folder
export const GLOBAL_CLAUDE_FOLDER_PERMISSION_PATTERN =
  getGlobalConfigFolderPermissionPattern()

export const FILE_UNEXPECTEDLY_MODIFIED_ERROR =
  'File has been unexpectedly modified. Read it again before attempting to write it.'
