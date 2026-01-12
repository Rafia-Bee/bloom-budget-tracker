# Database Development Context

This prompt is auto-attached when working on database/migration files.

## File Patterns

-   `backend/models/*.py`
-   `backend/migrations/**`
-   `scripts/*.py` (migration scripts)
-   `*.sql`

## Quick Reference

### ⚠️ CRITICAL: Production First

Before ANY change, query production to verify current state:

```sql
SELECT column_name FROM information_schema.columns WHERE table_name = 'tablename';
```

### Money: Integer Cents

```sql
amount INTEGER NOT NULL DEFAULT 0  -- 1500 = €15.00
```

### Production Migrations

1. Write SQL script
2. Test on local SQLite
3. Run manually in Neon SQL Editor
4. Update SQLAlchemy model
5. Document in DECISION_LOG.md

### Always Include

-   `user_id` foreign key
-   `is_deleted` for soft delete
-   `created_at` timestamp

### Test Command

```powershell
btest b
```

**Full details:** Read `.github/DATABASE_INSTRUCTIONS.md`
