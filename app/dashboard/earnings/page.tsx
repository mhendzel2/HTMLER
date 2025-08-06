
'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/dashboard/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatPercent, formatDate } from '@/lib/utils';
import { TrendingUp, TrendingDown, Calendar, Clock } from 'lucide-react';

interface EarningsItem {
  ticker: string;
  company_name: string;
  earnings_date: string;
  report_time: string;
  expected_move: number;
  expected_move_perc: number;
  eps_estimate: number;
  eps_actual?: number;
  revenue_estimate: number;
  revenue_actual?: number;
}

export default function EarningsPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [earningsData, setEarningsData] = useState<EarningsItem[]>([]);
  const [activeTab, setActiveTab] = useState<'today' | 'upcoming' | 'past'>('today');

  const fetchEarningsData = async () => {
    setRefreshing(true);
    try {
      // Mock data for demonstration
      const mockData: EarningsItem[] = [
        {
          ticker: 'AAPL',
          company_name: 'Apple Inc.',
          earnings_date: new Date().toISOString(),
          report_time: 'aftermarket',
          expected_move: 8.50,
          expected_move_perc: 4.2,
          eps_estimate: 1.52,
          eps_actual: 1.64,
          revenue_estimate: 117.9,
          revenue_actual: 119.4,
        },
        {
          ticker: 'MSFT',
          company_name: 'Microsoft Corporation',
          earnings_date: new Date(Date.now() + 86400000).toISOString(),
          report_time: 'premarket',
          expected_move: 12.30,
          expected_move_perc: 3.8,
          eps_estimate: 2.45,
          revenue_estimate: 52.4,
        },
        {
          ticker: 'GOOGL',
          company_name: 'Alphabet Inc.',
          earnings_date: new Date(Date.now() + 172800000).toISOString(),
          report_time: 'aftermarket',
          expected_move: 15.80,
          expected_move_perc: 5.1,
          eps_estimate: 1.34,
          revenue_estimate: 76.8,
        },
      ];
      
      setEarningsData(mockData);
    } catch (error) {
      console.error('Failed to fetch earnings data:', error);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEarningsData();
  }, []);

  const getReportTimeColor = (reportTime: string) => {
    return reportTime === 'premarket' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800';
  };

  const getMovementIcon = (actual?: number, estimate?: number) => {
    if (!actual || !estimate) return null;
    return actual > estimate ? (
      <TrendingUp className="h-4 w-4 text-green-600" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-600" />
    );
  };

  const filteredData = earningsData.filter(item => {
    const today = new Date();
    const earningsDate = new Date(item.earnings_date);
    
    switch (activeTab) {
      case 'today':
        return earningsDate.toDateString() === today.toDateString();
      case 'upcoming':
        return earningsDate > today;
      case 'past':
        return earningsDate < today;
      default:
        return true;
    }
  });

  if (loading) {
    return (
      <div className="flex-1 overflow-auto">
        <Header title="Earnings Analysis" description="Track earnings announcements and performance" />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <Header 
        title="Earnings Analysis"
        description="Track earnings announcements and expected moves"
        onRefresh={fetchEarningsData}
        refreshing={refreshing}
      />
      
      <div className="p-6 space-y-6">
        {/* Tabs */}
        <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
          {[
            { key: 'today', label: 'Today', count: earningsData.filter(e => new Date(e.earnings_date).toDateString() === new Date().toDateString()).length },
            { key: 'upcoming', label: 'Upcoming', count: earningsData.filter(e => new Date(e.earnings_date) > new Date()).length },
            { key: 'past', label: 'Past Results', count: earningsData.filter(e => new Date(e.earnings_date) < new Date()).length },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === tab.key
                  ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* Earnings Grid */}
        <div className="grid grid-cols-1 gap-4">
          {filteredData.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center h-32">
                <div className="text-center">
                  <Calendar className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">No earnings data for {activeTab}</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            filteredData.map(item => (
              <Card key={`${item.ticker}-${item.earnings_date}`} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                        <span className="font-bold text-blue-600 dark:text-blue-400">
                          {item.ticker}
                        </span>
                      </div>
                      <div>
                        <CardTitle className="text-lg">{item.ticker}</CardTitle>
                        <CardDescription className="text-sm">
                          {item.company_name}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className={getReportTimeColor(item.report_time)}>
                        {item.report_time === 'premarket' ? 'Pre-Market' : 'After Hours'}
                      </Badge>
                      <div className="text-right">
                        <p className="text-sm font-medium">{formatDate(item.earnings_date)}</p>
                        <p className="text-xs text-gray-500 flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {item.report_time === 'premarket' ? 'Before Open' : 'After Close'}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Expected Move</p>
                      <p className="text-lg font-semibold">
                        {formatCurrency(item.expected_move)}
                      </p>
                      <p className="text-xs text-green-600">
                        {formatPercent(item.expected_move_perc)}
                      </p>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-xs text-gray-500 uppercase tracking-wide">EPS</p>
                      <div className="flex items-center space-x-2">
                        <span className="text-lg font-semibold">
                          {item.eps_actual ? formatCurrency(item.eps_actual) : formatCurrency(item.eps_estimate)}
                        </span>
                        {getMovementIcon(item.eps_actual, item.eps_estimate)}
                      </div>
                      <p className="text-xs text-gray-500">
                        {item.eps_actual ? 'Actual' : 'Estimate'}: {formatCurrency(item.eps_estimate)}
                      </p>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Revenue (B)</p>
                      <div className="flex items-center space-x-2">
                        <span className="text-lg font-semibold">
                          {item.revenue_actual ? `$${item.revenue_actual}B` : `$${item.revenue_estimate}B`}
                        </span>
                        {getMovementIcon(item.revenue_actual, item.revenue_estimate)}
                      </div>
                      <p className="text-xs text-gray-500">
                        {item.revenue_actual ? 'Actual' : 'Estimate'}: ${item.revenue_estimate}B
                      </p>
                    </div>
                    
                    <div className="space-y-1 flex items-center">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full"
                        onClick={() => alert(`View details for ${item.ticker} earnings`)}
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                  
                  {(item.eps_actual || item.revenue_actual) && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Performance:</span>
                        <div className="flex items-center space-x-4">
                          {item.eps_actual && (
                            <span className={`text-sm ${item.eps_actual > item.eps_estimate ? 'text-green-600' : 'text-red-600'}`}>
                              EPS: {item.eps_actual > item.eps_estimate ? 'Beat' : 'Miss'} by {formatCurrency(Math.abs((item.eps_actual || 0) - item.eps_estimate))}
                            </span>
                          )}
                          {item.revenue_actual && (
                            <span className={`text-sm ${item.revenue_actual > item.revenue_estimate ? 'text-green-600' : 'text-red-600'}`}>
                              Revenue: {item.revenue_actual > item.revenue_estimate ? 'Beat' : 'Miss'} by ${Math.abs((item.revenue_actual || 0) - item.revenue_estimate).toFixed(1)}B
                            </span>
                          )}
                        </div>
                      </div>
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
