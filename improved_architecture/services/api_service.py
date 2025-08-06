"""
Improved API service for Unusual Whales API integration.

This module provides a robust, asynchronous API client with proper error handling,
rate limiting, caching, and retry logic.
"""

import asyncio
import aiohttp
import logging
import time
from typing import Dict, Any, Optional, List, Union
from dataclasses import dataclass
from enum import Enum
from datetime import datetime, timedelta
import json
from urllib.parse import urljoin

from ..config import config
from ..utils.cache import CacheManager
from ..utils.rate_limiter import RateLimiter
from ..exceptions import APIError, RateLimitError, AuthenticationError


class APIErrorType(Enum):
    """Types of API errors."""
    NETWORK_ERROR = "network_error"
    AUTHENTICATION_ERROR = "authentication_error"
    RATE_LIMIT_ERROR = "rate_limit_error"
    DATA_ERROR = "data_error"
    TIMEOUT_ERROR = "timeout_error"
    UNKNOWN_ERROR = "unknown_error"


@dataclass
class APIResponse:
    """Structured API response."""
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    error_type: Optional[APIErrorType] = None
    status_code: Optional[int] = None
    cached: bool = False
    request_id: Optional[str] = None


class UnusualWhalesAPIService:
    """
    Asynchronous API service for Unusual Whales API with comprehensive
    error handling, rate limiting, and caching.
    """
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.base_url = config.api.base_url
        self.timeout = config.api.timeout
        self.rate_limiter = RateLimiter(config.api.rate_limit_per_second)
        self.cache_manager = CacheManager()
        self._session: Optional[aiohttp.ClientSession] = None
        self._request_counter = 0
    
    async def __aenter__(self):
        """Async context manager entry."""
        await self._ensure_session()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.close()
    
    async def _ensure_session(self):
        """Ensure aiohttp session is created."""
        if self._session is None or self._session.closed:
            timeout = aiohttp.ClientTimeout(total=self.timeout)
            connector = aiohttp.TCPConnector(limit=100, limit_per_host=30)
            
            self._session = aiohttp.ClientSession(
                timeout=timeout,
                connector=connector,
                headers=self._get_default_headers()
            )
    
    def _get_default_headers(self) -> Dict[str, str]:
        """Get default headers for API requests."""
        headers = {
            'Accept': 'application/json',
            'User-Agent': 'EarningsAnalysis/1.0'
        }
        
        api_token = config.get_api_token()
        if api_token:
            headers['Authorization'] = f'Bearer {api_token}'
        
        return headers
    
    async def close(self):
        """Close the aiohttp session."""
        if self._session and not self._session.closed:
            await self._session.close()
    
    async def _make_request(
        self,
        method: str,
        endpoint: str,
        params: Optional[Dict[str, Any]] = None,
        data: Optional[Dict[str, Any]] = None,
        cache_ttl: Optional[int] = None,
        bypass_cache: bool = False
    ) -> APIResponse:
        """
        Make an API request with comprehensive error handling and caching.
        
        Args:
            method: HTTP method (GET, POST, etc.)
            endpoint: API endpoint path
            params: Query parameters
            data: Request body data
            cache_ttl: Cache time-to-live in seconds
            bypass_cache: Whether to bypass cache for this request
            
        Returns:
            APIResponse object with structured response data
        """
        self._request_counter += 1
        request_id = f"req_{self._request_counter}_{int(time.time())}"
        
        # Check cache first (for GET requests)
        if method.upper() == 'GET' and not bypass_cache:
            cache_key = self._generate_cache_key(endpoint, params)
            cached_response = await self.cache_manager.get(cache_key)
            if cached_response:
                self.logger.debug(f"Cache hit for {endpoint}")
                return APIResponse(
                    success=True,
                    data=cached_response,
                    cached=True,
                    request_id=request_id
                )
        
        # Rate limiting
        await self.rate_limiter.acquire()
        
        # Ensure session is available
        await self._ensure_session()
        
        url = urljoin(self.base_url, endpoint.lstrip('/'))
        
        try:
            self.logger.debug(f"Making {method} request to {url} (ID: {request_id})")
            
            async with self._session.request(
                method=method,
                url=url,
                params=params,
                json=data
            ) as response:
                
                response_data = await self._process_response(response, request_id)
                
                # Cache successful GET responses
                if (method.upper() == 'GET' and 
                    response_data.success and 
                    response_data.data and
                    not bypass_cache):
                    
                    cache_key = self._generate_cache_key(endpoint, params)
                    ttl = cache_ttl or config.cache.default_ttl
                    await self.cache_manager.set(cache_key, response_data.data, ttl)
                
                return response_data
                
        except asyncio.TimeoutError:
            self.logger.error(f"Request timeout for {url} (ID: {request_id})")
            return APIResponse(
                success=False,
                error="Request timeout",
                error_type=APIErrorType.TIMEOUT_ERROR,
                request_id=request_id
            )
            
        except aiohttp.ClientError as e:
            self.logger.error(f"Network error for {url}: {e} (ID: {request_id})")
            return APIResponse(
                success=False,
                error=f"Network error: {str(e)}",
                error_type=APIErrorType.NETWORK_ERROR,
                request_id=request_id
            )
            
        except Exception as e:
            self.logger.error(f"Unexpected error for {url}: {e} (ID: {request_id})")
            return APIResponse(
                success=False,
                error=f"Unexpected error: {str(e)}",
                error_type=APIErrorType.UNKNOWN_ERROR,
                request_id=request_id
            )
    
    async def _process_response(
        self, 
        response: aiohttp.ClientResponse, 
        request_id: str
    ) -> APIResponse:
        """Process HTTP response and return structured data."""
        
        if response.status == 200:
            try:
                data = await response.json()
                return APIResponse(
                    success=True,
                    data=data,
                    status_code=response.status,
                    request_id=request_id
                )
            except json.JSONDecodeError as e:
                self.logger.error(f"Invalid JSON response (ID: {request_id}): {e}")
                return APIResponse(
                    success=False,
                    error="Invalid JSON response",
                    error_type=APIErrorType.DATA_ERROR,
                    status_code=response.status,
                    request_id=request_id
                )
        
        elif response.status == 401:
            self.logger.error(f"Authentication failed (ID: {request_id})")
            return APIResponse(
                success=False,
                error="Authentication failed - check API token",
                error_type=APIErrorType.AUTHENTICATION_ERROR,
                status_code=response.status,
                request_id=request_id
            )
        
        elif response.status == 429:
            self.logger.warning(f"Rate limit exceeded (ID: {request_id})")
            return APIResponse(
                success=False,
                error="Rate limit exceeded",
                error_type=APIErrorType.RATE_LIMIT_ERROR,
                status_code=response.status,
                request_id=request_id
            )
        
        else:
            error_text = await response.text()
            self.logger.error(f"API error {response.status} (ID: {request_id}): {error_text}")
            return APIResponse(
                success=False,
                error=f"API error {response.status}: {error_text}",
                error_type=APIErrorType.DATA_ERROR,
                status_code=response.status,
                request_id=request_id
            )
    
    def _generate_cache_key(self, endpoint: str, params: Optional[Dict[str, Any]]) -> str:
        """Generate cache key for request."""
        key_parts = [endpoint]
        if params:
            # Sort params for consistent cache keys
            sorted_params = sorted(params.items())
            key_parts.extend([f"{k}={v}" for k, v in sorted_params])
        return "|".join(key_parts)
    
    async def get_stock_info(self, ticker: str) -> APIResponse:
        """Get stock information for a ticker."""
        return await self._make_request('GET', f'/api/stock/{ticker}/info')
    
    async def get_earnings_calendar(
        self, 
        date: Optional[str] = None,
        limit: int = 50
    ) -> APIResponse:
        """Get earnings calendar data."""
        params = {'limit': limit}
        if date:
            params['date'] = date
        
        return await self._make_request('GET', '/api/earnings/calendar', params=params)
    
    async def get_options_flow(
        self, 
        ticker: str,
        date: Optional[str] = None,
        limit: int = 100
    ) -> APIResponse:
        """Get options flow data for a ticker."""
        params = {'limit': limit}
        if date:
            params['date'] = date
        
        return await self._make_request('GET', f'/api/stock/{ticker}/options-flow', params=params)
    
    async def get_net_premium_ticks(
        self, 
        ticker: str,
        date: Optional[str] = None
    ) -> APIResponse:
        """Get net premium ticks for a ticker."""
        params = {}
        if date:
            params['date'] = date
        
        return await self._make_request('GET', f'/api/stock/{ticker}/net-prem-ticks', params=params)
    
    async def get_insider_trades(
        self, 
        ticker: str,
        limit: int = 50
    ) -> APIResponse:
        """Get insider trading data for a ticker."""
        params = {'ticker_symbol': ticker, 'limit': limit}
        return await self._make_request('GET', '/api/insider/transactions', params=params)
    
    async def get_market_overview(self) -> APIResponse:
        """Get comprehensive market overview data."""
        return await self._make_request('GET', '/api/market/overview')
    
    async def get_sector_performance(self, sector: str) -> APIResponse:
        """Get sector performance data."""
        return await self._make_request('GET', f'/api/market/{sector}/sector-tide')
    
    async def get_multiple_stock_data(self, tickers: List[str]) -> Dict[str, APIResponse]:
        """
        Get stock data for multiple tickers concurrently.
        
        Args:
            tickers: List of ticker symbols
            
        Returns:
            Dictionary mapping tickers to their API responses
        """
        tasks = []
        for ticker in tickers:
            task = asyncio.create_task(
                self.get_stock_info(ticker),
                name=f"stock_info_{ticker}"
            )
            tasks.append((ticker, task))
        
        results = {}
        for ticker, task in tasks:
            try:
                response = await task
                results[ticker] = response
            except Exception as e:
                self.logger.error(f"Error fetching data for {ticker}: {e}")
                results[ticker] = APIResponse(
                    success=False,
                    error=str(e),
                    error_type=APIErrorType.UNKNOWN_ERROR
                )
        
        return results
    
    async def batch_earnings_analysis(
        self, 
        tickers: List[str],
        include_options: bool = True,
        include_insider: bool = True
    ) -> Dict[str, Dict[str, APIResponse]]:
        """
        Perform batch earnings analysis for multiple tickers.
        
        Args:
            tickers: List of ticker symbols
            include_options: Whether to include options data
            include_insider: Whether to include insider trading data
            
        Returns:
            Dictionary mapping tickers to their analysis data
        """
        results = {}
        
        # Create tasks for all data requests
        tasks = []
        
        for ticker in tickers:
            ticker_tasks = {
                'stock_info': asyncio.create_task(
                    self.get_stock_info(ticker),
                    name=f"stock_info_{ticker}"
                )
            }
            
            if include_options:
                ticker_tasks['options_flow'] = asyncio.create_task(
                    self.get_options_flow(ticker),
                    name=f"options_flow_{ticker}"
                )
                ticker_tasks['net_premium'] = asyncio.create_task(
                    self.get_net_premium_ticks(ticker),
                    name=f"net_premium_{ticker}"
                )
            
            if include_insider:
                ticker_tasks['insider_trades'] = asyncio.create_task(
                    self.get_insider_trades(ticker),
                    name=f"insider_trades_{ticker}"
                )
            
            tasks.append((ticker, ticker_tasks))
        
        # Execute all tasks and collect results
        for ticker, ticker_tasks in tasks:
            ticker_results = {}
            
            for data_type, task in ticker_tasks.items():
                try:
                    response = await task
                    ticker_results[data_type] = response
                except Exception as e:
                    self.logger.error(f"Error fetching {data_type} for {ticker}: {e}")
                    ticker_results[data_type] = APIResponse(
                        success=False,
                        error=str(e),
                        error_type=APIErrorType.UNKNOWN_ERROR
                    )
            
            results[ticker] = ticker_results
        
        return results


# Singleton instance
api_service = UnusualWhalesAPIService()

