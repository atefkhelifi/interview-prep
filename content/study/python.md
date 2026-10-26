# Python

## Data types & data model

**Key ideas**

- Everything is an object with an identity (`id`), a type, and a value.
- **Mutable:** `list`, `dict`, `set`, most user objects. **Immutable:** `int`, `float`, `str`, `tuple`, `frozenset`, `bytes`.
- Variables are names bound to objects; assignment never copies.
- `==` compares values (`__eq__`); `is` compares identity. Use `is` only for `None` and singletons.
- `dict` keeps insertion order (3.7+). Keys must be hashable (immutable, with `__hash__`).
- Dunder methods (`__len__`, `__iter__`, `__getitem__`, `__enter__`…) let your classes plug into built-in syntax.

```python
a = [1, 2]
b = a          # same list
b.append(3)
a              # [1, 2, 3]
c = a.copy()   # shallow copy; copy.deepcopy for nested
```

**Common questions**

- **List vs tuple?** List is mutable, tuple immutable and hashable (if contents are) — usable as dict keys.
- **How does a dict work?** Hash table: key hash picks a slot, average O(1) get/set.
- **Shallow vs deep copy?** Shallow copies the container only; nested objects are shared. `copy.deepcopy` copies recursively.
- **What are list / dict comprehensions?** Concise loops that build collections: `{k: v for k, v in pairs if v}`.

**Traps**

- Mutable default arguments are created once: `def f(x=[])` shares the list across calls. Use `None` and create inside.
- `[[0] * 3] * 3` makes three references to the same inner list.
- Integer caching makes `is` "work" for small ints — never rely on it.

## Functions & decorators

**Key ideas**

- Functions are first-class objects: pass, return, store them.
- Arguments: positional, keyword, defaults, `*args`, `**kwargs`, keyword-only (after `*`), positional-only (before `/`).
- **LEGB** scope lookup: Local → Enclosing → Global → Built-in. `nonlocal` / `global` to rebind outer names.
- A **decorator** is a function that takes a function and returns a replacement. Use `functools.wraps` to keep name and docstring.
- Useful built-ins: `functools.lru_cache`, `functools.partial`, `contextlib.contextmanager`.

```python
import functools, time

def timed(fn):
    @functools.wraps(fn)
    def wrapper(*args, **kwargs):
        start = time.perf_counter()
        try:
            return fn(*args, **kwargs)
        finally:
            print(f"{fn.__name__} took {time.perf_counter() - start:.3f}s")
    return wrapper
```

**Common questions**

- **How do you write a decorator with arguments?** Three levels: a factory taking the args returns the decorator, which returns the wrapper.
- **What is a closure in Python?** An inner function that remembers variables from the enclosing function (`fn.__closure__`).
- **`*args` and `**kwargs`?** Collect extra positional args into a tuple and extra keyword args into a dict.

**Traps**

- Late binding in closures: `[lambda: i for i in range(3)]` all return 2. Bind with a default `lambda i=i: i`.
- Assigning to a name inside a function makes it local for the whole function → `UnboundLocalError`.

## Iterators & generators

**Key ideas**

- An **iterable** has `__iter__`; an **iterator** has `__next__` and raises `StopIteration` when done.
- A **generator** function uses `yield`; it produces values lazily and keeps its state between calls.
- Generator expressions `(x * 2 for x in data)` use constant memory.
- `yield from` delegates to a sub-generator.
- `itertools` (`chain`, `islice`, `groupby`, `product`) for efficient iteration.

```python
def read_lines(path):
    with open(path) as f:
        for line in f:
            yield line.rstrip()

errors = (l for l in read_lines("app.log") if "ERROR" in l)
```

**Common questions**

- **Why use generators?** Lazy evaluation: process huge or infinite streams without loading everything into memory.
- **Iterator vs iterable?** You can loop an iterable many times (it gives a fresh iterator); an iterator is consumed once.
- **What does a context manager do?** Guarantees setup/teardown with `with` via `__enter__` / `__exit__` (files, locks, transactions).

**Traps**

- A generator is exhausted after one pass — second loop yields nothing.
- `groupby` only groups *consecutive* equal keys; sort first.

## OOP

**Key ideas**

