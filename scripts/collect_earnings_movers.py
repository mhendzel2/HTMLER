import requests
import datetime
import csv

# CONFIGURATION
PRICE_CHANGE_THRESHOLD = 0.05  # 5%
DATE = datetime.date.today().isoformat()
OUTPUT_CSV = f"earnings_movers_{DATE}.csv"

# Replace with your real data sources/APIs
EARNINGS_API = "https://api.nasdaq.com/api/calendar/earnings?date={date}"
PRICE_API = "https://query1.finance.yahoo.com/v7/finance/quote?symbols={tickers}"
OPTIONS_API = "https://query2.finance.yahoo.com/v7/finance/options/{ticker}"

headers = {"User-Agent": "Mozilla/5.0"}

def get_earnings_tickers(date):
    url = EARNINGS_API.format(date=date)
    resp = requests.get(url, headers=headers)
    if resp.status_code != 200:
        print(f"Failed to fetch earnings calendar: {resp.status_code}")
        return []
    data = resp.json()
    tickers = []
    for row in data.get('data', {}).get('rows', []):
        symbol = row.get('symbol')
        if symbol:
            tickers.append(symbol.upper())
    return tickers

def get_price_changes(tickers):
    movers = []
    for i in range(0, len(tickers), 10):
        batch = tickers[i:i+10]
        url = PRICE_API.format(tickers=','.join(batch))
        resp = requests.get(url, headers=headers)
        if resp.status_code != 200:
            continue
        quotes = resp.json().get('quoteResponse', {}).get('result', [])
        for q in quotes:
            prev = q.get('regularMarketPreviousClose')
            last = q.get('regularMarketPrice')
            if prev and last:
                change = (last - prev) / prev
                if abs(change) >= PRICE_CHANGE_THRESHOLD:
                    movers.append({
                        'ticker': q['symbol'],
                        'change': change,
                        'prev_close': prev,
                        'last_price': last
                    })
    return movers

def get_options_chain(ticker):
    url = OPTIONS_API.format(ticker=ticker)
    resp = requests.get(url, headers=headers)
    if resp.status_code != 200:
        return None
    return resp.json()

def main():
    print(f"Collecting earnings movers for {DATE}")
    tickers = get_earnings_tickers(DATE)
    if not tickers:
        print("No earnings tickers found.")
        return
    movers = get_price_changes(tickers)
    print(f"Found {len(movers)} tickers with >5% move.")
    with open(OUTPUT_CSV, 'w', newline='') as csvfile:
        fieldnames = ['ticker', 'change', 'prev_close', 'last_price', 'options_chain']
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        for m in movers:
            options = get_options_chain(m['ticker'])
            m['options_chain'] = options if options else 'N/A'
            writer.writerow(m)
    print(f"Done. Results saved to {OUTPUT_CSV}")

if __name__ == "__main__":
    main()
