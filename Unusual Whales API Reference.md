# Unusual Whales API Reference

## Overview

**API Base URL:** https://api.unusualwhales.com  
**Version:** v1.0  
**Authentication:** Bearer Token (Authorization: Bearer {token})  
**Support:** support@unusualwhales.com  

## Recent Updates and Changelog

### 2025.06.18
- Added `/market/:sector/sector-tide` endpoint to get the market tide for a specific sector

### 2025.06.02
- Added `/stock/:ticker/interpolated-iv` endpoint to get the interpolated iv for various days

### 2025.05.29
- Added `/option-contract/:id/volume-profile` endpoint to get the volume profile of an option contract (volume by fill price)

### 2025.05.23
- Added `/option-contract/:id/intraday` endpoint to get the volume, premium & OHLC for a contract in 1min ticks for a given trading day

### 2025.05.07
- Added `prev_close_price` field to `/stock/:ticker/stock-state` endpoint to provide the previous close price

### 2025.04.30
- Enhanced `/option-trades/full-tape/{date}` to allow users with `websocket` scope to access the last two trading days of data

### 2025.04.23
- Added `/net-flow/expiry` endpoint to track net premium flow by tide type, moneyness, and expiration categories

### 2025.04.08
- Enhanced `/market/correlations` endpoint with new date filtering options: `start_date` and `end_date` parameters to specify custom date ranges

### 2025.03.23
- Updated `/stock/{ticker}/net-prem-ticks` endpoint to include `call_volume`, `put_volume`, `call_volume_bid_side`, `put_volume_bid_side`, `call_volume_ask_side`, `put_volume_ask_side` & `net_delta`

### 2025.03.10
- Added `/news/headlines` endpoint to access financial news headlines with filtering capabilities
- Added Shorts API endpoints:
  - `/shorts/:ticker/data`
  - `/shorts/:ticker/volumes-by-exchange`
  - `/shorts/:ticker/ftds`
  - `/shorts/:ticker/interest-float`
  - `/shorts/:ticker/volume-and-ratio`

### 2025.02.19
- **BREAKING CHANGE:** The endpoint `/stock/:ticker/spot-exposures/:expiry/strike` has been deprecated and replaced by `/stock/:ticker/spot-exposures/expiry-strike`

### 2025.02.13
- The endpoint `/congress/recent-reports` has been removed as it returns the same data as `/congress/recent-trades`

### 2025.02.05
- Enhanced `/market/fda-calendar` with better FDA data, additional fields (notes, outcomes, sources), and filtering by company metrics

### 2025.02.03
- Updated dark pool/off lit endpoints to allow filtering for size, premium & consolidated volume

### 2025.01.22
- Added `gex_strike_expiry:<TICKER>` channel to the websocket
- Added `call_option_symbol` & `put_option_symbol` to `/stock/{ticker}/greeks`

### 2025.01.16
- Added `/stock/:ticker/spot-exposures/:expiry/strike`

### 2024.12.11
- Added `/alerts/configuration`
- Added `/alerts`

### 2024.12.02
- Added `/stock/:ticker/oi-per-strike`
- Added `/stock/:ticker/oi-per-expiry`

### 2024.11.19
- Improved all earnings endpoints

### 2024.11.09
- Added `perc_of_total` & `perc_of_share_value` to `/institution/:name/holdings`

### 2024.10.30
- Added `/stock/:ticker/nope`

### 2024.10.28
- Added `/group-flow/:flow_group/greek-flow`
- Added `/group-flow/:flow_group/greek-flow/:expiry`
- Added `/stock/:ticker/greek-flow`
- Added `/stock/:ticker/greek-flow/:expiry`

### 2024.10.16
- Added ETF inflow & outflow endpoint `/etfs/:ticker/in_outflow`

### 2024.10.15
- Added institutional latest filings endpoint `/institution/latest_filings`
- Added institutional ownership endpoint `/institution/:ticker/ownership`

### 2024.10.14
- Added 2 new fields to `/market/oi-change`:
  - `days_of_oi_increases`: The number of consecutive days that the open interest has increased for this contract
  - `days_of_vol_greater_than_oi`: The number of consecutive days that the volume has been greater than the open interest

### 2024.10.10
- Added institutional activity endpoint `/institution/:name/activity`

### 2024.10.09
- Added institutional list endpoint `/institutions`
- Added institutional holdings endpoint `/institution/:name/holdings`
- Added institutional sector exposure endpoint `/institution/:name/sectors`

