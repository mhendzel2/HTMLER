import pytest
from pathlib import Path
from ..config import config
from ..models.database import DatabaseManager, Stock, Watchlist, WatchlistItem, Earnings


@pytest.fixture
def db_manager(tmp_path):
    original_url = config.database.url
    db_path = tmp_path / "test.db"
    config.database.url = f"sqlite:///{db_path}"
    manager = DatabaseManager()
    try:
        yield manager
    finally:
        config.database.url = original_url


def test_add_to_watchlist_stores_stock_and_item(db_manager):
    assert db_manager.add_to_watchlist("AAPL")
    with db_manager.get_session() as session:
        stock = session.query(Stock).filter_by(ticker="AAPL").one()
        assert stock.ticker == "AAPL"
        watchlist_items = session.query(WatchlistItem).all()
        assert len(watchlist_items) == 1
        assert watchlist_items[0].stock_id == stock.id


def test_save_earnings_data_persists(db_manager):
    sample = {
        "earnings_date": "2025-01-15",
        "report_time": "postmarket",
        "eps_estimate": 2.5,
        "expected_move": 5.2,
    }
    assert db_manager.save_earnings_data("AAPL", sample)
    with db_manager.get_session() as session:
        earnings = session.query(Earnings).join(Stock).filter(Stock.ticker == "AAPL").one()
        assert earnings.report_time == "postmarket"
        assert earnings.expected_move == 5.2
