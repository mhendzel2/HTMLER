
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { unusualWhalesAPI } from '@/lib/unusual-whales-api';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'tide';
    const date = searchParams.get('date');

    let data;
    switch (type) {
      case 'tide':
        const interval5m = searchParams.get('interval_5m') === 'true';
        const otmOnly = searchParams.get('otm_only') === 'true';
        data = await unusualWhalesAPI.getMarketTide(date || undefined, interval5m, otmOnly);
        break;
      case 'sector-tide':
        const sector = searchParams.get('sector');
        if (!sector) {
          return NextResponse.json({ error: 'Sector parameter is required for sector-tide' }, { status: 400 });
        }
        data = await unusualWhalesAPI.getSectorTide(sector, date || undefined);
        break;
      case 'correlations':
        const startDate = searchParams.get('start_date');
        const endDate = searchParams.get('end_date');
        data = await unusualWhalesAPI.getMarketCorrelations(startDate || undefined, endDate || undefined);
        break;
      default:
        return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Market API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch market data' },
      { status: 500 }
    );
  }
}
