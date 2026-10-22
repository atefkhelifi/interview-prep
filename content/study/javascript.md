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
