"""
seed_hospitals.py - Seed Firestore with Mumbai hospital data
Run once after setting up Firebase:
    python seed_hospitals.py
"""
import os
import logging
from firebase_config import initialize_firebase
from firebase_admin import firestore

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

HOSPITALS = [
    {
        "hospital_id": "kem_mumbai",
        "hospital_name": "KEM Hospital",
        "address": "Acharya Donde Marg, Parel, Mumbai - 400012",
        "location": {"lat": 19.0003, "lng": 72.8419},
        "total_beds": 1800,
        "available_beds": 120,
        "icu_beds": 40,
        "burn_ward_beds": 15,
        "ventilators_available": 30,
        "ambulances_available": 8,
        "accepts_emergency": True,
        "trauma_level": 1,
        "blood_inventory": {
            "O-": 25, "O+": 60, "A-": 18, "A+": 45,
            "B-": 12, "B+": 38, "AB-": 8, "AB+": 20
        },
        "contact_phone": "+91-22-24136051",
        "contact_email": "emergency@kemhospital.org"
    },
    {
        "hospital_id": "hinduja_mumbai",
        "hospital_name": "P.D. Hinduja Hospital",
        "address": "Veer Savarkar Marg, Mahim, Mumbai - 400016",
        "location": {"lat": 19.0428, "lng": 72.8397},
        "total_beds": 350,
        "available_beds": 25,
        "icu_beds": 12,
        "burn_ward_beds": 5,
        "ventilators_available": 10,
        "ambulances_available": 4,
        "accepts_emergency": True,
        "trauma_level": 1,
        "blood_inventory": {
            "O-": 10, "O+": 28, "A-": 8, "A+": 22,
            "B-": 6, "B+": 18, "AB-": 3, "AB+": 9
        },
        "contact_phone": "+91-22-24452222",
        "contact_email": "emergency@hindujahospital.com"
    },
    {
        "hospital_id": "wockhardt_mumbai",
        "hospital_name": "Wockhardt Hospital Mumbai Central",
        "address": "1877, Dr Anandrao Nair Marg, Mumbai Central, Mumbai - 400011",
        "location": {"lat": 18.9726, "lng": 72.8197},
        "total_beds": 250,
        "available_beds": 18,
        "icu_beds": 8,
        "burn_ward_beds": 3,
        "ventilators_available": 7,
        "ambulances_available": 3,
        "accepts_emergency": True,
        "trauma_level": 2,
        "blood_inventory": {
            "O-": 8, "O+": 20, "A-": 5, "A+": 16,
            "B-": 4, "B+": 14, "AB-": 2, "AB+": 6
        },
        "contact_phone": "+91-22-61784444",
        "contact_email": "emergency@wockhardt.com"
    },
    {
        "hospital_id": "lilavati_mumbai",
        "hospital_name": "Lilavati Hospital",
        "address": "A-791, Bandra Reclamation, Bandra West, Mumbai - 400050",
        "location": {"lat": 19.0543, "lng": 72.8236},
        "total_beds": 323,
        "available_beds": 30,
        "icu_beds": 15,
        "burn_ward_beds": 6,
        "ventilators_available": 12,
        "ambulances_available": 5,
        "accepts_emergency": True,
        "trauma_level": 1,
        "blood_inventory": {
            "O-": 12, "O+": 32, "A-": 9, "A+": 25,
            "B-": 7, "B+": 21, "AB-": 4, "AB+": 10
        },
        "contact_phone": "+91-22-26751000",
        "contact_email": "emergency@lilavatihospital.com"
    },
    {
        "hospital_id": "bmc_sion",
        "hospital_name": "Lokmanya Tilak Municipal General Hospital (Sion)",
        "address": "Dr. Babasaheb Ambedkar Road, Sion, Mumbai - 400022",
        "location": {"lat": 19.0413, "lng": 72.8649},
        "total_beds": 1500,
        "available_beds": 90,
        "icu_beds": 30,
        "burn_ward_beds": 12,
        "ventilators_available": 25,
        "ambulances_available": 6,
        "accepts_emergency": True,
        "trauma_level": 1,
        "blood_inventory": {
            "O-": 20, "O+": 50, "A-": 15, "A+": 40,
            "B-": 10, "B+": 35, "AB-": 6, "AB+": 15
        },
        "contact_phone": "+91-22-24076381",
        "contact_email": "emergency@sionhospital.org"
    },
    {
        "hospital_id": "kokilaben_andheri",
        "hospital_name": "Kokilaben Dhirubhai Ambani Hospital",
        "address": "Rao Saheb Achutrao Patwardhan Marg, Four Bungalows, Andheri West, Mumbai - 400053",
        "location": {"lat": 19.1255, "lng": 72.8368},
        "total_beds": 750,
        "available_beds": 55,
        "icu_beds": 22,
        "burn_ward_beds": 8,
        "ventilators_available": 18,
        "ambulances_available": 7,
        "accepts_emergency": True,
        "trauma_level": 1,
        "blood_inventory": {
            "O-": 18, "O+": 45, "A-": 13, "A+": 35,
            "B-": 9, "B+": 30, "AB-": 5, "AB+": 13
        },
        "contact_phone": "+91-22-42696969",
        "contact_email": "emergency@kokilabenhospital.com"
    },
    {
        "hospital_id": "nair_mumbai",
        "hospital_name": "B.Y.L. Nair Charitable Hospital",
        "address": "Dr. AL Nair Road, Mumbai Central, Mumbai - 400008",
        "location": {"lat": 18.9688, "lng": 72.8215},
        "total_beds": 1200,
        "available_beds": 75,
        "icu_beds": 25,
        "burn_ward_beds": 10,
        "ventilators_available": 20,
        "ambulances_available": 5,
        "accepts_emergency": True,
        "trauma_level": 1,
        "blood_inventory": {
            "O-": 22, "O+": 55, "A-": 16, "A+": 42,
            "B-": 11, "B+": 36, "AB-": 7, "AB+": 17
        },
        "contact_phone": "+91-22-23027600",
        "contact_email": "emergency@nairhospital.org"
    },
    {
        "hospital_id": "holy_family_bandra",
        "hospital_name": "Holy Family Hospital",
        "address": "St. Andrew's Road, Bandra West, Mumbai - 400050",
        "location": {"lat": 19.0607, "lng": 72.8297},
        "total_beds": 300,
        "available_beds": 20,
        "icu_beds": 8,
        "burn_ward_beds": 3,
        "ventilators_available": 6,
        "ambulances_available": 3,
        "accepts_emergency": True,
        "trauma_level": 2,
        "blood_inventory": {
            "O-": 7, "O+": 18, "A-": 5, "A+": 14,
            "B-": 4, "B+": 12, "AB-": 2, "AB+": 5
        },
        "contact_phone": "+91-22-26510414",
        "contact_email": "emergency@holyfamilymumbai.com"
    }
]

def seed():
    initialize_firebase()
    db = firestore.client()
    col = db.collection("hospital_inventory")
    for h in HOSPITALS:
        col.document(h["hospital_id"]).set(h)
        logger.info(f"✅ Seeded: {h['hospital_name']}")
    logger.info(f"\n🏥 Seeded {len(HOSPITALS)} Mumbai hospitals successfully.")

if __name__ == "__main__":
    seed()
