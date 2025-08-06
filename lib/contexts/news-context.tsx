
'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface NewsItem {
  id: string;
  title: string;
  content?: string;
  source: string;
  timestamp: string;
  url?: string;
  tickers_mentioned?: string[];
  sentiment_score?: number;
  market_impact_score?: number;
}

interface NewsContextType {
  news: NewsItem[];
  loading: boolean;
  fetchNewsForTickers: (tickers: string[], context?: 'watchlist' | 'earnings') => Promise<void>;
  fetchGeneralNews: () => Promise<void>;
  clearNews: () => void;
}

const NewsContext = createContext<NewsContextType | undefined>(undefined);

export function NewsProvider({ children }: { children: ReactNode }) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNewsForTickers = useCallback(async (tickers: string[], context?: 'watchlist' | 'earnings') => {
    if (tickers.length === 0) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/data/news?tickers=${tickers.join(',')}&limit=30&hours=48&min_impact_score=${context === 'earnings' ? '5' : '0'}`);
      
      if (response.ok) {
        const data = await response.json();
        const newsItems = data.news || [];
        
        // Update news state, avoiding duplicates
        setNews(prevNews => {
          const existingIds = new Set(prevNews.map(item => item.id));
          const newItems = newsItems.filter((item: NewsItem) => !existingIds.has(item.id));
          return [...newItems, ...prevNews].slice(0, 100); // Keep only latest 100 items
        });

        // Send browser notification if new relevant news found
        if (context && newsItems.length > 0 && 'Notification' in window) {
          if (Notification.permission === 'granted') {
            new Notification(`New ${context} news available`, {
              body: `${newsItems.length} articles found for ${tickers.join(', ')}`,
              icon: '/favicon.ico'
            });
          } else if (Notification.permission !== 'denied') {
            Notification.requestPermission().then(permission => {
              if (permission === 'granted') {
                new Notification(`New ${context} news available`, {
                  body: `${newsItems.length} articles found for ${tickers.join(', ')}`,
                  icon: '/favicon.ico'
                });
              }
            });
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch news for tickers:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchGeneralNews = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/data/news?limit=50&hours=24');
      
      if (response.ok) {
        const data = await response.json();
        setNews(data.news || []);
      }
    } catch (error) {
      console.error('Failed to fetch general news:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearNews = useCallback(() => {
    setNews([]);
  }, []);

  const value = {
    news,
    loading,
    fetchNewsForTickers,
    fetchGeneralNews,
    clearNews
  };

  return (
    <NewsContext.Provider value={value}>
      {children}
    </NewsContext.Provider>
  );
}

export function useNews() {
  const context = useContext(NewsContext);
  if (!context) {
    throw new Error('useNews must be used within a NewsProvider');
  }
  return context;
}
