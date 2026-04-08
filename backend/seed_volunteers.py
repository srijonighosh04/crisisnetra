import asyncio
from firebase_config import initialize_firebase
from firebase_service import FirebaseService
from models import Volunteer

async def seed_volunteers():
    print("Initializing Firebase...")
    initialize_firebase()
    
    firebase = FirebaseService()
    
    sample_volunteers = [
        {
            "name": "Aniruddh",
            "phone": "6785674798",
            "skills": ["General"],
            "status": "active"
        },
        {
            "name": "Srijoni",
            "phone": "9856748765",
            "skills": ["General"],
            "status": "active"
        },
        {
            "name": "Sunetra",
            "phone": "768567846",
            "skills": ["General"],
            "status": "active"
        },
        {
            "name": "Ayan",
            "phone": "986758752",
            "skills": ["General"],
            "status": "active"
        }
    ]
    
    print(f"Adding {len(sample_volunteers)} volunteers...")
    
    for v_data in sample_volunteers:
        try:
            volunteer = Volunteer(**v_data)
            await firebase.add_volunteer(volunteer.model_dump())
            print(f"Added {v_data['name']}")
        except Exception as e:
            print(f"Failed to add {v_data['name']}: {e}")
            
    print("Done seeding volunteers!")

if __name__ == "__main__":
    asyncio.run(seed_volunteers())
