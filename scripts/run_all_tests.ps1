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
# Filter: Use -Filter to run only tests matching a pattern
# List Mode: Use "list" as second argument to list tests without running
#
# Examples:
#   .\scripts\run_all_tests.ps1           # All tests
#   .\scripts\run_all_tests.ps1 b         # Backend only
#   .\scripts\run_all_tests.ps1 bf        # Backend + Frontend
#   .\scripts\run_all_tests.ps1 e -VerboseOutput # E2E with verbose output
#   .\scripts\run_all_tests.ps1 e -Filter "currency" # E2E tests matching "currency"
#   .\scripts\run_all_tests.ps1 f -Filter "Modal"    # Frontend tests matching "Modal"
#   .\scripts\run_all_tests.ps1 b -Filter "auth"     # Backend tests matching "auth"
#   .\scripts\run_all_tests.ps1 e "currency" list    # List E2E tests matching "currency"
#   .\scripts\run_all_tests.ps1 f list               # List all frontend tests
#   .\scripts\run_all_tests.ps1 b "auth" list        # List backend tests matching "auth"
#
# OUTPUT:
#   All test outputs are saved to testOutput/ directory:
#   - testOutput/backend-tests.txt       Full backend test output
#   - testOutput/backend-failed.txt      Failed backend tests only (if any)
#   - testOutput/frontend-tests.txt      Full frontend test output
#   - testOutput/frontend-failed.txt     Failed frontend tests only (if any)
#   - testOutput/e2e-tests.txt           Full E2E test output
#   - testOutput/e2e-syslog.txt          E2E test logs (non-webserver)
#   - testOutput/e2e-webserver.txt       E2E webserver logs
#   - testOutput/e2e-failed.txt          Failed E2E tests only (if any)

param(
    [Parameter(Position=0)]
    [ValidateSet("", "b", "f", "e", "bf", "fe", "be", "bfe", "all")]
    [string]$Suite = "",
    [Parameter(Position=1)]
    [string]$FilterOrList = "",
    [Parameter(Position=2)]
    [string]$ListMode = "",
    [switch]$VerboseOutput
)

# Parse filter and list mode from positional parameters
$Filter = ""
$ListOnly = $false

if ($FilterOrList -eq "list") {
    $ListOnly = $true
} elseif ($FilterOrList) {
    $Filter = $FilterOrList
    if ($ListMode -eq "list") {
        $ListOnly = $true
    }
}

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

# Extract failed test output from pytest output
function Get-BackendFailedTests($output) {
    $inFailure = $false
    $failedLines = @()
    foreach ($line in $output) {
        $cleanLine = Remove-AnsiCodes $line
        # Detect FAILURES section
        if ($cleanLine -match "^=+ FAILURES =+$") {
            $inFailure = $true
        }
        # End at short test summary or another section
        if ($inFailure -and ($cleanLine -match "^=+ short test summary" -or $cleanLine -match "^=+ \d+ (passed|failed)")) {
            $failedLines += $cleanLine
            break
        }
        if ($inFailure) {
            $failedLines += $cleanLine
        }
    }
    return $failedLines
}

# Extract failed test output from vitest output
function Get-FrontendFailedTests($output) {
    $failedLines = @()
    $inFailure = $false
    foreach ($line in $output) {
        $cleanLine = Remove-AnsiCodes $line
        # Detect failure blocks (FAIL lines)
        if ($cleanLine -match "^\s*FAIL\s+" -or $cleanLine -match "^AssertionError:") {
            $inFailure = $true
        }
        # Capture until we hit a pass or summary
        if ($inFailure) {
            $failedLines += $cleanLine
            # End of test file
            if ($cleanLine -match "^\s*$" -and $failedLines.Count -gt 3) {
                $inFailure = $false
            }
        }
    }
    return $failedLines
}

