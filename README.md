# 🚨 CrisisNetra — AI-Powered Disaster Relief Coordination Platform

<p align="center">
  <strong>Real-time crisis management with AI-driven triage, route optimization, and volunteer coordination</strong>
</p>

---

## ✨ Features

| Module | Description |
|--------|-------------|
| **Dashboard** | Real-time crisis overview with live statistics and alerts |
| **Hospital Alert System** | Monitors hospital capacity and sends automatic alerts |
| **AI Triage System** | AI-powered patient classification using severity analysis |
| **Route Obstacles** | Tracks road blockages and suggests alternate routes |
| **Weather & Prediction** | Live weather data with disaster prediction models |
| **Live Map** | Google Maps integration for real-time facility tracking |
| **Volunteers Registry** | Manage and coordinate relief volunteers |
| **Task Management** | Assign and track relief operation tasks |

## 🏗️ Tech Stack

### Frontend
- **React 18** with functional components & hooks
- **Google Maps JavaScript API** for live mapping
- **Firebase Auth** for authentication
- **Progressive Web App (PWA)** support

### Backend
- **FastAPI** (Python) — high-performance async API
- **Google Cloud Firestore** — real-time NoSQL database
- **Google Gemini AI** — AI-powered triage analysis
- **OpenWeather API** — live weather & forecasting

### Deployment
- **Frontend**: Firebase Hosting
- **Backend**: Google Cloud Run
- **Database**: Cloud Firestore

---

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm
- Python 3.9+
- Google Cloud account with Firebase project

### 1. Clone the repository
```bash
git clone https://github.com/srijonighosh04/crisisnetra.git
cd CrisisNetra
```

### 2. Backend Setup
```bash
cd backend
pip install -r requirements.txt

# Copy and fill in your credentials
cp .env.example .env
# Edit .env with your actual API keys

# Place your Firebase service account JSON as:
# backend/firebase-credentials.json

python main.py
```
Backend runs on **http://localhost:8000**

### 3. Frontend Setup
```bash
cd frontend
npm install

# Copy and fill in your credentials
cp .env.example .env
# Edit .env with your actual API keys

npm start
```
Frontend runs on **http://localhost:3000**

---

## 🔐 Environment Variables

### Frontend (`frontend/.env`)
| Variable | Description |
|----------|-------------|
| `REACT_APP_FIREBASE_API_KEY` | Firebase Web API key |
| `REACT_APP_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `REACT_APP_FIREBASE_PROJECT_ID` | Firebase project ID |
| `REACT_APP_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `REACT_APP_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID |
| `REACT_APP_FIREBASE_APP_ID` | Firebase app ID |
| `REACT_APP_GOOGLE_MAPS_API_KEY` | Google Maps JavaScript API key |
| `REACT_APP_API_URL` | Backend API URL (default: `http://localhost:8000`) |

### Backend (`backend/.env`)
| Variable | Description |
|----------|-------------|
| `OPENWEATHER_API_KEY` | OpenWeatherMap API key |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to Firebase service account JSON |
| `PORT` | Server port (default: `8000`) |
| `ALLOWED_ORIGINS` | CORS allowed origins |

> ⚠️ **Never commit `.env` files or `firebase-credentials.json` to version control!**

---

## 📁 Project Structure

```
CrisisNetra/
├── backend/
│   ├── main.py              # FastAPI application entry point
│   ├── firebase_service.py  # Firestore database operations
│   ├── requirements.txt     # Python dependencies
│   ├── .env.example         # Backend env template
│   └── seed_*.py            # Database seeding scripts
├── frontend/
│   ├── public/              # Static assets & index.html
│   ├── src/
│   │   ├── pages/           # React page components
│   │   ├── App.js           # Main application with routing
│   │   ├── theme.js         # Dark/light theme provider
│   │   └── index.js         # React entry point
│   ├── .env.example         # Frontend env template
│   └── package.json         # Node.js dependencies
├── .gitignore
├── LICENSE
└── README.md
```

---

## 🌐 Live Demo

- **Frontend**: [https://crisisnetra-2026.web.app](https://crisisnetra-2026.web.app)
- **Backend API**: [https://crisisnetra-backend-7yyolfo6jq-el.a.run.app](https://crisisnetra-backend-7yyolfo6jq-el.a.run.app)

---

## 👥 Team

- **Aniruddh** — Full-stack Development & Cloud Deployment
- **Srijoni** — UI/UX & Frontend
- **Sunetra** — Backend & AI Integration
- **Ayan** — Data & Testing

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
