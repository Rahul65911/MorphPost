"""
X/Twitter publisher using Tweepy.
"""

import tweepy
from src.core.config import get_settings
from src.core.logging import get_logger

settings = get_settings()
log = get_logger(__name__)


class XPublisher:
    """
    Publish content to X/Twitter using Tweepy.
    
    Uses OAuth 1.0a User Context for authentication.
    """
    
    def __init__(self):
        """Initialize Tweepy client with credentials."""
        # Validate credentials are configured
        if not all([
            settings.x_api_key,
            settings.x_api_secret,
            settings.x_access_token,
            settings.x_access_token_secret,
        ]):
            raise ValueError(
                "X/Twitter credentials not configured. Please set X_API_KEY, "
                "X_API_SECRET, X_ACCESS_TOKEN, and X_ACCESS_TOKEN_SECRET in .env file. "
                "Get these from https://developer.twitter.com/en/portal/dashboard"
            )
        
        self.client = tweepy.Client(
            consumer_key=settings.x_api_key,
            consumer_secret=settings.x_api_secret,
            access_token=settings.x_access_token,
            access_token_secret=settings.x_access_token_secret,
        )
    
    async def publish(self, content: str) -> dict:
        """
        Publish a tweet to X/Twitter.
        
        Args:
            content: Tweet text (must be <= 280 characters)
            
        Returns:
            Dict with tweet_id and url
            
        Raises:
            ValueError: If content exceeds 280 characters
            RuntimeError: If publishing fails
        """
        # Validate length
        if len(content) > 280:
            raise ValueError(f"Tweet too long: {len(content)} characters (max 280)")
        
        log.info("Publishing to X/Twitter | length={}", len(content))
        
        try:
            # Create tweet
            response = self.client.create_tweet(text=content)
            tweet_id = response.data["id"]
            
            # Construct URL (assuming user handle is available)
            # Note: In production, you'd fetch the authenticated user's handle
            tweet_url = f"https://twitter.com/i/web/status/{tweet_id}"
            
            log.info("Published to X/Twitter | tweet_id={}", tweet_id)
            
            return {
                "tweet_id": tweet_id,
                "url": tweet_url,
                "platform": "x",
            }
            
        except Exception as e:
            log.error("X/Twitter publishing failed | error={}", str(e))
            raise RuntimeError(f"Failed to publish to X/Twitter: {str(e)}")
