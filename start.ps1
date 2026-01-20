#!/usr/bin/env pwsh
# Bloom - Development Server Startup Script
# Runs both Flask backend and React frontend concurrently

param(
    [switch]$Stop
)

if ($Stop) {
    Write-Host "🛑 Stopping Bloom Development Servers..." -ForegroundColor Red

    # Kill all Python and Node processes
    Stop-Process -Name "python" -Force -ErrorAction SilentlyContinue
    Stop-Process -Name "node" -Force -ErrorAction SilentlyContinue

    # Kill PowerShell windows with Bloom in their path
    Get-Process powershell -ErrorAction SilentlyContinue | ForEach-Object {
        try {
            $cmdLine = (Get-CimInstance Win32_Process -Filter "ProcessId = $($_.Id)").CommandLine
            if ($cmdLine -like "*Bloom*" -and $cmdLine -like "*run.py*") {
                Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
            }
            elseif ($cmdLine -like "*Bloom*frontend*" -and $cmdLine -like "*npm*") {
                Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
            }
        } catch {}
    }

    Write-Host "✓ All servers stopped and windows closed." -ForegroundColor Green
    Start-Sleep -Seconds 1
    exit
}

Write-Host "🌸 Starting Bloom Development Servers..." -ForegroundColor Magenta

# Kill any existing Python and npm processes to avoid port conflicts
Write-Host "`nCleaning up existing processes..." -ForegroundColor Yellow
Stop-Process -Name "python" -Force -ErrorAction SilentlyContinue
Stop-Process -Name "node" -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

# Get the script directory (Bloom folder)
$BloomDir = $PSScriptRoot
$VenvPath = Join-Path $BloomDir ".venv"

# Auto-detect local IP for mobile testing
$localIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -like "192.168.*" -or $_.IPAddress -like "10.*" } | Select-Object -First 1).IPAddress
$devMobileOrigins = ""
if ($localIP) {
    $devMobileOrigins = "http://${localIP}:3000,http://${localIP}:3001"
    Write-Host "🌐 Auto-detected LAN IP: $localIP" -ForegroundColor Yellow
}

# Create logs directory if it doesn't exist
$LogsDir = Join-Path $BloomDir "logs"
if (-not (Test-Path $LogsDir)) {
    New-Item -ItemType Directory -Path $LogsDir | Out-Null
}
$BackendLogFile = Join-Path $LogsDir "backend.log"

# Start Flask Backend (with logging to file)
Write-Host "`n🔧 Starting Flask Backend (Port 5000, Network Accessible)..." -ForegroundColor Cyan
Write-Host "   📝 Logs: $BackendLogFile" -ForegroundColor DarkGray
$backendJob = Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$BloomDir'; & '$VenvPath\Scripts\Activate.ps1'; `$env:PYTHONPATH='$BloomDir'; `$env:DEV_MOBILE_ORIGINS='$devMobileOrigins'; python run.py --host=0.0.0.0 2>&1 | Tee-Object -FilePath '$BackendLogFile'"
) -PassThru -WindowStyle Normal

Start-Sleep -Seconds 2

# Start React Frontend
Write-Host "⚛️  Starting React Frontend (Port 3000, Network Accessible)..." -ForegroundColor Green
$frontendJob = Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$BloomDir/frontend'; npm run dev -- --host"
) -PassThru -WindowStyle Normal

Write-Host "`n✓ Both servers are starting!" -ForegroundColor Green
Write-Host "   Backend:  http://localhost:5000 (also on network)" -ForegroundColor Cyan
Write-Host "   Frontend: http://localhost:3000 (check terminal for network URL)" -ForegroundColor Green
Write-Host ""
Write-Host "📱 For mobile access: Check frontend terminal for Network URL (e.g., http://192.168.x.x:3000)" -ForegroundColor Magenta
Write-Host "   Don't forget to set VITE_API_URL in frontend/.env.local to your computer's IP" -ForegroundColor Yellow
Write-Host ""
Write-Host "Close the terminal windows to stop the servers." -ForegroundColor Yellow
