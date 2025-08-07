import { NextRequest, NextResponse } from 'next/server';
import { flowAnalysisService } from '@/lib/flow-analysis';
import { getAllWatchlistTickers, getWatchlist } from '@/app/api/watchlist/store';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ticker = searchParams.get('ticker');
    let tickers = searchParams.get('tickers');
    const watchlistId = searchParams.get('watchlist');

    if (!ticker && !tickers) {
      if (watchlistId) {
        const wl = getWatchlist(watchlistId);
        tickers = wl ? wl.items.map(i => i.ticker).join(',') : '';
      } else {
        const wlTickers = getAllWatchlistTickers();
        tickers = wlTickers.join(',');
      }
    }

    if (!ticker && !tickers) {
      return NextResponse.json(
        { error: 'No tickers available for analysis' },
        { status: 400 }
      );
    }

    if (ticker) {
      // Single ticker analysis
      const analysis = await flowAnalysisService.analyzeTickerFlow(ticker);
      return NextResponse.json({ data: analysis });
    } else if (tickers) {
      // Batch analysis
      const tickerList = tickers.split(',').map(t => t.trim().toUpperCase()).filter(Boolean);
      const analyses = await flowAnalysisService.analyzeBatch(tickerList);

      // Return all analyses so the UI can display available data
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
