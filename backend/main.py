"""
CrisisNetra v4.0 - Enhanced Main FastAPI Application
Features:
- Predictive Resource Allocation (Weather Alerts)
- PWA & Offline Sync
- Crowdsourced Route Obstacles
- Live Hospital Resource & Blood Bank Tracking
- Medical Triage Tagging System
"""

import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import List, Dict, Any, Optional

# ── Service imports ────────────────────────────────────────────────────────────
from firebase_config import initialize_firebase
from firebase_service import FirebaseService
from gemini_service import GeminiService
from maps_service import MapsService
from tts_service import TTSService
from dispatch_engine import DispatchEngine

# ── New Enhanced Services ──────────────────────────────────────────────────────
from weather_service import WeatherService
from triage_service import TriageService
from hospital_inventory_service import HospitalInventoryService
from route_obstacles_service import RouteObstaclesService

# ── Routers ────────────────────────────────────────────────────────────────────
from hospital_alert_router import router as hospital_alert_router

# ── Models ─────────────────────────────────────────────────────────────────────
from models import (
    TriageTag, TriageLevel, HospitalInventory, RouteObstacle,
    WeatherAlert, ResourcePrediction, Volunteer, Task
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)

# ── App lifecycle ──────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚨 CrisisNetra v4.0 starting up...")
    initialize_firebase()
    logger.info("✅ Firebase initialized")
    logger.info("✅ Enhanced features loaded: Triage, Weather Prediction, Route Obstacles, Hospital Tracking")
    yield
    logger.info("CrisisNetra shutting down")

app = FastAPI(
    title="CrisisNetra v4.0",
    description="Enhanced disaster relief coordination platform with Triage, Resource Prediction, and Crowdsourced Routing",
    version="4.0.0",
    lifespan=lifespan,
)

# ── CORS ───────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:8000").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Existing Routers ───────────────────────────────────────────────────────────
app.include_router(hospital_alert_router, prefix="/api/hospital-alert", tags=["Hospital Alert"])

# ══════════════════════════════════════════════════════════════════════════════
# ── TRIAGE SYSTEM ENDPOINTS ───────────────────────────────────────────────────
# ══════════════════════════════════════════════════════════════════════════════

@app.post("/api/triage/tag", tags=["Triage System"])
async def create_triage_tag(
    patient_id: str,
    severity: TriageLevel,
    injuries: List[str],
    vital_signs: Optional[Dict[str, Any]] = None,
    special_requirements: List[str] = [],
    tagged_by: str = "volunteer",
    location: Dict[str, float] = {"lat": 0, "lng": 0}
):
    """
    Create a triage tag for a patient
    Automatically routes to appropriate hospital based on severity and requirements
    """
    try:
        triage_service = TriageService()
        triage_tag = await triage_service.create_triage_tag(
            patient_id=patient_id,
            severity=severity,
            injuries=injuries,
            vital_signs=vital_signs,
            special_requirements=special_requirements,
            tagged_by=tagged_by,
            location=location
        )
        return triage_tag
    except Exception as e:
        logger.error(f"Error creating triage tag: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/triage/stats", tags=["Triage System"])
async def get_triage_stats():
    """
    Get triage statistics (total, by severity, routing status)
    """
    try:
        triage_service = TriageService()
        return await triage_service.get_triage_stats()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/triage/auto-assess", tags=["Triage System"])
async def auto_assess_triage(
    vital_signs: Dict[str, Any],
    injuries: List[str]
):
    """
    Automatically determine triage level based on vital signs and injuries
    Implements START triage protocol
    """
    try:
        triage_service = TriageService()
        triage_level = triage_service.determine_triage_level(vital_signs, injuries)
        return {"recommended_triage_level": triage_level}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ══════════════════════════════════════════════════════════════════════════════
# ── HOSPITAL INVENTORY ENDPOINTS ──────────────────────────────────────────────
# ══════════════════════════════════════════════════════════════════════════════

