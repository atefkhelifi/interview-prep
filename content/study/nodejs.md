# Node.js / Express

## Event loop & async

**Key ideas**

- Node runs JavaScript on one thread; I/O is handed to the OS or to **libuv**'s thread pool (file system, DNS, crypto, zlib) and callbacks come back through the event loop.
- Event loop phases: **timers** → pending callbacks → **poll** (I/O) → **check** (`setImmediate`) → close callbacks.
- Between every callback Node drains `process.nextTick` callbacks first, then promise microtasks.
- CPU-heavy work blocks every request. Move it to **worker threads**, a separate process, or a job queue.

```js
setTimeout(() => console.log("timeout"), 0);
setImmediate(() => console.log("immediate"));
process.nextTick(() => console.log("nextTick"));
Promise.resolve().then(() => console.log("promise"));
// nextTick, promise, then timeout/immediate (order of those two varies outside I/O callbacks)
```

**Common questions**

- **Is Node single-threaded?** JavaScript execution is; libuv uses a thread pool (default 4) for some I/O and crypto.
- **`setImmediate` vs `setTimeout(fn, 0)` vs `process.nextTick`?** `nextTick` runs before anything else queued; `setImmediate` runs in the check phase; `setTimeout(0)` in the next timers phase.
- **How do you scale Node on a multi-core machine?** Run several processes (cluster module, PM2, containers) behind a load balancer.

**Traps**

- Synchronous APIs (`fs.readFileSync`, heavy `JSON.parse`) inside request handlers block all users.
- Recursive `process.nextTick` can starve I/O.

## Modules & packages

**Key ideas**

- **CommonJS** (`require`, `module.exports`, synchronous) vs **ES modules** (`import`/`export`, static, top-level `await`). `"type": "module"` in `package.json` or `.mjs` selects ESM.
- Modules are cached after first load — a module is a natural singleton.
- `package.json`: `dependencies` vs `devDependencies`, semver ranges (`^1.2.3` = compatible minor/patch), `scripts`.
- Lockfiles (`package-lock.json`) pin exact versions; use `npm ci` in CI.

**Common questions**

- **`require` vs `import`?** `require` is dynamic and synchronous; `import` is static (tree-shakable) and async-capable. Mixing them has interop rules (ESM can import CJS; CJS needs dynamic `import()` for ESM).
- **What does `^` mean in a version?** Allow updates that don't change the left-most non-zero digit.

**Traps**

- Circular `require`s return a partially filled `exports` object.
- Installing packages without reviewing them is a supply-chain risk — check maintainers, use `npm audit`, pin versions.

## Streams & buffers

**Key ideas**

- Streams process data in chunks instead of loading everything into memory: **Readable**, **Writable**, **Duplex**, **Transform**.
- **Backpressure:** when a writable can't keep up, `write()` returns `false`; wait for `drain`. `pipeline()` handles this and errors for you.
- `Buffer` holds raw bytes; convert with `buf.toString("utf8")` / `Buffer.from(str)`.
- Readable streams are async iterable: `for await (const chunk of stream)`.

```js
import { pipeline } from "node:stream/promises";
import { createReadStream, createWriteStream } from "node:fs";
import { createGzip } from "node:zlib";

await pipeline(createReadStream("big.log"), createGzip(), createWriteStream("big.log.gz"));
```

**Common questions**

- **Why use streams for file uploads/downloads?** Constant memory and the client starts receiving data immediately.
- **`pipe` vs `pipeline`?** `pipeline` forwards errors and destroys all streams on failure; plain `pipe` can leak file descriptors.

**Traps**

- Ignoring backpressure → memory grows until the process crashes.
- Concatenating multi-byte UTF-8 chunks as strings can split characters; use `setEncoding` or `StringDecoder`.

## Express & middleware

**Key ideas**

- A middleware is `(req, res, next) => {}`; they run in registration order. Call `next()` to continue, or send a response to stop.
- Error-handling middleware has four arguments `(err, req, res, next)` and is registered last.
- Routers group routes: `express.Router()`; mount with `app.use("/api/users", router)`.
- Built-ins: `express.json()` body parsing, `express.static()`.
- Express 5 forwards rejected promises from async handlers to the error handler; in Express 4 you must `catch` and call `next(err)`.

