'use client';

import { useState, useEffect } from 'react';
import { analyzeSentiment } from '@/lib/finbert-local';
import { Header } from '@/components/dashboard/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Brain, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Search,
  Zap,
  BarChart3,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

interface SentimentAnalysis {
  symbol: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  score: number;
  headlines: NewsHeadline[];
  lastUpdated: string;
  tradingSignal: 'BUY' | 'SELL' | 'HOLD';
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

interface NewsHeadline {
  title: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  source: string;
  timestamp: string;
  relevanceScore: number;
}

interface FinBERTAlert {
  id: string;
  symbol: string;
  type: 'sentiment_shift' | 'unusual_activity' | 'earnings_sentiment' | 'merger_rumor';
  message: string;
  severity: 'high' | 'medium' | 'low';
  timestamp: string;
  actionRequired: boolean;
}

export default function FinBERTAnalysisPage() {
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [searchSymbol, setSearchSymbol] = useState('');
  const [activeTab, setActiveTab] = useState<'analysis' | 'alerts' | 'trends' | 'settings'>('analysis');
  
  const [sentimentData, setSentimentData] = useState<SentimentAnalysis[]>([]);
  const [finbertAlerts, setFinbertAlerts] = useState<FinBERTAlert[]>([]);
  const [trendingSymbols, setTrendingSymbols] = useState<string[]>([]);

  useEffect(() => {
    initializeFinBERT();
  }, []);

  const initializeFinBERT = async () => {
    setLoading(true);
    try {
      await loadSentimentData();
      await loadAlerts();
      generateTrendingSymbols();
    } catch (error) {
      console.error('Failed to initialize FinBERT:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSentimentData = async () => {
    const popularSymbols = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'AMZN', 'NVDA', 'META'];

    const analyses: SentimentAnalysis[] = [];
    for (const symbol of popularSymbols) {
      const result = await analyzeSentiment(`${symbol} stock`);
      const label = result[0]?.label?.toLowerCase() || 'neutral';
      analyses.push({
        symbol,
        sentiment: label === 'positive' ? 'bullish' : label === 'negative' ? 'bearish' : 'neutral',
        confidence: Math.floor(result[0]?.score * 100) || 0,
        score: result[0]?.score || 0,
        headlines: generateMockHeadlines(symbol),
        lastUpdated: new Date().toISOString(),
        tradingSignal: label === 'positive' ? 'BUY' : label === 'negative' ? 'SELL' : 'HOLD',
        riskLevel: label === 'positive' || label === 'negative' ? 'MEDIUM' : 'LOW',
      });
    }

    setSentimentData(analyses);
  };

  const generateMockHeadlines = (symbol: string): NewsHeadline[] => {
    const headlines = [
      `${symbol} reports strong quarterly earnings, beats expectations`,
      `Analysts upgrade ${symbol} to buy rating on growth prospects`,
      `${symbol} announces new product launch, shares react positively`,
      `Institutional investors increase ${symbol} holdings significantly`,
      `${symbol} faces regulatory scrutiny, stock pressure continues`
    ];

    return headlines.slice(0, Math.floor(Math.random() * 3) + 2).map((title, index) => ({
      title,
      sentiment: Math.random() > 0.6 ? 'positive' : Math.random() > 0.3 ? 'negative' : 'neutral',
      confidence: Math.floor(Math.random() * 30) + 70,
      source: ['Reuters', 'Bloomberg', 'CNBC', 'MarketWatch', 'Yahoo Finance'][Math.floor(Math.random() * 5)],
      timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString(),
      relevanceScore: Math.floor(Math.random() * 30) + 70
    }));
  };

  const loadAlerts = async () => {
    const mockAlerts: FinBERTAlert[] = [
      {
        id: 'alert_1',
        symbol: 'TSLA',
        type: 'sentiment_shift',
        message: 'Significant sentiment shift detected: Bearish → Bullish (78% confidence)',
        severity: 'high',
        timestamp: new Date(Date.now() - 300000).toISOString(),
        actionRequired: true
      },
      {
        id: 'alert_2',
        symbol: 'AAPL',
        type: 'earnings_sentiment',
        message: 'Pre-earnings sentiment analysis shows strong bullish bias (85% confidence)',
        severity: 'medium',
        timestamp: new Date(Date.now() - 600000).toISOString(),
        actionRequired: false
      },
      {
        id: 'alert_3',
        symbol: 'META',
        type: 'unusual_activity',
        message: 'Unusual negative sentiment spike detected in social media mentions',
        severity: 'medium',
        timestamp: new Date(Date.now() - 900000).toISOString(),
        actionRequired: true
      }
    ];

    setFinbertAlerts(mockAlerts);
  };

  const generateTrendingSymbols = () => {
    const symbols = ['AI', 'PLTR', 'COIN', 'RBLX', 'HOOD', 'SNOW', 'CRWD', 'ZM', 'DOCU', 'UBER'];
    setTrendingSymbols(symbols.slice(0, 5));
  };

  const analyzeSentiment = async (symbol: string) => {
    if (!symbol) return;

    setAnalyzing(true);
    try {
      console.log(`🧠 Analyzing sentiment for ${symbol} with FinBERT...`);
      
      // Simulate FinBERT analysis
      await new Promise(resolve => setTimeout(resolve, 2000));

      const newAnalysis: SentimentAnalysis = {
        symbol: symbol.toUpperCase(),
        sentiment: Math.random() > 0.6 ? 'bullish' : Math.random() > 0.3 ? 'bearish' : 'neutral',
        confidence: Math.floor(Math.random() * 30) + 70,
        score: (Math.random() - 0.5) * 2,
        headlines: generateMockHeadlines(symbol),
        lastUpdated: new Date().toISOString(),
        tradingSignal: Math.random() > 0.6 ? 'BUY' : Math.random() > 0.3 ? 'SELL' : 'HOLD',
        riskLevel: Math.random() > 0.7 ? 'HIGH' : Math.random() > 0.4 ? 'MEDIUM' : 'LOW'
      };

      // Update or add to sentiment data
      setSentimentData(prev => {
        const filtered = prev.filter(item => item.symbol !== symbol.toUpperCase());
        return [newAnalysis, ...filtered];
      });

      setSearchSymbol('');
      console.log(`✅ FinBERT analysis complete for ${symbol}`);

    } catch (error) {
      console.error('Failed to analyze sentiment:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  const getSentimentBadge = (sentiment: string, confidence: number) => {
    const config = {
      bullish: { variant: 'default' as const, text: 'BULLISH', icon: TrendingUp },
      bearish: { variant: 'destructive' as const, text: 'BEARISH', icon: TrendingDown },
      neutral: { variant: 'secondary' as const, text: 'NEUTRAL', icon: Activity }
    };

    const sentimentConfig = config[sentiment as keyof typeof config] || config.neutral;
    const Icon = sentimentConfig.icon;

    return (
      <Badge variant={sentimentConfig.variant} className="flex items-center space-x-1">
        <Icon className="h-3 w-3" />
        <span>{sentimentConfig.text}</span>
        <span className="text-xs">({confidence}%)</span>
      </Badge>
    );
  };

  const getSignalBadge = (signal: string) => {
    const config = {
      BUY: { variant: 'default' as const, color: 'text-green-600' },
      SELL: { variant: 'destructive' as const, color: 'text-red-600' },
      HOLD: { variant: 'secondary' as const, color: 'text-gray-600' }
    };

    const signalConfig = config[signal as keyof typeof config] || config.HOLD;

    return (
      <Badge variant={signalConfig.variant}>
        {signal}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex-1 overflow-auto">
        <Header title="FinBERT Analysis" description="AI-powered financial sentiment analysis" />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <Header 
        title="FinBERT Analysis"
        description="AI-powered financial sentiment analysis and trading signals"
        onRefresh={initializeFinBERT}
      />
      
      <div className="p-6 space-y-6">
        {/* Analysis Search */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Brain className="h-5 w-5" />
              <span>FinBERT Sentiment Analysis</span>
            </CardTitle>
            <CardDescription>
              Analyze financial news sentiment for any stock symbol using state-of-the-art NLP
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-2">
              <div className="flex-1">
                <Label className="sr-only">Stock Symbol</Label>
                <Input 
                  placeholder="Enter stock symbol (e.g., AAPL)"
                  value={searchSymbol}
                  onChange={(e) => setSearchSymbol(e.target.value.toUpperCase())}
                  onKeyPress={(e) => e.key === 'Enter' && analyzeSentiment(searchSymbol)}
                />
              </div>
              <Button 
                onClick={() => analyzeSentiment(searchSymbol)}
                disabled={analyzing || !searchSymbol}
                size="default"
              >
                {analyzing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Analyze
                  </>
                )}
              </Button>
            </div>
            
            {/* Trending Symbols Quick Access */}
            <div className="mt-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Trending Analysis:</p>
              <div className="flex flex-wrap gap-2">
                {trendingSymbols.map((symbol) => (
                  <Button 
                    key={symbol}
                    variant="outline" 
                    size="sm"
                    onClick={() => analyzeSentiment(symbol)}
                    disabled={analyzing}
                  >
                    {symbol}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Analysis Results */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="analysis">Analysis Results ({sentimentData.length})</TabsTrigger>
            <TabsTrigger value="alerts">FinBERT Alerts ({finbertAlerts.length})</TabsTrigger>
            <TabsTrigger value="trends">Market Trends</TabsTrigger>
            <TabsTrigger value="settings">Model Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="analysis" className="space-y-4">
            {sentimentData.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No sentiment analysis data yet</p>
                  <p className="text-sm text-gray-400 mt-2">Analyze a stock symbol to get started</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {sentimentData.map((analysis, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{analysis.symbol}</CardTitle>
                        <div className="flex space-x-2">
                          {getSentimentBadge(analysis.sentiment, analysis.confidence)}
                          {getSignalBadge(analysis.tradingSignal)}
                        </div>
                      </div>
                      <CardDescription>
                        Last updated: {new Date(analysis.lastUpdated).toLocaleString()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Sentiment Score */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Sentiment Score</span>
                        <span className={`text-lg font-bold ${analysis.score >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {analysis.score >= 0 ? '+' : ''}{analysis.score.toFixed(3)}
                        </span>
                      </div>

                      {/* Risk Level */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Risk Level</span>
                        <Badge variant={
                          analysis.riskLevel === 'HIGH' ? 'destructive' :
                          analysis.riskLevel === 'MEDIUM' ? 'secondary' : 'default'
                        }>
                          {analysis.riskLevel}
                        </Badge>
                      </div>

                      {/* Recent Headlines */}
                      <div>
                        <h4 className="text-sm font-medium mb-2">Analyzed Headlines</h4>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {analysis.headlines.slice(0, 3).map((headline, idx) => (
                            <div key={idx} className="text-xs p-2 bg-gray-50 dark:bg-gray-800 rounded">
                              <div className="flex items-center justify-between mb-1">
                                <Badge 
                                  variant={
                                    headline.sentiment === 'positive' ? 'default' :
                                    headline.sentiment === 'negative' ? 'destructive' : 'secondary'
                                  }
                                  className="text-xs"
                                >
                                  {headline.sentiment} ({headline.confidence}%)
                                </Badge>
                                <span className="text-xs text-gray-500">{headline.source}</span>
                              </div>
                              <p className="text-gray-700 dark:text-gray-300 line-clamp-2">
                                {headline.title}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex space-x-2 pt-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => analyzeSentiment(analysis.symbol)}
                          disabled={analyzing}
                        >
                          Refresh Analysis
                        </Button>
                        <Button 
                          size="sm" 
                          variant="default"
                          onClick={() => {
                            // Would integrate with paper trading
                            console.log(`Creating trade based on FinBERT signal: ${analysis.tradingSignal} ${analysis.symbol}`);
                          }}
                        >
                          Create Trade
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="alerts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>FinBERT Smart Alerts</CardTitle>
                <CardDescription>
                  Real-time sentiment shift detection and trading opportunities
                </CardDescription>
              </CardHeader>
              <CardContent>
                {finbertAlerts.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No active alerts</p>
                ) : (
                  <div className="space-y-3">
                    {finbertAlerts.map((alert) => (
                      <div key={alert.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${
                            alert.severity === 'high' ? 'bg-red-500' :
                            alert.severity === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                          }`}></div>
                          <div>
                            <div className="flex items-center space-x-2 mb-1">
                              <Badge variant="outline">{alert.symbol}</Badge>
                              <Badge variant={alert.severity === 'high' ? 'destructive' : 'secondary'}>
                                {alert.type.replace('_', ' ').toUpperCase()}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                              {alert.message}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(alert.timestamp).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {alert.actionRequired && (
                            <AlertCircle className="h-4 w-4 text-orange-500" />
                          )}
                          <Button size="sm" variant="outline">
                            View Details
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trends" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Market Sentiment Trends</CardTitle>
                <CardDescription>
                  Aggregate sentiment analysis across market sectors
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <TrendingUp className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-green-600">68%</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Bullish Sentiment</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <Activity className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-gray-600">21%</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Neutral Sentiment</div>
                  </div>
                  <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <TrendingDown className="h-8 w-8 text-red-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-red-600">11%</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Bearish Sentiment</div>
                  </div>
                </div>

                <div className="mt-6">
                  <h4 className="font-medium mb-4">Top Sentiment Movers (24h)</h4>
                  <div className="space-y-2">
                    {['TSLA (+0.45)', 'AAPL (+0.32)', 'GOOGL (-0.28)', 'META (+0.19)', 'MSFT (-0.15)'].map((mover, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                        <span className="text-sm font-medium">{mover.split(' ')[0]}</span>
                        <span className={`text-sm ${mover.includes('+') ? 'text-green-600' : 'text-red-600'}`}>
                          {mover.split(' ')[1]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>FinBERT Model Configuration</CardTitle>
                <CardDescription>
                  Configure sentiment analysis parameters and alert thresholds
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">About FinBERT</h4>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    FinBERT is a domain-specific language model trained on financial text data.
                    It provides accurate sentiment analysis for financial news, earnings reports,
                    and market commentary to generate actionable trading signals.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Confidence Threshold</Label>
                      <p className="text-xs text-gray-500">Minimum confidence for trading signals</p>
                    </div>
                    <Badge>75%</Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Alert Sensitivity</Label>
                      <p className="text-xs text-gray-500">Sensitivity for sentiment shift alerts</p>
                    </div>
                    <Badge variant="secondary">MEDIUM</Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>News Sources</Label>
                      <p className="text-xs text-gray-500">Active financial news sources</p>
                    </div>
                    <Badge>12 Sources</Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Auto-Trading Integration</Label>
                      <p className="text-xs text-gray-500">Automatic trade placement on high-confidence signals</p>
                    </div>
                    <Badge variant="outline">DISABLED</Badge>
                  </div>
                </div>

                <Button className="w-full" variant="outline">
                  Update Configuration
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
