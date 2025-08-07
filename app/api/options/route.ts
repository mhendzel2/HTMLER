
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
        // Use flow alerts instead of non-existent options endpoint
        data = await unusualWhalesAPI.getStockFlowAlerts(ticker, true, true, 50);
        break;
      case 'greeks':
        const expiry = searchParams.get('expiry');
        const greeksDate = searchParams.get('date');
        if (!expiry) {
          return NextResponse.json({ error: 'Expiry parameter is required for greeks' }, { status: 400 });
        }
        data = await unusualWhalesAPI.getStockGreeks(ticker, expiry, greeksDate || undefined);
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
      case 'oi-change':
        const oiDate = searchParams.get('date') || undefined;
        const limit = searchParams.get('limit');
        const order = searchParams.get('order') as 'asc' | 'desc' | null;
        data = await unusualWhalesAPI.getStockOIChange(
          ticker,
          oiDate,
          limit ? parseInt(limit, 10) : undefined,
          order || undefined
        );
        break;
      case 'flow-alerts':
        data = await unusualWhalesAPI.getStockFlowAlerts(ticker, true, true, 50);
        break;
      case 'max-pain':
        data = await unusualWhalesAPI.getStockMaxPain(ticker);
        break;
      case 'gex':
        data = await unusualWhalesAPI.getStockGEX(ticker);
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
