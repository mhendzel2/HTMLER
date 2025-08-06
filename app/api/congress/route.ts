
import { NextRequest, NextResponse } from 'next/server';
import { unusualWhalesAPI } from '@/lib/unusual-whales-api';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    const startDate = searchParams.get('start_date') || undefined;
    const endDate = searchParams.get('end_date') || undefined;
    const ticker = searchParams.get('ticker') || undefined;
    const congressMember = searchParams.get('congress_member') || undefined;

    const data = await unusualWhalesAPI.getCongressRecentTrades(
      limit,
      offset,
      startDate,
      endDate,
      ticker,
      congressMember
    );

    return NextResponse.json(data);
  } catch (error) {
    console.error('Congress API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch congress trading data' },
      { status: 500 }
    );
  }
}
