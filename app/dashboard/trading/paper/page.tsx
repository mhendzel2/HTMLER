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
import { formatCurrency } from '@/lib/utils';
import { enhancedFlowAnalysis } from '@/lib/enhanced-flow-analysis';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  DollarSign, 
  Zap,
  AlertCircle,
  CheckCircle,
  Clock,
  BarChart3
} from 'lucide-react';

interface IBKRConnection {
  status: 'connected' | 'disconnected' | 'connecting' | 'error';
  host: string;
  port: number;
  clientId: number;
  account?: string;
  balance?: number;
}

interface Trade {
  id: string;
  symbol: string;
  action: 'BUY' | 'SELL';
  orderType: 'MARKET' | 'LIMIT' | 'STOP';
  quantity: number;
  price?: number;
  stopPrice?: number;
  status: 'PENDING' | 'FILLED' | 'CANCELLED' | 'REJECTED';
  timestamp: string;
  fillPrice?: number;
  commission?: number;
  pnl?: number;
  source: 'IBKR' | 'VIRTUAL';
}

interface Position {
  symbol: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
}

export default function PaperTradingPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'order' | 'positions' | 'history' | 'settings'>('order');
  
  // IBKR Connection State
  const [ibkrConnection, setIbkrConnection] = useState<IBKRConnection>({
    status: 'disconnected',
    host: 'localhost',
    port: 7497, // Paper trading port
    clientId: 1
  });
  
  // Trading State
  const [trades, setTrades] = useState<Trade[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [virtualBalance, setVirtualBalance] = useState(100000); // $100k virtual starting balance
  
  // Order Form State
  const [orderForm, setOrderForm] = useState({
    symbol: '',
    action: 'BUY' as 'BUY' | 'SELL',
    orderType: 'MARKET' as 'MARKET' | 'LIMIT' | 'STOP',
    quantity: 100,
    price: '',
    stopPrice: ''
  });
  
  // Flow Analysis Integration
  const [flowAlerts, setFlowAlerts] = useState<any[]>([]);
  const [monitoringFlow, setMonitoringFlow] = useState(false);

  useEffect(() => {
    initializeTrading();
  }, []);

  const initializeTrading = async () => {
    setLoading(true);
    try {
      // Try to connect to IBKR TWS first
      await connectToIBKR();
      
      // Load existing trades and positions
      await loadTradingData();
      
      // Start flow monitoring for trade signals
      startFlowMonitoring();
      
    } catch (error) {
      console.error('Failed to initialize trading:', error);
    } finally {
      setLoading(false);
    }
  };

  const connectToIBKR = async () => {
    setIbkrConnection(prev => ({ ...prev, status: 'connecting' }));
    
    try {
      console.log('🔌 Attempting to connect to IBKR TWS Paper Trading...');
      
      const response = await fetch('/api/ibkr/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: ibkrConnection.host,
          port: ibkrConnection.port,
          clientId: ibkrConnection.clientId
        })
      });

      if (response.ok) {
        const data = await response.json();
        setIbkrConnection(prev => ({
          ...prev,
          status: 'connected',
          account: data.account,
          balance: data.balance
        }));
        console.log('✅ Connected to IBKR TWS Paper Trading');
      } else {
        throw new Error('IBKR connection failed');
      }
    } catch (error) {
      console.log('⚠️ IBKR unavailable, using virtual trading mode');
      setIbkrConnection(prev => ({ ...prev, status: 'error' }));
    }
  };

  const loadTradingData = async () => {
    try {
      // Load trades from local storage for virtual trading
      const savedTrades = localStorage.getItem('trading_history');
      if (savedTrades) {
        setTrades(JSON.parse(savedTrades));
      }

      const savedPositions = localStorage.getItem('trading_positions');
      if (savedPositions) {
        setPositions(JSON.parse(savedPositions));
      }

      const savedBalance = localStorage.getItem('virtual_balance');
      if (savedBalance) {
        setVirtualBalance(parseFloat(savedBalance));
      }
    } catch (error) {
      console.error('Failed to load trading data:', error);
    }
  };

  const startFlowMonitoring = async () => {
    setMonitoringFlow(true);
    console.log('📊 Starting real-time flow monitoring for trading signals');
    
    // Monitor for unusual flow activity that could generate trade signals
    const interval = setInterval(() => {
      // This would integrate with your enhanced flow analysis
      // For now, we'll simulate some flow alerts
      const mockTickers = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'AMZN', 'NVDA', 'META'];
      const randomTicker = mockTickers[Math.floor(Math.random() * mockTickers.length)];
      
      const mockAlert = {
        ticker: randomTicker,
        signal: Math.random() > 0.5 ? 'bullish' : 'bearish',
        confidence: Math.floor(Math.random() * 30) + 70, // 70-100%
        premium: Math.floor(Math.random() * 5000000) + 500000, // $500k-$5M
        timestamp: new Date().toISOString()
      };
      
      setFlowAlerts(prev => [...prev.slice(-4), mockAlert]); // Keep last 5
    }, 10000); // Every 10 seconds

    return () => clearInterval(interval);
  };

  const submitOrder = async () => {
    if (!orderForm.symbol || !orderForm.quantity) {
      alert('Please fill in all required fields');
      return;
    }

    const newTrade: Trade = {
      id: `trade_${Date.now()}`,
      symbol: orderForm.symbol.toUpperCase(),
      action: orderForm.action,
      orderType: orderForm.orderType,
      quantity: orderForm.quantity,
      price: orderForm.price ? parseFloat(orderForm.price) : undefined,
      stopPrice: orderForm.stopPrice ? parseFloat(orderForm.stopPrice) : undefined,
      status: 'PENDING',
      timestamp: new Date().toISOString(),
      source: ibkrConnection.status === 'connected' ? 'IBKR' : 'VIRTUAL'
    };

    try {
      if (ibkrConnection.status === 'connected') {
        // Submit to IBKR TWS
        const response = await fetch('/api/ibkr/order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newTrade)
        });

        if (response.ok) {
          const result = await response.json();
          newTrade.status = result.status;
          console.log('📤 Order submitted to IBKR TWS');
        }
      } else {
        // Virtual trading - simulate order fill
        setTimeout(() => {
          newTrade.status = 'FILLED';
          newTrade.fillPrice = newTrade.price || Math.random() * 200 + 100; // Mock fill price
          newTrade.commission = 1.00; // Mock commission
          
          // Update virtual balance
          const cost = newTrade.fillPrice * newTrade.quantity + newTrade.commission;
          if (newTrade.action === 'BUY') {
            setVirtualBalance(prev => prev - cost);
          } else {
            setVirtualBalance(prev => prev + cost);
          }
          
          updateTradeStatus(newTrade.id, newTrade);
        }, 2000); // Simulate 2-second fill delay
        
        console.log('📝 Virtual order submitted');
      }

      // Add to trades list
      const updatedTrades = [...trades, newTrade];
      setTrades(updatedTrades);
      localStorage.setItem('trading_history', JSON.stringify(updatedTrades));
      
      // Clear form
      setOrderForm({
        symbol: '',
        action: 'BUY',
        orderType: 'MARKET',
        quantity: 100,
        price: '',
        stopPrice: ''
      });

    } catch (error) {
      console.error('Failed to submit order:', error);
      alert('Failed to submit order: ' + error);
    }
  };

  const updateTradeStatus = (tradeId: string, updatedTrade: Trade) => {
    setTrades(prev => {
      const updated = prev.map(t => t.id === tradeId ? updatedTrade : t);
      localStorage.setItem('trading_history', JSON.stringify(updated));
      return updated;
    });
  };

  const getConnectionStatusBadge = () => {
    const statusConfig = {
      connected: { variant: 'default' as const, text: 'IBKR Connected', icon: CheckCircle },
      connecting: { variant: 'secondary' as const, text: 'Connecting...', icon: Clock },
      disconnected: { variant: 'outline' as const, text: 'IBKR Offline', icon: AlertCircle },
      error: { variant: 'destructive' as const, text: 'Virtual Mode', icon: AlertCircle }
    };

    const config = statusConfig[ibkrConnection.status];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center space-x-1">
        <Icon className="h-3 w-3" />
        <span>{config.text}</span>
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex-1 overflow-auto">
        <Header title="Paper Trading" description="IBKR TWS integration with virtual fallback" />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <Header 
        title="Paper Trading"
        description="IBKR TWS Paper Trading with Flow-Based Signals"
        onRefresh={initializeTrading}
        refreshing={refreshing}
      />
      
      <div className="p-6 space-y-6">
        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Connection Status</CardTitle>
              <Activity className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              {getConnectionStatusBadge()}
              <p className="text-xs text-muted-foreground mt-2">
                Port {ibkrConnection.port} • Client {ibkrConnection.clientId}
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
                {formatCurrency(ibkrConnection.balance || virtualBalance)}
              </div>
              <p className="text-xs text-muted-foreground">
                {ibkrConnection.status === 'connected' ? 'IBKR Paper' : 'Virtual'} Account
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open Positions</CardTitle>
              <BarChart3 className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{positions.length}</div>
              <p className="text-xs text-muted-foreground">
                Active positions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Flow Signals</CardTitle>
              <Zap className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{flowAlerts.length}</div>
              <p className="text-xs text-muted-foreground">
                Live flow alerts
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Trading Interface */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="order">Place Order</TabsTrigger>
            <TabsTrigger value="positions">Positions ({positions.length})</TabsTrigger>
            <TabsTrigger value="history">History ({trades.length})</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="order" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Order Form */}
              <Card>
                <CardHeader>
                  <CardTitle>Place Paper Trade</CardTitle>
                  <CardDescription>
                    Submit orders to {ibkrConnection.status === 'connected' ? 'IBKR TWS Paper Trading' : 'Virtual Trading Environment'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Symbol</Label>
                    <Input 
                      placeholder="e.g. AAPL" 
                      value={orderForm.symbol}
                      onChange={(e) => setOrderForm(prev => ({ ...prev, symbol: e.target.value.toUpperCase() }))}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Action</Label>
                      <Select value={orderForm.action} onValueChange={(value) => setOrderForm(prev => ({ ...prev, action: value as 'BUY' | 'SELL' }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="BUY">Buy</SelectItem>
                          <SelectItem value="SELL">Sell</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Order Type</Label>
                      <Select value={orderForm.orderType} onValueChange={(value) => setOrderForm(prev => ({ ...prev, orderType: value as any }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MARKET">Market</SelectItem>
                          <SelectItem value="LIMIT">Limit</SelectItem>
                          <SelectItem value="STOP">Stop</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Quantity</Label>
                    <Input 
                      type="number" 
                      value={orderForm.quantity}
                      onChange={(e) => setOrderForm(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                    />
                  </div>

                  {orderForm.orderType === 'LIMIT' && (
                    <div className="space-y-2">
                      <Label>Limit Price</Label>
                      <Input 
                        type="number" 
                        step="0.01"
                        placeholder="0.00"
                        value={orderForm.price}
                        onChange={(e) => setOrderForm(prev => ({ ...prev, price: e.target.value }))}
                      />
                    </div>
                  )}

                  {orderForm.orderType === 'STOP' && (
                    <div className="space-y-2">
                      <Label>Stop Price</Label>
                      <Input 
                        type="number" 
                        step="0.01"
                        placeholder="0.00"
                        value={orderForm.stopPrice}
                        onChange={(e) => setOrderForm(prev => ({ ...prev, stopPrice: e.target.value }))}
                      />
                    </div>
                  )}

                  <Button onClick={submitOrder} className="w-full" size="lg">
                    Submit Paper Trade
                  </Button>
                </CardContent>
              </Card>

              {/* Live Flow Signals */}
              <Card>
                <CardHeader>
                  <CardTitle>Live Flow Signals</CardTitle>
                  <CardDescription>
                    Real-time options flow analysis for paper trading opportunities
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {flowAlerts.length === 0 ? (
                      <p className="text-center text-gray-500 py-4">No active flow signals</p>
                    ) : (
                      flowAlerts.map((alert, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className={`w-2 h-2 rounded-full ${alert.signal === 'bullish' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                            <div>
                              <p className="font-medium">{alert.ticker}</p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {formatCurrency(alert.premium)} premium
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant={alert.signal === 'bullish' ? 'default' : 'destructive'}>
                              {alert.signal.toUpperCase()}
                            </Badge>
                            <p className="text-xs text-gray-500 mt-1">{alert.confidence}% confidence</p>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="mt-1"
                              onClick={() => setOrderForm(prev => ({ 
                                ...prev, 
                                symbol: alert.ticker,
                                action: alert.signal === 'bullish' ? 'BUY' : 'SELL'
                              }))}
                            >
                              Use Signal
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="positions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Paper Trading Positions</CardTitle>
                <CardDescription>
                  Your active paper trading positions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {positions.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No open positions</p>
                ) : (
                  <div className="space-y-2">
                    {positions.map((position, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div>
                          <p className="font-medium">{position.symbol}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {position.quantity} shares @ {formatCurrency(position.avgPrice)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`font-semibold ${position.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {position.pnl >= 0 ? '+' : ''}{formatCurrency(position.pnl)}
                          </p>
                          <p className={`text-sm ${position.pnlPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {position.pnlPercent >= 0 ? '+' : ''}{position.pnlPercent.toFixed(2)}%
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Paper Trade History</CardTitle>
                <CardDescription>
                  Your paper trading activity
                </CardDescription>
              </CardHeader>
              <CardContent>
                {trades.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No trades yet</p>
                ) : (
                  <div className="space-y-2">
                    {trades.slice().reverse().map((trade) => (
                      <div key={trade.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Badge variant={trade.action === 'BUY' ? 'default' : 'destructive'}>
                            {trade.action}
                          </Badge>
                          <div>
                            <p className="font-medium">{trade.symbol}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {trade.quantity} shares • {trade.orderType} • {trade.source}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge 
                            variant={
                              trade.status === 'FILLED' ? 'default' :
                              trade.status === 'PENDING' ? 'secondary' :
                              trade.status === 'CANCELLED' ? 'outline' : 'destructive'
                            }
                          >
                            {trade.status}
                          </Badge>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(trade.timestamp).toLocaleString()}
                          </p>
                          {trade.fillPrice && (
                            <p className="text-xs text-gray-500">
                              Filled @ {formatCurrency(trade.fillPrice)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>IBKR TWS Paper Trading Settings</CardTitle>
                <CardDescription>
                  Configure your connection to Interactive Brokers TWS Paper Trading
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Paper Trading Setup</h4>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    1. Download and install IBKR Trader Workstation (TWS)<br/>
                    2. Log in with your paper trading account<br/>
                    3. Enable API connections: Global Config → API → Settings<br/>
                    4. Set socket port to 7497 for paper trading<br/>
                    5. Click "Connect to IBKR TWS" below
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Host</Label>
                    <Input 
                      value={ibkrConnection.host}
                      onChange={(e) => setIbkrConnection(prev => ({ ...prev, host: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Port</Label>
                    <Input 
                      type="number"
                      value={ibkrConnection.port}
                      onChange={(e) => setIbkrConnection(prev => ({ ...prev, port: parseInt(e.target.value) }))}
                    />
                    <p className="text-xs text-gray-500">7497 = Paper Trading, 7496 = Live Trading</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Client ID</Label>
                  <Input 
                    type="number"
                    value={ibkrConnection.clientId}
                    onChange={(e) => setIbkrConnection(prev => ({ ...prev, clientId: parseInt(e.target.value) }))}
                  />
                  <p className="text-xs text-gray-500">Must be unique for each connection</p>
                </div>

                <Button onClick={connectToIBKR} disabled={ibkrConnection.status === 'connecting'}>
                  {ibkrConnection.status === 'connecting' ? 'Connecting...' : 'Connect to IBKR TWS'}
                </Button>

                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-2">Virtual Trading Settings</h4>
                  <div className="space-y-2">
                    <Label>Virtual Balance</Label>
                    <Input 
                      type="number"
                      value={virtualBalance}
                      onChange={(e) => {
                        const newBalance = parseFloat(e.target.value) || 0;
                        setVirtualBalance(newBalance);
                        localStorage.setItem('virtual_balance', newBalance.toString());
                      }}
                    />
                  </div>
                  <Button 
                    variant="outline" 
                    className="mt-2"
                    onClick={() => {
                      setVirtualBalance(100000);
                      setTrades([]);
                      setPositions([]);
                      localStorage.removeItem('trading_history');
                      localStorage.removeItem('trading_positions');
                      localStorage.setItem('virtual_balance', '100000');
                    }}
                  >
                    Reset Virtual Account
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
