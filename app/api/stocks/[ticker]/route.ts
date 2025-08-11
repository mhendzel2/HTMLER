export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { unusualWhalesAPI } from '@/lib/unusual-whales-api';

export async function GET(request: NextRequest, { params }: { params: { ticker: string } }) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'state';
    const ticker = params.ticker.toUpperCase();

    let data: any;
    switch (type) {
      case 'state':
        data = await unusualWhalesAPI.getStockState(ticker);
        break;
      case 'info':
        data = await unusualWhalesAPI.getStockInfo(ticker);
        break;
      case 'ohlc': {
        const candleSize = (searchParams.get('candle_size') as '1m' | '5m' | '15m' | '1h' | '1d') || '1d';
        const startDate = searchParams.get('date') || undefined;
        const endDate = searchParams.get('end_date') || undefined;
        const limitParam = searchParams.get('limit');
        const limit = limitParam ? parseInt(limitParam, 10) : undefined;
        const timeframe = searchParams.get('timeframe') || undefined;
        data = await unusualWhalesAPI.getStockOHLC(
          ticker,
          candleSize,
          startDate,
          endDate,
          limit,
          timeframe
        );
        break; }
      case 'oi-per-strike':
        data = await unusualWhalesAPI.getStockOIPerStrike(ticker);
        break;
      case 'oi-per-expiry':
        data = await unusualWhalesAPI.getStockOIPerExpiry(ticker);
        break;
      case 'oi-change': {
        const date = searchParams.get('date') || undefined;
        const limit = searchParams.get('limit');
        const order = searchParams.get('order') as 'asc' | 'desc' | null;
        data = await unusualWhalesAPI.getStockOIChange(ticker, date || undefined, limit ? parseInt(limit, 10) : undefined, order || undefined);
        break; }
      case 'gex':
        data = await unusualWhalesAPI.getStockGEX(ticker);
        break;
      default:
        return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Stocks API error:', error);
    return NextResponse.json({ error: 'Failed to fetch stock data' }, { status: 500 });
  }
}