- Classes define attributes and methods; `self` is the instance passed explicitly.
- `@classmethod` gets the class (alternate constructors); `@staticmethod` gets nothing (namespaced function); `@property` for computed attributes.
- Inheritance uses **MRO** (C3 linearization); `super()` follows the MRO, important with multiple inheritance.
- `@dataclass` generates `__init__`, `__repr__`, `__eq__`; `frozen=True` makes instances immutable.
- Duck typing: "if it walks like a duck…". `typing.Protocol` gives static duck typing; `abc.ABC` for enforced abstract methods.
- Python has no real private members — `_name` is convention, `__name` triggers name mangling.

```python
from dataclasses import dataclass

@dataclass(frozen=True)
class Money:
    amount: int
    currency: str = "EUR"

    def __add__(self, other: "Money") -> "Money":
        assert self.currency == other.currency
        return Money(self.amount + other.amount, self.currency)
```

**Common questions**

- **`__init__` vs `__new__`?** `__new__` creates the instance (used for immutables/singletons); `__init__` initializes it.
- **What is the MRO?** The order Python searches base classes for attributes — see `Class.__mro__`.
- **Composition vs inheritance?** Prefer composition (has-a) for flexibility; inheritance for true is-a relations.

**Traps**

- Class attributes that are mutable (e.g. `items = []` at class level) are shared by all instances.
- Overriding `__eq__` without `__hash__` makes instances unhashable.

## Concurrency

**Key ideas**

- The **GIL** (in standard CPython) lets one thread execute Python bytecode at a time. Threads still help for I/O-bound work. Free-threaded builds (3.13+) can remove the GIL, but are opt-in.
- **threading** → I/O-bound tasks. **multiprocessing / ProcessPoolExecutor** → CPU-bound tasks (separate processes, no shared GIL).
- **asyncio** → many concurrent I/O tasks on one thread; `async def`, `await`, `asyncio.gather`, `asyncio.TaskGroup`.
- `concurrent.futures` gives a simple pool API for both threads and processes.

```python
import asyncio, httpx

async def fetch_all(urls):
    async with httpx.AsyncClient() as client:
        return await asyncio.gather(*(client.get(u) for u in urls))
```

**Common questions**

- **Threads vs processes vs asyncio?** Threads: I/O, simple. Processes: CPU work. asyncio: thousands of I/O connections with low overhead.
- **What happens if you call blocking code in async code?** It blocks the event loop; use `asyncio.to_thread` or an async library.
- **What is a race condition and how do you prevent it?** Unsynchronized access to shared state; use locks, queues, or avoid shared state.

**Traps**

- Calling an `async` function without `await` just creates a coroutine — nothing runs.
- `time.sleep` inside async code freezes everything; use `await asyncio.sleep`.

## Web (FastAPI / Django)

**Key ideas**

- **FastAPI:** async-first, type hints + Pydantic for validation and auto OpenAPI docs, dependency injection with `Depends`.
- **Django:** batteries-included — ORM, migrations, admin, auth, templates. MVT pattern (Model–View–Template).
- WSGI (sync, Django classic, Flask) vs ASGI (async, FastAPI, Django async views).
- ORM pitfalls: N+1 queries — use `select_related` (FK joins) and `prefetch_related` (many-to-many) in Django.

```python
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

class Item(BaseModel):
    name: str
    price: float

@app.post("/items")
async def create(item: Item) -> Item:
    return item  # validated by Pydantic
```

**Common questions**

- **Django vs FastAPI — when?** Django for full apps with admin and ORM out of the box; FastAPI for APIs and async services.
- **What is middleware?** Code wrapping every request/response (auth, logging, CORS).
- **How do Django migrations work?** `makemigrations` creates migration files from model changes; `migrate` applies them.

**Traps**

- Loading related objects inside a loop (N+1).
- Using blocking DB drivers in async FastAPI endpoints.

## Type hints & dataclasses

**Key ideas**

