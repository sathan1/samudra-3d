param(
  [Parameter(Mandatory=$true)][string]$Name,
  [Parameter(Mandatory=$true)][string]$Command,
  [string]$Phase = 'phase-02',
  [string]$WorkingDirectory = ''
)
$ErrorActionPreference = 'Continue'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
if (-not $WorkingDirectory) { $WorkingDirectory = $repoRoot }
$evidenceRoot = Join-Path $repoRoot "docs\evidence\$Phase"
if (-not (Test-Path -LiteralPath $evidenceRoot)) {
  New-Item -ItemType Directory -Path $evidenceRoot -Force | Out-Null
}
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss-fff'
$logPath = Join-Path $evidenceRoot "$stamp-$Name.txt"
Set-Location -LiteralPath $WorkingDirectory
@("Timestamp: $(Get-Date -Format o)", "Directory: $WorkingDirectory", "Command: $Command", "PowerShell: $($PSVersionTable.PSVersion)") | Out-File -LiteralPath $logPath -Encoding utf8
$global:LASTEXITCODE = 0
try {
  Invoke-Expression $Command 2>&1 | Tee-Object -FilePath $logPath -Append
  $commandExit = $LASTEXITCODE
} catch {
  $_ | Out-File -LiteralPath $logPath -Append -Encoding utf8
  $commandExit = 1
}
"Exit code: $commandExit" | Tee-Object -FilePath $logPath -Append
[pscustomobject]@{timestamp=$stamp; name=$Name; command=$Command; cwd=$WorkingDirectory; exitCode=$commandExit; evidence=[IO.Path]::GetFileName($logPath)} | ConvertTo-Json -Compress | Add-Content -LiteralPath (Join-Path $evidenceRoot 'commands.jsonl')
exit $commandExit
