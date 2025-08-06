
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { unusualWhalesAPI } from '@/lib/unusual-whales-api';

interface EarningsFilter {
  minOptionsVolume?: number;
  putCallRatioMin?: number;
  putCallRatioMax?: number;
  minMarketCap?: number;
  reportTime?: 'premarket' | 'aftermarket' | 'all';
}

interface EarningsResponse {
  earnings: any[];
  filteredEarnings: any[];
  filterCriteria: EarningsFilter;
  totalBeforeFilter: number;
  totalAfterFilter: number;
  qualifiedTickers: string[];
  apiStatus: 'connected' | 'error';
  lastUpdated: string;
}

const applyEarningsFilters = (earningsData: any[], filters: EarningsFilter) => {
  return earningsData.filter(item => {
    // Default filter criteria based on user requirements
    const putCallRatio = item.put_call_ratio || item.putCallRatio || 1.0;
    const optionsVolume = item.options_volume || item.optionsVolume || 0;
    const marketCap = item.market_cap || item.marketCap || 0;
    const reportTime = item.report_time || item.reportTime;

    // Apply put/call ratio filter (looking for bullish < 0.8 or bearish > 1.3)
    const putCallCondition = filters.putCallRatioMin !== undefined && filters.putCallRatioMax !== undefined
      ? (putCallRatio >= filters.putCallRatioMin && putCallRatio <= filters.putCallRatioMax)
      : (putCallRatio < 0.8 || putCallRatio > 1.3);

    // Apply options volume filter
    const volumeCondition = !filters.minOptionsVolume || optionsVolume >= filters.minOptionsVolume;

    // Apply market cap filter
    const marketCapCondition = !filters.minMarketCap || marketCap >= filters.minMarketCap;

    // Apply report time filter
    const reportTimeCondition = !filters.reportTime || filters.reportTime === 'all' || reportTime === filters.reportTime;

    return putCallCondition && volumeCondition && marketCapCondition && reportTimeCondition;
  });
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'upcoming';
    const date = searchParams.get('date');
    const limit = parseInt(searchParams.get('limit') || '100');
    
    // Earnings filter parameters
    const minOptionsVolume = searchParams.get('min_options_volume') 
      ? parseInt(searchParams.get('min_options_volume')!) : 200;
    const putCallRatioMin = searchParams.get('put_call_ratio_min') 
      ? parseFloat(searchParams.get('put_call_ratio_min')!) : undefined;
    const putCallRatioMax = searchParams.get('put_call_ratio_max') 
      ? parseFloat(searchParams.get('put_call_ratio_max')!) : undefined;
    const minMarketCap = searchParams.get('min_market_cap') 
      ? parseFloat(searchParams.get('min_market_cap')!) : 1000000000; // 1B minimum
    const reportTime = searchParams.get('report_time') as 'premarket' | 'aftermarket' | 'all' | undefined;

    const filters: EarningsFilter = {
      minOptionsVolume,
      putCallRatioMin,
      putCallRatioMax,
      minMarketCap,
      reportTime: reportTime || 'all'
    };

    let earningsData: any[] = [];

    try {
      // Fetch from real Unusual Whales API
      if (type === 'aftermarket') {
        const response: any = await unusualWhalesAPI.getEarningsAfterHours(date || undefined, limit);
        earningsData = response.data || response || [];
      } else if (type === 'premarket') {
        const response: any = await unusualWhalesAPI.getEarningsPreMarket(date || undefined, limit);
        earningsData = response.data || response || [];
      } else if (type === 'calendar') {
        const startDate = searchParams.get('start_date');
        const endDate = searchParams.get('end_date');
        // Since there's no getEarningsCalendar method, fetch both premarket and afterhours
        const [premarket, aftermarket] = await Promise.all([
          unusualWhalesAPI.getEarningsPreMarket(startDate || date || undefined, limit),
          unusualWhalesAPI.getEarningsAfterHours(startDate || date || undefined, limit)
        ]);
        const premResult: any = premarket;
        const afterResult: any = aftermarket;
        const premData = Array.isArray(premResult.data) ? premResult.data : (Array.isArray(premResult) ? premResult : []);
        const afterData = Array.isArray(afterResult.data) ? afterResult.data : (Array.isArray(afterResult) ? afterResult : []);
        earningsData = [...premData, ...afterData];
      } else {
        // Fetch both premarket and aftermarket for upcoming
        const [premarket, aftermarket] = await Promise.all([
          unusualWhalesAPI.getEarningsPreMarket(date || undefined, Math.floor(limit/2)),
          unusualWhalesAPI.getEarningsAfterHours(date || undefined, Math.floor(limit/2))
        ]);
        const premResult: any = premarket;
        const afterResult: any = aftermarket;
        earningsData = [
          ...(premResult.data || premResult || []),
          ...(afterResult.data || afterResult || [])
        ];
      }

      // Apply filters
      const filteredEarnings = applyEarningsFilters(earningsData, filters);
      const qualifiedTickers = filteredEarnings.map(item => item.ticker || item.symbol).filter(Boolean);

      const response: EarningsResponse = {
        earnings: earningsData,
        filteredEarnings,
        filterCriteria: filters,
        totalBeforeFilter: earningsData.length,
        totalAfterFilter: filteredEarnings.length,
        qualifiedTickers,
        apiStatus: 'connected',
        lastUpdated: new Date().toISOString()
      };

      return NextResponse.json(response);

    } catch (apiError: any) {
      console.error('Unusual Whales API Error:', apiError);
      
      // Return error response with empty data
      const errorResponse: EarningsResponse = {
        earnings: [],
        filteredEarnings: [],
        filterCriteria: filters,
        totalBeforeFilter: 0,
        totalAfterFilter: 0,
        qualifiedTickers: [],
        apiStatus: 'error',
        lastUpdated: new Date().toISOString()
      };

      return NextResponse.json({
        ...errorResponse,
        error: apiError.message || 'API request failed',
        errorStatus: apiError.status
      });
    }

  } catch (error) {
    console.error('Earnings API Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch earnings data',
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
    const { tickers, customFilters } = body;

    if (!tickers || !Array.isArray(tickers)) {
      return NextResponse.json(
        { error: 'Tickers array is required' },
        { status: 400 }
      );
    }

    // Fetch earnings data for specific tickers
    const earningsPromises = tickers.map(async (ticker: string) => {
      try {
        // Try to get both premarket and aftermarket data for the ticker
        const [premarket, aftermarket] = await Promise.all([
          unusualWhalesAPI.getEarningsPreMarket(undefined, 1).catch(() => ({ data: [] })),
          unusualWhalesAPI.getEarningsAfterHours(undefined, 1).catch(() => ({ data: [] }))
        ]);
        
        const premResult: any = premarket;
        const afterResult: any = aftermarket;
        
        const premData = (premResult.data || premResult || []).filter((item: any) => 
          (item.ticker || item.symbol) === ticker
        );
        const afterData = (afterResult.data || afterResult || []).filter((item: any) => 
          (item.ticker || item.symbol) === ticker
        );

        return [...premData, ...afterData];
      } catch (error) {
        console.error(`Error fetching earnings for ${ticker}:`, error);
        return [];
      }
    });

    const earningsResults = await Promise.all(earningsPromises);
    const flattenedData = earningsResults.flat();

    // Apply custom filters if provided
    const filters = customFilters || {
      minOptionsVolume: 200,
      minMarketCap: 1000000000
    };

    const filteredData = applyEarningsFilters(flattenedData, filters);

    return NextResponse.json({
      earnings: flattenedData,
      filteredEarnings: filteredData,
      requestedTickers: tickers,
      filterCriteria: filters,
      resultsCount: filteredData.length,
      apiStatus: 'connected',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('POST earnings API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ticker-specific earnings data' },
      { status: 500 }
    );
  }
}
