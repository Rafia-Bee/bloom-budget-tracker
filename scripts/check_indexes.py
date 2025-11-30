"""Check database indexes."""
import sqlite3
import sys
from pathlib import Path

db_path = Path(__file__).parent.parent / 'instance' / 'bloom.db'

if not db_path.exists():
    print(f"Database not found at {db_path}")
    sys.exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("Database Indexes:")
print("=" * 60)
cursor.execute(
    "SELECT name, tbl_name FROM sqlite_master WHERE type='index' ORDER BY tbl_name, name")
indexes = cursor.fetchall()

for idx_name, tbl_name in indexes:
    print(f"  {tbl_name:30s} -> {idx_name}")

print(f"\nTotal indexes: {len(indexes)}")
conn.close()
