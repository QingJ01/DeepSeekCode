$ErrorActionPreference = "Stop"

Set-Location -LiteralPath $PSScriptRoot

$configDir = $env:DEEPSEEK_CODE_CONFIG_DIR
if (-not $configDir) {
  $configDir = Join-Path $env:USERPROFILE ".deepseek-code"
}

$env:DEEPSEEK_CODE_CONFIG_DIR = $configDir
$env:CLAUDE_CONFIG_DIR = $configDir
New-Item -ItemType Directory -Force -Path $configDir | Out-Null

if (-not $env:DEEPSEEK_API_KEY) {
  $secureKey = Read-Host "Enter your DeepSeek API key" -AsSecureString
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureKey)
  try {
    $env:DEEPSEEK_API_KEY = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  }
}

$env:CLAUDE_CODE_USE_DEEPSEEK = "1"
$env:DEEPSEEK_BASE_URL = "https://api.deepseek.com/anthropic"

if (-not $env:DEEPSEEK_MODEL) {
  $env:DEEPSEEK_MODEL = "deepseek-v4-pro"
}

if (-not $env:CLAUDE_CODE_EFFORT_LEVEL) {
  $env:CLAUDE_CODE_EFFORT_LEVEL = "max"
}

node dist\cli.js
