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

## State management

**Key ideas**

- Start simple: component state → a **service with signals** (or a `BehaviorSubject`) shared via DI → a store library only when needed.
- **NgRx Store:** the Redux pattern. **Actions** describe events, **reducers** are pure functions returning new state, **selectors** read memoized slices, **effects** handle side effects (HTTP).
- **NgRx SignalStore** / **ComponentStore**: lighter, feature-level stores.
- State is immutable: return new objects, never mutate.
- Keep server cache, UI state and form state apart.

```ts
@Injectable({ providedIn: "root" })
export class CartStore {
  private readonly items = signal<Item[]>([]);
  readonly count = computed(() => this.items().length);

  add(item: Item) {
    this.items.update((list) => [...list, item]); // new array, no mutation
  }
}
```

**Common questions**

- **When do you need NgRx?** Large apps with much shared state, many developers, complex flows, or a need for time-travel debugging. Overkill for small apps.
- **What is an NgRx effect?** A stream that listens for actions, runs a side effect (API call) and dispatches success or failure actions.
- **Why are selectors memoized?** They recompute only when their input slice changes, saving work and keeping references stable.

**Traps**

- Putting everything in the global store, even form inputs and one-off UI flags.
- Mutating state inside a reducer — selectors and change detection miss the change.
- Subscribing to the store by hand and forgetting to unsubscribe; prefer the `async` pipe or `toSignal`.

## Performance & SSR

**Key ideas**

- **Lazy loading:** `loadComponent` / `loadChildren` in routes split the bundle by page.
- **`@defer` blocks** load part of a template later (`on viewport`, `on idle`, `on interaction`).
- **OnPush** + immutable inputs + signals = fewer checks. **Zoneless** apps drop Zone.js entirely.
- `@for (item of items; track item.id)` lets Angular reuse DOM nodes for unchanged items.
- **SSR** (`@angular/ssr`) renders HTML on the server for a faster first paint and SEO; **hydration** reuses that DOM in the browser instead of rebuilding it.
- Pure pipes are cached by input; plain method calls in templates run on every check.

```html
@defer (on viewport) {
  <app-comments [postId]="post.id" />
} @placeholder {
  <p>Comments load when you scroll here…</p>
}
```

**Common questions**

- **How do you find what makes an Angular app slow?** Angular DevTools profiler for change detection, a bundle analyzer (`source-map-explorer`) for size, Lighthouse for loading.
- **SSR vs prerendering?** SSR renders on each request; prerendering renders static routes at build time.
- **What breaks during SSR?** Direct use of `window`, `document`, `localStorage`. Guard with `isPlatformBrowser` or run it in `afterNextRender`.

**Traps**

- Plain method calls in templates run on every change detection cycle.
- A missing or unstable `track` expression re-creates the whole list.
- Hydration mismatch when server and browser render different HTML (random values, current time).

## Testing

**Key ideas**

- **TestBed** builds a testing module: import the component, provide mocks for its services.
- `ComponentFixture` exposes the component instance and its DOM; `fixture.detectChanges()` runs change detection.
- Mock services with `{ provide: ApiService, useValue: mockApi }`.
- HTTP: `provideHttpClient()` + `provideHttpClientTesting()`, then `HttpTestingController` to expect requests and flush fake responses.
- Async: `fakeAsync` + `tick()` control time; `waitForAsync` for real async work.
- Karma/Jasmine was the default; newer projects use Jest or Vitest. E2E with Playwright or Cypress.

```ts
it("shows the user name", () => {
  TestBed.configureTestingModule({
    imports: [ProfileComponent],
    providers: [{ provide: UserService, useValue: { user: signal({ name: "Ada" }) } }],
  });
  const fixture = TestBed.createComponent(ProfileComponent);
  fixture.detectChanges();
  expect(fixture.nativeElement.textContent).toContain("Ada");
});
```

**Common questions**

- **How do you test a component that calls an API?** Provide a mock service, or use `HttpTestingController` to assert the request URL and flush a response.
- **Shallow vs deep component tests?** Shallow: stub child components. Deep: render real children — more realistic, slower.
- **How do you test a service with no template?** Get it with `TestBed.inject(Service)` and call its methods directly.

**Traps**

