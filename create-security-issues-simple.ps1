# Simple GitHub Issues Creation Script
# Creates security audit issues one by one

Write-Host "Creating Security Audit Issues..." -ForegroundColor Green

# Create milestone first
Write-Host "Creating milestone..." -ForegroundColor Yellow
gh milestone create "Security Audit 2025" --description "Comprehensive security audit findings and remediation" --due-date "2025-02-15"

# Issue 1: Secret Keys
Write-Host "Creating Issue 1: Secret Keys..." -ForegroundColor Cyan
gh issue create --title "CRITICAL: Weak Default Secret Keys in Configuration" --body-file "docs/gh_issues/issue_001_secret_keys.md" --label "security,critical,backend" --milestone "Security Audit 2025"

# Issue 2: JWT Storage
Write-Host "Creating Issue 2: JWT Storage..." -ForegroundColor Cyan
gh issue create --title "HIGH: JWT Tokens Stored in localStorage Vulnerable to XSS" --body-file "docs/gh_issues/issue_002_jwt_storage.md" --label "security,high,frontend" --milestone "Security Audit 2025"

# Issue 3: SQL Injection
Write-Host "Creating Issue 3: SQL Injection..." -ForegroundColor Cyan
gh issue create --title "HIGH: SQL Injection Risk in Maintenance Scripts" --body-file "docs/gh_issues/issue_003_sql_injection.md" --label "security,high,backend" --milestone "Security Audit 2025"

# Issue 4: Token Exposure
Write-Host "Creating Issue 4: Token Exposure..." -ForegroundColor Cyan
gh issue create --title "HIGH: Password Reset Tokens Exposed in API Responses" --body-file "docs/gh_issues/issue_004_token_exposure.md" --label "security,high,backend" --milestone "Security Audit 2025"

# Issue 5: Rate Limiting
Write-Host "Creating Issue 5: Rate Limiting..." -ForegroundColor Cyan
gh issue create --title "MEDIUM: Rate Limiting Bypass via Server Restart" --body-file "docs/gh_issues/issue_005_rate_limiting.md" --label "security,medium,backend" --milestone "Security Audit 2025"

# Issue 6: XSS Prevention
Write-Host "Creating Issue 6: XSS Prevention..." -ForegroundColor Cyan
gh issue create --title "MEDIUM: Cross-Site Scripting (XSS) Prevention Gaps" --body-file "docs/gh_issues/issue_006_xss_prevention.md" --label "security,medium,frontend" --milestone "Security Audit 2025"

# Issue 7: CORS Configuration
Write-Host "Creating Issue 7: CORS..." -ForegroundColor Cyan
gh issue create --title "MEDIUM: CORS Configuration Allows Wildcard Origins" --body-file "docs/gh_issues/issue_007_cors_config.md" --label "security,medium,backend" --milestone "Security Audit 2025"

# Issue 8: Console Logging
Write-Host "Creating Issue 8: Console Logging..." -ForegroundColor Cyan
gh issue create --title "LOW: Sensitive Information in Console Logs" --body-file "docs/gh_issues/issue_008_console_logging.md" --label "security,low,frontend" --milestone "Security Audit 2025"

# Issue 9: Security Overview
Write-Host "Creating Issue 9: Overview..." -ForegroundColor Cyan
gh issue create --title "Security Audit Overview - Comprehensive Remediation Plan" --body-file "docs/gh_issues/issue_009_security_overview.md" --label "security,documentation" --milestone "Security Audit 2025"

Write-Host "All security issues created successfully!" -ForegroundColor Green
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Review issues at: https://github.com/USER/REPO/issues" -ForegroundColor White
Write-Host "2. Assign team members to appropriate issues" -ForegroundColor White
Write-Host "3. Begin with CRITICAL and HIGH priority items" -ForegroundColor White
Write-Host "4. Use the Security Testing Plan in docs/SECURITY_TESTING_PLAN.md" -ForegroundColor White