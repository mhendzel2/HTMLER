"""
Improved database models using SQLAlchemy ORM with proper relationships,
indexing, and data validation.
"""

from sqlalchemy import (
    create_engine, Column, Integer, String, Float, DateTime, Boolean, 
    Text, ForeignKey, Index, UniqueConstraint, CheckConstraint
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship, Session
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import JSON
from sqlalchemy.sql import func
from datetime import datetime
from typing import Optional, List, Dict, Any
import uuid
import logging

from ..config import config


Base = declarative_base()


class TimestampMixin:
    """Mixin for adding timestamp fields to models."""
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)


class Stock(Base, TimestampMixin):
    """Stock information model."""
    __tablename__ = 'stocks'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticker = Column(String(10), unique=True, nullable=False, index=True)
    company_name = Column(String(255))
    sector = Column(String(100), index=True)
    industry = Column(String(100))
    market_cap = Column(Float)
    description = Column(Text)
    exchange = Column(String(20))
    currency = Column(String(3), default='USD')
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Relationships
    watchlist_items = relationship("WatchlistItem", back_populates="stock")
    earnings = relationship("Earnings", back_populates="stock")
    options_data = relationship("OptionsData", back_populates="stock")
    insider_trades = relationship("InsiderTrade", back_populates="stock")
    price_data = relationship("PriceData", back_populates="stock")
    
    __table_args__ = (
        Index('idx_stocks_sector_active', 'sector', 'is_active'),
        Index('idx_stocks_market_cap', 'market_cap'),
    )
    
    def __repr__(self):
        return f"<Stock(ticker='{self.ticker}', company_name='{self.company_name}')>"


class Watchlist(Base, TimestampMixin):
    """User watchlist model."""
    __tablename__ = 'watchlists'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    is_default = Column(Boolean, default=False, nullable=False)
    user_id = Column(String(100))  # For future multi-user support
    
    # Relationships
    items = relationship("WatchlistItem", back_populates="watchlist", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index('idx_watchlists_user_default', 'user_id', 'is_default'),
    )


class WatchlistItem(Base, TimestampMixin):
    """Individual items in a watchlist."""
    __tablename__ = 'watchlist_items'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    watchlist_id = Column(UUID(as_uuid=True), ForeignKey('watchlists.id'), nullable=False)
    stock_id = Column(UUID(as_uuid=True), ForeignKey('stocks.id'), nullable=False)
    position = Column(Integer, default=0)  # For ordering
    notes = Column(Text)
    
    # Relationships
    watchlist = relationship("Watchlist", back_populates="items")
    stock = relationship("Stock", back_populates="watchlist_items")
    
    __table_args__ = (
        UniqueConstraint('watchlist_id', 'stock_id', name='uq_watchlist_stock'),
        Index('idx_watchlist_items_position', 'watchlist_id', 'position'),
    )


class Earnings(Base, TimestampMixin):
    """Earnings announcement data."""
    __tablename__ = 'earnings'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    stock_id = Column(UUID(as_uuid=True), ForeignKey('stocks.id'), nullable=False)
    earnings_date = Column(DateTime, nullable=False, index=True)
    report_time = Column(String(20))  # 'premarket', 'postmarket', etc.
    fiscal_quarter = Column(String(10))
    fiscal_year = Column(Integer)
    
    # EPS data
    eps_estimate = Column(Float)
    eps_actual = Column(Float)
    eps_surprise = Column(Float)
    eps_surprise_percent = Column(Float)
    
    # Revenue data
    revenue_estimate = Column(Float)
    revenue_actual = Column(Float)
    revenue_surprise = Column(Float)
    revenue_surprise_percent = Column(Float)
    
    # Options data
    expected_move = Column(Float)
    expected_move_percent = Column(Float)
    implied_volatility = Column(Float)
    
    # Relationships
    stock = relationship("Stock", back_populates="earnings")
    
    __table_args__ = (
        Index('idx_earnings_date_time', 'earnings_date', 'report_time'),
        Index('idx_earnings_stock_date', 'stock_id', 'earnings_date'),
        CheckConstraint('eps_surprise_percent >= -100', name='check_eps_surprise_percent'),
    )


