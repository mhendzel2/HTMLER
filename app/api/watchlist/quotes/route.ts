import { NextRequest, NextResponse } from 'next/server';
import { unusualWhalesAPI } from '@/lib/unusual-whales-api';

export const dynamic = 'force-dynamic';

const CACHE_TTL = 60_000; // 60s
interface CacheEntry { data: any; ts: number }
const cache: Record<string, CacheEntry> = {};

async function pLimitAll<T>(inputs: T[], limit: number, worker: (item: T) => Promise<any>) {
  const ret: any[] = [];
  let i = 0;
  const executing: Promise<void>[] = [];
  async function run(nextIndex: number) {
    const item = inputs[nextIndex];
    const value = await worker(item);
    ret[nextIndex] = value;
  }
  while (i < inputs.length) {
    const p = run(i++).then(() => {
      executing.splice(executing.indexOf(p as any), 1);
    });
    executing.push(p as any);
    if (executing.length >= limit) {
      await Promise.race(executing);
    }
  }
  await Promise.all(executing);
  return ret;
}

async function getTickerSummary(ticker: string) {
  const now = Date.now();
  const key = ticker.toUpperCase();
  const cached = cache[key];
  if (cached && now - cached.ts < CACHE_TTL) return cached.data;

  const [stateRes, maxPainRes, darkpoolRes, oiRes] = await Promise.allSettled([
    unusualWhalesAPI.getStockState(ticker).catch(() => null),
    unusualWhalesAPI.getStockMaxPain(ticker).catch(() => null),
    unusualWhalesAPI.getDarkpoolTrades(ticker).catch(() => null),
    unusualWhalesAPI.getStockOIChange(ticker).catch(() => null)
  ]);

  const state: any = (stateRes.status === 'fulfilled' && (stateRes.value as any)?.data) ? (stateRes.value as any).data : (stateRes.status === 'fulfilled' ? stateRes.value : null);
  const mpRaw: any = maxPainRes.status === 'fulfilled' ? maxPainRes.value : null;
  const dpRaw: any = darkpoolRes.status === 'fulfilled' ? darkpoolRes.value : null;
  const oiRaw: any = oiRes.status === 'fulfilled' ? oiRes.value : null;

  let price = state?.data?.last_price ?? state?.last_price ?? 0;
  const change = state?.data?.change ?? state?.change ?? 0;
  const changePercent = state?.data?.change_percent ?? state?.change_percent ?? 0;
  const volume = state?.data?.volume ?? state?.volume ?? 0;

  let maxPain: number | undefined; let nextExpiry: string | undefined;
  const mpData = mpRaw?.data?.data || mpRaw?.data;
  if (Array.isArray(mpData)) {
    const today = new Date();
    const upcoming = mpData.map((d: any) => ({ expiry: d.expiry, maxPain: parseFloat(d.max_pain) }))
      .filter(d => !isNaN(new Date(d.expiry).getTime()) && new Date(d.expiry) >= today)
      .sort((a, b) => new Date(a.expiry).getTime() - new Date(b.expiry).getTime());
    if (upcoming.length) { nextExpiry = upcoming[0].expiry; maxPain = upcoming[0].maxPain; }
  }

  let darkpoolPremium: number | undefined;
  const dpData = dpRaw?.data?.data || dpRaw?.data;
  if (Array.isArray(dpData)) {
    darkpoolPremium = dpData.reduce((sum: number, t: any) => sum + parseFloat(t.premium || '0'), 0);
  }

  let oiChange: number | undefined;
  const oiData = oiRaw?.data?.data || oiRaw?.data;
  if (Array.isArray(oiData)) {
    oiChange = oiData.reduce((sum: number, item: any) => sum + (item.oi_diff_plain || 0), 0);
  }

  let atmCallDelta: number | undefined;
  if (nextExpiry) {
    try {
      const greeks: any = await unusualWhalesAPI.getStockGreeks(ticker, nextExpiry).catch(() => null);
      const greeksArr = greeks?.data?.data || greeks?.data;
      if (Array.isArray(greeksArr) && greeksArr.length) {
        const closest = greeksArr.reduce((prev: any, curr: any) => (
          Math.abs(parseFloat(curr.strike) - price) < Math.abs(parseFloat(prev.strike) - price) ? curr : prev
        ));
        atmCallDelta = parseFloat(closest.call_delta);
      }
    } catch {}
  }

  const summary = {
    ticker: key,
    price,
    change,
    changePercent,
    volume,
    maxPain,
    nextExpiry,
    darkpoolPremium,
    oiChange,
    atmCallDelta,
    updatedAt: Date.now(),
  };
  cache[key] = { data: summary, ts: Date.now() };
  return summary;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tickersParam = searchParams.get('tickers');
    if (!tickersParam) return NextResponse.json({ error: 'tickers param required' }, { status: 400 });
    const tickers = tickersParam.split(',').map(t => t.trim().toUpperCase()).filter(Boolean);
    if (!tickers.length) return NextResponse.json({ data: [] });

    const summaries = await pLimitAll(tickers, 3, getTickerSummary);
    return NextResponse.json({ data: summaries });
  } catch (e) {
    console.error('Watchlist batch quotes error:', e);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
