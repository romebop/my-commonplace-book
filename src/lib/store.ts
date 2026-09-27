import { get, set } from "idb-keyval";
import type { Quote } from "./types";

const KEY = "quotes";

export async function loadQuotes(): Promise<Quote[]> {
  return (await get<Quote[]>(KEY)) ?? [];
}

export async function persist(quotes: Quote[]): Promise<void> {
  await set(KEY, quotes);
}

export async function addQuote(quote: Quote): Promise<Quote[]> {
  const next = [quote, ...(await loadQuotes())];
  await persist(next);
  return next;
}

export async function updateQuote(updated: Quote): Promise<Quote[]> {
  const next = (await loadQuotes()).map((q) => (q.id === updated.id ? updated : q));
  await persist(next);
  return next;
}

export async function removeQuote(id: string): Promise<Quote[]> {
  const next = (await loadQuotes()).filter((q) => q.id !== id);
  await persist(next);
  return next;
}

export async function replaceAll(quotes: Quote[]): Promise<Quote[]> {
  await persist(quotes);
  return quotes;
}