```js
app.use(express.json());
app.get("/api/users/:id", async (req, res) => {
  const user = await users.find(req.params.id);
  if (!user) return res.status(404).json({ error: "Not found" });
  res.json(user);
});
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal error" });
});
```

**Common questions**

- **How does middleware order matter?** Auth must run before protected routes; the error handler must come after all routes; body parsers before handlers that read `req.body`.
- **How do you validate input?** A schema library (zod, Joi) in a middleware or at the top of each handler; return 400 with details.
- **REST status codes?** 200 OK, 201 Created, 204 No Content, 400 Bad Request, 401 Unauthenticated, 403 Forbidden, 404 Not Found, 409 Conflict, 500 Server Error.

**Traps**

- Calling `res.send` twice → "Cannot set headers after they are sent".
- Forgetting `return` after sending a response in a branch.

## Security & production

**Key ideas**

- Validate and sanitize all input; use parameterized queries (never string-concatenated SQL).
- Set security headers (`helmet`), restrict CORS, rate-limit login endpoints, use HTTPS.
- Store secrets in environment variables / a secret manager, never in code.
- Hash passwords with bcrypt/scrypt/argon2. Sessions in httpOnly, secure cookies; JWTs must be short-lived and verified.
- Production: `NODE_ENV=production`, a process manager or container orchestrator, structured logging, health checks, graceful shutdown on `SIGTERM`.

**Common questions**

- **How do you handle uncaught errors?** Error middleware for requests; `process.on("unhandledRejection")` / `uncaughtException` to log and restart cleanly — the process state may be corrupt.
- **Session vs JWT?** Sessions: server state, easy revocation. JWT: stateless, but hard to revoke — keep them short-lived with refresh tokens.

**Traps**

- Returning stack traces to clients leaks internals.
- Prototype pollution via unsafe object merging of user input.

## Error handling & logging

**Key ideas**

- **Operational errors** (bad input, network failure) are expected — handle them. **Programmer errors** (bugs) — crash and restart cleanly.
- `async` route handlers: Express 5 forwards rejected promises to the error handler; Express 4 needs `try/catch` + `next(err)` or a wrapper.
- One central error middleware with **four** arguments `(err, req, res, next)` maps errors to status codes.
- `process.on("unhandledRejection")` / `"uncaughtException"`: log, then exit — state may be broken.
- **Structured logging** (JSON) with **pino** or winston; add a request id to every line; never log passwords or tokens.

```js
class NotFoundError extends Error {
  status = 404;
}

app.get("/users/:id", async (req, res) => {
  const user = await db.findUser(req.params.id);
  if (!user) throw new NotFoundError("User not found"); // Express 5 passes it on
  res.json(user);
});

app.use((err, req, res, next) => {
  req.log.error({ err }, "request failed");
  res.status(err.status ?? 500).json({ error: err.status ? err.message : "Internal error" });
});
```

**Common questions**

- **Why exit on `uncaughtException`?** The process may be in an unknown state (half-written data, leaked locks). Let the process manager or orchestrator restart it.
- **How do you trace one request across logs?** Generate or forward a request id (e.g. `x-request-id`), attach it to a child logger, include it in every log line.
- **Why not `console.log` in production?** No levels, no structure, synchronous on some outputs; JSON loggers are faster and searchable.

**Traps**

- Sending stack traces to clients leaks internals.
- An error middleware with three parameters is treated as a normal middleware.
- Forgetting `return` after `res.send()` leads to "headers already sent".

## Authentication & authorization

**Key ideas**

- **Sessions:** server stores session data; the browser holds a session id cookie. Easy to revoke.
- **JWT:** signed token holding claims; the server verifies the signature without a lookup. Short-lived access token + long-lived refresh token.
- Hash passwords with **bcrypt** or **argon2** (slow, salted). Never store plain or fast-hashed passwords.
- **OAuth 2.0 / OpenID Connect** for "Sign in with Google": authorization code flow with PKCE.
- **Authorization:** check permissions on every request (roles, ownership), in middleware or the service layer.
- Cookies: `HttpOnly`, `Secure`, `SameSite=Lax` or `Strict`.

