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

## Subqueries & CTEs

**Key ideas**

- A **subquery** is a query inside another: in `WHERE` (`IN`, `EXISTS`), in `FROM` (derived table) or in `SELECT` (scalar).
- A **correlated subquery** refers to the outer row and runs once per row (conceptually).
- **CTE** (`WITH name AS (...)`) names a subquery so the main query reads top-down. Several CTEs can chain.
- **Recursive CTE** (`WITH RECURSIVE`) walks hierarchies: org charts, category trees, graphs.
- `EXISTS` stops at the first match; good for "has at least one".

```sql
WITH RECURSIVE chain AS (
  SELECT id, name, manager_id, 1 AS depth
  FROM employees WHERE id = 42
  UNION ALL
  SELECT e.id, e.name, e.manager_id, c.depth + 1
  FROM employees e
  JOIN chain c ON e.id = c.manager_id   -- walk up to the CEO
)
SELECT * FROM chain;
```

**Common questions**

- **CTE vs subquery vs temp table?** CTE and subquery live in one statement (CTE is more readable, can be reused in that statement). A temp table persists for the session and can be indexed.
- **`IN` vs `EXISTS`?** Same result for most cases; `EXISTS` is often better for large correlated checks, and `NOT EXISTS` is safe with NULLs.
- **How do you find customers without orders?** `LEFT JOIN orders ... WHERE o.id IS NULL`, or `NOT EXISTS (SELECT 1 FROM orders WHERE customer_id = c.id)`.

**Traps**

- `NOT IN (subquery)` returns no rows if the subquery contains a `NULL`.
- A scalar subquery returning more than one row raises an error.
- A recursive CTE without a stop condition on cyclic data loops forever.

## Views, procedures & triggers

**Key ideas**

- A **view** is a saved query used like a table; good for hiding complexity and limiting visible columns.
- A **materialized view** stores the result; fast reads, must be refreshed.
- **Stored procedures** run logic in the database (several statements, transactions, parameters). **Functions** return a value and can be used inside queries.
- **Triggers** run automatically `BEFORE` / `AFTER` `INSERT` / `UPDATE` / `DELETE` — audit logs, derived columns.
- **Constraints** (`NOT NULL`, `UNIQUE`, `CHECK`, `FOREIGN KEY`) are the simplest way to enforce rules in the DB.

```sql
CREATE VIEW active_customers AS
SELECT id, name, email
FROM customers
WHERE deleted_at IS NULL;

CREATE TRIGGER set_updated_at
BEFORE UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();  -- PostgreSQL
```

**Common questions**

- **View vs materialized view?** A view runs its query every time; a materialized view caches the rows and needs `REFRESH`.
- **Business logic in procedures or in the app?** App code is easier to test, version and scale; procedures reduce round-trips and keep data rules close to data. Most teams keep logic in the app and rules in constraints.
- **Can you update through a view?** Simple single-table views usually yes; views with joins or aggregates usually no.

**Traps**

- Triggers hide logic — side effects surprise other developers and slow bulk writes.
- Stale materialized views return old data until refreshed.
- `SELECT *` in a view can freeze the column list at creation time (depends on the engine).

## SQL vs NoSQL & scaling

**Key ideas**

- **Relational (SQL):** fixed schema, joins, ACID transactions. PostgreSQL, MySQL, SQL Server.
- **NoSQL families:** document (MongoDB), key-value (Redis), wide-column (Cassandra), graph (Neo4j). Flexible schemas, built to scale horizontally.
- **Scaling reads:** read replicas, caching (Redis), indexes. **Scaling writes:** partitioning and **sharding** (split rows across servers by a key).
- **CAP theorem:** during a network partition, a distributed system chooses consistency or availability.
- **Normalization** avoids duplication; **denormalization** duplicates data on purpose to make reads faster.
- **N+1 queries**: one query for a list, then one per item — fix with a join or batch loading.

```sql
-- Partition a big table by month (PostgreSQL)
CREATE TABLE events (
  id bigint, created_at timestamptz, payload jsonb
) PARTITION BY RANGE (created_at);

CREATE TABLE events_2026_10 PARTITION OF events
  FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
```

