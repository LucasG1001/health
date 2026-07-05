const ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const PATH_PREFIXES = ["shorts", "embed", "v", "live"];

function isValidId(id: string | undefined): id is string {
  return typeof id === "string" && ID_PATTERN.test(id);
}

export function parseYouTubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (trimmed === "") return null;

  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = parsed.pathname.split("/").filter(Boolean)[0];
      return isValidId(id) ? id : null;
    }
    if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
      if (parsed.pathname === "/watch") {
        const v = parsed.searchParams.get("v") ?? undefined;
        return isValidId(v) ? v : null;
      }
      const parts = parsed.pathname.split("/").filter(Boolean);
      if (parts.length >= 2 && PATH_PREFIXES.includes(parts[0]!)) {
        return isValidId(parts[1]) ? parts[1]! : null;
      }
    }
    return null;
  } catch {
    return isValidId(trimmed) ? trimmed : null;
  }
}
