"""
hospital_inventory_service.py - Live Hospital Resource & Blood Bank Tracking
Real-time tracking of hospital beds, blood inventory, and equipment
"""
import logging
from typing import List, Dict, Any, Optional
from models import HospitalInventory
from firebase_service import FirebaseService
from datetime import datetime

logger = logging.getLogger(__name__)


class HospitalInventoryService:
    """
    Manages real-time hospital resource inventory
    """
    
    def __init__(self):
        self.firebase = FirebaseService()
    
    async def update_hospital_inventory(
        self,
        hospital_id: str,
        updates: Dict[str, Any]
    ) -> HospitalInventory:
        """
        Update hospital inventory (called by hospital staff or automated systems)
        """
        try:
            hospital_ref = self.firebase.db.collection("hospital_inventory").document(hospital_id)
            
            # Add timestamp
            updates["last_updated"] = datetime.utcnow().isoformat()
            
            # Update in Firestore
            await hospital_ref.set(updates, merge=True)
            
            # Fetch updated data
            doc = await hospital_ref.get()
            if doc.exists:
                data = doc.to_dict()
                data["hospital_id"] = hospital_id
                return HospitalInventory(**data)
            else:
                raise ValueError(f"Hospital {hospital_id} not found")
                
        except Exception as e:
            logger.error(f"Error updating hospital inventory: {e}")
            raise
    
    async def get_hospital_inventory(self, hospital_id: str) -> Optional[HospitalInventory]:
        """
        Get current inventory for a specific hospital
        """
        try:
            doc = await self.firebase.db.collection("hospital_inventory").document(hospital_id).get()
            if doc.exists:
                data = doc.to_dict()
                data["hospital_id"] = hospital_id
                return HospitalInventory(**data)
            return None
        except Exception as e:
            logger.error(f"Error fetching hospital inventory: {e}")
            return None
    
    async def get_all_hospitals_inventory(self) -> List[HospitalInventory]:
        """
        Get inventory for all hospitals
        """
        try:
            snapshot = await self.firebase.db.collection("hospital_inventory").get()
            hospitals = []
            
            for doc in snapshot:
                data = doc.to_dict()
                data["hospital_id"] = doc.id
                hospitals.append(HospitalInventory(**data))
            
            return hospitals
        except Exception as e:
            logger.error(f"Error fetching all hospital inventories: {e}")
            return []
    
    async def find_hospitals_with_resource(
        self,
        resource_type: str,
        minimum_amount: int = 1,
        location: Optional[Dict[str, float]] = None,
        max_distance_km: Optional[float] = None
    ) -> List[Dict[str, Any]]:
        """
        Find hospitals that have a specific resource available
        
        resource_type examples:
        - "icu_beds"
        - "burn_ward_beds"
        - "blood:O-"
        - "ventilators"
        """
        hospitals = await self.get_all_hospitals_inventory()
        matching_hospitals = []
        
        for hospital in hospitals:
            has_resource = False
            available_amount = 0
            
            # Check bed types
            if resource_type == "icu_beds":
                available_amount = hospital.icu_beds or 0
                has_resource = available_amount >= minimum_amount
            
            elif resource_type == "burn_ward_beds":
                available_amount = hospital.burn_ward_beds or 0
                has_resource = available_amount >= minimum_amount
            
            elif resource_type == "available_beds":
                available_amount = hospital.available_beds or 0
                has_resource = available_amount >= minimum_amount
            
            elif resource_type == "ventilators":
                available_amount = hospital.ventilators_available or 0
                has_resource = available_amount >= minimum_amount
            
            # Check blood types
            elif resource_type.startswith("blood:"):
                blood_type = resource_type.split(":")[1]
                blood_inventory = hospital.blood_inventory or {}
                available_amount = blood_inventory.get(blood_type, 0)
                has_resource = available_amount >= minimum_amount
            
            if has_resource and hospital.accepts_emergency:
                hospital_info = {
                    "hospital_id": hospital.hospital_id,
                    "hospital_name": hospital.hospital_name,
                    "location": hospital.location,
                    "available_amount": available_amount,
                    "last_updated": hospital.last_updated
                }
                
                # Calculate distance if location provided
                if location and hospital.location:
                    distance = self._calculate_distance(
                        location["lat"], location["lng"],
                        hospital.location.get("lat", 0), hospital.location.get("lng", 0)
                    )
                    hospital_info["distance_km"] = distance
                    
                    # Filter by max distance if specified
                    if max_distance_km and distance > max_distance_km:
                        continue
                
                matching_hospitals.append(hospital_info)
        
        # Sort by distance if location was provided
        if location:
            matching_hospitals.sort(key=lambda x: x.get("distance_km", float("inf")))
        
        return matching_hospitals
    
    def _calculate_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """
        Calculate distance between two coordinates in km (Haversine formula)
        """
        from math import radians, cos, sin, asin, sqrt
        
        # Convert to radians
        lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])
        
        # Haversine formula
        dlon = lon2 - lon1
        dlat = lat2 - lat1
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * asin(sqrt(a))
        r = 6371  # Radius of earth in kilometers
        
        return c * r
    
    async def allocate_resource(
        self,
        hospital_id: str,
        resource_type: str,
        amount: int
    ) -> bool:
        """
        Allocate/reserve a resource (decrements inventory)
        Used when an ambulance is dispatched to a hospital
        """
        try:
            hospital = await self.get_hospital_inventory(hospital_id)
            if not hospital:
                return False
            
            updates = {}
            
            # Allocate beds
            if resource_type == "available_beds":
                if hospital.available_beds >= amount:
                    updates["available_beds"] = hospital.available_beds - amount
                else:
                    logger.warning(f"Not enough beds at {hospital_id}")
                    return False
            
            elif resource_type == "icu_beds":
                if hospital.icu_beds >= amount:
                    updates["icu_beds"] = hospital.icu_beds - amount
                else:
                    return False
            
            elif resource_type == "burn_ward_beds":
                if hospital.burn_ward_beds >= amount:
                    updates["burn_ward_beds"] = hospital.burn_ward_beds - amount
                else:
                    return False
            
            # Allocate blood
            elif resource_type.startswith("blood:"):
                blood_type = resource_type.split(":")[1]
                blood_inventory = hospital.blood_inventory or {}
                
                if blood_inventory.get(blood_type, 0) >= amount:
                    blood_inventory[blood_type] -= amount
                    updates["blood_inventory"] = blood_inventory
                else:
                    return False
            
            # Apply updates
            if updates:
                await self.update_hospital_inventory(hospital_id, updates)
                logger.info(f"Allocated {amount} {resource_type} at {hospital_id}")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error allocating resource: {e}")
            return False
    
    async def get_inventory_summary(self) -> Dict[str, Any]:
        """
        Get system-wide inventory summary
        """
        try:
            hospitals = await self.get_all_hospitals_inventory()
            
            summary = {
                "total_hospitals": len(hospitals),
                "total_beds": 0,
                "available_beds": 0,
                "icu_beds": 0,
                "burn_ward_beds": 0,
                "blood_inventory": {},
                "hospitals_at_capacity": 0,
                "hospitals_accepting_emergency": 0
            }
            
            for hospital in hospitals:
                summary["total_beds"] += hospital.total_beds
                summary["available_beds"] += hospital.available_beds
                summary["icu_beds"] += hospital.icu_beds
                summary["burn_ward_beds"] += hospital.burn_ward_beds
                
                # Aggregate blood inventory
                for blood_type, units in (hospital.blood_inventory or {}).items():
                    summary["blood_inventory"][blood_type] = summary["blood_inventory"].get(blood_type, 0) + units
                
                if hospital.available_beds == 0:
                    summary["hospitals_at_capacity"] += 1
                
                if hospital.accepts_emergency:
                    summary["hospitals_accepting_emergency"] += 1
            
            summary["capacity_percentage"] = (
                (summary["available_beds"] / summary["total_beds"] * 100) 
                if summary["total_beds"] > 0 else 0
            )
            
            return summary
            
        except Exception as e:
            logger.error(f"Error getting inventory summary: {e}")
            return {"error": str(e)}
