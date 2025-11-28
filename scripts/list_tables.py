import sqlite3

conn = sqlite3.connect('instance/bloom.db')
cursor = conn.cursor()

print("\n=== TABLES ===")
cursor.execute('SELECT name FROM sqlite_master WHERE type="table"')
for table in cursor.fetchall():
    print(table[0])

conn.close()
