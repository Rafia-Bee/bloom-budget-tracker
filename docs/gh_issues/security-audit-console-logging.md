# Security: Console Logging Information Disclosure

## Priority

🟢 **LOW** - Information disclosure

## Description

The frontend contains numerous `console.error`, `console.warn`, and `console.log` statements that may expose sensitive information in browser developer tools. While low risk for production, this could aid attackers in reconnaissance and violates security best practices.

## Security Risk

-   **Impact**: Low - Information disclosure only
-   **Likelihood**: High - Console logs easily accessible
-   **CVSS**: Low (2.5+)

## Information Disclosure Locations

### Error Logging with Sensitive Data

**Files**: Multiple frontend components

```javascript
// frontend/src/pages/Dashboard.jsx:136
console.error("Failed to load transactions and balances:", error);

// frontend/src/pages/Debts.jsx:77
console.error("Failed to load debts:", error);

// frontend/src/pages/RecurringExpenses.jsx:52
console.error("Failed to load recurring expenses:", error);
```

### Potential Data Exposure

Error objects may contain:

-   API response data with user information
-   Authentication tokens in request headers
-   Database error messages with schema information
-   Stack traces with internal application paths

### Development vs Production Logging

Currently no distinction between environments:

```javascript
// Same logging in all environments
console.error("Failed to delete debt:", error);
console.warn("Failed to auto-generate recurring expense:", err);
```

## Risk Assessment

### Information That Could Be Exposed

1. **API Response Structure**: Error responses show backend data models
2. **Authentication Details**: Request headers in error objects
3. **User Data**: Transaction amounts, names, categories in error contexts
4. **System Information**: Stack traces with file paths and line numbers
5. **Debugging Info**: Development-specific error details

### Attack Scenarios

#### Scenario 1: Reconnaissance

1. Attacker opens browser developer tools
2. Triggers various error conditions
3. Analyzes console logs for:
    - API endpoint structures
    - Data validation rules
    - Internal error messages
    - Authentication mechanisms

#### Scenario 2: Session Hijacking Info

1. Authentication errors logged with request details
2. Token refresh failures show token structure
3. CORS errors reveal allowed origins
4. Network errors expose internal URLs

## Current Logging Analysis

### High-Risk Logging Patterns

```javascript
// Error objects logged directly (could contain sensitive data)
console.error("Failed to load expenses:", error);

// Network errors with full request/response
console.error("API Error:", err.response?.data);

// Authentication context in logs
console.warn("No salary period found, using current period start date");
```

### Safe Logging Patterns

```javascript
// Generic error messages (safer)
console.error("Unable to load data");

// Structured logging without sensitive data
console.error("Operation failed", {
    operation: "loadExpenses",
    timestamp: Date.now(),
});
```

## Secure Solutions

### Option 1: Environment-Based Logging (Recommended)

```javascript
// frontend/src/utils/logger.js
const isDevelopment = import.meta.env.MODE === "development";
const isProduction = import.meta.env.PROD;

class Logger {
    static error(message, data = null) {
        if (isDevelopment) {
            console.error(message, data);
        } else if (isProduction) {
            // Production: Log only generic message
            console.error(message);

            // Optional: Send to error tracking service
            // this.sendToErrorService(message, data);
        }
    }

    static warn(message, data = null) {
        if (isDevelopment) {
            console.warn(message, data);
        }
        // No production warnings to console
    }

    static info(message, data = null) {
        if (isDevelopment) {
            console.info(message, data);
        }
    }

    static debug(message, data = null) {
        if (isDevelopment) {
            console.debug(message, data);
        }
    }

    static sanitizeError(error) {
        // Remove sensitive data from error objects
        const sanitized = {
            message: error.message || "An error occurred",
            status: error.response?.status,
            timestamp: new Date().toISOString(),
        };

        // Don't include full response data, headers, etc.
        return sanitized;
    }
}

export default Logger;
```

### Option 2: Structured Logging with Sanitization

```javascript
// frontend/src/utils/secureLogger.js
class SecureLogger {
    static logError(context, error, additionalInfo = {}) {
        const sanitizedError = this.sanitizeErrorData(error);
        const logEntry = {
            level: "error",
            context,
            error: sanitizedError,
            ...additionalInfo,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
        };

        if (import.meta.env.MODE === "development") {
            console.error(`[${context}] Error:`, logEntry);
        } else {
            // Production: Only log essential info
            console.error(`Error in ${context}: ${sanitizedError.message}`);

            // Send to monitoring service
            this.sendToMonitoring(logEntry);
        }
    }

    static sanitizeErrorData(error) {
        if (!error) return { message: "Unknown error" };

        // Safe error properties only
        return {
            message: error.message || "Request failed",
            status: error.response?.status,
            statusText: error.response?.statusText,
            // Don't include: headers, config, request, response.data
        };
    }

    static sendToMonitoring(logEntry) {
        // Optional: Send to error tracking (Sentry, LogRocket, etc.)
        // fetch('/api/v1/errors', { method: 'POST', body: JSON.stringify(logEntry) });
    }
}
```

### Option 3: Replace Direct Console Usage

