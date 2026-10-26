# JavaScript / TypeScript

## Core JS

**Key ideas**

- **Types:** 7 primitives (`string`, `number`, `bigint`, `boolean`, `undefined`, `null`, `symbol`) plus objects. Primitives are copied by value; objects by reference.
- **Scope:** `let`/`const` are block-scoped; `var` is function-scoped and hoisted as `undefined`. `let`/`const` are hoisted too but sit in the *temporal dead zone* until declared.
- **Closures:** a function keeps access to the variables of the scope it was created in, even after that scope returns.
- **`this`:** set by *how* a function is called. Method call → the object. Plain call → `undefined` (strict) / global. `new` → the new object. Arrow functions have no own `this`; they use the enclosing one.
- **Prototypes:** objects delegate missing properties up the prototype chain. `class` is syntax over prototypes.
- **Equality:** `===` compares without coercion. `==` coerces (`"0" == 0` is `true`). Use `===`.

```js
function counter() {
  let n = 0;
  return () => ++n; // closure over n
}
const next = counter();
next(); // 1
next(); // 2
```

**Common questions**

- **What is a closure? Give a real use.** A function plus its captured scope. Uses: private state, memoization, event handlers that remember config, partial application.
- **`call` vs `apply` vs `bind`?** `call(thisArg, a, b)` and `apply(thisArg, [a, b])` invoke now; `bind` returns a new function with `this` fixed.
- **Shallow vs deep copy?** Spread / `Object.assign` copy one level. `structuredClone(obj)` does a deep copy (no functions).
- **What does `"use strict"` change?** No implicit globals, `this` is `undefined` in plain calls, silent errors throw. ES modules and classes are strict by default.

**Traps**

- `typeof null === "object"` (historic bug).
- `0.1 + 0.2 !== 0.3` — floating point. Compare with a tolerance or use integers (cents).
- `var` in a loop with callbacks shares one variable; `let` creates one per iteration.
- `[] + {}` and other coercion puzzles — know that `+` prefers string concatenation if either side is a string.

## Async & event loop

**Key ideas**

- JS runs one call stack. Async work (timers, I/O) is handled by the host and queued back.
- **Microtasks** (promise callbacks, `queueMicrotask`) run right after the current task, *before* the next macrotask (`setTimeout`, I/O, UI events).
- `async` functions always return a promise. `await` pauses the function, not the thread.
- `Promise.all` fails fast; `Promise.allSettled` waits for all; `Promise.race` takes the first settled; `Promise.any` takes the first fulfilled.

```js
console.log(1);
setTimeout(() => console.log(4));
Promise.resolve().then(() => console.log(3));
console.log(2);
// 1 2 3 4
```

**Common questions**

- **Explain the event loop.** Run the stack until empty → drain all microtasks → render (browser) → take the next macrotask → repeat.
- **How do you run requests in parallel with `await`?** Start them first, then await together: `await Promise.all([a(), b()])`. Awaiting one by one makes them serial.
- **How do you handle errors in async code?** `try/catch` around `await`, or `.catch()` on the promise. Unhandled rejections crash Node processes.
- **Debounce vs throttle?** Debounce waits until calls stop for N ms. Throttle allows at most one call per N ms.

**Traps**

- `forEach` does not wait for `async` callbacks. Use `for...of` with `await`, or `Promise.all(arr.map(...))`.
- A long synchronous loop blocks everything — timers, clicks, rendering.
- Forgetting `return` inside `.then` breaks the chain.

## TypeScript

**Key ideas**

- Structural typing: types match by shape, not by name.
- `interface` vs `type`: both describe objects; `interface` can be merged/extended, `type` can express unions, tuples, mapped types.
- **Unions + narrowing:** `typeof`, `in`, `instanceof`, discriminant fields, and type predicates (`x is Foo`) narrow a union.
- **Generics:** reusable types with parameters, constrained by `extends`.
- Utility types: `Partial`, `Required`, `Pick`, `Omit`, `Record`, `ReturnType`, `Awaited`.
- `unknown` is the safe "anything" (must narrow before use); `any` turns checking off.

```ts
type Result<T> = { ok: true; value: T } | { ok: false; error: string };

function unwrap<T>(r: Result<T>): T {
  if (r.ok) return r.value; // narrowed by discriminant
  throw new Error(r.error);
}
```

**Common questions**