```js
import jwt from "jsonwebtoken";

function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
}

app.delete("/posts/:id", requireAuth, async (req, res) => {
  const post = await db.getPost(req.params.id);
  if (post.authorId !== req.user.sub) return res.status(403).end(); // ownership check
  await db.deletePost(post.id);
  res.status(204).end();
});
```

**Common questions**

- **Sessions vs JWT?** Sessions: simple, revocable, need shared storage when scaling. JWT: stateless, good across services, hard to revoke before expiry.
- **Where do you store a JWT in the browser?** Preferably in an `HttpOnly` cookie (safe from XSS, then protect against CSRF), not `localStorage`.
- **Authentication vs authorization?** Authentication proves who you are; authorization decides what you may do.

**Traps**

- Not pinning `algorithms` in `jwt.verify` (old `alg: none` / key-confusion attacks).
- Checking only "is logged in" and not "owns this resource" (IDOR).
- Login endpoints without rate limiting invite brute force.

## Testing & debugging

**Key ideas**

- Runners: built-in **`node:test`**, Jest or Vitest. Assertions with `node:assert`.
- **Supertest** sends HTTP requests to an Express app without opening a port.
- Mock outside services (HTTP with `nock` or MSW); use a real test database (Docker / Testcontainers) for integration tests.
- Export the `app` separately from `app.listen()` so tests can import it.
- Debugging: `node --inspect` + Chrome DevTools or VS Code; `--cpu-prof` and heap snapshots for performance and memory leaks.

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { app } from "../src/app.js";

test("GET /health returns ok", async () => {
  const res = await request(app).get("/health");
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { status: "ok" });
});
```

**Common questions**

- **How do you find a memory leak in Node?** Watch memory over time, take two heap snapshots under load and compare retained objects (often caches, listeners, closures).
- **How do you test code that uses the current time?** Inject a clock or use fake timers (`mock.timers` in `node:test`, `vi.useFakeTimers`).
- **Unit vs integration for an API?** Unit-test business logic with mocks; integration-test routes with Supertest and a real database.

**Traps**

- Tests sharing one database without cleanup depend on run order.
- Open handles (DB pools, servers) keep the test process from exiting — close them in `after`.
- Mocking so much that the real SQL is never executed.

## Worker threads & child processes

**Key ideas**

- Node runs your JS on one thread; CPU-heavy work blocks every request.
- **`worker_threads`**: real threads running JS in parallel, communicating by messages (`postMessage`) or `SharedArrayBuffer`. For CPU-bound work (image processing, hashing, parsing).
- **`child_process`**: separate OS processes — `spawn` (stream output), `exec` (buffer output, shell), `execFile` (no shell), `fork` (Node child with IPC channel).
- The **libuv thread pool** (default 4 threads, `UV_THREADPOOL_SIZE`) already handles `fs`, `crypto`, `zlib`, `dns.lookup`.
- Use a worker pool (e.g. Piscina) rather than one worker per request.

```js
// main.js
import { Worker } from "node:worker_threads";

function resize(imagePath) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./resize-worker.js", import.meta.url), { workerData: imagePath });
    worker.once("message", resolve);
    worker.once("error", reject);
  });
}

// resize-worker.js
import { parentPort, workerData } from "node:worker_threads";
parentPort.postMessage(heavyResize(workerData));
```

**Common questions**

- **Worker threads vs child processes vs cluster?** Workers: threads in one process, cheap messaging, for CPU tasks. Child processes: run other programs or isolate crashes. Cluster: several copies of a server sharing a port.
- **Does async I/O need worker threads?** No — I/O is already non-blocking. Workers are for CPU work.
- **`exec` vs `execFile`?** `exec` runs in a shell (injection risk with user input); `execFile` runs the binary directly with an argument array.

**Traps**

- `exec("convert " + userFile)` with user input — command injection.
- Spawning a new worker per request costs ~tens of ms and memory — pool them.
- Huge messages between threads are copied (structured clone) unless transferred.

## File system

**Key ideas**

- Three APIs: callback (`fs.readFile`), promises (`fs/promises`), sync (`fs.readFileSync` — only at startup or in CLIs).
- Read small files whole; **stream** big ones (`createReadStream`).
- `path.join` / `path.resolve` build paths portably; `import.meta.dirname` (ESM) or `__dirname` (CJS).
- `fs.watch` for file changes; `fs.mkdir(dir, { recursive: true })`; `fs.rm(dir, { recursive: true, force: true })`.
- Write safely: write to a temp file then `rename` (atomic on the same filesystem).

```js
import { readFile, writeFile, rename, mkdir } from "node:fs/promises";
import path from "node:path";

