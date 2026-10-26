import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";
import { Guide } from "./schema";

/**
 * Generated guides are shared by putting the whole guide, compressed, in the URL hash.
 * No database, nothing stored on our server, and the hash never reaches the server.
 * The schema check on decode means a tampered link can't render arbitrary shapes.
 */
export function encodeGuide(g: Guide): string {
  return compressToEncodedURIComponent(JSON.stringify(g));
}

export function decodeGuide(hash: string): Guide | null {
  try {
    const raw = decompressFromEncodedURIComponent(hash.replace(/^#?g=/, ""));
    if (!raw) return null;
    const parsed = Guide.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function shareUrlFor(g: Guide, origin: string): string {
  return `${origin}/shared#g=${encodeGuide(g)}`;
}
