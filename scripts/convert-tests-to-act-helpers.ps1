# convert-tests-to-act-helpers.ps1
# Batch converts test files from userEvent to test-utils act helpers
# Run from: h:\Code\bloom-budget-tracker\scripts
# Usage: .\convert-tests-to-act-helpers.ps1 [-DryRun] [-File <filename>]

param(
    [switch]$DryRun,
    [string]$File
)

$testDir = "H:\Code\bloom-budget-tracker\frontend\src\test"

# Get files
if ($File) {
    $files = @(Get-Item "$testDir\$File" -ErrorAction SilentlyContinue)
} else {
    $files = Get-ChildItem "$testDir\*.test.jsx" -ErrorAction SilentlyContinue | Where-Object {
        $content = Get-Content $_.FullName -Raw
        $content -match "import userEvent from '@testing-library/user-event'"
    }
}

if (-not $files -or $files.Count -eq 0) {
    Write-Host "No files found with userEvent imports" -ForegroundColor Red
    exit 1
}

Write-Host "Found $($files.Count) files with userEvent imports" -ForegroundColor Cyan

$totalConversions = 0

foreach ($file in $files) {
    Write-Host "`nProcessing: $($file.Name)" -ForegroundColor Yellow
    $content = Get-Content $file.FullName -Raw
    $originalContent = $content
    $fileConversions = 0

    # Track which helpers are needed
    $needsClick = $content -match 'user\.click\('
    $needsType = $content -match 'user\.type\('
    $needsSelect = $content -match 'user\.selectOptions\('
    $needsClear = $content -match 'user\.clear\('
    $needsUpload = $content -match 'user\.upload\('
    $needsMouseDown = $content -match 'user\.pointer\(' -or $content -match 'mousedown'

    # Build helpers import list
    $helpers = @()
    if ($needsClick) { $helpers += 'clickWithAct' }
    if ($needsType) { $helpers += 'typeWithAct' }
    if ($needsSelect) { $helpers += 'selectWithAct' }
    if ($needsClear) { $helpers += 'clearWithAct' }
    if ($needsUpload) { $helpers += 'uploadWithAct' }
    if ($needsMouseDown) { $helpers += 'mouseDownWithAct' }

    if ($helpers.Count -eq 0) {
        Write-Host "  No userEvent calls found to convert" -ForegroundColor Gray
        continue
    }

    $helperImport = "import { $($helpers -join ', ') } from './test-utils'"

    # Add React import if missing
    if ($content -notmatch "import React from 'react'") {
        $content = "import React from 'react'`n" + $content
        $fileConversions++
    }

    # Replace userEvent import with test-utils helpers
    $content = $content -replace "import userEvent from '@testing-library/user-event'", $helperImport
    $fileConversions++

    # Remove userEvent.setup() lines
    $setupMatches = [regex]::Matches($content, "const user = userEvent\.setup\(\)\s*\n?")
    $content = $content -replace "const user = userEvent\.setup\(\)\s*\n?", ""
    $fileConversions += $setupMatches.Count

    # Convert user.click() -> clickWithAct()
    $clickMatches = [regex]::Matches($content, "await user\.click\(([^)]+)\)")
    $content = $content -replace "await user\.click\(([^)]+)\)", 'await clickWithAct($1)'
    $fileConversions += $clickMatches.Count

    # Convert user.type() -> typeWithAct()
    $typeMatches = [regex]::Matches($content, "await user\.type\(([^,]+),\s*([^)]+)\)")
    $content = $content -replace "await user\.type\(([^,]+),\s*([^)]+)\)", 'await typeWithAct($1, $2)'
    $fileConversions += $typeMatches.Count

    # Convert user.selectOptions() -> selectWithAct()
    $selectMatches = [regex]::Matches($content, "await user\.selectOptions\(([^,]+),\s*([^)]+)\)")
    $content = $content -replace "await user\.selectOptions\(([^,]+),\s*([^)]+)\)", 'await selectWithAct($1, $2)'
    $fileConversions += $selectMatches.Count

    # Convert user.clear() -> clearWithAct()
    $clearMatches = [regex]::Matches($content, "await user\.clear\(([^)]+)\)")
    $content = $content -replace "await user\.clear\(([^)]+)\)", 'await clearWithAct($1)'
    $fileConversions += $clearMatches.Count

    # Convert user.upload() -> uploadWithAct()
    $uploadMatches = [regex]::Matches($content, "await user\.upload\(([^,]+),\s*([^)]+)\)")
    $content = $content -replace "await user\.upload\(([^,]+),\s*([^)]+)\)", 'await uploadWithAct($1, $2)'
    $fileConversions += $uploadMatches.Count

    Write-Host "  Helpers needed: $($helpers -join ', ')" -ForegroundColor Cyan
    Write-Host "  Conversions: $fileConversions" -ForegroundColor Green

    $totalConversions += $fileConversions

    if ($content -ne $originalContent) {
        if ($DryRun) {
            Write-Host "  [DRY RUN] Would save changes" -ForegroundColor Magenta
        } else {
            Set-Content -Path $file.FullName -Value $content -NoNewline
            Write-Host "  Saved!" -ForegroundColor Green
        }
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Total files: $($files.Count)" -ForegroundColor White
Write-Host "Total conversions: $totalConversions" -ForegroundColor Green
if ($DryRun) {
    Write-Host "[DRY RUN MODE - No files modified]" -ForegroundColor Magenta
}
