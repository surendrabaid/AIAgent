import os
import json
import time
import asyncio
import hashlib
from fastapi import FastAPI, File, UploadFile, Form, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List
from dotenv import load_dotenv

# Load environment variables (.env file)
load_dotenv()

from app.models.schemas import (
    ChildProfile, AvatarConfig, LessonPlan, AnswerSubmission, 
    EvaluationResult, TeacherResponsePayload, ParentReport, CurriculumUploadResponse,
    DoubtRequest, DoubtResponse, FeedbackCheckRequest
)
from app.services.pdf_service import pdf_service
from app.services.teacher_service import teacher_service

app = FastAPI(
    title="HelpMe AI Agent Backend",
    description="Multi-Platform AI Tutor & Receptionist Agent Ecosystem Engine",
    version="1.0.0"
)

# Enable CORS for cross-platform apps (Web, Mobile, TV)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Persistent JSON storage for curriculum library & LLM cached responses
CACHE_DIR = os.path.join(os.path.dirname(__file__), "storage")
os.makedirs(CACHE_DIR, exist_ok=True)
CACHE_FILE = os.path.join(CACHE_DIR, "curriculum_library.json")

def load_cached_curriculums() -> dict:
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                result = {}
                for cid, item in data.items():
                    result[cid] = LessonPlan(**item)
                return result
        except Exception as e:
            print(f"Error loading curriculum cache: {e}")
    return {}

def save_cached_curriculums():
    try:
        data = {cid: plan.dict() for cid, plan in LESSON_PLANS_DB.items()}
        with open(CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"Error saving curriculum cache: {e}")

# In-memory DB pre-populated from disk cache
LESSON_PLANS_DB = load_cached_curriculums()

@app.get("/")
def read_root():
    return {
        "status": "online",
        "app": "HelpMe AI Agent Platform",
        "version": "1.0.0",
        "features": ["AI Tutor Agent", "AI Receptionist Agent", "Real-Time Viseme Lip-Sync", "TV D-Pad Support"]
    }

@app.get("/api/library")
def get_curriculum_library():
    """
    Returns list of all previously uploaded textbook chapters & generated curricula,
    sorted with the most recent one on top, so parents can quickly pick the latest.
    """
    library = []
    # Items from dictionary
    items = list(LESSON_PLANS_DB.items())
    for cid, plan in items:
        # If created_at is missing, default to order in DB or fallback
        ts = getattr(plan, 'created_at', None) or 0.0
        library.append({
            "curriculum_id": cid,
            "chapter_title": plan.chapter_title,
            "filename": getattr(plan, 'subject', 'Uploaded Chapter'),
            "topics_count": len(plan.topics),
            "grade_level": plan.grade_level,
            "created_at": ts
        })

    # Sort descending: most recent timestamp first. If timestamps are 0, preserve reversed insertion order
    # (i.e. newest on top)
    library.reverse()
    library.sort(key=lambda x: x.get("created_at", 0.0), reverse=True)
    return library

@app.post("/api/upload-curriculum", response_model=CurriculumUploadResponse)
async def upload_curriculum(
    file: Optional[UploadFile] = File(None),
    raw_text: Optional[str] = Form(None),
    child_name: str = Form("Vihana"),
    child_age: int = Form(8),
    grade: str = Form("Grade 3")
):
    filename = "Uploaded_Textbook.pdf"
    file_bytes = b""

    if file:
        filename = file.filename
        file_bytes = await file.read()
        extracted_text = pdf_service.parse_pdf_file(file_bytes, filename)
    elif raw_text:
        extracted_text = raw_text
        filename = "Custom_Parent_Topic.txt"
    else:
        extracted_text = "Our Solar System consists of our Sun and eight planets orbiting around it bound by gravity. The inner rocky planets are Mercury, Venus, Earth, and Mars. The outer giants are Jupiter, Saturn, Uranus, and Neptune."
        filename = "Our_Solar_System.pdf"

    # Generate content hash to check if file/text has already been parsed by LLM
    content_hash = hashlib.md5(extracted_text.encode('utf-8')).hexdigest()

    # Check if exact curriculum already exists in cache to save tokens
    for existing_id, existing_plan in LESSON_PLANS_DB.items():
        if getattr(existing_plan, 'full_pdf_text', '') == extracted_text or existing_id.endswith(content_hash[:8]):
            print(f"⚡ LLM Cache Hit! Reusing existing cached lesson plan for '{existing_plan.chapter_title}'. Tokens saved!")
            # Update created_at so reused item surfaces to the top as most recent
            existing_plan.created_at = time.time()
            save_cached_curriculums()
            return CurriculumUploadResponse(
                curriculum_id=existing_id,
                filename=filename,
                chapter_title=existing_plan.chapter_title,
                topics_count=len(existing_plan.topics),
                status="ready (cached)",
                lesson_plan=existing_plan
            )

    lesson_plan = pdf_service.generate_ai_lesson_plan(extracted_text, filename, child_age, grade, child_name)
    # Ensure curriculum_id incorporates content hash for exact lookup
    lesson_plan.curriculum_id = f"curr_{content_hash[:10]}"
    lesson_plan.created_at = time.time()
    LESSON_PLANS_DB[lesson_plan.curriculum_id] = lesson_plan
    save_cached_curriculums()

    return CurriculumUploadResponse(
        curriculum_id=lesson_plan.curriculum_id,
        filename=filename,
        chapter_title=lesson_plan.chapter_title,
        topics_count=len(lesson_plan.topics),
        status="ready",
        lesson_plan=lesson_plan
    )

