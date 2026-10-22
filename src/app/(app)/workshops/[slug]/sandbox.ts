// Runs untrusted user code + tests away from the app:
// a sandboxed iframe (opaque origin: no cookies, no DOM access to the app)
// that starts a data: URL Web Worker, killed after a timeout.
// Workers that first download an engine (SQLite, Python) get `loadMs` extra and post
// { ready: true } once loaded; from then on the normal run timeout applies.
// JS and SQL get a fresh iframe + worker per run. Python keeps one warm worker (loading
// Pyodide takes seconds) and gets code + tests as a message; a timeout or crash kills it
// and the next run loads a new one.

import type { ClientSqlSpec } from "@/lib/sql-check";
import type { RunResult } from "@/lib/workshops";

const JS_TIMEOUT_MS = 3000;
const SQL = { loadMs: 15000, timeoutMs: 3000 }; // first run downloads the SQLite engine (~1 MB)
const PYTHON = { loadMs: 60000, timeoutMs: 5000 }; // first run downloads Python (~10 MB)
const BACKSTOP_EXTRA_MS = 2000; // parent-side backstop if the iframe itself hangs

const SQLJS_BASE = "https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/";
const PYODIDE_BASE = "https://cdn.jsdelivr.net/pyodide/v0.27.7/full/";

// One job at a time per iframe (callers serialize). The worker is reused while the same
// `source` comes with `keep`; `input`, if any, is posted to it as the job.
const IFRAME_SRC = `<!doctype html><script>
let worker = null, workerSource = null, ready = false;
const kill = () => { if (worker) worker.terminate(); worker = null; workerSource = null; };
addEventListener("message", (e) => {
  const { id, source, input, timeoutMs, loadMs, keep } = e.data || {};
  if (!id) return;
  const reply = (data) => parent.postMessage({ id, ...data }, "*");
  if (!worker || workerSource !== source) {
    kill();
    try {
      worker = new Worker("data:text/javascript;charset=utf-8," + encodeURIComponent(source));
    } catch (err) {
      return reply({ results: [], logs: [], error: "Could not start the sandbox: " + err.message });
    }
    workerSource = source;
    ready = !loadMs;
  }
  const onTimeout = () => {
    const loaded = ready;
    kill();
    reply({ results: [], logs: [], error: loaded
      ? "Timed out after " + timeoutMs / 1000 + "s. Is there an infinite loop or a promise that never settles?"
      : "Could not load the runtime in time. Check your connection and try again." });
  };
  let timer = setTimeout(onTimeout, ready ? timeoutMs : loadMs + timeoutMs);
  worker.onmessage = (m) => {
    clearTimeout(timer);
    if (m.data && m.data.ready) {
      ready = true;
      timer = setTimeout(onTimeout, timeoutMs);
      return reply({ ready: true });
    }
    if (!keep || m.data.fatal) kill();
    reply(m.data);
  };
  worker.onerror = (err) => {
    err.preventDefault();
    clearTimeout(timer);
    kill();
    reply({ results: [], logs: [], error: err.message || "Your code could not run (syntax error?)" });
  };
  if (input !== undefined) worker.postMessage(input);
});
</script>`;

type Job = { source: string; input?: unknown; timeoutMs: number; loadMs?: number; keep?: boolean };

function createFrame(): Promise<HTMLIFrameElement> {
  return new Promise((resolve) => {
    const iframe = document.createElement("iframe");
    iframe.setAttribute("sandbox", "allow-scripts");
    iframe.style.display = "none";
    iframe.srcdoc = IFRAME_SRC;
    iframe.onload = () => resolve(iframe);
    document.body.appendChild(iframe);
  });
}

// Sends one job; removes the iframe if it stops answering, so it is never reused.
function postJob(iframe: HTMLIFrameElement, { loadMs = 0, ...job }: Job): Promise<RunResult> {
  return new Promise((resolve) => {
    // Not crypto.randomUUID(): that needs a secure context (fails on plain-http LAN hosts).
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const done = (result: RunResult) => {
      clearTimeout(backstop);
      window.removeEventListener("message", onMessage);
      resolve(result);
    };
    const stalled = () => {
      iframe.remove();
      done({ results: [], logs: [], error: "The sandbox stopped responding." });
    };
    const onMessage = (e: MessageEvent) => {
      if (e.source !== iframe.contentWindow || e.data?.id !== id) return;
      if (e.data.ready) {
        clearTimeout(backstop);
        backstop = setTimeout(stalled, job.timeoutMs + BACKSTOP_EXTRA_MS);
        return;
      }
      const { results = [], logs = [], error } = e.data as RunResult;
      done({ results, logs, error });
    };
    let backstop = setTimeout(stalled, loadMs + job.timeoutMs + BACKSTOP_EXTRA_MS);
    window.addEventListener("message", onMessage);
    iframe.contentWindow?.postMessage({ id, loadMs, ...job }, "*");
  });
}

