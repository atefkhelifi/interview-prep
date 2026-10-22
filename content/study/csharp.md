# C# / .NET

## C# language & OOP

**Key ideas**

- **Value types** (`struct`, `int`, `bool`, `enum`) live inline and are copied; **reference types** (`class`, `string`, arrays) are shared by reference.
- Nullable reference types (`string?`) let the compiler warn about possible `null`s.
- **Records** (`record Person(string Name, int Age)`) give value equality, immutability by default and `with` expressions.
- Properties (`public int Age { get; init; }`), interfaces with default methods, `abstract` vs `virtual` / `override`, `sealed`.
- Pattern matching: `is`, `switch` expressions, property and relational patterns.
- `IDisposable` + `using` for deterministic cleanup of unmanaged resources.

```csharp
public abstract record Shape;
public record Circle(double R) : Shape;
public record Square(double Side) : Shape;

static double Area(Shape s) => s switch
{
    Circle c => Math.PI * c.R * c.R,
    Square q => q.Side * q.Side,
    _ => throw new ArgumentOutOfRangeException(nameof(s)),
};
```

**Common questions**

- **`class` vs `struct` vs `record`?** Class: reference, identity equality. Struct: value, copied, best small and immutable. Record: reference (or `record struct`) with value equality.
- **`abstract class` vs `interface`?** Abstract class shares state and implementation (single inheritance); interfaces define contracts (many per class).
- **What are `ref`, `out`, `in`?** Pass by reference: `ref` read/write, `out` must be assigned by the method, `in` read-only.

**Traps**

- Boxing a value type into `object` allocates and copies.
- Mutable structs behave surprisingly (copies get modified, not the original).

## LINQ & collections

**Key ideas**

- Collections: `List<T>`, `Dictionary<TKey,TValue>`, `HashSet<T>`, `Queue<T>`, `Stack<T>`; immutable and concurrent variants exist.
- LINQ operators: `Where`, `Select`, `SelectMany`, `GroupBy`, `OrderBy`, `Join`, `Any`, `All`, `First(OrDefault)`, `Sum`, `Aggregate`.
- **Deferred execution:** most LINQ queries run when enumerated (`foreach`, `ToList()`, `Count()`), not when defined.
- `IEnumerable<T>` runs in memory; `IQueryable<T>` builds an expression tree translated by a provider (EF Core → SQL).

```csharp
var topCustomers = orders
    .GroupBy(o => o.CustomerId)
    .Select(g => new { CustomerId = g.Key, Total = g.Sum(o => o.Amount) })
    .OrderByDescending(x => x.Total)
    .Take(3)
    .ToList();
```

**Common questions**

- **`IEnumerable` vs `IQueryable`?** `IEnumerable` filters in memory after loading; `IQueryable` pushes filters to the data source.
- **`First` vs `Single` vs `FirstOrDefault`?** `First` throws if empty; `Single` throws if not exactly one; `...OrDefault` returns default instead of throwing on empty.

**Traps**

- Enumerating a deferred query several times re-runs it (and re-queries the database).
- Calling `ToList()` too early on an `IQueryable` loads the whole table.

## Async & tasks

**Key ideas**

- `async`/`await` frees the thread while waiting for I/O. A `Task` represents ongoing work; `Task<T>` returns a value.
- `Task.WhenAll` runs operations concurrently; `Task.WhenAny` takes the first to finish.
- `CancellationToken` is passed down so callers can cancel long work.
- CPU-bound work: `Task.Run` or `Parallel.ForEach`; I/O-bound: async APIs.
- `SemaphoreSlim` limits concurrency in async code.

```csharp
public async Task<string[]> FetchAllAsync(IEnumerable<string> urls, CancellationToken ct)
{
    using var gate = new SemaphoreSlim(4);
    var tasks = urls.Select(async url =>
    {
        await gate.WaitAsync(ct);
        try { return await http.GetStringAsync(url, ct); }
        finally { gate.Release(); }
    });
    return await Task.WhenAll(tasks);
}
```

**Common questions**

- **Why avoid `.Result` / `.Wait()`?** They block a thread and can deadlock in contexts with a synchronization context (old ASP.NET, UI apps).
- **What does `ConfigureAwait(false)` do?** Doesn't resume on the captured context — useful in libraries.
- **`async void`?** Only for event handlers; exceptions can't be awaited or caught by the caller.

**Traps**

- Forgetting to `await` a task silently drops exceptions.
- `lock` can't contain `await`; use `SemaphoreSlim`.

## ASP.NET Core

**Key ideas**

- **Middleware pipeline:** each component handles the request or calls the next (`app.UseAuthentication()`, `app.UseAuthorization()`, routing, endpoints). Order matters.
- **Dependency injection** is built in. Lifetimes: **Singleton** (one per app), **Scoped** (one per request), **Transient** (new every time).
- APIs: controllers (`[ApiController]`) or **minimal APIs** (`app.MapGet(...)`).
- Configuration from `appsettings.json`, environment variables and secrets, bound with the options pattern (`IOptions<T>`).
- Model validation with data annotations; `[ApiController]` returns 400 automatically.

```csharp
builder.Services.AddScoped<IOrderService, OrderService>();
var app = builder.Build();

app.MapPost("/api/orders", async (CreateOrder req, IOrderService svc) =>
{
    var order = await svc.CreateAsync(req);
    return Results.Created($"/api/orders/{order.Id}", order);
});
```

**Common questions**

- **What happens if a singleton depends on a scoped service?** A captive dependency — the scoped object lives forever; the container throws in development to warn you.
- **Filters vs middleware?** Middleware runs for every request; filters run around MVC actions and know about the action/model.

**Traps**

- Registering `DbContext` as singleton (it isn't thread-safe; it's scoped).
- Wrong middleware order (e.g., `UseAuthorization` before `UseAuthentication`).

## Entity Framework Core

**Key ideas**

- `DbContext` = unit of work + change tracker; `DbSet<T>` = table.
- Migrations: `dotnet ef migrations add Name`, `dotnet ef database update`.
- Loading: eager (`Include`), explicit, lazy (opt-in proxies). Projections with `Select` load only needed columns.
- `AsNoTracking()` for read-only queries is faster.
- `SaveChanges` wraps changes in a transaction; concurrency tokens (`[Timestamp]`) give optimistic locking.

**Common questions**

- **How do you avoid N+1 queries?** `Include` related data or project with `Select` in one query.
- **Tracking vs no-tracking?** Tracking is needed to update entities; no-tracking for reads.

**Traps**

- Client-side evaluation of untranslatable expressions (now throws in EF Core 3+, but watch `AsEnumerable()` placement).
- Long-lived `DbContext` instances accumulate tracked entities and memory.
