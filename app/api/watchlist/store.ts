export interface WatchlistItem {
  id: string;
  ticker: string;
  createdAt: string;
}

export interface Watchlist {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
  items: WatchlistItem[];
}

// Simple in-memory storage for standalone app
export const watchlists: Watchlist[] = [
  {
    id: '1',
    name: 'Default Watchlist',
    description: 'My main watchlist',
    isDefault: true,
    items: [],
  },
];
