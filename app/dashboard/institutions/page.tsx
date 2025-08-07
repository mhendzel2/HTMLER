
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, Search, Building2, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Institution {
  name: string;
  type: string;
  total_value: number;
  holding_count: number;
}

interface Holding {
  ticker: string;
  company_name: string;
  shares: number;
  value: number;
  percentage_of_portfolio: number;
  percentage_of_shares: number;
  change_in_shares: number;
  change_percentage: number;
}

interface Activity {
  ticker: string;
  action: string;
  shares: number;
  value: number;
  date: string;
  price_per_share: number;
}

export default function InstitutionsPage() {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [selectedInstitution, setSelectedInstitution] = useState<string>('');
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchInstitutions = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/institutions');
      if (response.ok) {
        const data = await response.json();
        setInstitutions(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching institutions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInstitutionData = async (institutionName: string) => {
    if (!institutionName) return;
    
    try {
      setLoading(true);
      const [holdingsResponse, activityResponse] = await Promise.all([
        fetch(`/api/institutions/${encodeURIComponent(institutionName)}/holdings`),
        fetch(`/api/institutions/${encodeURIComponent(institutionName)}/activity`)
      ]);

      if (holdingsResponse.ok) {
        const holdingsData = await holdingsResponse.json();
        setHoldings(holdingsData.data || []);
      }

      if (activityResponse.ok) {
        const activityData = await activityResponse.json();
        setActivity(activityData.data || []);
      }
    } catch (error) {
      console.error('Error fetching institution data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInstitutions();
  }, []);

  useEffect(() => {
    if (selectedInstitution) {
      fetchInstitutionData(selectedInstitution);
    }
  }, [selectedInstitution]);

  const filteredInstitutions = institutions.filter(institution =>
    institution.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    institution.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatValue = (value: number) => {
    if (value >= 1000000000) return `$${(value / 1000000000).toFixed(1)}B`;
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
    return `$${value.toFixed(0)}`;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(2)}K`;
    return num.toLocaleString();
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getActionColor = (action?: string) => {
    const normalized = action?.toLowerCase();
    switch (normalized) {
      case 'buy':
      case 'increase':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'sell':
      case 'decrease':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'hold':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="flex-1 space-y-6 p-8 overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Institutional Analysis</h2>
          <p className="text-muted-foreground">
            Track institutional holdings and trading activity
          </p>
        </div>
        <Button onClick={fetchInstitutions} disabled={loading}>
          <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Institution List */}
        <Card>
          <CardHeader>
            <CardTitle>Institutions</CardTitle>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search institutions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center">
                  <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Loading institutions...</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredInstitutions.map((institution) => (
                    <button
                      key={institution.name}
                      onClick={() => setSelectedInstitution(institution.name)}
                      className={cn(
                        "w-full p-3 text-left hover:bg-muted/50 transition-colors border-b last:border-0",
                        selectedInstitution === institution.name && "bg-muted"
                      )}
                    >
                      <div className="flex items-center space-x-3">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{institution.name}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant="outline" className="text-xs">{institution.type}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {institution.holding_count} holdings
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Institution Details */}
        <div className="lg:col-span-2">
          {!selectedInstitution ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">Select an institution to view details</p>
              </CardContent>
            </Card>
          ) : (
            <Tabs defaultValue="holdings" className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold">{selectedInstitution}</h3>
                  <p className="text-sm text-muted-foreground">Institutional analysis</p>
                </div>
                <TabsList>
                  <TabsTrigger value="holdings">Holdings</TabsTrigger>
                  <TabsTrigger value="activity">Activity</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="holdings" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Top Holdings</CardTitle>
                    <CardDescription>
                      Largest positions in the portfolio
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="text-center py-4">
                        <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Loading holdings...</p>
                      </div>
                    ) : holdings.length === 0 ? (
                      <p className="text-center py-4 text-muted-foreground">
                        No holdings data available.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {holdings.slice(0, 15).map((holding, index) => (
                          <div key={holding.ticker} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div className="text-xs text-muted-foreground w-6">
                                #{index + 1}
                              </div>
                              <div>
                                <Badge variant="outline" className="font-mono">
                                  {holding.ticker}
                                </Badge>
                                <p className="text-sm text-muted-foreground mt-1 truncate max-w-48">
                                  {holding.company_name}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">{formatValue(holding.value)}</p>
                              <div className="flex items-center space-x-2 mt-1">
                                <span className="text-xs text-muted-foreground">
                                  {holding.percentage_of_portfolio?.toFixed(1)}%
                                </span>
                                {holding.change_percentage !== 0 && (
                                  <span className={cn("text-xs flex items-center", getChangeColor(holding.change_percentage))}>
                                    {holding.change_percentage > 0 ? (
                                      <TrendingUp className="h-3 w-3 mr-1" />
                                    ) : (
                                      <TrendingDown className="h-3 w-3 mr-1" />
                                    )}
                                    {Math.abs(holding.change_percentage).toFixed(1)}%
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="activity" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>
                      Latest trading activity and position changes
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="text-center py-4">
                        <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Loading activity...</p>
                      </div>
                    ) : activity.length === 0 ? (
                      <p className="text-center py-4 text-muted-foreground">
                        No recent activity data available.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {activity.slice(0, 15).map((item, index) => (
                          <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center space-x-3">
                              <Badge variant="outline" className="font-mono">
                                {item.ticker}
                              </Badge>
                              <div>
                                <Badge className={getActionColor(item.action)}>
                                  {item.action}
                                </Badge>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {new Date(item.date).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">{formatNumber(item.shares)} shares</p>
                              <p className="text-sm text-muted-foreground">
                                {formatValue(item.value)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
}
