# HelpMe: Multi-Platform AI Agent Ecosystem 🚀

**HelpMe** is a cross-platform AI Agent application framework designed for **Android, iOS, Android TV, and Android Set-Top Boxes (STBs)**. 

It features dynamic agent metamorphosis, transforming a single generic runtime into specialized personas such as an **AI Tutor Agent** for kids and an **AI Receptionist Agent** for front-desk intake.

---

## ✨ Key Features

* 🎓 **AI Tutor Agent (Kids & Students)**:
  * **Deep PDF / TXT Ingestion**: Parses 100% of uploaded textbook chapters without truncation, building comprehensive multi-unit syllabi.
  * **Indian Real Teacher Personas**: High-resolution photorealistic avatars (*Miss Priya* & *Professor Sharma*) in a **Live Remote WebRTC Video Studio Call Interface** (Zoom / Google Meet style).
  * **Natural Indian Voice Engine**: Natural Indian English & Hindi neural voice accents with relaxed, human teaching pacing.
  * **Interactive Voice Doubt Clarification**: Kids can click the Mic button or type to ask ANY question during the lesson (*"Miss Priya, can you explain this concept again?"*) and receive real-time answers.
  * **Adaptive Remedial Loop**: If a student answers incorrectly, the teacher re-explains the concept using simpler analogies and presents fresh follow-up check questions—never stopping until 100% mastery is achieved.
  * **Android STB & TV Remote Control Ready**: Spatial D-Pad navigation handler (`UP`, `DOWN`, `LEFT`, `RIGHT`, `ENTER/OK` keys) with glowing focus rings on quiz cards.
* 🏢 **AI Receptionist Agent Mode**: Demonstrates generic agent persona metamorphosis into a front-desk receptionist for corporate or dental appointment booking.
* 📊 **Parent Analytics Digest**: Comprehension score dial, mastered concepts breakdown, and teacher's notes.

---

## 🏗️ Repository Architecture

```
HelpMe/
├── backend/                        # FastAPI Python Backend
│   ├── app/
│   │   ├── api/                    # REST endpoints
│   │   ├── models/schemas.py       # Pydantic data models
│   │   ├── services/
│   │   │   ├── pdf_service.py      # Deep PDF/TXT extraction & syllabus engine
│   │   │   ├── tts_viseme_service.py # Audio speech & viseme lip-sync frame generator
│   │   │   └── teacher_service.py  # Socratic lesson state machine & adaptive remedial loop
│   │   └── main.py                 # FastAPI app & WebSocket gateway
│   └── requirements.txt
│
└── frontend/                       # Cross-Platform React Web & TV App
    ├── public/                     # High-res photorealistic teacher photos
    ├── src/
    │   ├── components/
    │   │   ├── AvatarCanvas.jsx    # Live Remote WebRTC video call frame & spectrum analyzer
    │   │   ├── SlideBoard.jsx      # Topic visual presentation board
    │   │   ├── ParentSetup.jsx     # Child setup & PDF textbook upload panel
    │   │   ├── StudentClassroom.jsx# Live Socratic classroom + TV D-Pad focus cards
    │   │   ├── ParentReportView.jsx# Parent analytics report
    │   │   └── ReceptionistDemo.jsx# AI Receptionist persona demonstration
    │   ├── styles/index.css        # Light theme glassmorphism design system
    │   ├── App.jsx                 # Main navigation & tab routing
    │   └── main.jsx
    ├── index.html
    └── package.json
```

---

## 🚀 Quick Setup & Run Guide

### 1. Prerequisites
* **Node.js**: v18+
* **Python**: v3.9+
* **Git**

### 2. Launch Backend API Server
```bash
cd backend
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```
Backend API interactive docs: `http://localhost:8000/docs`

### 3. Launch Frontend Web / TV Application
```bash
cd frontend
npm install
npm run dev
```
Frontend App live at: `http://localhost:3000/`

---

## 📤 Pushing to Git Repository

To push this codebase to your GitHub / GitLab / Bitbucket repository:

```bash
# 1. Initialize Git in the project root
git init

# 2. Add all project files
git add .

# 3. Create initial commit
git commit -m "Initial commit of HelpMe Multi-Platform AI Agent Ecosystem"

# 4. Link your remote repository (replace with your repo URL)
git remote add origin https://github.com/YOUR_USERNAME/HelpMe.git

# 5. Push code to main branch
git branch -M main
git push -u origin main
```
