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

## Generics, delegates & events

**Key ideas**

- **Generics** keep type safety without boxing: `List<T>`, `Repository<T> where T : class, IEntity`.
- Constraints: `where T : struct`, `class`, `new()`, `notnull`, a base class or interface.
- **Variance:** `out T` (covariant, e.g. `IEnumerable<out T>`) and `in T` (contravariant, e.g. `Action<in T>`).
- **Delegates** are type-safe function references. Built-ins: `Func<...>` (returns a value), `Action<...>` (void), `Predicate<T>`.
- **Lambdas** create delegates; they capture variables (closures).
- **Events** wrap a delegate so outside code can only `+=` / `-=`, not invoke or overwrite it.

```csharp
public class Order
{
    public event EventHandler<decimal>? Paid;

    public void Pay(decimal amount)
    {
        // ... payment logic
        Paid?.Invoke(this, amount); // notify subscribers
    }
}

var order = new Order();
order.Paid += (_, amount) => Console.WriteLine($"Paid {amount:C}");
```

**Common questions**

- **Delegate vs event?** An event is a delegate field with restricted access: subscribers can add/remove handlers, only the owner can raise it.
- **`Func` vs `Action`?** `Func` returns a value (last type parameter); `Action` returns nothing.
- **Why are generics faster than `object` collections?** No boxing of value types, no casts, errors caught at compile time.

**Traps**

- Forgetting to unsubscribe (`-=`) keeps the subscriber alive — memory leak.
- Lambdas capturing a loop variable or large objects keep them alive longer than expected.
- `async void` event handlers: exceptions can't be caught by the caller.

## Memory & garbage collection

**Key ideas**

- **Value types** (`struct`, `int`) hold data directly; **reference types** (`class`) live on the managed heap.
- Boxing copies a value type into a heap object (e.g. into `object`) — extra allocations.
- The **GC** is generational: Gen 0 (short-lived), Gen 1, Gen 2 (long-lived). Objects over ~85 KB go to the **Large Object Heap**.
- `IDisposable` + `using` release **unmanaged** resources (files, sockets, DB connections) deterministically; the GC only frees memory.
- `Span<T>`, `Memory<T>`, `ArrayPool<T>` and `stackalloc` cut allocations in hot paths.
- `record struct` / `readonly struct` for small immutable values.

```csharp
await using var conn = new SqlConnection(connectionString); // disposed at end of scope
await conn.OpenAsync();

ReadOnlySpan<char> line = "id=42;name=Ada";
var id = int.Parse(line[3..line.IndexOf(';')]); // no substring allocation
```

**Common questions**

- **`Dispose` vs finalizer?** `Dispose` is called by you (via `using`) right away; a finalizer runs later on the GC thread as a safety net and slows collection.
- **Struct vs class — when to use a struct?** Small (≤ 16 bytes or so), immutable, value-like data that is created often.
- **What causes memory leaks in .NET?** Static collections that grow forever, unremoved event handlers, caches without limits, undisposed resources.

**Traps**

- Mutable structs: changing a copy, not the original.
- Calling `GC.Collect()` manually usually hurts performance.
- `new HttpClient()` per request exhausts sockets — use `IHttpClientFactory` or one shared instance.

## Testing (xUnit & Moq)

**Key ideas**

- **xUnit:** `[Fact]` for one case, `[Theory]` + `[InlineData]` for many inputs. A new class instance per test; setup in the constructor, cleanup in `Dispose`.
- **Moq / NSubstitute** mock interfaces: `mock.Setup(...).ReturnsAsync(...)`, `mock.Verify(...)`.
- **FluentAssertions**-style: `result.Should().Be(42)`.
- ASP.NET Core integration tests: **`WebApplicationFactory<Program>`** hosts the app in memory with a real HTTP pipeline.
- EF Core tests: SQLite in-memory or Testcontainers; the EF InMemory provider does not behave like a real database.