## API Endpoints by Category




### Market Endpoints

#### GET /api/market/{sector}/sector-tide
**Description:** Get sector tide data - similar to Market Tide but based only on options activity of companies in a specific sector.

**Parameters:**
- `sector` (required, string): A singular sector
  - Allowed values: Basic Materials, Communication Services, Consumer Cyclical, Consumer Defensive, Energy, Financial Services, Healthcare, Industrials, Real Estate, Technology, Utilities
- `date` (optional, string): Trading date in YYYY-MM-DD format. Defaults to last trading date.

**Response Fields:**
- `net_call_premium` (string): (call premium ask side) - (call premium bid side)
- `net_put_premium` (string): (put premium ask side) - (put premium bid side)  
- `net_volume` (integer): (call volume ask side) - (call volume bid side) - ((put volume ask side) - (put volume bid side))
- `timestamp` (string): Start time of the tick as timestamp with timezone

**Example Response:**
```json
{
  "data": [
    {
      "date": "2023-09-08",
      "net_call_premium": "660338.0000",
      "net_put_premium": "-547564.0000",
      "net_volume": 23558,
      "timestamp": "2023-09-08T09:30:00-04:00"
    }
  ]
}
```




### Alerts Endpoints

The alerts system allows you to retrieve triggered alerts and manage alert configurations. This is particularly useful for monitoring specific market conditions and receiving notifications when certain criteria are met.

#### GET /api/alerts
**Description:** Retrieve triggered alerts based on configured alert settings.

**Parameters:**
- `config_ids[]` (array, optional): A list of alert IDs to filter by
- `intraday_only` (boolean, optional): Boolean flag whether to return only intraday alerts. Default: true
- `limit` (integer, optional): How many items to return. Default: 100. Max: 200. Min: 1
- `noti_types[]` (array[string], optional): A list of notification types
- `page` (integer, optional): The page number to return. Default is 0. Min: 0
- `ticker_symbols` (string, optional): A comma separated list of tickers. To exclude certain tickers prefix the first ticker with a `-`

**Response Fields:**
- `created_at` (string): Timestamp when the alert was created
- `id` (string): Unique identifier for the alert
- `meta` (object): The raw data of the alert. Schema varies based on alert type
- `name` (string): Name of the alert configuration
- `noti_type` (string): Type of notification
- `symbol` (string): Stock ticker or option contract depending on alert type
- `tape_time` (string): Time when the alert was triggered
- `user_noti_config_id` (string): ID of the user's notification configuration

**Example Response:**
```json
{
  "data": [
    {
      "created_at": "2024-12-11T14:00:00Z",
      "id": "fdc2cf91-d387-480f-a79e-28026447a6f5",
      "meta": {
        "alert_type": "PayDate",
        "date": "2024-11-21",
        "div_yield": "0.0503",
        "dividend": "0.1275",
        "frequency": "Quarterly",
        "payment_date": "2024-12-11",
        "prev_dividend": "0.125"
      },
      "name": "S&P 500 Dividends",
      "noti_type": "dividends",
      "symbol": "AMCR",
      "symbol_type": "stock",
      "tape_time": "2024-12-11T14:00:00Z",
      "user_noti_config_id": "cb70c287-f10a-4e63-98ad-571b7dafc8e4"
    }
  ]
}
```

#### GET /api/alerts/configuration
**Description:** Retrieve alert configurations that have been set up.

**Parameters:** None

**Response Fields:**
- `config` (object): Configuration details for the alert
- `created_at` (string): When the configuration was created
- `id` (string): Unique identifier for the configuration
- `mobile_only` (boolean): Whether the alert is mobile-only
- `name` (string): Name of the alert configuration
- `noti_type` (string): Type of notification
- `status` (string): Status of the alert configuration

**Example Response:**
```json
{
  "data": [
    {
      "config": {
        "option_symbols": ["TGT241122C00177500"]
      },
      "symbols": "all",
      "created_at": "2024-11-19",
      "id": "ebe24953-a0bf-4b4d-98be-14f721a1199a",
      "mobile_only": false,
      "name": "Chain OI Chg: TGT241122C00177500",
      "noti_type": "chain_oi_change",
      "status": "active"
    }
  ]
}
```


### Congress Endpoints

The congress endpoints provide access to trading data from members of the U.S. Congress, allowing you to track their investment activities and disclosure patterns.

