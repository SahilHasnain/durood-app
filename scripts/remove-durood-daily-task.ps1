$ErrorActionPreference = 'Stop'
$TaskName = 'Durood Stories Daily Upload'
Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
Write-Host "Removed scheduled task '$TaskName' if it existed."
