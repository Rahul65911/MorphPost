"""
Content generator using OpenAI for platform-specific content creation.
"""

from typing import Optional
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage

from src.core.config import get_settings
from src.core.logging import get_logger
from src.langgraph.ai.prompts.generation import get_generation_prompt

settings = get_settings()
log = get_logger(__name__)


class DraftGenerator:
    """
    Generate platform-specific content using OpenAI.
    
    Supports:
    - Platform-specific formatting (LinkedIn, X/Twitter, Blog)
    - Manual and template modes
    - Regeneration with feedback
    """
    
    def __init__(self):
        """Initialize the generator with OpenAI client."""
        self.llm = ChatOpenAI(
            model=settings.llm_model,
            temperature=settings.llm_temperature,
            max_tokens=settings.llm_max_tokens,
            api_key=settings.openai_api_key,
        )
    
    async def generate(
        self,
        platform: str,
        context: dict,
        user_id: str,
        previous_feedback: Optional[str] = None,
        feedback_instructions: Optional[str] = None,
    ) -> str:
        """
        Generate content for a specific platform.
        
        Args:
            platform: Target platform (linkedin, x, blog)
            context: Generation context from content_builder
            user_id: ID of the user to fetch style/memory for
            previous_feedback: Feedback from previous evaluation (for regeneration)
            
        Returns:
            Generated content string
        """
        log.info(
            "Generating content | platform={} | mode={} | has_feedback={}",
            platform,
            context["mode"],
            previous_feedback is not None,
        )
        
        try:
            # 1. Fetch Style Profile & Context from Memory
            from src.core.memory import get_memory_client
            memory = get_memory_client()
            
            # A. Fetch Platform-Specific Style Profile
            # We try to get the specific one first
            style_profile_text = ""
            
            # Normalize platform for query
            target_platform = platform.lower()
            if target_platform == "x": target_platform = "twitter"
            
            # Get specific profile
            profiles_response = memory.get_all(user_id=user_id, filters={"type": "style_profile", "platform": target_platform})
            profiles = profiles_response.get("results", []) if isinstance(profiles_response, dict) else []
            if profiles and len(profiles) > 0:
                style_profile_text = profiles[0].get("memory", "")
            
            # Get General Summary (always useful)
            general_summaries_response = memory.get_all(user_id=user_id, filters={"type": "style_summary"})
            general_summaries = general_summaries_response.get("results", []) if isinstance(general_summaries_response, dict) else []
            general_summary_text = general_summaries[0].get("memory", "") if general_summaries else ""
            
            # Combine into context string
            user_style_context = f"**General Style:**\n{general_summary_text}\n\n**Platform-Specific Profile ({target_platform}):**\n{style_profile_text}"
            
            # B. Fetch Recent Posts for Context (Few-Shot)
            # We fetch up to 5 recent posts from this platform to show the LLM examples
            recent_posts_response = memory.search(
                query="recent posts", # Dummy query since we use metadata filter
                user_id=user_id, 
                filters={"type": "social_post", "platform": target_platform}, 
                limit=5
            )
            recent_posts_docs = recent_posts_response.get("results", []) if isinstance(recent_posts_response, dict) else []
            recent_posts_text = "\n---\n".join([d.get("memory", "") for d in recent_posts_docs]) if recent_posts_docs else "No recent posts found."

        except Exception as e:
            log.error(f"Failed to fetch memory/context details: {e}")
            user_style_context = "Standard professional tone (Memory fetch failed)."
            recent_posts_text = "No recent posts available (Memory fetch failed)."

        log.info(
            "Generating content | memory = {} | recent posts = {}",
            user_style_context,
            recent_posts_text
        )

        # Get platform-specific prompt with expanded context
        prompt = get_generation_prompt(
            platform, 
            context, 
            previous_feedback, 
            feedback_instructions,
            user_style=user_style_context,
            recent_posts=recent_posts_text
        )
        
        # Create messages
        messages = [
            SystemMessage(content="You are an expert content creator."),
            HumanMessage(content=prompt),
        ]
        
        try:
            # Call OpenAI
            response = await self.llm.ainvoke(messages)
            content = response.content.strip()
            
            # log.info(
            #     "Content generated | platform={} | length={}",
            #     platform,
            #     len(content),
            # )
            
            return content
            
        except Exception as e:
            log.error("Content generation failed | error={}", str(e))
            raise RuntimeError(f"Failed to generate content: {str(e)}")