#### GET /api/congress/recent-trades
**Description:** Returns recent trades made by members of Congress.

**Parameters:**
- `limit` (integer, optional): Number of results to return. Default is 100
- `offset` (integer, optional): Offset for pagination. Default is 0
- `start_date` (string, optional): Filter trades by start date (YYYY-MM-DD)
- `end_date` (string, optional): Filter trades by end date (YYYY-MM-DD)
- `ticker` (string, optional): Filter trades by ticker symbol
- `congress_member` (string, optional): Filter trades by Congress member name

**Response Fields:**
- `date` (string): Date of the trade
- `ticker` (string): Ticker symbol of the traded asset
- `asset_type` (string): Type of asset traded (e.g., stock, option)
- `trade_type` (string): Type of trade (e.g., buy, sell)
- `amount` (string): Amount of the trade
- `congress_member` (string): Name of the Congress member
- `house` (string): House of Congress (e.g., Senate, House)
- `party` (string): Political party of the Congress member
- `disclosure_date` (string): Date of disclosure

**Example Response:**
```json
[
  {
    "date": "2024-07-20",
    "ticker": "MSFT",
    "asset_type": "Stock",
    "trade_type": "Buy",
    "amount": "$1,001 - $15,000",
    "congress_member": "Nancy Pelosi",
    "house": "House",
    "party": "Democrat",
    "disclosure_date": "2024-07-22"
  },
  {
    "date": "2024-07-19",
    "ticker": "GOOGL",
    "asset_type": "Stock",
    "trade_type": "Sell",
    "amount": "$15,001 - $50,000",
    "congress_member": "Kevin McCarthy",
    "house": "House",
    "party": "Republican",
    "disclosure_date": "2024-07-21"
  }
]
```

#### GET /api/congress/top-traded-tickers
**Description:** Returns the top traded tickers by Congress members.

**Parameters:**
- `limit` (integer, optional): Number of results to return. Default is 10
- `start_date` (string, optional): Filter trades by start date (YYYY-MM-DD)
- `end_date` (string, optional): Filter trades by end date (YYYY-MM-DD)

**Response Fields:**
- `ticker` (string): Ticker symbol of the traded asset
- `trade_count` (integer): Number of trades for the ticker
- `total_amount` (string): Total amount traded for the ticker

**Example Response:**
```json
[
  {
    "ticker": "NVDA",
    "trade_count": 50,
    "total_amount": "$500,000"
  },
  {
    "ticker": "TSLA",
    "trade_count": 45,
    "total_amount": "$450,000"
  }
]
```

#### GET /api/congress/members
**Description:** Returns a list of Congress members.

**Parameters:**
- `house` (string, optional): Filter by House of Congress (e.g., Senate, House)
- `party` (string, optional): Filter by political party

**Response Fields:**
- `name` (string): Name of the Congress member
- `house` (string): House of Congress
- `party` (string): Political party
- `state` (string): State represented by the Congress member

**Example Response:**
```json
[
  {
    "name": "Chuck Schumer",
    "house": "Senate",
    "party": "Democrat",
    "state": "NY"
  },
  {
    "name": "Mitch McConnell",
    "house": "Senate",
    "party": "Republican",
    "state": "KY"
  }
]
```


### Dark Pool Endpoints

Dark pool endpoints provide access to off-exchange trading data, allowing you to monitor large block trades and institutional activity that occurs outside of public exchanges.

#### GET /api/darkpool/recent
**Description:** Returns the latest dark pool trades across all tickers.

**Parameters:**
- `date` (string, optional): A trading date in the format of YYYY-MM-DD. Defaults to last trading date. Example: 2024-01-18
- `limit` (integer, optional): How many items to return. Default: 100. Max: 200. Min: 1
- `max_premium` (integer, optional): The maximum premium requested trades should have. Example: 150000
- `max_size` (integer, optional): The maximum size requested trades should have. Must be a positive integer. Example: 150000
- `max_volume` (integer, optional): The maximum consolidated volume requested trades should have. Must be a positive integer

**Response Fields:**
- `data` (array): Array of dark pool trade objects
  - `canceled` (boolean): Whether the trade was canceled
  - `executed_at` (string): Timestamp when the trade was executed
  - `ext_hour_sold_codes` (string): Extended hours sold codes
  - `market_center` (string): Market center identifier
  - `premium` (number): Premium amount of the trade
  - `size` (number): Size of the trade
  - `ticker` (string): Stock ticker symbol
  - `trade_id` (string): Unique trade identifier
  - `trade_type` (string): Type of trade
  - `volume` (number): Volume of the trade
