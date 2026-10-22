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
