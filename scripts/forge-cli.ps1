$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
if (Test-Path 'D:\nodejs') {
  $env:Path = "D:\nodejs;$env:Path"
}
$forgeCmd = Join-Path $repoRoot 'node_modules\.bin\forge.cmd'
if (-not (Test-Path $forgeCmd)) {
  throw "Local Forge CLI not found at $forgeCmd. Run 'npm install' first."
}
Push-Location $repoRoot
try {
  & $forgeCmd @args
  exit $LASTEXITCODE
} finally {
  Pop-Location
}
