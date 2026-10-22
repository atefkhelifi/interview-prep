import "server-only";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import type { RunResult, TestResult, Workshop } from "@/lib/workshops";

// Runs Java and C# tests in a throwaway Docker container: no network, capped memory, CPU and
// processes, read-only filesystem except small tmpfs folders, killed after a timeout.
// The user's code runs in the same process as the tests, so results are still practice data.

type Source = { text: string; formatError: (output: string) => string };

type Lang = {
  image: string;
  file: string;
  command: string;
  memory: string;
  timeoutMs: number;
  env?: string[];
  build: (code: string, tests: string, mark: string) => Source;
};

const MAX_PARALLEL = 2; // each run takes a few hundred MB
const MAX_OUTPUT = 256 * 1024;
const MAX_LOG_LINES = 200;

let running = 0;

// ---------- Java ----------

const JAVA_IMPORTS = ["java.util.*", "java.util.concurrent.*", "java.util.concurrent.atomic.*", "java.util.function.*", "java.util.stream.*"];

// `java Main.java` runs the first class in the file, so the harness comes first. Imports must be at
// the top: the user's are moved up and blanked in place so their line numbers stay the same.
function javaSource(code: string, tests: string, mark: string): Source {
  const imports: string[] = [];
  const body = code.split("\n").map((line) => {
    if (/^\s*import\s+(static\s+)?[\w.]+(\.\*)?\s*;\s*$/.test(line)) {
      imports.push(line.trim());
      return "";
    }
    return /^\s*package\s+[\w.]+\s*;\s*$/.test(line) ? "" : line;
  });
  const head = `${[...JAVA_IMPORTS.map((i) => `import ${i};`), ...imports].join("\n")}
class Main {
    static final String MARK = ${JSON.stringify(mark)};
    static final int OFFSET = %OFFSET%;
    interface Body { void run() throws Throwable; }
    static void test(String name, Body body) {
        String error = null;
        try { body.run(); }
        catch (AssertionError e) { error = String.valueOf(e.getMessage()); }
        catch (Throwable e) { error = e + where(e); }
        System.out.println(MARK + (error == null ? "PASS\\t" + name : "FAIL\\t" + name + "\\t" + error.replace('\\n', ' ')));
        System.out.flush();
    }
    static String where(Throwable e) {
        for (var f : e.getStackTrace())
            if ("Main.java".equals(f.getFileName()) && f.getLineNumber() > OFFSET) return " (line " + (f.getLineNumber() - OFFSET) + ")";
        return "";
    }
    static void eq(Object expected, Object actual) {
        if (!Objects.equals(expected, actual)) throw new AssertionError("Expected " + expected + ", got " + actual);
    }
    static void check(boolean ok, String message) {
        if (!ok) throw new AssertionError(message);
    }
    public static void main(String[] args) throws Throwable {
${tests}
        System.exit(0);
    }
}
`;
  const offset = head.split("\n").length - 1;
  return {
    text: head.replace("%OFFSET%", String(offset)) + body.join("\n") + "\n",
    formatError: (output) =>
      output
        .replace(/Main\.java:(\d+): /g, (_, n: string) => (Number(n) > offset ? `line ${Number(n) - offset}: ` : "in the tests: "))
        .replace(/^error: compilation failed\s*$/m, "")
        .trim(),
  };
}

// ---------- C# ----------

// A .NET 10 file-based app. Top-level statements must come before types, so the tests start with
// `await Tests.Run()`. #line directives make errors point at the user's own line numbers.
function csharpSource(code: string, tests: string, mark: string): Source {
  const usings: string[] = [];
  const body = code.split("\n").map((line) => {
    if (/^\s*using\s+(static\s+)?[\w.]+(\s*=\s*[\w.<>, ]+)?\s*;\s*$/.test(line)) {
      usings.push(line.trim());
      return "";
    }
    return line;
  });
  const text = `#:property PublishAot=false
using static Harness;
${usings.join("\n")}
await Tests.Run();

#line 1 "solution.cs"
${body.join("\n")}
#line default

static class Tests
{
#line 1 "tests.cs"
${tests}
#line default
}

static class Harness
{
    const string Mark = ${JSON.stringify(mark)};

    public static Task Test(string name, Action body) => Test(name, () => { body(); return Task.CompletedTask; });

    public static async Task Test(string name, Func<Task> body)
    {
        string? error = null;
        try { await body(); }
        catch (Exception e) { error = Describe(e); }
        Console.WriteLine(Mark + (error is null ? $"PASS\\t{name}" : $"FAIL\\t{name}\\t{error.ReplaceLineEndings(" ")}"));
    }

    static string Describe(Exception e)
    {
        if (e is TestFailure) return e.Message;
        var line = new System.Diagnostics.StackTrace(e, true).GetFrames()
            .FirstOrDefault(f => f.GetFileName()?.EndsWith("solution.cs") == true)?.GetFileLineNumber();
        return $"{e.GetType().Name}: {e.Message}" + (line > 0 ? $" (line {line})" : "");
    }

    public static void Check(bool ok, string message)
    {
        if (!ok) throw new TestFailure(message);
    }

    public static void Eq<T>(T expected, T actual)
    {
        if (!EqualityComparer<T>.Default.Equals(expected, actual)) throw new TestFailure($"Expected {expected}, got {actual}");
    }

    public static void Seq<T>(IEnumerable<T> expected, IEnumerable<T> actual)
    {
        var e = expected.ToList();
        var a = actual?.ToList() ?? throw new TestFailure("Got null");
        if (!e.SequenceEqual(a)) throw new TestFailure($"Expected [{string.Join(", ", e)}], got [{string.Join(", ", a)}]");
    }
}

class TestFailure(string message) : Exception(message);
`;
  return {
    text,
    formatError: (output) => {
      const errors = output
        .split("\n")
        .filter((l) => /error CS\d+/.test(l))
        .map((l) => l.replace(/\s*\[[^\]]*\.csproj\]\s*$/, "").replace(/^.*?\b(solution|tests)\.cs/, "$1.cs").trim());
      return [...new Set(errors)].slice(0, 10).join("\n") || output.trim();
    },
  };
}

