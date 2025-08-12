
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, Search, TrendingUp, TrendingDown, Users, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CongressTrade {
  id: string;
  ticker: string;
  congress_member: string;
  transaction_type?: string;
  amount: string;
  transaction_date: string;
  disclosure_date: string;
  party: string;
}

interface TopTickerData {
  ticker: string;
  trade_count: number;
  total_value: number;
  avg_value: number;
}

interface FlowAlert {
  ticker?: string;
  underlying_symbol?: string;
  total_premium?: number;
  volume?: number;
  executed_at?: number;
  created_at?: number;
  expiry?: string;
  strike?: number;
  type?: string;
  filter_matches?: string[];
  source?: string;
}

export default function CongressPage() {
  const [trades, setTrades] = useState<CongressTrade[]>([]);
  const [topTickers, setTopTickers] = useState<TopTickerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTicker, setSearchTicker] = useState('');
  const [searchMember, setSearchMember] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  const [flowAlerts, setFlowAlerts] = useState<FlowAlert[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [alertPage, setAlertPage] = useState(0);
  const [alertHasMore, setAlertHasMore] = useState(true);
  const [minPremium, setMinPremium] = useState(25000);
  const [lookbackMinutes, setLookbackMinutes] = useState(360); // 6 hours
  const [alertsMeta, setAlertsMeta] = useState<any>(null);
  const [searchDebounceTimer, setSearchDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  const fetchFlowAlerts = async (page = 0, append = false) => {
    try {
      setAlertsLoading(true);
      const symbols = searchTicker ? encodeURIComponent(searchTicker.toUpperCase()) : '';
      const resp = await fetch(`/api/alerts/flow?symbols=${symbols}&limit=40&since_minutes=${lookbackMinutes}&min_premium=${minPremium}&page=${page}`);
      if (resp.ok) {
        const json = await resp.json();
        const data: FlowAlert[] = json.data || [];
        setAlertHasMore(data.length > 0);
        setFlowAlerts(prev => append ? [...prev, ...data] : data);
        setAlertsMeta(json.metadata || null);
      }
    } catch (e) {
      console.error('Failed to fetch flow alerts for congress page', e);
    } finally {
      setAlertsLoading(false);
    }
  };

  const fetchCongressData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTicker) params.append('ticker', searchTicker);
      if (searchMember) params.append('congress_member', searchMember);
      params.append('limit', '100');

      const [tradesResponse, topTickersResponse] = await Promise.all([
        fetch(`/api/congress?${params}`),
        fetch('/api/congress/top-traded?limit=20')
      ]);

      if (tradesResponse.ok) {
        const tradesData = await tradesResponse.json();
        setTrades(tradesData.data || []);
      }

      if (topTickersResponse.ok) {
        const topTickersData = await topTickersResponse.json();
        setTopTickers(topTickersData.data || []);
      }
  // Also fetch related flow alerts
  fetchFlowAlerts(0, false);
    } catch (error) {
      console.error('Error fetching congress data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCongressData();
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchCongressData, 5 * 60 * 1000); // 5 minutes
      setRefreshInterval(interval);
    } else {
      if (refreshInterval) {
        clearInterval(refreshInterval);
        setRefreshInterval(null);
      }
    }

    return () => {
      if (refreshInterval) clearInterval(refreshInterval);
    };
  }, [autoRefresh]);

  const handleSearch = () => {
    // Debounce to avoid multiple rapid requests
    if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
    const t = setTimeout(() => {
      fetchCongressData();
    }, 400);
    setSearchDebounceTimer(t);
  };

  const getTransactionTypeColor = (type?: string | null) => {
    const normalizedType = type?.toLowerCase() || '';
    return normalizedType.includes('purchase') || normalizedType.includes('buy')
      ? 'bg-green-100 text-green-800 border-green-200'
      : 'bg-red-100 text-red-800 border-red-200';
  };

  const formatAmount = (amount: string) => {
    const ranges = amount.split(' - ');
    if (ranges.length === 2) {
      return `$${ranges[0]} - $${ranges[1]}`;
    }
    return amount;
  };

  return (
    <div className="flex-1 space-y-6 p-8 overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Congress Trading</h2>
          <p className="text-muted-foreground">
            Track congressional stock trades and insider activity
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={cn(
              autoRefresh && "bg-green-50 border-green-200 text-green-700"
            )}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Auto Refresh {autoRefresh ? 'On' : 'Off'}
          </Button>
          <Button onClick={fetchCongressData} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Search Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <Input
                placeholder="Search by ticker symbol..."
                value={searchTicker}
                onChange={(e) => setSearchTicker(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div className="flex-1">
              <Input
                placeholder="Search by congress member..."
                value={searchMember}
                onChange={(e) => setSearchMember(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch}>
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

    <Tabs defaultValue="recent-trades" className="space-y-4">
        <TabsList>
          <TabsTrigger value="recent-trades">Recent Trades</TabsTrigger>
          <TabsTrigger value="top-tickers">Top Traded Tickers</TabsTrigger>
          <TabsTrigger value="flow-alerts">Related Flow Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="recent-trades" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Congressional Trades</CardTitle>
              <CardDescription>
                Latest stock transactions by congress members
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {loading ? (
                  <div className="text-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-4" />
                    <p>Loading congressional trades...</p>
                  </div>
                ) : trades.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No congressional trades found.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {trades.map((trade, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <Badge variant="outline" className="font-mono font-semibold">
                            {trade.ticker}
                          </Badge>
                          <div>
                            <p className="font-medium">{trade.congress_member}</p>
                            <p className="text-sm text-muted-foreground">
                              {trade.party} • {new Date(trade.transaction_date).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className={getTransactionTypeColor(trade.transaction_type)}>
                            {trade.transaction_type}
                          </Badge>
                          <p className="text-sm font-medium mt-1">
                            {formatAmount(trade.amount)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="top-tickers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Most Traded Tickers</CardTitle>
              <CardDescription>
                Stocks with highest congressional trading activity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {loading ? (
                  <div className="text-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-4" />
                    <p>Loading top traded tickers...</p>
                  </div>
                ) : topTickers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No data available for top traded tickers.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {topTickers.map((ticker, index) => (
                      <Card key={ticker.ticker}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <Badge variant="outline" className="font-mono font-semibold">
                              #{index + 1} {ticker.ticker}
                            </Badge>
                            <Users className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="mt-3 space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Trades:</span>
                              <span className="font-medium">{ticker.trade_count}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Total Value:</span>
                              <span className="font-medium">${ticker.total_value?.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Avg Value:</span>
                              <span className="font-medium">${ticker.avg_value?.toLocaleString()}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="flow-alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Related Options Flow Alerts</CardTitle>
              <CardDescription>
                High-premium options activity (custom lookback){searchTicker && ` for ${searchTicker.toUpperCase()}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Controls */}
                <div className="flex flex-wrap gap-4 items-end">
                  <div className="flex flex-col">
                    <label className="text-xs font-medium mb-1">Min Premium ($)</label>
                    <input
                      type="number"
                      className="border rounded px-2 py-1 text-sm w-32"
                      value={minPremium}
                      min={0}
                      step={5000}
                      aria-label="Minimum premium filter"
                      onChange={(e) => setMinPremium(parseInt(e.target.value || '0'))}
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-xs font-medium mb-1">Lookback (min)</label>
                    <input
                      type="number"
                      className="border rounded px-2 py-1 text-sm w-32"
                      value={lookbackMinutes}
                      min={15}
                      max={1440}
                      step={15}
                      aria-label="Lookback minutes filter"
                      onChange={(e) => setLookbackMinutes(parseInt(e.target.value || '0'))}
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={alertsLoading}
                    onClick={() => { setAlertPage(0); fetchFlowAlerts(0, false); }}
                  >
                    {alertsLoading ? 'Updating...' : 'Apply'}
                  </Button>
                  {alertsMeta && (
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <div>
                        Updated: {new Date(alertsMeta.timestamp).toLocaleTimeString()} {alertsMeta.cache && '(cache)'}
                      </div>
                      <div>
                        Count: {alertsMeta.total_alerts} • Pool: {alertsMeta.pool_considered}
                      </div>
                      <div>
                        Filters: ≥ ${minPremium.toLocaleString()} • {Math.round(lookbackMinutes/60*10)/10}h
                      </div>
                    </div>
                  )}
                </div>
                {alertsLoading && flowAlerts.length === 0 ? (
                  <div className="text-center py-8">
                    <Activity className="h-6 w-6 animate-spin mx-auto mb-4" />
                    <p>Loading flow alerts...</p>
                  </div>
                ) : flowAlerts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No flow alerts found for criteria.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {flowAlerts.map((a, idx) => {
                      const sym = (a.underlying_symbol || a.ticker || '').toUpperCase();
                      const ts = new Date((a.executed_at || a.created_at || 0));
                      return (
                        <div key={idx} className="p-3 border rounded-lg flex justify-between items-center">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="font-mono">{sym}</Badge>
                              {a.type && a.strike && a.expiry && (
                                <span className="text-sm">{a.type.toUpperCase()} {a.strike} {a.expiry}</span>
                              )}
                              {a.filter_matches?.map(f => (
                                <Badge key={f} variant="secondary" className="text-xxs">{f}</Badge>
                              ))}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Premium ${(a.total_premium || 0).toLocaleString()} • Vol {a.volume} • {ts.toLocaleTimeString()}
                            </div>
                          </div>
                          <div className="text-right text-xs text-muted-foreground">
                            src: {a.source || 'api'}
                          </div>
                        </div>
                      );
                    })}
                    {alertHasMore && (
                      <div className="flex justify-center pt-2">
                        <Button variant="outline" size="sm" disabled={alertsLoading} onClick={() => { const next = alertPage + 1; setAlertPage(next); fetchFlowAlerts(next, true); }}>
                          {alertsLoading ? 'Loading...' : 'Load More'}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
