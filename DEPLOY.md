# 🚀 CrisisNetra — Deployment Guide

Follow these steps in order. Total time: ~30 minutes.

---

## Step 1 — Firebase Project Setup

1. Go to [https://console.firebase.google.com](https://console.firebase.google.com)
2. Click **Add project** → name it (e.g. `crisisnetra`)
3. Enable **Google Analytics** (optional)
4. In the project, go to **Build → Authentication** → **Get Started**
   - Enable **Email/Password** provider
   - Enable **Google** provider
5. Go to **Build → Firestore Database** → **Create database** → choose **Production mode** → select region `asia-south1`
6. Go to **Project Settings → General → Your apps** → click **</>** (Web)
   - Register the app, copy the config values into `frontend/.env.local`

---

## Step 2 — Get API Keys

### Google Maps API Key
1. Go to [https://console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials)
2. Click **Create Credentials → API key**
3. Restrict it to these APIs: `Maps JavaScript API`, `Directions API`, `Distance Matrix API`, `Drawing Library`, `Geometry Library`
4. Copy the key into both `frontend/.env.local` and `backend/.env`

### OpenWeather API Key
1. Go to [https://openweathermap.org/api](https://openweathermap.org/api)
2. Sign up (free tier is sufficient)
3. Copy your API key into `backend/.env`

### Firebase Service Account (for backend)
1. Firebase Console → **Project Settings → Service Accounts**
2. Click **Generate new private key** → download the JSON file
3. Save it as `backend/firebase-credentials.json`
4. Set `FIREBASE_CREDENTIALS_PATH=./firebase-credentials.json` in `backend/.env`

---

## Step 3 — Local Setup & Test

### Backend
```bash
cd backend
cp .env.example .env
# Fill in your values in .env

pip install -r requirements.txt

# Seed hospital data (run once)
python seed_hospitals.py

# Start backend
python main.py
# Runs on http://localhost:8000
# Docs at http://localhost:8000/docs
```

### Frontend
```bash
cd frontend
cp .env.example .env.local
# Fill in your values in .env.local

npm install
npm start
# Runs on http://localhost:3000
```

---

## Step 4 — Deploy Firestore Rules & Indexes

```bash
# Install Firebase CLI if you haven't
npm install -g firebase-tools

# Login
firebase login

# Initialize (select your project)
firebase use your-project-id

# Deploy rules and indexes
firebase deploy --only firestore:rules,firestore.indexes
```

---

## Step 5 — Deploy Backend to Cloud Run

```bash
cd backend

# Build and deploy
gcloud run deploy crisisnetra-backend \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated \
  --set-env-vars \
    GOOGLE_MAPS_API_KEY=your_key,\
    WEATHER_API_KEY=your_key,\
    GOOGLE_CLOUD_PROJECT=your-project-id,\
    ALLOWED_ORIGINS=https://your-project-id.web.app

# Note the deployed URL — add it to frontend/.env.local as REACT_APP_API_URL
```

---

## Step 6 — Deploy Frontend to Firebase Hosting

```bash
cd frontend

# Build for production
REACT_APP_API_URL=https://your-cloud-run-url npm run build

# Deploy
firebase deploy --only hosting
```

Your app will be live at: `https://your-project-id.web.app`

---

## Step 7 — Create Admin User

After deploying, create your first admin user in Firestore manually:

1. Go to Firebase Console → **Firestore → users collection**
2. Add a document with the UID of your signed-in user:
```json
{
  "role": "admin",
  "email": "you@yourorg.com",
  "name": "Your Name"
}
```

Role options: `admin`, `dispatcher`, `volunteer`, `hospital`

---

## ✅ Checklist

- [ ] Firebase project created
- [ ] Auth providers enabled (Email + Google)
- [ ] Firestore database created
- [ ] `frontend/.env.local` filled in
- [ ] `backend/.env` filled in
- [ ] `backend/firebase-credentials.json` placed
- [ ] Hospital seed data loaded (`python seed_hospitals.py`)
- [ ] Backend running locally (test at `/docs`)
- [ ] Frontend running locally
- [ ] Firestore rules deployed
- [ ] Backend deployed to Cloud Run
- [ ] Frontend deployed to Firebase Hosting
- [ ] Admin user created in Firestore

---

## 🔑 Environment Variables Summary

| Variable | Where | Description |
|----------|-------|-------------|
| `REACT_APP_GOOGLE_MAPS_API_KEY` | frontend | Google Maps JS + Directions |
| `REACT_APP_FIREBASE_API_KEY` | frontend | Firebase web config |
| `REACT_APP_FIREBASE_AUTH_DOMAIN` | frontend | Firebase web config |
| `REACT_APP_FIREBASE_PROJECT_ID` | frontend | Firebase web config |
| `REACT_APP_FIREBASE_STORAGE_BUCKET` | frontend | Firebase web config |
| `REACT_APP_FIREBASE_MESSAGING_SENDER_ID` | frontend | Firebase web config |
| `REACT_APP_FIREBASE_APP_ID` | frontend | Firebase web config |
| `REACT_APP_API_URL` | frontend | Backend URL |
| `GOOGLE_MAPS_API_KEY` | backend | Maps Directions API |
| `WEATHER_API_KEY` | backend | OpenWeather API |
| `GOOGLE_CLOUD_PROJECT` | backend | Firebase project ID |
| `FIREBASE_CREDENTIALS_PATH` | backend | Path to service account JSON |
| `ALLOWED_ORIGINS` | backend | CORS allowed frontend URL |
