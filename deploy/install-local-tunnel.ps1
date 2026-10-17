# Registers (or replaces) a logon task that keeps the tracker tunnel open on this PC.
# Remove it with: Unregister-ScheduledTask -TaskName "WRP Tracker Tunnel" -Confirm:$false
$script = Join-Path $PSScriptRoot "local-tunnel.ps1"
$action = New-ScheduledTaskAction -Execute "$env:WINDIR\System32\WindowsPowerShell\v1.0\powershell.exe" `
    -Argument "-NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$script`""
$trigger = New-ScheduledTaskTrigger -AtLogOn -User "$env:USERDOMAIN\$env:USERNAME"
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
    -ExecutionTimeLimit ([TimeSpan]::Zero) -MultipleInstances IgnoreNew `
    -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) -StartWhenAvailable
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Limited
Register-ScheduledTask -TaskName "WRP Tracker Tunnel" -Action $action -Trigger $trigger -Settings $settings `
    -Principal $principal -Description "SSH tunnel: http://localhost:3000 -> hosted WRP population tracker" -Force |
    Out-Null
Start-ScheduledTask -TaskName "WRP Tracker Tunnel"
Get-ScheduledTask -TaskName "WRP Tracker Tunnel" | Select-Object TaskName, State
