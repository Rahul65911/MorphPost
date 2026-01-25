"""
Platform publisher integration for actual publishing to X/Twitter and LinkedIn.
"""

from typing import Optional
from src.langgraph.ai.tools.publishers.x_publisher import XPublisher
from src.langgraph.ai.tools.publishers.linkedin_publisher import LinkedInPublisher
from src.core.logging import get_logger

log = get_logger(__name__)


async def publish_to_platform(
    platform: str,
    content: str,
    access_token: Optional[str] = None,
    person_urn: Optional[str] = None,
) -> dict:
    """
    Publish content to a specific platform.
    
    Args:
        platform: Platform name (x, linkedin, blog)
        content: Content to publish
        access_token: OAuth access token (required for LinkedIn)
        person_urn: LinkedIn person URN (required for LinkedIn)
        
    Returns:
        Dict with platform-specific response (post_id, url, etc.)
        
    Raises:
        ValueError: If platform is unsupported or required params missing
        RuntimeError: If publishing fails
    """
    log.info("Publishing to platform | platform={} | content_length={}", platform, len(content))
    
    try:
        if platform == "x":
            publisher = XPublisher()
            result = await publisher.publish(content)
            log.info("Published to X/Twitter | tweet_id={}", result["tweet_id"])
            return result
            
        elif platform == "linkedin":
            if not access_token or not person_urn:
                raise ValueError("LinkedIn publishing requires access_token and person_urn")
            
            publisher = LinkedInPublisher()
            result = await publisher.publish(content, access_token, person_urn)
            log.info("Published to LinkedIn | post_id={}", result["post_id"])
            return result
            
        # elif platform == "blog":
        #    # Blog support removed
        #    pass
            
        else:
            raise ValueError(f"Unsupported platform: {platform}")
            
    except Exception as e:
        log.error("Publishing failed | platform={} | error={}", platform, str(e))
        raise