@app.put("/api/hospitals/{hospital_id}/inventory", tags=["Hospital Resources"])
async def update_hospital_inventory(hospital_id: str, updates: Dict[str, Any]):
    """
    Update hospital inventory (beds, blood, equipment)
    Called by hospital staff or automated systems
    """
    try:
        inventory_service = HospitalInventoryService()
        updated_inventory = await inventory_service.update_hospital_inventory(hospital_id, updates)
        return updated_inventory
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/hospitals/{hospital_id}/inventory", tags=["Hospital Resources"])
async def get_hospital_inventory(hospital_id: str):
    """
    Get current inventory for a specific hospital
    """
    try:
        inventory_service = HospitalInventoryService()
        inventory = await inventory_service.get_hospital_inventory(hospital_id)
        if not inventory:
            raise HTTPException(status_code=404, detail="Hospital not found")
        return inventory
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/hospitals/inventory/all", tags=["Hospital Resources"])
async def get_all_hospitals_inventory():
    """
    Get inventory for all hospitals
    """
    try:
        inventory_service = HospitalInventoryService()
        return await inventory_service.get_all_hospitals_inventory()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/hospitals/find-resource", tags=["Hospital Resources"])
async def find_hospitals_with_resource(
    resource_type: str,
    minimum_amount: int = 1,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    max_distance_km: Optional[float] = None
):
    """
    Find hospitals with specific resource available
    Examples: resource_type = "icu_beds", "blood:O-", "burn_ward_beds"
    """
    try:
        inventory_service = HospitalInventoryService()
        location = {"lat": lat, "lng": lng} if lat and lng else None
        
        hospitals = await inventory_service.find_hospitals_with_resource(
            resource_type=resource_type,
            minimum_amount=minimum_amount,
            location=location,
            max_distance_km=max_distance_km
        )
        return hospitals
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/hospitals/inventory/summary", tags=["Hospital Resources"])
async def get_inventory_summary():
    """
    Get system-wide inventory summary
    """
    try:
        inventory_service = HospitalInventoryService()
        return await inventory_service.get_inventory_summary()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ══════════════════════════════════════════════════════════════════════════════
# ── ROUTE OBSTACLES ENDPOINTS ─────────────────────────────────────────────────
# ══════════════════════════════════════════════════════════════════════════════

@app.post("/api/routes/obstacles/report", tags=["Route Obstacles"])
async def report_route_obstacle(
    obstacle_type: str,
    polygon: List[List[float]],
    description: str,
    reported_by: str,
    severity: str = "medium",
    duration_hours: Optional[int] = None
):
    """
    Report a route obstacle (road blockage, flood, debris)
    Polygon format: [[lat, lng], [lat, lng], ...]
    """
    try:
        obstacles_service = RouteObstaclesService()
        obstacle = await obstacles_service.report_obstacle(
            obstacle_type=obstacle_type,
            polygon=polygon,
            description=description,
            reported_by=reported_by,
            severity=severity,
            duration_hours=duration_hours
        )
        return obstacle
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/routes/obstacles/active", tags=["Route Obstacles"])
async def get_active_obstacles(
    north: Optional[float] = None,
    south: Optional[float] = None,
    east: Optional[float] = None,
    west: Optional[float] = None,
    min_severity: str = "low"
):
    """
    Get active obstacles, optionally filtered by map bounds
    """
    try:
        obstacles_service = RouteObstaclesService()
        bounds = None
        if all([north, south, east, west]):
            bounds = {"north": north, "south": south, "east": east, "west": west}
        
        obstacles = await obstacles_service.get_active_obstacles(
            bounds=bounds,
            min_severity=min_severity
        )
        return obstacles
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/routes/obstacles/{obstacle_id}/verify", tags=["Route Obstacles"])
async def verify_obstacle(obstacle_id: str, verified_by: str):
    """
    Verify an obstacle (increases trust)
    """
    try:
        obstacles_service = RouteObstaclesService()
        success = await obstacles_service.verify_obstacle(obstacle_id, verified_by)
        return {"success": success}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/routes/obstacles/{obstacle_id}/clear", tags=["Route Obstacles"])
