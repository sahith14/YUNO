# =============================================================================
# yuno-start.ps1
# One-shot script: starts Cloudflare tunnels for the 3 YUNO services, detects
# the freshly-issued public URLs, writes them into .env, and starts dev mode.
#
# Usage: from the project root, run:  ./yuno-start.ps1
# =============================================================================

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

Write-Host "`n[YUNO] Bootstrapping..." -ForegroundColor Cyan

# 1. Kill any leftover processes from a previous run
Write-Host "[YUNO] Stopping any previous node + cloudflared processes..."
Get-Process -Name node, cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# 2. Locate cloudflared
$cf = (Get-Command cloudflared -ErrorAction SilentlyContinue).Source
if (-not $cf) { $cf = "C:\Program Files (x86)\cloudflared\cloudflared.exe" }
if (-not (Test-Path $cf)) {
    Write-Host "[YUNO] cloudflared not found. Install with: winget install --id Cloudflare.cloudflared" -ForegroundColor Red
    exit 1
}

# 3. Spawn three tunnels and capture their URLs
function Start-Tunnel {
    param([int]$Port, [string]$LogFile)
    "" | Out-File $LogFile -Encoding utf8
    $proc = Start-Process -WindowStyle Hidden -FilePath $cf `
        -ArgumentList "tunnel", "--url", "http://localhost:$Port", "--logfile", $LogFile `
        -PassThru
    return $proc
}

Write-Host "[YUNO] Starting Cloudflare tunnels..."
$webProc = Start-Tunnel -Port 3000 -LogFile ".tunnel-web.log"
$apiProc = Start-Tunnel -Port 4000 -LogFile ".tunnel-api.log"
$sigProc = Start-Tunnel -Port 4001 -LogFile ".tunnel-sig.log"
Write-Host "[YUNO]   Web tunnel PID:       $($webProc.Id)"
Write-Host "[YUNO]   API tunnel PID:       $($apiProc.Id)"
Write-Host "[YUNO]   Signaling tunnel PID: $($sigProc.Id)"

# 4. Wait for URLs to materialize, parse them out
function Wait-ForTunnelUrl {
    param([string]$LogFile, [int]$TimeoutSec = 30)
    $end = (Get-Date).AddSeconds($TimeoutSec)
    while ((Get-Date) -lt $end) {
        $hit = Get-Content $LogFile -ErrorAction SilentlyContinue |
               Select-String -Pattern "https://[a-z0-9-]+\.trycloudflare\.com" |
               Select-Object -First 1
        if ($hit) {
            return [regex]::Match($hit.Line, "https://[a-z0-9-]+\.trycloudflare\.com").Value
        }
        Start-Sleep -Milliseconds 500
    }
    return $null
}

Write-Host "[YUNO] Waiting for tunnel URLs (up to 30s each)..."
$WEB_URL = Wait-ForTunnelUrl -LogFile ".tunnel-web.log"
$API_URL = Wait-ForTunnelUrl -LogFile ".tunnel-api.log"
$SIG_URL = Wait-ForTunnelUrl -LogFile ".tunnel-sig.log"

if (-not ($WEB_URL -and $API_URL -and $SIG_URL)) {
    Write-Host "[YUNO] One or more tunnels failed to come up. Check the .tunnel-*.log files." -ForegroundColor Red
    exit 1
}

# WS URL is the same as SIG_URL but with wss:// scheme
$WSS_URL = $SIG_URL -replace "^https://", "wss://"

Write-Host ""
Write-Host "[YUNO] === Public URLs ===" -ForegroundColor Green
Write-Host "[YUNO]   Web:        $WEB_URL"
Write-Host "[YUNO]   API:        $API_URL"
Write-Host "[YUNO]   Signaling:  $WSS_URL"
Write-Host ""

# 5. Update .env with fresh public URLs
Write-Host "[YUNO] Updating .env..."
$envContent = Get-Content .env -Raw
$envContent = $envContent -replace "NEXT_PUBLIC_API_URL=.*",       "NEXT_PUBLIC_API_URL=$API_URL"
$envContent = $envContent -replace "NEXT_PUBLIC_SIGNALING_URL=.*", "NEXT_PUBLIC_SIGNALING_URL=$WSS_URL"
$envContent = $envContent -replace "NEXT_PUBLIC_APP_URL=.*",       "NEXT_PUBLIC_APP_URL=$WEB_URL"
Set-Content -Path .env -Value $envContent -NoNewline

# 6. Start dev servers
Write-Host "[YUNO] Starting dev servers (web + api + signaling) in background..."
"" | Out-File .all.log -Encoding utf8
$devProc = Start-Process -WindowStyle Hidden -FilePath "cmd.exe" `
    -ArgumentList "/c", "pnpm dev > .all.log 2>&1" -PassThru
Write-Host "[YUNO]   Dev master PID: $($devProc.Id)"
Write-Host "[YUNO] Waiting 25s for services to boot..."
Start-Sleep -Seconds 25

# 7. Health check
Write-Host ""
Write-Host "[YUNO] === Health ===" -ForegroundColor Cyan
$results = @(
    @{ name = "Web";       url = $WEB_URL },
    @{ name = "API";       url = "$API_URL/healthz" }
)
foreach ($r in $results) {
    try {
        $resp = Invoke-WebRequest -Uri $r.url -UseBasicParsing -TimeoutSec 8
        Write-Host ("[YUNO]   {0,-10} {1} OK ({2} bytes)" -f $r.name, $resp.StatusCode, $resp.Content.Length) -ForegroundColor Green
    } catch {
        Write-Host ("[YUNO]   {0,-10} FAIL: {1}" -f $r.name, $_.Exception.Message) -ForegroundColor Red
    }
}

# 8. Final report
Write-Host ""
Write-Host "[YUNO] ✅ READY" -ForegroundColor Green
Write-Host ""
Write-Host "Open this URL on any phone or device with internet:" -ForegroundColor Yellow
Write-Host ""
Write-Host "    $WEB_URL" -ForegroundColor White
Write-Host ""
Write-Host "Tail logs:        Get-Content .all.log -Tail 50 -Wait"
Write-Host "Stop everything:  Get-Process node, cloudflared | Stop-Process -Force"
Write-Host ""
