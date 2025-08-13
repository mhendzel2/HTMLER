
import { NextResponse } from 'next/server';
import { unusualWhalesAPI } from '@/lib/unusual-whales-api';

export async function GET(
  request: Request,
  context: any,
) {
  const { params } = context;
  try {
    const data = await unusualWhalesAPI.getInstitutionActivity(params.name);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Institution activity API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch institution activity' },
      { status: 500 }
    );
  }
}
