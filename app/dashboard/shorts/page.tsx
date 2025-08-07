
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Search, TrendingDown, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ShortsData {
  date: string;
  short_volume: number;
  total_volume: number;
  short_ratio: number;
  short_interest: number;
  days_to_cover: number;
}

interface FTDData {
  settlement_date: string;
  quantity: number;
  price: number;
  value: number;
}

export default function ShortsPage() {
  const [ticker, setTicker] = useState('AAPL');
  const [shortsData, setShortsData] = useState<ShortsData[]>([]);
  const [ftdData, setFTDData] = useState<FTDData[]>([]);
  const [volumeData, setVolumeData] = useState<any[]>([]);
  const [interestData, setInterestData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchShortsData = async () => {
    if (!ticker) return;
    
    try {
      setLoading(true);
      const [shortsRes, ftdRes, volumeRes, interestRes] = await Promise.all([
        fetch(`/api/shorts/${ticker}?type=data`, { cache: 'no-store' }),
        fetch(`/api/shorts/${ticker}?type=ftds`, { cache: 'no-store' }),
        fetch(`/api/shorts/${ticker}?type=volume-ratio`, { cache: 'no-store' }),
        fetch(`/api/shorts/${ticker}?type=interest-float`, { cache: 'no-store' })
      ]);

      if (shortsRes.ok) {
        const data = await shortsRes.json();
        setShortsData(data.data || []);
      }

      if (ftdRes.ok) {
        const data = await ftdRes.json();
        setFTDData(data.data || []);
      }

      if (volumeRes.ok) {
        const data = await volumeRes.json();
        setVolumeData(data.data || []);
      }

      if (interestRes.ok) {
        const data = await interestRes.json();
        setInterestData(data.data || null);
      }
    } catch (error) {
      console.error('Error fetching shorts data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShortsData();
  }, []);

  const handleSearch = () => {
    fetchShortsData();
  };

  const getShortRatioColor = (ratio: number) => {
    if (ratio > 0.5) return 'text-red-600';
    if (ratio > 0.3) return 'text-yellow-600';
    return 'text-green-600';
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(2)}K`;
    return num.toString();
  };

  return (
    <div className="flex-1 space-y-6 p-8 overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Shorts Analysis</h2>
          <p className="text-muted-foreground">
            Track short interest, FTDs, and short volume data
          </p>
        </div>
        <Button onClick={fetchShortsData} disabled={loading}>
          <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <Input
                placeholder="Enter ticker symbol (e.g., AAPL)"
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch} disabled={loading}>
              <Search className="h-4 w-4 mr-2" />
              Analyze
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Current Stats */}
      {interestData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <TrendingDown className="h-4 w-4 text-red-500" />
                <span className="text-sm font-medium">Short Interest</span>
              </div>
              <p className="text-2xl font-bold mt-2">
                {formatNumber(interestData.short_interest || 0)}
              </p>
              <p className="text-xs text-muted-foreground">
                {((interestData.short_interest / interestData.float) * 100).toFixed(2)}% of float
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-medium">Days to Cover</span>
              </div>
              <p className="text-2xl font-bold mt-2">
                {interestData.days_to_cover?.toFixed(2) || 'N/A'}
              </p>
              <p className="text-xs text-muted-foreground">
                Based on avg volume
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <TrendingDown className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">Utilization</span>
              </div>
              <p className="text-2xl font-bold mt-2">
                {interestData.utilization?.toFixed(1) || 'N/A'}%
              </p>
              <p className="text-xs text-muted-foreground">
                Shares on loan
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <TrendingDown className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium">Borrow Fee</span>
              </div>
              <p className="text-2xl font-bold mt-2">
                {interestData.borrow_fee?.toFixed(2) || 'N/A'}%
              </p>
              <p className="text-xs text-muted-foreground">
                Annual rate
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="volume-ratio" className="space-y-4">
        <TabsList>
          <TabsTrigger value="volume-ratio">Volume & Ratio</TabsTrigger>
          <TabsTrigger value="ftds">Fails to Deliver</TabsTrigger>
        </TabsList>

        <TabsContent value="volume-ratio" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Short Volume & Ratio History</CardTitle>
              <CardDescription>
                Daily short volume and ratio data for {ticker}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-4" />
                  <p>Loading short volume data...</p>
                </div>
              ) : volumeData.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No short volume data available for {ticker}.
                </div>
              ) : (
                <div className="space-y-3">
                  {volumeData.slice(0, 20).map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{new Date(item.date).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right space-x-4">
                        <span className="text-sm text-muted-foreground">
                          Short Vol: {formatNumber(item.short_volume)}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          Total Vol: {formatNumber(item.total_volume)}
                        </span>
                        <Badge 
                          variant="outline" 
                          className={getShortRatioColor(item.short_ratio)}
                        >
                          {(item.short_ratio * 100).toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ftds" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Fails to Deliver (FTDs)</CardTitle>
              <CardDescription>
                Recent fails to deliver data for {ticker}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-4" />
                  <p>Loading FTD data...</p>
                </div>
              ) : ftdData.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No FTD data available for {ticker}.
                </div>
              ) : (
                <div className="space-y-3">
                  {ftdData.slice(0, 20).map((ftd, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{new Date(ftd.settlement_date).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatNumber(ftd.quantity)} shares</p>
                        <p className="text-sm text-muted-foreground">
                          ${ftd.value?.toLocaleString()} value
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
    </div>
  );
}
