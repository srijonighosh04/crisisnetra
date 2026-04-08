"""
dispatch_engine.py - Task dispatch logic for CrisisNetra
"""
import logging

logger = logging.getLogger(__name__)


class DispatchEngine:
    async def dispatch_task(self, task: dict, volunteers: list) -> dict:
        if not volunteers:
            return {"success": False, "error": "No volunteers available"}
        assigned = volunteers[0]
        logger.info(f"Dispatching task to {assigned.get('name', 'unknown')}")
        return {"success": True, "assigned_to": assigned, "task": task}
