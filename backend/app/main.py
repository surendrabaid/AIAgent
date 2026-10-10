import json
import asyncio
from fastapi import FastAPI, File, UploadFile, Form, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
from dotenv import load_dotenv

# Load environment variables (.env file)
load_dotenv()

from app.models.schemas import (
    ChildProfile, AvatarConfig, LessonPlan, AnswerSubmission, 
    EvaluationResult, TeacherResponsePayload, ParentReport, CurriculumUploadResponse,
    DoubtRequest, DoubtResponse
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

# In-memory storage for active lesson plans
LESSON_PLANS_DB = {}

@app.get("/")
def read_root():
    return {
        "status": "online",
        "app": "HelpMe AI Agent Platform",
        "version": "1.0.0",
        "features": ["AI Tutor Agent", "AI Receptionist Agent", "Real-Time Viseme Lip-Sync", "TV D-Pad Support"]
    }

@app.get("/api/sample-lesson", response_model=LessonPlan)
def get_sample_lesson():
    sample_plan = pdf_service.generate_ai_lesson_plan("Sample Photosynthesis Chapter Text", "Photosynthesis_Chapter_3.pdf")
    LESSON_PLANS_DB[sample_plan.curriculum_id] = sample_plan
    return sample_plan

@app.post("/api/upload-curriculum", response_model=CurriculumUploadResponse)
async def upload_curriculum(
    file: Optional[UploadFile] = File(None),
    raw_text: Optional[str] = Form(None),
    child_age: int = Form(9),
    grade: str = Form("Grade 4")
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
        extracted_text = "Photosynthesis and plant life chapter."

    lesson_plan = pdf_service.generate_ai_lesson_plan(extracted_text, filename, child_age, grade)
    LESSON_PLANS_DB[lesson_plan.curriculum_id] = lesson_plan

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
    child_name: str = "Timmy",
    gender: str = "female",
    avatar_style: str = "young_mentor",
    avatar_name: str = "Miss Sarah"
):
    lesson_plan = LESSON_PLANS_DB.get(curriculum_id)
    if not lesson_plan:
        lesson_plan = pdf_service.generate_ai_lesson_plan("Default Photosynthesis Text", "Photosynthesis_Chapter.pdf")
        LESSON_PLANS_DB[lesson_plan.curriculum_id] = lesson_plan

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
