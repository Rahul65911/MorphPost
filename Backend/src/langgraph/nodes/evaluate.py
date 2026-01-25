"""
Evaluate draft for a SINGLE platform.

NO for loops - state is for one platform only.
"""

from langgraph.types import Command
from src.langgraph.state import PlatformGraphState, EvaluationSnapshot
from src.core.config import get_settings
from src.core.logging import get_logger

settings = get_settings()
log = get_logger(__name__)


async def evaluate_draft(state: PlatformGraphState) -> Command[str]:
    """
    Evaluate the current draft for THIS platform.
    
    Handles regeneration loop internally:
    - If score < threshold and iterations < max: regenerate (goto generate)
    - If score >= threshold: send to HITL for review
    - If max iterations reached: send to HITL anyway
    
    NO for loop - this runs on a single platform's state.
    """
    platform = state["platform"]
    current_draft = state["current_draft"]
    
    # Skip if already accepted/rejected
    if state["accepted"] or state["rejected"]:
        log.info("Platform already decided, skipping evaluation")
        return Command(update=state, goto="hitl")
    
    if not current_draft:
        log.warning("No draft to evaluate, sending to HITL")
        return Command(update=state, goto="hitl")
    
    log.info(
        "Evaluating draft | platform={} | iteration={} | draft_id={}",
        platform,
        state["iteration"],
        current_draft["draft_id"],
    )
    
    # Evaluate using OpenAI
    from src.langgraph.ai.evaluator import DraftEvaluator
    from src.langgraph.ai.content_builder import build_generation_context
    
    evaluator = DraftEvaluator()
    
    # Rebuild context for evaluation
    context = build_generation_context(
        source_content=state.get("source_content"),
        template_input=state.get("template_input"),
        resources=state["resources"],
        manual_options=state.get("manual_options"),
    )
    
    eval_result = await evaluator.evaluate(
        platform=platform,
        content=current_draft["content"],
        context=context,
        iteration=state["iteration"],
    )
    
    # Create evaluation snapshot
    evaluation: EvaluationSnapshot = {
        "score": eval_result["score"],
        "passed": eval_result["passed"],
        "feedback": eval_result["feedback"],
        "iteration": state["iteration"],
    }
    
    log.info(
        "Evaluation complete | platform={} | score={} | passed={} | iteration={}",
        platform,
        evaluation["score"],
        evaluation["passed"],
        state["iteration"],
    )
    
    # Update state with evaluation
    state["last_evaluation"] = evaluation
    state["iteration"] += 1
    
    # Decision logic: regenerate or proceed to HITL
    max_iterations = settings.langgraph_max_iterations
    
    if evaluation["passed"]:
        # Draft passed, send to HITL for human review
        log.info("Draft passed evaluation, sending to HITL | platform={}", platform)
        return Command(update=state, goto="hitl")
    
    elif state["iteration"] < max_iterations:
        # Draft failed but we can regenerate
        log.info(
            "Draft failed, regenerating | platform={} | iteration={}/{}",
            platform,
            state["iteration"],
            max_iterations,
        )
        
        # Move current draft to history (regenerate logic)
        if state["current_draft"]:
            state["previous_drafts"].append(state["current_draft"])
            state["current_draft"] = None
        
        # Route back to generate for regeneration
        return Command(update=state, goto="generate")
    
    else:
        # Max iterations reached, send to HITL anyway
        log.warning(
            "Max iterations reached, sending to HITL | platform={} | score={}",
            platform,
            evaluation["score"],
        )
        return Command(update=state, goto="hitl")
