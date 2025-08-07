
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { unusualWhalesAPI } from '@/lib/unusual-whales-api';

export async function GET(
  request: NextRequest,
  { params }: { params: { ticker: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'info';

    let data;
    switch (type) {
      case 'info':
        data = await unusualWhalesAPI.getStockInfo(params.ticker);
        break;
      case 'state':
        data = await unusualWhalesAPI.getStockState(params.ticker);
        break;
      case 'ohlc':
        const candleSize = searchParams.get('candle_size') || '1d';
        const date = searchParams.get('date') || undefined;
        const endDate = searchParams.get('end_date') || undefined;
        const limitParam = searchParams.get('limit');
        const limit = limitParam ? parseInt(limitParam, 10) : undefined;
        const timeframe = searchParams.get('timeframe') || undefined;
        data = await unusualWhalesAPI.getStockOHLC(
          params.ticker,
          candleSize,
          date,
          endDate,
          limit,
          timeframe
        );
        break;
      default:
        return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Stock API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stock data' },
      { status: 500 }
    );
  }
}
