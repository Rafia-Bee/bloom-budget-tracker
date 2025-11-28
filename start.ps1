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

# Start Flask Backend
Write-Host "`n🔧 Starting Flask Backend (Port 5000)..." -ForegroundColor Cyan
$backendJob = Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$BloomDir'; & '$VenvPath\Scripts\Activate.ps1'; `$env:PYTHONPATH='$BloomDir'; python run.py"
) -PassThru -WindowStyle Normal

Start-Sleep -Seconds 2

# Start React Frontend
Write-Host "⚛️  Starting React Frontend (Port 3000)..." -ForegroundColor Green
$frontendJob = Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$BloomDir/frontend'; npm run dev"
) -PassThru -WindowStyle Normal

Write-Host "`n Both servers are starting!" -ForegroundColor Green
Write-Host "   Backend:  http://localhost:5000" -ForegroundColor Cyan
Write-Host "   Frontend: http://localhost:3000" -ForegroundColor Green
Write-Host ""
Write-Host "Close the terminal windows to stop the servers." -ForegroundColor Yellow