class OptionsData(Base, TimestampMixin):
    """Options flow and volume data."""
    __tablename__ = 'options_data'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    stock_id = Column(UUID(as_uuid=True), ForeignKey('stocks.id'), nullable=False)
    trade_date = Column(DateTime, nullable=False, index=True)
    
    # Volume data
    call_volume = Column(Integer, default=0)
    put_volume = Column(Integer, default=0)
    total_volume = Column(Integer, default=0)
    
    # Premium data
    call_premium = Column(Float, default=0.0)
    put_premium = Column(Float, default=0.0)
    total_premium = Column(Float, default=0.0)
    net_premium = Column(Float, default=0.0)
    
    # Ratios and metrics
    put_call_ratio = Column(Float)
    put_call_volume_ratio = Column(Float)
    unusual_activity_score = Column(Float)
    
    # Open interest
    call_oi = Column(Integer, default=0)
    put_oi = Column(Integer, default=0)
    total_oi = Column(Integer, default=0)
    
    # Greeks (aggregated)
    net_delta = Column(Float)
    net_gamma = Column(Float)
    net_theta = Column(Float)
    net_vega = Column(Float)
    
    # Relationships
    stock = relationship("Stock", back_populates="options_data")
    
    __table_args__ = (
        Index('idx_options_data_stock_date', 'stock_id', 'trade_date'),
        Index('idx_options_data_unusual_score', 'unusual_activity_score'),
        CheckConstraint('total_volume >= 0', name='check_total_volume_positive'),
        CheckConstraint('put_call_ratio >= 0', name='check_pcr_positive'),
    )


class InsiderTrade(Base, TimestampMixin):
    """Insider trading data."""
    __tablename__ = 'insider_trades'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    stock_id = Column(UUID(as_uuid=True), ForeignKey('stocks.id'), nullable=False)
    
    # Insider information
    insider_name = Column(String(255), nullable=False)
    insider_title = Column(String(255))
    insider_relation = Column(String(100))  # 'Officer', 'Director', '10% Owner', etc.
    
    # Transaction details
    transaction_date = Column(DateTime, nullable=False, index=True)
    transaction_type = Column(String(20), nullable=False)  # 'Buy', 'Sell', 'Gift', etc.
    transaction_code = Column(String(10))  # SEC transaction codes
    
    # Financial details
    shares = Column(Integer)
    price_per_share = Column(Float)
    transaction_value = Column(Float)
    shares_owned_after = Column(Integer)
    
    # Additional metadata
    form_type = Column(String(10))  # '4', '5', etc.
    filing_date = Column(DateTime)
    is_direct_ownership = Column(Boolean, default=True)
    
    # Relationships
    stock = relationship("Stock", back_populates="insider_trades")
    
    __table_args__ = (
        Index('idx_insider_trades_stock_date', 'stock_id', 'transaction_date'),
        Index('idx_insider_trades_insider', 'insider_name', 'transaction_date'),
        Index('idx_insider_trades_value', 'transaction_value'),
        CheckConstraint('shares >= 0', name='check_shares_positive'),
        CheckConstraint('price_per_share >= 0', name='check_price_positive'),
    )


