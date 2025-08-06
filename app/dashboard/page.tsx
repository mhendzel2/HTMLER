
'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/dashboard/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  DollarSign, 
  PieChart,
  BarChart3,
  Timer,
  RefreshCw
} from 'lucide-react';
import { formatCurrency, formatPercent, formatVolume, getMarketStatus } from '@/lib/utils';

interface MarketMetrics {
  marketTide: {
    netCallPremium: number;
    netPutPremium: number;
    netVolume: number;
  };
  earnings: {
    todayCount: number;
    upcomingCount: number;
  };
  options: {
    unusualActivity: number;
    totalVolume: number;
  };
}

export default function DashboardPage() {
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5);
  const [metrics, setMetrics] = useState<MarketMetrics>({
    marketTide: {
      netCallPremium: 0,
      netPutPremium: 0,
      netVolume: 0,
    },
    earnings: {
      todayCount: 0,
      upcomingCount: 0,
    },
    options: {
      unusualActivity: 0,
      totalVolume: 0,
    },
  });

  const marketStatus = getMarketStatus();

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // Simulate API calls - replace with actual API calls
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock data - replace with actual API data
      setMetrics({
        marketTide: {
          netCallPremium: Math.random() * 1000000 - 500000,
          netPutPremium: Math.random() * 1000000 - 500000,
          netVolume: Math.floor(Math.random() * 100000),
        },
        earnings: {
          todayCount: Math.floor(Math.random() * 50),
          upcomingCount: Math.floor(Math.random() * 100),
        },
        options: {
          unusualActivity: Math.floor(Math.random() * 500),
          totalVolume: Math.floor(Math.random() * 10000000),
        },
      });
    } catch (error) {
      console.error('Failed to refresh data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    handleRefresh();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(handleRefresh, refreshInterval * 60 * 1000);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  const getMarketStatusColor = () => {
    switch (marketStatus) {
      case 'open':
        return 'text-green-600 bg-green-100';
      case 'closed':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-yellow-600 bg-yellow-100';
    }
  };

  const getMarketStatusText = () => {
    switch (marketStatus) {
      case 'open':
        return 'Market Open';
      case 'closed':
        return 'Market Closed';
      case 'pre-market':
        return 'Pre-Market';
      case 'after-hours':
        return 'After Hours';
    }
  };

  return (
    <div className="flex-1 overflow-auto">
      <Header 
        title="Dashboard"
        description="Market overview and key analytics"
        onRefresh={handleRefresh}
        refreshing={refreshing}
      />
      
      <div className="p-6 space-y-6">
        {/* Market Status and Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${getMarketStatusColor()}`}>
              {getMarketStatusText()}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Last updated: {new Date().toLocaleTimeString()}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Timer className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">Auto-refresh:</span>
              <Button
                variant={autoRefresh ? "default" : "outline"}
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
              >
                {autoRefresh ? 'On' : 'Off'}
              </Button>
              {autoRefresh && (
                <select
                  value={refreshInterval}
                  onChange={(e) => setRefreshInterval(Number(e.target.value))}
                  className="text-sm border rounded px-2 py-1 bg-white dark:bg-gray-800"
                >
                  <option value={1}>1 min</option>
                  <option value={5}>5 min</option>
                  <option value={15}>15 min</option>
                  <option value={30}>30 min</option>
                </select>
              )}
            </div>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Market Tide</CardTitle>
              <Activity className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatVolume(metrics.marketTide.netVolume)}
              </div>
              <p className="text-xs text-muted-foreground">
                Net volume today
              </p>
              <div className="flex items-center space-x-2 mt-2">
                <span className="text-xs text-green-600">
                  Calls: {formatCurrency(metrics.marketTide.netCallPremium)}
                </span>
                <span className="text-xs text-red-600">
                  Puts: {formatCurrency(metrics.marketTide.netPutPremium)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Earnings Today</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.earnings.todayCount}</div>
              <p className="text-xs text-muted-foreground">
                Companies reporting
              </p>
              <p className="text-xs text-blue-600 mt-1">
                {metrics.earnings.upcomingCount} upcoming this week
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unusual Activity</CardTitle>
              <BarChart3 className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.options.unusualActivity}</div>
              <p className="text-xs text-muted-foreground">
                Unusual options alerts
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
              <PieChart className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatVolume(metrics.options.totalVolume)}
              </div>
              <p className="text-xs text-muted-foreground">
                Options volume today
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Market Analysis</CardTitle>
              <CardDescription>
                View comprehensive market trends and sector analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" asChild>
                <a href="/dashboard/market">View Market Overview</a>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Earnings Calendar</CardTitle>
              <CardDescription>
                Track upcoming earnings and analyze historical performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" asChild>
                <a href="/dashboard/earnings">View Earnings</a>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Options Monitor</CardTitle>
              <CardDescription>
                Monitor unusual options activity and manage watchlists
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" asChild>
                <a href="/dashboard/options">View Options</a>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Latest updates from your watchlists and alerts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center space-x-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <Activity className="h-5 w-5 text-blue-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Unusual options activity detected</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    High volume calls on AAPL - 5 minutes ago
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Earnings beat detected</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    MSFT reported strong Q3 results - 2 hours ago
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <PieChart className="h-5 w-5 text-orange-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Market sentiment shift</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Technology sector showing increased bullish flow - 4 hours ago
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
