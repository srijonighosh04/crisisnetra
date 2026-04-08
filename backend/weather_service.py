"""
weather_service.py - Weather Alert & Predictive Resource Allocation
Integrates with weather APIs and historical disaster data
"""
import os
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import httpx
from models import WeatherAlert, ResourcePrediction

logger = logging.getLogger(__name__)


class WeatherService:
    """
    Integrates weather alert APIs and predicts resource needs
    based on approaching disasters
    """
    
    def __init__(self):
        self.api_key = os.getenv("WEATHER_API_KEY", "demo")
        # Using OpenWeather API as example (can be replaced with any weather service)
        self.base_url = "https://api.openweathermap.org/data/2.5"
        
        # Historical disaster impact data (simplified)
        self.disaster_impact_models = {
            "hurricane": {
                "category_1": {"ambulances": 20, "beds": 100, "blood_units": 50},
                "category_2": {"ambulances": 50, "beds": 250, "blood_units": 120},
                "category_3": {"ambulances": 100, "beds": 500, "blood_units": 300},
                "category_4": {"ambulances": 200, "beds": 1000, "blood_units": 600},
                "category_5": {"ambulances": 300, "beds": 2000, "blood_units": 1000},
            },
            "flood": {
                "minor": {"ambulances": 10, "beds": 50, "blood_units": 30},
                "moderate": {"ambulances": 30, "beds": 150, "blood_units": 80},
                "major": {"ambulances": 80, "beds": 400, "blood_units": 200},
            },
            "tornado": {
                "ef1": {"ambulances": 15, "beds": 75, "blood_units": 40},
                "ef2": {"ambulances": 30, "beds": 150, "blood_units": 80},
                "ef3": {"ambulances": 60, "beds": 300, "blood_units": 150},
                "ef4": {"ambulances": 120, "beds": 600, "blood_units": 300},
                "ef5": {"ambulances": 200, "beds": 1000, "blood_units": 500},
            }
        }
    
    async def get_weather_alerts(self, lat: float, lon: float, radius_km: int = 100) -> List[WeatherAlert]:
        """
        Fetch active weather alerts for a region
        """
        try:
            # Example: Get severe weather alerts
            async with httpx.AsyncClient(timeout=10.0) as client:
                # Using OpenWeather's One Call API for alerts
                url = f"{self.base_url}/onecall"
                params = {
                    "lat": lat,
                    "lon": lon,
                    "appid": self.api_key,
                    "exclude": "minutely,hourly,daily"
                }
                
                response = await client.get(url, params=params)
                
                if response.status_code == 200:
                    data = response.json()
                    alerts = []
                    
                    if "alerts" in data:
                        for alert in data["alerts"]:
                            weather_alert = self._parse_weather_alert(alert, lat, lon)
                            if weather_alert:
                                alerts.append(weather_alert)
                    
                    return alerts
                else:
                    logger.warning(f"Weather API returned {response.status_code}")
                    return []
                    
        except Exception as e:
            logger.error(f"Error fetching weather alerts: {e}")
            return []
    
    def _parse_weather_alert(self, alert_data: Dict, lat: float, lon: float) -> Optional[WeatherAlert]:
        """
        Parse weather API alert into our WeatherAlert model
        """
        try:
            event = alert_data.get("event", "").lower()
            
            # Detect disaster type
            alert_type = "general"
            if "hurricane" in event or "tropical" in event:
                alert_type = "hurricane"
            elif "flood" in event:
                alert_type = "flood"
            elif "tornado" in event:
                alert_type = "tornado"
            elif "severe" in event:
                alert_type = "severe_weather"
            
            # Estimate severity (1-5)
            severity = self._estimate_severity(alert_data.get("description", ""))
            
            # Predict resource needs
            prediction = self.predict_resource_needs(
                disaster_type=alert_type,
                severity=severity,
                affected_population=100000  # Estimate based on radius
            )
            
            return WeatherAlert(
                alert_type=alert_type,
                affected_regions=[f"Region near {lat},{lon}"],
                severity=severity,
                start_time=datetime.fromtimestamp(alert_data.get("start", 0)).isoformat(),
                end_time=datetime.fromtimestamp(alert_data.get("end", 0)).isoformat() if alert_data.get("end") else None,
                predicted_ambulances_needed=prediction["ambulances"],
                predicted_beds_needed=prediction["beds"],
                predicted_blood_units=prediction["blood_units"],
                source="openweather"
            )
        except Exception as e:
            logger.error(f"Error parsing weather alert: {e}")
            return None
    
    def _estimate_severity(self, description: str) -> int:
        """
        Estimate severity 1-5 based on alert description
        """
        description_lower = description.lower()
        
        if "extreme" in description_lower or "catastrophic" in description_lower:
            return 5
        elif "severe" in description_lower or "major" in description_lower:
            return 4
        elif "moderate" in description_lower:
            return 3
        elif "minor" in description_lower:
            return 2
        else:
            return 1
    
    def predict_resource_needs(
        self, 
        disaster_type: str, 
        severity: int,
        affected_population: int
    ) -> Dict[str, Any]:
        """
        Predict ambulances, beds, and blood needed based on disaster type and severity
        Uses historical data models
        """
        base_prediction = {"ambulances": 0, "beds": 0, "blood_units": {}}
        
        # Get base values from historical models
        if disaster_type == "hurricane":
            category = f"category_{min(severity, 5)}"
            if category in self.disaster_impact_models["hurricane"]:
                base = self.disaster_impact_models["hurricane"][category]
                base_prediction["ambulances"] = base["ambulances"]
                base_prediction["beds"] = base["beds"]
                total_blood = base["blood_units"]
        
        elif disaster_type == "flood":
            severity_map = {1: "minor", 2: "minor", 3: "moderate", 4: "major", 5: "major"}
            level = severity_map.get(severity, "moderate")
            if level in self.disaster_impact_models["flood"]:
                base = self.disaster_impact_models["flood"][level]
                base_prediction["ambulances"] = base["ambulances"]
                base_prediction["beds"] = base["beds"]
                total_blood = base["blood_units"]
        
        elif disaster_type == "tornado":
            ef_scale = f"ef{min(severity, 5)}"
            if ef_scale in self.disaster_impact_models["tornado"]:
                base = self.disaster_impact_models["tornado"][ef_scale]
                base_prediction["ambulances"] = base["ambulances"]
                base_prediction["beds"] = base["beds"]
                total_blood = base["blood_units"]
        
        else:
            # Generic calculation for unknown disaster types
            base_prediction["ambulances"] = severity * 10
            base_prediction["beds"] = severity * 50
            total_blood = severity * 25
        
        # Distribute blood units across types (simplified distribution)
        blood_distribution = {
            "O-": 0.15,  # Universal donor, highest priority
            "O+": 0.35,
            "A+": 0.25,
            "A-": 0.10,
            "B+": 0.10,
            "AB+": 0.03,
            "AB-": 0.02
        }
        
        if "total_blood" in locals():
            base_prediction["blood_units"] = {
                blood_type: int(total_blood * ratio)
                for blood_type, ratio in blood_distribution.items()
            }
        
        # Scale by population (rough estimate)
        population_factor = affected_population / 100000
        base_prediction["ambulances"] = int(base_prediction["ambulances"] * population_factor)
        base_prediction["beds"] = int(base_prediction["beds"] * population_factor)
        
        if base_prediction["blood_units"]:
            base_prediction["blood_units"] = {
                k: int(v * population_factor) 
                for k, v in base_prediction["blood_units"].items()
            }
        
        return base_prediction
    
    async def generate_resource_prediction(
        self, 
        region: str, 
        disaster_type: str,
        severity: int,
        lat: float,
        lon: float
    ) -> ResourcePrediction:
        """
        Generate comprehensive resource prediction including staging areas
        """
        # Predict resource needs
        needs = self.predict_resource_needs(disaster_type, severity, affected_population=100000)
        
        # Identify staging areas (simplified - in production, use real POI data)
        staging_areas = self._identify_staging_areas(lat, lon, disaster_type)
        
        # Calculate confidence based on data quality
        confidence = self._calculate_confidence(disaster_type, severity)
        
        return ResourcePrediction(
            region=region,
            disaster_type=disaster_type,
            prediction_time=datetime.utcnow().isoformat(),
            ambulances_needed=needs["ambulances"],
            medical_teams_needed=needs["ambulances"] // 2,  # 1 team per 2 ambulances
            beds_needed=needs["beds"],
            blood_units_needed=needs.get("blood_units", {}),
            recommended_staging_areas=staging_areas,
            confidence_score=confidence
        )
    
    def _identify_staging_areas(self, lat: float, lon: float, disaster_type: str) -> List[Dict[str, Any]]:
        """
        Identify recommended staging areas for pre-positioning resources
        In production, this would query actual POI databases
        """
        # Simplified: Create staging points in cardinal directions
        offset = 0.05  # ~5km offset
        
        staging_areas = [
            {
                "name": "North Staging Area",
                "location": {"lat": lat + offset, "lng": lon},
                "type": "temporary_field_hospital",
                "capacity": "50 beds, 10 ambulances"
            },
            {
                "name": "South Staging Area", 
                "location": {"lat": lat - offset, "lng": lon},
                "type": "medical_supply_depot",
                "capacity": "Medical supplies, blood storage"
            },
            {
                "name": "East Staging Area",
                "location": {"lat": lat, "lng": lon + offset},
                "type": "ambulance_depot",
                "capacity": "20 ambulances, rescue equipment"
            }
        ]
        
        return staging_areas
    
    def _calculate_confidence(self, disaster_type: str, severity: int) -> float:
        """
        Calculate prediction confidence based on model quality
        """
        # Higher confidence for well-modeled disasters
        base_confidence = {
            "hurricane": 0.85,
            "flood": 0.80,
            "tornado": 0.75,
            "earthquake": 0.70,
        }.get(disaster_type, 0.60)
        
        # Adjust for severity (mid-range severities have better models)
        severity_factor = 1.0 - abs(severity - 3) * 0.05
        
        return min(base_confidence * severity_factor, 0.95)
