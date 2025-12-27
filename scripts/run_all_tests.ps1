# Bloom - Run All Tests Locally
# Usage: .\scripts\run_all_tests.ps1 [suite] [-VerboseOutput]
#
# Suite options:
#   (none)  - Run all tests (backend, frontend, e2e)
#   b       - Backend tests only
#   f       - Frontend tests only
#   e       - E2E tests only (auto-starts servers)
#   bf      - Backend + Frontend (skip E2E)
#
# Examples:
#   .\scripts\run_all_tests.ps1           # All tests
#   .\scripts\run_all_tests.ps1 b         # Backend only
#   .\scripts\run_all_tests.ps1 bf        # Backend + Frontend
#   .\scripts\run_all_tests.ps1 e -VerboseOutput # E2E with verbose output

param(
    [Parameter(Position=0)]
    [ValidateSet("", "b", "f", "e", "bf", "fe", "be", "bfe", "all")]
    [string]$Suite = "",
    [switch]$VerboseOutputOutput
)

$ErrorActionPreference = "Continue"
$startTime = Get-Date

# Normalize suite parameter
if ($Suite -eq "" -or $Suite -eq "all" -or $Suite -eq "bfe") {
    $runBackend = $true
    $runFrontend = $true
    $runE2E = $true
} else {
    $runBackend = $Suite -match "b"
    $runFrontend = $Suite -match "f"
    $runE2E = $Suite -match "e"
}

# Colors for output
function Write-Success($msg) { Write-Host "[PASS] $msg" -ForegroundColor Green }
function Write-Failure($msg) { Write-Host "[FAIL] $msg" -ForegroundColor Red }
function Write-Info($msg) { Write-Host "[INFO] $msg" -ForegroundColor Cyan }
function Write-Header($msg) {
    Write-Host ""
    Write-Host "=======================================================" -ForegroundColor Yellow
    Write-Host "  $msg" -ForegroundColor Yellow
    Write-Host "=======================================================" -ForegroundColor Yellow
}

# Strip ANSI escape codes from text for clean log files
function Remove-AnsiCodes($text) {
    # Remove ANSI escape sequences (colors, cursor movements, etc.)
    $ansiPattern = '\x1b\[[0-9;]*[a-zA-Z]|\x1b\][^\x07]*\x07'
    return $text -replace $ansiPattern, ''
}

# Results tracking
$results = @{
    Backend = @{ Status = "skipped"; Tests = 0; Passed = 0; Failed = 0; Coverage = "N/A"; Time = 0 }
    Frontend = @{ Status = "skipped"; Tests = 0; Passed = 0; Failed = 0; Coverage = "N/A"; Time = 0 }
    E2E = @{ Status = "skipped"; Tests = 0; Passed = 0; Failed = 0; Time = 0 }
}

# Ensure we're in the project root
$projectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $projectRoot

# Log file paths
$backendLogFile = Join-Path $projectRoot "backend-tests.txt"
$frontendLogFile = Join-Path $projectRoot "frontend-tests.txt"
$e2eLogFile = Join-Path $projectRoot "e2e-tests.txt"

Write-Header "RUNNING TESTS"
Write-Host "Project: $projectRoot"
Write-Host "Suites:  Backend=$runBackend, Frontend=$runFrontend, E2E=$runE2E"
Write-Host ""

