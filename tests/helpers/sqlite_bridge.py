"""Real SQLite adapter for repository tests; each process owns an in-memory DB."""
import json
import sqlite3
import sys

connection = sqlite3.connect(":memory:", isolation_level=None)
connection.row_factory = sqlite3.Row
for line in sys.stdin:
    try:
        request = json.loads(line)
        sql = request["sql"]
        if request["method"] == "execAsync":
            # executescript implicitly commits, which would invalidate rollback tests.
            statement = ""
            for char in sql:
                statement += char
                if char == ";" and sqlite3.complete_statement(statement):
                    connection.execute(statement)
                    statement = ""
            if statement.strip():
                connection.execute(statement)
            result = None
        else:
            cursor = connection.execute(sql, request.get("params", []))
            if request["method"] == "getAllAsync":
                result = [dict(row) for row in cursor.fetchall()]
            elif request["method"] == "getFirstAsync":
                row = cursor.fetchone()
                result = dict(row) if row else None
            else:
                result = {"lastInsertRowId": cursor.lastrowid, "changes": cursor.rowcount}
        print(json.dumps({"result": result}), flush=True)
    except Exception as error:
        print(json.dumps({"error": str(error)}), flush=True)