# Extract failed test output from playwright output
function Get-E2EFailedTests($output) {
    $failedLines = @()
    $inFailure = $false
    foreach ($line in $output) {
        $cleanLine = Remove-AnsiCodes $line
        # Detect failure blocks
        if ($cleanLine -match "^\s+\d+\) \[" -or $cleanLine -match "^Error:" -or $cleanLine -match "expect\(received\)") {
            $inFailure = $true
        }
        if ($inFailure) {
            $failedLines += $cleanLine
        }
        # Detect summary line to also include
        if ($cleanLine -match "^\s+\d+ failed$") {
            $failedLines += $cleanLine
        }
    }
    return $failedLines
}

# Split E2E output into syslog (test output) and webserver logs
function Split-E2ELogs($output) {
    $syslog = @()
    $webserver = @()
    foreach ($line in $output) {
        $cleanLine = Remove-AnsiCodes $line
        # WebServer lines start with [WebServer] prefix
        if ($cleanLine -match "^\[WebServer\]") {
            $webserver += $cleanLine -replace "^\[WebServer\]\s*", ""
        } else {
            $syslog += $cleanLine
        }
    }
    return @{
        Syslog = $syslog
        Webserver = $webserver
    }
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

# Create testOutput directory if it doesn't exist
$testOutputDir = Join-Path $projectRoot "testOutput"
if (-not (Test-Path $testOutputDir)) {
    New-Item -ItemType Directory -Path $testOutputDir | Out-Null
    Write-Info "Created testOutput directory"
} else {
    # Clean up existing test output files to prevent stale results
    $existingFiles = Get-ChildItem -Path $testOutputDir -File -ErrorAction SilentlyContinue
    if ($existingFiles.Count -gt 0) {
        Remove-Item -Path "$testOutputDir\*" -Force -ErrorAction SilentlyContinue
        Write-Info "Cleaned up $($existingFiles.Count) stale test output file(s)"
    }
}

# Log file paths (all go to testOutput/)
$backendLogFile = Join-Path $testOutputDir "backend-tests.txt"
$backendFailedFile = Join-Path $testOutputDir "backend-failed.txt"
$frontendLogFile = Join-Path $testOutputDir "frontend-tests.txt"
$frontendFailedFile = Join-Path $testOutputDir "frontend-failed.txt"
$e2eLogFile = Join-Path $testOutputDir "e2e-tests.txt"
$e2eSyslogFile = Join-Path $testOutputDir "e2e-syslog.txt"
$e2eWebserverFile = Join-Path $testOutputDir "e2e-webserver.txt"
$e2eFailedFile = Join-Path $testOutputDir "e2e-failed.txt"

Write-Header "RUNNING TESTS"
Write-Host "Project: $projectRoot"
Write-Host "Suites:  Backend=$runBackend, Frontend=$runFrontend, E2E=$runE2E"
if ($Filter) {
    Write-Host "Filter:  $Filter" -ForegroundColor Cyan
}
if ($ListOnly) {
    Write-Host "Mode:    LIST ONLY (tests will not be executed)" -ForegroundColor Magenta
}
Write-Host ""

# -----------------------------------------------------------------------------
# BACKEND TESTS
# -----------------------------------------------------------------------------
if ($runBackend) {
    Write-Header "BACKEND TESTS (pytest)"
    $backendStart = Get-Date

    try {
        if ($ListOnly) {
            Write-Info "Listing backend tests..."
            if ($Filter) {
                & .\.venv\Scripts\pytest.exe backend/tests --collect-only -q -k "$Filter" 2>&1 | Tee-Object -Variable backendOutput
            } else {
                & .\.venv\Scripts\pytest.exe backend/tests --collect-only -q 2>&1 | Tee-Object -Variable backendOutput
            }
            $backendExitCode = $LASTEXITCODE
            $results.Backend.Status = "listed"
        } elseif ($Filter) {
            Write-Info "Running backend tests matching: $Filter"
            & .\.venv\Scripts\pytest.exe backend/tests -v --tb=short --cov=backend --cov-report=term-missing -k "$Filter" 2>&1 | Tee-Object -Variable backendOutput
            $backendExitCode = $LASTEXITCODE
        } elseif ($VerboseOutput) {
            & .\.venv\Scripts\pytest.exe backend/tests -v --tb=short --cov=backend --cov-report=term-missing 2>&1 | Tee-Object -Variable backendOutput
            $backendExitCode = $LASTEXITCODE
        } else {
            # Use -v to show test names as requested
            & .\.venv\Scripts\pytest.exe backend/tests -v --tb=line --cov=backend --cov-report=term 2>&1 | Tee-Object -Variable backendOutput
            $backendExitCode = $LASTEXITCODE
        }

        # Save full output to log file
        ($backendOutput | ForEach-Object { Remove-AnsiCodes $_ }) | Out-File -FilePath $backendLogFile -Encoding UTF8
        Write-Info "Full output saved to: $backendLogFile"

        if (-not $ListOnly) {
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

            # Extract and save failed tests if any
            if ($backendExitCode -ne 0) {
                $failedTests = Get-BackendFailedTests $backendOutput
                if ($failedTests.Count -gt 0) {
                    $failedTests | Out-File -FilePath $backendFailedFile -Encoding UTF8
                    Write-Info "Failed tests saved to: $backendFailedFile"
                }
                Write-Failure "Backend tests failed!"
            } else {
                # Remove old failed file if tests pass
                if (Test-Path $backendFailedFile) { Remove-Item $backendFailedFile }
                Write-Success "Backend tests passed!"
            }
        } else {
            # For list mode, count the tests listed
            $testCount = ($backendOutput | Select-String -Pattern "^backend/tests" | Measure-Object).Count
            Write-Info "Found $testCount backend tests"
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

        if ($ListOnly) {
            Write-Info "Listing frontend tests..."
            if ($Filter) {
                # Vitest doesn't have a direct --list flag, but we can use --reporter=json --run and parse
                # Alternative: use --passWithNoTests to just show matched files
                npm test -- --run --reporter=verbose $Filter 2>&1 | Select-String -Pattern "^\s*[✓✗]|PASS|FAIL|\.test\.(jsx?|tsx?):" | Tee-Object -Variable frontendOutput
            } else {
                npm test -- --run --reporter=verbose 2>&1 | Select-String -Pattern "^\s*[✓✗]|PASS|FAIL|\.test\.(jsx?|tsx?):" | Tee-Object -Variable frontendOutput
            }
            $frontendExitCode = $LASTEXITCODE
            $results.Frontend.Status = "listed"
            Write-Info "Test names shown above (Vitest doesn't support list-only mode)"
        } elseif ($Filter) {
            Write-Info "Running frontend tests matching: $Filter"
            npm test -- --run --reporter=verbose --coverage $Filter 2>&1 | Tee-Object -Variable frontendOutput
            $frontendExitCode = $LASTEXITCODE
        } elseif ($VerboseOutput) {
            npm test -- --run --reporter=verbose --coverage 2>&1 | Tee-Object -Variable frontendOutput
            $frontendExitCode = $LASTEXITCODE
        } else {
            # Use verbose reporter to show test names
            npm test -- --run --reporter=verbose --coverage 2>&1 | Tee-Object -Variable frontendOutput
            $frontendExitCode = $LASTEXITCODE
        }

        Pop-Location

        # Save full output to log file
        ($frontendOutput | ForEach-Object { Remove-AnsiCodes $_ }) | Out-File -FilePath $frontendLogFile -Encoding UTF8
        Write-Info "Full output saved to: $frontendLogFile"

        if (-not $ListOnly) {
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

            # Extract and save failed tests if any
            if ($frontendExitCode -ne 0) {
                $failedTests = Get-FrontendFailedTests $frontendOutput
                if ($failedTests.Count -gt 0) {
                    $failedTests | Out-File -FilePath $frontendFailedFile -Encoding UTF8
                    Write-Info "Failed tests saved to: $frontendFailedFile"
                }
                Write-Failure "Frontend tests failed!"
            } else {
                # Remove old failed file if tests pass
                if (Test-Path $frontendFailedFile) { Remove-Item $frontendFailedFile }
                Write-Success "Frontend tests passed!"
            }
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
    $e2eStart = Get-Date

    try {
        Push-Location frontend
        # Use playwright.cmd directly to avoid PowerShell npx.ps1 parsing issues

        if ($ListOnly) {
            Write-Info "Listing E2E tests..."
            if ($Filter) {
                # Determine if filter is a file pattern (contains . or /) or test name
                $isFilePattern = $Filter -match '[\./]' -or $Filter -match '\.spec\.(js|ts)$'
                if ($isFilePattern) {
                    # File pattern - use as positional argument
                    & .\node_modules\.bin\playwright.cmd test $Filter --list 2>&1 | Tee-Object -Variable e2eOutput
                } else {
                    # Test name pattern - use --grep
                    & .\node_modules\.bin\playwright.cmd test --grep "$Filter" --list 2>&1 | Tee-Object -Variable e2eOutput
                }
            } else {
                & .\node_modules\.bin\playwright.cmd test --list 2>&1 | Tee-Object -Variable e2eOutput
            }
            $e2eExitCode = $LASTEXITCODE
            $results.E2E.Status = "listed"
            # Count tests from output
            $testCount = ($e2eOutput | Select-String -Pattern "^\s+[✓◯›]|\.spec\.(js|ts):" | Measure-Object).Count
            Write-Info "Found tests listed above"
        } elseif ($Filter) {
            Write-Info "Playwright will auto-start servers if needed (reuseExistingServer enabled)"
            Write-Info "Running E2E tests matching: $Filter"
            # Determine if filter is a file pattern (contains . or /) or test name
            $isFilePattern = $Filter -match '[\./]' -or $Filter -match '\.spec\.(js|ts)$'
            if ($isFilePattern) {
                # File pattern - use as positional argument
                & .\node_modules\.bin\playwright.cmd test $Filter --reporter=list 2>&1 | Tee-Object -Variable e2eOutput
            } else {
                # Test name pattern - use --grep
                & .\node_modules\.bin\playwright.cmd test --grep "$Filter" --reporter=list 2>&1 | Tee-Object -Variable e2eOutput
            }
            $e2eExitCode = $LASTEXITCODE
        } else {
            Write-Info "Playwright will auto-start servers if needed (reuseExistingServer enabled)"
            & .\node_modules\.bin\playwright.cmd test --reporter=list 2>&1 | Tee-Object -Variable e2eOutput
            $e2eExitCode = $LASTEXITCODE
        }

        Pop-Location

        # Save full output to log file
        ($e2eOutput | ForEach-Object { Remove-AnsiCodes $_ }) | Out-File -FilePath $e2eLogFile -Encoding UTF8
        Write-Info "Full output saved to: $e2eLogFile"

        # Split E2E logs into syslog and webserver logs
        $splitLogs = Split-E2ELogs $e2eOutput
        if ($splitLogs.Syslog.Count -gt 0) {
            $splitLogs.Syslog | Out-File -FilePath $e2eSyslogFile -Encoding UTF8
            Write-Info "Test logs saved to: $e2eSyslogFile"
        }
        if ($splitLogs.Webserver.Count -gt 0) {
            $splitLogs.Webserver | Out-File -FilePath $e2eWebserverFile -Encoding UTF8
            Write-Info "WebServer logs saved to: $e2eWebserverFile"
        }

        if (-not $ListOnly) {
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

            # Extract and save failed tests if any
            if ($e2eExitCode -ne 0) {
                $failedTests = Get-E2EFailedTests $e2eOutput
                if ($failedTests.Count -gt 0) {
                    $failedTests | Out-File -FilePath $e2eFailedFile -Encoding UTF8
                    Write-Info "Failed tests saved to: $e2eFailedFile"
                }
                Write-Failure "E2E tests failed!"
            } else {
                # Remove old failed file if tests pass
                if (Test-Path $e2eFailedFile) { Remove-Item $e2eFailedFile }
                Write-Success "E2E tests passed!"
            }
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

# For list mode, just show a simple summary
if ($ListOnly) {
    Write-Header "LIST COMPLETE"
    Write-Host ""
    Write-Host "Tests were listed but NOT executed." -ForegroundColor Magenta
    Write-Host "Remove 'list' argument to run the tests."
    Write-Host ""
    exit 0
}

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

