# Java / Spring

## OOP & core Java

**Key ideas**

- Four pillars: **encapsulation**, **inheritance**, **polymorphism**, **abstraction**.
- Java is pass-by-value — for objects, the *reference* is copied.
- `abstract class` (shared state + partial implementation, single inheritance) vs `interface` (contract; can have `default` and `static` methods; a class implements many).
- `equals` and `hashCode` must be overridden together: equal objects need equal hash codes.
- `String` is immutable; use `StringBuilder` for loops of concatenation.
- **Records** (`record Point(int x, int y)`) give immutable data classes. **Sealed** classes restrict who can extend. Pattern matching works with `instanceof` and `switch`.
- Checked exceptions must be declared or caught; unchecked (`RuntimeException`) need not be.

```java
sealed interface Shape permits Circle, Square {}
record Circle(double r) implements Shape {}
record Square(double side) implements Shape {}

double area(Shape s) {
    return switch (s) {
        case Circle c -> Math.PI * c.r() * c.r();
        case Square q -> q.side() * q.side();
    };
}
```

**Common questions**

- **Overloading vs overriding?** Overloading: same name, different parameters (compile time). Overriding: subclass replaces a method (runtime).
- **`final`, `finally`, `finalize`?** `final` = can't change/extend/override. `finally` = always-run block. `finalize` = deprecated GC hook.
- **Why is `String` immutable?** Safety (keys, security), thread safety, string pool sharing, cached hash code.
- **`==` vs `equals`?** `==` compares references (or primitive values); `equals` compares logical content.

**Traps**

- Comparing `Integer` with `==` works for -128..127 (cache) and fails above.
- Mutable fields in a `HashSet` element change its hash — element becomes unfindable.
- Catching `Exception` broadly hides bugs.

## Collections

**Key ideas**

- `List` (ordered, duplicates): `ArrayList` (fast random access), `LinkedList` (rarely better).
- `Set` (no duplicates): `HashSet`, `LinkedHashSet` (insertion order), `TreeSet` (sorted).
- `Map`: `HashMap` (O(1) average), `LinkedHashMap` (order, LRU cache), `TreeMap` (sorted, O(log n)).
- `HashMap` internals: array of buckets; collisions form lists that become balanced trees when long; resizes at load factor 0.75.
- Concurrent versions: `ConcurrentHashMap`, `CopyOnWriteArrayList`.
- **Streams:** `filter`, `map`, `collect`, `groupingBy`, lazy until a terminal operation.

```java
Map<String, Long> countByDept = employees.stream()
    .filter(e -> e.salary() > 50_000)
    .collect(Collectors.groupingBy(Employee::dept, Collectors.counting()));
```

**Common questions**

- **`HashMap` vs `Hashtable` vs `ConcurrentHashMap`?** `HashMap`: not thread-safe, allows null. `Hashtable`: legacy, fully synchronized. `ConcurrentHashMap`: thread-safe with fine-grained locking, no nulls.
- **`Comparable` vs `Comparator`?** `Comparable` = natural order inside the class; `Comparator` = external, many orderings.
- **Fail-fast iterators?** Modifying a collection while iterating throws `ConcurrentModificationException`; use `iterator.remove()` or `removeIf`.

**Traps**

- `List.of(...)` and `Map.of(...)` are immutable — `add` throws.
- `Arrays.asList` is fixed-size.
- Streams can be consumed only once.

## Concurrency

**Key ideas**

- Threads share heap memory; that's where races happen.
- `synchronized` and `ReentrantLock` give mutual exclusion; `volatile` gives visibility (not atomicity).
- `java.util.concurrent`: `ExecutorService`, `CompletableFuture`, `CountDownLatch`, `Semaphore`, atomic classes (`AtomicInteger`).
- **Virtual threads** (Java 21+): very cheap threads for blocking I/O — `Executors.newVirtualThreadPerTaskExecutor()`.
- Deadlock needs four conditions: mutual exclusion, hold-and-wait, no preemption, circular wait. Fix by consistent lock ordering or timeouts.

