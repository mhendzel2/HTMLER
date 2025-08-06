'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, AlertTriangle, Wifi } from 'lucide-react';
import { unusualWhalesWS } from '@/lib/websocket-client';

interface TestResults {
  hasWebSocketScope: boolean;
  availableChannels: string[];
  error?: string;
  serverTestResults?: any;
}

export default function WebSocketTestPage() {
  const [testResults, setTestResults] = useState<TestResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>('disconnected');
  const [detailedResults, setDetailedResults] = useState<any>(null);

  const runWebSocketTest = async () => {
    setLoading(true);
    setTestResults(null);

    try {
      console.log('Starting WebSocket test...');
      const results = await unusualWhalesWS.testWebSocketAccess();
      console.log('WebSocket test results:', results);
      setTestResults(results);
      
      // Additional test: try to access socket endpoints directly
      if (!results.hasWebSocketScope) {
        console.log('Testing alternative endpoints...');
        
        // Test if we can at least access basic socket info
        try {
          const response = await fetch('/api/test-websocket-access');
          if (response.ok) {
            const data = await response.json();
            console.log('Alternative test results:', data);
          }
        } catch (error) {
          console.log('Alternative test failed:', error);
        }
      }
    } catch (error) {
      console.error('WebSocket test error:', error);
      setTestResults({
        hasWebSocketScope: false,
        availableChannels: [],
        error: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }

    setLoading(false);
  };

  const testConnection = async () => {
    setConnectionStatus('connecting');
    const success = await unusualWhalesWS.connect();
    
    // Monitor status for a few seconds
    const statusInterval = setInterval(() => {
      const status = unusualWhalesWS.getStatus();
      setConnectionStatus(status);
      
      if (status === 'connected' || status === 'disconnected') {
        clearInterval(statusInterval);
      }
    }, 500);

    // Clean up after 10 seconds
    setTimeout(() => {
      clearInterval(statusInterval);
      unusualWhalesWS.disconnect();
      setConnectionStatus('disconnected');
    }, 10000);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'connecting':
        return <Wifi className="w-5 h-5 text-yellow-500 animate-pulse" />;
      default:
        return <XCircle className="w-5 h-5 text-red-500" />;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">WebSocket Connection Test</h1>
        <p className="text-muted-foreground">
          Test your API access to WebSocket features and real-time data streams
        </p>
      </div>

      <div className="grid gap-6">
        {/* API Scope Test */}
        <Card>
          <CardHeader>
            <CardTitle>API Scope Verification</CardTitle>
            <CardDescription>
              Check if your API key has access to WebSocket features
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={runWebSocketTest}
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Testing API Access...' : 'Test WebSocket Scope'}
            </Button>

            {testResults && (
              <div className="space-y-4">
                <Alert className={testResults.hasWebSocketScope ? 'border-green-200' : 'border-red-200'}>
                  {testResults.hasWebSocketScope ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <AlertDescription>
                    <strong>
                      {testResults.hasWebSocketScope 
                        ? 'WebSocket Access Available' 
                        : 'WebSocket Access Not Available'}
                    </strong>
                    <br />
                    {testResults.error || 
                      (testResults.hasWebSocketScope 
                        ? 'Your API key has access to real-time WebSocket features.'
                        : 'Your API plan does not include WebSocket access. The system will use polling instead.')}
                  </AlertDescription>
                </Alert>

                {testResults.hasWebSocketScope && testResults.availableChannels.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Available WebSocket Channels:</h4>
                    <div className="flex flex-wrap gap-2">
                      {testResults.availableChannels.map((channel, index) => (
                        <Badge key={index} variant="outline">
                          {channel}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Connection Test */}
        {testResults?.hasWebSocketScope && (
          <Card>
            <CardHeader>
              <CardTitle>WebSocket Connection Test</CardTitle>
              <CardDescription>
                Test real-time connection to Unusual Whales WebSocket servers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getStatusIcon(connectionStatus)}
                  <span className="font-medium">
                    Connection Status: {connectionStatus}
                  </span>
                </div>
                <Button 
                  onClick={testConnection}
                  disabled={connectionStatus === 'connecting'}
                  variant="outline"
                >
                  {connectionStatus === 'connecting' ? 'Connecting...' : 'Test Connection'}
                </Button>
              </div>

              {connectionStatus === 'connected' && (
                <Alert className="border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <AlertDescription>
                    <strong>WebSocket Connected Successfully!</strong>
                    <br />
                    Real-time data streaming is now available. Connection will auto-disconnect in 10 seconds.
                  </AlertDescription>
                </Alert>
              )}

              {connectionStatus === 'disconnected' && testResults && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    WebSocket connection failed or disconnected. This could be due to:
                    <ul className="list-disc ml-4 mt-2">
                      <li>Network connectivity issues</li>
                      <li>API key permissions</li>
                      <li>Server-side restrictions</li>
                    </ul>
                    The system will fall back to polling mode for real-time updates.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {/* Next Steps */}
        <Card>
          <CardHeader>
            <CardTitle>Next Steps</CardTitle>
            <CardDescription>
              How to proceed based on your test results
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {testResults?.hasWebSocketScope ? (
                <div className="space-y-2">
                  <h4 className="font-semibold text-green-600">✅ WebSocket Available</h4>
                  <p className="text-sm text-muted-foreground">
                    You can now use the Advanced Trading Filters with real-time monitoring. 
                    Navigate to the Trading Filters page to start monitoring institutional flow.
                  </p>
                  <Button asChild>
                    <a href="/dashboard/filters">
                      Go to Trading Filters
                    </a>
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <h4 className="font-semibold text-orange-600">⚠️ Polling Mode Only</h4>
                  <p className="text-sm text-muted-foreground">
                    Your API plan doesn't include WebSocket access, but you can still use the 
                    Trading Filters in polling mode. Updates will be fetched every 30 seconds 
                    to respect rate limits.
                  </p>
                  <Button asChild variant="outline">
                    <a href="/dashboard/filters">
                      Use Trading Filters (Polling)
                    </a>
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
