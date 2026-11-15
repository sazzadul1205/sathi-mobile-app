# .kilo/setup-script.ps1
# Agent Manager setup — runs once per worktree before an agent session starts.
# Installs dependencies from the lockfile for reproducibility.

$ErrorActionPreference = 'Stop'
Write-Host "WORKTREE_PATH = $env:WORKTREE_PATH"
Write-Host "REPO_PATH     = $env:REPO_PATH"

Set-Location -LiteralPath $env:WORKTREE_PATH

# Install exact locked dependencies (worktrees start with no node_modules).
npm ci

if ($LASTEXITCODE -ne 0) { throw "npm ci failed with exit code $LASTEXITCODE" }

Write-Host 'Setup complete.'