- `date` (string): Date of the trades

**Example Response:**
```json
{
  "data": [
    {
      "canceled": false,
      "executed_at": "2023-02-10T15:00:00Z",
      "ext_hour_sold_codes": "",
      "market_center": "L",
      "premium": 100000,
      "size": 1000,
      "ticker": "SPY",
      "trade_id": "12345",
      "trade_type": "darkpool",
      "volume": 10000
    }
  ],
  "date": "2023-02-10"
}
```

#### GET /api/darkpool/{ticker}
**Description:** Returns dark pool trades for a specific ticker on a given day.

**Path Parameters:**
- `ticker` (string, required): A single ticker. Example: AAPL

**Query Parameters:**
- `date` (string, optional): A trading date in the format of YYYY-MM-DD. Defaults to last trading date. Example: 2024-01-18
- `limit` (integer, optional): How many items to return. Default: 500. Max: 500. Min: 1
- `max_premium` (integer, optional): The maximum premium requested trades should have. Example: 150000
- `max_size` (integer, optional): The maximum size requested trades should have. Must be a positive integer. Example: 150000
- `max_volume` (integer, optional): The maximum consolidated volume requested trades should have. Must be a positive integer

**Response Fields:**
Same as `/api/darkpool/recent` endpoint

**Example Response:**
```json
{
  "data": [
    {
      "canceled": false,
      "executed_at": "2023-02-10T15:00:00Z",
      "ext_hour_sold_codes": "",
      "market_center": "L",
      "premium": 100000,
      "size": 1000,
      "ticker": "AAPL",
      "trade_id": "12345",
      "trade_type": "darkpool",
      "volume": 10000
    }
  ],
  "date": "2023-02-10"
}
```


### Earnings Endpoints

The earnings endpoints provide comprehensive data about company earnings announcements, including expected moves, actual results, and post-earnings performance analysis.

#### GET /api/earnings/afterhours
**Description:** Returns earnings data for companies reporting after market hours.

**Parameters:**
- `date` (string, optional): A trading date in the format of YYYY-MM-DD. Defaults to last trading date. Example: 2024-01-18
- `limit` (integer, optional): How many items to return. Default: 50. Max: 100. Min: 1. Example: 10
- `page` (integer, optional): Page number (use with limit). Starts on page 0. Example: 1

**Response Fields:**
- `actual_eps` (string): Actual earnings per share reported
- `continent` (string): Continent where the company is located
- `country_code` (string): Country code
- `country_name` (string): Country name
- `ending_fiscal_quarter` (string): End date of the fiscal quarter
- `expected_move` (string): Expected price movement in dollars
- `expected_move_perc` (string): Expected price movement as percentage
- `long_straddle_1d` (string): 1-day long straddle performance
- `long_straddle_1w` (string): 1-week long straddle performance
- `post_earnings_move_1d` through `post_earnings_move_4w` (string): Post-earnings price movements for various time periods
- `pre_earnings_move_1d` through `pre_earnings_move_4w` (string): Pre-earnings price movements for various time periods
- `ticker` (string): Stock ticker symbol
- `time` (string): Time of earnings announcement
- `trading_day` (string): Trading day
- `type` (string): Type of earnings announcement

**Example Response:**
```json
{
  "data": [
    {
      "actual_eps": "2.45",
      "continent": "North America",
      "country_code": "US",
      "country_name": "UNITED STATES",
      "ending_fiscal_quarter": "2024-03-31",
      "expected_move": "9.91",
      "expected_move_perc": "8.67",
      "long_straddle_1d": "0.01",
      "long_straddle_1w": "0.23",
      "post_earnings_move_1d": "0.01",
      "post_earnings_move_1w": "0.01",
      "ticker": "AAPL",
      "time": "16:00",
      "trading_day": "2024-01-18",
      "type": "afterhours"
    }
  ]
}
```

#### GET /api/earnings/premarket
**Description:** Returns earnings data for companies reporting before market hours.

**Parameters:**
Same as `/api/earnings/afterhours`

**Response Fields:**
Same as `/api/earnings/afterhours`

#### GET /api/earnings/{ticker}
**Description:** Returns historical earnings data for a specific ticker.

**Path Parameters:**
- `ticker` (string, required): A single ticker. Example: AAPL

**Response Fields:**
Same as `/api/earnings/afterhours`

