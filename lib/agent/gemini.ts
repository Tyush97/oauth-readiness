/**
 * Minimal Gemini REST client. We use the REST API directly (no SDK) so the
 * only moving part is the model name, which is configurable via GEMINI_MODEL.
 */
const BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODELS = "gemini-flash-latest,gemini-flash-lite-latest";

export type GroundingChunk = { web?: { uri: string; title?: string } };

export type GeminiResult = {
  text: string;
  chunks: GroundingChunk[];
  queries: string[];
};

export class GeminiError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
  }
}

export async function generate(opts: {
  prompt: string;
  system?: string;
  search?: boolean;
  json?: boolean;
  temperature?: number;
  timeoutMs?: number;
  /** "fast" tries the lite model first; "best" tries the full model first. */
  prefer?: "fast" | "best";
}): Promise<GeminiResult> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new GeminiError("GEMINI_API_KEY is not set on the server.");
  // Comma-separated list; we fall through to the next model on 404 (retired), 429 (quota) or 5xx (overloaded).
  let models = (process.env.GEMINI_MODEL || DEFAULT_MODELS).split(",").map((m) => m.trim()).filter(Boolean);
  if (opts.prefer === "fast") models = [...models].reverse();
  let last: GeminiError | undefined;
  for (const model of models) {
    try {
      return await callModel(model, key, opts);
    } catch (e) {
      if (e instanceof GeminiError && [404, 429, 500, 503].includes(e.status ?? 0)) {
        last = e;
        continue;
      }
      if (e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError")) {
        last = new GeminiError(`Model ${model} took too long; tried the next one.`, 504);
        continue;
      }
      throw e;
    }
  }
  throw last ?? new GeminiError("No model available.");
}

async function callModel(
  model: string,
  key: string,
  opts: { prompt: string; system?: string; search?: boolean; json?: boolean; temperature?: number; timeoutMs?: number },
): Promise<GeminiResult> {

  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts: [{ text: opts.prompt }] }],
    generationConfig: {
      temperature: opts.temperature ?? 0.2,
      ...(opts.json ? { responseMimeType: "application/json" } : {}),
    },
  };
  if (opts.system) body.systemInstruction = { parts: [{ text: opts.system }] };
  if (opts.search) body.tools = [{ google_search: {} }];

  const res = await fetch(`${BASE}/${model}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(opts.timeoutMs ?? 45_000),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    const msg =
      res.status === 429
        ? "The free model quota is used up for now. Try again in a minute."
        : res.status === 404
        ? `Model ${model} is not available to this key.`
        : res.status === 503
        ? "The model is overloaded right now. Try again in a minute."
        : `Model request failed (${res.status}). ${detail.slice(0, 200)}`;
    throw new GeminiError(msg, res.status);
  }
  const data = await res.json();
  const cand = data?.candidates?.[0];
  const text: string = (cand?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? "").join("");
  const meta = cand?.groundingMetadata ?? {};
  return { text, chunks: meta.groundingChunks ?? [], queries: meta.webSearchQueries ?? [] };
}