**Common questions**

- **When would you choose NoSQL?** Very high write volume, flexible or nested documents, simple key lookups, or huge scale where joins are rare. Relational stays the default for most business data.
- **Replication vs sharding?** Replication copies the whole data set (more reads, failover). Sharding splits it (more writes and storage).
- **What is eventual consistency?** Replicas may lag; reads can be stale for a short time, but all copies converge.

**Traps**

- Reading from a replica right after a write can return old data (replication lag).
- A bad shard key creates hot spots where one server takes most of the load.
- Choosing NoSQL "for scale" and then rebuilding joins in application code.

## SELECT basics & filtering

**Key ideas**

- **Logical order** of a query: `FROM` → `JOIN` → `WHERE` → `GROUP BY` → `HAVING` → `SELECT` → `DISTINCT` → `ORDER BY` → `LIMIT/OFFSET`.
- `WHERE` operators: `=`, `<>`, `BETWEEN` (inclusive), `IN (...)`, `LIKE 'abc%'`, `IS NULL`.
- `AND` binds tighter than `OR` — use parentheses.
- `DISTINCT` removes duplicate result rows; `ORDER BY ... DESC NULLS LAST`.
- Pagination: `LIMIT 20 OFFSET 40` (or `OFFSET ... FETCH NEXT ...`); **keyset pagination** (`WHERE id > last_seen_id`) scales better.

```sql
SELECT id, name, created_at
FROM customers
WHERE country IN ('FR', 'TN')
  AND (status = 'active' OR vip = true)
  AND created_at >= DATE '2026-01-01'
ORDER BY created_at DESC
LIMIT 20;
```

**Common questions**

- **Why can't you use a `SELECT` alias in `WHERE`?** `WHERE` is evaluated before `SELECT`. Repeat the expression or use a subquery/CTE. (`ORDER BY` can use aliases.)
- **`WHERE` vs `HAVING`?** `WHERE` filters rows before grouping; `HAVING` filters groups after aggregation.
- **Why is large `OFFSET` slow?** The database still reads and discards all skipped rows.

**Traps**

- `LIKE '%term'` (leading wildcard) can't use a normal B-tree index.
- `BETWEEN` on timestamps with an end date misses the rest of that day — use `< next_day`.
- Missing parentheses around `OR` changes the meaning of the filter.

## Set operations

**Key ideas**

- `UNION` combines results and **removes duplicates**; `UNION ALL` keeps them (faster).
- `INTERSECT` returns rows in both; `EXCEPT` (`MINUS` in Oracle) returns rows in the first but not the second.
- Both queries need the **same number of columns** with compatible types; column names come from the first query.
- `ORDER BY` applies to the whole combined result, written once at the end.

```sql
-- Everyone to notify: customers and newsletter subscribers, no duplicates
SELECT email FROM customers
UNION
SELECT email FROM newsletter_subscribers;

-- Customers who never ordered
SELECT id FROM customers
EXCEPT
SELECT customer_id FROM orders;
```

**Common questions**

- **`UNION` vs `UNION ALL`?** `UNION` deduplicates (sort/hash step); `UNION ALL` just appends. Use `UNION ALL` when duplicates are impossible or wanted.
- **`UNION` vs `JOIN`?** `UNION` stacks rows vertically; `JOIN` combines columns horizontally.
- **How do set operations treat NULLs?** Two NULLs count as equal for duplicate removal (unlike `=` comparisons).

**Traps**

- Column order matters, not names — mismatched order gives wrong data silently.
- Using `UNION` when `UNION ALL` is enough wastes time on large sets.
- `EXCEPT` support and syntax vary (MySQL added it only in 8.0.31).

## Constraints & keys

**Key ideas**

- **Primary key**: unique + not null, identifies a row. **Natural key** (email, ISBN) vs **surrogate key** (auto id, UUID).
- **Foreign key**: value must exist in the referenced table; actions `ON DELETE CASCADE / SET NULL / RESTRICT`.
- `UNIQUE`, `NOT NULL`, `CHECK (price >= 0)`, `DEFAULT`.
- **Composite keys** span several columns (e.g. `(order_id, product_id)` in a join table).
- Constraints protect data no matter which app writes to the database.

