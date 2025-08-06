
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';

// This endpoint will be called to fetch news for earnings-qualified tickers
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { qualifiedTickers } = body;

    if (!qualifiedTickers || !Array.isArray(qualifiedTickers)) {
      return NextResponse.json(
        { error: 'Qualified tickers array is required' },
        { status: 400 }
      );
    }

    // Call our news API with the earnings-qualified tickers
    const newsResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/data/news?tickers=${qualifiedTickers.join(',')}&limit=30&hours=72&min_impact_score=5`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!newsResponse.ok) {
      throw new Error('Failed to fetch news for earnings tickers');
    }

    const newsData = await newsResponse.json();

    return NextResponse.json({
      qualifiedTickers,
      news: newsData.news || [],
      totalCount: newsData.totalCount || 0,
      lastUpdated: new Date().toISOString(),
      status: 'success'
    });

  } catch (error) {
    console.error('Earnings news API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch earnings news',
        qualifiedTickers: [],
        news: [],
        totalCount: 0,
        status: 'error'
      },
      { status: 500 }
    );
  }
}
