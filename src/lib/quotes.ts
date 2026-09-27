import type { Quote } from "./types";

export function groupByBook(quotes: Quote[]): { book: string; quotes: Quote[] }[] {
  const map = new Map<string, Quote[]>();
  for (const quote of quotes) {
    const key = quote.bookTitle.trim() || "Untitled";
    const list = map.get(key) ?? [];
    list.push(quote);
    map.set(key, list);
  }
  return [...map.entries()]
    .map(([book, list]) => ({ book, quotes: list }))
    .sort((a, b) => a.book.localeCompare(b.book));
}

export function allTags(quotes: Quote[]): string[] {
  const tags = new Set<string>();
  for (const quote of quotes) {
    for (const tag of quote.tags) tags.add(tag);
  }
  return [...tags].sort();
}

export function filterQuotes(
  quotes: Quote[],
  query: string,
  tag: string | null,
  favoritesOnly: boolean,
): Quote[] {
  const needle = query.trim().toLowerCase();
  return quotes.filter((quote) => {
    if (favoritesOnly && !quote.favorite) return false;
    if (tag && !quote.tags.includes(tag)) return false;
    if (!needle) return true;
    return (
      quote.text.toLowerCase().includes(needle) ||
      quote.bookTitle.toLowerCase().includes(needle) ||
      (quote.author ?? "").toLowerCase().includes(needle) ||
      quote.tags.some((t) => t.toLowerCase().includes(needle))
    );
  });
}

export function exportJson(quotes: Quote[]): string {
  return JSON.stringify(
    { version: 1, exportedAt: new Date().toISOString(), quotes },
    null,
    2,
  );
}

export function exportMarkdown(quotes: Quote[]): string {
  const lines: string[] = ["# Commonplace Book", ""];
  for (const { book, quotes: list } of groupByBook(quotes)) {
    const author = list.find((q) => q.author)?.author;
    lines.push(`## ${book}${author ? ` — ${author}` : ""}`);
    for (const quote of list) {
      lines.push("");
      lines.push(`> ${quote.text.replace(/\n/g, "\n> ")}`);
      const meta = [
        quote.page ? `p. ${quote.page}` : null,
        quote.tags.length ? quote.tags.join(", ") : null,
      ]
        .filter(Boolean)
        .join(" · ");
      if (meta) lines.push(`> — *${meta}*`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

export function parseImport(raw: string): Quote[] {
  const data = JSON.parse(raw);
  const quotes = Array.isArray(data) ? data : data?.quotes;
  if (!Array.isArray(quotes)) throw new Error("Unrecognized file");
  return quotes
    .map(normalize)
    .filter((quote): quote is Quote => quote !== null);
}

export function mergeQuotes(existing: Quote[], incoming: Quote[]): Quote[] {
  const byId = new Map(existing.map((quote) => [quote.id, quote]));
  for (const quote of incoming) byId.set(quote.id, quote);
  return [...byId.values()];
}

function normalize(value: unknown): Quote | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (typeof v.text !== "string" || !v.text.trim()) return null;
  return {
    id: typeof v.id === "string" ? v.id : crypto.randomUUID(),
    text: v.text,
    rawText: typeof v.rawText === "string" ? v.rawText : undefined,
    bookTitle: typeof v.bookTitle === "string" ? v.bookTitle : "",
    author: typeof v.author === "string" ? v.author : undefined,
    page: typeof v.page === "number" ? v.page : undefined,
    tags: Array.isArray(v.tags)
      ? v.tags.filter((t): t is string => typeof t === "string")
      : [],
    dateAdded: typeof v.dateAdded === "string" ? v.dateAdded : new Date().toISOString(),
    favorite: typeof v.favorite === "boolean" ? v.favorite : undefined,
  };
}
