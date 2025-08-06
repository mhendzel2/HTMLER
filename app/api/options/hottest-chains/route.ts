import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = 'https://api.unusualwhales.com/api/screener/option-contracts';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  
  // Build query parameters from request
  const params = new URLSearchParams();
  
  // Default parameters for "hottest chains"
  params.set('min_volume', '200'); // API default minimum
  params.set('order', 'volume');
  params.set('order_direction', 'desc');
  params.set('limit', searchParams.get('limit') || '50');
  
  // Optional filters
  if (searchParams.get('min_premium')) params.set('min_premium', searchParams.get('min_premium')!);
  if (searchParams.get('max_premium')) params.set('max_premium', searchParams.get('max_premium')!);
  if (searchParams.get('min_volume')) params.set('min_volume', searchParams.get('min_volume')!);
  if (searchParams.get('max_dte')) params.set('max_dte', searchParams.get('max_dte')!);
  if (searchParams.get('min_dte')) params.set('min_dte', searchParams.get('min_dte')!);
  if (searchParams.get('is_otm')) params.set('is_otm', searchParams.get('is_otm')!);
  if (searchParams.get('type')) params.set('type', searchParams.get('type')!);
  if (searchParams.get('ticker_symbol')) params.set('ticker_symbol', searchParams.get('ticker_symbol')!);
  if (searchParams.get('exclude_ex_div_ticker')) params.set('exclude_ex_div_ticker', searchParams.get('exclude_ex_div_ticker')!);
  if (searchParams.get('vol_greater_oi')) params.set('vol_greater_oi', searchParams.get('vol_greater_oi')!);

  try {
    const response = await fetch(`${API_BASE_URL}?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.UNUSUAL_WHALES_API_KEY}`
      }
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch hottest chains' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching hottest chains:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