- Forgetting `fixture.detectChanges()` — the template never updates.
- No `HttpTestingController.verify()` — unexpected extra requests go unnoticed.
- Testing private methods instead of public behavior.

## CLI & project structure

**Key ideas**

- `ng new`, `ng serve`, `ng build`, `ng test`, `ng generate component|service|guard|pipe`.
- `angular.json` holds build and serve config per project; `tsconfig.json` controls TypeScript strictness.
- **Environments / build configurations** (`development`, `production`) swap settings at build time.
- Recommended structure: group by **feature** (`orders/`, `users/`), with `core/` (singletons) and `shared/` (reusable UI).
- Builder: the **esbuild/Vite-based application builder** is the default in recent versions; `ng update` migrates code between versions.

```bash
ng generate component orders/order-list --change-detection OnPush
ng build --configuration production
ng update @angular/core @angular/cli
```

**Common questions**

- **What does `ng build` produce?** Bundled, minified, hashed JS/CSS files in `dist/`, ready for a static server or SSR.
- **How do you organize a large Angular app?** Feature folders, lazy-loaded routes per feature, shared UI library, core services provided in root.
- **How do you upgrade Angular?** One major at a time with `ng update`, following the official update guide.

**Traps**

- Putting secrets in `environment.ts` — it ships to the browser.
- Skipping several major versions in one jump.
- A giant `shared` module/folder that everything depends on.

## Standalone components & bootstrapping

**Key ideas**

- **Standalone components** (default since v17/v19) declare their own `imports` — no `NgModule` needed.
- Bootstrap with `bootstrapApplication(AppComponent, appConfig)`; providers go in `app.config.ts` (`provideRouter`, `provideHttpClient`).
- Lazy-load a standalone component directly with `loadComponent`.
- `NgModule` still works and can be mixed in; migrate with `ng generate @angular/core:standalone`.
- `provide*()` functions replace `SomeModule.forRoot()`.

```ts
// app.config.ts
export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([authInterceptor])),
  ],
};

// main.ts
bootstrapApplication(AppComponent, appConfig);
```

**Common questions**

- **Why standalone instead of NgModules?** Less boilerplate, clearer dependencies per component, easier lazy loading and tree shaking.
- **Where do app-wide providers go now?** In `appConfig.providers`, or `providedIn: "root"` on the service.
- **Can standalone components use NgModule-based libraries?** Yes — import the module in the component's `imports`.

**Traps**

- Forgetting to add a used component/directive/pipe to `imports` → "not a known element".
- Providing a service in a lazy route's `providers` creates a separate instance for that route.
- Mixing `forRoot()` modules and `provide*()` functions for the same feature twice.

## Lifecycle hooks

**Key ideas**

- Order: `constructor` → `ngOnChanges` → `ngOnInit` → `ngDoCheck` → `ngAfterContentInit` → `ngAfterContentChecked` → `ngAfterViewInit` → `ngAfterViewChecked` → `ngOnDestroy`.
- `ngOnChanges(changes)` runs when `@Input` references change.
- `ngOnInit`: inputs are set — start loading data here, not in the constructor.
- `ngAfterViewInit`: child views and `@ViewChild` are ready.
- `ngOnDestroy` / `DestroyRef.onDestroy` / `takeUntilDestroyed()` for cleanup.
- `afterNextRender` / `afterEveryRender` for DOM work that must run in the browser only.

```ts
export class ChartComponent implements AfterViewInit {
  private readonly destroyRef = inject(DestroyRef);
  @ViewChild("canvas") canvas!: ElementRef<HTMLCanvasElement>;

  ngAfterViewInit() {
    const chart = new Chart(this.canvas.nativeElement, this.config);
    this.destroyRef.onDestroy(() => chart.destroy());
  }
}
```

**Common questions**

- **Constructor vs `ngOnInit`?** Constructor: dependency injection only. `ngOnInit`: inputs are available, start logic there.
- **Why "ExpressionChangedAfterItHasBeenChecked"?** A value bound in the template changed during the same check (often in `ngAfterViewInit`). Move the change earlier or make it async/signal-based.
- **How do you react to input changes with signals?** Use `input()` and a `computed` or `effect` instead of `ngOnChanges`.

**Traps**

