'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Header } from '@/components/dashboard/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrency, formatVolume, formatPercent } from '@/lib/utils';
import { 
  ArrowLeft, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  BarChart3, 
  Clock,
  DollarSign,
  Target,
  Zap,
  AlertTriangle,
  ExternalLink
} from 'lucide-react';

interface OptionContractData {
  contract_id: string;
  ticker: string;
  underlying_symbol: string;
  option_type: 'CALL' | 'PUT';
  strike: number;
  expiry: string;
  price: number;
  bid: number;
  ask: number;
  volume: number;
  open_interest: number;
  implied_volatility: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
  underlying_price: number;
  daily_change: number;
  daily_change_percent: number;
  intrinsic_value: number;
  time_value: number;
  days_to_expiry: number;
  break_even: number;
  moneyness: string;
  last_updated: string;
}

interface VolumeProfileData {
  price: number;
  volume: number;
  percentage: number;
}

interface IntradayData {
  timestamp: string;
  price: number;
  volume: number;
  premium: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export default function OptionContractPage() {
  const router = useRouter();
  const params = useParams();
  const contractId = params.contractId as string;
  
  const [loading, setLoading] = useState(true);
  const [contractData, setContractData] = useState<OptionContractData | null>(null);
  const [volumeProfile, setVolumeProfile] = useState<VolumeProfileData[]>([]);
  const [intradayData, setIntradayData] = useState<IntradayData[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [error, setError] = useState<string | null>(null);

  const fetchContractData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch basic contract info
      const contractResponse = await fetch(`/api/options/${contractId}?type=info`);
      if (!contractResponse.ok) {
        throw new Error('Failed to fetch contract data');
      }
      const contractResult = await contractResponse.json();
      
      if (contractResult.data && contractResult.data.length > 0) {
        setContractData(contractResult.data[0]);
      }

      // Fetch volume profile
      try {
        const volumeResponse = await fetch(`/api/options/${contractId}?type=volume-profile`);
        if (volumeResponse.ok) {
          const volumeResult = await volumeResponse.json();
          if (volumeResult.data) {
            setVolumeProfile(volumeResult.data);
          }
        }
      } catch (err) {
        console.warn('Failed to fetch volume profile:', err);
      }

      // Fetch intraday data
      try {
        const intradayResponse = await fetch(`/api/options/${contractId}?type=intraday`);
        if (intradayResponse.ok) {
          const intradayResult = await intradayResponse.json();
          if (intradayResult.data) {
            setIntradayData(intradayResult.data);
          }
        }
      } catch (err) {
        console.warn('Failed to fetch intraday data:', err);
      }

    } catch (error) {
      console.error('Error fetching contract data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load contract data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (contractId) {
      fetchContractData();
    }
  }, [contractId]);

  const getOptionTypeColor = (type: string) => {
    return type === 'CALL' 
      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
  };

