"""
route_obstacles_service.py - Crowdsourced Route Obstacles
Allows volunteers/drivers to mark road blockages with polygons
Integrates with Google Maps routing to avoid blocked areas
"""
import logging
from typing import List, Dict, Any, Optional
from models import RouteObstacle
from firebase_service import FirebaseService
from datetime import datetime, timedelta
import os

logger = logging.getLogger(__name__)


class RouteObstaclesService:
    """
    Manages crowdsourced route obstacles and routing around them
    """
    
    def __init__(self):
        self.firebase = FirebaseService()
        self.google_maps_api_key = os.getenv("GOOGLE_MAPS_API_KEY", "")
    
    async def report_obstacle(
        self,
        obstacle_type: str,
        polygon: List[List[float]],
        description: str,
        reported_by: str,
        severity: str = "medium",
        duration_hours: Optional[int] = None
    ) -> RouteObstacle:
        """
        Report a new route obstacle (road blockage, flood, debris, etc.)
        
        Args:
            obstacle_type: "road_blocked", "flood", "debris", "fire", "damage"
            polygon: List of [lat, lng] coordinates defining the blocked area
            description: Human-readable description
            reported_by: User/volunteer ID
            severity: "low", "medium", "high"
            duration_hours: How long until obstacle clears (optional)
        """
        try:
            # Calculate expiration time
            expires_at = None
            if duration_hours:
                expiry_time = datetime.utcnow() + timedelta(hours=duration_hours)
                expires_at = expiry_time.isoformat()
            
            obstacle = RouteObstacle(
                type=obstacle_type,
                polygon=polygon,
                description=description,
                reported_by=reported_by,
                severity=severity,
                verified=False,
                expires_at=expires_at
            )
            
            # Save to Firestore
            doc_ref = await self.firebase.db.collection("route_obstacles").add(obstacle.model_dump())
            obstacle.id = doc_ref.id
            
            logger.info(f"Route obstacle reported: {obstacle_type} by {reported_by}")
            
            # Auto-verify if reported by trusted sources (e.g., verified volunteers)
            # In production, implement verification logic
            
            return obstacle
            
        except Exception as e:
            logger.error(f"Error reporting obstacle: {e}")
            raise
    
    async def get_active_obstacles(
        self,
        bounds: Optional[Dict[str, Any]] = None,
        min_severity: str = "low"
    ) -> List[RouteObstacle]:
        """
        Get active (non-expired) obstacles, optionally filtered by map bounds
        
        Args:
            bounds: {"north": lat, "south": lat, "east": lng, "west": lng}
            min_severity: Minimum severity to include
        """
        try:
            # Query Firestore for obstacles
            query = self.firebase.db.collection("route_obstacles")
            
            # Filter by expiration
            now = datetime.utcnow().isoformat()
            # In production, use Firestore query: .where("expires_at", ">", now)
            # For now, we'll filter in memory
            
            snapshot = await query.get()
            
            obstacles = []
            severity_order = {"low": 1, "medium": 2, "high": 3}
            min_sev_value = severity_order.get(min_severity, 1)
            
            for doc in snapshot:
                data = doc.to_dict()
                data["id"] = doc.id
                
                # Filter expired obstacles
                if data.get("expires_at"):
                    if data["expires_at"] < now:
                        continue
                
                # Filter by severity
                obstacle_severity = severity_order.get(data.get("severity", "low"), 1)
                if obstacle_severity < min_sev_value:
                    continue
                
                # Filter by bounds if provided
                if bounds:
                    if not self._is_obstacle_in_bounds(data.get("polygon", []), bounds):
                        continue
                
                obstacles.append(RouteObstacle(**data))
            
            return obstacles
            
        except Exception as e:
            logger.error(f"Error fetching obstacles: {e}")
            return []
    
    def _is_obstacle_in_bounds(self, polygon: List[List[float]], bounds: Dict[str, Any]) -> bool:
        """
        Check if any point of the obstacle polygon is within map bounds
        """
        if not polygon:
            return False
        
        for point in polygon:
            lat, lng = point[0], point[1]
            if (bounds["south"] <= lat <= bounds["north"] and 
                bounds["west"] <= lng <= bounds["east"]):
                return True
        
        return False
    
    async def verify_obstacle(self, obstacle_id: str, verified_by: str) -> bool:
        """
        Verify an obstacle (increases trust/priority)
        Multiple verifications from different users increases confidence
        """
        try:
            doc_ref = self.firebase.db.collection("route_obstacles").document(obstacle_id)
            
            await doc_ref.update({
                "verified": True,
                "verified_by": verified_by,
                "verified_at": datetime.utcnow().isoformat()
            })
            
            logger.info(f"Obstacle {obstacle_id} verified by {verified_by}")
            return True
            
        except Exception as e:
            logger.error(f"Error verifying obstacle: {e}")
            return False
    
    async def remove_obstacle(self, obstacle_id: str, removed_by: str) -> bool:
        """
        Mark an obstacle as cleared/removed
        """
        try:
            doc_ref = self.firebase.db.collection("route_obstacles").document(obstacle_id)
            
            await doc_ref.update({
                "cleared": True,
                "cleared_by": removed_by,
                "cleared_at": datetime.utcnow().isoformat()
            })
            
            logger.info(f"Obstacle {obstacle_id} marked as cleared by {removed_by}")
            return True
            
        except Exception as e:
            logger.error(f"Error removing obstacle: {e}")
            return False
    
    async def get_optimized_route(
        self,
        origin: Dict[str, float],
        destination: Dict[str, float],
        avoid_obstacles: bool = True
    ) -> Dict[str, Any]:
        """
        Get optimized route avoiding active obstacles
        Uses Google Maps Directions API with custom waypoints to avoid blockages
        
        Returns:
            {
                "route": [...],  # Polyline or list of coordinates
                "distance_km": float,
                "duration_minutes": float,
                "obstacles_avoided": int,
                "warnings": [...]
            }
        """
        try:
            route_data = {
                "route": [],
                "distance_km": 0,
                "duration_minutes": 0,
                "obstacles_avoided": 0,
                "warnings": []
            }
            
            if not avoid_obstacles:
                # Just get direct route from Google Maps
                return await self._get_direct_route(origin, destination)
            
            # Get active obstacles in the potential route area
            # Define bounds as rectangle around origin and destination
            bounds = {
                "north": max(origin["lat"], destination["lat"]) + 0.1,
                "south": min(origin["lat"], destination["lat"]) - 0.1,
                "east": max(origin["lng"], destination["lng"]) + 0.1,
                "west": min(origin["lng"], destination["lng"]) - 0.1
            }
            
            obstacles = await self.get_active_obstacles(bounds=bounds, min_severity="medium")
            
            if not obstacles:
                # No obstacles, return direct route
                return await self._get_direct_route(origin, destination)
            
            # Generate waypoints to avoid obstacle polygons
            # This is a simplified implementation
            # In production, use more sophisticated routing algorithms
            
            avoidance_waypoints = self._generate_avoidance_waypoints(
                origin=origin,
                destination=destination,
                obstacles=obstacles
            )
            
            # Get route with avoidance waypoints
            route = await self._get_route_with_waypoints(
                origin=origin,
                destination=destination,
                waypoints=avoidance_waypoints
            )
            
            route_data.update(route)
            route_data["obstacles_avoided"] = len(obstacles)
            route_data["warnings"].append(f"Route adjusted to avoid {len(obstacles)} obstacle(s)")
            
            return route_data
            
        except Exception as e:
            logger.error(f"Error getting optimized route: {e}")
            return {
                "error": str(e),
                "obstacles_avoided": 0
            }
    
    async def _get_direct_route(self, origin: Dict[str, float], destination: Dict[str, float]) -> Dict[str, Any]:
        """
        Get direct route from Google Maps (no obstacle avoidance)
        """
        # In production, call Google Maps Directions API
        # For now, return simplified response
        
        import math
        
        # Calculate straight-line distance
        lat_diff = destination["lat"] - origin["lat"]
        lng_diff = destination["lng"] - origin["lng"]
        distance_km = math.sqrt(lat_diff**2 + lng_diff**2) * 111  # Rough conversion to km
        
        # Estimate duration (assume 40 km/h average in disaster areas)
        duration_minutes = (distance_km / 40) * 60
        
        return {
            "route": [origin, destination],
            "distance_km": round(distance_km, 2),
            "duration_minutes": round(duration_minutes, 1),
            "obstacles_avoided": 0,
            "warnings": []
        }
    
    def _generate_avoidance_waypoints(
        self,
        origin: Dict[str, float],
        destination: Dict[str, float],
        obstacles: List[RouteObstacle]
    ) -> List[Dict[str, float]]:
        """
        Generate waypoints to route around obstacle polygons
        Simplified implementation
        """
        waypoints = []
        
        # For each high-severity obstacle, add waypoint to go around it
        for obstacle in obstacles:
            if obstacle.severity == "high" and obstacle.polygon:
                # Calculate centroid of obstacle polygon
                if len(obstacle.polygon) > 0:
                    avg_lat = sum(p[0] for p in obstacle.polygon) / len(obstacle.polygon)
                    avg_lng = sum(p[1] for p in obstacle.polygon) / len(obstacle.polygon)
                    
                    # Add waypoint offset from obstacle centroid
                    # This is very simplified - in production, use proper routing
                    offset = 0.02  # ~2km offset
                    waypoint = {
                        "lat": avg_lat + offset,
                        "lng": avg_lng + offset
                    }
                    waypoints.append(waypoint)
        
        return waypoints
    
    async def _get_route_with_waypoints(
        self,
        origin: Dict[str, float],
        destination: Dict[str, float],
        waypoints: List[Dict[str, float]]
    ) -> Dict[str, Any]:
        """
        Get route through waypoints (calls Google Maps API)
        """
        # In production, call Google Maps Directions API with waypoints
        # For now, return approximation
        
        route_points = [origin] + waypoints + [destination]
        
        import math
        total_distance = 0
        for i in range(len(route_points) - 1):
            lat_diff = route_points[i+1]["lat"] - route_points[i]["lat"]
            lng_diff = route_points[i+1]["lng"] - route_points[i]["lng"]
            segment_distance = math.sqrt(lat_diff**2 + lng_diff**2) * 111
            total_distance += segment_distance
        
        duration_minutes = (total_distance / 40) * 60  # 40 km/h average
        
        return {
            "route": route_points,
            "distance_km": round(total_distance, 2),
            "duration_minutes": round(duration_minutes, 1)
        }
