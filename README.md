# CrisisNetra 🚨

*Built by Team **Storm7** for our latest hackathon.*

## 👥 Meet the Team
- Aniruddh Viswarajan
- Srijoni Ghosh
- Sunetra Pandey
- Ayan Ali

## 💡 What is CrisisNetra?
When disasters strike, coordination is everything. We realized that during floods or storms, relief workers struggle with outdated info, blocked roads, and overwhelmed hospitals. 

So we built **CrisisNetra**: a central platform that uses AI and live mapping to make disaster relief actually efficient. It helps direct patients based on severity, tracks road blockages, and manages relief volunteers all in one place.

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