```java
try (var exec = Executors.newVirtualThreadPerTaskExecutor()) {
    List<Future<String>> results = urls.stream()
        .map(u -> exec.submit(() -> fetch(u)))
        .toList();
}
```

**Common questions**

- **`volatile` vs `synchronized`?** `volatile` makes writes visible to other threads; `synchronized` also makes compound actions atomic.
- **`Runnable` vs `Callable`?** `Callable` returns a value and can throw checked exceptions.
- **What is the happens-before relationship?** Java Memory Model rules that guarantee one action's effects are visible to another (lock release → acquire, volatile write → read, thread start/join).

**Traps**

- `count++` is not atomic even on a `volatile` field.
- Forgetting to shut down an `ExecutorService` keeps the JVM alive.
- Holding a `synchronized` lock while doing slow I/O can pin virtual threads (improved in recent JDKs) and hurts throughput.

## JVM & memory

**Key ideas**

- Source → bytecode (`javac`) → JVM runs it; the **JIT** compiles hot code to native.
- Memory: **heap** (objects, GC-managed), **stack** (per thread: frames, locals), **metaspace** (class metadata).
- Garbage collection is generational: most objects die young. Default GC is **G1**; ZGC/Shenandoah for low pauses.
- Class loading: bootstrap → platform → application class loaders (parent delegation).

**Common questions**

- **Stack vs heap?** Stack: method frames and primitives/references, per thread, fast. Heap: all objects, shared, garbage collected.
- **Can Java have memory leaks?** Yes — references kept alive unintentionally (static collections, caches, listeners, ThreadLocals).
- **`OutOfMemoryError` vs `StackOverflowError`?** Heap/metaspace exhausted vs too-deep recursion.

**Traps**

- Calling `System.gc()` is only a hint.
- Large `-Xmx` without understanding GC can increase pause times.

## Spring core

**Key ideas**

- **IoC container** creates and wires beans; **dependency injection** supplies them. Prefer constructor injection (immutable, testable).
- Stereotypes: `@Component`, `@Service`, `@Repository` (adds exception translation), `@Controller` / `@RestController`.
- `@Configuration` + `@Bean` for explicit bean definitions.
- Scopes: `singleton` (default), `prototype`, `request`, `session`.
- **AOP proxies** power `@Transactional`, `@Cacheable`, `@Async`: Spring wraps the bean in a proxy that adds behavior around method calls.

```java
@Service
public class OrderService {
    private final OrderRepository repo;
    public OrderService(OrderRepository repo) { this.repo = repo; } // constructor injection

    @Transactional
    public Order place(OrderRequest req) { return repo.save(Order.from(req)); }
}
```

**Common questions**

- **Bean lifecycle?** Instantiate → inject dependencies → `@PostConstruct` → ready → `@PreDestroy` on shutdown.
- **How do you resolve two beans of the same type?** `@Primary`, `@Qualifier`, or inject a `List` of them.
- **Why constructor injection over field injection?** Required deps are explicit, fields can be `final`, easy to test without Spring.

**Traps**

- **Self-invocation:** calling a `@Transactional` method from another method in the same class bypasses the proxy — no transaction.
- `@Transactional` on private methods does nothing.
- Circular dependencies signal a design problem (and fail with constructor injection).

## Spring Boot & JPA

**Key ideas**

- Spring Boot = auto-configuration + starters + embedded server + `application.yml` config + Actuator for health/metrics.
- Profiles (`spring.profiles.active`) switch config per environment.
- **JPA / Hibernate:** entities map to tables; `Spring Data` repositories generate queries from method names (`findByEmail`).
- Entity states: transient, managed, detached, removed. Managed entities are dirty-checked and flushed at commit.
- Fetching: `LAZY` (load on access) vs `EAGER`. Default `@ManyToOne` is eager — usually set it lazy.
- REST: `@RestController`, `@GetMapping`, `@RequestBody`, validation with `@Valid` + Bean Validation, errors with `@ControllerAdvice`.

