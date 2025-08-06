
import { NextRequest, NextResponse } from 'next/server';
import { unusualWhalesAPI } from '@/lib/unusual-whales-api';

export async function GET(
  request: NextRequest,
  { params }: { params: { ticker: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const dataType = searchParams.get('type') || 'data';

    let data;
    
    switch (dataType) {
      case 'volumes':
        data = await unusualWhalesAPI.getShortsVolumesByExchange(params.ticker);
        break;
      case 'ftds':
        data = await unusualWhalesAPI.getShortsFTDs(params.ticker);
        break;
      case 'interest-float':
        data = await unusualWhalesAPI.getShortsInterestFloat(params.ticker);
        break;
      case 'volume-ratio':
        data = await unusualWhalesAPI.getShortsVolumeAndRatio(params.ticker);
        break;
      default:
        data = await unusualWhalesAPI.getShortsData(params.ticker);
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Shorts API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shorts data' },
      { status: 500 }
    );
  }
}