- **`unknown` vs `any` vs `never`?** `unknown` = could be anything, must check. `any` = no checks. `never` = no value possible (exhaustive checks, functions that throw).
- **What is a discriminated union?** A union where each member has a literal tag field (`kind: "circle"`), so a `switch` on it narrows exactly.
- **Does TypeScript exist at runtime?** No. Types are erased. Validate external data at runtime (e.g. with zod).

**Traps**

- `as` casts silence the compiler without checking anything.
- Optional property `a?: string` is not the same as `a: string | undefined` under `exactOptionalPropertyTypes`.
- Enums emit runtime code; many teams prefer union string literals.

## React

**Key ideas**

- UI = function of state. Components re-render when their state, props, or used context change.
- **Hooks rules:** call at the top level, only from components or custom hooks — React tracks hooks by call order.
- `useState` for local state; `useReducer` for complex transitions; `useContext` for shared values; `useRef` for mutable values that don't trigger renders.
- `useEffect` syncs with outside systems (network, subscriptions, DOM). Dependency array controls when it re-runs; return a cleanup function.
- Keys let React match list items between renders. Use stable ids, not array index for reorderable lists.
- `useMemo` / `useCallback` / `memo` skip work when inputs are unchanged — use for measured slowness, not by default.
- Server Components (Next.js App Router) run on the server, can fetch data directly, and ship no JS; add `"use client"` for interactivity.

```tsx
function Search({ query }: { query: string }) {
  const [results, setResults] = useState<string[]>([]);
  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`/api/search?q=${query}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then(setResults)
      .catch(() => {});
    return () => ctrl.abort(); // cancel stale request
  }, [query]);
  return <ul>{results.map((r) => <li key={r}>{r}</li>)}</ul>;
}
```

**Common questions**

- **Why not mutate state directly?** React compares references; mutation keeps the same reference, so no re-render, and breaks concurrent rendering.
- **Controlled vs uncontrolled inputs?** Controlled: value lives in React state. Uncontrolled: DOM holds the value, read via ref or form data.
- **What causes infinite render loops?** Setting state during render, or an effect that sets state its own dependencies depend on (often a new object/array every render).
- **How do you lift state / avoid prop drilling?** Move state to the nearest common parent; use context or a store for widely shared state.

**Traps**

- Stale closures: an effect or callback captures old state. Fix deps, or use the functional updater `setX(x => x + 1)`.
- Derived data stored in state gets out of sync — compute it during render instead.
- Effects run twice in development Strict Mode on purpose to surface missing cleanup.

## DOM & browser APIs

**Key ideas**

- The DOM is a tree of nodes. `querySelector` / `querySelectorAll` find elements; `textContent` is safe, `innerHTML` parses HTML (XSS risk).
- **Events** go through capture (top → target), then bubble (target → top). `stopPropagation` stops the trip; `preventDefault` cancels the default action (link navigation, form submit).
- **Event delegation:** one listener on a parent handles events from many children via `event.target.closest(...)`.
- **Storage:** `localStorage` (persists, ~5 MB, sync), `sessionStorage` (per tab), cookies (sent with every request, can be `HttpOnly`), IndexedDB (large, async).
- `fetch` resolves even on 404/500 — check `res.ok`.
- Rendering: changing layout properties (`width`, `top`) triggers reflow; `transform` and `opacity` are cheap to animate.

```js
document.querySelector("#list").addEventListener("click", (e) => {
  const item = e.target.closest("li[data-id]");
  if (!item) return;
  console.log("clicked", item.dataset.id); // one listener for all items
});
```

**Common questions**

- **What is event delegation and why use it?** One listener on a parent; it works for items added later and uses less memory.
- **`localStorage` vs cookies vs `sessionStorage`?** Cookies travel to the server and can be `HttpOnly`/`Secure`; storage APIs stay in the browser, readable by any script on the page.
- **What is CORS?** The browser blocks cross-origin responses unless the server allows the origin with `Access-Control-Allow-Origin`. Non-simple requests send a preflight `OPTIONS` first.
- **`defer` vs `async` on scripts?** Both download in parallel. `defer` runs in order after HTML parsing; `async` runs as soon as it downloads, in any order.

**Traps**

- Reading layout (`offsetHeight`) right after writing styles in a loop forces repeated reflows (layout thrashing). Batch reads, then writes.
- Tokens in `localStorage` are readable by any injected script — one XSS bug leaks them.
- Removed DOM nodes still referenced from JS, or listeners never removed, leak memory.

## Testing

**Key ideas**

- **Test pyramid:** many fast unit tests, fewer integration tests, a few end-to-end (E2E) tests.
- Tools: **Vitest / Jest** (unit), **Testing Library** (components, test like a user), **Playwright / Cypress** (E2E in a real browser).
- Structure tests as **Arrange → Act → Assert**. One behavior per test.
- **Mocks** replace dependencies (`vi.fn()`, `vi.mock("./api")`); **spies** watch real functions; **fake timers** control `setTimeout`.
- Test behavior, not implementation: query by role or label text, not CSS classes.

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

test("adds an item", async () => {
  render(<TodoList />);
  await userEvent.type(screen.getByLabelText("New todo"), "Buy milk");
  await userEvent.click(screen.getByRole("button", { name: "Add" }));
  expect(screen.getByText("Buy milk")).toBeInTheDocument();
});
```

