"""
Evaluation prompts for assessing draft quality.

Evaluates drafts based on:
- Relevance to user's intent
- Quality and clarity
- Platform best practices
- Engagement potential
"""

EVALUATION_PROMPT = """You are an expert content evaluator specializing in {platform} content.

**Your Task:**
Evaluate the following draft and provide a score (0-100) with specific feedback.

**Draft to Evaluate:**
{content}

**Original Context:**
{context}

**Evaluation Criteria:**
1. **Relevance (30 points)**: Does it match the user's intent and goals?
2. **Quality (25 points)**: Grammar, clarity, professionalism
3. **Platform Fit (25 points)**: Appropriate for {platform} (format, length, style)
4. **Engagement (20 points)**: Likely to resonate with the target audience

**Platform-Specific Requirements for {platform}:**
{platform_requirements}

**Instructions:**
1. Evaluate the draft against each criterion
2. Calculate a total score (0-100)
3. Provide specific, actionable feedback if score < {evaluation_score_threshold}
4. Be constructive but honest

**Response Format:**
Score: [0-100]
Passed: [Yes/No - Yes if score >= {evaluation_score_threshold}]
Feedback: [Specific improvements needed, or "Excellent work!" if passed]

Evaluate now:"""


PLATFORM_REQUIREMENTS = {
    "linkedin": """
- Character limit: 3000
- Professional yet conversational tone
- Clear structure with line breaks
- Engaging hook in first 2 lines
- Value-driven content
- Clear call-to-action
""",
    "x": """
- Character limit: 280 (STRICT - must be under)
- Concise and impactful
- Front-loaded key message
- 2-3 relevant hashtags
- Shareable and memorable
""",
    "blog": """
- Long-form (800-2000 words)
- Clear title and structure
- SEO-optimized with keywords
- Actionable insights
- Strong introduction and conclusion
- Proper headers (H2, H3)
""",
}


def get_evaluation_prompt(platform: str, content: str, context: dict) -> str:
    """
    Get the evaluation prompt for a platform.
    
    Args:
        platform: Target platform (linkedin, x, blog)
        content: Draft content to evaluate
        context: Original generation context
        
    Returns:
        Formatted evaluation prompt
    """
    from src.core.config import get_settings
    settings = get_settings()

    # Format context section
    if context["mode"] == "manual":
        context_str = f"""
Mode: Manual Content Adaptation
Original Content: {context['input_content'][:200]}...
"""
    else:  # template mode
        context_str = f"""
Mode: Template-Based Generation
Goal: {context.get('goal', 'Not specified')}
Target Audience: {context.get('audience', 'General')}
Key Message: {context.get('key_message', 'Not specified')}
Tone: {context.get('tone', 'Professional')}
"""
    
    # Get platform requirements
    requirements = PLATFORM_REQUIREMENTS.get(platform.lower(), PLATFORM_REQUIREMENTS["linkedin"])
    
    # Format prompt
    return EVALUATION_PROMPT.format(
        platform=platform,
        content=content,
        context=context_str.strip(),
        platform_requirements=requirements.strip(),
        evaluation_score_threshold=settings.evaluation_score_threshold,
    )
