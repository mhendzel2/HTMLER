# Advanced Trading Filters System

## Overview

The Advanced Trading Filters System is a sophisticated real-time options flow monitoring platform based on strategies shared by successful Unusual Whales traders on social media. It provides institutional-grade options flow detection with real-time WebSocket streaming when available, or intelligent polling as a fallback.

## Features

### 🎯 **Big Money Detection**
- **Purpose**: Identifies institutional-grade options trades with high premium values
- **Filters**: $500K+ premium, OTM focus, ask-side trades, 14-180 DTE
- **Use Case**: Track directional bets and hedging strategies from large institutions

### ⚡ **Catalyst Plays Detection**
- **Purpose**: Tracks short-term aggressive positioning that may indicate upcoming catalysts
- **Filters**: 0-14 DTE, high premium sweeps, aggressive buying
- **Use Case**: Identify trades that may know about upcoming news or momentum plays

### 🔄 **Gamma Exposure Monitoring**
- **Purpose**: Monitors GEX levels to identify potential squeeze scenarios
- **Features**: Real-time GEX data, flip point analysis, strike-level gamma
- **Use Case**: Understand market maker positioning and potential price magnets

### 🏦 **Dark Pool Correlation**
- **Purpose**: Identifies large block trades that may correlate with institutional positioning
- **Filters**: $250K+ block trades, large size, longer-term positioning (30-120 DTE)
- **Use Case**: Track institutional positioning away from public order books

### 📈 **Earnings Play Detector**
- **Purpose**: Identifies options activity likely tied to earnings events
- **Filters**: Within 45 DTE, $75K+ premium, ask-side focus
- **Use Case**: Track earnings-related positioning and volatility plays

### 🔻 **Unusual Put Volume**
- **Purpose**: Large put activity indicating hedging or bearish bets
- **Filters**: $200K+ put premium, ask-side, significant size
- **Use Case**: Identify major hedging activity or bearish institutional bets

## Technical Architecture

### WebSocket Integration
```typescript
// Real-time channels available:
- gex:TICKER              // Gamma exposure updates
- gex_strike:TICKER       // Strike-level gamma data
- gex_strike_expiry:TICKER // Expiry-specific gamma
- flow-alerts             // Real-time options flow
- price:TICKER            // Price updates
```

### Rate Limiting & Fallback
- **WebSocket Mode**: Real-time streaming with no polling
- **Polling Mode**: 30-second intervals to respect 120 requests/60 seconds limit
- **Batch Processing**: 2 tickers per batch with 3-second delays
- **Error Handling**: Automatic fallback to polling if WebSocket fails

### Data Processing Pipeline
```
1. Raw Flow Data → Normalization → Filter Matching → Alert Generation
2. Liquidity Pre-filtering (options-volume endpoint)
3. Premium/DTE/Side/Aggressiveness validation
4. Sentiment analysis (bullish/bearish/neutral)
5. Real-time statistics and aggregation
```

## API Integration

### Required Endpoints
1. **Flow Alerts**: `/api/option-trades/flow-alerts`
2. **GEX Data**: `/api/stock/{ticker}/gex`
3. **Options Volume**: `/api/stock/{ticker}/options-volume`
4. **Full Tape** (WebSocket scope test): `/api/option-trades/full-tape/{date}`

### API Key Requirements
- **Basic Plan**: Polling mode with 30-second updates
- **WebSocket Plan**: Real-time streaming with instant alerts
- **Rate Limits**: 120 requests per 60 seconds, max 3 concurrent requests

## Usage Guide

### 1. WebSocket Access Testing
```bash
# Navigate to WebSocket Test page
http://localhost:3001/dashboard/websocket-test

# Test API scope and connection
Click "Test WebSocket Scope" button
```

### 2. Filter Configuration
```bash
# Navigate to Trading Filters page
http://localhost:3001/dashboard/filters

# Enable/disable filters as needed
# Monitor real-time alerts in Live Alerts tab
```

### 3. GEX Monitoring
```bash
# Enter ticker symbol (e.g., AAPL, TSLA, SPY)
# Monitor gamma exposure levels
# Watch for flip point changes
```

### 4. Alert Management
- **Live Alerts Tab**: View real-time institutional flow
- **Statistics Tab**: Track filter performance and volume
- **GEX Monitor**: Real-time gamma exposure analysis

