# Database Migration Guide

## Current Setup: SQLite

Bloom uses **SQLite** for production. This is perfect for personal use:

- ✅ No expiration (unlike free Render Postgres - 90 days)
- ✅ No cold starts or connection delays
- ✅ Simple backups (just copy the file)
- ✅ Stored on Render persistent disk (1GB free)
- ✅ Zero cost forever

## Migrating from Postgres to SQLite

**⚠️ URGENT: Complete before December 28, 2025 (Render Postgres expires)**

### Step 1: Export Postgres Data

Run the migration script locally:

```powershell
# Activate virtual environment
.venv\Scripts\Activate.ps1

# Set your Render Postgres URL
$env:DATABASE_URL = "postgresql://user:pass@host:port/database"

# Run migration
python scripts/migrate_postgres_to_sqlite.py
```

This creates `instance/bloom.db` with all your data.

### Step 2: Upload SQLite to Render

1. Go to Render Dashboard → bloom-backend
2. Click "Shell" tab
3. Upload `instance/bloom.db` to `/opt/render/project/data/bloom.db`
   - Or use Render's "Files" tab if available
   - Or deploy and use the migration script on Render directly

**Alternative: Run migration on Render**

```bash
# In Render Shell
cd /opt/render/project/src
python scripts/migrate_postgres_to_sqlite.py
```

The script will create the database at `/opt/render/project/data/bloom.db` automatically.

### Step 3: Remove Postgres from Render

1. Render Dashboard → Your Postgres database
2. Click "Delete Database"
3. Remove `DATABASE_URL` from bloom-backend environment variables
4. Deploy to apply changes

App will now use SQLite on persistent disk.

### Step 4: Verify

```bash
# In Render Shell
ls -lh /opt/render/project/data/bloom.db
# Should show the database file with recent timestamp
```

Open your app - everything should work exactly the same!

## Future: Scaling to Managed Postgres

When you're ready to release publicly and need:
- Multiple backend instances
- Connection pooling
- Advanced features (full-text search, JSON queries)

### Migration Path (SQLite → Postgres)

1. **Choose a provider:**
   - Supabase (500MB free, no expiration)
   - Neon (3GB free, no expiration)
   - Render Postgres ($7/month, no limits)
   - AWS RDS, Google Cloud SQL (pay-as-you-go)

2. **Export SQLite data:**

```powershell
# Dump SQLite to SQL format
sqlite3 instance\bloom.db .dump > backup.sql
```

3. **Create Postgres database** and get connection URL

4. **Import data to Postgres:**

```powershell
# Convert SQLite SQL to Postgres-compatible format
# (may need minor tweaks for auto-increment, dates, etc.)
psql $DATABASE_URL < backup.sql
```

5. **Update Render environment:**
   - Add `DATABASE_URL` with Postgres connection string
   - Remove `DB_PATH` variable
   - Deploy

The app already supports Postgres - just set `DATABASE_URL` and it switches automatically!

## Backup Strategy

### SQLite Backups

**Automated (GitHub Actions):**
- Runs daily at 2 AM UTC
- Backs up `/opt/render/project/data/bloom.db`
- Uploads to `backups/` folder in repo
- Keeps 30 days of backups

**Manual backup:**

```powershell
# Local development
Copy-Item instance\bloom.db bloom_backup.db

# On Render (via Shell)
cp /opt/render/project/data/bloom.db /tmp/backup.db
# Download from Shell UI
```

### Postgres Backups

When using Postgres, the backup script uses `pg_dump`:

```bash
pg_dump $DATABASE_URL > backup.sql
```

## Troubleshooting

### Database not found after deploy

Check persistent disk is mounted:

```bash
# In Render Shell
df -h | grep render
mount | grep data
```

Should show: `/opt/render/project/data`

### Migration script fails

**Error: "No DATABASE_URL set"**
- Set your Render Postgres URL in environment
- Get it from: Render Dashboard → Database → Internal Connection String

**Error: "Unable to connect to database"**
- Verify Postgres URL is correct
- Check if database is still active (not expired)

**Error: "Table already exists"**
- Remove existing `instance/bloom.db` before running
- Script backs up existing database automatically

### App shows empty data after migration

1. Check database file exists on Render disk
2. Verify `DB_PATH` environment variable is set
3. Check logs for connection errors
4. Restart the service

## Cost Comparison

| Solution | Cost | Limits | Expiration |
|----------|------|--------|------------|
| **SQLite + Render Disk** | Free | 1GB storage | Never |
| Render Postgres (Free) | Free | 1GB storage | 90 days |
| Render Postgres (Paid) | $7/mo | 10GB storage | Never |
| Supabase | Free | 500MB | Never |
| Neon | Free | 3GB | Never |

**Recommendation:** Stick with SQLite until you need to scale beyond 1GB or need multi-instance support.
