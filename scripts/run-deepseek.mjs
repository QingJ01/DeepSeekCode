#!/usr/bin/env node

import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import { homedir } from 'node:os'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const rootDir = join(scriptDir, '..')
const cliPath = join(rootDir, 'dist', 'cli.js')

process.title = 'DeepSeek Code'
if (process.stdout.isTTY) {
  process.stdout.write('\x1b]0;DeepSeek Code\x07')
}

function readSecret(prompt) {
  return new Promise(resolve => {
    let value = ''
    process.stdout.write(prompt)
    process.stdin.resume()
    process.stdin.setEncoding('utf8')

    const onData = chunk => {
      value += chunk
      if (value.includes('\r') || value.includes('\n')) {
        process.stdin.pause()
        process.stdin.off('data', onData)
        resolve(value.split(/\r?\n/)[0].trim())
      }
    }

    process.stdin.on('data', onData)
  })
}

const env = { ...process.env }
env.CLAUDE_CODE_USE_DEEPSEEK = '1'
env.DEEPSEEK_BASE_URL ||= 'https://api.deepseek.com/anthropic'
env.DEEPSEEK_MODEL ||= 'deepseek-v4-pro'
env.DEEPSEEK_CODE_CONFIG_DIR ||= join(homedir(), '.deepseek-code')
env.CLAUDE_CONFIG_DIR = env.DEEPSEEK_CODE_CONFIG_DIR
env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC ||= '1'
env.CLAUDE_CODE_EFFORT_LEVEL ||= 'max'

mkdirSync(env.DEEPSEEK_CODE_CONFIG_DIR, { recursive: true })

const args = process.argv.slice(2)
const noApiKeyArgs = new Set(['--help', '-h', '--version', '-v', '-V', 'help'])
const shouldPromptForApiKey = !args.some(arg => noApiKeyArgs.has(arg))

if (!env.DEEPSEEK_API_KEY && shouldPromptForApiKey) {
  env.DEEPSEEK_API_KEY = await readSecret('Enter your DeepSeek API key: ')
}

if (shouldPromptForApiKey && !env.DEEPSEEK_API_KEY.trim()) {
  console.error('DeepSeek API key is required.')
  process.exit(1)
}

const child = spawn(process.execPath, [cliPath, ...args], {
  cwd: process.cwd(),
  env,
  stdio: 'inherit',
})

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
  }
  process.exit(code ?? 1)
})
