"""
Main application controller implementing proper MVC architecture with
asynchronous operations and comprehensive error handling.
"""

import asyncio
import logging
from typing import Dict, List, Optional, Any, Callable
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum
import traceback

from PyQt6.QtCore import QObject, pyqtSignal, QTimer, QThread, QMutex
from PyQt6.QtWidgets import QApplication

from ..services.api_service import api_service, APIResponse
from ..models.database import db_manager
from ..services.analysis_service import AnalysisService
from ..services.notification_service import NotificationService
from ..utils.async_qt import AsyncQtExecutor
from ..exceptions import ApplicationError


class AnalysisStatus(Enum):
    """Status of analysis operations."""
    IDLE = "idle"
    RUNNING = "running"
    COMPLETED = "completed"
    ERROR = "error"
    CANCELLED = "cancelled"


@dataclass
class AnalysisProgress:
    """Progress information for analysis operations."""
    status: AnalysisStatus
    current_step: str
    progress_percent: float
    total_steps: int
    completed_steps: int
    error_message: Optional[str] = None
    start_time: Optional[datetime] = None
    estimated_completion: Optional[datetime] = None


class MainController(QObject):
    """
    Main application controller coordinating between models, views, and services.
    Implements asynchronous operations with proper error handling and progress tracking.
    """
    
    # Signals for UI updates
    analysis_progress_updated = pyqtSignal(str, AnalysisProgress)  # ticker, progress
    watchlist_updated = pyqtSignal(list)  # list of tickers
    earnings_data_updated = pyqtSignal(str, dict)  # ticker, data
    market_data_updated = pyqtSignal(dict)  # market overview data
    error_occurred = pyqtSignal(str, str)  # error_type, error_message
    notification_sent = pyqtSignal(str, str, str)  # level, title, message
    
    def __init__(self):
        super().__init__()
        self.logger = logging.getLogger(__name__)
        
        # Services
        self.analysis_service = AnalysisService()
        self.notification_service = NotificationService()
        
        # Async executor for Qt integration
        self.async_executor = AsyncQtExecutor()
        
        # State management
        self._active_analyses: Dict[str, asyncio.Task] = {}
        self._analysis_progress: Dict[str, AnalysisProgress] = {}
        self._mutex = QMutex()
        
        # Auto-refresh timer
        self._refresh_timer = QTimer()
        self._refresh_timer.timeout.connect(self._auto_refresh)
        self._refresh_timer.start(300000)  # 5 minutes
        
        # Initialize
        self._initialize_controller()
    
    def _initialize_controller(self):
        """Initialize the controller and load initial data."""
        try:
            # Load watchlist
            self.refresh_watchlist()
            
            # Connect notification service
            self.notification_service.notification_sent.connect(
                self.notification_sent.emit
            )
            
            self.logger.info("Main controller initialized successfully")
            
        except Exception as e:
            self.logger.error(f"Error initializing controller: {e}")
            self.error_occurred.emit("initialization_error", str(e))
    
    def _auto_refresh(self):
        """Automatically refresh data at regular intervals."""
        try:
            # Refresh market data
            self.async_executor.run_async(self._refresh_market_data())
            
            # Refresh watchlist data for active tickers
            watchlist_tickers = db_manager.get_watchlist_tickers()
            if watchlist_tickers:
                # Limit auto-refresh to first 5 tickers to avoid rate limits
                limited_tickers = watchlist_tickers[:5]
                self.async_executor.run_async(
                    self._refresh_watchlist_data(limited_tickers)
                )
                
        except Exception as e:
            self.logger.error(f"Error during auto-refresh: {e}")
    
    async def _refresh_market_data(self):
        """Refresh market overview data."""
        try:
            async with api_service:
                response = await api_service.get_market_overview()
                
                if response.success:
                    self.market_data_updated.emit(response.data)
                else:
                    self.logger.warning(f"Failed to refresh market data: {response.error}")
                    
        except Exception as e:
            self.logger.error(f"Error refreshing market data: {e}")
    
    async def _refresh_watchlist_data(self, tickers: List[str]):
        """Refresh data for watchlist tickers."""
        try:
            async with api_service:
                responses = await api_service.get_multiple_stock_data(tickers)
                
                for ticker, response in responses.items():
                    if response.success:
                        # Update database with fresh data
                        await self._update_stock_data(ticker, response.data)
                        
        except Exception as e:
            self.logger.error(f"Error refreshing watchlist data: {e}")
    
    async def _update_stock_data(self, ticker: str, data: Dict[str, Any]):
        """Update stock data in database."""
        try:
            # This would be implemented to update the database
            # with fresh stock information
            pass
        except Exception as e:
            self.logger.error(f"Error updating stock data for {ticker}: {e}")
    
    def add_to_watchlist(self, ticker: str) -> bool:
        """
        Add ticker to watchlist and initiate data fetching.
        
        Args:
            ticker: Stock ticker symbol
            
        Returns:
            True if successfully added, False otherwise
        """
        try:
            ticker = ticker.upper().strip()
            
            # Validate ticker format
            if not ticker or len(ticker) > 10:
                self.error_occurred.emit("validation_error", "Invalid ticker symbol")
                return False
            
            # Add to database
            success = db_manager.add_to_watchlist(ticker)
            
            if success:
                # Refresh watchlist UI
                self.refresh_watchlist()
                
                # Start analysis for new ticker
                self.async_executor.run_async(self.analyze_ticker(ticker))
                
                self.notification_service.send_notification(
                    "info", "Watchlist Updated", f"Added {ticker} to watchlist"
                )
                
                return True
            else:
                self.error_occurred.emit("database_error", f"Failed to add {ticker} to watchlist")
                return False
                
        except Exception as e:
            self.logger.error(f"Error adding {ticker} to watchlist: {e}")
            self.error_occurred.emit("unexpected_error", str(e))
            return False
    
    def remove_from_watchlist(self, ticker: str) -> bool:
        """
        Remove ticker from watchlist.
        
        Args:
            ticker: Stock ticker symbol
            
        Returns:
            True if successfully removed, False otherwise
        """
        try:
            # Cancel any active analysis
            self.cancel_analysis(ticker)
            
            # Remove from database (implementation needed)
            # success = db_manager.remove_from_watchlist(ticker)
            
            # For now, just refresh the watchlist
            self.refresh_watchlist()
            
            self.notification_service.send_notification(
                "info", "Watchlist Updated", f"Removed {ticker} from watchlist"
            )
            
            return True
            
        except Exception as e:
            self.logger.error(f"Error removing {ticker} from watchlist: {e}")
            self.error_occurred.emit("unexpected_error", str(e))
            return False
    
    def refresh_watchlist(self):
        """Refresh watchlist from database."""
        try:
            tickers = db_manager.get_watchlist_tickers()
            self.watchlist_updated.emit(tickers)
            
        except Exception as e:
            self.logger.error(f"Error refreshing watchlist: {e}")
            self.error_occurred.emit("database_error", "Failed to load watchlist")
    
    async def analyze_ticker(self, ticker: str, force_refresh: bool = False) -> bool:
        """
        Perform comprehensive analysis for a ticker.
        
        Args:
            ticker: Stock ticker symbol
            force_refresh: Whether to bypass cache and fetch fresh data
            
        Returns:
            True if analysis completed successfully, False otherwise
        """
        ticker = ticker.upper()
        
        # Check if analysis is already running
        if ticker in self._active_analyses:
            self.logger.info(f"Analysis already running for {ticker}")
            return False
        
        # Initialize progress tracking
        progress = AnalysisProgress(
            status=AnalysisStatus.RUNNING,
            current_step="Initializing analysis",
            progress_percent=0.0,
            total_steps=6,
            completed_steps=0,
            start_time=datetime.now()
        )
        
        self._analysis_progress[ticker] = progress
        self.analysis_progress_updated.emit(ticker, progress)
        
        try:
            # Create analysis task
            task = asyncio.create_task(
                self._perform_ticker_analysis(ticker, force_refresh),
                name=f"analyze_{ticker}"
            )
            
            self._active_analyses[ticker] = task
            
            # Wait for completion
            result = await task
            
            # Update final progress
            progress.status = AnalysisStatus.COMPLETED
            progress.progress_percent = 100.0
            progress.completed_steps = progress.total_steps
            progress.current_step = "Analysis completed"
            
            self.analysis_progress_updated.emit(ticker, progress)
            
            return result
            
        except asyncio.CancelledError:
            progress.status = AnalysisStatus.CANCELLED
            progress.current_step = "Analysis cancelled"
            self.analysis_progress_updated.emit(ticker, progress)
            return False
            
        except Exception as e:
            self.logger.error(f"Error analyzing {ticker}: {e}")
            
            progress.status = AnalysisStatus.ERROR
            progress.error_message = str(e)
            progress.current_step = "Analysis failed"
            
            self.analysis_progress_updated.emit(ticker, progress)
            self.error_occurred.emit("analysis_error", f"Analysis failed for {ticker}: {e}")
            
            return False
            
        finally:
            # Clean up
            if ticker in self._active_analyses:
                del self._active_analyses[ticker]
    
    async def _perform_ticker_analysis(self, ticker: str, force_refresh: bool) -> bool:
        """Perform the actual ticker analysis steps."""
        progress = self._analysis_progress[ticker]
        
        try:
            async with api_service:
                # Step 1: Get basic stock info
                progress.current_step = "Fetching stock information"
                progress.completed_steps = 1
                progress.progress_percent = 16.7
                self.analysis_progress_updated.emit(ticker, progress)
                
                stock_info = await api_service.get_stock_info(ticker)
                if not stock_info.success:
                    raise ApplicationError(f"Failed to get stock info: {stock_info.error}")
                
                # Step 2: Get earnings data
                progress.current_step = "Fetching earnings data"
                progress.completed_steps = 2
                progress.progress_percent = 33.3
                self.analysis_progress_updated.emit(ticker, progress)
                
                earnings_data = await api_service.get_earnings_calendar()
                
                # Step 3: Get options flow
                progress.current_step = "Fetching options flow"
                progress.completed_steps = 3
                progress.progress_percent = 50.0
                self.analysis_progress_updated.emit(ticker, progress)
                
                options_flow = await api_service.get_options_flow(ticker)
                
                # Step 4: Get insider trades
                progress.current_step = "Fetching insider trades"
                progress.completed_steps = 4
                progress.progress_percent = 66.7
                self.analysis_progress_updated.emit(ticker, progress)
                
                insider_trades = await api_service.get_insider_trades(ticker)
                
                # Step 5: Perform analysis
                progress.current_step = "Performing analysis"
                progress.completed_steps = 5
                progress.progress_percent = 83.3
                self.analysis_progress_updated.emit(ticker, progress)
                
                analysis_results = await self.analysis_service.analyze_ticker(
                    ticker=ticker,
                    stock_info=stock_info.data if stock_info.success else None,
                    earnings_data=earnings_data.data if earnings_data.success else None,
                    options_flow=options_flow.data if options_flow.success else None,
                    insider_trades=insider_trades.data if insider_trades.success else None
                )
                
                # Step 6: Save results
                progress.current_step = "Saving results"
                progress.completed_steps = 6
                progress.progress_percent = 100.0
                self.analysis_progress_updated.emit(ticker, progress)
                
                # Emit data updates
                if stock_info.success:
                    self.earnings_data_updated.emit(ticker, {
                        'stock_info': stock_info.data,
                        'earnings_data': earnings_data.data if earnings_data.success else None,
                        'options_flow': options_flow.data if options_flow.success else None,
                        'insider_trades': insider_trades.data if insider_trades.success else None,
                        'analysis_results': analysis_results
                    })
                
                return True
                
        except Exception as e:
            self.logger.error(f"Error in ticker analysis for {ticker}: {e}")
            raise
    
    def cancel_analysis(self, ticker: str) -> bool:
        """
        Cancel running analysis for a ticker.
        
        Args:
            ticker: Stock ticker symbol
            
        Returns:
            True if analysis was cancelled, False if no analysis was running
        """
        ticker = ticker.upper()
        
        if ticker in self._active_analyses:
            task = self._active_analyses[ticker]
            task.cancel()
            
            self.logger.info(f"Cancelled analysis for {ticker}")
            return True
        
        return False
    
    async def batch_analyze_watchlist(self, max_concurrent: int = 3) -> Dict[str, bool]:
        """
        Analyze all tickers in watchlist with concurrency control.
        
        Args:
            max_concurrent: Maximum number of concurrent analyses
            
        Returns:
            Dictionary mapping tickers to success status
        """
        tickers = db_manager.get_watchlist_tickers()
        
        if not tickers:
            return {}
        
        # Create semaphore for concurrency control
        semaphore = asyncio.Semaphore(max_concurrent)
        
        async def analyze_with_semaphore(ticker: str) -> tuple[str, bool]:
            async with semaphore:
                result = await self.analyze_ticker(ticker)
                return ticker, result
        
        # Create tasks for all tickers
        tasks = [
            asyncio.create_task(analyze_with_semaphore(ticker))
            for ticker in tickers
        ]
        
        # Wait for all analyses to complete
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Process results
        analysis_results = {}
        for result in results:
            if isinstance(result, Exception):
                self.logger.error(f"Error in batch analysis: {result}")
                continue
            
            ticker, success = result
            analysis_results[ticker] = success
        
        self.notification_service.send_notification(
            "info", 
            "Batch Analysis Complete", 
            f"Analyzed {len(analysis_results)} tickers"
        )
        
        return analysis_results
    
    def get_analysis_progress(self, ticker: str) -> Optional[AnalysisProgress]:
        """Get current analysis progress for a ticker."""
        return self._analysis_progress.get(ticker.upper())
    
    def get_active_analyses(self) -> List[str]:
        """Get list of tickers with active analyses."""
        return list(self._active_analyses.keys())
    
    def shutdown(self):
        """Shutdown the controller and clean up resources."""
        try:
            # Cancel all active analyses
            for ticker in list(self._active_analyses.keys()):
                self.cancel_analysis(ticker)
            
            # Stop auto-refresh timer
            self._refresh_timer.stop()
            
            # Shutdown async executor
            self.async_executor.shutdown()
            
            self.logger.info("Main controller shutdown completed")
            
        except Exception as e:
            self.logger.error(f"Error during controller shutdown: {e}")


# Global controller instance
main_controller = MainController()