```sql
CREATE TABLE order_items (
  order_id   bigint NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id bigint NOT NULL REFERENCES products(id),
  quantity   int    NOT NULL CHECK (quantity > 0),
  unit_price numeric(10, 2) NOT NULL,
  PRIMARY KEY (order_id, product_id)
);
```

**Common questions**

- **Surrogate vs natural key?** Surrogate keys never change and are compact; natural keys carry meaning but can change. Often: surrogate PK + `UNIQUE` on the natural key.
- **Auto-increment vs UUID?** Auto-increment is small and ordered but guessable and hard to merge across systems; UUIDs are globally unique (UUIDv7 keeps time order for index locality).
- **Does a foreign key create an index?** Not in PostgreSQL — index the FK column yourself (joins, cascades).

**Traps**

- `ON DELETE CASCADE` can delete far more than expected.
- `UNIQUE` allows multiple NULLs in most databases.
- Relying only on app-level checks — race conditions create duplicates.

## Date & string functions

**Key ideas**

- Types: `DATE`, `TIME`, `TIMESTAMP` (no zone), `TIMESTAMPTZ` (PostgreSQL, stores UTC), `INTERVAL`.
- Current time: `CURRENT_DATE`, `CURRENT_TIMESTAMP` / `NOW()`.
- Date math: `created_at + INTERVAL '7 days'`, `DATE_TRUNC('month', created_at)`, `EXTRACT(YEAR FROM d)`, `AGE()`.
- Strings: `||` or `CONCAT`, `LOWER`/`UPPER`, `TRIM`, `SUBSTRING`, `LENGTH`, `REPLACE`, `POSITION`, `SPLIT_PART`, `LPAD`.
- Conversions: `CAST(x AS int)` / `x::int`, `TO_CHAR(date, 'YYYY-MM')`.

```sql
SELECT DATE_TRUNC('month', created_at) AS month,
       COUNT(*)                         AS signups
FROM users
WHERE created_at >= NOW() - INTERVAL '12 months'
GROUP BY 1
ORDER BY 1;

SELECT UPPER(LEFT(first_name, 1)) || '. ' || last_name AS short_name FROM users;
```

**Common questions**

- **How do you store times correctly?** In UTC (`timestamptz`), convert to the user's time zone for display.
- **How do you group by day/week/month?** `DATE_TRUNC` (PostgreSQL), `DATE_FORMAT` (MySQL), `DATETRUNC` / `FORMAT` (SQL Server).
- **How do you do a case-insensitive search?** `LOWER(col) = LOWER(:value)` with a matching expression index, or `ILIKE` / `citext` / a case-insensitive collation.

**Traps**

- `WHERE DATE(created_at) = '2026-10-26'` wraps the column in a function and kills the index — use a range.
- Function names differ a lot between databases.
- Storing dates as strings breaks sorting and math.

## CASE & conditional logic

**Key ideas**

- `CASE WHEN cond THEN x WHEN ... ELSE y END` — SQL's if/else, usable in `SELECT`, `WHERE`, `ORDER BY`, `GROUP BY`.
- **Conditional aggregation**: `SUM(CASE WHEN status = 'paid' THEN amount END)` or `COUNT(*) FILTER (WHERE ...)` (PostgreSQL).
- `COALESCE(a, b, c)` returns the first non-null; `NULLIF(a, b)` returns NULL when equal (avoids divide-by-zero).
- `GREATEST` / `LEAST` compare values in a row.

```sql
SELECT
  customer_id,
  COUNT(*)                                          AS orders,
  SUM(CASE WHEN status = 'paid' THEN total ELSE 0 END) AS paid_total,
  COUNT(*) FILTER (WHERE status = 'refunded')       AS refunds,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'refunded') / NULLIF(COUNT(*), 0), 1) AS refund_pct
FROM orders
GROUP BY customer_id;
```

**Common questions**

