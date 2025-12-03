# Postgres to SQLite Migration

**⚠️ URGENT: Complete before December 28, 2025**

Render's free PostgreSQL database expires after 90 days. This script migrates all data to SQLite.

## Quick Start

### Step 1: Run Migration Locally

```powershell
# Activate venv
.venv\Scripts\Activate.ps1

# Set Render Postgres URL
$env:DATABASE_URL = "your-render-postgres-url"

# Run migration
python scripts/migrate_postgres_to_sqlite.py
```

**Get your DATABASE_URL:**
- Render Dashboard → bloom-postgres → "Internal Connection String"
- Format: `postgresql://user:pass@host:port/database`

This creates `instance/bloom.db` with all your data.

### Step 2: Deploy SQLite to Render

The app is already configured to use SQLite! Just push the changes:

```powershell
git add .
git commit -m "chore: migrate from Postgres to SQLite"
git push
```

Render will automatically:
1. Create persistent disk at `/opt/render/project/data/`
2. Store database at `/opt/render/project/data/bloom.db`
3. Use SQLite instead of Postgres

### Step 3: Initialize Database on Render

After deploy, run in Render Shell:

```bash
# Option A: Upload your local database
# (Use Render Shell "Upload" feature to upload instance/bloom.db)
cp /tmp/bloom.db /opt/render/project/data/bloom.db

# Option B: Run migration on Render
cd /opt/render/project/src
DATABASE_URL="your-postgres-url" python scripts/migrate_postgres_to_sqlite.py
```

### Step 4: Verify

Visit your app - everything should work! Check Render logs for confirmation:

```
INFO:werkzeug: * Running on http://0.0.0.0:10000/
Using database: /opt/render/project/data/bloom.db
```

### Step 5: Remove Postgres

Once verified:
1. Render Dashboard → bloom-postgres → Delete Database
2. Done! No more expiration worries.

## What Changed

- ✅ `backend/config.py` - Defaults to SQLite, checks for persistent disk path
- ✅ `render.yaml` - Added 1GB persistent disk mount
- ✅ `scripts/backup_database.py` - Updated for SQLite backups
- ✅ App still supports Postgres (just set `DATABASE_URL` when ready to scale)

## Troubleshooting

**"No DATABASE_URL set"**
- Set your Render Postgres connection string
- Get it from Render Dashboard → Database → Internal Connection String

**"Database not found after deploy"**
- Persistent disk takes 1-2 minutes to mount on first deploy
- Check Render Shell: `ls -la /opt/render/project/data/`
- If empty, run migration on Render or upload database file

**"App shows no data"**
- Check `DB_PATH` environment variable is set: `/opt/render/project/data/bloom.db`
- Verify file exists: Render Shell → `ls -lh /opt/render/project/data/bloom.db`
- Check logs for "Using database: /opt/render/project/data/bloom.db"

## Future Scaling

SQLite works great until you need:
- Multiple backend instances (horizontal scaling)
- Advanced SQL features (full-text search, complex queries)
- More than 1GB storage

See [DATABASE_MIGRATION.md](../docs/DATABASE_MIGRATION.md) for scaling to managed Postgres.