class PriceData(Base, TimestampMixin):
    """Historical price data."""
    __tablename__ = 'price_data'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    stock_id = Column(UUID(as_uuid=True), ForeignKey('stocks.id'), nullable=False)
    timestamp = Column(DateTime, nullable=False, index=True)
    timeframe = Column(String(10), nullable=False)  # '1m', '5m', '1h', '1d', etc.
    
    # OHLCV data
    open_price = Column(Float, nullable=False)
    high_price = Column(Float, nullable=False)
    low_price = Column(Float, nullable=False)
    close_price = Column(Float, nullable=False)
    volume = Column(Integer, default=0)
    
    # Additional metrics
    vwap = Column(Float)  # Volume Weighted Average Price
    typical_price = Column(Float)  # (H+L+C)/3
    
    # Relationships
    stock = relationship("Stock", back_populates="price_data")
    
    __table_args__ = (
        UniqueConstraint('stock_id', 'timestamp', 'timeframe', name='uq_price_data'),
        Index('idx_price_data_stock_timeframe', 'stock_id', 'timeframe', 'timestamp'),
        CheckConstraint('high_price >= low_price', name='check_high_low'),
        CheckConstraint('high_price >= open_price', name='check_high_open'),
        CheckConstraint('high_price >= close_price', name='check_high_close'),
        CheckConstraint('low_price <= open_price', name='check_low_open'),
        CheckConstraint('low_price <= close_price', name='check_low_close'),
        CheckConstraint('volume >= 0', name='check_volume_positive'),
    )


class AnalysisResult(Base, TimestampMixin):
    """Stored analysis results."""
    __tablename__ = 'analysis_results'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    stock_id = Column(UUID(as_uuid=True), ForeignKey('stocks.id'), nullable=False)
    analysis_type = Column(String(50), nullable=False, index=True)
    analysis_date = Column(DateTime, nullable=False, index=True)
    
    # Analysis parameters and results stored as JSON
    parameters = Column(JSON)
    results = Column(JSON)
    
    # Metadata
    version = Column(String(20))  # Analysis algorithm version
    confidence_score = Column(Float)
    
    __table_args__ = (
        Index('idx_analysis_results_stock_type', 'stock_id', 'analysis_type'),
        Index('idx_analysis_results_date_type', 'analysis_date', 'analysis_type'),
    )