- **How do you pivot rows into columns?** Conditional aggregation: one `SUM(CASE ...)` per target column.
- **How do you avoid division by zero?** `x / NULLIF(y, 0)` returns NULL instead of an error.
- **Can you sort by a custom order?** `ORDER BY CASE status WHEN 'urgent' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END`.

**Traps**

- `CASE` without `ELSE` returns NULL for unmatched rows.
- Integer division: `1 / 2 = 0` — multiply by `1.0` or cast.
- `CASE` branches must return compatible types.

## Execution plans

**Key ideas**

- `EXPLAIN` shows the planned steps; `EXPLAIN ANALYZE` runs the query and shows real times and row counts.
- Scan types: **Seq Scan** (whole table), **Index Scan**, **Index Only Scan** (covering index), **Bitmap** scans.
- Join algorithms: **Nested Loop** (small inputs / indexed lookups), **Hash Join** (large unsorted sets), **Merge Join** (sorted inputs).
- The planner uses **statistics** — keep them fresh (`ANALYZE`, autovacuum).
- Look for: big gaps between estimated and actual rows, sequential scans on large tables, sorts spilling to disk.

```sql
EXPLAIN ANALYZE
SELECT o.id, o.total
FROM orders o
WHERE o.customer_id = 42 AND o.status = 'paid'
ORDER BY o.created_at DESC
LIMIT 10;

-- Then maybe:
CREATE INDEX idx_orders_customer_status_date ON orders (customer_id, status, created_at DESC);
```

**Common questions**

- **Why would the database ignore my index?** The query returns a large share of the table, a function wraps the column, types don't match, the column order of the composite index doesn't fit, or statistics are stale.
- **`EXPLAIN` vs `EXPLAIN ANALYZE`?** Estimates only vs actually executing (careful with `UPDATE`/`DELETE` — wrap in a transaction and roll back).
- **How do you approach a slow query?** Reproduce, read the plan, check indexes and row estimates, rewrite or add an index, measure again.

**Traps**

- Adding indexes for every slow query — each one slows writes.
- Testing on a tiny dev database where everything is a sequential scan.
- `EXPLAIN ANALYZE` on a data-changing statement really changes data.

## Locking & deadlocks

**Key ideas**

- Writes take **row locks**; other writers of the same row wait. Readers usually don't block writers (MVCC in PostgreSQL, Oracle, MySQL InnoDB).
- `SELECT ... FOR UPDATE` locks rows you will change; `FOR UPDATE SKIP LOCKED` builds job queues; `NOWAIT` fails fast.
- **Optimistic locking**: a `version` column checked on update — no locks held while the user thinks.
- **Pessimistic locking**: lock first, then change.
- **Deadlock**: two transactions each wait for a lock the other holds; the database kills one.

```sql
-- Optimistic locking
UPDATE products
SET stock = stock - 1, version = version + 1
WHERE id = 7 AND version = 12;   -- 0 rows updated → someone else changed it, retry

-- Worker grabbing the next job without blocking other workers
SELECT id FROM jobs WHERE status = 'queued'
ORDER BY created_at
FOR UPDATE SKIP LOCKED
LIMIT 1;
```

**Common questions**

- **How do you prevent deadlocks?** Lock rows in a consistent order, keep transactions short, touch fewer rows, retry on deadlock errors.
- **Optimistic vs pessimistic?** Optimistic for low contention (web forms); pessimistic for high contention (stock counters, seat booking).
- **How do you prevent a "lost update"?** `FOR UPDATE`, a version column, or an atomic update (`SET stock = stock - 1`).

**Traps**

- Read-modify-write in application code without locks (`SELECT stock` then `UPDATE stock = 9`).
- Long transactions holding locks while waiting on the network or user.
- Schema changes (`ALTER TABLE`) taking table locks on busy tables.

## JSON in SQL

**Key ideas**

