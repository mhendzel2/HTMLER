
import { NextRequest, NextResponse } from 'next/server';
import { unusualWhalesAPI } from '@/lib/unusual-whales-api';

export async function GET() {
  try {
    const data = await unusualWhalesAPI.getInstitutions();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Institutions API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch institutions' },
      { status: 500 }
    );
  }
}
