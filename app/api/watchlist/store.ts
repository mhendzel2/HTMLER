import fs from 'fs';
import path from 'path';

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

const STORE_PATH = path.join(process.cwd(), 'data', 'watchlists.json');

function loadWatchlists(): Watchlist[] {
  try {
    const raw = fs.readFileSync(STORE_PATH, 'utf8');
    return JSON.parse(raw) as Watchlist[];
  } catch {
    // Fallback to default watchlist if file doesn't exist
    return [
      {
        id: '1',
        name: 'Default Watchlist',
        description: 'My main watchlist',
        isDefault: true,
        items: [],
      },
    ];
  }
}

export const watchlists: Watchlist[] = loadWatchlists();

export function saveWatchlists() {
  fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify(watchlists, null, 2));
}

export function getAllWatchlistTickers(): string[] {
  const tickers = watchlists.flatMap(w => w.items.map(i => i.ticker));
  return Array.from(new Set(tickers));
}

export function getWatchlist(id: string): Watchlist | undefined {
  return watchlists.find(w => w.id === id);
}
