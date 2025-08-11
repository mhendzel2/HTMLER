'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/dashboard/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatPercent } from '@/lib/utils';

interface EarningsMove {
  ticker: string;
  movePercent: number;
  moveAmount: number;
  earningsDate: string;
  options?: any[];
}

export default function HistoricalEarningsAnalysisPage() {
  const [loading, setLoading] = useState(true);
  const [earningsMoves, setEarningsMoves] = useState<EarningsMove[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEarningsMovers = async () => {
      setLoading(true);
      setError(null);
      try {
        // Example: Replace with your real API endpoint for earnings movers
        const res = await fetch('/api/earnings/movers?period=7d&move=5');
        if (!res.ok) throw new Error('Failed to fetch earnings movers');
        const data = await res.json();
        setEarningsMoves(data.movers || []);
      } catch (err: any) {
        setError(err.message || 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    fetchEarningsMovers();
  }, []);

  return (
    <div className="flex-1 overflow-auto">
      <Header title="Historical Earnings Movers Analysis" description="Identify tickers with large earnings moves and analyze their options chains for predictive signatures." />
      <div className="p-6 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="text-red-600">{error}</div>
        ) : earningsMoves.length === 0 ? (
          <div className="text-gray-500">No large earnings movers found in the past week.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {earningsMoves.map(move => (
              <Card key={move.ticker}>
                <CardHeader>
                  <CardTitle>{move.ticker}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-2">
                    <span className="font-medium">Earnings Date:</span> {move.earningsDate}
                  </div>
                  <div className="mb-2">
                    <span className="font-medium">Move:</span> {formatPercent(move.movePercent)} ({formatCurrency(move.moveAmount)})
                  </div>
                  {/* Optionally, display options chain analysis here */}
                  {move.options && move.options.length > 0 && (
                    <div className="mt-2">
                      <span className="font-medium">Options Chain:</span>
                      <ul className="list-disc ml-6">
                        {move.options.map((opt, i) => (
                          <li key={i}>{JSON.stringify(opt)}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
