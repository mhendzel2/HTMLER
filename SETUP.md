
# Setup Instructions - Unusual Whales Analytics

## 🚨 IMPORTANT: API Key Required

This application **requires** a valid Unusual Whales API key to function properly. Without it, you'll only see mock data.

## Step 1: Get Your API Key
1. Sign up at [Unusual Whales](https://unusualwhales.com/)
2. Subscribe to their API service
3. Copy your API key from your dashboard

## Step 2: Configure the Application

### Update the .env file
1. Open the `.env` file in the project root
2. Find this line:
   ```
   UNUSUAL_WHALES_API_KEY="your_actual_api_key_here"
   ```
3. Replace `your_actual_api_key_here` with your real API key:
   ```
   UNUSUAL_WHALES_API_KEY="uw_live_abc123xyz789..."
   ```

### Verify Configuration
The API key should:
- Start with `uw_live_` (for production) or `uw_test_` (for testing)
- Be enclosed in quotes
- Have no extra spaces or characters

## Step 3: Test the Connection

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Open your browser to `http://localhost:3000`

3. Check the API status indicators:
   - 🟢 **Connected** = Success! Live data is flowing
   - 🟡 **Mock Data** = API key issue, check your configuration
   - 🔴 **Error** = Connection problem, check your internet/API status

## Step 4: Verify Features

### Test Earnings Data
1. Go to **Dashboard > Earnings**
2. You should see real earnings data with filtering
3. Check that API status shows "Connected"

### Test News Integration  
1. Add a ticker to your **Watchlist**
2. Check browser console - should see: "Fetched news for watchlist tickers"
3. Go to **Dashboard > News** and filter by a ticker

### Test Options Data
1. Go to **Dashboard > Options**  
2. Enter a popular ticker (e.g., AAPL, TSLA)
3. Verify options data loads correctly

## 🔧 Troubleshooting

### "Mock Data" Status
- Double-check your API key in `.env`
- Ensure no typos or extra spaces
- Verify your Unusual Whales subscription is active
- Restart the development server after changes

### Connection Errors
- Check your internet connection
- Verify Unusual Whales API is operational
- Check if your API key has expired
- Review rate limits (app handles this automatically)

### No News Loading
- Ensure your API key includes news endpoint access
- Check browser console for specific errors
- Verify tickers are being passed correctly to news API

## 📊 Expected Behavior

### With Valid API Key:
- Real earnings data with proper filtering
- Automatic news fetching when adding tickers to watchlist
- Live options data and market metrics
- Green "Connected" status indicators

### Without Valid API Key:
- Mock/placeholder data throughout the app
- Yellow "Mock Data" status indicators
- Limited functionality
- No real-time updates

## 🎯 Next Steps

Once your API key is working:

1. **Customize Filters**: Adjust earnings filters in the dashboard
2. **Set Up Watchlists**: Add your favorite tickers for monitoring
3. **Enable Notifications**: Allow browser notifications for breaking news
4. **Explore Features**: Try paper trading, FINBERT analysis, and performance tracking

## 🆘 Still Having Issues?

1. Check the browser console (F12) for error messages
2. Verify your API key format and permissions
3. Test your API key directly using curl:
   ```bash
   curl -H "Authorization: Bearer your_api_key_here" \
        https://api.unusualwhales.com/api/market/tide
   ```

---

**Remember**: Replace `your_actual_api_key_here` in the `.env` file with your real Unusual Whales API key!