async function runWorker(job: Job): Promise<RunResult> {
  const iframe = await createFrame();
  try {
    return await postJob(iframe, job);
  } finally {
    iframe.remove();
  }
}

// The warm iframe lives on document.body, so it survives client-side navigation between tasks.
let warmFrame: Promise<HTMLIFrameElement> | null = null;
let warmQueue: Promise<unknown> = Promise.resolve();

function runWarm(job: Job): Promise<RunResult> {
  const run = warmQueue.then(async () => {
    let iframe = warmFrame && (await warmFrame);
    if (!iframe?.isConnected) {
      warmFrame = createFrame();
      iframe = await warmFrame;
    }
    return postJob(iframe, { ...job, keep: true });
  });
  warmQueue = run.catch(() => {});
  return run;
}

// JS harness. User code and tests share one block scope so tests can call the user's functions.
function jsWorkerSource(code: string, tests: string) {
  return `
const __logs = [];
const __fmt = (v) => { if (typeof v === "string") return v; try { return JSON.stringify(v) ?? String(v); } catch { return String(v); } };
console.log = console.info = console.warn = console.error = (...a) => { if (__logs.length < 200) __logs.push(a.map(__fmt).join(" ")); };
const __tests = [];
function test(name, fn) { __tests.push({ name, fn }); }
function __equal(a, b) {
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a), kb = Object.keys(b);
  return ka.length === kb.length && ka.every((k) => __equal(a[k], b[k]));
}
function expect(actual) {
  return {
    toBe(expected) { if (!Object.is(actual, expected)) throw new Error("Expected " + __fmt(expected) + ", got " + __fmt(actual)); },
    toEqual(expected) { if (!__equal(actual, expected)) throw new Error("Expected " + __fmt(expected) + ", got " + __fmt(actual)); },
    toThrow(type) {
      if (typeof actual !== "function") throw new Error("expect(fn).toThrow() needs a function");
      try { actual(); } catch (e) {
        if (type && !(e instanceof type)) throw new Error("Expected " + type.name + " to be thrown, got " + (e && e.name));
        return;
      }
      throw new Error("Expected the function to throw" + (type ? " " + type.name : ""));
    },
  };
}
(async () => {
  try {
${code}
;
${tests}
  } catch (e) {
    postMessage({ results: [], logs: __logs, error: "Error while loading your code: " + (e && e.message) });
    return;
  }
  const results = [];
  for (const t of __tests) {
    try { await t.fn(); results.push({ name: t.name, passed: true }); }
    catch (e) { results.push({ name: t.name, passed: false, error: String((e && e.message) || e) }); }
  }
  postMessage({ results, logs: __logs });
})();
`;
}

// SQL harness: run the user's query on a fresh SQLite database per dataset and compare
// with the expected rows computed on the server. Column names are ignored.
function sqlWorkerSource(query: string, spec: ClientSqlSpec) {
  return `
importScripts(${JSON.stringify(SQLJS_BASE + "sql-wasm.js")});
(async () => {
  let SQL;
  try {
    SQL = await initSqlJs({ locateFile: (f) => ${JSON.stringify(SQLJS_BASE)} + f });
  } catch (e) {
    postMessage({ results: [], logs: [], error: "Could not load the SQL engine: " + (e && e.message) });
    return;
  }
  postMessage({ ready: true });
  const spec = ${JSON.stringify(spec)};
  const query = ${JSON.stringify(query)};
  const lastRows = (db, q) => { const res = db.exec(q); return res.length ? res[res.length - 1].values : []; };
  const norm = (rows) => {
    const s = rows.map((r) => JSON.stringify(r.map((v) => (typeof v === "number" ? Math.round(v * 100) / 100 : v))));
    return spec.ordered ? s : s.sort();
  };
  const preview = (rows) => rows.slice(0, 3).join(", ") + (rows.length > 3 ? ", …" : "");
  const results = [];
  for (const d of spec.datasets) {
    const db = new SQL.Database();
    try {
      db.exec(spec.setup);
      if (d.sql) db.exec(d.sql);
      const expected = norm(d.expected);
      let actual;
      try { actual = norm(lastRows(db, query)); }
      catch (e) { results.push({ name: d.name, passed: false, error: "SQL error: " + e.message }); continue; }
      const ok = actual.length === expected.length && actual.every((row, i) => row === expected[i]);
      results.push(ok
        ? { name: d.name, passed: true }
        : { name: d.name, passed: false, error: "Expected " + expected.length + " row(s): " + preview(expected) + " — got " + actual.length + ": " + preview(actual) });
    } finally {
      db.close();
    }
  }
  postMessage({ results, logs: [] });
})();
`;
}

