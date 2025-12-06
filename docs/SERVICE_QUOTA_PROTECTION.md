# Service Quota Protection - Test Safety

## 🛡️ Summary

All automated tests are **100% safe** - they consume **ZERO** service quotas.

| Service | Daily/Monthly Limit | Pytest Tests | Manual Scripts |
|---------|-------------------|--------------|----------------|
| **SendGrid (Email)** | 100/day | ✅ Fully mocked | ⚠️ test_email.py sends 1 real email |
| **Neon (PostgreSQL)** | 100 hours/month | ✅ In-memory SQLite | ⚠️ May use real DB |
| **Render (Backend)** | 750 hours/month | ✅ No network calls | ⚠️ test_api.py makes requests |
| **Cloudflare Pages** | Unlimited | ✅ N/A | ✅ N/A |

## ✅ Safe to Run Unlimited Times

### Pytest Test Suite
```bash
# Zero service consumption - 100% mocked
python -m pytest backend/tests/ -v
python -m pytest backend/tests/ --cov=backend

# Individual test files - all safe
python -m pytest backend/tests/test_auth.py -v
python -m pytest backend/tests/test_crud.py -v
python -m pytest backend/tests/test_business_logic.py -v
```

**Protection mechanisms:**
- In-memory SQLite database (`sqlite:///:memory:`)
- EmailService globally mocked in conftest.py
- No network requests (uses test_client())
- Rate limiting disabled

### Safe Scripts (Use Real DB but No External Services)
```bash
# These use your configured database but don't consume service quotas
python scripts/test_date_queries.py
python scripts/debug_expenses.py
python -m backend.seed_data
```

## ⚠️ Use Sparingly - Consumes Real Quotas

### 🚨 SENDS 1 REAL EMAIL
```bash
python scripts/test_email.py
```
**Impact:** Consumes 1 of your 100 daily SendGrid emails
**When to use:** Only when troubleshooting email delivery issues
**Recommendation:** Max 1-2 times per day

**Safety features added:**
- Requires typing 'yes' to confirm before sending
- Clear warnings in header and before execution
- Prompts for recipient address

### 🚨 MAKES REAL HTTP REQUESTS
```bash
python scripts/test_api.py
```
**Impact:** Makes ~8-10 requests to backend server
**When to use:** Manual integration testing in development only
**Recommendation:** Use on localhost only, not production

**Safety features added:**
- Clear warnings in header
- Prints target URL before running
- Requires backend server running locally

### ⚠️ USES REAL DATABASE
```bash
python scripts/test_generate.py
```
**Impact:** Reads/writes to configured database (SQLite or PostgreSQL)
**When to use:** Testing recurring expense generation
**Recommendation:** Ensure development database is active

## Protection Implementation Details

### conftest.py (Test Configuration)
```python
class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"  # In-memory DB
    RATELIMIT_ENABLED = False                       # No rate limits
    SENDGRID_API_KEY = None                         # Disable emails

@pytest.fixture(scope="function")
def app():
    # EmailService mocked globally for all tests
    with patch("backend.services.email_service.EmailService"):
        # Returns mock that never sends real emails
```

### What Gets Mocked
- ✅ `EmailService.send_email()` - returns success without sending
- ✅ `EmailService.send_password_reset_email()` - returns success
- ✅ Database - uses ephemeral in-memory SQLite
- ✅ External API calls - uses test_client() (no network)

### What Doesn't Get Mocked
- ⚠️ `scripts/test_email.py` - intentionally sends real email
- ⚠️ `scripts/test_api.py` - intentionally makes HTTP requests
- ⚠️ Database scripts - use configured database

## Best Practices

1. ✅ **Run pytest tests freely** - they're completely safe
2. ⚠️ **Avoid test_email.py in automation** - manual use only
3. ✅ **CI/CD runs pytest only** - no quota consumption in pipelines
4. ✅ **Always check which DB is active** before running scripts
5. ⚠️ **Never run manual scripts against production**

## Monitoring Usage

Check service usage:
- **SendGrid**: https://app.sendgrid.com/statistics
- **Neon**: https://console.neon.tech/ → Usage tab
- **Render**: https://dashboard.render.com/ → Service → Metrics

## Emergency: Hit Quota Limits?

### SendGrid (100 emails/day)
- Wait until next day for reset (UTC midnight)
- Check logs: who sent emails and why
- Review email triggers in code

### Neon (100 compute hours/month)
- Database auto-suspends after 5min idle
- Check active connections and close unused ones
- Consider upgrading to paid tier if legitimate usage

### Render (750 hours/month)
- Free tier sleeps after 15min inactivity
- ~31 days available if running 24/7
- Backend wakes on first request (takes ~30s)

## Questions?

See also:
- `backend/tests/README.md` - Test running guide
- `docs/TESTING.md` - Comprehensive testing documentation
- `.github/copilot-instructions.md` - Project guidelines
