"""
Build generation context from user input.

Handles both manual and template modes.
"""

from typing import Optional


def build_generation_context(
    source_content: Optional[str],
    template_input: Optional[dict],
    resources: list,
    manual_options: Optional[dict],
) -> dict:
    """
    Build generation context based on mode.
    
    Args:
        source_content: User's manual input (manual mode)
        template_input: Structured template data (template mode)
        resources: Contextual resources
        manual_options: Manual mode options
    
    Returns:
        Unified context dict for AI generation
    """
    context = {
        "resources": resources,
    }
    
    # Manual mode
    if source_content:
        context["mode"] = "manual"
        context["input_content"] = source_content
        context["options"] = manual_options or {}
    
    # Template mode
    elif template_input:
        context["mode"] = "template"
        context["goal"] = template_input.get("goal")
        context["audience"] = template_input.get("audience")
        context["key_message"] = template_input.get("key_message")
        context["tone"] = template_input.get("tone")
        context["call_to_action"] = template_input.get("call_to_action")
        context["keywords"] = template_input.get("keywords", [])
        context["constraints"] = template_input.get("constraints")
    
    else:
        raise ValueError("Either source_content or template_input must be provided")
    
    return context
