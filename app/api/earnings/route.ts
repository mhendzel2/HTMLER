
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { unusualWhalesAPI } from '@/lib/unusual-whales-api';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'afterhours';
    const ticker = searchParams.get('ticker');
    const date = searchParams.get('date');
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '0');

    let data;
    if (type === 'historical' && ticker) {
      data = await unusualWhalesAPI.getEarningsHistorical(ticker);
    } else if (type === 'afterhours') {
      data = await unusualWhalesAPI.getEarningsAfterHours(date || undefined, limit, page);
    } else if (type === 'premarket') {
      data = await unusualWhalesAPI.getEarningsPreMarket(date || undefined, limit, page);
    } else {
      return NextResponse.json({ error: 'Invalid type parameter or missing ticker for historical data' }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Earnings API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch earnings data' },
      { status: 500 }
    );
  }
}