const dir = path.join(import.meta.dirname, "data");
await mkdir(dir, { recursive: true });

const file = path.join(dir, "settings.json");
const settings = JSON.parse(await readFile(file, "utf8").catch(() => "{}"));
settings.theme = "dark";

await writeFile(file + ".tmp", JSON.stringify(settings, null, 2));
await rename(file + ".tmp", file); // no half-written file on crash
```

**Common questions**

- **Why avoid `readFileSync` in a server?** It blocks the event loop; every request waits.
- **How do you prevent path traversal?** Resolve the final path and check it starts with the allowed base directory; never join raw user input like `../../etc/passwd`.
- **How do you process a 5 GB file?** Stream it (`readline` over `createReadStream`, or `pipeline` with transforms).

**Traps**

- `fs.exists` then `open` — race condition; just open and handle `ENOENT`.
- Relative paths resolve from the **current working directory**, not the file's folder.
- Too many files open at once → `EMFILE`; limit concurrency.

## HTTP & REST API design

**Key ideas**

- Resources as nouns: `GET /orders`, `GET /orders/42`, `POST /orders`, `PATCH /orders/42`, `DELETE /orders/42`; nested `GET /customers/7/orders`.
- Status codes: `200` OK, `201` Created (+ `Location`), `204` No Content, `400` bad input, `401`, `403`, `404`, `409` conflict, `422` validation, `429` rate limited, `500`.
- **Idempotency**: `GET`, `PUT`, `DELETE` are idempotent; make `POST` safe to retry with an `Idempotency-Key` header.
- Pagination (`?limit=20&cursor=...`), filtering, sorting via query params; consistent error format (`application/problem+json`).
- Versioning (`/v1/`, header), caching headers (`ETag`, `Cache-Control`), OpenAPI documentation.

```js
app.post("/v1/orders", async (req, res) => {
  const key = req.get("Idempotency-Key");
  const existing = key && (await idempotency.get(key));
  if (existing) return res.status(201).json(existing);

  const order = await orders.create(req.body);
  if (key) await idempotency.set(key, order);
  res.status(201).location(`/v1/orders/${order.id}`).json(order);
});
```

**Common questions**

- **PUT vs PATCH?** PUT replaces the whole resource; PATCH changes some fields.
- **Offset vs cursor pagination?** Offset is simple but slow and unstable when data changes; cursor (keyset) is fast and stable.
- **How do you version an API?** URL prefix (`/v1`) is the most visible; header-based is cleaner. Avoid breaking changes inside a version.

**Traps**

- Returning `200` with `{ error: ... }` in the body.
- Verbs in URLs (`/getOrders`, `/deleteUser`).
- Unbounded list endpoints without pagination.

## Input validation

**Key ideas**

- Never trust `req.body`, `req.query`, `req.params`, headers — validate type, shape, ranges, lengths.
- Schema libraries: **zod**, Joi, Yup, AJV (JSON Schema). Parse → get typed, clean data or a 400 error.
- Validate at the edge (middleware) and keep services working with already-validated types.
- Strip unknown fields to prevent **mass assignment** (`isAdmin: true` in a signup body).
- Limit body size (`express.json({ limit: "100kb" })`).

```js
import { z } from "zod";

const CreateUser = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  age: z.coerce.number().int().min(13).optional(),
}); // unknown keys are stripped by default

const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ errors: result.error.flatten().fieldErrors });
  req.body = result.data;
  next();
};

