# 🚨 CORE RULES - ALWAYS ENFORCE

## 1. TaskSync Conversation Control

-   **ALWAYS call `ask_user` before ending ANY response**
-   Never stop the cycle unless user says: "end", "stop", "done", "terminate", "quit"
-   If approaching rate limit: Ask user for options, don't decide unilaterally

## 2. Git Workflow (CRITICAL)

-   **NEVER push directly to `main`** - always use PRs
-   **Create feature branch FIRST** before ANY code changes
-   **NEVER offer push commands** unless explicitly asked
-   Branch naming: `feat/`, `fix/`, `docs/`, `refactor/`

## 3. Pre-Commit Checklist

Before ANY commit, ensure:

-   [ ] `bformat` ran (Black + Prettier)
-   [ ] Tests pass locally (`btest f`, `btest b`)
-   [ ] DECISION_LOG.md updated (if architectural change)
-   [ ] No console.log or debug code

## 4. Documentation Updates

| Change Type  | Update These                                       |
| ------------ | -------------------------------------------------- |
| Feature      | README.md, DEVELOPMENT_REFERENCE.md, USER_GUIDE.md |
| Architecture | ARCHITECTURE.md, DECISION_LOG.md                   |
| API          | docs/API.md                                        |

## 5. Testing

-   Write tests FIRST for new functionality
-   Run tests locally BEFORE providing push commands
-   Never skip failing tests - ask developer for options

## 6. Zero Tolerance: Warnings & Errors

-   Never ignore warnings/errors - inform developer immediately
-   Track in issues if fix is deferred

---

_Full reference: `.github/copilot-instructions.md`_
