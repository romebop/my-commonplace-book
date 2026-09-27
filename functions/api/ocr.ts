/// <reference types="@cloudflare/workers-types" />

interface Env {
  GEMINI_API_KEY: string;
}

const MODEL = "gemini-flash-latest";
const MAX_BYTES = 5 * 1024 * 1024;

const PROMPT = [
  "Transcribe the printed text from this photo of a book page.",
  "Return JSON with keys: text, bookTitle, author, page, confidence.",
  "Rules:",
  "- text: the page's body text, preserving line breaks and punctuation. Remove running headers, footers, and page numbers.",
  "- bookTitle, author, page: only if clearly visible on the page; otherwise null. Never guess.",
  "- confidence: a number 0 to 1 for your transcription.",
].join("\n");

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/")) {
    return json({ error: "Send an image" }, 415);
  }

  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_BYTES) {
    return json({ error: "Image missing or too large" }, 400);
  }

  const upstream = await callGemini(env.GEMINI_API_KEY, contentType, bytes);

  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => "");
    console.error("Gemini request failed", upstream.status, detail.slice(0, 500));
    return json({ error: "Reader unavailable" }, 502);
  }

  const data = await upstream.json();
  const output = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  return new Response(output, {
    headers: { "content-type": "application/json" },
  });
};

async function callGemini(
  key: string,
  mimeType: string,
  bytes: Uint8Array,
): Promise<Response> {
  const body = JSON.stringify({
    contents: [
      {
        parts: [
          { text: PROMPT },
          { inline_data: { mime_type: mimeType, data: toBase64(bytes) } },
        ],
      },
    ],
    generationConfig: { responseMimeType: "application/json" },
  });

  let response = await send(key, body);
  for (let attempt = 0; attempt < 2 && isTransient(response.status); attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
    response = await send(key, body);
  }
  return response;
}

function send(key: string, body: string): Promise<Response> {
  return fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
    },
  );
}

function isTransient(status: number): boolean {
  return status === 429 || status === 500 || status === 503;
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x2000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