```java
@RestController
@RequestMapping("/api/users")
class UserController {
    private final UserService users;
    UserController(UserService users) { this.users = users; }

    @PostMapping
    ResponseEntity<UserDto> create(@Valid @RequestBody CreateUser req) {
        return ResponseEntity.status(201).body(users.create(req));
    }
}
```

**Common questions**

- **What is the N+1 problem and how do you fix it?** Loading a list then lazily loading each child = 1 + N queries. Fix with `JOIN FETCH`, `@EntityGraph`, or batch fetching.
- **How does auto-configuration work?** Conditional configuration classes (`@ConditionalOnClass`, `@ConditionalOnMissingBean`) activate based on the classpath and your beans.
- **`LazyInitializationException`?** Accessing a lazy relation after the session/transaction closed. Fetch what you need in the query or use DTO projections.

**Traps**

- Returning entities directly from controllers leaks internals and can trigger lazy loading / infinite JSON recursion — use DTOs.
- `spring.jpa.hibernate.ddl-auto=update` in production; use Flyway or Liquibase migrations instead.

## Exceptions & generics

**Key ideas**

- Hierarchy: `Throwable` → `Error` (JVM problems, don't catch) and `Exception` → checked exceptions + `RuntimeException` (unchecked).
- **try-with-resources** closes any `AutoCloseable` automatically, even on error.
- Wrap low-level errors in domain exceptions and keep the cause: `throw new OrderException("...", e)`.
- **Generics** give compile-time type safety; types are **erased** at runtime (`List<String>` is just `List`).
- Bounded types: `<T extends Comparable<T>>`. Wildcards: `? extends T` (read, producer) and `? super T` (write, consumer) — **PECS**.

```java
try (var reader = Files.newBufferedReader(path)) {
    return reader.lines().count();
} catch (IOException e) {
    throw new UncheckedIOException("Cannot read " + path, e);
}

static double sum(List<? extends Number> nums) { // accepts List<Integer>, List<Double>…
    return nums.stream().mapToDouble(Number::doubleValue).sum();
}
```

**Common questions**

- **Checked vs unchecked exceptions — when to use each?** Checked for recoverable conditions the caller must handle (I/O); unchecked for programming errors (null, bad argument). Many modern codebases prefer unchecked.
- **What is type erasure?** Generic types are removed after compilation, so you can't do `new T()` or `instanceof List<String>`.
- **What does PECS mean?** Producer `extends`, consumer `super` — choose the wildcard by whether you read from or write to the collection.

**Traps**

- Empty catch blocks swallow errors silently.
- A `return` in `finally` overrides the exception or the earlier return.
- Raw types (`List` without `<>`) bypass generic checks and fail later with `ClassCastException`.

## Testing (JUnit & Mockito)

**Key ideas**

- **JUnit 5:** `@Test`, `@BeforeEach`, `@ParameterizedTest` with `@ValueSource` / `@CsvSource`, `assertThrows`, `assertAll`.
- **Mockito:** `@Mock` dependencies, `@InjectMocks` the class under test, `when(...).thenReturn(...)`, `verify(...)`.
- **AssertJ** gives fluent assertions: `assertThat(list).hasSize(2).contains("a")`.
- Spring: `@SpringBootTest` loads the full context (slow); slices like `@WebMvcTest` and `@DataJpaTest` load only one layer.
- **Testcontainers** starts a real database in Docker for integration tests.

```java
@ExtendWith(MockitoExtension.class)
class OrderServiceTest {
    @Mock OrderRepository repo;
    @InjectMocks OrderService service;

    @Test
    void throwsWhenOrderMissing() {
        when(repo.findById(42L)).thenReturn(Optional.empty());
        assertThrows(OrderNotFoundException.class, () -> service.get(42L));
        verify(repo).findById(42L);
    }
}
```

**Common questions**

- **Mock vs stub vs spy?** A stub returns canned answers; a mock also verifies interactions; a spy wraps a real object and lets you override some methods.
- **`@SpringBootTest` vs `@WebMvcTest`?** Full application context vs only the web layer (controllers, filters) with services mocked via `@MockitoBean`.
- **How do you test the repository layer?** `@DataJpaTest` with an embedded DB or Testcontainers for the real engine.

**Traps**

- Mocking the class under test, or mocking value objects.
- Using `@SpringBootTest` everywhere — the test suite gets very slow.
- Verifying every call makes tests break on any refactor.

## Spring Security & REST APIs

**Key ideas**

- **REST:** resources as URLs, HTTP verbs (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`), correct status codes (200, 201, 204, 400, 401, 403, 404, 409).
- `@RestController` + `@GetMapping` etc.; `@Valid` with Bean Validation (`@NotBlank`, `@Email`) on request DTOs.
- Global error handling with `@RestControllerAdvice` + `@ExceptionHandler`, often returning `ProblemDetail`.
- **Spring Security** is a chain of servlet filters. Configure a `SecurityFilterChain` bean.
- **Authentication** (who are you) vs **authorization** (what may you do: `hasRole`, `@PreAuthorize`).
- Stateless APIs often use **JWT** (resource server with `oauth2ResourceServer().jwt()`); store passwords with `BCryptPasswordEncoder`.

```java
@Bean
SecurityFilterChain api(HttpSecurity http) throws Exception {
    return http
        .csrf(csrf -> csrf.disable()) // stateless API with tokens, no cookies
        .authorizeHttpRequests(auth -> auth
            .requestMatchers("/api/public/**").permitAll()
            .requestMatchers("/api/admin/**").hasRole("ADMIN")
            .anyRequest().authenticated())
        .oauth2ResourceServer(o -> o.jwt(Customizer.withDefaults()))
        .build();
}
```

**Common questions**

- **401 vs 403?** 401: not authenticated (no or bad credentials). 403: authenticated but not allowed.
- **PUT vs PATCH?** PUT replaces the whole resource (idempotent); PATCH changes part of it.
- **Why return DTOs instead of JPA entities?** Avoid leaking internal fields, lazy-loading errors during JSON serialization, and coupling the API to the DB schema.
- **When can you disable CSRF?** For stateless APIs that authenticate with headers (tokens), not with cookies.

**Traps**

- Returning entities with bidirectional relations — infinite JSON recursion.
- Storing passwords with a fast hash (MD5/SHA) instead of bcrypt/argon2.
- Putting sensitive data in a JWT payload — it is only encoded, not encrypted.

## Lambdas & functional interfaces

**Key ideas**

- A **functional interface** has one abstract method (`@FunctionalInterface`). Lambdas and method references implement it.
- Core ones in `java.util.function`: `Function<T,R>`, `Supplier<T>`, `Consumer<T>`, `Predicate<T>`, `BiFunction`, `UnaryOperator`, plus primitive versions (`IntPredicate`).
- **Method references**: `String::length`, `System.out::println`, `User::new`.
- Lambdas can capture only **effectively final** local variables.
- Compose: `predicate.and(...)`, `function.andThen(...)`, `Comparator.comparing(User::age).thenComparing(User::name)`.

```java
Predicate<String> notBlank = s -> !s.isBlank();
Function<String, Integer> length = String::length;

List<User> sorted = users.stream()
    .filter(u -> u.active())
    .sorted(Comparator.comparing(User::lastName).thenComparing(User::firstName))
    .toList();
```

**Common questions**

- **Lambda vs anonymous class?** Lambda is shorter, has no own `this`, and is compiled with `invokedynamic`; anonymous classes can have state and several methods.
- **Why must captured variables be effectively final?** The lambda gets a copy of the value; allowing changes would be confusing and unsafe across threads.
- **What is a method reference?** Shorthand for a lambda that just calls an existing method.

**Traps**

- Checked exceptions don't fit standard functional interfaces — wrap them.
- Side effects inside stream lambdas (adding to an outer list) break with parallel streams.
- Boxing costs with `Function<Integer, Integer>` in hot paths — use `IntUnaryOperator`.

## Optional & null handling

**Key ideas**

- `Optional<T>` makes "maybe no value" explicit in **return types**.
- Create: `Optional.of(x)` (non-null), `Optional.ofNullable(x)`, `Optional.empty()`.
- Use: `map`, `flatMap`, `filter`, `orElse`, `orElseGet` (lazy), `orElseThrow`, `ifPresentOrElse`.
- Avoid `Optional` for fields, parameters and collections (return an empty list instead).
- Other null tools: `Objects.requireNonNull`, `Objects.requireNonNullElse`, annotations like `@Nullable` / JSpecify for static checks.

```java
String city = userRepository.findById(id)
    .map(User::address)
    .map(Address::city)
    .orElse("Unknown");

User user = userRepository.findById(id)
    .orElseThrow(() -> new UserNotFoundException(id));
```

**Common questions**

- **`orElse` vs `orElseGet`?** `orElse(x)` always evaluates `x`; `orElseGet(() -> x)` only when empty — matters for expensive defaults.
- **Why not `Optional` as a parameter?** Callers can still pass `null`, and overloads or nullable annotations are clearer.
- **`map` vs `flatMap` on Optional?** Use `flatMap` when the function itself returns an `Optional`.

**Traps**

- `optional.get()` without checking — same crash as a null.
- Returning `null` from a method declared to return `Optional`.
- `Optional.of(null)` throws immediately.

## I/O & NIO

**Key ideas**

- **Streams** (`InputStream`/`OutputStream`) handle bytes; **Readers/Writers** handle characters with an encoding.
- Wrap with buffers (`BufferedReader`) for speed.
- **NIO.2** (`java.nio.file`): `Path`, `Files.readString`, `Files.lines` (lazy), `Files.walk`, `Files.copy`, `Files.newBufferedWriter`.
- Always specify `StandardCharsets.UTF_8`.
- NIO channels/selectors allow non-blocking I/O (used by Netty); **virtual threads** make simple blocking I/O scale too.

```java
Path log = Path.of("logs", "app.log");
try (Stream<String> lines = Files.lines(log, StandardCharsets.UTF_8)) {
    long errors = lines.filter(l -> l.contains("ERROR")).count();
}

Files.writeString(Path.of("out.txt"), "done", StandardCharsets.UTF_8,
    StandardOpenOption.CREATE, StandardOpenOption.APPEND);
```

**Common questions**

- **Byte stream vs character stream?** Bytes for binary data; readers/writers decode bytes into text with a charset.
- **Why close `Files.lines`?** It holds an open file handle — use try-with-resources.
- **How do you read a huge file?** Line by line (`BufferedReader` or `Files.lines`), never `readAllBytes`.

**Traps**

- Relying on the platform default charset.
- Forgetting to flush/close writers loses data.
- `Files.walk` without closing leaks directory handles.

## Design patterns

**Key ideas**

- **Creational:** Singleton (one instance — usually a Spring bean instead), Factory Method, Builder (many optional parameters).
- **Structural:** Adapter (convert an interface), Decorator (add behavior by wrapping — `BufferedReader`), Proxy (control access — Spring AOP, lazy loading), Facade (simple entry to a subsystem).
- **Behavioral:** Strategy (swap algorithms), Observer (events/listeners), Template Method (`JdbcTemplate`), Command, Chain of Responsibility (servlet filters).
- Modern Java makes some simpler: Strategy with lambdas, value objects with records.

```java
// Strategy with lambdas
enum Shipping {
    STANDARD(w -> 5 + w * 0.5),
    EXPRESS(w -> 15 + w * 1.2);

    private final DoubleUnaryOperator cost;
    Shipping(DoubleUnaryOperator cost) { this.cost = cost; }
    double price(double weightKg) { return cost.applyAsDouble(weightKg); }
}

// Builder
Pizza p = Pizza.builder().size(LARGE).cheese(true).topping("olives").build();
```

**Common questions**

- **How do you write a thread-safe singleton?** An `enum` with one value, or a holder class (lazy, thread-safe by class loading).
- **Decorator vs Proxy?** Both wrap; Decorator adds behavior, Proxy controls access (security, caching, lazy load, transactions).
- **Which patterns does Spring use?** Singleton beans, Factory (`BeanFactory`), Proxy (AOP, `@Transactional`), Template Method (`JdbcTemplate`, `RestTemplate`), Observer (application events).

**Traps**

- Applying patterns where a simple function would do.
- Singletons with mutable global state make testing hard.
- Deep inheritance in Template Method instead of composition.

## SOLID & clean code

**Key ideas**

- **S**ingle Responsibility: one reason to change per class.
- **O**pen/Closed: extend behavior without modifying existing code (interfaces, strategies).
- **L**iskov Substitution: subclasses must work wherever the parent is expected.
- **I**nterface Segregation: small focused interfaces instead of one fat interface.
- **D**ependency Inversion: depend on abstractions; inject dependencies (Spring DI).
- Clean code: meaningful names, small methods, no duplicated logic (DRY), keep it simple (KISS), don't build what you don't need (YAGNI).

```java
// Dependency inversion: the service depends on an interface, not a concrete class
public interface PaymentGateway { Receipt charge(Money amount, Card card); }

@Service
public class CheckoutService {
    private final PaymentGateway gateway;
    public CheckoutService(PaymentGateway gateway) { this.gateway = gateway; } // Stripe, PayPal or a test fake
}
```

**Common questions**

- **Give a Liskov violation.** `Square extends Rectangle` where `setWidth` also changes height — code expecting a rectangle breaks.
- **How does Spring help with SOLID?** Constructor injection of interfaces (DIP), easy swapping of implementations (OCP), small beans (SRP).
- **What is a "code smell"?** A sign of deeper problems: long methods, large classes, feature envy, duplicated code, primitive obsession.

**Traps**

- Creating an interface for every class "just in case".
- Splitting code so much that following one feature needs 15 files.
- Treating principles as laws instead of trade-offs.

## Modern Java (8 → 21+)

**Key ideas**

- **Java 8:** lambdas, streams, `Optional`, `java.time`.
- **9–11:** modules (JPMS), `var` (10), `List.of` / `Map.of`, new `HttpClient` (11).
- **14–17:** switch expressions, text blocks `"""`, records, pattern matching for `instanceof`, sealed classes (17 LTS).
- **21 LTS:** **virtual threads**, record patterns, pattern matching for `switch`, sequenced collections (`getFirst()`, `reversed()`).
- **22–25:** unnamed variables `_`, stream gatherers, scoped values, structured concurrency (preview → final), compact source files.

```java
String describe(Object o) {
    return switch (o) {
        case Integer i when i > 100 -> "big number";
        case Integer i -> "number " + i;
        case Point(int x, int y) -> "point at " + x + "," + y; // record pattern
        case null -> "null!";
        default -> "something else";
    };
}

String json = """
    { "name": "Ada", "role": "admin" }
    """;
```

**Common questions**

- **Why upgrade from Java 8/11 to 21?** Virtual threads, records, pattern matching, better GC (ZGC generational), performance, and long-term support.
- **What does `var` do?** Local type inference at compile time — still statically typed.
- **What are LTS versions?** Long-term support releases: 8, 11, 17, 21, 25.

**Traps**

- `var` with diamond `new ArrayList<>()` infers `ArrayList<Object>`.
- `List.of(...)` is immutable and rejects `null`.
- Preview features need `--enable-preview` and may change.

## Spring transactions & AOP

**Key ideas**

- **AOP** adds cross-cutting behavior (transactions, security, logging, caching) through **proxies** around beans.
- `@Transactional` opens a transaction before the method and commits or rolls back after.
- Default rollback: on **unchecked** exceptions only; use `rollbackFor = Exception.class` for checked ones.
- **Propagation:** `REQUIRED` (join or create, default), `REQUIRES_NEW` (suspend and start new), `NESTED`, `SUPPORTS`, `MANDATORY`.
- `readOnly = true` for queries — lets Hibernate skip dirty checking.
- Custom aspects: `@Aspect` with `@Around("@annotation(Timed)")`.

```java
@Service
public class TransferService {
    @Transactional
    public void transfer(long from, long to, BigDecimal amount) {
        accounts.withdraw(from, amount);
        accounts.deposit(to, amount);   // both succeed or both roll back
        audit.log(from, to, amount);    // REQUIRES_NEW in AuditService: kept even on rollback
    }
}
```

**Common questions**

- **Why does `@Transactional` not work when called from the same class?** Self-invocation skips the proxy — the annotation is never applied. Call through another bean.
- **Does `@Transactional` on a private method work?** No with proxy-based AOP — methods must be public (or at least overridable/visible to the proxy).
- **What is the default isolation?** The database default (often READ COMMITTED).

**Traps**

- Catching the exception inside the transactional method — no rollback happens.
- Long transactions holding locks while calling external APIs.
- `REQUIRES_NEW` everywhere creates many connections and deadlocks.

## Hibernate performance

**Key ideas**

- **N+1 problem:** loading a list, then lazily one query per element's relation. Fix with `JOIN FETCH`, `@EntityGraph`, or batch fetching (`@BatchSize`, `default_batch_fetch_size`).
- Default fetch: `@ManyToOne` / `@OneToOne` EAGER, collections LAZY — make all LAZY and fetch explicitly.
- **Persistence context** (first-level cache) tracks managed entities and flushes changes automatically (dirty checking).
- **DTO projections** for read-only screens; pagination with `Pageable`.
- Batch inserts: `hibernate.jdbc.batch_size`, avoid `IDENTITY` IDs (use sequences) for batching.
- Watch generated SQL (`show_sql` / logging, p6spy) during development.

```java
public interface OrderRepository extends JpaRepository<Order, Long> {
    @Query("select o from Order o join fetch o.items where o.customer.id = :customerId")
    List<Order> findWithItems(Long customerId);

    // DTO projection: only the needed columns
    @Query("select new com.shop.OrderSummary(o.id, o.total) from Order o where o.status = :status")
    Page<OrderSummary> summaries(Status status, Pageable page);
}
```

**Common questions**

- **What is `LazyInitializationException`?** Accessing a lazy relation after the session/transaction closed. Fetch what you need inside the transaction or use a DTO.
- **`save` vs `saveAndFlush`?** `save` waits for flush (commit or query); `saveAndFlush` sends SQL immediately.
- **First-level vs second-level cache?** First-level is per persistence context (always on); second-level is shared across sessions (opt-in, e.g. Ehcache, for read-mostly data).

**Traps**

- `JOIN FETCH` with pagination on collections paginates in memory (warning `HHH90003004`).
- Open Session in View hides N+1 queries in the web layer.
- `equals`/`hashCode` on entities using generated IDs that are null before persisting.

## Microservices & Spring Cloud

**Key ideas**

- **Microservices**: small, independently deployable services, each owning its data. Trade-off: network calls, distributed data, operational complexity.
- Communication: synchronous REST/gRPC, asynchronous messaging (events).
- **Spring Cloud** pieces: Gateway (API gateway), Config Server, service discovery (Eureka or Kubernetes DNS), OpenFeign / `RestClient` (HTTP clients).
- **Resilience4j**: circuit breaker, retry, timeout, bulkhead, rate limiter.
- Observability: Micrometer metrics + tracing (OpenTelemetry), correlation IDs in logs.
- Data consistency across services: **Saga** pattern (choreography or orchestration), outbox pattern.

```java
@CircuitBreaker(name = "inventory", fallbackMethod = "assumeInStock")
@Retry(name = "inventory")
public boolean inStock(String sku) {
    return inventoryClient.check(sku);
}

private boolean assumeInStock(String sku, Throwable t) {
    log.warn("Inventory down, accepting order for {}", sku, t);
    return true;
}
```

**Common questions**

- **Monolith vs microservices?** Start with a well-modularized monolith; split when teams or scaling needs require independent deployment.
- **What does a circuit breaker do?** Stops calling a failing service for a while, fails fast with a fallback, then tests again (half-open).
- **How do you handle a transaction across services?** No distributed ACID; use a saga of local transactions with compensating actions.

**Traps**

- A "distributed monolith": services that must be deployed together.
- Sharing one database between services.
- No timeouts on HTTP clients — one slow service blocks everything.

## Messaging (Kafka & RabbitMQ)

**Key ideas**

- Messaging decouples services in time: producers don't wait for consumers.
- **RabbitMQ**: message broker with exchanges, queues, routing keys; messages are removed after acknowledgement. Good for task queues.
- **Kafka**: distributed log; topics split into **partitions**, messages kept for a retention period, consumers track **offsets**, **consumer groups** share partitions. Good for event streaming and replay.
- Ordering is guaranteed only **within a partition** (same key → same partition).
- Delivery: at-most-once, **at-least-once** (usual), exactly-once (Kafka transactions, idempotent producers). Consumers should be **idempotent**.
- Spring: `@KafkaListener`, `KafkaTemplate`, `@RabbitListener`, Spring Cloud Stream.

```java
@Service
public class OrderEvents {
    private final KafkaTemplate<String, OrderPlaced> kafka;

    public void publish(OrderPlaced event) {
        kafka.send("orders", event.orderId(), event); // key keeps one order's events in order
    }

    @KafkaListener(topics = "orders", groupId = "billing")
    public void onOrder(OrderPlaced event) {
        billing.charge(event); // must be idempotent: the same event may arrive twice
    }
}
```

**Common questions**

- **Kafka vs RabbitMQ?** Kafka: high-throughput log, replay, streaming, ordering per partition. RabbitMQ: flexible routing, per-message acks, classic work queues.
- **How do you avoid processing a message twice?** Idempotent handlers (dedupe by event id, upserts), or Kafka exactly-once within Kafka.
- **What is a dead-letter queue?** Where messages go after failing several times, so they don't block the rest.

**Traps**

- Publishing an event and saving to the DB in two steps — one can fail. Use the outbox pattern.
- More consumers than partitions — extra consumers sit idle.
- Large payloads in messages instead of references.

## Build tools (Maven & Gradle)

**Key ideas**

- **Maven**: XML `pom.xml`, convention over configuration, fixed lifecycle (`validate → compile → test → package → verify → install → deploy`).
- **Gradle**: Groovy/Kotlin DSL, task graph, incremental builds and build cache — usually faster.
- Dependency **scopes**: Maven `compile`, `provided`, `runtime`, `test`; Gradle `implementation`, `api`, `compileOnly`, `runtimeOnly`, `testImplementation`.
- **Transitive dependencies** and conflicts: `mvn dependency:tree`, `gradle dependencies`; manage versions with a BOM (`spring-boot-dependencies`).
- Wrappers (`mvnw`, `gradlew`) pin the tool version for everyone.
- Multi-module projects share configuration through a parent POM or convention plugins.

```xml
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-web</artifactId>
</dependency>
<dependency>
  <groupId>org.junit.jupiter</groupId>
  <artifactId>junit-jupiter</artifactId>
  <scope>test</scope>
</dependency>
```

**Common questions**

- **`mvn install` vs `mvn package`?** `package` builds the JAR in `target/`; `install` also copies it into the local `~/.m2` repository.
- **Gradle `api` vs `implementation`?** `api` exposes the dependency to consumers of your library; `implementation` hides it (faster builds, less coupling).
- **How do you solve a dependency version conflict?** Inspect the tree, then pin the version (dependencyManagement / constraints) or exclude the transitive one.

**Traps**

- Different versions of the same library on the classpath → `NoSuchMethodError` at runtime.
- Using `SNAPSHOT` dependencies in releases.
- Skipping tests in CI (`-DskipTests`) to make the build pass.
