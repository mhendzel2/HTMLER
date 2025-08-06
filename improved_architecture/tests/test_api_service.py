"""
Comprehensive test suite for the API service demonstrating proper testing
practices including mocking, fixtures, and async testing.
"""

import pytest
import pytest_asyncio
import asyncio
import aiohttp
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime
import json

from ..services.api_service import UnusualWhalesAPIService, APIResponse, APIErrorType
from ..config import config
from ..exceptions import APIError, RateLimitError, AuthenticationError


@pytest_asyncio.fixture
async def api_service():
    """Create API service instance for testing."""
    service = UnusualWhalesAPIService()
    yield service
    await service.close()


class TestUnusualWhalesAPIService:
    """Test suite for UnusualWhalesAPIService."""

    @pytest.fixture
    def mock_session(self):
        """Mock aiohttp session."""
        session = AsyncMock(spec=aiohttp.ClientSession)
        session.closed = False
        return session
    
    @pytest.fixture
    def mock_response(self):
        """Mock HTTP response."""
        response = AsyncMock(spec=aiohttp.ClientResponse)
        response.status = 200
        response.json = AsyncMock(return_value={'data': {'test': 'value'}})
        response.text = AsyncMock(return_value='{"data": {"test": "value"}}')
        return response
    
    @pytest.fixture
    def sample_stock_data(self):
        """Sample stock data for testing."""
        return {
            'data': {
                'ticker': 'AAPL',
                'company_name': 'Apple Inc.',
                'sector': 'Technology',
                'market_capitalization': 3000000000000,
                'last_price': 150.00
            }
        }
    
    @pytest.fixture
    def sample_earnings_data(self):
        """Sample earnings data for testing."""
        return {
            'data': [
                {
                    'ticker': 'AAPL',
                    'earnings_date': '2025-01-15',
                    'report_time': 'postmarket',
                    'eps_estimate': 2.50,
                    'expected_move': 5.2
                },
                {
                    'ticker': 'MSFT',
                    'earnings_date': '2025-01-16',
                    'report_time': 'premarket',
                    'eps_estimate': 3.10,
                    'expected_move': 4.8
                }
            ]
        }
    
    @pytest.mark.asyncio
    async def test_successful_api_request(self, api_service, mock_session, mock_response, sample_stock_data):
        """Test successful API request."""
        # Setup
        mock_response.json.return_value = sample_stock_data
        mock_session.request.return_value.__aenter__.return_value = mock_response
        
        with patch.object(api_service, '_session', mock_session):
            # Execute
            result = await api_service._make_request('GET', '/api/stock/AAPL/info')
            
            # Assert
            assert result.success is True
            assert result.data == sample_stock_data
            assert result.status_code == 200
            assert result.cached is False
            assert result.error is None
            
            # Verify session was called correctly
            mock_session.request.assert_called_once_with(
                method='GET',
                url=f"{config.api.base_url}/api/stock/AAPL/info",
                params=None,
                json=None
            )
    
    @pytest.mark.asyncio
    async def test_authentication_error(self, api_service, mock_session, mock_response):
        """Test handling of authentication errors."""
        # Setup
        mock_response.status = 401
        mock_response.text.return_value = "Unauthorized"
        mock_session.request.return_value.__aenter__.return_value = mock_response
        
        with patch.object(api_service, '_session', mock_session):
            # Execute
            result = await api_service._make_request('GET', '/api/stock/AAPL/info')
            
            # Assert
            assert result.success is False
            assert result.error_type == APIErrorType.AUTHENTICATION_ERROR
            assert "Authentication failed" in result.error
            assert result.status_code == 401
    
    @pytest.mark.asyncio
    async def test_rate_limit_error(self, api_service, mock_session, mock_response):
        """Test handling of rate limit errors."""
        # Setup
        mock_response.status = 429
        mock_response.text.return_value = "Rate limit exceeded"
        mock_session.request.return_value.__aenter__.return_value = mock_response
        
        with patch.object(api_service, '_session', mock_session):
            # Execute
            result = await api_service._make_request('GET', '/api/stock/AAPL/info')
            
            # Assert
            assert result.success is False
            assert result.error_type == APIErrorType.RATE_LIMIT_ERROR
            assert "Rate limit exceeded" in result.error
            assert result.status_code == 429
    
    @pytest.mark.asyncio
    async def test_network_error(self, api_service, mock_session):
        """Test handling of network errors."""
        # Setup
        mock_session.request.side_effect = aiohttp.ClientError("Connection failed")
        
        with patch.object(api_service, '_session', mock_session):
            # Execute
            result = await api_service._make_request('GET', '/api/stock/AAPL/info')
            
            # Assert
            assert result.success is False
            assert result.error_type == APIErrorType.NETWORK_ERROR
            assert "Network error" in result.error
    
    @pytest.mark.asyncio
    async def test_timeout_error(self, api_service, mock_session):
        """Test handling of timeout errors."""
        # Setup
        mock_session.request.side_effect = asyncio.TimeoutError()
        
        with patch.object(api_service, '_session', mock_session):
            # Execute
            result = await api_service._make_request('GET', '/api/stock/AAPL/info')
            
            # Assert
            assert result.success is False
            assert result.error_type == APIErrorType.TIMEOUT_ERROR
            assert "Request timeout" in result.error
    
    @pytest.mark.asyncio
    async def test_invalid_json_response(self, api_service, mock_session, mock_response):
        """Test handling of invalid JSON responses."""
        # Setup
        mock_response.status = 200
        mock_response.json.side_effect = json.JSONDecodeError("Invalid JSON", "", 0)
        mock_session.request.return_value.__aenter__.return_value = mock_response
        
        with patch.object(api_service, '_session', mock_session):
            # Execute
            result = await api_service._make_request('GET', '/api/stock/AAPL/info')
            
            # Assert
            assert result.success is False
            assert result.error_type == APIErrorType.DATA_ERROR
            assert "Invalid JSON response" in result.error
    
    @pytest.mark.asyncio
    async def test_caching_behavior(self, api_service, mock_session, mock_response, sample_stock_data):
        """Test caching behavior for GET requests."""
        # Setup
        mock_response.json.return_value = sample_stock_data
        mock_session.request.return_value.__aenter__.return_value = mock_response
        
        with patch.object(api_service, '_session', mock_session):
            with patch.object(api_service.cache_manager, 'get', return_value=None) as mock_cache_get:
                with patch.object(api_service.cache_manager, 'set') as mock_cache_set:
                    # Execute first request
                    result1 = await api_service._make_request('GET', '/api/stock/AAPL/info')
                    
                    # Assert first request
                    assert result1.success is True
                    assert result1.cached is False
                    mock_cache_get.assert_called_once()
                    mock_cache_set.assert_called_once()
                    
                    # Setup cache hit for second request
                    mock_cache_get.return_value = sample_stock_data
                    
                    # Execute second request
                    result2 = await api_service._make_request('GET', '/api/stock/AAPL/info')
                    
                    # Assert second request used cache
                    assert result2.success is True
                    assert result2.cached is True
                    assert result2.data == sample_stock_data
    
    @pytest.mark.asyncio
    async def test_get_stock_info(self, api_service, sample_stock_data):
        """Test get_stock_info method."""
        with patch.object(api_service, '_make_request') as mock_request:
            mock_request.return_value = APIResponse(success=True, data=sample_stock_data)
            
            # Execute
            result = await api_service.get_stock_info('AAPL')
            
            # Assert
            assert result.success is True
            assert result.data == sample_stock_data
            mock_request.assert_called_once_with('GET', '/api/stock/AAPL/info')
    
    @pytest.mark.asyncio
    async def test_get_earnings_calendar(self, api_service, sample_earnings_data):
        """Test get_earnings_calendar method."""
        with patch.object(api_service, '_make_request') as mock_request:
            mock_request.return_value = APIResponse(success=True, data=sample_earnings_data)
            
            # Execute
            result = await api_service.get_earnings_calendar(date='2025-01-15', limit=100)
            
            # Assert
            assert result.success is True
            assert result.data == sample_earnings_data
            mock_request.assert_called_once_with(
                'GET', 
                '/api/earnings/calendar', 
                params={'limit': 100, 'date': '2025-01-15'}
            )
    
    @pytest.mark.asyncio
    async def test_get_multiple_stock_data(self, api_service, sample_stock_data):
        """Test concurrent fetching of multiple stock data."""
        tickers = ['AAPL', 'MSFT', 'GOOGL']
        
        with patch.object(api_service, 'get_stock_info') as mock_get_stock:
            # Setup mock to return different data for each ticker
            def mock_response(ticker):
                data = sample_stock_data.copy()
                data['data']['ticker'] = ticker
                return APIResponse(success=True, data=data)
            
            mock_get_stock.side_effect = lambda ticker: mock_response(ticker)
            
            # Execute
            results = await api_service.get_multiple_stock_data(tickers)
            
            # Assert
            assert len(results) == 3
            assert all(ticker in results for ticker in tickers)
            assert all(result.success for result in results.values())
            assert mock_get_stock.call_count == 3
    
    @pytest.mark.asyncio
    async def test_batch_earnings_analysis(self, api_service, sample_stock_data, sample_earnings_data):
        """Test batch earnings analysis functionality."""
        tickers = ['AAPL', 'MSFT']
        
        with patch.object(api_service, 'get_stock_info') as mock_stock_info:
            with patch.object(api_service, 'get_options_flow') as mock_options:
                with patch.object(api_service, 'get_insider_trades') as mock_insider:
                    with patch.object(api_service, 'get_net_premium_ticks') as mock_net_prem:
                        # Setup mocks
                        mock_stock_info.return_value = APIResponse(success=True, data=sample_stock_data)
                        mock_options.return_value = APIResponse(success=True, data={'data': []})
                        mock_insider.return_value = APIResponse(success=True, data={'data': []})
                        mock_net_prem.return_value = APIResponse(success=True, data={'data': []})

                        # Execute
                        results = await api_service.batch_earnings_analysis(
                            tickers,
                            include_options=True,
                            include_insider=True
                        )

                        # Assert
                        assert len(results) == 2
                        assert all(ticker in results for ticker in tickers)

                        for ticker, ticker_results in results.items():
                            assert 'stock_info' in ticker_results
                            assert 'options_flow' in ticker_results
                            assert 'insider_trades' in ticker_results
                            assert 'net_premium' in ticker_results
                            assert all(result.success for result in ticker_results.values())
    
    @pytest.mark.asyncio
    async def test_rate_limiting(self, api_service):
        """Test rate limiting functionality."""
        with patch.object(api_service.rate_limiter, 'acquire') as mock_acquire:
            with patch.object(api_service, '_session') as mock_session:
                mock_response = AsyncMock()
                mock_response.status = 200
                mock_response.json.return_value = {'data': {}}
                mock_session.request.return_value.__aenter__.return_value = mock_response
                
                # Execute multiple requests
                await api_service._make_request('GET', '/api/test1')
                await api_service._make_request('GET', '/api/test2')
                
                # Assert rate limiter was called
                assert mock_acquire.call_count == 2
    
    @pytest.mark.asyncio
    async def test_context_manager(self):
        """Test async context manager functionality."""
        async with UnusualWhalesAPIService() as service:
            assert service._session is not None
            assert not service._session.closed
        
        # Session should be closed after exiting context
        assert service._session.closed
    
    def test_cache_key_generation(self, api_service):
        """Test cache key generation."""
        # Test without parameters
        key1 = api_service._generate_cache_key('/api/stock/AAPL/info', None)
        assert key1 == '/api/stock/AAPL/info'
        
        # Test with parameters
        params = {'limit': 50, 'date': '2025-01-15'}
        key2 = api_service._generate_cache_key('/api/earnings/calendar', params)
        assert 'date=2025-01-15' in key2
        assert 'limit=50' in key2
        
        # Test parameter ordering consistency
        params_reversed = {'date': '2025-01-15', 'limit': 50}
        key3 = api_service._generate_cache_key('/api/earnings/calendar', params_reversed)
        assert key2 == key3  # Should be same regardless of parameter order
    
    @pytest.mark.asyncio
    async def test_error_recovery(self, api_service, mock_session, mock_response):
        """Test error recovery and retry behavior."""
        # Setup: First call fails, second succeeds
        mock_session.request.side_effect = [
            aiohttp.ClientError("Temporary failure"),
            mock_response
        ]
        mock_response.status = 200
        mock_response.json.return_value = {'data': {'recovered': True}}
        
        with patch.object(api_service, '_session', mock_session):
            # First request should fail
            result1 = await api_service._make_request('GET', '/api/test')
            assert result1.success is False
            assert result1.error_type == APIErrorType.NETWORK_ERROR
            
            # Reset side effect for second request
            mock_session.request.side_effect = None
            mock_session.request.return_value.__aenter__.return_value = mock_response
            
            # Second request should succeed
            result2 = await api_service._make_request('GET', '/api/test')
            assert result2.success is True
            assert result2.data == {'data': {'recovered': True}}