- PostgreSQL `jsonb` (binary, indexable), MySQL `JSON`, SQL Server JSON functions.
- Access: `data->'address'` (JSON), `data->>'city'` (text), `data #>> '{address,city}'`; containment `data @> '{"vip": true}'`.
- Index with **GIN** on `jsonb`, or an expression index on one extracted key.
- Build JSON: `jsonb_build_object`, `json_agg` — return nested results in one query.
- Use JSON for truly flexible attributes; keep core, queried, related data in normal columns.

```sql
SELECT id, attributes->>'color' AS color
FROM products
WHERE attributes @> '{"in_stock": true}';

CREATE INDEX idx_products_attrs ON products USING GIN (attributes);

-- Orders with their items as a JSON array
SELECT o.id, json_agg(json_build_object('sku', i.sku, 'qty', i.qty)) AS items
FROM orders o JOIN order_items i ON i.order_id = o.id
GROUP BY o.id;
```

**Common questions**

- **`json` vs `jsonb` in PostgreSQL?** `json` stores text as-is; `jsonb` is parsed binary — faster to query, indexable, no duplicate keys.
- **When is a JSON column a bad idea?** When you filter, join or enforce constraints on its fields often — make them columns.
- **How do you index a JSON field?** A GIN index for containment queries, or an expression index on `(data->>'field')`.

**Traps**

- No foreign keys or types inside JSON — bad data sneaks in.
- `->` returns JSON, `->>` returns text — comparing the wrong one fails silently.
- Updating a small key rewrites the whole JSON value.

## Security & permissions

**Key ideas**

- **SQL injection**: user input becomes part of SQL. Prevent with **parameterized queries / prepared statements**, never string concatenation.
- Least privilege: the app's DB user gets only the rights it needs (`GRANT SELECT, INSERT ... ON ... TO app`), no superuser.
- Roles and `GRANT` / `REVOKE`; **row-level security** policies restrict which rows a user sees.
- Encrypt in transit (TLS) and at rest; hash passwords in the app (bcrypt/argon2), never store them in plain text.
- Audit logs for sensitive tables.

```sql
-- Vulnerable (in app code): "SELECT * FROM users WHERE email = '" + input + "'"
-- Safe: parameter placeholder
SELECT * FROM users WHERE email = $1;

CREATE ROLE app_rw LOGIN PASSWORD '...';
GRANT SELECT, INSERT, UPDATE ON orders, order_items TO app_rw;

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_docs ON documents USING (owner_id = current_setting('app.user_id')::bigint);
```

**Common questions**

- **How do prepared statements stop injection?** The SQL text and the values are sent separately; values are never parsed as SQL.
- **Can you parameterize a table or column name?** No — validate it against an allow-list.
- **What is row-level security?** Database-enforced filters so each user only sees allowed rows, even if the app forgets a `WHERE`.

**Traps**

- ORMs are safe until you use raw queries with string interpolation.
- Escaping by hand instead of parameters.
- Shared admin credentials in app config.

## Migrations & backups

**Key ideas**

- **Migrations**: versioned, ordered schema changes in source control (Flyway, Liquibase, Prisma, EF Core, Alembic). Applied automatically in CI/CD.
- **Zero-downtime changes**: expand → migrate data → contract. Add nullable column, backfill, switch code, then add constraints / drop old column.
- Create indexes concurrently on big tables (`CREATE INDEX CONCURRENTLY` in PostgreSQL).
- **Backups**: full + incremental, point-in-time recovery (WAL/binlog), stored off-site, **restore tested regularly**.
- **RPO** (how much data you may lose) and **RTO** (how long recovery may take) drive the strategy.

```sql
-- Step 1 (deploy A): add, don't break old code
ALTER TABLE users ADD COLUMN full_name text;
-- Step 2: backfill in batches
UPDATE users SET full_name = first_name || ' ' || last_name WHERE id BETWEEN 1 AND 10000;
-- Step 3 (deploy B): code uses full_name; later deploy C drops first_name/last_name
```

**Common questions**

- **How do you rename a column without downtime?** Add the new column, write to both, backfill, switch reads, then drop the old one.
- **A backup you never restored is…?** Unverified. Test restores on a schedule.
- **Should migrations be reversible?** Ideally yes (down scripts), but data-destroying changes often need a forward fix instead.