// Python harness, run by Pyodide with fresh globals each run. Tests load first (so they can
// stub modules like httpx), then the user's code, in one namespace. Errors point at the
// user's line numbers. Modules imported during the run are dropped so the next run starts clean.
const PY_HARNESS = `
import inspect, io, json, linecache, sys, traceback

_modules = set(sys.modules)
_out = io.StringIO()
sys.stdout = sys.stderr = _out
_tests = []


def test(name):
    def register(fn):
        _tests.append((name, fn))
        return fn
    return register


_ns = {"__name__": "__main__", "test": test}


def _load(src, filename):
    linecache.cache[filename] = (len(src), None, src.splitlines(True), filename)
    exec(compile(src, filename, "exec"), _ns)


def _describe(e, *filenames):
    if isinstance(e, SyntaxError) and e.filename == "solution.py":
        return f"{type(e).__name__}: {e.msg} (line {e.lineno})"
    text = f"{type(e).__name__}: {e}" if str(e) else type(e).__name__
    frames = traceback.extract_tb(e.__traceback__)
    for filename in filenames:
        frame = next((f for f in reversed(frames) if f.filename == filename), None)
        if frame:
            where = "line" if filename == "solution.py" else "test line"
            return f"{text} ({where} {frame.lineno}: {(frame.line or '').strip()})"
    return text


_result = {"results": []}
try:
    _load(__tests, "tests.py")
    _load(__code, "solution.py")
except BaseException as e:
    _result["error"] = "Error while loading your code: " + _describe(e, "solution.py")
else:
    for _name, _fn in _tests:
        try:
            _r = _fn()
            if inspect.isawaitable(_r):
                await _r
            _result["results"].append({"name": _name, "passed": True})
        except BaseException as e:
            # Failed asserts point at the test; other errors at the user's code first.
            order = ("tests.py",) if isinstance(e, AssertionError) else ("solution.py", "tests.py")
            _result["results"].append({"name": _name, "passed": False, "error": _describe(e, *order)})
_result["logs"] = _out.getvalue().splitlines()[:200]
sys.stdout, sys.stderr = sys.__stdout__, sys.__stderr__
for _m in set(sys.modules) - _modules:
    del sys.modules[_m]
json.dumps(_result)
`;

// Long-lived: loads Pyodide once, then runs one { code, tests } job per message.
const PYTHON_WORKER_SOURCE = `
importScripts(${JSON.stringify(PYODIDE_BASE + "pyodide.js")});
const loading = loadPyodide({ indexURL: ${JSON.stringify(PYODIDE_BASE)} }).then((py) => {
  postMessage({ ready: true });
  return py;
});
loading.catch(() => {});
onmessage = async (e) => {
  let py;
  try {
    py = await loading;
  } catch (err) {
    postMessage({ results: [], logs: [], fatal: true, error: "Could not load Python: " + (err && err.message) });
    return;
  }
  const globals = py.globals.get("dict")();
  try {
    globals.set("__code", e.data.code);
    globals.set("__tests", e.data.tests);
    postMessage(JSON.parse(await py.runPythonAsync(${JSON.stringify(PY_HARNESS)}, { globals })));
  } catch (err) {
    const lines = String((err && err.message) || err).trim().split("\\n");
    postMessage({ results: [], logs: [], error: lines[lines.length - 1] });
  } finally {
    globals.destroy();
  }
};
`;

export function runJsTests(code: string, tests: string) {
  return runWorker({ source: jsWorkerSource(code, tests), timeoutMs: JS_TIMEOUT_MS });
}

export function runPythonTests(code: string, tests: string) {
  return runWarm({ source: PYTHON_WORKER_SOURCE, input: { code, tests }, ...PYTHON });
}

// Starts loading Python in the background (an empty run), so the first real run is fast.
export function warmUpPython() {
  void runPythonTests("", "");
}

export function runSqlTests(query: string, spec: ClientSqlSpec) {
  return runWorker({ source: sqlWorkerSource(query, spec), ...SQL });
}
