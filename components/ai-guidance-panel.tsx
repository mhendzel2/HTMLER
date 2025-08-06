'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Brain, TrendingUp, TrendingDown, AlertTriangle, Lightbulb, RefreshCw, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TradeIdea {
  ticker: string;
  direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  strategy: string;
  rationale: string;
  confidence: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  timeframe: string;
  entryPrice?: number;
  targetPrice?: number;
  stopLoss?: number;
  keyFactors: string[];
}

interface AIGuidancePanelProps {
  earningsData?: any[];
  marketData?: any;
  alertsData?: any[];
  className?: string;
}

export function AIGuidancePanel({ earningsData, marketData, alertsData, className }: AIGuidancePanelProps) {
  const [tradeIdeas, setTradeIdeas] = useState<TradeIdea[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAnalysis, setSelectedAnalysis] = useState<'earnings' | 'market' | 'alerts'>('earnings');
  const [expandedIdea, setExpandedIdea] = useState<number | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');

  const generateAnalysis = async (type: string, data: any, context?: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          data,
          context,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        return result.tradeIdea;
      }
    } catch (error) {
      console.error('Failed to generate analysis:', error);
    } finally {
      setLoading(false);
    }
    return null;
  };

  const analyzeEarnings = async () => {
    if (!earningsData || earningsData.length === 0) return;
    
    const ideas: TradeIdea[] = [];
    
    // Analyze top 3 earnings plays
    for (const earnings of earningsData.slice(0, 3)) {
      const idea = await generateAnalysis('earnings', earnings);
      if (idea) {
        ideas.push(idea);
      }
    }
    
    setTradeIdeas(ideas);
  };

  const analyzeMarket = async () => {
    if (!marketData) return;
    
    const idea = await generateAnalysis('market', marketData, 'market_overview');
    if (idea) {
      setTradeIdeas([idea]);
    }
  };

  const analyzeAlerts = async () => {
    if (!alertsData || alertsData.length === 0) return;
    
    const ideas: TradeIdea[] = [];
    
    // Analyze top 3 unusual alerts
    for (const alert of alertsData.slice(0, 3)) {
      const idea = await generateAnalysis('alert', alert);
      if (idea) {
        ideas.push(idea);
      }
    }
    
    setTradeIdeas(ideas);
  };

  const analyzeCustom = async () => {
    if (!customPrompt.trim()) return;
    
    const customData = {
      customQuery: customPrompt,
      marketData,
      earningsData: earningsData?.slice(0, 5),
      alertsData: alertsData?.slice(0, 5),
    };
    
    const idea = await generateAnalysis('general', customData, 'custom_analysis');
    if (idea) {
      setTradeIdeas([idea]);
    }
  };

  const handleAnalysisChange = (value: 'earnings' | 'market' | 'alerts') => {
    setSelectedAnalysis(value);
    setTradeIdeas([]);
    setExpandedIdea(null);
  };

  const runAnalysis = () => {
    switch (selectedAnalysis) {
      case 'earnings':
        analyzeEarnings();
        break;
      case 'market':
        analyzeMarket();
        break;
      case 'alerts':
        analyzeAlerts();
        break;
    }
  };

  const getDirectionIcon = (direction: string) => {
    switch (direction) {
      case 'BULLISH':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'BEARISH':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getDirectionColor = (direction: string) => {
    switch (direction) {
      case 'BULLISH':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'BEARISH':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'LOW':
        return 'bg-green-100 text-green-800';
      case 'HIGH':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 8) return 'bg-green-100 text-green-800';
    if (confidence >= 6) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Brain className="h-5 w-5 text-blue-600" />
            <CardTitle>AI Trading Guidance</CardTitle>
          </div>
          <Button
            onClick={runAnalysis}
            disabled={loading}
            size="sm"
            className="flex items-center space-x-1"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            <span>Analyze</span>
          </Button>
        </div>
        <CardDescription>
          AI-powered trade ideas and market insights based on real-time data
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Analysis Type Selector */}
        <div className="flex items-center space-x-4">
          <Select value={selectedAnalysis} onValueChange={handleAnalysisChange}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select analysis type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="earnings">Earnings Analysis</SelectItem>
              <SelectItem value="market">Market Overview</SelectItem>
              <SelectItem value="alerts">Alert Analysis</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Custom Prompt */}
        <div className="space-y-2">
          <Textarea
            placeholder="Ask AI about specific tickers, strategies, or market conditions..."
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            className="min-h-[80px]"
          />
          <Button onClick={analyzeCustom} disabled={loading || !customPrompt.trim()} size="sm">
            <Lightbulb className="h-4 w-4 mr-2" />
            Custom Analysis
          </Button>
        </div>

        <Separator />

        {/* Trade Ideas */}
        <div className="space-y-4">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
              <span className="ml-2 text-sm text-gray-600">Generating AI insights...</span>
            </div>
          )}

          {tradeIdeas.length === 0 && !loading && (
            <div className="text-center py-8">
              <Brain className="h-12 w-12 mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-500">Click "Analyze" to generate AI-powered trade ideas</p>
            </div>
          )}

          {tradeIdeas.map((idea, index) => (
            <Card key={index} className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="font-mono">
                      {idea.ticker}
                    </Badge>
                    <Badge className={getDirectionColor(idea.direction)}>
                      {getDirectionIcon(idea.direction)}
                      <span className="ml-1">{idea.direction}</span>
                    </Badge>
                    <Badge className={getConfidenceColor(idea.confidence)}>
                      {idea.confidence}/10
                    </Badge>
                    <Badge className={getRiskColor(idea.riskLevel)}>
                      {idea.riskLevel} RISK
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpandedIdea(expandedIdea === index ? null : index)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
                <CardTitle className="text-lg">{idea.strategy}</CardTitle>
                <CardDescription className="text-sm">
                  {idea.timeframe}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-3">{idea.rationale}</p>
                
                {expandedIdea === index && (
                  <div className="space-y-3 pt-3 border-t">
                    <div>
                      <h4 className="font-medium text-sm mb-2">Key Factors:</h4>
                      <ul className="space-y-1">
                        {idea.keyFactors.map((factor, factorIndex) => (
                          <li key={factorIndex} className="text-sm text-gray-600 flex items-start">
                            <span className="text-blue-500 mr-2">•</span>
                            {factor}
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    {(idea.entryPrice || idea.targetPrice || idea.stopLoss) && (
                      <div>
                        <h4 className="font-medium text-sm mb-2">Price Levels:</h4>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          {idea.entryPrice && (
                            <div>
                              <span className="text-gray-500">Entry:</span>
                              <span className="ml-1 font-medium">${idea.entryPrice}</span>
                            </div>
                          )}
                          {idea.targetPrice && (
                            <div>
                              <span className="text-gray-500">Target:</span>
                              <span className="ml-1 font-medium text-green-600">${idea.targetPrice}</span>
                            </div>
                          )}
                          {idea.stopLoss && (
                            <div>
                              <span className="text-gray-500">Stop:</span>
                              <span className="ml-1 font-medium text-red-600">${idea.stopLoss}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
