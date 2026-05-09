import * as React from 'react'
import { Box, Text } from '../../ink.js'

export type ClawdPose = 'default' | 'arms-up' | 'look-left' | 'look-right'

type Props = {
  pose?: ClawdPose
}

const WHALE_ROWS: Record<ClawdPose, string[]> = {
  default: [
    '       ▄▄▄▄▄              ',
    '  ▄████████▄   ▄          ',
    ' ████████████▄▄█▘         ',
    ' ███●█████████            ',
    ' █▀▀▀▀▀▀▀▀▀▀█             ',
    ' █          █             ',
    '  ▀▄▄▄▄▄▄▄▄▄▀            ',
    '    ░░░░░░░░              ',
  ],
  'look-left': [
    '       ▄▄▄▄▄              ',
    '  ▄████████▄   ▄          ',
    ' ████████████▄▄█▘         ',
    ' ███◄█████████            ',
    ' █▀▀▀▀▀▀▀▀▀▀█             ',
    ' █          █             ',
    '  ▀▄▄▄▄▄▄▄▄▄▀            ',
    '    ░░░░░░░░              ',
  ],
  'look-right': [
    '       ▄▄▄▄▄              ',
    '  ▄████████▄   ▄          ',
    ' ████████████▄▄█▘         ',
    ' ███►█████████            ',
    ' █▀▀▀▀▀▀▀▀▀▀█             ',
    ' █          █             ',
    '  ▀▄▄▄▄▄▄▄▄▄▀            ',
    '    ░░░░░░░░              ',
  ],
  'arms-up': [
    '       ▄▄▄▄▄     ▄        ',
    '  ▄████████▄   ▄█         ',
    ' ████████████▄▄█▘         ',
    ' ███●█████████            ',
    ' █▀▀▀▀▀▀▀▀▀▀█             ',
    ' █          █             ',
    '  ▀▄▄▄▄▄▄▄▄▄▀            ',
    '    ░░░░░░░░              ',
  ],
}

const BODY_CHARS = new Set(['█', '▄', '▀', '▘'])
const EYE_CHARS = new Set(['●', '◄', '►'])

export function Clawd({ pose = 'default' }: Props = {}): React.ReactNode {
  return (
    <Box flexDirection="column">
      {WHALE_ROWS[pose].map((row, index) => (
        <Text key={index}>{renderBlueBlockRow(row)}</Text>
      ))}
    </Box>
  )
}

function renderBlueBlockRow(row: string): React.ReactNode {
  return Array.from(row).map((char, index) => {
    if (BODY_CHARS.has(char)) {
      return (
        <Text key={index} color="clawd_body">
          {char}
        </Text>
      )
    }

    if (EYE_CHARS.has(char)) {
      return (
        <Text key={index} color="clawd_background" backgroundColor="clawd_body">
          {char}
        </Text>
      )
    }

    if (char === '░') {
      return (
        <Text key={index} color="clawd_body" dimColor>
          {char}
        </Text>
      )
    }

    return <Text key={index}>{char}</Text>
  })
}