**Example Response:**
```json
{
  "data": [
    {
      "actual_eps": "2.45",
      "ending_fiscal_quarter": "2024-03-31",
      "expected_move": "9.91",
      "expected_move_perc": "8.67",
      "ticker": "AAPL",
      "time": "16:00",
      "trading_day": "2024-01-18",
      "type": "afterhours"
    }
  ]
}
```


### Option Contract Endpoints

Option contract endpoints provide detailed information about individual option contracts, including flow data, historical performance, and volume profiles.

#### GET /api/option-contract/{id}/flow
**Description:** Returns flow data for a specific option contract.

**Path Parameters:**
- `id` (string, required): An option contract in the ISO format. Example: TSLA230526P00167500

**Query Parameters:**
- `date` (string, optional): A trading date in the format of YYYY-MM-DD. Defaults to last trading date. Example: 2024-01-18
- `limit` (integer, optional): How many items to return. If no limit is given, returns all matching data. Min: 1
- `min_premium` (integer, optional): Minimum premium filter. Defaults to: 0

**Response Fields:**
- `ask_vol` (integer): The amount of volume that happened on the ask side
- `bid_vol` (integer): The amount of volume that happened on the bid side
- `canceled` (boolean): Whether the option trade was canceled
- `delta` (string): The delta of the option trade
- `er_time` (string): Earnings time indicator
- `ewma_nbbo_ask` (string): EWMA NBBO ask price
- `ewma_nbbo_bid` (string): EWMA NBBO bid price
- `exchange` (string): Exchange where the trade occurred
- `executed_at` (string): Execution timestamp
- `expiry` (string): Contract expiry date
- `flow_alert_id` (string): Flow alert identifier
- `full_name` (string): Full company name
- `gamma` (string): The gamma of the option trade
- `implied_volatility` (string): Implied volatility
- `industry_type` (string): Industry classification
- `marketcap` (string): Market capitalization
- `mid_vol` (integer): Mid volume
- `multi_vol` (integer): Multi-leg volume
- `nbbo_ask` (string): NBBO ask price
- `nbbo_bid` (string): NBBO bid price

**Example Response:**
```json
{
  "data": [
    {
      "ask_vol": 2,
      "bid_vol": 1,
      "canceled": false,
      "delta": "0.6105462815378",
      "er_time": "postmarket",
      "ewma_nbbo_ask": "21.60",
      "ewma_nbbo_bid": "21.45",
      "exchange": "MXOP",
      "executed_at": "2024-08-2",
      "expiry": "2025-01-17",
      "flow_alert_id": null,
      "full_name": "NVIDIA CORP",
      "gamma": "0.0077501388966",
      "implied_volatility": "0.6",
      "industry_type": "Semiconductors",
      "marketcap": "313035000000",
      "mid_vol": 30,
      "multi_vol": 30,
      "nbbo_ask": "21.60",
      "nbbo_bid": "21.45"
    }
  ]
}
```

#### GET /api/option-contract/{id}/historic
**Description:** Returns historical data for a specific option contract.

**Path Parameters:**
- `id` (string, required): An option contract in the ISO format. Example: TSLA230526P00167500

**Query Parameters:**
- `limit` (integer, optional): How many items to return. If no limit is given, returns all matching data. Min: 1

**Response Fields:**
- `ask_volume` (integer): Volume on the ask side
- `avg_price` (string): Volume weighted average fill price
- `bid_volume` (integer): Volume on the bid side
- `cross_volume` (integer): Cross volume
- `date` (string): Trading date in ISO format
- `floor_volume` (integer): Floor volume
- `high_price` (string): Highest fill price
- `implied_volatility` (string): Implied volatility for last transaction
- `iv_high` (string): Highest implied volatility
- `iv_low` (string): Lowest implied volatility
- `last_price` (string): Last fill price
- `last_tape_time` (string): Last tape time
- `low_price` (string): Lowest fill price
- `mid_volume` (integer): Mid volume
- `multi_leg_volume` (integer): Multi-leg volume
- `neutral_volume` (integer): Neutral volume
- `open_interest` (integer): Open interest
- `open_price` (string): Opening fill price
- `stock_multi_leg_volume` (integer): Stock multi-leg volume
- `sweep_volume` (integer): Sweep volume
- `total_premium` (string): Total premium

#### GET /api/option-contract/{id}/intraday
**Description:** Returns intraday data for a specific option contract with 1-minute ticks.

