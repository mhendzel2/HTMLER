'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface EnvVars {
  hasPublicKey: boolean;
  keyLength: number;
  keyPreview: string;
}

interface Diagnostics {
  time: string;
  marketStatus: string;
  envVars: EnvVars;
  wsTest: any;
  connectionLog: string[];
}

export default function WebSocketDiagnosticPage() {
  const [diagnostics, setDiagnostics] = useState<Diagnostics>({
    time: '',
    marketStatus: '',
    envVars: { hasPublicKey: false, keyLength: 0, keyPreview: 'Not found' },
    wsTest: null,
    connectionLog: []
  });

  useEffect(() => {
    updateMarketStatus();
    checkEnvironmentVars();
  }, []);

  const updateMarketStatus = () => {
    const now = new Date();
    const est = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
    const hour = est.getHours();
    const day = est.getDay(); // 0 = Sunday, 6 = Saturday
    
    const isWeekday = day >= 1 && day <= 5;
    const isMarketHours = hour >= 9.5 && hour < 16;
    const isPremarket = hour >= 4 && hour < 9.5;
    const isAftermarket = hour >= 16 && hour < 20;
    
    let status = '';
    if (!isWeekday) {
      status = '🔴 WEEKEND - Limited activity expected';
    } else if (isMarketHours) {
      status = '🟢 MARKET HOURS - Full activity expected';
    } else if (isPremarket) {
      status = '🟡 PREMARKET - Some activity expected';
    } else if (isAftermarket) {
      status = '🟡 AFTERMARKET - Some activity expected';
    } else {
      status = '🔴 OVERNIGHT - Limited activity expected';
    }
    
    setDiagnostics(prev => ({
      ...prev,
      time: est.toLocaleString(),
      marketStatus: status
    }));
  };

  const checkEnvironmentVars = () => {
    const envCheck: EnvVars = {
      hasPublicKey: !!process.env.NEXT_PUBLIC_UNUSUAL_WHALES_API_KEY,
      keyLength: process.env.NEXT_PUBLIC_UNUSUAL_WHALES_API_KEY?.length || 0,
      keyPreview: process.env.NEXT_PUBLIC_UNUSUAL_WHALES_API_KEY?.substring(0, 8) + '...' || 'Not found'
    };
    
    setDiagnostics(prev => ({
      ...prev,
      envVars: envCheck
    }));
  };

  const addToLog = (message: string) => {
    setDiagnostics(prev => ({
      ...prev,
      connectionLog: [...prev.connectionLog, `${new Date().toLocaleTimeString()}: ${message}`]
    }));
  };

  const testDirectWebSocket = async () => {
    addToLog('🔍 Starting direct WebSocket test...');
    
    const apiKey = process.env.NEXT_PUBLIC_UNUSUAL_WHALES_API_KEY;
    if (!apiKey) {
      addToLog('❌ No API key found in environment');
      return;
    }
    
    const wsUrl = `wss://api.unusualwhales.com/ws?api_key=${apiKey}`;
    addToLog(`🔌 Connecting to: wss://api.unusualwhales.com/ws?api_key=${apiKey.substring(0, 8)}...`);
    
    try {
      const ws = new WebSocket(wsUrl);
      
      const timeout = setTimeout(() => {
        addToLog('⏰ Connection timeout (10 seconds)');
        ws.close();
      }, 10000);
      
      ws.onopen = () => {
        addToLog('✅ WebSocket connected successfully!');
        clearTimeout(timeout);
        
        // Try to subscribe
        try {
          ws.send(JSON.stringify({
            action: 'subscribe',
            channel: 'flow-alerts'
          }));
          addToLog('📡 Sent subscription to flow-alerts channel');
          
          // Listen for messages for 30 seconds
          setTimeout(() => {
            addToLog('⏰ Closing connection after 30 seconds of listening');
            ws.close();
          }, 30000);
          
        } catch (error) {
          addToLog(`❌ Failed to send subscription: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          addToLog(`📨 Received: ${JSON.stringify(data).substring(0, 100)}...`);
        } catch (error) {
          addToLog(`📨 Received raw: ${event.data.substring(0, 100)}...`);
        }
      };
      
      ws.onerror = (error) => {
        addToLog(`❌ WebSocket error: ${error}`);
        clearTimeout(timeout);
      };
      
      ws.onclose = (event) => {
        addToLog(`🔌 Connection closed: Code ${event.code} - ${event.reason || 'No reason given'}`);
        clearTimeout(timeout);
      };
      
    } catch (error) {
      addToLog(`❌ Failed to create WebSocket: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const testAPIAccess = async () => {
    addToLog('🔍 Testing API access via server endpoint...');
    
    try {
      const response = await fetch('/api/test-websocket-access');
      const data = await response.json();
      
      if (data.hasWebSocketScope) {
        addToLog('✅ Server reports WebSocket access is available');
        addToLog(`📋 Available channels: ${data.availableChannels?.join(', ')}`);
      } else {
        addToLog('❌ Server reports no WebSocket access');
        addToLog(`📋 Error: ${data.error || data.message}`);
      }
      
      setDiagnostics(prev => ({
        ...prev,
        wsTest: data
      }));
      
    } catch (error) {
      addToLog(`❌ API test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">WebSocket Diagnostic Tool</h1>
        <p className="text-muted-foreground">
          Diagnose WebSocket connection issues and market status
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Market Status</CardTitle>
            <CardDescription>Current time and market activity expectations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <strong>Current Time (EST):</strong> {diagnostics.time}
            </div>
            <div>
              <strong>Market Status:</strong> {diagnostics.marketStatus}
            </div>
            <Alert>
              <AlertDescription>
                WebSocket activity is typically highest during market hours (9:30 AM - 4:00 PM EST) 
                and may be limited on weekends or overnight.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Environment Check</CardTitle>
            <CardDescription>API key and configuration status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <strong>API Key Present:</strong> 
              <Badge variant={diagnostics.envVars.hasPublicKey ? "default" : "destructive"} className="ml-2">
                {diagnostics.envVars.hasPublicKey ? "✅ Yes" : "❌ No"}
              </Badge>
            </div>
            <div>
              <strong>Key Length:</strong> {diagnostics.envVars.keyLength} characters
            </div>
            <div>
              <strong>Key Preview:</strong> <code>{diagnostics.envVars.keyPreview}</code>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>WebSocket Tests</CardTitle>
          <CardDescription>Run diagnostic tests to identify connection issues</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={testAPIAccess} variant="outline">
              Test API Access
            </Button>
            <Button onClick={testDirectWebSocket}>
              Test Direct WebSocket
            </Button>
            <Button 
              onClick={() => setDiagnostics(prev => ({ ...prev, connectionLog: [] }))} 
              variant="ghost"
            >
              Clear Log
            </Button>
          </div>

          {diagnostics.connectionLog.length > 0 && (
            <div className="bg-black text-green-400 p-4 rounded font-mono text-sm h-64 overflow-y-auto">
              {diagnostics.connectionLog.map((log, index) => (
                <div key={index}>{log}</div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
