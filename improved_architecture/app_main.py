import asyncio
import logging
import streamlit as st
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any

from improved_architecture.services.api_service import api_service, APIResponse

# --- Configuration ---
# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

# Constants
COMMON_ETFS = {"SPY", "QQQ", "IWM", "DIA", "VOO", "VTI"}

class TradeAlertMonitor:
    """
    Monitors for high-probability options trades based on Unusual Whales data.
    """

    def __init__(self):
        self.api_service = api_service

    async def run_checks(self) -> (List[Dict[str, Any]], List[Dict[str, Any]]):
        """Runs all alert checks and returns the results."""
        alpha_alerts = await self.check_alpha_predator_alerts()
        dark_pool_alerts = await self.check_dark_pool_divergence_alerts()
        return alpha_alerts, dark_pool_alerts

    async def check_dark_pool_divergence_alerts(self) -> List[Dict[str, Any]]:
        """
        Checks for 'Dark Pool Divergence' alerts and returns them.
        """
        logger.info("Checking for 'Dark Pool Divergence' alerts...")
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        alerts = []

        async with self.api_service as service:
            response = await service.get_dark_pool_trades(date=today, min_premium=1000000, limit=100)

            if not response.success or not response.data.get('data'):
                st.error(f"Failed to get dark pool trades: {response.error}")
                return alerts

            trades = response.data['data']

            for trade in trades:
                try:
                    ticker = trade.get('ticker')
                    if not ticker or ticker in COMMON_ETFS:
                        continue

                    premium = float(trade.get('premium', 0))

                    options_response = await service.get_options_flow(ticker=ticker, date=today, limit=500)
                    if not options_response.success or not options_response.data.get('data'):
                        continue

                    options_trades = options_response.data['data']

                    total_call_premium = sum(float(t.get('premium', 0)) for t in options_trades if t.get('option_type') == 'call')
                    total_put_premium = sum(float(t.get('premium', 0)) for t in options_trades if t.get('option_type') == 'put')

                    call_put_ratio = float('inf') if total_put_premium == 0 else total_call_premium / total_put_premium
                    bullish_sweeps = sum(1 for t in options_trades if t.get('option_type') == 'call' and t.get('order_type') == 'sweep' and t.get('side') == 'ask')

                    if call_put_ratio > 5.0 and bullish_sweeps > 5:
                        alert = {
                            "ticker": ticker,
                            "dark_pool_premium": f"${premium:,.2f}",
                            "call_put_ratio": f"{call_put_ratio:.2f}",
                            "bullish_sweeps": bullish_sweeps,
                        }
                        alerts.append(alert)
                        logger.info(f"DARK POOL DIVERGENCE ALERT: {alert}")

                except (ValueError, TypeError, KeyError) as e:
                    logger.error(f"Error processing dark pool trade: {trade}. Error: {e}")
        return alerts

    async def check_alpha_predator_alerts(self) -> List[Dict[str, Any]]:
        """
        Checks for the 'Alpha Predator' bullish swing trade alerts and returns them.
        """
        logger.info("Checking for 'Alpha Predator' alerts...")
        alerts = []

        async with self.api_service as service:
            hottest_chains_response = await service.get_hottest_chains(limit=50)
            if not hottest_chains_response.success or not hottest_chains_response.data.get('data'):
                st.error(f"Failed to get hottest chains: {hottest_chains_response.error}")
                return alerts

            hottest_chains = hottest_chains_response.data['data']
            tickers = {chain.get('ticker') for chain in hottest_chains if chain.get('ticker')}

            for ticker in tickers:
                if ticker in COMMON_ETFS:
                    continue

                options_flow_response = await service.get_options_flow(ticker=ticker, limit=200)
                if not options_flow_response.success or not options_flow_response.data.get('data'):
                    continue

                trades = options_flow_response.data['data']

                for trade in trades:
                    try:
                        if trade.get('side') != 'ask' or trade.get('order_type') != 'sweep':
                            continue

                        premium = float(trade.get('premium', 0))
                        if premium <= 250000:
                            continue

                        expiry_str = trade.get('expiry')
                        if not expiry_str:
                            continue

                        expiry_date = datetime.fromisoformat(expiry_str)
                        dte = (expiry_date - datetime.now(timezone.utc)).days
                        if not (14 <= dte <= 60):
                            continue

                        contract_id = trade.get('option_symbol')
                        if not contract_id:
                            continue

                        historic_response = await service.get_option_contract_historic(contract_id)
                        if not historic_response.success or not historic_response.data.get('data'):
                            logger.warning(f"Could not get historic data for {contract_id}")
                            continue

                        historic_data = historic_response.data['data'][0]
                        volume = int(historic_data.get('total_volume', 0))
                        open_interest = int(historic_data.get('open_interest', 0))

                        if open_interest > 0 and (volume / open_interest) > 2:
                            alert = {
                                "ticker": trade['ticker'],
                                "contract": contract_id,
                                "premium": f"${premium:,.2f}",
                                "dte": dte,
                                "vol_oi_ratio": f"{volume / open_interest:.2f}",
                                "volume": volume,
                                "open_interest": open_interest,
                            }
                            alerts.append(alert)
                            logger.info(f"ALPHA PREDATOR ALERT: {alert}")

                    except (ValueError, TypeError, KeyError) as e:
                        logger.error(f"Error processing trade for {ticker}: {trade}. Error: {e}")
        return alerts

def display_alerts(title: str, alerts: List[Dict[str, Any]]):
    """Displays a list of alerts in Streamlit."""
    st.subheader(title)
    if not alerts:
        st.info("No alerts found.")
        return

    for alert in alerts:
        with st.expander(f"{alert['ticker']}"):
            st.json(alert)

# --- Streamlit App ---
st.set_page_config(page_title="Unusual Whales Trade Alert Monitor", layout="wide")
st.title("📈 Unusual Whales Trade Alert Monitor")
st.caption("A standalone tool to monitor trade alerts based on custom strategies.")

monitor = TradeAlertMonitor()

if st.button("🚀 Scan for Trade Alerts", type="primary"):
    with st.spinner("Scanning for alerts... This may take a moment."):
        alpha_alerts, dark_pool_alerts = asyncio.run(monitor.run_checks())

    st.success("Scan complete!")

    col1, col2 = st.columns(2)
    with col1:
        display_alerts("🦁 Alpha Predator Alerts", alpha_alerts)
    with col2:
        display_alerts("🌊 Dark Pool Divergence Alerts", dark_pool_alerts)
