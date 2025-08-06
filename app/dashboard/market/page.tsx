
'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/dashboard/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatPercent, formatVolume } from '@/lib/utils';
import { TrendingUp, TrendingDown, PieChart, Activity, DollarSign, BarChart3, Flame, Eye } from 'lucide-react';

interface MarketTideEntry {
  timestamp: string;
  date: string;
  net_call_premium: string;
  net_put_premium: string;
  net_volume: number;
}

interface MarketTideResponse {
  data: MarketTideEntry[];
  date: string;
}

interface SectorMetrics {
  sector: string;
  net_call_premium: number;
  net_put_premium: number;
  net_volume: number;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  call_put_ratio: number;
  total_premium: number;
}

interface MarketMetrics {
  latest_timestamp: string;
  net_call_premium: number;
  net_put_premium: number;
  call_put_ratio: number;
  net_volume: number;
  total_premium: number;
  overall_sentiment: 'bullish' | 'bearish' | 'neutral';
  change_5m: {
    call_premium_change: number;
    put_premium_change: number;
    volume_change: number;
  };
}

interface HottestChain {
  ticker: string;
  option_chain: string;
  volume: number;
  open_interest: number;
  premium: number;
  strike: number;
  expiry: string;
  type: 'call' | 'put';
  underlying_price: number;
  daily_perc_change: number;
  iv_perc: number;
  delta: number;
}

const SECTORS = [
  'Technology',
  'Healthcare',
  'Financial Services',
  'Consumer Cyclical',
  'Consumer Defensive',
  'Energy',
  'Industrials',
  'Communication Services',
  'Real Estate',
  'Utilities',
  'Basic Materials',
];