- Type hints are not checked at runtime; tools like **mypy** or **pyright** check them statically.
- Modern syntax: `list[int]`, `dict[str, int]`, `int | None`, `type Alias = ...` (3.12).
- `Protocol` = structural typing ("anything with a `.read()` method"); `TypeVar` / `def f[T](x: T) -> T` for generics.
- **`@dataclass`** generates `__init__`, `__repr__`, `__eq__`. Options: `frozen=True` (immutable, hashable), `slots=True` (less memory), `order=True`.
- **Pydantic** validates and converts data at runtime (APIs, config); dataclasses do not validate.
- `NamedTuple` for small immutable records; `TypedDict` to type plain dicts (e.g. JSON).

```python
from dataclasses import dataclass, field

@dataclass(frozen=True, slots=True)
class Order:
    id: int
    items: list[str] = field(default_factory=list)  # never a shared [] default
    discount: float | None = None
```

**Common questions**

- **Dataclass vs Pydantic model?** Dataclass: lightweight container, no validation. Pydantic: parses and validates input, gives clear errors, serializes to JSON.
- **Do type hints make Python faster?** No. They help readers, editors and static checkers only.
- **What is `Protocol` for?** Describing an interface by shape, so any class with the right methods matches without inheriting.

**Traps**

- `items: list = []` as a default is shared by all instances — dataclasses refuse it; use `default_factory`.
- `frozen=True` freezes the fields, not the objects inside them (a list field can still change).
- `Optional[X]` means "may be `None`", not "argument is optional".

## Errors & context managers

**Key ideas**

- `try / except / else / finally`: `else` runs only if no exception; `finally` always runs.
- Catch specific exceptions. Define your own by subclassing `Exception`.
- `raise NewError(...) from e` keeps the original cause in the traceback.
- **EAFP** ("easier to ask forgiveness"): try the operation and handle the error, rather than checking everything first.
- **Context managers** (`with`) guarantee cleanup: files, locks, DB transactions. Implement `__enter__` / `__exit__`, or use `@contextmanager`.
- `ExceptionGroup` and `except*` (3.11) handle several errors at once, e.g. from `asyncio.TaskGroup`.

```python
from contextlib import contextmanager
import time

@contextmanager
def timer(label: str):
    start = time.perf_counter()
    try:
        yield
    finally:
        print(f"{label}: {time.perf_counter() - start:.3f}s")

with timer("load"):
    data = load_data()
```

**Common questions**

- **What happens if `__exit__` returns `True`?** The exception is swallowed. Return `False`/`None` to let it propagate.
- **Why not `except Exception: pass`?** It hides bugs. At minimum, log the error; usually catch something narrower.
- **`raise` vs `raise e` vs `raise X from e`?** Bare `raise` re-raises with the original traceback; `from e` chains a new error to the cause.

**Traps**

- Bare `except:` also catches `KeyboardInterrupt` and `SystemExit`.
- A `return` inside `finally` silently discards the exception.
- Opening files without `with` leaks file handles when an error happens.

## Testing (pytest)

**Key ideas**

- Tests are plain functions named `test_*` with plain `assert`; pytest shows detailed diffs on failure.
- **Fixtures** provide setup and teardown (`yield` inside a fixture); scope can be `function`, `module` or `session`. Shared fixtures go in `conftest.py`.
- `@pytest.mark.parametrize` runs one test with many inputs.
- `pytest.raises(ValueError)` asserts an exception.
- Mocking: `unittest.mock.patch` or the `monkeypatch` fixture. Patch where the name is **used**, not where it is defined.
- Built-in fixtures: `tmp_path` (temp dir), `capsys` (captured output). Coverage via `pytest-cov`.

```python
import pytest

@pytest.fixture
def cart():
    return Cart()

@pytest.mark.parametrize("qty,expected", [(1, 10), (3, 30), (0, 0)])
def test_total(cart, qty, expected):
    cart.add("book", price=10, qty=qty)
    assert cart.total() == expected

def test_negative_qty(cart):
    with pytest.raises(ValueError):
        cart.add("book", price=10, qty=-1)
```

**Common questions**

- **Fixture vs `setUp` method?** Fixtures are injected by name, composable and can be shared across files with any scope; `setUp` is tied to one class.
- **Where do you patch?** In the module that imports the name: `patch("app.service.requests.get")`, not `patch("requests.get")` if `app.service` did `from requests import get`.
- **How do you test async code?** `pytest-asyncio` (or `anyio`) and `async def test_...`.

