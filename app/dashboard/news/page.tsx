
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Search, ExternalLink, Newspaper, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NewsItem {
  id: string;
  title: string;
  description: string;
  url: string;
  source: string;
  published_at: string;
  ticker_symbols: string[];
  sentiment: string;
  relevance_score: number;
}

export default function NewsPage() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTicker, setSearchTicker] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  const fetchNews = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTicker) params.append('ticker', searchTicker);
      params.append('limit', '50');

      const response = await fetch(`/api/news?${params}`);
      if (response.ok) {
        const data = await response.json();
        setNews(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching news:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchNews, 5 * 60 * 1000); // 5 minutes
      setRefreshInterval(interval);
    } else {
      if (refreshInterval) {
        clearInterval(refreshInterval);
        setRefreshInterval(null);
      }
    }

    return () => {
      if (refreshInterval) clearInterval(refreshInterval);
    };
  }, [autoRefresh]);

  const handleSearch = () => {
    fetchNews();
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment?.toLowerCase()) {
      case 'positive':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'negative':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'neutral':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getRelevanceColor = (score: number) => {
    if (score >= 0.8) return 'bg-green-500';
    if (score >= 0.6) return 'bg-yellow-500';
    if (score >= 0.4) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const timeAgo = (dateString: string) => {
    const now = new Date();
    const publishedAt = new Date(dateString);
    const diffInMilliseconds = now.getTime() - publishedAt.getTime();
    const diffInHours = Math.floor(diffInMilliseconds / (1000 * 60 * 60));
    const diffInMinutes = Math.floor(diffInMilliseconds / (1000 * 60));

    if (diffInHours >= 24) {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    } else if (diffInHours >= 1) {
      return `${diffInHours}h ago`;
    } else if (diffInMinutes >= 1) {
      return `${diffInMinutes}m ago`;
    } else {
      return 'Just now';
    }
  };

  return (
    <div className="flex-1 space-y-6 p-8 overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">News & Headlines</h2>
          <p className="text-muted-foreground">
            Latest financial news and market updates
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={cn(
              autoRefresh && "bg-green-50 border-green-200 text-green-700"
            )}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Auto Refresh {autoRefresh ? 'On' : 'Off'}
          </Button>
          <Button onClick={fetchNews} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <Input
                placeholder="Filter by ticker symbol (optional)..."
                value={searchTicker}
                onChange={(e) => setSearchTicker(e.target.value.toUpperCase())}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch} disabled={loading}>
              <Search className="h-4 w-4 mr-2" />
              Filter
            </Button>
            {searchTicker && (
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTicker('');
                  setTimeout(fetchNews, 100);
                }}
              >
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* News Feed */}
      <div className="space-y-4">
        {loading ? (
          <Card>
            <CardContent className="p-8 text-center">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-4" />
              <p>Loading latest news...</p>
            </CardContent>
          </Card>
        ) : news.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <Newspaper className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No news articles found.</p>
              {searchTicker && (
                <p className="text-sm mt-2">Try removing the ticker filter or searching for a different symbol.</p>
              )}
            </CardContent>
          </Card>
        ) : (
          news.map((article, index) => (
            <Card key={article.id || index} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <Newspaper className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        {article.source}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">
                          {timeAgo(article.published_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {article.relevance_score && (
                      <div className="flex items-center space-x-1">
                        <div 
                          className={cn(
                            "w-2 h-2 rounded-full",
                            getRelevanceColor(article.relevance_score)
                          )}
                        />
                        <span className="text-xs text-muted-foreground">
                          {Math.round(article.relevance_score * 100)}%
                        </span>
                      </div>
                    )}
                    {article.sentiment && (
                      <Badge className={getSentimentColor(article.sentiment)}>
                        {article.sentiment}
                      </Badge>
                    )}
                  </div>
                </div>

                <h3 className="text-lg font-semibold mb-2 leading-tight">
                  {article.title}
                </h3>

                {article.description && (
                  <p className="text-muted-foreground mb-4 line-clamp-3">
                    {article.description}
                  </p>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {article.ticker_symbols && article.ticker_symbols.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {article.ticker_symbols.slice(0, 5).map((ticker) => (
                          <Badge key={ticker} variant="outline" className="text-xs">
                            {ticker}
                          </Badge>
                        ))}
                        {article.ticker_symbols.length > 5 && (
                          <Badge variant="outline" className="text-xs">
                            +{article.ticker_symbols.length - 5} more
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {article.url && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(article.url, '_blank')}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Read More
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
