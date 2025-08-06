
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { unusualWhalesAPI } from '@/lib/unusual-whales-api';

interface NewsItem {
  id: string;
  title: string;
  content?: string;
  source: string;
  author?: string;
  timestamp: string;
  url?: string;
  tickers_mentioned?: string[];
  sentiment_score?: number;
  market_impact_score?: number;
  image_url?: string;
}

interface NewsResponse {
  news: NewsItem[];
  totalCount: number;
  hasMore: boolean;
  requestedTickers?: string[];
  lastUpdated: string;
  apiStatus: 'connected' | 'error';
}

// Cache for storing ticker-specific news to avoid excessive API calls
const newsCache = new Map<string, { data: NewsItem[], timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const formatNewsItem = (item: any): NewsItem => {
  return {
    id: item.id || item.uuid || Math.random().toString(36).substr(2, 9),
    title: item.title || item.headline || 'No title available',
    content: item.content || item.summary || item.description,
    source: item.source || item.provider || 'Unusual Whales',
    author: item.author || item.byline,
    timestamp: item.timestamp || item.published_at || item.date || new Date().toISOString(),
    url: item.url || item.link,
    tickers_mentioned: item.tickers_mentioned || item.symbols || item.tickers || [],
    sentiment_score: item.sentiment_score || item.sentiment,
    market_impact_score: item.market_impact_score || item.impact_score,
    image_url: item.image_url || item.image || item.thumbnail
  };
};

const getCachedNews = (key: string): NewsItem[] | null => {
  const cached = newsCache.get(key);
  if (!cached) return null;
  
  const isExpired = Date.now() - cached.timestamp > CACHE_DURATION;
  if (isExpired) {
    newsCache.delete(key);
    return null;
  }
  
  return cached.data;
};

const setCachedNews = (key: string, data: NewsItem[]) => {
  newsCache.set(key, { data, timestamp: Date.now() });
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '0');
    const tickers = searchParams.get('tickers')?.split(',').filter(Boolean);
    const hours = parseInt(searchParams.get('hours') || '24');
    const category = searchParams.get('category');
    const minImpactScore = parseFloat(searchParams.get('min_impact_score') || '0');

    // Determine cache key
    const cacheKey = `news:${JSON.stringify({ limit, page, tickers, hours, category, minImpactScore })}`;
    
    // Check cache first
    const cachedNews = getCachedNews(cacheKey);
    if (cachedNews) {
      return NextResponse.json({
        news: cachedNews,
        totalCount: cachedNews.length,
        hasMore: cachedNews.length >= limit,
        requestedTickers: tickers,
        lastUpdated: new Date().toISOString(),
        apiStatus: 'connected',
        fromCache: true
      });
    }

    let allNews: NewsItem[] = [];

    try {
      if (tickers && tickers.length > 0) {
        // Fetch news for specific tickers
        const newsPromises = tickers.map(async (ticker) => {
          try {
            const response: any = await unusualWhalesAPI.getNewsHeadlines(
              Math.ceil(limit / tickers.length),
              page,
              undefined, // start date
              undefined, // end date
              ticker
            );
            const newsItems = (response.data || response || []).map(formatNewsItem);
            return newsItems;
          } catch (error) {
            console.error(`Error fetching news for ticker ${ticker}:`, error);
            return [];
          }
        });

        const tickerNewsResults = await Promise.all(newsPromises);
        allNews = tickerNewsResults.flat();

        // Also get general market news and filter for mentioned tickers
        try {
          const generalResponse: any = await unusualWhalesAPI.getNewsHeadlines(limit, page);
          const generalNews = (generalResponse.data || generalResponse || [])
            .map(formatNewsItem)
            .filter((item: NewsItem) => 
              item.tickers_mentioned?.some(mentioned => 
                tickers.some(requested => 
                  mentioned.toLowerCase().includes(requested.toLowerCase())
                )
              )
            );
          
          allNews = [...allNews, ...generalNews];
        } catch (error) {
          console.error('Error fetching general news:', error);
        }

      } else {
        // Fetch general market news
        const response: any = await unusualWhalesAPI.getNewsHeadlines(limit, page);
        allNews = (response.data || response || []).map(formatNewsItem);
      }

      // Apply filters
      let filteredNews = allNews;

      // Filter by time range
      if (hours > 0) {
        const cutoffTime = new Date(Date.now() - (hours * 60 * 60 * 1000));
        filteredNews = filteredNews.filter(item => 
          new Date(item.timestamp) >= cutoffTime
        );
      }

      // Filter by minimum impact score
      if (minImpactScore > 0) {
        filteredNews = filteredNews.filter(item => 
          (item.market_impact_score || 0) >= minImpactScore
        );
      }

      // Remove duplicates based on title
      const uniqueNews = filteredNews.filter((item, index, self) => 
        index === self.findIndex(t => t.title === item.title)
      );

      // Sort by timestamp (most recent first)
      uniqueNews.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      // Limit results
      const limitedNews = uniqueNews.slice(0, limit);

      // Cache the results
      setCachedNews(cacheKey, limitedNews);

      const response: NewsResponse = {
        news: limitedNews,
        totalCount: uniqueNews.length,
        hasMore: uniqueNews.length > limit,
        requestedTickers: tickers,
        lastUpdated: new Date().toISOString(),
        apiStatus: 'connected'
      };

      return NextResponse.json(response);

    } catch (apiError: any) {
      console.error('Unusual Whales News API Error:', apiError);
      
      return NextResponse.json({
        news: [],
        totalCount: 0,
        hasMore: false,
        requestedTickers: tickers,
        lastUpdated: new Date().toISOString(),
        apiStatus: 'error',
        error: apiError.message || 'API request failed',
        errorStatus: apiError.status
      });
    }

  } catch (error) {
    console.error('News API Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch news data',
        news: [],
        totalCount: 0,
        hasMore: false,
        apiStatus: 'error',
        lastUpdated: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tickers, keywords, hours = 24, minImpactScore = 0 } = body;

    if (!tickers && !keywords) {
      return NextResponse.json(
        { error: 'Either tickers or keywords must be provided' },
        { status: 400 }
      );
    }

    let allNews: NewsItem[] = [];

    // Fetch news for specific tickers if provided
    if (tickers && Array.isArray(tickers)) {
      const tickerNewsPromises = tickers.map(async (ticker: string) => {
        try {
          const response: any = await unusualWhalesAPI.getNewsHeadlines(50, 0, undefined, undefined, ticker);
          return (response.data || response || []).map(formatNewsItem);
        } catch (error) {
          console.error(`Error fetching news for ticker ${ticker}:`, error);
          return [];
        }
      });

      const tickerResults = await Promise.all(tickerNewsPromises);
      allNews = tickerResults.flat();
    }

    // If keywords provided, also search general news and filter by keywords
    if (keywords) {
      try {
        const response: any = await unusualWhalesAPI.getNewsHeadlines(100, 0);
        const keywordNews = (response.data || response || [])
          .map(formatNewsItem)
          .filter((item: NewsItem) => {
            const searchText = `${item.title} ${item.content || ''}`.toLowerCase();
            const keywordList = Array.isArray(keywords) ? keywords : [keywords];
            return keywordList.some(keyword => 
              searchText.includes(keyword.toLowerCase())
            );
          });
        
        allNews = [...allNews, ...keywordNews];
      } catch (error) {
        console.error('Error fetching keyword-based news:', error);
      }
    }

    // Apply filters
    let filteredNews = allNews;

    // Filter by time range
    const cutoffTime = new Date(Date.now() - (hours * 60 * 60 * 1000));
    filteredNews = filteredNews.filter(item => 
      new Date(item.timestamp) >= cutoffTime
    );

    // Filter by minimum impact score
    if (minImpactScore > 0) {
      filteredNews = filteredNews.filter(item => 
        (item.market_impact_score || 0) >= minImpactScore
      );
    }

    // Remove duplicates and sort
    const uniqueNews = filteredNews.filter((item, index, self) => 
      index === self.findIndex(t => t.title === item.title)
    );

    uniqueNews.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return NextResponse.json({
      news: uniqueNews,
      searchCriteria: { tickers, keywords, hours, minImpactScore },
      totalCount: uniqueNews.length,
      apiStatus: 'connected',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('POST news API error:', error);
    return NextResponse.json(
      { error: 'Failed to search news data' },
      { status: 500 }
    );
  }
}
