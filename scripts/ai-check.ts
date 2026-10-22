// Quick check that the configured model answers: npm run ai:check
import "dotenv/config";
import { chatJson } from "../src/lib/ai";

async function main() {
  const res = await chatJson<{ ok: boolean; model: string }>([
    { role: "system", content: 'Reply only with JSON like {"ok": true, "model": "<your name>"}.' },
    { role: "user", content: "Health check." },
  ]);
  console.log(`provider=${process.env.AI_PROVIDER ?? "ollama"}`, res);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