// Hottest Chains Component
function HottestChainsSection() {
  const [hottestChains, setHottestChains] = useState<HottestChain[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchHottestChains = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/options/hottest-chains?limit=10&min_volume=1000&order=volume&order_direction=desc');
      if (response.ok) {
        const data = await response.json();
        
        // Transform the data to match our interface
        const transformedData: HottestChain[] = (data.data || []).map((chain: any) => ({
          ticker: chain.ticker,
          option_chain: chain.option_chain || `${chain.ticker}${chain.expiry}${chain.type?.toUpperCase()}${chain.strike}`,
          volume: chain.volume,
          open_interest: chain.open_interest,
          premium: chain.premium,
          strike: chain.strike,
          expiry: chain.expiry,
          type: chain.type?.toLowerCase(),
          underlying_price: chain.underlying_price,
          daily_perc_change: chain.daily_perc_change || 0,
          iv_perc: chain.iv_perc || 0,
          delta: chain.delta || 0,
        }));

        setHottestChains(transformedData);
      } else {
        console.error('Failed to fetch hottest chains:', response.statusText);
        setHottestChains([]);
      }
    } catch (error) {
      console.error('Error fetching hottest chains:', error);
      setHottestChains([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHottestChains();
  }, []);

  const getOptionTypeColor = (type: string) => {
    return type === 'call' 
      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Flame className="h-5 w-5 text-orange-500" />
              <span>Hottest Option Chains</span>
            </CardTitle>
            <CardDescription>
              Most active option contracts by volume (minimum 1,000 volume)
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchHottestChains}
            disabled={loading}
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
            ) : (
              'Refresh'
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        ) : hottestChains.length > 0 ? (
          <div className="space-y-3">
            {hottestChains.slice(0, 8).map((chain, index) => (
              <div 
                key={chain.option_chain} 
                className="flex items-center justify-between p-3 border rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="flex items-center space-x-4">
                  <div className="flex items-center justify-center w-8 h-8 bg-orange-100 rounded-full text-orange-600 font-bold text-sm">
                    {index + 1}
                  </div>
                  
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-lg">{chain.ticker}</span>
                      <Badge className={getOptionTypeColor(chain.type)}>
                        {chain.type?.toUpperCase()}
                      </Badge>
                      <span className="text-sm text-gray-600">${chain.strike}</span>
                      <span className="text-xs text-gray-500">{chain.expiry}</span>
                    </div>
                    <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                      <span>Vol: {formatVolume(chain.volume)}</span>
                      <span>OI: {formatVolume(chain.open_interest)}</span>
                      <span>IV: {(chain.iv_perc * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-sm font-semibold">
                    {formatCurrency(chain.premium)}
                  </div>
                  <div className={`text-xs ${chain.daily_perc_change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {chain.daily_perc_change >= 0 ? '+' : ''}{formatPercent(chain.daily_perc_change)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-32">
            <p className="text-gray-500">No data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function MarketPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [marketData, setMarketData] = useState<MarketMetrics | null>(null);
  const [selectedSector, setSelectedSector] = useState<string>('all');
  const [sectorData, setSectorData] = useState<SectorMetrics[]>([]);
  const [loadingSectors, setLoadingSectors] = useState(false);

  const fetchSectorData = async () => {
    setLoadingSectors(true);
    try {
      const sectorPromises = SECTORS.map(async (sector) => {
        try {
          const response = await fetch(`/api/market?type=sector-tide&sector=${encodeURIComponent(sector)}`);
          if (response.ok) {
            const tideData: MarketTideResponse = await response.json();
            if (tideData.data && tideData.data.length > 0) {
              const latest = tideData.data[tideData.data.length - 1];
              const latestCallPremium = parseFloat(latest.net_call_premium);
              const latestPutPremium = parseFloat(latest.net_put_premium);
              const totalPremium = Math.abs(latestCallPremium) + Math.abs(latestPutPremium);
              const callPutRatio = latestPutPremium !== 0 ? Math.abs(latestCallPremium / latestPutPremium) : 0;
              
              let sentiment: 'bullish' | 'bearish' | 'neutral' = 'neutral';
              if (latestCallPremium > Math.abs(latestPutPremium)) {
                sentiment = 'bullish';
              } else if (Math.abs(latestPutPremium) > latestCallPremium) {
                sentiment = 'bearish';
              }
              
              return {
                sector,
                net_call_premium: latestCallPremium,
                net_put_premium: latestPutPremium,
                net_volume: latest.net_volume,
                sentiment,
                call_put_ratio: callPutRatio,
                total_premium: totalPremium
              };
            }
          }
        } catch (error) {
          console.warn(`Failed to fetch data for sector ${sector}:`, error);
        }
        return null;
      });
      
      const results = await Promise.all(sectorPromises);
      const validSectorData = results.filter((data): data is SectorMetrics => data !== null);
      setSectorData(validSectorData);
    } catch (error) {
      console.error('Failed to fetch sector data:', error);
      setSectorData([]);
    } finally {
      setLoadingSectors(false);
    }
  };

  const fetchMarketData = async () => {
    setRefreshing(true);
    try {
      // Fetch real market tide data from API with 5-minute intervals
      const response = await fetch('/api/market?type=tide&interval_5m=true');
      
      if (response.ok) {
        const tideData: MarketTideResponse = await response.json();
        
        if (tideData.data && tideData.data.length > 0) {
          // Get the latest entry
          const latest = tideData.data[tideData.data.length - 1];
          const previous = tideData.data.length > 1 ? tideData.data[tideData.data.length - 2] : null;
          
          // Convert string values to numbers
          const latestCallPremium = parseFloat(latest.net_call_premium);
          const latestPutPremium = parseFloat(latest.net_put_premium);
          const totalPremium = Math.abs(latestCallPremium) + Math.abs(latestPutPremium);
          
          // Calculate call/put ratio
          const callPutRatio = latestPutPremium !== 0 ? Math.abs(latestCallPremium / latestPutPremium) : 0;
          
          // Determine sentiment based on net premium trends
          let sentiment: 'bullish' | 'bearish' | 'neutral' = 'neutral';
          if (latestCallPremium > Math.abs(latestPutPremium)) {
            sentiment = 'bullish';
          } else if (Math.abs(latestPutPremium) > latestCallPremium) {
            sentiment = 'bearish';
          }
          
          // Calculate 5-minute changes if we have previous data
          const change5m = previous ? {
            call_premium_change: latestCallPremium - parseFloat(previous.net_call_premium),
            put_premium_change: latestPutPremium - parseFloat(previous.net_put_premium),
            volume_change: latest.net_volume - previous.net_volume
          } : {
            call_premium_change: 0,
            put_premium_change: 0,
            volume_change: 0
          };
          
          const processedData: MarketMetrics = {
            latest_timestamp: latest.timestamp,
            net_call_premium: latestCallPremium,
            net_put_premium: latestPutPremium,
            call_put_ratio: callPutRatio,
            net_volume: latest.net_volume,
            total_premium: totalPremium,
            overall_sentiment: sentiment,
            change_5m: change5m
          };
          
          setMarketData(processedData);
        } else {
          console.error('No market tide data available');
          setMarketData(null);
        }
      } else {
        console.error('Failed to fetch market data:', response.statusText);
        setMarketData(null);
      }
    } catch (error) {
      console.error('Failed to fetch market data:', error);
      setMarketData(null);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarketData();
    fetchSectorData();
  }, []);

  const getSentimentColor = (sentiment?: string) => {
    switch (sentiment) {
      case 'bullish':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'bearish':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    }
  };

  const getSentimentIcon = (sentiment?: string) => {
    switch (sentiment) {
      case 'bullish':
        return <TrendingUp className="h-4 w-4" />;
      case 'bearish':
        return <TrendingDown className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex-1 overflow-auto">
        <Header title="Market Overview" description="Comprehensive market analysis and sector insights" />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!marketData) {
    return (
      <div className="flex-1 overflow-auto">
        <Header title="Market Overview" description="Comprehensive market analysis and sector insights" />
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Failed to load market data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <Header 
        title="Market Overview"
        description="Comprehensive market analysis and sector insights"
        onRefresh={() => { fetchMarketData(); fetchSectorData(); }}
        refreshing={refreshing || loadingSectors}
      />
      
      <div className="p-6 space-y-6">
        {/* Market Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Market Sentiment</CardTitle>
              {getSentimentIcon(marketData.overall_sentiment)}
            </CardHeader>
            <CardContent>
              <Badge className={getSentimentColor(marketData.overall_sentiment)}>
                {marketData.overall_sentiment?.toUpperCase() || 'NEUTRAL'}
              </Badge>
              <p className="text-xs text-muted-foreground mt-2">
                Based on options flow analysis
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Call/Put Ratio</CardTitle>
              <BarChart3 className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{marketData.call_put_ratio?.toFixed(2) || '0.00'}</div>
              <p className="text-xs text-muted-foreground">
                {(marketData.call_put_ratio || 0) > 1 ? 'Call-heavy' : 'Put-heavy'} market
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Premium</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency((marketData.total_premium || 0) / 1000000)}M
              </div>
              <p className="text-xs text-muted-foreground">
                Total options premium today
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Volume</CardTitle>
              <Activity className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {formatVolume(marketData.net_volume)}
              </div>
              <p className="text-xs text-muted-foreground">
                Latest 5-minute interval
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Market Tide Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Market Tide Analysis</CardTitle>
            <CardDescription>
              Real-time options premium flow and volume trends (5-minute intervals)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Premium Flow */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                      <span className="font-medium">Net Call Premium</span>
                    </div>
                    <Badge className={marketData.net_call_premium >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                      {marketData.net_call_premium >= 0 ? 'Bullish' : 'Bearish'}
                    </Badge>
                  </div>
                  <div className="text-2xl font-bold mb-1">
                    {formatCurrency(Math.abs(marketData.net_call_premium) / 1000000)}M
                  </div>
                  <div className="text-sm text-muted-foreground">
                    5m change: {formatCurrency(marketData.change_5m.call_premium_change / 1000000)}M
                  </div>
                </div>

                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <TrendingDown className="h-5 w-5 text-red-600" />
                      <span className="font-medium">Net Put Premium</span>
                    </div>
                    <Badge className={marketData.net_put_premium >= 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}>
                      {marketData.net_put_premium >= 0 ? 'Bearish' : 'Bullish'}
                    </Badge>
                  </div>
                  <div className="text-2xl font-bold mb-1">
                    {formatCurrency(Math.abs(marketData.net_put_premium) / 1000000)}M
                  </div>
                  <div className="text-sm text-muted-foreground">
                    5m change: {formatCurrency(marketData.change_5m.put_premium_change / 1000000)}M
                  </div>
                </div>
              </div>

              {/* Volume Analysis */}
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-center space-x-2 mb-3">
                  <Activity className="h-5 w-5 text-blue-600" />
                  <span className="font-medium">Volume Trends</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Current Volume</p>
                    <p className="text-lg font-semibold">{formatVolume(marketData.net_volume)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">5m Change</p>
                    <p className={`text-lg font-semibold ${marketData.change_5m.volume_change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {marketData.change_5m.volume_change >= 0 ? '+' : ''}{formatVolume(marketData.change_5m.volume_change)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Call/Put Ratio</p>
                    <p className="text-lg font-semibold">{marketData.call_put_ratio.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {/* Timestamp */}
              <div className="text-sm text-muted-foreground text-center">
                Last updated: {new Date(marketData.latest_timestamp).toLocaleString()}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sector Tide Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Sector Tide Analysis</CardTitle>
            <CardDescription>
              Options activity breakdown by sector showing institutional flow patterns
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingSectors ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            ) : sectorData.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sectorData
                  .sort((a, b) => b.total_premium - a.total_premium)
                  .map((sector) => (
                    <div 
                      key={sector.sector} 
                      className="p-4 border rounded-lg hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-sm">{sector.sector}</h4>
                        <Badge className={getSentimentColor(sector.sentiment)}>
                          {sector.sentiment.toUpperCase()}
                        </Badge>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-500">Call Premium</span>
                          <span className={`text-sm font-medium ${sector.net_call_premium >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(Math.abs(sector.net_call_premium) / 1000000)}M
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-500">Put Premium</span>
                          <span className={`text-sm font-medium ${sector.net_put_premium >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {formatCurrency(Math.abs(sector.net_put_premium) / 1000000)}M
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-500">Volume</span>
                          <span className={`text-sm font-medium ${sector.net_volume >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatVolume(sector.net_volume)}
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-500">C/P Ratio</span>
                          <span className="text-sm font-medium">
                            {sector.call_put_ratio.toFixed(2)}
                          </span>
                        </div>
                      </div>
                      
                      {/* Sentiment Indicator Bar */}
                      <div className="mt-3 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-300 ${
                            sector.sentiment === 'bullish' ? 'bg-green-500 w-full' : 
                            sector.sentiment === 'bearish' ? 'bg-red-500 w-3/4' : 'bg-yellow-500 w-1/2'
                          }`}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No sector data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Hottest Option Chains */}
        <HottestChainsSection />

        {/* Key Insights */}
        <Card>
          <CardHeader>
            <CardTitle>Market Insights</CardTitle>
            <CardDescription>
              Key takeaways from today's options activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <PieChart className="h-5 w-5 text-blue-600" />
                  <span className="font-medium">Sector Rotation</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Technology and Healthcare showing increased options activity, 
                  suggesting potential sector rotation in progress.
                </p>
              </div>
              
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <span className="font-medium">Bullish Sentiment</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Call/Put ratio above 1.0 indicates overall bullish sentiment 
                  with increased call buying across major indices.
                </p>
              </div>
              
              <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Activity className="h-5 w-5 text-orange-600" />
                  <span className="font-medium">Volatility Spike</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Unusual options activity detected in Financial Services, 
                  potentially indicating upcoming earnings or events.
                </p>
              </div>
              
              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <BarChart3 className="h-5 w-5 text-purple-600" />
                  <span className="font-medium">Volume Analysis</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Above-average volume in Consumer Cyclical suggests 
                  institutional positioning ahead of earnings season.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
