import { NextRequest, NextResponse } from 'next/server';
import { cacheGet, cacheSet, cacheKey } from '@/lib/server-cache';

const API_BASE_URL = 'https://api.unusualwhales.com/api/screener/option-contracts';

interface RawChain {
  ticker?: string;
  option_chain?: string; // e.g. AAPL250620C00150000
  volume?: number;
  open_interest?: number;
  premium?: number;
  strike?: number | string;
  expiry?: string;
  type?: string; // call | put
  underlying_price?: number;
  daily_perc_change?: number;
  iv_perc?: number; // decimal 0-1
  delta?: number;
}

function parseOptionSymbol(sym: string) {
  // OCC format underlying(1-6) + yymmdd + C/P + strike(8 with implied decimal 3) -> attempt generic parse
  // Example: AAPL250620C00150000 -> underlying=AAPL, date=25 06 20, type=C, strike=150.000
  const match = sym.match(/^(?<root>[A-Z.]{1,6})(?<date>\d{6})(?<cp>[CP])(?<strike>\d{8})$/);
  if (!match || !match.groups) return null;
  const { root, date, cp, strike } = match.groups as any;
  const year = '20' + date.slice(0,2);
  const month = date.slice(2,4);
  const day = date.slice(4,6);
  const expiry = `${year}-${month}-${day}`;
  const strikeNum = parseInt(strike, 10) / 1000; // OCC strikes are 1000 multiplier
  return {
    ticker: root,
    expiry,
    type: cp === 'C' ? 'call' : 'put',
    strike: strikeNum,
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const params = new URLSearchParams();
  params.set('min_volume', '200');
  params.set('order', searchParams.get('order') || 'volume');
  params.set('order_direction', searchParams.get('order_direction') || 'desc');
  params.set('limit', searchParams.get('limit') || '50');
  const optional = ['min_premium','max_premium','min_volume','max_dte','min_dte','is_otm','type','ticker_symbol','exclude_ex_div_ticker','vol_greater_oi'];
  optional.forEach(k => { const v = searchParams.get(k); if (v) params.set(k, v); });

  const key = cacheKey(['hottest-chains', params.toString()]);
  const cached = await cacheGet<any>(key);
  if (cached) {
    return NextResponse.json({ ...cached, source: 'cache' });
  }

  try {
    const response = await fetch(`${API_BASE_URL}?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.UNUSUAL_WHALES_API_KEY}`
      },
      // Revalidate upstream every 60s at most
      next: { revalidate: 60 }
    });
    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch hottest chains' }, { status: response.status });
    }
    const raw = await response.json();
    const items: RawChain[] = raw.data || raw || [];
    const enriched = items.map((c) => {
      let ticker = c.ticker;
      let expiry = c.expiry;
      let type = c.type?.toLowerCase();
      let strike: number | undefined = typeof c.strike === 'string' ? parseFloat(c.strike) : c.strike;
      if ((!ticker || !expiry || !type || strike === undefined || isNaN(strike)) && c.option_chain) {
        const parsed = parseOptionSymbol(c.option_chain);
        if (parsed) {
          ticker = ticker || parsed.ticker;
          expiry = expiry || parsed.expiry;
          type = type || parsed.type;
          if (strike === undefined || isNaN(strike)) strike = parsed.strike;
        }
      }
      return {
        ...c,
        ticker,
        expiry,
        type,
        strike,
      };
    });

    const responseBody = { data: enriched, fetched_at: Date.now() };
    // Cache for 30 seconds to smooth bursts
    await cacheSet(key, responseBody, 30);
    return NextResponse.json(responseBody);
  } catch (error) {
    console.error('Error fetching hottest chains:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
