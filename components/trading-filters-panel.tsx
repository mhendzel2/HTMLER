'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  Zap
} from 'lucide-react';
import { 
  tradingFilters, 
  type BigMoneyFilter, 
  type FlowAlert, 
  type GEXData 
} from '@/lib/trading-filters';
import { unusualWhalesWS } from '@/lib/websocket-client';
import { injectMockFlowAlerts, testBigMoneyFilter, testDarkPoolFilter, testAggressiveShortTermFilter, testSmallAlert } from '@/lib/mock-flow-alerts';

interface FilterAlert {
  filter: BigMoneyFilter;
  alert: FlowAlert;
  timestamp: number;
}

export default function TradingFiltersPanel() {
  const [filters, setFilters] = useState<BigMoneyFilter[]>([]);
  const [recentAlerts, setRecentAlerts] = useState<FilterAlert[]>([]);
  const [wsStatus, setWsStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected');
  const [wsAccessible, setWsAccessible] = useState<boolean | null>(null);
  const [selectedTicker, setSelectedTicker] = useState<string>('');
  const [gexData, setGexData] = useState<GEXData | null>(null);
  const [totalPremiumToday, setTotalPremiumToday] = useState<number>(0);
  const [alertCount, setAlertCount] = useState<{ [filterId: string]: number }>({});

  useEffect(() => {
    // Initialize filters
    const availableFilters = tradingFilters.getAvailableFilters();
    setFilters(availableFilters);

    // Test WebSocket access
    testWebSocketAccess();

    // Start real-time monitoring
    startMonitoring();

    return () => {
      // Cleanup subscriptions
      filters.forEach(filter => {
        tradingFilters.unsubscribeFromFilter(filter.id);
      });
    };
  }, []);

  const testWebSocketAccess = async () => {
    const accessTest = await unusualWhalesWS.testWebSocketAccess();
    setWsAccessible(accessTest.hasWebSocketScope);
    
    if (!accessTest.hasWebSocketScope) {
      console.warn('WebSocket not available:', accessTest.error);
    }
  };

  const startMonitoring = async () => {
    setWsStatus('connecting');
    
    const success = await tradingFilters.startRealTimeMonitoring();
    
    setWsStatus(success ? 'connected' : 'disconnected');

    // Subscribe to each filter
    filters.forEach(filter => {
      tradingFilters.subscribeToFilter(filter.id, (alert) => {
        handleNewAlert(filter, alert);
      });
    });

    // Monitor WebSocket status
    const statusInterval = setInterval(() => {
      const currentStatus = unusualWhalesWS.getStatus();
      setWsStatus(currentStatus);
    }, 5000);

    return () => clearInterval(statusInterval);
  };

  const handleNewAlert = (filter: BigMoneyFilter, alert: FlowAlert) => {
    const filterAlert: FilterAlert = {
      filter,
      alert,
      timestamp: Date.now()
    };

    setRecentAlerts(prev => {
      const updated = [filterAlert, ...prev].slice(0, 50); // Keep last 50 alerts
      return updated;
    });

    // Update statistics
    setTotalPremiumToday(prev => prev + alert.premium);
    setAlertCount(prev => ({
      ...prev,
      [filter.id]: (prev[filter.id] || 0) + 1
    }));
  };

  const toggleFilter = (filterId: string, enabled: boolean) => {
    tradingFilters.toggleFilter(filterId, enabled);
    setFilters(prev => 
      prev.map(filter => 
        filter.id === filterId 
          ? { ...filter, enabled }
          : filter
      )
    );
  };

  const monitorTickerGEX = (ticker: string) => {
    if (selectedTicker) {
      tradingFilters.stopGEXMonitoring(selectedTicker);
    }

    setSelectedTicker(ticker);
    tradingFilters.monitorGEX(ticker, (gex) => {
      setGexData(gex);
    });
  };

  const formatPremium = (premium: number) => {
    if (premium >= 1000000) {
      return `$${(premium / 1000000).toFixed(2)}M`;
    } else if (premium >= 1000) {
      return `$${(premium / 1000).toFixed(0)}K`;
    }
    return `$${premium.toFixed(0)}`;
  };

  const getStatusIcon = () => {
    switch (wsStatus) {
      case 'connected':
        return <Wifi className="w-4 h-4 text-green-500" />;
      case 'connecting':
        return <Activity className="w-4 h-4 text-yellow-500 animate-pulse" />;
      default:
        return <WifiOff className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusText = () => {
    if (wsAccessible === false) return 'WebSocket not available - using polling';
    switch (wsStatus) {
      case 'connected':
        return 'Real-time monitoring active';
      case 'connecting':
        return 'Connecting to real-time feeds...';
      default:
        return 'Real-time feeds offline - using polling';
    }
  };

  return (
    <div className="space-y-6">
      {/* Status Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Big Money Flow Monitor</CardTitle>
              <CardDescription>
                Real-time institutional options flow detection
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <span className="text-sm text-muted-foreground">
                {getStatusText()}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {formatPremium(totalPremiumToday)}
              </div>
              <div className="text-sm text-muted-foreground">Total Premium Today</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {Object.values(alertCount).reduce((sum, count) => sum + count, 0)}
              </div>
              <div className="text-sm text-muted-foreground">Total Alerts</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {filters.filter(f => f.enabled).length}
              </div>
              <div className="text-sm text-muted-foreground">Active Filters</div>
            </div>
          </div>
          
          {/* Debug Section */}
          <div className="mt-4 p-3 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
            <div className="text-sm font-medium text-gray-600 mb-2">🧪 Debug & Testing</div>
            <div className="flex flex-wrap gap-2">
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => {
                  console.log('🔴 BUTTON CLICKED: Simple test');
                  alert('Simple test button works!');
                }}
                className="text-xs"
              >
                Test Button Click
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => {
                  console.log('🔴 Inject Mock Alerts button clicked!');
                  alert('Testing Inject Mock Alerts - check console');
                  try {
                    injectMockFlowAlerts();
                  } catch (error) {
                    console.error('Error calling injectMockFlowAlerts:', error);
                    alert('Error: ' + error);
                  }
                }}
                className="text-xs"
              >
                Inject Mock Alerts
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => {
                  console.log('🔴 Test Big Money button clicked!');
                  alert('Testing Big Money Filter - check console');
                  try {
                    testBigMoneyFilter();
                  } catch (error) {
                    console.error('Error calling testBigMoneyFilter:', error);
                    alert('Error: ' + error);
                  }
                }}
                className="text-xs"
              >
                Test Big Money ($750K)
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => {
                  console.log('🔴 Test Dark Pool button clicked!');
                  alert('Testing Dark Pool Filter - check console');
                  try {
                    testDarkPoolFilter();
                  } catch (error) {
                    console.error('Error calling testDarkPoolFilter:', error);
                    alert('Error: ' + error);
                  }
                }}
                className="text-xs"
              >
                Test Dark Pool ($300K)
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => {
                  console.log('🔴 Test Short-Term button clicked!');
                  alert('Testing Short-Term Filter - check console');
                  try {
                    testAggressiveShortTermFilter();
                  } catch (error) {
                    console.error('Error calling testAggressiveShortTermFilter:', error);
                    alert('Error: ' + error);
                  }
                }}
                className="text-xs"
              >
                Test Short-Term ($150K)
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => {
                  console.log('🔴 Test Small Alert button clicked!');
                  alert('Testing Small Alert - check console');
                  try {
                    testSmallAlert();
                  } catch (error) {
                    console.error('Error calling testSmallAlert:', error);
                    alert('Error: ' + error);
                  }
                }}
                className="text-xs"
              >
                Test Small Alert ($25K)
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="filters" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="filters">Filters</TabsTrigger>
          <TabsTrigger value="alerts">Live Alerts</TabsTrigger>
          <TabsTrigger value="gex">GEX Monitor</TabsTrigger>
          <TabsTrigger value="stats">Statistics</TabsTrigger>
        </TabsList>

        {/* Filters Tab */}
        <TabsContent value="filters">
          <div className="grid gap-4">
            {filters.map((filter) => (
              <Card key={filter.id} className={filter.enabled ? 'border-green-200' : 'border-gray-200'}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {filter.name}
                        {filter.enabled && <Badge variant="outline" className="text-xs">ACTIVE</Badge>}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {filter.description}
                      </CardDescription>
                    </div>
                    <Switch
                      checked={filter.enabled}
                      onCheckedChange={(checked) => toggleFilter(filter.id, checked)}
                    />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-2">
                    {filter.criteria.minPremium && (
                      <Badge variant="secondary">
                        Min: {formatPremium(filter.criteria.minPremium)}
                      </Badge>
                    )}
                    {filter.criteria.minDTE && (
                      <Badge variant="secondary">
                        Min DTE: {filter.criteria.minDTE}
                      </Badge>
                    )}
                    {filter.criteria.maxDTE && (
                      <Badge variant="secondary">
                        Max DTE: {filter.criteria.maxDTE}
                      </Badge>
                    )}
                    {filter.criteria.side && filter.criteria.side !== 'both' && (
                      <Badge variant="secondary">
                        {filter.criteria.side.toUpperCase()} Side
                      </Badge>
                    )}
                    {filter.criteria.moneyness && filter.criteria.moneyness !== 'any' && (
                      <Badge variant="secondary">
                        {filter.criteria.moneyness}
                      </Badge>
                    )}
                    {filter.criteria.aggressiveness && filter.criteria.aggressiveness !== 'any' && (
                      <Badge variant="secondary">
                        {filter.criteria.aggressiveness.charAt(0).toUpperCase() + filter.criteria.aggressiveness.slice(1)}s
                      </Badge>
                    )}
                    <Badge variant="outline" className="ml-auto">
                      {alertCount[filter.id] || 0} alerts today
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Live Alerts Tab */}
        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle>Recent Flow Alerts</CardTitle>
              <CardDescription>
                Live institutional options activity matching your filters
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                {recentAlerts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No alerts yet. Monitoring for institutional flow...
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentAlerts.map((alertItem, index) => {
                      const { filter, alert } = alertItem;
                      const sentimentIcon = alert.sentiment === 'bullish' ? 
                        <TrendingUp className="w-4 h-4 text-green-500" /> :
                        alert.sentiment === 'bearish' ?
                        <TrendingDown className="w-4 h-4 text-red-500" /> :
                        <Activity className="w-4 h-4 text-gray-500" />;

                      return (
                        <div key={index} className="border rounded-lg p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {filter.name}
                              </Badge>
                              {sentimentIcon}
                              <span className="font-semibold">{alert.ticker}</span>
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {new Date(alert.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Strike/Expiry:</span>
                              <br />
                              <span className="font-medium">
                                ${alert.strike} {alert.type.toUpperCase()} {alert.expiry}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Premium:</span>
                              <br />
                              <span className="font-medium text-green-600">
                                {formatPremium(alert.premium)}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Size:</span>
                              <br />
                              <span className="font-medium">{alert.size} contracts</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Type:</span>
                              <br />
                              <Badge variant="secondary" className="text-xs">
                                {alert.aggressiveness} • {alert.side}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* GEX Monitor Tab */}
        <TabsContent value="gex">
          <Card>
            <CardHeader>
              <CardTitle>GEX Monitor</CardTitle>
              <CardDescription>
                Track gamma exposure levels for potential squeeze scenarios
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter ticker (e.g., AAPL)"
                  className="flex-1 px-3 py-2 border rounded-md"
                  value={selectedTicker}
                  onChange={(e) => setSelectedTicker(e.target.value.toUpperCase())}
                />
                <Button 
                  onClick={() => monitorTickerGEX(selectedTicker)}
                  disabled={!selectedTicker}
                >
                  Monitor GEX
                </Button>
              </div>

              {gexData && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-semibold">Total GEX</h4>
                    <div className="text-2xl font-bold">
                      {(gexData.totalGEX / 1000000).toFixed(1)}M
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold">Flip Point</h4>
                    <div className="text-2xl font-bold">
                      ${gexData.flipPoint.toFixed(2)}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold">Call GEX</h4>
                    <div className="text-lg text-green-600">
                      {(gexData.callGEX / 1000000).toFixed(1)}M
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold">Put GEX</h4>
                    <div className="text-lg text-red-600">
                      {(gexData.putGEX / 1000000).toFixed(1)}M
                    </div>
                  </div>
                </div>
              )}

              {selectedTicker && !gexData && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Loading GEX data for {selectedTicker}...
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Statistics Tab */}
        <TabsContent value="stats">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Filter Performance</CardTitle>
                <CardDescription>
                  Alert counts and premium volumes by filter
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filters.map((filter) => (
                    <div key={filter.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{filter.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {filter.enabled ? 'Active' : 'Inactive'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{alertCount[filter.id] || 0}</div>
                        <div className="text-sm text-muted-foreground">alerts</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
