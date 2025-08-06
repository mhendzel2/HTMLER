
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { unusualWhalesAPI } from '@/lib/unusual-whales-api';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ticker = searchParams.get('ticker');
    const type = searchParams.get('type') || 'options';

    if (!ticker) {
      return NextResponse.json({ error: 'Ticker parameter is required' }, { status: 400 });
    }

    let data;
    switch (type) {
      case 'options':
        data = await unusualWhalesAPI.getStockOptionsData(ticker);
        break;
      case 'greeks':
        data = await unusualWhalesAPI.getStockGreeks(ticker);
        break;
      case 'oi-per-strike':
        data = await unusualWhalesAPI.getStockOIPerStrike(ticker);
        break;
      case 'oi-per-expiry':
        data = await unusualWhalesAPI.getStockOIPerExpiry(ticker);
        break;
      case 'net-prem-ticks':
        const date = searchParams.get('date');
        data = await unusualWhalesAPI.getStockNetPremTicks(ticker, date || undefined);
        break;
      default:
        return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Options API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch options data' },
      { status: 500 }
    );
  }
}
