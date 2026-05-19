param(
  [string]$RepoName = "Lumorix-Dev/nulldistrict",
  [ValidateSet("private", "public")]
  [string]$Visibility = "private",
  [string]$Tag = "v0.1.0-beta.1"
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $root

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
  winget install --id GitHub.cli -e --source winget --accept-package-agreements --accept-source-agreements
  $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
}

try {
  gh auth status | Out-Null
} catch {
  Write-Host "GitHub login is required. A browser/device login will open now."
  gh auth login --hostname github.com --git-protocol https --web --scopes repo,workflow
}

if (-not (Test-Path ".git")) {
  git init -b main
}

$branch = git branch --show-current
if ($branch -ne "main") {
  git branch -M main
}

$dirty = git status --porcelain
if ($dirty) {
  Write-Host "There are uncommitted files. Commit them before creating a release:"
  git status --short
  exit 1
}

$hasOrigin = $true
$originUrl = git remote get-url origin 2>$null
if ($LASTEXITCODE -ne 0 -or -not $originUrl) {
  $hasOrigin = $false
}

if (-not $hasOrigin) {
  $visibilityFlag = if ($Visibility -eq "public") { "--public" } else { "--private" }
  gh repo create $RepoName --source . --remote origin --push $visibilityFlag
} else {
  git push -u origin main
}

$tagExists = $true
try {
  git rev-parse -q --verify "refs/tags/$Tag" | Out-Null
} catch {
  $tagExists = $false
}

if (-not $tagExists) {
  git tag $Tag
}

git push origin $Tag

Write-Host ""
Write-Host "Release workflow was triggered for $Tag."
Write-Host "Open GitHub > Releases after the workflow finishes and download the Windows setup exe."
gh run list --workflow release --limit 1