```csharp
public class PriceServiceTests
{
    [Theory]
    [InlineData(100, 0.1, 90)]
    [InlineData(50, 0, 50)]
    public void ApplyDiscount_ReturnsReducedPrice(decimal price, decimal rate, decimal expected)
    {
        var rates = new Mock<IDiscountRates>();
        rates.Setup(r => r.For("VIP")).Returns(rate);
        var service = new PriceService(rates.Object);

        Assert.Equal(expected, service.Apply(price, "VIP"));
    }
}
```

**Common questions**

- **`[Fact]` vs `[Theory]`?** `Fact` = one fixed test; `Theory` = same test run with several data rows.
- **How do you test a controller end to end?** `WebApplicationFactory` + `HttpClient`, replacing external services in `ConfigureTestServices`.
- **Why depend on interfaces?** So tests can swap real implementations for mocks via DI.

**Traps**

- `async void` tests — failures are not reported. Use `async Task`.
- Relying on the EF InMemory provider: no constraints, no transactions, no real SQL.
- Mocking concrete classes with non-virtual methods silently calls the real code.

## Interfaces & abstract classes

**Key ideas**

- **Interface**: a contract; a class can implement many. Can have **default implementations** and static members (C# 8+, static abstract in C# 11).
- **Abstract class**: shared state and partial implementation; single inheritance; can have constructors and fields.
- `virtual` / `override` for polymorphism; `sealed` stops further inheritance; `new` hides a member (rarely wanted).
- **Explicit interface implementation** (`void IDisposable.Dispose()`) when names clash or to hide a member.
- Program to interfaces to enable DI and testing.

```csharp
public interface INotifier
{
    Task SendAsync(string to, string message);
    Task SendManyAsync(IEnumerable<string> to, string message) =>
        Task.WhenAll(to.Select(t => SendAsync(t, message))); // default implementation
}

public abstract class Shape
{
    public abstract double Area();
    public override string ToString() => $"{GetType().Name} with area {Area():F2}";
}

public sealed class Circle(double r) : Shape
{
    public override double Area() => Math.PI * r * r;
}
```

**Common questions**

- **Interface vs abstract class?** Interface: capability contract, multiple allowed, no instance state. Abstract class: "is-a" base with shared code and state.
- **`override` vs `new`?** `override` replaces the virtual method for all callers; `new` only hides it when called through the derived type.
- **Why are default interface methods useful?** Add members to an interface without breaking existing implementations.

**Traps**

- Calling virtual methods from a constructor — the derived part isn't initialized yet.
- Fat interfaces that force implementers to throw `NotImplementedException`.
- Deep inheritance hierarchies instead of composition.

## Exceptions

**Key ideas**

- `try / catch / finally`; catch specific types first, general ones last.
- **Exception filters**: `catch (HttpRequestException ex) when (ex.StatusCode == HttpStatusCode.NotFound)`.
- `throw;` rethrows and keeps the stack trace; `throw ex;` resets it.
- Custom exceptions derive from `Exception`; wrap with `InnerException` to keep the cause.
- Exceptions are for exceptional cases — use `TryParse`, `TryGetValue` or result types for expected failures.
- ASP.NET Core: global handling with `UseExceptionHandler` / `IExceptionHandler` returning `ProblemDetails`.

```csharp
try
{
    await paymentClient.ChargeAsync(order);
}
catch (HttpRequestException ex) when (ex.StatusCode == HttpStatusCode.PaymentRequired)
{
    throw new PaymentDeclinedException(order.Id, ex);
}
catch (Exception ex)
{
    logger.LogError(ex, "Charge failed for order {OrderId}", order.Id);
    throw; // keep the original stack trace
}
```

**Common questions**

- **`throw` vs `throw ex`?** `throw` preserves the original stack trace; `throw ex` makes it look like the error started here.
- **Are exceptions expensive?** Throwing is slow compared with normal returns — don't use them for control flow.
- **What does `finally` guarantee?** It runs whether or not an exception occurred (except process crash).

**Traps**

- Empty `catch` blocks hiding failures.
- Catching `Exception` deep inside library code.
- Exceptions in `async void` methods crash the process.

## Nullable reference types

**Key ideas**

- With `<Nullable>enable</Nullable>`, reference types are **non-nullable by default**; `string?` means "may be null".
- The compiler warns when you might dereference null or assign null to a non-nullable.
- Operators: `?.` (null-conditional), `??` (fallback), `??=` (assign if null), `!` (null-forgiving — "trust me").
- Guard clauses: `ArgumentNullException.ThrowIfNull(arg)`.
- Attributes like `[NotNullWhen(true)]` help the compiler understand your methods.

```csharp
public string DisplayName(User? user)
{
    if (user is null) return "Guest";
    return user.Nickname ?? $"{user.FirstName} {user.LastName}";
}

public bool TryFind(int id, [NotNullWhen(true)] out User? user)
{
    user = _users.GetValueOrDefault(id);
    return user is not null;
}
```

**Common questions**

- **Does `string?` change runtime behavior?** No — it's compile-time analysis only. Null can still arrive (JSON, old code), so validate inputs.
- **When is `!` acceptable?** Rarely — when you know better than the compiler (e.g. after a framework guarantees initialization).
- **`is null` vs `== null`?** `is null` can't be overridden by a custom `==` operator, so it's always a true null check.

**Traps**

- Silencing warnings with `!` everywhere.
- Mixing enabled and disabled nullable contexts in a project.
- EF Core: non-nullable string properties become `NOT NULL` columns.

## Pattern matching

**Key ideas**

- **Type patterns**: `if (shape is Circle c)`.
- **Switch expressions** return values: `x switch { ... }`.
- **Property patterns**: `order is { Status: "paid", Total: > 100 }`.
- **Relational / logical**: `> 0 and < 10`, `not null`, `or`.
- **Positional patterns** with deconstruction (records): `Point(0, 0)`.
- **List patterns** (C# 11): `[first, .., last]`, `[]`.

```csharp
decimal ShippingCost(Order order) => order switch
{
    { Total: >= 100 } => 0m,
    { Country: "FR" or "BE" } => 4.90m,
    { Items.Count: > 10 } => 15m,
    _ => 9.90m,
};

string Describe(int[] values) => values switch
{
    [] => "empty",
    [var single] => $"one: {single}",
    [var first, .., var last] => $"from {first} to {last}",
};
```

**Common questions**

- **Switch statement vs switch expression?** The expression returns a value, is more compact, and the compiler warns about missing cases.
- **What does `_` mean?** The discard pattern — matches anything (the default case).
- **How do patterns help with nulls?** `is not null` and `{ }` (matches any non-null) make null checks explicit.

**Traps**

- Order matters: the first matching arm wins — put specific cases first.
- A switch expression with no match throws `SwitchExpressionException`.
- Over-complex nested patterns hurt readability.

## Extension methods & attributes

**Key ideas**

- **Extension methods** add methods to existing types without modifying them: `static` method in a `static` class with `this` on the first parameter. LINQ is built this way.
- C# 14 adds **extension members** (`extension` blocks) including extension properties.
- **Attributes** attach metadata: `[Obsolete]`, `[Required]`, `[JsonPropertyName]`, `[HttpGet]`, `[Authorize]`.
- Custom attributes derive from `Attribute`; read them via **reflection** or **source generators**.
- Reflection is powerful but slow and not trimming/AOT-friendly; source generators produce code at compile time.

```csharp
public static class StringExtensions
{
    public static string Truncate(this string value, int max) =>
        value.Length <= max ? value : value[..max] + "…";
}
"Hello world".Truncate(5); // "Hello…"

[AttributeUsage(AttributeTargets.Property)]
public sealed class SensitiveAttribute : Attribute { }

public record User(string Email, [property: Sensitive] string PasswordHash);
```

**Common questions**

- **Can extension methods access private members?** No — they're just static methods with nicer call syntax.
- **What wins: instance method or extension method with the same signature?** The instance method.
- **Reflection vs source generators?** Reflection inspects types at runtime (flexible, slower); source generators write code at build time (fast, AOT-safe).

**Traps**

- Extension methods on `object` or very common types pollute IntelliSense everywhere.
- Extension methods can be called on `null` — check for it.
- Heavy reflection in hot paths.

## Dependency injection

**Key ideas**

- ASP.NET Core has a built-in container: register in `builder.Services`, receive via constructor (or primary constructor) injection.
- **Lifetimes**: `Singleton` (one for the app), `Scoped` (one per request), `Transient` (new every time).
- Register by interface: `AddScoped<IOrderService, OrderService>()`.
- **Keyed services** (.NET 8) for several implementations of one interface.
- Options, logging (`ILogger<T>`), `HttpClient` (`AddHttpClient`) all come from DI.

```csharp
builder.Services.AddScoped<IOrderService, OrderService>();
builder.Services.AddSingleton<IClock, SystemClock>();
builder.Services.AddKeyedSingleton<INotifier, EmailNotifier>("email");
builder.Services.AddHttpClient<IWeatherClient, WeatherClient>(c => c.BaseAddress = new("https://api.weather.example"));

public class OrderService(AppDbContext db, IClock clock, ILogger<OrderService> logger) : IOrderService
{
    // dependencies injected by the container
}
```

**Common questions**

- **Scoped vs transient vs singleton — examples?** `DbContext` scoped; stateless helpers transient; caches and config singleton.
- **What is a captive dependency?** A singleton holding a scoped service — the scoped one lives forever (stale `DbContext`). The container can detect it in development (scope validation).
- **How do you use a scoped service in a background service?** Inject `IServiceScopeFactory` and create a scope per unit of work.

**Traps**

- Service locator (`provider.GetService` everywhere) hides dependencies.
- Disposable transients resolved from the root provider leak until shutdown.
- Constructors with 10+ dependencies — the class does too much.

## Configuration & options

**Key ideas**

- Configuration sources merge in order: `appsettings.json` → `appsettings.{Environment}.json` → user secrets (dev) → environment variables → command line. Later wins.
- Bind sections to classes with the **Options pattern**: `services.Configure<SmtpOptions>(config.GetSection("Smtp"))`.
- `IOptions<T>` (singleton, read once), `IOptionsSnapshot<T>` (per request, reloads), `IOptionsMonitor<T>` (singleton with change notifications).
- Validate options at startup: `.ValidateDataAnnotations().ValidateOnStart()`.
- Environment from `ASPNETCORE_ENVIRONMENT` (`Development`, `Staging`, `Production`).

```csharp
public sealed class SmtpOptions
{
    [Required] public string Host { get; init; } = "";
    [Range(1, 65535)] public int Port { get; init; } = 587;
}

builder.Services.AddOptions<SmtpOptions>()
    .Bind(builder.Configuration.GetSection("Smtp"))
    .ValidateDataAnnotations()
    .ValidateOnStart();

public class Mailer(IOptions<SmtpOptions> options) { /* options.Value.Host */ }
```

**Common questions**

- **How do environment variables map to nested keys?** Double underscore: `Smtp__Host` → `Smtp:Host`.
- **Where do secrets go?** User secrets in development; environment variables or a vault (Azure Key Vault, AWS Secrets Manager) in production — never in `appsettings.json` in git.
- **`IOptions` vs `IOptionsMonitor`?** `IOptions` is fixed after first read; `IOptionsMonitor` sees reloads and can notify on change.

**Traps**

- Typos in section names bind silently to default values — validate on start.
- Injecting `IOptionsSnapshot` into a singleton (it's scoped).
- Committing connection strings with passwords.

## Authentication & authorization

**Key ideas**

- `UseAuthentication()` then `UseAuthorization()` in the pipeline.
- Schemes: **cookies** (server-rendered apps), **JWT bearer** (APIs), **OpenID Connect** (external login: Entra ID, Google), **ASP.NET Core Identity** (users, passwords, 2FA).
- Claims-based: the user is a `ClaimsPrincipal` with claims (id, email, roles).
- Authorization: `[Authorize]`, `[Authorize(Roles = "Admin")]`, **policies** (`RequireClaim`, custom requirements), resource-based with `IAuthorizationService`.
- Minimal APIs: `.RequireAuthorization("PolicyName")`.

```csharp
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o =>
    {
        o.Authority = "https://login.example.com";
        o.Audience = "orders-api";
    });

builder.Services.AddAuthorizationBuilder()
    .AddPolicy("CanRefund", p => p.RequireRole("Support").RequireClaim("department", "billing"));

app.MapPost("/orders/{id}/refund", RefundOrder).RequireAuthorization("CanRefund");
```

**Common questions**

- **Role-based vs policy-based authorization?** Roles are simple labels; policies combine roles, claims and custom logic in one named rule.
- **How do you check "user can edit only their own order"?** Resource-based authorization: an `AuthorizationHandler<Requirement, Order>` comparing the owner id with the user's claim.
- **Cookie vs JWT authentication?** Cookies for browser apps on the same site (CSRF protection needed); JWT bearer for APIs and mobile clients.

**Traps**

- `UseAuthorization()` before `UseAuthentication()` — user is never authenticated.
- Validating JWTs without checking issuer, audience and lifetime.
- Trusting role claims from a client-built token.

## Web API design

**Key ideas**

- **Controllers** (`[ApiController]`) or **Minimal APIs** (`app.MapGet(...)`) — both use the same pipeline.
- `[ApiController]` gives automatic model validation (400 with `ValidationProblemDetails`) and binding inference.
- Return `TypedResults.Ok(...)`, `Created(...)`, `NotFound()`, `ValidationProblem(...)` for clear, documented results.
- Use **DTOs/records** for input and output — never expose EF entities directly.
- OpenAPI docs built in (`AddOpenApi()`); API versioning; rate limiting middleware (`AddRateLimiter`).

```csharp
var orders = app.MapGroup("/api/orders").RequireAuthorization();

orders.MapGet("/{id:int}", async Task<Results<Ok<OrderDto>, NotFound>> (int id, AppDbContext db) =>
    await db.Orders.Where(o => o.Id == id).Select(o => new OrderDto(o.Id, o.Total)).FirstOrDefaultAsync()
        is { } dto ? TypedResults.Ok(dto) : TypedResults.NotFound());

orders.MapPost("/", async (CreateOrderRequest req, IOrderService svc) =>
{
    var order = await svc.CreateAsync(req);
    return TypedResults.Created($"/api/orders/{order.Id}", order);
});
```

**Common questions**

- **Minimal APIs vs controllers?** Minimal: less ceremony, fast, great for small/medium APIs. Controllers: conventions, filters, organization for large APIs. Both are production-ready.
- **How do you return validation errors?** `ProblemDetails` / `ValidationProblemDetails` (RFC 9457) with field errors and status 400.
- **Why DTOs instead of entities?** Control the contract, avoid over-posting and circular references, change the DB without breaking clients.

**Traps**

- Binding request bodies straight to entities — over-posting (`IsAdmin = true`).
- Blocking calls (`.Result`) inside endpoints — thread pool starvation.
- Returning huge unpaginated lists.

## Threading & synchronization

**Key ideas**

- `async/await` is for I/O; **threads/`Parallel`/PLINQ** are for CPU work.
- Thread-safe collections: `ConcurrentDictionary`, `ConcurrentQueue`, `Channel<T>` (async producer/consumer).
- Locks: `lock` (new `System.Threading.Lock` type in .NET 9), `SemaphoreSlim` (also async: `WaitAsync`), `ReaderWriterLockSlim`.
- `Interlocked.Increment` for atomic counters; `volatile` rarely needed.
- Avoid shared mutable state; prefer immutable data and message passing.

```csharp
private readonly SemaphoreSlim _gate = new(initialCount: 5); // max 5 concurrent downloads

public async Task<byte[]> DownloadAsync(string url)
{
    await _gate.WaitAsync();
    try { return await _http.GetByteArrayAsync(url); }
    finally { _gate.Release(); }
}

var channel = Channel.CreateBounded<Job>(100);
// producer: await channel.Writer.WriteAsync(job);
// consumer: await foreach (var job in channel.Reader.ReadAllAsync()) Process(job);
```

**Common questions**

- **Can you `await` inside a `lock`?** No — use `SemaphoreSlim.WaitAsync` for async code.
- **What is a race condition?** The result depends on timing between threads, e.g. two threads doing `count++` at once.
- **`Parallel.ForEach` vs `Task.WhenAll`?** `Parallel` for CPU-bound work on threads; `WhenAll` for many concurrent async I/O operations. `Parallel.ForEachAsync` mixes both with a limit.

**Traps**

- Locking on `this`, a type, or a string.
- Deadlocks from taking two locks in different orders.
- `Dictionary` used from several threads — corrupted state, not just exceptions.

## SOLID & design patterns

**Key ideas**

- **SOLID**: Single responsibility, Open/closed, Liskov substitution, Interface segregation, Dependency inversion.
- Common in .NET: **Repository** / **Unit of Work** (EF Core already is one), **Mediator** (CQRS with MediatR or hand-written handlers), **Options**, **Decorator** (wrap a service to add caching/logging), **Strategy**, **Factory**.
- **CQRS**: separate commands (writes) from queries (reads).
- **Clean / onion architecture**: domain at the center, infrastructure at the edges, dependencies point inward.

```csharp
// Decorator: add caching without changing the original service
public sealed class CachedProductService(IProductService inner, IMemoryCache cache) : IProductService
{
    public Task<Product?> GetAsync(int id) =>
        cache.GetOrCreateAsync($"product:{id}", entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5);
            return inner.GetAsync(id);
        });
}
```

**Common questions**

- **Do you need a repository over EF Core?** Often not — `DbContext` is a unit of work and `DbSet` a repository. Add one when you want to hide query details or swap storage.
- **What problem does CQRS solve?** Reads and writes have different needs; separating them simplifies each and allows separate optimization.
- **Give an example of dependency inversion.** `OrderService` depends on `IPaymentGateway`, not `StripeClient` — the implementation is injected.

**Traps**

- Generic repositories that just wrap `DbSet` and hide useful EF features.
- Layers and abstractions for a CRUD app that doesn't need them.
- MediatR for everything, making code navigation harder.

## Logging & caching

**Key ideas**

- `ILogger<T>` with **structured logging**: `logger.LogInformation("Order {OrderId} paid", id)` — placeholders become searchable fields.
- Levels: Trace, Debug, Information, Warning, Error, Critical; configure per category in `appsettings.json`.
- Providers/sinks: console, Serilog, OpenTelemetry to Seq/Elastic/Application Insights.
- Caching: `IMemoryCache` (per instance), `IDistributedCache` (Redis), **`HybridCache`** (.NET 9: memory + distributed, stampede protection), **output caching** for whole responses.
- High-performance logging with `[LoggerMessage]` source generators.

```csharp
public partial class OrderService(ILogger<OrderService> logger, HybridCache cache)
{
    public async Task<OrderDto> GetAsync(int id) =>
        await cache.GetOrCreateAsync($"order:{id}", async ct => await LoadAsync(id, ct));

    [LoggerMessage(Level = LogLevel.Information, Message = "Order {OrderId} shipped to {Country}")]
    partial void LogShipped(int orderId, string country);
}
```

**Common questions**

- **Why not string interpolation in log calls?** `$"..."` builds the string even when the level is disabled and loses the structured fields.
- **`IMemoryCache` vs `IDistributedCache`?** Memory is fastest but per server; distributed is shared across servers and survives restarts.
- **What is output caching?** The server stores whole HTTP responses and serves them without running the endpoint.

**Traps**

- Logging personal data or secrets.
- Unbounded memory caches — set size limits and expirations.
- Caching per-user responses with a shared key.
