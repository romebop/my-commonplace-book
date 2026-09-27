import { useMemo, useRef, useState } from "react";
import {
  allTags,
  exportJson,
  exportMarkdown,
  filterQuotes,
  groupByBook,
  parseImport,
} from "../lib/quotes";
import type { Quote } from "../lib/types";

interface LibraryProps {
  quotes: Quote[];
  onToggleFavorite: (quote: Quote) => void;
  onDelete: (id: string) => void;
  onEdit: (quote: Quote) => void;
  onImport: (incoming: Quote[]) => void;
}

export function Library({
  quotes,
  onToggleFavorite,
  onDelete,
  onEdit,
  onImport,
}: LibraryProps) {
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [message, setMessage] = useState("");
  const importInput = useRef<HTMLInputElement>(null);

  const tags = useMemo(() => allTags(quotes), [quotes]);
  const visible = useMemo(
    () => filterQuotes(quotes, query, tag, favoritesOnly),
    [quotes, query, tag, favoritesOnly],
  );
  const groups = useMemo(() => groupByBook(visible), [visible]);

  async function handleImport(file: File | undefined) {
    if (!file) return;
    try {
      const incoming = parseImport(await file.text());
      onImport(incoming);
      setMessage(`Imported ${incoming.length} ${incoming.length === 1 ? "quote" : "quotes"}.`);
    } catch {
      setMessage("That file could not be read.");
    }
  }

  return (
    <div className="screen">
      <header className="topbar">
        <h1>Library</h1>
        <p>
          {quotes.length} {quotes.length === 1 ? "quote" : "quotes"} ·{" "}
          {groups.length} {groups.length === 1 ? "book" : "books"}
        </p>
      </header>

      {quotes.length === 0 ? (
        <div className="empty">
          No quotes yet.
          <br />
          Capture a page to start your collection.
        </div>
      ) : (
        <div className="stack">
          <div className="searchbar">
            <input
              type="search"
              value={query}
              placeholder="Search quotes, books, tags"
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {(tags.length > 0 || favoritesOnly) && (
            <div className="chips">
              <button
                className={`chip${favoritesOnly ? " active" : ""}`}
                onClick={() => setFavoritesOnly((v) => !v)}
              >
                ★ Favorites
              </button>
              {tags.map((name) => (
                <button
                  key={name}
                  className={`chip${tag === name ? " active" : ""}`}
                  onClick={() => setTag(tag === name ? null : name)}
                >
                  {name}
                </button>
              ))}
            </div>
          )}

          {groups.length === 0 ? (
            <div className="empty">Nothing matches that.</div>
          ) : (
            groups.map(({ book, quotes: list }) => (
              <section className="book-group" key={book}>
                <h3>{book}</h3>
                {list.map((quote) => (
                  <QuoteCard
                    key={quote.id}
                    quote={quote}
                    onToggleFavorite={onToggleFavorite}
                    onDelete={onDelete}
                    onEdit={onEdit}
                  />
                ))}
              </section>
            ))
          )}
        </div>
      )}

      <div className="toolbar">
        <button
          className="btn"
          disabled={quotes.length === 0}
          onClick={() =>
            download(
              "commonplace-book.json",
              exportJson(quotes),
              "application/json",
            )
          }
        >
          Export JSON
        </button>
        <button
          className="btn"
          disabled={quotes.length === 0}
          onClick={() => void share(quotes, setMessage)}
        >
          Share
        </button>
        <button className="btn" onClick={() => importInput.current?.click()}>
          Import
        </button>
      </div>

      {message && <div className="note" style={{ marginTop: 12 }}>{message}</div>}

      <input
        ref={importInput}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          void handleImport(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}

interface QuoteCardProps {
  quote: Quote;
  onToggleFavorite: (quote: Quote) => void;
  onDelete: (id: string) => void;
  onEdit: (quote: Quote) => void;
}

function QuoteCard({ quote, onToggleFavorite, onDelete, onEdit }: QuoteCardProps) {
  const meta = [
    quote.author,
    quote.page ? `p. ${quote.page}` : null,
    ...quote.tags.map((t) => `#${t}`),
  ].filter(Boolean);

  return (
    <article className="quote-card">
      <p className="quote-text">{quote.text}</p>
      {meta.length > 0 && (
        <div className="quote-meta">
          {meta.map((item, i) => (
            <span key={i}>{item}</span>
          ))}
        </div>
      )}
      <div className="quote-actions">
        <button
          className={`btn-icon star${quote.favorite ? " on" : ""}`}
          aria-label={quote.favorite ? "Remove from favorites" : "Add to favorites"}
          onClick={() => onToggleFavorite(quote)}
        >
          {quote.favorite ? "★" : "☆"}
        </button>
        <button className="btn-icon" onClick={() => onEdit(quote)}>
          Edit
        </button>
        <span className="spacer" />
        <button
          className="btn-icon"
          onClick={() => {
            if (confirm("Delete this quote?")) onDelete(quote.id);
          }}
        >
          Delete
        </button>
      </div>
    </article>
  );
}

function download(filename: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function share(quotes: Quote[], setMessage: (msg: string) => void) {
  const text = exportMarkdown(quotes);
  const file = new File([text], "commonplace-book.md", { type: "text/markdown" });
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: "Commonplace Book" });
    } else if (navigator.share) {
      await navigator.share({ title: "Commonplace Book", text });
    } else {
      await navigator.clipboard.writeText(text);
      setMessage("Copied all quotes to the clipboard.");
    }
  } catch {
    // User dismissed the share sheet.
  }
}
