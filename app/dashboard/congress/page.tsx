
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, Search, TrendingUp, TrendingDown, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CongressTrade {
  id: string;
  ticker: string;
  congress_member: string;
  transaction_type: string;
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

export default function CongressPage() {
  const [trades, setTrades] = useState<CongressTrade[]>([]);
  const [topTickers, setTopTickers] = useState<TopTickerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTicker, setSearchTicker] = useState('');
  const [searchMember, setSearchMember] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

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
    fetchCongressData();
  };

  const getTransactionTypeColor = (type: string) => {
    return type.toLowerCase().includes('purchase') || type.toLowerCase().includes('buy')
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
      </Tabs>
    </div>
  );
}