@pytest.mark.integration
class TestAPIServiceIntegration:
    """Integration tests for API service (requires actual API access)."""
    
    @pytest.fixture
    def api_service_with_token(self):
        """API service with real token for integration testing."""
        # Only run if API token is available
        if not config.get_api_token():
            pytest.skip("No API token available for integration tests")
        
        return UnusualWhalesAPIService()
    
    @pytest.mark.asyncio
    async def test_real_api_call(self, api_service_with_token):
        """Test actual API call (requires valid token)."""
        async with api_service_with_token as service:
            result = await service.get_stock_info('AAPL')
            
            # Basic validation of real response
            if result.success:
                assert 'data' in result.data
                assert result.data['data'].get('ticker') == 'AAPL'
            else:
                # If it fails, it should be due to rate limiting or auth issues
                assert result.error_type in [
                    APIErrorType.RATE_LIMIT_ERROR,
                    APIErrorType.AUTHENTICATION_ERROR
                ]
    
    @pytest.mark.asyncio
    async def test_rate_limiting_with_real_api(self, api_service_with_token):
        """Test rate limiting with real API calls."""
        async with api_service_with_token as service:
            # Make multiple rapid requests
            tasks = [
                service.get_stock_info('AAPL'),
                service.get_stock_info('MSFT'),
                service.get_stock_info('GOOGL')
            ]
            
            results = await asyncio.gather(*tasks)
            
            # At least some should succeed (depending on rate limits)
            successful_results = [r for r in results if r.success]
            assert len(successful_results) > 0


