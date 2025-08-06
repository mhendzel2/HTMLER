'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/dashboard/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AIGuidancePanel } from '@/components/ai-guidance-panel';
import { formatCurrency, formatPercent, formatDate } from '@/lib/utils';
import { FlowSentiment } from '@/lib/types';
import { enhancedFlowAnalysis } from '@/lib/enhanced-flow-analysis';
import { TrendingUp, TrendingDown, Calendar, Clock, Filter, RefreshCw, AlertTriangle, Activity } from 'lucide-react';

interface EarningsItem {
  symbol: string;
  full_name: string;
  report_date: string;
  report_time: string;
  expected_move: string;
  expected_move_perc: string;
  street_mean_est: string;
  actual_eps?: string;
  marketcap: string;
  has_options: boolean;
  is_s_p_500: boolean;
  sector: string;
  // Flow analysis data
  flow_sentiment?: FlowSentiment;
  flow_loading?: boolean;
  // Additional calculated fields
  put_call_ratio?: number;
  volume?: number;
  liquidity_score?: number;
}

interface FilterCriteria {
  putCallRatioMin: number;
  putCallRatioMax: number;
  marketCapMin: number;
  liquidityMin: number;
  hasOptions: boolean;
  isSpx: boolean | null;
  sector: string;
  timeFrame: number; // days
}