async def clear_obstacle(obstacle_id: str, cleared_by: str):
    """
    Mark an obstacle as cleared
    """
    try:
        obstacles_service = RouteObstaclesService()
        success = await obstacles_service.remove_obstacle(obstacle_id, cleared_by)
        return {"success": success}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/routes/optimized", tags=["Route Obstacles"])
async def get_optimized_route(
    origin_lat: float,
    origin_lng: float,
    dest_lat: float,
    dest_lng: float,
    avoid_obstacles: bool = True
):
    """
    Get optimized route avoiding active obstacles
    """
    try:
        obstacles_service = RouteObstaclesService()
        route = await obstacles_service.get_optimized_route(
            origin={"lat": origin_lat, "lng": origin_lng},
            destination={"lat": dest_lat, "lng": dest_lng},
            avoid_obstacles=avoid_obstacles
        )
        return route
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ══════════════════════════════════════════════════════════════════════════════
# ── WEATHER & RESOURCE PREDICTION ENDPOINTS ───────────────────────────────────
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/api/weather/alerts", tags=["Weather & Prediction"])
async def get_weather_alerts(lat: float, lon: float, radius_km: int = 100):
    """
    Get active weather alerts for a region
    """
    try:
        weather_service = WeatherService()
        alerts = await weather_service.get_weather_alerts(lat, lon, radius_km)
        return alerts
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/resources/predict", tags=["Weather & Prediction"])
async def predict_resource_needs(
    region: str,
    disaster_type: str,
    severity: int,
    lat: float,
    lon: float
):
    """
    Predict resource needs based on disaster type and severity
    Returns ambulances, beds, blood units needed + staging areas
    """
    try:
        weather_service = WeatherService()
        prediction = await weather_service.generate_resource_prediction(
            region=region,
            disaster_type=disaster_type,
            severity=severity,
            lat=lat,
            lon=lon
        )
        return prediction
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ══════════════════════════════════════════════════════════════════════════════
# ── CORE ENDPOINTS (Existing) ─────────────────────────────────────────────────
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "version": "4.0.0",
        "features": [
            "hospital_alert",
            "ambulance_dispatch",
            "triage_system",
            "hospital_inventory_tracking",
            "route_obstacles",
            "weather_prediction",
            "pwa_offline_sync"
        ]
    }


@app.get("/api/stats")
async def stats():
    try:
        firebase = FirebaseService()
        basic_stats = await firebase.get_stats()
        
        # Add enhanced stats
        triage_service = TriageService()
        inventory_service = HospitalInventoryService()
        
        triage_stats = await triage_service.get_triage_stats()
        inventory_summary = await inventory_service.get_inventory_summary()
        
        return {
            **basic_stats,
            "triage": triage_stats,
            "hospital_inventory": inventory_summary
        }
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


@app.get("/api/volunteers")
async def get_volunteers():
    try:
        firebase = FirebaseService()
        return await firebase.get_volunteers()
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


@app.get("/api/tasks")
async def get_tasks(status: str = "open"):
    try:
        firebase = FirebaseService()
        return await firebase.get_tasks(status=status)
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.post("/api/volunteers")
async def add_volunteer(volunteer: Volunteer):
    try:
        firebase = FirebaseService()
        return await firebase.add_volunteer(volunteer.model_dump())
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


@app.delete("/api/volunteers/{volunteer_id}")
async def delete_volunteer(volunteer_id: str):
    try:
        firebase = FirebaseService()
        success = await firebase.delete_volunteer(volunteer_id)
        if success:
            return {"message": "Volunteer deleted successfully"}
        else:
            raise HTTPException(status_code=404, detail="Volunteer not found")
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


@app.post("/api/crisis/parse")
async def parse_crisis(data: dict):
    try:
        gemini = GeminiService()
        return await gemini.parse_crisis(data.get("text", ""))
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
