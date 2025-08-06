
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Header } from '@/components/dashboard/header';
import { cn } from '@/lib/utils';
import { Plus, Trash2, Star, Edit2, TrendingUp, TrendingDown } from 'lucide-react';

interface WatchlistData {
  id: string;
  name: string;
  description?: string;
  isDefault: boolean;
  items: WatchlistItem[];
}

interface WatchlistItem {
  id: string;
  stock: {
    ticker: string;
    companyName?: string;
    sector?: string;
  };
  notes?: string;
}

interface StockQuote {
  ticker: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
}

// Utility functions
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
};

const formatPercent = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value / 100);
};

const isValidTicker = (ticker: string) => {
  return /^[A-Z]{1,5}$/.test(ticker);
};

export default function WatchlistPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [watchlists, setWatchlists] = useState<WatchlistData[]>([]);
  const [activeWatchlist, setActiveWatchlist] = useState<string>('');
  const [stockQuotes, setStockQuotes] = useState<Record<string, StockQuote>>({});
  const [newTicker, setNewTicker] = useState('');
  const [addingStock, setAddingStock] = useState(false);

  const fetchWatchlists = async () => {
    setRefreshing(true);
    try {
      const response = await fetch('/api/watchlist');
      if (response.ok) {
        const data = await response.json();
        setWatchlists(data);
        
        // Set active watchlist to default or first one
        const defaultWatchlist = data.find((w: WatchlistData) => w.isDefault);
        if (defaultWatchlist) {
          setActiveWatchlist(defaultWatchlist.id);
        } else if (data.length > 0) {
          setActiveWatchlist(data[0].id);
        }
        
        // Fetch quotes for all stocks
        const allTickers = data.flatMap((w: WatchlistData) => 
          w.items.map((item: WatchlistItem) => item.stock.ticker)
        );
        await fetchStockQuotes(allTickers);
      }
    } catch (error) {
      console.error('Failed to fetch watchlists:', error);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  const fetchStockQuotes = async (tickers: string[]) => {
    if (tickers.length === 0) return;
    
    try {
      // Fetch real stock data from API
      const quotes: Record<string, StockQuote> = {};
      
      // Fetch data for each ticker
      const promises = tickers.map(async (ticker) => {
        try {
          const response = await fetch(`/api/stocks/${ticker}?type=state`);
          if (response.ok) {
            const data = await response.json();
            // Map API response to our StockQuote interface
            if (data) {
              quotes[ticker] = {
                ticker: ticker,
                price: data.last_price || 0,
                change: data.change || 0,
                changePercent: data.change_percent || 0,
                volume: data.volume || 0,
              };
            }
          }
        } catch (error) {
          console.error(`Failed to fetch quote for ${ticker}:`, error);
          // Don't add mock data - leave blank to show no data available
        }
      });

      await Promise.all(promises);
      setStockQuotes(quotes);
    } catch (error) {
      console.error('Failed to fetch stock quotes:', error);
      setStockQuotes({}); // Set empty object instead of mock data on error
    }
  };

  const addStockToWatchlist = async (ticker: string) => {
    if (!ticker.trim() || !isValidTicker(ticker)) return;
    
    setAddingStock(true);
    try {
      const response = await fetch(`/api/watchlist/${activeWatchlist}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticker: ticker.toUpperCase(),
        }),
      });

      if (response.ok) {
        setNewTicker('');
        await fetchWatchlists(); // Refresh the watchlists
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to add stock');
      }
    } catch (error) {
      console.error('Failed to add stock:', error);
      alert('Failed to add stock');
    } finally {
      setAddingStock(false);
    }
  };

  const removeStockFromWatchlist = async (itemId: string) => {
    try {
      const response = await fetch(`/api/watchlist/${activeWatchlist}/items/${itemId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchWatchlists(); // Refresh the watchlists
      }
    } catch (error) {
      console.error('Failed to remove stock:', error);
    }
  };

  useEffect(() => {
    fetchWatchlists();
  }, []);

  const currentWatchlist = watchlists.find(w => w.id === activeWatchlist);

  if (loading) {
    return (
      <div className="flex-1 overflow-auto">
        <Header title="Watchlists" description="Manage your stock watchlists" />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <Header 
        title="Watchlists"
        description="Manage and monitor your stock watchlists"
        onRefresh={fetchWatchlists}
        refreshing={refreshing}
      />
      
      <div className="p-6 space-y-6">
        {/* Watchlist Tabs */}
        <div className="flex items-center justify-between">
          <div className="flex space-x-2">
            {watchlists.map(watchlist => (
              <button
                key={watchlist.id}
                onClick={() => setActiveWatchlist(watchlist.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeWatchlist === watchlist.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <div className="flex items-center space-x-2">
                  {watchlist.isDefault && <Star className="h-4 w-4" />}
                  <span>{watchlist.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {watchlist.items.length}
                  </Badge>
                </div>
              </button>
            ))}
          </div>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => alert('Create new watchlist functionality coming soon!')}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Watchlist
          </Button>
        </div>

        {/* Add Stock */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Add Stock to {currentWatchlist?.name}</CardTitle>
            <CardDescription>
              Enter a stock ticker to add it to your watchlist
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-2">
              <Input
                placeholder="Enter ticker symbol (e.g., AAPL)"
                value={newTicker}
                onChange={(e) => setNewTicker(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    addStockToWatchlist(newTicker);
                  }
                }}
                disabled={addingStock}
              />
              <Button 
                onClick={() => addStockToWatchlist(newTicker)}
                disabled={!newTicker.trim() || !isValidTicker(newTicker) || addingStock}
              >
                {addingStock ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Watchlist Stocks */}
        <div className="space-y-4">
          {currentWatchlist?.items.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center h-32">
                <div className="text-center">
                  <Star className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">Your watchlist is empty</p>
                  <p className="text-sm text-gray-400">Add some stocks to get started</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            currentWatchlist?.items.map(item => {
              const quote = stockQuotes[item.stock.ticker];
              const isPositive = quote?.change >= 0;
              
              return (
                <Card key={item.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                          <span className="font-bold text-blue-600 dark:text-blue-400">
                            {item.stock.ticker}
                          </span>
                        </div>
                        
                        <div>
                          <h3 className="font-semibold text-lg">{item.stock.ticker}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {item.stock.companyName || 'Loading...'}
                          </p>
                          {item.stock.sector && (
                            <Badge variant="outline" className="mt-1">
                              {item.stock.sector}
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      {quote && (
                        <div className="flex items-center space-x-8">
                          <div className="text-right">
                            <p className="text-sm text-gray-500">Price</p>
                            <p className="text-2xl font-bold">{formatCurrency(quote.price)}</p>
                          </div>
                          
                          <div className="text-right">
                            <p className="text-sm text-gray-500">Change</p>
                            <div className={`flex items-center space-x-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                              {isPositive ? (
                                <TrendingUp className="h-4 w-4" />
                              ) : (
                                <TrendingDown className="h-4 w-4" />
                              )}
                              <span className="font-semibold">
                                {formatCurrency(Math.abs(quote.change))} ({formatPercent(Math.abs(quote.changePercent))})
                              </span>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <p className="text-sm text-gray-500">Volume</p>
                            <p className="font-semibold">{(quote.volume / 1000000).toFixed(1)}M</p>
                          </div>
                        </div>
                      )}
                      
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => removeStockFromWatchlist(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {item.notes && (
                      <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          <strong>Notes:</strong> {item.notes}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