const LANGS: Record<string, Lang> = {
  java: {
    image: "eclipse-temurin:21-jdk-alpine",
    file: "Main.java",
    command: "java -XX:+UseSerialGC -XX:TieredStopAtLevel=1 -XX:-UsePerfData Main.java",
    memory: "512m",
    timeoutMs: 15_000,
    build: javaSource,
  },
  csharp: {
    image: "mcr.microsoft.com/dotnet/sdk:10.0-alpine",
    file: "app.cs",
    command: "dotnet run app.cs",
    memory: "768m",
    timeoutMs: 30_000, // includes the build (~7 s)
    env: ["DOTNET_CLI_TELEMETRY_OPTOUT=1", "DOTNET_NOLOGO=1", "DOTNET_CLI_USE_MSBUILD_SERVER=0", "MSBUILDDISABLENODEREUSE=1", "UseSharedCompilation=false"],
    build: csharpSource,
  },
};

type Exec = { stdout: string; stderr: string; code: number | null; timedOut: boolean; spawnError?: string };

function docker(lang: Lang, source: string): Promise<Exec> {
  const name = `interview-run-${randomBytes(6).toString("hex")}`;
  const args = [
    "run", "--rm", "-i", "--name", name, "--pull", "never",
    "--network", "none",
    "--memory", lang.memory, "--memory-swap", lang.memory,
    "--cpus", "1", "--pids-limit", "512",
    "--cap-drop", "ALL", "--security-opt", "no-new-privileges",
    "--read-only", "--user", "65534:65534",
    "--tmpfs", "/work:rw,exec,size=128m,mode=1777",
    "--tmpfs", "/tmp:rw,exec,size=256m,mode=1777",
    "-w", "/work", "-e", "HOME=/work",
    ...(lang.env ?? []).flatMap((e) => ["-e", e]),
    lang.image, "sh", "-c", `cat > ${lang.file} && ${lang.command}`,
  ];

  return new Promise((resolve) => {
    const child = spawn("docker", args, { windowsHide: true });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    child.stdout.on("data", (d: Buffer) => { if (stdout.length < MAX_OUTPUT) stdout += d; });
    child.stderr.on("data", (d: Buffer) => { if (stderr.length < MAX_OUTPUT) stderr += d; });
    const timer = setTimeout(() => {
      timedOut = true;
      spawn("docker", ["kill", name], { windowsHide: true }).on("error", () => {});
      child.kill();
    }, lang.timeoutMs);
    child.on("error", (e) => {
      clearTimeout(timer);
      resolve({ stdout, stderr, code: null, timedOut, spawnError: e.message });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ stdout, stderr, code, timedOut });
    });
    child.stdin.on("error", () => {}); // container died before reading all input
    child.stdin.end(source);
  });
}

function parseOutput(stdout: string, mark: string) {
  const results: TestResult[] = [];
  const logs: string[] = [];
  for (const line of stdout.replace(/\r/g, "").split("\n")) {
    if (line.startsWith(mark)) {
      const [status, name, error] = line.slice(mark.length).split("\t");
      results.push(status === "PASS" ? { name, passed: true } : { name, passed: false, error: error || "Failed" });
    } else if (line && logs.length < MAX_LOG_LINES) {
      logs.push(line);
    }
  }
  return { results, logs };
}

export async function runOnServer(workshop: Workshop, code: string): Promise<RunResult> {
  const lang = LANGS[workshop.language];
  if (!lang || !workshop.tests) return { results: [], logs: [], error: "This task has no tests." };
  if (running >= MAX_PARALLEL) return { results: [], logs: [], error: "The code runner is busy. Try again in a few seconds." };

  running++;
  try {
    const mark = `@@${randomBytes(8).toString("hex")}@@`;
    const source = lang.build(code, workshop.tests, mark);
    const exec = await docker(lang, source.text);
    const { results, logs } = parseOutput(exec.stdout, mark);

    if (exec.spawnError || /Cannot connect to the Docker daemon|error during connect/i.test(exec.stderr)) {
      console.error("code runner:", exec.spawnError ?? exec.stderr);
      return { results: [], logs: [], error: "The code runner (Docker) is not available on the server." };
    }
    if (/No such image/i.test(exec.stderr)) {
      console.error(`code runner: image missing, run: docker pull ${lang.image}`);
      return { results: [], logs: [], error: "The code runner is not set up for this language yet." };
    }
    if (exec.timedOut) {
      return { results, logs, error: `Timed out after ${lang.timeoutMs / 1000}s. Is there an infinite loop or a deadlock?` };
    }
    if (results.length === 0) {
      const output = `${exec.stderr}\n${exec.stdout}`;
      const oom = exec.code === 137 ? "Out of memory. " : "";
      return { results: [], logs: [], error: oom + (source.formatError(output).slice(0, 4000) || `Exited with code ${exec.code}.`) };
    }
    return { results, logs };
  } finally {
    running--;
  }
}
