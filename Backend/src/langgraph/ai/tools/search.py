"""
Tavily search tool for web research during content generation.
"""

from langchain_community.tools.tavily_search import TavilySearchResults
from src.core.config import get_settings
from src.core.logging import get_logger

settings = get_settings()
log = get_logger(__name__)


def get_search_tool() -> TavilySearchResults:
    """
    Get configured Tavily search tool.
    
    Returns:
        TavilySearchResults tool instance
    """
    return TavilySearchResults(
        api_key=settings.tavily_api_key,
        max_results=5,
        search_depth="advanced",
        include_answer=True,
        include_raw_content=False,
    )


async def search_web(query: str) -> str:
    """
    Search the web for information.
    
    Args:
        query: Search query
        
    Returns:
        Formatted search results
    """
    log.info("Searching web | query={}", query)
    
    try:
        tool = get_search_tool()
        results = await tool.ainvoke({"query": query})
        
        # Format results
        if isinstance(results, list):
            formatted = "\n\n".join([
                f"**{r.get('title', 'Result')}**\n{r.get('content', '')}"
                for r in results[:3]  # Top 3 results
            ])
        else:
            formatted = str(results)
        
        log.info("Search complete | results={}", len(results) if isinstance(results, list) else 1)
        return formatted
        
    except Exception as e:
        log.error("Search failed | error={}", str(e))
        return f"Search unavailable: {str(e)}"
