import type { Draft } from "./types";

export async function transcribe(blob: Blob): Promise<Draft> {
  const response = await fetch("/api/ocr", {
    method: "POST",
    headers: { "content-type": blob.type || "image/jpeg" },
    body: blob,
  });

  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    throw new Error(detail?.error ?? "Could not read that page");
  }

  const data = await response.json();
  const text = typeof data?.text === "string" ? data.text : "";
  return {
    text,
    rawText: text,
    bookTitle: typeof data?.bookTitle === "string" ? data.bookTitle : "",
    author: typeof data?.author === "string" ? data.author : undefined,
    page: typeof data?.page === "number" ? data.page : undefined,
    confidence: typeof data?.confidence === "number" ? data.confidence : undefined,
  };
}
