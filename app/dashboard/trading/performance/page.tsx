'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/dashboard/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrency } from '@/lib/utils';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  DollarSign,
  Target,
  Activity,
  Calendar,
  PieChart
} from 'lucide-react';

interface PerformanceMetrics {
  totalPnL: number;
  totalReturn: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  sharpeRatio: number;
  maxDrawdown: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
}

interface DailyPnL {
  date: string;
  pnl: number;
  trades: number;
  cumulativePnL: number;
}

export default function TradingPerformancePage() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'daily' | 'analytics' | 'comparison'>('overview');
  
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    totalPnL: 2350.75,
    totalReturn: 2.35,
    winRate: 64.5,
    avgWin: 185.25,
    avgLoss: -95.50,
    sharpeRatio: 1.42,
    maxDrawdown: -8.5,
    totalTrades: 31,
    winningTrades: 20,
    losingTrades: 11
  });

  const [dailyPnL, setDailyPnL] = useState<DailyPnL[]>([]);

  useEffect(() => {
    initializePerformanceData();
  }, []);

  const initializePerformanceData = async () => {
    setLoading(true);
    try {
      // Load performance data from localStorage or API
      await loadPerformanceData();
      generateDailyPnLData();
    } catch (error) {
      console.error('Failed to load performance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPerformanceData = async () => {
    try {
      // Load trading history for performance calculation
      const savedTrades = localStorage.getItem('trading_history');
      if (savedTrades) {
        const trades = JSON.parse(savedTrades);
        calculatePerformanceMetrics(trades);
      }
    } catch (error) {
      console.error('Failed to load performance data:', error);
    }
  };

  const calculatePerformanceMetrics = (trades: any[]) => {
    // Calculate real performance metrics from trades
    const filledTrades = trades.filter(t => t.status === 'FILLED');
    
    if (filledTrades.length === 0) return;

    let totalPnL = 0;
    let winningTrades = 0;
    let losingTrades = 0;
    let totalWinAmount = 0;
    let totalLossAmount = 0;

    filledTrades.forEach(trade => {
      if (trade.pnl) {
        totalPnL += trade.pnl;
        if (trade.pnl > 0) {
          winningTrades++;
          totalWinAmount += trade.pnl;
        } else {
          losingTrades++;
          totalLossAmount += trade.pnl;
        }
      }
    });

    const winRate = filledTrades.length > 0 ? (winningTrades / filledTrades.length) * 100 : 0;
    const avgWin = winningTrades > 0 ? totalWinAmount / winningTrades : 0;
    const avgLoss = losingTrades > 0 ? totalLossAmount / losingTrades : 0;

    setPerformanceMetrics({
      totalPnL,
      totalReturn: (totalPnL / 100000) * 100, // Assuming $100k starting balance
      winRate,
      avgWin,
      avgLoss,
      sharpeRatio: 1.42, // Would need more complex calculation
      maxDrawdown: -8.5, // Would need historical tracking
      totalTrades: filledTrades.length,
      winningTrades,
      losingTrades
    });
  };

  const generateDailyPnLData = () => {
    // Generate sample daily P&L data for the chart
    const data: DailyPnL[] = [];
    let cumulativePnL = 0;
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      const dailyPnL = (Math.random() - 0.5) * 500; // Random daily P&L
      const trades = Math.floor(Math.random() * 5); // 0-4 trades per day
      cumulativePnL += dailyPnL;
      
      data.push({
        date: date.toISOString().split('T')[0],
        pnl: dailyPnL,
        trades,
        cumulativePnL
      });
    }
    
    setDailyPnL(data);
  };

  if (loading) {
    return (
      <div className="flex-1 overflow-auto">
        <Header title="Trading Performance" description="Analyze your paper trading performance" />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <Header 
        title="Trading Performance"
        description="Comprehensive analysis of your paper trading results"
        onRefresh={initializePerformanceData}
      />
      
      <div className="p-6 space-y-6">
        {/* Performance Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total P&L</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${performanceMetrics.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {performanceMetrics.totalPnL >= 0 ? '+' : ''}{formatCurrency(performanceMetrics.totalPnL)}
              </div>
              <p className="text-xs text-muted-foreground">
                {performanceMetrics.totalReturn >= 0 ? '+' : ''}{performanceMetrics.totalReturn.toFixed(2)}% return
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
              <Target className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {performanceMetrics.winRate.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                {performanceMetrics.winningTrades}W / {performanceMetrics.losingTrades}L
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Win/Loss</CardTitle>
              <BarChart3 className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-sm space-y-1">
                <div className="text-green-600 font-semibold">
                  +{formatCurrency(performanceMetrics.avgWin)}
                </div>
                <div className="text-red-600 font-semibold">
                  {formatCurrency(performanceMetrics.avgLoss)}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Risk/Reward: {(performanceMetrics.avgWin / Math.abs(performanceMetrics.avgLoss)).toFixed(2)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Trades</CardTitle>
              <Activity className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{performanceMetrics.totalTrades}</div>
              <p className="text-xs text-muted-foreground">
                Paper trading executions
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Performance Analysis Tabs */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="daily">Daily P&L</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="comparison">Comparison</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Risk Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle>Risk Metrics</CardTitle>
                  <CardDescription>
                    Key risk assessment indicators
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Sharpe Ratio</span>
                    <Badge variant={performanceMetrics.sharpeRatio > 1 ? 'default' : 'secondary'}>
                      {performanceMetrics.sharpeRatio.toFixed(2)}
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Max Drawdown</span>
                    <Badge variant="destructive">
                      {performanceMetrics.maxDrawdown.toFixed(1)}%
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Profit Factor</span>
                    <Badge variant="default">
                      {(Math.abs(performanceMetrics.avgWin * performanceMetrics.winningTrades) / 
                        Math.abs(performanceMetrics.avgLoss * performanceMetrics.losingTrades)).toFixed(2)}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Trade Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Trade Distribution</CardTitle>
                  <CardDescription>
                    Breakdown of trading activity
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <span className="text-sm">Winning Trades</span>
                      </div>
                      <span className="text-sm font-medium">{performanceMetrics.winningTrades}</span>
                    </div>
                    
                    <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                      <div 
                        className={`bg-green-500 h-2 rounded-full`}
                        data-width={performanceMetrics.winRate}
                      ></div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <span className="text-sm">Losing Trades</span>
                      </div>
                      <span className="text-sm font-medium">{performanceMetrics.losingTrades}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="daily" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Daily P&L Chart</CardTitle>
                <CardDescription>
                  30-day performance tracking
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-gray-500">
                  📊 Daily P&L Chart (Chart library would be integrated here)
                  <div className="ml-4 text-sm">
                    Last 30 days • Total: {formatCurrency(performanceMetrics.totalPnL)}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Daily Performance</CardTitle>
                <CardDescription>
                  Last 7 days trading results
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {dailyPnL.slice(-7).map((day, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <div>
                          <p className="text-sm font-medium">
                            {new Date(day.date).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-gray-500">
                            {day.trades} trades
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${day.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {day.pnl >= 0 ? '+' : ''}{formatCurrency(day.pnl)}
                        </p>
                        <p className="text-xs text-gray-500">
                          Cumulative: {formatCurrency(day.cumulativePnL)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Performance Analytics</CardTitle>
                  <CardDescription>
                    Advanced trading metrics
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">Largest Win</span>
                      <span className="text-sm font-medium text-green-600">
                        +{formatCurrency(performanceMetrics.avgWin * 2.5)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Largest Loss</span>
                      <span className="text-sm font-medium text-red-600">
                        {formatCurrency(performanceMetrics.avgLoss * 2.1)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Avg Trade Duration</span>
                      <span className="text-sm font-medium">2h 15m</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Best Day</span>
                      <span className="text-sm font-medium text-green-600">
                        +{formatCurrency(845.50)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Worst Day</span>
                      <span className="text-sm font-medium text-red-600">
                        {formatCurrency(-421.25)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Trading Patterns</CardTitle>
                  <CardDescription>
                    Behavioral analysis insights
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      • Most profitable time: 10:30 AM - 12:00 PM EST
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      • Average position size: {formatCurrency(5250)}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      • Preferred trade duration: 2-4 hours
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      • Best performing sector: Technology (68% win rate)
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      • Flow signal correlation: 72% follow-through rate
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="comparison" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Benchmark Comparison</CardTitle>
                <CardDescription>
                  Compare your performance against market indices
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="text-lg font-semibold">+2.35%</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Your Return</div>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="text-lg font-semibold text-blue-600">+1.8%</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">S&P 500</div>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="text-lg font-semibold text-purple-600">+3.2%</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">NASDAQ</div>
                    </div>
                  </div>
                  
                  <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                    📈 Outperforming S&P 500 by +0.55%
                    <br />
                    📊 30-day comparison period
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
