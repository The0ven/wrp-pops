# Keeps http://localhost:3000 tunnelled to the hosted tracker. Run at logon by the
# "WRP Tracker Tunnel" scheduled task (see deploy/install-local-tunnel.ps1).
$ErrorActionPreference = "Continue"
$ssh = "$env:WINDIR\System32\OpenSSH\ssh.exe"
$key = "$env:USERPROFILE\.ssh\codex-93.127.216.198\id_ed25519"
$log = "$env:LOCALAPPDATA\wrp-tracker-tunnel.log"

function Write-Log($message) {
    if ((Test-Path $log) -and (Get-Item $log).Length -gt 1MB) { Remove-Item $log -Force }
    Add-Content -Path $log -Value ("{0:u} {1}" -f (Get-Date), $message)
}

while ($true) {
    Write-Log "connecting"
    & $ssh -N -o BatchMode=yes -o ExitOnForwardFailure=yes -o ServerAliveInterval=30 `
        -o ServerAliveCountMax=3 -o IdentitiesOnly=yes -o ConnectTimeout=15 -i $key `
        -L 127.0.0.1:3000:127.0.0.1:3000 root@93.127.216.198 2>&1 |
        ForEach-Object { Write-Log "ssh: $_" }
    Write-Log "tunnel closed (exit $LASTEXITCODE), retrying in 15s"
    Start-Sleep -Seconds 15
}
