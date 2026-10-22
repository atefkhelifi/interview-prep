// Hands-on tasks. JavaScript and Python `tests` and SQL `sql` specs run in the browser sandbox;
// Java and C# `tests` run in Docker on the server (opt-in). Every task can get an AI review.

export type TestResult = { name: string; passed: boolean; error?: string };
export type RunResult = { results: TestResult[]; logs: string[]; error?: string };

// The user's query is compared with `solution` on the sample data and on each variant
// (variant SQL runs after `setup`), so hard-coded answers fail.
export type SqlSpec = {
  setup: string;
  solution: string;
  ordered: boolean;
  variants?: { name: string; sql: string }[];
};

export type Workshop = {
  slug: string;
  tech: string; // Tech slug
  title: string;
  level: "easy" | "medium" | "hard";
  language: "javascript" | "python" | "java" | "typescript" | "sql" | "csharp" | "dockerfile" | "shell";
  description: string; // Markdown
  starter: string;
  // Test code in the task's language:
  // - JavaScript: test(name, fn) and expect(x).toBe / toEqual / toThrow.
  // - Python: @test(name) on plain or async functions using assert. Runs before the user's code,
  //   so it can stub modules (e.g. a fake httpx).
  // - Java: statements for main() using test(name, () -> ...), eq(expected, actual), check(ok, message).
  // - C#: members of `static class Tests`, including `public static async Task Run()`, using
  //   Test(name, ...), Eq, Seq and Check.
  tests?: string;
  sql?: SqlSpec;
};

// Java and C# need a compiler, so their tests run in Docker on the server, only when CODE_RUNNER=docker.
export const runsOnServer = (w: Workshop) => Boolean(w.tests) && (w.language === "java" || w.language === "csharp");

export const isRunnable = (w: Workshop) =>
  Boolean(w.sql) || (Boolean(w.tests) && (!runsOnServer(w) || process.env.CODE_RUNNER === "docker"));

const SHOP_SCHEMA = `
CREATE TABLE customers (id INTEGER PRIMARY KEY, name TEXT NOT NULL, country TEXT NOT NULL);
CREATE TABLE orders (id INTEGER PRIMARY KEY, customer_id INTEGER NOT NULL REFERENCES customers(id), amount REAL NOT NULL, created_at TEXT NOT NULL);
INSERT INTO customers VALUES (1,'Alice','FR'),(2,'Bob','TN'),(3,'Chloe','FR'),(4,'Dan','US'),(5,'Emma','TN');
INSERT INTO orders VALUES
  (1,1,120.0,'2026-01-05'),(2,1,80.5,'2026-02-11'),(3,2,300.0,'2026-01-20'),
  (4,3,45.0,'2026-03-02'),(5,3,60.0,'2026-03-15'),(6,3,20.0,'2026-04-01'),(7,4,500.0,'2026-02-28');
`;

const SHOP_DOC = `\`\`\`sql
customers(id, name, country)
orders(id, customer_id → customers.id, amount, created_at)
\`\`\``;

const STAFF_SCHEMA = `
CREATE TABLE employees (id INTEGER PRIMARY KEY, name TEXT NOT NULL, dept TEXT NOT NULL, salary INTEGER NOT NULL);
INSERT INTO employees VALUES
  (1,'Ana','Eng',7000),(2,'Ben','Eng',8200),(3,'Cleo','Eng',8200),(4,'Dina','Sales',5000),
  (5,'Eli','Sales',6100),(6,'Fay','HR',4800),(7,'Gus','HR',4500);
`;

