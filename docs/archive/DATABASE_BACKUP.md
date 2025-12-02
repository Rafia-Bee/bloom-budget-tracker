# Database Backup & Restore

Automated database backup system for Bloom Budget Tracker.

## Overview

Daily automated backups of the PostgreSQL database to:
- GitHub repository (via GitHub Actions artifacts)
- Local compressed files (`.gz` format)

**Retention:** 30 days of daily backups

## Backup Methods

### 1. Automated GitHub Actions (Production)

**Trigger:** Daily at 2:00 AM UTC

The workflow automatically:
1. Dumps PostgreSQL database using `pg_dump`
2. Compresses backup with gzip
3. Uploads to GitHub artifacts
4. Cleans up backups older than 30 days

**Manual Trigger:**
```bash
# Via GitHub web interface: Actions → Database Backup → Run workflow
# Or via CLI:
gh workflow run backup.yml
```

### 2. Manual Script Execution

**Local/Development:**
```powershell
# SQLite (development)
python scripts/backup_database.py
```

**Production (with DATABASE_URL):**
```powershell
$env:DATABASE_URL = "postgresql://..."
$env:GITHUB_BACKUP_TOKEN = "ghp_..."
python scripts/backup_database.py
```

## Backup Location

**GitHub Actions:** Artifacts stored in workflow runs (30-day retention)
**Local:** `scripts/backups/bloom_backup_YYYYMMDD_HHMMSS.sql.gz`

## Restore Process

### 1. Download Backup

**From GitHub Actions:**
```bash
# Download artifact from GitHub Actions run
gh run download <run-id> -n database-backup-<number>
```

**Local:**
```powershell
# Backups are in scripts/backups/
ls scripts/backups/
```

### 2. Decompress Backup

```powershell
# PowerShell
gzip -d bloom_backup_20251130_020000.sql.gz

# Or use 7-Zip/WinRAR on Windows
```

### 3. Restore to Database

**PostgreSQL (Production):**
```bash
# Restore to production (DANGER - will overwrite!)
psql $DATABASE_URL < bloom_backup_20251130_020000.sql

# Or restore to new database for testing
createdb bloom_restore_test
psql bloom_restore_test < bloom_backup_20251130_020000.sql
```

**SQLite (Development):**
```powershell
# Simply replace the database file
cp scripts/backups/bloom_backup_20251130_020000.db instance/bloom.db
```

## Configuration

### Environment Variables

**Required for Production:**
- `DATABASE_URL` - PostgreSQL connection string (Render provides this)
- `GITHUB_BACKUP_TOKEN` - GitHub token with repo access (set in GitHub Secrets)

**Optional:**
- `BACKUP_RETENTION_DAYS` - Days to keep backups (default: 30)

### GitHub Secrets Setup

1. Go to GitHub repository → Settings → Secrets and variables → Actions
2. Add secrets:
   - `DATABASE_URL` - From Render dashboard (PostgreSQL connection string)
   - `GITHUB_TOKEN` - Auto-provided by GitHub Actions

## Backup Verification

**Check Backup Files:**
```powershell
# List recent backups
ls scripts/backups/ | Sort-Object -Descending | Select-Object -First 5
```

**Test Restore (Development):**
```powershell
# Create test database from backup
python scripts/backup_database.py
# ... verify backup created successfully
```

**Check GitHub Actions:**
```bash
gh run list --workflow=backup.yml --limit 5
```

## Disaster Recovery Plan

### Scenario 1: Production Database Loss

1. Download latest backup from GitHub Actions artifacts
2. Decompress backup file
3. Restore to new PostgreSQL instance on Render
4. Update `DATABASE_URL` in Render environment variables
5. Verify application functionality

### Scenario 2: Accidental Data Deletion

1. Identify backup timestamp before deletion
2. Download specific backup from GitHub artifacts
3. Create temporary database for inspection
4. Extract specific data using SQL queries
5. Apply corrections to production database

### Scenario 3: Corruption or Migration Issues

1. Download backup from before corruption
2. Restore to separate database instance
3. Compare data with production
4. Run migration scripts on backup first (test)
5. Apply fixes to production

## Monitoring

**GitHub Actions Status:**
- Check email notifications for workflow failures
- Review Actions tab for backup job status
- Set up Slack/Discord webhook for alerts (optional)

**Local Testing:**
```powershell
# Test backup script monthly
python scripts/backup_database.py
# Verify backup file created in scripts/backups/
```

## Backup Script Details

**Functions:**
- `backup_postgres()` - PostgreSQL database dump using pg_dump
- `backup_sqlite()` - SQLite database file copy
- `compress_backup()` - Gzip compression
- `upload_to_github()` - GitHub API upload (optional)
- `cleanup_old_backups()` - Remove old backups

**Exit Codes:**
- `0` - Success
- `1` - Failure (database not found, pg_dump error, etc.)

## Best Practices

1. **Test Restores Monthly** - Verify backups are restorable
2. **Monitor Backup Size** - Alert if size changes dramatically
3. **Keep Local Copies** - Download critical backups locally
4. **Document Schema Changes** - Track migrations for restore compatibility
5. **Security** - Never commit unencrypted backups to public repos

## Troubleshooting

**"pg_dump not found"**
- Install PostgreSQL client tools: `sudo apt-get install postgresql-client`

**"DATABASE_URL not set"**
- For production: Set in Render environment variables
- For local: Script falls back to SQLite automatically

**"Upload failed: 403"**
- Check GITHUB_BACKUP_TOKEN permissions
- Ensure token has `repo` scope

**Backup file too large**
- GitHub Actions artifacts limited to 2GB per file
- Consider compression or incremental backups

## Related Documentation

- [Render PostgreSQL Backups](https://render.com/docs/databases#backups) - 7-day retention (free tier)
- [GitHub Actions Artifacts](https://docs.github.com/en/actions/using-workflows/storing-workflow-data-as-artifacts)
- [PostgreSQL pg_dump Documentation](https://www.postgresql.org/docs/current/app-pgdump.html)
