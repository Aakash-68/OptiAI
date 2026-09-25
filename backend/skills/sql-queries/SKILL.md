---
name: sql-queries
description: Write, explain, and optimize SQL against a described or discoverable schema. Use for "write a query", "why is this query slow", "explain this SQL", "add an index", migrations, joins, window functions, or any request that produces or reviews SQL for PostgreSQL, MySQL, SQLite, SQL Server, or BigQuery.
---

# SQL queries

Produce SQL that is correct against the real schema, readable by the next person, and safe to run.

## Before writing

1. **Find the schema.** Look for migrations, `schema.sql`, ORM models, or `CREATE TABLE` statements in the repo before asking. If none exist, ask for the table definitions once and state the assumed columns explicitly in the answer.
2. **Confirm the dialect.** Date functions, `LIMIT` vs `TOP`, `RETURNING`, upserts, and quoting all differ. Name the dialect at the top of the answer.
3. **Identify the question the query answers** in one sentence. If the request is ambiguous ("users who bought recently"), state the interpretation you chose (recently = last 30 days) inline.

## Writing rules

- Uppercase keywords, lowercase identifiers, one clause per line, joins on their own lines with the condition beside them.
- Never `SELECT *` in anything that will be committed. List columns.
- Explicit `JOIN ... ON`; no comma joins.
- Use CTEs (`WITH`) for anything with more than one level of nesting. Name each CTE for what it holds, not what it does.
- Parameterize values (`$1`, `?`, `:name`). Never interpolate user input into SQL text.
- Handle `NULL` deliberately: say whether `NOT IN`, `!=`, and aggregates over nullable columns behave as the user expects.
- Time zones: store and compare in UTC; convert at the edge.

## Explaining a query

Walk from the innermost CTE or subquery outward. For each step say what rows come in, what filter or join changes, and what comes out. End with the row grain of the result ("one row per customer per month").

## Optimizing a query

1. Get the plan (`EXPLAIN ANALYZE` in Postgres, `EXPLAIN` in MySQL, `EXPLAIN QUERY PLAN` in SQLite). Do not guess.
2. Look for, in order: sequential scans on large tables, nested loops over large inputs, sorts that spill, functions wrapped around indexed columns (`WHERE lower(email) = ...`), implicit type casts, `OR` across different columns, `SELECT DISTINCT` hiding a bad join.
3. Propose the smallest change first: an index, a rewritten predicate, a `LIMIT`, or pushing a filter into a CTE. Give the exact `CREATE INDEX` statement and say what writes it slows down.
4. State expected impact honestly. "Should remove the seq scan" is fine; a made-up percentage is not.

## Migrations and destructive statements

- `UPDATE` and `DELETE` always ship with the `SELECT` that shows what they will touch, and a row count expectation.
- Wrap multi-statement changes in a transaction where the dialect supports it.
- Schema changes on large tables: note lock behaviour and whether the operation is online in that engine.

## Output format

Lead with the query in a fenced `sql` block. Follow with at most five bullets: dialect, assumptions, result grain, indexes it relies on, and anything risky. Skip the essay.
