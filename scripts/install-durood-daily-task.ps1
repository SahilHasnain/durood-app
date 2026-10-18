param(
    [string]$PythonExe = (Get-Command python.exe -ErrorAction Stop).Source
)

$ErrorActionPreference = 'Stop'
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$Runner = Join-Path $PSScriptRoot 'daily-durood-upload.py'
$EnvFile = Join-Path $RepoRoot '.env.local'
$TokenFile = Join-Path $RepoRoot '.youtube-oauth-token.json'
$TaskName = 'Durood Stories Daily Upload'

if (-not (Test-Path $EnvFile)) {
    throw "Missing .env.local in $RepoRoot"
}
if (-not (Test-Path $TokenFile)) {
    throw "Missing YouTube OAuth token. Run: python scripts/upload-durood-story.py --authorize-only"
}
if (-not (Test-Path $PythonExe)) {
    throw "Python executable not found: $PythonExe"
}

$Action = New-ScheduledTaskAction `
    -Execute $PythonExe `
    -Argument "-u `"$Runner`"" `
    -WorkingDirectory $RepoRoot
$Trigger = New-ScheduledTaskTrigger -Daily -At '12:00AM'
$Settings = New-ScheduledTaskSettingsSet `
    -StartWhenAvailable `
    -WakeToRun `
    -MultipleInstances IgnoreNew `
    -ExecutionTimeLimit (New-TimeSpan -Hours 4)
$Principal = New-ScheduledTaskPrincipal `
    -UserId ([System.Security.Principal.WindowsIdentity]::GetCurrent().Name) `
    -LogonType Interactive `
    -RunLevel Limited

Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $Action `
    -Trigger $Trigger `
    -Settings $Settings `
    -Principal $Principal `
    -Description 'Generate and publicly upload the next Durood Stories manuscript entry daily at local midnight.' `
    -Force | Out-Null

Write-Host "Scheduled '$TaskName' daily at 12:00 AM local time."
Write-Host "Python: $PythonExe"
Write-Host "Repository: $RepoRoot"