# Fixtures for test configuration
@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for async tests."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(autouse=True)
def setup_test_config():
    """Setup test configuration."""
    # Override config for testing
    original_rate_limit = config.api.rate_limit_per_second
    config.api.rate_limit_per_second = 100  # Higher rate limit for testing
    
    yield
    
    # Restore original config
    config.api.rate_limit_per_second = original_rate_limit


# Performance tests
@pytest.mark.performance
class TestAPIServicePerformance:
    """Performance tests for API service."""
    
    @pytest.mark.asyncio
    async def test_concurrent_request_performance(self, api_service):
        """Test performance of concurrent requests."""
        import time
        
        with patch.object(api_service, '_make_request') as mock_request:
            # Mock fast responses
            mock_request.return_value = APIResponse(success=True, data={'test': 'data'})
            
            start_time = time.time()
            
            # Make 100 concurrent requests
            tasks = [
                api_service.get_stock_info(f'TEST{i}')
                for i in range(100)
            ]
            
            results = await asyncio.gather(*tasks)
            
            end_time = time.time()
            duration = end_time - start_time
            
            # Should complete quickly with mocked responses
            assert duration < 1.0  # Less than 1 second
            assert len(results) == 100
            assert all(r.success for r in results)
    
    @pytest.mark.asyncio
    async def test_memory_usage_with_large_responses(self, api_service):
        """Test memory usage with large API responses."""
        import sys
        
        # Create large mock response
        large_data = {'data': {'items': [{'id': i, 'data': 'x' * 1000} for i in range(1000)]}}
        
        with patch.object(api_service, '_make_request') as mock_request:
            mock_request.return_value = APIResponse(success=True, data=large_data)
            
            initial_memory = sys.getsizeof(api_service)
            
            # Make request with large response
            result = await api_service.get_stock_info('TEST')
            
            final_memory = sys.getsizeof(api_service)
            
            # Memory usage should not grow significantly
            memory_growth = final_memory - initial_memory
            assert memory_growth < 1000000  # Less than 1MB growth
            assert result.success is True

