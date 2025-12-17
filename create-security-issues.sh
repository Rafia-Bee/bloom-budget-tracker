# GitHub Issues Creation Script
# Run these commands one by one to create all security audit issues

# Make sure you're in the bloom-budget-tracker directory
cd h:\Code\bloom-budget-tracker

# Create the CRITICAL issue first
gh issue create \
  --title "🔴 CRITICAL: Enforce Strong Secret Keys in Production" \
  --body-file "docs/gh_issues/security-audit-critical-secret-keys.md" \
  --label "security,critical,backend,deployment,production" \
  --milestone "Security Sprint Q1 2025" \
  --assignee "@me"

# Create HIGH priority issues
gh issue create \
  --title "🟠 HIGH: JWT Token XSS Vulnerability (localStorage Storage)" \
  --body-file "docs/gh_issues/security-audit-jwt-localstorage-xss.md" \
  --label "security,high,frontend,backend,authentication,xss-prevention" \
  --milestone "Security Sprint Q1 2025"

gh issue create \
  --title "🟠 HIGH: Raw SQL Injection Risk in Maintenance Scripts" \
  --body-file "docs/gh_issues/security-audit-raw-sql-injection.md" \
  --label "security,high,backend,scripts,sql-injection,maintenance" \
  --milestone "Security Sprint Q1 2025"

gh issue create \
  --title "🟠 HIGH: Information Disclosure in Development Mode" \
  --body-file "docs/gh_issues/security-audit-dev-token-exposure.md" \
  --label "security,high,information-disclosure,backend,frontend,development" \
  --milestone "Security Sprint Q1 2025"

# Create MEDIUM priority issues
gh issue create \
  --title "🟡 MEDIUM: Rate Limiting Bypass via Server Restarts" \
  --body-file "docs/gh_issues/security-audit-rate-limit-bypass.md" \
  --label "security,medium,backend,rate-limiting,infrastructure,redis" \
  --milestone "Security Sprint Q1 2025"

gh issue create \
  --title "🟡 MEDIUM: XSS via Stored Transaction Data" \
  --body-file "docs/gh_issues/security-audit-stored-xss.md" \
  --label "security,medium,xss,frontend,backend,input-validation" \
  --milestone "Security Sprint Q1 2025"

gh issue create \
  --title "🟡 MEDIUM: Overly Permissive CORS Configuration" \
  --body-file "docs/gh_issues/security-audit-cors-csp.md" \
  --label "security,medium,cors,csp,infrastructure,backend" \
  --milestone "Security Sprint Q1 2025"

# Create LOW priority issue
gh issue create \
  --title "🟢 LOW: Console Logging Information Disclosure" \
  --body-file "docs/gh_issues/security-audit-console-logging.md" \
  --label "security,low,frontend,logging,information-disclosure,cleanup" \
  --milestone "Security Sprint Q1 2025"

# Create the MASTER tracking issue last
gh issue create \
  --title "🔒 Security Audit Findings - Comprehensive Remediation Plan" \
  --body-file "docs/gh_issues/security-audit-summary.md" \
  --label "security,audit,meta,critical,tracking,remediation-plan" \
  --milestone "Security Sprint Q1 2025" \
  --pin \
  --assignee "@me"

echo "✅ All security audit issues created successfully!"
echo ""
echo "Next steps:"
echo "1. Review the created issues in GitHub"
echo "2. Create 'Security Sprint Q1 2025' milestone if it doesn't exist"
echo "3. Assign team members to specific issues"
echo "4. Begin work on the CRITICAL secret key issue immediately"