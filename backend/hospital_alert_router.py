"""
hospital_alert_router.py
CrisisNetra - Hospital Alert API Endpoints

Already mounted in main.py at /api/hospital-alert
"""

import uuid
import os
import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
from datetime import datetime

from hospital_alert_service import HospitalAlert, HospitalAlertService

logger = logging.getLogger(__name__)
router = APIRouter()


def get_alert_service() -> HospitalAlertService:
    """
    Returns a configured HospitalAlertService.
    Replace None values with your real firebase_service and tts_service instances.
    """
    maps_key = os.getenv("GOOGLE_MAPS_API_KEY", "")
    try:
        from firebase_service import FirebaseService
        firebase = FirebaseService()
    except Exception:
        firebase = None
    try:
        from tts_service import TTSService
        tts = TTSService()
    except Exception:
        tts = None
    return HospitalAlertService(maps_api_key=maps_key, firebase_service=firebase, tts_service=tts)


# ── Request / Response Models ─────────────────────────────────────────────────

class IncidentLocationRequest(BaseModel):
    address: Optional[str] = Field(None, example="Anna Salai, Chennai, Tamil Nadu")
    lat: Optional[float] = Field(None, example=13.0827)
    lng: Optional[float] = Field(None, example=80.2707)


class TriggerAlertRequest(BaseModel):
    location: IncidentLocationRequest
    incident_type: str = Field(..., example="Road accident")
    severity: str = Field(..., pattern="^(critical|high|medium)$")
    casualties_estimate: int = Field(default=1, ge=0)
    description: str = Field(default="")
    reported_by: str = Field(default="CrisisNetra")


class AmbulanceDispatchRequest(BaseModel):
    incident_id: str
    hospital_place_id: str
    ambulance_count: int = Field(default=1, ge=1, le=10)
    notes: Optional[str] = None


class HospitalAckRequest(BaseModel):
    incident_id: str
    hospital_place_id: str
    response_status: str = Field(..., pattern="^(acknowledged|en_route|arrived|declined)$")
    eta_update_minutes: Optional[int] = None
    notes: Optional[str] = None


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/trigger", summary="Report disaster and auto-alert nearest hospitals")
async def trigger_hospital_alert(request: TriggerAlertRequest):
    """
    Main endpoint. Call whenever a disaster/accident is reported.
    - Finds nearest hospitals using Google Maps Places API
    - Calculates real-time ambulance ETAs via Google Routes API v2
    - Sends emergency notifications to each hospital in parallel
    - Saves full incident record to Firestore
    - Returns ranked list of alerted hospitals with ETAs
    """
    if not request.location.address and not (request.location.lat and request.location.lng):
        raise HTTPException(status_code=400, detail="Provide address or lat/lng coordinates")

    incident_id = f"INC-{uuid.uuid4().hex[:8].upper()}"
    alert = HospitalAlert(
        incident_id=incident_id,
        location={
            "address": request.location.address or "",
            "lat": request.location.lat,
            "lng": request.location.lng,
        },
        incident_type=request.incident_type,
        severity=request.severity,
        casualties_estimate=request.casualties_estimate,
        description=request.description,
        reported_by=request.reported_by,
    )

    service = get_alert_service()
    result = await service.trigger_hospital_alert(alert)

    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("error", "Alert failed"))

    return result


@router.get("/incident/{incident_id}", summary="Get incident + hospital response status")
async def get_incident_status(incident_id: str):
    try:
        from firebase_service import FirebaseService
        firebase = FirebaseService()
        incident = firebase.db.collection("incidents").document(incident_id).get()
        if not incident.exists:
            raise HTTPException(status_code=404, detail="Incident not found")
        hospitals_ref = firebase.db.collection("hospital_alerts").document(incident_id).collection("hospitals").stream()
        hospitals = [h.to_dict() for h in hospitals_ref]
        return {"incident": incident.to_dict(), "hospitals": hospitals}
    except HTTPException:
        raise
    except Exception as e:
        return {"incident_id": incident_id, "error": str(e), "firestore_path": f"incidents/{incident_id}"}


@router.post("/dispatch-ambulance", summary="Dispatch ambulance from a hospital")
async def dispatch_ambulance(request: AmbulanceDispatchRequest):
    logger.info(f"[Dispatch] {request.ambulance_count} ambulance(s) from {request.hospital_place_id}")
    try:
        from firebase_service import FirebaseService
        firebase = FirebaseService()
        firebase.db.collection("hospital_alerts") \
            .document(request.incident_id) \
            .collection("hospitals") \
            .document(request.hospital_place_id) \
            .update({
                "ambulances_dispatched": request.ambulance_count,
                "response_status": "en_route",
                "dispatched_at": datetime.utcnow().isoformat(),
                "dispatch_notes": request.notes or "",
            })
    except Exception as e:
        logger.warning(f"Firestore dispatch update failed: {e}")

    return {
        "success": True,
        "incident_id": request.incident_id,
        "hospital_place_id": request.hospital_place_id,
        "ambulances_dispatched": request.ambulance_count,
        "status": "en_route",
    }


@router.post("/hospital-ack", summary="Hospital acknowledges alert or updates status")
async def hospital_acknowledgement(request: HospitalAckRequest):
    logger.info(f"[HospitalAck] {request.hospital_place_id} → {request.response_status}")
    update = {
        "response_status": request.response_status,
        "acknowledged_at": datetime.utcnow().isoformat(),
    }
    if request.eta_update_minutes:
        update["eta_update_minutes"] = request.eta_update_minutes
    if request.notes:
        update["notes"] = request.notes

    try:
        from firebase_service import FirebaseService
        firebase = FirebaseService()
        firebase.db.collection("hospital_alerts") \
            .document(request.incident_id) \
            .collection("hospitals") \
            .document(request.hospital_place_id) \
            .update(update)
    except Exception as e:
        logger.warning(f"Firestore ack update failed: {e}")

    return {"success": True, "incident_id": request.incident_id, "updated_status": request.response_status}


@router.get("/nearby-hospitals", summary="Preview nearby hospitals without sending alert")
async def find_nearby_hospitals(lat: float, lng: float, severity: str = "high"):
    if severity not in ("critical", "high", "medium"):
        raise HTTPException(status_code=400, detail="severity must be critical, high, or medium")
    service = get_alert_service()
    hospitals = await service._find_nearest_hospitals(lat=lat, lng=lng, severity=severity)
    hospitals = await service._enrich_with_eta(hospitals, {"lat": lat, "lng": lng})
    hospitals.sort(key=lambda h: h.get("eta_seconds", 9999))
    return {
        "lat": lat, "lng": lng, "severity": severity,
        "hospitals_found": len(hospitals),
        "hospitals": [{"name": h["name"], "address": h["address"],
                       "distance_km": h.get("route_distance_km"), "eta_minutes": h.get("eta_minutes")}
                      for h in hospitals],
    }
