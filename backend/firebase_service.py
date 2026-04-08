"""
firebase_service.py - Firestore database operations for CrisisNetra
"""
import logging
from firebase_admin import firestore

logger = logging.getLogger(__name__)


class FirebaseService:
    def __init__(self):
        self.db = firestore.client()

    async def get_stats(self) -> dict:
        try:
            volunteers = len(list(self.db.collection("volunteers").stream()))
            tasks = len(list(self.db.collection("tasks").stream()))
            incidents = len(list(self.db.collection("incidents").stream()))
            return {"volunteers": volunteers, "tasks": tasks, "incidents": incidents}
        except Exception as e:
            logger.error(f"get_stats failed: {e}")
            return {"volunteers": 0, "tasks": 0, "incidents": 0}

    async def get_volunteers(self) -> list:
        try:
            return [v.to_dict() for v in self.db.collection("volunteers").stream()]
        except Exception as e:
            logger.error(f"get_volunteers failed: {e}")
            return []

    async def get_tasks(self, status: str = "open") -> list:
        try:
            query = self.db.collection("tasks").where("status", "==", status)
            return [t.to_dict() for t in query.stream()]
        except Exception as e:
            logger.error(f"get_tasks failed: {e}")
            return []

    async def add_volunteer(self, volunteer_data: dict) -> dict:
        try:
            from datetime import datetime
            volunteer_data["created_at"] = datetime.utcnow().isoformat()
            doc_ref = self.db.collection("volunteers").document()
            volunteer_data["id"] = doc_ref.id
            doc_ref.set(volunteer_data)
            return volunteer_data
        except Exception as e:
            logger.error(f"add_volunteer failed: {e}")
            raise

    async def delete_volunteer(self, volunteer_id: str) -> bool:
        try:
            # We need to find the document where the 'id' field matches volunteer_id
            # or if the document ID itself is the volunteer_id
            # Based on add_volunteer, doc_ref.id is used as both doc ID and field ID
            self.db.collection("volunteers").document(volunteer_id).delete()
            return True
        except Exception as e:
            logger.error(f"delete_volunteer failed: {e}")
            return False
