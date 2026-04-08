#!/usr/bin/env python3
"""
validate_firebase.py
CrisisNetra - Firebase & Hospital Alert Feature Validation Script

Run this to verify all services are correctly configured:
    python validate_firebase.py
"""

import os
import sys
import asyncio

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

print("\n" + "="*60)
print("  CrisisNetra — Setup Validation")
print("="*60 + "\n")

errors = []
warnings = []
passed = []


def check(label, condition, error_msg, warn=False):
    if condition:
        print(f"  ✅  {label}")
        passed.append(label)
    else:
        marker = "⚠️ " if warn else "❌ "
        print(f"  {marker} {label}")
        print(f"       → {error_msg}")
        (warnings if warn else errors).append(label)


# ── 1. Environment Variables ──────────────────────────────────────────────────
print("1. Environment Variables")

from dotenv import load_dotenv
load_dotenv()

check("GOOGLE_CLOUD_PROJECT",
      bool(os.getenv("GOOGLE_CLOUD_PROJECT")),
      "Set GOOGLE_CLOUD_PROJECT=your-project-id in .env")

check("GOOGLE_MAPS_API_KEY",
      bool(os.getenv("GOOGLE_MAPS_API_KEY")),
      "Set GOOGLE_MAPS_API_KEY in .env (needed for hospital search & ETAs)")

check("GEMINI_API_KEY",
      bool(os.getenv("GEMINI_API_KEY")),
      "Set GEMINI_API_KEY in .env (get from https://aistudio.google.com)",
      warn=True)

creds_path = os.getenv("FIREBASE_CREDENTIALS_PATH", "./firebase-credentials.json")
check("Firebase credentials file",
      os.path.exists(creds_path),
      f"Create service account key at {creds_path}\n"
      "       Run: gcloud iam service-accounts keys create firebase-credentials.json "
      "--iam-account=rescuenet-backend@YOUR_PROJECT.iam.gserviceaccount.com")

# ── 2. Python Dependencies ────────────────────────────────────────────────────
print("\n2. Python Dependencies")

for pkg, import_name in [
    ("fastapi", "fastapi"),
    ("uvicorn", "uvicorn"),
    ("httpx", "httpx"),
    ("firebase-admin", "firebase_admin"),
    ("pydantic", "pydantic"),
    ("python-dotenv", "dotenv"),
]:
    try:
        __import__(import_name)
        check(pkg, True, "")
    except ImportError:
        check(pkg, False, f"Run: pip install {pkg} --break-system-packages")

# ── 3. Firebase Connection ────────────────────────────────────────────────────
print("\n3. Firebase Connection")

try:
    import firebase_admin
    from firebase_admin import credentials, firestore

    if not firebase_admin._apps:
        if os.path.exists(creds_path):
            cred = credentials.Certificate(creds_path)
            firebase_admin.initialize_app(cred)
        else:
            firebase_admin.initialize_app()

    db = firestore.client()
    # Try a lightweight read
    db.collection("_validation_test").limit(1).get()
    check("Firestore connection", True, "")

    # Write test
    db.collection("_validation_test").document("ping").set({"status": "ok", "ts": __import__("datetime").datetime.utcnow().isoformat()})
    check("Firestore write", True, "")

    db.collection("_validation_test").document("ping").delete()
    check("Firestore delete", True, "")

except Exception as e:
    check("Firestore connection", False, f"Error: {e}\n       Check credentials and IAM permissions.")

# ── 4. Google Maps API ────────────────────────────────────────────────────────
print("\n4. Google Maps API")

async def test_maps():
    import httpx
    key = os.getenv("GOOGLE_MAPS_API_KEY", "")
    if not key:
        return False, "No API key"
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                "https://maps.googleapis.com/maps/api/geocode/json",
                params={"address": "Chennai, India", "key": key}
            )
            data = resp.json()
            if data.get("status") == "OK":
                return True, ""
            return False, f"API returned status: {data.get('status')} — check key & billing"
    except Exception as e:
        return False, str(e)

try:
    ok, msg = asyncio.run(test_maps())
    check("Geocoding API", ok, msg)
except Exception as e:
    check("Geocoding API", False, str(e))

async def test_places():
    import httpx
    key = os.getenv("GOOGLE_MAPS_API_KEY", "")
    if not key:
        return False, "No API key"
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                "https://maps.googleapis.com/maps/api/place/nearbysearch/json",
                params={"location": "13.0827,80.2707", "radius": "5000", "type": "hospital", "key": key}
            )
            data = resp.json()
            status = data.get("status")
            if status in ("OK", "ZERO_RESULTS"):
                count = len(data.get("results", []))
                return True, f"Found {count} hospitals near Chennai"
            return False, f"Places API status: {status}"
    except Exception as e:
        return False, str(e)

try:
    ok, msg = asyncio.run(test_places())
    check(f"Places API (Nearby Hospitals){' — ' + msg if msg else ''}", ok, msg)
except Exception as e:
    check("Places API", False, str(e))

# ── 5. Hospital Alert Service ─────────────────────────────────────────────────
print("\n5. Hospital Alert Service")

try:
    from hospital_alert_service import HospitalAlertService, HospitalAlert
    check("hospital_alert_service.py importable", True, "")

    svc = HospitalAlertService(maps_api_key=os.getenv("GOOGLE_MAPS_API_KEY", "test"))
    km = svc._haversine_km(13.0827, 80.2707, 13.0569, 80.2425)
    check(f"Haversine distance calculation ({km:.2f} km)", km > 0, "Math error")

    ambulances = svc._recommended_ambulances("critical", 10)
    check(f"Ambulance count logic (critical, 10 casualties → {ambulances})", ambulances >= 3, "Logic error")

except Exception as e:
    check("hospital_alert_service.py", False, f"Import error: {e}")

try:
    from hospital_alert_router import router
    check("hospital_alert_router.py importable", True, "")
except Exception as e:
    check("hospital_alert_router.py", False, f"Import error: {e}")

# ── Summary ───────────────────────────────────────────────────────────────────
print("\n" + "="*60)
print(f"  Results: {len(passed)} passed · {len(warnings)} warnings · {len(errors)} errors")
print("="*60)

if errors:
    print("\n  ❌ Fix the errors above before running the app.")
    sys.exit(1)
elif warnings:
    print("\n  ⚠️  Some optional services not configured (app will still run).")
else:
    print("\n  🎉 All checks passed! Run the app with:")
    print("     cd backend && python main.py")
print()