app.post("/users", validate(CreateUser), createUser);
```

**Common questions**

- **Validation vs sanitization?** Validation rejects bad input; sanitization transforms it (trim, escape). Prefer validating and escaping on output.
- **Why validate on the server if the front end already does?** Anyone can call the API directly.
- **How do you share types between validation and TypeScript?** Infer them from the schema (`z.infer<typeof CreateUser>`).

**Traps**

- Query strings are always strings — `"false"` is truthy.
- Passing `req.body` straight into an ORM `create()` / `update()`.
- Regex validators vulnerable to ReDoS.

## Databases & ORMs

**Key ideas**

- Drivers: `pg`, `mysql2`, `mongodb`. Query builders: Knex, Kysely. ORMs: **Prisma**, Drizzle, TypeORM, Sequelize, Mongoose (MongoDB).
- **Connection pools** reuse connections; size them to the database's limits (serverless needs a pooler/proxy).
- Always use **parameterized queries**.
- **Transactions** group writes: all or nothing.
- **Migrations** version the schema; run them in deployment, not on app start in multiple replicas at once.
- Watch for N+1 queries; select only needed columns; add indexes for filters and joins.

```js
// Prisma: create an order and its items in one transaction
const order = await prisma.$transaction(async (tx) => {
  const product = await tx.product.update({
    where: { id: productId, stock: { gte: qty } },
    data: { stock: { decrement: qty } },
  });
  return tx.order.create({
    data: { userId, items: { create: [{ productId, qty, price: product.price }] } },
  });
});
```

**Common questions**

- **ORM vs query builder vs raw SQL?** ORM: fast development, typed models, can hide inefficient queries. Query builder: SQL-like control with safety. Raw SQL: full power, more boilerplate.
- **Why a connection pool?** Opening a DB connection is slow; a pool reuses a fixed set and limits load on the database.
- **SQL vs MongoDB for a Node app?** SQL for relational data and transactions; MongoDB for flexible document shapes. Both work well with Node.

**Traps**

- Creating a new client per request (`new PrismaClient()` in a handler) exhausts connections.
- Forgetting `await` inside a transaction callback — queries run outside it.
- Loading whole tables into memory to filter in JS.

## Caching with Redis

**Key ideas**

- **Redis**: in-memory key-value store — strings, hashes, lists, sets, sorted sets, streams; keys can expire (TTL).
- **Cache-aside**: read cache → on miss, read DB and store with TTL. Invalidate or update on writes.
- Other uses: sessions, rate limiting counters, leaderboards (sorted sets), distributed locks, pub/sub, job queues (BullMQ).
- HTTP caching too: `Cache-Control`, `ETag`, CDN in front of public content.
- Cache keys should include everything the result depends on (user, locale, filters).

```js
async function getProduct(id) {
  const key = `product:${id}`;
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);

  const product = await db.product.findUnique({ where: { id } });
  await redis.set(key, JSON.stringify(product), { EX: 300 }); // 5 minutes
  return product;
}

async function updateProduct(id, data) {
  await db.product.update({ where: { id }, data });
  await redis.del(`product:${id}`); // invalidate
}
```

**Common questions**

- **What is a cache stampede?** Many requests miss the same expired key and all hit the DB. Fix: locking/single flight, early refresh, random TTL jitter.
- **What are the hard parts of caching?** Invalidation, stale data, memory limits and eviction policy.
- **In-process cache vs Redis?** In-process (Map/LRU) is fastest but per instance and lost on restart; Redis is shared across instances.

**Traps**

- Caching user-specific data under a shared key — data leaks between users.
- No TTL — stale data forever and memory growth.
- Treating Redis as durable storage without persistence configured.

## WebSockets & real-time

**Key ideas**

- **WebSocket**: persistent two-way connection over one TCP socket; starts as an HTTP upgrade.
- Libraries: `ws` (low level), **Socket.IO** (rooms, reconnection, fallbacks, acknowledgements).
- **Server-Sent Events (SSE)**: one-way server → client over plain HTTP, auto-reconnect — simpler for notifications and AI token streaming.
- Scaling: connections are stateful — sticky sessions and a shared pub/sub (Redis adapter) to broadcast across instances.
- Authenticate during the handshake; validate every incoming message; heartbeat/ping to detect dead connections.

```js
import { WebSocketServer } from "ws";

