
import { NextRequest, NextResponse } from 'next/server';
import { unusualWhalesAPI } from '@/lib/unusual-whales-api';

interface NewsItem {
  id: string;
  title: string;
  description?: string;
  url?: string;
  source: string;
  published_at: string;
  ticker_symbols: string[];
  sentiment: 'positive' | 'negative' | 'neutral';
  relevance_score?: number;
}

// Transform raw API data to match frontend expectations
function transformNewsItem(item: any): NewsItem {
  return {
    id: item.id || `${item.source}-${item.created_at}-${Math.random().toString(36).substr(2, 9)}`,
    title: item.headline || item.title || 'No title available',
    description: item.summary || item.description || item.content || null,
    url: item.url || item.link || null,
    source: item.source || 'Unusual Whales',
    published_at: item.created_at || item.published_at || new Date().toISOString(),
    ticker_symbols: item.tickers || item.symbols || [],
    sentiment: item.sentiment || 'neutral',
    relevance_score: item.is_major ? 0.8 : 0.5
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '0');
    const startDate = searchParams.get('start_date') || undefined;
    const endDate = searchParams.get('end_date') || undefined;
    const ticker = searchParams.get('ticker') || undefined;

    const rawData: any = await unusualWhalesAPI.getNewsHeadlines(
      limit,
      page,
      startDate,
      endDate,
      ticker
    );

    // Transform the raw data to match frontend expectations
    const newsItems: NewsItem[] = (rawData.data || rawData || []).map(transformNewsItem);

    return NextResponse.json(newsItems);
  } catch (error) {
    console.error('News API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch news headlines' },
      { status: 500 }
    );
  }
}
