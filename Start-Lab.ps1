$ErrorActionPreference = 'Stop'
$labPython = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'
$labEntry = Join-Path $PSScriptRoot 'start-lab.py'
if (Test-Path -LiteralPath $labPython) { & $labPython $labEntry }
elseif (Get-Command py -ErrorAction SilentlyContinue) { & py -3 $labEntry }
else { & (Get-Command python -ErrorAction Stop).Source $labEntry }