const wss = new WebSocketServer({ server: httpServer });

wss.on("connection", (socket, req) => {
  const user = authenticate(req); // e.g. cookie or token in the upgrade request
  if (!user) return socket.close(1008, "Unauthorized");

  socket.on("message", (raw) => {
    const msg = JSON.parse(raw);
    for (const client of wss.clients) {
      if (client.readyState === client.OPEN) client.send(JSON.stringify({ from: user.name, text: msg.text }));
    }
  });
});
```

**Common questions**

- **WebSocket vs SSE vs polling?** WebSocket for two-way, low-latency (chat, games). SSE for server push only. Polling for simple, infrequent updates.
- **How do you scale WebSockets to several servers?** Sticky load balancing plus a message bus (Redis pub/sub) so a message reaches clients on any instance.
- **How do you handle reconnection?** Client retries with backoff and resubscribes; the server can replay missed messages by id.

**Traps**

- Broadcasting user input without validation or escaping.
- No backpressure — slow clients make server memory grow (`socket.bufferedAmount`).
- Proxies closing idle connections without heartbeats.

## Background jobs & queues

**Key ideas**

- Move slow or unreliable work out of the request: emails, image processing, reports, webhooks.
- Queue libraries: **BullMQ** (Redis), pg-boss (PostgreSQL), or brokers (RabbitMQ, SQS, Kafka).
- Features: retries with exponential backoff, delayed jobs, cron/repeatable jobs, concurrency limits, priorities, dead-letter handling.
- Jobs must be **idempotent** — they may run more than once.
- Run workers as separate processes so they scale independently from the API.

```js
import { Queue, Worker } from "bullmq";

const emails = new Queue("emails", { connection });

// API: enqueue and answer immediately
await emails.add("welcome", { userId }, { attempts: 5, backoff: { type: "exponential", delay: 1000 } });

// Worker process
new Worker("emails", async (job) => {
  const user = await db.user.findUnique({ where: { id: job.data.userId } });
  await mailer.sendWelcome(user);
}, { connection, concurrency: 10 });
```

**Common questions**

- **Why not just `setTimeout` or a promise without await?** Work is lost on crash or deploy, no retries, no visibility, and it competes with request handling.
- **How do you make a job idempotent?** Check whether the effect already happened (status flags, unique constraints, idempotency keys) before acting.
- **How do you schedule recurring jobs across many instances?** Use the queue's repeatable jobs or a lock so only one instance runs each schedule.

**Traps**

- Putting large payloads in jobs instead of IDs.
- Infinite retries on a permanently bad job — cap attempts and alert.
- Workers that don't shut down gracefully lose jobs mid-run.

## Configuration & environment

**Key ideas**

- **12-factor**: config comes from environment variables, not code.
- Load `.env` in development (`node --env-file=.env`, or dotenv); in production, the platform injects variables / a secret manager.
- **Validate config at startup** and fail fast with a clear message.
- `NODE_ENV=production` changes library behavior (Express caching, less logging, React production builds).
- Keep secrets out of git, logs and front-end bundles.

```js
import { z } from "zod";

const Env = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
});

export const env = Env.parse(process.env); // crash at boot if something is missing
```

**Common questions**

- **Why environment variables for config?** Same build runs everywhere; only the environment differs; secrets stay out of the code.
- **How do you manage secrets in production?** A secret manager (Vault, AWS Secrets Manager, platform secrets), injected at runtime, rotated regularly.
- **What does `NODE_ENV=production` change?** Libraries enable optimizations and disable dev-only checks; it doesn't change your code unless you check it.

**Traps**

- Committing `.env` files.
- Env vars are strings — `"false"` is truthy; parse them.
- Reading `process.env` all over the code instead of one validated module.

## Scaling & clustering

**Key ideas**

- One Node process uses one CPU core for JS. Scale **vertically** (more processes per machine) and **horizontally** (more machines/containers).
- `node:cluster` or PM2 runs one process per core sharing a port; in containers, run one process per container and scale replicas.
- Put a **load balancer / reverse proxy** (Nginx, cloud LB) in front; it also terminates TLS and serves static files.
- Keep instances **stateless**: sessions, caches, uploads in Redis/DB/object storage.
- **Graceful shutdown**: on `SIGTERM`, stop accepting connections, finish in-flight requests, close DB pools, then exit.

```js
const server = app.listen(env.PORT);