```javascript
// Global console override for production
if (import.meta.env.PROD) {
    // Override console methods in production
    const originalError = console.error;
    const originalWarn = console.warn;

    console.error = (...args) => {
        // Filter sensitive data before logging
        const filtered = args.map((arg) =>
            typeof arg === "object" ? "[Object]" : String(arg)
        );
        originalError(...filtered);
    };

    console.warn = () => {}; // Disable warnings in production
    console.info = () => {}; // Disable info logs in production
    console.debug = () => {}; // Disable debug logs in production
}
```

## Recommended Implementation

### Step 1: Create Secure Logger

```javascript
// frontend/src/utils/logger.js
export class AppLogger {
    static logApiError(operation, error) {
        const context = {
            operation,
            timestamp: new Date().toISOString(),
            url: window.location.pathname,
        };

        if (import.meta.env.DEV) {
            console.error(`API Error [${operation}]:`, error, context);
        } else {
            console.error(`Operation failed: ${operation}`);
        }
    }

    static logUserAction(action, success = true) {
        if (import.meta.env.DEV) {
            console.info(`User Action: ${action}`, {
                success,
                timestamp: new Date().toISOString(),
            });
        }
    }

    static logWarning(message, context = {}) {
        if (import.meta.env.DEV) {
            console.warn(message, context);
        }
    }
}
```

### Step 2: Replace Console Statements

```javascript
// Before
console.error("Failed to load expenses:", error);

// After
import { AppLogger } from "../utils/logger";
AppLogger.logApiError("loadExpenses", error);
```

### Step 3: Update Components Systematically

```javascript
// frontend/src/pages/Dashboard.jsx
import { AppLogger } from "../utils/logger";

const loadExpenses = async () => {
    try {
        // ... fetch expenses
    } catch (error) {
        AppLogger.logApiError("loadExpenses", error);
        setError("Unable to load expenses. Please try again.");
    }
};
```

## Implementation Steps

### Phase 1: Audit Current Logging

-   [ ] Catalog all `console.*` statements in frontend
-   [ ] Identify which logs might contain sensitive data
-   [ ] Categorize by risk level (user data, API details, etc.)

### Phase 2: Create Secure Logger

-   [ ] Implement environment-aware logging utility
-   [ ] Add error sanitization functions
-   [ ] Create structured logging format
-   [ ] Add optional monitoring integration

### Phase 3: Replace Console Usage

-   [ ] Update high-risk logging statements first
-   [ ] Replace error logging in authentication flows
-   [ ] Update API error handling
-   [ ] Replace debugging logs with structured logging

### Phase 4: Production Hardening

-   [ ] Test logging in production build
-   [ ] Verify no sensitive data in console
-   [ ] Add build-time checks for console usage
-   [ ] Consider adding error reporting service

## Build-Time Console Detection

### Vite Plugin for Console Detection

```javascript
// frontend/vite.config.js
import { defineConfig } from "vite";

function consoleDetectionPlugin() {
    return {
        name: "console-detection",
        transform(code, id) {
            if (id.includes("node_modules")) return;

            // Check for console usage in production builds
            if (process.env.NODE_ENV === "production") {
                const consoleUsage = code.match(
                    /console\.(log|error|warn|info|debug)/g
                );
                if (consoleUsage && consoleUsage.length > 0) {
                    console.warn(
                        `Console usage detected in ${id}:`,
                        consoleUsage
                    );
                }
            }
        },
    };
}

export default defineConfig({
    plugins: [
        // ... other plugins
        consoleDetectionPlugin(),
    ],
});
```

### ESLint Rule for Console Usage

```javascript
// frontend/.eslintrc.js
module.exports = {
    rules: {
        "no-console": process.env.NODE_ENV === "production" ? "error" : "warn",
        // Allow only specific console methods
        "no-restricted-syntax": [
            "error",
            {
                selector:
                    "CallExpression[callee.object.name='console'][callee.property.name!=/^(error|warn)$/]",
                message:
                    "Only console.error and console.warn are allowed in production code",
            },
        ],
    },
};
```

## Files to Modify

-   `frontend/src/utils/logger.js` - New secure logger
-   `frontend/src/pages/Dashboard.jsx` - Replace console statements
-   `frontend/src/pages/Debts.jsx` - Replace console statements
-   `frontend/src/pages/RecurringExpenses.jsx` - Replace console statements
-   `frontend/vite.config.js` - Add console detection
-   `frontend/.eslintrc.js` - Add console usage rules
-   All other components with console usage

## Testing Requirements

-   [ ] No sensitive data visible in production console
-   [ ] Development logging still functional
-   [ ] Error tracking works in production
-   [ ] Build process detects console usage
-   [ ] ESLint catches console violations

## Optional Monitoring Integration

```javascript
// Optional: Add error reporting service
import * as Sentry from "@sentry/react";

class ProductionLogger {
    static logError(message, error, context = {}) {
        if (import.meta.env.PROD) {
            Sentry.captureException(error, {
                tags: { context },
                extra: { message },
            });
        }
    }
}
```

## Related Security Issues

-   Information disclosure prevention (#XX)
-   Error handling security (#XX)
-   Development vs production security (#XX)

## Labels

`security`, `low`, `frontend`, `logging`, `information-disclosure`, `cleanup`
