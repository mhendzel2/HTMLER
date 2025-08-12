import { NextRequest } from 'next/server';

// Note: Model inference happens client-side. This endpoint only aggregates recent news headlines for symbols.
interface NewsItem { symbol?: string; ticker?: string; title: string; summary?: string; url?: string; published_at?: string; }

const cache = new Map<string, { ts: number; data: any }>();
const TTL_MS = 60_000; // 1 minute

async function fetchNews(symbols: string[]): Promise<NewsItem[]> {
  const items: NewsItem[] = [];
  const base = process.env.NEXT_PUBLIC_BASE_URL || '';
  for (const sym of symbols) {
    try {
      const res = await fetch(`${base}/api/data/news?symbol=${encodeURIComponent(sym)}`, { next: { revalidate: 60 } });
      if (!res.ok) continue;
      const json = await res.json();
      if (Array.isArray(json?.data)) {
        for (const n of json.data.slice(0, 8)) {
          items.push({
            symbol: sym,
            title: n.title || n.headline || 'Untitled',
            summary: n.summary || n.description,
            url: n.url,
            published_at: n.published_at || n.datetime,
          });
        }
      }
    } catch {}
  }
  return items;
}

function hashKey(symbols: string[]) {
  return symbols.slice().sort().join(',');
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbolsParam = searchParams.get('symbols');
  if (!symbolsParam) {
    return new Response(JSON.stringify({ error: 'symbols required' }), { status: 400 });
  }
  const symbols = symbolsParam.split(',').map(s => s.trim().toUpperCase()).filter(Boolean).slice(0, 25);
  const key = hashKey(symbols);
  const now = Date.now();
  const existing = cache.get(key);
  if (existing && now - existing.ts < TTL_MS) {
    return new Response(JSON.stringify({ symbols, news: existing.data.news, cached: true }), { headers: { 'Content-Type': 'application/json' } });
  }
  const news = await fetchNews(symbols);
  const dedup = Array.from(new Map(news.map(n => [n.title + '|' + (n.symbol||''), n])).values());
  const payload = { symbols, news: dedup };
  cache.set(key, { ts: now, data: payload });
  return new Response(JSON.stringify(payload), { headers: { 'Content-Type': 'application/json' } });
}
