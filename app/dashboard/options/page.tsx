'use client';

import { useState, useEffect, useRef } from 'react';
import { Header } from '@/components/dashboard/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatVolume, formatPercent } from '@/lib/utils';
import { Activity, TrendingUp, AlertTriangle, Eye, Filter, Wifi, WifiOff, Radio } from 'lucide-react';
import { unusualWhalesWS } from '@/lib/websocket-client';

interface OptionsActivity {
  ticker: string;
  option_symbol?: string;
  underlying_symbol?: string;
  option_type: 'CALL' | 'PUT' | 'call' | 'put';
  strike: number | string;
  expiry: string;
  volume: number;
  open_interest?: number;
  premium: number | string;
  price?: number | string;
  implied_volatility?: number | string;
  unusual_activity?: boolean;
  timestamp?: string;
  executed_at?: number;
  size?: number;
  tags?: string[];
  delta?: number | string;
  theta?: number | string;
  gamma?: number | string;
  vega?: number | string;
}

export default function OptionsPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [optionsData, setOptionsData] = useState<OptionsActivity[]>([]);
  const [filter, setFilter] = useState<'all' | 'unusual' | 'calls' | 'puts'>('all');
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'polling'>('connecting');
  const cleanupRef = useRef<(() => void) | null>(null);
  const [advancedFilters, setAdvancedFilters] = useState({
    minimumPremium: 100000,
    volumeThreshold: 50,
    tideType: 'equity_only',
    moneyness: 'otm',
    expiration: 'zero_dte',
  });

  const fetchOptionsData = async () => {
    setRefreshing(true);
    try {
      // First try to connect to WebSocket for real-time data
      const wsConnected = await unusualWhalesWS.connect();
      
      if (wsConnected) {
        setConnectionStatus('connected');
        setIsWebSocketConnected(true);
        
        // Subscribe to flow alerts
        unusualWhalesWS.subscribeToFlowAlerts((alert) => {
          const newActivity: OptionsActivity = {
            ticker: alert.ticker,
            option_symbol: alert.option_chain,
            underlying_symbol: alert.ticker,
            option_type: alert.option_chain.includes('C') ? 'CALL' : 'PUT',
            strike: parseFloat(alert.option_chain.match(/\d+/)?.[0] || '0') / 1000,
            expiry: new Date().toISOString().split('T')[0], // Simplified for now
            volume: alert.volume,
            open_interest: alert.open_interest,
            premium: alert.total_premium,
            price: alert.price,
            implied_volatility: 0, // Not provided in flow alerts
            unusual_activity: true, // All flow alerts are unusual by definition
            timestamp: new Date(alert.executed_at).toISOString(),
            executed_at: alert.executed_at,
            size: alert.total_size,
            tags: [alert.rule_name],
          };
          
          setOptionsData(prev => [newActivity, ...prev.slice(0, 99)]); // Keep last 100
        }, advancedFilters.volumeThreshold);
        
      } else {
        // Fallback to polling
        setConnectionStatus('polling');
        setIsWebSocketConnected(false);
        
        const cleanup = unusualWhalesWS.startFlowAlertsPolling((alerts) => {
          const newActivities = alerts.map((alert): OptionsActivity => ({
            ticker: alert.ticker,
            option_symbol: alert.option_chain,
            underlying_symbol: alert.ticker,
            option_type: alert.option_chain.includes('C') ? 'CALL' : 'PUT',
            strike: parseFloat(alert.option_chain.match(/\d+/)?.[0] || '0') / 1000,
            expiry: new Date().toISOString().split('T')[0],
            volume: alert.volume,
            open_interest: alert.open_interest,
            premium: alert.total_premium,
            price: alert.price,
            implied_volatility: 0,
            unusual_activity: true,
            timestamp: new Date(alert.executed_at).toISOString(),
            executed_at: alert.executed_at,
            size: alert.total_size,
            tags: [alert.rule_name],
          }));
          
          setOptionsData(prev => {
            const combined = [...newActivities, ...prev];
            // Remove duplicates based on id and keep only recent 100
            const unique = combined.filter((item, index, self) => 
              self.findIndex(i => i.option_symbol === item.option_symbol && i.executed_at === item.executed_at) === index
            );
            return unique.slice(0, 100);
          });
        }, advancedFilters.volumeThreshold);
        
        cleanupRef.current = cleanup;
      }
      
    } catch (error) {
      console.error('Failed to fetch options data:', error);
      setConnectionStatus('polling');
      setOptionsData([]);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOptionsData();
    
    // Cleanup function
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
      unusualWhalesWS.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!loading) {
      // Restart connection with new volume threshold
      if (cleanupRef.current) {
        cleanupRef.current();
      }
      unusualWhalesWS.disconnect();
      fetchOptionsData();
    }
  }, [advancedFilters.volumeThreshold]);

  const filteredData = optionsData.filter(item => {
    const premium = typeof item.premium === 'string' ? parseFloat(item.premium) : item.premium;
    
    // Apply minimum premium filter
    if (premium < advancedFilters.minimumPremium) {
      return false;
    }
    
    // Apply basic filters
    switch (filter) {
      case 'unusual':
        return item.unusual_activity;
      case 'calls':
        return item.option_type === 'CALL';
      case 'puts':
        return item.option_type === 'PUT';
      default:
        return true;
    }
  });

  const getOptionTypeColor = (type: 'CALL' | 'PUT' | 'call' | 'put') => {
    const upperType = type.toUpperCase();
    return upperType === 'CALL' 
      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
  };

  const handleFilterChange = (key: string, value: any) => {
    setAdvancedFilters(prev => ({ ...prev, [key]: value }));
  };

  const getConnectionStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Wifi className="h-4 w-4 text-green-600" />;
      case 'polling':
        return <WifiOff className="h-4 w-4 text-orange-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'WebSocket Connected';
      case 'polling':
        return 'Polling Mode';
      default:
        return 'Connecting...';
    }
  };

  if (loading) {
    return (
      <div className="flex-1 overflow-auto">
        <Header title="Options Activity" description="Monitor unusual options trades and activity" />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <Header 
        title="Options Flow Alerts"
        description={`Real-time options flow alerts with ${advancedFilters.volumeThreshold}+ contract volume threshold`}
        onRefresh={fetchOptionsData}
        refreshing={refreshing}
      />
      
      <div className="p-6 space-y-6">
        {/* Connection Status */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {getConnectionStatusIcon()}
                <span className="font-medium">{getConnectionStatusText()}</span>
                {connectionStatus === 'connected' && (
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    Real-time
                  </Badge>
                )}
                {connectionStatus === 'polling' && (
                  <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                    5s updates
                  </Badge>
                )}
              </div>
              <div className="text-sm text-gray-600">
                Volume Threshold: {advancedFilters.volumeThreshold}+ contracts
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Advanced Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="minimumPremium" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Minimum Premium
            </label>
            <input
              id="minimumPremium"
              type="number"
              value={advancedFilters.minimumPremium}
              onChange={(e) => handleFilterChange('minimumPremium', parseFloat(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600"
              placeholder="100000"
            />
          </div>
          <div>
            <label htmlFor="volumeThreshold" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Volume Threshold
            </label>
            <input
              id="volumeThreshold"
              type="number"
              value={advancedFilters.volumeThreshold}
              onChange={(e) => handleFilterChange('volumeThreshold', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600"
              placeholder="50"
            />
          </div>
          <div>
            <label htmlFor="refreshRate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Connection Status
            </label>
            <div className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600">
              {getConnectionStatusIcon()}
              <span className="text-sm">{getConnectionStatusText()}</span>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Volume</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatVolume(optionsData.reduce((sum, item) => sum + item.volume, 0))}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Unusual Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {optionsData.filter(o => o.unusual_activity).length}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Call/Put Ratio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(optionsData.filter(o => o.option_type === 'CALL').length / 
                  Math.max(1, optionsData.filter(o => o.option_type === 'PUT').length)).toFixed(2)}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Avg Premium</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(optionsData.reduce((sum, item) => sum + (typeof item.premium === 'number' ? item.premium : parseFloat(item.premium as string) || 0), 0) / optionsData.length || 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Options Activity List */}
        <div className="space-y-4">
          {filteredData.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center h-32">
                <div className="text-center">
                  <Activity className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">No options activity found for selected filter</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            filteredData.map(item => (
              <Card key={item.option_symbol || `${item.ticker}-${item.strike}-${item.expiry}`} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      {item.unusual_activity && (
                        <div className="flex items-center justify-center w-8 h-8 bg-orange-100 rounded-full">
                          <AlertTriangle className="h-4 w-4 text-orange-600" />
                        </div>
                      )}
                      
                      <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                        <span className="font-bold text-blue-600 dark:text-blue-400">
                          {item.ticker}
                        </span>
                      </div>
                      
                      <div>
                        <h3 className="font-semibold text-lg">{item.ticker}</h3>
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Badge className={getOptionTypeColor(item.option_type)}>
                            {item.option_type}
                          </Badge>
                          <span>${item.strike}</span>
                          <span>{new Date(item.expiry).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-8">
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Volume</p>
                        <p className="font-semibold">{formatVolume(item.volume)}</p>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-sm text-gray-500">OI</p>
                        <p className="font-semibold">{formatVolume(item.open_interest || 0)}</p>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Premium</p>
                        <p className="font-semibold">{formatCurrency(item.premium)}</p>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-sm text-gray-500">IV</p>
                        <p className="font-semibold">{item.implied_volatility}%</p>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Time</p>
                        <p className="text-xs">{item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : 'N/A'}</p>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => alert(`View details for ${item.ticker} ${item.option_type} contract`)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Details
                      </Button>
                    </div>
                  </div>
                  
                  {item.unusual_activity && (
                    <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="h-4 w-4 text-orange-600" />
                        <span className="text-sm font-medium text-orange-800 dark:text-orange-200">
                          Unusual Activity Detected
                        </span>
                      </div>
                      <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
                        Volume is {((item.volume / Math.max(1, item.open_interest || 1)) * 100).toFixed(0)}% of open interest
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