- Heavy work in `ngDoCheck` / `ngAfterViewChecked` — they run on every change detection.
- Not cleaning up subscriptions, timers and listeners.
- `ngOnChanges` doesn't fire when an object input is mutated (same reference).

## Directives

**Key ideas**

- **Components** are directives with a template.
- **Attribute directives** change look or behavior of an element (`[highlight]`, `ngClass`, `ngStyle`).
- **Structural directives** add/remove DOM (`*ngIf`, `*ngFor`); modern **control flow** (`@if`, `@for`, `@switch`) replaces them.
- `host` metadata (or `@HostListener` / `@HostBinding`) listens to and binds on the host element.
- **Host directives** compose behavior onto a component without inheritance.

```ts
@Directive({
  selector: "[appAutofocus]",
  host: { "(focus)": "onFocus()" },
})
export class AutofocusDirective implements AfterViewInit {
  private el = inject(ElementRef<HTMLElement>);
  ngAfterViewInit() { this.el.nativeElement.focus(); }
  onFocus() { /* ... */ }
}
```

**Common questions**

- **Attribute vs structural directive?** Attribute changes an existing element; structural changes DOM structure via `TemplateRef` + `ViewContainerRef`.
- **Why the new control flow over `*ngIf`?** Built into the compiler: no import, better type narrowing, faster, required `track` in `@for`.
- **How do you access the element safely?** `ElementRef` + `Renderer2`, or host bindings — avoid raw DOM APIs for SSR safety.

**Traps**

- Two structural directives on one element is not allowed — wrap with `<ng-container>`.
- Direct `nativeElement` manipulation breaks on the server.
- Forgetting to import the directive in the standalone component.

## Pipes

**Key ideas**

- Pipes transform values in templates: `{{ price | currency:"EUR" }}`, `date`, `uppercase`, `json`, `async`, `keyvalue`.
- **Pure pipes** (default) re-run only when the input reference changes — cheap.
- **Impure pipes** (`pure: false`) run on every change detection — use rarely.
- `async` pipe subscribes to an Observable/Promise and unsubscribes automatically.
- Custom pipe: class with `@Pipe({ name })` and `transform()`.

```ts
@Pipe({ name: "truncate" })
export class TruncatePipe implements PipeTransform {
  transform(value: string, max = 50): string {
    return value.length > max ? value.slice(0, max) + "…" : value;
  }
}
// {{ article.body | truncate:100 }}
```

**Common questions**

- **Pure vs impure pipe?** Pure runs on input reference change; impure runs every cycle (needed for mutated arrays, but slow).
- **Why prefer a pipe over a method call in the template?** The pure pipe's result is cached per input; a method runs on every check.
- **What does the `async` pipe do?** Subscribes, marks the view for check on new values, and unsubscribes on destroy.

**Traps**

- Pushing into an array doesn't re-run a pure pipe filtering it — create a new array.
- Several `| async` on the same cold Observable cause several HTTP calls — use `@let` or one subscription.
- Expensive logic in impure pipes.

## Component communication

**Key ideas**

- **Parent → child:** inputs — `input()` / `input.required()` signal inputs, or `@Input()`.
- **Child → parent:** outputs — `output()` or `@Output() EventEmitter`.
- **Two-way binding:** `model()` signal + `[(value)]` syntax.
- **Siblings / distant components:** a shared service with signals or Subjects.
- Parent can access the child instance via `viewChild()` / `@ViewChild`.
- Route params can bind straight to inputs with `withComponentInputBinding()`.

```ts
@Component({
  selector: "app-rating",
  template: `@for (s of stars; track s) { <button (click)="rate.emit(s)">★</button> }`,
})
export class RatingComponent {
  readonly max = input(5);
  readonly rate = output<number>();
  get stars() { return Array.from({ length: this.max() }, (_, i) => i + 1); }
}
// <app-rating [max]="10" (rate)="save($event)" />
```

**Common questions**

- **How do two unrelated components share data?** A service (provided in root or a common ancestor) holding a signal or BehaviorSubject.
- **`input()` vs `@Input()`?** `input()` returns a read-only signal, works with `computed`, and gives better type safety (`required`).
- **What is `model()`?** A writable signal input that also emits changes back — two-way binding.

**Traps**