export default function EarningsPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [earningsData, setEarningsData] = useState<EarningsItem[]>([]);
  const [displayData, setDisplayData] = useState<EarningsItem[]>([]);
  const [activeTab, setActiveTab] = useState<'today' | 'upcoming' | 'screener'>('today');
  const [filters, setFilters] = useState<FilterCriteria>({
    putCallRatioMin: 0.8,
    putCallRatioMax: 1.3,
    marketCapMin: 1000000000, // 1B
    liquidityMin: 200,
    hasOptions: true,
    isSpx: null,
    sector: 'all',
    timeFrame: 14 // next 2 weeks
  });

  const fetchEarningsData = async () => {
    setRefreshing(true);
    try {
      // Generate next 7 days of dates (trading days)
      const dates: string[] = [];
      const today = new Date();
      
      for (let i = 0; i < 10; i++) { // Get 10 days to ensure we have 7 trading days
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        
        // Skip weekends (Saturday = 6, Sunday = 0)
        if (date.getDay() !== 0 && date.getDay() !== 6) {
          dates.push(date.toISOString().split('T')[0]); // Format: YYYY-MM-DD
        }
        
        if (dates.length >= 7) break; // Stop when we have 7 trading days
      }

      const combinedData: EarningsItem[] = [];

      // Fetch earnings for each date (both premarket and afterhours)
      for (const date of dates) {
        try {
          const [afterHoursResponse, preMarketResponse] = await Promise.all([
            fetch(`/api/earnings?type=afterhours&date=${date}&limit=100`),
            fetch(`/api/earnings?type=premarket&date=${date}&limit=100`)
          ]);

          // Process afterhours earnings
          if (afterHoursResponse.ok) {
            const afterHours = await afterHoursResponse.json();
            if (afterHours.data) {
              combinedData.push(...afterHours.data.map((item: any) => ({
                symbol: item.symbol,
                full_name: item.full_name,
                report_date: item.report_date,
                report_time: 'aftermarket',
                expected_move: item.expected_move || '0',
                expected_move_perc: item.expected_move_perc || '0',
                street_mean_est: item.street_mean_est || '0',
                actual_eps: item.actual_eps,
                marketcap: item.marketcap || '0',
                has_options: item.has_options || false,
                is_s_p_500: item.is_s_p_500 || false,
                sector: item.sector || 'Unknown',
                flow_loading: true // Initialize flow analysis loading state
              })));
            }
          }

          // Process premarket earnings
          if (preMarketResponse.ok) {
            const preMarket = await preMarketResponse.json();
            if (preMarket.data) {
              combinedData.push(...preMarket.data.map((item: any) => ({
                symbol: item.symbol,
                full_name: item.full_name,
                report_date: item.report_date,
                report_time: 'premarket',
                expected_move: item.expected_move || '0',
                expected_move_perc: item.expected_move_perc || '0',
                street_mean_est: item.street_mean_est || '0',
                actual_eps: item.actual_eps,
                marketcap: item.marketcap || '0',
                has_options: item.has_options || false,
                is_s_p_500: item.is_s_p_500 || false,
                sector: item.sector || 'Unknown',
                flow_loading: true // Initialize flow analysis loading state
              })));
            }
          }
        } catch (error) {
          console.error(`Failed to fetch earnings for ${date}:`, error);
        }
      }

      // Remove duplicates based on ticker and report_date
      const uniqueData = combinedData.reduce((acc: EarningsItem[], current) => {
        const exists = acc.find(item => 
          item.symbol === current.symbol && 
          item.report_date === current.report_date
        );
        if (!exists) {
          acc.push(current);
        }
        return acc;
      }, []);

      // Sort by report_date
      uniqueData.sort((a, b) => new Date(a.report_date).getTime() - new Date(b.report_date).getTime());
      
      setEarningsData(uniqueData);
      setDisplayData(uniqueData);

      // Fetch flow analysis for tickers with options
      fetchFlowAnalysis(uniqueData.filter(item => item.has_options));

    } catch (error) {
      console.error('Failed to fetch earnings data:', error);
      setEarningsData([]);
      setDisplayData([]);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  const fetchFlowAnalysis = async (items: EarningsItem[]) => {
    if (items.length === 0) return;

    try {
      console.log('🚀 Starting FULL WebSocket-based institutional flow analysis with authenticated access!');
      
      const tickers = [...new Set(items.map(item => item.symbol))];
      console.log(`� Real-time institutional monitoring for ${tickers.length} earnings tickers with full access:`, tickers.slice(0, 5));
      
      // Start FULL real-time WebSocket monitoring with authenticated access
      await enhancedFlowAnalysis.startEarningsFlowMonitoring(tickers);
      
      // Initial comprehensive flow analysis
      const initialAnalysis = enhancedFlowAnalysis.getFlowAnalysisForTickers(tickers);
      
      // Update with initial data
      setEarningsData(prev => prev.map(item => ({
        ...item,
        flow_sentiment: initialAnalysis[item.symbol] || undefined,
        flow_loading: false
      })));
      
      setDisplayData(prev => prev.map(item => ({
        ...item,
        flow_sentiment: initialAnalysis[item.symbol] || undefined,
        flow_loading: false
      })));

      // Set up frequent real-time updates (every 5 seconds) since we have full access
      const updateInterval = setInterval(() => {
        const currentAnalysis = enhancedFlowAnalysis.getFlowAnalysisForTickers(tickers);
        
        // Update earnings data with real-time sentiment
        setEarningsData(prev => prev.map(item => ({
          ...item,
          flow_sentiment: currentAnalysis[item.symbol] || item.flow_sentiment || undefined
        })));
        
        setDisplayData(prev => prev.map(item => ({
          ...item,
          flow_sentiment: currentAnalysis[item.symbol] || item.flow_sentiment || undefined
        })));
      }, 5000); // Update every 5 seconds with full WebSocket access
      
      // Clean up on unmount
      return () => {
        clearInterval(updateInterval);
        enhancedFlowAnalysis.stopEarningsFlowMonitoring();
      };
      
    } catch (error) {
      console.error('Failed to start enhanced flow analysis:', error);
      
      // Fallback to API if WebSocket fails
      console.log('Falling back to API-based flow analysis...');
      try {
        const limitedItems = items.slice(0, 10);
        const tickers = [...new Set(limitedItems.map(item => item.symbol))];
        const tickersParam = tickers.join(',');
        
        const response = await fetch(`/api/flow-analysis?tickers=${encodeURIComponent(tickersParam)}`);
        
        if (response.ok) {
          const { data: flowAnalyses } = await response.json();
          
          setEarningsData(prev => prev.map(item => ({
            ...item,
            flow_sentiment: flowAnalyses[item.symbol],
            flow_loading: false
          })));
          
          setDisplayData(prev => prev.map(item => ({
            ...item,
            flow_sentiment: flowAnalyses[item.symbol],
            flow_loading: false
          })));
        }
      } catch (fallbackError) {
        console.error('Fallback API also failed:', fallbackError);
      }
      
      // Clear loading states
      setEarningsData(prev => prev.map(item => ({ ...item, flow_loading: false })));
      setDisplayData(prev => prev.map(item => ({ ...item, flow_loading: false })));
    }
  };

  const updateDisplayData = (data: EarningsItem[], tab: string) => {
    let filtered = data;
    
    if (tab === 'screener') {
      // Apply screening filters
      filtered = data.filter(item => {
        // Market cap filter
        const marketCap = parseFloat(item.marketcap);
        if (marketCap < filters.marketCapMin) return false;

        // Options availability filter
        if (filters.hasOptions && !item.has_options) return false;

        // S&P 500 filter
        if (filters.isSpx !== null && item.is_s_p_500 !== filters.isSpx) return false;

        // Sector filter
        if (filters.sector !== 'all' && item.sector !== filters.sector) return false;

        // Date range filter (next X days)
        const reportDate = new Date(item.report_date);
        const today = new Date();
        const maxDate = new Date();
        maxDate.setDate(today.getDate() + filters.timeFrame);
        
        if (reportDate < today || reportDate > maxDate) return false;

        return true;
      });
    } else {
      // Apply tab-based filters
      const today = new Date();
      filtered = data.filter(item => {
        const reportDate = new Date(item.report_date);
        
        switch (tab) {
          case 'today':
            return reportDate.toDateString() === today.toDateString();
          case 'upcoming':
            return reportDate > today;
          default:
            return true;
        }
      });
    }

    setDisplayData(filtered);
  };

  useEffect(() => {
    fetchEarningsData();
  }, []);

  useEffect(() => {
    updateDisplayData(earningsData, activeTab);
  }, [activeTab, filters, earningsData]);

  const getReportTimeColor = (reportTime: string) => {
    return reportTime === 'premarket' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800';
  };

  const getMovementIcon = (actual?: string, estimate?: string) => {
    if (!actual || !estimate) return null;
    const actualNum = parseFloat(actual);
    const estimateNum = parseFloat(estimate);
    return actualNum > estimateNum ? (
      <TrendingUp className="h-4 w-4 text-green-600" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-600" />
    );
  };

  const handleFilterChange = (key: keyof FilterCriteria, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="flex-1 overflow-auto">
        <Header title="Earnings Analysis" description="Track earnings announcements and performance" />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <Header 
        title="Earnings Analysis"
        description="Advanced earnings screening with real-time data"
        onRefresh={fetchEarningsData}
        refreshing={refreshing}
      />
      
      <div className="p-6 space-y-6">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="today">Today ({earningsData.filter(e => new Date(e.report_date).toDateString() === new Date().toDateString()).length})</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming ({earningsData.filter(e => new Date(e.report_date) > new Date()).length})</TabsTrigger>
            <TabsTrigger value="screener">Screener ({displayData.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="today" className="space-y-4">
            <EarningsGrid data={displayData} />
          </TabsContent>

          <TabsContent value="upcoming" className="space-y-4">
            <EarningsGrid data={displayData} />
          </TabsContent>

          <TabsContent value="screener" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Earnings Screener
                </CardTitle>
                <CardDescription>
                  Filter earnings announcements by market cap, options availability, and more
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Min Market Cap</Label>
                    <Select value={filters.marketCapMin.toString()} onValueChange={(value) => handleFilterChange('marketCapMin', parseInt(value))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="100000000">$100M</SelectItem>
                        <SelectItem value="1000000000">$1B</SelectItem>
                        <SelectItem value="10000000000">$10B</SelectItem>
                        <SelectItem value="50000000000">$50B</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Time Frame</Label>
                    <Select value={filters.timeFrame.toString()} onValueChange={(value) => handleFilterChange('timeFrame', parseInt(value))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">Next Week</SelectItem>
                        <SelectItem value="14">Next 2 Weeks</SelectItem>
                        <SelectItem value="30">Next Month</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Sector</Label>
                    <Select value={filters.sector} onValueChange={(value) => handleFilterChange('sector', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Sectors</SelectItem>
                        <SelectItem value="Technology">Technology</SelectItem>
                        <SelectItem value="Healthcare">Healthcare</SelectItem>
                        <SelectItem value="Financial Services">Financial Services</SelectItem>
                        <SelectItem value="Consumer Cyclical">Consumer Cyclical</SelectItem>
                        <SelectItem value="Consumer Defensive">Consumer Defensive</SelectItem>
                        <SelectItem value="Energy">Energy</SelectItem>
                        <SelectItem value="Industrials">Industrials</SelectItem>
                        <SelectItem value="Communication Services">Communication Services</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Options</Label>
                    <Select value={filters.hasOptions.toString()} onValueChange={(value) => handleFilterChange('hasOptions', value === 'true')}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="false">All Stocks</SelectItem>
                        <SelectItem value="true">Options Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
            <EarningsGrid data={displayData} />
          </TabsContent>
        </Tabs>
        
        {/* AI Guidance Panel */}
        <AIGuidancePanel 
          earningsData={displayData}
          className="mt-6"
        />
      </div>
    </div>
  );
}

function EarningsGrid({ data }: { data: EarningsItem[] }) {
  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <div className="text-center">
            <Calendar className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500">No earnings data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      {data.map((item, index) => (
        <Card key={`${item.symbol}-${item.report_date}-${index}`} className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-lg font-bold">{item.symbol}</span>
                    {item.is_s_p_500 && <Badge variant="secondary">S&P 500</Badge>}
                    {item.has_options && <Badge variant="outline">Options</Badge>}
                  </div>
                  <CardTitle className="text-lg">{item.symbol}</CardTitle>
                  <CardDescription className="text-sm">
                    {item.full_name}
                  </CardDescription>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center space-x-2 mb-1">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <Badge className={`text-xs ${item.report_time === 'premarket' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                    {item.report_time}
                  </Badge>
                </div>
                <p className="text-sm font-medium">{formatDate(item.report_date)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-600 dark:text-gray-400 mb-1">Expected Move</p>
                <p className="font-semibold">
                  {item.expected_move ? `$${parseFloat(item.expected_move).toFixed(2)}` : 'N/A'}
                </p>
                <p className="text-xs text-gray-500">
                  {item.expected_move_perc ? `${(parseFloat(item.expected_move_perc) * 100).toFixed(2)}%` : 'N/A'}
                </p>
              </div>

              <div>
                <p className="text-gray-600 dark:text-gray-400 mb-1">Market Cap</p>
                <p className="font-semibold">
                  {item.marketcap ? formatCurrency(parseFloat(item.marketcap)) : 'N/A'}
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <div>
                  <p className="text-gray-600 dark:text-gray-400 mb-1">EPS Estimate</p>
                  <p className="font-semibold">
                    {item.street_mean_est ? `$${parseFloat(item.street_mean_est).toFixed(2)}` : 'N/A'}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-gray-600 dark:text-gray-400 mb-1">Sector</p>
                <p className="text-xs font-medium">{item.sector}</p>
              </div>
            </div>

            {/* Flow Analysis Section */}
            {item.has_options && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <Activity className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Flow Sentiment</span>
                  </div>
                  {item.flow_loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  ) : item.flow_sentiment && (
                    <div className="flex items-center space-x-2">
                      <Badge 
                        variant={
                          item.flow_sentiment.overall_sentiment === 'bullish' ? 'default' :
                          item.flow_sentiment.overall_sentiment === 'bearish' ? 'destructive' : 'secondary'
                        }
                        className="text-xs"
                      >
                        {item.flow_sentiment.overall_sentiment.toUpperCase()}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {item.flow_sentiment.confidence_score}% confidence
                      </span>
                    </div>
                  )}
                </div>
                
                {item.flow_sentiment && !item.flow_loading && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                      <p className="text-gray-600 dark:text-gray-400 mb-1">Premium Ratio</p>
                      <p className="font-medium">
                        {item.flow_sentiment.metrics.net_premium_ratio.toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500">C:P</p>
                    </div>
                    
                    <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                      <p className="text-gray-600 dark:text-gray-400 mb-1">Volume Ratio</p>
                      <p className="font-medium">
                        {item.flow_sentiment.metrics.volume_ratio.toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500">C:P</p>
                    </div>
                    
                    <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                      <p className="text-gray-600 dark:text-gray-400 mb-1">Delta Flow</p>
                      <p className="font-medium text-sm">
                        {item.flow_sentiment.metrics.delta_flow >= 0 ? '+' : ''}
                        ${(item.flow_sentiment.metrics.delta_flow / 1000000).toFixed(1)}M
                      </p>
                    </div>
                    
                    <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                      <p className="text-gray-600 dark:text-gray-400 mb-1">GEX</p>
                      <p className="font-medium text-sm">
                        {item.flow_sentiment.metrics.gamma_exposure >= 0 ? '+' : ''}
                        ${(Math.abs(item.flow_sentiment.metrics.gamma_exposure) / 1000000).toFixed(1)}M
                      </p>
                    </div>
                  </div>
                )}

                {item.flow_sentiment && !item.flow_loading && (
                  <div className="mt-3">
                    {item.flow_sentiment.breakdown.bullish_signals.length > 0 && (
                      <div className="mb-2">
                        <div className="flex items-center space-x-1 mb-1">
                          <TrendingUp className="h-3 w-3 text-green-600" />
                          <span className="text-xs font-medium text-green-600">Bullish Signals:</span>
                        </div>
                        <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1 ml-4">
                          {item.flow_sentiment.breakdown.bullish_signals.slice(0, 2).map((signal, idx) => (
                            <li key={idx} className="list-disc">• {signal}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {item.flow_sentiment.breakdown.bearish_signals.length > 0 && (
                      <div className="mb-2">
                        <div className="flex items-center space-x-1 mb-1">
                          <TrendingDown className="h-3 w-3 text-red-600" />
                          <span className="text-xs font-medium text-red-600">Bearish Signals:</span>
                        </div>
                        <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1 ml-4">
                          {item.flow_sentiment.breakdown.bearish_signals.slice(0, 2).map((signal, idx) => (
                            <li key={idx} className="list-disc">• {signal}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {item.flow_sentiment.breakdown.risk_factors.length > 0 && (
                      <div>
                        <div className="flex items-center space-x-1 mb-1">
                          <AlertTriangle className="h-3 w-3 text-orange-600" />
                          <span className="text-xs font-medium text-orange-600">Risk Factors:</span>
                        </div>
                        <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1 ml-4">
                          {item.flow_sentiment.breakdown.risk_factors.slice(0, 1).map((factor, idx) => (
                            <li key={idx} className="list-disc">• {factor}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
