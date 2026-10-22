# Angular

## Components & templates

**Key ideas**

- A component = TypeScript class + template + styles. Modern Angular uses **standalone components** (no NgModule needed) that list their own `imports`.
- Data binding: interpolation `{{ x }}`, property `[value]="x"`, event `(click)="go()"`, two-way `[(ngModel)]="x"`.
- **Control flow blocks:** `@if`, `@for (item of items; track item.id)`, `@switch` replace `*ngIf` / `*ngFor`.
- Inputs and outputs: `input()` / `input.required()` and `output()` (signal-based), or the older `@Input()` / `@Output()` decorators.
- Content projection with `<ng-content>`; `@defer` blocks lazy-load parts of a template.
- Lifecycle: `ngOnInit` (after first inputs), `ngOnChanges` (input changes), `ngAfterViewInit` (view ready), `ngOnDestroy` (cleanup).

```ts
@Component({
  selector: "app-user-card",
  template: `
    @if (user(); as u) {
      <h3>{{ u.name }}</h3>
      <button (click)="selected.emit(u.id)">Select</button>
    }
  `,
})
export class UserCard {
  user = input.required<User>();
  selected = output<string>();
}
```

**Common questions**

- **Component vs directive?** A component is a directive with a template. Attribute directives change behavior/appearance of an existing element.
- **What are pipes? Pure vs impure?** Template transforms (`date`, `async`). Pure pipes re-run only when input reference changes; impure run every change detection.
- **Why does `@for` need `track`?** So Angular can reuse DOM nodes when the list changes instead of re-creating them.

**Traps**

- Calling methods in templates runs them on every change detection — use signals, `computed`, or pure pipes.
- Forgetting to import a standalone component/directive in `imports` gives "not a known element".

## Dependency injection

**Key ideas**

- Angular creates and supplies dependencies. Use `inject(Service)` or constructor parameters.
- `@Injectable({ providedIn: "root" })` = one app-wide singleton, tree-shakable.
- Providers can be registered at app, route, or component level; a component-level provider gives each component instance its own copy.
- Injector hierarchy: lookup goes from the element injector up to the root (environment) injector.
- `InjectionToken` for non-class values (config objects, strings).

**Common questions**

- **Why DI?** Loose coupling and easy testing — swap a real service for a mock in `TestBed`.
- **`useClass` / `useValue` / `useFactory` / `useExisting`?** Provide a different class, a constant, a value computed by a function, or an alias to another token.
- **How do you get a fresh service per component?** Add it to that component's `providers`.

**Traps**

- `inject()` works only in an injection context (constructor, field initializer, factory) — not inside a later callback.
- Providing a service in both root and a component creates two instances; state can look "lost".

## RxJS

**Key ideas**

- An `Observable` is a lazy stream of values over time. Nothing happens until you `subscribe`.
- `Subject` multicasts; `BehaviorSubject` holds a current value; `ReplaySubject` replays past values.
- Key operators: `map`, `filter`, `tap`, `debounceTime`, `distinctUntilChanged`, `catchError`, `retry`, `combineLatest`, `forkJoin`.
- **Flattening operators:** `switchMap` (cancel previous — search boxes), `mergeMap` (run all in parallel), `concatMap` (queue in order), `exhaustMap` (ignore new while busy — submit buttons).
- `HttpClient` returns cold observables that complete after one response.

```ts
results$ = this.query.valueChanges.pipe(
  debounceTime(300),
  distinctUntilChanged(),
  switchMap((q) => this.api.search(q).pipe(catchError(() => of([])))),
);
```

**Common questions**

- **Hot vs cold observable?** Cold starts producing per subscriber (HTTP). Hot produces regardless of subscribers (DOM events, Subjects).
- **How do you avoid memory leaks?** `async` pipe, `takeUntilDestroyed()`, or `toSignal()` — they unsubscribe automatically.
- **Observable vs Promise?** Observables can emit many values, are lazy, and cancellable; promises resolve once and start eagerly.

**Traps**

- Nested `subscribe` calls — use a flattening operator.
- Subscribing to the same HTTP observable twice sends two requests (use `shareReplay` if needed).
- `catchError` placed outside `switchMap` kills the whole stream on first error.

## Change detection & signals

**Key ideas**

- Classic change detection uses **zone.js** to know when async work finished, then checks the component tree.
- `ChangeDetectionStrategy.OnPush`: check a component only when an input reference changes, an event fires inside it, an `async` pipe emits, or a signal it reads changes.
- **Signals:** `signal()` holds a value, `computed()` derives one, `effect()` runs side effects. Angular knows exactly which views read which signals.
- **Zoneless** Angular relies on signals and explicit triggers instead of zone.js — smaller and faster.
- `toSignal` / `toObservable` bridge RxJS and signals.

```ts
count = signal(0);
double = computed(() => this.count() * 2);
inc() { this.count.update((c) => c + 1); }
```

**Common questions**

- **Signals vs RxJS?** Signals for synchronous state read in templates; RxJS for async event streams (HTTP, websockets, debouncing).
- **Why OnPush?** Fewer checks → better performance; forces immutable data patterns.
- **What does `ExpressionChangedAfterItHasBeenCheckedError` mean?** A binding changed during the dev-mode verification pass, usually from setting state in `ngAfterViewInit`.

**Traps**

- Mutating an object passed as input under OnPush does not trigger an update — create a new reference.
- Writing signals inside `computed()` is not allowed; use `effect()` sparingly, mostly for syncing to non-Angular code.

## Routing & forms

**Key ideas**

- Routes map paths to components; `loadComponent` / `loadChildren` lazy-load code.
- Functional guards (`canActivate`, `canMatch`) and resolvers are plain functions using `inject()`.
- Route params via `ActivatedRoute` or, with `withComponentInputBinding()`, directly as component inputs.
- **Template-driven forms:** `ngModel`, simple cases. **Reactive forms:** `FormGroup` / `FormControl` / `FormBuilder`, typed, testable, better for complex validation.
- Validators: built-in (`Validators.required`, `email`, `minLength`) and custom functions; async validators for server checks.

**Common questions**

- **Reactive vs template-driven forms?** Reactive: model in the class, explicit, typed, easy dynamic forms. Template-driven: model in template, less code for small forms.
- **How do you protect a route?** A `canActivate` guard that returns `true`, `false`, or a `UrlTree` redirect.
- **How does lazy loading help?** Smaller initial bundle; feature code loads on first navigation.

**Traps**

- Guards are UX only — always enforce authorization on the server.
- Forgetting `updateValueAndValidity()` after changing validators dynamically.
