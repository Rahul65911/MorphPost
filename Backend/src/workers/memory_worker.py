import dramatiq
from src.core.memory import get_memory_client
from src.workers.dramatiq_config import redis_broker
from src.core.logging import get_logger

log = get_logger(__name__)

@dramatiq.actor(broker=redis_broker)
def store_memory_task(content: str, user_id: str, metadata: dict):
    """
    Background task to generate embeddings and store content in Mem0.
    """
    try:
        log.info(f"Storing memory for user_id={user_id} type={metadata.get('type')}")
        memory = get_memory_client()
        memory.add(content, user_id=user_id, metadata=metadata)
        log.info(f"Successfully stored memory for user_id={user_id}")
    except Exception as e:
        log.exception(f"Failed to store memory for user_id={user_id}: {e}")