class DatabaseManager:
    """Database manager with connection pooling and session management."""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.engine = None
        self.SessionLocal = None
        self._initialize_database()
    
    def _initialize_database(self):
        """Initialize database connection and create tables."""
        try:
            # Create engine with connection pooling
            self.engine = create_engine(
                config.database.url,
                pool_size=config.database.pool_size,
                max_overflow=config.database.max_overflow,
                echo=config.database.echo,
                pool_pre_ping=True,  # Verify connections before use
                pool_recycle=3600,   # Recycle connections every hour
            )
            
            # Create session factory
            self.SessionLocal = sessionmaker(
                autocommit=False,
                autoflush=False,
                bind=self.engine
            )
            
            # Create all tables
            Base.metadata.create_all(bind=self.engine)
            
            self.logger.info("Database initialized successfully")
            
        except Exception as e:
            self.logger.error(f"Failed to initialize database: {e}")
            raise
    
    def get_session(self) -> Session:
        """Get a database session."""
        return self.SessionLocal()
    
    def get_or_create_stock(self, session: Session, ticker: str, **kwargs) -> Stock:
        """Get existing stock or create new one."""
        stock = session.query(Stock).filter(Stock.ticker == ticker.upper()).first()
        
        if not stock:
            stock = Stock(ticker=ticker.upper(), **kwargs)
            session.add(stock)
            session.flush()  # Get the ID without committing
        
        return stock
    
    def get_default_watchlist(self, session: Session, user_id: str = "default") -> Watchlist:
        """Get or create default watchlist for user."""
        watchlist = session.query(Watchlist).filter(
            Watchlist.user_id == user_id,
            Watchlist.is_default == True
        ).first()
        
        if not watchlist:
            watchlist = Watchlist(
                name="Default Watchlist",
                user_id=user_id,
                is_default=True
            )
            session.add(watchlist)
            session.flush()
        
        return watchlist
    
    def add_to_watchlist(
        self, 
        ticker: str, 
        watchlist_name: str = "Default Watchlist",
        user_id: str = "default"
    ) -> bool:
        """Add ticker to watchlist."""
        try:
            with self.get_session() as session:
                # Get or create stock
                stock = self.get_or_create_stock(session, ticker)
                
                # Get or create watchlist
                if watchlist_name == "Default Watchlist":
                    watchlist = self.get_default_watchlist(session, user_id)
                else:
                    watchlist = session.query(Watchlist).filter(
                        Watchlist.name == watchlist_name,
                        Watchlist.user_id == user_id
                    ).first()
                    
                    if not watchlist:
                        watchlist = Watchlist(name=watchlist_name, user_id=user_id)
                        session.add(watchlist)
                        session.flush()
                
                # Check if already in watchlist
                existing = session.query(WatchlistItem).filter(
                    WatchlistItem.watchlist_id == watchlist.id,
                    WatchlistItem.stock_id == stock.id
                ).first()
                
                if not existing:
                    # Get next position
                    max_position = session.query(func.max(WatchlistItem.position)).filter(
                        WatchlistItem.watchlist_id == watchlist.id
                    ).scalar() or 0
                    
                    item = WatchlistItem(
                        watchlist_id=watchlist.id,
                        stock_id=stock.id,
                        position=max_position + 1
                    )
                    session.add(item)
                
                session.commit()
                return True
                
        except Exception as e:
            self.logger.error(f"Error adding {ticker} to watchlist: {e}")
            return False
    
    def get_watchlist_tickers(
        self, 
        watchlist_name: str = "Default Watchlist",
        user_id: str = "default"
    ) -> List[str]:
        """Get tickers from watchlist."""
        try:
            with self.get_session() as session:
                query = session.query(Stock.ticker).join(
                    WatchlistItem, Stock.id == WatchlistItem.stock_id
                ).join(
                    Watchlist, WatchlistItem.watchlist_id == Watchlist.id
                ).filter(
                    Watchlist.name == watchlist_name,
                    Watchlist.user_id == user_id
                ).order_by(WatchlistItem.position)
                
                return [ticker for ticker, in query.all()]
                
        except Exception as e:
            self.logger.error(f"Error getting watchlist tickers: {e}")
            return []
    
    def save_earnings_data(self, ticker: str, earnings_data: Dict[str, Any]) -> bool:
        """Save earnings data to database."""
        try:
            with self.get_session() as session:
                stock = self.get_or_create_stock(session, ticker)
                
                earnings = Earnings(
                    stock_id=stock.id,
                    earnings_date=datetime.fromisoformat(earnings_data['earnings_date']),
                    report_time=earnings_data.get('report_time'),
                    fiscal_quarter=earnings_data.get('fiscal_quarter'),
                    fiscal_year=earnings_data.get('fiscal_year'),
                    eps_estimate=earnings_data.get('eps_estimate'),
                    eps_actual=earnings_data.get('eps_actual'),
                    revenue_estimate=earnings_data.get('revenue_estimate'),
                    revenue_actual=earnings_data.get('revenue_actual'),
                    expected_move=earnings_data.get('expected_move'),
                    expected_move_percent=earnings_data.get('expected_move_percent'),
                    implied_volatility=earnings_data.get('implied_volatility')
                )
                
                session.merge(earnings)  # Use merge to handle duplicates
                session.commit()
                return True
                
        except Exception as e:
            self.logger.error(f"Error saving earnings data for {ticker}: {e}")
            return False
    
    def cleanup_old_data(self, days_to_keep: int = 90):
        """Clean up old data to manage database size."""
        try:
            with self.get_session() as session:
                cutoff_date = datetime.now() - timedelta(days=days_to_keep)
                
                # Clean up old price data
                deleted_price = session.query(PriceData).filter(
                    PriceData.timestamp < cutoff_date
                ).delete()
                
                # Clean up old options data
                deleted_options = session.query(OptionsData).filter(
                    OptionsData.trade_date < cutoff_date
                ).delete()
                
                session.commit()
                
                self.logger.info(
                    f"Cleaned up {deleted_price} price records and "
                    f"{deleted_options} options records older than {days_to_keep} days"
                )
                
        except Exception as e:
            self.logger.error(f"Error during data cleanup: {e}")


# Global database manager instance
db_manager = DatabaseManager()

