import { NextRequest, NextResponse } from 'next/server';
import { flowAnalysisService } from '@/lib/flow-analysis';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ticker = searchParams.get('ticker');
    const tickers = searchParams.get('tickers');

    if (!ticker && !tickers) {
      return NextResponse.json(
        { error: 'Either ticker or tickers parameter is required' },
        { status: 400 }
      );
    }

    if (ticker) {
      // Single ticker analysis
      const analysis = await flowAnalysisService.analyzeTickerFlow(ticker);
      return NextResponse.json({ data: analysis });
    } else if (tickers) {
      // Batch analysis
      const tickerList = tickers.split(',').map(t => t.trim().toUpperCase());
      const analyses = await flowAnalysisService.analyzeBatch(tickerList);
      return NextResponse.json({ data: analyses });
    }
  } catch (error) {
    console.error('Flow analysis API error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze flow data' },
      { status: 500 }
    );
  }
}
