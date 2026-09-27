import { useEffect, useState } from "react";
import { Capture } from "./components/Capture";
import { Review } from "./components/Review";
import { Library } from "./components/Library";
import { prepareImage } from "./lib/image";
import { mergeQuotes } from "./lib/quotes";
import {
  addQuote,
  loadQuotes,
  removeQuote,
  replaceAll,
  updateQuote,
} from "./lib/store";
import type { Quote } from "./lib/types";

const HINT_KEY = "install-hint-dismissed";

export default function App() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [tab, setTab] = useState<"capture" | "library">("capture");
  const [prepared, setPrepared] = useState<Awaited<ReturnType<typeof prepareImage>> | null>(
    null,
  );
  const [editing, setEditing] = useState<Quote | null>(null);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    void loadQuotes().then(setQuotes);
    void navigator.storage?.persist?.();
    const installed =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (!installed && localStorage.getItem(HINT_KEY) !== "1") setShowHint(true);
  }, []);

  async function handleSave(quote: Quote) {
    const next = editing ? await updateQuote(quote) : await addQuote(quote);
    setQuotes(next);
    setPrepared(null);
    setEditing(null);
    setTab("library");
  }

  async function handleToggleFavorite(quote: Quote) {
    setQuotes(await updateQuote({ ...quote, favorite: !quote.favorite }));
  }

  async function handleDelete(id: string) {
    setQuotes(await removeQuote(id));
  }

  async function handleImport(incoming: Quote[]) {
    const current = await loadQuotes();
    setQuotes(await replaceAll(mergeQuotes(current, incoming)));
  }

  const reviewing = prepared !== null || editing !== null;

  return (
    <div className="app">
      {reviewing ? (
        <Review
          prepared={prepared ?? undefined}
          initial={editing ?? undefined}
          onSave={handleSave}
          onCancel={() => {
            setPrepared(null);
            setEditing(null);
          }}
        />
      ) : tab === "capture" ? (
        <Capture onCapture={setPrepared} savedCount={quotes.length} />
      ) : (
        <Library
          quotes={quotes}
          onToggleFavorite={handleToggleFavorite}
          onDelete={handleDelete}
          onEdit={setEditing}
          onImport={handleImport}
        />
      )}

      {showHint && !reviewing && (
        <div className="screen" style={{ paddingBottom: 0 }}>
          <div className="banner">
            <span>To keep this on your Home Screen, tap Share, then “Add to Home Screen.”</span>
            <span className="spacer" />
            <button
              className="btn-icon"
              aria-label="Dismiss"
              onClick={() => {
                localStorage.setItem(HINT_KEY, "1");
                setShowHint(false);
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {!reviewing && (
        <nav className="tabbar">
          <button
            className={`tab${tab === "capture" ? " active" : ""}`}
            onClick={() => setTab("capture")}
          >
            <span className="glyph">＋</span>
            Capture
          </button>
          <button
            className={`tab${tab === "library" ? " active" : ""}`}
            onClick={() => setTab("library")}
          >
            <span className="glyph">☰</span>
            Library
          </button>
        </nav>
      )}
    </div>
  );
}
