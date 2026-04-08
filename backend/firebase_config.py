"""
firebase_config.py - Firebase initialization for CrisisNetra
"""
import os
import logging
import firebase_admin
from firebase_admin import credentials

from dotenv import load_dotenv

logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

_initialized = False


def initialize_firebase():
    global _initialized
    if _initialized:
        return
    creds_path = os.getenv("FIREBASE_CREDENTIALS_PATH", "./firebase-credentials.json")
    project_id = os.getenv("GOOGLE_CLOUD_PROJECT", "rescuenet-ai")
    try:
        if os.path.exists(creds_path):
            cred = credentials.Certificate(creds_path)
            firebase_admin.initialize_app(cred, {"projectId": project_id})
            logger.info(f"Firebase initialized with credentials from {creds_path}")
        else:
            firebase_admin.initialize_app(options={"projectId": project_id})
            logger.info("Firebase initialized with application default credentials")
        _initialized = True
    except Exception as e:
        logger.error(f"Firebase initialization failed: {e}")
        raise
