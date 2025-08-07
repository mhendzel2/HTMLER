'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/dashboard/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CheckCircle, 
  XCircle, 
  Wifi, 
  WifiOff, 
  Activity, 
  AlertTriangle,
  RefreshCw,
  Play,
  Pause,
  TrendingUp,
  TrendingDown,
  DollarSign
} from 'lucide-react';

interface DiagnosticResult {
  websocketAccess: boolean;
  apiAccess: boolean;
  realTimeData: boolean;
  lastApiCall?: Date;
  lastWebSocketAttempt?: Date;
  dataStreamActive: boolean;
  errorLog: string[];
}

interface FlowData {
  ticker: string;
  premium: number;
  volume: number;
  type: 'call' | 'put';
  timestamp: number;
  source: 'api' | 'websocket';
}

export default function DataStreamTestPage() {
  const [diagnostic, setDiagnostic] = useState<DiagnosticResult>({
    websocketAccess: false,
    apiAccess: false,
    realTimeData: false,
    dataStreamActive: false,
    errorLog: []
  });
  
  const [flowData, setFlowData] = useState<FlowData[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [totalRequests, setTotalRequests] = useState(0);

  useEffect(() => {
    runInitialDiagnostics();
  }, []);

  useEffect(() => {
    if (isMonitoring) {
      startDataStream();
    } else {
      stopDataStream();
    }
  }, [isMonitoring]);

  const runInitialDiagnostics = async () => {
    const results: DiagnosticResult = {
      websocketAccess: false,
      apiAccess: false,
      realTimeData: false,
      dataStreamActive: false,
      errorLog: []
    };

    // Test WebSocket access
    try {
      console.log('Testing WebSocket access...');
      const wsResponse = await fetch('/api/test-websocket-access');
      const wsData = await wsResponse.json();
      results.websocketAccess = wsData.hasWebSocketScope;
      results.lastWebSocketAttempt = new Date();
      
      if (!wsData.hasWebSocketScope) {
        results.errorLog.push(`WebSocket: ${wsData.message || 'Access not available'}`);
      }
    } catch (error) {
      results.errorLog.push(`WebSocket test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Test API access
    try {
      console.log('Testing API access...');
      const apiResponse = await fetch('/api/alerts/flow?symbols=AAPL&limit=1');
      const apiData = await apiResponse.json();
      results.apiAccess = apiResponse.ok;
      results.lastApiCall = new Date();
      
      if (!apiResponse.ok) {
        results.errorLog.push(`API: ${apiData.error || 'Access failed'}`);
      } else {
        results.realTimeData = apiData.metadata?.timestamp ? true : false;
      }
    } catch (error) {
      results.errorLog.push(`API test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    setDiagnostic(results);
  };

  const startDataStream = () => {
    console.log('Starting data stream monitoring...');
    
    setDiagnostic(prev => ({ ...prev, dataStreamActive: true }));

    // Start polling since WebSocket is not available
    const interval = setInterval(async () => {
      try {
        setTotalRequests(prev => prev + 1);
        
        const response = await fetch('/api/alerts/flow?symbols=AAPL,TSLA,NVDA,AMD,MSFT,SPY,QQQ&limit=20');
        
        if (response.ok) {
          const data = await response.json();
          const newFlowData = data.data.map((item: any) => ({
            ticker: item.ticker,
            premium: item.total_premium || 0,
            volume: item.volume || 0,
            type: item.type,
            timestamp: item.executed_at || Date.now(),
            source: 'api' as const
          }));

          if (newFlowData.length > 0) {
            setFlowData(prev => {
              const combined = [...newFlowData, ...prev].slice(0, 50);
              return combined;
            });
          }

          setLastUpdate(new Date());
          
          setDiagnostic(prev => ({
            ...prev,
            lastApiCall: new Date(),
            realTimeData: true
          }));
        }
      } catch (error) {
        console.error('Data stream error:', error);
        setDiagnostic(prev => ({
          ...prev,
          errorLog: [...prev.errorLog, `Stream error: ${error instanceof Error ? error.message : 'Unknown'}`].slice(-10)
        }));
      }
    }, 5000); // Poll every 5 seconds

    // Store interval for cleanup
    (window as any).dataStreamInterval = interval;
  };

  const stopDataStream = () => {
    console.log('Stopping data stream...');
    
    if ((window as any).dataStreamInterval) {
      clearInterval((window as any).dataStreamInterval);
    }
    
    setDiagnostic(prev => ({ ...prev, dataStreamActive: false }));
  };

  const formatPremium = (premium: number) => {
    if (premium >= 1000000) {
      return `$${(premium / 1000000).toFixed(2)}M`;
    } else if (premium >= 1000) {
      return `$${(premium / 1000).toFixed(0)}K`;
    }
    return `$${premium.toFixed(0)}`;
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div className="min-h-screen bg-background">
      <Header title="Real-Time Data Stream Test" />
      <div className="container mx-auto px-4 py-8 space-y-6">
        
        {/* Diagnostic Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">WebSocket Access</p>
                  <div className="flex items-center gap-2 mt-1">
                    {diagnostic.websocketAccess ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                    <span className="text-sm font-medium">
                      {diagnostic.websocketAccess ? 'Available' : 'Not Available'}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">API Access</p>
                  <div className="flex items-center gap-2 mt-1">
                    {diagnostic.apiAccess ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                    <span className="text-sm font-medium">
                      {diagnostic.apiAccess ? 'Working' : 'Failed'}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Real-Time Data</p>
                  <div className="flex items-center gap-2 mt-1">
                    {diagnostic.realTimeData ? (
                      <Activity className="w-5 h-5 text-blue-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                    <span className="text-sm font-medium">
                      {diagnostic.realTimeData ? 'Streaming' : 'No Data'}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Stream Status</p>
                  <div className="flex items-center gap-2 mt-1">
                    {diagnostic.dataStreamActive ? (
                      <RefreshCw className="w-5 h-5 text-green-500 animate-spin" />
                    ) : (
                      <Pause className="w-5 h-5 text-gray-500" />
                    )}
                    <span className="text-sm font-medium">
                      {diagnostic.dataStreamActive ? 'Active' : 'Stopped'}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Status and Controls */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Data Stream Monitor</CardTitle>
                <CardDescription>
                  Monitor real-time options flow data streams and API connectivity
                </CardDescription>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-sm text-muted-foreground">
                  API Requests: {totalRequests}
                </div>
                <Button
                  onClick={() => setIsMonitoring(!isMonitoring)}
                  variant={isMonitoring ? "destructive" : "default"}
                >
                  {isMonitoring ? (
                    <>
                      <Pause className="w-4 h-4 mr-2" />
                      Stop Stream
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Start Stream
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {flowData.length}
                </div>
                <div className="text-sm text-muted-foreground">Flow Records</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {formatPremium(flowData.reduce((sum, item) => sum + item.premium, 0))}
                </div>
                <div className="text-sm text-muted-foreground">Total Premium</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {lastUpdate ? formatTime(lastUpdate.getTime()) : '--:--'}
                </div>
                <div className="text-sm text-muted-foreground">Last Update</div>
              </div>
            </div>
            
            {!diagnostic.websocketAccess && (
              <Alert className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>WebSocket Not Available:</strong> The system is using HTTP polling to simulate real-time data.
                  This provides near real-time monitoring with 5-second intervals. WebSocket access requires a higher-tier API subscription.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Live Data Feed */}
        <Tabs defaultValue="live" className="w-full">
          <TabsList>
            <TabsTrigger value="live">Live Flow Data</TabsTrigger>
            <TabsTrigger value="diagnostics">Diagnostics</TabsTrigger>
          </TabsList>
          
          <TabsContent value="live">
            <Card>
              <CardHeader>
                <CardTitle>Live Options Flow</CardTitle>
                <CardDescription>
                  Real-time options flow data from major tickers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {flowData.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      {isMonitoring ? 'Waiting for flow data...' : 'Start monitoring to see live data'}
                    </div>
                  ) : (
                    flowData.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          {item.type === 'call' ? (
                            <TrendingUp className="w-4 h-4 text-green-500" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-red-500" />
                          )}
                          <div>
                            <div className="font-semibold">
                              {item.ticker} {item.type.toUpperCase()}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Vol: {item.volume.toLocaleString()}
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="font-semibold text-green-600">
                            {formatPremium(item.premium)}
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {item.source}
                          </Badge>
                        </div>
                        
                        <div className="text-xs text-muted-foreground">
                          {formatTime(item.timestamp)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="diagnostics">
            <Card>
              <CardHeader>
                <CardTitle>System Diagnostics</CardTitle>
                <CardDescription>
                  Detailed diagnostic information and error logs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Connection Tests</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Last WebSocket Test:</span>
                        <span className="text-sm text-muted-foreground">
                          {diagnostic.lastWebSocketAttempt?.toLocaleTimeString() || 'Not tested'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Last API Call:</span>
                        <span className="text-sm text-muted-foreground">
                          {diagnostic.lastApiCall?.toLocaleTimeString() || 'Not tested'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {diagnostic.errorLog.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">Error Log</h4>
                      <div className="bg-gray-50 p-3 rounded text-sm space-y-1">
                        {diagnostic.errorLog.map((error, index) => (
                          <div key={index} className="text-red-600">
                            {error}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <Button 
                      onClick={runInitialDiagnostics}
                      variant="outline"
                      size="sm"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Rerun Diagnostics
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
