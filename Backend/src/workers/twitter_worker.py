import dramatiq
import tweepy
from src.core.config import get_settings
from src.core.memory import get_memory_client
from src.workers.dramatiq_config import redis_broker
from src.core.logging import get_logger

log = get_logger(__name__)
settings = get_settings()

@dramatiq.actor(broker=redis_broker)
def fetch_tweets_task(access_token: str, user_id: str):
    """
    Fetch recent tweets for a connected user and store them in memory.
    """
    log.info(f"Starting tweet fetch for user_id={user_id}")
    try:
        client = tweepy.Client(access_token)
        # Fetch up to 20 recent tweets (excluding replies/retweets if possible, but basic timeline is fine)
        # We really want user's tweets.
        me = client.get_me()
        my_id = me.data.id
        
        response = client.get_users_tweets(
            id=my_id,
            max_results=20,
            tweet_fields=["created_at", "text"],
            exclude=["retweets", "replies"]
        )
        
        if not response.data:
            log.info(f"No tweets found for user_id={user_id}")
            return

        memory = get_memory_client()
        count = 0
        for tweet in response.data:
            memory.add(
                tweet.text, 
                user_id=user_id, 
                metadata={
                    "source": "twitter", 
                    "type": "social_post", 
                    "platform": "twitter",
                    "created_at": str(tweet.created_at)
                }
            )
            count += 1
            
        log.info(f"Successfully fetched and stored {count} tweets for user_id={user_id}")

    except Exception as e:
        log.exception(f"Failed to fetch tweets for user_id={user_id}: {e}")
