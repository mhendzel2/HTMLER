import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = 'https://api.unusualwhales.com/api/net-flow/expiry';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tideType = searchParams.get('tide_type') || 'equity_only';
  const moneyness = searchParams.get('moneyness') || 'otm';
  const expiration = searchParams.get('expiration') || 'zero_dte';

  try {
    const response = await fetch(`${API_BASE_URL}?tide_type=${tideType}&moneyness=${moneyness}&expiration=${expiration}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.UNUSUAL_WHALES_API_KEY}`
      }
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch net flow data' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching net flow data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
