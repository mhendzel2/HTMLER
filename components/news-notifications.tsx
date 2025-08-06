
'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, X, ExternalLink } from 'lucide-react';
import { useNews } from '@/lib/contexts/news-context';

interface NewsNotificationsProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export function NewsNotifications({ position = 'top-right' }: NewsNotificationsProps) {
  const { news } = useNews();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Show notifications for news items from the last 5 minutes
    const recentThreshold = new Date(Date.now() - 5 * 60 * 1000);
    const recentNews = news.filter(item => 
      new Date(item.timestamp) > recentThreshold && 
      !dismissed.has(item.id) &&
      (item.market_impact_score || 0) >= 6 // Only high-impact news
    ).slice(0, 3); // Show max 3 notifications

    setNotifications(recentNews);
  }, [news, dismissed]);

  const dismissNotification = (id: string) => {
    setDismissed(prev => new Set([...prev, id]));
    setNotifications(prev => prev.filter(item => item.id !== id));
  };

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4'
  };

  if (notifications.length === 0) return null;

  return (
    <div className={`fixed ${positionClasses[position]} z-50 space-y-2 max-w-md`}>
      {notifications.map((item) => (
        <Card key={item.id} className="shadow-lg border-l-4 border-l-blue-500 animate-in slide-in-from-right">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Bell className="h-4 w-4 text-blue-600" />
                <Badge variant="outline" className="text-xs">
                  Breaking News
                </Badge>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => dismissNotification(item.id)}
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            
            <h4 className="font-semibold text-sm mb-2 line-clamp-2">
              {item.title}
            </h4>
            
            {item.tickers_mentioned && item.tickers_mentioned.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {item.tickers_mentioned.slice(0, 3).map((ticker: string) => (
                  <Badge key={ticker} variant="secondary" className="text-xs">
                    {ticker}
                  </Badge>
                ))}
              </div>
            )}
            
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">{item.source}</span>
              {item.url && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(item.url, '_blank')}
                  className="h-6 text-xs"
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Read
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