**Traps**

- Patching the wrong path — the real function still runs.
- Session-scoped fixtures holding mutable state leak between tests.
- Tests that depend on the order they run in.

## Strings & formatting

**Key ideas**

- Strings are **immutable** Unicode sequences; `bytes` are raw bytes. Convert with `.encode()` / `.decode("utf-8")`.
- **f-strings**: `f"{name!r}"`, `f"{price:.2f}"`, `f"{n:,}"`, `f"{x=}"` (debug).
- Useful methods: `split`, `join`, `strip`, `replace`, `startswith`, `removeprefix`, `partition`, `casefold`.
- Slicing: `s[::-1]` reverses, `s[-3:]` takes the last three.
- Build big strings with `"".join(parts)`, not `+=` in a loop.

```python
name, price, qty = "Coffee", 3.5, 1200
print(f"{name:<10}|{price:>8.2f}|{qty:,}")  # "Coffee    |    3.50|1,200"

words = "  The quick brown fox ".split()
print("-".join(w.lower() for w in words))     # "the-quick-brown-fox"
```

**Common questions**

- **How do you check if a string is a palindrome?** `s == s[::-1]` after normalizing case and removing non-letters.
- **`str` vs `bytes`?** `str` is text (Unicode code points); `bytes` are binary data. Files and sockets deal in bytes; decode at the edges.
- **`==` vs `is` for strings?** Always `==`. `is` checks identity; small strings may be interned, so `is` sometimes "works" by accident.

**Traps**

- `s.strip("abc")` removes any of those characters, not the substring "abc" — use `removeprefix`/`removesuffix`.
- `lower()` is not enough for case-insensitive matching in all languages — use `casefold()`.
- Opening text files without `encoding="utf-8"` uses the OS default (breaks on Windows).

## Comprehensions & unpacking

**Key ideas**

- List `[x * 2 for x in nums if x > 0]`, dict `{k: v for k, v in pairs}`, set `{w.lower() for w in words}`.
- **Generator expressions** `(x for x in data)` are lazy — good for `sum`, `any`, `max` over large data.
- Nested comprehensions read left to right like nested loops.
- **Unpacking:** `a, b = b, a`, `first, *rest = items`, `**dict` merges, `*args` in calls.
- Walrus `:=` assigns inside an expression.

```python
matrix = [[1, 2, 3], [4, 5, 6]]
flat = [n for row in matrix for n in row]           # [1, 2, 3, 4, 5, 6]
transposed = [list(col) for col in zip(*matrix)]     # [[1, 4], [2, 5], [3, 6]]

defaults = {"debug": False, "port": 8000}
config = {**defaults, **user_config}                 # later keys win

if (n := len(items)) > 10:
    print(f"Too many items: {n}")
```

**Common questions**

- **List comprehension vs generator expression?** List builds everything in memory now; generator yields one item at a time.
- **When not to use a comprehension?** When it has side effects or becomes hard to read — use a normal loop.
- **How do you swap two variables?** `a, b = b, a` (tuple packing/unpacking).

**Traps**

- `[[0] * 3] * 3` creates three references to the same inner list.
- A generator can be iterated only once.
- Variables in comprehensions don't leak, but in normal `for` loops they do.

## Scope & closures

**Key ideas**

- Name lookup follows **LEGB**: Local → Enclosing → Global → Built-in.
- Assigning to a name inside a function makes it local, unless declared `global` or `nonlocal`.
- **Closures**: an inner function remembers variables from the enclosing function.
- Closures capture **variables**, not values — late binding.
- Closures are the basis of decorators and function factories.

```python
def make_counter():
    count = 0
    def inc():
        nonlocal count
        count += 1
        return count
    return inc

c = make_counter()
c(); c()  # 2

# Late binding trap and fix
funcs = [lambda: i for i in range(3)]          # all return 2
funcs = [lambda i=i: i for i in range(3)]      # 0, 1, 2
```

**Common questions**

- **What does `nonlocal` do?** Lets an inner function rebind a variable of the enclosing function.
- **Why `UnboundLocalError`?** You assign to a name somewhere in the function, so it's local everywhere in it — reading it before assignment fails.
- **`global` — good idea?** Rarely. Prefer passing values or using a class.

