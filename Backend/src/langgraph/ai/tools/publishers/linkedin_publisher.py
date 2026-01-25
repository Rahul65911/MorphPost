"""
LinkedIn publisher using REST API.
"""

import httpx
from src.core.config import get_settings
from src.core.logging import get_logger

settings = get_settings()
log = get_logger(__name__)


class LinkedInPublisher:
    """
    Publish content to LinkedIn using UGC Posts API.
    
    Requires OAuth 2.0 access token with w_member_social scope.
    """
    
    async def publish(self, content: str, access_token: str, person_urn: str) -> dict:
        """
        Publish a post to LinkedIn.
        
        Args:
            content: Post text (max 3000 characters)
            access_token: OAuth 2.0 access token
            person_urn: LinkedIn person URN (e.g., "urn:li:person:ABC123")
            
        Returns:
            Dict with post_id and url
            
        Raises:
            ValueError: If content exceeds 3000 characters
            RuntimeError: If publishing fails
        """
        # Validate length
        if len(content) > 3000:
            raise ValueError(f"Post too long: {len(content)} characters (max 3000)")
        
        log.info("Publishing to LinkedIn | length={}", len(content))
        
        # LinkedIn UGC Posts API endpoint
        url = "https://api.linkedin.com/v2/ugcPosts"
        
        # Construct payload
        payload = {
            "author": person_urn,
            "lifecycleState": "PUBLISHED",
            "specificContent": {
                "com.linkedin.ugc.ShareContent": {
                    "shareCommentary": {
                        "text": content
                    },
                    "shareMediaCategory": "NONE"
                }
            },
            "visibility": {
                "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
            }
        }
        
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
            "X-Restli-Protocol-Version": "2.0.0",
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    url,
                    json=payload,
                    headers=headers,
                    timeout=30.0,
                )
                
                response.raise_for_status()
                result = response.json()
                
                # Extract post ID from response
                post_id = result.get("id", "unknown")
                
                log.info("Published to LinkedIn | post_id={}", post_id)
                
                return {
                    "post_id": post_id,
                    "url": f"https://www.linkedin.com/feed/update/{post_id}",
                    "platform": "linkedin",
                }
                
        except httpx.HTTPStatusError as e:
            log.error("LinkedIn publishing failed | status={} | error={}", e.response.status_code, str(e))
            raise RuntimeError(f"LinkedIn API error: {e.response.status_code} - {e.response.text}")
        except Exception as e:
            log.error("LinkedIn publishing failed | error={}", str(e))
            raise RuntimeError(f"Failed to publish to LinkedIn: {str(e)}")