**Path Parameters:**
- `id` (string, required): An option contract in the ISO format. Example: TSLA230526P00167500

**Query Parameters:**
- `date` (string, optional): A trading date in the format of YYYY-MM-DD. Defaults to last trading date. Example: 2024-01-18

**Response Fields:**
- `avg_price` (string): Volume weighted average fill price
- `close` (string): Last fill price
- `expiry` (string): Contract expiry date in ISO format
- `high` (string): Highest fill price
- `iv_high` (string): Highest implied volatility
- `iv_low` (string): Lowest implied volatility
- `low` (string): Lowest fill price
- `open` (string): First fill price
- `option_symbol` (string): Option symbol
- `premium_ask_side` (string): Premium on ask side
- `premium_bid_side` (string): Premium on bid side
- `premium_mid_side` (string): Premium on mid side
- `premium_no_side` (string): Premium with no side
- `start_time` (string): Start time of the interval
- `volume_ask_side` (integer): Volume on ask side
- `volume_bid_side` (integer): Volume on bid side
- `volume_mid_side` (integer): Volume on mid side
- `volume_multi` (integer): Multi-leg volume
- `volume_no_side` (integer): Volume with no side
- `volume_stock_multi` (integer): Stock multi-leg volume

#### GET /api/option-contract/{id}/volume-profile
**Description:** Returns volume profile data showing volume distribution by price levels.

**Path Parameters:**
- `id` (string, required): An option contract in the ISO format. Example: TSLA230526P00167500

**Query Parameters:**
- `date` (string, optional): A trading date in the format of YYYY-MM-DD. Defaults to last trading date. Example: 2024-01-18

**Response Fields:**
- `ask_vol` (integer): Volume on ask side
- `bid_vol` (integer): Volume on bid side
- `cross_vol` (integer): Cross volume
- `date` (string): Trading date in ISO format
- `floor_vol` (integer): Floor volume
- `mid_vol` (integer): Mid volume
- `multi_vol` (integer): Multi-leg volume
- `price` (string): Price level
- `sweep_vol` (integer): Sweep volume
- `transactions` (integer): Number of transactions
- `volume` (integer): Total volume for the price level

**Example Response:**
```json
{
  "data": [
    {
      "ask_vol": 850,
      "bid_vol": 325,
      "cross_vol": 5,
      "date": "2024-05-28",
      "floor_vol": 10,
      "mid_vol": 25,
      "multi_vol": 40,
      "price": "3.50",
      "sweep_vol": 120,
      "transactions": 42,
      "volume": 1250
    }
  ]
}
```


### Key Stock Endpoints

Stock endpoints provide comprehensive data about individual stocks including options flow, Greeks, exposures, and various market metrics.

#### GET /api/stock/{ticker}/stock-state
**Description:** Retrieve the last stock price and volume information.

**Path Parameters:**
- `ticker` (string, required): A single ticker. Example: AAPL

**Response Fields:**
- `last_price` (string): Last traded price
- `volume` (integer): Current volume
- `prev_close_price` (string): Previous close price (added 2025.05.07)

#### GET /api/stock/{ticker}/greeks
**Description:** Get Greeks data for a stock's options.

**Path Parameters:**
- `ticker` (string, required): A single ticker. Example: AAPL

**Response Fields:**
- `call_option_symbol` (string): Call option symbol (added 2025.01.22)
- `put_option_symbol` (string): Put option symbol (added 2025.01.22)
- Additional Greek values (delta, gamma, theta, vega, etc.)

#### GET /api/stock/{ticker}/interpolated-iv
**Description:** Get interpolated implied volatility for various days (added 2025.06.02).

**Path Parameters:**
- `ticker` (string, required): A single ticker. Example: AAPL

#### GET /api/stock/{ticker}/net-prem-ticks
**Description:** Get net premium ticks data with enhanced volume metrics.

**Path Parameters:**
- `ticker` (string, required): A single ticker. Example: AAPL

**Response Fields (Enhanced 2025.03.23):**
- `call_volume` (integer): Call volume
- `put_volume` (integer): Put volume
- `call_volume_bid_side` (integer): Call volume on bid side
- `put_volume_bid_side` (integer): Put volume on bid side
- `call_volume_ask_side` (integer): Call volume on ask side
- `put_volume_ask_side` (integer): Put volume on ask side
- `net_delta` (number): Net delta

#### GET /api/stock/{ticker}/spot-exposures/expiry-strike
**Description:** Get spot exposures by expiry and strike (replaces deprecated endpoint).

