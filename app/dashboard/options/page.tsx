
'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/dashboard/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatVolume, formatPercent } from '@/lib/utils';
import { Activity, TrendingUp, AlertTriangle, Eye, Filter } from 'lucide-react';

interface OptionsActivity {
  ticker: string;
  contract_id: string;
  option_type: 'CALL' | 'PUT';
  strike: number;
  expiry: string;
  volume: number;
  open_interest: number;
  premium: number;
  implied_volatility: number;
  unusual_activity: boolean;
  timestamp: string;
}

export default function OptionsPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [optionsData, setOptionsData] = useState<OptionsActivity[]>([]);
  const [filter, setFilter] = useState<'all' | 'unusual' | 'calls' | 'puts'>('all');

  const fetchOptionsData = async () => {
    setRefreshing(true);
    try {
      // Mock data for demonstration
      const mockData: OptionsActivity[] = [
        {
          ticker: 'AAPL',
          contract_id: 'AAPL_240115C00185000',
          option_type: 'CALL',
          strike: 185,
          expiry: '2024-01-15',
          volume: 15420,
          open_interest: 8932,
          premium: 2.45,
          implied_volatility: 28.5,
          unusual_activity: true,
          timestamp: new Date().toISOString(),
        },
        {
          ticker: 'TSLA',
          contract_id: 'TSLA_240115P00240000',
          option_type: 'PUT',
          strike: 240,
          expiry: '2024-01-15',
          volume: 8934,
          open_interest: 12456,
          premium: 8.75,
          implied_volatility: 42.1,
          unusual_activity: true,
          timestamp: new Date(Date.now() - 900000).toISOString(),
        },
        {
          ticker: 'NVDA',
          contract_id: 'NVDA_240122C00480000',
          option_type: 'CALL',
          strike: 480,
          expiry: '2024-01-22',
          volume: 6789,
          open_interest: 4523,
          premium: 12.30,
          implied_volatility: 35.8,
          unusual_activity: false,
          timestamp: new Date(Date.now() - 1800000).toISOString(),
        },
      ];
      
      setOptionsData(mockData);
    } catch (error) {
      console.error('Failed to fetch options data:', error);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOptionsData();
  }, []);

  const filteredData = optionsData.filter(item => {
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

  const getOptionTypeColor = (type: 'CALL' | 'PUT') => {
    return type === 'CALL' 
      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
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
        title="Options Activity"
        description="Monitor unusual options trades and market activity"
        onRefresh={fetchOptionsData}
        refreshing={refreshing}
      />
      
      <div className="p-6 space-y-6">
        {/* Filters */}
        <div className="flex items-center justify-between">
          <div className="flex space-x-2">
            {[
              { key: 'all', label: 'All Activity', count: optionsData.length },
              { key: 'unusual', label: 'Unusual Only', count: optionsData.filter(o => o.unusual_activity).length },
              { key: 'calls', label: 'Calls', count: optionsData.filter(o => o.option_type === 'CALL').length },
              { key: 'puts', label: 'Puts', count: optionsData.filter(o => o.option_type === 'PUT').length },
            ].map(filterItem => (
              <Button
                key={filterItem.key}
                variant={filter === filterItem.key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(filterItem.key as any)}
                className="flex items-center space-x-1"
              >
                <span>{filterItem.label}</span>
                <Badge variant="secondary" className="ml-1 text-xs">
                  {filterItem.count}
                </Badge>
              </Button>
            ))}
          </div>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => alert('Advanced filters coming soon!')}
          >
            <Filter className="h-4 w-4 mr-2" />
            More Filters
          </Button>
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
                {formatCurrency(optionsData.reduce((sum, item) => sum + item.premium, 0) / optionsData.length || 0)}
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
              <Card key={item.contract_id} className="hover:shadow-lg transition-shadow">
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
                        <p className="font-semibold">{formatVolume(item.open_interest)}</p>
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
                        <p className="text-xs">{new Date(item.timestamp).toLocaleTimeString()}</p>
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
                        Volume is {((item.volume / Math.max(1, item.open_interest)) * 100).toFixed(0)}% of open interest
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
