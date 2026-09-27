import { useRef, useState } from "react";
import { prepareImage, type PreparedImage } from "../lib/image";

interface CaptureProps {
  onCapture: (prepared: PreparedImage) => void;
  savedCount: number;
}

export function Capture({ onCapture, savedCount }: CaptureProps) {
  const cameraInput = useRef<HTMLInputElement>(null);
  const libraryInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      onCapture(await prepareImage(file));
    } catch {
      setError("Could not read that photo. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="screen">
      <header className="topbar">
        <h1>Commonplace Book</h1>
        <p>
          {savedCount === 0
            ? "Photograph a page to begin."
            : `${savedCount} ${savedCount === 1 ? "quote" : "quotes"} saved.`}
        </p>
      </header>

      <div className="capture-hero">
        <div className="glyph">“</div>
        <h2>Capture a page</h2>
        <p>Snap a page from a book and keep the words that matter.</p>
        <div className="capture-actions">
          <button
            className="btn btn-primary"
            disabled={busy}
            onClick={() => cameraInput.current?.click()}
          >
            {busy ? "Preparing…" : "Take a photo"}
          </button>
          <button
            className="btn btn-ghost"
            disabled={busy}
            onClick={() => libraryInput.current?.click()}
          >
            Choose from photos
          </button>
        </div>
      </div>

      {error && <div className="note error">{error}</div>}

      <input
        ref={cameraInput}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          void handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <input
        ref={libraryInput}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          void handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
