from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage

from src.core.config import get_settings
from src.core.logging import get_logger

settings = get_settings()
log = get_logger(__name__)

TITLE_PROMPT = """
You are an expert copywriter. Your task is to generate a concise, engaging, and descriptive title for a content review workflow.

User Input (Topic/Goal):
{input}

Constraints:
- Maximum 5-7 words.
- catchy but professional.
- deeply related to the input.
- Do NOT use "Review" in the title.
- Return ONLY the title string, no quotes.

Title:
"""

async def generate_title(user_input: str) -> str:
    """
    Generate a concise title for the workflow based on user input.
    """
    if not user_input or len(user_input.strip()) == 0:
        return "Untitled Workflow"

    try:
        llm = ChatOpenAI(
            model=settings.llm_model,
            temperature=0.7,
            api_key=settings.openai_api_key,
        )

        prompt = TITLE_PROMPT.format(input=user_input)

        messages = [
            SystemMessage(content="You are a helpful assistant."),
            HumanMessage(content=prompt),
        ]

        response = await llm.ainvoke(messages)
        title = response.content.strip().replace('"', '')
        
        return title

    except Exception as e:
        log.error(f"Failed to generate title: {e}")
        # Fallback
        return f"Workflow: {user_input[:20]}..."