@app.post("/api/start-lesson")
def start_lesson(
    curriculum_id: str,
    child_name: str = "Vihana",
    gender: str = "female",
    avatar_style: str = "young_mentor",
    avatar_name: str = "Miss Sarah"
):
    lesson_plan = LESSON_PLANS_DB.get(curriculum_id)
    if not lesson_plan:
        if "curr_solar_system" in LESSON_PLANS_DB:
            lesson_plan = LESSON_PLANS_DB["curr_solar_system"]
        else:
            solar_default = (
                "Our Solar System consists of our Sun and eight planets orbiting around it bound by gravity. "
                "The four inner rocky planets are Mercury, Venus, Earth, and Mars. "
                "The four outer giant planets are Jupiter, Saturn, Uranus, and Neptune. "
                "Earth is the only planet with liquid oceans and breathable air."
            )
            lesson_plan = pdf_service.generate_ai_lesson_plan(solar_default, "Our_Solar_System.pdf")
            lesson_plan.curriculum_id = "curr_solar_system"
            LESSON_PLANS_DB["curr_solar_system"] = lesson_plan
            save_cached_curriculums()

    avatar_config = AvatarConfig(
        gender=gender,
        style=avatar_style,
        name=avatar_name
    )

    session = teacher_service.start_session(lesson_plan, child_name, avatar_config)
    initial_teacher_response = teacher_service.get_current_teacher_response(session.session_id)

    return {
        "session_id": session.session_id,
        "avatar_config": avatar_config,
        "lesson_plan": lesson_plan,
        "current_response": initial_teacher_response
    }

@app.post("/api/submit-answer", response_model=EvaluationResult)
def submit_answer(submission: AnswerSubmission):
    eval_result = teacher_service.evaluate_answer(submission)
    return eval_result

@app.post("/api/ask-doubt", response_model=DoubtResponse)
def ask_doubt(req: DoubtRequest):
    return teacher_service.answer_student_doubt(req.session_id, req.student_query)

@app.post("/api/feedback-check", response_model=TeacherResponsePayload)
def feedback_check(req: FeedbackCheckRequest):
    return teacher_service.process_comprehension_feedback(req.session_id, req.understood)

@app.get("/api/teacher-next-step/{session_id}", response_model=TeacherResponsePayload)
def get_teacher_next_step(session_id: str):
    return teacher_service.get_current_teacher_response(session_id)

@app.get("/api/parent-report/{session_id}", response_model=ParentReport)
def get_parent_report(session_id: str):
    return teacher_service.generate_parent_report(session_id)

@app.websocket("/ws/lesson/{session_id}")
async def websocket_lesson_stream(websocket: WebSocket, session_id: str):
    await websocket.accept()
    try:
        teacher_payload = teacher_service.get_current_teacher_response(session_id)
        await websocket.send_text(json.dumps({
            "event": "teacher_speak",
            "payload": teacher_payload.dict()
        }))

        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message.get("event") == "submit_answer":
                sub_data = message.get("data", {})
                submission = AnswerSubmission(
                    session_id=session_id,
                    topic_id=sub_data.get("topic_id", "topic_1"),
                    submission_type=sub_data.get("submission_type", "dpad_option"),
                    selected_option_index=sub_data.get("selected_option_index"),
                    voice_transcript=sub_data.get("voice_transcript")
                )
                eval_res = teacher_service.evaluate_answer(submission)
                await websocket.send_text(json.dumps({
                    "event": "evaluation_result",
                    "payload": eval_res.dict()
                }))

                if not eval_res.lesson_completed:
                    await asyncio.sleep(1)
                    next_payload = teacher_service.get_current_teacher_response(session_id)
                    await websocket.send_text(json.dumps({
                        "event": "teacher_speak",
                        "payload": next_payload.dict()
                    }))
                else:
                    report = teacher_service.generate_parent_report(session_id)
                    await websocket.send_text(json.dumps({
                        "event": "lesson_completed",
                        "payload": report.dict()
                    }))
    except WebSocketDisconnect:
        print(f"Client disconnected from session {session_id}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
