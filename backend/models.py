"""
models.py - Pydantic data models for CrisisNetra
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class Volunteer(BaseModel):
    id: Optional[str] = None
    name: str
    phone: str
    skills: list[str] = []
    location: Optional[dict] = None
    status: str = "available"
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class Task(BaseModel):
    id: Optional[str] = None
    title: str
    description: str
    location: dict
    severity: str = "medium"
    status: str = "open"
    assigned_to: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class CrisisReport(BaseModel):
    text: str
    source: str = "manual"
    reported_by: str = "unknown"

class TriageLevel(str, Enum):
    RED = "red"
    YELLOW = "yellow"
    GREEN = "green"
    BLACK = "black"

class TriageTag(BaseModel):
    id: Optional[str] = None
    patient_id: str
    severity: TriageLevel
    injuries: List[str] = []
    vital_signs: Optional[Dict[str, Any]] = None
    special_requirements: List[str] = []
    tagged_by: str
    auto_routed_to: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

class HospitalInventory(BaseModel):
    hospital_id: Optional[str] = None
    hospital_name: str = "Unknown"
    location: Optional[Dict[str, float]] = None
    total_beds: int = 0
    available_beds: int = 0
    icu_beds: int = 0
    burn_ward_beds: int = 0
    ventilators_available: int = 0
    blood_inventory: Optional[Dict[str, int]] = None
    accepts_emergency: bool = True
    last_updated: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

class RouteObstacle(BaseModel):
    id: Optional[str] = None
    type: str
    polygon: List[List[float]]
    description: str
    reported_by: str
    severity: str = "medium"
    verified: bool = False
    expires_at: Optional[str] = None
    cleared: bool = False
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

class WeatherAlert(BaseModel):
    alert_type: str
    affected_regions: List[str]
    severity: int
    start_time: str
    end_time: Optional[str] = None
    predicted_ambulances_needed: int = 0
    predicted_beds_needed: int = 0
    predicted_blood_units: Dict[str, int] = {}
    source: str = "unknown"

class ResourcePrediction(BaseModel):
    region: str
    disaster_type: str
    prediction_time: str
    ambulances_needed: int = 0
    medical_teams_needed: int = 0
    beds_needed: int = 0
    blood_units_needed: Dict[str, int] = {}
    recommended_staging_areas: List[Dict[str, Any]] = []
    confidence_score: float = 0.0