process.on("SIGTERM", () => {
  server.close(async () => {   // stop new connections, wait for current ones
    await db.$disconnect();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref(); // force exit if stuck
});
```

**Common questions**

- **How do you use all CPU cores with Node?** Cluster mode / PM2, or several container replicas behind a load balancer.
- **Why must instances be stateless?** Any instance may get any request, and instances come and go.
- **What is graceful shutdown for?** Deploys and autoscaling without dropping requests or corrupting work.

**Traps**

- In-memory sessions or caches with several instances — users get logged out randomly.
- Cluster + WebSockets without sticky sessions.
- Ignoring `SIGTERM` — the orchestrator kills the process mid-request.

## GraphQL

**Key ideas**

- One endpoint; clients ask for exactly the fields they need. Schema defines **types**, **queries**, **mutations**, **subscriptions**.
- **Resolvers** fetch each field. Servers: Apollo Server, GraphQL Yoga, Mercurius.
- **N+1 problem** in resolvers — solve with **DataLoader** (batches and caches per request).
- Protect against expensive queries: depth limits, complexity limits, persisted queries, pagination.
- Errors come back in an `errors` array, usually with HTTP 200.

```js
const typeDefs = `#graphql
  type Author { id: ID!, name: String!, books: [Book!]! }
  type Book { id: ID!, title: String!, author: Author! }
  type Query { books(limit: Int = 20): [Book!]! }
`;

const resolvers = {
  Query: { books: (_, { limit }) => db.book.findMany({ take: limit }) },
  Book: { author: (book, _, { loaders }) => loaders.author.load(book.authorId) }, // batched
};
```

**Common questions**

- **GraphQL vs REST?** GraphQL: flexible queries, one round-trip, strong schema; harder caching and rate limiting. REST: simple, HTTP caching, well understood.
- **How does DataLoader fix N+1?** Collects all `load(id)` calls in one tick and runs a single batched query.
- **How do you secure a GraphQL API?** Auth in context, field-level authorization, query depth/complexity limits, disable introspection in production if needed.

**Traps**

- Unlimited nesting (`author { books { author { books ... } } }`) — denial of service.
- Exposing the database schema 1:1 as the GraphQL schema.
- HTTP caching doesn't work out of the box for POST queries.

## TypeScript with Node

**Key ideas**

- Run TS: compile with `tsc` to JS, run directly with **tsx** in development, or use Node's built-in **type stripping** (Node 22.6+/23+: `node app.ts` for erasable syntax).
- `tsconfig`: `"strict": true`, `"module": "nodenext"`, `"target"` matching your Node version, `"outDir"`.
- ESM in Node needs file extensions in relative imports (`./db.js` even from `.ts` files with `nodenext`).
- Types for libraries: built in, or `@types/*` packages (`@types/node`, `@types/express`).
- Types disappear at runtime — validate external input (zod) and infer types from schemas.

```ts
import express, { type Request, type Response } from "express";
import { z } from "zod";

const Params = z.object({ id: z.coerce.number().int() });

app.get("/users/:id", async (req: Request, res: Response) => {
  const { id } = Params.parse(req.params); // runtime check + typed result
  const user: User | null = await users.find(id);
  if (!user) return res.status(404).end();
  res.json(user);
});
```

**Common questions**

- **`tsc` vs tsx vs type stripping?** `tsc` type-checks and emits JS; tsx (esbuild) runs TS fast without checking; Node type stripping removes types without checking. Type-check separately in CI (`tsc --noEmit`).
- **Why `.js` extensions in TS imports?** Node's ESM resolver needs real file paths, and the import must point to the emitted file.
- **How do you type `req.user` in Express?** Declaration merging on Express's `Request` interface.

**Traps**

- Thinking TS types validate API input.
- `any` from untyped JSON spreading everywhere — type it as `unknown` and parse.
- Enums and namespaces are not erasable — they fail with Node's type stripping.