**Traps**

- Lambdas in a loop all see the last value of the loop variable.
- Shadowing built-ins (`list = [...]`, `id = 5`) breaks later code.
- Mutable default arguments are shared across calls (`def f(x=[])`).

## Magic methods

**Key ideas**

- "Dunder" methods hook into Python syntax: `__init__`, `__repr__`, `__str__`, `__eq__`, `__hash__`, `__lt__`, `__len__`, `__getitem__`, `__iter__`, `__contains__`, `__call__`, `__enter__`/`__exit__`, `__add__`.
- `__repr__` is for developers (unambiguous); `__str__` for users.
- Defining `__eq__` sets `__hash__` to `None` unless you define it too.
- `functools.total_ordering` fills in comparison methods from `__eq__` + one of `__lt__`, etc.
- `__slots__` fixes allowed attributes and saves memory.

```python
class Money:
    __slots__ = ("amount", "currency")

    def __init__(self, amount, currency):
        self.amount, self.currency = amount, currency

    def __add__(self, other):
        if self.currency != other.currency:
            return NotImplemented
        return Money(self.amount + other.amount, self.currency)

    def __eq__(self, other):
        return (self.amount, self.currency) == (other.amount, other.currency)

    def __hash__(self):
        return hash((self.amount, self.currency))

    def __repr__(self):
        return f"Money({self.amount!r}, {self.currency!r})"
```

**Common questions**

- **`__new__` vs `__init__`?** `__new__` creates the instance (used for immutables and singletons); `__init__` initializes it.
- **How do you make an object usable in `for` loops?** Implement `__iter__` (or `__getitem__` with integer indexes).
- **Why return `NotImplemented`?** Lets Python try the other operand's reflected method (`__radd__`) instead of failing immediately.

**Traps**

- Objects with `__eq__` but no `__hash__` can't go in sets or be dict keys.
- A hash that depends on mutable fields breaks dicts when the fields change.
- `__del__` is not a reliable destructor — use context managers.

## Modules, packages & environments

**Key ideas**

- A **module** is a `.py` file; a **package** is a folder of modules (with `__init__.py` for regular packages).
- `if __name__ == "__main__":` runs code only when the file is executed directly.
- Imports are cached in `sys.modules`; the search path is `sys.path`.
- **Virtual environments** (`python -m venv .venv`) isolate dependencies per project.
- Tools: `pip` + `requirements.txt`, or `pyproject.toml` with **uv**, Poetry, PDM. Lock files pin exact versions.
- Absolute imports (`from app.models import User`) over relative ones in big projects.

```bash
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt

uv init && uv add fastapi       # modern alternative, writes pyproject.toml + uv.lock
```

**Common questions**

- **Why use a virtual environment?** Different projects need different versions of the same package; system Python stays clean.
- **What does `__init__.py` do?** Marks a regular package and runs on import; can expose a public API.
- **How do you fix a circular import?** Move shared code to a third module, import inside the function, or restructure dependencies.

**Traps**

- Naming a file like a library (`random.py`, `requests.py`) shadows the real one.
- `pip install` into the global interpreter by mistake.
- `from module import *` hides where names come from.

## itertools & functools

**Key ideas**

- **itertools** (lazy): `chain`, `islice`, `groupby` (needs sorted input), `product`, `permutations`, `combinations`, `accumulate`, `batched` (3.12), `pairwise`, `count`, `cycle`.
- **functools**: `lru_cache` / `cache` (memoize), `partial` (preset arguments), `reduce`, `wraps` (for decorators), `singledispatch` (overload by type), `cached_property`.
- `operator.itemgetter` / `attrgetter` for fast keys in `sorted`, `max`, `groupby`.

```python
from functools import cache, partial
from itertools import groupby, islice
from operator import itemgetter

@cache
def fib(n): return n if n < 2 else fib(n - 1) + fib(n - 2)

rows = sorted(orders, key=itemgetter("customer"))
for customer, group in groupby(rows, key=itemgetter("customer")):
    print(customer, sum(o["total"] for o in group))

first_ten = list(islice(read_huge_file(), 10))
to_int_base2 = partial(int, base=2)
```

