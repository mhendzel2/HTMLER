'use client';

import { useState } from 'react';
import TradingFiltersPanel from '@/components/trading-filters-panel';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { InfoIcon, TrendingUp, Activity, Target, Zap, DollarSign } from 'lucide-react';

export default function TradingFiltersPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Advanced Trading Filters</h1>
        <p className="text-muted-foreground">
          Real-time institutional options flow detection based on successful trader strategies
        </p>
      </div>

      {/* Educational Cards */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-500" />
              Big Money Detection
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Identifies institutional-grade options trades with high premium values, 
              focusing on OTM positions that indicate directional bets or hedging strategies.
            </p>
            <div className="flex flex-wrap gap-1">
              <Badge variant="secondary" className="text-xs">$500K+ Premium</Badge>
              <Badge variant="secondary" className="text-xs">OTM Focus</Badge>
              <Badge variant="secondary" className="text-xs">Ask-Side</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="w-5 h-5 text-orange-500" />
              Catalyst Plays
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Tracks short-term aggressive positioning (0-14 DTE) that may indicate 
              knowledge of upcoming catalysts or momentum plays.
            </p>
            <div className="flex flex-wrap gap-1">
              <Badge variant="secondary" className="text-xs">0-14 DTE</Badge>
              <Badge variant="secondary" className="text-xs">High Premium</Badge>
              <Badge variant="secondary" className="text-xs">Sweeps</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="w-5 h-5 text-purple-500" />
              Gamma Exposure
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Monitors gamma exposure levels to identify potential squeeze scenarios 
              where market makers may drive price action through delta hedging.
            </p>
            <div className="flex flex-wrap gap-1">
              <Badge variant="secondary" className="text-xs">GEX Analysis</Badge>
              <Badge variant="secondary" className="text-xs">Flip Points</Badge>
              <Badge variant="secondary" className="text-xs">Real-time</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-500" />
              Dark Pool Correlation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Identifies large block trades that may correlate with dark pool activity, 
              indicating institutional positioning away from public order books.
            </p>
            <div className="flex flex-wrap gap-1">
              <Badge variant="secondary" className="text-xs">Block Trades</Badge>
              <Badge variant="secondary" className="text-xs">Large Size</Badge>
              <Badge variant="secondary" className="text-xs">Institutional</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Important Notice */}
      <Alert>
        <InfoIcon className="h-4 w-4" />
        <AlertDescription>
          <strong>Research-Based Filters:</strong> These filters are based on strategies shared by successful 
          Unusual Whales traders on social media. They focus on identifying institutional-grade options flow 
          that may indicate significant market moves or positioning changes.
        </AlertDescription>
      </Alert>

      {/* Main Trading Filters Panel */}
      <TradingFiltersPanel />

      {/* Footer Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">How to Use These Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Real-Time Monitoring</h4>
              <p className="text-sm text-muted-foreground">
                When WebSocket access is available, filters monitor live data streams. 
                Otherwise, they poll every 30 seconds to respect API rate limits.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Filter Customization</h4>
              <p className="text-sm text-muted-foreground">
                Each filter can be enabled/disabled individually. Premium thresholds 
                and other criteria are based on research from successful traders.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">GEX Integration</h4>
              <p className="text-sm text-muted-foreground">
                Monitor gamma exposure levels for any ticker to identify potential 
                squeeze scenarios and understand market maker positioning.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Alert Management</h4>
              <p className="text-sm text-muted-foreground">
                View real-time alerts with detailed information including premium, 
                size, aggressiveness, and sentiment analysis for each trade.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