- Mutating an input object in the child changes the parent's data silently.
- Overusing `@ViewChild` to call child methods creates tight coupling.
- Emitting outputs in the constructor (nobody is listening yet).

## Content projection & queries

**Key ideas**

- `<ng-content>` projects the parent's content into the child's template. `select="[header]"` creates named slots.
- `ng-template` defines a template that is not rendered until used; `ngTemplateOutlet` renders it, optionally with context.
- **View queries** (`viewChild`, `viewChildren`) find elements in the component's own template.
- **Content queries** (`contentChild`, `contentChildren`) find projected content.
- `<ng-container>` groups elements without adding a DOM node.

```html
<!-- card.component.html -->
<div class="card">
  <header><ng-content select="[card-title]" /></header>
  <ng-content />
</div>

<!-- usage -->
<app-card>
  <h2 card-title>Orders</h2>
  <p>12 new orders today.</p>
</app-card>
```

**Common questions**

- **View child vs content child?** View child is in my template; content child is passed in by my parent between my tags.
- **How do you let users customize how list items render?** Accept a `TemplateRef` input or content child and render it with `ngTemplateOutlet` and a context object.
- **Can projected content be shown conditionally?** It is always created by the parent; to create it lazily, project an `ng-template` instead.

**Traps**

- Content queries are not available in `ngOnInit` — wait for `ngAfterContentInit` (or use signal queries).
- `<ng-content>` inside `@if` doesn't stop the content from being instantiated.
- Styles from the child don't reach projected content without `::ng-deep` or global styles.

## Reactive forms & validators

**Key ideas**

- `FormControl`, `FormGroup`, `FormArray` — strongly typed in modern Angular. `FormBuilder` / `NonNullableFormBuilder` shortens setup.
- Built-in validators: `required`, `email`, `min`, `max`, `minLength`, `pattern`.
- **Custom validators** are functions returning `null` (valid) or an error object; **async validators** check a server.
- Cross-field validation on the group (password confirmation).
- `valueChanges` / `statusChanges` are Observables; `setValue` vs `patchValue`; `markAllAsTouched()` before showing errors.

```ts
const passwordsMatch: ValidatorFn = (group) =>
  group.get("password")?.value === group.get("confirm")?.value ? null : { mismatch: true };

form = inject(NonNullableFormBuilder).group(
  {
    email: ["", [Validators.required, Validators.email]],
    password: ["", Validators.minLength(8)],
    confirm: [""],
  },
  { validators: passwordsMatch },
);
```

**Common questions**

- **Template-driven vs reactive forms?** Template-driven: simple forms, logic in HTML with `ngModel`. Reactive: model in TS, testable, dynamic, better for complex forms.
- **`setValue` vs `patchValue`?** `setValue` needs every field; `patchValue` updates only the given ones.
- **How do you build a dynamic list of fields?** A `FormArray` of controls or groups, with `push`/`removeAt`.

**Traps**

- `form.value` skips disabled controls — use `getRawValue()`.
- Async validators firing on every keystroke — use `updateOn: "blur"` or debounce.
- Showing errors before the user touched the field.

## HTTP & interceptors

**Key ideas**

- `HttpClient` methods return Observables; nothing is sent until subscribed.
- Type responses: `http.get<User[]>("/api/users")`.
- **Functional interceptors** (`HttpInterceptorFn`) add headers, handle errors globally, show loaders, retry, log.
- Register with `provideHttpClient(withInterceptors([...]))`; order matters.
- `httpResource()` / `resource()` give signal-based data loading with loading and error states.
- Errors: `catchError` + `HttpErrorResponse`, `retry({ count, delay })`.

```ts
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).token();
  const authReq = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401) inject(Router).navigate(["/login"]);
      return throwError(() => err);
    }),
  );
};
```

**Common questions**

- **Why `req.clone()`?** Requests are immutable; clone to change headers or URL.
- **How do you cancel an HTTP request?** Unsubscribe — `switchMap` does it automatically when a new value arrives.
- **How do you handle errors in one place?** An error interceptor plus a user-facing notification service.

**Traps**

- `inject()` inside `catchError` callbacks runs outside the injection context — inject at the top of the interceptor.
- Forgetting to subscribe — the request never happens.
- Retrying non-idempotent requests (POST) can create duplicates.

## Signals in depth

**Key ideas**

