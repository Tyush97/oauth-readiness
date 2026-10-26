import { runAgent, type AgentEvent } from "@/lib/agent/pipeline";
import { runMock } from "@/lib/agent/mock";

export const runtime = "nodejs";
export const maxDuration = 300;

// Best-effort abuse guard for a public demo on a free model quota. Per instance, not global.
const hits = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 10 * 60_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 6;
}

export async function POST(req: Request) {
  const { query } = (await req.json().catch(() => ({}))) as { query?: string };
  const q = (query ?? "").trim().slice(0, 120);
  if (q.length < 2) return Response.json({ error: "Enter an app name or website." }, { status: 400 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (limited(ip)) return Response.json({ error: "Too many generations from this address. Try again in a few minutes." }, { status: 429 });

  const events = process.env.MOCK_GENERATION === "1" ? runMock(q) : runAgent(q);
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (e: AgentEvent) => controller.enqueue(enc.encode(JSON.stringify(e) + "\n"));
      try {
        for await (const e of events) send(e);
      } catch (err) {
        send({ type: "error", message: err instanceof Error ? err.message : "The agent failed unexpectedly." });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" } });
}
