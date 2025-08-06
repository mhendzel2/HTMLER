
import { NextRequest, NextResponse } from 'next/server';
import { unusualWhalesAPI } from '@/lib/unusual-whales-api';

export async function GET(
  request: NextRequest,
  { params }: { params: { ticker: string } }
) {
  try {
    const data = await unusualWhalesAPI.getETFInflowOutflow(params.ticker);
    return NextResponse.json(data);
  } catch (error) {
    console.error('ETF flow API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ETF inflow/outflow data' },
      { status: 500 }
    );
  }
}
