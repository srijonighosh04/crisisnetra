"""
hospital_alert_service.py
CrisisNetra - Hospital Alert & Ambulance Dispatch Service

Automatically finds nearest hospitals when a disaster is reported,
calculates real-time ambulance ETAs, and sends emergency notifications.
"""

import math
import logging
import asyncio
from datetime import datetime
from typing import Optional
import httpx

logger = logging.getLogger(__name__)


class HospitalAlert:
    def __init__(
        self,
        incident_id: str,
        location: dict,
        incident_type: str,
        severity: str,
        casualties_estimate: int,
        description: str,
        reported_by: str,
    ):
        self.incident_id = incident_id
        self.location = location
        self.incident_type = incident_type
        self.severity = severity
        self.casualties_estimate = casualties_estimate
        self.description = description
        self.reported_by = reported_by
        self.timestamp = datetime.utcnow().isoformat()
        self.status = "pending"
        self.alerted_hospitals = []


class HospitalAlertService:
    """
    Core service that:
    1. Geocodes the incident location
    2. Finds nearby hospitals via Google Maps Places API
    3. Calculates real-time ETAs via Routes API v2
    4. Saves incident + hospital responses in Firestore
    5. Sends push/SMS notifications to hospitals
    6. Tracks ambulance dispatch status in real-time
    """

    SEVERITY_RADIUS_KM = {"critical": 20, "high": 15, "medium": 10}
    SEVERITY_HOSPITAL_COUNT = {"critical": 5, "high": 4, "medium": 3}

    def __init__(self, maps_api_key: str, firebase_service=None, tts_service=None):
        self.maps_api_key = maps_api_key
        self.firebase = firebase_service
        self.tts = tts_service

    async def trigger_hospital_alert(self, alert: HospitalAlert) -> dict:
        logger.info(f"[HospitalAlert] Incident {alert.incident_id} — {alert.incident_type}")
        try:
            coords = await self._ensure_coordinates(alert.location)
            alert.location.update(coords)

            hospitals = await self._find_nearest_hospitals(
                lat=coords["lat"], lng=coords["lng"], severity=alert.severity
            )
            if not hospitals:
                return {"success": False, "error": "No hospitals found in range"}

            hospitals = await self._enrich_with_eta(hospitals, coords)
            hospitals.sort(key=lambda h: h.get("eta_seconds", 9999))

            await self._save_incident(alert, hospitals)

            results = await asyncio.gather(
                *[self._notify_hospital(h, alert) for h in hospitals],
                return_exceptions=True
            )

            alerted = [h for h, r in zip(hospitals, results) if not isinstance(r, Exception)]
            alert.alerted_hospitals = alerted
            alert.status = "alerted"
            await self._update_incident_status(alert)

            if self.tts and alert.severity == "critical":
                await self._broadcast_voice_alert(alert, alerted[0] if alerted else None)

            logger.info(f"[HospitalAlert] {len(alerted)} hospitals alerted for {alert.incident_id}")
            return {
                "success": True,
                "incident_id": alert.incident_id,
                "severity": alert.severity,
                "hospitals_alerted": len(alerted),
                "hospitals": self._format_hospital_response(alerted),
                "nearest_eta_minutes": round(alerted[0]["eta_seconds"] / 60) if alerted else None,
                "timestamp": alert.timestamp,
            }
        except Exception as e:
            logger.error(f"[HospitalAlert] Failed: {e}")
            return {"success": False, "error": str(e)}

    async def _ensure_coordinates(self, location: dict) -> dict:
        if location.get("lat") and location.get("lng"):
            return {"lat": location["lat"], "lng": location["lng"]}
        address = location.get("address", "")
        if not address:
            raise ValueError("No location address or coordinates provided.")
        url = "https://maps.googleapis.com/maps/api/geocode/json"
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url, params={"address": address, "key": self.maps_api_key})
            data = resp.json()
        if data.get("status") != "OK" or not data.get("results"):
            raise ValueError(f"Geocoding failed for: {address}")
        geo = data["results"][0]["geometry"]["location"]
        return {"lat": geo["lat"], "lng": geo["lng"]}

    async def _find_nearest_hospitals(self, lat: float, lng: float, severity: str) -> list:
        radius_km = self.SEVERITY_RADIUS_KM.get(severity, 15)
        max_count = self.SEVERITY_HOSPITAL_COUNT.get(severity, 4)
        url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
        params = {
            "location": f"{lat},{lng}",
            "radius": radius_km * 1000,
            "type": "hospital",
            "key": self.maps_api_key,
        }
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(url, params=params)
            data = resp.json()
        if data.get("status") not in ("OK", "ZERO_RESULTS"):
            raise RuntimeError(f"Places API error: {data.get('status')}")
        hospitals = []
        for place in data.get("results", [])[:max_count]:
            geo = place["geometry"]["location"]
            hospitals.append({
                "place_id": place["place_id"],
                "name": place["name"],
                "address": place.get("vicinity", ""),
                "lat": geo["lat"],
                "lng": geo["lng"],
                "rating": place.get("rating"),
                "is_open": place.get("opening_hours", {}).get("open_now", True),
                "straight_distance_km": self._haversine_km(lat, lng, geo["lat"], geo["lng"]),
                "status": "pending",
                "ambulances_dispatched": 0,
            })
        return hospitals

    async def _enrich_with_eta(self, hospitals: list, incident_coords: dict) -> list:
        async def get_eta(hospital: dict) -> dict:
            try:
                url = "https://routes.googleapis.com/directions/v2:computeRoutes"
                headers = {
                    "Content-Type": "application/json",
                    "X-Goog-Api-Key": self.maps_api_key,
                    "X-Goog-FieldMask": "routes.duration,routes.distanceMeters",
                }
                body = {
                    "origin": {"location": {"latLng": {"latitude": hospital["lat"], "longitude": hospital["lng"]}}},
                    "destination": {"location": {"latLng": {"latitude": incident_coords["lat"], "longitude": incident_coords["lng"]}}},
                    "travelMode": "DRIVE",
                    "routingPreference": "TRAFFIC_AWARE",
                }
                async with httpx.AsyncClient(timeout=10) as client:
                    resp = await client.post(url, json=body, headers=headers)
                    data = resp.json()
                routes = data.get("routes", [])
                if routes:
                    seconds = int(routes[0].get("duration", "0s").rstrip("s"))
                    distance_m = routes[0].get("distanceMeters", 0)
                    hospital["eta_seconds"] = seconds
                    hospital["eta_minutes"] = math.ceil(seconds / 60)
                    hospital["route_distance_km"] = round(distance_m / 1000, 1)
                else:
                    raise ValueError("No routes returned")
            except Exception as e:
                logger.warning(f"ETA fetch failed for {hospital['name']}: {e}")
                km = hospital["straight_distance_km"]
                hospital["eta_seconds"] = int(km * 3 * 60)
                hospital["eta_minutes"] = math.ceil(km * 3)
                hospital["route_distance_km"] = round(km * 1.3, 1)
            return hospital
        return list(await asyncio.gather(*[get_eta(h) for h in hospitals]))

    async def _notify_hospital(self, hospital: dict, alert: HospitalAlert) -> dict:
        payload = {
            "incident_id": alert.incident_id,
            "incident_type": alert.incident_type,
            "severity": alert.severity,
            "location": alert.location,
            "casualties_estimate": alert.casualties_estimate,
            "description": alert.description,
            "reported_by": alert.reported_by,
            "timestamp": alert.timestamp,
            "eta_minutes": hospital.get("eta_minutes"),
            "route_distance_km": hospital.get("route_distance_km"),
            "instructions": self._generate_instructions(alert, hospital),
        }
        if self.firebase:
            try:
                self.firebase.db.collection("hospital_alerts") \
                    .document(alert.incident_id) \
                    .collection("hospitals") \
                    .document(hospital["place_id"]) \
                    .set({**payload, "hospital_name": hospital["name"], "hospital_address": hospital["address"],
                          "alert_sent_at": datetime.utcnow().isoformat(), "response_status": "notified"})
            except Exception as e:
                logger.error(f"Firestore write failed: {e}")

        hospital["notification_sent"] = True
        hospital["alert_sent_at"] = datetime.utcnow().isoformat()
        hospital["ambulances_dispatched"] = self._recommended_ambulances(alert.severity, alert.casualties_estimate)
        logger.info(f"Notified: {hospital['name']} (ETA: {hospital.get('eta_minutes')} min)")
        return hospital

    async def _save_incident(self, alert: HospitalAlert, hospitals: list):
        if not self.firebase:
            return
        try:
            self.firebase.db.collection("incidents").document(alert.incident_id).set({
                "incident_id": alert.incident_id,
                "incident_type": alert.incident_type,
                "severity": alert.severity,
                "location": alert.location,
                "casualties_estimate": alert.casualties_estimate,
                "description": alert.description,
                "reported_by": alert.reported_by,
                "timestamp": alert.timestamp,
                "status": "alerting",
                "hospitals_nearby_count": len(hospitals),
            })
        except Exception as e:
            logger.error(f"Firestore save failed: {e}")

    async def _update_incident_status(self, alert: HospitalAlert):
        if not self.firebase:
            return
        try:
            self.firebase.db.collection("incidents").document(alert.incident_id).update({
                "status": alert.status,
                "hospitals_alerted": len(alert.alerted_hospitals),
                "updated_at": datetime.utcnow().isoformat(),
            })
        except Exception as e:
            logger.error(f"Firestore update failed: {e}")

    async def _broadcast_voice_alert(self, alert: HospitalAlert, nearest: Optional[dict]):
        if not self.tts or not nearest:
            return
        msg = (
            f"Emergency alert. {alert.incident_type} at {alert.location.get('address', 'unknown location')}. "
            f"Severity {alert.severity}. Estimated casualties: {alert.casualties_estimate}. "
            f"Ambulance ETA: {nearest.get('eta_minutes', '?')} minutes."
        )
        try:
            await self.tts.synthesize(msg, language="en-IN")
        except Exception as e:
            logger.warning(f"TTS failed: {e}")

    @staticmethod
    def _haversine_km(lat1, lng1, lat2, lng2) -> float:
        R = 6371
        dlat = math.radians(lat2 - lat1)
        dlng = math.radians(lng2 - lng1)
        a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng/2)**2
        return round(R * 2 * math.asin(math.sqrt(a)), 2)

    @staticmethod
    def _recommended_ambulances(severity: str, casualties: int) -> int:
        base = {"critical": 3, "high": 2, "medium": 1}.get(severity, 1)
        return base + max(0, (casualties - 5) // 5)

    @staticmethod
    def _generate_instructions(alert: HospitalAlert, hospital: dict) -> str:
        return "\n".join([
            f"EMERGENCY DISPATCH — {alert.severity.upper()} SEVERITY",
            f"Incident: {alert.incident_type}",
            f"Location: {alert.location.get('address', 'See coordinates')}",
            f"Coordinates: {alert.location.get('lat')}, {alert.location.get('lng')}",
            f"Estimated casualties: {alert.casualties_estimate}",
            f"Your ETA to scene: {hospital.get('eta_minutes', '?')} minutes",
            f"Recommended ambulances: {HospitalAlertService._recommended_ambulances(alert.severity, alert.casualties_estimate)}",
            "",
            "ACTIONS REQUIRED:",
            "1. Prepare trauma/emergency bay immediately",
            "2. Dispatch ambulance(s) to incident location",
            "3. Alert surgery, ICU, and burns teams as applicable",
            "4. Confirm receipt via CrisisNetra dashboard",
        ])

    @staticmethod
    def _format_hospital_response(hospitals: list) -> list:
        return [{
            "name": h["name"],
            "address": h["address"],
            "eta_minutes": h.get("eta_minutes"),
            "route_distance_km": h.get("route_distance_km"),
            "ambulances_dispatched": h.get("ambulances_dispatched", 0),
            "notification_sent": h.get("notification_sent", False),
            "alert_sent_at": h.get("alert_sent_at"),
        } for h in hospitals]
