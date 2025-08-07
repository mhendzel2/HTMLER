'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/dashboard/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  DollarSign, 
  Clock,
  Wifi,
  WifiOff,
  AlertTriangle,
  Target,
  Zap,
  RefreshCw,
  Play,
  Pause
} from 'lucide-react';

interface FlowAlert {
  id: string;
  ticker: string;
  type: 'call' | 'put';
  strike: number;
  expiry: string;
  premium: number;
  volume: number;
  side: 'ask' | 'bid' | 'mixed';
  timestamp: number;
  underlying_price: number;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  aggressiveness: 'sweep' | 'block' | 'split';
  moneyness: 'ITM' | 'OTM' | 'ATM';
  dte: number;
}

interface AlertFilter {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  minPremium: number;
  count: number;
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<FlowAlert[]>([]);
  const [filters, setFilters] = useState<AlertFilter[]>([
    {
      id: 'big-money',
      name: 'Big Money ($500K+)',
      description: 'High premium institutional trades',
      enabled: true,
      minPremium: 500000,
      count: 0
    },
    {
      id: 'aggressive-short-term',
      name: 'Short-Term Aggressive',
      description: '0-14 DTE high-premium trades',
      enabled: true,
      minPremium: 100000,
      count: 0
    },
    {
      id: 'dark-pool',
      name: 'Dark Pool Correlation',
      description: 'Large block trades',
      enabled: true,
      minPremium: 250000,
      count: 0
    }
  ]);
  
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [totalPremium, setTotalPremium] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'polling'>('disconnected');

  useEffect(() => {
    if (isMonitoring) {
      startMonitoring();
    } else {
      stopMonitoring();
    }
  }, [isMonitoring]);

  const startMonitoring = () => {
    setConnectionStatus('polling');
    // Since WebSocket is not available, use polling
    const interval = setInterval(() => {
      fetchLatestAlerts();
    }, 10000); // Poll every 10 seconds

    // Store interval ID for cleanup
    (window as any).alertsInterval = interval;
    
    // Initial fetch
    fetchLatestAlerts();
  };

  const stopMonitoring = () => {
    setConnectionStatus('disconnected');
    if ((window as any).alertsInterval) {
      clearInterval((window as any).alertsInterval);
    }
  };

  const fetchLatestAlerts = async () => {
    try {
      const response = await fetch('/api/alerts/flow?symbols=AAPL,TSLA,NVDA,AMD,MSFT,SPY,QQQ,IWM,GLD,TLT&limit=50');
      if (response.ok) {
        const data = await response.json();
        console.log('Received flow alerts:', data);
        
        const newAlerts = processRawAlerts(data.data || []);
        
        // Only add truly new alerts
        setAlerts(prev => {
          const existingIds = new Set(prev.map(a => a.id));
          const filtered = newAlerts.filter(alert => !existingIds.has(alert.id));
          const combined = [...filtered, ...prev].slice(0, 100); // Keep last 100
          return combined;
        });

        setLastUpdate(new Date());
        updateFilterCounts(newAlerts);
        
        if (data.metadata) {
          console.log('Flow alerts metadata:', data.metadata);
        }
      }
    } catch (error) {
      console.error('Error fetching alerts:', error);
    }
  };

  const processRawAlerts = (rawData: any[]): FlowAlert[] => {
    return rawData.map(item => {
      const premium = item.total_premium || 0;
      const volume = item.volume || 0;
      const underlying_price = item.underlying_price || 0;
      const strike = item.strike || 0;
      
      // Determine side based on bid/ask premium distribution
      const askPrem = item.total_ask_side_prem || 0;
      const bidPrem = item.total_bid_side_prem || 0;
      let side: 'ask' | 'bid' | 'mixed' = 'mixed';
      if (askPrem > bidPrem * 2) side = 'ask';
      else if (bidPrem > askPrem * 2) side = 'bid';

      // Calculate DTE
      const expiryDate = new Date(item.expiry);
      const now = new Date();
      const dte = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      // Determine moneyness
      let moneyness: 'ITM' | 'OTM' | 'ATM' = 'ATM';
      if (underlying_price && strike) {
        const diff = Math.abs(strike - underlying_price) / underlying_price;
        if (diff >= 0.02) {
          if (item.type === 'call') {
            moneyness = strike > underlying_price ? 'OTM' : 'ITM';
          } else {
            moneyness = strike < underlying_price ? 'OTM' : 'ITM';
          }
        }
      }

      // Determine aggressiveness
      let aggressiveness: 'sweep' | 'block' | 'split' = 'split';
      if (item.has_sweep) aggressiveness = 'sweep';
      else if (item.has_floor || premium > 500000) aggressiveness = 'block';

      // Calculate sentiment
      let sentiment: 'bullish' | 'bearish' | 'neutral' = 'neutral';
      if (item.type === 'call' && side === 'ask') sentiment = 'bullish';
      else if (item.type === 'put' && side === 'ask') sentiment = 'bearish';
      else if (item.type === 'call' && side === 'bid') sentiment = 'bearish';
      else if (item.type === 'put' && side === 'bid') sentiment = 'bullish';

      return {
        id: item.id || `${item.ticker}-${Date.now()}-${Math.random()}`,
        ticker: item.ticker,
        type: item.type,
        strike: strike,
        expiry: item.expiry,
        premium: premium,
        volume: volume,
        side: side,
        timestamp: item.executed_at || Date.now(),
        underlying_price: underlying_price,
        sentiment: sentiment,
        aggressiveness: aggressiveness,
        moneyness: moneyness,
        dte: dte
      };
    }).filter(alert => alert.premium > 10000); // Filter for significant premium
  };

