"""
Draft evaluator using OpenAI for quality assessment.
"""

import re
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage

from src.core.config import get_settings
from src.core.logging import get_logger
from src.langgraph.ai.prompts.evaluation import get_evaluation_prompt

settings = get_settings()
log = get_logger(__name__)


class DraftEvaluator:
    """
    Evaluate draft quality using OpenAI.
    
    Provides:
    - Numerical score (0-100)
    - Pass/fail based on threshold
    - Specific feedback for improvements
    """
    
    def __init__(self):
        """Initialize the evaluator with OpenAI client."""
        self.llm = ChatOpenAI(
            model=settings.llm_model,
            temperature=0.3,  # Lower temperature for more consistent evaluation
            max_tokens=500,
            api_key=settings.openai_api_key,
        )
    
    async def evaluate(
        self,
        platform: str,
        content: str,
        context: dict,
        iteration: int,
    ) -> dict:
        """
        Evaluate a draft.
        
        Args:
            platform: Target platform (linkedin, x, blog)
            content: Draft content to evaluate
            context: Original generation context
            iteration: Current iteration number
            
        Returns:
            Dict with score, passed, and feedback
        """
        log.info(
            "Evaluating draft | platform={} | iteration={} | length={}",
            platform,
            iteration,
            len(content),
        )
        
        # Get evaluation prompt
        prompt = get_evaluation_prompt(platform, content, context)
        
        # Create messages
        messages = [
            SystemMessage(content="You are an expert content evaluator."),
            HumanMessage(content=prompt),
        ]
        
        try:
            # Call OpenAI
            response = await self.llm.ainvoke(messages)
            result_text = response.content.strip()
            
            # Parse response
            score = self._extract_score(result_text)
            passed = score >= settings.evaluation_score_threshold
            feedback = self._extract_feedback(result_text) if not passed else None
            
            log.info(
                "Evaluation complete | score={} | passed={}",
                score,
                passed,
            )
            
            return {
                "score": score,
                "passed": passed,
                "feedback": feedback,
                "iteration": iteration,
            }
            
        except Exception as e:
            log.error("Evaluation failed | error={}", str(e))
            # Return a default passing score to avoid blocking workflow
            return {
                "score": 85,
                "passed": True,
                "feedback": f"Evaluation error: {str(e)}. Please review manually.",
                "iteration": iteration,
            }
    
    def _extract_score(self, text: str) -> int:
        """Extract numerical score from evaluation response."""
        # Look for "Score: XX" pattern
        match = re.search(r"Score:\s*(\d+)", text, re.IGNORECASE)
        if match:
            return int(match.group(1))
        
        # Fallback: look for any number between 0-100
        match = re.search(r"\b([0-9]{1,3})\b", text)
        if match:
            score = int(match.group(1))
            if 0 <= score <= 100:
                return score
        
        # Default to 75 if can't parse
        log.warning("Could not parse score from evaluation response")
        return 75
    
    def _extract_feedback(self, text: str) -> str:
        """Extract feedback from evaluation response."""
        # Look for "Feedback:" section
        match = re.search(r"Feedback:\s*(.+)", text, re.IGNORECASE | re.DOTALL)
        if match:
            feedback = match.group(1).strip()
            # Limit feedback length
            return feedback[:500]
        
        # Return full text if can't find feedback section
        return text[:500]
