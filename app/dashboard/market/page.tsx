
'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/dashboard/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatPercent, formatVolume } from '@/lib/utils';
import { TrendingUp, TrendingDown, PieChart, Activity, DollarSign, BarChart3 } from 'lucide-react';

interface SectorData {
  sector: string;
  net_call_premium: number;
  net_put_premium: number;
  net_volume: number;
  performance: number;
}

interface MarketMetrics {
  overall_sentiment: 'bullish' | 'bearish' | 'neutral';
  call_put_ratio: number;
  total_premium: number;
  unusual_activity_count: number;
  top_sectors: SectorData[];
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

export default function MarketPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [marketData, setMarketData] = useState<MarketMetrics | null>(null);
  const [selectedSector, setSelectedSector] = useState<string>('all');

  const fetchMarketData = async () => {
    setRefreshing(true);
    try {
      // Mock data for demonstration
      const mockSectorData: SectorData[] = SECTORS.map(sector => ({
        sector,
        net_call_premium: Math.random() * 2000000 - 1000000,
        net_put_premium: Math.random() * 1500000 - 750000,
        net_volume: Math.floor(Math.random() * 100000),
        performance: (Math.random() - 0.5) * 10,
      }));

      const mockData: MarketMetrics = {
        overall_sentiment: Math.random() > 0.6 ? 'bullish' : Math.random() > 0.3 ? 'bearish' : 'neutral',
        call_put_ratio: 0.8 + Math.random() * 0.8,
        total_premium: Math.random() * 50000000,
        unusual_activity_count: Math.floor(Math.random() * 200),
        top_sectors: mockSectorData.sort((a, b) => Math.abs(b.net_call_premium) - Math.abs(a.net_call_premium)).slice(0, 6),
      };
      
      setMarketData(mockData);
    } catch (error) {
      console.error('Failed to fetch market data:', error);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarketData();
  }, []);

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'bullish':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'bearish':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    }
  };

  const getSentimentIcon = (sentiment: string) => {
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
        onRefresh={fetchMarketData}
        refreshing={refreshing}
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
                {marketData.overall_sentiment.toUpperCase()}
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
              <div className="text-2xl font-bold">{marketData.call_put_ratio.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                {marketData.call_put_ratio > 1 ? 'Call-heavy' : 'Put-heavy'} market
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
                {formatCurrency(marketData.total_premium / 1000000)}M
              </div>
              <p className="text-xs text-muted-foreground">
                Total options premium today
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unusual Activity</CardTitle>
              <Activity className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {marketData.unusual_activity_count}
              </div>
              <p className="text-xs text-muted-foreground">
                Alerts triggered today
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Sector Filter */}
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Sector:</span>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedSector === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedSector('all')}
            >
              All Sectors
            </Button>
            {SECTORS.slice(0, 6).map(sector => (
              <Button
                key={sector}
                variant={selectedSector === sector ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedSector(sector)}
              >
                {sector}
              </Button>
            ))}
          </div>
        </div>

        {/* Sector Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Sector Analysis</CardTitle>
            <CardDescription>
              Options flow and performance by sector
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {marketData.top_sectors
                .filter(sector => selectedSector === 'all' || sector.sector === selectedSector)
                .map(sector => {
                  const netPremium = sector.net_call_premium + sector.net_put_premium;
                  const isPositive = netPremium >= 0;
                  const performancePositive = sector.performance >= 0;
                  
                  return (
                    <div key={sector.sector} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                        <div>
                          <h4 className="font-medium">{sector.sector}</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Volume: {formatVolume(sector.net_volume)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-6">
                        <div className="text-right">
                          <p className="text-sm text-gray-500">Net Premium</p>
                          <div className={`flex items-center space-x-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                            {isPositive ? (
                              <TrendingUp className="h-4 w-4" />
                            ) : (
                              <TrendingDown className="h-4 w-4" />
                            )}
                            <span className="font-semibold">
                              {formatCurrency(Math.abs(netPremium))}
                            </span>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-sm text-gray-500">Calls</p>
                          <p className={`font-semibold ${sector.net_call_premium >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(Math.abs(sector.net_call_premium))}
                          </p>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-sm text-gray-500">Puts</p>
                          <p className={`font-semibold ${sector.net_put_premium >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {formatCurrency(Math.abs(sector.net_put_premium))}
                          </p>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-sm text-gray-500">Performance</p>
                          <div className={`flex items-center space-x-1 ${performancePositive ? 'text-green-600' : 'text-red-600'}`}>
                            {performancePositive ? (
                              <TrendingUp className="h-4 w-4" />
                            ) : (
                              <TrendingDown className="h-4 w-4" />
                            )}
                            <span className="font-semibold">
                              {formatPercent(Math.abs(sector.performance))}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>

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
