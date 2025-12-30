# PowerShell Script to Create GitHub Security Issues
# Run this in PowerShell from the bloom-budget-tracker directory

# Navigate to the project directory
Set-Location "H:\Code\bloom-budget-tracker"

Write-Host "🔒 Creating Security Audit GitHub Issues..." -ForegroundColor Cyan

# Create milestone first (if it does not exist)
Write-Host "📋 Creating Security Sprint milestone..." -ForegroundColor Yellow
gh milestone create "Security Sprint Q1 2025" --description "Comprehensive security vulnerability remediation" --due-date "2025-02-15"

# Function to create issue with error handling
function Create-SecurityIssue {
    param($Title, $BodyFile, $Labels, $Priority)

    Write-Host "Creating: $Title" -ForegroundColor Green
    try {
        $result = gh issue create --title $Title --body-file $BodyFile --label $Labels --milestone "Security Sprint Q1 2025"
        Write-Host "✅ Created: $result" -ForegroundColor Green
        Start-Sleep -Seconds 1  # Rate limiting
    }
    catch {
        Write-Host "❌ Failed to create issue: $Title" -ForegroundColor Red
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Create CRITICAL issue first
Create-SecurityIssue `
    -Title "🔴 CRITICAL: Enforce Strong Secret Keys in Production" `
    -BodyFile "docs/gh_issues/security-audit-critical-secret-keys.md" `
    -Labels "security,critical,backend,deployment,production" `
    -Priority "CRITICAL"

# Create HIGH priority issues
Create-SecurityIssue `
    -Title "🟠 HIGH: JWT Token XSS Vulnerability (localStorage Storage)" `
    -BodyFile "docs/gh_issues/security-audit-jwt-localstorage-xss.md" `
    -Labels "security,high,frontend,backend,authentication,xss-prevention" `
    -Priority "HIGH"

Create-SecurityIssue `
    -Title "🟠 HIGH: Raw SQL Injection Risk in Maintenance Scripts" `
    -BodyFile "docs/gh_issues/security-audit-raw-sql-injection.md" `
    -Labels "security,high,backend,scripts,sql-injection,maintenance" `
    -Priority "HIGH"

Create-SecurityIssue `
    -Title "🟠 HIGH: Information Disclosure in Development Mode" `
    -BodyFile "docs/gh_issues/security-audit-dev-token-exposure.md" `
    -Labels "security,high,information-disclosure,backend,frontend,development" `
    -Priority "HIGH"

# Create MEDIUM priority issues
Create-SecurityIssue `
    -Title "🟡 MEDIUM: Rate Limiting Bypass via Server Restarts" `
    -BodyFile "docs/gh_issues/security-audit-rate-limit-bypass.md" `
    -Labels "security,medium,backend,rate-limiting,infrastructure,redis" `
    -Priority "MEDIUM"

Create-SecurityIssue `
    -Title "🟡 MEDIUM: XSS via Stored Transaction Data" `
    -BodyFile "docs/gh_issues/security-audit-stored-xss.md" `
    -Labels "security,medium,xss,frontend,backend,input-validation" `
    -Priority "MEDIUM"

Create-SecurityIssue `
    -Title "🟡 MEDIUM: Overly Permissive CORS Configuration" `
    -BodyFile "docs/gh_issues/security-audit-cors-csp.md" `
    -Labels "security,medium,cors,csp,infrastructure,backend" `
    -Priority "MEDIUM"

# Create LOW priority issue
Create-SecurityIssue `
    -Title "🟢 LOW: Console Logging Information Disclosure" `
    -BodyFile "docs/gh_issues/security-audit-console-logging.md" `
    -Labels "security,low,frontend,logging,information-disclosure,cleanup" `
    -Priority "LOW"

# Create MASTER tracking issue
Write-Host "Creating MASTER tracking issue..." -ForegroundColor Cyan
$masterIssue = gh issue create `
    --title "Security Audit Findings - Comprehensive Remediation Plan" \
    --body-file "docs/gh_issues/security-audit-summary.md" `
    --label "security,audit,meta,critical,tracking,remediation-plan" `
    --milestone "Security Sprint Q1 2025"

# Pin the master issue
if ($masterIssue -match "#(\d+)") {
    $issueNumber = $matches[1]
    Write-Host "📌 Pinning master issue #$issueNumber..." -ForegroundColor Yellow
    gh issue pin $issueNumber
}

Write-Host ""
Write-Host "✅ All security audit issues created successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "🎯 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Review issues at: https://github.com/your-org/bloom-budget-tracker/issues" -ForegroundColor White
Write-Host "2. Assign team members to specific issues" -ForegroundColor White
Write-Host "3. Begin with CRITICAL secret key issue immediately" -ForegroundColor White
Write-Host "4. Set up security testing environment" -ForegroundColor White
Write-Host ""
Write-Host "View all security issues:" -ForegroundColor Yellow
gh issue list --label security --milestone "Security Sprint Q1 2025"