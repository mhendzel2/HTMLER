import asyncio
import logging
import argparse
from datetime import datetime, timedelta, timezone

from .services.api_service import api_service, APIResponse

# --- Configuration ---
# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

# Constants
POLL_INTERVAL_SECONDS = 300  # 5 minutes
COMMON_ETFS = {"SPY", "QQQ", "IWM", "DIA", "VOO", "VTI"}

class TradeAlertMonitor:
    """
    Monitors for high-probability options trades based on Unusual Whales data.
    """

    def __init__(self):
        self.api_service = api_service

    async def run(self):
        """Main loop to run the monitoring process."""
        logger.info("Starting trade alert monitor...")
        logger.info("Running alert checks...")
        try:
            await self.check_for_alerts()
        except Exception as e:
            logger.error(f"An error occurred during alert checking: {e}", exc_info=True)

        logger.info("Monitoring check finished.")

    async def check_for_alerts(self):
        """Checks for all defined alert types."""
        await self.check_alpha_predator_alerts()
        await self.check_dark_pool_divergence_alerts()

    async def check_dark_pool_divergence_alerts(self):
        """
        Checks for 'Dark Pool Divergence' alerts.
        """
        logger.info("Checking for 'Dark Pool Divergence' alerts...")
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

        async with self.api_service as service:
            response = await service.get_dark_pool_trades(date=today, min_premium=1000000, limit=100)

            if not response.success or not response.data.get('data'):
                logger.error(f"Failed to get dark pool trades: {response.error}")
                return

            trades = response.data['data']

            for trade in trades:
                try:
                    ticker = trade.get('ticker')
                    if not ticker or ticker in COMMON_ETFS:
                        continue

                    premium = float(trade.get('premium', 0))

                    # Now get options flow for this ticker
                    options_response = await service.get_options_flow(ticker=ticker, date=today, limit=500)
                    if not options_response.success or not options_response.data.get('data'):
                        continue

                    options_trades = options_response.data['data']

                    # Analyze options flow for bullish signs
                    total_call_premium = sum(float(t.get('premium', 0)) for t in options_trades if t.get('option_type') == 'call')
                    total_put_premium = sum(float(t.get('premium', 0)) for t in options_trades if t.get('option_type') == 'put')

                    if total_put_premium == 0:
                        call_put_ratio = float('inf')
                    else:
                        call_put_ratio = total_call_premium / total_put_premium

                    # Look for aggressive call buying
                    bullish_sweeps = sum(1 for t in options_trades if t.get('option_type') == 'call' and t.get('order_type') == 'sweep' and t.get('side') == 'ask')

                    if call_put_ratio > 5.0 and bullish_sweeps > 5:
                        logger.info(f"DARK POOL DIVERGENCE ALERT: {ticker}")
                        logger.info(f"  Large Dark Pool Print: ${premium:,.2f}")
                        logger.info(f"  Bullish Options Flow:")
                        logger.info(f"    Call/Put Premium Ratio: {call_put_ratio:.2f}")
                        logger.info(f"    Aggressive Call Sweeps: {bullish_sweeps}")
                        logger.info("-" * 30)

                except (ValueError, TypeError, KeyError) as e:
                    logger.error(f"Error processing dark pool trade: {trade}. Error: {e}")

    async def check_alpha_predator_alerts(self):
        """
        Checks for the 'Alpha Predator' bullish swing trade alerts using the new
        hottest chains approach.
        """
        logger.info("Checking for 'Alpha Predator' alerts...")

        async with self.api_service as service:
            # 1. Get hottest chains
            hottest_chains_response = await service.get_hottest_chains(limit=50)
            if not hottest_chains_response.success or not hottest_chains_response.data.get('data'):
                logger.error(f"Failed to get hottest chains: {hottest_chains_response.error}")
                return

            hottest_chains = hottest_chains_response.data['data']
            tickers = {chain.get('ticker') for chain in hottest_chains if chain.get('ticker')}

            # 2. For each hot ticker, get its options flow
            for ticker in tickers:
                if ticker in COMMON_ETFS:
                    continue

                options_flow_response = await service.get_options_flow(ticker=ticker, limit=200)
                if not options_flow_response.success or not options_flow_response.data.get('data'):
                    continue

                trades = options_flow_response.data['data']

                # 3. Apply filters to the trades
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
                            logger.info(f"ALPHA PREDATOR ALERT: {trade['ticker']}")
                            logger.info(f"  Contract: {contract_id}")
                            logger.info(f"  Premium: ${premium:,.2f}")
                            logger.info(f"  DTE: {dte}")
                            logger.info(f"  Vol/OI: {volume / open_interest:.2f} ({volume}/{open_interest})")
                            logger.info("-" * 30)

                    except (ValueError, TypeError, KeyError) as e:
                        logger.error(f"Error processing trade for {ticker}: {trade}. Error: {e}")

async def main():
    """Main function to run the trade alert monitor."""
    parser = argparse.ArgumentParser(description="Unusual Whales Trade Alert Monitor")
    # Add any command-line arguments if needed in the future
    args = parser.parse_args()

    monitor = TradeAlertMonitor()
    await monitor.run()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Trade alert monitor stopped by user.")
    except Exception as e:
        logger.error(f"An unexpected error occurred: {e}", exc_info=True)