**Common questions**

- **Unit vs integration vs E2E?** Unit: one function/component in isolation. Integration: several pieces together (component + store + mocked API). E2E: the whole app in a browser, like a user.
- **How do you test async code?** `await` the promise or use `findBy*` queries that wait; mock the network (e.g. MSW) instead of calling real servers.
- **What makes a test flaky?** Real timers, real network, shared state between tests, depending on test order.
- **What is code coverage good for?** Finding untested code. High coverage does not prove the tests check the right things.

**Traps**

- Over-mocking: tests pass while the real integration is broken.
- Snapshot tests nobody reads just get updated blindly.
- Forgetting to `await` an async assertion — the test finishes before it runs.

## Performance & security

**Key ideas**

- **Core Web Vitals:** LCP (main content load), INP (responsiveness), CLS (layout shift).
- Ship less JS: code splitting and lazy loading (`import()`, `React.lazy`), tree shaking, modern image formats (WebP/AVIF), long caching for hashed static files.
- Debounce input handlers; virtualize long lists; move heavy work to a **Web Worker**.
- **XSS:** attacker script runs in your page. Escape output, avoid `innerHTML` / `dangerouslySetInnerHTML`, add a Content Security Policy.
- **CSRF:** another site triggers a request carrying the user's cookies. Use `SameSite` cookies and CSRF tokens.
- Keep session tokens in `HttpOnly`, `Secure`, `SameSite` cookies.

```tsx
const Chart = React.lazy(() => import("./Chart")); // downloaded only when first rendered

<Suspense fallback={<Spinner />}>
  {showChart && <Chart data={data} />}
</Suspense>
```

**Common questions**

- **How would you speed up a slow page?** Measure first (Lighthouse, Performance panel), then fix the biggest cost: large bundles, render-blocking resources, heavy images, slow API calls, needless re-renders.
- **XSS vs CSRF?** XSS runs attacker code inside your site. CSRF makes the browser send an unwanted but authenticated request from another site.
- **What does a CSP do?** Tells the browser which script and style sources are allowed, so injected inline scripts don't run.

**Traps**

- Optimizing without measuring — often the wrong thing gets faster.
- React escapes text, but `href={userInput}` can still be `javascript:...`.
- `npm install` of an unknown package can run its install scripts — supply-chain risk.

## ES6+ features

**Key ideas**