- `signal(value)` — writable; `.set()`, `.update()`. `computed(() => ...)` — derived, lazy and memoized. `effect(() => ...)` — side effects when dependencies change.
- Dependencies are tracked automatically by reading signals.
- `linkedSignal` — writable state that resets when a source changes. `resource()` — async data as signals.
- Interop: `toSignal(observable$)` and `toObservable(signal)`.
- Signals enable fine-grained, **zoneless** change detection.

```ts
readonly query = signal("");
readonly page = linkedSignal({ source: this.query, computation: () => 1 }); // reset page on new query
readonly results = resource({
  params: () => ({ q: this.query(), page: this.page() }),
  loader: ({ params }) => fetch(`/api/search?q=${params.q}&p=${params.page}`).then((r) => r.json()),
});
```

**Common questions**

- **Signals vs RxJS?** Signals hold current state synchronously; RxJS models streams of events over time (debounce, websockets). They work together.
- **When should you use `effect`?** For syncing with non-Angular things (localStorage, logging, imperative APIs) — not for deriving state (use `computed`).
- **Is `computed` recalculated on every read?** No — only when a dependency changed since the last read.

**Traps**

- Setting signals inside `computed` is not allowed.
- Mutating an object inside a signal without `set`/`update` doesn't notify anyone.
- Using `effect` to copy one signal into another instead of `computed` / `linkedSignal`.

## Security

**Key ideas**

- Angular **sanitizes** values bound to `innerHTML`, `href`, `src`, `style` — script injection is blocked by default.
- `DomSanitizer.bypassSecurityTrust*` disables that protection — only for trusted content.
- Interpolation `{{ }}` always escapes text.
- **XSRF:** `HttpClient` reads the `XSRF-TOKEN` cookie and sends `X-XSRF-TOKEN` on mutating requests (same-origin).
- Route **guards** (`canActivate`, `canMatch`) improve UX, but real authorization is on the server.
- Content Security Policy and Trusted Types are supported.

```ts
// Safe: Angular sanitizes the HTML
// <div [innerHTML]="comment.html"></div>

// Dangerous: disables sanitization — only for HTML you fully control
this.trusted = this.sanitizer.bypassSecurityTrustHtml(markdownRenderedByUs);
```

**Common questions**

- **Is an Angular app safe from XSS by default?** Mostly — templates escape and sanitize. Risks come from `bypassSecurityTrust*`, direct DOM APIs and server-side template injection.
- **Do route guards secure data?** No. They only hide pages; the API must check permissions.
- **Where do you store auth tokens?** Prefer `HttpOnly` cookies set by the server; avoid `localStorage` for long-lived tokens.

**Traps**

- `ElementRef.nativeElement.innerHTML = userInput` bypasses sanitization.
- Building templates dynamically from user input.
- Secrets or API keys in the front-end bundle.

## Internationalization (i18n)

**Key ideas**

- **Built-in `@angular/localize`**: mark text with `i18n` attributes or `$localize`, extract with `ng extract-i18n`, translate XLIFF files, build one bundle per locale (compile-time).
- **Runtime libraries** (Transloco, ngx-translate) switch language without reload, load JSON translations.
- ICU expressions handle plurals and choices: `{count, plural, =0 {none} =1 {one item} other {{{count}} items}}`.
- Locale-aware pipes: `date`, `currency`, `number`, `percent` use `LOCALE_ID`.
- Right-to-left languages need `dir="rtl"` and logical CSS properties.

```html
<h1 i18n="@@welcomeTitle">Welcome back</h1>
<p i18n>{count, plural, =0 {No messages} =1 {One message} other {{{count}} messages}}</p>
<span>{{ total | currency: "EUR" }}</span>
```

**Common questions**

- **Built-in i18n vs Transloco?** Built-in: fastest (translations compiled in), one build per locale, reload to switch. Transloco: runtime switching, lazy-loaded translations.
- **How do you format dates per locale?** Register locale data and set `LOCALE_ID`; the `date` pipe follows it.
- **How do you handle plurals correctly?** ICU plural syntax — languages have different plural rules.

**Traps**

- Concatenating translated fragments breaks word order in other languages.
- Hard-coded date/number formats.
- Forgetting to translate `title`, `aria-label` and placeholder attributes.
