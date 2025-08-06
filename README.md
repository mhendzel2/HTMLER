
# Unusual Whales Analytics Dashboard

A comprehensive trading analytics platform that integrates with the Unusual Whales API to provide real-time market data, options analysis, and trading insights.

## 🚀 Quick Start

### 1. API Key Setup (REQUIRED)

**Important:** You must add your Unusual Whales API key for the app to function properly.

1. Locate the `.env` file in the project root
2. Replace `your_actual_api_key_here` with your real API key from Unusual Whales:
   ```
   UNUSUAL_WHALES_API_KEY="your_actual_api_key_from_unusual_whales"
   ```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start the Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## 📊 Features

### Core Analytics
- **Earnings Analysis**: Filter earnings by put/call ratios and options volume with real-time data
- **Options Activity**: Monitor unusual options activity and institutional flows
- **Market Overview**: Track market sentiment and key metrics
- **News Integration**: Automatic news fetching for watchlist and earnings tickers

### Advanced Trading Features
- **Paper Trading**: IBKR TWS integration for paper trading
- **Performance Tracking**: Monitor trade success rates and strategy performance
- **FINBERT Integration**: AI-powered sentiment analysis and market regime detection
- **Dynamic Strategy Management**: Adaptive trading strategies based on market conditions

### Data Sources
- **Congress Trading**: Track congressional trading activity
- **Institutional Data**: Monitor institutional holdings and activities
- **Short Interest**: Track short selling data and trends
- **ETF Flows**: Monitor ETF inflow/outflow patterns
- **Dark Pool Data**: Track off-exchange trading activity

## 🔧 Configuration

### Environment Variables

```env
# Database (Auto-configured)
DATABASE_URL="postgresql://..."
NEXTAUTH_URL="https://..."
NEXTAUTH_SECRET="..."

# Unusual Whales API (REQUIRED - Replace with your key)
UNUSUAL_WHALES_API_KEY="your_actual_api_key_here"
UNUSUAL_WHALES_API_BASE_URL="https://api.unusualwhales.com"
```

### API Status Indicators

The app includes visual indicators for API connectivity:
- 🟢 **Connected**: Live data from Unusual Whales API
- 🟡 **Mock Data**: Using placeholder data (API key missing/invalid)
- 🔴 **Error**: API connection failed
- 🟡 **Connecting**: Attempting to connect

## 📈 Usage

### Earnings Analysis
1. Navigate to **Dashboard > Earnings**
2. View filtered earnings based on:
   - Put/Call ratio < 0.8 (bullish) or > 1.3 (bearish)
   - Minimum options volume ≥ 200 contracts
   - Market cap ≥ $1B
3. Qualified tickers automatically trigger news fetching
4. Click "View Options" to analyze options activity for earnings plays

### Watchlist Management
1. Go to **Dashboard > Watchlist**
2. Add tickers to your watchlist
3. News is automatically fetched for newly added tickers
4. Monitor real-time price changes and volume

### Dynamic News Integration
- **Automatic Fetching**: News is fetched when tickers are added to watchlists or qualify in earnings analysis
- **Real-time Updates**: 5-minute refresh cycles with optional auto-refresh
- **Smart Filtering**: High-impact news prioritized for earnings analysis
- **Browser Notifications**: Get notified of breaking news for your tickers

## 🔌 API Integration

### Unusual Whales Endpoints Used
- `/api/earnings/afterhours` - After-hours earnings
- `/api/earnings/premarket` - Pre-market earnings  
- `/api/earnings/calendar` - Earnings calendar
- `/api/news/headlines` - News headlines with ticker filtering
- `/api/options/` - Options data and analytics
- `/api/congress/recent-trades` - Congressional trading
- `/api/institutions/` - Institutional data
- `/api/market/` - Market-wide data

### Rate Limiting
- Built-in rate limiting (10 requests/second)
- Automatic caching for frequently accessed data
- Error handling with fallback to cached data

## 🛠 Development

### Project Structure
```
app/
├── app/                 # Next.js app directory
│   ├── dashboard/       # Main dashboard pages
│   ├── api/            # API routes
│   │   ├── data/       # Consolidated data endpoints
│   │   ├── watchlist/  # Watchlist management
│   │   └── earnings/   # Earnings-specific endpoints
├── components/         # Reusable UI components
├── lib/               # Utilities and contexts
│   ├── contexts/      # React contexts (news, etc.)
│   └── unusual-whales-api.ts  # API client
└── README.md
```

### Adding New Features
1. Create API routes in `/app/api/`
2. Add UI components in `/components/`
3. Update navigation in sidebar component
4. Integrate with news context for automatic news fetching

## 📱 Browser Notifications

The app can send browser notifications for:
- New earnings-related news for qualified tickers
- Breaking news for watchlist tickers
- High-impact market news

Grant notification permissions when prompted for the best experience.

## 🚨 Troubleshooting

### Common Issues

1. **No Live Data / Mock Data Showing**
   - Check that your API key is correctly set in `.env`
   - Verify your Unusual Whales subscription is active
   - Check browser console for API errors

2. **Build Errors**
   ```bash
   npm run build
   ```
   - Ensure all dependencies are installed
   - Check TypeScript errors in components

3. **News Not Loading**
   - Verify API key permissions include news endpoints
   - Check network connectivity
   - Look for CORS or rate limiting issues

### Support
- Check Unusual Whales API documentation
- Review browser console for detailed error messages
- Ensure your API key has the necessary permissions

## 🤖 Local AI Agent (R&D-Agent + gpt-oss-20b)

The repository includes an optional Python setup for experimenting with a
local R&D-Agent instance backed by the open-source `gpt-oss-20b` model.

### Setup

1. Create and activate the Conda environment:

   ```bash
   conda env create -f rd_agent/environment.yml
   conda activate rdagent
   ```

2. Start your local model (e.g., via Ollama or vLLM) and expose it through
   LiteLLM. Configure R&D-Agent with environment variables:

   ```bash
   export CHAT_MODEL=gpt-oss-20b
   export OPENAI_API_BASE=http://localhost:8000  # LiteLLM proxy
   export OPENAI_API_KEY=dummy
   ```

3. Run the example trading assistant:

   ```bash
   python rd_agent/trading_agent.py
   ```

The script outputs a structured trade idea generated by the local model.

## 🔒 Security

- API keys are stored in environment variables
- No sensitive data is logged or cached in browser
- All API requests use secure HTTPS connections
- Built-in rate limiting prevents API abuse

---

**Note**: This application requires an active Unusual Whales API subscription. Mock data will be used if no valid API key is provided.
