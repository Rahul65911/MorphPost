from typing import TypedDict, List, Optional, Literal, Any
from uuid import UUID
from datetime import datetime


# Core Enums
Platform = Literal["linkedin", "x", "blog"]
DraftSource = Literal["ai", "human"]


# Draft Snapshot (graph-facing, not DB model)
class DraftSnapshot(TypedDict):
    """
    Lightweight, immutable view of a draft used inside LangGraph.

    This is NOT the SQLAlchemy model.
    It is a projection used for reasoning only.
    """
    draft_id: UUID
    platform: Platform
    content: str
    source: DraftSource
    created_at: datetime
    based_on_id: Optional[UUID]


# Evaluation Snapshot
class EvaluationSnapshot(TypedDict):
    """
    Evaluation result used by the graph to decide routing.
    """
    score: int
    passed: bool
    feedback: Optional[str]
    iteration: int


# Resource Snapshot
class ResourceSnapshot(TypedDict):
    """
    Contextual resource passed to the graph.
    """
    type: str
    source: str
    name: Optional[str]
    mime_type: Optional[str]


# ✅ Platform Graph State (used by subgraph)
class PlatformGraphState(TypedDict):
    """
    State for SINGLE platform processing.
    
    Used by platform subgraph - runs independently for each platform.
    NO for loops needed in nodes - this handles ONE platform only.
    """
    # Identity
    workflow_id: UUID
    user_id: UUID
    platform: Platform
    
    # ✅ Support both input modes
    source_content: Optional[str]      # Manual mode
    template_input: Optional[dict]     # Template mode
    
    # Draft lifecycle (for THIS platform only)
    current_draft: Optional[DraftSnapshot]
    previous_drafts: List[DraftSnapshot]
    
    # Evaluation (for THIS platform only)
    last_evaluation: Optional[EvaluationSnapshot]
    iteration: int
    
    # Control flags (for THIS platform only)
    awaiting_human: bool
    accepted: bool
    rejected: bool
    
    # Context
    resources: List[ResourceSnapshot]
    max_iterations: int
    
    # Optional
    manual_options: Optional[dict]
    mode: Literal["manual", "template"]
    feedback_instructions: Optional[str]


# Workflow Graph State (Root)
class WorkflowGraphState(TypedDict):
    """
    Root state object for main workflow graph.
    
    Manages multiple platforms that run in parallel via Send.
    """
    # Identity
    workflow_id: UUID
    user_id: UUID

    # Creation mode
    mode: Literal["manual", "template"]

    # ✅ Support both input modes
    source_content: Optional[str]      # For manual mode
    template_input: Optional[dict]     # For template mode

    # Options
    manual_options: Optional[dict]

    # Context
    resources: List[ResourceSnapshot]

    # Per-platform states (simplified for main graph)
    platforms: List[dict]  # Contains basic platform state info

    # Global controls
    max_iterations: int
