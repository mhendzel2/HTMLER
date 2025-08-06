
import { NextRequest, NextResponse } from 'next/server';
import { unusualWhalesAPI } from '@/lib/unusual-whales-api';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const startDate = searchParams.get('start_date') || undefined;
    const endDate = searchParams.get('end_date') || undefined;

    const data = await unusualWhalesAPI.getCongressTopTradedTickers(
      limit,
      startDate,
      endDate
    );

    return NextResponse.json(data);
  } catch (error) {
    console.error('Congress top traded API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch top traded tickers' },
      { status: 500 }
    );
  }
}
