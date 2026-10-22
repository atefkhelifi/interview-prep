// Model adapter: Gemma (or any model) via local Ollama, or Google AI Studio API.
// Pick with AI_PROVIDER=ollama|google and AI_MODEL.

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

type ChatOptions = { json?: boolean; temperature?: number };

const provider = process.env.AI_PROVIDER ?? "ollama";

export async function chat(messages: ChatMessage[], opts: ChatOptions = {}): Promise<string> {
  return provider === "google" ? chatGoogle(messages, opts) : chatOllama(messages, opts);
}

// Ask for JSON and parse it. Models sometimes wrap JSON in ``` fences; strip them.
export async function chatJson<T>(messages: ChatMessage[], opts: Omit<ChatOptions, "json"> = {}): Promise<T> {
  const raw = await chat(messages, { ...opts, json: true });
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    throw new Error(`Model did not return valid JSON: ${raw.slice(0, 200)}`);
  }
}

async function chatOllama(messages: ChatMessage[], opts: ChatOptions): Promise<string> {
  const base = process.env.OLLAMA_URL ?? "http://localhost:11434";
  const res = await fetch(`${base}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.AI_MODEL ?? "gemma3",
      messages,
      stream: false,
      ...(opts.json && { format: "json" }),
      options: { temperature: opts.temperature ?? 0.7 },
    }),
  });
  if (!res.ok) throw new Error(`Ollama error ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { message: { content: string } };
  return data.message.content;
}

async function chatGoogle(messages: ChatMessage[], opts: ChatOptions): Promise<string> {
  const key = process.env.GOOGLE_AI_API_KEY;
  if (!key) throw new Error("GOOGLE_AI_API_KEY is not set");
  const model = process.env.AI_MODEL ?? "gemma-3-27b-it";

  // Gemma on the API rejects system instructions, so fold system text into the first user turn.
  const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
  const turns = messages.filter((m) => m.role !== "system");
  const contents = turns.map((m, i) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: i === 0 && system ? `${system}\n\n${m.content}` : m.content }],
  }));
  if (contents.length === 0) contents.push({ role: "user", parts: [{ text: system }] });

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: opts.temperature ?? 0.7,
          // Gemma does not support responseMimeType; chatJson strips fences instead.
          ...(opts.json && !model.startsWith("gemma") && { responseMimeType: "application/json" }),
        },
      }),
    },
  );
  if (!res.ok) throw new Error(`Google AI error ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  return data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
}
