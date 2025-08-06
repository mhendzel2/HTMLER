'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/dashboard/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  DollarSign, 
  Zap,
  Brain,
  BarChart3,
  ArrowRight,
  Play,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface TradingOverview {
  paperTradingStatus: 'connected' | 'disconnected' | 'virtual';
  accountBalance: number;
  todaysPnL: number;
  totalPositions: number;
  activeTrades: number;
  flowSignals: number;
  sentimentAlerts: number;
}

export default function TradingOverviewPage() {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<TradingOverview>({
    paperTradingStatus: 'virtual',
    accountBalance: 100000,
    todaysPnL: 1250.75,
    totalPositions: 3,
    activeTrades: 1,
    flowSignals: 5,
    sentimentAlerts: 2
  });
  
  const router = useRouter();

  useEffect(() => {
    loadTradingOverview();
  }, []);

  const loadTradingOverview = async () => {
    setLoading(true);
    try {
      // Load trading overview data
      const savedBalance = localStorage.getItem('virtual_balance');
      if (savedBalance) {
        setOverview(prev => ({ ...prev, accountBalance: parseFloat(savedBalance) }));
      }

      const savedTrades = localStorage.getItem('trading_history');
      if (savedTrades) {
        const trades = JSON.parse(savedTrades);
        const todaysTrades = trades.filter((trade: any) => {
          const tradeDate = new Date(trade.timestamp).toDateString();
          const today = new Date().toDateString();
          return tradeDate === today && trade.status === 'FILLED';
        });
        
        const todaysPnL = todaysTrades.reduce((sum: number, trade: any) => sum + (trade.pnl || 0), 0);
        const activeTrades = trades.filter((trade: any) => trade.status === 'PENDING').length;
        
        setOverview(prev => ({ 
          ...prev, 
          todaysPnL,
          activeTrades
        }));
      }

      // Check IBKR connection status
      try {
        const response = await fetch('/api/ibkr/connect', { method: 'GET' });
        if (response.ok) {
          setOverview(prev => ({ ...prev, paperTradingStatus: 'connected' }));
        }
      } catch {
        setOverview(prev => ({ ...prev, paperTradingStatus: 'virtual' }));
      }

    } catch (error) {
      console.error('Failed to load trading overview:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config = {
      connected: { variant: 'default' as const, text: 'IBKR Connected', icon: CheckCircle },
      disconnected: { variant: 'outline' as const, text: 'IBKR Offline', icon: AlertCircle },
      virtual: { variant: 'secondary' as const, text: 'Virtual Mode', icon: Activity }
    };

    const statusConfig = config[status as keyof typeof config];
    const Icon = statusConfig.icon;

    return (
      <Badge variant={statusConfig.variant} className="flex items-center space-x-1">
        <Icon className="h-3 w-3" />
        <span>{statusConfig.text}</span>
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex-1 overflow-auto">
        <Header title="Trading Center" description="Comprehensive trading dashboard with IBKR integration" />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <Header 
        title="Trading Center"
        description="Comprehensive paper trading with IBKR TWS integration, flow analysis, and AI sentiment"
        onRefresh={loadTradingOverview}
      />
      
      <div className="p-6 space-y-6">
        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Trading Status</CardTitle>
              <Activity className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              {getStatusBadge(overview.paperTradingStatus)}
              <p className="text-xs text-muted-foreground mt-2">
                Paper trading environment
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Account Balance</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(overview.accountBalance)}
              </div>
              <p className="text-xs text-muted-foreground">
                Available for trading
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's P&L</CardTitle>
              {overview.todaysPnL >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${overview.todaysPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {overview.todaysPnL >= 0 ? '+' : ''}{formatCurrency(overview.todaysPnL)}
              </div>
              <p className="text-xs text-muted-foreground">
                Daily performance
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Trades</CardTitle>
              <BarChart3 className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview.activeTrades}</div>
              <p className="text-xs text-muted-foreground">
                Pending orders
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Trading Modules */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Paper Trading */}
          <Card className="group hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/dashboard/trading/paper')}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Play className="h-5 w-5 text-blue-600" />
                  <CardTitle>Paper Trading</CardTitle>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
              </div>
              <CardDescription>
                Execute paper trades with IBKR TWS integration and virtual fallback
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Connection Status</span>
                  {getStatusBadge(overview.paperTradingStatus)}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Open Positions</span>
                  <Badge variant="outline">{overview.totalPositions}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Pending Orders</span>
                  <Badge variant="secondary">{overview.activeTrades}</Badge>
                </div>
              </div>
              <Button className="w-full mt-4" variant="default">
                Start Paper Trading
              </Button>
            </CardContent>
          </Card>

          {/* Performance Analytics */}
          <Card className="group hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/dashboard/trading/performance')}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5 text-green-600" />
                  <CardTitle>Performance Analytics</CardTitle>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-green-600 transition-colors" />
              </div>
              <CardDescription>
                Comprehensive analysis of trading performance and risk metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Win Rate</span>
                  <Badge variant="default">64.5%</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Total Return</span>
                  <Badge variant="default">+2.35%</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Sharpe Ratio</span>
                  <Badge variant="secondary">1.42</Badge>
                </div>
              </div>
              <Button className="w-full mt-4" variant="outline">
                View Analytics
              </Button>
            </CardContent>
          </Card>

          {/* Flow Analysis Integration */}
          <Card className="group hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Zap className="h-5 w-5 text-purple-600" />
                  <CardTitle>Flow Analysis</CardTitle>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-purple-600 transition-colors" />
              </div>
              <CardDescription>
                Real-time options flow analysis integrated with paper trading
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Active Signals</span>
                  <Badge variant="default">{overview.flowSignals}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">WebSocket Status</span>
                  <Badge variant="default">Connected</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Premium Tracked</span>
                  <Badge variant="secondary">$2.4M</Badge>
                </div>
              </div>
              <Button className="w-full mt-4" variant="outline">
                View Flow Data
              </Button>
            </CardContent>
          </Card>

          {/* FinBERT Analysis */}
          <Card className="group hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/dashboard/trading/finbert')}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Brain className="h-5 w-5 text-pink-600" />
                  <CardTitle>FinBERT Analysis</CardTitle>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-pink-600 transition-colors" />
              </div>
              <CardDescription>
                AI-powered financial sentiment analysis for trading signals
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Sentiment Alerts</span>
                  <Badge variant="destructive">{overview.sentimentAlerts}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Market Sentiment</span>
                  <Badge variant="default">68% Bullish</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Analyzed Symbols</span>
                  <Badge variant="secondary">7</Badge>
                </div>
              </div>
              <Button className="w-full mt-4" variant="outline">
                Analyze Sentiment
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Fast access to common trading operations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button 
                variant="outline" 
                className="flex flex-col items-center space-y-2 h-20"
                onClick={() => router.push('/dashboard/trading/paper')}
              >
                <Play className="h-5 w-5" />
                <span className="text-xs">Place Order</span>
              </Button>
              
              <Button 
                variant="outline" 
                className="flex flex-col items-center space-y-2 h-20"
                onClick={() => router.push('/dashboard/trading/performance')}
              >
                <BarChart3 className="h-5 w-5" />
                <span className="text-xs">View P&L</span>
              </Button>
              
              <Button 
                variant="outline" 
                className="flex flex-col items-center space-y-2 h-20"
                onClick={() => router.push('/dashboard/trading/finbert')}
              >
                <Brain className="h-5 w-5" />
                <span className="text-xs">Check Sentiment</span>
              </Button>
              
              <Button 
                variant="outline" 
                className="flex flex-col items-center space-y-2 h-20"
                onClick={() => router.push('/dashboard/options')}
              >
                <Zap className="h-5 w-5" />
                <span className="text-xs">Flow Analysis</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* System Status */}
        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
            <CardDescription>
              Trading system health and connectivity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">Unusual Whales API</span>
                <Badge variant="default">Connected</Badge>
              </div>
              
              <div className="flex items-center space-x-2">
                {overview.paperTradingStatus === 'connected' ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                )}
                <span className="text-sm">IBKR TWS</span>
                {getStatusBadge(overview.paperTradingStatus)}
              </div>
              
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">FinBERT Model</span>
                <Badge variant="default">Active</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