- **Destructuring** pulls values out of arrays/objects: `const { id, ...rest } = user`.
- **Spread / rest** (`...`) copies or collects values. **Default parameters**: `function f(x = 1)`.
- **Template literals**: `` `Hello ${name}` ``, multi-line strings, tagged templates.
- **Optional chaining** `a?.b?.c` stops at `null`/`undefined`; **nullish coalescing** `x ?? "default"` only replaces `null`/`undefined` (not `0` or `""`).
- `Map` / `Set` (any key type, keep insertion order), `WeakMap` / `WeakRef` (don't prevent garbage collection).
- Newer: `Array.prototype.at(-1)`, `Object.groupBy`, `structuredClone`, top-level `await` in modules.

```js
const { name, address: { city } = {}, ...rest } = user;
const port = config.port ?? 3000;      // 0 stays 0
const zip = user.address?.zip ?? "n/a";
```

**Common questions**

- **`??` vs `||`?** `||` falls back on any falsy value (`0`, `""`, `false`); `??` only on `null`/`undefined`.
- **`Map` vs plain object?** `Map` accepts any key type, keeps order, has `.size`, and has no prototype keys to collide with.
- **What are tagged templates?** A function receives the string parts and values separately — used by `styled-components`, `sql` helpers, escaping.

**Traps**

- Destructuring `undefined` throws — give a default (`= {}`).
- Spread copies one level only; nested objects are shared.
- `a?.b()` still throws if `b` exists but isn't a function.

## Array & object methods

**Key ideas**

- Transform: `map`, `filter`, `reduce`, `flatMap`, `flat`.
- Search: `find`, `findIndex`, `findLast`, `some`, `every`, `includes`, `indexOf`.
- **Mutating:** `push`, `pop`, `shift`, `splice`, `sort`, `reverse`. **Non-mutating copies:** `toSorted`, `toReversed`, `toSpliced`, `with`.
- Objects: `Object.keys` / `values` / `entries`, `Object.fromEntries`, `Object.assign`, `Object.freeze` (shallow).
- `Array.from({ length: 5 }, (_, i) => i)` builds arrays; `new Set(arr)` removes duplicates.

```js
const totalByCategory = orders.reduce((acc, o) => {
  acc[o.category] = (acc[o.category] ?? 0) + o.amount;
  return acc;
}, {});

const unique = [...new Set(tags)];
const sorted = users.toSorted((a, b) => a.age - b.age); // original untouched
```

**Common questions**

- **`map` vs `forEach`?** `map` returns a new array; `forEach` returns `undefined` and is for side effects.
- **How do you remove duplicates of objects by id?** `[...new Map(items.map((i) => [i.id, i])).values()]`.
- **How do you deep-freeze an object?** `Object.freeze` recursively on each nested object — `freeze` itself is shallow.

**Traps**

- `[10, 9, 1].sort()` gives `[1, 10, 9]` — default sort compares strings. Pass a comparator.
- `reduce` without an initial value throws on an empty array.
- `sort` and `reverse` mutate the original array (and React state).

## Classes & prototypes

**Key ideas**

- Every object has a hidden `[[Prototype]]` link; property lookup walks up the chain.
- `class` is syntax over constructor functions + prototypes. Methods live on `Class.prototype`, shared by all instances.
- `extends` + `super()` for inheritance; `super()` must run before using `this`.
- **Private fields** `#count` are truly private; `static` members belong to the class itself.
- Getters/setters (`get total()`) compute properties.
- Composition (combining small objects/functions) is often preferred over deep inheritance.

```js
class Counter {
  #count = 0;
  static instances = 0;
  constructor() { Counter.instances++; }
  increment() { return ++this.#count; }
  get value() { return this.#count; }
}

class LoggedCounter extends Counter {
  increment() {
    console.log("increment");
    return super.increment();
  }
}
```

**Common questions**

- **How does prototypal inheritance differ from classical?** Objects inherit directly from other objects at runtime; there are no real classes, only linked objects.
- **`Object.create(proto)`?** Creates an object whose prototype is `proto` — inheritance without a constructor.
- **What does `new` do?** Creates an object linked to `Fn.prototype`, calls `Fn` with `this` bound to it, returns it (unless `Fn` returns an object).

**Traps**

- Passing a method as a callback loses `this` (`button.onclick = obj.method`). Use an arrow function or `bind`.
- Class declarations are not hoisted like functions (temporal dead zone).
- Mutating `Array.prototype` or other built-ins breaks other code.

## Modules & bundlers

**Key ideas**

- **ES modules** (`import` / `export`) are static, so tools can analyze and tree-shake them. **CommonJS** (`require`) is Node's older dynamic system.
- Named exports vs one `default` export. Named exports are easier to refactor and tree-shake.
- Dynamic `import("./x.js")` returns a promise — code splitting and lazy loading.
- Bundlers (**Vite**, webpack, esbuild, Rollup, Turbopack) combine modules, transform TS/JSX, minify, split chunks.
- `package.json`: `dependencies` vs `devDependencies`, semver ranges (`^1.2.3` = compatible minor/patch), lock files for reproducible installs.

```js
// utils.js
export function formatPrice(cents) { return (cents / 100).toFixed(2); }

// page.js
const { renderChart } = await import("./chart.js"); // separate chunk, loaded on demand
```

**Common questions**

- **What is tree shaking?** Removing exports nobody imports, possible because ES module imports are static.
- **ESM vs CommonJS?** ESM: static, async loading, `import`/`export`, strict mode by default. CJS: `require` at runtime, synchronous.
- **Why commit the lock file?** Everyone and CI install the exact same dependency versions.

**Traps**

- Circular imports can give `undefined` values at load time.
- Side effects at module top level run on import, even if you use nothing from it.
- `^0.x` versions treat minor bumps as breaking — semver ranges behave differently below 1.0.

## Error handling

**Key ideas**

- `throw` any value, but throw `Error` objects — they carry `message` and `stack`.
- Built-ins: `TypeError`, `RangeError`, `SyntaxError`, `ReferenceError`. Create custom classes with `extends Error`.
- `try / catch / finally`; `finally` runs always.
- `new Error("msg", { cause: err })` chains errors and keeps the original.
- Async: `try/catch` with `await`, `.catch()` on promises, `window.onerror` / `unhandledrejection` for global reporting.
- React: **error boundaries** catch render errors in a component subtree.

```js
class ValidationError extends Error {
  constructor(field, message) {
    super(message);
    this.name = "ValidationError";
    this.field = field;
  }
}

try {
  await saveUser(form);
} catch (err) {
  if (err instanceof ValidationError) showFieldError(err.field, err.message);
  else throw new Error("Saving failed", { cause: err });
}
```

**Common questions**

- **Why throw `Error` objects instead of strings?** Strings have no stack trace and can't be checked with `instanceof`.
- **Can `try/catch` catch errors in a `setTimeout` callback?** No — the callback runs later on a new stack. Catch inside the callback.
- **What do error boundaries not catch?** Event handlers, async code, and errors in the boundary itself.

**Traps**

- Swallowing errors with an empty `catch {}`.
- Catching everything and re-throwing a generic error loses the cause — use `{ cause }`.
- A rejected promise nobody awaits becomes an unhandled rejection.

## Iterators & generators

**Key ideas**

- An **iterable** has a `[Symbol.iterator]()` method returning an **iterator** with `next()` → `{ value, done }`.
- Arrays, strings, `Map`, `Set` are iterable — usable with `for...of`, spread, destructuring.
- **Generators** (`function*`) pause at `yield` and resume on `next()`; they create iterators easily and lazily.
- Generators can produce infinite sequences safely because values are computed on demand.
- **Async iterators** (`for await...of`) consume streams and paginated APIs.

```js
function* range(start, end, step = 1) {
  for (let i = start; i < end; i += step) yield i;
}
[...range(0, 10, 3)]; // [0, 3, 6, 9]

async function* pages(url) {
  while (url) {
    const res = await fetch(url).then((r) => r.json());
    yield res.items;
    url = res.next;
  }
}
for await (const items of pages("/api/users")) render(items);
```

**Common questions**

- **`for...of` vs `for...in`?** `for...of` iterates values of an iterable; `for...in` iterates enumerable property keys (including inherited ones).
- **Why use a generator?** Lazy sequences, custom iteration, pausing logic, paging through data without loading it all.
- **Is a plain object iterable?** No — use `Object.entries(obj)` with `for...of`.

**Traps**

- An iterator can be consumed only once.
- `for...in` on arrays gives string indexes and inherited keys.
- Spreading an infinite generator hangs the program.

## Functional programming

**Key ideas**

- **Pure functions:** same input → same output, no side effects. Easy to test and cache.
- **Immutability:** create new values instead of changing old ones.
- **Higher-order functions** take or return functions (`map`, `filter`, decorators, middleware).
- **Composition:** build complex behavior from small functions (`pipe(f, g, h)`).
- **Currying / partial application:** turn `f(a, b)` into `f(a)(b)` to preset arguments.
- **Memoization:** cache results of pure functions by input.

```js
const pipe = (...fns) => (x) => fns.reduce((v, f) => f(v), x);

const slugify = pipe(
  (s) => s.trim(),
  (s) => s.toLowerCase(),
  (s) => s.replace(/\s+/g, "-"),
);
slugify("  Hello World "); // "hello-world"

const memo = (fn, cache = new Map()) => (n) =>
  cache.has(n) ? cache.get(n) : (cache.set(n, fn(n)), cache.get(n));
```

**Common questions**

- **What is a pure function?** No side effects and output depends only on input.
- **Currying vs partial application?** Currying turns an n-argument function into n one-argument functions; partial application fixes some arguments and returns a function for the rest.
- **Why does React like immutability?** Changes are detected by comparing references — cheap and reliable.

**Traps**

- Memoizing impure functions returns stale results.
- Deep chains of `map/filter/reduce` on huge arrays create many intermediate arrays.
- Hidden mutation inside a "pure" helper (e.g. `arr.sort()`).

## Advanced TypeScript types

**Key ideas**

- **Mapped types** transform each property: `{ [K in keyof T]?: T[K] }` (this is `Partial`).
- **Conditional types**: `T extends U ? X : Y`; with `infer` to extract types (`ReturnType`).
- **Template literal types**: `` type Event = `on${Capitalize<string>}` ``.
- `keyof`, `typeof`, indexed access `T["field"]`.
- `as const` makes literals readonly and narrow; `satisfies` checks a value against a type without widening it.
- **Generic constraints**: `<K extends keyof T>` keeps keys valid.

```ts
function pick<T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  return Object.fromEntries(keys.map((k) => [k, obj[k]])) as Pick<T, K>;
}

const routes = { home: "/", user: "/users/:id" } as const satisfies Record<string, string>;
type RouteName = keyof typeof routes; // "home" | "user"

type ElementOf<T> = T extends (infer U)[] ? U : never;
```

**Common questions**

- **`satisfies` vs type annotation?** Annotation widens the value to the type; `satisfies` checks it but keeps the precise inferred type.
- **How does `ReturnType` work?** `T extends (...args: any) => infer R ? R : never`.
- **How do you make an exhaustive switch?** Assign the value to `never` in the `default` branch; a missing case becomes a compile error.

**Traps**

- Conditional types distribute over unions (`string | number` is split) — wrap in `[T]` to stop it.
- Overly clever types slow the compiler and confuse teammates.
- `keyof` on a type with an index signature gives `string | number`.

## React hooks in depth

**Key ideas**

- `useState` updates are batched; the new value appears on the next render. Use `setX(prev => ...)` when the update depends on the old value.
- `useEffect` runs after paint; `useLayoutEffect` runs before paint (measure DOM).
- `useRef` holds a mutable value across renders without re-rendering; also points to DOM nodes.
- `useMemo` caches a computed value, `useCallback` caches a function — both by dependencies.
- **Custom hooks** (`useSomething`) share stateful logic, not state itself.
- React 19: `use()` reads promises/context, `useActionState` and `useOptimistic` for forms and actions; the React Compiler can auto-memoize.

```tsx
function useDebounced<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}
```

**Common questions**

- **Why does `console.log(state)` right after `setState` show the old value?** State is a snapshot for this render; the update shows in the next render.
- **When do you need `useCallback`?** When passing a function to a memoized child or into an effect's dependency list.
- **Do two components using the same custom hook share state?** No — each call has its own state.

**Traps**

- Missing dependencies → stale values; objects created each render as dependencies → effect runs every time.
- Using an effect to compute derived state ("you might not need an effect").
- Reading `ref.current` during render for things that should be state.

## React state management

**Key ideas**

- **Local state** (`useState`) first. **Lift state up** when siblings need it.
- **Context** passes values deep without prop drilling; every consumer re-renders when the value changes.
- Client stores: **Zustand**, Redux Toolkit, Jotai — for shared, frequently changing client state.
- **Server state** (fetched data) is different: use TanStack Query / SWR for caching, refetching, loading/error states.
- **URL state** (search params) for filters and pagination — shareable and survives refresh.

```tsx
import { create } from "zustand";

const useCart = create<{ items: string[]; add: (id: string) => void }>((set) => ({
  items: [],
  add: (id) => set((s) => ({ items: [...s.items, id] })),
}));

function CartCount() {
  const count = useCart((s) => s.items.length); // re-renders only when count changes
  return <span>{count}</span>;
}
```

**Common questions**

- **Context vs Redux/Zustand?** Context is a transport, good for rarely changing values (theme, user). Stores add selectors so components re-render only for the slice they use.
- **Why a separate tool for server state?** It needs caching, deduping, background refresh and invalidation — not just storage.
- **Where should a filter value live?** In the URL if users should share or bookmark it.

**Traps**

- One big context with fast-changing values re-renders the whole tree.
- Copying server data into a global store and keeping it in sync by hand.
- Storing derived data instead of computing it.

## Next.js

**Key ideas**

- **App Router:** folders in `app/` are routes; `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx` are special files.
- **Server Components** by default: fetch data on the server, no JS shipped. `"use client"` marks interactive components.
- **Server Actions** (`"use server"`) run server code from forms and buttons, no API route needed.
- Rendering: static (build time), dynamic (per request), streaming with `Suspense`; caching and revalidation control freshness.
- **Route handlers** (`route.ts`) for APIs; **middleware/proxy** runs before requests (auth redirects, i18n).
- Built-ins: `next/image` (optimized images), `next/font`, metadata API for SEO.

```tsx
// app/products/[id]/page.tsx — a Server Component
export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await db.product.findUnique({ where: { id } });
  if (!product) notFound();
  return <AddToCart product={product} />; // client component for interactivity
}
```

**Common questions**

- **Server vs Client Components?** Server: data access, secrets, zero JS. Client: state, effects, event handlers, browser APIs.
- **SSR vs SSG vs ISR?** Render per request, at build time, or at build time and re-generate after a time / on demand.
- **How do you pass data from server to client components?** As serializable props.

**Traps**

- Importing a server-only module (DB, secrets) into a client component.
- Passing functions or class instances as props to client components — not serializable.
- Forgetting how caching works and serving stale data.

## Forms & validation

**Key ideas**

- **Controlled** inputs (value in state) vs **uncontrolled** (DOM keeps value; read with `FormData` or refs).
- Native HTML validation: `required`, `type="email"`, `min`, `pattern` — free accessibility.
- Libraries: **React Hook Form** (uncontrolled, fast), Formik; schema validation with **zod** / yup shared by client and server.
- Always validate **again on the server** — client checks can be bypassed.
- UX: show errors near fields, on blur or submit; disable the button while submitting; prevent double submit.

```tsx
const schema = z.object({
  email: z.string().email(),
  age: z.coerce.number().int().min(18),
});

function Signup() {
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema) });
  return (
    <form onSubmit={handleSubmit(save)}>
      <input {...register("email")} aria-invalid={!!errors.email} />
      {errors.email && <p role="alert">{errors.email.message}</p>}
    </form>
  );
}
```

**Common questions**

- **Why validate on both client and server?** Client for fast feedback; server for security and data integrity.
- **Why is React Hook Form fast?** Inputs are uncontrolled, so typing doesn't re-render the whole form.
- **How do you handle a field that depends on another (confirm password)?** Schema-level refinement (`z.refine`) or a cross-field validator.

**Traps**

- `<button>` inside a form is `type="submit"` by default.
- Input values are always strings — convert numbers and dates.
- Error messages that screen readers never announce (missing `aria-describedby` / `role="alert"`).

## Accessibility

**Key ideas**

- Use **semantic HTML** first: `button`, `a`, `nav`, `main`, `label`, headings in order. ARIA only when HTML can't express it.
- Everything works with the **keyboard**: Tab order, visible focus, Enter/Space on buttons, Escape closes dialogs.
- Every input has a `<label>`; images have `alt` (empty `alt=""` for decorative ones).
- Color contrast at least 4.5:1 for normal text; never use color alone to show meaning.
- Live updates announced with `aria-live`; dialogs trap focus and return it on close.
- Test with axe / Lighthouse, keyboard-only use, and a screen reader (NVDA, VoiceOver).

```html
<!-- Bad: not focusable, no role, no keyboard -->
<div onclick="save()">Save</div>

<!-- Good -->
<button type="button" onclick="save()">Save</button>

<label for="email">Email</label>
<input id="email" type="email" aria-describedby="email-hint" />
<p id="email-hint">We never share your email.</p>
```

**Common questions**

- **What is WCAG?** The web accessibility guidelines; levels A, AA (usual legal target), AAA. Principles: perceivable, operable, understandable, robust.
- **When should you use ARIA?** Only when no native element fits (tabs, comboboxes). "No ARIA is better than bad ARIA."
- **How do you make a custom dropdown accessible?** Follow the ARIA combobox/listbox pattern: roles, `aria-expanded`, arrow-key navigation, focus management.

**Traps**

- `outline: none` without a replacement focus style.
- Clickable `div`s instead of buttons.
- Placeholder text used as the only label.
