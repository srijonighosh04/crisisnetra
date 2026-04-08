# CrisisNetra 🚨

*Built by Team **Storm7** for our Google hackathon.*

## 👥 Meet the Team
- Aniruddh Viswarajan
- Srijoni Ghosh
- Sunetra Pandey
- Ayan Ali

## 💡 What is CrisisNetra?
When responding to major crises—whether it's natural disasters like devastating floods and unpredictable earthquakes, or coordinating rapid relief for large-scale multi-vehicle or industrial accidents—the biggest cause of preventable casualties isn't always the event itself; it's the breakdown of coordination and communication. We realized that emergency responders, relief organizations, and hospitals often operate in silos. They struggle with outdated information, rely on word-of-mouth for safe routes, and suffer from severe bottlenecks where some critical-care facilities get dangerously overcrowded while others remain under-utilized. 

To solve this, we built **CrisisNetra**: an intelligent, centralized operating system for disaster management. By combining AI with real-time geolocation mapping, CrisisNetra cuts through the chaos to make disaster relief proactive instead of reactive. 

With CrisisNetra, a central command center can instantly visualize the entire crisis zone on a live interactive map. Our AI triage system analyzes incoming incident reports, automatically determines the severity, and optimally routes patients to the nearest hospital with available capacity. Ground volunteers receive real-time updates on hazardous road blockages, while automated weather alerts keep teams ahead of incoming danger. It’s not just a dashboard; it’s a lifeline designed to ensure that help reaches the right people, via the safest route, at the exact moment they need it.

## 🌟 What Makes Us Unique?
While most disaster management apps are simply static forums or basic emergency contact lists, CrisisNetra actively **solves logistical bottlenecks**:
1. **AI-Driven Medical Triage:** Instead of manually figuring out where to send accident victims or disaster survivors, our Gemini AI instantly processes severity and reserves a spot at the most suitable hospital *that actually has capacity*.
2. **Dynamic Live Mapping:** We combine volunteer live-locations, real-time hospital capacities, and actively drawn road blockages into a single view. If a rescue route gets blocked by debris or traffic, the system knows.
3. **End-to-End Coordination:** We don’t just connect victims to helpers; we coordinate the *entire* ecosystem—from the volunteer on the ground to the emergency room doctor preparing the ICU bed.

## 🚀 Key Features
- **Live Map:** We integrated Google Maps to track hospitals, volunteers, and road obstacles in real-time.
- **AI Triage System:** Uses Gemini AI to intelligently classify the severity of patients and direct them to the right facilities so hospitals don't get overcrowded.
- **Volunteer Registry:** Easily onboard and manage people who want to help on the ground.
- **Live Weather & Predictions:** Grabs data from the OpenWeather API so teams know exactly what conditions they're walking into.
- **Hospital Capacity Alerts:** Automated alerts when a local hospital is nearing full capacity.

## 🛠️ How we built it
We split the work into a solid full-stack architecture:
- **Frontend:** Built with React 18 for a smooth, fast UI. We made it a Progressive Web App (PWA) so it works great on mobile (which is crucial for field workers).
- **Backend:** Python + FastAPI. It's super fast and handles all the AI logic and data crunching.
- **Database:** Google Cloud Firestore (NoSQL) for real-time data syncing.
- **APIs:** Google Maps (for tracking), Gemini (for triage), OpenWeather (for current conditions).
- **Deployment:** The backend is containerized and running on Google Cloud Run, while the frontend is hosted on Firebase.

## 💻 Running it locally

If you want to spin this up on your own machine:

1. Clone the repo and navigate to the folder.
2. Hit up the `frontend` folder, run `npm install`, and then `npm start`.
3. Open a new terminal, go to the `backend` folder, install the python dependencies with `pip install -r requirements.txt`, and run `python main.py`.

*(Note: You'll need to create your own `.env` files based on the `.env.example` templates provided since we don't commit our API keys!)*

## 🔗 Live Links
- **Web App:** [crisisnetra-2026.web.app](https://crisisnetra-2026.web.app)
- **API Endpoint:** [crisisnetra-backend.run.app](https://crisisnetra-backend-521786366307.asia-south1.run.app)

Thanks for checking out our project! We had an awesome time building it.