# -----------------------------------------------------------------------------
# BACKEND TESTS
# -----------------------------------------------------------------------------
if ($runBackend) {
    Write-Header "BACKEND TESTS (pytest)"
    $backendStart = Get-Date

    try {
        if ($VerboseOutput) {
            $backendOutput = & .\.venv\Scripts\pytest.exe backend/tests -v --tb=short --cov=backend --cov-report=term-missing 2>&1
        } else {
            $backendOutput = & .\.venv\Scripts\pytest.exe backend/tests --tb=line --cov=backend --cov-report=term 2>&1
        }
        $backendExitCode = $LASTEXITCODE

        # Save full output to log file
        ($backendOutput | ForEach-Object { Remove-AnsiCodes $_ }) | Out-File -FilePath $backendLogFile -Encoding UTF8
        Write-Info "Full output saved to: $backendLogFile"

        # Parse results from output
        $summaryLine = $backendOutput | Select-String -Pattern "(\d+) passed" | Select-Object -Last 1
        if ($summaryLine) {
            $passed = [regex]::Match($summaryLine.Line, "(\d+) passed").Groups[1].Value
            $failed = [regex]::Match($summaryLine.Line, "(\d+) failed")
            $results.Backend.Passed = [int]$passed
            if ($failed.Success) { $results.Backend.Failed = [int]$failed.Groups[1].Value }
            $results.Backend.Tests = $results.Backend.Passed + $results.Backend.Failed
        }

        # Parse coverage
        $coverageLine = $backendOutput | Select-String -Pattern "TOTAL\s+\d+\s+\d+\s+(\d+%)" | Select-Object -Last 1
        if ($coverageLine) {
            $results.Backend.Coverage = [regex]::Match($coverageLine.Line, "(\d+%)").Groups[1].Value
        }

        $results.Backend.Status = if ($backendExitCode -eq 0) { "passed" } else { "failed" }
        $results.Backend.Time = ((Get-Date) - $backendStart).TotalSeconds

        # Show output if verbose or if failed
        if ($VerboseOutput -or $backendExitCode -ne 0) {
            $backendOutput | ForEach-Object { Write-Host $_ }
        } else {
            # Show just the summary
            $backendOutput | Select-String -Pattern "(PASSED|FAILED|ERROR|passed|failed|error|warning|TOTAL)" | ForEach-Object { Write-Host $_.Line }
        }

        if ($backendExitCode -eq 0) {
            Write-Success "Backend tests passed!"
        } else {
            Write-Failure "Backend tests failed!"
        }
    } catch {
        Write-Failure "Backend tests errored: $_"
        $results.Backend.Status = "error"
    }
}

# -----------------------------------------------------------------------------
# FRONTEND TESTS
# -----------------------------------------------------------------------------
if ($runFrontend) {
    Write-Header "FRONTEND TESTS (vitest)"
    $frontendStart = Get-Date

    try {
        Push-Location frontend

        if ($VerboseOutput) {
            $frontendOutput = npm test -- --run --reporter=verbose --coverage 2>&1
        } else {
            $frontendOutput = npm test -- --run --coverage 2>&1
        }
        $frontendExitCode = $LASTEXITCODE

        Pop-Location

        # Save full output to log file
        ($frontendOutput | ForEach-Object { Remove-AnsiCodes $_ }) | Out-File -FilePath $frontendLogFile -Encoding UTF8
        Write-Info "Full output saved to: $frontendLogFile"

        # Parse results
        $testLine = $frontendOutput | Select-String -Pattern "Tests\s+(\d+)\s+(passed|failed)" | Select-Object -Last 1
        if ($testLine) {
            $passed = [regex]::Match($testLine.Line, "(\d+)\s+passed")
            $failed = [regex]::Match($testLine.Line, "(\d+)\s+failed")
            if ($passed.Success) { $results.Frontend.Passed = [int]$passed.Groups[1].Value }
            if ($failed.Success) { $results.Frontend.Failed = [int]$failed.Groups[1].Value }
            $results.Frontend.Tests = $results.Frontend.Passed + $results.Frontend.Failed
        }

        # Parse coverage from "All files" line
        $coverageLine = $frontendOutput | Select-String -Pattern "All files\s*\|\s*[\d.]+\s*\|" | Select-Object -Last 1
        if ($coverageLine) {
            $coverage = [regex]::Match($coverageLine.Line, "All files\s*\|\s*([\d.]+)").Groups[1].Value
            $results.Frontend.Coverage = "$coverage%"
        }

        $results.Frontend.Status = if ($frontendExitCode -eq 0) { "passed" } else { "failed" }
        $results.Frontend.Time = ((Get-Date) - $frontendStart).TotalSeconds

        # Show output
        if ($VerboseOutput -or $frontendExitCode -ne 0) {
            $frontendOutput | ForEach-Object { Write-Host $_ }
        } else {
            $frontendOutput | Select-String -Pattern "(Tests|PASS|FAIL|Coverage|All files)" | ForEach-Object { Write-Host $_.Line }
        }

        if ($frontendExitCode -eq 0) {
            Write-Success "Frontend tests passed!"
        } else {
            Write-Failure "Frontend tests failed!"
        }
    } catch {
        Write-Failure "Frontend tests errored: $_"
        $results.Frontend.Status = "error"
        Pop-Location
    }
}