**Common questions**

- **What does `lru_cache` require?** Hashable arguments. It caches results per argument set; `maxsize` limits memory.
- **Why must input be sorted for `groupby`?** It only groups consecutive equal keys.
- **`permutations` vs `combinations`?** Permutations care about order; combinations don't.

**Traps**

- `lru_cache` on methods keeps `self` alive (memory leak) — cache at module level or use `cached_property`.
- Iterators from itertools are single-use.
- `reduce` is often less readable than a loop or `sum`/`max`.

## File I/O & serialization

**Key ideas**

- Always use `with open(path, encoding="utf-8") as f:`. Modes: `r`, `w` (truncates), `a`, `x` (fail if exists), `b` (binary).
- Iterate a file line by line to keep memory low.
- **pathlib**: `Path("data") / "file.txt"`, `.read_text()`, `.exists()`, `.glob("*.csv")`.
- Formats: `json` (`dump`/`load`), `csv` (`DictReader`/`DictWriter`), `tomllib` (read TOML), `pickle` (Python objects).
- Large data: stream it, or use pandas / pyarrow.

```python
import csv, json
from pathlib import Path

out = Path("reports") / "summary.json"
out.parent.mkdir(parents=True, exist_ok=True)

with open("sales.csv", newline="", encoding="utf-8") as f:
    total = sum(float(row["amount"]) for row in csv.DictReader(f))

out.write_text(json.dumps({"total": total}, indent=2), encoding="utf-8")
```

**Common questions**

- **How do you read a 10 GB file?** Iterate line by line or in chunks (`f.read(1 << 20)`); never `read()` it all.
- **Why is `pickle` dangerous?** Loading a pickle can run arbitrary code — never unpickle untrusted data.
- **How do you serialize dates or custom objects to JSON?** Convert first (`.isoformat()`), or pass `default=` to `json.dumps`, or use Pydantic.

**Traps**

- `"w"` mode erases the file immediately.
- Missing `newline=""` with `csv` on Windows gives blank lines.
- Building paths with string concatenation instead of `pathlib`.

## Memory & performance

**Key ideas**

- CPython uses **reference counting** plus a cycle-detecting **garbage collector**.
- Everything is an object — ints and floats carry overhead; `array`, NumPy or `__slots__` save memory.
- Big-O of built-ins: `list` append O(1), `in list` O(n), `in set/dict` O(1) average, `list.insert(0)` O(n) — use `deque`.
- Measure: `timeit`, `cProfile` + snakeviz, `tracemalloc` for memory, `py-spy` for live processes.
- Speedups: better algorithms, built-ins (written in C), avoiding repeated work, caching, vectorizing with NumPy, `multiprocessing` for CPU-bound work.

```python
import cProfile, pstats

with cProfile.Profile() as prof:
    run_report()
pstats.Stats(prof).sort_stats("cumulative").print_stats(10)

# O(n*m) → O(n+m): turn the lookup list into a set
banned = set(banned_ids)
clean = [u for u in users if u.id not in banned]
```

**Common questions**

- **Why is Python slower than C/Java?** Interpreted bytecode, dynamic typing, boxed objects. Hot loops pay the most.
- **How do you find a memory leak?** `tracemalloc` snapshots compared over time; look for growing caches, global lists, reference cycles with `__del__`.
- **What is the GIL's effect on performance?** Threads don't run Python bytecode in parallel (except free-threaded builds); use processes or native libraries for CPU work.

**Traps**

- Optimizing before profiling.
- String concatenation in loops, `in` checks on lists inside loops.
- Loading full datasets into memory when streaming would do.

## Descriptors & metaclasses

**Key ideas**

- A **descriptor** is an object with `__get__` / `__set__` / `__delete__` placed on a class; it controls attribute access. `property`, methods, `classmethod`, `staticmethod` are descriptors.
- `__set_name__` tells the descriptor its attribute name.
- A **metaclass** is the class of a class (`type` by default); it customizes class creation.
- Most metaclass needs are covered by **`__init_subclass__`** or class decorators — simpler.
- Used by ORMs (Django models, SQLAlchemy) and validation libraries.

