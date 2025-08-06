import { unusualWhalesAPI } from './unusual-whales-api';

/**
 * WebSocket Connection Manager for Unusual Whales API
 * Handles real-time streaming data for GEX, flow alerts, and price updates
 */
export class UnusualWhalesWebSocket {
  private static instance: UnusualWhalesWebSocket;
  private ws: WebSocket | null = null;
  private subscriptions: Map<string, Set<(data: any) => void>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private isConnecting = false;

  static getInstance(): UnusualWhalesWebSocket {
    if (!UnusualWhalesWebSocket.instance) {
      UnusualWhalesWebSocket.instance = new UnusualWhalesWebSocket();
    }
    return UnusualWhalesWebSocket.instance;
  }

  /**
   * Test WebSocket connectivity and scope access
   */
  async testWebSocketAccess(): Promise<{
    hasWebSocketScope: boolean;
    availableChannels: string[];
    error?: string;
  }> {
    try {
      // Use the server-side API route to test WebSocket access
      const response = await fetch('/api/test-websocket-access', {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      const data = await response.json();
      console.log('WebSocket test response:', data);

      if (data.hasWebSocketScope) {
        return {
          hasWebSocketScope: true,
          availableChannels: [
            'gex_strike_expiry:<TICKER>',
            'gex:TICKER', 
            'gex_strike:TICKER',
            'price:TICKER',
            'flow-alerts',
            'news',
            'option_trades',
            'option_trades:<TICKER>'
          ]
        };
      } else {
        return {
          hasWebSocketScope: false,
          availableChannels: [],
          error: data.message || data.error || 'WebSocket access not available'
        };
      }
    } catch (error) {
      console.error('WebSocket test error:', error);
      return {
        hasWebSocketScope: false,
        availableChannels: [],
        error: `WebSocket test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Connect to WebSocket if we have access
   */
  async connect(): Promise<boolean> {
    if (this.isConnecting || this.ws?.readyState === WebSocket.OPEN) {
      return true;
    }

    this.isConnecting = true;

    try {
      // Test access first
      const accessTest = await this.testWebSocketAccess();
      if (!accessTest.hasWebSocketScope) {
        console.warn('WebSocket access not available:', accessTest.error);
        this.isConnecting = false;
        return false;
      }

      // Connect to WebSocket endpoint
      const apiKey = process.env.NEXT_PUBLIC_UNUSUAL_WHALES_API_KEY;
      const wsUrl = apiKey
        ? `wss://api.unusualwhales.com/ws?api_key=${apiKey}`
        : 'wss://api.unusualwhales.com/ws';
      console.log('Attempting WebSocket connection to:', wsUrl);

      this.ws = new WebSocket(wsUrl);

      return new Promise((resolve) => {
        this.ws!.onopen = () => {
          console.log('WebSocket connected successfully');
          this.reconnectAttempts = 0;
          this.reconnectDelay = 1000;
          this.isConnecting = false;
          resolve(true);
        };

        this.ws!.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('WebSocket message received:', data);
            this.handleMessage(data);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error, event.data);
          }
        };

        this.ws!.onclose = (event) => {
          console.log('WebSocket connection closed:', event.code, event.reason);
          this.ws = null;
          this.isConnecting = false;
          
          // Don't auto-reconnect if closed cleanly
          if (event.code !== 1000) {
            this.handleReconnect();
          }
        };

        this.ws!.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.isConnecting = false;
          resolve(false);
        };

        // Timeout after 10 seconds
        setTimeout(() => {
          if (this.isConnecting) {
            console.log('WebSocket connection timeout');
            this.isConnecting = false;
            if (this.ws) {
              this.ws.close();
            }
            resolve(false);
          }
        }, 10000);
      });
    } catch (error) {
      console.error('Failed to establish WebSocket connection:', error);
      this.isConnecting = false;
      return false;
    }
  }

  /**
   * Subscribe to a channel
   */
  subscribe(channel: string, callback: (data: any) => void): void {
    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, new Set());
      
      // Send subscription message if connected
      if (this.ws?.readyState === WebSocket.OPEN) {
        console.log('Subscribing to channel:', channel);
        this.ws.send(JSON.stringify({
          type: 'subscribe',
          channel: channel
        }));
      }
    }
    
    this.subscriptions.get(channel)!.add(callback);
  }

  /**
   * Unsubscribe from a channel
   */
  unsubscribe(channel: string, callback?: (data: any) => void): void {
    const callbacks = this.subscriptions.get(channel);
    if (!callbacks) return;

    if (callback) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.subscriptions.delete(channel);
        
        // Send unsubscribe message if connected
        if (this.ws?.readyState === WebSocket.OPEN) {
          console.log('Unsubscribing from channel:', channel);
          this.ws.send(JSON.stringify({
            type: 'unsubscribe',
            channel: channel
          }));
        }
      }
    } else {
      this.subscriptions.delete(channel);
      
      // Send unsubscribe message if connected
      if (this.ws?.readyState === WebSocket.OPEN) {
        console.log('Unsubscribing from channel:', channel);
        this.ws.send(JSON.stringify({
          type: 'unsubscribe',
          channel: channel
        }));
      }
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(data: any): void {
    // WebSocket messages come as arrays: [channel, payload]
    if (Array.isArray(data) && data.length >= 2) {
      const [channel, payload] = data;
      
      console.log('Received WebSocket message:', { channel, payload });
      
      if (this.subscriptions.has(channel)) {
        const callbacks = this.subscriptions.get(channel)!;
        callbacks.forEach(callback => {
          try {
            callback({ channel, payload, timestamp: Date.now() });
          } catch (error) {
            console.error('Error in WebSocket callback:', error);
          }
        });
      }
    } else {
      console.log('Received non-array WebSocket message:', data);
    }
  }

  /**
   * Handle reconnection logic
   */
  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      this.connect();
    }, this.reconnectDelay);
    
    // Exponential backoff
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
  }

  /**
   * Subscribe to option trades for all tickers
   */
  subscribeToOptionTrades(callback: (data: any) => void): void {
    this.subscribe('option_trades', callback);
  }

  /**
   * Subscribe to option trades for a specific ticker
   */
  subscribeToTickerOptionTrades(ticker: string, callback: (data: any) => void): void {
    this.subscribe(`option_trades:${ticker.toUpperCase()}`, callback);
  }

  /**
   * Unsubscribe from option trades
   */
  unsubscribeFromOptionTrades(callback?: (data: any) => void): void {
    this.unsubscribe('option_trades', callback);
  }

  /**
   * Unsubscribe from ticker-specific option trades
   */
  unsubscribeFromTickerOptionTrades(ticker: string, callback?: (data: any) => void): void {
    this.unsubscribe(`option_trades:${ticker.toUpperCase()}`, callback);
  }

  /**
   * Disconnect WebSocket
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.subscriptions.clear();
    this.reconnectAttempts = 0;
  }

  /**
   * Get connection status
   */
  getStatus(): 'connected' | 'connecting' | 'disconnected' {
    if (this.ws?.readyState === WebSocket.OPEN) return 'connected';
    if (this.isConnecting) return 'connecting';
    return 'disconnected';
  }
}

export const unusualWhalesWS = UnusualWhalesWebSocket.getInstance();