**Path Parameters:**
- `ticker` (string, required): A single ticker. Example: AAPL

**Query Parameters:**
- `expirations[]` (array): Array of expiration dates

#### GET /api/stock/{ticker}/oi-per-strike
**Description:** Get open interest per strike (added 2024.12.02).

**Path Parameters:**
- `ticker` (string, required): A single ticker. Example: AAPL

#### GET /api/stock/{ticker}/oi-per-expiry
**Description:** Get open interest per expiry (added 2024.12.02).

**Path Parameters:**
- `ticker` (string, required): A single ticker. Example: AAPL

#### GET /api/stock/{ticker}/nope
**Description:** Get NOPE (Net Options Pricing Effect) data (added 2024.10.30).

**Path Parameters:**
- `ticker` (string, required): A single ticker. Example: AAPL

#### GET /api/stock/{ticker}/greek-flow
**Description:** Get Greek flow data (added 2024.10.28).

**Path Parameters:**
- `ticker` (string, required): A single ticker. Example: AAPL

#### GET /api/stock/{ticker}/greek-flow/{expiry}
**Description:** Get Greek flow data for specific expiry (added 2024.10.28).

**Path Parameters:**
- `ticker` (string, required): A single ticker. Example: AAPL
- `expiry` (string, required): Expiration date

#### GET /api/stock/{ticker}/flow-per-strike-intraday
**Description:** Get intraday flow per strike data (added 2024.08.01).

**Path Parameters:**
- `ticker` (string, required): A single ticker. Example: AAPL

#### GET /api/stock/{ticker}/max-pain
**Description:** Get max pain data for options (added 2024.03.04).

**Path Parameters:**
- `ticker` (string, required): A single ticker. Example: AAPL

#### GET /api/stock/{ticker}/volatility/realized
**Description:** Retrieve a stock's realized volatility (added 2024.05.06).

**Path Parameters:**
- `ticker` (string, required): A single ticker. Example: AAPL


### Shorts Endpoints (Added 2025.03.10)

The shorts endpoints provide comprehensive data about short selling activity, including volumes, ratios, and failures to deliver.

#### GET /api/shorts/{ticker}/data
**Description:** Get comprehensive short selling data for a ticker.

**Path Parameters:**
- `ticker` (string, required): A single ticker. Example: AAPL

#### GET /api/shorts/{ticker}/volumes-by-exchange
**Description:** Get short volumes broken down by exchange.

**Path Parameters:**
- `ticker` (string, required): A single ticker. Example: AAPL

#### GET /api/shorts/{ticker}/ftds
**Description:** Get failures to deliver data.

**Path Parameters:**
- `ticker` (string, required): A single ticker. Example: AAPL

#### GET /api/shorts/{ticker}/interest-float
**Description:** Get short interest and float data.

**Path Parameters:**
- `ticker` (string, required): A single ticker. Example: AAPL

#### GET /api/shorts/{ticker}/volume-and-ratio
**Description:** Get short volume and ratio data.

**Path Parameters:**
- `ticker` (string, required): A single ticker. Example: AAPL

### News Endpoints

#### GET /api/news/headlines (Added 2025.03.10)
**Description:** Access financial news headlines with filtering capabilities.

**Parameters:**
- Various filtering options for news headlines

### WebSocket Endpoints

The WebSocket API provides real-time streaming data for various market events and updates.

#### Available Channels:
- `gex_strike_expiry:<TICKER>` (added 2025.01.22): GEX strike expiry data
- `gex:TICKER` (added 2024.05.17): GEX data
- `gex_strike:TICKER` (added 2024.05.17): GEX strike data
- `price:TICKER` (added 2024.05.01): Live price updates
- `flow-alerts` (added 2024.03.06): Flow alerts streaming

### Institution Endpoints

#### GET /api/institution/latest_filings (Added 2024.10.15)
**Description:** Get latest institutional filings.

#### GET /api/institution/{ticker}/ownership (Added 2024.10.15)
**Description:** Get institutional ownership data for a ticker.

**Path Parameters:**
- `ticker` (string, required): A single ticker. Example: AAPL

#### GET /api/institution/{name}/holdings (Enhanced 2024.11.09)
**Description:** Get institutional holdings with enhanced percentage data.

**Path Parameters:**
- `name` (string, required): Institution name

