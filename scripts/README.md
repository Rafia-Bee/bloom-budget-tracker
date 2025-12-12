# Bloom Scripts

Utility scripts for database maintenance, scheduled tasks, and development tools.

## ⚠️ CRITICAL WARNING - AUTOMATIC BACKUPS NOW ENABLED

**All destructive scripts NOW create automatic backups before modification!**

### Backup System
- **Automatic backups** created before any destructive operation
- **Location:** `instance/bloom.backup_YYYYMMDD_HHMMSS.db`
- **Restore command:** `cp instance/bloom.backup_XXXXXX_XXXXXX.db instance/bloom.db`

### Script Safety Levels

✅ **SAFE** (read-only or in-memory):
- `pytest` tests use in-memory SQLite (no real DB modification)
- All `check_*.py` scripts (read-only analysis)

⚠️ **AUTO-PROTECTED** (automatic backup + confirmation):
- `clear_user_data.py` - Deletes ALL user data (backups first)
- `clean_duplicate_income.py` - Deletes duplicates (backups first)
- `drop_budget_period_id.py` - Drops/recreates tables (backups first)

❌ **MANUAL BACKUP REQUIRED** (no auto-backup yet):
- `remove_duplicates.py`
- `fix_*.py` scripts

**Before running manual backup scripts:**
```powershell
cp instance/bloom.db instance/bloom.db.backup
```

## Maintenance Script

Consolidated database maintenance operations.

### Usage

```powershell
python scripts/maintenance.py <command>
```

### Available Commands

#### `migrate`
Run all pending database migrations (archived column, recurring expenses table).

```powershell
python scripts/maintenance.py migrate
```

#### `cleanup-recurring`
Remove orphaned recurring expenses that weren't assigned to budget periods.

```powershell
python scripts/maintenance.py cleanup-recurring
```

#### `remove-duplicates`
Remove duplicate recurring expense templates (same name and user).

```powershell
python scripts/maintenance.py remove-duplicates
```

#### `verify-db`
Verify database integrity and show record counts and statistics.

```powershell
python scripts/maintenance.py verify-db
```

#### `help`
Display help message with all available commands.

```powershell
python scripts/maintenance.py help
```

## Database Backup

Automated database backup system with Neon PostgreSQL/SQLite support.

### Manual Execution

```powershell
python scripts/backup_database.py
```

Creates compressed backup in `scripts/backups/` directory. See [DATABASE_BACKUP.md](../docs/DATABASE_BACKUP.md) for full documentation.

### Automated Backups

GitHub Actions runs daily backups at 2:00 AM UTC. Backups are stored as workflow artifacts with 30-day retention.

## Scheduled Task: Generate Recurring Expenses

Script to automatically generate recurring expenses based on templates.

### Manual Execution

```powershell
python backend/run_recurring_generation.py
```

### Automated Scheduling (Windows Task Scheduler)

See [RECURRING_EXPENSES.md](../RECURRING_EXPENSES.md) for detailed setup instructions.

**Quick Setup:**

1. Open Task Scheduler
2. Create Basic Task: "Bloom - Generate Recurring Expenses"
3. Trigger: Daily at 6:00 AM
4. Action: Start a program
   - Program: `C:\path\to\python.exe`
   - Arguments: `C:\path\to\Bloom\backend\run_recurring_generation.py`
   - Start in: `C:\path\to\Bloom`

## Development Scripts

### Seed Data

Generate test data for development and testing.

```powershell
python -m backend.seed_data
```

Creates:
- Test user (email: `test@test.com`, password: `test`)
- 4 weekly November periods
- 62 sample transactions (60 expenses, 12 income)
- 3 active debts + 2 archived debts
- 10 recurring expense templates

### API Testing

Basic API endpoint testing script.

```powershell
python test_api.py
```

Tests authentication and CRUD operations for expenses.

## Notes

- All scripts require the backend dependencies to be installed
- Run from the Bloom project root directory
- Scripts use the SQLite database in `instance/bloom.db`
- Always backup your database before running maintenance operations
