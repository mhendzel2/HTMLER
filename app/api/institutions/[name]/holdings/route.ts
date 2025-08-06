
import { NextRequest, NextResponse } from 'next/server';
import { unusualWhalesAPI } from '@/lib/unusual-whales-api';

export async function GET(
  request: NextRequest,
  { params }: { params: { name: string } }
) {
  try {
    const data = await unusualWhalesAPI.getInstitutionHoldings(params.name);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Institution holdings API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch institution holdings' },
      { status: 500 }
    );
  }
}
