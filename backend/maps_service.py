"""
maps_service.py - Google Maps integration for CrisisNetra
"""
import os
import logging
import httpx

logger = logging.getLogger(__name__)


class MapsService:
    def __init__(self):
        self.api_key = os.getenv("GOOGLE_MAPS_API_KEY", "")

    async def geocode(self, address: str) -> dict:
        url = "https://maps.googleapis.com/maps/api/geocode/json"
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url, params={"address": address, "key": self.api_key})
            data = resp.json()
        if data.get("status") == "OK":
            geo = data["results"][0]["geometry"]["location"]
            return {"lat": geo["lat"], "lng": geo["lng"], "formatted_address": data["results"][0]["formatted_address"]}
        raise ValueError(f"Geocoding failed: {data.get('status')}")

    async def get_route_eta(self, origin: dict, destination: dict) -> dict:
        url = "https://routes.googleapis.com/directions/v2:computeRoutes"
        headers = {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": self.api_key,
            "X-Goog-FieldMask": "routes.duration,routes.distanceMeters",
        }
        body = {
            "origin": {"location": {"latLng": {"latitude": origin["lat"], "longitude": origin["lng"]}}},
            "destination": {"location": {"latLng": {"latitude": destination["lat"], "longitude": destination["lng"]}}},
            "travelMode": "DRIVE",
            "routingPreference": "TRAFFIC_AWARE",
        }
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(url, json=body, headers=headers)
            data = resp.json()
        routes = data.get("routes", [])
        if routes:
            seconds = int(routes[0].get("duration", "0s").rstrip("s"))
            return {"eta_seconds": seconds, "eta_minutes": seconds // 60, "distance_meters": routes[0].get("distanceMeters", 0)}
        return {"eta_seconds": 0, "eta_minutes": 0, "distance_meters": 0}
