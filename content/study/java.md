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
