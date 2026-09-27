import { useEffect, useRef, useState } from "react";
import { transcribe } from "../lib/ocr";
import type { PreparedImage } from "../lib/image";
import type { Quote } from "../lib/types";

interface ReviewProps {
  prepared?: PreparedImage;
  initial?: Quote;
  onSave: (quote: Quote) => void;
  onCancel: () => void;
}

type Status = "reading" | "ready" | "error";

export function Review({ prepared, initial, onSave, onCancel }: ReviewProps) {
  const [status, setStatus] = useState<Status>(initial ? "ready" : "reading");
  const [error, setError] = useState("");
  const [confidence, setConfidence] = useState<number | undefined>();
  const [rawText, setRawText] = useState(initial?.rawText ?? "");

  const [text, setText] = useState(initial?.text ?? "");
  const [bookTitle, setBookTitle] = useState(initial?.bookTitle ?? "");
  const [author, setAuthor] = useState(initial?.author ?? "");
  const [page, setPage] = useState(initial?.page != null ? String(initial.page) : "");
  const [tags, setTags] = useState(initial?.tags.join(", ") ?? "");
  const [favorite, setFavorite] = useState(initial?.favorite ?? false);

  const startedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!prepared || startedFor.current === prepared.previewUrl) return;
    startedFor.current = prepared.previewUrl;
    setStatus("reading");
    setError("");
    transcribe(prepared.blob)
      .then((draft) => {
        setText(draft.text);
        setBookTitle(draft.bookTitle);
        setAuthor(draft.author ?? "");
        setPage(draft.page != null ? String(draft.page) : "");
        setRawText(draft.rawText);
        setConfidence(draft.confidence);
        setStatus("ready");
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Something went wrong");
        setStatus("error");
      });
  }, [prepared]);

  function save() {
    if (!text.trim()) return;
    const pageNumber = Number.parseInt(page, 10);
    onSave({
      id: initial?.id ?? crypto.randomUUID(),
      text: text.trim(),
      rawText: rawText || undefined,
      bookTitle: bookTitle.trim(),
      author: author.trim() || undefined,
      page: Number.isFinite(pageNumber) ? pageNumber : undefined,
      tags: parseTags(tags),
      dateAdded: initial?.dateAdded ?? new Date().toISOString(),
      favorite: favorite || undefined,
    });
  }

  const reading = status === "reading";
  const shaky = status === "ready" && confidence != null && confidence < 0.8;

  return (
    <div className="screen">
      <header className="topbar">
        <h1>{initial ? "Edit quote" : "Review the text"}</h1>
        <p>Fix anything the reader got wrong, then save it.</p>
      </header>

      <div className="stack">
        {prepared && (
          <div className="preview">
            <img src={prepared.previewUrl} alt="Captured page" />
          </div>
        )}

        {reading && (
          <div className="status">
            <span className="spinner" />
            Reading the page…
          </div>
        )}

        {error && (
          <div className="note error">
            {error} You can still type the quote by hand.
          </div>
        )}

        {shaky && (
          <div className="note warn">
            This one was hard to read. Please give the text a careful look.
          </div>
        )}

        <div className="field">
          <label htmlFor="quote-text">Quote</label>
          <textarea
            id="quote-text"
            value={text}
            placeholder={reading ? "Reading…" : "Type or paste the quote"}
            onChange={(e) => setText(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="quote-book">Book</label>
          <input
            id="quote-book"
            value={bookTitle}
            placeholder="Title"
            onChange={(e) => setBookTitle(e.target.value)}
          />
        </div>

        <div className="field row-2">
          <div className="field">
            <label htmlFor="quote-author">Author</label>
            <input
              id="quote-author"
              value={author}
              placeholder="Optional"
              onChange={(e) => setAuthor(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="quote-page">Page</label>
            <input
              id="quote-page"
              inputMode="numeric"
              value={page}
              placeholder="Optional"
              onChange={(e) => setPage(e.target.value)}
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="quote-tags">Tags</label>
          <input
            id="quote-tags"
            value={tags}
            placeholder="love, grief, attention"
            onChange={(e) => setTags(e.target.value)}
          />
        </div>

        <label className="checkbox">
          <input
            type="checkbox"
            checked={favorite}
            onChange={(e) => setFavorite(e.target.checked)}
          />
          Add to favorites
        </label>

        <div className="form-actions">
          <button className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn btn-primary" disabled={!text.trim()} onClick={save}>
            Save quote
          </button>
        </div>
      </div>
    </div>
  );
}

function parseTags(input: string): string[] {
  const seen = new Set<string>();
  for (const part of input.split(",")) {
    const tag = part.trim();
    if (tag) seen.add(tag);
  }
  return [...seen];
}
