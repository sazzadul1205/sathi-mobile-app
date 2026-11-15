# .kilo/run-script.ps1
# Agent Manager run — starts the Vite dev server for the selected context.
# Derives a deterministic port from the worktree path so parallel worktrees
# do not collide on 5173.

param(
  [string]$Port = ''
)

$ErrorActionPreference = 'Stop'

$workdir = if ($env:WORKTREE_PATH) { $env:WORKTREE_PATH } else { (Get-Location).Path }
Set-Location -LiteralPath $workdir

# Deterministic hash of the worktree path -> port in 5173..5272 (100 slots).
if (-not $Port) {
  $hash = 0
  foreach ($ch in $workdir.ToCharArray()) { $hash = (31 * $hash + [int]$ch) % 100 }
  $Port = 5173 + $hash
}

Write-Host "Starting Vite dev server on port $Port (workdir: $workdir)"

if (-not (Test-Path -LiteralPath (Join-Path $workdir 'node_modules'))) {
  Write-Host 'node_modules missing — run the setup script first (npm ci).'
  exit 1
}

npm run dev -- --port $Port --strictPort