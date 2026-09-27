export interface Quote {
  id: string;
  text: string;
  rawText?: string;
  bookTitle: string;
  author?: string;
  page?: number;
  tags: string[];
  dateAdded: string;
  favorite?: boolean;
}

export interface Draft {
  text: string;
  bookTitle: string;
  author?: string;
  page?: number;
  confidence?: number;
  rawText: string;
}
