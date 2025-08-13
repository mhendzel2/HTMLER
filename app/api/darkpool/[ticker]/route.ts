export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server';
import { unusualWhalesAPI } from '@/lib/unusual-whales-api';

interface RouteContext {
  params: {
    ticker: string;
  };
}

export async function GET(request: Request, context: any) {
  const { params } = context;
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || undefined;
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;
    const data = await unusualWhalesAPI.getDarkpoolTrades(params.ticker, date, limit);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Darkpool API error:', error);
    return NextResponse.json({ error: 'Failed to fetch darkpool data' }, { status: 500 });
  }
}