  const updateFilterCounts = (newAlerts: FlowAlert[]) => {
    setFilters(prev => prev.map(filter => {
      const matches = newAlerts.filter(alert => {
        switch (filter.id) {
          case 'big-money':
            return alert.premium >= 500000 && alert.side === 'ask';
          case 'aggressive-short-term':
            return alert.premium >= 100000 && alert.dte <= 14 && alert.aggressiveness === 'sweep';
          case 'dark-pool':
            return alert.premium >= 250000 && alert.aggressiveness === 'block';
          default:
            return false;
        }
      });
      
      return {
        ...filter,
        count: filter.count + matches.length
      };
    }));

    // Update total premium
    const newPremium = newAlerts.reduce((sum, alert) => sum + alert.premium, 0);
    setTotalPremium(prev => prev + newPremium);
  };

  const formatPremium = (premium: number) => {
    if (premium >= 1000000) {
      return `$${(premium / 1000000).toFixed(2)}M`;
    } else if (premium >= 1000) {
      return `$${(premium / 1000).toFixed(0)}K`;
    }
    return `$${premium.toFixed(0)}`;
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Wifi className="w-4 h-4 text-green-500" />;
      case 'polling':
        return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
      default:
        return <WifiOff className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Real-time WebSocket connected';
      case 'polling':
        return 'Polling mode active (10s intervals)';
      default:
        return 'Monitoring stopped';
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'bullish':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'bearish':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    const activeFilters = filters.filter(f => f.enabled);
    if (activeFilters.length === 0) return true;
    
    return activeFilters.some(filter => {
      switch (filter.id) {
        case 'big-money':
          return alert.premium >= 500000 && alert.side === 'ask';
        case 'aggressive-short-term':
          return alert.premium >= 100000 && alert.dte <= 14;
        case 'dark-pool':
          return alert.premium >= 250000 && alert.aggressiveness === 'block';
        default:
          return false;
      }
    });
  });

  return (
    <div className="min-h-screen bg-background">
      <Header title="Flow Alerts Monitoring" />
      <div className="container mx-auto px-4 py-8 space-y-6">
        
        {/* Status Header */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">Live Options Flow Monitor</CardTitle>
                <CardDescription>
                  Real-time institutional options flow detection and alerts
                </CardDescription>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  {getStatusIcon()}
                  <span className="text-sm text-muted-foreground">
                    {getStatusText()}
                  </span>
                </div>
                <Button
                  onClick={() => setIsMonitoring(!isMonitoring)}
                  variant={isMonitoring ? "destructive" : "default"}
                  size="sm"
                >
                  {isMonitoring ? (
                    <>
                      <Pause className="w-4 h-4 mr-2" />
                      Stop
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Start
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {formatPremium(totalPremium)}
                </div>
                <div className="text-sm text-muted-foreground">Total Premium Today</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {filteredAlerts.length}
                </div>
                <div className="text-sm text-muted-foreground">Active Alerts</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {filters.filter(f => f.enabled).length}
                </div>
                <div className="text-sm text-muted-foreground">Active Filters</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {lastUpdate ? formatTime(lastUpdate.getTime()) : '--:--'}
                </div>
                <div className="text-sm text-muted-foreground">Last Update</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* WebSocket Status Alert */}
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Real-time Mode:</strong> WebSocket connections are not available with the current API subscription. 
            The system is using HTTP polling every 10 seconds to fetch live flow data. This provides near real-time 
            monitoring of institutional options flow. 
            {lastUpdate && (
              <span className="ml-2 text-sm">
                Last data refresh: {lastUpdate.toLocaleTimeString()}
              </span>
            )}
          </AlertDescription>
        </Alert>

        {/* Filters Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {filters.map(filter => (
            <Card key={filter.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{filter.name}</CardTitle>
                  <Switch
                    checked={filter.enabled}
                    onCheckedChange={(enabled) => 
                      setFilters(prev => prev.map(f => 
                        f.id === filter.id ? { ...f, enabled } : f
                      ))
                    }
                  />
                </div>
                <CardDescription>{filter.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Min Premium: {formatPremium(filter.minPremium)}
                  </div>
                  <Badge variant={filter.count > 0 ? "default" : "secondary"}>
                    {filter.count} alerts
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Alerts Feed */}
        <Card>
          <CardHeader>
            <CardTitle>Live Flow Alerts</CardTitle>
            <CardDescription>
              Recent institutional options flow matching your filters
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!isMonitoring && (
              <Alert className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Monitoring is currently stopped. Click "Start" to begin monitoring live flow alerts.
                </AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredAlerts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {isMonitoring ? 'Waiting for flow alerts...' : 'No alerts to display'}
                </div>
              ) : (
                filteredAlerts.map(alert => (
                  <div key={alert.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      {getSentimentIcon(alert.sentiment)}
                      <div>
                        <div className="font-semibold">
                          {alert.ticker} {alert.type.toUpperCase()} ${alert.strike}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {alert.expiry} • {alert.dte} DTE • {alert.moneyness}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="font-semibold text-green-600">
                        {formatPremium(alert.premium)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Vol: {alert.volume.toLocaleString()} • {alert.aggressiveness}
                      </div>
                    </div>
                    
                    <div className="text-xs text-muted-foreground">
                      {formatTime(alert.timestamp)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
