# SQL & databases

## Queries & joins

**Key ideas**

- Logical order of a `SELECT`: `FROM` → `JOIN` → `WHERE` → `GROUP BY` → `HAVING` → `SELECT` → `DISTINCT` → `ORDER BY` → `LIMIT`. That's why a `SELECT` alias can't be used in `WHERE`.
- **INNER JOIN** keeps matching rows only. **LEFT JOIN** keeps every left row, with `NULL`s where the right side has no match. **FULL OUTER** keeps both sides. **CROSS JOIN** = every combination.
- `NULL` means "unknown": `NULL = NULL` is not true. Use `IS NULL` / `IS NOT NULL`, and `COALESCE(x, default)`.
- Subqueries: scalar (one value), `IN (...)`, `EXISTS (...)`. **CTEs** (`WITH x AS (...)`) name a subquery for readability; recursive CTEs walk trees.
- `UNION` removes duplicates; `UNION ALL` keeps them (and is faster).

```sql
-- Customers with no orders
SELECT c.name
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
WHERE o.id IS NULL;
```

**Common questions**

- **`WHERE` vs `HAVING`?** `WHERE` filters rows before grouping; `HAVING` filters groups after aggregation.
- **`IN` vs `EXISTS`?** Same result for most cases; `EXISTS` stops at the first match and handles `NULL`s safely. `NOT IN` with a `NULL` in the subquery returns nothing — prefer `NOT EXISTS`.
- **What happens to a filter on the right table of a LEFT JOIN?** Putting it in `WHERE` turns it into an inner join; put it in the `ON` clause to keep unmatched rows.

**Traps**

- `COUNT(*)` counts rows; `COUNT(col)` skips `NULL`s.
- Joining two one-to-many tables at once multiplies rows (fan-out) and inflates `SUM`s.

## Aggregation & window functions

**Key ideas**

- Aggregates: `COUNT`, `SUM`, `AVG`, `MIN`, `MAX`. Every non-aggregated column in `SELECT` must be in `GROUP BY`.
- **Window functions** compute over related rows *without* collapsing them: `fn() OVER (PARTITION BY ... ORDER BY ...)`.
- Ranking: `ROW_NUMBER()` (unique), `RANK()` (gaps after ties), `DENSE_RANK()` (no gaps).
- `LAG` / `LEAD` read previous/next rows; `SUM(x) OVER (ORDER BY d)` gives running totals.

```sql
-- Top earner(s) per department, ties included
SELECT dept, name, salary
FROM (
  SELECT dept, name, salary,
         RANK() OVER (PARTITION BY dept ORDER BY salary DESC) AS r
  FROM employees
) t
WHERE r = 1;
```

**Common questions**

- **Second highest salary?** `DENSE_RANK() ... = 2`, or `MAX(salary) WHERE salary < (SELECT MAX(salary) ...)`.
- **GROUP BY vs window function?** GROUP BY returns one row per group; a window keeps every row and adds the computed value.
- **Remove duplicates keeping one row?** `ROW_NUMBER() OVER (PARTITION BY key ORDER BY id)` and delete rows where it's > 1.

**Traps**

- `AVG` of integers can truncate in some databases — cast to decimal.
- Window functions can't be used in `WHERE`; wrap the query in a subquery or CTE.

## Indexes & performance

**Key ideas**

- An index (usually a **B-tree**) makes lookups, range scans and sorting fast at the cost of slower writes and extra storage.
- **Composite indexes** follow the leftmost-prefix rule: an index on `(a, b)` helps `WHERE a = ?` and `WHERE a = ? AND b = ?`, not `WHERE b = ?` alone.
- A **covering index** contains every column the query needs, so the table isn't touched.
- Read the plan: `EXPLAIN` / `EXPLAIN ANALYZE`. Look for full table scans on big tables.
- Selectivity matters: an index on a boolean column rarely helps.

**Common questions**

- **Why isn't my index used?** A function on the column (`WHERE LOWER(email) = ?`), a leading wildcard (`LIKE '%x'`), type mismatch, or low selectivity.
- **Clustered vs non-clustered index?** Clustered = table rows stored in index order (one per table); non-clustered = separate structure pointing to rows.
- **How do you speed up a slow query?** Check the plan, add the right index, select fewer columns, avoid N+1 queries, paginate with keyset (`WHERE id > ?`) instead of large `OFFSET`s.

**Traps**

- Too many indexes slow down inserts and updates.
- `SELECT *` defeats covering indexes and moves more data.

## Transactions & isolation

**Key ideas**

- **ACID:** Atomic (all or nothing), Consistent (constraints hold), Isolated (concurrent transactions don't see each other's partial work), Durable (committed data survives crashes).
- Isolation levels, weakest to strongest: **Read Uncommitted** (dirty reads), **Read Committed** (no dirty reads), **Repeatable Read** (no non-repeatable reads), **Serializable** (as if one at a time).
- Anomalies: dirty read, non-repeatable read, phantom read, lost update.
- Locking: pessimistic (`SELECT ... FOR UPDATE`) vs optimistic (version column, retry on conflict).

```sql
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;
```

**Common questions**

- **How do you prevent a lost update?** `SELECT ... FOR UPDATE`, an atomic `UPDATE ... SET x = x - 1`, or optimistic locking with a version number.
- **What is a deadlock?** Two transactions each wait for a lock the other holds. Databases detect it and abort one; fix by locking rows in a consistent order.

**Traps**

- Long transactions hold locks and block others.
- Default isolation differs by database (Postgres: Read Committed; MySQL InnoDB: Repeatable Read).

## Data modeling

**Key ideas**

- **Normalization** removes duplication: 1NF (atomic values), 2NF (no partial dependency on a composite key), 3NF (no dependency between non-key columns).
- **Denormalization** trades duplication for read speed (reporting, caches) — do it on purpose.
- Keys: primary key (unique, not null), foreign key (referential integrity), natural vs surrogate keys.
- Relationships: one-to-many (FK on the many side), many-to-many (join table).
- Constraints: `NOT NULL`, `UNIQUE`, `CHECK`, `FOREIGN KEY ... ON DELETE CASCADE`.

**Common questions**

- **SQL vs NoSQL?** SQL: relations, joins, strong consistency, flexible queries. NoSQL (document, key-value, wide-column): flexible schema, horizontal scale, access-pattern-driven design.
- **How would you model tags on posts?** `posts`, `tags`, and a `post_tags(post_id, tag_id)` join table with a composite primary key.

**Traps**

- Storing comma-separated lists in a column breaks 1NF and makes queries painful.
- Missing indexes on foreign key columns make joins and cascading deletes slow.