# -----------------------------------------------------------------------------
# E2E TESTS
# -----------------------------------------------------------------------------
if ($runE2E) {
    Write-Header "E2E TESTS (playwright)"
    Write-Info "Playwright will auto-start servers if needed (reuseExistingServer enabled)"
    $e2eStart = Get-Date

    try {
        Push-Location frontend
        # Use playwright.cmd directly to avoid PowerShell npx.ps1 parsing issues
        $e2eOutput = & .\node_modules\.bin\playwright.cmd test --reporter=line 2>&1
        $e2eExitCode = $LASTEXITCODE

        Pop-Location

        # Save full output to log file
        ($e2eOutput | ForEach-Object { Remove-AnsiCodes $_ }) | Out-File -FilePath $e2eLogFile -Encoding UTF8
        Write-Info "Full output saved to: $e2eLogFile"

        # Parse results
        $resultLine = $e2eOutput | Select-String -Pattern "(\d+) passed|(\d+) failed" | Select-Object -Last 1
        if ($resultLine) {
            $passed = [regex]::Match($resultLine.Line, "(\d+) passed")
            $failed = [regex]::Match($resultLine.Line, "(\d+) failed")
            if ($passed.Success) { $results.E2E.Passed = [int]$passed.Groups[1].Value }
            if ($failed.Success) { $results.E2E.Failed = [int]$failed.Groups[1].Value }
            $results.E2E.Tests = $results.E2E.Passed + $results.E2E.Failed
        }

        $results.E2E.Status = if ($e2eExitCode -eq 0) { "passed" } else { "failed" }
        $results.E2E.Time = ((Get-Date) - $e2eStart).TotalSeconds

        if ($VerboseOutput -or $e2eExitCode -ne 0) {
            $e2eOutput | ForEach-Object { Write-Host $_ }
        } else {
            $e2eOutput | Select-String -Pattern "(passed|failed|error)" | ForEach-Object { Write-Host $_.Line }
        }

        if ($e2eExitCode -eq 0) {
            Write-Success "E2E tests passed!"
        } else {
            Write-Failure "E2E tests failed!"
        }
    } catch {
        Write-Failure "E2E tests errored: $_"
        $results.E2E.Status = "error"
        Pop-Location
    }
}

# -----------------------------------------------------------------------------
# SUMMARY
# -----------------------------------------------------------------------------
$totalTime = ((Get-Date) - $startTime).TotalSeconds

# Determine overall pass/fail based on what was run
$allPassed = $true
if ($runBackend -and $results.Backend.Status -ne "passed") { $allPassed = $false }
if ($runFrontend -and $results.Frontend.Status -ne "passed") { $allPassed = $false }
if ($runE2E -and $results.E2E.Status -ne "passed") { $allPassed = $false }

Write-Header "TEST SUMMARY"

Write-Host ""
Write-Host "+-------------+---------+--------+--------+----------+---------+"
Write-Host "| Suite       | Status  | Passed | Failed | Coverage | Time    |"
Write-Host "+-------------+---------+--------+--------+----------+---------+"

function Format-Row($name, $data) {
    $status = switch ($data.Status) {
        "passed" { "  PASS " }
        "failed" { "  FAIL " }
        "skipped" { "  SKIP " }
        default { " ERROR " }
    }
    $coverage = if ($data.Coverage) { $data.Coverage.PadLeft(7) } else { "   N/A " }
    $time = "{0:N1}s" -f $data.Time
    Write-Host ("| {0,-11} | {1} | {2,6} | {3,6} | {4} | {5,7} |" -f $name, $status, $data.Passed, $data.Failed, $coverage, $time)
}

Format-Row "Backend" $results.Backend
Format-Row "Frontend" $results.Frontend
Format-Row "E2E" $results.E2E

Write-Host "+-------------+---------+--------+--------+----------+---------+"
Write-Host ""
Write-Host "Total time: $("{0:N1}" -f $totalTime) seconds"
Write-Host ""

if ($allPassed) {
    Write-Success "ALL TESTS PASSED! Safe to push with [skip ci]"
    Write-Host ""
    Write-Host 'Suggested commit: git commit -m "feat: your message [skip ci]"' -ForegroundColor Cyan
    exit 0
} else {
    Write-Failure "SOME TESTS FAILED! Fix issues before pushing."
    exit 1
}