**Traps**

- Editing a migration that already ran in production.
- `ALTER TABLE ... ADD COLUMN ... NOT NULL DEFAULT` locking big tables on older engines.
- Backups stored on the same server as the database.

## Classic interview queries

**Key ideas**

- **Nth highest salary**: `DENSE_RANK()` or `OFFSET n-1`.
- **Duplicates**: `GROUP BY ... HAVING COUNT(*) > 1`; delete them keeping one with `ROW_NUMBER()`.
- **Top N per group**: `ROW_NUMBER() OVER (PARTITION BY group ORDER BY value DESC)` then filter `<= N`.
- **Running total**: `SUM(x) OVER (ORDER BY date)`.
- **Gaps and islands / consecutive days**: subtract `ROW_NUMBER()` from the date to group consecutive rows.
- **Employees earning more than their manager**: self join.

```sql
-- 2nd highest salary per department
SELECT department_id, name, salary
FROM (
  SELECT e.*, DENSE_RANK() OVER (PARTITION BY department_id ORDER BY salary DESC) AS rnk
  FROM employees e
) ranked
WHERE rnk = 2;

-- Delete duplicate emails, keep the lowest id
DELETE FROM users
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY email ORDER BY id) AS rn FROM users
  ) d WHERE rn > 1
);
```

**Common questions**

- **`ROW_NUMBER` vs `RANK` vs `DENSE_RANK`?** For values 100, 100, 90: `1,2,3` / `1,1,3` / `1,1,2`.
- **Find users who logged in 3 days in a row?** Gaps-and-islands: `login_date - ROW_NUMBER() OVER (PARTITION BY user ORDER BY login_date)` is constant for consecutive days; group by it and count.
- **Find employees who earn more than their manager?** `FROM employees e JOIN employees m ON e.manager_id = m.id WHERE e.salary > m.salary`.

**Traps**

- The `MAX(salary) WHERE salary < (SELECT MAX(...))` trick only works for the 2nd highest — use window functions for the Nth.
- Forgetting ties in "top N" questions — clarify `RANK` vs `ROW_NUMBER`.
- Window functions can't be used in `WHERE` directly — wrap in a subquery/CTE.

## Pivoting & reporting

**Key ideas**

- **Pivot** (rows → columns) with conditional aggregation; some engines have `PIVOT` (SQL Server, Oracle) or `crosstab` (PostgreSQL extension).
- **Unpivot** (columns → rows) with `UNION ALL`, `UNPIVOT`, or `LATERAL (VALUES ...)`.
- `GROUP BY ROLLUP` adds subtotals and grand totals; `CUBE` adds all combinations; `GROUPING SETS` picks exact groupings.
- Period comparisons with `LAG()` (previous month) and percent change.
- Heavy reports: materialized views, summary tables, or a separate analytics database/warehouse.

```sql
SELECT
  DATE_TRUNC('month', created_at) AS month,
  SUM(total) FILTER (WHERE channel = 'web')    AS web,
  SUM(total) FILTER (WHERE channel = 'mobile') AS mobile,
  SUM(total)                                   AS all_channels,
  ROUND(100.0 * (SUM(total) - LAG(SUM(total)) OVER (ORDER BY DATE_TRUNC('month', created_at)))
        / NULLIF(LAG(SUM(total)) OVER (ORDER BY DATE_TRUNC('month', created_at)), 0), 1) AS growth_pct
FROM orders
GROUP BY 1
ORDER BY 1;
```

**Common questions**

- **How do you show month-over-month growth?** Aggregate per month, then `LAG()` to get the previous month and compute the difference.
- **What does `ROLLUP` produce?** Subtotal rows for each level of the hierarchy plus a grand total (NULL in rolled-up columns; `GROUPING()` tells them apart).
- **Why not run reports on the production database?** Heavy scans compete with user traffic; use replicas or a warehouse.

**Traps**

- Months with no data disappear — join with a generated calendar (`generate_series`).
- Mixing time zones when truncating to day/month.
- Dynamic pivot columns need dynamic SQL — often better done in the app or BI tool.
