"""
triage_service.py - Medical Triage System
Implements standard triage protocols and auto-routing logic
"""
import logging
from typing import List, Optional, Dict, Any
from models import TriageTag, TriageLevel, HospitalInventory
from firebase_service import FirebaseService

logger = logging.getLogger(__name__)


class TriageService:
    """
    Handles medical triage tagging and intelligent hospital routing
    """
    
    def __init__(self):
        self.firebase = FirebaseService()
    
    async def create_triage_tag(
        self,
        patient_id: str,
        severity: TriageLevel,
        injuries: List[str],
        vital_signs: Optional[Dict[str, Any]],
        special_requirements: List[str],
        tagged_by: str,
        location: Dict[str, float]
    ) -> TriageTag:
        """
        Create a triage tag and auto-route to appropriate hospital
        """
        # Create triage tag
        triage_tag = TriageTag(
            patient_id=patient_id,
            severity=severity,
            injuries=injuries,
            vital_signs=vital_signs,
            special_requirements=special_requirements,
            tagged_by=tagged_by
        )
        
        # Auto-route based on severity and requirements
        best_hospital = await self._find_best_hospital(
            severity=severity,
            special_requirements=special_requirements,
            patient_location=location
        )
        
        if best_hospital:
            triage_tag.auto_routed_to = best_hospital["hospital_id"]
            logger.info(f"Patient {patient_id} auto-routed to {best_hospital['hospital_name']}")
        
        # Save to Firestore
        try:
            doc_ref = await self.firebase.db.collection("triage_tags").add(triage_tag.model_dump())
            triage_tag.id = doc_ref.id
        except Exception as e:
            logger.error(f"Error saving triage tag: {e}")
        
        return triage_tag
    
    async def _find_best_hospital(
        self,
        severity: TriageLevel,
        special_requirements: List[str],
        patient_location: Dict[str, float]
    ) -> Optional[Dict[str, Any]]:
        """
        Find the best hospital based on:
        1. Triage severity (Red -> Level 1 Trauma Centers)
        2. Special requirements (burn ward, specific blood type)
        3. Availability (bed count, resources)
        4. Distance (closest with available resources)
        """
        try:
            # Get all hospitals with current inventory
            hospitals_ref = self.firebase.db.collection("hospital_inventory")
            hospitals_snapshot = await hospitals_ref.get()
            
            hospitals = []
            for doc in hospitals_snapshot:
                hospital_data = doc.to_dict()
                hospital_data["id"] = doc.id
                hospitals.append(hospital_data)
            
            if not hospitals:
                logger.warning("No hospitals found in inventory")
                return None
            
            # Score each hospital
            scored_hospitals = []
            for hospital in hospitals:
                if not hospital.get("accepts_emergency", True):
                    continue
                
                score = self._score_hospital(
                    hospital=hospital,
                    severity=severity,
                    special_requirements=special_requirements,
                    patient_location=patient_location
                )
                
                if score > 0:
                    scored_hospitals.append({"hospital": hospital, "score": score})
            
            if not scored_hospitals:
                return None
            
            # Return hospital with highest score
            best = max(scored_hospitals, key=lambda x: x["score"])
            return {
                "hospital_id": best["hospital"]["id"],
                "hospital_name": best["hospital"].get("hospital_name", "Unknown"),
                "score": best["score"]
            }
            
        except Exception as e:
            logger.error(f"Error finding best hospital: {e}")
            return None
    
    def _score_hospital(
        self,
        hospital: Dict[str, Any],
        severity: TriageLevel,
        special_requirements: List[str],
        patient_location: Dict[str, float]
    ) -> float:
        """
        Score a hospital based on multiple factors
        Higher score = better match
        """
        score = 100.0  # Base score
        
        # 1. Severity-based routing
        if severity == TriageLevel.RED:
            # Critical patients need trauma centers with ICU
            if hospital.get("icu_beds", 0) > 0:
                score += 50
            else:
                score -= 30  # Heavy penalty for no ICU
        
        elif severity == TriageLevel.YELLOW:
            # Serious but stable - regular beds acceptable
            if hospital.get("available_beds", 0) > 0:
                score += 30
        
        elif severity == TriageLevel.GREEN:
            # Minor injuries - can go to local clinics
            score += 20
        
        # 2. Special requirements
        for requirement in special_requirements:
            if "burn" in requirement.lower():
                if hospital.get("burn_ward_beds", 0) > 0:
                    score += 40
                else:
                    return 0  # Burn patients MUST go to burn centers
            
            # Blood type requirements (e.g., "o_negative")
            if "_" in requirement:
                blood_type = requirement.replace("_", "").upper()
                blood_inventory = hospital.get("blood_inventory", {})
                if blood_type in blood_inventory and blood_inventory[blood_type] > 0:
                    score += 30
                else:
                    score -= 20  # Penalty for missing required blood type
        
        # 3. Bed availability
        available_beds = hospital.get("available_beds", 0)
        if available_beds > 10:
            score += 20
        elif available_beds > 5:
            score += 10
        elif available_beds == 0:
            score -= 40  # Heavy penalty for no beds
        
        # 4. Distance penalty (simplified - in production use actual routing)
        hospital_loc = hospital.get("location", {})
        if hospital_loc and patient_location:
            # Simple Euclidean distance (should use actual road distance)
            lat_diff = abs(hospital_loc.get("lat", 0) - patient_location.get("lat", 0))
            lng_diff = abs(hospital_loc.get("lng", 0) - patient_location.get("lng", 0))
            distance_score = (lat_diff + lng_diff) * 1000  # Rough km estimate
            
            # Penalize distance, but don't override critical needs
            score -= min(distance_score * 2, 30)
        
        return max(score, 0)  # Never negative
    
    async def get_triage_stats(self) -> Dict[str, Any]:
        """
        Get triage statistics for dashboard
        """
        try:
            triage_ref = self.firebase.db.collection("triage_tags")
            triage_snapshot = await triage_ref.get()
            
            stats = {
                "total": 0,
                "by_severity": {
                    "red": 0,
                    "yellow": 0,
                    "green": 0,
                    "black": 0
                },
                "auto_routed": 0,
                "pending_routing": 0
            }
            
            for doc in triage_snapshot:
                data = doc.to_dict()
                stats["total"] += 1
                
                severity = data.get("severity", "green")
                stats["by_severity"][severity] = stats["by_severity"].get(severity, 0) + 1
                
                if data.get("auto_routed_to"):
                    stats["auto_routed"] += 1
                else:
                    stats["pending_routing"] += 1
            
            return stats
            
        except Exception as e:
            logger.error(f"Error getting triage stats: {e}")
            return {"error": str(e)}
    
    def determine_triage_level(self, vital_signs: Dict[str, Any], injuries: List[str]) -> TriageLevel:
        """
        Auto-determine triage level based on vital signs and injuries
        Implements simplified START triage protocol
        """
        # Critical vital signs indicate RED
        if vital_signs:
            respiratory_rate = vital_signs.get("respiratory_rate", 15)
            pulse = vital_signs.get("pulse", 80)
            conscious = vital_signs.get("conscious", True)
            
            # Respiratory distress
            if respiratory_rate > 30 or respiratory_rate < 10:
                return TriageLevel.RED
            
            # Severe shock
            if pulse > 120 or pulse < 50:
                return TriageLevel.RED
            
            # Unconscious or unresponsive
            if not conscious:
                return TriageLevel.RED
        
        # Injury-based classification
        critical_injuries = ["head_trauma", "internal_bleeding", "severe_burn", "chest_wound", "spinal_injury"]
        moderate_injuries = ["fracture", "moderate_burn", "deep_laceration"]
        
        for injury in injuries:
            injury_lower = injury.lower()
            if any(crit in injury_lower for crit in critical_injuries):
                return TriageLevel.RED
        
        for injury in injuries:
            injury_lower = injury.lower()
            if any(mod in injury_lower for mod in moderate_injuries):
                return TriageLevel.YELLOW
        
        # Default to GREEN for minor injuries
        return TriageLevel.GREEN