**Response Fields (Enhanced):**
- `perc_of_total` (number): Percentage of total holdings
- `perc_of_share_value` (number): Percentage of share value

#### GET /api/institution/{name}/activity (Added 2024.10.10)
**Description:** Get institutional activity data.

**Path Parameters:**
- `name` (string, required): Institution name

#### GET /api/institution/{name}/sectors (Added 2024.10.09)
**Description:** Get institutional sector exposure.

**Path Parameters:**
- `name` (string, required): Institution name

#### GET /api/institutions (Added 2024.10.09)
**Description:** Get list of institutions.

### ETF Endpoints

#### GET /api/etfs/{ticker}/in_outflow (Added 2024.10.16)
**Description:** Get ETF inflow and outflow data.

**Path Parameters:**
- `ticker` (string, required): ETF ticker. Example: SPY

#### GET /api/market/{ticker}/etf-tide (Added 2024.05.02)
**Description:** Get ETF tide data.

**Path Parameters:**
- `ticker` (string, required): ETF ticker. Example: SPY


## API Usage Guidelines

### Authentication
All API endpoints require Bearer token authentication. Include your token in the Authorization header:
```
Authorization: Bearer YOUR_TOKEN_HERE
```

### Rate Limiting
- Default limits vary by endpoint
- Most endpoints support pagination with `limit` and `page` parameters
- Maximum limits are typically 200-500 items per request

### Date Formats
- Use YYYY-MM-DD format for date parameters
- Most endpoints default to the last trading date if no date is specified
- Timestamps are typically in ISO format with timezone information

### Common Parameters
- `ticker`: Stock ticker symbol (e.g., AAPL, TSLA)
- `date`: Trading date in YYYY-MM-DD format
- `limit`: Number of items to return
- `page`: Page number for pagination (starts at 0)

### Response Format
All endpoints return JSON responses with a consistent structure:
```json
{
  "data": [...],
  "date": "2024-01-18"
}
```

## Endpoint Categories Summary

| Category | Endpoint Count | Key Features |
|----------|----------------|--------------|
| **Alerts** | 2 | Alert management and triggered notifications |
| **Congress** | 3 | Congressional trading data and member information |
| **Dark Pool** | 2 | Off-exchange trading data and institutional activity |
| **Earnings** | 3 | Earnings announcements and expected moves |
| **ETFs** | 2 | ETF flow data and tide information |
| **Market** | 14+ | Market-wide data including correlations, FDA calendar, sector data |
| **News** | 1 | Financial news headlines with filtering |
| **Option Contracts** | 5 | Detailed option contract data and analytics |
| **Option Trades** | Multiple | Options flow, alerts, and trading data |
| **Shorts** | 5 | Short selling data and metrics |
| **Stock** | 20+ | Comprehensive stock data including Greeks, flows, and exposures |
| **Institution** | 6 | Institutional holdings and activity |
| **WebSocket** | Multiple | Real-time streaming data channels |

## Breaking Changes and Deprecations

### Important Migration Notes:

1. **2025.02.19**: `/stock/:ticker/spot-exposures/:expiry/strike` deprecated
   - **Migration**: Replace with `/stock/:ticker/spot-exposures/expiry-strike?expirations[]=expiry`

2. **2025.02.13**: `/congress/recent-reports` removed
   - **Migration**: Use `/congress/recent-trades` instead

3. **2024.03.23**: `/option-contract/:id/flow` response format changed
   - **Old**: Returns data as JSON list
   - **New**: Returns `{"data": [], "date": "2024-03-22"}` format
   - **Note**: Now only returns data for a single trading day

## Recent Enhancements (2025)

### Major Additions:
- **Sector Tide**: Market tide data for specific sectors
- **Interpolated IV**: Implied volatility interpolation for various days
- **Volume Profile**: Option contract volume distribution by price
- **Intraday Data**: 1-minute tick data for option contracts
- **Shorts API**: Comprehensive short selling data suite
- **Enhanced Filtering**: Improved date ranges and filtering options

### Performance Improvements:
- Enhanced FDA calendar with better data quality
- Improved dark pool filtering capabilities
- Extended websocket access for full tape data

## Support and Resources

- **API Support**: support@unusualwhales.com
- **Enterprise/Professional**: Contact support for redistribution licenses
- **Documentation**: https://api.unusualwhales.com/docs
- **Base URL**: https://api.unusualwhales.com

---

*This reference document was generated by Manus AI on August 5, 2025, based on the official Unusual Whales API documentation.*