  const getMoneynessColor = (moneyness: string) => {
    switch (moneyness?.toLowerCase()) {
      case 'itm': return 'text-green-600';
      case 'atm': return 'text-yellow-600';
      case 'otm': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getDaysToExpiryColor = (days: number) => {
    if (days <= 7) return 'text-red-600';
    if (days <= 30) return 'text-yellow-600';
    return 'text-green-600';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header title="Option Contract" />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !contractData) {
    return (
      <div className="min-h-screen bg-background">
        <Header title="Option Contract" />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Error Loading Contract</h2>
              <p className="text-gray-600 mb-4">{error || 'Contract not found'}</p>
              <Button onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header title="Option Contract" />
      <div className="container mx-auto px-4 py-8">
        {/* Header with back button */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center space-x-2">
                <span>{contractData.ticker}</span>
                <Badge className={getOptionTypeColor(contractData.option_type)}>
                  {contractData.option_type}
                </Badge>
                <span className="text-lg">${contractData.strike}</span>
                <span className="text-sm text-gray-500">{contractData.expiry}</span>
              </h1>
              <p className="text-gray-600">{contractData.contract_id}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={fetchContractData}>
              Refresh
            </Button>
            <Button>
              <ExternalLink className="h-4 w-4 mr-2" />
              Trade
            </Button>
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Last Price</p>
                  <p className="text-2xl font-bold">${contractData.price.toFixed(2)}</p>
                  <p className={`text-sm ${contractData.daily_change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {contractData.daily_change >= 0 ? '+' : ''}${contractData.daily_change.toFixed(2)} 
                    ({formatPercent(contractData.daily_change_percent)})
                  </p>
                </div>
                {contractData.daily_change >= 0 ? 
                  <TrendingUp className="h-8 w-8 text-green-500" /> : 
                  <TrendingDown className="h-8 w-8 text-red-500" />
                }
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Volume</p>
                  <p className="text-2xl font-bold">{formatVolume(contractData.volume)}</p>
                  <p className="text-sm text-gray-600">OI: {formatVolume(contractData.open_interest)}</p>
                </div>
                <Activity className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Implied Volatility</p>
                  <p className="text-2xl font-bold">{(contractData.implied_volatility * 100).toFixed(1)}%</p>
                  <p className="text-sm text-gray-600">Delta: {contractData.delta.toFixed(3)}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Days to Expiry</p>
                  <p className={`text-2xl font-bold ${getDaysToExpiryColor(contractData.days_to_expiry)}`}>
                    {contractData.days_to_expiry}
                  </p>
                  <p className={`text-sm ${getMoneynessColor(contractData.moneyness)}`}>
                    {contractData.moneyness?.toUpperCase()}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Information Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="greeks">Greeks</TabsTrigger>
            <TabsTrigger value="volume">Volume Profile</TabsTrigger>
            <TabsTrigger value="intraday">Intraday</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <DollarSign className="h-5 w-5" />
                    <span>Price Information</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Bid</span>
                      <span className="font-medium">${contractData.bid.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Ask</span>
                      <span className="font-medium">${contractData.ask.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Spread</span>
                      <span className="font-medium">${(contractData.ask - contractData.bid).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Underlying Price</span>
                      <span className="font-medium">${contractData.underlying_price.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Break Even</span>
                      <span className="font-medium">${contractData.break_even.toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Target className="h-5 w-5" />
                    <span>Contract Details</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Intrinsic Value</span>
                      <span className="font-medium">${contractData.intrinsic_value.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Time Value</span>
                      <span className="font-medium">${contractData.time_value.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Volume</span>
                      <span className="font-medium">{formatVolume(contractData.volume)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Open Interest</span>
                      <span className="font-medium">{formatVolume(contractData.open_interest)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Last Updated</span>
                      <span className="font-medium">
                        {new Date(contractData.last_updated).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="greeks" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Zap className="h-5 w-5" />
                  <span>Option Greeks</span>
                </CardTitle>
                <CardDescription>
                  Risk sensitivities of the option contract
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-1">Delta</p>
                    <p className="text-2xl font-bold">{contractData.delta.toFixed(3)}</p>
                    <p className="text-xs text-gray-500">Price sensitivity</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-1">Gamma</p>
                    <p className="text-2xl font-bold">{contractData.gamma.toFixed(3)}</p>
                    <p className="text-xs text-gray-500">Delta sensitivity</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-1">Theta</p>
                    <p className="text-2xl font-bold text-red-600">{contractData.theta.toFixed(3)}</p>
                    <p className="text-xs text-gray-500">Time decay</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-1">Vega</p>
                    <p className="text-2xl font-bold">{contractData.vega.toFixed(3)}</p>
                    <p className="text-xs text-gray-500">IV sensitivity</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-1">Rho</p>
                    <p className="text-2xl font-bold">{contractData.rho.toFixed(3)}</p>
                    <p className="text-xs text-gray-500">Rate sensitivity</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="volume" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Volume Profile</CardTitle>
                <CardDescription>
                  Trading volume distribution by price level
                </CardDescription>
              </CardHeader>
              <CardContent>
                {volumeProfile.length > 0 ? (
                  <div className="space-y-2">
                    {volumeProfile.slice(0, 10).map((level, index) => {
                      // Use width classes based on percentage
                      let widthClass = 'w-1/12'; // Default
                      if (level.percentage >= 90) widthClass = 'w-full';
                      else if (level.percentage >= 75) widthClass = 'w-3/4';
                      else if (level.percentage >= 60) widthClass = 'w-3/5';
                      else if (level.percentage >= 50) widthClass = 'w-1/2';
                      else if (level.percentage >= 40) widthClass = 'w-2/5';
                      else if (level.percentage >= 25) widthClass = 'w-1/4';
                      else if (level.percentage >= 10) widthClass = 'w-1/5';
                      
                      return (
                        <div key={index} className="flex items-center space-x-4">
                          <div className="w-16 text-sm font-medium">${level.price.toFixed(2)}</div>
                          <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                            <div className={`bg-blue-500 h-6 rounded-full flex items-center justify-end px-2 ${widthClass}`}>
                              <span className="text-xs text-white font-medium">
                                {formatVolume(level.volume)}
                              </span>
                            </div>
                          </div>
                          <div className="w-12 text-sm text-gray-600">{level.percentage.toFixed(1)}%</div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No volume profile data available
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="intraday" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Intraday Data</CardTitle>
                <CardDescription>
                  Minute-by-minute price and volume data
                </CardDescription>
              </CardHeader>
              <CardContent>
                {intradayData.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Time</th>
                          <th className="text-right p-2">Price</th>
                          <th className="text-right p-2">Volume</th>
                          <th className="text-right p-2">Premium</th>
                          <th className="text-right p-2">OHLC</th>
                        </tr>
                      </thead>
                      <tbody>
                        {intradayData.slice(0, 20).map((tick, index) => (
                          <tr key={index} className="border-b hover:bg-gray-50">
                            <td className="p-2">
                              {new Date(tick.timestamp).toLocaleTimeString()}
                            </td>
                            <td className="p-2 text-right font-medium">
                              ${tick.price.toFixed(2)}
                            </td>
                            <td className="p-2 text-right">
                              {formatVolume(tick.volume)}
                            </td>
                            <td className="p-2 text-right">
                              {formatCurrency(tick.premium)}
                            </td>
                            <td className="p-2 text-right text-xs">
                              O: ${tick.open.toFixed(2)} H: ${tick.high.toFixed(2)}<br/>
                              L: ${tick.low.toFixed(2)} C: ${tick.close.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No intraday data available
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
