import os
from mem0 import Memory
from src.core.config import get_settings

settings = get_settings()

class MemoryService:
    _instance = None

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            mem0_config = {
                "llm": {
                    "provider": "openai",
                    "config": {
                        "api_key": settings.openai_api_key,
                        "model": settings.llm_model,
                    }
                },
                "embedder": {
                    "provider": "openai",
                    "config": {
                        "api_key": settings.openai_api_key,
                    }
                }
            }
            
            # Note: We omit "vector_store" config to let Mem0 use its default local storage (e.g., ~/.mem0).
            # If we force "qdrant" with localhost:6333, it will hang if no server is running.
            
            # If Qdrant host/port are not explicitly clean in settings, we might want to default to local or just omit vector_store to let Mem0 decide (local/chroma).
            # But the error was specifically about API KEY.
            
            # Minimal config to fix the error and path issue:
            import os
            
            # Ensure we use a valid writable path on Windows (User Home)
            user_mem0_path = os.path.join(os.path.expanduser("~"), ".mem0", "storage")
            
            # Ensure the directory exists
            os.makedirs(user_mem0_path, exist_ok=True)
            
            simple_config = {
                 "llm": {
                    "provider": "openai",
                    "config": {
                        "api_key": settings.openai_api_key,
                    }
                },
                "embedder": {
                    "provider": "openai",
                    "config": {
                        "api_key": settings.openai_api_key,
                    }
                },
                "vector_store": {
                    "provider": "qdrant",
                    "config": {
                        "path": user_mem0_path,
                    }
                }
            }

            cls._instance = Memory.from_config(simple_config)
        return cls._instance

def get_memory_client():
    return MemoryService.get_instance()
