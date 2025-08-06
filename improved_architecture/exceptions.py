class APIError(Exception):
    """Base exception for API errors."""

class RateLimitError(APIError):
    """Raised when API rate limit is exceeded."""

class AuthenticationError(APIError):
    """Raised for authentication failures."""