export const workshops: Workshop[] = [
  // ---------- JavaScript (runnable) ----------
  {
    slug: "js-chunk",
    tech: "javascript",
    title: "Chunk an array",
    level: "easy",
    language: "javascript",
    description: `Write \`chunk(array, size)\` that splits an array into groups of \`size\`. The last group holds the rest.

\`\`\`js
chunk([1, 2, 3, 4, 5], 2) // [[1, 2], [3, 4], [5]]
\`\`\`

- Do not change the input array.
- Throw a \`RangeError\` if \`size\` is not a positive integer.`,
    starter: `function chunk(array, size) {
  // your code
}
`,
    tests: `
test("splits evenly", () => expect(chunk([1, 2, 3, 4], 2)).toEqual([[1, 2], [3, 4]]));
test("keeps the remainder", () => expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]));
test("size bigger than array", () => expect(chunk([1, 2], 5)).toEqual([[1, 2]]));
test("empty array", () => expect(chunk([], 3)).toEqual([]));
test("does not mutate input", () => { const a = [1, 2, 3]; chunk(a, 2); expect(a).toEqual([1, 2, 3]); });
test("rejects size 0", () => expect(() => chunk([1], 0)).toThrow(RangeError));
test("rejects non-integer size", () => expect(() => chunk([1], 1.5)).toThrow(RangeError));
`,
  },
  {
    slug: "js-flatten",
    tech: "javascript",
    title: "Deep flatten",
    level: "easy",
    language: "javascript",
    description: `Write \`flatten(array)\` that flattens nested arrays to any depth, **without** using \`Array.prototype.flat\`.

\`\`\`js
flatten([1, [2, [3, [4]], 5]]) // [1, 2, 3, 4, 5]
\`\`\``,
    starter: `function flatten(array) {
  // your code
}
`,
    tests: `
const realFlat = Array.prototype.flat;
test("flat array unchanged", () => expect(flatten([1, 2, 3])).toEqual([1, 2, 3]));
test("one level", () => expect(flatten([1, [2, 3]])).toEqual([1, 2, 3]));
test("deep nesting", () => expect(flatten([1, [2, [3, [4]], 5]])).toEqual([1, 2, 3, 4, 5]));
test("empty arrays", () => expect(flatten([[], [[]], 1])).toEqual([1]));
test("keeps non-array values", () => expect(flatten(["a", [null, [{ x: 1 }]]])).toEqual(["a", null, { x: 1 }]));
test("does not use Array.prototype.flat", () => {
  Array.prototype.flat = () => { throw new Error("flat() is not allowed"); };
  try { expect(flatten([1, [2, [3]]])).toEqual([1, 2, 3]); } finally { Array.prototype.flat = realFlat; }
});
`,
  },
  {
    slug: "js-memoize",
    tech: "javascript",
    title: "Memoize",
    level: "medium",
    language: "javascript",
    description: `Write \`memoize(fn)\` that returns a function caching results by its arguments.

- Calling it again with the same arguments must not call \`fn\` again.
- Support any number of arguments (primitives are enough).
- Keep \`this\` working when the memoized function is used as a method.`,
    starter: `function memoize(fn) {
  // your code
}
`,
    tests: `
test("returns the same result", () => { const sq = memoize((n) => n * n); expect(sq(4)).toBe(16); expect(sq(4)).toBe(16); });
test("calls fn once per arguments", () => {
  let calls = 0; const add = memoize((a, b) => { calls++; return a + b; });
  add(1, 2); add(1, 2); add(2, 1);
  expect(calls).toBe(2);
});
test("distinguishes argument types", () => {
  let calls = 0; const id = memoize((x) => { calls++; return x; });
  id(1); id("1");
  expect(calls).toBe(2);
});
test("caches undefined results", () => {
  let calls = 0; const f = memoize(() => { calls++; return undefined; });
  f(); f();
  expect(calls).toBe(1);
});
test("keeps this", () => {
  const obj = { base: 10, add: memoize(function (n) { return this.base + n; }) };
  expect(obj.add(5)).toBe(15);
});
`,
  },
  {
    slug: "js-promise-all",
    tech: "javascript",
    title: "Implement Promise.all",
    level: "medium",
    language: "javascript",
    description: `Write \`promiseAll(items)\` that behaves like \`Promise.all\`, **without** using \`Promise.all\`, \`allSettled\`, \`any\` or \`race\`.

- Resolve with results **in input order**, even if they settle out of order.
- Non-promise values count as already resolved.
- Reject as soon as one item rejects.
- An empty input resolves to \`[]\`.`,
    starter: `function promiseAll(items) {
  return new Promise((resolve, reject) => {
    // your code
  });
}
`,
    tests: `
const delay = (ms, v, fail) => new Promise((res, rej) => setTimeout(() => (fail ? rej(v) : res(v)), ms));
const realAll = Promise.all;
test("keeps input order", async () => expect(await promiseAll([delay(30, "a"), delay(10, "b"), delay(20, "c")])).toEqual(["a", "b", "c"]));
test("accepts plain values", async () => expect(await promiseAll([1, Promise.resolve(2), 3])).toEqual([1, 2, 3]));
test("empty input", async () => expect(await promiseAll([])).toEqual([]));
test("rejects on first failure", async () => {
  let error;
  try { await promiseAll([delay(50, 1), delay(10, "boom", true)]); } catch (e) { error = e; }
  expect(error).toBe("boom");
});
test("does not use Promise.all", async () => {
  Promise.all = () => { throw new Error("Promise.all is not allowed"); };
  try { expect(await promiseAll([1, 2])).toEqual([1, 2]); } finally { Promise.all = realAll; }
});
`,
  },

  // ---------- Python (runnable) ----------
  {
    slug: "py-retry-decorator",
    tech: "python",
    title: "Retry decorator",
    level: "medium",
    language: "python",
    description: `Write a decorator \`retry(times, exceptions=(Exception,), delay=0)\`.

- Call the function; if it raises one of \`exceptions\`, wait \`delay\` seconds and try again, up to \`times\` attempts in total.
- Re-raise the last exception if every attempt fails.
- Keep the wrapped function's name and docstring.`,
    starter: `import functools
import time


def retry(times, exceptions=(Exception,), delay=0):
    # your code
    pass


@retry(times=3, exceptions=(ConnectionError,))
def fetch():
    ...
`,
    tests: `
@test("returns the result when the call succeeds")
def _():
    calls = []

    @retry(times=3)
    def ok():
        calls.append(1)
        return 42

    assert ok() == 42
    assert len(calls) == 1, f"called {len(calls)} times"


@test("retries until the call succeeds")
def _():
    calls = []

    @retry(times=3, exceptions=(ConnectionError,))
    def flaky():
        calls.append(1)
        if len(calls) < 3:
            raise ConnectionError("down")
        return "ok"

    assert flaky() == "ok"
    assert len(calls) == 3, f"called {len(calls)} times"


@test("re-raises the last error after \`times\` attempts")
def _():
    calls = []

    @retry(times=2, exceptions=(ConnectionError,))
    def down():
        calls.append(1)
        raise ConnectionError(f"attempt {len(calls)}")

    try:
        down()
    except ConnectionError as e:
        assert str(e) == "attempt 2", f"re-raised {e!r}"
    else:
        raise AssertionError("expected ConnectionError")
    assert len(calls) == 2, f"called {len(calls)} times"


@test("does not retry other exceptions")
def _():
    calls = []

    @retry(times=3, exceptions=(ConnectionError,))
    def bad():
        calls.append(1)
        raise ValueError("bad input")

    try:
        bad()
    except ValueError:
        pass
    else:
        raise AssertionError("expected ValueError")
    assert len(calls) == 1, f"called {len(calls)} times"


@test("passes arguments through")
def _():
    @retry(times=2)
    def add(a, b=0):
        return a + b

    assert add(2, b=3) == 5


@test("keeps the name and docstring")
def _():
    @retry(times=2)
    def documented():
        """Docs."""

    assert documented.__name__ == "documented", documented.__name__
    assert documented.__doc__ == "Docs."
`,
  },
  {
    slug: "py-top-words",
    tech: "python",
    title: "Top words from a large file",
    level: "easy",
    language: "python",
    description: `Write \`top_words(path, n)\` returning the \`n\` most common words in a text file as \`[(word, count), ...]\`.

- The file can be bigger than memory: read it lazily (generators).
- Words are case-insensitive; ignore punctuation.
- Ties: alphabetical order.`,
    starter: `from collections import Counter


def top_words(path: str, n: int) -> list[tuple[str, int]]:
    # your code
    pass
`,
    tests: `
import os
import tempfile


def _file(text):
    fd, path = tempfile.mkstemp(suffix=".txt")
    with os.fdopen(fd, "w") as f:
        f.write(text)
    return path


def _pairs(result):
    return [tuple(p) for p in result]


@test("finds the most common words")
def _():
    got = _pairs(top_words(_file("The cat and the hat. The cat sat."), 2))
    assert got == [("the", 3), ("cat", 2)], got


@test("ignores case and punctuation")
def _():
    got = _pairs(top_words(_file("Hello, hello! HELLO? world."), 5))
    assert got == [("hello", 3), ("world", 1)], got


@test("breaks ties alphabetically")
def _():
    got = _pairs(top_words(_file("b a c b a c d"), 3))
    assert got == [("a", 2), ("b", 2), ("c", 2)], got


@test("counts across many lines")
def _():
    got = _pairs(top_words(_file("x y\\n" * 1000 + "z\\n"), 1))
    assert got == [("x", 1000)], got


@test("empty file")
def _():
    got = _pairs(top_words(_file(""), 3))
    assert got == [], got
`,
  },

  // ---------- Java (runnable when CODE_RUNNER=docker) ----------
  {
    slug: "java-lru-cache",
    tech: "java",
    title: "LRU cache",
    level: "medium",
    language: "java",
    description: `Implement \`LruCache<K, V>\` with a fixed capacity.

- \`get(key)\` returns the value or \`null\` and marks the key as recently used.
- \`put(key, value)\` inserts or updates; when over capacity, evict the least recently used entry.
- Both operations O(1). Explain how you would make it thread-safe.`,
    starter: `import java.util.*;

public class LruCache<K, V> {
    private final int capacity;

    public LruCache(int capacity) {
        this.capacity = capacity;
    }

    public V get(K key) {
        // your code
        return null;
    }

    public void put(K key, V value) {
        // your code
    }
}
`,
    tests: `
test("get on a missing key returns null", () -> eq(null, new LruCache<String, Integer>(2).get("a")));
test("put then get", () -> {
    var c = new LruCache<String, Integer>(2);
    c.put("a", 1);
    eq(1, c.get("a"));
});
test("evicts the least recently used entry", () -> {
    var c = new LruCache<String, Integer>(2);
    c.put("a", 1); c.put("b", 2); c.put("c", 3);
    eq(null, c.get("a")); eq(2, c.get("b")); eq(3, c.get("c"));
});
test("get marks a key as recently used", () -> {
    var c = new LruCache<String, Integer>(2);
    c.put("a", 1); c.put("b", 2);
    c.get("a");
    c.put("c", 3);
    eq(1, c.get("a")); eq(null, c.get("b"));
});
test("put on an existing key updates it without evicting", () -> {
    var c = new LruCache<String, Integer>(2);
    c.put("a", 1); c.put("b", 2); c.put("a", 10);
    eq(10, c.get("a")); eq(2, c.get("b"));
});
test("capacity 1", () -> {
    var c = new LruCache<String, Integer>(1);
    c.put("a", 1); c.put("b", 2);
    eq(null, c.get("a")); eq(2, c.get("b"));
});
test("many keys", () -> {
    var c = new LruCache<Integer, Integer>(100);
    for (int i = 0; i < 100_000; i++) c.put(i, i);
    eq(null, c.get(99_899)); eq(99_900, c.get(99_900)); eq(99_999, c.get(99_999));
});
`,
  },
  {
    slug: "java-orders-endpoint",
    tech: "java",
    title: "Spring Boot: create order endpoint",
    level: "hard",
    language: "java",
    description: `Write a Spring Boot REST endpoint \`POST /api/orders\`.

- Accept a JSON body with \`customerId\` (required) and a non-empty list of \`items\` (\`productId\`, \`quantity\` > 0). Validate it.
- Save the order through a service and repository in one transaction.
- Return **201** with the created order as a DTO (not the entity), and **400** with field errors when validation fails.`,
    starter: `@RestController
@RequestMapping("/api/orders")
public class OrderController {
    // your code
}
`,
  },

  // ---------- Angular (AI review) ----------
  // Angular needs a full build and a browser DOM, so these stay review-only.
  {
    slug: "ng-search-box",
    tech: "angular",
    title: "Search box with RxJS",
    level: "medium",
    language: "typescript",
    description: `Build a standalone \`SearchComponent\` that searches as the user types.

- Wait 300 ms after typing stops, skip identical consecutive queries, and ignore empty input.
- Cancel the previous request when a new query arrives.
- Show a loading state and an error message without breaking the stream.
- No manual \`subscribe\` / memory leaks.`,
    starter: `import { Component, inject } from "@angular/core";
import { ReactiveFormsModule, FormControl } from "@angular/forms";

@Component({
  selector: "app-search",
  standalone: true,
  imports: [ReactiveFormsModule],
  template: \`
    <input [formControl]="query" placeholder="Search…" />
    <!-- results -->
  \`,
})
export class SearchComponent {
  query = new FormControl("", { nonNullable: true });
  private api = inject(SearchApi);
  // your code
}
`,
  },
  {
    slug: "ng-cart-signals",
    tech: "angular",
    title: "Cart store with signals",
    level: "easy",
    language: "typescript",
    description: `Write an injectable \`CartStore\` using signals.

- State: a list of \`{ id, name, price, qty }\`.
- \`add(item)\` (increments qty if present), \`remove(id)\`, \`clear()\`.
- Computed \`count\` and \`total\`.
- Expose state read-only to components.`,
    starter: `import { Injectable, signal, computed } from "@angular/core";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  qty: number;
}

@Injectable({ providedIn: "root" })
export class CartStore {
  // your code
}
`,
  },

  // ---------- More JavaScript (runnable) ----------
  {
    slug: "js-debounce",
    tech: "javascript",
    title: "Debounce",
    level: "medium",
    language: "javascript",
    description: `Write \`debounce(fn, wait)\`: the returned function delays calling \`fn\` until \`wait\` ms have passed since the **last** call.

- \`fn\` receives the arguments of the last call and keeps \`this\`.
- The returned function has a \`cancel()\` method that drops a pending call.`,
    starter: `function debounce(fn, wait) {
  // your code
}
`,
    tests: `
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
test("calls once after the burst", async () => {
  let calls = 0; const d = debounce(() => calls++, 40);
  d(); d(); d();
  expect(calls).toBe(0);
  await sleep(80);
  expect(calls).toBe(1);
});
test("uses the last arguments", async () => {
  let got; const d = debounce((x) => { got = x; }, 30);
  d(1); d(2); d(3);
  await sleep(60);
  expect(got).toBe(3);
});
test("timer restarts on each call", async () => {
  let calls = 0; const d = debounce(() => calls++, 50);
  d(); await sleep(30); d(); await sleep(30);
  expect(calls).toBe(0);
  await sleep(40);
  expect(calls).toBe(1);
});
test("keeps this", async () => {
  const obj = { v: 7, got: null };
  obj.f = debounce(function () { this.got = this.v; }, 20);
  obj.f(); await sleep(40);
  expect(obj.got).toBe(7);
});
test("cancel drops the pending call", async () => {
  let calls = 0; const d = debounce(() => calls++, 30);
  d(); d.cancel(); await sleep(60);
  expect(calls).toBe(0);
});
`,
  },
  {
    slug: "js-curry",
    tech: "javascript",
    title: "Curry",
    level: "medium",
    language: "javascript",
    description: `Write \`curry(fn)\` that lets \`fn\` be called with its arguments one or more at a time. Once \`fn.length\` arguments are collected, call \`fn\`.

\`\`\`js
const add3 = curry((a, b, c) => a + b + c);
add3(1)(2)(3); // 6
add3(1, 2)(3); // 6
add3(1)(2, 3); // 6
\`\`\`

Partial applications must be reusable: \`const add1 = add3(1)\` can be called many times.`,
    starter: `function curry(fn) {
  // your code
}
`,
    tests: `
const add3 = (a, b, c) => a + b + c;
test("one at a time", () => expect(curry(add3)(1)(2)(3)).toBe(6));
test("all at once", () => expect(curry(add3)(1, 2, 3)).toBe(6));
test("mixed groups", () => { expect(curry(add3)(1, 2)(3)).toBe(6); expect(curry(add3)(1)(2, 3)).toBe(6); });
test("partials are reusable", () => {
  const add1 = curry(add3)(1);
  expect(add1(2)(3)).toBe(6);
  expect(add1(10)(20)).toBe(31);
});
test("zero-argument function", () => expect(curry(() => 42)()).toBe(42));
`,
  },

  // ---------- More Python (runnable) ----------
  {
    slug: "py-merge-intervals",
    tech: "python",
    title: "Merge intervals",
    level: "easy",
    language: "python",
    description: `Write \`merge(intervals)\` that merges overlapping intervals.

\`\`\`python
merge([(1, 3), (2, 6), (8, 10), (9, 12), (15, 18)])
# [(1, 6), (8, 12), (15, 18)]
\`\`\`

- Input may be unsorted; touching intervals \`(1, 2), (2, 3)\` merge.
- Don't modify the input. State the time complexity.`,
    starter: `def merge(intervals: list[tuple[int, int]]) -> list[tuple[int, int]]:
    # your code
    pass
`,
    tests: `
def _check(intervals, expected):
    got = [tuple(i) for i in merge(intervals)]
    assert got == expected, f"merge({intervals}) returned {got}"


@test("merges overlapping intervals")
def _():
    _check([(1, 3), (2, 6), (8, 10), (9, 12), (15, 18)], [(1, 6), (8, 12), (15, 18)])


@test("handles unsorted input")
def _():
    _check([(8, 10), (1, 3), (2, 6)], [(1, 6), (8, 10)])


@test("merges touching intervals")
def _():
    _check([(1, 2), (2, 3)], [(1, 3)])


@test("keeps an interval that contains others")
def _():
    _check([(1, 10), (2, 3), (4, 5)], [(1, 10)])


@test("empty input")
def _():
    _check([], [])


@test("does not modify the input")
def _():
    data = [(3, 4), (1, 2), (2, 3)]
    merge(data)
    assert data == [(3, 4), (1, 2), (2, 3)], f"input became {data}"
`,
  },
  {
    slug: "py-async-fetch",
    tech: "python",
    title: "Concurrent downloads with asyncio",
    level: "hard",
    language: "python",
    description: `Write \`async def fetch_all(urls, limit=5)\` that downloads every URL concurrently with **at most \`limit\`** requests in flight.

- Return results in the same order as \`urls\`: the body text, or the exception if that URL failed (one failure must not cancel the others).
- Each request times out after 10 seconds.
- Use \`httpx.AsyncClient\` and share one client. (The tests swap httpx for a fake, so no real network is used.)`,
    starter: `import asyncio
import httpx


async def fetch_all(urls: list[str], limit: int = 5) -> list[str | Exception]:
    # your code
    pass
`,
    tests: `
import asyncio
import sys
import types


class _Server:
    delays = {}
    failing = set()
    in_flight = peak = clients = 0

    @classmethod
    def reset(cls, delays=None, failing=()):
        cls.delays, cls.failing = delays or {}, set(failing)
        cls.in_flight = cls.peak = cls.clients = 0


class _Response:
    status_code = 200

    def __init__(self, url):
        self.url, self.text = url, f"body of {url}"

    def raise_for_status(self):
        return self


class _AsyncClient:
    def __init__(self, *args, **kwargs):
        _Server.clients += 1

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        await self.aclose()

    async def aclose(self):
        pass

    async def get(self, url, **kwargs):
        _Server.in_flight += 1
        _Server.peak = max(_Server.peak, _Server.in_flight)
        try:
            await asyncio.sleep(_Server.delays.get(url, 0.01))
            if url in _Server.failing:
                raise httpx.ConnectError(f"cannot reach {url}")
            return _Response(url)
        finally:
            _Server.in_flight -= 1


httpx = types.ModuleType("httpx")
httpx.HTTPError = type("HTTPError", (Exception,), {})
httpx.RequestError = type("RequestError", (httpx.HTTPError,), {})
httpx.ConnectError = type("ConnectError", (httpx.RequestError,), {})
httpx.TimeoutException = type("TimeoutException", (httpx.RequestError,), {})
httpx.Timeout = lambda *args, **kwargs: None
httpx.AsyncClient = _AsyncClient
httpx.Response = _Response
sys.modules["httpx"] = httpx

URLS = [f"https://example.com/{i}" for i in range(8)]


@test("returns bodies in input order")
async def _():
    _Server.reset(delays={u: 0.05 - i * 0.005 for i, u in enumerate(URLS)})
    got = await fetch_all(URLS, limit=8)
    assert got == [f"body of {u}" for u in URLS], got


@test("never has more than \`limit\` requests in flight")
async def _():
    _Server.reset()
    await fetch_all(URLS, limit=3)
    assert _Server.peak <= 3, f"{_Server.peak} requests were in flight at once"


@test("runs requests concurrently")
async def _():
    _Server.reset()
    await fetch_all(URLS, limit=3)
    assert _Server.peak == 3, f"only {_Server.peak} request(s) at once"


@test("returns a failure as an exception and finishes the others")
async def _():
    _Server.reset(failing={URLS[1]})
    got = await fetch_all(URLS[:3], limit=2)
    assert got[0] == f"body of {URLS[0]}" and got[2] == f"body of {URLS[2]}", got
    assert isinstance(got[1], Exception), f"expected an exception, got {got[1]!r}"


@test("shares one client")
async def _():
    _Server.reset()
    await fetch_all(URLS, limit=4)
    assert _Server.clients == 1, f"{_Server.clients} clients were created"


@test("empty list")
async def _():
    _Server.reset()
    assert await fetch_all([]) == []
`,
  },

  // ---------- More Java (runnable when CODE_RUNNER=docker) ----------
  {
    slug: "java-stream-report",
    tech: "java",
    title: "Sales report with streams",
    level: "easy",
    language: "java",
    description: `Given \`record Sale(String region, String product, int quantity, double price)\`, write \`Map<String, Double> revenueByRegion(List<Sale> sales)\` and \`Optional<String> bestSellingProduct(List<Sale> sales)\` using the Streams API.

- Revenue = \`quantity * price\`; the map should be sorted by region name.
- Best-selling product = highest total quantity across all regions; empty input → \`Optional.empty()\`.`,
    starter: `import java.util.*;
import java.util.stream.*;

record Sale(String region, String product, int quantity, double price) {}

class SalesReport {
    static Map<String, Double> revenueByRegion(List<Sale> sales) {
        // your code
        return null;
    }

    static Optional<String> bestSellingProduct(List<Sale> sales) {
        // your code
        return Optional.empty();
    }
}
`,
    tests: `
var sales = List.of(
    new Sale("North", "Pen", 10, 1.5), new Sale("South", "Book", 2, 12.0),
    new Sale("North", "Book", 1, 12.0), new Sale("East", "Pen", 4, 1.5));
test("revenue per region", () -> {
    var r = SalesReport.revenueByRegion(sales);
    eq(27.0, r.get("North")); eq(24.0, r.get("South")); eq(6.0, r.get("East"));
});
test("regions are sorted by name", () ->
    eq(List.of("East", "North", "South"), new ArrayList<>(SalesReport.revenueByRegion(sales).keySet())));
test("best-selling product", () -> eq(Optional.of("Pen"), SalesReport.bestSellingProduct(sales)));
test("quantities add up across regions", () -> eq(Optional.of("Y"), SalesReport.bestSellingProduct(List.of(
    new Sale("A", "X", 5, 1), new Sale("A", "Y", 4, 1), new Sale("B", "Y", 3, 1)))));
test("empty input", () -> {
    eq(Optional.empty(), SalesReport.bestSellingProduct(List.of()));
    eq(Map.of(), SalesReport.revenueByRegion(List.of()));
});
`,
  },
  {
    slug: "java-rate-limiter",
    tech: "java",
    title: "Thread-safe rate limiter",
    level: "hard",
    language: "java",
    description: `Implement a **token bucket** \`RateLimiter\`: capacity \`N\` tokens, refilled at \`R\` tokens per second.

- \`boolean tryAcquire()\` takes one token if available and returns immediately.
- Must be correct under many concurrent threads, without a global lock held for long.
- Make time injectable (e.g. a \`LongSupplier\` for nanos) so it can be unit-tested.`,
    starter: `import java.util.function.LongSupplier;

public class RateLimiter {
    public RateLimiter(int capacity, double tokensPerSecond, LongSupplier nanoClock) {
        // your code
    }

    public boolean tryAcquire() {
        // your code
        return false;
    }
}
`,
    tests: `
final long SECOND = 1_000_000_000L;
test("starts full", () -> {
    long[] now = {0};
    var r = new RateLimiter(3, 1, () -> now[0]);
    check(r.tryAcquire() && r.tryAcquire() && r.tryAcquire(), "the first 3 calls should succeed");
    check(!r.tryAcquire(), "the 4th call should fail");
});
test("refills over time", () -> {
    long[] now = {0};
    var r = new RateLimiter(2, 2, () -> now[0]);
    r.tryAcquire(); r.tryAcquire();
    check(!r.tryAcquire(), "bucket should be empty");
    now[0] += SECOND / 2;
    check(r.tryAcquire(), "one token should be back after 0.5 s");
    check(!r.tryAcquire(), "only one token should be back after 0.5 s");
});
test("never holds more than capacity", () -> {
    long[] now = {0};
    var r = new RateLimiter(2, 10, () -> now[0]);
    r.tryAcquire(); r.tryAcquire();
    now[0] += 60 * SECOND;
    int ok = 0;
    for (int i = 0; i < 10; i++) if (r.tryAcquire()) ok++;
    eq(2, ok);
});
test("partial refills add up", () -> {
    long[] now = {0};
    var r = new RateLimiter(1, 1, () -> now[0]);
    r.tryAcquire();
    now[0] += SECOND * 4 / 10;
    check(!r.tryAcquire(), "no token after 0.4 s");
    now[0] += SECOND * 4 / 10;
    check(!r.tryAcquire(), "no token after 0.8 s");
    now[0] += SECOND * 3 / 10;
    check(r.tryAcquire(), "a token after 1.1 s (fractions must not be lost)");
});
test("thread-safe under contention", () -> {
    var r = new RateLimiter(1000, 1, () -> 0L);
    var ok = new AtomicInteger();
    var start = new CountDownLatch(1);
    var pool = Executors.newFixedThreadPool(8);
    for (int t = 0; t < 8; t++) pool.submit(() -> {
        start.await();
        for (int i = 0; i < 500; i++) if (r.tryAcquire()) ok.incrementAndGet();
        return null;
    });
    start.countDown();
    pool.shutdown();
    check(pool.awaitTermination(10, TimeUnit.SECONDS), "threads did not finish");
    eq(1000, ok.get());
});
`,
  },

  // ---------- More Angular (AI review) ----------
  {
    slug: "ng-auth-interceptor",
    tech: "angular",
    title: "Auth HTTP interceptor",
    level: "medium",
    language: "typescript",
    description: `Write a functional \`HttpInterceptorFn\` named \`authInterceptor\`.

- Add \`Authorization: Bearer <token>\` from an injected \`AuthService\` to requests for \`/api/\` only.
- On a **401** response, call \`authService.logout()\` and navigate to \`/login\`, then rethrow.
- Show how to register it with \`provideHttpClient(withInterceptors([...]))\`.`,
    starter: `import { HttpInterceptorFn } from "@angular/common/http";

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // your code
  return next(req);
};
`,
  },
  {
    slug: "ng-signup-form",
    tech: "angular",
    title: "Signup form with custom validators",
    level: "medium",
    language: "typescript",
    description: `Build a standalone \`SignupComponent\` with a **typed reactive form**: \`email\`, \`password\`, \`confirmPassword\`.

- \`email\`: required + email format. \`password\`: at least 8 chars with a digit (custom validator).
- Group-level validator: passwords must match; show the error under \`confirmPassword\`.
- Show field errors only after the field is touched; disable submit while invalid.`,
    starter: `import { Component, inject } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";

@Component({
  selector: "app-signup",
  standalone: true,
  imports: [ReactiveFormsModule],
  template: \`<!-- your form -->\`,
})
export class SignupComponent {
  private fb = inject(FormBuilder);
  // your code
}
`,
  },

  // ---------- SQL (runnable) ----------
  {
    slug: "sql-top-customers",
    tech: "sql",
    title: "Top customers by spending",
    level: "easy",
    language: "sql",
    description: `Tables:

${SHOP_DOC}

Return the **top 3 customers by total order amount**: columns \`name\`, \`total\`, highest total first.`,
    starter: `SELECT
  -- your query
`,
    sql: {
      setup: SHOP_SCHEMA,
      solution: `SELECT c.name, SUM(o.amount) AS total FROM customers c JOIN orders o ON o.customer_id = c.id
                 GROUP BY c.id ORDER BY total DESC LIMIT 3`,
      ordered: true,
      variants: [{ name: "Changed data: Emma places a big order", sql: "INSERT INTO orders VALUES (8,5,900.0,'2026-05-01');" }],
    },
  },
  {
    slug: "sql-no-orders",
    tech: "sql",
    title: "Customers without orders",
    level: "easy",
    language: "sql",
    description: `Tables:

${SHOP_DOC}

List the \`name\` of every customer who has **never placed an order**, sorted by name.`,
    starter: `SELECT
  -- your query
`,
    sql: {
      setup: SHOP_SCHEMA,
      solution: `SELECT name FROM customers c WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id) ORDER BY name`,
      ordered: true,
      variants: [
        { name: "Changed data: new customers, one with an order", sql: "INSERT INTO customers VALUES (6,'Zoe','FR'),(7,'Adam','US'); INSERT INTO orders VALUES (8,7,10.0,'2026-05-01');" },
      ],
    },
  },
  {
    slug: "sql-top-salary-per-dept",
    tech: "sql",
    title: "Highest paid per department",
    level: "medium",
    language: "sql",
    description: `Table:

\`\`\`sql
employees(id, name, dept, salary)
\`\`\`

For each department, return the employee(s) with the **highest salary** — include everyone tied for first. Columns: \`dept\`, \`name\`, \`salary\`, sorted by \`dept\` then \`name\`.`,
    starter: `SELECT
  -- your query
`,
    sql: {
      setup: STAFF_SCHEMA,
      solution: `SELECT dept, name, salary FROM (
                   SELECT dept, name, salary, RANK() OVER (PARTITION BY dept ORDER BY salary DESC) AS r FROM employees
                 ) WHERE r = 1 ORDER BY dept, name`,
      ordered: true,
      variants: [{ name: "Changed data: a new tie in HR", sql: "INSERT INTO employees VALUES (8,'Hal','HR',4800);" }],
    },
  },

  // ---------- Node.js (runnable) ----------
  {
    slug: "node-compose-middleware",
    tech: "nodejs",
    title: "Compose async middleware",
    level: "medium",
    language: "javascript",
    description: `Write \`compose(middlewares)\` like Koa's: each middleware is \`async (ctx, next) => {}\`. \`compose\` returns \`(ctx) => Promise\` that runs them in order.

- \`await next()\` runs the rest of the chain, then control comes back ("onion" order).
- A middleware that doesn't call \`next\` stops the chain.
- Calling \`next()\` twice in one middleware rejects with an \`Error\`.
- Errors thrown anywhere reject the returned promise.`,
    starter: `function compose(middlewares) {
  return function (ctx) {
    // your code
  };
}
`,
    tests: `
test("onion order", async () => {
  const log = [];
  const run = compose([
    async (ctx, next) => { log.push(1); await next(); log.push(4); },
    async (ctx, next) => { log.push(2); await next(); log.push(3); },
  ]);
  await run({});
  expect(log).toEqual([1, 2, 3, 4]);
});
test("shares ctx", async () => {
  const ctx = {};
  await compose([async (c, next) => { c.a = 1; await next(); }, async (c) => { c.b = c.a + 1; }])(ctx);
  expect(ctx).toEqual({ a: 1, b: 2 });
});
test("stops when next is not called", async () => {
  let reached = false;
  await compose([async () => {}, async () => { reached = true; }])({});
  expect(reached).toBe(false);
});
test("empty chain resolves", async () => { await compose([])({}); });
test("errors reject", async () => {
  let msg;
  try { await compose([async (c, next) => next(), async () => { throw new Error("boom"); }])({}); } catch (e) { msg = e.message; }
  expect(msg).toBe("boom");
});
test("next() twice rejects", async () => {
  let failed = false;
  try { await compose([async (c, next) => { await next(); await next(); }])({}); } catch { failed = true; }
  expect(failed).toBe(true);
});
`,
  },
  {
    slug: "node-event-emitter",
    tech: "nodejs",
    title: "Build an EventEmitter",
    level: "easy",
    language: "javascript",
    description: `Write a class \`Emitter\` with:

- \`on(event, listener)\` — returns \`this\` for chaining.
- \`off(event, listener)\` — removes one registration.
- \`once(event, listener)\` — runs at most once; \`off\` with the original listener must also remove it.
- \`emit(event, ...args)\` — calls listeners in registration order, returns \`true\` if there were listeners.

Removing a listener while \`emit\` is running must not skip the others.`,
    starter: `class Emitter {
  // your code
}
`,
    tests: `
test("on + emit with args", () => {
  const e = new Emitter(); let got;
  e.on("x", (a, b) => { got = a + b; });
  expect(e.emit("x", 2, 3)).toBe(true);
  expect(got).toBe(5);
});
test("emit without listeners returns false", () => expect(new Emitter().emit("nope")).toBe(false));
test("order and chaining", () => {
  const e = new Emitter(); const log = [];
  e.on("x", () => log.push(1)).on("x", () => log.push(2));
  e.emit("x");
  expect(log).toEqual([1, 2]);
});
test("off removes", () => {
  const e = new Emitter(); let n = 0; const f = () => n++;
  e.on("x", f); e.off("x", f); e.emit("x");
  expect(n).toBe(0);
});
test("once runs once", () => {
  const e = new Emitter(); let n = 0;
  e.once("x", () => n++); e.emit("x"); e.emit("x");
  expect(n).toBe(1);
});
test("off works for once listeners", () => {
  const e = new Emitter(); let n = 0; const f = () => n++;
  e.once("x", f); e.off("x", f); e.emit("x");
  expect(n).toBe(0);
});
test("removing during emit does not skip others", () => {
  const e = new Emitter(); const log = [];
  const a = () => { log.push("a"); e.off("x", a); };
  e.on("x", a); e.on("x", () => log.push("b"));
  e.emit("x");
  expect(log).toEqual(["a", "b"]);
});
`,
  },

  // ---------- C# (runnable when CODE_RUNNER=docker) ----------
  {
    slug: "csharp-linq-report",
    tech: "csharp",
    title: "LINQ order report",
    level: "easy",
    language: "csharp",
    description: `Given \`record Order(int Id, string Customer, DateOnly Date, decimal Amount)\`, write LINQ queries that return:

1. Total amount per customer, highest first.
2. For each month of 2026 that has orders, the number of orders and the average amount, by month.
3. Customers whose **every** order is above 100, by name.

Explain where deferred execution matters in your code.`,
    starter: `public record Order(int Id, string Customer, DateOnly Date, decimal Amount);

public static class OrderReport
{
    public static IEnumerable<(string Customer, decimal Total)> TotalsByCustomer(IEnumerable<Order> orders)
    {
        // your code
        throw new NotImplementedException();
    }

    public static IEnumerable<(int Month, int Count, decimal Average)> MonthlyStats2026(IEnumerable<Order> orders)
    {
        // your code
        throw new NotImplementedException();
    }

    public static IEnumerable<string> CustomersAllAbove100(IEnumerable<Order> orders)
    {
        // your code
        throw new NotImplementedException();
    }
}
`,
    tests: `
static readonly List<Order> Orders =
[
    new(1, "Ana", new DateOnly(2026, 1, 10), 150m),
    new(2, "Ben", new DateOnly(2026, 1, 20), 50m),
    new(3, "Ana", new DateOnly(2026, 2, 5), 200m),
    new(4, "Cy", new DateOnly(2026, 2, 7), 120m),
    new(5, "Ben", new DateOnly(2025, 12, 31), 310m),
    new(6, "Cy", new DateOnly(2026, 3, 1), 101m),
];

public static async Task Run()
{
    await Test("totals per customer, highest first", () =>
        Seq([("Ben", 360m), ("Ana", 350m), ("Cy", 221m)], OrderReport.TotalsByCustomer(Orders)));
    await Test("monthly stats for 2026 only", () =>
        Seq([(1, 2, 100m), (2, 2, 160m), (3, 1, 101m)], OrderReport.MonthlyStats2026(Orders)));
    await Test("customers whose every order is above 100", () =>
        Seq(["Ana", "Cy"], OrderReport.CustomersAllAbove100(Orders)));
    await Test("empty input", () =>
    {
        Check(!OrderReport.TotalsByCustomer([]).Any(), "totals should be empty");
        Check(!OrderReport.MonthlyStats2026([]).Any(), "monthly stats should be empty");
        Check(!OrderReport.CustomersAllAbove100([]).Any(), "customer list should be empty");
    });
}
`,
  },
  {
    slug: "csharp-fetch-all",
    tech: "csharp",
    title: "Async fetch with throttling",
    level: "hard",
    language: "csharp",
    description: `Write \`Task<IReadOnlyList<string>> FetchAllAsync(IEnumerable<string> urls, int maxConcurrency, CancellationToken ct)\` using an injected \`HttpClient\`.

- At most \`maxConcurrency\` requests at once; results in input order.
- Respect cancellation; don't block threads (\`.Result\` / \`.Wait()\`).
- Decide and explain what happens when one request fails.`,
    starter: `public class Downloader(HttpClient http)
{
    public async Task<IReadOnlyList<string>> FetchAllAsync(IEnumerable<string> urls, int maxConcurrency, CancellationToken ct)
    {
        // your code
        throw new NotImplementedException();
    }
}
`,
    tests: `
// Fake server: no real network. Tracks how many requests are in flight.
class FakeHandler(Func<string, int> delayMs) : HttpMessageHandler
{
    int inFlight;
    public int Peak;

    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
    {
        var url = request.RequestUri!.ToString();
        var now = Interlocked.Increment(ref inFlight);
        lock (this) Peak = Math.Max(Peak, now);
        try
        {
            await Task.Delay(delayMs(url), ct);
            return new HttpResponseMessage(System.Net.HttpStatusCode.OK) { Content = new StringContent("body of " + url) };
        }
        finally { Interlocked.Decrement(ref inFlight); }
    }
}

static readonly List<string> Urls = Enumerable.Range(0, 8).Select(i => $"https://example.com/{i}").ToList();

public static async Task Run()
{
    await Test("results in input order", async () =>
    {
        var handler = new FakeHandler(url => 80 - Urls.IndexOf(url) * 10);
        var result = await new Downloader(new HttpClient(handler)).FetchAllAsync(Urls, 8, CancellationToken.None);
        Seq(Urls.Select(u => "body of " + u), result);
    });
    await Test("never more than maxConcurrency at once", async () =>
    {
        var handler = new FakeHandler(_ => 20);
        await new Downloader(new HttpClient(handler)).FetchAllAsync(Urls, 3, CancellationToken.None);
        Check(handler.Peak <= 3, $"{handler.Peak} requests were in flight at once");
    });
    await Test("runs requests concurrently", async () =>
    {
        var handler = new FakeHandler(_ => 20);
        await new Downloader(new HttpClient(handler)).FetchAllAsync(Urls, 3, CancellationToken.None);
        Eq(3, handler.Peak);
    });
    await Test("stops quickly when cancelled", async () =>
    {
        var handler = new FakeHandler(_ => 5000);
        using var cts = new CancellationTokenSource(100);
        var clock = System.Diagnostics.Stopwatch.StartNew();
        var cancelled = false;
        try { await new Downloader(new HttpClient(handler)).FetchAllAsync(Urls, 2, cts.Token); }
        catch (OperationCanceledException) { cancelled = true; }
        Check(cancelled, "expected an OperationCanceledException");
        Check(clock.ElapsedMilliseconds < 2000, $"took {clock.ElapsedMilliseconds} ms to stop");
    });
}
`,
  },

  // ---------- Docker & Git (AI review) ----------
  {
    slug: "docker-node-image",
    tech: "devops",
    title: "Production Dockerfile for a Node app",
    level: "medium",
    language: "dockerfile",
    description: `Write a Dockerfile for a Node.js/TypeScript API: \`npm run build\` outputs \`dist/\`, the server starts with \`node dist/server.js\` on port 3000.

- Multi-stage build; the final image has only production dependencies and \`dist/\`.
- Good layer caching (dependencies installed before copying source).
- Runs as a non-root user, handles \`SIGTERM\` properly, includes a \`HEALTHCHECK\` on \`/health\`.
- List what you'd put in \`.dockerignore\` (as a comment).`,
    starter: `# your Dockerfile
FROM node:22-alpine
`,
  },
  {
    slug: "git-clean-history",
    tech: "devops",
    title: "Clean up a feature branch",
    level: "medium",
    language: "shell",
    description: `Your branch \`feature/search\` has 5 messy commits ("wip", "fix", "fix again"…) and \`main\` moved ahead since you branched. The branch is already pushed, and only you work on it.

Write the exact Git commands (with short comments) to:

1. Update your local view of \`main\`.
2. Squash your 5 commits into one commit with a good message.
3. Put your work on top of the latest \`main\`, resolving a conflict in \`src/search.ts\`.
4. Update the remote branch **safely**.
5. If something goes wrong mid-way, get back to where you started.`,
    starter: `# 1. update main
`,
  },
];

export function getWorkshop(slug: string) {
  return workshops.find((w) => w.slug === slug);
}