## Filter Specifications

### Big Money OTM Whales
```typescript
{
  minPremium: 500000,      // $500K minimum
  side: 'ask',            // Aggressive buying
  moneyness: 'OTM',       // Out of the money
  minDTE: 14,             // 2+ weeks
  maxDTE: 180,            // Under 6 months
  aggressiveness: 'sweep'  // Sweeps only
}
```

### Aggressive Short-Term Plays
```typescript
{
  minPremium: 100000,     // $100K minimum for short-term
  maxDTE: 14,            // 2 weeks or less
  side: 'ask',           // Aggressive buying
  aggressiveness: 'sweep',
  minSize: 100           // Significant size
}
```

### Dark Pool Correlation
```typescript
{
  minPremium: 250000,    // $250K threshold
  aggressiveness: 'block', // Block trades
  minSize: 500,          // Large size
  minDTE: 30,           // Longer-term positioning
  maxDTE: 120
}
```

## Real-Time Statistics

### Metrics Tracked
- **Total Premium**: Aggregate premium volume per filter
- **Alert Count**: Number of alerts generated per filter
- **Success Rate**: Filter effectiveness metrics
- **Flow Sentiment**: Bullish/bearish/neutral distribution

### Performance Monitoring
- **Filter Statistics**: Individual filter performance
- **Premium Tracking**: Daily/weekly/monthly aggregates
- **GEX Analysis**: Gamma exposure trends and correlations

## Social Media Research Foundation

This system is based on strategies shared by successful traders including:
- **@BigMoneyBets methodology**: Focus on $500K+ OTM whales
- **Dark pool correlation techniques**: Block trade identification
- **Gamma squeeze detection**: GEX-based market maker positioning
- **Catalyst play identification**: Short-term aggressive positioning patterns

## Security & Performance

### Data Privacy
- All API keys stored securely in environment variables
- No sensitive data logged or persisted
- Real-time data processed in memory only

### Performance Optimization
- **Intelligent Caching**: Avoid redundant API calls
- **Batch Processing**: Respect rate limits with smart batching
- **Error Recovery**: Automatic fallback and retry logic
- **Memory Management**: Efficient real-time data handling

## Troubleshooting

### Common Issues

1. **Rate Limit Exceeded**
   - Solution: System automatically applies delays and batching
   - Fallback: Polling mode with 30-second intervals

2. **WebSocket Connection Failed**
   - Check API key has websocket scope
   - Network connectivity issues
   - Automatic fallback to polling mode

3. **No Alerts Showing**
   - Verify filters are enabled
   - Check premium thresholds (market may be quiet)
   - Confirm API key permissions

4. **GEX Data Not Loading**
   - Verify ticker symbol format
   - Check if ticker has options trading
   - API rate limit may be reached

### Debug Mode
```typescript
// Enable debug logging
console.log('WebSocket Status:', unusualWhalesWS.getStatus());
console.log('Active Filters:', tradingFilters.getAvailableFilters());
console.log('Statistics:', tradingFilters.getFilterStatistics());
```

## Future Enhancements

### Planned Features
- **Machine Learning Integration**: Pattern recognition in flow data
- **Cross-Asset Correlation**: Link options flow with equity/futures moves
- **Social Sentiment Analysis**: Twitter/Reddit sentiment correlation
- **Portfolio Impact Analysis**: How detected flows affect existing positions

### Advanced Analytics
- **Flow Clustering**: Group similar institutional trades
- **Momentum Scoring**: Quantify flow momentum and persistence
- **Volatility Prediction**: Use flow data to predict IV expansion
- **Smart Alerts**: AI-powered alert prioritization

## Configuration Files

### Environment Variables
```env
UNUSUAL_WHALES_API_KEY=your_api_key_here
UNUSUAL_WHALES_API_BASE_URL=https://api.unusualwhales.com
```

### TypeScript Interfaces
- `BigMoneyFilter`: Filter configuration
- `FlowAlert`: Real-time flow alert data
- `GEXData`: Gamma exposure information
- `FilterCriteria`: Alert matching criteria

This comprehensive system provides institutional-grade options flow monitoring with intelligent fallback mechanisms, ensuring reliable operation regardless of API plan limitations.
