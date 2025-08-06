
# Unusual Whales Analytics Dashboard

A comprehensive analytics dashboard for monitoring and analyzing stock options, earnings, congressional trading, and market data using the Unusual Whales API.

## Features

### 📊 Core Analytics
- **Market Overview**: Real-time market trends, correlations, and sector analysis
- **Earnings Analysis**: Track earnings announcements, expected moves, and performance
- **Options Activity**: Monitor unusual options activity and volume spikes
- **Watchlist Management**: Create and manage multiple ticker watchlists

### 🏛️ Extended Features
- **Congress Trading**: Track congressional stock trades and insider activity
- **Shorts Analysis**: Monitor short interest, FTDs, and short volume ratios
- **Institutional Data**: View institutional holdings, activity, and filings
- **News & Headlines**: Stay updated with financial news and market sentiment

### 🛠️ Technical Features
- **Auto-refresh**: Configurable 5-minute data refresh intervals
- **Advanced Charting**: Interactive charts with technical indicators
- **Real-time Data**: Live market data with instant notifications
- **Professional Interface**: Clean, responsive dashboard design

## Setup Instructions

### Prerequisites
- Node.js 18+ installed
- Unusual Whales API key (sign up at [unusualwhales.com](https://unusualwhales.com))

### Installation

1. **Extract and navigate to the project**:
   ```bash
   cd unusual-whales-analytics/app
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   - Copy `.env.example` to `.env`:
     ```bash
     cp .env.example .env
     ```
   - Edit `.env` and add your Unusual Whales API key:
     ```
     UNUSUAL_WHALES_API_KEY=your_actual_api_key_here
     ```

4. **Run the application**:
   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm run build
   npm start
   ```

5. **Access the dashboard**:
   Open your browser and go to `http://localhost:3000`

## API Features Included

### Market Data
- Market tide and sector analysis
- Market correlations
- FDA calendar events
- Open interest changes

### Options Analysis  
- Option contract details and intraday data
- Volume profiles and Greeks
- Stock options data and OI per strike/expiry
- Net premium flow analysis

### Stock Information
- Stock info, state, and net premium ticks
- Interpolated IV and NOPE calculations
- Greek flow and spot exposures
- Dark pool/off-exchange data

### Congressional & Institutional
- Recent congressional trades and top traded tickers
- Institution holdings, activity, and sectors
- Latest institutional filings

### News & Alerts
- Financial news headlines with sentiment analysis
- Alert configurations and notifications
- Ticker-specific news filtering

### Short Interest Analysis
- Short volume and ratio data
- Fails to deliver (FTDs)
- Short interest and borrowing rates
- Volume analysis by exchange

## Usage Tips

1. **Set up your API key**: Make sure your Unusual Whales API key is correctly configured in the `.env` file
2. **Enable auto-refresh**: Toggle auto-refresh in each section to get live updates every 5 minutes
3. **Create watchlists**: Add your favorite tickers to watchlists for quick monitoring
4. **Filter data**: Use search and filter options to focus on specific stocks or date ranges
5. **Explore all sections**: Each dashboard section provides unique insights into different market aspects

## Troubleshooting

### Common Issues

**API Key Errors**:
- Ensure your API key is valid and active
- Check that the key is properly set in the `.env` file
- Verify your API subscription includes the endpoints being accessed

**Build Errors**:
- Make sure Node.js 18+ is installed
- Delete `node_modules` and run `npm install` again
- Check that all environment variables are properly set

**Data Loading Issues**:
- Check your internet connection
- Verify the Unusual Whales API is accessible
- Look at browser console for specific error messages

### Getting Help

- Check the browser console for detailed error messages
- Review the Unusual Whales API documentation for endpoint specifics
- Ensure your API subscription covers the features you're trying to use

## License

This is a personal analytics tool. Please respect the Unusual Whales API terms of service and usage limits.
