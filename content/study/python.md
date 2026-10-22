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
