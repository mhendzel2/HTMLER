
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { unusualWhalesAPI } from '@/lib/unusual-whales-api';

export async function GET(
  request: NextRequest,
  { params }: { params: { contractId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'info';

    let data;
    switch (type) {
      case 'info':
        data = await unusualWhalesAPI.getOptionContract(params.contractId);
        break;
      case 'intraday':
        const date = searchParams.get('date');
        data = await unusualWhalesAPI.getOptionContractIntraday(params.contractId, date || undefined);
        break;
      case 'volume-profile':
        data = await unusualWhalesAPI.getOptionContractVolumeProfile(params.contractId);
        break;
      default:
        return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Option contract API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch option contract data' },
      { status: 500 }
    );
  }
}
