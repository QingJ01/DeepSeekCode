#!/usr/bin/env node

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const rawTag =
  process.env.RELEASE_TAG ||
  process.env.GITHUB_REF_NAME ||
  process.argv[2] ||
  ''

const tag = rawTag.replace(/^refs\/tags\//, '')
const tagVersion = tag.replace(/^v/, '')

if (!tagVersion) {
  console.error(
    'Release tag is required. Set RELEASE_TAG or pass the tag as the first argument.',
  )
  process.exit(1)
}

if (tagVersion !== packageJson.version) {
  console.error(
    `Release tag ${tag} does not match package.json version ${packageJson.version}.`,
  )
  process.exit(1)
}

console.log(`Release tag ${tag} matches package.json version ${packageJson.version}.`)