```python
class Positive:
    def __set_name__(self, owner, name):
        self.name = "_" + name
    def __get__(self, obj, objtype=None):
        return getattr(obj, self.name)
    def __set__(self, obj, value):
        if value <= 0:
            raise ValueError(f"{self.name[1:]} must be positive")
        setattr(obj, self.name, value)

class Product:
    price = Positive()
    def __init__(self, price): self.price = price

class Plugin:
    registry = []
    def __init_subclass__(cls, **kwargs):
        super().__init_subclass__(**kwargs)
        Plugin.registry.append(cls)   # auto-register subclasses
```

**Common questions**

- **What is a metaclass in one sentence?** The thing that creates classes, the way classes create instances.
- **Data vs non-data descriptor?** Data descriptors define `__set__` and win over the instance `__dict__`; non-data (only `__get__`, like functions) lose to it.
- **When would you use `__init_subclass__`?** Registering plugins, validating subclasses — without a metaclass.

**Traps**

- Storing descriptor values on the descriptor itself shares them across all instances.
- Metaclass conflicts when combining classes with different metaclasses.
- Using magic where a plain function or `property` is clearer.

## Regular expressions

**Key ideas**

- `re.search` (anywhere), `re.match` (at start), `re.fullmatch` (whole string), `re.findall`, `re.finditer`, `re.sub`, `re.split`.
- Use **raw strings** `r"\d+"` so backslashes aren't escaped twice.
- Groups `( )`, named groups `(?P<year>\d{4})`, non-capturing `(?:...)`.
- Quantifiers are greedy; add `?` for lazy (`.*?`).
- Compile reused patterns with `re.compile`; flags `re.I`, `re.M`, `re.S`, `re.X`.

```python
import re

LOG = re.compile(r"(?P<date>\d{4}-\d{2}-\d{2}) (?P<level>ERROR|WARN) (?P<msg>.*)")

for m in LOG.finditer(text):
    print(m["date"], m["level"], m["msg"])

re.sub(r"\s+", " ", "too    many   spaces")   # "too many spaces"
```

**Common questions**

- **`match` vs `search`?** `match` only checks the start of the string; `search` scans the whole string.
- **Greedy vs lazy?** `<.*>` matches as much as possible; `<.*?>` matches as little as possible.
- **Should you validate emails with regex?** Only loosely; real validation is sending a confirmation email.

**Traps**

- Catastrophic backtracking with nested quantifiers (`(a+)+`) — ReDoS on user input.
- Forgetting `r""` and getting `\b` as a backspace character.
- Using regex to parse HTML or JSON — use a parser.

## NumPy & pandas basics

**Key ideas**

- **NumPy** arrays are typed, contiguous memory; operations are **vectorized** (no Python loops) and **broadcast** over shapes.
- **pandas**: `Series` (1-D) and `DataFrame` (table). Load with `read_csv`, `read_sql`, `read_parquet`.
- Select: `df["col"]`, `df.loc[row_labels, cols]`, `df.iloc[positions]`, boolean masks `df[df.age > 30]`.
- Transform: `groupby().agg()`, `merge` (SQL join), `pivot_table`, `apply` (slow, last resort), `fillna`, `dropna`.
- Prefer vectorized column operations over row loops.

```python
import pandas as pd

df = pd.read_csv("orders.csv", parse_dates=["created_at"])
df["total"] = df["qty"] * df["unit_price"]                  # vectorized
monthly = (
    df[df["status"] == "paid"]
    .groupby(df["created_at"].dt.to_period("M"))["total"]
    .agg(["sum", "count"])
)
```

**Common questions**

- **Why is NumPy faster than lists?** Fixed types in contiguous memory and loops in C instead of Python.
- **`loc` vs `iloc`?** `loc` uses labels; `iloc` uses integer positions.
- **How do you handle missing values?** Detect with `isna()`, then `fillna`, `dropna`, or interpolate depending on meaning.

**Traps**

- `SettingWithCopyWarning`: assigning to a slice may not change the original — use `.loc` (copy-on-write in pandas 3 changes this).
- `iterrows()` / `apply` row by row are very slow.
- Integer columns with missing values become floats unless you use nullable dtypes (`Int64`).
